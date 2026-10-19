import { expect, test } from "vitest";
import { openApplication, runExperiment, applicationWindow } from "../browser/application.mjs";

test.for(["extracted", "runtime"].flatMap(host => ["minimal", "shared"].map(coverage => ({ host, coverage }))))(
  "$host / $coverage: source-aligned participant actions and layout remain local",
  async ({ host, coverage }, { signal }) => {
    const app = await openApplication({ signal });
    await runExperiment(app, { scenario: "raw-marked-first", host, coverage,
      personaVersion: "main-2026-10-16", hostPolicy: "feedback-exception" });
    const document = applicationWindow(app).document;
    for (const actor of ["persona", "feedback"]) {
      const provider = document.querySelector(`[data-fluent-owner="${actor}"]`);
      const phone = provider.querySelector("[data-fluent-icon]").getBoundingClientRect();
      const person = provider.querySelector(".fluent-person").getBoundingClientRect();
      const primary = provider.querySelector("[data-fluent-primary]").getBoundingClientRect();
      const secondary = provider.querySelector("[data-fluent-secondary]").getBoundingClientRect();
      expect(Math.abs(person.right - phone.right), "Phone remains structurally right-aligned").toBeLessThan(1);
      expect(Math.abs(primary.top - secondary.top), "Actions share a row without a custom width").toBeLessThan(1);
      expect(secondary.left, "Actions do not overlap").toBeGreaterThan(primary.right);
    }
    await app.getByCSS('[data-fluent-owner="persona"] [data-fluent-primary]').click();
    await expect.element(app.getByCSS('[data-fluent-owner="persona"] [role="status"]')).toHaveTextContent(/Message requested/);
    const profile = app.getByCSS('[data-fluent-owner="persona"] [data-fluent-secondary]');
    await profile.click();
    await expect.element(profile).toHaveAttribute("aria-expanded", "true");
    await app.getByCSS('[data-fluent-owner="feedback"] textarea').fill("Local example");
    await app.getByCSS('[data-fluent-owner="feedback"] [data-fluent-primary]').click();
    await expect.element(app.getByCSS('[data-fluent-owner="feedback"] [role="status"]')).toHaveTextContent(/submitted/);
    await app.getByCSS('[data-fluent-owner="feedback"] [data-fluent-secondary]').click();
    await expect.element(app.getByCSS('[data-fluent-owner="feedback"] [role="status"]')).toHaveTextContent("");
  });
