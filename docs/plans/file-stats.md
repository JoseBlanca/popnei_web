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
them; the report tells the owner, and popnei can be asked for them. The
downloads the old page's components draw stay.

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
