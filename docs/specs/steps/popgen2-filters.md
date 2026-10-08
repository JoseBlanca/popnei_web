# popgen2.html: the thresholds as filters, with Undo

The screen spec of what `popgen2.html` gains with the design
`docs/designs/stats-filters.md`, approved by the owner on 7 October
2026: the thresholds on the histograms of the statistics become filters
of the project, a check box leaves out the variants that failed their
FILTER, and the page gets Undo and Redo. Written on 7 October 2026 and approved by the owner the same day.
Revised the same day for two things that came after the approval: the
owner's decision that the FILTER box is shown, and its filter applied,
for a `.nei` file that records the FILTER of its variants, as for a VCF
(the design, "What the owner decided"); and the exact count under each
threshold that popnei 0.2.2 gives, in place of a range. Revised on 8
October 2026 for the owner's decisions after trying the page (the
design, "What the owner decided"): no line under the plots of what a
threshold keeps, and a threshold that keeps every value of its plot,
off among them, shown by its line and the number in its box in grey,
not by the words "No filter"; and, decided by the session from them,
no raise of a threshold below 0.001. Revised again on 8 October 2026
for the grey that the piece `popnei-0.2.2` built that day and that this
spec takes as it is: a bluish grey of its own, the token
`--chart-threshold-keeps-all`, with the line dotted and the handle
hollow (below, "The terms"). Revised again on 8 October 2026 for the
owner's round on the FILTER box (the design, "What the owner
decided"): no change of a filter gives a notice, so the page has no
notice, which it had until then, "The MAF filter changed · Undo"; and
opening a file, the first or another, is not a step of Undo but starts
the page's history afresh, where until then it was, "Undo: panel.nei
opened". The FILTER box and Undo and Redo are built (`docs/plans/filters.md`,
work packages 6 and 7), and so are the thresholds as filters (work
package 9), which settled the words a screen reader hears of a grey
threshold in the set of this spec (below, "Words and layout chosen by
the session"). What it builds on is the page as the pieces `thresholds` and
`one-pass` left it (`docs/plans/thresholds.md`, `docs/plans/one-pass.md`),
where a threshold is state of the page, changes nothing in the project
and is lost when another file is opened. It covers cases 1 and 2 of
`docs/use-cases.md` up to the point where the filters are carried out,
which waits for the tools section.

The commands of the project, the kind `passed`, the opening of a file
as a new history, the failures that
survive a change of a filter and the result so far kept after a Stop are
specified in `docs/specs/core/project.md`, `docs/specs/core/store.md`
and `docs/architecture.md`, revised with this design; this spec names
them and does not repeat them.

## The terms

- **The project** is everything the user has set: the file open and the
  filters with their values. **The store** holds it, its history for
  Undo and Redo, and the results; a screen changes the project only by
  sending the store a command, with a description that names the step
  of Undo.
- **The notice** is the panel of the old page, `popgen.html`, fixed at
  the bottom of the window, that says what the last change removed or
  stopped, with its Undo. It is part of **the shell** of that page, the
  header, the stepper and the notice that surround each step.
  `popgen2.html` has none, as the owner decided on 8 October 2026.
- **The status region** is a line of the page that is not seen and that
  a screen reader speaks each time its words change; the page puts there
  what it has to tell a user who cannot see the screen and that the
  control the user acted on does not say.
- **The focus** is the control the keys act on at a given moment, the
  one the Tab key moved to or the user clicked: the arrow keys move the
  line that has the focus, and what is typed goes to the box that has
  it.
- **The worker** is the second thread of the tab, where popnei reads the
  file, so that the page does not freeze while it reads.
- **The one pass** is the single reading of the file at its opening,
  which gives the count and every plot. Its **key**, what its result is
  filed under, holds the file and no filter. A result is **stale** when
  something it was calculated from has changed since, and the store then
  removes it (`docs/architecture.md`, section 3); since the key holds no
  filter, no change of a filter makes the plots stale or removes them.
- **A result so far** is what the one pass has read before it ends,
  which the plots are drawn from while it runs. popnei gives one every 2
  seconds, its `soFarEvery`, which the worker leaves at popnei's default
  (`src/worker/runner.ts`).
- **The line** of a threshold is the marker on its histogram, a vertical
  line with a handle, dragged with the pointer or moved with the arrow
  keys when it has the focus. **The box** is the number box beside the
  histogram, which shows the same value and takes a typed one.
- **Grey**: a threshold whose line, handle and number are drawn in grey
  keeps every value of its plot: no bin of the variants, and no value of
  an individual, lies above it. It is grey when it is off, at 1, and
  when it is on at a value that keeps every value of the plot. The grey
  is the bluish grey of the token `--chart-threshold-keeps-all` of
  `src/ui/tokens.css`, a grey with some of the blue of the bars, #54758c
  in the light theme and #6387a1 in the dark, as the piece
  `popnei-0.2.2` drew it on 8 October 2026; the line is dotted and the
  handle hollow, an outline over the background, where a threshold that
  removes something has a red dashed line and a filled handle, so that
  the two differ by their shape for a reader who does not tell the
  colours apart. It is not the grey of a control that cannot be used:
  the line and the box take the pointer and the keys as ever.
- **A run** is a sequence of presses of the arrow keys, Page Up or Page
  Down on one threshold, or of Home or End on its line, with less than
  one second between two presses.
- **The filter of the FILTER column** is the filter that leaves out the
  variants that failed their FILTER, of a VCF or of a `.nei` file that
  records the FILTER of its variants, which the check box "Leave
  out the variants that failed their FILTER" turns on and off; its kind
  is `passed` in the project (`docs/specs/core/project.md`). Every text
  of the page and of the specs calls it so.

## What changes for the user

- Each threshold on a histogram is a filter of the project. Moving it,
  typing its number or turning it off is a change of the project, with
  Undo and Redo and no notice.
- A threshold is on or off. Off, its box shows 1 and its line stands
  at the top of the axis, both in grey, with no shading.
- No line under a plot says how many variants or individuals its
  threshold keeps; a threshold that keeps every value of its plot is
  drawn in grey.
- Only the missing rate of the variants starts on, at 0.1.
- A check box "Leave out the variants that failed their FILTER", on by
  default, for a VCF and for a `.nei` file that records the FILTER of
  its variants.
- The thresholds stay where they are when another file is opened.
- Opening a file is not a step of Undo: Undo is disabled after it.
- After a Stop, the plots read so far stay, marked as made from the
  variants read before the Stop.
- The expected heterozygosity keeps its plot and loses its line and its
  box, since popnei has no filter on it.

Nothing the user does here reads the file again, and no plot changes
with a threshold or the check box (the design, "What is read, and
when").

## What it shows

### The order of the page

From the top: the heading "Popnei"; the row of Undo and Redo; the box of
the file; the part "Variants", its four histograms and, once the opening of
the file has said that it records the FILTER of its variants, the check box of the FILTER column; the part "Individuals", its two
histograms and the download of their table; "Open another variants
file…". The row of Undo and Redo is above the box of the file, as the
design places it, and is there before any file is opened, both
disabled, so that the page does not move down when the first file is
opened.

### Undo, Redo and their keys

The row holds the shell's Undo and Redo buttons (`docs/specs/shell.md`,
"The header"), reused and not copied. Each is named, on hover and for a
screen reader, by what it would take back or bring again, "Undo: the
MAF filter changed", from `undo` and `redo` of the store, and is
disabled when there is nothing to undo or redo. When the button that has
the focus becomes disabled, the focus moves to the other one. The keys
are the shell's, from `src/ui/shell/shortcuts.ts`, caught on the whole
window as the shell's header catches them: Ctrl+Z undoes, Ctrl+Shift+Z
and Ctrl+Y redo, and on macOS Cmd+Z and Cmd+Shift+Z. In a number box
with something typed, Ctrl+Z puts back the box's number instead, as on
the old page. An undo or a redo is told as `src/ui/shell/undoRedo.ts`
tells it when the store gives no notice, which on this page it never
does: in the status region, "Undone: the MAF filter changed."

They undo and redo the changes of the filters alone. Opening a file,
the first or another, by the button, a drop or a paste, starts the
page's history afresh: the store's `open` takes the project with the
new file and the filters as the user left them, so that Undo and Redo
are both disabled after it, and the steps before it are gone
(`openVariantsFile` of `src/ui/popgen2Store.ts`;
`docs/specs/core/store.md`, "Commands and events"). The owner decided
on 8 October 2026 that an Undo of an opening is "not necessary". Until
then an opening was a step of Undo, named by the file, "Undo:
panel.nei opened".

The part of the shell's header that draws the two buttons and listens
for the keys is taken out of `src/ui/shell/Header.tsx` into a part that
both pages draw; the old page's header draws it beside Open project…
and Save project, which `popgen2.html` does not have.

### No notice

The page has no notice, as the owner decided on 8 October 2026 after
trying the FILTER box: "Let's assume that the user knows what he's
doing." No change of a filter removes, leaves behind or stops a result
on this page, since the one pass reads no filter, and an opening starts
a new history; so the store gives no notice, and the page draws none.
What a screen reader hears of a change is the change of the control
the user acted on: the check box ticked or not, the slider's value, the
number in the box. Until that day the page drew the shell's notice,
with words of its own, "The MAF filter changed · Undo" and "Statistics
of the file removed because panel.nei opened · Undo": the store was
made for this page with an option, `filterNotices`, under which every
change of a filter gave a notice, and that option is gone.

### A threshold, on and off

Five thresholds, each on its histogram: the missing rate, the MAF and
the observed heterozygosity of the variants, and the missing rate and
the observed heterozygosity of the individuals. Each keeps the variants
or individuals whose value is at most its number. The line and the box
show the project's value, so Undo and Redo move them. The only value
they hold of their own is the number being dragged, typed or moved with
the arrow keys and not yet made a change.

A threshold is in one of three looks. The examples are the missing
rate of the variants of `panel.nei`, whose axis runs from 0 to 0.1, so
that a filter at 0.1 keeps every variant of the plot; for the
individuals the words say "individual".

| | on, some values beyond it, at 0.05 | on, no value beyond it, at 0.1 | off |
|---|---|---|---|
| the box | "0.05" | "0.1", in grey | "1", in grey |
| the line | at 0.05 | at 0.1, the top of the axis, in grey | at the top of the axis, in grey |
| the shading | the bins beyond the line | none, since no bin beyond it holds a variant | none |
| what a screen reader says as the line's value | "0.05" | "0.1, keeps every variant of the plot" | "1, keeps every variant" |
| the description of the box, for a screen reader alone | none | "This filter removes no variant of the plot." | "This filter removes nothing." |

No line under the plot says what a threshold keeps, as the owner
decided on 8 October 2026: "In general we don't need to show the user
how many variants are we going to keep." Until that day each plot had
one, "Keeps 1,050 of 1,200 variants", and a threshold off had "No
filter" in its box, beside its line and in that line; those words go,
and the grey tells what they told. The description of the box is
words a screen reader reads after the box's name and value and the
screen does not show, tied to the box as the description of the FILTER
box is (`aria-describedby`, below, "The FILTER box"); the line's value
is the text a screen reader reads for the slider's number
(`aria-valuetext`). They are there because the grey alone does not
reach a user who cannot see it or tell it apart (WCAG 2.2, 1.4.1 "Use
of color"); a user who sees the plot has, besides the grey, the
absence of any bar drawn as removed. The middle column says "of the
plot" because such a filter still removes what is in no histogram:
the filters of the MAF and of the observed heterozygosity of the
variants drop a variant with no called genotype, and that of the
observed heterozygosity of the individuals an individual with no value
(the sentence of "The individuals with no value", below, says it for
the individuals).

Whether a threshold is grey is worked out on the page, with no pass. A
threshold of the variants is grey when no fine bin of popnei's above it
holds a variant: the fine bins hold their right edge, and the box
rounds a threshold to the step of its axis, which falls on an edge, so
the test is exact (the design, "What a threshold shows on its plot";
the number of bins is the piece `popnei-0.2.2`'s,
`docs/plans/popnei-0.2.2.md`). A threshold of the individuals is grey
when no individual's value of popnei's lies above it. While the file is
read the grey follows the result so far: the missing rate at 0.1 on a
file whose first variants all lie below it is grey, and loses its grey
when a variant above it is read. Nothing is said when the grey comes or
goes; the line's value and the box's description change with it, and a
screen reader reads them when the user next reaches the line or the
box.

The line has two parts, and both are grey together: the line drawn by
the histogram of `src/charts/`, dotted in the grey when the screen asks
for the look of a threshold that keeps everything, as the piece
`popnei-0.2.2` built it (`docs/specs/charts/histogram.md`), and the
handle the user drags, the slider of `src/ui` laid over the plot,
hollow in the grey. A histogram whose filter is off today draws no line
(`docs/specs/charts/histogram.md`); on this page it draws it at the top
of the axis, in the grey.

**Turning a threshold off.** Two ways, as the owner chose on 7 October
2026: emptying the box and then pressing Enter or Tab or clicking
elsewhere; or giving it 1, the value at which a maximum keeps
everything. 1 is off however it is reached: typed; a number typed that
the step of the axis rounds to 1; the line dragged to the top of an axis
that ends at 1, as the MAF's does on most files; or the End key on such
a line. 1 is off and not a filter at 1, so a variant with no called
genotype is kept, as with no filter. Off, the box shows 1 in grey, an
emptied box too once committed. Each of these ways, from a threshold
that was on, is a change whose step of Undo is "the MAF filter was
turned off", with the name of that threshold's filter.

**Turning it on.** Dragging the line, or typing a number other than 1,
turns it on at that value, a change named "the MAF filter was turned
on". From off, the arrow keys on the line turn it on one step below
the top of the axis, Page Down ten steps below, Home at the bottom; Up,
Right, Page Up and End leave it off. In the box, which shows 1, Down and
Page Down do the same as on the line, one and ten steps below the top
of the axis, and Up and Page Up leave it off: the page gives those
values in place of the box's own step below 1, which on an axis of 0 to
0.1 would be 0.999 and widen the axis to 1.

**The top of the axis.** A line dragged to the top of an axis that
ends below 1 is a filter at that value, since the axis ends where the
file's values end: on `panel.nei` the axis of the missing rate runs from
0 to 0.1, and the line at its top is a filter at 0.1, grey, with 0.1 in
its box. A line dragged to the top of an axis that ends at 1 is off, as
said above. A number typed above the top of the axis, below 1, is kept
as typed, and the axis widens to show it, as today. While a threshold is
off its line stands at the top of the axis; when a result so far brings
a higher value and the axis grows to show it, the line moves to the new
top and the filter stays off.

**A number with many decimals** is not refused: the box rounds it to
the step of the axis, as today, the nearest half up, and shows it so,
0.0035 for 0.00345 on an axis of 0 to 0.005; the filter is at that
number, and the shading and the grey are of it.

**A threshold of 0** is a filter at 0, given to popnei as 0, with no
words under the box. The piece `popnei-0.2.2` raised a threshold of the
variants below 0.001 to 0.001, with "Counted as 0.001, the smallest
threshold.", so that the count under the plot was exact; with the count
gone the raise and its words go, as the session decided on 8 October
2026 from the owner's decision.

**A number the box refuses**, above 1, below 0, or with a character it
does not take, gives the sentence under the box of
today, "1.5 is more than 1; the threshold stays 0.1.", and, while the
threshold is off, "1.5 is more than 1; the threshold stays 1."

**The individuals with no value.** Under a histogram of the individuals,
the sentence on the individuals with no called genotype changes, since a
filter that is on now removes them (`individualsKept` of `src/core/`,
where no value is at most any threshold): on, "3 individuals with no
called genotype are not in the histogram, and this filter removes
them."; off, "3 individuals with no called genotype are not in the
histogram." With one individual, "1 individual … removes it." Today's
words, "neither keeps nor removes them", were true of a threshold that
was no filter.

### When a threshold changes the project

One change, with its step of Undo, is made:

- when the user lets go of the line, not while it is dragged;
- when the user presses Enter or Tab in the box, or the box loses the
  focus, with a number typed or an empty box;
- for a run of presses, on the line or in the box: once, one second
  after the last press, or when the focus leaves the line or the box,
  whichever comes first. The line, the box, the shading and the grey
  follow each press at once.

While the line is dragged, a number is typed or a run of presses waits,
the shading of that threshold, and whether it is grey, follow it from
the bins, and nothing else on the page changes. A change that gives the value the
project already has is no change and leaves no step of Undo. So a run
or a drag that ends where it started makes no change, no step of Undo
from off, where the line stands at the top of the axis,
Down then Up ends at the top, and the filter stays off, although a line
dragged there from another place would be a filter at that value.

**The end of a drag, and the keys.** The line is React Aria's slider.
It reports the end of a change (`onChangeEnd`) when the pointer is
released, and also after every press of a key: React Aria treats each
press as a short drag and reports its end (`keyboardUpdate` of its
`useSliderThumb`, which calls `setThumbDragging`, whose end calls
`onChangeEnd` in `useSliderState`). Taken as the end of a drag, that
report would make a change at each press. So the page makes a change
from the line only when the pointer is released, and every press of a
key goes to the run, whatever React Aria reports. The line,
`src/ui/widgets/ThresholdSlider.tsx`, gains a prop that it calls with
the value when the user lets go of the handle after moving it with the
pointer, and never after a key. Page Up and Page Down are already
handled by the line itself, not by React Aria: it moves ten steps and
reports the new value through its `onChange`, as for the other keys, so
they too go to the run.

The reason for the runs: an axis has at most 100 steps of the threshold
(`AXIS_POSITIONS` of `src/core/thresholds.ts`, the step chosen so in
`docs/plans/thresholds.md`, "Round 1 with the owner"), and a held key
repeats. A change at each press would fill the 200 steps of the history
(`MAX_UNDO_STEPS` of `src/core/history.ts`) with two sweeps of an axis
and push every change before them out of it.

**A run waiting is made a change before any other command.** Undo, Redo,
a click on the FILTER box, another threshold,
opening a file, by the button, a drop or a paste: each comes after the
run waiting has been made a change. A click with the mouse on another
control moves the focus to that control before the click acts; the
threshold, losing the focus, makes its change then, so the click comes
after it. Ctrl+Z and Ctrl+Y do not move the focus, so the threshold
catches them itself while it holds a run, makes the change, and lets the
Undo or Redo go on: Ctrl+Z pressed half a second after a run of ten
presses undoes those ten presses, and Redo brings them back. A file
dropped or pasted does not move the focus either, so the opening makes
the run waiting a change first, and also commits a number typed and not
yet committed, as the old page does before an opening (`onCommitReady`
of the number box).

**A threshold that leaves the page.** The statistics leave the state
ready, running or done in two cases: when the worker crashes, which
turns them to the state error, a calculation that failed, shown with
what failed and Start again (see "The states"); and when a Stop comes
before the first result so far, which leaves no plots. In both, the
thresholds leave the page, the one the user is moving among them. A run
waiting, a drag or a number typed and not yet committed is made a
change before its threshold goes, so that what the user did is kept,
with its Undo. The focus, which was on the line or the box that went,
goes to the heading of the page, "Popnei". Otherwise it would be on
nothing, and the next press of Tab would start again from the top of the
page in some browsers and from the end in others.

### The number box

How the box is used, on this page:

- **Typing** changes only the box, the shading and the grey of its
  threshold; the project does not change yet.
- **Enter or Tab**, or clicking elsewhere, makes what is typed a change
  of the project: a number turns the filter on at it, 1 or an empty box
  turns it off. Tab then moves the focus to the next control.
- **Escape** puts back the box's number, the project's value, and so
  does **Ctrl+Z** while something typed is not yet committed. With
  nothing typed, Ctrl+Z is the page's Undo.
- **The Up and Down arrow keys** move the number one step of the axis,
  **Page Up and Page Down** ten steps, as on the line; the presses make a
  run, which becomes one change. In the box of a threshold that is off,
  which shows 1, Down and Page Down turn it on one and ten steps below
  the top of the axis, as on the line, and Up and Page Up do nothing.
  Home and End move the cursor in the text, as in any box of text.

The number box shared by both pages, `src/ui/widgets/NumberField.tsx`,
gains three things that `popgen2.html` alone uses. An option under
which Enter, Tab or leaving a box that was emptied gives the page "off",
through a call of its own; the page then gives the box 1, which it
shows. A look in which its number is drawn in the grey, and a
description read by a screen reader alone, both set by the page. And a
call through which the page chooses the number an arrow key gives,
which the page uses from off. Without them the box is as today: an
emptied box gives nothing and shows its number again. A typed 1 is an
ordinary number to the box; the page turns it into off.

### The starting values and another file

`popgen2.html` gets a first project of its own: the filter of the
missing rate of the variants on at 0.1, the default of
`docs/functionality.md`, the filter of the FILTER column on, and the
four other thresholds off. Opening another file keeps the filters of
the project, so each threshold stays at the value the user left it at;
on the page today they go back to their starting values. When a value
lies above the values of the new file, the axis of that histogram is
widened up to the value so that its line can be seen, as for a number
typed above the axis.

### The expected heterozygosity

Its plot stays, with its title and the count of its variants, and has
no line and no box: popnei has no filter on it.

### The FILTER box

A check box, "Leave out the variants that failed their FILTER", at the
end of the part "Variants", after its four histograms, with one sentence
under it: "The plots show every variant. The ones that failed are left
out of what is downloaded or analysed." Ticking the box changes nothing
on the page but the box, and the sentence says why. On by default. It is a check box and not a switch because it takes
effect later, when the filters are carried out. The check box of the
widgets, `src/ui/widgets/Checkbox.tsx`, takes no sentence under it
today; it gains a prop, `description`, a sentence drawn under the box
and tied to it, so that a screen reader reads it after the box's name
(`aria-describedby`, which names the element that describes another),
and the FILTER box gives it its sentence. The doc comment of the check
box, which says it is for a choice that takes effect "at the next pick
of a file", says instead that it is for a choice that takes effect later
than the click: the next pick of a file on the old page, the carrying
out of the filters on this one.

It is shown only once the opening of the file has answered that its
variants record whether they passed their FILTER, `keepsPassed` true in
the read of the file (`SourceRead` of kind `read`,
`docs/specs/core/project.md`), for a VCF as for a `.nei` file. It is not
shown while the file is being opened, nor after an opening that failed,
whatever the format. The opening ends before the one pass starts, so
from then on the box is there in every state of the statistics,
running, stopped and failed among them, since it is a filter of the
project and no part of the plots. Nothing announces its appearing: it
appears in its place at the end of the part of the variants, as the
plots do. The page reads the read of the file for this, and not
`keepsPassed(source)` of `docs/specs/core/project.md`, which for a file
not yet read answers by its format, `true` for a VCF.

A `.nei` file has the record when popnei wrote it in its vars format
1.2 or later from a source that had the record, and it holds one
variant at least; so a file written from a source that records its
FILTER records it. One written before that format, such as `panel.nei`,
or from such a file, has not, nor has a file with no variant, which
popnei writes with the genotypes alone (the doc comment of
`keepsPassed` in popnei's `variant.ts`). For a file without the record
the box is not shown; the filter stays in the project, does not apply to that file
(`filtersApplied`, `docs/specs/core/project.md`), and is shown again, as
the project holds it, when a file with the record is opened. The owner
decided on 7 October 2026 to show it for a `.nei` file with the record,
since a `.nei` file written from a VCF would otherwise keep its failed
variants with nothing on the page saying so.

Each click is one change, with no notice, as the owner decided on 8
October 2026; a screen reader hears the box ticked or not. Its step of
Undo is named in the box's own words, "the variants that failed their
FILTER are kept" when the box is unticked, "the variants that failed
their FILTER are left out" when it is ticked: the hints of Undo and
Redo, "Undo: the variants that failed their FILTER are kept", and the
words of an undo in the status region, "Undone: the variants that
failed their FILTER are kept." It changes no plot and no count. The count of the
variants that failed their FILTER is in the box of the file, "FILTER
failures: 300" for `low_qual.vcf.gz`, from the one pass, as the piece
`popnei-0.2.2` builds it; a file of which no variant passed is shown as
any other.

### The plots after a Stop

The plots read before a Stop stay on the page, from the store's last
result so far, which it keeps beside the state ready
(`docs/specs/core/store.md`). Each part says so over its plots:

- over each part: "Stopped. The plots are of the variants read before
  the Stop. Start again reads the file from the start.";
- the sentence on the individuals with no called genotype: "3
  individuals with no called genotype before the Stop are not in the
  histogram, and this filter removes them.";
- the description of each plot for a screen reader ends "Drawn from the
  variants read before the Stop." in place of "Drawn from the variants
  read so far."

The room kept under each plot of the individuals for the sentence on
the individuals with no called genotype holds its words of a Stop, so
that the plots do not move at a Stop. The thresholds can be moved
over these plots, and change the project as at any time; their shading
and their grey are of the variants read before the Stop. A Stop before
the first result so far, 2 seconds after the start, leaves no plots, and
each part says "Stopped. Start again reads the file from the start." as
today. Start again and opening another file drop the plots of the Stop.
A failure drops them too, since what was read before popnei refused the
file may be what the refusal is about.

## The states

The states are those of the summary of the variants file, the one
calculation of the page, with what the filters show in each. The row of
Undo and Redo is there in all of them; Undo is disabled after an
opening, until a change of a filter.

| state | what the user sees | what they can do |
|---|---|---|
| empty | no file open: the heading, the row of Undo and Redo, both disabled, "Open variants file…"; no plot, no threshold, no FILTER box | open a file |
| locked | the box of the file says why the statistics cannot be calculated, and each part says it over where its plots go; the FILTER box when the opening of the file said that it records the FILTER of its variants, no threshold | tick the FILTER box; open another file |
| ready | about to start, for a moment: nothing in the parts. After a Stop: the plots read before it, or "Stopped. Start again reads the file from the start." with no plot | move the thresholds over the plots of a Stop; tick the FILTER box; Start again |
| running | the share done over each part, the plots so far from the first result so far, 2 seconds after the start, the thresholds grey or not by the result so far | move the thresholds; tick the FILTER box; Stop |
| done | the six plots, five thresholds, each grey when it keeps every value of its plot, the FILTER box when the opening of the file said that it records the FILTER of its variants | move, type and turn off the thresholds; tick the box; Undo and Redo |
| results removed | never on this page: no filter brings this state, since the one pass's key holds the file and no filter, and opening another file starts a new history, with no notice | |
| error | the box of the file says what failed; each part says "Not calculated." in place of its plots; the FILTER box when the opening of the file said that it records the FILTER of its variants, and none after an opening that failed | tick the FILTER box, when it is there, which does not clear the failure; Start again |

## What it sends and reads

It sends, each with its description, which names its step of Undo:

| what the user does | the command | the description |
|---|---|---|
| any of the five thresholds changed, turned on or turned off, by a drag, a run of keys or the box | `setThreshold(p, threshold, value)`, with the number, or `null` for an emptied box; 1 turns it off there | "the MAF filter changed", "the MAF filter was turned on", "the MAF filter was turned off"; "the filter of the variants by missing data changed", "the filter of individuals by missing data was turned off", and so for each |
| the FILTER box | `setVariantFilter(p, { kind: "passed" })`, `turnOffVariantFilter(p, "passed")` | "the variants that failed their FILTER are left out", "the variants that failed their FILTER are kept" |
| Undo, Redo | `store.undo()`, `store.redo()` | |
| a file opened, by the button, a drop or a paste | `store.open((p) => loadVariants(p, load))`, through `openVariantsFile` | none: no step of Undo |

The page chooses the words of a threshold's description by comparing its
value in the project before the command with its value in the project
the command gives (`thresholdValue` of the project): a number then
another, "changed"; off then a number, "was turned on"; a number then
off, "was turned off"; the same value both times, no command, since
nothing changed. The names of the filters are those of the old page's
commands (`src/ui/steps/variants/commands.ts`,
`individualThresholds.ts`). The name of the filter of the FILTER column,
"The filter of the FILTER column", is added beside the others
(`FILTER_NAMES` of `src/core/analyses/filterCounts.ts`), and its words,
"the FILTER column", beside the words of the other kinds
(`FILTER_KIND_WORDS` of `src/core/project.ts`). The commands are those
of `src/core/project.ts` as `docs/specs/core/project.md` gives them.

It reads the value of each threshold and whether it is on
(`thresholdValue` of the project); whether the filter of the FILTER
column is on, from the filters that are on (`project.filters`) and those
kept with their values while off (`filtersOff`); whether the opening of the
file said that its variants record their FILTER, for whether the box is
shown (`keepsPassed` of the read of the file, `project.variants.read`
of kind `read`, and not `keepsPassed(project.variants)`, which answers
by the format before the read); what Undo
and Redo would do (`undo` and `redo` of the store); and the status of the summary, with its result so far while it
runs and after a Stop. It holds no value of a filter of its own but the
number being dragged, typed or moved by a run of keys.

## Its words

| where | the words |
|---|---|
| the box of a threshold that is off | "1", in the bluish grey of `--chart-threshold-keeps-all`, with a contrast of at least 4.5:1 against the background |
| the box of a threshold on that keeps every value of its plot | its number, "0.1", in the same grey |
| the line's value for a screen reader | on: its number, "0.05"; on and grey: "0.1, keeps every variant of the plot", "… every individual of the plot"; off: "1, keeps every variant", "1, keeps every individual" |
| the description of the box, for a screen reader alone | on and grey: "This filter removes no variant of the plot.", "… no individual of the plot."; off: "This filter removes nothing."; none otherwise |
| a number refused while off | "1.5 is more than 1; the threshold stays 1." |
| the FILTER box | "Leave out the variants that failed their FILTER" |
| under it | "The plots show every variant. The ones that failed are left out of what is downloaded or analysed." |
| after an undo, in the status region | "Undone: the MAF filter changed."; "Undone: the variants that failed their FILTER are kept." |
| the hint of Undo and Redo | "Undo: the MAF filter changed", "Redo: the MAF filter changed", "Undo: the MAF filter was turned off"; of the FILTER box, "Undo: the variants that failed their FILTER are kept" |
| over a part, after a Stop with plots | "Stopped. The plots are of the variants read before the Stop. Start again reads the file from the start." |
| the individuals with no value, on and off | "3 individuals with no called genotype are not in the histogram, and this filter removes them."; "3 individuals with no called genotype are not in the histogram." |

## Accessibility

The criteria named here are those of WCAG 2.2, the standard of
accessibility the applications follow at level AA.

**The order of the Tab key** (2.4.3, "Focus order"): Undo, Redo; Stop or
Start again in the box of the file; then, for each histogram of the
variants with a threshold, its box and its line; the FILTER box, after
the four histograms of the variants and before the part of the
individuals, where it stands; for each histogram of the individuals, its
box and its line; the download of the table of the individuals; "Open
another variants file…".

**What is said without moving the focus** (4.1.3, "Status messages").
An undo or a redo, in the status region. A number refused, as today. A
change of a filter itself is heard as the change of the control the
user acted on, and nothing more is said. Nothing at each press of an arrow
key: the line's value is read as it moves, as of any slider.

**The grey in words** (1.4.1, "Use of color"). A threshold that keeps
every value of its plot, off or on, is shown on the screen by its grey
and by its dotted line and hollow handle, as the owner decided on 8
October 2026, and by the absence of any bar
drawn as removed; off, the box shows 1 besides. A screen reader is told
it in words: the line's value, "1, keeps every variant" off and "0.1,
keeps every variant of the plot" on, and the description of the box,
"This filter removes nothing." off and "This filter removes no variant
of the plot." on (above, "A threshold, on and off"). The token
`--chart-threshold-keeps-all` has a contrast of at least 4.5:1 against
the background, so the grey number in the box meets 1.4.3, "Contrast
(minimum)", and the grey line and handle at least 3:1 against the plot
(1.4.11, "Non-text contrast"), in light and in dark: the browser's own
grey is often fainter, and a number too faint to read would hide the
threshold's value.

**The keys that would be lost.** Ctrl+Z and Ctrl+Y on a line holding a
run are caught by the threshold, as said above, so that a user of the
keyboard never undoes the change before the run while meaning the run.

**To be heard before the plan is settled**, as the design asks: in
VoiceOver on macOS with Safari, a run of ten presses on a line gives one
step of Undo; a box that is off is announced with its value 1 and "This
filter removes nothing.", and the line with "1, keeps every variant";
the FILTER box with its sentence.

## How it is checked

In Playwright on `popgen2.html`, in Chromium and WebKit, on the fixtures
`panel.vcf.gz` and `panel.nei`, and `low_qual.nei`, the `.nei` file
popnei 0.2.2 writes from `low_qual.vcf.gz`, for the FILTER box, beside the checks of
`docs/specs/core/` for the commands:

- the worker receives one request for a file, and none while a threshold
  is dragged, typed, moved with the arrow keys, turned off, undone, or
  the FILTER box ticked;
- a drag gives one step of Undo, and the line and the box go back with
  Undo;
- a run of ten arrow presses gives one step of Undo, and Ctrl+Z pressed
  within the second after it undoes that run;
- emptying the box, typing 1, and dragging the line of the MAF to the
  top of its axis at 1, each turn the filter off, with 1 in the box, the
  line at the top of the axis, both drawn in the grey, no shading, the
  line's value "1, keeps every variant", the box's description "This
  filter removes nothing." and the hint "Undo: the MAF filter was
  turned off"; Undo turns it on again at its value, out of the grey;
- on `panel.nei`, the missing rate of the variants at 0.1, the top of
  its axis, is on and drawn in the grey, with "0.1, keeps every variant
  of the plot" and "This filter removes no variant of the plot."; moved
  to 0.05 it leaves the grey and both texts lose those words;
- the line in the grey is dotted and the handle hollow, the line of a
  threshold that removes something dashed and its handle filled; the
  line in the grey has a contrast of at least 3:1 against the plot
  and the number in the grey at least 4.5:1 against the box, read from
  the computed colours, in light and in dark;
- a threshold typed 0 is a filter at 0, with no sentence under its box;
- from off, Down in the box turns the filter on one step below the top
  of the axis, not at 1 less a step, and the axis keeps its range;
- a run of Down then Up on a line that is off leaves no step of Undo;
- a crash of the worker while a run waits keeps the run, as a step of
  Undo, and puts the focus on the heading;
- the expected heterozygosity has no line and no box;
- the FILTER box is there for `panel.vcf.gz` and for `low_qual.nei`,
  on, once each is opened, and not for `panel.nei`, nor while
  `panel.vcf.gz` is being opened, nor after `no_ploidy.vcf.gz`, whose
  opening fails; turned off for `panel.vcf.gz`, it is
  still off when `low_qual.nei` is opened; a click gives no notice and
  changes no plot, and Undo ticks it again;
- no change gives a notice: the page has no element of the notice's role;
- Undo is disabled after the first file is opened, after a second and a
  third, also when changes of the filters came before; a change of a
  filter after an opening enables it;
- the thresholds stay through the opening of another file;
- after a Stop the plots read so far stay with the words of a Stop, and
  a threshold moved over them changes the project;
- no plot changes with a threshold or the box.

The screens: a threshold off, on with some values beyond it, on and
grey at the top of an axis below 1, and after a Stop; the row of Undo
and Redo, disabled and enabled; the FILTER box, ticked and unticked;
light and dark; 1280 and 320 pixels wide.

In Vitest, beside those: whether a threshold is grey, at an edge of
the fine bins with a variant just above it and with none, and for the
individuals at the largest value and just below it; a run that ends
where it started sends no command; a press of a key on the line never makes a change by itself,
only the end of its run does; the line's prop of the end of a drag is
called at the release of a pointer and not at a key.

## Words and layout chosen by the session, to be changed when the owner tries the screen

- The words a screen reader alone hears for a grey threshold: the
  line's value, "1, keeps every variant" and "0.1, keeps every variant
  of the plot", and the box's description, "This filter removes
  nothing." and "This filter removes no variant of the plot." Settled
  in this set by work package 9 of `docs/plans/filters.md` on 8 October
  2026, over the set the piece `popnei-0.2.2` had built: "0.1, keeps
  every variant", "This threshold removes no variant.", both ending
  "so far" while the file was read, and an announcement, "This
  threshold removes variants." or "This threshold removes no
  variant.", when a number committed in the box turned the grey on or
  off. None of those stays: the words say "of the plot", which the plot
  drawn from a result so far is, and whose description already says
  "Drawn from the variants read so far."; and nothing is announced as
  the grey comes or goes (above, "A threshold, on and off").
- "1.5 is more than 1; the threshold stays 1." for a number refused
  while the threshold is off, the words of a threshold on with 1, the
  number the box shows.
- Down and Page Down in the box of a threshold that is off giving the
  line's values, one and ten steps below the top of the axis, rather
  than the box's own step below 1.
- The sentence under the FILTER box, "The plots show every variant. The
  ones that failed are left out of what is downloaded or analysed.", and
  its steps of Undo in the box's own words, "the variants that failed
  their FILTER are kept" and "… are left out" (8 October 2026).
- How the row of Undo and Redo looks and where in the row the buttons
  stand; the spacing of
  the FILTER box and its sentence.

## Open points

**Open 1, closed.** Whether the MAF and observed heterozygosity plots say
how many variants have no called genotype, which those two filters
remove at any threshold. The owner answered on 7 October 2026: nothing,
as today; the number comes with the tools that carry the filters out.
For a later revision: the count would be the variants of the file less
those in popnei's histogram of the MAF, exact at any number of
individuals (popnei 0.2.1 under node: of four variants, one with no
called genotype, 3 in the MAF's histogram).

## Not in this spec

- The tools section and the download of the filtered file, which wait
  for popnei's issue #13 (the design, "The tools section and the
  download of the filtered file").
- The count of the variants that failed their FILTER, in the box of the
  file: the piece `popnei-0.2.2` (`docs/plans/popnei-0.2.2.md`).
- What all the filters keep together, which comes with the reading that
  carries them out.
- The quiet second before a calculation that reads the filters starts
  by itself, which comes with the first such tool (the design, "When a
  calculation that reads a filter starts by itself").
- The saving of the project on `popgen2.html`: the filters last until
  the tab is closed.
