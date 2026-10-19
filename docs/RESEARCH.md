# Research handoff

## Current state and purpose

The source baseline is public at
[bsunderhus/griffel-renderer-demo](https://github.com/bsunderhus/griffel-renderer-demo).
It starts with a fresh, sanitized history. This repository is the only active
implementation; no separate investigation checkout is needed.

The research asks:

1. How can independently bundled Griffel integrations interfere?
2. Which guarantees do scoped selectors, enhanced-specificity attributes, class salts, and
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

Open http://127.0.0.1:4173 for the playground or
http://127.0.0.1:4173/docs for the research guide. Linux environments without browser libraries may
need `npx playwright install --with-deps chromium`. No credentials or backend
are needed to run the experiments. See [README](../README.md) for ports,
remote forwarding, troubleshooting, and focused test commands.

On 2026-10-16 a fresh installation and hosted CI passed all 72 baseline cases.
The [recorded CI run](https://github.com/bsunderhus/griffel-renderer-demo/actions/runs/38928691644)
is evidence for that baseline, not proof that every future revision passes.
The source is published and a static build is deployed with GitHub Pages at
<https://bsunderhus.github.io/griffel-renderer-demo/> by
[deploy-pages.yml](../.github/workflows/deploy-pages.yml), gated on `npm test`.
`src/site.js` derives the base path from the `app.js` URL, and
`src/legacy-routes.js` mirrors the server's legacy redirects in the client.
The hosted site is a convenience view of the same experiment, not separate
evidence, and it cannot set the local server's `no-store` headers.
Licensing is still undecided. The known build-only dependency advisory and
publication decisions are documented in the [roadmap](../ROADMAP.md).

## Architecture: where to investigate

| Surface | Entry point | Responsibility |
| --- | --- | --- |
| Browser entry | [browser-entry.jsx](../src/browser-entry.jsx) | React globals and route dispatch only. |
| Playground | [playground/](../src/playground/) | Eight fixed-actor baseline schedules, independent version/policy/build/coverage controls, six collapsed counterfactual diagnostics/proposals. |
| Documentation | [Documentation.jsx](../src/playground/Documentation.jsx), [ConflictExplainer.jsx](../src/playground/ConflictExplainer.jsx), [conflict-story.js](../src/playground/conflict-story.js), [MechanismGuide.jsx](../src/playground/MechanismGuide.jsx) | Actors, evidence-checked encounter and conclusion, followed by a collapsed technical reference and links back to live examples at `/`. |
| Configuration | [scenarios.js](../src/experiments/scenarios.js), [configuration.js](../src/experiments/configuration.js) | Runtime inputs and validation, separate from gallery prose. |
| Orchestration | [run.js](../src/experiments/run.js) | Host baseline, validated load/mount/unmount schedule, explicit execution/configuration evidence and disposal. |
| Bundle adapters | [participants.js](../src/experiments/participants.js) | Script/global boundary; no participant UI or renderer construction. |
| Observation | [observation.js](../src/evidence/observation.js) | Native insertion identity, creator/writer attribution and renderer-call scopes. |
| Evidence snapshot | [snapshot.js](../src/evidence/snapshot.js), [cssom.js](../src/evidence/cssom.js) | Live sheets, caches, selector matches and bounded host declaration cascade. |
| Analysis | [analysis.js](../src/evidence/analysis.js) | Pure classification of recorded evidence, independent of DOM markup. |
| Presentation | [presentation.js](../src/evidence/presentation.js), [controller.js](../src/evidence/controller.js) | Evidence UI, disclosure state, refresh scheduling and disposal. |
| Scoped actor | [persona/](../src/persona/) | Contact-card intent, sheets with the enhanced-specificity attribute, head insertion point, Stylis scope rewrite. |
| Form actor | [feedback/](../src/feedback/) | Feedback intent, independent renderer, salt/prefix and module-level singleton. |
| Host | [host/](../src/host/) | Minimal/shared UI, renderer selection, host-owned filter installation, extraction gate and document-lifetime policy. |
| Shared UI | [PersonSummary.jsx](../src/shared/PersonSummary.jsx) | Neutral visual primitive, compiled separately into each importing participant. |
| Archived diagnostics | [archived/](../src/archived/) | Earlier mechanism and extraction routes, not dependencies of the main runner. |
| Bundling | [targets.mjs](../build/targets.mjs), [webpack-config.mjs](../build/webpack-config.mjs) | Explicit independent targets and narrowly scoped extraction/raw-style transforms. |
| Serving | [server.mjs](../server.mjs) | Allowlisted assets and routes, loopback only, no source maps. |
| Test configuration and primary tests | [vitest.config.js](../vitest.config.js), [tests/](../tests/) | Fidelity guards, 128 baseline executions, preload equivalence, diagnostics, evidence UI, interactions and navigation. |
| Archived tests | [archived tests](../tests/archived/run.test.mjs) | 24 extraction/runtime/adoption/cache diagnostics. |

### Documentation explainer

The page introduces the actors before showing the conflict. Its opening pair uses
the same Feedback-first, prefix-aware configuration: Feedback's rule inserts,
the pinned Persona rule is rejected, and changing only Persona to the guard
restores its insertion. The conclusion separates permission from ownership and
containment. Detailed mechanisms remain in a collapsed reference rather than
repeating the participant introduction.

The explainer is a narrative summary, not a separate model. Each chapter
names a scenario, host build and Persona version; its steps are declarative
events (filter, create, adopt, discard, attempt) from which every drawing is
derived. [Explainer tests](../tests/gallery/explainer.test.mjs) replay each
configuration in both coverage profiles and require the final drawing to match
the recorded Fluent Button rule creator, enhanced-specificity attribute, Feedback prefix, verdict,
CSSOM presence, renderer cache, effective policy, host renderer and discarded
handles. The borrowed-permission chapter uses unchanged inspected Feedback under the
sheet-only host and asserts both borrowed permission and remaining Feedback
rejections; the prefix chapter changes the host contract and asserts no borrowed
permission. Limits: it draws one default bucket and one representative rule per
actor, so it omits other buckets and textarea rules (for example, Feedback's
rejected rules in sheets Persona never created); it does not depict
appearance, which remains playground evidence. Intermediate steps show causal
order inferred from the arrival order and renderer profile; only final states
are compared with evidence. Motion animates transitions and is
limited to the playground bundle.

### Test runner and browser boundary

[Vitest](../vitest.config.js) runs Node unit/artifact checks and all browser
integration suites. Vitest Browser Mode owns Chromium through its Playwright
provider, including interactions, isolation and failure screenshots.
There is no manually managed browser/context/page fixture. Each browser test
uses a fresh application iframe with
[application-specific helpers](../tests/browser/application.mjs); teardown removes
it even on assertion failure, after Vitest's native screenshot capture.
Application errors become soft assertions during the active test, not failures
discovered after the screenshot hook. They do not use jsdom or let Vite combine the
independently compiled participants. Servers bind ephemeral loopback ports.

Revision pairs and diagnostic host/coverage comparisons are tested together,
without depending on a previously executed test. Gallery evidence checks are
parameterized by revision, host build and coverage. Live contracts, mobile resize,
hover/pressed state and fractional scaling run in separate tests; guide,
participant actions, scenario structure and settings also have separate tests.
Each test starts from a fresh application rather than relying on earlier tests.
Matrix-case totals describe experiment
coverage, not the number of registered Vitest tests. See the
[test commands](../README.md#tests) for build prerequisites and filtering.
Assertions and spies use Vitest APIs. Test-local records are exposed through
`task.meta.evidence`, not shared mutable suite state or custom JSON writers.
`npm run test:report` uses the built-in JSON reporter to export those records.
Passing tests do not write screenshots; Browser Mode captures failures.
The [enhanced-specificity attribute/owner adoption probes](../tests/browser/adoption.test.mjs) import the actual
Griffel renderer through Vitest rather than compiling a seed driver with esbuild.
A [test-only Vite plugin](../tests/browser/application-plugin.mjs) serves the
existing application artifacts through the standalone server's allowlisted
request handler. The application runs in a fresh same-origin iframe; its
independently compiled renderers are not part of Vitest's module graph.
Pre-bootstrap test instrumentation captures mount handles, native insertion
identity, unexpected application errors, unhandled rejections and failed assets,
including nested scenario frames and documents replaced during navigation.
It does not change renderer policies or replace the built participant modules.
Interactions use native Vitest locators. UI assertions use retryable
`expect.element` matchers. Nested-frame UI assertions re-query the live DOM
inside `expect.poll`: Vitest 4.1.12's local nested-frame queries use realm-specific iframe
checks, although the Playwright provider supports nested-frame interactions.
Evidence presentation replaces status/trace elements during refresh, so tests
must not retain those DOM elements across awaited interactions. Regression tests
verify that detached traces cannot hide incorrect live replacements.
CSSOM and renderer snapshots still use strict comparisons, not appearance-based
fallbacks. The viewport and pointer are reset before each browser test.
Application navigation retains its own iframe and test-abort signal, cleans up
load listeners on cancellation and waits for route-specific readiness.
The browser default timeout is 15 seconds, with explicit 30-second limits for
multi-navigation settings, multi-scale and full-baseline tests.
Snapshots crossing iframe realms are cloned before strict equality comparisons.

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
Historical and enhanced-specificity attribute-guarded Persona retain per-mount renderer creation;
owner-guard Persona caches by owner and document. The form profile creates its
singleton at module evaluation. No shared renderer factory is introduced.
Both Persona 1.20260927.13.2 and the guarded main snapshot (2026-10-16) have primary
scenarios. Every pair selects its revision explicitly. Unguarded adoption is not
merely historical: it is present in the inspected consumer's pinned release
build. Owner-filtered adoption remains an unmerged explanatory comparison.

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

[Architecture assertions](../tests/architecture.test.mjs) and
[build assertions](../tests/architecture-build.test.mjs) enforce participant import
boundaries, private Griffel implementations in all eight bundles and absence
of Button/Label/Textarea imports from minimal hosts. The build writes an ignored,
unserved module-name inventory for these assertions. No dependency upgrade,
framework, TypeScript or formatting/lint tool is introduced.

For the four retained counterfactual styling controls, the refactor comparison retains every generated runtime rule, insertion
decision, cache, sheet identity/creator, sharing result and host-impact outcome.
Module traversal changes the order of rules within the extracted host CSS;
the declaration multiset is unchanged. The comparator ignores only that
extracted ordering and the associated host background rule indices; browser
tests still verify actual positions and both cascade controls. Primary scenarios
intentionally changed to the source-aligned host contract and are covered by
contract-specific assertions, not a claim that their old diagnostic behavior is
unchanged. To compare the 16 retained control records with a saved pre-refactor JSON
result, rebuild and run the opt-in
[baseline comparison](../tests/experiments/baseline.test.mjs):

```sh
npm run build
BASELINE_RESULTS=/path/to/baseline-results.json npx vitest run tests/experiments/baseline.test.mjs
```

The test-only Vite plugin loads the explicitly supplied baseline as a virtual
module. The browser test executes all 16 retained diagnostic combinations,
checks the full control count and compares fresh evidence with that baseline.
It never reads a previous report, so a stale passing report cannot mask a
regression in the current build. Ordinary runs skip this comparison because
a portable checkout does not include an external pre-refactor capture.

When extending the lab, put participant behavior inside its module, runtime
inputs in experiment definitions, explanations in gallery content, and CSS
interpretation in evidence analysis. Add a named experiment rather than a
scenario-ID branch inside a participant or the runner.

Shared coverage imports real Avatar, Button, Label, and Textarea controls.
Minimal coverage imports only the host avatar UI. Separate bundles and extracted
stylesheets prevent unused form CSS from contaminating the minimal experiment.

### Reader model: responsibilities before conflicts

The gallery's integrated guide uses only the fictional participant names host,
persona and feedback. Its collapsible responsibility
cards replace the duplicated "Who is on the page?" introduction. The expanded
walkthrough explains the model in order:

1. **Active renderers versus sheets.** With both integrations mounted, there is
   one active host renderer, one Persona renderer per mounted provider, and the
   Feedback module's renderer. The extracted host renderer is a no-op; runtime
   mode makes it a DOM renderer. Persona-alone has two participant roles, while
   the seed example adds an unrelated DOM renderer and does not mount Feedback.
   Renderer wrappers, native sheets and full-product instance counts are not
   interchangeable quantities.
2. **Rule generation and destination selection.** Persona's parent-selector rewrite
   limits matches and adds specificity. Feedback's runtime salt changes class
   names, and its prefix labels rules. Griffel hydration can still select an
   existing bucket/priority handle without either integration owning its sheet.
3. **Enhanced-specificity attribute creation and policy.** The inspected `data-enhanced-specificity`
   attribute corresponds to the fictional `data-demo-allow-rules` in the live
   experiment. Requested attributes apply to new sheets, not adopted ones.
   The browser grants no special meaning to that attribute; the host reads the
   destination's style element to decide whether to call native insertion.
   The host's truthiness test differs from main Persona's exact `"true"` guard.
4. **Conflict evaluation.** The existing width-rule probe is compared across
   both Persona revisions, arrival orders and the sheet-only/proposed-prefix host
   filters. The runtime host disables the primary filter. A prefix exception
   does not add the enhanced-specificity attribute to a sheet or permit Persona's unprefixed rule.
5. **Independent outcomes.** A blocked insertion can leave assigned classes and
   cached rules without native definitions. Sharing, borrowed permission,
   selector matches, masking and changed host declarations remain separate.

The renderer totals are scoped to active fixture roles, not every constructed
object or real-product provider. Source tests check that mounted host/Persona/Feedback
handles have distinct renderer identities; architecture checks separately
establish independently bundled Griffel implementations. Gallery tests cover
the guide's version/build context, disclosure controls, live links, enhanced-specificity attribute
explanation and desktop/mobile responsibility layout.

## Source-aligned contract matrix

The [registry](../src/experiments/scenarios.js) separates eight baseline schedules
from six counterfactual diagnostics/proposals. A baseline schedule changes only
load/mount/unmount events. The actor configuration is selected independently:
`personaVersion`, `hostPolicy`, `host`, and `coverage`. Defaults are the pinned
release, sheet-only filter, extracted build and shared coverage.

Every baseline uses the production/extraction host gate and the unchanged
inspected Feedback actor: raw Fluent styles, salt, prefix, module-level singleton
and no requested enhanced-specificity attribute. Actor overrides, seeds and forced filtering are
rejected by configuration validation. The same actor artifacts/options are
recorded in `result.configuration`; `result.execution` records the actual
schedule and per-mount renderer identity/reuse. Native attempts retain actor and
mount-index attribution. Wrappers detach on unmount before a singleton is reused.

| Baseline schedule | First-mount order | Additional event distinction |
| --- | --- | --- |
| `persona-alone` | Persona | No Feedback mount. |
| `feedback-alone` | Feedback | No Persona mount. |
| `raw-marked-first` | Feedback, Persona | Load and mount each actor in turn. |
| `persona-first-raw` | Persona, Feedback | Reverse only arrival order. |
| `feedback-preloaded` | Persona, Feedback | Evaluate Feedback before Persona loads. |
| `both-preloaded` | Feedback, Persona | Evaluate both scripts before mounting either. |
| `feedback-reopened` | Persona, Feedback | Unmount/remount Feedback; retain its renderer/cache. |
| `persona-remounted` | Feedback, Persona | Unmount/remount Persona; create a fresh renderer. |

Schedules are validated before loading: no duplicate script evaluation, mount
before load, double mount, unmount of an absent actor, unknown event or unfinished
final actor set. The host is always ready first. No timing sleeps, random delays,
late-host race or arbitrary asynchronous render interleaving is claimed.
Construction alone does not select existing sheets in the pinned Griffel build;
provider-time hydration does. [Paired preload tests](../tests/source/schedules.test.mjs)
assert identical actor configuration, generated CSS, decisions, native presence,
caches and sheet relationships under all 16 version/policy/build/coverage inputs.

The missing Persona-first/sheet-only comparison now uses the inspected Feedback
unchanged. Its prefix is ignored by that host: shared buckets with the enhanced-specificity attribute admit rules,
while newly created buckets without the enhanced-specificity attribute can still reject them. No unprefixed actor
substitution is necessary to demonstrate borrowed permission.

The unrelated seed is now an extra-actor diagnostic, not a primary schedule.
The owner guard remains a separate proposal. Four older controls retain their
alternative Feedback builds/options, forced filtering and constructed collisions.
Canonical Feedback/host mounts do not apply the artificial matching orange reset.
The common 137px width witness is explicitly supplemental; baseline and explainer
assertions also follow actual Fluent Button rules and all-rule ledgers.

`master-rejects-marker` is removed as a duplicate card; its alias selects
`raw-marked-first&hostPolicy=master`. Legacy policy/version aliases are preserved
by server redirects and client normalization, including static sub-path hosting.
`/source` and `/three-actors` still redirect to the unified gallery.
The altered-Feedback `feedback-first`/`persona-first` cards are removed because
the same permission mechanisms now have fixed-actor baseline reproductions.
Their aliases select the matching sheet-only schedule with unchanged Feedback.
The redundant `no-policy` card redirects to the retained collision diagnostic.
Those diagnostic aliases are navigation compatibility, not evidence that the
old and new actor configurations are equivalent.

| Participant | Named behavior | Contract under test |
| --- | --- | --- |
| Host | `production-extraction` | Production plus extraction selects a no-op renderer and installs the insertion patch in a host layout effect. Non-extracted mode has a DOM renderer and no patch. |
| Host | `diagnostic` | Explicitly retains the old forced filtering controls; never described as the production gate. |
| Persona | Persona main snapshot (2026-10-16), `marker-guard` | Per-mount scoped renderer requesting the enhanced-specificity attribute; drops adopted handles without the exact `"true"` attribute value before inserting. Consumer adoption and a released version containing it are unverified. |
| Persona | Persona 1.20260927.13.2, internal profile `historical` | Per-mount scoped renderer requesting the enhanced-specificity attribute, without an adopted-sheet guard. Pinned by the inspected consumer bootstrapper; not proof of deployed assets. |
| Persona | `owner-guard` (proposal control) | Accepts adopted handles only for its owner; one renderer per owner/document, replaced when retained sheets become detached. Not merged into the inspected main snapshot. |
| Form | `inspected` | A raw-style bundle, module-level salted renderer and prefixed atomic/reset rules; no requested enhanced-specificity attributes. A precompiled bundle refuses this profile. |
| Form | `control` | Existing raw/precompiled, salt and prefix alternatives remain diagnostic controls. |

The exact stylesheet attributes and prefixes remain fictional. Native provider
theme rules are separate from Griffel renderer rules and need not carry the
form prefix. Assertions and ledgers distinguish them by bucket metadata rather
than pretending all CSS in a mount came through one renderer.

In source-aligned seed cases, observation starts after host mount and before
the unrelated renderer. Its sheet without the enhanced-specificity attribute can therefore exist even though
the host rejected its harmless seed rule. The event is recorded as unrelated;
it is not misattributed to Persona. Unlike the old diagnostic seed setup, this
seed runs under the already-active source-aligned gate.

[Source browser tests](../tests/source/run.test.mjs) cover 5 primary cases x 2 versions
x 2 host modes x 2 coverage profiles, plus the fixed owner proposal x 2 host modes
x 2 coverage profiles = 44 combinations: 20 pinned-release, 20 upstream-main and
4 owner-proposal cases. They assert native rule/cache
state rather than visual appearance. The [lifecycle probes](../tests/source/lifecycle.mjs)
also verify:

- Historical adoption without the enhanced-specificity attribute, exact attribute acceptance (including rejecting
  the truthy string `"false"`), matching-owner adoption and foreign-owner rejection.
- Renderer/cache reuse without duplicate Griffel insertion for an owner/document,
  separation of owners/documents, and recovery after sheet detachment.
- Raw form build enforcement, module-level renderer reuse and retention of sheets.
- No-op host insertion, document-patch persistence after provider unmount,
  and separate sandbox disposal.

[Gate tests](../tests/policy/host-contract.test.mjs) cover production, development
and test environments with extraction both enabled and disabled, plus patch
idempotence and explicit diagnostic overrides. Browser source cases run the
actual production build. The baseline matrix executes 8 schedules x 2 revisions
x 2 host policies x 2 host builds x 2 coverage profiles = 128 configurations.
Preload equivalence tests repeat paired schedules, not new distinct configurations.
Four older diagnostic controls retain 16 combinations, with separate seed,
proposal and 24-case archived coverage. Counts describe experiment executions,
not registered Vitest tests or complete product coverage.

This establishes the inspected styling mechanisms under pinned public
dependencies, not a complete product implementation. The captured form bundle's
embedded Griffel version and the incident-time bundle/deployed renderer revision
are not established here. Host query sorting, CSP settings, font/theme
customization and portals are not represented by these controls. Private source,
bundle captures and authenticated inspection artifacts are never dependencies of
the public tests or copied into this repository.

### Current-source recheck (2026-10-16)

An authorized source recheck confirmed that the inspected main branch uses the
`marker-guard` behavior. The source fix has merged; the stronger `owner-guard`
implementation remains an unmerged proposal. A completed source merge does not
establish a published artifact, consumer upgrade or deployed revision.

A subsequent consumer trace found Persona 1.20260927.13.2 pinned by the published
bootstrapper, with version locking enabled in checked-in consumer defaults.
The package integrity was verified. The corresponding successful worldwide
release build uses an unguarded renderer: its renderer blob is identical to the
previously executed unguarded source. The scoping helper differs only in an
explicit return-type annotation, not its algorithm. Thus the failing profile is
not safely described as obsolete simply because upstream main is fixed.
Runtime version overrides, the effective settings and assets of any deployed
client, and incident-time attribution remain unverified.

The inspected host main still has the sheet-only filter. Its prefix exception
is an active, unmerged proposal. The gallery labels that independent host axis
instead of presenting all source-aligned cases as shipped consumer behavior.

The recheck separately executed immutable renderer source and the original host
filter revisions in isolated native-insertion probes. The downloaded renderer
algorithms were not rewritten. Public renderer re-exports and separately bundled
Griffel stand-ins were used, not the full product provider or SDK. Private source,
lockfiles and provenance remain outside this repository.

Under those fixtures:

- Main's enhanced-specificity attribute guard prevents the historical rejection
  of Persona rules in adopted sheets without that attribute, in both arrival orders and both coverage profiles.
- The guard still accepts another owner's sheet with the enhanced-specificity attribute set to `"true"`. It does not
  stop a later foreign renderer from adopting Persona's sheets with the enhanced-specificity attribute.
  A deliberately unprefixed foreign control remains blocked alone but is
  admitted after main's Persona creates sheets with the enhanced-specificity attribute, under both coverage
  profiles. That demonstrates residual borrowed permission, not a claim that
  the inspected prefixed SDK needs to borrow it.
- Main uses a new renderer for each provider mount. Repeated mounts can share
  the same sheet and insert a generated rule again; the owner proposal's shared
  renderer/cache avoids that duplicate attempt in the probe.
- Protecting Persona does not admit Feedback rules rejected by the sheet-only
  host filter. Sharing remains distinct from borrowed permission when Feedback
  already has an independently accepted prefix.

At the recheck, all five baseline setups were also executed with the public
enhanced-specificity attribute guard profile across both host modes and coverage profiles. Their 20
native rule, cache, creator and sharing outcomes matched the corresponding
actual-source probes. Those configurations are now available through the shared
Persona version control, not test-only overrides or a consumer-upgrade claim.

[Current-main comparisons](../tests/source/current-main.mjs) now compare every
baseline schedule containing Persona across both host modes, filter revisions
and coverage profiles, using the existing matrix records.
The generated scoped rule, host contract, Feedback profile and
arrival order are the same; the Persona adoption profile changes. Both profiles
cache the rule. The release loses native insertion under the extracted host
filter after a seed without the enhanced-specificity attribute or Feedback-first arrival; both versions insert when
Persona creates sheets with the enhanced-specificity attribute first. Runtime mode confirms that adoption
alone does not reject the unguarded rule.

The separate source probes used public Griffel React 1.7.5/Core 1.21.3,
React/React DOM 19.2.8 and Stylis 4.3.6, matching selected entries in the
inspected lockfile. The demo retains its pinned dependency set, including
Griffel React 1.7.4, React 18.3.1 and Stylis 4.4.0. Agreement under those two
controlled runtimes is not equivalence of complete dependency graphs or product
bundles. Provider portals, theme/font settings, document-prop transitions and
the actual deployed version remain outside the executed proof.

## Current findings and underlying mechanisms

1. **Adoption:** RendererProvider hydration can select existing Griffel sheets
   by bucket and priority. The main-snapshot Persona discards handles without the enhanced-specificity attribute before
   insertion and inserts its scoped rules into destinations with the enhanced-specificity attribute. It does
   not relabel the rejected sheet or prevent a later renderer from adopting its
   sheets with the enhanced-specificity attribute. The pinned-release scenarios demonstrate the unguarded failure.
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
| `persona-alone` | Persona creates sheets with the enhanced-specificity attribute; all recorded scoped rules reach native CSSOM. No foreign selectors match the host. |
| `unmarked-d-first` | The release retains the handle without the enhanced-specificity attribute and loses its atomic rules; the main snapshot inserts into destinations with the enhanced-specificity attribute. The unrelated seed can still be blocked in either version. |
| `raw-marked-first` | Sheet-only default: Feedback is rejected; release Persona is also rejected, while main inserts into destinations with the enhanced-specificity attribute. With `hostPolicy=feedback-exception`, Feedback passes independently. Native parser rejections remain separate. |
| `persona-first-raw` | Reverse order with the same actors: shared buckets with the enhanced-specificity attribute admit Feedback. Sheet-only filtering still rejects its new buckets; the candidate prefix exception grants independent permission. |
| `master-rejects-marker` | Legacy alias for Feedback-first with `hostPolicy=master`, not another scenario implementation. |
| `owner-guard` | Unmerged proposal control: restricts adoption by owner and caches per owner/document; lifecycle probes verify recreation after sheet detachment. |
| `precompiled-salted` | Salt changes custom runtime classes but cannot rename precompiled Fluent classes. |
| `raw-unsalted` | Shared classes mask rejected rules; the winning host-avatar background declaration also changes in the extracted host. |
| `host-collision` / `host-collision-salted` | Same constructed reset, with and without salt: compare actual selector overlap and winning declarations independently of shared storage. |

Legacy computed snapshots include phone width 32px, primary background
`rgb(15, 108, 189)` and secondary action width 137px. These are supporting
regression diagnostics, not rule-availability verdicts. Expansion depends on
viewport and scaling; the causal assertions follow generated declarations,
native insertion, CSSOM presence and cache state instead. Legacy avatar color
snapshots use the initials slot, not the potentially transparent Avatar root.

The gallery has 14 cards, not a card per version/policy: 8 fixed-actor schedules
and 6 diagnostics/proposals. The baseline has 128 version/policy/build/coverage
executions; diagnostic and archived matrices are reported separately.
Tests also cover local interactions and presented
evidence. This is not a full visual or accessibility audit.

`window.threeActorResult` inside each example contains configuration, execution,
stages, per-rule events, sheet creators, rule lists, renderer caches, and measurements. The UI's expanded
rule trace follows an actual width rule: actor -> destination bucket/priority ->
creator -> enhanced-specificity attribute/rule prefix -> policy decision -> native insertion -> destination
CSSOM -> cache -> matching width rules.
Do not substitute inferred rule counts for this causal evidence.

Each actor's primary result explains the recorded cause before technical counts:
host rejection in an actor-created or adopted destination without a truthy enhanced-specificity attribute, missing prefix
compatibility, native insertion rejection, or disappearance after successful
insertion. Allowed cases explain the active permission route; shared sheets alone
are not failures. Causes are derived from events and effective policy, never
scenario IDs, dimensions or colors. Mixed outcomes preserve distinct reasons.
The detailed outcomes remain Insertion, Rules, Ownership, Sharing, and Permission,
inside the generated-rule disclosure rather than crowding the primary explanation.
Rule evidence retains the exact native `CSSRule` identity and separately checks
equivalent serialized CSS in the actual destination. A removed instance with an
identical surviving rule is a provenance warning, not proof that styling is
absent. Removing all equivalent CSS is a rule-availability failure. Other matching
rules never turn a blocked insertion into a successful insertion.

Sharing is bidirectional: creators also report later adopters, even if all their
own insertion attempts succeeded. Permission counts only attempts in foreign sheets
with a truthy enhanced-specificity attribute that lack an independently accepted prefix. The raw prefixed reverse
order demonstrates borrowed permission under sheet-only filtering, but only
shared storage when the prefix is independently accepted.

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

Primary cases explicitly pair the pinned release with the guarded main snapshot.
The release uses unguarded adopted-sheet selection; the owner guard remains an
unmerged proposal control. None establishes an incident-time deployment. The independently bundled renderers, actual
public Fluent components, extraction and native insertion are experimental
inputs, not approximated styles.

| Pair (same selected host build and coverage) | Changed input | Assertions in [source tests](../tests/source/run.test.mjs) and [diagnostic tests](../tests/experiments/run.test.mjs) |
| --- | --- | --- |
| `persona-alone` / `unmarked-d-first` | Existing default sheet without the enhanced-specificity attribute | Current Persona's rules insert into destinations with the enhanced-specificity attribute in both cases; the unrelated seed can still be rejected. |
| `unmarked-d-first`, change Persona version | Persona revision/profile only | Same generated scoped rule and host gate; main inserts while the release rule is rejected but cached. |
| `raw-marked-first` / `persona-first-raw` | Integration arrival order | Separate destinations versus shared sheets with the enhanced-specificity attribute; current Persona inserts in both orders. |
| `raw-marked-first`, change `hostPolicy` | Host prefix compatibility | Feedback's permission changes; current Persona still inserts in both cases. |
| `raw-marked-first`, change Persona version | Persona revision/profile only | Under the proposed host exception, Feedback's accepted prefix is unchanged; only the release loses its scoped rules. |
| `raw-marked-first` / `owner-guard` | Current versus proposed Persona | Enhanced-specificity attribute/owner-filtered destinations both insert; bounded lifecycle probes distinguish the attribute, ownership and cache reuse. |
| `host-collision` / `host-collision-salted` | Class salt | Unsalted foreign rule matches the host. Salt removes matching; runtime shared-sheet writes can remain. |
| `persona-first-raw` / `feedback-preloaded` | Script evaluation only | Same first-mount order, configuration, generated CSS, permissions, CSSOM, cache and handles. |
| `raw-marked-first` / `both-preloaded` | Script evaluation only | Preloading both scripts does not change provider-time adoption. |
| `persona-first-raw` / `feedback-reopened` | Feedback lifecycle | Same renderer survives reopening; cached Griffel rules are not retried. |
| `raw-marked-first` / `persona-remounted` | Persona lifecycle | A fresh renderer attempts Fluent rules again; document sheets persist. |

All baseline pairs hold `hostPolicy` constant unless explicitly changing it.
Seed, forced-filter, altered-Feedback, collision and owner-proposal rows are
counterfactual diagnostics, not baseline schedules. Under sheet-only filtering,
unchanged prefixed Feedback in the Persona-first schedule does borrow permission;
under the candidate prefix exception it has independent permission.

The guide connects container scoping, enhanced-specificity attributes, class salt and per-rule
prefixes to these live configurations. Their assumptions remain distinct:
elements must stay inside the scope (including portals); the enhanced-specificity attribute
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
Regression tests cover the baseline matrix and separate diagnostics, the two host declaration outcomes,
foreign matching versus storage, inbound sharing, borrowed permission,
equivalent-rule replacement/removal, late attribution/cache refresh, unsupported
probe conditions, and desktop/mobile/scaling disclosure behavior.

## UX decisions to preserve

- One collapsed-by-default participant-responsibility section precedes the scenarios;
  its overview, causal walkthrough and technique comparisons expand in place. Do not
  duplicate it in a separate actor introduction or add scenario cards to explain it.
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
