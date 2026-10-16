import assert from "node:assert/strict";
import { threeActorCases, getThreeActorCases } from "../../src/playground/scenarios.js";
import { personaRevisions } from "../../src/experiments/scenarios.js";
import { assertPresentedEvidence } from "../evidence/assert-presented.mjs";

export async function assertPlayground(page, url) {
  await page.goto(`${url}/`);
  assert.match(await page.locator(".intro-help ul").first().textContent(), /not a separate document or a private stylesheet/);
  assert.match(await page.locator(".intro-help ul").first().textContent(), /still shares the page/);
  for (const title of ["Who is on the page?", "What should I look for?"]) {
    const disclosure = page.locator(".intro-help").filter({ has: page.getByText(title, { exact: true }) });
    assert.equal(await disclosure.evaluate(el => el.open), false);
    await disclosure.locator("summary").click();
    assert.equal(await disclosure.evaluate(el => el.open), true);
    await disclosure.locator("summary").click();
  }
  assert.equal(await page.getByText("Technical provenance and model limits", { exact: true })
    .evaluate(el => el.parentElement.open), false);
  const guide = page.locator(".conflict-guide");
  assert.equal(await guide.evaluate(el => el.open), false);
  await guide.locator("summary").click();
  assert.equal(await guide.getByRole("list", { name: "Style rule journey" }).locator("li").count(), 3);
  assert.equal(await guide.getByRole("table").count(), 4);
  for (const id of ["unmarked-d-first", "owner-guard", "persona-first", "precompiled-salted", "host-collision-salted",
    "raw-marked-first", "master-rejects-marker", "no-policy"]) {
    assert.ok(await guide.locator(`a[href="#${id}"]`).count(), `Guide links ${id} to a live reproduction`);
  }
  assert.match(await guide.textContent(), /None prevents sheet adoption/);
  assert.match(await guide.getByLabel("Rejected rule cache sequence").textContent(), /absent from CSS, but present in renderer cache/);
  await guide.locator("summary").click();
  const working = page.frameLocator('#persona-alone iframe');
  const guarded = page.frameLocator('#unmarked-d-first iframe');
  await working.locator(".result").first().waitFor();
  await guarded.locator(".result").first().waitFor();
  assert.equal(await working.locator('[data-fluent-icon]').last().evaluate(el => getComputedStyle(el).width), "32px");
  assert.equal(await guarded.locator("body").evaluate(() => window.threeActorResult.events
    .find(event => event.actor === "persona" && event.rule.includes("width:137px")).blocked), true);
  assert.equal(await guarded.locator('[data-actor-probe="persona"]').textContent(), "View profile");
  assert.equal(await working.locator('[data-actor-probe="persona"]').evaluate(el => el.tagName), "BUTTON");
  assert.equal(await working.locator(".probe").count(), 0);
  await working.locator('[data-fluent-primary]').last().click();
  assert.match(await working.locator('[data-fluent-owner="persona"] [role="status"]').textContent(), /Message requested/);
  await working.locator('[data-actor-probe="persona"]').click();
  assert.equal(await working.locator('[data-actor-probe="persona"]').getAttribute("aria-expanded"), "true");
  assert.match(await working.locator('[data-fluent-owner="persona"]').textContent(), /accessible collaboration/);
  await working.locator('[data-actor-probe="persona"]').click();
  assert.equal(await working.locator('[data-actor-probe="persona"]').getAttribute("aria-expanded"), "false");
  assert.equal(await page.locator(".advanced-scenarios").count(), 0);
  assert.equal(await page.locator(".walkthrough").count(), threeActorCases.length);
  assert.equal(await page.locator(".intended-reference").count(), 0);
  assert.equal(await page.locator("iframe").count(), threeActorCases.length);
  assert.equal(await page.locator(".explanatory-controls").evaluate(el => el.open), false);
  assert.equal(await page.locator(".walkthrough:visible").count(), 5);
  for (const config of threeActorCases) {
    assert.equal(await page.locator(`#${config.id}`).isVisible(), Boolean(config.primaryExample));
    assert.equal(await page.locator(`#${config.id}`).getAttribute("data-scenario-contract"),
      config.hostContract === "production-extraction" ? "source-aligned" : "diagnostic");
    assert.equal(await page.locator(`#${config.id}`).getAttribute("data-scenario-kind"),
      config.primaryExample ? "release" : config.controlKind || "diagnostic");
    if (config.primaryExample) {
      assert.match(await page.locator(`#${config.id} > .note`).textContent(),
        /Pinned release renderer; deployment unverified/);
    }
  }
  await page.locator(".explanatory-controls > summary").click();
  for (const config of threeActorCases) {
    assert.equal(await page.locator(`#${config.id}`).isVisible(), true);
    const row = page.locator(`#${config.id}`);
    assert.equal(await row.locator(".scenario-details").evaluate(el => el.open), false);
    assert.equal(await row.locator(".scenario-details > summary").textContent(), "Technical details");
    assert.deepEqual(await row.getByRole("list", { name: "Load order" }).locator("li").allTextContents(),
      ["Host", ...(config.seed ? ["Unrelated style sheet"] : []),
        ...config.order.map(actor => actor === "persona" ? "Persona" : "Feedback")]);
    assert.equal(await row.locator(".scenario-takeaway").textContent(),
      `What this demonstrates: ${config.takeaway}`);
    const frame = page.frameLocator(`#${config.id} iframe`);
    await frame.locator(".result").first().waitFor();
    assert.equal(await frame.locator("body").evaluate(() => window.threeActorResult.id), config.id);
  }
  await page.screenshot({ path: "test-results/walkthrough.png", fullPage: true });
  await page.goto(`${url}/#host-collision`);
  assert.equal(await page.locator(".explanatory-controls").evaluate(el => el.open), true,
    "Direct links reveal explanatory scenarios");
  assert.equal(await page.locator("#host-collision").isVisible(), true);
  assert.equal(await page.locator('nav a[aria-current="page"]').getAttribute("href"), "/");
  await page.locator(".host-settings > summary").click();
  assert.equal(await page.getByLabel("LPC version", { exact: true }).inputValue(), "1.20260927.13.2");
  await page.getByLabel("LPC version", { exact: true }).selectOption("main-2026-10-16");
  await page.waitForURL(`${url}/?personaVersion=main-2026-10-16`);
  assert.equal(await page.locator(".walkthrough").count(), threeActorCases.length);
  assert.equal(await page.locator('[data-scenario-kind="main"]').count(), 5);
  await page.frameLocator("#unmarked-d-first iframe").locator(".result").first().waitFor();
  assert.equal(await page.frameLocator("#unmarked-d-first iframe").locator("body")
    .evaluate(() => window.threeActorResult.simulation.persona), "marker-guard");
  await page.reload();
  assert.equal(await page.getByLabel("LPC version", { exact: true }).inputValue(), "main-2026-10-16");
  await page.getByLabel("Host CSS", { exact: true }).selectOption("runtime");
  await page.waitForURL(`${url}/?personaVersion=main-2026-10-16&host=runtime`);
  await page.getByLabel("Host component coverage", { exact: true }).selectOption("minimal");
  await page.waitForURL(`${url}/?personaVersion=main-2026-10-16&host=runtime&coverage=minimal`);
  assert.equal(await page.getByLabel("LPC version", { exact: true }).inputValue(), "main-2026-10-16");
  const isolated = new URL(await page.locator("#raw-marked-first .scenario-details a").getAttribute("href"), url);
  assert.equal(isolated.searchParams.get("personaVersion"), "main-2026-10-16");
  assert.equal(isolated.searchParams.get("host"), "runtime");
  assert.equal(isolated.searchParams.get("coverage"), "minimal");
  await page.getByLabel("LPC version", { exact: true }).selectOption("1.20260927.13.2");
  await page.waitForURL(`${url}/?personaVersion=1.20260927.13.2&host=runtime&coverage=minimal`);
  assert.equal(await page.locator(".walkthrough").count(), threeActorCases.length);
  assert.equal(await page.locator('[data-scenario-kind="release"]').count(), 5);
  await page.goto(`${url}/#host-collision`);
  await page.locator(".host-settings > summary").click();
  await page.getByLabel("Host CSS", { exact: true }).selectOption("runtime");
  await page.waitForURL(`${url}/?host=runtime`);
  await page.frameLocator("#persona-alone iframe").locator(".result").first().waitFor();
  assert.equal(await page.locator("iframe").evaluateAll(frames =>
    frames.every(frame => new URL(frame.src).searchParams.get("host") === "runtime")), true);
  await page.reload();
  assert.equal(await page.getByLabel("Host CSS", { exact: true }).inputValue(), "runtime");
  await page.getByLabel("Host component coverage", { exact: true }).selectOption("minimal");
  await page.frameLocator("#persona-alone iframe").locator(".result").first().waitFor();
  assert.equal(await page.getByLabel("Host CSS", { exact: true }).inputValue(), "runtime");
  assert.equal(await page.locator("iframe").evaluateAll(frames =>
    frames.every(frame => new URL(frame.src).searchParams.get("coverage") === "minimal")), true);
  await page.reload();
  assert.equal(await page.getByLabel("Host component coverage", { exact: true }).inputValue(), "minimal");
  await page.getByLabel("Host CSS", { exact: true }).selectOption("extracted");
  await page.waitForURL(`${url}/?host=extracted&coverage=minimal`);
  await page.frameLocator("#persona-alone iframe").locator(".result").first().waitFor();
  await page.screenshot({ path: "test-results/three-actors.png", fullPage: true });
  const galleries = Object.keys(personaRevisions).flatMap(personaVersion =>
    ["extracted", "runtime"].map(hostMode => ({ personaVersion, hostMode })));
  for (const { personaVersion, hostMode } of galleries) {
    const versionCases = getThreeActorCases(personaVersion);
    for (const coverage of ["shared", "minimal"]) {
      await page.setViewportSize({ width: 1400, height: 1800 });
      await page.mouse.move(0, 0);
      await page.goto(`${url}/?host=${hostMode}&coverage=${coverage}&personaVersion=${personaVersion}`);
      assert.equal(await page.locator("iframe").evaluateAll((frames, version) =>
        frames.every(frame => new URL(frame.src).searchParams.get("personaVersion") === version), personaVersion), true);
      const hiddenControl = page.frameLocator("#persona-first iframe");
      await hiddenControl.locator("#actor-evidence").waitFor({ state: "attached" });
      assert.equal(await hiddenControl.locator("body").evaluate(() => Boolean(window.threeActorResult)), false,
        "Collapsed examples must not publish measurements without layout");
      await page.locator(".explanatory-controls > summary").click();
      for (const config of versionCases) {
        const frame = page.frameLocator(`#${config.id} iframe`);
        await frame.locator("[data-rule-trace]").first().waitFor();
        const result = await frame.locator("body").evaluate(() => window.threeActorResult);
        await assertPresentedEvidence(frame, result);
        if (config.id === "persona-alone") {
          assert.equal(result.actors.persona.measured.icon.width, "32px");
          assert.equal(result.actors.persona.measured.probeWidth, "137px",
            "The healthy reference inserts in both source-aligned host modes");
        }
        if (config.hostContract === "production-extraction") {
          assert.equal(result.simulation.host.contract, "production-extraction");
          assert.equal(result.simulation.host.installed, hostMode === "extracted");
          const revision = config.primaryExample ? personaVersion : null;
          const profile = config.primaryExample ? personaRevisions[personaVersion].profile : config.personaProfile;
          assert.equal(result.simulation.persona, profile);
          assert.equal(result.simulation.feedback, "inspected");
          assert.equal(result.simulation.personaRevision, revision);
          if (profile === "marker-guard") {
            assert.equal(result.simulation.persona, "marker-guard");
            assert.ok(result.events.filter(event => event.actor === "persona" && event.bucket)
              .every(event => !event.blocked), "Current Persona must not inherit the historical failure verdict");
          }
        } else {
          assert.equal(result.simulation, undefined, "Diagnostic controls cannot be presented as source-aligned");
        }
      }
      const brokenFrame = page.frameLocator("#unmarked-d-first iframe");
      await brokenFrame.locator("[data-rule-trace] > summary").click();
      await page.setViewportSize({ width: 375, height: 1800 });
      await page.evaluate(() => new Promise(requestAnimationFrame));
      assert.equal(await brokenFrame.locator("[data-rule-trace]").evaluate(element => element.open), true,
        "Resizing preserves expanded rule evidence");
      await brokenFrame.locator("[data-rule-trace] > summary").click();
      for (const config of versionCases) {
        const frame = page.frameLocator(`#${config.id} iframe`);
        await assertPresentedEvidence(frame, await frame.locator("body").evaluate(() => window.threeActorResult));
      }
      const healthyFrame = page.frameLocator("#persona-alone iframe");
      const ruleStatus = await healthyFrame.locator('[data-outcome="rules"]').textContent();
      await healthyFrame.locator('[data-fluent-owner="persona"] [data-fluent-primary]').hover();
      await healthyFrame.locator("body").evaluate(() => {
        window.dispatchEvent(new Event("resize"));
        return new Promise(requestAnimationFrame);
      });
      assert.equal(await healthyFrame.locator('[data-outcome="rules"]').textContent(), ruleStatus,
        "Hover does not change the generated-CSS verdict");
      await page.mouse.down();
      try {
        await healthyFrame.locator("body").evaluate(() => {
          window.dispatchEvent(new Event("resize"));
          return new Promise(requestAnimationFrame);
        });
        assert.equal(await healthyFrame.locator('[data-outcome="rules"]').textContent(), ruleStatus,
          "Pressed state does not change the generated-CSS verdict");
      } finally {
        await page.mouse.up();
      }
      await page.mouse.move(0, 0);
      await page.setViewportSize({ width: 1400, height: 1800 });
      const insertionCounts = await page.locator(".walkthrough iframe").evaluateAll(frames =>
        Object.fromEntries(frames.map(frame => [
          frame.contentWindow.threeActorResult.id, frame.contentWindow.threeActorResult.events.length,
        ])));
      for (const zoom of [0.9, 1.1, 1.25]) {
        await page.locator(".walkthrough iframe").evaluateAll((frames, zoom) => {
          for (const frame of frames) {
            frame.contentDocument.documentElement.style.zoom = String(zoom);
            frame.contentWindow.dispatchEvent(new Event("resize"));
          }
        }, zoom);
        await page.evaluate(() => new Promise(requestAnimationFrame));
        for (const config of versionCases) {
          const frame = page.frameLocator(`#${config.id} iframe`);
          const result = await frame.locator("body").evaluate(() => window.threeActorResult);
          await assertPresentedEvidence(frame, result);
          assert.equal(result.events.length, insertionCounts[config.id], "Scaling does not change rule insertion evidence");
          if (hostMode === "extracted" && config.id === "persona-alone") {
            const attempts = result.events.filter(event => event.actor === "persona" && event.bucket).length;
            assert.equal(await frame.locator('[data-outcome="rules"]').textContent(),
              `${attempts}/${attempts} recorded native rules present in destination CSSOM.`,
              `First scenario reports its generated CSS at ${zoom * 100}% scaling`);
            assert.equal(await frame.locator('[data-actor-status="persona"]').evaluate(element =>
              element.classList.contains("missing")), false);
            assert.ok(!(await frame.locator("[data-rule-trace]").textContent()).includes("VISIBLE WIDTH MISMATCH"));
            if (zoom === 1.1) {
              const fractional = await frame.locator('[data-fluent-owner="persona"]').evaluate(provider => ({
                action: getComputedStyle(provider.querySelector("[data-actor-probe]")).width,
                icon: getComputedStyle(provider.querySelector("[data-fluent-icon]")).width,
              }));
              assert.notEqual(fractional.action, "137px",
                "Regression actually exercises the reported fractional action width");
              assert.notEqual(fractional.icon, "32px",
                "Regression actually exercises the reported fractional phone width");
            }
          }
          if (hostMode === "extracted" && config.id === "unmarked-d-first") {
            assert.equal(await frame.locator('[data-actor-status="persona"]').evaluate(element =>
              element.classList.contains("missing")), personaVersion === "1.20260927.13.2",
            "Rejected rules remain a CSSOM failure independently of scaling");
          }
        }
      }
    }
  }
}
