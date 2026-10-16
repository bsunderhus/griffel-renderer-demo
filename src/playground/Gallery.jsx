import React from "react";
import { Introduction } from "./Introduction.jsx";
import { MechanismGuide } from "./MechanismGuide.jsx";
import { HostSettings } from "./HostSettings.jsx";
import { ScenarioCard } from "./ScenarioCard.jsx";
import { Navigation } from "./Navigation.jsx";
import { getThreeActorCases } from "./scenarios.js";
import { resolveHostSettings } from "../experiments/configuration.js";

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
    location.assign(`/?${next}`);
  }
  return <main>
    <Navigation mode="three-actors" />
    <p className="note">Primary scenarios use inspected styling contracts: the host owns its
      production/extraction gate, Feedback uses its inspected renderer profile, and Persona
      compares the pinned release with a guarded upstream main snapshot. The prefix-aware host
      filter is an unmerged proposal, not inspected host main. These are sanitized mechanisms,
      not a full SDK or proof of an incident-time deployment.</p>
    <Introduction hostMode={settings.hostMode} />
    <MechanismGuide />
    <HostSettings {...settings} contract="production-extraction" navigate={navigate} />
    <section aria-label="Primary integration examples">
      <h2 className="section-title">Primary integration examples</h2>
      <p>Use <strong>LPC version</strong> in Advanced host control to switch these same five
        scenarios between LPC 1.20260927.13.2 and LPC main snapshot (2026-10-16).
        Only Persona's renderer profile changes; no duplicate scenario cards are added.</p>
      {settings.hostMode === "runtime" && <p className="note">
        Extraction is disabled: primary scenarios use a DOM host renderer with no insertion filter.
        Adoption alone does not reject rules. Explanatory controls retain their explicitly forced diagnostic policies.
      </p>}
      {cards(primary)}
    </section>
    <details className="explanatory-controls" open={controls.some(config => location.hash === `#${config.id}`)}>
      <summary>Explanatory controls ({controls.length}) — alternative configurations and collision experiments</summary>
      <p>The owner guard is an unmerged proposal.
        Other controls explicitly use the unguarded renderer with alternative Feedback settings,
        forced diagnostic policies or a constructed shared reset. None is presented as current-main Persona behavior.</p>
      {cards(controls)}
    </details>
  </main>;
}
