import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { scenarioAliases, scenarioAliasVersions, scenarioAliasPolicies } from "./src/experiments/scenarios.js";

// Public allowlist shared by the local server and the static GitHub Pages artifact.
export const SITE_FILES = {
  "/": ["index.html", "text/html"],
  "/docs": ["index.html", "text/html"],
  "/extracted": ["index.html", "text/html"],
  "/runtime": ["index.html", "text/html"],
  "/mechanisms": ["index.html", "text/html"],
  "/app.js": ["app.js", "text/javascript"],
  "/host-extracted.js": ["host-extracted.js", "text/javascript"],
  "/host-runtime.js": ["host-runtime.js", "text/javascript"],
  "/integration.js": ["integration.js", "text/javascript"],
  "/persona.js": ["persona.js", "text/javascript"],
  "/feedback-standard.js": ["feedback-standard.js", "text/javascript"],
  "/feedback-raw.js": ["feedback-raw.js", "text/javascript"],
  "/feedback-raw-modules.json": ["feedback-raw-modules.json", "application/json"],
  "/griffel.css": ["griffel.css", "text/css"],
  "/shared/griffel.css": ["shared/griffel.css", "text/css"],
  "/shared/host-extracted.js": ["shared/host-extracted.js", "text/javascript"],
  "/shared/host-runtime.js": ["shared/host-runtime.js", "text/javascript"],
};

export async function serveReproRequest(request, response) {
  const requested = new URL(request.url, "http://localhost");
  const pathname = requested.pathname;
  const scenario = requested.searchParams.get("scenario");
  const alias = Object.hasOwn(scenarioAliases, scenario);
  if (pathname === "/source" || pathname === "/three-actors" || (pathname === "/" && alias)) {
    if (alias) {
      requested.searchParams.set("scenario", scenarioAliases[scenario]);
      if (Object.hasOwn(scenarioAliasPolicies, scenario)) {
        requested.searchParams.set("hostPolicy", scenarioAliasPolicies[scenario]);
      }
      if (Object.hasOwn(scenarioAliasVersions, scenario)) {
        requested.searchParams.set("personaVersion", scenarioAliasVersions[scenario]);
      }
    }
    response.writeHead(302, { Location: `/${requested.search}` }).end();
    return;
  }
  const file = SITE_FILES[pathname];
  if (!file) {
    response.writeHead(404).end("Not found");
    return;
  }
  try {
    const content = await readFile(new URL(`./dist/${file[0]}`, import.meta.url));
    response.writeHead(200, { "Content-Type": file[1], "Cache-Control": "no-store" });
    response.end(content);
  } catch (error) {
    console.error("Unable to serve reproduction:", error);
    response.writeHead(500).end("Run npm run build before starting the server.");
  }
}

export function createReproServer() {
  return createServer(serveReproRequest);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4173);
  createReproServer().listen(port, "127.0.0.1", () => {
    console.log(`Griffel reproduction: http://127.0.0.1:${port}`);
  });
}
