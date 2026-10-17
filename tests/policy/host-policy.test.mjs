import { installHostPolicy } from "../../src/host/policy.js";
import { expect, onTestFinished, test, vi } from "vitest";

// Test exact predicate semantics, including truthy string dataset values and prefix position.
test.each(["master", "feedback-exception", "off"])("host policy %s preserves exact insertion semantics", mode => {
  class Sheet {
    constructor(dataset, nodeName = "STYLE") { this.ownerNode = { dataset, nodeName }; this.calls = 0; }
    insertRule(rule) {
      this.calls++;
      if (rule === "invalid") throw new SyntaxError("Invalid test rule");
      return 7;
    }
  }
  const decisions = [];
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  onTestFinished(() => errors.mockRestore());
  const restore = installHostPolicy({ defaultView: { CSSStyleSheet: Sheet } }, mode,
    result => decisions.push(result));
  onTestFinished(restore);
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
    expect(sheet.insertRule(rule, 0)).toBe(blocked ? 0 : 7);
    expect(sheet.calls).toBe(blocked ? 0 : 1);
    expect(decisions.at(-1).blocked).toBe(blocked);
    expect(decisions.at(-1).inserted).toBe(!blocked);
    expect(decisions.at(-1).index).toBe(blocked ? undefined : 7);
  }
  expect(errors).toHaveBeenCalledTimes(decisions.filter(result => result.blocked).length);
  const failingSheet = new Sheet({ makeStylesBucket: "d", demoAllowRules: "true" });
  expect(() => failingSheet.insertRule("invalid", 0)).toThrow(/Invalid test rule/);
  expect(decisions.at(-1).blocked).toBe(false);
  expect(decisions.at(-1).inserted).toBe(false);
  expect(decisions.at(-1).error).toBe("Invalid test rule");
});
