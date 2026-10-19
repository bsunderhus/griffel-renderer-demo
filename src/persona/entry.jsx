import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { RendererProvider } from "@fluentui/react-components";
import { ContactCard } from "./ContactCard.jsx";
import { getPersonaRenderer } from "./renderer.js";

window.personaActor = {
  mount(container, options) {
    const ownerDocument = container.ownerDocument;
    const renderer = getPersonaRenderer(ownerDocument, options);
    const root = createRoot(container);
    flushSync(() =>
      root.render(
        <RendererProvider renderer={renderer} targetDocument={ownerDocument}>
          <ContactCard ownerDocument={ownerDocument} />
        </RendererProvider>,
      ),
    );
    return { renderer, unmount: () => flushSync(() => root.unmount()) };
  },
};
