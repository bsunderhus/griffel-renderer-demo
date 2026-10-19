import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { experiments } from "../src/experiments/scenarios.js";
import { runThreeActorCase } from "../src/experiments/run.js";

const mocks = vi.hoisted(() => ({
  mountHost: vi.fn(), mountIntegration: vi.fn(), loadIntegration: vi.fn(),
  createObservation: vi.fn(), captureHostBaseline: vi.fn(), createEvidenceController: vi.fn(),
  loadScript: vi.fn(), loadStylesheet: vi.fn(),
}));
vi.mock("../src/experiments/assets.js", () => ({
  loadScript: mocks.loadScript, loadStylesheet: mocks.loadStylesheet,
}));
vi.mock("../src/experiments/layout.js", () => ({ prepareExperiment: vi.fn() }));
vi.mock("../src/experiments/participants.js", () => ({
  mountHost: mocks.mountHost, mountIntegration: mocks.mountIntegration, loadIntegration: mocks.loadIntegration,
  integrations: { persona: { script: () => "/persona.js" }, feedback: { script: () => "/feedback-raw.js" } },
}));
vi.mock("../src/evidence/observation.js", () => ({ createObservation: mocks.createObservation }));
vi.mock("../src/evidence/snapshot.js", () => ({ captureHostBaseline: mocks.captureHostBaseline }));
vi.mock("../src/evidence/controller.js", () => ({ createEvidenceController: mocks.createEvidenceController }));

let host;
let observation;
let actor;
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("location", { search: "?coverage=minimal" });
  vi.stubGlobal("document", { getElementById: vi.fn(), querySelectorAll: () => [] });
  vi.stubGlobal("window", { addEventListener: vi.fn(), removeEventListener: vi.fn() });
  host = { renderer: {}, dispose: vi.fn(), stylesheet: { remove: vi.fn(), sheet: { cssRules: [] } },
    runtimeCalls: () => 0, policyState: () => ({}), contract: { effectivePolicy: "master" } };
  observation = { connectHost: vi.fn(), dispose: vi.fn(), events: [] };
  actor = { renderer: {}, unmount: vi.fn() };
  mocks.mountHost.mockResolvedValue(host);
  mocks.createObservation.mockReturnValue(observation);
  mocks.mountIntegration.mockReturnValue(actor);
  mocks.createEvidenceController.mockReturnValue({ dispose: vi.fn() });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test.each(["mountHost", "createObservation", "captureHostBaseline", "loadIntegration", "mountIntegration",
  "createEvidenceController"])("%s failures release all previously acquired handles", async point => {
  const failure = new Error(`Injected ${point}`);
  if (point === "mountHost" || point === "loadIntegration") mocks[point].mockRejectedValue(failure);
  else mocks[point].mockImplementation(() => { throw failure; });
  await expect(runThreeActorCase(experiments[0])).rejects.toBe(failure);
  expect(host.dispose).toHaveBeenCalledTimes(point === "mountHost" ? 0 : 1);
  expect(host.stylesheet.remove).toHaveBeenCalledTimes(point === "mountHost" ? 0 : 1);
  expect(observation.dispose).toHaveBeenCalledTimes(["mountHost", "createObservation"].includes(point) ? 0 : 1);
  expect(actor.unmount).toHaveBeenCalledTimes(point === "createEvidenceController" ? 1 : 0);
  expect(window.threeActorResult).toBeUndefined();
  expect(window.addEventListener).not.toHaveBeenCalled();
});

test("a failed unmount cannot prevent host restoration or replace the original startup error", async () => {
  const failure = new Error("Controller initialization failed");
  const cleanupFailure = new Error("Actor unmount failed");
  mocks.createEvidenceController.mockImplementation(() => { throw failure; });
  actor.unmount.mockImplementation(() => { throw cleanupFailure; });
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  await expect(runThreeActorCase(experiments[0])).rejects.toBe(failure);
  expect(observation.dispose).toHaveBeenCalledOnce();
  expect(host.dispose).toHaveBeenCalledOnce();
  expect(host.stylesheet.remove).toHaveBeenCalledOnce();
  expect(log).toHaveBeenCalledWith("Experiment cleanup failed", expect.any(AggregateError));
  expect(log.mock.calls[0][1].errors).toStrictEqual([cleanupFailure]);
});

test.each(["loadIntegration", "mountIntegration"])("a later %s failure unmounts previously acquired actors", async point => {
  const failure = new Error("Second actor failed");
  if (point === "loadIntegration") {
    mocks.loadIntegration.mockResolvedValueOnce("/persona.js").mockRejectedValueOnce(failure);
  } else {
    mocks.mountIntegration.mockReturnValueOnce(actor).mockImplementationOnce(() => { throw failure; });
  }
  const config = experiments.find(experiment => experiment.id === "persona-first-raw");
  await expect(runThreeActorCase(config)).rejects.toBe(failure);
  expect(actor.unmount).toHaveBeenCalledOnce();
  expect(observation.dispose).toHaveBeenCalledOnce();
  expect(host.dispose).toHaveBeenCalledOnce();
});

test.each(["script", "mount"])("host %s failure removes its already-loaded stylesheet", async point => {
  const { mountHost } = await vi.importActual("../src/experiments/participants.js");
  const stylesheet = { remove: vi.fn() };
  const failure = new Error("Host initialization failed");
  mocks.loadStylesheet.mockResolvedValue(stylesheet);
  window.reproHost = { mount: vi.fn(() => { throw failure; }) };
  if (point === "script") mocks.loadScript.mockRejectedValue(failure);
  await expect(mountHost({ stylesheet: "/griffel.css", script: "/host-extracted.js" }, {}))
    .rejects.toBe(failure);
  expect(stylesheet.remove).toHaveBeenCalledOnce();
  expect(window.reproHost.mount).toHaveBeenCalledTimes(point === "script" ? 0 : 1);
});

test.each(["loadScript", "loadStylesheet"])("%s removes a failed asset element and reports the URL", async name => {
  const assets = await vi.importActual("../src/experiments/assets.js");
  const element = { remove: vi.fn() };
  document.createElement = () => element;
  document.body = document.head = { appendChild: vi.fn() };
  const pending = assets[name]("/missing-asset");
  element.onerror();
  await expect(pending).rejects.toThrow("Unable to load /missing-asset");
  expect(element.remove).toHaveBeenCalledOnce();
});
