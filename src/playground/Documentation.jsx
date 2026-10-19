import React from "react";
import { ConflictExplainer } from "./ConflictExplainer.jsx";
import { MechanismGuide, ParticipantResponsibilities } from "./MechanismGuide.jsx";
import { Navigation } from "./Navigation.jsx";
import { REPOSITORY_URL, sitePath } from "../site.js";

export function Documentation({ settings }) {
  return (
    <main className="documentation-page">
      <Navigation mode="docs" />
      <header className="page-hero docs-hero">
        <p className="eyebrow">Research guide</p>
        <h1>How independent Griffel integrations interact</h1>
        <p>
          A host loads a contact card and a feedback form. Each brings its own styling decisions.
          They meet in one document, where separate renderers can end up writing into the same
          sheet. Follow how those reasonable decisions become an incompatible contract.
        </p>
        <div className="hero-links">
          <a className="text-link" href={sitePath(location.search)}>
            Explore the playground <span aria-hidden="true">→</span>
          </a>
          <a className="text-link" href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer">
            Read the source, tests and research notes on GitHub <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>
      <section className="conflict-summary" aria-labelledby="conflict-summary-heading">
        <h2 id="conflict-summary-heading">1. Meet the actors</h2>
        <ParticipantResponsibilities />
        <p>
          So far, each actor has made a local decision. The trouble begins when an integration finds
          a bucket sheet already on the page: Griffel can reuse it instead of creating another.
          Reuse does not apply the adopting renderer's requested attributes.
        </p>
      </section>
      <ConflictExplainer />
      <section className="conflict-summary" aria-labelledby="conflict-conclusion-heading">
        <h2 id="conflict-conclusion-heading">3. What the encounter tells us</h2>
        <p className="conflict-thesis">
          The host checks the <em>destination sheet or rule prefix</em>, not the <em>renderer</em>{" "}
          writing the rule.
        </p>
        <p>
          That is why Feedback can insert a prefixed rule while older Persona is rejected in the
          same sheet without the enhanced-specificity attribute. The host mixes sheet-level and
          rule-level permission; Persona assumes an existing bucket is a suitable destination.
          Neither decision checks the other's contract.
        </p>
        <p>
          The main-snapshot guard changes Persona's choice of destination, not the host's policy.
          With the sheet-only host, Feedback still lacks permission. With either host variant, other
          renderers can still adopt Persona's sheets with the enhanced-specificity attribute.
        </p>
        <p>
          The lesson is not that sharing always breaks styles. It is that permission, sheet
          ownership and CSS containment are different guarantees. A coherent host contract and
          integrations that honor it are needed; one enhanced-specificity attribute or rule prefix
          does not provide all three.
        </p>
      </section>
      <section className="documentation-content" aria-label="Evidence and caveats">
        <h2>Look closer: evidence and limits</h2>
        <p>
          These are synthetic, local examples, not a complete product or incident replay. Follow
          actual Fluent rules into native CSSOM rather than judging appearance. Rejected rules can
          remain cached, and another matching rule can mask their absence. The reference below
          connects each distinction to live scenarios.
        </p>
        <MechanismGuide hostMode={settings.hostMode} personaVersion={settings.personaVersion} />
      </section>
    </main>
  );
}
