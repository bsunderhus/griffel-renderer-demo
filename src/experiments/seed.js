import { createDOMRenderer } from "@griffel/core";

export function createUnmarkedSeed(doc) {
  const renderer = createDOMRenderer(doc);
  renderer.insertCSSRules({ d: [".unrelated-host-probe{height:1px}"] });
  return renderer.stylesheets.d0.element;
}
