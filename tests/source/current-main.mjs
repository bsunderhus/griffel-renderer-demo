import assert from "node:assert/strict";
import { sourceExperiments } from "../../src/experiments/scenarios.js";

export function assertCurrentMainComparisons(results) {
  const comparisons = [];
  for (const hostMode of ["extracted", "runtime"]) {
    for (const coverage of ["minimal", "shared"]) {
      for (const config of sourceExperiments.filter(config => config.personaRevision === "selected")) {
        const currentId = config.id;
        const historicalId = config.id;
        const find = revision => results.find(result => result.id === config.id &&
          result.simulation.personaRevision === revision && result.hostMode === hostMode && result.coverage === coverage);
        const current = find("main-2026-10-16");
        const historical = find("1.20260927.13.2");
        assert.ok(current && historical, "Each setup has tested release and upstream-main counterparts");
        assert.equal(current.simulation.persona, "marker-guard");
        assert.equal(historical.simulation.persona, "historical");
        assert.equal(current.simulation.personaRevision, "main-2026-10-16");
        assert.equal(historical.simulation.personaRevision, "1.20260927.13.2");
        assert.deepEqual(current.simulation.host, historical.simulation.host);
        assert.deepEqual(current.order, historical.order);
        assert.deepEqual(current.feedbackConfig, historical.feedbackConfig);
        const width = result => result.events.find(event => event.actor === "persona" && event.rule.includes("width:137px"));
        const currentRule = width(current);
        const historicalRule = width(historical);
        assert.equal(currentRule.rule, historicalRule.rule, "The guard changes the destination, not the generated scoped rule");
        assert.equal(currentRule.present, true);
        assert.equal(currentRule.blocked, false);
        assert.equal(currentRule.creator, "persona");
        const rejected = hostMode === "extracted" && (config.seed || config.order[0] === "feedback");
        assert.equal(historicalRule.present, !rejected);
        assert.equal(historicalRule.blocked, Boolean(rejected));
        for (const result of [current, historical]) assert.ok(result.actors.persona.cache.includes(width(result).rule));
        comparisons.push({ currentId, historicalId, hostMode, coverage,
          currentPresent: currentRule.present, historicalPresent: historicalRule.present });
      }
    }
  }
  return comparisons;
}
