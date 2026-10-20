import React from "react";
import * as ReactDOMClient from "react-dom/client";
import * as ReactDOM from "react-dom";
import { ThreeActorGallery } from "./playground/Gallery.jsx";
import { ProposalGallery } from "./playground/ProposalGallery.jsx";
import { Documentation } from "./playground/Documentation.jsx";
import { experiments } from "./experiments/scenarios.js";
import { runThreeActorCase } from "./experiments/run.js";
import { resolveHostSettings, SOLUTION_ROUTE } from "./experiments/configuration.js";
import { siteRoute } from "./site.js";

const { createRoot } = ReactDOMClient;
window.React = React;
window.ReactDOM = ReactDOM;
window.ReactDOMClient = ReactDOMClient;

const root = document.getElementById("root");

async function startApplication() {
  const route = siteRoute(location.pathname);
  if (!["", "docs", SOLUTION_ROUTE].includes(route)) {
    throw new Error(`Unknown route: ${route}`);
  }
  const scenarioId = new URLSearchParams(location.search).get("scenario");
  if ((route === "" || route === SOLUTION_ROUTE) && scenarioId !== null) {
    const config = experiments.find((item) => item.id === scenarioId);
    if (!config) {
      throw new Error(`Unknown scenario: ${scenarioId}`);
    }
    await runThreeActorCase(config);
    return;
  }
  const solution = route === SOLUTION_ROUTE ? "proposal" : "baseline";
  const settings = resolveHostSettings(location.search, solution);
  if (route === "docs") {
    document.title = "Documentation | Griffel integration lab";
  } else if (route === SOLUTION_ROUTE) {
    document.title = "Proposals | Griffel integration lab";
  }
  createRoot(root).render(
    route === "docs" ? (
      <Documentation settings={settings} />
    ) : route === SOLUTION_ROUTE ? (
      <ProposalGallery settings={settings} />
    ) : (
      <ThreeActorGallery settings={settings} />
    ),
  );
}

startApplication().catch((error) => {
  console.error(error);
  const message = error instanceof Error ? error.message : String(error);
  window.threeActorError = message;
  const alert = document.createElement("p");
  alert.setAttribute("role", "alert");
  alert.textContent = `ERROR: ${message}`;
  root.replaceChildren(alert);
});
