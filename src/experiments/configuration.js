import { inspectedFeedbackOptions } from "../feedback/profile.js";
import { hostPolicies, personaRevisions } from "./scenarios.js";

export const SOLUTION_ROUTE = "proposal";

const HOST_BUILDS = {
  extracted: {
    minimal: ["/host-extracted.js", "/griffel.css"],
    shared: ["/shared/host-extracted.js", "/shared/griffel.css"],
  },
  runtime: { minimal: ["/host-runtime.js"], shared: ["/shared/host-runtime.js"] },
};

export function resolveHostSettings(search, solution = "baseline") {
  const params = new URLSearchParams(search);
  const hostMode = params.get("host") || "extracted";
  const coverage = params.get("coverage") || "shared";
  const personaVersion =
    solution === "baseline" ? params.get("personaVersion") || "1.20260927.13.2" : null;
  const selectedHostPolicy = params.get("hostPolicy") || "master";
  if (!Object.hasOwn(HOST_BUILDS, hostMode)) {
    throw new Error(`Unknown host mode: ${hostMode}`);
  }
  if (!Object.hasOwn(HOST_BUILDS[hostMode], coverage)) {
    throw new Error(`Unknown host coverage: ${coverage}`);
  }
  if (!["baseline", "prefix-salted"].includes(solution)) {
    throw new Error(`Unknown solution experiment: ${solution}`);
  }
  if (solution === "prefix-salted" && (params.has("personaVersion") || params.has("hostPolicy"))) {
    throw new Error("The proposal playground does not accept baseline-only settings");
  }
  if (solution === "baseline" && !Object.hasOwn(personaRevisions, personaVersion)) {
    throw new Error(`Unknown Persona version: ${personaVersion}`);
  }
  if (solution === "baseline" && !Object.hasOwn(hostPolicies, selectedHostPolicy)) {
    throw new Error(`Unknown host filter revision: ${selectedHostPolicy}`);
  }
  const [script, stylesheet] = HOST_BUILDS[hostMode][coverage];
  const hostPolicy = solution === "prefix-salted" ? "integration-prefixes" : selectedHostPolicy;
  return {
    hostMode,
    coverage,
    personaVersion,
    hostPolicy,
    selectedHostPolicy,
    solution,
    personaProfile:
      solution === "baseline" ? personaRevisions[personaVersion].profile : "prefix-salted",
    personaLabel:
      solution === "baseline"
        ? personaRevisions[personaVersion].label
        : "Persona prefix + salt proposal",
    script,
    stylesheet,
    extracted: hostMode === "extracted",
    walkthrough: params.get("view") === "walkthrough",
  };
}

export function resolveExperiment(config, search, solution = "baseline") {
  if (
    !Array.isArray(config.order) ||
    !config.order.length ||
    new Set(config.order).size !== config.order.length ||
    config.order.some((actor) => !["persona", "feedback"].includes(actor))
  ) {
    throw new Error(`Invalid integration order for ${config.id}`);
  }
  const hostSettings = resolveHostSettings(search, solution);
  const personaRevision = hostSettings.solution === "baseline" ? hostSettings.personaVersion : null;
  const personaProfile = hostSettings.personaProfile;
  if (
    config.kind !== "baseline" ||
    config.hostContract !== "production-extraction" ||
    config.feedbackProfile !== "inspected" ||
    config.personaRevision !== "selected" ||
    config.policy !== "selected" ||
    Object.hasOwn(config, "personaProfile") ||
    ["raw", "salt", "marker", "seed", "diagnostic"].some((key) => Object.hasOwn(config, key))
  ) {
    throw new Error(`Baseline actors cannot be overridden: ${config.id}`);
  }
  validateSchedule(config.schedule, config.order);
  return {
    ...hostSettings,
    id: config.id,
    kind: "baseline",
    solution: hostSettings.solution,
    policy: hostSettings.hostPolicy,
    order: config.order,
    schedule: config.schedule,
    hostContract: "production-extraction",
    personaProfile,
    personaRevision,
    feedbackProfile: "inspected",
    feedback: inspectedFeedbackOptions,
  };
}

export function validateSchedule(schedule, order) {
  if (!Array.isArray(schedule) || !schedule.length) {
    throw new Error("Schedule must contain events");
  }
  const loaded = new Set();
  const mounted = new Set();
  const arrivals = [];
  for (const event of schedule) {
    if (
      !event ||
      !order.includes(event.actor) ||
      !["load", "mount", "unmount"].includes(event.action)
    ) {
      throw new Error("Unknown schedule event");
    }
    if (event.action === "load") {
      if (loaded.has(event.actor)) {
        throw new Error(`Actor script loaded twice: ${event.actor}`);
      }
      loaded.add(event.actor);
    } else if (event.action === "mount") {
      if (!loaded.has(event.actor) || mounted.has(event.actor)) {
        throw new Error(`Invalid mount: ${event.actor}`);
      }
      if (!arrivals.includes(event.actor)) {
        arrivals.push(event.actor);
      }
      mounted.add(event.actor);
    } else {
      if (!mounted.delete(event.actor)) {
        throw new Error(`Invalid unmount: ${event.actor}`);
      }
    }
  }
  if (order.some((actor, index) => arrivals[index] !== actor || !mounted.has(actor))) {
    throw new Error("Schedule must follow first-mount order and finish with all actors mounted");
  }
}
