import React from "react";
import { describeScenario } from "./describe-scenario.js";
import { personaRevisions } from "../experiments/scenarios.js";

export function ScenarioCard({ config, index, hostMode, coverage, personaVersion }) {
  const url = `/?scenario=${config.id}&host=${hostMode}&coverage=${coverage}&personaVersion=${personaVersion}`;
  const sourceAligned = config.hostContract === "production-extraction";
  const revision = personaRevisions[config.personaRevision === "selected" ? personaVersion : config.personaRevision];
  const loadOrder = ["Host", ...(config.seed ? ["Unrelated style sheet"] : []),
    ...config.order.map(actor => actor === "persona" ? "Persona" : "Feedback")];
  return <section className="card walkthrough" id={config.id}
    data-scenario-contract={sourceAligned ? "source-aligned" : "diagnostic"}
    data-scenario-kind={revision?.kind || config.controlKind || "diagnostic"}>
    <h2>{config.primaryExample ? index + 1 : `Control ${index + 1}`}. {config.title}</h2>
    <p className="note">{sourceAligned ?
      <>{revision?.kind === "release" ? "Pinned release renderer; deployment unverified." :
        revision?.kind === "main" ? "Upstream main snapshot; consumer adoption unverified." :
          `Explanatory ${config.controlKind} control.`}
        {" "}Persona: <strong>{revision?.label || config.personaProfile}</strong>.
        {" "}Feedback: <strong>{config.order.includes("feedback") ? "inspected profile" : "not mounted"}</strong>.
        {" "}Host: {config.policy === "master" ? "sheet-only (inspected host main)" : "sheet + Feedback prefix (unmerged host proposal)"} filter,
        {hostMode === "extracted" ? " enabled by production/extraction." : " disabled without extraction."}</> :
      <>Explanatory control. Host filtering is a diagnostic override
        ({config.policy === "off" ? "off" : config.policy === "master" ? "sheet-only" : "sheet + Feedback prefix"}),
        independent of the production/extraction gate. Persona uses the historical unguarded renderer;
        Feedback settings are experimental. This is not a current-main scenario.</>}
    </p>
    <ol className="load-order" aria-label="Load order">
      {loadOrder.map(step => <li key={step}>{step}</li>)}
    </ol>
    <p className="scenario-takeaway"><strong>What this demonstrates: </strong>{config.takeaway}
      {hostMode === "runtime" && <> This is the extracted-host takeaway; runtime mode changes
        the available sheets{sourceAligned ? " and disables host filtering" : " while retaining this diagnostic policy"}.</>}
    </p>
    <iframe className="walkthrough-frame" title={config.title}
      src={`${url}&view=walkthrough`} />
    <details className="scenario-details"><summary>Technical details</summary>
      <p>{describeScenario(config, hostMode, coverage)}</p>
      <a href={url}>Open isolated scenario with full rule evidence</a>
    </details>
  </section>;
}
