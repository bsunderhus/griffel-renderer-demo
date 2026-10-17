import { analyzeEvidence } from "../../src/evidence/analysis.js";
import { expect, test } from "vitest";

function result(overrides = {}) {
  return {
    policy: "master",
    events: [{
      actor: "persona", bucket: "d", creator: "persona", rule: ".probe{width:137px}",
      blocked: false, inserted: true, present: true, equivalentPresent: true, reason: "enhanced sheet",
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
