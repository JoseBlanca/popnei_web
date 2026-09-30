# The decisions of the specs of stage 5

30 September 2026, for the owner. Stage 5 of `docs/build-order.md` is
the analyses of the populations: the distances between populations, as a
heatmap and a table; the diversity whole, with F, the private alleles and
the rarefaction; the LD against distance, with the distance at which r²
falls to half; and the folded site frequency spectrum. This file gathers
the nine points the specs of stage 5 ask the owner to decide, 11 to 19;
the ten decisions the owner made on 30 September 2026 before the specs
were written, 1 to 10; what the specs decided alone that a user meets;
what is asked of popnei; and what a measurement will set.

The specs, all written on 30 September 2026 and none yet approved, are
`docs/specs/analyses/popDists.md` with the heatmap,
`docs/specs/charts/heatmap.md`; `docs/specs/analyses/diversity.md`,
revised; `docs/specs/analyses/ldDecay.md` with the line plot,
`docs/specs/charts/line.md`; and `docs/specs/analyses/sfs.md`, the
spectrum; the other specs and documents were brought to them the same
day.

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
The **draw** is the number of chromosomes of the rarefaction, which the
spectrum uses too. The **key** of a result is a hash of everything it
was calculated from: a change of any of those takes the result off the
screen, and an undo brings it back from the cache with no calculation.
The **cache** keeps results in the page, so that an undo brings one
back with no calculation. A **browser engine** is what runs the page:
Chromium in Chrome and Edge, WebKit in Safari. A **panel** is the part of the Analyses step that shows one analysis,
with its Run button, which the panel **locks**, disabled with the
reason beside it, when the analysis cannot run; its state before a Run lists the populations the
Run will take. The **check numbers** are a few numbers of a result that
the project file keeps, so that a project opened again and run says
whether it gave the same numbers; the **key version** of an analysis is
a number raised when its result changes meaning for the same inputs,
so that numbers of an older version are told as calculated in another
way and not blamed on the variants file.

## What is still the owner's

Nine points, in the order of how much of the specs an answer against
the recommendation would change, most first. Each has a meanwhile, with which the
specs are written, so none stops the plan of stage 5; an answer other
than the recommendation changes the specs it names, and the plan if it
comes after the code.

### 11. The spectrum as a block of the diversity, or an analysis of its own

What is decided: whether the folded spectrum shares the diversity's
call of popnei, its pass, its draw and its Run
(`docs/specs/analyses/sfs.md`, **Open 1**).

- **A block of the diversity's panel**, below its table. One Run gives
  the table and the spectra; the spectrum adds no pass, 0.1 to 0.3 ms to
  the call on `panel.nei` held in memory, in node, and one field sets
  the draw of both. A user who wants the spectrum alone waits for the
  whole diversity: today two passes, and one once popnei issue #4 lets
  the diversity make one.
- **An analysis of its own**, with its key, its job and its Run, one
  pass of the spectrum alone, and a field of its own for the draw or the
  diversity's. A user who wants both waits for three passes today, two
  after the issue. A spectrum filled from the diversity's pass, so that
  the second Run costs nothing, would need one calculation to give the
  results of two analyses, which only the counts of the filters of the
  Variants step do today, and that needs a design first.

Recommended: a block of the diversity, since every input of the
spectrum is already an input of the table and the pass is what costs.
Meanwhile, every spec and document is written with it. The other
answer takes the spectrum out of `diversity.md`, its statistic, its
field of the result, its warnings and its block, and makes `sfs.md` an
analysis with a key, a job and a result of its own, which the specs of
the calculation worker, of the frame of the page and of the list of the
analyses gain.

### 12. The calculation worker started again after every LD decay

What is decided: whether the calculation worker is ended and a new one
started after each LD decay. Ending the worker is the only way the tab
gets back the memory popnei took, since popnei's memory never shrinks
while its worker lives
(`docs/specs/analyses/ldDecay.md`, **Open 1**; written as proposed in
`docs/architecture.md` as point 16 of its section 13). The owner
decided on 26 September 2026 not to restart the worker between two
calculations. Two exceptions were decided since: after a written file,
and after a PCA of more than 700 individuals, each because it leaves
more than about 25 MB behind. An LD decay leaves it larger by two things: popnei's
counts of the pairs at each distance, 16 bytes a base pair and
population, 4.8 MB for three populations at 100,000 bp; and the
variants it held within that distance, the larger part. Measured in
node, the memory grew by 64 MB for 100 individuals and 20,000 variants
at 100,000 bp, and by 0.4 to 1.1 GB for 1,000 individuals and the same
variants at 100,000 and 1,000,000 bp, which the tab keeps until the
next load of the variants file.

- **After every LD decay.** The user sees the result as usual; nothing
  loaded is lost, since the page keeps the variants file and the new
  worker opens it again, and the next calculation waits for that, at
  most 49 ms, measured on the `.nei` file of 19 MB and its VCF in
  Chromium 153 and WebKit 26.6 at the end of stage 2, against 0.6 s and
  more for the LD decay itself on 20,000 variants, in node. After a
  new version of the site is put online while the page is open, the
  restarted worker cannot start, and the user saves the project,
  reloads the page and picks the variants file again, as after a cancel
  or a large PCA today. From stage 7 the
  restart would also drop the kinship matrix of the GWAS, which the
  worker keeps between requests, up to 800 MB and minutes to calculate
  again, so the point is decided again then.
- **Above a bound of the individuals and the distance**, as for the
  PCA. By the numbers above, a few hundred individuals pass any bound
  near 25 MB, so the restart would come almost always, and the bound
  would have to be measured in both engines first.
- **Never.** Up to a gigabyte stays with the tab after one LD decay of
  1,000 individuals, and a later calculation that needs memory, a PCA
  of thousands of individuals, may then not fit.

Recommended: after every LD decay. Meanwhile, the specs are written
with it. The plan measures, in Chromium and WebKit, the growth of the
browser 3 s after an LD decay with the restart and without it. With
"never", the restart goes from the specs and from the architecture;
with a bound, the plan measures it before the code.

### 13. A population under the minimum left out of the distances

What is decided: whether the owner's decision 7, which leaves a
population of fewer individuals than the minimum out of the private
alleles, holds for the distances between populations as well
(`docs/specs/analyses/popDists.md`, **Open 4**). popnei's `calcPopDists`
counts a variant for a pair only where both populations have the
minimum of individuals called, so a population under it has no value in
any pair. On `panel.nei`, with 10 individuals of p0 made a population
p0s: the three pairs of p0s had 0 variants and no value, and the other
three pairs gave the same Fst to the last digit with p0s left out
(node, popnei's release `js-v0.1.0-dev.3`).

- **Left out**, named in the panel before the Run, "p3 has 12
  individuals, fewer than the minimum of 20, and is left out.", and in a
  warning after it, with the minimum to lower. The heatmap keeps its
  order by similarity.
- **Sent to popnei**: each pair it is in is a row of "no value" in the
  table and a crossed cell in the heatmap. A pair with no value makes
  popnei's PCoA refuse the matrix, so the heatmap of every population
  loses its order by similarity and keeps the order of the metadata
  file (decision 2).

The numbers of the other pairs are the same in both. Recommended: left
out, since sending it shows nothing the words do not say and costs the
order of the whole heatmap. Meanwhile, the specs are written with it.
The diversity and the distances find the populations under the minimum
with one function and name them in the same words.

### 14. A negative distance, for the order of the heatmap

What is decided: what the order of the heatmap does with a negative
Fst or Jost's D (`popDists.md`, **Open 1**). popnei gives one for two
populations the variants cannot tell apart, and its PCoA refuses it. On
`panel.nei`, p0 split in two halves of 24 gives an Fst of −0.0113.

- **Taken as 0 in the matrix given to the PCoA, and nowhere else.** The
  table, the cell and the tooltip show popnei's value, and a warning
  says the order takes it as 0. The order is kept. It is one comparison
  with 0 made by the application, for the order and never for a number
  shown.
- **The file's order whenever a distance is negative.** The application
  computes nothing; a dataset with two close populations, where the
  order helps most, loses it for every population.

Recommended: taken as 0, since a negative estimate of a distance is an
estimate of 0 that sampling pushed below it. Meanwhile, the specs are
written with it.

### 15. Where the colours of the heatmap start

What is decided: whether the darkest colour of the heatmap is a
distance of 0 or the smallest distance of the matrix (`popDists.md`,
**Open 2**; `heatmap.md`, **Open 1**). The colours run from dark purple
to yellow, 256 steps.

- **From 0.** The colours say how far apart the pairs are. On
  `panel.nei` the three pairs, 0.1027 to 0.1096, fall at steps 239, 245
  and 255 of the 256, where 255 is the lightest yellow: three yellows
  that look alike, which is true, since the three pairs are about
  equally far apart.
- **From the smallest distance.** The colours say which pairs are nearer
  than the others; the same three are the darkest, the middle and the
  lightest, and a difference of 0.007 looks as large as one of 0.3.

Recommended: from 0, since starting from the smallest distance makes
small differences look large, which the principle of nothing that
misleads without warning rules out; the values in the cells and the
table give the differences. Meanwhile, the specs are written with it.

### 16. Many populations

What is decided: what the panel of the distances does with many
populations (`popDists.md`, **Open 3**). The table has a row per pair:
250 populations are 31,125 rows, and a column of 1,000 names chosen by
mistake as the populations gives 499,500 pairs, which a table that
makes an element of the page for each row would take seconds to draw,
an estimate not measured. The heatmap draws up to 200 populations.

- **Above 200, neither the heatmap nor the table**, with words that say
  how many there are, and the table's download as CSV.
- **The analysis locked above 200.** A user with 250 populations cannot
  run it in this version.
- **The table drawn whatever its size.**

Recommended: the first, since the numbers are calculated and can be
taken out, and a column of names chosen by mistake shows its count at
once. Meanwhile, the specs are written with it.

### 17. A MAF filter on the spectrum: a warning, or left out

What is decided: what the spectrum does when the Variants step has a
MAF filter, which removes the variants whose rarer allele is rare in
all the individuals kept, taken together, and so empties the first
bins (`sfs.md`, **Open
2**). On `panel.nei`, the filter at 0.95 removed 25 of the 1,200 variants,
and the share of p2 at one copy of the rarer allele fell from 0.0426 to
0.0367.

- **A warning**: the spectrum reads every filter, as the table does,
  and the warning says what the filter removed and to turn it off. The
  MAF filter is off by default in the population genetics application,
  so a user who sees the warning turned it on.
- **Every filter but the MAF**, as the LD decay reads every filter but
  the LD pruning (decision 8). Whenever a MAF filter is on, the spectrum
  then reads other variants than the table, and needs a pass and a Run
  of its own: for those projects it is the second answer of point 11,
  an analysis of its own.

Recommended: the warning. Meanwhile, the specs are written with it.

### 18. The heights of the bars of the spectrum

What is decided: what a bar of the spectrum measures (`sfs.md`, **Open
3**). popnei gives, for each count of the rarer allele in the draw, the
expected number of the population's variants with that count.

- **Shares**: each bar is a share of the population's variants that
  show both alleles in the draw, so the bars of a population sum to 1;
  the variants that show one allele only are in the table and not
  drawn; one vertical scale serves every population. Populations with
  different numbers of variants then compare by their shapes.
- **popnei's expected numbers**, the bar of one allele only drawn or
  not. Two populations with different numbers of variants then differ in
  height for that reason too.

Recommended: shares, the bar of one allele not drawn. Meanwhile, the
specs are written with it; the table and the CSV give both, so the
answer moves the plot alone.

### 19. Asking popnei to refuse a variants file not sorted by position in the LD decay

What is decided: whether popnei is asked, in a GitHub issue the
orchestrating session opens, to refuse such a file in
`calcLdAndDistPerPop` (`ldDecay.md`, **Open 2**). That function counts
the pairs of a variant with the variants held within the largest
distance of it, and drops a block of variants once none is in reach, so
a file whose chromosomes are interleaved, or whose positions go back,
gives fewer pairs, with no word: 1,517,002 of 1,520,324 pairs on a file
made for it, and 7,785 of 3,044,978 lost with two chromosomes
interleaved (node, `js-v0.1.0-dev.3`). The LD pruning of the Variants
step, popnei's LD filter, refuses such a file already, and the
application has the words for that refusal.

- **Ask popnei**, recommended: the check is popnei's, where the numbers
  are verified, it costs the pass nothing, and it comes with a later
  release. The same issue would ask popnei to keep in the result of
  this call a population named `__proto__`, a name that JavaScript
  treats specially, which popnei loses today.
- **Check it in the application**: a pass of its own over the whole
  file, reading the positions, which on a file of several GB is minutes
  more for each Run, for a check popnei could make in its own pass.
- **Leave it**, with a line of the help.

Meanwhile, the help of the panel says the file must be sorted, and no
check is made; stage 5 does not wait for the release.

## Decided by the writers of the specs, for the owner to overrule

Each is written in its spec with its reason and the option not taken;
none is asked, and each stands unless the owner says otherwise.

The diversity (`docs/specs/analyses/diversity.md`):

- No private alleles when one population alone is in popnei's call,
  "All individuals" or a column of which one population has the minimum:
  popnei would count every allele called as private, 2,304 for "All
  individuals" of `panel.nei`. The three columns say "no value", and a
  warning says why.
- The check numbers the project file keeps stay the number of variants
  and three numbers per population, as in stages 2 to 4, and the key
  version is raised to 3: more numbers would make every project file of
  stages 2 to 4 with a diversity refused at the opening as damaged.
- The table has 11 columns, F after the proportion of polymorphic
  variants, so that the first five columns of the CSV are those of
  stages 2 to 4; the private alleles have three columns, their total,
  their mean per variant and that mean rarefied.
- A draw larger than the chromosomes of the individuals kept locks the
  panel before the Run; without the lock popnei refuses it only after
  the whole first pass.
- A MAF filter raises no warning on the table, since every filter
  changes the variants the means are over; the spectrum warns (point
  17).
- The warning of variants outside the draw comes whenever one variant
  is outside it, the owner's rule of 25 September 2026 for the variants
  without a value, and `docs/functionality.md` says so where it said "at
  few of its variants".
- A haploid file has words for F, which popnei gives as no value.
- The populations under the minimum are named in the panel before the
  Run, as the distances name theirs, "p3 has 12
  individuals, fewer than the minimum of 20, so it will have no values,
  and is left out of the count of the private alleles of the others.";
  decided when the specs were made to agree.

The distances between populations (`docs/specs/analyses/popDists.md`):

- A matrix that no set of points has as its distances, as a matrix of
  Fst often is, is ordered by popnei's PCoA after Lingoes' correction,
  popnei's `correctDistsByLingoes`, which adds one amount to every
  squared distance so that the PCoA accepts the matrix, and keeps its
  first axis: of 200 random matrices of 3 to 10
  populations, 177 were such, and all 200 got the order of the first
  axis of the matrix itself. This settles the first point "Opened by
  the specs", below, but for the negative distances, point 14.
- The minimum of individuals has a field, default 20, since
  populations of 5 to 15 individuals are common in collections of
  varieties and breeds.
- Both measures are calculated in the one pass; the choice of Fst or D
  says only what the heatmap draws, calculates nothing, and is left out
  of the key, as the colouring of the PCA is.
- The panel comes after the diversity in the Analyses step, and the LD
  decay after it.

The LD decay (`docs/specs/analyses/ldDecay.md`):

- The largest major allele frequency of each population, popnei's
  `maxAllowedMaf`, 0.95 by default, is an option of the panel, from 0.5
  to 1.
- The warning of few individuals comes below 20, the minimum of the
  diversity: on popnei's reference file of LD, 10 individuals gave half
  distances of 10,509 to 11,357 bp where 50 gave 7,340 and 7,548.
- The panel locks when popnei's counts of each distance would pass 1 GB,
  40 bytes × the largest distance × the populations: 25,000,000 bp for
  one population, 8,333,333 for three. The plan measures an LD decay at
  that bound in Chromium and WebKit.
- The plot draws at most 16 populations, the rows its legend holds; the
  tables hold all.

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
the file's order serves for all of them was open, and the spec of the
distances settled it but for the negative distances (below, "Opened by
the specs", point 1, and point 14).

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
- **If the owner agrees to point 19**, a second issue: that
  `calcLdAndDistPerPop` refuse a source whose variants are not sorted by
  position, with the message of its LD filter, and keep a population
  named `__proto__` in its result. Not opened yet.

popnei's release `js-v0.1.0-dev.3`, which the application has
installed since stage 4, has every other calculation of the stage, as checked in its code and by running it under node on 30
September 2026: `calcPopDists`, `correctDistsByLingoes` and `doPcoa`,
`calcPopDiversity` with F, the private alleles, the rarefaction and the
folded SFS, and `calcLdAndDistPerPop` with the bins, the fit and the
half distance.

## Set by a measurement, not by the owner

Each has a value in its spec meanwhile, and the plan of stage 5
measures it where its code first meets it:

- **The memory of the LD decay in the browsers**: the growth of the
  browser and its size 3 s after a Run, with the restart of point 12 and
  without it, in Chromium and WebKit, on a VCF of 20,000 variants and
  1,000 individuals, at 100,000 and 1,000,000 bp; and an LD decay at the
  lock of 1 GB of counts, over a file whose positions are not evenly
  spaced, so that most distances hold a pair, with the time of the fit
  that follows the pass and tells no progress; and a file of 1,000
  individuals with a variant every 100 bp at several million base
  pairs, since the lock bounds popnei's counts and not the variants it
  holds within the distance, about 3 to 4 GB there by extrapolation: if
  a tab closes, the lock counts the individuals as well.
- **The time of the second pass of the diversity**, while popnei issue
  #4 is open, on `panel.nei` and on the `.nei` file of 19,161,178 bytes
  of `docs/architecture.md` section 13, so that the owner knows what the
  issue would save.
- **The time of the distances between populations**, on the same two
  files, with three populations and with twenty.

## Opened by the specs

1. **The order of the heatmap when popnei's PCoA refuses the matrix.**
   Found on 30 September 2026 in the documentation of `doPcoa` in
   `js-v0.1.0-dev.3`: it refuses a matrix with a pair that has no
   distance, one with a negative distance, and one that no set of points
   has as its distances. Settled by
   the spec of the distances as its writer's decision, above: a matrix
   that no set of points has as its distances is corrected by Lingoes' method, which keeps the
   first axis; two populations, a pair with no distance, every distance
   0, and any other refusal keep the file's order. The negative
   distances are point 14.
