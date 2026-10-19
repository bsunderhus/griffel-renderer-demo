import { expect, test } from "vitest";
import { personaRevisions } from "../../src/experiments/scenarios.js";
import { openApplication, runExperiment, appearanceStages } from "../browser/application.mjs";

const configurations = Object.keys(personaRevisions).flatMap(personaVersion =>
  ["master", "feedback-exception"].flatMap(hostPolicy =>
    ["extracted", "runtime"].flatMap(host => ["minimal", "shared"].map(coverage =>
      ({ personaVersion, hostPolicy, host, coverage })))));

test.for(configurations)("$personaVersion / $hostPolicy / $host / $coverage: preload changes only the schedule",
  async (settings, { signal }) => {
    const app = await openApplication({ signal });
    const ordinary = [];
    for (const [normal, preloaded] of [
      ["persona-first-raw", "feedback-preloaded"],
      ["raw-marked-first", "both-preloaded"],
    ]) {
      const before = await runExperiment(app, { ...settings, scenario: normal });
      const beforeAppearance = appearanceStages(app);
      ordinary.push(before);
      const after = await runExperiment(app, { ...settings, scenario: preloaded });
      expect(appearanceStages(app), "Preloading preserves appearance at every mount as well as native insertion")
        .toStrictEqual(beforeAppearance);
      expect(after.configuration, "Exactly the same host, actor artifacts, options and workload").toStrictEqual(before.configuration);
      expect(after.execution).not.toStrictEqual(before.execution);
      const attempts = result => result.events.filter(event => event.bucket).map(event => ({
        actor: event.actor, rule: event.rule, creator: event.creator,
        blocked: event.blocked, inserted: event.inserted, present: event.present,
        reason: event.reason, enhanced: event.enhanced, feedbackPrefix: event.feedbackPrefix,
      }));
      expect(attempts(after), "Early construction alone does not change provider-time sheet adoption or generated rules")
        .toStrictEqual(attempts(before));
      for (const actor of ["persona", "feedback"]) {
        expect(after.actors[actor].cache).toStrictEqual(before.actors[actor].cache);
        expect(after.actors[actor].sheets).toStrictEqual(before.actors[actor].sheets);
      }
    }
    expect(ordinary[1].configuration, "Reversing arrival order cannot change actor configuration")
      .toStrictEqual(ordinary[0].configuration);
    for (const actor of ["persona", "feedback"]) {
      const generated = result => result.events.filter(event => event.actor === actor && event.bucket)
        .map(({ bucket, priority, rule }) => ({ bucket, priority, rule }));
      expect(generated(ordinary[1]), "Arrival order changes destinations/permission, not the actor's generated CSS")
        .toStrictEqual(generated(ordinary[0]));
    }
  });
