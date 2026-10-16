import { createDOMRenderer } from "@fluentui/react-components";
import { compile, serialize, stringify } from "stylis";

export const PERSONA_SCOPE = "demo-contact-scope";
const OWNER_ATTRIBUTE = "data-demo-renderer-owner";
const ownerRenderers = new WeakMap();

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

function createMarkedRenderer(doc, attributes = {}) {
  return createDOMRenderer(doc, {
    insertionPoint: doc.head.firstChild,
    styleElementAttributes: { "data-demo-allow-rules": "true", ...attributes },
  });
}

export function createPersonaRenderer(doc) {
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

function getOwnerGuardRenderer(doc, owner) {
  if (typeof owner !== "string" || !owner) throw new Error("Owner-guard renderer requires a nonempty string owner");
  let cache = ownerRenderers.get(doc);
  if (!cache) {
    cache = new Map();
    ownerRenderers.set(doc, cache);
  }
  const existing = cache.get(owner);
  if (existing && Object.values(existing.stylesheets).every(sheet => !sheet.element || sheet.element.isConnected)) {
    return existing;
  }
  const renderer = createMarkedRenderer(doc, { [OWNER_ATTRIBUTE]: owner });
  renderer.stylesheets = new Proxy(renderer.stylesheets, {
    set(buckets, key, handle) {
      if (handle?.elementAttributes?.[OWNER_ATTRIBUTE] === owner) Reflect.set(buckets, key, handle);
      return true;
    },
  });
  const scoped = withScope(renderer);
  cache.set(owner, scoped);
  return scoped;
}

const profiles = {
  historical: doc => createPersonaRenderer(doc),
  "marker-guard": doc => createMarkerGuardRenderer(doc),
  "owner-guard": (doc, owner) => getOwnerGuardRenderer(doc, owner),
};

export function getPersonaRenderer(doc, { profile = "marker-guard", owner = "contact-card" } = {}) {
  if (!Object.hasOwn(profiles, profile)) throw new Error(`Unknown Persona renderer profile: ${profile}`);
  return profiles[profile](doc, owner);
}
