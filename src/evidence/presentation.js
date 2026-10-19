export function renderEvidence(result, analysis) {
  const { hostMode, hostBuckets, policy, order, actors: actorEvidence, hostEvidence } = result;
  const openTraces = new Set(Array.from(document.querySelectorAll("[data-rule-trace][open], [data-host-rule-trace][open]"),
    element => element.dataset.ruleTrace || "host"));
  const openLedgers = new Set(Array.from(document.querySelectorAll("[data-rule-ledger][open]"),
    element => element.dataset.ruleLedger));
  const fullEvidenceOpen = document.querySelector("#actor-evidence details")?.open;
  for (const element of document.querySelectorAll("[data-actor-status]")) element.remove();
  const background = hostEvidence.avatarBackground;
  const hostStatus = document.createElement("div");
  hostStatus.dataset.actorStatus = "host";
  hostStatus.className = `result ${analysis.hostTone}`;
  const hostSummary = document.createElement("p");
  hostSummary.textContent = `Host CSS: ${hostMode}; ${hostBuckets} initial Griffel sheets; ` +
    `${result.hostRuntimeCalls} runtime insertion calls. ` +
    `Host-created destinations retained by: ${hostEvidence.sharedWith.join(", ") || "no integrations"}. ` +
    `${hostEvidence.foreignWrites} native foreign insertions into host-created sheets. ` +
    `${hostEvidence.foreignRules.length} foreign CSS rules currently match host elements.`;
  const hostProbe = document.createElement("p");
  hostProbe.dataset.hostBackground = "";
  hostProbe.textContent = background.changed === null ? "Avatar background declaration: unresolved by the bounded CSSOM probe." :
    `Avatar background declaration: ${background.changed ? "CHANGED" : "unchanged"}; ` +
    `${background.baseline.value} (${background.baseline.actor}) -> ${background.current.value} (${background.current.actor}).`;
  const hostTrace = document.createElement("details");
  hostTrace.dataset.hostRuleTrace = "";
  hostTrace.open = openTraces.has("host");
  const hostLabel = document.createElement("summary");
  hostLabel.textContent = "Host selector matches and background declaration evidence";
  const hostScope = document.createElement("p");
  hostScope.textContent = "Sheet writes, selector matches, and a changed declaration are different facts. " +
    "Matching foreign CSS can be harmless duplication. The avatar probe resolves only unconditional, " +
    "single-class background declarations by importance and source order; it is not a full host or appearance audit.";
  const hostJSON = document.createElement("pre");
  hostJSON.textContent = JSON.stringify(hostEvidence, null, 2);
  hostTrace.append(hostLabel, hostScope, hostJSON);
  hostStatus.append(hostSummary, hostProbe, hostTrace);
  const contract = document.createElement("p");
  contract.dataset.hostContract = "";
  contract.textContent = `Host-owned ${result.simulation.host.contract} contract; ` +
    `renderer=${result.simulation.host.renderer}; filter=${result.simulation.host.effectivePolicy}; ` +
    `installation=${result.simulation.host.installationTiming}.`;
  hostStatus.prepend(contract);
  document.getElementById("host-mount").parentElement.appendChild(hostStatus);
  for (const [actor, evidence] of Object.entries(actorEvidence)) {
    const { attempts, blocked, failed, foreignSheets, foreignAllowed, presentRules, sharedWith, componentRule, cause, tone, borrowedPermission } = analysis.actors[actor];
    const status = document.createElement("div");
    status.dataset.actorStatus = actor;
    status.className = `result ${tone}`;
    const causeSummary = document.createElement("div");
    causeSummary.dataset.insertionCause = actor;
    const causeTitle = document.createElement("strong");
    causeTitle.textContent = cause.title;
    const causeExplanation = document.createElement("p");
    causeExplanation.textContent = cause.explanation;
    causeSummary.append(causeTitle, causeExplanation);
    status.append(causeSummary);
    const outcomes = document.createElement("dl");
    outcomes.className = "actor-outcomes";
    const addOutcome = (name, value) => {
      const term = document.createElement("dt");
      term.textContent = name;
      const definition = document.createElement("dd");
      definition.dataset.outcome = name.toLowerCase();
      definition.textContent = value;
      outcomes.append(term, definition);
    };
    addOutcome("Insertion", (blocked ? `${blocked} rules blocked.` : "No rules blocked.") +
      (failed ? ` ${failed} native insertions failed.` : ""));
    addOutcome("Rules", `${presentRules}/${attempts.length} recorded native rules present in destination CSSOM.`);
    addOutcome("Ownership", foreignSheets.length ?
      `Reuses sheets from ${[...new Set(foreignSheets.map(sheet => sheet.creator))].join(", ")}.` :
      sharedWith.length ? "Creates its sheets, but does not use them exclusively." : "Own sheets only.");
    addOutcome("Sharing", sharedWith.length ? `Sheet handles also held by ${sharedWith.join(", ")}.` :
      "No shared destination handles recorded.");
    addOutcome("Permission", `${borrowedPermission} attempts rely on another actor's enhanced-specificity attribute.`);
    addOutcome("Profile", result.simulation[actor]);
    const trace = document.createElement("details");
    trace.dataset.ruleTrace = actor;
    const traceLabel = document.createElement("summary");
    traceLabel.textContent = "Generated CSS and rule evidence";
    const explanation = document.createElement("p");
    explanation.dataset.fluentRule = actor;
    explanation.textContent = `Selected rule only: actual Fluent primary Button background. ` +
      `${actor} -> ${componentRule.destination}, bucket ${componentRule.bucket}/${componentRule.priority}, ` +
      `created by ${componentRule.creator} -> enhanced-specificity attribute ${componentRule.enhanced ? "truthy" : "absent or empty"}, ` +
      `feedback prefix ${componentRule.feedbackPrefix ? "present" : "absent"} -> ` +
      `${componentRule.blocked ? "blocked" : "allowed"} (${componentRule.reason}). ` +
      `Native insertion: ${componentRule.inserted ? "succeeded" : componentRule.blocked ? "not attempted" : `failed (${componentRule.error})`}. ` +
      `Recorded rule in destination CSSOM: ${componentRule.present ? "yes" : "no"}. ` +
      `Equivalent serialized rule in destination CSSOM: ${componentRule.equivalentPresent ? "yes" : "no"}. ` +
      `Renderer cache contains rule: ${evidence.cache.includes(componentRule.rule) ? "yes" : "no"}. ` +
      `Matching Fluent Button background rules: ${evidence.matchingComponentRules.length}. ` +
      (componentRule.blocked && evidence.matchingComponentRules.length ?
        "Other rules match the Button, but this actor's recorded rule was still blocked." :
        componentRule.present ? "The generated Fluent rule is present in destination CSSOM." :
        componentRule.equivalentPresent ? "The original native rule is gone, but equivalent CSS remains in its destination." :
        "The generated Fluent rule is absent from destination CSSOM.");
    const rule = document.createElement("code");
    rule.textContent = componentRule.rule;
    explanation.append(rule);
    const counts = document.createElement("p");
    counts.textContent = `${attempts.length - blocked} rules allowed; ${attempts.filter(event => event.inserted).length} native insertions succeeded; ${foreignSheets.length} foreign sheets; ` +
      `${foreignAllowed} insertions allowed into foreign sheets.`;
    const matchingRules = document.createElement("pre");
    matchingRules.dataset.matchingComponentRules = actor;
    matchingRules.textContent = evidence.matchingComponentRules.map(entry => entry.cssText).join("\n") || "No matching Fluent Button background rules.";
    const matchingSources = document.createElement("p");
    matchingSources.textContent = `Matching Fluent rule writers: ${[...new Set(evidence.matchingComponentRules
      .map(entry => entry.actor))].join(", ") || "none"}. Matching is not proof of the selected insertion.`;
    const ledger = document.createElement("details");
    ledger.dataset.ruleLedger = actor;
    ledger.open = openLedgers.has(actor);
    const ledgerLabel = document.createElement("summary");
    ledgerLabel.textContent = `All recorded insertion attempts (${attempts.length})`;
    const ledgerRules = document.createElement("pre");
    ledgerRules.textContent = attempts.map(event =>
      `#${event.id} ${event.destination} (${event.creator}), ${event.bucket}/${event.priority}: ` +
      `${event.blocked ? "BLOCKED" : "ALLOWED"} (${event.reason}); ` +
      `native=${event.inserted ? "inserted" : event.blocked ? "not attempted" : `rejected: ${event.error}`}; ` +
      `recorded native rule present=${event.present}; equivalent CSS=${event.equivalentPresent}; ` +
      `cached=${evidence.cache.includes(event.rule)}\n${event.rule}`).join("\n\n");
    ledger.append(ledgerLabel, ledgerRules);
    trace.open = openTraces.has(actor);
    trace.append(traceLabel, outcomes, counts, explanation, matchingSources, matchingRules, ledger);
    status.append(trace);
    document.getElementById(`${actor}-mount`).parentElement.appendChild(status);
  }
  const output = document.getElementById("actor-evidence");
  const description = document.createElement("p");
  description.className = "note";
  description.textContent = `Policy: ${policy}. Order: host -> ${order.join(" -> ")}. ` +
    "Feedback: raw Fluent, salted classes, prefixed rules, and a module-level renderer.";
  const schedule = document.createElement("pre");
  schedule.dataset.executionSchedule = "";
  schedule.textContent = "Host ready\n" +
    result.execution.map(event => `${event.action} ${event.actor}` +
      (event.renderer ? ` (${event.renderer}${event.reusesPreviousRenderer === true ? ", renderer reused" : ""})` : "")).join("\n");
  const decisions = document.createElement("pre");
  decisions.textContent = Object.keys(actorEvidence).map(actor => {
    const { attempts, blocked, foreignAllowed } = analysis.actors[actor];
    return `${actor}: ${attempts.length} attempts, ${blocked} blocked, ${foreignAllowed} allowed into foreign sheets.\n` +
      actorEvidence[actor].sheets.map(sheet =>
        `  ${sheet.key}: created by ${sheet.creator}, enhanced=${sheet.enhanced}, rules=${sheet.rules.length}`).join("\n");
  }).join("\n");
  decisions.textContent += `\nShared host/feedback avatar classes: ${result.sharedFeedbackClasses.length}`;
  const details = document.createElement("details");
  details.open = Boolean(fullEvidenceOpen);
  const label = document.createElement("summary");
  label.textContent = "Full configuration, execution, per-rule decisions, destination origins, cache, and CSS";
  const json = document.createElement("pre");
  json.textContent = JSON.stringify(result, null, 2);
  details.append(label, json);
  output.replaceChildren(description, schedule, decisions, details);
}
