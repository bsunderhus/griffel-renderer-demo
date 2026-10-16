export function analyzeEvidence(result) {
  const actors = Object.fromEntries(Object.entries(result.actors).map(([actor, evidence]) => {
    const attempts = result.events.filter(event => event.actor === actor && event.bucket);
    const blocked = attempts.filter(event => event.blocked).length;
    const failed = attempts.filter(event => !event.blocked && !event.inserted).length;
    const foreignSheets = evidence.sheets.filter(sheet => sheet.creator !== actor);
    const foreignAllowed = attempts.filter(event => !event.blocked && event.creator !== actor).length;
    const presentRules = attempts.filter(event => event.present).length;
    const sharedWith = [...new Set(evidence.sheets.flatMap(sheet => sheet.sharedWith))];
    const missing = attempts.some(event => event.blocked || event.inserted && !event.equivalentPresent);
    const warning = failed || sharedWith.length || attempts.some(event => event.inserted && !event.present);
    const widthRule = attempts.find(event => event.rule.includes("width:137px"));
    if (!widthRule) throw new Error(`Missing recorded width insertion for ${actor}`);
    return [actor, {
      attempts, blocked, failed, foreignSheets, foreignAllowed, presentRules, sharedWith, widthRule,
      borrowedPermission: attempts.filter(event => !event.blocked &&
        event.reason === "enhanced sheet" && event.creator !== actor &&
        !(result.policy === "feedback-exception" && event.feedbackPrefix)).length,
      tone: missing ? "missing" : warning ? "bypass" : "",
    }];
  }));
  const host = result.hostEvidence;
  const hostTone = host.avatarBackground.changed ? "missing" :
    host.avatarBackground.changed === null || host.foreignWrites || host.foreignRules.length ||
      host.sharedWith.length ? "bypass" : "";
  return { actors, hostTone };
}
