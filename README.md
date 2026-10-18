# Shared Griffel renderer playground

A local, synthetic demonstration of CSS interactions between a host application
and independently bundled contact-card and feedback-form integrations.
It uses public React, Fluent UI, Griffel, and Stylis packages. It does not
contain or claim to reproduce a proprietary product, SDK, or incident.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for publication gates, technique evaluation,
solution experiments, and the planned multi-integration coexistence lab.
This sanitized project is the only active implementation.
Public source, UI, tests and documentation refer to the participants only as
host, persona and feedback. A repository naming check guards that convention.

A static build of the playground and documentation is published with GitHub
Pages at <https://bsunderhus.github.io/griffel-renderer-demo/>. Everything runs in
the visitor's browser; it has no backend, network submission, or telemetry.

Continuing in a new environment or with an AI assistant? Start with
[AGENTS.md](AGENTS.md) and the self-contained
[research handoff](docs/RESEARCH.md). They describe the architecture, measured
behavior, design decisions, and next bounded task without requiring chat history.

## Setup

Requires Node.js 20 or newer and npm. The demonstration was tested with
Node.js 24.15.0 and npm 11.12.1. Run commands from this directory:

```sh
npm ci
npm run build
npm start
```

Open http://127.0.0.1:4173 for the playground or
http://127.0.0.1:4173/docs for the research guide. The server binds to loopback.
Forward that port when working remotely. No credentials, private registry,
backend, or SDK are required. After source changes, rebuild and refresh: there
is no watcher.

To use another port:

```sh
PORT=8080 npm start
```

In PowerShell:

```powershell
$env:PORT = "8080"
npm start
```

Stop the server with Ctrl+C.

## What this demonstrates

Separate renderers can adopt the same style sheet. A demonstration host filter
then makes insertion decisions based on destination metadata or a synthetic
rule prefix, rather than the renderer that generated the rule.

1. **Sheet selection:** bucket and priority determine which existing sheets a
   renderer adopts.
2. **Permission:** a container-scoped integration requests specially marked
   sheets. Another integration may adopt them, or the scoped integration may
   adopt an unmarked sheet.
3. **Appearance:** shared CSS can mask rejected rules. A deliberately overlapping
   avatar reset also demonstrates a late rule changing host styling.
4. **Cache:** a rejected insertion can leave a rule recorded in Griffel's cache.

The marker names, salt, host filter, and integration configurations are invented
for this experiment. They are not security boundaries or recommended production
policies. CSS scoping is not document isolation, and class-name salt does not
provide private style sheets.

### How the participants work and conflict

The separate [documentation page](/docs) tells the story in order: meet the
actors, follow their encounter, then draw the conclusion. The host checks a
destination sheet or rule prefix, not the renderer writing the rule. An animated
SVG explainer starts with Feedback first under the proposed prefix exception:
Feedback inserts while the pinned Persona release is rejected in the same sheet.
The next chapter changes only Persona to the main guard. Later chapters show Persona first under the
historical sheet-only control (borrowed permission), Persona first with the
prefix exception, and a runtime host without a filter. Each step draws ownership
(which renderer created or adopted a sheet), permission (the host filter) and
CSSOM insertion separately, and links to the matching playground configuration.
The chapters are a declarative script in
[conflict-story.js](src/playground/conflict-story.js); tests replay each linked
configuration and assert that the final drawing matches recorded creator,
marker, prefix, verdict, presence and cache evidence. The explainer honors
reduced-motion preferences and supports keyboard stepping.

The actors are introduced once, before the explainer. Below the conclusion, a
collapsed **Technical reference: renderers, rules and evidence** retains the
step-by-step rule journey, technique comparisons and limitations on demand.
The playground at `/` stays focused on settings,
live examples, and evidence.

- **Host** builds its own extracted CSS, supplies a no-op host renderer
  in extracted mode and installs a document-wide native-insertion filter.
- **Persona** supplies a separate renderer, scopes its rules under a parent
  selector and requests marked new sheets. Its pinned release and guarded main
  snapshot differ in how they handle adopted unmarked destinations.
- **Feedback** uses the inspected module-level renderer profile,
  salted runtime names and prefixed rules, but requests no Persona approval marker.

With both integrations mounted, the fixture has three active participant
renderer roles, not three private sheets. The extracted host's role is a no-op;
Persona and Feedback use DOM renderers. Persona-alone and unrelated-seed cases have
different counts, explained in the guide; this is not a census of real-product
renderers.

The inspected `data-enhanced-specificity` attribute maps to the running demo's
fictional `data-demo-allow-rules` marker. The attribute itself adds no CSS
specificity: Persona's extra parent selector does that. The host turns the attribute
into permission by reading the destination sheet. Adoption does not relabel
that sheet, which explains both legitimate Persona rejection and foreign writes
through Persona-marked sheets. The guide separates those mechanisms, the unmerged
host-prefix exception, cache state, native parser rejection and host collisions.

## Playground

The playground at `/` keeps five primary scenarios. **Persona version** in
Advanced host control reruns those same scenarios with either renderer revision,
without adding duplicate cards:

- **Persona 1.20260927.13.2:** the release pinned by the inspected consumer
  bootstrapper, using unguarded sheet adoption.
- **Persona main snapshot (2026-10-16):** the upstream source containing the marker
  guard. No published release containing that guard is established here.

The consumer's checked-in defaults enable version locking. That is source
consumption evidence, not proof of effective runtime settings or deployed assets.
Eight collapsed controls retain the unmerged owner-guard proposal and seven
diagnostic configurations.

The source-aligned primary scenarios run across both host modes and component
coverage profiles:

- The **host** selects a no-op renderer and installs its filter in a layout
  effect only when production mode and extraction are both enabled. Runtime
  mode uses a DOM renderer and no insertion filter. Filter installation is
  idempotent per document and survives provider unmount; sandbox disposal
  separately restores native insertion.
- **Versioned Persona** explicitly selects either the pinned release's unguarded
  renderer or the main snapshot's `marker-guard`. The latter discards incompatible
  handles before insertion, but does not enforce exclusive ownership: another
  owner's approved sheet can still be accepted, and a later foreign renderer can
  adopt Persona's approved sheets. The unmerged `owner-guard` proposal remains a
  control, not either revision's default.
- The **inspected form profile** uses its independently compiled raw-style
  bundle, module-level renderer, salted runtime names and prefixed rules, without
  requested sheet-approval metadata. A precompiled control bundle rejects that
  profile rather than pretending to provide it.

These are sanitized simulations of inspected styling contracts, not a complete
product integration or an incident-time deployment. The pinned public library
versions, fictional UI and marker names remain explicit experimental inputs.
Host custom query sorting, CSP configuration, theme/font customization and
portals are outside these cases. The actual deployed revision, incident-time UI
asset and embedded SDK Griffel version are not established by this repository.

Five primary examples are visible; eight explanatory controls are collapsed.
Each includes load order, a takeaway, live controls, and compact outcomes:
**Insertion**, **Rules**, **Ownership**, **Sharing**, and **Permission**.
Expand **Generated CSS and rule evidence** to follow the selected action-width
rule, then **All recorded insertion attempts** to inspect every recorded rule.

The rule trace distinguishes the generated CSS, host permission decision,
native insertion, actual destination CSSOM contents, renderer cache, and
matching selectors. The original native rule's identity and equivalent
serialized CSS are reported separately: a replacement can preserve styling
without preserving the recorded insertion. Statuses depend on CSS evidence, not computed
widths, colors, or visual comparisons. Browser scaling and pointer state cannot
turn correctly inserted CSS into a reported style mismatch. Existing matching
CSS never converts an actor's blocked rule into a successful insertion.
Legacy computed snapshots remain in the full diagnostic JSON for baseline
research; they do not determine the rule-evidence outcomes.

The host is not marked healthy merely because integrations inserted their rules.
Its card reports foreign sheet handles, native foreign writes into host-created
sheets, and foreign CSS rules currently matching host elements. These are
independent facts: shared storage or duplicate matching CSS need not cause damage.
The constructed avatar probe compares the winning `background-color`
declaration before and after integration load using native CSSOM rules,
importance and source order. It is limited to unconditional, single-class
selectors; unsupported cases are explicitly unresolved, never a success.
An unchanged probe does not establish correctness of the entire host.

Red indicates blocked/missing recorded CSS or a changed host-probe declaration.
Amber flags sharing, borrowed permission, parser rejections, or lost native
instances whose equivalent CSS remains. In particular, Chromium's rejection of
Firefox-only placeholder syntax stays visible as a native rejection, not a host
block or a claim that every component lost its styles.

The gallery's mechanism guide links technique guarantees and assumptions to
paired reproductions. Start with extracted CSS and minimal coverage to reduce
masking, then repeat with shared coverage and the runtime-host control.
The versioned findings are:

- The pinned release can cache scoped rules that are rejected after an unmarked
  sheet or Feedback-first arrival. Calling it merely a historical control would
  misrepresent the inspected consumer's version pin.
- The upstream main snapshot's scoped rules insert in all five setups, including
  after unmarked sheets. This does not establish consumer adoption of that fix.
- Reversing arrival order can still produce shared approved sheets. That is not
  exclusive ownership or proof of damage.
- The inspected host main uses a sheet-only filter. The Feedback prefix
  exception is an unmerged host proposal, labeled separately in each example.
  Under the sheet-only filter, Feedback-first blocks both actors in the pinned
  release; the upstream guard protects Persona, not Feedback.

Both renderer revisions remain first-class reproductions. The owner proposal is
a stronger, separately labeled comparison.
The intentionally overlapping avatar reset is a separate collision probe,
not a prerequisite for the adoption-plus-filter failure.

The contact card offers Message and View profile. The feedback form offers
Send feedback and Clear status. All actions are local; no form data is sent.
View profile and Clear status have a 137px customization. Rejected rules may
make them expand. A green host avatar turning orange demonstrates the
constructed class collision.

**Advanced host control** offers three independent choices:

| Choice | Values | Purpose |
| --- | --- | --- |
| Persona version | Pinned release / guarded main snapshot | Rerun the same scenarios with a different Persona adoption contract. |
| Host CSS | Extracted / runtime | Compare build-time CSS with runtime insertion. |
| Component coverage | Shared / minimal | Compare a host using form controls with one using only an avatar. |

The URL preserves these choices, for example
`/?host=extracted&coverage=minimal`. Each example starts in a fresh iframe.
Fragment links such as `/#host-collision` open the relevant control group.
An isolated example is available at
`/?scenario=raw-marked-first&host=extracted&coverage=shared&personaVersion=1.20260927.13.2`.
The version defaults to the consumer-pinned release. Set
`personaVersion=main-2026-10-16` for the guarded source snapshot; the same scenario
IDs are used for both. Changing host CSS or coverage preserves the version, and
isolated links and reloads retain it. Explicit explanatory controls do not
change renderer profile with this selector. Version names identify inspected
renderer contracts, not a complete SDK implementation.
Old `/three-actors` and `/source` links redirect into this same gallery;
the seven former `source-*` scenario IDs map to their canonical counterparts.
The former `marker-guard` example redirects to `raw-marked-first` with the main
snapshot selected instead of duplicating it.
The former `historical-unmarked-first` and `historical-feedback-first` links map
to the same canonical scenarios with the pinned release selected.

Within the seven diagnostic controls, the filter is deliberately activated after host mount in both host modes.
Runtime mode with filtering is a diagnostic control, not a claim about typical
production configuration. Both primary renderer revisions and the
owner proposal use the host-owned production/extraction gate. The checks cover selected CSS mechanisms, not
complete visual correctness or accessibility.

Archived `/extracted`, `/runtime`, and `/mechanisms` routes contain earlier
generic diagnostics. They remain available for regression testing.

## Tests

Install the browser once:

```sh
npx playwright install chromium
npm test
```

On supported Linux systems needing browser libraries, use
`npx playwright install --with-deps chromium`; OS installation may require
administrator privileges.

The full suite builds and runs 96 matrix cases: 72 distinct gallery/renderer
combinations plus 24 archived diagnostics. There are only 13 gallery cards:
5 primary scenarios × 2 Persona versions × 2 host builds × 2 coverage profiles = 40
primary combinations, plus 8 fixed-profile controls × 2 host builds × 2 coverage
profiles = 32 control combinations.
The five release/main pairs yield 20 direct comparisons from those
same records; no test-only scenario override or duplicate primary gallery is needed.
It also checks gate truth tables, filter
idempotence, renderer/cache lifecycle and build boundaries.
Vitest is the single runner for both unit and integration tests, configured in
[vitest.config.js](vitest.config.js). The `unit` project runs pure logic and
source-contract and HTTP redirect checks in Node without a build or browser.
The `integration` project checks build artifacts.
The `browser` project runs all browser integration, gallery, lifecycle and
adoption tests in Vitest Browser Mode. Vitest owns Chromium, its Playwright
provider, interactions and failure screenshots; tests do not launch browsers,
create contexts or manage pages themselves.
The [application helpers](tests/browser/application.mjs) create fresh same-origin
application iframes and remove them after each test, including on failure.
Application errors are recorded as Vitest soft assertions while the test runs,
so native failure screenshots are captured before DOM cleanup.
A [test-only Vite plugin](tests/browser/application-plugin.mjs) serves the actual
independently compiled bundles through the standalone server's allowlisted
request handler, not a Vitest-transformed replacement application.
Only the adoption probes import a seed Griffel renderer through Vitest; that
renderer stays separate from the compiled Persona renderer. No test invokes
esbuild or injects a manually compiled seed script.
Paired revisions and host/coverage comparisons remain
in the same parameterized test so filtered runs do not depend on another test.
The 96 matrix cases are grouped into named tests alongside UI and lifecycle
checks; the Vitest test count is not the matrix-case count.
Assertions use Vitest's `expect` matchers, with domain-specific checks in
reusable helpers. Each browser test keeps its evidence local; there are no
suite-wide result arrays or file-writing teardown hooks.
UI checks use retryable `expect.element` assertions or fresh DOM queries inside
`expect.poll` for nested frames. CSSOM and renderer snapshots retain strict
comparisons. Gallery guide, actions, settings, live evidence, mobile resize,
pointer/keyboard states and scaling have independently named tests.
[Explainer tests](tests/gallery/explainer.test.mjs) compare each chapter's
final drawing with live evidence under both coverage profiles, then step the
UI by button and keyboard and check mobile fit. A
[unit check](tests/conflict-story.test.mjs) keeps the script consistent with
scenario definitions and with its own drawn filter rule.
Browser setup resets the viewport and pointer between tests. Navigation targets
the requested application iframe and listens to Vitest's test-abort signal.
Most browser tests have a 15-second timeout; multi-navigation settings,
multi-scale and optional full-baseline checks explicitly allow 30 seconds.
Tests start ephemeral loopback servers and do not require a preview
server. Expected blocked-insertion errors and red/amber cards are test evidence,
not necessarily test failures. A failed assertion or build exits nonzero.

Run fast checks or watch them without rebuilding:

```sh
npm run test:unit
npm run test:watch
```

Build and run integration checks, including the Browser Mode project:

```sh
npm run test:integration
```

Generate standard Vitest JSON and replayable blob reports, including per-test
research evidence and any failure artifacts:

```sh
npm run test:report
```

After a build, filter by file or test name without rebuilding:

```sh
npx vitest run tests/policy/host-contract.test.mjs
npx vitest run tests/source/run.test.mjs
npx vitest run tests/archived
npx vitest run --project browser
npx vitest run --project browser -t feedback-first
```

All test selection uses Vitest projects, file filters, or test names directly;
there are no custom test launchers.

Ordinary test runs do not export JSON or capture screenshots on success.
On browser-test failure, Browser Mode writes a screenshot under
`test-results/screenshots/`. `npm run test:report` also writes the replayable
`test-results/blob/report.json` and `test-results/report.json` through
Vitest's built-in reporters.
Experiment results are in each JSON test's `meta.evidence` field;
filtered reports include only the tests selected, not a complete matrix.
The optional saved-baseline comparison is skipped unless `BASELINE_RESULTS` is
set. It executes all 28 diagnostic combinations afresh against the current build,
not a previously generated report; see the
[research notes](docs/RESEARCH.md#build-boundaries-matter).
Tests still read built files to verify extraction, dependency boundaries and raw
Fluent modules. Builds and their unserved module-name inventory live in ignored
`dist/`. Neither reports nor build output are needed in a source export.
Source-map generation and serving are disabled to reduce accidental source
and local-path disclosure when sharing a running preview.

The [validation workflow](.github/workflows/validate.yml) runs a clean
`npm ci`, installs Chromium with system dependencies, and runs `npm test` on
Node.js 24 for pushes and pull requests. It does not publish the playground or
upload generated evidence.

The [Pages workflow](.github/workflows/deploy-pages.yml) repeats that validation
on pushes to `main` and only then deploys `dist/pages/` with the
`pages: write` and `id-token: write` permissions scoped to its deploy job.
`npm run build` generates that artifact from the same allowlist the local
server uses (`SITE_FILES` in `server.mjs`). Each route becomes an `.html` file,
so `/docs` keeps its query string. The application derives its base path from
the `app.js` URL, so the same build runs at `/` locally and at
`/griffel-renderer-demo/` on Pages. A browser suite
(`tests/browser/pages.test.mjs`) serves the artifact under a sub-path and checks
that results match the root build and every link and asset keeps the base.
Pages cannot send the local server's `302` redirects or `no-store` headers.
Legacy routes and scenario aliases are normalized in the client instead, and
hosted assets may be cached. The
[first hosted validation](https://github.com/bsunderhus/griffel-renderer-demo/actions/runs/38928691644)
passed all 72 cases on 2026-10-16.

A fresh source-only install and all 72 tests passed on Node.js 24.15.0.
That install reported eight moderate dependency advisory entries, traced to
one development-only extraction-tool dependency advisory. See the
[roadmap](ROADMAP.md#initial-publication-decision) for the chain, known risk,
and decision to preserve the pinned baseline. This is not a clean security audit.
The test-runner migration pins Vitest 4.1.12 and its Vite 6.4.4 peer to retain
Node.js 20 compatibility without upgrading the experimental build dependencies.
The Browser Mode Playwright provider is pinned to the same Vitest version.
Vite is used by the test runner; webpack and esbuild still build the application.
[Motion](https://motion.dev) 14.3.0 (MIT) is pinned for the documentation
explainer's SVG transitions. esbuild bundles it only into the playground
`app.js`; participant webpack bundles do not import it, and it does not change
generated classes, adoption or insertion.

## Troubleshooting

| Problem | Action |
| --- | --- |
| Installation fails | Check Node/npm versions and public registry access; preserve the lockfile. |
| Missing assets or stale UI | Run `npm run build`, then refresh. Do not open HTML directly through `file:`. |
| Port already occupied | Choose another `PORT` or stop your specific preview process. |
| Remote page unreachable | Keep the server running and forward its loopback port. |
| Missing Chromium | Run `npx playwright install chromium`. |
| Missing browser libraries | Use the supported Linux `--with-deps` command above. |

## Source layout

- [src/host/](src/host/): application UI, explicit minimal/shared entries,
  renderer mounting, extraction assertion and host insertion policy.
- [src/persona/](src/persona/): contact-card UI and its scoped, marked renderer.
- [src/feedback/](src/feedback/): form UI, salted/prefixed renderer and singleton profile.
- [src/shared/](src/shared/): neutral UI primitives compiled into each participant;
  not a shared browser renderer or participant-switching component.
- [src/experiments/](src/experiments/): runtime definitions, validated configuration,
  bundle adapters, seed and sequential orchestration.
- [src/evidence/](src/evidence/): observation, native CSSOM snapshots, pure
  classification, presentation and refresh/disposal. Legacy computed diagnostics
  are kept separate from correctness analysis.
- [src/playground/](src/playground/): gallery, explanations, settings and scenario
  presentation content; it does not own participant behavior.
- [src/archived/](src/archived/): earlier diagnostics and their integration fixture.
- [src/browser-entry.jsx](src/browser-entry.jsx): browser globals and route dispatch.
- [src/site.js](src/site.js) / [src/legacy-routes.js](src/legacy-routes.js): base-path
  links for sub-path hosting and client-side legacy route normalization.
- [build/targets.mjs](build/targets.mjs): explicit eight-target build manifest.
- [build/webpack-config.mjs](build/webpack-config.mjs): extraction and raw-style
  transforms; each target is compiled separately.
- [build.mjs](build.mjs) / [server.mjs](server.mjs): build execution, the `dist/pages/`
  static artifact and loopback serving.
- [tests/](tests/): policy, architecture, evidence, experiment, gallery and archived checks.
- [vitest.config.js](vitest.config.js): unit/integration projects and browser-test timeouts.
- [tests/archived/](tests/archived/): archived diagnostic coverage.

## Export boundary

This directory is a history-free local export. It excludes the investigation's
Git metadata, private-source citations, artifact captures, provenance records,
ignored build output, and test logs. Do not add those materials back.

Technical sanitization is not a licensing or company release approval.
Review authorship and redistribution rights before publishing; this export
does not grant a license or establish external-release authorization.

No project license has been granted yet. Public source availability does not
by itself grant permission to reuse or redistribute this project's code.
