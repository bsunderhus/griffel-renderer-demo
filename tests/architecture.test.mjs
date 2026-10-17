import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { targets } from "../build/targets.mjs";
import { experiments, sourceExperiments, scenarioAliases, personaRevisions } from "../src/experiments/scenarios.js";
import { threeActorCases, getThreeActorCases } from "../src/playground/scenarios.js";
import { resolveExperiment, resolveHostSettings } from "../src/experiments/configuration.js";
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
  expect(targets).toHaveLength(8);
  expect(new Set(targets.map(target => target.name)).size).toBe(8);
  expect(experiments.map(({ id }) => id)).toStrictEqual(threeActorCases.map(({ id }) => id));
  expect(experiments).toHaveLength(13);
  expect(new Set(experiments.map(config => config.id)).size).toBe(experiments.length);
  expect(sourceExperiments).toHaveLength(6);
  expect(threeActorCases.filter(config => config.primaryExample)).toHaveLength(5);
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
      "Both named revisions are primary; the unmerged owner proposal is a control",
    ).toBe(config.hostContract === "production-extraction" && config.personaRevision === "selected");
    if (content.primaryExample) {
      expect(config.feedbackProfile).toBe("inspected");
      expect(config.personaProfile, "Primary profiles come from the shared version selection").toBeUndefined();
    } else if (config.hostContract === "production-extraction") {
      expect(content.controlKind).toBe("proposal");
    } else {
      expect(config.personaProfile, "Diagnostic baseline profiles must remain explicit").toBe("historical");
    }
  }
  for (const id of Object.values(scenarioAliases)) expect(sourceExperiments.some(config => config.id === id)).toBeTruthy();
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
  expect(await readFile("src/experiments/run.js", "utf8"), "The harness must not install or implement the participant-owned insertion policy").not.toMatch(/installHostPolicy|CSSStyleSheet/);
});
