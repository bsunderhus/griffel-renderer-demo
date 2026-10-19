import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default defineConfig([
  globalIgnores(["node_modules/", "dist/", "test-results/"]),
  {
    files: ["**/*.{js,jsx,mjs}"],
    extends: [js.configs.recommended],
    rules: {
      curly: ["error", "all"],
      eqeqeq: ["error", "always"],
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["*.{js,mjs}", "build/**/*.mjs", "scripts/**/*.mjs", "tests/**/*.mjs"],
    languageOptions: { globals: globals.node },
  },
  {
    files: [
      "src/**/*.{js,jsx}",
      "tests/initialization.test.mjs",
      "tests/{browser,experiments,gallery,source}/**/*.{js,mjs}",
      "tests/evidence/{assert-presented,lifecycle,lifecycle.test}.mjs",
    ],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["src/host/mount.jsx"],
    languageOptions: { globals: { process: "readonly" } },
  },
  {
    files: ["**/*.jsx"],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { "react-hooks": reactHooks },
    rules: {
      // The classic JSX transform uses React after linting the source.
      "no-unused-vars": [
        "error",
        { varsIgnorePattern: "^React$", argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
]);
