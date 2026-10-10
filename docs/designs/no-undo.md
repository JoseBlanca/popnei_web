# No Undo on popgen2.html: the PCA calculated again at each change

A design of 10 October 2026, a draft for the owner's approval. It
decides how `popgen2.html` loses its Undo and Redo and calculates the
PCA again by itself whenever a parameter it reads changes, "the marimo
model" the owner asked for on 10 October 2026 (`docs/plans/analyses-pca.md`,
"Work package 10, round 1", item 4, and the owner's three answers after
it). It touches sections 2, 3, 5, 7, 9, 11 and 12 of
`docs/architecture.md`, and the specs `docs/specs/core/store.md`,
`docs/specs/core/history.md`, `docs/specs/steps/popgen2-pca.md`,
`popgen2-filters.md` and `popgen2-download.md`. The old page,
`popgen.html`, which is to be deleted, keeps its Undo, its notice and
its cache as they are.

## The design in short, for the owner

- The PCA becomes live for a variants file the first time the user
  presses its Run for that file. From then on, a change of anything the
  PCA reads, a threshold or the FILTER box of the Variants tab, or an
  option of the PCA tab, starts it again by itself, and a change made
  while it runs stops it and starts it on the new values. Opening
  another variants file ends the live state.
- The PCA starts at once when a change reaches the project: a run of
  presses of the arrow keys on a threshold reaches it one second after
  the last press, a drag when the mouse button is released, a typed
  number at Enter, Tab or a click elsewhere. No second is added after
  those.
- No result is kept for a parameter set back: the page keeps only the
  results of the values on the screen.
- Undo and Redo, their buttons and their keys go from the page, and so
  does the greying of the filters while a PCA runs.
- The code that already starts the one pass by itself, `src/ui/autoRuns.ts`,
  starts the PCA too; the store of core gains one setting, and loses
  nothing that `popgen.html` uses.
- Each change during a long PCA throws away the minutes it had run: a
  PCA of 9,381 individuals takes 2 to 4 minutes and 3 to 4.3 GB of the
  tab. Four questions are left for the owner, at the end.

## The words used below

- **The project** is the one value that holds what the user has chosen:
  the variants file, its filters, the individuals file, the options of
  each analysis (`docs/architecture.md`, section 2). Each change of the
  user is a command that gives a new project.
- **A key** is a hash of everything a result is calculated from, made
  from the project (section 3). A change of a threshold gives the PCA a
  new key; a change of the colour of its points does not.
- **The cache** is where the page keeps results, under their keys, up to
  256 MB. The screen shows for an analysis the result under the key the
  current project gives it, and nothing when there is none.
- **The history** is the list of past projects that Undo and Redo walk,
  `src/core/history.ts`, at most 200 of them.
- **The store** is the part of `src/core` that holds the project, the
  history, the cache and the state of each calculation, and starts and
  stops the calculations.
- **The calculation worker** is the second thread of the tab, a web
  worker, where popnei runs, so that the page does not freeze. It runs
  one calculation at a time. A calculation inside it cannot be told to
  stop: a cancel ends the worker and starts a new one, which opens the
  variants file again (section 5).
- **The one pass** is the calculation `popgen2.html` starts by itself
  when a variants file is opened, which reads the whole file once and
  gives its statistics and histograms. It reads no filter, and the PCA
  waits for its end.
- **The gate** is the code of `src/ui/variants/thresholdRun.ts` that
  turns a run of presses of the arrow keys on a threshold, less than a
  second apart, into one change of the project, made one second after
  the last press, or at once when the user does something else.
- **Live**: the PCA is live for a load of the variants file once its Run
  has been pressed for that load. A load is one pick of the file, with
  an id of its own, the same file picked again included (section 3).

## The problem, and what forces it

The user of `popgen2.html` looks for clusters of individuals
(`docs/use-cases.md`, case 3): they set the filters of the variants and
of the individuals, run the PCA, look, move a filter, and look again.
With Undo, the page kept every past project, every result in the cache
for an undo to bring back, and, since 9 October 2026, greyed the filters
while a PCA ran, so that no change stopped it unseen. The owner asked
on 10 October 2026 for the model of a marimo notebook instead: what is
on the screen is always the result of the values shown, calculated
again whenever they change, and nothing to undo.

It is more than a screen removed, for four reasons:

1. **The PCA has never started by itself.** Only the one pass does,
   through `src/ui/autoRuns.ts`, which starts each calculation once per
   key and never again under a key it already started. A filter set
   back to its old value gives back an old key, and under that rule the
   PCA would not start.
2. **The cache brings results back.** A filter set back gives the old
   key, the cache still holds its result, and the store shows it with
   no calculation. The owner asked that it be calculated again.
3. **A cancel is a restart of the worker.** Every change during a run
   ends the calculation worker, which loses the time the PCA had run;
   with the lock of the filters gone, this happens at every change a
   user makes while a PCA runs.
4. **Undo is woven into the store and the screens**: the gate's wraps
   of Undo and Redo, the buttons, the keys caught on the whole window,
   the number box's handling of Ctrl+Z, the lock that makes Undo wait,
   and `applyAfresh`, a command that exists only so that the changes of
   the individuals file leave nothing to undo.

## The options and the choices

### 1. Where the automatic start lives

**(a) In `src/ui/autoRuns.ts`, as a second group after the one pass.**
That module already starts a calculation by itself, one at a time, only
when nothing runs, and waits for the group before it, the one pass,
to end: the PCA would get the wait for the one pass that its Run lock
gives it today (`passLock.ts`) for free. It needs three things more: to
start the PCA's group only while the PCA is live; to forget the key it
started the PCA under once the store has left that key behind, the
owner's choice of 6 October 2026 for the first analysis that starts by
itself and reads a filter (section 5); and to be told when Run is
pressed. About 60 lines of code and their tests in node, on the real
store, as the module's tests are now.

**(b) In the store of core, as a setting that names the analyses to
start again after a change.** The store already stops at once what a
change leaves behind (its setting `stopLeftBehind`), so it would start
the new key in the same place. But the outcome of every calculation is
awaited by `src/ui/runs.ts`, which shows a failure of ours in the error
bar; a calculation started inside core would have nobody awaiting it,
and moving that awaiting into core is a design of its own
(`.claude/skills/designing/SKILL.md`, "The store and who awaits a
run"). The live state, and the wait for the one pass, which only
`autoRuns.ts` can tell from a pass about to start, would have to move
into core too. Several hundred lines across core and its spec.

**Recommended: (a).** It reuses the rule the page already follows for
the one pass, and changes no interface between the layers. (b) would
win if a second page needed the same behaviour with no `src/ui` of its
own, which no plan has.

### 2. When the PCA starts after a change

The owner asked for "about 1 s after the user stops moving the
control". The project changes at three moments today: a run of the
arrow keys one second after its last press, through the gate; a drag
when the mouse button is released; a number typed at Enter, Tab or a
click elsewhere.

**(a) At once, when a change reaches the project.** The arrow keys
start the PCA one second after the last press; a drag or a typed number
start it at the moment the user lets go or confirms, which is when they
stopped. A second control changed within the following second stops
the PCA just started, and the cost of that stop is the restart of the
worker, at most 49 ms (below, "The cost of a stop"), plus under a
second of PCA lost. No timer of its own: `autoRuns.ts` is already called
after every change of the store.

**(b) After one second with no change of the project**, the owner's
first choice of 6 October 2026 for the filters. The arrow keys then
start the PCA two seconds after the last press, the gate's second and
this one; a drag or a typed number one second after. It spares the
stop of (a) when two controls change within a second, at the cost of a
second of waiting after every change, during which the tab has no
result and no bar.

**Recommended: (a).** The gate already gives the arrow keys the second
the owner asked for, and a release or an Enter is the user's own end of
the change; the stop that (b) would spare costs under a second of
calculation. (b) would win if users often changed two controls in a
row with the mouse during a PCA of thousands of individuals; then each
second change would throw away more. Whichever is chosen, the PCA's own
sliders, new in round 1 of the plan, must pass through the gate as the
thresholds do: otherwise every press of an arrow key on them is a
change of the project, and under (a) a stop and a start of the PCA.

### 3. Where "live" is recorded

**(a) In `autoRuns.ts`, as the load id for which Run was pressed.** A
new variants file is a new load, so it ends the live state with no code
of its own; a reload of the page ends it too, as it ends everything on
that page, which saves no project. It is a record of what the user
asked to run, as the keys `autoRuns.ts` started are, and no input of
any result.

**(b) In the project, as a field of the PCA's options.** It would be
seen by core and by the tests of core, but the project's type is shared
with `popgen.html` and its project file, whose validation would gain a
field that page never sets; the command that opens a file would have to
clear it; and a field of the options must be kept out of the PCA's key
by hand, where a mistake would give the PCA a new key, and a new
calculation, at the press of Run itself.

**Recommended: (a).** (b) would win if `popgen2.html` ever saves its
project to a file and the live state should come back with it.

What a Stop does is the owner's to decide (open point 1).

### 4. The history

**(a) Keep the history in the store, and give `popgen2.html` a store
whose type has no `undo` and `redo`**, so that no screen of that page
can call them, with at most one step kept instead of 200. The buttons,
the keys, the gate's wraps of Undo and Redo and the waiting of Undo go;
`applyAfresh` stays, now the same as `apply` on that page. A few lines
in core, none in `history.ts`.

**(b) A setting of the store with no history at all**, under which a
command replaces the project and `applyAfresh` and the event that
writes the chosen column into past projects lose their reason. Cleaner
on that page, but a second way through every command of a store of
2,971 lines, for a page whose old sibling still needs the first way.

**Recommended: (a)**, and the history, the notice and `applyAfresh`
removed from the store whole when `popgen.html` is deleted, as the owner
decided it will be on 9 October 2026. (b) would win if `popgen.html`
were to stay.

### 5. The cache

**(a) A setting of the store, true on `popgen2.html` only: after every
change, every result whose key the new project gives to no analysis
leaves the cache, and a result that arrives under such a key is not
kept.** The one pass's result stays, since no filter changes its key,
and so do its histograms and the statistics that the individuals kept
are worked out from. A filter set back gives a key with nothing under
it, and the PCA starts again.

**(b) Keep the cache, and have `autoRuns.ts` start the PCA again even
when the cache holds its result.** The store shows the result in the
cache the moment the key comes back, so the old result would show for
the minutes of the new calculation, and then be replaced by an equal
one: not what the owner asked, answer 3.

**(c) A cache bound of zero bytes on that page.** It would drop the
one pass's result too, and with it every histogram and the download.

**Recommended: (a).** The memory the page keeps for results falls from
up to 256 MB, the bound, to the results of the values shown: the one
pass's and at most one PCA, 0.90 MB at 9,381 individuals
(`docs/specs/analyses/pca.md`, "How it runs"). `popgen.html` keeps its
cache.

### 6. Ctrl+Z and Cmd+Z

With Undo gone, the page stops catching these keys. In a text field the
browser's own undo of the typing works, as on any page. The number
boxes keep what they do today: with a number typed and not yet
confirmed, Ctrl+Z puts back the box's number; otherwise they refuse the
browser's undo of their text, which on 9 October 2026 put back the old
text and gave it to the project as a change, in Chromium and WebKit on
macOS. Elsewhere the keys do nothing. Not taken: catching the keys on
the whole page to do nothing, a listener on the window kept on that
page for no action, and a key that a user presses out of habit and
that silently does nothing either way. Safari is said to reopen the last closed
tab at Cmd+Z when the page does not take the key; not tried.

### 7. The one pass, and the download of the filtered variants

The one pass reads no filter, so no change stops it, and the PCA starts
only once it has ended, as `autoRuns.ts` starts groups in order. A
restart of the worker after it has ended loses nothing of it: its
result is in the cache of the page, not in the worker.

The download of the filtered variants runs in a modal dialog, a box
over the page that keeps the rest of it out of reach until the file is
written, so no filter changes during a write, and nothing changes
there. Before the write, the download waits while a PCA runs, with
"Waits for the PCA to end; or stop it in the PCA tab." Live, a PCA runs
after every change, so a user who has just moved a filter and wants the
file waits for that PCA, up to 4 minutes at 9,381 individuals, or stops
it (open point 2).

## The cost of a stop

A change during a run ends the calculation worker and starts a new one,
as every cancel does (invariant 6, below). The new worker loads popnei's
wasm from the browser's cache and opens the variants file again, reading
its header, or the index at the end of a `.nei` file, and not the whole
file: at most 49 ms from the start of the new worker to the file opened,
on the `.nei` file of 19,161,178 bytes and its VCF, in Chromium 153 and
WebKit 26.6 on the owner's Apple M5 Pro (`docs/architecture.md`,
section 13, point 5). What is lost is the PCA's time so far. For a PCA
started by the change, on `popgen2.html`, 10 October 2026, same Mac,
from Run to result, LD pruning off:

| individuals | Chromium 153 PCA | Chromium 153 PCoA | WebKit 26.6 PCA | WebKit 26.6 PCoA |
|---|---|---|---|---|
| 1,000 | 0.32 s, 0.05 GB | 0.37 s, 0.04 GB | 0.26 s, 0.19 GB | 0.31 s, 0.08 GB |
| 4,000 | 16.7 s, 0.62 GB | 19.9 s, 0.62 GB | 11.1 s, 0.81 GB | 14.7 s, 0.61 GB |
| 9,381 | 226 s, 3.01 GB | 259 s, 3.29 GB | 134 s, 3.38 GB | 215 s, 4.33 GB |

(`docs/specs/analyses/pca.md`, "How it runs"; the time is the pass and
the decomposition together, the memory the growth of the tab.) The LD
pruning adds at least 2.2 s for 1,000 individuals and 20,000 variants.

The gate bounds the number of stops, not their cost: one stop per run
of the arrow keys, per drag and per typed number, never one per press.
A user who, during a PCA of 9,381 individuals, changes three filters a
minute apart loses three minutes and waits a fourth; that is the
owner's choice, answer 1, and a Stop of the PCA is the way out (open
point 1). What was not measured: whether the browser gives back the 3
to 4.3 GB of a worker ended before the new worker's PCA grows. If it
does not, two such PCAs overlap in the tab, about twice the memory of
one, and wasm32 cannot hold more than 4 GB in one worker but the tab as
a whole can be closed by the browser. A PCA after a stop needs a pass
over the file before its matrix grows, so the overlap, if any, is
short; it is the first thing the tests below measure.

## The invariants

1. **A result is never shown stale: kept.** The screen still shows only
   the result under the key of the current project. A change gives the
   PCA a new key, under which there is nothing, so the old result leaves
   the screen at once, the owner's answer 3; the tab shows the bar of the
   new run. Between the change and the start of the run, the store says
   the PCA is ready with no result; the tab must show that state as
   about to start, from `startedUnder` of `autoRuns.ts`, as the box of
   the variants file already does for the one pass, and not as Run, or
   the button would flash for a frame. A result that arrives after its
   stop is not shown, as now, and with choice 5 not kept.
2. **The layers: kept.** The automatic start is in `src/ui`; core gains
   a setting.
3. **The project, one immutable value changed by commands: kept.** The
   live state is not part of the project, by choice 3, for the reasons
   there; a screen holds nothing of the project.
4. **Core with no DOM and no React: kept.**
5. **Two workers, one request at a time: kept.** `autoRuns.ts` starts
   nothing while a calculation runs, and the store stops the PCA left
   behind before the new one is started.
6. **A cancel ends the worker and starts another: kept**, and paid much
   more often: at every change during a run instead of only at a Stop or
   an opening (above, "The cost of a stop").

## What changes, by module

- `src/ui/autoRuns.ts`: the PCA's group, the live state, the keys left
  behind forgotten; `src/ui/popgen2Store.ts`: the group, the setting of
  the cache, the type with no Undo; `src/ui/popgen2.tsx`.
- `src/core/store.ts` and `docs/specs/core/store.md`: the setting that
  drops results left behind; the section "On popgen2.html: no notice,
  and a history of the filters", which describes the lock as the
  reason the stop is a guard, rewritten. `docs/specs/core/history.md`:
  a line that `popgen2.html` has no Undo.
- Removed from `popgen2.html`: Undo and Redo of
  `src/ui/variants/VariantsPage.tsx`, its keys, `src/ui/variants/filtersLock.ts`
  and the greying it drives, the wraps of Undo and Redo of the gate;
  `src/ui/shell/UndoRedoButtons.tsx`, `undoRedo.ts` and `shortcuts.ts`
  stay for `popgen.html`. The comments of `src/ui/widgets/NumberField.tsx`
  that name the page's Undo.
- The PCA tab: Run once, then the bar at each change; its states lose
  "results removed"; Stop as open point 1 decides
  (`docs/specs/steps/popgen2-pca.md`, "Undo and Redo", "Run and Stop",
  "While a PCA runs", "The states").
- `docs/architecture.md`: section 2, whose project is immutable "so that
  undo is keeping the previous values", true now of `popgen.html` alone;
  section 3, the paragraphs on `popgen2.html` and the cache there;
  section 5, the PCA started by `autoRuns.ts`; section 7, Undo and Redo;
  section 9, the rows of these modules; section 11, the memory; each
  with its paragraph "What was revised on …". The skills that say the
  page has Undo and locks the filters (`coding`'s `react.md`,
  `SKILL.md` and `worker.md`, the `writing-specs` skill's states, the
  `stale` category of the review) are corrected with them.

## How it will be tested, and what would prove it wrong

- In node, on the real store, `autoRuns.ts`: the PCA does not start
  before Run; after Run, a change of a threshold starts it under the new
  key; a change during a run stops it and starts the new key; a filter
  set back calculates again, the cache holding nothing under the old
  key; a change of the colour of the points starts nothing; another
  variants file ends the live state; the PCA waits for the one pass.
- In Chromium and WebKit: ten presses of an arrow key on a threshold,
  less than a second apart, start one PCA, and none while a press
  waits; a drag starts one at its release; the tab never shows the old
  result after a change, nor Run between the change and the bar.
- The measurement that would send the design back: a PCA of 9,381
  individuals, live, with three changes of a threshold 30 seconds
  apart, then left to end, in Chromium and WebKit, the tab's memory
  read through it. If the tab closes, or its memory after a stop grows
  to the sum of two PCAs, a stop must wait for the old worker to be
  gone before the new one starts, or the page must not start a PCA
  above some number of individuals by itself.

## What is hard to undo

Little. `popgen2.html` saves no project file, so no format changes; no
key changes, so no result anywhere is made unreachable; no URL changes.
Undo can come back, since `history.ts` and the buttons stay for
`popgen.html` until it is deleted. What users will learn is that a
change recalculates by itself, and taking that away later would be a
change of habit for them.

## The costs of the web

- **Memory of a tab.** The history of the page holds two projects at
  most, where it held up to 201. The cache holds the current results,
  under 1 MB beside the one pass's, where it could hold 256 MB. The
  worker's memory is given back at each stop, as at each restart; that
  a stopped worker's memory is gone before the next PCA grows is not
  measured (above).
- **The page frozen.** Nothing new runs on the page's own thread that
  grows with the data: a change makes the keys, as it does now, and the
  removal of results from the cache walks a handful of entries.
- **Download size.** None added; the code of the lock and of Undo on
  that page goes.
- **The browsers.** No new interface of the browser. Cmd+Z in Safari,
  above, not tried.
- **What GitHub Pages does not allow.** Nothing asked.
- **Accessibility.** The filters are no longer greyed during a run, so
  a user of the keyboard or a screen reader is never told to stop the
  PCA to change one. A PCA that starts by itself must not move the
  focus, and its start is not announced, since it follows the user's
  own change; its end is announced as an end after Run is now. A user
  who changes a threshold on the Variants tab starts a PCA in a tab
  they do not see; the status region says nothing of it, and the
  download's words say it waits for the PCA.
- **What is lost when the tab is closed or a worker restarts.** At each
  change during a run, the PCA's time so far, up to 4 minutes, and 49
  ms to open the file again; the one pass's result is not lost. A reload
  loses the live state with everything else of the page, as now.

## Open points

1. **What Stop does.** (a) Stop ends the live state: the PCA waits for
   Run again, so a user with thousands of individuals can set several
   filters and run once. (b) Stop stops this run only, and the next
   change starts the PCA again. Recommended: (a), since with (b) a user
   of 9,381 individuals who types three filters, each more than a second
   apart, pays a restart and loses the time run between them, and has
   no way to say "not yet".
2. **The download while a live PCA runs.** (a) It waits, as now, with
   its words; (b) pressing it stops the PCA, writes the file, and the
   PCA starts again after the write. Recommended: (a) for now, as it is
   built, and (b) if the owner finds the wait in the way when trying it;
   (b) throws away the PCA's time so far, which (a) does not.
3. **Seconds after a drag or a typed number** (choice 2). Recommended:
   none, (a) there.
4. **The column of the populations.** With the lock gone, the owner's
   open question of 9 October 2026, whether to lock it during a run,
   lapses: nothing is locked, and the column only colours the points, so
   a change of it starts nothing. Recommended: close it so.
