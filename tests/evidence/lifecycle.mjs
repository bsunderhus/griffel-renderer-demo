import assert from "node:assert/strict";

export async function assertEvidenceLifecycle(page, url) {
  await page.addInitScript(() => {
    window.testNativeInsertRule = CSSStyleSheet.prototype.insertRule;
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
  const disposed = await page.evaluate(async () => {
    const count = window.threeActorResult.events.length;
    const status = document.getElementById("actor-evidence").textContent;
    window.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new Event("pagehide"));
    window.dispatchEvent(new Event("pagehide"));
    window.dispatchEvent(new Event("resize"));
    await new Promise(requestAnimationFrame);
    return {
      nativeRestored: CSSStyleSheet.prototype.insertRule === window.testNativeInsertRule,
      hostUnmounted: !document.querySelector('[data-fluent-owner="host"]'),
      personaUnmounted: !document.querySelector('[data-fluent-owner="persona"]'),
      countUnchanged: count === window.threeActorResult.events.length,
      statusUnchanged: status === document.getElementById("actor-evidence").textContent,
    };
  });
  assert.deepEqual(disposed, {
    nativeRestored: true, hostUnmounted: true, personaUnmounted: true,
    countUnchanged: true, statusUnchanged: true,
  }, "Disposal is idempotent, restores native insertion, unmounts participants and cancels evidence refresh");
}
