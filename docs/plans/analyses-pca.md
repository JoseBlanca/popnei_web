# Plan: the tabs of the analyses and the PCA tab of popgen2.html

9 October 2026. A draft, for the owner's approval. Once approved it is
carried out without a stop for the owner before its last work package,
in which they try the page; what would be a stop by the `building`
skill is named below ("The stops"), with what the session does
meanwhile. Two questions are asked before it runs ("Two questions asked
before the plan runs").

It builds the design `docs/designs/analyses-pca.md`, approved by the
owner on 9 October 2026 with the ten answers of its "What the owner
decided", and the choices of its "What the session decided".
`popgen2.html` gets a row of five tabs under its two boxes, Variants,
Individuals, PCA, Populations and Distances, a tab of an analysis that
cannot run greyed with its reason; the PCA tab, a PCA or a PCoA of the
individuals of the variants file, made from the PCA of the old page;
a button "Download…" on every table and every plot; and Undo and Redo
at the top right corner of the page. It serves case 3 of
`docs/use-cases.md`, "Look for clusters of individuals". It is carried
out as the `building` skill says, its work packages being the phases of
that skill's loop, on the branch `pca-tab` in
`.claude/worktrees/pca-tab`, from commit cc740d4.

The specs, called below by these names, were written or revised on
this branch on 9 October 2026 (`git log --oneline main..cc740d4 --
docs/specs`):

- **the screen spec**: `docs/specs/steps/popgen2-pca.md`, the five tabs,
  the PCA tab, the downloads and Undo;
- **the tabs spec**: `docs/specs/core/popgen2Tabs.md`, which tab is
  greyed and why;
- **the PCA spec**: `docs/specs/analyses/pca.md`, the old page's PCA,
  with its new part "On popgen2.html";
- **the downloads spec**: `docs/specs/widgets/downloads.md`;
- **the store spec**: `docs/specs/core/store.md`, its section "On
  popgen2.html: no notice, and a history of the filters" and the bullet
  "`stopLeftBehind` and `applyAfresh`" of its "How it is verified";
  `docs/specs/core/history.md`, its opening of 9 October 2026;
- the paragraphs of 9 October 2026 in `docs/specs/entry.md` ("The column
  of the populations on popgen2.html"), `docs/specs/steps/popgen2-input.md`
  ("What it sends and reads") and `docs/specs/steps/popgen2-filters.md`
  ("Undo, Redo and their keys").

`docs/architecture.md` (sections 3 and 7), `docs/functionality.md`
(sections 2 and 5) and `docs/use-cases.md` were corrected on this branch
for the design.

## Words used below

- **The old page** is `popgen.html`, which shares core, the store, the
  workers and the PCA's module and panel with `popgen2.html`. It is to be
  retired and gets none of this piece; where it shares code, the change
  is an argument or a prop it does not give, and its flows show it
  unchanged.
- **The one pass** is the single reading of the variants file that
  `popgen2.html` makes by itself when the file is opened, which gives the
  plots of the Variants tab and each individual's missing rate and
  heterozygosity. **Held** is a pass, or a PCA, kept running by
  `e2e/holdWorker.ts` so that a flow can look at the page meanwhile.
- **The store** holds the project, the results and the calculations
  under way. **`stopLeftBehind`** is its new setting of `popgen2.html`,
  under which a change makes no notice and stops every calculation it
  leaves behind; **`applyAfresh`** its new way to change the project,
  after which the history starts afresh with nothing to undo; **the
  gate** is `gatedStore` of `src/ui/variants/thresholdRun.ts`, through
  which the screens of the page reach the store. All three are in the
  store spec.
- **A step** is a command that Undo takes back; the screen spec's table
  "What is a step" lists them.
- **The browser check** is `POPNEI_TEST_PAGES=1 npm run build` and then
  `npx playwright test --project=chromium --project=webkit --workers=4
  --global-timeout=<milliseconds> -g "<tag>"`, or with the spec files
  named in place of `-g`. Firefox cannot start on the owner's Mac under
  Playwright 1.63.0.
- **The measurement run** is the same build and `npx playwright test
  --project=measure-chromium`, then `--project=measure-webkit`, each with
  `--workers=1`, alone on the machine, with `-g "<tag>"`. The
  measurements live in `e2e/measure.spec.ts`, which only those two
  projects run.
- **The screens run** is `npx playwright test --project=screens -g
  popgen2 --global-timeout=400000` after a build, which writes the PNGs
  of `e2e/screens.spec.ts` (`.claude/skills/coding/testing.md`).
- **The old page's flows of the PCA** are `e2e/pca.spec.ts`,
  `pca3d.spec.ts`, `pcaPanel.spec.ts` and `pcaResults.spec.ts`. **The
  flows of popgen2.html** are `e2e/popgen2*.spec.ts`, `fileStats.spec.ts`
  and `openVariants.spec.ts`.
- **A tag** starts the name of a Vitest `describe` or of a Playwright
  test: `AP2 D1` is work package 2, deliverable 1, of this plan (`AP` for
  the analyses and the PCA). No test name of cc740d4 starts with `AP`
  followed by a digit (a search of `src/` and `e2e/`), so on that commit
  every check below selects no test; a check is read by its count, which
  is then 0, short of the count it asks for, and so fails there. A Vitest
  count is read from the summary line of `npx vitest run <path> -t
  "<tag>"`, "Tests N passed", since a tag that selects nothing exits 0;
  a Playwright count from the summary of the browser check, half in each
  engine.
- **A command in the foreground** lasts at most 600,000 ms, the limit of
  the session's shell, and nothing runs in the background (the standing
  rules of the subagents). A browser run that would last longer is split
  into runs of a few spec files, or of a few sizes of a measurement,
  that each end within it.
- **The first load** of `popgen2.html` is the JavaScript and CSS the
  page downloads before it draws, gzipped, as the build reports it:
  278.6 KB on 9 October 2026 (`docs/technology.md`).

## Two questions asked before the plan runs

The session asks the owner these two when it hands the plan over. Each
has a meanwhile, which the plan follows when the owner has not
answered, and names the tasks an answer would change.

1. **An individuals file opened, removed or read again drops every step
   before it.** On this page these changes go through `applyAfresh`, so
   that opening a file is no step of Undo, as the owner decided on 8 and
   9 October 2026. Its cost: the thresholds and the options of the PCA
   set before the change can no longer be undone, as an opening of the
   variants file already drops them, and a threshold moved in the second
   the read takes is a step that the read then drops. The other way the
   design weighed, keeping those steps by writing the change into every
   project of the history, makes an Undo of a column chosen before it
   change nothing on the screen. Meanwhile: as the specs say. Another
   answer changes tasks 3.2 and 3.3, and the flows of 4.2 that open an
   individuals file.
2. **A PCA left behind by a change is stopped without a word, and Redo
   gives the filters back but not the run.** A threshold moved, or Ctrl+Z
   pressed by habit, while a PCA runs, stops it if the change alters what
   the PCA reads; the tab shows Run again, and an Undo or a Redo of the
   change starts nothing, so a PCA of minutes is run again by hand.
   Keeping it running for an Undo needs a line under the PCA's options
   that says a PCA of the earlier filters runs, with its Stop, since the
   page has no notice. Meanwhile: as the specs say. Another answer
   changes task 3.1 (the store would not stop it), and adds the line to
   task 6.3 and its words to 6.1.

### The owner's answers

Not given yet.

## In and out

In: the ten work packages below. Two of them hold measurements with a
rule decided beforehand: the time a CSV of 10,000 rows freezes the page
(work package 5), and the memory and the time of a PCA run after the one
pass (work package 7). One is a fix of a flow of the old page that
failed once on GitHub (work package 8). The owner's try is the last, 10,
after the session's own look in 9.

Out, each with where it goes:

- the analyses of the Populations and Distances tabs: later pieces; this
  one gives them their tabs and their line "Not built yet";
- smaller boxes at the top of the page: a later piece (the design, "The
  boxes, later");
- the help drawer and the saving of a project on `popgen2.html`: later
  pieces; what the help of the PCA tab would say is in the screen spec,
  "Its words";
- the Cailliez correction of the PCoA, which popnei 0.2.2 does not have:
  the owner chose Lingoes' (answer 9 of the design);
- Firefox, which Playwright cannot start on this Mac, and Safari and
  VoiceOver, which the session cannot run: the owner, in work package
  10; the fix of work package 8 is seen in Firefox only on GitHub, after
  a push the owner orders.

The specs list no open point.

## The stops

The `building` skill stops for the owner on a choice hard to undo,
something popnei lacks, a decision about what the user sees that the
specs do not settle, a phase that failed three times, and anything
outside the worktree. No stop is expected. If one comes, the session
leaves the tree with the checks passing and everything committed, writes
the question under "What was done" with the options, what each costs and
a recommendation, goes on with every work package that does not stand on
the answer, and puts the question first in the report.

- **A greyed tab that a browser does not mark unavailable**: the
  attribute the widget sets by hand, `aria-disabled`, gone from the tab
  after React Aria draws it again, in Chromium or WebKit. The design
  names the way out, the tab built from React Aria's hooks, its option
  (b2), so this is no stop: task 1.5 builds it. A stop only if (b2) fails
  too.
- **A 3D view that comes back blank from a hidden tab**, or without its
  WebGL context in WebKit (the part of the browser that draws the 3D
  view with the graphics card), which the design says would send it
  back. Meanwhile: every work package but the rest of 6.
- **A PCA whose Run, freed at the end of the one pass, still waits in
  the queue of the calculation worker**, or **a PCA left behind that the
  store cannot stop** without a change to the messages of the worker;
  both would send the design back. Meanwhile: the work packages that do
  not stand on the PCA tab.
- **A CSV of 10,000 rows that freezes the page more than 200 ms** in
  either engine (work package 5). The downloads spec then moves the
  writing to the light worker, the second thread that reads the
  individuals file, which needs a new message of that worker, an
  interface between the layers with no spec yet. Meanwhile: the CSV is
  written on the page, and the plan goes on.
- **A PCA after the one pass that fails or closes the tab** where the old
  page's measurement of 29 September 2026 completed it (work package 7).
  Meanwhile: everything else.
- **An invariant of `docs/architecture.md`**, or the format of the
  project file: none is planned. A task that finds it needs one stops
  there and reports.
- **A work package that fails three times**, or a finding of a review
  whose fix is one of the above.
- **Outside the worktree.** Nothing is merged, pushed or filed.

## Before the first task

- The worktree has its packages: `node_modules` with popnei 0.2.2
  (`node_modules/popnei/package.json`, and the URL of `package.json`)
  and table_io `js-v0.2.0-dev.1`. Node is v26.8.2. Chromium and WebKit
  are installed for Playwright (`~/Library/Caches/ms-playwright`).
- The branch adds only documents to `main` at a1701c8. On GitHub, run
  37932799753 of a1701c8 passed the checks and the flows in Chromium,
  Firefox and WebKit, and published the site, on its second attempt; its
  first failed on the flow of work package 8 alone. It stands for the
  browser check of the starting commit. The session runs the typecheck,
  the lint and Vitest on cc740d4 and writes their counts under "What was
  done" before work package 1, and confirms with `npx vitest list` and
  `npx playwright test --list` that no test name starts with `AP` and a
  digit.
- Every number of popnei a flow compares with is popnei 0.2.2's under
  node, taken as `src/worker/runner*.test.ts` and
  `e2e/fixtures/make_fixtures.mjs` load popnei, never from popnei's
  Python `.venv`, which is a stale 0.1.0. Three numbers of the screen
  spec's flows are not among those the PCA spec's "On popgen2.html"
  lists as run under 0.2.2: PC2 3.54% of the PCoA, and the 1,200 variants
  and PC1 7.61% with the LD pruning off. Task 2.4 runs them before a flow
  uses them.
- Three things the specs name are not in the code yet, and are built by
  this plan: `src/core/csv.ts`, `src/core/popgen2Tabs.ts`, and
  `stricter.ts` and `passLock.ts` of `src/ui/analyses/pca/`.
- **A rule with no module spec**: the download of the filtered variants
  waits while a PCA runs, with the words "Waits for the PCA to end; or
  stop it in the PCA tab." (the screen spec, "Its words"; the design,
  answer 5), but no spec says where that rule lives; today
  `downloadPlace` of `src/ui/variants/downloadState.ts` knows only the
  one pass and the write. Task 6.2 writes it into
  `docs/specs/steps/popgen2-download.md`, its states and its words,
  before the code, and the session reads it against the rest of that
  spec.

## The order, and what may run side by side

The row of tabs comes first: its greyed tab, an attribute set outside
React Aria, is where the design could fail in a browser, and every
later screen sits in a tab. The PCA's module comes beside it, since the
store's tests run the PCA. Then the store's two settings, then Undo and
Redo, which show what the store's history now holds. The downloads
stand on none of these, and are built beside them. The PCA tab stands on
all of them; its memory is measured as soon as its Run works. The flaky
flow is fixed whenever the machine is free. Then the end and the
owner's try.

- Work packages 1, 2 and 8 start together: 1 touches `src/core/popgen2Tabs.ts`,
  `src/ui/widgets/Tabs.tsx`, `src/ui/variants/VariantsPage.tsx` and a
  new `e2e/popgen2Tabs.spec.ts`; 2 touches `src/core/analyses/pca.ts`,
  `src/core/apps.ts`, `src/ui/analyses/pca/` and the old page's callers
  in `src/ui/analyses/panels.ts`; 8 touches `e2e/variants.spec.ts`
  alone.
- 3 stands on 2. Tasks 5.1, 5.2 and 5.3 may run beside 2 and 3; task
  5.4 stands on 3.3, since both change `IndividualsBox.tsx` and
  `IndividualsTab.tsx`.
- 4 stands on 1 and 3 (both change `VariantsPage.tsx`; 4 shows the
  history 3 leaves).
- 6 stands on 1 to 5.
- 7 stands on task 6.3, and runs alone on the machine, no other agent
  building or running a browser, since its numbers are of memory and
  time; so does task 5.5.
- 9 and 10 run after everything, in order.

At most three agents run at once, the reviewers among them. Only one of
them runs the build or a browser at a time, since they share `dist/`
and the ports and the machine stays usable; a reviewer that runs a
browser counts as that one.

Each work package is reviewed as it ends, as the `building` and
`code-review` skills say: one `code-reviewer` subagent per category that
applies ("The categories of each review", below), in batches of three,
the findings judged by the session, the fixes sent to a subagent test
first, the checks and the screenshots run again after them. The counts
of each work package's checks, its commits and its review go under
"What was done", one entry per work package.

Every task writes its tests first, sees them fail on the commit before
it, then the code; a task's commit holds both, and passes the typecheck,
the lint, Vitest and the format check.

## Work package 1: the row of five tabs

What it gives, on `popgen2.html`: under the two boxes, the tabs
Variants, Individuals, PCA, Populations and Distances; the first two are
today's "Variants file" and "Individuals file", renamed. PCA and
Populations are greyed until a variants file is open, Distances until
two populations have an individual in it; a greyed tab does not open,
and says why to the mouse, to the keyboard and to a screen reader.
Populations and Distances, once not greyed, say "Not built yet: …". The
PCA tab, until work package 6, holds its heading alone.

Deliverables:

1. `analysisTabs`: each bullet of the tabs spec's "How it is verified",
   and each case of its "The cases", under `AP1 D1` in
   `src/core/popgen2Tabs.test.ts`. At least 12 tests.
2. The greyed tab of the widget, under `AP1 D2` in
   `src/ui/widgets/Tabs.test.ts`, in jsdom: a greyed tab chosen by a
   click, Enter, Space or an arrow key leaves the tab shown as it was,
   with `aria-selected` on it; the focus rests on the greyed tab; the
   next arrow key shows the tab after it; `aria-disabled="true"` and the
   reason as its description, still there after the tabs are drawn
   again; the tooltip on the focus and gone with Escape; the old page's
   uses, which give no greyed tab, unchanged.
3. The words of each reason from each kind of `TabGreyed`, asserted
   whole, under `AP1 D3` (the screen spec, "Its words", the rows of the
   tabs).
4. Flows under `AP1 D4` in a new `e2e/popgen2Tabs.spec.ts`, the bullet
   "The row of tabs" of the screen spec's "How it is checked", In
   Playwright, whole: the tabs greyed before a file, while `panel.nei`
   opens, once open, and with `panel_pops.csv`; the keyboard on a greyed
   tab; the PCA tab shown, then another variants file opened, the reason
   in its place; 320 px. And axe, the checker of accessibility the tests
   run, with each tab shown, light and dark.
5. The page as before otherwise: the flows of `popgen2.html` pass, each
   changed only for the new names of the two tabs, named in the commit
   message.
6. The screenshots `popgen2-tabs-greyed` (no file, the focus on PCA with
   its tooltip), `popgen2-tabs-open` (`panel.nei` open, Distances
   greyed) and `popgen2-tabs-not-built` (Populations shown), light and
   dark, at 1280 and 320 px.
7. The first load before and after, written under "What was done".

Tasks:

- [ ] 1.1 `analysisTabs` in `src/core/popgen2Tabs.ts` (the tabs spec,
  whole). Deliverable 1. A wrong reason sends the user to fix what is
  not broken and a tab greyed by mistake hides an analysis, with nothing
  else to show it; so this is a commit of its own, guarded by
  deliverable 1.
- [ ] 1.2 The greyed tab in `src/ui/widgets/Tabs.tsx`: a tab item gains
  its reason, and the widget refuses its choice, keeps it in the order
  of the arrow keys, sets `aria-disabled` after each drawing and wraps
  it in `WithTooltip` of `src/ui/widgets/Tooltip.tsx` (the screen spec,
  "The row of tabs", "A greyed tab" and "Accessibility"; the design, "A
  greyed tab, for every user", option (b)). Deliverable 2. May run
  beside 1.1.
- [ ] 1.3 The page: the five tabs in `src/ui/variants/VariantsPage.tsx`
  named "Files and analyses", the words of the reasons, the lines "Not
  built yet", a tab greyed while shown with its reason in its place, all
  five kept drawn (the screen spec, "The order of the page", "The row of
  tabs", "The tabs not built yet", "Its words"). Deliverables 3, 4, 5
  and 7. Stands on 1.1 and 1.2.
- [ ] 1.4 The screenshots. Deliverable 6.
- [ ] 1.5 Only if deliverable 2 or 4 finds `aria-disabled` lost in a
  browser: the tab built from React Aria's `useTabList` and `useTab`,
  the design's option (b2), with the same tests.

What could go wrong: the tooltip around a tab. React Aria's
`TooltipTrigger` gives its trigger its handlers through a context, and
a `Tab` is drawn by its `TabList`; the architecture reviewer saw it
work in jsdom only. Deliverable 4 reads the tooltip on the focus and on
the mouse in both engines.

## Work package 2: the PCA's module on popgen2.html

What it gives, in the words of work package 6: the PCA of the PCA tab
reads the variants the Variants tab keeps, its own missing data and MAF
the stricter of its value and the Variants tab's; its LD pruning starts
on at r² 0.1 with no distance; the individuals file never locks it and
only colours its points, the individuals with no population drawn as
"Unclassified"; its coordinates give the CSV that vavilov-explorer, the
owner's desktop application, imports; and its commands have this page's
descriptions. The old page's PCA does not change.

Deliverables:

1. `pcaFilters` with the page `"popgen2"`: each row of the table of the
   PCA spec's "On popgen2.html", "How it is verified", as literals; the
   same inputs twice, the same frozen value; with `"popgen"`, the old
   rows unchanged. Under `AP2 D1` in `src/core/analyses/pca.test.ts`.
2. The key, `needs` of `pcaOnPopgen2`, `pcaColours` with
   `"popgen2"` and `pcaCoordinatesCsv`: each bullet of that section
   for them, under `AP2 D2`. `POPGEN2_ANALYSES` of `src/core/apps.ts`
   lists `pcaOnPopgen2` after `variantsSummary`, under `AP2 D2` in
   `src/core/apps.test.ts`.
3. The commands given the page, under `AP2 D3` in a new
   `src/ui/analyses/pca/commands.test.ts`: the description of each row
   of the PCA in the screen spec's table "What is a step", under the PCA
   and under the PCoA; `stricterCommand` sets `follow` false and the
   value in one step; a change of the colour of the points on
   `popgen2.html` keeps the LD pruning on (the case the PCA spec gives
   for `OptionsOf` made for a page).
4. The numbers of the flows of work package 6, each run with the script
   of the PCA spec's "How it is verified" under node with popnei 0.2.2:
   those "On popgen2.html" lists, and the three it does not (above,
   "Before the first task"). Each one that differs from the screen spec
   is corrected there first, with its commit, before a flow reads it.
5. The old page unchanged: its Vitest tests of the PCA pass, changed
   only by the page argument `"popgen"`; the old page's flows of the
   PCA pass in the browser check.

Tasks:

- [ ] 2.1 `pcaFilters` by the page and the key (the PCA spec, "On
  popgen2.html", "What differs", its first and fourth bullets, and "The
  TypeScript interface"). Deliverable 1, and the key of deliverable 2. A
  filter given wrongly to popnei, or a key that misses the narrowing,
  would give a PCA of other variants than the screen says, or a stale
  one; so this is a commit of its own, guarded by those tests.
- [ ] 2.2 The rest of the module: `PCA2_DEFAULTS`, `pcaOptions`,
  `pcaOnPopgen2` with its `needs`, the words by the page, `pcaColours`
  with "Unclassified" and the comment of `coloursOf`,
  `pcaCoordinatesCsv`, and the listing in `src/core/apps.ts` (the same
  section, the rest of "What differs", "The cases"). The rest of
  deliverable 2. Stands on 2.1.
- [ ] 2.3 The commands of `src/ui/analyses/pca/commands.ts` given the
  page, `stricterCommand`, and every caller of the old page given
  `"popgen"` (the same section, the paragraph of the commands; the
  screen spec, "What is a step"). Deliverables 3 and 5. Stands on 2.2.
- [ ] 2.4 The numbers. Deliverable 4. May run beside 2.1.

What could go wrong: a memo of `pcaFilters` or `pcaColours` looked up
without the page, which would give one page the other's list; the PCA
spec asks for the page in the memo's lookup, and deliverable 1 asks the
two pages in turn on the same project.

## Work package 3: the store's two settings, and the individuals file's changes as no steps

What it gives, in the words of work packages 4 and 6: on `popgen2.html`
a change that alters what a running PCA reads stops it at once, and
leaves no notice; an Undo brings a result back from the cache with no
calculation; and opening, removing or reading again the individuals
file, and the column the page chooses at the end of its read, leave
nothing to undo.

Deliverables:

1. The store: each bullet of the store spec's "`stopLeftBehind` and
   `applyAfresh`" in "How it is verified", under `AP3 D1` in
   `src/core/store.test.ts`, with the store made by
   `createPopgen2Store` and a fake `send` that records each request and
   its `cancel()`. At least 10 tests.
2. The gate: a run of the arrow keys waiting, and a number typed and
   not applied, made changes before `applyAfresh`, and nothing left to
   undo after it, under `AP3 D2` in `src/ui/variants/thresholdRun.test.ts`.
3. The individuals file: the opening, the removal and a change of an
   option of the reader sent through `applyAfresh`, and the column the
   user chooses, or None, through `apply` with its description, under
   `AP3 D3` in `src/ui/variants/IndividualsBox.test.ts` and beside
   `IndividualsTab.tsx`; the column the entry chooses through
   `applyAfresh`, each case of `entry.md`'s "Verified with Vitest" for
   `choosePopulationColumns` as revised, under `AP3 D3` in
   `src/ui/populationColumn.test.ts`.
4. `src/core/history.ts` and its tests untouched; the flows of
   `popgen2.html` pass untouched, since the page draws no Undo until
   work package 4.

Tasks:

- [ ] 3.1 `stopLeftBehind` in `src/core/store.ts`, given by
  `src/ui/popgen2Store.ts` (the store spec, "On popgen2.html: no notice,
  and a history of the filters", its bullets of `stopLeftBehind`, and
  the interface of `createStore`). Deliverable 1, its bullets of the
  setting. A calculation left behind and not stopped runs out of sight
  with the worker and up to 3 GB of the tab; so this is a commit of its
  own. The answer to question 2 changes this task.
- [ ] 3.2 `applyAfresh` in the store and in the gate (the same section,
  its paragraphs of `applyAfresh` and of the gate; `Store` in the
  interface). The rest of deliverable 1, and deliverable 2. Stands on
  3.1. The answer to question 1 changes this task.
- [ ] 3.3 The commands of the individuals file in
  `src/ui/variants/IndividualsBox.tsx` and `IndividualsTab.tsx`, and
  the entry's column in `src/ui/populationColumn.ts`, through
  `applyAfresh` (`popgen2-input.md`, "What it sends and reads", its
  paragraph of 9 October 2026; `entry.md`, "The column of the
  populations on popgen2.html"). Deliverables 3 and 4. Stands on 3.2.
  The answer to question 1 changes this task.

What could go wrong: a result that a stopped request gives after its
`cancel()`. The store spec has it cached under its own key and shown
only when the project gives that key again; deliverable 1 has a test
that gives the result after the change and reads the PCA `ready`, then
`done` after an undo. And the one pass: no command changes its key, so
the setting must never stop it; a test of deliverable 1 reads it still
in flight after `applyAfresh`.

## Work package 4: Undo and Redo at the top right corner

What it gives, on `popgen2.html`: Undo at the right end of the line of
the heading "Popnei" once a threshold, the FILTER box or the column of
the populations has changed, naming its step in its tooltip; Redo beside
it after an undo; neither when there is nothing to take, nor after
either file is opened; Ctrl+Z and Cmd+Z undo anywhere on the page but in
a number box with something typed.

Deliverables:

1. `UndoRedoButtons` of `src/ui/shell/` with this page's setting, in
   jsdom under `AP4 D1` in a new `src/ui/shell/UndoRedoButtons.test.ts`:
   each button drawn only while it has a step, Undo also while a run of
   the arrow keys waits, Redo not then; the place of a hidden button kept,
   so the other does not move; at the last step the focus from Undo to
   Redo and from Redo to Undo; a button with the focus removed by a
   command, the focus on the heading "Popnei"; the old page's buttons,
   always drawn and disabled with no step, unchanged.
2. The keys caught on the whole window from the page's opening, under
   `AP4 D2` in `src/ui/shell/shortcuts.test.ts`: each row of the screen
   spec's table of the keys that a test in node can reach.
3. Flows under `AP4 D3` in `e2e/popgen2Undo.spec.ts`: the bullet "Undo
   and Redo" of the screen spec's "How it is checked", In Playwright, but
   the PCA's two, which are work package 6's; the tooltip and the words
   of the status region for a threshold, the FILTER box and the column of
   the populations; no button after `panel_pops.csv` is opened, read and
   given its column. The flows of that file before commit 34b3ff0, which
   hid the buttons, are brought back where they still hold, and the
   flows `SF6` that check there is no Undo are replaced; each flow
   removed is named in the commit message. Axe with the buttons shown,
   light and dark.
4. The screenshots `popgen2-undo` (Undo alone) and `popgen2-undo-redo`,
   light and dark, at 1280 and 320 px; the line of the heading the same
   height with and without them, read from the flows of deliverable 3.

Tasks:

- [ ] 4.1 `UndoRedoButtons` with the setting, the places that stay, and
  the focus (the screen spec, "Undo and Redo", "Where", "When", "The
  focus"; the design, "What changes in the code" of "Undo and Redo").
  Deliverable 1.
- [ ] 4.2 The buttons in the line of the heading of
  `src/ui/variants/VariantsPage.tsx`, where its comment of 8 October
  2026 keeps their place, and the keys on the whole page (the screen
  spec, "Undo and Redo", "What is a step", "What they say", "The keys";
  `popgen2-filters.md`, "Undo, Redo and their keys", its paragraph of 9
  October 2026). Deliverables 2, 3 and 4. Stands on 4.1.

What could go wrong: a click on the FILTER box in Safari does not take
the focus, so Redo, focused, can be removed by a command from a control
that leaves the focus where it was; deliverable 1 tests the focus moved
to the heading whatever removed the button, and WebKit in deliverable 3
clicks the box with Redo focused.

## Work package 5: "Download…" on every table and plot

What it gives, on `popgen2.html`: each histogram of the Variants tab,
the table of the Individuals tab and the counts per population of the
box of the individuals file has a button "Download…" whose menu saves
the table as CSV, or the plot as SVG or PNG and its data as CSV. A
histogram's menu waits for the end of the one pass. The PCA's tables and
plot get theirs in work package 6, from the same components.

Deliverables:

1. `tableCsv`, `binsCsv` and `downloadName` in `src/core/csv.ts`: each
   bullet "With Vitest, in node" of the downloads spec's "How it is
   verified", under `AP5 D1`.
2. The widgets, each bullet "With Vitest and React Testing Library" of
   the same section, under `AP5 D2`: `DownloadMenu`, the CSV of a sorted
   `SortableTable` and of a `Table`, a table given a download and a row
   with no values a defect, a PNG refused, a menu waiting.
3. `usePlot` gives the handle beside the ref; the heatmap and the line
   plot of the old page take the ref, and the old page's flows of the
   distances between populations and of the LD decay pass
   (`e2e/popDists.spec.ts`, `ldDecay.spec.ts`).
4. Flows under `AP5 D4` in a new `e2e/popgen2Downloads.spec.ts`, the
   bullet "The downloads" of the screen spec's "How it is checked", In
   Playwright, but the PCA's: each menu opened and chosen with the
   keyboard alone; the table of the Individuals tab sorted, saved and
   read back in that order; the counts per population saved; the SVG of
   a histogram with its threshold's line; a histogram's menu disabled,
   with its tooltip, while the pass is held; "Saving …" in the status
   region; axe with a menu open, light and dark.
5. The time of "Table as CSV" on the table of
   `e2e/fixtures/individuals_10000.xlsx` under the Individuals tab, 10,000
   rows of 20 columns: the time the page does not answer, as `IN6 D4` of
   `e2e/measure.spec.ts` measures a sort of the same table, the median of
   five, under `AP5 D5` by the measurement run, written under "What was
   done" with the engines' versions and the machine. Above 200 ms in
   either engine is a stop ("The stops").
6. The screenshot `popgen2-download-menu` (a histogram's menu open) and
   `popgen2-download-waiting` (its tooltip while the pass is held), light
   and dark, at 1280 and 320 px; the first load after, against work
   package 1's, under "What was done": React Aria's menu joins it.

Tasks:

- [ ] 5.1 `src/core/csv.ts` (the downloads spec, "A table", "A plot",
  "The names of the files", "The TypeScript interface"). Deliverable 1.
- [ ] 5.2 `DownloadMenu` in `src/ui/widgets/`, and the values and the
  download of `SortableTable.tsx` and `Table.tsx` (the same spec, "The
  menu", "A table", "The cases"). Deliverable 2. Stands on 5.1. A CSV
  of the rows in view, or of the texts in place of the values, would
  look right in a spreadsheet and hold other numbers; deliverable 2
  guards it.
- [ ] 5.3 `usePlot`'s handle, and the download of `HistogramPlot.tsx`
  (the same spec, "A plot", the interface of `usePlot`). Deliverable 3.
  Stands on 5.2.
- [ ] 5.4 The menus on the page: the six histograms with their waiting
  reason (`src/ui/variants/StatsHistogram.tsx`, `statsPlots.ts`), the
  table of the Individuals tab and the counts of the box
  (`IndividualsTab.tsx`, `IndividualsBox.tsx`), each with the `what` and
  the file names of the screen spec's "The downloads". Deliverable 4,
  and the screenshots of 6. Stands on 5.3 and on 3.3.
- [ ] 5.5 The measurement, alone on the machine, and the first load.
  Deliverable 5 and the rest of 6.

What could go wrong: a download in WebKit under Playwright, and a PNG
made from the SVG there. Deliverable 4 saves a file of each kind in both
engines and reads it back; a PNG of a plot is saved in work package 6.

## Work package 6: the PCA tab

What it gives, on `popgen2.html`: the user opens the PCA tab once the
variants file is open, chooses PCA or PCoA, keeps the PCA's missing data
and MAF as in the Variants tab or makes them stricter, types the
distance of the LD pruning, or turns it off, and presses Run once the
one pass has ended; they see the plot in 3D or in 2D coloured by
population or by a column of the individuals file, the unclassified as
rings, the explained variance and the coordinates of each individual,
the warnings of the old panel in this page's words, and download the
plot, its coordinates and the tables. A change of what the PCA reads
takes the result off the screen, and an Undo brings it back.

The tab draws the old page's frame of a panel,
`src/ui/analyses/AnalysisPanel.tsx`, with the PCA's parts of
`src/ui/analyses/pca/` given the page, and the lock of the one pass
beside the store's locks; the old page's panel takes the page
`"popgen"`. The design left this choice to the plan ("What changes",
its last paragraph): one frame for both pages, where a second frame
would repeat the states of a calculation the old page's flows already
check. If the frame cannot take the lock of the one pass, or the page,
without a change the old page would see, the task stops and reports.

Deliverables:

1. `stricterBound` and `stricterLines` of
   `src/ui/analyses/pca/stricter.ts`, and `passLock` of `passLock.ts`:
   each of their bullets of the screen spec's "How it is checked", In
   Vitest, under `AP6 D1`.
2. The store of the page with the PCA, a fake worker and the real
   history, under `AP6 D2`: an undo of a change that removed the PCA's
   result gives `done` with no request; a PCA running when a threshold
   changes is stopped at once, and an undo gives `ready`.
3. Flows under `AP6 D3` in a new `e2e/popgen2Pca.spec.ts`, the bullets
   "The PCA", "Its filters", "The PCoA", "A change during a run" and
   "Kept drawn" of the screen spec's "How it is checked", In Playwright,
   whole; its Undo bullet's two of the PCA (the plot back with no
   request; Ctrl+Z with a menu open); its downloads bullet's three of the
   PCA (the CSV of the plot read back with its header and the row of
   `s000`, the table sorted by PC1, a PNG of the 3D view); and these of
   the states and words of the screen spec: the PCA tab shown, another
   variants file opened, its reason in place of the options; "PCA of
   panel.nei calculated." in the status region while the Variants tab is
   shown; the download of the filtered variants waiting with its words
   while a PCA is held; axe in each state of the tab, light and dark.
4. The old page as before: the old page's flows of the PCA pass in the
   browser check.
5. The screenshots of the screen spec's "The screens" for the PCA tab:
   `popgen2-pca-locked`, `-ready`, `-running`, `-3d`, `-2d`, `-pcoa`
   (with its warning) and `-menu`, light and dark, at 1280 and 320 px.
6. The first load after, against work package 5's, under "What was
   done". If the PCA tab's code adds more than 50 KB gzipped, the bound
   the design set, task 6.6 loads it the first time the tab opens.

Tasks:

- [ ] 6.1 `stricter.ts`, `passLock.ts`, and the tab's words (the screen
  spec, "Its filters", "Run and Stop", "Its words", the rows of the
  PCA). Deliverable 1. The answer to question 2 adds the words of the
  line of a PCA of earlier filters.
- [ ] 6.2 The download of the filtered variants waiting while a PCA
  runs: `popgen2-download.md` first (above, "Before the first task"),
  then `downloadPlace` and its words. Its flow is in deliverable 3. A
  write let through while a PCA runs waits in the queue behind it with a
  bar that does not move; so this is a commit of its own.
- [ ] 6.3 The tab up to its run: the options with the method, the two
  filters that narrow and the LD switch, the line of the individuals,
  Run and Stop with the locks, the running state, the errors, the end of
  a run said in the status region, mounted in the PCA tab of
  `VariantsPage.tsx` (the screen spec, "The PCA tab" up to "The result",
  "The states", "What it sends and reads", "Accessibility"). Deliverable
  2 and the flows of deliverable 3 that end before a result is drawn.
  Stands on 6.1. The answer to question 2 adds the line and its Stop.
- [ ] 6.4 The result: the title, the bar of controls, the plot in 3D and
  in 2D, the legend with "Unclassified", the explained variance with the
  PCoA's line, the table of the individuals, the warnings and notes, and
  the menus of the PCA's plot and tables with `pcaCoordinatesCsv` (the
  screen spec, "The result", "The downloads"; the downloads spec, "A
  plot", "The cases"). The rest of deliverable 3, and 4. Stands on 6.3.
- [ ] 6.5 The screenshots and the first load. Deliverables 5 and 6.
- [ ] 6.6 Only if deliverable 6 finds more than 50 KB: the PCA tab's
  code loaded the first time the tab opens, as three.js is, and the
  first load measured again.

What could go wrong:

- The lock of the one pass reads two places, the store's state of the
  pass and the code that starts it by itself, `src/ui/autoRuns.ts`;
  read from the store alone it frees Run for the instant before the pass
  starts, and the PCA slips ahead of it into the queue. `passLock`'s
  case "about to start" guards it, and the flow holds the pass.
- The 3D view in a hidden tab: it keeps its WebGL context and draws
  again only when its box has a size. "Kept drawn" turns it, shows the
  Variants tab and back, in WebKit too; a blank view is a stop.
- Three.js, 134 KB gzipped, downloaded at the first 3D view: the PCA's
  menu waits with "Download once the 3D view is drawn." meanwhile.

## Work package 7: the memory and the time of a PCA after the one pass

What it gives: whether a PCA and a PCoA of up to 9,381 individuals, the
largest popnei calculates in a tab, still fit on this page, where they
run in the calculation worker that has just made the one pass, whose
memory a wasm never gives back. The old page measured them on 29
September 2026 with no pass before them: up to 3.0 GB in Chromium and
3.1 GB in WebKit for the PCA of 9,381, and once 4.10 GB grown in WebKit
for the PCoA (the PCA spec, "How it runs").

Deliverables:

1. The measurement, under `AP7 D1` in `e2e/measure.spec.ts`, on
   `popgen2.html`, with the gzipped VCFs of 300 variants of
   `e2e/bigVcf.ts` of 1,000, 4,000 and 9,381 individuals that `IP6 D6`
   of the same file uses, and with its helpers of the memory of the
   engine's processes summed. The PCA's LD pruning turned off, so that
   the runs compare with `IP6 D6`, which ran with no LD filter. For each
   size, each method and each engine, on a new page, the Run pressed
   once the one pass has ended: whether it gave a result, failed, or
   closed the tab; the time from Run to the result; the memory held
   before the file was opened, at the end of the pass, at the peak of
   the run, sampled as `IP6 D6` samples, and 3 s after the result. Once
   each, each size and method a command of its own within the
   foreground's limit, alone on the machine.
2. The decision, written under "What was done" with the engines'
   versions, the machine and the load, beside `IP6 D6`'s numbers in the
   same units; and in the PCA spec's "How it runs" and the design's
   "The memory and the time" and "The costs of the web" as measured on
   the day. The rule, set before the run: every run that `IP6 D6`
   completed completes here too, in both engines, and nothing changes; a
   run that fails or closes the tab where `IP6 D6` completed it is a
   stop ("The stops"), with two options for the owner, the calculation
   worker started again at the end of the one pass before any Run, which
   gives the pass's memory back at the cost of opening the file's header
   again, or a lower limit of individuals on this page; the session
   recommends the first. A peak in WebKit above the old page's 4.10 GB
   that completes is no stop, and goes into the report with its number.

Tasks:

- [ ] 7.1 The measurement and its runs, alone on the machine.
  Deliverables 1 and 2. Stands on task 6.3.

What could go wrong: a footprint that falls back under the system's
pressure, or another agent building, would hide what the run holds; the
run is alone on the machine for that reason, and its load averages are
written beside the numbers.

## Work package 8: the flow of the old page that failed once on GitHub

What it gives: the check of the site on GitHub no longer fails, and so
no longer stops a publication, on the flow `WS7 D3 a file picked before
popnei has loaded is shown as being read` of `e2e/variants.spec.ts`. In
run 37932799753, first attempt, job "e2e (firefox 3/3)", it failed at
its line 645, waiting 5,000 ms for the text "1 second so far." in the box
of the variants file, "element(s) not found", and passed on its retry.
The clock of a file being read says "1 second so far." only from one to
two seconds after the pick, and then "2 seconds so far."; the check
passes only if it looks within that second, which a slow runner can
miss.

Deliverables:

1. The check reads the line of the clock with any whole number of
   seconds from 1, so that it still checks what the flow is for: a file
   picked before popnei has loaded is shown as being read, with its
   clock. Under `AP8 D1`, a name the flow gains at its start.
2. A pause of 2.5 s put before the check, and not committed: the old
   check fails and the new one passes, in Chromium and WebKit.
3. `--repeat-each=10` of the flow passes in both engines. Firefox is seen
   only on GitHub, after a push the owner orders.

Tasks:

- [ ] 8.1 The check of the clock in `e2e/variants.spec.ts`.
  Deliverables 1 to 3. May run beside any work package, but its browser
  runs wait for the browser to be free.

## Work package 9: the end

- [ ] 9.1 The session's own look: it reads every screenshot of work
  packages 1, 4, 5 and 6 with `Read`, state by state, in both themes and
  both widths, and checks that each state of the screen spec's table
  "The states", and each greyed tab, menu and button of Undo, is there
  and readable; what it finds is a fix sent to a subagent, test first,
  before 9.2.
- [ ] 9.2 The checks of the `coding` skill on the last commit, and the
  browser check of the whole suite in Chromium and WebKit, in chunks of
  spec files that each end within a foreground command: the old page's
  flows of the PCA and of the analyses; its other flows; the flows of
  `popgen2.html`; the rest; split again if a chunk passes 9 minutes. The
  counts of each chunk, and of the screens run, recorded below; a flaky
  test is run again three times and named.
- [ ] 9.3 The documents: `docs/architecture.md`,
  `docs/functionality.md` and `docs/technology.md` checked against what
  was built, the sizes and the measurements of work packages 5, 6 and 7
  put where those documents give an estimate; each spec of this plan
  says it is built on the branch `pca-tab`, with what a round changed;
  the design's notes as built; "What was done" complete.
- [ ] 9.4 The instructions of the project, by the session itself and not
  by a subagent, since they are what every later session reads: the
  `coding` skill's `react.md` says Undo and Redo are "always in the
  header" and gives the notice of removed results as the rule; each
  place in `CLAUDE.md` and `.claude/` that describes Undo, the notice or
  the tabs found with `grep -rn -i "undo\|notice" CLAUDE.md .claude/`
  says what `popgen2.html` now does where it differs. The report lists
  the files.
- [ ] 9.5 The report to the owner, as the `building` skill says, with
  the stops met first, if any; the answers to the two questions and what
  the plan followed where they were not given; the measurements of work
  packages 5 and 7 and what they decided; the sizes; what the review
  found and fixed and what it did not take; the browsers the screens
  were seen in, Chromium in the screenshots and Chromium and WebKit in
  the flows, and those not seen, Safari, Firefox and Chrome; the change
  to the instructions; and how to try the page: `npm run dev` in the
  worktree, `popgen2.html`, and the files `e2e/fixtures/panel.nei`,
  `panel_pops.csv` and `panel_meta.csv`, with the states worth going
  through.

## Work package 10: the owner tries the page

- [ ] 10.1 The owner tries the page and answers: whether the screen is
  accepted; the choices of the screen spec's "Choices made by the
  session" and of the design's "What the session decided"; the two
  questions above, if not answered before; whether Safari and Firefox
  show the greyed tabs, the menus and the 3D view as Chromium does; and
  what VoiceOver says, in Safari, of the items of the screen spec's "Not
  yet heard in VoiceOver".
- [ ] 10.2 The rounds. Two are expected. Each change the owner asks for
  goes into the screen spec first, then into the code, with its commit
  and its screenshots taken again; a change that reaches `src/core/`,
  the worker or `docs/functionality.md` is said to the owner as such and
  becomes a task of its own. After a round that changed the markup, the
  `accessibility`, `react` and `ux` reviewers run again.
- [ ] 10.3 The owner accepts the screen, and the screen spec says what
  the screen now is. The branch is merged into `main` when the owner
  says so.

## The categories of each review

The `code-review` skill's four that always run, `spec`, `tests`,
`stale` and `errors`, for every work package that changes code, with:

- 1: `api`, `architecture`, `react`, `accessibility`, `ux`, `browser`
  (an attribute set outside React Aria, the tooltip of a tab), `bundle`,
  with its screenshots;
- 2: `api`, `architecture` (a module shared by two pages);
- 3: `api`, `architecture`;
- 4: `api`, `react`, `accessibility`, `ux`, `browser` (the keys, the
  focus in Safari's engine), with its screenshots;
- 5: `api`, `architecture`, `react`, `accessibility`, `ux`, `browser`
  (downloads, the PNG), `bundle` (React Aria's menu), with its
  screenshots;
- 6: `api`, `architecture`, `react`, `accessibility`, `ux`, `browser`
  (WebGL in a hidden tab), `bundle`, with its screenshots;
- 7: `spec` and `tests` alone, on the test code;
- 8: `tests` and `stale` alone;
- 9: `browser` on the whole branch, as the skill asks before a plan is
  done.

## What was done

Nothing yet. Each work package adds its entry here: its commits, the
counts of its checks, its review, and what it did differently from the
plan.
