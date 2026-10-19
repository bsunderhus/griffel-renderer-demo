import React from "react";
import { personaRevisions } from "../experiments/scenarios.js";
import { sitePath } from "../site.js";

export function ParticipantResponsibilities() {
  return <div className="participant-responsibilities" aria-label="Participant responsibilities">
        <article data-participant="host">
          <h3>The host: “My styles are already built”</h3>
          <p>The host extracts its own component styles into a CSS file for the production/extracted
            build. It supplies a <strong>no-op renderer</strong> so its components do not insert
            those styles again. This does not extract the separately loaded integrations' CSS.</p>
          <p>It patches <code>CSSStyleSheet.prototype.insertRule</code> for the document,
            allowing runtime writes to Griffel sheets with a truthy enhanced-specificity
            attribute and blocking buckets without one.
            Separate Griffel bundles still call that same browser API.</p>
          <p>The prefix-aware variant adds a second route: allow a rule starting with Feedback's
            comment. This inspected exception is an <strong>unmerged proposal</strong>,
            not a shipped-host claim. The runtime-host control installs no filter.</p>
        </article>
        <article data-participant="persona">
          <h3>Persona: “I need scoped runtime styles”</h3>
          <p>Persona supplies its own renderer to <code>RendererProvider</code>. The pinned release
            and main snapshot create one renderer per mounted provider. An adapter rewrites
            rules under a parent selector and requests an enhanced-specificity attribute on newly created
            style elements.</p>
          <p>The parent selector increases specificity; the enhanced-specificity attribute does not.
            Scoping is not a separate document or a private stylesheet. Requesting the
            enhanced-specificity attribute does not add it to an adopted, existing sheet.</p>
          <p><strong>Persona 1.20260927.13.2</strong> retains incompatible adopted handles.
            The <strong>main snapshot (2026-10-16)</strong> discards handles without the exact
            enhanced-specificity attribute value before insertion. That is not exclusive sheet ownership.</p>
        </article>
        <article data-participant="feedback">
          <h3>Feedback: “I bring my own runtime styles”</h3>
          <p>The inspected profile uses its own <strong>module-level renderer</strong>, reused
            across mounts of that module. It salts runtime-generated class names and prepends
            a recognizable comment to its rules. It does not request Persona's enhanced-specificity
            attribute.</p>
          <p>The salt changes class names, not stylesheet selection. The comment identifies a
            rule, not its destination sheet. Neither prevents adoption: Feedback still shares
            the page and may reuse another renderer's sheets.</p>
          <p>The sheet-only host does not recognize that comment. The proposed host exception
            does, but only for Feedback's own prefixed rules.</p>
        </article>
      </div>;
}

export function MechanismGuide({ hostMode, personaVersion, expanded = false }) {
  const revision = personaRevisions[personaVersion];
  function scenarioLink(id, hostPolicy) {
    const params = new URLSearchParams(location.search);
    if (hostPolicy) params.set("hostPolicy", hostPolicy);
    return sitePath(`${params.size ? `?${params}` : ""}#${id}`);
  }
  function versionLink(id, version) {
    const params = new URLSearchParams(location.search);
    params.set("personaVersion", version);
    return sitePath(`?${params}#${id}`);
  }
  return <>
    <details className="intro-help conflict-guide" open={expanded}>
      <summary>Technical reference: renderers, rules and evidence</summary>
      <p data-renderer-summary>With both integrations mounted, this fixture has <strong>three
        active participant renderer roles</strong>: host, Persona and Feedback.
        {hostMode === "extracted" ?
          <> The extracted host's renderer is a no-op; the other two are DOM renderers.</> :
          <> In runtime mode, all three are DOM renderers, and the primary host filter is off.</>}
        {" "}This is a fixture count, not a claim about a complete application.</p>
      <p data-model-version>Selected primary configuration: <strong>{revision.label}</strong>;
        {" "}{hostMode === "extracted" ? "production/extracted host" : "runtime host"}.
        Use Persona version and Host filter revision in Advanced host control to rerun the same baseline schedules.
        The comparison below distinguishes both revisions rather than assuming the upstream fix
        is deployed by the consuming host.</p>
      <details className="conflict-walkthrough">
        <summary>Follow the renderers, enhanced-specificity attributes and conflicts step by step</summary>
        <h3>1. A renderer is not a stylesheet</h3>
        <p>A renderer keeps insertion-cache state and handles to sheets for different Griffel
          buckets and priorities. It can use many sheets; two renderers can retain the same
          native <code>CSSStyleSheet</code>. <code>RendererProvider</code> supplies the chosen
          renderer to components and hydrates compatible existing buckets. It does not make
          those sheets private or create another independent renderer for each component.</p>
        <ul aria-label="Renderer counts">
          <li><strong>Persona alone:</strong> host + Persona = two active participant renderers.</li>
          <li><strong>Persona and Feedback:</strong> host + Persona + Feedback = three.</li>
        </ul>
        <p>These counts include the extracted host's no-op renderer. Wrapping Persona's base
          renderer to rewrite rules is not an additional independent Griffel renderer.
          More mounted providers can create more Persona renderers.</p>
        <h3>2. Follow one generated rule</h3>
        <ol className="mechanism-flow" aria-label="Style rule journey">
          <li><strong>Generate CSS</strong><span>Component styles produce class names and rules; Persona scopes its rules, while Feedback salts names and prefixes rules.</span></li>
          <li><strong>Choose a sheet</strong><span>Existing hydrated handles or newly created sheets supply a bucket/priority destination.</span></li>
          <li><strong>Check insertion</strong><span>The host patch checks the destination and optional prefix, then either skips or calls native insertion.</span></li>
          <li><strong>Inspect the CSSOM</strong><span>Only rules the browser accepts are present; matching selectors determine which elements they can affect.</span></li>
        </ol>
        <p>Hydration may already have selected handles before the component renders. A key such
          as <code>d0</code> means a default bucket at a priority; it is not an Persona or Feedback
          ownership label. Adopting a handle points a renderer at the existing sheet: it does
          not copy the rules, move the sheet, or apply the adopter's requested attributes.
          The host's extracted CSS file can supply matching declarations, but is not an
          runtime Griffel style bucket to adopt.</p>
        <h3>3. Where does the enhanced-specificity attribute enter?</h3>
        <p>The inspected contract calls the attribute <code>data-enhanced-specificity="true"</code>.
          This playground uses the fictional equivalent <code>data-demo-allow-rules="true"</code>.
          The browser gives neither name special behavior. <strong>The attribute does not
          increase CSS specificity.</strong> Persona's extra parent selector does that; the
          attribute becomes an insertion-permission signal only because the host reads it.</p>
        <pre aria-label="Sheet with the enhanced-specificity attribute example">{`New Persona bucket (local enhanced-specificity attribute name):
  <style data-make-styles-bucket="d"
         data-demo-allow-rules="true">...</style>

Existing Feedback bucket:
  <style data-make-styles-bucket="d">...</style>`}</pre>
        <div className="table-scroll">
          <table>
            <caption>Who writes or reads the enhanced-specificity attribute?</caption>
            <thead><tr><th scope="col">Step</th><th scope="col">Responsibility</th><th scope="col">What it does not establish</th></tr></thead>
            <tbody>
              <tr><th scope="row">Persona creates a sheet</th><td>Its renderer options request the enhanced-specificity attribute on that new style element.</td>
                <td>Existing adopted sheets are not relabeled.</td></tr>
              <tr><th scope="row">Griffel adopts a sheet</th><td>Hydration selects an existing bucket/priority handle.</td>
                <td>The sheet's attributes do not authenticate the new writer.</td></tr>
              <tr><th scope="row">Host checks an insertion</th><td>The patch reads the destination sheet's owner style element. Griffel buckets without a truthy enhanced-specificity attribute are blocked unless an enabled exception accepts the rule.</td>
                <td>The patch does not check which renderer generated that rule.</td></tr>
              <tr><th scope="row">Persona main checks a handle</th><td>Before insertion, it drops handles whose recorded enhanced-specificity attribute value is not exactly <code>"true"</code>.</td>
                <td>It does not remove the foreign sheet, repair Feedback's rules, or stop later foreign adoption.</td></tr>
            </tbody>
          </table>
        </div>
        <p>The host's enhanced-specificity attribute test is truthiness-based, while the main snapshot requires the
          exact string <code>"true"</code>. For example, the string <code>"false"</code> is
          truthy to the host but fails Persona's guard. Neither check is an ownership or security boundary.</p>
        <p>The inspected sheet-only filter blocks Griffel <code>STYLE</code> buckets without
          a truthy enhanced-specificity attribute,
          not every style operation. Provider theme styles and non-bucket sheets are separate.
          The proposed exception additionally recognizes an exact leading rule prefix, shown
          here as <code>/* demo-feedback */</code>. A comment has no permission effect without
          host code recognizing it.</p>
        <h3>4. Evaluate the conflicts, not just the load order</h3>
        <pre aria-label="Missing Persona rule sequence">{`Feedback creates a default bucket without the enhanced-specificity attribute
  -> Persona 1.20260927.13.2 adopts that handle
  -> Persona attempts its own container-scoped atomic rule
  -> Host sees the destination still lacks the enhanced-specificity attribute
  -> native insertion is skipped
  -> the element can keep its class, but the scoped rule is absent`}</pre>
        <p>A prefix exception can permit Feedback's own rule without adding the enhanced-specificity attribute to its sheet or
          permitting Persona's unprefixed rule. The main-snapshot guard instead discards that
          incompatible handle and lets Persona create a destination with the enhanced-specificity attribute. It does not
          add that attribute to the original sheet.</p>
        <p><strong>Reverse direction:</strong> Persona creates a sheet with the enhanced-specificity attribute first; Feedback
          can adopt it and write into it. With a sheet-only filter, the enhanced-specificity attribute can
          supply permission to a foreign writer. With the proposed prefix exception,
          Feedback already has independent permission, so sharing that sheet is not proof
          of a necessary bypass. New buckets Feedback creates still have no enhanced-specificity attribute.</p>
        <div className="table-scroll">
          <table>
            <caption>Fluent-rule outcomes with production extraction enabled</caption>
            <thead><tr><th scope="col">Existing scenario</th><th scope="col">Host filter</th><th scope="col">Feedback rule</th><th scope="col">Persona 1.20260927.13.2 rule</th><th scope="col">Persona main-snapshot rule</th></tr></thead>
            <tbody>
              <tr><th scope="row"><a href={scenarioLink("persona-alone", "master")}>Persona alone</a></th><td>Sheet-only</td><td>Not mounted</td><td>Inserts into sheet with the enhanced-specificity attribute</td><td>Inserts into sheet with the enhanced-specificity attribute</td></tr>
              <tr><th scope="row"><a href={scenarioLink("raw-marked-first", "master")}>Feedback first</a></th><td>Sheet-only (inspected host main)</td><td>Rejected</td><td>Rejected in adopted sheet</td><td>Inserts into destination with the enhanced-specificity attribute</td></tr>
              <tr><th scope="row"><a href={scenarioLink("raw-marked-first", "feedback-exception")}>Feedback first</a></th><td>Prefix exception (unmerged)</td><td>Inserts by prefix</td><td>Rejected in adopted sheet</td><td>Inserts into destination with the enhanced-specificity attribute</td></tr>
              <tr><th scope="row"><a href={scenarioLink("persona-first-raw", "master")}>Persona first</a></th><td>Sheet-only</td><td>Shared buckets allowed; new buckets rejected</td><td>Inserts</td><td>Inserts</td></tr>
              <tr><th scope="row"><a href={scenarioLink("persona-first-raw", "feedback-exception")}>Persona first</a></th><td>Prefix exception (unmerged)</td><td>Inserts; shares sheets with the enhanced-specificity attribute</td><td>Inserts</td><td>Inserts</td></tr>
            </tbody>
          </table>
        </div>
        <p>This table follows a real Fluent primary Button background rule, not every rule a component needs.
          An allowed call can still fail native parsing; parser errors are not host-policy
          rejections.</p>
        <p className="note">Runtime-host comparison: the primary production/extraction gate
          disables filtering, and both Persona revisions insert the tracked rules across baseline schedules.
          Adoption alone is not the missing-rule failure.</p>
        <h3>5. Why can classes and cache survive a rejected rule?</h3>
        <pre aria-label="Rejected rule cache sequence">{`Griffel records rule in insertion cache
  -> calls the sheet's insertRule
  -> host filter rejects it without throwing
  -> rule absent from CSS, but present in renderer cache
  -> a later insertion attempt may be skipped as already handled`}</pre>
        <p>The filter returns <code>0</code> without calling native insertion. Zero is also a
          valid native insertion index: the return value alone cannot prove a rule exists.
          This explains how assigned atomic classes and a populated cache can coexist with
          missing scoped definitions. Compare the
          {" "}<a href={versionLink("raw-marked-first", "1.20260927.13.2")}>pinned release</a>
          {" "}and <a href={versionLink("raw-marked-first", "main-2026-10-16")}>main snapshot</a>
          {" "}using the same Feedback actor, host build and coverage.</p>
        <h3>6. Separate missing rules, sharing and host damage</h3>
        <ul>
          <li><strong>Missing rule:</strong> this actor's generated rule never reached its
            destination CSSOM. Another actor's matching rule can mask that loss.</li>
          <li><strong>Shared storage:</strong> different renderers retain the same sheet.
            This does not by itself change a declaration or prove borrowed permission.</li>
          <li><strong>Host effect:</strong> foreign writes and matching selectors are recorded
            separately from the host's background declaration. These schedules do not establish a host collision.</li>
        </ul>
        <p>Read <strong>Insertion</strong> for host/native decisions, <strong>Rules</strong> for
          destination CSSOM presence, <strong>Ownership</strong> and <strong>Sharing</strong>
          for sheet relationships, and <strong>Permission</strong> for reliance on a foreign
          sheet's enhanced-specificity attribute. Host matching rules and its bounded declaration trace are independent
          evidence. A normal-looking control never turns a blocked rule into a successful insertion.</p>
        <details>
          <summary>Technique guarantees and the best paired reproductions</summary>
          <div className="table-scroll">
            <table>
              <caption>Technique guarantees and assumptions</caption>
              <thead><tr><th scope="col">Technique</th><th scope="col">What it establishes</th><th scope="col">Required assumption / live evidence</th></tr></thead>
              <tbody>
                <tr><th scope="row">Container selectors</th><td>Limit matches and add selector specificity.</td>
                  <td>Elements must remain inside the scope, and insertion must be allowed. <a href={versionLink("raw-marked-first", "1.20260927.13.2")}>Scoped but rejected</a> is still missing CSS.</td></tr>
                <tr><th scope="row">Enhanced-specificity attribute</th><td>Permits a destination under the host patch.</td>
                  <td>It does not identify its writer. <a href={sitePath("?hostPolicy=master#persona-first-raw")}>Unchanged Feedback, Persona first</a> demonstrates borrowed permission without removing the prefix.</td></tr>
                <tr><th scope="row">Class salt</th><td>Changes runtime-generated names.</td>
                  <td>Feedback always keeps its inspected salt. <a href={scenarioLink("persona-first-raw")}>Persona first</a> still demonstrates shared sheets; there is no salt-off comparison.</td></tr>
                <tr><th scope="row">Rule prefix</th><td>Identifies a rule to a compatible host filter.</td>
                  <td>Compare <a href={scenarioLink("raw-marked-first", "feedback-exception")}>the proposed exception</a> with <a href={scenarioLink("raw-marked-first", "master")}>sheet-only rejection</a>.</td></tr>
              </tbody>
            </table>
            <p><strong>None prevents sheet adoption.</strong> The
              {" "}<a href={versionLink("raw-marked-first", "main-2026-10-16")}>main enhanced-specificity attribute guard</a>
              {" "}restricts the handles Persona uses, but accepts another owner's sheet with the enhanced-specificity attribute.
              This lab does not implement a conjectural ownership fix.</p>
            <table>
              <caption>Best paired reproductions: change one mechanism at a time</caption>
              <thead><tr><th scope="col">Compare</th><th scope="col">Isolated question</th><th scope="col">Read the evidence</th></tr></thead>
              <tbody>
                <tr><td><a href={scenarioLink("persona-alone")}>Persona alone</a> / <a href={scenarioLink("raw-marked-first")}>Feedback first</a></td>
                  <td>What does Feedback's existing destination change?</td><td>The release loses scoped rules after Feedback; main rejects the incompatible handle.</td></tr>
                <tr><td><a href={versionLink("raw-marked-first", "1.20260927.13.2")}>Pinned release</a> / <a href={versionLink("raw-marked-first", "main-2026-10-16")}>main snapshot</a></td>
                  <td>What does the guard change?</td><td>Same scoped rule and host gate; only Persona's selected revision changes.</td></tr>
                <tr><td><a href={scenarioLink("raw-marked-first", "master")}>Feedback first</a>, compare extracted and runtime host builds</td>
                  <td>Is adoption sufficient to lose rules?</td><td>The production gate disables filtering without extraction. Adoption alone does not reject insertion; host build also changes.</td></tr>
                <tr><td><a href={scenarioLink("raw-marked-first")}>Feedback first</a> / <a href={scenarioLink("persona-first-raw")}>Persona first</a></td>
                  <td>What changes with arrival order?</td><td>The release loses its Fluent rule only in the first order. Main inserts in both; reverse order can share sheets with the enhanced-specificity attribute in either revision.</td></tr>
              </tbody>
            </table>
          </div>
        </details>
      </details>
    </details>
    <details className="note"><summary>Technical provenance and model limits</summary>
      <p>Each scenario uses a fresh iframe, public libraries and independently compiled
        participants. The guide names the inspected roles; the live UI, scope, enhanced-specificity attribute,
        salt and prefix remain fictional. No full proprietary provider or SDK runs here.
        The inspected consumer pins Persona 1.20260927.13.2 with version locking enabled in
        checked-in defaults. Effective runtime overrides and deployed assets remain unverified.</p>
      <p>The main snapshot has no verified released version here; the inspected host
        prefix exception is an unmerged proposal. Full-product renderer counts, embedded SDK
        Griffel versions, portals, CSP/query sorting and theme/font customization are outside
        this model. Recorded attempts are not an exhaustive inventory of required styles,
        and an unchanged host probe is not a whole-host correctness guarantee.</p>
    </details>
  </>;
}
