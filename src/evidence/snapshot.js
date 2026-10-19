import { avatarBackgroundEvidence, describeRule, hostRuleEvidence, readStyleRules } from "./cssom.js";

export function captureHostBaseline(doc, observation) {
  const provider = doc.querySelector('[data-fluent-owner="host"]');
  const avatar = provider.querySelector("[data-host-avatar]");
  return {
    provider, avatar,
    background: avatarBackgroundEvidence(avatar, readStyleRules(doc), observation.ruleSource),
  };
}

export function refreshEvidence({ doc, result, actors, observation, baseline }) {
  const { events, creators, sheetIds, nativeRules, ruleSource } = observation;
  const entries = readStyleRules(doc);
  const liveRules = new Map(Array.from(doc.styleSheets, sheet => [sheet, new Set(Array.from(sheet.cssRules))]));
  for (const event of events) {
    const native = nativeRules.get(event.id);
    event.present = Boolean(native && liveRules.get(native.sheet)?.has(native.rule) &&
      native.rule.cssText === event.cssText);
    event.equivalentPresent = Boolean(native && Array.from(liveRules.get(native.sheet) || [])
      .some(rule => rule.cssText === event.cssText));
  }
  for (const [actor, { renderer }] of Object.entries(actors)) {
    const evidence = result.actors[actor];
    evidence.cache = Object.keys(renderer.insertionCache);
    evidence.sheets = Object.entries(renderer.stylesheets).map(([key, sheet]) => ({
      key, id: sheetIds.get(sheet.element), creator: creators.get(sheet.element),
      documentIndex: Array.from(doc.styleSheets).indexOf(sheet.element.sheet),
      enhanced: Boolean(sheet.element.dataset.demoAllowRules),
      rules: Array.from(sheet.element.sheet?.cssRules || [], rule => rule.cssText),
      sharedWith: [...new Set([creators.get(sheet.element),
        ...Object.entries(actors).filter(([, other]) => Object.values(other.renderer.stylesheets)
          .some(otherSheet => otherSheet.element === sheet.element)).map(([name]) => name)])]
        .filter(name => name !== actor),
    }));
    const primary = doc.querySelector(`[data-fluent-owner="${actor}"] [data-fluent-primary]`);
    evidence.matchingComponentRules = entries.filter(entry =>
      entry.rule.style.backgroundColor === "var(--colorBrandBackground)" &&
      primary.matches(entry.rule.selectorText)).map(entry => describeRule(entry, ruleSource));
  }
  result.hostEvidence = hostRuleEvidence([baseline.provider, ...baseline.provider.querySelectorAll("*")],
    baseline.avatar, entries, ruleSource, events, baseline.background);
  result.hostEvidence.sharedWith = Object.entries(result.actors).filter(([, evidence]) =>
    evidence.sheets.some(sheet => sheet.creator === "host")).map(([actor]) => actor);
  const feedbackAvatar = doc.querySelector('[data-fluent-owner="feedback"] [data-fluent-avatar]');
  result.sharedFeedbackClasses = Array.from(baseline.provider.querySelector("[data-fluent-avatar]").classList).filter(name =>
    !name.startsWith("fui-") && feedbackAvatar?.classList.contains(name));
}
