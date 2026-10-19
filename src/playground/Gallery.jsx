import React from "react";
import { HostSettings } from "./HostSettings.jsx";
import { Navigation } from "./Navigation.jsx";
import { ScenarioList } from "./ScenarioList.jsx";
import { sitePath } from "../site.js";

export function ThreeActorGallery({ settings }) {
  function navigate(changes) {
    const next = new URLSearchParams(location.search);
    for (const [key, value] of Object.entries(changes)) {
      next.set(key, value);
    }
    location.assign(sitePath(`?${next}`));
  }
  return (
    <main>
      <Navigation mode="playground" />
      <header className="page-hero playground-hero">
        <p className="eyebrow">Interactive research playground</p>
        <h1>Explore Griffel style sharing</h1>
        <p>
          Run local examples of independently bundled integrations sharing browser stylesheets.
          Compare insertion evidence, sheet ownership, and appearance without changing the
          experiment.
        </p>
        <a className="text-link" href={sitePath(`docs${location.search}`)}>
          Read the documentation <span aria-hidden="true">→</span>
        </a>
      </header>
      <p className="note">
        Primary scenarios use inspected styling contracts: the host owns its production/extraction
        gate, Feedback uses its inspected renderer profile, and Persona compares the pinned release
        with a guarded upstream main snapshot. The prefix-aware host filter is an unmerged proposal,
        not inspected host main. These are sanitized mechanisms, not a full SDK or proof of an
        incident-time deployment.
      </p>
      <HostSettings {...settings} navigate={navigate} />
      <section aria-label="Primary integration examples">
        <h2 className="section-title">Baseline: fixed schedules</h2>
        <p>
          These scenarios preserve the inspected actors while varying load, mount, and remount
          schedules. The separate <a href={sitePath("proposal")}>proposal playground</a> tests the
          proposed prefix + salt change.
        </p>
        {settings.hostMode === "runtime" && (
          <p className="note">
            Extraction is disabled: primary scenarios use a DOM host renderer with no insertion
            filter. Adoption alone does not reject rules.
          </p>
        )}
        <ScenarioList settings={settings} />
      </section>
    </main>
  );
}
