# No Undo on popgen2.html: the PCA calculated again after each change

A design of 10 October 2026, approved by the owner the same day with the recommendations of its three open points (Stop pauses the automatic runs until Run; the download waits for a running PCA; the column of the populations stays open during a run). It
decides how `popgen2.html` loses its Undo and Redo and calculates the
PCA again by itself after a parameter it reads changes. The owner asked
for it on 10 October 2026 as "the marimo model": marimo, a notebook for
Python, runs again every cell that depends on a value the user changed,
and has no undo. The request is item 4 of the owner's changes after
trying the PCA tab, recorded in `docs/plans/analyses-pca.md`, with the
owner's three answers about it and their later answer of the same day,
after a measurement, to keep the lock of the filters while a PCA runs.
It touches sections 2, 3, 5, 7, 9, 11 and 12 of `docs/architecture.md`
and five specs, listed in the last section. The old page, `popgen.html`,
which is to be deleted, keeps its Undo, its notice and its cache as
they are.

## The design in short, for the owner

- The PCA becomes live for a variants file the first time the user
  presses its Run for that file. From then on, once no PCA runs, a
  change of anything the PCA reads, a threshold or the FILTER box of
  the Variants tab, or an option of the PCA tab, starts it again by
  itself one second after the user stops changing things. Opening
  another variants file ends the live state.
- While a PCA runs, what it reads stays greyed with "Stop the PCA to
  change the filters.", as built on 9 October 2026. A change never stops
  a run; only the user's Stop does. The measurement that decided this
  is below, "Why a change does not stop a run".
- A value set back is calculated again: no result is kept for the old
  values. While the PCA calculates again, its tab shows only the
  progress.
- Undo and Redo, their buttons and their keys go from the page.
- The page starts the PCA by itself with the same code that already
  starts the reading of the file by itself. The part of the application
  that keeps the results is changed in one way only on this page: it
  throws away a result as soon as a parameter of its analysis changes.
- Three questions are left for the owner, at the end; the first is
  whether Stop also pauses the automatic runs until Run is pressed
  again, which is recommended.

## The words used below

- **The project** is the one value that holds what the user has chosen:
  the variants file, its filters, the individuals file, the options of
  each analysis (`docs/architecture.md`, section 2). Each change of the
  user gives a new project.
- **A key** is a hash of everything a result is calculated from, made
  from the project (section 3). A change of a threshold gives the PCA a
  new key; a change of the colour of its points does not.
- **The cache** is where the page keeps results, under their keys, up to
  256 MB. The screen shows for an analysis the result under the key the
  current project gives it, and nothing when there is none.
- **The history** is the list of past projects that Undo and Redo walk,
  at most 200 of them.
- **The calculation worker** is the second thread of the tab, a web
  worker, where popnei runs, so that the page does not freeze. It runs
  one calculation at a time. A calculation inside it cannot be told to
  stop: a Stop ends the worker and starts a new one, which opens the
  variants file again (section 5).
- **The one pass** is the calculation `popgen2.html` starts by itself
  when a variants file is opened, which reads the whole file once and
  gives its statistics and histograms. It reads no filter, and the PCA
  waits for its end.
- **Locked**: an analysis that cannot run, for a reason the page gives
  beside its Run, the LD pruning on with no distance for instance.
- **Live**: the PCA is live for a variants file once its Run has been
  pressed for that file. A file picked again counts as a new one.

## The problem, and what forces it

The user of `popgen2.html` looks for clusters of individuals
(`docs/use-cases.md`, case 3): they set the filters of the variants and
of the individuals, run the PCA, look, move a filter, and look again.
With Undo, the page kept every past project, and every result in the
cache for an undo to bring back. The owner asked for the marimo model
instead: what is on the screen is always the result of the values
shown, calculated again when they change, and nothing to undo.

It is more than a screen removed, for four reasons:

1. **The PCA has never started by itself.** Only the one pass does, and
   the code that starts it starts each calculation once for a set of
   values and never again. A filter set back to its old value gives back
   the old values, and under that rule the PCA would not start.
2. **The cache brings results back.** A filter set back gives the old
   key, the cache still holds its result, and the page shows it with no
   calculation. The owner asked that it be calculated again.
3. **A run started by itself locks the controls.** While a PCA runs,
   what it reads is greyed. A PCA started at the first change would
   grey the slider the user is still pressing, or the box they are
   about to type in.
4. **Undo is woven through the page**: its buttons, its keys, the way
   the number boxes handle Ctrl+Z, the greying of Undo while a PCA runs,
   and the way a new individuals file is made to leave nothing to undo.

## Why a change does not stop a run

The owner's first answer, on 10 October 2026, was that a change during a
run stops it and starts it on the new values, with the lock of the
filters gone. A stop ends the calculation worker, and the question was
whether the tab gives back the memory of the ended worker before the
new one grows. It was measured on 10 October 2026 on `popgen2.html`: a
PCA and a PCoA of 9,381 individuals of 300 variants, the LD pruning
off, Run, Stop after 40 s, Run again at once, Stop after 40 s; the
memory of the browser's processes summed, read every 250 ms; the
owner's Apple M5 Pro with 64 GB, Chromium 153 and WebKit 26.6, the
engine of Safari.

- Chromium held both runs for about 2 s after the Stop, at most 2.83 GB
  for the PCA and 3.96 GB for the PCoA, then one run's.
- WebKit did not give the stopped run's memory back during the next
  40 s: 4.22 GB for the PCA and 4.18 GB for the PCoA at the peak, and
  3.72 GB 29 s after the last Stop, with nothing running.

Each was a single run, made while other tests ran on the same Mac, at
load averages of 21 to 48, so its times may be longer than on a quiet
machine. The finding that matters does not depend on the load: in
Safari each stop of a large PCA leaves its 3 to 4 GB in the tab for 40 s
and more, and a few changes in a row would pile them up until the
browser closes the tab with the user's work. Asked again with these
numbers, the owner chose the same day to keep the lock: a change waits
for the PCA to end or to be stopped, and after it ends a change starts
it again by itself. A stop happens only at the user's Stop or at the
opening of another variants file, as before this design. The option not
taken, a stop at each change, would come back if WebKit gave the memory
of an ended worker back within a second or two, as Chromium does, or if
popnei could stop a calculation without ending the worker.

## The options and the choices

### 1. Where the automatic start lives

**(a) In the code of the page that already starts the one pass by
itself.** It already starts one calculation at a time, only when
nothing runs, and after the one pass has ended, which the PCA needs. It
needs to learn four things: to start the PCA only while it is live, to
start it again for values set back, to wait for the quiet second of
choice 2, and to know when Run is pressed. About 80 lines of code to
write and to keep working, with their tests.

**(b) In the part of the application that keeps the project and the
results**, which knows nothing of the screens. It would have to take
over, from the screens, the waiting for each calculation's end and the
handling of its failures, which is a design of its own, and the live
state and the wait for the one pass with them: several hundred lines to
write and to keep working.

**Recommended: (a)**, the smaller change, which reuses a rule the page
already follows. (b) would win if a second page needed the same
behaviour, which no plan has.

### 2. When the PCA starts after a change

The owner asked for "about 1 s after the user stops moving the
control".

**(a) At once, at each change.** A drag starts the PCA at the release of
the mouse button, a typed number at Enter. But a press of an arrow key
on a slider of the PCA, or on the closed list of the method, which
changes at each press of the left or the right arrow, starts the PCA at
the first press, and the lock then greys the control under the second
press, which does nothing. A user who types a number in one box and
moves to the next finds the next one greyed, and on a file of 9,381
individuals must press Stop to go on.

**(b) One second after the user stops changing things.** Each change,
of any control, puts the start a second later, so the user can go from
one control to the next. The second also waits while the user is in the
middle of a change that has not reached the project yet:

- while they hold the mouse button down on a slider;
- while the list of the method is open;
- while a number box holds digits not yet confirmed by Enter, Tab or a
  click elsewhere;
- while they press the arrow keys on a threshold of the Variants tab,
  which already becomes one change a second after the last press.

Without that, the lock could fall during a drag held still, and the
thumb would jump back at the release; the open list would close; or a
box would stop taking digits before Enter. When the second runs out,
the PCA is calculated for the values on the screen at that moment.

The arrow keys on a threshold of the Variants tab start the PCA about
two seconds after the last press, the threshold's own second and this
one; everything else one second after the last change or release.

**Recommended: (b).** It is what the owner asked, and the only one under
which the lock does not fall on a control the user is still using. (a)
would win only if the lock were gone, which the measurement above
closed. If the two seconds of the thresholds' arrow keys feel slow, the
threshold's own second can count as this one.

During the second, the PCA tab shows no result, since the values it was
for are no longer those on the screen, and no Run, but a line in the
place of the bar: "The PCA starts again in a moment, once the filters
stop changing." ("The PCoA …" under the PCoA). The controls stay open.

### 3. Where "live" is recorded

**(a) In the code of the page that starts the PCA, beside the file it
was pressed for.** A new variants file ends the live state by itself; a
reload of the page ends it too, as it ends everything on that page,
which saves no project.

**(b) In the project, as an option of the PCA.** The project is shared
with `popgen.html`, whose project file would gain a field that page
never sets; opening a file would have to clear it; and it would have to
be kept out of the PCA's key by hand, where a mistake would calculate
the PCA again at the press of Run itself.

**Recommended: (a).** (b) would win if `popgen2.html` ever saved its
project to a file and the live state should come back with it.

### 4. The history

**(a) Keep the history inside, but give this page no way to call Undo
or Redo, and keep at most one past project instead of 200.** The
buttons, the keys and the greying of Undo go. A few lines of change.

**(b) Remove the history for this page**, as a second way through every
change of the project, in code that `popgen.html` still needs the first
way: a larger change, to code of about 3,000 lines that both pages use.

**Recommended: (a)**, and the history removed whole when `popgen.html`
is deleted, as the owner decided it will be on 9 October 2026. (b)
would win if `popgen.html` were to stay.

### 5. The cache

**(a) On this page, a result is thrown away when a parameter of its
analysis changes**, and a result that arrives after its parameters
changed is not kept. A value set back is calculated again.

One case is kept apart: an analysis that is locked has, while locked,
no key, so a lock is not a change of its parameters, and its last result
is kept, not shown, until the lock lifts. If it lifts with the same
values, the result is shown again with no calculation; with other
values, it is thrown away. On the old page the PCA is locked while the
individuals file is read, so throwing results away at a lock would
calculate a PCA of 9,381 individuals again, 2 to 4 minutes, each time an
individuals file is loaded after it. On `popgen2.html` the individuals
file never locks the PCA, and every lock comes from a parameter of the
PCA: the LD pruning on with its distance emptied, the filters of
individuals keeping none, or more than 9,381 kept under the PCoA. So the
one departure from the owner's answer, "every change calculates", is
the distance emptied and typed again with the same value, which shows
the old result, equal to what a calculation would give.

The result of the one pass is kept, since no filter changes it, and so
are its histograms.

**(b) Keep the cache, and start the PCA again even when it holds the
result.** The page would show the old result for the minutes of the new
calculation: not what the owner asked.

**(c) No cache at all on this page.** It would drop the one pass's
result too, and with it every histogram and the download.

**Recommended: (a).** The memory the page keeps for results falls from
up to 256 MB to the results of the values shown: the one pass's and
at most one PCA, 0.90 MB at 9,381 individuals
(`docs/specs/analyses/pca.md`, "How it runs").

### 6. Ctrl+Z and Cmd+Z

With Undo gone, the page stops catching these keys. In a text field
they undo the typing, as on any page. In a number box with digits not
yet confirmed they put back the box's number, as now; with none, they
do nothing, since the box refuses the browser's own undo of its text,
which on 9 October 2026 put back the old text and gave it to the
project as a change, in Chromium and WebKit on macOS. Elsewhere on the
page they do nothing. Not taken: catching the keys on the whole page to
do nothing, which a user would see no differently. Safari is said to
reopen the last closed tab at Cmd+Z when the page does not take the
key; not tried.

### 7. The one pass, and the download of the filtered variants

The one pass reads no filter, so no change stops it, and the PCA starts
only once it has ended.

The download of the filtered variants runs in a dialog over the page
that keeps the rest of the page out of reach until the file is written,
so no filter changes during a write. Before the write, the download
waits while a PCA runs, as built (open point 2). A download pressed
during the quiet second goes first, and the PCA starts after the file is
written.

## What stays true of the architecture

The six rules the rest of the code relies on (`.claude/skills/designing/SKILL.md`)
all hold:

1. **A result is never shown for values other than those on the
   screen.** The tab shows only the result for the PCA's current
   parameters; after a change it shows the line of the quiet second,
   then the bar, never the old result.
2. **The code keeps its layers**: the automatic start is in the code of
   the screens.
3. **The project changes only by the user's changes**: the live state
   is not in it (choice 3).
4. **The part that keeps the project and the results stays free of
   the browser**, tested without one.
5. **One calculation at a time in the calculation worker**: no PCA
   starts while the one pass or a download runs.
6. **A Stop ends the worker and starts another**, no more often than
   today: at the user's Stop and at the opening of another variants
   file.

## What is hard to undo

`popgen2.html` saves no project file, so no saved file depends on this
design, and no key changes, so no result anywhere is made unreachable.
Undo can come back, since the history and the buttons stay for
`popgen.html` until it is deleted. What users will learn is that a
change calculates again by itself, and taking that away later would be
a change of habit for them.

## The costs of the web

- **Memory of a tab.** The page keeps two projects at most, where it
  kept up to 201, and the results of the values shown, under 1 MB beside
  the one pass's, where it could keep 256 MB. The memory a stopped
  worker keeps in Safari, 3.7 to 4.2 GB for 40 s and more at 9,381
  individuals, comes only after the user's Stop; open point 1 decides
  whether a change right after a Stop can start a new PCA on top of it.
- **The page frozen.** Nothing new runs on the page's own thread that
  grows with the data. Each press of an arrow key on a slider of the PCA
  or on the list of the method is a change of the project, as each
  press on a slider already is.
- **Download size.** The page gets slightly smaller, since the code of
  Undo on it goes.
- **The browsers.** Nothing in this design needs a newer browser than
  the floor of the applications, Chrome 111, Firefox 115 and Safari
  16.4. Cmd+Z in Safari, above, is not tried.
- **Accessibility.** A user who changes a control and goes on to the
  next slowly, as with a screen reader, may find it greyed by a PCA that
  started by itself, with its reason, "Stop the PCA to change the
  filters.", given when the control has the focus, as now. So the start
  of a PCA by itself is said once in the status region, the part of the
  page a screen reader reads out without moving the focus, "Calculating
  the PCA again.", and the focus is not moved. A user who changes a
  threshold on the Variants tab starts a PCA in a tab they do not see;
  that sentence and the greyed filters tell them.
- **What is lost when a worker restarts.** As now: a Stop loses the
  PCA's time so far, and the new worker opens the variants file again in
  at most 49 ms, measured on a `.nei` file of 19 MB and on its VCF in
  Chromium 153 and WebKit 26.6 (`docs/architecture.md`, section 13,
  point 5); the one pass's result is kept by the page. A reload loses
  the live state with everything else of the page.

## How it will be tested, and what would prove it wrong

- Without a browser: the PCA does not start before Run; after Run, a
  change of a threshold starts it a second later, and a second change
  within that second puts it off; the second waits during a drag held,
  an open list and digits not confirmed; the PCA is calculated for the
  values when the second runs out; nothing starts while a PCA or a
  download runs; a value set back is calculated again; the colour of
  the points starts nothing; another variants file ends the live state;
  an individuals file opened after a PCA calculates nothing again; a
  distance emptied and typed again with the same value shows the old
  result.
- In Chromium and WebKit: ten presses of an arrow key on a threshold, on
  a slider of the PCA and on the closed list of the method start one
  PCA, after the last press, and no control greys before it; a drag held
  still for 3 s, the list held open for 3 s and digits typed slowly over
  3 s each keep working, before any PCA starts; the tab never shows the
  old result after a change, nor Run between the change and the bar.
  Firefox, in the floor of the applications, is left out: Playwright
  cannot start it on the owner's Mac, so it is seen only on GitHub's
  automatic checks or by the owner by hand.
- What would send the design back: a user, on trying it, who finds the
  quiet second too short to go from one control to the next; the answer
  would be a longer second, or an Apply button, not a stop at each
  change.

## Open points

1. **Whether Stop pauses the automatic runs.** (a) Stop ends the live
   state: the PCA tab shows Run, as before the first run, and nothing
   starts until it is pressed. (b) Stop stops this run only, and the
   next change starts the PCA again a second after it, with the line
   "The PCA starts again in a moment, once the filters stop changing."
   Recommended: (a). Under (b) a user who stops a PCA of 9,381
   individuals to change two filters, a few seconds apart, has a new PCA
   start and grey the second filter before they reach it, and must stop
   it again; and in Safari each of those stops leaves 3.7 to 4.2 GB in
   the tab for 40 s and more, on which the next PCA grows.
2. **The download while a live PCA runs.** With the PCA calculated again
   after every change, "Download filtered variants…" is greyed after
   each change of a filter for as long as the PCA takes: up to 4 minutes
   on a file of 9,381 individuals (134 to 259 s on the owner's Mac), a
   second or less up to 1,000. (a) It waits, as now, with "Waits for the
   PCA to end; or stop it in the PCA tab."; the user waits, or goes to
   the PCA tab to stop it. (b) The button stays usable during a PCA;
   pressing it stops the PCA and opens the dialog of the download, and
   the PCA tab says "Stopped for the download; the PCA starts again when
   the file is written." and starts again after it; the PCA's time so
   far is lost, and in Safari its memory stays beside the write.
   Recommended: (a), as built, with open point 1's (a), under which a
   Stop before the download keeps the PCA from starting again until
   Run.
3. **The column of the populations during a run.** The owner's question
   of 9 October 2026 stands, since the lock stays: the page locks only
   what the PCA reads, and the column only colours its points.
   Recommended: leave it open to change during a run, as built.

## For the session that builds it

The owner can stop reading here. What follows names the code.

**Choice 1.** `src/ui/autoRuns.ts` gains the PCA as a second group
after `POPGEN2_CHAIN`, which gives the wait for the one pass that
`passLock.ts` gives Run today. It records the live state as the load id
of the variants file Run was pressed for (choice 3); forgets the key it
started the PCA under once the store leaves that key behind, the
owner's choice of 6 October 2026 (`docs/architecture.md`, section 5);
runs the quiet second; and starts nothing while the store's write
runs, since `anyRunning` looks only at its groups, and a PCA started
during a write would wait in the client's queue while shown as
running. Option (b) was the store starting runs itself, which moves the
awaiting of outcomes out of `src/ui/runs.ts`, the case "The store and
who awaits a run" of the designing skill.

**Choice 2.** The gate of `src/ui/variants/thresholdRun.ts` gains a
count of holds and a `subscribe` that tells `autoRuns.ts` when it falls
to zero; the second starts from that moment or from the last change of
the store, whichever is later. The holds, all in `src/ui`, through
`RunGateProvider`:

- a run of the arrow keys on a threshold, `hold` as today;
- a drag on a slider, `src/ui/widgets/Slider.tsx` and the thresholds'
  `ThresholdSlider.tsx`: taken at the first `onChange` of React Aria
  (the library of accessible controls the page is built on) before any
  `onChangeEnd`, let go at `onChangeEnd` or when the slider leaves the
  page. Without it, `Slider.tsx` ignores the value of `onChangeEnd`
  while it waits;
- an open list, `src/ui/widgets/Select.tsx`: taken and let go at
  `onOpenChange`. Without it, the list closes, since it is drawn open
  only while it does not wait. Closed, React Aria's `Select`
  (`react-aria-components` 1.21.1) changes its value at each press of
  the left or the right arrow, a key held repeating (`useSelect` of
  `react-aria` 3.52.1, `ArrowLeft`, `ArrowRight`, `allowRepeats: true`),
  and at each letter that begins an option;
- a box with text not yet given, `NumberField`, the Variants tab's and
  the PCA tab's: held while its text differs from the project's value,
  which it already knows for Ctrl+Z. Without it, the box is read-only
  while it waits. The gate's `typing` and `commitTyped` register the
  boxes of the thresholds today; the hold adds whether one has text
  waiting.

When the second runs out, `autoRuns.ts` reads the PCA's key from the
store then, not when the second began. The state about to start is
`ready` in the store with the PCA live and its key not in
`startedUnder`, as the box of the variants file tells a pass about to
start.

**Choice 4.** `createPopgen2Store` gives a type without `undo` and
`redo`, `maxUndoSteps: 1`. `applyAfresh` stays: it still counts one in
`historyMoves`, at which a screen that holds typed text drops it, which
is why the gate commits typed text before it. Leave it counting; no
screen of `popgen2.html` reads it, only `IndividualFilters.tsx` of
`popgen.html`. Option (b) was a setting of no history through the
store's 2,971 lines.

**Choice 5.** A setting of `createStore`, true on `popgen2.html`: after
each change, the result under a key an analysis had is removed when the
analysis now has a different key, and a late result under such a key is
not cached. A locked analysis, `{ kind: "locked" }` of `AnalysisKey` in
`src/core/store.ts`, has no key and drops nothing; the PCA of
`popgen2.html` has no `individualsNeeds` (`docs/specs/analyses/pca.md`,
"On popgen2.html", `needs`).

**What changes, by module.**

- `src/ui/autoRuns.ts`, `src/ui/popgen2Store.ts`, `src/ui/popgen2.tsx`;
  the gate and the widgets above.
- `src/core/store.ts` and `docs/specs/core/store.md`: the setting of the
  cache; the section "On popgen2.html: no notice, and a history of the
  filters", without the history. `docs/specs/core/history.md`: a line
  that `popgen2.html` has no Undo.
- Removed from `popgen2.html`: Undo and Redo of
  `src/ui/variants/VariantsPage.tsx`, their keys, the gate's wraps of
  `undo` and `redo`, and the waiting of Undo in
  `src/ui/variants/filtersLock.ts`, whose lock of the filters stays;
  `src/ui/shell/UndoRedoButtons.tsx`, `undoRedo.ts` and `shortcuts.ts`
  stay for `popgen.html`. The comments of `src/ui/widgets/NumberField.tsx`
  that name the page's Undo.
- `docs/specs/steps/popgen2-pca.md`, "Undo and Redo", "Run and Stop",
  "While a PCA runs", "The states" (no "results removed"; a state about
  to start); `popgen2-filters.md`, "Undo, Redo and their keys";
  `popgen2-download.md`, as open point 2 decides.
- `docs/architecture.md`: section 2 ("Immutable, so that undo…", now of
  `popgen.html` alone), 3 (the paragraphs on `popgen2.html` and its
  cache), 5 (the PCA started by `autoRuns.ts`, the measurement above),
  7, 9, 11, each with its "What was revised on …". The skills that say
  the page has Undo: `coding`'s `react.md`, `SKILL.md` and `worker.md`,
  the states of `writing-specs`, the `stale` category of the review.
