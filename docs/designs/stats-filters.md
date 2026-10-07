# The thresholds of the statistics as filters

A design of 6 and 7 October 2026, waiting for the owner's approval. It
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
only; one pass per file, and no pass while the thresholds or the box
change; the FILTER filter acts when the filtering is carried out, after
the individuals are judged, so that a VCF of which no variant passed is
shown as any other; the plots of the variants always describe every
individual; no count of the FILTER failures until popnei's issue #12;
the line of the expected heterozygosity taken off, its plot kept; the
plots read so far kept after a Stop; and a tools section whose download
waits for popnei's issue #13.

## The design in short, for the owner

This section holds what the approval rests on; the sections after it
are for the reviewers and the builders of the piece, and can be skipped.

**What the page reads.** At the opening of a file, one reading, as
today: the count of the variants, each individual's missing rate and
heterozygosity, and the histograms of the variants, all over every
variant and every individual of the file. Nothing else is read while
the user works on the thresholds: moving a line, typing a number,
ticking the FILTER box or pressing Undo changes the project and the
shading of the plots, and reads nothing. The plots never change with a
threshold.

**What a threshold says.** Each line keeps its count of that threshold
alone, over every variant or individual of the file, as today: "Keeps
1,050 of 1,200 variants", or a range where popnei's bins cannot tell,
until popnei's issue #11. How many variants all the filters keep
together, which depends on their order, the individuals taken out and
the FILTER column, is not on the page while the thresholds move. It
comes with the reading that carries the filtering out, the download or
an analysis, which gives what each filter kept.

**The FILTER box.** At the end of the part of the variants, on by
default, for a VCF; not shown for a `.nei` file. It acts when the
filtering is carried out, after the individuals are judged: an
individual's missing rate and heterozygosity are those of the plots,
over every variant, and the variants that failed are left out after.
So a VCF of which no variant passed is shown as any other. The box
counts nothing: the count of the failures comes back when popnei's
summary gives it in its one reading, popnei's issue #12.

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

**Your choices.** At the end: the approval, and a threshold at the top
of its axis taken as no filter.

## What the user can do once it is built

Cases 1 and 2 of `docs/use-cases.md`: the user reads the distributions
of the open file, sets on them the thresholds of the filters, sees what
each one keeps, and changes them, with Undo and Redo, until the
thresholds are the ones they want to work with. Carrying the filters
out, the download and the analyses, comes with the tools.

- A threshold on the missing rate, the major allele frequency or the
  observed heterozygosity of the variants, and on the missing rate or
  the observed heterozygosity of the individuals, is a filter of the
  project. The expected heterozygosity has no threshold: popnei has no
  filter on it.
- A check box at the end of the part of the variants, "Leave out the
  variants that failed their FILTER", on by default, for a VCF.
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
- a separate count of the FILTER failures: it comes in the one pass
  when popnei's issue #12 is done, and changes nothing else here.

The store of `popgen2.html` keeps `counts` and `statistics` at `null`,
as today (`StoreConfig` of `src/core/store.ts`), and `POPGEN2_ANALYSES`
of `src/core/apps.ts` does not change.

The price of this choice is that the counts the page shows, each
threshold alone over the whole file, can differ from what the filters
keep once carried out: a variant's missing rate over the individuals
kept is not its missing rate over every individual, and the variants
that failed their FILTER are among those counted. The owner chose it
so that the page reads each file once.

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
steps changes no count of the individuals, which are judged before the
reading, nor any filter of the variants, each of which judges a variant
by itself.

A VCF of which no variant passed is shown as any other, since the one
pass reads every variant. Carried out with the box on, its filters keep
no variant, and popnei refuses a pass that gives none; the tool then
says that no variant of the file passed its FILTER and that turning the
box off keeps them. Once popnei's issue #12 gives the count of the
failures, the box can say it before.

It is on by default on `popgen2.html`: that page gets a first project of
its own (`firstProject("popgen")` is shared today by both pages'
stores), which holds it beside the filter of the missing rate of the
variants at 0.1. The old page's first project does not change.

The old page does not offer the filter. A project file that holds it,
saved by `popgen2.html` once that page saves projects, is refused by
`popgen.html` with words that say it was made by the new page: the old
page has no box to show it or turn it off, so its user would have
variants left out with nothing on the screen saying so.

On a `.nei` file the box is not shown. A new file keeps the filters of
the project, so a user who had the box on for a VCF and opens a `.nei`
file still has it in the project; for a `.nei` file the filter does not
apply, as popnei refuses `filterPassed` on a vars file written before
its format 1.2, and the page cannot tell the format. So one function of
`src/core/`, the filters that apply to the project's file
(`filtersApplied`), leaves it out for a `.nei` file, and everything that
reads the filters reads that function rather than `p.filters`: the
requests and the keys of the readings that carry the filters out, the
rows and check numbers of the counts of each filter they give, the
scripts, the words of the warnings. Opening a VCF again gives it back.

In the code it changes the kinds of filter a project and its file can
hold: `VariantFilterKind` of `src/worker/protocol.ts`, from which the
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
dragged or a number is typed, the shading and the count of that
threshold follow it from the bins, with no change of the project. The
check box changes the project at each click.

The line and the box show the project's value, so Undo moves them back.
A threshold at the top of its axis keeps every variant or individual,
and is no filter in the project: moving it there turns the filter off,
which the project keeps aside in `filtersOff` as it keeps a filter the
user turns off on the old page, and a filter off is drawn at the top. The filter of the missing rate of
the variants starts at 0.1, the default of `docs/functionality.md`;
the others start off.

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
dropped by Start again or a new file. A failure still drops the plots,
since what was read before a refusal of the file may be what the
refusal is about.

The thresholds can be moved over the plots of a Stop, and their counts
are then of the variants read; the line of each plot says so.

## The notice of a change

A change of a threshold or of the box gives the notice of the old page,
which says what changed, "The MAF filter changed · Undo". On
`popgen2.html` no calculation is left behind by such a change, so the
notice says nothing of calculations stopped. With the presses of one
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
  again, unless its result is in the cache. Today that key shows as
  stopped and does not start.

The limit that `docs/architecture.md` section 5 records for the piece of
the filters, that every change of a threshold would stop the
calculation running, moves to that later piece.

## The counts of each threshold, until popnei gives the edges

The count under each plot is popnei's bins added up, without a pass, and
with popnei 0.2.1 it is a range where the bins cannot tell, as the
piece `thresholds` built it: "Keeps 1,113 to 1,152 of 1,200 variants",
popnei's count always inside it. popnei's issue #11,
https://github.com/JoseBlanca/popnei/issues/11, asks for the edges of
the bins to be given by the caller and for bins that hold their right
edge; with both, the page gives the edges 0, 0.001, …, 1 and every count
of a threshold of up to three decimals is one exact number, and the key
version of the one pass changes. The filters do not wait for it: a
filter carried out is given the number on the screen, exactly.

## The expected heterozygosity

popnei has no filter on the expected heterozygosity, so its plot keeps
no line, as the owner chose: the plot stays, with its title and the
count of its variants, and no box and no "Keeps" line.

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
  change of the project, Undo gives the value back; a threshold at the
  top of its axis removes the filter; `filtersApplied` leaves `passed`
  out for a `.nei` file and keeps it for a VCF; a project file holding
  `passed` reads back the same, and the old page's reading refuses it.
- In Playwright, on `popgen2.html` in Chromium and WebKit: the worker
  receives one request for a file, and none while a threshold is
  dragged, typed, moved with the arrow keys, undone, or the box turned;
  a run of ten arrow presses is one step of Undo; after a Stop the
  plots read so far stay, with their line.
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
  individuals are judged; a threshold at the top of its axis is no
  filter; `filtersApplied`, the filters that apply to the project's
  file.
- Section 5: the thresholds of `popgen2.html` change the project and
  start no calculation; the presses of one run of arrow keys make one
  change; the last result so far kept after a Stop; the quiet second and
  the keys that start again recorded for the first tool that starts by
  itself, where the limit of the piece of the filters moves.
- Section 7: the thresholds of `popgen2.html` show the project's
  filters; the first project of that page; the tools section, with its
  first tool, once popnei's issue #13 is done.
- Section 8: the project file with the kind `passed`, and the old page
  refusing it.

## The costs of the web

- **A frozen page:** none new. The counts from the bins add 1,280
  numbers at each move of a line, and the individuals kept sort the
  values of the individuals, a few thousand.
- **Memory:** none new; the download, which would add the file written,
  waits for popnei's issue #13.
- **The keyboard and a screen reader:** the line is a React Aria slider,
  moved by the arrow keys, as today; a run of presses is one change and
  one notice. To be heard in VoiceOver, the screen reader of macOS,
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
- **The thresholds kept as state of the page,** as the piece
  `thresholds` built them: no Undo, lost on another file, and nothing to
  carry out later.

## For the owner to decide

1. Approve the design, or what to change in it.
2. A threshold at the top of its axis is no filter in the project, so
   that dragging a line to the end turns its filter off and a filter
   off is drawn there. The other way, a filter at 1 kept in the project,
   would show in the notice and in what a tool reports a filter that
   leaves nothing out. The design recommends no filter.
