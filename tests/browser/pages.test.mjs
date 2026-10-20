import { expect, test } from "vitest";
import { applicationWindow, navigateApplication, openApplication } from "./application.mjs";

// The GitHub Pages artifact is served under a sub-path. These checks load dist/pages
// through a Pages-like static server to catch root-relative links and assets.
const base = "/pages-preview/";

test("the Pages artifact runs a live scenario under its sub-path", async ({ signal }) => {
  const root = await openApplication({ signal });
  await navigateApplication(root, "/?scenario=raw-marked-first&coverage=minimal");
  const pages = await openApplication({ signal });
  await navigateApplication(pages, `${base}?scenario=raw-marked-first&coverage=minimal`);
  const result = applicationWindow(pages).threeActorResult;
  expect(result.id).toBe("raw-marked-first");
  expect(JSON.stringify(result).replaceAll(base, "/")).toBe(
    JSON.stringify(applicationWindow(root).threeActorResult),
  );
  const resources = applicationWindow(pages)
    .performance.getEntriesByType("resource")
    .map((entry) => new URL(entry.name).pathname)
    .filter((pathname) => /\.(?:js|css)$/.test(pathname));
  expect(resources.filter((pathname) => !pathname.startsWith("/tests/"))).not.toHaveLength(0);
  expect(
    resources.filter((pathname) => !pathname.startsWith(base) && !pathname.startsWith("/tests/")),
  ).toEqual([]);
});

test("Pages navigation keeps the base for the playground and documentation", async ({ signal }) => {
  const app = await openApplication({ signal });
  await navigateApplication(app, `${base}docs.html?coverage=shared`);
  const document = applicationWindow(app).document;
  const links = Array.from(document.querySelectorAll("a[href]"), (link) => new URL(link.href))
    .filter((url) => url.origin === location.origin)
    .map((url) => url.pathname);
  expect(links.length).toBeGreaterThan(0);
  expect(links.filter((pathname) => !pathname.startsWith(base))).toEqual([]);
  await navigateApplication(app, `${base}index.html`);
  expect(
    applicationWindow(app).document.querySelectorAll(".walkthrough iframe").length,
  ).toBeGreaterThan(0);
  for (const frame of applicationWindow(app).document.querySelectorAll("iframe")) {
    expect(new URL(frame.src).pathname.startsWith(base)).toBe(true);
  }
  await navigateApplication(app, `${base}proposal.html?coverage=minimal`);
  expect(applicationWindow(app).document.title).toBe("Proposals | Griffel integration lab");
  for (const frame of applicationWindow(app).document.querySelectorAll("iframe")) {
    expect(new URL(frame.src).pathname.startsWith(`${base}proposal`)).toBe(true);
  }
});

test("Pages runs marked Feedback with the unchanged host and Persona", async ({ signal }) => {
  const app = await openApplication({ signal });
  await navigateApplication(
    app,
    `${base}proposal?proposal=feedback-marked&scenario=raw-marked-first&coverage=minimal`,
  );
  const result = applicationWindow(app).threeActorResult;
  expect(result.solution).toBe("feedback-marked");
  expect(result.policy).toBe("master");
  expect(result.configuration.persona.profile).toBe("historical");
  expect(result.configuration.feedback.script).toBe("/feedback-marked.js");
  expect(result.events.filter((event) => event.blocked)).toEqual([]);
});

test("Pages omits retired routes, compatibility pages and bundles", async () => {
  for (const route of [
    "source",
    "source.html",
    "three-actors",
    "three-actors.html",
    "extracted",
    "runtime",
    "mechanisms",
    "integration.js",
    "feedback-standard.js",
  ]) {
    expect((await fetch(`${base}${route}`)).status).toBe(404);
  }
});
