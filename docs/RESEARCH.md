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
| Gallery | [app.jsx](../src/app.jsx) | Explanations, five primary examples, seven collapsed controls, URL settings. |
| Configuration | [three-actor-cases.js](../src/three-actor-cases.js) | Stable scenario IDs, load order, policy, raw/salt/prefix flags, takeaways. |
| Orchestration | [three-actor-demo.js](../src/three-actor-demo.js) | Host first, optional seed, insertion filter, sequential actor mounts, measurements and evidence. |
| Scoped actor | [persona-actor.jsx](../src/persona-actor.jsx) | Marked sheets, head insertion point, Stylis container selector rewrite. |
| Form actor | [feedback-actor.jsx](../src/feedback-actor.jsx) | Independent renderer; optional salt and rule prefix; singleton for salted/prefixed configuration. |
| Synthetic profile | [feedback-profile.js](../src/feedback-profile.js) | Invented salt and prefix, no artifact provenance. |
| Host policy | [host-policy.js](../src/host-policy.js) | Intercepts native `CSSStyleSheet.insertRule`, records allowed/blocked attempts. |
| Host | [host.jsx](../src/host.jsx) | Extracted/runtime rendering; throws if extracted host inserts runtime CSS. |
| UI | [fluent-controls.jsx](../src/fluent-controls.jsx) | Real controls, local interactions, visible width and avatar probes. |
| Bundling | [build.mjs](../build.mjs) | Isolated renderer bundles and separate host component-coverage builds. |
| Serving | [server.mjs](../server.mjs) | Allowlisted assets and routes, loopback only, no source maps. |
| Primary tests | [test-three-actors.mjs](../test-three-actors.mjs) | Policy semantics, 48 combinations, rendered evidence, interactions, navigation. |
| Archived tests | [test.mjs](../test.mjs) | 24 extraction/runtime/adoption/cache diagnostics. |

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

Shared coverage imports real Avatar, Button, Label, and Textarea controls.
Minimal coverage imports only the host avatar UI. Separate bundles and extracted
stylesheets prevent unused form CSS from contaminating the minimal experiment.

## Mechanisms established by this baseline

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

Use `/three-actors?scenario=ID&host=extracted&coverage=minimal`, replacing `ID`
with a scenario below. Gallery links also preserve host and coverage settings.

| Scenario ID | Question / expected signal |
| --- | --- |
| `persona-alone` | Marked sheets created by Persona: intended measured controls. |
| `unmarked-d-first` | Existing unmarked default sheet: Persona adopts it and loses atomic rules; phone width grows from 32px to 96px under minimal coverage. |
| `raw-marked-first` | Prefixed, salted Feedback first: Feedback works; Persona adopts unmarked sheets and its unprefixed rules are blocked. |
| `persona-first-raw` | Reverse order: both insert successfully but share destinations. Appearance is not ownership proof. |
| `master-rejects-marker` | Host lacks prefix exception: both integrations have rejected rules. |
| `persona-first` | Unprefixed Feedback can borrow permission in existing marked buckets but has 17 textarea rules blocked in newly created unmarked buckets under minimal coverage. |
| `precompiled-salted` | Salt changes custom runtime classes but cannot rename precompiled Fluent classes. |
| `raw-unsalted` | Shared classes mask missing rules and can change the host avatar. |
| `host-collision` / `host-collision-salted` | Same constructed reset, with and without salt: isolate class collision from adoption. |

Selected metrics are phone width 32px, primary background `rgb(15, 108, 189)`,
and secondary action width 137px. Expansion width depends on viewport: assert
the mismatch, not an arbitrary stretched width. Avatar color probes use the
initials slot, not the potentially transparent Avatar root.

The main matrix is 12 scenarios x 2 host builds x 2 coverage profiles = 48.
The archived matrix adds 24. Tests also cover local interactions and presented
evidence. This is not a full visual or accessibility audit.

`window.threeActorResult` inside each example contains stages, per-rule events,
sheet creators, rule lists, renderer caches, and measurements. The UI's expanded
rule trace follows an actual width rule: actor -> destination bucket/priority ->
creator -> marker/prefix -> policy decision -> cache -> computed width.
Do not substitute inferred rule counts for this causal evidence.

## UX decisions to preserve

- Order: title, load order, takeaway, live examples, compact results, expandable
  measurements/evidence. Examples should dominate diagnostics.
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

Complete phase 2 of the [roadmap](../ROADMAP.md): add a reader-facing
guarantee/assumption comparison linked to existing scenarios and actual rule
evidence. Start with the gallery's existing mechanism guide rather than adding
another dashboard. Validate any UI change against both coverage profiles and
preserve all baseline cases.

Then introduce separately labeled host-contract and namespacing experiments.
For each, state who must change (host, integration, build, library), measure
residual failures, and avoid claiming a durable fix from one healthy load order.
Only after that expand to a third independently bundled integration and the
coexistence matrix defined in the roadmap.
