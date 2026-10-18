import { openApplication, runExperiment, applicationWindow, navigateApplication, waitForElement, waitForApplicationURL, visible, applicationFrame } from "../browser/application.mjs";
import { expect, test } from "vitest";
import { sourceExperiments, personaRevisions } from "../../src/experiments/scenarios.js";
import { resolveExperiment } from "../../src/experiments/configuration.js";
import { assertPresentedEvidence } from "../evidence/assert-presented.mjs";
import { assertSourceLifecycles } from "./lifecycle.mjs";
import { assertCurrentMainComparisons } from "./current-main.mjs";
const configurations = ["extracted", "runtime"].flatMap(host => ["minimal", "shared"].flatMap(coverage => sourceExperiments.map(config => ({
  host,
  coverage,
  config,
  id: config.id
}))));
test.for(configurations)("$host / $coverage / $id: source contract and paired revisions", async ({
  host,
  coverage,
  config
}, {
  task,
  signal
}) => {
  const app = await openApplication({
    signal
  });
  const paired = [];
  for (const personaVersion of config.personaRevision === "selected" ? Object.keys(personaRevisions) : ["1.20260927.13.2"]) {
    const query = `scenario=${config.id}&host=${host}&coverage=${coverage}&personaVersion=${personaVersion}`;
    const resolved = resolveExperiment(config, query);
    const result = await runExperiment(app, {
      scenario: config.id,
      host,
      coverage,
      personaVersion
    });
    const active = host === "extracted";
    const window = applicationWindow(app);
    const activeRenderers = [window.testSourceHost, window.testSourcePersona, window.testSourceFeedback].filter(Boolean).map(mounted => mounted.renderer);
    const renderers = {
      mounted: activeRenderers.length,
      distinct: new Set(activeRenderers).size
    };
    expect(renderers, "The documented host/Persona/Feedback renderer roles use distinct active renderer instances").toStrictEqual({
      mounted: 1 + config.order.length,
      distinct: 1 + config.order.length
    });
    expect(result.simulation.host.contract).toBe("production-extraction");
    expect(result.simulation.host.shouldInstall).toBe(active);
    expect(result.simulation.host.installed).toBe(active);
    expect(result.simulation.host.renderer).toBe(active ? "noop" : "dom");
    expect(window.testSourcePatchedDuringHostMount, "The host installs its own patch in its layout effect, not later in the harness").toBe(active);
    expect(result.policy).toBe(active ? config.policy : "off");
    expect(result.feedbackConfig.raw).toBe(true);
    expect(result.feedbackConfig.salt).toBe(true);
    expect(result.feedbackConfig.marker).toBe(true);
    expect(result.hostRuntimeCalls === 0).toBe(active);
    expect(result.hostEvidence.avatarBackground.changed).toBe(false);
    if (!active) expect(result.events.every(event => !event.blocked)).toBeTruthy();
    if (config.seed) {
      const seedAttempt = result.events.find(event => event.actor === "unrelated");
      expect(seedAttempt, "The source lab observes the seed renderer under the already-mounted host contract").toBeTruthy();
      expect(seedAttempt.blocked).toBe(active);
    }
    expect(result.simulation.personaRevision).toBe(resolved.personaRevision);
    expect(result.simulation.persona).toBe(resolved.personaProfile);
    const personaBlocked = Boolean(active && resolved.personaProfile === "historical" && (config.seed || config.order[0] === "feedback"));
    const feedbackBlocked = active && config.policy === "master";
    for (const [actor, evidence] of Object.entries(result.actors)) {
      const attempts = result.events.filter(event => event.actor === actor && event.bucket);
      const blocked = actor === "persona" ? personaBlocked : feedbackBlocked;
      const width = attempts.find(event => event.rule.includes("width:137px"));
      expect(width.blocked).toBe(blocked);
      expect(width.present).toBe(!blocked);
      expect(evidence.cache, "Blocked rules remain cached in the actual renderer").toContain(width.rule);
      if (blocked) expect(attempts.filter(event => event.blocked).length).toBeGreaterThan(100);
      if (actor === "feedback") {
        expect(attempts.every(event => event.feedbackPrefix)).toBeTruthy();
        expect(evidence.rendererSalt).toBe("demo-feedback");
      }
    }
    if (resolved.personaProfile !== "historical") {
      expect(result.actors.persona.sheets.every(sheet => sheet.creator === "persona"), "The guarded profiles reject incompatible host/form destinations").toBeTruthy();
    }
    if (config.order[0] === "persona" && config.order.includes("feedback")) {
      expect(result.actors.persona.sheets.some(sheet => sheet.sharedWith.includes("feedback"))).toBeTruthy();
      expect(result.actors.feedback.borrowedPermission).toBe(0);
    }
    await assertPresentedEvidence(app, result);
    await expect.element(app.getByCSS("[data-host-contract]")).toHaveTextContent(/Host-owned production-extraction contract/);
    paired.push(result);
  }
  const comparisons = assertCurrentMainComparisons(paired, [config], [host], [coverage]);
  task.meta.evidence = {
    kind: "source",
    results: paired,
    comparisons
  };
});
test("renderer ownership, cache lifetime, and host disposal", async ({
  signal
}) => {
  const app = await openApplication({
    signal
  });
  const url = location.origin;
  await assertSourceLifecycles(app, url);
});
test("unified gallery, host selection, and legacy redirects", async ({
  signal
}) => {
  const app = await openApplication({
    signal
  });
  const url = location.origin;
  await navigateApplication(app, `${url}/?coverage=minimal`);
  await expect.poll(() => applicationWindow(app).document.querySelector('nav a[aria-current="page"]').getAttribute("href")).toBe("/?coverage=minimal");
  await expect.poll(() => Array.from(applicationWindow(app).document.querySelectorAll("nav a")).length).toBe(2);
  await expect.poll(() => Array.from(applicationWindow(app).document.querySelectorAll('[data-scenario-contract="source-aligned"]')).length).toBe(sourceExperiments.length);
  await expect.poll(() => Array.from(applicationWindow(app).document.querySelectorAll('[data-scenario-contract="diagnostic"]')).length).toBe(7);
  await expect.poll(() => Array.from(applicationWindow(app).document.querySelectorAll('[data-scenario-kind="main"]')).length).toBe(0);
  await expect.poll(() => Array.from(applicationWindow(app).document.querySelectorAll('[data-scenario-kind="release"]')).length).toBe(5);
  await expect.poll(() => Array.from(applicationWindow(app).document.querySelectorAll('[data-scenario-kind="proposal"]')).length).toBe(1);
  await app.getByCSS(".explanatory-controls > summary").click();
  for (const config of sourceExperiments) {
    await waitForElement(() => applicationWindow(applicationFrame(app, `#${config.id} iframe`)).document.querySelector("[data-host-contract]"));
  }
  await app.getByLabelText("Host CSS", {
    exact: true
  }).selectOptions("runtime");
  await waitForApplicationURL(app, `${url}/?coverage=minimal&host=runtime`);
  await waitForElement(() => applicationWindow(applicationFrame(app, "#raw-marked-first iframe")).document.querySelector("[data-host-contract]"));
  await expect.poll(() => applicationWindow(applicationFrame(app, "#raw-marked-first iframe")).threeActorResult.simulation.host.shouldInstall).toBe(false);
  await navigateApplication(app, `${url}/source?coverage=minimal#source-owner-guard`);
  await expect.poll(() => applicationWindow(app).location.href).toBe(`${url}/?coverage=minimal#owner-guard`);
  await expect.poll(() => visible(applicationWindow(app).document.querySelector("#owner-guard"))).toBe(true);
  await navigateApplication(app, `${url}/?scenario=marker-guard&host=extracted&coverage=minimal`);
  await expect.poll(() => {
    const window = applicationWindow(app);
    return window.threeActorResult;
  }).toBeTruthy();
  await expect.poll(() => applicationWindow(app).location.href).toBe(`${url}/?scenario=raw-marked-first&host=extracted&coverage=minimal&personaVersion=main-2026-10-16`);
  await expect.poll(() => applicationWindow(app).threeActorResult.simulation.persona).toBe("marker-guard");
  await navigateApplication(app, `${url}/#marker-guard`);
  await expect.poll(() => applicationWindow(app).location.href).toBe(`${url}/?personaVersion=main-2026-10-16#raw-marked-first`);
  await expect.poll(() => visible(applicationWindow(app).document.querySelector("#raw-marked-first"))).toBe(true);
  await navigateApplication(app, `${url}/source?scenario=source-feedback-first&host=runtime&coverage=minimal`);
  await expect.poll(() => {
    const window = applicationWindow(app);
    return window.threeActorResult;
  }).toBeTruthy();
  await expect.poll(() => applicationWindow(app).location.href).toBe(`${url}/?scenario=raw-marked-first&host=runtime&coverage=minimal`);
  await expect.poll(() => applicationWindow(app).threeActorResult.simulation.host.shouldInstall).toBe(false);
  await navigateApplication(app, `${url}/three-actors?scenario=persona-alone&coverage=minimal`);
  await expect.poll(() => {
    const window = applicationWindow(app);
    return window.threeActorResult;
  }).toBeTruthy();
  await expect.poll(() => applicationWindow(app).location.href).toBe(`${url}/?scenario=persona-alone&coverage=minimal`);
});
