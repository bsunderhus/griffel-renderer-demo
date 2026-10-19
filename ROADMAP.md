# Roadmap: from failure demonstration to integration coexistence

Track verified gates and outstanding work here. The [README](README.md) owns
operation/setup; the [research reference](docs/RESEARCH.md) owns current contracts,
findings and evidence limits. This is a standalone public experiment, not a
product integration or incident attribution.

## Goals

- Reproduce independently bundled Griffel interactions with fixed actors.
- Evaluate technique guarantees rather than inferring correctness from appearance.
- Compare mitigations by residual failure, cost, compatibility and who must change.
- Establish a future multi-integration coexistence contract before recommending
  a durable solution.

## 1. Publication readiness - baseline published

- [x] Sanitize the source, document scope and verify a fresh public-dependency install.
- [x] Obtain explicit authorization for the public destination; review source-only
  contents, disclosure boundaries and author metadata before creating fresh history.
- [x] Triage baseline dependency advisories and observe hosted validation passing.
- [x] Publish the playground through a validation-gated GitHub Pages workflow.
- [ ] Select and add a license after ownership and authorization are confirmed.

**Gate status:** source publication is complete; licensing remains open.
Sanitization and publication authorization are not an independent legal review.

### Verified starting point

On 2026-10-16, a fresh source-only install passed `npm ci`,
`npx playwright install chromium`, and `npm test` on Node.js 24.15.0/npm 11.12.1,
without copied dependencies or output. The initial export built eight bundles
and passed 72 checks (24 now-retired diagnostic checks and 48 integration checks).
The machine already had browser libraries; CI installs them with `--with-deps`.
The [first hosted validation](https://github.com/bsunderhus/griffel-renderer-demo/actions/runs/38928691644)
also passed. This records that historical baseline, not the current suite count.

### Initial publication decision

The user authorized source publication to the personal
[bsunderhus/griffel-renderer-demo](https://github.com/bsunderhus/griffel-renderer-demo)
repository with fresh history and a GitHub noreply author email.
No project license was selected. Public visibility does not itself grant reuse
or redistribution rights; upstream package licenses do not license this project.

The 2026-10-16 install reported eight moderate advisory entries and a transitive
Babel plugin deprecation warning. Triage traced the advisory entries to the
development-only extraction chain:

```text
@griffel/babel-preset -> @linaria/babel-preset -> cosmiconfig
                    -> js-yaml -> argparse -> sprintf-js 1.0.3
```

[GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c)
concerns denial of service through unbounded precision specifiers.
`npm ls --omit=dev sprintf-js` reported no production dependency. The audit
offered no complete automatic fix for the direct extraction dependency.
The pinned baseline was retained for reproducibility: this is a known build-tool
risk, not a clean audit or a new dependency scan. Do not process untrusted
source/configuration with this toolchain.

Validation CI has read-only repository permissions and does not persist checkout
credentials or publish evidence. Pages write/token permissions belong only to
its deploy job; [hosting details](README.md#build-and-hosting) remain in the README.

## 2. Evaluate the techniques, not the labels

- [x] Link scoping, enhanced-specificity attributes, salt and prefix guarantees
  and assumptions to live examples and recorded-rule assertions.
- [x] Freeze baseline actors; vary validated load/mount/unmount schedules and
  independent version/policy/build/coverage controls.
- [x] Cover preload equivalence, renderer lifetime and 128 baseline configurations
  without altered actors, seed sheets or ownership proposals.
- [x] Explain causes from native evidence, independently reporting permission,
  insertion, CSSOM presence, cache, ownership, sharing and bounded host effects.
- [x] Assert the documentation explainer against real Fluent rules and keep
  independent bundles/minimal-host coverage enforced by architecture tests.

**Exit gate met for the modeled baseline:** conclusions link to reproducible
configurations and assertions, not appearance or deployment assumptions.
The canonical [contract matrix](docs/RESEARCH.md#source-aligned-contract-matrix),
[paired controls](docs/RESEARCH.md#reproduction-contract-and-paired-controls) and
[coverage map](docs/RESEARCH.md#single-runner-and-retained-mechanism-coverage)
define the scope. The pinned release remains unguarded; upstream main's guard
and the inspected candidate host exception are distinct controls.
See the [dated source recheck](docs/RESEARCH.md#current-source-recheck-2026-10-16)
for corroboration and deployment limits.

The fidelity pass leaves one runner, eight schedules and six participant build
targets. All 226 Vitest tests pass across 19 files, without skips. It removes
precompiled/unsalted Feedback, the extra seed actor, forced host filtering,
the proposed owner cache, constructed collisions and measurement declarations.
Cache replay now exercises the actual candidate Feedback renderer. Native Fluent
rules supply the evidence; appearance measurements remain test-only.
The removed comparisons are no longer findings. This is not a solution sign-off.
Legacy routes and scenario aliases are also retired. One experiment registry
now feeds execution directly; gallery prose does not configure actor behavior.
Only canonical URLs are supported, including Pages sub-path hosting.
Bootstrap checks cover visible startup failures for unknown routes/scenarios
and invalid settings before page rendering or actor loading.
Partial-startup checks additionally cover acquired actor/observer cleanup,
restoration of insertion hooks and preservation of the original failure even
when cleanup itself fails. These are lifecycle checks, not new scenarios.

## 3. Compare solution experiments

**Next gate:** establish a source-backed, explicitly approved hypothesis before
adding any solution experiment. The possible directions below are unimplemented
research options, not baseline findings or authorization to invent actor behavior.
Preserve the version-pinned failures and record who must change.

| Candidate | Experiment | Required trade-off checks |
| --- | --- | --- |
| Explicit renderer/sheet ownership | Prevent incompatible adoption | Public library feasibility; never simulate ownership by relabeling adopted sheets. |
| Supported host insertion contract | Permit legitimate runtime styles without borrowed permission | Compatibility, enforcement limits and public API support. |
| Consistent class namespacing | Separate custom and component rules | Raw/precompiled differences, build cost and residual sheet sharing. |
| Shadow DOM | Separate matching and style destinations | Portals, theme propagation, focus, accessibility and renderer document/root support. |
| Iframe | Separate documents/renderers | Layout, focus, accessibility, communication and resource cost. |

- [ ] Select a source-backed solution hypothesis before implementing a comparison.
- [ ] Check ownership feasibility against the pinned public Griffel APIs.
- [ ] Prototype containment alternatives only with portal, theme and interaction checks.
- [ ] Compare correctness, compatibility, cost and migration requirements.

**Exit gate:** each candidate has executable evidence, known limitations and an
answer to who must change: library, host, integration or build. Verify enabled/
disabled paths, arrival order and relevant host coverage. Do not silently broaden
permission, replace the baseline, or call the insertion filter a security boundary.

## 4. Build the multi-integration coexistence lab

Add another independently bundled actor only if an inspected integration supplies
a necessary constraint. Do not invent a third actor to create a failure.

- [ ] Establish the additional integration's source-backed contract before adding it.
- [ ] All six integration arrival orders across extracted/runtime hosts and
  minimal/shared coverage: 24 combinations per candidate configuration.
- [ ] Mount, unmount and remount each actor without resetting the document.
- [ ] Exercise only shared styles and custom rules present in the inspected workloads.
- [ ] Portals, theme changes and keyboard/focus interactions.
- [ ] Supported dependency-version combinations as an explicit axis; record unsupported ones.
- [ ] Separate rejected rules, creators/reuse, computed appearance, cache/rule
  growth and interactions.

**Success contract:** every integration retains intended styling, the host stays
unchanged, and correctness does not depend on arrival order, masked rejections
or borrowed permission. Sharing is acceptable only under an explicit candidate
contract. For remounts, account for intentional caches/retained CSS against a
measured steady state; do not require all styles to disappear.

## 5. Publish options and a recommendation

- [ ] Publish a decision table of benefits, residual failures, migration effort
  and ownership of required changes.
- [ ] Distinguish immediately usable mitigations from durable architecture.
- [ ] Recommend only configurations that passed their stated contract, with
  rollback and compatibility considerations.
- [ ] Keep unresolved cases visible and replayable.

**Exit gate:** readers can reproduce failure and proposed behavior, understand
costs and identify what remains unresolved.

## Working rules

Finish one bounded experiment and its assertions before adding another.
Preserve the [module boundaries](docs/RESEARCH.md#module-contracts-and-dependency-direction)
and [evidence distinctions](docs/RESEARCH.md#evidence-contract), use existing
tooling, and never manufacture failures with scenario-specific CSS or import
private evidence. Update gates only after verification. The full contributor
rules are in [AGENTS.md](AGENTS.md).
