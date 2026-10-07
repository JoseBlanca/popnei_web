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
- **The worker** is the second thread of the browser tab in which
  popnei runs, so that the page does not freeze during a pass; it holds
  the open file and runs one calculation at a time.
- **Starting by itself**: on `popgen2.html` the calculations start with
  no button, one after another, in an order called **the chain**, kept
  by `src/ui/autoRuns.ts` (section 5). A calculation that runs and is
  no longer wanted is stopped by ending the worker and starting another,
  which opens the file again: popnei cannot be interrupted inside a pass.
- **Locked**: a calculation that cannot run on the current project, with
  the words that say why, such as the FILTER failures on a `.nei` file.
  Each analysis says it in a function of its own, `needs`, which is given
  the project and nothing else.

## Which calculation reads which filter

| calculation | what it gives | its key holds | runs |
|---|---|---|---|
| the one pass | the count, the value of each individual, the histograms of the variants over every individual | the file | once per file |
| the histograms of the variants over the individuals kept (`variantChecks`) | the four histograms | the file and the filters of the individuals | only while the filters of the individuals take some individual out |
| the counts of the filters (`filterCounts`) | the variants each filter is given and keeps, in order | the file and both kinds of filters | at every change of a filter |
| the FILTER failures (`filterFailures`) | how many variants failed their FILTER | the file | once per VCF |

The histograms of the individuals and the count never move, since popnei
gives the value of each individual over every variant and the filters of
the variants come after those of the individuals (section 2). The
histograms of the variants read the filters of the individuals and not
those of the variants, as on the old page (section 4, "The checks of the
Variants step"). While the filters of the individuals take no
individual out, which the page knows from the individuals kept, the page
draws the histograms of the variants from the one pass, which then gives
the same numbers, and `autoRuns.ts` does not start `variantChecks`: the
first view of a file stays one pass, and a threshold of the individuals
that takes nobody out calculates nothing. This cannot be said by the `needs` of
`variantChecks`, since it is given only the project, while the
individuals kept depend on the result of the one pass; so the rule is
the page's,
in `autoRuns.ts` and in the part that draws the histograms, both reading
the same individuals kept (`individualsKept` of `src/core/`, over the
project and the one pass's values). The counts of each filter alone, which the plots
say, come from the bins of the histogram it is drawn on, without a pass
(below); what all the filters keep together, which depends on their
order, needs the pass of `filterCounts`, over the file with every
filter, as on the old page. The individuals kept are known without a
pass, as on the old page: the store's `statistics` takes them from the
one pass's values of the individuals (`StoreConfig.statistics` of
`src/core/store.ts`, null on `popgen2.html` today), which reads no
filter, as that setting requires; and the store's `counts` names
`filterCounts`, null today too.

The chain of `autoRuns.ts` runs, in this order: the one pass; the
FILTER failures, for a VCF; the histograms over the individuals kept,
when they are needed; the counts of the filters. Since `live-stats`, a
calculation that is locked, as `filterFailures` is on a `.nei` file,
neither starts nor holds back the rest of the chain; the chain also
passes over one that is not needed, so that the counts of the filters
start while no individual is taken out. The one Stop
stops whichever runs and keeps the rest from starting; Start again
starts the first not done.

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

**A quiet second.** After a change of a filter, `autoRuns.ts` starts
a calculation under a new key only once the filters have had no change
for one second. A user who presses an arrow key ten times starts one
calculation, at the end, not ten that are each stopped. Other changes,
the reading of a file among them, start at once, as today. A calculation
running under a key that a change left behind is stopped when the next
calculation starts, or at once by a second change that does not give its
key back, as `docs/architecture.md` section 5 has it; an Undo within the
second keeps it.

**Keys left behind start again when the project comes back to them.**
Today `autoRuns.ts` remembers every key it started, for two
reasons: a calculation stopped by the user is not started again, and
each key starts once, so that a result dropped from the cache, or a
start the store refuses, is not tried again at every change of the
store. Both stay. What changes: when the store stops a calculation
because a change left its key behind, `autoRuns.ts` forgets that key,
so that an Undo, or the old threshold typed again, starts it again,
unless its result is in the cache, where the Undo finds it at once.
Today that key shows as stopped and does not start.

What a stop costs is the restart of the worker: the wasm of popnei
compiled again from the browser's cache and the file opened again,
which reads its header or the index of a `.nei` file and not the whole
file (section 5). It has not been measured on this page; the plan of the
piece measures it in Chrome and Safari on `panel.vcf.gz` and on the VCF
of 200,000 variants before the second is settled.

## What the screen shows while it calculates again

A result is never shown under a key the project no longer gives: the
first of the invariants that the rest of the code relies on (the
`designing` skill), so that no plot shows numbers of other settings
than the ones on the screen. So when a threshold of the
individuals moves, the four histograms of the variants are those of the
new calculation as it runs: empty until its first result so far, which
comes after the quiet second, the restart of the worker when a
calculation was running, and up to two seconds of the pass, then
filling, as at the opening of a file (popnei sends a result so far at
most every two seconds of the pass, whatever the file). The plots
keep their place and their titles while they are empty, so that the
page does not jump. The lines of the thresholds stay where the user put
them.

The option not taken: to keep the old histograms on the screen, greyed
and marked as of the previous thresholds, until the new ones arrive.
The page would then not empty for those seconds, but invariant 1 would
change for every page, and a greyed plot that a user reads as current
shows numbers that no filter gives.

## The notice of a change

The old page says, at a change that leaves a calculation behind: "The
ongoing calculations will be stopped unless you undo the change." On
`popgen2.html` the calculations start again by themselves, so the notice
says only what changed, "The MAF filter changed · Undo", and the
progress of the new calculation shows the rest. A calculation left
behind is stopped when the next one starts, a second after a change of
a filter, or at once by a second change that does not give its key
back; an Undo within that second keeps it.

## The FILTER filter

A switch in the file's box, beside the count of the failures: "Leave
out the 300 variants that failed their FILTER". It is a filter of the
variants of a new kind, `passed`, with no number. Its job step is
popnei's `filterPassed`, and its count is the `passed` entry of popnei's
counts that `live-stats` already reads. The page opens every VCF with
`onlyPassed: false`, as `live-stats` does, so that the switch, and not
the opening, decides; the old page keeps its option of the reading.

Where it goes in the order of the filters is the owner's: popnei asks
for it first or right after the regions, and the architecture puts the
list of the individuals between the regions and the filters of the
variants (section 2). The design puts it after the list of the
individuals, with the other filters of the variants: the individuals
are then judged over every variant, failed or not, as they are judged
today over the variants that the other filters take out, and the one
pass reads no filter. Put before the individuals, as the regions are,
an individual's missing rate would be over the variants that passed
(on `low_qual.vcf.gz`, 900 of 1,200), and the one pass would have to
read the switch, so that the count and the values of the individuals
would be read again at each turn of it.

On a `.nei` file the switch is not offered. A new file keeps the
filters of the project, so a user who turned the switch on for a VCF and
then opens a `.nei` file still has it on; the calculations that read it
are then locked, with words that say the switch needs a VCF. Sending
them would fail: popnei refuses `filterPassed` on a `.nei` file written
before its format 1.2, and the page cannot tell the format.

What approving the switch commits to: a project file saved with the
switch on cannot be opened by a version of the application from before
it, since the reading of a project file refuses a kind of filter it does
not know (section 8). In the code it changes the kinds of filter a
project and its file can hold:
`VariantFilterKind` of `src/worker/protocol.ts`, from which the kinds of
the project come, `VARIANT_FILTER_ORDER`, the tables of the project
that take a kind with no number (`Kinds`, `filtersOff`), the check of
the messages (`checkFiltering`, `PROTOCOL_VERSION`), the steps of the
runner, the words of each kind (`FILTER_KIND_WORDS`), every `script()`,
and the reading of the project file. That is hard to undo, and is the
owner's to approve with this design.

## Exact counts need popnei

The owner asked for the count each threshold keeps to be exact: the
individuals from popnei's value of each individual, which is exact, and
the variants from popnei's 1,280 fine bins over [0, 1], with the line
snapped to an edge of a fine bin. popnei 0.2.1 does not allow it, for
two reasons that act together:

- A value on an edge falls in the bin to its right
  (`node_modules/popnei/dist/stats.d.ts`, the comment of the bins),
  while popnei's filters keep the values at most their threshold. So
  the bins below the edge 0.1 hold the variants whose value is below
  0.1, and not those at 0.1; and values on the round edges are common:
  a missing rate of 0.1 is one individual of ten missing.
- popnei makes the edges as k · (1/1280), not k/1280. On 817 of the
  1,281 edges the two are the same number; on the other 464 the edge is
  the next number above, 0.30000000000000004 for 0.3. There the bins
  below the edge hold the values at most 0.3.

So the words "at most" are exact on 464 edges and, on the other 817,
the count leaves out the values on the edge; the words "below" are exact
on those 817 and wrong on the 464. The
architecture review of 6 October 2026 found it under node on popnei
0.2.1, on a VCF of 10 diploid individuals with missing rates of exactly
0.1, 0.3 and 0.7; it also found that the bins below edge k always equal
popnei's filter given the largest number below `histBinEdges[k]`, on
933 edges of `panel.vcf.gz` and `low_qual.vcf.gz`.

The design asks popnei for histograms whose bins hold their right edge
and whose edges are lo + (hi − lo) · k / n, an option of its
`histKwargs`. With them the bins below the edge t hold exactly the
values at most t, the words say "at most", as popnei's filters, plink's
`--geno` and `docs/use-cases.md` do, and the filter is given t itself:
the project, its file, the keys and the script hold the number the user
typed, and a line at 0 keeps the values at 0. The issue is drafted
beside this design, for the owner to open.

Until popnei has it, the thresholds of the piece `thresholds`, which
are only shown, say "at most" and count the bins below the edge, and
their counts leave out the variants whose value is on an edge that
equals its round number; the report of that piece gives how many on the
fixtures. The filters are not built before popnei has the option.

The option not taken: to word the thresholds "below" and give popnei the
largest number below the edge. It is exact with popnei as it is, but the
project, its file and the script would hold numbers such as
0.09999999999999999, a line at 0 would have no threshold popnei takes,
and a later change to "at most" would leave files of the old meaning.

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
  pass and names `filterCounts` for the counts; on `popgen2.html`
  `variantChecks` starts by itself, and not while no individual is
  taken out, where section 4 says today that it runs when the user
  presses its button.
- Section 5: the chain of four, which passes over what is locked or not
  needed; the quiet second after a change of a filter; the keys left
  behind that start again; the notice of `popgen2.html`; the limit
  recorded for this piece removed.
- Section 8: the project file with the kind `passed`.

And in the code that `live-stats` built for the count of the FILTER
failures, which reaches popnei's `filterPassed` by a step of its own
(`Steps.passed` of the runner, placed before the list of individuals)
and counts it under a kind of the counts alone (`PassFilterKind`,
`PASS_FILTER_ORDER`, `PASS_FILTER_KINDS`): those go, the request of
`filterFailures` carries the filter `{ kind: "passed" }` in its
`filters` as any filter is carried, and the runner places it where the
order of the filters puts it, so that one route reaches the step.

## The costs of the web

- **A frozen page:** none new. The counts from the bins add 1,280
  numbers at each move of a line, and the individuals kept sort the
  values of the individuals, a few thousand.
- **Memory:** none new. Each restart gives the memory of the old worker
  back.
- **The keyboard and a screen reader:** the lines are sliders of React
  Aria, the library of the controls of the applications, moved by the arrow keys, Page Up and Page Down, Home and End,
  and read with their value and what they keep (`thresholds`); this
  design adds that each key press is a change of the project, so a
  screen reader says the notice of the change after each press. To be
  heard in VoiceOver, the screen reader of macOS, before the plan is
  settled.
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
2. The popnei issue for histograms whose bins hold their right edge,
   with edges lo + (hi − lo) · k / n, on which exact counts and the
   filters wait; or the thresholds worded "below", exact with popnei as
   it is, with the costs above.
3. The kind `passed` of filter in the project and its file, which an
   older version of the application cannot open; and its place: after
   the list of the individuals, as the design has it, or before it.
4. The line of the expected heterozygosity taken off, or a popnei issue
   for its filter.
5. The quiet second, as a first value, to be settled once the restart of
   the worker is measured and the owner has tried it.
