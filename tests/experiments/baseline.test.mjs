import { expect, test } from "vitest";
import baseline from "virtual:research-baseline";
import { experiments } from "../../src/experiments/scenarios.js";
import { openApplication, runExperiment } from "../browser/application.mjs";

function semanticRecord(record) {
  const result = structuredClone(record);
  delete result.kind;
  delete result.configuration;
  delete result.execution;
  for (const event of result.events) delete event.mountIndex;
  // Extraction traversal changes with module boundaries; compare all declarations,
  // while the browser suite verifies live CSSOM positions and cascade outcomes.
  result.staticCSS.sort();
  if (result.hostMode === "extracted") {
    delete result.hostEvidence.avatarBackground.baseline.position;
    delete result.hostEvidence.avatarBackground.current.position;
  }
  return result;
}

test.skipIf(!baseline)("fresh diagnostic evidence matches a saved pre-refactor baseline", { timeout: 30_000 }, async ({ signal }) => {
  const app = await openApplication({ signal });
  const records = [];
  const controls = experiments.filter(config => config.hostContract !== "production-extraction");
  for (const coverage of ["minimal", "shared"]) {
    for (const host of ["extracted", "runtime"]) {
      for (const config of controls) {
        records.push(await runExperiment(app, { scenario: config.id, coverage, host }));
      }
    }
  }
  expect(records, "The report must contain all diagnostic host/coverage combinations").toHaveLength(controls.length * 4);
  const groups = {
    results: record => record.coverage === "minimal" && record.hostMode === "extracted",
    runtimeResults: record => record.coverage === "minimal" && record.hostMode === "runtime",
    sharedResults: record => record.coverage === "shared",
  };
  const rank = record => (record.hostMode === "runtime" ? controls.length : 0) +
    controls.findIndex(config => config.id === record.id);
  for (const [group, select] of Object.entries(groups)) {
    const previous = baseline[group].filter(record => controls.some(config => config.id === record.id));
    expect(
      records.filter(select).sort((a, b) => rank(a) - rank(b)).map(semanticRecord),
      `${group}: rules, decisions, cache, destinations, sharing, masking and host impact`,
    ).toStrictEqual(previous.map(semanticRecord));
  }
});
