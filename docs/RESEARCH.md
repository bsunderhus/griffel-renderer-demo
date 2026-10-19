# Research reference

This is the canonical reference for the current experiment's contracts,
findings, and evidence limits. Use the [README](../README.md) for setup and test
commands, the [roadmap](../ROADMAP.md) for gates and next work, and
[AGENTS.md](../AGENTS.md) for contributor rules.

The public playground uses sanitized host, Persona, and Feedback UI and
pinned public dependencies. Inspected styling contracts inform the model, but
no private source, capture, service, or earlier checkout is needed to run it.
Historical source observations below do not establish deployed product behavior.

## Architecture: where to investigate

| Surface | Entry point | Responsibility |
| --- | --- | --- |
| Browser/site | [browser-entry.jsx](../src/browser-entry.jsx), [site.js](../src/site.js), [legacy-routes.js](../src/legacy-routes.js) | React globals, route dispatch, sub-path links and compatibility normalization. |
| Playground | [playground/](../src/playground/) | Settings, scenario prose, live frames and the visual documentation guide; no participant policy. |
| Configuration | [scenarios.js](../src/experiments/scenarios.js), [configuration.js](../src/experiments/configuration.js) | Fixed schedules, explicit controls, validation and resolved actor inputs. |
| Orchestration | [run.js](../src/experiments/run.js), [participants.js](../src/experiments/participants.js) | Bundle loading, mount/unmount execution, attribution and disposal. |
| Observation | [observation.js](../src/evidence/observation.js), [native-observer.js](../src/evidence/native-observer.js) | Actual insertion decisions, native rule identity, creators and renderer-call scopes. |
| Snapshot | [snapshot.js](../src/evidence/snapshot.js), [cssom.js](../src/evidence/cssom.js) | Live sheets, caches, selector matches and bounded host declaration cascade. |
| Interpretation/UI | [analysis.js](../src/evidence/analysis.js), [presentation.js](../src/evidence/presentation.js), [controller.js](../src/evidence/controller.js) | Pure classification, cause-first rendering, refresh and disclosure state. |
| Participants | [host/](../src/host/), [persona/](../src/persona/), [feedback/](../src/feedback/) | Each actor's UI, renderer, policy or transform, and lifecycle. |
| Shared UI | [shared/](../src/shared/) | Neutral primitives compiled independently into each importing participant. |
| Build/serve | [targets.mjs](../build/targets.mjs), [webpack-config.mjs](../build/webpack-config.mjs), [build.mjs](../build.mjs), [server.mjs](../server.mjs) | Independent builds, extraction/raw transforms, allowlisted local and Pages artifacts. |
| Validation | [vitest.config.js](../vitest.config.js), [tests/](../tests/) | Unit, artifact and real-Chromium evidence checks. |

### Module contracts and dependency direction

Host, Persona, and Feedback are separate modules and webpack compilations, not
modes of one universal component. They may import neutral shared UI, never
another participant, the gallery, evidence, or orchestration. Mounts expose
renderer/lifecycle handles through bundle adapters; the host also exposes
insertion decisions and runtime-call counts.

Six webpack targets preserve separate Griffel copies: minimal/shared hosts
in extracted/runtime modes, Persona, and candidate-aligned raw Feedback. React is
shared through browser globals; Griffel is not. The minimal host imports only
its avatar UI, with no hidden Button/Label/Textarea imports or extracted CSS.
The raw Feedback build substitutes public Fluent `.styles.raw.js` modules when
available. Feedback has no precompiled or unsalted variant in this experiment.
[Architecture](../tests/architecture.test.mjs) and
[artifact assertions](../tests/architecture-build.test.mjs) enforce these boundaries.
Motion 14.3.0 (MIT) is limited to the esbuild app's documentation transitions;
it does not enter participant bundles or affect class generation.

Keep behavior inside participants, schedules in experiment definitions, prose in
gallery content, and interpretation in evidence analysis. Never branch actor
code by scenario ID or introduce altered workloads to manufacture an outcome.

## Source-aligned contract matrix

A baseline schedule changes only load/mount/unmount events. Four independent
controls select `personaVersion`, `hostPolicy`, `host`, and `coverage`; defaults
are the pinned release, sheet-only policy, extracted host and shared coverage.
The [registry](../src/experiments/scenarios.js) has eight schedules, all using
these fixed actors. The UI, attribute names, salt and prefix are public
sanitizations; they are not claims of byte-for-byte product equivalence.

| Participant/profile | Contract under test |
| --- | --- |
| Host `production-extraction` | Production plus extraction selects a no-op renderer and installs the filter in a host layout effect. Runtime mode uses a DOM renderer and no filter. Installation is idempotent per document. |
| Persona `1.20260927.13.2` (`historical`) | Scoped renderer per provider mount, requesting the enhanced-specificity attribute, without an adopted-handle guard. Pinned by the inspected bootstrapper, not proof of deployed assets. |
| Persona `main-2026-10-16` (`marker-guard`) | Same scoped workload; discards adopted handles whose enhanced-specificity attribute is not exactly `"true"`. A release or consumer deployment containing the guard is unverified. |
| Feedback `inspected` | Independently compiled raw Fluent styles, module-level salted renderer, prefixed atomic/reset rules, and no requested enhanced-specificity attribute. Mounts reject renderer/workload overrides. |

Baseline validation rejects actor overrides, seeds and forced filtering. Every
schedule retains the inspected Feedback actor. Configuration/artifacts are
recorded once in `result.configuration`; `result.execution` records events,
per-mount renderer identity and reuse. Native attempts retain actor/mount-index
attribution; renderer wrappers detach before a singleton is reused.

| Baseline ID | Events after the host is ready |
| --- | --- |
| `persona-alone` | Load/mount Persona only. |
| `feedback-alone` | Load/mount Feedback only. |
| `raw-marked-first` | Load/mount Feedback, then load/mount Persona. |
| `persona-first-raw` | Reverse the same actors' arrival order. |
| `feedback-preloaded` | Evaluate Feedback before loading/mounting Persona; mount Feedback last. |
| `both-preloaded` | Evaluate both scripts, then mount Feedback and Persona. |
| `feedback-reopened` | Persona first; unmount/remount Feedback with its singleton/cache retained. |
| `persona-remounted` | Feedback first; unmount/remount Persona with a fresh renderer. |

Validation rejects duplicate loads, mounting before loading, double mounts,
unmounting absent actors, unknown events and an unfinished final actor set.
Schedules are deterministic, not timing sleeps. The host is always ready first.
In the pinned Griffel build, provider-time hydration selects existing sheets;
construction alone does not freeze adoption.

The counterfactual cards `unmarked-d-first`, `owner-guard`, `precompiled-salted`,
`raw-unsalted`, `host-collision` and `host-collision-salted` have been removed,
including their implementations and aliases. They changed actor count, renderer
lifetime, styles, or host gating rather than just loading/lifecycle. Labeling
those changes as diagnostics did not make them baseline evidence.

The artificial orange reset, green host override and shared 137px declaration
are also removed, including from extracted CSS. Evidence instead follows an
existing Fluent primary Button background rule and the native Fluent host avatar
background declaration. The lab no longer establishes salt-off/precompiled
comparisons, constructed collision prevention, or a proposed ownership fix.
Native provider theme rules are distinct from Griffel rules; not all CSS in a
mount carries renderer bucket metadata or the Feedback prefix.

### Compatibility

`/source` and `/three-actors` redirect to the unified gallery. Ten scenario
aliases preserve known policy/version settings through server redirects and
client normalization, including Pages sub-path hosting. Their authoritative maps
are in [scenarios.js](../src/experiments/scenarios.js).
For example, `master-rejects-marker` selects Feedback-first with the sheet-only
policy, and `marker-guard` selects the main snapshot with the candidate exception.
Former arrival aliases select the faithful baseline.
Counterfactual IDs and `no-policy` are not remapped. Retained aliases are navigation
compatibility, not claims that old and new actor code is equivalent.

## Current findings and underlying mechanisms

| Technique/mechanism | Observed guarantee | What it does not guarantee |
| --- | --- | --- |
| Container scoping | Persona rewrites selectors beneath its parent, restricting matching and adding specificity. | Private sheets or insertion permission; portals must remain inside the scope. |
| Enhanced-specificity attribute | The host can admit rules based on destination metadata. | Writer authentication, exclusive ownership, or CSS specificity by itself. Adoption does not copy requested attributes. |
| Runtime salt | Feedback uses salted runtime-generated class names. | Preventing sheet adoption; this baseline does not isolate salt-off behavior or test precompiled Feedback. |
| Rule prefix | The candidate host can admit a prefixed rule independently of its sheet. | Containment, ownership, permission for an unprefixed rule, or compatibility with a sheet-only host. |
| Griffel cache | A generated rule can remain cached after host rejection. | Evidence of native insertion or automatic retry after restoring native insertion. |

The inspected attribute `data-enhanced-specificity="true"` maps to the fictional
`data-demo-allow-rules="true"` locally. The browser assigns neither special
meaning; Persona's extra selector supplies specificity. The host accepts a
truthy attribute value, whereas main Persona's guard requires exactly `"true"`.
Thus the string `"false"` passes host truthiness but fails Persona's guard.

The host's `master` policy permits destinations with a truthy attribute.
`feedback-exception` additionally accepts the exact leading
`/* demo-feedback */` prefix. Filtering is disabled only by the host build gate,
not a selectable `off` override. A blocked `insertRule`
returns zero without native insertion or an exception. Native insertion can
also successfully return index zero, so the return value alone is not a verdict.

Under the extracted, sheet-only host:

- Feedback-first rejects Feedback; pinned-release Persona also adopts
  incompatible sheets and loses scoped rules. Main's guard protects Persona,
  not Feedback.
- Persona-first lets unchanged prefixed Feedback borrow permission in shared
  buckets with the attribute; newly created Feedback-only buckets can still
  be rejected. No unprefixed actor substitution is required.
- Selecting the prefix exception gives Feedback independent permission.
  Feedback can still adopt Persona's sheets. Persona's attribute test does not
  check owner identity. The guard is not ownership.

The runtime-host baseline confirms that adoption alone does not reject rules.
Shared matching CSS can mask rejection, which is why host coverage is independent
of build mode. The retained schedules do not establish a host-background change.
Sharing and foreign selector matches remain reported rather than treated as
damage. These are bounded findings, not universal Griffel guarantees or security boundaries.

## Evidence contract

Evidence flows observation -> snapshot -> analysis -> presentation. Observation
retains native object identity privately. `window.threeActorResult` serializes
configuration, execution, per-rule events, sheet creators/positions/rules,
renderer caches, class overlap and bounded host cascade evidence.
Matching Fluent Button background rules retain source metadata.
Permission counts/classification are derived by pure analysis, never copied back
into observations or inferred from scenario IDs.

The visible cause precedes the technical disclosure. It distinguishes rejection
in adopted versus actor-created destinations, missing prefix compatibility,
browser rejection after host permission, and removal after native insertion.
Mixed outcomes retain distinct reasons. Technical outcomes are Insertion, Rules,
Ownership, Sharing and Permission. A trace follows:

```text
generated rule -> destination/bucket/creator -> attribute/prefix -> host decision
              -> native insertion -> destination CSSOM -> cache -> selector matches
```

Keep these distinctions independent:

- **Identity versus equivalence:** removing a recorded `CSSRule` but retaining
  identical serialized CSS is a provenance warning. Losing all equivalent CSS
  is a rule-availability failure. Other matching rules cannot turn a blocked
  attempt into a successful insertion.
- **Sharing versus permission:** creators report later adopters as well as the
  reverse. Borrowed permission counts only allowed foreign-destination attempts
  relying on its attribute, without an independently accepted prefix.
- **Host writes versus host damage:** a foreign insertion into host-created
  storage need not match a host element. The retained schedules do not establish
  host damage; matching selectors alone are not a changed declaration.
- **Native rejection versus host rejection:** Chromium rejects Fluent's
  Firefox-only `::-moz-placeholder` rules separately from policy blocks; that
  alone does not establish a visible mismatch.

The host avatar probe resolves only `background-color` for unconditional,
unlayered, single-class declarations with no inline background override.
Importance and native source order select the winner before/after integration
load. Other cases are explicitly unresolved. This is not a generic cascade
engine, computed appearance check, or complete host audit.

Snapshots refresh on resize and subsequent native insertion, updating caches,
sheet handles and CSSOM together. Late renderer calls retain attribution;
expanded traces/ledgers remain open. Disposal cancels refreshes, removes
observers/wrappers, unmounts actors and restores native insertion, idempotently.
Provider unmount alone does not remove the host's document-lifetime policy.

Computed appearance snapshots live only in
[test instrumentation](../tests/browser/instrumentation.js), after each
participant mount. They support preload equivalence and control checks across
builds and coverage (including 32px phone width and theme Button background).
Avatar colors use the initials slot, not the potentially transparent root.
They never drive runtime verdicts or ship in published artifacts. Fractional
computed dimensions do not invalidate inserted CSS; gallery checks cover mobile,
90%/110%/125% scaling, hover and pressed states without changing CSSOM outcomes.

### Reproduction contract and paired controls

Keep host build/coverage fixed within a pair and `hostPolicy` fixed unless
explicitly comparing policies. Extra actors, ownership proposals, forced filtering
and alternative Feedback code are excluded, not additional baseline schedules.

| Pair/change | Assertion and executable evidence |
| --- | --- |
| `persona-alone` / Feedback-first | Feedback supplies the incompatible destination without a seed actor; [source tests](../tests/source/run.test.mjs) compare both revisions. |
| Feedback-first, change Persona revision | Same generated scoped rule, host contract and Feedback actor; release rejection remains cached, main inserts. [Revision comparisons](../tests/source/current-main.mjs). |
| Feedback-first / Persona-first | Same actor-generated CSS; destination and permission can change. [Baseline matrix](../tests/source/run.test.mjs), [schedule pairs](../tests/source/schedules.test.mjs). |
| Feedback-first, change host policy | Prefix compatibility changes Feedback permission; main Persona inserts under both. [Baseline matrix](../tests/source/run.test.mjs). |
| Ordinary / preloaded schedules | Same configuration, generated CSS, permission, CSSOM, cache and sheet relationships across all 16 control inputs. [Preload comparisons](../tests/source/schedules.test.mjs). |
| Ordinary / reopen or remount | Feedback reuses its renderer/cache without retrying rules; fresh Persona attempts Fluent rules again. [Baseline lifecycle cases](../tests/source/run.test.mjs). |

Start with extracted/minimal to reduce masking, then compare shared coverage and
the runtime host. Both inspected Persona revisions remain first-class; neither
is silently replaced by a proposed fix.

### Single runner and retained mechanism coverage

Vitest covers 8 schedules x 2 revisions x 2 host policies x 2 host builds x 2
coverage profiles = **128 baseline configurations**. Revision pairs are tested
together. Preload equivalence repeats paired schedules under all 16 control
inputs, not additional distinct configurations. There are no diagnostic actor
variants or third-renderer probes in the application scenarios.
These counts are not registered Vitest test counts or full-product coverage.

The earlier `/extracted`, `/runtime`, `/mechanisms`, their integration bundle,
and the optional pre-refactor capture comparison are retired. Those routes and
`/integration.js` return 404 locally and in fresh Pages artifacts. The alternate
`/feedback-standard.js` bundle is also retired.
Current fixtures/assertions replace external captures; archived forms, class
names and result schemas are not compatibility promises.

| Retired claim | Retained assertion |
| --- | --- |
| New destinations permit insertion; adoption can reject/cache rules | Persona-alone/runtime baseline and release/main [matrix cases](../tests/source/run.test.mjs). |
| Foreign writers borrow permission while new buckets remain blocked | Persona-first, sheet-only [baseline cases](../tests/source/run.test.mjs). |
| A prefix admits its rule, not another actor's | Both baseline host policies and [exact predicate tests](../tests/policy/host-policy.test.mjs). |
| Restoring native insertion does not retry cached rejection | [Cache replay](../tests/browser/adoption.test.mjs): actual candidate Feedback rule/cache, restored native insertion, and a fresh runtime-host document as the accepted-rule control. |
| Extracted versus runtime hosts retain the inspected gate and component coverage | [Matrix cases](../tests/source/run.test.mjs) and [artifact checks](../tests/architecture-build.test.mjs); native Fluent avatar declaration, not constructed colors. |
| Controls keep local actions and usable layout | [Participant](../tests/experiments/run.test.mjs), [gallery](../tests/gallery/playground.test.mjs) and [lifecycle](../tests/source/lifecycle.mjs) checks. |

[Gate tests](../tests/policy/host-contract.test.mjs) cover production/development/
test environments with extraction enabled/disabled, idempotence, provider
unmount versus sandbox disposal, native index zero, and rejection of forced-filter
overrides. Participant checks enforce the raw build, fixed Feedback options and
singleton retention; remount schedules enforce fresh Persona renderers.
The salt/precompiled and ownership-proposal comparisons are removed, not replaced
by purported equivalent evidence.
[Evidence lifecycle tests](../tests/evidence/lifecycle.test.mjs) cover native
replacement/removal, late insertion, unsupported cascade probes and disposal.

### Browser-test boundary

Vitest Browser Mode and its pinned Playwright provider own Chromium, interactions
and failure screenshots. A [test-only plugin](../tests/browser/application-plugin.mjs)
serves actual build artifacts through the server's allowlisted handler; Vite does
not combine the participant renderers. Cache replay uses the actual candidate
Feedback renderer, not an additional test actor. Servers bind ephemeral loopback ports.

[Application helpers](../tests/browser/application.mjs) create fresh same-origin
iframes, wait for readiness and honor test cancellation. Instrumentation captures
mount handles, appearance, native identity and unexpected errors before cleanup;
it neither changes participant policy nor substitutes bundles. Evidence stays
test-local in `task.meta.evidence`; report commands are in the [README](../README.md#tests).

Use retryable `expect.element` assertions or fresh nested-frame queries inside
`expect.poll`; evidence DOM is replaced on refresh. Vitest 4.1.12's local
nested-frame lookup has realm-specific checks, so do not retain detached
elements across interactions. Cross-realm snapshots are cloned before strict
comparison. Regression tests reject stale-trace false passes. Setup resets
viewport/pointer; timeouts are 15 seconds, explicitly 30 for settings/scaling.

## Documentation and UX contracts

The `/docs` page introduces actors once, follows their encounter, states the
conclusion, then offers a collapsed technical reference. The playground favors
live examples and compact causes over diagnostic prose. Preserve distinct
Message/View profile and Send feedback/Clear status actions, one shared action
row, and structural phone alignment rather than specificity-sensitive margins.
Do not manufacture failures with unrelated padding/color or reintroduce rejected
side-by-side intended-reference frames without a new user request.

[Conflict chapters](../src/playground/conflict-story.js) describe filter,
create/adopt/discard and attempt events.
[Explainer tests](../tests/gallery/explainer.test.mjs) compare final drawings
against a real Fluent Button rule in both coverage profiles: creator, attribute,
prefix, verdict, native presence, cache, filter, host renderer and discarded
handles. Borrowed permission and remaining rejections are checked separately.
The drawing covers one default bucket/rule per actor, not appearance or every
bucket (including Feedback-only rejections). Intermediate steps infer causal
order; only final states are compared with live evidence. Motion honors reduced
motion, keyboard stepping and tested mobile fit.

## Historical source evidence

### Current-source recheck (2026-10-16)

A dated authorized source recheck found the enhanced-specificity attribute guard
merged into inspected main; ownership filtering and shared renderer caching
remained an unmerged proposal. The consumer bootstrapper instead pinned Persona
1.20260927.13.2 with version locking enabled in checked-in defaults.
Package integrity was verified; its successful worldwide release build's
renderer blob matched the executed unguarded source. The scoping helper differed
only by a return-type annotation. Upstream merge therefore did not establish
consumer adoption. Effective overrides and deployed/incident-time assets remain
unverified.

The inspected host main still used sheet-only filtering; the prefix exception
was an independent unmerged proposal. Isolated native-insertion probes executed
immutable renderer source and original filter revisions, not a full provider or
SDK. They corroborated guard recovery, acceptance of foreign sheets carrying
the attribute, later foreign adoption, and fresh-per-mount versus proposed shared
cache behavior. An unprefixed foreign diagnostic demonstrated borrowed permission;
it was not a claim that prefixed Feedback always needs borrowed permission.

At that recheck, five setups across two host builds and two coverage profiles
gave 20 guarded public-fixture outcomes matching actual-source probes. Those are
historical corroboration counts, not the current matrix. The separate probes
used Griffel React 1.7.5/Core 1.21.3, React/React DOM 19.2.8 and Stylis 4.3.6.
The demo retains Griffel React 1.7.4/Core 1.21.3, React/React DOM 18.3.1,
Stylis 4.4.0 and Fluent UI 9.74.9. Agreement does not establish equivalence of
complete dependency graphs or deployed bundles. Private provenance and captures
are neither copied here nor executable dependencies of public tests.

## What is not yet established

- No candidate has met a full coexistence contract; successful recorded insertion
  is not an exhaustive inventory of component styles or proof of healthy UI.
- No third integration, exhaustive lifecycle/mixed-version matrix, portal/theme
  comparison, document-prop transition coverage, or Shadow DOM/iframe solution
  comparison exists yet. Host query sorting, CSP and font customization are not
  represented.
- The captured form bundle's embedded Griffel version, effective runtime
  settings, actual deployed revision and incident-time assets are unverified.
- These checks are not a complete visual/accessibility audit or production
  sign-off. The enhanced-specificity attribute, salts and filter IDs are not
  security guarantees or product affiliations.

The next research gate is [solution experiments](../ROADMAP.md#3-compare-solution-experiments).
Keep the baseline reproducible and label who must change and which failures
remain before expanding to another actor.
