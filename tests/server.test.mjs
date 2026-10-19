import { once } from "node:events";
import { expect, test } from "vitest";
import { createReproServer, SITE_FILES } from "../scripts/server.mjs";

test("retired routes and bundles return 404 rather than redirecting", async ({ onTestFinished }) => {
  const server = createReproServer();
  server.listen(0, "127.0.0.1");
  onTestFinished(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  await once(server, "listening");
  const origin = `http://127.0.0.1:${server.address().port}`;
  for (const route of ["/source", "/source.html", "/three-actors", "/three-actors.html",
    "/extracted", "/runtime", "/mechanisms", "/integration.js", "/feedback-standard.js"]) {
    expect(Object.hasOwn(SITE_FILES, route)).toBe(false);
    const response = await fetch(`${origin}${route}`, { redirect: "manual" });
    expect(response.status).toBe(404);
    expect(response.headers.get("location")).toBeNull();
  }
});
