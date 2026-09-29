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
// runner* takes in runnerWorker.ts, the calculation worker's script.
const runner = {
  group: ["**/worker/runner*", "**/worker/filesRunner*"],
  message: "A worker's script is loaded as a worker, by src/worker/start.ts.",
};
// The same files as the files of src/worker import them, "./runner.ts",
// which `runner` does not match. A worker's script is loaded as a worker
// by start.ts, and runner.ts, which calls popnei, is imported by
// runnerWorker.ts alone (docs/specs/worker/runner.md, "Two files"). The
// extension is optional, since TypeScript's "bundler" resolution and Vite
// find "./runner" and "./runner.js" as well.
const workerScripts = {
  regex: "(^|/)(runner|runnerWorker|filesRunner)(\\.[jt]s)?($|\\?)",
  message:
    "A worker's script is loaded as a worker, by start.ts; only runnerWorker.ts imports runner.ts.",
};
// start.ts loads the two scripts as workers, with ?worker, and nothing else.
const scriptsButAsWorkers = {
  regex:
    "(^|/)(runner(\\.[jt]s)?($|\\?)|(runnerWorker|filesRunner)(\\.[jt]s)?$)",
  message:
    "start.ts loads runnerWorker.ts and filesRunner.ts with ?worker, and not runner.ts.",
};
// runnerWorker.ts imports runner.ts as a module, and no other script.
const scriptsButRunner = {
  regex:
    "(^|/)((runnerWorker|filesRunner)(\\.[jt]s)?($|\\?)|runner(\\.[jt]s)?\\?)",
  message:
    "runnerWorker.ts imports runner.ts as a module, and no other worker's script.",
};
// Core may import columnTypes.ts alone, its pure functions of the
// numbers and the types of a column (docs/specs/core/project.md,
// columnAllows); by its whole name, so that its tests and a file named
// like it stay out.
const individualsReader = {
  group: [
    "**/worker/individuals/**",
    "!**/worker/individuals/columnTypes.ts",
    "!**/worker/individuals/columnTypes",
  ],
  message:
    "src/core imports only columnTypes.ts of the reader; the light worker reads the file.",
};
// individualsFile.ts decodes the bytes of a File and reads it by ranges,
// for filesRunner.ts alone; the screens may still import the reader of
// the text, src/worker/individuals/, for columnWarnings.
const individualsFile = {
  group: ["**/worker/individualsFile*"],
  message: "Only src/worker/filesRunner.ts imports individualsFile.ts.",
};
// What the tests of core share, fast-check and Vitest belong to the tests.
const testOnly = {
  group: ["**/testSupport*", "fast-check", "vitest", "vitest/*"],
  message: "Only the tests import testSupport.ts, fast-check and Vitest.",
};
const filesWasm = {
  group: ["xlsx_rs", "xlsx_rs/*"],
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
const popneiImportCall = {
  selector: "ImportExpression[source.value='popnei']",
  message: "Only runner.ts calls popnei; import() of popnei is refused here.",
};
// A worker is made in src/worker/start.ts alone, from a script loaded with
// ?worker, so that no file makes one of runner.ts, or of any script, with
// new Worker(new URL(...)). The probe's page makes its own, of its own
// worker.
const workerMade = {
  selector: "NewExpression[callee.name=/^(Shared)?Worker$/]",
  message: "Only src/worker/start.ts makes a worker.",
};
const workerLoaded = {
  selector: "ImportDeclaration[source.value=/[?]worker$/]",
  message: "Only src/worker/start.ts loads a worker's script, with ?worker.",
};
// The same for the files wasm, which filesRunner.ts alone loads, and only
// with import() (worker.md, "The files wasm, on first need").
const filesWasmImportCall = {
  selector: "ImportExpression[source.value='xlsx_rs']",
  message: "Only src/worker/filesRunner.ts loads the files wasm, xlsx_rs.",
};
const noPopneiImportCall = [
  "error",
  popneiImportCall,
  filesWasmImportCall,
  workerMade,
  workerLoaded,
];
const noWorkerMade = ["error", filesWasmImportCall, workerMade, workerLoaded];
const noPopneiImportCallButFiles = [
  "error",
  popneiImportCall,
  workerMade,
  workerLoaded,
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
    ".claude/",
  ]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    linterOptions: { reportUnusedDisableDirectives: "error" },
    rules: {
      "no-restricted-syntax": noWorkerMade,
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
    // The code of core, as against its tests and what they share.
    files: ["src/core/**/*.{ts,tsx}"],
    ignores: ["src/core/**/*.test.ts", "src/core/testSupport.ts"],
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
            testOnly,
          ],
        },
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
            workerScripts,
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
    // The calculation worker, the one file of the worker that calls popnei.
    files: ["src/worker/runner.ts"],
    rules: {
      "no-restricted-syntax": noWorkerMade,
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
            workerScripts,
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
      "no-restricted-syntax": noPopneiImportCallButFiles,
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
            workerScripts,
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
            workerScripts,
          ],
        },
      ],
      // The reader takes text; individualsFile.ts decodes the bytes. The
      // compiler refuses it too, through tsconfig.core.json, with a
      // message that does not say why.
      "no-restricted-globals": [
        "error",
        {
          name: "TextDecoder",
          message:
            "The reader of the text takes text: individualsFile.ts decodes the bytes.",
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
            workerScripts,
          ],
        },
      ],
    },
  },
  {
    // The calculation worker's script, which imports runner.ts.
    files: ["src/worker/runnerWorker.ts"],
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
            scriptsButRunner,
          ],
        },
      ],
    },
  },
  {
    // The lines that make the two workers from their scripts.
    files: ["src/worker/start.ts"],
    rules: {
      "no-restricted-syntax": ["error", popneiImportCall, filesWasmImportCall],
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
            scriptsButAsWorkers,
          ],
        },
      ],
    },
  },
  {
    // The tests of the worker, which import runner.ts to run it in node.
    files: ["src/worker/**/*.test.ts"],
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
    extends: [reactHooks.configs.flat.recommended],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            runner,
            individualsFile,
            drawing,
            popneiValues,
            filesWasm,
            probe,
          ],
        },
      ],
      "no-restricted-syntax": noPopneiImportCall,
    },
  },
  {
    // The code of the screens, as against their tests.
    files: ["src/ui/**/*.{ts,tsx}"],
    ignores: ["src/ui/**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            runner,
            individualsFile,
            drawing,
            popneiValues,
            filesWasm,
            probe,
            testOnly,
          ],
        },
      ],
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
      // The page makes its worker from its own script, with ?worker.
      "no-restricted-syntax": [
        "error",
        popneiImportCall,
        filesWasmImportCall,
        workerMade,
      ],
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
