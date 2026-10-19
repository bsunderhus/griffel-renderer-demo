import { once } from "node:events";
import { expect, test } from "vitest";
import { createReproServer } from "../server.mjs";
import { scenarioAliases, scenarioAliasVersions, scenarioAliasPolicies } from "../src/experiments/scenarios.js";

test("legacy HTTP redirects preserve status, settings and revision aliases", async ({ onTestFinished }) => {
  const server = createReproServer();
  server.listen(0, "127.0.0.1");
  onTestFinished(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  await once(server, "listening");
  const origin = `http://127.0.0.1:${server.address().port}`;
  const gallery = await fetch(`${origin}/source?host=runtime&coverage=minimal`, { redirect: "manual" });
  expect(gallery.status).toBe(302);
  expect(gallery.headers.get("location")).toBe("/?host=runtime&coverage=minimal");
  for (const [legacy, canonical] of Object.entries(scenarioAliases)) {
    const response = await fetch(
      `${origin}/source?scenario=${legacy}&host=runtime&coverage=minimal&view=walkthrough`,
      { redirect: "manual" },
    );
    expect(response.status).toBe(302);
    const expected = new URLSearchParams({ scenario: canonical, host: "runtime", coverage: "minimal", view: "walkthrough" });
    if (scenarioAliasPolicies[legacy]) expected.set("hostPolicy", scenarioAliasPolicies[legacy]);
    if (scenarioAliasVersions[legacy]) expected.set("personaVersion", scenarioAliasVersions[legacy]);
    expect(response.headers.get("location")).toBe(`/?${expected}`);
  }
});
