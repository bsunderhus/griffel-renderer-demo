import { personaRevisions } from "../experiments/scenarios.js";

const baselineContent = {
  "persona-alone": ["Persona alone", "Reference insertion without another integration.",
    "Only Persona mounts after the host is ready."],
  "feedback-alone": ["Feedback alone", "Reference Feedback permission without Persona's sheets with the enhanced-specificity attribute.",
    "Only the unchanged inspected Feedback actor mounts after the host is ready."],
  "raw-marked-first": ["Feedback first", "Observe Persona after Feedback has populated the document.",
    "Feedback's script evaluates and its UI mounts before Persona loads and mounts."],
  "persona-first-raw": ["Persona first", "Reverse only arrival order; inspect sharing and permission independently.",
    "Persona loads and mounts before the unchanged Feedback actor. Under the sheet-only filter, prefixed Feedback can still borrow destination permission."],
  "feedback-preloaded": ["Feedback preloaded, Persona mounted first", "Separate module evaluation from first mount.",
    "Feedback's module-level renderer is constructed first, but Persona mounts first. Provider hydration, not construction alone, selects adopted sheets."],
  "both-preloaded": ["Both scripts loaded, Feedback mounted first", "Compare preload with the same first-mount order.",
    "Both actor scripts evaluate before either integration mounts; Feedback still mounts first."],
  "feedback-reopened": ["Feedback reopened after Persona", "Test the candidate renderer's module lifetime without changing its implementation.",
    "Persona mounts, then Feedback mounts, unmounts, and mounts again. Feedback keeps its module-level renderer and insertion cache."],
  "persona-remounted": ["Persona remounted after Feedback", "Test per-provider renderer lifetime with the same selected revision.",
    "Feedback mounts, then Persona mounts, unmounts, and mounts again. Each Persona mount creates a new renderer; retained document sheets remain observable."],
};

export function getScenarioContent(config, personaVersion) {
  const content = baselineContent[config.id];
  if (!content) throw new Error(`Missing scenario content for ${config.id}`);
  const [title, takeaway, description] = content;
  return { title: `${personaRevisions[personaVersion].label}: ${title}`,
    takeaway, description };
}
