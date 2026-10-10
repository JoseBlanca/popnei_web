# Plan: no Undo on popgen2.html, the PCA calculated again by itself, and the band

10 October 2026. A draft.

## For the owner

What you will try at the end, on `popgen2.html`: no Undo and no Redo;
after you press Run in the PCA tab once for a file, any later change of
a filter or of an option of the PCA calculates the PCA again by itself,
one second after you stop changing things (the quiet second: each
change, or a slider still held, a list still open, a number still being
typed, puts the start a second later); meanwhile the PCA tab says the
PCA starts again in a moment (the state called "about to start"), with
a Stop; Stop keeps the PCA from starting again until you press Run; a
value set back is calculated again; and a band at the top of the window
says what is running, with its Stop, from whichever tab you are in.

The order of the eight packages:

1. The part of the application that keeps the results learns to throw
   a result away as soon as its filters change.
2. Undo and Redo leave the page, and that rule is turned on for it.
3. The page learns when you are in the middle of a change: a slider
   held, a list open, a number being typed.
4. The PCA starts again by itself after a change.
5. The band at the top of the window.
6. The instructions of the project and the documents brought up to
   date.
7. The session looks at every screenshot and runs every check.
8. You try the page.

You are stopped before package 8 only if: a control of the page gives
no signal that you are still using it, so the quiet second could not
wait for you; one change starts two PCAs; a result is shown for other
values than those on the screen; or a package fails three times. Each
of these would mean the design does not hold as approved.

What is asked of you now: to approve this plan and the specs it builds
from, before any code is written. You approved them on 10 October
2026, and answered the band's open point: the band is always at the top
of the window and carries the page's name, "Popnei", with what is
running after it.

You can stop reading here. The rest is for the sessions that build it.

## The plan

It builds the design `docs/designs/no-undo.md`, approved by the owner
on 10 October 2026 with the recommendations of its three open points,
and the band the owner agreed to the same day
(`docs/plans/analyses-pca.md`, its last paragraph). On `popgen2.html`
Undo and Redo go, with their keys; the PCA, once its Run has been
pressed for the file, is calculated again by itself a second after the
user stops changing what it reads; no result is kept for values the
screen no longer shows; Stop keeps the PCA from starting again until
Run; and a band at the top of the window says what the page is doing,
with its Stop, points to the warnings of the PCA, and shows the errors
of the application. It serves case 3 of `docs/use-cases.md`, "Look for
clusters of individuals": set the filters, look at the PCA, move a
filter, look again. It is carried out as the `building` skill says, its
work packages being the phases of that skill's loop, on the branch
`pca-tab` in `.claude/worktrees/pca-tab`, after the plan
`docs/plans/analyses-pca.md`, from the commit that adds this plan.

The specs, called below by these names, were written or revised on
this branch on 10 October 2026 (`git log --oneline -6 -- docs/specs
docs/architecture.md`):

- **the band spec**: `docs/specs/steps/popgen2-band.md`, new;
- **the screen spec**: `docs/specs/steps/popgen2-pca.md`, its sections
  "No Undo and no Redo" and "The PCA calculated again by itself", and
  the parts revised for them;
- **the store spec**: `docs/specs/core/store.md`, its section "On
  popgen2.html: no notice, no Undo, and no result kept for values left
  behind", with `dropLeftBehind`, and its "How it is verified";
- **the cache spec**: `docs/specs/core/cache.md`, its `remove`;
- `docs/specs/core/history.md`, its opening of 10 October 2026;
- `docs/specs/steps/popgen2-filters.md`, "Undo, Redo and their keys",
  and `popgen2-download.md`, "When the PCA starts by itself";
- the lines of 10 October 2026 in `docs/specs/analyses/pca.md`,
  `popgen2-input.md`, `docs/specs/shell.md` and `docs/specs/entry.md`.

`docs/architecture.md` was revised on this branch for the design, in
sections 2, 3, 5, 7, 9, 11 and 12.

## Words used below

- **The old page** is `popgen.html`, which keeps its Undo, its notice
  and its cache as they are, and shares core, the store, the workers and
  `autoRuns.ts`'s code with `popgen2.html`. Where it shares code, the
  change is a setting or an argument it does not give, and its flows
  show it unchanged.
- **The one pass** is the reading of the variants file that
  `popgen2.html` makes by itself when the file is opened. **Held** is a
  pass, or a PCA, kept running by `e2e/holdWorker.ts` so that a flow can
  look at the page meanwhile.
- **Live**, **the quiet second**, **a change under way** and **about to
  start** are the screen spec's ("The terms"). **A hold** is the mark a
  change under way leaves on **the gate**, `createRunGate` and
  `gatedStore` of `src/ui/variants/thresholdRun.ts`, through which the
  screens of the page reach the store.
- **`dropLeftBehind`** is the store's new setting of `popgen2.html`,
  under which a result is thrown away once its analysis has another key
  (the store spec).
- **The browser check** is `POPNEI_TEST_PAGES=1 npm run build` and then
  `npx playwright test --project=chromium --project=webkit --workers=4
  --global-timeout=<milliseconds>` with the spec files named, or with
  `-g "<tag>"`. Firefox cannot start on the owner's Mac under
  Playwright. **The screens run** is `npx playwright test
  --project=screens -g popgen2 --global-timeout=400000` after a build,
  which writes the PNGs of `e2e/screens.spec.ts`
  (`.claude/skills/coding/testing.md`). **The measurement run** is the
  build and `npx playwright test --project=measure-chromium`, then
  `--project=measure-webkit`, `--workers=1`, alone on the machine.
- **A tag** starts the name of a Vitest `describe` or of a Playwright
  test: `NU2 D3` is work package 2, deliverable 3, of this plan (`NU`
  for no Undo). No test name on this branch starts with `NU` followed by
  a digit (a search of `src/` and `e2e/` on 10 October 2026), so on the
  commit the plan starts from every check below selects no test; each
  check asks for at least a number of tests, and a run that selects
  none falls short of that number, so the check fails there as it
  must. A Vitest count is read from the summary line of
  `npx vitest run <path> -t "<tag>"`, "Tests N passed", since a tag that
  selects nothing exits 0; a Playwright count from the summary of the
  browser check, half in each engine.
- **A command in the foreground** lasts at most 600,000 ms; nothing
  runs in the background. A browser run that would last longer is split
  into runs of a few spec files.

## In and out

In: the eight work packages below. One holds a measurement, the time
from a Stop of a large PCA to the end of the band's "Stopping the PCA…"
(work package 5). The owner's try is the last, 8, after the session's
own look in 7.

Out, each with where it goes:

- the removal of the store's history and of `applyAfresh` from the
  code: when `popgen.html` is deleted, as the owner decided on 9 October
  2026 (the design, choice 4);
- the reading of the individuals file and the opening of the variants
  file in the band: the band spec, "Not in this spec"; the owner may ask
  for them after trying it;
- the tabs Populations and Distances, not built; the band's link names
  their warnings when they have results;
- Firefox and Safari, which Playwright cannot start here, VoiceOver,
  which the session cannot run, and whether the quiet second is long
  enough: the owner, in work package 8.

## The open point of the specs

The plan and its specs were approved by the owner on 10 October 2026.
The band spec's one open point, "The band's room while nothing runs",
was answered the same day otherwise than recommended: the band is
always at the top of the window and carries the page's heading
"Popnei", with what is running after it; the band spec's "Its place"
says so, and task 5.3 builds it.

## The stops

The `building` skill stops for the owner on a choice hard to undo,
something popnei lacks, a decision about what the user sees that the
specs do not settle, a phase that failed three times, and anything
outside the worktree. No stop is expected. If one comes, the session
leaves the tree with the checks passing and everything committed,
writes the question under "What was done" with the options, what each
costs and a recommendation, goes on with every work package that does
not stand on the answer, and puts the question first in the report.

- **A change under way that a control does not tell**: a slider of
  React Aria that gives no event at the start of a drag held still, a
  list whose opening cannot be read, in Chromium or WebKit. Without its
  hold the lock of the filters falls on a control in use, which the
  design says sends it back (its choice 2). Meanwhile: work packages 1
  and 2, and the band's parts that do not stand on the PCA live.
- **A PCA that starts while a change is under way**, or two PCAs from
  one change, in the flows of work package 4 after its fixes: the
  design's rule 5, one calculation at a time, or its choice 2, does not
  hold.
- **The quiet second too short** when the owner tries the page: the
  design names the answers, a longer second or an Apply button, not a
  stop at each change; the owner chooses (work package 8).
- **A PCA whose result is shown for other values** than those on the
  screen, in any flow: the first of the design's rules does not hold.
- **An invariant of `docs/architecture.md`**, or the format of the
  project file: none is planned. A task that finds it needs one stops
  there and reports.
- **A work package that fails three times**, or a finding of a review
  whose fix is one of the above.
- **Outside the worktree.** Nothing is merged, pushed or filed.

## Before the first task

- The worktree has its packages, popnei 0.2.2 in
  `node_modules/popnei`, table_io `js-v0.2.0-dev.1`; node v26.8.2;
  Chromium and WebKit installed for Playwright.
- The session runs the typecheck, the lint, Vitest and the format check
  on the commit the plan starts from, and the browser check of the flows
  of `popgen2.html`, `e2e/popgen2*.spec.ts`, and writes their counts
  under "What was done"; and confirms with `npx vitest list` and
  `npx playwright test --list` that no test name starts with `NU` and a
  digit.
- Every number of popnei a flow compares with is popnei 0.2.2's under
  node, as `src/worker/runner*.test.ts` and
  `e2e/fixtures/make_fixtures.mjs` load it. The flows of this plan reuse
  the screen spec's numbers ("How it is checked", "The numbers"): 532
  variants and PC1 3.58% with the PCA's missing data at 0.05.
- What the specs name and the code does not have, built here: `remove`
  of `src/core/cache.ts`; `dropLeftBehind` of `src/core/store.ts`; the
  holds of the gate; `run`, `pause` and `aboutToStart` of
  `src/ui/autoRuns.ts`; `src/ui/pageTab.ts`; `src/ui/band/`.

## The order, and what may run side by side

The store's setting comes first, since what the page shows after a
change rests on it, and it can be built and checked in node alone. Undo
goes next, with the setting turned on for the page, since an Undo that
brings back a result the store has thrown away would be a defect on the
screen; the two change together. The holds come before the PCA live,
which waits for them. The band comes last, since it shows the PCA live,
about to start and stopping.

- Work package 1 runs first and alone among the code; work package 3's
  task 3.1, the gate's count, may run beside it, since it touches only
  `thresholdRun.ts` and its test, which work package 1 does not.
- 2 stands on 1, and on 3.1 (both change `thresholdRun.ts`).
- The rest of 3 stands on 2 (both change `NumberField.tsx` and the
  widgets' comments).
- 4 stands on 1 to 3.
- 5 stands on 4: it reads `aboutToStart` and calls `pause`, and changes
  `popgen2.tsx`, which 4 changes too.
- 6, 7 and 8 run after everything, in order; task 5.6, the measurement,
  runs alone on the machine.

At most three agents run at once, the reviewers among them, and only
one of them builds or runs a browser at a time.

Each work package is reviewed as it ends, as the `building` and
`code-review` skills say: one `code-reviewer` subagent per category of
"The categories of each review", below, in batches of three, the
findings judged by the session, the fixes sent to a subagent test
first, the checks and the screenshots run again after them. Its counts,
its commits and its review go under "What was done".

Every task writes its tests first, sees them fail on the commit before
it, then the code; a task's commit holds both and passes the typecheck,
the lint, Vitest and the format check.

## Work package 1: the store keeps no result for values left behind

What it gives, in the words of work package 2: a store, made with the
setting, on which a threshold moved and set back shows no result until
the PCA is calculated again, while the one pass keeps its plots; and an
LD distance emptied and typed again with the same value shows the PCA it
had. No page turns the setting on yet.

Deliverables:

1. `remove` of the cache: the bullet of `remove` in the cache spec's
   "How it is verified", and `remove` drawn in its property, under
   `NU1 D1` in `src/core/cache.test.ts`. At least 2 tests.
2. `dropLeftBehind`: each bullet of the store spec's "`dropLeftBehind`"
   in "How it is verified" but the one of the page's type, which is
   work package 2's, on a store made by `createStore` with the analyses
   and the first project of `popgen2.html`, `stopLeftBehind` and
   `dropLeftBehind`, under `NU1 D2` in `src/core/store.test.ts`. At
   least 9 tests, the late result whose key comes back before its
   outcome and the defect of `dropLeftBehind` without `stopLeftBehind`
   among them.
3. The old page's store, and a store made with `stopLeftBehind` alone,
   unchanged: the tests of `src/core/store.test.ts` and
   `src/ui/popgenStore.test.ts` that were there pass untouched.
4. `stopping` of the store's state: the checks of the store spec's
   section "Stopping", under `NU1 D4` in `src/core/store.test.ts`. At
   least 4 tests.

Tasks:

- [ ] 1.1 `remove` in `src/core/cache.ts` (the cache spec, "The
  TypeScript interface", `remove`). Deliverable 1.
- [ ] 1.2 `dropLeftBehind` in `src/core/store.ts`, with `lastKey` per
  analysis, the refusals left behind, and the late result not cached
  (the store spec, "On popgen2.html: no notice, no Undo, and no result
  kept for values left behind", its bullets of `dropLeftBehind`, and the
  interface of `createStore`). Deliverables 2 and 3. Stands on 1.1. If
  a result stayed in the cache under a key left behind, nothing on the
  screen would look wrong until the user set a value back, when the old
  result would come back with no calculation, against the owner's
  answer, and no test but deliverable 2's would notice; so this is a
  commit of its own, guarded by deliverable 2.
- [ ] 1.3 `stopping` in the state of `src/core/store.ts` (the store
  spec, "Stopping", and `AppState` in its interface). Deliverable 4.
  May run after 1.2 in the same subagent.

What could go wrong: a lock. The PCA locked by its distance emptied has
no key, and a store that compares only the keys before and after a
change would throw its result away at the lock; the case "typed again
with the same value" of deliverable 2 guards it. And the one pass:
another variants file gives it a new key, and its old result must go,
while no change of a filter must touch it.

## Work package 2: Undo and Redo leave popgen2.html

What it gives, on `popgen2.html`: no button Undo nor Redo, at any time;
Ctrl+Z, Cmd+Z, Ctrl+Shift+Z and Ctrl+Y change nothing but the text of a
number box with digits not confirmed; the line of the heading holds
"Popnei" alone; and a threshold moved and set back after a PCA shows
Run, not the old result.

Deliverables:

1. The store of the page: `createPopgen2Store` gives `maxUndoSteps` 1,
   `dropLeftBehind` and a type with no `undo` nor `redo`; the bullet of
   the page's type in the store spec's "`dropLeftBehind`", and the
   bullets of "`stopLeftBehind` and `applyAfresh`" moved to a store made
   by `createStore` with `stopLeftBehind` alone, as that spec now says,
   under `NU2 D1` in `src/ui/popgen2Store.test.ts` and
   `src/core/store.test.ts`.
2. The gate of the page wraps no `undo` nor `redo`, and a threshold no
   longer catches Ctrl+Z and Ctrl+Y while its run waits, under `NU2 D2`
   in `src/ui/variants/thresholdRun.test.ts` and beside
   `StatsHistogram.tsx`; `UndoRedoButtons`, `undoRedo.ts` and
   `shortcuts.ts` and their tests unchanged for the old page.
3. Flows under `NU2 D3` in `e2e/popgen2Undo.spec.ts`, renamed
   `e2e/popgen2NoUndo.spec.ts`: the bullet "No Undo" of the screen
   spec's "How it is checked", In Playwright, and the table of the keys
   of `popgen2-filters.md`, "Undo, Redo and their keys"; the flows of
   that file that check Undo and Redo are removed, each named in the
   commit message; the PCA done, a threshold that changes its key moved
   and moved back: Run, and no result, with no request until Run. Axe in
   light and dark.
4. The screens `popgen2-undo`, `popgen2-undo-redo` and
   `popgen2-undo-waiting` removed from `e2e/screens.spec.ts`, and
   `popgen2-heading`, the line of the heading alone, at 1280 and 320 px,
   light and dark.

Tasks:

- [ ] 2.1 The store of the page, `Popgen2PageStore` in
  `src/ui/popgen2Store.ts`, and the callers the store spec's "No Undo on
  `popgen2.html`" lists, each typed with the new type (the store spec,
  that paragraph and "The TypeScript interface"). Deliverable 1. The flows of
  `e2e/popgen2Undo.spec.ts` that bring a result back by Undo fail from
  this commit until 2.2; 2.1 and 2.2 are one subagent's, and the browser
  check is run after 2.2.
- [ ] 2.2 Undo and Redo out of `src/ui/variants/VariantsPage.tsx`, the
  gate's wraps out of `thresholdRun.ts`, the waiting of Undo out of
  `filtersLock.ts`, the threshold's catch of the keys out of
  `StatsHistogram.tsx`, and the comments of
  `NumberField.tsx` that name the page's Undo (the screen spec, "No
  Undo and no Redo"; `popgen2-filters.md`, "Undo, Redo and their
  keys"). Deliverables 2, 3 and 4. Stands on 2.1. Added on 10 October
  2026 by the review of work package 1: with Undo gone, the parts of
  the gate that only named a waiting run for Undo go too, `pending`,
  `HeldRun.moved`, the second argument of `hold` and `usePendingChange`
  of `runGate.tsx`; and the gate's `subscribe` then tells only when
  the count of changes under way rises from 0 or falls to 0, which its
  test pins.

What could go wrong: Cmd+Z in WebKit with no handler of the page. Safari
is said to reopen the last closed tab; WebKit under Playwright is not
Safari, so deliverable 3 reads only that the page changed nothing, and
the owner tries Safari in work package 8.

## Work package 3: the changes under way

What it gives, in the words of work package 4: the page knows, at every
moment, whether the user is in the middle of a change that has not
reached the project, a slider held, a list open, digits typed and not
confirmed, a run of the arrow keys, the dialog of the download open, and
is told when the last one ends. Nothing a user sees changes yet.

Deliverables:

1. The gate's count of holds and its `subscribe`, under `NU3 D1` in
   `src/ui/variants/thresholdRun.test.ts`: two holds taken, one
   released: still held; the second released: one call of the
   listener; a hold released twice counts once; a run of the arrow keys
   is a hold from its first press to its change; a hold whose control
   is removed, through the release the widget gives at its removal,
   brings the count back to 0.
2. The widgets, in jsdom, under `NU3 D2` beside each: a slider
   (`Slider.tsx`, `ThresholdSlider.tsx`) holds from its first `onChange`
   of a pointer to its `onChangeEnd`, or until it leaves the page, and
   a press of a key takes no hold; a list (`Select.tsx`) and a menu
   "Download…" (`DownloadMenu.tsx`) hold while open; a number box (`NumberField.tsx`) holds while its text differs
   from the value it is given, and lets go at Enter, Tab, the loss of
   the focus and Escape; the dialog of the download
   (`DownloadVariants.tsx`) holds while open; each lets its hold go
   when it leaves the page while holding; and none of them takes a
   hold on the old page, which gives no gate.
3. The flows of `popgen2.html` pass untouched, since nothing reads the
   holds yet. What a hold does in a browser, a drag held still, a list
   held open, digits typed slowly, is checked through the PCA in work
   package 4, deliverable 3, where it shows.

Tasks:

- [ ] 3.1 The count and `subscribe` in `createRunGate` (the screen spec,
  "The PCA calculated again by itself", "For the implementer").
  Deliverable 1. May run beside work package 1.
- [ ] 3.2 The holds of the widgets and of the dialog, through
  `RunGateProvider` (the same section, and "The quiet second").
  Deliverables 2 and 3. Stands on 3.1 and on work package 2.

What could go wrong: React Aria's slider reports a key as a short drag
(`popgen2-filters.md`, "The end of a drag, and the keys"), so a hold
taken at `onChange` would be taken at a key too; deliverable 2 checks
that a key takes none, and the threshold's own prop of the end of a
drag with a pointer already tells the two apart. If a slider gives no
event at the start of a drag held still, that is a stop.

## Work package 4: the PCA calculated again by itself

What it gives, on `popgen2.html`: after the user has pressed Run for
the file and the PCA has ended, a change of a threshold, of the FILTER
box or of an option of the PCA starts it again by itself a second after
the user stops changing things; the PCA tab shows, during that second,
"The PCA starts again in a moment, once the filters stop changing." with
Stop; a Stop keeps it from starting again until Run; another variants
file ends it; a download pressed in the second goes first.

Deliverables:

1. `createAutoRuns` with the PCA live, under `NU4 D1` in
   `src/ui/autoRuns.test.ts`, on the real store of the page, a fake
   worker, the gate and Vitest's clock: each case of the screen spec's
   "How it is checked", In Vitest, its bullet "The PCA calculated again
   by itself". At least 16 tests, `aboutToStart` during the holds and
   the PCA still live after a failure among them.
2. The PCA tab: Run through `autoRuns.run`, Stop through
   `autoRuns.pause`, the state about to start with its line and its
   Stop, the line while the dialog of the download holds it, and Stop in
   the place of Run while the PCA is live and locked, under `NU4 D2`
   beside `PcaTab.tsx` in jsdom; the words of the lines, of
   "Calculating the PCA again. Stop it to change the filters." and of
   the Stop, by the method, in `tabWords.ts`'s tests; the status region says the start by itself
   once and the Stop, in `announceChanges.ts`'s tests.
3. The flows under `NU4 D3` in a new `e2e/popgen2Live.spec.ts`: the
   bullet "Live" of the screen spec's "How it is checked", In
   Playwright, every check of it, and the two flows of
   `popgen2-download.md`'s "How it is checked" of 10 October 2026.
   Axe in the state about to start, light and dark. Added on 10 October
   2026 by the review of task 3.2: besides the PCA's slider, a
   threshold line of the Variants tab moved and then held still for
   3 s, a thumb pressed and held without moving for 3 s, and a menu
   "Download…" held open for 3 s, each with the PCA live: no start
   until the release, and the line or thumb where the user left it.
4. The flows that were there pass: `e2e/popgen2Pca.spec.ts`,
   `popgen2Download.spec.ts`, `popgen2Downloads.spec.ts` and the old
   page's flows of the PCA, `e2e/pca*.spec.ts`.
5. The screens `popgen2-pca-about-to-start` and
   `popgen2-pca-live-locked`, at 1280 and 320 px, light and dark.
6. The memory of a PCA started by itself after a finished one, in
   WebKit, by the measurement run, alone on the machine, on a VCF of 300 variants and 9,381 diploid individuals, written by
   `e2e/bigVcf.ts` as the PCA tab's plan measured it, 1,793,306 bytes gzipped
   (measured on 10 October 2026), on the owner's Apple
   M5 Pro with 64 GB, in WebKit 26.6 under Playwright:
   a PCA ended, a threshold moved, the PCA again by itself. The bound:
   the peak of the second run, the memory of the engine's processes
   summed every 250 ms, is at most the peak of the first run plus 0.25
   GB; a second run on top of the memory of the first would be about 3
   GB more. (The screen spec, "Stop", and its bullet "Live" of "How it
   is checked".) Written under "What was done".

Tasks:

- [ ] 4.1 `src/ui/autoRuns.ts`: the PCA as a second group of
  `POPGEN2_AUTO_GROUPS` in `src/ui/popgen2Store.ts`, the live state by
  load, `run`, `pause`, the quiet second from the gate, the keys left
  behind forgotten, nothing started while a write or a hold is, and
  `aboutToStart` (the screen spec, "The PCA calculated again by
  itself"). Deliverable 1. A start missed or doubled is silent in node
  unless a test counts the requests, so this is its own commit,
  guarded by deliverable 1.
- [ ] 4.2 The PCA tab and the entry: Run and Stop through `autoRuns`,
  the line of the quiet second, the status region, and `popgen2.tsx`
  giving the gate to `createAutoRuns` (the screen spec, "Run and Stop",
  "The states", "Its words", "Accessibility"). Deliverables 2 to 5.
  Stands on 4.1. Added on 10 October 2026 by the review of work
  package 2: (a) the flow of `e2e/popgen2NoUndo.spec.ts` (~327-350)
  that expects Run after a threshold moved and set back pins a state
  the screen spec forbids once the PCA is live; rewrite it to expect
  no Run between the change and the bar; (b) the screenshots of "about
  to start" and of "ready after a Stop", light, dark and 320 px; (c)
  the line of the quiet second shows after a change of the method, the
  r² or the LD distance too, so its words name the options as well as
  the filters ("once the options and filters stop changing", or the
  spec's own words to that effect, spec first); (d) after a Stop, a
  short line beside Run says why nothing starts by itself any more
  ("Stopped; press Run to calculate the PCA again", spec first); (e)
  the gate's listener reads `underWay() === 0` on each call, and any
  screen that shows the count reads it the same way. (f) the line of the quiet
  second while the download dialog holds it says "The PCA starts again
  when the download is written or closed."; the gate's count carries no
  kind, so the tab reads that the dialog is open from the dialog's own
  state, not from the gate.
- [ ] 4.3 The measurement of deliverable 6, alone on the machine.
  Stands on 4.2.

What could go wrong: the thresholds' run of the arrow keys holds the
second for its own second, so the PCA starts about two seconds after
the last press; deliverable 3 counts one request after ten presses, and
the owner judges the two seconds in work package 8 (the design names
the threshold's own second counted as this one as the way to shorten
it). A PCA that starts while the one pass runs after a Start again
would wait in the worker's queue while shown as running; deliverable 1
has the case.

## Work package 5: the band

What it gives, on `popgen2.html`: a line at the top of the window that
says what the page is doing, with the Stop of the one pass or of the
PCA, "Stopping…" after a Stop, "The PCA starts again in a moment", the
write, a link to the warnings or the error of the PCA while another tab
is shown, and the errors of the application in the place of the error
bar; it stays while the page scrolls, and nothing under it moves when
it starts or stops saying something.

Deliverables:

1. `bandOf` and its words, under `NU5 D1` in
   `src/ui/band/band.test.ts`: each case of the band spec's "How it is
   checked", In Vitest. At least 12 tests.
2. The band drawn and the tab shown in `src/ui/pageTab.ts`, under
   `NU5 D2` in jsdom: each
   case of the band spec's "How it is checked", In jsdom; the row of
   tabs and the band change the same tab shown.
3. The flows under `NU5 D3` in a new `e2e/popgen2Band.spec.ts`: each
   bullet of the band spec's "How it is checked", In Playwright, but
   the time of "Stopping", which is deliverable 6. The flows of
   `popgen2.html` that read the error bar, in `e2e/openVariants.spec.ts`,
   `fileStats.spec.ts`, `popgen2Download.spec.ts` and
   `popgen2Pca.spec.ts` (found by a search of "met an error of its own"
   and `#defects`), read the band's error line with the same words; the
   error bar of the old page unchanged, in `e2e/saving.spec.ts` and the
   other flows of `popgen.html`.
4. Axe with the band in each state, light and dark.
5. The screens of the band spec's "How it is checked", "The screens",
   ten states at 1280 and 320 px, light and dark, `popgen2-band-empty`
   being the page with "Popnei" alone in the band.
6. The time from a Stop of a PCA of 9,381 individuals, on the same
   VCF of 300 variants written by `e2e/bigVcf.ts`, on the owner's Mac,
   to the end of
   "Stopping the PCA…", in Chromium and WebKit, by the measurement run,
   written into the band spec under "How it is checked".

Tasks:

- [ ] 5.1 `src/ui/pageTab.ts` and the row of tabs reading it (the band
  spec, "What it sends and reads", its last paragraph;
  `docs/architecture.md`, section 9). The tabs' own flows,
  `e2e/popgen2Tabs.spec.ts`, pass untouched. Part of deliverable 2.
- [ ] 5.2 `src/ui/band/band.ts` and `bandWords.ts` (the band spec, "The
  line", "Stopping", "The link", "Its words"). Deliverable 1. May run
  beside 5.1.
- [ ] 5.3 `src/ui/band/Band.tsx`, drawn by `popgen2.tsx` in `#defects`
  in place of the error bar, with the words and buttons of the error
  bar reused from `src/ui/shell/` and not copied, `barText`'s three
  sentences, the one drawn with no store among them, `stopping` of the
  store, the band always at the top of the window with the page's
  `<h1>` "Popnei" moved into it from `VariantsPage.tsx`, every code
  that finds that heading to give it the focus (the search of `"#root
  h1"` and `"main h1"`, in `ErrorBar.tsx` and `StatsHistogram.tsx` among
  them) finding it in the band on `popgen2.html` and unchanged on
  `popgen.html`, the short forms of the status at under 30 rem, below
  the popovers and dialogs, its alert and status region marked as live
  announcers, the padding of the scroll in `src/ui/base.css` beside the
  toasts', and the focus on the heading after its Stop (the band spec,
  "Its place", "Stopping", "An error of the application",
  "Accessibility", "The layout"). The rest
  of deliverable 2, and deliverables 3 to 5. Stands on 5.1 and 5.2. The
  band's height, the same in every state, is measured here and written
  into the band spec.
- [ ] 5.4 The measurement of "Stopping", alone on the machine
  (deliverable 6). Stands on 5.3.

What could go wrong: the band fixed at the top in its own root, outside
the page's column, in WebKit; and a control reached by the Tab key
under the band, which deliverable 3 reads by the band's rectangle and
the control's in WebKit as in Chromium, and the owner in Safari. A screen reader hearing the band twice, once as its
line and once from the status region; deliverable 2 checks that the
line carries no live role.

## Work package 6: the instructions and the documents

- [ ] 6.1 The instructions, by the session itself and not by a
  subagent, since every later session reads them: what the design's
  last section names, the `coding` skill's `SKILL.md`, `react.md` and
  `worker.md` where they say the page has Undo or a notice, the states
  of the `writing-specs` skill, whose row "results removed" names
  `popgen2.html`'s Undo, and the category `stale` of the `code-review`
  skill; each place found by `grep -rn -i "undo\|notice\|popgen2"
  CLAUDE.md .claude/` that says what `popgen2.html` no longer does. The
  report lists the files.
- [ ] 6.2 The documents: `docs/architecture.md` and
  `docs/functionality.md`, revised for the design on 10 October 2026,
  against what was built; the time of "Stopping" and the memory of
  deliverable 4.6 where section 11 of the architecture gives the costs;
  each spec of this plan says it is built on the branch `pca-tab`, with
  what a round changed; "What was done" complete.

## Work package 7: the end

- [ ] 7.1 The session's own look: it reads every screenshot of work
  packages 2, 4 and 5 with `Read`, state by state, in both themes and
  both widths, and checks that each state of the band spec's table and
  of the screen spec's "The states" is there and readable; what it
  finds is a fix sent to a subagent, test first, before 7.2.
- [ ] 7.2 The checks of the `coding` skill on the last commit, and the
  browser check of the whole suite in Chromium and WebKit, in chunks of
  spec files that each end within a foreground command; the counts of
  each chunk recorded below; a flaky test run again three times and
  named.
- [ ] 7.3 The report to the owner, as the `building` skill says: the
  stops met, if any; the band's height; the time of "Stopping"; what the review found and
  fixed and what it did not take; the browsers the screens were seen
  in, Chromium in the screenshots and Chromium and WebKit in the flows,
  and those not seen, Safari, Firefox and Chrome; the instructions
  changed; and how to try the page: `npm run dev` in the worktree,
  `popgen2.html`, `e2e/fixtures/panel.nei` and `panel_pops.csv`, Run
  once, then move a threshold, hold a slider, type a distance slowly,
  press Stop in the band, and look at the band from the Variants tab.

## Work package 8: the owner tries the page

- [ ] 8.1 The owner tries the page and answers: whether the screen is
  accepted; whether the quiet second is long enough to go from one
  control to the next, and the two seconds after the arrow keys on a
  threshold; the choices of the band spec's and the screen spec's
  "Choices made by the session", the short forms of the band at 320 px
  among them; whether Safari and Firefox show the band at the top
  with no control reached by Tab under it, what Cmd+Z does in Safari,
  and what VoiceOver says after the band's Stop.
- [ ] 8.2 The rounds. Two are expected. Each change the owner asks for
  goes into the spec first, then into the code, with its commit and its
  screenshots taken again; a change that reaches `src/core/`, the
  worker or `docs/functionality.md` is said to the owner as such and
  becomes a task of its own. After a round that changed the markup, the
  `accessibility`, `react` and `ux` reviewers run again.
- [ ] 8.3 The owner accepts the screen, and the specs say what the
  screen now is. The branch is merged into `main` when the owner says
  so.

## The categories of each review

The `code-review` skill's categories, each a reviewer that reads the
work for one kind of fault: `spec`, whether the code does what the spec
says; `tests`, whether the tests would fail if it did not; `stale`,
comments and documents that no longer say what the code does;
`errors`, failures handled and said to the user; `api`, the interfaces
between the parts; `architecture`, the rules of
`docs/architecture.md`; `react`, the code of the screens; `accessibility`,
the keyboard, the screen reader and the contrast; `ux`, what the user
sees and understands; `browser`, what differs between the engines; and
`bundle`, what the page downloads. The first four run for every work
package that changes code, with:

- 1: `api`, `architecture` (a setting of the store shared by two
  pages);
- 2: `api`, `react`, `accessibility`, `ux`, `browser` (the keys in
  WebKit with no handler), with its screenshots;
- 3: `api`, `react`, `accessibility`, `browser` (React Aria's slider
  and list under a pointer and a key, in WebKit);
- 4: `api`, `architecture` (a start by itself in `src/ui`, one
  calculation at a time), `react`, `accessibility`, `ux`, `browser`,
  with its screenshots;
- 5: `api`, `architecture` (a second root that reads the store and
  changes the tab shown, and the store's `stopping`), `react`, `accessibility`, `ux`, `browser`
  (the band fixed at the top, the focus not hidden under it), `bundle`
  (the band's code in the first load), with its screenshots;
- 6: `stale` alone, on the instructions and the documents;
- 7: `browser` on the whole branch, as the skill asks before a plan is
  done.

## What was done

Each work package adds its entry here: its commits, the counts of its
checks, its review with the findings not taken, and the decisions made
along the way.

### Before the first task, 10 October 2026

At 4ecab7a2: typecheck, lint and format clean; Vitest 152 files, 4,990
tests; no test named `NU` and a digit (`npx vitest list`, `npx
playwright test --list`). The flows of `popgen2.html` and the rest,
1,552 in Chromium and WebKit, passed at e322e9cb, the last commit before
this plan that changed code or flows.

### Work package 1 and task 3.1, 10 October 2026

Commits c9edd9ef (1.1, `remove`), e6437007 (1.2, `dropLeftBehind`),
90a60308 (1.3, the state's field of a Stop waiting for the worker),
1753b956 (3.1, the gate's count). The builder of 3.1 added `holdChange`
and `underWay` and kept `hold` for the arrow keys; the specs now say so.

The review, `spec`, `tests`, `stale`, `errors`, `api` and
`architecture`: every finding held, fixed in 96f94c24 to bff843b1, test
first where a behaviour changed. The ones that would have reached a
user once work packages 3 and 4 are built: the gate told "nothing under
way" before the change of a run of the arrow keys reached the store, so
a PCA started from that signal would have read the old project (a run
now makes its change before it tells); a listener or an end that threw
left a change counted under way for the rest of the session, so the PCA
would never have started again by itself; the PCA spec told the widgets
to take the arrow keys' `hold`, which any change of another control
ends, so the PCA could have started in the middle of a drag; a defect
from an abandoned request was kept as the PCA's error. Also: the
state's field renamed `stoppedAwaitingWorker`, apart from a run's
`stopping`; `dropLeftBehind` without `stopLeftBehind` no longer
compiles; the failures of a request left behind (popnei's and the
worker's dropped, `reopenFailed` kept) in the spec and tested; the
gate's telling pinned by tests. Task 2.2 gained the removal of what
the gate kept only for Undo.

Checks at bff843b1: typecheck, lint, format clean; Vitest 152 files,
5,030 tests. No browser in this package.

The owner answered on 10 October 2026, after the `ux` review of work
package 2: nothing on the page gives the starting values of the
thresholds back (no reset, no starting value shown), and no line says
the page has no Undo.

### Work package 2, 10 October 2026

Commits 79e06e6a (2.1, the page's store with no Undo, one past project
and `dropLeftBehind`; Undo and Redo left the page here, since the new
type would not compile with them) and 09c67e41 (2.2). The review, every
category the plan gives (`spec`, `tests`, `stale`, `errors`, `api`,
`react`, `accessibility`, `ux`, `browser`): fourteen findings held,
fixed in 74d4e7b3 to 0c337cd8, test first where a behaviour changed.
The ones a user would meet: Ctrl+Y in Chromium on macOS emptied a number
box reached by Tab and a screen reader heard "Empty" (the page now
refuses the browser's own action of the undo and redo keys outside a
text field, and the design's choice 6 says so); the spec said Ctrl+Y
in a box with digits typed put the number back, which the code never
did. The ones that would have hidden a defect: the flows of the keys
pressed all five in a row, so Undo and Redo wired back would have
passed them (each key is now checked alone, and the flows were seen to
fail with Undo wired back); the arrow keys' hold could stay counted
for good after a listener threw; the page's store still carried Undo at
run time. The `ux` reviewer asked how a user gets a threshold back to
its starting value; the owner answered nothing, and no line about
Undo. Task 4.2 gained what this review left for it.

Checks after the fixes: typecheck, lint, format clean; Vitest 153
files, 5,029 tests; in Chromium and WebKit the flows of `popgen2.html`
and `e2e/shell.spec.ts`, 308.
