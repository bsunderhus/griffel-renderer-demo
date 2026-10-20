import React from "react";
import { Avatar, Button } from "@fluentui/react-components";

function CallIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 1h3l1 4-2 1a9 9 0 0 0 5 5l1-2 4 1v3c0 2-3 3-6 1C5 12 2 9 1 5 0 2 1 1 3 1Z"
      />
    </svg>
  );
}

export function PersonSummary({
  host = false,
  callLabel,
  avatarInitialsClassName,
  callButtonClassName,
}) {
  return (
    <div className="fluent-person">
      <Avatar
        name="Alex Taylor"
        badge={{ status: "available" }}
        data-fluent-avatar
        initials={{
          "data-host-avatar": host ? "" : undefined,
          className: avatarInitialsClassName,
        }}
      />
      <span>
        Alex Taylor
        <br />
        <small>Product designer</small>
      </span>
      <span className="fluent-call">
        <Button
          icon={<CallIcon />}
          aria-label={callLabel}
          className={callButtonClassName}
          data-fluent-icon
        />
      </span>
    </div>
  );
}
