import assert from "node:assert/strict";
import { installHostPolicy } from "../../src/host/policy.js";

// Test exact predicate semantics, including truthy string dataset values and prefix position.
for (const mode of ["master", "feedback-exception", "off"]) {
  class Sheet {
    constructor(dataset, nodeName = "STYLE") { this.ownerNode = { dataset, nodeName }; this.calls = 0; }
    insertRule(rule) {
      this.calls++;
      if (rule === "invalid") throw new SyntaxError("Invalid test rule");
      return 7;
    }
  }
  const decisions = [];
  const errors = [];
  const originalError = console.error;
  console.error = message => errors.push(message);
  try {
    const restore = installHostPolicy({ defaultView: { CSSStyleSheet: Sheet } }, mode,
      result => decisions.push(result));
    for (const [dataset, rule, blockedByMaster, nodeName] of [
      [{ makeStylesBucket: "d" }, ".x{color:red}", true],
      [{ makeStylesBucket: "d", demoAllowRules: "true" }, ".x{color:red}", false],
      [{ makeStylesBucket: "d", demoAllowRules: "false" }, ".x{color:red}", false],
      [{ makeStylesBucket: "d", demoAllowRules: "" }, ".x{color:red}", true],
      [{}, ".x{color:red}", false],
      [{ makeStylesBucket: "d" }, "/* demo-feedback */.x{color:red}", true],
      [{ makeStylesBucket: "d" }, " /* demo-feedback */.x{color:red}", true],
      [{ makeStylesBucket: "d" }, ".x{color:red}", false, "LINK"],
    ]) {
      const sheet = new Sheet(dataset, nodeName);
      const blocked = mode !== "off" && blockedByMaster &&
        !(mode === "feedback-exception" && rule.startsWith("/* demo-feedback */"));
      assert.equal(sheet.insertRule(rule, 0), blocked ? 0 : 7);
      assert.equal(sheet.calls, blocked ? 0 : 1);
      assert.equal(decisions.at(-1).blocked, blocked);
      assert.equal(decisions.at(-1).inserted, !blocked);
      assert.equal(decisions.at(-1).index, blocked ? undefined : 7);
    }
    assert.equal(errors.length, decisions.filter(result => result.blocked).length);
    const failingSheet = new Sheet({ makeStylesBucket: "d", demoAllowRules: "true" });
    assert.throws(() => failingSheet.insertRule("invalid", 0), /Invalid test rule/);
    assert.equal(decisions.at(-1).blocked, false);
    assert.equal(decisions.at(-1).inserted, false);
    assert.equal(decisions.at(-1).error, "Invalid test rule");
    restore();
  } finally {
    console.error = originalError;
  }
}

