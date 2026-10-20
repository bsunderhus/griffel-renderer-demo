window.testSourceNativeInsert = CSSStyleSheet.prototype.insertRule;
window.testNativeInsertRule = CSSStyleSheet.prototype.insertRule;
window.testAppearanceStages = [];
window.testConsoleErrors = [];
const failurePoint = new URLSearchParams(location.search).get("testFailure");
window.testCleanupCalls = [];
const originalConsoleError = console.error;
console.error = (...args) => {
  window.testConsoleErrors.push(args);
  originalConsoleError.apply(console, args);
};
function testMeasureAppearance(owner) {
  const provider = document.querySelector(`[data-fluent-owner="${owner}"]`);
  if (!provider) {
    return null;
  }
  const read = (selector) => {
    const element = provider.querySelector(selector);
    if (!element) {
      return null;
    }
    const css = getComputedStyle(element);
    return {
      width: css.width,
      height: css.height,
      minWidth: css.minWidth,
      paddingLeft: css.paddingLeft,
      gap: css.gap,
      borderRadius: css.borderRadius,
      boxShadow: css.boxShadow,
      background: css.backgroundColor,
      color: css.color,
      borderColor: css.borderColor,
      borderWidth: css.borderWidth,
      display: css.display,
      classes: Array.from(element.classList),
    };
  };
  return {
    card: read(".fluent-card"),
    icon: read("[data-fluent-icon]"),
    primary: read("[data-fluent-primary]"),
    secondary: read("[data-fluent-secondary]"),
    heading: read("[data-persona-heading]"),
    avatar: read("[data-fluent-avatar]"),
    avatarInitials: read(".fui-Avatar__initials"),
    hostAvatar: read("[data-host-avatar]"),
    scoped: provider.classList.contains("demo-contact-scope"),
  };
}
function reportTestApplicationError(message) {
  let owner = window;
  while (owner.frameElement && !owner.frameElement.hasAttribute("data-test-application")) {
    owner = owner.parent;
  }
  if (owner.frameElement) {
    owner.frameElement.dispatchEvent(
      new owner.parent.CustomEvent("application-error", {
        detail: `${location.href}: ${message}`,
      }),
    );
  }
}
window.addEventListener(
  "error",
  (event) => {
    reportTestApplicationError(
      event.message || `Unable to load ${event.target.src || event.target.href}`,
    );
  },
  true,
);
window.addEventListener("unhandledrejection", (event) => {
  reportTestApplicationError(String(event.reason));
});
for (const [name, key] of [
  ["reproHost", "Host"],
  ["personaActor", "Persona"],
  ["feedbackActor", "Feedback"],
]) {
  Object.defineProperty(window, name, {
    configurable: true,
    set(module) {
      Object.defineProperty(window, name, { configurable: true, writable: true, value: module });
      const mount = module.mount;
      module.mount = (...args) => {
        const mounted = mount(...args);
        window[`testSource${key}`] = mounted;
        if (key === "Host") {
          window.testSourcePatchedDuringHostMount =
            CSSStyleSheet.prototype.insertRule !== window.testSourceNativeInsert;
        } else if (key === "Persona") {
          window.testPersonaRenderer = mounted.renderer;
        }
        window.testAppearanceStages.push({
          phase: key.toLowerCase(),
          host: testMeasureAppearance("host"),
          persona: testMeasureAppearance("persona"),
          feedback: testMeasureAppearance("feedback"),
        });
        if (failurePoint) {
          for (const action of ["unmount", "dispose"]) {
            if (!mounted[action]) {
              continue;
            }
            const original = mounted[action];
            mounted[action] = () => {
              window.testCleanupCalls.push(`${key}:${action}`);
              return original();
            };
          }
          const fail = () => {
            const error = new Error(`Injected ${failurePoint} failure`);
            window.testInjectedError = error;
            throw error;
          };
          if (key === "Host" && failurePoint === "baseline") {
            const query = document.querySelector;
            document.querySelector = function (selector) {
              if (selector === '[data-fluent-owner="host"]') {
                document.querySelector = query;
                fail();
              }
              return query.call(this, selector);
            };
          }
          if (key === "Persona") {
            window.testOriginalPersonaInsert = mounted.renderer.insertCSSRules;
            if (failurePoint === "renderer-observation") {
              const descriptor = Object.getOwnPropertyDescriptor(
                mounted.renderer,
                "insertCSSRules",
              );
              Object.defineProperty(mounted.renderer, "insertCSSRules", {
                configurable: true,
                get() {
                  Object.defineProperty(mounted.renderer, "insertCSSRules", descriptor);
                  return fail();
                },
              });
            }
            if (failurePoint === "sheet-registration") {
              const query = document.querySelectorAll;
              document.querySelectorAll = function (selector) {
                if (selector === "[data-make-styles-bucket]") {
                  document.querySelectorAll = query;
                  fail();
                }
                return query.call(this, selector);
              };
            }
          }
        }
        return mounted;
      };
    },
  });
}
