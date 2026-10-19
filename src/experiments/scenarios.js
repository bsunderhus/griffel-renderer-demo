const sourceContract = {
  hostContract: "production-extraction",
  feedbackProfile: "inspected",
  personaRevision: "selected",
};

export const hostPolicies = {
  master: "Sheet-only (baseline)",
  "feedback-exception": "Feedback prefix exception (candidate)",
};

export const personaRevisions = {
  "1.20260927.13.2": { profile: "historical", kind: "release", label: "Persona 1.20260927.13.2" },
  "main-2026-10-16": { profile: "marker-guard", kind: "main", label: "Persona main snapshot (2026-10-16)" },
};

const load = actor => ({ action: "load", actor });
const mount = actor => ({ action: "mount", actor });
const unmount = actor => ({ action: "unmount", actor });
const arrival = actor => [load(actor), mount(actor)];

export const baselineExperiments = [
  { id: "persona-alone", order: ["persona"], schedule: arrival("persona") },
  { id: "feedback-alone", order: ["feedback"], schedule: arrival("feedback") },
  { id: "raw-marked-first", order: ["feedback", "persona"],
    schedule: [...arrival("feedback"), ...arrival("persona")] },
  { id: "persona-first-raw", order: ["persona", "feedback"],
    schedule: [...arrival("persona"), ...arrival("feedback")] },
  { id: "feedback-preloaded", order: ["persona", "feedback"],
    schedule: [load("feedback"), ...arrival("persona"), mount("feedback")] },
  { id: "both-preloaded", order: ["feedback", "persona"],
    schedule: [load("feedback"), load("persona"), mount("feedback"), mount("persona")] },
  { id: "feedback-reopened", order: ["persona", "feedback"],
    schedule: [...arrival("persona"), ...arrival("feedback"), unmount("feedback"), mount("feedback")] },
  { id: "persona-remounted", order: ["feedback", "persona"],
    schedule: [...arrival("feedback"), ...arrival("persona"), unmount("persona"), mount("persona")] },
].map(config => ({ ...sourceContract, ...config, kind: "baseline", policy: "selected" }));

export const experiments = baselineExperiments;
export const sourceExperiments = baselineExperiments;

export const scenarioAliases = {
  "feedback-first": "raw-marked-first",
  "persona-first": "persona-first-raw",
  "master-rejects-marker": "raw-marked-first",
  "source-persona-alone": "persona-alone",
  "source-feedback-first": "raw-marked-first",
  "source-persona-first": "persona-first-raw",
  "source-prefix-unrecognized": "raw-marked-first",
  "source-marker-guard": "raw-marked-first",
  "marker-guard": "raw-marked-first",
  "historical-feedback-first": "raw-marked-first",
};

export const scenarioAliasPolicies = {
  "feedback-first": "master",
  "persona-first": "master",
  "master-rejects-marker": "master",
  "source-prefix-unrecognized": "master",
  "source-feedback-first": "feedback-exception",
  "source-persona-first": "feedback-exception",
  "source-marker-guard": "feedback-exception",
  "marker-guard": "feedback-exception",
  "historical-feedback-first": "feedback-exception",
};

export const scenarioAliasVersions = {
  "feedback-first": "1.20260927.13.2",
  "persona-first": "1.20260927.13.2",
  "source-marker-guard": "main-2026-10-16",
  "marker-guard": "main-2026-10-16",
  "historical-feedback-first": "1.20260927.13.2",
};
