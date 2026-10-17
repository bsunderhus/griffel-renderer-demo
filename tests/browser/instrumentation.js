window.testSourceNativeInsert = CSSStyleSheet.prototype.insertRule;
window.testNativeInsertRule = CSSStyleSheet.prototype.insertRule;
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
        return mounted;
      };
    },
  });
}
