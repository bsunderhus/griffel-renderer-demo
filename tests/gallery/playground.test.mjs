import { expect, test } from "vitest";
import {
  applicationFrame,
  applicationWindow,
  navigateApplication,
  openApplication,
  waitForApplicationURL,
  waitForElement,
} from "../browser/application.mjs";
import { personaRevisions } from "../../src/experiments/scenarios.js";
import { analyzeEvidence } from "../../src/evidence/analysis.js";
import {
  assertGalleryGuide,
  assertGalleryActions,
  assertGalleryStructure,
  assertGallerySettings,
  assertGalleryEvidence,
  assertGalleryResize,
  assertGalleryInteractions,
  assertGalleryScaling,
} from "./playground.mjs";
test("gallery guide disclosures, technique links, and responsive overview", async ({ signal }) => {
  await assertGalleryGuide(
    await openApplication({
      signal,
    }),
    location.origin,
  );
});
test("gallery participant actions and guarded reference", async ({ signal }) => {
  await assertGalleryActions(
    await openApplication({
      signal,
    }),
    location.origin,
  );
});
test("gallery scenario structure, classification, and load order", async ({ signal }) => {
  await assertGalleryStructure(
    await openApplication({
      signal,
    }),
    location.origin,
  );
});
test("every scenario exposes a visual check without opening technical details", async ({
  signal,
}) => {
  const app = await openApplication({ signal });
  for (const route of ["/", "/proposal"]) {
    await navigateApplication(app, route);
    const document = applicationWindow(app).document;
    const checks = document.querySelectorAll("[data-scenario-visual-check]");
    expect(checks).toHaveLength(8);
    for (const check of checks) {
      expect(check.checkVisibility()).toBe(true);
      expect(check.closest("details")).toBeNull();
      expect(check.textContent).toContain("Insertion evidence below is separate from appearance");
    }
    expect(
      document.querySelector("#persona-first-raw [data-scenario-visual-check]").textContent,
    ).toContain(
      route === "/" ? "compare the bottom focus underline" : "proposal admits both rule prefixes",
    );
    const feedback = document.querySelector("#feedback-alone");
    expect(feedback.querySelector("h2").textContent.trim()).toBe("2. Feedback alone");
    expect(feedback.querySelector(":scope > .note").textContent).toContain("Persona: not mounted");
    expect(feedback.querySelector(":scope > .note").textContent).not.toContain(
      "Pinned release renderer",
    );
  }
});
test(
  "gallery version, host, and coverage settings survive navigation and reload",
  { timeout: 30_000 },
  async ({ signal }) => {
    await assertGallerySettings(
      await openApplication({
        signal,
      }),
      location.origin,
    );
  },
);
test(
  "host filter revision is shared across baseline schedules and survives navigation",
  { timeout: 30_000 },
  async ({ signal }) => {
    const app = await openApplication({ signal });
    await navigateApplication(app, "/");
    await app.getByCSS(".host-settings > summary").click();
    await expect
      .element(app.getByLabelText("Host filter revision", { exact: true }))
      .toHaveValue("master");
    await app
      .getByLabelText("Host filter revision", { exact: true })
      .selectOptions("feedback-exception");
    await waitForApplicationURL(app, `${location.origin}/?hostPolicy=feedback-exception`);
    for (const id of ["raw-marked-first", "persona-first-raw"]) {
      const frame = applicationFrame(app, `#${id} iframe`);
      await waitForElement(() =>
        applicationWindow(frame).document.querySelector("[data-host-contract]"),
      );
      const result = structuredClone(applicationWindow(frame).threeActorResult);
      expect(result.policy).toBe("feedback-exception");
      expect(result.configuration.feedback).toStrictEqual({
        script: "/feedback-raw.js",
        profile: "inspected",
        raw: true,
        salt: true,
        marker: true,
      });
    }
    await app.getByRole("link", { name: "Documentation", exact: true }).click();
    await waitForApplicationURL(app, `${location.origin}/docs?hostPolicy=feedback-exception`);
    await app.getByRole("link", { name: "Baseline playground", exact: true }).click();
    await waitForApplicationURL(app, `${location.origin}/?hostPolicy=feedback-exception`);
    await app.getByCSS(".host-settings > summary").click();
    await app.getByLabelText("Host filter revision", { exact: true }).selectOptions("master");
    await waitForApplicationURL(app, `${location.origin}/?hostPolicy=master`);
    const frame = applicationFrame(app, "#persona-first-raw iframe");
    await waitForElement(() =>
      applicationWindow(frame).document.querySelector("[data-host-contract]"),
    );
    expect(applicationWindow(frame).threeActorResult.policy).toBe("master");
    expect(
      analyzeEvidence(applicationWindow(frame).threeActorResult).actors.feedback.borrowedPermission,
    ).toBeGreaterThan(0);
  },
);
test("proposal playground is a separate route with a fixed candidate and baseline navigation", async ({
  signal,
}) => {
  const app = await openApplication({ signal });
  await navigateApplication(app, "/");
  expect(applicationWindow(app).document.querySelector("#solution")).toBeNull();
  await app.getByRole("link", { name: "Proposal playground", exact: true }).click();
  await waitForApplicationURL(app, `${location.origin}/proposal`);
  await expect
    .element(app.getByRole("heading", { name: "Test the prefix + salt proposal" }))
    .toBeVisible();
  const proposalDocument = applicationWindow(app).document;
  expect(proposalDocument.querySelector("#solution")).toBeNull();
  expect(proposalDocument.querySelector("#persona-version")).toBeNull();
  expect(proposalDocument.querySelector("#host-policy")).toBeNull();
  const candidateFrame = applicationFrame(app, "#raw-marked-first iframe");
  await waitForElement(() =>
    applicationWindow(candidateFrame).document.querySelector("[data-host-contract]"),
  );
  const candidate = applicationWindow(candidateFrame).threeActorResult;
  expect(candidate.policy).toBe("integration-prefixes");
  expect(candidate.solution).toBe("prefix-salted");
  expect(candidate.configuration.persona.profile).toBe("prefix-salted");
  expect(
    new URL(
      applicationWindow(app).document.querySelector("#raw-marked-first a").href,
    ).searchParams.get("scenario"),
  ).toBe("raw-marked-first");
  await app.getByRole("link", { name: "Baseline playground", exact: true }).click();
  await waitForApplicationURL(app, `${location.origin}/`);
  const baselineFrame = applicationFrame(app, "#raw-marked-first iframe");
  await waitForElement(() =>
    applicationWindow(baselineFrame).document.querySelector("[data-host-contract]"),
  );
  expect(applicationWindow(baselineFrame).threeActorResult.solution).toBe("baseline");
  expect(applicationWindow(baselineFrame).threeActorResult.configuration.persona.profile).toBe(
    "historical",
  );
});
const galleries = Object.keys(personaRevisions).flatMap((personaVersion) =>
  ["extracted", "runtime"].flatMap((hostMode) =>
    ["shared", "minimal"].map((coverage) => ({
      personaVersion,
      hostMode,
      coverage,
    })),
  ),
);
test.for(galleries)(
  "gallery $personaVersion / $hostMode / $coverage: live evidence and contracts",
  async (configuration, { signal }) => {
    await assertGalleryEvidence(
      await openApplication({
        signal,
      }),
      location.origin,
      configuration,
    );
  },
);
test.for(galleries)(
  "gallery $personaVersion / $hostMode / $coverage: mobile resize preserves disclosures and evidence",
  async (configuration, { signal }) => {
    await assertGalleryResize(
      await openApplication({
        signal,
      }),
      location.origin,
      configuration,
    );
  },
);
test.for(galleries)(
  "gallery $personaVersion / $hostMode / $coverage: hover and pressed state preserve verdicts",
  async (configuration, { signal }) => {
    await assertGalleryInteractions(
      await openApplication({
        signal,
      }),
      location.origin,
      configuration,
    );
  },
);
test.for(galleries)(
  "gallery $personaVersion / $hostMode / $coverage: fractional scaling preserves CSSOM evidence",
  {
    timeout: 30_000,
  },
  async (configuration, { signal }) => {
    await assertGalleryScaling(
      await openApplication({
        signal,
      }),
      location.origin,
      configuration,
    );
  },
);
