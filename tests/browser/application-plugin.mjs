import { serveReproRequest } from "../../server.mjs";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { scenarioAliases } from "../../src/experiments/scenarios.js";

export const PAGES_PREVIEW = "/pages-preview";

const pagesTypes = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };

function injectInstrumentation(html) {
  return html.replace('<script src="app.js">', '<script src="/tests/browser/instrumentation.js"></script><script src="app.js">');
}

// Mimics GitHub Pages on the static artifact: "/" serves index.html and an
// extensionless path serves the matching .html file. Anything else is a 404.
async function servePagesPreview(pathname, response) {
  const file = pathname.endsWith("/") ? `${pathname}index.html` : extname(pathname) ? pathname : `${pathname}.html`;
  let content;
  try {
    content = await readFile(new URL(`../../dist/pages${file}`, import.meta.url));
  } catch {
    response.writeHead(404).end("Not found");
    return;
  }
  const type = pagesTypes[extname(file)] || "application/octet-stream";
  response.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
  response.end(type === "text/html" ? injectInstrumentation(content.toString("utf8")) : content);
}

export function applicationPlugin() {
  return {
    name: "built-research-application",
    async configureServer(server) {
      const html = injectInstrumentation(await readFile(new URL("../../dist/index.html", import.meta.url), "utf8"));
      const instrumentation = await readFile(new URL("./instrumentation.js", import.meta.url), "utf8");
      server.middlewares.use((request, response, next) => {
        const url = new URL(request.url, "http://localhost");
        if (url.pathname === "/tests/browser/instrumentation.js") {
          response.writeHead(200, { "Content-Type": "text/javascript" }).end(instrumentation);
          return;
        }
        if (url.pathname.startsWith(`${PAGES_PREVIEW}/`)) {
          servePagesPreview(url.pathname.slice(PAGES_PREVIEW.length), response).catch(next);
          return;
        }
        const htmlRoute = ["/", "/docs"].includes(url.pathname);
        if (htmlRoute && !Object.hasOwn(scenarioAliases, url.searchParams.get("scenario"))) {
          response.writeHead(200, { "Content-Type": "text/html", "Cache-Control": "no-store" }).end(html);
        } else if (["/source", "/three-actors"].includes(url.pathname) || htmlRoute ||
          /^\/(?:shared\/)?(?:app|host-extracted|host-runtime|persona|feedback-raw|feedback-standard)\.js$/.test(url.pathname) ||
          /^\/(?:shared\/)?griffel\.css$/.test(url.pathname)) {
          serveReproRequest(request, response).catch(next);
        } else {
          next();
        }
      });
    },
  };
}
