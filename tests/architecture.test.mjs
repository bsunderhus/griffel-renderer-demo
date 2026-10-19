import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { targets } from "../build/targets.mjs";
import { baselineExperiments, diagnosticExperiments, experiments, sourceExperiments, scenarioAliases, personaRevisions } from "../src/experiments/scenarios.js";
import { threeActorCases, getThreeActorCases } from "../src/playground/scenarios.js";
import { resolveExperiment, resolveHostSettings, validateSchedule } from "../src/experiments/configuration.js";
import { expect, test } from "vitest";

const allowedImports = {
  host: new Set(["host", "shared"]),
  persona: new Set(["persona", "shared"]),
  feedback: new Set(["feedback", "shared"]),
  shared: new Set(["shared"]),
  evidence: new Set(["evidence"]),
};
async function checkImports(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await checkImports(file);
    } else if (/\.(js|jsx)$/.test(file)) {
      const owner = file.split(path.sep)[1];
      const source = await readFile(file, "utf8");
      for (const match of source.matchAll(/(?:import|export)\s+(?:[^;]*?\s+from\s+)?["'](\.[^"']+)["']/g)) {
        const destination = path.normalize(path.join(path.dirname(file), match[1])).split(path.sep)[1];
        if (allowedImports[owner]) {
          expect(allowedImports[owner].has(destination), `${file} must not depend on ${match[1]}`).toBeTruthy();
        }
      }
    }
  }
}
test("participant imports respect module boundaries", async () => {
  await checkImports("src");
});

test("scenario definitions and configuration validation preserve the research contract", async () => {
  expect(targets).toHaveLength(7);
  expect(new Set(targets.map(target => target.name)).size).toBe(7);
  expect(experiments.map(({ id }) => id)).toStrictEqual(threeActorCases.map(({ id }) => id));
  expect(experiments).toHaveLength(14);
  expect(new Set(experiments.map(config => config.id)).size).toBe(experiments.length);
  expect(sourceExperiments).toHaveLength(8);
  expect(threeActorCases.filter(config => config.primaryExample)).toHaveLength(8);
  expect(resolveHostSettings("").hostPolicy).toBe("master");
  expect(resolveHostSettings("").personaVersion).toBe("1.20260927.13.2");
  for (const version of Object.keys(personaRevisions)) {
    const cases = getThreeActorCases(version);
    expect(
      cases.map(config => config.id),
      "Version selection must not add scenario cards",
    ).toStrictEqual(threeActorCases.map(config => config.id));
    for (const config of sourceExperiments.filter(config => config.personaRevision === "selected")) {
      const resolved = resolveExperiment(config, `personaVersion=${version}`);
      expect(resolved.personaRevision).toBe(version);
      expect(resolved.personaProfile).toBe(personaRevisions[version].profile);
      expect(
        cases.find(item => item.id === config.id).title.startsWith(`${personaRevisions[version].label}:`),
      ).toBeTruthy();
    }
  }
  for (const config of experiments) {
    expect(config.title, "Runtime definitions do not contain presentation content").toBeUndefined();
    expect(config.description).toBeUndefined();
    resolveExperiment(config, "");
    const content = threeActorCases.find(item => item.id === config.id);
    expect(content.title && content.takeaway && content.description).toBeTruthy();
    expect(
      Boolean(content.primaryExample),
      "Only fixed-actor schedules are baseline examples",
    ).toBe(config.kind === "baseline");
    if (content.primaryExample) {
      expect(config.feedbackProfile).toBe("inspected");
      expect(config.personaProfile, "Primary profiles come from the shared version selection").toBeUndefined();
    } else if (config.hostContract === "production-extraction") {
      expect(["proposal", "diagnostic"]).toContain(config.kind);
    } else {
      expect(config.personaProfile, "Diagnostic baseline profiles must remain explicit").toBe("historical");
    }
  }
  for (const id of Object.values(scenarioAliases)) expect(experiments.some(config => config.id === id)).toBeTruthy();
  expect(
    resolveExperiment({ id: "default", policy: "off", order: ["persona"] }, "").personaProfile,
  ).toBe("marker-guard");
  expect(() => resolveHostSettings("?host=unknown")).toThrow(/Unknown host mode/);
  expect(() => resolveHostSettings("?coverage=unknown")).toThrow(/Unknown host coverage/);
  expect(
    () => resolveExperiment({ id: "bad", policy: "unknown", order: ["persona"] }, ""),
  ).toThrow(/Unknown host policy/);
  expect(
    () => resolveExperiment({ id: "bad", policy: "off", order: ["persona", "persona"] }, ""),
  ).toThrow(/Invalid integration order/);
  expect(
    () => resolveExperiment({ id: "bad", policy: "off", order: ["other"] }, ""),
  ).toThrow(/Invalid integration order/);
  for (const [option, message] of [["hostContract", /Unknown host contract/],
    ["personaProfile", /Unknown Persona renderer profile/], ["feedbackProfile", /Unknown Feedback renderer profile/],
    ["personaRevision", /Unknown or incompatible Persona revision/]]) {
    expect(() => resolveExperiment({ ...sourceExperiments[0], [option]: "unknown" }, "")).toThrow(message);
  }
  expect(
    () => resolveExperiment({ ...sourceExperiments[0], personaProfile: "marker-guard" }, ""),
  ).toThrow(/Unknown or incompatible Persona revision/);
  expect(() => resolveHostSettings("?personaVersion=unknown")).toThrow(/Unknown Persona version/);
  expect(() => resolveHostSettings("?hostPolicy=unknown")).toThrow(/Unknown host filter revision/);
  expect(await readFile("src/experiments/run.js", "utf8"), "The harness must not install or implement the participant-owned insertion policy").not.toMatch(/installHostPolicy|CSSStyleSheet/);
});

test("baseline schedules freeze actors and cannot enable counterfactual overrides", () => {
  for (const personaVersion of Object.keys(personaRevisions)) {
    for (const hostPolicy of ["master", "feedback-exception"]) {
      for (const host of ["extracted", "runtime"]) {
        for (const coverage of ["minimal", "shared"]) {
          const query = new URLSearchParams({ personaVersion, hostPolicy, host, coverage }).toString();
          const resolved = baselineExperiments.map(config => resolveExperiment(config, query));
          const actorConfiguration = settings => ({
            hostContract: settings.hostContract, policy: settings.policy,
            script: settings.script, stylesheet: settings.stylesheet,
            personaProfile: settings.personaProfile, personaRevision: settings.personaRevision,
            feedbackProfile: settings.feedbackProfile, feedback: settings.feedback,
          });
          for (const settings of resolved) {
            expect(actorConfiguration(settings)).toStrictEqual(actorConfiguration(resolved[0]));
            expect(settings.feedback).toStrictEqual({ raw: true, salt: true, marker: true });
            expect(settings.seed).toBe(false);
          }
        }
      }
    }
  }
  for (const overrides of [
    { raw: false }, { salt: false }, { marker: false }, { seed: true },
    { feedbackProfile: "control" }, { hostContract: "diagnostic" }, { policy: "master" },
    { personaProfile: "owner-guard", personaRevision: null },
  ]) {
    expect(() => resolveExperiment({ ...baselineExperiments[0], ...overrides }, ""))
      .toThrow(/Baseline actors cannot be overridden/);
  }
  expect(diagnosticExperiments.every(config => config.kind !== "baseline")).toBe(true);
});

test("schedules reject impossible lifecycle events instead of silently changing the experiment", () => {
  for (const schedule of [
    [], [{ action: "mount", actor: "persona" }],
    [{ action: "load", actor: "persona" }, { action: "load", actor: "persona" }],
    [{ action: "load", actor: "persona" }, { action: "unmount", actor: "persona" }],
    [{ action: "load", actor: "persona" }, { action: "mount", actor: "persona" }, { action: "mount", actor: "persona" }],
    [{ action: "load", actor: "other" }], [{ action: "unknown", actor: "persona" }],
    [{ action: "load", actor: "persona" }, { action: "mount", actor: "persona" }, { action: "unmount", actor: "persona" }],
  ]) expect(() => validateSchedule(schedule, ["persona"])).toThrow();
  for (const schedule of [null, false, "persona", []]) {
    expect(() => resolveExperiment({ ...baselineExperiments[0], schedule }, ""))
      .toThrow(/Schedule must contain events/);
  }
});
