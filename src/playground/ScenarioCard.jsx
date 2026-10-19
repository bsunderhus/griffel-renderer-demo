import React from "react";
import { personaRevisions } from "../experiments/scenarios.js";
import { sitePath } from "../site.js";

export function ScenarioCard({
  config,
  index,
  hostMode,
  coverage,
  personaVersion,
  hostPolicy,
  selectedHostPolicy,
  solution,
}) {
  const params = new URLSearchParams({
    scenario: config.id,
    host: hostMode,
    coverage,
  });
  const route = solution === "baseline" ? "" : "proposal";
  if (solution === "baseline") {
    params.set("personaVersion", personaVersion);
    params.set("hostPolicy", selectedHostPolicy);
  }
  const url = sitePath(`${route}?${params}`);
  const revision = solution === "baseline" ? personaRevisions[personaVersion] : null;
  const loadOrder = [
    "Host ready",
    ...config.schedule.map(
      ({ action, actor }) => `${action} ${actor === "persona" ? "Persona" : "Feedback"}`,
    ),
  ];
  return (
    <section
      className="card walkthrough"
      id={config.id}
      data-scenario-contract="source-aligned"
      data-scenario-kind={revision?.kind || "proposal"}
    >
      <h2>
        {index + 1}. {config.title}
      </h2>
      <p className="note">
        <>
          {solution === "baseline" ? (
            <>
              {revision.kind === "release"
                ? "Pinned release renderer; deployment unverified."
                : "Upstream main snapshot; consumer adoption unverified."}{" "}
              Persona: <strong>{revision.label}</strong>.
            </>
          ) : (
            <>
              Proposal configuration: markerless Persona rules with an exact prefix and distinct
              hash salt; host recognizes both integration prefixes.
            </>
          )}{" "}
          Feedback:{" "}
          <strong>{config.order.includes("feedback") ? "inspected profile" : "not mounted"}</strong>
          . Host:{" "}
          {hostPolicy === "master"
            ? "sheet-only (inspected host main)"
            : hostPolicy === "integration-prefixes"
              ? "sheet + exact integration prefixes (candidate host policy)"
              : "sheet + Feedback prefix (unmerged host proposal)"}{" "}
          filter,
          {hostMode === "extracted"
            ? " enabled by production/extraction."
            : " disabled without extraction."}
        </>
      </p>
      <ol className="load-order" aria-label="Execution schedule">
        {loadOrder.map((step, stepIndex) => (
          <li key={stepIndex}>{step}</li>
        ))}
      </ol>
      <p className="scenario-takeaway">
        <strong>What this demonstrates: </strong>
        {config.takeaway}
        {hostMode === "runtime" && (
          <>
            {" "}
            This is the extracted-host takeaway; runtime mode changes the available sheets and
            disables host filtering.
          </>
        )}
      </p>
      <iframe className="walkthrough-frame" title={config.title} src={`${url}&view=walkthrough`} />
      <details className="scenario-details">
        <summary>Technical details</summary>
        <p>
          {config.description} The proposal and host build/coverage are held constant across
          schedules. Feedback's raw styles, salt, prefix, singleton and component workload never
          change. Host ready always precedes the schedule.{" "}
          {hostMode === "runtime"
            ? "Runtime mode installs no filter."
            : "Extraction enables the selected host filter."}{" "}
          {coverage === "shared"
            ? "Shared host styles may mask missing declarations; CSSOM evidence remains independent."
            : "The minimal host supplies no button or textarea CSS."}
        </p>
        <a href={url}>Open isolated scenario with full rule evidence</a>
      </details>
    </section>
  );
}
