import React from "react";
import { describeScenario } from "./describe-scenario.js";

export function ScenarioCard({ config, index, hostMode, coverage }) {
  const url = `/?scenario=${config.id}&host=${hostMode}&coverage=${coverage}`;
  const sourceAligned = config.hostContract === "production-extraction";
  const loadOrder = ["Host", ...(config.seed ? ["Unrelated style sheet"] : []),
    ...config.order.map(actor => actor === "persona" ? "Persona" : "Feedback")];
  return <section className="card walkthrough" id={config.id}
    data-scenario-contract={sourceAligned ? "source-aligned" : "diagnostic"}>
    <h2>{config.primaryExample ? index + 1 : `Control ${index + 1}`}. {config.title}</h2>
    <p className="note">{sourceAligned ?
      <>Source-aligned scenario. Persona: <strong>{config.personaProfile}</strong>.
        {" "}Feedback: <strong>{config.order.includes("feedback") ? "inspected profile" : "not mounted"}</strong>.
        {" "}Host: {config.policy === "master" ? "sheet-only" : "sheet + Feedback prefix"} filter,
        {hostMode === "extracted" ? " enabled by production/extraction." : " disabled without extraction."}</> :
      <>Explanatory control. Host filtering is a diagnostic override
        ({config.policy === "off" ? "off" : config.policy === "master" ? "sheet-only" : "sheet + Feedback prefix"}),
        independent of the production/extraction gate. Feedback settings are experimental.</>}
    </p>
    <ol className="load-order" aria-label="Load order">
      {loadOrder.map(step => <li key={step}>{step}</li>)}
    </ol>
    <p className="scenario-takeaway"><strong>What this demonstrates: </strong>{config.takeaway}
      {hostMode === "runtime" && <> This is the extracted-host takeaway; runtime mode changes
        the available sheets{sourceAligned ? " and disables host filtering" : " while retaining this diagnostic policy"}.</>}
    </p>
    <iframe className="walkthrough-frame" title={config.title}
      src={`/?scenario=${config.id}&view=walkthrough&host=${hostMode}&coverage=${coverage}`} />
    <details className="scenario-details"><summary>Technical details</summary>
      <p>{describeScenario(config, hostMode, coverage)}</p>
      <a href={url}>Open isolated scenario with full rule evidence</a>
    </details>
  </section>;
}
