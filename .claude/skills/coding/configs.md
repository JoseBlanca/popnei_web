# The configuration files

The files that set up the compiler, the linter, the formatter, npm and
Vite, as the walking skeleton is to create them, with the reason of each
setting that is not the default. `SKILL.md`, beside this file, gives the
rules they enforce. The ESLint and TypeScript files below were run on 24
September 2026 against a scratch project with typescript 6.0.3,
typescript-eslint 8.70.1, eslint 10.11.0 and vite 8.3.0, and caught what
they are meant to: a `document` in `src/core`, an import of `src/ui` from
`src/core`, a type assertion, a `switch` that misses a case, a number used
as a condition, a default export. Added after that run, on the same day,
and not yet run: the patterns `coreButResult` and `worker` and the block
of `protocol.ts` in ESLint, `tsconfig.test.json`, the `include` of
`tsconfig.node.json`, and `.gitignore`.

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
    "test:coverage": "vitest run --coverage",
    "test:e2e": "npm run build && playwright test --project=chromium --project=firefox --project=webkit",
    "screens": "npm run build && playwright test --project=screens"
  }
}
```

- `private` keeps it from being published to npm by mistake.
- `engines` is Node 24, the long term support release of September 2026;
  Vite 8 needs 20.19 or 22.12 at least. The continuous integration uses
  the same major version.
- `build` does not run `tsc` first, as Vite's template does, because the
  checks of `SKILL.md` run it on their own and a build that also type
  checks hides which of the two failed.
- `test:watch`, `test:coverage`, `test:e2e` and `screens` are
  `testing.md`'s, which says what each is for and why the last two build
  first.
- `--max-warnings=0`: a warning that is allowed to stay is one nobody
  reads. Every rule is an error or off.

## TypeScript

Seven files: one with the options every part shares, one for each of the
four environments the code runs in, the core, the worker, the page and
node, one for the tests that run in node, and one that lists them. Each environment
gets only the library of globals that exists there, so the compiler
refuses a global of the wrong one: `document` in `src/core` or in the
worker, `FileReaderSync` on the page.

`tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2021",
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

- `target` and `lib` ES2021, the language of the oldest browsers the site
  supports, popnei's floor: Chrome 91, Firefox 89, Safari 16.4
  (`worker.md`). Vite rewrites newer syntax for `build.target`, but it
  adds no missing function, so `lib` is what keeps the code from calling
  one those browsers lack: `Array.prototype.at` and `Object.hasOwn`, of
  ES2022, and `toSorted` and `findLast`, of ES2023, are not there in
  Firefox 89, and a call to one would fail only in that browser. When the
  floor rises, `lib` rises with it. The floor is open for the owner
  (point 1 of "Open for the owner" in `SKILL.md`).
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
  `exactOptionalPropertyTypes`, whose reasons are in `SKILL.md`;
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
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.core.tsbuildinfo",
    "lib": ["ES2021"],
    "types": []
  },
  "include": ["src/core", "src/worker/protocol.ts"],
  "exclude": ["**/*.test.ts"]
}
```

`lib` is the language alone and `types` is empty, so core sees no
`window`, no `document`, no `setTimeout`, no `crypto` and no types of
node. If core needs one of the web's functions that are not the language,
`TextEncoder` or `crypto.subtle` for a hash (open point 1 of the
architecture), that is a decision written in the spec, and it adds that
one declaration, not the whole DOM.

`tsconfig.worker.json`, the worker, with the globals of a worker:

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.worker.tsbuildinfo",
    "lib": ["ES2021", "WebWorker"],
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
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "lib": ["ES2021", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "jsx": "react-jsx"
  },
  "include": ["src/ui", "src/charts", "src/worker/client.ts", "src/worker/start.ts", "src/worker/messages.ts"],
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
    "lib": ["ES2021", "DOM"],
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
    "lib": ["ES2021", "DOM", "DOM.Iterable"],
    "types": ["node"]
  },
  "include": ["src/core/**/*.test.ts", "src/worker/**/*.test.ts", "src/ui/**/*.test.ts"]
}
```

A test reads its reference files with `node:fs`, which the code it tests
must not, so the tests are checked apart from that code, with the types of
node and the DOM's. The code under test is still checked by its own file,
without them. A test that imports code which calls `FileReaderSync` does
not type check here; the handlers of the runner that the tests call take
bytes, not a `File` (`worker.md`). The tests of `src/charts` run under
jsdom and are checked with the page, in `tsconfig.app.json`.

`tsconfig.json`, which lists them, and which `tsc -b` and the editor read:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.core.json" },
    { "path": "./tsconfig.worker.json" },
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.test.json" }
  ]
}
```

## `eslint.config.js`

```js
// @ts-check
import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
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
// The worker may take the type of a Result from core, and nothing else.
const coreButResult = {
  group: ["**/core/**", "!**/core/result.ts"],
  message: "src/worker imports only the types of src/core/result.ts.",
};
const worker = {
  group: ["**/worker/**"],
  message: "src/charts does not import src/worker.",
};
const runner = {
  group: ["**/worker/runner*"],
  message: "The runner is loaded as the worker, not imported.",
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
  message: "Only src/worker calls popnei; elsewhere import its types.",
};

export default defineConfig(
  globalIgnores(["dist/", "coverage/", "playwright-report/", "test-results/", "screens/"]),
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
    },
  },
  {
    files: ["src/core/**/*.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        { patterns: [ui, charts, runner, client, react, drawing, popneiValues] },
      ],
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        { assertionStyle: "never" },
      ],
    },
  },
  {
    files: ["src/worker/**/*.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        { patterns: [ui, charts, coreButResult, react, drawing] },
      ],
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        { assertionStyle: "never" },
      ],
    },
  },
  {
    files: ["src/charts/**/*.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        { patterns: [ui, core, worker, react, popneiValues] },
      ],
    },
  },
  {
    // Both sides import the protocol, so it calls no popnei.
    files: ["src/worker/protocol.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        { patterns: [ui, charts, coreButResult, react, drawing, popneiValues] },
      ],
    },
  },
  {
    files: ["src/ui/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        { patterns: [runner, drawing, popneiValues] },
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
  `SKILL.md` says; `as const` is allowed by it.
- `no-restricted-imports` is typescript-eslint's version of the rule,
  which has `allowTypeImports`, so `import type` from popnei passes where
  its values do not.
- `no-restricted-imports` of the protocol's block replaces that of the
  worker's for that one file, since a later block wins for a rule; so it
  repeats the worker's patterns and adds `popneiValues`.
- `react.md` adds the rules of React and of hooks to the block of
  `src/ui`, if the owner takes `eslint-plugin-react-hooks`, which
  `docs/technology.md` does not name: open for the owner (point 2 of
  "Open for the owner" in `SKILL.md`).

## `.prettierrc.json`

```json
{}
```

Prettier's defaults: 80 columns, double quotes, semicolons, trailing
commas, which are what popnei's TypeScript package is written in. An
empty file and not no file, so that the editor knows the project uses
Prettier. Prettier 3 skips what `.gitignore` lists, so it needs no ignore
file of its own while `.gitignore` lists what it must skip. Nothing is
formatted by hand and no lint rule is about formatting, so no
`eslint-config-prettier` is needed: neither `@eslint/js` nor
typescript-eslint 8 have formatting rules in the configurations used.

## `.gitignore`

```
node_modules/
dist/
coverage/
playwright-report/
test-results/
screens/
e2e/scratch.spec.ts
```

What the tools write, the build, the reports and traces of the tests, the
pictures of `npm run screens`, and the scratch test of `testing.md`,
which is never committed. Prettier reads this file too, so it skips them.

## `vite.config.ts`

One file, with the build here and the tests in its `test` section, which
`testing.md` gives; `defineConfig` comes from `vitest/config` for that
reason, and is Vite's with the `test` field added.

```ts
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const page = (name: string): string =>
  resolve(import.meta.dirname, "pages", `${name}.html`);

export default defineConfig({
  base: "/popnei_web/",
  plugins: [react()],
  input: {
    index: page("index"),
    popgen: page("popgen"),
    gwas: page("gwas"),
  },
  // The floor, open for the owner (SKILL.md, "Open for the owner").
  build: { target: ["chrome91", "firefox89", "safari16.4"] },
  // A classic worker, which Firefox 89 runs and a module worker it does
  // not; the default, written so that nobody changes it (worker.md).
  worker: { format: "iife" },
  // test: { ... }, as testing.md gives it
});
```

- `base` is the path GitHub Pages serves a project site at,
  `https://<user>.github.io/popnei_web/`; `worker.md` says why no address
  in the code starts with `/`.
- `input` lists the three pages, one entry each, as section 4 of
  `docs/technology.md` has them. Vite 8 takes it at the top of the
  configuration; `build.rollupOptions.input` is its name before Rolldown,
  and deprecated.
- `build.target` is the browser floor, and applies to the worker's bundle
  as well: Vite rewrites any newer syntax, of our code and of the
  dependencies, for those browsers. It is the syntax half of the floor;
  `lib` in the TypeScript files is the other.
- `worker.format` and the way the worker is imported are `worker.md`'s.
- With the pages in `pages/`, as section 9 of the architecture has them,
  the build writes them to `dist/pages/`, and they are served at
  `/popnei_web/pages/popgen.html`. Whether they move to the root of the
  repository, or Vite is given `pages/` as its root, is decided on the
  walking skeleton.
- `react.md` adds the React Compiler to `plugins`, if the owner takes it:
  open for the owner (point 4 of "Open for the owner" in `SKILL.md`).

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
