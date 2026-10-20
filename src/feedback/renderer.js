import { createDOMRenderer } from "@fluentui/react-components";
import { feedbackProfile } from "./profile.js";

export function createFeedbackRenderer(doc, styleElementAttributes) {
  const renderer = createDOMRenderer(doc, {
    classNameHashSalt: feedbackProfile.salt,
    styleElementAttributes,
  });
  const insert = renderer.insertCSSRules.bind(renderer);
  renderer.insertCSSRules = (cssRules) =>
    insert(
      Object.fromEntries(
        Object.entries(cssRules).map(([bucket, entries]) => [
          bucket,
          entries.map((entry) =>
            typeof entry === "string"
              ? `${feedbackProfile.rulePrefix}${entry}`
              : [`${feedbackProfile.rulePrefix}${entry[0]}`, entry[1]],
          ),
        ]),
      ),
    );
  return renderer;
}
