import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { createReproServer } from "../../server.mjs";
import { sourceExperiments, scenarioAliases, scenarioAliasVersions, personaRevisions } from "../../src/experiments/scenarios.js";
import { resolveExperiment } from "../../src/experiments/configuration.js";
import { assertPresentedEvidence } from "../evidence/assert-presented.mjs";
import { assertSourceLifecycles } from "./lifecycle.mjs";
import { assertCurrentMainComparisons } from "./current-main.mjs";

const server = createReproServer();
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1800 } });
  const errors = [];
  const failed = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("requestfailed", request => failed.push(request.url()));
  await page.addInitScript(() => {
    window.testSourceNativeInsert = CSSStyleSheet.prototype.insertRule;
    for (const [name, key] of [["reproHost", "Host"], ["personaActor", "Persona"], ["feedbackActor", "Feedback"]]) {
      Object.defineProperty(window, name, {
        configurable: true,
        set(module) {
          Object.defineProperty(window, name, { configurable: true, writable: true, value: module });
          const mount = module.mount;
          module.mount = (...args) => {
            const mounted = mount(...args);
            window[`testSource${key}`] = mounted;
            if (key === "Host") {
              window.testSourcePatchedDuringHostMount = CSSStyleSheet.prototype.insertRule !== window.testSourceNativeInsert;
            }
            return mounted;
          };
        },
      });
    }
  });
  const results = [];
  const configurations = sourceExperiments.flatMap(config =>
    (config.personaRevision === "selected" ? Object.keys(personaRevisions) : ["1.20260927.13.2"])
      .map(personaVersion => ({ config, personaVersion })));
  for (const host of ["extracted", "runtime"]) {
    for (const coverage of ["minimal", "shared"]) {
      for (const { config, personaVersion } of configurations) {
        const query = `scenario=${config.id}&host=${host}&coverage=${coverage}&personaVersion=${personaVersion}`;
        const resolved = resolveExperiment(config, query);
        await page.goto(`${url}/?${query}`);
        await page.waitForFunction(() => window.threeActorResult || window.threeActorError);
        const result = await page.evaluate(() => {
          if (window.threeActorError) throw new Error(window.threeActorError);
          return window.threeActorResult;
        });
        const active = host === "extracted";
        assert.equal(result.simulation.host.contract, "production-extraction");
        assert.equal(result.simulation.host.shouldInstall, active);
        assert.equal(result.simulation.host.installed, active);
        assert.equal(result.simulation.host.renderer, active ? "noop" : "dom");
        assert.equal(await page.evaluate(() => window.testSourcePatchedDuringHostMount), active,
          "The host installs its own patch in its layout effect, not later in the harness");
        assert.equal(result.policy, active ? config.policy : "off");
        assert.equal(result.feedbackConfig.raw, true);
        assert.equal(result.feedbackConfig.salt, true);
        assert.equal(result.feedbackConfig.marker, true);
        assert.equal(result.hostRuntimeCalls === 0, active);
        assert.equal(result.hostEvidence.avatarBackground.changed, false);
        if (!active) assert.ok(result.events.every(event => !event.blocked));
        if (config.seed) {
          const seedAttempt = result.events.find(event => event.actor === "unrelated");
          assert.ok(seedAttempt, "The source lab observes the seed renderer under the already-mounted host contract");
          assert.equal(seedAttempt.blocked, active);
        }
        assert.equal(result.simulation.personaRevision, resolved.personaRevision);
        assert.equal(result.simulation.persona, resolved.personaProfile);
        const personaBlocked = Boolean(active && resolved.personaProfile === "historical" &&
          (config.seed || config.order[0] === "feedback"));
        const feedbackBlocked = active && config.policy === "master";
        for (const [actor, evidence] of Object.entries(result.actors)) {
          const attempts = result.events.filter(event => event.actor === actor && event.bucket);
          const blocked = actor === "persona" ? personaBlocked : feedbackBlocked;
          const width = attempts.find(event => event.rule.includes("width:137px"));
          assert.equal(width.blocked, blocked);
          assert.equal(width.present, !blocked);
          assert.ok(evidence.cache.includes(width.rule), "Blocked rules remain cached in the actual renderer");
          if (blocked) assert.ok(attempts.filter(event => event.blocked).length > 100);
          if (actor === "feedback") {
            assert.ok(attempts.every(event => event.feedbackPrefix));
            assert.equal(evidence.rendererSalt, "demo-feedback");
          }
        }
        if (resolved.personaProfile !== "historical") {
          assert.ok(result.actors.persona.sheets.every(sheet => sheet.creator === "persona"),
            "The guarded profiles reject incompatible host/form destinations");
        }
        if (config.order[0] === "persona" && config.order.includes("feedback")) {
          assert.ok(result.actors.persona.sheets.some(sheet => sheet.sharedWith.includes("feedback")));
          assert.equal(result.actors.feedback.borrowedPermission, 0);
        }
        await assertPresentedEvidence(page, result);
        assert.match(await page.locator("[data-host-contract]").textContent(), /Host-owned production-extraction contract/);
        results.push(result);
      }
    }
  }
  const currentMainComparisons = assertCurrentMainComparisons(results);
  await assertSourceLifecycles(page, url);
  await page.goto(`${url}/?coverage=minimal`);
  assert.equal(await page.locator('nav a[aria-current="page"]').getAttribute("href"), "/");
  assert.equal(await page.locator("nav a").count(), 1);
  assert.equal(await page.locator('[data-scenario-contract="source-aligned"]').count(), sourceExperiments.length);
  assert.equal(await page.locator('[data-scenario-contract="diagnostic"]').count(), 7);
  assert.equal(await page.locator('[data-scenario-kind="main"]').count(), 0);
  assert.equal(await page.locator('[data-scenario-kind="release"]').count(), 5);
  assert.equal(await page.locator('[data-scenario-kind="proposal"]').count(), 1);
  await page.locator(".explanatory-controls > summary").click();
  for (const config of sourceExperiments) {
    await page.frameLocator(`#${config.id} iframe`).locator("[data-host-contract]").waitFor();
  }
  await page.getByLabel("Host CSS", { exact: true }).selectOption("runtime");
  await page.waitForURL(`${url}/?coverage=minimal&host=runtime`);
  await page.frameLocator("#raw-marked-first iframe").locator("[data-host-contract]").waitFor();
  assert.equal(await page.frameLocator("#raw-marked-first iframe").locator("body")
    .evaluate(() => window.threeActorResult.simulation.host.shouldInstall), false);
  const legacyGallery = await page.request.get(`${url}/source?host=runtime&coverage=minimal`, { maxRedirects: 0 });
  assert.equal(legacyGallery.status(), 302);
  assert.equal(legacyGallery.headers().location, "/?host=runtime&coverage=minimal");
  await page.goto(`${url}/source?coverage=minimal#source-owner-guard`);
  assert.equal(page.url(), `${url}/?coverage=minimal#owner-guard`);
  assert.equal(await page.locator("#owner-guard").isVisible(), true);
  for (const [legacy, canonical] of Object.entries(scenarioAliases)) {
    const response = await page.request.get(
      `${url}/source?scenario=${legacy}&host=runtime&coverage=minimal&view=walkthrough`, { maxRedirects: 0 });
    assert.equal(response.status(), 302);
    const version = scenarioAliasVersions[legacy];
    assert.equal(response.headers().location,
      `/?scenario=${canonical}&host=runtime&coverage=minimal&view=walkthrough${version ? `&personaVersion=${version}` : ""}`);
  }
  await page.goto(`${url}/?scenario=marker-guard&host=extracted&coverage=minimal`);
  await page.waitForFunction(() => window.threeActorResult);
  assert.equal(page.url(), `${url}/?scenario=raw-marked-first&host=extracted&coverage=minimal&personaVersion=main-2026-10-16`);
  assert.equal(await page.evaluate(() => window.threeActorResult.simulation.persona), "marker-guard");
  await page.goto(`${url}/#marker-guard`);
  assert.equal(page.url(), `${url}/?personaVersion=main-2026-10-16#raw-marked-first`);
  assert.equal(await page.locator("#raw-marked-first").isVisible(), true);
  await page.goto(`${url}/source?scenario=source-feedback-first&host=runtime&coverage=minimal`);
  await page.waitForFunction(() => window.threeActorResult);
  assert.equal(page.url(), `${url}/?scenario=raw-marked-first&host=runtime&coverage=minimal`);
  assert.equal(await page.evaluate(() => window.threeActorResult.simulation.host.shouldInstall), false);
  await page.goto(`${url}/three-actors?scenario=persona-alone&coverage=minimal`);
  await page.waitForFunction(() => window.threeActorResult);
  assert.equal(page.url(), `${url}/?scenario=persona-alone&coverage=minimal`);
  assert.deepEqual(errors, []);
  assert.deepEqual(failed, []);
  await mkdir("test-results", { recursive: true });
  await writeFile("test-results/source-contract-results.json", JSON.stringify({ results, currentMainComparisons }, null, 2));
  console.log(`PASS: ${results.length} source-aligned simulations and ${currentMainComparisons.length} current-main comparisons; gates, renderer ownership, cache lifetime, arrival order, unified gallery and legacy redirects.`);
} finally {
  await browser?.close();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
