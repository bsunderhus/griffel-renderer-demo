import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { RendererProvider } from "@fluentui/react-components";
import { FeedbackForm } from "./FeedbackForm.jsx";
import { feedbackRenderer } from "./renderer.js";

export function mount(container, options) {
  if (options !== undefined) {
    throw new Error("Feedback does not accept renderer or workload overrides");
  }
  const root = createRoot(container);
  flushSync(() =>
    root.render(
      <RendererProvider renderer={feedbackRenderer} targetDocument={document}>
        <FeedbackForm />
      </RendererProvider>,
    ),
  );
  return { renderer: feedbackRenderer, unmount: () => flushSync(() => root.unmount()) };
}
