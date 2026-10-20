import { loadScript, loadStylesheet } from "./assets.js";

export async function mountHost(settings, container) {
  const stylesheet = settings.stylesheet ? await loadStylesheet(settings.stylesheet) : null;
  try {
    await loadScript(settings.script);
    return {
      ...window.reproHost.mount(container, {
        extracted: settings.extracted,
        contract: settings.hostContract,
        policy: settings.policy,
      }),
      stylesheet,
    };
  } catch (error) {
    stylesheet?.remove();
    throw error;
  }
}

export const integrations = {
  persona: {
    script: (settings) =>
      settings.personaProfile === "prefix-salted" ? "/persona-raw.js" : "/persona.js",
    mount: (container, settings) =>
      window.personaActor.mount(container, { profile: settings.personaProfile }),
  },
  feedback: {
    script: (settings) =>
      settings.feedbackProfile === "enhanced-marker" ? "/feedback-marked.js" : "/feedback-raw.js",
    mount: (container) => window.feedbackActor.mount(container),
  },
};

export async function loadIntegration(name, settings) {
  const participant = integrations[name];
  const script = participant.script(settings);
  await loadScript(script);
  return script;
}

export function mountIntegration(name, settings, container, observation, mountIndex = 1) {
  const participant = integrations[name];
  container.replaceChildren();
  const mounted = observation.withActor(
    name,
    () => participant.mount(container, settings),
    mountIndex,
  );
  let disconnect;
  const unmount = () => {
    try {
      disconnect?.();
    } finally {
      mounted.unmount();
    }
  };
  try {
    disconnect = observation.observeRenderer(name, mounted.renderer, mountIndex);
    observation.registerSheets(name);
    return { ...mounted, unmount };
  } catch (error) {
    try {
      unmount();
    } catch (cleanupError) {
      console.error("Participant cleanup failed", cleanupError);
    }
    throw error;
  }
}
