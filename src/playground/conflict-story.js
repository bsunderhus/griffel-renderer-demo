// Declarative script for the documentation explainer. Every chapter names the live
// configuration it summarizes; tests replay that configuration and compare the final
// visual state with recorded insertion, ownership, and permission evidence.

export const GATES = {
  "sheet-only": { short: ["Sheet-only", "filter"], label: "Sheet-only filter", rule: "Approved sheets only", policy: "master", installed: true },
  prefix: { short: ["Prefix", "exception"], label: "Prefix exception", rule: "Approved sheets or Feedback prefix", policy: "feedback-exception", installed: true },
  off: { short: ["No filter", "installed"], label: "No filter installed", rule: "Every rule reaches the browser", policy: "off", installed: false },
};

export const ACTORS = ["host", "persona", "feedback"];

export const conflictChapters = [
  {
    id: "release-feedback-first",
    title: "Feedback first, pinned release",
    question: "Why does Persona lose its rules when Feedback arrives first?",
    scenario: "raw-marked-first",
    host: "extracted",
    personaVersion: "1.20260927.13.2",
    renderers: { host: "No-op renderer", persona: "Pinned release", feedback: "Inspected profile" },
    control: "Uses the unmerged prefix-exception host revision.",
    takeaway: "Same sheet, different outcomes: Feedback passes by its prefix; Persona is rejected because its destination is unmarked.",
    steps: [
      { caption: "The production host already ships extracted CSS. This proposed filter permits runtime rules in approved sheets or rules starting with Feedback's prefix.",
        events: [{ type: "gate", mode: "prefix" }] },
      { caption: "Feedback mounts first. Its separately bundled renderer creates the default bucket without requesting the approval marker.",
        events: [{ type: "create", actor: "feedback", sheet: "feedback-d", marked: false }] },
      { caption: "Feedback's rule starts with the accepted prefix. Its rule reaches native insertion, but that does not add an approval marker to the sheet.",
        events: [{ type: "attempt", actor: "feedback", sheet: "feedback-d", prefix: true, verdict: "inserted" }] },
      { caption: "Persona mounts. Its release renderer looks for existing buckets in the document and adopts Feedback's unmarked sheet instead of creating an approved one.",
        events: [{ type: "adopt", actor: "persona", sheet: "feedback-d" }] },
      { caption: "Persona's scoped rule has no Feedback prefix, and its destination is unmarked. The host skips native insertion. The cached entry can suppress a later attempt by that renderer, even though the rule is absent from CSSOM.",
        events: [{ type: "attempt", actor: "persona", sheet: "feedback-d", prefix: false, verdict: "blocked" }] },
    ],
  },
  {
    id: "main-guard",
    title: "Feedback first, main guard",
    question: "What does the main-branch marker guard change?",
    scenario: "raw-marked-first",
    host: "extracted",
    personaVersion: "main-2026-10-16",
    renderers: { host: "No-op renderer", persona: "Main marker guard", feedback: "Inspected profile" },
    control: "Uses the same unmerged prefix-exception host revision as the first chapter.",
    takeaway: "Both rules now insert. Persona changed its destination; it did not relabel Feedback's sheet or change the host's policy.",
    steps: [
      { caption: "Same host, same arrival order: the prefix-aware filter is installed before either integration mounts. Only the Persona version changes.",
        events: [{ type: "gate", mode: "prefix" }] },
      { caption: "Feedback creates its unmarked default bucket and its prefixed rule inserts, exactly as before.",
        events: [
          { type: "create", actor: "feedback", sheet: "feedback-d", marked: false },
          { type: "attempt", actor: "feedback", sheet: "feedback-d", prefix: true, verdict: "inserted" },
        ] },
      { caption: "Persona's guard inspects the adopted handle. The sheet lacks the approval marker, so Persona discards it.",
        events: [{ type: "discard", actor: "persona", sheet: "feedback-d" }] },
      { caption: "Persona creates its own approved sheet instead.",
        events: [{ type: "create", actor: "persona", sheet: "persona-d", marked: true }] },
      { caption: "Persona's scoped rule passes the filter in its new approved destination. Both integrations' tracked rules are now present in CSSOM.",
        events: [{ type: "attempt", actor: "persona", sheet: "persona-d", prefix: false, verdict: "inserted" }] },
    ],
  },
  {
    id: "borrowed-permission",
    title: "Persona first, borrowed permission",
    question: "Can Feedback write through Persona's approval?",
    scenario: "persona-first",
    host: "extracted",
    personaVersion: "1.20260927.13.2",
    control: "Historical diagnostic control: forced sheet-only policy and unprefixed control Feedback.",
    renderers: { host: "DOM renderer", persona: "Historical profile", feedback: "Control profile" },
    takeaway: "Successful insertion does not prove permission was granted to Feedback. The filter cannot tell who wrote into an approved sheet.",
    steps: [
      { caption: "The diagnostic host forces the sheet-only filter on before either integration mounts.",
        events: [{ type: "gate", mode: "sheet-only" }] },
      { caption: "Persona mounts first, creates an approved sheet, and inserts its scoped rule.",
        events: [
          { type: "create", actor: "persona", sheet: "persona-d", marked: true },
          { type: "attempt", actor: "persona", sheet: "persona-d", prefix: false, verdict: "inserted" },
        ] },
      { caption: "Feedback mounts second and adopts Persona's approved sheet.",
        events: [{ type: "adopt", actor: "feedback", sheet: "persona-d" }] },
      { caption: "Feedback's unprefixed rule passes because the filter checks the destination, not the writer. That is borrowed permission. Rules in buckets Persona never created are still rejected.",
        events: [{ type: "attempt", actor: "feedback", sheet: "persona-d", prefix: false, verdict: "inserted" }] },
    ],
    evidence: [{ kind: "borrowedPermission", actor: "feedback", min: 1, text: "Feedback has rules admitted only by Persona's approval" },
      { kind: "blockedRules", actor: "feedback", min: 1, text: "Feedback still has rejected rules in sheets it created" }],
  },
  {
    id: "prefix-exception",
    title: "Persona first, prefix exception",
    question: "Is sharing a sheet the problem by itself?",
    scenario: "persona-first-raw",
    host: "extracted",
    personaVersion: "main-2026-10-16",
    control: "Uses the unmerged prefix-exception host revision.",
    renderers: { host: "No-op renderer", persona: "Main marker guard", feedback: "Inspected profile" },
    takeaway: "Storage is still shared, but Feedback's own prefix would admit its rule. Sharing a sheet need not grant or remove permission.",
    steps: [
      { caption: "This host revision admits approved sheets and also rules that start with Feedback's prefix.",
        events: [{ type: "gate", mode: "prefix" }] },
      { caption: "Persona mounts first, creates an approved sheet, and inserts its scoped rule.",
        events: [
          { type: "create", actor: "persona", sheet: "persona-d", marked: true },
          { type: "attempt", actor: "persona", sheet: "persona-d", prefix: false, verdict: "inserted" },
        ] },
      { caption: "Feedback's renderer adopts Persona's sheet. Persona's guard filters the handles it uses, not what a later foreign renderer adopts.",
        events: [{ type: "adopt", actor: "feedback", sheet: "persona-d" }] },
      { caption: "Feedback's prefixed rule is inserted into Persona's sheet. Storage is shared, yet no permission is borrowed.",
        events: [{ type: "attempt", actor: "feedback", sheet: "persona-d", prefix: true, verdict: "inserted" }] },
    ],
    evidence: [{ kind: "borrowedPermission", actor: "feedback", max: 0, text: "No Feedback rule depends on Persona's approval" }],
  },
  {
    id: "runtime-host",
    title: "Runtime host, no filter",
    question: "What happens when the host does not filter?",
    scenario: "master-rejects-marker",
    host: "runtime",
    personaVersion: "1.20260927.13.2",
    renderers: { host: "DOM renderer", persona: "Pinned release", feedback: "Inspected profile" },
    takeaway: "All three renderers share one host-created sheet and every rule is inserted. Without a filter, adoption does not remove rules.",
    steps: [
      { caption: "The runtime host has no extracted CSS. It renders with a DOM renderer and installs no insertRule filter.",
        events: [{ type: "gate", mode: "off" }] },
      { caption: "The host's own renderer creates the unmarked default bucket first.",
        events: [{ type: "create", actor: "host", sheet: "host-d", marked: false }] },
      { caption: "Feedback adopts the host's sheet and inserts its rule. Nothing inspects the destination.",
        events: [
          { type: "adopt", actor: "feedback", sheet: "host-d" },
          { type: "attempt", actor: "feedback", sheet: "host-d", prefix: true, verdict: "inserted" },
        ] },
      { caption: "Persona adopts the same sheet and inserts its scoped rule. Three renderers now write into one sheet without missing rules.",
        events: [
          { type: "adopt", actor: "persona", sheet: "host-d" },
          { type: "attempt", actor: "persona", sheet: "host-d", prefix: false, verdict: "inserted" },
        ] },
    ],
  },
];

export function storyState(chapter, stepIndex) {
  const state = { gate: null, sheets: [], handles: [], attempts: [], mounted: new Set(["host"]), current: [] };
  chapter.steps.slice(0, stepIndex + 1).forEach((step, index) => {
    for (const event of step.events) {
      if (index === stepIndex) state.current.push(event);
      if (event.actor) state.mounted.add(event.actor);
      if (event.type === "gate") state.gate = event.mode;
      if (event.type === "create") {
        state.sheets.push({ id: event.sheet, creator: event.actor, marked: event.marked });
        state.handles.push({ actor: event.actor, sheet: event.sheet, kind: "created" });
      }
      if (event.type === "adopt") state.handles.push({ actor: event.actor, sheet: event.sheet, kind: "adopted" });
      if (event.type === "discard") state.handles.push({ actor: event.actor, sheet: event.sheet, kind: "discarded" });
      if (event.type === "attempt") state.attempts.push({ ...event });
    }
  });
  return state;
}

export function chapterLink(chapter, search) {
  const params = new URLSearchParams(search);
  params.set("host", chapter.host);
  params.set("personaVersion", chapter.personaVersion);
  return `/?${params}#${chapter.scenario}`;
}

export function scenarioRunParams(chapter, coverage) {
  return { scenario: chapter.scenario, host: chapter.host, coverage, personaVersion: chapter.personaVersion };
}
