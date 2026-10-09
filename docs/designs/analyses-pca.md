# The tabs of the analyses, and the PCA, on popgen2.html

A design of 9 October 2026, approved by the owner on 9 October 2026
with the seven answers written under "What the owner decided", at the
end, and revised the same day for them; one point, Undo on this page,
is left open there. It decides how `popgen2.html` grows from two tabs,
one for each file, to a row of five, Variants, Individuals, PCA,
Populations and Distances; how a tab of an analysis that cannot run yet
is greyed out, for every user, the keyboard and the screen reader
included; how the PCA tab is made from the PCA of the old page,
`popgen.html`, which is built and was approved by the owner on 28
September 2026 (`docs/specs/analyses/pca.md`); and how every table and
every plot of the page offers its data and its image to download, from
the table and the plot themselves. The Populations and Distances
analyses come in later pieces; this one gives them their tabs. It serves
case 3 of `docs/use-cases.md`, "Look for clusters of individuals", the
second in the order of building there. It touches sections 3, 5 and 7
of `docs/architecture.md` and section 5 of `docs/functionality.md`,
whose corrections are listed under "The corrections made to the other
documents". The page as it is, two boxes and two tabs, is that of
`docs/designs/input-page.md`, accepted by the owner on 9 October 2026.
The old page gets none of this: it is to be retired.

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
  once those hold they open on one line, "Not built yet: …".
- The PCA tab is the PCA of the old page: PCA or PCoA, a Run button,
  the plot in 3D and in 2D, the legend by population, the table of the
  coordinates. Its Run waits until the one pass has ended, the one
  reading of the variants file that the page makes by itself when the
  file is opened.
- The PCA reads what the Variants tab keeps, and its own thresholds of
  missing data and MAF can only be stricter: each field of the PCA
  stops at the value of the Variants tab. Its LD pruning starts on at
  r² 0.1 with the distance empty, so Run waits for the user to type one
  or turn the pruning off.
- The PCoA is of the Kosman distances, corrected by Lingoes' method
  whenever no space can hold them, the one correction popnei 0.2.2 has;
  the result says how much of the variance lay in directions no space
  has, and how large the correction was.
- A change of a filter that changes what the PCA reads takes its result
  off the screen, and stops it if it runs. The result stays in the
  cache, so the filters set back as they were bring it back with no
  calculation. Whether `popgen2.html` gets its Undo back is left open.
- Every table and every plot of the page has a button "Download…" that
  offers its rows as CSV, and, for a plot, its image as SVG or PNG and
  its data as CSV. The table and the plot components carry it, so a new
  table or plot has it with no work of its screen. The CSV of the PCA's
  plot is the one vavilov-explorer imports: the names and PC1 to PC10.
- An individual the individuals file does not classify is drawn in the
  PCA all the same, as "Unclassified", and the PCA never waits for the
  individuals file: that file only colours the points.

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
   to a PCA shown, or running, had to be decided anew: the owner's
   answer 3.
5. **The PCA's own filters beside the page's.** The owner decided on 9
   October 2026 that the PCA needs its own filters of missing data, LD
   and MAF, usually stricter than those of the other analyses, which
   narrow the Variants tab's, and that the screen does not let a
   threshold of the PCA be looser than the Variants tab's.
6. **Every table and every plot downloadable.** The owner's principle of
   9 October 2026: the user can download the data of every table and
   every plot, and the image of every plot, built into the components
   of the tables and the plots, not added screen by screen. Today the
   page downloads none, and the old page offered a CSV here and there,
   each written by its own screen.

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
shows its individuals and its ploidy, before the one pass ends, as the
owner decided (answer 6): the user can set the PCA while a large file
is read, and Run waits for the end of the pass.
The Distances tab is greyed as well while no variants file is
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
  number fields of the Variants tab's thresholds, with the meaning of
  "The PCA's filters", below;
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
  correction of the PCoA; and the notes. The old panel's two buttons of
  CSV go: the tables and the plots offer their own downloads, below;
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
  vavilov-explorer imports, and the plot, from the plot itself (below,
  "Every table and every plot can be downloaded").
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

## The PCA's filters

The owner decided (answer 1) that the PCA's filters narrow those of the
Variants tab, and that the screen does not let a threshold of the PCA be
looser than the Variants tab's.

**What the PCA reads.** The variants and the individuals the Variants
tab keeps: its thresholds of the individuals, its FILTER box, its
thresholds of the missing rate, the MAF and the observed heterozygosity
of the variants; then the PCA's own missing data and MAF, and its LD
pruning, which the Variants tab does not have. popnei takes one filter
of each kind (`filterByMissingData` and `filterByMaf` of
`node_modules/popnei/dist/variant.d.ts`, a second of a kind is an
error), so for the missing data and the MAF the PCA is given one filter,
the stricter of the two thresholds. That is exactly the two filters one
after the other, since each keeps or drops a variant by its own value,
counted over the same individuals. The LD pruning comes last, as in the
fixed order of the filters (`docs/functionality.md`, section 3). The
individuals are always those of the Variants tab; the PCA has no
thresholds of its own on them.

**The fields.** Each of the PCA's missing data and MAF has two choices,
as on the old page, renamed: "As in the Variants tab: 0.1", and
"Stricter for the PCA", which shows its number field. The field takes a
number from 0 to the value of the Variants tab, or to 1 when the
Variants tab has that threshold off. A number above it is refused with
the line under the field the fields already give, "0.2 is more than the
0.1 of the Variants tab; the maximum proportion of missing genotypes for
the PCA stays 0.05.", and sends nothing. Chosen the first time,
"Stricter for the PCA" starts at the Variants tab's value, which keeps
the same variants until the user lowers it.

**When the Variants tab becomes stricter later.** The user sets the PCA's
missing data at 0.05, then lowers the Variants tab's to 0.03. The PCA is
given 0.03, the stricter. The field of the PCA shows 0.03, with the
line "The Variants tab keeps at most 0.03, stricter than the 0.05 set
here, so the PCA uses 0.03.", and the project keeps 0.05 as the PCA's
own: when the Variants tab goes back above 0.05, the PCA has its 0.05
again, with no command of the user. The field never shows a value
looser than what the PCA uses. Not taken: a command that lowers the
PCA's own value whenever the Variants tab goes below it, which would
change an option the user did not touch and lose their 0.05.

**When the Variants tab turns the threshold off.** Its bound goes to 1,
and the PCA's own value, 0.05, applies alone. "As in the Variants tab:
off" then means no filter of that kind for the PCA.

**The LD pruning** is the PCA's alone, on when the page opens, at r² at
most 0.1 with the distance empty, the owner's numbers of 27 September
2026 and the rule of no default that depends on the genome. While the
distance is empty Run is locked, with the reason beside the field and
beside Run, "The LD pruning of the PCA needs the distance within which
variants are compared. It has no default, because it depends on how far
linkage disequilibrium extends in the genome of your species. Type a
distance in base pairs, or turn the LD pruning off." The user can turn
it off, and the result then carries the warning that no LD pruning was
applied, as on the old page.

**The key.** The PCA's key holds the filters it is given, the stricter
of each pair, as on the old page it holds the filters the job carries
(`keyInputs` of `src/core/analyses/pca.ts`). So a threshold of the
Variants tab moved while the PCA's own is the stricter changes no key,
and the PCA stays on the screen.

**What changes in the code.** `pcaFilters` gives, for `popgen2.html`,
the stricter of each pair where the old page gives the PCA's in the
place of the step's; the options keep their shape, `{ follow, value }`
for each filter, with `follow` read as "As in the Variants tab". The
old page keeps its rule (`docs/functionality.md`, section 5).

## The PCoA and its correction

The owner decided (answer 2) one tab with a choice of method, and the
PCoA of Kosman's distance with the geometric fix. popnei 0.2.2 has one
such fix, Lingoes' correction, and none other: its declarations
(`node_modules/popnei/dist/pcoa.d.ts`) give `doPcoaFromVariants` with
the option `correctByLingoes`, `correctDistsByLingoes` for a
`Distances`, and `doPcoa`, which refuses distances that are not
Euclidean; no Cailliez correction, and no other distance between
individuals than Kosman's (`calcPairwiseKosmanDists`). So nothing is
asked of popnei, and the PCoA is that of the old page.

**What the correction does.** Distances are Euclidean when some space
holds points at those distances. Kosman distances between individuals
with missing genotypes often are not, since each pair is compared over
the variants both have called, and the matrix that a PCoA decomposes
then has negative eigenvalues, variance in directions that no space
has. Lingoes' correction (Lingoes 1971; R's ape, `pcoa` with
`correction = "lingoes"`) adds twice c, the most negative eigenvalue in
absolute value, to the square of every distance between two different
individuals; every eigenvalue but the 0 of the centering rises by c, so
none is negative. popnei applies it inside the PCoA, in its one pass,
when asked; the application always asks, as the owner decided on 27
September 2026.

**How it shows in the result.** popnei gives two numbers beside the
components: `negativeEigenvaluesPercent`, the share of the variance of
the distances that lay in the negative eigenvalues before the
correction, and `lingoesConstant`, c. On `panel.nei` with the PCA's LD
pruning at r² 0.1 within 50,000 base pairs, 7.87% of the variance lay
there, and the correction added 0.047 to every squared distance, 53% of
their mean (`docs/specs/analyses/pca.md`, "The warnings"). The panel
shows them in the warning of the old page, which says what the
correction does to the plot, the nearest individuals moved apart the
most; and under the table of the explained variance, which is of the
corrected distances. A PCoA whose distances needed no correction says
so instead.

## When a filter changes

The owner decided (answer 3) that a change of a filter that changes
what the PCA reads, its key, takes the result off the screen, as the
architecture has it for every analysis (section 3). The tab then shows
its options and Run, as before any run. The result stays in the cache
under its key, so setting the filters back as they were brings it back
with no calculation.

The store changes for this page. As it is, it answers such a change
with a notice, a message for the screen that names the results the
change removed and the calculations it left running for an Undo to come
back to (`src/core/store.ts`). This page draws no notice. So a PCA left
running would go on out of sight, with the calculation worker and up to
3 GB of the tab, until the next change or a Run. The store gains a
setting of `popgen2.html`, given where the page makes it
(`src/ui/popgen2Store.ts`), under which a change makes no notice and
stops at once every calculation it leaves behind. A PCA stopped so is
gone: moving the threshold back starts nothing, and Run is pressed
again. The tab says nothing of why the plot went, since without the
notice the store does not know which change removed it; the change was
the user's own, the owner's rule of 8 October 2026 for this page.
Whether the page gets its Undo back, which would bring the result back
and could keep a PCA running for it, is the open point at the end.

## Every table and every plot can be downloaded

The owner's principle of 9 October 2026: the user can download the data
shown in every table and every plot, built into the components of the
tables and the plots and not added screen by screen.

### The control

Each table and each plot has one button, "Download…", above its top
right corner, beside its caption or title, that opens a menu, React
Aria's `MenuTrigger` and `Menu`, wrapped once in `src/ui/widgets/` as
the other controls are. A table's menu holds "Table as CSV"; a plot's,
"Image as SVG", "Image as PNG" and "Data as CSV". The button is named,
for a screen reader, with what it downloads, "Download the plot of the
missing rate of the variants", from the title the table or the plot
already carries, so that the five buttons of a tab are not five
"Download". The keyboard reaches it with the Tab key; Enter, Space or
the arrow down opens the menu, the arrows move in it, Enter chooses,
Escape closes it and gives the focus back to the button. A choice
starts the download at once, with no dialog, and the status region says
"panel.missing_rate_variants.csv downloaded." One button and a menu, and
not three buttons, so that a plot of a phone's width keeps its room.

The file is named from the variants file and what is downloaded,
`panel.pca.csv`, `panel.pca.svg`, `panel.individuals.csv`, with no
date, as the old page named its files.

### The CSV of a table

- **Its rows**, every one and not only those drawn on the screen, which
  the sortable table limits to the rows in view; in the order shown,
  sorted as the user sorted them; its columns in their order, the
  header the labels of the columns.
- **The values as stored, not as shown**: a number as JavaScript writes
  it in full, `-0.71388462`, where the table shows "−0.7139"; the
  point as the decimal mark, whatever the decimal mark of the file the
  value came from, since a CSV of commas as separators cannot hold the
  comma as a decimal mark unquoted; the hyphen as the minus sign; an
  empty cell for a missing value. A user who opens it in a spreadsheet
  gets numbers, not text.
- **The names as written**, in the user's own spelling, with the rules
  every CSV of the application has (`csvField` of
  `src/core/analyses/words.ts`): a field that holds a comma, a quote or
  a new line between double quotes, each quote doubled, as RFC 4180,
  the common rule of CSV files, has it; and a name that starts with
  "=", "+", "-" or "@" with a quote, ', before it, so that a spreadsheet
  does not run it as a formula.

So the component is given, for each cell, the value it stores beside
the text it shows; the sortable table, `SortableTable.tsx`, holds the
texts only today (`cells: readonly string[]`), and gains the values.

### What a plot offers

- **Its image**, by the export the plots already have
  (`src/charts/export.ts`, the handle's `exportSvg` and `exportPng` of
  `plot2d.ts` and `pca3d.ts`): the plot as drawn, in the colours of the
  light theme, with its legend and with no mark of the point under the
  mouse; the 3D view as it is turned. The line of a threshold, today a
  control of the screen laid over the histogram, is not in the export;
  the plot is given the threshold to draw it into the image, since an
  image of a filter with no line would mislead.
- **Its data**, as CSV, by the rules of a table: for a histogram, a row
  per bin as the plot draws it, its left edge, its right edge and its
  count, the bins the plot adds up from popnei's fine bins; for the
  histograms of the individuals, the bins core makes, and the
  individuals with no heterozygosity, which the plot counts apart, in a
  last row with empty edges. For the PCA's plot, in 2D and in 3D, the
  coordinates of case 3: the first column the names of the individuals,
  headed `individual`, and one column for each component, PC1 to PC10,
  every component kept and not only those drawn, so that
  vavilov-explorer imports it (`docs/use-cases.md`, case 3). The
  population is not among them: vavilov-explorer would read it as a
  component, and it is in the individuals file and in the CSV of the
  PCA's table, which has it.

A plot component makes its CSV from the data it is given, unless its
screen gives it a fuller table, as the PCA's does with the ten
components where the plot draws two or three. The plots of `src/charts`
do not change but for the threshold drawn into the image: the menu and
the CSV are in their React wrappers of `src/ui`.

### Which components and which screens

| component | screens of `popgen2.html` that get it in this piece |
|---|---|
| `src/ui/widgets/SortableTable.tsx` | the table of the individuals file, the Individuals tab; the table of the PCA's individuals |
| `src/ui/widgets/Table.tsx` | the counts per population of the box of the individuals file; the PCA's explained variance |
| `src/ui/widgets/HistogramPlot.tsx`, over `src/charts/histogram.ts` | the six histograms of the Variants tab |
| the PCA's 2D plot and 3D view, `src/ui/analyses/pca/ScatterPlot.tsx` and `Pca3dView.tsx` | the PCA tab |

All the tables and plots of the page, since they are few. The old page,
`popgen.html`, gets none of it, since it is to be retired; its own
buttons of CSV stay as they are, and where it shares a component with
this page the download is an option of the component that the old page
does not set.

## The invariants

The six of the designing skill (`.claude/skills/designing/SKILL.md`):

1. **A result is never shown stale.** Kept: a change of what the PCA
   reads takes its result off the screen (answer 3).
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
   queue together; and the download of the filtered variants waits
   while a PCA runs (answer 5).
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
messages of the workers do not change. Three more: the store's setting
of `popgen2.html` that makes no notice and stops a calculation left
behind (answer 3); the components of the tables, which take the stored
value of each cell beside its text, and the React wrappers of the plots,
which take the name of what they download and, for the PCA, the fuller
table of its CSV (answer 4); and the histogram of `src/charts`, which
takes the threshold to draw into its exported image.

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
- **The downloads**, in Vitest for the CSV each component makes, from
  values with commas, quotes, new lines, a leading "=", missing values
  and negative numbers, and the PCA's CSV checked against the header
  vavilov-explorer reads; in Playwright, each menu by the keyboard
  alone, a file of each kind saved and read back, the SVG of a
  histogram with its threshold's line, and axe with no finding.
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
  project file: its own filters mean "stricter than the Variants tab"
  here and "in the place of the step's" on the old page, so a file saved
  by one page would mean other filters on the other. Today the page
  saves nothing.
- **The forms of the files downloaded**, the columns of each CSV and the
  names of the files, once users have scripts that read them; the CSV
  of the coordinates above all, which vavilov-explorer reads.
- **"Unclassified" in the legend and in the table of the
  individuals**, once users have pictures and notes with it; the CSV of
  the coordinates holds no population.

## The costs of the web

- **Memory of the tab.** A PCA of 9,381 individuals takes 3.0 to 3.4
  GB of the tab while it runs, and up to 4.10 GB once, the PCoA in
  WebKit, measured on the old page (above), not yet after the one pass; the worker is started again after a PCA of more than 700
  individuals, and the tab is then back to its size before the Run. The
  result holds at most 0.90 MB in the cache, and the 3D view about 0.15
  MB while its tab is hidden. The bound of 9,381 individuals is popnei's
  and locks the PCA beyond it, with its words.
- **The page frozen.** A CSV of a table is written on the page from
  the values it holds, all its rows: 10,000 rows of 20 columns, the
  largest table of the tests, is 200,000 fields, a few tenths of a
  second by its size, not measured, which the plan measures, and moves
  to the light worker if it freezes the page longer. Nothing else new
  runs on the page but the colours of the points, a walk over the individuals once per result and colouring,
  and the table, which draws only its rows in view, as on the old page.
- **Download size.** three.js, 134 KB gzipped, the first time a 3D view
  is drawn. React Aria's menu, which the page does not use yet, adds to
  its first load; the build measures it with the rest. The code of the PCA tab, its plots and its controls adds to
  the first load of `popgen2.html`, 278.6 KB gzipped on 9 October 2026;
  the build of the piece measures how much, and if it is more than 50
  KB, a bound the session set, about a fifth of that first load, the tab's code is loaded the first time the tab opens, as three.js
  is.
- **The browsers.** Nothing newer than the floor, Chrome 111, Firefox
  115 and Safari 16.4: WebGL 2 is in all three, and React Aria's tabs and
  tooltips are used on both pages already.
- **What GitHub Pages does not allow.** Nothing asked.
- **Accessibility.** The greyed tabs as above; the menus of the
  downloads by React Aria, each button named by what it downloads; the PCA's plot as on the
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
- `docs/functionality.md`, section 5: a paragraph on `popgen2.html`,
  whose PCA's filters narrow those of the Variants tab, and its LD
  pruning on with no distance; and section 2, "Everything leaves the
  application", the owner's principle of the downloads built into every
  table and plot.
- `docs/architecture.md`, sections 3 and 7: a paragraph "What was
  revised on 9 October 2026" at the end of each, the store's setting of
  `popgen2.html` that makes no notice and stops a calculation left
  behind, and the downloads carried by the components of the tables and
  the plots.

Left for the plan of the piece, which changes them with the code:
`docs/specs/core/store.md`, which says the store gives that page no
notice; `docs/specs/analyses/pca.md`, for the rules of this page; and the
comment of `coloursOf` in `src/core/analyses/pca.ts`.

## What the session decided

Open to the owner's change once they try the page: the names of the
tabs; the greyed tab that the keyboard reaches, (b) above; a greyed tab
that stays shown when it becomes greyed; every tab kept drawn while
hidden, the 3D view with them; the labels wrapping at the width of a
phone; Run disabled until the one pass ends; the unclassified as one
group in the PCA; the PCA's own value kept when the Variants tab goes
below it; one button "Download…" with a menu; the CSV of the stored
values with the point as the decimal mark; the threshold's line drawn
into the image of a histogram; and the words of the reasons.

## What the owner decided

On 9 October 2026, approving the design:

1. **The PCA's filters narrow those of the Variants tab**, as the draft
   recommended, over replacing them and over the old page's rule, each
   filter following the step until set and then replacing it; and the
   screen does not let a threshold of the PCA be looser than the
   Variants tab's, the owner's addition. With it, as recommended: the LD
   pruning on at r² 0.1 with the distance empty, and the individuals
   always those of the Variants tab ("The PCA's filters").
2. **PCA and PCoA in one tab**, with a choice of method, and the PCoA of
   Kosman's distance with the geometric fix, which is Lingoes'
   correction, the one popnei 0.2.2 has ("The PCoA and its
   correction").
3. **A change of a filter takes the PCA's result off the screen**, as
   recommended, over keeping it marked out of date; the owner added
   "remember that for that the user has the undo possibility", which
   leads to the open point below ("When a filter changes").
4. **Every table and every plot can be downloaded**, its data, and a
   plot's image, built into the components and not screen by screen,
   the owner's principle, which replaces the draft's list of the PCA's
   downloads; the CSV of the PCA's coordinates stays the one
   vavilov-explorer imports ("Every table and every plot can be
   downloaded").
5. **The cases left open**, as recommended: the download of the filtered
   variants waits while a PCA runs, "Waits for the PCA to end; or stop
   it in the PCA tab."; a PCA goes on while the user turns to another
   tab, and the status region says when it ends, "PCA of panel.nei
   calculated."; another variants file stops it and keeps its options;
   another individuals file or column colours it again with no
   calculation; Stop in the PCA tab.
6. **The PCA tab opens as soon as the variants file is open**, as
   recommended, over once the one pass has ended; the Populations tab
   follows it.
7. **The tabs not built yet** are greyed by their real conditions, and
   once open say "Not built yet: …", as recommended, over always greyed.

## Open point: Undo on popgen2.html

The owner's answer 3 counts on Undo to bring a removed result back.
`popgen2.html` has none: the owner hid its row and its keys on 8
October 2026 (`docs/plans/filters.md`). The store still keeps the
history, and the row is ready to draw again. The session has asked the
owner; until the answer, the removal is built as above, which works
either way.

- **(a) Undo and Redo back on the page with this piece.** The row of
  the two buttons, and their keys, Ctrl+Z, Ctrl+Y and Cmd+Shift+Z,
  drawn again, as they were built on 8 October 2026. An Undo after a
  change that removed the PCA gives back the filters, and the result
  from the cache with no calculation. A PCA that ran when the change
  came could be kept running for an Undo, as the old page does, rather
  than stopped at once, which brings back the notice or something in
  its place to say that it runs. What it costs: the row the owner hid;
  the keys taken from the browser's own; and, if a run is kept for an
  Undo, the setting of answer 3 changes.
- **(b) No Undo.** The filters set back by hand as they were give the
  key back, and the cache gives the result back with no calculation; a
  PCA stopped by the change is run again. What it costs: the user has
  to remember the values they changed, and a PCA of minutes stopped by
  a slip is run again.

Nothing of this piece prevents either answer.
