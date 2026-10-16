import assert from "node:assert/strict";
import { build } from "esbuild";

export async function assertSourceLifecycles(page, url) {
  const driver = await build({
    entryPoints: ["tests/source/seed-driver.js"], bundle: true, write: false,
    define: { "process.env.NODE_ENV": '"production"' }, sourcemap: false,
  });
  for (const [profile, attributes, adopted, blocked] of [
    ["historical", {}, true, true],
    ["marker-guard", {}, false, false],
    ["marker-guard", { "data-demo-allow-rules": "true" }, true, false],
    ["marker-guard", { "data-demo-allow-rules": "false" }, false, false],
    ["owner-guard", { "data-demo-allow-rules": "true", "data-demo-renderer-owner": "another-owner" }, false, false],
    ["owner-guard", { "data-demo-allow-rules": "true", "data-demo-renderer-owner": "test-owner" }, true, false],
  ]) {
    await page.goto(`${url}/?scenario=persona-alone&coverage=minimal`);
    await page.waitForFunction(() => window.threeActorResult);
    await page.addScriptTag({ content: driver.outputFiles[0].text });
    const probe = await page.evaluate(({ profile, attributes }) => {
      const seed = window.sourceSeed(attributes);
      const start = window.threeActorResult.events.length;
      const container = document.createElement("div");
      document.body.appendChild(container);
      const mounted = window.personaActor.mount(container, { profile, owner: "test-owner" });
      const width = window.threeActorResult.events.slice(start).find(event => event.rule.includes("width:137px"));
      const result = {
        adopted: mounted.renderer.stylesheets.d0.element === seed,
        blocked: width.blocked,
        cached: Boolean(mounted.renderer.insertionCache[width.rule]),
        nativePresent: Array.from(mounted.renderer.stylesheets.d0.element.sheet.cssRules)
          .some(rule => rule.cssText.includes("width: 137px")),
      };
      mounted.unmount();
      container.remove();
      return result;
    }, { profile, attributes });
    assert.deepEqual(probe, { adopted, blocked, cached: true, nativePresent: !blocked },
      `${profile}: acceptance depends on the actual marker/owner, not appearance or cached rules`);
  }

  await page.goto(`${url}/?scenario=owner-guard&coverage=minimal`);
  await page.waitForFunction(() => window.threeActorResult);
  const cache = await page.evaluate(async () => {
    const main = window.testSourcePersona;
    const mounts = [];
    function mount(doc, options) {
      const container = doc.createElement("div");
      doc.body.appendChild(container);
      const mounted = window.personaActor.mount(container, options);
      mounts.push(() => { mounted.unmount(); container.remove(); });
      return mounted;
    }
    const start = window.threeActorResult.events.filter(event => event.bucket).length;
    const repeated = mount(document, { profile: "owner-guard" });
    const reusedWithoutInsertions = main.renderer === repeated.renderer &&
      start === window.threeActorResult.events.filter(event => event.bucket).length;
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
    await new Promise(requestAnimationFrame);
    const recreatesDetached = renewed.renderer !== previous &&
      Object.values(renewed.renderer.stylesheets).every(sheet => sheet.element.isConnected);
    const reinsertsWidth = Object.values(renewed.renderer.stylesheets).some(sheet =>
      Array.from(sheet.element.sheet.cssRules).some(rule => rule.cssText.includes("width: 137px")));
    for (const unmount of mounts.reverse()) unmount();
    iframe.remove();
    return { reusedWithoutInsertions, separatesOwners, separatesDocuments, recreatesDetached, reinsertsWidth };
  });
  assert.deepEqual(cache, {
    reusedWithoutInsertions: true, separatesOwners: true, separatesDocuments: true,
    recreatesDetached: true, reinsertsWidth: true,
  }, "Owner profile preserves per-owner/document identity and recreates detached sheets with a fresh cache");

  await page.goto(`${url}/?scenario=raw-marked-first&coverage=minimal`);
  await page.waitForFunction(() => window.threeActorResult);
  const feedback = await page.evaluate(() => {
    const first = window.testSourceFeedback;
    const container = document.createElement("div");
    document.body.appendChild(container);
    const second = window.feedbackActor.mount(container, { profile: "inspected", salt: false, marker: false });
    const result = {
      rawBuild: window.feedbackActor.build.rawStyles,
      singleton: first.renderer === second.renderer,
      salt: second.renderer.classNameHashSalt,
      noRequestedApprovalMetadata: second.renderer.styleElementAttributes === undefined,
    };
    second.unmount();
    result.sheetsRetained = Object.values(first.renderer.stylesheets).every(sheet => sheet.element.isConnected);
    container.remove();
    return result;
  });
  assert.deepEqual(feedback, {
    rawBuild: true, singleton: true, salt: "demo-feedback",
    noRequestedApprovalMetadata: true, sheetsRetained: true,
  }, "The named inspected form profile owns salt, prefix and singleton settings");

  const noop = await page.evaluate(() => {
    const host = window.testSourceHost;
    const count = document.styleSheets.length;
    host.renderer.insertCSSRules({ d: [window.threeActorResult.events[0].rule] });
    const noInsertion = document.styleSheets.length === count && Object.keys(host.renderer.insertionCache).length === 0;
    const during = CSSStyleSheet.prototype.insertRule;
    host.unmount();
    const persistsAfterProviderUnmount = CSSStyleSheet.prototype.insertRule === during &&
      during !== window.testSourceNativeInsert;
    host.dispose();
    return { noInsertion, persistsAfterProviderUnmount,
      restoredBySandboxDisposal: CSSStyleSheet.prototype.insertRule === window.testSourceNativeInsert };
  });
  assert.deepEqual(noop, {
    noInsertion: true, persistsAfterProviderUnmount: true, restoredBySandboxDisposal: true,
  }, "No-op extraction and document-lifetime patch are distinct from sandbox teardown");

  await page.goto(`${url}/three-actors?scenario=precompiled-salted&coverage=minimal`);
  await page.waitForFunction(() => window.threeActorResult);
  const refusal = await page.evaluate(() => {
    try {
      window.feedbackActor.mount(document.createElement("div"), { profile: "inspected" });
      return null;
    } catch (error) {
      return error.message;
    }
  });
  assert.match(refusal, /raw-style bundle/, "A precompiled build cannot masquerade as the inspected raw profile");
}
