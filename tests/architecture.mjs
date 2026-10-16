import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { targets } from "../build/targets.mjs";
import { experiments, sourceExperiments, sourceScenarioAliases } from "../src/experiments/scenarios.js";
import { threeActorCases } from "../src/playground/scenarios.js";
import { resolveExperiment, resolveHostSettings } from "../src/experiments/configuration.js";

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
          assert.ok(allowedImports[owner].has(destination), `${file} must not depend on ${match[1]}`);
        }
      }
    }
  }
}
await checkImports("src");
assert.equal(targets.length, 8);
assert.equal(new Set(targets.map(target => target.name)).size, 8);
assert.deepEqual(experiments.map(({ id }) => id), threeActorCases.map(({ id }) => id));
assert.equal(experiments.length, 14);
assert.equal(new Set(experiments.map(config => config.id)).size, experiments.length);
assert.equal(sourceExperiments.length, 7);
for (const config of experiments) {
  assert.equal(config.title, undefined, "Runtime definitions do not contain presentation content");
  assert.equal(config.description, undefined);
  resolveExperiment(config, "");
  const content = threeActorCases.find(item => item.id === config.id);
  assert.ok(content.title && content.takeaway && content.description);
  assert.equal(Boolean(content.primaryExample), config.hostContract === "production-extraction",
    "Every primary scenario is source-aligned; only explanatory controls use diagnostic contracts");
  if (content.primaryExample) {
    assert.equal(config.feedbackProfile, "inspected");
    assert.ok(config.personaProfile);
  }
}
for (const id of Object.values(sourceScenarioAliases)) assert.ok(sourceExperiments.some(config => config.id === id));
assert.throws(() => resolveHostSettings("?host=unknown"), /Unknown host mode/);
assert.throws(() => resolveHostSettings("?coverage=unknown"), /Unknown host coverage/);
assert.throws(() => resolveExperiment({ id: "bad", policy: "unknown", order: ["persona"] }, ""), /Unknown host policy/);
assert.throws(() => resolveExperiment({ id: "bad", policy: "off", order: ["persona", "persona"] }, ""), /Invalid integration order/);
assert.throws(() => resolveExperiment({ id: "bad", policy: "off", order: ["other"] }, ""), /Invalid integration order/);
for (const [option, message] of [["hostContract", /Unknown host contract/],
  ["personaProfile", /Unknown Persona renderer profile/], ["feedbackProfile", /Unknown Feedback renderer profile/]]) {
  assert.throws(() => resolveExperiment({ ...sourceExperiments[0], [option]: "unknown" }, ""), message);
}
assert.doesNotMatch(await readFile("src/experiments/run.js", "utf8"), /installHostPolicy|CSSStyleSheet/,
  "The harness must not install or implement the participant-owned insertion policy");

const bundles = JSON.parse(await readFile("dist/bundle-modules.json", "utf8"));
for (const target of targets) {
  const modules = bundles[target.name];
  assert.ok(modules?.some(name => name.includes("@griffel/core/") && name.includes("createDOMRenderer")),
    `${target.name} contains its own Griffel renderer implementation, not an external/shared renderer`);
  const participant = target.entry.split("/")[0];
  for (const other of ["host", "persona", "feedback", "archived"].filter(name => name !== participant)) {
    assert.ok(!modules.some(name => name.startsWith(`./src/${other}/`)),
      `${target.name} must not bundle another participant (${other})`);
  }
  if (target.entry === "host/entry-minimal.jsx") {
    for (const control of ["react-button/", "react-label/", "react-textarea/"]) {
      assert.ok(!modules.some(name => name.includes(control)), `${target.name} does not import ${control}`);
    }
  }
}
console.log("PASS: module dependency boundaries, explicit build targets, isolated Griffel copies and minimal-host coverage.");
