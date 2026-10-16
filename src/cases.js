export const cases = [
  {
    id: "clean",
    title: "1. Clean document: approved renderer works",
    description: "No existing sheet. The renderer creates a sheet carrying its own approval attribute.",
    seed: "none", policy: "sheet", expected: { adopted: false, rules: 1, blocked: 0, attempts: 1 },
  },
  {
    id: "reuse-only",
    title: "2. Reuse without a host filter: styles still work",
    description: "An unmarked d0 sheet exists first. Griffel adopts it, but nothing blocks insertion.",
    seed: "plain", policy: "none", expected: { adopted: true, rules: 1, blocked: 0, attempts: 1 },
  },
  {
    id: "blocked",
    title: "3. Reuse + host filter: integration styles disappear",
    description: "The approved renderer adopts the unmarked sheet. The filter blocks its rule because the destination is unmarked.",
    seed: "plain", policy: "sheet", expected: { adopted: true, rules: 0, blocked: 1, attempts: 1 },
  },
  {
    id: "bypass",
    title: "4. Reverse order: an unrelated renderer gets through",
    description: "An approved renderer creates the sheet first. An unapproved renderer adopts it and its rule passes the sheet-level filter.",
    seed: "approved", policy: "sheet", foreign: true, expected: { adopted: true, rules: 1, blocked: 0, attempts: 1 },
  },
  {
    id: "salt",
    title: "5. A class-name salt does not isolate sheets",
    description: "A genuine makeStyles call uses a salted class, but the renderer still adopts the unmarked d0 sheet and insertion is blocked.",
    seed: "plain", policy: "sheet", salt: "isolated-integration", expected: { adopted: true, rules: 0, blocked: 1, attempts: 1 },
  },
  {
    id: "rule-marker",
    title: "6. A per-rule exception allows that rule",
    description: "The filter additionally permits rules prefixed with /* standalone-allowed */. The sheet is still shared.",
    seed: "plain", policy: "rule", markRule: true, expected: { adopted: true, rules: 1, blocked: 0, attempts: 1 },
  },
  {
    id: "unmarked-rule",
    title: "7. That exception does not help other rules",
    description: "Same per-rule filter, but this renderer does not prefix its rule. Its styles still disappear.",
    seed: "plain", policy: "rule", expected: { adopted: true, rules: 0, blocked: 1, attempts: 1 },
  },
  {
    id: "retry",
    title: "8. Removing the filter does not repair the cache",
    description: "After the first blocked insertion, restore native insertRule and replay the exact captured Griffel rule. Griffel skips it as already cached.",
    seed: "plain", policy: "sheet", retry: true, expected: { adopted: true, rules: 0, blocked: 1, attempts: 1 },
  },
];
