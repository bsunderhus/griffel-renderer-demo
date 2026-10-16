import { createDOMRenderer } from "@griffel/core";
import { installHostPolicy } from "./host-policy.js";
import { loadScript } from "./extraction-demo.js";
import { feedbackProfile } from "./feedback-profile.js";
import { avatarBackgroundEvidence, describeRule, hostRuleEvidence, readStyleRules } from "./rule-evidence.js";

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
  // Collapsed gallery disclosures have no layout, even inside their iframes.
  while (!document.documentElement.getClientRects().length) {
    await new Promise(requestAnimationFrame);
  }
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
  const sheetIds = new Map();
  const nativeRules = new Map();
  const ruleSources = new WeakMap();
  const registerSheets = actor => {
    for (const element of document.querySelectorAll("[data-make-styles-bucket]")) {
      if (!creators.has(element)) {
        creators.set(element, actor);
        sheetIds.set(element, `sheet-${sheetIds.size + 1}`);
      }
    }
  };
  registerSheets("host");
  const ruleSource = entry => ruleSources.get(entry.rootRule)?.actor ||
    (entry.sheet === link?.sheet ? "host" : creators.get(entry.sheet.ownerNode) || "page");
  const hostProvider = document.querySelector('[data-fluent-owner="host"]');
  const hostElements = [hostProvider, ...hostProvider.querySelectorAll("*")];
  const hostAvatar = hostProvider.querySelector("[data-avatar-override]");
  const baselineBackground = avatarBackgroundEvidence(hostAvatar, readStyleRules(document), ruleSource);
  let phase = "seed";
  const events = [];
  let scheduleEvidence;
  let seed;
  if (config.seed) {
    const seedRenderer = createDOMRenderer(document);
    seedRenderer.insertCSSRules({ d: [".unrelated-host-probe{height:1px}"] });
    seed = seedRenderer.stylesheets.d0.element;
    registerSheets("unrelated");
  }
  installHostPolicy(document, policy, ({ sheet, rule, blocked, reason, inserted, index, error }) => {
    registerSheets(phase);
    const element = sheet.ownerNode;
    const event = {
      id: events.length + 1,
      actor: phase, creator: creators.get(element) || "not a Griffel bucket", rule, blocked, reason,
      destination: sheetIds.get(element) || null,
      inserted, cssText: inserted ? sheet.cssRules[index].cssText : null, error: error || null,
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
    scheduleEvidence?.();
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
    const renderer = actors[actor].renderer;
    const insert = renderer.insertCSSRules.bind(renderer);
    renderer.insertCSSRules = rules => {
      const previous = phase;
      phase = actor;
      try {
        return insert(rules);
      } finally {
        phase = previous;
      }
    };
    registerSheets(actor);
    stages.push({ phase: actor, host: measure("host"), persona: measure("persona"), feedback: measure("feedback") });
  }
  phase = "external";
  const actorEvidence = Object.fromEntries(Object.entries(actors).map(([name, { renderer }]) => [
    name, {
      measured: measure(name),
      rendererSalt: renderer.classNameHashSalt || null,
      sheets: Object.entries(renderer.stylesheets).map(([key, sheet]) => ({
        key, id: sheetIds.get(sheet.element), creator: creators.get(sheet.element),
        documentIndex: Array.from(document.styleSheets).indexOf(sheet.element.sheet),
        enhanced: Boolean(sheet.element.dataset.demoAllowRules),
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
  function presentEvidence() {
    const openTraces = new Set(Array.from(document.querySelectorAll("[data-rule-trace][open], [data-host-rule-trace][open]"),
      element => element.dataset.ruleTrace || "host"));
    const openLedgers = new Set(Array.from(document.querySelectorAll("[data-rule-ledger][open]"),
      element => element.dataset.ruleLedger));
    const fullEvidenceOpen = document.querySelector("#actor-evidence details")?.open;
    for (const element of document.querySelectorAll("[data-actor-status]")) element.remove();
    const entries = readStyleRules(document);
    const liveRules = new Map(Array.from(document.styleSheets, sheet => [sheet, new Set(Array.from(sheet.cssRules))]));
    for (const event of events) {
      const native = nativeRules.get(event.id);
      event.present = Boolean(native && liveRules.get(native.sheet)?.has(native.rule) &&
        native.rule.cssText === event.cssText);
      event.equivalentPresent = Boolean(native && Array.from(liveRules.get(native.sheet) || [])
        .some(rule => rule.cssText === event.cssText));
    }
    for (const [actor, evidence] of Object.entries(actorEvidence)) {
      evidence.cache = Object.keys(actors[actor].renderer.insertionCache);
      evidence.sheets = Object.entries(actors[actor].renderer.stylesheets).map(([key, sheet]) => ({
        key, id: sheetIds.get(sheet.element), creator: creators.get(sheet.element),
        documentIndex: Array.from(document.styleSheets).indexOf(sheet.element.sheet),
        enhanced: Boolean(sheet.element.dataset.demoAllowRules), seed: sheet.element === seed,
        rules: Array.from(sheet.element.sheet.cssRules, rule => rule.cssText),
        sharedWith: [...new Set([creators.get(sheet.element),
          ...Object.entries(actors).filter(([, other]) => Object.values(other.renderer.stylesheets)
            .some(otherSheet => otherSheet.element === sheet.element)).map(([name]) => name)])]
          .filter(name => name !== actor),
      }));
      const probe = document.querySelector(`[data-actor-probe="${actor}"]`);
      evidence.matchingWidthEvidence = entries.filter(entry => entry.rule.style.width === "137px" &&
        probe.matches(entry.rule.selectorText)).map(entry => describeRule(entry, ruleSource));
      evidence.matchingWidthRules = evidence.matchingWidthEvidence.map(entry => entry.cssText);
      evidence.borrowedPermission = events.filter(event => event.actor === actor && !event.blocked &&
        event.reason === "enhanced sheet" && event.creator !== actor &&
        !(policy === "feedback-exception" && event.feedbackPrefix)).length;
    }
    result.hostEvidence = hostRuleEvidence(hostElements, hostAvatar, entries, ruleSource, events, baselineBackground);
    const hostEvidence = result.hostEvidence;
    hostEvidence.sharedWith = Object.entries(actorEvidence).filter(([, evidence]) =>
      evidence.sheets.some(sheet => sheet.creator === "host")).map(([actor]) => actor);
    const background = hostEvidence.avatarBackground;
    const hostStatus = document.createElement("div");
    hostStatus.dataset.actorStatus = "host";
    hostStatus.className = `result ${background.changed ? "missing" :
      background.changed === null || hostEvidence.foreignWrites || hostEvidence.foreignRules.length ||
        hostEvidence.sharedWith.length ? "bypass" : ""}`;
    const hostSummary = document.createElement("p");
    hostSummary.textContent = `Host CSS: ${hostMode}; ${hostBuckets} initial Griffel sheets; ` +
      `${result.hostRuntimeCalls} runtime insertion calls. ` +
      `Host-created destinations retained by: ${hostEvidence.sharedWith.join(", ") || "no integrations"}. ` +
      `${hostEvidence.foreignWrites} native foreign insertions into host-created sheets. ` +
      `${hostEvidence.foreignRules.length} foreign CSS rules currently match host elements.`;
    const hostProbe = document.createElement("p");
    hostProbe.dataset.hostBackground = "";
    hostProbe.textContent = background.changed === null ? "Avatar background declaration: unresolved by the bounded CSSOM probe." :
      `Avatar background declaration: ${background.changed ? "CHANGED" : "unchanged"}; ` +
      `${background.baseline.value} (${background.baseline.actor}) -> ${background.current.value} (${background.current.actor}).`;
    const hostTrace = document.createElement("details");
    hostTrace.dataset.hostRuleTrace = "";
    hostTrace.open = openTraces.has("host");
    const hostLabel = document.createElement("summary");
    hostLabel.textContent = "Host selector matches and background declaration evidence";
    const hostScope = document.createElement("p");
    hostScope.textContent = "Sheet writes, selector matches, and a changed declaration are different facts. " +
      "Matching foreign CSS can be harmless duplication. The avatar probe resolves only unconditional, " +
      "single-class background declarations by importance and source order; it is not a full host or appearance audit.";
    const hostJSON = document.createElement("pre");
    hostJSON.textContent = JSON.stringify(hostEvidence, null, 2);
    hostTrace.append(hostLabel, hostScope, hostJSON);
    hostStatus.append(hostSummary, hostProbe, hostTrace);
    document.getElementById("host-mount").parentElement.appendChild(hostStatus);
    for (const [actor, evidence] of Object.entries(actorEvidence)) {
      const actionLabel = actor === "persona" ? "View profile" : "Clear status";
      const attempts = events.filter(event => event.actor === actor && event.bucket);
      const blocked = attempts.filter(event => event.blocked).length;
      const failed = attempts.filter(event => !event.blocked && !event.inserted).length;
      const foreignSheets = evidence.sheets.filter(sheet => sheet.creator !== actor);
      const foreignAllowed = attempts.filter(event => !event.blocked && event.creator !== actor).length;
      const presentRules = attempts.filter(event => event.present).length;
      const sharedWith = [...new Set(evidence.sheets.flatMap(sheet => sheet.sharedWith))];
      const status = document.createElement("div");
      status.dataset.actorStatus = actor;
      status.className = `result ${attempts.some(event => event.blocked || event.inserted && !event.equivalentPresent) ?
        "missing" : failed || sharedWith.length || attempts.some(event => event.inserted && !event.present) ? "bypass" : ""}`;
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
      addOutcome("Insertion", (blocked ? `${blocked} rules blocked.` : "No rules blocked.") +
        (failed ? ` ${failed} native insertions failed.` : ""));
      addOutcome("Rules", `${presentRules}/${attempts.length} recorded native rules present in destination CSSOM.`);
      addOutcome("Ownership", foreignSheets.length ?
        `Reuses sheets from ${[...new Set(foreignSheets.map(sheet => sheet.creator))].join(", ")}.` :
        sharedWith.length ? "Creates its sheets, but does not use them exclusively." : "Own sheets only.");
      addOutcome("Sharing", sharedWith.length ? `Sheet handles also held by ${sharedWith.join(", ")}.` :
        "No shared destination handles recorded.");
      addOutcome("Permission", `${evidence.borrowedPermission} attempts rely on another actor's sheet marker.`);
      status.append(outcomes);
      const widthRule = attempts.find(event => event.rule.includes("width:137px"));
      if (!widthRule) throw new Error(`Missing recorded ${actionLabel} width insertion for ${actor}`);
      const trace = document.createElement("details");
      trace.dataset.ruleTrace = actor;
      const traceLabel = document.createElement("summary");
      traceLabel.textContent = "Generated CSS and rule evidence";
      const explanation = document.createElement("p");
      const widthInCSSOM = widthRule.present;
      const matchingWidth = evidence.matchingWidthRules.length > 0;
      explanation.textContent = `Selected rule only: ${actionLabel}. ${actor} generated width:137px -> ${widthRule.destination}, bucket ${widthRule.bucket}/${widthRule.priority}, ` +
        `created by ${widthRule.creator} -> enhanced marker ${widthRule.enhanced ? "present" : "absent"}, ` +
        `feedback prefix ${widthRule.feedbackPrefix ? "present" : "absent"} -> ` +
        `${widthRule.blocked ? "blocked" : "allowed"} (${widthRule.reason}). ` +
        `Native insertion: ${widthRule.inserted ? "succeeded" : widthRule.blocked ? "not attempted" : `failed (${widthRule.error})`}. ` +
        `Recorded rule in destination CSSOM: ${widthInCSSOM ? "yes" : "no"}. ` +
        `Equivalent serialized rule in destination CSSOM: ${widthRule.equivalentPresent ? "yes" : "no"}. ` +
        `Renderer cache contains rule: ${evidence.cache.includes(widthRule.rule) ? "yes" : "no"}. ` +
        `Matching 137px CSSOM rules: ${evidence.matchingWidthRules.length}. ` +
        (widthRule.blocked && matchingWidth ?
          "Other width rules match the action, but this actor's recorded rule was still blocked." :
          widthInCSSOM ? "The generated width rule is present in destination CSSOM." :
          widthRule.equivalentPresent ? "The original native rule is gone, but equivalent CSS remains in its destination." :
          "The generated width rule is absent from destination CSSOM.");
      const rule = document.createElement("code");
      rule.textContent = widthRule.rule;
      const counts = document.createElement("p");
      counts.textContent = `${attempts.length - blocked} rules allowed; ${attempts.filter(event => event.inserted).length} native insertions succeeded; ${foreignSheets.length} foreign sheets; ` +
        `${foreignAllowed} insertions allowed into foreign sheets.`;
      const matchingRules = document.createElement("pre");
      matchingRules.dataset.matchingWidthRules = actor;
      matchingRules.textContent = evidence.matchingWidthRules.join("\n") || "No matching 137px CSSOM rules.";
      const matchingSources = document.createElement("p");
      matchingSources.textContent = `Matching width rule writers: ${[...new Set(evidence.matchingWidthEvidence
        .map(entry => entry.actor))].join(", ") || "none"}. Matching is not proof of the selected insertion.`;
      const ledger = document.createElement("details");
      ledger.dataset.ruleLedger = actor;
      ledger.open = openLedgers.has(actor);
      const ledgerLabel = document.createElement("summary");
      ledgerLabel.textContent = `All recorded insertion attempts (${attempts.length})`;
      const ledgerRules = document.createElement("pre");
      ledgerRules.textContent = attempts.map(event =>
        `#${event.id} ${event.destination} (${event.creator}), ${event.bucket}/${event.priority}: ` +
        `${event.blocked ? "BLOCKED" : "ALLOWED"} (${event.reason}); ` +
        `native=${event.inserted ? "inserted" : event.blocked ? "not attempted" : `rejected: ${event.error}`}; ` +
        `recorded native rule present=${event.present}; equivalent CSS=${event.equivalentPresent}; ` +
        `cached=${evidence.cache.includes(event.rule)}\n${event.rule}`).join("\n\n");
      ledger.append(ledgerLabel, ledgerRules);
      trace.open = openTraces.has(actor);
      trace.append(traceLabel, counts, explanation, rule, matchingSources, matchingRules, ledger);
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
    summary.textContent = stages.map(stage =>
      `After ${stage.phase}: ${["host", "persona", "feedback"].filter(actor => stage[actor]).join(", ")} mounted.`
    ).join("\n");
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
    details.open = Boolean(fullEvidenceOpen);
    const label = document.createElement("summary");
    label.textContent = "Full stages, per-rule decisions, destination origins, cache, and CSS";
    const json = document.createElement("pre");
    json.textContent = JSON.stringify(result, null, 2);
    details.append(label, json);
    output.replaceChildren(description, summary, decisions, details);
  }
  presentEvidence();
  window.threeActorResult = result;
  let refresh;
  scheduleEvidence = () => {
    cancelAnimationFrame(refresh);
    refresh = requestAnimationFrame(() => {
      if (document.documentElement.getClientRects().length) presentEvidence();
    });
  };
  window.addEventListener("resize", scheduleEvidence);
}
