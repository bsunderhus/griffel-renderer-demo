import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { createDOMRenderer, makeResetStyles, makeStyles, RendererProvider } from "@griffel/react";
import { FluentControls } from "./fluent-controls.jsx";

// Deliberately identical base declarations in separately compiled source.
// The generated reset class overlaps naturally when no hash salt is supplied.
const useBase = makeResetStyles({ backgroundColor: "#e8a33d" });
const useOverrides = makeStyles({ root: { width: "137px" } });

function Integration() {
  const base = useBase();
  const overrides = useOverrides();
  return <FluentControls owner="integration" avatarClassName={base} actionClassName={overrides.root} />;
}

window.runtimeIntegration = {
  mount(container, config) {
    const renderer = createDOMRenderer(document, {
      classNameHashSalt: config.salt ? "standalone-runtime" : undefined,
      styleElementAttributes: config.approved ? { "data-standalone-approved": "true" } : undefined,
    });
    const insert = renderer.insertCSSRules.bind(renderer);
    if (config.markRule) {
      renderer.insertCSSRules = rules => insert(Object.fromEntries(
        Object.entries(rules).map(([bucket, entries]) => [bucket, entries.map(entry =>
          typeof entry === "string" ? `/* standalone-allowed */${entry}` :
            [`/* standalone-allowed */${entry[0]}`, entry[1]])])));
    }
    flushSync(() => createRoot(container).render(
      <RendererProvider renderer={renderer} targetDocument={document}><Integration /></RendererProvider>
    ));
    return renderer;
  },
};
