# Shared Griffel renderer playground

A local research playground for CSS interactions between a host application,
a contact card ("Persona"), and a feedback form ("Feedback"). It uses actual
public React, Fluent UI, Griffel, and Stylis packages with independently bundled
renderers. These are fictional actors, not a complete product or incident replay.

**[Open the hosted playground](https://bsunderhus.github.io/griffel-renderer-demo/)**
or run it locally below. Everything runs in the browser: no backend, network
submission, telemetry, credentials, or private dependencies.

| Document | Use it for |
| --- | --- |
| This README | Setup, playground controls, test commands, and hosting. |
| [Research reference](docs/RESEARCH.md) | Architecture, actor contracts, findings, assertions, and limits of the evidence. |
| [Roadmap](ROADMAP.md) | Verified gates, open publication decisions, and future experiments. |
| [Agent guide](AGENTS.md) | Working rules for preserving this experiment. |

## Setup

Requires Node.js 20 or newer and npm. The fresh-install baseline was tested with
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
a collapsed technical reference. The playground at `/` focuses on controls,
live examples, and evidence.

### Choose a configuration

**Advanced host control** applies four independent choices to the same baseline
schedules:

| Choice | Values | Default |
| --- | --- | --- |
| Persona version | Pinned unguarded release / guarded main snapshot | `1.20260927.13.2` |
| Host filter revision | Sheet-only baseline / candidate prefix exception | `master` (sheet-only) |
| Host CSS | Extracted / runtime | Extracted |
| Component coverage | Shared form controls / minimal avatar-only host | Shared |

The main snapshot is selected with `personaVersion=main-2026-10-16`; it is not
evidence of a released or deployed consumer upgrade. The prefix exception is
also an unmerged candidate. See the
[actor contracts](docs/RESEARCH.md#source-aligned-contract-matrix).

Eight baseline schedules vary loading and lifecycle events, **not actor code**:
single actors, both arrival orders, script preloading, Feedback reopening, and
Persona remounting. They keep the same raw-style, salted, prefixed Feedback
singleton. Six collapsed diagnostics/proposals explicitly vary other inputs,
including an extra actor, an owner guard, and constructed avatar collisions.
The orange collision reset is never part of the canonical baseline workload.

Each example starts in a fresh iframe. Settings survive navigation and reload:

```text
/?scenario=raw-marked-first&host=extracted&coverage=minimal&personaVersion=1.20260927.13.2&hostPolicy=master
```

Fragment links such as `/#host-collision` reveal the relevant control group.
The [schedule and diagnostic reference](docs/RESEARCH.md#source-aligned-contract-matrix)
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

A real Fluent Button rule witnesses baseline outcomes; the common 137px action
rule is supplemental instrumentation. Host results separately report foreign
writes, selector matches, and a bounded avatar-background cascade check, not
complete host correctness. Computed appearance snapshots are test-only and do
not ship in runtime JSON. See the
[evidence contract](docs/RESEARCH.md#evidence-contract) for interpretation limits.

Message/View profile and Send feedback/Clear status are local actions only.

## Tests

Install Chromium once before browser tests:

```sh
npx playwright install chromium
```

On supported Linux systems missing browser libraries, use
`npx playwright install --with-deps chromium`; this may require administrator
privileges.

| Command | Scope |
| --- | --- |
| `npm test` | Build all seven participant targets and the app, then run all tests. |
| `npm run test:unit` | Fast Node checks without a build or browser. |
| `npm run test:watch` | Watch the unit project. |
| `npm run test:integration` | Build, then run artifact and browser projects. |
| `npm run test:report` | Build and run all tests with JSON and replayable blob reports. |

After a fresh build, use Vitest file/name filters without rebuilding:

```sh
npx vitest run tests/source/run.test.mjs tests/source/schedules.test.mjs
npx vitest run tests/browser/adoption.test.mjs
npx vitest run --project browser -t raw-marked-first
```

Rebuild after source changes before running browser/artifact tests directly.
Tests use fresh application iframes and ephemeral loopback servers; no manually
started preview server, fixed port, or separate browser fixture is required.
Expected red/amber examples are regression evidence, not necessarily test failures.

The [coverage reference](docs/RESEARCH.md#single-runner-and-retained-mechanism-coverage)
distinguishes the 128 baseline configurations from preload repeats, diagnostics,
and registered Vitest test counts. No external historical capture is required.

Ordinary runs do not export success reports. Browser failures produce screenshots
under `test-results/screenshots/`. The report command also writes
`test-results/report.json` and `test-results/blob/report.json`; per-test experiment
records are in `meta.evidence`. A filtered report is not a complete matrix.
No TypeScript, lint, or formatting runner is configured.

## Build and hosting

The [build manifest](build/targets.mjs) keeps seven webpack targets independent:
four host build/coverage combinations, Persona, and standard/raw Feedback.
esbuild separately bundles the playground app. Do not combine the renderers.
Pinned dependencies and generated classes are experimental inputs; preserve the
lockfile rather than applying automatic upgrades.

`npm run build` creates ignored local output in `dist/` and a static Pages
artifact in `dist/pages/`, using the [server allowlist](server.mjs).
Source maps are neither generated nor served. The unserved module inventory
supports build assertions; it is not needed in a source export.

The [validation workflow](.github/workflows/validate.yml) performs a clean
install, installs Chromium with system dependencies, and runs `npm test` on
Node.js 24. The [Pages workflow](.github/workflows/deploy-pages.yml) repeats
validation before deploying on `main`; only its deploy job has Pages write
permissions. No research-evidence upload is configured.

The same artifact runs at `/` locally and `/griffel-renderer-demo/` on Pages.
Routes become `.html` files; the app derives its base path from `app.js`.
Pages cannot supply the local server's redirects or `no-store` headers:
compatibility normalization runs in the client, and hosted assets may be cached.
[Pages tests](tests/browser/pages.test.mjs) check sub-path assets, navigation,
and result parity.

`/source`, `/three-actors`, and existing scenario aliases remain compatible.
The retired `/extracted`, `/runtime`, `/mechanisms`, and `/integration.js` return
404. The [retained coverage map](docs/RESEARCH.md#single-runner-and-retained-mechanism-coverage)
records which assertions replaced those applications.

## Troubleshooting

| Problem | Action |
| --- | --- |
| Installation fails | Check Node/npm versions and public registry access; preserve the lockfile. |
| Missing assets or stale UI | Rebuild and refresh; do not open HTML directly. |
| Port occupied or remote page unreachable | Choose another `PORT`, keep your server running, and forward its loopback port. |
| Missing Chromium or browser libraries | Use the installation commands under [Tests](#tests). |

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
