export const targets = [
  { name: "host-extracted", entry: "host/entry-minimal.jsx", extracted: true },
  { name: "host-runtime", entry: "host/entry-minimal.jsx" },
  { name: "shared/host-extracted", entry: "host/entry-shared.jsx", extracted: true },
  { name: "shared/host-runtime", entry: "host/entry-shared.jsx" },
  { name: "persona", entry: "persona/entry.jsx" },
  { name: "persona-raw", entry: "persona/entry.jsx", raw: true },
  { name: "feedback-raw", entry: "feedback/entry-raw.jsx", raw: true },
  { name: "feedback-marked", entry: "feedback/entry-marked.jsx", raw: true },
];
