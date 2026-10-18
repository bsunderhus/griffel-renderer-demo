import { serveReproRequest } from "../../server.mjs";
import { readFile } from "node:fs/promises";
import { scenarioAliases } from "../../src/experiments/scenarios.js";

export function applicationPlugin() {
  return {
    name: "built-research-application",
    resolveId(id) {
      if (id === "virtual:research-baseline") return "\0research-baseline";
    },
    async load(id) {
      if (id !== "\0research-baseline") return;
      const baseline = process.env.BASELINE_RESULTS
        ? JSON.parse(await readFile(process.env.BASELINE_RESULTS, "utf8"))
        : null;
      return `export default ${JSON.stringify(baseline)};`;
    },
    async configureServer(server) {
      const html = (await readFile(new URL("../../dist/index.html", import.meta.url), "utf8"))
        .replace('<script src="/app.js">', '<script src="/tests/browser/instrumentation.js"></script><script src="/app.js">');
      const instrumentation = await readFile(new URL("./instrumentation.js", import.meta.url), "utf8");
      server.middlewares.use((request, response, next) => {
        const url = new URL(request.url, "http://localhost");
        if (url.pathname === "/tests/browser/instrumentation.js") {
          response.writeHead(200, { "Content-Type": "text/javascript" }).end(instrumentation);
          return;
        }
        const htmlRoute = ["/", "/docs", "/extracted", "/runtime", "/mechanisms"].includes(url.pathname);
        if (htmlRoute && !Object.hasOwn(scenarioAliases, url.searchParams.get("scenario"))) {
          response.writeHead(200, { "Content-Type": "text/html", "Cache-Control": "no-store" }).end(html);
        } else if (["/source", "/three-actors"].includes(url.pathname) || htmlRoute ||
          /^\/(?:shared\/)?(?:app|host-extracted|host-runtime|persona|feedback-raw|feedback-standard|integration)\.js$/.test(url.pathname) ||
          /^\/(?:shared\/)?griffel\.css$/.test(url.pathname)) {
          serveReproRequest(request, response).catch(next);
        } else {
          next();
        }
      });
    },
  };
}
