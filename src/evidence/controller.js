import { analyzeEvidence } from "./analysis.js";
import { refreshEvidence } from "./snapshot.js";
import { renderEvidence } from "./presentation.js";

export function createEvidenceController(context, config) {
  const view = context.doc.defaultView;
  let frame;
  function refresh() {
    refreshEvidence(context);
    const analysis = analyzeEvidence(context.result);
    for (const [actor, evidence] of Object.entries(context.result.actors)) {
      evidence.borrowedPermission = analysis.actors[actor].borrowedPermission;
    }
    renderEvidence(context.result, config, analysis);
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
