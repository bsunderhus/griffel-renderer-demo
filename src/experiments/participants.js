import { loadScript, loadStylesheet } from "./assets.js";

export async function mountHost(settings, container) {
  const stylesheet = settings.stylesheet ? await loadStylesheet(settings.stylesheet) : null;
  await loadScript(settings.script);
  return { ...window.reproHost.mount(container, {
    extracted: settings.extracted, contract: settings.hostContract, policy: settings.policy,
  }), stylesheet };
}

export const integrations = {
  persona: {
    script: () => "/persona.js",
    mount: (container, settings) => window.personaActor.mount(container, { profile: settings.personaProfile }),
  },
  feedback: { script: () => "/feedback-raw.js", mount: container => window.feedbackActor.mount(container) },
};

export async function loadIntegration(name) {
  const participant = integrations[name];
  const script = participant.script();
  await loadScript(script);
  return script;
}

export function mountIntegration(name, settings, container, observation, mountIndex = 1) {
  const participant = integrations[name];
  container.replaceChildren();
  const mounted = observation.withActor(name, () => participant.mount(container, settings), mountIndex);
  const disconnect = observation.observeRenderer(name, mounted.renderer, mountIndex);
  observation.registerSheets(name);
  return { ...mounted, unmount() { disconnect(); mounted.unmount(); } };
}
