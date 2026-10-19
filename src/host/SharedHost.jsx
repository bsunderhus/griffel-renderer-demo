import React, { useState } from "react";
import { Button, FluentProvider, Label, Textarea, webLightTheme } from "@fluentui/react-components";
import { PersonSummary } from "../shared/PersonSummary.jsx";

export function SharedHost({ ownerDocument = document }) {
  const [submitted, setSubmitted] = useState(false);
  return <FluentProvider theme={webLightTheme} targetDocument={ownerDocument} data-fluent-owner="host">
    <div className="fluent-card">
      <strong>Host application</strong>
      <PersonSummary host callLabel="Call Alex (host)" />
      <Label htmlFor="feedback-host">Share feedback</Label>
      <Textarea id="feedback-host" placeholder="What could be better?" resize="vertical" data-fluent-textarea />
      <div className="fluent-submit">
        <Button appearance="primary" data-fluent-primary onClick={() => setSubmitted(true)}>Send feedback</Button>
      </div>
      <span role="status">{submitted ? "Feedback submitted (local demo only)" : ""}</span>
    </div>
  </FluentProvider>;
}
