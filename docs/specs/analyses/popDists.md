# The distances between populations

Written on 30 September 2026, for stage 5 of `docs/build-order.md`, the
analyses of the populations; not yet approved by the owner, and no code
of it exists. Revised the same day when the specs of stage 5 were made
to agree: the populations under the minimum split, and named before a
Run, by the functions of `project.ts` the diversity calls too. Its
four open points were decided by the owner on 30 September 2026, each
as recommended, and are written below as decided (points 13 to 16 of
`docs/specs/stage-5-open-points.md`). This spec gives the module
`src/core/analyses/popDists.ts`, which says what the distances between
the populations are calculated from, when they cannot run, what they
ask of the calculation worker, what they warn of, and what they keep in
the project file and write in the Python script; and, after it, the
panel of `src/ui/analyses/popDists/` that shows them as a heatmap and a
table. It develops section 7 of `docs/functionality.md`, "Between
populations", and fills the shape of an analysis of section 4 of
`docs/architecture.md`, the row `analyses/` of its section 9. The
heatmap is drawn by `docs/specs/charts/heatmap.md`, written with it. It
follows the diversity, `docs/specs/analyses/diversity.md`, in
everything this spec does not say otherwise: the populations, the
filters, the states of the panel and the words they share. It depends on
`docs/specs/core/keys.md`, `store.md`, `project.md` and
`individualsKept.md`, and on `docs/specs/worker/protocol.md`,
`runner.md` and `messages.md`, which it asks to change, in "What this
spec asks of other documents" at the end.

The owner decided on 30 September 2026, before this spec was written
(`docs/specs/stage-5-open-points.md`, decisions 1 and 2):

- **No standard errors.** popnei's `calcPopDists` is called with
  `jackknifeGroup: null`. Not taken: standard errors when the user types
  the length of the blocks they are resampled over, which depends on
  how far the LD reaches in the user's genome; popnei's blocks of one
  variant each, which are right only for unlinked markers.
- **The heatmap ordered by popnei's PCoA.** The populations of the
  heatmap are in the order of the first axis of popnei's principal
  coordinate analysis, `doPcoa`, of the distance matrix, so that similar
  ones are together, and in the order of the metadata file where popnei
  cannot place them. Not taken: a clustering tree written in the
  application; the file's order always.

The words used throughout. A **pair** is two populations, and every
distance is of a pair. The **measure** is one of the two distances
shown, Hudson's Fst and Jost's D. The **minimum of individuals** is how
many individuals of a population must have a called genotype at a
variant for the variant to count for a pair that population is in,
popnei's `minNumIndividuals`, 20 by default. The **order** of the
heatmap is the order of its rows, top to bottom, which is also that of
its columns, left to right. The **key**, the **load** and the **check
numbers** are as the diversity defines them.

## The module

### What it does

For each pair of the populations it gives two distances over the
variants the filters kept, Hudson's Fst and Jost's D, and the number of
variants each pair was calculated over; and, for each of the two
measures, the order of the heatmap. All of it comes from popnei: the
distances from one call of `calcPopDists` of `js/popnei/src/pop_dists.ts`,
the order from `correctDistsByLingoes` and `doPcoa` of
`js/popnei/src/pcoa.ts`, whose numbers are verified in popnei against R
and pyNei (`docs/specs/dists.md` and `docs/specs/pca.md` of popnei). The application computes
none of the distances.

**The two measures.** `docs/functionality.md` section 7 names Hudson's
Fst as the default and Jost's D as the alternative, popnei's `fst` and
`dest`. Both are asked of popnei in the one call, `measures: ["fst",
"dest"]`, since the pass over the file is what costs and each measure is
a division at its end (the doc comment of `CalcPopDistsOptions.measures`).
So the table shows both, and the choice between them, the option
`measure`, only says which one the heatmap draws; a change of it
calculates nothing. The other five measures of popnei, f2, the chord
distance, Nei's D_A, G_ST and G''_ST, are not shown, since section 7
names two.

**Why each pair has its own number of variants.** popnei counts a
variant for a pair only when both of its populations have at least the
minimum of individuals with a called genotype there, and tests each
pair on its own (`PopDists.numVars`): a population short of individuals
at a variant loses it in every pair it is in, and the other pairs keep
it. So two pairs can be over different variants, and the table gives
each its count.

**A population with fewer individuals than the minimum is left out**,
as the owner decided on 30 September 2026 (below, "Open points").
Such a population can reach the minimum at no variant, so popnei gives
every pair it is in no value, NaN, and counts 0 variants for it: on
`panel.nei`, with p0 cut to 12 individuals, the pairs of p0 with p2 and
with p1 counted 0 variants and had no value, and the pair p2 and p1 kept
its 0.10962148955018115 (node, `js-v0.1.0-dev.3`, 30 September 2026).
Left in, it would add rows of no value to the table, and it would stop
the order of the heatmap, which needs every pair (below). So `run`
leaves it out of the request, the ready state names it before a Run, and
the warning `tooFewIndividuals` names it after. Leaving it out changes
no number of the other pairs, since popnei tests each pair on its own.

**The minimum of individuals is an option, with a field.** Populations
of 5 to 15 individuals are common in collections of plant varieties and
breeds, and with the minimum at 20 each of them would be left out. The
field lets the user lower it, to 10 for populations of 10 or more, at
the cost of frequencies estimated from fewer genotypes. Its default is
popnei's, 20, the minimum of the diversity since stage 2.

### The order of the heatmap

The heatmap is read by where the populations close to each other fall,
so the order puts similar populations together. It is made in the
calculation worker, where popnei runs, for each measure, as follows,
and the result carries it (below, "The request"):

1. **Two populations** keep the order of the request, which is that of
   the metadata file: an order of two says nothing of similarity.
   Reason `twoPopulations`.
2. **A pair with no value**, NaN, keeps the order of the file, as the
   owner decided: `doPcoa` refuses it, and it places every population
   by its distance to every other. Reason `noDistance`. With the
   populations under the minimum left out, this is a pair of two
   populations that reach the minimum at no common variant, which
   missing genotypes spread over different variants can give, and Jost's
   D at ploidy 1, which has no value for any pair (below, "The
   warnings").
3. **A negative distance is taken as 0 for the order alone**, as the
   owner decided on 30 September 2026 (below, "Open points"). popnei gives a negative Fst or D for two populations the
   dataset cannot tell apart, the correction for the sample doing its
   work, and does not clamp it (the doc comment of `calcPopDists`);
   `doPcoa` and `correctDistsByLingoes` refuse it. The table and the
   heatmap show the value popnei gave; only the matrix given to the
   PCoA has 0 in its place.
4. **Every distance 0**, after step 3, keeps the order of the file:
   `doPcoa` refuses it, and no population is closer to one than to
   another. Reason `allZero`.
5. **Otherwise**, the runner gives the distances to
   `correctDistsByLingoes`, then its corrected distances, the field
   `distances` of its result, to `doPcoa`, and orders the populations by
   their projection on the first component, `projections[i ×
   numComps]` for the population i, from the smallest to the largest.
   Two populations at distance 0 of each other, and at equal distances
   of the others, have projections that differ only by rounding, and
   come in the order the rounding gives, the same in the application
   and in Python, since both are popnei's; the sort breaks an exact tie
   by the order of the file.
6. **A refusal of popnei at step 5** that none of the steps above
   foresaw, "the linear algebra of the analysis could not be done" among
   those `doPcoa` lists, keeps the order of the file. Reason
   `notPlaced`, with popnei's message.

**Why Lingoes' correction, which the owner's decision did not name.**
`doPcoa` refuses distances that are not Euclidean, that is, that no set
of points in any space has as its distances, and a matrix of Fst often
is not: of 200 matrices of 3 to 10 populations drawn at random with
distances from 0.02 to 0.32, 177 were not. Lingoes' correction adds the
same amount to every squared distance, which leaves the eigenvectors of
the matrix popnei decomposes as they were and raises every eigenvalue
but the 0 of the centering by that amount (the doc comment of
`correctDistsByLingoes`). So the first axis of the corrected distances
is the first axis of the distances given, and the order is the one the
owner asked for, where `doPcoa` alone would have refused it. Checked in
node on 30 September 2026 with `js-v0.1.0-dev.3`: on those 200 matrices
the order along the first axis of `doPcoa` of the corrected distances
was that of the first eigenvector of the uncorrected matrix, computed by
a Jacobi decomposition written for the check, in all 200. Distances that
are Euclidean come back unchanged, with a constant of 0: on `panel.nei`,
both matrices. The option not taken, the order of the file whenever the
matrix is not Euclidean, would lose the order for most datasets of more
than three populations. This settles point 1 of "Opened by the specs" of
`docs/specs/stage-5-open-points.md` but for the negative distances,
which the owner decided as its point 14.

The sign of the first axis is popnei's rule, the projection of the
largest absolute value positive, so the order is the same in every
browser and in Python. On `panel.nei`, whose metadata file gives the
populations in the order p0, p2, p1, both measures order them p2, p0, p1
(below, "How it is verified").

### What goes into its key

`filtersRead` is `{ variants: true, individuals: true }`: every filter
changes the variants and the individuals the distances are over.
`keyInputs(p)` gives the rest:

```ts
{ pops: Pops | "all" | null, options: { minNumIndividuals: number } }
```

`pops` is `populationsOf(p)` of `docs/specs/core/project.md`, as the
diversity's key holds it; `minNumIndividuals` is the project's, or the
default. Not in the key: `measure`, which only chooses what the heatmap
draws, as the colouring of the PCA is left out of its key
(`docs/architecture.md`, section 4, "An option that changes only how a
result is drawn"), so a change of it is saved in the project and undone
by Undo like any other change, and takes no result off the screen; and what the diversity leaves out of its key, for the
same reasons. The key version is 1.

| change to the project | the key |
|---|---|
| any row of the diversity's table of its key, but those of the diversity's own options | as there |
| `minNumIndividuals` | changes |
| `measure` | same |

### Why it cannot run

The store asks `projectNeeds`, `individualListNeeds` and
`variantFilterNeeds` first, as for the diversity. Then `needs(p)` gives
the first of these, in the words the panel shows beside its Run button:

| the project | the reason |
|---|---|
| any reason of `individualsNeeds` and `populationsNeeds` of `project.md`, and the lists of individuals leaving no population, `populationListsNeeds` of `project.md`, which the diversity and the LD decay give too ("Why it cannot run" of `diversity.md`, its whole table) | their words |
| no metadata file: one population, "All individuals" | "The distances between populations need two populations or more, and without a metadata file every individual is in one. Load a metadata file, and choose the column that defines the populations, in the Individuals step." |
| the grouping `onePopulation` | "The distances between populations need two populations or more, and all individuals are in one population. Choose the column that defines the populations in the Individuals step." |
| the column gives one population to the individuals of the variants file, `populationsToRun` of length 1 | "The column popcat of pops.csv gives the individuals of panel.nei one population, p0, and the distances need two or more. Choose another column, or fill in this one and load the file again, in the Individuals step." |
| fewer than two populations of `populationsKept(p, byLists)`, the individuals the lists to keep and to remove keep, have the minimum of individuals, `withMinimum` of `populationsWithMinimum` of `project.md`; `minimumNeeds` | "Only p1 has 20 individuals or more, and a variant counts for a pair of populations only where both have 20 individuals with a called genotype, so no pair has a distance. Lower the minimum of individuals below, or merge populations in the metadata file." With none: "No population has 20 individuals or more, and …", the rest the same. |

The last row names one population, or none; with the lists of
individuals as the reason some of them fell below the minimum, the words
end "…, merge populations in the metadata file, or change the lists of
individuals in the Variants step." The minimum is read from the options
of the project.

`keptNeeds(p, kept)`, which the store asks once the list of the
individuals kept is known and keeps some (`docs/specs/core/store.md`,
"The state of an analysis"), gives `populationsKeptNeeds(p, kept)` of
`project.md`, the diversity's reason, when the list leaves no
population, and otherwise the last row's words when
fewer than two populations of `populationsKept(p, kept.list.individuals)`,
the list being known, have the minimum, with "among the individuals the filters keep" after "20
individuals or more" and the ending "…, or loosen the filters of
individuals in the Variants step." So a Run that waited for the
statistics of each individual ends locked, with nothing sent, when the
thresholds leave fewer than two such populations, as the diversity's
does when they leave none.

### The request

`run(p, c)` narrows the populations to the individuals kept,
`populationsKept(p, c.individuals)`, splits them with
`populationsWithMinimum` of `project.md`, the function with which the
diversity chooses the populations of its private alleles, into those
that have the minimum of individuals, `withMinimum`, sent in the order
of the file, and those that do not, `under`, sent as `leftOut`, and
sends:

```ts
{
  analysis: "popDists",
  fileId: p.variants.fileId,
  filters: jobFilters(p.filters),
  individuals: c.individuals,   // null when the filters remove nobody
  pops,                         // the populations with the minimum, in the order of the file
  leftOut,                      // [population, its individuals kept][], in the order of the file
  minNumIndividuals: 20,
}
```

Its pass has the project's filters of the variants and the list of the
individuals kept, so its result fills the counts of the filters of the
Variants step, as the diversity's does (`docs/specs/analyses/filterCounts.md`,
"Which results fill it").

`leftOut` is not used by the runner, which copies it into the result.
The warning that names the populations left out is made from the result
and the project alone, and the project cannot say how many individuals
of each population the filters of individuals kept; so the result
carries those populations with their counts. Fewer than two
populations in `pops` is a defect of `run`, thrown, which `needs` and
`keptNeeds` keep from happening.

What the runner does with it (`docs/specs/worker/runner.md`, "The
distances between populations", which this spec asks for): it puts the
list of the individuals kept, then the filters, on the open `Variants`,
as for every job; checks that no two populations share a name, as for
the diversity; calls

```ts
calcPopDists(variants, Object.fromEntries(pops), {
  jackknifeGroup: null,
  measures: ["fst", "dest"],
  minNumIndividuals,
})
```

The fields of popnei's `PopDists` it reads are `pops`, the names in
popnei's order; `fst.distVector` and `dest.distVector`, one value a
pair; `numVars`, an `Int32Array` of the variants of each pair, never
negative, copied into a `Uint32Array`; and `passStats`. It puts the
pairs back in the order of the job. popnei gives its
populations in the order the keys of `pops` iterate in, which puts
names that are whole numbers first, in numeric order (runner.md, "The
diversity", step 4), and its pairs in that order, (0, 1), (0, 2), …,
(1, 2), …; the runner builds each array in the order of the job's
populations, the pair of the job's populations i < j at the place `i ×
k − i × (i + 1) / 2 + j − i − 1` for k populations, taking popnei's
value of the same two populations: with a and b the places of the two
names in popnei's `pops`, a < b, the value at that formula for a and b.
`numIndividuals` is the length of each population of the job. Then it makes the order of each
measure, as "The order of the heatmap" says, over the distances in the
order of the job, with `new Distances(vector, pops, passStats)` of
popnei, and answers:

```ts
{
  analysis: "popDists",
  pops: readonly string[],        // the job's populations, in its order
  numIndividuals: Uint32Array,    // the individuals of each popnei was given
  fst: Float64Array,              // Hudson's Fst of each pair, NaN for no value
  dest: Float64Array,             // Jost's D of each pair
  numVarsPerPair: Uint32Array,    // the variants each pair counted, popnei's numVars
  order: { fst: HeatmapOrder, dest: HeatmapOrder },
  leftOut,                        // the job's, as it came
  passStats: PassStats,
}
```

popnei refuses the call, with a plain `Error` the runner answers
`refused`, in the cases its `@throws` lists. The module rules out those
it can see: fewer than two populations, an empty one, one that names an
individual popnei does not have, a minimum that is not a whole number.
The ones it cannot see are those of every pass, the file with no
variant, the filters keeping none, a line of a VCF, a genotype of
another ploidy, a file not sorted under the LD filter; and the memory of
the tab, which without standard errors is a few numbers for each pair
and cannot run out before the pass does. Seen in node on 30 September
2026 with `js-v0.1.0-dev.3`: one population, "the distances between
populations are calculated for each pair of populations, and `pops`
names 1: name two populations at least"; the MAF filter at 0.3 and the
missing data filter at 0 on `panel.nei`, "the pass gave no variant: its
source gave 1200 and the steps kept none of them, …".

### The warnings

`warnings(r, p)` gives them in this order, each with its code, which the
tests assert, and its text. Populations and pairs are listed as the
diversity lists them: three or fewer by name, more as the first two and
how many more.

| code | when | the text |
|---|---|---|
| `tooFewIndividuals` | `r.leftOut` is not empty | "Population p3 has 12 individuals, fewer than the minimum of 20, so it is left out of the distances. To include it, lower the minimum of individuals, or merge it with another population in the metadata file." With two or three: "Populations p3 and p5 have fewer than 20 individuals, 12 and 8, so they are left out of the distances. To include them, lower the minimum of individuals, or merge each with another population in the metadata file." With more than three, "Populations p3, p5 and 4 more have fewer than 20 individuals, …", with no counts. When the filters of individuals removed some of the individuals of one of them, as the diversity finds it, the last sentence ends "…in the metadata file, or loosen the filters of individuals in the Variants step." |
| `individualsWithoutPopulation` | as the diversity's | the diversity's words, "…and are left out of the distances. …" |
| `populationNotInResult` | a population of `populationsToRun(p)` is in neither `r.pops` nor `r.leftOut`: the filters of individuals left it none | the diversity's words, "…so it is not in the distances." |
| `pairWithoutDistance` | a pair counted 0 variants | "p0 and p3 have no variant at which both have 20 individuals with a called genotype, so the pair has no distance." With two or three pairs, "The pairs p0 and p3, and p1 and p3, have no variant …, so they have no distance."; with more, "The pairs p0 and p3, p1 and p3 and 4 more have …". |
| `pairsOnFewerVariants` | a pair counted more than 0 and fewer than `passStats.numVars` | "3 of the 6 pairs are over fewer than the 1,152 variants kept, down to 641 (56%) for p0 and p3: at the others, one of the two populations has fewer than 20 individuals with a called genotype." With one pair, "The pair p0 and p3 is over 641 of the 1,152 variants kept (56%): at the others, …". The share is written as the diversity writes it, never 100% below all nor 0% above none. |
| `negativeDistance` | a pair has a negative value of either measure | "p0a and p0b have a negative Hudson's Fst, −0.0113, and Jost's D, −0.0060: the variants cannot tell the two apart. The heatmap orders them as if the distance were 0, and shows the value." With more pairs, "3 pairs have a negative Hudson's Fst or Jost's D, …: the variants cannot tell their two populations apart. …", naming the pairs as above. The measure that is not negative is left out of the words. |
| `jostHaploid` | the ploidy of the load is 1 | "Jost's D has no value for panel.nei, whose genotypes have one allele each: it compares two heterozygosities, and a haploid individual has none. Hudson's Fst has its values." |

`individualsWithoutPopulation` and `populationNotInResult` are made by
`populationWarnings` of `src/core/analyses/words.ts`, which the
diversity and the LD decay call too (`diversity.md`, "The warnings"),
with the words "the distances" and "the distances", and given the
populations of `r.pops` and of `r.leftOut`, so that a population left
out for its size is not named as emptied by the filters. The numbers of
`pairsOnFewerVariants` and `pairWithoutDistance` above
are an example of the form; the tests make them with a fake result.
The words of `negativeDistance` are the fixture's below, "How it is
verified". popnei gives Jost's D as NaN for every pair at ploidy 1 and
Fst as at any other ploidy (the doc comment of `PopDists.dest`); the
warning is raised from the load, which knows the ploidy, and not from
the NaN, which a pair with no variant gives too.

### The check numbers

`checkNumbers(r)` gives `passStats.numVars`, then, for each pair in the
order of the result, its Fst and its D, `null` for a NaN: 1 + k × (k −
1) numbers for k populations, 7 for the three of `panel.nei`. They are
popnei's numbers as it gave them. The order of the heatmap is not among
them, since it follows from them, and neither are the counts of variants
of the pairs, which a file with other variants changes along with the
distances. `numCheckNumbers(p)` gives 1 + k × (k − 1), with k the
populations of `populationsKept(p, byLists)` that have the minimum of
individuals, or `null` in the cases the diversity gives `null`, and when
k is below 2, since the analysis is then locked.

### Its lines of the Python script

After the lines of `src/core/script.ts` of stage 6, which open the
variants file into `variants` with its filters and read the metadata
file into `individuals`, as for the diversity. For the project of the
flow, `panel.nei` and the column `popcat` of `panel_pops.csv`:

```python
# The distances between populations, from the column "popcat"
pops = {}
for individual, pop in zip(individuals.iloc[:, 0], individuals["popcat"]):
    if not pandas.isna(pop):
        pops.setdefault(pop, []).append(individual)
kept = set(variants.individuals)
pops = {pop: [i for i in names if i in kept] for pop, names in pops.items()}
pops = {pop: names for pop, names in pops.items() if len(names) >= 20}
dists = popnei.calc_pop_dists(
    variants, pops, jackknife_group=None, measures=["fst", "dest"],
    min_num_individuals=20,
)
pairs = [(a, b) for i, a in enumerate(dists.pops) for b in dists.pops[i + 1:]]
print(pandas.DataFrame({
    "population_1": [a for a, b in pairs],
    "population_2": [b for a, b in pairs],
    "fst_hudson": dists.fst.dist_vector,
    "jost_d": dists.dest.dist_vector,
    "num_variants": dists.num_vars,
}).to_string(index=False))
# The order of the heatmap: the first axis of the principal coordinates of
# each matrix, a negative distance taken as 0 and Lingoes' correction applied.
# With a pair of no distance, or every distance 0, do_pcoa raises: the heatmap
# then keeps the order of the metadata file.
for name, measure in [("fst_hudson", dists.fst), ("jost_d", dists.dest)]:
    corrected = popnei.correct_dists_by_lingoes(popnei.Distances(
        dist_vector=measure.dist_vector.clip(min=0), names=measure.names,
    ))
    first = popnei.do_pcoa(corrected.dists).projections.iloc[:, 0]
    print(name, first.sort_values(kind="stable").index.tolist())
```

The line `len(names) >= 20` leaves out the populations under the
minimum and those left empty, as `run` does. `script` is given the project and not the result, so it writes the
loop whatever the order of the result was; with a pair of no value, or
every distance 0, `do_pcoa` raises in Python where the application kept
the order of the file, and the comment above the loop says so. With two populations the
loop prints an order of two, which the heatmap does not follow. These
lines, run with popnei's Python package at its commit `eae29a2` on 30
September 2026, printed the numbers and the order of "How it is
verified", for `popcat` and for the fixture `panel_split.csv`. The one
population never reaches `script`, since it locks the analysis.

### The TypeScript interface

The request and the result are members of `Job` and `JobResult` of
`src/worker/protocol.ts`:

```ts
/** Why the heatmap keeps the order of the metadata file. */
export type FileOrderReason = "twoPopulations" | "noDistance" | "allZero" | "notPlaced";

/** The order of the heatmap of one measure. */
export type HeatmapOrder =
  | { readonly kind: "pcoa"; readonly order: Uint32Array } // indexes of pops, top to bottom
  | { readonly kind: "file"; readonly reason: Exclude<FileOrderReason, "notPlaced"> }
  | { readonly kind: "file"; readonly reason: "notPlaced"; readonly message: string };

/** A population left out for having fewer individuals than the minimum. */
export type LeftOut = readonly (readonly [pop: string, numIndividuals: number])[];

export interface PopDistsJob {
  readonly analysis: "popDists";
  readonly fileId: string;
  readonly filters: readonly VariantFilter[];
  readonly individuals: readonly string[] | null;
  readonly pops: Pops;
  readonly leftOut: LeftOut;
  readonly minNumIndividuals: number;
}

export interface PopDistsResult {
  readonly analysis: "popDists";
  readonly pops: readonly string[];
  readonly numIndividuals: Uint32Array;
  readonly fst: Float64Array;          // k × (k − 1) / 2, pairs (0, 1), (0, 2), …, (1, 2), …
  readonly dest: Float64Array;
  readonly numVarsPerPair: Uint32Array;
  readonly order: { readonly fst: HeatmapOrder; readonly dest: HeatmapOrder };
  readonly leftOut: LeftOut;
  readonly passStats: PassStats;
}
```

The module exports its definition and what the panel reads:

```ts
export const popDists: AnalysisDef<Job, JobResult>;
// id "popDists"; app ["popgen"]; keyVersion 1;
// filtersRead { variants: true, individuals: true }; defaults POP_DISTS_DEFAULTS

export interface PopDistsOptions {
  readonly minNumIndividuals: number;  // a whole number from 1 to 4,294,967,295
  readonly measure: "fst" | "dest";    // what the heatmap draws
}
export const POP_DISTS_DEFAULTS: { readonly minNumIndividuals: 20; readonly measure: "fst" };

/** The options of the project for popDists, or the defaults. */
export function popDistsOptions(p: Project): PopDistsOptions;

/** One row of the table, a number null where popnei gave NaN. */
export interface PopDistsRow {
  readonly first: string;
  readonly second: string;
  readonly fst: number | null;
  readonly dest: number | null;
  readonly numVars: number;
}
/** The rows, one per pair in the order of the result; the same array for the same result. */
export function popDistsRows(r: PopDistsResult): readonly PopDistsRow[];

/** The table as the text of a CSV file (the panel, "What it shows"). */
export function popDistsCsv(r: PopDistsResult): string;

/** The data of the heatmap of `measure`: the populations in its order,
    and the square matrix in that order, NaN on the diagonal. */
export function popDistsHeatmap(r: PopDistsResult, measure: "fst" | "dest"):
  { readonly names: readonly string[]; readonly values: Float64Array };

/** The line under the heatmap that says how it is ordered (the panel, "Its words"). */
export function orderText(r: PopDistsResult, measure: "fst" | "dest"): string;

/** The description of the heatmap for a screen reader (the panel, "Accessibility"). */
export function popDistsDescription(r: PopDistsResult, measure: "fst" | "dest", fileName: string): string;

/** The words of a refusal of popnei, for the error state of the panel. */
export function refusalText(message: string, p: Project): string;
```

`popDistsRows` and `popDistsHeatmap` keep their answer by the result in
a `WeakMap`, as `diversityRows` does. `parseOptions(o, 1)` gives back an
object with exactly the two fields, `minNumIndividuals` a whole number
from 1 to 4,294,967,295, the largest popnei takes, and `measure` `"fst"`
or `"dest"`; anything else is refused with the words that follow
"should be" in `projectErrorText`: "the minimum of individuals, a whole
number from 1 to 4,294,967,295, and the distance the heatmap draws,
"fst" or "dest", and nothing else". A minimum of 0 is not taken, though
popnei takes it: a variant would then count for a pair in which a
population has no genotype called there, and on `panel.nei` 0 and 1 gave
the same distances (node, 30 September 2026).

### The cases

- **One population, with or without a metadata file.** Locked, with the
  words of `needs`. The panel is in the Analyses step with the others,
  and tells the user how to get two populations.
- **A population under the minimum.** Left out, named before the Run and
  in `tooFewIndividuals` after it. Lowering the minimum brings it in,
  under a new key.
- **Every population but one under the minimum.** Locked by
  `minimumNeeds`, or, known only after the thresholds, by `keptNeeds`.
- **Two populations.** One pair; the heatmap is a grid of two, in the
  order of the file, and has no line of order.
- **A pair with no variant in common.** Its row says "no value"; the
  heatmap keeps the order of the file and says why; `pairWithoutDistance`.
- **A negative distance.** Shown as popnei gave it, in the table, the
  tooltip and the cell; taken as 0 for the order; `negativeDistance`.
- **Jost's D at ploidy 1.** Every D has no value; the heatmap of D is
  a grid of cells marked as having no value, in the order of the file;
  `jostHaploid`; the heatmap of Fst is ordered as usual.
- **The measure changed while the analysis runs, or after it.** Nothing
  is calculated: the heatmap of the other measure is drawn from the same
  result. An undo gives back the measure, and the heatmap follows.
- **The minimum changed while the analysis runs.** The key changes, and
  the running calculation is for the old key, as for any option
  (`docs/specs/core/store.md`, "The cases").
- **Populations named by whole numbers**, 3, 1, 2 in the file. Shown in
  the order of the file in the table, and in the order of the file where
  the heatmap keeps it; the runner undoes popnei's order.
- **The filters keep no variant.** popnei refuses the call; the error
  state says "The filters kept none of the variants of panel.nei, so
  there is no variant to calculate the distances between populations
  over. Loosen the filters in the Variants step.", the diversity's row
  for the distances.

### How it runs

One pass over the file, `numPassesOf("calcPopDists")` 1 in popnei's
`passes.ts`, reading the `File` by ranges, with the progress of the
pass. Without standard errors popnei keeps a few sums for each pair,
so the memory does not grow with the variants, and the PCoA of the
order is of a matrix of k × k numbers. The time grows with the variants
and with the pairs, k × (k − 1) / 2; it is not measured, and the plan of
stage 5 measures it where its code first runs, on `panel.nei` and on the
`.nei` file of 19,161,178 bytes of `docs/architecture.md` section 13,
with three populations and with twenty. The result is 20 bytes a pair,
two distances and a count, and the orders, a few kilobytes for twenty
populations.

### How it is verified

With Vitest, at the functions of the definition, as for the diversity:

- **A worked example.** The diversity's table of `name`, `pop`, `other`,
  with `i1` to `i4` in the variants file and `pop` giving A to i1 and
  i3, B to i2 and C to i5, and the minimum set to 1: `run` sends `pops`
  `[["A", ["i1", "i3"]], ["B", ["i2"]]]` and `leftOut` `[]`; with the
  minimum at 2, `needs` gives "Only A has 2 individuals or more, …".
  A fake result of A and B with an Fst of −0.01 and a D of 0.02 gives
  `negativeDistance` naming Fst alone; `checkNumbers` gives `[numVars,
  −0.01, 0.02]`; `numCheckNumbers` 3.
- **The locks**, a case for each row of `needs`, `keptNeeds` with a
  list that leaves one population with the minimum, and the key, a pair
  of projects for each row of its table.
- **The warnings**, each with a fake result: the texts of the table for
  one, two and four populations or pairs; `pairsOnFewerVariants` with
  1,151 of 1,152 as "99%"; `jostHaploid` for a load of ploidy 1.
- **`popDistsHeatmap`** of a fake result of p0, p2, p1 whose order of
  Fst is `[1, 0, 2]` and of D `[2, 1, 0]` gives, for Fst, the names p2,
  p0, p1 and the matrix in that order, and, for D, p1, p2, p0, so that a
  heatmap that kept one measure's order for the other fails; with the
  order of the file, the names of the result.
- **`orderText`** of each row of its table, for each measure;
  **`popDistsDescription`** of the flow's result, of a result with a
  pair of no value and of one with none, the texts of "Accessibility";
  **`popDistsRows`** and **`popDistsCsv`** of the flow's result, the rows
  and the CSV of "What it shows" as literals, a population named `a,"b"`
  quoted; **`refusalText`** of popnei's message of an empty pass and of
  one population, as literals.
- **`numCheckNumbers`** 7 for the flow's project, and `null` with a
  threshold on the individuals, with no column of the populations, with
  the variants file pending, and with one population.
- **`parseOptions`**: the defaults back; a minimum of 0, 2.5 or
  4,294,967,296, a `measure` `"gst"`, a field missing or more, refused.
- **`script`** of the flow's project gives the lines above, as a literal.

The runner's test, in node with the popnei of the release, asserts
these numbers as literals, got on 30 September 2026 with
`js-v0.1.0-dev.3` by `dists.mjs` and `order.mjs`, scripts of this spec's
session that build `pops` from the CSV in the order of the file and
call `calcPopDists` as above and the steps of "The order of the
heatmap"; the runner's spec keeps the script:

| populations | pair | Hudson's Fst | Jost's D | variants |
|---|---|---|---|---|
| `popcat` of `panel_pops.csv`, the filter of missing data at 0.1, the default, which keeps the 1,200 variants | p0, p2 | 0.10273588423661377 | 0.06129813142463423 | 1,200 |
| | p0, p1 | 0.10496244498389443 | 0.06354346296076403 | 1,200 |
| | p2, p1 | 0.10962148955018115 | 0.06567052128821259 | 1,200 |
| the same, the filter at 0.05, 1,152 kept | p0, p2 | 0.10134216885691137 | 0.060374890860149355 | 1,152 |
| | p0, p1 | 0.10408519979159178 | 0.0629752676321236 | 1,152 |
| | p2, p1 | 0.109114009609083 | 0.06514219873397088 | 1,152 |

A second case of the runner's test gives the populations the names
"3", "1" and "2", in that order, for p0, p2 and p1: popnei gives them
back as "1", "2", "3", and the result must hold them as "3", "1", "2"
with the values above, pair by pair, and the order "1", "3", "2", so
that putting the pairs back in the order of the job is tested.

The order of both measures, with either filter, is p2, p0, p1: the
first components of Fst at 0.1 are −0.009930252327517626 for p0,
−0.04926443749316242 for p2 and 0.059194689820680046 for p1, with a
constant of Lingoes of 0. The check numbers at 0.1 are `[1200,
0.10273588423661377, 0.06129813142463423, 0.10496244498389443,
0.06354346296076403, 0.10962148955018115, 0.06567052128821259]`.

**The fixture with a negative distance**, `e2e/fixtures/panel_split.csv`,
which `e2e/fixtures/make_fixtures.mjs` makes: the individuals of
`panel_pops.csv` with the header `IID,popsplit`, those of p0 split by
their place among the individuals of p0 in the file, the first, third
and so on in p0a and the others in p0b, 24 each, the rest as in
`popcat`. With the filter at 0.1, popnei gives the populations p0a, p0b,
p2, p1:

| pair | Hudson's Fst | Jost's D |
|---|---|---|
| p0a, p0b | −0.011276258310056011 | −0.00601975597295832 |
| p0a, p2 | 0.09917164096189776 | 0.05929552377994644 |
| p0a, p1 | 0.10284678759499101 | 0.06246325844418998 |
| p0b, p2 | 0.10123140684986402 | 0.060586547891477244 |
| p0b, p1 | 0.1020068488376186 | 0.06181779954501048 |
| p2, p1 | 0.10962148955018115 | 0.06567052128821259 |

each over the 1,200 variants. With the negative pair taken as 0 the
matrices are not Euclidean, Lingoes' constant 3.8524749132147355e-6 for
Fst and 1.6931212674153084e-6 for D, and the order of both is p0b, p0a,
p2, p1. The Python lines above printed the same order. With the minimum
at 25, p0a and p0b are left out, and p2 and p1 keep their pair, Fst
0.10962148955018115, in the order of the file.

**In Playwright**, the flow of the Analyses step, in Chromium, Firefox
and WebKit: `panel.nei` and `panel_pops.csv`, the column `popcat`; Run;
the table reads p0 and p2 0.1027, 0.0613, 1,200; the heatmap's rows are
p2, p0, p1, read from the order of its names in the SVG; the measure set
to Jost's D redraws the heatmap with its title and its values, "0.0613"
in the cell of p2 and p0, and the panel never enters its running state;
an undo gives Fst back. Then `panel_split.csv`,
the column `popsplit`: the warning `negativeDistance` with −0.0113 and
the rows p0b, p0a, p2, p1; the minimum set to 25: the notice of the
result removed, the ready state naming p0a and p0b as left out, Run,
the heatmap of two in the order p2, p1 and no line of order. axe, the
checker of accessibility, runs in each state the flow reaches.

## The panel

The panel of the distances in the Analyses step, after the diversity,
drawn inside the frame every analysis shares,
`src/ui/analyses/AnalysisPanel.tsx`. Its heading, an `<h2>`, and its
title in the notice, the status region and the links of the step, is
"Distances between populations".

### What it shows

**Its options**, above the Run button, in every state:

| option | control | default |
|---|---|---|
| the minimum of individuals | a number field, "Individuals with a called genotype needed in each population, per variant", whole numbers from 1, the field of React Aria that the PCA's fields use | 20, popnei's default |
| `measure` | a group of two radio buttons, "Distance in the heatmap": "Hudson's Fst" and "Jost's D" | Hudson's Fst, `docs/functionality.md` section 7 |

The radio buttons are in that one place, with the minimum, in every
state, so that the keyboard and a screen reader meet one group; a
change of them redraws the heatmap below and calculates nothing.

**The heatmap**, `createHeatmap` of `docs/specs/charts/heatmap.md`, of
`popDistsHeatmap(r, measure)`: a square grid of the populations in the
order of the measure, each cell coloured by the distance of its pair,
with the value written in it when the cell is large enough. Its title is
"Hudson's Fst between populations" or "Jost's D between populations".
Under it, the line of its order, `orderText`. More than
`MAX_HEATMAP_NAMES` populations, 200, are not drawn, as the owner
decided on 30 September 2026 (below, "Open points").

**The table**, one row per pair, in the order of the result, which is
the order of the file, with the caption "Distances between the
populations of panel.nei, over the 1,200 variants the filters kept.":

| column | from |
|---|---|
| Pair, "p0 and p2", the header cell of its row | `pops` |
| Hudson's Fst | `fst` |
| Jost's D | `dest` |
| Variants, the number the pair was calculated over | `numVarsPerPair` |

The numbers are written to four decimals, with the minus sign, U+2212,
for a negative one, "−0.0113", and "no value" for a NaN, as the
diversity writes them; the variants are a whole number with a comma
between thousands.

**The download**, "Download the table as CSV", `panel.popdists.csv`,
named as the diversity names its file, with the text of `popDistsCsv`:
a header row, one row per pair, the numbers as `String` writes them and
an empty cell for no value, quoted as RFC 4180 has it. For the flow:

```
population_1,population_2,fst_hudson,jost_d,num_variants
p0,p2,0.10273588423661377,0.06129813142463423,1200
p0,p1,0.10496244498389443,0.06354346296076403,1200
p2,p1,0.10962148955018115,0.06567052128821259,1200
```

Beside it, the line of the versions, as the diversity's.

### The states

| state | what the user sees | what they can do |
|---|---|---|
| empty | cannot happen: until the variants file is read the analysis is locked with a reason | |
| locked | the reason, beside a disabled Run button that it describes, as the diversity's; the field of the minimum stays enabled, since lowering it can unlock | go where the reason says; change the minimum |
| ready | Run, the options, and the populations it will run on with their sizes, as the diversity's ready state, from `populationsBeforeRun`; the populations under the minimum named after them by `underMinimumText` of `project.md`, as the diversity names its own, "p3 has 12 individuals, fewer than the minimum of 20, and is left out.", or together, "p3 and p5 have fewer individuals than the minimum of 20, 12 and 8, and are left out." | Run; change the options |
| running | the diversity's bar and clock, "Calculating · 35% · 0:12", the bar labelled "Calculating the distances between populations", and its words while it waits for the statistics of each individual | Stop |
| done | the warnings above, each as a sentence, with their count; the heatmap, its line of order and its radio buttons; the table and its download; the comparison of an opened project file under the table | change the measure; download |
| results removed | the diversity's words, with `resultName` "the heatmap and the table": "The distances between populations were removed because the filter of the variants by missing data changed. Undo brings back the heatmap and the table as they were, with no calculation; Run calculates new ones for the new settings." | Run; Undo or Redo |
| error | what happened and what to do, below | as the diversity's |

### What it sends and reads

What the diversity's panel reads, and the options of `popDists` in the
project. The field of the minimum and the radio buttons are each
`store.apply(description, (p) => setAnalysisOptions(p, popDists, {
...popDistsOptions(p), ‹the option› }))`, as the options of the
diversity and the LD decay are, with the descriptions "the minimum
number of individuals of the distances changed" and "the distance the
heatmap draws changed"; the first removes the result, whose notice
reads "The distances between populations were removed because the
minimum number of individuals of the distances changed. …", and the
second removes nothing, since the measure is in no key; a minimum typed
is sent as the PCA's fields send theirs, when the field is left or Enter
is pressed. It holds no state of the project; the heatmap is mounted as
`.claude/skills/coding/react.md` says a plot is mounted, with `update`
at each new result or measure.

### Its words

The locked reasons and the warnings are those of the module. The line of
order, `orderText`:

| the order | the line |
|---|---|
| `pcoa` | "Ordered so that similar populations are together: by the first axis of a principal coordinate analysis of these distances." |
| `twoPopulations` | none |
| `noDistance`, one pair or a few | "In the order of the metadata file: the order by similarity needs a distance for every pair, and p0 and p3 have none." |
| `noDistance`, no pair | "In the order of the metadata file: no pair has a value of Jost's D.", or of Hudson's Fst, by the measure drawn |
| `allZero` | "In the order of the metadata file: every distance is 0 or below, so no population is closer to one than to another." |
| `notPlaced` | "In the order of the metadata file: popnei could not order these distances." popnei's message, which names its arguments and calls the populations individuals, is not shown; the tests of the runner assert it. |

The error state: the rows of the diversity's table ("Its words" of
`diversity.md`), with "the distances between populations" in the place
of "the diversity", `ldOrderText` for the LD pruning of the Variants
step, and `refusalText` of this module for popnei's refusals; the row
of a request with no population cannot happen, since `needs` and
`keptNeeds` lock before, and one of fewer than two populations is a
defect of ours, told as the diversity tells a defect.

The help, for the help drawer of stage 8:

- What it gives: for each pair of populations, Hudson's Fst, the share
  of the diversity of the two taken together that lies between them, and
  Jost's D, the share of their allelic variety that they do not share,
  the one to read on multiallelic markers such as microsatellites,
  where Fst cannot reach 1; each over the variants at which both
  populations have the minimum of individuals with a called genotype,
  whose number the table gives.
- Its defaults: the minimum of 20 individuals, popnei's; a population
  with fewer is left out; lower the minimum to include small
  populations, at the cost of frequencies estimated from fewer
  genotypes.
- The heatmap: ordered by the first axis of a principal coordinate
  analysis of the distances, so that similar populations are together;
  a negative value is taken as 0 for the order. It keeps the order of
  the metadata file when a pair has no distance.
- When not to trust it: a small negative value is two populations the
  variants cannot tell apart, not an error; pairs over very different
  numbers of variants are not over the same markers; no standard error
  is given, so a small difference between two pairs may be noise.
- In Python: `popnei.calc_pop_dists(variants, pops,
  jackknife_group=None, measures=["fst", "dest"])`, and, for the
  standard errors this page does not give, `jackknife_group` set to a
  length in base pairs longer than the LD of the genome.

### Accessibility

- The heatmap is one image to a screen reader, with the description of
  `popDistsDescription`: "Heatmap of Hudson's Fst between 3 populations
  of panel.nei, ordered so that similar ones are together: p2, p0, p1.
  From 0.1027, between p0 and p2, to 0.1096, between p2 and p1."; with
  pairs of no value, "… 2 of the 6 pairs have no value."; with none,
  "Heatmap of Jost's D between 3 populations of panel.nei, in the order
  of the metadata file: p0, p2, p1. No pair has a value."; the smallest
  value may be negative, written with its minus sign. The
  table gives every value to a screen reader and to the keyboard; the
  cells are not stops of the Tab key (`docs/specs/charts/heatmap.md`).
- The table is the diversity's kind of table, a plain `<table>` in the
  frame of `src/ui/widgets/Table.tsx`, with the pair as the header cell
  of its row, so that a screen reader reads "p0 and p2, Hudson's Fst,
  0.1027".
- The radio buttons are React Aria's `RadioGroup`, one stop of the Tab
  key and the arrow keys between the two; a change of the measure is
  said by the status region of the shell, "Heatmap of Jost's D", since
  the heatmap changes without moving the focus (WCAG 2.2, success
  criterion 4.1.3).
- The colour of a cell is never the only way its value is told: the
  value is written in a cell large enough, shown in its tooltip, and in
  the table (1.4.1).
- The keyboard: the options, Run or Stop, the warnings, the radio
  buttons, the table, the download.

### Left for the running application

The layout of the heatmap beside or above the table, its size, the
place of the radio buttons, and how the ready state lists many
populations.

## What this spec asks of other documents

Made in those documents on 30 September 2026. The rule of the
populations under the minimum is one function of `project.ts`,
`populationsWithMinimum`, which the diversity calls too, with the words
of the ready state of both panels, `underMinimumText`; the reason of the
lists and the individuals kept leaving no population is
`populationListsNeeds` and `populationsKeptNeeds` of the same module; and
the two warnings of the populations are `populationWarnings` of
`src/core/analyses/words.ts` (`docs/specs/core/project.md`, "What the
analyses per population share from stage 5"; `diversity.md`, "The
warnings").

- `docs/specs/worker/protocol.md`: `PopDistsJob`, `PopDistsResult`,
  `HeatmapOrder`, `FileOrderReason` and `LeftOut` in the unions `Job`
  and `JobResult`, for the request and the result above.
- `docs/specs/worker/messages.md`: the checks of the two members, the
  arrays with `instanceof`, `order` of each measure one of its three
  forms, a `pcoa` order a permutation of the indexes of `pops`, and
  the version of the messages raised for a new member.
- `docs/specs/worker/runner.md`: a section "The distances between
  populations", with the call of "The request", the pairs put back in the
  order of the job, the six steps of "The order of the heatmap", the
  refusals of `calcPopDists` answered `refused` and those of
  `correctDistsByLingoes` and `doPcoa` kept as the order's reason
  `notPlaced` rather than a refusal of the job, since the distances are
  there; its test with the numbers of "How it is verified" and the
  scripts `dists.mjs` and `order.mjs`.
- `docs/specs/core/store.md`: `popDists` among the analyses with a
  `keptNeeds`, in the row locked of "The state of an analysis".
- `docs/specs/core/projectFile.md`: the options of `popDists` saved and
  read with `parseOptions`, its check numbers, 1 + k × (k − 1), and a
  fixture of a project with them.
- `docs/specs/entry.md`: `popDists` in `POPGEN_ANALYSES` of
  `src/core/apps.ts`, after the diversity, in the Analyses step of
  `POPGEN_ANALYSIS_STEPS`, and its title in `src/ui/analyses/titles.ts`
  (`docs/architecture.md`, section 4).
- `docs/specs/shell.md`: the title "Distances between populations" in
  the links of the Analyses step, the notice and the status region, and
  the announcement of a change of the measure.
- `docs/specs/analyses/diversity.md` and the specs of the diversity of
  stage 5: the rule that leaves out a population under the minimum,
  here and for the private alleles of decision 7, made once, a function
  of `project.ts` that splits the populations kept by the minimum, so
  that the ready states of the two panels list them alike.
- `docs/specs/charts/plot2d.md`: the axes of names the heatmap needs
  (`docs/specs/charts/heatmap.md`, "What this spec asks of other
  documents").
- `.claude/skills/coding/testing.md`: the fixture `panel_split.csv`,
  made by `make_fixtures.mjs`.
- `docs/functionality.md`, section 7: the minimum of individuals with its
  field and the populations under it left out; the table of the pairs
  with both measures and the number of variants of each; the order of
  the heatmap with Lingoes' correction, and a negative distance taken as
  0 for it.
- `docs/architecture.md`, section 4: the id of the example, `"fst"`,
  becomes `"popDists"`.
- `docs/specs/stage-5-open-points.md`: point 1 of "Opened by the specs"
  settled but for the negative distances; and the four points below,
  which the owner decided there as points 13 to 16.

## Open points

This spec has no open point. The four it asked were decided by the
owner on 30 September 2026, each as recommended, and are written above
as decided (`docs/specs/stage-5-open-points.md`, points 13 to 16):

1. **A negative distance is taken as 0 for the order of the heatmap**,
   "OK" (point 14 there). popnei gives a negative Fst or Jost's D for
   two populations the variants cannot tell apart, and its PCoA refuses
   a negative distance; on `panel.nei`, p0 split in two halves of 24
   gives an Fst of −0.0113 between them. The value is taken as 0 in the
   matrix given to the PCoA and in nothing else: the table, the tooltip
   and the cell show popnei's value, and the warning says the order
   treats it as 0. It is the application's arithmetic on popnei's
   numbers, one comparison with 0, for the order and never for a number
   shown; a negative estimate of a distance is an estimate of 0 that
   sampling pushed below it. The option not taken: the order of the
   metadata file whenever a distance is negative, with which a dataset
   with two close populations, the case where the order helps most,
   loses its order for every population.
2. **The colours of the heatmap start at 0**, "yes, at 0" (point 15
   there): from the darkest of viridis at a distance of 0 to the
   lightest at the largest distance of the matrix
   (`docs/specs/charts/heatmap.md`, "The colours"), so the colours say
   how far apart the pairs are. On `panel.nei` the three pairs, 0.1027
   to 0.1096, fall at steps 239, 245 and 255 of the 256 colours of
   viridis, which runs from dark purple to yellow: three yellows that
   look alike, which is true, since the three populations are about
   equally far apart; the values in the cells and the table show the
   differences. The option not taken: from the smallest distance of the
   matrix, with which a difference of 0.007 looks as large as one of 0.3
   would in another dataset, against the principle of
   `docs/functionality.md` section 2, nothing that misleads without
   warning.
3. **Above 200 populations, neither the heatmap nor the table is
   drawn** (point 16 there): the panel says "The heatmap and the table
   are shown for up to 200 populations, and this result has 250.
   Download the table as CSV to read it.", and the download is offered.
   The table has a row for each pair, so it grows as the square of the
   populations: 250 populations are 31,125 rows, and a column of 1,000
   names chosen as the populations would be 499,500, which the table of
   `src/ui/widgets/Table.tsx`, a row of HTML each, would take seconds to
   draw, not measured; the heatmap draws up to 200 populations, 19,900
   pairs. The owner's words: "whatever, more than 50 populations is
   already too much for this app"; the bound stays at 200, the most the
   heatmap draws. The options not taken: the analysis locked above 200
   populations, and the table drawn whatever its size.
4. **A population with fewer individuals than the minimum is left out
   of the request**, "leave it out" (point 13 there), named in the ready
   state before a Run and by `tooFewIndividuals` after it, with the
   minimum to lower; the table and the heatmap hold the populations that
   have values, and the heatmap keeps its order by similarity. It is the
   owner's rule for the private alleles, decision 7, applied to a new
   case. `calcPopDists` counts a variant for a pair only when both
   populations have its `minNumIndividuals` of called genotypes there
   (`PopDists.numVars` of `js/popnei/src/pop_dists.ts`;
   `min_num_individuals` in `crates/popnei/src/pop_dists.rs`), so a
   population of fewer individuals has no value in any pair, and leaving
   it out changes no other number. On `panel.nei`, with 10 individuals
   of p0 made a population of their own, p0s, and p0 left with 38 (node,
   `js-v0.1.0-dev.3`, 30 September 2026): the three pairs of p0s counted
   0 variants and gave NaN; p0 and p2 gave an Fst of
   0.10614095340778874, p0 and p1 0.1071478341274544 and p2 and p1
   0.10962148955018115, each over 1,200 variants, the same to the last
   digit as with p0s left out of the call. With the minimum at 10, p0s
   had values, its pairs over 875 variants, Fst 0.0456 with p0. The
   option not taken: sending it, with its pairs rows of "no value" in
   the table and crossed cells in the heatmap, and, since a pair with no
   value keeps the order of the metadata file (decision 2), the heatmap
   of every population without its order by similarity.

## Not in this spec

- The standard errors of the distances, and the other five measures of
  popnei: not shown, as the owner decided on 30 September 2026 and
  section 7 of `docs/functionality.md` names.
- A download of the square matrix of one measure, for another program:
  not in stage 5; the table's CSV gives every pair, and Python's
  `square_dists()` gives the matrix.
- The export of the heatmap as SVG and PNG, and the report: stage 6.
- A tree of the populations: left out, `docs/functionality.md`
  section 10.
- The heatmap as a plot: `docs/specs/charts/heatmap.md`.
