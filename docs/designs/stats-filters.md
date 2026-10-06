# The thresholds of the statistics as filters

A design of 6 October 2026, waiting for the owner's approval. It decides
how the thresholds that the user drags on the six histograms of
`popgen2.html` become filters of the project, and what is calculated
again when one of them moves. Until it is approved nothing of it is
built: the thresholds of the piece `thresholds` (plan
`docs/plans/thresholds.md`, branch `thresholds`) are state of the page,
change no statistic and are lost on a reload. The page and its one pass
over the file are those of `docs/plans/live-stats.md`; the filters of
the old page, `popgen.html`, are those of `docs/architecture.md`,
sections 2 to 5, which this design reuses and changes in the places its
last section lists.

## What the user can do once it is built

Cases 1 and 2 of `docs/use-cases.md` together: the user reads the
distributions of the open file, sets on them the thresholds of the
filters, sees how many variants and individuals each one keeps and how
many all of them keep together, and changes them until the count is one
they can work with.

- A threshold on the missing rate or the observed heterozygosity of the
  individuals takes individuals out. The four histograms of the variants
  are then calculated again over the individuals kept, since a variant's
  missing rate, MAF and heterozygosities depend on which individuals are
  counted.
- A threshold on the missing rate, the MAF or the observed
  heterozygosity of the variants takes variants out, and changes no
  histogram: each histogram of the variants is over every variant, so
  that the user sees what a threshold leaves out.
- A switch takes out the variants of a VCF that failed their FILTER.
- One line says how many variants all the filters keep together, in
  their order, and how many individuals.
- Every change is a change of the project, with Undo and Redo.

## The terms

- **A threshold** is the line the user drags on a histogram, with its
  number box. It keeps the variants or individuals on one side of it.
- **A filter** is a threshold that the project holds, with the other
  filters, in `Project.filters` and `Project.individualFilters`
  (`docs/architecture.md`, section 2). Each calculation that reads it
  has it in its key.
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
- **Starting by itself**: on `popgen2.html` the calculations start with
  no button, one after another, in the order of `src/ui/autoRuns.ts`
  (section 5). A calculation that runs and is no longer wanted is
  stopped by ending its worker and starting another, which opens the
  file again.

## Which calculation reads which filter

| calculation | what it gives | its key holds | runs |
|---|---|---|---|
| the one pass | the count, the value of each individual, the histograms of the variants over every individual | the file | once per file |
| the histograms of the variants over the individuals kept (`variantChecks`) | the four histograms | the file and the filters of the individuals | only while some individual is taken out |
| the counts of the filters (`filterCounts`) | the variants each filter is given and keeps, in order | the file and both kinds of filters | at every change of a filter |
| the FILTER failures (`filterFailures`) | how many variants failed their FILTER | the file | once per VCF |

The histograms of the individuals and the count never move, since popnei
gives the value of each individual over every variant and the filters of
the variants come after those of the individuals (section 2). The
histograms of the variants read the filters of the individuals and not
those of the variants, as on the old page (section 4, "The checks of the
Variants step"). While no individual is taken out, the page draws the
histograms of the variants from the one pass, and `variantChecks`, whose
`needs` then says it is not needed, does not run: the first view of a
file stays one pass. The counts of each filter alone, which the plots
say, come from the bins of the histogram it is drawn on, without a pass
(below); what all the filters keep together, which depends on their
order, needs the pass of `filterCounts`, over the file with every
filter, as on the old page. The individuals kept are known without a
pass, as on the old page: the store's `statistics` takes them from the
one pass's values of the individuals (`StoreConfig.statistics` of
`src/core/store.ts`, null on `popgen2.html` today), which reads no
filter, as that setting requires.

## When a threshold changes the project

A threshold changes the project, one change with its Undo, when the user
lets go of the line, presses Enter or leaves the number box, or presses
an arrow key on the line, as a number field of the old page does
(`src/ui/widgets/NumberField.tsx`). While the line is dragged or a
number is typed, the shading and the counts of that threshold follow it
from the bins, with no calculation and no change of the project.

## Calculations that start by themselves under keys that change

The limit `docs/architecture.md` section 5 records for the piece of the
filters: every change of a threshold gives the calculations that read it
a new key, and starting the new one stops the one left behind, which
ends the worker. Two changes settle it.

**A quiet second.** `autoRuns.ts` starts a calculation under a new key
only once the project has had no change for one second. A user who
presses an arrow key ten times starts one calculation, at the end, not
ten that are each stopped. A calculation already running under a key
that the change left behind is stopped when the new one starts, not
before, so that an Undo within the second keeps it. One second is a
first value, to be tried by the owner.

**Keys left behind are forgotten.** Today `autoRuns.ts` remembers every
key it started, so that a calculation stopped by the user is not
started again; and an Undo that comes back to a key whose calculation
was left behind and stopped shows it as stopped. It remembers instead
only the keys the user stopped with Stop. A key whose calculation was
stopped because a change left it behind starts again when the project
comes back to it, unless its result is in the cache, where an Undo
finds it at once.

What a stop costs is the restart of the worker: the wasm of popnei
compiled again from the browser's cache and the file opened again,
which reads its header or the index of a `.nei` file and not the whole
file (section 5). It has not been measured on this page; the plan of the
piece measures it in Chrome and Safari on `panel.vcf.gz` and on the VCF
of 200,000 variants before the second is settled.

## What the screen shows while it calculates again

A result is never shown under a key the project no longer gives
(invariant 1 of the `designing` skill). So when a threshold of the
individuals moves, the four histograms of the variants are those of the
new calculation as it runs: empty until its first result so far, within
about two seconds, then filling, as at the opening of a file. The plots
keep their place and their titles while they are empty, so that the
page does not jump. The lines of the thresholds stay where the user put
them.

The option not taken: to keep the old histograms on the screen, greyed
and marked as of the previous thresholds, until the new ones arrive.
The page would then not empty for two seconds, but invariant 1 would
change for every page, and a greyed plot that a user reads as current
shows numbers that no filter gives.

## The notice of a change

The old page says, at a change that leaves a calculation behind: "The
ongoing calculations will be stopped unless you undo the change." On
`popgen2.html` the calculations start again by themselves, so the notice
says only what changed, "The MAF filter changed · Undo", and the
progress of the new calculation shows the rest. A calculation left
behind is stopped when the new one starts, a second after the change,
and an Undo within that second keeps it.

## The FILTER filter

A switch in the file's box, beside the count of the failures: "Leave
out the 300 variants that failed their FILTER". It is a filter of the
variants of a new kind, `passed`, with no number, first in the order of
the filters, since it reads the file and not the genotypes. Its job
step is popnei's `filterPassed`, and its count is the `passed` entry of
popnei's counts that `live-stats` already reads. On a `.nei` file the
switch is not offered (`docs/plans/live-stats.md`, "What is left out").

This changes the kinds of filter a project and its file can hold:
`VariantFilterKind`, `VARIANT_FILTER_ORDER` and the reading of the
project file (section 8), which refuses a kind it does not know. A
project file saved with the switch on cannot be opened by a version of
the application from before it. That is hard to undo, and is the
owner's to approve with this design.

## Exact counts, and "below" rather than "at most"

The counts each threshold shows are exact, as the owner asked: the
individuals from popnei's value of each individual, the variants from
popnei's 1,280 fine bins over [0, 1], with the line snapped to an edge
of a fine bin. A value on an edge falls in the bin to its right
(`node_modules/popnei/dist/stats.d.ts`, the comment of the bins), so
the bins below an edge hold exactly the variants whose value is below
it, and not those whose value equals it. The edges fall on the round
numbers a user types, 0.1 among them, the 128th, and values on them are
common: a missing rate of 0.1 is one individual of ten missing. So a
count of the bins below the line at 0.1 would leave out, from what "at
most 0.1" keeps, every variant whose missing rate is 0.1. So the thresholds of the variants keep the values below the
line, and their words say so: "Missing rate below 0.1". As a filter,
the threshold t is given to popnei as the largest number below t
(popnei's filters keep the values at most their threshold), which keeps
the same variants the bins counted. The thresholds of the individuals
say "below" too, so that the six read alike, and the page gives the
same number to `individualsKept`. At the top of the axis, 1, the last
bin holds 1 too, and the threshold keeps everything: no filter.

The option not taken, and the one to weigh if "at most" matters more
than a popnei release: popnei gives bins that hold their right edge, as
an option of its histograms, and the thresholds keep the values at most
the line, as popnei's filters and plink's `--geno` do. That is an issue
for popnei.

## The expected heterozygosity

popnei has no filter on the expected heterozygosity (its filters are the
missing rate, the MAF, the observed heterozygosity, LD, regions, the
FILTER column, the first n and a random share). Its threshold, which
the piece `thresholds` draws as it draws the others, can only be shown.
Two options: its line is taken off once the thresholds are filters, or
popnei is asked for the filter. The design takes off its line; the
owner may want the filter.

## What changes in `docs/architecture.md`

Made on this branch once the owner approves, each with its paragraph
"What was revised":

- Section 2: the kind `passed` of the filters of the variants, first in
  their order.
- Section 4: `POPGEN2_ANALYSES` gains `variantChecks` and `filterCounts`;
  the store of `popgen2.html` takes the individuals kept from the one
  pass; `variantChecks` does not run while no individual is taken out.
- Section 5: the quiet second, the keys left behind forgotten, and the
  notice of `popgen2.html`; the limit recorded for this piece removed.
- Section 8: the project file with the kind `passed`.

## The costs of the web

- **A frozen page:** none new. The counts from the bins add 1,280
  numbers at each move of a line, and the individuals kept sort the
  values of the individuals, a few thousand.
- **Memory:** none new. Each restart gives the memory of the old worker
  back.
- **The keyboard and a screen reader:** the lines are React Aria
  sliders, moved by the arrow keys, Page Up and Page Down, Home and End,
  and read with their value and what they keep (`thresholds`); this
  design adds that each key press is a change of the project, so a
  screen reader says the notice of the change after each press. To be
  heard in VoiceOver before the plan is settled.
- **Downloads and browsers:** nothing new.

## Options not taken

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
2. The kind `passed` of filter in the project and its file, which an
   older version of the application cannot open.
3. "Below" with popnei as it is, or "at most" with a popnei issue for
   bins that hold their right edge.
4. The line of the expected heterozygosity taken off, or a popnei issue
   for its filter.
5. The quiet second, as a first value.
