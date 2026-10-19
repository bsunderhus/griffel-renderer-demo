import { expect, test, vi } from "vitest";
import { feedbackProfile } from "../../src/feedback/profile.js";
import { openApplication, runExperiment, applicationWindow } from "./application.mjs";

test("the candidate Feedback cache does not retry rejected Fluent rules after native insertion is restored", async ({
  signal,
  onTestFinished,
}) => {
  const app = await openApplication({ signal });
  const result = await runExperiment(app, { scenario: "feedback-alone", coverage: "minimal" });
  const window = applicationWindow(app);
  const event = result.events.find(
    (event) =>
      event.actor === "feedback" &&
      event.bucket === "d" &&
      event.rule.includes("background-color:var(--colorBrandBackground)"),
  );
  expect(event.blocked).toBe(true);
  expect(event.present).toBe(false);
  expect(event.rule.startsWith(feedbackProfile.rulePrefix)).toBe(true);
  const renderer = window.testSourceFeedback.renderer;
  const sheet = renderer.stylesheets.d0.element.sheet;
  expect(renderer.insertionCache[event.rule]).toBeTruthy();
  expect(sheet.cssRules.length).toBe(0);

  window.testSourceHost.dispose();
  expect(window.CSSStyleSheet.prototype.insertRule).toBe(window.testSourceNativeInsert);
  const insert = vi.spyOn(window.CSSStyleSheet.prototype, "insertRule");
  onTestFinished(() => insert.mockRestore());
  renderer.insertCSSRules({ d: [event.rule.slice(feedbackProfile.rulePrefix.length)] });
  expect(
    insert,
    "The actual singleton cache prevents a retry even after host disposal",
  ).not.toHaveBeenCalled();
  expect(sheet.cssRules.length).toBe(0);

  const fresh = await openApplication({ signal });
  const control = await runExperiment(fresh, {
    scenario: "feedback-alone",
    host: "runtime",
    coverage: "minimal",
  });
  const accepted = control.events.find(
    (attempt) => attempt.actor === "feedback" && attempt.rule === event.rule,
  );
  expect(
    accepted,
    "The same candidate generates the identical Fluent rule in a fresh document",
  ).toBeDefined();
  expect(accepted.blocked).toBe(false);
  expect(accepted.inserted).toBe(true);
  expect(accepted.present).toBe(true);
});
