# What each filter kept

Written on 26 September 2026, for stage 3 of `docs/build-order.md`, the
Variants step whole. There is no code of it yet. This spec gives the
third check of the Variants step: the module
`src/core/analyses/filterCounts.ts`, how many variants each filter of the
variants was given and kept, which the step shows beside each filter;
and, after it, the short spec of the Count button that calculates them.
It develops section 3 of `docs/functionality.md`, "The filters of
variants", and section 4 of `docs/architecture.md`, "What each filter
kept". It depends on the specs of stage 2 revised for stage 3,
`docs/specs/core/keys.md`, `store.md` and `docs/specs/worker/protocol.md`,
and on `docs/specs/entry.md`, for `countsOf`. The words key, load, pass,
check numbers and the filters are those of
`docs/specs/analyses/individualChecks.md`. Revised on 27 September 2026
with the owner's decisions at stop A of `docs/plans/variants-step.md`:
the line of no counts, the counts of a file with no variant, and the
words of a refusal for a file with none. Revised on 27 September 2026
for stage 4, in the row of the PCA: why its pass fills no counts.
Revised on 28 September 2026 for the owner's decision that day that the
LD filter of the Variants step starts with no distance: while it has
none, the store locks the Count with the reason of `variantFilterNeeds` of
`docs/specs/core/project.md`, and the job takes its filters from
`jobFilters`. This changes the code of stage 3, and the plan of stage 4
carries the change. Revised again that day for the owner's decision
that the filters of individuals act first (`docs/architecture.md`,
section 2): the filters of the variants count over the individuals
kept, so the key of the counts holds the filters of individuals, the
job carries the list, a Count with a threshold on the individuals waits
for their statistics, a list popnei would refuse or one that keeps
nobody locks it, the statistics of each individual no longer fill the
counts, and the key version is 2. Revised again that day for the
owner's decision that the PCA has its own filters of missing data, MAF
and LD, each following the Variants step by default: why the PCA still
fills no counts. Not yet reviewed or approved; it
changes the code of stage 3.

## The module

### What it does

popnei gives, with every result, the counts of its pass, `passStats` of
`js/popnei/src/variant.ts`: `numVars`, the variants the pass gave after
every filter, and `filtering`, for each filter of the variants in the
order of the steps and under its kind, `missing_data`, `obs_het`, `maf`
or `ld`, the variants it was given, `varsProcessed`, and kept,
`varsKept`. The first filter was given every variant of the file. The
filter of individuals has no entry, since it drops no variant; it comes
first, since 28 September 2026, and every filter of the variants counts
over the individuals it keeps (`docs/architecture.md`, section 2).

The result of this analysis is those counts, for the filters of the
project, and it reaches the cache in two ways, with the same shape
(`docs/architecture.md`, section 4):

- **The Count button** runs its own pass, over the list of the
  individuals kept and the filters of the variants, and nothing else. It is the way to see the counts before any
  analysis, while the thresholds are being set, and when the filters
  keep no variant, which is when a user most needs to see which filter
  dropped them all: every calculation of popnei refuses an empty pass,
  and gives no counts then.
- **Every other pass over the project's filters fills it.** When a result
  arrives of an analysis whose pass puts on the `Variants` the list of
  the individuals kept and the filters of the variants of its project,
  and none of its own, the store puts its
  counts into the cache under this analysis's key for that project, as a
  result of this analysis. So after a diversity, the counts of its
  filters are there with no Count. Which results those are is told by the
  analysis of the result, below, and not by comparing the filters of its
  pass with the project's.

### What goes into its key

`filtersRead` is `{ variants: true, individuals: true }`, and
`keyInputs(p)` gives `null`. The filters of individuals are in, since
28 September 2026, because popnei is given their list before every
filter of the variants (`docs/architecture.md`, section 2), and those
filters count over the individuals it keeps: on `panel.nei` the missing
data filter at 0.05 keeps 1,152 of the 1,200 variants over every
individual and 1,117 over the 111 individuals of the thresholds of
`docs/specs/core/individualsKept.md`. Until then they were left out,
since the list came after the filters and changed none of their counts.
The key holds the thresholds and not the list (`docs/specs/core/keys.md`).
A change of any filter, of the variants or of the individuals, changes
the key, and takes off the counts of all of them; the step shows that beside the filters, so the
store leaves this analysis out of the notice of results removed, which
would otherwise speak at every move of a threshold
(`docs/architecture.md`, section 4, "The notice leaves the counts out").
The key version is 2, raised on 28 September 2026 to mark that the
counts are over the individuals kept; the key and the fingerprint of the
settings of a project with a filter of individuals hold it now, so a
result or a check number of version 1 is found or compared only for a
project with none, whose counts are the same.

### Why it cannot run

`needs(p)` gives `null`. The store locks it with the reasons of
`projectNeeds` and, since it reads the filters of the variants, with
that of `variantFilterNeeds` of `docs/specs/core/project.md`, the LD
filter with no distance, "The LD filter of the Variants step needs the
distance within which variants are compared. …": no count is made while
the filters cannot all be given to popnei. Since it reads the filters
of individuals, the store also locks it with a list of individuals that
popnei would refuse, `individualListNeeds` of
`docs/specs/core/project.md`, and when the filters of individuals keep
nobody, `keptNoneReason` of `docs/specs/core/individualsKept.md`; and,
with a threshold on the individuals and no statistics of each individual
for the load, a Count calculates them first, as any analysis that reads
the filters of individuals (`docs/specs/core/store.md`, "A Run that
waits for the statistics"). With no filter, Count gives the number of
variants of the file.

### The request

```ts
{ analysis: "filterCounts", fileId: p.variants.fileId, filters: jobFilters(p.filters),
  individuals: c.individuals }
```

`individuals` is the list of the individuals kept that the client bound
to its key gives, `null` when the filters remove nobody. The runner puts
the list on the `Variants`, and then the filters in their order, iterates
`variants.iterBlocks({ fields: [] })` to its end, and answers the
`passStats` of the blocks:

```ts
{ analysis: "filterCounts", passStats: PassStats }
```

`fields: []` asks for nothing besides the genotypes, which every block
carries, so the chromosomes and positions are not parsed. On
`panel.nei`, with the missing data filter at 0.05 and the MAF filter at
0.4, the pass gave no block and the counts `{ numVars: 0, filtering: {
missing_data: { varsProcessed: 1200, varsKept: 1152 }, maf: {
varsProcessed: 1152, varsKept: 0 } } }`, where `calcPerIndividualStats`
of the same filters threw "the pass gave no variant: …" (node, 26
September 2026, `js-v0.1.0-dev.2`). With the list of the 111
individuals before the missing data filter at 0.05, the filter by
heterozygosity at 0.9 and the MAF filter at 0.95, the counts are
`missing_data` 1,200 to 1,117, `obs_het` 1,117 to 1,117 and `maf` 1,117
to 1,096, `numVars` 1,096 (node, 28 September 2026, `js-v0.1.0-dev.3`,
`orderA.mjs` of `docs/specs/worker/runner.md`). `numPassesOf("iterBlocks")` is 1. A
pass of `iterBlocks` copies every block of genotypes out of wasm; its
time against a pass of the diversity is measured in the work package of
the Count (`docs/architecture.md`, section 11), and popnei is asked for a
function that only counts if it is much longer.

### Which results fill it

`countsOf` of `src/core/apps.ts`, which replaces `numVarsOf`
(`docs/specs/entry.md`), gives, of a result, the number of variants of
the file, `varsProcessed` of its first filter or `numVars` when it has
none, and its counts when its analysis is one whose pass has the list
of the individuals kept and the filters of the variants of the project
of its request, by the `analysis` of the result:

| the result | the counts |
|---|---|
| the diversity, the written file, this analysis | given: each pass has the project's list of the individuals kept and its filters of the variants, in that order |
| the statistics of each individual | not given, from 28 September 2026: their pass has no filter and no list, whatever the project's; until then it had the project's filters of the variants and gave them |
| the histograms of the variants | not given: their pass has the list and no filter of the variants, whatever the project's; with no filter of the variants in the project their counts would be those of a Count, and they are not given then either, so that one rule, by the analysis, decides |
| the principal components, stage 4 | not given: its filters of missing data, MAF and LD can be its own in the place of the project's, and then its counts are not those beside the filters (`pcaFilters` of `docs/specs/analyses/pca.md`); a PCA whose filters all follow the Variants step has the project's, and its counts are not given either, since telling which PCAs have the project's filters is not worth its code; the number of variants of the file is given, `varsProcessed` of its first filter |

The store makes of the counts the result `{ analysis: "filterCounts",
passStats }` and puts it under the key of this analysis for the request's
project, with its warnings; an undo brings it back as it brings any
result.

### The warnings

| code | when | the text |
|---|---|---|
| `filterKeptNone` | a filter kept no variant; the first such | "The MAF filter kept none of the 1,152 variants it was given, so the analyses have no variant to calculate over, and a file written would hold none. Loosen it, or a filter before it.", without "and the statistics of each individual", which stage 3 had, since their pass has no filter from 28 September 2026; and, when it is the first filter, which has none before it, "… Loosen it.", as the owner kept it on 27 September 2026 |
| `noVariant` | the file gave no variant, `numVars` 0 with no filter or the first filter given 0 | the words of the diversity for a file with no variant, "empty.vcf has no variants. Load another variants file.", and, for a VCF read with only the variants that passed, "failed.vcf has no variant with PASS or . in its FILTER column, and it was read with only those. Untick …" |

The names of the filters are those of the step's labels, "the filter
of the variants by missing data", "the filter of the variants by
observed heterozygosity", "the MAF filter", "the LD pruning": the first
two say "of the variants", as their switches "Filter the variants by …"
do, since from stage 3 the individuals have filters by the same two
numbers.

### The check numbers

`checkNumbers(r)` gives the variants of the file, then `varsKept` of each
filter in its order: 1 + the number of filters, `[1200, 1152, 1152, 1128]`
for the missing data filter at 0.05, the filter by heterozygosity at 0.9
and the MAF filter at 0.95. `numCheckNumbers(p)` gives 1 +
`p.filters.length`.

### Its lines of the Python script

```python
# How many variants each filter was given and kept
blocks = variants.iter_blocks()
for _ in blocks:
    pass
print(blocks.pass_stats)
```

after the lines of `script.ts`, stage 6, that put on `variants` the
filter of individuals and then the filters of the variants, which count
over the individuals it keeps.

### The TypeScript interface

```ts
export interface FilterCountsJob {
  readonly analysis: "filterCounts";
  readonly fileId: string;
  readonly filters: readonly VariantFilter[];
  readonly individuals: readonly string[] | null; // the individuals kept; null for all
}

export interface FilterCountsResult {
  readonly analysis: "filterCounts";
  readonly passStats: PassStats;
}

export const filterCounts: AnalysisDef<Job, JobResult>;
// id "filterCounts"; app ["popgen", "gwas"]; keyVersion 2;
// filtersRead { variants: true, individuals: true }; defaults {}

/** What one filter of the variants was given and kept. */
export interface FilterCountRow {
  readonly kind: VariantFilterKind;
  readonly given: number;
  readonly kept: number;
}
/** The rows of a result, in the order of the filters of the project it
    was asked for; a defect when a filter of it has no count. */
export function filterCountRows(r: FilterCountsResult, p: Project): readonly FilterCountRow[];

/** The words of a refusal of popnei, for the error state of the Count
    button. */
export function refusalText(message: string, p: Project): string;
```

`parseOptions` gives back `{}` for `{}` and refuses anything else.
`refusalText` gives the words of the error state below, "The states":
those of the diversity's error table with the words of the Count. It
has no row of its own for an empty pass, since popnei gives the counts
of a pass the filters left empty and does not refuse it, and so such a
message would get the words of any other refusal.

### The cases

- **The filters keep no variant.** Count gives the counts, with
  `filterKeptNone`. Every analysis that reads the filters of the
  variants is refused by popnei, each with its own words; the statistics
  of each individual, which read no filter, and the histograms of the
  variants, which read no filter of the variants, still run; and a write gives a file of no variant, 3,594 bytes,
  3,682 with popnei's `js-v0.1.0-dev.3`, on `panel.nei` with the missing data filter at 0.05 and the MAF filter
  at 0.4, which the step does not offer
  (`docs/specs/analyses/writeVariants.md`).
- **The file holds no variant.** Count gives counts of zero, with
  `noVariant`, and is not refused: popnei's `iterBlocks` refuses no
  empty source, and gave `{ numVars: 0, filtering: {} }` with no filter
  and `{ numVars: 0, filtering: { missing_data: { varsProcessed: 0,
  varsKept: 0 } } }` with the missing data filter, on a VCF of a header
  alone (node, 27 September 2026, `js-v0.1.0-dev.2`). A write over the
  same file gives the same counts, so the counts the store fills from a
  write and those of a Count agree, and the first row of `refusalText`,
  the source that holds no variant, never reaches the Count's error
  state. The step shows the warning alone, with no count beside the
  filters and no line of the total, since "Kept 0 of the 0 variants it
  was given." and "0 of the 0 variants of empty.vcf pass the filters."
  would say nothing the warning does not, as the owner decided on 27
  September 2026; the shell announces the warning at the end of the
  Count in place of the line of the total.
- **A threshold moved**, of the variants or of the individuals, or a
  list of individuals applied. The counts of every filter go, since
  their key holds all of them, and come back with an undo or the next
  pass.
- **A threshold moved back.** The key of the earlier filters, and their
  counts, come back from the cache with no pass.
- **The filter of regions of a BED file** comes with popnei's release
  that has it, under the kind `regions`, first among the filters.

### How it is verified

With Vitest: the key different when any filter of the variants or of the
individuals changes; `run` sends the `individuals` the fake client
gives; `filterCountRows` of the
counts above; `warnings` of the counts of the empty pass above gives
`filterKeptNone` naming the MAF filter; `checkNumbers` as above;
`refusalText` of the row of a genotype of another ploidy, and of the row
of any other refusal, as literals. The test
of the runner, in node on `panel.nei`, asserts the counts of the empty
pass above and, for the three filters above, `numVars` 1,128 with 1,200
to 1,152, 1,152 to 1,152 and 1,152 to 1,128, and with the list of 111
before them `numVars` 1,096 with 1,200 to 1,117, 1,117 to 1,117 and
1,117 to 1,096, as literals. The store's
test that a diversity fills the counts is `docs/specs/core/store.md`'s;
the architecture's check that the counts filled from a diversity are
those of a Count with the same filters is the runner's
(`docs/architecture.md`, section 4).

## The Count button

Its part of the Variants step, which shows the counts beside each filter
(`docs/specs/steps/variants.md`, written after this spec). Its title in
the status region is "Counts of the filters".

### What it shows

The button "Count the variants each filter keeps", under the filters of
the variants. Beside each filter, once counted: "Kept 1,152 of the 1,200
variants it was given." Under the last: "1,128 of the 1,200 variants of
panel.nei pass the filters." Without counts for the filters as they are:
"Not counted for these filters. Count to see what each filter keeps.",
as the owner decided on 27 September 2026; the words before, "Count, or
run an analysis, …", sent the user to the analyses also while the
Analyses step was locked.

### The states

| state | what the user sees | what they can do |
|---|---|---|
| empty | cannot happen: locked until the file is read | |
| locked | not drawn: while the store locks it, the variants file is not read, and the Variants step shows in place of its part the line "The histograms, the counts and the statistics of each individual are calculated once a variants file is read." (`docs/specs/steps/variants.md`, "What it does"). With the file read, it is drawn locked while the LD filter has no distance, while a list of individuals names one twice or one not in the file, and while the filters of individuals keep nobody: the reason of `variantFilterNeeds`, `individualListNeeds` or `keptNoneReason` beside the disabled button, in place of the line of no counts, and no count beside the filters | load a file; type the distance of the LD filter, or turn it off; correct the list, or loosen the filters of individuals |
| ready | the button, and the line of no counts | Count |
| running | the bar and the clock of the diversity, beside the button; while the statistics of each individual that a Count with a threshold on the individuals waits for are calculated, their words and progress, as the diversity's | Stop |
| done | the counts beside the filters, and the warning | change a filter |
| results removed | cannot happen: the counts are in no notice; a change shows the line of no counts | |
| error | the words of the diversity's error table, "calculate the diversity" replaced by "count the variants", and "Run it again" and "to run it again" by "Count again" and "to count again", since this part has a Count button and no Run; but for a file with no variant, "there is no variant to count", "empty.vcf has no variants, so there is no variant to count. Load another variants file in the Variants step.", and not "there is no variant to count the variants over", as the owner decided on 27 September 2026 | as in the diversity |

### Accessibility

The counts are text beside the field of their filter, and the field is
described by them, `aria-describedby`, so a screen reader reads the
count with the field. The end of a Count is announced by the shell's
status region.

### Left for the running application

Whether the counts are beside or under each field, and whether the
number of the file is at the top of the filters.

## What this spec relies on in the specs written beside it

- `docs/specs/worker/protocol.md` and `runner.md`: `PassStats` on every
  result, and the job and result above.
- `docs/specs/core/store.md`: the counts put under this key from every
  result `countsOf` gives them for, and this analysis left out of the
  notice.
- `docs/specs/entry.md`: `countsOf` in place of `numVarsOf`, as the table
  above.
- `docs/specs/steps/variants.md`: the counts beside each filter, and the
  names of the filters.

## Open points

None.

## Not in this spec

The counts of the filters of individuals, which need no pass:
`individualsKept` of `docs/specs/core/individualsKept.md`.
