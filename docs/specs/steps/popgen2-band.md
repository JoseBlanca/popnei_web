# popgen2.html: the band of what the page is doing

The screen spec of the band at the top of `popgen2.html`: one line that
stays at the top of the window while the page scrolls and says what the
application is doing, the reading of the variants file with its
percentage and its Stop, the PCA running with its clock and its Stop,
the PCA about to start again by itself, a Stop under way; that points
to a warning or an error of the PCA while another tab is shown; and
that shows the errors of the application's own code, in the place of
the error bar. The owner proposed it on 10 October 2026, and agreed the
same day to the session's recommendation to build it with the removal
of Undo (`docs/plans/analyses-pca.md`, its last paragraph), since a PCA
that starts by itself, `docs/designs/no-undo.md`, can start while the
user is in another tab and does not see the PCA's own bar. It adds a
part to the screen and changes no invariant of `docs/architecture.md`,
whose section 7 gives it its place ("The band of `popgen2.html`").
Written on 10 October 2026, before any code, and approved by the owner
the same day, with its open point answered otherwise than recommended:
the band is always at the top of the window and carries the page's
name, "Popnei", the heading of the page, with what is running after it
(below, "Open points"). Its plan is `docs/plans/no-undo.md`.
Built on the branch `pca-tab` on 10 October 2026 (work package 5 of
that plan), and not yet tried by the owner. Its reviews changed it:
"Popnei" alone while nothing runs, as the owner had decided; "Stop
recalculating" only while the PCA is about to start, and no control of
the PCA while the PCA tab is shown; the one pass named as its box
names it; an error band that scrolls with the page, brought into view
when it comes, with the focus given to the heading when the jump
leaves it out of the window, and held while a dialog is open.
Its part for several live analyses was built on the branch
`population-tab` on 11 and 12 October 2026 (work package 4 of
`docs/plans/population-tab.md`), and not yet tried by the owner. Its
reviews changed it: Stop all alone beside an analysis about to start
on a narrow window (the owner's choice of 12 October 2026); a Stop
keyed by the analysis it stops, so that the focus never passes to
another's; the narrow form decided in one place, under 45 em; the line
that wraps, its words never cut but the file's name; another analysis
about to start shown over a Stop under way.

Revised on 11 October 2026 for `docs/designs/population-tab.md`,
approved by the owner that day with the recommendations of its two open
points, which brings the diversity of the Populations tab as a second
analysis calculated again by itself
(`docs/specs/steps/popgen2-populations.md`): the line names the
diversity as it names the PCA, says which analyses wait after the one
running or are about to start together, and gains "Stop all" whenever
two or more analyses are live and one of them runs, waits or is about
to start; the link points to the first result of the order
of the tabs that has warnings or failed. The words of an analysis about to
start follow its tab's line from that day, which says no "again", since
an analysis whose Run waited behind another and was then stopped never
ran: "The PCA starts in a moment", and after a crash "The PCA starts
after the next change". The section "Several live
analyses", below, says so; the tables of "The line", of the short forms
and of "Its words" gain their rows. Approved by the owner on 11 October 2026; not yet built; its plan is
`docs/plans/population-tab.md`.

It reads what the other specs of the page give, and repeats none of
it:

- the PCA started by itself, its live state, its quiet second and its
  Stop: `docs/specs/steps/popgen2-pca.md`, "The PCA calculated again by
  itself";
- the one pass, its bar and its Stop in the box of the variants file:
  `docs/specs/steps/popgen2-input.md` and `popgen2-filters.md`;
- the write of the filtered variants and its dialog:
  `docs/specs/steps/popgen2-download.md`;
- the error bar, whose words and buttons it takes over on this page:
  `docs/specs/shell.md`, "The error bar", and `docs/specs/entry.md`,
  "The errors nothing else shows";
- the state of each analysis and the calculations in flight:
  `docs/specs/core/store.md`.

## The terms

- **The one pass** is the reading of the variants file that the page
  starts by itself when the file is opened, which gives the plots of
  the Variants tab; the box of the variants file shows its bar and its
  Stop.
- **The calculation worker** is the second thread of the tab where
  popnei runs, one calculation at a time. A Stop ends it and starts
  another, which loads popnei and opens the variants file again before
  it can calculate anything (`docs/architecture.md`, section 5).
- **Live**, **the quiet second** and **about to start** are those of
  `popgen2-pca.md`: the PCA is live once its Run has been pressed for
  the file, and is then calculated again by itself a second after the
  user stops changing what it reads; about to start is that second.
- **An error of the application** is an error of the page's own code
  that no part of the screen shows, which the error bar of
  `popgen.html` shows at the top of the page, kept by the log of the
  errors, `src/ui/defects.ts`.
- **The status region** is a line of the page that is not seen and
  that a screen reader speaks, without moving the focus, each time its
  words change (`docs/specs/shell.md`, "The status region"). **An
  alert** is the same for words that interrupt the user.
- **The focus** is the control the keys act on; **the Tab key** moves
  it from one control to the next.
- **A root** is a part of the page that React draws on its own; the
  page has two, `#root`, the application, and `#defects`, a strip above
  it that the error bar of `popgen.html` is drawn in, so that it stays
  when an error empties the first. **The worker client** is the code of
  the page that talks to the two workers (`src/worker/client.ts`); it
  calls `onPopneiReady` each time the calculation worker has started,
  loaded popnei and opened the variants file again. **`runs`** is the
  list of the calculations under way that the store gives the screens.
  **`stoppedAwaitingWorker`** of the store's state, new, names the analysis whose
  Stop waits for the calculation worker to start again (below,
  "Stopping").
- **The tab shown** is the one of the five tabs under the boxes,
  Variants, Individuals, PCA, Populations or Distances, whose content
  is on the screen.

## What it shows

### Its place

The band is the line of the page's heading, and stays at the top of
the window always, as the owner decided on 10 October 2026: "Popnei",
the page's heading, an `<h1>`, at its left, and after it, on the same
line, what the page is doing, with its Stop or its link, when there is
something to say; while nothing runs it shows "Popnei" alone, and reads
as the page's heading. With Undo and Redo gone, nothing else sits on
that line. The heading moves into the band from the line above the two
boxes, where it stood until 10 October 2026, so the page has one line
at its top and not two. The band spans the width of the window, its
words in the column of the page, 48 rem at most and aligned with it,
with the page's background and a border under it. Its height is that
of the heading with its margins, the same whether or not it has
anything to say, so that nothing under it moves when it starts or stops
saying something: a PCA that starts by itself a second after the user
let go of a slider would otherwise push the slider from under the
pointer. That height, measured by the flows of work package 5 of
`docs/plans/no-undo.md` on 10 October 2026, on the built site in
Chromium 153 and WebKit 26.6 on the owner's Mac, is 51 px, at 1280 and
at 320 px wide, with "Popnei" alone, with words, with words and a Stop
or Stop recalculating, and with the link; the top of the two boxes
stays at 67 px of the page in each. The one exception
to "nothing moves" is an error of the application, whose line takes a
second line of the band under the heading and pushes the page down when
it comes ("An error of the application", below): an error is rare and
asks the user to reload.

At 320 px, "Popnei" and one line of status share the line: the heading
keeps its words whole at its left, and the status takes the rest, its
words in a short form that fits with its button, the whole words given
to a screen reader:

| the words at 1280 px | the short form, under 45 em wide |
|---|---|
| "Statistics of panel.vcf.gz · 45%" | "Statistics · 45%" |
| "PCA running · 1:20" | "PCA · 1:20" |
| "Writing panel.filtered.vcf.gz · 45%" | "Writing · 45%" |
| "Stopping the PCA…" | "Stopping…" |
| "The PCA starts in a moment" | "PCA soon" |
| "The PCA starts after the download" | "PCA later" |
| "The PCA starts after the next change" | "PCA later" |
| "PCA: 2 warnings, in the PCA tab" | "PCA: 2 warnings" |
| "PCA: could not be calculated, in the PCA tab" | "PCA: failed" |
| "Diversity running · 0:12" | "Diversity · 0:12" |
| "PCA running · 1:20 · then the diversity" | "PCA · 1:20" |
| "Stopping the diversity…" | "Stopping…" |
| "The diversity starts in a moment" | "Diversity soon" |
| "The diversity starts after the next change" | "Diversity later" |
| "The diversity starts after the download" | "Diversity later" |
| "The PCA and the diversity start in a moment" | "Analyses soon" |
| "The PCA and the diversity start after the download" | "Analyses later" |
| "Diversity: 2 warnings, in the Populations tab" | "Diversity: 2 warnings" |
| "Diversity: could not be calculated, in the Populations tab" | "Diversity: failed" |

"PCoA" in place of "PCA" under the PCoA. The flows check that each fits
one line at 320 px with "Popnei" and its button, the whole "Stop
recalculating" among them: so that it fits, under 45 em the heading
"Popnei" is in the large text of the page, `--text-lg`, and the parts
of the line stand a quarter of a rem apart, which leaves 73 px for the
words beside "Stop recalculating" in Chromium 153 and WebKit 26.6 on the
owner's Mac; "PCoA soon" takes 71 px there (measured on 10 October
2026). From 12 October 2026, the review of work package 4, the short
forms hold under 45 em, where they held under 30 em until then
(44 em until the second review, the same day, "The layout"), and
the buttons of the band have a quarter of a rem of padding at their
sides there, where they had three quarters ("The layout").

It stands below the page's popovers, tooltips and dialogs in the order
in which they cover one another, so that a menu or a tooltip near the
top of the window is drawn over the band and not under it.

It is drawn in the page's second root, `#defects`, where the error bar
was, so that it stays, with the page's heading and what happened, when
an error has emptied the application's root. A defect of our code met
while the band works out or draws its line after the heading empties
that line alone: the heading stays, and the defect is shown in the line
of an error, which is worked out from the log of the errors alone, as
every later error is.

It stays at the top of the window in every state but one: while an
error of the application is shown it scrolls with the page, so that it
never covers the window ("An error of the application", below).
Printed, it stands at the top of the first page, in the flow of the
page, and not over the top of every page.

### The line

After "Popnei", the line says one thing, the first of this list that
holds; an error of the application, when there is one, takes a second
line of the band under it (below, "An error of the application").

| what holds | the words | the control after them |
|---|---|---|
| the one pass is running | "Statistics of panel.vcf.gz · 45%", the share of the bytes of the file read so far, from the progress of the pass; "Statistics of panel.vcf.gz" until its first progress; named as the box names the pass, "Calculating the statistics of panel.vcf.gz…" | Stop |
| the one pass is about to start by itself, after the file is opened or at Start again, the moment the box shows its Stop for it (`docs/architecture.md`, section 5) | "Statistics of panel.vcf.gz" | Stop, which keeps it from starting, as the box's does |
| the PCA is running, started by Run or by itself | "PCA running · 1:20", the time since it started, minutes and seconds, as the clock of the PCA tab; "PCoA running · 1:20" under the PCoA | Stop |
| the filtered variants are being written | "Writing panel.filtered.vcf.gz · 45%", the name the dialog of the download shows | none: the dialog has the Stop, and keeps the band out of reach while it is open |
| a Stop of the PCA or of the one pass is under way (below, "Stopping") | "Stopping the PCA…", "Stopping the PCoA…"; "Stopping the statistics of panel.vcf.gz…" | none |
| the PCA is about to start | "The PCA starts in a moment"; "The PCoA starts in a moment"; while the dialog of the download holds it, "The PCA starts after the download", shorter than the tab's "The PCA starts again when the download is written or closed." (`popgen2-pca.md`, "Its words"; "Its words" below); held after a crash of the calculation worker ended another live analysis, "The PCA starts after the next change", the first words of the tab's line, "The PCA starts after the next change of the filters or of its options, or when Run is pressed." | Stop recalculating, the PCA tab's |
| the PCA has a result with warnings, and the PCA tab is not the tab shown | "PCA: 1 warning, in the PCA tab"; "PCA: 2 warnings, in the PCA tab"; "PCoA: …" under the PCoA; the words are a link | none |
| the PCA could not be calculated, and the PCA tab is not the tab shown | "PCA: could not be calculated, in the PCA tab"; "PCoA: …"; a link | none |
| none of these | nothing after "Popnei" | none |

While the PCA is live and nothing runs, nor is about to start, the band
shows "Popnei" alone, as the owner decided on 10 October 2026: the line
says what the page is doing, and a PCA kept up to date does nothing
until the next change. The PCA tab keeps its own "Stop recalculating"
then, live or not about to start, so that the automatic runs are ended
there with no time limit (`popgen2-pca.md`, "Stop"); the band offers it
only within the quiet second, when the PCA is about to start and the
user may be in another tab.

While the PCA tab is shown, the band keeps its words about the PCA,
running or about to start, and drops their Stop and Stop recalculating,
as it drops the link: the tab shows the same buttons under its options,
and two buttons of the same words on one screen would leave the user
asking which to press. The Stop of the one pass stays, since the box of
the variants file is not in that tab.

Only one calculation runs at a time in the calculation worker, so at
most one of the first three holds. A running calculation wins over a
Stop under way, since the next calculation after a Stop waits for the
new worker and is what the user waits for; a Stop under way wins over
the PCA about to start, which a Stop ends anyway; and anything under
way wins over the link, which is about a result already there. Another
analysis about to start wins over a Stop under way: after the band's
Stop of the PCA, with the diversity live and waiting, the band says
the diversity about to start, with its Stop recalculating, and not
"Stopping the PCA…" with no button, so that the diversity can be
stopped from any tab within the quiet second the Stop starts again
(WCAG 2.2.1; the review of work package 4, 12 October 2026).

The name of the file is the variants file's own name, as its box shows
it. When the line is too narrow for it, at 320 px with a long name, the
name is cut at its end with "…", and the percentage, the clock and the
Stop stay whole; a screen reader is given the whole name.

**Stop** in the band does what the Stop it stands for does elsewhere,
and nothing more: for the one pass, the Stop of the box of the variants
file, after which the box offers Start again; for the PCA running,
the Stop of the PCA tab, which ends the run and the
live state, so that nothing starts again by itself until Run is
pressed in the PCA tab (`popgen2-pca.md`, "Stop"). **Stop recalculating**
in the band, while the PCA is about to start, is the PCA tab's: it ends
the live state, so that the PCA does not start. Each is said in the
status region as that Stop is said, so that a user who pressed it in
the band hears what happened in a tab they do not see: "PCA stopped.
Press Run in the PCA tab to calculate it again."

**Stopping.** A Stop ends the calculation worker at once, and the line
"Stopping the PCA…" stays from the Stop until the calculation worker
started again has loaded popnei and opened the variants file again,
which the worker client tells the page by calling its `onPopneiReady`
again (`docs/specs/worker/client.md`); until then a Run waits. The band
cannot read it from `runs`: the client settles a cancel at once, and
the request leaves `runs` a moment later, before the page is drawn
again. So the store holds it, as the source of both events: its state
gains `stoppedAwaitingWorker`, the id of the analysis whose calculation in flight
`cancelRun` stopped, set at that `cancelRun`, and `null` again at the
next `popneiReady`, at a `startRun`, at an `open` and at a change of the
load (`docs/specs/core/store.md`, "Stopping"). `popneiReady` with the
same version, which changed nothing until now, then gives a new state
and calls the listeners. Whichever Stop the user pressed, the box's,
the tab's or the band's, the store sets it. A request that waited in
the client's queue restarts no worker, and no `popneiReady` follows its
cancel: the band keeps of its own the time it first saw `stoppedAwaitingWorker`, and
shows the line for 10 s at most, so that a worker that does not start
again, or did not need to, leaves no line that never ends; a worker that
cannot start is said at the next request, as today. Another calculation
that starts replaces the line, and the store clears `stoppedAwaitingWorker` then.
The line names the PCA by the method of the run that was stopped, which
the band keeps from the moment it first saw `stoppedAwaitingWorker`: a
PCoA chosen while the line is shown, after a Stop of the PCA, does not
turn it into "Stopping the PCoA…".
How long the line stays has not been measured; the plan measures it in
Chromium and WebKit after a Stop of a PCA of 9,381 individuals.

**The link** to the PCA tab shows that tab, as a click on its label
would, and moves the focus to the heading of the warnings of the
result, "1 warning" or "2 warnings", or, for an error, to the heading
of the tab, "PCA" or "PCoA". It is there while the PCA's result, or its
error, is the one the current values give and another tab is shown,
and goes when the PCA tab is shown, by the link or by its label, since
the warnings are then above the result the user looks at. It comes
back when the user turns to another tab. The warnings stay in the PCA
tab, beside the result they qualify; the band names them and does not
repeat their words.

### Several live analyses

From 11 October 2026 the diversity of the Populations tab is live as
the PCA is, each once its own Run is pressed, and they run one after
the other in the order of the tabs (`popgen2-pca.md`, "Several analyses
calculated again by themselves"). The rows of "The line" that name the
PCA name any live analysis, in the words of its tab, "PCA", "PCoA",
"Diversity", with these additions:

| what holds | the words | the controls after them |
|---|---|---|
| a live analysis runs and others wait after it | "PCA running · 1:20 · then the diversity"; with two waiting, "… · then the diversity and the LD decay" | Stop, of the one running, and Stop all |
| a live analysis runs and none waits | "Diversity running · 0:12" | Stop; and Stop all while another analysis is live |
| two or more are about to start | "The PCA and the diversity start in a moment"; while the dialog of the download holds them, "The PCA and the diversity start after the download" | Stop all |
| one is about to start | "The diversity starts in a moment", as the PCA's row; held after a crash, "The diversity starts after the next change" | Stop recalculating, that analysis's; and Stop all while another analysis is live, then alone at 320 px (below) |
| a Stop of the diversity under way | "Stopping the diversity…" | none |
| results with warnings, or failed, in tabs not shown | the first in the order of the tabs: "Diversity: 2 warnings, in the Populations tab"; "Diversity: could not be calculated, in the Populations tab" | none |

**Stop all** is shown whenever two or more analyses are live and one
of them runs, waits or is about to start, as the design's choices 5
and 6 and the owner's answer 1a of 11 October 2026 have it: that is
when a time limit runs on the user (WCAG 2.2, success criterion 2.2.1),
for instance a user who stops the PCA while the diversity is live, to
change two thresholds, and must end both before the diversity starts
again a second after the first change. It calls `autoRuns.pauseAll()`,
which stops the one running and ends the live state of every one, and
the status region says so ("Its words"). While nothing runs, waits or
is about to start, the band shows no button, whatever is live: "Popnei"
alone, as the owner decided on 10 October 2026, or the link to a result
of another tab, and each tab keeps its own Stop recalculating. With one live analysis its own Stop or Stop
recalculating stands alone, as until now.

**The tab shown.** While the tab of the analysis that runs, or of the
one about to start, is shown, the band drops that analysis's Stop or
Stop recalculating, as it drops the PCA's in the PCA tab, and keeps
Stop all, whose words differ from the tab's button. The link drops
while its tab is shown, as now, and names the next in the order that
has warnings or failed in a tab not shown, if any. The band counts the
warnings of the result's status alone, and not the warning of the
spectrum of the diversity, which its block in the Populations tab shows
and which is not among them (`src/core/analyses/diversity.ts`): with
that warning alone, after a change of the minor allele frequency in the
Variants tab, the band shows "Popnei" alone (12 October 2026, the
review of work package 4; open point 2).

**Stopping** names the analysis by its words, "Stopping the diversity…",
where the band named any analysis but the PCA by its title until 11
October 2026, "Stopping the calculation of Diversity…". After Stop all
it names the one that ran.

At 320 px the short forms drop the analyses waiting, "PCA · 1:20", the
whole words given to a screen reader, and the line holds "Popnei", the
short form, Stop and Stop all; the flows check that it fits on one
line, as "PCoA soon" with the whole "Stop recalculating" does. One
line does not fit: "Diversity later" with the whole "Stop
recalculating", the diversity alone live and waiting for the download
or held after a crash, needs 288.4 px of 288 and takes a second row,
its words whole (left so after the review of work package 4 of
`docs/plans/population-tab.md`, 12 October 2026).

Under 45 em, where the band shows its short forms, an analysis about
to start beside Stop all loses its Stop recalculating in the band, and
the line holds "Popnei", the short form and Stop all alone; its tab
keeps its own Stop recalculating, and Stop all ends it with the
others. The owner chose this on 12 October 2026: with the PCA live and
the diversity about to start alone, another tab shown, "Popnei",
"Diversity soon", the whole "Stop recalculating" and "Stop all" needed
290 px of the line's 288 at 320 px wide, in Chromium 153 and WebKit 26.6
on the owner's Mac, so "Diversity soon" was cut and Stop all stood 2 px
past the line's end. The button the band does not show is out of the
order of the Tab key and is not read by a screen reader. The Stop of an
analysis that runs stays beside Stop all: with the buttons' padding of
a quarter of a rem under 45 em, "Popnei", "Diversity · 59:59", Stop
and Stop all take 282 px of the 288 at 320 px, where with three
quarters of a rem they took 314 and the clock was cut, "Diversity · …"
(12 October 2026, the review of work package 4). At 45 em and wider
nothing changes.

### An error of the application

An error of the application takes the place of the error bar of
`popgen.html`, in a second line of the band, under the line of the
heading, in
the colour of danger and with the word "error" or "stopped" in its
words, so that it is not told by colour alone. Its words are the error
bar's on a page that saves no project, `barText` of
`src/ui/shell/barSave.ts`, reused and not copied, with the message of
the first error in them (`docs/specs/shell.md`, "The error bar"):

- before the store exists, when the page met the error as it started
  and the band is drawn with no store, as `drawBar(null, null)` of
  `src/ui/pageStart.tsx` draws the bar: "The application met an error
  of its own as it started: ‹message›. Reload the page.", and nothing
  else of the band, which has nothing to read;
- the calculation worker stopped during the one pass, `countStopped`:
  "The application stopped as it counted the variants and calculated
  the statistics: ‹message›. Press Start again in the box Variants
  ("the box Variants file" until 11 October 2026, when the box was
  renamed), and if it stops again, reload the page and open your files again.",
  which names where Start again is, since the band stands apart from
  the box; the error bar of `popgen.html`, which never shows this
  sentence, keeps its words;
- the calculation worker stopped during the write of the filtered
  variants, `writeStopped`, which the dialog of the download also says
  (`popgen2-download.md`, "When the write fails"): "The application
  stopped as it wrote the filtered variants: ‹message›. Leave out more
  variants or individuals with the filters and download again, or write
  the file with popnei in Python.", the dialog's way to put it right and
  not a reload, so that the two do not contradict each other;
- any other: "The application met an error of its own: ‹message›.
  Reload the page, and open your files again."

The words are followed by two buttons, "Details" and "Close".
"Details" shows, under the line and inside the band, what the error bar
shows besides: the count of the errors after the first, "1 more error
followed it.", and "Copy the details", which copies them as the error
bar does and says in the band's own status region "The details were
copied.", or shows them in a box of text when the page has no
clipboard. Pressed again, it hides them; its state is told
to a screen reader as expanded or collapsed. "Close" empties the line
and its details, as the error bar's Close does; a later error brings it
back, and a copy of the details still under way says nothing when it
ends. The error bar has no Save on this page, which saves no project,
and none is added.

While an error is shown, with its details or without them, the band
scrolls with the page, at the top of it, and covers nothing. The line
of the error takes several lines at 320 px, three to five with a
message of a line, the one case where the band is more than one line
high, and pushes the page down when it comes: an error of the
application is rare, and the page must be reloaded after it. Fixed at
the top of the window, an error band covered half the window at 200%
zoom and all of it at 400%, with Close out of reach, in Chromium and
WebKit (the review of work package 5 of `docs/plans/no-undo.md`, 10
October 2026). An error that comes while the page is scrolled down, and
finds the band above the window, scrolls the page at once to the top of
the band, so that the line of the error, Details and Close are in the
window: the screens of 10 October 2026 showed such an error out of
sight at 320 px and cut at its first line at 1280 px, and a user of the
mouse saw nothing change on a page that must be reloaded. The page
moves at once, as the scroll "auto" does on a page that asks for no
smooth scrolling, which would ignore a user who asks for less motion;
not "instant", which Safari 16.4 does not know and throws on. The focus
stays where it was, on the page or in the band, while the control that
has it is still whole in the window; when the jump leaves it out of the
window, the focus goes to the heading "Popnei", as Close gives it. The
review of the first version of this, on 10 October 2026, found a slider
with the focus left at 690 px, below a window 600 px high, and moved by
the arrow keys with nothing seen. The alert has read the error, and the Tab key
from the heading reaches Details and Close. While a dialog is open, as
that of "Download filtered variants…", the page does not move and the
focus stays in the dialog: the same review saw the page jump behind
it, and the focus given back by Escape land 1,739 px down, out of
sight. Once the dialog has gone and has given the focus back to the
control that opened it, the page is brought to the band, and the focus
goes to the heading when that control is then out of the window. A
second error while the first is shown, Details and Close scroll
nothing. Details pressed with the page scrolled shows the
details under it, in the window.

### What stays elsewhere

- **The bar of the one pass and its Stop** stay in the box of the
  variants file, and **the bar, the clock and the Stop of the PCA** stay
  in the PCA tab, as the owner was told on 10 October 2026: a user in
  that tab looks there. The band repeats them for a user who is
  elsewhere, and its Stop is the same Stop.
- **The error bar** is not drawn on this page; the band's error line
  replaces it. `popgen.html` keeps it unchanged.
- **The status region** of the page stays where it is and says what it
  says (below, "What a screen reader hears").
- **The warnings of the PCA** stay in its tab, above its result.

## The states

The band's own states, by what it shows; a state of the seven of a
screen that cannot happen says why.

| state | what the user sees | what they can do |
|---|---|---|
| empty | "Popnei" alone: nothing runs, nothing to point to, no error; also while the PCA is live and not about to start | nothing in the band |
| locked | cannot happen: the band has no action that can be refused; a Stop is shown only while there is something to stop | |
| ready | as empty: nothing runs | |
| running | "Statistics of panel.vcf.gz · 45%" or "PCA running · 1:20" with Stop; "Writing …" with nothing to press; "Stopping …"; "The PCA starts in a moment" with Stop recalculating; with two analyses live, Stop all beside them | Stop, Stop recalculating or Stop all, where there is one |
| done | the link to the warnings or the error of the PCA while another tab is shown; otherwise as empty | follow the link |
| results removed | cannot happen: the band shows no result | |
| error | the line of an error of the application under the line of the heading, whatever that line says, with Details and Close | Details, Copy the details, Close |

Several at once, from the table of "The line": the line says one thing, the
first that holds; an error of the application takes a second line under
it. So a PCA
running when an error of the application comes shows both lines, the
error and "PCA running · 1:20" with its Stop, since the user may want
to stop a run of minutes before reloading.

## What it sends and reads

It sends:

- the Stop of the one pass, `autoRuns.stop(POPGEN2_CHAIN)`, as the box
  does;
- the Stop of the PCA, and its Stop recalculating while it is about to
  start, `autoRuns.pause("pca")`, as the PCA tab does
  (`popgen2-pca.md`, "What it sends and reads"); the same of the
  diversity, `autoRuns.pause("diversity")`, from 11 October 2026;
- Stop all, `autoRuns.pauseAll()`;
- a change of the tab shown, to the PCA tab or the Populations tab, by
  its link, through the page's store of the tab shown, `src/ui/pageTab.ts`;
- the close of the log of the errors, `defects.dismiss()`, and the copy
  of its details, as the error bar does.

It reads:

- from the store: the statuses of its analyses, that of the one pass,
  `variantsSummary`, with the progress of its run, and that of the PCA,
  with the id of its run, for the clock, and its result's warnings;
  `write`, with its progress; the project, for the name of the variants
  file and the method of the PCA;
- the clock of a run, `useRunSeconds` of `src/ui/runSeconds.ts`, as the
  PCA tab reads it;
- from `src/ui/autoRuns.ts`: the live state of each live analysis,
  `liveState(id)`, one entry of `BandPage.live` per live analysis since
  12 October 2026 (until then `BandPage.pcaLive`, the PCA's alone),
  whether it is live, about to start and what its start waits for, or
  stopped by the user, read with its `subscribe` alone, which tells
  every change of it, those a change of the store makes among them (the
  review of work package 4 of `docs/plans/no-undo.md`, 10 October 2026;
  `aboutToStart` with `subscribe` missed the changes of the store);
- the log of the errors, `src/ui/defects.ts`;
- the tab shown, from `src/ui/pageTab.ts`;
- `stoppedAwaitingWorker` of the store's state, for "Stopping".

What the band says is worked out by pure functions of these, of
`src/ui/band/bandLine.ts`, tested in node: `lineOf`, the line after
the heading, and `errorOf`, the line of an error, from the log of the
errors alone; `bandOf` gives the two together. `lineOf` is given beside them the time now
and the time the band first saw `stoppedAwaitingWorker`, for the 10 s of
"Stopping", and the method of the PCA then. The band holds of its own
three things: whether its details are shown, that time, and that
method.

The tab shown was state of the page's component until this piece
(`VariantsPage.tsx`). The band is drawn in another root and must show
the PCA tab, so the tab shown moves into `src/ui/pageTab.ts`, a small
store the entry makes once, which the row of tabs and the band read and
change; it is still the screen's, not the project's
(`docs/architecture.md`, sections 7 and 9).

## Its words

| where | the words |
|---|---|
| the one pass running | "Statistics of panel.vcf.gz · 45%"; before its first progress, "Statistics of panel.vcf.gz" |
| the PCA running | "PCA running · 1:20"; "PCoA running · 1:20"; under a minute, "PCA running · 0:12" |
| the write | "Writing panel.filtered.vcf.gz · 45%"; "Writing panel.filtered.nei · 45%" |
| a Stop under way | "Stopping the PCA…"; "Stopping the PCoA…"; "Stopping the statistics of panel.vcf.gz…"; "Stopping the diversity…" ("Stopping the calculation of Diversity…" until 11 October 2026) |
| an analysis running with others waiting after it | "PCA running · 1:20 · then the diversity"; "Diversity running · 0:12" with none |
| several about to start | "The PCA and the diversity start in a moment"; "The PCA and the diversity start after the download" |
| the diversity about to start | "The diversity starts in a moment"; "The diversity starts after the download" |
| the link of the diversity | "Diversity: 1 warning, in the Populations tab"; "Diversity: could not be calculated, in the Populations tab" |
| the PCA about to start | "The PCA starts in a moment"; "The PCoA starts in a moment"; held after a crash, "The PCA starts after the next change"; while the dialog of the download is open, "The PCA starts after the download"; "The PCoA starts after the download" |
| the link to the warnings | "PCA: 1 warning, in the PCA tab"; "PCA: 2 warnings, in the PCA tab"; "PCoA: 1 warning, in the PCA tab" |
| the link to an error | "PCA: could not be calculated, in the PCA tab"; "PCoA: could not be calculated, in the PCA tab" |
| the short forms, under 45 em wide, the whole words given to a screen reader ("Its place") | "Statistics · 45%"; "PCA · 1:20"; "Diversity · 0:12"; "Writing · 45%"; "Stopping…"; "PCA soon"; "Diversity soon"; "Analyses soon"; "PCA later"; "Diversity later"; "Analyses later"; "PCA: 2 warnings"; "Diversity: 2 warnings"; "PCA: failed"; "Diversity: failed"; "PCoA" in place of "PCA" under the PCoA (listed here on 12 October 2026, the review of work package 4) |
| the buttons | "Stop"; "Stop recalculating"; "Stop all"; "Details"; "Close"; "Copy the details" |
| the name of the Stop for a screen reader | "Stop the statistics of panel.vcf.gz"; "Stop the PCA"; "Stop the PCoA"; "Stop recalculating the PCA"; "Stop recalculating the PCoA"; "Stop the diversity"; "Stop recalculating the diversity"; "Stop all: the PCA and the diversity" |
| an error of the application | the three sentences of `barText` on this page, "An error of the application", with the message in each |
| its details | "1 more error followed it."; "3 more errors followed it." |
| the band's own status region | "The details were copied."; "The details could not be copied. Select them in the box below and copy them." |
| the name of the band for a screen reader | "What the page is doing" |
| the status region of the page, a Stop pressed in the band | the words of that Stop where it is pressed elsewhere: of the PCA, "PCA stopped. Press Run in the PCA tab to calculate it again."; of the diversity, "Diversity stopped. Press Run in the Populations tab to calculate it again."; of the one pass, what its Stop in the box says today |
| the status region of the page, Stop all | "Stopped: the PCA and the diversity no longer start by themselves. Press Run in their tabs to calculate them again."; the second sentence only for the tabs that then offer Run, "Press Run in the PCA tab to calculate the PCA again." for one, none when no tab does (`popgen2-pca.md`, "Several analyses calculated again by themselves", "The status region", corrected on 11 October 2026) |

The words of an analysis held by the dialog of the download, "The
diversity starts after the download", are the band's own from 12
October 2026, the review of work package 4; until then they were the
tabs' words, "… starts again when the download is written or closed",
which the tabs keep. With them the line did not fit at any width of
the window: "The diversity starts again when the download is written
or closed" with Stop recalculating and Stop all took 831 px of the
column's 736, and the line of both analyses with Stop all 753, in
Chromium 153 and WebKit 26.6 on the owner's Mac, so their end was cut.

## Accessibility

The criteria are those of WCAG 2.2 at level AA.

### Keys and focus

The band is first in the page, so its controls are the first stops of
the Tab key (2.4.3): the Stop or the link of its line, then, with an
error, "Details", "Close" and, when the details are shown, "Copy the
details". A user of the keyboard reaches the Stop of a PCA started by
itself from anywhere with Shift and Tab, or from the top of the page.
No key of its own: a shortcut for Stop would be one more key to learn
and to clash with a screen reader's.

When the control with the focus goes from the band, the focus does not
fall on nothing: after its Stop, whose line then changes to "Stopping
…" with no button, the focus goes to the heading "Popnei" at the
band's left, which is not a stop of the Tab key, so the next press of the Tab key goes on to the
box of the variants file. A screen reader then says the heading's name
and the status region's words of the Stop, "PCA stopped. Press Run in
the PCA tab to calculate it again.", once; the band's own line is not
read, since the focus is not on it, so the Stop is not said twice. The
same when a control goes by itself while it has the focus: the link
when the line now says something else, the Stop of the one pass when
the pass ends, the Stop of a PCA when its run ends. A Stop of
another analysis is another control, so that the
focus never passes by itself from the Stop of one analysis to that of
the next, which Enter would then stop unasked: when the PCA ends with
its Stop focused and the diversity starts, the focus goes to "Popnei".
A Stop recalculating that becomes the Stop of the same analysis keeps
the focus, since both end it: Stop recalculating the PCA focused when
the PCA starts is then "Stop the PCA", focused (the second review of
work package 4, 12 October 2026; until then it went to "Popnei", and a
user of the keyboard who reached it in the quiet second had to press
the Tab key again);
and so does the focus of a Stop recalculating the band leaves out once
the window is narrowed under 45 em (the review of work package 4, 12
October 2026). After "Close"
the focus goes to the heading "Popnei", as the error bar's Close does.
After the link, the focus is on the heading of the warnings or of the
tab, as above; when the PCA tab has no such heading, as when an error
has emptied the application's root, it goes to the heading "Popnei".

Every button is at least 24 by 24 px (2.5.8). The link is as tall as
its line of text, 17 to 19 px in Chromium and WebKit (the review of
work package 5 of `docs/plans/no-undo.md`, 10 October 2026), and meets
2.5.8 by its exception of spacing: a circle of 24 px centred on it
touches no other control, since nothing else stands in the line beside
it. Its ring of the focus is drawn whole, not cut by the box of the
words, which the flows check.

### What a screen reader hears

The band is the page's banner, a `<header>` named "What the page is
doing", so that a screen reader lists it among the parts of the page
and its user can go to it. The heading "Popnei" in it stays the page's
`<h1>`, and a screen reader lists it among the headings as before. The
status parts are as before: the band's line is not live, its error is
an alert, and its details have their own status region.

Its line is not a status region: its percentage and its clock change
every second, and a status region would read each change aloud. So
what the line says is read only when the user reaches it. What starts
and what ends is said by the page's status region, as it was before
the band: the end of the one pass, "Calculating the PCA again." at a
start by itself, the end of a PCA, a Stop. The band writes nothing into
the status region but the words of a Stop pressed in it, which the
same Stop pressed elsewhere would say, so nothing is said twice: the
band says nothing aloud of what the status region says, and the status
region says nothing of the band.

While a dialog is open, the dialog of the download among them, React
Aria makes the rest of the page out of reach of the keyboard and of a
screen reader, but for the elements marked as live announcers,
`data-live-announcer`, as `ErrorBar.tsx` and `StatusRegion.tsx` mark
theirs. The band's alert and its own status region carry that mark, so
that an error, or the copy of its details, is heard while the dialog
is open. Its Stop and its link cannot be reached then; that is
accepted, since the dialog has its own Stop, and no PCA runs during a
write.

The line of an error is an alert, as the error bar is: its element is
on the page, empty, from the first drawing, and only the words of the
first error are in it, so that the count of later errors is not read
out again (`docs/specs/shell.md`, "The error bar"). The details have
their own status region for the words of Copy the details.

The words of the line are its text, so a screen reader reads
"Statistics of panel.vcf.gz, 45%" as it is shown; the Stop is named by what it stops,
"Stop the PCA", since three buttons named "Stop" would not say which.
The link is a link, read with its words.

### Moving words

The percentage and the clock change every second while a calculation
runs. They are exempt from success criterion 2.2.2, Pause, Stop, Hide,
as a progress indicator that informs of a task under way, and they stop
at the end of the run; the line moves nothing else and blinks nothing.

### Colour, contrast and the window

The words of the line are in the colour of the text, 4.5:1 at least
against the band's background in both themes (1.4.3); the line of an
error has the border and the word of danger, `--color-danger`; the link
to warnings says "warning" in its words and is drawn as a link, not by
colour alone (1.4.1).

The band covers the top of the window always, so a control reached by
the Tab key must not be hidden under it (2.4.11, "Focus Not
Obscured"): the page scrolls a control into view below the band, by a
padding at the top of the scroll of the page equal to the band's
height, always. It is set in `src/ui/base.css` beside the padding at
the bottom that keeps a control clear of the notices,
`scroll-padding-block-end: var(--toast-room)`, as
`scroll-padding-block-start: var(--band-room)`, a token the band sets
to its height. A control that takes the focus from a press of the
pointer is not scrolled: the page would move under the pointer between
the press and the release, and the press of a button half under the
band would be lost. While an error of the application is shown it scrolls
with the page and covers nothing, and the token is 0.

At 320 px wide (1.4.10) "Popnei" and the status share one line, the
status in its short form, and the page under it does not scroll
sideways; the line of an error may take two more.

## The layout, 1280 and 320 px, light and dark

At 1280 px the band spans the window, "Popnei", the words and the
button within the 48 rem of the page's column, the heading at its start,
the words 1 rem after it and the control 1 rem after them, on one line,
the control beside the words it acts on and not at the far end of the
column. At 320 px
the same, within the 16 px margins of the page, the status in its short
form and in the small text of the page, `--text-sm`, the heading in
`--text-lg` and the parts a quarter of a rem apart, so that "PCoA
soon" with the whole "Stop recalculating" fits beside "Popnei"; the
flows check that it does. The one line longer than it, "Diversity
later" with the whole "Stop recalculating", 288.4 px of 288, takes a
second row for its button (above, "Several live analyses").

The width under which the band is narrow was 44 em, 704 px at the
browser's usual size of text, from 12 October 2026, the review of work
package 4; it was 30 em, and between 480 and 700 px the whole words of
a line with two buttons were cut, "The diversity st…" at 520 px. Every
line of the band was measured, in its whole and its short form, at
each width from 320 to 1280 px in steps of 10 px, in Chromium 153 and
WebKit 26.6 on the owner's Mac, with the same numbers in both. The
widest whole line, "The diversity starts after the next change" with
Stop recalculating and Stop all, takes 660 px and fits from a window of
700 px, 672 px of room at 704; under 44 em the widest short form,
"Diversity · 59:59" with Stop and Stop all, takes 282 px of the 288 at
320 px, with the buttons' padding of a quarter of a rem. From 12
October 2026, the second review of work package 4, the width is 45
rem, 720 px: a scrollbar that takes room, 15 px on Windows or on a Mac
set to show them, is inside the width the media query compares and not
inside the band's, so at 704 px the widest whole line would have had
657 px of the 660 it takes, and wrapped; at 720 px it has 673.

When the parts do not fit on one line, with the text at 200% or a
clock past an hour at 320 px ("Diversity · 1:59:59" with its buttons
takes 294 px), the buttons, and the words if they must, go to a row
under them, and the band, and the room the page keeps under it, grow
by that row; with the page scrolled down, the page is scrolled by as
much in the same frame, so that what the user reads stays where it was,
where it moved 102 to 120 px at 320 px when an analysis started or
ended (the second review of work package 4, 12 October 2026); the words are never shrunk below their whole width, but
for the name of a file: it is cut with "…" at its end when the row
beside the heading has no room for it, the words before and after it
whole, and the line wraps only when what is never cut does not fit
(the second review of work package 4, 12 October 2026: before it, the
words with a name of 74 characters took a row of their own, the band
113 px tall in place of 51 at 704 to 1280 px, and the "…" fell on the
percentage, in Chromium 153 and WebKit 26.6). Until 12 October 2026 the line did
not wrap, and at 200% text at 320 px Stop all stood 109 px past the
window, out of reach, and the words shrank to nothing (the review of
work package 4). At 100% text every line is on one row from 320 px up.

In light and dark it takes the page's background
and the colour of its text, with the border of the page under it
always; its error, the colour of danger of each theme.

## How it is checked

**In Vitest, in node**, at `bandOf` of `src/ui/band/bandLine.ts`, from
states of the real store of the page made with a fake worker: each row
of the table of "The line", with its words under the PCA and the PCoA,
the PCA about to start in the quiet second and while the dialog of the
download holds it;
each of the three sentences of an error, the one with no store among
them;
the order when two hold, the PCA running over a Stop under way, a Stop
under way over about to start, about to start over the link; the link
absent while the PCA tab is shown, and present with "2 warnings" while
the Variants tab is; the line "Stopping the PCA…" while the store's `stoppedAwaitingWorker` is
`pca`, gone when it is `null` and after 10 s from the time first seen; the line of an error above each of the
others; the percentage of a progress of 1,234 of 10,000 bytes, "12%",
rounded down, so that 100% is said only at the end; the clock at 59 s
and at 61 s, "0:59" and "1:01".

From 11 October 2026, at `bandOf`, with the PCA and the diversity: the
PCA running and the diversity waiting, "PCA running · 1:20 · then the
diversity" with Stop and Stop all; the diversity running alone, its
words and Stop; both about to start, the words of both and Stop all
alone, and while the dialog of the download holds them; the PCA tab
shown with the PCA running and the diversity waiting, the words with
Stop all and no Stop; the Populations tab shown with the diversity
about to start alone, no button; the diversity running alone with the
PCA live and idle, as after a change of the populations, its words with
Stop and Stop all; the diversity about to start alone with the PCA
live, its words with Stop recalculating and Stop all, the Stop
recalculating not drawn under 45 em, and the focus it had then
on the heading; both live and
nothing running, waiting nor about to start, no button; the link of
the diversity's warnings
while the PCA has none, and the PCA's when both have them; "Stopping
the diversity…".

**In jsdom**, the band drawn: the Stop of the one pass calls
`autoRuns.stop` with the page's group, and the Stop of the PCA and
its Stop recalculating while it is about to start
`autoRuns.pause("pca")`; the PCA live with nothing running nor about
to start, "Popnei" alone; the link changes the tab shown to the PCA;
after a Stop the focus is on the heading "Popnei"; the line carries no
live role, and the alert and the band's status region carry
`data-live-announcer`; Details shows and hides the
message with `aria-expanded`; Close calls `defects.dismiss` and gives
the focus to the heading, empties the band's status region and hides
the details and their box for the next error; "Stopping the PCA…"
gone 10 s after the band first saw it, on a clock of the test, while
the store still waits for the worker. An error that comes with the band above
the window scrolls the page to the band's top, once, at once, and a
second error, Details and Close scroll nothing; an error after Close
scrolls again; none with the band's top in the window. The focus goes to
the heading when the control that had it is then below the window or
cut by its bottom edge, and stays on a control still in it. With a
dialog open, an error scrolls nothing and leaves the focus in it; once
the dialog has gone and the focus is given back a frame later, the
page is scrolled and the focus, out of the window, goes to the
heading.

**In Playwright, on the built site, in Chromium and WebKit**, the two
engines that start on the owner's Mac, on `panel.nei`,
`panel_pops.csv` and a VCF large enough to read for a few seconds, the
pass held by `e2e/holdWorker.ts`:

- a file opened, the pass held: the band reads "Statistics of panel.nei"
  then a percentage, and its Stop stops the pass, the box then offering
  Start again;
- the PCA run and held: "PCA running · 0:0…" with no Stop while the
  PCA tab is shown, and with it while the Variants tab is; its Stop in
  the band: the PCA tab shows Run,
  the status region says "PCA stopped. Press Run in the PCA tab to
  calculate it again.", and a threshold moved then starts nothing;
- the PCA live, a threshold moved in the Variants tab: "The PCA starts
  in a moment" with Stop recalculating, then "PCA running", read
  at every change of the band, never a line of nothing between the two,
  and "Popnei" alone once the result is shown;
- the PCoA with the LD pruning off, done, the Variants tab shown: the
  link "PCoA: 2 warnings, in the PCA tab", of `pruningOff` and
  `lingoesCorrection`; pressed with Enter: the PCA tab shown, the focus
  on the heading "2 warnings", the link gone; the Variants tab shown
  again: the link back;
- an error of the application thrown on purpose, as the flows of the
  error bar throw it (`docs/specs/entry.md`, "How it is verified"): the
  line of the error in an alert, Details and Close, the band scrolling
  with the page; Details reached by the keyboard with the page scrolled
  to its end, the details in the window; a PCA held running at the same
  time shows both lines;
- an error thrown with the page scrolled down, at 1280 and at 320 px,
  in a window 600 px high: the page scrolled to the band, whose top is
  at 0 of the window or below it, the line of the error, Details and
  Close whole in the window; with the focus on the page, the focus
  where it was; with the focus on the slider of the missing genotypes,
  which the jump leaves out of the window, the focus on the heading
  "Popnei", in the window;
- an error thrown with the dialog of the download open on a page
  scrolled down: the page does not move, the focus stays in the dialog;
  Escape, and the band in the window with the focus on the heading;
  the crash of a write closed with the dialog's Close does the same
  (`e2e/popgen2Download.spec.ts`);
- the page scrolled to its end with a PCA held running: the band at the
  top of the window; each control reached by the Tab key from the end
  of the page back to the top, in WebKit as in Chromium, below the
  band's rectangle, not under it; the same with nothing running, the
  band then showing "Popnei" alone at the top of the window;
- after the band's Stop, the focus on the heading "Popnei";
- a button of the page with its top at 47 px of the window, under the
  band's 51, pressed with the mouse at 53 px: it does what it says, the
  file chooser of "Open another variants file…" opens, and the page
  does not scroll;
- the one pass about to start, its start held: "Statistics of panel.nei" with
  Stop, which keeps it from starting;
- with the download's dialog open and an error thrown: the band's alert
  heard, its element not inert;
- the band's height the same with "Popnei" alone, with a line and with
  a Stop, at 1280 and at 320 px, measured and written into this spec
  (51 px, "Its place"),
  and the top of the two boxes at the same place in each; at 320 px no
  sideways scroll, and each short form with its button on one line
  beside "Popnei", "PCA soon" with the whole "Stop recalculating"
  among them, the words not cut; a screen reader's text of the status the whole
  words; the `<h1>` "Popnei" inside the band, the only `<h1>` of the
  page;
- the time from a Stop of a PCA of 9,381 individuals to the end of
  "Stopping the PCA…", in Chromium and WebKit, measured once and
  written into this spec: on the gzipped VCF of 300 variants of
  `e2e/bigVcf.ts`, the band's Stop pressed after 10 s of the PCA, the
  line lasted 0.023 s in Chromium 153 and 0.059 s in WebKit 26.6, the
  new worker's popnei ready at 0.013 s and 0.042 s, and the PCA tab's
  Run enabled after it in both; on the owner's Mac, an Apple M5 Pro of
  64 GB with macOS 27.0.1, on 10 October 2026, with a load average of
  3.3 over the last minute (`NU5 D6` of `e2e/measure.spec.ts`);
- from 11 October 2026, the PCA and the diversity live, a threshold
  moved in the Variants tab, the PCA held running: "PCA running · 0:0… ·
  then the diversity" with Stop and Stop all; Stop all: no request of
  the diversity follows, both tabs show the line of a Stop, and the
  status region says the words of Stop all once; at 320 px, "Popnei",
  "PCoA · 1:20", Stop and Stop all on one line, no sideways scroll;
- from 12 October 2026, at 320 px, the PCA live and the diversity about
  to start alone, the Variants tab shown: "Popnei", "Diversity soon" and
  Stop all alone on one line, the words not cut, no sideways scroll; the
  band's Stop recalculating not in the accessibility tree, and the Tab
  key going from the heading "Popnei" to Stop all;
- axe, the checker of accessibility, with the band in each state, in
  light and in dark.

**The screens**, `--project=screens`, at 1280 and 320 px, light and
dark: `popgen2-band-empty`, "Popnei" alone, `popgen2-band-reading`,
`popgen2-band-pca-running`, `popgen2-band-stopping`,
`popgen2-band-about-to-start`, `popgen2-band-pca-tab-about-to-start`
(the PCA tab shown, the words and no Stop recalculating in the band),
`popgen2-band-then-diversity`, `popgen2-band-analyses-soon` and
`popgen2-band-diversity-soon`, from
11 October 2026, `popgen2-band-writing` (behind the
dialog), `popgen2-band-warning`, `popgen2-band-error` and
`popgen2-band-error-details`, and `popgen2-band-error-running`, both
lines; from 12 October 2026 (the review of work package 4),
`popgen2-band-diversity-running` ("Diversity running" with Stop and
Stop all, the PCA live and idle), `popgen2-band-diversity-stopping`,
`popgen2-band-diversity-warning` (the link "Diversity: 2 warnings, in
the Populations tab"), `popgen2-band-diversity-failed` (the link
"Diversity: could not be calculated, in the Populations tab") and
`popgen2-band-held-after-crash` (the PCA held after a crash of the
diversity it waited for, with its Stop recalculating), each with
another tab shown.

**By hand**, by the owner: the band in Safari and Firefox, which
Playwright cannot start on the owner's Mac, with a control reached by
Tab in Safari not under the band; VoiceOver with Safari on the region,
the Stop and the link, and after the band's Stop the stop said once.

## Choices made by the session

Approved with the spec, and open to the owner's change once they try
the page: the short forms at 320 px; the band as the page's banner; the
order of the lines when several hold; the clock and no percentage for
the PCA, whose bar stands full while popnei decomposes the matrix and
would say 100% for minutes; the write said with no Stop; the link to an
error of the PCA as well as to its warnings; a link and not a button;
the count of the errors and Copy under "Details"; the 10 s after which
"Stopping" goes; the focus on the heading after its Stop; and the
words.

## Left for the running application

The spacing of the line, the size of its button beside the words, the
look of the link, the shade of the border, and the size of "Popnei"
in the band, which the heading line had at `--text-xl`.

## Open points

1. **The band's room while nothing runs.** Answered by the owner on 10
   October 2026, otherwise than recommended: the band is always at the
   top of the window, and "disguises" itself by carrying the page's
   name: while nothing runs it shows "Popnei", and the information is
   added after it when there is some. So the band is the page's heading
   line ("Its place"). The options were (a) the band always at the top,
   empty while it had nothing to say; (b) the band over the top of the
   page only while it had something to say; (c), recommended, its room
   kept in the page and the band at the top only while it had words.
   The owner's answer is (a) with the heading in the band, which leaves
   no empty strip: the band costs nothing the heading did not already
   take, and covers the top of what scrolls under it always, which the
   padding of the scroll keeps clear of a control reached by the Tab
   key.

2. **The warning of the spectrum in the band**, put to the owner on 12
   October 2026 (the review of work package 4 of
   `docs/plans/population-tab.md`). The band links to the warnings of a
   result of a tab not shown, and counts those of the result's status;
   the spectrum of the diversity says its own warning, of the minor
   allele frequency, in its block, and that warning is not among them,
   so a user in the Variants tab who moved the minor allele frequency
   is not sent to it. The options: (a) leave it, the block of the
   spectrum telling it when the Populations tab is shown; (b) count it
   among the warnings the band links to, which changes the result's
   status of the diversity and the count its tab shows. Not decided.

## Not in this spec

- The reading of the individuals file and the opening of the variants
  file, which take a second or less on the test files and are said in
  their boxes: not in the band, which the owner may ask for after
  trying it.
- The progress inside the box of the variants file and the PCA tab:
  their specs, unchanged.
- The error bar of `popgen.html`: `docs/specs/shell.md`.
- The tabs of the Populations and the Distances, not built: when they
  have results with warnings, the link names them as it names the PCA's.
