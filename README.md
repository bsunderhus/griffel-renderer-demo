# Shared Griffel renderer playground

A local research playground for CSS interactions between a host application,
a contact card ("Persona"), and a feedback form ("Feedback"). It uses actual
public React, Fluent UI, Griffel, and Stylis packages with independently bundled
renderers. Sanitized local UI models inspected styling contracts, not a complete
product or incident replay.

**[Open the hosted playground](https://bsunderhus.github.io/griffel-renderer-demo/)**
or run it locally below. Everything runs in the browser: no backend, network
submission, telemetry, credentials, or private dependencies.

| Document                               | Use it for                                                                       |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| This README                            | Setup, playground controls, test commands, and hosting.                          |
| [Research reference](docs/RESEARCH.md) | Architecture, actor contracts, findings, assertions, and limits of the evidence. |
| [Roadmap](ROADMAP.md)                  | Verified gates, open publication decisions, and future experiments.              |
| [Agent guide](AGENTS.md)               | Working rules for preserving this experiment.                                    |

## Setup

Requires Node.js 20.19+, 22.13+, or 24+ and npm (matching ESLint's supported
runtime ranges). The fresh-install baseline was tested with
Node.js 24.15.0 and npm 11.12.1. From this directory:

```sh
npm ci
npm run build
npm start
```

Open http://127.0.0.1:4173 for the playground or
http://127.0.0.1:4173/docs for the visual research guide. The server binds only
to loopback; forward its port when working remotely. Rebuild and refresh after
source changes; there is no application watcher. Do not open HTML through `file:`.

To choose another port:

```sh
PORT=8080 npm start
```

In PowerShell:

```powershell
$env:PORT = "8080"
npm start
```

Stop your server with Ctrl+C.

## Playground

The experiment separates **sheet selection, insertion permission, CSS matching,
and appearance**. Independent renderers can adopt the same sheet; a host filter
then checks the destination's enhanced-specificity attribute or a rule prefix,
not the identity of the writer. Rejected rules can remain cached, and existing
matching CSS can mask their absence.

The `/docs` page introduces the actors, animates their encounter, and provides
a collapsed technical reference. The baseline playground at `/` focuses on the
reported failure. The separate `/proposal` playground compares two explicitly
labeled solutions without changing the baseline.

### Baseline playground

Its **Advanced host control** applies four independent settings to the same
baseline schedules:

| Choice               | Values                                          | Default               |
| -------------------- | ----------------------------------------------- | --------------------- |
| Persona version      | Pinned release / guarded main snapshot          | `1.20260927.13.2`     |
| Host filter revision | Sheet-only / Feedback-prefix exception          | `master` (sheet-only) |
| Host CSS             | Extracted / runtime                             | Extracted             |
| Component coverage   | Shared form controls / minimal avatar-only host | Shared                |

The main snapshot is selected with `personaVersion=main-2026-10-16`; it is not
evidence of a released or deployed consumer upgrade. The prefix exception is
also an unmerged candidate. See the
[actor contracts](docs/RESEARCH.md#source-aligned-contract-matrix).

Eight baseline schedules vary loading and lifecycle events, **not actor code**:
single actors, both arrival orders, script preloading, Feedback reopening, and
Persona remounting. They keep the same raw-style, salted, prefixed Feedback
singleton. The baseline has no alternate Feedback build, extra actor, constructed
collision, forced-filter host, or ownership-fix scenario. Opt-in candidates
are kept in their own playground rather than as advanced baseline settings.

### Proposal playground

Open `/proposal` or choose **Proposal playground** in the navigation. The
**Proposal** selector switches between:

| Proposal                | Persona                                                                                    | Feedback                                                                                                      | Extracted host policy                |
| ----------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Prefix + salt (default) | Raw Fluent styles, existing scope, distinct salt, leading Persona comment, no allow marker | Unchanged inspected renderer                                                                                  | Recognizes both integration prefixes |
| Feedback marker         | Unchanged pinned release, including scope and sheet marker                                 | Same raw styles, salt, prefix and singleton; requests the enhanced-specificity attribute on sheets it creates | Unchanged sheet-only filter          |

Use `/proposal?proposal=feedback-marked` to open the minimal marker proposal
directly, or `proposal=prefix-salted` for the first proposal. Each selection
runs all eight schedules with fixed actors. Host build mode and component
coverage remain independent controls. Runtime mode installs no host filter.

Both candidates pass their 32-case schedule/build/coverage matrices. Paired
baseline/marker checks confirm identical generated rules and classes while
the marker changes insertion permission. Native Chromium parser rejection of
Firefox-only placeholder selectors remains separately recorded.

The prefix permits insertion under the candidate host policy; the salt changes
generated class names. Salt alone does not grant permission, prevent sheet
sharing, or authenticate a rule prefix. The marker grants destination-based
permission, not additional selector scope; it does not mark an existing sheet
that Feedback adopts. Runtime-host checks observe such unmarked adoption
without rejection because no filter is installed. The marker result establishes
feasibility for these actors and schedules, not safety for every possible
pre-existing sheet. Neither proposal establishes production deployment readiness.

Each example starts in a fresh iframe. Settings survive navigation and reload:

```text
/?scenario=raw-marked-first&host=extracted&coverage=minimal&personaVersion=1.20260927.13.2&hostPolicy=master
```

Fragment links such as `/#raw-marked-first` select a live schedule.
The [schedule reference](docs/RESEARCH.md#source-aligned-contract-matrix)
lists IDs and expected comparisons.

### Read the results

The visible result explains **what blocked insertion or why it was allowed**.
Expand **Generated CSS and rule evidence**, then **All recorded insertion
attempts**, to follow real generated rules through destination selection, host
permission, native insertion, CSSOM presence, and cache state.

- **Red:** blocked/missing recorded CSS, or a changed host-probe declaration.
- **Amber:** sharing, borrowed permission, native parser rejection, or replacement
  of a recorded native rule while equivalent CSS remains.
- Neither shared storage nor matching appearance proves success or failure.

Each scenario includes one short **Visual check** above its live example.
These are comparison prompts, not appearance verdicts. Actor summaries remain
focused on insertion evidence, without duplicate visual descriptions. For
Persona-first schedules, click **Share feedback** and compare its blue bottom
focus underline with the Feedback prefix exception or runtime host. The page's
general focus outline may remain even if Fluent's underline is missing.
Matching CSS can mask a missing rule; one blocked background rule does not
prove that an entire button is browser-default. Feedback-alone scenarios
identify Persona as not mounted, not as a tested Persona revision.

A real Fluent Button background rule witnesses outcomes, without an added
measurement declaration. Persona's avatar has a custom lavender background,
applied through Griffel to the Fluent Avatar's initials slot in every schedule.
Compare scenario 1 (Persona alone) with scenario 3 (Feedback first): under the
pinned release and extracted host, the latter loses that color and becomes
transparent, even with shared host coverage. The compact card layout stays
unchanged. Runtime mode and the guarded Persona revision preserve the lavender
background. The phone icon button and View profile button also use a pale
lavender fill, purple foreground and border; the contact heading repeats the
purple accent. These Persona-only Griffel overrides change colors, not component
dimensions, spacing or shapes, and disappear when their rules are blocked.
Host results separately report foreign
writes, selector matches, and a bounded avatar-background cascade check, not
complete host correctness. Computed appearance snapshots are test-only and do
not ship in runtime JSON. See the
[evidence contract](docs/RESEARCH.md#evidence-contract) for interpretation limits.

Message/View profile and Send feedback/Clear status are local actions only.

## Code quality

ESLint 10 checks ESM JavaScript/JSX with its recommended correctness rules,
native JSX reference tracking, React Hooks rules, strict equality, and braces
around control flow. JSX files retain `React` for the classic build transform.
Unused arguments or caught errors may use an intentional `_` prefix.
Browser globals apply to application/browser-test code; Node globals apply to
tooling and tests. The host's build-time `process.env.NODE_ENV` is explicitly
allowed. Prettier owns layout (two spaces, double quotes, semicolons, and a
100-column target), including Markdown, HTML/CSS, JSON, and workflow YAML.
There is no TypeScript or type-checking step.

```sh
npm run lint
npm run format:check
```

Use `npm run lint:fix` for safe ESLint fixes, then `npm run format` to format.
Review fixes before committing; neither command replaces the behavior tests.
Both tools exclude generated output in `dist/` and `test-results/` and installed
dependencies. Prettier also leaves the npm-generated lockfile alone and respects
the repository's `.gitignore`.

Both CI workflows require these checks before building/testing or publishing.
Lint/format dependencies are pinned separately from the experimental runtime
and build inputs; adding them does not upgrade those inputs.

## Tests

Install Chromium once before browser tests:

```sh
npx playwright install chromium
```

On supported Linux systems missing browser libraries, use
`npx playwright install --with-deps chromium`; this may require administrator
privileges.

| Command                    | Scope                                                                |
| -------------------------- | -------------------------------------------------------------------- |
| `npm test`                 | Build all eight participant targets and the app, then run all tests. |
| `npm run test:unit`        | Fast Node checks without a build or browser.                         |
| `npm run test:watch`       | Watch the unit project.                                              |
| `npm run test:integration` | Build, then run artifact and browser projects.                       |
| `npm run test:report`      | Build and run all tests with JSON and replayable blob reports.       |

After a fresh build, use Vitest file/name filters without rebuilding:

```sh
npx vitest run tests/source/run.test.mjs tests/source/schedules.test.mjs
npx vitest run tests/source/solution.test.mjs
npx vitest run tests/browser/adoption.test.mjs
npx vitest run --project browser -t raw-marked-first
```

Rebuild after source changes before running browser/artifact tests directly.
Tests use fresh application iframes and ephemeral loopback servers; no manually
started preview server, fixed port, or separate browser fixture is required.
Expected red/amber examples are regression evidence, not necessarily test failures.

The [coverage reference](docs/RESEARCH.md#single-runner-and-retained-mechanism-coverage)
distinguishes the 128 baseline configurations from preload repeats
and registered Vitest test counts. No external historical capture is required.

Ordinary runs do not export success reports. Browser failures produce screenshots
under `test-results/screenshots/`. The report command also writes
`test-results/report.json` and `test-results/blob/report.json`; per-test experiment
records are in `meta.evidence`. A filtered report is not a complete matrix.
Lint and formatting checks are separate commands; `npm test` remains the behavior suite.

## Build and hosting

The [build manifest](build/targets.mjs) keeps eight webpack targets independent:
four host build/coverage combinations, baseline Persona, a separate raw-style
Persona bundle for prefix profiles, raw Feedback, and the raw Feedback marker
candidate. esbuild separately
bundles the playground app. Do not combine the renderers.
Pinned dependencies and generated classes are experimental inputs; preserve the
lockfile rather than applying automatic upgrades.

`npm run build` creates ignored local output in `dist/` and a static Pages
artifact in `dist/pages/`, using the [server allowlist](scripts/server.mjs).
Source maps are neither generated nor served. The unserved module inventory
supports build assertions; it is not needed in a source export.

The [validation workflow](.github/workflows/validate.yml) performs a clean
install, checks lint/formatting, installs Chromium with system dependencies, and runs `npm test` on
Node.js 24. The [Pages workflow](.github/workflows/deploy-pages.yml) repeats
validation before deploying on `main`; only its deploy job has Pages write
permissions. No research-evidence upload is configured.

The same artifact runs at `/` locally and `/griffel-renderer-demo/` on Pages.
Routes become `.html` files; the app derives its base path from `app.js`.
Pages cannot supply the local server's `no-store` headers; hosted assets may be cached.
[Pages tests](tests/browser/pages.test.mjs) check sub-path assets, navigation,
and result parity.

Only `/` and `/docs` are application routes. The old `/source` and `/three-actors`
routes and all scenario aliases are retired; use the current schedule IDs and
explicit query settings. Old route URLs return 404, and old scenario IDs are
not remapped. The retired `/extracted`, `/runtime`, `/mechanisms`,
`/integration.js`, and `/feedback-standard.js` also return 404. The
[coverage map](docs/RESEARCH.md#single-runner-and-retained-mechanism-coverage)
distinguishes retained assertions from removed comparisons.

## Troubleshooting

| Problem                                  | Action                                                                                                                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Installation fails                       | Check Node/npm versions and public registry access; preserve the lockfile.                                                                                         |
| Missing assets or stale UI               | Rebuild and refresh; do not open HTML directly.                                                                                                                    |
| Startup shows an `ERROR` alert           | Check the current scenario ID and query settings. The original error is logged in the browser console; invalid settings do not fall back to another configuration. |
| Port occupied or remote page unreachable | Choose another `PORT`, keep your server running, and forward its loopback port.                                                                                    |
| Missing Chromium or browser libraries    | Use the installation commands under [Tests](#tests).                                                                                                               |

## Publication and limits

This public baseline contains no private investigation history, source captures,
provenance records, or machine-specific artifacts. Sanitization is not legal or
release approval. **No project license has been selected**; public visibility
does not itself grant reuse or redistribution rights.

The pinned extraction toolchain has a documented build-only advisory; this is
not a clean security audit. See the
[publication decision](ROADMAP.md#initial-publication-decision) for the dated
triage, source-publication authorization, and outstanding licensing gate.
The fictional attribute, salt, prefix, and filter are not security boundaries
or recommended production policies. Full-product, deployment, visual, and
accessibility claims remain outside the [established evidence](docs/RESEARCH.md#what-is-not-yet-established).
