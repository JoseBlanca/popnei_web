# The configuration files

The files that set up the compiler, the linter, the formatter, npm and
Vite, as the walking skeleton is to create them, with the reason of each
setting that is not the default. `SKILL.md` and `typescript.md`, beside
this file, give the rules they enforce. The ESLint and TypeScript files
below were run on 24 September 2026 against a scratch project with
typescript 6.0.3, typescript-eslint 8.70.1, eslint 10.11.0 and vite 8.3.0, and caught what
they are meant to: a `document` in `src/core`, an import of `src/ui` from
`src/core`, a type assertion, a `switch` that misses a case, a number used
as a condition, a default export. Added after that run, on the same day,
and not yet run: the patterns `coreButResult` and `worker` and the block
of `protocol.ts` in ESLint, `tsconfig.test.json`, the `include` of
`tsconfig.node.json`, `.gitignore`, and the `target` and `lib` of
ES2022 and `ES2023.Array`, with the browser floor of `vite.config.ts`
and its `worker.format`, which the owner's floor of that day brought.
Added later that day for the owner's decisions on the inputs, and not
run either: the scripts `build:files` and `test:files`, the Rust files of
the crate, the patterns `filesWasm` and the blocks of the light worker in
ESLint, and `src/worker/individuals` in `tsconfig.core.json`.

The files were then made in the repository for stage 0
(`docs/specs/site.md`), with typescript 6.0.3, typescript-eslint 8.70.1,
eslint 10.11.0, vite 8.3.0, vitest 5.0.1 and prettier 3.9.9, and the
format, the type check, the lint and the unit tests passed on them on 24
September 2026, and the build with a scratch page in place of the
probe's, which is written after them. That stage added what the
probe needs, a page of its own in `src/probe/` outside the layers: its
two TypeScript files, `tsconfig.probe.json` and
`tsconfig.probeworker.json`, and its ESLint block, which refused, in a
scratch file, an import of `src/probe/` from `src/core/` and one of
`src/core/` from `src/probe/`. It also moved the pages to the root of the
repository, added `appType: "mpa"` to Vite, `"files": []` to the
TypeScript files of the layers not yet written, and `.prettierignore`,
each with its reason below. Not run yet: the rules of the layers
themselves, on code of the layers. On 28 September 2026, when the owner
moved the reader of xlsx into a project of its own, xlsx_rs, whose wasm
package the site installs from a release (`docs/architecture.md`,
section 6), the scripts `build:files` and `test:files`, the Rust files
of the crate, its lines in `.gitignore` and in the ignores of ESLint,
and the line of `vite.config.ts` that kept cargo's output unwatched were
taken out of this file; the pattern `filesWasm` names the package
instead of the folder of the crate. The code of the repository still has
those lines of `.gitignore`, ESLint and Vite, and the comment at the head
of `.github/workflows/site.yml` that says the Rust setup comes with the
files crate, and the work package that adds xlsx_rs takes them out.

The configuration of Vitest and of Playwright is in `testing.md`.

## `.npmrc`

```
save-exact=true
engine-strict=true
```

`save-exact` writes `"vite": "8.3.0"` and not `"^8.3.0"`, so an upgrade
is a change of `package.json` someone made. `engine-strict` makes an
install on a Node older than `engines` fail instead of warn.

## `package.json`, the parts that are not dependencies

```json
{
  "name": "popnei_web",
  "private": true,
  "type": "module",
  "engines": { "node": ">=24" },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc -b",
    "lint": "eslint --max-warnings=0 .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "POPNEI_TEST_PAGES=1 npm run build && playwright test --project=chromium --project=firefox --project=webkit",
    "screens": "npm run build && playwright test --project=screens"
  }
}
```

- No script builds or tests a wasm: popnei's and xlsx_rs's come built,
  from their releases, and are tested in their own repositories
  (`docs/technology.md`, section 5).
- `private` keeps it from being published to npm by mistake.
- `engines` is Node 24, the long term support release of September 2026;
  Vite 8 needs 20.19 or 22.12 at least. The continuous integration uses
  the same major version.
- `build` does not run `tsc` first, as Vite's template does, because the
  checks of `SKILL.md` run it on their own and a build that also type
  checks hides which of the two failed.
- `test:watch`, `test:e2e` and `screens` are `testing.md`'s, which says
  what each is for and why the last two build first. There is no
  `test:coverage`: coverage is not measured for now, as the owner decided
  (`testing.md`).
- `--max-warnings=0`: a warning that is allowed to stay is one nobody
  reads. Every rule is an error or off.

## TypeScript

Nine files: one with the options every part shares, one for each of the
four environments the code runs in, the core, the worker, the page and
node, one for the tests that run in node, two for the probe, its page and
its worker, and one that lists them. Each environment
gets only the library of globals that exists there, so the compiler
refuses a global of the wrong one: `document` in `src/core` or in the
worker, `FileReaderSync` on the page.

`tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "moduleDetection": "force",
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "erasableSyntaxOnly": true,
    "skipLibCheck": true,

    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "allowUnreachableCode": false,
    "noUncheckedSideEffectImports": true
  }
}
```

- `target` ES2022 and `lib` ES2022 with `ES2023.Array`, the language of
  the oldest browsers the applications support, the floor the owner set
  on 24 September 2026: Chrome and Edge 111, Firefox 115, Safari 16.4
  (`docs/technology.md`, section 6). Every piece of syntax of ES2022, the
  class fields and their static blocks among them, is in those browsers,
  Safari 16.4 being the last to take the static blocks. Vite rewrites
  newer syntax for `build.target`, but it adds no missing function, so
  `lib` is what keeps the code from calling one those browsers lack. It
  is not the whole of ES2023: `findLast`, `toSorted` and the other
  methods of `ES2023.Array` are there from Chrome 110, Firefox 115 and
  Safari 16, but `ES2023.Collection`, a symbol as the key of a
  `WeakMap`, needs Firefox 146, and `ES2023.Intl`, the rounding options of
  `Intl.NumberFormat`, Firefox 116. What `lib` lets through and the
  floor lacks, `Intl.Segmenter` of ES2022, is listed in `typescript.md`.
  When the floor rises, `lib` rises with it.
- `moduleResolution: "bundler"`, the one for code that Vite resolves;
  `allowImportingTsExtensions` and `noEmit`, so imports name the `.ts`
  file and `tsc` only checks.
- `verbatimModuleSyntax`, `isolatedModules` and `erasableSyntaxOnly`,
  because Vite, through Oxc, removes the types of each file on its own,
  with no knowledge of the others: an import used only as a type has to
  say `import type`, or it would be kept and fail at run time, and enums,
  namespaces and parameter properties, which emit code, are refused.
  popnei's TypeScript package uses the first and the third.
- `skipLibCheck`, so that the `.d.ts` of a dependency are not checked
  against our options, which they were not written for.
- `strict`, which TypeScript 6.0 has on by default and is written anyway
  so nobody has to know the default. The rest are the checks that
  `strict` leaves out: `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes`, whose reasons are in `typescript.md`;
  `noImplicitReturns`, a function whose branches do not all return;
  `noFallthroughCasesInSwitch`; `noImplicitOverride`;
  `noPropertyAccessFromIndexSignature`, so that `record["name"]`, which may
  be absent, does not look like `object.name`, which is there;
  `noUnusedLocals` and `noUnusedParameters`; unreachable code as an
  error; and an import of a file for its side effects, a CSS file, that
  does not resolve.

`tsconfig.core.json`, the core and the protocol, with no DOM:

```json
{
  "extends": "./tsconfig.base.json",
  "files": [],
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.core.tsbuildinfo",
    "lib": ["ES2022", "ES2023.Array"],
    "types": []
  },
  "include": ["src/core", "src/worker/protocol.ts", "src/worker/individuals"],
  "exclude": ["**/*.test.ts"]
}
```

`"files": []`, here and in the files of the worker and of the page, is
there for the stages before a layer has code: `tsc -b` fails with "No
inputs were found in config file" on a file whose `include` finds
nothing, and an empty `files` list, to which `include` adds, silences
that and nothing else.

The reader of the individuals file, `src/worker/individuals/`, is here
as well as in the worker's file: it is pure, and checking it with no
globals is what keeps it so, so that its tests need nothing but node.

`lib` is the language alone and `types` is empty, so core sees no
`window`, no `document`, no `setTimeout`, no `crypto` and no types of
node. If core needs one of the web's functions that are not the language,
`TextEncoder` or `crypto.subtle` for a hash (open point 1 of the
architecture), that is a decision written in the spec, and it adds that
one declaration, not the whole DOM.

`tsconfig.worker.json`, the two workers, `runnerWorker.ts` with
`runner.ts`, and `filesRunner.ts`, among what it includes, with the
globals of a worker:

```json
{
  "extends": "./tsconfig.base.json",
  "files": [],
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.worker.tsbuildinfo",
    "lib": ["ES2022", "ES2023.Array", "WebWorker"],
    "types": []
  },
  "include": ["src/worker"],
  "exclude": ["src/worker/client.ts", "src/worker/start.ts", "**/*.test.ts"]
}
```

`client.ts` and `start.ts` run on the page, and are checked with it.
`messages.ts`, the messages that carry a `File`, is checked in both,
since both sides import it.

`tsconfig.app.json`, the page:

```json
{
  "extends": "./tsconfig.base.json",
  "files": [],
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "lib": ["ES2022", "ES2023.Array", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "jsx": "react-jsx"
  },
  "include": [
    "src/ui",
    "src/charts",
    "src/worker/client.ts",
    "src/worker/start.ts",
    "src/worker/messages.ts"
  ],
  "exclude": ["src/ui/**/*.test.ts"]
}
```

`vite/client` declares what Vite adds, the imports of CSS Modules, of
assets, of `?url` and of `?worker`, and `import.meta.env`.

`tsconfig.node.json`, the configuration files and the tests in a
browser, which run in node:

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "lib": ["ES2022", "ES2023.Array", "DOM"],
    "types": ["node", "vite/client"]
  },
  "include": ["vite.config.ts", "playwright.config.ts", "e2e"],
  "exclude": ["e2e/plots.ts"]
}
```

`DOM` is there for the functions a Playwright test passes to
`page.evaluate`, which run in the page. `vite/client`, the declarations
Vite gives for what it imports besides code, is there because
`e2e/plotsPage.ts`, the handle of the page of the tests of the plots,
names the data of the histogram, and the compiler then checks
`src/charts/plot2d.ts`, which imports its CSS, a module that only those
declarations type (added on 26 September 2026). `e2e/plots.ts`, the
script of that page, runs in the browser and is checked with the
application, in `tsconfig.app.json`.

`tsconfig.test.json`, the Vitest tests that run in node, those of
`src/core`, `src/worker` and `src/ui` (`testing.md`):

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.test.tsbuildinfo",
    "lib": ["ES2022", "ES2023.Array", "DOM", "DOM.Iterable"],
    "types": ["node", "vite/client"],
    "jsx": "react-jsx"
  },
  "include": [
    "src/core/**/*.test.ts",
    "src/worker/**/*.test.ts",
    "src/ui/**/*.test.ts",
    "src/probe/**/*.test.ts"
  ]
}
```

A test reads its reference files with `node:fs`, which the code it tests
must not, so the tests are checked apart from that code, with the types of
node and the DOM's. The code under test is still checked by its own file,
without them. A test that imports code which calls `FileReaderSync` does
not type check here; the handlers of the runner that the tests call take
bytes, not a `File` (`worker.md`). The tests of `src/charts` run under
jsdom and are checked with the page, in `tsconfig.app.json`. `jsx` is
there because a test of `src/ui` imports a module of React, such as the
test of `addFile` that imports `src/ui/files.tsx`, and TypeScript refuses
to resolve a `.tsx` file without it, whether it holds JSX or not; added
on 25 September 2026, with the first such test.
`vite/client` is there because a test of `src/ui` imports a module of
`src/charts`, whose base imports `charts.css`, a module TypeScript
resolves only with the declarations Vite gives for a CSS file; added on
27 September 2026, with the test of the words of the histograms of the
variants.

The probe of stage 0 (`docs/specs/site.md`), a page with its own worker,
is checked as the page and the worker are. `tsconfig.probe.json`, its
page:

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.probe.tsbuildinfo",
    "lib": ["ES2022", "ES2023.Array", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "jsx": "react-jsx"
  },
  "include": ["src/probe"],
  "exclude": ["src/probe/probeWorker.ts", "src/probe/**/*.test.ts"]
}
```

`tsconfig.probeworker.json`, its worker, with `vite/client` for
`import.meta.env.BASE_URL`, the base path the worker fetches the served
file under:

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.probeworker.tsbuildinfo",
    "lib": ["ES2022", "ES2023.Array", "WebWorker"],
    "types": ["vite/client"]
  },
  "include": ["src/probe/probeWorker.ts", "src/probe/messages.ts"]
}
```

`src/probe/messages.ts` is in both, since both sides import it, as
`src/worker/messages.ts` is for the applications.

`tsconfig.json`, which lists them, and which `tsc -b` and the editor read:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.core.json" },
    { "path": "./tsconfig.worker.json" },
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.test.json" },
    { "path": "./tsconfig.probe.json" },
    { "path": "./tsconfig.probeworker.json" }
  ]
}
```

## `eslint.config.js`

```js
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
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
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
```

- `strictTypeChecked` is typescript-eslint's strictest shared set, with
  the rules that read types: no `any` and no use of one, no floating
  promise, no non-null assertion `!`, no condition that is always true,
  only `Error` thrown, `@ts-expect-error` only with a description. Its
  rules may change in a minor version of typescript-eslint, which the
  exact version of `.npmrc` makes a commit of its own.
- `projectService: true` finds the `tsconfig` of each file by itself, the
  way the editor does; it is what typescript-eslint recommends since 2025.
  `tsconfigRootDir` names the folder of the repository, and `.claude/` is
  ignored, since a worktree under `.claude/worktrees/` holds a
  `tsconfig` of its own: with both roots in sight, typescript-eslint
  refused to parse any file of the main checkout, 516 errors, on 29
  September 2026.
- The rules added beyond it, and why: `switch-exhaustiveness-check`, so a
  new member of a union fails wherever it is not handled, a `default`
  included, which would otherwise swallow it;
  `strict-boolean-expressions`, so that 0 and the empty string are not
  read as "absent"; `explicit-module-boundary-types`, so exported
  signatures are written; `no-param-reassign` with `props`, a write into
  an argument, which in core is a mutation of the project;
  `consistent-type-imports`, with `verbatimModuleSyntax`;
  `no-restricted-exports`, no default export; `no-console` but for
  warnings and errors, so no debugging line is committed.
- `consistent-type-assertions` with `never` in core and in the worker, as
  `typescript.md` says; `as const` is allowed by it.
- `no-restricted-imports` is typescript-eslint's version of the rule,
  which has `allowTypeImports`, so `import type` from popnei passes where
  its values do not. The same option makes `resultValues` refuse a value
  of `src/core/result.ts` to the worker and let its types through;
  `coreButResult` refuses every other file of core, types included. One
  pattern with both groups and `allowTypeImports` would have let the
  types of all of core through.
- The worker's block has `popneiValues`, since only `runner.ts` calls
  popnei, and the block of `runner.ts` after it replaces that rule for
  that one file, since a later block wins for a rule, with the same
  patterns less `popneiValues`. The blocks of `protocol.ts`,
  `filesRunner.ts` and `src/worker/individuals/` replace it the same
  way: the first repeats the worker's patterns, the second swaps
  `filesWasm` out, since it is the one file that calls the files wasm,
  and the third keeps both out, since the reader is pure.
- The blocks of the layers match `.tsx` as well as `.ts`, so that a
  component written by mistake in `src/core` or `src/charts` is held to
  the rules of its layer and not only to the first block's.
- **The scripts of the workers.** `runner`, in the blocks of core and
  of the screens, refuses a path through `src/worker` to a runner or to
  `runnerWorker.ts`, which its `runner*` takes in. The files of
  `src/worker` import each other as `./runner.ts`, which that pattern
  does not match, so the worker's blocks have `workerScripts`, a regular
  expression on the name of the file with its extension optional, since
  the "bundler" resolution of TypeScript and Vite find `./runner` and
  `./runner.js` as well as `./runner.ts`. Three blocks change it for three
  kinds of file: `runnerWorker.ts`, the calculation worker's script,
  imports `runner.ts`, which calls popnei, as a module, and no other
  script (`scriptsButRunner`); `start.ts` loads `runnerWorker.ts` and
  `filesRunner.ts` with `?worker` and nothing else of them
  (`scriptsButAsWorkers`); and the tests of `src/worker` import
  `runner.ts`, to run it in node. Two rules of syntax close the other two
  ways popnei could reach the page: `popneiImportCall`, `import("popnei")`,
  is refused in every file of `src/worker` but `runner.ts`, as in the
  other layers; and `workerMade` and `workerLoaded`, a `new Worker` or a
  `new SharedWorker`, and an import that ends in `?worker`, are refused in
  every file but `start.ts`, so that no file makes a worker of
  `runner.ts`, or of any script, with `new Worker(new URL(...))`. The
  probe's page loads its own worker with `?worker` and makes it with
  `new ProbeWorker()`, which `workerMade` does not match. What is not
  caught: an `import()` or a `new` of a variable, and a worker made by
  another name than `Worker`; none of ours needs one.

  Changed on 25 September 2026, when the runner became two files
  (`docs/specs/worker/runner.md`, "Two files"): until then no block of
  `src/worker` refused a runner. The first change matched only a path
  that ended in `.ts`, and the review of that day showed, with `npx
  eslint --stdin --stdin-filename <file>` exiting 0, that `client.ts`
  could still import `./runner`, `filesRunner.ts` `./runner.js`, both
  `import("popnei")`, and any file `new Worker(new URL(...))`. With the
  rules above, the same day, `--stdin` refused each of these, and in
  `runnerWorker.ts` `./runnerWorker`, in `start.ts` `./runner?worker`, in
  `src/ui` `../worker/filesRunner.ts?worker` and `new Worker(new URL(...))`,
  and in the probe's page `new Worker(new URL(...))`; and it let through
  `./runner.ts` in `runnerWorker.ts` and in `runner.test.ts`,
  `./runnerWorker.ts?worker` in `start.ts`, `import("popnei")` in
  `runner.ts`, `./messages.ts` in `client.ts`, `makeRunnerWorker` of
  `start.ts` in `src/ui`, and `./probeWorker.ts?worker` with `new
  ProbeWorker()` in the probe's page.
- Core's block adds `individualsReader`: the reader is TypeScript with no
  DOM, which core could import and run on the page, where a file of
  10,000 rows would freeze it; it belongs to the light worker. From stage
  4 core imports one file of it, `columnTypes.ts`, whose `cellNumber` and
  `inferColumnTypes` give the types each column allows and the numbers of
  a continuous column that colours the PCA
  (`docs/specs/core/project.md`, `columnAllows`;
  `docs/specs/analyses/pca.md`, "The colours"): a walk of the cells of a
  table already read, kept by the read, as `individualsCheck` walks it,
  and no read of a file. Decided on 27 September 2026 with the specs of
  stage 4.
- The two blocks of the screens add `individualsFile`:
  `src/worker/individualsFile.ts` decodes the bytes of a `File` and reads
  it, and only `filesRunner.ts`, in the light worker, imports it. The
  screens may still import the reader of the text,
  `src/worker/individuals/`, for `columnWarnings`, which the Individuals
  step asks for from the table in the project. Added on 25 September
  2026, when the review of work package 8 of the walking skeleton showed,
  with `npx eslint --stdin --stdin-filename
  src/ui/steps/individuals/words.ts` exiting 0, that a screen could
  import `individualsFile.ts`; with the pattern the same command refuses
  it and still lets `columnTypes.ts` through.
- The block after core's repeats its patterns and adds `testOnly` for
  every file of core but the tests and `testSupport.ts`: the generators
  of the tests, fast-check and Vitest are development dependencies, and
  code of core that imported one would put it in the site, or fail there.
  TypeScript does not refuse it, since `tsconfig.core.json` checks
  `testSupport.ts` with the core; the lint does. Added on 24 September
  2026, when the review of the core found that nothing refused it.
- The block after the screens' does the same for every file of
  `src/ui` but its tests, which stage 2 begins to write: a screen that
  imported the generators of the tests would bring fast-check into the
  site. Added on 24 September 2026, when the review of the store found
  that only core was held to it.
- The last block covers the JavaScript, this file and the scripts of
  node such as `e2e/fixtures/make_fixtures.mjs`, with `.mjs` named, since
  a block of `**/*.js` alone left that script parsed and checked by no
  rule. It is in no tsconfig, so it has the rules of `@eslint/js` and the
  few of ours that need no types, and `console` as a global; `no-console`
  is left out, since what a script prints is its output.
- The block of `src/ui` has the rules of React and of hooks that
  `react.md` asks for, from `eslint-plugin-react-hooks`, which the owner
  took on 24 September 2026 (`docs/technology.md`, section 2); they came
  with the first screen, the entry of `popgen.html`, on 25 September
  2026. The probe's block has
  them already, since `src/probe/probe.tsx` is React.
- The probe of stage 0 (`docs/specs/site.md`) is a page of its own, not
  one of the layers, and two patterns keep it apart. `probe`, in the
  first block and in each block of a layer, which replaces the first
  block's rule for its files, forbids every file outside `src/probe/` to
  import it. `outOfProbe`, in the probe's block, forbids the probe any
  path with a `..` segment in it, which is every path out of
  `src/probe/`: a regular expression and not a glob, since the glob
  `../**` let `./../core/result.ts` through. So the probe imports
  popnei, React and its own files and nothing of `src/`. Only its worker,
  `src/probe/probeWorker.ts`, takes values of popnei, as
  `src/worker/runner.ts` does; the block after it gives the page's files
  `probePopneiValues`, which lets them import popnei's types and nothing
  else, as the owner decided on 24 September 2026, so that the probe's
  page does not load popnei's wasm any more than the applications' pages
  do. A scratch line in `src/probe/probe.tsx` that imported `version` from
  popnei failed the lint on that day, and the worker's imports passed.
  The probe's messages are checked when they arrive, as the worker's
  are, so it has no type assertion either.
- `noPopneiImportCall` refuses `import("popnei")` in `src/core`,
  `src/charts`, `src/ui`, `src/worker` but `runner.ts`, and the probe's
  page, with `workerMade` and `workerLoaded` beside it but in the probe's
  page (above). `no-restricted-imports`
  sees import declarations only, and on 24 September 2026 a scratch file
  in each of the four that loaded popnei with `await import("popnei")`
  passed the lint; with the rule each failed. A rule of syntax matches
  the text of the call, so an `import()` of a variable is not caught;
  none of ours needs one.
- `filesWasmImportCall` refuses `import("xlsx_rs")`, the files wasm,
  everywhere but `src/worker/filesRunner.ts`, which loads it only so, on
  first need; its block has `noPopneiImportCallButFiles`, and the blocks
  of `src/worker/start.ts` and of the probe, which give the rule lists of
  their own, name it in them, since a later block replaces the whole
  setting of a rule. The pattern `filesWasm` alone would have missed it,
  for the same reason. Added on
  28 September 2026, when the files wasm became a package imported by its
  name, and not yet run; the crate's `import()` of a path before it was
  not caught either.

## `.prettierrc.json`

```json
{}
```

Prettier's defaults: 80 columns, double quotes, semicolons, trailing
commas, which are what popnei's TypeScript package is written in. An
empty file and not no file, so that the editor knows the project uses
Prettier. Prettier 3 skips what `.gitignore` lists, and what
`.prettierignore` lists besides:

```
# The documents are prose wrapped by hand (the writing skill).
*.md
```

Prettier formats Markdown too, and `prettier --check` on 24 September
2026 would have rewritten 21 of the documents of `docs/` and the skills,
whose tables and lists the writing skill lays out by hand; a document is
not code whose layout a tool should own. Nothing is
formatted by hand and no lint rule is about formatting, so no
`eslint-config-prettier` is needed: neither `@eslint/js` nor
typescript-eslint 8 have formatting rules in the configurations used.

## `.gitignore`

```
node_modules/
dist/
playwright-report/
test-results/
screens/
e2e/scratch.spec.ts
.claude/worktrees/
.DS_Store
tmp/
.vitest/
coverage/
```

What the tools write, the build, the reports and traces of the tests, the
pictures of `npm run screens`, the scratch test of `testing.md`, which is
never committed; and what the repository ignored
before it had code, the worktrees of the sessions (`CLAUDE.md`), the
files macOS writes into every folder, scratch folders and what Vitest
would write. Prettier reads this file too, so it skips them.

## `vite.config.ts`

One file, with the build here and the tests in its `test` section, which
`testing.md` gives; `defineConfig` comes from `vitest/config` for that
reason, and is Vite's with the `test` field added.

```ts
import { resolve } from "node:path";
import optimizeLocales from "@react-aria/optimize-locales-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// The pages are at the root, so the build writes them to the root of dist/
// and they are served at /popnei_web/<name>.html (docs/technology.md,
// section 4).
const page = (name: string): string =>
  resolve(import.meta.dirname, `${name}.html`);

export default defineConfig({
  base: "/popnei_web/",
  // Several pages and no single-page fallback: a missing file is a 404,
  // as on GitHub Pages, and not index.html with status 200.
  appType: "mpa",
  // React Aria's words in the one language of the application; those of
  // its 33 other languages are left out of the build (docs/technology.md,
  // "React Aria Components"). The entry sets React Aria's language to it.
  plugins: [react(), optimizeLocales.vite({ locales: ["en-US"] })],
  // A page is added here with its stage: the build fails on a page that
  // does not exist.
  input: {
    index: page("index"),
    probe: page("probe"),
    popgen: page("popgen"),
    gwas: page("gwas"),
  },
  // The floor of the applications (docs/technology.md, section 6).
  build: { target: ["chrome111", "edge111", "firefox115", "safari16.4"] },
  // A module worker, so that the files wasm is a chunk of its own;
  // not the default, "iife" (worker.md).
  worker: { format: "es" },
  // test: { ... }, as testing.md gives it
});
```

- `base` is the path GitHub Pages serves a project site at,
  `https://<user>.github.io/popnei_web/`; `worker.md` says why no address
  in the code starts with `/`.
- `appType: "mpa"` tells Vite the site has several pages and no fallback
  to one. Without it, the development server and `vite preview` answer a
  missing file with `index.html` and status 200, so a wrong address for a
  wasm or a served file gives a wrong error, a failed compile or "not a
  vars file", instead of "not found"; GitHub Pages answers 404, and the
  local servers then behave as it does.
- `input` lists the pages, one entry each, as section 4 of
  `docs/technology.md` has them, with the probe of stage 0
  (`docs/specs/site.md`). The pages are HTML files at the root of the
  repository, as section 9 of the architecture has them, because the
  build writes a page where it finds it: in `pages/`, it would be served
  at `/popnei_web/pages/popgen.html`. Vite fails the build with
  "Cannot resolve entry module" when `input` names a page that does not
  exist, so a page is added to it with its stage: at stage 0 the entries
  are `index` and `probe`. Vite 8 takes `input` at the top of the
  configuration; `build.rollupOptions.input` is its name before Rolldown,
  and deprecated.
- `build.target` is the browser floor, and applies to the worker's bundle
  as well: Vite rewrites any newer syntax, of our code and of the
  dependencies, for those browsers. It is the syntax half of the floor;
  `lib` in the TypeScript files is the other. `build.cssTarget`, the
  browsers Lightning CSS writes the styles for, is not written because
  its default is `build.target`, so the CSS has the same floor. Vite's
  own default target, Chrome 111, Firefox 114 and Safari 16.4, is one
  version of Firefox below it; written out, the floor is here and not in
  a default that changes with Vite.
- `worker.format` and the way the worker is imported are `worker.md`'s.
- No React Compiler in `plugins`: the owner decided on 24 September 2026
  to leave it off for the walking skeleton (`react.md`).
- `optimizeLocales`, React Aria's plugin, which the owner took on 25
  September 2026, answers React Aria's import of the words of each
  language that is not in `locales` with an empty module, so the build
  holds React Aria's English alone: the first script of `popgen.html`
  went from 148.39 KB gzipped to 113.30 KB (`docs/technology.md`). The
  list holds the language the entry gives React Aria's `I18nProvider`,
  `en-US` (`react.md`, "Errors"), and the two change together.

## Sources

- https://www.typescriptlang.org/tsconfig/
- https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- https://typescript-eslint.io/getting-started/typed-linting/
- https://typescript-eslint.io/users/configs/
- https://typescript-eslint.io/rules/switch-exhaustiveness-check/
- https://typescript-eslint.io/rules/strict-boolean-expressions/
- https://eslint.org/docs/latest/use/configure/configuration-files
- https://vite.dev/guide/features and https://vite.dev/guide/build
- https://prettier.io/docs/options
- The template `react-ts` of `create-vite` 9.2.1, for the shape of the
  TypeScript files Vite expects.
