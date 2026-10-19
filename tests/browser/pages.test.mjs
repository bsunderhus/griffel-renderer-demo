import { expect, test } from "vitest";
import { applicationWindow, navigateApplication, openApplication, waitForApplicationURL } from "./application.mjs";

// The GitHub Pages artifact is served under a sub-path. These checks load dist/pages
// through a Pages-like static server to catch root-relative links and assets.
const base = "/pages-preview/";

test("the Pages artifact runs a live scenario under its sub-path", async ({ signal }) => {
  const root = await openApplication({ signal });
  await navigateApplication(root, "/?scenario=owner-guard&coverage=minimal");
  const pages = await openApplication({ signal });
  await navigateApplication(pages, `${base}?scenario=owner-guard&coverage=minimal`);
  const result = applicationWindow(pages).threeActorResult;
  expect(result.id).toBe("owner-guard");
  expect(JSON.stringify(result).replaceAll(base, "/")).toBe(JSON.stringify(applicationWindow(root).threeActorResult));
  const resources = applicationWindow(pages).performance.getEntriesByType("resource")
    .map(entry => new URL(entry.name).pathname).filter(pathname => /\.(?:js|css)$/.test(pathname));
  expect(resources.filter(pathname => !pathname.startsWith("/tests/"))).not.toHaveLength(0);
  expect(resources.filter(pathname => !pathname.startsWith(base) && !pathname.startsWith("/tests/"))).toEqual([]);
});

test("Pages navigation keeps the base for the playground and documentation", async ({ signal }) => {
  const app = await openApplication({ signal });
  await navigateApplication(app, `${base}docs?coverage=shared`);
  const document = applicationWindow(app).document;
  const links = Array.from(document.querySelectorAll("a[href]"), link => new URL(link.href))
    .filter(url => url.origin === location.origin).map(url => url.pathname);
  expect(links.length).toBeGreaterThan(0);
  expect(links.filter(pathname => !pathname.startsWith(base))).toEqual([]);
  await navigateApplication(app, base);
  expect(applicationWindow(app).document.querySelectorAll(".walkthrough iframe").length).toBeGreaterThan(0);
  for (const frame of applicationWindow(app).document.querySelectorAll("iframe")) {
    expect(new URL(frame.src).pathname.startsWith(base)).toBe(true);
  }
});

test("Pages resolves legacy routes and aliases without server redirects", async ({ signal }) => {
  const app = await openApplication({ signal });
  const origin = location.origin;
  await navigateApplication(app, `${base}source?coverage=minimal`);
  await waitForApplicationURL(app, `${origin}${base}?coverage=minimal`);
  await navigateApplication(app, `${base}?scenario=marker-guard&coverage=minimal`);
  await waitForApplicationURL(app,
    `${origin}${base}?scenario=raw-marked-first&coverage=minimal&personaVersion=main-2026-10-16&hostPolicy=feedback-exception`);
  expect(applicationWindow(app).threeActorResult.id).toBe("raw-marked-first");
});
