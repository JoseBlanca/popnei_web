# The histograms of the variants

Written on 26 September 2026, for stage 3 of `docs/build-order.md`, the
Variants step whole. There is no code of it yet. This spec gives the
second check of the Variants step: the module
`src/core/analyses/variantChecks.ts`, the histograms of the major allele
frequency, the observed heterozygosity and the expected heterozygosity
of the variants, which the user reads to choose the thresholds of the
filters of the variants; and, after it, the short spec of its part of the
step. It develops section 3 of `docs/functionality.md` and section 4 of
`docs/architecture.md`, "The checks of the Variants step, and the
individuals they keep". It depends on the specs of stage 2 revised for
stage 3, `docs/specs/core/keys.md`, `store.md`, `project.md` and
`docs/specs/worker/protocol.md`, and on `docs/specs/charts/histogram.md`,
written beside it. The words key, load, pass, check numbers and the
filters are those of `docs/specs/analyses/individualChecks.md`. Revised
on 28 September 2026 for the owner's decision that day that the filters
of individuals act first, and the filters of the variants count over the
individuals kept (`docs/architecture.md`, section 2): the histograms are
over the individuals kept, their key holds the filters of individuals,
their job carries the list, a Run with a threshold on the individuals
waits for the statistics of each individual, and a list popnei would
refuse, or one that keeps nobody, locks them; their key version is 2.
This revision is approved by the owner on 28 September 2026; it changes the code of stage 3.

## The module

### What it does

It gives, over **every variant of the file and the individuals the
filters of individuals keep**, before any filter of the variants, three
histograms of 40 bins over 0 to 1, each with its mean:

- **the major allele frequency (MAF)**, the frequency of the commonest
  allele among the called alleles, which the MAF filter keeps a variant
  by;
- **the observed heterozygosity**, the heterozygous genotypes over the
  called ones, which the filter by heterozygosity keeps a variant by;
- **the expected heterozygosity, unbiased (Nei's)**, which no filter
  reads, and which the diversity reports per population, so that the two
  mean one thing in the application.

All come from one call of popnei's `calcPerVarDistribs` of
`js/popnei/src/stats.ts`, with no `pops`, which gives one population,
`pop`, of every individual the pass gives, those of the list of the
individuals kept, and `minNumIndividuals` 0, so that a variant
with few called genotypes has a value too, where popnei's default of 20
would leave out exactly the variants the missing data filter is there to
find (`docs/architecture.md`, section 4). A variant with no called
genotype at all still has no value, and is in no bin: popnei counted 5 of
the 6 variants of a VCF whose fifth is `./.` in every individual (node,
26 September 2026, `js-v0.1.0-dev.2`).

The histograms are over every variant of the file, and not after the
filters of the variants, as the owner decided on 26 September 2026, so
that no threshold of the variants moved takes them off; and over the
individuals kept, since 28 September 2026, when the owner put the
filters of individuals first and the filters of the variants began to
count over those individuals (`docs/architecture.md`, section 2), and
decided the same day that the histograms follow them, as the writers of
this spec had read the owner's words. So
each histogram shows the number its filter keeps a variant by, counted
as the filter counts it, and a threshold read on it keeps what it
shows. What it costs: a change of a filter of individuals takes them
off, and they need a pass again. The option not taken, the histograms
over every individual as until then, one pass per load, would show a
MAF or a heterozygosity other than the one the filter keeps a variant
by: on `panel.nei`, with the 111 individuals of the thresholds of the
flow, the mean MAF is 0.7173 where every individual gives 0.7163, and the
histogram of the MAF holds 1,178 variants in its bins up to 0.95 where
that of every individual holds 1,175.

The expected heterozygosity is the unbiased one, decided here, since the
diversity shows the unbiased one and a user who compares the two should
read one statistic. The 40 bins over 0 to 1 are popnei's defaults,
given explicitly so that a new default of popnei does not change them
unsaid. One call gives the three with the same bins, `histBinEdges`
shared, so the MAF of a variant of two alleles, which is at least 0.5,
fills the right half of its plot alone; a variant of three alleles can be
below 0.5.

The histogram of the proportion of missing genotypes of each variant,
which the missing data filter reads, comes with popnei's release that has
it (`docs/architecture.md`, section 6, "What this asks of popnei", item
4).

### What goes into its key

`filtersRead` is `{ variants: false, individuals: true }`, and
`keyInputs(p)` gives `null`. So a new load, the read options of a VCF, a
filter of individuals, a list or a threshold, the key version and the
version of popnei change it; no filter of the variants and no
individuals file does. The key holds the thresholds of the individuals
and not the list they keep (`docs/specs/core/keys.md`), so two
thresholds that keep the same individuals give two keys. The key
version is 2, raised on 28 September 2026 when the key began to hold
the filters of individuals.

### Why it cannot run

`needs(p)` gives `null`. The store locks it with the reasons of
`projectNeeds`, and, since it reads the filters of individuals, with a
list of individuals that popnei would refuse, `individualListNeeds` of
`docs/specs/core/project.md`, and with the filters of individuals that
keep nobody, `keptNoneReason` of `docs/specs/core/individualsKept.md`.
It reads no filter of the variants, so the LD filter with no distance,
`variantFilterNeeds`, does not lock it, and the user can read the
histograms while choosing the distance. With a threshold on the
individuals and no statistics of each individual for the load, its Run
calculates them first (`docs/specs/core/store.md`, "A Run that waits for
the statistics").

### The request

```ts
{ analysis: "variantChecks", fileId: p.variants.fileId, filters: [],
  individuals: c.individuals, minNumIndividuals: 0, numBins: 40, range: [0, 1] }
```

`individuals` is the list of the individuals kept that the client bound
to its key gives, `null` when the filters remove nobody; the runner puts
it on the `Variants` with `filterIndividuals`. The job carries
`filters: []` so that the runner, which puts the job's
filters on its `Variants` and opens the file again when they differ from
those it holds (`docs/architecture.md`, section 6), treats it as it
treats every job. It calls

```js
calcPerVarDistribs(variants, {
  stats: ["maf", "obs_het", "unbiased_exp_het"],
  minNumIndividuals, histKwargs: { range, numBins },
})
```

and answers:

```ts
{
  analysis: "variantChecks",
  binEdges: Float64Array,         // 41 edges, from histBinEdges
  maf: { mean: number; counts: Uint32Array },            // mean[0], histCounts
  obsHet: { mean: number; counts: Uint32Array },
  unbiasedExpHet: { mean: number; counts: Uint32Array },
  passStats: PassStats,           // numVars: the variants of the file
}
```

Its `passStats` has no filter, so the store takes from it the number of
variants of the file (`countsOf`, `docs/architecture.md`, section 4) and
no counts of the filters. popnei refuses a file with no variant, "the
pass gave no variant and its source holds none", and a line of a VCF it
cannot read. A refusal of an empty pass, "the pass gave no variant:",
gets popnei's own message in the words of any other refusal, and not
"Loosen the filters", since the pass of the histograms reads no filter
and no filter would help; the owner kept it so on 27 September 2026, at
stop A of `docs/plans/variants-step.md`.

### The warnings

| code | when | the text |
|---|---|---|
| `variantsWithoutCalls` | the counts of a histogram sum to fewer than `numVars` | "12 of the 1,200 variants of panel.nei have no called genotype, and are in none of the histograms.", with "among the individuals kept" after "genotype" when the filters of individuals remove some, as the job's `individuals` not `null` says: "12 of the 1,200 variants of panel.nei have no called genotype among the individuals kept, and are in none of the histograms. The filter by observed heterozygosity, the MAF filter and the LD pruning remove them at any threshold, and the missing data filter at any threshold below 1." |

Every value is from 0 to 1, inside the range of the bins, so a variant
missing from the counts is one with no value. The warning reads the
counts of the MAF, which has a value wherever one allele is called. The
observed heterozygosity reads whole genotypes: a variant whose only calls
are `0/.` and `1/.` had a MAF and an expected heterozygosity and no
observed one (node, 26 September 2026, `js-v0.1.0-dev.2`), a case too
rare to warn of apart, which the help mentions. The last sentence of the
warning is what popnei's filters did in node on 26 September 2026 with
`js-v0.1.0-dev.2`, on a VCF of three variants whose second is `./.` in
every individual: the missing data filter kept it at 1 and dropped it at
0.99, and the filter by heterozygosity and the MAF filter at 1, and the
LD pruning at an r² of 1, each dropped it.

### The check numbers

`checkNumbers(r)` gives `passStats.numVars` and the three means, in the
order above, `null` for a NaN: four numbers of popnei's, with no
arithmetic, over the whole file and the individuals kept, and so a
strong check that a reopened project was given the same file. `numCheckNumbers(p)` gives 4.

### Its lines of the Python script

```python
# The histograms of the variants, over every variant of the file and the individuals kept
variants_as_read = popnei.open_vars("panel.nei")
variants_as_read.filter_individuals(individuals_kept)
variant_distribs = popnei.calc_per_var_distribs(
    variants_as_read,
    stats=[popnei.PerVarStat.MAF, popnei.PerVarStat.OBS_HET, popnei.PerVarStat.UNBIASED_EXP_HET],
    min_num_individuals=0,
    hist_kwargs={"range": (0, 1), "num_bins": 40},
)
```

The file is opened again with no filter, as `script.ts` of stage 6 opens
it, `popnei.open_vcf` with the read options for a VCF, since a
`Variants` takes no filter off, and given the list of the individuals
kept, `individuals_kept`, which `script.ts` makes before any filter; the
line of `filter_individuals` is left out when the filters of
individuals remove nobody.

### The TypeScript interface

```ts
export interface VariantChecksJob {
  readonly analysis: "variantChecks";
  readonly fileId: string;
  readonly filters: readonly [];
  readonly individuals: readonly string[] | null; // the individuals kept; null for all
  readonly minNumIndividuals: number;
  readonly numBins: number;
  readonly range: readonly [number, number];
}

export interface VariantDistrib { readonly mean: number; readonly counts: Uint32Array }

export interface VariantChecksResult {
  readonly analysis: "variantChecks";
  readonly binEdges: Float64Array;
  readonly maf: VariantDistrib;
  readonly obsHet: VariantDistrib;
  readonly unbiasedExpHet: VariantDistrib;
  readonly passStats: PassStats;
}

export const variantChecks: AnalysisDef<Job, JobResult>;
// id "variantChecks"; app ["popgen", "gwas"]; keyVersion 2;
// filtersRead { variants: false, individuals: true }; defaults {}

/** The words of a refusal of popnei, for the error state of the panel. */
export function refusalText(message: string, p: Project): string;
```

`parseOptions` gives back `{}` for `{}` and refuses anything else, as
that of `individualChecks`.

### The cases

- **A filter of the variants moved.** Nothing: the key does not hold
  the filters of the variants.
- **A filter of individuals changed**, a list applied or a threshold
  moved. The key changes: the histograms go, with the notice of the
  change, and a Calculate makes them over the individuals now kept; an
  undo brings them back with no calculation.
- **A VCF read again with another ploidy.** A new key, a new pass.
- **A variant of three alleles** is in the MAF histogram below 0.5; a
  variant with one allele called in the whole file has a MAF of 1.

### How it runs

One pass. The result is 41 edges and 120 counts, about 1 KB, whatever
the size of the file.

### How it is verified

With Vitest: the key does not change with a filter of the variants, and
changes with a filter of individuals and with a new load; `run` sends
the job above, with the `individuals` of a fake client that gives a
list, and with `null`; `warnings` of a result whose MAF
counts sum to 5 of `numVars` 6 gives `variantsWithoutCalls` with "1 of
the 6 variants"; `checkNumbers` of the result below gives its four
numbers.

The numbers of the runner's test and of the flow, on `e2e/fixtures/panel.nei`
and on `panel.vcf.gz`, which give the same, got in node on 26 September
2026 with `js-v0.1.0-dev.2` by the call above: `numVars` 1,200; the means
0.7163445463101891 for the MAF, 0.35429523451520484 for the observed
heterozygosity and 0.3754712450806149 for the expected; the MAF counts
twenty zeros and then `69, 75, 62, 71, 60, 74, 72, 83, 70, 68, 64, 83,
64, 63, 67, 57, 48, 25, 22, 3`, summing to 1,200, so no warning; the
observed heterozygosity `0, 4, 9, 18, 20, 25, 30, 34, 50, 61, 53, 69, 62,
84, 89, 101, 113, 102, 108, 58, 62, 27, 14, 5, 2` and fifteen zeros. The
check numbers are `[1200, 0.7163445463101891, 0.35429523451520484,
0.3754712450806149]`. The descriptions of the MAF at 0.95 and of the
observed heterozygosity at 0.5, made from these counts, are the two of
`docs/specs/charts/histogram.md`, "The numbers without the picture",
asserted whole with Vitest. The flow reads the mean of the MAF on the screen to
four decimals, 0.7163, and sees it stay when the missing data filter
changes.

With the list of the 111 individuals that the thresholds of the flow of
the Variants step keep, 0.03 of missing genotypes and 0.38 of observed
heterozygosity (`docs/specs/core/individualsKept.md`), popnei gave in
node on 28 September 2026 with `js-v0.1.0-dev.3`, by `orderA.mjs` of
`docs/specs/worker/runner.md`, "How it is verified": `numVars` 1,200;
the means 0.7173150249650765, 0.3528596566999348 and 0.3749397114515978;
the MAF counts twenty zeros and then `58, 86, 64, 73, 66, 61, 71, 80,
80, 63, 69, 70, 63, 73, 54, 62, 52, 33, 16, 6`, summing to 1,200; the
check numbers `[1200, 0.7173150249650765, 0.3528596566999348,
0.3749397114515978]`. The runner's test asserts them, and the flow,
after the two thresholds are set, sees the histograms go and, calculated
again, reads the mean of the MAF 0.7173.

## The panel

Its part of the Variants step (`docs/specs/steps/variants.md`), headed
"Histograms of the variants".

### What it shows

A button, "Calculate the histograms of the variants", and, once they are
calculated, the three histograms of `docs/specs/charts/histogram.md`,
each titled with its statistic and its mean, "Major allele frequency,
mean 0.7163", and a caption for the three: "Over the 1,200 variants of
panel.nei, before any filter.", or, when the filters of individuals
remove some, "Over the 1,200 variants of panel.nei and the 111
individuals the filters of individuals keep, before any filter of the
variants." The threshold of the MAF filter and of the
filter by heterozygosity is marked on its histogram when the filter is
on. Each has the table of its bins in the tab "Table of the bins", next
to the tab of the plot, from `histogramRows`, a
description in the form of the histogram's spec, "The major allele
frequency of 1,200 variants, in 40 bins from 0 to 1. The threshold 0.95
keeps the 38 bins up to it, 1,175 variants, and removes the 2 bins above
it, 25 variants.", and the download of the table of its bins as CSV,
`panel.variant_maf_bins.csv`, `panel.variant_obs_het_bins.csv` and
`panel.variant_exp_het_bins.csv` (`docs/specs/steps/variants.md`). The
histograms themselves are not offered as SVG or PNG in stage 3, as the
owner decided on 26 September 2026 (point C of
`docs/specs/stage-3-open-points.md`): the export is built and tested
with the base of the 2D plots (`docs/specs/charts/plot2d.md`), and
offered by buttons in stage 6, under the names `panel.variant_maf.svg`,
`panel.variant_obs_het.svg` and `panel.variant_exp_het.svg`, or `.png`.
The option not taken was the two buttons on each histogram from stage 3.

### The states

| state | what the user sees | what they can do |
|---|---|---|
| empty | cannot happen: locked until the file is read | |
| locked | not drawn while the variants file is not read: the Variants step shows in place of its part the line "The histograms, the counts and the statistics of each individual are calculated once a variants file is read." (`docs/specs/steps/variants.md`, "What it does"). With the file read, drawn locked beside its disabled button while a list of individuals names one twice or one not in the file, with the reason of `individualListNeeds`, or while the filters of individuals keep nobody, with that of `keptNoneReason` | load a file; correct the list, or loosen the filters of individuals |
| ready | the button | Calculate |
| running | the bar and the clock, as the diversity's | Stop |
| done | the three histograms, the warning above them | download |
| results removed | a new load, or its undo or redo, removes them, in the words of the table below, and, from 28 September 2026, a change of a filter of individuals, in the words of the diversity's table with "the histograms of the variants" and "for the settings as they are now" | Calculate; Undo or Redo |
| error | the words of the diversity's error table, "the diversity" replaced by "the histograms of the variants", and "Run it again" and "to run it again" by "Calculate them again" and "to calculate them again", since this part has a Calculate button and no Run; and, when popnei refused for another reason, "Change the settings, or load the variants file again" by "Load the variants file again, or read it again with other options", since what popnei refused is the file, which no change of a filter mends: "popnei could not calculate the histograms of the variants: ‹its message›. Load the variants file again, or read it again with other options, to calculate them again."; for the statistics of each individual that a Calculate waited for, refused or failed, the row of the diversity's table for them with "the diversity was not run" as "the histograms of the variants were not calculated": "The statistics of each individual, which the thresholds of the individuals need, could not be calculated, so the histograms of the variants were not calculated. ", then the words of the statistics | as in the diversity |

The words of the histograms removed are those of the diversity's table
of results removed, for a result in the plural and a button whose words
start with "Calculate", and they say "for the file loaded now", since
only a change of the load removes them, a new file or the same file read
again with other options, whose words end the sentence as the command
gives them. They were written with the code
on 27 September 2026, and the owner accepted them the same day, at stop
A of `docs/plans/variants-step.md`, where the screens are tried:

| the cause | results removed |
|---|---|
| a command | "The histograms of the variants were removed because a new variants file was loaded. Undo brings them back as they were, with no calculation; Calculate makes them anew for the file loaded now." |
| an undo | "Undone: a new variants file was loaded. The histograms of the variants were removed; Redo brings them back as they were, with no calculation, and Calculate makes them anew for the file loaded now." |
| a redo | "Redone: a new variants file was loaded. The histograms of the variants were removed; Undo brings them back as they were, with no calculation, and Calculate makes them anew for the file loaded now." |
| a command that reads the same file again with other options, "Read … again" of the Variants step | "The histograms of the variants were removed because the variants file was read again with other options. Undo brings them back as they were, with no calculation; Calculate makes them anew for the file loaded now."; its undo and redo as the two rows above, "Undone: the variants file was read again with other options. …" |

A calculation stopped at once by a change of the load has the line of
the diversity, "The calculation of the histograms of the variants was
stopped because the variants file was read again with other options.",
while the notice that says so is up.

### Its words

The warning and the words of the states are above. The help, for the
drawer of stage 8: what each statistic is; that the histograms are over
every variant of the file and the individuals kept, so that each shows
what its filter reads, as it reads it; that a
variant is counted with any number of called genotypes, and one called
only in half genotypes, `0/.`, has no observed heterozygosity; and
`popnei.calc_per_var_distribs(variants, min_num_individuals=0)` in
Python.

### Accessibility

Each histogram has the text alternative of the plot, and its threshold is
said in words beside it, "Threshold of the MAF filter: 0.95", not by the
line alone (WCAG 2.2, 1.4.1).

### Left for the running application

Whether the three are side by side or stacked, and whether the empty
left half of the MAF is drawn.

## What this spec relies on in the specs written beside it

- `docs/specs/worker/protocol.md` and `runner.md`: the job and the result
  above, `PassStats`, and a job with `filters: []` opening the file again
  when the `Variants` holds filters.
- `docs/specs/charts/histogram.md`: bins given as edges and counts, a
  threshold marked, the export.
- `docs/specs/core/store.md`: `countsOf` taking the number of variants of
  the file from this result, and no counts of the filters.

## Open points

None.

## Not in this spec

The histogram of the proportion of missing genotypes of each variant,
and the density of variants along each chromosome, with popnei's release
that has them. The chromosomes of the file with their numbers of
variants (`docs/functionality.md`, section 3, "What the dataset holds")
come with the density, which gives them.
