import React from "react";
import { REPOSITORY_URL, sitePath } from "../site.js";

export function Navigation({ mode }) {
  const settings = location.search;
  return (
    <header className="site-header">
      <a className="site-brand" href={sitePath(settings)}>
        Griffel lab
      </a>
      <nav aria-label="Main navigation">
        <a href={sitePath(settings)} aria-current={mode !== "docs" ? "page" : undefined}>
          Playground
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
