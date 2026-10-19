import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { RendererProvider } from "@fluentui/react-components";
import { DiagnosticFeedbackForm, FeedbackForm } from "./FeedbackForm.jsx";
import { getFeedbackRenderer } from "./renderer.js";
import { inspectedFeedbackOptions } from "./profile.js";

export function createFeedbackModule({ rawStyles }) {
  return {
    build: { rawStyles },
    mount(container, options) {
      if (options.profile === "inspected" && !rawStyles) {
        throw new Error("The inspected Feedback profile requires the independently built raw-style bundle");
      }
      const { salt, marker } = options.profile === "inspected" ? inspectedFeedbackOptions : options;
      if (options.profile && !["inspected", "control"].includes(options.profile)) {
        throw new Error(`Unknown Feedback renderer profile: ${options.profile}`);
      }
      const renderer = getFeedbackRenderer({ salt, marker });
      if (options.profile === "inspected" && options.diagnostic) {
        throw new Error("The inspected Feedback workload cannot enable collision diagnostics");
      }
      const Form = options.diagnostic ? DiagnosticFeedbackForm : FeedbackForm;
      const root = createRoot(container);
      flushSync(() => root.render(
        <RendererProvider renderer={renderer} targetDocument={document}><Form /></RendererProvider>
      ));
      return { renderer, unmount: () => flushSync(() => root.unmount()) };
    },
  };
}
