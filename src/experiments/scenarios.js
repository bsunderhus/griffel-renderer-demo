const sourceContract = {
  hostContract: "production-extraction",
  feedbackProfile: "inspected",
  personaProfile: "historical",
};

export const experiments = [
  { ...sourceContract, id: "persona-alone", policy: "master", order: ["persona"] },
  { ...sourceContract, id: "unmarked-d-first", policy: "master", seed: true, order: ["persona"] },
  { ...sourceContract, id: "raw-marked-first", policy: "feedback-exception", order: ["feedback", "persona"] },
  { ...sourceContract, id: "persona-first-raw", policy: "feedback-exception", order: ["persona", "feedback"] },
  { ...sourceContract, id: "master-rejects-marker", policy: "master", order: ["feedback", "persona"] },
  { ...sourceContract, id: "marker-guard", policy: "feedback-exception",
    personaProfile: "marker-guard", order: ["feedback", "persona"] },
  { ...sourceContract, id: "owner-guard", policy: "feedback-exception",
    personaProfile: "owner-guard", order: ["feedback", "persona"] },
  { id: "feedback-first", policy: "master", order: ["feedback", "persona"] },
  { id: "persona-first", policy: "master", order: ["persona", "feedback"] },
  { id: "precompiled-salted", policy: "feedback-exception",
    salt: true, marker: true, order: ["feedback", "persona"] },
  { id: "no-policy", policy: "off", order: ["feedback", "persona"] },
  { id: "raw-unsalted", policy: "feedback-exception",
    raw: true, marker: true, order: ["feedback", "persona"] },
  { id: "host-collision", policy: "off", raw: true, order: ["feedback", "persona"] },
  { id: "host-collision-salted", policy: "off", raw: true, salt: true, order: ["feedback", "persona"] },
];

export const sourceExperiments = experiments.filter(config => config.hostContract === "production-extraction");

export const sourceScenarioAliases = {
  "source-persona-alone": "persona-alone",
  "source-unmarked-first": "unmarked-d-first",
  "source-feedback-first": "raw-marked-first",
  "source-persona-first": "persona-first-raw",
  "source-prefix-unrecognized": "master-rejects-marker",
  "source-marker-guard": "marker-guard",
  "source-owner-guard": "owner-guard",
};
