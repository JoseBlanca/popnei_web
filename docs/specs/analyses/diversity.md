# The diversity of each population

Written on 25 September 2026, and approved by the owner the same day;
revised the same day for `numCheckNumbers` and the line of numbers not
compared, which the owner's decisions on the project file ask for, and
on 26 September 2026 for the words of a VCF that mixes ploidies; and on
26 September 2026 for stage 3, the Variants step whole, as the
architecture approved that day has it: the lock on the filters of
individuals, decided by the owner on 25 September 2026 for stage 2,
goes, and the populations are sent with the individuals the filters
keep, a population left with none left out and named
(`docs/architecture.md`, section 4, "The checks of the Variants step");
`numCheckNumbers` is `null` only with a threshold on the individuals; the
result carries popnei's counts of its pass; and on 26 September 2026,
after its code, for `statisticsFailedText`, the function that gives the
words of the statistics that failed, which the spec gave with no name;
and on 27 September 2026, with the code of the panel, for the words of
the ready state when several populations, or all, are left empty, and
for the name of the bar and the clock while a Run waits for the
statistics of each individual. Revised on 27 September 2026 for stage
4, the Individuals step whole: without a metadata
file, or with the grouping `onePopulation`, the diversity runs on one
population of every individual, "All individuals", as the owner decided
on 25 September 2026 (point A of `docs/specs/stage-2-open-points.md`);
and the functions that make the populations, `populationsOf`,
`populationsToRun`, `populationsKept` and `populationsNeeds`, move to
`src/core/project.ts`, which every analysis per population shares
(`docs/specs/core/project.md`, "The populations"); and again the same
day, to agree with the specs written beside it: no run of stage 4 makes
two passes, and the size of a result of the PCA in the cache, names
included; and again after its review: with the one population, lists of
individuals that leave none lock with the words of the filters that keep
none, and a metadata file named by an opened project and not read locks
it; and after its last review: the result that the read of a metadata
file gives back leaves the notice, and lists that alone leave nobody
lock before a Run, with or without a threshold; and when the specs of
stage 4 were made to agree: the words of the LD filter of the Variants
step over a file not sorted by position, made in one place for every
panel with the PCA's, and popnei's message of a refusal no row foresees
shown without its backquotes, as the PCA's is. Revised on 28 September
2026, when stage 3 was merged into the specs of stage 4:
`populationsBeforeRun`, which stage 3 added to this module on 27
September 2026, moves to `project.ts` with the other functions of the
populations, and `keptNeeds`, the lock the owner decided at stop B on 27
September 2026 when the individuals kept leave no population, gives
nothing for the one population. Revised on 28 September 2026 for the owner's decision that day that the
LD filter of the Variants step starts with no distance: while it has
none, the store locks the diversity with the reason of `variantFilterNeeds` of
`docs/specs/core/project.md`, and the job takes its filters from
`jobFilters`. This changes the code of stage 3, and the plan of stage 4
carries the change. Revised again that day for the owner's decision
that the filters of individuals act first (`docs/architecture.md`,
section 2): the runner puts the list of the individuals kept before the
filters of the variants, which count over those individuals; the key
version is 2; a Run waits for the statistics of each individual once
per load, since they no longer read the filters of the variants; and
the numbers with the thresholds of the flow are recomputed; and, for
the owner's decision of the PCA's own filters, the refusal of a file not
sorted, whose words no longer name the statistics of each individual
and give the PCA's own LD filter in the place of its pruning. The revisions for stage 4 are approved by the owner on 28 September 2026;
they change the code of stage 3 too. Revised on 29 September 2026 after
the review of work package 5 of `docs/plans/individuals-pca.md`: the
first column chosen as the populations locks the diversity as a column
not in the file, as `docs/specs/core/project.md`, "The populations",
now has it; shown to the owner at stop B of that plan.
Revised on 30 September 2026 for stage 5, the diversity whole, as the
owner decided that day (decisions 3 to 7 of
`docs/specs/stage-5-open-points.md`): F, the alleles per variant, the
private alleles and their values rarefied to a common number of
chromosomes join the table, from a second call of popnei in the same
job, `calcPopDiversity`, until popnei issue #4 gives the
heterozygosities in it, and that call gives the folded site frequency
spectrum of `docs/specs/analyses/sfs.md` too; the three options get their fields, the number
of chromosomes of the rarefaction among them; a population with fewer
individuals than the minimum is left out of that second call; the key
version is 3, and the check numbers stay as they were; and the same
day, when the specs of stage 5 were made to agree, the populations
under the minimum split, named in the ready state, and the locks and
two warnings of the populations made by functions the distances between
populations and the LD decay share. The revision for
stage 5 is not yet approved by the owner.
The code of stage 2 is in
`src/core/analyses/diversity.ts`. This spec gives the first analysis of the population genetics
application, in its form for the walking skeleton and, from stage 5,
whole: the module
`src/core/analyses/diversity.ts`, which says what the diversity of each
population is calculated from, when it cannot run, what it asks of the
calculation worker, what it warns of, and what it keeps in the project
file and writes in the Python script; and, after it, the panel of
`src/ui/analyses/diversity/` that shows it. It develops the part of
section 6 of `docs/functionality.md` headed "Diversity", section 4 of
`docs/architecture.md`, whose shape of an analysis it fills, and the row
`analyses/` of its section 9. It depends on the approved specs
`docs/specs/core/keys.md`, `store.md` and `project.md` and
`docs/specs/worker/protocol.md`, and on specs written beside it, whose
parts it relies on are listed at the end, in "What this spec relies on in
the specs written beside it".

The walking skeleton is stage 2 of `docs/build-order.md`, the smallest
application that goes through every part once. For it the owner decided,
on 25 September 2026: the inbreeding coefficient F waits for stage 5, and
so do the mean number of alleles, the private alleles and the
rarefaction, so the table has the expected heterozygosity, the observed
heterozygosity and the proportion of polymorphic variants; both a VCF and
a `.nei` file are read; the types of the columns of the individuals file
are shown and not changed, and the user chooses the column of the
populations; and the project file is written in its full first version.
On the same day the owner decided that stage 2 builds on popnei's
release `js-v0.1.0-dev.2`, which reads the variants file by ranges and
tells the progress of a pass, so the running state has a bar; that the
diversity is calculated with `calcPopDiversity`, with the three columns
above, which that function does not give, so that, as the owner settled
with the approval of this spec, they come from `calcPerVarDistribs` of
the same release, and `calcPopDiversity` waits for stage 5; and the
answers to the points of `docs/specs/stage-2-open-points.md` that this
spec had open, each written below where it applies.

Stage 5 of `docs/build-order.md` makes the diversity whole, and the
owner decided on 30 September 2026, before this revision, with the
options not taken in `docs/specs/stage-5-open-points.md`: F is popnei's
(decision 3); the job calls `calcPerVarDistribs` and `calcPopDiversity`
until popnei gives the heterozygosities in the second (decision 4); the
rarefaction draws by default the ploidy times the minimum number of
individuals, with a field to change it (decision 5); the proportion of
polymorphic variants is not rarefied (decision 6); and a population
with fewer individuals than the minimum is left out of the call that
gives the private alleles (decision 7).

Three words of the documents are used throughout. The **key** of a
result is a hash of everything it was calculated from; the store shows a
result only under the key the current project gives it, so a change of
any of those inputs takes it off the screen, and an undo brings it back
from the cache with no calculation (`docs/architecture.md`, section 3).
The **load** of the variants file is the random id the page gives each
pick of a file, new at every pick, with its read options; every key holds
it. The **check numbers** are a few numbers of a result saved in the
project file, so that a project opened again and run can say whether it
gave the same numbers (`docs/functionality.md`, section 9).

Three more come with stage 5. A **pass** is one reading of the variants
file from start to end, which on a file of several GB takes minutes. A
**private allele** of a population is an allele it called at a variant
where no other population of the calculation called it. The
**rarefaction** brings the count of alleles of every population down to
a common number of chromosomes, the called alleles of a variant, 2 per
individual in a diploid: popnei draws that many of the alleles the
population called at the variant, without replacement, and gives the
count a draw is expected to show, so that a population of 20
individuals and one of 200 can be compared; its option is
`numCalledAlleles`, the **draw**.

## The module

### What it does

For each population it gives, over the variants the filters kept, the
number of individuals the calculation took and nine numbers. The first
three are means over the variants that have a value in the population,
from popnei's `calcPerVarDistribs` (`js/popnei/src/stats.ts`), as since
stage 2:

- the expected heterozygosity, unbiased (Nei's), popnei's
  `unbiasedExpHet.mean`;
- the observed heterozygosity, `obsHet.mean`;
- the proportion of polymorphic variants, `polyVarsRatio.polyRatio`: the
  variants whose commonest allele has a frequency below 0.95 in the
  population, over the variants that have a value there.

The other six, from stage 5, are of popnei's `calcPopDiversity`
(`js/popnei/src/diversity.ts`):

- F, `fis`: one minus the mean observed heterozygosity over the mean
  unbiased expected one, Nei's F_IS of the population on its own; 0 when
  its genotypes are in the proportions its allele frequencies give under
  random mating, positive with fewer heterozygous genotypes than that,
  negative with more. It is popnei's, as the owner decided on 30
  September 2026 (decision 3), and not the application's 1 − Ho/He on
  the two columns before it; on `panel.nei` the two are equal to the
  last digit (below, "How it is verified").
- the alleles per variant, `numAlleles.mean`: the alleles the
  population called, summed over the variants that have a value in it,
  over those variants;
- the same rarefied, `numAlleles.inDraw`: the alleles a draw is
  expected to show, averaged over the variants at which the population
  called at least the draw;
- the private alleles, `privateAlleles.total`, summed over the variants
  at which every population of the call has a value, `numVarsEveryPop`;
  popnei counts them only there, since at a variant where one population
  has too few genotypes every allele of the others would be private;
- the private alleles per variant, `privateAlleles.mean`, that total
  over `numVarsEveryPop`;
- the same rarefied, `privateAlleles.inDraw`, over the variants at which
  every population of the call reaches the draw,
  `numVarsEveryPopInDraw`.

popnei's numbers are verified in popnei, those of `calcPerVarDistribs`
against plink2 and pyNei, and the application computes none of them.
The proportion of polymorphic variants is not rarefied, as the owner
decided on 30 September 2026 (decision 6): on variants of two alleles
its rarefied value, popnei's `variableVarsRatio.inDraw`, is the rarefied
alleles per variant minus 1. The job does not ask for
`variableVarsRatio`.

The owner decided on 25 September 2026 that the diversity is built on
`calcPopDiversity` of `js/popnei/src/diversity.ts`, with these three
columns in stage 2 and F, the private alleles, the rarefaction and the
spectrum in stage 5. Read in the release, `calcPopDiversity` gives, for
each population, five statistics: `numAlleles`, the alleles it called;
`privateAlleles`, those no other population called at the same variant;
`variableVarsRatio`, the variants at which it called more than one
allele, over the variants that count for it; `foldedSfs`, the folded
spectrum of a draw; and `fis`, F_IS, one minus the mean observed
heterozygosity over the mean unbiased expected one. Its options are
`stats`, the four that need no draw by default; `pops`; `numCalledAlleles`,
the size of the draw of the rarefaction, none by default; and
`minNumIndividuals`, 20 by default, the called alleles of the population
over the ploidy, a variant with strictly fewer not counting for it. It
has no `polyThreshold`: a variant is variable in a population when it
called two alleles there, however rare the second. So it gives neither
of the two heterozygosities, which F_IS is computed from and which it
does not return, nor the proportion of polymorphic variants below 0.95;
on `panel.nei` with no filter its variable share of p0 is 0.9775, 1,173
of 1,200 variants, where the polymorphic share of `calcPerVarDistribs`
is 0.9266666666666666, 1,112 of 1,200 (node, 25 September 2026, the
release; the whole table is in point D of
`docs/specs/stage-2-open-points.md`). The three columns the owner named
come from `calcPerVarDistribs` of the same release, which gives the
numbers of the release before to the last digit, as the owner settled
on 25 September 2026. `calcPopDiversity` is the function
of stage 5, whose F, alleles, private alleles and spectrum are its
statistics.

So from stage 5 one job of the calculation worker makes two calls of
popnei, `calcPerVarDistribs` and then `calcPopDiversity`, over the same
steps, and reads the variants file twice, as the owner decided on 30
September 2026 (decision 4). popnei is asked, in its issue #4, to give
the two heterozygosities and the proportion of polymorphic variants in
`calcPopDiversity`, each equal to the last digit to what
`calcPerVarDistribs` gives. When a release has them, the job makes one
call and one pass, and nothing else a user sees changes: the same
columns, the same check numbers, the same warnings; the runner's test
asserts the same numbers, `DiversityResult` keeps its fields, and the
key version is raised, since another popnei function gives the three
columns (below, "What goes into its key"). Stage 5 does not wait for it.
How long the second pass takes is measured by the plan of stage 5
(`docs/specs/stage-5-open-points.md`, "Set by a measurement").

The folded site frequency spectrum of each population, which
`calcPopDiversity` gives as well, is a statistic of the diversity's
call, as `docs/specs/analyses/sfs.md` gives it and recommends in its
**Open 1**, which the owner decides: the job asks for `folded_sfs`
beside the rest, at the same draw and in the same pass, and the panel
draws the spectra in a block below the table. popnei gives it in that
call for 0.1 to 0.3 ms more on `panel.nei` held in memory, and no pass
more (`sfs.md`, "What it does"). The other answer makes the spectrum an
analysis of its own, with its job, its pass and its Run, and this spec
then asks popnei for no `folded_sfs`, carries no `foldedSfs`, appends no
warnings of the spectrum and has no block below its table: a user who
wants both reads the file three times today, twice once popnei issue #4
is closed. Until the owner decides, this spec is written with the
spectrum in it, and the spectrum's module is `src/core/analyses/sfs.ts`
of that spec, which this module calls.

What a user would see go wrong because of this module, and what each rule
below prevents: a table of other settings shown as current, when the key
misses an input; a population whose row is empty with no word why; the
means of two populations compared over different variants, unsaid; a
run refused by popnei with a message about its arguments, when the
module could have said beforehand what was missing; from stage 5, the
private alleles of every population gone because one population is
small, and a count of private alleles where there is no other
population to hold the allele.

Three numbers decide what the user reads. The first two are popnei's
defaults, and had no control in the walking skeleton; from stage 5 each
of the three has a field in the panel:

- **A variant has a value in a population only when at least 20 of its
  individuals have a called genotype there**, `minNumIndividuals`, 20 when
  it is not given. The test is on the called alleles of the population,
  the alleles the file gives and does not mark as missing, divided by
  the ploidy, the number of alleles a genotype holds, 2 in a diploid; so
  a genotype with one allele of two called, `0/.`, counts a half, and a variant
  below it is out of the mean of that population. A population of fewer
  than 20 individuals has no value at any variant, and all three of its
  numbers are NaN.
- **A variant is polymorphic when its commonest allele is below 0.95**,
  the frequency of that allele among the called alleles of the
  population, `polyThreshold`, strictly: a variant at exactly 0.95, 38
  of 40 alleles, is not. The owner decided on 25 September 2026 that the
  application says "below 0.95", as popnei and pyNei calculate, and that
  section 6 of `docs/functionality.md`, which said "at most 0.95", is
  corrected.
- **The rarefaction draws the ploidy times the minimum number of
  individuals**, 40 chromosomes for diploids at the minimum of 20 and
  80 for tetraploids, never fewer than 2, the smallest draw popnei
  takes, as the owner decided on 30 September 2026 (decision 5). The
  project holds `numCalledAlleles` `null` for this default, and `run`
  makes the number from the ploidy of the variants file, which the load
  fixes, and the minimum; a number the user types is kept as typed,
  and no longer follows the minimum. At the default every variant with
  a value in a population is in its draw, whenever the ploidy times the
  minimum is 2 or more: a value asks for at least the
  minimum times the ploidy called alleles, which is the draw, so the
  rarefied values are over the same variants as the others; on
  `panel.nei` every population reached the draw of 40 at each of the
  1,152 variants of the missing data filter at 0.05. A larger draw
  leaves out the variants at which a population called fewer, which
  `variantsNotInDraw` says (below). The option not taken, the smallest
  population times the ploidy, rests every population's values on the
  smallest: on `panel.nei` a draw of 96, twice the 48 of p0, gave p0
  rarefied values at 277 of those 1,152 variants.

The three are options of the analysis. A project holds them only once the
user sets one, and until then the analysis runs with its defaults, 20,
0.95 and the default draw, `DIVERSITY_DEFAULTS` (`docs/specs/core/project.md`, "an
analysis with no entry runs with its defaults"); until stage 5 no
control set them, so a project of stages 2 to 4 holds no entry for the
diversity, and its project file writes none. The module gives the
three numbers to popnei explicitly, the draw as a number,
whether they come from an entry or from the defaults, and the Python
script writes them, so that the script says what the numbers were made
with. The option not taken was to leave them out of the call and let
popnei use its own defaults: the result would be the same today, but the
script would not show the numbers, and a new popnei with other
defaults would change the numbers of a project that says nothing of
them.

### The populations

The populations are those the project defines, made by the functions of
`docs/specs/core/project.md`, "The populations", which the module of the
diversity exported until stage 4: those of the column of the metadata
file that the user chose; or, without a metadata file, or with the
grouping `onePopulation`, one population, "All individuals", of every
individual of the variants file. With a column:

- **A population is named by the text of its cell**, whatever type the
  column has: a column of two populations, `P1` and `P2`, inferred
  binary, gives the populations `P1` and `P2`, and not 1 and 0. In a CSV
  every cell is text already; a number or a boolean of an xlsx is
  written with `String`, `1.5`, `true`.
- **An individual whose cell is missing**, empty, `NA` or `-`, belongs
  to no population and is left out of the calculation
  (`docs/functionality.md`, section 4), with a warning (below).
- **The populations are in the order in which each first appears in the
  file, and the individuals of each in the order of the file.** The table
  shows them in that order, which is the user's own. popnei gives its
  arrays in the order of the keys of the object it is given, and
  JavaScript iterates keys that are whole numbers, `"1"`, `"10"`, `"2"`,
  first and in numeric order; the runner puts popnei's arrays back into
  the order of the request (`docs/specs/worker/runner.md`, "The diversity"), so a file
  with populations named 3, 1 and 2 shows them as 3, 1, 2.
- **Only individuals of the variants file go into the request.** An
  individual of the individuals file that is not in the variants file is
  ignored, as `docs/functionality.md` section 4 allows, since popnei
  refuses a population that names an individual it does not have; a
  population left with none is not sent, since popnei refuses an empty
  one.
- **Only the individuals the filters of individuals keep go into it.**
  The store hands `run` the list of the individuals kept, through the
  client bound to the key, `c.individuals`, `null` when the filters
  remove nobody (`docs/architecture.md`, section 4). Each population is
  narrowed to it, and a population that the filters leave with no
  individual is left out of the request, since popnei refuses an empty
  population, and named before the run, in the ready state of the panel,
  and after it, in the warning `populationNotInResult` (below).

The one population is every individual of the variants file, in the
order of the file; with the filters of individuals, those they keep. A
metadata file given with the grouping `onePopulation` holds every
individual of the variants, or the diversity is locked (below), so the
one population is the same with the file and without it.

`populationsOf(p)` of `project.ts` gives the populations as the key
holds them, from the project alone, those of the column or `"all"`;
`populationsToRun(p)` narrows them to the individuals of the variants
file, as the Individuals step lists them; and `populationsKept(p,
kept)` narrows those to a list of individuals kept, and gives the
populations it leaves empty apart, as `run` sends them.
`populationsBeforeRun(p, kept)` of `project.ts` gives the populations as
they are known before a Run, from the individuals kept of
`individualsKept` (`docs/specs/core/individualsKept.md`):
`populationsKept` with its list when the list is known, and, while a
threshold on the individuals waits for the statistics of each
individual, with `byLists`, the individuals the lists to keep and to
remove keep, since the thresholds can only remove more; for the one
population, "All individuals" narrowed in the same way. The ready state
of the panel and the summary line of the shell both list them through
it, so the two never disagree (`docs/specs/core/project.md`, "The
populations"). The key holds the thresholds of the filters of
individuals and not the list, which is made from a result in the cache
(`docs/architecture.md`, section 3).

**The populations of `calcPopDiversity`** are those of the request with
at least `minNumIndividuals` individuals, in the same order, as the
owner decided on 30 September 2026 (decision 7). A population with
fewer has a value at no variant, so all its numbers are NaN whether it
is in the call or not, but in the call it would take every variant out
of the private alleles of the others, which popnei counts over the
variants at which every population has a value: on `panel.nei` with the
missing data filter at 0.05, p0 cut to its first 12 individuals and
left in gave 0 variants of that kind and no private alleles to any
population, and left out gave p2 22 and p1 16. So it is left out, its
row shows "no value" in the six columns, as in the other three, and the
warnings `tooFewIndividuals` and `privateAllelesWithoutSmall` say why
and that the private alleles of the others are counted among the
populations that remain. The options not taken were a warning with no
private alleles for any population, and merging the small population
with another. With no population of enough individuals, `calcPopDiversity`
is not called, and the job makes one pass.

**Private alleles need two populations in that call.** With one, popnei
counts every allele the population called as private, since no other
population holds it: "All individuals" of `panel.nei` had 2,304 private
alleles, two at each of the 1,152 variants. That number would mislead,
so the job then does not ask popnei for the private alleles, their
three columns show "no value", and `privateAllelesNeedTwoPopulations`
says why; this holds for the one population and for a column of whose
populations one alone has enough individuals. Decided on 30 September
2026 by the writer of this revision, from the definition of section 6
of `docs/functionality.md`, "found in this population and in no other".

### What goes into its key

The store makes the key of the analysis with `keyOf` of
`docs/specs/core/keys.md`, which puts in itself the id `diversity`, the
key version, the version of popnei, the load of the variants file and
the filters. `filtersRead` is `{ variants: true, individuals: true }`:
every filter changes which genotypes the means are over.

`keyInputs(p)` gives the rest:

```ts
{
  pops: Pops | "all" | null,
  options: { minNumIndividuals: number, polyThreshold: number, numCalledAlleles: number | null },
}
```

`pops` is `populationsOf(p)`: every population of the column with every
individual of the file that has it, in the order above, as pairs
`[population, individuals]`; `"all"` for the one population, whose
individuals the load of the variants file, in every key, fixes; `null`
when a metadata file is not read, when no column is chosen in it, or
when the table has no column of that name. `options` are those of the project for
`diversity`, or the defaults; `numCalledAlleles` is `null` for the
default draw, and the key holds `null` and not the number, since the
number is made from the ploidy, which the load in every key fixes, and
from `minNumIndividuals`, which is beside it. It does not read `p.variants`, as keys.md
asks, and so it holds the individuals of the file that are not in the
variants file too: a change to one of them costs a calculation and shows
nothing stale.

What `run` and `warnings` read beyond `keyInputs` is the list of the
individuals of the variants file, which is a function of the load, already in the key:
the same load gives the same individuals. What `warnings` reads beyond it
is the name of the variants file, which is also fixed for a load. The
warnings name no individuals file and no column, whose names are not in
the key: a second individuals file with the same populations under
another name finds the result of the first, and a warning that named the
first file would be wrong.

Not in the key, because the numbers do not depend on them: the name of
the column, so that two columns that make the same populations share a
result; the other columns of the table; the types of the columns; the
name, the load id and the options of the CSV of the individuals file,
when the table they give is the same (`docs/specs/core/keys.md`, "The
cases"); the options of the other analyses; the reference of an opened
project file; anything of the screen, the sort of the table, a colour.

The key version is 3. It is raised when what the result means changes
for the same inputs: another popnei function, another statistic asked,
a new field in the result. It was raised to 3 on 30 September 2026 for
stage 5, whose result has the six numbers of `calcPopDiversity`; the
check numbers, which stay the same, are compared with those of a file
saved by stage 4, and a difference is told as numbers "calculated in
another way" (`docs/specs/core/projectFile.md`). It was raised to 2 on 28 September 2026,
when the filters of individuals came before those of the variants: a
project with a filter of individuals gives the same key and another
result, since the filters of the variants now count over the
individuals kept, and a project file saved by stage 3 would otherwise
compare its check numbers with the new ones as if its variants file
had changed.

What changes the key, which the test of the key checks row by row
(`.claude/skills/coding/SKILL.md`, "Keys"):

| change to the project | the key |
|---|---|
| a new load of the variants file, the same file included | changes |
| the ploidy or `onlyPassed` of a VCF | changes |
| the name of the variants file, or its read recorded | same |
| a filter of the variants added or removed, or its threshold | changes |
| a filter of individuals added or removed, a name of its list, or its threshold, whether or not it keeps other individuals | changes |
| another column of the populations that groups the individuals otherwise | changes |
| another column that makes the same populations with the same names | same |
| the metadata file removed, with a column chosen; or the grouping set to `onePopulation` | changes, to `"all"` |
| the metadata file removed, with `onePopulation`; or a metadata file loaded with `onePopulation` | same: `"all"` with the file and without it |
| a cell of the column of the populations, one of an individual not in the variants file included | changes |
| a cell of another column | same |
| the rows of the file in another order | changes: the order of the table follows it |
| the type of a column | same |
| the same table from another file, or with other options of the CSV | same |
| `minNumIndividuals` or `polyThreshold` | changes; the default draw follows `minNumIndividuals` |
| `numCalledAlleles` typed, or set back to the default | changes, also when the number typed is the default's: a calculation more, and nothing stale |
| the options of another analysis, the reference | same |
| the key version, the version of popnei | changes |

### Why it cannot run

The store asks `projectNeeds` of `docs/specs/core/project.md` first,
which gives the reasons every analysis shares: no variants file, "Load a
variants file in the Variants step."; the file being read, "Reading
panel.nei."; the file refused or not read. Then, since the diversity
reads the filters of individuals, `individualListNeeds`, the lists of
individuals that popnei would refuse; and, since it reads the filters
of the variants, `variantFilterNeeds` of the same spec, the LD pruning
of the Variants step with no distance, "The LD pruning of the Variants
step needs the distance within which variants are compared. It has no
default, because it depends on how far linkage disequilibrium extends
in the genome of your species. Type a distance in base pairs, or turn
off the LD pruning, in the Variants step.", in the order in which the
filters act, which the PCA's reasons follow too
(`docs/specs/core/store.md`, "The definition of an analysis"). Then
`needs` of this module gives the first of
these, in the words the panel shows beside its Run button:

| the project | the reason |
|---|---|
| any reason of `individualsNeeds` (`project.md`), in the words of the population genetics application, which calls the file the metadata file, as the owner decided on 25 September 2026: the file being read, "Reading pops.csv."; its read refused or failed; the file of an opened project not read when it was saved, "pops.csv was not read when this project was saved, so the project file does not hold it. Load pops.csv again in the Individuals step."; individuals of the variants missing from it, "12 individuals of panel.nei are not in pops.csv: ind_031, ind_044 and 10 more. Add them to the file and load it again in the Individuals step." From stage 4, no metadata file is no reason | its words |
| a metadata file read, and no column of the populations chosen | "Choose the column that defines the populations, or all individuals in one population, in the Individuals step." |
| the table has no column of that name, after a new load of the file | "pops.csv has no column popcat, from which the populations were taken. Choose the column that defines the populations, or all individuals in one population, in the Individuals step." |
| no individual of the variants file has a population in the column | "No individual of panel.nei has a population in the column popcat of pops.csv. Fill in the column and load the file again, or choose another column, in the Individuals step." |
| a column of the populations, and the lists of individuals to keep and to remove leave no individual that has a population in it, known from the project alone | "The lists of individuals to keep and to remove leave none of the individuals of panel.nei that have a population in popcat, so no population is left. Change the lists in the Variants step." |

Without a metadata file, or with the grouping `onePopulation`, only the
first row can lock the diversity, and only with a file. Lists that leave
none of the one population leave no individual at all, which the store
locks with the words of `keptNoneReason`, "The filters of individuals
keep none of the 200 individuals of panel.nei. Loosen them in the
Variants step." (`docs/specs/core/individualsKept.md`), the words the
Variants step shows for the same condition, so that the last row, given
for the one population too, would be a second text for it. With a threshold on the
individuals as well, that lock waits for the statistics of each
individual, which a Run calculates first, but when the lists alone
leave nobody: the list kept is then known and empty whatever the
thresholds, and the store locks before a Run, with no statistics
calculated (`docs/specs/core/individualsKept.md`, "What it does").

The lock of stage 2 on any filter of individuals, which the owner
decided on 25 September 2026 while the filters of individuals did not
exist, goes with stage 3. The last row is known from the lists, which the
project holds; with a threshold on the individuals, which can only remove
more, the list kept waits for the statistics of each individual. Three
locks are the store's and not of `needs`, since they read the cache
(`docs/architecture.md`, section 4): a Run with a threshold whose
statistics are not in the cache starts them first; the filters
keeping no individual stop the Run, in the words of `keptNoneReason` of
`docs/specs/core/individualsKept.md`, "The filters of individuals keep none of
the 200 individuals of panel.nei. Loosen them in the Variants step.";
and the individuals kept leaving no population lock the diversity, in
the words of its `keptNeeds`, which say why with the number the
filters keep and the column of the populations, "The 34 individuals kept have no population in popcat, so none of the 2 populations has an individual left. Loosen the filters of individuals in the Variants step to keep them.", or, of
one individual kept, "The one individual kept has no population in
popcat, …", and, with one population, "…, so p0 has no individual left.
Loosen the filters of individuals in the Variants step to keep it.",
as the owner decided at stop B on 27 September 2026, in
place of popnei's refusal after the Run of their decision of 26
September 2026: a Run that could only fail taught nothing the line of
the ready state did not already say. While the list waits for the
statistics, a Run calculates them first, and then ends locked with those
words, the Run not sent (`docs/specs/shell.md`, "Diversity was not
run"). For the one population, `keptNeeds` gives no reason of this
kind: every individual kept is in it, and filters that keep none are
locked first, with the words of `keptNoneReason`.

From stage 5 a draw larger than the chromosomes of the individuals
kept locks the diversity, for the one population too, decided by the
writer of this revision. popnei refuses such a draw at the first range
it reads: a call of `calcPopDiversity` with a draw of 401 over the 400
chromosomes of the 200 individuals of `panel.nei` told its progress at
0 and 2,224 bytes of 261,490 and threw (node 26.8.2, `js-v0.1.0-dev.3`,
30 September 2026). In the diversity's job that call is the second, so
without the lock a user would wait for the whole first pass to be told
the draw is too large. popnei counts the individuals of its pass, those
`filterIndividuals` keeps: a draw of 40 over a list of 15 was refused,
"the largest draw this dataset allows is 30". So the lock counts
individuals times the ploidy, and locks only when some population of
the request has the minimum of individuals, since otherwise
`calcPopDiversity` is not called; the default draw never locks, since
a population of the minimum holds it. It is in two places, so that it
comes before a Run whenever the project alone tells it:

- **`needs`**, last, counts `byLists`, the individuals the lists to
  keep and to remove keep, every individual of the file with no list
  (`docs/specs/core/individualsKept.md`), which the thresholds on the
  individuals can only make fewer. So a draw above them locks with no
  statistics calculated: "The rarefaction draws 401 chromosomes, and
  the 200 individuals of panel.nei hold 400 at a ploidy of 2. Type a
  number of chromosomes of at most 400 in the options of the
  diversity.", with no list; with a list, "…and the 45 individuals the
  lists of individuals keep hold 90 at a ploidy of 2. Type a number of
  chromosomes of at most 90 in the options of the diversity, or change
  the lists in the Variants step."
- **`keptNeeds`**, after its reason of no population, counts the list
  kept once the thresholds have made it, as the PCoA's `keptNeeds`
  counts its individuals (`docs/specs/analyses/pca.md`, "Why it cannot
  run"), and gives a reason only when that list is shorter than
  `byLists`, which `needs` has already counted: "The rarefaction draws
  100 chromosomes, and the 45 individuals the filters of individuals
  keep hold 90 at a ploidy of 2. Type a number of chromosomes of at most
  90 in the options of the diversity, or loosen the filters of
  individuals in the Variants step."

The owner decided on 25 September 2026 that the metadata file, and a
column of populations chosen in it, are required in stage 2, and
optional from stage 4, when the Individuals step is whole. So, from
stage 4, a project with no file runs on one population of every
individual, and so does one whose grouping is `onePopulation`, which the
Individuals step offers beside the columns. A project with a file and no
column chosen, `column: null`, still locks, with the words above, which
from stage 4 name the one population as a choice: the user who loaded a
file is asked what it defines rather than given one population they did
not choose.

The second to the fourth rows, the reasons about the column of the
populations, are given by `populationsNeeds(p)` of `project.ts`
(`docs/specs/core/project.md`, "The populations"), whose words they
are, with the kind of each, so that the stepper of the shell shows the same
text for the same condition, "To do" for no column chosen and "Problem"
for the two others (`docs/specs/shell.md`, "The stepper"), and the
Individuals step shows it at its select (`docs/specs/steps/individuals.md`,
"Its words"); `needs` gives it after the first row, and the row of the
lists last. The individuals the lists keep are `byLists` of
`individualsKept` (`docs/specs/core/individualsKept.md`), known with no
statistics. From stage 5 the row of the lists is
`populationListsNeeds(p)` of `project.ts`, and the reason of the
individuals kept leaving no population, which `keptNeeds` gives first,
is `populationsKeptNeeds(p, kept)`, with the same words, since the
distances between populations and the LD decay lock on them too
(`docs/specs/core/project.md`, "What the analyses per population share
from stage 5").

The names of the files, of the column and of the individuals are shown
with the helpers `project.ts` exports, `shown`, `escaped`, `namesOf`,
`counted` and `grouped`, which escape and cut them, and count with a
comma between groups of three digits (`project.md`, the rules after the
first table). A project of the association application,
whose grouping has roles, is a defect: the diversity is not among its
analyses.

### The request

`run(p, c)` builds the request and sends it through the client the store
bound to its key, `c.run(job)`, and returns the handle. The store calls
it only when `needs` gives `null`, so the variants file is read.

```ts
{
  analysis: "diversity",
  fileId: p.variants.fileId,
  filters: jobFilters(p.filters), // the project's, whose LD filter has its distance
  individuals: c.individuals, // the individuals kept, in the order of the variants
                              // file; null when the filters remove nobody
  pops,                     // populationsKept(p, c.individuals).pops: the populations
                            // of the variants file narrowed to the individuals kept,
                            // empty populations dropped
  minNumIndividuals: 20,    // the options of the project, or the defaults
  polyThreshold: 0.95,
  numCalledAlleles: 40,     // the draw as a number: the one typed, or the default's
  popDiversityPops: ["p0", "p2", "p1"], // the populations of pops with at least
                            // minNumIndividuals individuals, in its order
}
```

`popDiversityPops` is made by `run` from the individuals of each
population it sends, the names of `withMinimum` of
`populationsWithMinimum(pops, minNumIndividuals)` of `project.ts`, the
function the distances between populations split their populations
with too, so the rule of decision 7 is core's, made once, and the runner
only follows it.

The field `individualFilters` of stage 2, always empty there, becomes
`individuals`, the list the filters make, as the architecture has every
job that reads the filters of individuals carry it (`docs/architecture.md`,
section 4).

What the runner does with it, as
`docs/specs/worker/runner.md`: it puts `filterIndividuals(individuals)`
on the open `Variants` when the list is not `null`, and then the filters
of the variants in their order, after it, so that the filters of the
variants count over the individuals kept, as the owner decided on 28
September 2026 (`docs/architecture.md`, section 2); it calls
`calcPerVarDistribs(variants, { pops: Object.fromEntries(pops), stats:
["obs_het", "unbiased_exp_het", "poly_vars_ratio"], minNumIndividuals,
polyThreshold })`, which asks popnei for the three statistics shown and
changes no value of them; then, from stage 5, when `popDiversityPops` is
not empty, it calls `calcPopDiversity(variants, { pops:
Object.fromEntries(pops of popDiversityPops), stats, numCalledAlleles,
minNumIndividuals })` over the same steps, `stats` being `["num_alleles",
"fis", "private_alleles", "folded_sfs"]`, or without `private_alleles`
when `popDiversityPops` holds one population (`folded_sfs` for the
spectrum of `docs/specs/analyses/sfs.md`, above); and it answers with the result below, every
array in the order of the populations of the request, the six of
`calcPopDiversity` NaN, its counts 0, and its spectrum `null`, for a
population not given to it.

The progress of the two calls is one run of two passes: the runner
tells the first call's as `pass` 1 and the second's as `pass` 2, with
`numPasses` 2, where popnei gives each call as `pass` 1 of 1, so that
the bar fills once over the two; with no second call, `numPasses` is 1.
`calcPerVarDistribs` goes first so that the refusals of a file or of
the filters, which come at the first pass, are its messages, which the
panel already reads ("Its words"); the refusals of the second call
that `needs` and `keptNeeds` cannot rule out are told as any other
refusal.

```ts
{
  analysis: "diversity",
  pops: readonly string[],        // the populations popnei was given, in the request's order
  numIndividuals: Uint32Array,    // the individuals of each that popnei was given
  unbiasedExpHet: Float64Array,   // unbiasedExpHet.mean; NaN for no value
  obsHet: Float64Array,           // obsHet.mean
  polyRatio: Float64Array,        // polyVarsRatio.polyRatio
  numVarsWithValue: Uint32Array,  // polyVarsRatio.totNumVariantsWithData
  // from stage 5, of calcPopDiversity; NaN, or 0 for a count, for a
  // population not given to it
  fis: Float64Array,
  numAllelesMean: Float64Array,   // numAlleles.mean
  numAllelesInDraw: Float64Array, // numAlleles.inDraw
  privateAllelesTotal: Float64Array,  // privateAlleles.total; NaN when not asked
  privateAllelesMean: Float64Array,   // privateAlleles.mean
  privateAllelesInDraw: Float64Array, // privateAlleles.inDraw
  numVarsInDraw: Uint32Array,     // numVars.inDraw
  numVarsEveryPop: number | null, // null when the private alleles were not asked
  numVarsEveryPopInDraw: number | null,
  numCalledAlleles: number,       // the draw of the request, which the columns name
  foldedSfs: readonly (Float64Array | null)[], // foldedSfs of each population, by its
                                  // name, in the request's order; null when not given
  passStats: PassStats,           // popnei's counts of the first pass
}
```

`numVarsInDraw` is, for each population, the variants at which it has
a value and called at least the draw, the divisor of its rarefied
alleles; at the default draw it equals `numVarsWithValue`, but for a
draw of 2 at a minimum of 0, or in a haploid file at a minimum of 1
(`variantsNotInDraw`, below). When no
population is given to `calcPopDiversity`, the six arrays of its
numbers are NaN, `numVarsInDraw` 0, `numVarsEveryPop` and
`numVarsEveryPopInDraw` `null`, and every entry of `foldedSfs` `null`;
`numCalledAlleles` is the draw of the request in every case.

`privateAllelesTotal` is a `Float64Array` and not popnei's
`Uint32Array`, so that a population without private alleles has NaN,
"no value", and not 0, which would read as a count. The two passes
have the same steps, so the counts of the second are those of the
first, and the result carries the first's.

`passStats` is popnei's counts of the pass, given with its result:
`numVars`, the variants the pass gave after every filter, and, for each
filter of the variants in its order, the variants it was given,
`varsProcessed`, and those it kept; the filter of individuals has no
entry. Every result of stage 3 carries them, in place of the `numVars`
and `numVarsRead` of stage 2 (`docs/specs/worker/protocol.md`). `numVars`
below is `passStats.numVars`, the variants the filters kept. From them
`countsOf` of `src/core/apps.ts`, the function the entry gives the store
in place of `numVarsOf`, gives the number of variants of the file, which
the store records into the variants file of the load, and the counts of
the filters, which it puts under the key of `filterCounts`
(`docs/specs/analyses/filterCounts.md`, "Which results fill it").

popnei refuses the call in the cases its `@throws` lists. The module rules
out those it can see: a population that names an individual popnei does
not have, an empty population, a threshold out of its range, and no
population when the lists of individuals leave none. No population left
by a threshold is told by popnei's refusal ("Its words"). Of the
refusals of `calcPopDiversity`, a draw below 2 cannot be given, since
`parseOptions` and the field take none; a draw above the chromosomes of
the individuals kept is locked by `needs` and `keptNeeds`; a call with no
population is not made; and the spectrum, which needs a draw, is
asked for only with the draw that every request carries. The two it cannot see are the filters keeping no variant, "the
pass gave no variant: its source gave 1200 and the steps kept none of
them, ...", and a variants file that holds none, "the pass gave no
variant and its source holds none: ...", which is also the refusal of a
VCF read with only the passed variants of which none passed; the panel
says each in the
user's words (its error state, below).

### The warnings

`warnings(r, p)` gives them from the result and the project the request
was made from, in this order; each has its code, which the tests assert,
and its text. Each lists the populations or individuals it is about as
`project.md` lists individuals: three or fewer by name, more as the
first two and how many more.

| code | when | the text |
|---|---|---|
| `tooFewIndividuals` | a population has fewer individuals in `numIndividuals` than `minNumIndividuals` | "Population p3 has 12 individuals, and a variant has a value in a population only when at least 20 of its individuals have a called genotype there, so p3 has no values. To have them, merge it with another population in the metadata file, or lower the minimum number of individuals in the options of the diversity." With two or three: "Populations p3 and p5 have fewer than 20 individuals, 12 and 8, and a variant has a value in a population only when at least 20 of its individuals have a called genotype there, so they have no values. To have them, merge each with another population in the metadata file, or lower the minimum number of individuals in the options of the diversity." With more than three, the counts are left out: "Populations p3, p5 and 4 more have fewer than 20 individuals, and ..." When the filters of individuals removed some of the individuals of one of them, the last sentence ends "…in the options of the diversity, or loosen the filters of individuals in the Variants step." For the one population, which has no metadata file to merge in: "All individuals, the one population, has 12 individuals, and a variant has a value in a population only when at least 20 of its individuals have a called genotype there, so it has no values. To have them, lower the minimum number of individuals in the options of the diversity.", and, when the filters of individuals removed some, "…lower the minimum number of individuals in the options of the diversity, or loosen the filters of individuals in the Variants step." Until stage 5 the minimum had no field, and the words said so |
| `variantsWithoutValue` | a population with enough individuals has a value at fewer variants than `numVars`, whatever the number skipped | "p0a has a value at 641 of the 1,152 variants kept (56%); at the others fewer than 20 of its individuals have a genotype." With two or three: "p0a and p0b have a value at 641 and 1,100 of the 1,152 variants kept (56% and 95%); at the others fewer than 20 of their individuals have a genotype." With more than three, the first two and how many more, with no counts: "p0a, p0b and 3 more have a value at fewer than the 1,152 variants kept; at the others fewer than 20 of their individuals have a genotype." When it is none of them: "p0a has a value at none of the 1,152 variants kept: at each, fewer than 20 of its individuals have a genotype." |
| `individualsWithoutPopulation` | individuals of the variants file have a missing cell in the column; never for the one population, which holds every one | "5 individuals of panel.nei have no population, and are left out of the diversity: s001, s002 and 3 more. If they belong to one, fill in their population in the metadata file and load it again." |
| `populationNotInResult` | a population of `populationsToRun(p)`, which has individuals in the variants file, is not in `r.pops`; never for the one population, since filters that keep none of it keep no individual, which locks the diversity or stops its Run in the words of `keptNoneReason` (`docs/specs/core/individualsKept.md`) | "Population p9 has no individual among the individuals of panel.nei that the filters kept, so it is not in the table." |
| `privateAllelesWithoutSmall` | from stage 5: populations are left out of `popDiversityPops` for their size, and it holds two or more | "The private alleles of p0, p2 and p1 are counted among these populations alone, without p3, which has fewer than 20 individuals: an allele they share only with p3 counts as private." With more than three counted, "The private alleles of the 7 populations with 20 individuals or more are counted among them alone, without p3 and p5, …"; the populations left out are named as `project.md` names individuals |
| `privateAllelesNeedTwoPopulations` | from stage 5: `popDiversityPops` holds one population | For the one population: "With every individual in one population, no allele can be private, found in this population and in no other, so the table has no private alleles. Choose a column that defines the populations in the Individuals step to count them." For a column: "Only p2 has 20 individuals or more, and private alleles are counted among such populations, so the table has none: an allele is private when one population has it and no other does." |
| `privateAllelesOverFewerVariants` | from stage 5: the private alleles were counted, over fewer variants than `numVars`, `numVarsEveryPop` below it | "The private alleles are counted over the 641 of the 1,152 variants kept (56%) at which every population has a value; at the others, fewer than 20 individuals of some population have a genotype." When it is none: "The private alleles are counted over the variants at which every population has a value, and there is none among the 1,152 kept: at each, fewer than 20 individuals of some population have a genotype. So no population has private alleles." |
| `variantsNotInDraw` | from stage 5: a population given to `calcPopDiversity` reached the draw at fewer variants than it has a value at, `numVarsInDraw` below `numVarsWithValue`, which only a draw larger than the ploidy times the minimum gives, or the draw of 2 at a minimum of 0, or of 1 in a haploid file, where a variant with one allele called has a value | "p0 reaches 96 called chromosomes at 277 of the 1,152 variants at which it has a value (24%), so its rarefied values are over those alone." With two or three, and more than three, as `variantsWithoutValue` lists them. When it is none: "p0 reaches 96 called chromosomes at none of the variants at which it has a value, so it has no rarefied values. Lower the number of chromosomes of the rarefaction in the options of the diversity.", the last sentence left out at a draw of 2, the smallest. When the rarefied private alleles are over fewer variants than the others, `numVarsEveryPopInDraw` below `numVarsEveryPop`, a last sentence: "The rarefied private alleles are over the 277 variants at which every population reaches 96." |
| `noFInHaploid` | from stage 5: the variants file has a ploidy of 1 | "The variants of panel.vcf.gz have a ploidy of 1, and a genotype of one allele cannot be heterozygous, so F has no value." |

The owner decided on 25 September 2026 that `variantsWithoutValue` is
raised whenever a population skips any variant, one or a thousand, and
that it gives the number and the share of the variants kept at which the
population has a value. The share is that number over `numVars`, as a
whole percentage rounded to the nearest, except that a share below 100%
is never written 100%, nor one above 0% written 0%: 1,151 of 1,152 is
"99%", and 1 of 1,152 is "1%", "(less than 1%)" being longer than the
fact. The warning is a fact about the means, and says no more: that the
populations are then compared over different variants is in the help.

The owner decided on 25 September 2026 that a population none of whose
individuals is in the variants file has no warning. A metadata file may
hold the individuals of several panels, and its rows of another panel are
ignored (`docs/functionality.md`, section 4); a warning that said the
filters had left such a population no individual would blame filters
that removed nothing. `populationNotInResult` is for a population whose
individuals are in the variants file and were all removed by the filters
of individuals: a population of `populationsToRun(p)` that is not in
`r.pops`, which `warnings` finds from the result and the project with no
list of the individuals kept. That a population of `tooFewIndividuals`
lost individuals to the filters is found in the same way, its
`numIndividuals` below its count in `populationsToRun(p)`.

`individualsWithoutPopulation` and `populationNotInResult` are raised
alike by the three analyses per population of stage 5, so from stage 5
they are made by one function of `src/core/analyses/words.ts`, given
what the analysis calls itself and its result: the diversity "the
diversity" and "the table", the distances between populations "the
distances" and "the distances", the LD decay "the LD decay" and "the
plot" (`popDists.md` and `ldDecay.md`, "The warnings"):

```ts
/** individualsWithoutPopulation and populationNotInResult, in this
    order, for the populations `pops` of a result and the project of its
    request: "…, and are left out of ‹leftOutOf›: …" and "…, so it is not
    in ‹notIn›."; none for the one population. */
export function populationWarnings(
  pops: readonly string[],
  p: Project,
  words: { readonly leftOutOf: string; readonly notIn: string },
): readonly Warning[];
```

A population of a text is named as `project.md` names an individual, its
control characters escaped and cut after 40 characters. The numbers of
`variantsWithoutValue` are those of a population `p0a` of the first 20
individuals of p0 in the panel of the flow below, `s000` to `s071` in
the order of the file, with the missing data filter at 0.05: popnei gave
it a value at 641 of the 1,152 variants kept, and at 653 of the 1,200
with no filter (node, 25 September 2026, `js-v0.1.0-dev.2`).

After these, `warnings` appends `spectrumWarnings(r, p)` of
`docs/specs/analyses/sfs.md`, the warnings of the spectrum, while the
spectrum is part of the diversity (its **Open 1**).

A MAF filter of the Variants step raises no warning on the table,
decided on 30 September 2026 by the writer of this revision. The filter
removes the variants whose commonest allele, over all the individuals
kept, is above its threshold, so it raises the heterozygosities, the
proportion of polymorphic variants and the alleles of every population
over the variants it leaves; but every filter changes which variants
the means are over, the caption of the table says they are over the
variants the filters kept, the MAF filter is off by default in the
population genetics application (`docs/functionality.md`, section 3),
and the help says what it does to the table. The spectrum, whose first
bins it empties, warns (`sfs.md`, `mafFilterOnSpectrum`). The option
not taken was a warning on the table as well, which would be raised
for a filter the user turned on.

The populations that were given to `calcPopDiversity` are not in the
result: `warnings` finds them as `run` chose them, from
`r.numIndividuals` and `minNumIndividuals` of `p`, the project of the
request, so the three warnings that depend on them,
`privateAllelesWithoutSmall`, `privateAllelesNeedTwoPopulations` and
`variantsNotInDraw`, need no field more.

The warnings of stage 5 follow the rule the owner set for
`variantsWithoutValue`: `privateAllelesOverFewerVariants` and
`variantsNotInDraw` are raised whenever one variant is missing, with the
number and the share written in the same way. `docs/functionality.md`,
section 6, asks for a warning "when a population reaches that number of
chromosomes at few of its variants"; with no number that makes "few",
any is the one the owner already chose. `noFInHaploid` reads the ploidy
of the variants file, which the load in the key fixes, and replaces
nothing: popnei gives NaN for F in a haploid dataset, and the words say
why.

### The check numbers

`checkNumbers(r)` gives `numVars`, then, for each population in the
order of `r.pops`, its expected heterozygosity, its observed
heterozygosity and its proportion of polymorphic variants, with `null`
for a NaN: 1 + 3 × the number of populations, 10 for the panel of three,
as the owner decided on 25 September 2026, with section 9 of
`docs/functionality.md`, which named the expected heterozygosity alone,
corrected. They are popnei's numbers
as it gave them, with no arithmetic, and the store compares them exactly
(`docs/specs/core/store.md`, "The comparison with the check numbers").
The number of variants is among them because a variants file with the
same individuals and other variants would give it otherwise. The numbers
of individuals are not: the store compares the check numbers only when
the fingerprint of the settings, a hash of every part of the key but the
load id and the two versions (`docs/specs/core/keys.md`), is the one the file
was saved with, and the fingerprint holds the populations with their
individuals. The project file saves them with the key version
(`docs/specs/core/projectFile.md`).

Stage 5 leaves them as they are, decided on 30 September 2026 by the
writer of this revision, as `docs/specs/core/projectFile.md` foresaw
when F joined the diversity. The number of variants and the three
numbers of each population already tell another variants file from
the same one, which is what they are for, and more numbers would change
their count: the project file refuses at the opening a check of another
count as damaged, so every project file saved by stages 2 to 4 with a
diversity would no longer open. The option not taken, every number of
the table, would need `numCheckNumbers` to read the key version saved.

`numCheckNumbers(p)` gives their count for the project `p`, 1 + 3 × the
populations of `populationsKept(p, byLists)`, with `byLists`, the
individuals the lists to keep and to remove keep, of `individualsKept`
(`docs/specs/core/individualsKept.md`), since `run` sends every one of them and popnei gives a row for
each, so 4 for the one population; or `null` when `populationsToRun` is `null`, the variants file or
a metadata file not read or no column of the populations chosen in it, and when
the project holds a threshold on the individuals, whose list needs the
statistics of each individual, not calculated when a project file is
opened (`docs/architecture.md`, section 4), and when a list to keep or
to remove is one popnei would refuse, naming an individual twice or one
not in the variants file, which `individualsKept` gives no list for and
the store locks the diversity on. The project file refuses, at the
opening, a check of the diversity of another count, as the owner decided
on 25 September 2026 (`docs/specs/core/projectFile.md`, "Opening"): 6
numbers where the two populations of the project give 7 would otherwise
be compared after a run and blamed on the variants file.

### Its lines of the Python script

`script(p)` gives the lines that calculate the same numbers with the
Python API of popnei, after the lines of `src/core/script.ts`, in stage
6, that import `pandas` and `popnei`, open the variants file into
`variants`, put its filters on it, and read the individuals file into
the pandas table `individuals`, every column as text with the missing
values of the application (`docs/architecture.md`, section 8). For the
project of the Playwright flow below, the test that drives the built
site in real browsers:

```python
# The diversity of each population, from the column "popcat"
pops = {}
for individual, pop in zip(individuals.iloc[:, 0], individuals["popcat"]):
    if not pandas.isna(pop):
        pops.setdefault(pop, []).append(individual)
kept = set(variants.individuals)
pops = {pop: [i for i in names if i in kept] for pop, names in pops.items()}
pops = {pop: names for pop, names in pops.items() if names}
per_var = popnei.calc_per_var_distribs(
    variants, pops=pops, min_num_individuals=20, poly_threshold=0.95
)
table = pandas.DataFrame({
    "individuals": {pop: len(names) for pop, names in pops.items()},
    "expected_heterozygosity_unbiased": per_var.unbiased_exp_het.mean,
    "observed_heterozygosity": per_var.obs_het.mean,
    "proportion_polymorphic": per_var.poly_vars_ratio.poly_ratio,
})
# A population of fewer than 20 individuals has a value at no variant; it
# is left out here, where it would take every variant out of the private
# alleles of the others. A private allele needs two populations.
large = {pop: names for pop, names in pops.items() if len(names) >= 20}
if large:
    stats = [
        popnei.PopDiversityStat.NUM_ALLELES,
        popnei.PopDiversityStat.FIS,
        popnei.PopDiversityStat.FOLDED_SFS,
    ]
    if len(large) > 1:
        stats.append(popnei.PopDiversityStat.PRIVATE_ALLELES)
    diversity = popnei.calc_pop_diversity(
        variants, large, stats=stats, num_called_alleles=40, min_num_individuals=20
    )
    table["f"] = diversity.fis
    table["alleles_per_variant"] = diversity.num_alleles["mean"]
    table["alleles_per_variant_rarefied"] = diversity.num_alleles["in_draw"]
    if diversity.private_alleles is not None:
        table["private_alleles"] = diversity.private_alleles["total"]
        table["private_alleles_per_variant"] = diversity.private_alleles["mean"]
        table["private_alleles_per_variant_rarefied"] = diversity.private_alleles["in_draw"]
print(table.to_string())
```

The populations are built as the module builds them, in the same order,
so the table printed has the rows of the panel; a column set from
`diversity` is aligned by the name of the population, and a population
left out of `large` has NaN in it. The name of the column
is written with `JSON.stringify`, whose escapes Python reads in a string
the same way. The numbers are those of the options, written with
`String`, the draw as the number `run` sends. `variants.individuals` gives the individuals of the variants
file. The size of each population is counted in Python and not written
by the module, since with a threshold on the individuals the module
does not know it until the statistics of each individual are
calculated, and the script is made from the project. popnei's Python
`calc_pop_diversity` takes the members of `PopDiversityStat` in `stats`,
and refuses their names as text. The result of `calc_pop_diversity`
is named `diversity`, since the lines of the spectrum
(`docs/specs/analyses/sfs.md`, "Its lines of the Python script") follow
these and read `diversity.folded_sfs`; they go inside the `if large:`,
where `diversity` is defined. These
lines, run with popnei's Python package on 25 September 2026 over the
files of the flow with the filter at 0.05, printed the numbers of the
table below, and, as revised for stage 5, on 30 September 2026 with the
package built from popnei's code of that day, whose sources of the
diversity are those of `js-v0.1.0-dev.3`, the numbers of the table of
stage 5, below, to the six digits pandas prints. The warnings as comments, which `docs/functionality.md`
section 9 asks for, come from the results, which `script(p)` is not
given; `script.ts` adds them in stage 6. `script` is asked only for an
analysis that has run, so a project with no populations is a defect
there.

For the one population, without a metadata file or with the grouping
`onePopulation`, the dict of the populations is made from the
individuals of the variants, which are those the filters of individuals
keep once `filter_individuals` is put on `variants`, as the property's
doc in popnei's `python/popnei/variant.py` says, so no narrowing
follows:

```python
# The diversity of every individual, as one population
pops = {"All individuals": list(variants.individuals)}
```

and the lines from `per_var` on are those above, which for one
population ask for no private alleles. The script reads no metadata
file when the project has none; with one, and `onePopulation`, it reads
it as for a column, since every individual of the variants must be in
it, and does not use it for the populations.

### The TypeScript interface

The request and the result are members of `Job` and `JobResult` of
`src/worker/protocol.ts`, the unions of the requests of every analysis
and of their results, where the runner reads them
(`.claude/skills/coding/worker.md`, "The protocol module"):

```ts
/** The populations, as pairs in the order of the file. */
export type Pops = readonly (readonly [pop: string, individuals: readonly string[]])[];

export interface DiversityJob {
  readonly analysis: "diversity";
  readonly fileId: string;
  readonly filters: readonly VariantFilter[];
  readonly individuals: readonly string[] | null;
  readonly pops: Pops;
  readonly minNumIndividuals: number;
  readonly polyThreshold: number;
  readonly numCalledAlleles: number;               // from stage 5
  readonly popDiversityPops: readonly string[];    // from stage 5
}

export interface DiversityResult {
  readonly analysis: "diversity";
  readonly pops: readonly string[];
  readonly numIndividuals: Uint32Array;
  readonly unbiasedExpHet: Float64Array;
  readonly obsHet: Float64Array;
  readonly polyRatio: Float64Array;
  readonly numVarsWithValue: Uint32Array;
  readonly fis: Float64Array;                      // this field and those after it but
                                                   // passStats: from stage 5
  readonly numAllelesMean: Float64Array;
  readonly numAllelesInDraw: Float64Array;
  readonly privateAllelesTotal: Float64Array;
  readonly privateAllelesMean: Float64Array;
  readonly privateAllelesInDraw: Float64Array;
  readonly numVarsInDraw: Uint32Array;
  readonly numVarsEveryPop: number | null;
  readonly numVarsEveryPopInDraw: number | null;
  readonly numCalledAlleles: number;
  readonly foldedSfs: readonly (Float64Array | null)[];
  readonly passStats: PassStats;
}
```

The check of the result in `messages.md` holds each new array to the
length of `pops`, as the others, `numVarsEveryPop` and
`numVarsEveryPopInDraw` to `null` together, and `foldedSfs` to one
entry per population, each `null` or of `floor(numCalledAlleles / 2) +
1` values.

The module exports its definition, an `AnalysisDef` of
`docs/specs/core/store.md`, the object of functions and constants by
which the store knows an analysis (`keyInputs`, `needs`, `keptNeeds`,
`run`, `warnings`, `checkNumbers`, `numCheckNumbers`, `script`,
`parseOptions`), which `src/core/apps.ts` lists for the population
genetics application, and what the panel reads.
`populationsOf`, `populationsToRun`, `populationsKept`,
`populationsBeforeRun` and `populationsNeeds`, which it exported until
stage 4, are exported by `src/core/project.ts` from stage 4, with the
same names (`docs/specs/core/project.md`, "What every analysis
needs"); the module imports them, and the panel, the Individuals step and the shell
import them from there.

```ts
export const diversity: AnalysisDef<Job, JobResult>;
// id "diversity"; app ["popgen"]; keyVersion 3;
// filtersRead { variants: true, individuals: true };
// defaults DIVERSITY_DEFAULTS

export const DIVERSITY_DEFAULTS: {
  readonly minNumIndividuals: 20;
  readonly polyThreshold: 0.95;
  readonly numCalledAlleles: null;   // the default draw, from stage 5
};

/** The options of the project for the diversity, or the defaults; what
    the fields of the panel show and send back with setAnalysisOptions. */
export function diversityOptions(p: Project): {
  readonly minNumIndividuals: number;
  readonly polyThreshold: number;
  readonly numCalledAlleles: number | null;
};

/** The draw `run` sends: the one typed, or the ploidy of the variants
    file times the minimum, at least 2; null for the default while the
    variants file is not read, whose ploidy is then not known. */
export function drawOf(p: Project): number | null;

/** One row of the table, a number null where popnei gave NaN. */
export interface DiversityRow {
  readonly population: string;
  readonly individuals: number;
  readonly expectedHeterozygosity: number | null;
  readonly observedHeterozygosity: number | null;
  readonly polymorphic: number | null;
  readonly f: number | null;                       // this field and those after it:
                                                   // from stage 5
  readonly allelesPerVariant: number | null;
  readonly allelesPerVariantRarefied: number | null;
  readonly privateAlleles: number | null;
  readonly privateAllelesPerVariant: number | null;
  readonly privateAllelesPerVariantRarefied: number | null;
}
/** The rows of a result, in its order; the same array for the same result. */
export function diversityRows(r: DiversityResult): readonly DiversityRow[];

/** The table as the text of a CSV file (the panel, "What it shows"). */
export function diversityCsv(r: DiversityResult): string;

/** The words of a refusal of popnei, for the error state of the panel. */
export function refusalText(message: string, p: Project): string;

/** A failure of a calculation that is not popnei's refusal. */
export type Failure = Extract<AnalysisError, { readonly kind: "failed" }>["error"];

/** The words of the error state when the statistics of each individual
    that a Run waited for were refused or failed, the store's error with
    `ofStatistics`: the first row of "Its words". */
export function statisticsFailedText(
  error: AnalysisError,
  p: Project,
  failureText: (failure: Failure) => string,
): string;
```

`statisticsFailedText` gives the first sentence of that row, then, for a
refusal of popnei, `refusalText` of `individualChecks.ts`, and, for
another failure, the words `failureText` gives it. Those are the words
the frame of every panel gives a failure, `failureText` of
`src/ui/analyses/words.ts`, which core cannot import, so the panel passes
them in; the rows of the diversity's own `refusalText` are never used,
since they would name the diversity for a calculation that was not its
own.

`warnings` and `checkNumbers` take a `JobResult`, and the store gives
them only results of their own requests (`docs/specs/core/store.md`,
"The definition of an analysis"). With the checks of stage 3, `JobResult`
has four members, so each checks the `analysis` of its result and throws
a defect, `popnei_web defect: ...`, for a result of another analysis.
`script` takes the project, not a result.
`diversityRows` keeps its rows by the result in a `WeakMap`, a table
whose entries are kept by the object itself and dropped with it, so that
the panel, which asks for them each time React draws it again, gets the
same array (`.claude/skills/coding/react.md`, "Reading core");
`populationsToRun` of `project.ts` keeps its answer in the same way,
by the project's table, the name of the column and the read of the
variants file (`docs/specs/core/project.md`).

`parseOptions(o, 1)` gives back an object with exactly the three fields,
`minNumIndividuals` a whole number from 0 to 4,294,967,295, as popnei's
`calcPerVarDistribs` accepts (`LARGEST_WHOLE_NUMBER` of
`js/popnei/src/arguments.ts`), `polyThreshold` a number from 0 to 1,
and `numCalledAlleles` `null` or a whole number from 2 to 4,294,967,295;
anything else is refused with the words that follow "should be" in the
text of `projectErrorText`: "the minimum of individuals, a whole number
from 0 to 4,294,967,295, the frequency below which a variant is
polymorphic, a number from 0 to 1, and the chromosomes of the
rarefaction, null or a whole number from 2 to 4,294,967,295, and nothing
else". Until stage 5 it took the first two alone. The format stays at
version 1 until the first release (`docs/specs/core/projectFile.md`,
"The versions of the format"), and no project file of stages 2 to 4
holds options of the diversity, which had no control, so no file that
opened before is refused. Every later version of the format reads
version 1 in the same way (`docs/architecture.md`, section 12).

### The cases

- **A population smaller than 20.** It is in the request, and popnei
  gives it NaN everywhere: its row is in the table with its number of
  individuals and "no value" in its three cells, and `tooFewIndividuals`
  says why. It is not left out of the request, so that the table shows
  every population the user defined; from stage 5 it is left out of
  `popDiversityPops`, and its six new cells are "no value" too (above,
  "The populations").
- **No population with the minimum of individuals.** `calcPopDiversity`
  is not called, the run is one pass, `numPasses` 1, and the table has
  "no value" in every number, as in stage 4, with `tooFewIndividuals`.
- **The minimum lowered.** The default draw follows it, 2 × 10 = 20 for
  diploids at a minimum of 10, and the populations of
  `popDiversityPops` are those with 10 individuals or more; a draw the
  user typed stays as typed.
- **A draw the user typed above a population's chromosomes, and below
  those of the individuals kept.** popnei gives that population no
  rarefied value, and `variantsNotInDraw` says it reaches the draw at
  none of its variants.
- **A haploid VCF.** The default draw is the minimum, 20; F is NaN for
  every population, and `noFInHaploid` says why.
- **A population of 20 to a few more, with missing data.** Some variants
  have fewer than 20 called genotypes in it and no value; on the panel
  file, `p0a`, the first 20 individuals of p0, had a value at 653 of
  the 1,200 variants (above, "The warnings"). `variantsWithoutValue` says it with the counts.
- **The filters keep no variant.** popnei refuses the call; the store
  keeps the refusal under the key, so an undo back to those settings
  shows it again without a calculation (`docs/specs/core/store.md`, "A
  calculation that failed").
- **The column chosen is the first, the identifiers.** It is no column
  of the populations (`docs/specs/core/project.md`, "The populations"):
  the Individuals step does not offer it, and a grouping that names it,
  from a project file or after a new file put the column chosen first,
  locks the diversity with the reason of a column not in the file,
  `noSuchColumn`. Until 29 September 2026 every individual was then its
  own population, of one, and the table had rows with no values and one
  warning.
- **The individuals file loaded again, with the same table.** The key is
  the same, and the result is on screen at once.
- **A result that arrives after the populations changed.** It goes into
  the cache under the key it was asked for, with the warnings of the
  request's project, and is not shown (`docs/specs/core/store.md`, "The
  cases").
- **A threshold on the individuals, and no statistics of each individual
  for the filters of the variants as they are.** A Run starts their
  calculation first, and the diversity is running, with their progress,
  until its own request is sent (`docs/specs/analyses/individualChecks.md`;
  `docs/architecture.md`, section 5).
- **A threshold moved to one that keeps the same individuals.** The key
  holds the threshold, so the table goes and a Run calculates it again,
  with the same numbers; the option not taken, a key of the list, is in
  `docs/architecture.md`, section 3.
- **A population whose individuals the filters all remove.** It is left
  out of the request, named in the ready state and, after the run, by
  `populationNotInResult`.
- **No metadata file.** The diversity runs once the variants file is
  read, on "All individuals", every individual the filters keep; the
  table has one row, with no private alleles and
  `privateAllelesNeedTwoPopulations`. A metadata file loaded after it, whose read is
  under way, locks it with "Reading pops.csv."; once read, with a column
  chosen before, the populations are those of the column and the table
  of the one population goes from the screen, the key being another;
  removing the file brings it back from the cache, with no calculation.
- **A column chosen, and the file removed.** The same: one population,
  whatever the grouping holds, until a file is loaded again.
- **The one population chosen, and a metadata file loaded.** The
  diversity is locked while the file is read, so its result leaves the
  screen and the notice names it; once the file is read and holds every
  individual of the variants, the key is the one it had, `"all"`, and
  the result comes back from the cache with no calculation, and leaves
  the notice, which goes if it named nothing else
  (`docs/specs/core/store.md`, "The notice, and the calculations it
  stops").
- **An opened project whose metadata file was not read when it was
  saved**, `notGiven`. Locked with the reason of `individualsNeeds`,
  whatever the grouping, until the file is loaded again or removed; it
  never runs on one population while the project names a file it does
  not have (`docs/specs/core/project.md`, "The project of an opened
  project file").
- **Every individual of the variants file with no population in the
  column, and the user then chooses the one population.** The lock of
  `noPopulation` goes, and the diversity runs on every individual.

### How it runs

`populationsOf` of `project.ts` walks the table once when the store makes the key after
a change, 10,000 rows in the largest individuals table the architecture
plans for (`docs/architecture.md`, section 11), a time not measured; the key's memo does not
cover it, since `keyInputs` builds a new value. It is kept by the
reference of the table and the name of the column in a `WeakMap`, so a
change of a threshold does not walk the table again. The result is a few
arrays of one number per population, a few hundred bytes. popnei makes
one pass over the file, reading the `File` by ranges
(`docs/specs/worker/runner.md`, "The memory"), and from stage 5 two,
one for each call, until popnei issue #4 is closed: a Run of the
diversity reads the file, and decompresses a gzipped VCF, twice where
stage 4 read it once, and the time it takes is measured by the plan of
stage 5. The result of stage 5 is a few arrays more, of one
number per population.

### How it is verified

With Vitest, the runner of the tests in node, at the functions of the
definition, on frozen projects, as
`.claude/skills/coding/testing.md` says of core:

- **A worked example.** A table with the columns `name`, `pop`, `other`
  and the rows `i1 A`, `i2 B`, `i3 A`, `i4` with a missing population,
  `i5 C`; a variants file read with the individuals `i1` to `i4`; the
  column `pop`. `populationsOf` gives `[["A", ["i1", "i3"]], ["B",
  ["i2"]], ["C", ["i5"]]]`; `run`, with a fake client that records its
  job, sends `pops` `[["A", ["i1", "i3"]], ["B", ["i2"]]]`, the filters
  of the project and `minNumIndividuals` 20, `polyThreshold` 0.95, and,
  from stage 5, `numCalledAlleles` 40, for a variants file of ploidy 2,
  and `popDiversityPops` `[]`, neither population having 20. A
  result of A with 2 individuals and B with 1, their numbers NaN, gives
  the warnings `tooFewIndividuals` naming A and B and
  `individualsWithoutPopulation` naming i4, in that order, with the texts
  of the table above for these names, the first "Populations A and B have
  fewer than 20 individuals, 2 and 1, ...", and none for C, none of whose
  individuals is in the variants file; `keyInputs` gives `{ pops: [["A", ["i1", "i3"]], ["B",
  ["i2"]], ["C", ["i5"]]], options: DIVERSITY_DEFAULTS }`, the populations
  of the table and not those sent; `checkNumbers` gives `[numVars, null,
  null, null, null, null, null]`, and `numCheckNumbers` 7 for the two
  populations sent, and `null` with a threshold on the individuals, with
  no column of the populations, and with the variants file pending.
- **The individuals kept**, in the same project. With `c.individuals`
  `["i1", "i2"]`, `run` sends `individuals` `["i1", "i2"]` and `pops`
  `[["A", ["i1"]], ["B", ["i2"]]]`; with `["i1", "i3"]`, `pops` `[["A",
  ["i1", "i3"]]]`, and `populationsKept` gives `emptied` `["B"]`; with
  `null`, the `pops` of the worked example and `individuals` `null`. A
  result of A alone adds `populationNotInResult` naming B; a result of A
  with 1 individual, where `populationsToRun` gives it 2, gives
  `tooFewIndividuals` ending "or loosen the filters of individuals in the
  Variants step". A list to remove `["i2"]` gives `numCheckNumbers` 4,
  and a list to keep `["i4"]`, who has no population, the reason of the
  lists in `needs`.
- **`needs`**, a case for each row of its table, after each reason of
  `individualsNeeds` has been checked to come through; `populationsNeeds`
  gives the same text for the rows of the column, with their kinds, and
  `null` for a project whose individuals file is not read.
- **The one population**, from stage 4. In the project of the worked
  example with no metadata file, the grouping `pop` kept: `needs` gives
  `null`; `keyInputs` gives `{ pops: "all", options: DIVERSITY_DEFAULTS }`;
  `run` sends `pops` `[["All individuals", ["i1", "i2", "i3", "i4"]]]`,
  and, with `c.individuals` `["i1", "i3"]`, `[["All individuals", ["i1",
  "i3"]]]`; `numCheckNumbers` gives 4; the key is the same with the
  file and `onePopulation`, and differs from that of the column `pop`. A
  result of "All individuals" with 2 individuals gives
  `tooFewIndividuals` with the words of the one population, and no
  `individualsWithoutPopulation`. `needs` with a list to remove of the
  four gives `null`, the lock being the store's, `keptNoneReason`.
  `script`
  gives the lines of the one population, as a literal.
- **The key**: for each row of the table of what changes the key, two
  projects that differ in it, and `keyOf` equal or not as the row says;
  `keyInputs` of `emptyProject("popgen")`, which has no metadata file,
  gives `{ pops: "all", options: DIVERSITY_DEFAULTS }`, the one
  population, as `populationsOf` of `docs/specs/core/project.md` gives
  it, and of a project whose metadata file is pending `{ pops: null,
  options: DIVERSITY_DEFAULTS }`, each without reading `p.variants`,
  which the test makes a getter that throws. The empty project's was
  `null` here until 29 September 2026, when the spec took the code, as
  the owner decided.
- **`parseOptions`**: the defaults back, and `minNumIndividuals`
  4,294,967,295, and `numCalledAlleles` 2 and 4,294,967,295; a missing
  field, a field more, `minNumIndividuals` 2.5, −1 or 4,294,967,296,
  `polyThreshold` 1.5 or a text, `numCalledAlleles` 1, 2.5 or a text,
  refused; the two fields of stage 2 alone, refused.
- **The populations of `calcPopDiversity`**, from stage 5, in the worked
  example with `minNumIndividuals` 2: `run` sends `popDiversityPops`
  `["A"]`, A having 2 individuals and B 1, and `numCalledAlleles` 4 for
  a variants file of ploidy 2; with `minNumIndividuals` 1, `["A", "B"]`
  and 2; with the default 20, `[]`. With a draw typed, 7, `run` sends
  7 whatever the minimum. `drawOf` of a project of ploidy 4 and the
  minimum 20 gives 80, and of ploidy 1 and the minimum 0 gives 2.
- **The lock of the draw**, from stage 5: in the worked example with
  `minNumIndividuals` 2 and a draw typed of 9, `needs` gives, the four
  individuals of the variants file holding 8 at ploidy 2, the reason
  with no list, whole, with the name of the variants file of the
  example; with a draw of 8, `null`; with a list to remove `["i4"]` and
  a draw of 7, the reason of a list; with the default draw and
  `minNumIndividuals` 20, `null`, since no population has 20.
  `keptNeeds` with a threshold, the individuals kept `["i1", "i3"]` and
  a draw of 5, gives the reason of the filters, whole, and with the
  individuals kept `null` and a draw of 9, `null`, left to `needs`.
- **The warnings of stage 5**, from results written as literals: a
  result with a population of 12 individuals among others of 20 or more gives
  `privateAllelesWithoutSmall` naming it, after `tooFewIndividuals`; a
  result of one population in the call gives
  `privateAllelesNeedTwoPopulations` with the words of the column, and
  of "All individuals" with the words of the one population;
  `numVarsEveryPop` 641 of `numVars` 1,152 gives
  `privateAllelesOverFewerVariants` with "(56%)", and 0 its words of
  none; p0 with `numVarsInDraw` 277 of `numVarsWithValue` 1,152 and a
  draw of 96 gives `variantsNotInDraw` with "(24%)", and, with
  `numVarsEveryPopInDraw` 277 of `numVarsEveryPop` 1,152, its last
  sentence; a variants file of ploidy 1 gives `noFInHaploid`.
- **`diversityRows`** of a result with NaN in `privateAllelesTotal`
  gives `null` in the three cells of the private alleles, and not 0.
- **`warnings`** of a result with a population `p0a` of 20 whose
  `numVarsWithValue` is 641 of `numVars` 1,152 gives `variantsWithoutValue`
  with the text of the table, "(56%)"; 1,151 of 1,152 gives "99%", and 1
  of 1,152 gives "1%"; 1,152 of 1,152 gives no warning; of four
  populations of fewer than 20, `tooFewIndividuals` with "and 2 more"
  and no counts.
- **`script`** of the project of the flow gives the lines above,
  as a literal.
- **`diversityCsv`** of the result of the flow gives the text of "What it
  shows", below, as a literal; a population named `a,"b"` is quoted.
- **The words of the statistics that failed**: the error of the store
  with `ofStatistics` and popnei's message of the empty pass of the
  missing data filter at 0.05 and the MAF filter at 0.4 on `panel.nei`
  gives the first row of "Its words", below, whole, and not the row of
  the empty pass of the diversity.
- **`refusalText`** of each row of its table in "Its words", below, with
  popnei's messages as literals: the pass over a VCF with no variant,
  "the pass gave no variant and its source holds none: a statistic of a
  pass is calculated over the variants it gives", which the popnei of the
  release gave in node on 25 September 2026 for a VCF of a header alone,
  with the missing data filter and without it, over a `.nei` file and
  over a VCF read with every variant, and over a VCF read with only the
  variants that passed, which the popnei of the release gave in node on
  25 September 2026 for a VCF whose two variants have `q10` in their
  FILTER column (`docs/specs/worker/runner.md`, "The cases"); the empty
  pass of
  `docs/specs/worker/runner.md`; the ploidy of `tetraploid.vcf.gz` read with ploidy 2, a data line
  of a VCF, "line 4 of the VCF, the column of a: `z` is not an allele
  number, which is a run of digits", which the popnei of the release gave
  in node on 25 September 2026 for a genotype `0/z`; the message of the
  LD filter of the Variants step over the VCF of three individuals whose
  second variant is at position 10 after one at 30, and one of a
  chromosome that had already ended, as `docs/specs/analyses/pca.md`
  gets them; and another message, with a word between backquotes, which
  the text gives without them.

The numbers popnei gives for the files of the Playwright flow, the panel
of popnei's `tests/reference/stats/`, 1,200 variants of two alleles each
over 200 diploid individuals, as `e2e/fixtures/panel.nei`, and its populations,
`panel_pops.txt`, with the populations in the column `popcat`: p0 of 48
individuals, p2 of 84 and p1 of 68, in the order they first appear in
the file. They were got on 25 September 2026 with the release the site
builds on, `js-v0.1.0-dev.2`, installed in a folder of its own, by the
script of `docs/specs/worker/runner.md`, "How it is verified", which
builds `pops` from `panel_pops.txt` in the order of the file and calls

```js
const variants = openVars(new Uint8Array(readFileSync("e2e/fixtures/panel.nei")));
variants.filterByMissingData(0.05);   // 1 for the second set
calcPerVarDistribs(variants, { pops, stats: ["obs_het", "unbiased_exp_het", "poly_vars_ratio"] });
```

| filter | population | individuals | expected heterozygosity | observed heterozygosity | polymorphic |
|---|---|---|---|---|---|
| missing data at 0.05, 1,152 of 1,200 kept | p0 | 48 | 0.35267894847982756 | 0.35667985874177544 | 0.9288194444444444 |
| | p2 | 84 | 0.3440824705971255 | 0.3512406974637824 | 0.9105902777777778 |
| | p1 | 68 | 0.3498365468860467 | 0.35603713961547323 | 0.9157986111111112 |
| missing data at 1, 1,200 of 1,200 kept | p0 | 48 | 0.35193160994408107 | 0.35642172473116646 | 0.9266666666666666 |
| | p2 | 84 | 0.344856554637815 | 0.3512221180544642 | 0.9108333333333334 |
| | p1 | 68 | 0.35038890489752544 | 0.356734697819302 | 0.9175 |

With no filter popnei gives the numbers of the filter at 1, and so it
does at 0.1, the default of the application, since the missing rates of
the panel stop at 0.08. They are the numbers `js-v0.1.0-dev.1` gave on
the same files, to the last digit, and those of `panel.vcf.gz` are the
same. The check numbers of the first set are `[1152,
0.35267894847982756, 0.35667985874177544, 0.9288194444444444,
0.3440824705971255, 0.3512406974637824, 0.9105902777777778,
0.3498365468860467, 0.35603713961547323, 0.9157986111111112]`.

Every population has a value at every variant kept, 1,152 and 1,200, so
neither set raises a warning. The filter at 1 keeps every variant, and
gives the numbers of no filter under another key.

With the filters of individuals, before the missing data filter at 0.05,
as the owner decided on 28 September 2026: the thresholds of at most
0.03 of missing genotypes and at most 0.38 of observed heterozygosity,
on the statistics over every variant of
`docs/specs/analyses/individualChecks.md`, keep 116 individuals by the
first and 111 by both, the second removing s023, s042, s086, s168 and
s183; given to `filterIndividuals` before the filter of the variants,
in the order of the file, popnei gave (node, 28 September 2026,
`js-v0.1.0-dev.3`, and the same with `js-v0.1.0-dev.2`, by `orderA.mjs`
of `docs/specs/worker/runner.md`, "How it is verified"):

| population | individuals | expected heterozygosity | observed heterozygosity | polymorphic |
|---|---|---|---|---|
| p0 | 29 | 0.3536745729996746 | 0.35866753886603864 | 0.9310653536257834 |
| p2 | 48 | 0.34293262196030005 | 0.3480322658477853 | 0.9015219337511191 |
| p1 | 34 | 0.3508361148330853 | 0.35471161450059036 | 0.9015219337511191 |

over 1,117 variants, at each of which every population has a value; the
counts of the pass are those of the filter of the variants over the 111
individuals, 1,117 of 1,200, where it keeps 1,152 over every
individual. Until that day the list came after the filter, over the
statistics of the 1,152 variants it kept, and the same thresholds kept
125 and 119 individuals, p0, p2 and p1 with 32, 50 and 37, over 1,152
variants.

With the one population of stage 4, the 200 individuals of `panel.nei`
as "All individuals", popnei gave (node 26.8.2, 27 September 2026,
`js-v0.1.0-dev.2` as the site installs it, the script above with `pops`
`{ "All individuals": [...variants.individuals] }` and the two options
given):

| filter | individuals | expected heterozygosity | observed heterozygosity | polymorphic |
|---|---|---|---|---|
| missing data at 0.05, 1,152 of 1,200 kept | 200 | 0.37487834409014364 | 0.3541409192154764 | 0.9791666666666666 |
| missing data at 1, 1,200 of 1,200 kept | 200 | 0.3754712450806149 | 0.35429523451520484 | 0.9791666666666666 |

with a value at every variant kept, 1,152 and 1,200. Its check numbers
with the filter at 0.05 are `[1152, 0.37487834409014364,
0.3541409192154764, 0.9791666666666666]`. The expected heterozygosity
of the whole is above that of each of the three populations, 0.3527,
0.3441 and 0.3498 with the filter at 0.05, as it is when the
populations differ in their frequencies. The test of the runner asserts
the first row as literals, and the flow of stage 4 loads `panel.nei`
with no metadata file, runs with the missing data filter at its default
of 0.1, which keeps the 1,200 variants, and reads 200, 0.3755, 0.3543,
0.9792 in the row "All individuals".

The numbers of stage 5 were given by `js-v0.1.0-dev.3`, as the
application installs it, in node 26.8.2 on 30 September 2026, by
a script run from the root of the repository, importing popnei from
`node_modules`, which builds `pops` from
`e2e/fixtures/panel_pops.csv` in the order of the file, p0, p2, p1, and,
for each set below, calls

```js
const v = openVars(new Uint8Array(readFileSync("e2e/fixtures/panel.nei")));
v.filterByMissingData(0.05);   // 1 for the second set
calcPerVarDistribs(v, { pops, stats: ["obs_het", "unbiased_exp_het", "poly_vars_ratio"],
  minNumIndividuals: 20, polyThreshold: 0.95 });
calcPopDiversity(v, { pops, stats: ["num_alleles", "private_alleles", "fis"],
  numCalledAlleles: 40, minNumIndividuals: 20 });
```

With the missing data filter at 0.05, 1,152 of 1,200 variants kept, at
each of which every population has a value and reaches the draw of 40,
so `numVarsEveryPop` and `numVarsEveryPopInDraw` are 1,152:

| population | F | alleles per variant | rarefied | private alleles | per variant | rarefied |
|---|---|---|---|---|---|---|
| p0 | −0.011344341019483117 | 1.9791666666666667 | 1.9646163579517928 | 0 | 0 | 0.0028348059148665707 |
| p2 | −0.020803811522959625 | 1.9861111111111112 | 1.9595644507442256 | 1 | 0.0008680555555555555 | 0.0031646710919597015 |
| p1 | −0.017724256612463796 | 1.9809027777777777 | 1.9582701017879214 | 0 | 0 | 0.002521711046320405 |

With the filter at 1, 1,200 kept, the same in every population:

| population | F | alleles per variant | rarefied | private alleles | per variant | rarefied |
|---|---|---|---|---|---|---|
| p0 | −0.012758486763376542 | 1.9775 | 1.9626723071292755 | 0 | 0 | 0.0030782892654586708 |
| p2 | −0.018458583231322434 | 1.9866666666666666 | 1.9597096939774163 | 1 | 0.0008333333333333334 | 0.003055908632949441 |
| p1 | −0.018110713076467055 | 1.9808333333333332 | 1.9588173095272452 | 0 | 0 | 0.002742968858959168 |

F is, in both sets, 1 − Ho/He of the heterozygosities of the tables
above to the last digit, and `numVars.withData` of `calcPopDiversity`
is `totNumVariantsWithData` of `calcPerVarDistribs`, 1,152 and 1,200
for each population. With the filter at 0.05 and:

- **a draw of 96**: the rarefied alleles per variant 1.9855595667870036,
  1.981752674879213 and 1.9779693674030254; p0 in the draw at 277 of
  its 1,152 variants and the others at all, `numVarsEveryPopInDraw`
  277; the raw values and F as with 40.
- **p0 cut to its first 12 individuals** and left out, the call over p2
  and p1: private alleles 22 and 16, per variant 0.019097222222222224
  and 0.013888888888888888, rarefied 0.038418511541450096 and
  0.037124162585145296; their other numbers as in the first table of
  stage 5, above. Left
  in: `numVarsEveryPop` 0, and the private alleles of all three 0, with
  NaN per variant.
- **"All individuals"**, the 200 in one population, with the private
  alleles asked, as the job does not: F 0.055317745614243075, alleles
  per variant 2, rarefied 1.992568885944447, and 2,304 private
  alleles, every allele called. The job asks for F and the alleles
  alone.
- **the list of 111** of stage 3, before the filter, p0, p2 and p1 of
  29, 48 and 34 individuals, 1,117 variants: F −0.014117401270937968,
  −0.014870687595523124 and −0.011046467292424866; alleles per variant
  1.973142345568487, 1.981199641897941 and 1.973142345568487, rarefied
  1.9647343026993345, 1.957125180734846 and 1.959297105964442; private
  alleles 0, 2 and 0, per variant 0, 0.0017905102954341987 and 0,
  rarefied 0.0030804317646699105, 0.0030584963993553 and
  0.0021106596894612368.
- **the refusals of the draw**: 401 over the 200 individuals, "…the
  largest draw this dataset allows is 400, every gene copy of its 200
  individuals at a ploidy of 2…", at the first range it read, 2,224
  bytes; 40 over a list of 15, "…is 30…".

`numPassesOf("calcPopDiversity")` is 1, and over `panel.nei` popnei told
its progress twice, as for every pass of that file, with `bytesRead` 0
and 259,376.

The Vitest test of the runner, in node with popnei, asserts these
numbers as literals. The Playwright flow asserts them as the screen shows
them, to four decimals: with the filter at 0.05, the row p0 shows 48,
0.3527, 0.3567, 0.9288; with the filter at 1, 0.3519, 0.3564, 0.9267.
The flow loads `panel.nei` and the populations as a CSV,
`e2e/fixtures/panel_pops.csv`, which is `panel_pops.txt` of popnei
written as a CSV with the header `IID,popcat`, chooses the column
`popcat`, sets the
filter to 0.05, runs and reads the rows; sets it to 1 and sees the table
go with its notice; runs and reads the new rows; undoes and reads the
first rows again; and runs axe, a checker of accessibility, in each
state it reaches
(`.claude/skills/coding/testing.md`, "The walking skeleton, as a flow").

The flow of stage 3 adds, with the filter at 0.05: the two thresholds on
the individuals set in the Variants step; a Run of the diversity, which
calculates the statistics of each individual first and then the table,
p0 with 29 individuals, 0.3537, 0.3587, 0.9311; and the test of the
runner asserts the table above, from a job whose `individuals` are the
111 kept.

From stage 5 the test of the runner asserts the numbers of stage 5 as
literals, with the tables of stages 2 and 3 they extend: the two sets,
the list of 111, "All individuals" with its F and alleles, and NaN in
its three cells of private alleles and `numVarsEveryPop` `null`, since
the job does not ask for them, and p0
cut to 12, with `popDiversityPops` `["p2", "p1"]`, whose result has NaN
in the six new cells of p0 and the private alleles of p2 and p1 above;
and that the progress of a job of two calls goes `pass` 1 then 2 of
`numPasses` 2, and of a job with `popDiversityPops` empty 1 of 1. The
Playwright flow reads, with the filter at 0.05, the row p0 to its end,
48, 0.3527, 0.3567, 0.9288, −0.0113, 1.9792, 1.9646, 0, 0.0000, 0.0028,
and the row p2's private alleles, 1; the flow of stage 3 reads p0 of
29 individuals with F −0.0141; it types a draw of 96 and reads
`variantsNotInDraw` of p0, "277 of the 1,152 variants", and the column
headed with 96.

## The panel

The panel of the diversity in the analyses step of the population
genetics application, from the module above. It is drawn inside the
frame that every analysis shares, `src/ui/analyses/AnalysisPanel.tsx`,
which draws one of the seven states the store gives
(`.claude/skills/coding/react.md`, "The states of an analysis"). Its
heading, an `<h2>`, is "Diversity", the title by which the shell names
it in the notice and the status region, listed in
`src/ui/analyses/panels.ts` (`docs/specs/shell.md`, "What it sends and
reads"). The Analyses step of stage 2 is the `<h1>` "Analyses" and this
panel under it; from stage 4 the panel of the principal components
comes first, and a list of links to the two panels stands under the
`<h1>` (`docs/specs/shell.md`, "The links to the analyses"). The step
has no spec of its own.

### What it shows

No option in the walking skeleton: the two options of the module kept
their defaults, and a line under the table said which, "A variant
counts in a population when at least 20 of its individuals have a
called genotype there, and is polymorphic when its commonest allele is
below 0.95." From stage 5 the fields say it, and the line goes.

**The options**, from stage 5, above the Run button, three number
fields, each a command of `setAnalysisOptions` with the options of
`diversityOptions(p)` and the one changed:

- "Minimum number of individuals with a genotype, a whole number from
  0", 20; under it, "A variant has a value in a population only when at
  least this many of its individuals have a called genotype there. A
  population with fewer individuals has no values."
- "Frequency of the commonest allele below which a variant is
  polymorphic, from 0 to 1", 0.95.
- "Chromosomes drawn for the rarefaction, a whole number from 2", which
  shows the draw in use, 40, and, while it is the default, the line
  under it "The default: the ploidy, 2, times the minimum number of
  individuals, 20. The alleles and the private alleles of every
  population are also given for a draw of this many chromosomes, so
  that populations of different sizes can be compared, and the site
  frequency spectrum below the table is of the same draw."; once a number
  is typed, the line "Typed; the default would be 40." and a button
  "Use the default", which sends `numCalledAlleles` `null`. While the
  variants file is not read and the draw is the default, `drawOf` gives
  `null`, the field is empty, and the line under it says "The default:
  the ploidy of the variants file times the minimum number of
  individuals, 20." A number
  typed that is the default's is kept as typed, so the field does not
  follow a later change of the minimum without the user knowing.

The fields follow the rules of the number fields of the Variants step,
"A number the fields do not take" and "A character the fields do not
take" of `docs/specs/steps/variants.md`, with their nouns, "the
minimum", "the frequency" and "the number of chromosomes": "1 is less
than 2; the number of chromosomes stays 40.", "2.5 is not a whole
number; the minimum stays 20.", and the frequency takes two decimals,
as the threshold of the MAF does. The fields are there in every state
but empty, and stay editable while it runs, as the options of the PCA
and the filters of the Variants step do: a change leaves the
calculation behind, with the notice of the store
(`docs/specs/core/store.md`, "The notice, and the calculations it
stops"). A change of any of them is a command, which removes the table
as a change of a filter does, "the minimum number of individuals of the
diversity changed".

A table with one row per population, in the order of the result, with a
caption that says what it is over: "The diversity of each population,
over the 1,152 variants of panel.nei the filters kept." Its columns,
the rarefied ones naming the draw of the result, `numCalledAlleles`:

| column | from |
|---|---|
| Population | `pops` |
| Individuals | `numIndividuals`: the individuals of the population the calculation took |
| Expected heterozygosity (unbiased) | `unbiasedExpHet` |
| Observed heterozygosity | `obsHet` |
| Proportion of polymorphic variants | `polyRatio` |
| F | `fis`, from stage 5, and the columns below it |
| Alleles per variant | `numAllelesMean` |
| Alleles per variant, rarefied to 40 chromosomes | `numAllelesInDraw` |
| Private alleles | `privateAllelesTotal` |
| Private alleles per variant | `privateAllelesMean` |
| Private alleles per variant, rarefied to 40 chromosomes | `privateAllelesInDraw` |

F comes after the proportion of polymorphic variants and not beside
the heterozygosities it is made of, so that the first five columns of
the table and of its CSV are those of stages 2 to 4, and a program that
reads the CSV of an earlier stage by position reads this one.

The numbers are written to four decimals with a point, `0.3527`, the
same in every column, a negative F with a minus sign, `−0.0113`, and a NaN as "no value", in words, never as `NaN`
or a blank. The individuals and the private alleles are whole numbers.

Beside the button, a line says what the table was calculated with:
"Calculated with popnei 0.1.0, in version 0.1.0 of the application." The
first is `popneiVersion` of the state of the store, which is part of the
key the result is shown under, so it is the popnei that made it; the
second is `APP_VERSION`, the version the build writes into the page
(`docs/specs/entry.md`). The owner decided on 25 September 2026 that
every file the application writes records the two versions, and that a
CSV stays a plain table, with no line of versions to trip a program that
reads it, so the versions of a download are shown beside it on the page
(point E of `docs/specs/stage-2-open-points.md`).

A button, "Download the table as CSV", saves `panel.diversity.csv`, the
name of the variants file without `.nei`, `.vcf` or `.vcf.gz`, in any
case, so that `panel.vcf.gz` gives `panel.diversity.csv` too, or
`project` when the name is only one of them, `.nei`, as the name of a
project file is made (`docs/specs/core/projectFile.md`,
`projectFileName`), and `.diversity.csv` after it, with the text `diversityCsv` gives, in UTF-8 with no byte
order mark (below, "Not in this spec"): a header row, one row per
population, the numbers as `String` writes them, which reads back as the
same number in any program, and an empty cell for no value; a field with
a comma, a quote or a new line is quoted, as RFC 4180 has it. For the
flow with the filter at 0.05:

```
population,individuals,expected_heterozygosity_unbiased,observed_heterozygosity,proportion_polymorphic,f,alleles_per_variant,alleles_per_variant_rarefied,private_alleles,private_alleles_per_variant,private_alleles_per_variant_rarefied
p0,48,0.35267894847982756,0.35667985874177544,0.9288194444444444,-0.011344341019483117,1.9791666666666667,1.9646163579517928,0,0,0.0028348059148665707
p2,84,0.3440824705971255,0.3512406974637824,0.9105902777777778,-0.020803811522959625,1.9861111111111112,1.9595644507442256,1,0.0008680555555555555,0.0031646710919597015
p1,68,0.3498365468860467,0.35603713961547323,0.9157986111111112,-0.017724256612463796,1.9809027777777777,1.9582701017879214,0,0,0.002521711046320405
```

The CSV's headers are those of the Python script, whose table has the
same columns; the draw of the rarefied columns is not in their names,
so that a program reads the CSV of any draw by the same names, and the
page shows it beside the download: "Rarefied to 40 chromosomes."

### The states

| state | what the user sees | what they can do |
|---|---|---|
| empty | cannot happen: until the variants file is read the analysis is locked with a reason (`docs/specs/core/store.md`, "The state of an analysis") | |
| locked | the reason the store gives, as text beside a Run button that is disabled and described by it: "Choose the column that defines the populations, or all individuals in one population, in the Individuals step."; or the store's, once the individuals kept are known, when the filters keep no individual, or leave no population, in its words (`docs/specs/core/store.md`), or, from stage 5, when the draw is larger than their chromosomes, whose words send the user to the field of this panel; the three fields | go to the step the reason names; change the draw |
| ready | a Run button, and the populations it will run on with their sizes, "3 populations: p0, 48 individuals; p2, 84 individuals; p1, 68 individuals", the noun with each count so that no number is read as another thing, from `populationsBeforeRun` of `project.ts` with the individuals kept that the store gives; for the one population, "1 population, All individuals: 200 individuals", and, without a metadata file, the line "No metadata file: every individual is in one population.", the words of the Individuals step, so that a user who meant to load one learns it here; a population left empty is named after them, with what to do, since the panel is in the Analyses step and the filters in the Variants step, "p9 has no individual left after the filters of individuals, and is left out. Loosen the filters of individuals in the Variants step to keep it."; several populations left empty are named together, "p1 and p2 have no individual left after the filters of individuals, and are left out. Loosen the filters of individuals in the Variants step to keep them.", as `namesOf` of `project.ts` names them; and when the filters leave no population the diversity is locked, with those words whole beside the disabled Run (above, "Why it cannot run"); while a threshold on the individuals waits for the statistics of each individual, the populations the lists keep, before that threshold, and the line "Run calculates the statistics of each individual first, and the populations may lose individuals to the thresholds."; from stage 5, the populations under the minimum of individuals named after them, by `underMinimumText` of `project.ts` as the distances between populations name theirs, "p3 has 12 individuals, fewer than the minimum of 20, so it will have no values, and is left out of the count of the private alleles of the others."; and the three fields above the Run button | Run; change the options |
| running | a progress bar, "Calculating · 35% · 0:12", from the last `progress` of its `RunView`, and, from stage 5, "Calculating · pass 1 of 2 · 17% · 0:12" while the job makes two passes, the share being of the whole run; and the time since it started, counted every second; before the first `progress`, and while the request waits in the queue, the bar has no value and is drawn hatched over its whole length and still, since a bar that moved by itself through a long calculation would be motion the user cannot stop (WCAG 2.2.2), and the clock shows the calculation goes on, "Calculating · 0:12"; after a stop or a change of the load, when the store marks the request `afterStop`, "Waiting for panel.nei to be opened again, then calculating · 0:12"; while the statistics of each individual that it waits for are calculated, "Calculating the statistics of each individual, which the thresholds of the individuals need · 35% · 0:12", with their progress, the bar labelled "Calculating the statistics of each individual", since its share is theirs, and after a stop "Waiting for panel.nei to be opened again, then calculating the statistics of each individual, which the thresholds of the individuals need · 0:12"; the clock starts again at 0:00 when the statistics end and the request of the diversity is sent, with the words of its own calculation, as the part of the writing does (`docs/specs/analyses/writeVariants.md`); the three fields, from stage 5 | Stop, which cancels it, and the statistics with it; change the options |
| done | the table and its download; the warnings above the table, each as a sentence, with their count on the heading, "2 warnings", the spectrum's among them; after an opened project file, the comparison with its check numbers under the table; from stage 5, below the table, the block of the site frequency spectrum of `docs/specs/analyses/sfs.md`, "The block of the panel" | download |
| results removed | the words of the change that removed it, below, and, beside the Run button, the populations it will run on, as in the state ready | Run; the Undo or Redo of the notice or of the header |
| error | what happened and what to do, below; a refusal of popnei stays for these settings, and Run is not offered, since popnei would refuse them again; nor after `reopenFailed`, a variants file the browser can no longer read, which fails again until it is loaded again | Run again after another failure; change the settings after a refusal; load the file again after `reopenFailed` |

The owner decided on 25 September 2026 that the state results removed
lists the populations Run will take, as the state ready does, and that
Run is not offered after `reopenFailed`, since pressing it gave the same
words again with no sign that anything had happened.

The warnings are sentences above the table, where `react.md`, "The
states of an analysis", puts a count on the heading that opens the help
drawer at them: the drawer comes in stage 8, and a count that opened
nothing would hide the warnings. The skill is corrected when the owner
approves this spec.

"Undo brings back the table as it was, with no calculation" holds while the cache keeps
the result removed. It drops a result only to stay under its bound of
256 MB (`docs/specs/core/cache.md`), and a result of the diversity is a
few hundred bytes, the only kind of result of stage 2, so no session of
stage 2 fills it. Checked again for the PCA of stage 4, which keeps 10
components (`docs/specs/analyses/pca.md`, "How it runs"): at 9,381
individuals, the most popnei's PCA takes, its projections are 9,381 × 10
× 8 bytes, 750,480, and the names of the individuals, at eight
characters and 2 bytes a character as the cache counts a text
(`docs/specs/core/cache.md`), 150,096 more, about 0.90 MB in all; so
about 300 of them fill the bound of 268,435,456 bytes, and the words
hold for a session of stage 4.

The words of "results removed", and the line of a calculation stopped,
are written from the change itself, the cause of the notice,
`notice.cause`, as the shell's notice is, so that after an undo they do
not give the change undone as the reason, and after a new read of the
same file they do not say that a new file was loaded; the owner decided
so on 25 September 2026. The cause is a command, an undo or a redo, with
the description of the command, "the filter of the variants by missing data changed":

| the cause | results removed |
|---|---|
| a command | "The diversity was removed because the filter of the variants by missing data changed. Undo brings back the table as it was, with no calculation; Run calculates a new one for the new settings." |
| an undo | "Undone: the filter of the variants by missing data changed. The diversity was removed; Redo brings back the table as it was, with no calculation, and Run calculates a new one for the settings as they are now." |
| a redo | "Redone: the filter of the variants by missing data changed. The diversity was removed; Undo brings back the table as it was, with no calculation, and Run calculates a new one for the settings as they are now." |

The words say what each button gives, the table as it was, of the
settings before the change, or a new one, of the settings now, since
"brings it back" and "calculates it" left the user to guess whether Run
gave the same table again. "The table" is the diversity's word for its
result, which each analysis gives in its panel, `resultName`.

When the notice lists the analysis in `stopped`, its calculation stopped
at once by a change of the load of the variants file, the panel, ready
or locked, adds a line while that notice is up, from the same cause:

| the cause | the line |
|---|---|
| a command | "The calculation of the diversity was stopped because the variants file was read again with other options.", the description of the command that changed the load, which is "a new variants file was loaded" only after a new pick |
| an undo | "Undone: a new variants file was loaded. The calculation of the diversity was stopped." |
| a redo | "Redone: a new variants file was loaded. The calculation of the diversity was stopped." |

The notice itself, the toast with the words of a result both removed
and stopped, is the shell's (`docs/specs/shell.md`).

The comparison of an opened project file, `check` of the state done, is
shown under the table in the words of `checkVerdictText`, which
`docs/specs/core/projectFile.md` owns ("The comparisons after an
opening") and every analysis shares; the panel has none of its own. When
`check` is `null`, the line of `uncomparedText` of the same module is
shown there when it gives one: the numbers are not compared because the
VCF was read with other read options than the project file's, as the
owner decided on 25 September 2026; it is built with the rest of the
comparison, in task 9.4 of `docs/plans/walking-skeleton.md`.

The bar is the share of the run done, from popnei's four numbers,
`(pass − 1 + bytesRead / numBytes) / numPasses`, written as a whole
percentage rounded down, so that it says 100% only when the file is
read; until stage 5 the diversity was one pass, `numPassesOf("calcPerVarDistribs")` 1 of
`js/popnei/src/passes.ts`, and the bar filled once; from stage 5 it is
two, one for each call, which the runner tells as passes 1 and 2 of 2
(above, "The request"), and the bar fills once over the two. A pass over a `.nei`
file ends a little below the size of the file, 259,376 of the 261,490
bytes of `panel.nei`, since popnei does not read its head
(`docs/specs/worker/runner.md`, "Progress"), so the bar may stop at 99%
and the result replaces it, at the end of the second pass. The bar is
of the whole run: it is at 49% when the first pass ends over
`panel.nei`, and the second pass takes it on from there; "pass 1 of 2"
and "pass 2 of 2" beside it say which pass is reading. Until stage 5 no run
made two passes, since the PCA asks popnei for no weights of the
variants and reads the file once (`docs/specs/analyses/pca.md`, "The
request").

The state `running` covers a request that waits in the queue of the
calculation worker as well as one that runs; the store does not tell
them apart, and a request that waits has no `progress`. "Opened again"
is what happens after a stop that ended the worker, or after an undo
back to a load already read: the new worker reads the header of the file
before it calculates (`docs/specs/core/store.md`, "The notice, and the
calculations it stops").

### What it sends and reads

It reads, through `useAppState`, the hook by which a screen reads the
state of the store (`.claude/skills/coding/react.md`, "Reading core"),
the status of `diversity` among `state.analyses`, the `RunView` of its
run, what the store says of a calculation under way, for `afterStop`,
the notice,
and the project for `populationsBeforeRun` of `project.ts` and the name of the variants file,
and the individuals kept as the store gives them, or that they wait for
the statistics of each individual (`docs/specs/core/store.md`);
and the time the run started, `startedAt(runId)` of `src/ui/runs.ts`,
with the `runId` of its running state (`docs/specs/entry.md`, "The
outcome of a calculation"). Run calls `startAnalysis(store,
"diversity")` of `src/ui/runs.ts`, which sends `store.startRun` and
hands the outcome to the store (the same section), and Stop sends
`store.cancelRun("diversity")`. From stage 5 it reads the options with
`diversityOptions(p)` and the draw in use with `drawOf(p)`, and each
field is `store.apply(description, (p) => setAnalysisOptions(p,
diversity, { ...diversityOptions(p), ‹the option› }))`, as the options
of the PCA are (`docs/specs/analyses/pca.md`, "What it sends and
reads"), with the descriptions of "Its words". It holds no state of the
project; the one state of its own is the tick of the clock of the
running state, which stops when the state is left.

### Its words

The locked reasons and the warnings are those of the module, above. The
error state, by what the store gives:

| the failure | the text |
|---|---|
| the statistics of each individual that a Run waited for were refused by popnei, or failed, which the store gives as the failure of the statistics, `ofStatistics` (`docs/specs/core/store.md`, "The state of an analysis") | "The statistics of each individual, which the thresholds of the individuals need, could not be calculated, so the diversity was not run. " when the diversity's own Run waited for them, `waited`, and "… so the diversity cannot run. " when it did not, the statistics having been asked by another Run, as the owner decided on 29 September 2026 (stop C 4 of `docs/specs/stage-4-open-points.md`), where both said "was not run"; then the words the part of the statistics gives that failure, `refusalText` of `docs/specs/analyses/individualChecks.md` for a refusal of popnei: "… popnei could not read panel.vcf.gz: ‹its message›. Correct the file, or fetch it again, and load it in the Variants step."; since 28 September 2026 their pass has no filter, so filters that keep no variant are no longer among their failures. The rows below are never given the message of the statistics, which would name the diversity for a calculation that was not its own |
| popnei refused a pass over a variants file that holds no variant: its message starts with "the pass gave no variant and its source holds none", and the file is a `.nei` file or a VCF read with every variant | "empty.vcf has no variants, so there is no variant to calculate the diversity over. Load another variants file in the Variants step." |
| the same refusal, of a VCF read with only the variants that passed its filters, `onlyPassed` | "failed.vcf has no variant with PASS or . in its FILTER column, and it was read with only those, so there is no variant to calculate the diversity over. Untick "Only the variants with PASS or . in the FILTER column" in the Variants step and read the file again." |
| popnei refused an empty pass: its message starts with "the pass gave no variant:", with the colon, which the refusal of a source that holds none does not have at that place | "The filters kept none of the variants of panel.nei, so there is no variant to calculate the diversity over. Loosen the filters in the Variants step." |
| popnei refused a genotype of another ploidy than the one the VCF was read with: its message starts "line ‹n› of the VCF, the column of ‹individual›: its genotype is of the ploidy ‹found› and the reader was asked for the ploidy ‹given›" | "At line 5 of tetraploid.vcf.gz, the genotype of t00 has 4 alleles, and the file was read with ploidy 2. If every genotype of the file has 4 alleles, set the ploidy of the VCF to 4 in the Variants step and read the file again. A file that mixes ploidies, such as one with the X of males haploid among diploid autosomes, cannot be read in this version." |
| popnei refused a line of the VCF it cannot read, or a gzipped file that is damaged or cut short: its message starts "line ‹n› of the VCF" or "the VCF was written by bgzip" | "popnei could not read panel.vcf.gz: ‹its message›. Correct the file, or fetch it again, and load it in the Variants step." |
| popnei's LD filter, the LD filter of the Variants step, refused a variant that does not come after the one before it on its chromosome: its message starts "the variant ‹n› of the ones the filter by linkage disequilibrium has read" | "The LD pruning of the Variants step needs the variants of each chromosome together and in the order of their positions, and panel.vcf.gz does not have them so: on chromosome 1, a variant at position 10 comes after one at position 30. Sort the file, with bcftools sort for a VCF, and load it again, or turn off the LD pruning in the Variants step.", the filter named as the switch of the step names it, "the LD pruning" (stop A 1 of `docs/specs/stage-4-open-points.md`, carried to these words on 29 September 2026) A variant of a chromosome that had already ended: "…: a variant of chromosome 1, at position 10, comes after a variant of another chromosome, though variants of chromosome 1 came before that one." |
| popnei refused a request with no population: its message starts with "`pops` names no population", which only the thresholds on the individuals can bring about; an error after the Run and not a lock before it, as the owner decided on 26 September 2026 (point B of `docs/specs/stage-3-open-points.md`) | "The thresholds of the filters of individuals leave none of the individuals of panel.nei that have a population in popcat, so no population is left. Loosen the thresholds in the Variants step." |
| popnei refused for another reason | "popnei could not calculate the diversity: ‹its message›. Change the settings, or load the variants file again, to run it again." |
| the browser can no longer read the variants file, `reopenFailed`, as the owner decided on 25 September 2026 (point B of `docs/specs/stage-2-open-points.md`) | "panel.nei could not be read again; it may have changed on the disk since it was picked. Load it again in the Variants step." |
| the worker crashed, `workerFailed` | "The calculation stopped unexpectedly. Run it again. If it stops again, load panel.nei again in the Variants step." The second sentence is for a trap of popnei that comes back at every run, which a new load, and the new worker it starts, can mend |
| a mistake of our code, `defect`: a message of ours that did not validate, a request the worker refused, a `popnei_web defect:` thrown in the calculation worker, or popnei's refusal of an option it does not know (`docs/specs/worker/client.md`, "Crashes, defects, and every read answered") | "The application met an error of its own: ‹message›. Run it again.", with the message the client gives, "popnei gave 10 projections for 3 individuals and 2 components", or popnei's own for an option: "The application met an error of its own: popnei: `numCompsKept` is not an option of `doPcoaFromVariants`, whose options are `minNumSnps` and `correctByLingoes`. Run it again." |
| the worker could not start, `couldNotStart` | "The application could not start its calculations. Save the project, reload the page, and open the project again." |
| a stale file after a deploy, `protocolMismatch` | "The page is out of date. Save the project, reload the page, and open the project again." |
| the files wasm refused, `files` | cannot happen: the calculation worker, which runs every job, holds no files wasm, and no answer of it becomes this kind (`docs/specs/worker/client.md`, "Crashes, defects, and every read answered") |

The owner decided on 25 September 2026 that a variants file with no
variant is told so, and not told to loosen the filters, which cannot
help when no filter is set. popnei gives the words of the file with no
variant whether the filters are set or not, since the file gave none
before any filter. It gives them too for a VCF read with only the
variants that passed, the default of the Variants step, when no variant
of the file has PASS or . in its FILTER column: the variants that failed
are dropped as the file is read, before any filter, and popnei counts
none in the source. Such a file does hold variants, which the same file
read with every variant gives, so the words say which box to untick
rather than to load another file; they hold as well for a VCF of a
header alone read that way, which has no variant with PASS either.

popnei gives the same refusal for a VCF all of another ploidy than the
one it was read with and for a VCF that mixes ploidies, and nothing in
it tells the two apart, so the words of the ploidy cover both: the
ploidy to set, if every genotype has the ploidy found, for the first,
and, for the second, that this version cannot read it, as the owner
decided on 26 September 2026 (point 7 of the reviews of work packages 2
to 6 of `docs/plans/walking-skeleton.md`, under "The rounds of 25
September" of its report). The condition comes first, since a file with
the X of males haploid among diploid autosomes, read with ploidy 2, is
refused at a haploid genotype and would otherwise be sent to ploidy 1,
and there refused at a diploid one, as the review of task 9.7 of the
plan found on 26 September 2026. The option not taken was a change to
popnei that tells the two apart.

`refusalText` of the module makes the eight after the first, the message without
its full stop as `project.md` shows popnei's messages. In the row of a
refusal for another reason, ‹its message› is popnei's sentence shown as
text with its backquotes left out, as in every panel
(`docs/specs/analyses/pca.md`, "Its words"): a refusal no row foresees is
one the application did not expect, and popnei's words are then the only
account the user has, so they are not rewritten.

The words of the LD filter's refusal take from popnei's message only the
chromosome and the two positions, which it gives as "on the chromosome
‹name›" and "it is at the position ‹p› of its chromosome and the variant
before it at the position ‹q› of the same chromosome", or "of a
chromosome that had already ended" (`TheOrderOfTheVariants` of
`crates/popnei/src/filters.rs` of popnei); a message they cannot be read
from gives the words without the place, "…and panel.vcf.gz does not
have them so. Sort the file, …". popnei's own sentence names the variant
by its count among those the filter read and ends with `bcftools sort`
between backquotes, neither of which a user of the application can use.
The words are made in one place, `ldOrderText` of
`src/core/analyses/words.ts`, from stage 4, given the filter's name and
how to turn it off; `refusalWords` gives them with the LD filter of the
Variants step, so the Count, whose words are this table's, gives them
too, and the PCA gives them with its own LD filter as well
(`docs/specs/analyses/pca.md`, "Its words"). The statistics of each
individual, which read no filter since 28 September 2026, never meet
this refusal.

```ts
/** The words of popnei's refusal of a variant out of the order of its
    chromosome by an LD filter, `filter` naming the filter, "The LD
    filter of the Variants step", and how to turn it off, "turn off the
    LD filter in the Variants step"; null when `message` is not that
    refusal. Throws a defect on a project with no variants file. */
export function ldOrderText(
  message: string,
  p: Project,
  filter: { readonly name: string; readonly turnOff: string },
): string | null;
```

A VCF is refused
at the first pass and not at its open for its ploidy and for a line it
cannot read, since popnei
opens a VCF by its header and reads its lines only in a pass
(`docs/specs/worker/runner.md`, "Opening the load"); the source is read,
so the Variants step shows nothing wrong, and the panel's words are the
ones that say what to do. popnei's refusals have
no kind by which a program can tell them apart, so the file with no
variant, the empty pass, the
ploidy, a line of the VCF and the order of the LD filter are recognised
by the start of the message,
the empty pass by "the pass gave no variant:" with its colon, so that
neither of the first two is taken for the other whatever the order they
are tested in; and the test of the runner,
which calls the popnei of the release, fails if a new release words it
otherwise; a kind for it is what popnei's issue #3 asks for other
refusals. A refusal for memory, which a new load can mend
(`docs/specs/worker/protocol.md`, "The cases"), is why the second text
offers a new load.

The descriptions of the three commands of the options of stage 5, which
the notice and the words of "results removed" give, are "the minimum
number of individuals of the diversity changed", "the frequency below
which a variant is polymorphic changed" and "the number of chromosomes
of the rarefaction changed"; setting the draw back to its default is
the last.

The help, a few lines of Markdown for the help drawer of stage 8, as
revised for stage 5:

- What it gives: for each population, over the variants the filters
  kept, the expected heterozygosity, unbiased (Nei, 1978), the chance
  that two gene copies taken from the population carry different
  alleles, corrected for the size of the sample; the observed
  heterozygosity, the share of the called genotypes that are
  heterozygous; the share of the variants whose commonest allele is
  below 0.95; F, one minus the mean observed heterozygosity over the
  mean expected one, 0 under random mating, positive with fewer
  heterozygous genotypes than that, as inbreeding, selfing or a
  population made of unmixed groups give, and negative with more; the
  alleles per variant; and the private alleles, those no other
  population has at the same variant. Each is over the variants that
  have a value in the population, the private alleles over those at
  which every population has one. Without a metadata file, or with all
  individuals in one population, the table has one row, "All
  individuals", the diversity of the whole set, whose expected
  heterozygosity is above that of its populations when they differ in
  their frequencies, and no private alleles.
- The rarefaction: the alleles and the private alleles grow with the
  number of individuals sampled, so each is also given for a draw of
  the same number of chromosomes in every population, the alleles a
  draw is expected to show. The proportion of polymorphic variants is
  not rarefied: on variants of two alleles it would be the rarefied
  alleles per variant minus 1.
- Its defaults: a variant has a value in a population only when at least
  20 of its individuals have a called genotype there, so that no mean
  leans on frequencies estimated from a handful of individuals; a
  population of fewer than 20 has no values, and is left out of the
  count of the private alleles of the others, which it would otherwise
  take away. 20 and 0.95 are popnei's defaults. The draw is the ploidy
  times that minimum, 40 for diploids, which every variant with a value
  reaches, so the rarefied values are over the same variants as the
  others; a larger draw leaves out the variants where a population has
  fewer chromosomes called.
- When not to trust it: the proportion of polymorphic variants and the
  raw alleles grow with the number of individuals, so populations of
  very different sizes are compared by the rarefied values; a
  population that has a value at fewer variants than the filters kept,
  which its warning reports, has its means over other variants than
  the rest, and a stricter missing data filter keeps the variants most
  individuals have called; a MAF filter of the Variants step removes
  the variants whose rarer allele is rare over all the individuals, so
  it raises the heterozygosities, the proportion of polymorphic variants
  and the alleles of every population; an allele private among the populations of
  the file may be found in a population that was not sampled; the
  heterozygosities are over the variants of the file, not per site of
  the genome, and cannot be compared with values over all sites, nor
  between panels of variants chosen in different ways.
- In Python: `popnei.calc_per_var_distribs(variants, pops=pops)`, whose
  `unbiased_exp_het.mean`, `obs_het.mean` and
  `poly_vars_ratio.poly_ratio` are the first three columns, and
  `popnei.calc_pop_diversity(variants, pops, num_called_alleles=40)`,
  whose `fis`, `num_alleles` and `private_alleles` are the others.

### Accessibility

A screen reader is the program that reads the page aloud to a user who
cannot see it; the focus is the element the keyboard acts on, which Tab
moves.

- The table is a plain HTML table, `<table>`, named by its caption, the
  caption's element given to the table as `aria-labelledby`, with a
  header cell, `<th scope="col">`, for each column, and the cell of the
  population of each row a header cell of its row, `<th scope="row">`,
  so that a screen reader reads "p2, Observed heterozygosity, 0.3512".
  A screen reader moves through it by its own keys for tables; the Tab
  key does not stop at its cells, which hold no control. It sits in a
  frame that scrolls sideways when the page is narrower than the table.
  The words of a header cell wrap between words when the table would
  not fit otherwise, and the numbers never do: on one line the table is
  1,012 px wide on the Mac and 1,186 px with DejaVu Sans, the sans-serif
  font of Ubuntu, wider than its column of 1,024 px on a window of 1,280,
  where it would scroll on Linux at every width. On the Mac the headers
  stay on one line on a window of 1,050 px and wider, and wrap below. At
  320 px, in Chromium 153 and WebKit 26.6 on the Mac, the table is 564
  px wide in a frame of 288 px, its headers on up to four lines, and
  the frame shows the populations, their individuals and the start of
  the expected heterozygosity.
  These widths are of the five columns of stages 2 to 4, measured on
  28 September 2026; the eleven of stage 5 make the table wider, by a
  width not measured, and it scrolls in its frame on more windows.
  The owner decided on 28 September 2026 that the headers wrap. While
  the table is
  wider than its frame, and only then, three things say so and let it be
  scrolled. A line under the caption, "Scroll the table sideways to see
  all its columns."; a shadow on each edge of the frame toward which the
  table can scroll, which goes from an edge when the table is scrolled
  to its end there; and the frame is reached by the Tab key and is a
  region named by the caption, so that a user of the keyboard scrolls it
  with the arrow keys (2.1.1, which asks that everything be done with
  the keyboard). When the table fits, the frame is neither a stop of the
  Tab key, which would stop on nothing, nor a region, whose name a
  screen reader would read as a second caption. Whether the table fits
  is measured again whenever the frame or the table changes size, a
  window resized or zoomed, a new result. The line is true at any
  width, since it names no column, and the frame is the table's in
  `src/ui/widgets/Table.tsx`, so every table of results later has it.
  The number of individuals is its own column, not a colour or a note. The
  owner decided on 25 September 2026 that it is not React Aria's
  `Table`, whose removal took 14.19 KB gzipped off the page's first
  script, for a table of a few rows that is neither sorted nor
  selected; React Aria's
  `Table` is for the sortable tables of later stages
  (`docs/technology.md`, "React Aria Components").
- The progress bar is React Aria's `ProgressBar`, labelled "Calculating
  the diversity", or "Calculating the statistics of each individual"
  while the Run waits for them, whose value a screen reader reads when the user reaches
  it, "35%"; it is not in a status region, so it is not read out at each
  of its changes, and neither is the clock. Before the first `progress`
  it has no value, which a screen reader reads as busy.
- The start and the end of a run are announced by the shell's status
  region, an element whose text a screen reader reads out when it
  changes, without moving the focus (WCAG 2.2, success criterion 4.1.3,
  which asks that such messages reach a screen reader without taking the
  user away from where they are). The words are the shell's, and this
  spec does not repeat them (`docs/specs/shell.md`, "The status region").
  The
  notice of results removed is the shell's toast, the small panel at the
  bottom of the page, which is read out by itself.
- The three fields of stage 5 are React Aria's `NumberField`, each
  named by its label and described by the line under it, so that a
  screen reader reads "Chromosomes drawn for the rarefaction, a whole
  number from 2, 40, The default: the ploidy, 2, …"; the line of a
  number refused is announced, as in the Variants step.
- "Use the default" goes when it is pressed, the draw being the default
  again, and the focus moves to the field of the draw, so that a user
  of the keyboard is not sent to the top of the page (2.4.3).
- The keyboard: in the order of the screen, the three fields and "Use
  the default" when it is there, the Run or Stop button, the
  warnings, the table, the download; the line of the versions beside it
  is text. Run and Stop are one button in one
  place, so the focus stays on it when it changes. The button goes when
  the run ends done, ends refused by popnei, or ends with a variants
  file the browser can no longer read, since none of these states
  offers Run; and Stop turns into a disabled Run when a Run that waited
  for the statistics of each individual ends locked, the filters of
  individuals keeping no one, and a disabled button cannot hold the
  focus. Then, when the focus was on the button, it moves to the
  heading of the panel, as the Write does in the same state, so that a user of the keyboard is not sent to the
  top of the page (2.4.3, which asks that the focus move in an order
  that keeps the meaning). When the focus was elsewhere, it stays where
  it is.
- The locked reason is text on the screen, which a screen reader reaches
  in its reading, and the description of the disabled button; a disabled
  button alone would say neither why nor what to do.
- A warning says it is one in words, "Warning:", as well as by its icon
  and its colour (1.4.1, which asks that colour never be the only way a
  thing is told).

### Left for the running application

The layout: where the warnings go, whether the populations can be sorted,
the width of the columns, how the ready state lists many populations,
and, from stage 5, where the three fields go, whether the rarefied
columns are grouped under one header, and whether the population stays
in view while the table scrolls sideways. The
four decimals, which the flow reads, and "no value", which can become a
dash with that as its accessible name, are to be judged on the screen.

## What this spec relies on in the specs written beside it

Each of these was approved by the owner on 25 September 2026 and says what is listed
here; where one of them comes to say otherwise, the two are settled
before the plan of stage 2. What stage 3 asks of them, and of the specs
written with it, is in the second list.

- `docs/specs/worker/runner.md`: the runner answers the request of
  "The request" as said there: the filters in their order,
  `numIndividuals` of what it gave popnei, every array in the order of
  the request whatever order popnei gives; and its test
  asserts the numbers of the table above and popnei's messages of the
  file with no variant, of the empty pass and of the ploidy, as
  literals.
- `docs/specs/worker/messages.md`: the check of each member of `Job` and
  `JobResult` is written there from the fields this spec gives, the
  arrays checked with `instanceof`.
- `docs/specs/worker/client.md`: the client opens the file of the load
  of `fileId` with its read options before the request, and the runner
  finds it open.
- `docs/specs/core/projectFile.md`: it saves the options of the diversity
  when the project holds them, and its check numbers, with its key
  version, and reads them back through `parseOptions`; its example and
  its fixture `v1-nei-diversity.popnei.json` hold the check numbers of
  "The check numbers"; `checkVerdictText` gives the words of the
  comparison.
- `docs/specs/entry.md`: `apps.ts` lists the definition; `startedAt(runId)` of `src/ui/runs.ts` gives the time a
  run started; `APP_VERSION` is the version of the application.
- `docs/specs/worker/client.md` and `messages.md`: the `progress` of a
  run carries popnei's four fields, which the store keeps on its
  `RunView`; a run whose file no longer reads fails as `reopenFailed`.
- `docs/specs/shell.md`: the status region announces the start, the end
  and the stop of a run, in the shell's words; the notice of results
  removed and of calculations stopped is the shell's, with its words; its
  stepper shows `populationsNeeds`.
- `docs/specs/steps/variants.md`: the missing data filter can be set to
  0.05 and to 1, and its command is described "the filter of the variants
  by missing data changed"; the step sends the user to this panel for a VCF refused at
  its first pass for its ploidy; its button "Read ‹name› again with
  ploidy N" is where the words of that refusal send the user.
- `docs/specs/steps/individuals.md`: the step offers as the column of
  the populations the columns other than the first, sets the grouping
  with `setGrouping`, has the `<h1>` "Individuals", lists the populations
  with `populationsToRun`, and shows `populationsNeeds` at its select.
- The flow of the walking skeleton covers a Cancel in the middle of a
  run (`docs/specs/worker/client.md`, "How it is verified") and the save
  and the opening of a project after a run of the diversity
  (`docs/specs/core/projectFile.md`), so the flow of this spec has
  neither.

What stage 3 asks, of specs revised or written beside this revision:

- `docs/specs/worker/protocol.md`, `messages.md` and `runner.md`: the
  job with `individuals` in place of `individualFilters`, put on the
  `Variants` with `filterIndividuals` before the filters of the variants,
  since 28 September 2026;
  the result with `passStats` in place of `numVars` and `numVarsRead`;
  the runner's test asserts the table with the thresholds, above.
- `docs/specs/core/store.md`: `c.individuals` of the bound client; the
  individuals kept, or that they wait for the statistics, in the state
  the panel reads; a Run that calculates the statistics first, with
  their progress in the running state, and a Stop of both; the lock of
  no individual kept, in its words.
- `docs/specs/core/individualsKept.md`: `byLists` of `individualsKept`, the
  individuals the lists to keep and to remove keep, with no statistics,
  for `needs` and `numCheckNumbers`.
- `docs/specs/entry.md`: `countsOf` in place of `numVarsOf`, reading
  `passStats`.
- `docs/specs/steps/variants.md`: the filters of individuals, and their
  commands described as the notice says them.

What stage 4 asks, of specs revised or written beside this revision, 27
September 2026:

- `docs/specs/core/project.md`: `populationsOf`, `populationsToRun`,
  `populationsKept`, `populationsBeforeRun` and `populationsNeeds` in
  `project.ts`, with `"all"`
  and the one population "All individuals"; `individualsNeeds` giving no
  reason for no file in population genetics; the grouping
  `onePopulation`.
- `docs/specs/core/projectFile.md`: 4 check numbers for the one
  population, and the fixture `v1-one-population.popnei.json`.
- `docs/specs/worker/runner.md`: the runner's test asserts the one
  population's numbers above; a population named "All individuals" is a
  population as any other to the runner.
- `docs/specs/steps/individuals.md`: the item "All individuals in one
  population" sends `setGrouping(p, { kind: "onePopulation" })`, and
  the step lists the one population with `populationsToRun`.
- `docs/specs/shell.md`: the stepper and the summary line read the
  populations of `project.ts`.
- `docs/specs/analyses/pca.md`: the PCA keeps 10 components, which the
  words of "Undo brings back the table" above were checked against, and
  reads the file once.

After the review of the same day:

- `docs/specs/core/individualsKept.md`: when the lists to keep and to
  remove leave no individual, the list kept is known and empty whatever
  the thresholds, since a threshold can only remove more; so the store
  locks with `keptNoneReason` before a Run, with no statistics
  calculated for a list that cannot keep anyone.
- `docs/specs/core/store.md`: a result that comes back under its key
  after a record, a read of the metadata file, leaves the results
  removed of the notice, as one done again by a calculation does
  (above, "The cases").

When the specs of stage 4 were made to agree, the same day:

- `docs/specs/analyses/pca.md`: its rows of the LD filter over a file
  not sorted by position cite `ldOrderText`, whose words are above, in
  "Its words", and its row of any other refusal leaves popnei's
  backquotes out, as the row here does; made there.

## What this spec asks of other documents

The revision of stage 5, 30 September 2026, asks these changes, which
were made in those documents the same day, with what the specs of the
distances between populations and of the LD decay ask of this spec:
the populations of `popDiversityPops` split by `populationsWithMinimum`
of `project.ts`, which the distances call too, the populations under the
minimum named in the ready state by `underMinimumText`, the reasons of
no population by `populationListsNeeds` and `populationsKeptNeeds`, and
the two warnings of the populations made by `populationWarnings`, given
the words of each analysis (above, "Why it cannot run", "The request",
"The warnings" and "The states"):

- `docs/specs/worker/protocol.md`: `DiversityJob` with `numCalledAlleles`
  and `popDiversityPops`, and `DiversityResult` with the ten fields of
  stage 5, as "The TypeScript interface" above has them.
- `docs/specs/worker/messages.md`: the checks of the new fields: each
  new array of the length of `pops`; `popDiversityPops` names of `pops`,
  in its order, each once; `numCalledAlleles` a whole number of 2 or
  more; `numVarsEveryPop` and `numVarsEveryPopInDraw` both `null` or
  both whole numbers.
- `docs/specs/worker/runner.md`, "The diversity": the second call,
  `calcPopDiversity` over `popDiversityPops`, with `stats` as "The
  request" says and none when it is empty; the arrays of a population
  not given to it NaN, and its counts 0; `passStats` of the first call.
  "Progress": the runner no longer passes every call on unchanged for
  the diversity, but tells its two calls as passes 1 and 2 of 2, and
  the sentence that no run makes two passes becomes true of stage 4
  alone. "How it is verified": the numbers of stage 5 above, as
  literals, and the progress of a job of two calls and of one.
- `docs/specs/core/store.md`: the doc comment of `keptNeeds` names the
  diversity's second reason, the draw larger than the chromosomes of
  the individuals kept, beside the population it leaves none of.
- `docs/specs/core/projectFile.md`: `parseOptions` of the diversity
  takes three fields in version 1 ("The versions of the format"); the
  sentence that F could join with the check numbers as they were, "and
  then neither changes", says instead that the check numbers stay and
  the key version is 3, since the result has new fields; and its list of
  what it relies on gives the diversity a key version of 3, where it
  says 1.
- `docs/functionality.md`, section 6: that a private allele needs a
  second population, so the table has none for the one population, or
  when one population alone has the minimum of individuals; and, under
  "Rarefaction", that the warning comes when a population reaches the
  draw at fewer variants than it has a value at, which only a draw
  larger than the default gives, in place of "at few of its variants".
- `docs/specs/analyses/sfs.md`, written beside this revision: nothing
  more; this spec takes what that spec asks of it, the spectrum in the
  call, `foldedSfs` in the result, its warnings appended and its block
  below the table, the default draw at 2 or more, the script's result
  named `diversity`, and a decision on the MAF filter (above, "The
  warnings"), while its **Open 1** is the owner's.
- `docs/specs/stage-5-open-points.md`: nothing to decide; the time of
  the second pass, under "Set by a measurement", is this spec's.

## Open points

The open points of the eleven specs of stage 2 are gathered in
`docs/specs/stage-2-open-points.md`. The five this spec had were decided
by the owner on 25 September 2026, and are written above as decided: the
metadata file and a column of populations required in stage 2 and
optional from stage 4 (point A there); polymorphic below 0.95, with
`docs/functionality.md` corrected (G); the warning of variants without a
value whenever any are skipped, with their number and share (H); the
check numbers, the number of variants kept and the three numbers of each
population (D); and the filters of individuals locked in stage 2 (F).
The one that was open again since, which popnei function gives the
three columns (point D there again), was settled by the owner with the
approval of this spec: `calcPerVarDistribs` of the same release, and
`calcPopDiversity` in stage 5.

The one opened by the revision of stage 3, point B of
`docs/specs/stage-3-open-points.md`, was decided by the owner on 26
September 2026 as it was recommended. Thresholds on the individuals that
leave no individual with a population, while the filters keep some, are
told by popnei's refusal after the Run, which comes at once, before any
pass, and is shown as the error of "Its words" above; the ready state has
already named, before the Run, the populations left empty whenever the
statistics of each individual are in the page. The option not taken was
a lock before the Run, a function more in the definition of every
analysis, `needsKept(p, kept)`, which the store would ask with the list
of the individuals kept: a change of the interface of section 4 of the
architecture that would lock only when the statistics are already in the
page, the case the ready state already names.

The revision of stage 5 opens no point for the owner of its own. It
rests on the owner's five decisions of 30 September 2026, and on
**Open 1** of `docs/specs/analyses/sfs.md`, whether the site frequency
spectrum is part of the diversity, as this spec is written meanwhile,
or an analysis of its own, which would take `folded_sfs`, `foldedSfs`,
the spectrum's warnings and its block out of this spec ("What it
does"). The writer decided these beyond them, each written where it
applies; the owner may answer any of them otherwise:

- No private alleles when one population alone is in the call ("The
  populations"). Otherwise the table shows every allele called as
  private, 2,304 for "All individuals" of `panel.nei`.
- The check numbers as they were ("The check numbers"). Otherwise every
  project file of stages 2 to 4 with a diversity is refused at the
  opening, unless `numCheckNumbers` learns to read the key version saved.
- The lock of a draw larger than the chromosomes of the individuals
  kept ("Why it cannot run"). Otherwise the user waits a whole pass
  for popnei's refusal.
- The eleven columns, F after the proportion of polymorphic variants,
  and the total of the private alleles beside their means ("What it
  shows"). Otherwise the first five columns of the CSV are no longer
  those of stages 2 to 4.
- No warning of a MAF filter on the table ("The warnings"). Otherwise
  a warning for a filter the user turned on.
- `variantsNotInDraw` whenever one variant is outside the draw, and
  `docs/functionality.md` changed to say so, where it says "at few of
  its variants" ("The warnings"). Otherwise a number that makes "few".
- `noFInHaploid`, words for F in a haploid file, where popnei gives NaN
  ("The warnings"). Otherwise "no value" with no word why.

## Not in this spec

- The folded site frequency spectrum, which the same call gives: its
  module, its warnings, its block of the panel and its lines of the
  script are `docs/specs/analyses/sfs.md`.
- The histograms of the statistics of each population, which this
  spec placed in stage 5 until 30 September 2026: stage 5 of
  `docs/build-order.md` does not name them, and no stage has them.
- The curve of the rarefied alleles against the number of chromosomes
  drawn, which shows whether a population was sampled enough: popnei
  gives one draw a call, and the application offers one.
- The frame of the seven states, `AnalysisPanel.tsx`, as a component: the
  plan of stage 2 builds it with this panel; what it shows here is its
  spec until a second analysis needs more.
- The notice, its words and its toast, the status region and the header:
  `docs/specs/shell.md`.
- Whether pandas reads a number of the `.xlsx` the report writes as the
  text the application names its population with, `1` and not `1.0`:
  the report, stage 6, which writes that file. The application names a
  population of a cell of an xlsx by `String` of the cell from stage 4
  (`docs/specs/core/project.md`, "The populations").
- How a CSV opens in Excel set to a language whose separator is `;`, and
  whether the downloads start with the byte order mark of UTF-8, which
  makes Excel read the accents of a name right and puts a stray
  character before the first header in a program that does not expect
  it: the downloads of every table, a point for the report of stage 6.
