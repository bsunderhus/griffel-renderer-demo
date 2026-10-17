import React from "react";

export function Introduction() {
  return <>
    <h1>Versioned Griffel integrations: insertion and shared sheets</h1>
    <p>What happens when an application and two integrations add styles to the same page?
      The main examples compare <strong>Persona 1.20260927.13.2</strong>, pinned by the inspected
      consumer bootstrapper, with <strong>Persona main snapshot (2026-10-16)</strong>, which adds
      the marker guard. A source merge is not a consumer upgrade or proof of deployment.
      Both versions show sheet sharing and host/Feedback filter compatibility; the owner
      proposal and collision experiments remain collapsed controls.</p>
    <details className="intro-help">
    <summary>What should I look for?</summary>
    <p>Start with the generated CSS, not a visual comparison. Persona's <strong>View profile</strong>
      and Feedback's <strong>Clear status</strong> use a real 137px width rule as a traceable
      probe. Their rule evidence follows its generation, destination, insertion and cache.
      The host's green-to-orange avatar control is a separate, deliberately constructed
      declaration collision, not a prerequisite for missing Persona rules.</p>
    <p>Under each integration, <strong>Insertion</strong> reports host decisions and native insertion results,
      <strong> Rules</strong> reports the generated rules present in their destination CSSOM, and
      <strong> Ownership</strong> and <strong>Sharing</strong> report destination creators and
      other renderers retaining those sheets. <strong>Permission</strong> counts attempts that
      rely on another actor's sheet marker rather than an independently accepted rule prefix.
      Statuses follow the CSS evidence, not computed widths, colors, or visual comparisons.
      A normal-looking control does not prove its own rules were inserted.</p>
    <p>The host also reports foreign writes into its sheets and foreign selectors matching its elements.
      Neither alone proves damage. Its avatar trace compares the winning <code>background-color</code>
      declaration using a bounded CSSOM cascade check, not a pixel or computed-color comparison.
      “Unchanged” applies only to that probe, never to the entire host.</p>
    </details>
  </>;
}
