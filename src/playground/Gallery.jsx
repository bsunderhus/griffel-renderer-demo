import React from "react";
import { Introduction } from "./Introduction.jsx";
import { MechanismGuide } from "./MechanismGuide.jsx";
import { HostSettings } from "./HostSettings.jsx";
import { ScenarioCard } from "./ScenarioCard.jsx";
import { Navigation } from "./Navigation.jsx";
import { threeActorCases } from "./scenarios.js";
import { resolveHostSettings } from "../experiments/configuration.js";

export function ThreeActorGallery() {
  const settings = resolveHostSettings(location.search);
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
      revisions are named explicitly. These are sanitized mechanisms, not a full SDK or proof
      of an incident-time deployment. Counterfactual configurations are labeled explanatory controls.</p>
    <Introduction hostMode={settings.hostMode} />
    <MechanismGuide />
    <HostSettings {...settings} contract="production-extraction" navigate={navigate} />
    <section aria-label="Primary integration examples">
      <h2 className="section-title">Primary integration examples</h2>
      <p>These seven source-aligned scenarios cover historical sheet adoption, host filter revisions,
        arrival order, and the separately inspected marker-guard and owner-guard Persona revisions.</p>
      {settings.hostMode === "runtime" && <p className="note">
        Extraction is disabled: primary scenarios use a DOM host renderer with no insertion filter.
        Adoption alone does not reject rules. Explanatory controls retain their explicitly forced diagnostic policies.
      </p>}
      {cards(primary)}
    </section>
    <details className="explanatory-controls" open={controls.some(config => location.hash === `#${config.id}`)}>
      <summary>Explanatory controls ({controls.length}) — alternative configurations and collision experiments</summary>
      <p>These controls vary Feedback's inspected profile, force diagnostic filtering independently
        of extraction, or use a constructed shared reset. They explain collisions, masking and
        borrowed permission; they do not represent the source-aligned participant configuration.</p>
      {cards(controls)}
    </details>
  </main>;
}
