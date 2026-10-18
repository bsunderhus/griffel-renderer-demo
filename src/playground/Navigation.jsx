import React from "react";
import { sitePath } from "../site.js";

export function Navigation({ mode }) {
  const settings = location.search;
  return <header className="site-header">
    <a className="site-brand" href={sitePath(settings)}>Griffel lab</a>
    <nav aria-label="Main navigation">
      <a href={sitePath(settings)} aria-current={mode !== "docs" ? "page" : undefined}>Playground</a>
      <a href={sitePath(`docs${settings}`)} aria-current={mode === "docs" ? "page" : undefined}>Documentation</a>
    </nav>
    {!["three-actors", "docs"].includes(mode) && <span className="nav-context">Archived diagnostic: {mode}</span>}
  </header>;
}
