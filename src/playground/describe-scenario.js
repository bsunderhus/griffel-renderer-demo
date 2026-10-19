export function describeScenario(config, hostMode, coverage) {
  return `${config.description} The selected host filter revision, Persona version, and host
    build/coverage are held constant across schedules. Feedback's raw styles, salt, prefix,
    singleton and component workload never change. Host ready always precedes the
    schedule. ${hostMode === "runtime" ? "Runtime mode installs no filter." :
      "Extraction enables the selected host filter."} ${coverage === "shared" ?
      "Shared host styles may mask missing declarations; CSSOM evidence remains independent." :
      "The minimal host supplies no button or textarea CSS."}`;
}
