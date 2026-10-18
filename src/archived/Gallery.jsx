import React from "react";
import { Navigation } from "../playground/Navigation.jsx";
import { cases } from "./mechanism-cases.js";
import { extractionCases } from "./extraction-cases.js";
import { sitePath } from "../site.js";

export function Gallery({ mode }) {
  const mechanisms = mode === "mechanisms";
  return <main>
    <Navigation mode={mode} />
    <h1>Griffel: shared sheets, different insertion policies</h1>
    <p>Two independent renderers share a document. One expects its sheets to carry an approval marker.
      Griffel's <code>RendererProvider</code> can adopt an existing sheet without that marker instead.
      A simulated host filter checks the destination sheet, not the renderer that produced a rule.</p>
    <p className="note"><strong>Synthetic local examples.</strong> React, Griffel, and a small explicit host-policy simulation only.
      Sheet adoption alone is not a missing-style failure: compare cases 2 and 3.
      Red and amber outcomes are intentional evidence, not test-run failures.</p>
    <button onClick={() => window.location.reload()}>Replay all cases</button>
    {mechanisms ?
    <div className="grid">{cases.map(config => <section className="card" key={config.id}>
      <h2>{config.title}</h2><p><strong>The story: </strong>{config.description}</p>
      <iframe title={config.title} src={sitePath(`mechanisms?case=${config.id}`)} />
    </section>)}</div> :
    <section id="comparison-section">
    <h2 className="section-title">{mode === "extracted" ? "Extracted" : "Non-extracted"} host + runtime integration</h2>
    <p>Both pages use the same host source, integration bundle, scenarios, and presentation.
      Only the host build changes: {mode === "extracted" ?
        <>Griffel extracts the host styles into a <a href={sitePath("griffel.css")}>generated stylesheet</a>.</> :
        <>the host inserts its styles at runtime.</>}
      {" "}The simulated filter is enabled per scenario on both pages, not automatically by extraction.
      Different outcomes are evidence, not differences in the fixture.</p>
    <p className="note">Both host and integration now render real Fluent UI: <strong>Avatar with presence,
      icon-only Button, primary Button, Label, and Textarea</strong> inside FluentProvider.
      Demo overrides are part of the card: the host's avatar has green styling,
      and the integration's Clear status button has a 137px width.
      Salt applies to our raw fixture styles; Fluent's default precompiled classes remain shared.
      Blocked runtime insertion does not necessarily remove styles already supplied by the host.</p>
    <div className="grid">{extractionCases.map(config => <section className="card" key={config.id}>
      <h2>{config.title}</h2><p><strong>The story: </strong>{config.description}</p>
      <iframe className="extraction-frame" title={config.title} src={sitePath(`${mode}?scenario=${config.id}`)} />
    </section>)}</div>
    </section>}
  </main>;
}

