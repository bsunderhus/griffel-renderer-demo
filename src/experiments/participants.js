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
  feedback: {
    script: options => options.raw ? "/feedback-raw.js" : "/feedback-standard.js",
    mount: (container, settings) => window.feedbackActor.mount(container, {
      ...settings.feedback, profile: settings.feedbackProfile,
    }),
  },
};

export async function mountIntegration(name, settings, container, observation) {
  const participant = integrations[name];
  await loadScript(participant.script(settings.feedback));
  container.replaceChildren();
  const mounted = observation.withActor(name, () => participant.mount(container, settings));
  observation.observeRenderer(name, mounted.renderer);
  observation.registerSheets(name);
  return mounted;
}
