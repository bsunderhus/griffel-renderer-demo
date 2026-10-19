import { expect } from "vitest";
import { navigateApplication, applicationWindow } from "../browser/application.mjs";

export async function assertSourceLifecycles(app, url) {
  await navigateApplication(app, `${url}/?scenario=raw-marked-first&coverage=minimal`);
  const window = applicationWindow(app);
  const first = window.testSourceFeedback;
  const container = window.document.createElement("div");
  window.document.body.appendChild(container);
  for (const options of [
    { salt: false },
    { marker: false },
    { raw: false },
    { diagnostic: true },
    { profile: "control" },
  ]) {
    expect(
      () => window.feedbackActor.mount(container, options),
      "The candidate cannot be configured into a different renderer or workload",
    ).toThrow(/overrides/);
  }
  const second = window.feedbackActor.mount(container);
  expect(first.renderer).toBe(second.renderer);
  expect(window.feedbackActor.build.rawStyles).toBe(true);
  expect(second.renderer.classNameHashSalt).toBe("demo-feedback");
  expect(second.renderer.styleElementAttributes).toBeUndefined();
  second.unmount();
  expect(
    Object.values(first.renderer.stylesheets).every((sheet) => sheet.element.isConnected),
  ).toBe(true);
  container.remove();

  const host = window.testSourceHost;
  const count = window.document.styleSheets.length;
  const rule = window.threeActorResult.events.find(
    (event) => event.actor === "feedback" && event.bucket === "d",
  ).rule;
  host.renderer.insertCSSRules({ d: [rule] });
  expect(window.document.styleSheets.length).toBe(count);
  expect(Object.keys(host.renderer.insertionCache)).toHaveLength(0);
  const during = window.CSSStyleSheet.prototype.insertRule;
  host.unmount();
  expect(window.CSSStyleSheet.prototype.insertRule).toBe(during);
  expect(during).not.toBe(window.testSourceNativeInsert);
  host.dispose();
  expect(window.CSSStyleSheet.prototype.insertRule).toBe(window.testSourceNativeInsert);
}
