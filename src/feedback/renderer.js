import { createDOMRenderer } from "@fluentui/react-components";
import { feedbackProfile } from "./profile.js";

export const feedbackRenderer = createDOMRenderer(document, {
  classNameHashSalt: feedbackProfile.salt,
});
const insert = feedbackRenderer.insertCSSRules.bind(feedbackRenderer);
feedbackRenderer.insertCSSRules = cssRules => insert(Object.fromEntries(
      Object.entries(cssRules).map(([bucket, entries]) => [
        bucket, entries.map(entry => typeof entry === "string" ? `${feedbackProfile.rulePrefix}${entry}` :
          [`${feedbackProfile.rulePrefix}${entry[0]}`, entry[1]]),
      ])));
