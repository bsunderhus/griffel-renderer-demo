import React, { useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { createDOMRenderer } from "@griffel/core";
import { RendererProvider, makeStyles } from "@griffel/react";

const APPROVAL = "data-standalone-approved";
const RULE_MARKER = "/* standalone-allowed */";
const useStyles = makeStyles({ probe: { width: "137px" } });

function Probe({ finish }) {
  const styles = useStyles();
  useLayoutEffect(() => finish(), [finish]);
  return <div className="track"><div className={`probe ${styles.probe}`} data-probe>Width should be 137px</div>
    <div className="expected-width">137px reference</div></div>;
}

export function runCase(config) {
  document.body.className = "case-page";
  const rootNode = document.getElementById("root");
  rootNode.innerHTML = '<div class="integration-scope" id="sample"></div><div id="evidence" aria-live="polite">Running...</div>';
  let seed;
  if (config.seed !== "none") {
    // A real first renderer creates the sheet before the tested renderer mounts.
    const first = createDOMRenderer(document, {
      styleElementAttributes: config.seed === "approved" ? { [APPROVAL]: "true" } : undefined,
    });
    first.insertCSSRules({ d: [".seed{height:1px}"] });
    seed = first.stylesheets.d0.element;
    // Leave an empty existing sheet so all visible rules belong to the probe.
    seed.sheet.deleteRule(0);
  }
  const nativeInsert = CSSStyleSheet.prototype.insertRule;
  let blocked = 0;
  let attempts = 0;
  CSSStyleSheet.prototype.insertRule = function (rule, index) {
    attempts++;
    const element = this.ownerNode;
    const needsApproval = element?.hasAttribute("data-make-styles-bucket") && !element.hasAttribute(APPROVAL);
    if (config.policy !== "none" && needsApproval &&
        !(config.policy === "rule" && rule.startsWith(RULE_MARKER))) {
      blocked++;
      console.error("[standalone host policy] Blocked rule in unapproved sheet:", rule);
      return 0;
    }
    return nativeInsert.call(this, rule, index);
  };
  const renderer = createDOMRenderer(document, {
    classNameHashSalt: config.salt,
    styleElementAttributes: config.foreign ? undefined : { [APPROVAL]: "true" },
  });
  const originalInsert = renderer.insertCSSRules.bind(renderer);
  let capturedRules;
  renderer.insertCSSRules = rules => {
    const transformed = Object.fromEntries(Object.entries(rules).map(([bucket, entries]) => [
      bucket,
      entries.map(entry => {
        const transform = rule => `${config.markRule ? RULE_MARKER : ""}${config.foreign ? "" : ".integration-scope "}${rule}`;
        return typeof entry === "string" ? transform(entry) : [transform(entry[0]), entry[1]];
      }),
    ]));
    capturedRules = transformed;
    originalInsert(transformed);
  };
  function finish() {
    const activeRenderer = renderer;
    const sheet = activeRenderer.stylesheets.d0;
    const beforeRetry = sheet.element.sheet.cssRules.length;
    if (config.retry) {
      CSSStyleSheet.prototype.insertRule = nativeInsert;
      originalInsert(capturedRules);
    }
    const result = {
      id: config.id,
      adopted: sheet.element === seed,
      markedDestination: sheet.element.hasAttribute(APPROVAL),
      rules: sheet.element.sheet.cssRules.length,
      blocked,
      attempts,
      beforeRetry,
      cachedRules: Object.keys(activeRenderer.insertionCache),
      width: getComputedStyle(document.querySelector("[data-probe]")).width,
      className: document.querySelector("[data-probe]").className,
      attributes: Object.fromEntries(Array.from(sheet.element.attributes, attr => [attr.name, attr.value])),
      css: Array.from(sheet.element.sheet.cssRules, rule => rule.cssText),
    };
    window.reproResult = result;
    const evidence = document.getElementById("evidence");
    const status = document.createElement("div");
    status.className = `result ${result.rules === 0 ? "missing" : config.foreign ? "bypass" : ""}`;
    status.textContent = result.rules === 0 ? "MISSING STYLE: width rule never reached CSSOM" :
      config.foreign ? "POLICY BYPASS: unrelated renderer's rule was allowed" : "STYLE PRESENT: width is 137px";
    const details = document.createElement("pre");
    details.textContent = [
      `Reused first sheet: ${result.adopted} | Destination approved: ${result.markedDestination}`,
      `insertRule attempts: ${attempts} | Blocked: ${blocked} | CSSOM rules: ${result.rules}`,
      `Computed width: ${result.width} | Cached rules: ${result.cachedRules.length}`,
      `Sheet: ${JSON.stringify(result.attributes)}`,
      `Rule: ${result.cachedRules.join("\n")}`,
      ...(config.retry ? [`After native insertion restored + replay: ${result.rules} rules (still cached)`] : []),
    ].join("\n");
    evidence.replaceChildren(status, details);
  }
  flushSync(() => createRoot(document.getElementById("sample")).render(
    <RendererProvider renderer={renderer} targetDocument={document}>
      <Probe finish={finish} />
    </RendererProvider>
  ));
}

