import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { expect, test } from "vitest";
import { targets } from "../build/targets.mjs";

test.each(["feedback-raw", "feedback-marked"])(
  "%s uses the actual public Fluent raw-style modules",
  async (target) => {
    const rawModules = JSON.parse(await readFile(`dist/${target}-modules.json`, "utf8"));
    for (const module of [
      "useButtonStyles.styles.raw.js",
      "useAvatarStyles.styles.raw.js",
      "useTextareaStyles.styles.raw.js",
      "useFluentProviderStyles.styles.raw.js",
    ]) {
      expect(
        rawModules.some((path) => path.endsWith(module)),
        `Active Fluent raw module: ${module}`,
      ).toBeTruthy();
    }
  },
);

test("marked Feedback changes no Fluent raw module inputs", async () => {
  expect(JSON.parse(await readFile("dist/feedback-marked-modules.json", "utf8"))).toEqual(
    JSON.parse(await readFile("dist/feedback-raw-modules.json", "utf8")),
  );
});

test("the candidate Persona bundle uses the actual public Fluent raw-style modules", async () => {
  const rawModules = JSON.parse(await readFile("dist/persona-raw-modules.json", "utf8"));
  for (const module of [
    "useButtonStyles.styles.raw.js",
    "useAvatarStyles.styles.raw.js",
    "useTextareaStyles.styles.raw.js",
    "useFluentProviderStyles.styles.raw.js",
  ]) {
    expect(
      rawModules.some((path) => path.endsWith(module)),
      `Active Fluent raw module: ${module}`,
    ).toBeTruthy();
  }
});

test("published artifacts exclude test-only appearance instrumentation", async () => {
  for (const file of [
    "dist/app.js",
    "dist/pages/app.js",
    "dist/index.html",
    "dist/pages/index.html",
  ]) {
    const content = await readFile(file, "utf8");
    expect(content, `${file} contains no test measurement helpers`).not.toMatch(
      /testMeasureAppearance|testAppearanceStages/,
    );
    expect(content, `${file} does not load test instrumentation`).not.toContain(
      "/tests/browser/instrumentation.js",
    );
  }
});

test("extracted and runtime artifacts retain their original compilation contracts", async () => {
  const extractedCSS = await readFile("dist/griffel.css", "utf8");
  const require = createRequire(import.meta.url);
  expect(require("@fluentui/react-components/package.json").version).toBe("9.74.9");
  expect(extractedCSS, "Real Fluent theme-based rules must be extracted").toMatch(
    /--colorBrandBackground/,
  );
  const hostBundle = await readFile("dist/host-extracted.js", "utf8");
  expect(hostBundle).toMatch(/__resetCSS/);
  expect(hostBundle).toMatch(/__css/);
  for (const filename of ["host-runtime", "feedback-raw"]) {
    expect(
      await readFile(`dist/${filename}.js`, "utf8"),
      `${filename}: actual Fluent styles retained`,
    ).toMatch(/--colorBrandBackground/);
  }
});

test("actor artifacts contain no constructed collisions, width witnesses or ownership proposal", async () => {
  for (const file of [
    ...targets.map((target) => `dist/${target.name}.js`),
    "dist/griffel.css",
    "dist/shared/griffel.css",
  ]) {
    expect(await readFile(file, "utf8"), `${file}: source-aligned actors only`).not.toMatch(
      /#e8a33d|#b7e4c7|width:137px|data-demo-renderer-owner|owner-guard|DiagnosticFeedbackForm/,
    );
  }
});

test("built targets contain independent renderers and preserve minimal-host coverage", async () => {
  const bundles = JSON.parse(await readFile("dist/bundle-modules.json", "utf8"));
  for (const target of targets) {
    const modules = bundles[target.name];
    expect(
      modules?.some(
        (name) => name.includes("@griffel/core/") && name.includes("createDOMRenderer"),
      ),
      `${target.name} contains its own Griffel renderer implementation, not an external/shared renderer`,
    ).toBeTruthy();
    const participant = target.entry.split("/")[0];
    for (const other of ["host", "persona", "feedback"].filter((name) => name !== participant)) {
      expect(
        modules.some((name) => name.startsWith(`./src/${other}/`)),
        `${target.name} must not bundle another participant (${other})`,
      ).toBeFalsy();
    }
    if (target.entry === "host/entry-minimal.jsx") {
      for (const control of ["react-button/", "react-label/", "react-textarea/"]) {
        expect(
          modules.some((name) => name.includes(control)),
          `${target.name} does not import ${control}`,
        ).toBeFalsy();
      }
    }
  }
});
