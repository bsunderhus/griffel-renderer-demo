import React, { useState } from "react";
import {
  Button,
  FluentProvider,
  makeStyles,
  shorthands,
  webLightTheme,
} from "@fluentui/react-components";
import { PersonSummary } from "../shared/PersonSummary.jsx";
import { PERSONA_SCOPE } from "./renderer.js";

const useStyles = makeStyles({
  avatarInitials: {
    backgroundColor: "#d8d0ef",
  },
  accentButton: {
    backgroundColor: "#eee8f7",
    color: "#594079",
    ...shorthands.borderColor("#b7a3d1"),
  },
  heading: {
    color: "#594079",
  },
});

export function ContactCard({ ownerDocument = document }) {
  const styles = useStyles();
  const [submitted, setSubmitted] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  return (
    <FluentProvider
      theme={webLightTheme}
      targetDocument={ownerDocument}
      data-fluent-owner="persona"
      className={PERSONA_SCOPE}
    >
      <div className="fluent-card">
        <strong className={styles.heading} data-persona-heading>
          Contact details
        </strong>
        <PersonSummary
          callLabel="Call Alex (persona)"
          avatarInitialsClassName={styles.avatarInitials}
          callButtonClassName={styles.accentButton}
        />
        <p>
          Design team
          <br />
          alex.taylor@example.com
        </p>
        <div className="fluent-actions">
          <Button appearance="primary" data-fluent-primary onClick={() => setSubmitted(true)}>
            Message
          </Button>
          <Button
            id="clear-persona"
            data-fluent-secondary
            className={styles.accentButton}
            onClick={() => setProfileOpen((open) => !open)}
            aria-expanded={profileOpen}
          >
            View profile
          </Button>
        </div>
        {profileOpen && <p>Alex Taylor designs accessible collaboration experiences.</p>}
        <span role="status">{submitted ? "Message requested (local demo only)" : ""}</span>
      </div>
    </FluentProvider>
  );
}
