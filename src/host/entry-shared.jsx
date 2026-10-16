import { createHostModule } from "./mount.jsx";
import { SharedHost } from "./SharedHost.jsx";

window.reproHost = createHostModule(SharedHost);
