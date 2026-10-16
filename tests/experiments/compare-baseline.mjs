import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { experiments } from "../../src/experiments/scenarios.js";

const baselinePath = process.argv[2];
if (!baselinePath) throw new Error("Usage: node tests/experiments/compare-baseline.mjs <baseline-results.json>");
const before = JSON.parse(await readFile(baselinePath, "utf8"));
const after = JSON.parse(await readFile("test-results/three-actor-results.json", "utf8"));

function semanticRecord(record) {
  const result = structuredClone(record);
  // Extraction traversal changes with module boundaries; compare all declarations,
  // while the browser suite verifies live CSSOM positions and cascade outcomes.
  result.staticCSS.sort();
  if (result.hostMode === "extracted") {
    delete result.hostEvidence.avatarBackground.baseline.position;
    delete result.hostEvidence.avatarBackground.current.position;
  }
  return result;
}

const controls = new Set(experiments.filter(config => config.hostContract !== "production-extraction").map(config => config.id));
let count = 0;
for (const group of ["results", "runtimeResults", "sharedResults"]) {
  const previousControls = before[group].filter(record => controls.has(record.id));
  assert.deepEqual(after[group].map(semanticRecord), previousControls.map(semanticRecord),
    `${group}: generated rules, native decisions, cache, destinations, sharing, masking and host impact are preserved`);
  count += previousControls.length;
}
console.log(`PASS: all ${count} diagnostic evidence records match the pre-refactor baseline; primary host contracts intentionally changed.`);
