# No Undo on popgen2.html: the PCA calculated again after each change

A design of 10 October 2026, a draft for the owner's approval. It
decides how `popgen2.html` loses its Undo and Redo and calculates the
PCA again by itself after a parameter it reads changes, "the marimo
model" the owner asked for on 10 October 2026 (`docs/plans/analyses-pca.md`,
"Work package 10, round 1", item 4, the owner's three answers after it,
and their answer of the same day, after a measurement, to keep the lock
of the filters while a PCA runs). It touches sections 2, 3, 5, 7, 9, 11
and 12 of `docs/architecture.md`, and the specs `docs/specs/core/store.md`,
`docs/specs/core/history.md`, `docs/specs/steps/popgen2-pca.md`,
`popgen2-filters.md` and `popgen2-download.md`. The old page,
`popgen.html`, which is to be deleted, keeps its Undo, its notice and
its cache as they are.

## The design in short, for the owner

- The PCA becomes live for a variants file the first time the user
  presses its Run for that file. From then on, once no PCA runs, a
  change of anything the PCA reads, a threshold or the FILTER box of
  the Variants tab, or an option of the PCA tab, starts it again by
  itself one second after the last change. Opening another variants
  file ends the live state.
- While a PCA runs, what it reads stays greyed with "Stop the PCA to
  change the filters.", as built on 9 October 2026. A change never stops
  a run; only the user's Stop does. The measurement that decided this
  is below, "Why a change does not stop a run".
- No result is kept for a parameter set back: a result leaves the page
  when a parameter its analysis reads changes, and is kept while the
  analysis is only locked, so that it comes back if the lock lifts with
  nothing changed. While the PCA calculates again, its tab shows only
  the progress.
- Undo and Redo, their buttons and their keys go from the page.
- The code that already starts the one pass by itself, `src/ui/autoRuns.ts`,
  starts the PCA too; the store of core gains one setting, and loses
  nothing that `popgen.html` uses.
- Three questions are left for the owner, at the end; the first is
  whether Stop also pauses the automatic runs until Run is pressed
  again, which is recommended.

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
  stop: a Stop ends the worker and starts a new one, which opens the
  variants file again (section 5).
- **The one pass** is the calculation `popgen2.html` starts by itself
  when a variants file is opened, which reads the whole file once and
  gives its statistics and histograms. It reads no filter, and the PCA
  waits for its end.
- **The gate** is the code of `src/ui/variants/thresholdRun.ts` that
  turns a run of presses of the arrow keys on a threshold of the
  Variants tab, less than a second apart, into one change of the
  project, made one second after the last press, or at once when the
  user does something else, Run among it.
- **Live**: the PCA is live for a load of the variants file once its Run
  has been pressed for that load. A load is one pick of the file, with
  an id of its own, the same file picked again included (section 3).

## The problem, and what forces it

The user of `popgen2.html` looks for clusters of individuals
(`docs/use-cases.md`, case 3): they set the filters of the variants and
of the individuals, run the PCA, look, move a filter, and look again.
With Undo, the page kept every past project, and every result in the
cache for an undo to bring back. The owner asked on 10 October 2026 for
the model of a marimo notebook instead: what is on the screen is always
the result of the values shown, calculated again when they change, and
nothing to undo.

It is more than a screen removed, for four reasons:

1. **The PCA has never started by itself.** Only the one pass does,
   through `src/ui/autoRuns.ts`, which starts each calculation once per
   key and never again under a key it already started. A filter set
   back to its old value gives back an old key, and under that rule the
   PCA would not start.
2. **The cache brings results back.** A filter set back gives the old
   key, the cache still holds its result, and the store shows it with
   no calculation. The owner asked that it be calculated again.
3. **A run started by itself locks the controls.** While a PCA runs,
   what it reads is greyed. A PCA started at the first change would
   grey the slider the user is still pressing, or the box they are
   about to type in.
4. **Undo is woven into the store and the screens**: the gate's wraps
   of Undo and Redo, the buttons, the keys caught on the whole window,
   the number box's handling of Ctrl+Z, the lock that makes Undo wait,
   and `applyAfresh`, a command that exists only so that the changes of
   the individuals file leave nothing to undo.

## Why a change does not stop a run

The owner's first answer, on 10 October 2026, was that a change during a
run stops it and starts it on the new values, with the lock of the
filters gone. A stop ends the calculation worker, and the question was
whether the tab gives back the memory of the ended worker before the
new one grows. It was measured on 10 October 2026 on `popgen2.html`: a
PCA and a PCoA of 9,381 individuals of 300 variants, the LD pruning
off, Run, Stop after 40 s, Run again at once, Stop after 40 s; the
memory of the engine's processes summed, sampled every 250 ms; the
owner's Apple M5 Pro with 64 GB, Chromium 153 and WebKit 26.6, one run
each, under load averages of 21 to 48 from other runs on the machine
(`docs/plans/analyses-pca.md`, the end of "Work package 10, round 1").

- Chromium held both runs for about 2 s after the Stop, at most 2.83 GB
  for the PCA and 3.96 GB for the PCoA, then one run's.
- WebKit did not give the stopped run's memory back during the next
  40 s: 4.22 GB for the PCA and 4.18 GB for the PCoA at the peak, and
  3.72 GB 29 s after the last Stop, with nothing running.

So in Safari each stop of a large PCA leaves its 3 to 4 GB in the tab
for tens of seconds, and a few changes in a row would pile them up
until the browser closes the tab with the user's work. Asked again with
these numbers, the owner chose the same day to keep the lock: a change
waits for the PCA to end or to be stopped, and after it ends a change
starts it again by itself. A stop happens only at the user's Stop or at
the opening of another variants file, as before this design. The option
not taken, a stop at each change, would come back if WebKit gave the
memory of an ended worker back within a second or two, as Chromium
does, or if popnei could stop a calculation without ending the worker.

## The options and the choices

### 1. Where the automatic start lives

**(a) In `src/ui/autoRuns.ts`, as a second group after the one pass.**
That module already starts a calculation by itself, one at a time, only
when nothing runs, and waits for the group before it, the one pass,
to end: the PCA would get the wait for the one pass that its Run lock
gives it today (`passLock.ts`) for free. It needs four things more: to
start the PCA's group only while the PCA is live; to forget the key it
started the PCA under once the store has left that key behind, the
owner's choice of 6 October 2026 for the first analysis that starts by
itself and reads a filter (section 5); the second of quiet of choice 2;
and to be told when Run is pressed. About 80 lines of code and their
tests in node, on the real store, as the module's tests are now.

**(b) In the store of core, as a setting that names the analyses to
start again after a change.** But the outcome of every calculation is
awaited by `src/ui/runs.ts`, which shows a failure of ours in the error
bar; a calculation started inside core would have nobody awaiting it,
and moving that awaiting into core is a design of its own
(`.claude/skills/designing/SKILL.md`, "The store and who awaits a
run"). The live state, the timer of the second and the wait for the one
pass, which only `autoRuns.ts` can tell from a pass about to start,
would have to move into core too. Several hundred lines across core and
its spec.

**Recommended: (a).** It reuses the rule the page already follows for
the one pass, and changes no interface between the layers. (b) would
win if a second page needed the same behaviour with no `src/ui` of its
own, which no plan has.

### 2. When the PCA starts after a change

The owner asked for "about 1 s after the user stops moving the
control". The controls the PCA reads give their value to the project
at different moments:

- a threshold of the Variants tab: a drag when the mouse button is
  released; a run of the arrow keys one second after its last press,
  through the gate; a number typed at Enter, Tab or a click elsewhere;
- the PCA's own sliders of missing data and MAF (`src/ui/widgets/Slider.tsx`,
  built in round 1 of the plan): a drag at its release, and each press
  of an arrow key, Page Up, Page Down, Home or End at once, as React
  Aria's `onChangeEnd` gives it;
- the drop-down list of the method, PCA or PCoA, a React Aria `Select`
  (`react-aria-components` 1.21.1, built in round 1): closed, it changes
  its value at each press of the left or the right arrow key, a key held
  repeating (`useSelect` of `react-aria` 3.52.1, its `ArrowLeft` and
  `ArrowRight`, `allowRepeats: true`), and at each letter typed that
  begins an option; open, at Enter;
- the FILTER box and the switch of the LD pruning at a press of Space,
  and the number boxes of r² and of the distance at Enter, Tab or a
  click elsewhere.

**(a) At once, when a change reaches the project.** A drag or a typed
number starts the PCA when the user lets go or confirms. But a press
of an arrow key on the PCA's sliders or on the closed list of the
method starts it at the first press, and the lock then greys the
control under the second press, which does nothing. A user who types a
number in one box and tabs to the next finds the next one greyed. On a
file of 9,381 individuals the user must then press Stop to go on.

**(b) After one second with no change of the project and no run of the
arrow keys held by the gate.** Each change, of any control, puts the
start a second later, so the user can press, drag and type from one
control to the next while the second has not passed; the controls stay
open during that second. The arrow keys on a threshold of the Variants
tab start it about two seconds after the last press, the gate's second
and this one; everything else one second after the last change. The
PCA's sliders and the list of the method need no gate: each press is a
change of the project, which costs a new key and a drawing of the
screen, and none starts a calculation until the presses stop.

**Recommended: (b).** It is what the owner asked, and the only one under
which the lock does not fall on a control the user is still using. (a)
would win only if the lock were gone, which the measurement above
closed. If the two seconds of the thresholds' arrow keys feel slow when
the owner tries it, the gate's change can count as the end of the quiet
second, a few lines more.

During the second, the tab shows the state about to start, the bar at
its start and no Run, with the old result already gone, since its key is
no longer the project's (the owner's answer 3; invariant 1, below).

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

What a Stop does to the live state is the owner's to decide (open
point 1).

### 4. The history

**(a) Keep the history in the store, and give `popgen2.html` a store
whose type has no `undo` and `redo`**, so that no screen of that page
can call them, with at most one step kept instead of 200. The buttons,
the keys, the gate's wraps of Undo and Redo and the waiting of Undo go;
`applyAfresh` stays. It is not the same as `apply` there: it still
counts one in `historyMoves`, the count of the store at which a screen
that holds typed text beside a part of the project drops that text,
which is why the gate commits a number typed in a box before it. A few
lines in core, none in `history.ts`.

Two ways for `historyMoves` on that page: (i) leave it counting, as
now, with the gate's commit before `applyAfresh`; (ii) under the
setting, have it count nothing, since there is no history to move.
Recommended: (i). No screen of `popgen2.html` reads the count today,
only the filters of individuals of `popgen.html`
(`src/ui/steps/variants/IndividualFilters.tsx`), so (ii) changes
nothing a user sees and adds a case to the store; the count goes with
the history when `popgen.html` is deleted.

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
change, the result of an analysis leaves the cache when the new project
gives that analysis a different key, and a result that arrives under a
key so replaced is not kept.** An analysis that is locked, that cannot
run for a reason the store gives, has no key at all
(`AnalysisKey` of `src/core/store.ts`), and its last result stays in
the cache, not shown, until the analysis has a key again: the same key
shows it again with no calculation, a different one drops it. Dropping
every result whose key the project gives to no analysis would throw
away the result of a PCA at every lock. On the old page that lock
comes with the individuals file while it is read, so loading the
individuals file after a PCA of 9,381 individuals would cost 2 to 4
minutes of calculation under the same key. On `popgen2.html` the
individuals file never locks the PCA (`docs/specs/analyses/pca.md`, "On
popgen2.html", `needs`), and every lock there comes from a parameter the
PCA reads: the LD pruning on with its distance emptied, the filters of
individuals keeping none, or more than 9,381 kept under the PCoA. So
the one departure from the owner's answer 2 is a parameter changed
into a lock and set back to the same value, the distance emptied and
typed again, which shows the old result rather than calculating it
again; it is equal to what a calculation would give. The rule keeps a
result through any lock a later piece adds. The one pass's result stays,
since no filter changes its key, and so do its histograms and the
statistics that the individuals kept are worked out from. A filter set
back from another value gives a key with nothing under it, and the PCA
starts again.

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
that silently does nothing either way. Safari is said to reopen the
last closed tab at Cmd+Z when the page does not take the key; not
tried.

### 7. The one pass, and the download of the filtered variants

The one pass reads no filter, so no change stops it, and the PCA starts
only once it has ended, as `autoRuns.ts` starts groups in order.

The download of the filtered variants runs in a modal dialog, a box
over the page that keeps the rest of it out of reach until the file is
written, so no filter changes during a write. Before the write, the
download waits while a PCA runs, with "Waits for the PCA to end; or stop
it in the PCA tab.", as built (open point 2). A write pressed during the
second of choice 2 goes first, and the PCA starts after it, by the
guard of invariant 5.

## The invariants

1. **A result is never shown stale: kept.** The screen still shows only
   the result under the key of the current project. A change gives the
   PCA a new key, under which there is nothing, so the old result leaves
   the screen at once, the owner's answer 3. Between the change and the
   start of the run, the second of choice 2, the store says the PCA is
   ready with no result; the tab shows that state as about to start,
   from `startedUnder` of `autoRuns.ts` and the live state, as the box of
   the variants file already does for the one pass, and not as Run. A
   result that arrives after its Stop is not shown, as now, and with
   choice 5 not kept.
2. **The layers: kept.** The automatic start is in `src/ui`; core gains
   a setting.
3. **The project, one immutable value changed by commands: kept.** The
   live state is not part of the project, by choice 3, for the reasons
   there; a screen holds nothing of the project.
4. **Core with no DOM and no React: kept.**
5. **Two workers, one request at a time: kept**, with one guard added.
   `autoRuns.ts` starts nothing while one of its own analyses runs, but
   it does not look at the write of the filtered variants, which runs on
   the same calculation worker: a PCA it started during a write would
   wait in the queue of the worker, while the store, which has no state
   for a request waiting there, showed it as running with a bar that
   does not move. A write started within the second of choice 2 is such
   a case. So `autoRuns.ts` also starts nothing while the store's write
   is running, one condition and its test.
6. **A Stop ends the worker and starts another: kept, and no more often
   than today**, at the user's Stop and at the opening of another
   variants file (above, "Why a change does not stop a run").

## What changes, by module

- `src/ui/autoRuns.ts`: the PCA's group, the live state, the keys left
  behind forgotten, the second of quiet, the guard of the write;
  `src/ui/popgen2Store.ts`: the group, the setting of the cache, the
  type with no Undo; `src/ui/popgen2.tsx`.
- `src/core/store.ts` and `docs/specs/core/store.md`: the setting that
  drops results whose key was replaced; the section "On popgen2.html:
  no notice, and a history of the filters", without the history.
  `docs/specs/core/history.md`: a line that `popgen2.html` has no Undo.
- Removed from `popgen2.html`: Undo and Redo of
  `src/ui/variants/VariantsPage.tsx`, their keys, the wraps of Undo and
  Redo of the gate, and the waiting of Undo in `src/ui/variants/filtersLock.ts`,
  whose lock of the filters stays; `src/ui/shell/UndoRedoButtons.tsx`,
  `undoRedo.ts` and `shortcuts.ts` stay for `popgen.html`. The comments
  of `src/ui/widgets/NumberField.tsx` that name the page's Undo.
- The PCA tab: Run once, then the bar after each change; its states
  lose "results removed" and gain "about to start"; Stop as open point
  1 decides (`docs/specs/steps/popgen2-pca.md`, "Undo and Redo", "Run
  and Stop", "While a PCA runs", "The states").
- `docs/architecture.md`: section 2, whose project is immutable "so that
  undo is keeping the previous values", true now of `popgen.html` alone;
  section 3, the paragraphs on `popgen2.html` and the cache there;
  section 5, the PCA started by `autoRuns.ts`, with the measurement
  above; section 7, Undo and Redo; section 9, the rows of these
  modules; section 11, the memory; each with its paragraph "What was
  revised on …". The skills that say the page has Undo (`coding`'s
  `react.md`, `SKILL.md` and `worker.md`, the `writing-specs` skill's
  states, the `stale` category of the review) are corrected with them.

## How it will be tested, and what would prove it wrong

- In node, on the real store, `autoRuns.ts`, with a timer the test
  moves: the PCA does not start before Run; after Run, a change of a
  threshold starts it under the new key one second later, and a second
  change within that second puts it off again; nothing starts while a
  PCA runs; a filter set back calculates again, the cache holding
  nothing under the old key; a change of the colour of the points
  starts nothing; another variants file ends the live state; the PCA
  waits for the one pass; an individuals file opened after a PCA
  calculates nothing again, the result staying on the screen; a PCA
  locked by its distance emptied keeps its result in the cache, shown
  again when the same distance is typed; and no PCA starts while a
  write runs.
- In Chromium and WebKit: ten presses of an arrow key on a threshold,
  on a slider of the PCA and on the closed list of the method, less
  than a second apart, start one PCA, after the last press, and no
  control greys before it; the tab never shows the old result after a
  change, nor Run between the change and the bar. Firefox, which is in
  the floor of the applications, is left out: Playwright cannot start
  it on the owner's Mac, so it is seen only on GitHub's CI, which runs
  the flows, or by the owner by hand.
- What would send the design back: a user, on trying it, who finds the
  second of choice 2 too short to go from one control to the next
  before the lock falls; the answer would be a longer quiet time, or an
  "Apply" button, not a stop at each change.

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
  under 1 MB beside the one pass's, where it could hold 256 MB. A PCA
  is stopped only by the user, as now, so the memory a stopped worker
  keeps in WebKit, 3.7 to 4.2 GB for tens of seconds at 9,381
  individuals (above), comes only after a Stop; open point 1 decides
  whether a change right after a Stop can start a new PCA on top of it.
- **The page frozen.** Nothing new runs on the page's own thread that
  grows with the data: a change makes the keys, as it does now, and the
  removal of results from the cache walks a handful of entries. Each
  press on a PCA slider or on the list of the method is a change of the
  project, as each press of a key on the slider already is.
- **Download size.** None added; the code of Undo on that page goes.
- **The browsers.** No new interface of the browser. Cmd+Z in Safari,
  above, not tried.
- **What GitHub Pages does not allow.** Nothing asked.
- **Accessibility.** A user who changes a control and goes on to the
  next one slowly, as with a screen reader, may find it greyed a second
  later by a PCA that started by itself, with its reason, "Stop the PCA
  to change the filters.", on the focus and in its description, as the
  lock gives now. So the start of a PCA by itself is said once in the
  status region, the part of the page a screen reader reads out without
  moving the focus, "Calculating the PCA again.", and the focus is not
  moved. A user who changes a threshold on the Variants tab starts a
  PCA in a tab they do not see; that sentence and the greyed filters say
  it.
- **What is lost when the tab is closed or a worker restarts.** As now:
  a Stop loses the PCA's time so far, and the new worker opens the
  variants file again in at most 49 ms (`docs/architecture.md`, section
  13, point 5); the one pass's result is in the page and is not lost.
  A reload loses the live state with everything else of the page.

## Open points

1. **Whether Stop pauses the automatic runs.** (a) Stop ends the live
   state: the PCA waits for Run again, so a user can stop a long PCA,
   change several filters at their pace and run once. (b) Stop stops
   this run only, and the next change starts the PCA again a second
   after it. Recommended: (a). Under (b) a user who stops a PCA of
   9,381 individuals to change two filters, a few seconds apart, has a
   new PCA start and grey the second filter before they reach it, and
   must stop it again; and in WebKit each of those stops leaves 3.7 to
   4.2 GB in the tab for tens of seconds, on which the next PCA grows.
2. **The download while a live PCA runs.** With the PCA calculated
   again after every change, "Download filtered variants…" is greyed
   after each change of a filter for as long as the PCA takes: up to 4
   minutes on a file of 9,381 individuals (134 to 259 s on the owner's
   Mac, `docs/specs/analyses/pca.md`, "How it runs"), a second or less
   up to 1,000. (a) It waits, as now, with "Waits for the PCA to end; or
   stop it in the PCA tab."; the user waits or goes to the PCA tab to
   stop it. (b) Pressing it stops the PCA, writes the file, and the PCA
   starts again after the write; the download never waits, the PCA's
   time so far is thrown away, and in WebKit the stopped PCA's memory
   stays beside the write. Recommended: (a), as it is built, with open
   point 1's (a), under which a Stop before the download keeps the PCA
   from starting again until Run.
3. **The column of the populations during a run.** The owner's question
   of 9 October 2026 stands, since the lock stays: the page locks only
   what the PCA reads, and the column only colours its points.
   Recommended: leave it open to change during a run, as built.
