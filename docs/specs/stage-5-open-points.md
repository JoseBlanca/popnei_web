# The decisions of the specs of stage 5

30 September 2026, for the owner. Stage 5 of `docs/build-order.md` is
the analyses of the populations: the distances between populations, as a
heatmap and a table; the diversity whole, with F, the private alleles and
the rarefaction; the LD against distance, with the distance at which r²
falls to half; and the folded site frequency spectrum. This file gathers
what the specs of stage 5 ask the owner to decide, the ten decisions the
owner made on 30 September 2026 before the specs were written, what is
asked of popnei, and what a measurement will set. The specs are not
written yet, and the file grows with them: what they open goes under
"Opened by the specs". `docs/functionality.md`, sections 6, 7 and 11,
and `docs/build-order.md`, stage 5 and sections 4 and 5, were brought to
the ten decisions the same day.

A few words are used throughout. A **pass** is one reading of the
variants file from start to end, which on a file of several GB takes
minutes. **F** is the inbreeding coefficient of a population, 1 − Ho/He,
the observed heterozygosity over the expected one. The **minimum number
of individuals**, 20, is how many individuals of a population must have a
called genotype at a variant for the variant to count for that
population, in the diversity since stage 2 and in popnei's calculations,
where the option is called `minNumIndividuals`. The **rarefaction**
brings the number of alleles and the private alleles of every population
down to a common number of sampled chromosomes, so that a population of
20 individuals and one of 200 can be compared. The **PCoA** is the
principal coordinate analysis, popnei's `doPcoa`, which places the
populations along axes from their matrix of distances. The **LD decay**
is the mean r² of the pairs of variants against the distance between
them, per population; popnei fits a curve to the pairs, and the **half
distance** is where that curve falls to half of its value at a distance
of 0. The **LD pruning** is the filter of the Variants step that removes
a variant in LD with one already kept. The **calculation worker** is the
second thread of the browser tab in which popnei runs, so that the page
does not freeze; a **job** is one request the page sends it, and a
**call** is one call of a function of popnei inside a job. `panel.nei`
is the test dataset of the application, 200 diploid individuals in three
populations, p0 of 48, p1 of 68 and p2 of 84, and 1,200 variants.

## What is still the owner's

Nothing yet: the ten questions put to the owner are answered, below. The
specs add here what they need decided.

## Decided by the owner on 30 September 2026

The owner answered nine questions, each with its options, and a tenth
follows from the owner's standing rule.

### 1. The distances have no standard errors

"no standard errors". The distances between populations are popnei's
`calcPopDists` with no standard errors. Not taken: standard errors when
the user types the length of the blocks they are resampled over, which
depends on how far the LD reaches in the user's genome; and popnei's
blocks of one variant each, which are right only for unlinked markers.

### 2. The heatmap is ordered by popnei's PCoA of the distances

"OK to a". The heatmap orders the populations along the first axis of
popnei's `doPcoa` of the distance matrix, so that similar ones are
together, and in the order of the metadata file where popnei cannot
place them. Not
taken: a clustering tree written in the application; the file's order
always. The question put to the owner named one way it fails, a pair
with no distance; popnei refuses more matrices than that, and whether
the file's order serves for all of them is open (below, "Opened by the
specs", point 1).

### 3. F is popnei's

"popnei's F". F is popnei's F_IS, the `fis` of `calcPopDiversity`: one
minus the mean observed heterozygosity over the mean unbiased expected
one. Not taken: the application's own 1 − Ho/He from popnei's
heterozygosities, which `docs/build-order.md` section 5 had said.

### 4. popnei is asked for the heterozygosities in the diversity's call

"Could you create an issue in popnei's github asking for that?". The
diversity table takes the expected and observed heterozygosities and the
proportion of polymorphic variants from popnei's `calcPerVarDistribs`,
and F, the alleles, the private alleles and the rarefaction from
`calcPopDiversity`, so it reads the variants file twice. popnei is asked
to give the first three from `calcPopDiversity` as well (below, "Asked of
popnei"). Until it does, the diversity calls both in one job of the
calculation worker, two passes.

### 5. The rarefaction draws the ploidy times the minimum number of individuals

"b, the minimum number of individuals allowed for the calculations". The
number of chromosomes of the rarefaction is by default the ploidy times
the minimum number of individuals, 40 for diploids and 80 for
tetraploids, and a field changes it. Not taken: the smallest population
times the ploidy, which `docs/functionality.md` said, and which rests
every population's values on the smallest. On `panel.nei` that is p0,
48 individuals, so a draw of 96 chromosomes: p0 reaches 96 called
chromosomes at 278 of its 1,200 variants and has rarefied values on
those alone, where a draw of 40
gives all three populations values on all 1,200 (popnei's release
`js-v0.1.0-dev.3` under node, 30 September 2026). Also not taken: no
default.

### 6. The proportion of polymorphic variants is not rarefied

"OK, leave out". On variants of two alleles the rarefied proportion of
polymorphic variants is the rarefied number of alleles minus 1, so it
would show the same thing twice. Not taken: showing it.

### 7. A population under the minimum has no private alleles, and the others keep theirs

"No private alleles for populations with fewer than 20 individuals", and
to the option of blanking the private alleles of every population when
one is under 20: "No, just leave that population out for that analysis".
A population under the minimum is left out of the call of popnei that
gives the private alleles, and shows none, with words that say why; the
private alleles of the others are counted among the populations that
remain, and the words say so. Left in, it would take the private alleles
of every population away: popnei counts them over the variants at which
every population reaches the minimum, and a population of fewer than 20
individuals reaches it at none. On `panel.nei`, with p0 cut to 12
individuals and left in, every population has 0 private alleles. Not taken: a warning and no private alleles for any
population; merging the small population with another.

### 8. The LD decay reads every filter but the LD pruning

"OK". The LD decay reads the variants every filter of the Variants step
keeps but the LD pruning, which would remove the pairs in LD that the
decay measures. Not taken: every filter.

### 9. The LD plot draws the bins, the fitted curve and the half distance

"if you have the numbers for the fitted curve you can draw the curve, no
need to ask popnei for that". The plot draws the mean r² of each bin of
distance and the curve popnei fitted to the pairs, evaluated in the
application from the two numbers of popnei's fit, `rhoPerBp`, by how
much the scaled recombination of the curve grows with each base pair,
and `r2AtZero`, the curve's value at a distance of 0, with a mark at
popnei's half distance, `halfDist`. Not taken:
the bins alone; asking popnei for the points of the curve.

### 10. The LD decay has no default largest distance

Decided by the owner's standing rule of no default that depends on the
genome, which set the distance of the LD pruning in stage 3. The largest
distance between the two variants of a pair, popnei's `maxDist`, has no
default: the user types it, and the analysis cannot run until then, as
the LD pruning cannot. Not taken: popnei's default of 1,000,000 base
pairs.

## Asked of popnei

- **The heterozygosities in `calcPopDiversity`**, popnei issue #4, opened
  on 30 September 2026 (https://github.com/JoseBlanca/popnei/issues/4):
  that `calcPopDiversity` accept `unbiased_exp_het`, `obs_het` and
  `poly_vars_ratio` in its list of statistics, each equal to the last
  digit to what `calcPerVarDistribs` gives, with the options
  `polyThreshold` and `ploidy`, so that the diversity is one pass. Stage
  5 does not wait for it.

popnei's release `js-v0.1.0-dev.3`, which the application has
installed since stage 4, has every other calculation of the stage, as checked in its code and by running it under node on 30
September 2026: `calcPopDists`, `doPcoa`, `calcPopDiversity` with F, the
private alleles, the rarefaction and the folded SFS, and
`calcLdAndDistPerPop` with the bins, the fit and the half distance.

## Set by a measurement, not by the owner

Each gets a value in its spec meanwhile, and the plan of stage 5 measures
it where its code first meets it:

- **The memory of the LD decay against the largest distance the user
  types.** popnei holds every variant within that distance while it
  reads, so its memory grows with it. The owner decided on 26 September
  2026 not to restart the calculation worker between two requests, since
  the memory of wasm stood at 35.5 MB after one diversity and after the
  next, on a `.nei` file of 19,161,178 bytes in Chromium 153 on the
  owner's Mac (`docs/architecture.md`, section 13, point 2), and to
  decide it again with the kinship matrix, which is 800 MB at 10,000
  individuals. The LD decay at a large distance is measured against that
  decision.
- **The time of the second pass of the diversity**, while popnei issue
  #4 is open, on `panel.nei` and on that `.nei` file of 19,161,178
  bytes, so that the owner knows what the issue would save.

## Opened by the specs

1. **The order of the heatmap when popnei's PCoA refuses the matrix.**
   Found on 30 September 2026 in the documentation of `doPcoa` in
   `js-v0.1.0-dev.3`. It refuses a matrix with a pair that has no
   distance, which decision 2 names, and also one with a negative
   distance, which Hudson's F_ST gives for two populations the data
   cannot tell apart, and one that is not Euclidean, whose populations
   cannot be set as points in any space with those distances between
   them, as F_ST, which is not a distance of geometry, can be. On
   `panel.nei`, with three populations, it placed both the F_ST and the
   Jost's D matrices. The spec of the distances, still to be written,
   will say what the heatmap does in each case, and brings it here if it
   is not the file's order.

The specs add their open points here as they are written.
