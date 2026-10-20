import { expect, test } from "vitest";
import {
  openApplication,
  runExperiment,
  applicationWindow,
  appearanceStages,
} from "../browser/application.mjs";

test.for(
  ["minimal", "shared"].flatMap((coverage) =>
    [
      { host: "extracted", hostPolicy: "master" },
      { host: "extracted", hostPolicy: "feedback-exception" },
      { host: "runtime", hostPolicy: "master" },
    ].map((settings) => ({ coverage, ...settings })),
  ),
)(
  "$coverage / $host / $hostPolicy: Feedback-alone appearance has an explicit permitted-insertion reference",
  async ({ coverage, host, hostPolicy }, { signal }) => {
    const app = await openApplication({ signal });
    await runExperiment(app, { scenario: "feedback-alone", coverage, host, hostPolicy });
    const window = applicationWindow(app);
    const blocked = host === "extracted" && hostPolicy === "master";
    expect(window.document.querySelector("[data-visual-guidance]")).toBeNull();
    expect(window.document.querySelector('[data-fluent-owner="persona"]')).toBeNull();
    const button = window.document.querySelector(
      '[data-fluent-owner="feedback"] [data-fluent-primary]',
    );
    expect(window.getComputedStyle(button).backgroundColor).toBe(
      blocked ? "rgb(239, 239, 239)" : "rgb(15, 108, 189)",
    );
  },
);

test.for(
  ["extracted", "runtime"].flatMap((host) =>
    ["minimal", "shared"].flatMap((coverage) =>
      ["master", "feedback-exception"].map((hostPolicy) => ({ host, coverage, hostPolicy })),
    ),
  ),
)(
  "$host / $coverage / $hostPolicy: Feedback's real focus underline supports the scenario inspection prompt",
  async ({ host, coverage, hostPolicy }, { signal }) => {
    const app = await openApplication({ signal });
    for (const scenario of ["persona-first-raw", "feedback-preloaded", "feedback-reopened"]) {
      await runExperiment(app, {
        scenario,
        host,
        coverage,
        hostPolicy,
        personaVersion: "1.20260927.13.2",
      });
      const window = applicationWindow(app);
      const root = window.document.querySelector('[data-fluent-owner="feedback"] .fui-Textarea');
      const blocked = host === "extracted" && hostPolicy === "master";
      const readScale = () =>
        new window.DOMMatrixReadOnly(window.getComputedStyle(root, "::after").transform).a;
      await expect.poll(readScale).toBe(0);
      const before = root.getBoundingClientRect();
      await app.getByCSS('[data-fluent-owner="feedback"] textarea').click();
      await expect.poll(readScale).toBe(blocked ? 0 : 1);
      expect(root.getBoundingClientRect().width).toBe(before.width);
      expect(root.getBoundingClientRect().height).toBe(before.height);
    }
  },
);

test.for(
  ["extracted", "runtime"].flatMap((host) =>
    ["minimal", "shared"].flatMap((coverage) =>
      ["master", "feedback-exception"].flatMap((hostPolicy) =>
        ["1.20260927.13.2", "main-2026-10-16"].map((personaVersion) => ({
          host,
          coverage,
          hostPolicy,
          personaVersion,
        })),
      ),
    ),
  ),
)(
  "$host / $coverage / $hostPolicy / $personaVersion: rejected Persona accents leave component shapes stable",
  async ({ host, coverage, hostPolicy, personaVersion }, { signal }) => {
    const app = await openApplication({ signal });
    const appearances = [];
    for (const scenario of ["persona-alone", "raw-marked-first", "persona-first-raw"]) {
      const result = await runExperiment(app, {
        scenario,
        host,
        coverage,
        personaVersion,
        hostPolicy,
      });
      const appearance = appearanceStages(app).find((stage) => stage.phase === "persona").persona;
      const blocked =
        host === "extracted" &&
        personaVersion === "1.20260927.13.2" &&
        scenario === "raw-marked-first";
      const colorRule = result.events.find(
        (event) => event.actor === "persona" && event.rule.includes("background-color:#d8d0ef"),
      );
      expect(
        colorRule,
        "Persona's real Griffel rule supplies its custom avatar background",
      ).toBeTruthy();
      expect(colorRule.blocked).toBe(blocked);
      expect(colorRule.inserted).toBe(!blocked);
      expect(colorRule.present).toBe(!blocked);
      expect(result.actors.persona.cache).toContain(colorRule.rule);
      expect(appearance.avatarInitials.background).toBe(
        blocked ? "rgba(0, 0, 0, 0)" : "rgb(216, 208, 239)",
      );
      for (const declaration of [
        "background-color:#eee8f7",
        "color:#594079",
        "border-top-color:#b7a3d1",
      ]) {
        const rule = result.events.find(
          (event) => event.actor === "persona" && event.rule.includes(declaration),
        );
        expect(rule, `Persona accent rule: ${declaration}`).toBeTruthy();
        expect(rule.blocked).toBe(blocked);
        expect(rule.inserted).toBe(!blocked);
        expect(rule.present).toBe(!blocked);
        expect(result.actors.persona.cache).toContain(rule.rule);
      }
      for (const button of [appearance.icon, appearance.secondary]) {
        expect(button.background === "rgb(238, 232, 247)").toBe(!blocked);
        expect(button.color === "rgb(89, 64, 121)").toBe(!blocked);
        expect(button.borderColor === "rgb(183, 163, 209)").toBe(!blocked);
      }
      expect(appearance.heading.color === "rgb(89, 64, 121)").toBe(!blocked);
      expect(appearance.card).toMatchObject({
        display: "grid",
        paddingLeft: "12px",
        gap: "8px",
        borderRadius: "8px",
        boxShadow: "none",
      });
      expect(result.hostEvidence.avatarBackground.changed).toBe(false);
      expect(
        appearanceStages(app).find((stage) => stage.phase === "persona").host.avatarInitials
          .background,
        "Persona's custom color never changes the host avatar",
      ).toBe("rgb(230, 230, 230)");
      appearances.push(appearance);
    }
    for (const component of ["icon", "secondary", "heading"]) {
      expect(appearances[2][component]).toMatchObject({
        background: appearances[0][component].background,
        color: appearances[0][component].color,
        borderColor: appearances[0][component].borderColor,
      });
      for (const appearance of appearances) {
        expect(appearance[component].classes).toEqual(appearances[0][component].classes);
      }
    }
    for (const [index, appearance] of appearances.entries()) {
      const missingBaseStyles =
        index === 1 &&
        host === "extracted" &&
        coverage === "minimal" &&
        personaVersion === "1.20260927.13.2";
      if (missingBaseStyles) {
        continue;
      }
      expect(
        appearance.icon,
        "Color overrides preserve phone geometry wherever Fluent's base styles are available",
      ).toMatchObject({
        width: appearances[0].icon.width,
        height: appearances[0].icon.height,
        borderRadius: appearances[0].icon.borderRadius,
        paddingLeft: appearances[0].icon.paddingLeft,
        borderWidth: appearances[0].icon.borderWidth,
      });
    }
    expect(
      appearances[2].avatarInitials,
      "Persona-first preserves the standalone avatar styling",
    ).toStrictEqual(appearances[0].avatarInitials);
    if (host === "runtime" || personaVersion === "main-2026-10-16") {
      expect(
        appearances[1].avatarInitials,
        "Feedback-first also preserves the avatar styling when insertion is allowed",
      ).toStrictEqual(appearances[0].avatarInitials);
    }
    expect(
      appearances[1].avatarInitials.classes,
      "Schedules use identical Persona markup and generated classes",
    ).toEqual(appearances[0].avatarInitials.classes);
  },
);

test.for(
  ["extracted", "runtime"].flatMap((host) =>
    ["minimal", "shared"].map((coverage) => ({ host, coverage })),
  ),
)(
  "$host / $coverage: source-aligned participant actions and layout remain local",
  async ({ host, coverage }, { signal }) => {
    const app = await openApplication({ signal });
    await runExperiment(app, {
      scenario: "raw-marked-first",
      host,
      coverage,
      personaVersion: "main-2026-10-16",
      hostPolicy: "feedback-exception",
    });
    const document = applicationWindow(app).document;
    for (const actor of ["persona", "feedback"]) {
      const provider = document.querySelector(`[data-fluent-owner="${actor}"]`);
      const phone = provider.querySelector("[data-fluent-icon]").getBoundingClientRect();
      const person = provider.querySelector(".fluent-person").getBoundingClientRect();
      const primary = provider.querySelector("[data-fluent-primary]").getBoundingClientRect();
      const secondary = provider.querySelector("[data-fluent-secondary]").getBoundingClientRect();
      expect(
        Math.abs(person.right - phone.right),
        "Phone remains structurally right-aligned",
      ).toBeLessThan(1);
      expect(
        Math.abs(primary.top - secondary.top),
        "Actions share a row without a custom width",
      ).toBeLessThan(1);
      expect(secondary.left, "Actions do not overlap").toBeGreaterThan(primary.right);
    }
    await app.getByCSS('[data-fluent-owner="persona"] [data-fluent-primary]').click();
    await expect
      .element(app.getByCSS('[data-fluent-owner="persona"] [role="status"]'))
      .toHaveTextContent(/Message requested/);
    const profile = app.getByCSS('[data-fluent-owner="persona"] [data-fluent-secondary]');
    await profile.click();
    await expect.element(profile).toHaveAttribute("aria-expanded", "true");
    await app.getByCSS('[data-fluent-owner="feedback"] textarea').fill("Local example");
    await app.getByCSS('[data-fluent-owner="feedback"] [data-fluent-primary]').click();
    await expect
      .element(app.getByCSS('[data-fluent-owner="feedback"] [role="status"]'))
      .toHaveTextContent(/submitted/);
    await app.getByCSS('[data-fluent-owner="feedback"] [data-fluent-secondary]').click();
    await expect
      .element(app.getByCSS('[data-fluent-owner="feedback"] [role="status"]'))
      .toHaveTextContent("");
  },
);
