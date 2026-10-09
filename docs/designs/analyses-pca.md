# The tabs of the analyses, and the PCA, on popgen2.html

A design of 9 October 2026, a draft that waits for the owner's approval
and for the answers to the seven questions at its end. It decides how
`popgen2.html` grows from two tabs, one for each file, to a row of five,
Variants, Individuals, PCA, Populations and Distances; how a tab of an
analysis that cannot run yet is greyed out, for every user, the
keyboard and the screen reader included; and how the PCA tab is made
from the PCA of the old page, `popgen.html`, which is built and was
approved by the owner on 28 September 2026
(`docs/specs/analyses/pca.md`). The Populations and Distances analyses
come in later pieces; this one gives them their tabs. It serves case 3
of `docs/use-cases.md`, "Look for clusters of individuals", the second
in the order of building there. It touches sections 3, 5 and 7 of
`docs/architecture.md` and section 5 of `docs/functionality.md`, and
changes none of them until the owner answers; what each answer would
change is said with it. The page as it is, two boxes and two tabs, is
that of `docs/designs/input-page.md`, accepted by the owner on 9
October 2026.

## The design in short, for the owner

- The two boxes, "Variants file" and "Individuals file", stay at the
  top. Under them, one row of five tabs: **Variants**, which holds the
  plots, the thresholds and the download, as the tab "Variants file"
  does today; **Individuals**, the table of the individuals file, as
  "Individuals file" does; **PCA**; **Populations**; **Distances**. The
  first two lose the word "file", so that the row fits on a laptop's
  window and the tab is not named as its box is.
- A tab of an analysis that cannot run yet is greyed out and does not
  open. The PCA and Populations tabs are greyed until a variants file is
  open; the Distances tab until the individuals file gives at least two
  populations among the individuals of the variants file. Resting the
  mouse on a greyed tab shows why and what to do, "The PCA needs a
  variants file. Open one in the box Variants file."
- A greyed tab can still be reached with the Tab and arrow keys, so a
  keyboard user sees the same words, and a screen reader says
  "PCA, tab, dimmed" followed by them. React Aria, the library the
  page's controls are built with, has a greyed tab of its own that the
  keyboard cannot reach, so the application's tabs, its own code around
  React Aria's, mark a tab greyed themselves, about thirty lines more.
- Populations and Distances are greyed by their real conditions, and
  once those hold they open on one line, "Not built yet: …", so that the
  owner can try the greying now and the analyses fill the tabs later.
- The PCA tab is the PCA of the old page with its words changed: PCA
  or PCoA, the PCA's own filters of missing data, MAF and LD, a Run
  button, the plot in 3D and in 2D, the legend by population, the table
  of the coordinates and their downloads. Its Run waits until the one
  pass has ended, the one reading of the variants file that the page
  makes by itself when the file is opened.
- An individual the individuals file does not classify is drawn in the
  PCA all the same, as "Unclassified", and the PCA never waits for the
  individuals file: that file only colours the points.
- Seven questions for the owner are at the end, each with a
  recommendation: whether the PCA's filters narrow those of the Variants
  tab or replace them, and where its LD pruning starts; PCA and PCoA in
  one tab; what happens to a PCA when a filter changes; what the results
  show and download in this piece; a download of the variants while a
  PCA runs, and the other cases of the page; when the PCA tab opens; and
  what the two tabs not built yet show.

## What the user can do once it is built

A user of case 3 opens `popgen2.html` with `panel.nei`, 200
individuals and 1,200 variants, and `panel_pops.csv`, which assigns
them to the populations p0, p1 and p2. Before the variants file is
open, the tabs PCA, Populations and Distances are greyed; with the
mouse on PCA the page says that it needs a variants file. Once
`panel.nei` is open, PCA and Populations are no longer greyed, and once
`panel_pops.csv` is read, Distances neither. The user turns to the PCA
tab, chooses PCA rather than PCoA, types an LD pruning of r² at most 0.1
within 50,000 base pairs, and presses Run. Within a second they see the
individuals in 3D, coloured p0, p1 and p2, with the variance each
component explains and the count of the variants used, 548 of the 1,200
(`docs/specs/analyses/pca.md`, "How it is verified"). They turn the
plot, switch to 2D, colour the points by another column of the
individuals file, and download the plot and a CSV of the coordinates
that vavilov-explorer, the owner's desktop application, imports to build
the groups by hand.

## The terms

The words of `docs/architecture.md`, as this design uses them:

- **The project**: everything the user has set on the page, the files,
  the filters and the options of each analysis, as one value that each
  change replaces with a new one; a **command** is such a change.
- **The store**: the part of the code that holds the project, the
  results and the calculations under way, and that the screens read.
- **A key**: the text made from everything a calculation reads, under
  which its result is kept in the **cache**, the store's memory of
  results. The screen shows a result only under the key the current
  project gives; a change that gives another key takes the result off
  the screen, and a change back brings it again from the cache with no
  calculation (section 3).
- **The calculation worker**: the second thread of the tab, where
  popnei runs so that the page does not freeze. It runs one calculation
  at a time; the others wait in a queue, and the store has no state for
  a calculation that waits, so it would show as running with no
  progress (section 5).
- **The one pass**: the one reading of the variants file that
  `popgen2.html` makes by itself when the file is opened, which gives
  the count of the variants, the plots of the Variants tab and each
  individual's missing rate and heterozygosity
  (`docs/plans/one-pass.md`). The box of the variants file shows its bar,
  its Stop and its Start again.
- **The individuals kept**: those the two thresholds of the individuals
  keep, known as soon as the file is open when neither is on, and only
  once the one pass has ended when one is.
- **The module** of an analysis: its code in `src/core/analyses/`,
  which says what the analysis reads, what it asks popnei for, its key
  and its locks.
- **A lock**: the reason an analysis cannot run, given by its module
  from the project, and shown beside its Run button, which is then
  disabled.
- **Unclassified**: an individual of the variants file with no
  population, with no individuals file, an empty cell, or absent from
  the file, by the owner's decision of 9 October 2026
  (`docs/designs/input-page.md`).
- **React Aria**: the library of controls the screens are built with,
  which gives each control its keys and the words a **screen reader**
  reads aloud to a user who cannot see the page. The **focus** is the
  control the keyboard acts on, which the Tab key moves from one control
  to the next. A **tooltip** is the short text that appears beside a
  control while the mouse rests on it or the focus is on it.
- **The status region**: a part of the page that a screen reader reads
  aloud when its text changes, without the focus moving there.
- **The floor** of the browsers: the oldest versions the applications
  must work in, Chrome 111, Firefox 115 and Safari 16.4, decided by the
  owner on 24 September 2026.
- **WebGL** is the part of the browser that draws with the graphics
  card, each drawing surface holding a **WebGL context**, of which a
  browser lets a page hold only a few at once, and **three.js** the library that draws the 3D view with it,
  134 KB gzipped, downloaded the first time a 3D view is drawn
  (`docs/specs/analyses/pca.md`, "Its options").

## The problem, and what forces it

Case 3 asks for a PCA, or a PCoA when many genotypes are missing, of
the individuals of the variants file, with an LD pruning whose distance
the user types, drawn in two and three dimensions, coloured by a column
of the individuals file, with the variance each component explains,
how many variants and individuals went into it, and the plot and the
coordinates to download. `popgen2.html` has no analysis the user runs:
its one calculation is the one pass, which starts by itself.

The old page has the whole PCA, its module in `src/core/analyses/pca.ts`,
its panel in `src/ui/analyses/pca/`, the scatter and the 3D view in
`src/charts/scatter.ts` and `pca3d.ts`, and its spec of 2,780 lines. Most
of it is taken as it is. Five things make this more than a new tab over
that code:

1. **Tabs that cannot open.** The owner decided on 9 October 2026 that
   a tab of an analysis that cannot run yet is greyed and does not
   open, over a tab that opens to say why, so that a user does not
   click into a tab that fails. React Aria's greyed tab cannot be
   reached with the keyboard, so a user who does not use a mouse would
   never learn why it is grey.
2. **Two calculations on one worker.** The PCA reads the whole variants
   file in its own pass, in the calculation worker, which the one pass
   holds while it runs. A PCA started then would wait in the queue
   showing "running" with a bar that does not move, for minutes with a
   large file.
3. **The individuals file does not lock.** On the old page every
   individual of the variants file had to be in the individuals file,
   and the PCA was locked until it was. On this page such an individual
   is unclassified, and the old PCA's locks of the individuals file do
   not hold.
4. **The page has no Undo and no notice.** The owner hid both on 8
   October 2026. The old PCA, when a change of a filter took its result
   off the screen, said so in a notice whose Undo brought it back. Here
   neither exists, and the PCA is the first calculation of the page that
   reads the filters, so what a threshold moved in the Variants tab does
   to a PCA shown, or running, has to be decided anew: question 3.
5. **The PCA's own filters beside the page's.** The owner decided on 9
   October 2026 that the PCA needs its own filters of missing data, LD
   and MAF, usually stricter than those of the other analyses. Whether
   they narrow the Variants tab's or replace them is question 1.

## The row of tabs

### What each tab holds

| tab | holds | greyed while |
|---|---|---|
| Variants | the plots of the variants and of the individuals with their thresholds, the box that leaves out the variants that failed the FILTER column of a VCF, and the download of the filtered variants, as the tab "Variants file" does today | never |
| Individuals | the table of the individuals file and how it was read, as the tab "Individuals file" does today | never |
| PCA | the PCA and the PCoA, below | no variants file is open: none was opened, it is being opened, or its opening failed |
| Populations | in this piece, "Not built yet: the diversity of each population, its site frequency spectrum and its LD decay come in a later version of the page." | the same as PCA |
| Distances | in this piece, "Not built yet: the distances between the populations, Hudson's Fst or Jost's D, come in a later version of the page." | fewer than two populations have an individual in the variants file, as the box of the individuals file counts them; or, once the individuals kept are known, fewer than two populations keep one |

"A variants file is open" is the moment the box of the variants file
shows its individuals and its ploidy, before the one pass ends; question
6 asks whether the PCA tab should wait for the end of that pass instead.
The Distances tab is greyed as well, of course, while no variants file is
open. The two counts of populations are those of the box of the
individuals file (`docs/designs/input-page.md`, "The counts per
population"); the unclassified are not a population here, since the
distances compare populations, and the owner decided that the
unclassified are one population only when no individual is classified.
A population that the thresholds of the individuals leave empty does not
count, once that is known; before the one pass ends, with a threshold of
the individuals on, the tab follows the count before the thresholds, and
a Distances that finds fewer than two populations will say so when it is
built.

The tab shown when the page opens is Variants, and the page never turns
to another tab by itself, as today. A tab that becomes greyed while it is
shown, the PCA tab when another variants file is being opened, stays
shown, greyed, and its content says why, the same words as the tooltip:
a page that moved the user away would lose what they were reading.

All five tabs stay drawn while another is shown, as the two tabs of the
files do today (`docs/designs/input-page.md`, "What a hidden tab
keeps"), so a turn to the Variants tab and back finds the PCA plot, its
turn in 3D, the sort of its table and the place it was scrolled to. The
3D view keeps its WebGL context while its tab is hidden, and costs no
work then: it draws again only when its data, its view or the size of
its box change, and a hidden box has no size (`createPca3d` of
`src/charts/pca3d.ts`). The input-page design had left one doubt, that
a hidden tab might hold a costly 3D plot. It does not: the plot of
9,381 individuals, the largest PCA a tab can calculate, holds for each
point three coordinates and a colour, four numbers of 4 bytes, about
0.15 MB, worked out from its size and not measured; the result itself is
in the cache whichever tab is shown.

### The names

The tabs are named Variants, Individuals, PCA, Populations and
Distances, the owner's words of 9 October 2026; the boxes keep "Variants
file" and "Individuals file". The row is read by a screen reader as
"Files and analyses", in the place of "The files". The PCA tab is named
PCA though it holds the PCoA too, since a user looking for either looks
for PCA; its heading inside says which method the result is of.

### At the width of a phone

The five labels, their margins and their gaps need about 460 px, an
estimate from the font of the page, 16 px, and the margins of the tabs,
12 px on each side, not measured. At 320 px, 288 px once the page's
margins are taken, they wrap to two lines, as the widget lets them today
(`src/ui/widgets/Tabs.module.css`, `flex-wrap`); the tab shown keeps its
bar under its label and the weight of its words, on whichever line it
is. Not taken: a row that scrolls sideways, which hides tabs the user
does not know are there; and a list in place of the tabs below a width,
a second control to build and test for the same thing. The browser
checks the wrapping at 320 px.

### The boxes, later

The owner wants the boxes to take less room, in a later piece. What
that would touch: the layout of the page and the two boxes
(`src/ui/variants/VariantsPage.tsx` and its CSS); what the box of the
variants file shows (`VariantsSummary.tsx`), and the box of the
individuals file with its table of counts (`IndividualsBox.tsx`), which
could move into the Individuals tab; the screen spec
`docs/specs/steps/popgen2-input.md` and the design
`docs/designs/input-page.md`, "The two boxes"; and the flows of
Playwright that read the boxes. Nothing in this piece depends on what
the boxes show, but for the counts of populations that grey the
Distances tab, which come from core and not from the box.

## A greyed tab, for every user

### What React Aria gives

React Aria's tabs are those of `react-aria-components` 1.21.1, read in
`node_modules` on 9 October 2026:

- **A tab given `isDisabled`** is drawn with the mark a screen reader
  reads as unavailable, `aria-disabled`, and is taken out of the
  keyboard: it is given no place in the order of the Tab key, and the
  arrow keys skip it (`useTab` and `TabsKeyboardDelegate` of
  `react-aria/dist/private/tabs/`). The mouse over it is not even
  noticed as hovering (`useHover` with `isDisabled`, in
  `react-aria-components/dist/private/Tabs.mjs`). So a keyboard user
  passes over it without a word, and its tooltip would show to the mouse
  alone, if at all.
- **A tab not disabled** takes from its props the description a screen
  reader reads after its name, `aria-describedby`, but not
  `aria-disabled`: the filter of its props lets through the names, the
  description and the `data-` attributes, and drops the rest
  (`filterDOMProps` of `react-aria/dist/private/utils/`). So a tab can
  carry the reason as its description, and cannot be marked unavailable
  through React Aria.
- **The tooltip**, React Aria's `TooltipTrigger`, gives its trigger the
  handlers of the mouse and of the focus through a context that the
  trigger has to read. A `Tab` is drawn by its `TabList` from the list
  of tabs it collects, so it was not certain that the context of a
  `TooltipTrigger` around a `Tab` reaches the tab as it is drawn. The
  architecture reviewer tried it on 9 October 2026, under node with
  jsdom, a page simulated with no browser: the tooltip of a tab not
  disabled showed when the arrow key reached it and went with Escape.
  The application's own tooltip, `WithTooltip` of
  `src/ui/widgets/Tooltip.tsx`, is built on it for buttons and links.
- **The arrow keys show each tab as they reach it** today. React Aria
  can instead have them move only the focus, Enter or Space then
  showing the tab (its setting `keyboardActivation`); the design keeps
  the arrows as they are.

### The options

- **(a) React Aria's disabled tab.** No code of ours. The tab is greyed
  and marked unavailable, and the keyboard never reaches it. The reason
  reaches a keyboard user only if the page writes it somewhere else
  too, a line under the row, "PCA and Populations need a variants file.
  Open one in the box Variants file.", which the owner did not ask for
  and which takes a line of the page while any tab is greyed.
- **(b) A greyed tab that the keyboard reaches and that does not open:
  taken.** The tab is not disabled for React Aria: it keeps its place
  among the arrow keys, its tooltip shows when the focus or the mouse
  rests on it, and the reason is its description. A choice of it, by
  click, Enter or the arrow keys, is not passed on: the widget asks
  whether the tab is greyed and keeps the tab shown as it was. The
  widget marks it unavailable itself, setting `aria-disabled` on the
  tab's element after each drawing, so that a screen reader says "PCA,
  tab, dimmed, 3 of 5" and then the reason. The arrow keys keep showing
  each tab they reach that is not greyed. On a greyed one the focus
  rests, and the content under the row stays that of the tab shown
  before, Variants for example; a screen reader says "selected" of
  Variants and not of the greyed tab, so the user can tell. What it costs: about thirty lines in `src/ui/widgets/Tabs.tsx`,
  and an attribute set outside React Aria, which a later release of
  React Aria could overwrite, and which a test of the widget checks. The
  same trial in jsdom found the choice of a greyed tab refused, the tab
  shown kept with the focus on the greyed one, the next arrow key
  showing the tab after it, and the attribute set by hand still there
  after React drew the tabs again; it is to be seen again in the
  browsers.
- **(b2) The same tab, built from React Aria's hooks**, `useTabList`
  and `useTab`, the functions the components are made of, with
  `aria-disabled` added to the props the widget gives the tab's
  element. Nothing is set outside React; what it costs is a widget of
  about a hundred lines that draws the list and the panels itself, in
  the place of React Aria's components. It is the way out if a release
  of React Aria drops the attribute of (b).
- **(c) A tab that opens and says why**, the option the owner set aside
  on 9 October 2026. No code, and no question of accessibility, since
  the reason is the content of the tab; but the user clicks into a tab
  that cannot do anything.

(b) is taken because it is what the owner asked for, a tab greyed with
its reason in a tooltip, and it leaves no user without the reason. (a)
would win if the owner preferred a line of text on the page to the
attribute set by hand. The owner's words of 9 October 2026 proposed (b).
(b2) would win over (b) if the browsers lose the attribute set by hand.

### What WCAG 2.2 asks, and how (b) meets it

WCAG 2.2, level AA, is the standard of accessibility the applications
meet. The success criteria that bear on a greyed tab:

- **4.1.2, Name, Role, Value**: that a tab is unavailable has to be
  known to a screen reader and not only seen. `aria-disabled` on the
  tab does it.
- **2.1.1, Keyboard**: what a mouse can learn, a keyboard has to reach.
  The tab keeps its place among the arrow keys, and its tooltip shows
  on the focus.
- **1.4.13, Content on Hover or Focus**: a tooltip has to be dismissable
  without moving the mouse or the focus, Escape; hoverable, the mouse
  can move onto it without its going; and persistent until then. React
  Aria's tooltip, and the widget's own if it is needed, do all three.
- **1.4.1, Use of Color**: greyed is a lighter colour of the label. It
  is not the only mark, since the tab shown is marked by a bar and the
  weight of its words and a greyed tab never has either, and a screen
  reader says "dimmed". The contrast of a control that is unavailable
  is exempt from 1.4.3, Contrast (Minimum).
- **1.3.1, Info and Relationships**: the reason is the tab's
  description, so a screen reader that reads the row without moving the
  focus reads it too.

The words of the reasons, each saying what is missing and what to do:

| tab | the reason |
|---|---|
| PCA, no variants file | "The PCA needs a variants file. Open one in the box Variants file." |
| PCA, a file being opened | "The PCA needs a variants file: panel.nei is being opened." |
| PCA, an opening that failed | "The PCA needs a variants file: panel.nei could not be opened. Open another in the box Variants file." |
| Populations | the same, with "The analyses of the populations need …" |
| Distances, no individuals file | "The distances between populations need at least two populations. Open an individuals file that assigns the individuals to them." |
| Distances, a file of fewer than two populations (popcat: the column of the populations of `panel_pops.csv`) | "The distances between populations need at least two populations, and popcat gives 1 among the individuals of panel.nei. Choose another column in the box Individuals file." |
| Distances, the filters leave fewer than two | "… and the filters keep individuals of 1 population. Loosen the filters of the individuals in the Variants tab." |
| Distances, no variants file | the words of the PCA, with "The distances between populations need …" |

The rule of which tab is greyed and why is a pure function of core,
from the project, the read of the variants file and the individuals kept
the store gives, so that it is tested in node with no browser; the
words are the screen's.

## The PCA tab

### What is taken from the old page

As the old panel has them, and `docs/specs/analyses/pca.md` says them:

- the method, "PCA of the genotypes" or "PCoA of the Kosman distances,
  for data with many missing genotypes", two radio buttons;
- the PCA's own filters of missing data, MAF and LD, each with the
  number fields of the Variants tab's thresholds, whose meaning question
  1 settles;
- the line of what it will run on, "200 individuals of panel.nei", or
  "111 of the 200 individuals of panel.nei, those the filters of
  individuals keep";
- Run, its bar and clock while it runs, with the line that says the bar
  stops while the components are calculated, and Stop;
- the result: the plot, in 3D first, as the owner decided on 28
  September 2026, and in 2D one button away, or in its place where the
  browser cannot draw 3D, with the words that say why; the components
  on each axis; "Colour the points by", the populations or any column of
  the individuals file but the names; the buttons that turn, tilt, zoom
  and look along an axis of the 3D view; the legend, whose entries
  highlight a population; the table of the explained variance; the
  table of the individuals with their coordinates, sortable; the
  warnings, no LD pruning, fewer variants than individuals, Lingoes'
  correction of the PCoA; the notes; and the downloads of the two
  tables as CSV;
- the module: its key, which holds the method and the filters the PCA
  is given and nothing of the individuals file, so that a change of the
  colours calculates nothing; its locks, but those of the individuals
  file; its request to the calculation worker, one pass for either
  method, as popnei says (`numPassesOf`), since no weights of the
  variants are asked for; its warnings; and the
  restart of the calculation worker after a PCA of more than 700
  individuals, which gives back the memory the decomposition took.

### What changes

- **The words.** "The Variants step" becomes "the Variants tab"
  throughout; the words that name the Undo of a notice go, since the
  page has neither; the words of the individuals file use
  "unclassified".
- **No lock by the individuals file.** The old PCA was locked while the
  individuals file was read, when its read failed, and when it lacked
  individuals of the variants file (`individualsNeeds` of
  `src/core/project.ts`). On this page the PCA never waits for that
  file: its key holds nothing of it, and the file colours the points
  only. While the file is read, or when it was refused, the points are
  of one group, "Unclassified", and the box of the individuals file says
  why. The page's definition of the PCA is the old one with `needs`
  given without those locks, listed for `popgen2.html` alone in
  `src/core/apps.ts`; the old page keeps its own.
- **The colours of the unclassified.** The individuals with no
  population are one group, "Unclassified", drawn as rings and last in
  the legend with their count, "Unclassified (7)", in the place of the
  old "No population"; with no individuals file, or no column chosen,
  every point is in it. They are in the PCA as every other individual,
  by the owner's decision of 9 October 2026: the unclassified enter the
  PCA, the filters and the download.
- **Run waits for the one pass.** Run is free only once the one pass
  of the file open has ended, the rule the download of the filtered
  variants already has (`downloadPlace` of
  `src/ui/variants/downloadState.ts`, which keeps the download waiting
  in every state of the pass but its end), so the page has one rule.
  While the pass runs, or is about to start, the reason beside Run is
  "Run once panel.nei is read to the end: the reading under way in the
  box Variants file and the PCA cannot run at once."; after a Stop of
  the pass, or a failure, "Run once panel.nei is read to the end: Start
  again its reading in the box Variants file." It is a lock of the
  screen and not of the module, since a module sees the project and not
  the calculations under way. The screen reads it from two places: the
  store's state of the one pass, and the code that starts the pass by
  itself (`src/ui/autoRuns.ts`), the only one that tells a pass stopped
  by the user from one about to start; read from the store alone, the
  lock would free Run for the instant before the pass starts, and the
  PCA could slip ahead of it. Since Run waits for the end of the pass,
  the box never offers Start again while a PCA runs.

  Two options were not taken. In the first, Run is free after a Stop of
  the pass when no threshold of the individuals is on, since the worker
  is then free and the individuals kept are known. But Start again,
  pressed while that PCA runs, would put the pass in the queue behind
  it, with a bar that does not move for minutes, so Start again would
  need a lock of its own. In the second, Run is free during the pass and
  the PCA waits in the queue. With a threshold of the individuals on,
  the store already handles that wait and shows the pass's bar
  (`startTarget` of `src/core/store.ts`); with none, the store, which
  has no state for a calculation that waits in the queue, would show the
  PCA "running" with a bar that does not move for as long as the pass
  lasts.
- **The downloads of case 3**: the coordinates in the form
  vavilov-explorer imports, and the plot, question 4.
- **The heading of the tab**, "PCA" or "PCoA" by the method, with the
  title of the result, "Principal components of panel.nei".

The module and the panel are shared by the two pages, and the changes
above are made by options of the page given to them, or by a second
definition for `popgen2.html`, so that the old page does not change. The
plan of the piece says which.

### The memory and the time

Measured on the old page on 29 September 2026, with popnei
`js-v0.1.0-dev.3`, in Chromium 153 and WebKit 26.6 on the owner's Apple
M5 Pro (`docs/specs/analyses/pca.md`, "How it runs"): a PCA of 1,000
individuals takes 0.31 s in Chromium and 1.21 s in WebKit; of 4,000, 16
s and 10 s, and 613 and 745 MB; of 9,381, the largest popnei calculates
in a tab, 205 s and 121 s, and 3.0 and 3.1 GB, WebKit the faster of the
two from 2,000 individuals. The PCoA takes a sixth to three tenths more
time than the PCA of the same individuals, and up to 3.4 GB. The LD pruning takes at least three fifths of a PCA
that prunes. In a first run of that day the PCoA of 9,381 individuals
grew WebKit by 4.10 GB. The page today runs popnei 0.2.2, and on this
page the PCA runs in the worker that has just made the one pass, whose
memory a wasm never gives back; so the plan measures the PCA and the
PCoA again, at 1,000, 4,000 and 9,381 individuals, after the one pass
of the same file, in Chromium and WebKit.

The result in the cache is at most 0.90 MB, at 9,381 individuals of
eight characters each.

## The invariants

The six of the designing skill (`.claude/skills/designing/SKILL.md`):

1. **A result is never shown stale.** Kept, if the owner answers
   question 3 as recommended there; changed otherwise, as that question
   says.
2. **The layers import as the coding skill allows.** Kept: the rule of
   the greyed tabs and the PCA's definition for this page in
   `src/core`, the tabs and the PCA tab in `src/ui`, the plots in
   `src/charts`.
3. **The project is one plain value, changed by commands.** Kept: the
   options of the PCA are in the project, as on the old page; the tab
   shown is state of the screen, which section 7 allows.
4. **`src/core` has no DOM and no React.** Kept.
5. **Two workers, one calculation at a time in each.** Kept: Run waits
   for the end of the one pass, and Start again is not offered once
   the pass has ended, so the page never puts a PCA and the pass in the
   queue together; the one case left, a download of the variants while
   a PCA runs, is question 5.
6. **A cancel ends its worker and starts another.** Kept: Stop of the
   PCA, as on the old page; the new worker opens the file again, which
   reads its header only.

What changes in the interfaces between the layers: the widget of tabs
of `src/ui` takes, for each tab, whether it is greyed and its reason;
the page's list of analyses, `POPGEN2_ANALYSES` of `src/core/apps.ts`,
gains the PCA, with `needs` without the locks of the individuals file;
and the colours of the PCA, `pcaColours`, name the unclassified, and
draw a result while the individuals file is being read, which the old
page's lock kept from happening (the comment of `coloursOf` in
`src/core/analyses/pca.ts` assumes it, and changes with the spec). The
messages of the workers and the plots do not change. The store changes
for question 3, whatever its answer: below.

## How it is tested, and what would prove it wrong

- **The greyed tabs**, in Vitest under node: the function of core gives
  each tab greyed, with its reason, for no file, a file being opened, a
  file that failed, an individuals file of one population, of two, and
  of two of which the thresholds empty one.
- **The tabs**, in Playwright, in Chromium and WebKit, the two engines
  that start on the owner's Mac: a greyed tab is reached with the arrow
  keys, shows its tooltip on the focus, hides it with Escape, does not
  open by click, Enter, Space or the arrow keys, and carries
  `aria-disabled` and its reason as its description; the five labels at
  320 px with no sideways scroll; axe, the checker of accessibility the
  tests run, with no finding. The owner and the session listen to the
  row with VoiceOver in Safari.
- **The PCA**, in Playwright: Run disabled while the one pass of a file
  runs and free at its end; the PCA of `panel.nei` with the LD pruning
  at r² 0.1 within 50,000 base pairs, 548 variants and the percentages
  of `docs/specs/analyses/pca.md`, "How it is verified", as popnei 0.2.2
  gives them under node; an individuals file opened after the PCA,
  which colours it with no calculation; an individual absent from the
  individuals file drawn as unclassified; a turn to another tab and
  back, the 3D view as it was turned. The flows of the old page's PCA
  are run again.
- **What would send the design back**: a screen reader that does not
  read a greyed tab as unavailable in Chromium, WebKit or VoiceOver
  with Safari, which the attribute set by hand might not survive; a
  release of React Aria that removes it; a 3D view that comes back from
  a hidden tab blank, or without its WebGL context in WebKit; a PCA
  whose Run, freed at the end of the one pass, still waits in the queue;
  a PCA left behind by a change of a filter that is not stopped.

## What is hard to undo

- **The names of the tabs**, once users know the page; a later
  renaming costs no data.
- **The options of the PCA on this page**, once `popgen2.html` saves a
  project file: if question 1 gives its own filters another meaning
  than the old page's, a file saved by one page would mean other
  filters on the other. Today the page saves nothing.
- **"Unclassified" in the legend and in the table of the
  individuals**, once users have pictures and notes with it; the CSV of
  the coordinates, by question 4, holds no population.

## The costs of the web

- **Memory of the tab.** A PCA of 9,381 individuals takes 3.0 to 3.4
  GB of the tab while it runs, and up to 4.10 GB once, the PCoA in
  WebKit, measured on the old page (above), not yet after the one pass; the worker is started again after a PCA of more than 700
  individuals, and the tab is then back to its size before the Run. The
  result holds at most 0.90 MB in the cache, and the 3D view about 0.15
  MB while its tab is hidden. The bound of 9,381 individuals is popnei's
  and locks the PCA beyond it, with its words.
- **The page frozen.** Nothing new runs on the page but the colours of
  the points, a walk over the individuals once per result and colouring,
  and the table, which draws only its rows in view, as on the old page.
- **Download size.** three.js, 134 KB gzipped, the first time a 3D view
  is drawn. The code of the PCA tab, its plots and its controls adds to
  the first load of `popgen2.html`, 278.6 KB gzipped on 9 October 2026;
  the build of the piece measures how much, and if it is more than 50
  KB, a bound the session set, about a fifth of that first load, the tab's code is loaded the first time the tab opens, as three.js
  is.
- **The browsers.** Nothing newer than the floor, Chrome 111, Firefox
  115 and Safari 16.4: WebGL 2 is in all three, and React Aria's tabs and
  tooltips are used on both pages already.
- **What GitHub Pages does not allow.** Nothing asked.
- **Accessibility.** The greyed tabs as above; the PCA's plot as on the
  old page, whose 3D view turns, tilts and zooms by buttons, and whose
  groups are told apart by 49 marks, seven colours by seven shapes, not by colour
  alone.
- **What is lost when the tab is closed or a worker restarts.** The
  PCA's result and its options with the page, which saves no project
  yet. A restart of the calculation worker, by Stop or after a large
  PCA, loses nothing but the open file, which it opens again from its
  header.

## The corrections made to the other documents

- `docs/use-cases.md`, "The order in which the cases are built", item 2:
  a sentence that points to this design.

The corrections of `docs/architecture.md`, sections 3, 5 and 7, and of
`docs/functionality.md`, section 5, wait for the owner's answers, and
are made on this branch once they come: what each answer changes is
said with it.

## What the session decided

Open to the owner's change once they try the page: the names of the
tabs; the greyed tab that the keyboard reaches, (b) above; a greyed tab
that stays shown when it becomes greyed; every tab kept drawn while
hidden, the 3D view with them; the labels wrapping at the width of a
phone; Run disabled until the one pass ends; the unclassified as one
group in the PCA; and the words of the reasons.

## Questions for the owner

### 1. The PCA's own filters

**Narrow those of the Variants tab, or replace them?**

- **(a) Narrow them: recommended.** The PCA reads what the Variants tab
  keeps, and its own filters remove more. For the missing data and the
  MAF, the PCA is given the stricter of the two thresholds, which is
  exactly both filters one after the other, since each judges a variant
  by itself; popnei takes one filter of each kind, so the two cannot be
  given as two. The Variants tab has no LD pruning, so the PCA's is the
  only one. It is the order of `docs/use-cases.md`, which has the user
  "look for clusters in what the filters kept". What it costs: a PCA
  looser than the Variants tab needs that tab loosened, which changes
  the download too; and when the Variants tab is the stricter, the field
  of the PCA shows a number that does nothing, so the panel says "The
  Variants tab keeps at most 0.05 already, stricter than 0.1."
- **(b) Replace them.** The PCA ignores the thresholds of the variants
  of the Variants tab, missing data, MAF and observed heterozygosity,
  and uses its own three; the FILTER box and the thresholds of the
  individuals still apply. A threshold moved in the Variants tab then
  never touches the PCA, which matters for question 3. What it costs:
  two sets of thresholds of the same statistics on one page, each with
  its own numbers; and a user who cleaned the file in the Variants tab,
  the observed heterozygosity of paralogues among it, has to clean it
  again for the PCA.
- **(c) Each filter follows the Variants tab until the user sets it
  for the PCA, and then replaces it**, the old page's rule, decided by
  the owner on 28 September 2026 and written in `docs/functionality.md`
  section 5. It is built: no code changes. What it costs: a mixture
  that each filter decides, which the panel has to spell out filter by
  filter, "As in the Variants step: 0.1".

(a) changes `pcaFilters` of `src/core/analyses/pca.ts` for this page,
and section 5 of `docs/functionality.md`; (b) the same; (c) nothing.

**Where the PCA's LD pruning starts.** Recommended: on, at r² at most
0.1, with the distance empty, so that Run waits until the user types a
distance or turns the pruning off, as step 2 of case 3 has the user do,
and by the owner's rule of no default that depends on the genome. The
option: off, with the warning on the result that no LD pruning was
applied, the old page's since 28 September 2026. The MAF and the missing
data of the PCA start with no threshold of their own.

**The individuals.** Recommended: always those the filters of the
Variants tab keep, with no thresholds of the PCA's own, as on the old
page; a bad sample removed there should not be in the PCA.

### 2. PCA and PCoA in one tab

Recommended: one tab, with the method as two radio buttons, as the old
page has it and as the owner's words of 9 October 2026 have it, "PCA or
PCoA". Both read the same variants and give results of the same shape,
so one plot and one table draw either. The PCoA's distance is Kosman's,
the only one popnei 0.2.2 gives for a PCoA of the variants
(`doPcoaFromVariants`, which is `calcPairwiseKosmanDists` and the
decomposition in one pass, with Lingoes' correction, which the
application always asks for, by the owner's decision of 28 September
2026). Another distance would be a request to popnei. The option: two
tabs, PCA and PCoA, a sixth tab for a choice that is one click.

### 3. A PCA when a filter changes

The PCA's key holds the filters it is given; under (a) or (c) of
question 1 a threshold moved in the Variants tab can change it, and under
any answer a threshold of the individuals can. What then?

Whatever the answer, the store changes for this page. The store, as
it is, answers such a change with a notice, a message for the screen
that names the results the change removed and the calculations it left
running for an Undo to come back to (`src/core/store.ts`). This page
draws no notice. So a PCA left running would go on out of sight, with
the calculation worker and up to 3 GB of the tab, until the next change
or a Run; and the words "removed because …", which the screen takes from
that notice, would go at the next change of any filter. Both
answers below give the store a setting of `popgen2.html` that makes no
notice; the paragraph "No notice on popgen2.html" of section 3 of
`docs/architecture.md`, section 5, and `docs/specs/core/store.md` are
revised for it, and the test of `src/ui/popgen2Store.test.ts` that
finds no notice after a change of a filter is kept true by it.

- **(a) The result leaves the screen, as the architecture has it:
  recommended.** The tab shows the options and Run, as before any
  run, with no words of why the plot went: the store cannot say which
  change removed it without a notice, and keeping that would be the new
  part of its interface that (b) costs. The result stays in the cache
  under its key, so setting the threshold back brings it back with no
  calculation. A PCA that runs when the change comes is stopped at once,
  by the setting above, since nothing on the page brings its key back
  but moving the threshold again. Invariant 1 is kept. What it costs: a
  user who nudges a threshold and comes back finds the plot gone with
  no word of why, and a large PCA costs its minutes again.
- **(b) The result stays, marked out of date, with Run again.** Above
  the plot, a warning that names what changed since it was calculated,
  "Calculated with the missing data at most 0.1; the Variants tab now
  keeps at most 0.05. Run again for the current filters.", and the
  downloads disabled until it is run again, so that no file of an old
  PCA leaves the page unmarked. A PCA that runs when the change comes
  finishes and is shown so. What it costs: it changes invariant 1. The
  store would keep, for each analysis, its last result shown and the
  inputs of its key, and give the screen that result with the inputs
  that differ, a new part of its interface (sections 3 and 5 of
  `docs/architecture.md`); a screen that forgot the mark would show an
  old PCA as current, which is the failure the invariant was made to
  prevent; and a PCA left behind is kept running, against the setting
  above, until it ends, a Stop or another Run.

(a) is recommended because it keeps a rule every analysis of both pages
relies on, and because it seldom bites: with (a) of question 1 the PCA
is given the stricter of each pair of thresholds, so a threshold moved
in the Variants tab changes the PCA only when it becomes stricter than
the PCA's own; with (b), never. (b) would win if the owner, trying the page, finds that the PCA
disappears too often as they move between the tabs.

### 4. What the results show, and what is downloaded, in this piece

Recommended, in this piece: the 3D view first and the 2D plot, the
components on each axis, the colours by population or by any column,
the legend, the table of the explained variance, and the table of the
coordinates, all as the old page has them; and the downloads of case 3:

- **The coordinates**, as a CSV whose first column holds the names of
  the individuals and whose other columns hold PC1 to PC10, the form
  vavilov-explorer imports (`docs/use-cases.md`, case 3). The old CSV
  had the population as its second column, which vavilov-explorer would
  read as a component; the population is in the individuals file the
  user already has. TSV and xlsx, which case 3 also names, later: the
  site has no writer of xlsx.
- **The plot**, as SVG and PNG, the 2D plot as drawn, or the 3D view as
  it is turned, with its legend, by the export functions that the
  scatter and the 3D view already have (`src/charts/export.ts`), never
  offered by a button until now.
- **The explained variance**, as a CSV, as on the old page.

Later: the lasso, which is vavilov-explorer's by the owner's decision of
5 October 2026; the weights of the variants, which no case asks for.

### 5. The cases of the page that the decisions leave open

- **A download of the filtered variants while a PCA runs.** The write
  would wait in the queue behind the PCA, in a dialog whose bar does
  not move. Recommended: the download button waits while a PCA runs,
  with the reason beside it, "Waits for the PCA to end; or stop it in
  the PCA tab.", as it waits for the one pass. The option: the write
  stops the PCA.
- **A PCA that runs while the user turns to another tab** goes on; the
  page's status region, which a screen reader reads aloud, says when it
  ends, "PCA of panel.nei calculated.", and the label of the tab does not
  change. Recommended; the option, a mark on the label while it runs,
  is a second sign of the same thing.
- **Another variants file opened** stops the PCA, as every opening stops
  the calculations of the file before; its options, the distance typed
  among them, are kept.
- **Another individuals file, or another column of the populations**,
  colours the points again, with no calculation.
- **Stop** in the PCA tab, as on the old page.

### 6. When the PCA tab opens

- **(a) As soon as the variants file is open: recommended.** The user
  can set the method and type the distance of the LD pruning while the
  one pass reads a large file, and sees why Run waits. What it costs: a
  tab that opens while its Run cannot run yet, for the length of the
  one pass, under a second for `panel.nei` and minutes for a file of
  millions of variants.
- **(b) Once the one pass has ended.** A tab opens only when it can
  run, which is the owner's rule taken to the letter, and the reason of
  the greyed tab says "The PCA can run once panel.nei is read to the
  end." What it costs: nothing can be set in the tab while the file is
  read.

The Populations tab follows the same answer.

### 7. The tabs not built yet

- **(a) Greyed by their real conditions, and once open, the line "Not
  built yet: …": recommended.** The owner can try now the rule that
  greys Distances, which depends on the individuals file, and the
  analyses fill the tabs later with no change of the frame.
- **(b) Always greyed, with the reason "Not built yet."** Simpler, and
  the user never opens an empty tab; the conditions of each are tried
  when its analysis is built.
