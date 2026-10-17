import { expect } from "vitest";
import { navigateApplication, applicationWindow } from "../browser/application.mjs";

export async function assertSourceLifecycles(app, url) {
  await navigateApplication(app, `${url}/?scenario=owner-guard&coverage=minimal`);
  const ownerWindow = applicationWindow(app);
  const document = ownerWindow.document;
  const main = ownerWindow.testSourcePersona;
  const mounts = [];
  function mount(doc, options) {
    const container = doc.createElement("div");
    doc.body.appendChild(container);
    const mounted = ownerWindow.personaActor.mount(container, options);
    mounts.push(() => {
      mounted.unmount();
      container.remove();
    });
    return mounted;
  }
  const start = ownerWindow.threeActorResult.events.filter(event => event.bucket).length;
  const repeated = mount(document, { profile: "owner-guard" });
  const reusedWithoutInsertions = main.renderer === repeated.renderer &&
    start === ownerWindow.threeActorResult.events.filter(event => event.bucket).length;
  const otherOwner = mount(document, { profile: "owner-guard", owner: "second-owner" });
  const separatesOwners = otherOwner.renderer !== main.renderer;
  const iframe = document.createElement("iframe");
  document.body.appendChild(iframe);
  const otherDocument = mount(iframe.contentDocument, { profile: "owner-guard" });
  const separatesDocuments = otherDocument.renderer !== main.renderer &&
    Object.values(otherDocument.renderer.stylesheets).every(sheet => sheet.element.ownerDocument === iframe.contentDocument);
  const previous = main.renderer;
  for (const sheet of Object.values(previous.stylesheets)) sheet.element.remove();
  const renewed = mount(document, { profile: "owner-guard" });
  await new Promise(resolve => ownerWindow.requestAnimationFrame(resolve));
  const recreatesDetached = renewed.renderer !== previous &&
    Object.values(renewed.renderer.stylesheets).every(sheet => sheet.element.isConnected);
  const reinsertsWidth = Object.values(renewed.renderer.stylesheets).some(sheet =>
    Array.from(sheet.element.sheet.cssRules).some(rule => rule.cssText.includes("width: 137px")));
  for (const unmount of mounts.reverse()) unmount();
  iframe.remove();
  expect({
    reusedWithoutInsertions, separatesOwners, separatesDocuments, recreatesDetached, reinsertsWidth,
  }, "Owner profile preserves per-owner/document identity and recreates detached sheets with a fresh cache")
    .toStrictEqual({
      reusedWithoutInsertions: true, separatesOwners: true, separatesDocuments: true,
      recreatesDetached: true, reinsertsWidth: true,
    });

  await navigateApplication(app, `${url}/?scenario=raw-marked-first&coverage=minimal`);
  const feedbackWindow = applicationWindow(app);
  const first = feedbackWindow.testSourceFeedback;
  const container = feedbackWindow.document.createElement("div");
  feedbackWindow.document.body.appendChild(container);
  const second = feedbackWindow.feedbackActor.mount(container, {
    profile: "inspected", salt: false, marker: false,
  });
  const feedback = {
    rawBuild: feedbackWindow.feedbackActor.build.rawStyles,
    singleton: first.renderer === second.renderer,
    salt: second.renderer.classNameHashSalt,
    noRequestedApprovalMetadata: second.renderer.styleElementAttributes === undefined,
  };
  second.unmount();
  feedback.sheetsRetained = Object.values(first.renderer.stylesheets).every(sheet => sheet.element.isConnected);
  container.remove();
  expect(feedback, "The named inspected form profile owns salt, prefix and singleton settings").toStrictEqual({
    rawBuild: true, singleton: true, salt: "demo-feedback",
    noRequestedApprovalMetadata: true, sheetsRetained: true,
  });

  const host = feedbackWindow.testSourceHost;
  const count = feedbackWindow.document.styleSheets.length;
  host.renderer.insertCSSRules({ d: [feedbackWindow.threeActorResult.events[0].rule] });
  const noInsertion = feedbackWindow.document.styleSheets.length === count &&
    Object.keys(host.renderer.insertionCache).length === 0;
  const during = feedbackWindow.CSSStyleSheet.prototype.insertRule;
  host.unmount();
  const persistsAfterProviderUnmount = feedbackWindow.CSSStyleSheet.prototype.insertRule === during &&
    during !== feedbackWindow.testSourceNativeInsert;
  host.dispose();
  expect({
    noInsertion, persistsAfterProviderUnmount,
    restoredBySandboxDisposal: feedbackWindow.CSSStyleSheet.prototype.insertRule === feedbackWindow.testSourceNativeInsert,
  }, "No-op extraction and document-lifetime patch are distinct from sandbox teardown").toStrictEqual({
    noInsertion: true, persistsAfterProviderUnmount: true, restoredBySandboxDisposal: true,
  });

  await navigateApplication(app, `${url}/three-actors?scenario=precompiled-salted&coverage=minimal`);
  const precompiledWindow = applicationWindow(app);
  expect(() => precompiledWindow.feedbackActor.mount(precompiledWindow.document.createElement("div"), {
    profile: "inspected",
  }), "A precompiled build cannot masquerade as the inspected raw profile").toThrow(/raw-style bundle/);
}
