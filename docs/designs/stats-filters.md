# The thresholds of the statistics as filters

A design of 6 and 7 October 2026, waiting for the owner's approval. It
decides how the thresholds that the user drags on the histograms of
`popgen2.html` become filters of the project, what is calculated again
when one of them moves, how the FILTER column becomes a filter, and
where the page offers what is done with the variants the filters keep:
a tools section, whose first tool is the download of the filtered file.
Until it is approved nothing of it is built: the thresholds of the piece
`thresholds` (plan `docs/plans/thresholds.md`, merged into `main` on 7
October 2026) are state of the page, change no statistic and are lost on
a reload. The page and its one pass over the file are those of
`docs/plans/live-stats.md`; the filters and the writing of the old page,
`popgen.html`, are those of `docs/architecture.md`, sections 2 to 6,
which this design reuses and changes in the places its last sections
list.

The owner answered on 7 October 2026 the questions of the first version
of this design: the FILTER column is a filter of the project, a check
box at the end of the part of the variants, on by default; it acts
before the individuals are judged; the line of the expected
heterozygosity is taken off; the plots read so far stay after a Stop;
and a tools section holds "Download filtered file…", the population
analyses and the GWAS joining it as each is built.

## What the user can do once it is built

Cases 1 and 2 of `docs/use-cases.md` together: the user reads the
distributions of the open file, sets on them the thresholds of the
filters, sees how many variants and individuals each one keeps and how
many all of them keep together, changes them until the count is one
they can work with, and downloads the variants and individuals kept.

- A check box at the end of the part of the variants, "Leave out the
  variants that failed their FILTER", on by default, for a VCF. With it
  on, every statistic of the page is over the variants that passed.
- A threshold on the missing rate or the observed heterozygosity of the
  individuals takes individuals out. The four histograms of the
  variants are then calculated again over the individuals kept, since a
  variant's missing rate, MAF and heterozygosities depend on which
  individuals are counted.
- A threshold on the missing rate, the MAF or the observed
  heterozygosity of the variants takes variants out, and changes no
  histogram: each histogram of the variants is over the variants before
  those filters, so that the user sees what a threshold leaves out. The
  expected heterozygosity has no threshold: popnei has no filter on it.
- One line says how many variants all the filters keep together, in
  their order, and how many individuals.
- A tools section, after the statistics, with "Download filtered file…",
  which writes the variants and individuals kept.
- Every change is a change of the project, with Undo and Redo.

## The terms

- **A threshold** is the line the user drags on a histogram, with its
  number box. It keeps the variants or individuals at most its number.
- **A filter** is a threshold, or the check box of the FILTER column,
  that the project holds, with the other filters, in `Project.filters`
  and `Project.individualFilters` (`docs/architecture.md`, section 2).
  Each calculation that reads it has it in its key.
- **The key** of a result is the hash of everything it was calculated
  from (section 3). A result is shown only under the key the current
  project gives it.
- **The individuals kept** are the individuals that the filters of the
  individuals leave, which the page works out from popnei's value of
  each individual (`src/core/individualsKept.ts`), since popnei filters
  individuals only by a list.
- **The one pass** is the summary of the file of `live-stats`, one call
  of popnei's `calcVariantsSummary`: the count, the value of each
  individual, and the histograms of the variants over every individual.
- **The worker** is the second thread of the browser tab in which
  popnei runs, so that the page does not freeze during a pass; it holds
  the open file and runs one calculation at a time.
- **Starting by itself**: on `popgen2.html` the calculations start with
  no button, one after another, in an order called **the chain**, kept
  by `src/ui/autoRuns.ts` (section 5). A calculation that runs and is
  no longer wanted is stopped by ending the worker and starting another,
  which opens the file again: popnei cannot be interrupted inside a pass.
- **Locked**: a calculation that cannot run on the current project, with
  the words that say why, such as the count of the FILTER failures on a
  `.nei` file. Each analysis says it in a function of its own, `needs`,
  which is given the project and nothing else.

## The FILTER filter, first of the filters

A filter of the variants of a new kind, `passed`, with no number: popnei's
step `filterPassed`, which keeps the variants whose FILTER is `PASS` or
a dot. The page opens every VCF with `onlyPassed: false`, as
`live-stats` does, so that the check box, and not the opening, decides;
the old page keeps its option of the reading, with its default.

It acts before the individuals are judged, as the owner chose: an
individual's missing rate and heterozygosity are counted over the
variants that passed, and so is everything after. In the order of the
filters it comes after the regions and before the list of the
individuals (section 2), where popnei asks for it ("first, or right
after `filterByRegions`"). So the one pass reads it: with the box on,
the one pass is over the variants that passed, and turning the box
reads the file again, the count, the individuals and the histograms of
the variants among it.

With the box on, the one pass also gives the count of the failures, in
popnei's `passed` entry of its counts; the separate pass of the count of
the failures (`filterFailures` of `live-stats`) runs only while the box
is off. The box says "Variants: 1,200" from that entry's variants given, every
variant of the file; the chromosomes are counted over the variants
that passed, the only ones the one pass gives per chromosome, so a
chromosome all of whose variants failed is not among them.

A VCF of which no variant passed, an unfiltered file with the box on,
gives popnei no variant, and popnei refuses a pass that gives none. So
when the one pass is refused for that reason alone, the runner reads the
file again with popnei's `iterBlocks`, which gives the counts of a pass
of no variant, and answers the one pass with its counts and no
statistics: the box says "Variants: 1,200" and "FILTER failures:
1,200", and each part says "No variant passed its FILTER. Turn the box
off to see them all.", with the box beside it. `filterFailures` falls
back the same way today (`runFilterFailures` of `src/worker/runner.ts`).

It is on by default on `popgen2.html`: that page gets a first project of
its own (`firstProject("popgen")` is shared today by both pages'
stores), which holds it beside the missing data filter at 0.1. The old
page's first project does not change.

The old page does not apply the filter. A project file that holds it,
saved by `popgen2.html` once that page saves projects, is refused by
`popgen.html` with words that say it was made by the new page, since
its statistics of each individual, `individualChecks`, read no filter
and would judge the individuals over every variant while its other
analyses dropped the failed ones first.

On a `.nei` file the box is not shown. A new file keeps the filters of
the project, so a user who had the box on for a VCF and opens a `.nei`
file still has it in the project; for a `.nei` file the filter does not
apply, as popnei refuses `filterPassed` on a vars file written before
its format 1.2 and the page cannot tell the format. So one function of
`src/core/`, the filters that apply to the project's file
(`filtersApplied`), leaves it out for a `.nei` file, and everything that
reads the filters reads that function rather than `p.filters`: the
requests, the keys, the rows and the check numbers of the counts of the
filters (`filterCountRows` and `numCheckNumbers` of
`src/core/analyses/filterCounts.ts`, which would otherwise find a filter
with no count, a defect), the scripts, the words of the warnings. Opening
a VCF again gives it back.

What approving it commits to: a project file saved with the filter
cannot be opened by a version of the application from before it, since
the reading of a project file refuses a kind of filter it does not know
(section 8). In the code it changes the kinds of filter a project and
its file can hold: `VariantFilterKind` of `src/worker/protocol.ts`, from
which the kinds of the project come, `VARIANT_FILTER_ORDER`, the tables
of the project that take a kind with no number (`Kinds`, `filtersOff`),
the check of the messages (`checkFiltering`, `PROTOCOL_VERSION`), the
steps of the runner, the words of each kind (`FILTER_KIND_WORDS`),
every `script()`, and the reading of the project file. The route that
`live-stats` built for the count of the failures, a step of its own
(`Steps.passed` of the runner, already before the list of individuals)
and a kind of the counts alone (`PassFilterKind`, `PASS_FILTER_ORDER`,
`isPassFilterKind` of `messages.ts`), goes: the filter is carried in the
`filters` of a request as any filter is, so that one route reaches the
step, and the runner's `Steps` takes it out of them and puts it first,
before the list of the individuals, where `stepsAre` compares it and
where the regions will go too.

## Which calculation reads which filter

| calculation | what it gives | its key holds | runs |
|---|---|---|---|
| the one pass | the count, the value of each individual, the histograms of the variants over every individual | the file and the FILTER filter | once per file, and at each turn of the box |
| the count of the FILTER failures (`filterFailures`) | how many variants failed their FILTER | the file | only while the box is off, for a VCF |
| the histograms of the variants over the individuals kept (`variantChecks`) | the four histograms | the file, the FILTER filter and the filters of the individuals | only while the filters of the individuals take some individual out |
| the counts of the filters (`filterCounts`) | the variants each filter is given and keeps, in order | the file and every filter | at every change of a filter |

The FILTER filter reaches the keys of the one pass and of
`variantChecks` through their `keyInputs`, not through `filtersRead`,
which is all the filters of the variants or none: the one pass is the
store's `statistics`, which may read no filter of either kind
(`createStore` refuses one that does), and the thresholds of the
variants must stay out of both keys. Their requests send it, where they
send `filters: []` today, and the store's words that the statistics of
the individuals are "over every variant of the file" change. The
individuals kept are taken from the one pass's finished result only,
never from a result so far, kept after a Stop or not.

The histograms of the individuals and the count move only with the
FILTER filter, since popnei gives the value of each individual over the
variants of the one pass, and the thresholds of the variants come after
those of the individuals (section 2). The histograms of the variants
read the FILTER filter and the filters of the individuals, and not the
thresholds of the variants, as on the old page (section 4, "The checks
of the Variants step"). While the filters of the individuals take no
individual out, which the page knows from the individuals kept, the
page draws the histograms of the variants from the one pass, which then
gives the same numbers, and `autoRuns.ts` does not start
`variantChecks`: the first view of a file stays one pass, and a
threshold of the individuals that takes nobody out calculates nothing.
This cannot be said by the `needs` of `variantChecks`, since it is
given only the project, while the individuals kept depend on the result
of the one pass; so the rule is the page's, in `autoRuns.ts` and in the
part that draws the histograms, both reading the same individuals kept
(`individualsKept` of `src/core/`, over the project and the one pass's
values).

The counts of each threshold alone, which the plots say, come from the
bins of the histogram it is drawn on, without a pass (below); what all
the filters keep together, which depends on their order, needs the pass
of `filterCounts`, over the file with every filter, as on the old page,
and is exact. The individuals kept are known without a pass, as on the
old page: the store's `statistics` takes them from the one pass's
values of the individuals (`StoreConfig.statistics` of
`src/core/store.ts`, null on `popgen2.html` today), which reads no
threshold, as that setting requires; and the store's `counts` names
`filterCounts`, null today too.

What every opening costs: the first project holds the missing data
filter at 0.1 and the FILTER filter, so the counts of the filters run
at every opening, a second pass over the file that reads the genotypes,
after the one pass. The plan measures it beside the restart of the
worker.

The chain of `autoRuns.ts` runs, in this order: the one pass; the count
of the FILTER failures, while the box is off; the histograms over the
individuals kept, when they are needed; the counts of the filters. A
calculation that is locked or not needed neither starts nor holds back
the rest (`docs/architecture.md`, section 5, since `live-stats`). The
one Stop stops whichever runs and keeps the rest from starting; Start
again starts the first not done.

## When a threshold changes the project

A threshold changes the project, one change with its Undo, when the user
lets go of the line, presses Enter or leaves the number box. The arrow
keys, on the line or in the box, move the threshold at once, and the
presses of one run make one change, at the quiet second below or when
the focus leaves: an axis has about 100 positions and a held key
repeats, so a change at each press would fill the 200 steps of the
history (`MAX_UNDO_STEPS` of `src/core/history.ts`) with two sweeps of
an axis and drop the opening of the file from it. While the line is dragged or a
number is typed, the shading and the counts of that threshold follow it
from the bins, with no calculation and no change of the project. The
check box changes the project at each click.

## Calculations that start by themselves under keys that change

The limit `docs/architecture.md` section 5 records for the piece of the
filters: every change of a threshold gives the calculations that read it
a new key, and starting the new one stops the one left behind, which
ends the worker. Two changes settle it.

**A quiet second.** After a change of a filter, `autoRuns.ts` starts a
calculation under a new key only once the filters have had no change
for one second. A user who presses an arrow key ten times starts one
calculation, at the end, not ten that are each stopped. Other changes,
the reading of a file among them, start at once, as today. A calculation
running under a key that a change left behind is stopped when the next
calculation starts, or at once by a second change that does not give its
key back, as section 5 has it; an Undo within the second keeps it.

**Keys left behind start again when the project comes back to them.**
Today `autoRuns.ts` remembers every key it started, for two reasons: a
calculation stopped by the user is not started again, and each key
starts once, so that a result dropped from the cache, or a start the
store refuses, is not tried again at every change of the store. Both
stay. What changes: when the store stops a calculation because a change
left its key behind, `autoRuns.ts` forgets that key, so that an Undo, or
the old threshold typed again, starts it again, unless its result is in
the cache, where the Undo finds it at once. Today that key shows as
stopped and does not start.

What a stop costs is the restart of the worker: the wasm of popnei
compiled again from the browser's cache and the file opened again,
which reads its header or the index of a `.nei` file and not the whole
file (section 5). It has not been measured on this page; the plan of the
piece measures it in Chrome and Safari on `panel.vcf.gz` and on the VCF
of 200,000 variants before the second is settled.

## What the screen shows while it calculates again, and after a Stop

A result is never shown under a key the project no longer gives: the
first of the invariants that the rest of the code relies on (the
`designing` skill), so that no plot shows numbers of other settings
than the ones on the screen. So when a threshold of the individuals
moves, or the box turns, the histograms that read it are those of the
new calculation as it runs: empty until its first result so far, which
comes after the quiet second, the restart of the worker when a
calculation was running, and up to two seconds of the pass, then
filling, as at the opening of a file. The plots keep their place and
their titles while they are empty, so that the page does not move. The
lines of the thresholds stay where the user put them.

After a Stop the plots read so far stay, as the owner chose, each with
its line saying that it is of the variants read before the Stop. They
are of the current key, so the invariant holds: a result so far of the
inputs on the screen, marked as partial. The store keeps, for a
calculation the user stopped, its last result so far beside the state
`ready` (`stopped: { soFar }`), never cached, with no check numbers,
dropped by Start again, a new key or a new file. A failure still drops
the plots, since what was read before a refusal of the file may be what
the refusal is about.

The option not taken: to keep the old histograms on the screen, greyed
and marked as of the previous thresholds, until the new ones arrive.
The page would then not empty for those seconds, but the invariant
would change for every page, and a greyed plot that a user reads as
current shows numbers that no filter gives.

## The notice of a change

The old page says, at a change that leaves a calculation behind: "The
ongoing calculations will be stopped unless you undo the change." On
`popgen2.html` the calculations start again by themselves, so the notice
says only what changed, "The MAF filter changed · Undo", and the
progress of the new calculation shows the rest. A calculation left
behind is stopped when the next one starts, a second after a change of
a filter, or at once by a second change that does not give its key
back; an Undo within that second keeps it.

## The tools section and the download of the filtered file

A section of its own after the statistics and before "Open another
variants file…", named "Tools", whose first tool is "Download filtered
file…". The population analyses and the GWAS join it as each is built,
not before: a button that does nothing yet is not on the page.

"Download filtered file…" writes the variants and individuals the
filters keep, as the writing of the old page does (`docs/architecture.md`,
section 5, "Writing the filtered variants is a request of the
calculation worker"; section 6, "The files written"): the same request, a key of the load, the filters and the format, its
progress and Stop, and the file saved by the browser. The old page
writes only `.nei` files (`WriteJob.format` of `src/worker/protocol.ts`,
the store's `startWrite`); a VCF is a change of its own, of the request,
the store's states of the writing and the runner, and of memory:
popnei's `writeVcf` builds the whole file in the memory of the worker
before it crosses to the page, so a VCF holds about twice the text of
the kept variants uncompressed in the worker, plus the file in the page,
until the worker is restarted. Whether the first download offers the VCF
is the owner's (below). The
store of `popgen2.html` gets the writing that it has as `null` today.
The writing is started by the user, not by itself. It does not wait for
the chain: a calculation of the chain running when the user asks for
the file is stopped, as a request the user asks for stops what runs on
the old page, and `autoRuns.ts` does not count that as a Stop of the
user, as it does not for a calculation left behind by a change: it
starts it again once the file is written. The chain starts nothing
while the file is written (`anyRunning` of `autoRuns.ts` reads the
writing too), so that its next calculation does not wait behind the
writing with a bar of no progress. What the user chooses before the writing, the
format, is a small dialog opened by the button, with the format and the
name of the file; its words and layout are the plan's.

## The counts of each threshold, until popnei gives the edges

The count under each plot is popnei's bins added up, without a pass, and
with popnei 0.2.1 it is a range where the bins cannot tell, as the
piece `thresholds` built it: "Keeps 1,113 to 1,152 of 1,200 variants",
popnei's count always inside it. popnei's issue #11,
https://github.com/JoseBlanca/popnei/issues/11, asks for the edges of
the bins to be given by the caller and for bins that hold their right
edge; with both, the page gives the edges 0, 0.001, …, 1 and every count
of a threshold of up to three decimals is one exact number.

The filters do not wait for it. A filter applied is given the number on
the screen, exactly, and what all the filters keep together is the pass
of `filterCounts`, exact. Only the count under each plot, of that
threshold alone, stays a range until popnei has the options; then the
page asks for those edges, in the one pass and in `variantChecks`, which
changes their key versions.

## The expected heterozygosity

popnei has no filter on the expected heterozygosity, so its plot keeps
no line, as the owner chose: the plot stays, with its title and the
count of its variants, and no box and no "Keeps" line.

## What changes in `docs/architecture.md`

Made on this branch once the owner approves, each with its paragraph
"What was revised":

- Section 2: the kind `passed` of the filters of the variants, after the
  regions and before the list of the individuals, and why.
- Section 3: the key of the one pass holds the FILTER filter.
- Section 4: `POPGEN2_ANALYSES` gains `variantChecks` and `filterCounts`;
  the store of `popgen2.html` takes the individuals kept from the one
  pass, names `filterCounts` for the counts and gets the writing; on
  `popgen2.html` `variantChecks` starts by itself, and not while no
  individual is taken out, where section 4 says today that it runs when
  the user presses its button.
- Section 5: the chain of four; the quiet second after a change of a
  filter; the keys left behind that start again; the notice of
  `popgen2.html`; the last result so far kept after a Stop; the limit
  recorded for this piece removed.
- Section 7: the tools section of `popgen2.html`.
- Section 8: the project file with the kind `passed`.

## The costs of the web

- **A frozen page:** none new. The counts from the bins add 1,280
  numbers at each move of a line, and the individuals kept sort the
  values of the individuals, a few thousand.
- **Memory:** a `.nei` file is written as on the old page. A VCF holds
  about twice the text of the kept variants, uncompressed, in the memory
  of the worker, until the worker restarts, plus the file in the page.
- **The keyboard and a screen reader:** each key press on a line or in a
  box is now a change of the project, so a screen reader says the notice
  of the change after each press. To be heard in VoiceOver, the screen
  reader of macOS, before the plan is settled.
- **Downloads and browsers:** nothing new to download; the dialog of the
  format is `<dialog>` with `showModal`, within the floor of
  `docs/technology.md`; the file is saved through the browser's
  download, not `showSaveFilePicker`, which only Chrome has.

## Options not taken

- **The FILTER filter after the individuals,** with the other filters of
  the variants, the first version of this design: the one pass would
  read no filter and the box would read the file again for nothing but
  the counts; the owner chose the individuals judged over the variants
  that passed.
- **The one pass over the individuals kept,** so that one calculation
  gave everything: the count and the values of the individuals would be
  read again at every change of a threshold of the individuals, and the
  first view would wait for the filters. Kept apart instead, at the cost
  of a second pass when an individual is taken out.
- **The key of the histograms by the individuals kept rather than by
  their filters,** so that two thresholds that keep the same individuals
  share a result: the key would depend on a result in the cache, and
  would not be known once the cache had dropped it.
- **No start by itself for what reads a filter,** with a Count button as
  on the old page: the owner asked for statistics that follow the file
  without a button, and the quiet second costs less than a click.

## For the owner to decide

1. Approve the design, or what to change in it.
2. The formats of the first download: `.nei` alone, the old page's
   writing as it is; or `.nei` and VCF, a VCF being what other tools
   read, at the cost of the change of the writing and of the memory
   above. The design recommends both.
3. The quiet second, as a first value, to be settled once the restart of
   the worker is measured and the owner has tried it.
