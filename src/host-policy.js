export const FEEDBACK_PREFIX = "/* demo-feedback */";

// Demonstration policy based on destination metadata and an optional rule prefix.
// Instrumentation is separate from the policy decision.
export function installHostPolicy(doc, mode, onAttempt) {
  if (!doc.defaultView) throw new Error("Host policy needs a window-backed document");
  const proto = doc.defaultView.CSSStyleSheet.prototype;
  const original = proto.insertRule;
  proto.insertRule = function (rule, index) {
    const node = this.ownerNode;
    const dataset = node?.nodeName === "STYLE" ? node.dataset : undefined;
    const shouldPrevent = Boolean(dataset?.makeStylesBucket) && !dataset.demoAllowRules;
    const blocked = mode !== "off" && shouldPrevent &&
      !(mode === "feedback-exception" && rule.startsWith(FEEDBACK_PREFIX));
    const reason = blocked ? "blocked" : mode === "off" ? "filter disabled" :
      !dataset?.makeStylesBucket ? "not a Griffel bucket" : dataset.demoAllowRules ?
        "enhanced sheet" : "feedback rule prefix";
    onAttempt({ sheet: this, rule, blocked, reason });
    if (blocked) {
      console.error("[demo host filter] Runtime style insertion blocked.");
      return 0;
    }
    return original.call(this, rule, index);
  };
  return () => { proto.insertRule = original; };
}
