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
