// @ts-check
import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

// What a layer must not import, from the table of SKILL.md.
const ui = { group: ["**/ui/**"], message: "Only src/ui imports src/ui." };
const charts = {
  group: ["**/charts/**"],
  message: "Only src/ui imports src/charts.",
};
const core = {
  group: ["**/core/**"],
  message: "src/worker and src/charts do not import src/core.",
};
// The worker may take the type of a Result from core, and nothing else:
// no file of core but result.ts, and of result.ts only its types.
const coreButResult = {
  group: ["**/core/**", "!**/core/result.ts"],
  message: "src/worker imports only the types of src/core/result.ts.",
};
const resultValues = {
  group: ["**/core/result.ts"],
  allowTypeImports: true,
  message: "src/worker imports only the types of src/core/result.ts.",
};
const worker = {
  group: ["**/worker/**"],
  message: "src/charts does not import src/worker.",
};
const runner = {
  group: ["**/worker/runner*", "**/worker/filesRunner*"],
  message: "A runner is loaded as a worker, not imported.",
};
const individualsReader = {
  group: ["**/worker/individuals/**"],
  message: "src/core does not import the reader; the light worker runs it.",
};
const filesWasm = {
  group: ["**/crates/files/**"],
  message: "Only src/worker/filesRunner.ts calls the files wasm.",
};
const client = {
  group: ["**/worker/client*", "**/worker/messages*", "**/worker/start*"],
  message: "src/core is given the client by src/ui; it does not import it.",
};
const react = {
  group: ["react", "react-dom", "react-dom/*", "react-aria-components"],
  message: "React belongs to src/ui.",
};
const drawing = {
  group: ["d3", "d3-*", "three", "three/*"],
  message: "D3 and three.js belong to src/charts.",
};
const popneiValues = {
  group: ["popnei"],
  allowTypeImports: true,
  message:
    "Only src/worker/runner.ts calls popnei; elsewhere import its types.",
};
// A call of import() is not an import declaration, and
// no-restricted-imports does not see it: this refuses `import("popnei")`,
// which would load popnei's wasm where only a worker may.
const noPopneiImportCall = [
  "error",
  {
    selector: "ImportExpression[source.value='popnei']",
    message: "Only a worker calls popnei; import() of popnei is refused here.",
  },
];
// The probe is a page of its own, outside the layers: nothing imports it.
const probe = {
  group: ["**/probe/**"],
  message: "Nothing outside src/probe imports the probe.",
};
// The probe imports nothing of src/: its files import each other as
// "./x.ts", and any path that leaves src/probe has a ".." in it, at the
// start, "../x", or after a "./", "./../x".
const outOfProbe = {
  regex: "(^|/)\\.\\.(/|$)",
  message: "src/probe imports popnei and React, and nothing of src/.",
};
// Only the probe's worker calls popnei; its page imports popnei's types at
// most, as the pages of the applications do.
const probePopneiValues = {
  group: ["popnei"],
  allowTypeImports: true,
  message:
    "Only src/probe/probeWorker.ts calls popnei; the page imports its types.",
};

export default defineConfig(
  globalIgnores([
    "dist/",
    "playwright-report/",
    "test-results/",
    "screens/",
    "crates/",
  ]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: { parserOptions: { projectService: true } },
    linterOptions: { reportUnusedDisableDirectives: "error" },
    rules: {
      eqeqeq: "error",
      "prefer-const": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-param-reassign": ["error", { props: true }],
      "no-restricted-exports": [
        "error",
        {
          restrictDefaultExports: {
            direct: true,
            named: true,
            defaultFrom: true,
            namedFrom: true,
            namespaceFrom: true,
          },
        },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-import-type-side-effects": "error",
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "@typescript-eslint/switch-exhaustiveness-check": [
        "error",
        {
          considerDefaultExhaustiveForUnions: false,
          requireDefaultForNonUnion: true,
        },
      ],
      "@typescript-eslint/strict-boolean-expressions": [
        "error",
        { allowString: false, allowNumber: false, allowNullableObject: true },
      ],
      // The layers' blocks below replace this for their files.
      "@typescript-eslint/no-restricted-imports": [
        "error",
        { patterns: [probe] },
      ],
    },
  },
  {
    files: ["src/core/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            ui,
            charts,
            runner,
            client,
            react,
            drawing,
            popneiValues,
            filesWasm,
            individualsReader,
            probe,
          ],
        },
      ],
      "no-restricted-syntax": noPopneiImportCall,
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        { assertionStyle: "never" },
      ],
    },
  },
  {
    // Only runner.ts calls popnei, in the block after this one.
    files: ["src/worker/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            ui,
            charts,
            coreButResult,
            resultValues,
            react,
            drawing,
            popneiValues,
            filesWasm,
            probe,
          ],
        },
      ],
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        { assertionStyle: "never" },
      ],
    },
  },
  {
    // The calculation worker, the one file of the worker that calls popnei.
    files: ["src/worker/runner.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            ui,
            charts,
            coreButResult,
            resultValues,
            react,
            drawing,
            filesWasm,
            probe,
          ],
        },
      ],
    },
  },
  {
    // The light worker holds no popnei (docs/architecture.md, section 6),
    // and only its runner calls the files wasm.
    files: ["src/worker/filesRunner.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            ui,
            charts,
            coreButResult,
            resultValues,
            react,
            drawing,
            popneiValues,
            probe,
          ],
        },
      ],
    },
  },
  {
    files: ["src/worker/individuals/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            ui,
            charts,
            coreButResult,
            resultValues,
            react,
            drawing,
            popneiValues,
            filesWasm,
            probe,
          ],
        },
      ],
    },
  },
  {
    files: ["src/charts/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        { patterns: [ui, core, worker, react, popneiValues, filesWasm, probe] },
      ],
      "no-restricted-syntax": noPopneiImportCall,
    },
  },
  {
    // Both sides import the protocol, so it calls no popnei.
    files: ["src/worker/protocol.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            ui,
            charts,
            coreButResult,
            resultValues,
            react,
            drawing,
            popneiValues,
            filesWasm,
            probe,
          ],
        },
      ],
    },
  },
  {
    files: ["src/ui/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        { patterns: [runner, drawing, popneiValues, filesWasm, probe] },
      ],
      "no-restricted-syntax": noPopneiImportCall,
    },
  },
  {
    // The probe, a page of its own (docs/specs/site.md): popnei and React,
    // nothing of src/. Its messages are checked on arrival, so no
    // assertion either, as in the worker.
    files: ["src/probe/**/*.{ts,tsx}"],
    extends: [reactHooks.configs.flat.recommended],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        { patterns: [outOfProbe, drawing, filesWasm] },
      ],
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        { assertionStyle: "never" },
      ],
    },
  },
  {
    // The probe's page and its tests: every file of the probe but its
    // worker, which the block above leaves to call popnei.
    files: ["src/probe/**/*.{ts,tsx}"],
    ignores: ["src/probe/probeWorker.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        { patterns: [outOfProbe, drawing, filesWasm, probePopneiValues] },
      ],
      "no-restricted-syntax": noPopneiImportCall,
    },
  },
  {
    // The tools read their configuration from a default export.
    files: ["*.config.ts", "*.config.js"],
    rules: { "no-restricted-exports": "off" },
  },
  {
    // This file and any other JavaScript, the scripts of node among it, is
    // not in a tsconfig: the rules that need no types, and the globals of
    // node the scripts use.
    files: ["**/*.{js,mjs}"],
    extends: [js.configs.recommended, tseslint.configs.disableTypeChecked],
    languageOptions: { globals: { console: "readonly" } },
    rules: {
      eqeqeq: "error",
      "prefer-const": "error",
      "no-param-reassign": ["error", { props: true }],
    },
  },
);
