# The LD decay of each population

Written on 30 September 2026, for stage 5 of `docs/build-order.md`, the
analyses of the populations, and revised the same day when the specs of
stage 5 were made to agree: its locks and two warnings of the
populations made by the functions the diversity and the distances
between populations share. Its two open points were decided by the
owner on 30 September 2026, each as recommended, and are written below
as decided (points 12 and 19 of `docs/specs/stage-5-open-points.md`).
Approved by the owner on 30 September 2026, and revised on 1 October
2026 with what the owner decided after trying the panel, each point as
the plan's report recommended it (`docs/specs/stage-5-open-points.md`,
"Decided by the owner on 1 October 2026: the LD decay and the line
plot"; the points are named below as C1 to C9 and 5 to 24, their names
there).
This spec gives the analysis that shows, for each population, how the linkage
disequilibrium between two variants falls as the distance between them
grows, and the distance at which it has fallen to half: the module
`src/core/analyses/ldDecay.ts`, which says which variants it reads, when
it cannot run, what it asks of the calculation worker, what it warns
of, what it keeps in the project file and writes in the Python script;
and, after it, the panel of `src/ui/analyses/ldDecay/`, which shows the
plot and the tables. It develops section 6 of `docs/functionality.md`,
"LD decay", and fills the shape of an analysis of section 4 of
`docs/architecture.md`, the row `analyses/` of its section 9. It depends
on `docs/specs/core/keys.md`, `store.md`, `project.md` and
`individualsKept.md`, on `docs/specs/worker/protocol.md`, `runner.md`
and `client.md`, and on the plot written beside it,
`docs/specs/charts/line.md`. What it asks of those specs is at the end,
and they are not changed here.

The words of the documents used here, as `docs/specs/analyses/diversity.md`
defines them: the **key** of a result, a hash of everything it was
calculated from, under which the store shows it; the **load** of the
variants file; a **pass**, one reading of the variants from the start
of the file through the **steps** put on popnei's `Variants`, the list
of the individuals kept and the filters of the variants; the **check
numbers**, a few numbers of a result saved in the project file to
compare a later run with; the **calculation worker**, the second thread
of the tab where popnei runs, and **wasm**, popnei compiled to run
there, whose memory grows to the largest calculation it has made and is
not given back while the worker lives. The **LD pruning** is the filter
of the Variants step that removes a variant in linkage disequilibrium
with one already kept (`docs/specs/steps/variants.md`).

The words of the genetics, from popnei's `js/popnei/src/ld.ts`:

- **r²** of a pair of variants, the square of the correlation of their
  dosages over the individuals called at both (popnei's `docs/specs/ld.md`).
- A **pair** is counted in a population when both variants pass the
  largest major allele frequency of that population, are on one
  chromosome, and are from 1 to the **largest distance** apart, popnei's
  `maxDist`, in base pairs.
- The **bins**: the distances from 1 to the largest distance cut into 50
  of equal width; each bin of each population gives its number of
  pairs, the mean of their r² and its standard deviation.
- The **fitted curve**: the r² that the model of Hill and Weir (1988),
  with the correction of Weir and Hill (1986) for a sample of n
  individuals, expects at a distance, fitted by popnei to every pair of
  the population at its own distance, so the bins do not move it. It
  has one fitted number, **ρ per base pair**, `rhoPerBp`, 4Nr per base
  pair: four times the effective size times the recombination per base
  pair, which the table of the panel names "4Nr per base pair"; its value at a
  distance of 0, `r2AtZero`, depends on n alone.
- The **half distance**, `halfDist`, the distance at which the fitted
  curve is half its value at 0. It is read off the curve, so it can lie
  beyond every pair counted.

The owner's decisions of 30 September 2026 that this spec takes, 8, 9
and 10 of `docs/specs/stage-5-open-points.md`, are named where they
apply, and so are its own two, points 12 and 19 there, the restart of
the worker after every LD decay and popnei asked to refuse a file not
sorted by position, decided by the owner the same day (below, "Open
points").

## The module

### What it does

For each population it gives the bins, the fitted curve and the half
distance, from popnei's `calcLdAndDistPerPop` of `js/popnei/src/ld.ts`,
in one pass that serves every population. The application draws the
curve from popnei's ρ per base pair (below, "The fitted curve"), and
computes no other number of genetics.

What a user would see go wrong because of this module, and what the
rules below prevent: a curve made from the variants the LD pruning left,
which would show almost no LD, since the pruning removes the pairs in LD
the decay measures; a half distance read as a measurement when it lies
beyond every pair, or below the closest one; a population of a handful
of individuals whose curve is compared with the others' as if it were
as good; a tab that runs out of memory because of a distance typed;
a plot of other settings shown as current.

### Which variants it reads

Every filter of the Variants step but the LD pruning, as the owner
decided on 30 September 2026 (decision 8): the missing data, the
observed heterozygosity and the MAF filters as the step has them, and
the filters of individuals, whose list comes first, as for every
analysis (`docs/architecture.md`, section 2). The option not taken was
every filter. On `ld.nei`, the fixture below, with the missing data
filter at 0.1 and two populations of 50, the LD decay counts 29,367
pairs in `pop_a` and gives a half distance of 7,548 bp; with the LD
pruning at r² 0.1 within 50,000 bp as well, the pass keeps 35 of the 500
variants and `pop_a` 174 pairs, with a half distance of 1,474 bp (node,
`js-v0.1.0-dev.3`, 30 September 2026).

It has no filter of its own, unlike the PCA, whose own filters replace
the dataset's (`docs/specs/analyses/pca.md`, "Which variants it reads").
`ldDecayFilters(filters)` is the project's filters of the variants that
are on, in their order, without the one of kind `ld`, whatever its
distance. So the LD pruning of the Variants step with no distance typed,
which locks every analysis that reads it, does not lock the LD decay.

Beside the filters of the dataset, popnei leaves out of each population
the variants whose major allele frequency among its individuals is above
the option `maxAllowedMaf`, 0.95 by default, popnei's own default: the
r² of a variant that hardly varies rests on the one or two individuals
that carry its rare allele, and raises the curve everywhere (the doc
comment of `maxAllowedMaf`). It is counted over the individuals of each
population, so two populations count different variants, which
`numVarsPerPop` gives. The MAF filter of the Variants step counts over
every individual kept, and removes the variant for every analysis.

`countsOf` of `src/core/apps.ts` gives `null` counts of the filters for
the LD decay, as for the PCA, since its filters are not the project's
whenever the LD pruning is on, and the one number it takes is the
variants of the file (`docs/specs/analyses/filterCounts.md`, "Which
results fill it").

### The populations

Those of the project, as for the diversity, by the functions of
`docs/specs/core/project.md`, "The populations": the column the user
chose, or, without a metadata file or with the grouping `onePopulation`,
"All individuals". `run` sends `populationsKept(p, c.individuals).pops`,
each narrowed to the individuals kept and none empty, in the order of
the file. The individuals with no population and the populations the
filters empty are told as the diversity tells them (below, "The
warnings").

### Its options

`LdDecayOptions`, as the project holds them:

| option | what it is | default | from |
|---|---|---|---|
| `maxDist` | the largest distance between the two variants of a pair, in base pairs; `null` until the user types one | `null` | decision 10 of the owner, 30 September 2026 |
| `maxAllowedMaf` | the largest major allele frequency a variant has in a population and is still counted there | 0.95 | popnei's default of `calcLdAndDistPerPop` |

**The largest distance has no default.** How far LD extends depends on
the genome of the species, so the user types it, and the analysis is
locked until then, as the LD pruning is (decision 10, by the owner's
rule of no default that depends on the genome; `docs/functionality.md`,
section 6). The option not taken was popnei's default of 1,000,000 bp.
It is at least 50, the number of bins, so that each bin spans a base
pair at least: at a largest distance of 10, popnei gave bins whose
largest distance is below their smallest, "2 to 1" (node,
`js-v0.1.0-dev.3`, 30 September 2026).

The smallest distance is popnei's default, 1, which leaves out only the
pairs of two variants at one position, and the bins are popnei's
default, 50, `LD_DECAY_NUM_BINS`; neither is an option. The bins do not
move the curve or the half distance, which are fitted to every pair, so
a user who wants other bins gains nothing they read off the curve; a
constant changed in a later release raises the key version. Whether
`maxAllowedMaf` is an option is the writers' decision of 30 September
2026, for the owner to overrule: it changes which variants each
population counts, and the plot moves with it, where the bins do not.

`ldDecayOptions(p)` gives the options of the project for `ldDecay`, or
`LD_DECAY_DEFAULTS`. `parseOptions(o, 1)` gives back an object of
exactly the two fields, `maxDist` a whole number from 50 to
9,007,199,254,740,991, the largest popnei takes, or `null`, and
`maxAllowedMaf` a number from 0.5 to 1; anything else is refused with the
words that follow "should be" in `projectErrorText`: "the largest
distance of a pair, a whole number of base pairs from 50 to
9,007,199,254,740,991 or null, and the largest major allele frequency
in each population, a number from 0.5 to 1, and nothing else". Below
0.5 no variant of two alleles passes, since its major allele frequency
is at least 0.5: at 0, `ld.nei` gave 0 variants to both populations
(node, 30 September 2026), and a user who typed a minor allele
frequency, 0.05, would get no pair anywhere.

### What goes into its key

`filtersRead` is `{ variants: false, individuals: true }`: the filters
of individuals go into the key through `keyOf`, and the filters of the
variants through `keyInputs`, as `ldDecayFilters` gives them, so that a
change of the LD pruning, which the LD decay does not read, keeps its
key and its plot. It is the PCA's arrangement, and for the same reason
the store does not ask `variantFilterNeeds` of the LD decay
(`docs/specs/core/store.md`, "The definition of an analysis").

`keyInputs(p)` gives:

```ts
{
  pops: populationsOf(p),                   // the column's pairs, "all" or null
  filters: ldDecayFilters(p.filters),       // the project's but the LD pruning
  options: { maxDist: number | null, maxAllowedMaf: number },
}
```

The key version is 1. The smallest distance and the number of bins are
constants the job carries, and a release that changes one raises it.

| change to the project | the key |
|---|---|
| a new load of the variants file; the ploidy or `onlyPassed` of a VCF | changes |
| the missing data, observed heterozygosity or MAF filter of the Variants step, turned on or off, or its threshold | changes |
| the LD pruning of the Variants step, turned on or off, its r² or its distance | same |
| a filter of individuals, a list or a threshold | changes |
| the populations: another grouping, a cell of the column, the rows in another order, the metadata file removed | as for the diversity (`diversity.md`, "What goes into its key") |
| `maxDist` or `maxAllowedMaf` | changes |
| the options of another analysis, the reference | same |
| the key version, the version of popnei | changes |

### Why it cannot run

The store asks `projectNeeds` and `individualListNeeds` of
`docs/specs/core/project.md` first, and not `variantFilterNeeds`, since
`filtersRead.variants` is false. Then `needs(p)` gives the first of
these:

| the project | the reason |
|---|---|
| any reason of `individualsNeeds`, and the three of `populationsNeeds`, and the lists of individuals leaving no individual with a population, `populationListsNeeds` | the diversity's words, the same functions of `project.md` ("What the analyses per population share from stage 5"; `diversity.md`, "Why it cannot run") |
| `maxDist` `null` | "Type the largest distance, above." |
| 40 × `maxDist` × the populations of `populationsKept(p, byLists)` above 1,000,000,000 bytes, `LD_DECAY_MAX_BYTES` | "With 3 populations, the largest distance can be at most 8,333,333 base pairs: the pairs are counted at every distance up to it, in up to 40 bytes for each base pair and population, and more than 1 GB of such counts may not fit in the memory of a browser tab. Type a smaller distance, or calculate it with popnei in Python, outside the browser." With one population, "The largest distance can be at most 25,000,000 base pairs: …" |

`maxDistReason(p)` gives what stands beside the field of the distance
whenever one of these two rows holds, and not only when it is the first
reason, as the PCA's reason of its own LD pruning is. For a distance
above what the memory allows it is the reason of the table. For a
distance not typed it is why the field has to be filled, which the
reason under Run does not repeat: "The LD decay needs the largest
distance between the two variants of a pair. It has no default, because
it depends on how far linkage disequilibrium extends in the genome of
your species. Type a distance in base pairs." The owner decided on 1
October 2026 that these words stand beside the field alone (C8); until
then they were also the reason under Run, 14 lines of red text on a
screen of 320 pixels before the user had done anything.

**The lock of the memory.** popnei keeps, for each population, a count
of pairs and a sum of their r² at every distance from 1 to `maxDist`,
16 bytes each, asked for before the pass (`crates/popnei/src/ld/dist.rs`
of popnei, and "How it runs" of its `docs/specs/ld.md`); when the pass
has ended it copies the distances that hold a pair into three arrays of
24 bytes a distance, while the 16 bytes of every distance are still
held (`the_distances_that_hold_a_pair_are_kept` of `dist.rs`), so at
most 40 bytes a base pair and population, when every distance holds a
pair, as it can with positions that are not evenly spaced. Measured in
node, the memory of wasm grew by 16.0 MB for one population at
1,000,000 bp, 48.0 MB for three, and 480 MB for three at 10,000,000 bp,
each plus about 12 MB (below, "How it runs"); popnei refused
250,000,000 bp for one population, 4 GB of counts, with "this machine
has not the memory for the pairs counted at every distance, 250000000
values of 16 bytes". So the count is known from the options before the
Run, and the module locks rather than let the user wait for a refusal
or lose the tab. The bound of 1 GB of those 40 bytes, 25,000,000 base
pairs for one population, is the writers' decision of 30 September
2026, for the owner to overrule: a pass of
1,000 individuals held up to 1.09 GB more beside the counts, and a PCA
that grew the engines by 3.03 to 3.40 GB did not close the tab in
Chromium 153 or WebKit 26.6 (`docs/architecture.md`, section 11); the
plan measures an LD decay at the bound in both, over a file whose
positions are not evenly spaced, so that most distances hold a pair.
The lock bounds the counts alone, and not the variants held within the
largest distance, which grow with the individuals, the density of the
variants and the distance, about 48 bytes for each individual and
variant held by the table of "How it runs": a file of 1,000 individuals
with a variant every 100 bp, at the 8,333,333 bp the lock allows three
populations, would hold about 3 to 4 GB, an extrapolation not measured,
found by the review of the architecture on 30 September 2026. The plan
measured such a file (below, "In the browsers"): at the 8,333,333 bp
the lock allows three populations popnei refused for memory after 19 to
25 minutes, and no tab closed. The owner decided on 1 October 2026 to
keep the lock as it is, and to say in the running state that such a run
may take tens of minutes and end in a refusal (point 19; below, "The
states"). The option not taken was a lock on the individuals times the
variants within the distance as well, which needs the density of the
file before the Run. The populations are
counted on the lists of individuals alone, `byLists` of
`docs/specs/core/individualsKept.md`, which a threshold on the
individuals can only lower, so the lock is known without the statistics
of each individual; a threshold that empties a population leaves the
bound as it was: the lock may then ask for a smaller distance than the
populations that remain need, and never lets through one they cannot
hold.

`keptNeeds(p, kept)` is `populationsKeptNeeds(p, kept)` of `project.md`,
the diversity's reason: the individuals kept leaving no population, in
its words (`diversity.md`, "Why it cannot run").

### The request

`run(p, c)` sends, through the client the store bound to its key:

```ts
{
  analysis: "ldDecay",
  fileId: p.variants.fileId,
  filters: jobFilters(ldDecayFilters(p.filters)),
  individuals: c.individuals,          // the individuals kept; null when the filters remove nobody
  pops,                                // populationsKept(p, c.individuals).pops
  minDist: 1,                          // LD_DECAY_MIN_DIST
  maxDist: 100000,                     // ldDecayOptions(p).maxDist, never null here
  numBins: 50,                         // LD_DECAY_NUM_BINS
  maxAllowedMaf: 0.95,
}
```

What the runner does with it, for `docs/specs/worker/runner.md` to take
(below, "What this spec asks of other documents"): the list and the
filters on the `Variants`, as for any job; then
`calcLdAndDistPerPop(variants, { pops, minDist, maxDist, numBins,
maxAllowedMaf })`, the options object written with these keys alone,
since the release refuses a key it does not know, and its `pops` naming
the populations `p0`, `p1`, … by their place in the job, names of the
runner's own, so that no name of the user's file is a field of an
object (below, "The cases"); the populations put back in the order of
the job, each under the name the job gave it; and
the result below, whose fields are popnei's: `numVars` from
`numVarsPerPop`; `smallestDist` and `largestDist` from the `perPop` of
the first population; `numPairs`, `meanR2` and `sdR2` from the `perPop`
of each, one after another; `rhoPerBp`, `r2AtZero` and `halfDist` from
its `decayPerPop`; and `numIndividuals`, the lengths of the populations
of the job, which is the n popnei takes. It checks that popnei gave
every population of the job, and that the smallest and largest distance of the bins are the
same for every population, which they are by popnei's rule; a
difference is a defect of ours, thrown.

```ts
{
  analysis: "ldDecay",
  pops: ["pop_a", "pop_b"],            // in the order of the job
  numIndividuals: Uint32Array,         // of each population, as sent: the n of its curve
  numVars: Float64Array,               // numVarsPerPop: the variants each counted at its MAF
  smallestDist: Float64Array,          // numBins, the bins of every population
  largestDist: Float64Array,
  numPairs: Float64Array,              // pops × numBins, the bins of one population together
  meanR2: Float64Array,                // NaN for a bin with no pair
  sdR2: Float64Array,
  rhoPerBp: Float64Array,              // one per population; NaN when no curve was fitted
  r2AtZero: Float64Array,
  halfDist: Float64Array,              // NaN when no curve, or below 3 individuals
  passStats: PassStats,
}
```

popnei refuses, with its messages as the release gives them (node, 30
September 2026): a pass with no variant, "the pass gave no variant: its
source gave 500 and the steps kept none of them, …", or of a source
that holds none; the memory of the counts or of the variants within
`maxDist`, "this machine has not the memory for …"; a line of a VCF it
cannot read; and arguments out of range, which the module never sends.
A population of individuals popnei does not have, and an empty one, are
ruled out by `populationsKept`.

**A variants file not sorted is not refused.** popnei's
`calcLdAndDistPerPop` compares each variant with the variants held
within `maxDist` of the newest variant read, and drops a block of
variants when none of it is in reach, so it counts every pair only when
the variants of each chromosome are together and in the order of their
positions. Out of that order it does not refuse, as the LD pruning does,
and counts fewer pairs without a word. On a file made for it, 1,000
individuals and 20,000 variants every 1,000 bp on one chromosome, read
in blocks of 5,000, the blocks put in the order of the positions 0 to 5
Mb, 10 to 15 Mb, 5 to 10 Mb, 15 to 20 Mb, gave 1,517,002 pairs where the
sorted file gave 1,520,324, and a half distance of 7,219 bp for 7,217;
two chromosomes whose halves were interleaved lost 7,785 of 3,044,978
pairs; the variants of one chromosome shuffled lost none, and took 8.3 s
where the sorted file took 0.9 s, since the window then held the whole
chromosome (node, `js-v0.1.0-dev.3`, 30 September 2026). The
application cannot tell, since it reads no position, and a check of its
own would be a second calculation over the file. So popnei is asked to
refuse such a source in this call as its LD filter does, in popnei
issue #5, as the owner decided on 30 September 2026 (below, "Open
points").

### The fitted curve

The plot draws each population's curve from its ρ per base pair and its
individuals, as the owner decided on 30 September 2026 (decision 9);
the option not taken was to ask popnei for the points of the curve. It
is the formula of `the_curve_at` of `crates/popnei/src/ld/decay.rs` of
popnei, written in "The curve that is fitted" of popnei's
`docs/specs/ld.md`, with ρ = d × `rhoPerBp` at a distance of d base
pairs and n the individuals of the population, `numIndividuals`:

```text
E[r²] = (10 + ρ) / ((2 + ρ) · (11 + ρ))
        · [1 + ((3 + ρ) · (12 + 12ρ + ρ²)) / (n · (2 + ρ) · (11 + ρ))]
```

`fittedR2(d, rhoPerBp, n)` writes it with the four operations in
popnei's order,

```ts
const rho = d * rhoPerBp;
const twoPlusRho = 2 + rho;
const elevenPlusRho = 11 + rho;
const expected = (10 + rho) / (twoPlusRho * elevenPlusRho);
const ofTheSample = ((3 + rho) * (12 + 12 * rho + rho * rho)) / (n * twoPlusRho * elevenPlusRho);
return expected * (1 + ofTheSample);
```

 so that at a distance of 0 it gives popnei's `r2AtZero`
to the last bit: 0.46942148760330576 at n of 50, the same number, and at
the half distance a value 0.5000000000000889 times it (node, `js-v0.1.0-dev.3`, 30
September 2026). n is the individuals the population was sent with, as
popnei takes it, and not the individuals called at a pair.

`ldDecayCurve(r, i, maxDist)` gives the curve of the population `i` at
`LD_CURVE_POINTS`, 200, distances evenly spaced from 0 to the largest
distance, both included, as two `Float64Array`s, or `null` when its ρ
per base pair is NaN. 200 points put one every 3 pixels of a plot 600
wide, meanwhile, refined in the running application.

### The warnings

`warnings(r, p)` gives them from the result and the project of the
request, in this order. `fewIndividuals` is one warning, which names up
to three populations, and more as the first two and how many more, as
`project.md` lists individuals. Each of the next four is one warning
for each population it holds for, since its text carries that
population's own numbers: a largest distance below the spacing of the
variants gives one `noPairs` for each population (point 7, decided by
the owner on 1 October 2026; the option not taken was one warning that
names several populations and drops their numbers). The numbers are
shown with a comma between thousands, the distances of the bins in
whole base pairs, and a half distance as the legend and the table write
it, to three significant digits below 10 bp (C4; until then a warning
wrote "at 3 bp" where the table had "3.40").

| code | when | the text |
|---|---|---|
| `fewIndividuals` | a population has fewer than 20 individuals, `LD_DECAY_FEW_INDIVIDUALS` | "Population p3 has 12 individuals. With fewer than 20, r² is higher than in the population by chance alone, more than the fitted curve corrects for, so its curve, when it has one, lies higher and its half distance is longer than those of a larger population. Compare it with the others with this in mind." With two or three: "Populations p3 and p5 have fewer than 20 individuals, 12 and 8. …, so their curves, when they have one, lie higher and their half distances are longer than those of a larger population. Compare them with the others with this in mind." With more, no counts. For the one population, "All individuals has 12 individuals. …" The last sentence, "Compare …", is left out when every population of the result has fewer than 20, the one population among them, since there are no others (C9); "when it has one" is for a population of one or two individuals, which has no curve (point 7) |
| `noPairs` | a population with no pair counted, the sum of its `numPairs` 0 | "p3 has no pair of variants to measure: it has 1 individual, and r² needs two or more." when it has fewer than two individuals, whatever its variants, since no distance gives it a pair (point 7); "p3 has no pair of variants to measure: fewer than two of its variants pass its maximum major allele frequency of 0.95." when its `numVars` is below 2; otherwise "p3 has no pair of variants to measure: no two of its 1,152 variants on one chromosome are within 100,000 base pairs of each other with a value of r². Type a larger distance." |
| `noCurve` | a population with pairs and `rhoPerBp` NaN | "No curve could be fitted to the pairs of p3, so it has no half distance: its pairs are at one distance only, or r² does not fall with distance in a way a curve can follow within 100,000 base pairs, flat across them or fallen within the first base pair. Its mean r² of each bin is shown." |
| `halfDistBeyondPairs` | a finite half distance above the largest distance of the last bin with a pair | above `maxDist`: "The curve of p3 falls to half at 1,599,810 bp, beyond the 100,000 base pairs within which pairs were counted, so that distance is where the curve would reach and not where pairs were measured, and the plot does not reach it. Type a larger distance to count pairs that far apart."; within `maxDist`: "The curve of p3 falls to half at 1,868,335 bp, beyond its furthest pairs, in the bin to 280,000 bp, so that distance is where the curve would reach and not where pairs were measured." |
| `halfDistBelowPairs` | a finite half distance below the smallest distance of the first bin with a pair | "The curve of p3 falls to half at 800 bp, closer than the closest pairs counted, in the bin from 8,001 bp: r² is already low at the shortest distances of this file, and the half distance says only that LD falls within them. Type a smaller largest distance to see the decay within them." (C3). Below 10 bp, "falls to half at 0.247 bp, closer than the closest pairs counted, in the bin from 1 bp: …" |
| `individualsWithoutPopulation`, `populationNotInResult` | as the diversity's | `populationWarnings` of `src/core/analyses/words.ts` with the words "the LD decay" and "the plot": "…left out of the LD decay" and "…so it is not in the plot" (`diversity.md`, "The warnings") |

The threshold of 20 is the writers', decided on 30 September 2026, for
the owner to overrule: it
is the minimum number of individuals the diversity asks at each
variant, a number the user already meets, and on `ld.vcf.gz`, the
fixture below, four populations of 10 of its individuals gave half
distances of 10,509 to 11,357 bp, four of 20 gave 7,591 to 8,789, and
the two of 50 gave 7,548 and 7,340, at a largest distance of 100,000 bp
(node, `js-v0.1.0-dev.3`, 30 September 2026). Three individuals gave
973,778 to 3,108,975 bp, and two a flat r² of 1 with no curve.
`docs/functionality.md` section 6 asks for the warning.

The half distance below every pair is the case of `panel.nei`: its
variants lie at positions 1 to 1,200 of one chromosome, and with the
missing data filter at 0.1 and a largest distance of 100,000 bp every
pair falls in the first bin, 1 to 2,000, and popnei gives p0 a half
distance of 0.247 bp, p2 0.109 and p1 0.139 (node, `js-v0.1.0-dev.3`,
30 September 2026).

### The check numbers

`checkNumbers(r)` gives `passStats.numVars`, then for each population
in the order of `r.pops` the variants it counted, `numVars`, the pairs
it counted, the sum of its `numPairs`, and its half distance, with
`null` for a NaN: 1 + 3 × the populations, 7 for two. The sum of the
pairs is whole numbers added, exact below 2^53, so it is the same in
every browser (`docs/specs/core/store.md`, "The definition of an
analysis"). The half distance is compared exactly: popnei's fit is the
same to the bit whatever the size of the blocks and the number of
threads (popnei's `docs/specs/ld.md`, "How it runs"), and it runs inside
the same wasm in every browser; two runs of `ld.nei` gave the same bits,
and a `.nei` file gave those of its VCF (node, 30 September 2026).
`numCheckNumbers(p)` gives 1 + 3 × the populations of
`populationsKept(p, byLists)`, and `null` in the diversity's cases.

### Its lines of the Python script

`script(p)` gives the lines that calculate the same numbers with the
Python API of popnei, after the lines of `src/core/script.ts`, in stage
6. The script's `variants` holds every filter of the dataset, the LD
pruning among them, and popnei puts a filter on a `Variants` for good,
so the LD decay opens the file again into a `Variants` of its own, as
the PCA does (`pca.md`, "Its lines of the Python script"), with the
filters of `ldDecayFilters` and, before them, `individuals_kept` when
the project has a filter of individuals. The populations are built as
the diversity's lines build them. For the project of the flow below:

```python
# The LD decay of each population, from the column "pop", over the
# filters of the Variants step but its LD pruning, on a Variants of its own
ld_variants = popnei.open_vars("ld.nei")
ld_variants.filter_by_missing_data(0.1)
pops = {}
for individual, pop in zip(individuals.iloc[:, 0], individuals["pop"]):
    if not pandas.isna(pop):
        pops.setdefault(pop, []).append(individual)
kept = set(ld_variants.individuals)
pops = {pop: [i for i in names if i in kept] for pop, names in pops.items()}
pops = {pop: names for pop, names in pops.items() if names}
ld = popnei.calc_ld_and_dist_per_pop(
    ld_variants, pops=pops, min_dist=1, max_dist=100000, num_bins=50,
    max_allowed_maf=0.95,
)
print(pandas.DataFrame({
    "individuals": {pop: len(names) for pop, names in pops.items()},
    "variants": ld.num_vars_per_pop,
    "half_distance_bp": {pop: d.half_dist for pop, d in ld.decay_per_pop.items()},
    "r2_at_distance_0": {pop: d.r2_at_zero for pop, d in ld.decay_per_pop.items()},
    "rho_per_bp": {pop: d.rho_per_bp for pop, d in ld.decay_per_pop.items()},
}).to_string())
for pop, bins in ld.per_pop.items():
    print(pop)
    print(bins.to_string())
```

These lines, run with popnei's Python package built from popnei's
`main` at `eae29a2` on `ld.vcf.gz` with no filter on 30 September 2026,
gave half distances of 7548.08187836982 and 7339.709512618931 bp, the
numbers of the wasm to the last digit. The one population is built as
in the diversity's lines, `{"All individuals": list(ld_variants.individuals)}`.
The warnings as comments come in stage 6 with `script.ts`.

### The TypeScript interface

The request and the result, members of `Job` and `JobResult` of
`src/worker/protocol.ts`:

```ts
export interface LdDecayJob {
  readonly analysis: "ldDecay";
  readonly fileId: string;
  readonly filters: readonly VariantFilter[];   // the project's but the LD pruning
  readonly individuals: readonly string[] | null;
  readonly pops: Pops;                          // only individuals kept, none empty
  readonly minDist: number;
  readonly maxDist: number;
  readonly numBins: number;
  readonly maxAllowedMaf: number;
}

export interface LdDecayResult {
  readonly analysis: "ldDecay";
  readonly pops: readonly string[];
  readonly numIndividuals: Uint32Array;
  readonly numVars: Float64Array;
  readonly smallestDist: Float64Array;
  readonly largestDist: Float64Array;
  readonly numPairs: Float64Array;
  readonly meanR2: Float64Array;
  readonly sdR2: Float64Array;
  readonly rhoPerBp: Float64Array;
  readonly r2AtZero: Float64Array;
  readonly halfDist: Float64Array;
  readonly passStats: PassStats;
}
```

The counts are `Float64Array`s, as popnei gives them, whole numbers up
to 2^53.

The module exports its definition and what the panel reads:

```ts
export const ldDecay: AnalysisDef<Job, JobResult>;
// id "ldDecay"; app ["popgen"]; keyVersion 1;
// filtersRead { variants: false, individuals: true }; defaults LD_DECAY_DEFAULTS

export interface LdDecayOptions {
  readonly maxDist: number | null;
  readonly maxAllowedMaf: number;
}
export const LD_DECAY_DEFAULTS: LdDecayOptions;   // { maxDist: null, maxAllowedMaf: 0.95 }
export const LD_DECAY_MIN_DIST = 1;
export const LD_DECAY_NUM_BINS = 50;
export const LD_DECAY_FEW_INDIVIDUALS = 20;
export const LD_DECAY_MAX_BYTES = 1_000_000_000;
export const LD_CURVE_POINTS = 200;

export function ldDecayOptions(p: Project): LdDecayOptions;

/** The project's filters of the variants that are on, but the LD pruning. */
export function ldDecayFilters(filters: Project["filters"]): Project["filters"];

/** What stands beside the field of the largest distance: why it has to
    be typed, or the reason of the lock of the memory; null otherwise. */
export function maxDistReason(p: Project): string | null;

/** The largest distance the memory allows for this many populations. */
export function maxDistFor(numPops: number): number;   // Math.floor(LD_DECAY_MAX_BYTES / (40 * numPops))
export const LD_PLOT_MAX_POPS = 16;

/** The line under the plot when the result has more than LD_PLOT_MAX_POPS
    populations, which the plot leaves out; null otherwise. */
export function ldPlotOmittedText(r: LdDecayResult): string | null;

/** The fitted curve at `dist` base pairs, popnei's formula in its order. */
export function fittedR2(dist: number, rhoPerBp: number, numIndividuals: number): number;

/** The curve of population `i`, LD_CURVE_POINTS from 0 to maxDist; null with no curve. */
export function ldDecayCurve(
  r: LdDecayResult, i: number, maxDist: number,
): { readonly x: Float64Array; readonly y: Float64Array } | null;

/** One row per population, the same array for the same result. */
export interface LdDecayRow {
  readonly population: string;
  readonly individuals: number;
  readonly variants: number;
  readonly pairs: number;
  readonly halfDist: number | null;       // null for NaN
  readonly r2AtZero: number | null;
  readonly rhoPerBp: number | null;
}
export function ldDecayRows(r: LdDecayResult): readonly LdDecayRow[];

/** One row per population and bin, the bins of a population together. */
export interface LdBinRow {
  readonly population: string;
  readonly from: number;
  readonly to: number;
  readonly pairs: number;
  readonly meanR2: number | null;
  readonly sdR2: number | null;
}
export function ldBinRows(r: LdDecayResult): readonly LdBinRow[];

/** The two tables as the text of a CSV file each. */
export function ldDecayCsv(r: LdDecayResult): string;
export function ldBinsCsv(r: LdDecayResult): string;

/** The words of a refusal of popnei, for the error state of the panel. */
export function refusalText(message: string, p: Project): string;

/** The words of a calculation worker that stopped with no answer during
    an LD decay, for the error state of the panel. */
export function crashText(p: Project): string;
```

The two row functions keep their rows by the result in a `WeakMap`, as
`diversityRows` does, so the panel gets the same array each time React
draws it. `warnings` and `checkNumbers` check the `analysis` of their
result and throw a defect for another's.

### The cases

- **The LD pruning of the Variants step is on, or turned on while the
  plot is shown.** The key does not change and the plot stays. The panel
  says the pruning is not applied here (below, "What it shows").
- **The LD pruning of the Variants step has no distance.** The diversity
  and the PCA that follows it are locked; the LD decay runs.
- **A population of 1 or 2 individuals.** One gives no pair, `noPairs`
  with the words of one individual; two give every pair an r² of 1 and
  no curve, `noCurve`; both have `fewIndividuals`.
- **A population whose variants all fail its MAF.** Its bins are empty,
  its `numVars` 0, and `noPairs` says why; the other populations are not
  affected.
- **A largest distance below the spacing of the variants.** No pair in
  any population, `noPairs` for each, and the plot is empty with its
  axes; the words say to type a larger distance.
- **A file not sorted by position.** Fewer pairs, no word, until a
  release of popnei refuses it (above, "The request", and popnei issue
  #5).
- **The filters keep no variant.** popnei refuses; the refusal stays
  under the key, so an undo to those settings shows it again
  (`docs/specs/core/store.md`, "A calculation that failed").
- **A result that arrives after the options changed.** It goes into the
  cache under its own key and is not shown.
- **A threshold on the individuals**: a Run calculates their statistics
  first, as for the diversity.
- **A population named `__proto__`** runs as any other. popnei's
  release builds the objects of its result by assigning to them,
  `perPop[pop] = …` in `ld.ts`, and that name sets the object's parent
  instead of making a field, so given the user's names popnei loses the
  population: a job of `a` and `__proto__` came back with `a` alone
  (node, 30 September 2026). So the runner gives popnei names of its
  own, `p0`, `p1`, … by the place of each population in the job, and
  puts the user's names back by that place; popnei's numbers do not
  depend on the names (`docs/specs/worker/runner.md`, "The LD decay").
  The owner decided it on 1 October 2026 (point 6). The option not
  taken was to wait for popnei issue #5, which still asks popnei to
  keep such a name: until then the population failed the LD decay as an
  error of the application, and running it again failed the same way.

### How it runs

One pass over the file, `numPassesOf("calcLdAndDistPerPop")` 1, then
the fit of each population, which reads no genotype and gives no
progress; the bar stands full while it runs.

**The memory.** What popnei holds grows with three things (the doc
comment of `maxDist`, and "How it runs" of the item "LD against
distance, per population" of popnei's `docs/specs/ld.md`):

- the counts of each distance, 16 bytes × `maxDist` for each population,
  asked for before the pass, and up to 24 bytes more a distance at its
  end, which the lock above bounds at 1 GB together; the fit then reads
  every distance that holds a pair, 183 times, with no progress, a time
  the plan measures on a file of positions not evenly spaced at the
  largest distance the lock allows;
- the blocks of variants the pass holds within `maxDist` of the newest
  variant, dropped a whole block at a time, of 10,000 variants for 100
  individuals and 5,000 for 1,000 in this release, with their genotypes
  kept by each population and three matrices of 8 bytes a value over the
  variants held and the individuals of each population;
- the tiles of r², a few MB.

Measured in node 26.8.2 on the owner's Mac with `js-v0.1.0-dev.3`, on
30 September 2026, the memory of wasm, `memory.buffer.byteLength` of
popnei's WebAssembly, before and after the call. The rows of
`ld.vcf.gz` are one process, the calls in the order of the rows, over
the VCF read from bytes; each row of 20,000 variants is a process of its
own, over a `.nei` file read from bytes, after one pass of
`calcPerVarDistribs` over it, so that the memory before holds the file:

| the file | the largest distance, the populations | wasm before, after | the call |
|---|---|---|---|
| `ld.vcf.gz`, 100 individuals, 500 variants | 100,000 bp, 3 | 1.3, 11.9 MB | under 0.1 s |
| the same | 1,000,000 bp, 1; then 3 | 11.9, 27.9; then 60.0 MB | under 0.1 s |
| the same | 10,000,000 bp, 3 | 60.0, 540.1 MB | 0.1 s |
| 100 individuals, 20,000 variants every 1,000 bp | 100,000 bp, 3 | 27.7, 91.4 MB | 0.6 s |
| 200 individuals, the same variants | 100,000 bp, 3 | 40.4, 162.2 MB | 0.9 s |
| 1,000 individuals, the same variants | 100,000 bp, 1; 3 | 131.8, 769.5; 542.6 MB | 3.1; 3.3 s |
| the same | 1,000,000 bp, 1; 3 | 131.8, 784.0; 570.0 MB | 11.2; 11.6 s |
| 1,000 individuals, 20,000 variants every 100 bp | 1,000,000 bp, 1; 3 | 131.7, 1,217.3; 877.2 MB | 73.6; 64.2 s |

The files of 20,000 variants are those of the end of "How it is verified", below. A
smaller calculation after a larger one left the memory where the larger
had taken it: 60.0 MB after a call at 500,000 bp for one population that
followed the second row, and 540.1 MB after one at 100,000 bp that
followed the third, since the memory of wasm is not given back while the
worker lives. So an LD decay over a file of 1,000
individuals leaves the worker 0.4 to 1.1 GB larger, far above the 25 MB
after which a written file or a PCA restarts it (`docs/architecture.md`,
section 13, points 5 and 9). So the client starts the worker again
after every LD decay, as the owner decided on 30 September 2026 (below,
"Open points"; `docs/architecture.md`, section 13, point 16).

**In the browsers.** The plan of stage 5 measured the LD decay through
the application in Chromium 153 and WebKit 26.6, on the owner's Mac, an
Apple M5 Pro with 64 GB and macOS 27.0.1, on 30 September 2026, while
other tests ran beside it, the load average of 1 minute from 3 to 23
(PA2 D7 of `e2e/measure.spec.ts`; the report of the plan). The memory is
that of the engine, the footprints of all its processes summed, and no
tab closed:

| the file, the populations | the largest distance | the run, Chromium; WebKit | the engine grew by, Chromium; WebKit | when the answer arrived; 3 s after the restart |
|---|---|---|---|---|
| 1,000 individuals, 20,000 variants every 1,000 bp, 3 | 100,000 bp | 3.4 to 3.9 s; 7.9 to 8.4 s | 0.40 GB; 0.43 to 0.53 GB | 0.55; 0.15 GB in Chromium, 0.73; 0.20 to 0.21 GB in WebKit |
| the same | 1,000,000 bp | 12.5 to 19.9 s; 19.1 to 19.6 s | 0.44 to 0.45 GB; 0.49 to 0.59 GB | 0.59; 0.14 to 0.15 GB, 0.78; 0.20 to 0.22 GB |
| 100 individuals, 20,000 variants at positions drawn at random over 26 Mb, 1 | 25,000,000 bp, the lock | 34.4 s; 30.9 s | 1.12; 1.16 GB | 1.25; 0.13 GB, 1.44; 0.18 GB |
| the same, 3 | 8,333,333 bp, the lock | 28.2 s; 32.0 s | 0.82; 0.85 GB | 0.95; 0.13 GB, 1.13; 0.19 GB |
| 1,000 individuals, a variant every 100 bp, 25,000 variants, 3 | 2,000,000 bp | 222 s; 219 s | 1.19; 1.34 GB | 1.34; 0.14 GB, 1.55; 0.25 GB |
| the same, 45,000 variants | 4,000,000 bp | 857 s; 594 s | 2.27; 2.42 GB | 2.42; 0.14 GB, 2.63; 0.56 GB |
| the same, 88,334 variants | 8,333,333 bp, the lock | refused for memory after 1,475 s; 1,127 s | 3.90; 3.99 GB | 4.05; 0.14 GB, 4.28; 0.24 GB |

Each of the first two rows is 5 runs; the others one run each. The size
when the answer arrived, before the worker is ended, is what the tab
would keep without the restart; 3 s after the restart the engine is
back where it was before the Run, so the restart gives back all the LD
decay took. At the lock, the time after the pass, when the bar stands
full, was 10.8 s for one population and 10.3 s for three in Chromium,
8.7 and 11.4 s in WebKit, found as the time from the first copy of the
counts, which raises the memory by 24 bytes a distance, to the answer.
On the dense file popnei refused at 8,333,333 bp, which the lock allows
three populations, after 19 to 25 minutes of a pass, when the variants
it held within the distance reached the 4 GB of the memory of wasm; the
user sees the words of "Its words", below, and the tab stays. The lock
bounds the counts and not those variants, as "Why it cannot run" says.

**The time** grows with the pairs, which grow with the density of the
variants times the largest distance: 1,520,324 pairs a population took
3.1 s and 14,874,465 took 11.2 s in the table above, and 114,331,781
took 73.6 s.

### How it is verified

With Vitest, at the functions of the definition, on frozen projects, as
`.claude/skills/coding/testing.md` says of core:

- **`ldDecayFilters`**: of missing data 0.1, MAF 0.9 and LD r² 0.3
  within 10,000, the first two in their order; of an LD pruning with no
  distance alone, none.
- **The key**: for each row of its table, two projects that differ in
  it, and `keyOf` equal or not as the row says; the LD pruning turned
  on keeps it.
- **`needs`**: each row of its table; `maxDist` 8,333,333 with three
  populations gives `null`, and 8,333,334 the reason; the LD pruning of
  the step with no distance gives `null`. **`maxDistReason`** of a
  project with no distance gives the words of the field, of 8,333,334
  with three populations the reason of `needs`, and of 8,333,333
  `null`.
- **`parseOptions`**: the defaults back; `maxDist` 50 and
  9,007,199,254,740,991 taken; 49, 50.5, 9,007,199,254,740,992, a field
  missing or one more, refused.
- **`run`**, with a fake client, in the project of the flow: the job of
  "The request", with the missing data filter and without the LD pruning
  the project has on.
- **`fittedR2`**: at 0 with n 50 and any ρ per base pair,
  0.46942148760330576 exactly, for ρ per base pair 0.00029996668947275404
  and 0.00030848266256738914; with n 100, 0.46198347107438015 exactly;
  at the half distance of `pop_a`, 7548.08187836982, and its ρ per base
  pair, n 50, a value whose ratio to 0.46942148760330576 is 0.5 within
  1e-12; `ldDecayCurve` of a population with NaN gives `null`,
  and otherwise 200 points from 0 to `maxDist`.
- **The warnings**, from results written as literals: a population of
  12 individuals beside one of 50 gives `fewIndividuals` with its
  words, and alone the same without their last sentence; `numVars` 1
  and no pair, `noPairs` with the words of the MAF; one individual and
  no pair, `noPairs` with the words of one individual; three
  populations with no pair, three `noPairs`; pairs and NaN, `noCurve`;
  a half distance of 1,599,810.0655818006 at `maxDist` 100,000,
  `halfDistBeyondPairs`; the literals of the panel, below,
  `halfDistBelowPairs` for each population, "at 0.247 bp" for p0; a
  half distance of 3.4 bp below pairs that start at 8,001 bp, "at 3.40
  bp".
- **`checkNumbers`** of the result of the flow: `[500, 432, 29367,
  7548.08187836982, 432, 29367, 7339.709512618931]`.
- **`refusalText`** of each row of "Its words", with popnei's messages
  as literals, and **`crashText`** of the project of the flow.
- **`script`** of the project of the flow gives the lines above, as a
  literal.
- **`ldPlotOmittedText`** of a fake result of 17 populations gives "The
  plot draws the first 16 of the 17 populations, in the order of the
  table of the populations. The two tables hold all 17.", and of 16
  `null`.

In node, at `createRunner` of the runner, with the popnei of the
release, as `docs/specs/worker/runner.md` tests the diversity: the job
of the flow over `e2e/fixtures/ld.nei` gives the numbers below to the
last digit, the populations in the order of the job when the job names
them "10", "2"; and the same numbers, under its name, for a population
the job names `__proto__`.

With Playwright, in Chromium, Firefox and WebKit, against the built
site: the flow loads `ld.nei` and `ld_pops.csv`, chooses the column
`pop`, opens the LD decay, sees why the distance has to be typed beside
its field and "Type the largest distance, above." beside the Run
button, types 100000, runs it, and sees the table of the populations
above the tabs, the plot, the
half distances "7,548" and "7,340" in the column "Half distance (bp)"
of the table of the populations, and no warning; the axe check of every state; the keyboard
path of "Accessibility", below. A second flow, in the same three
browsers, loads `ld.nei` with a
metadata file the test writes, `IID,pop` with the individual `i000` to
`i099` in the population `q` and its number modulo 17, `q0` to `q16`,
17 populations of 5 or 6 individuals; types 100000; runs; and sees 16
rows in the legend of the plot, `q0` to `q15`, the line "The plot draws
the first 16 of the 17 populations, in the order of the table. The two
tables hold all 17.", 17 rows in the table of the populations, and, in
its tab, the table of the bins in a frame lower than its 850 rows, its
header still in view after the frame is scrolled to its end.

**The fixture.** `panel.nei` cannot test the decay: its variants are at
positions 1 to 1,200 of one chromosome, so at any largest distance of
2,000 bp and more every pair falls in the first bin, and its half
distances are below 1 bp. The fixture is popnei's own LD file,
`tests/reference/ld/ld.vcf.gz` of popnei, 20,505 bytes: 100 diploid
individuals, `i000` to `i099`, and two chromosomes of 250 variants
every 1,000 bp, from four founder haplotypes recombined along each
chromosome by `make_reference.py` beside it, whose curve popnei checks
against R. `e2e/fixtures/make_fixtures.mjs` copies it from popnei's
checkout as it copies the panel, writes `e2e/fixtures/ld.nei` from it
with `writeVars`, 68,354 bytes, and writes `e2e/fixtures/ld_pops.csv`,
`IID,pop`, with `i000` to `i049` in `pop_a` and `i050` to `i099` in
`pop_b`, popnei's two populations of that file. The numbers, from
`calcLdAndDistPerPop` of `js-v0.1.0-dev.3` in node on 30 September 2026
over `ld.nei` with the missing data filter at 0.1, which keeps all 500
variants, the populations as above, `maxDist` 100,000, `minDist` 1,
`numBins` 50 and `maxAllowedMaf` 0.95:

```js
const variants = openVars(new Uint8Array(readFileSync("e2e/fixtures/ld.nei")));
variants.filterByMissingData(0.1);
calcLdAndDistPerPop(variants, { pops, minDist: 1, maxDist: 100000, numBins: 50, maxAllowedMaf: 0.95 });
```

| | `pop_a` | `pop_b` |
|---|---|---|
| individuals | 50 | 50 |
| variants counted | 432 | 432 |
| pairs | 29,367 | 29,367 |
| the first bin, 1 to 2,000 bp: pairs, mean r², sd | 745, 0.3104664289575117, 0.28243883665741665 | 745, 0.31876304803774247, 0.2814576610764838 |
| the last bin, 98,001 to 100,000 bp: pairs, mean r² | 452, 0.025953462391956096 | 452, 0.03162397044318621 |
| ρ per base pair | 0.00029996668947275404 | 0.00030848266256738914 |
| r² at 0 | 0.46942148760330576 | 0.46942148760330576 |
| half distance, bp | 7548.08187836982 | 7339.709512618931 |

The VCF gives the same numbers. With the missing data filter at 0.05,
464 variants kept, 401 and 25,293 pairs in each, and half distances of
7639.382672516462 and 7416.431965140492. popnei's own reference, at
1,000,000 bp and `maxAllowedMaf` 0.8, 7530.1038938711654 bp for
`pop_a`, is given by the wasm as 7530.10382399872, 9.3e-9 of itself
away, within popnei's tolerance of 1e-6 against R (popnei's
`docs/specs/ld.md`, "How it is verified").

The literals of the panel for `halfDistBelowPairs` are those of "The
warnings", on `panel.nei` with its three populations.

The files of the memory and of an unsorted source, of 100 to 1,000
individuals and 20,000 variants every 1,000 or 100 bp on one or two
chromosomes, from four founder haplotypes recombined at 2% per 1,000 bp
as popnei's reference script does, are not committed. The plan writes
them with a script in node, as `e2e/bigVcf.ts` writes its VCF, whose
genotypes are drawn with no LD and serve for the memory and the time
alone.

## The panel

The LD decay of each population, `docs/functionality.md` section 6,
from the module above.

### What it shows

**The options**, above the Run button, two number fields, each a
command of `setAnalysisOptions` with the options of `ldDecayOptions(p)`
and the one changed:

- "Largest distance between the two variants of a pair, in base pairs,
  from 50", empty until typed. Under it: "How far to look for pairs.
  Choose a distance beyond which you expect little LD in your species;
  the half distance of the result shows whether it was far enough."
  Beside the field, what `maxDistReason` gives: while no distance is
  typed, why it has to be, drawn as a line of help, in the plain style
  of the line under the field, since the user has done nothing wrong
  yet; and for a distance the memory does not allow, the reason of the
  lock, drawn as an error, with its mark. The field shows its digits
  with no comma, "100000", as every number field of the application
  does, since a comma typed is refused (C9).
- "Maximum major allele frequency in each population, from 0.5 to 1",
  0.95. Under it: "A variant is left out of a population where its
  commonest allele is more frequent than this, since the r² of a
  variant that hardly varies rests on one or two individuals." The
  field takes two decimals, and an arrow key moves it by 0.01, as the
  MAF filter of the Variants step: 0.975 typed is refused with the
  words of that step for a number of too many decimals. popnei and a
  project file take any number from 0.5 to 1, and a project opened with
  0.975 keeps it until the field is changed. The owner decided the two
  decimals on 1 October 2026 (C5); the option not taken was a field of
  as many decimals as popnei takes.

The fields follow the rules of the number fields of the Variants step
(`docs/specs/steps/variants.md`, "A number the fields do not take"),
with the nouns "the distance" and "the frequency", and the empty
distance as the PCA's is: `NaN` given to the field, and no key that
steps a number sends anything while it is empty
(`docs/specs/analyses/pca.md`, "What it shows").

**A line under the options** while the LD pruning of the Variants step
is on: "The LD pruning of the Variants step is not applied here: it
removes the pairs of variants in LD that this analysis measures. The
other filters of the Variants step are." And the line of the
individuals it will run on, as the PCA's.

**The result**, once calculated, in this order, as the owner decided on
1 October 2026 (C1): the table of the populations, whose half distances
are what is read first; under it two tabs, the plot, selected when the
result is drawn, and the table of the bins; and the downloads. Until
then the table of the populations came under the tabs, and with the
tab of the bins open, 50 rows for each population with no frame of
their own, it and the downloads started about 3,600 pixels down for two
populations.

- **The plot**, `createLine` of `docs/specs/charts/line.md`, one series
  per population in the order of the result: the mean r² of each bin
  with a pair, at the middle of the bin, (smallest + largest) / 2, 1000.5
  for the bin from 1 to 2,000, as its points; its fitted
  curve, `ldDecayCurve`, as its line; and a mark at its half distance,
  at the height of half of `r2AtZero`, when the half distance is finite
  and at most the largest distance. The horizontal axis runs from 0 to
  the largest distance, "Distance between the two variants (bp)"; the
  vertical from 0 to the largest value of the points and the curves,
  rounded up to a tenth, at most 1, and 0 to 1 when nothing is drawn,
  "Mean r² of the pairs". Each entry of the legend reads
  "pop_a · half at 7,548 bp"; "pop_a · half at 1,599,810 bp, beyond the
  plot"; "pop_a · no curve" for pairs with no curve; and "pop_a · no
  pair". A half distance below 10 bp is written to three significant
  digits, "half at 0.247 bp", and from 10 bp in whole base pairs. In
  the legend a name is written whole up to 16 characters, and cut after
  15 with an ellipsis, "…", above them, "Solanum_pimpine… · half at
  7,548 bp", so that the legend, which stands beside the plot, leaves
  the plot its room (C2); the table has the name whole, and its rows
  are in the order of the legend's. With up to 49 populations in
  `populationsOf(p)`, each population keeps the colour and the shape of
  its place among them, its `group`, whether or not the filters empty
  those before it, so that it has one mark here and in the PCA. With
  more than 49, where the marks repeat and the 1st and the 50th
  population would be drawn alike, and for the one population of every
  individual, the group is the place among the populations the plot
  draws, 0 to 15 (point 14). The plot draws the first 16 populations of
  the result, `LD_PLOT_MAX_POPS`, the rows of the legend the element of
  the plot holds, so that none is drawn without its name. With more, a
  line under the plot, `ldPlotOmittedText`, says which it drew and
  where the others are: "The plot draws the first 16 of the 20
  populations, in the order of the table of the populations. The two
  tables hold all 20."
- **The table of the bins**, the numbers behind the plot, in the tab
  beside it, as the histograms of the Variants step have theirs: the
  population, the distances of the bin, its pairs, its mean r² and its
  standard deviation, "no pair" for a bin without one. It has 50 rows
  for each population, 5,000 for 100, so it is drawn in a frame that
  scrolls inside the tab, as high at most as the box of the tables of
  the individuals, 28rem, 448 pixels at the default size of text, or
  70% of the height of the window when that is less, and its header row
  stays at the top of the frame while it does (C1).
- **The table of the populations**, above the tabs, with the caption
  "The LD decay of each population, over the 500 variants of ld.nei the
  filters kept, pairs up to 100,000 base pairs apart. The r² at
  distance 0 is where the fitted curve starts, which depends on the
  number of individuals of the population alone.", the 500 being
  `passStats.numVars`, before the maximum MAF of each population, which
  the column Variants gives. The second sentence is there because that
  column is the same number for every population of one size, 0.5785
  for each of 6 individuals, and a user may read it as a result (C7);
  the option not taken was to keep the number in the CSV alone:

| column | from |
|---|---|
| Population | `pops` |
| Individuals | `numIndividuals` |
| Variants | `numVars`: those that pass its maximum MAF |
| Pairs | the sum of its `numPairs` |
| Half distance (bp) | `halfDist`, the number as the legend writes it but without "bp", which the header carries, as the headers of the diversity's and the distances' tables carry what their numbers count: "7,548", "0.247"; "no pair" or "no curve" for NaN |
| r² at distance 0, of the curve | `r2AtZero`, to four decimals |
| 4Nr per base pair | `rhoPerBp`, the ρ per base pair, to three significant digits |

- **Downloads**: each table as CSV, `ld.ld_decay.csv` and
  `ld.ld_decay_bins.csv` for `ld.nei`, every digit.

The warnings above the plot, with their count on the heading, as every
panel.

### The states

| state | what the user sees | what they can do |
|---|---|---|
| empty | cannot happen: until the variants file is read the analysis is locked with a reason | |
| locked | the reason, as text beside a disabled Run button described by it: the distance not typed, "Type the largest distance, above.", with why it has to be typed beside its field, as a line of help; the memory, "With 3 populations, the largest distance can be at most 8,333,333 base pairs: …", also beside the field, as an error; the reasons of the metadata file and the populations; the store's when the filters keep no individual. The options stay editable | type the distance; go to the step the reason names |
| ready | the options, the line of the LD pruning when it is on, the line of the individuals, and Run | set the options; Run |
| running | the bar and the clock of the diversity, "Calculating · 35% · 0:12", and under them "The bar shows the reading of ld.nei. The curves are fitted once it is read. With a large distance on a file whose variants are close together, the reading may take tens of minutes and may end with the LD decay refused for lack of memory." The last sentence is always there, since the application does not know how close the variants are before the Run (point 19). The options stay editable, and a change leaves the calculation behind with the notice of the store | Stop; change the options |
| done | the plot and its tables, their downloads, the warnings; after an opened project file, the comparison with its check numbers | read, download; change the options |
| results removed | the notice, "LD decay removed because the missing data filter changed · Undo", and the options as in ready; in the panel, the diversity's words with the result named as the analysis is, "The LD decay was removed because the filter of the variants by missing data changed. Undo brings back the LD decay as it was, with no calculation; Run calculates a new one for the new settings." "The plot and the tables" in the place of the second "the LD decay" would ask the shared sentence for "as they were" after an analysis named in the singular, which it cannot say; the owner decided on 1 October 2026 to keep "the LD decay" (point 24) | Run; Undo |
| error | what happened and what to do, "Its words"; a refusal of popnei stays for these settings, and Run is not offered after it | change the settings; load the file again after `reopenFailed` |

### What it sends and reads

It reads, through `useAppState`, the status of `ldDecay`, its `RunView`,
the notice, the project for `ldDecayOptions`, `ldDecayFilters` and the
names of the files, and the individuals kept. Run calls
`startAnalysis(store, "ldDecay")`, Stop `store.cancelRun("ldDecay")`,
and each option is `store.apply(description, (p) =>
setAnalysisOptions(p, ldDecay, { ...ldDecayOptions(p), ‹the option› }))`
with the descriptions "the largest distance of the LD decay changed" and
"the maximum major allele frequency of the LD decay changed". The panel
holds no state of the project; its own is the tick of the clock and the
tab of the plot or the table.

### Its words

The locked reasons and the warnings are those of the module. Under the
plot, with more than 16 populations, `ldPlotOmittedText`: "The plot
draws the first 16 of the 20 populations, in the order of the table of
the populations. The two tables hold all 20.", the count of `r.pops` with a comma
between thousands. The error
state is the diversity's table (`diversity.md`, "Its words"), made by
`refusalWords` of `src/core/analyses/words.ts` with the words of the LD
decay: `calculate` "calculate the LD decay", `nothingLeft` "there is no
variant to calculate the LD decay over", `change` the diversity's
"Change the settings, or load the variants file again", `again` "to
calculate it again", and `emptyPass` "The filters kept none of the
variants of ld.nei, so there is no variant to calculate the LD decay
over. Loosen the filters in the Variants step." One row comes before
them, in `refusalText` of this module:

| the failure | the text |
|---|---|
| popnei refused for memory: its message starts "this machine has not the memory for" | "The LD decay needed more memory than the browser tab could give. Type a smaller largest distance, keep fewer individuals with the filters of individuals, or calculate it with popnei in Python, outside the browser." |

And one row replaces the diversity's row of a calculation worker that
stopped with no answer, `workerFailed`, in `crashText` of this module:

| the failure | the text |
|---|---|
| the worker stopped with no answer, `workerFailed` | "The calculation stopped unexpectedly, perhaps because the LD decay needed more memory than the browser tab could give. Type a smaller largest distance, or keep fewer individuals with the filters of individuals in the Variants step, and run it again; or calculate it with popnei in Python, outside the browser. If it stops again at a small distance, load ld.nei again in the Variants step." |

A browser can end the calculation for lack of memory before popnei can
refuse, and the diversity's words, "The calculation stopped
unexpectedly. Run it again…", would send the user to repeat a run of
perhaps many minutes that ends the same way; so the LD decay has words
of its own, as the PCA has, as the owner decided on 1 October 2026
(C6). They always name the memory, since the application cannot
estimate what an LD decay needs, which grows with how close the
variants of the file are. The last sentence keeps the diversity's
remedy for a fault of popnei that comes back at every run.

The LD pruning's refusal of a file not sorted never reaches this panel,
since its job has no LD filter. Once popnei refuses such a file in
`calcLdAndDistPerPop` (popnei issue #5), `refusalText` tests for that message
with `ldOrderText` and the words of the LD decay before `refusalWords`,
whose own test of it would tell the user to turn off the LD pruning.

The help, a few lines of Markdown for the help drawer of stage 8:

- What it gives: for each population, the mean r² of the pairs of
  variants at each distance, over the variants the filters kept but
  the LD pruning, and the curve of Hill and Weir (1988) fitted to every
  pair, with the distance at which it falls to half of its value at 0.
  Two populations are compared by their half distances: LD that extends
  further means fewer recombinations since the haplotypes were formed,
  a smaller effective size, or selfing.
- How to choose the largest distance: far enough that the curve has
  flattened; the plot shows whether it has. A half distance beyond it is
  read off the curve and not measured.
- The half distance, or a few times it, is a starting point for the
  distance of the LD pruning of the Variants step
  (`docs/functionality.md`, section 3).
- When not to trust it: fewer than 20 individuals; a file whose
  variants are not sorted by position, which counts fewer pairs with no
  warning in this version; variants much further apart than the half
  distance.
- The Python call that gives the same numbers,
  `popnei.calc_ld_and_dist_per_pop`, and popnei's `docs/specs/ld.md`.

### Accessibility

- The plot is an image with its title and a description the panel
  writes: "The mean r² of pairs of variants against their distance, in
  50 bins up to 100,000 base pairs, for 2 populations, with the curve
  fitted to each. The curve falls to half at 7,548 bp in pop_a and 7,340
  bp in pop_b." Its numbers are the tables', which the keyboard and a
  screen reader reach (`docs/specs/charts/line.md`). In the other
  cases, written into the spec on 1 October 2026 as task 8.1 of the
  plan chose them (point 23), `ldDecayDescription` says: with more than
  16 populations, "for the first 16 of the 17 populations", and its
  sentences are about those 16; after a half distance above the largest
  distance, "(beyond the plot)", "at 1,599,810 bp in pop_a (beyond the
  plot)"; when some population drawn has no curve, "with the curve
  fitted to each that has one"; for one population, "for 1 population,
  with its fitted curve", and nothing after "population" when it has no
  curve; no sentence of the half distances when no population has one;
  and then a sentence for the populations with no pair and one for
  those with pairs and no curve, "pop_c has no pair.", "pop_d and pop_e
  have no curve.", named as the warnings name them. The names are
  whole here, not cut as in the legend.
- The two tables have header cells for their columns and, for the
  population, their rows, as the diversity's.
- The order of the keyboard: the two fields, Run, the tabs of the plot
  and the table, the downloads. With the tab of the bins open, the
  frame of their table is a stop of the Tab key after the tabs while
  the table is higher than it, a region named by the caption, so that
  the arrow keys scroll it (WCAG 2.2, 2.1.1), and a line under the
  caption says "Scroll the table to see all its rows."
- The field of the largest distance is described by what stands beside
  it, the line of help or the reason of the lock of the memory, so a
  screen reader says it with the field. The reason of the memory is
  also said once by the status region when a distance typed turns the
  lock on, and not again while it holds.
- While digits are typed, the two fields announce what React Aria's
  `NumberField` announces through a live region of its own, a part of
  the page whose changes a screen reader reads out: in stage 4 that
  region was found to gather the digits typed across edits,
  "5000050000777", which a screen reader may read out
  (`docs/plans/individuals-pca.report.md`, "The owner's decisions of 29
  September 2026", the paragraph "For the owner, new, with a
  recommendation"). They are made with the one wrapper of the application,
  `src/ui/widgets/NumberField.tsx`, as the fields of the PCA and of
  the Variants step are, and the code of this panel adds nothing for
  it. What the wrapper announces is for the plan of stage 5 and its
  review to look at, with a screen reader, and a change it calls for is
  made in the wrapper, for every number field at once.
- The end of a run, a lock that appears when a field changes, and the
  notice are said by the status region of the shell without moving the
  focus (WCAG 2.2, 4.1.3).
- The populations differ on the plot by colour and by the shape of their
  points, and are named in the legend (1.4.1).

### Left for the running application

The layout of the fields, the size of the plot, the number format of
the tables beyond what is above, and whether a population can be hidden
from the plot. The order of the parts of the result, and the frame of
the table of the bins, are the owner's decision of 1 October 2026,
above.

## What this spec asks of other documents

Made in those documents on 30 September 2026. The diversity's reasons
of the lists and of the individuals kept leaving no population are
`populationListsNeeds` and `populationsKeptNeeds` of
`docs/specs/core/project.md`, and its two warnings of the populations
`populationWarnings` of `src/core/analyses/words.ts`
(`docs/specs/analyses/diversity.md`, "The warnings"), which the three
analyses per population call. Section 13 of `docs/architecture.md`
has the restart as point 16, approved by the owner on 30 September
2026.

- `docs/specs/worker/protocol.md`: `LdDecayJob` and `LdDecayResult`, as
  above, in the unions `Job` and `JobResult`.
- `docs/specs/worker/runner.md`: a section "The LD decay", with the call,
  the order of the populations, the two checks and the refusals of "The
  request", and the memory of "How it runs" in "The memory".
- `docs/specs/worker/messages.md`, "The checks": the check of an
  `LdDecayResult`, each typed array of the length its populations and
  bins give; and its arrays in the list of those transferred.
- `docs/specs/worker/client.md`: the restart after every run of the
  analysis `ldDecay`, after `done` and after a refusal, as
  after a PCA.
- `docs/specs/core/project.md`: the diversity's reason of the lists
  leaving no individual with a population, and its `keptNeeds`, made
  shared functions there, so that the LD decay does not import the
  module of the diversity; the analyses per population of stage 5 need
  the same.
- `docs/specs/analyses/diversity.md`: its warnings `individualsWithoutPopulation`
  and `populationNotInResult` given the name of the analysis, so that
  the LD decay uses the same words.
- `docs/specs/core/store.md`, "The state of an analysis": the LD decay
  among the analyses whose `keptNeeds` locks when the list leaves no
  population.
- `docs/specs/analyses/filterCounts.md` and `countsOf` of `apps.ts`:
  `null` counts for `ldDecay`, as for the PCA.
- `docs/specs/shell.md`: the LD decay in the list of the Analyses step,
  and "LD decay was not run" among the announcements.
- `docs/architecture.md`: section 11, a bullet on the memory of the LD
  decay with the table above; section 13, point 16, the restart after
  every LD decay; section 9, `line.ts` described as the plot of
  the LD decay.
- `docs/functionality.md`, section 6: the option of the largest major
  allele frequency in each population, the lock of the memory, and the
  threshold of 20 individuals of the warning.
- `.claude/skills/coding/testing.md`: the fixtures `ld.nei` and
  `ld_pops.csv`.
- `docs/specs/stage-5-open-points.md`: the two points below, which the
  owner decided there as points 12 and 19, and under "Asked of popnei"
  popnei issue #5.

## Open points

This spec has no open point. The two it asked were decided by the
owner on 30 September 2026, each as recommended, and are written above
as decided (`docs/specs/stage-5-open-points.md`, points 12 and 19):

1. **The calculation worker is started again after every LD decay**,
   "OK". An LD decay leaves the memory of wasm larger by 16 bytes × the
   largest distance × the populations, plus the blocks it held: 64 MB
   for 100 individuals and 0.4 to 1.1 GB for 1,000 in the table of "How
   it runs", in node. The owner decided on 26 September 2026 not to
   restart the worker between requests, and made two exceptions, a
   written file and a PCA that leave wasm more than about 25 MB larger
   (`docs/architecture.md`, section 13, points 2, 5 and 9); this is a
   third, point 16 there. It costs at most 49 ms, from the start of a
   new worker to the file opened, measured at the end of the walking
   skeleton in Chromium 153 and WebKit 26.6 on the owner's Mac
   (`docs/specs/worker/runner.md`, "What a restart costs"), against a
   calculation of 0.6 s and more on 20,000 variants, and the worker
   keeps no intermediate result before stage 7. The options not taken:
   a restart above a bound of the individuals and the distance, as for
   the PCA, which almost any file of a few hundred individuals would
   pass and which the plan would have to measure; and no restart, which
   leaves the tab up to a gigabyte larger after one LD decay of 1,000
   individuals until the next load of the variants file. The plan
   measures both in the browsers.
2. **popnei is asked to refuse a variants file not sorted by position
   in this call**, "yes, popnei should refuse non-sorted files in those
   cases. open an issue": popnei issue #5, opened on 30 September 2026,
   asks `calcLdAndDistPerPop` for the refusal of its LD filter, which
   `ldOrderText` already turns into the user's words, as "The LD decay
   needs the variants of each chromosome together and in the order of
   their positions, and ld.vcf.gz does not have them so: …". The check
   is popnei's, where the numbers are verified, and it costs its pass
   nothing. Stage 5 does not wait for it: the application ships with
   the line of the help, and the refusal comes with a later release of
   popnei and a new URL in `package.json`, the panel's words for it
   then `ldOrderText`'s. The options not taken: a check in the
   application, which would read the positions in a pass of its own,
   `iterBlocks`, over the whole file, a second pass for a check; and
   leaving it, with a line of the help alone.

The owner tried the panel on 1 October 2026, in Firefox, with their own
data, and took each recommendation of the report of the plan
(`docs/plans/population-analyses.report.md`, "Stop C" and "For the
owner, as the work goes"). Each is written above where it applies, and
recorded with the option not taken in
`docs/specs/stage-5-open-points.md`, "Decided by the owner on 1 October
2026: the LD decay and the line plot".

## Not in this spec

- The plot: `docs/specs/charts/line.md`.
- A scatter of the r² of single pairs: popnei gives bins and not pairs,
  and the fit is over every pair already.
- The LD between two regions, or a matrix of r² as a heatmap:
  `calcRogersHuffR2Matrix` exists in popnei, and nothing in
  `docs/functionality.md` asks for it.
- The export of the plot as SVG and PNG, in stage 6 with every plot.
