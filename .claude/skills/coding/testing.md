# Testing

How popnei_web is tested: which kind of test covers which part of the
code, how Vitest and Playwright are set up, how a session sees the
screens it changed, and what the tests must show before the work is
called done. `SKILL.md`, beside this file, is the hub, and its list of
checks runs the commands given here. The rules of popnei's coding skill
hold here as they are written there: the test comes first and fails on
its assertion before the change, its numbers are literals from a
reference, and a check that could not be run is reported as not run.

Written in September 2026, before any code, with Vitest 5.0.1, Playwright
1.63.0, jsdom 30.1.1, @axe-core/playwright 4.13.0 and fast-check 4.10.2,
the versions `npm view <package> version` gave on 24 September 2026. It
is revised after the walking skeleton (`docs/architecture.md`, section
10), when the commands have run for real.

## Which test covers what

Most of the tests are on `src/core`, few on the screens. The reason is
where a mistake does its damage and what a test there costs. A wrong key
in `src/core` shows a stale number as current, or loses a result that
undo should bring back, and nothing on the screen looks wrong. A test of
`src/core` is a plain function called in node, runs in milliseconds, and
says exactly what broke. A test in a browser takes seconds, depends on
timing, and when it fails says only that something on the path broke.

| part | tool | environment | what it checks |
|---|---|---|---|
| `src/core` | Vitest | node | the project and its commands, the keys, undo, the cache, the project file, the script; examples and properties |
| `src/worker` | Vitest | node | the protocol, the client's queues, progress, cancelling and restart against fake workers, and the reader of CSV and TSV with the inference of the types of the columns |
| the light worker with the files wasm | Playwright | browser | an xlsx read, and from stage 6 a report written, through the real package of xlsx_rs, loaded on first need |
| `src/charts`, 2D | Vitest | jsdom | the SVG each plot function builds, its update and its removal |
| `src/charts/pca3d.ts`, the PNG export | Playwright | browser | what needs WebGL or a canvas, which jsdom does not have |
| `src/ui` | Playwright | browser | the screens, as part of the flows |
| the whole application | Playwright | Chromium, Firefox, WebKit | a few flows from start to end, the walking skeleton first, and axe on each state |

### src/core: examples, and properties

`src/core` has no DOM and no React (`docs/architecture.md`, section 9),
so its tests are like the cargo tests of popnei: build a value, call the
function, compare with a literal.

Some of what `src/core` promises holds for every project and every
sequence of commands, not for one example, and is tested as a property:
the test draws many random inputs and checks the rule on each. These are
the properties to write first:

- The key of a result is the same for two projects that differ only in a
  part its `keyInputs` leaves out, and differs when a part it names
  differs. The canonical form of the key does not depend on the order in
  which the fields of an object were written.
- For any sequence of commands, undoing all of them gives back the first
  project, and redo after undo gives back the same project. A command
  after an undo empties the redo.
- Writing a project file and reading it back gives an equal project.
- The cache never holds more than its bound, and drops first the result
  used longest ago.

A property does not replace the literals. The key of one fixed project is
also asserted as a literal hash, so that a change of the canonical form is
a failing test and a decision, and not a silent change. Such a change
breaks nothing a user keeps, since no key is saved in a file
(`docs/architecture.md`, section 12).

The properties are written with fast-check, the property-based testing
library of JavaScript, the one Hypothesis is to pytest. It draws the
inputs, and when a property fails it shrinks the input to the smallest one
that still fails and prints the seed that reproduces it. Writing the
generators by hand, with a seeded random generator of our own, would give
the random inputs and not the shrinking, and a failure on a sequence of
forty commands is hard to read. fast-check has been maintained since
2017, is used by Jest and by fp-ts among others, and depends on one small
package of its own author, pure-rand. It is a development dependency, so
nothing of it reaches the site. It is used plainly, `fc.assert(fc.property(...))`
inside a Vitest `test`; the adapter `@fast-check/vitest` is at version 0.5
and is not needed. The owner took it on 24 September 2026 (see the end
of this file).

A property test runs 100 cases by default. That is kept: the properties
are over small values, and a slower suite is run less often.

### src/worker: in node where it can be

The page's side of the two workers, `client.ts`, is tested in node
against fake workers, objects with the same `postMessage`, `terminate` and
handlers, which the test drives by hand. That is where the queue, the progress, the
cancelling and the restart are checked: a request sent while another runs
waits; a queued request whose key the project no longer gives is dropped;
a cancel ends the fake worker and the client makes a new one and gives it
the files again; a result whose key the project no longer gives
goes into the cache and not onto the screen. The fake worker also counts
the requests, which is how a test shows that undo brought a result back
with no calculation. `worker.md`, beside this file, lists every case of
the client and of the runners that is tested in node, and the ones left
to the browser.

The calculation worker's side, `runner.ts`, calls the wasm package of
popnei, which has an entry for node, so the handling of a request can be
tested in node. The tests give popnei the bytes of a fixture, a
`Uint8Array`, which its `openVcf` and `openVars` take as well as a
`File`, since popnei reads a `File` only inside a web worker, through
`FileReaderSync`; a `File` read by ranges is checked by the Playwright
flow (`docs/specs/worker/runner.md`). The reader of the
individuals file, `src/worker/individuals/`, is pure TypeScript and is
tested in node over the text of CSV and TSV files, as `worker.md` lists.
What the light worker does with the files wasm, the package of xlsx_rs,
is tested here twice: `readXlsxCells`, which makes of what the package
returns the cells or a refusal, under Vitest with an object of the test
in its place, and the real package in the worker by Playwright. How it
reads each kind of cell is tested in xlsx_rs, with `cargo test` and the
owner's files (`docs/specs/worker/files.md`). What node does not have is the
browser's `FileReaderSync`, so the reading of a user's `File` and the real
passing of messages between two threads are tested only by Playwright, in
the flows.

### src/charts: under jsdom

A plot function takes an element and the data and returns a handle
(`docs/architecture.md`, section 7). Its tests run in jsdom, a DOM, the
tree of elements a browser builds from a page, emulated in node without a
browser. The test makes a `div`, calls the function, and checks the SVG it
built: the number of bars of a histogram, the labels of the axis, the
position of a point computed from the scale and a literal. Then it calls
`update` with other data and checks the SVG again, and `destroy`, and
checks that the `div` is empty. The structure of the exported SVG is
checked here too; that its styles are inlined, with no `var(` left and
nothing that depends on the page, is checked in Playwright, because
jsdom resolves custom properties only in part (`charts.md`).

jsdom and not happy-dom, the other emulator Vitest supports. Vitest's own
documentation says happy-dom is faster and lacks some APIs, and a test
that fails because the emulator lacks something is time lost for a
suite this small; jsdom has been maintained since 2010 and is what most
DOM tests run on. Neither lays the page out: jsdom has no sizes, so
`getBBox` and the measuring of text do not work in it. A plot that sizes
itself from its text is checked in the browser, by a flow or by the
screens of this file. The 3D plot needs WebGL and the PNG export needs a
canvas, which jsdom has neither of, so both are checked by Playwright
only.

### src/ui: by Playwright, without Testing Library for now

The screens are not tested one component at a time. The logic lives in
`src/core`, and a screen reads the project and sends commands, so a test
of a component alone would check little that a flow does not. Testing
Library, `@testing-library/react`, the usual way to test React
components, runs them in jsdom, which is not a browser: the focus, the
pointer and the keyboard that React Aria handles are emulated there, and
a test can pass on a screen that does not work in a real browser. It is
also three packages more, the renderer, `user-event` and `jest-dom`.

So the screens are tested in the flows of Playwright, in the three real
engines. The rule that makes Testing Library good is kept there: an
element is found as a user finds it, by its role and its name,
`page.getByRole("button", { name: "Run" })`, `page.getByLabel("Minimum
called rate")`, and never by a CSS class or a test id. Such a locator is
itself a check of accessibility: a button that a screen reader cannot
name cannot be found by the test either.

One kind of component has a test of its own besides: an effect that
moves the focus is tested under `<StrictMode>` in jsdom, rendered with
`createRoot` of `react-dom/client` and no Testing Library, as
`src/ui/shell/focusKept.test.ts` does. In development React runs the
effects of a component just mounted twice (`react.md`, "Mounting a
plot"), and the built site, which the flows run against, runs them once.
So a focus that the second run sends elsewhere, or leaves on nothing,
fails only on the development server, where the owner tries the screens,
and no flow can see it. The plan of stage 4 met four such defects;
decided by the owner on 29 September 2026.

This is revisited after the walking skeleton. If a widget of our own
grows states that the flows reach only slowly, Vitest's browser mode,
which runs component tests in a real browser, is looked at before
Testing Library.

## Vitest

Vitest runs the tests that need no browser. It is part of the Vite world,
reads the same configuration as the build, and runs TypeScript with no
step of its own. It needs node 22.12 or later.

Its configuration is in `vite.config.ts`, in a `test` section, and not in
a file of its own. One file means the tests see the same plugins and the
same paths as the build, and the owner has one file to open. It has two
projects, as Vitest calls a group of tests with its own environment: one
in node and one in jsdom. A project written inline in the configuration
does not take the plugins and the options of the file unless it says
`extends: true`, so both say it.

```ts
// the `test` field of the defineConfig of vite.config.ts, in configs.md
test: {
  projects: [
    {
      extends: true,
      test: {
        name: "node",
        include: [
          "src/core/**/*.test.ts",
          "src/worker/**/*.test.ts",
          "src/ui/**/*.test.ts",
          "src/probe/**/*.test.ts",
        ],
        environment: "node",
      },
    },
    {
      extends: true,
      test: {
        name: "charts",
        include: ["src/charts/**/*.test.ts"],
        environment: "jsdom",
      },
    },
  ],
},
```

The project `charts` is added with jsdom, in the stage of the first
plot; until then `vite.config.ts` has the project `node` alone, whose
`include` also takes the test of the probe's messages
(`docs/specs/site.md`).

The tests of `src/ui` in node are those that need no page, such as the
test of `tokens.css` that `css.md` asks for. How the tests are type
checked is `tsconfig.test.json` of `configs.md`.

- A test file is beside the file it tests and ends in `.test.ts`:
  `src/core/keys.test.ts`. Playwright's files end in `.spec.ts` and live in
  `e2e/`. The `include` of each project names `src/` and `.test.ts`
  because Vitest by default also picks up `.spec.ts` files, and would try
  to run the Playwright tests.
- `describe`, `test` and `expect` are imported from `vitest` in each file,
  and `globals` stays off, so that a reader sees where every name comes
  from.
- The name of a test says the behaviour and its outcome, in words:
  `test("changing the missing data threshold changes the key of the diversity and not of the PCA")`.
- A float that our code computes is compared with `toBeCloseTo` or a
  tolerance written with its reason, never with `toBe`, as in popnei. A
  number of popnei that the code passes on with no arithmetic, as the
  runner passes on the results of popnei, is compared with `toBe`,
  exactly: a tolerance there would let a change of popnei's numbers pass
  unseen, which the exact comparison of the check numbers of a project
  file would then report to the user (`docs/specs/worker/runner.md`).

The scripts in `package.json`:

| script | command | what it is for |
|---|---|---|
| `test` | `vitest run` | every Vitest test, once; the check before done |
| `test:watch` | `vitest` | for the owner at a terminal: reruns the tests of what changed on every save |

A session always runs `npm test`, never `npx vitest` alone, because in a
terminal plain `vitest` does not end: it waits for changes.

Coverage is not measured for now: `@vitest/coverage-v8`, which would
measure it, is optional, and the owner left it out on 24 September 2026.
If it is taken later, it is a tool for finding a branch that no test
reaches, with no threshold that fails the build. A percentage rewards a
test that runs a line without asserting anything about it, and the rule
that matters, that each test can fail, is not one a percentage sees.

## Playwright

Playwright drives real browsers from a test written in TypeScript. It
runs Chromium, Firefox and WebKit, the engines of Chrome and Edge, of
Firefox and of Safari, which are the three `docs/technology.md` says
popnei supports. The WebKit of Playwright is built from the same engine
as Safari but is not Safari itself; a problem found only in Safari on an
iPhone is out of its reach.

### Against the built site

The flows run against the site as GitHub Pages will serve it: built by
`vite build` into `dist/`, and served by `vite preview`, a small static
server that serves `dist/` under the same base path, `/popnei_web/`, that
the site has on GitHub Pages. The development server does things the
built site does not, it serves the sources one by one and rewrites them
on the fly, so a flow that passes against it can still fail on the real
site; a missing wasm file or a path that forgot the base are the usual
cases.

```ts
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

const running = process.env.BASE_URL; // a server already running, such as `npm run dev`
const preview = "http://localhost:4173/popnei_web/";

export default defineConfig({
  testDir: "e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  failOnFlakyTests: !!process.env.CI,
  reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : "list",
  use: {
    baseURL: running ?? preview,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: running
    ? undefined
    : {
        command: "npm run preview -- --port 4173 --strictPort",
        url: preview,
        reuseExistingServer: !process.env.CI,
      },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, testIgnore: /(screens|measure)\.spec\.ts/ },
    { name: "firefox", use: { ...devices["Desktop Firefox"] }, testIgnore: /(screens|measure)\.spec\.ts/ },
    { name: "webkit", use: { ...devices["Desktop Safari"] }, testIgnore: /(screens|measure)\.spec\.ts/ },
    { name: "screens", use: { ...devices["Desktop Chrome"] }, testMatch: /screens\.spec\.ts/ },
    { name: "measure-chromium", use: { ...devices["Desktop Chrome"] }, testMatch: /measure\.spec\.ts/ },
    { name: "measure-webkit", use: { ...devices["Desktop Safari"] }, testMatch: /measure\.spec\.ts/ },
  ],
});
```

- A page is opened with a path relative to the base and with no leading
  slash, `page.goto("popgen.html#variants")`. With a leading slash,
  `"/popgen.html"`, the base path is dropped and the test opens a page
  that does not exist on GitHub Pages.
- The browsers are installed once per machine with
  `npx playwright install`, a download of several hundred MB, and again
  when Playwright is upgraded.
- A part that no screen shows yet is tested on a page of the tests,
  under `e2e/`, built only when the variable `POPNEI_TEST_PAGES` is set,
  which `test:e2e` sets, so that it runs against the built site and the
  deployed site does not carry it. The pages of the tests are built in a
  second build, which `vite.config.ts` starts once the build of the site
  has closed, with them as the only input, into `dist/e2e/` and its
  assets into `dist/e2e/assets/`: in the same build as the site's pages
  they changed how the bundler splits the code the pages share, and the
  tests ran on files that were not those deployed. So the files of
  `dist/` outside `dist/e2e/` are the same, byte for byte, with the
  variable and without it. From
  stage 3 there is one, `e2e/plots.html`, built to
  `dist/e2e/plots.html`, where the export of the plots is tested until
  stage 6 offers it on the screens (`docs/specs/charts/plot2d.md`,
  decided on 26 September 2026); from stage 4 it draws the scatter of
  the PCA and its 3D plot too, for their pointer, their export and the
  3D plot's WebGL (`docs/specs/charts/scatter.md` and `pca3d.md`). From
  stage 4 there is a second, `e2e/webgl.html`, which asks the browser
  for a WebGL 2 context with no three.js, and whose test,
  `e2e/webgl.spec.ts`, prints what the engine gave on a line that starts
  with `webgl`. A build without the variable, such as
  the one of `screens`, leaves the pages out, and their tests then fail,
  the page not found, until the next build with it.

The scripts:

| script | command |
|---|---|
| `test:e2e` | `POPNEI_TEST_PAGES=1 npm run build && playwright test --project=chromium --project=firefox --project=webkit` |
| `screens` | `npm run build && playwright test --project=screens` |

`test:e2e` builds first, so it checks the build as well, and names the
three engines so that it does not also write the screens or run the
measurements.

On the Mac of the owner, Playwright 1.63.0 cannot launch Firefox, so
`test:e2e` fails there before its first test. The same check in the
other two engines is run as

```
POPNEI_TEST_PAGES=1 npm run build && npx playwright test --project=chromium --project=webkit
```

with `-g "<tag>"` to select the tests of a deliverable, and Firefox runs
on GitHub when `main` is pushed (`docs/plans/variants-step.md`, "The
browsers").

The 3D plot of the PCA draws with WebGL 2 (`docs/specs/charts/pca3d.md`),
and Playwright runs its engines headless, with no window. What each
gave on the owner's Mac on 28 September 2026, Playwright 1.63.0 and the
built site, by `e2e/webgl.spec.ts`:

| engine | WebGL 2 | drawn by | point sizes, `ALIASED_POINT_SIZE_RANGE` | `MAX_TEXTURE_SIZE` |
|---|---|---|---|---|
| Chromium 153.0.8010.12, projects `chromium` and `screens` | given | SwiftShader, which draws on the processor, not the graphics card | 1 to 1,023 pixels | 8,192 |
| WebKit 26.6, project `webkit` | given | the Mac's graphics card, "Apple GPU" | 1 to 511 pixels | 16,384 |
| Firefox | not seen: Playwright cannot launch it on this Mac | | | |

Both engines report "WebKit WebGL" as the renderer and give the name of
what draws only through the extension `WEBGL_debug_renderer_info`. So the
tests of the 3D plot run in Chromium and WebKit here, and the 3D view is
in the screens. Chromium's headless shell draws with SwiftShader and not
with the Mac's graphics card, which a Chrome with a window uses; a
defect of the card's driver is out of its reach. On GitHub's runners,
Linux with no graphics card, no engine has been seen: the plan's
branches are never pushed, and the first push of `main` after the merge
of stage 4 shows it in the output of that test. In an engine that gives
no WebGL 2, the tests of the 3D plot are reported as not run for that
reason, and not as passed, and the test of the words of a browser with
no WebGL runs there instead.

### The measurements

`e2e/measure.spec.ts` holds the measurements of stage 2 that need a
browser, and prints a table of each, with the engine, its version and
the machine, for the report of a plan: point R, whether an engine reads a
variants file changed on the disk after the pick
(`docs/specs/worker/runner.md`, "In the browser"); the restart, on the
VCF of 80,692,954 bytes and the `.nei` file of 19,161,178 bytes (the
same spec, "What a restart costs"); the metadata file of 10,000 rows, in
Chromium alone (`docs/specs/worker/individuals.md`, "How it runs"); and
a pass over the VCF of the Stop in the middle, which sets its size. Two
projects run it, `measure-chromium` and `measure-webkit`, and no other
project does, so that `test:e2e` and CI do not:

```sh
npm run build
MEASURE_DIR=<a folder outside the repository> npx playwright test --project=measure-chromium --project=measure-webkit
```

Its two large files are made in `MEASURE_DIR`, a folder of the system's
temporary one when it is not given, when they are not there: the VCF by
popnei's `crates/popnei/benches/make_big_vcf.py` with `uv run
--no-project --with numpy python make_big_vcf.py <out.vcf> 20000`, from
popnei's checkout at `POPNEI` or beside this repository, and the `.nei`
file by `writeVars` of popnei in node. The test fails when either is not
of its size. The measurements have no bound to pass: a test fails only
when it cannot measure, as when the check by deletion of point R finds a
`File` given in memory.

The measurements of the end of stage 2 are in the same file, each
repeated `MEASURE_REPEATS` times, 5 by default, and printed as the
median and the range: the memory of the tab, in Chromium, from the
Chrome DevTools Protocol and macOS's `footprint`; the points an SVG plot
can hold, drawn on `e2e/measure/points.html`, a page that the test
serves under the site's address with `page.route`, so that it is never
built into `dist/`; and the commits of React, in Chromium, which need
React's profiling build. That build is made outside `dist/` by
`e2e/measure/vite.profiling.config.ts`, which puts
`e2e/measure/profilingRoot.ts`, a `createRoot` that draws each root in a
`<Profiler>`, in the place of `react-dom/client`; the site's build never
reads either file:

```sh
PROFILING_OUT=<folder> npx vite build --config e2e/measure/vite.profiling.config.ts
PROFILING_OUT=<folder> npx vite preview --config e2e/measure/vite.profiling.config.ts --port 4174 &
MEASURE_PROFILING=1 BASE_URL=http://localhost:4174/popnei_web/ npx playwright test --project=measure-chromium -g "commits of React"
```

The measurements of the write of stage 3, `VS5 D5`, are in the same
file: the write of the `.nei` file of 19,161,178 bytes and of one of
200,000 variants, and the largest file each engine writes, in both
engines, with the memory taken as the footprints of all the processes of
the engine, since the `Blob` is kept in another process than the page's.
They run with `--workers=1`, so that one browser runs at a time, and the
trace off, which the two projects set, since its screenshots grow
WebKit's GPU process by more than a gigabyte. Their gzipped VCFs, of
`e2e/bigVcf.ts`, up to 2 GB for 3,200,000 variants, are made in
`MEASURE_DIR` when they are not there, and every file written is read
back with pyarrow through `uv`; the largest take about 7 minutes in each
engine on the owner's Mac.

The time to write and read a project file of 10,000 individuals, and to
make the key of the diversity, is measured in node, which runs the
TypeScript of `src/core` as it is: `node e2e/measure/projectFile.ts`.

### The files of the flows

The flows open the reference files of popnei, which already have
numbers that reference programs gave for them. The walking skeleton
reads the panel of `tests/reference/stats/` of popnei, 1200 biallelic
diploid variants of 200 individuals in three populations of 48, 68 and
84, as a `.nei` file, and its populations, `panel_pops.txt`, as a CSV.

- `e2e/fixtures/` holds the files the flows open, and a script,
  `e2e/fixtures/make_fixtures.mjs`, that makes them from popnei's files
  with the wasm package in node: the VCF written as a `.nei` file, the
  populations written as a CSV. The files are committed with the version
  of popnei that made them, so that the continuous integration of the site
  does not need a checkout of popnei.
- A file is given to the page as a user gives it, through the file
  input: `page.getByLabel(...).setInputFiles("e2e/fixtures/panel.nei")`.
- A flow asserts one or two numbers of a result, as literals, taken from
  popnei's spec or reference files, or got by running pyNei and written in
  the test with how they were got. That popnei computes them right is
  popnei's to test; the literal here catches the application giving it
  the wrong input, the wrong column of the populations, the individuals
  out of order, a filter left out. The literal is written as the screen
  shows it, rounded as the screen rounds.

### Writing a flow without sleeps

- An assertion waits for what it expects: `await
  expect(page.getByRole("cell", { name: "0.3833" })).toBeVisible()`
  retries until the cell is there or the timeout passes. Playwright calls
  these web-first assertions. A fixed wait, `page.waitForTimeout(2000)`,
  is never used: it is too short on a slow machine and wastes time on a
  fast one, and it is where flaky tests come from.
- A calculation that takes longer than the default 5 seconds of an
  assertion gets its own timeout on that assertion, with the reason,
  rather than a longer timeout for every test.
- Each test starts from a fresh page, and none depends on another having
  run before it.
- What is proven in `src/core` is not proven again here. That undo brings
  the diversity back with no calculation is shown by the core tests,
  which count the requests; the flow checks that the numbers come back
  and the notice is right.
- A test that failed and passed on its retry is reported by Playwright as
  flaky. That is a defect to find, not a pass, and on CI
  `failOnFlakyTests` makes it fail the run.

When a flow fails, Playwright keeps a trace, a recording of the test with
the page at every step, its console and its network, and a screenshot.
`npx playwright show-trace test-results/<test>/trace.zip` opens it in a
browser; a session reads the error, the screenshot and the console lines
from `test-results/` instead.

### The walking skeleton, as a flow

The first flow is the walking skeleton of `docs/architecture.md` section
10, one test per sentence of it: open the panel, filter by missing data,
give the populations, see the diversity per population with the
literals; change the threshold and see the diversity go with its notice;
undo and see it come back; start a calculation and cancel it, and see the
application still work; save the project, open it again, give the file,
and see the settings restored. Cancelling needs a calculation that lasts
long enough to be cancelled: the flow `WS8 D3` of `e2e/diversity.spec.ts`
writes, into its output folder when it runs, a VCF compressed with gzip
of 200,000 variants of 1,000 individuals, 127.6 MB, made in node by
`e2e/bigVcf.ts` and never committed, over which a pass took 3.5 s in
WebKit 26.6 and 3.7 s in Chromium 153 on the owner's Mac, an Apple M5
Pro, on 25 September 2026. It presses Stop while the bar shows less than
100%, and fails, rather than passes, when the run ends before the bar is
seen below 100%, as on a machine much faster than this one; the answer
there is a larger file. Compressed, because popnei reads a plain VCF at
about 300 MB a second here, so that 3 s of it would be a file of about a
gigabyte.

### Accessibility, with axe

axe, from Deque, is the usual automatic checker of accessibility, and
`@axe-core/playwright` runs it inside a Playwright test. It finds what can
be found in the page without a person: a field with no label, a button
with no name, text whose contrast with its background is too low for a
user with poor sight, an image with no text. It does not find everything:
whether the order of the Tab key makes sense, whether a message says what
went wrong, and Playwright's documentation says so too.

A fixture, `e2e/axe.ts`, builds the checker once with the rules of WCAG
2.2 at levels A and AA, the standard of accessibility the web follows,
and each flow runs it at every state it reaches and expects no
violations. A rule is excluded only on one element and with the reason
in a comment.

## Seeing the screens

The owner cannot tell from the code whether a screen is right, and
neither can a reviewer of the code, so looking at the screen is part of
the verification.

### The screens, as pictures

`e2e/screens.spec.ts` is not a test of anything; it is a script that
takes the application through its states and writes a PNG of each into
`screens/`, which git ignores. One file per state, named for it,
`popgen-variants-empty-light.png`, `popgen-diversity-shown-dark.png`,
each state in the light and the dark theme, since the dark theme is the
same page with other colours and breaks on its own
(`page.emulateMedia({ colorScheme: "dark" })`). A session that changed a
screen runs `npm run screens`, opens the PNGs of the states it changed
and looks at them itself, and then gives the owner the paths of those
files to look at. It says what each picture should show, so the owner
knows what to check.

A state added to a screen is a state added to `screens.spec.ts`, in the
same change.

### The running application, during development

`npm run dev` starts Vite's development server at
`http://localhost:5173/popnei_web/`, which updates the page in the
browser on every save. A person at the browser uses it directly.

A session has no browser to look at, so it starts the server in the
background, waits until `curl -s -o /dev/null -w "%{http_code}"` on that
address gives 200, and runs the screens against it with no build:
`BASE_URL=http://localhost:5173/popnei_web/ npx playwright test
--project=screens`. It stops the server when it is done. For a quick
look at one state, a Playwright test of its own in `e2e/scratch.spec.ts`,
never committed, can open the page, act, and save one screenshot with
`page.screenshot({ path: "screens/scratch.png", fullPage: true })`.

For the owner at the browser, `npx playwright test --ui` shows each flow
step by step, with the page at every step, which is the easiest way to
see what a test does.

### Visual regression: later

Visual regression compares every screenshot with one approved before and
fails when a pixel changed, `expect(page).toHaveScreenshot()`. It is not
adopted in the first version, for two reasons. The screens will change on
purpose almost every day until the walking skeleton and the first
analyses stand, and every change would mean approving new pictures in
three browsers, so the test would be updated rather than read. And the
pictures differ between operating systems: Playwright's documentation
says the approved pictures must be made where the comparison runs, so
pictures made on the owner's Mac fail on the Linux of GitHub Actions, and
the usual fix is to make them in Playwright's Docker image, one more thing
to run.

It is adopted when a screen is stable and a change to it should never go
unseen, the report page and the plots first, in Chromium alone, in the
Docker image, with the pictures committed. Until then the PNGs of
`npm run screens`, looked at by the session and the owner, do its job
for the screens that changed.

## Before the work is called done

For the testing part of the hub's list:

1. The test came first and failed on its assertion before the change. For
   a screen that is a flow, or a step of one, that fails because the
   button or the number is not there yet.
2. `npm test` passes.
3. `npm run test:e2e` passes in the three engines, with axe finding
   nothing. It runs for every change to the code, not only to `src/ui`: a
   change in `src/core` reaches the screens through the store, and the
   build is checked by it as well.
4. When a screen changed, `npm run screens` was run, the session looked at
   the PNGs of the states that changed, and the owner was given their
   paths with what to look for.
5. The output of each command is reported, as in popnei. A test that
   passed only on a retry is reported as flaky. A browser that is not
   installed, or a layer that does not exist yet, is reported as not run,
   not as passed.

## Continuous integration

A sketch, to be written as a workflow in `.github/workflows/site.yml` with
the walking skeleton. On every push and pull request:

- **check**: `npm ci`, the format, the lint and the types of the hub,
  and `npm test`.
- **e2e**: `npm ci`, `npx playwright install --with-deps`,
  which also installs the libraries the browsers need on Linux, and `npm
  run test:e2e`; the HTML report and
  `test-results/` uploaded as an artifact after every run not cancelled,
  kept 14 days, so the traces can be read, those of a test that passed
  only on its retry included. It is three jobs side by side, one for
  each engine, each installing its browser alone and running
  `--project=<engine>` after the build with `POPNEI_TEST_PAGES`: the
  three engines in one job, on the two workers Playwright gives the four
  processors of GitHub's runner, did not finish in 20 minutes on 27
  September 2026, when Chromium took about 5.5 minutes, Firefox about 9
  and WebKit about 10.

On a push to `main`, when both passed:

- **deploy**: `npm run build`, then
  `actions/configure-pages`, `actions/upload-pages-artifact` with `dist/`,
  and `actions/deploy-pages`, with the permissions `contents: read`,
  `pages: write` and `id-token: write`, as Vite's guide to GitHub Pages
  gives them.

The workflow has one `concurrency` group for each branch, with
`cancel-in-progress: false`, as GitHub's starter workflow for Pages: the
runs of a branch go one at a time in the order of the pushes, so an older
run whose e2e finishes later cannot publish over a newer one. Each job
has a `timeout-minutes`, 20 for e2e and 10 for the others, so that a
browser that hangs stops the run instead of holding a runner for six
hours.

The workflow needs no Rust at any stage: the reader of xlsx, from stage
4, is the package of xlsx_rs, a project of its own, which `npm ci`
installs from its release as it installs popnei's (`docs/architecture.md`,
section 6). A Rust setup, with its cache, its toolchain and wasm-bindgen's
command line, was specified for a crate of this repository from 27 to 28
September 2026 and taken out when the owner moved the reader to xlsx_rs.

`npm ci` installs the wasm packages of popnei and, from stage 4, of
xlsx_rs from their GitHub Releases, by the URL and the hash of the
lockfile (`docs/technology.md`, section 5), so the workflow needs no
token and no checkout of either.

## The dependencies of the tests

All are development dependencies, none reaches the site. The owner
decided them on 24 September 2026, and `docs/technology.md`, section 2,
records them:

| package | for | owner's decision |
|---|---|---|
| `vitest` | the tests without a browser | taken |
| `@playwright/test` | the tests in the three browsers | taken |
| `jsdom` | the DOM of the tests of the plots | taken |
| `@axe-core/playwright` | the checks of accessibility, by Deque | taken |
| `fast-check` | the property tests of `src/core` | taken |
| `@vitest/coverage-v8` | coverage, same maintainers as Vitest | not taken for now; coverage is not measured |

Not taken: happy-dom, `@testing-library/react` with `user-event` and
`jest-dom`, `@fast-check/vitest`, and tools of visual regression for now,
for the reasons above.

## Open points

1. How the cancel of the walking skeleton is tested in a browser:
   decided by the owner on 25 September 2026, a VCF the flow writes when
   it runs, of a size that makes a pass last at least 3 s in WebKit on
   the owner's Mac (above, "The walking skeleton, as a flow").
2. The base path, `/popnei_web/`, follows from a repository of that name
   on GitHub; if the repository is named otherwise, or the site gets a
   domain of its own, the base changes here and in `vite.config.ts`.
3. The extension of popnei's vars file: `docs/functionality.md` calls it
   `.nei`, and popnei's reference file is `zstd.vars`. That file cannot be
   the fixture in any case, since popnei refuses a vars file compressed
   with zstd; `make_fixtures.mjs` writes the panel with `writeVars`.
4. Whether axe runs in all three engines or in Chromium alone, once its
   cost on the flows is measured.

## When this file is wrong

No code existed when it was written. The configuration above is to be
tried on the walking skeleton: a command that is not the right one, a
timeout that proves too short, a rule of axe that proves wrong for React
Aria, is corrected here with what showed it.

## Sources

- Vitest, projects: https://vitest.dev/guide/projects
- Vitest, test environments, jsdom and happy-dom: https://vitest.dev/guide/environment
- Vitest, migrating to 5.0: https://vitest.dev/guide/migration
- Playwright, best practices: https://playwright.dev/docs/best-practices
- Playwright, web server: https://playwright.dev/docs/test-webserver
- Playwright, visual comparisons: https://playwright.dev/docs/test-snapshots
- Playwright, accessibility testing with axe: https://playwright.dev/docs/accessibility-testing
- Playwright, continuous integration: https://playwright.dev/docs/ci-intro
- Testing Library, the priority of queries: https://testing-library.com/docs/queries/about/
- fast-check: https://fast-check.dev/docs/introduction/
- Vite, deploying a static site, GitHub Pages: https://vite.dev/guide/static-deploy
