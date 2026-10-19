import { analyzeEvidence } from "../../src/evidence/analysis.js";
import { expect, test } from "vitest";

function result(overrides = {}) {
  return {
    policy: "master",
    events: [{
      actor: "persona", bucket: "d", creator: "persona", rule: ".probe{width:137px}",
      blocked: false, inserted: true, present: true, equivalentPresent: true, reason: "enhanced sheet", enhanced: true,
      ...overrides,
    }],
    actors: { persona: { sheets: [{ creator: "persona", sharedWith: [] }] } },
    hostEvidence: { avatarBackground: { changed: false }, foreignWrites: 0, foreignRules: [], sharedWith: [] },
  };
}
test("classification separates host blocking, native rejection, and equivalent CSS", () => {
  expect(analyzeEvidence(result()).actors.persona.tone).toBe("");
  expect(analyzeEvidence(result({ blocked: true, inserted: false, present: false, equivalentPresent: false }))
    .actors.persona.tone).toBe("missing");
  expect(analyzeEvidence(result({ inserted: false, present: false, equivalentPresent: false }))
    .actors.persona.tone, "A native parser rejection is distinct from a host block").toBe("bypass");
  expect(
    analyzeEvidence(result({ present: false })).actors.persona.tone,
    "Equivalent CSS preserves availability when the recorded native instance is removed",
  ).toBe("bypass");
  expect(analyzeEvidence(result({ present: false, equivalentPresent: false })).actors.persona.tone).toBe("missing");
});

test("borrowed permission and sharing are independent from insertion", () => {
  const borrowed = result({ creator: "feedback" });
  expect(analyzeEvidence(borrowed).actors.persona.borrowedPermission).toBe(1);
  borrowed.policy = "feedback-exception";
  borrowed.events[0].feedbackPrefix = true;
  expect(analyzeEvidence(borrowed).actors.persona.borrowedPermission).toBe(0);
  const shared = result();
  shared.actors.persona.sheets[0].sharedWith = ["feedback"];
  expect(analyzeEvidence(shared).actors.persona.tone).toBe("bypass");
});

test.each([[true, "missing"], [false, ""], [null, "bypass"]])("host change %s produces tone %s", (changed, tone) => {
  const sample = result();
  sample.hostEvidence.avatarBackground.changed = changed;
  expect(analyzeEvidence(sample).hostTone).toBe(tone);
});

test("classification does not mutate evidence", () => {
  const snapshot = result();
  const original = structuredClone(snapshot);
  analyzeEvidence(snapshot);
  expect(snapshot, "Evidence classification is pure and does not mutate snapshots").toStrictEqual(original);
});

test("cause names the host rejection, adopted destination and inapplicable prefix exception", () => {
  const sample = result({
    creator: "feedback", enhanced: false, personaScope: true, feedbackPrefix: false,
    blocked: true, inserted: false, present: false, equivalentPresent: false, reason: "blocked",
  });
  sample.policy = "feedback-exception";
  const cause = analyzeEvidence(sample).actors.persona.cause;
  expect(cause.title).toBe("Host filter blocked 1 rule");
  expect(cause.explanation).toContain("adopted from Feedback without a truthy enhanced-specificity attribute");
  expect(cause.explanation).toContain("blocked rules have no Feedback prefix");
  expect(cause.explanation).toContain("host skipped native insertion");
  expect(cause.explanation).not.toContain("browser rejected");
});

test("sheet-only cause explains why even a prefixed rule in an actor's own sheet is blocked", () => {
  const sample = result({
    enhanced: false, feedbackPrefix: true, blocked: true, inserted: false,
    present: false, equivalentPresent: false, reason: "blocked",
  });
  const cause = analyzeEvidence(sample).actors.persona.cause;
  expect(cause.explanation).toContain("created by this actor without a truthy enhanced-specificity attribute");
  expect(cause.explanation).toContain("a rule prefix cannot bypass it");
  expect(cause.explanation).not.toContain("adopted from");
});

test("partial permission does not hide rejections in a different destination", () => {
  const sample = result({ creator: "feedback" });
  sample.events.push({ ...sample.events[0], creator: "persona", enhanced: false,
    blocked: true, inserted: false, present: false, equivalentPresent: false, reason: "blocked" });
  const cause = analyzeEvidence(sample).actors.persona.cause;
  expect(cause.title).toBe("Host filter blocked 1 rule");
  expect(cause.explanation).toContain("created by this actor without a truthy enhanced-specificity attribute");
  expect(cause.explanation).toContain("shared from Feedback");
  expect(cause.explanation).toContain("borrowed permission");
});

test("browser rejection and later CSS removal are not described as host rejection", () => {
  const rejected = analyzeEvidence(result({ inserted: false, present: false, equivalentPresent: false,
    error: "Failed to parse the rule" })).actors.persona.cause;
  expect(rejected.title).toBe("Host allowed insertion; the browser rejected some rules");
  expect(rejected.explanation).toContain("not host-filter rejections");
  const removed = analyzeEvidence(result({ present: false, equivalentPresent: false })).actors.persona.cause;
  expect(removed.title).toBe("Previously inserted rules are now missing");
  expect(removed.explanation).toContain("rule removal, not blocked insertion");
  const replaced = analyzeEvidence(result({ present: false })).actors.persona.cause;
  expect(replaced.title).toBe("Insertion allowed; equivalent CSS remains");
  expect(replaced.explanation).toContain("provenance warning, not blocked insertion");
});

test("success explains independent prefix permission, disabled filtering and harmless sharing", () => {
  const prefixed = result({ creator: "feedback", enhanced: true, feedbackPrefix: true });
  prefixed.policy = "feedback-exception";
  prefixed.actors.persona.sheets[0].sharedWith = ["feedback"];
  const shared = analyzeEvidence(prefixed).actors.persona.cause;
  expect(shared.title).toBe("Insertion allowed; sheets are shared");
  expect(shared.explanation).toContain("prefix grants insertion permission");
  expect(shared.explanation).not.toContain("borrowed permission");
  expect(shared.explanation).toContain("Shared sheets alone do not mean insertion failed");
  const unfiltered = result({ reason: "filter disabled" });
  unfiltered.policy = "off";
  expect(analyzeEvidence(unfiltered).actors.persona.cause.explanation).toBe("No host insertion filter is active.");
});
