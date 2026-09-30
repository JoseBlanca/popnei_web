# Report: the analyses of the populations

The work report of the plan `docs/plans/population-analyses.md`, stage 5
of `docs/build-order.md`, carried out from 30 September 2026 on the
branch `plan/population-analyses`, which is not merged and not pushed.

## Where the plan stands

Under way, from 30 September 2026.

### Words the report uses

- **The open-points file** is `docs/specs/stage-5-open-points.md`, where
  every decision you took on stage 5 is written with the option not
  taken.
- **A tag** such as `PA5 D2` starts the name of a test: `PA` for this
  plan, the number of the work package, and `D` with the number of its
  deliverable; a count of tests of a tag is what checks that deliverable.
- **The orchestrator** is the session that runs the plan and writes this
  report; **a writer** or **a fixer** is a session it sends to write a
  task's code or its fixes; **a reviewer** is a session that reads or
  runs the code afresh, one for each kind of problem, as the report of
  stage 4 lists them.
- **The browser check** is the plan's: the build of the test pages and
  every Playwright flow in Chromium and WebKit. Firefox does not launch
  on this Mac.
- **The probe** is the test page of stage 1 that checks popnei's wasm in
  each browser.

## Before the first task

The branch `plan/population-analyses` was made from `main` at efa215c,
called the start below, in the worktree
`.claude/worktrees/population-analyses`. On the start, on 30 September
2026, on this Mac, after `npm ci`:

- `grep -rlzE "not yet[[:space:]]+(reviewed nor[[:space:]]+)?approved"
  docs/specs` prints nothing; `git ls-tree -r --name-only main
  docs/plans/population-analyses.md docs/specs/analyses/popDists.md`
  prints both paths.
- node v26.8.2, npm 11.19.1; Playwright 1.63.0.
- `npm pkg get dependencies.popnei` prints the URL of `js-v0.1.0-dev.3`.
  popnei issues #4 and #5 are open.
- `npm ls d3-scale d3-shape` prints 4.0.2 and 3.2.0.
- `format:check`, `typecheck` and `lint` exit 0; `npm test` gives "Test
  Files 79 passed (79)", "Tests 2968 passed (2968)".
- `POPNEI_TEST_PAGES=1 npm run build` exits 0: `popgen-*.js` 766.90 kB,
  229.89 kB gzipped; popnei's wasm 2,389.51 kB, 785.16 kB gzipped, as
  Vite counts them.
- The browser check gives "1 failed", "1037 passed (3.5m)". The flow
  that failed, in Chromium, is `IP10 D3 the keyboard moves through the
  table cell by cell` of `e2e/pcaResults.spec.ts`: it scrolls the box of
  the PCA's table to its end once and waits for it to have moved more
  than 500 pixels, and it had moved 11. Run alone 20 times, and 20 times
  with 8 at once, it passed 40 times out of 40. It is a test that
  scrolls before the box has grown, under the load of the whole check,
  and not a defect of the screen. Task 0.1, added to the plan, makes it
  scroll inside its wait.
- `--project=screens --list` lists 308 tests, the two measurement
  projects 44.

## For the owner, as the work goes

Points found during the work, each with its recommendation. None stops
the plan; each is asked of you at the next stop.

1. **The axis of a histogram of the spectrum, `histogram.md`, "How it
   is verified".** The spec says that p0's shares, with the top 0.061
   shared by the three populations, give a vertical axis of 0 to 0.07.
   Its own rule, the top "made round by the scale's `nice`", gives 0 to
   0.065 with the d3 the application uses (`scaleLinear().domain([0,
   0.061]).nice()`, run on 30 September 2026); 0.07 comes only from a
   rounding to 5 ticks, which would change the histograms of stage 4
   too. The code follows the rule and its test asserts 0.065, which
   still tells the shared top from p0's own, 0.06. Recommendation:
   correct the example to 0.065, and the plan's deliverable `PA4 D6`
   with it.
2. **Where the functions the three analyses share live,
   `project.md`.** The spec puts `populationListsNeeds` in `project.ts`,
   and says `project.ts` imports `individualsKept.ts` for its types
   alone, because that module imports `project.ts`. The function needs
   `individualsKept` itself, so the two modules now import each other.
   Nothing breaks today: every name that crosses is a function, and the
   reviewer loaded each module first under node with no error. A
   constant added at the top of either module could stop the page at
   load, which the reviewer showed on a scratch copy. Recommendation:
   a module of its own, `src/core/populations.ts`, for the four shared
   functions, with `project.md` changed to say so. It is a change of
   imports, and can be made at any point of the plan.
3. **Three helpers the spec's interface does not list.** `project.ts`
   exports `allEmptiedText`, `loosenText` and, after the review,
   `populationsColumnOf`, which the analyses need and the interface of
   `project.md`, "What the analyses per population share from stage 5",
   does not name. Recommendation: list them there.

4. **The names under the heatmap's columns, `heatmap.md`, "The grid".**
   The spec puts the grid at the top left of its frame, and the base of
   the plots draws the axis of the columns at the foot of the frame.
   The frame of the panel is taller than it is wide, since the legend
   takes width on the right, so the names of the columns stand about 90
   pixels below the last row at 640 by 640 pixels, and about 130 with
   long names, in Chromium and WebKit (`screens/scratch-heatmap-chromium-panel-640.png`).
   Recommendation: the grid at the bottom left of the frame, the room
   left over above it, which puts the names under their columns with no
   change to the base. The other way is an option of the base that
   places its horizontal axis, which changes `plot2d.md`. Asked at stop
   A, where it can be the first round.

## The standing rules of this plan, for a session that takes over

Not for the owner. The scratchpad of a session is lost when the Mac
restarts, so what the orchestrator gives every writer is kept here.
Every task's prompt is the text below, then the task's own part: its
number, what earlier tasks it builds on, and what the owner decided that
the code does not show.

The orchestrator runs its whole checks on a copy of a commit made with
`git archive` outside the worktree, with the preview port of
`playwright.config.ts` changed in the copy (4273 and up): the config
reuses a server already on 4173, so a check beside a writer's would
otherwise test the writer's build.

### What every task of this plan is given

You are carrying out a task of an implementation plan of popnei_web, the
static web applications of popnei (population genetics in the browser,
TypeScript, React, D3, web workers running popnei's wasm package).

- **Where you work.** All your work is in the git worktree
  `/Users/jose/devel/popnei_web/.claude/worktrees/population-analyses`,
  on the branch `plan/population-analyses`, which is checked out there.
  Run every command from that directory. Do not `cd` to
  `/Users/jose/devel/popnei_web`, do not make another worktree or branch,
  and end on the branch, not on a detached commit. Never push, never
  merge, never touch `main`. Never use bare `git stash`.
- **What you read first.** `CLAUDE.md` of the worktree; the plan
  `docs/plans/population-analyses.md`, its section "Words used below", its
  "Before the first task" (the bullets "Every task commits when the checks
  pass", "Tasks side by side" and "What every prompt of a task carries",
  which are rules for you), and the whole work package of your task; the
  specs the task names under `docs/specs/`; `docs/architecture.md`; the
  decisions of the owner in `docs/specs/stage-5-open-points.md`.
- **The skills you follow.** `.claude/skills/coding/SKILL.md` and
  `typescript.md`, and the topic files of `.claude/skills/coding/` that
  your task touches (`react.md`, `css.md`, `charts.md`, `worker.md`,
  `testing.md`); `.claude/skills/writing/SKILL.md` for comments, the words
  of a screen and the commit message.
- **popnei** stays at the release `js-v0.1.0-dev.3` that `package.json`
  names; do not change it. popnei itself is at `/Users/jose/devel/popnei`
  (read it, do not change it; its `js/popnei` holds the TypeScript API).
  If the task needs something popnei does not give, stop and say so; do
  not work around it in the application. popnei issues #4 and #5 are open
  and the specs say what happens meanwhile.
- **The browsers.** Firefox does not launch on this Mac. The browser
  check is `POPNEI_TEST_PAGES=1 npm run build && npx playwright test
  --project=chromium --project=webkit`, never `npm run test:e2e`.
- **The rules of every task** are the plan's "What every prompt of a task
  carries". In short: break each rule of the spec you build once, on a
  scratch copy, and see a test fail, and say how many you broke and how
  many failed; a plot is tested in the browser for what jsdom cannot lay
  out; a check at 320 px uses the committed font of `e2e/fixtures/fonts/`;
  an effect that moves the focus is tested under `<StrictMode>`; a number
  field is tried with a comma typed key by key; a flow waits for a frame,
  not a blur, after a Tab that leaves the page, and anything it reads
  from pixels holds on Linux fonts too; a measurement asserts it measured
  a number in every column; a change that crosses layers is cut by what
  each commit keeps working; a flow that fails once is run 20 times in
  that engine before it is called flaky or fixed.
- **A spec is not changed** without the owner's word. If the task needs a
  change the plan itself names, that change is a commit of its own before
  the code. If a spec and the code, or a spec and popnei, contradict each
  other, or the architecture does not hold (an invariant you would have
  to break, an interface that does not carry what is needed), stop and
  report; do not work around it. A point for the owner is written with a
  recommendation.
- **Do not touch** the plan `docs/plans/population-analyses.md` or the
  report `docs/plans/population-analyses.report.md`: the orchestrator
  ticks the boxes.
- **Committing.** One commit per task (or per commit the task names),
  when `npm run format:check`, `npm run typecheck`, `npm run lint`,
  `npm test` and, unless you are told another task runs beside you, the
  browser check pass. The commit message follows the writing skill, as
  the recent commits of `git log` do, and ends with
  `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- **A task that changes a screen** runs `npm run screens`, looks at the
  pictures of the states it changed with the Read tool, and gives their
  paths.
- **What you send back**, in under 300 words: what you built; the
  commit(s); the last line of each check (the Vitest and Playwright
  summary lines with their counts, and the count of the deliverable's
  tag); the paths of the screenshots; the rules broken on a scratch copy
  and how many failed a test; what you did differently from the task and
  why; any question you could not settle; and the tokens you used, if you
  know them.
