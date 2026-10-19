export function resolveHostContract({ extracted, contract = "production-extraction", policy = "master" }, environment) {
  if (contract !== "production-extraction") throw new Error(`Unknown host contract: ${contract}`);
  if (!["master", "feedback-exception"].includes(policy)) throw new Error(`Unknown host policy: ${policy}`);
  const usesExtraction = environment === "production" && extracted;
  const shouldInstall = usesExtraction;
  return {
    contract, environment, extractionEnabled: extracted,
    renderer: usesExtraction ? "noop" : "dom",
    shouldInstall,
    requestedPolicy: policy,
    effectivePolicy: shouldInstall ? policy : "off",
    installationTiming: shouldInstall ? "host layout effect" : "not installed",
  };
}
