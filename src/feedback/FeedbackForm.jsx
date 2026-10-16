import React, { useState } from "react";
import { Button, FluentProvider, Label, makeResetStyles, makeStyles, Textarea, webLightTheme } from "@fluentui/react-components";
import { PersonSummary } from "../shared/PersonSummary.jsx";

const useStyles = makeStyles({ probe: { width: "137px" } });
const useBase = makeResetStyles({ backgroundColor: "#e8a33d" });

export function FeedbackForm() {
  const base = useBase();
  const styles = useStyles();
  const [submitted, setSubmitted] = useState(false);
  return <FluentProvider theme={webLightTheme} targetDocument={document} data-fluent-owner="feedback">
    <div className="fluent-card">
      <strong>Send us feedback</strong>
      <PersonSummary avatarClassName={base} callLabel="Call Alex (feedback)" />
      <Label htmlFor="feedback-feedback">Share feedback</Label>
      <Textarea id="feedback-feedback" placeholder="What could be better?" resize="vertical" data-fluent-textarea />
      <div className="fluent-actions">
        <Button appearance="primary" data-fluent-primary onClick={() => setSubmitted(true)}>Send feedback</Button>
        <Button id="clear-feedback" className={styles.probe} data-actor-probe="feedback"
          onClick={() => setSubmitted(false)}>Clear status</Button>
      </div>
      <span role="status">{submitted ? "Feedback submitted (local demo only)" : ""}</span>
    </div>
  </FluentProvider>;
}
