# Shared Griffel renderer playground

A local, synthetic demonstration of CSS interactions between a host application
and independently bundled contact-card and feedback-form integrations.
It uses public React, Fluent UI, Griffel, and Stylis packages. It does not
contain or claim to reproduce a proprietary product, SDK, or incident.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for publication gates, technique evaluation,
solution experiments, and the planned multi-integration coexistence lab.
This sanitized project is the only active implementation.

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

Open http://127.0.0.1:4173. The server binds to loopback. Forward that port
when working remotely. No credentials, private registry, backend, or SDK are
required. After source changes, rebuild and refresh: there is no watcher.

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

## Playground

The single gallery at `/` has seven source-aligned primary scenarios and seven
collapsed explanatory controls. Every primary scenario uses participant-owned
production/extraction gating and explicitly named renderer revisions. Controls
vary those contracts deliberately and are labeled as diagnostic, not production
defaults.

The source-aligned primary scenarios run across both host modes and component
coverage profiles:

- The **host** selects a no-op renderer and installs its filter in a layout
  effect only when production mode and extraction are both enabled. Runtime
  mode uses a DOM renderer and no insertion filter. Filter installation is
  idempotent per document and survives provider unmount; sandbox disposal
  separately restores native insertion.
- **Persona** exposes `historical`, `marker-guard`, and `owner-guard` profiles.
  Historical adoption remains reproducibly broken under the filter. The marker
  guard discards incompatible handles before insertion; it does not enforce
  ownership. The owner guard accepts only matching owner handles, caches per
  owner/document, and recreates renderers after retained sheets are detached.
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

Seven primary examples are visible; seven explanatory controls are collapsed.
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
Historical Persona scenarios are an **unguarded-adoption baseline**, not a claim
about a current product deployment. The marker-guard and owner-guard scenarios
explicitly model separately inspected revisions; neither silently replaces the
historical failures.
The intentionally overlapping avatar reset is a separate collision probe,
not a prerequisite for the adoption-plus-filter failure.

The contact card offers Message and View profile. The feedback form offers
Send feedback and Clear status. All actions are local; no form data is sent.
View profile and Clear status have a 137px customization. Rejected rules may
make them expand. A green host avatar turning orange demonstrates the
constructed class collision.

**Advanced host control** offers two independent choices:

| Choice | Values | Purpose |
| --- | --- | --- |
| Host CSS | Extracted / runtime | Compare build-time CSS with runtime insertion. |
| Component coverage | Shared / minimal | Compare a host using form controls with one using only an avatar. |

The URL preserves these choices, for example
`/?host=extracted&coverage=minimal`. Each example starts in a fresh iframe.
Fragment links such as `/#host-collision` open the relevant control group.
An isolated example is available at
`/?scenario=raw-marked-first&host=extracted&coverage=shared`.
Scenario IDs are stable technical identifiers, not product references.
Old `/three-actors` and `/source` links redirect into this same gallery;
the seven former `source-*` scenario IDs map to their canonical counterparts.

Within explanatory controls, the filter is deliberately activated after host mount in both host modes.
Runtime mode with filtering is a diagnostic control, not a claim about typical
production configuration. Primary scenarios instead use the host-owned
production/extraction gate. The checks cover selected CSS mechanisms, not
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

The full suite builds and runs 80 matrix cases: 56 gallery combinations
(14 configurations × 2 host builds × 2 coverage profiles), split equally between
source-aligned scenarios and explanatory controls, plus 24 archived diagnostics.
The former overlapping galleries are no longer counted twice.
The suite also checks gate truth tables, filter
idempotence, renderer/cache lifecycle and build boundaries.
Tests start ephemeral loopback servers and do not require a preview
server. Expected blocked-insertion errors and red/amber cards are test evidence,
not necessarily test failures. A failed assertion or build exits nonzero.

After a build, rerun focused checks with:

```sh
node test-three-actors.mjs
node test.mjs
```

After a build, run only the source-aligned matrix and lifecycle checks with:

```sh
node tests/policy/host-contract.mjs
node tests/source/run.mjs
```

Generated evidence is written to ignored `test-results/`. Builds and a
module-name inventory used by the architecture checks are written to ignored
`dist/`. Neither is needed in a source export; the inventory is not served.
Source-map generation and serving are disabled to reduce accidental source
and local-path disclosure when sharing a running preview.

The [validation workflow](.github/workflows/validate.yml) runs a clean
`npm ci`, installs Chromium with system dependencies, and runs `npm test` on
Node.js 24 for pushes and pull requests. It does not publish the playground or
upload generated evidence. The
[first hosted validation](https://github.com/bsunderhus/griffel-renderer-demo/actions/runs/38928691644)
passed all 72 cases on 2026-10-16.

A fresh source-only install and all 72 tests passed on Node.js 24.15.0.
That install reported eight moderate dependency advisory entries, traced to
one development-only extraction-tool dependency advisory. See the
[roadmap](ROADMAP.md#initial-publication-decision) for the chain, known risk,
and decision to preserve the pinned baseline. This is not a clean security audit.

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
- [build/targets.mjs](build/targets.mjs): explicit eight-target build manifest.
- [build/webpack-config.mjs](build/webpack-config.mjs): extraction and raw-style
  transforms; each target is compiled separately.
- [build.mjs](build.mjs) / [server.mjs](server.mjs): build execution and loopback serving.
- [tests/](tests/): policy, architecture, evidence, experiment, gallery and archived checks.
- [test-three-actors.mjs](test-three-actors.mjs) / [test.mjs](test.mjs): stable focused test entry points.
- [test.mjs](test.mjs): archived diagnostic coverage.

## Export boundary

This directory is a history-free local export. It excludes the investigation's
Git metadata, private-source citations, artifact captures, provenance records,
ignored build output, and test logs. Do not add those materials back.

Technical sanitization is not a licensing or company release approval.
Review authorship and redistribution rights before publishing; this export
does not grant a license or establish external-release authorization.

No project license has been granted yet. Public source availability does not
by itself grant permission to reuse or redistribute this project's code.
