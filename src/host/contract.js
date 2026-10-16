export function resolveHostContract({ extracted, contract = "diagnostic", policy = "master" }, environment) {
  if (!["diagnostic", "production-extraction"].includes(contract)) throw new Error(`Unknown host contract: ${contract}`);
  if (!["master", "feedback-exception", "off"].includes(policy)) throw new Error(`Unknown host policy: ${policy}`);
  if (contract === "production-extraction" && policy === "off") {
    throw new Error("Use the diagnostic contract to force the extraction filter off");
  }
  const usesExtraction = environment === "production" && extracted;
  const shouldInstall = contract === "diagnostic" ? policy !== "off" : usesExtraction;
  return {
    contract, environment, extractionEnabled: extracted,
    renderer: contract === "production-extraction" && usesExtraction ? "noop" : "dom",
    shouldInstall,
    requestedPolicy: policy,
    effectivePolicy: shouldInstall ? policy : "off",
    installationTiming: !shouldInstall ? "not installed" :
      contract === "diagnostic" ? "before integrations (diagnostic override)" : "host layout effect",
  };
}
