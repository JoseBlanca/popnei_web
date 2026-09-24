# Report: the site stands up, and popnei runs in it

The work report of the plan `docs/plans/site.md`, stage 0 of
`docs/build-order.md`, carried out on the branch `plan/site` from 24
September 2026. It is written while the work goes, one section per work
package. The plan is under way.

The `following-plans` skill puts a report under `docs/reports/`; this
one is at `docs/plans/site.report.md` because the plan and the owner's
order name that path.

## 0. The release of popnei

Done on 24 September 2026. The release exists and installs from its
URL.

- Task 0.1. In a scratch folder, `npm install
  https://github.com/JoseBlanca/popnei/releases/download/js-v0.1.0-dev.1/popnei-0.1.0.tgz`
  added 1 package, and `node -p
  'require("./node_modules/popnei/package.json").version'` printed
  `0.1.0`. The package holds `dist/`, `wasm/`, `package.json`, `README.md`
  and `LICENSE`.
- The machine: macOS (Darwin 27.0.0), node 26.8.2, npm 11.19.1, as the
  plan expected.

## 1. The repository and its checks

Built on 24 September 2026, and reviewed; the three findings that would
change the spec wait for the owner (below). Commits 140b57a and 4c45dd6,
and the fixes of the review, 43bce3f to a1acff4.

The deliverables, each checked by the orchestrator in the worktree on
a1acff4:

1. `npm ci` exits 0, and `npm pkg get dependencies.popnei` prints
   `https://github.com/JoseBlanca/popnei/releases/download/js-v0.1.0-dev.1/popnei-0.1.0.tgz`.
2. `npm run format:check`, `typecheck`, `lint` and `test` exit 0; `npm
   test` gives "Tests 39 passed (39)" in one file. `npm run build` fails
   with "Cannot resolve entry module probe.html": the page is written by
   task 2.2, so the check of the build was moved to work package 2.
3. A scratch file in `src/core/` that imports `src/probe/messages.ts`, and
   one in `src/probe/` that imports `./../core/…`, each fail `npm run
   lint` with `no-restricted-imports`; both were deleted.

Changed in the plan: the check of the build moved from work package 1 to
work package 2, deliverable 2, because Vite refuses to build while
`probe.html`, an entry of its config, is missing.

What the writer did differently from `configs.md`, each written into
`configs.md` too: `"files": []` in the TypeScript configs of the layers
that have no file yet, since `tsc -b` refuses a config that finds no
file; the Markdown files left to themselves by Prettier, which flagged 21
documents; no Vitest project for jsdom until jsdom comes.

The review ran seven categories through five reviewers: spec, tests,
stale, errors, api, architecture and bundle. Fixed:

- The lint let the probe import the rest of `src/` through a path
  spelled `./../`, and let the files of the worker that run on the page
  import popnei, which would have brought popnei's wasm onto the page's
  thread; a `.tsx` file of `src/core/` or `src/charts/` escaped its
  layer's rules. Each hole was shown with a scratch file, and closed in
  `eslint.config.js` and `configs.md`.
- The validators returned their refusal as an English sentence, where
  `typescript.md` asks for the kind of failure with its facts; they now
  do, and the tests assert those.
- The validators checked ranges (ploidy of 1 or more, durations of 0 or
  more), where `worker.md` says a validator checks the shape and leaves
  the numbers to popnei; they now check types only.
- A kind of message added to the types would have compiled while the
  validator refused it; the kinds are now tied to the types, and a
  scratch edit made the typecheck fail.
- Twelve checks of the validators could be removed with the 14 tests
  still passing; 25 tests were added, to 39.
- Section 9 of `docs/architecture.md` said only `src/worker/runner.ts`
  calls popnei, and now names the probe's worker too.
- `make_fixtures.mjs` was linted by no rule; `.mjs` files now are.

Not taken: the line of `configs.md` recording that the build passed on a
scratch probe page stays, since it records a trial.

Waiting for the owner, since each changes the spec's messages or rules:
a kind of failure for a request the worker does not know; the source and
the name of the file in a failure to open it, since the two files can be
answered out of order; and popnei refused to the page's own file of the
probe, so that only the worker runs it.

Seen by a reviewer, not by the orchestrator: on a scratch copy with a
small page and worker, the build wrote popnei's wasm at 1,771 kB, 566 kB
gzipped, and Chromium, under `vite preview` and the development server,
loaded it from the worker and showed version 0.1.0. Firefox and WebKit
were not installed then.

### How the work went, for whoever revises a skill or a plan

The owner can stop reading here.

- The plan checked the build in work package 1, though its entry,
  `probe.html`, is written in work package 2; a plan should put a check
  in the package that writes everything it needs.
- `configs.md` had the lint of `src/worker/` without the rule that keeps
  popnei in `runner.ts`, and `worker.md` said "checks the shape, not the
  numbers" while the spec did not; the writer copied the first and missed
  the second.
- The subagent of work package 1 used about 159,000 tokens for the two
  tasks and 202,000 for the ten fixes; the five reviewers used between
  40,000 and 81,000 each, 282,000 together.

## 2. The probe in the browser

Built and reviewed on 24 September 2026; waiting for the owner's look at
the screenshots (task 2.4), and for two decisions: where Firefox is
tested, and what the spec says of the address shown when popnei cannot
be loaded. Commits 04fd165 to af19d73.

The deliverables, checked by the orchestrator in the worktree on
af19d73:

1. `node e2e/fixtures/make_fixtures.mjs` writes `e2e/fixtures/panel.nei`
   and `public/probe/panel.nei`, 261,490 bytes each, read back as 1,200
   variants, 200 individuals, ploidy 2, and `e2e/fixtures/tetraploid.nei`,
   16,194 bytes, 200 variants, 12 individuals, ploidy 4; a second run
   leaves `git status` clean.
2. `npx playwright test --project=chromium --project=webkit` gives "40
   passed", 20 tests in each engine, Chromium 153 and WebKit 26.6;
   `--list` shows 20 tests in each of the three projects. Firefox was not
   run: it exits at launch on this machine (below). `npm run build` exits
   0, and `dist/index.html` and `dist/probe.html` exist.
3. Among the 20: the wasm answered 404 shows "popnei could not be
   loaded", and `probe/panel.nei` answered 404 shows its address.
4. `npm run screens` gives "7 passed", seven PNGs in `screens/`: the
   served file shown, a file of the user shown, a file refused, popnei
   loading, popnei not loaded, the worker not started, the worker stopped
   by a crash of the wasm. The plan asked for four; the review asked for
   the other three.

Changed in the plan: `bad.vcf` is written in popnei_web, since popnei has
none to copy (task 2.1).

Changed in the spec, in commits of their own before the code:

- by the owner's decisions of 24 September 2026: a failure of its own
  for a request the worker does not know; the source and the name of the
  file in a failure to open it; popnei refused to the page's files by the
  lint, so that only the worker runs it;
- by the review, each a text of the page or a case the spec had not
  foreseen: the texts after popnei fails; "The probe's worker did not
  start."; what the worker does on a crash of the wasm; whether popnei
  itself refused a file, so that the sentence on which reader the name
  chose is shown only then (a refinement of the owner's decision on the
  source and name, told to the owner); the tetraploid fixture.

The review ran eleven categories through six reviewers, then a second
pass on accessibility, React and the texts. What mattered, all fixed,
each with a test that failed first:

- When the worker did not start, the page showed "The browser said:"
  with nothing after it, in Chromium and WebKit: the event a module
  worker fires then has no message.
- After popnei failed, two texts still said the files would open once
  popnei loaded.
- One unanswered request of a file left every later file on "Opening…"
  for the rest of the session; the worker now answers every request, and
  stops on a crash of the wasm, as `worker.md` says.
- A file whose name chose the wrong reader was refused with no word on
  the name; the refusal now says it.
- Four decisions of the spec could break with every test passing, each
  shown by a reviewer who broke the code: answers in either order, the
  defect messages, the ploidy shown (every fixture had ploidy 2), the
  address of a wasm that does not compile.
- After a crash, a keyboard user was left on nothing; the focus now
  moves to the defects.
- The lint did not catch `import("popnei")` written as a call, on the
  probe's page and in `src/ui`, `src/core` and `src/charts`.

Not taken: counting the individuals with popnei's `numIndividuals`, since
the spec names `individuals`.

What the owner should know:

- Firefox does not start without a window on this machine, macOS 27.0:
  Playwright's Firefox 1543 and the installed Firefox 156.0.1 both exit
  with "Could not find profile folder", also after a reinstall and
  outside the sandbox. Playwright 1.63.0 is its newest release.
- popnei's loader takes no address for its wasm and gives none, so the
  page finds it in the browser's list of fetched files: shown in both
  engines when the wasm does not compile, only inside popnei's message on
  a 404, and missing in WebKit on a network failure.
- popnei's message for a file that is not a VCF quotes its first 16 bytes
  and cuts mid-word, "`This is a line o`"; that is popnei's to change.
- Seen by the orchestrator: the seven screenshots, taken in Chromium.
  Not seen in any browser: Firefox.

### How the work went, for whoever revises a skill or a plan

The owner can stop reading here.

- The first review of work package 2 found 19 findings, the second 7;
  most were cases of failure that the spec named and no test reached. A
  plan that lists, for each case of the spec, the test that reaches it
  would have caught them at the task.
- A test written to show a defect passed on the defective code twice,
  because an earlier failure hid it; the writer found it only by running
  each new test against the old code. The code-review skill could ask
  for that run.
- The subagent of task 2.2 used about 190,000 tokens for the task,
  264,000 for the 19 fixes and 316,000 for the seven of the second pass;
  task 2.1 used 58,000 and task 2.3 112,000; the seven reviewers used
  between 51,000 and 104,000 each, 565,000 together.
