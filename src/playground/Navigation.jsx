import React from "react";
import { REPOSITORY_URL, sitePath } from "../site.js";

export function Navigation({ mode }) {
  const params = new URLSearchParams(location.search);
  const sharedSettings = new URLSearchParams();
  for (const key of ["host", "coverage"]) {
    if (params.has(key)) {
      sharedSettings.set(key, params.get(key));
    }
  }
  const settings = mode === "proposal" ? `?${sharedSettings}` : location.search;
  return (
    <header className="site-header">
      <a className="site-brand" href={sitePath(settings)}>
        Griffel lab
      </a>
      <nav aria-label="Main navigation">
        <a
          href={sitePath(
            mode === "proposal" ? (sharedSettings.size ? `?${sharedSettings}` : "") : settings,
          )}
          aria-current={mode === "playground" ? "page" : undefined}
        >
          Baseline playground
        </a>
        <a
          href={sitePath(`proposal${sharedSettings.size ? `?${sharedSettings}` : ""}`)}
          aria-current={mode === "proposal" ? "page" : undefined}
        >
          Proposal playground
        </a>
        <a href={sitePath(`docs${settings}`)} aria-current={mode === "docs" ? "page" : undefined}>
          Documentation
        </a>
      </nav>
      <a className="site-source" href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer">
        Source on GitHub <span aria-hidden="true">↗</span>
      </a>
    </header>
  );
}
