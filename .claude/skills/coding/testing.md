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
| `src/worker` | Vitest | node | the protocol, and the client's queue, progress, cancelling and restart against a fake worker |
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
also asserted as a literal hash, so that a change of the canonical form,
which would make every saved project file ask for its results again, is a
failing test and not a silent change. If popnei computes the fingerprint
(`docs/architecture.md`, open point 1), its literal comes from popnei and
is the one Python gives.

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
and is not needed. It is a new dependency, so it waits for the owner's
yes (see the end of this file); until then the properties are not
written, and the examples are.

A property test runs 100 cases by default. That is kept: the properties
are over small values, and a slower suite is run less often.

### src/worker: in node where it can be

The page's side of the worker, `client.ts`, is tested in node against a
fake worker, an object with the same `postMessage`, `terminate` and
handlers, which the test drives by hand. That is where the queue, the progress, the
cancelling and the restart are checked: a request sent while another runs
waits; a cancel ends the fake worker and the client makes a new one and
gives it the files again; a result whose key the project no longer gives
goes into the cache and not onto the screen. The fake worker also counts
the requests, which is how a test shows that undo brought a result back
with no calculation. `worker.md`, beside this file, lists every case of
the client and of the runner that is tested in node, and the ones left to
the browser.

The worker's side, `runner.ts`, calls the wasm package of popnei, which
has an entry for node, so the handling of a request can be tested in node
over the bytes of a reference file. What node does not have is the
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
  coverage: { provider: "v8", include: ["src/core/**", "src/worker/**"] },
},
```

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
- A float is compared with `toBeCloseTo` or a tolerance written with its
  reason, never with `toBe`, as in popnei.

The scripts in `package.json`:

| script | command | what it is for |
|---|---|---|
| `test` | `vitest run` | every Vitest test, once; the check before done |
| `test:watch` | `vitest` | for the owner at a terminal: reruns the tests of what changed on every save |
| `test:coverage` | `vitest run --coverage` | which lines of `src/core` and `src/worker` no test runs |

A session always runs `npm test`, never `npx vitest` alone, because in a
terminal plain `vitest` does not end: it waits for changes.

Coverage, with `@vitest/coverage-v8`, is a tool for finding a branch that
no test reaches, and has no threshold that fails the build. A percentage
rewards a test that runs a line without asserting anything about it, and
the rule that matters, that each test can fail, is not one a percentage
sees.

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
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, testIgnore: /screens\.spec\.ts/ },
    { name: "firefox", use: { ...devices["Desktop Firefox"] }, testIgnore: /screens\.spec\.ts/ },
    { name: "webkit", use: { ...devices["Desktop Safari"] }, testIgnore: /screens\.spec\.ts/ },
    { name: "screens", use: { ...devices["Desktop Chrome"] }, testMatch: /screens\.spec\.ts/ },
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

The scripts:

| script | command |
|---|---|
| `test:e2e` | `npm run build && playwright test --project=chromium --project=firefox --project=webkit` |
| `screens` | `npm run build && playwright test --project=screens` |

`test:e2e` builds first, so it checks the build as well, and names the
three engines so that it does not also write the screens.

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
  flaky. That is a defect to find, not a pass.

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
long enough to be cancelled, which the panel does not (open points).

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

- **check**: `npm ci`, the lint and the types of the hub, `npm test`.
- **e2e**: `npm ci`, `npx playwright install --with-deps`, which also
  installs the libraries the browsers need on Linux, and `npm run
  test:e2e`; the HTML report and `test-results/` uploaded as an artifact
  when it fails, so the traces can be read.

On a push to `main`, when both passed:

- **deploy**: `npm run build`, then `actions/configure-pages`,
  `actions/upload-pages-artifact` with `dist/`, and `actions/deploy-pages`,
  with the permissions `contents: read`, `pages: write` and `id-token:
  write`, as Vite's guide to GitHub Pages gives them.

`npm ci` installs the wasm package of popnei from its GitHub Release, by
the URL and the hash of the lockfile (`docs/technology.md`, section 5), so
the workflow needs no token and no Rust.

## New dependencies this file proposes

All are development dependencies, none reaches the site:

| package | for | owner's decision |
|---|---|---|
| `vitest` | the tests without a browser | taken, `docs/technology.md` |
| `@playwright/test` | the tests in the three browsers | taken, `docs/technology.md` |
| `jsdom` | the DOM of the tests of the plots | open for the owner |
| `@vitest/coverage-v8` | coverage, same maintainers as Vitest | open for the owner |
| `@axe-core/playwright` | the checks of accessibility, by Deque | open for the owner |
| `fast-check` | the property tests of `src/core` | open for the owner |

The four open ones are point 2 of "Open for the owner" in `SKILL.md`.

Not taken: happy-dom, `@testing-library/react` with `user-event` and
`jest-dom`, `@fast-check/vitest`, and tools of visual regression for now,
for the reasons above.

## Open points

1. How the cancel of the walking skeleton is tested in a browser: a
   dataset large enough to take several seconds, made by the fixtures
   script, or a flow that only checks the application works after a
   cancel, with the cancelling itself left to the tests of the client.
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
