import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { RendererProvider } from "@fluentui/react-components";
import { FeedbackForm } from "./FeedbackForm.jsx";

export function createFeedbackMount(renderer) {
  return function mount(container, options) {
    if (options !== undefined) {
      throw new Error("Feedback does not accept renderer or workload overrides");
    }
    const root = createRoot(container);
    flushSync(() =>
      root.render(
        <RendererProvider renderer={renderer} targetDocument={document}>
          <FeedbackForm />
        </RendererProvider>,
      ),
    );
    return { renderer, unmount: () => flushSync(() => root.unmount()) };
  };
}
