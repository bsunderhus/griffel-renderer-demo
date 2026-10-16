export function observeNativeInsertions(doc, onAttempt) {
  const proto = doc.defaultView.CSSStyleSheet.prototype;
  const original = proto.insertRule;
  proto.insertRule = function (rule, index) {
    const base = { sheet: this, rule, blocked: false, reason: "filter disabled" };
    let insertedIndex;
    try {
      insertedIndex = original.call(this, rule, index);
    } catch (error) {
      onAttempt({ ...base, inserted: false, error: error.message });
      throw error;
    }
    onAttempt({ ...base, inserted: true, index: insertedIndex });
    return insertedIndex;
  };
  return () => { proto.insertRule = original; };
}
