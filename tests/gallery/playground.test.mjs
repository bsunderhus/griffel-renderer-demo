import { test } from "vitest";
import { openApplication } from "../browser/application.mjs";
import { personaRevisions } from "../../src/experiments/scenarios.js";
import { assertGalleryGuide, assertGalleryActions, assertGalleryStructure, assertGallerySettings, assertGalleryEvidence, assertGalleryResize, assertGalleryInteractions, assertGalleryScaling } from "./playground.mjs";
test("gallery guide disclosures, technique links, and responsive overview", async ({
  signal
}) => {
  await assertGalleryGuide(await openApplication({
    signal
  }), location.origin);
});
test("gallery participant actions and guarded reference", async ({
  signal
}) => {
  await assertGalleryActions(await openApplication({
    signal
  }), location.origin);
});
test("gallery scenario structure, classification, and load order", async ({
  signal
}) => {
  await assertGalleryStructure(await openApplication({
    signal
  }), location.origin);
});
test("gallery version, host, and coverage settings survive navigation and reload", { timeout: 30_000 }, async ({
  signal
}) => {
  await assertGallerySettings(await openApplication({
    signal
  }), location.origin);
});
const galleries = Object.keys(personaRevisions).flatMap(personaVersion => ["extracted", "runtime"].flatMap(hostMode => ["shared", "minimal"].map(coverage => ({
  personaVersion,
  hostMode,
  coverage
}))));
test.for(galleries)("gallery $personaVersion / $hostMode / $coverage: live evidence and contracts", async (configuration, {
  signal
}) => {
  await assertGalleryEvidence(await openApplication({
    signal
  }), location.origin, configuration);
});
test.for(galleries)("gallery $personaVersion / $hostMode / $coverage: mobile resize preserves disclosures and evidence", async (configuration, {
  signal
}) => {
  await assertGalleryResize(await openApplication({
    signal
  }), location.origin, configuration);
});
test.for(galleries)("gallery $personaVersion / $hostMode / $coverage: hover and pressed state preserve verdicts", async (configuration, {
  signal
}) => {
  await assertGalleryInteractions(await openApplication({
    signal
  }), location.origin, configuration);
});
test.for(galleries)("gallery $personaVersion / $hostMode / $coverage: fractional scaling preserves CSSOM evidence", {
  timeout: 30_000
}, async (configuration, {
  signal
}) => {
  await assertGalleryScaling(await openApplication({
    signal
  }), location.origin, configuration);
});
