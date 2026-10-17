import { openApplication } from "../browser/application.mjs";
import { test } from "vitest";
import { assertEvidenceLifecycle } from "./lifecycle.mjs";
test("evidence refresh, CSSOM replacement, scaling, and disposal", async ({
  signal
}) => {
  const app = await openApplication({
    signal
  });
  const url = location.origin;
  await assertEvidenceLifecycle(app, url);
});
