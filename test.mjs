import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { chromium } from "playwright";
import { createRequire } from "node:module";
import { createReproServer } from "./server.mjs";
import { cases } from "./src/cases.js";
import { extractionCases } from "./src/extraction-cases.js";

const extractedCSS = await readFile("dist/griffel.css", "utf8");
const require = createRequire(import.meta.url);
assert.equal(require("@fluentui/react-components/package.json").version, "9.74.9");
assert.match(extractedCSS, /background-color:#b7e4c7/);
assert.match(extractedCSS, /background-color:#e8a33d/);
assert.match(extractedCSS, /--colorBrandBackground/, "Real Fluent theme-based rules must be extracted");
const hostBundle = await readFile("dist/host-extracted.js", "utf8");
assert.doesNotMatch(hostBundle, /#e8a33d|#b7e4c7/, "Host declarations must leave extracted JavaScript");
assert.match(hostBundle, /__resetCSS/);
assert.match(hostBundle, /__css/);
for (const filename of ["host-runtime", "integration"]) {
  assert.match(await readFile(`dist/${filename}.js`, "utf8"), /#e8a33d/, `${filename}: raw styles retained`);
}

const server = createReproServer();
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1800 } });
  const errors = [];
  const failedRequests = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("requestfailed", request => failedRequests.push(request.url()));
  await mkdir("test-results", { recursive: true });
  const comparisons = {};
  const layouts = {};
  for (const mode of ["extracted", "runtime"]) {
    await page.goto(`${url}/${mode}`);
    await page.waitForFunction(() => {
      const frames = Array.from(document.querySelectorAll("iframe"));
      return frames.length === 8 && frames.every(frame =>
        frame.contentWindow.extractionResult || frame.contentWindow.extractionError);
    });
    assert.equal(await page.getByRole("link", { name: "Integration playground", exact: true }).getAttribute("href"), "/");
    assert.match(await page.locator("nav").textContent(), new RegExp(`Archived diagnostic: ${mode}`));
    const rows = await page.locator(".grid > .card").evaluateAll(cards => cards.map(card => {
      const rect = card.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    }));
    assert.equal(rows.length, 8);
    for (let index = 1; index < rows.length; index++) {
      assert.equal(rows[index].left, rows[0].left);
      assert.equal(rows[index].right, rows[0].right);
      assert.ok(rows[index].top > rows[index - 1].bottom, "Each scenario occupies its own full row");
    }
    assert.equal(await page.locator(".grid > .card > p > strong").count(), 8);
    for (const frame of page.frames().filter(frame => frame !== page.mainFrame())) {
      assert.equal(await frame.locator('[data-fluent-owner="host"] [data-host]').count(), 1);
      assert.equal(await frame.locator('[data-fluent-owner="integration"] button[data-integration]').count(), 1);
      assert.equal(await frame.locator(".probe").count(), 0);
    }
    const results = await page.evaluate(() => Array.from(document.querySelectorAll("iframe"), frame => {
      if (frame.contentWindow.extractionError) throw new Error(frame.contentWindow.extractionError);
      return frame.contentWindow.extractionResult;
    }));
    comparisons[mode] = results;
    layouts[mode] = await page.locator("iframe").evaluateAll(frames => frames.map(frame => ({
      width: frame.getBoundingClientRect().width, height: frame.getBoundingClientRect().height,
      title: frame.title,
    })));
    for (const config of extractionCases) {
      const result = results.find(item => item.id === config.id);
      const expected = mode === "extracted" ? config.expected : {
        hostPadding: "0px", hostChanged: false,
        fixtureBlocked: ["protected", "approved", "adoption", "exception-unmarked"].includes(config.id) ? 2 : 0,
        adopted: Boolean(config.seed),
        ...(["collision", "salted", "permission", "exception"].includes(config.id) ? { width: "137px" } : {}),
      };
      for (const [key, value] of Object.entries(expected)) {
        assert.equal(result[key], value, `${mode}/${config.id}: ${key}`);
      }
      if (mode === "extracted") {
        assert.equal(result.hostRuntimeCalls, 0, "Including Fluent hooks: no host runtime insertions");
        assert.equal(result.bucketsBefore, 0, "Including Fluent hooks: no host runtime buckets");
      } else {
        assert.ok(result.hostRuntimeCalls > 2, "Fluent hooks actually insert styles at runtime");
        assert.ok(result.bucketsBefore > 2, "Fluent uses additional style buckets");
      }
      assert.equal(result.adoptedHost, mode === "runtime" && !config.seed);
      assert.equal(result.before.paddingLeft, "0px");
      assert.equal(result.before.background, "rgb(183, 228, 199)");
      assert.equal(result.after.background, result.hostChanged ? "rgb(232, 163, 61)" : "rgb(183, 228, 199)");
        assert.equal(result.sharedClasses.length > 0, !config.salt);
        assert.ok(result.sharedFluentClasses.length > 0, "Precompiled Fluent classes stay shared, including salted scenarios");
        assert.equal(result.fluentBefore.icon, null, "Minimal host has no phone button");
        assert.equal(result.fluentBefore.primary, null, "Minimal host has no submit button");
        const losesAtomicRules = mode === "extracted" && ["adoption", "exception-unmarked"].includes(config.id);
        const losesAllRules = mode === "extracted" ? config.id === "protected" :
          ["protected", "approved", "adoption", "exception-unmarked"].includes(config.id);
        assert.equal(result.fluentIntegration.icon.width, losesAtomicRules ? "96px" : losesAllRules ? "48px" : "32px",
          `${mode}/${config.id}: Fluent icon button becomes a wide default button`);
        assert.equal(result.fluentIntegration.primary.background,
          losesAtomicRules ? "rgb(255, 255, 255)" : losesAllRules ? "rgb(239, 239, 239)" : "rgb(15, 108, 189)",
          `${mode}/${config.id}: Fluent primary appearance`);
        assert.equal(result.fluentAfter.icon, null);
        assert.equal(result.fluentAfter.primary, null);
        const shouldBlock = config.policy !== "none" && !(config.policy === "rule" && config.markRule);
        assert.equal(result.blocked > 0, shouldBlock &&
          !(mode === "extracted" && config.id === "approved"), `${mode}/${config.id}: total rule blocking`);
        assert.ok(result.events.length > 100, "Real Fluent components emit rules, not only the probe");
        if (config.id === "permission") {
          assert.ok(result.events.some(event => !event.blocked && event.approved));
          assert.ok(result.events.some(event => event.blocked && !event.approved),
            "Approval of r/d does not approve additional Fluent buckets");
        }
      if (!expected.width) assert.notEqual(result.width, "137px", `${mode}/${config.id}: width must be missing`);
      assert.equal(result.staticCSS.length > 0, mode === "extracted");
      if (mode === "runtime") {
        assert.ok(result.sheetOrder[0].startsWith("r0:"), "Reset bucket stays first");
      } else {
        assert.equal(result.sheetOrder[0], "extracted CSS", "Static CSS precedes runtime buckets");
      }
    }
    await page.screenshot({ path: `test-results/${mode}.png`, fullPage: true });
    await page.locator('iframe[src$="scenario=adoption"]').screenshot({
      path: `test-results/${mode}-fluent-adoption.png`,
    });
    const frame = page.frameLocator('iframe[src$="scenario=adoption"]');
    await frame.locator('[data-fluent-owner="integration"] textarea').fill("Standalone feedback test");
    await frame.getByRole("button", { name: "Send feedback", exact: true }).last().click();
    assert.equal(await frame.locator('[data-fluent-owner="integration"] [role="status"]').textContent(),
      "Feedback submitted (local demo only)");
    console.log(`${mode} host:`);
    console.table(results.map(({ id, hostPadding, hostChanged, width, blocked, adoptedHost }) =>
      ({ id, hostPadding, hostChanged, width, blocked, adoptedHost })));
  }
  assert.deepEqual(layouts.extracted, layouts.runtime, "Both routes must use identical scenario presentation");
  for (let i = 0; i < extractionCases.length; i++) {
    assert.deepEqual(comparisons.extracted[i].before, comparisons.runtime[i].before,
      "Exact same host classes and computed styles before integration");
    assert.deepEqual(comparisons.extracted[i].integration.classes, comparisons.runtime[i].integration.classes,
      "Identical integration bundle and generated classes");
    assert.deepEqual(comparisons.extracted[i].fluentBefore, comparisons.runtime[i].fluentBefore,
      "Fluent host baseline appearance and classes must be equivalent across host builds");
  }
  await page.goto(`${url}/mechanisms`);
  await page.waitForFunction(() => document.querySelectorAll("iframe").length === 8 &&
    Array.from(document.querySelectorAll("iframe")).every(frame => frame.contentWindow.reproResult));
  const mechanisms = await page.evaluate(() =>
    Array.from(document.querySelectorAll("iframe"), frame => frame.contentWindow.reproResult));
  for (const config of cases) {
    const result = mechanisms.find(item => item.id === config.id);
    for (const [key, expected] of Object.entries(config.expected)) assert.equal(result[key], expected, config.id);
    assert.equal(result.cachedRules.length, 1);
    assert.equal(result.width === "137px", result.rules === 1);
    if (config.retry) assert.equal(result.beforeRetry, result.rules);
  }
  assert.notEqual(mechanisms.find(item => item.id === "salt").className,
    mechanisms.find(item => item.id === "blocked").className);
  await page.screenshot({ path: "test-results/mechanisms.png", fullPage: true });
  // Archived diagnostics link back to the single user-facing playground.
  await page.getByRole("link", { name: "Integration playground", exact: true }).click();
  await page.waitForURL(`${url}/`);
  assert.equal(await page.locator("nav a").count(), 1);
  assert.equal(await page.locator(".walkthrough").count(), 12);
  assert.deepEqual(errors, [], "Unexpected browser errors");
  assert.deepEqual(failedRequests, [], "No failed asset requests");
  await writeFile("test-results/results.json", JSON.stringify({
    browser: browser.version(), comparisons, mechanisms,
  }, null, 2));
  console.log("PASS: 24 scenarios; real Fluent controls, extraction, precompiled salt limits, 32px-to-96px icon regression, interactions, and routes verified.");
} finally {
  if (browser) await browser.close();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
