import { createDOMRenderer } from "@fluentui/react-components";
import { compile, serialize, stringify } from "stylis";

export const PERSONA_SCOPE = "demo-contact-scope";

function withScope(original, beforeInsert = () => {}) {
  return {
    ...original,
    insertCSSRules(cssRules) {
      beforeInsert();
      const enhance = rule => serialize(compile(`.${PERSONA_SCOPE} {${rule} }`), stringify);
      const rules = Object.fromEntries(Object.entries(cssRules).map(([bucket, entries]) => [
        bucket, entries.map(entry => typeof entry === "string" ? enhance(entry) : [enhance(entry[0]), entry[1]]),
      ]));
      original.insertCSSRules(rules);
    },
  };
}

function createMarkedRenderer(doc) {
  return createDOMRenderer(doc, {
    insertionPoint: doc.head.firstChild,
    styleElementAttributes: { "data-demo-allow-rules": "true" },
  });
}

function createPersonaRenderer(doc) {
  return withScope(createMarkedRenderer(doc));
}

function createMarkerGuardRenderer(doc) {
  const renderer = createMarkedRenderer(doc);
  return withScope(renderer, () => {
    for (const key of Object.keys(renderer.stylesheets)) {
      if (renderer.stylesheets[key].elementAttributes["data-demo-allow-rules"] !== "true") {
        delete renderer.stylesheets[key];
      }
    }
  });
}

const profiles = {
  historical: doc => createPersonaRenderer(doc),
  "marker-guard": doc => createMarkerGuardRenderer(doc),
};

export function getPersonaRenderer(doc, { profile = "marker-guard" } = {}) {
  if (!Object.hasOwn(profiles, profile)) throw new Error(`Unknown Persona renderer profile: ${profile}`);
  return profiles[profile](doc);
}
