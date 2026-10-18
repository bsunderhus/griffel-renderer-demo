import { navigateApplication, visible, waitForElement, waitForApplicationURL, applicationWindow, applicationFrame, refreshEvidence } from "../browser/application.mjs";
import { page as browserPage, userEvent } from "vitest/browser";
import { expect } from "vitest";
import { threeActorCases, getThreeActorCases } from "../../src/playground/scenarios.js";
import { personaRevisions } from "../../src/experiments/scenarios.js";
import { assertPresentedEvidence } from "../evidence/assert-presented.mjs";
export async function assertGalleryGuide(app, url) {
  await navigateApplication(app, `${url}/docs`);
  await expect.element(app.getByRole("link", {
    name: "Documentation",
    exact: true
  })).toHaveAttribute("aria-current", "page");
  await expect.element(app.getByRole("heading", {
    name: "How independent Griffel integrations interact",
    exact: true
  })).toBeVisible();
  await expect.element(app.getByRole("link", {
    name: "Explore the playground",
    exact: false
  })).toHaveAttribute("href", "/");
  for (const name of ["Source on GitHub", "Read the source, tests and research notes on GitHub"]) {
    const repository = app.getByRole("link", { name, exact: false });
    await expect.element(repository).toHaveAttribute("href", "https://github.com/bsunderhus/griffel-renderer-demo");
    await expect.element(repository).toHaveAttribute("rel", "noopener noreferrer");
  }
  await app.getByRole("link", {
    name: "Playground",
    exact: true
  }).click();
  await expect.element(app.getByRole("link", {
    name: "Playground",
    exact: true
  })).toHaveAttribute("aria-current", "page");
  await expect.poll(() => app.getByCSS(".conflict-guide").elements().length).toBe(0);
  const configuredGallery = `${url}/?host=runtime&personaVersion=main-2026-10-16`;
  await navigateApplication(app, configuredGallery);
  await app.getByRole("link", {
    name: "Documentation",
    exact: true
  }).click();
  await waitForApplicationURL(app, `${url}/docs?host=runtime&personaVersion=main-2026-10-16`);
  await app.getByCSS(".conflict-guide > summary").click();
  await expect.element(app.getByCSS("[data-model-version]")).toHaveTextContent(/main snapshot/);
  await expect.element(app.getByCSS("[data-renderer-summary]")).toHaveTextContent(/all three are DOM renderers/);
  await expect.element(app.getByRole("link", {
    name: "Playground",
    exact: true
  })).toHaveAttribute("href", "/?host=runtime&personaVersion=main-2026-10-16");
  await navigateApplication(app, `${url}/docs`);
  await expect.poll(() => app.getByText("Who is on the page?", {
    exact: true
  }).elements().length, {
    message: "Participant responsibilities belong in the integrated guide, not a duplicate introduction"
  }).toBe(0);
  await expect.poll(() => app.getByText("Technical provenance and model limits", {
    exact: true
  }).element().parentElement.open).toBe(false);
  const guide = app.getByCSS(".conflict-guide");
  await expect.element(guide).toBeVisible();
  await expect.element(guide).not.toHaveAttribute("open");
  const actors = app.getByCSS(".participant-responsibilities");
  await expect.poll(() => actors.getByRole("article").elements().length).toBe(3);
  for (const participant of ["host", "persona", "feedback"]) {
    await expect.element(actors.getByCSS(`[data-participant="${participant}"]`)).toBeVisible();
  }
  await expect.element(actors.getByCSS('[data-participant="host"]')).toHaveTextContent(/CSSStyleSheet.prototype.insertRule/);
  await expect.element(actors.getByCSS('[data-participant="persona"]')).toHaveTextContent(/not a separate document or a private stylesheet/);
  await expect.element(actors.getByCSS('[data-participant="feedback"]')).toHaveTextContent(/module-level renderer/);
  await guide.getByCSS(":scope > summary").click();
  await expect.element(guide).toHaveAttribute("open");
  await expect.element(app.getByCSS(".conflict-guide").getByCSS("[data-renderer-summary]")).toHaveTextContent(/three active participant renderer roles/);
  const walkthrough = guide.getByCSS(".conflict-walkthrough");
  await expect.element(app.getByCSS(".conflict-guide").getByCSS(".conflict-walkthrough")).not.toHaveAttribute("open");
  await walkthrough.getByCSS(":scope > summary").click();
  await expect.poll(() => guide.getByRole("list", {
    name: "Style rule journey"
  }).getByCSS("li").elements().length).toBe(4);
  await expect.poll(() => guide.getByRole("list", {
    name: "Renderer counts"
  }).getByCSS("li").elements().length).toBe(3);
  await expect.element(app.getByCSS(".conflict-guide")).toHaveTextContent(/data-enhanced-specificity="true"/);
  await expect.element(app.getByCSS(".conflict-guide")).toHaveTextContent(/data-demo-allow-rules="true"/);
  await expect.element(app.getByCSS(".conflict-guide")).toHaveTextContent(/attribute does not increase CSS specificity/);
  await expect.element(guide.getByLabelText("Missing Persona rule sequence")).toHaveTextContent(/native insertion is skipped/);
  const techniques = guide.getByText("Technique guarantees and the best paired reproductions", {
    exact: true
  });
  await techniques.click();
  await expect.poll(() => guide.getByRole("table").elements().length).toBe(4);
  await expect.poll(() => guide.getByRole("table", {
    name: "Who writes or reads the sheet marker?"
  }).getByRole("row").elements().length).toBe(5);
  await expect.poll(() => guide.getByRole("table", {
    name: "Width-rule outcomes with production extraction enabled"
  }).getByRole("row").elements().length).toBe(6);
  for (const id of ["unmarked-d-first", "owner-guard", "persona-first", "precompiled-salted", "host-collision-salted", "raw-marked-first", "master-rejects-marker", "no-policy"]) {
    await expect.poll(() => Array.from(applicationWindow(app).document.querySelector(".conflict-guide").querySelectorAll(`a[href*="#${id}"]`)).length, {
      message: `Guide links ${id} to a live reproduction`
    }).toBeTruthy();
  }
  await expect.element(app.getByCSS(".conflict-guide")).toHaveTextContent(/None prevents sheet adoption/);
  await expect.element(guide.getByLabelText("Rejected rule cache sequence")).toHaveTextContent(/absent from CSS, but present in renderer cache/);
  for (const width of [375, 1400]) {
    await browserPage.viewport(width, 1800);
    const cards = actors.getByRole("article").elements().map(element => {
      const {
        left,
        right
      } = element.getBoundingClientRect();
      return {
        left: Math.round(left),
        right: Math.round(right)
      };
    });
    expect(new Set(cards.map(card => card.left)).size).toBe(width === 375 ? 1 : 3);
    expect(cards.every(card => card.left >= 0 && card.right <= width), "The responsibility overview fits mobile and desktop widths").toBeTruthy();
  }
  await techniques.click();
  await walkthrough.getByCSS(":scope > summary").click();
  await guide.getByCSS(":scope > summary").click();
  await expect.element(guide).not.toHaveAttribute("open");
  await expect.element(actors.getByCSS('[data-participant="host"]')).toBeVisible();
}
export async function assertGalleryActions(app, url) {
  await navigateApplication(app, `${url}/`);
  const working = applicationFrame(app, '#persona-alone iframe');
  const guarded = applicationFrame(app, '#unmarked-d-first iframe');
  await waitForElement(() => Array.from(applicationWindow(working).document.querySelectorAll(".result")).at(0));
  await waitForElement(() => Array.from(applicationWindow(guarded).document.querySelectorAll(".result")).at(0));
  const phone = Array.from(applicationWindow(working).document.querySelectorAll("[data-fluent-icon]")).at(-1);
  await expect.poll(() => applicationWindow(working).getComputedStyle(phone).width).toBe("32px");
  await expect.poll(() => applicationWindow(guarded).threeActorResult.events.find(event => event.actor === "persona" && event.rule.includes("width:137px")).blocked).toBe(true);
  await expect.poll(() => applicationWindow(guarded).document.querySelector('[data-actor-probe="persona"]').textContent).toBe("View profile");
  await expect.poll(() => applicationWindow(working).document.querySelector('[data-actor-probe="persona"]').tagName).toBe("BUTTON");
  await expect.poll(() => Array.from(applicationWindow(working).document.querySelectorAll(".probe")).length).toBe(0);
  await working.getByCSS('[data-fluent-primary]').last().click();
  await expect.poll(() => applicationWindow(working).document.querySelector('[data-fluent-owner="persona"] [role="status"]').textContent).toMatch(/Message requested/);
  await working.getByCSS('[data-actor-probe="persona"]').click();
  await expect.poll(() => applicationWindow(working).document.querySelector('[data-actor-probe="persona"]').getAttribute("aria-expanded")).toBe("true");
  await expect.poll(() => applicationWindow(working).document.querySelector('[data-fluent-owner="persona"]').textContent).toMatch(/accessible collaboration/);
  await working.getByCSS('[data-actor-probe="persona"]').click();
  await expect.poll(() => applicationWindow(working).document.querySelector('[data-actor-probe="persona"]').getAttribute("aria-expanded")).toBe("false");
}
export async function assertGalleryStructure(app, url) {
  await navigateApplication(app, `${url}/`);
  await expect.poll(() => Array.from(applicationWindow(app).document.querySelectorAll(".advanced-scenarios")).length).toBe(0);
  await expect.poll(() => Array.from(applicationWindow(app).document.querySelectorAll(".walkthrough")).length).toBe(threeActorCases.length);
  await expect.poll(() => Array.from(applicationWindow(app).document.querySelectorAll(".intended-reference")).length).toBe(0);
  await expect.poll(() => Array.from(applicationWindow(app).document.querySelectorAll("iframe")).length).toBe(threeActorCases.length);
  await expect.element(app.getByCSS(".explanatory-controls")).not.toHaveAttribute("open");
  await expect.poll(() => Array.from(applicationWindow(app).document.querySelectorAll(".walkthrough")).filter(visible).length).toBe(5);
  for (const config of threeActorCases) {
    await expect.poll(() => visible(applicationWindow(app).document.querySelector(`#${config.id}`))).toBe(Boolean(config.primaryExample));
    await expect.poll(() => applicationWindow(app).document.querySelector(`#${config.id}`).getAttribute("data-scenario-contract")).toBe(config.hostContract === "production-extraction" ? "source-aligned" : "diagnostic");
    await expect.poll(() => applicationWindow(app).document.querySelector(`#${config.id}`).getAttribute("data-scenario-kind")).toBe(config.primaryExample ? "release" : config.controlKind || "diagnostic");
    if (config.primaryExample) {
      await expect.element(app.getByCSS(`#${config.id} > .note`)).toHaveTextContent(/Pinned release renderer; deployment unverified/);
    }
  }
  await app.getByCSS(".explanatory-controls > summary").click();
  for (const config of threeActorCases) {
    await expect.poll(() => visible(applicationWindow(app).document.querySelector(`#${config.id}`))).toBe(true);
    const row = app.getByCSS(`#${config.id}`);
    await expect.element(app.getByCSS(`#${config.id}`).getByCSS(".scenario-details")).not.toHaveAttribute("open");
    await expect.poll(() => applicationWindow(app).document.querySelector(`#${config.id}`).querySelector(".scenario-details > summary").textContent).toBe("Technical details");
    await expect.poll(() => row.getByRole("list", {
      name: "Load order"
    }).getByCSS("li").elements().map(element => element.textContent)).toStrictEqual(["Host", ...(config.seed ? ["Unrelated style sheet"] : []), ...config.order.map(actor => actor === "persona" ? "Persona" : "Feedback")]);
    await expect.poll(() => applicationWindow(app).document.querySelector(`#${config.id}`).querySelector(".scenario-takeaway").textContent).toBe(`What this demonstrates: ${config.takeaway}`);
    const frame = applicationFrame(app, `#${config.id} iframe`);
    await waitForElement(() => Array.from(applicationWindow(frame).document.querySelectorAll(".result")).at(0));
    await expect.poll(() => applicationWindow(frame).threeActorResult.id).toBe(config.id);
  }
}
export async function assertGallerySettings(app, url) {
  await navigateApplication(app, `${url}/#host-collision`);
  await expect.element(app.getByCSS(".explanatory-controls"), {
    message: "Direct links reveal explanatory scenarios"
  }).toHaveAttribute("open");
  await expect.poll(() => visible(applicationWindow(app).document.querySelector("#host-collision"))).toBe(true);
  await expect.poll(() => applicationWindow(app).document.querySelector('nav a[aria-current="page"]').getAttribute("href")).toBe("/");
  await app.getByCSS(".host-settings > summary").click();
  await expect.element(app.getByLabelText("Persona version", {
    exact: true
  })).toHaveValue("1.20260927.13.2");
  await app.getByLabelText("Persona version", {
    exact: true
  }).selectOptions("main-2026-10-16");
  await waitForApplicationURL(app, `${url}/?personaVersion=main-2026-10-16`);
  await expect.poll(() => Array.from(applicationWindow(app).document.querySelectorAll(".walkthrough")).length).toBe(threeActorCases.length);
  await expect.poll(() => Array.from(applicationWindow(app).document.querySelectorAll('[data-scenario-kind="main"]')).length).toBe(5);
  await waitForElement(() => Array.from(applicationWindow(applicationFrame(app, "#unmarked-d-first iframe")).document.querySelectorAll(".result")).at(0));
  await expect.poll(() => applicationWindow(applicationFrame(app, "#unmarked-d-first iframe")).threeActorResult.simulation.persona).toBe("marker-guard");
  await navigateApplication(app, applicationWindow(app).location.href);
  await expect.element(app.getByLabelText("Persona version", {
    exact: true
  })).toHaveValue("main-2026-10-16");
  await app.getByLabelText("Host CSS", {
    exact: true
  }).selectOptions("runtime");
  await waitForApplicationURL(app, `${url}/?personaVersion=main-2026-10-16&host=runtime`);
  await app.getByLabelText("Host component coverage", {
    exact: true
  }).selectOptions("minimal");
  await waitForApplicationURL(app, `${url}/?personaVersion=main-2026-10-16&host=runtime&coverage=minimal`);
  await expect.element(app.getByLabelText("Persona version", {
    exact: true
  })).toHaveValue("main-2026-10-16");
  const isolated = new URL(applicationWindow(app).document.querySelector("#raw-marked-first .scenario-details a").getAttribute("href"), url);
  expect(isolated.searchParams.get("personaVersion")).toBe("main-2026-10-16");
  expect(isolated.searchParams.get("host")).toBe("runtime");
  expect(isolated.searchParams.get("coverage")).toBe("minimal");
  await app.getByLabelText("Persona version", {
    exact: true
  }).selectOptions("1.20260927.13.2");
  await waitForApplicationURL(app, `${url}/?personaVersion=1.20260927.13.2&host=runtime&coverage=minimal`);
  await expect.poll(() => Array.from(applicationWindow(app).document.querySelectorAll(".walkthrough")).length).toBe(threeActorCases.length);
  await expect.poll(() => Array.from(applicationWindow(app).document.querySelectorAll('[data-scenario-kind="release"]')).length).toBe(5);
  await navigateApplication(app, `${url}/#host-collision`);
  await app.getByCSS(".host-settings > summary").click();
  await app.getByLabelText("Host CSS", {
    exact: true
  }).selectOptions("runtime");
  await waitForApplicationURL(app, `${url}/?host=runtime`);
  await waitForElement(() => Array.from(applicationWindow(applicationFrame(app, "#persona-alone iframe")).document.querySelectorAll(".result")).at(0));
  await expect.poll(() => Array.from(applicationWindow(app).document.querySelectorAll("iframe")).every(frame => new URL(frame.src).searchParams.get("host") === "runtime")).toBe(true);
  await navigateApplication(app, applicationWindow(app).location.href);
  await expect.element(app.getByLabelText("Host CSS", {
    exact: true
  })).toHaveValue("runtime");
  await app.getByLabelText("Host component coverage", {
    exact: true
  }).selectOptions("minimal");
  await waitForApplicationURL(app, `${url}/?host=runtime&coverage=minimal`);
  await waitForElement(() => Array.from(applicationWindow(applicationFrame(app, "#persona-alone iframe")).document.querySelectorAll(".result")).at(0));
  await expect.element(app.getByLabelText("Host CSS", {
    exact: true
  })).toHaveValue("runtime");
  await expect.poll(() => Array.from(applicationWindow(app).document.querySelectorAll("iframe")).every(frame => new URL(frame.src).searchParams.get("coverage") === "minimal")).toBe(true);
  await navigateApplication(app, applicationWindow(app).location.href);
  await expect.element(app.getByLabelText("Host component coverage", {
    exact: true
  })).toHaveValue("minimal");
  await app.getByLabelText("Host CSS", {
    exact: true
  }).selectOptions("extracted");
  await waitForApplicationURL(app, `${url}/?host=extracted&coverage=minimal`);
  await waitForElement(() => Array.from(applicationWindow(applicationFrame(app, "#persona-alone iframe")).document.querySelectorAll(".result")).at(0));
}
export async function prepareGallery(app, url, {
  personaVersion,
  hostMode,
  coverage
}) {
  const versionCases = getThreeActorCases(personaVersion);
  await browserPage.viewport(1400, 1800);
  await navigateApplication(app, `${url}/?host=${hostMode}&coverage=${coverage}&personaVersion=${personaVersion}`);
  await expect.poll(() => Array.from(applicationWindow(app).document.querySelectorAll("iframe")).every(frame => new URL(frame.src).searchParams.get("personaVersion") === personaVersion)).toBe(true);
  const hiddenControl = applicationFrame(app, "#persona-first iframe");
  await waitForElement(() => applicationWindow(hiddenControl).document.querySelector("#actor-evidence"), {
    state: "attached"
  });
  await expect.poll(() => Boolean(applicationWindow(hiddenControl).threeActorResult), {
    message: "Collapsed examples must not publish measurements without layout"
  }).toBe(false);
  await app.getByCSS(".explanatory-controls > summary").click();
  for (const config of versionCases) {
    const frame = applicationFrame(app, `#${config.id} iframe`);
    await waitForElement(() => applicationWindow(frame).document.querySelector("[data-rule-trace]"));
  }
  return versionCases;
}
export async function assertGalleryEvidence(app, url, configuration) {
  const versionCases = await prepareGallery(app, url, configuration);
  const {
    personaVersion,
    hostMode
  } = configuration;
  for (const config of versionCases) {
    const frame = applicationFrame(app, `#${config.id} iframe`);
    await waitForElement(() => Array.from(applicationWindow(frame).document.querySelectorAll("[data-rule-trace]")).at(0));
    const result = applicationWindow(frame).threeActorResult;
    await assertPresentedEvidence(frame, result);
    if (config.id === "persona-alone") {
      expect(result.actors.persona.measured.icon.width).toBe("32px");
      expect(result.actors.persona.measured.probeWidth, "The healthy reference inserts in both source-aligned host modes").toBe("137px");
    }
    if (config.hostContract === "production-extraction") {
      expect(result.simulation.host.contract).toBe("production-extraction");
      expect(result.simulation.host.installed).toBe(hostMode === "extracted");
      const revision = config.primaryExample ? personaVersion : null;
      const profile = config.primaryExample ? personaRevisions[personaVersion].profile : config.personaProfile;
      expect(result.simulation.persona).toBe(profile);
      expect(result.simulation.feedback).toBe("inspected");
      expect(result.simulation.personaRevision).toBe(revision);
      if (profile === "marker-guard") {
        expect(result.simulation.persona).toBe("marker-guard");
        expect(result.events.filter(event => event.actor === "persona" && event.bucket).every(event => !event.blocked), "Current Persona must not inherit the historical failure verdict").toBeTruthy();
      }
    } else {
      expect(result.simulation, "Diagnostic controls cannot be presented as source-aligned").toBeUndefined();
    }
  }
}
export async function assertGalleryResize(app, url, configuration) {
  const versionCases = await prepareGallery(app, url, configuration);
  const brokenFrame = applicationFrame(app, "#unmarked-d-first iframe");
  await brokenFrame.getByCSS("[data-rule-trace] > summary").click();
  await browserPage.viewport(375, 1800);
  await new Promise(resolve => applicationWindow(app).requestAnimationFrame(resolve));
  await expect.poll(() => applicationWindow(brokenFrame).document.querySelector("[data-rule-trace]").open, {
    message: "Resizing preserves expanded rule evidence"
  }).toBe(true);
  await brokenFrame.getByCSS("[data-rule-trace] > summary").click();
  for (const config of versionCases) {
    const frame = applicationFrame(app, `#${config.id} iframe`);
    await assertPresentedEvidence(frame, applicationWindow(frame).threeActorResult);
  }
}
export async function assertGalleryInteractions(app, url, configuration) {
  await prepareGallery(app, url, configuration);
  const healthyFrame = applicationFrame(app, "#persona-alone iframe");
  const ruleStatus = applicationWindow(healthyFrame).document.querySelector('[data-outcome="rules"]').textContent;
  await healthyFrame.getByCSS('[data-fluent-owner="persona"] [data-fluent-primary]').hover();
  await refreshEvidence(applicationWindow(healthyFrame));
  await expect.poll(() => applicationWindow(healthyFrame).document.querySelector('[data-outcome="rules"]').textContent, {
    message: "Hover does not change the generated-CSS verdict"
  }).toBe(ruleStatus);
  const primaryButton = applicationWindow(healthyFrame).document.querySelector('[data-fluent-owner="persona"] [data-fluent-primary]');
  primaryButton.focus();
  await userEvent.keyboard("[Space>]");
  try {
    await expect.poll(() => primaryButton.matches(":active"), {
      message: "Keyboard interaction actually holds the button pressed"
    }).toBe(true);
    await refreshEvidence(applicationWindow(healthyFrame));
    await expect.poll(() => applicationWindow(healthyFrame).document.querySelector('[data-outcome="rules"]').textContent, {
      message: "Pressed state does not change the generated-CSS verdict"
    }).toBe(ruleStatus);
  } finally {
    await userEvent.keyboard("[/Space]");
  }
  await userEvent.hover(browserPage.getByCSS('body'));
  await browserPage.viewport(1400, 1800);
}
export async function assertGalleryScaling(app, url, configuration) {
  const versionCases = await prepareGallery(app, url, configuration);
  const {
    personaVersion,
    hostMode
  } = configuration;
  const insertionCounts = Object.fromEntries(Array.from(applicationWindow(app).document.querySelectorAll(".walkthrough iframe"), frame => [frame.contentWindow.threeActorResult.id, frame.contentWindow.threeActorResult.events.length]));
  for (const zoom of [0.9, 1.1, 1.25]) {
    for (const frame of applicationWindow(app).document.querySelectorAll(".walkthrough iframe")) {
      frame.contentDocument.documentElement.style.zoom = String(zoom);
      frame.contentWindow.dispatchEvent(new frame.contentWindow.Event("resize"));
    }
    await new Promise(resolve => applicationWindow(app).requestAnimationFrame(resolve));
    for (const config of versionCases) {
      const frame = applicationFrame(app, `#${config.id} iframe`);
      const result = applicationWindow(frame).threeActorResult;
      await assertPresentedEvidence(frame, result);
      expect(result.events.length, "Scaling does not change rule insertion evidence").toBe(insertionCounts[config.id]);
      if (hostMode === "extracted" && config.id === "persona-alone") {
        const attempts = result.events.filter(event => event.actor === "persona" && event.bucket).length;
        await expect.poll(() => applicationWindow(frame).document.querySelector('[data-outcome="rules"]').textContent, {
          message: `First scenario reports its generated CSS at ${zoom * 100}% scaling`
        }).toBe(`${attempts}/${attempts} recorded native rules present in destination CSSOM.`);
        await expect.poll(() => applicationWindow(frame).document.querySelector('[data-actor-status="persona"]').classList.contains("missing")).toBe(false);
        await expect.poll(() => applicationWindow(frame).document.querySelector("[data-rule-trace]").textContent).not.toContain("VISIBLE WIDTH MISMATCH");
        if (zoom === 1.1) {
          const window = applicationWindow(frame);
          const provider = window.document.querySelector('[data-fluent-owner="persona"]');
          const fractional = {
            action: window.getComputedStyle(provider.querySelector("[data-actor-probe]")).width,
            icon: window.getComputedStyle(provider.querySelector("[data-fluent-icon]")).width
          };
          expect(fractional.action, "Regression actually exercises the reported fractional action width").not.toBe("137px");
          expect(fractional.icon, "Regression actually exercises the reported fractional phone width").not.toBe("32px");
        }
      }
      if (hostMode === "extracted" && config.id === "unmarked-d-first") {
        await expect.poll(() => applicationWindow(frame).document.querySelector('[data-actor-status="persona"]').classList.contains("missing"), {
          message: "Rejected rules remain a CSSOM failure independently of scaling"
        }).toBe(personaVersion === "1.20260927.13.2");
      }
    }
  }
}
