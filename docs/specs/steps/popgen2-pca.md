# popgen2.html: the five tabs, the PCA tab, the downloads and Undo

The screen spec of what `popgen2.html` gains with its first analysis:
the row of five tabs under the two boxes, Variants, Individuals, PCA,
Populations and Distances, with the tabs of the analyses greyed while
they cannot run; the PCA tab, a PCA or a PCoA of the individuals of the
variants file; a button "Download…" on every table and every plot of
the page; and Undo and Redo at the right end of the line of the page's
heading. It
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

The PCA tab is the panel of the old page, `popgen.html`, which is built
and which the owner approved on 28 September 2026: its screen spec is
the second half of `docs/specs/analyses/pca.md`, "The panel". This spec
says what is the same by pointing there, and gives in full what differs.
The two boxes and the Variants and Individuals tabs are those of
`docs/specs/steps/popgen2-input.md`, `popgen2-filters.md` and
`popgen2-download.md`, renamed and otherwise unchanged.

The module specs it reads, revised for it the same day:

- the store, its setting for this page that makes no notice and stops a
  calculation left behind, and `applyAfresh`, which the changes of the
  individuals file go through, `docs/specs/core/store.md`, "On
  popgen2.html: no notice, and a history of the filters";
- the history, `docs/specs/core/history.md`;
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
  under way, and the screens read it. A **command** changes the project
  and is a **step of the history**, which Undo takes back; a **key** is
  the text made from everything a calculation reads, under which its
  result is kept in the **cache**, the store's memory of results. A
  result is on the screen only under the key the current project gives
  (`docs/architecture.md`, section 3).
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
- Undo and Redo are back, at the right end of the line of the page's
  heading, each shown only while it has a step to take. Ctrl+Z and Cmd+Z undo.
- Opening, removing or reading again the individuals file is no step of
  Undo, as opening the variants file already is not.

## What it shows

### The order of the page

From the top: the line of the heading "Popnei", with Undo and Redo at
its right end; the two boxes, "Variants file" and "Individuals file", as
`popgen2-input.md` gives them; the row of the five tabs; the content of
the tab shown.

### Undo and Redo

**Where.** At the right end of the line of the heading "Popnei", in two
places of their own, Undo then Redo, Redo's at the right margin of the
page. A place stays empty while its button is hidden, so neither button
moves when the other comes or goes, and a second click lands where the
first did. The right margin is that of the page's column, at most 48
rem wide, so at 1280 px the buttons stand about 528 px from the window's
right edge, not in its corner. The line has the height of the heading whether or not a
button is shown, so the page under it does not move when Undo appears.
At 320 px the heading and both buttons stay on one line.

**When.** Undo is drawn while the store has a step to undo, or a run of
the arrow keys on a threshold waits to become one (`popgen2-filters.md`,
"A threshold moved with the keys"); Redo while the store has a step to
redo and no run waits. Otherwise each is not drawn at all: not reached by
the Tab key, not found by a screen reader. So neither is there when the
page opens, nor after a variants file or an individuals file is opened.

**What is a step.** Each command of this table, with the description
that names it in the tooltip and in the status region:

| what the user does | the description |
|---|---|
| a threshold of the Variants tab moved, typed, turned on or off | those of `thresholdChange.ts` of `src/ui/variants/`: "the filter of the variants by missing data changed", "the MAF filter was turned on", "the filter of individuals by missing data was turned off", … |
| the FILTER box ticked or not | as `popgen2-filters.md` gives them |
| a column chosen in "Column of the populations", or None | "the column of the populations changed" |
| the method of the PCA | "the method of the PCA changed" |
| "Stricter for the PCA" chosen for its missing data or its MAF, one command, `stricterCommand`, that sets `follow` false and the value together | "the missing data filter of the PCA was made stricter", "the MAF filter of the PCA was made stricter" |
| "As in the Variants tab" chosen again | "the missing data filter of the PCA was set back to as in the Variants tab", "the MAF filter …" |
| a value of a filter made stricter, typed | "the missing data filter of the PCA changed", "the MAF filter of the PCA changed" |
| the LD pruning of the PCA turned on or off | "the LD pruning of the PCA was turned on", "… was turned off" |
| its r² or its distance typed | "the LD pruning of the PCA changed" |
| "Colour the points by" | "the colour of the points of the PCA changed" |
| a component chosen for an axis | "the components on the axes changed" |
| 3D or 2D | "the PCA was drawn in 3D", "the PCA was drawn in 2D" |

Under the PCoA every "the PCA" of the table is "the PCoA", by the method
of the project after the command, as the words of the tab follow it.

No step: the opening of a variants file, by the store's `open`; the
opening, the removal and a change of an option of the reader of the
individuals file, by the store's `applyAfresh`. Each starts the history
afresh, with nothing to undo or redo, so Undo and Redo go after them.
Nor the column the page chooses at the end of the read of the
individuals file, which may come seconds after the opening: the store
records it as it records the read, `populationColumnChosen`, into every
project of the history since the opening, so a threshold moved while
the file was read stays a step, and its undo keeps the column; a run of
the arrow keys waiting and a number typed and not applied when it comes
stay as they were (`docs/specs/entry.md`, "The column of the
populations on popgen2.html"). The tab
shown, the sort of a table, how far it is scrolled, the turn and the
zoom of the 3D view and the group highlighted in the legend are of the
screen, and no step.

**What an undo brings back.** The project before the step, and with it
every result the cache holds under that project's keys, shown with no
calculation. A PCA that the step stopped had no result, so the undo
shows none: the tab shows its options and Run, and the PCA is run
again; a result calculated before it under the same settings, if the
cache still holds it, is shown.

**What they say.** The words on the buttons are "Undo" and "Redo". Each
has a tooltip, on the mouse and on the focus, that names its step,
"Undo: the MAF filter changed", which is also its description for a
screen reader. An undo or a redo, by a button or by a key, is said in
the status region, "Undone: the MAF filter changed." or "Redone: the
MAF filter changed." A button that appears is not announced.

**The keys.** The page listens on the whole window from the moment it
opens, whether or not a button is shown: Ctrl+Z, and Cmd+Z on macOS,
undo; Ctrl+Shift+Z, Cmd+Shift+Z and Ctrl+Y redo; Cmd+Y is the browser's
history on macOS and is left to it. With no step to take, the key does
nothing, and does not reach the browser's own undo. Beside the typing
of a box:

| where the focus is | Ctrl+Z or Cmd+Z |
|---|---|
| a number box with something typed and not yet given to the project by Enter, Tab or a click elsewhere | puts back the box's number, the project's value; the page undoes nothing |
| a number box with nothing typed | the page's Undo |
| a line of a threshold, with a run of the arrow keys waiting | the run is made a change, then undone, so the threshold goes back to where the presses started |
| the dialog of the download of the filtered variants, open | nothing |
| an open menu "Download…" | the page's Undo; the menu stays open, unless the undo removes the table or the plot it belongs to, which closes it, and the focus goes to the heading "Popnei" |
| anywhere, while a PCA runs | nothing: Undo and Redo wait until the PCA ends or is stopped, their buttons greyed, as the filters it reads are locked (below, "While a PCA runs") |
| anywhere else on the page | the page's Undo |

The box refuses the browser's own undo of its text, by the keys and by
the menu Edit, as it does since 9 October 2026 (`popgen2-filters.md`,
"The number box"), so the browser's undo and the page's never act on the
same press. The menu Edit of the browser is not the page's Undo.

**The focus.** When a press of Undo takes the last step and Undo goes,
the focus moves to Redo, which the press has just shown; the same from
Redo to Undo. When a button with the focus goes for any other reason, as
when a file dropped on a box while Redo has the focus starts the history
afresh, the focus goes to the heading "Popnei". A click on another
control does not leave the focus on the button: in Chromium and in
WebKit a click on the words of the FILTER box moves the focus off Redo
before the box sends its command.

**While a PCA runs**, Undo and Redo wait, as the filters the PCA reads
are locked (the owner's answer 2 to `docs/plans/analyses-pca.md`, 9
October 2026). A button that has a step stays drawn where it was,
greyed, and is still reached by the Tab key; its tooltip and its
description for a screen reader are the reason it waits, "Stop the PCA
to change the filters.", in place of its step; a click, Enter or Space
on it does nothing; and the keys do nothing, as the table of the keys
says. The reason is that of the lock of the filters, "Stop the PCoA to
change the filters." under the PCoA (below, "While a PCA runs"; settled
on 9 October 2026 by task 6.1 of the plan). When the PCA ends, fails or
is stopped, each button is again as "When" and "What they say" give it.

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
are, with the old panel's two items, "PCA of the genotypes" and "PCoA
of the Kosman distances, for data with many missing genotypes"; PCA by
default. A drop-down list since 10 October 2026, as the owner asked on
trying the page (`docs/plans/analyses-pca.md`, work package 10, round
1); two radio buttons before, as on the old panel, which keeps them.

**Its filters**, under the heading "Filters of the variants for the
PCA", an `<h3>`, with the line "The PCA reads the variants the Variants
tab keeps. Its own missing data and MAF filters can only be stricter."
Every "PCA" of this part is "PCoA" under the PCoA, as in the old panel.
Then three, in this order:

- **Missing data** and **MAF**, each a group of two radio buttons,
  named as on the old panel, "Filter the variants by missing data" and
  "Filter the variants by major allele frequency (MAF)":
  - "As in the Variants tab: 0.1", chosen by default, the threshold of
    the Variants tab as its box writes it, or "As in the Variants tab:
    off" while that threshold is off;
  - "Stricter for the PCA", which shows its number field under it:
    "Maximum proportion of missing genotypes, from 0 to 0.1" and
    "Maximum major allele frequency, from 0 to 0.95", the upper end the
    Variants tab's value, or 1 while that threshold is off. The field
    takes as many decimals as the box of that threshold in the Variants
    tab, which rounds to the step of its axis (`popgen2-filters.md`, "A
    number with many decimals"), and at least two: three on the missing
    rate of `panel.nei`, whose axis steps by 0.001. Under the field, the
    line of the Variants step that says what popnei filters on, as on
    the old panel. While the Variants tab has the threshold off, and the
    field shows 1, a line under it says that 1 is no filter: "1 keeps
    every variant: type a lower value to filter." (since 10 October
    2026, by the review of work package 6 of the plan, which found
    nothing on the screen saying so).

  Choosing "Stricter for the PCA" sends one command, `stricterCommand`
  of `src/ui/analyses/pca/commands.ts`, with `follow` false and the
  upper end of the field as the value: the Variants tab's, or 1 while
  that threshold is off. So the choice alone never changes the variants
  the PCA reads, nor its key, and a result of the PCA stays on the
  screen; the user then lowers the number. While the Variants tab has
  the threshold off, the PCA's own value of 1 is no filter, as a
  threshold at 1 is off in the Variants tab (`THRESHOLD_OFF_AT` of
  `src/core/project.ts`, the owner's decision of 7 October 2026), so
  the PCA reads as the Variants tab until the user types a number below
  1 (`pcaFilters`, `docs/specs/analyses/pca.md`, "On popgen2.html").
  Until 9 October 2026 that value was a filter at 1, a new key for the
  same variants of the missing data and a second run of minutes; the
  review of work package 2 of the plan found it, and task 6.1 settled
  it so. A value typed before,
  and set back by "As in the Variants tab", is not brought back: a value
  kept looser than the Variants tab of now would be shown as the
  Variants tab's anyway. Choosing "As in the Variants tab" sends
  `follow` true alone; the field goes.

  The upper end and the decimals of the field are `stricterBound` of
  `src/ui/analyses/pca/stricter.ts`, from the project and the decimals
  of the step of the Variants tab's box of that threshold, which the
  axis of its histogram gives once the one pass has drawn it; before
  that, the decimals of the Variants tab's value, and at least two.

  A number above the upper end is refused with the line under the field,
  "0.2 is more than the 0.1 of the Variants tab; the maximum proportion
  of missing genotypes for the PCA stays 0.05.", "0.97 is more than the
  0.95 of the Variants tab; the maximum major allele frequency for the
  PCA stays 0.9.", and sends nothing; below 0, or with more decimals
  than the field takes, the lines of the old panel. While the Variants
  tab has the threshold off, the upper end is 1, and a number above it
  has the old panel's line, "1.5 is more than 1; …". These lines and the
  line of the Variants tab stricter, below, are `stricterLines` of the
  same module.

  **When the Variants tab becomes stricter** than the PCA's own value,
  the PCA uses the Variants tab's: the field shows that value, and under
  it the line "The Variants tab keeps at most 0.03, stricter than the
  0.05 set here, so the PCA uses 0.03." The project keeps 0.05, and when
  the Variants tab goes back above it, the PCA has its 0.05 again with
  no command. The field never shows a value looser than the one used.
  A number typed there is bounded by the Variants tab as above. Typed
  over the 0.03 the field shows, 0.03 is still sent, though the field
  already shows it, so that the project keeps 0.03 as the PCA's own and
  the PCA does not go back to 0.05 when the Variants tab is loosened.

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
of the Variants step: at most two decimals for the proportions and r²,
a whole number from 1 to 9007199254740991 for the distance, written
with no comma between thousands; the empty distance field sends nothing
on the arrow keys, Page Up, Page Down, Home and End.

**The line of what it will run on**, as on the old panel: "200
individuals of panel.nei", or "111 of the 200 individuals of panel.nei,
those the filters of individuals keep".

**Run and Stop**, one button, with the lock beside it as text that
describes it, the first of these:

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
list does not open, the two groups of the missing data and the MAF
with their fields, the LD switch and its two fields. Each is drawn greyed, carries
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
changes nothing, and leaves its tooltip shown. Undo and Redo wait with the same
words (above, "Undo and Redo"), and so does the download of the
filtered variants, with its own ("Its words"). When the PCA ends, fails
or is stopped, each is as before.

Not locked, since the PCA's key holds none of them: the box of the
individuals file, its Open, its Remove, its reader's options and its
"Column of the populations", which only colour the points and the
counts; "Colour the points by", the axes, 3D or 2D and the buttons of
the 3D view; the row of tabs; and the opening of another variants file,
which stops the PCA, as an opening stops every calculation. The owner's
answer named the column of the populations among the filters to lock;
the session asked on 9 October 2026 whether it should be, since the PCA
does not read it, and until the owner answers the page follows the
session's recommendation, to lock only what the PCA reads (written on 9
October 2026, by task 6.1 of the plan; until then this spec listed the
column).

**The result**, as the old panel shows it (`docs/specs/analyses/pca.md`,
"What it shows"), with these differences:

- The title over the plot, "Principal components of panel.nei", or
  "Principal coordinates of panel.nei" under the PCoA; and the plot's
  name for a screen reader by the method too, "Principal coordinates,
  PC1, PC2 and PC3" under the PCoA, where the old panel says "Principal
  components" under both.
- **The bar of controls**: "3D" and "2D", the components on the axes,
  "Colour the points by" with "Population" and every column of the
  individuals file but the names, the buttons that turn, tilt, zoom and
  look along an axis of the 3D view; as the old panel.
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
| locked | the options, the line of the individuals, Run disabled with the lock beside it, from the table of "Run and Stop" | change the options; type the distance or turn the LD pruning off; Start again the one pass in the box; change the thresholds of the individuals |
| ready | the options, the line of the individuals, Run | change the options; Run |
| running | Stop, the bar and the clock, and the line under them; the options and the thresholds and FILTER box of the Variants tab greyed, with "Stop the PCA to change the filters." (above, "While a PCA runs") | Stop; change the individuals file, its column of the populations and the colour of the points; turn to another tab, where the PCA goes on; open another variants file, which stops it |
| done | the result, its warnings and notes, the downloads; "Loading the result…" in its place while its code downloads, or the words of its code that could not be downloaded, with "Try again" | colour, turn, highlight, sort, download; change the options; Try again |
| results removed | the options, the line of the individuals and Run, as in ready, with no words of why: the page makes no notice, as the owner decided on 8 October 2026; an Undo of the change, or the filters set back as they were, show the result again from the cache | Undo; Run |
| error | what happened and what to do, the old panel's words with this page's names, below | Run again after a failure that is not popnei's refusal; change the options or the thresholds after a refusal; open the variants file again after it could no longer be read |

A change of the thresholds, of the FILTER box or of an option of the
PCA that changes what the PCA reads, its key, takes a result off the
screen. While a PCA runs no such change can be made, since they are
locked; the store would stop it at once if one were. A change that does
not, a threshold of the Variants tab moved while the PCA's own is
stricter, the colour, the axes, the view, keeps the result on the
screen. Another individuals file, or
another column, colours the result again with no calculation. Another
variants file stops the PCA and keeps its options.

A defect of the application's own while the tab is drawn leaves its
heading alone in its place, and the error bar says what happened, as
for every part of the page; another variants file opened draws the tab
again, and a tab that caught nothing keeps what it holds, a number
half typed among it.

## What it sends and reads

It sends the commands of the table of "What is a step", each with
`store.apply` and its description; the commands of the PCA are those of
`src/ui/analyses/pca/commands.ts` with this page's descriptions; Run,
`startAnalysis(store, "pca")` of `src/ui/runs.ts`; Stop,
`store.cancelRun("pca")`; Undo and Redo, `undoOrRedo` of
`src/ui/shell/undoRedo.ts`. The commands of the individuals file go
that the user makes go through `store.applyAfresh` (`popgen2-input.md`,
"What it sends and reads", revised), and the column the page chooses at
a read is the store's `populationColumnChosen` (`docs/specs/entry.md`).

It reads: the state of `pca` among the store's analyses, and its run;
the project, for `pcaOptions`, `pcaFilters` with the rule of this page,
`pcaColours`, `colourColumns` and the names of the files; the
individuals kept; `analysisTabs` of core for the row of tabs; the
store's `undo` and `redo` and the run waiting on a threshold
(`usePendingChange` of `src/ui/variants/runGate.tsx`) for Undo and
Redo; the state of the one pass and of the code that starts it
(`src/ui/autoRuns.ts`) for the lock of Run; and the state of `pca`,
running or not, for the lock of the filters and the wait of Undo and
Redo. It holds of its own the tab
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
| Undo, Redo | "Undo"; "Redo"; their tooltips "Undo: ‹the description›", "Redo: ‹the description›" |
| the status region, an undo or a redo | "Undone: ‹the description›."; "Redone: ‹the description›." |
| the heading of the tab | "PCA"; "PCoA" |
| the filters | "Filters of the variants for the PCA"; "The PCA reads the variants the Variants tab keeps. Its own missing data and MAF filters can only be stricter."; "As in the Variants tab: 0.1"; "As in the Variants tab: off"; "Stricter for the PCA"; "Prune the variants by linkage disequilibrium (LD)" |
| a number above the Variants tab's | "0.2 is more than the 0.1 of the Variants tab; the maximum proportion of missing genotypes for the PCA stays 0.05." |
| the Variants tab stricter than the PCA's own | "The Variants tab keeps at most 0.03, stricter than the 0.05 set here, so the PCA uses 0.03." |
| the lock and the help of the one pass | the table of "Run and Stop" |
| under the field of a filter made stricter, while the Variants tab has that threshold off | "1 keeps every variant: type a lower value to filter." |
| under the field of the distance | "Choose the distance beyond which the r² between two variants falls to its background level in your species, as studies of its LD decay report." |
| under the field of the distance, while it is empty | "The LD pruning of the PCA needs the distance within which variants are compared. It has no default, because it depends on how far linkage disequilibrium extends in the genome of your species. Type a distance in base pairs, or turn the LD pruning off."; "PCoA" under the PCoA |
| beside Run, while the distance is empty | "Type the LD distance above, or turn the LD pruning off." |
| an error, a refusal of the variants file itself, which the one pass would have met first | the words of the box Variants file (`src/core/analyses/fileRefusals.ts`), with "in the box Variants file" after "open it again" and "Open another variants file", and "so the PCA cannot be calculated" where the box says the variants cannot be counted: "panel.nei has no variants. Open another variants file in the box Variants file."; "panel.nei could not be read to its end: it may be damaged or cut short. Fetch or copy it again, and open it again in the box Variants file.", for a gzipped file cut short or a damaged batch of a `.nei` file; a variant at position 0, a position beyond 2,147,483,647, a genotype of another ploidy, and a line of the VCF popnei cannot read, each ending "and open it again in the box Variants file." |
| an error, the statistics of each individual refused | "The statistics of each individual, which the thresholds of the individuals need, could not be calculated, so the PCA was not run.", or "… so the PCA cannot run." when its own Run did not wait for them, followed by the row above with "so the statistics of each individual cannot be calculated", or, for another refusal, "popnei could not read panel.nei: ‹popnei's words›. Open the file again in the box Variants file, or another file." |
| an error, a failure that is not popnei's refusal, in this page's words where the old panel's name the Variants step or a project to save (`popgen2FailureText` of `src/ui/analyses/words.ts`; since 9 October 2026, by task 6.1 of the plan, from the review of work package 2, which found the old words on this page) | the variants file changed on the disk since the one pass read it, a failure and not a refusal, "panel.nei could not be read again; it may have changed on the disk since it was opened. Open it again in the box Variants file."; an error of the application's own, "The application met an error of its own: ‹its words›. Run it again."; the calculations that could not start, "The application could not start its calculations. Reload the page and open panel.nei again."; the page out of date, "The page is out of date. Reload the page and open panel.nei again."; the worker that stopped, the PCA's own words of the memory, `crashText` of core with the page |
| the note of the colours, a column to colour by that the individuals file lacks | "panel_pops.csv has no column height, by which the points were coloured, so they are coloured by the column of the populations chosen in the box Individuals file."; with no column of the populations chosen, or with None, "…, so every point is unclassified. Choose a column of the populations in the box Individuals file, or another column to colour the points by."; with no individuals file, "No individuals file is open in the box Individuals file, so the points cannot be coloured by height." |
| the end of a run, in the status region | "PCA of panel.nei calculated."; "PCoA of panel.nei calculated."; a refusal or a failure, "The PCA of panel.nei could not be calculated: " followed by the words of its error |
| the download of the filtered variants while a PCA runs | "Waits for the PCA to end; or stop it in the PCA tab." |
| the thresholds and the FILTER box of the Variants tab, the PCA's options, Undo and Redo, while a PCA runs, as tooltip and description | "Stop the PCA to change the filters."; under the PCoA, "Stop the PCoA to change the filters." |
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

**The order of the Tab key** (2.4.3): the heading is not a stop; Undo,
then Redo, when shown; the box of the variants file and the box of the
individuals file, as `popgen2-input.md` gives them; the row of tabs,
one stop, the tab shown, also after the arrow keys rested on a greyed
tab before the focus left the row, whose Left and Right arrow keys move
along the labels, greyed ones among them, and Home and End go to the
first and the last; then
the content of the tab shown. In the PCA tab: the method; the missing
data, its field while stricter; the MAF, the same; the LD switch and
its two fields; Run or Stop; the warnings; the plot's "Download…",
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

**What is said without moving the focus** (4.1.3): an undo or a redo; a
file handed to the browser by a download, and a PNG refused; the end of
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
whose box says it.

**The menus** are React Aria's: Enter, Space or the Down arrow key open
a menu, the arrow keys move in it, Enter chooses, Escape closes it and
gives the focus back to its button. Each button is named by what it
downloads, so that the five buttons of the PCA tab are not five
"Download".

**Undo and Redo**: their tooltips are their descriptions; a button that
goes hands the focus on, as "The focus" above says.

**The size of what is pressed** (2.5.8): Undo, Redo, each "Download…"
and each tab are at least 24 by 24 px, as every button of the page.

The line "The Variants tab keeps at most …" is not said: it appears
after a change made in the Variants tab, about a field the user is not
looking at, and is read when they reach the field.

**The PCA's plot, its legend, its table and its 3D view** are as on the
old panel (`docs/specs/analyses/pca.md`, "Accessibility"), with
"Unclassified" in place of "No population" in the description and the
legend.

**Not yet heard in VoiceOver**, which the session cannot run: the row
read as "Files and analyses, tab list", a greyed tab read as dimmed with
its reason; Undo read with its step; a menu of a download.

## How it is checked

**In Vitest**, in node:

- `analysisTabs` of core in each row of its spec; the words of each
  reason from it.
- The descriptions of the PCA's commands on this page, method by
  method, from `src/ui/analyses/pca/commands.ts` given the page;
  `stricterCommand` sets `follow` and the value in one step.
- `stricterBound(p, kind, stepDecimals)` of
  `src/ui/analyses/pca/stricter.ts`, the upper end and the decimals of
  each field, and `stricterLines`, the line of a refusal, the line of
  the Variants tab stricter and the line "1 keeps every variant: type a
  lower value to filter.": the Variants tab at 0.1, at 0.0035, off;
  the decimals of the step of the Variants tab's box given and not
  given. (`stepDecimals` since 9 October 2026, by task 6.1 of the plan:
  the decimals of the box come from the axis of its histogram, which the
  project alone does not give.)
- `pcaFilters` with page `"popgen2"`, an own value of 1 while the
  Variants tab has the threshold off: no filter, the key of the PCA as
  when it follows.
- `passLock`: running, about to start, stopped by the user, failed with
  Start again offered, refused by popnei, read to the end.
- The words of the lock of the filters by the method, and
  `popgen2FailureText` for each failure that is not popnei's refusal.
- Undo and Redo, with the real store of the page and a fake worker:
  nothing to undo after the store is made, after `panel.nei` is opened,
  and after an individuals file is opened, read and given its column;
  one step after a threshold; the descriptions of each row of "What is
  a step"; an undo of a change that removed the PCA's result gives
  `done` again with no request to the worker; a PCA running when a
  threshold changes is stopped at once, and an undo gives `ready`.
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
- **Its filters**: the missing data made stricter at 0.05: 532
  variants, PC1 3.58%; 0.2 typed: the line of refusal, nothing sent;
  the Variants tab's missing rate moved to 0.03: the field shows 0.03,
  with the line, and back to 0.1: the field shows 0.05 again. The MAF
  made stricter at 0.9, the missing data as in the Variants tab: 510
  variants, PC1 3.68%. The MAF set back to as in the Variants tab, then
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
  running; Undo greyed with the same words, and Ctrl+Z undoes nothing
  while it runs; an opening of another variants file stops it, the tab
  ready.
- **Undo and Redo**: no button when the page opens, after `panel.nei`,
  and after `panel_pops.csv`; a threshold moved: Undo, with its tooltip
  "Undo: the filter of the variants by missing data changed" on the focus; Undo pressed:
  Redo appears, Undo goes, the focus on Redo, neither button moved by a
  pixel; Ctrl+Z and Meta+Z on the heading, on a line and in a box with
  nothing typed, an undo each; 0.9 typed in the MAF box, Ctrl+Z: the box
  back to its number and Undo still naming the step before; the PCA
  done, a threshold that removes it moved, Undo: the plot back with no
  request to the worker; a menu "Download…" open, Ctrl+Z: an undo, the
  menu still open; the line of the heading of the same height with and
  without the buttons, at 320 and 1280 px.
- **The downloads**: each menu opened and chosen with the keyboard
  alone; the CSV of the PCA's plot saved and read back, header
  `individual,PC1,PC2,PC3,PC4,PC5,PC6,PC7,PC8,PC9,PC10` and the row of
  `s000` beginning `s000,-0.7138853335304419,7.676473141448964`; the
  table of the PCA, sorted by PC1, saved, its rows in that order; the
  SVG of a histogram, with its threshold's line; a PNG of the 3D view;
  a histogram's menu disabled while the pass is held, with its tooltip.
- **Kept drawn**: the PCA in 3D, turned with its buttons, the Variants
  tab shown and back: the same view, in Chromium and in WebKit, whose
  WebGL context must survive the hidden tab.
- axe, the checker of accessibility, in each state of the PCA tab, the
  greyed tabs and the menus, in light and in dark.

The flows of the old page's PCA are run again, since its module and
panel are shared, and the flows of `popgen2Undo.spec.ts`, which the
hidden buttons had cut down, are brought back with the buttons.

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
and after it could not be; a menu of a download open; Undo alone,
Undo with Redo, and Undo waiting while a PCA runs,
`popgen2-undo-waiting`; light and dark; 1280 and 320 px.

**By hand**, in the plan: the memory and the time of a PCA and a PCoA
of 1,000, 4,000 and 9,381 individuals after the one pass of the same
file, in Chromium and WebKit (the design, "The memory and the time");
the time of the CSV of a table of 10,000 rows; VoiceOver with Safari on
the row of tabs, Undo and a menu.

## Choices made by the session

From the design, and open to the owner's change once they try the
page: the names of the tabs; a greyed tab that the keyboard reaches; a
tab that stays shown when it becomes greyed; every tab kept drawn; the
labels wrapping at the width of a phone; Run locked until the one pass
ends; the unclassified as one group, "Unclassified"; the PCA's own value
kept when the Variants tab goes below it; "Stricter for the PCA" always
starting at the upper end of its field, the Variants tab's value or 1,
where the design had it start there only the first time: the project
always holds a value for the filter, 0.1 or 0.95 before the user types
one, so the page cannot tell a first choice from a later one; the decimals of its field
those of the Variants tab's box; the PCA's limit of 9,381 individuals
before the lock of the one pass; the LD pruning a
switch; one button "Download…" with a menu; the names of the files;
Redo back with Undo, shown by the same rule; their places that stay
empty; the keys caught on the whole page; the removal of the individuals
file and a change of its reader as no steps; the filters a running PCA
reads locked, and Undo and Redo waiting while it runs (the owner's
answer 2 of 9 October 2026), and the column of the populations left
open meanwhile, pending the owner's answer to the session's question of
the same day; "Stricter for the PCA" at 1 while the Variants tab has the
threshold off, read as no filter; a population with no point left out
of the legend; and the words.

## Left for the running application

The spacing of the line of the heading and of the buttons, the look of
a greyed tab, the layout of the options and of the bar of controls, the
size of the plot, where each "Download…" sits beside its caption, and
whether the options fold away once there is a result.

## Open points

None. The owner answered the design's questions on 9 October 2026.

## Not in this spec

- The PCA's module, its key, its job, its warnings and its numbers:
  `docs/specs/analyses/pca.md`, with its part "On popgen2.html".
- The CSV of each table and plot, the menu's component and the handle
  of a plot: `docs/specs/widgets/downloads.md`.
- The store's setting of this page and `applyAfresh`:
  `docs/specs/core/store.md`.
- The boxes, the Variants tab and the Individuals tab:
  `popgen2-input.md`, `popgen2-filters.md`, `popgen2-download.md`.
- The analyses of the Populations and Distances tabs, later pieces.
- The saving of a project on this page, and the help drawer.
- The old page, `popgen.html`, which gets none of this.
