import { expect } from "vitest";
import { sourceExperiments } from "../../src/experiments/scenarios.js";

export function assertCurrentMainComparisons(results, configurations = sourceExperiments,
  hostModes = ["extracted", "runtime"], coverages = ["minimal", "shared"]) {
  const comparisons = [];
  for (const hostMode of hostModes) {
    for (const coverage of coverages) {
      for (const config of configurations.filter(config => config.personaRevision === "selected" && config.order.includes("persona"))) {
        const currentId = config.id;
        const historicalId = config.id;
        const find = revision => results.find(result => result.id === config.id &&
          result.simulation.personaRevision === revision && result.hostMode === hostMode && result.coverage === coverage);
        const current = find("main-2026-10-16");
        const historical = find("1.20260927.13.2");
        expect(current && historical, "Each setup has tested release and upstream-main counterparts").toBeTruthy();
        expect(current.simulation.persona).toBe("marker-guard");
        expect(historical.simulation.persona).toBe("historical");
        expect(current.simulation.personaRevision).toBe("main-2026-10-16");
        expect(historical.simulation.personaRevision).toBe("1.20260927.13.2");
        expect(current.simulation.host).toStrictEqual(historical.simulation.host);
        expect(current.order).toStrictEqual(historical.order);
        expect(current.feedbackConfig).toStrictEqual(historical.feedbackConfig);
        const component = result => result.events.find(event => event.actor === "persona" && event.bucket === "d" &&
          event.rule.includes("background-color:var(--colorBrandBackground)"));
        expect(component(current).rule, "The revision changes destination handling, not the actual Fluent rule")
          .toBe(component(historical).rule);
        const width = result => result.events.find(event => event.actor === "persona" && event.rule.includes("width:137px"));
        const currentRule = width(current);
        const historicalRule = width(historical);
        expect(
          currentRule.rule,
          "The guard changes the destination, not the generated scoped rule",
        ).toBe(historicalRule.rule);
        expect(currentRule.present).toBe(true);
        expect(currentRule.blocked).toBe(false);
        expect(currentRule.creator).toBe("persona");
        const rejected = hostMode === "extracted" && (config.seed || config.order[0] === "feedback");
        expect(historicalRule.present).toBe(!rejected);
        expect(historicalRule.blocked).toBe(Boolean(rejected));
        for (const result of [current, historical]) expect(result.actors.persona.cache).toContain(width(result).rule);
        comparisons.push({ currentId, historicalId, hostMode, coverage,
          currentPresent: currentRule.present, historicalPresent: historicalRule.present });
      }
    }
  }
  return comparisons;
}
