export function readStyleRules(doc) {
  const entries = [];
  const view = doc.defaultView;
  function visit(rules, sheet, sheetIndex, path = [], rootRule) {
    Array.from(rules).forEach((rule, index) => {
      if (rule instanceof view.CSSMediaRule && !view.matchMedia(rule.conditionText).matches) return;
      if (rule instanceof view.CSSSupportsRule && !view.CSS.supports(rule.conditionText)) return;
      const position = [...path, index];
      if (rule instanceof view.CSSStyleRule) {
        entries.push({ rule, sheet, rootRule: rootRule || rule, position: [sheetIndex, ...position],
          unconditional: position.length === 1 && !sheet.media.mediaText });
      }
      if (rule.cssRules) visit(rule.cssRules, sheet, sheetIndex, position, rootRule || rule);
    });
  }
  Array.from(doc.styleSheets).forEach((sheet, index) => {
    if (!sheet.disabled && (!sheet.media.mediaText || view.matchMedia(sheet.media.mediaText).matches)) {
      visit(sheet.cssRules, sheet, index);
    }
  });
  return entries;
}

export function describeRule(entry, source) {
  return {
    actor: source(entry), selector: entry.rule.selectorText, cssText: entry.rule.cssText,
    position: entry.position,
  };
}

// This deliberately proves only the fixture's simple-class, unlayered background cascade.
export function avatarBackgroundEvidence(element, entries, source) {
  const candidates = entries.filter(entry => entry.rule.style.getPropertyValue("background-color") &&
    element.matches(entry.rule.selectorText));
  if (element.style.getPropertyValue("background-color") || !candidates.length ||
      candidates.some(entry => !entry.unconditional || !/^\.[\w-]+$/.test(entry.rule.selectorText))) {
    return { resolved: false, reason: "Outside the simple-class, unconditional background probe." };
  }
  const important = candidates.filter(entry => entry.rule.style.getPropertyPriority("background-color") === "important");
  const winner = (important.length ? important : candidates).at(-1);
  return {
    resolved: true, ...describeRule(winner, source),
    value: winner.rule.style.getPropertyValue("background-color"),
    priority: winner.rule.style.getPropertyPriority("background-color"),
  };
}

export function hostRuleEvidence(elements, avatar, entries, source, events, baselineBackground) {
  const foreignRules = [];
  for (const entry of entries) {
    const actor = source(entry);
    if (actor === "host" || actor === "page") continue;
    const targets = elements.flatMap((element, index) => element.matches(entry.rule.selectorText) ?
      [element === avatar ? "host avatar initials" : `host element ${index}: ${element.localName}`] : []);
    if (targets.length) foreignRules.push({ ...describeRule(entry, source), targets });
  }
  const currentBackground = avatarBackgroundEvidence(avatar, entries, source);
  return {
    foreignWrites: events.filter(event => event.actor !== "host" && event.creator === "host" && event.inserted).length,
    foreignRules,
    avatarBackground: {
      baseline: baselineBackground, current: currentBackground,
      changed: baselineBackground.resolved && currentBackground.resolved ?
        baselineBackground.value !== currentBackground.value ||
          baselineBackground.priority !== currentBackground.priority : null,
      scope: "CSSOM background-color declaration on host avatar initials only; not computed appearance or a full host audit.",
    },
  };
}
