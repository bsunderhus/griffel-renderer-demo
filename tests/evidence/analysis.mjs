import assert from "node:assert/strict";
import { analyzeEvidence } from "../../src/evidence/analysis.js";

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
assert.equal(analyzeEvidence(result()).actors.persona.tone, "");
assert.equal(analyzeEvidence(result({ blocked: true, inserted: false, present: false, equivalentPresent: false }))
  .actors.persona.tone, "missing");
assert.equal(analyzeEvidence(result({ inserted: false, present: false, equivalentPresent: false }))
  .actors.persona.tone, "bypass", "A native parser rejection is distinct from a host block");
assert.equal(analyzeEvidence(result({ present: false })).actors.persona.tone, "bypass",
  "Equivalent CSS preserves availability when the recorded native instance is removed");
assert.equal(analyzeEvidence(result({ present: false, equivalentPresent: false })).actors.persona.tone, "missing");
const borrowed = result({ creator: "feedback" });
assert.equal(analyzeEvidence(borrowed).actors.persona.borrowedPermission, 1);
borrowed.policy = "feedback-exception";
borrowed.events[0].feedbackPrefix = true;
assert.equal(analyzeEvidence(borrowed).actors.persona.borrowedPermission, 0);
const shared = result();
shared.actors.persona.sheets[0].sharedWith = ["feedback"];
assert.equal(analyzeEvidence(shared).actors.persona.tone, "bypass");
for (const [changed, tone] of [[true, "missing"], [false, ""], [null, "bypass"]]) {
  const sample = result();
  sample.hostEvidence.avatarBackground.changed = changed;
  assert.equal(analyzeEvidence(sample).hostTone, tone);
}
const snapshot = result();
const original = structuredClone(snapshot);
analyzeEvidence(snapshot);
assert.deepEqual(snapshot, original, "Evidence classification is pure and does not mutate snapshots");
console.log("PASS: evidence classification independently of DOM presentation.");
