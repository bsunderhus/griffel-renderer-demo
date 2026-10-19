import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { targets } from "../build/targets.mjs";
import { experiments, personaRevisions } from "../src/experiments/scenarios.js";
import { getThreeActorCases } from "../src/playground/scenarios.js";
import {
  resolveExperiment,
  resolveHostSettings,
  validateSchedule,
} from "../src/experiments/configuration.js";
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
      for (const match of source.matchAll(
        /(?:import|export)\s+(?:[^;]*?\s+from\s+)?["'](\.[^"']+)["']/g,
      )) {
        const destination = path
          .normalize(path.join(path.dirname(file), match[1]))
          .split(path.sep)[1];
        if (allowedImports[owner]) {
          expect(
            allowedImports[owner].has(destination),
            `${file} must not depend on ${match[1]}`,
          ).toBeTruthy();
        }
      }
    }
  }
}
test("participant imports respect module boundaries", async () => {
  await checkImports("src");
});

test("scenario definitions and configuration validation preserve the research contract", async () => {
  const threeActorCases = getThreeActorCases();
  expect(targets).toHaveLength(6);
  expect(new Set(targets.map((target) => target.name)).size).toBe(6);
  expect(experiments.map(({ id }) => id)).toStrictEqual(threeActorCases.map(({ id }) => id));
  expect(experiments).toHaveLength(8);
  expect(new Set(experiments.map((config) => config.id)).size).toBe(experiments.length);
  expect(threeActorCases).toHaveLength(8);
  expect(resolveHostSettings("").hostPolicy).toBe("master");
  expect(resolveHostSettings("").personaVersion).toBe("1.20260927.13.2");
  for (const version of Object.keys(personaRevisions)) {
    const cases = getThreeActorCases(version);
    expect(
      cases.map((config) => config.id),
      "Version selection must not add scenario cards",
    ).toStrictEqual(threeActorCases.map((config) => config.id));
    for (const config of experiments) {
      const resolved = resolveExperiment(config, `personaVersion=${version}`);
      expect(resolved.personaRevision).toBe(version);
      expect(resolved.personaProfile).toBe(personaRevisions[version].profile);
      expect(
        cases
          .find((item) => item.id === config.id)
          .title.startsWith(`${personaRevisions[version].label}:`),
      ).toBeTruthy();
    }
  }
  for (const config of experiments) {
    expect(config.title, "Runtime definitions do not contain presentation content").toBeUndefined();
    expect(config.description).toBeUndefined();
    resolveExperiment(config, "");
    const content = threeActorCases.find((item) => item.id === config.id);
    expect(content.title && content.takeaway && content.description).toBeTruthy();
    expect(config.kind).toBe("baseline");
    expect(config.feedbackProfile).toBe("inspected");
    expect(
      config.personaProfile,
      "Profiles come from the shared version selection",
    ).toBeUndefined();
  }
  expect(() => resolveHostSettings("?host=unknown")).toThrow(/Unknown host mode/);
  expect(() => resolveHostSettings("?coverage=unknown")).toThrow(/Unknown host coverage/);
  expect(() => resolveExperiment({ ...experiments[0], policy: "unknown" }, "")).toThrow(
    /Baseline actors cannot be overridden/,
  );
  expect(() =>
    resolveExperiment({ id: "bad", policy: "off", order: ["persona", "persona"] }, ""),
  ).toThrow(/Invalid integration order/);
  expect(() => resolveExperiment({ id: "bad", policy: "off", order: ["other"] }, "")).toThrow(
    /Invalid integration order/,
  );
  for (const option of ["hostContract", "personaProfile", "feedbackProfile", "personaRevision"]) {
    expect(() => resolveExperiment({ ...experiments[0], [option]: "unknown" }, "")).toThrow(
      /Baseline actors cannot be overridden/,
    );
  }
  expect(() =>
    resolveExperiment({ ...experiments[0], personaProfile: "marker-guard" }, ""),
  ).toThrow(/Baseline actors cannot be overridden/);
  expect(() => resolveHostSettings("?personaVersion=unknown")).toThrow(/Unknown Persona version/);
  expect(() => resolveHostSettings("?hostPolicy=unknown")).toThrow(/Unknown host filter revision/);
  expect(
    await readFile("src/experiments/run.js", "utf8"),
    "The harness must not install or implement the participant-owned insertion policy",
  ).not.toMatch(/installHostPolicy|CSSStyleSheet/);
  const entry = await readFile("src/browser-entry.jsx", "utf8");
  expect(entry, "Execution uses the registry, never gallery-decorated configurations").toContain(
    'import { experiments } from "./experiments/scenarios.js"',
  );
  expect(entry).not.toContain("./playground/scenarios.js");
  for (const version of Object.keys(personaRevisions)) {
    expect(
      getThreeActorCases(version).every((config) => !Object.hasOwn(config, "personaProfile")),
      "Presentation does not inject runtime actor overrides",
    ).toBe(true);
  }
});

test("baseline schedules freeze actors and cannot enable counterfactual overrides", () => {
  for (const personaVersion of Object.keys(personaRevisions)) {
    for (const hostPolicy of ["master", "feedback-exception"]) {
      for (const host of ["extracted", "runtime"]) {
        for (const coverage of ["minimal", "shared"]) {
          const query = new URLSearchParams({
            personaVersion,
            hostPolicy,
            host,
            coverage,
          }).toString();
          const resolved = experiments.map((config) => resolveExperiment(config, query));
          const actorConfiguration = (settings) => ({
            hostContract: settings.hostContract,
            policy: settings.policy,
            script: settings.script,
            stylesheet: settings.stylesheet,
            personaProfile: settings.personaProfile,
            personaRevision: settings.personaRevision,
            feedbackProfile: settings.feedbackProfile,
            feedback: settings.feedback,
          });
          for (const settings of resolved) {
            expect(actorConfiguration(settings)).toStrictEqual(actorConfiguration(resolved[0]));
            expect(settings.feedback).toStrictEqual({ raw: true, salt: true, marker: true });
            expect(settings).not.toHaveProperty("seed");
          }
        }
      }
    }
  }
  for (const overrides of [
    { raw: false },
    { salt: false },
    { marker: false },
    { seed: true },
    { feedbackProfile: "control" },
    { hostContract: "diagnostic" },
    { policy: "master" },
    { personaProfile: "owner-guard", personaRevision: null },
    { kind: "diagnostic" },
    { diagnostic: true },
    { seed: false },
  ]) {
    expect(() => resolveExperiment({ ...experiments[0], ...overrides }, "")).toThrow(
      /Baseline actors cannot be overridden/,
    );
  }
  expect(experiments.every((config) => config.kind === "baseline")).toBe(true);
});

test("schedules reject impossible lifecycle events instead of silently changing the experiment", () => {
  for (const schedule of [
    [],
    [{ action: "mount", actor: "persona" }],
    [
      { action: "load", actor: "persona" },
      { action: "load", actor: "persona" },
    ],
    [
      { action: "load", actor: "persona" },
      { action: "unmount", actor: "persona" },
    ],
    [
      { action: "load", actor: "persona" },
      { action: "mount", actor: "persona" },
      { action: "mount", actor: "persona" },
    ],
    [{ action: "load", actor: "other" }],
    [{ action: "unknown", actor: "persona" }],
    [
      { action: "load", actor: "persona" },
      { action: "mount", actor: "persona" },
      { action: "unmount", actor: "persona" },
    ],
  ]) {
    expect(() => validateSchedule(schedule, ["persona"])).toThrow();
  }
  for (const schedule of [null, false, "persona", []]) {
    expect(() => resolveExperiment({ ...experiments[0], schedule }, "")).toThrow(
      /Schedule must contain events/,
    );
  }
});
