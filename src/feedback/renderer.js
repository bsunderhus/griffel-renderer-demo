import { createDOMRenderer } from "@fluentui/react-components";
import { feedbackProfile } from "./profile.js";

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

export function getFeedbackRenderer(options) {
  return options.salt && options.marker ? demoProfileRenderer : createFeedbackRenderer(options);
}
