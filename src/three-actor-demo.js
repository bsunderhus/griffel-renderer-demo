import { createDOMRenderer } from "@griffel/core";
import { installHostPolicy } from "./host-policy.js";
import { loadScript } from "./extraction-demo.js";
import { feedbackProfile } from "./feedback-profile.js";

function measure(owner) {
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
  const probe = document.querySelector(`[data-actor-probe="${owner}"]`);
  return {
    icon: read("[data-fluent-icon]"), primary: read("[data-fluent-primary]"),
    avatar: read("[data-fluent-avatar]"),
    avatarOverride: provider.querySelector("[data-avatar-override]") ? read("[data-avatar-override]") : null,
    probeWidth: probe ? getComputedStyle(probe).width : null,
    scoped: provider.classList.contains("demo-contact-scope"),
  };
}

export async function runThreeActorCase(config) {
  const hostMode = new URLSearchParams(location.search).get("host") || "extracted";
  if (!["extracted", "runtime"].includes(hostMode)) throw new Error(`Unknown host mode: ${hostMode}`);
  const extracted = hostMode === "extracted";
  const coverage = new URLSearchParams(location.search).get("coverage") || "shared";
  if (!["shared", "minimal"].includes(coverage)) throw new Error(`Unknown host coverage: ${coverage}`);
  const hostPath = coverage === "shared" ? "/shared" : "";
  const { policy, order } = config;
  document.body.className = "case-page three-actor-page";
  if (new URLSearchParams(location.search).get("view") === "walkthrough") {
    document.body.classList.add("walkthrough-page");
  }
  document.getElementById("root").innerHTML = `
    <div class="actor-grid">
      <section><h2>Host (${hostMode})</h2><div id="host-mount"></div></section>
      <section><h2>Persona (styles limited to its container)</h2><div id="persona-mount">Not mounted</div></section>
      <section ${config.order.includes("feedback") ? "" : "hidden"}><h2>Feedback (separately loaded)</h2><div id="feedback-mount">Not mounted</div></section>
    </div>
    <div id="actor-evidence" aria-live="polite">Loading actors...</div>`;
  let link;
  if (extracted) {
    link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `${hostPath}/griffel.css`;
    await new Promise((resolve, reject) => {
      link.onload = resolve;
      link.onerror = () => reject(new Error("Unable to load extracted host CSS"));
      document.head.appendChild(link);
    });
  }
  await loadScript(`${hostPath}/host-${hostMode}.js`);
  const hostRuntimeCalls = window.reproHost.mount(document.getElementById("host-mount"), extracted);
  const hostBuckets = document.querySelectorAll("[data-make-styles-bucket]").length;
  const stages = [{ phase: "host", host: measure("host"), persona: null, feedback: null }];
  const creators = new Map();
  const registerSheets = actor => {
    for (const element of document.querySelectorAll("[data-make-styles-bucket]")) {
      if (!creators.has(element)) creators.set(element, actor);
    }
  };
  registerSheets("host");
  let phase = "seed";
  const events = [];
  let seed;
  if (config.seed) {
    const seedRenderer = createDOMRenderer(document);
    seedRenderer.insertCSSRules({ d: [".unrelated-host-probe{height:1px}"] });
    seed = seedRenderer.stylesheets.d0.element;
    registerSheets("unrelated");
  }
  installHostPolicy(document, policy, ({ sheet, rule, blocked, reason }) => {
    registerSheets(phase);
    const element = sheet.ownerNode;
    events.push({
      actor: phase, creator: creators.get(element) || "not a Griffel bucket", rule, blocked, reason,
      bucket: element?.getAttribute("data-make-styles-bucket"),
      priority: element?.getAttribute("data-priority"),
      enhanced: Boolean(element?.dataset.demoAllowRules),
      feedbackPrefix: rule.startsWith("/* demo-feedback */"),
      personaScope: rule.includes(".demo-contact-scope"),
    });
  });
  const actors = {};
  for (const actor of order) {
    phase = actor;
    const source = actor === "persona" ? "/persona.js" :
      config.raw ? "/feedback-raw.js" : "/feedback-standard.js";
    await loadScript(source);
    const mount = document.getElementById(`${actor}-mount`);
    mount.replaceChildren();
    actors[actor] = actor === "persona" ? window.personaActor.mount(mount) :
      window.feedbackActor.mount(mount, { salt: config.salt, marker: config.marker });
    registerSheets(actor);
    stages.push({ phase: actor, host: measure("host"), persona: measure("persona"), feedback: measure("feedback") });
  }
  const actorEvidence = Object.fromEntries(Object.entries(actors).map(([name, { renderer }]) => [
    name, {
      measured: measure(name),
      rendererSalt: renderer.classNameHashSalt || null,
      sheets: Object.entries(renderer.stylesheets).map(([key, sheet]) => ({
        key, creator: creators.get(sheet.element), enhanced: Boolean(sheet.element.dataset.demoAllowRules),
        seed: sheet.element === seed,
        rules: Array.from(sheet.element.sheet.cssRules, rule => rule.cssText),
      })),
      cache: Object.keys(renderer.insertionCache),
    },
  ]));
  const result = {
    id: config.id, hostMode, coverage, policy, order,
    feedbackConfig: { raw: Boolean(config.raw), salt: Boolean(config.salt), marker: Boolean(config.marker),
      usesDemoProfile: Boolean(config.raw && config.salt && config.marker),
      demoProfile: feedbackProfile },
    hostRuntimeCalls: hostRuntimeCalls(), hostBuckets, stages, actors: actorEvidence, events,
    staticCSS: link ? Array.from(link.sheet.cssRules, rule => rule.cssText) : [],
    sharedFeedbackClasses: actorEvidence.feedback ? stages[0].host.avatar.classes.filter(name =>
      !name.startsWith("fui-") && actorEvidence.feedback.measured.avatar.classes.includes(name)) : [],
    sheetOrder: Array.from(document.head.querySelectorAll('link[rel="stylesheet"], style[data-make-styles-bucket]'),
      element => element.tagName === "LINK" ? "extracted host CSS" :
        `${element.dataset.makeStylesBucket}/${element.dataset.priority}: ${creators.get(element)}`),
  };
  window.threeActorResult = result;
  const beforeAvatar = stages[0].host.avatarOverride;
  const afterAvatar = stages.at(-1).host.avatarOverride;
  const hostChanged = beforeAvatar.background !== afterAvatar.background;
  const hostStatus = document.createElement("p");
  hostStatus.className = `result ${hostChanged ? "missing" : ""}`;
  hostStatus.textContent = hostChanged ?
    "HOST AVATAR CHANGED: green to orange. Late integration CSS overrides extracted host styling." :
    "Host avatar unchanged: green.";
  document.getElementById("host-mount").parentElement.appendChild(hostStatus);
  for (const [actor, evidence] of Object.entries(actorEvidence)) {
    const actionLabel = actor === "persona" ? "View profile" : "Clear status";
    const attempts = events.filter(event => event.actor === actor && event.bucket);
    const blocked = attempts.filter(event => event.blocked).length;
    const foreignSheets = evidence.sheets.filter(sheet => sheet.creator !== actor);
    const foreignAllowed = attempts.filter(event => !event.blocked && event.creator !== actor).length;
    const status = document.createElement("div");
    const standardStylesMatch = evidence.measured.icon.width === "32px" &&
      evidence.measured.primary.background === "rgb(15, 108, 189)";
    const actionMatches = evidence.measured.probeWidth === "137px";
    const visibleMismatch = !standardStylesMatch || !actionMatches;
    status.className = `result ${visibleMismatch ? "missing" : blocked || foreignSheets.length ? "bypass" : ""}`;
    const outcomes = document.createElement("dl");
    outcomes.className = "actor-outcomes";
    const addOutcome = (name, value) => {
      const term = document.createElement("dt");
      term.textContent = name;
      const definition = document.createElement("dd");
      definition.dataset.outcome = name.toLowerCase();
      definition.textContent = value;
      outcomes.append(term, definition);
    };
    addOutcome("Insertion", blocked ? `${blocked} rules blocked.` : "No rules blocked.");
    addOutcome("Appearance", visibleMismatch ?
      [!actionMatches ? `${actionLabel} expanded` : "", !standardStylesMatch ? "standard controls differ" : ""]
        .filter(Boolean).join("; ") + "." :
      blocked ? "Measured controls match (blocked rules masked)." : "Measured controls match.");
    addOutcome("Ownership", foreignSheets.length ?
      `Reuses sheets from ${[...new Set(foreignSheets.map(sheet => sheet.creator))].join(", ")}.` :
      "Own sheets only.");
    const measurements = document.createElement("p");
    measurements.textContent = actionMatches ?
      `${actionLabel} is compact as intended (137px). ` :
      `VISIBLE WIDTH MISMATCH: ${actionLabel} is ${evidence.measured.probeWidth} wide; intended 137px. `;
    measurements.textContent += standardStylesMatch ?
      (blocked ? "Phone and primary-button styling still matches the baseline; existing shared CSS masks those missing styles." :
        "Phone and primary-button styling matches the baseline.") :
      `Standard controls also differ: phone ${evidence.measured.icon.width}, primary background ${evidence.measured.primary.background}.`;
    status.append(outcomes);
    const widthRule = attempts.find(event => event.rule.includes("width:137px"));
    if (!widthRule) throw new Error(`Missing recorded ${actionLabel} width insertion for ${actor}`);
    const trace = document.createElement("details");
    trace.dataset.ruleTrace = actor;
    const traceLabel = document.createElement("summary");
    traceLabel.textContent = "Measurements and rule evidence";
    const explanation = document.createElement("p");
    explanation.textContent = `${actor} generated width:137px -> bucket ${widthRule.bucket}/${widthRule.priority}, ` +
      `created by ${widthRule.creator} -> enhanced marker ${widthRule.enhanced ? "present" : "absent"}, ` +
      `feedback prefix ${widthRule.feedbackPrefix ? "present" : "absent"} -> ` +
      `${widthRule.blocked ? "blocked" : "allowed"} (${widthRule.reason}). ` +
      `Renderer cache contains rule: ${evidence.cache.includes(widthRule.rule) ? "yes" : "no"}. ` +
      `Computed width: ${evidence.measured.probeWidth}. ` +
      (widthRule.blocked && actionMatches ? "Matching existing CSS masks the rejected rule." :
        widthRule.blocked ? "The intended width is missing." : "The intended width rule was permitted.");
    const rule = document.createElement("code");
    rule.textContent = widthRule.rule;
    const counts = document.createElement("p");
    counts.textContent = `${attempts.length - blocked} rules allowed; ${foreignSheets.length} foreign sheets; ` +
      `${foreignAllowed} insertions allowed into foreign sheets.`;
    trace.append(traceLabel, measurements, counts, explanation, rule);
    status.append(trace);
    document.getElementById(`${actor}-mount`).parentElement.appendChild(status);
  }
  const output = document.getElementById("actor-evidence");
  const description = document.createElement("p");
  description.className = "note";
  description.textContent = `Policy: ${policy}. Order: host -> ${config.seed ? "unrelated d0 -> " : ""}${order.join(" -> ")}. ` +
    `Feedback: ${config.raw ? "raw" : "precompiled"} Fluent, salt ${config.salt ? "on" : "off"}, rule marker ${config.marker ? "on" : "off"}. ` +
    (config.raw && config.salt && config.marker ?
      "Synthetic form profile: raw styles, salted classes, and prefixed rules." :
      "Configuration control: varies the synthetic form profile.");
  const summary = document.createElement("pre");
  summary.textContent = stages.map(stage => {
    const actors = ["host", "persona", "feedback"].filter(actor => stage[actor]).map(actor =>
      `${actor}: avatar ${(stage[actor].avatarOverride || stage[actor].avatar).background}` +
      (stage[actor].icon ? `, icon ${stage[actor].icon.width}, primary ${stage[actor].primary.background}` : "") +
      (stage[actor].probeWidth ? `, secondary action ${stage[actor].probeWidth}` : ""));
    return `After ${stage.phase}: ${actors.join(" | ")}`;
  }).join("\n");
  const decisions = document.createElement("pre");
  decisions.textContent = Object.keys(actors).map(actor => {
    const attempts = events.filter(event => event.actor === actor && event.bucket);
    const blocked = attempts.filter(event => event.blocked).length;
    const foreignAllowed = attempts.filter(event => !event.blocked && event.creator !== actor).length;
    return `${actor}: ${attempts.length} attempts, ${blocked} blocked, ${foreignAllowed} allowed into foreign sheets.\n` +
      actorEvidence[actor].sheets.map(sheet =>
        `  ${sheet.key}: created by ${sheet.creator}, enhanced=${sheet.enhanced}, rules=${sheet.rules.length}`).join("\n");
  }).join("\n");
  decisions.textContent += `\nShared host/feedback avatar classes: ${result.sharedFeedbackClasses.length}`;
  const details = document.createElement("details");
  const label = document.createElement("summary");
  label.textContent = "Full stages, per-rule decisions, destination origins, cache, and CSS";
  const json = document.createElement("pre");
  json.textContent = JSON.stringify(result, null, 2);
  details.append(label, json);
  output.replaceChildren(description, summary, decisions, details);
}
