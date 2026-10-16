# Research handoff

## Current state and purpose

The source baseline is public at
[bsunderhus/griffel-renderer-demo](https://github.com/bsunderhus/griffel-renderer-demo).
It starts with a fresh, sanitized history. This repository is the only active
implementation; no separate investigation checkout is needed.

The research asks:

1. How can independently bundled Griffel integrations interfere?
2. Which guarantees do scoped selectors, destination markers, class salts, and
   rule prefixes actually provide?
3. Which practical mitigations and architectural options support coexistence?
4. Can a host and several independent integrations remain correct across
   arrival orders, lifecycle changes, component overlap, and themes?

The contact card ("Persona") and form ("Feedback") are synthetic actors.
Their names do not establish a connection to any actual SDK or product.
Conclusions about real integrations require separate evidence; do not restore
private provenance to this public repository.

## Resume in a fresh environment

```sh
git clone https://github.com/bsunderhus/griffel-renderer-demo.git
cd griffel-renderer-demo
npm ci
npx playwright install chromium
npm test
npm start
```

Open http://127.0.0.1:4173. Linux environments without browser libraries may
need `npx playwright install --with-deps chromium`. No credentials or backend
are needed to run the experiments. See [README](../README.md) for ports,
remote forwarding, troubleshooting, and focused test commands.

On 2026-10-16 a fresh installation and hosted CI passed all 72 baseline cases.
The [recorded CI run](https://github.com/bsunderhus/griffel-renderer-demo/actions/runs/38928691644)
is evidence for that baseline, not proof that every future revision passes.
The source is published; an interactive website has not been deployed.
Licensing is still undecided. The known build-only dependency advisory and
publication decisions are documented in the [roadmap](../ROADMAP.md).

## Architecture: where to investigate

| Surface | Entry point | Responsibility |
| --- | --- | --- |
| Browser entry | [browser-entry.jsx](../src/browser-entry.jsx) | React globals and route dispatch only. |
| Gallery | [playground/](../src/playground/) | One gallery, seven source-aligned primary examples, seven collapsed diagnostic controls, URL settings. |
| Configuration | [scenarios.js](../src/experiments/scenarios.js), [configuration.js](../src/experiments/configuration.js) | Runtime inputs and validation, separate from gallery prose. |
| Orchestration | [run.js](../src/experiments/run.js) | Host baseline, optional seed, policy, ordered mounts and evidence lifecycle. |
| Bundle adapters | [participants.js](../src/experiments/participants.js) | Script/global boundary; no participant UI or renderer construction. |
| Observation | [observation.js](../src/evidence/observation.js) | Native insertion identity, creator/writer attribution and renderer-call scopes. |
| Evidence snapshot | [snapshot.js](../src/evidence/snapshot.js), [cssom.js](../src/evidence/cssom.js) | Live sheets, caches, selector matches and bounded host declaration cascade. |
| Analysis | [analysis.js](../src/evidence/analysis.js) | Pure classification of recorded evidence, independent of DOM markup. |
| Presentation | [presentation.js](../src/evidence/presentation.js), [controller.js](../src/evidence/controller.js) | Evidence UI, disclosure state, refresh scheduling and disposal. |
| Scoped actor | [persona/](../src/persona/) | Contact-card intent, marked sheets, head insertion point, Stylis scope rewrite. |
| Form actor | [feedback/](../src/feedback/) | Feedback intent, independent renderer, salt/prefix and module-level singleton. |
| Host | [host/](../src/host/) | Minimal/shared UI, renderer selection, host-owned filter installation, extraction gate and document-lifetime policy. |
| Shared UI | [PersonSummary.jsx](../src/shared/PersonSummary.jsx) | Neutral visual primitive, compiled separately into each importing participant. |
| Archived diagnostics | [archived/](../src/archived/) | Earlier mechanism and extraction routes, not dependencies of the main runner. |
| Bundling | [targets.mjs](../build/targets.mjs), [webpack-config.mjs](../build/webpack-config.mjs) | Explicit independent targets and narrowly scoped extraction/raw-style transforms. |
| Serving | [server.mjs](../server.mjs) | Allowlisted assets and routes, loopback only, no source maps. |
| Primary tests | [test-three-actors.mjs](../test-three-actors.mjs), [tests/](../tests/) | Policy, architecture, pure analysis, 56 gallery combinations, evidence UI, interactions and navigation. |
| Archived tests | [test.mjs](../test.mjs), [archived tests](../tests/archived/) | 24 extraction/runtime/adoption/cache diagnostics. |

### Build boundaries matter

There are eight webpack targets: minimal extracted/runtime hosts, shared
extracted/runtime hosts, an archived integration, Persona, precompiled Feedback,
and raw-style Feedback. The gallery is separately bundled with esbuild.
React is shared through browser globals; the integration bundles have separate
Griffel code. Do not accidentally deduplicate the independent renderer actors.

The raw Feedback build substitutes Fluent `.styles.js` modules with public
`.styles.raw.js` modules when available. Tests inspect the recorded module list
to verify that this path is active. Salt cannot rename classes already baked
into precompiled Fluent styles.

### Module contracts and dependency direction

The host, Persona and Feedback are distinct source modules and independent
webpack compilations, not three modes of one universal UI component. Each owns
its renderer and UI. They may import neutral shared UI but never another
participant, the gallery, evidence or scenario orchestration. The minimal host
does not import the shared form/phone summary; its explicit entry imports only
the avatar host. Shared UI is bundled independently, not externalized.

The experiment runner resolves configuration once and uses bundle adapters to
load and mount participants. The browser globals exist only at this script
boundary. Mounts return renderer/lifecycle handles; the host additionally
provides a runtime-call counter and insertion-decision subscription.
Historical and marker-guard Persona retain per-mount renderer creation;
owner-guard Persona caches by owner and document. The form profile creates its
singleton at module evaluation. No shared renderer factory is introduced.
Guarded profiles are separately labeled primary scenarios, not replacements for
the historical Persona cases.

Evidence follows observation -> snapshot -> analysis -> presentation.
Observation keeps native object identity out of serialized results; snapshots
refresh the existing `window.threeActorResult` shape. Pure analysis computes
classification and borrowed permission, and the UI consumes it rather than
deciding policy or inspecting renderers. Legacy computed snapshots are
separately named diagnostics and never feed classification.

The host owns policy installation; the harness does not import or implement the
filter. Production-style installation runs in the host layout effect.
Diagnostics explicitly ask the host to activate their override before integration
mounts. Evidence subscribes to the host's actual decisions; with enforcement
disabled it uses transparent native-insertion observation, not a pretend filter.

Disposal cancels pending animation frames, removes refresh listeners, restores
renderer wrappers and the native insertion method, and unmounts participants.
It is idempotent and runs on page exit or runner failure after host setup.
Provider unmount alone does not uninstall the source-aligned document patch;
the host exposes separate sandbox disposal. Each case still starts in a fresh
iframe; lifecycle tests are bounded probes, not a complete coexistence matrix.

[Architecture assertions](../tests/architecture.mjs) enforce participant import
boundaries, private Griffel implementations in all eight bundles and absence
of Button/Label/Textarea imports from minimal hosts. The build writes an ignored,
unserved module-name inventory for these assertions. No dependency upgrade,
framework, TypeScript or formatting/lint tool is introduced.

For the seven explanatory controls, the refactor comparison retains every generated runtime rule, insertion
decision, cache, sheet identity/creator, sharing result and host-impact outcome.
Module traversal changes the order of rules within the extracted host CSS;
the declaration multiset is unchanged. The comparator ignores only that
extracted ordering and the associated host background rule indices; browser
tests still verify actual positions and both cascade controls. Primary scenarios
intentionally changed to the source-aligned host contract and are covered by
contract-specific assertions, not a claim that their old diagnostic behavior is
unchanged. To compare the 28 control records with a
saved pre-refactor result after a build and focused browser run:

```sh
node tests/experiments/compare-baseline.mjs /path/to/baseline-results.json
```

When extending the lab, put participant behavior inside its module, runtime
inputs in experiment definitions, explanations in gallery content, and CSS
interpretation in evidence analysis. Add a named experiment rather than a
scenario-ID branch inside a participant or the runner.

Shared coverage imports real Avatar, Button, Label, and Textarea controls.
Minimal coverage imports only the host avatar UI. Separate bundles and extracted
stylesheets prevent unused form CSS from contaminating the minimal experiment.

## Source-aligned contract matrix

The single gallery at `/` has seven primary source-aligned cases and seven
collapsed explanatory controls, all defined in one
[runtime registry](../src/experiments/scenarios.js). Every primary case uses the
production/extraction host contract and the inspected form profile (when mounted).
Historical, marker-guard and owner-guard Persona revisions are explicitly named.
Only explanatory controls use forced diagnostic policies or alternative form
settings. All cases share the independently bundled participants, public controls
and evidence pipeline.

The five formerly duplicated source examples use the existing scenario IDs:
`persona-alone`, `unmarked-d-first`, `raw-marked-first`, `persona-first-raw` and
`master-rejects-marker`. `marker-guard` and `owner-guard` add the two distinct
adoption revisions. `/source` and `/three-actors` redirect to `/`, preserving URL
settings and mapping former `source-*` IDs rather than rendering another gallery.

| Participant | Named behavior | Contract under test |
| --- | --- | --- |
| Host | `production-extraction` | Production plus extraction selects a no-op renderer and installs the insertion patch in a host layout effect. Non-extracted mode has a DOM renderer and no patch. |
| Host | `diagnostic` | Explicitly retains the old forced filtering controls; never described as the production gate. |
| Persona | `historical` | Per-mount marked/scoped renderer, without an adopted-sheet guard. |
| Persona | `marker-guard` | Per-mount marked/scoped renderer; drops adopted handles without the exact approval value before inserting. Marked foreign owners can still share sheets. |
| Persona | `owner-guard` | Accepts adopted handles only for its owner; one renderer per owner/document, replaced when retained sheets become detached. |
| Form | `inspected` | A raw-style bundle, module-level salted renderer and prefixed atomic/reset rules; no requested approval attributes. A precompiled bundle refuses this profile. |
| Form | `control` | Existing raw/precompiled, salt and prefix alternatives remain diagnostic controls. |

The exact stylesheet attributes and prefixes remain fictional. Native provider
theme rules are separate from Griffel renderer rules and need not carry the
form prefix. Assertions and ledgers distinguish them by bucket metadata rather
than pretending all CSS in a mount came through one renderer.

In source-aligned seed cases, observation starts after host mount and before
the unrelated renderer. Its unmarked sheet can therefore exist even though
the host rejected its harmless seed rule. The event is recorded as unrelated;
it is not misattributed to Persona. Unlike the old diagnostic seed setup, this
seed runs under the already-active source-aligned gate.

[Source browser tests](../tests/source/run.mjs) cover 7 cases x 2 host modes x
2 coverage profiles = 28 primary combinations. They assert native rule/cache
state rather than visual appearance. The [lifecycle probes](../tests/source/lifecycle.mjs)
also verify:

- Historical unmarked adoption, exact marker acceptance (including rejecting
  the truthy string `"false"`), matching-owner adoption and foreign-owner rejection.
- Renderer/cache reuse without duplicate Griffel insertion for an owner/document,
  separation of owners/documents, and recovery after sheet detachment.
- Raw form build enforcement, module-level renderer reuse and retention of sheets.
- No-op host insertion, document-patch persistence after provider unmount,
  and separate sandbox disposal.

[Gate tests](../tests/policy/host-contract.mjs) cover production, development
and test environments with extraction both enabled and disabled, plus patch
idempotence and explicit diagnostic overrides. Browser source cases run the
actual production build. The complete suite has 80 matrix cases:
28 source-aligned primary combinations, 28 diagnostic control combinations and
24 archived cases. Removing duplicate presentations does not remove the control
mechanisms or the source-aligned lifecycle assertions.

This establishes the inspected styling mechanisms under pinned public
dependencies, not a complete product implementation. The captured form bundle's
embedded Griffel version and the incident-time bundle/deployed renderer revision
are not established here. Host query sorting, CSP settings, font/theme
customization and portals are not represented by these controls. Private source,
bundle captures and authenticated inspection artifacts are never dependencies of
the public tests or copied into this repository.

## Mechanisms established by the diagnostic baseline

1. **Adoption:** RendererProvider hydration can select existing Griffel sheets
   by bucket and priority without enforcing this demo's owner, salt, or marker.
   Adopting an unmarked sheet does not apply the adopter's requested marker.
2. **Insertion permission:** the synthetic host checks destination metadata.
   A truthy `data-demo-allow-rules` permits insertion. Otherwise a Griffel bucket
   is blocked, except for the exact leading `/* demo-feedback */` prefix in
   `feedback-exception` mode. `off` allows all rules.
3. **Cache:** Griffel may record a rule before native insertion. The demo filter
   returns zero without throwing when blocking, so a later retry may be skipped
   despite the rule being absent from CSS.
4. **Matching:** browser CSS matching and cascade do not know bundle ownership.
   Container scoping limits matches, not sheet adoption. Class salt changes
   runtime names, not sheet ownership.
5. **Masking:** matching CSS already supplied by another actor can make blocked
   rules look successful. Component coverage is therefore an independent axis.
6. **Collision:** the intentionally identical unsalted orange avatar reset can
   arrive after extracted host atomic CSS and override its green background.
   Runtime bucket ordering preserves reset-before-atomic ordering in the
   corresponding control. Salting the reset avoids that constructed collision.

These are findings under pinned dependencies and synthetic host policy, not
universal statements about every Griffel version or configuration. The filter
and markers are not security boundaries.

## Representative experiments and expected signals

Use `/?scenario=ID&host=extracted&coverage=minimal`, replacing `ID`
with a scenario below. Gallery links also preserve host and coverage settings.

| Scenario ID | Question / expected signal |
| --- | --- |
| `persona-alone` | Persona creates marked sheets; all recorded scoped rules reach native CSSOM. No foreign selectors match the host. |
| `unmarked-d-first` | Persona adopts the unmarked default sheet; its atomic rules are blocked and cached, while its reset rules insert into marked sheets. |
| `raw-marked-first` | Prefixed, salted Feedback first: its rules are permitted; Persona adopts unmarked sheets and its unprefixed rules are blocked. Native parser rejection is recorded separately. |
| `persona-first-raw` | Reverse order: both get insertion permission and retain shared handles. Persona's sheets are not exclusive; Feedback's accepted prefix does not require borrowed permission. |
| `master-rejects-marker` | Host lacks prefix exception: both integrations have rejected rules. |
| `marker-guard` | Persona drops unapproved adopted handles before inserting; it can still adopt another owner's approved sheet. |
| `owner-guard` | Persona restricts adoption by owner and caches its renderer per owner/document; lifecycle probes verify recreation after sheet detachment. |
| `persona-first` | Unprefixed Feedback borrows permission in existing marked buckets but has 17 textarea rules blocked in its new unmarked buckets under extracted/minimal coverage. A shared runtime host can pre-create all destinations, eliminating that borrowed allowance. |
| `precompiled-salted` | Salt changes custom runtime classes but cannot rename precompiled Fluent classes. |
| `raw-unsalted` | Shared classes mask rejected rules; the winning host-avatar background declaration also changes in the extracted host. |
| `host-collision` / `host-collision-salted` | Same constructed reset, with and without salt: compare actual selector overlap and winning declarations independently of shared storage. |

Legacy computed snapshots include phone width 32px, primary background
`rgb(15, 108, 189)` and secondary action width 137px. These are supporting
regression diagnostics, not rule-availability verdicts. Expansion depends on
viewport and scaling; the causal assertions follow generated declarations,
native insertion, CSSOM presence and cache state instead. Legacy avatar color
snapshots use the initials slot, not the potentially transparent Avatar root.

The gallery matrix is 14 scenarios x 2 host builds x 2 coverage profiles = 56:
seven source-aligned primary scenarios and seven explanatory controls.
The archived matrix adds 24.
Tests also cover local interactions and presented
evidence. This is not a full visual or accessibility audit.

`window.threeActorResult` inside each example contains stages, per-rule events,
sheet creators, rule lists, renderer caches, and measurements. The UI's expanded
rule trace follows an actual width rule: actor -> destination bucket/priority ->
creator -> marker/prefix -> policy decision -> native insertion -> destination
CSSOM -> cache -> matching width rules.
Do not substitute inferred rule counts for this causal evidence.

The live outcomes are Insertion, Rules, Ownership, Sharing, and Permission.
Rule evidence retains the exact native `CSSRule` identity and separately checks
equivalent serialized CSS in the actual destination. A removed instance with an
identical surviving rule is a provenance warning, not proof that styling is
absent. Removing all equivalent CSS is a rule-availability failure. Other matching
rules never turn a blocked insertion into a successful insertion.

Sharing is bidirectional: creators also report later adopters, even if all their
own insertion attempts succeeded. Permission counts only foreign marked-sheet
attempts that lack an independently accepted prefix. The raw prefixed reverse
order therefore demonstrates shared storage, not a necessary filter bypass.

The host reports foreign insertions into host-created sheets independently of
foreign rules matching its elements. An extracted host can suffer a collision
without sharing its stylesheet; a salted runtime integration can write into host
sheets without matching host elements. The host avatar's native CSSOM trace
resolves `background-color` only when all matching declarations have unconditional,
unlayered, single-class selectors and no inline background override. Importance
and native stylesheet/rule order select the winning declaration. Other cases
are explicitly unresolved. No computed color or generic cascade engine is used;
this one probe is not a full host audit.

Evidence refreshes on resize and subsequent native insertion. Renderer caches,
sheet handles and CSSOM contents are refreshed together. Later renderer calls
retain their actor attribution rather than inheriting the last mount's identity.
Expanded traces and all-rule ledgers stay open across refreshes.

Browser layout scaling at 110% reproduces 136.989px and 31.9886px for the
healthy 137px action and 32px phone. These computed values are not CSS
correctness checks: the declarations remain `width:137px` and the Fluent phone
width rules. Tests compare recorded CSS with live destination sheets at desktop
and mobile widths and at 90%, 110%, and 125% scaling, across both host builds and
coverage profiles. Hover and pressed states must not change rule outcomes.
Legacy computed snapshots remain only in the full diagnostic data and baseline
assertions; they do not drive UI success or failure.
Chromium also rejects Fluent's Firefox-only `::-moz-placeholder` rules in
unscoped Feedback CSS. These native parse failures are recorded separately from
host-policy blocks; they do not by themselves establish a visible mismatch.

### Reproduction contract and paired controls

The historical Persona cases deliberately use unguarded adopted-sheet selection.
The marker-guard and owner-guard cases explicitly model separate inspected
revisions, not an assertion that either was deployed during the incident. No
mitigation is silently applied to historical cases. The independently bundled renderers, actual
public Fluent components, extraction and native insertion are experimental
inputs, not approximated styles.

| Pair (same selected host build and coverage) | Changed input | Assertion in [test-three-actors.mjs](../test-three-actors.mjs) |
| --- | --- | --- |
| `persona-alone` / `unmarked-d-first` | Existing unmarked default sheet | Creator/destination changes; atomic insertion is blocked despite cached scoped rules. |
| `feedback-first` / `no-policy` | Filter enabled/disabled | Adoption persists; rejection disappears only when filtering is disabled. Collision evidence stays independent. |
| `raw-marked-first` / `persona-first-raw` | Integration arrival order | Unmarked rejection versus shared marked sheets; both creators and adopters disclose sharing. |
| `raw-marked-first` / `master-rejects-marker` | Host prefix compatibility | Exact predicate assertions and actual per-rule decisions distinguish allowed prefix from rejection. |
| `raw-marked-first` / `marker-guard` / `owner-guard` | Persona revision only | Historical rejection versus marker/owner-filtered destinations; bounded lifecycle probes distinguish their guarantees. |
| `host-collision` / `host-collision-salted` | Class salt | Unsalted foreign rule matches the host. Salt removes matching; runtime shared-sheet writes can remain. |

The guide connects container scoping, sheet markers, class salt and per-rule
prefixes to these live configurations. Their assumptions remain distinct:
elements must stay inside the scope (including portals); the destination marker
does not authenticate its writer; class generation must happen at runtime for
salt to apply; and the host must explicitly recognize a rule prefix.

Start with extracted/minimal coverage, then repeat with extracted/shared to
expose masking and runtime/both to expose pre-existing bucket adoption. The
runtime filter is disabled in primary scenarios by the production/extraction
gate. Forced runtime filtering exists only in explanatory controls. The overlapping avatar reset is explicitly constructed and
is not needed for the missing scoped-rule reproduction.

Recorded insertion attempts are not an exhaustive inventory of required
component styles. Native parser rejections remain visible, and successful
insertion does not prove all components, states or lifecycle paths correct.
Regression tests cover all 56 gallery combinations, the two host declaration outcomes,
foreign matching versus storage, inbound sharing, borrowed permission,
equivalent-rule replacement/removal, late attribution/cache refresh, unsupported
probe conditions, and desktop/mobile/scaling disclosure behavior.

## UX decisions to preserve

- Order: title, load order, takeaway, live examples, compact results, expandable
  generated CSS/evidence. Examples should dominate diagnostics.
- Contact card and feedback form are intentionally distinct. Persona has
  Message/View profile; Feedback has Send feedback/Clear status.
- Primary and secondary actions share a grid row. The real 137px Griffel rule
  keeps the secondary compact; its absence naturally reveals stretching.
- Phone alignment uses a structural wrapper rather than a margin vulnerable to
  the scoped reset's specificity.
- No separate "The story" section in the main walkthrough; technical prose is
  available through disclosures. Archived routes retain older presentation.
- Optional side-by-side "intended reference" frames were tried and rejected as
  confusing. Do not reintroduce them without a new user request.
- Do not customize the Feedback button/header with unrelated padding/color to
  manufacture a collision. The avatar reset is the deliberate collision probe.

## What is not yet established

- No solution candidate has met a full coexistence contract.
- No third integration, exhaustive lifecycle matrix, mixed-version matrix,
  portal/theme experiment, or Shadow DOM/iframe solution comparison exists yet.
- Healthy measured controls do not prove all styles inserted or all UI works.
- "Enhanced" terminology and `master` policy IDs in code are legacy diagnostic
  names, not product affiliations or security guarantees.

## Next bounded task

Phase 2's baseline comparison is now in the gallery mechanism guide, linked to
live scenarios and native CSSOM assertions. Preserve those controls and evidence
semantics when introducing separately labeled host-contract and namespacing experiments.
For each, state who must change (host, integration, build, library), measure
residual failures, and avoid claiming a durable fix from one healthy load order.
Only after that expand to a third independently bundled integration and the
coexistence matrix defined in the roadmap.
