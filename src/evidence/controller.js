import { analyzeEvidence } from "./analysis.js";
import { refreshEvidence } from "./snapshot.js";
import { renderEvidence } from "./presentation.js";

export function createEvidenceController(context) {
  const view = context.doc.defaultView;
  let frame;
  function refresh() {
    refreshEvidence(context);
    const analysis = analyzeEvidence(context.result);
    renderEvidence(context.result, analysis);
  }
  function schedule() {
    view.cancelAnimationFrame(frame);
    frame = view.requestAnimationFrame(() => {
      if (context.doc.documentElement.getClientRects().length) refresh();
    });
  }
  refresh();
  context.observation.onChange(schedule);
  view.addEventListener("resize", schedule);
  return {
    dispose() {
      view.cancelAnimationFrame(frame);
      view.removeEventListener("resize", schedule);
      context.observation.onChange(() => {});
    },
  };
}
