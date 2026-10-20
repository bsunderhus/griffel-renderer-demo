import { expect, test } from "vitest";
import { experiments } from "../../src/experiments/scenarios.js";
import { analyzeEvidence } from "../../src/evidence/analysis.js";
import {
  applicationWindow,
  appearanceStages,
  navigateApplication,
  openApplication,
} from "../browser/application.mjs";
import { assertPresentedEvidence } from "../evidence/assert-presented.mjs";

const cases = ["extracted", "runtime"].flatMap((host) =>
  ["minimal", "shared"].flatMap((coverage) =>
    experiments.map((config) => ({ host, coverage, config })),
  ),
);

test.for(cases)(
  "$host / $coverage / $config.id",
  async ({ host, coverage, config }, { signal, task }) => {
    const app = await openApplication({ signal });
    const query = new URLSearchParams({ scenario: config.id, host, coverage });
    await navigateApplication(app, `/proposal?${query}`);
    const result = structuredClone(applicationWindow(app).threeActorResult);
    const active = host === "extracted";
    expect(result.solution).toBe("prefix-salted");
    expect(result.policy).toBe(active ? "integration-prefixes" : "off");
    expect(result.configuration.feedback).toStrictEqual({
      script: "/feedback-raw.js",
      profile: "inspected",
      raw: true,
      salt: true,
      marker: true,
    });
    if (config.order.includes("feedback")) {
      const feedbackAttempts = result.events.filter(
        (event) => event.actor === "feedback" && event.bucket,
      );
      expect(feedbackAttempts.every((event) => event.feedbackPrefix)).toBe(true);
      expect(feedbackAttempts.every((event) => !event.blocked)).toBe(true);
    }
    if (!config.order.includes("persona")) {
      expect(result.actors).not.toHaveProperty("persona");
      await assertPresentedEvidence(app, result);
      return;
    }
    expect(result.configuration.persona.profile).toBe("prefix-salted");
    expect(result.configuration.persona.script).toBe("/persona-raw.js");
    expect(result.configuration.persona.label).toBe("Persona prefix + salt proposal");
    expect(result.configuration.persona.revision).toBeNull();
    expect(result.actors.persona.rendererSalt).toBe("demo-persona");
    expect(result.actors.persona.sheets.every((sheet) => !sheet.enhanced)).toBe(true);
    const appearance = appearanceStages(app).find((stage) => stage.phase === "persona").persona;
    expect(appearance.avatarInitials.background).toBe("rgb(216, 208, 239)");
    for (const button of [appearance.icon, appearance.secondary]) {
      expect(button).toMatchObject({
        background: "rgb(238, 232, 247)",
        color: "rgb(89, 64, 121)",
        borderColor: "rgb(183, 163, 209)",
      });
    }
    expect(appearance.heading.color).toBe("rgb(89, 64, 121)");
    expect(appearance.card).toMatchObject({
      display: "grid",
      paddingLeft: "12px",
      gap: "8px",
      borderRadius: "8px",
    });

    const personaAttempts = result.events.filter(
      (event) => event.actor === "persona" && event.bucket,
    );
    const avatarRule = personaAttempts.find((event) =>
      event.rule.includes("background-color:#d8d0ef"),
    );
    expect(avatarRule).toBeTruthy();
    expect(avatarRule.blocked).toBe(false);
    expect(avatarRule.inserted).toBe(true);
    expect(avatarRule.present).toBe(true);
    expect(personaAttempts.length).toBeGreaterThan(100);
    expect(personaAttempts.every((event) => event.personaPrefix)).toBe(true);
    expect(personaAttempts.every((event) => !event.feedbackPrefix)).toBe(true);
    const buttonRule = personaAttempts.find(
      (event) =>
        event.bucket === "d" && event.rule.includes("background-color:var(--colorBrandBackground)"),
    );
    expect(buttonRule).toBeTruthy();
    expect(buttonRule.blocked).toBe(false);
    expect(buttonRule.inserted).toBe(!buttonRule.blocked);
    expect(buttonRule.present).toBe(!buttonRule.blocked);
    expect(buttonRule.authorizedByPrefix).toBe(active);
    expect(result.actors.persona.cache).toContain(buttonRule.rule);
    expect(buttonRule.reason).toBe(active ? "integration rule prefix" : "filter disabled");
    expect(analyzeEvidence(result).actors.persona.borrowedPermission).toBe(0);
    await assertPresentedEvidence(app, result);
    task.meta.evidence = {
      kind: "solution",
      result,
    };
    expect(applicationWindow(app).threeActorResult.solution).toBe("prefix-salted");
  },
);

test("the baseline remains the default and proposal selection is route-scoped", async () => {
  const { resolveHostSettings } = await import("../../src/experiments/configuration.js");
  expect(resolveHostSettings("").solution).toBe("baseline");
  expect(resolveHostSettings("", "prefix-salted").hostPolicy).toBe("integration-prefixes");
  expect(() => resolveHostSettings("", "unknown")).toThrow(/Unknown solution experiment/);
});

test.for(cases)(
  "Feedback marker / $host / $coverage / $config.id",
  async ({ host, coverage, config }, { signal, task }) => {
    const app = await openApplication({ signal });
    const query = new URLSearchParams({
      proposal: "feedback-marked",
      scenario: config.id,
      host,
      coverage,
    });
    await navigateApplication(app, `/proposal?${query}`);
    const result = structuredClone(applicationWindow(app).threeActorResult);
    expect(result.solution).toBe("feedback-marked");
    expect(result.policy).toBe(host === "extracted" ? "master" : "off");
    expect(result.configuration.persona).toMatchObject({
      script: "/persona.js",
      profile: "historical",
      revision: "1.20260927.13.2",
    });
    expect(result.configuration.feedback).toStrictEqual({
      script: "/feedback-marked.js",
      profile: "enhanced-marker",
      raw: true,
      salt: true,
      marker: true,
      enhanced: true,
    });
    const attempts = result.events.filter((event) => event.bucket);
    expect(attempts.length).toBeGreaterThan(0);
    expect(attempts.filter((event) => event.blocked)).toEqual([]);
    for (const event of attempts) {
      if (event.error) {
        expect(event.rule).toContain("::-moz-placeholder");
        expect(event.error).toContain("Failed to parse the rule");
        expect(event.inserted).toBe(false);
        expect(event.present).toBe(false);
      } else {
        expect(event.inserted).toBe(true);
        expect(event.present).toBe(true);
      }
    }
    expect(attempts.every((event) => !event.authorizedByPrefix)).toBe(true);
    if (host === "extracted") {
      expect(attempts.every((event) => event.reason === "enhanced sheet")).toBe(true);
      for (const actor of Object.values(result.actors)) {
        expect(actor.sheets.every((sheet) => sheet.enhanced)).toBe(true);
      }
    }
    if (config.order.includes("persona")) {
      expect(result.actors.persona.rendererSalt).toBeNull();
      const personaAttempts = attempts.filter((event) => event.actor === "persona");
      expect(personaAttempts.every((event) => !event.personaPrefix)).toBe(true);
      const avatar = personaAttempts.find((event) =>
        event.rule.includes("background-color:#d8d0ef"),
      );
      expect(avatar).toMatchObject({ inserted: true, present: true });
      const appearance = appearanceStages(app).find((stage) => stage.phase === "persona").persona;
      expect(appearance.avatarInitials.background).toBe("rgb(216, 208, 239)");
      expect(appearance.heading.color).toBe("rgb(89, 64, 121)");
      for (const button of [appearance.icon, appearance.secondary]) {
        expect(button).toMatchObject({
          background: "rgb(238, 232, 247)",
          color: "rgb(89, 64, 121)",
          borderColor: "rgb(183, 163, 209)",
        });
      }
    }
    if (config.order.includes("feedback")) {
      expect(result.actors.feedback.rendererSalt).toBe("demo-feedback");
      expect(
        attempts
          .filter((event) => event.actor === "feedback")
          .every((event) => event.feedbackPrefix),
      ).toBe(true);
      const window = applicationWindow(app);
      const button = window.document.querySelector(
        '[data-fluent-owner="feedback"] [data-fluent-primary]',
      );
      expect(window.getComputedStyle(button).backgroundColor).toBe("rgb(15, 108, 189)");
      await app.getByCSS('[data-fluent-owner="feedback"] textarea').click();
      const root = window.document.querySelector('[data-fluent-owner="feedback"] .fui-Textarea');
      await expect
        .poll(
          () => new window.DOMMatrixReadOnly(window.getComputedStyle(root, "::after").transform).a,
        )
        .toBe(1);
      if (host === "extracted") {
        expect(result.actors.feedback.sheets.some((sheet) => sheet.creator === "feedback")).toBe(
          true,
        );
      } else {
        expect(
          result.actors.feedback.sheets.some(
            (sheet) => sheet.creator === "host" && !sheet.enhanced,
          ),
        ).toBe(true);
        expect(
          result.actors.feedback.sheets
            .filter((sheet) => sheet.creator === "feedback")
            .every((sheet) => sheet.enhanced),
        ).toBe(true);
      }
    }
    if (host === "extracted" && config.id === "raw-marked-first") {
      expect(result.actors.persona.sheets.some((sheet) => sheet.creator === "feedback")).toBe(true);
    }
    const mounts = result.execution.filter((event) => event.action === "mount");
    if (config.id === "feedback-reopened") {
      expect(
        mounts.filter((event) => event.actor === "feedback").at(-1).reusesPreviousRenderer,
      ).toBe(true);
    }
    if (config.id === "persona-remounted") {
      expect(
        mounts.filter((event) => event.actor === "persona").at(-1).reusesPreviousRenderer,
      ).toBe(false);
    }
    expect(result.hostEvidence.avatarBackground.changed).toBe(false);
    await assertPresentedEvidence(app, result);
    task.meta.evidence = { kind: "solution", result };
  },
);

test.for(["minimal", "shared"])(
  "%s: marking Feedback changes permission, not generated rules or classes",
  async (coverage, { signal }) => {
    const app = await openApplication({ signal });
    const query = new URLSearchParams({ scenario: "raw-marked-first", coverage });
    await navigateApplication(app, `/?${query}`);
    const baseline = structuredClone(applicationWindow(app).threeActorResult);
    const classes = (window) =>
      ["persona", "feedback"].map((actor) =>
        Array.from(
          window.document.querySelectorAll(
            `[data-fluent-owner="${actor}"], [data-fluent-owner="${actor}"] *`,
          ),
          (element) => element.className,
        ),
      );
    const before = classes(applicationWindow(app));
    query.set("proposal", "feedback-marked");
    await navigateApplication(app, `/proposal?${query}`);
    const candidate = applicationWindow(app).threeActorResult;
    expect(candidate.events.map((event) => event.rule)).toEqual(
      baseline.events.map((event) => event.rule),
    );
    expect(classes(applicationWindow(app))).toEqual(before);
    expect(baseline.events.some((event) => event.blocked)).toBe(true);
    expect(candidate.events.every((event) => !event.blocked)).toBe(true);
  },
);
