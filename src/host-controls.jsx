import React from "react";
import { Avatar, FluentProvider, webLightTheme } from "@fluentui/react-components";

export default function HostControls({ avatarClassName }) {
  return <FluentProvider theme={webLightTheme} targetDocument={document} data-fluent-owner="host">
    <div className="fluent-card">
      <div className="fluent-person">
        <strong>Host application</strong>
        <span className="fluent-call">
          <Avatar name="Alex Taylor" badge={{ status: "available" }} data-fluent-avatar
            initials={{ className: avatarClassName, "data-host": "", "data-avatar-override": "" }} />
        </span>
      </div>
      <p>Integrations load below.</p>
    </div>
  </FluentProvider>;
}
