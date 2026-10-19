import React from "react";
import { ScenarioCard } from "./ScenarioCard.jsx";
import { getThreeActorCases } from "./scenarios.js";

export function ScenarioList({ settings }) {
  const scenarios = getThreeActorCases(settings.personaVersion, settings.solution);
  return scenarios.map((config, index) => (
    <ScenarioCard key={config.id} config={config} index={index} {...settings} />
  ));
}
