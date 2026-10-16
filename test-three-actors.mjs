import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { createReproServer } from "./server.mjs";
import { threeActorCases } from "./src/three-actor-cases.js";
import { installHostPolicy } from "./src/host-policy.js";
import { feedbackProfile } from "./src/feedback-profile.js";

// Test exact predicate semantics, including truthy string dataset values and prefix position.
for (const mode of ["master", "feedback-exception", "off"]) {
  class Sheet {
    constructor(dataset, nodeName = "STYLE") { this.ownerNode = { dataset, nodeName }; this.calls = 0; }
    insertRule(rule) {
      this.calls++;
      if (rule === "invalid") throw new SyntaxError("Invalid test rule");
      return 7;
    }
  }
  const decisions = [];
  const errors = [];
  const originalError = console.error;
  console.error = message => errors.push(message);
  try {
    const restore = installHostPolicy({ defaultView: { CSSStyleSheet: Sheet } }, mode,
      result => decisions.push(result));
    for (const [dataset, rule, blockedByMaster, nodeName] of [
      [{ makeStylesBucket: "d" }, ".x{color:red}", true],
      [{ makeStylesBucket: "d", demoAllowRules: "true" }, ".x{color:red}", false],
      [{ makeStylesBucket: "d", demoAllowRules: "false" }, ".x{color:red}", false],
      [{ makeStylesBucket: "d", demoAllowRules: "" }, ".x{color:red}", true],
      [{}, ".x{color:red}", false],
      [{ makeStylesBucket: "d" }, "/* demo-feedback */.x{color:red}", true],
      [{ makeStylesBucket: "d" }, " /* demo-feedback */.x{color:red}", true],
      [{ makeStylesBucket: "d" }, ".x{color:red}", false, "LINK"],
    ]) {
      const sheet = new Sheet(dataset, nodeName);
      const blocked = mode !== "off" && blockedByMaster &&
        !(mode === "feedback-exception" && rule.startsWith("/* demo-feedback */"));
      assert.equal(sheet.insertRule(rule, 0), blocked ? 0 : 7);
      assert.equal(sheet.calls, blocked ? 0 : 1);
      assert.equal(decisions.at(-1).blocked, blocked);
      assert.equal(decisions.at(-1).inserted, !blocked);
      assert.equal(decisions.at(-1).index, blocked ? undefined : 7);
    }
    assert.equal(errors.length, decisions.filter(result => result.blocked).length);
    const failingSheet = new Sheet({ makeStylesBucket: "d", demoAllowRules: "true" });
    assert.throws(() => failingSheet.insertRule("invalid", 0), /Invalid test rule/);
    assert.equal(decisions.at(-1).blocked, false);
    assert.equal(decisions.at(-1).inserted, false);
    assert.equal(decisions.at(-1).error, "Invalid test rule");
    restore();
  } finally {
    console.error = originalError;
  }
}

const rawModules = JSON.parse(await readFile("dist/feedback-raw-modules.json", "utf8"));
for (const module of ["useButtonStyles.styles.raw.js", "useAvatarStyles.styles.raw.js",
  "useTextareaStyles.styles.raw.js", "useFluentProviderStyles.styles.raw.js"]) {
  assert.ok(rawModules.some(path => path.endsWith(module)), `Active Fluent raw module: ${module}`);
}
const server = createReproServer();
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${server.address().port}`;
async function assertPresentedEvidence(page, result) {
  const hostEvidence = result.hostEvidence;
  const background = hostEvidence.avatarBackground;
  const collision = result.hostMode === "extracted" &&
    ["no-policy", "raw-unsalted", "host-collision"].includes(result.id);
  assert.equal(background.baseline.resolved, true, "Baseline background is proven from CSS declarations");
  assert.equal(background.current.resolved, true, "Fixture stays inside the bounded cascade probe");
  assert.equal(background.baseline.value, "rgb(183, 228, 199)");
  assert.equal(background.current.value, collision ? "rgb(232, 163, 61)" : background.baseline.value);
  assert.equal(background.changed, collision, "CSSOM cascade, not computed color, establishes the collision");
  assert.equal(background.current.actor, collision ? "feedback" : "host");
  assert.equal(hostEvidence.foreignWrites,
    result.events.filter(event => event.actor !== "host" && event.creator === "host" && event.inserted).length);
  const host = page.locator('[data-actor-status="host"]');
  assert.equal(await host.evaluate(element => element.classList.contains("missing")), collision);
  assert.equal(await host.evaluate(element => element.classList.contains("bypass")), !collision &&
    Boolean(hostEvidence.foreignWrites || hostEvidence.foreignRules.length || hostEvidence.sharedWith.length));
  assert.match(await host.locator("[data-host-background]").textContent(),
    collision ? /CHANGED/ : /unchanged/);
  assert.ok((await host.textContent()).includes(
    `${hostEvidence.foreignWrites} native foreign insertions into host-created sheets.`));
  const hostMatches = await page.locator('[data-fluent-owner="host"]').evaluate((provider, rules) =>
    rules.map(entry => {
      const rule = document.styleSheets[entry.position[0]].cssRules[entry.position[1]];
      return {
        present: rule.cssText === entry.cssText,
        matches: [provider, ...provider.querySelectorAll("*")].some(element => element.matches(entry.selector)),
      };
    }), hostEvidence.foreignRules);
  assert.ok(hostMatches.every(rule => rule.present && rule.matches), "Host cross-matches reference actual native rules");
  assert.ok(hostEvidence.foreignRules.every(rule => rule.actor === "feedback"),
    "Persona's real scope prevents its selectors from matching the host");
  if (result.id === "host-collision-salted") {
    assert.equal(hostEvidence.foreignRules.length, 0, "Raw salt prevents host selector overlap, not sheet writes");
    if (result.hostMode === "runtime") assert.ok(hostEvidence.foreignWrites > 0);
  }
  for (const [actor, evidence] of Object.entries(result.actors)) {
    const status = page.locator(`#${actor}-mount`).locator("..").locator(".result");
    const attempts = result.events.filter(event => event.actor === actor && event.bucket);
    const blocked = attempts.filter(event => event.blocked).length;
    const failed = attempts.filter(event => !event.blocked && !event.inserted).length;
    const liveSheets = await page.locator("body").evaluate((_, sheets) => sheets.map(sheet => ({
      id: sheet.id,
      rules: Array.from(document.styleSheets[sheet.documentIndex].cssRules, rule => rule.cssText),
    })), evidence.sheets);
    for (const sheet of evidence.sheets) {
      assert.deepEqual(sheet.rules, liveSheets.find(live => live.id === sheet.id).rules,
        `${result.id}/${actor}: recorded CSS matches the actual destination CSSOM`);
    }
    assert.equal(await status.locator('[data-outcome="insertion"]').textContent(),
      (blocked ? `${blocked} rules blocked.` : "No rules blocked.") +
      (failed ? ` ${failed} native insertions failed.` : ""));
    const presentRules = attempts.filter(event => event.present).length;
    assert.equal(await status.locator('[data-outcome="rules"]').textContent(),
      `${presentRules}/${attempts.length} recorded native rules present in destination CSSOM.`);
    assert.equal(await status.evaluate(element => element.classList.contains("missing")),
      attempts.some(event => event.blocked || event.inserted && !event.equivalentPresent),
      "Blocked or lost rules are distinct from native parser rejection warnings");
    assert.equal(await status.evaluate(element => element.classList.contains("bypass")),
      !attempts.some(event => event.blocked || event.inserted && !event.equivalentPresent) &&
        Boolean(failed || evidence.sheets.some(sheet => sheet.sharedWith.length) ||
          attempts.some(event => event.inserted && !event.present)));
    assert.equal(await status.locator('[data-outcome="appearance"]').count(), 0);
    assert.equal((await status.locator('[data-outcome="ownership"]').textContent()).includes("Reuses sheets"),
      evidence.sheets.some(sheet => sheet.creator !== actor));
    const sharedWith = [...new Set(evidence.sheets.flatMap(sheet => sheet.sharedWith))];
    assert.equal(await status.locator('[data-outcome="sharing"]').textContent(), sharedWith.length ?
      `Sheet handles also held by ${sharedWith.join(", ")}.` : "No shared destination handles recorded.");
    assert.equal(evidence.borrowedPermission, attempts.filter(event => !event.blocked &&
      event.reason === "enhanced sheet" && event.creator !== actor &&
      !(result.policy === "feedback-exception" && event.feedbackPrefix)).length);
    assert.equal(await status.locator('[data-outcome="permission"]').textContent(),
      `${evidence.borrowedPermission} attempts rely on another actor's sheet marker.`);
    if (result.id === "persona-first" && actor === "feedback") {
      assert.equal(evidence.borrowedPermission > 0, result.hostMode === "extracted" || result.coverage === "minimal",
        "A shared runtime host can pre-create every destination without Persona's marker");
    }
    if (result.id === "persona-first-raw") {
      assert.equal(evidence.borrowedPermission, 0, "Accepted prefixes do not depend on borrowed sheet permission");
      assert.ok(sharedWith.includes(actor === "persona" ? "feedback" : "persona"));
      assert.ok(!(await status.locator('[data-outcome="ownership"]').textContent()).includes("Own sheets only."));
    }
    const trace = status.locator("[data-rule-trace]");
    await trace.locator(":scope > summary").click();
    const widthRule = attempts.find(event => event.rule.includes("width:137px"));
    assert.equal(await trace.locator("code").textContent(), widthRule.rule);
    assert.ok((await trace.textContent()).includes(
      `${widthRule.blocked ? "blocked" : "allowed"} (${widthRule.reason})`));
    assert.ok(!(await trace.textContent()).includes("Computed width:"));
    assert.ok(!(await trace.textContent()).includes("VISIBLE WIDTH MISMATCH"));
    assert.match(await trace.textContent(), /Selected rule only:/);
    assert.ok((await trace.textContent()).includes(`Native insertion: ${widthRule.blocked ? "not attempted" : "succeeded"}`));
    assert.ok((await trace.textContent()).includes(`Recorded rule in destination CSSOM: ${widthRule.blocked ? "no" : "yes"}`));
    assert.equal(await trace.locator("[data-matching-width-rules]").textContent(),
      evidence.matchingWidthRules.join("\n") || "No matching 137px CSSOM rules.");
    const ledger = trace.locator("[data-rule-ledger]");
    assert.equal(await ledger.locator("summary").textContent(), `All recorded insertion attempts (${attempts.length})`);
    const ledgerText = await ledger.locator("pre").textContent();
    assert.equal((ledgerText.match(/^#\d+ /gm) || []).length, attempts.length);
    if (widthRule.blocked && evidence.matchingWidthRules.length) {
      assert.ok((await trace.textContent()).includes(
        "Other width rules match the action, but this actor's recorded rule was still blocked."));
    }
    for (const event of attempts) {
      if (event.inserted) {
        assert.equal(event.blocked, false);
        assert.equal(event.error, null);
        assert.equal(event.present, true);
        assert.equal(event.equivalentPresent, true);
        assert.ok(evidence.sheets.some(sheet => sheet.id === event.destination &&
          sheet.rules.includes(event.cssText)), "Native inserted rule remains in its recorded destination");
      } else {
        assert.equal(event.present, false);
        assert.equal(event.cssText, null);
        if (event.blocked) {
          assert.equal(event.error, null);
        } else {
          assert.match(event.rule, /::-moz-placeholder/, "Only known Firefox-only baseline rules fail in Chromium");
          assert.match(event.error, /Failed to parse the rule/);
        }
      }
    }
    await trace.locator(":scope > summary").click();
  }
}
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1800 } });
  const errors = [];
  const failedRequests = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("requestfailed", request => failedRequests.push(request.url()));
  await mkdir("test-results", { recursive: true });
  const results = [];
  for (const config of threeActorCases) {
    await page.goto(`${url}/three-actors?scenario=${config.id}&coverage=minimal`);
    await page.waitForFunction(() => window.threeActorResult || window.threeActorError);
    const result = await page.evaluate(() => {
      if (window.threeActorError) throw new Error(window.threeActorError);
      return window.threeActorResult;
    });
    await assertPresentedEvidence(page, result);
    assert.equal(result.hostRuntimeCalls, 0);
    const host = page.locator('[data-fluent-owner="host"]');
    assert.equal(await host.locator("button, textarea, input").count(), 0);
    assert.match(await host.textContent(), /Host application/);
    assert.equal(await host.locator("[data-fluent-avatar]").count(), 1);
    assert.equal(result.hostBuckets, 0);
    assert.equal(result.feedbackConfig.usesDemoProfile, Boolean(config.raw && config.salt && config.marker));
    assert.deepEqual(result.feedbackConfig.demoProfile, feedbackProfile);
    assert.ok(result.staticCSS.length > 100, "Actual Fluent CSS extracted");
    assert.deepEqual(result.stages.map(stage => stage.phase), ["host", ...config.order]);
    assert.ok(result.sheetOrder.includes("extracted host CSS"));
    for (const stage of result.stages) {
      assert.equal(stage.host.icon, null, "Minimal host renders no phone button");
      assert.equal(stage.host.primary, null, "Minimal host renders no submit button");
    }
    const headerBefore = result.stages[0].host.avatarOverride;
    const headerAfter = result.stages.at(-1).host.avatarOverride;
    const hostCollision = ["no-policy", "raw-unsalted", "host-collision"].includes(config.id);
    assert.equal(headerBefore.background, "rgb(183, 228, 199)");
    assert.equal(headerAfter.background, hostCollision ? "rgb(232, 163, 61)" : headerBefore.background,
      `${config.id}: late unsalted reset affects extracted host`);
    assert.ok((await page.locator('[data-actor-status="host"]').textContent()).includes(
      `Host CSS: extracted; ${result.hostBuckets} initial Griffel sheets; 0 runtime insertion calls.`));
    if (config.id.startsWith("host-collision")) {
      const reset = result.events.find(event => event.actor === "feedback" &&
        event.bucket === "r" && event.rule.includes("{background-color:#e8a33d"));
      assert.ok(reset && !reset.blocked, "Collision reset really reaches the native stylesheet");
      assert.equal(headerBefore.classes.some(name => reset.rule.includes(`.${name}{`)),
        !config.salt,         "Salt determines whether the actual reset selector matches the host avatar");
      await page.screenshot({ path: `test-results/${config.id}.png`, fullPage: true });
    }
    for (const event of result.events.filter(event => event.bucket)) {
      const expectedBlocked = config.policy !== "off" && !event.enhanced &&
        !(config.policy === "feedback-exception" && event.feedbackPrefix);
      assert.equal(event.blocked, expectedBlocked, "Every native insertRule decision matches exact host predicate");
      if (event.actor === "persona") {
        assert.ok(event.personaScope, `Persona CSS must go through real Stylis scoping: ${event.rule}`);
        assert.ok(!event.feedbackPrefix);
      } else {
        assert.ok(!event.personaScope, "Feedback is a distinct unscoped actor");
        assert.equal(event.feedbackPrefix, Boolean(config.marker));
      }
      if (event.blocked) {
        assert.ok(result.actors[event.actor].cache.includes(event.rule),
          "Blocked rule is cached as inserted by its real renderer");
      }
    }
    const persona = result.actors.persona;
    for (const [actor, evidence] of Object.entries(result.actors)) {
      const card = page.locator(`[data-fluent-owner="${actor}"]`);
      const status = await page.locator(`#${actor}-mount`).locator("..").locator(".result").textContent();
      assert.ok(!status.includes("VISIBLE WIDTH MISMATCH"));
      assert.ok(!status.includes("Fluent controls look healthy"));
      if (actor === "feedback") {
        const resetPlacement = await card.evaluate(provider => {
          const clear = provider.querySelector("[data-actor-probe]");
          const header = provider.querySelector("[data-avatar-override]");
          return {
            clearHasReset: header && Array.from(header.classList)
              .some(name => name.startsWith("r") && clear.classList.contains(name)),
            headerHasReset: header && Array.from(header.classList).some(name => name.startsWith("r")),
          };
        });
        assert.equal(resetPlacement.clearHasReset, false, "Clear status keeps only its width customization");
        assert.equal(resetPlacement.headerHasReset, true, "Collision reset belongs to the feedback avatar");
      }
      const layout = await card.evaluate(provider => {
        const phone = provider.querySelector("[data-fluent-icon]").getBoundingClientRect();
        const person = provider.querySelector(".fluent-person").getBoundingClientRect();
        const primary = provider.querySelector("[data-fluent-primary]").getBoundingClientRect();
        const clear = provider.querySelector("[data-actor-probe]").getBoundingClientRect();
        return { phoneGap: person.right - phone.right, primaryTop: primary.top, clearTop: clear.top,
          primaryRight: primary.right, clearLeft: clear.left };
      });
      assert.ok(Math.abs(layout.phoneGap) < 1, "Phone stays at the right edge despite scoped resets");
      assert.ok(Math.abs(layout.primaryTop - layout.clearTop) < 1, "Actions share one row");
      assert.ok(layout.clearLeft > layout.primaryRight, "Actions do not overlap");
    }
    assert.ok(persona.measured.scoped, "Scope class actually wraps persona controls");
    const personaBlocked = result.events.filter(event => event.actor === "persona" && event.bucket && event.blocked);
    const allPersonaBlocked = ["feedback-first", "raw-marked-first", "master-rejects-marker",
      "precompiled-salted", "raw-unsalted"].includes(config.id);
    if (config.id === "unmarked-d-first") {
      assert.equal(await page.locator('[data-fluent-owner="persona"] textarea').count(), 0);
      assert.equal(persona.measured.icon.width, "96px");
      assert.equal(persona.measured.primary.background, "rgb(255, 255, 255)");
      assert.notEqual(persona.measured.probeWidth, "137px");
      assert.equal(persona.sheets.find(sheet => sheet.key === "d0").creator, "unrelated");
      assert.equal(persona.sheets.find(sheet => sheet.key === "r0").creator, "persona");
      assert.ok(personaBlocked.every(event => event.bucket === "d" && event.priority === "0"));
      assert.ok(personaBlocked.some(event => event.rule.includes("width:137px")));
      await page.screenshot({ path: "test-results/three-actors-unmarked-d.png", fullPage: true });
    } else {
      const unstyled = ["feedback-first", "raw-marked-first", "master-rejects-marker"].includes(config.id);
      assert.equal(persona.measured.icon.width, unstyled ? "48px" : "32px");
      assert.equal(persona.measured.primary.background, unstyled ? "rgb(239, 239, 239)" : "rgb(15, 108, 189)");
      if (allPersonaBlocked) {
        assert.ok(personaBlocked.length > 100);
        assert.equal(persona.sheets.find(sheet => sheet.key === "d0").creator, "feedback");
        // Unsalted feedback may mask even the probe through a shared atomic class.
        assert.equal(persona.measured.probeWidth === "137px", config.id === "raw-unsalted");
      } else {
        assert.equal(personaBlocked.length, 0);
        assert.equal(persona.measured.probeWidth, "137px");
      }
    }
    if (result.actors.feedback) {
      const feedback = result.actors.feedback;
      assert.equal(feedback.rendererSalt, config.salt ? feedbackProfile.salt : null);
      const feedbackBlocked = result.events.filter(event => event.actor === "feedback" && event.bucket && event.blocked);
      assert.equal(result.sharedFeedbackClasses.length === 0, Boolean(config.raw && config.salt),
        "Only raw + salt isolates actual Fluent classes");
      assert.equal(feedback.measured.scoped, false);
      if (["feedback-first", "master-rejects-marker"].includes(config.id)) {
        assert.equal(feedback.measured.icon.width, "48px");
        assert.equal(feedback.measured.primary.background, "rgb(239, 239, 239)");
        assert.ok(feedbackBlocked.length > 100);
        assert.notEqual(feedback.measured.probeWidth, "137px");
      } else {
        if (config.id === "persona-first") {
          assert.equal(feedbackBlocked.length, 17, "New textarea buckets do not inherit Persona's permission");
          assert.ok(feedbackBlocked.every(event => event.creator === "feedback" && !event.enhanced));
          assert.ok(feedbackBlocked.some(event => event.bucket === "w"));
        } else {
          assert.equal(feedbackBlocked.length, 0);
        }
        assert.equal(feedback.measured.probeWidth, "137px");
      }
      if (config.order[0] === "persona") {
        assert.equal(feedback.sheets.find(sheet => sheet.key === "d0").creator, "persona");
        const inherited = result.events.filter(event => event.actor === "feedback" && event.bucket &&
          event.creator === "persona" && event.enhanced && !event.blocked);
        assert.ok(inherited.length > 100, "Feedback actually inserts into persona-owned marked sheets");
        if (config.id === "persona-first") {
          assert.ok(inherited.every(event => !event.feedbackPrefix), "Unmarked feedback bypasses sheet-level guard");
        }
      }
      if (config.id === "raw-marked-first") {
        assert.ok(result.events.some(event => event.actor === "feedback" && event.reason === "feedback rule prefix"));
        const singleton = await page.evaluate(() => {
          const first = document.createElement("div");
          const second = document.createElement("div");
          document.body.append(first, second);
          const a = window.feedbackActor.mount(first, { salt: true, marker: true });
          const b = window.feedbackActor.mount(second, { salt: true, marker: true });
          const sameRenderer = a.renderer === b.renderer;
          a.unmount();
          b.unmount();
          first.remove();
          second.remove();
          return sameRenderer;
        });
        assert.equal(singleton, true, "Demo profile reuses a module-level renderer across mounts");
        await page.screenshot({ path: "test-results/three-actors-raw-feedback-first.png", fullPage: true });
      }
      if (config.id === "no-policy") assert.ok(result.events.every(event => !event.blocked));
    }
    results.push(result);
  }
  // Actions remain local; no network submission occurs.
  await page.locator('[data-fluent-owner="persona"] [data-fluent-primary]').click();
  assert.match(await page.locator('[data-fluent-owner="persona"] [role="status"]').textContent(), /Message requested/);
  await page.locator('[data-fluent-owner="feedback"] textarea').fill("Feedback test");
  await page.locator('[data-fluent-owner="feedback"] [data-fluent-primary]').click();
  assert.match(await page.locator('[data-fluent-owner="feedback"] [role="status"]').textContent(), /submitted/);
  const runtimeResults = [];
  for (const config of threeActorCases) {
    await page.goto(`${url}/three-actors?scenario=${config.id}&host=runtime&coverage=minimal`);
    await page.waitForFunction(() => window.threeActorResult || window.threeActorError);
    const result = await page.evaluate(() => {
      if (window.threeActorError) throw new Error(window.threeActorError);
      return window.threeActorResult;
    });
    assert.equal(result.hostMode, "runtime");
    assert.ok(result.hostRuntimeCalls > 0);
    assert.ok(result.hostBuckets > 0);
    assert.deepEqual(result.staticCSS, []);
    assert.deepEqual(result.stages[0].host, results.find(item => item.id === config.id).stages[0].host,
      "Changing host build preserves exact baseline Fluent styles and classes");
    assert.deepEqual(result.stages.at(-1).host.avatarOverride, result.stages[0].host.avatarOverride,
      "Runtime host ordering prevents the late-reset collision");
    assert.equal(result.actors.persona.sheets.find(sheet => sheet.key === "d0").creator,
      config.seed ? "unrelated" : "host");
    for (const event of result.events.filter(event => event.bucket)) {
      assert.equal(event.blocked, config.policy !== "off" && !event.enhanced &&
        !(config.policy === "feedback-exception" && event.feedbackPrefix));
    }
    const blockedPersona = result.events.filter(event => event.actor === "persona" && event.blocked);
    assert.equal(blockedPersona.length > 100, config.policy !== "off");
    assert.equal(result.actors.persona.measured.probeWidth === "137px",
      config.policy === "off" || config.id === "raw-unsalted");
    runtimeResults.push(result);
    await assertPresentedEvidence(page, result);
  }
  const sharedResults = [];
  for (const hostMode of ["extracted", "runtime"]) {
    for (const config of threeActorCases) {
      await page.goto(`${url}/three-actors?scenario=${config.id}&host=${hostMode}&coverage=shared`);
      await page.waitForFunction(() => window.threeActorResult || window.threeActorError);
      const result = await page.evaluate(() => {
        if (window.threeActorError) throw new Error(window.threeActorError);
        return window.threeActorResult;
      });
      assert.equal(result.coverage, "shared");
      await assertPresentedEvidence(page, result);
      assert.equal(await page.locator('[data-fluent-owner="host"] textarea').count(), 1);
      const minimal = (hostMode === "extracted" ? results : runtimeResults).find(r => r.id === config.id);
      assert.deepEqual(result.order, minimal.order);
      assert.equal(result.policy, minimal.policy);
      assert.deepEqual(result.feedbackConfig, minimal.feedbackConfig);
      assert.equal(result.stages.at(-1).host.avatarOverride.background,
        minimal.stages.at(-1).host.avatarOverride.background, "Host collision survives both coverage profiles");
      for (const actor of Object.keys(result.actors)) {
        assert.deepEqual(result.actors[actor].measured.primary.classes,
          minimal.actors[actor].measured.primary.classes, "Coverage does not change integration class generation");
        assert.equal(result.actors[actor].measured.probeWidth,
          minimal.actors[actor].measured.probeWidth, "Coverage preserves the custom-width outcome");
        assert.equal(result.events.some(e => e.actor === actor && e.blocked),
          minimal.events.some(e => e.actor === actor && e.blocked),
          "Coverage may pre-create textarea buckets; each actual destination still controls permission");
      }
      const persona = result.actors.persona.measured;
      assert.equal(persona.icon.width, hostMode === "extracted" && config.seed ? "96px" : "32px");
      assert.equal(persona.primary.background,
        hostMode === "extracted" && config.seed ? "rgb(255, 255, 255)" : "rgb(15, 108, 189)");
      assert.equal(await page.locator('[data-fluent-owner="persona"] textarea').count(), 0,
        "Persona is a contact card, not a feedback form");
      if (result.actors.feedback) {
        const unstyled = config.id === "master-rejects-marker";
        assert.equal(result.actors.feedback.measured.icon.width, unstyled ? "48px" : "32px");
      }
      sharedResults.push(result);
    }
  }
  await page.goto(`${url}/`);
  assert.match(await page.locator(".intro-help ul").first().textContent(), /not a separate document or a private stylesheet/);
  assert.match(await page.locator(".intro-help ul").first().textContent(), /still shares the page/);
  for (const title of ["Who is on the page?", "What should I look for?"]) {
    const disclosure = page.locator(".intro-help").filter({ has: page.getByText(title, { exact: true }) });
    assert.equal(await disclosure.evaluate(el => el.open), false);
    await disclosure.locator("summary").click();
    assert.equal(await disclosure.evaluate(el => el.open), true);
    await disclosure.locator("summary").click();
  }
  assert.equal(await page.getByText("Technical provenance and model limits", { exact: true })
    .evaluate(el => el.parentElement.open), false);
  const guide = page.locator(".conflict-guide");
  assert.equal(await guide.evaluate(el => el.open), false);
  await guide.locator("summary").click();
  assert.equal(await guide.getByRole("list", { name: "Style rule journey" }).locator("li").count(), 3);
  assert.equal(await guide.getByRole("table").count(), 4);
  for (const id of ["unmarked-d-first", "persona-first", "precompiled-salted", "host-collision-salted",
    "raw-marked-first", "master-rejects-marker", "no-policy"]) {
    assert.ok(await guide.locator(`a[href="#${id}"]`).count(), `Guide links ${id} to a live reproduction`);
  }
  assert.match(await guide.textContent(), /None prevents sheet adoption/);
  assert.match(await guide.getByLabel("Rejected rule cache sequence").textContent(), /absent from CSS, but present in renderer cache/);
  await guide.locator("summary").click();
  const working = page.frameLocator('#persona-alone iframe');
  const broken = page.frameLocator('#unmarked-d-first iframe');
  await working.locator(".result").first().waitFor();
  await broken.locator(".result").first().waitFor();
  assert.equal(await working.locator('[data-fluent-icon]').last().evaluate(el => getComputedStyle(el).width), "32px");
  assert.equal(await broken.locator('[data-fluent-icon]').last().evaluate(el => getComputedStyle(el).width), "96px");
  assert.equal(await broken.locator('[data-actor-probe="persona"]').textContent(), "View profile");
  assert.equal(await working.locator('[data-actor-probe="persona"]').evaluate(el => el.tagName), "BUTTON");
  assert.equal(await working.locator(".probe").count(), 0);
  await working.locator('[data-fluent-primary]').last().click();
  assert.match(await working.locator('[data-fluent-owner="persona"] [role="status"]').textContent(), /Message requested/);
  await working.locator('[data-actor-probe="persona"]').click();
  assert.equal(await working.locator('[data-actor-probe="persona"]').getAttribute("aria-expanded"), "true");
  assert.match(await working.locator('[data-fluent-owner="persona"]').textContent(), /accessible collaboration/);
  await working.locator('[data-actor-probe="persona"]').click();
  assert.equal(await working.locator('[data-actor-probe="persona"]').getAttribute("aria-expanded"), "false");
  assert.equal(await page.locator(".advanced-scenarios").count(), 0);
  assert.equal(await page.locator(".walkthrough").count(), threeActorCases.length);
  assert.equal(await page.locator(".intended-reference").count(), 0);
  assert.equal(await page.locator("iframe").count(), threeActorCases.length);
  assert.equal(await page.locator(".explanatory-controls").evaluate(el => el.open), false);
  assert.equal(await page.locator(".walkthrough:visible").count(), 5);
  for (const config of threeActorCases) {
    assert.equal(await page.locator(`#${config.id}`).isVisible(), Boolean(config.primaryExample));
  }
  await page.locator(".explanatory-controls > summary").click();
  for (const config of threeActorCases) {
    assert.equal(await page.locator(`#${config.id}`).isVisible(), true);
    const row = page.locator(`#${config.id}`);
    assert.equal(await row.locator(".scenario-details").evaluate(el => el.open), false);
    assert.equal(await row.locator(".scenario-details > summary").textContent(), "Technical details");
    assert.deepEqual(await row.getByRole("list", { name: "Load order" }).locator("li").allTextContents(),
      ["Host", ...(config.seed ? ["Unrelated style sheet"] : []),
        ...config.order.map(actor => actor === "persona" ? "Persona" : "Feedback")]);
    assert.equal(await row.locator(".scenario-takeaway").textContent(),
      `What this demonstrates: ${config.takeaway}`);
    const frame = page.frameLocator(`#${config.id} iframe`);
    await frame.locator(".result").first().waitFor();
    assert.equal(await frame.locator("body").evaluate(() => window.threeActorResult.id), config.id);
  }
  await page.screenshot({ path: "test-results/walkthrough.png", fullPage: true });
  await page.goto(`${url}/#host-collision`);
  assert.equal(await page.locator(".explanatory-controls").evaluate(el => el.open), true,
    "Direct links reveal explanatory scenarios");
  assert.equal(await page.locator("#host-collision").isVisible(), true);
  assert.equal(await page.locator('nav a[aria-current="page"]').getAttribute("href"), "/");
  await page.locator(".host-settings > summary").click();
  await page.getByLabel("Host CSS", { exact: true }).selectOption("runtime");
  await page.waitForURL(`${url}/?host=runtime`);
  await page.frameLocator("#persona-alone iframe").locator(".result").first().waitFor();
  assert.equal(await page.locator("iframe").evaluateAll(frames =>
    frames.every(frame => new URL(frame.src).searchParams.get("host") === "runtime")), true);
  await page.reload();
  assert.equal(await page.getByLabel("Host CSS", { exact: true }).inputValue(), "runtime");
  await page.getByLabel("Host component coverage", { exact: true }).selectOption("minimal");
  await page.frameLocator("#persona-alone iframe").locator(".result").first().waitFor();
  assert.equal(await page.getByLabel("Host CSS", { exact: true }).inputValue(), "runtime");
  assert.equal(await page.locator("iframe").evaluateAll(frames =>
    frames.every(frame => new URL(frame.src).searchParams.get("coverage") === "minimal")), true);
  await page.reload();
  assert.equal(await page.getByLabel("Host component coverage", { exact: true }).inputValue(), "minimal");
  await page.getByLabel("Host CSS", { exact: true }).selectOption("extracted");
  await page.waitForURL(`${url}/?host=extracted&coverage=minimal`);
  await page.frameLocator("#persona-alone iframe").locator(".result").first().waitFor();
  await page.screenshot({ path: "test-results/three-actors.png", fullPage: true });
  for (const hostMode of ["extracted", "runtime"]) {
    for (const coverage of ["shared", "minimal"]) {
      await page.setViewportSize({ width: 1400, height: 1800 });
      await page.mouse.move(0, 0);
      await page.goto(`${url}/?host=${hostMode}&coverage=${coverage}`);
      const hiddenControl = page.frameLocator("#persona-first iframe");
      await hiddenControl.locator("#actor-evidence").waitFor({ state: "attached" });
      assert.equal(await hiddenControl.locator("body").evaluate(() => Boolean(window.threeActorResult)), false,
        "Collapsed examples must not publish measurements without layout");
      await page.locator(".explanatory-controls > summary").click();
      for (const config of threeActorCases) {
        const frame = page.frameLocator(`#${config.id} iframe`);
        await frame.locator("[data-rule-trace]").first().waitFor();
        const result = await frame.locator("body").evaluate(() => window.threeActorResult);
        await assertPresentedEvidence(frame, result);
        if (config.id === "persona-alone") {
          assert.equal(result.actors.persona.measured.icon.width,
            hostMode === "extracted" || coverage === "shared" ? "32px" : "48px");
          assert.equal(result.actors.persona.measured.probeWidth === "137px", hostMode === "extracted",
            "Healthy extracted reference stays healthy; runtime-host rejection stays reproducible");
        }
      }
      const brokenFrame = page.frameLocator("#unmarked-d-first iframe");
      await brokenFrame.locator("[data-rule-trace] > summary").click();
      await page.setViewportSize({ width: 375, height: 1800 });
      await page.evaluate(() => new Promise(requestAnimationFrame));
      assert.equal(await brokenFrame.locator("[data-rule-trace]").evaluate(element => element.open), true,
        "Resizing preserves expanded rule evidence");
      await brokenFrame.locator("[data-rule-trace] > summary").click();
      for (const config of threeActorCases) {
        const frame = page.frameLocator(`#${config.id} iframe`);
        await assertPresentedEvidence(frame, await frame.locator("body").evaluate(() => window.threeActorResult));
      }
      const healthyFrame = page.frameLocator("#persona-alone iframe");
      const ruleStatus = await healthyFrame.locator('[data-outcome="rules"]').textContent();
      await healthyFrame.locator('[data-fluent-owner="persona"] [data-fluent-primary]').hover();
      await healthyFrame.locator("body").evaluate(() => {
        window.dispatchEvent(new Event("resize"));
        return new Promise(requestAnimationFrame);
      });
      assert.equal(await healthyFrame.locator('[data-outcome="rules"]').textContent(), ruleStatus,
        "Hover does not change the generated-CSS verdict");
      await page.mouse.down();
      try {
        await healthyFrame.locator("body").evaluate(() => {
          window.dispatchEvent(new Event("resize"));
          return new Promise(requestAnimationFrame);
        });
        assert.equal(await healthyFrame.locator('[data-outcome="rules"]').textContent(), ruleStatus,
          "Pressed state does not change the generated-CSS verdict");
      } finally {
        await page.mouse.up();
      }
      await page.mouse.move(0, 0);
      await page.setViewportSize({ width: 1400, height: 1800 });
      const insertionCounts = await page.locator(".walkthrough iframe").evaluateAll(frames =>
        Object.fromEntries(frames.map(frame => [
          frame.contentWindow.threeActorResult.id, frame.contentWindow.threeActorResult.events.length,
        ])));
      for (const zoom of [0.9, 1.1, 1.25]) {
        await page.locator(".walkthrough iframe").evaluateAll((frames, zoom) => {
          for (const frame of frames) {
            frame.contentDocument.documentElement.style.zoom = String(zoom);
            frame.contentWindow.dispatchEvent(new Event("resize"));
          }
        }, zoom);
        await page.evaluate(() => new Promise(requestAnimationFrame));
        for (const config of threeActorCases) {
          const frame = page.frameLocator(`#${config.id} iframe`);
          const result = await frame.locator("body").evaluate(() => window.threeActorResult);
          await assertPresentedEvidence(frame, result);
          assert.equal(result.events.length, insertionCounts[config.id], "Scaling does not change rule insertion evidence");
          if (hostMode === "extracted" && config.id === "persona-alone") {
            const attempts = result.events.filter(event => event.actor === "persona" && event.bucket).length;
            assert.equal(await frame.locator('[data-outcome="rules"]').textContent(),
              `${attempts}/${attempts} recorded native rules present in destination CSSOM.`,
              `First scenario reports its generated CSS at ${zoom * 100}% scaling`);
            assert.equal(await frame.locator('[data-actor-status="persona"]').evaluate(element =>
              element.classList.contains("missing")), false);
            assert.ok(!(await frame.locator("[data-rule-trace]").textContent()).includes("VISIBLE WIDTH MISMATCH"));
            if (zoom === 1.1) {
              const fractional = await frame.locator('[data-fluent-owner="persona"]').evaluate(provider => ({
                action: getComputedStyle(provider.querySelector("[data-actor-probe]")).width,
                icon: getComputedStyle(provider.querySelector("[data-fluent-icon]")).width,
              }));
              assert.notEqual(fractional.action, "137px",
                "Regression actually exercises the reported fractional action width");
              assert.notEqual(fractional.icon, "32px",
                "Regression actually exercises the reported fractional phone width");
            }
          }
          if (hostMode === "extracted" && config.id === "unmarked-d-first") {
            assert.equal(await frame.locator('[data-actor-status="persona"]').evaluate(element =>
              element.classList.contains("missing")), true,
            "Rejected rules remain a CSSOM failure independently of scaling");
          }
        }
      }
    }
  }
  await page.addInitScript(() => {
    Object.defineProperty(window, "personaActor", {
      configurable: true,
      set(actor) {
        Object.defineProperty(window, "personaActor", { configurable: true, writable: true, value: actor });
        const mount = actor.mount;
        actor.mount = (...args) => {
          const mounted = mount(...args);
          window.testPersonaRenderer = mounted.renderer;
          return mounted;
        };
      },
    });
  });
  await page.goto(`${url}/three-actors?scenario=persona-alone&coverage=minimal`);
  await page.waitForFunction(() => window.threeActorResult || window.threeActorError);
  const removedRule = await page.evaluate(async () => {
    const result = window.threeActorResult;
    const event = result.events.find(event => event.rule.includes("width:137px"));
    const destination = result.actors.persona.sheets.find(sheet => sheet.id === event.destination);
    const sheet = document.styleSheets[destination.documentIndex];
    const index = Array.from(sheet.cssRules).findIndex(rule => rule.cssText === event.cssText);
    if (index < 0) throw new Error("Missing width rule before CSSOM removal test");
    sheet.insertRule(event.rule, sheet.cssRules.length);
    sheet.deleteRule(index);
    window.dispatchEvent(new Event("resize"));
    await new Promise(requestAnimationFrame);
    return { attempts: result.events.filter(event => event.actor === "persona" && event.bucket).length,
      generated: event.rule, present: event.present,
      duplicatePresent: Array.from(sheet.cssRules).some(rule => rule.cssText === event.cssText) };
  });
  assert.equal(await page.locator('[data-outcome="rules"]').textContent(),
    `${removedRule.attempts - 1}/${removedRule.attempts} recorded native rules present in destination CSSOM.`,
    "An identical replacement cannot mask removal of the recorded native CSSRule");
  assert.equal(removedRule.present, false);
  assert.equal(removedRule.duplicatePresent, true);
  await page.locator("[data-rule-trace] > summary").click();
  const removedTrace = await page.locator("[data-rule-trace]").textContent();
  assert.ok(removedTrace.includes("Native insertion: succeeded"));
  assert.ok(removedTrace.includes("Recorded rule in destination CSSOM: no"));
  assert.ok(removedTrace.includes("Equivalent serialized rule in destination CSSOM: yes"));
  assert.ok(removedTrace.includes("equivalent CSS remains"));
  assert.ok(removedTrace.includes("Renderer cache contains rule: yes"));
  assert.equal(await page.locator("[data-rule-trace] code").textContent(), removedRule.generated);
  assert.equal(await page.locator('[data-actor-status="persona"]').evaluate(element =>
    element.classList.contains("missing")), false, "Equivalent CSS remains available despite losing the original instance");
  await page.locator("[data-rule-ledger] > summary").click();
  await page.evaluate(async () => {
    window.dispatchEvent(new Event("resize"));
    await new Promise(requestAnimationFrame);
  });
  assert.equal(await page.locator("[data-rule-ledger]").evaluate(element => element.open), true,
    "Evidence refresh preserves the all-attempts disclosure");
  const replay = await page.evaluate(async () => {
    const renderer = window.testPersonaRenderer;
    const original = window.threeActorResult.events.find(event => event.actor === "persona" &&
      event.rule.includes("width:137px"));
    delete renderer.insertionCache[original.rule];
    renderer.insertCSSRules({ d: [original.rule.replace(/^\.demo-contact-scope\s+/, "")] });
    await new Promise(requestAnimationFrame);
    return {
      event: window.threeActorResult.events.at(-1),
      cached: window.threeActorResult.actors.persona.cache.includes(original.rule),
    };
  });
  assert.equal(replay.event.actor, "persona", "Late native insertions are attributed to the renderer, not the last mount phase");
  assert.equal(replay.event.rule, removedRule.generated, "Replay uses the actual generated rule, not synthetic scenario CSS");
  assert.equal(replay.event.present, true, "Native insertion refreshes evidence without a resize");
  assert.equal(replay.cached, true);
  await page.evaluate(async () => {
    const result = window.threeActorResult;
    const event = result.events.find(event => event.actor === "persona" && event.rule.includes("width:137px"));
    const destination = result.actors.persona.sheets.find(sheet => sheet.id === event.destination);
    const sheet = document.styleSheets[destination.documentIndex];
    for (let index = sheet.cssRules.length - 1; index >= 0; index--) {
      if (sheet.cssRules[index].cssText === event.cssText) sheet.deleteRule(index);
    }
    window.dispatchEvent(new Event("resize"));
    await new Promise(requestAnimationFrame);
  });
  assert.equal(await page.locator('[data-actor-status="persona"]').evaluate(element =>
    element.classList.contains("missing")), true, "Removing all equivalent CSS is a real rule-availability failure");
  assert.ok((await page.locator("[data-rule-trace]").textContent())
    .includes("Equivalent serialized rule in destination CSSOM: no"));
  await page.locator('[data-fluent-owner="host"] [data-avatar-override]').evaluate(async element => {
    element.style.backgroundColor = "inherit";
    window.dispatchEvent(new Event("resize"));
    await new Promise(requestAnimationFrame);
  });
  assert.match(await page.locator("[data-host-background]").textContent(), /unresolved/);
  assert.equal(await page.locator('[data-actor-status="host"]').evaluate(element =>
    element.classList.contains("bypass")), true, "Out-of-contract cascade evidence warns instead of claiming success");
  assert.deepEqual(errors, []);
  assert.deepEqual(failedRequests, []);
  await writeFile("test-results/three-actor-results.json", JSON.stringify({
    browser: browser.version(), rawModules, results, runtimeResults, sharedResults,
  }, null, 2));
  console.table(results.map(result => ({
    id: result.id, personaIcon: result.actors.persona.measured.icon.width,
    personaProbe: result.actors.persona.measured.probeWidth,
    feedbackIcon: result.actors.feedback?.measured.icon.width || "not mounted",
    blocked: result.events.filter(event => event.blocked).length,
    sharedFeedbackClasses: result.sharedFeedbackClasses.length,
  })));
  console.log(`PASS: ${threeActorCases.length * 4} integration scenarios; collisions, policy, masking, coverage controls, live CSSOM evidence and scaling-independent rule outcomes verified.`);
} finally {
  if (browser) await browser.close();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
