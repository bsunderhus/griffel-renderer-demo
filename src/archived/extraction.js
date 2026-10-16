import { createDOMRenderer } from "@griffel/core";
import { loadScript } from "../experiments/assets.js";

function inspect(element) {
  const style = getComputedStyle(element);
  return { paddingLeft: style.paddingLeft, background: style.backgroundColor,
    width: style.width, classes: Array.from(element.classList) };
}

function inspectFluent(owner) {
  const root = document.querySelector(`[data-fluent-owner="${owner}"]`);
  const inspectControl = selector => {
    const element = root.querySelector(selector);
    if (!element) return null;
    const style = getComputedStyle(element);
    return {
      width: style.width, height: style.height, minWidth: style.minWidth,
      display: style.display, background: style.backgroundColor, color: style.color,
      borderWidth: style.borderTopWidth, borderRadius: style.borderTopLeftRadius,
      classes: Array.from(element.classList),
    };
  };
  return {
    primary: inspectControl("[data-fluent-primary]"),
    icon: inspectControl("[data-fluent-icon]"),
    avatar: inspectControl("[data-fluent-avatar]"),
    textarea: inspectControl("[data-fluent-textarea]"),
  };
}

export async function runExtractionCase(config, mode) {
  const extracted = mode === "extracted";
  document.body.className = "case-page extraction-page";
  document.getElementById("root").innerHTML = `
    <div id="before-snapshot"></div><p>Live host after integration:</p>
    <div id="host-mount"></div><p id="host-before"></p>
    <div class="track" id="integration-mount"></div>
    <div id="extraction-evidence" aria-live="polite">Loading host...</div>`;
  let link;
  if (extracted) {
    link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/griffel.css";
    await new Promise((resolve, reject) => {
      link.onload = resolve;
      link.onerror = () => reject(new Error("Unable to load extracted CSS"));
      document.head.appendChild(link);
    });
  }
  await loadScript(`/host-${mode}.js`);
  const { runtimeCalls } = window.reproHost.mount(document.getElementById("host-mount"), extracted);
  const host = document.querySelector("[data-host]");
  const before = inspect(host);
  const fluentBefore = inspectFluent("host");
  const bucketsBefore = document.querySelectorAll("[data-make-styles-bucket]").length;
  const snapshot = document.createElement("p");
  snapshot.textContent = `Host avatar before integration: background ${before.background}.`;
  document.getElementById("before-snapshot").replaceChildren(snapshot);
  document.getElementById("host-before").textContent =
    `Before integration: avatar background ${before.background}; host runtime insertion calls: ${runtimeCalls()}.`;
  const creators = new Map(Array.from(document.querySelectorAll("[data-make-styles-bucket]"),
    element => [element, "host"]));
  let seed;
  if (config.seed) {
    const first = createDOMRenderer(document, {
      styleElementAttributes: config.seed === "approved" ? { "data-standalone-approved": "true" } : undefined,
    });
    first.insertCSSRules({ ...(config.seed === "approved" ? { r: [".seed-reset{height:1px}"] } : {}),
      d: [".seed-atomic{height:1px}"] });
    seed = first.stylesheets.d0.element;
    for (const sheet of Object.values(first.stylesheets)) creators.set(sheet.element, "third renderer");
  }
  const native = CSSStyleSheet.prototype.insertRule;
  const events = [];
  CSSStyleSheet.prototype.insertRule = function (rule, index) {
    const owner = this.ownerNode;
    const denied = config.policy !== "none" &&
      owner?.hasAttribute("data-make-styles-bucket") &&
      !owner.hasAttribute("data-standalone-approved") &&
      !(config.policy === "rule" && rule.startsWith("/* standalone-allowed */"));
    events.push({ rule, blocked: denied, bucket: owner?.getAttribute("data-make-styles-bucket"),
      approved: owner?.hasAttribute("data-standalone-approved") });
    if (denied) {
      console.error("[extracted-host simulation] Blocked:", rule);
      return 0;
    }
    return native.call(this, rule, index);
  };
  await loadScript("/integration.js");
  const renderer = window.runtimeIntegration.mount(document.getElementById("integration-mount"), config);
  const after = inspect(host);
  const integration = inspect(document.querySelector("[data-integration]"));
  const fluentAfter = inspectFluent("host");
  const fluentIntegration = inspectFluent("integration");
  const fluentStyleChanged = Object.keys(fluentBefore).filter(control => {
    if (!fluentBefore[control]) return false;
    const { classes: beforeClasses, ...beforeStyles } = fluentBefore[control];
    const { classes: afterClasses, ...afterStyles } = fluentAfter[control];
    return JSON.stringify(beforeStyles) !== JSON.stringify(afterStyles);
  });
  const result = {
    id: config.id, mode, before, after, integration,
    fluentBefore, fluentAfter, fluentIntegration, fluentStyleChanged,
    sharedFluentClasses: fluentAfter.avatar.classes.filter(name =>
      !name.startsWith("fui-") && fluentIntegration.avatar.classes.includes(name)),
    hostPadding: after.paddingLeft,
    hostChanged: before.paddingLeft !== after.paddingLeft || before.background !== after.background,
    width: integration.width, blocked: events.filter(event => event.blocked).length,
    fixtureBlocked: events.filter(event => event.blocked &&
      (event.rule.includes("width:137px") || event.rule.includes("{background-color:#e8a33d"))).length,
    adopted: renderer.stylesheets.d0.element === seed,
    hostRuntimeCalls: runtimeCalls(), bucketsBefore,
    adoptedHost: creators.get(renderer.stylesheets.d0.element) === "host",
    sheetOrder: Array.from(document.head.querySelectorAll('link[rel="stylesheet"], style[data-make-styles-bucket]'),
      element => element.tagName === "LINK" ? "extracted CSS" :
        `${element.dataset.makeStylesBucket}${element.dataset.priority}: ${creators.get(element) || "integration"}`),
    sharedClasses: after.classes.filter(name =>
      document.querySelector('[data-fluent-owner="integration"] [data-avatar-override]').classList.contains(name) &&
      Array.from(document.styleSheets).some(sheet => Array.from(sheet.cssRules).some(rule =>
        rule.selectorText === `.${name}` && rule.style.backgroundColor === "rgb(232, 163, 61)"))),
    staticCSS: link ? Array.from(link.sheet.cssRules, rule => rule.cssText) : [],
    events,
    sheets: Object.entries(renderer.stylesheets).map(([key, sheet]) => ({
      key, approved: sheet.element.hasAttribute("data-standalone-approved"),
      creator: creators.get(sheet.element) || "integration",
      rules: Array.from(sheet.element.sheet.cssRules, rule => rule.cssText),
    })),
    cache: Object.keys(renderer.insertionCache),
  };
  window.extractionResult = result;
  const status = document.createElement("div");
  status.className = `result ${result.blocked ? "missing" : result.hostChanged || fluentStyleChanged.length ? "bypass" : ""}`;
  status.textContent = fluentStyleChanged.length ?
    "FLUENT HOST CHANGED" :
    result.hostChanged ? "HOST AVATAR CHANGED: late runtime CSS overrides its demo styling" :
    result.blocked ? "RUNTIME RULES BLOCKED (shared host CSS may still style controls)" :
    "HOST UNCHANGED; INTEGRATION STYLED";
  const details = document.createElement("pre");
  details.textContent = [
    `Host padding: ${before.paddingLeft} -> ${after.paddingLeft}`,
    `Host background: ${before.background} -> ${after.background}`,
    `Integration Clear status width: ${integration.width} (demo override: 137px)`,
    `Host runtime insertion calls: ${runtimeCalls()} | Initial host buckets: ${bucketsBefore}`,
    `Adopted host's d0: ${result.adoptedHost}`,
    `Adopted third renderer's d0: ${result.adopted} | Blocked rules: ${result.blocked}`,
    `Document sheet order: ${result.sheetOrder.join(" -> ")}`,
    `Shared generated classes: ${result.sharedClasses.join(", ") || "none"}`,
    `Fluent host controls changed: ${fluentStyleChanged.join(", ") || "none"}`,
    `Fluent host avatar background: ${fluentBefore.avatar.background} -> ${fluentAfter.avatar.background}`,
    `Fluent integration icon width: ${fluentIntegration.icon.width} (normal 32px)`,
    `Fluent integration primary background: ${fluentIntegration.primary.background}`,
    `Shared Fluent primary classes: ${result.sharedFluentClasses.length}`,
    `Runtime sheets: ${JSON.stringify(result.sheets.map(({ rules, ...sheet }) => ({ ...sheet, rules: rules.length })))}`,
  ].join("\n");
  const disclosure = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = "Inspect static CSS, runtime rules, and cache";
  const css = document.createElement("pre");
  css.textContent = JSON.stringify({ fluent: { before: fluentBefore, after: fluentAfter, integration: fluentIntegration },
    extracted: result.staticCSS, sheets: result.sheets, insertions: events, cache: result.cache }, null, 2);
  disclosure.append(summary, css);
  document.getElementById("extraction-evidence").replaceChildren(status, details, disclosure);
}
