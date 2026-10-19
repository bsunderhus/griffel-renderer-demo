import React from "react";
import { Navigation } from "./Navigation.jsx";
import { SolutionSettings } from "./SolutionSettings.jsx";
import { ScenarioList } from "./ScenarioList.jsx";
import { sitePath } from "../site.js";

export function ProposalGallery({ settings }) {
  function navigate(changes) {
    const next = new URLSearchParams(location.search);
    for (const [key, value] of Object.entries(changes)) {
      next.set(key, value);
    }
    location.assign(sitePath(`proposal?${next}`));
  }
  return (
    <main>
      <Navigation mode="proposal" />
      <header className="page-hero playground-hero">
        <p className="eyebrow">Separate solution experiment</p>
        <h1>Test the prefix + salt proposal</h1>
        <p>
          Compare the fixed markerless Persona candidate against the unchanged Feedback integration.
          Persona rules carry an exact prefix and use a distinct hash salt; the extracted host
          recognizes both integration prefixes.
        </p>
        <a className="text-link" href={sitePath(`docs${location.search}`)}>
          Read the research documentation <span aria-hidden="true">→</span>
        </a>
      </header>
      <p className="note">
        This is a proposal model, not the baseline reproduction or a production deployment. The
        host's prefix check grants insertion permission; the salt changes generated class names.
        Neither authenticates a writer nor prevents sheet sharing.
      </p>
      <SolutionSettings {...settings} navigate={navigate} />
      <section aria-label="Prefix and salt proposal scenarios">
        <h2 className="section-title">Fixed proposal configuration: all schedules</h2>
        <p>
          Feedback's renderer and workload are unchanged. Each scenario varies only load, mount,
          preload, or remount order so insertion, CSSOM presence, sheet sharing, and appearance can
          be compared independently.
        </p>
        {settings.hostMode === "runtime" && (
          <p className="note">
            No host insertion filter is installed in runtime mode; this confirms the filter's role
            in the extracted-host result.
          </p>
        )}
        <ScenarioList settings={settings} />
      </section>
    </main>
  );
}
