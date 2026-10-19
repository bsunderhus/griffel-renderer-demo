import React from "react";
import { Avatar, FluentProvider, webLightTheme } from "@fluentui/react-components";

export function MinimalHost({ ownerDocument = document }) {
  return (
    <FluentProvider theme={webLightTheme} targetDocument={ownerDocument} data-fluent-owner="host">
      <div className="fluent-card">
        <div className="fluent-person">
          <strong>Host application</strong>
          <span className="fluent-call">
            <Avatar
              name="Alex Taylor"
              badge={{ status: "available" }}
              data-fluent-avatar
              initials={{ "data-host-avatar": "" }}
            />
          </span>
        </div>
        <p>Integrations load below.</p>
      </div>
    </FluentProvider>
  );
}
