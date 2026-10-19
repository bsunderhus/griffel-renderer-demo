export const targets = [
  { name: "host-extracted", entry: "host/entry-minimal.jsx", extracted: true },
  { name: "host-runtime", entry: "host/entry-minimal.jsx" },
  { name: "shared/host-extracted", entry: "host/entry-shared.jsx", extracted: true },
  { name: "shared/host-runtime", entry: "host/entry-shared.jsx" },
  { name: "persona", entry: "persona/entry.jsx" },
  { name: "feedback-standard", entry: "feedback/entry-standard.jsx" },
  { name: "feedback-raw", entry: "feedback/entry-raw.jsx", raw: true },
];
