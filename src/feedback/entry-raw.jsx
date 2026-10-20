import { createFeedbackMount } from "./mount.jsx";
import { createFeedbackRenderer } from "./renderer.js";

const renderer = createFeedbackRenderer(document);
window.feedbackActor = {
  build: { rawStyles: true },
  mount: createFeedbackMount(renderer),
};
