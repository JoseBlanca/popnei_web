# Plan: the site stands up, and popnei runs in it

24 September 2026, approved by the owner on 24 September 2026, under way on
the branch `plan/site` since 24 September 2026. It builds stage 0 of
`docs/build-order.md` from one spec, `docs/specs/site.md`, approved by the
owner on 24 September 2026. It is carried out as the `following-plans`
skill says, on the branch `plan/site`, with its report in
`docs/plans/site.report.md`.

## In and out

In: the repository set up, the checks of the `coding` skill that exist at
this stage, the probe page with its worker and its fixtures, the
end-to-end test in three engines, the workflow that checks, tests and
deploys, and the probe run on the deployed site.

Out, with where it goes: the protocol, client and runners of the two
workers (stage 2); the files crate and Rust in the workflow (stage 4);
the design tokens, the widgets and the shell (stage 2); jsdom, fast-check,
D3 and three.js (the stages that first use them). The open points of the
spec are both settled: the repository is `JoseBlanca/popnei_web`, and
popnei's first release is made by hand (below).

## Before the first task

The configuration files and test patterns the tasks copy are in
`.claude/skills/coding/configs.md` and `.claude/skills/coding/testing.md`,
named `configs.md` and `testing.md` below.

- **node 24 or later.** This machine has node 26.8.2 and npm 11.19.1,
  checked on 24 September 2026; the workflow uses node 24.
- **A release of popnei's wasm package.** Committed code depends on
  popnei only through the URL of a release (`CLAUDE.md`,
  `.claude/skills/coding/SKILL.md`), so the release is made before task
  1.1 installs the dependencies, in popnei's repository, as open point 2
  of the spec says: `npm run build` and `npm pack` in `js/popnei`, and the
  `.tgz` attached to a pre-release tagged `js-v0.1.0-dev.1` of
  `JoseBlanca/popnei`. The owner makes it, or orders a session to; it is
  task 0.1, the first box of the plan.
- **The checks of the `coding` skill at this stage.** `format:check`,
  `typecheck`, `lint`, `test`, `build` and `test:e2e` come into being in
  work package 1 and 2; `test:files` and `build:files` are reported as not
  there, since the files crate comes with stage 4; `npm pkg get
  dependencies.popnei` has to print the URL of the release. None of them
  exists on the commit the plan starts from, which has no `package.json`,
  so each fails there.

## 0. The release of popnei

- [x] 0.1 The orchestrator checks that the release exists: in a scratch
  folder, `npm install
  https://github.com/JoseBlanca/popnei/releases/download/js-v0.1.0-dev.1/popnei-0.1.0.tgz`
  installs it, and `node -p 'require("./node_modules/popnei/package.json").version'`
  prints `0.1.0` (`npm view` does not take the URL of a tarball). When it
  does not, it stops and asks the owner, and starts nothing else until it
  exists. The release was made on 24 September 2026 from popnei's commit
  3bc33f9, with the 270 tests of the package passing, and this check
  passed then.

## 1. The repository and its checks

**What it gives:** a repository in which the checks of the coding skill
run and pass, on which the probe is built.

**Deliverables:**

1. `npm ci` installs the dependencies of the spec's "The repository",
   each at an exact version, with popnei from the URL of the release.
   Check: `npm ci` exits 0, and `npm pkg get dependencies.popnei` prints
   that URL.
2. The checks pass: `npm run format:check`, `npm run typecheck`, `npm run
   lint`, `npm test`. Check: each exits 0; `npx vitest
   list` lists the tests of `src/probe/messages.test.ts`, at least eight
   (three messages accepted and three refused for `FromProbe`, two
   accepted and three refused for `ToProbe`). `npm run build` is checked
   in work package 2, deliverable 2, because Vite refuses to build while
   `probe.html`, an entry of its config written by task 2.2, is missing.
3. The configs refuse what the spec says they refuse. Check: a scratch
   file, not committed, that imports `src/probe/` from `src/core/` fails
   `npm run lint`; one in `src/probe/` that imports `src/core/` fails it
   too.

**Stands on:** the release of popnei.

**Tasks:**

- [x] 1.1 The files of `configs.md` with the differences of the spec's
  "The repository": `package.json`, `.npmrc`, the TypeScript configs with
  the two of the probe, `eslint.config.js` with its probe patterns,
  `.prettierrc.json`, `vite.config.ts` with `input: { index, probe }` and
  `appType: "mpa"`, `.gitignore`, `index.html` as its placeholder; the
  dependencies installed. The changes to section 9 of
  `docs/architecture.md` and to `configs.md` that the spec asks for, pages
  at the root, go in the same task. Serves 1, 2 and 3.
- [x] 1.2 `src/probe/messages.ts`, the types and the two validators of
  the spec's "The messages of the probe", and `src/probe/messages.test.ts`.
  Serves 2. Needs 1.1.

**What could go wrong:** the configs of `configs.md` were tried on a
scratch project on 24 September 2026, before the probe's two tsconfigs
and its ESLint block were added (`configs.md` marks what was added after
the trial); a rule that rejects a file the probe needs is fixed in the
config and in `configs.md` together.

## 2. The probe in the browser

**What it gives:** a user opening the built site's `probe.html` sees
popnei's version and "200 individuals, ploidy 2", and can open a variant
file of their own. This is the work package that would change the plan,
and the architecture, if it failed: if popnei's wasm does not load in a
module worker built by Vite, the orchestrator stops and tells the owner,
with the browser's message.

**Deliverables:**

1. The fixtures of the spec's "The fixtures". Check:
   `node e2e/fixtures/make_fixtures.mjs` writes `e2e/fixtures/panel.nei`
   and `public/probe/panel.nei`, both of 261,490 bytes, and running it
   twice gives the same bytes.
2. `e2e/probe.spec.ts` passes in Chromium, Firefox and WebKit with every
   check of the spec's "How it is verified", item 2. Check: `npm run
   test:e2e` exits 0, and `npx playwright test --list` shows the probe's
   tests in each of the three projects; `npm run build` exits 0, and
   `dist/index.html` and `dist/probe.html` exist after it (moved here
   from work package 1 on 24 September 2026).
3. The probe's failure cases show on the page. Check: two tests of
   `e2e/probe.spec.ts`, besides those of deliverable 2: one in which
   Playwright answers the request of popnei's `.wasm` file with 404, with
   `page.route`, and the page reads "popnei could not be loaded"; one in
   which it answers the request of `probe/panel.nei` with 404, and the page
   reads the address of the file in the message.
4. The screenshots of the probe, served file shown, a file of the user
   shown, a file refused, popnei not loaded, taken by `npm run screens`.
   Check: four PNGs in `screens/`.

**Stands on:** work package 1.

**Tasks:**

- [ ] 2.1 `e2e/fixtures/make_fixtures.mjs`, the copy of popnei's
  `panel.vcf.gz` and `bad.vcf`, and the two `panel.nei` it writes; the
  spec's "The fixtures". Serves 1. Can run beside 2.2.
- [ ] 2.2 `probe.html`, `src/probe/probe.tsx` and
  `src/probe/probeWorker.ts`, the spec's "The probe" and "The cases".
  Serves 2 and 3. Needs 1.2.
- [ ] 2.3 `playwright.config.ts`, `e2e/axe.ts`, `e2e/probe.spec.ts` and
  `e2e/screens.spec.ts`, as `testing.md` gives them, with the checks of the
  spec's "How it is verified" item 2 and the two failure tests. Serves 2,
  3 and 4. Needs 2.1 and 2.2.
- [ ] 2.4 The owner looks at the four screenshots; one round, since the
  probe is a technical page and not a screen of the applications. A change
  asked for goes into the spec's "The probe" first.

**What could go wrong:** popnei's loader under Vite's `?worker` was seen
to build in a scratch project on 24 September 2026, with the address of
the wasm rewritten under the base path and served as `application/wasm`
by `vite preview`, but it was not run in any browser; a `File` posted to a module
worker and read with `FileReaderSync` is from MDN's tables, not from a
run. If WebKit fails where the others pass, the orchestrator reports it
with the message and does not work around it.

## 3. The workflow and the deployed site

**What it gives:** every push is checked and tested in three engines, and
a push to `main` publishes the site; the probe loads popnei from GitHub
Pages.

**Deliverables:**

1. `.github/workflows/site.yml` with the three jobs of the spec's "The
   workflow". Check: on the branch of the plan pushed to GitHub, the
   `check` and `e2e` jobs pass; `deploy` does not run, since the branch is
   not `main`.
2. The site deployed. Check: after the push to `main`, the `deploy` job
   passes, and `https://joseblanca.github.io/popnei_web/probe.html`
   answers 200.
3. The probe on the deployed site: item 3 of the spec's "How it is
   verified". Check: `e2e/probe.spec.ts` run with `BASE_URL` set to the
   deployed address passes in the three engines, and `curl -sI` on the
   `.wasm` file shows `Content-Type: application/wasm`.
4. The measurements, `initMs` and `openMs` of each engine on the deployed
   site, in the report. Check: the report has the six numbers, with the
   machine and the date.

**Stands on:** work package 2; outside the plan, the owner's setting of
Pages to GitHub Actions in the repository, and the owner's order to push
to `main` (`CLAUDE.md`).

**Tasks:**

- [ ] 3.1 `.github/workflows/site.yml`, and the branch of the plan pushed
  to GitHub, which the owner orders. Serves 1.
- [ ] 3.2 The owner sets Pages to GitHub Actions, merges the branch into
  `main` and orders the push. Serves 2.
- [ ] 3.3 The probe run against the deployed site, the `curl`, and the
  measurements into the report. Serves 3 and 4. Needs 3.2.

**What could go wrong:** the first run of the workflow is where a
difference between this machine and GitHub's Ubuntu runners shows, a
browser library Playwright needs, a line ending Prettier sees; it is fixed
in the workflow, not in the tests.

## At the end

The plan is done when every box is ticked, the report holds the checks
with their output and the measurements, and the spec says what was built,
with any change made on the way in its own commit before the code.
