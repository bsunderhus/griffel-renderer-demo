export function describeScenario(config, hostMode, coverage) {
  if (config.kind === "baseline") {
    return `${config.description} The selected host filter revision, Persona version, and host
      build/coverage are held constant across schedules. Feedback's raw styles, salt, prefix,
      singleton and canonical component workload never change. Host ready always precedes the
      schedule. ${hostMode === "runtime" ? "Runtime mode installs no filter." :
        "Extraction enables the selected host filter."} ${coverage === "shared" ?
        "Shared host styles may mask missing declarations; CSSOM evidence remains independent." :
        "The minimal host supplies no button or textarea CSS."}`;
  }
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
    return config.description;
  }
  let insertion = "The filter is off, so both integrations insert successfully.";
  if (config.policy !== "off") {
    const masking = coverage === "shared" ? "Host CSS can mask standard button failures." :
      "Without host button CSS, missing standard styles are exposed unless Feedback supplies matching classes.";
    insertion = `Persona's rules are blocked in the host's sheets without the enhanced-specificity attribute. ${masking}`;
  }
  return `Diagnostic control: repeat "${config.title}" with host-created runtime buckets already present and ${coverage} component coverage.
            Filtering is deliberately independent of the production/extraction gate. ${insertion}
            The host avatar stays green because runtime reset sheets precede atomic overrides. Inspect the rule evidence above.`;
}
