import { assertPresentedEvidence } from "../evidence/assert-presented.mjs";
import { assertPlayground } from "../gallery/playground.mjs";
import { assertEvidenceLifecycle } from "../evidence/lifecycle.mjs";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { createReproServer } from "../../server.mjs";
import { threeActorCases } from "../../src/playground/scenarios.js";
import { feedbackProfile } from "../../src/feedback/profile.js";

const controlCases = threeActorCases.filter(config => config.hostContract !== "production-extraction");
const rawModules = JSON.parse(await readFile("dist/feedback-raw-modules.json", "utf8"));
for (const module of ["useButtonStyles.styles.raw.js", "useAvatarStyles.styles.raw.js",
  "useTextareaStyles.styles.raw.js", "useFluentProviderStyles.styles.raw.js"]) {
  assert.ok(rawModules.some(path => path.endsWith(module)), `Active Fluent raw module: ${module}`);
}
const server = createReproServer();
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${server.address().port}`;
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
  for (const config of controlCases) {
    await page.goto(`${url}/?scenario=${config.id}&coverage=minimal`);
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
    const allPersonaBlocked = ["feedback-first", "precompiled-salted", "raw-unsalted"].includes(config.id);
    const unstyled = config.id === "feedback-first";
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
    if (result.actors.feedback) {
      const feedback = result.actors.feedback;
      assert.equal(feedback.rendererSalt, config.salt ? feedbackProfile.salt : null);
      const feedbackBlocked = result.events.filter(event => event.actor === "feedback" && event.bucket && event.blocked);
      assert.equal(result.sharedFeedbackClasses.length === 0, Boolean(config.raw && config.salt),
        "Only raw + salt isolates actual Fluent classes");
      assert.equal(feedback.measured.scoped, false);
      if (config.id === "feedback-first") {
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
  for (const config of controlCases) {
    await page.goto(`${url}/?scenario=${config.id}&host=runtime&coverage=minimal`);
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
    for (const config of controlCases) {
      await page.goto(`${url}/?scenario=${config.id}&host=${hostMode}&coverage=shared`);
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
        assert.equal(result.actors.feedback.measured.icon.width, "32px");
      }
      sharedResults.push(result);
    }
  }
  await assertPlayground(page, url);
  await assertEvidenceLifecycle(page, url);
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
  console.log(`PASS: ${controlCases.length * 4} diagnostic combinations; collisions, policy, masking, coverage controls, live CSSOM evidence and scaling-independent rule outcomes verified.`);
} finally {
  if (browser) await browser.close();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
