import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" }).split("\0").filter(Boolean);
const productNames = /\b(?:te[a]ms|l[p]c|t[m]p)\b|feedback[\s_-]+s[d]k/i;
for (const file of files) {
  assert.doesNotMatch(file, productNames, `Use neutral participant names in file paths: ${file}`);
  if (/\.(?:md|m?js|jsx|json|html|css|ya?ml)$/.test(file)) {
    assert.doesNotMatch(await readFile(file, "utf8"), productNames,
      `Use only host, persona and feedback for participant names: ${file}`);
  }
}
console.log("PASS: repository source, tests and documentation use neutral participant names.");
