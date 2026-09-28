# The statistics of each individual

Written on 26 September 2026, for stage 3 of `docs/build-order.md`, the
Variants step whole. There is no code of it yet. This spec gives the
first of the three checks of the Variants step: the module
`src/core/analyses/individualChecks.ts`, which says what the proportion
of missing genotypes and the observed heterozygosity of each individual
are calculated from, what it asks of the calculation worker, what it
warns of, and what it keeps in the project file; and, after it, the
short spec of its part of the Variants step. It develops section 3 of
`docs/functionality.md`, "The filters of individuals", and section 4 of
`docs/architecture.md`, "The checks of the Variants step, and the
individuals they keep", with the row `analyses/` of its section 9. It
depends on the approved specs of stage 2, `docs/specs/core/keys.md`,
`store.md`, `project.md` and `docs/specs/worker/protocol.md`, revised for
stage 3 beside this one, on `docs/specs/core/individualsKept.md`, written
with them, and on `docs/specs/charts/histogram.md`, the plot; what it relies on in
them is listed at the end. It also gives the bins of its two histograms,
the module `src/core/histogram.ts`, which the architecture puts in core
(section 7) and `project.md` leaves to this spec.
Revised on 28 September 2026 for the owner's decision that day that the
LD filter of the Variants step starts with no distance: while it has
none, the store locks the statistics with the reason of `variantFilterNeeds` of
`docs/specs/core/project.md`, and the job takes its filters from
`jobFilters`. This changes the code of stage 3, and the plan of stage 4
carries the change. Revised again on 28 September 2026 for the owner's
decision that day that the filters of individuals act first
(`docs/architecture.md`, section 2): the statistics are counted over
every variant of the file, their key holds the load and no filter, their
job carries no filter, one pass per load gives them, and no reason of
the filters locks them, the LD filter with no distance no longer among
them; their key version is 2, and popnei's numbers of `panel.nei` are
those with no filter. Not yet reviewed or approved; it changes the code
of stage 3 too.

The words of the documents used here, as `docs/specs/analyses/diversity.md`
defines them: the **key** of a result, a hash of everything it was
calculated from, under which the store shows it; the **load** of the
variants file, the id of one pick of it with its read options; a
**pass**, one reading of the variants from the start of the file; and the
**check numbers**, a few numbers of a result saved in the project file.
The **filters of the variants** are missing data, observed
heterozygosity, MAF and the LD pruning, in that fixed order; the
**filters of individuals** are a list to keep, a list to remove, and a
threshold on each individual's proportion of missing genotypes and on
its observed heterozygosity (`docs/architecture.md`, section 2).

## The module

### What it does

For each individual of the variants file it gives two numbers, both
popnei's, from one call of `calcPerIndividualStats` of
`js/popnei/src/stats.ts`:

- **the proportion of missing genotypes**, `missingGtRate`: the variants
  at which the individual's genotype is missing, over the variants of
  the pass. A genotype with one allele of two called, `0/.`, is missing.
- **the observed heterozygosity**, `obsHetRate`: the variants at which
  its genotype is called and its alleles are not all the same, over its
  called genotypes. An individual that called none has NaN, and a
  proportion of missing genotypes of 1.

Both are over **every variant and every individual of the file**: the
pass has no filter, as the owner decided on 28 September 2026, when the
filters of individuals came first and the filters of the variants began
to count over the individuals they keep (`docs/architecture.md`, sections
2 and 13, points 3 and 8). So one pass per load gives them, a change of a
filter of the variants leaves them, and the individuals kept are known
whatever those filters. What it costs, which the owner accepted: an
individual's missing genotypes include those at the bad variants the
missing data filter drops, so a threshold on the individuals judges
them over variants the analyses do not read. Until then the pass had the
filters of the variants, so that the numbers were over the variants the
analyses read, and needed a pass again after every change of one.

The result has a second use besides the table and the histograms that the
user reads: **core makes the list of the individuals kept from it**, with
the thresholds of the filters of individuals
(`individualsKept` of `docs/specs/core/individualsKept.md`), and every analysis that reads the
filters of individuals is sent that list. So what goes wrong for a user
if this module is wrong is larger than a table: statistics of another
load or version of popnei shown as current, when the key misses an
input; and every analysis after a threshold run on the wrong
individuals.

### What goes into its key

`filtersRead` is `{ variants: false, individuals: false }`, and
`keyInputs(p)` gives `null`: nothing of the project beyond the load,
which `keyOf` of `docs/specs/core/keys.md` puts in itself. Not the
filters of the variants, which the pass does not have; not the
individuals file, which the numbers do not read; not the filters of
individuals, whose thresholds the user moves while reading this result,
and which would otherwise take it off the screen at every move
(`docs/architecture.md`, section 3).

| change to the project | the key |
|---|---|
| a new load of the variants file, the same file included; the ploidy or `onlyPassed` of a VCF | changes |
| a filter of the variants added or removed, or its threshold | same |
| a filter of individuals, a list or a threshold | same |
| the individuals file, the column of the populations | same |
| the key version, the version of popnei | changes |

The key version is 2, raised on 28 September 2026 to mark that the
result is now over every variant of the file: the key of version 1 held
the filters of the variants, and a result under it was counted over the
variants they kept. The key and the fingerprint of the settings, which
no longer hold the filters of the variants, would tell the two apart in
any case, but for a project with no filter of the variants, whose result
is the same in both.

### Why it cannot run

`needs(p)` gives `null`. The store locks it with the reasons of
`projectNeeds` of `docs/specs/core/project.md` alone, no variants file,
the file being read, the file refused. It reads no filter, so neither
the LD filter with no distance, `variantFilterNeeds` of the same spec,
nor a list of individuals that popnei would refuse,
`individualListNeeds`, locks it: the user can read the statistics while
typing the distance or correcting a list. It needs no individuals file, so it runs
in the association application before a file of traits is loaded, and in
the population genetics application before the metadata file.

### The request

`run(p, c)` sends, through the client the store bound to its key:

```ts
{ analysis: "individualChecks", fileId: p.variants.fileId, filters: [] }
```

The runner puts no step on the open `Variants` and calls
`calcPerIndividualStats(variants)`, which makes one pass,
`numPassesOf("calcPerIndividualStats")` 1 of `js/popnei/src/passes.ts`.
The individuals popnei gives are those of the source in its order, since
the job puts no `filterIndividuals`; the runner passes them on, so that
the result has the three fields of popnei's `PerIndividualStats` that
`individualsKept` takes, `IndividualStats` of `individualsKept.md`, and core
checks them against the individuals of the load there.

```ts
{
  analysis: "individualChecks",
  individuals: readonly string[], // every individual of the variants file, in its order
  missingGtRate: Float64Array,   // one per individual, in the order of the variants file
  obsHetRate: Float64Array,      // NaN for an individual with no called genotype
  passStats: PassStats,          // popnei's counts of the pass (protocol.md)
}
```

popnei refuses the call as its `@throws` lists: when the file holds no
variant, or, for a VCF read with only the passed variants, none that
passed, and when a line of a VCF cannot be read, all at the pass. The
pass has no filter, so no filter can leave it empty. The panel says each in the user's
words (its error state, below).

### The warnings

`warnings(r, p)` gives one, from the result and the name of the variants
file:

| code | when | the text |
|---|---|---|
| `individualsWithoutCalls` | an individual has NaN in `obsHetRate` | "3 individuals of panel.nei have no called genotype among the 1,200 variants of the file, so they have no observed heterozygosity: s001, s002 and s003. The filter of the individuals by observed heterozygosity removes them when it is on." With one: "s001 has no called genotype among the 1,200 variants of panel.nei, so it has no observed heterozygosity. …"; with a file of one variant, "the one variant of panel.nei" |

The individuals are listed as `project.md` lists them, three or fewer by
name, more as the first two and how many more. The last sentence is the
owner's decision of 26 September 2026 that such an individual is removed
by the filter by heterozygosity (`docs/architecture.md`, section 13,
point 4).

### The check numbers

`checkNumbers(r)` gives three: `passStats.numVars`, the variants of the
file; the mean proportion of missing genotypes over every
individual; and the mean observed heterozygosity over the individuals
that have one, `null` when none has. Each mean is the sum, in the order
of the file, over the count, which gives the same number in every
browser (`docs/specs/core/store.md`, "The definition of an analysis").
Two numbers per individual would put 20,000 numbers into the project file
at 10,000 individuals, for a check that the means make as well.
`numCheckNumbers(p)` gives 3.

### Its lines of the Python script

`script(p)` gives, after the lines of `src/core/script.ts` of stage 6,
which open the variants into `variants` and, whenever the project has a
filter of individuals or this analysis ran, calculate
`individual_stats` before any filter, and then put on it the filter of
individuals and the filters of the variants, in that order:

```python
# The statistics of each individual, over every variant of the file
print(pandas.DataFrame({
    "missing_genotypes": individual_stats.missing_gt_rate,
    "observed_heterozygosity": individual_stats.obs_het_rate,
}).to_string())
```

`individual_stats` is `popnei.calc_per_individual_stats(variants)`, whose
two fields are `pandas.Series` indexed by the individuals
(`python/popnei/stats.py` of popnei). It is made by `script.ts` and not
here, since the list of the individuals kept is made from it before
`variants.filter_individuals`, the first step put on `variants`, and a
`Variants` takes no filter off.

### The TypeScript interface

The request and the result are members of `Job` and `JobResult` of
`src/worker/protocol.ts`:

```ts
export interface IndividualChecksJob {
  readonly analysis: "individualChecks";
  readonly fileId: string;
  readonly filters: readonly [];   // no filter: the statistics are over every variant
}

export interface IndividualChecksResult {
  readonly analysis: "individualChecks";
  readonly individuals: readonly string[];
  readonly missingGtRate: Float64Array;
  readonly obsHetRate: Float64Array;
  readonly passStats: PassStats;
}
```

The module exports its definition, which `src/core/apps.ts` lists for
both applications, and what the panel and core read:

```ts
export const individualChecks: AnalysisDef<Job, JobResult>;
// id "individualChecks"; app ["popgen", "gwas"]; keyVersion 2;
// filtersRead { variants: false, individuals: false }; defaults {}

/** One row of the table: the individual, and its two numbers, null for NaN. */
export interface IndividualRow {
  readonly individual: string;
  readonly missingGenotypes: number;
  readonly observedHeterozygosity: number | null;
}
/** The rows of a result, in the order of the variants file; the same
    array for the same result. */
export function individualRows(r: IndividualChecksResult): readonly IndividualRow[];

/** The table as the text of a CSV file (the panel, "What it shows"). */
export function individualChecksCsv(r: IndividualChecksResult): string;

/** The words of a refusal of popnei, for the error state of the panel. */
export function refusalText(message: string, p: Project): string;
```

`parseOptions(o, v)` gives back `{}` for `{}` and refuses anything else,
"no option"; the project holds no options for it. `individualRows`
keeps its rows by the result in a `WeakMap`, as `diversityRows` does.

### The bins of its histograms, `src/core/histogram.ts`

popnei bins the statistics of the variants and not those of the
individuals, which come as one value each, so core bins them, a pure
function of plain arithmetic over a few thousand numbers
(`docs/architecture.md`, section 7). The bins are those of
`numpy.histogram` with a number of bins, so that the Python script,
`numpy.histogram(individual_stats.missing_gt_rate.dropna(), bins=20)`,
gives the same counts:

- **Over the range of the values**, from the smallest to the largest,
  NaN left out, and not over 0 to 1: the proportions of missing genotypes
  of `panel.nei` lie from 0.0175 to 0.0442, which 40 bins over 0 to 1 would
  put into two bins. When every value is the same, the range is that
  value minus 0.5 to it plus 0.5, as numpy has it.
- **20 bins**, `INDIVIDUAL_BINS`, decided here, for a few hundred to
  10,000 individuals; a constant of the code that the running
  application can change.
- **The edges** are `i × ((max − min) / 20) + min` for i from 0 to 19, and
  `max` itself last, as numpy's `linspace` computes them, so that every
  edge is the same double in both.
- **A value falls in the bin whose left edge is at most it and whose right
  edge is above it**, the last bin taking its right edge too, as popnei
  and numpy count.
- **A NaN**, an individual with no heterozygosity, is in no bin and
  counted apart, for the line under the histogram.

```ts
export const INDIVIDUAL_BINS = 20;

export interface Bins {
  readonly edges: Float64Array;   // numBins + 1, increasing
  readonly counts: Uint32Array;   // numBins
  readonly numNaN: number;        // the values in no bin
}

/** The bins of `values`, or null when every value is NaN or there is none. */
export function binValues(values: Float64Array, numBins: number): Bins | null;
```

`numBins` below 1 or not whole is a defect. The panel gives the edges
and the counts to the histogram of `docs/specs/charts/histogram.md`,
which takes them as it takes popnei's. Checked with Vitest: on the
statistics of `panel.nei` over every variant, below, the edges and
counts of `binValues`, which
`numpy.histogram(values, bins=20)` of numpy 2 in popnei's environment
gave on the same values on 28 September 2026, the same edges to the
last digit: for the proportion of missing genotypes `4, 0, 7, 5, 12, 10,
20, 19, 27, 12, 24, 15, 13, 10, 12, 1, 5, 1, 2, 1`, with the edges
0.0175, 0.018833333333333334, …, 0.04416666666666667; for the
heterozygosity `4, 5, 4, 8, 10, 10, 16, 16, 23, 21, 20, 14, 17, 11, 5, 7,
3, 3, 1, 2`, from 0.32112436115843274 to 0.3931034482758621. The counts
over the variants the missing data filter at 0.05 kept, which stage 3
tested, were other. Also:
`[0.5, 0.5]` gives edges from 0 to 1; `[0.5, NaN]` gives `numNaN` 1; a
value on an inner edge falls in the bin to its right, and the largest in
the last bin.

### The cases

- **The file holds no variant**, or none passed for a VCF read with only
  those. popnei refuses; the store keeps the refusal under the key, so no
  list of individuals kept can be made for this load, and an analysis
  that reads a threshold on the individuals, whose Run starts this
  calculation first, ends with the same failure (`docs/architecture.md`,
  section 5). The filters of the variants keeping no variant do not
  touch it: the pass has none.
- **A filter of the variants changed.** The key is the same, so the
  table, the histograms and the individuals kept stay, with no pass;
  what the filters of the variants keep now depends on the individuals
  kept, and not the other way (`docs/architecture.md`, section 2).
- **A threshold of the filters of individuals moved.** The key is the
  same, so the table and the histograms stay, and only which rows are
  marked kept changes, from core, with no pass.
- **An undo to an earlier load** finds its result in the cache, and the
  list of individuals kept with it. The cache does not drop the result
  while the current project gives its key (`docs/specs/core/cache.md`);
  it can drop one of an earlier load.
- **A result that arrives after a new load** goes into the cache under
  the key it was asked for, and is used, for the table and for the list,
  when an undo gives that key back. A change of the filters while it
  runs does not leave it behind, since its key is the same.

### How it runs

One pass over the file in the calculation worker. The result is two
numbers of 8 bytes per individual and its name, which the cache counts
at 2 bytes per character (`docs/specs/core/cache.md`), so 32 bytes for a
name of eight characters, 320 KB at 10,000 such individuals; it is in
the cache of the page, so a restart of the worker does not lose it.

### How it is verified

With Vitest, at the functions of the definition, on frozen projects:

- **A worked example**, the VCF of three individuals and four variants
  below, whose `i3` calls nothing and whose `i2` has `./.` at the third
  variant and `0/.` at the fourth. popnei gave, in node on 26 September
  2026 with `js-v0.1.0-dev.2`, `missingGtRate` `[0, 0.5, 1]` and
  `obsHetRate` `[0.5, 0.5, NaN]`, `passStats.numVars` 4. As literals:
  `individualRows` gives `i3` with `observedHeterozygosity` `null`;
  `warnings` gives `individualsWithoutCalls` naming i3, "i3 has no called
  genotype among the 4 variants of ‹the file›, …"; `checkNumbers`
  gives `[4, 0.5, 0.5]`.

  ```
  #CHROM POS ID REF ALT QUAL FILTER INFO FORMAT i1  i2  i3
  1      10  .  A   G   .    PASS   .    GT     0/1 0/0 ./.
  1      20  .  A   G   .    PASS   .    GT     1/1 0/1 ./.
  1      30  .  A   G   .    PASS   .    GT     0/0 ./. ./.
  1      40  .  A   G   .    PASS   .    GT     0/1 0/. ./.
  ```

- **The key**: for each row of its table, two projects that differ in it,
  and `keyOf` equal or not as the row says.
- **`run`**, with a fake client that records its job: the job above,
  with no filter whatever filters the project has, and the client's
  `individuals` not read.
- **`individualChecksCsv`** of the worked example gives, as a literal,
  the header and three rows, with an empty cell for i3's heterozygosity.
- **`refusalText`** of each row of "Its words", below, with popnei's
  messages as literals; an empty pass has the words of any other
  refusal, as for the histograms of the variants
  (`docs/specs/analyses/variantChecks.md`), since the pass has no filter.
- **The description** of the histogram of the proportion of missing
  genotypes at 0.03, above, asserted whole from the counts of
  `binValues` below; the bin from 0.029500000000000002 to
  0.030833333333333334 is the one split.

The numbers of the Playwright flow and of the runner's test in node, on
`e2e/fixtures/panel.nei`, 1,200 variants of 200 diploid individuals, got
in node on 28 September 2026 with `js-v0.1.0-dev.3` by `openVars(bytes)`
and `calcPerIndividualStats(variants)`, with no filter, by
`orderA.mjs` of `docs/specs/worker/runner.md`, "How it is verified";
`js-v0.1.0-dev.2` gives the same: `passStats.numVars` 1,200 and
`filtering` empty; `s000` 0.028333333333333332 and 0.3653516295025729;
the proportions of missing genotypes from 0.0175 to 0.04416666666666667,
the heterozygosities from 0.32112436115843274 to 0.3931034482758621, no
NaN; the check numbers `[1200, 0.0297, 0.3542891741075382]`. The flow
shows s000 to four decimals, 0.0283 and 0.3654, the same whatever the
filters of the variants, and the same after an undo, with no
calculation.

The flow of the Variants step, with Playwright in Chromium, Firefox and
WebKit (`docs/specs/steps/variants.md`, "How it is checked"), also goes
through what only a browser shows here: the table sorted with the
keyboard alone, the Tab key into the table, the arrow keys to the header
Proportion of missing genotypes and Enter twice, which puts `s082` first,
0.0442, the largest of `panel.nei`;
the CSV downloaded, `panel.individual_stats.csv`, its header and 200
rows, `s000` with 0.028333333333333332 and 0.3653516295025729; and the
CSV of the bins of each of the two histograms.

## The panel

Its part of the Variants step, which places it among the filters
(`docs/specs/steps/variants.md`, written after this spec). Its heading is
"Statistics of each individual", the title by which the shell names it
in the notice and the status region.

### What it shows

A button, "Calculate the statistics of each individual", and, once they
are calculated:

- **A table**, one row per individual in the order of the variants file,
  with the columns Individual, Proportion of missing genotypes, Observed
  heterozygosity, from `individualRows`, and Kept, which says in words,
  "kept" or "removed", whether the filters of individuals keep the
  individual, from the list of `individualsKept` that the store gives;
  the column is left out while no filter of individuals is set. It is
  left out too while `individualsKept` is `null`, when a list of
  individuals names one twice or one not in the file, which popnei would
  refuse, and a line above the table says why: "Which individuals are
  kept is shown once the lists of individuals to keep and to remove are corrected." Which
  filter removed an individual is read in its numbers beside it, and how
  many each filter removed beside the filter
  (`docs/specs/steps/variants.md`). The numbers to four decimals, NaN as "no value",
  as the diversity has them. A caption says what it is over: "The
  statistics of the 200 individuals of panel.nei, over its 1,200
  variants, before any filter of the variants." The table is sorted by any column, since finding the
  worst individuals is what it is for; React Aria's `Table`, which the
  diversity left for the sortable tables of later stages. An individual
  with "no value" sorts after every number, in both directions, so that
  a sort by heterozygosity, from the highest, starts with the highest
  that were counted; Kept sorts "kept" before "removed", and "removed"
  first the other way; a sort by Kept goes with the column when it is
  left out, the rows back in the order of the variants file, and the
  column is not sorted when it comes back, since a filter turned on
  again is not a request to sort. Rows equal in the column sorted keep the order
  of the variants file, and Individual sorts the names as the browser
  orders text in English. The table is named "Statistics of each
  individual", the heading of its block, since its caption stands in
  the block above the histograms (`docs/specs/steps/variants.md`), and
  it scrolls in a box of its own with its header in view, so that
  10,000 rows do not make the step 10,000 lines long; the box is as high
  as its rows, and at most 28rem or 70% of the height of the window,
  beyond which it scrolls, so that a table of a few rows stands in no
  empty box. Written with the code on 27
  September 2026.
- **Two histograms**, of the proportion of missing genotypes and of the
  observed heterozygosity, drawn by the histogram of
  `docs/specs/charts/histogram.md` from the bins of `binValues`, above,
  each with the threshold of its filter
  of individuals marked on it when that filter is on. Under the second,
  when some individual has no heterozygosity: "3 individuals with no
  called genotype are not in the histogram.", or "1 individual with no
  called genotype is not in the histogram."; when none has one,
  `binValues` gives no bins, and that line stands alone in place of the
  histogram. Their titles, which name each histogram, its tabs and its
  button for a screen reader, are "Proportion of missing genotypes of
  each individual" and "Observed heterozygosity of each individual",
  so that neither has the name of the histogram of the observed
  heterozygosity of the variants on the same step; their axes are
  "Proportion of missing genotypes" or "Observed heterozygosity", and
  "Individuals", and the tables of their bins "The bins of the
  proportion of missing genotypes of each individual" and "The bins of
  the observed heterozygosity of each individual", written with the
  code on 27 September 2026. Each has the table of its
  bins beside it, from `histogramRows`, a description in the form of the
  histogram's spec, "The proportion of missing genotypes of 200
  individuals, in 20 bins from 0.0175 to 0.0442. The threshold 0.03
  keeps the 9 bins up to it, 104 individuals, splits the bin from
  0.0295 to 0.0308, 12 individuals, and removes the 10 bins above it, 84
  individuals.", and the download of the table of its bins as CSV,
  `panel.individual_missing_rate_bins.csv` and
  `panel.individual_obs_het_bins.csv` (`docs/specs/steps/variants.md`).
  The histograms themselves are not offered as SVG or PNG in stage 3, as
  the owner decided on 26 September 2026 (point C of
  `docs/specs/stage-3-open-points.md`): the export is built and tested
  with the base of the 2D plots (`docs/specs/charts/plot2d.md`), and
  offered by buttons in stage 6, under the names
  `panel.individual_missing_rate.svg` and `panel.individual_obs_het.svg`,
  or `.png`.
- **A download**, "Download the table as CSV", which saves
  `panel.individual_stats.csv`, the stem of the variants file
  (`variantsStem` of `src/core/fileNames.ts`) and `.individual_stats.csv`,
  with the text of `individualChecksCsv`, as the diversity's CSV is
  written: the header `individual,missing_genotypes,observed_heterozygosity`
  and a row per individual. The column Kept is not in it: it is of the
  thresholds, not of the result.
- The line of the versions beside the button, as the diversity's.

### The states

| state | what the user sees | what they can do |
|---|---|---|
| empty | cannot happen: until the variants file is read the analysis is locked | |
| locked | not drawn: while the store locks it, the variants file is not read, and the Variants step shows in place of its part the line "The histograms, the counts and the statistics of each individual are calculated once a variants file is read." (`docs/specs/steps/variants.md`, "What it does"). With the file read, it is never locked: it reads no filter, so neither the LD filter with no distance nor a list of individuals popnei would refuse locks it | load a file |
| ready | the button | Calculate |
| running | the bar and the clock of the diversity, "Calculating · 35% · 0:12"; after a stop, "Waiting for panel.nei to be opened again, then calculating · 0:12" | Stop |
| done | the table, the histograms and the download; the warning above them | sort, download |
| results removed | the words of the change, below | Calculate; the Undo or Redo of the notice |
| error | the words of the failure, below | as in the diversity |

It is also `running` when an analysis that reads a threshold on the
individuals started it, and a Stop of that analysis stops it
(`docs/architecture.md`, section 5).

### Its words

The results removed, by the cause of the notice, as the diversity's,
with the histograms named beside the table, since both go; only a new
load, or the ploidy or the passed variants of a VCF read again, removes
them now: "The statistics of each individual were removed because a new
variants file was loaded. Undo brings back the table and the histograms
as they were, without calculating again; Calculate makes new ones for
the new settings.", and after an undo or a redo "Undone: a new variants
file was loaded. The statistics of each individual were removed; Redo
brings back the table and the histograms as they were, without
calculating again, and Calculate makes new ones for the settings as they
are now." Its `resultName` is "the table".

The error state has the words of the diversity's table, "Its words", with
"the diversity" replaced by "the statistics of each individual", "Run it
again" and "to run it again" by "Calculate them again" and "to calculate
them again", since this part has a Calculate button and no Run. The row
of the filters that keep no variant, "The filters kept none of the
variants of panel.nei, so there is no variant to count each
individual's genotypes over. …", which stage 3 had, goes, since the pass
has no filter. The words name the step although the part is in it,
since the diversity's panel, on the Analyses step, shows these words
when the statistics it waited for fail
(`docs/specs/analyses/diversity.md`, "Its words"); `refusalText` of
this module makes them for both.

The help, for the drawer of stage 8: what each number is, over which
variants and why, every variant of the file, so that an individual's
missing genotypes include those at the variants the missing data filter
drops; that a high heterozygosity flags a mixed or
contaminated sample, and in a selfing species is a finding in itself
(`docs/functionality.md`, section 3); that the heterozygosity is over the
called genotypes, the number plink2's `--het` gives, as popnei's doc
comment of `calcPerIndividualStats` says; and
`popnei.calc_per_individual_stats(variants)` in Python.

### Accessibility

The table has a header cell for each column and the individual as the
header of its row, as the diversity's. Kept is a word in its cell, never
a colour alone (WCAG 2.2, 1.4.1). The histograms carry the text
alternative of the histogram plot (`docs/specs/charts/histogram.md`).
The end of a run is announced by the shell's status region.

### Left for the running application

Where the panel sits among the filters, the size of the histograms,
whether the table draws only its rows on the screen, which the
measurement of `docs/architecture.md`, section 11, decides at 10,000
individuals.

## What this spec relies on in the specs written beside it

- `docs/specs/worker/protocol.md`: `PassStats`, popnei's counts of the
  pass, `{ numVars, filtering }`, on every result; the members above in
  `Job` and `JobResult`.
- `docs/specs/worker/runner.md` and `messages.md`: the runner answers the
  job as "The request" says, checks that popnei's individuals are the
  source's, and answers every array checked with `instanceof`.
- `docs/specs/core/individualsKept.md`: the list from this
  result, taken as `IndividualStats`, and the thresholds.
- `docs/specs/charts/histogram.md`: a histogram of the edges and counts
  of `binValues`, with a threshold marked, one outside the edges
  included.
- `docs/specs/core/store.md`: the start of this calculation by the Run of
  another analysis, and its stop with that analysis.
- `src/core/script.ts`, stage 6: `individual_stats`, made before any
  filter, and the filter of individuals put first.
- `docs/specs/steps/variants.md`: where the panel goes.

## Open points

None.

## Not in this spec

- The filters of individuals, their fields, and the counts beside them:
  `docs/specs/steps/variants.md` and `individualsKept` of
  `docs/specs/core/individualsKept.md`.
- The plot: `docs/specs/charts/histogram.md`.
