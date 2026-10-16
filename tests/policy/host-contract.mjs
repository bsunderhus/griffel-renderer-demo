import assert from "node:assert/strict";
import { resolveHostContract } from "../../src/host/contract.js";
import { installHostPolicy } from "../../src/host/policy.js";

for (const environment of ["production", "development", "test"]) {
  for (const extracted of [true, false]) {
    for (const policy of ["master", "feedback-exception"]) {
      const contract = resolveHostContract({ extracted, policy, contract: "production-extraction" }, environment);
      const active = environment === "production" && extracted;
      assert.equal(contract.shouldInstall, active);
      assert.equal(contract.renderer, active ? "noop" : "dom");
      assert.equal(contract.effectivePolicy, active ? policy : "off");
    }
    const diagnostic = resolveHostContract({ extracted, policy: "master", contract: "diagnostic" }, environment);
    assert.equal(diagnostic.shouldInstall, true, "Forced runtime filtering is a diagnostic override, not the source contract");
    assert.equal(diagnostic.renderer, "dom");
  }
}
assert.throws(() => resolveHostContract({ extracted: true, contract: "production-extraction", policy: "off" }, "production"),
  /diagnostic contract/);
assert.equal(resolveHostContract({ extracted: true, policy: "off" }, "production").shouldInstall, false);

class Sheet {
  constructor() { this.ownerNode = { nodeName: "STYLE", dataset: { makeStylesBucket: "d", demoAllowRules: "true" } }; }
  insertRule() { return 0; }
}
const doc = { defaultView: { CSSStyleSheet: Sheet } };
const original = Sheet.prototype.insertRule;
const first = installHostPolicy(doc, "master");
const patched = Sheet.prototype.insertRule;
const second = installHostPolicy(doc, "master");
assert.equal(first, second, "Policy installation is idempotent per document");
assert.equal(Sheet.prototype.insertRule, patched, "Repeated installation does not stack prototype wrappers");
const attempts = [];
const unsubscribe = first.subscribe(event => attempts.push(event));
new Sheet().insertRule(".x{color:red}");
assert.equal(attempts.length, 1);
assert.equal(attempts[0].inserted, true, "Native index zero is not confused with a blocked insertion");
unsubscribe();
new Sheet().insertRule(".x{color:red}");
assert.equal(attempts.length, 1);
first();
second();
assert.equal(Sheet.prototype.insertRule, original, "Sandbox disposal is idempotent");
console.log("PASS: production/extraction gate, explicit diagnostic override and idempotent host policy.");
