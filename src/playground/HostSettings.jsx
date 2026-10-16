import React from "react";

export function HostSettings({ hostMode, coverage, navigate, contract = "diagnostic" }) {
  return (
    <details className="host-settings" open={hostMode === "runtime" || coverage === "minimal"}>
      <summary>Advanced host control</summary>
      <label htmlFor="host-coverage">Host component coverage </label>
      <select id="host-coverage" value={coverage} onChange={event => navigate({ coverage: event.target.value })}>
        <option value="shared">Shared components (Avatar, Button, Label, Textarea)</option>
        <option value="minimal">Minimal (Avatar only)</option>
      </select>
      <p>This chooses which components the host itself uses. With shared components, the host
        may already supply styles an integration needs, hiding the effect of blocked rules.
        The minimal host uses only an avatar, so it cannot supply the missing button or text-box styles.
        The integrations themselves do not change.</p>
      <label htmlFor="host-mode">Host CSS </label>
      <select id="host-mode" value={hostMode} onChange={event => navigate({ host: event.target.value })}>
        <option value="extracted">Extracted (main reproduction)</option>
        <option value="runtime">Runtime (non-extracted control)</option>
      </select>
      {contract === "diagnostic" ? <p>Runtime mode changes only the host build, not the integrations or filter predicates.
        The filter is deliberately installed after the host mounts: this is a diagnostic control,
        not a claim that a non-extracted production host enables this filter.
        Its pre-existing unmarked buckets can cause even story 1 to lose persona overrides.</p> :
        <p>The host installs its filter in a layout effect only when its production/extraction gate
          is active. Extracted mode uses a no-op host renderer; runtime mode uses a DOM renderer
          with no host filter. The integration configurations do not change.
          Explanatory controls explicitly retain their diagnostic overrides, including forced
          filtering on runtime hosts, and are labeled on each card.</p>}
      <button onClick={() => location.reload()}>Replay all scenarios</button>
    </details>
  );
}
