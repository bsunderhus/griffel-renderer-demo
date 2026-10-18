import React from "react";

export function Navigation({ mode }) {
  const settings = location.search;
  return <header className="site-header">
    <a className="site-brand" href={`/${settings}`}>Griffel lab</a>
    <nav aria-label="Main navigation">
      <a href={`/${settings}`} aria-current={mode !== "docs" ? "page" : undefined}>Playground</a>
      <a href={`/docs${settings}`} aria-current={mode === "docs" ? "page" : undefined}>Documentation</a>
    </nav>
    {!["three-actors", "docs"].includes(mode) && <span className="nav-context">Archived diagnostic: {mode}</span>}
  </header>;
}
