export const scenarioContent = {
  "persona-alone": {
    "primaryExample": true,
    "title": "Historical Persona without interference",
    "takeaway": "Persona works when it creates its own marked style sheets.",
    "description": "The production/extracted host loads its built CSS, uses a no-op renderer and installs its sheet-only filter in a layout effect. Historical Persona creates marked sheets and inserts its scoped rules. No Feedback or unrelated renderer intervenes. This is the healthy insertion reference, not a claim about every Persona revision."
  },
  "unmarked-d-first": {
    "primaryExample": true,
    "title": "An existing sheet blocks Persona's styles",
    "takeaway": "Persona's renderer settings do not change the unmarked sheet it adopts.",
    "description": "After the production/extracted host mounts, an unrelated renderer creates an unmarked default bucket. Its seed rule is rejected, but the sheet remains. Historical Persona adopts that sheet and caches scoped atomic rules whose native insertion is blocked. Other buckets can still be inserted. This isolates adoption plus host filtering from selector scoping."
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
    "title": "Inspected Feedback profile before historical Persona",
    "takeaway": "Isolating class names does not isolate style sheets: Persona can still adopt Feedback's sheets.",
    "description": "The inspected Feedback styling profile uses runtime styles and a module-level salted renderer with prefixed rules, without requesting sheet approval metadata. The production/extracted host accepts that prefix. Historical Persona then adopts Feedback's unmarked sheets, and its own unprefixed rules are blocked despite remaining in its renderer cache."
  },
  "persona-first-raw": {
    "primaryExample": true,
    "title": "Historical Persona before the inspected Feedback profile",
    "takeaway": "Successful styling does not prove independent sheet ownership.",
    "description": "Reverse the arrival order without changing the profiles or prefix-aware host filter. Historical Persona creates marked sheets; the separately bundled Feedback renderer adopts them. Both insert rules, but storage is shared. Feedback's prefix would also be accepted in unmarked sheets, so this case does not demonstrate a necessary permission bypass."
  },
  "master-rejects-marker": {
    "primaryExample": true,
    "title": "Sheet-only host rejects the inspected Feedback prefix",
    "takeaway": "A rule marker only grants permission when the host filter recognizes it.",
    "description": "The inspected Feedback profile is unchanged, but the production/extracted host models the sheet-only filter revision without the rule-prefix exception. Feedback creates unmarked sheets and its rules are blocked. Historical Persona adopts them and is blocked too. Host component coverage can mask missing declarations, but cannot turn rejected insertions into successful ones."
  },
  "marker-guard": {
    "primaryExample": true,
    "title": "Marker-guard Persona after the inspected Feedback profile",
    "takeaway": "Rejecting unapproved adopted handles restores insertion, but is not exclusive sheet ownership.",
    "description": "This separately labeled inspected Persona revision discards adopted handles whose approval attribute is not exactly the string true before inserting. After Feedback creates unmarked sheets, Persona creates marked destinations and inserts its scoped rules. Another owner's correctly marked sheets can still be accepted; this is not the historical incident-time implementation."
  },
  "owner-guard": {
    "primaryExample": true,
    "title": "Owner-guard Persona after the inspected Feedback profile",
    "takeaway": "Owner-filtered adoption separates destinations; renderer reuse also has an explicit document lifetime.",
    "description": "This separately labeled inspected Persona revision accepts adopted sheets only for its owner. After Feedback arrives, Persona uses its own marked destinations. Its renderer is cached per owner and document and recreated if retained sheets detach. This demonstrates a stronger ownership/lifecycle contract, not proof of complete product coexistence or the deployed incident revision."
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
