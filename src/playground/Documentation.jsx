import React from "react";
import { resolveHostSettings } from "../experiments/configuration.js";
import { Introduction } from "./Introduction.jsx";
import { MechanismGuide } from "./MechanismGuide.jsx";
import { Navigation } from "./Navigation.jsx";

export function Documentation() {
  const settings = resolveHostSettings(location.search);
  return <main className="documentation-page">
    <Navigation mode="docs" />
    <header className="page-hero docs-hero">
      <p className="eyebrow">Research guide</p>
      <h1>How independent Griffel integrations interact</h1>
      <p>Follow styles from renderer setup through sheet adoption, host filtering, and browser
        insertion. The examples are synthetic, local, and designed to keep insertion, appearance,
        and sheet ownership as separate evidence.</p>
      <a className="text-link" href={`/${location.search}`}>Explore the playground <span aria-hidden="true">→</span></a>
    </header>
    <section className="documentation-content">
      <Introduction />
      <MechanismGuide
        hostMode={settings.hostMode}
        personaVersion={settings.personaVersion}
        expanded
      />
    </section>
  </main>;
}
