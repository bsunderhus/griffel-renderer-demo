import React from "react";

export function MechanismGuide() {
  function versionLink(id, version) {
    const params = new URLSearchParams(location.search);
    params.set("personaVersion", version);
    return `/?${params}#${id}`;
  }
  return <>
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
            <tr><th scope="row">Versioned contact-card integration</th><td>Container-prefixed selectors and approval markers. Only the main snapshot adds an adopted-handle guard.</td>
              <td>The pinned release retains incompatible destinations; the main snapshot rejects them. Both can leave approved sheets available to foreign renderers.</td></tr>
            <tr><th scope="row">Form integration</th><td>In the inspected profile: salted generated classes and prefixed rules.</td>
              <td>Creates unmarked sheets current Persona rejects, or reuses Persona's approved sheets. Neither salt nor a rule prefix makes a sheet private.</td></tr>
          </tbody>
        </table>
      </div>
      <h3>1. Where does the rule go?</h3>
      <p>Griffel groups rules into <strong>buckets</strong> (such as ordinary rules or hover rules)
        and ordering <strong>priorities</strong>. Hydration can find an existing sheet by that
        key, without enforcing an integration owner or marker. LPC 1.20260927.13.2 retains those
        handles; the main snapshot discards incompatible handles before insertion.</p>
      <pre aria-label="Sheet adoption example">{`Feedback creates:  bucket d / priority 0 / unmarked
LPC 1.20260927.13.2: retains the handle; host rejects its rule
LPC main snapshot: rejects the unapproved handle before insertion
                   -> creates an approved destination
                   -> inserts its scoped rule
                   -> does NOT relabel Feedback's sheet`}</pre>
      <h3>2. Is the rule allowed in?</h3>
      <p>The host filter checks the <strong>destination</strong>, not the identity of the caller.
        A demo-approval marker permits insertion; the demonstration rule exception also
        permits rules beginning with <code>/* demo-feedback */</code>. The inspected host main
        does not recognize that prefix; the exception remains an unmerged host proposal.</p>
      <div className="table-scroll">
        <table>
          <caption>Same integrations, different arrival order (with the Feedback exception)</caption>
          <thead><tr><th scope="col">Arrival order</th><th scope="col">Sheet reused</th><th scope="col">Consequence</th></tr></thead>
          <tbody>
            <tr><th scope="row">Feedback → LPC 1.20260927.13.2</th><td>Persona retains Feedback's unmarked sheets.</td>
              <td>Feedback's prefixed rules pass under the proposed exception; Persona's scoped rules are blocked.</td></tr>
            <tr><th scope="row">Feedback → LPC main snapshot</th><td>Feedback keeps unmarked sheets; Persona creates approved destinations.</td>
              <td>Feedback's prefixed rules pass under the proposed exception. Persona's scoped rules also insert.</td></tr>
            <tr><th scope="row">Persona → Feedback</th><td>Persona's marked sheet.</td>
              <td>Both can insert into that sheet. This is shared permission, not independent ownership.</td></tr>
          </tbody>
        </table>
      </div>
      <p>Permission is <strong>per destination</strong>: if Feedback's textarea needs a bucket Persona
        never created, its new sheet does not inherit Persona's marker. In the unprefixed
        explanatory control, one renderer can therefore have both allowed and blocked rules.
        The inspected Feedback prefix independently permits its rules when the host recognizes it.</p>
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
        names; a prefix identifies rules.</strong> None prevents sheet adoption. The inspected main-branch
        {" "}<a href={versionLink("raw-marked-first", "main-2026-10-16")}>marker guard</a> and proposed <a href="#owner-guard">owner guard</a> restrict
        adopted handles instead; the marker guard still accepts another owner's approved sheet. Runtime salt also
        does not rename Fluent classes already generated at build time.</p>
      <h3>When a rule is rejected, why rerendering may not repair it</h3>
      <p>This sequence remains relevant to independently rejected Feedback rules and the
        {" "}<a href={versionLink("raw-marked-first", "1.20260927.13.2")}>LPC 1.20260927.13.2 scenario</a>.
        It is not the outcome for the main-snapshot Persona scenarios.</p>
      <pre aria-label="Rejected rule cache sequence">{`Griffel records rule in insertion cache
  -> calls the sheet's insertRule
  -> host filter rejects it without throwing
  -> rule absent from CSS, but present in renderer cache
  -> a later insertion attempt may be skipped as already handled`}</pre>
      <p>This is why each live example reports <strong>Insertion</strong>, <strong>Rules</strong>,
        <strong>Ownership</strong>, <strong>Sharing</strong>, and <strong>Permission</strong> separately.
        The selected width rule is one probe; expand all recorded attempts for blocked rules,
        native parser rejections and exact native-rule presence. An identical surviving rule does
        not prove that the recorded insertion still exists.</p>
      <div className="table-scroll">
        <table>
          <caption>Technique guarantees and assumptions</caption>
          <thead><tr><th scope="col">Technique</th><th scope="col">What it establishes</th><th scope="col">Required assumption / live evidence</th></tr></thead>
          <tbody>
            <tr><th scope="row">Container selectors</th><td>Limit which elements match inserted rules.</td>
              <td>Elements must remain inside the scope; insertion must still be allowed.
                {" "}<a href={versionLink("unmarked-d-first", "1.20260927.13.2")}>LPC 1.20260927.13.2 rejection</a> separates these facts;
                {" "}<a href={versionLink("unmarked-d-first", "main-2026-10-16")}>LPC main snapshot</a> avoids the incompatible destination.</td></tr>
            <tr><th scope="row">Sheet marker</th><td>Permits writes to a marked destination.</td>
              <td>It does not identify the writer. <a href="#persona-first">Borrowed permission</a> records unprefixed foreign attempts.</td></tr>
            <tr><th scope="row">Class salt</th><td>Changes runtime-generated names.</td>
              <td>Component styles must still be generated at runtime; <a href="#precompiled-salted">precompiled classes</a> remain shared.
                {" "}<a href="#host-collision-salted">Salted collision control</a> checks the host probe separately from sheet sharing.</td></tr>
            <tr><th scope="row">Rule prefix</th><td>Identifies a rule to a compatible filter.</td>
              <td>The host must accept that exact prefix. Compare <a href="#raw-marked-first">accepted</a> and
                {" "}<a href="#master-rejects-marker">rejected</a>; neither provides private sheets.</td></tr>
          </tbody>
        </table>
        <table>
          <caption>Best paired reproductions: change one mechanism at a time</caption>
          <thead><tr><th scope="col">Compare</th><th scope="col">Isolated question</th><th scope="col">Read the evidence</th></tr></thead>
          <tbody>
            <tr><td><a href="#persona-alone">Persona alone</a> / <a href="#unmarked-d-first">unmarked seed first</a></td>
              <td>What does an existing unmarked sheet change?</td><td>The release loses its atomic rules; the main snapshot rejects the incompatible destination. The unrelated seed can still be blocked.</td></tr>
            <tr><td><a href={versionLink("unmarked-d-first", "main-2026-10-16")}>LPC main snapshot</a> / <a href={versionLink("unmarked-d-first", "1.20260927.13.2")}>LPC 1.20260927.13.2</a></td>
              <td>What did the verified fix change?</td><td>Only Persona's profile changes: present native rules versus rejected-but-cached rules.</td></tr>
            <tr><td><a href="#feedback-first">Filter on</a> / <a href="#no-policy">filter off</a></td>
              <td>Is adoption alone enough to lose rules?</td><td>Adoption remains; only filtering rejects insertion. Check collisions independently.</td></tr>
            <tr><td><a href="#raw-marked-first">Feedback first</a> / <a href="#persona-first-raw">Persona first</a></td>
              <td>What does arrival order change?</td><td>Separate destinations versus shared marked destinations; current Persona inserts in both orders.</td></tr>
            <tr><td><a href="#raw-marked-first">Current Persona</a> / <a href="#owner-guard">proposed owner guard</a></td>
              <td>What does the unmerged proposal add?</td><td>Marker approval is weaker than owner identity; lifecycle probes also compare renderer/cache reuse.</td></tr>
            <tr><td><a href="#host-collision">Unsalted</a> / <a href="#host-collision-salted">salted</a></td>
              <td>Can a foreign selector alter a host declaration?</td><td>Compare selector matches and the host CSSOM background trace in both host builds.</td></tr>
          </tbody>
        </table>
      </div>
    </details>
    <details className="note"><summary>Technical provenance and model limits</summary>
    <p>These are synthetic local examples using public libraries. The inspected form profile
      uses salt <code>demo-feedback</code>, a matching rule prefix, and raw component styles.
      Configuration controls vary these settings to isolate their effects.
      The styling contracts are source-aligned, not a full product integration or proof of an incident-time deployment.
      Embedded SDK Griffel versions, host CSP/query sorting, theme/font customization and portals are outside this model.
      Similar-looking controls can hide blocked rules, and
      permission leakage does not necessarily cause visible damage.</p>
    <p>The LPC version control switches the same five primary cases between LPC 1.20260927.13.2
      and the guarded main snapshot (2026-10-16).
      The inspected consumer pins the release with version locking enabled in checked-in defaults.
      Effective runtime overrides and deployed assets remain unverified. The main snapshot has no
      verified released version here; the owner guard is an unmerged proposal. The orange-avatar reset
      is an explicitly constructed collision probe, separate from the adoption-plus-filter failure.
      Recorded attempts are not an exhaustive inventory of all styles a component might require.</p>
    </details>
  </>;
}
