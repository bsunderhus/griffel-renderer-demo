import assert from "node:assert/strict";

export async function assertPresentedEvidence(page, result) {
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
