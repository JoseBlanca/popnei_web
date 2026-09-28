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
4, the Individuals step whole, not yet approved: without a metadata
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
and give the PCA's own LD filter in the place of its pruning. Not yet
reviewed or approved; it changes the code of stage 3 too.
The code of stage 2 is in
`src/core/analyses/diversity.ts`. This spec gives the first analysis of the population genetics
application, in its form for the walking skeleton: the module
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

## The module

### What it does

For each population it gives three numbers over the variants the filters
kept, each the mean over the variants that have a value in that
population, and the number of individuals the calculation took:

- the expected heterozygosity, unbiased (Nei's), popnei's
  `unbiasedExpHet.mean`;
- the observed heterozygosity, `obsHet.mean`;
- the proportion of polymorphic variants, `polyVarsRatio.polyRatio`: the
  variants whose commonest allele has a frequency below 0.95 in the
  population, over the variants that have a value there.

All three come from one call of popnei's `calcPerVarDistribs`
(`js/popnei/src/stats.ts`), whose numbers are verified in popnei against
plink2 and pyNei; the application computes none of them.

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

What a user would see go wrong because of this module, and what each rule
below prevents: a table of other settings shown as current, when the key
misses an input; a population whose row is empty with no word why; the
means of two populations compared over different variants, unsaid; a
run refused by popnei with a message about its arguments, when the
module could have said beforehand what was missing.

Two numbers of popnei's call, both its defaults, decide what the user
reads, and neither has a control in the walking skeleton:

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

Both are options of the analysis. A project holds them only once the
user sets them, and until then the analysis runs with its defaults, 20
and 0.95, `DIVERSITY_DEFAULTS` (`docs/specs/core/project.md`, "an
analysis with no entry runs with its defaults"); a control for them
waits for stage 5, with the rest of the diversity, so a project of stage
2 holds no entry for the diversity, and its project file writes
`"analyses": []`. The module gives both numbers to popnei explicitly,
whether they come from an entry or from the defaults, and the Python
script writes them, so that the script says what the numbers were made
with. The option not taken was to leave them out of the call and let
popnei use its own defaults: the result would be the same today, but the
script would not show the two numbers, and a new popnei with other
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

### What goes into its key

The store makes the key of the analysis with `keyOf` of
`docs/specs/core/keys.md`, which puts in itself the id `diversity`, the
key version, the version of popnei, the load of the variants file and
the filters. `filtersRead` is `{ variants: true, individuals: true }`:
every filter changes which genotypes the means are over.

`keyInputs(p)` gives the rest:

```ts
{ pops: Pops | "all" | null, options: { minNumIndividuals: number, polyThreshold: number } }
```

`pops` is `populationsOf(p)`: every population of the column with every
individual of the file that has it, in the order above, as pairs
`[population, individuals]`; `"all"` for the one population, whose
individuals the load of the variants file, in every key, fixes; `null`
when a metadata file is not read, when no column is chosen in it, or
when the table has no column of that name. `options` are those of the project for
`diversity`, or the defaults. It does not read `p.variants`, as keys.md
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

The key version is 2. It is raised when what the result means changes
for the same inputs: another popnei function, another statistic asked,
a new field in the result. It was raised to 2 on 28 September 2026,
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
| `minNumIndividuals` or `polyThreshold` | changes |
| the options of another analysis, the reference | same |
| the key version, the version of popnei | changes |

### Why it cannot run

The store asks `projectNeeds` of `docs/specs/core/project.md` first,
which gives the reasons every analysis shares: no variants file, "Load a
variants file in the Variants step."; the file being read, "Reading
panel.nei."; the file refused or not read. Then, since the diversity
reads the filters of individuals, `individualListNeeds`, the lists of
individuals that popnei would refuse; and, since it reads the filters
of the variants, `variantFilterNeeds` of the same spec, the LD filter
of the Variants step with no distance, "The LD filter of the Variants
step needs the distance within which variants are compared. It has no
default, because it depends on how far linkage disequilibrium extends
in the genome of your species. Type a distance in base pairs, or turn
off the LD filter, in the Variants step.", in the order in which the
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
run"). For the one population, `keptNeeds` gives
`null`: every individual kept is in it, and filters that keep none are
locked first, with the words of `keptNoneReason`.

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
statistics.

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
}
```

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
changes no value of them; and it answers with the result below, every
array in the order of the populations of the request.

```ts
{
  analysis: "diversity",
  pops: readonly string[],        // the populations popnei was given, in the request's order
  numIndividuals: Uint32Array,    // the individuals of each that popnei was given
  unbiasedExpHet: Float64Array,   // unbiasedExpHet.mean; NaN for no value
  obsHet: Float64Array,           // obsHet.mean
  polyRatio: Float64Array,        // polyVarsRatio.polyRatio
  numVarsWithValue: Uint32Array,  // polyVarsRatio.totNumVariantsWithData
  passStats: PassStats,           // popnei's counts of the pass
}
```

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
by a threshold is told by popnei's refusal ("Its words"). The two it cannot see are the filters keeping no variant, "the
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
| `tooFewIndividuals` | a population has fewer individuals in `numIndividuals` than `minNumIndividuals` | "Population p3 has 12 individuals, and a variant has a value in a population only when at least 20 of its individuals have a called genotype there, so p3 has no values. To have them, merge it with another population in the metadata file." With two or three: "Populations p3 and p5 have fewer than 20 individuals, 12 and 8, and a variant has a value in a population only when at least 20 of its individuals have a called genotype there, so they have no values. To have them, merge each with another population in the metadata file." With more than three, the counts are left out: "Populations p3, p5 and 4 more have fewer than 20 individuals, and ..." When the filters of individuals removed some of the individuals of one of them, the last sentence ends "…in the metadata file, or loosen the filters of individuals in the Variants step." For the one population, which has no metadata file to merge in: "All individuals, the one population, has 12 individuals, and a variant has a value in a population only when at least 20 of its individuals have a called genotype there, so it has no values. The minimum of 20 cannot be changed in this version.", and, when the filters of individuals removed some, the last sentence "To have them, loosen the filters of individuals in the Variants step." |
| `variantsWithoutValue` | a population with enough individuals has a value at fewer variants than `numVars`, whatever the number skipped | "p0a has a value at 641 of the 1,152 variants kept (56%); at the others fewer than 20 of its individuals have a genotype." With two or three: "p0a and p0b have a value at 641 and 1,100 of the 1,152 variants kept (56% and 95%); at the others fewer than 20 of their individuals have a genotype." With more than three, the first two and how many more, with no counts: "p0a, p0b and 3 more have a value at fewer than the 1,152 variants kept; at the others fewer than 20 of their individuals have a genotype." When it is none of them: "p0a has a value at none of the 1,152 variants kept: at each, fewer than 20 of its individuals have a genotype." |
| `individualsWithoutPopulation` | individuals of the variants file have a missing cell in the column; never for the one population, which holds every one | "5 individuals of panel.nei have no population, and are left out of the diversity: s001, s002 and 3 more. If they belong to one, fill in their population in the metadata file and load it again." |
| `populationNotInResult` | a population of `populationsToRun(p)`, which has individuals in the variants file, is not in `r.pops`; never for the one population, since filters that keep none of it keep no individual, which locks the diversity or stops its Run in the words of `keptNoneReason` (`docs/specs/core/individualsKept.md`) | "Population p9 has no individual among the individuals of panel.nei that the filters kept, so it is not in the table." |

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

A population of a text is named as `project.md` names an individual, its
control characters escaped and cut after 40 characters. The numbers of
`variantsWithoutValue` are those of a population `p0a` of the first 20
individuals of p0 in the panel of the flow below, `s000` to `s071` in
the order of the file, with the missing data filter at 0.05: popnei gave
it a value at 641 of the 1,152 variants kept, and at 653 of the 1,200
with no filter (node, 25 September 2026, `js-v0.1.0-dev.2`).

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
diversity = popnei.calc_per_var_distribs(
    variants, pops=pops, min_num_individuals=20, poly_threshold=0.95
)
print(pandas.DataFrame({
    "individuals": {pop: len(names) for pop, names in pops.items()},
    "expected_heterozygosity_unbiased": diversity.unbiased_exp_het.mean,
    "observed_heterozygosity": diversity.obs_het.mean,
    "proportion_polymorphic": diversity.poly_vars_ratio.poly_ratio,
}).to_string())
```

The populations are built as the module builds them, in the same order,
so the table printed has the rows of the panel. The name of the column
is written with `JSON.stringify`, whose escapes Python reads in a string
the same way. The two numbers are those of the options, written with
`String`. `variants.individuals` gives the individuals of the variants
file. These
lines, run with popnei's Python package on 25 September 2026 over the
files of the flow with the filter at 0.05, printed the numbers of the
table below. The warnings as comments, which `docs/functionality.md`
section 9 asks for, come from the results, which `script(p)` is not
given; `script.ts` adds them in stage 6. `script` is asked only for an
analysis that has run, so a project with no populations is a defect
there.

For the one population, without a metadata file or with the grouping
`onePopulation`, the dict of the populations is made from the
individuals of the variants, which are those the filters of individuals
keep once `filter_individuals` is put on `variants`, as the property's
doc in popnei's `python/popnei/variant.py` says, so no narrowing
follows; the lines after the dict are the same:

```python
# The diversity of every individual, as one population
pops = {"All individuals": list(variants.individuals)}
diversity = popnei.calc_per_var_distribs(
    variants, pops=pops, min_num_individuals=20, poly_threshold=0.95
)
```

and the `print` of the table as above. The script reads no metadata
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
}

export interface DiversityResult {
  readonly analysis: "diversity";
  readonly pops: readonly string[];
  readonly numIndividuals: Uint32Array;
  readonly unbiasedExpHet: Float64Array;
  readonly obsHet: Float64Array;
  readonly polyRatio: Float64Array;
  readonly numVarsWithValue: Uint32Array;
  readonly passStats: PassStats;
}
```

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
// id "diversity"; app ["popgen"]; keyVersion 2;
// filtersRead { variants: true, individuals: true };
// defaults DIVERSITY_DEFAULTS

export const DIVERSITY_DEFAULTS: { readonly minNumIndividuals: 20; readonly polyThreshold: 0.95 };

/** One row of the table, a number null where popnei gave NaN. */
export interface DiversityRow {
  readonly population: string;
  readonly individuals: number;
  readonly expectedHeterozygosity: number | null;
  readonly observedHeterozygosity: number | null;
  readonly polymorphic: number | null;
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

`parseOptions(o, 1)` gives back an object with exactly the two fields,
`minNumIndividuals` a whole number from 0 to 4,294,967,295, as popnei's
`calcPerVarDistribs` accepts (`LARGEST_WHOLE_NUMBER` of
`js/popnei/src/arguments.ts`), and `polyThreshold` a number from 0 to 1;
anything else is refused with the words that follow "should be" in the
text of `projectErrorText`: "the minimum of individuals, a whole number
from 0 to 4,294,967,295, and the frequency below which a variant is
polymorphic, a number from 0 to 1, and nothing else". Every later version of the format reads
version 1 in the same way (`docs/architecture.md`, section 12).

### The cases

- **A population smaller than 20.** It is in the request, and popnei
  gives it NaN everywhere: its row is in the table with its number of
  individuals and "no value" in its three cells, and `tooFewIndividuals`
  says why. It is not left out of the request, so that the table shows
  every population the user defined.
- **A population of 20 to a few more, with missing data.** Some variants
  have fewer than 20 called genotypes in it and no value; on the panel
  file, `p0a`, the first 20 individuals of p0, had a value at 653 of
  the 1,200 variants (above, "The warnings"). `variantsWithoutValue` says it with the counts.
- **The filters keep no variant.** popnei refuses the call; the store
  keeps the refusal under the key, so an undo back to those settings
  shows it again without a calculation (`docs/specs/core/store.md`, "A
  calculation that failed").
- **The column chosen is the first, the identifiers.** Every individual
  is its own population, of one, with no values. The individuals step
  does not offer that column (`docs/specs/steps/individuals.md`); a project file that
  names it gives a table of rows with no values and one warning.
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
  table has one row. A metadata file loaded after it, whose read is
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
(`docs/specs/worker/runner.md`, "The memory").

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
  of the project and `minNumIndividuals` 20, `polyThreshold` 0.95. A
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
  `keyInputs` of `emptyProject("popgen")` and of a project whose reads are
  pending gives `{ pops: null, options: DIVERSITY_DEFAULTS }` without
  reading `p.variants`, which the test makes a getter that throws.
- **`parseOptions`**: the defaults back, and `minNumIndividuals`
  4,294,967,295; a missing field, a field more, `minNumIndividuals` 2.5,
  −1 or 4,294,967,296, `polyThreshold` 1.5 or a text, refused.
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
panel under it; it has no spec of its own while it holds one panel.

### What it shows

No option in the walking skeleton: the two options of the module keep
their defaults, and a line under the table says which, since the help
drawer comes in stage 8 (`docs/specs/shell.md`, "Not in this spec"): "A
variant counts in a population when at least 20 of its individuals have
a called genotype there, and is polymorphic when its commonest allele is
below 0.95."

A table with one row per population, in the order of the result, with a
caption that says what it is over: "The diversity of each population,
over the 1,152 variants of panel.nei the filters kept." Its columns:

| column | from |
|---|---|
| Population | `pops` |
| Individuals | `numIndividuals`: the individuals of the population the calculation took |
| Expected heterozygosity (unbiased) | `unbiasedExpHet` |
| Observed heterozygosity | `obsHet` |
| Proportion of polymorphic variants | `polyRatio` |

The numbers are written to four decimals with a point, `0.3527`, the
same in every column, and a NaN as "no value", in words, never as `NaN`
or a blank. The individuals are a whole number.

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
population,individuals,expected_heterozygosity_unbiased,observed_heterozygosity,proportion_polymorphic
p0,48,0.35267894847982756,0.35667985874177544,0.9288194444444444
p2,84,0.3440824705971255,0.3512406974637824,0.9105902777777778
p1,68,0.3498365468860467,0.35603713961547323,0.9157986111111112
```

### The states

| state | what the user sees | what they can do |
|---|---|---|
| empty | cannot happen: until the variants file is read the analysis is locked with a reason (`docs/specs/core/store.md`, "The state of an analysis") | |
| locked | the reason the store gives, as text beside a Run button that is disabled and described by it: "Choose the column that defines the populations, or all individuals in one population, in the Individuals step."; or the store's, once the individuals kept are known, when the filters keep no individual, or leave no population, in its words (`docs/specs/core/store.md`) | go to the step the reason names |
| ready | a Run button, and the populations it will run on with their sizes, "3 populations: p0, 48 individuals; p2, 84 individuals; p1, 68 individuals", the noun with each count so that no number is read as another thing, from `populationsBeforeRun` of `project.ts` with the individuals kept that the store gives; for the one population, "1 population, All individuals: 200 individuals", and, without a metadata file, the line "No metadata file: every individual is in one population.", the words of the Individuals step, so that a user who meant to load one learns it here; a population left empty is named after them, with what to do, since the panel is in the Analyses step and the filters in the Variants step, "p9 has no individual left after the filters of individuals, and is left out. Loosen the filters of individuals in the Variants step to keep it."; several populations left empty are named together, "p1 and p2 have no individual left after the filters of individuals, and are left out. Loosen the filters of individuals in the Variants step to keep them.", as `namesOf` of `project.ts` names them; and when the filters leave no population the diversity is locked, with those words whole beside the disabled Run (above, "Why it cannot run"); while a threshold on the individuals waits for the statistics of each individual, the populations the lists keep, before that threshold, and the line "Run calculates the statistics of each individual first, and the populations may lose individuals to the thresholds." | Run |
| running | a progress bar, "Calculating · 35% · 0:12", from the last `progress` of its `RunView`, and the time since it started, counted every second; before the first `progress`, and while the request waits in the queue, the bar has no value and is drawn hatched over its whole length and still, since a bar that moved by itself through a long calculation would be motion the user cannot stop (WCAG 2.2.2), and the clock shows the calculation goes on, "Calculating · 0:12"; after a stop or a change of the load, when the store marks the request `afterStop`, "Waiting for panel.nei to be opened again, then calculating · 0:12"; while the statistics of each individual that it waits for are calculated, "Calculating the statistics of each individual, which the thresholds of the individuals need · 35% · 0:12", with their progress, the bar labelled "Calculating the statistics of each individual", since its share is theirs, and after a stop "Waiting for panel.nei to be opened again, then calculating the statistics of each individual, which the thresholds of the individuals need · 0:12"; the clock starts again at 0:00 when the statistics end and the request of the diversity is sent, with the words of its own calculation, as the part of the writing does (`docs/specs/analyses/writeVariants.md`) | Stop, which cancels it, and the statistics with it |
| done | the table and its download; the warnings above the table, each as a sentence, with their count on the heading, "2 warnings"; after an opened project file, the comparison with its check numbers under the table | download |
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
read; the diversity is one pass, `numPassesOf("calcPerVarDistribs")` 1 of
`js/popnei/src/passes.ts`, and the bar fills once. A pass over a `.nei`
file ends a little below the size of the file, 259,376 of the 261,490
bytes of `panel.nei`, since popnei does not read its head
(`docs/specs/worker/runner.md`, "Progress"), so the bar may stop at 99%
and the result replaces it. A run that makes two passes would show
"pass 2 of 2" beside the bar, so that a bar that goes back to empty does
not look broken; the diversity never does, and no run of stage 4 does,
since the PCA asks popnei for no weights of the variants and reads the
file once (`docs/specs/analyses/pca.md`, "The request").

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
`store.cancelRun("diversity")`. It holds no state of the
project; the one state of its own is the tick of the clock of the
running state, which stops when the state is left.

### Its words

The locked reasons and the warnings are those of the module, above. The
error state, by what the store gives:

| the failure | the text |
|---|---|
| the statistics of each individual that a Run waited for were refused by popnei, or failed, which the store gives as the failure of the statistics, `ofStatistics` (`docs/specs/core/store.md`, "The state of an analysis") | "The statistics of each individual, which the thresholds of the individuals need, could not be calculated, so the diversity was not run. ", then the words the part of the statistics gives that failure, `refusalText` of `docs/specs/analyses/individualChecks.md` for a refusal of popnei: "… popnei could not read panel.vcf.gz: ‹its message›. Correct the file, or fetch it again, and load it in the Variants step."; since 28 September 2026 their pass has no filter, so filters that keep no variant are no longer among their failures. The rows below are never given the message of the statistics, which would name the diversity for a calculation that was not its own |
| popnei refused a pass over a variants file that holds no variant: its message starts with "the pass gave no variant and its source holds none", and the file is a `.nei` file or a VCF read with every variant | "empty.vcf has no variants, so there is no variant to calculate the diversity over. Load another variants file in the Variants step." |
| the same refusal, of a VCF read with only the variants that passed its filters, `onlyPassed` | "failed.vcf has no variant with PASS or . in its FILTER column, and it was read with only those, so there is no variant to calculate the diversity over. Untick "Only the variants with PASS or . in the FILTER column" in the Variants step and read the file again." |
| popnei refused an empty pass: its message starts with "the pass gave no variant:", with the colon, which the refusal of a source that holds none does not have at that place | "The filters kept none of the variants of panel.nei, so there is no variant to calculate the diversity over. Loosen the filters in the Variants step." |
| popnei refused a genotype of another ploidy than the one the VCF was read with: its message starts "line ‹n› of the VCF, the column of ‹individual›: its genotype is of the ploidy ‹found› and the reader was asked for the ploidy ‹given›" | "At line 5 of tetraploid.vcf.gz, the genotype of t00 has 4 alleles, and the file was read with ploidy 2. If every genotype of the file has 4 alleles, set the ploidy of the VCF to 4 in the Variants step and read the file again. A file that mixes ploidies, such as one with the X of males haploid among diploid autosomes, cannot be read in this version." |
| popnei refused a line of the VCF it cannot read, or a gzipped file that is damaged or cut short: its message starts "line ‹n› of the VCF" or "the VCF was written by bgzip" | "popnei could not read panel.vcf.gz: ‹its message›. Correct the file, or fetch it again, and load it in the Variants step." |
| popnei's LD filter, the LD filter of the Variants step, refused a variant that does not come after the one before it on its chromosome: its message starts "the variant ‹n› of the ones the filter by linkage disequilibrium has read" | "The LD filter of the Variants step needs the variants of each chromosome together and in the order of their positions, and panel.vcf.gz does not have them so: on chromosome 1, a variant at position 10 comes after one at position 30. Sort the file, with bcftools sort for a VCF, and load it again, or turn off the LD filter in the Variants step." A variant of a chromosome that had already ended: "…: a variant of chromosome 1, at position 10, comes after a variant of another chromosome, though variants of chromosome 1 came before that one." |
| popnei refused a request with no population: its message starts with "`pops` names no population", which only the thresholds on the individuals can bring about; an error after the Run and not a lock before it, as the owner decided on 26 September 2026 (point B of `docs/specs/stage-3-open-points.md`) | "The thresholds of the filters of individuals leave none of the individuals of panel.nei that have a population in popcat, so no population is left. Loosen the thresholds in the Variants step." |
| popnei refused for another reason | "popnei could not calculate the diversity: ‹its message›. Change the settings, or load the variants file again, to run it again." |
| the browser can no longer read the variants file, `reopenFailed`, as the owner decided on 25 September 2026 (point B of `docs/specs/stage-2-open-points.md`) | "panel.nei could not be read again; it may have changed on the disk since it was picked. Load it again in the Variants step." |
| the worker crashed, `workerFailed` | "The calculation stopped unexpectedly. Run it again. If it stops again, load panel.nei again in the Variants step." The second sentence is for a trap of popnei that comes back at every run, which a new load, and the new worker it starts, can mend |
| a message of ours that did not validate, `defect` | "The application met an error of its own: ‹message›. Run it again." |
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
``` A VCF is refused
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

The help, a few lines of Markdown for the help drawer of stage 8:

- What it gives: for each population, over the variants the filters
  kept, the expected heterozygosity, unbiased (Nei, 1978), the chance
  that two gene copies taken from the population carry different
  alleles, corrected for the size of the sample; the observed
  heterozygosity, the share of the called genotypes that are
  heterozygous; and the share of the variants whose commonest allele is
  below 0.95. Each is a mean over the variants that have a value in the
  population. Without a metadata file, or with all individuals in one
  population, the table has one row, "All individuals", the diversity
  of the whole set, whose expected heterozygosity is above that of its
  populations when they differ in their frequencies.
- Its defaults: a variant has a value in a population only when at least
  20 of its individuals have a called genotype there, so that no mean
  leans on frequencies estimated from a handful of individuals; a
  population of fewer than 20 has no values. Both numbers are popnei's
  defaults.
- When not to trust it: the proportion of polymorphic variants grows
  with the number of individuals, so populations of very different sizes
  cannot be compared by it until the rarefaction comes, with the
  inbreeding coefficient F, the mean number of alleles and the private
  alleles; a population that has a value at fewer variants than the
  filters kept, which its warning reports, has its means over other
  variants than the rest, and a stricter missing data filter keeps the
  variants most individuals have called; the heterozygosities are over the variants of the file, not
  per site of the genome, and cannot be compared with values over all
  sites, nor between panels of variants chosen in different ways.
- In Python: `popnei.calc_per_var_distribs(variants, pops=pops)`, whose
  `unbiased_exp_het.mean`, `obs_het.mean` and
  `poly_vars_ratio.poly_ratio` are the three columns.

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
- The keyboard: in the order of the screen, the Run or Stop button, the
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
the width of the columns, how the ready state lists many populations. The
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

## Not in this spec

- The inbreeding coefficient F, the mean number of alleles, the private
  alleles, the rarefaction and the histograms of the statistics: the
  diversity whole, stage 5 (`docs/build-order.md`), when its options get
  controls and its key version is raised.
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
