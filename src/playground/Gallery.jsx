import React from "react";
import { HostSettings } from "./HostSettings.jsx";
import { ScenarioCard } from "./ScenarioCard.jsx";
import { Navigation } from "./Navigation.jsx";
import { getThreeActorCases } from "./scenarios.js";
import { resolveHostSettings } from "../experiments/configuration.js";
import { sitePath } from "../site.js";

export function ThreeActorGallery() {
  const settings = resolveHostSettings(location.search);
  const threeActorCases = getThreeActorCases(settings.personaVersion);
  const primary = threeActorCases.filter(config => config.primaryExample);
  const controls = threeActorCases.filter(config => !config.primaryExample);
  const cards = configs => configs.map((config, index) =>
    <ScenarioCard key={config.id} config={config} index={index} {...settings} />);
  function navigate(changes) {
    const next = new URLSearchParams(location.search);
    for (const [key, value] of Object.entries(changes)) next.set(key, value);
    location.assign(sitePath(`?${next}`));
  }
  return <main>
    <Navigation mode="three-actors" />
    <header className="page-hero playground-hero">
      <p className="eyebrow">Interactive research playground</p>
      <h1>Explore Griffel style sharing</h1>
      <p>Run local examples of independently bundled integrations sharing browser stylesheets.
        Compare insertion evidence, sheet ownership, and appearance without changing the experiment.</p>
      <a className="text-link" href={sitePath(`docs${location.search}`)}>Read the documentation <span aria-hidden="true">→</span></a>
    </header>
    <p className="note">Primary scenarios use inspected styling contracts: the host owns its
      production/extraction gate, Feedback uses its inspected renderer profile, and Persona
      compares the pinned release with a guarded upstream main snapshot. The prefix-aware host
      filter is an unmerged proposal, not inspected host main. These are sanitized mechanisms,
      not a full SDK or proof of an incident-time deployment.</p>
    <HostSettings {...settings} contract="production-extraction" navigate={navigate} />
    <section aria-label="Primary integration examples">
      <h2 className="section-title">Baseline: fixed actors, different schedules</h2>
      <p>Use <strong>Persona version</strong> in Advanced host control to switch the same
        schedules between Persona 1.20260927.13.2 and Persona main snapshot (2026-10-16).
        Host filter revision is a separate configuration axis. Feedback always uses the same
        inspected profile. Script evaluation, mounting, and reopening are explicit events;
        no scenario changes the actors to manufacture a timing failure.</p>
      {settings.hostMode === "runtime" && <p className="note">
        Extraction is disabled: primary scenarios use a DOM host renderer with no insertion filter.
        Adoption alone does not reject rules. Explanatory controls retain their explicitly forced diagnostic policies.
      </p>}
      {cards(primary)}
    </section>
    <details className="explanatory-controls" open={controls.some(config => location.hash === `#${config.id}`)}>
      <summary>Counterfactual diagnostics and proposals ({controls.length}) — not baseline schedules</summary>
      <p>The owner guard is an unmerged proposal.
        Other controls use alternative Feedback settings, an unrelated seed renderer,
        forced diagnostic policies or a constructed shared reset. They answer separate mechanism
        questions and are not loading scenarios of the fixed baseline actors.</p>
      {cards(controls)}
    </details>
  </main>;
}
