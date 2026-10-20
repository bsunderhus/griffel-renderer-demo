import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { applicationWindow, navigateApplication, openApplication } from "./application.mjs";
import { assertPresentedEvidence } from "../evidence/assert-presented.mjs";

test.for(
  ["extracted", "runtime"].flatMap((host) =>
    ["baseline", "renderer-observation", "sheet-registration"].map((failure) => ({
      host,
      failure,
    })),
  ),
)(
  "$host / $failure: partial initialization releases actual actors and insertion hooks",
  async ({ host, failure }, { signal }) => {
    const app = await openApplication({ signal });
    await navigateApplication(
      app,
      `/?scenario=persona-alone&coverage=minimal&host=${host}&testFailure=${failure}`,
      { expectStartupError: true },
    );
    const window = applicationWindow(app);
    const message = `Injected ${failure} failure`;
    await expect.element(app.getByRole("alert")).toHaveTextContent(`ERROR: ${message}`);
    expect(window.threeActorError).toBe(message);
    expect(window.testConsoleErrors).toHaveLength(1);
    expect(window.testConsoleErrors[0][0]).toBe(window.testInjectedError);
    expect(window.testCleanupCalls).toContain("Host:dispose");
    expect(window.testSourceHost.policyState().installed).toBe(false);
    expect(window.CSSStyleSheet.prototype.insertRule).toBe(window.testSourceNativeInsert);
    expect(window.document.querySelector('link[rel="stylesheet"][href$="griffel.css"]')).toBeNull();
    if (failure !== "baseline") {
      expect(window.testCleanupCalls.filter((call) => call === "Persona:unmount")).toHaveLength(1);
      expect(window.testSourcePersona.renderer.insertCSSRules).toBe(
        window.testOriginalPersonaInsert,
      );
    } else {
      expect(window.testSourcePersona).toBeUndefined();
    }
    const cleanupCount = window.testCleanupCalls.length;
    window.dispatchEvent(new window.Event("resize"));
    window.dispatchEvent(new window.Event("pagehide"));
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
    expect(window.testCleanupCalls).toHaveLength(cleanupCount);
    await expect.element(app.getByRole("alert")).toHaveTextContent(`ERROR: ${message}`);
    expect(window.threeActorResult).toBeUndefined();
  },
);

test.for([
  { url: "/unknown-route", message: "Unknown route: unknown-route" },
  { url: "/?scenario=unknown", message: "Unknown scenario: unknown" },
  { url: "/?scenario=marker-guard", message: "Unknown scenario: marker-guard" },
  { url: "/?scenario=", message: "Unknown scenario: " },
  {
    url: "/proposal?personaVersion=main-2026-10-16",
    message: "The proposal playground does not accept baseline-only settings",
  },
  ...["/", "/docs", "/?scenario=persona-alone"].flatMap((route) =>
    [
      ["host", "Unknown host mode"],
      ["coverage", "Unknown host coverage"],
      ["personaVersion", "Unknown Persona version"],
      ["hostPolicy", "Unknown host filter revision"],
    ].map(([key, label]) => ({
      url: `${route}${route.includes("?") ? "&" : "?"}${key}=unknown`,
      message: `${label}: unknown`,
    })),
  ),
  ...["/proposal", "/proposal?scenario=persona-alone"].flatMap((route) =>
    [
      ["host", "Unknown host mode"],
      ["coverage", "Unknown host coverage"],
      ["proposal", "Unknown solution experiment"],
    ].map(([key, label]) => ({
      url: `${route}${route.includes("?") ? "&" : "?"}${key}=unknown`,
      message: `${label}: unknown`,
    })),
  ),
])(
  "startup error at $url is visible and preserves the original failure",
  async ({ url, message }, { signal }) => {
    const app = await openApplication({ signal });
    await navigateApplication(app, url, { expectStartupError: true });
    const window = applicationWindow(app);
    await expect.element(app.getByRole("alert")).toHaveTextContent(`ERROR: ${message}`.trim());
    expect(window.document.querySelector('[role="alert"]').textContent).toBe(`ERROR: ${message}`);
    expect(window.threeActorError).toBe(message);
    expect(window.testConsoleErrors).toHaveLength(1);
    expect(window.testConsoleErrors[0][0].message).toBe(message);
    expect(window.testConsoleErrors[0][0].stack).toContain(message);
    expect(window.threeActorResult).toBeUndefined();
    expect(
      window.document.querySelector("#actor-evidence"),
      "Failures before layout creation must not depend on the evidence container",
    ).toBeNull();
    expect(window.document.querySelectorAll(".walkthrough, .conflict-guide, iframe")).toHaveLength(
      0,
    );
    expect(
      window.testSourceHost,
      "Invalid startup does not mount actors or patch native insertion",
    ).toBeUndefined();
    expect(window.CSSStyleSheet.prototype.insertRule).toBe(window.testSourceNativeInsert);
  },
);

test("navigation targets its application instance without replacing another document", async ({
  signal,
}) => {
  const first = await openApplication({ signal });
  const second = await openApplication({ signal });
  await navigateApplication(first, "/?scenario=persona-alone&coverage=minimal");
  const firstDocument = applicationWindow(first).document;
  await navigateApplication(second, "/?scenario=raw-marked-first&coverage=minimal");
  expect(applicationWindow(first).document).toBe(firstDocument);
  expect(applicationWindow(first).threeActorResult.id).toBe("persona-alone");
  expect(applicationWindow(second).threeActorResult.id).toBe("raw-marked-first");
  await expect
    .element(first.getByCSS('[data-fluent-owner="persona"] [data-fluent-secondary]'))
    .toHaveTextContent("View profile");
});

test("navigation cancellation rejects promptly and removes load listeners", async ({
  onTestFinished,
}) => {
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

test("evidence assertions follow live replacements instead of detached traces", async ({
  signal,
}) => {
  const app = await openApplication({ signal });
  await navigateApplication(app, "/?scenario=persona-alone&coverage=minimal");
  const window = applicationWindow(app);
  const original = window.document.querySelector("[data-rule-trace]");
  let replaced = false;
  original.querySelector("summary").addEventListener(
    "click",
    () => {
      window.dispatchEvent(new window.Event("resize"));
      window.requestAnimationFrame(() => {
        replaced = !original.isConnected;
        original.querySelector("code").textContent = "Detached trace must not be asserted";
      });
    },
    { once: true },
  );
  await assertPresentedEvidence(app, window.threeActorResult);
  expect(replaced, "The regression actually replaces the original evidence DOM").toBe(true);
  expect(window.document.querySelector("[data-rule-trace]")).not.toBe(original);
});

test("incorrect replacement evidence cannot pass using the previous trace", async ({ signal }) => {
  const app = await openApplication({ signal });
  await navigateApplication(app, "/?scenario=persona-alone&coverage=minimal");
  const window = applicationWindow(app);
  const original = window.document.querySelector("[data-rule-trace]");
  original.querySelector("summary").addEventListener(
    "click",
    () => {
      window.dispatchEvent(new window.Event("resize"));
      window.requestAnimationFrame(() => {
        window.document.querySelector("[data-rule-trace] code").textContent =
          "Incorrect live replacement";
      });
    },
    { once: true },
  );
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
