import { personaRevisions } from "../experiments/scenarios.js";

export const scenarioContent = {
  "persona-alone": {
    "primaryExample": true,
    "title": "Persona without interference",
    "takeaway": "The verified main-branch renderer inserts its scoped rules into approved sheets.",
    "description": "The production/extracted host loads its built CSS, uses a no-op renderer and installs its sheet-only filter in a layout effect. Current Persona uses the marker guard verified in the 2026-10-16 main-branch snapshot. It inserts scoped rules into approved destinations. No Feedback or unrelated renderer intervenes. This is the current insertion reference, not proof of a deployed version."
  },
  "unmarked-d-first": {
    "primaryExample": true,
    "title": "Unmarked destination first",
    "takeaway": "The marker guard discards incompatible adopted handles before inserting Persona's rules.",
    "description": "After the production/extracted host mounts, an unrelated renderer creates an unmarked default bucket. Its seed rule is rejected, but the sheet remains. Current Persona discards the incompatible handle before insertion, creates an approved destination and inserts its scoped rules. The unrelated seed remains rejected; protecting Persona does not change the host policy."
  },
  "feedback-first": {
    "title": "What if Feedback has no permission marker?",
    "takeaway": "An unmarked destination sheet can cause both integrations' rules to be blocked.",
    "description": "Experimental feedback arrives first and creates unmarked buckets. The host blocks its rules; the persona then adopts the same buckets and is blocked too. The minimal host supplies no button styles: both integrations lose their blue primary styling, phone buttons widen, and secondary action stretches across its action column."
  },
  "persona-first": {
    "title": "Can Feedback borrow Persona's permission?",
    "takeaway": "Feedback can inherit permission for shared sheets while rules in its new sheets are still blocked.",
    "description": "The persona arrives first and creates enhanced sheets. Experimental feedback reuses those sheets and inherits permission for shared buckets, despite having no rule marker. Its textarea also needs buckets Persona did not create; 17 rules in those unmarked sheets are blocked. The measured buttons look healthy, but this is partial permission leakage, not fully successful styling."
  },
  "raw-marked-first": {
    "primaryExample": true,
    "title": "Feedback first",
    "takeaway": "Both integrations insert their rules: Feedback has prefix permission and Persona rejects unapproved destinations.",
    "description": "The inspected Feedback profile uses runtime styles and a module-level salted renderer with prefixed rules, without requesting sheet approval metadata. The production/extracted host accepts that prefix. Current Persona discards Feedback's unmarked handles before insertion and creates approved destinations. Neither actor has host-blocked rules; native parser rejections remain separate. This order does not reproduce the historical missing-Persona-rule failure."
  },
  "persona-first-raw": {
    "primaryExample": true,
    "title": "Persona first",
    "takeaway": "Successful styling does not prove independent sheet ownership.",
    "description": "Reverse the arrival order without changing the current Persona profile or prefix-aware host filter. Persona creates approved sheets; the separately bundled Feedback renderer adopts them. Both insert rules, but storage is shared. Persona's guard restricts the handles it uses, not what later foreign renderers can adopt. Feedback's prefix grants independent permission, so shared storage is not itself a necessary bypass."
  },
  "master-rejects-marker": {
    "primaryExample": true,
    "title": "Sheet-only host",
    "takeaway": "Persona's guard protects its own insertion; it does not grant permission to independently rejected Feedback rules.",
    "description": "The inspected Feedback profile is unchanged, but the production/extracted host uses the sheet-only filter revision without the rule-prefix exception. Feedback creates unmarked destinations and its rules are blocked. Current Persona discards those handles, creates approved destinations and inserts its own scoped rules. This separates the remaining host/Feedback compatibility problem from Persona's resolved adoption failure."
  },
  "owner-guard": {
    "controlKind": "proposal",
    "title": "Proposed owner guard after the inspected Feedback profile",
    "takeaway": "Owner-filtered adoption separates destinations; renderer reuse also has an explicit document lifetime.",
    "description": "This inspected owner-guard proposal was still unmerged at the 2026-10-16 recheck; it is not the main-branch default. It accepts adopted sheets only for its owner. After Feedback arrives, Persona uses its own marked destinations. Its renderer is cached per owner and document and recreated if retained sheets detach. This demonstrates a stronger ownership/lifecycle contract, not proof of complete product coexistence or a deployed version."
  },
  "precompiled-salted": {
    "title": "What if component class names are already fixed?",
    "takeaway": "A renderer salt does not rename Fluent classes already generated at build time.",
    "description": "The host accepts feedback's prefixed rules, but this build uses precompiled Fluent styles. Runtime salt isolates the custom secondary action width class, not the precompiled Fluent classes. Feedback supplies shared button styling that masks the later persona's blocked standard rules, while Persona's secondary action still stretches. Similar-looking controls do not demonstrate class isolation."
  },
  "no-policy": {
    "title": "What if the host allows every rule?",
    "takeaway": "Sheet adoption alone does not block styles; permitting insertion can still allow class collisions.",
    "description": "Feedback still arrives before the persona, but this time the host filter is off. The persona adopts feedback's sheets and successfully inserts its scoped rules. Both secondary action buttons stay 137px. In the extracted host, feedback's unsalted reset also turns the avatar orange. Adoption alone is not the missing-style failure, and allowing insertion does not prevent class collisions."
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
  "persona-alone": {
    title: "Persona without interference",
    takeaway: "The pinned release inserts scoped rules when it creates approved destinations.",
    description: "No Feedback or unrelated renderer intervenes. This release uses marked sheets and scoped selectors, but has no adopted-handle guard. Its scoped rules insert into the approved sheets it creates.",
  },
  "unmarked-d-first": {
    title: "Unmarked destination first",
    takeaway: "The pinned release retains an unmarked destination; rejected scoped rules remain cached.",
    description: "An unrelated renderer leaves an unmarked default bucket after the extracted host rejects its seed rule. This release adopts that bucket without checking its approval marker. The host rejects Persona's atomic rules, although Griffel caches them. Compare the main snapshot: its guard changes the destination, not the generated scoped rule.",
  },
  "raw-marked-first": {
    title: "Feedback first",
    takeaway: "The proposed host prefix exception permits Feedback, but does not protect unguarded Persona.",
    description: "Feedback inserts its prefixed rules under the proposed prefix-aware host filter. This release then adopts Feedback's unmarked sheets and has its scoped rules rejected. The main snapshot drops those incompatible handles. Native rule presence and cache remain separate evidence.",
  },
  "persona-first-raw": {
    title: "Persona first",
    takeaway: "Both actors insert supported rules, but Feedback shares Persona's approved sheets.",
    description: "This release creates approved sheets before Feedback arrives. Feedback can adopt those sheets. Under the proposed prefix-aware host filter, its prefix also grants independent permission; sharing does not prove that permission was borrowed. Reversing arrival order exposes this release's rejected Persona rules.",
  },
  "master-rejects-marker": {
    title: "Sheet-only host",
    takeaway: "The inspected host main rejects both actors' rules in Feedback's unmarked destinations.",
    description: "This release and the sheet-only filter match the inspected consumer's locked source path. Feedback arrives first and cannot use its prefix to bypass that filter. Persona then retains Feedback's unmarked destinations and its own scoped rules are rejected too. This is source-consumption evidence, not proof of the effective settings or assets in any deployed client.",
  },
};

const primaryContent = {
  "1.20260927.13.2": releasedContent,
  "main-2026-10-16": scenarioContent,
};

export function getScenarioContent(config, personaVersion) {
  if (config.personaRevision !== "selected") return scenarioContent[config.id];
  const content = primaryContent[personaVersion]?.[config.id];
  if (!content) throw new Error(`Missing scenario content for ${config.id} / ${personaVersion}`);
  return { ...content, primaryExample: true,
    title: `${personaRevisions[personaVersion].label}: ${content.title}` };
}
