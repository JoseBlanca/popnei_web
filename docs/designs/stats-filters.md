# The thresholds of the statistics as filters

A design of 6 and 7 October 2026, approved by the owner on 7 October
2026, and revised the same day with the owner's decision on the FILTER
box of a `.nei` file and with the exact counts of popnei 0.2.2, and
revised again on 8 October 2026 with the owner's decisions after trying
the page: no line of what a threshold keeps, and a threshold that keeps
every value of its plot drawn in grey (below, "What the owner
decided"); that grey is the bluish grey that the piece `popnei-0.2.2`
built the same day, the token `--chart-threshold-keeps-all`, with the
line dotted and the handle hollow (below, "What a threshold shows on its
plot"). It
decides how the thresholds that the user drags on the histograms of
`popgen2.html` become filters of the project, with Undo; how the FILTER
column becomes a filter; what the page reads from the file, and when,
under the owner's rule of one pass per file; and where the page will
offer what is done with the variants the filters keep, a tools section
whose first tool is the download of the filtered file. Until it is
approved nothing of it is built: the thresholds of the piece
`thresholds` (plan `docs/plans/thresholds.md`, merged into `main` on 7
October 2026) are state of the page, change no statistic and are lost on
a reload. The page and its one pass over the file are those of
`docs/plans/live-stats.md`, without the second pass that counted the
FILTER failures, which the piece `one-pass` (`docs/plans/one-pass.md`)
takes out. The filters and the writing of the old page, `popgen.html`,
are those of `docs/architecture.md`, sections 2 to 8, which this design
reuses and changes in the places its section "What changes in
`docs/architecture.md`" lists.

The owner decided on 7 October 2026 what this version follows: the
thresholds become filters of the project, with Undo; a check box "Leave
out the variants that failed their FILTER", on by default, for a VCF
and for a `.nei` file that records the FILTER of its variants; one pass per file, and no pass while the thresholds or the box
change; the FILTER filter acts when the filtering is carried out, after
the individuals are judged, so that a VCF of which no variant passed is
shown as any other; the plots of the variants always describe every
individual; no count of the FILTER failures until popnei's issue #12,
which popnei 0.2.2 closed, and with which the piece `popnei-0.2.2`
(`docs/plans/popnei-0.2.2.md`) puts the count in the box of the file;
the line of the expected heterozygosity taken off, its plot kept; the
plots read so far kept after a Stop; and a tools section whose download
waits for popnei's issue #13.

## The design in short, for the owner

This section holds what the approval rests on; the sections after it
are for the reviewers and the builders of the piece, and can be skipped.

**The project** is everything the user has set on the page: the file
open, the filters and their values. Undo and Redo step through its
earlier values. The old page saves it as a project file; the new page
saves nothing yet, so the filters last until the tab is closed.

**What the page reads.** At the opening of a file, one reading, as
today: the count of the variants, each individual's missing rate and
heterozygosity, and the histograms of the variants, all over every
variant and every individual of the file. Nothing else is read while
the user works on the thresholds: moving a line, typing a number,
ticking the FILTER box or pressing Undo changes the project and the
shading of the plots, and reads nothing. The plots never change with a
threshold.

**What a threshold shows.** Its line on the plot, its number in its
box, and the bars beyond it shaded as left out. No line under the plot
says how many variants or individuals it keeps, as the owner decided on
8 October 2026: "In general we don't need to show the user how many
variants are we going to keep." A threshold that keeps every value of
its plot, off or on, has its line and the number in its box drawn in
grey. How many variants all the filters keep together comes with the
reading that carries the filtering out, the download or an analysis,
which gives what each filter kept.

**The FILTER box.** At the end of the part of the variants, on by
default, for a VCF and for a `.nei` file that records whether each of
its variants passed its FILTER. It is not shown, and the filter does not
apply, for a `.nei` file without that record, one written before
popnei's vars format 1.2, such as `panel.nei` of the tests, since popnei
cannot filter its variants so. popnei 0.2.2 says which a file is once it
is open, before any pass, and the box is shown only once that answer has
come, for a VCF as for a `.nei` file: not while the file is being
opened, nor after an opening that failed. It acts when the
filtering is carried out, after the individuals are judged: an
individual's missing rate and heterozygosity are those of the plots,
over every variant, and the variants that failed are left out after.
So a VCF of which no variant passed is shown as any other. Ticking the
box changes no plot and no count on the page, only the project and the
notice; what it does is seen in what a tool reports. The box counts
nothing: the count of the failures is in the box of the file, "FILTER
failures: 300" for `low_qual.vcf.gz`, from the one reading, as the piece
`popnei-0.2.2` builds it.

**The download.** A "Tools" section after the plots, whose first tool
is "Download filtered file…", as a `.nei` file or a VCF. It waits for
popnei's issue #13: popnei builds the whole file in memory before
handing it over, about 800 MB for a VCF of 100,000 variants and 1,000
individuals, which the owner judged unacceptable. Until then the page
has no tools section, and the filters are set and kept, with Undo, but
not yet carried out by anything.

**What approving commits to that is hard to undo.** The FILTER box is a
new kind of filter in the project file. A project file holding it
cannot be opened by an older version of the application, and the old
page, `popgen.html`, refuses it, since it has no box to show it. Nobody
loses anything today: the new page saves no project file yet.

**Undo and Redo on the new page.** `popgen2.html` has neither today,
nor the notice that says what a change did. It gains a row with Undo
and Redo, their keys, and the notice, "The MAF filter changed · Undo".
A threshold is on or off. Off, its box shows 1 in grey, the value at
which it keeps everything, its line stands at the top of the axis in
grey, and nothing is shaded. Only the missing rate of the variants
starts on, at 0.1. A threshold that is on and keeps every value of its
plot, a line dragged to the top of an axis that ends below 1, is drawn
in grey too and stays a filter, since popnei's filters of the MAF and
of the observed heterozygosity drop a variant with no called genotype
at any value.

**The owner's choices.** On 7 October 2026: the design approved; a
threshold turned off by emptying its box or typing 1; and, after the
approval, the FILTER box for a `.nei` file that records the FILTER of
its variants. On 8 October 2026, after trying the page: no line of what
a threshold keeps; a threshold that keeps every value of its plot shown
by its line and its number in grey, not by words; and the FILTER box
built soon, right after Undo and Redo.

## What the user can do once it is built

Cases 1 and 2 of `docs/use-cases.md`: the user reads the distributions
of the open file, sets on them the thresholds of the filters, sees on
each plot what its threshold would leave out, and changes them, with Undo and Redo, until the
thresholds are the ones they want to work with. Carrying the filters
out, the download and the analyses, comes with the tools.

- A threshold on the missing rate, the major allele frequency or the
  observed heterozygosity of the variants, and on the missing rate or
  the observed heterozygosity of the individuals, is a filter of the
  project. The expected heterozygosity has no threshold: popnei has no
  filter on it.
- A check box at the end of the part of the variants, "Leave out the
  variants that failed their FILTER", on by default, for a VCF and for
  a `.nei` file that records the FILTER of its variants.
- Every change of a threshold or of the box is a change of the project,
  with Undo and Redo, and a notice that says what changed.
- No plot changes with a threshold or the box: each plot shows the
  whole file, and its threshold shades what it would leave out.

## The terms

- **A threshold** is the line the user drags on a histogram, with its
  number box. It keeps the variants or individuals at most its number.
- **A filter** is a threshold, or the check box of the FILTER column,
  that the project holds, with the other filters, in `Project.filters`
  and `Project.individualFilters` (`docs/architecture.md`, section 2).
- **The key** of a result is the hash of everything it was calculated
  from (section 3). A result is shown only under the key the current
  project gives it.
- **The one pass** is the summary of the file of `live-stats`, one call
  of popnei's `calcVariantsSummary`: the count, the value of each
  individual, and the histograms of the variants over every individual
  and every variant. Its key holds the file and no filter.
- **The individuals kept** are those that the filters of the
  individuals leave, which the page works out from popnei's value of
  each individual in the one pass (`individualsKept` of `src/core/`),
  since popnei filters individuals only by a list.
- **Carrying the filters out** is a reading of the file with every
  filter, in the order of section 2, the individuals kept given to
  popnei as a list: the writing of a filtered file, or an analysis.
- **The worker** is the second thread of the browser tab in which
  popnei runs, so that the page does not freeze during a pass; it holds
  the open file and runs one calculation at a time. A calculation that
  is no longer wanted is stopped by ending the worker and starting
  another, which opens the file again.

## What is read, and when

| reading | what it gives | its key holds | when |
|---|---|---|---|
| the one pass | the count, the value of each individual, the histograms of the variants | the file | once per file, when it is opened, and at Start again after a Stop |
| carrying the filters out | the file written, or an analysis, with what each filter kept | the file, every filter that applies to it, and the individuals kept | when the user starts a tool |

Nothing else reads the file. The chain of `popgen2.html`, the
calculations that start by themselves (`src/ui/autoRuns.ts`,
`docs/architecture.md` section 5), is the one pass alone, as the piece
`one-pass` leaves it. In particular these do not run on `popgen2.html`,
by the owner's decisions of 7 October 2026:

- the counts of the filters (`filterCounts` of the old page), what all
  the filters keep together, at the opening or at each change: that
  count is given by the reading that carries the filters out, from
  popnei's counts of its pass (`Written.passStats` of
  `src/worker/protocol.ts` for the writing);
- the histograms of the variants over the individuals kept
  (`variantChecks`): the four histograms of the variants are always
  over every individual, and a threshold of the individuals acts when
  the filters are carried out;
- a separate count of the FILTER failures: the one pass gives it from
  popnei 0.2.2 (the piece `popnei-0.2.2`), and it changes nothing else
  here.

The store of `popgen2.html` keeps `counts` and `statistics` at `null`,
as today (`StoreConfig` of `src/core/store.ts`), and `POPGEN2_ANALYSES`
of `src/core/apps.ts` does not change. The piece of the first tool
names the one pass, `variantsSummary`, as the page's `statistics`: the
store works out the individuals kept, and why a request would keep none
(`keptNoneReason`), from that setting, and it must read the one pass's
finished result only, so that a tool started after a Stop waits for a
whole pass rather than judging the individuals over part of the file.

The price of this choice is that what a plot shades, each threshold
alone over the whole file, can differ from what the filters leave out
once carried out: a variant's missing rate over the individuals kept is
not its missing rate over every individual, and the variants that
failed their FILTER are among those drawn. The owner chose it so that
the page reads each file once.

## The FILTER filter

A filter of the variants of a new kind, `passed`, with no number:
popnei's step `filterPassed`, which keeps the variants whose FILTER is
`PASS` or a dot. The page opens every VCF with `onlyPassed: false`, as
`live-stats` does, so that the box, and not the opening, decides. The
old page keeps its option of the reading, with its default.

It acts when the filters are carried out, after the individuals are
judged, as the owner chose: the individuals kept are worked out from
the one pass, over every variant, and the reading that carries the
filters out takes the failed variants out. In the steps of that reading
it comes after the regions and before the list of the individuals
(section 2), where popnei accepts it (`filterPassed` throws only after
`filterFirstN`, of `Variants` in popnei 0.2.1); its place among the
steps changes neither the individuals, which are judged before the
reading, nor which variants are kept: every filter of the variants but
the pruning by linkage disequilibrium judges a variant by itself, and
the pruning comes after them all. What moves with its place is the
count each filter reports, given and kept, as section 2 says of the
order of the filters.

A VCF of which no variant passed is shown as any other, since the one
pass reads every variant. Carried out with the box on, its filters keep
no variant, and popnei refuses a pass that gives none; the tool then
says that no variant of the file passed its FILTER and that turning the
box off keeps them. The count of the failures in the box of the file,
from the one pass, says it before.

It is on by default on `popgen2.html`: that page gets a first project of
its own (`firstProject("popgen")` is shared today by both pages'
stores), which holds it beside the filter of the missing rate of the
variants at 0.1. The old page's first project does not change.

The old page does not offer the filter. A project file that holds it,
on or turned off, saved by `popgen2.html` once that page saves
projects, is refused by `popgen.html` with words that say it was made
by the new page: the old page has no box to show it or turn it off, so
its user would have variants left out with nothing on the screen saying
so. A filter turned off is refused too, so that the rule is one line
and a later click cannot turn on a filter that page cannot show.

On a `.nei` file the box is shown when the file records whether each of
its variants passed its FILTER, and not otherwise, as the owner decided
on 7 October 2026. popnei writes that record from its vars format 1.2,
when the source had it and the file holds one variant at least: a
`.nei` file written from a VCF by popnei 0.2.1 or later has it, unless
it holds no variant, and one written before format 1.2, as `panel.nei` of
the tests, or from such a file, has not; popnei refuses `filterPassed`
over a file without it. popnei 0.2.2 says which, once the file is open
and with no pass, in `keepsPassed` of its `Variants`, true for every
VCF. So the calculation worker sends that value with the individuals and
the ploidy when it opens the file, and the project holds it in what was
read of the file. The approved version of this design, under popnei
0.2.1, which could not tell the two kinds of `.nei` file apart, left the
filter out for every `.nei` file; a `.nei` file the page writes from a
VCF would then have kept its failed variants with nothing on the page
saying so: one written by popnei 0.2.1 from `low_qual.vcf.gz` holds the
record, and `filterPassed` over it keeps 900 of its 1,200 variants.

A new file keeps the filters of the project, so a user who had the box
on for a VCF and opens a `.nei` file without the record still has it in
the project; for that file the filter does not apply. So one function of
`src/core/`, the filters that apply to the project's file
(`filtersApplied`), leaves it out for a file whose variants do not
record their FILTER, and everything that reads the filters reads that
function rather than `p.filters`: the requests and the keys of the
readings that carry the filters out, the rows and check numbers of the
counts of each filter they give, the scripts, the words of the warnings.
Opening a file with the record gives it back.

In the code it changes the answer of the calculation worker to the
opening of a file, `opened`, which gains `keepsPassed`, and the read of
the file in the project, which holds it; and the kinds of filter a
project and its file can hold: `VariantFilterKind` of `src/worker/protocol.ts`, from which the
kinds of the project come, `VARIANT_FILTER_ORDER`, the tables of the
project that take a kind with no number (`Kinds`, `filtersOff`), the
check of the messages (`checkFiltering`, `PROTOCOL_VERSION`), the steps
of the runner, the words of each kind (`FILTER_KIND_WORDS`), every
`script()`, and the reading of the project file. The filter is carried
in the `filters` of a request as any filter is, and the runner's
`Steps` puts it after the regions and before the list of the
individuals.

## When a threshold changes the project

A threshold changes the project, one change with its Undo, when the user
lets go of the line, presses Enter or leaves the number box. The arrow
keys, on the line or in the box, move the threshold at once, and the
presses of one run make one change, at a quiet second after the last
press or when the focus leaves: an axis has about 100 positions and a
held key repeats, so a change at each press would fill the 200 steps of
the history (`MAX_UNDO_STEPS` of `src/core/history.ts`) with two sweeps
of an axis and drop the opening of the file from it. While the line is
dragged or a number is typed, the shading of that threshold, and
whether it is grey, follow it from the bins, with no change of the
project. The
check box changes the project at each click.

The line and the box show the project's value, so Undo moves them back.

A threshold is on or off, and where the line stands does not tell the
two apart. The top of an axis is no stand-in for off: the axis is the
range of the file's values, rounded out, 0 to 0.1 for the missing rate
of `panel.nei`, and it widens while the pass reads; and a filter at any
value is not the same as no filter, since popnei's filters of the MAF
and of the observed heterozygosity drop a variant with no called
genotype at every threshold, and `individualsKept` drops an individual
whose heterozygosity has no value. Under popnei 0.2.1, on a VCF of
three variants of which one has no called genotype, a MAF filter at 1
keeps two variants, and no filter keeps three.

So, on `popgen2.html`: the filter of the missing rate of the variants
starts on at 0.1, the default of `docs/functionality.md`, and the
others start off. A threshold that is off shows 1 in its box, the value
at which a maximum keeps everything, and its line at the top of the
axis, both in grey, with no shading. Until 8 October 2026 this design
had the box empty with the words "No filter" in it and beside the line,
and a line "Keeps every variant" under the plot; the owner chose on 8
October 2026, after trying the page, to show it by the grey alone, with
no words on the screen (below, "What a threshold shows on its plot").
Dragging the line or typing a number turns the filter on at that value.
Two things turn it off, as the owner chose on 7 October 2026: emptying
the box, and typing the value at which the filter would keep
everything, 1 for a maximum and 0 for a minimum. Every threshold of
this page is a maximum, so typing 1 turns it off, and an emptied box,
once committed, shows 1 in grey. That value is taken as off, not as a
filter at 1, so a variant with no called genotype is kept, as with no
filter. The value 1 is off however it is reached, typed or dragged, as
the session settled on 7 October 2026 after the approval. A line dragged
to the top of an axis that ends below 1 is a filter at that value, since
the axis ends where the file's values end; it keeps every value of the
plot, so it is drawn in grey too, and its box shows that value, not 1.
The number box shared by both pages, `src/ui/widgets/NumberField.tsx`,
gives nothing today for an empty box and shows its value again; it
gains an option, used by `popgen2.html` only, under which Enter or
leaving an empty box commits "off"; a typed 1 is an ordinary number to
the box, and the page turns it into off. From off, the Down arrow key,
on the line or in the box, turns the filter on one step below the top
of the axis, and Up does nothing; in the box the page gives that value
rather than the box's own step below 1, which would lie far above an
axis that ends below 1 and widen it. Off, the project keeps it aside with its last
value, in `filtersOff` for the variants and `individualFiltersOff` for
the individuals, as it keeps a filter the user turns off on the old
page. A number typed above the axis is kept as typed, and the axis
widens to show it (`histogramScales`), as today.

The presses of one run of arrow keys not yet made a change are made one
before any other command reaches the project: Undo, Redo, a click on
the box, another threshold, opening a file. A click elsewhere takes the
focus from the line, and leaving it makes the change, before the click
acts. Ctrl+Z and Ctrl+Y keep the focus on the line, and are caught on
`window` by the page; so the line catches them itself while it holds
presses not yet made a change, makes the change, and then lets the
Undo or Redo go on, as the number box already catches Ctrl+Z while
something is typed in it. Otherwise Undo pressed in
the quiet second would undo the change before the run, and the run,
made a change after it, would clear Redo; or the run would land on the
project of another file.

A new file keeps the filters of the project, as on the old page, so the
thresholds stay where the user left them when another file is opened;
today they go back to their starting values.

## The plots after a Stop

The one pass is the only calculation, and its key holds the file alone,
so no change of a filter empties a plot. After a Stop the plots read so
far stay, as the owner chose, each with its line saying that it is of
the variants read before the Stop. They are of the current key, so the
invariant that no result is shown stale holds: a result so far of the
file on the screen, marked as partial. The store keeps, for a
calculation the user stopped, its last result so far beside the state
`ready` (`stopped: { soFar }`), never cached, with no check numbers,
dropped by Start again or a new file. It is kept under the key of the
one pass and shown only while that key is the current one; a change of
a filter, which does not change that key, keeps it. A failure still
drops the plots, since what was read before a refusal of the file may
be what the refusal is about.

A failure of the one pass that is not popnei's, the worker ending, is
today cleared by every change the user makes (`failures.clear()` in
the store's handling of a change), so that a calculation can be tried
again. On the old page that is right, since a change gives new keys.
On `popgen2.html` a change of a filter gives the one pass no new key,
so the store clears only the failures of the calculations whose
inputs the change altered, which a change of a filter does not do for
the one pass: a click on the FILTER box after a crash does not wipe the
message of the crash; Start again tries again.

The thresholds can be moved over the plots of a Stop, and their
shading and their grey are then of the variants read, as each part
says over its plots.

## Undo, Redo and the notice of a change on `popgen2.html`

`popgen2.html` has none of the three today: its page has no shell
(`src/ui/popgen2.tsx`, "without the stepper, the saving and the
shell"), and the buttons of Undo and Redo, their keys (Ctrl+Z, Ctrl+Y
and Cmd+Shift+Z, caught in the shell's header through
`src/ui/shell/shortcuts.ts`) and the notice (`src/ui/shell/Notice.tsx`)
are the shell's. The page gains a header row above the box of the file
with the two buttons, the keys caught as the shell catches them, and
the notice under it, reused from the shell rather than copied. The
notice takes its words from the shell's words (`ShellWords` of
`src/ui/shell/words.ts`), which ask for the old page's steps and counts
that `popgen2.html` does not have; so the words the notice needs are
split out of them into a set of their own, which both pages give.

The store gives no notice today for a change that removes, leaves
behind or stops no result (`changedByUser` of `src/core/store.ts` sets
the notice to `null`), which is every change of a threshold on this
page. So the store gains a setting, on for `popgen2.html` only, under
which a change of a filter always gives a notice, which says what
changed, "The MAF filter changed · Undo". The old page does not turn it
on: its number boxes make a change at every press of an arrow key, and
a screen reader would read a notice at every press of a held key. On `popgen2.html` no calculation is left behind by such a
change, so the notice says nothing of calculations stopped. With the presses of one
run of arrow keys made one change, a screen reader says the notice once
per run, not at every press.

## When a calculation that reads a filter starts by itself

None does on `popgen2.html` with this design. The tools are started by
the user. When a later tool, a population analysis or the GWAS, starts
by itself and reads the filters, two choices the owner made on 6
October 2026 apply, and are built with it:

- **A quiet second.** After a change of a filter, `autoRuns.ts` starts a
  calculation under a new key only once the filters have had no change
  for one second, so that ten presses of an arrow key start one
  calculation, not ten that are each stopped, each stop a restart of
  the worker.
- **Keys left behind start again when the project comes back to them.**
  When the store stops a calculation because a change left its key
  behind, `autoRuns.ts` forgets that key, so that an Undo starts it
  again, unless its result is in the cache. Built on 8 October 2026,
  before any such tool, for the pass of the file on `popgen2.html`: a
  file opened while the pass of the file before it ran, then undone,
  showed that pass as stopped though the user had pressed no Stop.

The limit that `docs/architecture.md` section 5 records for the piece of
the filters, that every change of a threshold would stop the
calculation running, moves to that later piece.

## What a threshold shows on its plot

No count, as the owner decided on 8 October 2026: the line, the number
in the box, and the bars beyond the line shaded as left out, from
popnei's bins of the variants and from popnei's value of each
individual, with no pass. Until that day each plot had a line under it,
"Keeps 1,050 of 1,200 variants", made exact by popnei 0.2.2's bins.

A threshold that keeps every value of its plot is drawn in grey, its
line, its handle and the number in its box: off, at 1; and on, at a value no
variant or individual of the plot lies above, as a line dragged to the
top of an axis that ends below 1. A threshold of the variants keeps
every value of its plot when no bin above it holds a variant. popnei
0.2.2's fine bins hold their right edge, at k/n of 0 to 1, and the box
rounds a threshold to the step of its axis, so a threshold falls on an
edge and that test is exact; the number of bins is the piece
`popnei-0.2.2`'s (`docs/plans/popnei-0.2.2.md`), 1,000 as built on 7
October 2026, where this design had asked for 10,000. A threshold of the
individuals keeps every value of its plot when no individual's value
lies above it. While the file is read the grey follows the result so
far, so a threshold grey at first can lose its grey when a higher value
arrives.

The grey is the one that the piece `popnei-0.2.2` drew on 8 October
2026, which this design takes as it is: a bluish grey of its own, the
token `--chart-threshold-keeps-all` of `src/ui/tokens.css`, a grey with
some of the blue of the bars, #54758c in the light theme and #6387a1 in
the dark, and not the grey of a control that cannot be used, since the
threshold can still be moved, as the owner asked that day. The line,
the handle and the number take that one token. The grey differs from
the red of a threshold that removes something by its shape as well, for
a reader who does not tell the colours apart: its line is dotted and its
handle hollow, an outline over the background, where the red line is
dashed and its handle filled.

A threshold that is on and grey is still a filter: the filters of the
MAF and of the observed heterozygosity drop a variant with no called
genotype, which is in no histogram, and that of the observed
heterozygosity of the individuals drops an individual with no value. So
a screen reader is told what the grey means in words, since the grey
alone would not reach its user (WCAG 2.2, 1.4.1 "Use of color"): the
line's value says it keeps every variant of the plot, and the box's
description says that the filter removes nothing, or nothing of the
plot when it is on (the screen spec gives the words). The token has a
contrast of at least 4.5:1 against the background, as the number is
text, and so at least 3:1 for the line against the plot, in both
themes.

A threshold of 0 is a filter at 0, given to popnei as 0. The piece
`popnei-0.2.2` had raised a threshold of the variants below 0.001 to
0.001, with the words "Counted as 0.001, the smallest threshold.",
because its first bin holds 0 and the values up to 0.001 and the count
under the plot had to be exact; with no count, the raise and its words
go, as the session decided on 8 October 2026 from the owner's decision.

## The expected heterozygosity

popnei has no filter on the expected heterozygosity, so its plot keeps
no line, as the owner chose: the plot stays, with its title and the
count of its variants, and no line and no box.

## The tools section and the download of the filtered file

A section of its own after the statistics and before "Open another
variants file…", named "Tools", whose first tool is "Download filtered
file…". The population analyses and the GWAS join it as each is built,
not before, and the section is not on the page until its first tool is:
a button that does nothing yet is not on the page.

The download waits for popnei's issue #13,
https://github.com/JoseBlanca/popnei/issues/13. popnei's `writeVars`
and `writeVcf` build the whole file in the memory of the worker before
it crosses to the page: a VCF of 1,000 diploid individuals and 100,000
kept variants is about 400 MB uncompressed (four characters per
genotype), about 800 MB in the worker, on top of the open file, held
until the worker restarts, where a browser tab runs out of memory
somewhere above 2 to 4 GB. The owner judged that unacceptable on 7
October 2026. With the file handed over in pieces, the download offers
both formats, `.nei` and VCF.

What is settled now, for its plan: it reuses the writing of the old
page (`docs/architecture.md` section 5, "Writing the filtered variants
is a request of the calculation worker"; section 6, "The files
written"): one request with the load, the filters that apply and the
individuals kept, a key, its progress and Stop, and the file saved by
the browser's download, not `showSaveFilePicker`, which only Chrome
has. The writing gains the VCF (`WriteJob.format` is `"nei"` alone
today). Its result gives what each filter kept, which the page shows as
the count of the variants and individuals the filters keep together.
It is started by the user, and the chain starts nothing while it runs.
The format is chosen in a small dialog opened by the button, a
`<dialog>` with `showModal`, within the floor of `docs/technology.md`.

## The invariants

The six invariants of the `designing` skill hold as they are. No result
is shown stale: the one pass's key is the file, which no filter
changes, and the plots after a Stop are of that key, marked as partial.
The project stays one immutable value, and every change of a threshold
or of the box is a command of `src/core/project.ts`; the line and the
box show the project's value, and hold of their own only the value
being dragged or typed, which is no part of the project. The two
workers, one request at a time each, and a cancel that restarts the
worker, do not change; with this design no change of a filter stops a
calculation.

## How it is tested, and what would prove it wrong

- In `src/core`: each command of a threshold and of the box gives one
  change of the project, with its notice, and Undo gives the value
  back; emptying a box or typing 1 turns its filter off and keeps its
  value aside; a threshold is grey exactly when no bin, or no
  individual's value, of its plot lies above it, and 0 is given to
  popnei as 0;
  a failure of the one pass survives a change of a filter; `filtersApplied` leaves `passed`
  out for a file whose variants do not record their FILTER and keeps it
  for a VCF and for a `.nei` file that records it; a project file holding
  `passed` reads back the same, and the old page's reading refuses it.
- In Playwright, on `popgen2.html` in Chromium and WebKit: the worker
  receives one request for a file, and none while a threshold is
  dragged, typed, moved with the arrow keys, undone, or the box turned;
  a run of ten arrow presses is one step of Undo, and Ctrl+Z pressed
  within the quiet second undoes that run; after a Stop the
  plots read so far stay, with the words of a Stop; a threshold off shows 1 and
  its line in grey, as does one dragged to the top of an axis that ends
  below 1; the FILTER box is shown for
  `panel.vcf.gz` and for a `.nei` file written by popnei 0.2.2 from
  `low_qual.vcf.gz`, and not for `panel.nei`.
- Wrong if any change of a filter sends a request to the worker, or a
  plot changes with a threshold.

## What is hard to undo

- The kind `passed` in the project file (section 8): a file saved with
  it cannot be opened by a version of the application from before it,
  since the reading of a project file refuses a kind of filter it does
  not know, and `popgen.html` refuses it.
- The first project of `popgen2.html`: the FILTER filter on and the
  missing rate of the variants at 0.1, which every user starts from.

## What changes in `docs/architecture.md`

Made on this branch once the owner approves, each with its paragraph
"What was revised":

- Section 2: the kind `passed` of the filters of the variants, after the
  regions and before the list of the individuals, carried out after the
  individuals are judged; `filtersApplied`, the filters that apply to the project's
  file; the read of a variants file holding whether its variants record
  their FILTER.
- Section 3: the store's setting of a notice for every change of a
  filter; the failures cleared by a change only when their key is left
  behind. The spec of the store, `docs/specs/core/store.md`, which says
  a failure lasts "until the next change of the project", changes with
  it.
- Section 5: the thresholds of `popgen2.html` change the project and
  start no calculation; the presses of one run of arrow keys make one
  change; the last result so far kept after a Stop; the quiet second and
  the keys that start again recorded for the first tool that starts by
  itself, where the limit of the piece of the filters moves.
- Section 7: the thresholds of `popgen2.html` show the project's
  filters, on or off; Undo, Redo and the notice on that page; the first project of that page; the tools section, with its
  first tool, once popnei's issue #13 is done.
- Section 6: the answer to the opening of a variants file carries
  whether its variants record their FILTER, with the individuals and the
  ploidy.
- Section 8: the project file with the kind `passed`, and the old page
  refusing it.

## The costs of the web

- **A frozen page:** none new. Whether a threshold is grey reads at
  most 1,000 bins at each move of a line, and the individuals kept sort
  the values of the individuals, a few thousand.
- **Memory:** none new; the download, which would add the file written,
  waits for popnei's issue #13.
- **The keyboard and a screen reader:** the line is a React Aria slider,
  moved by the arrow keys, as today; a run of presses is one change and
  one notice; a grey threshold is told in the line's value and the
  box's description. To be heard in VoiceOver, the screen reader of macOS,
  before the plan is settled.
- **Downloads and browsers:** nothing new to download, and nothing past
  the floor of `docs/technology.md`.
- **What is lost when the tab is closed:** the filters, as every part of
  the project, until `popgen2.html` saves projects; the file is read
  again when opened again.

## Options not taken

- **The histograms of the variants read again over the individuals
  kept,** after a quiet second, the owner's decision of 6 October 2026:
  the plots would show what the filters will see, at the cost of a
  reading of the whole file each time a threshold of the individuals
  settles, about as long as the opening. The owner chose on 7 October
  2026 that the plots describe every individual, and that nothing is
  read while thresholds move.
- **The FILTER filter in the one pass,** before the individuals are
  judged, the previous version of this design: every statistic of the
  page would be over the variants that passed, at the cost of a reading
  of the file at each turn of the box, and of a VCF of which no variant
  passed giving no statistics. The owner chose on 7 October 2026 the
  filter carried out after the individuals are judged.
- **What all the filters keep together, kept up to date,** a second
  pass after the opening and one at each change of a filter, as the old
  page's counts: the owner chose one pass per file; the count comes with
  the reading that carries the filters out.
- **A download now, with the file built whole in memory,** about 800 MB
  for a VCF of 100,000 variants and 1,000 individuals: rejected by the
  owner; it waits for popnei's issue #13.
- **The FILTER box left out for every `.nei` file,** the version of
  this design approved under popnei 0.2.1, which could not tell a `.nei`
  file with the record from one without: a `.nei` file written from a
  VCF would have kept its failed variants with nothing on the page
  saying so. The owner chose on 7 October 2026 the box for a `.nei` file
  that records the FILTER of its variants.
- **The thresholds kept as state of the page,** as the piece
  `thresholds` built them: no Undo, lost on another file, and nothing to
  carry out later.
- **A line under each plot of what its threshold keeps,** "Keeps 1,050
  of 1,200 variants", and the words "No filter" in the box and beside
  the line of a threshold that is off, the versions of this design of 7
  October 2026: the owner chose on 8 October 2026, after trying the
  page, to show no count, and to show a threshold that keeps every value
  of its plot by its line and its number in grey.

## What the owner decided

On 7 October 2026 the owner approved the design and chose how a
threshold is turned off: by emptying its box, or by typing the value at
which it keeps everything, 1 for a maximum and 0 for a minimum, rather
than by a check box beside each threshold.

Later on 7 October 2026, once popnei 0.2.2 was published (release
`js-v0.2.2`), the owner decided that the FILTER box is shown, and its
filter applied, for a `.nei` file that records whether each of its
variants passed its FILTER, as for a VCF, and that it is hidden, and its
filter not applied, for a `.nei` file that does not, one written before
popnei's vars format 1.2. The reason: popnei 0.2.2 says, once a file is
open, whether its variants hold the record (`keepsPassed`), where under
popnei 0.2.1 the page could not tell, so the approved version left the
filter out for every `.nei` file, and a `.nei` file the page writes from
a VCF would have kept its failed variants with nothing saying so. The
design stays approved with this revision, which also gave the exact
counts of popnei 0.2.2 in place of the range of its bins, until the
owner's decisions of 8 October 2026 below took the count out.

On 8 October 2026 the owner tried `popgen2.html` on the branch
`popnei-0.2.2` and decided three things that change this design, which
stays approved with them:

1. No line under the plots of what a threshold keeps: "In general we
   don't need to show the user how many variants are we going to keep."
   A threshold that keeps every variant or individual of its plot is
   shown by its line and the number in its box drawn in grey, not by
   words, the bluish grey of `--chart-threshold-keeps-all` with the line
   dotted and the handle hollow, as the piece `popnei-0.2.2` built it; the words "No filter" in the box and beside the line, and
   the line "Keeps every variant", go. Off is 1 in grey in the box and
   the line in grey at the top of the axis, with no shading; an emptied
   box shows 1 in grey. A screen reader alone is told it in words (above,
   "What a threshold shows on its plot"). From this the session decided
   the same day that the raise of a threshold of the variants below
   0.001 to 0.001, and its words, go, since they served only the exact
   count of the line: popnei applies 0 exactly.
2. Fewer bars on the histograms whose values lie on a grid: a bar is
   never narrower than 1/n for the missing rate of n individuals, nor
   1/(ploidy · n) for the MAF. That is the piece `popnei-0.2.2`'s, and
   changes nothing here.
3. The FILTER box is wanted soon: the plan `docs/plans/filters.md`
   builds it right after Undo, Redo and the notice.
