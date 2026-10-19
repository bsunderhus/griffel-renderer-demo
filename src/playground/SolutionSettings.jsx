import React from "react";

export function SolutionSettings({ hostMode, coverage, navigate }) {
  return (
    <details className="host-settings" open={hostMode === "runtime" || coverage === "minimal"}>
      <summary>Proposal test conditions</summary>
      <label htmlFor="host-coverage">Host component coverage </label>
      <select
        id="host-coverage"
        value={coverage}
        onChange={(event) => navigate({ coverage: event.target.value })}
      >
        <option value="shared">Shared components (Avatar, Button, Label, Textarea)</option>
        <option value="minimal">Minimal (Avatar only)</option>
      </select>
      <p>
        This chooses which components the host itself uses. Shared host styles may hide missing
        integration declarations; the minimal host uses only an avatar.
      </p>
      <label htmlFor="host-mode">Host CSS </label>
      <select
        id="host-mode"
        value={hostMode}
        onChange={(event) => navigate({ host: event.target.value })}
      >
        <option value="extracted">Extracted (host filter active)</option>
        <option value="runtime">Runtime (no host filter)</option>
      </select>
      <p>
        This compares the proposal under the production/extraction host gate and the runtime-host
        control. The proposal itself remains fixed.
      </p>
      <button onClick={() => location.reload()}>Replay all scenarios</button>
    </details>
  );
}
