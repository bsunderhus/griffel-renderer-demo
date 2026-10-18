import { expect, test } from "vitest";
import { page as browserPage, userEvent } from "vitest/browser";
import { applicationWindow, navigateApplication, openApplication, runExperiment } from "../browser/application.mjs";
import { analyzeEvidence } from "../../src/evidence/analysis.js";
import { GATES, conflictChapters, scenarioRunParams, storyState } from "../../src/playground/conflict-story.js";

const cases = conflictChapters.flatMap(chapter => ["shared", "minimal"].map(coverage => ({ chapter, coverage })));

test.for(cases)("explainer $chapter.id / $coverage matches live evidence", async ({ chapter, coverage }, { signal }) => {
  const app = await openApplication({ signal });
  const result = await runExperiment(app, scenarioRunParams(chapter, coverage));
  const analysis = analyzeEvidence(result).actors;
  const final = storyState(chapter, chapter.steps.length - 1);
  const gate = GATES[final.gate];
  expect(result.policy, "Drawn filter matches the effective policy").toBe(gate.policy);
  // Diagnostic controls have no simulation block: they force the filter on unless their policy is off.
  const host = result.simulation?.host ?? { installed: result.policy !== "off", renderer: "dom" };
  expect(host.installed, "Drawn filter installation matches the host").toBe(gate.installed);
  expect(chapter.renderers.host, "Drawn host renderer matches the host contract")
    .toBe({ noop: "No-op renderer", dom: "DOM renderer" }[host.renderer]);
  expect(Object.keys(result.actors).sort()).toStrictEqual(final.attempts.map(attempt => attempt.actor).sort());
  for (const attempt of final.attempts) {
    const sheet = final.sheets.find(item => item.id === attempt.sheet);
    const event = result.events.find(item => item.actor === attempt.actor && item.rule.includes("width:137px"));
    const message = `${chapter.id} ${attempt.actor} width rule`;
    expect(event.creator, `${message}: drawn sheet creator`).toBe(sheet.creator);
    expect(event.enhanced, `${message}: drawn approval marker`).toBe(sheet.marked);
    expect(event.feedbackPrefix, `${message}: drawn prefix`).toBe(attempt.prefix);
    expect(event.blocked, `${message}: drawn verdict`).toBe(attempt.verdict === "blocked");
    expect(event.present, `${message}: drawn CSSOM presence`).toBe(attempt.verdict === "inserted");
    expect(result.actors[attempt.actor].cache, `${message}: drawn cache entry`).toContain(event.rule);
  }
  for (const handle of final.handles.filter(item => item.kind === "discarded")) {
    const creator = final.sheets.find(sheet => sheet.id === handle.sheet).creator;
    expect(result.actors[handle.actor].sheets.some(sheet => sheet.creator === creator),
      `${handle.actor} retains no handle to the discarded ${creator} sheet`).toBe(false);
  }
  for (const claim of chapter.evidence || []) {
    const value = claim.kind === "borrowedPermission" ? analysis[claim.actor].borrowedPermission :
      analysis[claim.actor].blocked;
    if (claim.min != null) expect(value, claim.text).toBeGreaterThanOrEqual(claim.min);
    if (claim.max != null) expect(value, claim.text).toBeLessThanOrEqual(claim.max);
  }
});

test("explainer steps through chapters with buttons, keyboard, and live links", async ({ signal }) => {
  const app = await openApplication({ signal });
  await navigateApplication(app, "/docs?coverage=minimal");
  const explainer = app.getByCSS(".conflict-explainer");
  await expect.element(explainer.getByRole("heading", { name: "2. They meet on the same page" })).toBeVisible();
  await expect.element(app.getByCSS(".conflict-thesis")).toHaveTextContent(/destination sheet or rule prefix/);
  const { document } = applicationWindow(app);
  expect(Array.from(document.querySelectorAll("main h2")).slice(0, 4).map(element => element.textContent))
    .toStrictEqual(["1. Meet the actors", "2. They meet on the same page",
      "3. What the encounter tells us", "Look closer: evidence and limits"]);
  expect(document.querySelectorAll(".participant-responsibilities").length,
    "Introduce the actors once, before the encounter").toBe(1);
  await expect.element(explainer.getByCSS(`[data-chapter="${conflictChapters[0].id}"]`))
    .toHaveAttribute("aria-pressed", "true");
  const caption = explainer.getByCSS(".explainer-caption");
  await expect.element(caption).toHaveAttribute("aria-live", "polite");
  const previous = explainer.getByRole("button", { name: "Previous" });
  const next = explainer.getByRole("button", { name: "Next" });
  for (const chapter of conflictChapters) {
    await explainer.getByCSS(`[data-chapter="${chapter.id}"]`).click();
    await expect.element(explainer.getByCSS(`[data-chapter="${chapter.id}"]`)).toHaveAttribute("aria-pressed", "true");
    await expect.element(caption).toHaveAttribute("data-step", "1");
    await expect.element(previous).toBeDisabled();
    const link = new URL(explainer.getByRole("link", { name: /Open this configuration/ }).element().href);
    expect(link.hash).toBe(`#${chapter.scenario}`);
    expect(Object.fromEntries(link.searchParams)).toStrictEqual({
      coverage: "minimal", host: chapter.host, personaVersion: chapter.personaVersion,
    });
    for (let step = 0; step < chapter.steps.length; step++) {
      await expect.element(caption).toHaveTextContent(chapter.steps[step].caption);
      const state = storyState(chapter, step);
      const svg = explainer.getByRole("img", { name: chapter.title });
      await expect.element(svg).toHaveAttribute("data-gate", state.gate);
      await expect.poll(() => svg.getByCSS("[data-sheet]").elements().map(element => [
        element.dataset.sheet, element.dataset.creator, element.dataset.marked,
      ])).toStrictEqual(state.sheets.map(sheet => [sheet.id, sheet.creator, String(sheet.marked)]));
      await expect.poll(() => svg.getByCSS("[data-cssom-rule]").elements().map(element => [
        element.dataset.cssomRule, element.dataset.present,
      ])).toStrictEqual(state.attempts.map(attempt => [attempt.actor, String(attempt.verdict === "inserted")]));
      await expect.poll(() => explainer.getByCSS(".explainer-takeaway").elements().length)
        .toBe(step === chapter.steps.length - 1 ? 1 : 0);
      if (step < chapter.steps.length - 1) await next.click();
    }
    await expect.element(next).toBeDisabled();
  }
  await explainer.getByCSS(".explainer-stage").element().focus();
  await userEvent.keyboard("{ArrowLeft}");
  const lastChapter = conflictChapters.at(-1);
  await expect.element(caption).toHaveAttribute("data-step", String(lastChapter.steps.length - 1));
  await userEvent.keyboard("{ArrowRight}");
  await expect.element(caption).toHaveAttribute("data-step", String(lastChapter.steps.length));
  const diagram = explainer.getByRole("img", { name: lastChapter.title }).element();
  await expect.poll(() => diagram.ownerDocument.getElementById(diagram.getAttribute("aria-describedby")).textContent)
    .toBe("No filter installed. Host created an unmarked sheet. Feedback adopted Host's sheet. " +
      "Persona adopted Host's sheet. Feedback's rule was inserted. Persona's rule was inserted.");
  await explainer.getByRole("link", { name: /Open this configuration/ }).click();
  await expect.poll(() => applicationWindow(app).location.hash).toBe(`#${lastChapter.scenario}`);
});

test("explainer fits mobile and desktop without page overflow", async ({ signal }) => {
  const app = await openApplication({ signal });
  await navigateApplication(app, "/docs");
  for (const width of [375, 1400]) {
    await browserPage.viewport(width, 1800);
    const { document } = applicationWindow(app);
    await expect.poll(() => document.documentElement.scrollWidth, "The page itself never scrolls horizontally").toBe(width);
    const stage = document.querySelector(".explainer-stage").getBoundingClientRect();
    expect(stage.left >= 0 && stage.right <= width).toBe(true);
    const svg = document.querySelector(".explainer-diagram").getBoundingClientRect();
    expect(svg.width, "Diagram text stays legible by keeping a minimum drawing width").toBeGreaterThanOrEqual(620);
  }
});
