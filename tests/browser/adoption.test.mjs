import { createDOMRenderer } from "@griffel/core";
import { expect, test, vi } from "vitest";
import { openApplication, navigateApplication, applicationWindow } from "./application.mjs";
test.for([["default", {}, false, false], ["historical", {}, true, true], ["marker-guard", {}, false, false], ["marker-guard", {
  "data-demo-allow-rules": "true"
}, true, false], ["marker-guard", {
  "data-demo-allow-rules": "false"
}, false, false], ["owner-guard", {
  "data-demo-allow-rules": "true",
  "data-demo-renderer-owner": "another-owner"
}, false, false], ["owner-guard", {
  "data-demo-allow-rules": "true",
  "data-demo-renderer-owner": "test-owner"
}, true, false]])("%s with enhanced-specificity attributes %j: adoption=%s, blocked=%s", async ([profile, attributes, adopted, blocked], {
  onTestFinished,
  signal
}) => {
  const app = await openApplication({
    signal
  });

  await navigateApplication(app, "/?scenario=persona-alone&coverage=minimal");
  const window = applicationWindow(app);
  const doc = window.document;
  const renderer = createDOMRenderer(doc, {
    insertionPoint: doc.head.firstChild,
    styleElementAttributes: attributes
  });
  renderer.insertCSSRules({
    d: [".unrelated-host-probe{height:1px}"]
  });
  const seed = renderer.stylesheets.d0.element;
  const start = window.threeActorResult.events.length;
  const container = doc.createElement("div");
  doc.body.appendChild(container);
  const mounted = window.personaActor.mount(container, profile === "default" ? undefined : {
    profile,
    owner: "test-owner"
  });
  onTestFinished(() => {
    mounted.unmount();
    container.remove();
  });
  const width = window.threeActorResult.events.slice(start).find(event => event.rule.includes("width:137px"));
  expect(width, "A real Persona renderer attempts the scoped width rule").toBeDefined();
  await expect.poll(() => ({
    adopted: mounted.renderer.stylesheets.d0.element === seed,
    blocked: width.blocked,
    cached: Boolean(mounted.renderer.insertionCache[width.rule]),
    nativePresent: Array.from(mounted.renderer.stylesheets.d0.element.sheet.cssRules).some(rule => rule.cssText.includes("width: 137px"))
  }), {
    message: "Acceptance depends on the actual enhanced-specificity attribute/owner, not appearance or cached rules"
  }).toStrictEqual({
    adopted,
    blocked,
    cached: true,
    nativePresent: !blocked
  });
});

test("restoring native insertion does not retry cached Fluent rules", async ({ signal, onTestFinished }) => {
  const app = await openApplication({ signal });
  await navigateApplication(app, "/?scenario=persona-alone&coverage=minimal");
  const window = applicationWindow(app);
  const rule = window.threeActorResult.events.find(event => event.actor === "persona" &&
    event.bucket === "d" && event.rule.includes("background-color:var(--colorBrandBackground)")).rule;
  const renderer = createDOMRenderer(window.document);
  renderer.insertCSSRules({ d: [rule] });
  const sheet = renderer.stylesheets.d0.element.sheet;
  expect(window.threeActorResult.events.at(-1).rule).toBe(rule);
  expect(window.threeActorResult.events.at(-1).blocked).toBe(true);
  expect(sheet.cssRules.length, "The host rejected the actual generated Fluent rule").toBe(0);
  expect(renderer.insertionCache[rule], "Griffel caches even a rejected insertion").toBeTruthy();

  window.testSourceHost.dispose();
  expect(window.CSSStyleSheet.prototype.insertRule).toBe(window.testSourceNativeInsert);
  const insert = vi.spyOn(window.CSSStyleSheet.prototype, "insertRule");
  onTestFinished(() => insert.mockRestore());
  renderer.insertCSSRules({ d: [rule] });
  expect(insert, "Replaying the same rule does not reach native insertion").not.toHaveBeenCalled();
  expect(sheet.cssRules.length).toBe(0);

  const fresh = createDOMRenderer(window.document);
  fresh.insertCSSRules({ d: [rule] });
  expect(insert).toHaveBeenCalledTimes(1);
  expect(insert.mock.results[0].value, "Native index zero is a successful insertion").toBe(0);
  expect(fresh.stylesheets.d0.element.sheet.cssRules.length).toBe(1);
  expect(fresh.insertionCache[rule]).toBeTruthy();
});
