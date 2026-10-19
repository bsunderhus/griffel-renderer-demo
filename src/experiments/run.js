import { createObservation } from "../evidence/observation.js";
import { captureHostBaseline } from "../evidence/snapshot.js";
import { createEvidenceController } from "../evidence/controller.js";
import { resolveExperiment } from "./configuration.js";
import { prepareExperiment } from "./layout.js";
import { integrations, loadIntegration, mountHost, mountIntegration } from "./participants.js";

export async function runThreeActorCase(config) {
  const settings = resolveExperiment(config, location.search);
  await prepareExperiment(settings);
  const host = await mountHost(settings, document.getElementById("host-mount"));
  const observation = createObservation(document, host.stylesheet);
  const baseline = captureHostBaseline(document, observation);
  const hostBuckets = document.querySelectorAll("[data-make-styles-bucket]").length;
  const actors = {};
  const execution = [];
  const previousRenderers = new Map();
  const mountCounts = new Map();
  const rendererIds = new Map([[host.renderer, "host-1"]]);
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
    observation.connectHost(host);
    for (const { action, actor } of settings.schedule) {
      if (action === "load") {
        const script = await loadIntegration(actor);
        execution.push({ action, actor, script });
      } else if (action === "unmount") {
        actors[actor].unmount();
        delete actors[actor];
        execution.push({ action, actor });
      } else {
        const mountIndex = (mountCounts.get(actor) || 0) + 1;
        mountCounts.set(actor, mountIndex);
        const mounted = mountIntegration(actor, settings, document.getElementById(`${actor}-mount`), observation, mountIndex);
        actors[actor] = mounted;
        const previous = previousRenderers.get(actor);
        if (!rendererIds.has(mounted.renderer)) rendererIds.set(mounted.renderer, `${actor}-${mountIndex}`);
        execution.push({ action, actor, mountIndex, renderer: rendererIds.get(mounted.renderer),
          reusesPreviousRenderer: previous ? previous === mounted.renderer : null });
        previousRenderers.set(actor, mounted.renderer);
      }
    }
    const actorEvidence = Object.fromEntries(Object.entries(actors).map(([actor, { renderer }]) => [
      actor, { rendererSalt: renderer.classNameHashSalt || null },
    ]));
    const result = {
      id: settings.id, hostMode: settings.hostMode, coverage: settings.coverage, policy: settings.policy, order: settings.order,
      kind: settings.kind, execution,
      configuration: {
        host: { script: settings.script, stylesheet: settings.stylesheet || null, contract: settings.hostContract,
          requestedPolicy: settings.policy },
        persona: { script: integrations.persona.script(), profile: settings.personaProfile, revision: settings.personaRevision },
        feedback: { script: integrations.feedback.script(), profile: settings.feedbackProfile,
          ...settings.feedback },
        workload: "canonical",
      },
      hostRuntimeCalls: host.runtimeCalls(), hostBuckets, actors: actorEvidence, events: observation.events,
      staticCSS: host.stylesheet ? Array.from(host.stylesheet.sheet.cssRules, rule => rule.cssText) : [],
    };
    result.simulation = {
      host: host.policyState(), persona: settings.personaProfile, personaRevision: settings.personaRevision,
      feedback: settings.feedbackProfile,
      scope: "Sanitized renderer/insertion contracts, not a full product or incident-time deployment.",
    };
    result.policy = host.contract.effectivePolicy;
    controller = createEvidenceController({ doc: document, result, actors, observation, baseline });
    window.threeActorResult = result;
    window.addEventListener("pagehide", dispose);
    return { result, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
