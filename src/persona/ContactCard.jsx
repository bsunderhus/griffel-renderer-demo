import React, { useState } from "react";
import { Button, FluentProvider, webLightTheme } from "@fluentui/react-components";
import { PersonSummary } from "../shared/PersonSummary.jsx";
import { PERSONA_SCOPE } from "./renderer.js";

export function ContactCard({ ownerDocument = document }) {
  const [submitted, setSubmitted] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  return <FluentProvider theme={webLightTheme} targetDocument={ownerDocument}
    data-fluent-owner="persona" className={PERSONA_SCOPE}>
    <div className="fluent-card">
      <strong>Contact details</strong>
      <PersonSummary callLabel="Call Alex (persona)" />
      <p>Design team<br />alex.taylor@example.com</p>
      <div className="fluent-actions">
        <Button appearance="primary" data-fluent-primary onClick={() => setSubmitted(true)}>Message</Button>
        <Button id="clear-persona" data-fluent-secondary
          onClick={() => setProfileOpen(open => !open)} aria-expanded={profileOpen}>View profile</Button>
      </div>
      {profileOpen && <p>Alex Taylor designs accessible collaboration experiences.</p>}
      <span role="status">{submitted ? "Message requested (local demo only)" : ""}</span>
    </div>
  </FluentProvider>;
}
