import { expect, test } from "vitest";
import { SITE_BASE, sitePath, siteRoute } from "../src/site.js";
import { normalizeLegacyLocation } from "../src/legacy-routes.js";

test("site paths default to the root outside a browser", () => {
  expect(SITE_BASE).toBe("/");
  expect(sitePath("docs?coverage=shared")).toBe("/docs?coverage=shared");
  expect(sitePath("/griffel.css")).toBe("/griffel.css");
  expect(sitePath("?scenario=owner-guard#owner-guard")).toBe("/?scenario=owner-guard#owner-guard");
});

test("routes ignore static hosting suffixes", () => {
  for (const pathname of ["/", "/index.html"]) expect(siteRoute(pathname)).toBe("");
  for (const pathname of ["/docs", "/docs/", "/docs.html"]) expect(siteRoute(pathname)).toBe("docs");
});

test("legacy locations normalize like the server redirects, under any base", () => {
  const base = "/griffel-renderer-demo/";
  const at = (pathname, search = "", hash = "") => normalizeLegacyLocation({ pathname, search, hash }, base);
  expect(at(`${base}docs`, "?coverage=shared")).toBeNull();
  expect(at(base, "?scenario=owner-guard")).toBeNull();
  expect(at(`${base}source`, "?coverage=shared")).toBe(`${base}?coverage=shared`);
  expect(at(`${base}three-actors.html`)).toBe(base);
  expect(at(base, "?scenario=marker-guard&coverage=minimal")).toBe(
    `${base}?scenario=raw-marked-first&coverage=minimal&personaVersion=main-2026-10-16`);
  expect(at(`${base}docs`, "", "#historical-unmarked-first")).toBe(
    `${base}docs?personaVersion=1.20260927.13.2#unmarked-d-first`);
  expect(at(`${base}extracted`, "?scenario=marker-guard")).toBeNull();
});
