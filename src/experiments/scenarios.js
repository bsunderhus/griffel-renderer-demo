const sourceContract = {
  hostContract: "production-extraction",
  feedbackProfile: "inspected",
  personaRevision: "selected",
};
const historicalControl = { personaProfile: "historical" };

export const personaRevisions = {
  "1.20260927.13.2": { profile: "historical", kind: "release", label: "Persona 1.20260927.13.2" },
  "main-2026-10-16": { profile: "marker-guard", kind: "main", label: "Persona main snapshot (2026-10-16)" },
};

export const experiments = [
  { ...sourceContract, id: "persona-alone", policy: "master", order: ["persona"] },
  { ...sourceContract, id: "unmarked-d-first", policy: "master", seed: true, order: ["persona"] },
  { ...sourceContract, id: "raw-marked-first", policy: "feedback-exception", order: ["feedback", "persona"] },
  { ...sourceContract, id: "persona-first-raw", policy: "feedback-exception", order: ["persona", "feedback"] },
  { ...sourceContract, id: "master-rejects-marker", policy: "master", order: ["feedback", "persona"] },
  { ...sourceContract, id: "owner-guard", personaRevision: null, policy: "feedback-exception",
    personaProfile: "owner-guard", order: ["feedback", "persona"] },
  { ...historicalControl, id: "feedback-first", policy: "master", order: ["feedback", "persona"] },
  { ...historicalControl, id: "persona-first", policy: "master", order: ["persona", "feedback"] },
  { ...historicalControl, id: "precompiled-salted", policy: "feedback-exception",
    salt: true, marker: true, order: ["feedback", "persona"] },
  { ...historicalControl, id: "no-policy", policy: "off", order: ["feedback", "persona"] },
  { ...historicalControl, id: "raw-unsalted", policy: "feedback-exception",
    raw: true, marker: true, order: ["feedback", "persona"] },
  { ...historicalControl, id: "host-collision", policy: "off", raw: true, order: ["feedback", "persona"] },
  { ...historicalControl, id: "host-collision-salted", policy: "off", raw: true, salt: true, order: ["feedback", "persona"] },
];

export const sourceExperiments = experiments.filter(config => config.hostContract === "production-extraction");

export const scenarioAliases = {
  "source-persona-alone": "persona-alone",
  "source-unmarked-first": "unmarked-d-first",
  "source-feedback-first": "raw-marked-first",
  "source-persona-first": "persona-first-raw",
  "source-prefix-unrecognized": "master-rejects-marker",
  "source-marker-guard": "raw-marked-first",
  "source-owner-guard": "owner-guard",
  "marker-guard": "raw-marked-first",
  "historical-unmarked-first": "unmarked-d-first",
  "historical-feedback-first": "raw-marked-first",
};

export const scenarioAliasVersions = {
  "source-marker-guard": "main-2026-10-16",
  "marker-guard": "main-2026-10-16",
  "historical-unmarked-first": "1.20260927.13.2",
  "historical-feedback-first": "1.20260927.13.2",
};
