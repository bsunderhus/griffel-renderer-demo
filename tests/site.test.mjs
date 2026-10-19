import { expect, test } from "vitest";
import { SITE_BASE, sitePath, siteRoute } from "../src/site.js";

test("site paths default to the root outside a browser", () => {
  expect(SITE_BASE).toBe("/");
  expect(sitePath("docs?coverage=shared")).toBe("/docs?coverage=shared");
  expect(sitePath("/griffel.css")).toBe("/griffel.css");
  expect(sitePath("?scenario=persona-alone#persona-alone")).toBe(
    "/?scenario=persona-alone#persona-alone",
  );
});

test("routes ignore static hosting suffixes", () => {
  for (const pathname of ["/", "/index.html"]) {
    expect(siteRoute(pathname)).toBe("");
  }
  for (const pathname of ["/docs", "/docs/", "/docs.html"]) {
    expect(siteRoute(pathname)).toBe("docs");
  }
});

test("canonical routes retain static hosting support under a sub-path", () => {
  const base = "/griffel-renderer-demo/";
  for (const route of ["", "index.html"]) {
    expect(siteRoute(`${base}${route}`, base)).toBe("");
  }
  for (const route of ["docs", "docs/", "docs.html"]) {
    expect(siteRoute(`${base}${route}`, base)).toBe("docs");
  }
});
