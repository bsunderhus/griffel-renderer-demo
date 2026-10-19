import { beforeEach, expect, onTestFinished } from "vitest";
import { locators, page, userEvent } from "vitest/browser";

locators.extend({
  getByCSS(selector) {
    return `css=${selector}`;
  },
});

const applications = new WeakMap();
let applicationId = 0;

beforeEach(async () => {
  await page.viewport(1400, 1800);
  await userEvent.unhover(document.body);
});

export function applicationWindow(app) {
  const application = applications.get(app);
  if (!application) throw new Error("Unknown application frame");
  return application.frame().contentWindow;
}

export function applicationFrame(app, selector) {
  const locator = page.frameLocator(app.getByCSS(selector));
  applications.set(locator, {
    frame: () => applicationWindow(app).document.querySelector(selector),
    signal: applications.get(app).signal,
  });
  return locator;
}

export async function openApplication({ signal }) {
  const frame = document.createElement("iframe");
  frame.dataset.testApplication = String(++applicationId);
  frame.style.cssText = "display:block;width:100%;height:1800px;border:0";
  frame.addEventListener("application-error", event => {
    expect.soft(event.detail, "No unexpected application errors or failed resources").toBeUndefined();
  });
  const margin = document.body.style.margin;
  document.body.style.margin = "0";
  document.body.appendChild(frame);
  onTestFinished(() => {
    frame.remove();
    document.body.style.margin = margin;
  });
  const locator = page.frameLocator(page.getByCSS(`[data-test-application="${frame.dataset.testApplication}"]`));
  applications.set(locator, { frame: () => frame, signal });
  return locator;
}

export async function navigateApplication(app, url) {
  const application = applications.get(app);
  if (!application) throw new Error("Unknown application frame");
  const frame = application.frame();
  const { signal } = application;
  async function load(src) {
    await new Promise((resolve, reject) => {
      function cleanup() {
        frame.removeEventListener("load", loaded);
        frame.removeEventListener("error", failed);
        signal.removeEventListener("abort", aborted);
      }
      function loaded() {
        if (src !== "about:blank" && frame.contentWindow.location.href === "about:blank") return;
        cleanup();
        resolve();
      }
      function failed() {
        cleanup();
        reject(new Error(`Unable to load ${src}`));
      }
      function aborted() {
        cleanup();
        reject(signal.reason);
      }
      if (signal.aborted) {
        aborted();
        return;
      }
      frame.addEventListener("load", loaded);
      frame.addEventListener("error", failed);
      signal.addEventListener("abort", aborted, { once: true });
      frame.src = src;
    });
  }
  // Force a fresh application document even for fragment-only navigation.
  await load("about:blank");
  await load(url);
  await waitForApplicationReady(app);
}

async function waitForApplicationReady(app) {
  const window = applicationWindow(app);
  const { signal } = applications.get(app);
  if (window.document.readyState !== "complete") {
    await new Promise((resolve, reject) => {
      function cleanup() {
        window.removeEventListener("load", loaded);
        signal.removeEventListener("abort", aborted);
      }
      function loaded() {
        cleanup();
        resolve();
      }
      function aborted() {
        cleanup();
        reject(signal.reason);
      }
      if (signal.aborted) {
        aborted();
        return;
      }
      window.addEventListener("load", loaded);
      signal.addEventListener("abort", aborted, { once: true });
    });
  }
  const current = new URL(applicationWindow(app).location.href);
  if (current.searchParams.has("scenario")) {
    await expect.poll(() => {
      const window = applicationWindow(app);
      if (window.threeActorError) throw new Error(window.threeActorError);
      return Boolean(window.threeActorResult);
    }).toBe(true);
  } else {
    const route = current.pathname.replace(/^\/pages-preview(?=\/)/, "");
    const selector = route === "/" ? ".walkthrough iframe" :
      route === "/docs" ? ".conflict-guide" : ".grid > .card iframe";
    await expect.poll(() => applicationWindow(app).document.querySelectorAll(selector).length).toBeGreaterThan(0);
  }
}

export async function runExperiment(app, settings) {
  await navigateApplication(app, `/?${new URLSearchParams(settings)}`);
  return structuredClone(applicationWindow(app).threeActorResult);
}

export async function waitForApplicationURL(app, url) {
  await expect.poll(() => applicationWindow(app).location.href).toBe(url);
  await waitForApplicationReady(app);
}

export async function refreshEvidence(window) {
  window.dispatchEvent(new window.Event("resize"));
  await new Promise(resolve => window.requestAnimationFrame(resolve));
}

export function visible(element) {
  return Boolean(element?.checkVisibility({ checkVisibilityCSS: true }));
}

export async function waitForElement(query, { state = "visible" } = {}) {
  await expect.poll(() => state === "attached" ? Boolean(query()) : visible(query())).toBe(true);
}
