function insertionCause(actor, attempts, policy, sharedWith) {
  const names = { host: "the host", persona: "Persona", feedback: "Feedback" };
  const blocked = attempts.filter((event) => event.blocked);
  const allowed = attempts.filter((event) => !event.blocked);
  const failed = allowed.filter((event) => !event.inserted);
  const lost = attempts.filter((event) => event.inserted && !event.equivalentPresent);
  const replaced = attempts.some(
    (event) => event.inserted && !event.present && event.equivalentPresent,
  );
  const explanations = [];
  if (blocked.length) {
    const creators = new Map();
    for (const event of blocked) {
      creators.set(event.creator, (creators.get(event.creator) || 0) + 1);
    }
    for (const [creator, count] of creators) {
      const source =
        creator === actor ? "created by this actor" : `adopted from ${names[creator] || creator}`;
      explanations.push(
        `${count} ${count === 1 ? "rule" : "rules"} targeted sheets ${source} without a truthy enhanced-specificity attribute.`,
      );
    }
    explanations.push(
      policy === "master"
        ? "The sheet-only host filter permits only destinations with a truthy enhanced-specificity attribute; a rule prefix cannot bypass it."
        : policy === "integration-prefixes"
          ? "The host permits only the marked destination or the exact integration rule prefixes; the blocked rule matched neither."
          : "The host's Feedback-prefix exception did not apply: the blocked rules have no Feedback prefix.",
    );
    explanations.push("The host skipped native insertion for those rules.");
  }
  if (allowed.some((event) => event.reason === "filter disabled")) {
    explanations.push("No host insertion filter is active.");
  }
  if (policy === "feedback-exception" && allowed.some((event) => event.feedbackPrefix)) {
    explanations.push(
      "Feedback's rule prefix grants insertion permission, even in a sheet without the enhanced-specificity attribute.",
    );
  }
  if (policy === "integration-prefixes" && allowed.some((event) => event.authorizedByPrefix)) {
    explanations.push(
      "The host admitted an exact Persona or Feedback rule prefix; the destination sheet itself did not need the enhanced-specificity attribute.",
    );
  }
  const marked = allowed.filter(
    (event) =>
      event.enhanced &&
      !(policy === "feedback-exception" && event.feedbackPrefix) &&
      event.reason !== "filter disabled",
  );
  if (marked.some((event) => event.creator === actor)) {
    explanations.push(
      "This actor's sheets have a truthy enhanced-specificity attribute, so the host permits its rules.",
    );
  }
  const borrowed = [
    ...new Set(marked.filter((event) => event.creator !== actor).map((event) => event.creator)),
  ];
  if (borrowed.length) {
    explanations.push(
      `Rules in sheets shared from ${borrowed.map((creator) => names[creator] || creator).join(", ")} ` +
        "are allowed by those sheets' enhanced-specificity attributes (borrowed permission).",
    );
  }
  if (failed.length) {
    explanations.push(
      `The browser rejected ${failed.length} native insertion ${failed.length === 1 ? "call" : "calls"} after the host allowed them; ` +
        "these are not host-filter rejections. See the rule evidence for the native errors.",
    );
  }
  if (lost.length) {
    explanations.push(
      `${lost.length} previously inserted ${lost.length === 1 ? "rule no longer has" : "rules no longer have"} equivalent CSS in the recorded destinations; ` +
        "that is rule removal, not blocked insertion.",
    );
  }
  if (replaced) {
    explanations.push(
      "A recorded rule object was removed, but equivalent CSS remains; " +
        "this is a provenance warning, not blocked insertion.",
    );
  }
  if (!blocked.length && !failed.length && !lost.length && sharedWith.length) {
    explanations.push("Shared sheets alone do not mean insertion failed or appearance changed.");
  }
  return {
    title: blocked.length
      ? `Host filter blocked ${blocked.length} ${blocked.length === 1 ? "rule" : "rules"}`
      : failed.length
        ? "Host allowed insertion; the browser rejected some rules"
        : lost.length
          ? "Previously inserted rules are now missing"
          : sharedWith.length
            ? "Insertion allowed; sheets are shared"
            : replaced
              ? "Insertion allowed; equivalent CSS remains"
              : "Insertion allowed",
    explanation: explanations.join(" "),
  };
}

export function analyzeEvidence(result) {
  const actors = Object.fromEntries(
    Object.entries(result.actors).map(([actor, evidence]) => {
      const attempts = result.events.filter((event) => event.actor === actor && event.bucket);
      const blocked = attempts.filter((event) => event.blocked).length;
      const failed = attempts.filter((event) => !event.blocked && !event.inserted).length;
      const foreignSheets = evidence.sheets.filter((sheet) => sheet.creator !== actor);
      const foreignAllowed = attempts.filter(
        (event) => !event.blocked && event.creator !== actor,
      ).length;
      const presentRules = attempts.filter((event) => event.present).length;
      const sharedWith = [...new Set(evidence.sheets.flatMap((sheet) => sheet.sharedWith))];
      const missing = attempts.some(
        (event) => event.blocked || (event.inserted && !event.equivalentPresent),
      );
      const warning =
        failed || sharedWith.length || attempts.some((event) => event.inserted && !event.present);
      const componentRule = attempts.find(
        (event) =>
          event.bucket === "d" &&
          event.rule.includes("background-color:var(--colorBrandBackground)"),
      );
      if (!componentRule) {
        throw new Error(`Missing Fluent Button rule for ${actor}`);
      }
      return [
        actor,
        {
          attempts,
          blocked,
          failed,
          foreignSheets,
          foreignAllowed,
          presentRules,
          sharedWith,
          componentRule,
          cause: insertionCause(actor, attempts, result.policy, sharedWith),
          borrowedPermission: attempts.filter(
            (event) =>
              !event.blocked &&
              event.reason === "enhanced sheet" &&
              event.creator !== actor &&
              !event.authorizedByPrefix &&
              !(result.policy === "feedback-exception" && event.feedbackPrefix),
          ).length,
          tone: missing ? "missing" : warning ? "bypass" : "",
        },
      ];
    }),
  );
  const host = result.hostEvidence;
  const hostTone = host.avatarBackground.changed
    ? "missing"
    : host.avatarBackground.changed === null ||
        host.foreignWrites ||
        host.foreignRules.length ||
        host.sharedWith.length
      ? "bypass"
      : "";
  return { actors, hostTone };
}
