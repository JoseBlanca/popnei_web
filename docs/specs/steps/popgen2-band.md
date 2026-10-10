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

| the words at 1280 px | the short form, under 30 rem wide |
|---|---|
| "Statistics of panel.vcf.gz · 45%" | "Statistics · 45%" |
| "PCA running · 1:20" | "PCA · 1:20" |
| "Writing panel.filtered.vcf.gz · 45%" | "Writing · 45%" |
| "Stopping the PCA…" | "Stopping…" |
| "The PCA starts again in a moment" | "PCA soon" |
| "The PCA starts again when the download is written or closed" | "PCA later" |
| "PCA: 2 warnings, in the PCA tab" | "PCA: 2 warnings" |
| "PCA: could not be calculated, in the PCA tab" | "PCA: failed" |

"PCoA" in place of "PCA" under the PCoA. The flows check that each fits
one line at 320 px with "Popnei" and its button, the whole "Stop
recalculating" among them: so that it fits, under 30 rem the heading
"Popnei" is in the large text of the page, `--text-lg`, and the parts
of the line stand a quarter of a rem apart, which leaves 73 px for the
words beside "Stop recalculating" in Chromium 153 and WebKit 26.6 on the
owner's Mac; "PCoA soon" takes 71 px there (measured on 10 October
2026).

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
| the PCA is about to start | "The PCA starts again in a moment"; "The PCoA starts again in a moment"; while the dialog of the download holds it, the dialog's words, "The PCA starts again when the download is written or closed" (`popgen2-pca.md`, "Its words") | Stop recalculating, the PCA tab's |
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
way wins over the link, which is about a result already there.

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
  the statistics: ‹message›. Press Start again in the box Variants file,
  and if it stops again, reload the page and open your files again.",
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
October 2026). An error that comes while the page is scrolled down is
therefore above what the window shows; the alert reads it, and the
Tab key from the top of the page reaches it first. Details pressed with
the page scrolled shows the details under it, in the window.

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
| running | "Statistics of panel.vcf.gz · 45%" or "PCA running · 1:20" with Stop; "Writing …" with nothing to press; "Stopping …"; "The PCA starts again in a moment" with Stop recalculating | Stop or Stop recalculating, where there is one |
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
  (`popgen2-pca.md`, "What it sends and reads");
- a change of the tab shown, to the PCA tab, through the page's store of
  the tab shown, `src/ui/pageTab.ts`;
- the close of the log of the errors, `defects.dismiss()`, and the copy
  of its details, as the error bar does.

It reads:

- from the store: the state of the one pass, `variantsSummary`, and of
  the PCA, with its result's warnings; `runs`, with the progress, the
  `stopping` and the id of each request; `write`; the project, for the
  name of the variants file and the method of the PCA;
- the clock of a run, `useRunSeconds` of `src/ui/runSeconds.ts`, as the
  PCA tab reads it;
- from `src/ui/autoRuns.ts`: the PCA's live state, `liveState("pca")`,
  whether it is live, about to start and what its start waits for, or
  stopped by the user, read with its `subscribe` alone, which tells
  every change of it, those a change of the store makes among them (the
  review of work package 4 of `docs/plans/no-undo.md`, 10 October 2026;
  `aboutToStart` with `subscribe` missed the changes of the store);
- the log of the errors, `src/ui/defects.ts`;
- the tab shown, from `src/ui/pageTab.ts`;
- `stoppedAwaitingWorker` of the store's state, for "Stopping".

What the line says is a pure function of these, `bandOf` of
`src/ui/band/band.ts`, tested in node, given beside them the time now
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
| a Stop under way | "Stopping the PCA…"; "Stopping the PCoA…"; "Stopping the statistics of panel.vcf.gz…"; for an analysis the page will run beside them, by its title, "Stopping the calculation of Diversity…" |
| the PCA about to start | "The PCA starts again in a moment"; "The PCoA starts again in a moment"; while the dialog of the download is open, "The PCA starts again when the download is written or closed"; "The PCoA starts again when the download is written or closed" |
| the link to the warnings | "PCA: 1 warning, in the PCA tab"; "PCA: 2 warnings, in the PCA tab"; "PCoA: 1 warning, in the PCA tab" |
| the link to an error | "PCA: could not be calculated, in the PCA tab"; "PCoA: could not be calculated, in the PCA tab" |
| the buttons | "Stop"; "Stop recalculating"; "Details"; "Close"; "Copy the details" |
| the name of the Stop for a screen reader | "Stop the statistics of panel.vcf.gz"; "Stop the PCA"; "Stop the PCoA"; "Stop recalculating the PCA"; "Stop recalculating the PCoA" |
| an error of the application | the three sentences of `barText` on this page, "An error of the application", with the message in each |
| its details | "1 more error followed it."; "3 more errors followed it." |
| the band's own status region | "The details were copied."; "The details could not be copied. Select them in the box below and copy them." |
| the name of the band for a screen reader | "What the page is doing" |
| the status region of the page, a Stop pressed in the band | the words of that Stop where it is pressed elsewhere: of the PCA, "PCA stopped. Press Run in the PCA tab to calculate it again."; of the one pass, what its Stop in the box says today |

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
the pass ends, the Stop of a PCA when its run ends. After "Close"
the focus goes to the heading "Popnei", as the error bar's Close does.
After the link, the focus is on the heading of the warnings or of the
tab, as above; when the PCA tab has no such heading, as when an error
has emptied the application's root, it goes to the heading "Popnei".

Every button and the link are at least 24 by 24 px (2.5.8).

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
`--text-lg` and the parts a quarter of a rem apart, so that the
longest, "PCoA soon" with the whole "Stop recalculating", fits beside
"Popnei"; the flows check that it does. In light and dark it takes the page's background
and the colour of its text, with the border of the page under it
always; its error, the colour of danger of each theme.

## How it is checked

**In Vitest, in node**, at `bandOf` of `src/ui/band/band.ts`, from
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

**In jsdom**, the band drawn: the Stop of the one pass calls
`autoRuns.stop` with the page's group, and the Stop of the PCA and
its Stop recalculating while it is about to start
`autoRuns.pause("pca")`; the PCA live with nothing running nor about
to start, "Popnei" alone; the link changes the tab shown to the PCA;
after a Stop the focus is on the heading "Popnei"; the line carries no
live role, and the alert and the band's status region carry
`data-live-announcer`; Details shows and hides the
message with `aria-expanded`; Close calls `defects.dismiss` and gives
the focus to the heading.

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
  again in a moment" with Stop recalculating, then "PCA running", read
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
  written into this spec;
- axe, the checker of accessibility, with the band in each state, in
  light and in dark.

**The screens**, `--project=screens`, at 1280 and 320 px, light and
dark: `popgen2-band-empty`, "Popnei" alone, `popgen2-band-reading`,
`popgen2-band-pca-running`, `popgen2-band-stopping`,
`popgen2-band-about-to-start`, `popgen2-band-pca-tab-about-to-start`
(the PCA tab shown, the words and no Stop recalculating in the band),
`popgen2-band-writing` (behind the
dialog), `popgen2-band-warning`, `popgen2-band-error` and
`popgen2-band-error-details`, and `popgen2-band-error-running`, both
lines.

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
