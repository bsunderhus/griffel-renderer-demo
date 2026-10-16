import { inspectedFeedbackOptions } from "../feedback/profile.js";

const HOST_BUILDS = {
  extracted: { minimal: ["/host-extracted.js", "/griffel.css"], shared: ["/shared/host-extracted.js", "/shared/griffel.css"] },
  runtime: { minimal: ["/host-runtime.js"], shared: ["/shared/host-runtime.js"] },
};

export function resolveHostSettings(search) {
  const params = new URLSearchParams(search);
  const hostMode = params.get("host") || "extracted";
  const coverage = params.get("coverage") || "shared";
  if (!Object.hasOwn(HOST_BUILDS, hostMode)) throw new Error(`Unknown host mode: ${hostMode}`);
  if (!Object.hasOwn(HOST_BUILDS[hostMode], coverage)) throw new Error(`Unknown host coverage: ${coverage}`);
  const [script, stylesheet] = HOST_BUILDS[hostMode][coverage];
  return { hostMode, coverage, script, stylesheet, extracted: hostMode === "extracted",
    walkthrough: params.get("view") === "walkthrough" };
}

export function resolveExperiment(config, search) {
  if (!["master", "feedback-exception", "off"].includes(config.policy)) {
    throw new Error(`Unknown host policy: ${config.policy}`);
  }
  if (!Array.isArray(config.order) || !config.order.length || new Set(config.order).size !== config.order.length ||
      config.order.some(actor => !["persona", "feedback"].includes(actor))) {
    throw new Error(`Invalid integration order for ${config.id}`);
  }
  const hostContract = config.hostContract || "diagnostic";
  const personaProfile = config.personaProfile || "historical";
  const feedbackProfile = config.feedbackProfile || "control";
  if (!["diagnostic", "production-extraction"].includes(hostContract)) throw new Error(`Unknown host contract: ${hostContract}`);
  if (!["historical", "marker-guard", "owner-guard"].includes(personaProfile)) {
    throw new Error(`Unknown Persona renderer profile: ${personaProfile}`);
  }
  if (!["control", "inspected"].includes(feedbackProfile)) throw new Error(`Unknown Feedback renderer profile: ${feedbackProfile}`);
  return {
    ...resolveHostSettings(search), id: config.id, policy: config.policy, order: config.order,
    hostContract, personaProfile, feedbackProfile,
    seed: Boolean(config.seed),
    feedback: feedbackProfile === "inspected" ? inspectedFeedbackOptions :
      { raw: Boolean(config.raw), salt: Boolean(config.salt), marker: Boolean(config.marker) },
  };
}
