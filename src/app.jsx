import React, { useLayoutEffect } from "react";
import * as ReactDOMClient from "react-dom/client";
import * as ReactDOM from "react-dom";
import { createDOMRenderer } from "@griffel/core";
import { RendererProvider, makeStyles } from "@griffel/react";
import { cases } from "./cases.js";
import { extractionCases } from "./extraction-cases.js";
import { runExtractionCase } from "./extraction-demo.js";
import { threeActorCases } from "./three-actor-cases.js";
import { runThreeActorCase } from "./three-actor-demo.js";

const { createRoot } = ReactDOMClient;
const { flushSync } = ReactDOM;
window.React = React;
window.ReactDOM = ReactDOM;
window.ReactDOMClient = ReactDOMClient;

const APPROVAL = "data-standalone-approved";
const RULE_MARKER = "/* standalone-allowed */";
const useStyles = makeStyles({ probe: { width: "137px" } });

function Probe({ finish }) {
  const styles = useStyles();
  useLayoutEffect(() => finish(), [finish]);
  return <div className="track"><div className={`probe ${styles.probe}`} data-probe>Width should be 137px</div>
    <div className="expected-width">137px reference</div></div>;
}

function runCase(config) {
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

function Navigation({ mode }) {
  return <nav aria-label="Demonstrations">
    <a href="/" aria-current={mode === "three-actors" ? "page" : undefined}>Integration playground</a>
    {mode !== "three-actors" && <span>Archived diagnostic: {mode}</span>}
  </nav>;
}

function Gallery({ mode }) {
  const mechanisms = mode === "mechanisms";
  return <main>
    <Navigation mode={mode} />
    <h1>Griffel: shared sheets, different insertion policies</h1>
    <p>Two independent renderers share a document. One expects its sheets to carry an approval marker.
      Griffel's <code>RendererProvider</code> can adopt an existing sheet without that marker instead.
      A simulated host filter checks the destination sheet, not the renderer that produced a rule.</p>
    <p className="note"><strong>Synthetic local examples.</strong> React, Griffel, and a small explicit host-policy simulation only.
      Sheet adoption alone is not a missing-style failure: compare cases 2 and 3.
      Red and amber outcomes are intentional evidence, not test-run failures.</p>
    <button onClick={() => window.location.reload()}>Replay all cases</button>
    {mechanisms ?
    <div className="grid">{cases.map(config => <section className="card" key={config.id}>
      <h2>{config.title}</h2><p><strong>The story: </strong>{config.description}</p>
      <iframe title={config.title} src={`/mechanisms?case=${config.id}`} />
    </section>)}</div> :
    <section id="comparison-section">
    <h2 className="section-title">{mode === "extracted" ? "Extracted" : "Non-extracted"} host + runtime integration</h2>
    <p>Both pages use the same host source, integration bundle, scenarios, and presentation.
      Only the host build changes: {mode === "extracted" ?
        <>Griffel extracts the host styles into a <a href="/griffel.css">generated stylesheet</a>.</> :
        <>the host inserts its styles at runtime.</>}
      {" "}The simulated filter is enabled per scenario on both pages, not automatically by extraction.
      Different outcomes are evidence, not differences in the fixture.</p>
    <p className="note">Both host and integration now render real Fluent UI: <strong>Avatar with presence,
      icon-only Button, primary Button, Label, and Textarea</strong> inside FluentProvider.
      Demo overrides are part of the card: the host's avatar has green styling,
      and the integration's Clear status button has a 137px width.
      Salt applies to our raw fixture styles; Fluent's default precompiled classes remain shared.
      Blocked runtime insertion does not necessarily remove styles already supplied by the host.</p>
    <div className="grid">{extractionCases.map(config => <section className="card" key={config.id}>
      <h2>{config.title}</h2><p><strong>The story: </strong>{config.description}</p>
      <iframe className="extraction-frame" title={config.title} src={`/${mode}?scenario=${config.id}`} />
    </section>)}</div>
    </section>}
  </main>;
}

function ThreeActorGallery() {
  const params = new URLSearchParams(location.search);
  const hostMode = params.get("host") || "extracted";
  const coverage = params.get("coverage") || "shared";
  if (!["shared", "minimal"].includes(coverage)) throw new Error(`Unknown host coverage: ${coverage}`);
  if (!["extracted", "runtime"].includes(hostMode)) throw new Error(`Unknown host mode: ${hostMode}`);
  const navigate = changes => {
    const next = new URLSearchParams(location.search);
    for (const [key, value] of Object.entries(changes)) next.set(key, value);
    location.assign(`/?${next}`);
  };
  return <main>
    <Navigation mode="three-actors" />
    <h1>How shared Griffel sheets break integrations</h1>
    <p>What happens when an application and two integrations add styles to the same page?
      The main examples show how one integration can lose its styling. Additional explanatory
      controls explore why this happens and how integration CSS can change the
      application's appearance—even when each uses its own style renderer.</p>
    <details className="intro-help">
    <summary>Who is on the page?</summary>
    <ul>
      <li><strong>Host:</strong> the application that loads the integrations. It also installs a
        filter that allows or blocks new style rules.</li>
      <li><strong>Persona:</strong> a synthetic contact-card integration.
        Its style selectors include a parent class, so they only match elements inside the
        Persona container. This is what <strong>scoped</strong> means here—not a separate
        document or a private stylesheet.</li>
      <li><strong>Feedback:</strong> a form loaded as a separate JavaScript bundle, with its own
        style renderer. This is what <strong>independently loaded</strong> means here.
        It still shares the page and can reuse the same style sheets as the other participants.</li>
    </ul>
    <p>A <strong>Griffel renderer</strong> turns component styles into CSS rules and puts them
      into style sheets. Separate renderers can reuse an existing sheet on the page.
      The host's filter checks the destination sheet and, in some examples, a marker on
      the rule—not which integration is trying to insert it. That distinction drives these failures.</p>
    <p>Each scenario starts in a fresh document. In the selected mode, the host
      {hostMode === "extracted" ?
        <> loads CSS prepared during the build (<strong>extracted CSS</strong>).</> :
        <> adds CSS while the page runs (<strong>runtime CSS</strong>).</>}
      {" "}Persona and Feedback always add their rules while the page runs.</p>
    </details>
    <details className="intro-help">
    <summary>What should I look for?</summary>
    <p>The host avatar should stay <strong>green</strong>; an unexpected change to orange
      shows a style collision. The integration phone buttons should be compact and primary actions
      blue. Persona's <strong>View profile</strong> and Feedback's <strong>Clear status</strong>
      should be 137px wide. A lost width rule lets these secondary actions
      stretch across their columns. These custom colors and widths make the styling
      mechanisms visible; they do not represent a particular product's design.</p>
    <p>Under each integration, <strong>Insertion</strong> reports whether rules reached the sheet,
      <strong> Appearance</strong> reports the measured visual checks, and
      <strong> Ownership</strong> reports whose sheets were reused.
      A normal-looking control does not prove its own rules were inserted: existing CSS may
      supply the same styling.</p>
    </details>
    <details className="intro-help conflict-guide">
      <summary>How they interfere with each other</summary>
      <p><strong>Separate bundles and renderers do not guarantee separate style sheets.</strong>
        There are three different boundaries to follow: where a rule goes, whether it is allowed
        in, and which elements it affects.</p>
      <ol className="mechanism-flow" aria-label="Style rule journey">
        <li><strong>1. Choose a sheet</strong><span>Griffel reuses a matching bucket and priority.</span></li>
        <li><strong>2. Check permission</strong><span>The host checks sheet markers and, when supported, the rule prefix.</span></li>
        <li><strong>3. Apply CSS</strong><span>The browser matches selectors and resolves competing declarations.</span></li>
      </ol>
      <div className="table-scroll">
        <table>
          <caption>What each participant changes</caption>
          <thead><tr><th scope="col">Participant</th><th scope="col">Contribution</th><th scope="col">Effect on others</th></tr></thead>
          <tbody>
            <tr><th scope="row">Host</th><td>Existing CSS and an insertion filter.</td>
              <td>Can supply missing styles, block new rules, or be affected by matching integration CSS.</td></tr>
            <tr><th scope="row">Contact-card integration</th><td>Container-prefixed selectors and demo-approval sheet markers.</td>
              <td>Its marked sheets can permit foreign rules. Adopting an unmarked sheet can block its own rules.</td></tr>
            <tr><th scope="row">Form integration</th><td>In the demo profile: salted generated classes and prefixed rules.</td>
              <td>Can create sheets Persona later adopts, or reuse Persona's sheets. Neither salt nor a rule prefix makes a sheet private.</td></tr>
          </tbody>
        </table>
      </div>
      <h3>1. Where does the rule go?</h3>
      <p>Griffel groups rules into <strong>buckets</strong> (such as ordinary rules or hover rules)
        and ordering <strong>priorities</strong>. In the adoption path modeled here, a renderer
        finds an existing sheet by that key—not by integration owner, class-name salt, or
        demo-approval marker. The first matching sheet can become a later renderer's destination.</p>
      <pre aria-label="Sheet adoption example">{`Feedback creates:  bucket d / priority 0 / unmarked
Persona looks for: bucket d / priority 0
                   -> reuses Feedback's sheet
                   -> does NOT add Persona's marker to it`}</pre>
      <h3>2. Is the rule allowed in?</h3>
      <p>The host filter checks the <strong>destination</strong>, not the identity of the caller.
        An demo-approval marker permits insertion; the demonstration rule exception also
        permits rules beginning with <code>/* demo-feedback */</code>. The master filter does not recognize that prefix.</p>
      <div className="table-scroll">
        <table>
          <caption>Same integrations, different arrival order (with the Feedback exception)</caption>
          <thead><tr><th scope="col">Arrival order</th><th scope="col">Sheet reused</th><th scope="col">Consequence</th></tr></thead>
          <tbody>
            <tr><th scope="row">Feedback → Persona</th><td>Feedback's unmarked sheet.</td>
              <td>Feedback's prefixed rules pass. Persona's unprefixed rules are blocked.</td></tr>
            <tr><th scope="row">Persona → Feedback</th><td>Persona's marked sheet.</td>
              <td>Both can insert into that sheet. This is shared permission, not independent ownership.</td></tr>
          </tbody>
        </table>
      </div>
      <p>Permission is <strong>per destination</strong>: if Feedback's textarea needs a bucket Persona
        never created, its new sheet does not inherit Persona's marker. One renderer can therefore
        have both allowed and blocked rules.</p>
      <h3>3. What does the browser show?</h3>
      <p>Once a rule reaches CSS, bundle ownership is irrelevant: it applies wherever its selector
        matches. This produces two different effects:</p>
      <ul>
        <li><strong>Masking:</strong> an existing matching rule from the host or another integration
          supplies the styling, even though the current renderer's rule was blocked.</li>
        <li><strong>Collision:</strong> competing declarations match the same element. In our
          constructed avatar example, a late unsalted reset overrides the extracted host's green background.</li>
      </ul>
      <pre aria-label="Illustrative selector boundaries">{`/* Scoping: restrict which elements match */
.demo-contact-scope .example { width: 137px; }

/* Salt: change a runtime-generated class name */
.example -> .differentGeneratedName

/* Prefix: identify a rule to a compatible host filter */
/* demo-feedback */ .differentGeneratedName { width: 137px; }`}</pre>
      <p>These selectors are illustrative. <strong>Scoping limits matches; salt separates generated
        names; a prefix identifies rules.</strong> None prevents sheet adoption. Runtime salt also
        does not rename Fluent classes already generated at build time.</p>
      <h3>Why rerendering may not repair a missing style</h3>
      <pre aria-label="Rejected rule cache sequence">{`Griffel records rule in insertion cache
  -> calls the sheet's insertRule
  -> host filter rejects it without throwing
  -> rule absent from CSS, but present in renderer cache
  -> a later insertion attempt may be skipped as already handled`}</pre>
      <p>This is why each live example reports <strong>Insertion</strong>, <strong>Appearance</strong>,
        and <strong>Ownership</strong> separately. Its expandable rule evidence connects these
        mechanisms to an actual recorded rule, rather than inferring success from appearance.</p>
    </details>
    <details className="note"><summary>Technical provenance and model limits</summary>
    <p>These are synthetic local examples using public libraries. The demonstration form profile
      uses salt <code>demo-feedback</code>, a matching rule prefix, and raw component styles.
      Configuration controls vary these settings to isolate their effects.
      No product integration or deployment is represented. Similar-looking controls can hide blocked rules, and
      permission leakage does not necessarily cause visible damage.</p>
    </details>
    <details className="host-settings" open={hostMode === "runtime" || coverage === "minimal"}>
      <summary>Advanced host control</summary>
      <label htmlFor="host-coverage">Host component coverage </label>
      <select id="host-coverage" value={coverage} onChange={event => navigate({ coverage: event.target.value })}>
        <option value="shared">Shared components (Avatar, Button, Label, Textarea)</option>
        <option value="minimal">Minimal (Avatar only)</option>
      </select>
      <p>This chooses which components the host itself uses. With shared components, the host
        may already supply styles an integration needs, hiding the effect of blocked rules.
        The minimal host uses only an avatar, so it cannot supply the missing button or text-box styles.
        The integrations themselves do not change.</p>
      <label htmlFor="host-mode">Host CSS </label>
      <select id="host-mode" value={hostMode} onChange={event => navigate({ host: event.target.value })}>
        <option value="extracted">Extracted (main reproduction)</option>
        <option value="runtime">Runtime (non-extracted control)</option>
      </select>
      <p>Runtime mode changes only the host build, not the integrations or filter predicates.
        The filter is deliberately installed after the host mounts: this is a diagnostic control,
        not a claim that a non-extracted production host enables this filter.
        Its pre-existing unmarked buckets can cause even story 1 to lose persona overrides.</p>
      <button onClick={() => location.reload()}>Replay all scenarios</button>
    </details>
    {["source", "controls"].map(group => {
      const source = group === "source";
      const content = <>
        <p>{source ?
          "These five synthetic examples introduce sheet adoption, load order, and insertion filtering using a consistent demonstration configuration." :
          "These seven controls vary the demonstration configuration or use a constructed shared reset to explain class collisions, masking, and insertion permissions."}</p>
        {source && hostMode === "runtime" && <p className="note">
          Runtime host mode is an experimental control for every example below, not a recommended production configuration.
        </p>}
    {threeActorCases.filter(config => Boolean(config.primaryExample) === source).map((config, index) => {
      const sharedDescriptions = {
        "persona-alone": "The host form supplies extracted Fluent CSS. Persona creates its own enhanced sheets and inserts its scoped rules successfully. The host avatar stays green, and Persona's controls keep their intended appearance.",
        "feedback-first": "Feedback creates unmarked sheets first; both integrations' rules are blocked. Shared host CSS keeps their phone and blue primary actions styled, but cannot supply the custom 137px secondary-action rule: both secondary actions expand.",
        "raw-marked-first": "Raw, salted, marked feedback inserts successfully. Persona adopts its unmarked sheets and is blocked. Shared host CSS masks Persona's missing standard button rules, but its View profile action expands. Feedback remains styled.",
        "master-rejects-marker": "The master filter rejects feedback's prefix and blocks both integrations. Shared host CSS masks Persona's missing standard button styling, but salted Feedback cannot borrow it and visibly degrades. Both secondary actions expand.",
      };
      const description = coverage === "shared" ? sharedDescriptions[config.id] || config.description : config.description;
      return <section className="card walkthrough" id={config.id} key={config.id}>
        <h2>{source ? index + 1 : `Control ${index + 1}`}. {config.title}</h2>
        <ol className="load-order" aria-label="Load order">
          {["Host", ...(config.seed ? ["Unrelated style sheet"] : []),
            ...config.order.map(actor => actor === "persona" ? "Persona" : "Feedback")].map(step =>
            <li key={step}>{step}</li>)}
        </ol>
        <p className="scenario-takeaway"><strong>What this demonstrates: </strong>{config.takeaway}
          {hostMode === "runtime" && <> This is the extracted-host takeaway; the selected runtime-host
            experiment changes the sheets available before integrations load.</>}
        </p>
        <iframe className="walkthrough-frame"
          title={config.title}
          src={`/three-actors?scenario=${config.id}&view=walkthrough&host=${hostMode}&coverage=${coverage}`} />
        <details className="scenario-details"><summary>Technical details</summary>
          <p>{hostMode === "extracted" ? description :
            `Repeat "${config.title}" with host-created runtime buckets already present and ${coverage} component coverage. ${config.policy === "off" ?
              "The filter is off, so both integrations insert successfully." :
              `Persona's rules are blocked in the host's unmarked sheets. ${coverage === "shared" ?
                "Host CSS can mask standard button failures." : "Without host button CSS, missing standard styles are exposed unless Feedback supplies matching classes."}`}
            The host avatar stays green because runtime reset sheets precede atomic overrides. Inspect the measured statuses above.`}</p>
          <a href={`/three-actors?scenario=${config.id}&host=${hostMode}&coverage=${coverage}`}>Open isolated scenario with full rule evidence</a>
        </details>
      </section>;
    })}
      </>;
      return source ? <section key={group} aria-label="Primary integration examples">
        <h2 className="section-title">Primary integration examples</h2>{content}
      </section> : <details key={group} className="explanatory-controls"
        open={threeActorCases.some(config => !config.primaryExample && location.hash === `#${config.id}`)}>
        <summary>Explanatory controls (7) — alternative configurations and collision experiments</summary>
        {content}
      </details>;
    })}
  </main>;
}

const caseId = new URLSearchParams(location.search).get("case");
const scenarioId = new URLSearchParams(location.search).get("scenario");
const mode = location.pathname.slice(1) || "three-actors";
if (!["three-actors", "extracted", "runtime", "mechanisms"].includes(mode)) throw new Error(`Unknown route: ${mode}`);
if (scenarioId && mode === "three-actors") {
  const config = threeActorCases.find(item => item.id === scenarioId);
  if (!config) throw new Error(`Unknown three-actor case: ${scenarioId}`);
  runThreeActorCase(config).catch(error => {
    console.error(error);
    document.getElementById("actor-evidence").textContent = `ERROR: ${error.message}`;
    window.threeActorError = error.message;
  });
} else if (mode === "three-actors") {
  createRoot(document.getElementById("root")).render(<ThreeActorGallery />);
} else if (scenarioId && mode !== "mechanisms") {
  const config = extractionCases.find(item => item.id === scenarioId);
  if (!config) throw new Error(`Unknown scenario: ${scenarioId}`);
  runExtractionCase(config, mode).catch(error => {
    console.error(error);
    document.getElementById("extraction-evidence").textContent = `ERROR: ${error.message}`;
    window.extractionError = error.message;
  });
} else if (caseId) {
  const config = cases.find(item => item.id === caseId);
  if (!config) throw new Error(`Unknown case: ${caseId}`);
  runCase(config);
} else {
  createRoot(document.getElementById("root")).render(<Gallery mode={mode} />);
}
