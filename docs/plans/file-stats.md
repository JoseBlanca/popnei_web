# The statistics of the open file

The second piece of the new screens, asked for by the owner on 6 October
2026: once a variants file is open, `popgen2.html` computes and shows
the distributions of statistics over its variants and over its
individuals, starting on its own, with a way to stop. Built as the
`building` skill says, on the branch `file-stats`, made from
`open-variants`, which is not merged yet.

## What the user can do when it is done

Steps 3 and 4 of case 2 of `docs/use-cases.md`, and what case 1 chooses
its thresholds from. Once a file is open and its variants counted, the
page computes, with its progress shown and one button that stops it:

- over the variants: the distributions of the missing rate, the MAF, the
  observed heterozygosity and the expected heterozygosity, unbiased
  (Nei's), each with its mean and the number of variants it rests on;
- over the individuals: the distributions of the missing rate and of the
  observed heterozygosity, and a table of the individuals that can be
  sorted by either, so that the user finds the ones in the tails.

The owner's words: "Once that we have a file opened I think that we
should show in the same page some descriptive statistics beyond the
number of individuals and ploidy … We could start calculating this stats
as soon as the file is loaded … we should give the user a way to stop
it. We could add in the div that will show these stats a button 'stop
stats calculation' or something like that." And: "let's add the exp het
too." The owner also wants, later, the number of variants a FILTER
filter removes, once popnei has it (popnei issue #9).

Each statistic is drawn when its pass over the file ends. Drawing them
as the pass goes needs popnei to give the result so far, which popnei
issue #10 asks for, together with one pass for the three calls; until
then each pass shows its progress.

## What it stands on

- `src/core/analyses/variantChecks.ts`: popnei's `calcPerVarDistribs`
  in the worker (`src/worker/runner.ts`, `VARIANT_CHECKS_STATS`), today
  the MAF, the observed and the unbiased expected heterozygosity, 40
  bins over 0 to 1, `minNumIndividuals` 0, over the individuals the
  filters of individuals keep, before any filter of the variants. Its
  result is `VariantChecksResult` of `src/worker/protocol.ts`.
- `src/core/analyses/individualChecks.ts`: popnei's
  `calcPerIndividualStats`, the missing rate and the observed
  heterozygosity of each individual, before any filter. Its histograms
  are binned in the page by `binValues` of `src/core/histogram.ts`, 20
  bins over the range of the values, as on the old page.
- The drawing: `HistogramPlot` of `src/ui/widgets/` over
  `src/charts/histogram.ts`; the table of the individuals,
  `IndividualTable.tsx` of `src/ui/steps/variants/` over `SortableTable`.
- The page: `POPGEN2_ANALYSES` of `src/core/apps.ts`, the store of
  `src/ui/popgen2Store.ts`, the start on its own of `src/ui/autoRuns.ts`
  and `startByThemselves` of `src/ui/popgen2.tsx`, the box of
  `src/ui/variants/`.

## The design

**The missing rate of each variant.** popnei 0.2.0 gives it,
`"missing_rate"` of `calcPerVarDistribs`; the application does not ask
for it yet. `variantChecks` asks for it too, its result gains a
`missingRate` distribution, the check of the result in `messages.ts`
with it, `PROTOCOL_VERSION` is raised, and the module's `keyVersion`.
The old page gets the field in its result and does not draw it. The
check numbers of `variantChecks`, which a project file keeps, stay four:
the mean missing rate does not join them, since a fifth would make every
project file saved from the old page with the histograms refused at its
opening ("5 numbers … and not 4"), a change of the format that is the
owner's. Every fixture that builds a `VariantChecksResult` gains the
field, the typed arrays the runner transfers include its counts, and
`script()` asks popnei's Python for `MISSING_RATE` too.

**The two analyses join the page's list,** `POPGEN2_ANALYSES`, and the
page's store gets the configuration of the statistics of individuals
that `variantChecks` needs because it reads the filters of individuals,
as `popgenStore.ts` gives it (`individualStatsOf` of `apps.ts`). The new
page has no filter of individuals yet, so both are over every
individual.

**They start on their own, one after the other.** The calculation
worker runs one request at a time, and the store has no state for a
request that waits in the client's queue: three sent at once would all
show as running, two of them with no progress. So the page starts them
in a chain, each when the one before it is done: the count, then the
individuals, then the variants. `autoRuns` gains the order of its ids
and starts an id only when those before it are done; the statistics'
section says of one not started yet that it waits for the one before.
The count comes first, since the box waits for it.

**One Stop for the statistics.** The statistics' section has one
button, "Stop the statistics" or the like, that stops the pass running
and keeps the ones not run yet from starting, and, once stopped, one that
starts again what is not done. When either button goes, the focus goes
to a place that stays, as the count's Stop sends it, not to the top of
the page. The count of the box keeps its own Stop and Count again; since
the statistics start only once the count is done, the count's Stop
leaves them not started, and Count again does not wait behind them.

**Where it goes.** A section below the open widget, so that its
growing plots never move the open button. Under it, two parts,
"Variants" and "Individuals", each with its plots in a grid that is two
plots wide on a desktop and one at 320 px. Each plot has its title and the number of variants or individuals it
is over, and the variants' plots their mean, which popnei gives. The
individuals' plots have no mean: popnei gives each individual's values
and no mean of them, and the numbers are popnei's. Their bins are made
in the page from popnei's values, by `binValues`, as the old page makes
them; the report tells the owner, and popnei can be asked for them. The tabs of a table of the bins and the downloads the old page's
components draw are left out of this page, which the owner wants plain;
they come back with the piece of the downloads.

## The phases

**1. The analyses on the page.** The missing rate in `variantChecks`
(core, protocol, runner, messages, tests with popnei's numbers on
`panel.vcf.gz`); the two analyses in `POPGEN2_ANALYSES` and the store's
configuration; `autoRuns` starting the three in order; the one Stop of
the statistics and its starting again. The old page must behave as before, and its tests pass. Tests in
Vitest, as the coding skill says. `docs/architecture.md` section 5,
which says a calculation starts when the user asks and that on popgen2
only the summary starts by itself, is revised; and it records the limit
the filters' piece must settle: an analysis that starts by itself and
reads a filter gets a new key at every change of a threshold, and its
start stops the run left behind, which restarts the worker.

**2. The section.** The plots and the table, drawn as each result
arrives, the progress of the pass running and the Stop, the words of a
failure of each analysis (a failure of one does not hide the other's
result), in the words of the writing skill's last section. Tests: a flow
of case 2 on `panel.vcf.gz` (the six distributions, their means and
counts as popnei gives them, the table sorted), Stop and start again,
`tetraploid.vcf.gz`, and a pass that fails; axe on each state. Screens:
nothing computed yet, running, done, stopped, a failure; light and dark,
desktop and 320 px.

## What is left out

- The site frequency spectrum of all the individuals (case 2, step 3): a
  later piece, since it needs a number of chromosomes to draw.
- The plots drawn as the pass goes: popnei issue #10.
- The downloads of the plots and their tables: a later piece.
- The count of the variants the FILTER filter removes: popnei issue #9.
- The filters themselves, and their thresholds marked on the plots: case
  1, the next pieces.

## What was done

(Filled in as the work goes.)

### Phase 1, the analyses on the page

Commits 52a15a4 and 1b80aac; the fixes of its review in 45dfad1,
a91407f, 5bed282, 12746b6 and accbd2f. On accbd2f: Vitest "3813 passed",
Playwright "1190 passed" in Chromium and WebKit. popnei's numbers, from
the installed js-v0.2.0 under node: the missing rate of `panel.vcf.gz`
and `panel.nei`, mean 0.02969999999999999 over 1,200 variants, bins 345,
768, 86, 1 and then zeros.

The review sent spec, tests, stale, errors, api and architecture; stale
found nothing. Fixed: the chain steps past a crash or a defect of one
statistic, and stops at popnei's refusal of the file or a file that
could not be read again, which would fail the next pass the same way;
the statistics wait for the count even through `resume`; `resume` says
whether it started anything, and `pending(id)` tells waiting, blocked by
a failure, and stopped apart; the page's groups of analyses are built
from `POPGEN2_ANALYSES` beside the store (`POPGEN2_AUTO_GROUPS`) and a
test reads them; `VariantStatistic` holds the four statistics, the
missing rate's words among them; the specs and section 5 of the
architecture say four histograms, and the limit the filters' piece must
settle includes a key that comes back after a stop.

### Phase 2, the section

Commits 123c111, 7e8efa2 and 6a2ef51; the fixes of its review in c509b93,
12e58aa, 7a444f3, 318dfde, 41954ca and 3d8e526; the fixes of a second
look at them in 25c366f and a71b86b. On a71b86b: Vitest "3845 passed",
Playwright "1208 passed" in Chromium and WebKit (Firefox cannot be
started on this Mac). The page's numbers equal popnei's on panel.vcf.gz,
panel.nei, tetraploid.vcf.gz, ld.vcf.gz and low_qual.vcf.gz.

The review sent all ten categories, and a second look sent react and
accessibility. Fixed: a Stop between the two passes held nothing (the
chain's own state now tells the screen when it changes); the variants
are calculated first, in the order of the page; after a Stop a part
says it is not calculated because what comes before was stopped, not
that it waits; Start again is offered only after a crash; the error bar
words its advice so that it holds while the other pass runs; after one
error of its code the section stayed dead for every later file (its
boundary is now keyed by the load); the status region says the start of
the statistics, the first result and the end, once each, and only once
the section is on the page; the tabs, the downloads and the note of the
table are left out; the individuals' plots start at 0; the table fits
at 320 px; the plots are downloaded only once a file is picked
(popgen2.html 182.3 kB gzipped before any lazy file, 181.7 before this
piece; popgen.html 339.4, 337.7 before); a dynamic import has no script
preloaded, so a later chunk of the 3D view cannot bring back WebKit's
cached 404; the error bar breaks a long address at 320 px.

For the owner: with the individuals' axes from 0, their observed
heterozygosity, all between 0.32 and 0.39 on panel.vcf.gz, falls in a
few wide bars; and the individuals' bins are made in the page from
popnei's values, as on the old page.

### Round 1 with the owner, 6 October 2026

The owner, trying the page: "the table with the results for the
individuals should be downloadable, but we don't need to show it. There
could be too many individuals. In the individuals section we could add a
download button or link. We could adjust the x-axis ranges a bit
better. For instance, the missing genotypes of the nei file has a
maximum below 0.1, but we're showing from 0 to 1. We don't need to show
the means in the plot titles. The open another variants file should be
at the bottom of the page, after the variants and individuals stats
sections."

So: the table of the individuals is not drawn; a download of it (CSV)
in the part of the individuals. The plots' x axes span the range their
data cover, rounded out to round numbers, the missing rates from 0. For
the variants, whose bins are popnei's (40 over 0 to 1), popnei is asked
for fine bins over 0 to 1 and the page sums neighbouring bins into about
40 over the axis's range; the counts stay popnei's, only added up. The
titles carry no mean. The open widget goes to the bottom of the page,
after the statistics; it moves as the plots arrive, and a click aimed at
it as a pass ends must not be lost.

Built in b4f4414, 7af9e13 and a49e5c8: popnei is asked for 1,280 bins
over [0, 1], 40 × 2^5 so that every edge of the old 40 is the same
double, and the page sums them, into the old 40 on popgen.html and into
about 40 over a rounded axis on popgen2.html; keyVersion 4; the
individuals' table is a CSV download; no means in the titles; the open
widget at the bottom, still while the plots arrive, by room kept for
them from the pick. Reviewed in spec, tests, stale and api; the fixes in
c54e408 and aa1de2a: an axis ended one step past its data when its last
edge was one of popnei's doubles above a round number (0.6 → 0.7); the
missing rate's axis from 0 and the summing's guards are tested; the
Python script asks for the 40 bins the page draws; the spec's body
says the fine bins and the rounding. On aa1de2a: Vitest "3870 passed",
Playwright "1214 passed" in Chromium and WebKit.

Asked of the owner: the room kept for the plots leaves about 1,100 px
of empty page above the open button while the statistics run, and a
band of about 80 px above "Variants" when done; the options are to keep
it, to let the button move with the plots, or to put it back above the
statistics.

### Replaced by live-stats, 6 October 2026

The piece `live-stats` (`docs/plans/live-stats.md`) replaced the two
analyses of this piece on `popgen2.html`, and their Stop, by one pass
of popnei's `calcVariantsSummary` with the count, and one Stop in the
file's box. `variantChecks` and `individualChecks` stay on the old page.
