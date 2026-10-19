import React from "react";
import { HostSettings } from "./HostSettings.jsx";
import { ScenarioCard } from "./ScenarioCard.jsx";
import { Navigation } from "./Navigation.jsx";
import { getThreeActorCases } from "./scenarios.js";
import { sitePath } from "../site.js";

export function ThreeActorGallery({ settings }) {
  const threeActorCases = getThreeActorCases(settings.personaVersion);
  const cards = configs => configs.map((config, index) =>
    <ScenarioCard key={config.id} config={config} index={index} {...settings} />);
  function navigate(changes) {
    const next = new URLSearchParams(location.search);
    for (const [key, value] of Object.entries(changes)) next.set(key, value);
    location.assign(sitePath(`?${next}`));
  }
  return <main>
    <Navigation mode="playground" />
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
    <HostSettings {...settings} navigate={navigate} />
    <section aria-label="Primary integration examples">
      <h2 className="section-title">Baseline: fixed actors, different schedules</h2>
      <p>Use <strong>Persona version</strong> in Advanced host control to switch the same
        schedules between Persona 1.20260927.13.2 and Persona main snapshot (2026-10-16).
        Host filter revision is a separate configuration axis. Feedback always uses the same
        inspected profile. Script evaluation, mounting, and reopening are explicit events;
        no scenario changes the actors to manufacture a timing failure.</p>
      {settings.hostMode === "runtime" && <p className="note">
        Extraction is disabled: primary scenarios use a DOM host renderer with no insertion filter.
        Adoption alone does not reject rules.
      </p>}
      {cards(threeActorCases)}
    </section>
  </main>;
}
