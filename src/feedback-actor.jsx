import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { createDOMRenderer, makeResetStyles, makeStyles, RendererProvider } from "@fluentui/react-components";
import { FluentControls } from "./fluent-controls.jsx";
import { feedbackProfile } from "./feedback-profile.js";

const useStyles = makeStyles({ probe: { width: "137px" } });
const useBase = makeResetStyles({ backgroundColor: "#e8a33d" });

function Feedback() {
  const base = useBase();
  const styles = useStyles();
  return <FluentControls owner="feedback" avatarClassName={base} actionClassName={styles.probe} />;
}

function createFeedbackRenderer({ salt, marker }) {
  const renderer = createDOMRenderer(document, {
    classNameHashSalt: salt ? feedbackProfile.salt : undefined,
  });
  const insert = renderer.insertCSSRules.bind(renderer);
  if (marker) {
    renderer.insertCSSRules = cssRules => insert(Object.fromEntries(
      Object.entries(cssRules).map(([bucket, entries]) => [
        bucket, entries.map(entry => typeof entry === "string" ? `${feedbackProfile.rulePrefix}${entry}` :
          [`${feedbackProfile.rulePrefix}${entry[0]}`, entry[1]]),
      ])));
  }
  return renderer;
}

const demoProfileRenderer = createFeedbackRenderer({ salt: true, marker: true });

// Independently bundled synthetic form integration.
window.feedbackActor = {
  mount(container, { salt, marker }) {
    const renderer = salt && marker ? demoProfileRenderer : createFeedbackRenderer({ salt, marker });
    const root = createRoot(container);
    flushSync(() => root.render(
      <RendererProvider renderer={renderer} targetDocument={document}><Feedback /></RendererProvider>
    ));
    return { renderer, unmount: () => flushSync(() => root.unmount()) };
  },
};
