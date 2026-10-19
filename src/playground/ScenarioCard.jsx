import React from "react";
import { describeScenario } from "./describe-scenario.js";
import { personaRevisions } from "../experiments/scenarios.js";
import { sitePath } from "../site.js";

export function ScenarioCard({ config, index, hostMode, coverage, personaVersion, hostPolicy }) {
  const url = sitePath(`?scenario=${config.id}&host=${hostMode}&coverage=${coverage}&personaVersion=${personaVersion}&hostPolicy=${hostPolicy}`);
  const policy = config.policy === "selected" ? hostPolicy : config.policy;
  const revision = personaRevisions[personaVersion];
  const loadOrder = ["Host ready",
    ...config.schedule.map(({ action, actor }) => `${action} ${actor === "persona" ? "Persona" : "Feedback"}`)];
  return <section className="card walkthrough" id={config.id}
    data-scenario-contract="source-aligned" data-scenario-kind={revision.kind}>
    <h2>{index + 1}. {config.title}</h2>
    <p className="note">
      <>{revision?.kind === "release" ? "Pinned release renderer; deployment unverified." :
        "Upstream main snapshot; consumer adoption unverified."}
        {" "}Persona: <strong>{revision.label}</strong>.
        {" "}Feedback: <strong>{config.order.includes("feedback") ? "inspected profile" : "not mounted"}</strong>.
        {" "}Host: {policy === "master" ? "sheet-only (inspected host main)" : "sheet + Feedback prefix (unmerged host proposal)"} filter,
        {hostMode === "extracted" ? " enabled by production/extraction." : " disabled without extraction."}</>
    </p>
    <ol className="load-order" aria-label="Execution schedule">
      {loadOrder.map((step, stepIndex) => <li key={stepIndex}>{step}</li>)}
    </ol>
    <p className="scenario-takeaway"><strong>What this demonstrates: </strong>{config.takeaway}
      {hostMode === "runtime" && <> This is the extracted-host takeaway; runtime mode changes
        the available sheets and disables host filtering.</>}
    </p>
    <iframe className="walkthrough-frame" title={config.title}
      src={`${url}&view=walkthrough`} />
    <details className="scenario-details"><summary>Technical details</summary>
      <p>{describeScenario(config, hostMode, coverage)}</p>
      <a href={url}>Open isolated scenario with full rule evidence</a>
    </details>
  </section>;
}
