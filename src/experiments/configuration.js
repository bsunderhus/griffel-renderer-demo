import { inspectedFeedbackOptions } from "../feedback/profile.js";
import { hostPolicies, personaRevisions } from "./scenarios.js";

const HOST_BUILDS = {
  extracted: { minimal: ["/host-extracted.js", "/griffel.css"], shared: ["/shared/host-extracted.js", "/shared/griffel.css"] },
  runtime: { minimal: ["/host-runtime.js"], shared: ["/shared/host-runtime.js"] },
};

export function resolveHostSettings(search) {
  const params = new URLSearchParams(search);
  const hostMode = params.get("host") || "extracted";
  const coverage = params.get("coverage") || "shared";
  const personaVersion = params.get("personaVersion") || "1.20260927.13.2";
  const hostPolicy = params.get("hostPolicy") || "master";
  if (!Object.hasOwn(HOST_BUILDS, hostMode)) throw new Error(`Unknown host mode: ${hostMode}`);
  if (!Object.hasOwn(HOST_BUILDS[hostMode], coverage)) throw new Error(`Unknown host coverage: ${coverage}`);
  if (!Object.hasOwn(personaRevisions, personaVersion)) throw new Error(`Unknown Persona version: ${personaVersion}`);
  if (!Object.hasOwn(hostPolicies, hostPolicy)) throw new Error(`Unknown host filter revision: ${hostPolicy}`);
  const [script, stylesheet] = HOST_BUILDS[hostMode][coverage];
  return { hostMode, coverage, personaVersion, hostPolicy, script, stylesheet, extracted: hostMode === "extracted",
    walkthrough: params.get("view") === "walkthrough" };
}

export function resolveExperiment(config, search) {
  if (!["selected", "master", "feedback-exception", "off"].includes(config.policy)) {
    throw new Error(`Unknown host policy: ${config.policy}`);
  }
  if (!Array.isArray(config.order) || !config.order.length || new Set(config.order).size !== config.order.length ||
      config.order.some(actor => !["persona", "feedback"].includes(actor))) {
    throw new Error(`Invalid integration order for ${config.id}`);
  }
  const hostContract = config.hostContract || "diagnostic";
  const hostSettings = resolveHostSettings(search);
  const policy = config.policy === "selected" ? hostSettings.hostPolicy : config.policy;
  const personaRevision = config.personaRevision === "selected" ?
    hostSettings.personaVersion : config.personaRevision ?? null;
  const personaProfile = config.personaProfile || personaRevisions[personaRevision]?.profile || "marker-guard";
  const feedbackProfile = config.feedbackProfile || "control";
  if (!["diagnostic", "production-extraction"].includes(hostContract)) throw new Error(`Unknown host contract: ${hostContract}`);
  if (!["historical", "marker-guard", "owner-guard"].includes(personaProfile)) {
    throw new Error(`Unknown Persona renderer profile: ${personaProfile}`);
  }
  if (personaRevision != null &&
      (!Object.hasOwn(personaRevisions, personaRevision) ||
        personaRevisions[personaRevision].profile !== personaProfile)) {
    throw new Error(`Unknown or incompatible Persona revision: ${personaRevision}`);
  }
  if (!["control", "inspected"].includes(feedbackProfile)) throw new Error(`Unknown Feedback renderer profile: ${feedbackProfile}`);
  const schedule = config.schedule === undefined ? config.order.flatMap(actor => [
    { action: "load", actor }, { action: "mount", actor },
  ]) : config.schedule;
  validateSchedule(schedule, config.order);
  if (config.kind === "baseline" && (hostContract !== "production-extraction" ||
      feedbackProfile !== "inspected" || config.personaRevision !== "selected" ||
      config.personaProfile && config.personaProfile !== personaRevisions[personaRevision].profile ||
      config.seed || config.policy !== "selected" ||
      ["raw", "salt", "marker"].some(key => Object.hasOwn(config, key)))) {
    throw new Error(`Baseline actors cannot be overridden: ${config.id}`);
  }
  return {
    ...hostSettings, id: config.id, kind: config.kind || "diagnostic", policy, order: config.order, schedule,
    hostContract, personaProfile, personaRevision, feedbackProfile,
    seed: Boolean(config.seed),
    feedback: feedbackProfile === "inspected" ? inspectedFeedbackOptions :
      { raw: Boolean(config.raw), salt: Boolean(config.salt), marker: Boolean(config.marker) },
  };
}

export function validateSchedule(schedule, order) {
  if (!Array.isArray(schedule) || !schedule.length) throw new Error("Schedule must contain events");
  const loaded = new Set();
  const mounted = new Set();
  const arrivals = [];
  for (const event of schedule) {
    if (!event || !order.includes(event.actor) || !["load", "mount", "unmount"].includes(event.action)) {
      throw new Error("Unknown schedule event");
    }
    if (event.action === "load") {
      if (loaded.has(event.actor)) throw new Error(`Actor script loaded twice: ${event.actor}`);
      loaded.add(event.actor);
    } else if (event.action === "mount") {
      if (!loaded.has(event.actor) || mounted.has(event.actor)) throw new Error(`Invalid mount: ${event.actor}`);
      if (!arrivals.includes(event.actor)) arrivals.push(event.actor);
      mounted.add(event.actor);
    } else {
      if (!mounted.delete(event.actor)) throw new Error(`Invalid unmount: ${event.actor}`);
    }
  }
  if (order.some((actor, index) => arrivals[index] !== actor || !mounted.has(actor))) {
    throw new Error("Schedule must follow first-mount order and finish with all actors mounted");
  }
}
