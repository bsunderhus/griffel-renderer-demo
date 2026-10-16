import { createDOMRenderer } from "@griffel/core";

window.sourceSeed = attributes => {
  const renderer = createDOMRenderer(document, {
    insertionPoint: document.head.firstChild,
    styleElementAttributes: attributes,
  });
  renderer.insertCSSRules({ d: [".unrelated-host-probe{height:1px}"] });
  return renderer.stylesheets.d0.element;
};
