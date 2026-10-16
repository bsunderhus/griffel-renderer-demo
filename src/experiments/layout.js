import { personaRevisions } from "./scenarios.js";

export async function prepareExperiment(settings) {
  document.body.className = "case-page three-actor-page";
  if (settings.walkthrough) document.body.classList.add("walkthrough-page");
  document.getElementById("root").innerHTML = `
    <div class="actor-grid">
      <section><h2>Host (${settings.hostMode})</h2><div id="host-mount"></div></section>
      <section><h2>Persona (${personaRevisions[settings.personaRevision]?.label || "styles limited to its container"})</h2><div id="persona-mount">Not mounted</div></section>
      <section ${settings.order.includes("feedback") ? "" : "hidden"}><h2>Feedback (separately loaded)</h2><div id="feedback-mount">Not mounted</div></section>
    </div>
    <div id="actor-evidence" aria-live="polite">Loading actors...</div>`;
  while (!document.documentElement.getClientRects().length) {
    await new Promise(requestAnimationFrame);
  }
}
