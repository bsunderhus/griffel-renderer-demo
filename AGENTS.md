# Agent guide

## Start here

This is a standalone public research playground, not a product integration.
Read [README.md](README.md) for setup, [docs/RESEARCH.md](docs/RESEARCH.md) for
architecture and decisions, and [ROADMAP.md](ROADMAP.md) for progress and gates.
Do not rely on a previous conversation, another checkout, or private services.

The next research task is roadmap phase 2: connect each technique's guarantees
and assumptions to live examples and assertions, before proposing a fix.
Publication of the source baseline is complete; licensing remains open.

## Preserve the experiment

- Use actual Griffel renderers, public Fluent components, extraction, and native
  CSS insertion. Never fabricate a regression using scenario-specific CSS.
- Keep baseline failures reproducible. Add solutions as explicitly labeled
  configurations, not silent replacements or relaxed assertions.
- Report insertion, appearance, and sheet ownership independently. Matching
  appearance can mask rejected rules; sharing a sheet need not cause damage.
- Keep host build mode and component coverage independent. Minimal hosts must
  not import hidden form controls or their extracted CSS.
- Preserve separately bundled integration renderers. Do not consolidate them
  into one shared Griffel instance to make the tests pass.
- Test each new behavior's enabled and disabled paths, arrival-order effects,
  and both host coverage profiles where relevant.
- Keep examples local and fictional. Do not add network submission or telemetry.

## Working and validation

- Follow existing ESM JavaScript/JSX patterns. No TypeScript, lint, or formatting
  runner is configured; do not claim those checks passed.
- Use the pinned lockfile. Do not run automatic dependency fixes or update
  versions casually: generated classes and adoption behavior are experimental
  inputs. Document and test deliberate upgrades.
- Setup: `npm ci`, then `npx playwright install chromium`. Linux may need
  `npx playwright install --with-deps chromium`.
- Full validation: `npm test` builds all eight targets and runs Vitest across
  96 matrix cases. See the README for focused checks and preview commands.
- Run `npm run test:unit` for checks without a build or browser.
  After source changes, rebuild before running integration tests directly with
  `npx vitest run`; `npm run test:integration` includes the build.
- Tests manage ephemeral loopback servers. Do not require a manually started
  preview server, fixed port, or timing sleeps.
- Browser suites use Vitest Browser Mode; let its provider own Chromium and
  use fresh application iframes rather than manual browser/context/page fixtures.
- For documentation-only changes, check links and accuracy; no rebuild needed.
- Keep the README, research notes, and roadmap consistent with verified results.
  Record limitations and unresolved failures explicitly.

## Publication and portability

- Never import private investigation history, captured bundles, internal links,
  credentials, personal records, or machine-specific paths. Research here must
  be understandable and reproducible from public dependencies.
- Do not commit `node_modules/`, `dist/`, `test-results/`, secrets, or source maps.
  Builds intentionally disable source maps.
- No project license has been selected. Do not invent licensing authority or
  infer it from an upstream library's OSS status.
- Check the configured Git identity before commits; use the maintainer-approved
  identity rather than importing a work email from another environment.
- Commit subjects use `[Area] Imperative summary`. Do not amend existing history
  or push changes without the user's authorization.
- No custom agent, MCP server, proprietary tool, or external session artifact is
  needed. Prefer direct investigation and the existing tools over extra agents.
