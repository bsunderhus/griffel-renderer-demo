import { personaRevisions } from "../experiments/scenarios.js";

export const scenarioContent = {
  "unmarked-d-first": {
    "title": "Missing enhanced-specificity attribute",
    "takeaway": "The enhanced-specificity attribute guard discards incompatible adopted handles before inserting Persona's rules.",
    "description": "After the production/extracted host mounts, an unrelated renderer creates a default bucket without the enhanced-specificity attribute. Its seed rule is rejected, but the sheet remains. Current Persona discards the incompatible handle before insertion, creates a destination with that attribute and inserts its scoped rules. The unrelated seed remains rejected; protecting Persona does not change the host policy."
  },
  "owner-guard": {
    "controlKind": "proposal",
    "title": "Proposed owner guard after the inspected Feedback profile",
    "takeaway": "Owner-filtered adoption separates destinations; renderer reuse also has an explicit document lifetime.",
    "description": "This inspected owner-guard proposal was still unmerged at the 2026-10-16 recheck; it is not the main-branch default. It accepts adopted sheets only for its owner. After Feedback arrives, Persona uses its own destinations with the enhanced-specificity attribute. Its renderer is cached per owner and document and recreated if retained sheets detach. This demonstrates a stronger ownership/lifecycle contract, not proof of complete product coexistence or a deployed version."
  },
  "precompiled-salted": {
    "title": "What if component class names are already fixed?",
    "takeaway": "A renderer salt does not rename Fluent classes already generated at build time.",
    "description": "The host accepts feedback's prefixed rules, but this build uses precompiled Fluent styles. Runtime salt isolates the custom secondary action width class, not the precompiled Fluent classes. Feedback supplies shared button styling that masks the later persona's blocked standard rules, while Persona's secondary action still stretches. Similar-looking controls do not demonstrate class isolation."
  },
  "raw-unsalted": {
    "title": "Can shared styles hide a failure?",
    "takeaway": "Shared classes can hide rejected integration rules and also change the host's styling.",
    "description": "Experimental feedback uses raw styles and allowed prefixes, but no salt. The persona's own rules are blocked later, yet feedback has already inserted matching classes, including the custom secondary action width. Even the customized button now looks correct. However, in the extracted host the same lack of salt lets feedback's reset turn the avatar orange. Shared classes can both mask integration failures and damage the host."
  },
  "host-collision": {
    "title": "Can Feedback change the host's appearance?",
    "takeaway": "A late matching reset can override the extracted host's avatar color.",
    "description": "With the filter off, unsalted feedback inserts a reset whose class naturally matches the host avatar's reset. In the extracted host, the late runtime reset follows the extracted atomic overrides: the host avatar turns from green to orange. The runtime-host control preserves reset-before-atomic ordering and stays green."
  },
  "host-collision-salted": {
    "title": "Can distinct class names protect the host?",
    "takeaway": "Salting the diagnostic reset prevents its selector from matching the host avatar.",
    "description": "Same cards, declarations, load order, and disabled filter as the preceding case; only feedback's class-name salt changes. The reset now has a different class and cannot match the avatar. The host stays green. This isolates class collision from sheet adoption and insertion filtering."
  }
};

const releasedContent = {
  "unmarked-d-first": {
    title: "Missing enhanced-specificity attribute",
    takeaway: "The pinned release retains a destination without the enhanced-specificity attribute; rejected scoped rules remain cached.",
    description: "An unrelated renderer leaves a default bucket without the enhanced-specificity attribute after the extracted host rejects its seed rule. This release adopts that bucket without checking its enhanced-specificity attribute. The host rejects Persona's atomic rules, although Griffel caches them. Compare the main snapshot: its guard changes the destination, not the generated scoped rule.",
  },
};

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
  if (config.kind === "baseline") {
    const [title, takeaway, description] = baselineContent[config.id];
    return { primaryExample: true, title: `${personaRevisions[personaVersion].label}: ${title}`,
      takeaway, description };
  }
  if (config.personaRevision !== "selected") return scenarioContent[config.id];
  const content = personaVersion === "main-2026-10-16" ? scenarioContent[config.id] : releasedContent[config.id];
  if (!content) throw new Error(`Missing scenario content for ${config.id} / ${personaVersion}`);
  return { ...content, primaryExample: false,
    title: `${personaRevisions[personaVersion].label}: ${content.title}` };
}
