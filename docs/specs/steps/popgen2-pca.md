# popgen2.html: the five tabs, the PCA tab and the downloads

The screen spec of what `popgen2.html` gains with its first analysis:
the row of five tabs under the two boxes, Variants, Individuals, PCA,
Populations and Distances, with the tabs of the analyses greyed while
they cannot run; the PCA tab, a PCA or a PCoA of the individuals of the
variants file; a button "Download…" on every table and every plot of
the page; and, from 9 to 10 October 2026, Undo and Redo at the right
end of the line of the page's heading. It
develops the design `docs/designs/analyses-pca.md`, approved by the
owner on 9 October 2026 with its ten answers, and section 5 of
`docs/functionality.md`, "The individuals". It covers case 3 of
`docs/use-cases.md`, "Look for clusters of individuals". Written on 9
October 2026, before any code, and built on the branch `pca-tab` on 9
and 10 October 2026, work packages 1 to 6 of
`docs/plans/analyses-pca.md`; not yet tried by the owner. The rounds of
review of that plan changed it where it now says so with its date:
a running PCA locks only what it reads, not the column of the
populations (the session's recommendation, pending the owner's answer);
a locked control says its reason on the mouse, a press and the focus;
the reason of an empty LD distance said once, under its field; Run
ending a run of the arrow keys before it starts; the result's code
downloaded when the tab is first shown, with Try again; the table of the
individuals with no frozen first column; and the tab order of the
result. The owner is asked to approve it as a
whole: every question of the design was answered on 9 October 2026, so
nothing is left open, and the choices the session made, listed at the
end, are for the owner to change after trying the page.

Revised on 10 October 2026 for `docs/designs/no-undo.md`, approved by
the owner that day with the recommendations of its three open points,
after the owner tried the page (`docs/plans/analyses-pca.md`, work
package 10, round 1, item 4): Undo and Redo leave the page, with their
keys ("No Undo and no Redo"); the PCA becomes live once its Run is
pressed for the file, and is calculated again by itself a second after
a change of what it reads, with a state of the tab about to start and
a Stop that pauses the automatic runs until Run ("The PCA calculated
again by itself"); a value set back is calculated again, since the page
keeps no result for values left behind; the lock of the filters while
a PCA runs stays, and the column of the populations stays open, now by
the owner's answer; and the band at the top of the page says what is
running, with its own spec, `docs/specs/steps/popgen2-band.md`. The
parts that named Undo say so where they changed. Built on the branch
`pca-tab` on 10 October 2026, work packages 2 to 5 of
`docs/plans/no-undo.md`; not yet tried by the owner. Its reviews changed
what is written here: whenever the PCA is live and none runs, the tab
offers "Stop recalculating" in Run's place, so that the automatic runs
can be ended from the keyboard before the next change (WCAG 2.2.1),
with a line under it while the result showed until 11 October 2026,
and Run beside it after a crash that keeps the PCA live; the lines of the quiet second, of the
dialog of the download and after a Stop are drawn in the place of the
bar, in normal text, and the first names the options as well as the
filters; a crash for lack of memory, and a failure that only a reload
mends, end the live state as a Stop does; the lock of the filters, the
status region's words of a start by itself and the line after a Stop
name the PCA tab and what Run does again; Run is refused while the
filtered variants are written; a number box holds the change under way
from its first key to its commit, and a slider's thumb from its press,
moved or held still; the holds carry their kind, the dialog of the
download among them; and `autoRuns.ts` gives the live state in one
snapshot that the tab and the band read. The owner tried the page on
11 October 2026 and asked, in round 1 of work package 8 of that plan,
for the line under the heading of the PCA's filters in their own words,
"PCA filters can be stricter than the general analysis ones."; for no
line under "Stop recalculating" while the result shows; and for the
"Download…" of every table below the table, the plots keeping theirs.

Revised on 11 October 2026 for `docs/designs/population-tab.md`,
approved by the owner that day with the recommendations of its two open
points, which brings the Populations tab
(`docs/specs/steps/popgen2-populations.md`): the PCA is no longer the
one analysis calculated again by itself. The new section "Several
analyses calculated again by themselves" gives the rules every live
analysis follows, the order after a change, the state waiting, a Run
pressed while another analysis runs, a Stop that lets the others start
a quiet second later, Stop all, the lock and the status region of
several, and the interface of `src/ui/autoRuns.ts` they need; "The PCA
calculated again by itself" keeps what is the PCA's own. "While a PCA
runs" says that the column of the populations and the individuals file
stay open while the PCA runs and are greyed while the diversity runs;
"The tabs not built yet" no longer names the Populations tab; the lines
of the PCA's tab while it waits for the diversity are in "About to
start". Approved by the owner on 11 October 2026; not yet built; its plan is `docs/plans/population-tab.md`.

Revised on 12 October 2026 for the LD decay of the Populations tab, a
third live analysis (`docs/plans/ld-decay-tab.md`), in "Several
analyses calculated again by themselves": its place in the order, last;
its rule of `endsLive`, which popnei's refusal for memory joins; and
the words of the round and of Stop all, which name the analyses of one
tab with that tab once.

Its section "Several analyses calculated again by themselves" for the
LD decay and the distances was built on the branches `ld-decay-tab` and
`distances-tab` on 12 October 2026 and joined on the branch
`case4-ld-distances` on 13 October 2026, and is not yet tried by the
owner. Their reviews and the joining changed it, each where this spec
says so with its date: the order of calculation, the PCA, the
diversity, the distances and the LD decay, no longer that of the tabs;
and a new project a change for the live analyses only when it changes
the key of one of them or the reason it is locked, so that the measure
of the heatmap and the view of the PCA start nothing.

Corrected on 11 October 2026 after the review of work package 1 of that
plan, in "Several analyses calculated again by themselves": `run`
answers "kept" when the store starts nothing for its analysis, done,
locked or held back by the one pass, whether another calculation runs
or not, where it answered "refused", or "waiting" behind a calculation
running, though nothing would start it after; such a Run makes the
analysis live and nothing waits, so its next start by itself is told as
any other. "refused" is kept for a Run during a write, which makes
nothing live. A Run that waits asks for the key its analysis is ready
under, also one it was stopped under, which it otherwise never started.
A failure that ends a live state has its own line in the tab, not the
line after a Stop, and lets the others about to start begin a quiet
second later, or, after a crash of the worker, only after the next
change ("A failure that ends a live state"). Until the band offered Stop
all, which it does from work package 4, built on 11 October 2026, the
words of the lock and of the download's wait named the Stop of each tab
in its place ("The lock").

Built on the branch `population-tab` on 11 and 12 October 2026, work
packages 1 to 4 of `docs/plans/population-tab.md`, and not yet tried
by the owner. The rounds of review of those packages changed, beside
the corrections above, the line of the quiet second, now true after a
Stop as after a change ("The PCA starts in a moment, later if the
filters or its options change."); the analysis held after a crash,
whose tab offers Run beside Stop recalculating and is never said to
start once the analysis running ends; and the status region, which
names the populations in the round's words only for the analyses that
read them and says the diversity's start when the PCA of the round
ends within its pause; each where this spec says so, with its date.

The PCA tab is the panel of the old page, `popgen.html`, which is built
and which the owner approved on 28 September 2026: its screen spec is
the second half of `docs/specs/analyses/pca.md`, "The panel". This spec
says what is the same by pointing there, and gives in full what differs.
The two boxes and the Variants and Individuals tabs are those of
`docs/specs/steps/popgen2-input.md`, `popgen2-filters.md` and
`popgen2-download.md`, renamed and otherwise unchanged.

The module specs it reads, revised for it the same day:

- the store, its setting for this page that makes no notice and stops a
  calculation left behind, its setting from 10 October 2026 that keeps
  no result for values left behind, `dropLeftBehind`, and `applyAfresh`,
  which the changes of the individuals file go through,
  `docs/specs/core/store.md`, "On popgen2.html: no notice, no Undo, and
  no result kept for values left behind";
- the history, `docs/specs/core/history.md`, kept by the store of this
  page at one past project, with nothing of the page that walks it;
- the band at the top of the page, `docs/specs/steps/popgen2-band.md`,
  which shows a PCA running, about to start or stopping, with its Stop,
  and points to its warnings while another tab is shown;
- the PCA's module, its definition for this page with the filters that
  narrow those of the Variants tab, its colours with the unclassified,
  and the CSV of the coordinates, `docs/specs/analyses/pca.md`, "On
  popgen2.html";
- the tabs that are greyed and why, a function of core,
  `docs/specs/core/popgen2Tabs.md`;
- the download menu of the tables and the plots, and the CSV each
  writes, `docs/specs/widgets/downloads.md`.

The calculation worker and its PCA do not change: the job is the one of
the old page, given other filters (`docs/specs/worker/protocol.md`).

## The terms

- **The one pass** is the single reading of the variants file that the
  page makes by itself when the file is opened, which gives the count of
  the variants, the plots of the Variants tab and each individual's
  missing rate and observed heterozygosity (`popgen2-filters.md`, "The
  terms"). **Read to the end** means that it read the whole file: not
  while it runs, not after a Stop, not after a failure.
- **A variants file is open** from the moment its box shows its
  individuals and its ploidy, before the one pass ends.
- **The thresholds of the Variants tab** are its five filters on the
  histograms, and the FILTER box, the check box "Leave out the variants
  that failed their FILTER"; **the individuals kept** are those its
  two thresholds of the individuals keep (`popgen2-input.md`, "The
  terms").
- **Unclassified**: an individual of the variants file with no
  population, because there is no individuals file, no column is chosen,
  its cell is empty, `NA` or `-`, or it is not in the individuals file.
- **The store** holds the project, the results and the calculations
  under way, and the screens read it. A **command** changes the project;
  a **key** is
  the text made from everything a calculation reads, under which its
  result is kept in the **cache**, the store's memory of results. A
  result is on the screen only under the key the current project gives
  (`docs/architecture.md`, section 3), and on this page the cache keeps
  no result under a key the PCA has left behind.
- **Live**: the PCA is live for the open variants file once the user
  has pressed its Run for that file, until a Stop of the PCA or the
  opening of another variants file. While it is live, a change of what
  its key holds starts it again by itself.
- **The quiet second** is the second after the user stops changing
  things, at whose end a live PCA starts again; **a change under way**
  is one that has not reached the project yet and holds the second: a
  slider held, a list open, digits typed and not confirmed, a run of the
  arrow keys waiting.
- **About to start** is the state of the PCA tab during the quiet
  second.
- **A run of the arrow keys** is the presses of the arrow keys on a
  threshold within a second of each other, which the page makes one
  change when they stop (`popgen2-filters.md`, "A threshold moved with
  the keys").
- **`follow`** is the field of each filter of the PCA's options that
  says it is as in the Variants tab, true, or the PCA's own, false
  (`docs/specs/analyses/pca.md`, "Its options").
- **vavilov-explorer** is the owner's desktop application, which
  imports the coordinates of a PCA to build groups of individuals by
  hand (`docs/use-cases.md`, case 3).
- **The old panel** is the PCA of `popgen.html`; "its words" are those
  of `docs/specs/analyses/pca.md`, "Its words" and "The warnings".
- **A lock** is a reason the PCA cannot run, written beside its Run
  button, which is then disabled.
- **The focus** is the control the keys act on; the **Tab key** moves it
  from one control to the next. **The status region** is a line of the
  page that is not seen and that a screen reader speaks each time its
  words change. A **tooltip** is the short text shown beside a control
  while the mouse rests on it or the focus is on it.
- **A tab** is one of the five labels under the boxes and the part of
  the page it shows; **greyed** is a tab that does not open, drawn in a
  lighter colour, with its reason in a tooltip.
- **React Aria** is the library of controls the page is built with,
  which gives each its keys and the words a screen reader reads.
- **WebGL** is the part of the browser that draws the 3D view with the
  graphics card; **three.js** the library that draws it, 139 KB
  gzipped (139,369 bytes with `gzip -9` in the site built on 10 October
  2026; 134 KB was an estimate), downloaded the first time a 3D view is
  drawn.

## What changes for the user

- Under the boxes, five tabs: **Variants**, the tab "Variants file" of
  today; **Individuals**, the tab "Individuals file" of today; **PCA**;
  **Populations**; **Distances**.
- PCA and Populations are greyed until a variants file is open;
  Distances until at least two populations have an individual in the
  variants file. A greyed tab does not open, and says why on the mouse
  and on the focus of the keyboard.
- The PCA tab runs a PCA of the genotypes or a PCoA of the Kosman
  distances, with its own filters, stricter than the Variants tab's or
  as they are, and an LD pruning on by default whose distance the user
  types. Its Run waits for the one pass to end.
- Populations and Distances, once they open, say that they are not
  built yet.
- Every table and every plot of the page has a button "Download…",
  which offers the table as CSV, or the plot's image as SVG or PNG and
  its data as CSV.
- No Undo and no Redo, and no key of theirs, from 10 October 2026.
- Once Run has been pressed for the file, the PCA is calculated again by
  itself one second after the user stops changing a threshold, the
  FILTER box or an option of the PCA. While it runs, those stay greyed,
  as before. Stop ends it and keeps it from starting again until Run.
- A value set back is calculated again: no result is kept for values
  the screen no longer shows.
- A band at the top of the page says what is running and offers its
  Stop (`docs/specs/steps/popgen2-band.md`).

## What it shows

### The order of the page

From the top: the band (`docs/specs/steps/popgen2-band.md`), always at
the top of the window, which from 10 October 2026 carries the heading
"Popnei" at its left, with what the page is doing after it, Undo and
Redo having left the right end of the heading's line; the two boxes, "Variants file" and "Individuals file", as
`popgen2-input.md` gives them; the row of the five tabs; the content of
the tab shown.

### No Undo and no Redo

From 10 October 2026 the page has no Undo and no Redo, no buttons and
no keys, as the owner asked that day on trying the page, "the marimo
model" (`docs/designs/no-undo.md`). From 9 to 10 October 2026 they
stood at the right end of the line of the heading, each drawn only
while it had a step, and waited while a PCA ran; this section described
them, and its earlier text is in the history of the repository. What
Ctrl+Z and Cmd+Z do on the page now is in `popgen2-filters.md`, "Undo,
Redo and their keys": they put back the number of a box with digits
not confirmed, and do nothing else. The changes that were steps, the
thresholds, the FILTER box, the column of the populations, the options
of the PCA, the colour, the axes and 3D or 2D, are commands of the
store as before, each with its description, which is shown nowhere.

**The commands**, each sent with `store.apply` and its description,
which until 10 October 2026 named its step in the tooltip of Undo:

| what the user does | the description |
|---|---|
| a threshold of the Variants tab moved, typed, turned on or off | those of `thresholdChange.ts` of `src/ui/variants/`: "the filter of the variants by missing data changed", "the MAF filter was turned on", "the filter of individuals by missing data was turned off", … |
| the FILTER box ticked or not | as `popgen2-filters.md` gives them |
| a column chosen in "Column of the populations", or None | "the column of the populations changed" |
| the method of the PCA | "the method of the PCA changed" |
| the slider of its missing data or its MAF moved below its upper end from that end, one command, `stricterCommand`, that sets `follow` false and the value together | "the missing data filter of the PCA was made stricter", "the MAF filter of the PCA was made stricter" |
| the same moved to its upper end | "the missing data filter of the PCA was set back to as in the Variants tab", "the MAF filter …" |
| the same moved from a value below its upper end to another | "the missing data filter of the PCA changed", "the MAF filter of the PCA changed" |
| the LD pruning of the PCA turned on or off | "the LD pruning of the PCA was turned on", "… was turned off" |
| its r² or its distance typed | "the LD pruning of the PCA changed" |
| "Colour the points by" | "the colour of the points of the PCA changed" |
| a component chosen for an axis | "the components on the axes changed" |
| 3D or 2D | "the PCA was drawn in 3D", "the PCA was drawn in 2D" |

Under the PCoA every "the PCA" of the table is "the PCoA". The opening
of a variants file goes through the store's `open`, and the opening,
the removal and a change of an option of the reader of the individuals
file through `applyAfresh`; the column the page chooses at the end of
a read is the store's `populationColumnChosen` (`docs/specs/entry.md`,
"The column of the populations on popgen2.html").

### The PCA calculated again by itself

**Live.** The PCA becomes live for the open variants file when the user
presses its Run for that file. From then on, a change of anything its
key holds starts it again by itself, without a press of Run: a
threshold of the Variants tab, of the variants or of the individuals,
the FILTER box, the method, the sliders of the missing data and the
MAF, the LD switch, its r² and its distance. Nothing else starts it:
not "Colour the points by", the axes, 3D or 2D, the turn of the 3D
view, the individuals file, its column of the populations, nor a turn
to another tab, since the key holds none of them
(`docs/specs/analyses/pca.md`, "On popgen2.html", the key). Until 12
October 2026 a change of the project that was not of the key, the end
of a read of the individuals file among them, still started the quiet
second again. Since then (the review of the Distances tab), a change of
the project is a change for the live analyses only when it changes,
for one of the analyses that can be live, the PCA, the diversity or
the distances, live or not, its key or the reason it is locked: so
"Colour the points by", the axes, 3D or 2D, and the measure of the
heatmap of the Distances tab, which no key holds, neither put off a
start about to come nor lift the hold after a crash (below, "Several
analyses calculated again by themselves"). The live
state ends at a Stop of the PCA, in this tab or in the band, during a
run or during the quiet second, as the owner chose on 10 October 2026
(open point 1 of the design); at the opening of another variants file,
or of the same one again, which is a new load; and at a reload of the
page, which keeps nothing. It does not end when the PCA is locked or
the user turns to another tab, nor at popnei's refusal or a crash of
the calculation worker whose words do not speak of the memory: after
such a failure the next change of what the PCA reads tries again under
its new key, and Stop recalculating and then Run, in the tab, try again
under the same key.
It ends, as a Stop ends it, at a crash whose words speak of the memory,
a PCA of 2,264 individuals or more (`crashText` of
`src/core/analyses/pca.ts`), and at the failures only a reload mends:
the calculations that could not start, the page out of date, and an
error of the application's own. The tab then shows the failure's words
and, under them, the line of a failure that ended the live state, "The
PCA no longer starts by itself after a change, since its calculation
failed. Run calculates it and starts it again after each change.", and
not the line after a Stop, which the user did not press; nothing starts
until Run (since 11 October 2026, from the review of work package 1 of
`docs/plans/population-tab.md`; until then the line after a Stop). The reasons: a worker ended in the middle of a
calculation keeps its memory in WebKit for 40 s and more
(`docs/designs/no-undo.md`), and a PCA tried again a second after each
change of a user who follows the crash's advice, to keep fewer
individuals, would grey the filters and pile that memory up; and a
failure only a reload mends fails again at every change. (The
session's decision of 10 October 2026, from the review of work package
4 of `docs/plans/no-undo.md`; until then every failure left the PCA
live.)

**When it starts.** While the PCA is live, it starts by itself once
all of these hold:

- the store gives it a key, so it is not locked, and holds no result
  and no failure under that key, so it is `ready`;
- the page has not started it under that key since the project last
  gave that key; a key left behind and given back, a value set back,
  counts as new;
- the one pass is read to the end, as Run requires (`passLock`, "Run
  and Stop", below);
- no calculation runs in the calculation worker, nor a write of the
  filtered variants, and the dialog of that download is not open;
- the quiet second has run out.

**The quiet second** runs from the latest of two moments: the last
change of the project, and the end of the last change under way. Each
change, of any control, starts it again, so the user can go from one
control to the next. A change under way is one the user is making that
has not reached the project yet:

- the pointer held on the thumb of a slider of the PCA, or on the line
  of a threshold, moved or held still: a thumb pressed holds from the
  press to the release, or to the browser cancelling the press, a touch
  interrupted;
- a list or a menu open, a popover of the page: the method and the
  other lists of the PCA tab, the components on the axes and "Colour
  the points by", the column of the populations in the box of the
  individuals file, and every menu "Download…": from its opening to its
  closing, since a user with a popover open is still choosing;
- a number box typed in, those of the thresholds and the PCA's r² and
  distance: from the first key to the commit, by Enter, Tab or a click
  elsewhere, Escape or the box leaving the page, also while the text
  typed so far reads as the box's own number, 0.1 on the way to 0.15;
- a run of the arrow keys on a threshold, which becomes one change a
  second after its last press (`popgen2-filters.md`, "When a threshold
  changes the project");
- the dialog of the download of the filtered variants open.

Every change under way ends when its control leaves the page, as well
as at its release: a slider, a list, a box or a dialog removed while
held, by another variants file opened, a tab that becomes greyed or an
error that empties a part of the page, lets its hold go, so that no
hold is left that would keep the PCA from starting for good.

So the PCA starts one second after the last change or release, and
about two seconds after the last press of an arrow key on a threshold
of the Variants tab, the threshold's own second and this one. Each
press of an arrow key on a slider of the PCA is a change, and so is
each press of the left or the right arrow, or of a letter, on the
closed list of the method, which React Aria's list takes as a choice of
the next item; each puts the second off. When the second runs out, the
PCA is calculated for the values on the screen at that moment, not for
those of the first change. Without the changes under way, the lock of
the filters would fall on a control still in use: a thumb held still
for a second would jump back at its release, an open list would close,
and a box would stop taking digits before Enter (the design, choice 2).

**About to start.** During the quiet second, and for as long as a
change under way holds it, the tab shows no result,
since its values are no longer those on the screen, and no Run: the
options, open to change, the line of the individuals, the button "Stop
recalculating" where Run stands, and, under it, in the place of the
bar and in the page's normal text, the line "The PCA starts in a
moment, later if the filters or its options change." ("The PCoA …"
under the PCoA); the line names the options as well as the filters,
since a change of the method, of a slider of the PCA, of its r² or of
its distance starts the second as a threshold does (task 4.2 of
`docs/plans/no-undo.md`, from the review of its work package 2; "once
the filters stop changing" until 10 October 2026). The words hold also
in the quiet second after a Stop of another analysis the PCA waited
for, when nothing changed, and for a PCA whose Run waited and that has
not run yet (corrected on 11 October 2026 after the review of work
packages 2 and 3; "The PCA starts again in a moment, once the filters
and its options stop changing." until then). While the dialog of the download holds it, the line is "The PCA
starts again when the download is written or closed." ("The PCoA …"),
which the tab reads from what `autoRuns` says the start waits for, the
dialog's hold being of a kind of its own on the gate (below). Stop
recalculating there ends the live state before the PCA starts: the tab
shows Run, with the line after a Stop in the place of the bar, and
nothing starts until Run is pressed. (Stop during the second is
the session's decision of 10 October 2026, from the owner's choice that
Stop pauses the automatic runs: a user who wants to change two filters
slowly, a screen reader's user among them, can keep the PCA from
starting between them.)

From 11 October 2026 the PCA can also wait for the diversity: an option
of the PCA changed while the diversity runs, which the diversity's lock
leaves open, or Run pressed then. The tab then shows the same, with the
line "The PCA starts once the diversity, which is running, ends." ("The
PCoA …"), and the PCA starts at the diversity's end with no second
more ("Several analyses calculated again by themselves"). A Run of the
PCA that waits so is said once in the status region, "The PCA starts
once the diversity, which is running, ends.", by `runLive` of
`src/ui/analyses/liveRun.ts` (`popgen2-populations.md`,
"Accessibility").

**Stop recalculating.** Whenever the PCA is live and no PCA runs, with
its result, during the quiet second, live and locked, or after a
failure that leaves it live, the tab's one button is "Stop
recalculating", where Run and Stop stand, in the same place of the Tab
key's order. It ends the automatic runs as a Stop does (`autoRuns.pause`),
the line after a Stop then stands in the place of the bar, and nothing
starts until Run. While a PCA runs, the button is "Stop", which stops
the run and ends the live state. So a user of the keyboard or of a
switch can end the automatic runs before the next change, from the
button they last used, where Stop in the band is reached only while a
PCA runs or is about to start and Stop in the tab, after a run, was
gone; a button named "Stop" beside a lock would have stopped nothing
that the user could see (WCAG 2.2.1; the session's decision of 10
October 2026, from the review of work package 4). With the result
shown, nothing stands under the button: the line "The PCA is calculated
again after each change of the filters or of its options.", which the
review of work package 4 had put there to explain the button, was taken
away by the owner on 11 October 2026 (round 1 of work package 8), and
the button's name says what it does. It has no description, as before,
since the lines under it are not its description ("Run and Stop",
below). After a failure that leaves the PCA live and that Run may
mend, a crash of the worker not of the memory, the tab shows Run, which
tries again under the same key and keeps the PCA live, and "Stop
recalculating" beside it, Run first in the order of the Tab key, under
the failure's own words, so that a retry is one press; when Stop
recalculating goes, the focus it had goes to Run. After popnei's
refusal, which the same key would meet again, Stop recalculating
stands alone. (The session's decisions of 10 October 2026.)

**Running.** A PCA started by itself is as one started by Run: Stop,
the bar and the clock, and the filters it reads greyed with "Stop the
PCA in the PCA tab to change the filters; then press Run there to
calculate it again." ("While a PCA runs", below). The status region
says "Calculating the PCA again. To change the filters, stop it in the
PCA tab." ("the PCoA") once, at its start, or, at the first start of a round of
several live analyses, the words of the round ("Several analyses
calculated again by themselves", "The status region"), and does not move the
focus, so that a user who changed a threshold in the Variants tab, and
then finds it greyed, learns why and where; a user who reaches a
greyed control hears its reason as before. Both name the tab and what
follows, since the Stop also ends the automatic runs, so that a Run is
needed after it (from the review of work package 4, 10 October 2026;
"Stop the PCA to change the filters." and "Calculating the PCA again.
Stop it to change the filters." before). Its end is said as the end of
any run, "PCA of panel.nei calculated."; a PCA that ends before its
start is written into the region, within its pause of a tenth of a
second, is said by its end alone, since the two words joined would say
that it is calculating and that it is done at once (from the review of
work package 4, 10 October 2026).

**No time limit on the user** (WCAG 2.2, success criterion 2.2.1,
Timing Adjustable). The quiet second is a time after which the page
acts, and a user who changes controls slowly, with a screen reader or
a switch, may find the next one greyed by a PCA that started. It holds
because the user can turn the automatic runs off at any moment, before
or after a start: Stop recalculating in the PCA tab, whenever the PCA
is live and no PCA runs, and Stop, in the PCA tab and in the band,
which the keyboard reaches from anywhere on the page as its first
stops, while one runs, end the live state, and nothing then starts
until Run; the second is put off by any change under way, so it never
runs out while a control is held; and a greyed control says how to get
it back, "Stop the PCA in the PCA tab to change the filters; then press
Run there to calculate it again.", as does the status region at each
start.

**A value set back is calculated again.** The store of the page keeps
no result for values the screen no longer shows (`docs/specs/core/store.md`,
`dropLeftBehind`), so a threshold moved and moved back starts the PCA
twice when the two changes are more than a second apart, once for each,
and once, for the value set back, when they are within the second,
which the second change puts off. The one
exception is a lock: the LD distance emptied keeps the result it had,
not shown, and the same distance typed again shows it with no
calculation; another distance calculates.

**What starts nothing.** The PCA not live; locked, with its reason
beside Run, until the lock lifts; done under the key; in error under
the key, popnei's refusal or a crash of the worker not of the memory,
which a change to another key starts again, and Run again in the tab
tries again under the same key; and a change that gives the key it
had.

**Stop.** Stop, in the tab or in the band, ends the run, as before,
and the live state, as Stop recalculating does when no PCA runs: the
tab shows Run with no result, since none is kept for these values, or
the result when it had one, and a later change starts nothing until
Run is pressed, with the line "Stopped: the PCA no longer starts by
itself after a change. Run calculates it and starts it again after
each change." under the button, in the place of the bar, in the page's
normal text, in every state but a run, until Run or another variants
file; with the result shown, which offers no Run until a change takes
it away, "Stopped: the PCA no longer starts by itself after a change.
After the next change, Run calculates it and starts it again after each
change." (corrected on 11 October 2026 after the review of work
packages 2 and 3: the line named a Run the screen did not show). The reason is
the memory: in WebKit, the engine of Safari, a
Stop of a PCA of 9,381 individuals leaves its 3.7 to 4.2 GB in the tab
for 40 s and more (`docs/architecture.md`, section 5), and a PCA
started by itself a second after the next change would grow on top of
it, and grey the next filter before the user reached it. That memory is
of a worker ended while it calculates. A worker ended after its result,
as the client ends it after a PCA of more than 700 individuals
(`PCA_RESTART_INDIVIDUALS` of `src/worker/client.ts`), gave its memory
back within 3 s in both engines: 3 s after the result of a PCA of
9,381 individuals the engine held 0.44 GB in Chromium 153 and 0.64 GB
in WebKit 26.6, against 3.19 and 3.76 GB at the peak (measured on 10
October 2026, `docs/plans/analyses-pca.md`, work package 7). So a PCA
started a second after a finished one does not pile up on it: measured
on 10 October 2026 on the owner's Mac, the peak of the PCA started by
itself was 0.019 GB above the first's in WebKit 26.6 and 0.063 GB in
Chromium 153 (`docs/plans/no-undo.md`, "What was done", work package
4; `docs/architecture.md`, section 11). The status
region says "PCA stopped. Press Run in the PCA tab to calculate it
again." ("PCoA"), whichever Stop was pressed, since a Stop in the band
leaves the tab out of sight; and "PCA stopped." alone when the tab then
offers no Run to press: Run disabled by a lock, whose reason takes the
focus in the tab and is read as "Run is unavailable: " and the reason,
or the result shown, with no button (from the review of work package 4,
10 October 2026, which heard "Press Run…" beside a disabled Run).

**Another variants file** stops the PCA, as before, and ends the live
state: for the new file, the PCA waits for its Run.

**The download of the filtered variants** waits while a PCA runs, as
built, also one started by itself; pressed during the quiet second, it
goes first, and the PCA starts a second after its dialog closes
(`popgen2-download.md`, "While a PCA runs", "When the PCA starts by
itself").

**For the implementer** (the design, "For the session that builds
it"): the start by itself is in `src/ui/autoRuns.ts`, the PCA a second
group after `POPGEN2_CHAIN`, so that it waits for the one pass as
`passLock.ts` makes Run wait; Run of the tab calls `autoRuns.run`,
which records the live state as the load id of the variants file and
starts the PCA at once; Stop calls `autoRuns.pause`, which cancels the
run and ends the live state; `autoRuns` forgets a key it started the PCA
under once the store leaves that key behind; it starts nothing while
`anyRunning` of its groups, a write of the store, or a change under way
holds; and it reads the PCA's key from the store when the second runs
out. The changes under way are counted by the gate of the page,
`createRunGate` of `src/ui/variants/thresholdRun.ts`: `holdChange(kind)`
holds a change under way of a widget, of the kind `"control"`, the
default, or `"download"`, the dialog of the download
(`HOLD_KINDS`), and gives the function that lets it go; `heldBy(kind)`
says whether a hold of that kind is held, a run of the arrow keys
being a control's; `underWay()` is the count, the holds of
`holdChange` and the runs of the arrow keys held; `busy()` is whether
the count is above 0; and `subscribe` tells its listeners when the
count rises from 0 or falls to 0, which is when `busy()` changes, and
when `heldBy` of a kind changes, and at nothing else (from task 2.2 of
the plan, until then also at each move of a run of the arrow keys; the
kinds from the review of work package 4, 10 October 2026, which
replaced a record of the dialog kept apart from the gate,
`downloadOpen.ts`), so that `autoRuns`'s listener, and any screen,
reads `busy()` and `heldBy`. The count goes from 1 to 2 and back with nobody told, so no
screen reads it with the subscription; it is for the tests. `Slider.tsx`,
`ThresholdSlider.tsx`, `Select.tsx`, `NumberField.tsx` and
`DownloadMenu.tsx` of `src/ui/widgets/`, and the dialog of
`src/ui/variants/DownloadVariants.tsx`, take and release a hold through
`src/ui/widgets/changeHold.ts`, whose narrow holder, `ChangeHolds`, has
`holdChange` alone: `popgen2.html` gives the gate as the holder, through
`ChangeHoldsProvider`, `popgen.html` a holder that holds nothing, and a
widget drawn with none is a defect. `holdKeyRun` is left to the
runs of the arrow keys, whose `HeldRun.release(made)` makes the run's
change: any change by another control ends a run held through
`endAll`, so a widget that took one would lose it in the middle of a
drag. The box of a threshold registers its commit with
`registerTyped`, which `commitTyped` calls before an opening; that is
no change under way. The state about to
start is the PCA `ready` in the store, live, its key not started under,
the one pass read to the end; `autoRuns` gives the page what its start
waits for then, `aboutToStart(id)`, `"download"` while the dialog of
the download holds it or its write runs, `"changes"` otherwise, `null`
when it is not about to start; and one snapshot of the live state,
`liveState(id)`, `{ kind: "off" }`, `{ kind: "stopped" }` or `{ kind:
"live", aboutToStart, running }`, the same object while it does not
change, whose every change, by the store, by the gate or by `run` and
`pause`, its `subscribe` tells, so that a screen reads it with that
subscription alone. The live state is not in the
project: the project is shared with `popgen.html`, and a field of it
would have to be kept out of the PCA's key by hand (the design, choice
3).

### Several analyses calculated again by themselves

From 11 October 2026, for `docs/designs/population-tab.md`, the PCA and
the diversity of the Populations tab are each live on their own; from
12 October 2026 the LD decay of the same tab is too
(`docs/plans/ld-decay-tab.md`), and the distances between populations
of the Distances tab (`popgen2-distances.md` and below).
What this section says holds for every live analysis; what the section
above says of the PCA, its live state, its quiet second, its changes
under way, its Stop and its failures, holds for each, with its own key,
its own tab and its own words. A user who wants the diversity
calculated again does not get a PCA of minutes they never asked for:
each analysis is live once its own Run is pressed (the design, choice
4).

From 12 October 2026 the LD decay of the Populations tab is a further
live analysis, last in the order of calculation, after the distances
(`docs/specs/steps/popgen2-populations.md`, "The LD decay";
`docs/plans/ld-decay-tab.md`): it may run for minutes and nothing
interrupts it, so it runs after the others, which never wait for it
after a change. The tabs keep their order, the LD decay after the
diversity in the Populations tab, and the band and the words that name
several analyses follow the tabs. Nothing below changes for it: it
follows every rule of this section, with its own words. What it adds is
said where it applies: its rule of `endsLive`, the round of three, and
the words of the analyses of one tab.

From 12 October 2026 the distances between populations of the
Distances tab are a further live analysis (`popgen2-distances.md`,
`docs/plans/distances-tab.md`), after the diversity and before the LD
decay in the order of calculation, `"popDists"` in `POPGEN2_LIVE`, with nothing of this section changed but the
words that name them: they read the populations, as the diversity does,
so the lock of the populations and the round's words name them where
they name the diversity; and the page calls them "the distances", a
plural, so the sentences that name an analysis by its words give them
a verb and a pronoun in the plural: "The distances start in a moment",
"Stop the distances in the Distances tab to change the filters; then
press Run there to calculate them again.", "Waits for the distances to
end; or stop them in the Distances tab.", "…while the distances run."
So do the sentences of another analysis that name them, since the
review of the Distances tab on 12 October 2026: "The PCA starts once
the distances, which are running, end.", "Waits for the distances, and
the PCA after them, to end; or press Stop all beside the heading
Popnei." `LiveAnalysisName` of `src/ui/analyses/status.ts` says which
analyses are named in the plural.

**The order.** The calculation worker runs one calculation at a time.
When several live analyses are about to start after one change, a
threshold of the Variants tab for instance, they run one after the
other in the order of the tabs: the PCA, then the diversity, later the
LD decay, then the distances (the design, choice 1, recommended over
the tab shown first and over analyses calculated only when their tab
is shown). The quiet second is one for all of them: when it runs out,
the first in the order starts, and each next one starts when the one
before it ends, with no second more, unless a change comes meanwhile.
A change of what one analysis alone reads, an option of the PCA, the
column of the populations, an option of the diversity, gives that one
alone a new key, and starts it alone.

**Waiting.** A live analysis whose quiet second has run out and that
does not run, because another calculation runs, is waiting. Its tab
says which analysis it waits for ("The diversity starts once the PCA,
which is running, ends."), keeps its options open and shows no result,
since none is kept for values left behind. While the quiet second runs,
an analysis with another before it in the order about to start says so
too ("The diversity starts after the PCA, once the filters, the options and
the populations stop changing.").

**What holds an analysis back.** A live analysis waits for the one pass
and for nothing else of the page but a calculation running: whatever
the state of the other live analyses, not live, stopped by the user,
locked, done, in error or about to start, they do not keep it from
starting. Until 11 October 2026 any analysis before it that was
neither done nor locked held it back, so a PCA never run would have
kept the diversity from ever starting by itself (the design, "For the
session that builds it", point 1).

**A Run while another analysis runs** makes its analysis live and
waiting, and sends nothing: it starts when the one running ends, in the
order above (the design, choice 3). With nothing running and no write,
Run starts its analysis at once, whatever is about to start; the
others about to start then wait after it. Run during the one pass stays
locked, as it is: the one pass is no live analysis, and its Stop and
Start again are its box's.

**Stop.** The Stop of a live analysis, in its tab or in the band, stops
that analysis and ends its live state alone, as for the PCA. The other
live analyses then start a quiet second after the Stop, not at once:
the user who stopped the PCA to change a threshold has that second to
begin, and each change puts the start off again, so the others
calculate with the new value (the design, choice 5, the owner's answer
1a of 11 October 2026). Stop recalculating in a tab ends that
analysis's live state alone too.

**A failure that ends a live state**, by the rule of its analysis
(below, `endsLive`), lets the other live analyses about to start begin
a quiet second after it, as a Stop does, but for a crash of the
calculation worker: after a crash, which may be one for lack of
memory, which WebKit may still hold in the ended worker while the tab
was at its limit, the others start by themselves only after the next
change of the filters or the options, a quiet second after it, and not
in a new worker at once. Meanwhile each of them is about to start
"afterCrash", and its tab says so: "The PCA starts after the next
change of the filters or of its options, or when Run is pressed."
("The PCoA …"), "The diversity starts after the next change of the
filters, of its options or of the populations, or when Run is
pressed."; the band, "The PCA starts after the next change", "PCA
later" ("starts again" until 11 October 2026, when the band's words
were made to follow the tabs', `popgen2-band.md`). The tab offers Run there, beside Stop recalculating, in
that order of the Tab key: a Run starts its own analysis and lifts the
hold for it alone; the others wait for the next change (since 11
October 2026, after the second review of the fixes of work package 1:
before, they said "starts again in a moment" for a start that never
came without a change). The status region says, after the words of the
crash, each analysis so held, in its own words: "The PCA did not start:
it starts after the next change of the filters or of its options, or
when Run is pressed in the PCA tab.", "The diversity did not start: it
starts after the next change of the filters, of its options or of the
populations, or when Run is pressed in the Populations tab.", since a
Run that waited for the analysis that crashed was said as waiting and
would otherwise never be corrected (corrected on 11 October 2026 after
the review of work packages 2 and 3: the tab showed Stop recalculating
alone, with "starts again" for an analysis that may never have run,
and the region said nothing). (The
session's decision of 11 October 2026, from the review of work package
1 of `docs/plans/population-tab.md`; until then the others started at
once.) The tab of the analysis whose live state ended shows the line of
a failure that ended it, as the PCA's ("Live", above).

**Stop all**, in the band, whenever two or more analyses are live and
one of them runs, waits or is about to start, stops the one running and
ends the live state of every live analysis at once, so that nothing
starts by itself again until a Run (`popgen2-band.md`, "Several live
analyses"; "The line" until 12 October 2026). A
user who needs longer than a second to reach a filter, with a screen
reader or a switch, presses it, and then Run in each tab they want
back; that is how the page meets WCAG 2.2, success criterion 2.2.1,
Timing Adjustable, with several analyses. Each tab then shows the line
of a Stop.

**The lock.** While a live analysis runs, what it reads is greyed with
the words of its tab: the PCA's as in "While a PCA runs"; the
diversity's in `popgen2-populations.md`, "While the diversity runs",
which also greys the column of the populations and the individuals
file. When another analysis is live beside the one running, the words
add Stop all: "Stop the PCA in the PCA tab to change the filters, or
press Stop all beside the heading Popnei to stop the diversity too;
then press Run in each tab to calculate them again." ("the PCoA" by the
method), since a Stop of the PCA alone lets the diversity start a
second after the next change and grey the filters again. The LD
decay's, from 12 October 2026, are in `popgen2-populations.md`, "The LD
decay", "While it runs": it reads the filters and the populations, as
the diversity.
These are the words since work package 4 of
`docs/plans/population-tab.md` gave the band Stop all, on 11 October
2026. Before it, from the review of work package 1 of that plan the
same day, the words named the Stop of each tab in its place: "Stop the
PCA in the PCA tab and the diversity in the Populations tab to change
the filters; then press Run in each tab to calculate them again.",
since words that name a button the page does not show yet send the
user looking for it.

**The status region.** The first start of a round, the starts by
themselves that one quiet second gives, says the analyses of the round
once, in their order, when there are two or more: "Calculating the PCA
and then the diversity again. To change the filters, press Stop all
beside the heading Popnei, or stop each in its tab; to change the
populations, stop the diversity in the Populations tab." ("the PCoA" by
the method), the populations named with the analyses of the round that
read them (since 11 October 2026, after the review of work packages 2
and 3); with one, its own words, as above. With the LD decay, from 12
October 2026, the analyses of one tab are named with that tab once:
"Calculating the PCA, the diversity and then the LD decay again. To
change the filters, press Stop all beside the heading Popnei, or stop
each in its tab; to change the populations, stop the diversity and the
LD decay in the Populations tab."; the words of Stop all name them so
too, "Press Run for the PCA in the PCA tab and the LD decay in the
Populations tab to calculate them again.", where each analysis named
its tab before. The later starts of the
same round say nothing; each end is said as the end of any run, "PCA
of panel.nei calculated.", "Diversity of panel.nei calculated.". Only
the end of the last analysis of the round drops the round's words
still waiting in the region's pause of a tenth of a second, as the end
of an analysis alone drops its start: a PCA that ends within that
pause is said after the round's words, "Calculating the PCA and then
the diversity again. … PCA of panel.nei calculated.", since the
diversity then starts and its start is said nowhere else (corrected on
11 October 2026 after the review of work packages 2 and 3: until then
the PCA's end dropped the round's words, and the diversity's start was
never said). A Run
that waited is said when it starts, "Calculating the diversity of
panel.nei.", since the user pressed it earlier, and the bar then comes
in a tab they may not see; the PCA's, "Calculating the PCA of
panel.nei." ("the PCoA" by the method). Stop all is said once: "Stopped: the PCA and
the diversity no longer start by themselves. Press Run in their tabs to
calculate them again.", with the second sentence only for the tabs
that then offer Run, as a Stop in one tab says it: "… Press Run in the
PCA tab to calculate the PCA again." when only the PCA offers it, the
diversity's result shown with no Run, and the first sentence alone when
none does (corrected on 11 October 2026 after the review of work
packages 2 and 3: it said "Press Run in their tabs" also of a tab that
showed its result and no Run). The round's words name Stop all since
work package 4 of `docs/plans/population-tab.md` gave the band that
button, on 11 October 2026. Before it, by the session's decision of
the same day in work package 2 of that plan, the round named the Stop
of each tab alone: "Calculating the PCA and then the diversity again.
To change the filters, stop each in its tab; to change the
populations, stop the diversity in the Populations tab.", as the words
of the lock did.

**The download of the filtered variants** waits for the calculation
running and for those waiting after it, since each starts when the one
before ends (`popgen2-download.md`, "While an analysis runs"); pressed
during the quiet second it goes first, and every live analysis starts
a second after its dialog closes, in the order above.

**For the implementer** (the design, "For the session that builds it",
points 1 to 7). `POPGEN2_AUTO_GROUPS` of `src/ui/popgen2Store.ts` is
the one pass, `POPGEN2_CHAIN`, then a group for each live analysis, the
PCA, the diversity and, from 12 October 2026, the LD decay;
`POPGEN2_LIVE` of `src/core/apps.ts` lists the live ones in that order,
the one list the page reads. In
`src/ui/autoRuns.ts`:

- `holderOf` holds a live analysis back behind no live analysis, only
  behind the groups before it that hold none, the one pass;
  `sync` starts nothing while any analysis of its groups runs, as now,
  and the first live analysis in the order with a key not started
  under, so one at a time.
- `run(id)` makes `id` live and starts it at once through `runStart`
  when nothing runs and no write runs; when another runs it makes `id`
  live and calls `sync`, which starts it after, under the key it is
  ready under, also one it was stopped under; when the store would
  start nothing for it, done, locked or held back by the one pass, it
  makes it live and answers "kept", with nothing waiting; it is refused
  during a write, as now.
- `pause(id)` ends the live state of `id`, starts the quiet second
  again, `quietAgain`, and then cancels its run if one is in flight, so
  that the `sync` after the store's change does not start the waiting
  analysis at once. `pauseAll()` ends the live state of every live
  analysis and cancels the one running; it needs no quiet second, since
  nothing is left live.
- `endsLive` of `LiveDeps` is given by the page as one function that
  dispatches by analysis: the PCA's `failureEndsLive` of
  `src/ui/analyses/pca/liveEnd.ts`; for the diversity, the failures only
  a reload mends, the calculations that could not start, the page out
  of date and an error of the application's own, and any crash of the
  worker, while popnei's refusal leaves it live. The design (point 6 of
  "For the session that builds it") ends it at a crash for memory, as
  the PCA's; the diversity's crash has no words of the memory to tell
  one from another, so every crash ends it, and a crash is not tried
  again at each change, with the memory a stopped worker leaves in
  WebKit. For the LD decay, from 12 October 2026, the diversity's rule
  and popnei's refusal for memory, "this machine has not the memory
  for …", after which a run at the same settings would take as long, up
  to 25 minutes on a dense file, and be refused again after each
  change; its other refusals leave it live. Its rule is in a module of
  `src/ui/analyses/ldDecay/`, and `ENDS_LIVE` of
  `src/ui/popgen2Store.ts` names it. A refusal for memory is no crash:
  the others start a quiet second after it, in the new worker the
  client starts after every LD decay. A failure that ends the live state starts the quiet second
  again, `quietAgain`, for the others about to start; a crash of the
  worker holds them instead until the next change of the project, which
  starts the second. A change of the project, here and for the quiet
  second, is one that changes the key of an analysis that can be live,
  or the reason it is locked, as the store gives them; another change
  of the project, the measure of the heatmap or the colour of the
  points, is none (since 12 October 2026, the review of the Distances
  tab: until then any new project was one).
- The interface changes so:

```ts
/** What the start by itself of a live analysis waits for: "behind",
    another calculation that runs, whether the quiet second has run out
    or not, which wins over the two others; "download", the dialog of the
    download of the filtered variants or its write; "changes", the quiet
    second or a change under way, nothing running; "afterCrash", a crash
    of the worker ended another live state and holds this one until the
    next change of the project or its own Run, nothing running. */
export type AboutToStart = "changes" | "download" | "behind" | "afterCrash";

export type LiveState =
  | { readonly kind: "off" }
  | { readonly kind: "stopped" }
  /** A failure `endsLive` names ended it, and no Run since. */
  | { readonly kind: "endedByFailure" }
  | {
      readonly kind: "live";
      readonly aboutToStart: AboutToStart | null;
      readonly running: boolean;
      /** While it is about to start: under "behind", the live analysis
          that runs; under "changes" or "download", the live analysis
          about to start before it in the order; `null` when none, and
          while it is not about to start. */
      readonly after: AnalysisId | null;
    };

/** What the page is told of the live analyses beyond the store. */
export type LiveEvent =
  /** `id` started by itself; `round`, the live analyses about to start
      at this start, in their order, `id` first, at the first start of a
      round, and empty at a later start of the same round. */
  | { readonly kind: "startedByItself"; readonly id: AnalysisId; readonly round: readonly AnalysisId[] }
  /** A Run that waited behind another calculation, at its start. */
  | { readonly kind: "startedAfterWaiting"; readonly id: AnalysisId }
  /** The user's Stop of `id`, in its tab or in the band. */
  | { readonly kind: "paused"; readonly id: AnalysisId }
  /** Stop all: `ids`, the analyses whose live state it ended, in order. */
  | { readonly kind: "pausedAll"; readonly ids: readonly AnalysisId[] };

interface AutoRuns {
  // … as before, and:
  /** The user's Run of the live analysis `id`: "started" at once,
      "waiting" behind a calculation that runs, "kept" when the store
      would start nothing for it, done, locked or held back by the one
      pass, which makes it live with nothing waiting, or "refused" during
      a write, when nothing is made live. */
  run(id: AnalysisId): "started" | "waiting" | "kept" | "refused";
  /** Stop all: stops the analysis running, if one is live, and ends the
      live state of every live analysis. */
  pauseAll(): void;
}
```

  The band and the tabs read `liveState(id)` of each live analysis with
  `subscribe` alone, as now; its `after` is what a tab's line of waiting
  names. A round is the starts by themselves between two runs-out of
  the quiet second, which `autoRuns` counts.
- `runningAnalysisOf` of `src/ui/analyses/status.ts` gives the live
  analysis running, its name in a sentence, its tab and whether it reads
  the populations, so that the lock of the filters
  (`src/ui/variants/filtersLock.ts`), the box Individuals
  (`src/ui/variants/IndividualsBox.tsx`), the Individuals tab and the
  download (`src/ui/variants/downloadState.ts`) read it, with the
  analyses waiting from `autoRuns`.
- `announceLive` of `src/ui/variants/announceChanges.ts` says the round,
  the start of a Run that waited, a Stop and Stop all, each analysis in
  its own words, the words of several analyses at once coming from
  `src/ui/analyses/liveWords.ts`; `runLive` of
  `src/ui/analyses/liveRun.ts`, the Run of each tab, says a Run that
  waits, when `run` gives "waiting".

### The row of tabs

The labels, in their order: "Variants", "Individuals", "PCA",
"Populations", "Distances". The row is named "Files and analyses" for a
screen reader. The tab shown when the page opens is Variants, and the
page never turns to another tab by itself. All five stay drawn while
another is shown, as the two tabs of today (`popgen2-input.md`, "Both
tabs kept drawn"): a turn to another tab and back finds the PCA's plot
as it was turned, the sort and the scroll of its table, and a number
half typed.

**When a tab is greyed**, from `analysisTabs` of core
(`docs/specs/core/popgen2Tabs.md`):

| tab | greyed while |
|---|---|
| Variants, Individuals | never |
| PCA, Populations | no variants file is open: none opened, one being opened, or its opening failed |
| Distances | as PCA; or, with a variants file open, fewer than two populations have an individual in it, as the box of the individuals file counts them; or, once the individuals kept are known, fewer than two populations keep one |

The unclassified are not a population for the Distances tab. Before the
one pass has ended, with a threshold of the individuals on, the tab
follows the counts before the thresholds.

**A greyed tab** is drawn in the colour of a control that cannot be
used, the tabs that open in the colour of the text, so that the two
stand apart, 3.13:1 in the light theme and 3.03:1 in the dark in the
look of 16 October 2026 (3.39:1 and 3.26:1 before it); it never
has the weight of the words that marks the tab shown, nor its bar in the
colour of the tab shown. Each label is as wide as it is in bold, so that
the labels do not move when the tab shown changes. (Since 9 October
2026, by the review of the first work package of the plan: the tabs
that open were in the muted colour of the text, 1.34:1 and 1.69:1 from a
greyed one.) The arrow keys move the focus onto it,
and stop there, and its tooltip then shows; the mouse resting on it
shows it too, and so does a click, a tap, Enter or Space on it, which
show nothing else: the content under the row stays that of the tab
shown before, as it does for the arrow key that reached it. The
tooltip stays while the focus is on the tab, through a scroll of the
page that brings the tab into view, and while the mouse is over the
tab or the tooltip; it goes with Escape, when the focus or the mouse
leaves, and when the tab is no longer greyed. A click that did nothing
visible, or a tap on a touch screen, where no mouse rests on the tab,
would otherwise leave the user without the reason (since 9 October
2026, by the review of the first work package of the plan). The next arrow key moves the focus on,
and shows the tab it reaches if that one is not greyed.

**A tab that becomes greyed while it is shown**, the Distances tab
when "None" is chosen in the list "Column of the populations" of the
box Individuals, stays shown, greyed, with its bar kept
in the greyed colour and its words not in bold, so that the user can
tell which tab they are on; and its content is its reason, in the words
of its tooltip, in place of the options, which stay drawn, hidden, with
what the user left in them. When the tab is no longer greyed, its
content comes back as it was. Until 16 October 2026 the PCA tab was the
example, greyed while another variants file was opened by the button of
the box Variants; since then that button is at the end of the Variants
tab (`popgen2-input.md`, "The Variants tab"), so the PCA tab is not
shown while another variants file opens, and the flows of a tab greyed
while shown use Distances.

**At 320 px** the five labels wrap to two lines in the Mac's system
font, as the row's style lets them, and to three in a wider font, as
DejaVu Sans, the sans-serif font of Linux, each line as full as it can
be, nothing cut and no sideways scroll (the CI on Linux, 13 October
2026); the tab shown keeps its bar and its weight on whichever line it
is, and the page does not scroll sideways.

### The tabs not built yet

From 11 October 2026 the Populations tab shows the diversity of each
population and its spectrum (`popgen2-populations.md`); until then it
showed one line, "Not built yet: the diversity of each population, its
site frequency spectrum and its LD decay come in a later version of the
page." Distances: "Not built yet:
the distances between the populations, Hudson's Fst or Jost's D, come
in a later version of the page.", until 12 October 2026, when the tab
shows the distances between populations (`popgen2-distances.md`).

### The PCA tab

The tab's heading, an `<h2>`, is "PCA" or "PCoA" by the method of the
project. Under it, in this order: the section "Parameters", which holds
the options; the line of the individuals it will run on; Run or Stop
with the lock; and, once calculated, the result. The old panel draws
the options open, with no section.

**The section "Parameters"** (the owner, 16 October 2026; the same in
the Populations tab, twice, and in the Distances tab,
`popgen2-populations.md` and `popgen2-distances.md`, "The options"):
one line, a button whose words are "Parameters", with the chevron "›"
before them, which points down while the section is open. It is drawn
as the header of a section and not as a link: in the colour of the
text, semibold, underlined only under the pointer, with the ring of
the focus of every control (the review of 16 October 2026; until then
it was underlined text in the colour of the accent, the look of a link,
though it opens a section and goes nowhere). The section
is closed when the page opens, so that Run stands near the top of the
tab, under the heading and the line of the individuals, and a user who
keeps the defaults runs the PCA with one press. The button opens and
closes it with a click, with Enter and with Space, is a stop of the Tab
key, and tells a screen reader whether the section is open,
`aria-expanded`; what it opens is a group named "Parameters". The
header is the word alone: the option not taken, the values in force in
the closed header, the owner refused as too long. It holds every option
of the PCA, the method, its filters and its LD pruning; the components
on the axes and "Colour the points by" belong to the result and stay
with it. Whether the section is open belongs to the screen and is not
saved: it stays as the user left it while they move between tabs, since
every tab stays drawn, and is closed again only by a reload. Closed,
what it holds stays in the page, hidden, and takes no focus (React Aria's `Disclosure`, as
`src/ui/widgets/Disclosure.tsx` wraps it). An option greyed while the PCA runs is greyed inside the open
section as it was before, and the Tab key reaches it there. A reason
that keeps Run from running because of an option stands beside Run, as
every lock does, so it is seen with the section closed; its words send
the user to the section by name, "Type the LD distance in Parameters,
or turn the LD pruning off.", and the reason in full stays under the
field inside it.

**The method**, a drop-down list named "Method", React Aria's
`Select`, as the components on the axes and "Colour the points by"
are, with two items, "PCA of the genotypes" and "PCoA of the Kosman
distances", and under it the line "The PCoA suits data with many
missing genotypes.", which a screen reader reads as its description;
PCA by default. The old panel's second item says the same in one,
"PCoA of the Kosman distances, for data with many missing genotypes",
which in the button of the list wrapped to two lines at 1280 px and
read as part of the method's name, so the advice is a line of its own
since 10 October 2026 (round 1 of work package 10). A drop-down list since 10 October 2026, as the owner asked on
trying the page (`docs/plans/analyses-pca.md`, work package 10, round
1); two radio buttons before, as on the old panel, which keeps them.

**Its filters**, under the heading "Filters of the variants for the
PCA", an `<h3>`, with the line "PCA filters can be stricter than the
general analysis ones.", the owner's words of 11 October 2026 (round 1
of work package 8 of `docs/plans/no-undo.md`); "The PCA reads the
variants the Variants tab keeps. Its own missing data and MAF filters
can only be stricter." before. Every "PCA" of this part is "PCoA" under
the PCoA, as in the old panel.
Then three, in this order:

- **Missing data** and **MAF**, each a slider, React Aria's `Slider`,
  with its name above it and its value after the track, under the
  track when the column is too narrow for both:
  "Maximum proportion of missing genotypes for the PCA", from 0 to the
  Variants tab's value of that threshold; and "Maximum major allele
  frequency for the PCA", from 0.5 to the Variants tab's value, or from
  that value when it is below 0.5, as a variant of more than two alleles
  allows. While the Variants tab has the threshold off, the slider ends
  at 1. Sliders since 10 October 2026, as the owner asked on trying the
  page (`docs/plans/analyses-pca.md`, work package 10, round 1); before,
  each was two radio buttons, "As in the Variants tab: 0.1" and
  "Stricter for the PCA", the second with a number field.

  The slider starts at its upper end, the Variants tab's value, which
  filters nothing more: the PCA reads the variants as the Variants tab
  keeps them, `follow` true. Its value then reads "0.1, as in the
  Variants tab", or "Off, as in the Variants tab" while that threshold
  is off; below the end, the PCA's own value, "0.05". A screen reader
  reads the same words as the slider's value. Under the track, at each
  of its ends, the value of that end, in the colour of the lines of
  help, so that the range is seen: "0" and "0.1" for the missing data,
  "0.5" and "Off" for the MAF while the Variants tab has it off, "0.5"
  and "0.95" while it is at 0.95. A screen reader is not given them,
  since it reads the ends of a slider from the slider itself. Under the
  slider, the line of the Variants step that says what popnei filters
  on, as on the old panel.

  It moves by the step of the Variants tab's box of that threshold,
  which rounds to the step of its axis (`popgen2-filters.md`, "A number
  with many decimals"), and by 0.01 at the most: 0.001 on the missing
  rate of `panel.nei`, whose axis steps by 0.001. While the PCA has a
  value of its own, the slider takes the decimals of that value too, so
  that it never reads it rounded: a PCA's own 0.045, set on a step of
  0.001, reads 0.045 when the axis steps by 0.01.
  The arrow keys move it a step, Page Up and Page Down a tenth of its
  range, Home and End to its ends, as React Aria's slider does.

  A move becomes a command when it ends: when the pointer that dragged
  the thumb is released, at each press of a key, and at once for a
  change that comes with neither, as the swipe of a screen reader of a
  phone, VoiceOver on iOS or TalkBack, makes. At the upper end
  it sends `followCommand` with `follow` true, "set back to as in the
  Variants tab"; below it, from the upper end, `stricterCommand` of
  `src/ui/analyses/pca/commands.ts`, `follow` false and the value in
  one step, "made stricter"; below it, from a value of the PCA's own,
  the value alone, "changed". So the upper end is always "as in the
  Variants tab", whatever the Variants tab later becomes, and a thumb
  dragged there and back changes no key. A move that ends at the value
  the slider showed, a press on the thumb with no move or a key at an
  end, sends nothing, so that a press on the thumb at the end while the
  Variants tab is stricter keeps the PCA's own value (below). While the Variants tab has the
  threshold off, the end at 1 is no filter, as a threshold at 1 is off
  in the Variants tab (`THRESHOLD_OFF_AT` of `src/core/project.ts`, the
  owner's decision of 7 October 2026), and a PCA's own value of 1, left
  by "Stricter for the PCA" before 10 October 2026, is no filter either
  (`pcaFilters`, `docs/specs/analyses/pca.md`, "On popgen2.html").
  Each key pressed is a change of the project, where a threshold of
  the Variants tab makes one change of a run of the keys; while the PCA
  is live, the quiet second gathers them, and the PCA starts once, a
  second after the last press ("The PCA calculated again by itself").

  The ends, the step and the value shown are `stricterBound` of
  `src/ui/analyses/pca/stricter.ts`, from the project and the decimals
  of the step of the Variants tab's box of that threshold, which the
  axis of its histogram gives once the one pass has drawn it; before
  that, the decimals of the Variants tab's value, and at least two. The
  words of the value are `stricterValueText`, and the command of a move
  `stricterMoveCommand`, of the same module.

  **When the Variants tab becomes stricter** than the PCA's own value,
  the slider's end follows it and the PCA uses the Variants tab's: the
  thumb stands at the end, its value "0.03, as in the Variants tab", and
  under it the line "The Variants tab keeps at most 0.03, stricter than
  the 0.05 set here, so the PCA uses 0.03." The project keeps 0.05, and
  when the Variants tab goes back above it, the thumb shows 0.05 again
  with no command. The thumb never shows a value looser than the one
  used. This line is `tabStricterLine` of the same module.

  **When the slider would have no range**, its two ends the same, with
  the Variants tab's missing rate at 0, or its MAF at or below 0.5, no
  slider is drawn, since its thumb could not move: its name, and under
  it the line "0, as in the Variants tab. The PCA cannot be stricter
  than the Variants tab here.", with the Variants tab's value, "0.5" or
  "0.4" for the MAF; then the line of what popnei filters on. The PCA
  uses the Variants tab's value. This line is `emptyRangeLine` of the
  same module; decided by the session on 10 October 2026, as React
  Aria's slider divides by its range and showed "NaN" there.
- **LD pruning**, a switch, "Prune the variants by linkage
  disequilibrium (LD)", on when the page opens, with two number fields
  under it while on: "Maximum r² with a variant kept before it, from 0
  to 1", at 0.1, and "Distance within which variants are compared, in
  base pairs, from 1", at 100,000, so that the PCA runs with no option
  typed. The owner decided the default on 16 October 2026, reversing for
  this distance the rule of no default that depends on the genome of 27
  and 28 September 2026; the option not taken, the field empty and Run
  locked until the user typed a distance, made every user stop before
  their first PCA for a number many of them would not know. The Variants
  tab has no LD pruning, so the PCA's is its own alone. Under the
  distance, a line says that the start is not right for every genome,
  and which number of the LD decay to read: "100,000 bp is a start that
  suits many genomes but not all. The LD decay of the Populations tab
  shows how far LD extends in your data: choose a distance where its
  curve has flattened, well beyond the half distance." The half distance
  of the LD decay, where its curve falls to half its r² at distance 0,
  is far shorter than a window of pruning should be, so the line sends
  the user past it. On 16 October 2026 it first said "The window within
  which pairs of variants are compared. 100,000 bp is a start …; the LD
  decay of the Populations tab shows how far LD extends in your data.",
  whose first sentence repeated the label; until then it said "Choose the distance beyond which the r²
  between two variants falls to its background level in your species,
  as studies of its LD decay report." The field emptied by the user is
  no distance, which locks Run: the field calls `onEmptied` of the
  number field, where on the old page an emptied field shows its number
  again. While the distance is empty, the reason of the lock, in
  full, stands under that field and describes it to a screen reader,
  is announced in the status region,
  drawn as a line of what is needed, in the colour of the lines of help
  and with no mark of a problem, since the user caused no error; beside
  Run a short line points to it (below). Until 10 October 2026 the same
  words stood in red under the field and again beside Run, and a screen
  reader read them twice; the review of work package 6 of the plan
  found it. Under the two fields, and describing both, the old panel's
  line of what the pruning keeps: "Of two variants closer than the
  distance, and with an r² above the maximum, the first is kept."
  Turning the switch off removes the fields and keeps their
  values for when it is turned on again.

The number fields follow the rules of the fields of the old panel and
of the Variants step: at most two decimals for r²,
a whole number from 1 to 9007199254740991 for the distance, written
with no comma between thousands; the empty distance field sends nothing
on the arrow keys, Page Up, Page Down, Home and End.

**The line of what it will run on**, only when the filters of
individuals remove some: "111 of the 200 individuals of panel.nei,
those the filters of individuals keep". When the PCA uses every
individual of the variants file the tab says nothing of them, since the
boxes at the top already count them; the owner decided it on 16 October
2026. Until then the tab said "200 individuals of panel.nei", as the
old panel still does.

**Run and Stop**, one button, with the lock beside it as text that
describes it. Run makes the PCA live for the file and starts it at
once; Stop ends the run and the live state ("The PCA calculated again
by itself"). While the PCA is live and no PCA runs, the button is
"Stop recalculating", which ends the live state: during the quiet
second, with the line "The PCA starts in a moment, later if the
filters or its options change." under it; with the result;
after a failure that leaves it live; and while the PCA is live and
locked, enabled, beside the lock, so that the automatic runs can be
turned off before the lock lifts. After a Stop, until Run or another
variants file, the line "Stopped: the PCA no longer starts by itself
after a change. Run calculates it and starts it again after each
change." stands under the button, "… After the next change, Run
calculates it …" with the result shown, so that a user who changes a filter
and sees nothing start learns why (task 4.2 of `docs/plans/no-undo.md`).
The two lines stand in the place of the bar, in the page's normal
text, and are not the button's description, which a screen reader
would read at each visit of the button and which, as the small grey
words beside the button, read as a lock and wrapped under it at 320
px (the review of work package 4, 10 October 2026); the button keeps
its place when they come and go. The lock is the first of these:

| the lock | the words |
|---|---|
| the PCA, of a file of more than 9,381 individuals, which the opening already tells | the old panel's, "panel.nei has 12,000 individuals, and the principal components of more than 9,381 need more memory than a browser tab can hold. Calculate them with popnei in Python, outside the browser." |
| the one pass is running, or is about to start | "Run once panel.nei is read to the end: the reading under way in the box Variants and the PCA cannot run at once." |
| the one pass was stopped by the user, or failed in a way its box offers Start again for | "Run once panel.nei is read to the end: Start again its reading in the box Variants." |
| the one pass refused by popnei, or the file could no longer be read, where the box offers no Start again (`startAgainMends` of `src/ui/variants/chain.ts`) | "Run once panel.nei is read to the end: it could not be read, as the box Variants says. Open it again, or another, in the Variants tab." |
| more than 9,381 individuals kept, the PCoA | the old panel's, with "Keep at most 9,381 with the filters of individuals in the Variants tab" |
| the filters of the individuals keep none | the store's, ending "Loosen them." |
| the LD pruning on with no distance | "Type the LD distance in Parameters, or turn the LD pruning off."; the reason in full stands under the field of the distance ("Its filters"); "Type the LD distance above, …" until 16 October 2026, when the options went into the section "Parameters" |

The three of the one pass are the screen's, `passLock` of
`src/ui/analyses/pca/passLock.ts`, a pure function of the store's state
of the one pass and of the state of the code that starts it by itself,
which alone tells a pass stopped by the user from one about to start. The others
come from the module and the store. The individuals file never locks
the PCA: while it is read, refused or absent, the points are
unclassified. A PCA running shows Stop, the bar and the clock of the
old panel, "Calculating · 35% · 0:12", and its line, "The bar shows the
reading of panel.nei. The components are calculated once it is read,
and the bar does not move meanwhile: from under a second for 1,000
individuals to minutes for several thousand.", the times measured on
the old page in Chromium 153 and WebKit 26.6 on the owner's Mac on 29
September 2026 (the design, "The memory and the time").

**Run within the second of the arrow keys.** A run of the arrow keys
on a threshold of the Variants tab becomes a change of the project a
second after its last press (`popgen2-filters.md`, "When a threshold
changes the project"). Run pressed while such a run still waits, or
while a number typed in a threshold's box is not yet applied, first
makes the run, and the number, a change, as the download of the
filtered variants does before its dialog opens, and then starts the
PCA, so that the PCA reads the threshold the user gave. The threshold
also ends its run when it loses the focus, which the Variants tab
hidden by the turn to the PCA tab takes from it in Chromium and WebKit
(seen on 10 October 2026); Run ending it as well does not rest on how a
browser moves the focus. Until 10 October 2026 Run did not, and a run
still waiting would have started the PCA on the threshold before it,
then stopped it with no words a moment later, as the review of work
package 6 of the plan read the code. The gate of the page, `gatedStore` of
`src/ui/variants/thresholdRun.ts`, does it for every Run of the page
(`docs/specs/core/store.md`).

**While a PCA runs**, what it reads is locked, so that no change leaves
it behind (the owner's answer 2 to `docs/plans/analyses-pca.md`, 9
October 2026): the five thresholds of the Variants tab, their lines and
their boxes, the FILTER box, and the PCA's own options, the method, whose
list does not open, the sliders of the missing data and the MAF, the
LD switch and its two fields. Each is drawn greyed, carries
`aria-disabled`, and is still reached by the Tab key, so that a user of
the keyboard learns why; its tooltip, on the mouse, the focus and a
press, and its description for a screen reader, are "Stop the PCA in
the PCA tab to change the filters; then press Run there to calculate it
again.", "Stop the PCoA …" under the PCoA, the way the
greyed tabs give their reason (`WithTooltip` of the widgets). A
tooltip shown by the focus stays through any scroll while its control
has the focus, and goes with Escape, when the focus leaves the control,
or when the mouse leaves it: the browser scrolls a control reached by
the Tab key into view a frame after its tooltip shows, and React Aria
closed the tooltip on that scroll, so that the line of a threshold
reached by the Tab key lost its reason in 2 of 12 runs of its flow in
Chromium (since 10 October 2026). A press, a key or a drag on it
changes nothing, and leaves its tooltip shown; the thumb of a slider
stays where it is. The download of the filtered variants waits, with
its own words ("Its words"). When the PCA ends, fails or is stopped,
each is as before. The lock stays now that the PCA starts by itself,
as the owner chose on 10 October 2026: a change that stopped the PCA
and started it on the new values would end the calculation worker at
each change, and in WebKit each stop of a large PCA leaves 3 to 4 GB
in the tab for 40 s and more (`docs/architecture.md`, section 5).

Not locked, since the PCA's key holds none of them: the box of the
individuals file and its list "Column of the populations", the
Individuals tab, with its reader's options and, at its end, the zone of
the individuals file and its Remove, which only colour the points and
the counts; "Colour the points by", the axes, 3D or 2D and the turn and
zoom of the 3D view; the row of tabs; and the opening of another variants file,
which stops the PCA, as an opening stops every calculation. The owner's
answer of 9 October 2026 named the column of the populations among the
filters to lock; the session asked the same day whether it should be,
since the PCA does not read it, and the owner answered on 10 October
2026 that it stays open (open point 3 of `docs/designs/no-undo.md`).
From 11 October 2026 they stay open while the PCA runs and are greyed
while the diversity runs, whose key holds the populations
(`popgen2-populations.md`, "While the diversity runs"; the owner's
answer 2a to `docs/designs/population-tab.md`).

**The result**, as the old panel shows it (`docs/specs/analyses/pca.md`,
"What it shows"), with these differences:

- The title over the plot, "Principal components of panel.nei", or
  "Principal coordinates of panel.nei" under the PCoA; and the plot's
  name for a screen reader by the method too, "Principal coordinates,
  PC1, PC2 and PC3" under the PCoA, where the old panel says "Principal
  components" under both.
- **The bar of controls**: "3D" and "2D", the components on the axes,
  and "Colour the points by" with "Population" and every column of the
  individuals file but the names, as the old panel. The 3D view has no
  buttons to turn it, tilt it, look along an axis, zoom or reset it,
  which the old panel has: it is turned by dragging it and zoomed with
  Ctrl and the wheel of the mouse, or by pinching with two fingers, as
  on the old panel (`docs/specs/charts/pca3d.md`). So a user of the
  keyboard alone (WCAG 2.2, 2.1.1), a user of a mouse who cannot drag
  (2.5.7) and a user of a touch screen who cannot pinch (2.5.1) cannot
  turn or zoom the 3D view; they have the 2D plot, one button away, of
  any two of the components, and the table of the individuals, which
  gives every coordinate. The owner asked for the buttons to go
  on 10 October 2026, on trying the page, knowing that a user of the
  keyboard alone could no longer turn the view
  (`docs/plans/analyses-pca.md`, work package 10, round 1, item 3).
- **The plot**, in 3D first; in 2D one button away, or in the place of
  the 3D view where the browser cannot draw it, with the old panel's
  words of why.
- **The legend**: an entry per population with its mark and its count,
  "p0 (48)", and last, when there are any, "Unclassified (7)", drawn as
  rings, in the place of the old "No population". With no individuals
  file, while it is read, after it was refused, or with None chosen,
  every point is in the one entry "Unclassified (200)". A colouring by a
  column of values keeps the old "No value". A population with no point
  of the result, of the individuals file but with none of its
  individuals in the variants file or among those the filters keep, has
  no entry, where the old panel draws it with "(0)": its entry would
  name a group the plot does not show, and with every point
  unclassified the legend would list the file's populations at 0 under
  "Unclassified (200)". Each population keeps its mark, the order of
  first appearance in the file, so that a mark does not change when the
  filters take a population's last individual and give it back (decided
  on 9 October 2026 by task 6.1 of the plan, from the review of work
  package 2). With no column of the populations chosen yet, or None,
  every point is unclassified, and the note of a colour column the file
  lacks says so ("Its words"), which fits what the plot then shows: the
  one entry "Unclassified (200)" (`pcaColours` of core with page
  `"popgen2"`, read on 9 October 2026).
- **The explained variance**: the table of the old panel, with its
  caption, "The variance of the individuals explained by each
  component, of the 199 components of the PCA.", and for the PCoA its
  line under it, of the corrected distances: "The percentages are of the
  Kosman distances after Lingoes' correction, which added 0.047 to the
  square of every distance, as the warning says; over all the 198
  components of the PCoA they add up to 100.", or, when no correction
  was needed, the old panel's line that says so.
- **The table of the individuals**, as the old panel's, the second
  column headed "Population" or the column's name, "Unclassified" for an
  individual with no population. Its caption, when the PCA's LD pruning
  is on, says it was applied, with the r² and the distance of the run,
  which are those of the key the result is shown under: "The place of
  each of the 200 individuals of panel.nei on the first 10 of the 199
  components, from 548 variants, after the LD pruning at r² 0.1 within
  100,000 bp." (since 16 October 2026, by the review of the piece, which
  found that nothing in the result said the default pruning had run);
  with the pruning off, the old panel's caption, "… from 548
  variants.". While columns are cut off at its right, a fade
  over its right edge and the words under it, "More columns: scroll
  sideways.", which also describe the table to a screen reader, say
  that there are more, since macOS draws no scrollbar until a scroll;
  they go once the table is scrolled to its last column (since 10
  October 2026, by the review of work package 6 of the plan, which
  found the table cut in the middle of PC5 at 1280 px with nothing to
  say PC6 to PC10 were there). The review asked for the column of the
  individuals frozen as well; it is not: React Aria's Virtualizer, which
  draws the rows, places every cell in a box of its own with its place
  and its layer written on it, which a style cannot pin.
- **At less than 30rem wide**, a phone, the legend stands under the
  plot, where over it it hid most of the points it named.
- **The warnings**, above the plot, with their count on the heading:
  those of the old panel with this page's words, below, "Its words".
- **The notes** and **the line of the versions**, as the old panel.
- No button "Download the … as CSV" of the old panel: each table and
  the plot have the button "Download…" of the next part.
- **Its code**, which draws the plot, the tables and their menus, is
  downloaded apart from the page's (`docs/technology.md`, section 3),
  from the moment the PCA tab is first shown with a variants file open,
  so that it is there when a run of minutes ends. While it downloads,
  "Loading the result…" stands in the place of the result. When it
  cannot be downloaded, the connection lost or the site deployed again
  since the page was opened, the words of "Its words" stand there with a
  button "Try again", which asks for it again and gives the focus to the
  heading of the tab as it goes; the status region says them once the
  tab is shown. Until 10 October 2026 such a failure emptied the tab
  until the page was reloaded, and the error bar called it an error of
  the application's own; the review of work package 6 of the plan found
  it. Since 11 October 2026 every file of the code is asked of the
  network before the code is run, and Try again asks for each again:
  Chromium 153 and WebKit 26.6 keep the failure of a file the code ran
  into for the life of the page, so before, a file shared with
  popgen.html that failed once left Try again without a result until a
  reload (the review of work package 1 of
  `docs/plans/population-tab.md`).

The numbers are written as on the old panel: a coordinate to four
decimals in the table, "−0.7139"; the percentages to two, "3.55%";
every negative number on the screen with "−", the minus sign.

### The downloads

Every table and every plot of the page has one button, "Download…",
which opens a menu: for a table, at the right end of a line of its own
below the table, as the owner asked on 11 October 2026 (round 1 of work
package 8 of `docs/plans/no-undo.md`; above it before); for a plot, at
the right end of a line of its own above it, beside the title of the
PCA's plot, and under the row of the threshold's box for a histogram
(`docs/specs/widgets/downloads.md`, "A plot"). The menu is React Aria's `MenuTrigger` and `Menu`:

| on | the menu |
|---|---|
| a table | "Table as CSV" |
| a plot | "Image as SVG", "Image as PNG", "Data as CSV" |

The tables and plots of the page in this piece:

| what | where | the files |
|---|---|---|
| the histograms of the missing rate, the MAF, the observed heterozygosity and the unbiased expected heterozygosity of the variants | the Variants tab | `panel.missing_rate_variants`, `panel.maf_variants`, `panel.obs_het_variants`, `panel.exp_het_variants`, each `.svg`, `.png` or `.csv` |
| the histograms of the missing rate and of the observed heterozygosity of the individuals | the Variants tab | `panel.missing_rate_individuals`, `panel.obs_het_individuals` |
| the table of the individuals file | the Individuals tab | `panel_pops.table.csv` |
| the PCA's plot, 3D or 2D | the PCA tab | `panel.pca.svg`, `panel.pca.png`; `panel.pca.coordinates.csv` |
| the PCA's explained variance | the PCA tab | `panel.pca.variance.csv` |
| the PCA's table of the individuals | the PCA tab | `panel.pca.table.csv` |

The stem is that of the variants file, `panel` of `panel.nei` or of
`panel.vcf.gz`, but for the table of the individuals file, which is
shown with no variants file open and takes the stem of its own file;
under the PCoA, `panel.pcoa.…`.

**What each holds**, as `docs/specs/widgets/downloads.md` gives it: a
table's CSV has every row, sorted as shown, with the values as stored,
numbers in full with the point as the decimal mark and the hyphen as
the minus sign, and names with a ' before a leading "=", "+", "-" or
"@"; a histogram's CSV, a row per bin as drawn, its left edge, its
right edge and its count, and for the heterozygosity of the individuals
a last row of those with none; the PCA's plot's CSV, the coordinates
vavilov-explorer imports, `individual,PC1,…,PC10`, a row per
individual, its name written as in the variants file, with no '
before it; the image, the plot as drawn, in the colours of the light
theme, with its legend and its threshold's line.

**A histogram's menu waits** for the one pass to end. Until then the
button is shown, disabled, with "Download once panel.nei is read to the
end." as its tooltip and its description, so that no file of part of
the variants leaves the page. A pass the user stopped, or one that
failed, will not end by itself, so the reason then says so, as "Its
words" gives it.

**A choice** hands the file to the browser at once, and the status
region says "Saving panel.pca.coordinates.csv." A PNG the browser
refuses is said under the button: "The image of this plot is too large
for a PNG in this browser; download it as SVG." or "The image of this
plot could not be made as a PNG in this browser; download it as SVG."

## The states

Of the PCA tab. The tab of Populations and of Distances is either
greyed or shows its line of not built yet; since 11 and 12 October
2026 they show the diversity and the distances, whose states are in
`popgen2-populations.md` and `popgen2-distances.md`.

| state | what the user sees | what they can do |
|---|---|---|
| empty | the tab greyed, with its reason, as the row of tabs gives it; if it was shown when it became greyed, the reason in its place | open a variants file |
| locked | the options, the line of the individuals, Run disabled with the lock beside it, from the table of "Run and Stop"; while the PCA is live, the same lock with "Stop recalculating" in the place of Run, enabled, in the same place of the Tab key's order, which ends the live state, and the PCA starts by itself a second after the lock lifts, unless it lifts with the key it had, which shows the result kept | change the options; type the distance or turn the LD pruning off; Start again the one pass in the box; change the thresholds of the individuals |
| ready | the options, the line of the individuals, Run: before the first Run for the file, and after a Stop, with "Stopped: the PCA no longer starts by itself after a change. Run calculates it and starts it again after each change." under it, in the place of the bar | change the options; Run |
| about to start | the PCA live, during the quiet second after a change: the options, the line of the individuals, no result, no Run, "Stop recalculating" in its place, and under it, in the place of the bar, "The PCA starts in a moment, later if the filters or its options change."; while the dialog of the download is open, "The PCA starts again when the download is written or closed."; after a crash ended another live state, "The PCA starts after the next change of the filters or of its options, or when Run is pressed.", with Run beside Stop recalculating | go on changing the options and the thresholds, which puts the start off; Stop recalculating, which ends the live state |
| running | Stop, the bar and the clock, and the line under them; the options and the thresholds and FILTER box of the Variants tab greyed, with "Stop the PCA in the PCA tab to change the filters; then press Run there to calculate it again." (above, "While a PCA runs"); the same whether Run or a change started it | Stop; change the individuals file, its column of the populations and the colour of the points; turn to another tab, where the PCA goes on; open another variants file, which stops it |
| done | the result, its warnings and notes, the downloads; "Loading the result…" in its place while its code downloads, or the words of its code that could not be downloaded, with "Try again"; above them, while the PCA is live, "Stop recalculating", with no line under it, and after a Stop the line of a Stop, with no button | colour, turn, highlight, sort, download; change the options; Try again; Stop recalculating |
| results removed | not a state of its own on this page: a change that takes the result off the screen gives about to start while the PCA is live, and ready, with Run, while it is not (before its first Run is impossible, so only after a Stop); the page makes no notice, as the owner decided on 8 October 2026, and keeps no result to bring back, since 10 October 2026 | as in about to start, or as in ready |
| error | what happened and what to do, the old panel's words with this page's names, below; while the failure leaves the PCA live, "Stop recalculating" under them, with Run before it after a crash not of the memory, and after a failure that ends it, Run with the line of a failure that ended the live state under it | Run again after a failure that is not popnei's refusal, once the PCA is not live; change the options or the thresholds after a refusal; open the variants file again after it could no longer be read |

A change of the thresholds, of the FILTER box or of an option of the
PCA that changes what the PCA reads, its key, takes a result off the
screen, and, while the PCA is live, starts it again a second after the
user stops changing things. While a PCA runs no such change can be
made, since they are locked; the store would stop it at once if one
were. A change that does not, a threshold of the Variants tab moved
while the PCA's own is stricter, the colour, the axes, the view, keeps
the result on the screen and starts nothing. Another individuals file,
or another column, colours the result again with no calculation.
Another variants file stops the PCA, ends the live state and keeps its
options.

A defect of the application's own while the tab is drawn leaves its
heading alone in its place, and the band at the top of the page says
what happened, in the place of the error bar
(`docs/specs/steps/popgen2-band.md`), as for every part of the page; another variants file opened draws the tab
again, and a tab that caught nothing keeps what it holds, a number
half typed among it.

## What it sends and reads

It sends the commands of the table of "No Undo and no Redo", each with
`store.apply` and its description; the commands of the PCA are those of
`src/ui/analyses/pca/commands.ts` with this page's descriptions; from
10 October 2026 Run, `autoRuns.run("pca")`, which makes the PCA live and
starts it with `startAnalysis(store, "pca")` of `src/ui/runs.ts`; Stop,
`autoRuns.pause("pca")`, which cancels the run with
`store.cancelRun("pca")` and ends the live state; and each control that
can hold a change under way takes and releases a hold of the gate
(above, "The PCA calculated again by itself"). Until 10 October 2026
Undo and Redo sent `undoOrRedo` of `src/ui/shell/undoRedo.ts`. The
commands of the individuals file go
that the user makes go through `store.applyAfresh` (`popgen2-input.md`,
"What it sends and reads", revised), and the column the page chooses at
a read is the store's `populationColumnChosen` (`docs/specs/entry.md`).

It reads: the state of `pca` among the store's analyses, and its run;
the project, for `pcaOptions`, `pcaFilters` with the rule of this page,
`pcaColours`, `colourColumns` and the names of the files; the
individuals kept; `analysisTabs` of core for the row of tabs; the
state of the one pass and of the code that starts it
(`src/ui/autoRuns.ts`) for the lock of Run, and, from that code, whether
the PCA is live and about to start; and the state of `pca`, running or
not, for the lock of the filters. It holds of its own the tab
shown, the sort and the scroll of each table, the group highlighted,
the turn and the zoom of the 3D view, and the words of a PNG refused
until the next choice of that menu (`docs/architecture.md`, section 7).

## Its words

| where | the words |
|---|---|
| the tabs | "Variants"; "Individuals"; "PCA"; "Populations"; "Distances" |
| the headings of the two parts of the Variants tab, "Variants" and "Individuals" before 9 October 2026, which named the tabs a second time | "Filters of the variants"; "Filters of the individuals" (`popgen2-filters.md`, "Its words") |
| the row of tabs, for a screen reader | "Files and analyses" |
| PCA, no variants file | "The PCA needs a variants file. Open one in the box Variants." |
| PCA, a file being opened | "The PCA needs a variants file: panel.nei is being opened." |
| PCA, an opening that failed | "The PCA needs a variants file: panel.nei could not be opened; the box Variants says why and what to do." |
| Populations | the three of the PCA, with "The analyses of the populations need" in place of "The PCA needs" |
| Distances, no variants file | the three of the PCA, with "The distances between populations need" |
| Distances, no individuals file | "The distances between populations need at least two populations. Open an individuals file that assigns the individuals to them." |
| Distances, the individuals file being read | "The distances between populations need at least two populations: panel_pops.csv is being read." |
| Distances, the individuals file refused or failed | "The distances between populations need at least two populations: panel_pops.csv could not be read; the box Individuals says why and what to do." |
| Distances, no column to choose but the names of the individuals | "The distances between populations need at least two populations, and panel_pops.csv was read as a single column, the names of the individuals. If its columns are separated by another character, choose that separator in the Individuals tab."; for an xlsx, "…, and panel_pops.xlsx has no column to choose besides the names of the individuals. Add a column of the populations to it and open it again with Open another individuals file… in the Individuals tab."; read with more columns than the names, all of true or false, "The distances between populations need at least two populations, and panel_pops.csv has no column of text to choose as the column of the populations: its other columns hold only true or false. Add a column of the populations to it and open it again with Open another individuals file… in the Individuals tab." |
| Distances, a column of more values than a column of populations can have | "The distances between populations need at least two populations, and country has 35 values, more than the 20 a column of populations can have. Choose another column in the box Individuals." |
| Distances, no column, or a column of fewer than two populations among the individuals of the variants file | "The distances between populations need at least two populations, and popcat gives 1 population among the individuals of panel.nei. Choose another column of the populations in the box Individuals, or add the populations to panel_pops.csv and open it again with Open another individuals file… in the Individuals tab."; with no column, "…, and no column of the populations is chosen. Choose one in the box Individuals." |
| Distances, the filters leave fewer than two | "The distances between populations need at least two populations, and the filters keep individuals of 1 population. Loosen the filters of the individuals in the Variants tab."; with none, "…, and the filters keep no individual of any population. …" |
| Distances, no individual of the variants file in the individuals file | "The distances between populations need at least two populations, and no individual of panel.nei is in panel_pops.csv. Check that panel_pops.csv names the individuals as panel.nei does." |
| Distances, the individuals in the file, but none with a value in the column | "The distances between populations need at least two populations, and no individual of panel.nei has a value in popcat. Choose another column of the populations in the box Individuals, or add the populations to panel_pops.csv and open it again with Open another individuals file… in the Individuals tab." |
| the heading of the tab | "PCA"; "PCoA" |
| the drop-down list of the method, its items and the line under it | "PCA of the genotypes"; "PCoA of the Kosman distances"; "The PCoA suits data with many missing genotypes." |
| the filters | "Filters of the variants for the PCA"; "PCA filters can be stricter than the general analysis ones."; "Maximum proportion of missing genotypes for the PCA"; "Maximum major allele frequency for the PCA"; "Prune the variants by linkage disequilibrium (LD)" |
| the value of a slider | "0.1, as in the Variants tab"; "Off, as in the Variants tab"; "0.05" |
| the ends of a slider, under its track | "0" and "0.1"; "0.5" and "Off" |
| a filter whose slider would have no range | "0, as in the Variants tab. The PCA cannot be stricter than the Variants tab here." |
| the Variants tab stricter than the PCA's own | "The Variants tab keeps at most 0.03, stricter than the 0.05 set here, so the PCA uses 0.03." |
| the lock and the help of the one pass | the table of "Run and Stop" |
| under the field of the distance | "100,000 bp is a start that suits many genomes but not all. The LD decay of the Populations tab shows how far LD extends in your data: choose a distance where its curve has flattened, well beyond the half distance." |
| under the field of the distance, once the user emptied it | "The LD pruning of the PCA needs the distance within which variants are compared. Type a distance in base pairs, 100,000 to start with, or turn the LD pruning off."; "PCoA" under the PCoA |
| beside Run, while the distance is empty | "Type the LD distance in Parameters, or turn the LD pruning off." |
| the section of the options | "Parameters" |
| an error, a refusal of the variants file itself, which the one pass would have met first | the words of the box Variants (`src/core/analyses/fileRefusals.ts`), with "in the Variants tab" after "open it again" and "Open another file" where the box names the button too (since 16 October 2026; "in the box Variants" until then), and "so the PCA cannot be calculated" where the box says the variants cannot be counted: "panel.nei has no variants. Open another file in the Variants tab."; "panel.nei could not be read to its end: it may be damaged or cut short. Fetch or copy it again, and open it again in the Variants tab.", for a gzipped file cut short or a damaged batch of a `.nei` file; a variant at position 0, a position beyond 2,147,483,647, a genotype of another ploidy, and a line of the VCF popnei cannot read, each ending "and open it again in the Variants tab." |
| an error, the statistics of each individual refused | "The statistics of each individual, which the thresholds of the individuals need, could not be calculated, so the PCA was not run.", or "… so the PCA cannot run." when its own Run did not wait for them, followed by the row above with "so the statistics of each individual cannot be calculated", or, for another refusal, "popnei could not read panel.nei: ‹popnei's words›. Open the file again, or another file, in the Variants tab." |
| an error, a failure that is not popnei's refusal, in this page's words where the old panel's name the Variants step or a project to save (`popgen2FailureText` of `src/ui/analyses/words.ts`; since 9 October 2026, by task 6.1 of the plan, from the review of work package 2, which found the old words on this page) | the variants file changed on the disk since the one pass read it, a failure and not a refusal, "panel.nei could not be read again; it may have changed on the disk since it was opened. Open it again in the Variants tab."; an error of the application's own, "The application met an error of its own: ‹its words›. Run it again."; the calculations that could not start, "The application could not start its calculations. Reload the page and open panel.nei again."; the page out of date, "The page is out of date. Reload the page and open panel.nei again."; the worker that stopped, the PCA's own words of the memory, `crashText` of core with the page |
| the note of the colours, a column to colour by that the individuals file lacks | "panel_pops.csv has no column height, by which the points were coloured, so they are coloured by the column of the populations chosen in the box Individuals."; with no column of the populations chosen, or with None, "…, so every point is unclassified. Choose a column of the populations in the box Individuals, or another column to colour the points by."; with no individuals file, "No individuals file is open in the box Individuals, so the points cannot be coloured by height." |
| the end of a run, in the status region | "PCA of panel.nei calculated."; "PCoA of panel.nei calculated."; a refusal or a failure, "The PCA of panel.nei could not be calculated: " followed by the words of its error |
| the status region, the PCA held by a crash of another analysis | "The PCA did not start: it starts after the next change of the filters or of its options, or when Run is pressed in the PCA tab."; "The PCoA …" |
| under the button, in the place of the bar, during the quiet second | "The PCA starts in a moment, later if the filters or its options change."; "The PCoA starts in a moment, later if the filters or its options change."; while the dialog of the download is open, "The PCA starts again when the download is written or closed."; "The PCoA starts again when the download is written or closed."; after a crash ended another live state, "The PCA starts after the next change of the filters or of its options, or when Run is pressed."; "The PCoA …" |
| the button while the PCA is live and no PCA runs | "Stop recalculating" |
| under the button, in the place of the bar, after a Stop, until Run or another variants file | "Stopped: the PCA no longer starts by itself after a change. Run calculates it and starts it again after each change."; with the result shown, "Stopped: the PCA no longer starts by itself after a change. After the next change, Run calculates it and starts it again after each change."; "Stopped: the PCoA …" |
| under the words of a failure that ended the live state, until Run or another variants file | "The PCA no longer starts by itself after a change, since its calculation failed. Run calculates it and starts it again after each change."; "The PCoA …" |
| the status region, a PCA started by itself | "Calculating the PCA again. To change the filters, stop it in the PCA tab."; "Calculating the PCoA again. To change the filters, stop it in the PCA tab." |
| the status region, the first start of a round of two analyses or more, and a Run that waited, at its start | "Calculating the PCA and then the diversity again. To change the filters, press Stop all beside the heading Popnei, or stop each in its tab; to change the populations, stop the diversity in the Populations tab." (before the band offered Stop all, on 11 October 2026, "Calculating the PCA and then the diversity again. To change the filters, stop each in its tab; to change the populations, stop the diversity in the Populations tab."); "Calculating the PCA of panel.nei."; "the PCoA" by the method |
| the line in the place of the bar, while the PCA waits for the diversity | "The PCA starts once the diversity, which is running, ends."; "The PCoA …" |
| the status region, a Stop of the PCA, in the tab or in the band | "PCA stopped. Press Run in the PCA tab to calculate it again."; "PCoA stopped. …"; with no Run to press, Run disabled or the result shown, "PCA stopped."; "PCoA stopped." |
| the download of the filtered variants while a PCA runs | "Waits for the PCA to end; or stop it in the PCA tab." |
| the thresholds and the FILTER box of the Variants tab and the PCA's options, while a PCA runs, as tooltip and description | "Stop the PCA in the PCA tab to change the filters; then press Run there to calculate it again."; under the PCoA, "Stop the PCoA in the PCA tab to change the filters; then press Run there to calculate it again." |
| the button of a download | "Download…", named for a screen reader "Download the plot of the proportion of missing genotypes of the variants", "Download the table of panel_pops.csv", "Download the plot of the PCA", "Download the explained variance of the PCA", "Download the table of the individuals of the PCA", from the title the table or the plot carries; but "Download the plot of the unbiased expected heterozygosity of the variants", whose title says "Expected heterozygosity (unbiased)" |
| its menu | "Table as CSV"; "Image as SVG"; "Image as PNG"; "Data as CSV" |
| a histogram's menu waiting | "Download once panel.nei is read to the end."; once the user stopped the one pass, "Download once panel.nei is read to the end: its reading was stopped; start it again in the box Variants."; once it failed, "Nothing to download: panel.nei could not be read to the end; the box Variants says why." |
| the PCA's menu while three.js downloads | "Download once the 3D view is drawn." |
| the caption of the table of the individuals | "The place of each of the 200 individuals of panel.nei on the first 10 of the 199 components, from 548 variants, after the LD pruning at r² 0.1 within 100,000 bp."; with the LD pruning off, "… from 548 variants." |
| the table of the individuals cut off at its right | "More columns: scroll sideways." |
| the result while its code downloads | "Loading the result…" |
| the result whose code could not be downloaded | "The result of the PCA could not be loaded. Press Try again. If it fails again, the site may have been updated since this page was opened: reload the page, open panel.nei again and run the PCA again; what the page has calculated is lost."; "PCoA" under the PCoA; its button "Try again" (worded so on 11 October 2026: Try again first, the reload second with what it costs) |
| the status region, a file handed to the browser | "Saving panel.pca.coordinates.csv." |
| a PNG refused | "The image of this plot is too large for a PNG in this browser; download it as SVG."; "The image of this plot could not be made as a PNG in this browser; download it as SVG." |

**The warnings**, those of the old panel (`docs/specs/analyses/pca.md`,
"The warnings"), with these words where they name a place:

- `pruningOff`: "No LD pruning was applied for the PCA, so a region of
  the genome counts once for each of its variants, and a region of many
  variants in linkage disequilibrium, such as an inversion, can make a
  component of its own that separates the individuals by that region
  rather than by their ancestry. Turn on the LD pruning of the PCA in
  Parameters, unless such regions are what you are looking for."
- `fewVariants`: "… If the dataset has more, loosen the filters of the
  PCA in Parameters, or the thresholds of the Variants tab."
- `lingoesCorrection`: the old panel's, unchanged: the share of the
  variance that lay in directions no space has, 7.87% on `panel.nei`;
  the amount added to every squared distance, 0.047, and its share of
  the mean squared distance, 53%; and how far apart two individuals of
  the same genotypes are drawn, 0.22.

**The errors**, those of the old panel (`docs/specs/analyses/pca.md`,
"Its words") with "the Variants tab" for "the Variants step", "open …
again in the Variants tab" for "Load … in the Variants step" ("in the
box Variants file" until 16 October 2026), "the thresholds of the
individuals in the Variants tab" for "the filters of individuals in the
Variants step", and the row of the LD order, which names the PCA or
the PCoA by the method, ending "Sort the file, with bcftools sort for a
VCF, and open it again in the Variants tab, or turn the LD pruning
off.", the end of the lock of the LD pruning with no distance. The row
of no variant left: "No variant of
panel.nei is left after the filters of the PCA, so there is no variant
to do the PCA with. Loosen the filters of the PCA in Parameters, or the
thresholds of the Variants tab." These three name the section
"Parameters", which may be closed, in place of "in its options above"
until 16 October 2026. The words of the 3D view are
the old panel's, but for its failure to download, which ends "reload
the page, open panel.nei again and run the PCA again", since this page
saves no project and a reload leaves it with no file open.

The page has no help drawer yet. What the help of the PCA tab would
say, beside the old panel's help: that its filters narrow the Variants
tab's and why a PCA often wants stricter ones; that the LD pruning is
on with no distance, and how to choose one; that the CSV of the
coordinates writes each name as in the variants file, with no ' before
a name that starts with "=", "+", "-" or "@", so that vavilov-explorer
finds it again, and that a spreadsheet may read such a name as a
formula; and that the unclassified are in the PCA as every other
individual.

## Accessibility

The criteria are those of WCAG 2.2 at level AA.

**The order of the Tab key** (2.4.3): the controls of the band, while
it shows any (`docs/specs/steps/popgen2-band.md`, "Keys and focus");
the heading is not a stop; the box of the variants file and the box of the
individuals file, as `popgen2-input.md` gives them; the row of tabs,
one stop, the tab shown, also after the arrow keys rested on a greyed
tab before the focus left the row, whose Left and Right arrow keys move
along the labels, greyed ones among them, and Home and End go to the
first and the last; then
the content of the tab shown. In the PCA tab: the button "Parameters";
while the section is open, the method, the slider of
the missing data, that of the MAF, and the LD switch and its two fields; Run, Stop or Stop recalculating, one stop in one place, and after a failure that leaves the PCA live, Run and then Stop recalculating; the warnings; the plot's "Download…",
beside the title of the plot; the bar of controls; the legend; the link
to the table; the explained variance, when it scrolls, and its
"Download…"; the table of the individuals, then its "Download…". Each
"Download…" of a plot comes before the plot, and each of a table after
the table, where it is drawn (below the table since 11 October 2026, as
the owner asked; before it until then). (Until
10 October 2026 this list put the plot's "Download…" after the
explained variance, which is not the order drawn; the review of work
package 6 of the plan found it.)

**A greyed tab** (4.1.2, 2.1.1, 1.3.1): it carries `aria-disabled`, set
by the widget, and its reason as its description, so a screen reader
says "PCA, tab, dimmed, 3 of 5" and then the reason. Its tooltip shows
on the focus, on the mouse and on a press, stays while the focus or the
mouse is on it, and goes with Escape (1.4.13). It opens under the row,
under its own tab, so that at 320 px the tooltip of a tab on the first
line does not hide the second (under its own tab since 9 October 2026,
by the review of work package 1 of the plan; at the start of the row
before). The tab shown keeps "selected" for a screen
reader while the focus rests on a greyed one, so the user can tell
which content is under the row. A greyed tab is not told by colour
alone (1.4.1): it never has the weight of the tab shown, nor its bar
but in the greyed colour while it is shown, and a screen reader says
"dimmed". Its contrast is exempt from 1.4.3 as
that of a control that cannot be used.

**What is said without moving the focus** (4.1.3): a file handed to
the browser by a download, and a PNG refused; the start of a PCA by
itself, "Calculating the PCA again. To change the filters, stop it in
the PCA tab.", and a Stop of it; the end of
a run, "PCA of panel.nei calculated.", and its refusal or failure,
whichever tab is shown, since the user may have turned to another; the
reason of the LD pruning with no distance when the switch is turned on
and the field is empty; and those of the
old panel: the loading of the 3D view and its failures, the notes that a
change of the colour, the axes or the view makes; and the words of the
result whose code could not be downloaded. Those of the 3D view and of
the result's code are said once the PCA tab is shown, not while it is
hidden behind another. A tab that becomes
greyed or not is not said: the change comes from a file the user opened,
whose box says it. The line of the quiet second is not said: it comes
and goes within a second or two at each change, and the start that
follows it is said.

**The menus** are React Aria's: Enter, Space or the Down arrow key open
a menu, the arrow keys move in it, Enter chooses, Escape closes it and
gives the focus back to its button. Each button is named by what it
downloads, so that the five buttons of the PCA tab are not five
"Download".

**The focus at a Stop.** Stop in the tab gives way to Run, which takes
the focus, as before. Run, Stop and Stop recalculating are one button
in one place, so the focus stays on it when it changes from one to
another: Stop to Stop recalculating when a run ends while the PCA is
live, Stop recalculating to Run after it is pressed. When the button
goes with the focus on it, Stop recalculating pressed with the result
shown, the focus goes to the heading of the tab, as when a run ends
done; when it becomes a disabled Run, Stop recalculating pressed while
the PCA is live and locked, the focus goes to the reason beside Run,
which a screen reader reads as "Run is unavailable: " and the reason,
as the Count of the old page does. When the PCA starts by itself, the
focus stays where it is: on a control that the lock greys, which keeps
it and gives its reason, as before.

**The size of what is pressed** (2.5.8): each "Download…" and each tab
are at least 24 by 24 px, as every button of the page.

The line "The Variants tab keeps at most …" is not said: it appears
after a change made in the Variants tab, about a field the user is not
looking at, and is read when they reach the field.

**The PCA's plot, its legend, its table and its 3D view** are as on the
old panel (`docs/specs/analyses/pca.md`, "Accessibility"), with
"Unclassified" in place of "No population" in the description and the
legend, and without the buttons of the 3D view: a user of the keyboard
alone, a user of a mouse who cannot drag and a user of a touch screen
who cannot pinch cannot turn or zoom the 3D view, and have the 2D plot
of any two components and the table of the individuals (2.1.1, 2.5.7
and 2.5.1; "The result", the bar of controls; the owner's decision of
10 October 2026).

**Not yet heard in VoiceOver**, which the session cannot run: the row
read as "Files and analyses, tab list", a greyed tab read as dimmed with
its reason; a menu of a download; "Calculating the PCA again. To
change the filters, stop it in the PCA tab." heard once while the
focus is on a threshold of the Variants tab.

## How it is checked

**In Vitest**, in node:

- `analysisTabs` of core in each row of its spec; the words of each
  reason from it.
- The descriptions of the PCA's commands on this page, method by
  method, from `src/ui/analyses/pca/commands.ts` given the page;
  `stricterCommand` sets `follow` and the value in one step.
- `stricterBound(p, kind, stepDecimals)` of
  `src/ui/analyses/pca/stricter.ts`, the ends, the step and the value
  shown of each slider, `stricterValueText`, the words of its value,
  `stricterMoveCommand`, the command of a move to the upper end, from
  it and from a value of the PCA's own, and none for a move that ends
  where it started, `stricterEnds`, the words of its ends,
  `emptyRangeLine`, the line of a slider with no range, and
  `tabStricterLine`, the line of the Variants tab stricter: the Variants tab at 0.1, at 0.0035, off,
  and a MAF below 0.5; the decimals of the step of the Variants tab's
  box given and not given; following and not. (`stepDecimals` since 9 October 2026, by task 6.1 of the plan:
  the decimals of the box come from the axis of its histogram, which the
  project alone does not give.)
- `pcaFilters` with page `"popgen2"`, an own value of 1 while the
  Variants tab has the threshold off: no filter, the key of the PCA as
  when it follows.
- `passLock`: running, about to start, stopped by the user, failed with
  Start again offered, refused by popnei, read to the end.
- The words of the lock of the filters by the method, and
  `popgen2FailureText` for each failure that is not popnei's refusal.
- The PCA calculated again by itself, from 10 October 2026, at
  `createAutoRuns` with the real store of the page, a fake worker, the
  gate, and the clock of Vitest: the PCA does not start before Run;
  after Run and its end, a threshold changed starts it one second later,
  and a second change within that second puts it off; a hold taken, a
  slider held, a list open, digits not confirmed, the dialog of the
  download open, keeps it from starting for 3 s, and its release starts
  the second; the PCA is calculated for the key of the project when the
  second runs out; nothing starts while a PCA or a write runs; a value
  set back starts it again; the colour of the points, the individuals
  file and a change of its column start nothing; Run refused while a
  write runs; Run within a run of the arrow keys sends the value the
  run holds. The one pass running while the PCA is live cannot be
  reached on this page, since the pass runs once for each load and a
  new load ends the live state, so the guard that holds the PCA behind
  it (`holderOf` of `src/ui/autoRuns.ts`) is not checked here; a Stop, during a run or
  during the second, ends the live state, and a change then starts
  nothing until Run; another variants file ends it; the LD distance
  emptied and typed again with the same value shows the result kept,
  with no request; a PCA refused by popnei under a key does not start
  again under it, a change to another key starts it, and the PCA is
  still live after the failure, as after a crash not of the memory; a
  crash of the memory, and the calculations that could not start, end
  the live state, stopped, and a change then starts nothing;
  `aboutToStart` `"changes"` during the
  quiet second and while a change under way of a control holds it, a
  slider held, a list open, `"download"` while the dialog of the
  download is open or its write runs, and `null` otherwise; `liveState`
  in each state, and a reader subscribed to `autoRuns` alone told of a
  change of a filter, of the dialog's hold and of a new load; a
  control removed while it holds lets its hold go.
- Several analyses calculated again by themselves, from 11 October
  2026, at `createAutoRuns` with the real store of the page, the PCA and
  the diversity, a fake worker, the gate and the clock of Vitest (the
  design, "How it will be tested"): with the PCA never run, `ready`, a
  live diversity starts by itself after a change; the same after a Stop
  of the PCA, which leaves it not live and `ready`; with the PCA locked,
  done, refused by popnei and crashed; with both live, a change of a
  threshold starts the PCA a second later and the diversity at the
  PCA's end, whichever tab is shown, and never both at once (the
  worker's requests counted); a change of the column of the populations
  or of an option of the diversity starts the diversity alone, and one
  of an option of the PCA the PCA alone; `liveState("diversity")` is
  `behind` with `after` "pca" while the PCA runs, and `changes` with
  `after` "pca" in the quiet second; a Run of the diversity while the
  PCA runs gives "waiting", sends nothing until the PCA ends, and then
  one request, with `startedAfterWaiting`; a Stop of the running PCA
  starts the waiting diversity one second later, not at once, and a
  change within that second puts it off; `pauseAll` during a run and
  during the quiet second ends both live states and a change then
  starts nothing; the round is told once, with both, at the PCA's
  start, and the diversity's start of the same round with an empty
  `round`; a crash of the memory of the PCA ends its live state and
  not the diversity's; a crash of the diversity, of any kind, ends its
  live state and leaves the PCA's live. From 12 October 2026, with the
  LD decay live as well: a change of a threshold starts the three one
  at a time, the PCA, the diversity and the LD decay, the worker's
  requests counted; `liveState("ldDecay")` is `behind` with `after`
  "diversity" while the diversity runs; a refusal of the LD decay for
  memory ends its live state, another refusal does not; the round is
  told once with the three.
- No Undo: the page's store has no `undo` nor `redo` in its type; a
  press of Ctrl+Z on the page sends no command.
- The CSV of each table and plot, in `docs/specs/widgets/downloads.md`.
- From 16 October 2026, in jsdom: the PCA tab draws its options inside
  the section "Parameters", closed, its button with
  `aria-expanded="false"`, and the line of the distance's lock beside
  Run outside it. That the panels of `popgen.html` draw their options
  with no section is checked by its flows, which reach the options with
  no section opened.

**In Playwright, on the built site, in Chromium and WebKit**, the two
engines that start on the owner's Mac, on `panel.nei`,
`panel_pops.csv` and `panel_meta.csv`:

- **The row of tabs**: before a file, PCA, Populations and Distances
  greyed; with `panel.nei` opening, the PCA's tooltip "… is being
  opened."; once open, PCA and Populations not greyed, Distances greyed
  with "Open an individuals file …"; with `panel_pops.csv`, Distances
  not greyed. A greyed tab reached by the arrow keys shows its tooltip,
  hides it with Escape, does not open by a click, Enter, Space or the
  arrows, and carries `aria-disabled="true"` and its reason as its
  description; the tab shown keeps `aria-selected="true"`. The
  Distances tab shown, then "None" chosen in the box Individuals: the
  tab stays shown, greyed, with the reason in its place, and comes back
  when a column is chosen; another variants file opened in the Variants
  tab: the PCA tab greyed with its reason, a click on it refused, and
  open again once the file is open (the PCA tab was the one shown
  greyed until 16 October 2026). At 320 px, the five labels on
  two lines in the Mac's system font, three in DejaVu Sans, and no
  sideways scroll.
- **The section "Parameters"**, in the PCA, Populations and Distances
  tabs (`e2e/popgen2Parameters.spec.ts`, from 16 October 2026): each
  closed when the page opens, its button with `aria-expanded="false"`
  and its options not visible; the Tab key reaches the button, Enter
  opens it and Space closes it, `aria-expanded` following; an option
  inside works as before once open; an option greyed while the PCA
  runs is reached by the Tab key inside the open section, with its
  reason; with the distance of the LD pruning emptied and the section
  closed again, "Type the LD distance in Parameters, or turn the LD
  pruning off." visible beside the greyed Run; and the section opened
  in the PCA tab still open after the Populations tab is shown and the
  PCA tab shown again. axe on each state.
- **The PCA**, all thresholds of the Variants tab as a new page has
  them, the missing rate of the variants at 0.1: the PCA tab opened
  during the one pass, held (`e2e/holdWorker.ts`), shows Run disabled
  with "Run once panel.nei is read to the end: the reading under way
  …", and no line of the individuals; after the pass, Run enabled with
  the distance at 100000; the distance emptied, Run disabled with the
  reason of the LD pruning with no distance; 50000 typed: Run. With no
  option typed, the LD pruning within 100,000 bp: "PC1 (3.55%)" and
  "PC2 (3.40%)", the same as within 50,000, 548 variants kept either
  way (popnei 0.2.2 under node, 16 October 2026),
  on the 2D plot's axes, PC3 1.89% in the explained variance, `s000` at
  −0.7139 and 7.6765 in the table, the caption "… from 548 variants,
  after the LD pruning at r² 0.1 within 100,000 bp.", which shows that
  the run was made with the default distance,
  no warning; the legend with "Unclassified (200)" alone, and, after
  `panel_pops.csv` is opened, p0 (48), p2 (84), p1 (68), with no
  request to the worker.
- **Its filters**: the slider of the missing data at 0.1, "as in the
  Variants tab", moved with the keys to 0.05: 532 variants, PC1 3.58%;
  the Variants tab's missing rate moved to 0.03: the slider ends at
  0.03 and shows it, with the line, and back to 0.1: the slider shows
  0.05 again. The MAF moved to 0.9, the missing data back at its upper
  end: 510 variants, PC1 3.68%. The MAF back at its upper end, then
  the LD pruning turned off: 1,200 variants, PC1 7.61%, and the warning
  of no LD pruning (with the MAF of 0.9 left on, popnei 0.2.2 gives
  1,102 variants and PC1 7.98%).
- **The PCoA**, with the LD pruning at r² 0.1 within 50,000: "PC1
  (3.68%)" and "PC2 (3.54%)", the warning of the correction with
  "7.87%", "0.047", "53%" and "0.22", and the line under the explained
  variance with "0.047" and "198 components".
- **A change during a run**: a PCA held running: the thresholds and the
  FILTER box of the Variants tab and the PCA's own options greyed, each
  with `aria-disabled="true"`, reached by the Tab key, and "Stop the PCA
  in the PCA tab to change the filters; then press Run there to
  calculate it again." as its tooltip and description; a press, a
  key or a drag on one changes nothing; the column of the populations
  and "Colour the points by" not greyed, a column chosen leaving the PCA
  running; an opening of another variants file stops it, the tab
  ready.
- **No Undo**, in `e2e/popgen2NoUndo.spec.ts`: no button Undo nor
  Redo when the page opens, after `panel.nei`, after a threshold moved
  and after the PCA; Ctrl+Z, Meta+Z, Ctrl+Shift+Z, Meta+Shift+Z and
  Ctrl+Y, each pressed alone on the heading, on a line and in a box
  with nothing typed, change no threshold, no option and no result,
  read after each key, and leave the focus where they were pressed;
  the same keys on a line whose run of the arrow keys waits leave the
  run to become a change at its second; Ctrl+Y and Meta+Y in a box
  reached by Tab leave its number; 0.9 typed in the MAF box, the keys
  of redo leave it typed, and Ctrl+Z puts the box back to its number;
  the PCA done, a threshold moved and moved back: Run, and no result,
  with no request until Run.
- **Live**, the design's checks in the browser, in `e2e/popgen2Live.spec.ts`:
  after Run and its end, ten presses of an arrow key on a threshold, on
  the slider of the missing data of the PCA and on the closed list of
  the method start one PCA, after the last press, and no control greys
  before it (the worker's requests counted); a slider held still for
  3 s, a threshold's line moved and held still for 3 s, a thumb pressed
  and held without moving for 3 s, the list held open for 3 s, a menu
  "Download…" held open for 3 s and digits typed slowly over 3 s each
  keep working, before any PCA starts; after a change the tab never
  shows the old result, nor Run, between the change and the bar, read
  every animation frame; the line of the quiet second, then the bar;
  the status region says "Calculating the PCA again. To change the
  filters, stop it in the PCA tab." at most once, and never joined with
  "PCA of panel.nei calculated.", which on panel.nei, whose PCA ends
  within the region's pause, is said alone; a value set
  back calculates again (a request); Stop during the second: Run, and a
  later change sends nothing; the numbers of the PCA started by itself
  after the missing data of the PCA moved to 0.05 are those of "Its
  filters" below, 532 variants and PC1 3.58%; and, in WebKit, a PCA of
  9,381 individuals ended, a threshold moved, the PCA again by itself:
  the engine's memory at the peak of the second run no more than that of
  the first and 0.25 GB, read every 250 ms, alone on the machine.
- **The downloads**: each menu opened and chosen with the keyboard
  alone; the CSV of the PCA's plot saved and read back, header
  `individual,PC1,PC2,PC3,PC4,PC5,PC6,PC7,PC8,PC9,PC10` and the row of
  `s000` beginning `s000,-0.7138853335304419,7.676473141448964`; the
  table of the PCA, sorted by PC1, saved, its rows in that order; the
  SVG of a histogram, with its threshold's line; a PNG of the 3D view;
  a histogram's menu disabled while the pass is held, with its tooltip;
  the "Download…" of the explained variance, of the table of the
  individuals of the PCA and of the table of the Individuals tab after
  its table in the page and drawn below it, at 1280 and at 320 px (from
  11 October 2026).
- **Kept drawn**: the PCA in 3D, turned by a drag, the Variants
  tab shown and back: the same view, in Chromium and in WebKit, whose
  WebGL context must survive the hidden tab.
- axe, the checker of accessibility, in each state of the PCA tab, the
  greyed tabs and the menus, in light and in dark.

The flows of the old page's PCA are run again, since its module and
panel are shared, and so are the old page's flows of Undo, which keeps
it. `e2e/popgen2Undo.spec.ts` became `e2e/popgen2NoUndo.spec.ts` on 10
October 2026: its flows that checked Undo and Redo on this page went,
and its checks that no key undoes anything stayed, in the bullet "No
Undo".

**The numbers** are popnei's, from release 0.2.2 under node on 9
October 2026, on `e2e/fixtures/panel.nei`. The reference is the first
setting, the missing data at 0.1 and the LD pruning at r² 0.1 within
50,000; each other setting is one of the flows above: the PCA with the missing
data filter at 0.1 and the LD filter at r² 0.1 within 50,000, 548
variants, PC1 to PC3 3.5476992895181616, 3.402040462155611 and
1.8945553874570624, `s000` at −0.7138853335304419,
7.676473141448964 and −4.384383801903496, the numbers of
`docs/specs/analyses/pca.md` with `js-v0.1.0-dev.3` to the last bit;
with the missing data at 0.05, 1,152 variants kept by it, 532 by the
LD, PC1 3.580113383082099; with the MAF at 0.9 as well as the missing
data at 0.1, 1,102 by the MAF, 510 by the LD, PC1 3.6773736003613675;
the PCoA, 198 components, PC1 3.679886264523731, `lingoesConstant`
0.023674522901958598 and `negativeEigenvaluesPercent`
7.87126617431627. The script is that of `docs/specs/analyses/pca.md`,
"How it is verified", with `filterByMissingData` and `filterByMaf` of
these values.

**The screens**, `--project=screens`: the row with greyed tabs and a
tooltip shown; the PCA tab locked, locked by the distance emptied once
the file is read, `popgen2-pca-locked-ld`, ready with no option typed,
`popgen2-pca-ready`, running, done in 3D
and in 2D, with the PCoA's warning, while the result's code downloads
and after it could not be; a menu of a download open; about to start,
`popgen2-pca-about-to-start`, and running started by itself with the
Variants tab shown and a threshold greyed, `popgen2-pca-live-locked`;
ready after a Stop, with its line under Run, `popgen2-pca-stopped`;
done with the PCA live, "Stop recalculating" above the result with no
line under it, `popgen2-pca-live-done`; a crash that leaves it live, Run and
Stop recalculating side by side, `popgen2-pca-live-failed`;
light and dark; 1280 and 320 px. From 16 October 2026, the section
"Parameters" of the three tabs closed, as every screen of a tab shows
it unless it says otherwise, and open, `popgen2-pca-parameters`,
`popgen2-populations-parameters` and `popgen2-distances-parameters`;
`popgen2-pca-locked-ld` with the section closed after the distance was
emptied, the reason beside Run. The screens `popgen2-undo`,
`popgen2-undo-redo` and `popgen2-undo-waiting` go.

**By hand**, in the plan: the memory and the time of a PCA and a PCoA
of 1,000, 4,000 and 9,381 individuals after the one pass of the same
file, in Chromium and WebKit (the design, "The memory and the time");
the time of the CSV of a table of 10,000 rows; VoiceOver with Safari on
the row of tabs and a menu; and, by the owner in the running page,
whether the quiet second is long enough to go from one control to the
next, which would send the design back if it is not (the design, "How
it will be tested").

## Choices made by the session

From the design, and open to the owner's change once they try the
page: the names of the tabs; a greyed tab that the keyboard reaches; a
tab that stays shown when it becomes greyed; every tab kept drawn; the
labels wrapping at the width of a phone; Run locked until the one pass
ends; the unclassified as one group, "Unclassified"; the PCA's own value
kept when the Variants tab goes below it; the upper end of each slider
read as "as in the Variants tab", `follow` true, so that it stays so
when the Variants tab changes; the MAF slider from 0.5, or from the
Variants tab's value below 0.5; the step of each slider that of the
Variants tab's box, 0.01 at the most; a command at each key pressed on
a slider; the PCA's limit of 9,381 individuals
before the lock of the one pass; the LD pruning a
switch; one button "Download…" with a menu; the names of the files;
the removal of the individuals
file and a change of its reader through `applyAfresh`; the end of a
slider at 1 while the Variants tab has the
threshold off, read as no filter; a population with no point left out
of the legend; and the words. From 10 October 2026: Stop offered during
the quiet second; every open list of the page holding the second, not
the method's alone, since a list open elsewhere is a user still
choosing; the dialog of the download holding it; the line of the quiet
second in the place of the bar; "Calculating the PCA again. To change
the filters, stop it in the PCA tab." said at each start by itself, and
the Stop said in
the status region; popnei's refusal and a crash not of the memory
leaving the PCA live, and a crash of the memory and a failure only a
reload mends ending it; "Stop recalculating" whenever the PCA is live
and no PCA runs, beside the lock of a live PCA among them; the lines of
the quiet second and of a Stop under the button, in normal text; every open popover of the page holding the second.

Decided by the owner and no longer the session's: the filters a running
PCA reads locked (answer 2 of 9 October 2026, kept on 10 October 2026
after the measurement of a stopped worker in WebKit); the column of the
populations open during a run, Stop that ends the live state, and the
download that waits for a running PCA (the open points of
`docs/designs/no-undo.md`, 10 October 2026).

## Left for the running application

The look of
a greyed tab, the layout of the options and of the bar of controls, the
size of the plot, where each "Download…" sits beside its caption, and
whether the options fold away once there is a result.

## Open points

None. The owner answered the design's questions on 9 October 2026,
and those of `docs/designs/no-undo.md` on 10 October 2026.

## Not in this spec

- The PCA's module, its key, its job, its warnings and its numbers:
  `docs/specs/analyses/pca.md`, with its part "On popgen2.html".
- The CSV of each table and plot, the menu's component and the handle
  of a plot: `docs/specs/widgets/downloads.md`.
- The band at the top of the page, its Stop and its pointer to the
  warnings of the PCA: `docs/specs/steps/popgen2-band.md`.
- What Ctrl+Z does on the page: `popgen2-filters.md`, "Undo, Redo and
  their keys".
- The store's settings of this page and `applyAfresh`:
  `docs/specs/core/store.md`.
- The boxes, the Variants tab and the Individuals tab:
  `popgen2-input.md`, `popgen2-filters.md`, `popgen2-download.md`.
- The Populations tab: `popgen2-populations.md`. The LD decay, a later
  piece. The Distances tab: `popgen2-distances.md`, since 12 October
  2026.
- The saving of a project on this page, and the help drawer.
- The old page, `popgen.html`, which gets none of this.
