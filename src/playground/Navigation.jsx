import React from "react";

export function Navigation({ mode }) {
  return <nav aria-label="Demonstrations">
    <a href="/" aria-current={mode === "three-actors" ? "page" : undefined}>Integration playground</a>
    {mode !== "three-actors" && <span>Archived diagnostic: {mode}</span>}
  </nav>;
}
