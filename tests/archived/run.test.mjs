import { openApplication, navigateApplication, applicationWindow, waitForApplicationURL, applicationFrame } from "../browser/application.mjs";
import { page as browserPage } from "vitest/browser";
import { expect, test } from "vitest";
import { cases } from "../../src/archived/mechanism-cases.js";
import { extractionCases } from "../../src/archived/extraction-cases.js";
test.for(["extracted", "runtime"])("%s: eight archived extraction cases, layout, and local actions", async (mode, {
  task,
  signal
}) => {
  const app = await openApplication({
    signal
  });
  const url = location.origin;
  await browserPage.viewport(1440, 1800);
  await navigateApplication(app, `${url}/${mode}`);
  await expect.poll(() => {
    const document = applicationWindow(app).document;
    const window = document.defaultView;
    const frames = Array.from(document.querySelectorAll("iframe"));
    return frames.length === 8 && frames.every(frame => frame.contentWindow.extractionResult || frame.contentWindow.extractionError);
  }).toBeTruthy();
  await expect.poll(() => app.getByRole("link", {
    name: "Playground",
    exact: true
  }).element().getAttribute("href")).toBe("/");
  await expect.element(app.getByCSS(".site-header")).toHaveTextContent(new RegExp(`Archived diagnostic: ${mode}`));
  const rows = Array.from(applicationWindow(app).document.querySelectorAll(".grid > .card")).map(card => {
    const rect = card.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom
    };
  });
  expect(rows).toHaveLength(8);
  for (let index = 1; index < rows.length; index++) {
    expect(rows[index].left).toBe(rows[0].left);
    expect(rows[index].right).toBe(rows[0].right);
    expect(rows[index].top, "Each scenario occupies its own full row").toBeGreaterThan(rows[index - 1].bottom);
  }
  await expect.poll(() => Array.from(applicationWindow(app).document.querySelectorAll(".grid > .card > p > strong")).length).toBe(8);
  for (const element of Array.from(applicationWindow(app).document.querySelectorAll("iframe"))) {
    const frame = applicationFrame(app, `iframe[src="${element.getAttribute("src")}"]`);
    await expect.poll(() => Array.from(applicationWindow(frame).document.querySelectorAll('[data-fluent-owner="host"] [data-host]')).length).toBe(1);
    await expect.poll(() => Array.from(applicationWindow(frame).document.querySelectorAll('[data-fluent-owner="integration"] button[data-integration]')).length).toBe(1);
    await expect.poll(() => Array.from(applicationWindow(frame).document.querySelectorAll(".probe")).length).toBe(0);
  }
  const results = await Array.from(applicationWindow(app).document.querySelectorAll("iframe"), frame => {
    if (frame.contentWindow.extractionError) throw new Error(frame.contentWindow.extractionError);
    return structuredClone(frame.contentWindow.extractionResult);
  });
  for (const config of extractionCases) {
    const result = results.find(item => item.id === config.id);
    const expected = mode === "extracted" ? config.expected : {
      hostPadding: "0px",
      hostChanged: false,
      fixtureBlocked: ["protected", "approved", "adoption", "exception-unmarked"].includes(config.id) ? 2 : 0,
      adopted: Boolean(config.seed),
      ...(["collision", "salted", "permission", "exception"].includes(config.id) ? {
        width: "137px"
      } : {})
    };
    for (const [key, value] of Object.entries(expected)) {
      expect(result[key], `${mode}/${config.id}: ${key}`).toBe(value);
    }
    if (mode === "extracted") {
      expect(result.hostRuntimeCalls, "Including Fluent hooks: no host runtime insertions").toBe(0);
      expect(result.bucketsBefore, "Including Fluent hooks: no host runtime buckets").toBe(0);
    } else {
      expect(result.hostRuntimeCalls, "Fluent hooks actually insert styles at runtime").toBeGreaterThan(2);
      expect(result.bucketsBefore, "Fluent uses additional style buckets").toBeGreaterThan(2);
    }
    expect(result.adoptedHost).toBe(mode === "runtime" && !config.seed);
    expect(result.before.paddingLeft).toBe("0px");
    expect(result.before.background).toBe("rgb(183, 228, 199)");
    expect(result.after.background).toBe(result.hostChanged ? "rgb(232, 163, 61)" : "rgb(183, 228, 199)");
    expect(result.sharedClasses.length > 0).toBe(!config.salt);
    expect(result.sharedFluentClasses.length, "Precompiled Fluent classes stay shared, including salted scenarios").toBeGreaterThan(0);
    expect(result.fluentBefore.icon, "Minimal host has no phone button").toBeNull();
    expect(result.fluentBefore.primary, "Minimal host has no submit button").toBeNull();
    const losesAtomicRules = mode === "extracted" && ["adoption", "exception-unmarked"].includes(config.id);
    const losesAllRules = mode === "extracted" ? config.id === "protected" : ["protected", "approved", "adoption", "exception-unmarked"].includes(config.id);
    expect(result.fluentIntegration.icon.width, `${mode}/${config.id}: Fluent icon button becomes a wide default button`).toBe(losesAtomicRules ? "96px" : losesAllRules ? "48px" : "32px");
    expect(result.fluentIntegration.primary.background, `${mode}/${config.id}: Fluent primary appearance`).toBe(losesAtomicRules ? "rgb(255, 255, 255)" : losesAllRules ? "rgb(239, 239, 239)" : "rgb(15, 108, 189)");
    expect(result.fluentAfter.icon).toBeNull();
    expect(result.fluentAfter.primary).toBeNull();
    const shouldBlock = config.policy !== "none" && !(config.policy === "rule" && config.markRule);
    expect(result.blocked > 0, `${mode}/${config.id}: total rule blocking`).toBe(shouldBlock && !(mode === "extracted" && config.id === "approved"));
    expect(result.events.length, "Real Fluent components emit rules, not only the probe").toBeGreaterThan(100);
    if (config.id === "permission") {
      expect(result.events.some(event => !event.blocked && event.approved)).toBeTruthy();
      expect(result.events.some(event => event.blocked && !event.approved), "Enhanced-specificity attributes on r/d do not cover additional Fluent buckets").toBeTruthy();
    }
    if (!expected.width) expect(result.width, `${mode}/${config.id}: width must be missing`).not.toBe("137px");
    expect(result.staticCSS.length > 0).toBe(mode === "extracted");
    if (mode === "runtime") {
      expect(result.sheetOrder[0].startsWith("r0:"), "Reset bucket stays first").toBeTruthy();
    } else {
      expect(result.sheetOrder[0], "Static CSS precedes runtime buckets").toBe("extracted CSS");
    }
  }
  const frame = applicationFrame(app, 'iframe[src$="scenario=adoption"]');
  await frame.getByCSS('[data-fluent-owner="integration"] textarea').fill("Standalone feedback test");
  await frame.getByRole("button", {
    name: "Send feedback",
    exact: true
  }).last().click();
  await expect.poll(() => applicationWindow(frame).document.querySelector('[data-fluent-owner="integration"] [role="status"]').textContent).toBe("Feedback submitted (local demo only)");
  task.meta.evidence = {
    kind: "archived-extraction",
    hostMode: mode,
    results
  };
});
test("archived host builds preserve baseline styles, classes, and presentation", async ({
  signal
}) => {
  const app = await openApplication({
    signal
  });
  const url = location.origin;
  await browserPage.viewport(1440, 1800);
  const snapshots = {};
  for (const mode of ["extracted", "runtime"]) {
    await navigateApplication(app, `${url}/${mode}`);
    await expect.poll(() => {
      const document = applicationWindow(app).document;
      const window = document.defaultView;
      return document.querySelectorAll("iframe").length === 8 && Array.from(document.querySelectorAll("iframe")).every(frame => frame.contentWindow.extractionResult || frame.contentWindow.extractionError);
    }).toBeTruthy();
    snapshots[mode] = Array.from(applicationWindow(app).document.querySelectorAll("iframe")).map(frame => {
      if (frame.contentWindow.extractionError) throw new Error(frame.contentWindow.extractionError);
      return {
        result: structuredClone(frame.contentWindow.extractionResult),
        layout: {
          width: frame.getBoundingClientRect().width,
          height: frame.getBoundingClientRect().height,
          title: frame.title
        }
      };
    });
  }
  expect(snapshots.extracted.map(item => item.layout), "Both routes must use identical scenario presentation").toStrictEqual(snapshots.runtime.map(item => item.layout));
  for (let i = 0; i < extractionCases.length; i++) {
    const extracted = snapshots.extracted[i].result;
    const runtime = snapshots.runtime[i].result;
    expect(extracted.before, "Exact same host classes and computed styles before integration").toStrictEqual(runtime.before);
    expect(extracted.integration.classes, "Identical integration bundle and generated classes").toStrictEqual(runtime.integration.classes);
    expect(extracted.fluentBefore, "Fluent host baseline appearance and classes must be equivalent across host builds").toStrictEqual(runtime.fluentBefore);
  }
});
test("eight archived mechanism cases and navigation back to the gallery", async ({
  task,
  signal
}) => {
  const app = await openApplication({
    signal
  });
  const url = location.origin;
  await browserPage.viewport(1440, 1800);
  await navigateApplication(app, `${url}/mechanisms`);
  await expect.poll(() => {
    const document = applicationWindow(app).document;
    const window = document.defaultView;
    return document.querySelectorAll("iframe").length === 8 && Array.from(document.querySelectorAll("iframe")).every(frame => frame.contentWindow.reproResult);
  }).toBeTruthy();
  const mechanisms = await Array.from(applicationWindow(app).document.querySelectorAll("iframe"), frame => frame.contentWindow.reproResult);
  for (const config of cases) {
    const result = mechanisms.find(item => item.id === config.id);
    for (const [key, expected] of Object.entries(config.expected)) expect(result[key], config.id).toBe(expected);
    expect(result.cachedRules).toHaveLength(1);
    expect(result.width === "137px").toBe(result.rules === 1);
    if (config.retry) expect(result.beforeRetry).toBe(result.rules);
  }
  expect(mechanisms.find(item => item.id === "salt").className).not.toBe(mechanisms.find(item => item.id === "blocked").className);
  // Archived diagnostics link back to the playground.
  await app.getByRole("link", {
    name: "Playground",
    exact: true
  }).click();
  await waitForApplicationURL(app, `${url}/`);
  await expect.poll(() => Array.from(applicationWindow(app).document.querySelectorAll("nav a")).map(link => link.getAttribute("href"))).toStrictEqual(["/", "/docs"]);
  await expect.poll(() => Array.from(applicationWindow(app).document.querySelectorAll(".walkthrough")).length).toBe(14);
  task.meta.evidence = {
    kind: "archived-mechanism",
    results: mechanisms
  };
});
