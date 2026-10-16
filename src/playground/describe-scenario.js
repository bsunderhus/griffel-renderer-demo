const sharedDescriptions = {
  "feedback-first": "Feedback creates unmarked sheets first; both integrations' rules are blocked. Shared host CSS keeps their phone and blue primary actions styled, but cannot supply the custom 137px secondary-action rule: both secondary actions expand.",
};

export function describeScenario(config, hostMode, coverage) {
  if (config.hostContract === "production-extraction") {
    const coverageNote = coverage === "shared" ?
      "Shared host component CSS can mask missing declarations; it does not change insertion evidence." :
      "The minimal host imports no button or textarea styles, so it cannot mask those missing declarations.";
    if (hostMode === "runtime") {
      return `Repeat "${config.title}" with extraction disabled. The host uses a DOM renderer and installs no insertion filter.
        Existing host buckets can still be adopted, subject to Persona's ${config.personaProfile} profile.
        The host cannot reject either integration's rules in this mode. ${coverageNote}`;
    }
    return `${config.description} ${coverageNote}`;
  }
  if (hostMode === "extracted") {
    return coverage === "shared" ? sharedDescriptions[config.id] || config.description : config.description;
  }
  let insertion = "The filter is off, so both integrations insert successfully.";
  if (config.policy !== "off") {
    const masking = coverage === "shared" ? "Host CSS can mask standard button failures." :
      "Without host button CSS, missing standard styles are exposed unless Feedback supplies matching classes.";
    insertion = `Persona's rules are blocked in the host's unmarked sheets. ${masking}`;
  }
  return `Diagnostic control: repeat "${config.title}" with host-created runtime buckets already present and ${coverage} component coverage.
            Filtering is deliberately independent of the production/extraction gate. ${insertion}
            The host avatar stays green because runtime reset sheets precede atomic overrides. Inspect the rule evidence above.`;
}
