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
plot"); and, the same day, with the owner's decision to hide Undo and
Redo on `popgen2.html` until a later feature needs them (below, "What
the owner decided", 6); and again on 8 October 2026, a draft until
the owner approves it, for the download of the filtered variants, now
that popnei 0.2.2 hands a written file over in pieces: one button,
"Download filtered variants…", after the Variants and Individuals
sections, with no "Tools" section, as the owner decided that day, and
how the pieces reach the user's download (below, "The download of the
filtered variants", and "What the owner decided", 7), and the same day
with the owner's answers to its points: the bar, the download started
by itself, the text with the counts of each filter after it, and one
sentence when the filters keep no variant ("What the owner decided", 8
to 11). It
decides how the thresholds that the user drags on the histograms of
`popgen2.html` become filters of the project, with Undo; how the FILTER
column becomes a filter; what the page reads from the file, and when,
under the owner's rule of one pass per file; and how the user
downloads the variants the filters keep. It is built, but for the
download, on the branch
`filters` (`docs/plans/filters.md`), and the owner accepted the page on
8 October 2026. Before it, the thresholds of the piece
`thresholds` (plan `docs/plans/thresholds.md`, merged into `main` on 7
October 2026) were state of the page, changed no statistic and were lost
on a reload. The page and its one pass over the file are those of
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
plots read so far kept after a Stop; and the download of the filtered
file waiting for popnei's issue #13, which popnei 0.2.2 closed.

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
or ticking the FILTER box changes the project and the shading of the
plots, and reads nothing. The plots never change with a
threshold.

**What a threshold shows.** Its line on the plot, its number in its
box, and the bars beyond it shaded as left out. No line under the plot
says how many variants or individuals it keeps, as the owner decided on
8 October 2026: "In general we don't need to show the user how many
variants are we going to keep." A threshold that keeps every value of
its plot, off or on, has its line and the number in its box drawn in
grey. How many variants all the filters keep together is counted by
the reading that carries the filtering out, the download or a later
analysis, which gets from popnei what each filter kept; the download's
dialog shows none of it, as the owner decided on 8 October 2026, so
those counts have no place on the page yet (below, "Open points").

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
box changes no plot and no count on the page, only the project; what it does is seen in the file downloaded. The box counts
nothing: the count of the failures is in the box of the file, "FILTER
failures: 300" for `low_qual.vcf.gz`, from the one reading, as the piece
`popnei-0.2.2` builds it.

**The download.** One button, "Download filtered variants…", after the
Variants and Individuals sections, opens a dialog that holds the choice
of the format, a `.nei` file or a VCF compressed with bgzip, `.vcf.gz`,
and its buttons; while the file is written it shows a bar and Stop.
When the write ends the dialog closes, the download starts by itself,
and the button gives way, until a filter or the file changes, to a text
with the file, its size, the variants and individuals it holds, and
what each filter removed. There is no
"Tools" section, as the owner decided on 8 October 2026. popnei 0.2.2
hands the file over in pieces of 1 MiB. The worker gathers them into
one `Blob`, the browser's object for a file made in the page, which it
hands to the page with no copy; so the tab holds the file about once,
where the old page's write held 4.4 times its size in Chromium and up to
6.1 times in WebKit (measured on 27 September 2026, files up to 1.98
GB). That once is argued from Chromium's sources and is still to be
measured in each browser, in the plan. When the filters keep no
variant the page says so, "None of the 1,200 variants of
low_qual.vcf.gz pass the filters, so there is nothing to download.",
before any write when the plots make it certain and after the write
otherwise; nothing else is refused or warned of before the write, and
no limit of size is set: the plan measures the largest file each browser writes.
A file too large for the browser ends in an error, except where the
browser closes the tab, which the measurement looks for.

**What approving commits to that is hard to undo.** The FILTER box is a
new kind of filter in the project file. A project file holding it
cannot be opened by an older version of the application, and the old
page, `popgen.html`, refuses it, since it has no box to show it. Nobody
loses anything today: the new page saves no project file yet.

**Undo and Redo on the new page.** `popgen2.html` has neither, and
keeps it so for now: the row with Undo and Redo and their keys, which
undid and redid the changes of the filters, was built and then hidden
by the owner on 8 October 2026, until a later feature needs it; the
store keeps the history it would use. Opening a file starts the page's
history afresh, and no change gives a notice, as the owner decided the
same day.
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
built soon, right after Undo and Redo. Later that day, after trying the
FILTER box: no notice for a change of a filter, and no Undo of the
opening of a file; and after trying the thresholds, no Undo and no Redo
on the page for now.

## What the user can do once it is built

Cases 1 and 2 of `docs/use-cases.md`: the user reads the distributions
of the open file, sets on them the thresholds of the filters, sees on
each plot what its threshold would leave out, and changes them until
the thresholds are the ones they want to work with. Carrying the filters
out comes with the download of the filtered variants, and later with
the analyses.

- A threshold on the missing rate, the major allele frequency or the
  observed heterozygosity of the variants, and on the missing rate or
  the observed heterozygosity of the individuals, is a filter of the
  project. The expected heterozygosity has no threshold: popnei has no
  filter on it.
- A check box at the end of the part of the variants, "Leave out the
  variants that failed their FILTER", on by default, for a VCF and for
  a `.nei` file that records the FILTER of its variants.
- Every change of a threshold or of the box is a change of the project,
  with no notice. The page has no Undo and no Redo for now (below, "What
  the owner decided", 6), and opening a file starts the project's
  history afresh.
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
| carrying the filters out | the file written, or an analysis, with what each filter kept | the file, every filter that applies to it, and the individuals kept | when the user starts the download, or later an analysis |

Nothing else reads the file. The chain of `popgen2.html`, the
calculations that start by themselves (`src/ui/autoRuns.ts`,
`docs/architecture.md` section 5), is the one pass alone, as the piece
`one-pass` leaves it. In particular these do not run on `popgen2.html`,
by the owner's decisions of 7 October 2026:

- the counts of the filters (`filterCounts` of the old page), what all
  the filters keep together, at the opening or at each change: that
  count is given by the reading that carries the filters out, from
  popnei's counts of its pass (`Written.passStats` of
  `src/worker/protocol.ts` for the writing), which the download reads
  only to tell a file of no variant;
- the histograms of the variants over the individuals kept
  (`variantChecks`): the four histograms of the variants are always
  over every individual, and a threshold of the individuals acts when
  the filters are carried out;
- a separate count of the FILTER failures: the one pass gives it from
  popnei 0.2.2 (the piece `popnei-0.2.2`), and it changes nothing else
  here.

The store of `popgen2.html` keeps `counts` and `statistics` at `null`,
as today (`StoreConfig` of `src/core/store.ts`), and `POPGEN2_ANALYSES`
of `src/core/apps.ts` does not change. The piece of the download
names the one pass, `variantsSummary`, as the page's `statistics`: the
store works out the individuals kept, and why a request would keep none
(`keptNoneReason`), from that setting, and it must read the one pass's
finished result only, so that a download started after a Stop waits for a
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
no variant, and the page says so in place of the download's button,
before any write, since the one pass's count of the failures makes it
certain (below, "When the filters keep no variant"). The count of the
failures in the box of the file says it too.

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

## Undo and Redo on `popgen2.html`

The page draws neither, as the owner decided on 8 October 2026 after
trying the thresholds (below, "What the owner decided", 6): the row
described here was built, and then hidden with its keys, until a later
feature needs it. What follows is how it works when the page draws it
again; the store's history, the commands with their descriptions and
the gate that makes a run of the keys a change before any other command
stay built for it.

Before the row was built, `popgen2.html` had neither: its page has no shell
(`src/ui/popgen2.tsx`, "without the stepper, the saving and the
shell"), and the buttons of Undo and Redo and their keys (Ctrl+Z,
Ctrl+Y and Cmd+Shift+Z, caught in the shell's header through
`src/ui/shell/shortcuts.ts`) are the shell's. The page gains a row
above the box of the file with the two buttons, the keys caught as the
shell catches them, reused from the shell rather than copied.

They undo and redo the changes of the filters alone. Opening a file,
the first or another, starts the page's history afresh, with nothing to
undo, and keeps the filters as the user left them; the owner decided on
8 October 2026 that an Undo of an opening is "not necessary". The page
opens a file with the store's `open`, which starts a new history and
stops the pass of the file before, and not with a command.

No change gives a notice, the panel of the old page that says what a
change did, with its Undo: the owner decided on 8 October 2026, after
trying the FILTER box, "Let's assume that the user knows what he's
doing". The store gives a notice only for a change that removes, leaves
behind or stops a result, and on this page no change of a filter does,
since the one pass reads no filter, and no opening does, since an
opening starts a new history. So the page draws no notice. What a user
of a screen reader hears of a change is the change of the control
itself, the check box ticked or the slider's value, and of an undo or a
redo the status region, "Undone: the variants that failed their FILTER
are kept."

Until that day this design had the notice on this page too, with a
setting of the store under which every change of a filter gave one,
"The MAF filter changed · Undo", and an opening as a step of Undo,
"Statistics of the file removed because panel.nei opened · Undo". Both
were built on 8 October 2026 and taken out the same day.

## When a calculation that reads a filter starts by itself

None does on `popgen2.html` with this design. The download is started
by the user. When a later analysis, a population analysis or the GWAS, starts
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
  again, unless its result is in the cache. Built on 8 October 2026
  for the pass of the file on `popgen2.html`, while an opening could be
  undone, and taken out the same day when it no longer could: nothing
  reached it, since only an Undo across files came back to such a key.

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

## The download of the filtered variants

The user downloads the variants the filters keep, of the individuals
the filters keep, as a `.nei` file or as a VCF compressed with bgzip,
`.vcf.gz`, with one button, "Download filtered variants…", after the
Variants and Individuals sections of `popgen2.html` and before "Open
another variants file…". The button belongs to the part of the variants
of the application, as the owner decided on 8 October 2026: there is no
"Tools" section, and the population analyses and the GWAS, when they are
built, will not share a section with it. This section was revised that
day from the version that waited for popnei's issue #13 (below, "What
the owner decided", 7).

### What popnei 0.2.2 gives

popnei 0.2.2, installed since 8 October 2026, closed issue #13,
https://github.com/JoseBlanca/popnei/issues/13: `writeVars` and
`writeVcf` (`node_modules/popnei/dist/io_vars.d.ts` and `io_vcf.d.ts`)
take `onBytes(piece)`, a function popnei calls with the file in pieces
of 1 MiB, 1,048,576 bytes, the last one shorter, while the pass writes
it, and then return only the counts of the pass, `passStats`. The
memory of wasm, which grows and never shrinks, then holds one block of
the file, about 10 MB of genotypes for 1,000 individuals at the size
popnei writes, and not the whole file. Each piece is a new array the
caller keeps; `onBytes` must keep it before it returns, and one that
returns a promise ends the pass with an error, since the call is
synchronous: the worker runs nothing else until it returns. `writeVcf`
compresses with bgzip unless told `bgzip: false`. A pass that fails
after some pieces were given leaves the start of a file with no end.

Until popnei 0.2.2 this design waited for that issue: popnei built the
whole file in the memory of the worker before handing it over, a VCF of
1,000 diploid individuals and 100,000 kept variants about 400 MB as
plain text, and about 800 MB in the worker at its peak, on top of the
open file, which the owner judged unacceptable on 7 October 2026.

### How the user downloads

1. The button is enabled once the one pass of the file has ended. The
   individuals kept are worked out from its finished result, so the
   button waits while the pass runs and after a Stop, with the reason
   beside it in words, "The download waits for the statistics of the
   file to be read to the end." (the plan's screen spec gives the words
   of each state). When the page knows for certain that the filters keep
   no variant, the button gives way to the sentence that says so (below,
   "When the filters keep no variant").
2. It opens a dialog, the page's `src/ui/widgets/Dialog.tsx`, React
   Aria's modal dialog, which keeps the focus inside it and hides the
   rest of the page from a screen reader while it is open. The dialog
   holds the choice of the format, VCF or `.nei`, and its buttons,
   Download and Cancel, and no count, as the owner decided on 8 October
   2026.
3. Download sends the write to the calculation worker. While the file
   is written the dialog shows a bar in place of the choice, and Stop,
   as the owner decided on 8 October 2026 (below, "The bar of the
   write"). Stop ends the write, which ends the worker and starts
   another, as any Stop does (`docs/architecture.md`, section 5). The
   Escape key does nothing while the file is written, so that a key
   pressed by habit does not throw away minutes of writing; a user
   without a mouse still reaches Stop by moving to it with the Tab key
   and pressing it, as WCAG 2.2, the standard of accessibility the
   applications follow, asks of every action (its criterion 2.1.1). The
   page's `Dialog.tsx` closes on Escape today, and gains that option.
4. When the write ends, the dialog closes, the browser's download of
   the file starts by itself, through `downloadFile` of
   `src/ui/download.ts`, a link to the file with the `download`
   attribute clicked by the code, and the button gives way to a text
   that says what was downloaded (below, "What the page says after the
   download"). The focus goes to that text, so that a screen reader
   reads it.
5. The text stays, and the button does not come back, until the user
   changes a filter, a threshold or the FILTER box, or opens another
   file, as the owner decided on 8 October 2026: a change may mean they
   want another file. With the change the text goes and the button is
   back.

Since the dialog is modal, no filter changes while a file is written:
the case of the old page, a change of a filter that leaves a write
behind, does not arise on `popgen2.html`.

The name is that of the old page, `writtenName` of
`src/core/fileNames.ts`: the stem of the variants file with
`.filtered.nei`, or `.filtered.vcf.gz` for the VCF, and the stem with
`.nei` alone when no filter applies.

The file is written from every filter that applies to the file
(`filtersApplied`), in the order of section 2, with the individuals
kept given to popnei as a list, as the old page writes it. The VCF is
popnei's `writeVcf`: from a VCF each variant is its line, and AC and AN
are taken out of INFO when individuals were left out; from a `.nei`
file, popnei writes a header and lines of what the file holds, FILTER
`FAIL` for a variant that failed its FILTER in the VCF it came from.

### The download started by itself

The owner asked on 8 October 2026 for the text "saved" once the file is
written, with no second click, if the browsers allow a download started
by the code that long after the click that asked for it, without
blocking it or asking the user. The old page has a Save click of its
own for that reason (`docs/specs/analyses/writeVariants.md`, "Saving
the file"), and no browser of the floor was tried. What is known, to be
tried in the plan:

- A link clicked by the code downloads in every browser of the floor;
  what differs is the user's activation, the browser's record that the
  user just clicked, which lasts a few seconds (the HTML standard's
  "transient activation"), long gone after a write of minutes.
- Chrome lets a page download one file with no activation, and asks the
  user ("This site is trying to download multiple files") before a
  further one; a click or a key pressed by the user lets it download
  one again (`DownloadRequestLimiter`,
  https://chromium.googlesource.com/chromium/src/+/main/chrome/browser/download/download_request_limiter.h,
  read on 8 October 2026), and pressing Download is such a press, so
  the second download of a session is probably not asked about. A site
  whose automatic downloads the user once set to Block is blocked.
- Safari has a setting for each site, "Allow downloads", set by default
  to ask the first time; whether it asks for a download with no
  activation is to be tried.
- Firefox shows its panel of downloads, or asks where to save when the
  user set it to.

The page cannot tell whether a download was blocked, or whether the
user cancelled the browser's question: clicking the link gives the page
no answer, and the list of downloads is the browser's. So the text after
the download always holds a link, "Save it again", which starts the
download of the same file from a click of the user, which no browser
blocks; that is the Save of the old page, kept for when it is needed
rather than asked of everyone. The page keeps the file for it until a
filter or the file changes, its size in memory while it is kept (below,
"How the pieces reach the user's download", for where each browser
keeps it). The text says "downloaded" and not "saved": the page knows
the download was started, and not where the browser put it.

The plan tries the download started by itself in Chromium and WebKit
and in Firefox by hand, the first and the second of a session, with
the browser asking and not, and in Chrome a site set to Block. If one
blocks it or asks every time, the
session brings the choice to the owner: a Save click in every browser,
or in that browser alone, told by its name in the user agent string,
which a browser may change.

The address `downloadFile` gives the browser is released a minute after
the click (`src/ui/download.ts`), so a user whose browser asks where to
save, and who answers after more than a minute, may get a failed
download; "Save it again" makes another address.

### The bar of the write

The bar is popnei's `onProgress`, as for every calculation: one pass
over the open file, told at each read of 4 MiB of it, so a file of 1 GB
gives about 250 messages over the write. The old page's write had it
on, and wrote a file of 220 MB in 3.73 s in Chromium and 3.70 s in
WebKit (27 September 2026); a message every 4 MiB is nothing beside
the compression of the file, so the bar costs the write no time that
was measurable then. It is approximate in two ways:

- it counts the bytes of the open file read, not of the file written,
  and the variants are not spread evenly over the file, so its speed
  varies along the write; a filter that leaves out many variants of a
  region makes that stretch faster;
- for a VCF compressed with gzip it counts compressed bytes, which
  follow the variants read closely; for a `.nei` file it ends below
  full, since popnei does not read the head of the file again, and its
  call at the end of the pass carries the bytes read, still short of
  the size; so the page sets the bar full when the answer of the write
  arrives.

After the bar is full the worker makes one `Blob` of its parts and reads
its last byte (below), which takes a moment the bar does not show.

### When the filters keep no variant

Whatever the cause, the page says one sentence, as the owner decided
on 8 October 2026: "None of the 1,200 variants of low_qual.vcf.gz pass
the filters, so there is nothing to download." The number is that of
the variants of the file. A file of no variant at all has its own,
since "None of the 0 variants" reads wrong: "panel.nei holds no
variants, so there is nothing to download." It is said in one of two
places:

- **In place of the button, before any write**, when the one pass shows
  for certain that the filters keep no variant. Nothing is written, and
  the dialog does not open. The button comes back with a change of a
  filter that makes the outcome uncertain. The text replaces the button
  rather than the dialog's Download so that the user sees it beside the
  plots whose thresholds they set, and does not open a dialog that can
  do nothing.
- **In place of the button, after the write**, otherwise: popnei's
  `writeVars` and `writeVcf` do not refuse a pass that keeps no variant
  (the old page found a file of a few KB and no variant,
  `docs/specs/analyses/writeVariants.md`, "The cases"), so the page
  tells the case from the counts of the pass, `passStats.numVars` 0, and
  drops the file. The dialog closes, and the sentence stays as the text
  after a download does, until a filter or the file changes.

What the one pass makes certain. It gives the histograms of the
variants over every variant and every individual of the file, in fine
bins that hold their right edge, so the variants at most a threshold
are counted exactly; the count of the variants that failed their FILTER;
and each individual's values. The filters of the individuals act before
those of the variants (section 2). So:

- **Certain:** the file holds no variant; the filter of the FILTER
  column among the filters that apply to the file (`filtersApplied`,
  which leaves it out for a `.nei` file without the record), and the one
  pass's count of the variants that passed their FILTER, `filterColumn`,
  0, since that filter judges each variant by its FILTER column alone,
  whoever the individuals; and, while the filters of the individuals
  keep every individual, one threshold of the variants above 0 whose
  bins with a right edge at or below it hold no variant, or a threshold
  of 0 whose first bin is empty. The first bin holds both its edges, 0
  to 0.001, so at 0 no bin lies wholly at or below the threshold, and
  only an empty first bin says that no variant has the value 0; on
  `panel.vcf.gz` two variants have a missing rate of 0, which popnei
  keeps at a threshold of 0 (node, popnei 0.2.2, 8 October 2026), as
  `variantsAllKept` of `src/core/thresholds.ts` already treats 0 apart. A variant with no called genotype is in no histogram of the
  MAF or of the observed heterozygosity, and those filters drop it, so
  it changes nothing; the missing rate counts it, at 1.
- **Not certain, so told after the write:** a threshold of the variants
  while some individual is left out, since a variant's missing rate,
  MAF and heterozygosity over the individuals kept are not those of the
  histogram; and two thresholds, or a threshold and the FILTER box, that
  each keep some variants and together may keep none, since the
  histograms are of one statistic each and do not say which variants
  hold both values.

The check is a function of `src/core` over the one pass's result and
the project, plain counting over popnei's bins and counts.

When the filters of the individuals keep none, the page knows it with
no pass, from `keptNoneReason`, and the button gives way to that
reason's words, "The filters of individuals keep none of the 200
individuals of panel.nei. Loosen them."; nothing is sent to the worker,
since popnei refuses an empty list of individuals. The sentence of no
variant would be untrue there. In no other case is a write refused or
warned of before it is made: no estimate of the size and no warning of
the memory, as the owner decided on 8 October 2026.

### What the page says after the download

The text that takes the place of the button says the file, its size,
what it holds, and what each filter removed, as the owner asked on 8
October 2026, for example on `low_qual.vcf.gz`:

> low_qual.filtered.vcf.gz downloaded, 19.2 MB: 850 variants of 180
> individuals. Variants removed: 300 by their FILTER, 38 by the missing
> rate, 12 by the MAF. Individuals removed: 15 by the missing rate, 5 by
> the observed heterozygosity. Save it again

(the numbers are made up for the example). A filter that removed none,
or is off, is left out; a line with no filter left is left out whole.

Each count is of what that filter was given, which is what the filters
before it in the order of section 2 kept, so the counts add up to the
variants or individuals of the file less those kept, and a variant
that two filters would remove is counted by the first. That is the
order the methods of a paper write them in, and the counts of popnei's
Python API.

- **The variants** removed by each filter are popnei's: `passStats` of
  the write gives, for each filter of the pass, under its kind, the
  variants it was given, `varsProcessed`, and kept, `varsKept`
  (`FilteringStats` of `node_modules/popnei/dist/filters.d.ts`), and
  `numVars`, those written. Removed is given less kept.
- **The individuals** removed by each threshold are the page's own
  filter: popnei filters individuals only by a list, so the page works
  out the list from popnei's value of each individual in the one pass,
  `individualsKept` of `src/core/individualsKept.ts`, which already
  counts, for each filter of the individuals in its order, those given
  and kept. Counting them is applying the page's filter to popnei's
  values, as the list itself is, and computes no statistic; the session
  agrees with the owner's reading. The statistic, each individual's
  missing rate and heterozygosity, stays popnei's.

So popnei gives everything the text needs, and nothing is asked of it.

The store keeps these counts with the file in its state `saved`
(`WriteStatus` of `src/core/store.ts`), which today keeps the counts and
drops the file; it now keeps the file too, for "Save it again", until a
change gives the write another key.

### How the pieces reach the user's download

The worker is given 1 MiB pieces during a synchronous call; the user
needs one file to save. Three ways were weighed. F is the size of the
file.

| | the worker gathers the pieces into a `Blob` | each piece posted to the page | the origin private file system |
|---|---|---|---|
| what holds the file at the end | one `Blob`, F, held by the browser (below) | one `Blob`, F | a file on the disk |
| peak beyond the `Blob` | one batch of pieces in the worker, 64 MiB at the most (below) | the pieces in the page until they are made a `Blob`: F more at its making, unless the page batches them as the worker would | none |
| work on the page's thread | none: one message at the end | one small message for each MiB, 1,024 for a file of 1 GiB, which would not freeze the page, and the making of the `Blob` | none |
| a Stop | ends the worker; what it held goes with it | ends the worker; the pieces already on the page must be dropped by the page | ends the worker; the file stays on the disk until the page deletes it |
| changes to the messages of the worker | none: the answer stays `Written<Blob>` | a new message, a piece, with its checks in the client and the store | none to the answer; a file to delete after each download and after a crash |
| the browsers of the floor, Chrome 111, Firefox 115, Safari 16.4 | all | all | `createSyncAccessHandle` in Chrome 102, Firefox 111, Safari 15.2 (MDN, read on 26 September 2026), but a quota that differs by browser, and none in a private window of Firefox |

The choice is the first: the worker gathers the pieces into a `Blob`
and posts it, as `docs/architecture.md` section 6 already planned for a
writer by pieces ("The files written", the paragraph "What was revised
on 26 September 2026"). It keeps the answer of the write as it is, a
`Blob` that crosses to the page as a handle, with no copy, which the old
page's write was measured to do on 27 September 2026; it leaves the page
nothing to do while the file is written; and a Stop leaves nothing
behind. Posting each piece would cost the page a message per MiB and a
new kind of message, and would hold the file in the page's memory twice
at the making of the `Blob`, for nothing the user sees: the bar comes
from popnei's progress in both. The origin private file system, a
storage on the disk that the browser gives each site, would keep the
file out of memory in every engine; it would win if a measurement of
the plan showed Firefox or WebKit failing at sizes users write (below),
at the cost of a quota and of files left on the disk.

So that the worker does not hold the file twice either, the pieces are
not kept to the end: every 64 MiB of pieces become a `Blob`, and the
pieces are dropped; at the end the `Blob`s become one, `new
Blob(parts)`, whose parts are `Blob`s already made. In Chromium a `Blob`
made of other `Blob`s refers to their bytes and does not copy them, as
far as the description of its storage says (below); whether WebKit and
Firefox copy them is measured in the plan, and if one does, the parts
are kept as a list and the last `Blob` made once. The 64 MiB is a value
to set in the plan: smaller holds less in the worker, larger makes
fewer `Blob`s.

Where the browser keeps a `Blob`, from the sources:

- **Chromium** keeps the bytes of every `Blob` in the browser's own
  process, not the tab's, up to 2 GB in all on a 64-bit desktop, and
  past that on the disk, up to a tenth of the disk: "If the in-memory
  space for blobs is getting full, or a new blob is too large to be
  in-memory, then the blob system uses the disk." A `Blob` posted to
  another thread crosses as a reference. Source: Chromium's
  `storage/browser/blob/README.md`,
  https://chromium.googlesource.com/chromium/src/+/HEAD/storage/browser/blob/README.md,
  read on 8 October 2026. The old page measured the copy of a file of
  220 MB into the browser's process on 27 September 2026, 13 ms.
- **Firefox** moves a `Blob` to a temporary file on the disk from
  Firefox 52, past about 1 MB (bug 1202006,
  https://bugzilla.mozilla.org/show_bug.cgi?id=1202006, read on 8
  October 2026). Whether that covers a `Blob` a page makes is read both
  ways in the bug: its comment 17 says the patches work "also for
  normal blobs", `new Blob([a])`, and the patches that landed are titled
  "MutableBlobStorage for XHR" and "BlobSet just for MultipartBlobImpl",
  the second being the kind of `Blob` made of parts that this design
  makes. So where Firefox keeps the file is not settled by the sources;
  it is measured by hand in the plan, a write of 2 GB with
  `about:memory`, since Playwright cannot launch Firefox on the owner's
  Mac.
- **WebKit**, in the old page's measurement of 27 September 2026, grew
  its network process by the size of the file within 1.5 s in some
  writes, and in others no process grew
  (`docs/specs/analyses/writeVariants.md`, "What was measured"); where
  it keeps a large `Blob` is not documented that we found.

The download of a `Blob` through a link with the `download` attribute
is in every browser of the floor; the old page saved files up to 1.98
GB that way in Chromium and WebKit.

### Whether a limit of size is needed

The owner asked on 8 October 2026 whether a limit is needed. The old
page's limits, `WRITE_WARN_BYTES`, 500 MB, and `WRITE_MAX_BYTES`, 1.8
GB (`src/core/writeEstimate.ts`), were set from a write that built the
file whole in wasm: the tab held 4.4F more at its peak in Chromium and
up to 6.1F in WebKit, 2.4F of it in wasm, and a file of about 2.2 GB
failed in both, since wasm addresses at most 4 GB. With the pieces, wasm
holds one block, so that failure goes, and the peak becomes about F,
the `Blob`, and up to 64 MiB of pieces, where it was 4.4F to 6.1F. What
is left, by engine:

- Chromium: the `Blob` on the disk past 2 GB, up to a tenth of the
  disk, 50 GB on a disk of 500 GB, and never into the last 4 GB of free
  disk, which the description of its storage keeps back
  (`min_disk_availability`, twice the 2 GB in memory). A user meets it
  only with a file that large. `new Blob` gives its size at once, and a
  `Blob` the storage could not take fails only when it is read, so the
  page would offer "Save …, 60 GB" and the download would fail in the
  browser's list of downloads. So the worker reads the last byte of the
  finished `Blob`, with `FileReaderSync`, before it posts it, and a
  `Blob` that cannot be read becomes the error of the write.
- Firefox: the disk or the memory of the machine, by which reading of
  its source holds (above); measured by hand.
- WebKit: not known; the old measurement does not separate the `Blob`
  from wasm.

The recommendation, which the owner's decision of no refusal before
writing follows: no limit before the write. A write the browser cannot
hold ends in an error that says so, the worker's crash, "workerFailed"
of the client, or a `Blob` that cannot be read (above), in words that say the file was too large for the
memory of this tab and that popnei in Python writes any size; only a tab
the browser closes says nothing: the user sees the browser's page of a
closed tab and loses the filters set, which is what the plan's
measurement looks for. The plan
measures the largest file written and saved in Chromium and WebKit on
the built site, files of 2, 4 and 8 GB from `e2e/bigVcf.ts` as the old
page's `VS5 D5` did, with the memory of each process, a file past
Chromium's quota on a small disk, and Firefox by hand. If a tab closes below a size a user of a
computer would write, a warning before the write comes back as a
question for the owner; a refusal would need the size before the
write, which `popgen2.html` does not have, since it counts no variant
the filters keep.

After the write the calculation worker is started again when the file
is larger than `WRITE_RESTART_BYTES`, 25 MB, to give back the memory
wasm took. With the pieces wasm grows by a block and not by the file, so
the plan measures what a write leaves in the tab and drops that restart
if it gives back nothing.

### What changes in the code

- `WriteJob.format` and `Written.format` of `src/worker/protocol.ts`
  gain `"vcf"`, always bgzipped, and the key of a write holds the
  format, as it holds `"nei"` today.
- The store files the state of a write under the one format of the old
  page, `STATE_FORMAT` of `src/core/store.ts`, and `startWrite` throws a
  defect for any other; a file whose key is not the current one, made
  with that format, is dropped. So the store's write state gains the
  format chosen, the one write in flight or kept, and the current key of
  the write is made with it; the old page asks for `"nei"` alone, as
  today. Without it, a user who picks VCF sees a defect or no file.
- The runner's `writeFile` gives `onBytes` to `writeVars` or to
  `writeVcf` and gathers the pieces as above, in place of making a
  `Blob` of one array.
- `writtenName` gains `.filtered.vcf.gz`.
- The store of `popgen2.html` is given its `write`, which it is made
  without today (`src/ui/popgen2Store.ts`), and works out the
  individuals kept from the finished one pass (above, "What is read, and
  when").
- The page gains the button, its dialog, the text after the download
  and the sentence of no variant; `src/core` gains the check of a
  filtering that keeps no variant for certain, over the one pass.
- The store's state `saved` keeps the file, for "Save it again", where
  today it drops it once handed to the browser; the file goes with a
  change of the key, as the other states do. This changes what
  `docs/specs/core/store.md` says of `writeSaved`. The old page, `popgen.html`, keeps its step of the write, its
  estimate and its limits, which the pieces make cautious and leave
  harmless, and offers the `.nei` file alone, as today.

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
calculation. The download keeps them too: it is one request of the
calculation worker, which never goes into the cache, as the old page's
write is (`docs/architecture.md`, section 5); its answer stays a `Blob`;
its Stop ends the worker; and the dialog, being modal, lets no filter
change while the file is written, so no file of other filters than the
page shows can reach the user.

## How it is tested, and what would prove it wrong

- In `src/core`: each command of a threshold and of the box gives one
  change of the project, with no notice, and Undo gives the value
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
  dragged, typed, moved with the arrow keys, or the box turned; the
  keys of Undo and Redo change nothing on the page, which draws neither
  (below, "What the owner decided", 6), so that a run of arrow presses
  as one step of Undo, and an Undo within its quiet second, are tested
  in Vitest (`src/ui/variants/thresholdRun.test.ts`); after a Stop the
  plots read so far stay, with the words of a Stop; a threshold off shows 1 and
  its line in grey, as does one dragged to the top of an axis that ends
  below 1; the FILTER box is shown for
  `panel.vcf.gz` and for a `.nei` file written by popnei 0.2.2 from
  `low_qual.vcf.gz`, and not for `panel.nei`.
- The download: in the runner's tests under node, the pieces gathered
  into a `Blob` are the bytes `writeVars` and `writeVcf` give whole, for
  `panel.nei` and `panel.vcf.gz` with filters, and the counts are the
  same; a file over several batches of 64 MiB is made of its parts in
  order. In Playwright, in Chromium and WebKit: the dialog downloads a
  `.nei` file and a `.vcf.gz` that popnei and pyarrow read back with the
  variants and individuals of the filters; Stop ends the write and
  offers no file, and Escape while it writes does nothing; the download
  starts by itself and the text after it holds the counts of the pass
  and of `individualsKept`; the text and its absent button stay through
  everything but a change of a filter or of the file; the filters
  that keep no variant give the sentence before the write for each
  certain case of "When the filters keep no variant", and after it for
  the others, such as a MAF threshold that keeps none only over the
  individuals kept. In Vitest, the check of a certain empty filtering
  against popnei's filters under node, over `panel.vcf.gz` and
  `low_qual.vcf.gz`, thresholds of 0 among them, never saying certain
  where popnei keeps a variant. Measured in the plan, on the built site: the largest file
  written and saved in Chromium and WebKit, 2, 4 and 8 GB, with the
  memory of each process, and whether WebKit and Firefox copy the bytes
  of a `Blob` made of `Blob`s.
- Wrong if any change of a filter sends a request to the worker, or a
  plot changes with a threshold; and the choice of the pieces is wrong
  if the measurement shows the tab holding the file twice, or an engine
  closing the tab well below the size of a file a user of a computer
  writes, which would bring back the origin private file system.

## What is hard to undo

- The kind `passed` in the project file (section 8): a file saved with
  it cannot be opened by a version of the application from before it,
  since the reading of a project file refuses a kind of filter it does
  not know, and `popgen.html` refuses it.
- The first project of `popgen2.html`: the FILTER filter on and the
  missing rate of the variants at 0.1, which every user starts from.
- The names of the files downloaded, `panel.filtered.nei` and
  `panel.filtered.vcf.gz`, which users' scripts may come to expect; they
  are the old page's.

## What changes in `docs/architecture.md`

Made on this branch once the owner approves, each with its paragraph
"What was revised":

- Section 2: the kind `passed` of the filters of the variants, after the
  regions and before the list of the individuals, carried out after the
  individuals are judged; `filtersApplied`, the filters that apply to the project's
  file; the read of a variants file holding whether its variants record
  their FILTER.
- Section 3: the failures cleared by a change only when their key is left
  behind. The spec of the store, `docs/specs/core/store.md`, which says
  a failure lasts "until the next change of the project", changes with
  it.
- Section 5: the thresholds of `popgen2.html` change the project and
  start no calculation; the presses of one run of arrow keys make one
  change; the last result so far kept after a Stop; the quiet second and
  the keys that start again recorded for the first analysis that starts by
  itself, where the limit of the piece of the filters moves. With the
  download: the write of the filtered variants takes the VCF, bgzipped,
  beside the `.nei` file, and a modal dialog of `popgen2.html` lets no
  filter change while it runs.
- Section 7: the thresholds of `popgen2.html` show the project's
  filters, on or off; Undo and Redo on that page, which do not undo an
  opening; the first project of that page; the button "Download
  filtered variants…" after the Variants and Individuals sections, with
  its dialog, and no tools section.
- Section 6: the answer to the opening of a variants file carries
  whether its variants record their FILTER, with the individuals and the
  ploidy. With the download, "The files written": popnei's writers give
  the file in pieces, which the worker gathers into one `Blob` in parts
  of 64 MiB; what a file of F bytes holds in the tab becomes about F;
  the VCF is written; and `popgen2.html` has no estimate, warning or
  refusal of size, where the old page keeps its own.
- Section 8: the project file with the kind `passed`, and the old page
  refusing it.

## The costs of the web

- **A frozen page:** none new. Whether a threshold is grey reads at
  most 1,000 bins at each move of a line, and the individuals kept sort
  the values of the individuals, a few thousand.
- **Memory:** the download holds the file written, about F for a file
  of F bytes, and up to 64 MiB of pieces in the worker, where the old
  page's write held 4.4F in Chromium and up to 6.1F in WebKit. Chromium
  keeps the file in its own process up to 2 GB of `Blob`s and on the disk
  past that; Firefox, as far as found, in the tab's process; WebKit is
  measured in the plan (above, "How the pieces reach the user's
  download"). No limit is set; a write the browser cannot hold ends in
  an error, except a tab the browser closes, which the plan measures.
  The page keeps the file after its download, for "Save it again", and
  drops it when a filter or the file changes.
- **The keyboard and a screen reader:** the line is a React Aria slider,
  moved by the arrow keys, as today; a run of presses is one change and
  one step of Undo; a grey threshold is told in the line's value and the
  box's description. The dialog of the download is the page's React
  Aria dialog, which takes the focus, keeps Tab inside it and gives the
  focus back to the button when it closes; its bar has its value in
  words, and its error is read out as it appears. To be heard in VoiceOver, the screen reader of macOS,
  before the plan is settled.
- **Downloads and browsers:** nothing new to download, and nothing past
  the floor of `docs/technology.md`: a `Blob`, a link with the
  `download` attribute and the dialog of React Aria are in Chrome 111,
  Firefox 115 and Safari 16.4.
- **What is lost when the tab is closed:** the filters, as every part of
  the project, until `popgen2.html` saves projects; the file is read
  again when opened again; a file written and not yet saved, which is
  written again.

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
- **A download with the file built whole in memory,** about 800 MB
  for a VCF of 100,000 variants and 1,000 individuals: rejected by the
  owner on 7 October 2026, until popnei's issue #13, which popnei 0.2.2
  closed.
- **A "Tools" section after the plots,** whose first tool was the
  download and which the population analyses and the GWAS would join,
  the versions of this design before 8 October 2026: the owner chose on
  8 October 2026 one button in the part of the variants, which belongs
  to the variants and is shared with no analysis.
- **Each piece posted to the page as it comes,** a transferable array of
  1 MiB: a message for each MiB on the page's thread, a new kind of
  message, the pieces to drop on the page after a Stop, and the file held
  twice while the page makes it one `Blob`, for nothing the user sees.
  The messages alone, 1,024 small ones for each GiB spread over minutes,
  would not freeze the page.
- **The origin private file system,** each piece written to a file on
  the disk from the worker: the file out of memory in every engine, at
  the cost of a quota that differs by browser, none in a private window
  of Firefox, and files to delete after a Stop or a crash. It wins if
  the plan's measurement shows Firefox or WebKit failing at sizes users
  write.
- **A file picker for saving,** `showSaveFilePicker`, writing the pieces
  where the user chose: in Chrome and Edge only (`docs/architecture.md`,
  section 6).
- **A Save click at the end of the write,** the old page's way and the
  previous version of this revision: no browser blocks a download the
  user clicks, at the cost of a second click every time. The owner
  chose on 8 October 2026 the download started by itself, with "Save it
  again" for when a browser blocked it.
- **A choice of a plain VCF in the dialog,** `.vcf`: the owner chose on
  8 October 2026 the VCF bgzipped alone, which tabix indexes and
  bcftools reads, and which is several times smaller than plain text at
  about four bytes per diploid genotype.
- **A limit of size before the write, a warning or a refusal,** as the
  old page has: the owner chose on 8 October 2026 none; the old limits
  came from wasm holding the file, which the pieces end, and
  `popgen2.html` has no count of the variants kept to estimate a size
  from.
- **The counts of what each filter kept, in the dialog:** the owner
  chose on 8 October 2026 a dialog with the choice of the format and its
  buttons alone, and the counts in the text after the download.
- **A sentence naming the filter that kept no variant,** with what to
  do about it, "Untick ..." or "Raise its threshold": the owner chose on
  8 October 2026 one sentence for every cause.
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

Later on 8 October 2026 the owner tried the FILTER box and decided two
more things, with which the design stays approved:

4. No notice when the box is unticked: "Let's assume that the user
   knows what he's doing." The session read it as no notice for any
   change of a filter on `popgen2.html`, the thresholds' too, and so no
   notice on that page at all; the store's setting that gave a notice
   for every change of a filter went with it.
5. No Undo of the opening of a file: "not necessary". Opening a file
   starts the page's history afresh, and Undo and Redo serve the
   changes of the filters, which the owner decided on 7 October 2026
   are undone.

Later still on 8 October 2026 the owner tried the thresholds as filters
and decided one more thing, with which the design stays approved:

6. No Undo and no Redo on `popgen2.html` for now: "we might want them
   for other features, we'll see". The page draws no row of Undo and
   Redo and catches none of their keys, so Ctrl+Z changes neither a
   threshold nor the FILTER box. The smallest change that hides them
   was made, and the rest kept ready to draw the row again: the
   store's history, with an opening as a new history; the thresholds
   and the FILTER box as commands with the descriptions that name their
   steps; a run of the keys made a change before any other command,
   an opening among them; and the shell's buttons, which `popgen.html`
   draws unchanged. The announcement when a number committed makes a
   threshold start or stop removing anything stays, since it does not
   depend on Undo.

On 8 October 2026 the owner decided the download of the filtered
variants, which changes this design in a revision that waits for the
owner's approval:

7. No "Tools" section. The download is one button after the Variants
   and Individuals sections, "Download filtered variants…", which
   belongs to the part of the variants of the application and is shared
   with no analysis. It offers a `.nei` file and a VCF, compressed with
   bgzip, `.vcf.gz`, with no choice of compression. Its dialog holds the
   choice of the format and its buttons, and no count. When the filters
   keep no variant, the write ends in an error; in every other case the
   file is written, with no refusal and no warning before, of size or of
   anything else. Whether a limit of size is needed the owner asked, and
   this design answers it: none before the write, an error when the
   browser cannot hold the file, and the largest file measured in the
   plan (above, "Whether a limit of size is needed").

Later on 8 October 2026 the owner answered the points of that
revision:

8. A bar while the file is written, if it does not slow the write, and
   approximate where the position is not known exactly; Stop stays.
9. Once the file is written, a text in place of the button, with the
   file, its size and the variants and individuals it holds, which
   stays, with no button, until the user changes a filter or opens
   another file, since a change may mean they want another file. The
   session settled the second click from the word "saved": the download
   starts by itself, with "Save it again" in the text, since the page
   cannot tell whether a browser blocked it.
10. One sentence for every cause of a filtering that keeps no variant,
    "None of the 1,200 variants of low_qual.vcf.gz pass the filters, so
    there is nothing to download.", shown before any write when the
    page knows it for certain, and after the write otherwise.
11. The text after the download says how many variants and individuals
    each filter removed, from popnei's counts of the pass and the page's
    filter of the individuals over popnei's values.

## Open points

- **When a browser blocks the download started by itself, or asks
  every time.** Found in the plan's trial. The options: a Save click in
  every browser, one rule for all at the cost of a click; or in that
  browser alone, told by its name in the user agent string, at the
  cost of a rule a browser's update can break. Recommended: a Save
  click in every browser, if any browser of the floor blocks it.
- **The other format after a download.** With the button gone until a
  filter or the file changes, a user who downloaded the `.vcf.gz` and
  wants the `.nei` file too must change a filter and change it back. The
  options: leave it so, as decided; or a link in the text after the
  download, "Download as .nei" or "as VCF", which writes the file again
  in the other format, a pass more, at the cost of one more line in the
  text. Recommended: the link, since the user asked for nothing new and
  the filters are the same.
