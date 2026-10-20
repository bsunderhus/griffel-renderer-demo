import { createFeedbackMount } from "./mount.jsx";
import { createFeedbackRenderer } from "./renderer.js";

const renderer = createFeedbackRenderer(document, { "data-demo-allow-rules": "true" });
window.feedbackActor = {
  build: { rawStyles: true },
  mount: createFeedbackMount(renderer),
};
