import React from "react";
import * as ReactDOMClient from "react-dom/client";
import * as ReactDOM from "react-dom";
import { ThreeActorGallery } from "./playground/Gallery.jsx";
import { Documentation } from "./playground/Documentation.jsx";
import { getThreeActorCases } from "./playground/scenarios.js";
import { runThreeActorCase } from "./experiments/run.js";
import { normalizeLegacyLocation } from "./legacy-routes.js";
import { siteRoute } from "./site.js";
import { resolveHostSettings } from "./experiments/configuration.js";

const { createRoot } = ReactDOMClient;
window.React = React;
window.ReactDOM = ReactDOM;
window.ReactDOMClient = ReactDOMClient;

const legacy = normalizeLegacyLocation(location);
if (legacy) history.replaceState(null, "", legacy);

const scenarioId = new URLSearchParams(location.search).get("scenario");
const mode = siteRoute(location.pathname) || "three-actors";
if (!["three-actors", "docs"].includes(mode)) throw new Error(`Unknown route: ${mode}`);
if (scenarioId && mode === "three-actors") {
  const config = getThreeActorCases(resolveHostSettings(location.search).personaVersion).find(item => item.id === scenarioId);
  if (!config) throw new Error(`Unknown three-actor case: ${scenarioId}`);
  runThreeActorCase(config).catch(error => {
    console.error(error);
    document.getElementById("actor-evidence").textContent = `ERROR: ${error.message}`;
    window.threeActorError = error.message;
  });
} else if (mode === "three-actors") {
  createRoot(document.getElementById("root")).render(<ThreeActorGallery />);
} else if (mode === "docs") {
  document.title = "Documentation | Griffel integration lab";
  createRoot(document.getElementById("root")).render(<Documentation />);
}
