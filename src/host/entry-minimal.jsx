import { createHostModule } from "./mount.jsx";
import { MinimalHost } from "./MinimalHost.jsx";

window.reproHost = createHostModule(MinimalHost);
