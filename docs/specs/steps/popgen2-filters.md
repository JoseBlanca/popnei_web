# popgen2.html: the thresholds as filters, with Undo

The screen spec of what `popgen2.html` gains with the design
`docs/designs/stats-filters.md`, approved by the owner on 7 October
2026: the thresholds on the histograms of the statistics become filters
of the project, a check box leaves out the variants that failed their
FILTER, and the page gets Undo, Redo and the notice that says what a
change did. Written on 7 October 2026 and approved by the owner the same day. No
code of it exists yet. What it builds on is the page as the pieces `thresholds` and
`one-pass` left it (`docs/plans/thresholds.md`, `docs/plans/one-pass.md`),
where a threshold is state of the page, changes nothing in the project
and is lost when another file is opened. It covers cases 1 and 2 of
`docs/use-cases.md` up to the point where the filters are carried out,
which waits for the tools section.

The commands of the project, the kind `passed`, the store's setting
that gives a notice for every change of a filter, the failures that
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
- **The notice** is the panel fixed at the bottom of the window that
  says what the last change did, with its Undo (React Aria, the library
  the page's controls are built on, calls such a panel a toast). On the
  old page, `popgen.html`, it is part of **the shell**, the header, the
  stepper and the notice that surround each step.
- **The status region** is a line of the page that is not seen and that
  a screen reader speaks each time its words change; the page puts there
  what it has to tell a user who cannot see the screen and that no
  notice says.
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
  histogram, which shows the same value and takes a typed one. **The
  count under the heading** is the sentence under each histogram's
  heading that says how many variants or individuals the threshold
  keeps.
- **A run** is a sequence of presses of the arrow keys, Page Up or Page
  Down on one threshold, or of Home or End on its line, with less than
  one second between two presses.
- **The filter of the FILTER column** is the filter that leaves out the
  variants of a VCF that failed their FILTER, which the check box "Leave
  out the variants that failed their FILTER" turns on and off; its kind
  is `passed` in the project (`docs/specs/core/project.md`). Every text
  of the page and of the specs calls it so.

## What changes for the user

- Each threshold on a histogram is a filter of the project. Moving it,
  typing its number or turning it off is a change of the project, with
  Undo and Redo and a notice, "The MAF filter changed · Undo".
- A threshold is on or off, and off is said in words: "No filter".
- Only the missing rate of the variants starts on, at 0.1.
- A check box "Leave out the variants that failed their FILTER", on by
  default, for a VCF.
- The thresholds stay where they are when another file is opened.
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
the file; the part "Variants", its four histograms and, for a VCF, the
check box of the FILTER column; the part "Individuals", its two
histograms and the download of their table; "Open another variants
file…". The notice is fixed at the bottom of the window, over the page.
The row of Undo and Redo is above the box of the file, as the design
places it, and is there before any file is opened, since an Undo of the
first opening leaves the page with no file and Redo then brings it back.

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
tells it: by the notice when the store gives one, otherwise in the
status region, "Undone: the MAF filter changed."

The part of the shell's header that draws the two buttons and listens
for the keys is taken out of `src/ui/shell/Header.tsx` into a part that
both pages draw; the old page's header draws it beside Open project…
and Save project, which `popgen2.html` does not have.

### The notice

The shell's notice, `src/ui/shell/Notice.tsx`, with its action, Undo
after a change or a redo and Redo after an undo, and Close. It has no
timer: it stays until the next change replaces it or the user closes it.
Its words are made by a function of the shell (`noticeText` of
`src/ui/shell/words.ts`) that needs only the title of an analysis. It
gets that title today from the words of the old page (`ShellWords`),
which also ask for its steps and its count of the variants kept, none of
which `popgen2.html` has. So the notice reads a set of words of its own,
the title of each analysis, and the old page's words take it in; the old
page gives its titles as today, and `popgen2.html` gives the title of
its one analysis, the summary of the variants file: "Statistics of the
file", the name the section already has for a screen reader.

The store of this page is made with the setting under which every
change of a filter gives a notice (`filterNotices: true`), and with the
first project of this page (`docs/specs/core/store.md`, "The notice, and
the calculations it stops"). On this page such a change removes and
stops nothing, so the notice tells the change alone: "The MAF filter
changed · Undo". Opening another file follows the store's ordinary
rule. With the statistics of the file before done, the notice says
"Statistics of the file removed because a new variants file was loaded ·
Undo"; with them running, "The calculation of Statistics of the file
stopped because a new variants file was loaded · Undo". The first file
opened removes nothing and gives no notice.

### A threshold, on and off

Five thresholds, each on its histogram: the missing rate, the MAF and
the observed heterozygosity of the variants, and the missing rate and
the observed heterozygosity of the individuals. Each keeps the variants
or individuals whose value is at most its number. The line and the box
show the project's value, so Undo and Redo move them. The only value
they hold of their own is the number being dragged, typed or moved with
the arrow keys and not yet made a change.

| | on, at 0.1 | off |
|---|---|---|
| the box | "0.1" | empty, with "No filter" in grey in it |
| the line | at 0.1 | at the top of the axis, with "No filter" beside its handle |
| the shading | the bins beyond the line | none |
| the count under the heading | "Keeps 1,050 of 1,200 variants" | "No filter: keeps every variant" |
| what a screen reader says as the line's value | "0.1, keeps 1,050 of 1,200 variants" | "No filter, keeps every variant" |

The design gives the count under the heading of a threshold that is off
as "Keeps every variant". A screen reader reads that sentence as the
description of the box, and may not read the grey words inside an empty
box; starting the sentence with "No filter:" tells its user that the
empty box means no filter in either case. For the individuals the
sentence says "every individual".

The counts of a threshold that is on are those of today: each threshold
alone, over every variant or individual of the file. They are given as a
range, "Keeps 1,113 to 1,152 of 1,200 variants", when the threshold
falls inside one of popnei's bins, since the bins cannot tell how many
of that bin's variants it keeps (`docs/plans/thresholds.md`, "Round 1
with the owner").

**Turning a threshold off.** Two ways, as the owner chose on 7 October
2026: emptying the box and then pressing Enter or Tab or clicking
elsewhere; or giving it 1, the value at which a maximum keeps
everything. 1 is off however it is reached: typed; a number typed that
the step of the axis rounds to 1; the line dragged to the top of an axis
that ends at 1, as the MAF's does on most files; or the End key on such
a line. 1 is off and not a filter at 1, so a variant with no called
genotype is kept, as with no filter, and the box never shows 1. Each of
these ways, from a threshold that was on, gives the notice "The MAF
filter was turned off · Undo", with the name of that threshold's filter.

**Turning it on.** Dragging the line, or typing a number other than 1,
turns it on at that value, with the notice "The MAF filter was turned on
· Undo". From off, the arrow keys on the line turn it on one step below
the top of the axis, Page Down ten steps below, Home at the bottom; Up,
Right, Page Up and End leave it off. In the empty box the arrow keys do
nothing, as today.

**The top of the axis.** A line dragged to the top of an axis that
ends below 1 is a filter at that value, since the axis ends where the
file's values end: on `panel.nei` the axis of the missing rate runs from
0 to 0.1, and the line at its top is a filter at 0.1. A line dragged to
the top of an axis that ends at 1 is off, as said above. A number typed
above the top of the axis, below 1, is kept as typed, and the axis
widens to show it, as today. While a threshold is off its line stands at
the top of the axis; when a result so far brings a higher value and the
axis grows to show it, the line moves to the new top and the filter
stays off.

**A number the box refuses**, above 1, below 0, with too many decimals
or a character it does not take, gives the sentence under the box of
today, "1.5 is more than 1; the threshold stays 0.1.", and, while the
threshold is off, "1.5 is more than 1; there is still no filter."

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

One change, with its notice and its step of Undo, is made:

- when the user lets go of the line, not while it is dragged;
- when the user presses Enter or Tab in the box, or the box loses the
  focus, with a number typed or an empty box;
- for a run of presses, on the line or in the box: once, one second
  after the last press, or when the focus leaves the line or the box,
  whichever comes first. The line, the box, the shading and the count
  follow each press at once.

While the line is dragged, a number is typed or a run of presses waits,
the shading and the count of that threshold follow it from the bins, and
nothing else on the page changes. A change that gives the value the
project already has is no change and leaves no step of Undo. So a run
or a drag that ends where it started makes no change, no step of Undo
and no notice: from off, where the line stands at the top of the axis,
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
and push the opening of the file out of it, and a screen reader would
read a notice at each press.

**A run waiting is made a change before any other command.** Undo, Redo,
the notice's action, a click on the FILTER box, another threshold,
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

- **Typing** changes only the box, the shading and the count of its
  threshold; the project does not change yet.
- **Enter or Tab**, or clicking elsewhere, makes what is typed a change
  of the project: a number turns the filter on at it, 1 or an empty box
  turns it off. Tab then moves the focus to the next control.
- **Escape** puts back the box's number, the project's value, and so
  does **Ctrl+Z** while something typed is not yet committed. With
  nothing typed, Ctrl+Z is the page's Undo.
- **The Up and Down arrow keys** move the number one step of the axis,
  **Page Up and Page Down** ten steps, as on the line; the presses make a
  run, which becomes one change. In an empty box, a threshold that is
  off, they do nothing. Home and End move the cursor in the text, as in
  any box of text.

The number box shared by both pages, `src/ui/widgets/NumberField.tsx`,
gains an option that `popgen2.html` alone uses: with it, Enter, Tab or
leaving a box that was emptied gives the page "off", through a call of
its own, and an empty box shows the words given with the option, "No
filter". Without the option the box is as today: an emptied box gives
nothing and shows its number again. A typed 1 is an ordinary number to
the box; the page turns it into off.

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
no line, no box and no count under its heading of what a threshold
keeps: popnei has no filter on it.

### The FILTER box

A check box, "Leave out the variants that failed their FILTER", at the
end of the part "Variants", after its four histograms, with one sentence
under it: "The plots show every variant, these among them." Ticking the
box changes nothing on the page but the notice, and the sentence says
why. On by default. It is a check box and not a switch because it takes
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

It is shown for a VCF once the opening has read the file's individuals,
which comes before the one pass starts, and then in every state of the
statistics, running, stopped and failed among them, since it is a filter
of the project and no part of the plots. For a `.nei` file it is not
shown; the filter stays in the project, does not apply to that file
(`filtersApplied`, `docs/specs/core/project.md`), and is shown again, as
the project holds it, when a VCF is opened.

Each click is one change, with its notice: "The filter of the FILTER
column was turned off · Undo", "The filter of the FILTER column was
turned on · Undo". It changes no plot and no count. The count of the
variants that failed their FILTER waits for popnei's issue #12, and a
VCF of which no variant passed is shown as any other.

### The plots after a Stop

The plots read before a Stop stay on the page, from the store's last
result so far, which it keeps beside the state ready
(`docs/specs/core/store.md`). Each part says so over its plots, and
each count under a heading ends with it, in place of "so far":

- over each part: "Stopped. The plots are of the variants read before
  the Stop. Start again reads the file from the start.";
- the count of a threshold of the variants: "Keeps 1,050 of 1,200
  variants read before the Stop";
- of the individuals: "Keeps 40 of 48 individuals, over the variants
  read before the Stop";
- the sentence on the individuals with no called genotype: "3
  individuals with no called genotype before the Stop are not in the
  histogram, and this filter removes them.";
- the description of each plot for a screen reader ends "Drawn from the
  variants read before the Stop." in place of "Drawn from the variants
  read so far."

The room kept for the longest count under a heading holds this ending,
so that the plots do not move at a Stop. The thresholds can be moved
over these plots, and change the project as at any time. A Stop before
the first result so far, 2 seconds after the start, leaves no plots, and
each part says "Stopped. Start again reads the file from the start." as
today. Start again and opening another file drop the plots of the Stop.
A failure drops them too, since what was read before popnei refused the
file may be what the refusal is about.

## The states

The states are those of the summary of the variants file, the one
calculation of the page, with what the filters show in each. The row of
Undo and Redo and the notice are there in all of them.

| state | what the user sees | what they can do |
|---|---|---|
| empty | no file open: the heading, the row of Undo and Redo, "Open variants file…"; no plot, no threshold, no FILTER box | open a file; Undo or Redo when the history has a step, after an opening undone |
| locked | the box of the file says why the statistics cannot be calculated, and each part says it over where its plots go; the FILTER box for a VCF, no threshold | tick the FILTER box; open another file |
| ready | about to start, for a moment: nothing in the parts. After a Stop: the plots read before it with their counts, or "Stopped. Start again reads the file from the start." with no plot | move the thresholds over the plots of a Stop; tick the FILTER box; Start again |
| running | the share done over each part, the plots so far from the first result so far, 2 seconds after the start, the counts ending "so far" | move the thresholds; tick the FILTER box; Stop |
| done | the six plots, five thresholds, the FILTER box for a VCF | move, type and turn off the thresholds; tick the box; Undo and Redo |
| results removed | the store removed the statistics because what they were calculated from changed. No filter brings this state, since the one pass's key holds the file and no filter. Opening another file does: the page draws the section of the new file, and the notice says the statistics of the file before were removed | Undo, which brings back the file before and its statistics |
| error | the box of the file says what failed; each part says "Not calculated." in place of its plots; the FILTER box for a VCF | tick the FILTER box, which does not clear the failure; Start again |

## What it sends and reads

It sends, each with its description, which names its step of Undo and
ends its notice:

| what the user does | the command | the description |
|---|---|---|
| any of the five thresholds changed, turned on or turned off, by a drag, a run of keys or the box | `setThreshold(p, threshold, value)`, with the number, or `null` for an emptied box; 1 turns it off there | "the MAF filter changed", "the MAF filter was turned on", "the MAF filter was turned off"; "the filter of the variants by missing data changed", "the filter of individuals by missing data was turned off", and so for each |
| the FILTER box | `setVariantFilter(p, { kind: "passed" })`, `turnOffVariantFilter(p, "passed")` | "the filter of the FILTER column was turned on", "… was turned off" |
| Undo, Redo, Close of the notice | `store.undo()`, `store.redo()`, `store.dismissNotice()` | |

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
kept with their values while off (`filtersOff`); whether the file is a
VCF, for whether the box is shown (`project.variants.format`); what Undo
and Redo would do and the notice (`undo`, `redo` and `notice` of the
store); and the status of the summary, with its result so far while it
runs and after a Stop. It holds no value of a filter of its own but the
number being dragged, typed or moved by a run of keys.

## Its words

| where | the words |
|---|---|
| the box of a threshold that is off | "No filter", in grey with a contrast of at least 4.5:1 against the box |
| beside the line at the top of the axis, off | "No filter" |
| the count under the heading, off | "No filter: keeps every variant", "No filter: keeps every individual" |
| the line's value for a screen reader, off | "No filter, keeps every variant" |
| a number refused while off | "1.5 is more than 1; there is still no filter." |
| the FILTER box | "Leave out the variants that failed their FILTER" |
| under it | "The plots show every variant, these among them." |
| the notice of a change of a filter | "The MAF filter changed · Undo"; "The MAF filter was turned on · Undo"; "The MAF filter was turned off · Undo"; "The filter of the FILTER column was turned off · Undo" |
| after an undo, by the notice or the status region | "Undone: the MAF filter changed" |
| the hint of Undo and Redo | "Undo: the MAF filter changed", "Redo: the MAF filter changed" |
| over a part, after a Stop with plots | "Stopped. The plots are of the variants read before the Stop. Start again reads the file from the start." |
| a count under a heading, after a Stop | "Keeps 1,050 of 1,200 variants read before the Stop"; "Keeps 40 of 48 individuals, over the variants read before the Stop" |
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
another variants file…". The notice is not in this order: F6 (fn+F6 on
a Mac) moves the focus to it from anywhere on the page, and Escape takes
the focus back to where it was, as on the old page.

**What is said without moving the focus** (4.1.3, "Status messages").
The notice, read once when it appears: once per run of keys, not at
each press. An undo or a redo that gives no notice, in the status
region. A number refused, as today. Nothing at each press of an arrow
key: the line's value is read as it moves, as of any slider.

**Off in words** (1.4.1, "Use of color"). A threshold that is off is
told by the words "No filter" in the box, beside the line and in the
count under the heading, and by the line's value; not by the line's
place at the top of the axis alone, nor by the absence of shading. The
grey of "No filter" in the empty box has a contrast of at least 4.5:1
against the box, in light and in dark (1.4.3, "Contrast (minimum)"):
the browser's own grey for such words is often fainter, and these words
are what tells the user the filter is off.

**The notice over the focus** (2.4.11, "Focus not obscured
(minimum)"). The notice is fixed at the bottom of the window and stays
until it is closed or replaced; at 320 pixels wide it can cover the
control that has the focus, the last threshold or the FILTER box, and a
user of the keyboard would not see where they are. The page keeps room
at its bottom as tall as the notice while the notice is up, so that the
browser scrolls the control with the focus above it.

**The keys that would be lost.** Ctrl+Z and Ctrl+Y on a line holding a
run are caught by the threshold, as said above, so that a user of the
keyboard never undoes the change before the run while meaning the run.

**To be heard before the plan is settled**, as the design asks: in
VoiceOver on macOS with Safari, a run of ten presses on a line gives one
notice; the empty box is announced with "No filter: keeps every
variant"; the FILTER box with its sentence.

## How it is checked

In Playwright on `popgen2.html`, in Chromium and WebKit, on the fixtures
`panel.vcf.gz` and `panel.nei`, beside the checks of
`docs/specs/core/` for the commands:

- the worker receives one request for a file, and none while a threshold
  is dragged, typed, moved with the arrow keys, turned off, undone, or
  the FILTER box ticked;
- a drag gives one step of Undo, and the line and the box go back with
  Undo;
- a run of ten arrow presses gives one step of Undo and one notice, and
  Ctrl+Z pressed within the second after it undoes that run;
- emptying the box, typing 1, and dragging the line of the MAF to the
  top of its axis at 1, each turn the filter off, with "No filter" in
  the box and beside the line, no shading and the notice "The MAF filter
  was turned off · Undo"; Undo turns it on again at its value;
- a run of Down then Up on a line that is off leaves no step of Undo
  and no notice;
- a crash of the worker while a run waits keeps the run, as a step of
  Undo, and puts the focus on the heading;
- the expected heterozygosity has no line and no box;
- the FILTER box is there for `panel.vcf.gz`, on, and not for
  `panel.nei`; a click gives a notice and changes no plot;
- the thresholds stay through the opening of another file;
- after a Stop the plots read so far stay with the words of a Stop, and
  a threshold moved over them changes the project;
- no plot changes with a threshold or the box.

The screens: a threshold off, on, and after a Stop; the notice up; the
FILTER box; light and dark; 1280 and 320 pixels wide; and at 320 pixels
the notice up with the focus on the last control of the page, the
notice not over it.

In Vitest, beside those: a run that ends where it started sends no
command; a press of a key on the line never makes a change by itself,
only the end of its run does; the line's prop of the end of a drag is
called at the release of a pointer and not at a key.

## Words and layout chosen by the session, to be changed when the owner tries the screen

- The title of the page's one analysis in the notice, "Statistics of
  the file", the name the section already has for a screen reader.
- "No filter:" at the start of the count under the heading of a
  threshold that is off, where the design has "Keeps every variant".
- "1.5 is more than 1; there is still no filter." for a number refused
  while the threshold is off, after the old page's distance of the LD
  pruning, which says it "is still to be typed".
- The sentence under the FILTER box, "The plots show every variant,
  these among them."
- How the row of Undo and Redo looks and where in the row the buttons
  stand; where "No filter" goes beside the handle of the line; the grey
  of the words in the empty box; the spacing of the FILTER box and its
  sentence.

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
- The count of the variants that failed their FILTER, which waits for
  popnei's issue #12.
- What all the filters keep together, which comes with the reading that
  carries them out.
- The quiet second before a calculation that reads the filters starts
  by itself, which comes with the first such tool (the design, "When a
  calculation that reads a filter starts by itself").
- The saving of the project on `popgen2.html`: the filters last until
  the tab is closed.
- Exact counts of a threshold on every edge of popnei's bins, popnei's
  issue #11.
