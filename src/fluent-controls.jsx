import React, { useState } from "react";
import { Avatar, Button, FluentProvider, Label, Textarea, webLightTheme } from "@fluentui/react-components";

function CallIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path fill="currentColor" d="M3 1h3l1 4-2 1a9 9 0 0 0 5 5l1-2 4 1v3c0 2-3 3-6 1C5 12 2 9 1 5 0 2 1 1 3 1Z" />
  </svg>;
}

export function FluentControls({ owner, scopeClassName, avatarClassName, actionClassName }) {
  const [submitted, setSubmitted] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const persona = owner === "persona";
  return <FluentProvider theme={webLightTheme} targetDocument={document} data-fluent-owner={owner} className={scopeClassName}>
    <div className="fluent-card">
      <strong>{persona ? "Contact details" : owner === "feedback" ? "Send us feedback" : "Host application"}</strong>
      <div className="fluent-person">
        <Avatar name="Alex Taylor" badge={{ status: "available" }} data-fluent-avatar
          initials={{ className: avatarClassName, "data-host": owner === "host" ? "" : undefined,
            "data-avatar-override": avatarClassName ? "" : undefined }} />
        <span>Alex Taylor<br /><small>Product designer</small></span>
        <span className="fluent-call">
          <Button icon={<CallIcon />} aria-label={`Call Alex (${owner})`} data-fluent-icon />
        </span>
      </div>
      {persona ? <p>Design team<br />alex.taylor@example.com</p> : <>
        <Label htmlFor={`feedback-${owner}`}>Share feedback</Label>
        <Textarea id={`feedback-${owner}`} placeholder="What could be better?" resize="vertical" data-fluent-textarea />
      </>}
      <div className={actionClassName ? "fluent-actions" : "fluent-submit"}>
        <Button appearance="primary" data-fluent-primary onClick={() => setSubmitted(true)}>
          {persona ? "Message" : "Send feedback"}
        </Button>
        {actionClassName && <Button id={`clear-${owner}`} className={actionClassName} data-actor-probe={
          owner === "persona" || owner === "feedback" ? owner : undefined}
          data-integration={owner === "integration" ? "" : undefined}
          onClick={() => persona ? setProfileOpen(open => !open) : setSubmitted(false)}
          aria-expanded={persona ? profileOpen : undefined}>
          {persona ? "View profile" : "Clear status"}
        </Button>}
      </div>
      {persona && profileOpen && <p>Alex Taylor designs accessible collaboration experiences.</p>}
      <span role="status">{submitted ? persona ? "Message requested (local demo only)" : "Feedback submitted (local demo only)" : ""}</span>
    </div>
  </FluentProvider>;
}
