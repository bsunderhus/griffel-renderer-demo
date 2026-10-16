import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { createDOMRenderer, makeStyles, RendererProvider } from "@fluentui/react-components";
import { compile, serialize, stringify } from "stylis";
import { FluentControls } from "./fluent-controls.jsx";

const SCOPE = "demo-contact-scope";
const useStyles = makeStyles({ probe: { width: "137px" } });

function Persona() {
  const styles = useStyles();
  return <FluentControls owner="persona" scopeClassName={SCOPE} actionClassName={styles.probe} />;
}

window.personaActor = {
  mount(container) {
    // Demonstrate marked sheets with container-prefixed selectors.
    const original = createDOMRenderer(document, {
      insertionPoint: document.head.firstChild,
      styleElementAttributes: { "data-demo-allow-rules": "true" },
    });
    const renderer = {
      ...original,
      insertCSSRules(cssRules) {
        const enhance = rule => serialize(compile(`.${SCOPE} {${rule} }`), stringify);
        const rules = Object.fromEntries(Object.entries(cssRules).map(([bucket, entries]) => [
          bucket, entries.map(entry => typeof entry === "string" ? enhance(entry) : [enhance(entry[0]), entry[1]]),
        ]));
        original.insertCSSRules(rules);
      },
    };
    const root = createRoot(container);
    flushSync(() => root.render(
      <RendererProvider renderer={renderer} targetDocument={document}><Persona /></RendererProvider>
    ));
    return { renderer, unmount: () => flushSync(() => root.unmount()) };
  },
};
