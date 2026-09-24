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
themselves, on code of the layers, and the files crate.

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
    "build:files": "cargo build --manifest-path crates/files/Cargo.toml --release --target wasm32-unknown-unknown && wasm-bindgen --target web --remove-name-section --out-dir crates/files/pkg --out-name files crates/files/target/wasm32-unknown-unknown/release/files.wasm",
    "test:files": "cargo fmt --manifest-path crates/files/Cargo.toml --check && cargo clippy --manifest-path crates/files/Cargo.toml --all-targets -- -D warnings && cargo test --manifest-path crates/files/Cargo.toml",
    "dev": "npm run build:files && vite",
    "build": "npm run build:files && vite build",
    "preview": "vite preview",
    "typecheck": "tsc -b",
    "lint": "eslint --max-warnings=0 .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "npm run build && playwright test --project=chromium --project=firefox --project=webkit",
    "screens": "npm run build && playwright test --project=screens"
  }
}
```

- `build:files` builds the files wasm from `crates/files/`
  (`docs/architecture.md`, section 6): cargo builds the crate for
  `wasm32-unknown-unknown`, and `wasm-bindgen` writes the JavaScript
  loader, its declarations and `files_bg.wasm` into `crates/files/pkg/`,
  which `filesRunner.ts` imports and git ignores. `dev` and `build` run it
  first, so the development server and the build never use a wasm older
  than the crate; cargo rebuilds nothing when nothing changed, so a second
  run costs a second or two, not measured. The output is not committed,
  and the continuous integration builds it (`testing.md`), because a
  wasm file in git is a binary that a review cannot tell was built from
  the source beside it. It is the line popnei's `js/popnei/package.json`
  builds its own wasm with, with our paths.
- `test:files` is the check of the crate: `cargo fmt --check`, clippy
  with the lints of the crate's `Cargo.toml` as errors, and `cargo test`,
  natively.
- The two scripts, and the `npm run build:files &&` of `dev` and `build`,
  are added with the crate, after the walking skeleton, which reads no
  xlsx (`docs/architecture.md`, section 10). Until then `dev` is `vite`
  and `build` is `vite build`.
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

`tsconfig.worker.json`, the two workers, `runner.ts` and `filesRunner.ts`
among what it includes, with the globals of a worker:

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
    "types": ["node"]
  },
  "include": ["vite.config.ts", "playwright.config.ts", "e2e"]
}
```

`DOM` is there for the functions a Playwright test passes to
`page.evaluate`, which run in the page.

`tsconfig.test.json`, the Vitest tests that run in node, those of
`src/core`, `src/worker` and `src/ui` (`testing.md`):

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.test.tsbuildinfo",
    "lib": ["ES2022", "ES2023.Array", "DOM", "DOM.Iterable"],
    "types": ["node"]
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
jsdom and are checked with the page, in `tsconfig.app.json`.

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
    // The tools read their configuration from a default export.
    files: ["*.config.ts", "*.config.js"],
    rules: { "no-restricted-exports": "off" },
  },
  {
    // This file and any other JavaScript is not in a tsconfig.
    files: ["**/*.js"],
    extends: [tseslint.configs.disableTypeChecked],
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
- Core's block adds `individualsReader`: the reader is TypeScript with no
  DOM, which core could import and run on the page, where a file of
  10,000 rows would freeze it; it belongs to the light worker.
- `crates/` is ignored because what is JavaScript there is what
  wasm-bindgen generated into `crates/files/pkg/`.
- `react.md` adds the rules of React and of hooks to the block of
  `src/ui`, from `eslint-plugin-react-hooks`, which the owner took on 24
  September 2026 (`docs/technology.md`, section 2). The probe's block has
  them already, since `src/probe/probe.tsx` is React.
- The probe of stage 0 (`docs/specs/site.md`) is a page of its own, not
  one of the layers, and two patterns keep it apart. `probe`, in the
  first block and in each block of a layer, which replaces the first
  block's rule for its files, forbids every file outside `src/probe/` to
  import it. `outOfProbe`, in the probe's block, forbids the probe any
  path with a `..` segment in it, which is every path out of
  `src/probe/`: a regular expression and not a glob, since the glob
  `../**` let `./../core/result.ts` through. So the probe imports popnei, React and its own files and nothing of `src/`;
  it takes values of popnei, since its worker calls popnei as
  `src/worker/runner.ts` does. The probe's messages are checked when they
  arrive, as the worker's are, so it has no type assertion either.

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
crates/files/target/
crates/files/pkg/
.claude/worktrees/
.DS_Store
tmp/
.vitest/
coverage/
```

What the tools write, the build, the reports and traces of the tests, the
pictures of `npm run screens`, the scratch test of `testing.md`, which is
never committed, and what cargo and wasm-bindgen write for the files
crate, which `build:files` makes again; and what the repository ignored
before it had code, the worktrees of the sessions (`CLAUDE.md`), the
files macOS writes into every folder, scratch folders and what Vitest
would write. Prettier reads this file too, so it skips them. `crates/files/Cargo.lock` is committed, as
`package-lock.json` is, so that every build of the crate uses the same
versions of calamine, rust_xlsxwriter, zip and what they pull in.

## The files crate: `rust-toolchain.toml` and `crates/files/Cargo.toml`

`rust-toolchain.toml`, at the root, which rustup reads from any command
run in the repository and installs what it names:

```toml
[toolchain]
channel = "1.xx.0" # the stable release current when the crate is made
targets = ["wasm32-unknown-unknown"]
components = ["rustfmt", "clippy"]
```

A pinned version and not `stable`, so that a new release of Rust, with
new lints of clippy, is a commit someone made and not what the day of the
build gave, as `save-exact` does for npm.

`crates/files/Cargo.toml`, the parts that are not the list of
dependencies:

```toml
[package]
name = "files"
edition = "2024"
publish = false

[lib]
# cdylib is the wasm file wasm-bindgen reads; rlib lets cargo test the
# plain Rust functions natively.
crate-type = ["cdylib", "rlib"]

[dependencies]
# Pinned to the command line, which refuses a crate of another version;
# the version popnei pins, so one command line builds both.
wasm-bindgen = "=0.2.128"
# calamine, rust_xlsxwriter and zip, at the versions measured in
# docs/technology.md, section 2, with exact versions.

[profile.release]
# As measured in docs/technology.md, section 2.
opt-level = 3
lto = true
codegen-units = 1

[lints.rust]
unsafe_code = "forbid"
missing_docs = "deny"

[lints.clippy]
# No panics: a panic in wasm is a trap, fatal for the light worker.
unwrap_used = "deny"
expect_used = "deny"
panic = "deny"
todo = "deny"
unimplemented = "deny"
indexing_slicing = "deny"
arithmetic_side_effects = "deny"
cast_possible_truncation = "deny"
allow_attributes_without_reason = "deny"
```

The lints are those of popnei's
`/Users/jose/devel/popnei/.claude/skills/coding/lints.toml` that apply to
code that reads and writes files, with its `clippy.toml` beside the
crate, `allow-unwrap-in-tests = true` and `allow-expect-in-tests = true`;
`SKILL.md`, "The files crate", has the rules. `lib.rs` also carries
`#![forbid(unsafe_code)]`.

## `vite.config.ts`

One file, with the build here and the tests in its `test` section, which
`testing.md` gives; `defineConfig` comes from `vitest/config` for that
reason, and is Vite's with the `test` field added.

```ts
import { resolve } from "node:path";
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
  plugins: [react()],
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
  // What cargo writes while it builds the files crate is not watched.
  server: { watch: { ignored: ["**/crates/files/target/**"] } },
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
- `server.watch.ignored` keeps the development server from watching
  `crates/files/target/`, where cargo writes thousands of files on every
  build of the crate. `crates/files/pkg/` stays watched: a `npm run
  build:files` run while the server is up rewrites it, and the server
  then reloads the light worker with the new wasm, which is what a change
  to the crate should do.
- No React Compiler in `plugins`: the owner decided on 24 September 2026
  to leave it off for the walking skeleton (`react.md`).

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
