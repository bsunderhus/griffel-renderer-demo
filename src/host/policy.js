const FEEDBACK_PREFIX = "/* demo-feedback */";
const installations = new WeakMap();

// Demonstration policy based on destination metadata and an optional rule prefix.
// Instrumentation is separate from the policy decision.
export function installHostPolicy(doc, mode, onAttempt) {
  if (!doc.defaultView) throw new Error("Host policy needs a window-backed document");
  if (!["master", "feedback-exception"].includes(mode)) throw new Error(`Unknown host policy: ${mode}`);
  const installed = installations.get(doc);
  if (installed) {
    if (onAttempt) installed.subscribe(onAttempt);
    return installed;
  }
  const proto = doc.defaultView.CSSStyleSheet.prototype;
  const original = proto.insertRule;
  const listeners = new Set(onAttempt ? [onAttempt] : []);
  const report = event => { for (const listener of listeners) listener(event); };
  proto.insertRule = function (rule, index) {
    const node = this.ownerNode;
    const dataset = node?.nodeName === "STYLE" ? node.dataset : undefined;
    const shouldPrevent = Boolean(dataset?.makeStylesBucket) && !dataset.demoAllowRules;
    const blocked = shouldPrevent &&
      !(mode === "feedback-exception" && rule.startsWith(FEEDBACK_PREFIX));
    const reason = blocked ? "blocked" :
      !dataset?.makeStylesBucket ? "not a Griffel bucket" : dataset.demoAllowRules ?
        "enhanced sheet" : "feedback rule prefix";
    if (blocked) {
      report({ sheet: this, rule, blocked, reason, inserted: false });
      console.error("[demo host filter] Runtime style insertion blocked.");
      return 0;
    }
    let insertedIndex;
    try {
      insertedIndex = original.call(this, rule, index);
    } catch (error) {
      report({ sheet: this, rule, blocked, reason, inserted: false, error: error.message });
      throw error;
    }
    report({ sheet: this, rule, blocked, reason, inserted: true, index: insertedIndex });
    return insertedIndex;
  };
  const restore = () => {
    if (installations.get(doc) !== restore) return;
    proto.insertRule = original;
    installations.delete(doc);
    listeners.clear();
  };
  restore.subscribe = listener => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  installations.set(doc, restore);
  return restore;
}
