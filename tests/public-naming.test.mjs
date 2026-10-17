import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";

test("repository paths and content use neutral participant names", async () => {
  const deleted = new Set(execFileSync("git", ["ls-files", "--deleted", "-z"],
    { encoding: "utf8" }).split("\0"));
  const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { encoding: "utf8" }).split("\0").filter(file => file && !deleted.has(file));
  const productNames = /\b(?:te[a]ms|l[p]c|t[m]p)\b|feedback[\s_-]+s[d]k/i;
  for (const file of files) {
    expect(file, `Use neutral participant names in file paths: ${file}`).not.toMatch(productNames);
    if (/\.(?:md|m?js|jsx|json|html|css|ya?ml)$/.test(file)) {
      expect(await readFile(file, "utf8"), `Use only host, persona and feedback for participant names: ${file}`).not.toMatch(productNames);
    }
  }
});
