import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { createDOMRenderer, makeResetStyles, makeStyles, mergeClasses, RendererProvider } from "@griffel/react";
import HostControls from "./host-controls.jsx";

const useBase = makeResetStyles({ backgroundColor: "#e8a33d" });
const useOverrides = makeStyles({ root: { backgroundColor: "#b7e4c7" } });

function Host() {
  const base = useBase();
  const overrides = useOverrides();
  return <HostControls avatarClassName={mergeClasses(base, overrides.root)} />;
}

window.reproHost = {
  mount(container, extracted) {
    let runtimeCalls = 0;
    const renderer = createDOMRenderer(document);
    const insert = renderer.insertCSSRules.bind(renderer);
    renderer.insertCSSRules = rules => {
      runtimeCalls++;
      if (extracted) throw new Error("Extracted host unexpectedly attempted runtime insertion");
      insert(rules);
    };
    flushSync(() => createRoot(container).render(
      <RendererProvider renderer={renderer} targetDocument={document}><Host /></RendererProvider>
    ));
    return () => runtimeCalls;
  },
};
