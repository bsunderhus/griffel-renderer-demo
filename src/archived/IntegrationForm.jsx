import React, { useState } from "react";
import { Button, FluentProvider, Label, Textarea, webLightTheme } from "@fluentui/react-components";
import { PersonSummary } from "../shared/PersonSummary.jsx";

export function IntegrationForm({ avatarClassName, actionClassName }) {
  const [submitted, setSubmitted] = useState(false);
  return <FluentProvider theme={webLightTheme} targetDocument={document} data-fluent-owner="integration">
    <div className="fluent-card">
      <strong>Host application</strong>
      <PersonSummary avatarClassName={avatarClassName} callLabel="Call Alex (integration)" />
      <Label htmlFor="feedback-integration">Share feedback</Label>
      <Textarea id="feedback-integration" placeholder="What could be better?" resize="vertical" data-fluent-textarea />
      <div className="fluent-actions">
        <Button appearance="primary" data-fluent-primary onClick={() => setSubmitted(true)}>Send feedback</Button>
        <Button id="clear-integration" className={actionClassName} data-integration=""
          onClick={() => setSubmitted(false)}>Clear status</Button>
      </div>
      <span role="status">{submitted ? "Feedback submitted (local demo only)" : ""}</span>
    </div>
  </FluentProvider>;
}
