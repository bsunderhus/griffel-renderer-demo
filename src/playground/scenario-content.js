import { personaRevisions } from "../experiments/scenarios.js";

const baselineContent = {
  "persona-alone": [
    "Persona alone",
    "Reference insertion without another integration.",
    "Only Persona mounts after the host is ready.",
    "Use Persona's lavender avatar, tinted phone/profile buttons and purple heading as the visual reference.",
  ],
  "feedback-alone": [
    "Feedback alone",
    "Reference Feedback permission without Persona's sheets with the enhanced-specificity attribute.",
    "Only the unchanged inspected Feedback actor mounts after the host is ready.",
    "Compare Feedback's button fills, phone icon and text field with the runtime-host or prefix-exception reference. Check both idle and focused states; Persona is not mounted here.",
  ],
  "raw-marked-first": [
    "Feedback first",
    "Observe Persona after Feedback has populated the document.",
    "Feedback's script evaluates and its UI mounts before Persona loads and mounts.",
    "Compare Persona's avatar, phone/profile buttons and heading with Persona alone. Separately compare Feedback's controls with the runtime-host or prefix-exception reference.",
  ],
  "persona-first-raw": [
    "Persona first",
    "Reverse only arrival order; inspect sharing and permission independently.",
    "Persona loads and mounts before the unchanged Feedback actor. Under the sheet-only filter, prefixed Feedback can still borrow destination permission.",
    "Check Feedback's buttons, then click Share feedback and compare the bottom focus underline with the runtime-host or prefix-exception reference. Judge idle and focus styling separately.",
  ],
  "feedback-preloaded": [
    "Feedback preloaded, Persona mounted first",
    "Separate module evaluation from first mount.",
    "Feedback's module-level renderer is constructed first, but Persona mounts first. Provider hydration, not construction alone, selects adopted sheets.",
    "Compare idle controls and Feedback's bottom focus underline with Persona first under the same settings. Check whether script preloading makes any visible difference.",
  ],
  "both-preloaded": [
    "Both scripts loaded, Feedback mounted first",
    "Compare preload with the same first-mount order.",
    "Both actor scripts evaluate before either integration mounts; Feedback still mounts first.",
    "Compare Persona's color accents and Feedback's idle/focus styles with Feedback first under the same settings. Check whether preloading changes either card.",
  ],
  "feedback-reopened": [
    "Feedback reopened after Persona",
    "Test the candidate renderer's module lifetime without changing its implementation.",
    "Persona mounts, then Feedback mounts, unmounts, and mounts again. Feedback keeps its module-level renderer and insertion cache.",
    "Compare the reopened Feedback controls with Persona first under the same settings. Check the buttons and focus the text field; reopening and appearance are separate from insertion permission.",
  ],
  "persona-remounted": [
    "Persona remounted after Feedback",
    "Test per-provider renderer lifetime with the same selected revision.",
    "Feedback mounts, then Persona mounts, unmounts, and mounts again. Each Persona mount creates a new renderer; retained document sheets remain observable.",
    "Compare the remounted Persona's avatar and purple accents with Feedback first under the same settings, then with Persona alone. Inspect the live evidence before attributing differences to the new renderer.",
  ],
};

export function getScenarioContent(config, personaVersion, solution = "baseline") {
  const content = baselineContent[config.id];
  if (!content) {
    throw new Error(`Missing scenario content for ${config.id}`);
  }
  const [title, takeaway, description, visualCheck] = content;
  const personaLabel =
    solution === "prefix-salted" ? "Persona prefix + salt" : personaRevisions[personaVersion].label;
  if (solution === "feedback-marked") {
    return {
      title: config.order.includes("persona") ? `${personaLabel}: ${title}` : title,
      takeaway: "Test destination-marker permission with unchanged Persona and host policy.",
      visualCheck:
        "Compare Persona's lavender accents and Feedback's idle/focus styles, when mounted, with the baseline under the same host mode and coverage. Inspect native insertion separately from appearance.",
      description:
        "Feedback keeps its raw styles, salt, prefix and module-level renderer but requests the enhanced-specificity attribute on new sheets. Persona stays at the pinned release. The marker does not change attributes on adopted sheets.",
    };
  }
  return {
    title: config.order.includes("persona") ? `${personaLabel}: ${title}` : title,
    takeaway,
    visualCheck:
      solution === "baseline"
        ? visualCheck
        : "Compare the mounted cards' colors and Feedback's idle/focus styles, when present, with the baseline under the same host mode and coverage. The proposal admits both rule prefixes when extraction enables filtering; inspect the live evidence as well as appearance.",
    description:
      solution === "baseline"
        ? description
        : `Markerless Persona rules use an exact prefix and distinct hash salt. ${description}`,
  };
}
