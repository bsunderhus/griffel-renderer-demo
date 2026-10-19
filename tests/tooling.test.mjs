import { ESLint } from "eslint";
import { getFileInfo } from "prettier";
import { expect, test } from "vitest";

const eslint = new ESLint();

async function lint(source, filePath) {
  const [result] = await eslint.lintText(source, { filePath });
  return result.messages.map((message) => message.ruleId);
}

test("lint enforces braces, strict equality, and unused variables", async () => {
  const rules = await lint(
    "export function matches(value) { const unused = 1; if (value == 0) return true; return false; }",
    "src/tooling-probe.js",
  );
  expect(rules).toEqual(expect.arrayContaining(["curly", "eqeqeq", "no-unused-vars"]));
});

test("lint understands classic JSX imports and catches undefined components", async () => {
  expect(
    await lint(
      'import React from "react"; function Card() { return <div />; } export const card = <Card />;',
      "src/tooling-probe.jsx",
    ),
  ).toEqual([]);
  expect(
    await lint(
      'import React from "react"; export const card = <Missing />;',
      "src/tooling-probe.jsx",
    ),
  ).toContain("no-undef");
});

test("lint enforces React Hook call order and effect dependencies", async () => {
  const rules = await lint(
    `import React, { useEffect, useState } from "react";
     export function Card({ enabled, value }) {
       if (enabled) { useState(0); }
       useEffect(() => { console.log(value); }, []);
       return <div />;
     }`,
    "src/tooling-probe.jsx",
  );
  expect(rules).toEqual(
    expect.arrayContaining(["react-hooks/rules-of-hooks", "react-hooks/exhaustive-deps"]),
  );
});

test("lint distinguishes browser globals from Node and the host build-time environment", async () => {
  expect(await lint("document.title = window.location.href;", "src/tooling-probe.js")).toEqual([]);
  expect(await lint("process.exitCode = 0;", "scripts/tooling-probe.mjs")).toEqual([]);
  expect(await lint("process.exitCode = 0;", "src/tooling-probe.js")).toContain("no-undef");
  expect(await lint("document.title = 'test';", "scripts/tooling-probe.mjs")).toContain("no-undef");
  expect(await lint("export const mode = process.env.NODE_ENV;", "src/host/mount.jsx")).toEqual([]);
});

test("lint permits intentionally unused arguments and caught errors", async () => {
  expect(
    await lint(
      "export function read(_input) { try { return JSON.parse('0'); } catch (_error) { return null; } }",
      "src/tooling-probe.js",
    ),
  ).toEqual([]);
});

test.each([
  "node_modules/tooling-probe.js",
  "dist/tooling-probe.js",
  "test-results/tooling-probe.js",
])("quality tools ignore generated or installed file %s", async (file) => {
  expect(await eslint.isPathIgnored(file)).toBe(true);
  expect((await getFileInfo(file, { ignorePath: [".gitignore", ".prettierignore"] })).ignored).toBe(
    true,
  );
});

test("formatting covers source but leaves the npm-generated lockfile alone", async () => {
  const options = { ignorePath: [".gitignore", ".prettierignore"] };
  expect((await getFileInfo("src/host/policy.js", options)).inferredParser).toBe("babel");
  expect((await getFileInfo("package-lock.json", options)).ignored).toBe(true);
});
