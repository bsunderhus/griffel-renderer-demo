window.testSourceNativeInsert = CSSStyleSheet.prototype.insertRule;
window.testNativeInsertRule = CSSStyleSheet.prototype.insertRule;
window.testAppearanceStages = [];
function testMeasureAppearance(owner) {
  const provider = document.querySelector(`[data-fluent-owner="${owner}"]`);
  if (!provider) return null;
  const read = selector => {
    const element = provider.querySelector(selector);
    if (!element) return null;
    const css = getComputedStyle(element);
    return {
      width: css.width, height: css.height, minWidth: css.minWidth,
      paddingLeft: css.paddingLeft,
      background: css.backgroundColor, display: css.display,
      classes: Array.from(element.classList),
    };
  };
  return {
    icon: read("[data-fluent-icon]"), primary: read("[data-fluent-primary]"),
    avatar: read("[data-fluent-avatar]"),
    hostAvatar: read("[data-host-avatar]"),
    scoped: provider.classList.contains("demo-contact-scope"),
  };
}
function reportTestApplicationError(message) {
  let owner = window;
  while (owner.frameElement && !owner.frameElement.hasAttribute("data-test-application")) owner = owner.parent;
  if (owner.frameElement) {
    owner.frameElement.dispatchEvent(new owner.parent.CustomEvent("application-error", {
      detail: `${location.href}: ${message}`,
    }));
  }
}
window.addEventListener("error", event => {
  reportTestApplicationError(event.message || `Unable to load ${event.target.src || event.target.href}`);
}, true);
window.addEventListener("unhandledrejection", event => {
  reportTestApplicationError(String(event.reason));
});
for (const [name, key] of [["reproHost", "Host"], ["personaActor", "Persona"], ["feedbackActor", "Feedback"]]) {
  Object.defineProperty(window, name, {
    configurable: true,
    set(module) {
      Object.defineProperty(window, name, { configurable: true, writable: true, value: module });
      const mount = module.mount;
      module.mount = (...args) => {
        const mounted = mount(...args);
        window[`testSource${key}`] = mounted;
        if (key === "Host") {
          window.testSourcePatchedDuringHostMount = CSSStyleSheet.prototype.insertRule !== window.testSourceNativeInsert;
        } else if (key === "Persona") {
          window.testPersonaRenderer = mounted.renderer;
        }
        window.testAppearanceStages.push({
          phase: key.toLowerCase(), host: testMeasureAppearance("host"),
          persona: testMeasureAppearance("persona"), feedback: testMeasureAppearance("feedback"),
        });
        return mounted;
      };
    },
  });
}
