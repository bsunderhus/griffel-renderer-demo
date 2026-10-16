import React from "react";
import * as ReactDOMClient from "react-dom/client";
import * as ReactDOM from "react-dom";
import { ThreeActorGallery } from "./playground/Gallery.jsx";
import { Gallery } from "./archived/Gallery.jsx";
import { cases } from "./archived/mechanism-cases.js";
import { extractionCases } from "./archived/extraction-cases.js";
import { runCase } from "./archived/mechanisms.jsx";
import { runExtractionCase } from "./archived/extraction.js";
import { threeActorCases } from "./playground/scenarios.js";
import { runThreeActorCase } from "./experiments/run.js";
import { sourceScenarioAliases } from "./experiments/scenarios.js";

const { createRoot } = ReactDOMClient;
window.React = React;
window.ReactDOM = ReactDOM;
window.ReactDOMClient = ReactDOMClient;

const fragment = location.hash.slice(1);
if (Object.hasOwn(sourceScenarioAliases, fragment)) {
  history.replaceState(null, "", `${location.pathname}${location.search}#${sourceScenarioAliases[fragment]}`);
}

const caseId = new URLSearchParams(location.search).get("case");
const scenarioId = new URLSearchParams(location.search).get("scenario");
const mode = location.pathname.slice(1) || "three-actors";
if (!["three-actors", "extracted", "runtime", "mechanisms"].includes(mode)) throw new Error(`Unknown route: ${mode}`);
if (scenarioId && mode === "three-actors") {
  const config = threeActorCases.find(item => item.id === scenarioId);
  if (!config) throw new Error(`Unknown three-actor case: ${scenarioId}`);
  runThreeActorCase(config).catch(error => {
    console.error(error);
    document.getElementById("actor-evidence").textContent = `ERROR: ${error.message}`;
    window.threeActorError = error.message;
  });
} else if (mode === "three-actors") {
  createRoot(document.getElementById("root")).render(<ThreeActorGallery />);
} else if (scenarioId && mode !== "mechanisms") {
  const config = extractionCases.find(item => item.id === scenarioId);
  if (!config) throw new Error(`Unknown scenario: ${scenarioId}`);
  runExtractionCase(config, mode).catch(error => {
    console.error(error);
    document.getElementById("extraction-evidence").textContent = `ERROR: ${error.message}`;
    window.extractionError = error.message;
  });
} else if (caseId) {
  const config = cases.find(item => item.id === caseId);
  if (!config) throw new Error(`Unknown case: ${caseId}`);
  runCase(config);
} else {
  createRoot(document.getElementById("root")).render(<Gallery mode={mode} />);
}
