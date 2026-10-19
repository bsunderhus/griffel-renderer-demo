import { resolveHostContract } from "../../src/host/contract.js";
import { installHostPolicy } from "../../src/host/policy.js";
import { expect, test } from "vitest";

test.each(["production", "development", "test"])("host contract gates extraction in %s", environment => {
  for (const extracted of [true, false]) {
    for (const policy of ["master", "feedback-exception"]) {
      const contract = resolveHostContract({ extracted, policy, contract: "production-extraction" }, environment);
      const active = environment === "production" && extracted;
      expect(contract.shouldInstall).toBe(active);
      expect(contract.renderer).toBe(active ? "noop" : "dom");
      expect(contract.effectivePolicy).toBe(active ? policy : "off");
    }
  }
});

test("production filtering cannot be disabled through the production contract", () => {
  expect(
    () => resolveHostContract({ extracted: true, contract: "production-extraction", policy: "off" }, "production"),
  ).toThrow(/Unknown host policy/);
  expect(() => resolveHostContract({ extracted: true, contract: "diagnostic" }, "production"))
    .toThrow(/Unknown host contract/);
});

test("host policy installation and sandbox disposal are idempotent", () => {
  class Sheet {
    constructor() { this.ownerNode = { nodeName: "STYLE", dataset: { makeStylesBucket: "d", demoAllowRules: "true" } }; }
    insertRule() { return 0; }
  }
  const doc = { defaultView: { CSSStyleSheet: Sheet } };
  const original = Sheet.prototype.insertRule;
  const first = installHostPolicy(doc, "master");
  const patched = Sheet.prototype.insertRule;
  const second = installHostPolicy(doc, "master");
  expect(first, "Policy installation is idempotent per document").toBe(second);
  expect(Sheet.prototype.insertRule, "Repeated installation does not stack prototype wrappers").toBe(patched);
  const attempts = [];
  const unsubscribe = first.subscribe(event => attempts.push(event));
  new Sheet().insertRule(".x{color:red}");
  expect(attempts).toHaveLength(1);
  expect(attempts[0].inserted, "Native index zero is not confused with a blocked insertion").toBe(true);
  unsubscribe();
  new Sheet().insertRule(".x{color:red}");
  expect(attempts).toHaveLength(1);
  first();
  second();
  expect(Sheet.prototype.insertRule, "Sandbox disposal is idempotent").toBe(original);
});
