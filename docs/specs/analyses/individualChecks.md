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

Both are over **the variants the filters of the variants keep, and every
individual of the file**: the pass has the filters of the variants and no
filter of individuals, as the owner decided on 26 September 2026
(`docs/architecture.md`, section 13, point 8). So an individual's missing
genotypes are counted among the variants the analyses read, and not
raised by the bad variants the missing data filter drops. And since the
filters of the variants count over every individual of the file, which
individuals are removed changes no variant kept (`docs/architecture.md`,
section 2), so each number stays true of the individual after the others
are removed.

The result has a second use besides the table and the histograms that the
user reads: **core makes the list of the individuals kept from it**, with
the thresholds of the filters of individuals
(`individualsKept` of `docs/specs/core/individualsKept.md`), and every analysis that reads the
filters of individuals is sent that list. So what goes wrong for a user
if this module is wrong is larger than a table: statistics of other
filters shown as current, when the key misses an input; and every
analysis after a threshold run on the wrong individuals.

### What goes into its key

`filtersRead` is `{ variants: true, individuals: false }`, and
`keyInputs(p)` gives `null`: nothing of the project beyond the load and
the filters of the variants, which `keyOf` of `docs/specs/core/keys.md`
puts in itself. Not the individuals file, which the numbers do not read;
not the filters of individuals, whose thresholds the user moves while
reading this result, and which would otherwise take it off the screen at
every move (`docs/architecture.md`, section 3).

| change to the project | the key |
|---|---|
| a new load of the variants file, the same file included; the ploidy or `onlyPassed` of a VCF | changes |
| a filter of the variants added or removed, or its threshold | changes |
| a filter of individuals, a list or a threshold | same |
| the individuals file, the column of the populations | same |
| the key version, the version of popnei | changes |

The key version is 1.

### Why it cannot run

`needs(p)` gives `null`: the reasons of `projectNeeds` of
`docs/specs/core/project.md`, no variants file, the file being read, the
file refused, are the only ones. A list of individuals that popnei would
refuse, `individualListNeeds` of the same spec, does not lock it, since
it reads no filter of individuals. It needs no individuals file, so it runs
in the association application before a file of traits is loaded, and in
the population genetics application before the metadata file.

### The request

`run(p, c)` sends, through the client the store bound to its key:

```ts
{ analysis: "individualChecks", fileId: p.variants.fileId, filters: p.filters }
```

The runner puts the filters on the open `Variants` in their order and
calls `calcPerIndividualStats(variants)`, which makes one pass,
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

popnei refuses the call as its `@throws` lists: when the filters keep no
variant, "the pass gave no variant: its source gave 1200 and the steps
kept none of them, …", when the file holds none, and when a line of a
VCF cannot be read, all at the pass. The panel says each in the user's
words (its error state, below).

### The warnings

`warnings(r, p)` gives one, from the result and the name of the variants
file:

| code | when | the text |
|---|---|---|
| `individualsWithoutCalls` | an individual has NaN in `obsHetRate` | "3 individuals of panel.nei have no called genotype among the 1,152 variants the filters kept, so they have no observed heterozygosity: s001, s002 and s003. The filter by observed heterozygosity removes them when it is on." With one: "s001 has no called genotype among the 1,152 variants the filters kept, so it has no observed heterozygosity. …" |

The individuals are listed as `project.md` lists them, three or fewer by
name, more as the first two and how many more. The last sentence is the
owner's decision of 26 September 2026 that such an individual is removed
by the filter by heterozygosity (`docs/architecture.md`, section 13,
point 4).

### The check numbers

`checkNumbers(r)` gives three: `passStats.numVars`, the variants the
filters kept; the mean proportion of missing genotypes over every
individual; and the mean observed heterozygosity over the individuals
that have one, `null` when none has. Each mean is the sum, in the order
of the file, over the count, which gives the same number in every
browser (`docs/specs/core/store.md`, "The definition of an analysis").
Two numbers per individual would put 20,000 numbers into the project file
at 10,000 individuals, for a check that the means make as well.
`numCheckNumbers(p)` gives 3.

### Its lines of the Python script

`script(p)` gives, after the lines of `src/core/script.ts` of stage 6,
which open the variants into `variants`, put the filters of the variants
on it and, whenever the project has a filter of individuals or this
analysis ran, calculate `individual_stats` before any filter of
individuals:

```python
# The statistics of each individual, over the variants the filters kept
print(pandas.DataFrame({
    "missing_genotypes": individual_stats.missing_gt_rate,
    "observed_heterozygosity": individual_stats.obs_het_rate,
}).to_string())
```

`individual_stats` is `popnei.calc_per_individual_stats(variants)`, whose
two fields are `pandas.Series` indexed by the individuals
(`python/popnei/stats.py` of popnei). It is made by `script.ts` and not
here, since the list of the individuals kept is made from it before
`variants.filter_individuals`, and a `Variants` takes no filter off.

### The TypeScript interface

The request and the result are members of `Job` and `JobResult` of
`src/worker/protocol.ts`:

```ts
export interface IndividualChecksJob {
  readonly analysis: "individualChecks";
  readonly fileId: string;
  readonly filters: readonly VariantFilter[];
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
// id "individualChecks"; app ["popgen", "gwas"]; keyVersion 1;
// filtersRead { variants: true, individuals: false }; defaults {}

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
  of `panel.nei` lie from 0.016 to 0.043, which 40 bins over 0 to 1 would
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
statistics of `panel.nei` with the missing data filter at 0.05, below,
`binValues` gave the counts that `numpy.histogram(values, bins=20)` of
numpy gave on the same values, the same edges to the last digit, on 26
September 2026: for the proportion of missing genotypes `3, 4, 2, 7, 8,
20, 17, 27, 17, 20, 23, 12, 15, 6, 12, 1, 1, 3, 0, 2`, with the edges
0.016493055555555556, 0.017838541666666666, …, 0.043402777777777776; for
the heterozygosity `3, 3, 3, 10, 8, 13, 18, 18, 22, 19, 22, 18, 16, 8, 8,
3, 2, 4, 0, 2`, from 0.3176991150442478 to 0.39730941704035877. Also:
`[0.5, 0.5]` gives edges from 0 to 1; `[0.5, NaN]` gives `numNaN` 1; a
value on an inner edge falls in the bin to its right, and the largest in
the last bin.

### The cases

- **The filters of the variants keep no variant.** popnei refuses; the
  store keeps the refusal under the key, so no list of individuals kept
  can be made for these filters, and an analysis that reads a threshold
  on the individuals, whose Run starts this calculation first, ends with
  the same failure (`docs/architecture.md`, section 5).
- **A filter of the variants changed.** The key changes: the result goes
  off the screen, with the notice of the change, and the thresholds of
  the filters of individuals keep their values. Until a new pass, the
  individuals kept are not known, and the step says so beside those
  filters (`docs/specs/steps/variants.md`).
- **A threshold of the filters of individuals moved.** The key is the
  same, so the table and the histograms stay, and only which rows are
  marked kept changes, from core, with no pass.
- **An undo to filters of the variants already calculated** finds the
  result in the cache, and the list of individuals kept with it. The
  cache does not drop the result while the current project gives its key
  (`docs/specs/core/cache.md`); it can drop one of earlier filters.
- **A result that arrives after the filters changed** goes into the cache
  under the key it was asked for, and is used, for the table and for the
  list, when an undo gives that key back.

### How it runs

One pass over the file in the calculation worker. The result is 16 bytes
per individual, 160 KB at 10,000 individuals, in the cache of the page,
so a restart of the worker does not lose it.

### How it is verified

With Vitest, at the functions of the definition, on frozen projects:

- **A worked example**, the VCF of three individuals and four variants
  below, whose `i3` calls nothing and whose `i2` has `./.` at the third
  variant and `0/.` at the fourth. popnei gave, in node on 26 September
  2026 with `js-v0.1.0-dev.2`, `missingGtRate` `[0, 0.5, 1]` and
  `obsHetRate` `[0.5, 0.5, NaN]`, `passStats.numVars` 4. As literals:
  `individualRows` gives `i3` with `observedHeterozygosity` `null`;
  `warnings` gives `individualsWithoutCalls` naming i3, "i3 has no called
  genotype among the 4 variants the filters kept, …"; `checkNumbers`
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
- **`run`**, with a fake client that records its job: the job above, the
  filters of the project in their order.
- **`individualChecksCsv`** of the worked example gives, as a literal,
  the header and three rows, with an empty cell for i3's heterozygosity.
- **`refusalText`** of each row of "Its words", below, with popnei's
  messages as literals.

The numbers of the Playwright flow and of the runner's test in node, on
`e2e/fixtures/panel.nei`, 1,200 variants of 200 diploid individuals, got
in node on 26 September 2026 with `js-v0.1.0-dev.2` by
`openVars(bytes)`, `filterByMissingData(0.05)` and
`calcPerIndividualStats(variants)`: `passStats.numVars` 1,152; `s000`
0.026041666666666668 and 0.3672014260249554; the proportions of missing
genotypes from 0.016493055555555556 to 0.043402777777777776, the
heterozygosities from 0.3176991150442478 to 0.39730941704035877, no NaN;
the check numbers `[1152, 0.028472222222222204, 0.3541326613885106]`.
With no filter, `s000` is 0.028333333333333332 and 0.3653516295025729,
over 1,200 variants. The flow shows s000 to four decimals, 0.0260 and
0.3672, and the same after an undo, with no calculation.

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
  the column is left out while no filter of individuals is set. Which
  filter removed an individual is read in its numbers beside it, and how
  many each filter removed beside the filter
  (`docs/specs/steps/variants.md`). The numbers to four decimals, NaN as "no value",
  as the diversity has them. A caption says what it is over: "The
  statistics of the 200 individuals of panel.nei, over the 1,152 variants
  the filters kept." The table is sorted by any column, since finding the
  worst individuals is what it is for; React Aria's `Table`, which the
  diversity left for the sortable tables of later stages.
- **Two histograms**, of the proportion of missing genotypes and of the
  observed heterozygosity, drawn by the histogram of
  `docs/specs/charts/histogram.md` from the bins of `binValues`, above,
  each with the threshold of its filter
  of individuals marked on it when that filter is on. Under the second,
  when some individual has no heterozygosity: "3 individuals with no
  called genotype are not in the histogram." Each has the table of its
  bins beside it, from `histogramRows`, a description in the form of the
  histogram's spec, "The proportion of missing genotypes of 200
  individuals, in 20 bins from 0.0165 to 0.0434. The threshold 0.03 keeps
  bins up to 0.03 and removes 9 bins above it.", and the two buttons of
  its export, "Download as SVG" and "Download as PNG", which save
  `panel.individual_missing_rate.svg` and `panel.individual_obs_het.png`
  and their pairs, with the line of the versions (point C of
  `docs/specs/stage-3-open-points.md`, the buttons there meanwhile).
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
| locked | not drawn: while the store locks it, the variants file is not read, and the Variants step shows in place of its part the line "The histograms, the counts and the statistics of each individual are calculated once a variants file is read." (`docs/specs/steps/variants.md`, "What it does"). With the file read, `projectNeeds` gives no reason and a list of individuals popnei would refuse does not lock it, since it reads no filter of individuals, so the part is never drawn locked | load a file |
| ready | the button | Calculate |
| running | the bar and the clock of the diversity, "Calculating · 35% · 0:12"; after a stop, "Waiting for panel.nei to be opened again, then calculating · 0:12" | Stop |
| done | the table, the histograms and the download; the warning above them | sort, download |
| results removed | the words of the change, below | Calculate; the Undo or Redo of the notice |
| error | the words of the failure, below | as in the diversity |

It is also `running` when an analysis that reads a threshold on the
individuals started it, and a Stop of that analysis stops it
(`docs/architecture.md`, section 5).

### Its words

The results removed, by the cause of the notice, as the diversity's: "The
statistics of each individual were removed because the MAF filter
changed. Undo brings back the table as it was, with no calculation;
Calculate makes a new one for the new settings.", and after an undo or
a redo "Undone: the MAF filter changed. The statistics of each individual
were removed; Redo brings back …". Its `resultName` is "the table".

The error state has the words of the diversity's table, "Its words", with
"the diversity" replaced by "the statistics of each individual", and one
row more precise: the filters keep no variant, "The filters kept none of
the variants of panel.nei, so there is no variant to count each
individual's genotypes over. Loosen the filters of the variants in this
step."

The help, for the drawer of stage 8: what each number is, over which
variants and why; that a high heterozygosity flags a mixed or
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
- `src/core/script.ts`, stage 6: `individual_stats`, made before the filter
  of individuals.
- `docs/specs/steps/variants.md`: where the panel goes.

## Open points

None.

## Not in this spec

- The filters of individuals, their fields, and the counts beside them:
  `docs/specs/steps/variants.md` and `individualsKept` of
  `docs/specs/core/individualsKept.md`.
- The plot: `docs/specs/charts/histogram.md`.
