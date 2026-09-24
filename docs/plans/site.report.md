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
