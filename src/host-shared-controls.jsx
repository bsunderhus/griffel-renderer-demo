import React from "react";
import { FluentControls } from "./fluent-controls.jsx";

export default function HostControls({ avatarClassName }) {
  return <FluentControls owner="host" avatarClassName={avatarClassName} />;
}
