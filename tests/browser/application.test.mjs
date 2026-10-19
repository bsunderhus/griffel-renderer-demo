import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { applicationWindow, navigateApplication, openApplication } from "./application.mjs";
import { assertPresentedEvidence } from "../evidence/assert-presented.mjs";

test("navigation targets its application instance without replacing another document", async ({ signal }) => {
  const first = await openApplication({ signal });
  const second = await openApplication({ signal });
  await navigateApplication(first, "/?scenario=persona-alone&coverage=minimal");
  const firstDocument = applicationWindow(first).document;
  await navigateApplication(second, "/?scenario=raw-marked-first&coverage=minimal");
  expect(applicationWindow(first).document).toBe(firstDocument);
  expect(applicationWindow(first).threeActorResult.id).toBe("persona-alone");
  expect(applicationWindow(second).threeActorResult.id).toBe("raw-marked-first");
  await expect.element(first.getByCSS('[data-fluent-owner="persona"] [data-fluent-secondary]')).toHaveTextContent("View profile");
});

test("navigation cancellation rejects promptly and removes load listeners", async ({ onTestFinished }) => {
  const controller = new AbortController();
  const app = await openApplication({ signal: controller.signal });
  const frame = applicationWindow(app).frameElement;
  const remove = vi.spyOn(frame, "removeEventListener");
  onTestFinished(() => remove.mockRestore());
  const pending = navigateApplication(app, "/?scenario=persona-alone");
  const reason = new Error("Navigation intentionally cancelled");
  controller.abort(reason);
  await expect(pending).rejects.toBe(reason);
  expect(remove).toHaveBeenCalledWith("load", expect.any(Function));
  expect(remove).toHaveBeenCalledWith("error", expect.any(Function));
});

test("evidence assertions follow live replacements instead of detached traces", async ({ signal }) => {
  const app = await openApplication({ signal });
  await navigateApplication(app, "/?scenario=persona-alone&coverage=minimal");
  const window = applicationWindow(app);
  const original = window.document.querySelector("[data-rule-trace]");
  let replaced = false;
  original.querySelector("summary").addEventListener("click", () => {
    window.dispatchEvent(new window.Event("resize"));
    window.requestAnimationFrame(() => {
      replaced = !original.isConnected;
      original.querySelector("code").textContent = "Detached trace must not be asserted";
    });
  }, { once: true });
  await assertPresentedEvidence(app, window.threeActorResult);
  expect(replaced, "The regression actually replaces the original evidence DOM").toBe(true);
  expect(window.document.querySelector("[data-rule-trace]")).not.toBe(original);
});

test("incorrect replacement evidence cannot pass using the previous trace", async ({ signal }) => {
  const app = await openApplication({ signal });
  await navigateApplication(app, "/?scenario=persona-alone&coverage=minimal");
  const window = applicationWindow(app);
  const original = window.document.querySelector("[data-rule-trace]");
  original.querySelector("summary").addEventListener("click", () => {
    window.dispatchEvent(new window.Event("resize"));
    window.requestAnimationFrame(() => {
      window.document.querySelector("[data-rule-trace] code").textContent = "Incorrect live replacement";
    });
  }, { once: true });
  await expect(assertPresentedEvidence(app, window.threeActorResult)).rejects.toThrow();
  expect(original.isConnected).toBe(false);
  expect(original.querySelector("code").textContent).not.toBe("Incorrect live replacement");
});

test("each test starts with the configured viewport and no previous application frames", async () => {
  expect(document.querySelectorAll("[data-test-application]").length).toBe(0);
  expect(window.innerWidth).toBe(1400);
  expect(window.innerHeight).toBe(1800);
  await page.viewport(375, 900);
});

test("viewport setup also runs after a test changes it", () => {
  expect(window.innerWidth).toBe(1400);
  expect(window.innerHeight).toBe(1800);
});
