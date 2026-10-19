import React, { useState } from "react";
import { Button, FluentProvider, Label, Textarea, webLightTheme } from "@fluentui/react-components";
import { PersonSummary } from "../shared/PersonSummary.jsx";

export function FeedbackForm() {
  const [submitted, setSubmitted] = useState(false);
  return <FluentProvider theme={webLightTheme} targetDocument={document} data-fluent-owner="feedback">
    <div className="fluent-card">
      <strong>Send us feedback</strong>
      <PersonSummary callLabel="Call Alex (feedback)" />
      <Label htmlFor="feedback-feedback">Share feedback</Label>
      <Textarea id="feedback-feedback" placeholder="What could be better?" resize="vertical" data-fluent-textarea />
      <div className="fluent-actions">
        <Button appearance="primary" data-fluent-primary onClick={() => setSubmitted(true)}>Send feedback</Button>
        <Button id="clear-feedback" data-fluent-secondary
          onClick={() => setSubmitted(false)}>Clear status</Button>
      </div>
      <span role="status">{submitted ? "Feedback submitted (local demo only)" : ""}</span>
    </div>
  </FluentProvider>;
}
