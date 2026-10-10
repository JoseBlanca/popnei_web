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
parts that named Undo say so where they changed. Not yet built.

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

From the top: the band (`docs/specs/steps/popgen2-band.md`); the line
of the heading "Popnei", alone since 10 October 2026, when Undo and
Redo left its right end; the two boxes, "Variants file" and "Individuals file", as
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
(`docs/specs/analyses/pca.md`, "On popgen2.html", the key). The live
state ends at a Stop of the PCA, in this tab or in the band, during a
run or during the quiet second, as the owner chose on 10 October 2026
(open point 1 of the design); at the opening of another variants file,
or of the same one again, which is a new load; and at a reload of the
page, which keeps nothing. It does not end when the PCA fails, is
locked, or the user turns to another tab.

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
  of a threshold, after it moved: from the first move to the release;
- a list open, the method's or any other of the page: from its opening
  to its closing;
- a number box with text that differs from the project's value, those
  of the thresholds and the PCA's r² and distance: from the first digit
  to Enter, Tab, a click elsewhere or Escape;
- a run of the arrow keys on a threshold, which becomes one change a
  second after its last press (`popgen2-filters.md`, "When a threshold
  changes the project");
- the dialog of the download of the filtered variants open.

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

**About to start.** During the quiet second the tab shows no result,
since its values are no longer those on the screen, and no Run: the
options, open to change, the line of the individuals, and, in the
place of the bar, the line "The PCA starts again in a moment, once the
filters stop changing." ("The PCoA …" under the PCoA), with Stop beside
it. Stop there ends the live state before the PCA starts: the tab shows
Run, and nothing starts until it is pressed. (Stop during the second is
the session's decision of 10 October 2026, from the owner's choice that
Stop pauses the automatic runs: a user who wants to change two filters
slowly, a screen reader's user among them, can keep the PCA from
starting between them.)

**Running.** A PCA started by itself is as one started by Run: Stop,
the bar and the clock, and the filters it reads greyed with "Stop the
PCA to change the filters." ("While a PCA runs", below). The status
region says "Calculating the PCA again." ("the PCoA") once, at its start,
and does not move the focus, so that a user who changed a threshold in
the Variants tab, and then finds it greyed, learns why; a user who
reaches a greyed control hears its reason as before. Its end is said
as the end of any run, "PCA of panel.nei calculated.".

**A value set back is calculated again.** The store of the page keeps
no result for values the screen no longer shows (`docs/specs/core/store.md`,
`dropLeftBehind`), so a threshold moved and moved back starts the PCA
twice, once for each change that reaches the project. The one
exception is a lock: the LD distance emptied keeps the result it had,
not shown, and the same distance typed again shows it with no
calculation; another distance calculates.

**What starts nothing.** The PCA not live; locked, with its reason
beside Run, until the lock lifts; done under the key; in error under
the key, popnei's refusal or a failure of the worker, which a change to
another key starts again, and Run again in the tab tries again under
the same key; and a change that gives the key it had.

**Stop.** Stop, in the tab or in the band, ends the run, as before,
and the live state: the tab shows Run with no result, since none is
kept for these values, and a later change starts nothing until Run is
pressed. The reason is the memory: in WebKit, the engine of Safari, a
Stop of a PCA of 9,381 individuals leaves its 3.7 to 4.2 GB in the tab
for 40 s and more (`docs/architecture.md`, section 5), and a PCA
started by itself a second after the next change would grow on top of
it, and grey the next filter before the user reached it. The status
region says "PCA stopped. Press Run in the PCA tab to calculate it
again." ("PCoA"), whichever Stop was pressed, since a Stop in the band
leaves the tab out of sight.

**Another variants file** stops the PCA, as before, and ends the live
state: for the new file, the PCA waits for its Run.

**The download of the filtered variants** waits while a PCA runs, as
built, also one started by itself; pressed during the quiet second, it
goes first, and the PCA starts once its dialog closes
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
`createRunGate` of `src/ui/variants/thresholdRun.ts`, whose `hold`
gains a count and a `subscribe` that tells `autoRuns` when it falls to
zero; `Slider.tsx`, `ThresholdSlider.tsx`, `Select.tsx` and
`NumberField.tsx` of `src/ui/widgets/`, and the dialog of the download,
take and release a hold through `RunGateProvider`. The state about to
start is the PCA `ready` in the store, live, its key not started under,
the one pass read to the end; `autoRuns` gives the page a function that
says it, `aboutToStart`, and its `subscribe` tells the page when it
changes with no change of the store. The live state is not in the
project: the project is shared with `popgen.html`, and a field of it
would have to be kept out of the PCA's key by hand (the design, choice
3).

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
stand apart, 3.39:1 in the light theme and 3.26:1 in the dark; it never
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

**A tab that becomes greyed while it is shown**, the PCA tab while
another variants file is opened, stays shown, greyed, with its bar kept
in the greyed colour and its words not in bold, so that the user can
tell which tab they are on; and its content is its reason, in the words
of its tooltip, in place of the options, which stay drawn, hidden, with
what the user left in them. When the tab is no longer greyed, its
content comes back as it was.

**At 320 px** the five labels wrap to two lines, as the row's style lets
them; the tab shown keeps its bar and its weight on whichever line it
is, and the page does not scroll sideways.

### The tabs not built yet

Populations, once not greyed, shows one line: "Not built yet: the
diversity of each population, its site frequency spectrum and its LD
decay come in a later version of the page." Distances: "Not built yet:
the distances between the populations, Hudson's Fst or Jost's D, come
in a later version of the page."

### The PCA tab

The tab's heading, an `<h2>`, is "PCA" or "PCoA" by the method of the
project. Under it, as in the old panel, in this order: the options, the
line of the individuals it will run on, Run or Stop with the lock, and,
once calculated, the result.

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
PCA", an `<h3>`, with the line "The PCA reads the variants the Variants
tab keeps. Its own missing data and MAF filters can only be stricter."
Every "PCA" of this part is "PCoA" under the PCoA, as in the old panel.
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
  base pairs, from 1", empty. The Variants tab has no LD pruning, so the
  PCA's is its own alone. Under the distance, a line says what it is in
  terms of the data, with no number, since no distance holds for every
  genome (the owner's rule of no default that depends on the genome):
  "Choose the distance beyond which the r² between two variants falls
  to its background level in your species, as studies of its LD decay
  report." While the distance is empty, the reason of the lock, in
  full, stands under that field and describes it to a screen reader,
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

**The line of what it will run on**, as on the old panel: "200
individuals of panel.nei", or "111 of the 200 individuals of panel.nei,
those the filters of individuals keep".

**Run and Stop**, one button, with the lock beside it as text that
describes it. Run makes the PCA live for the file and starts it at
once; Stop ends the run and the live state ("The PCA calculated again
by itself"). During the quiet second the button is Stop, beside the
line "The PCA starts again in a moment, once the filters stop
changing.". The lock is the first of these:

| the lock | the words |
|---|---|
| the PCA, of a file of more than 9,381 individuals, which the opening already tells | the old panel's, "panel.nei has 12,000 individuals, and the principal components of more than 9,381 need more memory than a browser tab can hold. Calculate them with popnei in Python, outside the browser." |
| the one pass is running, or is about to start | "Run once panel.nei is read to the end: the reading under way in the box Variants file and the PCA cannot run at once." |
| the one pass was stopped by the user, or failed in a way its box offers Start again for | "Run once panel.nei is read to the end: Start again its reading in the box Variants file." |
| the one pass refused by popnei, or the file could no longer be read, where the box offers no Start again (`startAgainMends` of `src/ui/variants/chain.ts`) | "Run once panel.nei is read to the end: it could not be read, as the box Variants file says. Open it again there, or open another." |
| more than 9,381 individuals kept, the PCoA | the old panel's, with "Keep at most 9,381 with the filters of individuals in the Variants tab" |
| the filters of the individuals keep none | the store's, ending "Loosen them." |
| the LD pruning on with no distance | "Type the LD distance above, or turn the LD pruning off."; the reason in full stands under the field of the distance ("Its filters") |

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
press, and its description for a screen reader, are "Stop the PCA to
change the filters.", "Stop the PCoA …" under the PCoA, the way the
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
individuals file, its Open, its Remove, its reader's options and its
"Column of the populations", which only colour the points and the
counts; "Colour the points by", the axes, 3D or 2D and the turn and
zoom of the 3D view; the row of tabs; and the opening of another variants file,
which stops the PCA, as an opening stops every calculation. The owner's
answer of 9 October 2026 named the column of the populations among the
filters to lock; the session asked the same day whether it should be,
since the PCA does not read it, and the owner answered on 10 October
2026 that it stays open (open point 3 of `docs/designs/no-undo.md`).

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
  individual with no population. While columns are cut off at its right, a fade
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
  it.

The numbers are written as on the old panel: a coordinate to four
decimals in the table, "−0.7139"; the percentages to two, "3.55%";
every negative number on the screen with "−", the minus sign.

### The downloads

Every table and every plot of the page has one button, "Download…", at
the right end of a line of its own above it, or beside the title of the
PCA's plot, and under the row of the threshold's box for a histogram
(`docs/specs/widgets/downloads.md`, "A plot"), which opens a
menu, React Aria's `MenuTrigger` and `Menu`:

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
| the counts per population | the box of the individuals file | `panel.population_counts.csv` |
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
greyed or shows its line of not built yet.

| state | what the user sees | what they can do |
|---|---|---|
| empty | the tab greyed, with its reason, as the row of tabs gives it; if it was shown when it became greyed, the reason in its place | open a variants file |
| locked | the options, the line of the individuals, Run disabled with the lock beside it, from the table of "Run and Stop"; while the PCA is live, the lock and no Run but the same words, and the PCA starts by itself a second after the lock lifts, unless it lifts with the key it had, which shows the result kept | change the options; type the distance or turn the LD pruning off; Start again the one pass in the box; change the thresholds of the individuals |
| ready | the options, the line of the individuals, Run: before the first Run for the file, and after a Stop | change the options; Run |
| about to start | the PCA live, during the quiet second after a change: the options, the line of the individuals, no result, no Run, and in the place of the bar "The PCA starts again in a moment, once the filters stop changing." with Stop | go on changing the options and the thresholds, which puts the start off; Stop, which ends the live state |
| running | Stop, the bar and the clock, and the line under them; the options and the thresholds and FILTER box of the Variants tab greyed, with "Stop the PCA to change the filters." (above, "While a PCA runs"); the same whether Run or a change started it | Stop; change the individuals file, its column of the populations and the colour of the points; turn to another tab, where the PCA goes on; open another variants file, which stops it |
| done | the result, its warnings and notes, the downloads; "Loading the result…" in its place while its code downloads, or the words of its code that could not be downloaded, with "Try again" | colour, turn, highlight, sort, download; change the options; Try again |
| results removed | not a state of its own on this page: a change that takes the result off the screen gives about to start while the PCA is live, and ready, with Run, while it is not (before its first Run is impossible, so only after a Stop); the page makes no notice, as the owner decided on 8 October 2026, and keeps no result to bring back, since 10 October 2026 | as in about to start, or as in ready |
| error | what happened and what to do, the old panel's words with this page's names, below | Run again after a failure that is not popnei's refusal; change the options or the thresholds after a refusal; open the variants file again after it could no longer be read |

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
| PCA, no variants file | "The PCA needs a variants file. Open one in the box Variants file." |
| PCA, a file being opened | "The PCA needs a variants file: panel.nei is being opened." |
| PCA, an opening that failed | "The PCA needs a variants file: panel.nei could not be opened; the box Variants file says why and what to do." |
| Populations | the three of the PCA, with "The analyses of the populations need" in place of "The PCA needs" |
| Distances, no variants file | the three of the PCA, with "The distances between populations need" |
| Distances, no individuals file | "The distances between populations need at least two populations. Open an individuals file that assigns the individuals to them." |
| Distances, the individuals file being read | "The distances between populations need at least two populations: panel_pops.csv is being read." |
| Distances, the individuals file refused or failed | "The distances between populations need at least two populations: panel_pops.csv could not be read; the box Individuals file says why and what to do." |
| Distances, no column to choose but the names of the individuals | "The distances between populations need at least two populations, and panel_pops.csv was read as a single column, the names of the individuals. If its columns are separated by another character, choose that separator in the Individuals tab."; for an xlsx, "…, and panel_pops.xlsx has no column to choose besides the names of the individuals. Add a column of the populations to it and open it again in the box Individuals file."; read with more columns than the names, all of true or false, "The distances between populations need at least two populations, and panel_pops.csv has no column of text to choose as the column of the populations: its other columns hold only true or false. Add a column of the populations to it and open it again in the box Individuals file." |
| Distances, a column of more values than a column of populations can have | "The distances between populations need at least two populations, and country has 35 values, more than the 20 a column of populations can have. Choose another column in the box Individuals file." |
| Distances, no column, or a column of fewer than two populations among the individuals of the variants file | "The distances between populations need at least two populations, and popcat gives 1 population among the individuals of panel.nei. Choose another column of the populations in the box Individuals file, or add the populations to panel_pops.csv and open it again."; with no column, "…, and no column of the populations is chosen. Choose one in the box Individuals file." |
| Distances, the filters leave fewer than two | "The distances between populations need at least two populations, and the filters keep individuals of 1 population. Loosen the filters of the individuals in the Variants tab."; with none, "…, and the filters keep no individual of any population. …" |
| Distances, no individual of the variants file in the individuals file | "The distances between populations need at least two populations, and no individual of panel.nei is in panel_pops.csv. Check that panel_pops.csv names the individuals as panel.nei does." |
| Distances, the individuals in the file, but none with a value in the column | "The distances between populations need at least two populations, and no individual of panel.nei has a value in popcat. Choose another column of the populations in the box Individuals file, or add the populations to panel_pops.csv and open it again." |
| the heading of the tab | "PCA"; "PCoA" |
| the drop-down list of the method, its items and the line under it | "PCA of the genotypes"; "PCoA of the Kosman distances"; "The PCoA suits data with many missing genotypes." |
| the filters | "Filters of the variants for the PCA"; "The PCA reads the variants the Variants tab keeps. Its own missing data and MAF filters can only be stricter."; "Maximum proportion of missing genotypes for the PCA"; "Maximum major allele frequency for the PCA"; "Prune the variants by linkage disequilibrium (LD)" |
| the value of a slider | "0.1, as in the Variants tab"; "Off, as in the Variants tab"; "0.05" |
| the ends of a slider, under its track | "0" and "0.1"; "0.5" and "Off" |
| a filter whose slider would have no range | "0, as in the Variants tab. The PCA cannot be stricter than the Variants tab here." |
| the Variants tab stricter than the PCA's own | "The Variants tab keeps at most 0.03, stricter than the 0.05 set here, so the PCA uses 0.03." |
| the lock and the help of the one pass | the table of "Run and Stop" |
| under the field of the distance | "Choose the distance beyond which the r² between two variants falls to its background level in your species, as studies of its LD decay report." |
| under the field of the distance, while it is empty | "The LD pruning of the PCA needs the distance within which variants are compared. It has no default, because it depends on how far linkage disequilibrium extends in the genome of your species. Type a distance in base pairs, or turn the LD pruning off."; "PCoA" under the PCoA |
| beside Run, while the distance is empty | "Type the LD distance above, or turn the LD pruning off." |
| an error, a refusal of the variants file itself, which the one pass would have met first | the words of the box Variants file (`src/core/analyses/fileRefusals.ts`), with "in the box Variants file" after "open it again" and "Open another variants file", and "so the PCA cannot be calculated" where the box says the variants cannot be counted: "panel.nei has no variants. Open another variants file in the box Variants file."; "panel.nei could not be read to its end: it may be damaged or cut short. Fetch or copy it again, and open it again in the box Variants file.", for a gzipped file cut short or a damaged batch of a `.nei` file; a variant at position 0, a position beyond 2,147,483,647, a genotype of another ploidy, and a line of the VCF popnei cannot read, each ending "and open it again in the box Variants file." |
| an error, the statistics of each individual refused | "The statistics of each individual, which the thresholds of the individuals need, could not be calculated, so the PCA was not run.", or "… so the PCA cannot run." when its own Run did not wait for them, followed by the row above with "so the statistics of each individual cannot be calculated", or, for another refusal, "popnei could not read panel.nei: ‹popnei's words›. Open the file again in the box Variants file, or another file." |
| an error, a failure that is not popnei's refusal, in this page's words where the old panel's name the Variants step or a project to save (`popgen2FailureText` of `src/ui/analyses/words.ts`; since 9 October 2026, by task 6.1 of the plan, from the review of work package 2, which found the old words on this page) | the variants file changed on the disk since the one pass read it, a failure and not a refusal, "panel.nei could not be read again; it may have changed on the disk since it was opened. Open it again in the box Variants file."; an error of the application's own, "The application met an error of its own: ‹its words›. Run it again."; the calculations that could not start, "The application could not start its calculations. Reload the page and open panel.nei again."; the page out of date, "The page is out of date. Reload the page and open panel.nei again."; the worker that stopped, the PCA's own words of the memory, `crashText` of core with the page |
| the note of the colours, a column to colour by that the individuals file lacks | "panel_pops.csv has no column height, by which the points were coloured, so they are coloured by the column of the populations chosen in the box Individuals file."; with no column of the populations chosen, or with None, "…, so every point is unclassified. Choose a column of the populations in the box Individuals file, or another column to colour the points by."; with no individuals file, "No individuals file is open in the box Individuals file, so the points cannot be coloured by height." |
| the end of a run, in the status region | "PCA of panel.nei calculated."; "PCoA of panel.nei calculated."; a refusal or a failure, "The PCA of panel.nei could not be calculated: " followed by the words of its error |
| in the place of the bar, during the quiet second | "The PCA starts again in a moment, once the filters stop changing."; "The PCoA starts again in a moment, once the filters stop changing." |
| the status region, a PCA started by itself | "Calculating the PCA again."; "Calculating the PCoA again." |
| the status region, a Stop of the PCA, in the tab or in the band | "PCA stopped. Press Run in the PCA tab to calculate it again."; "PCoA stopped. …" |
| the download of the filtered variants while a PCA runs | "Waits for the PCA to end; or stop it in the PCA tab." |
| the thresholds and the FILTER box of the Variants tab and the PCA's options, while a PCA runs, as tooltip and description | "Stop the PCA to change the filters."; under the PCoA, "Stop the PCoA to change the filters." |
| the button of a download | "Download…", named for a screen reader "Download the plot of the proportion of missing genotypes of the variants", "Download the table of panel_pops.csv", "Download the plot of the PCA", "Download the explained variance of the PCA", "Download the table of the individuals of the PCA", from the title the table or the plot carries; but "Download the plot of the unbiased expected heterozygosity of the variants", whose title says "Expected heterozygosity (unbiased)", and "Download the counts per population of panel_pops.csv", whose caption names the individuals of the variants file |
| its menu | "Table as CSV"; "Image as SVG"; "Image as PNG"; "Data as CSV" |
| a histogram's menu waiting, and the menu of the counts per population | "Download once panel.nei is read to the end."; once the user stopped the one pass, "Download once panel.nei is read to the end: its reading was stopped; start it again in the box Variants file."; once it failed, "Nothing to download: panel.nei could not be read to the end; the box Variants file says why." |
| the PCA's menu while three.js downloads | "Download once the 3D view is drawn." |
| the table of the individuals cut off at its right | "More columns: scroll sideways." |
| the result while its code downloads | "Loading the result…" |
| the result whose code could not be downloaded | "The result of the PCA could not be loaded. If the connection works, the site may have been updated since this page was opened: try again, or reload the page, open panel.nei again and run the PCA again."; "PCoA" under the PCoA; its button "Try again" |
| the status region, a file handed to the browser | "Saving panel.pca.coordinates.csv." |
| a PNG refused | "The image of this plot is too large for a PNG in this browser; download it as SVG."; "The image of this plot could not be made as a PNG in this browser; download it as SVG." |

**The warnings**, those of the old panel (`docs/specs/analyses/pca.md`,
"The warnings"), with these words where they name a place:

- `pruningOff`: "No LD pruning was applied for the PCA, so a region of
  the genome counts once for each of its variants, and a region of many
  variants in linkage disequilibrium, such as an inversion, can make a
  component of its own that separates the individuals by that region
  rather than by their ancestry. Turn on the LD pruning of the PCA in
  its options above, unless such regions are what you are looking for."
- `fewVariants`: "… If the dataset has more, loosen the filters of the
  PCA in its options above, or the thresholds of the Variants tab."
- `lingoesCorrection`: the old panel's, unchanged: the share of the
  variance that lay in directions no space has, 7.87% on `panel.nei`;
  the amount added to every squared distance, 0.047, and its share of
  the mean squared distance, 53%; and how far apart two individuals of
  the same genotypes are drawn, 0.22.

**The errors**, those of the old panel (`docs/specs/analyses/pca.md`,
"Its words") with "the Variants tab" for "the Variants step", "the box
Variants file" for "Load … in the Variants step", "the thresholds of the
individuals in the Variants tab" for "the filters of individuals in the
Variants step", and the row of the LD order, which names the PCA or
the PCoA by the method, ending "Sort the file, with bcftools sort for a
VCF, and open it again in the box Variants file, or turn the LD pruning
off.", the end of the lock of the LD pruning with no distance. The row
of no variant left: "No variant of
panel.nei is left after the filters of the PCA, so there is no variant
to do the PCA with. Loosen the filters of the PCA in its options above,
or the thresholds of the Variants tab." The words of the 3D view are
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
the content of the tab shown. In the PCA tab: the method; the slider of
the missing data; that of the MAF; the LD switch and its two fields; Run or Stop, or Stop beside the line of the quiet second; the warnings; the plot's "Download…",
beside the title of the plot; the bar of controls; the legend; the link
to the table; the "Download…" of the explained variance; the
"Download…" of the table of the individuals, then the table. Each
"Download…" comes before what it downloads, where it is drawn. (Until
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
itself, "Calculating the PCA again.", and a Stop of it; the end of
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
the focus, as before. During the quiet second Stop stands where Run
stood, so the focus stays on the button when it becomes Stop and when
it becomes Stop's Run again. When the PCA starts by itself, the focus
stays where it is: on a control that the lock greys, which keeps it
and gives its reason, as before.

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
its reason; a menu of a download; "Calculating the PCA again." heard
once while the focus is on a threshold of the Variants tab.

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
  second runs out; nothing starts while a PCA, the one pass or a write
  runs; a value set back starts it again; the colour of the points, the
  individuals file and its column start nothing; a Stop, during a run or
  during the second, ends the live state, and a change then starts
  nothing until Run; another variants file ends it; the LD distance
  emptied and typed again with the same value shows the result kept,
  with no request; a PCA refused by popnei under a key does not start
  again under it, and a change to another key starts it; `aboutToStart`
  true during the second alone.
- No Undo: the page's store has no `undo` nor `redo` in its type; a
  press of Ctrl+Z on the page sends no command.
- The CSV of each table and plot, in `docs/specs/widgets/downloads.md`.

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
  description; the tab shown keeps `aria-selected="true"`. The PCA tab
  shown, then another variants file opened: the tab stays shown,
  greyed, with the reason in its place. At 320 px, the five labels on
  two lines and no sideways scroll.
- **The PCA**, all thresholds of the Variants tab as a new page has
  them, the missing rate of the variants at 0.1: the PCA tab opened
  during the one pass, held (`e2e/holdWorker.ts`), shows Run disabled
  with "Run once panel.nei is read to the end: the reading under way
  …"; after the pass, Run disabled with the reason of the LD pruning
  with no distance; 50000 typed: Run; "PC1 (3.55%)" and "PC2 (3.40%)"
  on the 2D plot's axes, PC3 1.89% in the explained variance, `s000` at
  −0.7139 and 7.6765 in the table, the caption "… from 548 variants",
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
  to change the filters." as its tooltip and description; a press, a
  key or a drag on one changes nothing; the column of the populations
  and "Colour the points by" not greyed, a column chosen leaving the PCA
  running; an opening of another variants file stops it, the tab
  ready.
- **No Undo**: no button Undo nor Redo when the page opens, after
  `panel.nei`, after a threshold moved and after the PCA; Ctrl+Z,
  Meta+Z, Ctrl+Shift+Z and Ctrl+Y on the heading, on a line and in a
  box with nothing typed change no threshold, no option and no result;
  0.9 typed in the MAF box, Ctrl+Z: the box back to its number.
- **Live**, the design's checks in the browser, in `e2e/popgen2Live.spec.ts`:
  after Run and its end, ten presses of an arrow key on a threshold, on
  the slider of the missing data of the PCA and on the closed list of
  the method start one PCA, after the last press, and no control greys
  before it (the worker's requests counted); a slider held still for
  3 s, the list held open for 3 s and digits typed slowly over 3 s each
  keep working, before any PCA starts; after a change the tab never
  shows the old result, nor Run, between the change and the bar, read
  every animation frame; the line of the quiet second, then the bar;
  the status region says "Calculating the PCA again." once; a value set
  back calculates again (a request); Stop during the second: Run, and a
  later change sends nothing; the numbers of the PCA started by itself
  after the missing data of the PCA moved to 0.05 are those of "Its
  filters" below, 532 variants and PC1 3.58%.
- **The downloads**: each menu opened and chosen with the keyboard
  alone; the CSV of the PCA's plot saved and read back, header
  `individual,PC1,PC2,PC3,PC4,PC5,PC6,PC7,PC8,PC9,PC10` and the row of
  `s000` beginning `s000,-0.7138853335304419,7.676473141448964`; the
  table of the PCA, sorted by PC1, saved, its rows in that order; the
  SVG of a histogram, with its threshold's line; a PNG of the 3D view;
  a histogram's menu disabled while the pass is held, with its tooltip.
- **Kept drawn**: the PCA in 3D, turned by a drag, the Variants
  tab shown and back: the same view, in Chromium and in WebKit, whose
  WebGL context must survive the hidden tab.
- axe, the checker of accessibility, in each state of the PCA tab, the
  greyed tabs and the menus, in light and in dark.

The flows of the old page's PCA are run again, since its module and
panel are shared, and so are the old page's flows of Undo, which keeps
it. The flows of `popgen2Undo.spec.ts` that check Undo and Redo on this
page go, and its checks that no key undoes anything stay, in the bullet
"No Undo".

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
tooltip shown; the PCA tab locked, locked by the empty distance once
the file is read, `popgen2-pca-locked-ld`, ready, running, done in 3D
and in 2D, with the PCoA's warning, while the result's code downloads
and after it could not be; a menu of a download open; about to start,
`popgen2-pca-about-to-start`, and running started by itself with the
Variants tab shown and a threshold greyed, `popgen2-pca-live-locked`;
light and dark; 1280 and 320 px. The screens `popgen2-undo`,
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
second in the place of the bar; "Calculating the PCA again." said at
each start by itself, and the Stop said in the status region; the PCA
live again after Run again following a failure.

Decided by the owner and no longer the session's: the filters a running
PCA reads locked (answer 2 of 9 October 2026, kept on 10 October 2026
after the measurement of a stopped worker in WebKit); the column of the
populations open during a run, Stop that ends the live state, and the
download that waits for a running PCA (the open points of
`docs/designs/no-undo.md`, 10 October 2026).

## Left for the running application

The spacing of the line of the heading, the look of
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
- The analyses of the Populations and Distances tabs, later pieces.
- The saving of a project on this page, and the help drawer.
- The old page, `popgen.html`, which gets none of this.
