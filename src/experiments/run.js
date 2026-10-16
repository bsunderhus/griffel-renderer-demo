import { feedbackProfile } from "../feedback/profile.js";
import { createObservation } from "../evidence/observation.js";
import { captureHostBaseline } from "../evidence/snapshot.js";
import { createEvidenceController } from "../evidence/controller.js";
import { measure } from "../evidence/legacy-diagnostics.js";
import { resolveExperiment } from "./configuration.js";
import { prepareExperiment } from "./layout.js";
import { mountHost, mountIntegration } from "./participants.js";
import { createUnmarkedSeed } from "./seed.js";

export async function runThreeActorCase(config) {
  const settings = resolveExperiment(config, location.search);
  await prepareExperiment(settings);
  const host = await mountHost(settings, document.getElementById("host-mount"));
  const observation = createObservation(document, host.stylesheet);
  const baseline = captureHostBaseline(document, observation);
  const hostBuckets = document.querySelectorAll("[data-make-styles-bucket]").length;
  const stages = [{ phase: "host", host: measure("host"), persona: null, feedback: null }];
  const actors = {};
  let controller;
  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    controller?.dispose();
    observation.dispose();
    for (const actor of Object.values(actors).reverse()) actor.unmount();
    host.dispose();
    window.removeEventListener("pagehide", dispose);
  }
  try {
    if (settings.hostContract === "production-extraction") observation.connectHost(host);
    const seed = settings.seed ? observation.withActor("unrelated", () => createUnmarkedSeed(document)) : null;
    if (seed) observation.registerSheets("unrelated");
    host.beginIntegrations();
    observation.connectHost(host);
    for (const actor of settings.order) {
      actors[actor] = await mountIntegration(actor, settings, document.getElementById(`${actor}-mount`), observation);
      stages.push({ phase: actor, host: measure("host"), persona: measure("persona"), feedback: measure("feedback") });
    }
    const actorEvidence = Object.fromEntries(Object.entries(actors).map(([actor, { renderer }]) => [
      actor, { measured: measure(actor), rendererSalt: renderer.classNameHashSalt || null },
    ]));
    const result = {
      id: settings.id, hostMode: settings.hostMode, coverage: settings.coverage, policy: settings.policy, order: settings.order,
      feedbackConfig: {
        ...settings.feedback,
        usesDemoProfile: settings.feedback.raw && settings.feedback.salt && settings.feedback.marker,
        demoProfile: feedbackProfile,
      },
      hostRuntimeCalls: host.runtimeCalls(), hostBuckets, stages, actors: actorEvidence, events: observation.events,
      staticCSS: host.stylesheet ? Array.from(host.stylesheet.sheet.cssRules, rule => rule.cssText) : [],
      sharedFeedbackClasses: actorEvidence.feedback ? stages[0].host.avatar.classes.filter(name =>
        !name.startsWith("fui-") && actorEvidence.feedback.measured.avatar.classes.includes(name)) : [],
      sheetOrder: Array.from(document.head.querySelectorAll('link[rel="stylesheet"], style[data-make-styles-bucket]'),
        element => element.tagName === "LINK" ? "extracted host CSS" :
          `${element.dataset.makeStylesBucket}/${element.dataset.priority}: ${observation.creators.get(element)}`),
    };
    if (settings.hostContract === "production-extraction") {
      result.simulation = {
        host: host.policyState(), persona: settings.personaProfile,
        feedback: settings.feedbackProfile,
        scope: "Sanitized renderer/insertion contracts, not a full product or incident-time deployment.",
      };
      result.policy = host.contract.effectivePolicy;
    }
    controller = createEvidenceController({ doc: document, result, actors, observation, baseline, seed }, config);
    window.threeActorResult = result;
    window.addEventListener("pagehide", dispose);
    return { result, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
