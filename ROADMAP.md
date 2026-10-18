# Roadmap: from failure demonstration to integration coexistence

This sanitized project is the only active implementation. Do not import the
investigation's history, captures, private citations, or product-specific
provenance. The examples are synthetic experiments built with public libraries.

## Goals

1. Publish a clear, reproducible showcase of shared-renderer problems.
2. Investigate reasonable solutions with measured trade-offs.
3. Determine which assumptions in the scoped contact-card and prefixed,
   salted form approaches fail, without attributing a synthetic result to a
   particular real integration.
4. Provide actionable options for library, host, and integration maintainers.
5. Demonstrate a future where multiple independent integrations can coexist.

## 1. Publication readiness - baseline published

Keep the current failure examples as the baseline; publication does not depend
on finding a complete solution.

- [x] Create the sanitized, history-free source candidate.
- [x] Remove private provenance and replace integration identifiers.
- [x] Document setup, limitations, and the distinction between synthetic
  mechanisms and real-product diagnosis.
- [x] Pass the existing 72-case regression matrix in the sanitized candidate.
- [x] Add a GitHub Actions workflow for a clean install, build, and browser tests.
- [x] Verify the documented commands from a fresh source-only directory with
  no reused dependencies or build output.
- [x] Triage the eight moderate dependency advisories reported by the clean
  installation; distinguish build/test dependencies from browser code and
  validate any chosen updates against the baseline.
- [x] Obtain the user's explicit authorization to publish this sanitized source
  to their personal GitHub account. This is not an independent legal review.
- [ ] Choose and add a license after ownership and authorization are confirmed.
- [x] Review the exact first-commit file list and repeat the disclosure scan.
- [x] Create a new Git history, review author metadata, and publish to an
  explicitly approved GitHub destination.
- [x] Observe the first hosted CI run passing.

**Exit gate:** authorized destination and an explicit licensing status, reviewed source-only first
commit, dependency advisories assessed, clean-install tests passing, and a
passing hosted CI run.
No automated publication, deployment, or evidence upload is configured.

### Verified starting point

On 2026-10-16, a fresh source-only directory passed `npm ci` against the public
npm registry, `npx playwright install chromium`, and `npm test`, using Node.js
24.15.0 and npm 11.12.1. All eight bundles built, followed by 24 archived checks
and 48 integration checks. No installed packages or build output were copied
into that validation directory. The local machine already had the Chromium
system libraries; CI explicitly installs them with `--with-deps`.

The install reported eight moderate dependency advisories and a transitive
Babel plugin deprecation warning. These were not silently fixed or treated as
an external-release sign-off. The first hosted validation passed on 2026-10-16:
[validation run](https://github.com/bsunderhus/griffel-renderer-demo/actions/runs/38928691644).
It installed dependencies and Chromium system libraries, built the bundles,
and passed all 72 cases.

### Initial publication decision

The user requested public publication to their personal GitHub account.
The baseline is published at
[bsunderhus/griffel-renderer-demo](https://github.com/bsunderhus/griffel-renderer-demo),
with fresh history and a GitHub noreply author email.
The initial source release has no project license: source visibility alone
does not grant reuse or redistribution rights. Selecting an authorized license
remains open; do not imply Griffel's license automatically covers this project.

Dependency triage on 2026-10-16 traced all eight moderate audit entries to
`sprintf-js` 1.0.3 through the development-only extraction chain:
`@griffel/babel-preset` → `@linaria/babel-preset` → `cosmiconfig` →
`js-yaml` → `argparse` → `sprintf-js`.
The underlying advisory is
[GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c),
denial of service through unbounded precision specifiers.
`npm ls --omit=dev sprintf-js` reports no production dependency.
The audit offers no complete automatic fix for the direct extraction dependency.
The pinned baseline is retained for reproducibility; this is a known build-tool
risk, not a clean audit. Do not process untrusted source/configuration locally
with this toolchain. CI has read-only repository permissions, does not persist
checkout credentials, and does not publish artifacts.

## 2. Evaluate the techniques, not the labels

The current baseline establishes mechanisms, not a verdict that one real
integration is solely responsible.

| Technique | Intended benefit | Missing guarantee to investigate |
| --- | --- | --- |
| Contact-card selector scoping | Restrict matching to a container | Does not create private sheets or insertion permission. Portals may leave the container. |
| Destination-sheet marker | Let a host permit marked sheets | Adoption may borrow permission or select a sheet without the marker. |
| Form class-name salt | Separate runtime-generated class names | Does not isolate sheets or rename precompiled component classes. |
| Per-rule prefix | Identify rules to a compatible filter | Does not contain CSS or establish exclusive ownership; host compatibility is required. |

- [x] Add a reader-facing comparison connecting each guarantee to a live example
  and recorded rule evidence.
- [x] For each approach, identify the assumptions required from the host,
  renderer, build pipeline, and integration.
- [x] Separate observed behavior, interpretation, and remaining uncertainty.
- [x] Describe the combined failure: shared-sheet adoption plus
  destination-based permission, independently of class collision.
- [x] Narrate the three-actor conflict visually: the documentation explainer
  steps through five chapters whose final drawings are asserted against live
  creator, marker, prefix, verdict, presence and cache evidence in both
  coverage profiles.

**Exit gate:** every conclusion links to a reproducible configuration and an
assertion. Do not infer isolation from appearance or blame from load order.

Evidence maintenance: gallery examples wait for visible layout and refresh
their CSS evidence on resize. Regression checks cover collapsed controls and
desktop/mobile galleries across both host builds and coverage profiles.
Rule traces separate native insertion and destination CSSOM presence from
permission and cache. Statuses are based on generated CSS and actual destination
rules, not computed dimensions, colors, or visual comparisons. Fractional
scaling and pointer states must not change CSSOM-based outcomes.
The host separately reports shared handles, native foreign writes, matching
foreign rules, and the bounded avatar-background declaration cascade. Creators
also report later adopters; sharing does not imply borrowed permission or damage.
The integrated reader guide now explains participant responsibilities before
following a rule through generation, sheet adoption, host filtering and native
CSSOM presence. It distinguishes active renderer counts from sheet counts and
maps the inspected enhanced-specificity attribute to the fictional live marker.
Selector specificity, sheet approval, runtime salt and rule-prefix compatibility
are separate mechanisms; the overview does not infer a deployed fix or private
sheets from any of them.
Public participant names are restricted to host, persona and feedback in source,
UI, tests and documentation; an automated repository check guards that convention.
All-rule ledgers distinguish host rejection, native parser rejection, exact
native-rule retention, equivalent CSS, and cache state. The gallery's paired
controls and [research contract](docs/RESEARCH.md#reproduction-contract-and-paired-controls)
separate the consumer-pinned release from upstream main without claiming a
current product deployment or complete component correctness.

The source is organized into independent host, Persona and Feedback modules,
a sequential experiment harness, and separate observation/snapshot/analysis/
presentation layers. Build targets explicitly preserve independent Griffel
copies and host coverage; architecture checks enforce those boundaries.
See the [module contracts](docs/RESEARCH.md#module-contracts-and-dependency-direction)
before extending the lab. This structural refactor does not enable a solution
experiment or change the baseline failure mechanisms.

The playground at `/` now has five primary scenarios and eight
collapsed explanatory controls. Primary cases model participant-owned
production/extraction gating, a no-op extracted host renderer, document-lifetime
filtering and the fixed inspected form profile. Five paired setups compare
Persona 1.20260927.13.2 with Persona main snapshot (2026-10-16) through one shared
Persona version control, without adding scenario cards. The pinned release is the
default; version, host build and coverage are independently retained in URLs.
One control shows the unmerged owner proposal; seven retain explicit diagnostic
profiles. Old `/source` and
`/three-actors` links redirect into the same gallery.

Validation covers 72 distinct gallery/renderer combinations and 24 archived cases, plus
bounded lifecycle probes. The original source/diagnostic overlap is no longer
counted twice. The 28 diagnostic-control records remain comparable to the
historical diagnostic baseline; primary host contracts intentionally changed.
Tests now use one [Vitest runner](vitest.config.js) with separate Node unit,
Node artifact and real-Chromium Browser Mode projects. Parameterized checks preserve paired
comparisons, independent compiled renderers and the expected baseline failures;
this runner migration does not introduce a solution configuration.
Assertions and spies use native Vitest APIs. Research evidence stays local to
each test and can be exported through the built-in JSON reporter with
`npm run test:report`; browser failures attach screenshots through Vitest.
All browser suites use Vitest Browser Mode and its matching Playwright provider;
there is no manually managed browser fixture or bundler invocation in test code.
UI assertions retry against live elements, with regression checks for replaced
evidence DOM. Gallery behaviors are independently named tests; browser setup
resets pointer/viewport state and navigation supports test cancellation.
The optional historical comparison executes fresh diagnostic combinations
instead of trusting a previously generated report.
See the
[contract matrix](docs/RESEARCH.md#source-aligned-contract-matrix) for verified
behavior and explicit limits; this is not incident-time deployment attribution
or a complete coexistence sign-off.

The 2026-10-16 authorized source recheck confirmed marker-guard behavior in the
inspected main branch; owner-filtered adoption and shared renderer caching remain
an unmerged proposal, not a deployed default. The verified marker-guard setups
are selectable in the five primary scenarios (20 host/coverage cases). The inspected consumer
instead pins Persona 1.20260927.13.2 with version locking enabled in checked-in
defaults; its release build has no adopted-handle guard. Its five scenarios
use the same five cards. Twenty direct paired comparisons cover both versions.
The duplicate marker-guard card redirects to the current Feedback-first case.
Separate actual-source probes corroborated
native insertion, cache and sharing outcomes. See the
[current-source recheck](docs/RESEARCH.md#current-source-recheck-2026-10-16)
for dependency and execution limits. The inspected host main still lacks the
Feedback prefix exception; that unmerged host proposal is labeled separately.
The published bootstrapper and release-build source are verified, but effective
runtime overrides and deployed client assets remain unverified. Source merge
status is not deployment evidence.

## 3. Compare solution experiments

Preserve version-pinned failure cases unchanged. Put intentional behavior changes in
separately labeled experiments with the same measurements.

| Candidate | Experiment | Important trade-off |
| --- | --- | --- |
| Explicit renderer/sheet ownership | Prevent adoption of incompatible sheets | May require a supported library change; do not simulate ownership by relabeling adopted sheets. |
| Supported host insertion contract | Permit legitimate runtime styles without borrowed markers | Compatibility, enforcement boundaries, and whether public APIs can express the contract. |
| Consistent class namespacing | Isolate custom and component rules | Raw versus precompiled styles, build cost, and no sheet-isolation guarantee. |
| Shadow DOM | Separate CSS matching and style destinations | Portals, theme propagation, focus, accessibility, and renderer document/root support. |
| Iframe | Separate documents and renderers | Layout, focus, accessibility, communication, and resource cost. |

- [ ] Start with a host-contract experiment and a namespacing experiment using
  supported APIs; record their residual failures rather than claiming a full fix.
- [ ] Check feasibility of explicit ownership against the public Griffel version.
- [ ] Prototype Shadow DOM and iframe alternatives only with explicit portal,
  theme, and interaction checks.
- [ ] Compare correctness, compatibility, cost, and migration requirements.

**Exit gate:** each candidate has executable evidence, known limitations, and
an explicit answer to who must change: library, host, integration, or build.
Do not broaden insertion permission silently or call it a security boundary.

## 4. Build the multi-integration coexistence lab

Add a third independently bundled actor, such as a notification panel. Keep its
behavior local and its data fictional. Add actors only when they introduce a
useful constraint, not just another copy of the same card.

- [ ] Host plus contact card, form, and notification panel in one document.
- [ ] All six arrival orders of the three integrations.
- [ ] Both extracted and runtime hosts, with shared and minimal component
  coverage: 24 combinations per candidate configuration.
- [ ] Mount, unmount, and remount each integration without resetting the document.
- [ ] Shared component styles, custom rules, and deliberately overlapping resets.
- [ ] Portal rendering and theme changes, with keyboard/focus interaction checks.
- [ ] Exercise supported dependency-version combinations as an explicit axis;
  document any unsupported combination instead of assuming compatibility.
- [ ] Report rejected rules, sheet creators/reuse, computed styles, rule/cache
  growth, and interactions separately.

**Success contract:** every integration retains intended styling, the host
remains unchanged, and correctness does not depend on arrival order, masked
rejections, or borrowing another integration's permission. Sheet reuse itself
is acceptable only when it satisfies the candidate's explicit contract.

For remounts, account for intentional renderer caches and retained CSS; compare
against a measured steady state rather than requiring all styles to disappear.

## 5. Publish options and a recommendation

- [ ] Produce a decision table: demonstrated benefits, residual failures,
  migration effort, and ownership of required changes.
- [ ] Distinguish an immediately usable mitigation from a durable architecture.
- [ ] Recommend next steps only for configurations that passed their stated
  contract, with rollback and compatibility considerations.
- [ ] Keep unsolved cases visible and make future experiments easy to replay.

**Exit gate:** readers can reproduce both the failure and the proposed behavior,
understand its cost, and identify what remains unresolved.

## Working rules

- Finish one bounded experiment and its assertions before adding another.
- Never manufacture a broken appearance with scenario-specific CSS.
- Keep insertion, CSSOM rule presence, and ownership as separate outcomes;
  appearance is not a correctness verdict.
- Use the existing browser tests and build pipeline before introducing tooling.
- Never upload private evidence or imply release approval from sanitization.
- Update this roadmap when a gate is verified, not merely when code is written.
