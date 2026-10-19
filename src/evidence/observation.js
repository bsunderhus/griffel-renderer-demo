import { observeNativeInsertions } from "./native-observer.js";

export function createObservation(doc, hostStylesheet) {
  const creators = new Map();
  const sheetIds = new Map();
  const nativeRules = new Map();
  const ruleSources = new WeakMap();
  const events = [];
  const restoreRenderers = [];
  let actor = "external";
  let mountIndex = null;
  let onChange = () => {};
  let disconnect = () => {};

  function registerSheets(creator) {
    for (const element of doc.querySelectorAll("[data-make-styles-bucket]")) {
      if (!creators.has(element)) {
        creators.set(element, creator);
        sheetIds.set(element, `sheet-${sheetIds.size + 1}`);
      }
    }
  }

  function withActor(name, action, index = null) {
    const previous = actor;
    const previousIndex = mountIndex;
    actor = name;
    mountIndex = index;
    try {
      return action();
    } finally {
      actor = previous;
      mountIndex = previousIndex;
    }
  }

  function observeRenderer(name, renderer, index) {
    const original = renderer.insertCSSRules;
    renderer.insertCSSRules = (rules) =>
      withActor(name, () => original.call(renderer, rules), index);
    let active = true;
    const restore = () => {
      if (!active) {
        return;
      }
      active = false;
      renderer.insertCSSRules = original;
    };
    restoreRenderers.push(restore);
    return restore;
  }

  function record({ sheet, rule, blocked, reason, inserted, index, error }) {
    registerSheets(actor);
    const element = sheet.ownerNode;
    const event = {
      id: events.length + 1,
      actor,
      mountIndex,
      creator: creators.get(element) || "not a Griffel bucket",
      rule,
      blocked,
      reason,
      destination: sheetIds.get(element) || null,
      inserted,
      cssText: inserted ? sheet.cssRules[index].cssText : null,
      error: error || null,
      bucket: element?.getAttribute("data-make-styles-bucket"),
      priority: element?.getAttribute("data-priority"),
      enhanced: Boolean(element?.dataset.demoAllowRules),
      feedbackPrefix: rule.startsWith("/* demo-feedback */"),
      personaScope: rule.includes(".demo-contact-scope"),
    };
    events.push(event);
    if (inserted) {
      const nativeRule = sheet.cssRules[index];
      nativeRules.set(event.id, { sheet, rule: nativeRule });
      ruleSources.set(nativeRule, event);
    }
    onChange();
  }

  registerSheets("host");
  return {
    creators,
    sheetIds,
    nativeRules,
    events,
    registerSheets,
    withActor,
    observeRenderer,
    record,
    connectHost(host) {
      disconnect();
      disconnect = host.contract.shouldInstall
        ? host.subscribeInsertions(record)
        : observeNativeInsertions(doc, record);
    },
    ruleSource: (entry) =>
      ruleSources.get(entry.rootRule)?.actor ||
      (entry.sheet === hostStylesheet?.sheet
        ? "host"
        : creators.get(entry.sheet.ownerNode) || "page"),
    onChange(listener) {
      onChange = listener;
    },
    dispose() {
      onChange = () => {};
      disconnect();
      for (const restore of restoreRenderers.reverse()) {
        restore();
      }
    },
  };
}
