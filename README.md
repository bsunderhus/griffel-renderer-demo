# Shared Griffel renderer playground

A local, synthetic demonstration of CSS interactions between a host application
and independently bundled contact-card and feedback-form integrations.
It uses public React, Fluent UI, Griffel, and Stylis packages. It does not
contain or claim to reproduce a proprietary product, SDK, or incident.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for publication gates, technique evaluation,
solution experiments, and the planned multi-integration coexistence lab.
This sanitized project is the only active implementation.

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

Five primary examples are visible; seven explanatory controls are collapsed.
Each includes load order, a takeaway, live controls, and compact outcomes:
**Insertion**, **Appearance**, and **Ownership**. Expand **Measurements and rule
evidence** to follow an actual recorded rule.

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
`/three-actors?scenario=raw-marked-first&host=extracted&coverage=shared`.
Scenario IDs are stable technical identifiers, not product references.

The filter is deliberately installed after host mount in both host modes.
Runtime mode with filtering is a diagnostic control, not a claim about typical
production configuration. The checks measure selected styles, not complete
visual correctness or accessibility.

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

The full suite builds and runs 72 cases: 48 integration combinations
(12 configurations × 2 host builds × 2 coverage profiles) and 24 archived
diagnostics. Tests start ephemeral loopback servers and do not require a preview
server. Expected blocked-insertion errors and red/amber cards are test evidence,
not necessarily test failures. A failed assertion or build exits nonzero.

After a build, rerun focused checks with:

```sh
node test-three-actors.mjs
node test.mjs
```

Generated evidence is written to ignored `test-results/`. Builds are written
to ignored `dist/`. Neither is needed in a source export.
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

- [build.mjs](build.mjs): four host variants and independent integration bundles.
- [server.mjs](server.mjs): loopback static server.
- [src/app.jsx](src/app.jsx): introduction, visual mechanism guide, and gallery.
- [src/host.jsx](src/host.jsx): host rendering and extraction assertion.
- [src/host-controls.jsx](src/host-controls.jsx): minimal host.
- [src/host-shared-controls.jsx](src/host-shared-controls.jsx): shared-component host.
- [src/fluent-controls.jsx](src/fluent-controls.jsx): synthetic interactive examples.
- [src/persona-actor.jsx](src/persona-actor.jsx): container-scoped contact renderer.
- [src/feedback-actor.jsx](src/feedback-actor.jsx): configurable form renderer.
- [src/feedback-profile.js](src/feedback-profile.js): synthetic salt/prefix settings.
- [src/host-policy.js](src/host-policy.js): demonstration insertion filter.
- [src/three-actor-cases.js](src/three-actor-cases.js): scenario configuration.
- [src/three-actor-demo.js](src/three-actor-demo.js): orchestration and measurements.
- [test-three-actors.mjs](test-three-actors.mjs): integration matrix.
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
