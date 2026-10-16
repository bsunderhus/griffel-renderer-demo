import React from "react";

export function Introduction({ hostMode }) {
  return <>
    <h1>Versioned Griffel integrations: insertion and shared sheets</h1>
    <p>What happens when an application and two integrations add styles to the same page?
      The main examples compare <strong>LPC 1.20260927.13.2</strong>, pinned by the inspected
      consumer bootstrapper, with <strong>LPC main snapshot (2026-10-16)</strong>, which adds
      the marker guard. A source merge is not a consumer upgrade or proof of deployment.
      Both versions show sheet sharing and host/Feedback filter compatibility; the owner
      proposal and collision experiments remain collapsed controls.</p>
    <details className="intro-help">
    <summary>Who is on the page?</summary>
    <ul>
      <li><strong>Host:</strong> the application that loads the integrations. It also installs a
        filter that allows or blocks new style rules.</li>
      <li><strong>Persona:</strong> a synthetic contact-card integration.
        Its style selectors include a parent class, so they only match elements inside the
        Persona container. This is what <strong>scoped</strong> means here—not a separate
        document or a private stylesheet. The pinned release has no adopted-handle guard.
        The upstream snapshot discards unapproved adopted handles before insertion;
        it does not enforce exclusive ownership.</li>
      <li><strong>Feedback:</strong> a form loaded as a separate JavaScript bundle, with its own
        style renderer. This is what <strong>independently loaded</strong> means here.
        It still shares the page and can reuse the same style sheets as the other participants.</li>
    </ul>
    <p>A <strong>Griffel renderer</strong> turns component styles into CSS rules and puts them
      into style sheets. Separate renderers can reuse an existing sheet on the page.
      The host's filter checks the destination sheet and, in some examples, a marker on
      the rule—not which integration is trying to insert it. That distinction drives these failures.</p>
    <p>Each scenario starts in a fresh document. In the selected mode, the host
      {hostMode === "extracted" ?
        <> loads CSS prepared during the build (<strong>extracted CSS</strong>).</> :
        <> adds CSS while the page runs (<strong>runtime CSS</strong>).</>}
      {" "}Persona and Feedback always add their rules while the page runs.</p>
    </details>
    <details className="intro-help">
    <summary>What should I look for?</summary>
    <p>The host avatar should stay <strong>green</strong>; an unexpected change to orange
      shows a style collision. The integration phone buttons should be compact and primary actions
      blue. Persona's <strong>View profile</strong> and Feedback's <strong>Clear status</strong>
      should be 137px wide. A lost width rule lets these secondary actions
      stretch across their columns. These custom colors and widths make the styling
      mechanisms visible; they do not represent a particular product's design.</p>
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
