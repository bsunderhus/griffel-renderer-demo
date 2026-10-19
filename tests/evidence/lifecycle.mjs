import { expect } from "vitest";
import { navigateApplication, applicationWindow, refreshEvidence } from "../browser/application.mjs";

export async function assertEvidenceLifecycle(app, url) {
  await navigateApplication(app, `${url}/three-actors?scenario=persona-alone&coverage=minimal`);
  const window = applicationWindow(app);
  const document = window.document;
  const result = window.threeActorResult;
  const event = result.events.find(event => event.actor === "persona" && event.bucket === "d" &&
    event.rule.includes("background-color:var(--colorBrandBackground)"));
  const destination = result.actors.persona.sheets.find(sheet => sheet.id === event.destination);
  const sheet = document.styleSheets[destination.documentIndex];
  const index = Array.from(sheet.cssRules).findIndex(rule => rule.cssText === event.cssText);
  expect(index, "Actual Fluent rule exists before CSSOM removal").toBeGreaterThanOrEqual(0);
  sheet.insertRule(event.rule, sheet.cssRules.length);
  sheet.deleteRule(index);
  await refreshEvidence(window);
  const attempts = result.events.filter(event => event.actor === "persona" && event.bucket).length;
  expect(document.querySelector('[data-outcome="rules"]').textContent,
    "An identical replacement cannot mask removal of the recorded native CSSRule")
    .toBe(`${attempts - 1}/${attempts} recorded native rules present in destination CSSOM.`);
  expect(event.present).toBe(false);
  expect(document.querySelector('[data-insertion-cause="persona"]').textContent)
    .toContain("equivalent CSS remains");
  expect(Array.from(sheet.cssRules).some(rule => rule.cssText === event.cssText)).toBe(true);
  await app.getByCSS("[data-rule-trace] > summary").click();
  const removedTrace = document.querySelector("[data-rule-trace]").textContent;
  expect(removedTrace).toContain("Native insertion: succeeded");
  expect(removedTrace).toContain("Recorded rule in destination CSSOM: no");
  expect(removedTrace).toContain("Equivalent serialized rule in destination CSSOM: yes");
  expect(removedTrace).toContain("equivalent CSS remains");
  expect(removedTrace).toContain("Renderer cache contains rule: yes");
  expect(document.querySelector("[data-rule-trace] code").textContent).toBe(event.rule);
  expect(document.querySelector('[data-actor-status="persona"]').classList.contains("missing"),
    "Equivalent CSS remains available despite losing the original instance").toBe(false);
  await app.getByCSS("[data-rule-ledger] > summary").click();
  await refreshEvidence(window);
  expect(document.querySelector("[data-rule-ledger]").open,
    "Evidence refresh preserves the all-attempts disclosure").toBe(true);

  const renderer = window.testPersonaRenderer;
  delete renderer.insertionCache[event.rule];
  renderer.insertCSSRules({ d: [event.rule.replace(/^\.demo-contact-scope\s+/, "")] });
  await new Promise(resolve => window.requestAnimationFrame(resolve));
  const replay = result.events.at(-1);
  expect(replay.actor, "Late native insertions are attributed to the renderer, not the last mount phase").toBe("persona");
  expect(replay.rule, "Replay uses the actual generated rule, not synthetic scenario CSS").toBe(event.rule);
  expect(replay.present, "Native insertion refreshes evidence without a resize").toBe(true);
  expect(result.actors.persona.cache.includes(event.rule)).toBe(true);

  for (let index = sheet.cssRules.length - 1; index >= 0; index--) {
    if (sheet.cssRules[index].cssText === event.cssText) sheet.deleteRule(index);
  }
  await refreshEvidence(window);
  expect(document.querySelector('[data-actor-status="persona"]').classList.contains("missing"),
    "Removing all equivalent CSS is a real rule-availability failure").toBe(true);
  expect(document.querySelector('[data-insertion-cause="persona"] strong').textContent)
    .toBe("Previously inserted rules are now missing");
  expect(document.querySelector('[data-insertion-cause="persona"]').textContent)
    .toContain("rule removal, not blocked insertion");
  expect(document.querySelector("[data-rule-trace]").textContent)
    .toContain("Equivalent serialized rule in destination CSSOM: no");
  document.querySelector("[data-host-avatar]").style.backgroundColor = "inherit";
  await refreshEvidence(window);
  expect(document.querySelector("[data-host-background]").textContent).toMatch(/unresolved/);
  expect(document.querySelector('[data-actor-status="host"]').classList.contains("bypass"),
    "Out-of-contract cascade evidence warns instead of claiming success").toBe(true);

  const count = result.events.length;
  const status = document.getElementById("actor-evidence").textContent;
  window.dispatchEvent(new window.Event("resize"));
  window.dispatchEvent(new window.Event("pagehide"));
  window.dispatchEvent(new window.Event("pagehide"));
  window.dispatchEvent(new window.Event("resize"));
  await new Promise(resolve => window.requestAnimationFrame(resolve));
  expect({
    nativeRestored: window.CSSStyleSheet.prototype.insertRule === window.testNativeInsertRule,
    hostUnmounted: !document.querySelector('[data-fluent-owner="host"]'),
    personaUnmounted: !document.querySelector('[data-fluent-owner="persona"]'),
    countUnchanged: count === result.events.length,
    statusUnchanged: status === document.getElementById("actor-evidence").textContent,
  }, "Disposal is idempotent, restores native insertion, unmounts participants and cancels evidence refresh")
    .toStrictEqual({
      nativeRestored: true, hostUnmounted: true, personaUnmounted: true,
      countUnchanged: true, statusUnchanged: true,
    });
}
