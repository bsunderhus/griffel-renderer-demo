import { openApplication, runExperiment, navigateApplication, applicationWindow } from "../browser/application.mjs";
import { assertPresentedEvidence } from "../evidence/assert-presented.mjs";
import { expect, test } from "vitest";
import { threeActorCases } from "../../src/playground/scenarios.js";
import { feedbackProfile } from "../../src/feedback/profile.js";
const controlCases = threeActorCases.filter(config => config.hostContract !== "production-extraction");
test.for(controlCases)("$id preserves diagnostics across both host builds and coverage profiles", async (config, {
  task,
  signal
}) => {
  const app = await openApplication({
    signal
  });
  const url = location.origin;
  const minimalResults = {};
  const sharedResults = [];
  {
    const result = await runExperiment(app, {
      scenario: config.id,
      coverage: "minimal"
    });
    await assertPresentedEvidence(app, result);
    expect(result.hostRuntimeCalls).toBe(0);
    await expect.poll(() => Array.from(applicationWindow(app).document.querySelector('[data-fluent-owner="host"]').querySelectorAll("button, textarea, input")).length).toBe(0);
    await expect.element(app.getByCSS('[data-fluent-owner="host"]')).toHaveTextContent(/Host application/);
    await expect.poll(() => Array.from(applicationWindow(app).document.querySelector('[data-fluent-owner="host"]').querySelectorAll("[data-fluent-avatar]")).length).toBe(1);
    expect(result.hostBuckets).toBe(0);
    expect(result.feedbackConfig.usesDemoProfile).toBe(Boolean(config.raw && config.salt && config.marker));
    expect(result.feedbackConfig.demoProfile).toStrictEqual(feedbackProfile);
    expect(result.staticCSS.length, "Actual Fluent CSS extracted").toBeGreaterThan(100);
    expect(result.stages.map(stage => stage.phase)).toStrictEqual(["host", ...config.order]);
    expect(result.sheetOrder).toContain("extracted host CSS");
    for (const stage of result.stages) {
      expect(stage.host.icon, "Minimal host renders no phone button").toBeNull();
      expect(stage.host.primary, "Minimal host renders no submit button").toBeNull();
    }
    const headerBefore = result.stages[0].host.avatarOverride;
    const headerAfter = result.stages.at(-1).host.avatarOverride;
    const hostCollision = ["no-policy", "raw-unsalted", "host-collision"].includes(config.id);
    expect(headerBefore.background).toBe("rgb(183, 228, 199)");
    expect(headerAfter.background, `${config.id}: late unsalted reset affects extracted host`).toBe(hostCollision ? "rgb(232, 163, 61)" : headerBefore.background);
    await expect.element(app.getByCSS('[data-actor-status="host"]')).toHaveTextContent(`Host CSS: extracted; ${result.hostBuckets} initial Griffel sheets; 0 runtime insertion calls.`);
    if (config.id.startsWith("host-collision")) {
      const reset = result.events.find(event => event.actor === "feedback" && event.bucket === "r" && event.rule.includes("{background-color:#e8a33d"));
      expect(reset && !reset.blocked, "Collision reset really reaches the native stylesheet").toBeTruthy();
      expect(headerBefore.classes.some(name => reset.rule.includes(`.${name}{`)), "Salt determines whether the actual reset selector matches the host avatar").toBe(!config.salt);
    }
    for (const event of result.events.filter(event => event.bucket)) {
      const expectedBlocked = config.policy !== "off" && !event.enhanced && !(config.policy === "feedback-exception" && event.feedbackPrefix);
      expect(event.blocked, "Every native insertRule decision matches exact host predicate").toBe(expectedBlocked);
      if (event.actor === "persona") {
        expect(event.personaScope, `Persona CSS must go through real Stylis scoping: ${event.rule}`).toBeTruthy();
        expect(event.feedbackPrefix).toBeFalsy();
      } else {
        expect(event.personaScope, "Feedback is a distinct unscoped actor").toBeFalsy();
        expect(event.feedbackPrefix).toBe(Boolean(config.marker));
      }
      if (event.blocked) {
        expect(result.actors[event.actor].cache, "Blocked rule is cached as inserted by its real renderer").toContain(event.rule);
      }
    }
    const persona = result.actors.persona;
    for (const [actor, evidence] of Object.entries(result.actors)) {
      const status = applicationWindow(app).document.querySelector(`section:has(> #${actor}-mount) .result`).textContent;
      expect(status).not.toContain("VISIBLE WIDTH MISMATCH");
      expect(status).not.toContain("Fluent controls look healthy");
      if (actor === "feedback") {
        const resetPlacement = await (provider => {
          const clear = provider.querySelector("[data-actor-probe]");
          const header = provider.querySelector("[data-avatar-override]");
          return {
            clearHasReset: header && Array.from(header.classList).some(name => name.startsWith("r") && clear.classList.contains(name)),
            headerHasReset: header && Array.from(header.classList).some(name => name.startsWith("r"))
          };
        })(applicationWindow(app).document.querySelector(`[data-fluent-owner="${actor}"]`));
        expect(resetPlacement.clearHasReset, "Clear status keeps only its width customization").toBe(false);
        expect(resetPlacement.headerHasReset, "Collision reset belongs to the feedback avatar").toBe(true);
      }
      const layout = await (provider => {
        const phone = provider.querySelector("[data-fluent-icon]").getBoundingClientRect();
        const person = provider.querySelector(".fluent-person").getBoundingClientRect();
        const primary = provider.querySelector("[data-fluent-primary]").getBoundingClientRect();
        const clear = provider.querySelector("[data-actor-probe]").getBoundingClientRect();
        return {
          phoneGap: person.right - phone.right,
          primaryTop: primary.top,
          clearTop: clear.top,
          primaryRight: primary.right,
          clearLeft: clear.left
        };
      })(applicationWindow(app).document.querySelector(`[data-fluent-owner="${actor}"]`));
      expect(Math.abs(layout.phoneGap), "Phone stays at the right edge despite scoped resets").toBeLessThan(1);
      expect(Math.abs(layout.primaryTop - layout.clearTop), "Actions share one row").toBeLessThan(1);
      expect(layout.clearLeft, "Actions do not overlap").toBeGreaterThan(layout.primaryRight);
    }
    expect(persona.measured.scoped, "Scope class actually wraps persona controls").toBeTruthy();
    const personaBlocked = result.events.filter(event => event.actor === "persona" && event.bucket && event.blocked);
    const allPersonaBlocked = ["feedback-first", "precompiled-salted", "raw-unsalted"].includes(config.id);
    const unstyled = config.id === "feedback-first";
    expect(persona.measured.icon.width).toBe(unstyled ? "48px" : "32px");
    expect(persona.measured.primary.background).toBe(unstyled ? "rgb(239, 239, 239)" : "rgb(15, 108, 189)");
    if (allPersonaBlocked) {
      expect(personaBlocked.length).toBeGreaterThan(100);
      expect(persona.sheets.find(sheet => sheet.key === "d0").creator).toBe("feedback");
      // Unsalted feedback may mask even the probe through a shared atomic class.
      expect(persona.measured.probeWidth === "137px").toBe(config.id === "raw-unsalted");
    } else {
      expect(personaBlocked).toHaveLength(0);
      expect(persona.measured.probeWidth).toBe("137px");
    }
    if (result.actors.feedback) {
      const feedback = result.actors.feedback;
      expect(feedback.rendererSalt).toBe(config.salt ? feedbackProfile.salt : null);
      const feedbackBlocked = result.events.filter(event => event.actor === "feedback" && event.bucket && event.blocked);
      expect(result.sharedFeedbackClasses.length === 0, "Only raw + salt isolates actual Fluent classes").toBe(Boolean(config.raw && config.salt));
      expect(feedback.measured.scoped).toBe(false);
      if (config.id === "feedback-first") {
        expect(feedback.measured.icon.width).toBe("48px");
        expect(feedback.measured.primary.background).toBe("rgb(239, 239, 239)");
        expect(feedbackBlocked.length).toBeGreaterThan(100);
        expect(feedback.measured.probeWidth).not.toBe("137px");
      } else {
        if (config.id === "persona-first") {
          expect(feedbackBlocked, "New textarea buckets do not inherit Persona's permission").toHaveLength(17);
          expect(feedbackBlocked.every(event => event.creator === "feedback" && !event.enhanced)).toBeTruthy();
          expect(feedbackBlocked.some(event => event.bucket === "w")).toBeTruthy();
        } else {
          expect(feedbackBlocked).toHaveLength(0);
        }
        expect(feedback.measured.probeWidth).toBe("137px");
      }
      if (config.order[0] === "persona") {
        expect(feedback.sheets.find(sheet => sheet.key === "d0").creator).toBe("persona");
        const inherited = result.events.filter(event => event.actor === "feedback" && event.bucket && event.creator === "persona" && event.enhanced && !event.blocked);
        expect(inherited.length, "Feedback actually inserts into persona-owned marked sheets").toBeGreaterThan(100);
        if (config.id === "persona-first") {
          expect(inherited.every(event => !event.feedbackPrefix), "Unmarked feedback bypasses sheet-level guard").toBeTruthy();
        }
      }
      if (config.id === "no-policy") expect(result.events.every(event => !event.blocked)).toBeTruthy();
    }
    minimalResults.extracted = result;
  }
  {
    const result = await runExperiment(app, {
      scenario: config.id,
      host: "runtime",
      coverage: "minimal"
    });
    expect(result.hostMode).toBe("runtime");
    expect(result.hostRuntimeCalls).toBeGreaterThan(0);
    expect(result.hostBuckets).toBeGreaterThan(0);
    expect(result.staticCSS).toStrictEqual([]);
    expect(result.stages[0].host, "Changing host build preserves exact baseline Fluent styles and classes").toStrictEqual(minimalResults.extracted.stages[0].host);
    expect(result.stages.at(-1).host.avatarOverride, "Runtime host ordering prevents the late-reset collision").toStrictEqual(result.stages[0].host.avatarOverride);
    expect(result.actors.persona.sheets.find(sheet => sheet.key === "d0").creator).toBe(config.seed ? "unrelated" : "host");
    for (const event of result.events.filter(event => event.bucket)) {
      expect(event.blocked).toBe(config.policy !== "off" && !event.enhanced && !(config.policy === "feedback-exception" && event.feedbackPrefix));
    }
    const blockedPersona = result.events.filter(event => event.actor === "persona" && event.blocked);
    expect(blockedPersona.length > 100).toBe(config.policy !== "off");
    expect(result.actors.persona.measured.probeWidth === "137px").toBe(config.policy === "off" || config.id === "raw-unsalted");
    minimalResults.runtime = result;
    await assertPresentedEvidence(app, result);
  }
  for (const hostMode of ["extracted", "runtime"]) {
    const result = await runExperiment(app, {
      scenario: config.id,
      host: hostMode,
      coverage: "shared"
    });
    expect(result.coverage).toBe("shared");
    await assertPresentedEvidence(app, result);
    await expect.poll(() => Array.from(applicationWindow(app).document.querySelectorAll('[data-fluent-owner="host"] textarea')).length).toBe(1);
    const minimal = minimalResults[hostMode];
    expect(result.order).toStrictEqual(minimal.order);
    expect(result.policy).toBe(minimal.policy);
    expect(result.feedbackConfig).toStrictEqual(minimal.feedbackConfig);
    expect(result.stages.at(-1).host.avatarOverride.background, "Host collision survives both coverage profiles").toBe(minimal.stages.at(-1).host.avatarOverride.background);
    for (const actor of Object.keys(result.actors)) {
      expect(result.actors[actor].measured.primary.classes, "Coverage does not change integration class generation").toStrictEqual(minimal.actors[actor].measured.primary.classes);
      expect(result.actors[actor].measured.probeWidth, "Coverage preserves the custom-width outcome").toBe(minimal.actors[actor].measured.probeWidth);
      expect(result.events.some(e => e.actor === actor && e.blocked), "Coverage may pre-create textarea buckets; each actual destination still controls permission").toBe(minimal.events.some(e => e.actor === actor && e.blocked));
    }
    const persona = result.actors.persona.measured;
    expect(persona.icon.width).toBe(hostMode === "extracted" && config.seed ? "96px" : "32px");
    expect(persona.primary.background).toBe(hostMode === "extracted" && config.seed ? "rgb(255, 255, 255)" : "rgb(15, 108, 189)");
    await expect.poll(() => Array.from(applicationWindow(app).document.querySelectorAll('[data-fluent-owner="persona"] textarea')).length, {
      message: "Persona is a contact card, not a feedback form"
    }).toBe(0);
    if (result.actors.feedback) {
      expect(result.actors.feedback.measured.icon.width).toBe("32px");
    }
    sharedResults.push(result);
  }
  task.meta.evidence = {
    kind: "diagnostic",
    results: [minimalResults.extracted, minimalResults.runtime, ...sharedResults]
  };
});
test("participant actions remain local", async ({
  signal
}) => {
  const app = await openApplication({
    signal
  });
  const url = location.origin;
  await navigateApplication(app, `${url}/?scenario=host-collision-salted&coverage=minimal`);
  await expect.poll(() => {
    const window = applicationWindow(app);
    return window.threeActorResult;
  }).toBeTruthy();
  await app.getByCSS('[data-fluent-owner="persona"] [data-fluent-primary]').click();
  await expect.element(app.getByCSS('[data-fluent-owner="persona"] [role="status"]')).toHaveTextContent(/Message requested/);
  await app.getByCSS('[data-fluent-owner="feedback"] textarea').fill("Feedback test");
  await app.getByCSS('[data-fluent-owner="feedback"] [data-fluent-primary]').click();
  await expect.element(app.getByCSS('[data-fluent-owner="feedback"] [role="status"]')).toHaveTextContent(/submitted/);
});
