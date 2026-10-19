import { expect } from "vitest";
import { applicationWindow, visible } from "../browser/application.mjs";

export async function assertPresentedEvidence(app, result) {
  // Normalize snapshots from different iframe realms without weakening strict equality.
  result = structuredClone(result);
  const document = applicationWindow(app).document;
  for (const key of ["stages", "feedbackConfig", "sheetOrder"]) {
    expect(result, "Runtime evidence excludes test-only snapshots and duplicate representations").not.toHaveProperty(key);
  }
  const hostEvidence = result.hostEvidence;
  const background = hostEvidence.avatarBackground;
  const collision = result.hostMode === "extracted" && ["raw-unsalted", "host-collision"].includes(result.id);
  expect(background.baseline.resolved, "Baseline background is proven from CSS declarations").toBe(true);
  expect(background.current.resolved, "Fixture stays inside the bounded cascade probe").toBe(true);
  expect(background.baseline.value).toBe("rgb(183, 228, 199)");
  expect(background.current.value).toBe(collision ? "rgb(232, 163, 61)" : background.baseline.value);
  expect(background.changed, "CSSOM cascade, not computed color, establishes the collision").toBe(collision);
  expect(background.current.actor).toBe(collision ? "feedback" : "host");
  expect(hostEvidence.foreignWrites)
    .toBe(result.events.filter(event => event.actor !== "host" && event.creator === "host" && event.inserted).length);
  const host = () => document.querySelector('[data-actor-status="host"]');
  await expect.poll(() => host().classList.contains("missing")).toBe(collision);
  await expect.poll(() => host().classList.contains("bypass"))
    .toBe(!collision && Boolean(hostEvidence.foreignWrites || hostEvidence.foreignRules.length || hostEvidence.sharedWith.length));
  await expect.poll(() => host().querySelector("[data-host-background]").textContent).toMatch(collision ? /CHANGED/ : /unchanged/);
  await expect.poll(() => host().textContent).toContain(`${hostEvidence.foreignWrites} native foreign insertions into host-created sheets.`);
  const provider = document.querySelector('[data-fluent-owner="host"]');
  const hostMatches = hostEvidence.foreignRules.map(entry => {
    const rule = document.styleSheets[entry.position[0]].cssRules[entry.position[1]];
    return {
      present: rule.cssText === entry.cssText,
      matches: [provider, ...provider.querySelectorAll("*")].some(element => element.matches(entry.selector)),
    };
  });
  expect(hostMatches.every(rule => rule.present && rule.matches), "Host cross-matches reference actual native rules").toBeTruthy();
  expect(hostEvidence.foreignRules.every(rule => rule.actor === "feedback"),
    "Persona's real scope prevents its selectors from matching the host").toBeTruthy();
  if (result.id === "host-collision-salted") {
    expect(hostEvidence.foreignRules, "Raw salt prevents host selector overlap, not sheet writes").toHaveLength(0);
    if (result.hostMode === "runtime") expect(hostEvidence.foreignWrites).toBeGreaterThan(0);
  }
  for (const [actor, evidence] of Object.entries(result.actors)) {
    const selector = `section:has(> #${actor}-mount) .result`;
    const status = () => document.querySelector(selector);
    const attempts = result.events.filter(event => event.actor === actor && event.bucket);
    const blocked = attempts.filter(event => event.blocked).length;
    const failed = attempts.filter(event => !event.blocked && !event.inserted).length;
    const cause = () => status().querySelector("[data-insertion-cause]");
    await expect.poll(() => visible(cause()), {
      message: "The cause is visible without expanding technical evidence",
    }).toBe(true);
    expect(cause().parentElement.firstElementChild).toBe(cause());
    if (blocked) {
      expect(cause().querySelector("strong").textContent).toBe(`Host filter blocked ${blocked} ${blocked === 1 ? "rule" : "rules"}`);
      expect(cause().textContent).toContain("without a truthy enhanced-specificity attribute");
      expect(cause().textContent).toContain("host skipped native insertion");
      expect(cause().textContent).toContain(result.policy === "master" ?
        "a rule prefix cannot bypass it" : "blocked rules have no Feedback prefix");
      for (const creator of new Set(attempts.filter(event => event.blocked && event.creator !== actor)
        .map(event => event.creator))) {
        const name = { host: "the host", unrelated: "the unrelated renderer" }[creator] || creator;
        expect(cause().textContent.toLowerCase()).toContain(`adopted from ${name}`.toLowerCase());
      }
    } else if (failed) {
      expect(cause().querySelector("strong").textContent).toBe("Host allowed insertion; the browser rejected some rules");
      expect(cause().textContent).toContain("not host-filter rejections");
    } else expect(cause().querySelector("strong").textContent).toMatch(/^Insertion allowed/);
    for (const sheet of evidence.sheets) {
      const liveRules = Array.from(document.styleSheets[sheet.documentIndex].cssRules, rule => rule.cssText);
      expect(sheet.rules, `${result.id}/${actor}: recorded CSS matches the actual destination CSSOM`).toStrictEqual(liveRules);
    }
    await expect.poll(() => status().querySelector('[data-outcome="insertion"]').textContent)
      .toBe((blocked ? `${blocked} rules blocked.` : "No rules blocked.") + (failed ? ` ${failed} native insertions failed.` : ""));
    const presentRules = attempts.filter(event => event.present).length;
    await expect.poll(() => status().querySelector('[data-outcome="rules"]').textContent)
      .toBe(`${presentRules}/${attempts.length} recorded native rules present in destination CSSOM.`);
    const missing = attempts.some(event => event.blocked || event.inserted && !event.equivalentPresent);
    await expect.poll(() => status().classList.contains("missing"), {
      message: "Blocked or lost rules are distinct from native parser rejection warnings",
    }).toBe(missing);
    await expect.poll(() => status().classList.contains("bypass"))
      .toBe(!missing && Boolean(failed || evidence.sheets.some(sheet => sheet.sharedWith.length) ||
        attempts.some(event => event.inserted && !event.present)));
    await expect.poll(() => status().querySelectorAll('[data-outcome="appearance"]').length).toBe(0);
    await expect.poll(() => status().querySelector('[data-outcome="ownership"]').textContent.includes("Reuses sheets"))
      .toBe(evidence.sheets.some(sheet => sheet.creator !== actor));
    const sharedWith = [...new Set(evidence.sheets.flatMap(sheet => sheet.sharedWith))];
    await expect.poll(() => status().querySelector('[data-outcome="sharing"]').textContent)
      .toBe(sharedWith.length ? `Sheet handles also held by ${sharedWith.join(", ")}.` : "No shared destination handles recorded.");
    for (const key of ["measured", "matchingWidthRules", "borrowedPermission"]) {
      expect(evidence, "Actor evidence contains observations, not cached analysis or appearance").not.toHaveProperty(key);
    }
    const borrowedPermission = attempts.filter(event => !event.blocked && event.reason === "enhanced sheet" && event.creator !== actor &&
      !(result.policy === "feedback-exception" && event.feedbackPrefix)).length;
    await expect.poll(() => status().querySelector('[data-outcome="permission"]').textContent)
      .toBe(`${borrowedPermission} attempts rely on another actor's enhanced-specificity attribute.`);
    if (result.id === "persona-first-raw" && result.policy === "feedback-exception") {
      expect(borrowedPermission, "Accepted prefixes do not depend on borrowed sheet permission").toBe(0);
      expect(sharedWith).toContain(actor === "persona" ? "feedback" : "persona");
      await expect.poll(() => status().querySelector('[data-outcome="ownership"]').textContent).not.toContain("Own sheets only.");
    }
    const trace = () => status().querySelector("[data-rule-trace]");
    const traceLocator = app.getByCSS(selector).getByCSS("[data-rule-trace]");
    await traceLocator.getByCSS(":scope > summary").click();
    await expect.poll(() => trace().open).toBe(true);
    expect(trace().contains(status().querySelector(".actor-outcomes")),
      "Technical counters stay available without crowding the primary cause").toBe(true);
    const widthRule = attempts.find(event => event.rule.includes("width:137px"));
    await expect.poll(() => trace().querySelector("code").textContent).toBe(widthRule.rule);
    await expect.poll(() => trace().textContent).toContain(`${widthRule.blocked ? "blocked" : "allowed"} (${widthRule.reason})`);
    await expect.poll(() => trace().textContent).not.toContain("Computed width:");
    await expect.poll(() => trace().textContent).not.toContain("VISIBLE WIDTH MISMATCH");
    await expect.poll(() => trace().textContent).toMatch(/Selected rule only:/);
    await expect.poll(() => trace().textContent).toContain(`Native insertion: ${widthRule.blocked ? "not attempted" : "succeeded"}`);
    await expect.poll(() => trace().textContent).toContain(`Recorded rule in destination CSSOM: ${widthRule.blocked ? "no" : "yes"}`);
    await expect.poll(() => trace().querySelector("[data-matching-width-rules]").textContent)
      .toBe(evidence.matchingWidthEvidence.map(entry => entry.cssText).join("\n") || "No matching 137px CSSOM rules.");
    const ledger = () => trace().querySelector("[data-rule-ledger]");
    await expect.poll(() => ledger().querySelector("summary").textContent).toBe(`All recorded insertion attempts (${attempts.length})`);
    await expect.poll(() => (ledger().querySelector("pre").textContent.match(/^#\d+ /gm) || []).length).toBe(attempts.length);
    if (widthRule.blocked && evidence.matchingWidthEvidence.length) {
      await expect.poll(() => trace().textContent).toContain("Other width rules match the action, but this actor's recorded rule was still blocked.");
    }
    for (const event of attempts) {
      if (event.inserted) {
        expect(event.blocked).toBe(false);
        expect(event.error).toBeNull();
        expect(event.present).toBe(true);
        expect(event.equivalentPresent).toBe(true);
        expect(evidence.sheets.some(sheet => sheet.id === event.destination && sheet.rules.includes(event.cssText)),
          "Native inserted rule remains in its recorded destination").toBeTruthy();
      } else {
        expect(event.present).toBe(false);
        expect(event.cssText).toBeNull();
        if (event.blocked) {
          expect(event.error).toBeNull();
        } else {
          expect(event.rule, "Only known Firefox-only baseline rules fail in Chromium").toMatch(/::-moz-placeholder/);
          expect(event.error).toMatch(/Failed to parse the rule/);
        }
      }
    }
    await traceLocator.getByCSS(":scope > summary").click();
    await expect.poll(() => trace().open).toBe(false);
  }
}
