import { createDOMRenderer } from "@griffel/react";

export function createHostRenderer(doc, kind) {
  if (kind === "dom") return createDOMRenderer(doc);
  if (kind !== "noop") throw new Error(`Unknown host renderer: ${kind}`);
  return {
    id: "demo-extracted-host",
    stylesheets: {}, insertionCache: {},
    compareMediaQueries: () => 0,
    compareContainerQueries: () => 0,
    insertCSSRules() {},
  };
}
