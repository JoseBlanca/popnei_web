# The diversity of each population

A draft of 25 September 2026, awaiting the owner's approval. There is no
code yet. This spec gives the first analysis of the population genetics
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
parts it relies on are listed at the end, in "What this spec assumes of
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
  population, `polyThreshold`, strictly: a variant at exactly 0.95, 38 of 40 alleles,
  is not. `docs/functionality.md`, section 6, says "at most 0.95"
  (**Open 2**, below).

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

The populations come from the column of the individuals file that the
user chose, `p.grouping.column` (`docs/specs/core/project.md`, "The
grouping"):

- **A population is named by the text of its cell**, whatever type the
  reader inferred for the column: a column of two populations, `P1` and
  `P2`, inferred binary, gives the populations `P1` and `P2`, and not 1
  and 0. In a CSV every cell is text already; a number or a boolean of an
  xlsx, from stage 4, is written with `String`, `1.5`, `true`.
- **An individual whose cell is missing**, empty, `NA` or `-`, belongs
  to no population and is left out of the calculation
  (`docs/functionality.md`, section 4), with a warning (below).
- **The populations are in the order in which each first appears in the
  file, and the individuals of each in the order of the file.** The table
  shows them in that order, which is the user's own. popnei gives its
  arrays in the order of the keys of the object it is given, and
  JavaScript iterates keys that are whole numbers, `"1"`, `"10"`, `"2"`,
  first and in numeric order; the runner puts popnei's arrays back into
  the order of the request (see the assumptions at the end), so a file
  with populations named 3, 1 and 2 shows them as 3, 1, 2.
- **Only individuals of the variants file go into the request.** An
  individual of the individuals file that is not in the variants file is
  ignored, as `docs/functionality.md` section 4 allows, since popnei
  refuses a population that names an individual it does not have; a
  population left with none is not sent, since popnei refuses an empty
  one. The filters of individuals, which would remove more, come in
  stage 3 (`docs/specs/worker/protocol.md`), and until then a project
  that holds one, which only a project file can, is locked (below, "Why
  it cannot run").

`populationsOf(p)` gives the populations as the key holds them, from the
table alone; `populationsToRun(p)` narrows them to the individuals of the
variants file, as `run` sends them and as the ready state of the panel
and the Individuals step list them.

### What goes into its key

The store makes the key of the analysis with `keyOf` of
`docs/specs/core/keys.md`, which puts in itself the id `diversity`, the
key version, the version of popnei, the load of the variants file and
the filters. `filtersRead` is `{ variants: true, individuals: true }`:
every filter changes which genotypes the means are over.

`keyInputs(p)` gives the rest:

```ts
{ pops: Pops | null, options: { minNumIndividuals: number, polyThreshold: number } }
```

`pops` is `populationsOf(p)`: every population of the column with every
individual of the file that has it, in the order above, as pairs
`[population, individuals]`; `null` when there is no individuals file,
when it is not read, when no column is chosen, or when the table has no
column of that name. `options` are those of the project for
`diversity`, or the defaults. It does not read `p.variants`, as keys.md
asks, and so it holds the individuals of the file that are not in the
variants file too: a change to one of them costs a calculation and shows
nothing stale.

What `run` reads beyond `keyInputs` is the list of the individuals of
the variants file, which is a function of the load, already in the key:
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

The key version is 1. It is raised when what the result means changes
for the same inputs: another popnei function, another statistic asked,
a new field in the result.

What changes the key, which the test of the key checks row by row
(`.claude/skills/coding/SKILL.md`, "Keys"):

| change to the project | the key |
|---|---|
| a new load of the variants file, the same file included | changes |
| the ploidy or `onlyPassed` of a VCF | changes |
| the name of the variants file, or its read recorded | same |
| the threshold of the missing data filter, or any filter added, removed or moved | changes |
| a filter of individuals | changes |
| another column of the populations that groups the individuals otherwise | changes |
| another column that makes the same populations with the same names | same |
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
panel.nei."; the file refused or not read, and the lists of individuals
that popnei would refuse. Then `needs` of this module gives the first of
these, in the words the panel shows beside its Run button:

| the project | the reason |
|---|---|
| a filter of individuals, which in stage 2 only a project file can hold (**Open 5**) | "The filters of individuals come in a later version of the application, and this project holds 2 of them, so the diversity cannot run in this version. To run it, open the project file in a text editor, empty the list named individualFilters in it, and open the project again." With one: "this project holds one of them" |
| any reason of `individualsNeeds` (`project.md`): no individuals file, "Load an individuals file in the Individuals step."; the file being read, "Reading pops.csv."; its read refused or failed; individuals of the variants missing from it, "12 individuals of panel.nei are not in pops.csv: ind_031, ind_044 and 10 more. Add them to the file and load it again in the Individuals step." | its words |
| no column of the populations chosen | "Choose the column that defines the populations in the Individuals step." (**Open 1**) |
| the table has no column of that name, after a new load of the file | "pops.csv has no column popcat, from which the populations were taken. Choose the column that defines the populations in the Individuals step." |
| no individual of the variants file has a population in the column | "No individual of panel.nei has a population in the column popcat of pops.csv. Fill in the column and load the file again, or choose another column, in the Individuals step." |

The names of the files, of the column and of the individuals are shown
with the helpers of `project.ts` that escape and cut them, and count with
a comma between groups of three digits (`project.md`, the rules after the
first table); they are private to `project.ts` today, and the plan
exports them from there or moves them into a module of their own, with
no change of their behaviour. A project of the association application,
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
  filters: p.filters,
  individualFilters: p.individualFilters, // always [] in stage 2: the analysis is locked otherwise
  pops,                     // populationsToRun(p): populationsOf(p) narrowed to the
                            // individuals of the variants file, empty populations dropped
  minNumIndividuals: 20,    // the options of the project, or the defaults
  polyThreshold: 0.95,
}
```

The field `individualFilters` is in the job from stage 2, empty, so that
stage 3 fills it without another shape of the request; the runner of
stage 2 answers a job with a filter of individuals as a defect of the
page (`docs/specs/worker/runner.md`).

What the runner does with it, as this spec assumes of
`docs/specs/worker/runner.md`: it puts the filters on the open `Variants`
in their order; it calls
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
  numVars: number,                // passStats.numVars: the variants the filters kept
  numVarsRead: number,            // the variants of the file: the varsProcessed of the
                                  // first filter of passStats, or numVars with no filter
}
```

`passStats` is popnei's counts of the pass, given with its result:
`numVars`, the variants the pass gave after every filter, and, for each
filter in its order, the variants it was given, `varsProcessed`, and
those it kept. `numVarsRead` is what the store's `numVarsOf`, the
function the entry gives it to find that number in a result, gives for
this result: the number of variants recorded into the variants file of
the load (`docs/specs/core/store.md`, `createStore`).

popnei refuses the call in the cases its `@throws` lists. The module rules
out those it can see: a population that names an individual popnei does
not have, an empty population, no population, a threshold out of its
range. The one it cannot see is the filters keeping no variant, "the pass
gave no variant: its source gave 1200 and the steps kept none of them,
..."; the panel says it in the user's words (its error state, below).

### The warnings

`warnings(r, p)` gives them from the result and the project the request
was made from, in this order; each has its code, which the tests assert,
and its text. Each lists the populations or individuals it is about as
`project.md` lists individuals: three or fewer by name, more as the
first two and how many more.

| code | when | the text |
|---|---|---|
| `tooFewIndividuals` | a population has fewer individuals in `numIndividuals` than `minNumIndividuals` | "Population p3 has 12 individuals, and a variant has a value in a population only when at least 20 of its individuals have a called genotype there, so p3 has no values. To have them, merge it with another population in the individuals file." With two or three: "Populations p3 and p5 have fewer than 20 individuals, 12 and 8, and a variant has a value in a population only when at least 20 of its individuals have a called genotype there, so they have no values. To have them, merge each with another population in the individuals file." With more than three, the counts are left out: "Populations p3, p5 and 4 more have fewer than 20 individuals, and ..." |
| `variantsWithoutValue` | a population with enough individuals has a value at fewer variants than `numVars` | "In population p0a, 511 of the 1,152 variants kept by the filters have fewer than 20 individuals of p0a with a called genotype, so its values are over the other 641, and the populations are compared over different variants. A stricter missing data filter in the Variants step keeps the variants most individuals have called." When it is all of them: "In population p0a, none of the 1,152 variants kept by the filters has 20 individuals of p0a with a called genotype, so p0a has no values." (**Open 3**) |
| `individualsWithoutPopulation` | individuals of the variants file have a missing cell in the column | "5 individuals of panel.nei have no population, and are left out of the diversity: s001, s002 and 3 more. If they belong to one, fill in their population in the individuals file and load it again." |
| `populationNotInResult` | a population of `pops` of the key is not in `r.pops` | "Population p9 has no individual among the individuals of panel.nei that the filters kept, so it is not in the table." |

A population of a text is named as `project.md` names an individual, its
control characters escaped and cut after 40 characters. The numbers of
`variantsWithoutValue` are those of a population `p0a` of the first 20
individuals of p0 in the panel of the flow below, `s000` to `s071` in
the order of the file, with the missing data filter at 0.05: popnei gave
it a value at 641 of the 1,152 variants kept, and at 653 of the 1,200
with no filter (node, 25 September 2026, the popnei of the release).

### The check numbers

`checkNumbers(r)` gives `numVars`, then, for each population in the
order of `r.pops`, its expected heterozygosity, its observed
heterozygosity and its proportion of polymorphic variants, with `null`
for a NaN: 1 + 3 × the number of populations (**Open 4**, below, since
`docs/specs/core/projectFile.md` and `docs/functionality.md`, section 9,
expect the expected heterozygosity alone). They are popnei's numbers
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
  readonly individualFilters: readonly IndividualFilter[];
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
  readonly numVars: number;
  readonly numVarsRead: number;
}
```

The module exports its definition, an `AnalysisDef` of
`docs/specs/core/store.md`, the object of functions and constants by
which the store knows an analysis (`keyInputs`, `needs`, `run`,
`warnings`, `checkNumbers`, `script`, `parseOptions`), which
`src/core/apps.ts` lists for the population genetics application, and
what the panel reads:

```ts
export const diversity: AnalysisDef<Job, JobResult>;
// id "diversity"; app ["popgen"]; keyVersion 1;
// filtersRead { variants: true, individuals: true };
// defaults DIVERSITY_DEFAULTS

export const DIVERSITY_DEFAULTS: { readonly minNumIndividuals: 20; readonly polyThreshold: 0.95 };

/** The populations of the column chosen, from the table alone, as the key
    holds them; null when there are none to give. */
export function populationsOf(p: Project): Pops | null;

/** populationsOf(p) narrowed to the individuals of the variants file, the
    populations left empty dropped: what run sends, what the ready state
    and the Individuals step list; null when populationsOf is null or the
    variants file is not read. */
export function populationsToRun(p: Project): Pops | null;

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
```

`warnings`, `checkNumbers` and `script` take a `JobResult` and throw a
defect, `popnei_web defect: ...`, for one that is not a
`DiversityResult`; the store gives them only results of their own
requests (`docs/specs/core/store.md`, "The definition of an analysis").
`diversityRows` keeps its rows by the result in a `WeakMap`, a table
whose entries are kept by the object itself and dropped with it, so that
the panel, which asks for them each time React draws it again, gets the
same array (`.claude/skills/coding/react.md`, "Reading core");
`populationsToRun` keeps its answer in the same way, by the project's
table, the name of the column and the read of the variants file.

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
  does not offer that column (see the assumptions); a project file that
  names it gives a table of rows with no values and one warning.
- **The individuals file loaded again, with the same table.** The key is
  the same, and the result is on screen at once.
- **A result that arrives after the populations changed.** It goes into
  the cache under the key it was asked for, with the warnings of the
  request's project, and is not shown (`docs/specs/core/store.md`, "The
  cases").

### How it runs

`populationsOf` walks the table once when the store makes the key after
a change, 10,000 rows in the largest individuals table the architecture
plans for (`docs/architecture.md`, section 11), a time not measured; the key's memo does not
cover it, since `keyInputs` builds a new value. It is kept by the
reference of the table and the name of the column in a `WeakMap`, so a
change of a threshold does not walk the table again. The result is a few
arrays of one number per population, a few hundred bytes. popnei makes
one pass over the file; with popnei 0.1.0 the file is in the memory of
the worker already.

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
  the warnings `tooFewIndividuals` naming A and B,
  `individualsWithoutPopulation` naming i4, and `populationNotInResult`
  naming C, in that order, with the texts of the table above for these
  names, the first "Populations A and B have fewer than 20 individuals,
  2 and 1, ..."; `keyInputs` gives `{ pops: [["A", ["i1", "i3"]], ["B",
  ["i2"]], ["C", ["i5"]]], options: DIVERSITY_DEFAULTS }`, the populations
  of the table and not those sent; `checkNumbers` gives `[numVars, null,
  null, null, null, null, null]`.
- **`needs`**, a case for each row of its table, after each reason of
  `individualsNeeds` has been checked to come through.
- **The key**: for each row of the table of what changes the key, two
  projects that differ in it, and `keyOf` equal or not as the row says;
  `keyInputs` of `emptyProject("popgen")` and of a project whose reads are
  pending gives `{ pops: null, options: DIVERSITY_DEFAULTS }` without
  reading `p.variants`, which the test makes a getter that throws.
- **`parseOptions`**: the defaults back, and `minNumIndividuals`
  4,294,967,295; a missing field, a field more, `minNumIndividuals` 2.5,
  −1 or 4,294,967,296, `polyThreshold` 1.5 or a text, refused.
- **`warnings`** of a result with a population of 20 whose
  `numVarsWithValue` is 653 of 1,200 gives `variantsWithoutValue` with
  "547 of the 1,200" and "the other 653"; of four populations of fewer
  than 20, `tooFewIndividuals` with "and 2 more" and no counts.
- **`script`** of the project of the flow gives the lines above,
  as a literal.
- **`diversityCsv`** of the result of the flow gives the text of "What it
  shows", below, as a literal; a population named `a,"b"` is quoted.
- **`refusalText`** of each row of its table in "Its words", below, with
  popnei's messages as literals: the empty pass of `docs/specs/worker/runner.md`,
  the ploidy of `tetraploid.vcf.gz` read with ploidy 2, a data line
  of a VCF, "line 4 of the VCF, the column of a: `z` is not an allele
  number, which is a run of digits", which the popnei of the release gave
  in node on 25 September 2026 for a genotype `0/z`, and another message.

The numbers popnei gives for the files of the Playwright flow, the panel
of popnei's `tests/reference/stats/`, 1,200 variants of two alleles each
over 200 diploid individuals, as `e2e/fixtures/panel.nei`, and its populations,
`panel_pops.txt`, with the populations in the column `popcat`: p0 of 48
individuals, p2 of 84 and p1 of 68, in the order they first appear in
the file. They were got on 25 September 2026 with the package of the
release the site uses, `js-v0.1.0-dev.1`, from
`node_modules/popnei/dist/node.js`, and the local build of popnei's
`main` gave the same numbers, by a script of the session that builds
`pops` from `panel_pops.txt` in the order of the file and calls

```js
const variants = openVars(readFileSync("e2e/fixtures/panel.nei"));   // opens a .nei file from its bytes
variants.filterByMissingData(0.05);   // left out for the first set
calcPerVarDistribs(variants, { pops });
```

| filter | population | individuals | expected heterozygosity | observed heterozygosity | polymorphic |
|---|---|---|---|---|---|
| none, 1,200 variants | p0 | 48 | 0.35193160994408107 | 0.35642172473116646 | 0.9266666666666666 |
| | p2 | 84 | 0.344856554637815 | 0.3512221180544642 | 0.9108333333333334 |
| | p1 | 68 | 0.35038890489752544 | 0.356734697819302 | 0.9175 |
| missing data at 0.05, 1,152 of 1,200 kept | p0 | 48 | 0.35267894847982756 | 0.35667985874177544 | 0.9288194444444444 |
| | p2 | 84 | 0.3440824705971255 | 0.3512406974637824 | 0.9105902777777778 |
| | p1 | 68 | 0.3498365468860467 | 0.35603713961547323 | 0.9157986111111112 |

Every population has a value at every variant kept, 1,200 and 1,152, so
neither set raises a warning. A threshold of 1 keeps every variant, and
gives the first set under another key.

The Vitest test of the runner, in node with popnei, asserts these
numbers as literals. The Playwright flow asserts them as the screen shows
them, to four decimals: with the filter at 0.05, the row p0 shows 48,
0.3527, 0.3567, 0.9288; with the filter at 1, 0.3519, 0.3564, 0.9267.
The flow loads `panel.nei` and the populations as a CSV,
`e2e/fixtures/panel_pops.csv`, chooses the column `popcat`, sets the
filter to 0.05, runs and reads the rows; sets it to 1 and sees the table
go with its notice; runs and reads the new rows; undoes and reads the
first rows again; and runs axe, a checker of accessibility, in each
state it reaches
(`.claude/skills/coding/testing.md`, "The walking skeleton, as a flow").

## The panel

The panel of the diversity in the analyses step of the population
genetics application, from the module above. It is drawn inside the
frame that every analysis shares, `src/ui/analyses/AnalysisPanel.tsx`,
which draws one of the seven states the store gives
(`.claude/skills/coding/react.md`, "The states of an analysis"). Its
heading is "Diversity".

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

A button, "Download the table as CSV", saves `panel.diversity.csv`, the
name of the variants file without `.nei`, `.vcf` or `.vcf.gz`, so that
`panel.vcf.gz` gives `panel.diversity.csv` too, and `.diversity.csv`
after it, with the text `diversityCsv` gives, in UTF-8 with no byte
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
| locked | the reason the store gives, as text beside a Run button that is disabled and described by it: "Choose the column that defines the populations in the Individuals step." | go to the step the reason names |
| ready | a Run button, and the populations it will run on with their sizes, "3 populations: p0, 48 individuals; p2, 84; p1, 68", from `populationsToRun` | Run |
| running | "Calculating · 0:12", the time since it started, counted every second, since popnei 0.1.0 reports no progress (`docs/architecture.md`, section 5); after a stop or a change of the load, when the store marks the request `afterStop`, "Waiting for panel.nei to be opened again, then calculating · 0:12" | Stop, which cancels it |
| done | the table and its download; the warnings above the table, each as a sentence, with their count on the heading, "2 warnings"; after an opened project file, the comparison with its check numbers under the table | download |
| results removed | "The diversity was removed because the missing data filter changed. Undo brings it back with no calculation; Run calculates it for the new settings." After an undo, whose notice offers Redo: "Redo brings it back ..." | Run; the Undo or Redo of the notice or of the header |
| error | what happened and what to do, below; a refusal of popnei stays for these settings, and Run is not offered, since popnei would refuse them again | Run again after a failure that is not popnei's; change the settings after a refusal |

The warnings are sentences above the table, where `react.md`, "The
states of an analysis", puts a count on the heading that opens the help
drawer at them: the drawer comes in stage 8, and a count that opened
nothing would hide the warnings. The skill is corrected when the owner
approves this spec.

"Undo brings it back with no calculation" holds while the cache keeps
the result removed. It drops a result only to stay under its bound of
256 MB (`docs/specs/core/cache.md`), and a result of the diversity is a
few hundred bytes, the only kind of result of stage 2, so no session of
stage 2 fills it; when the PCA and its large results come, in stage 4,
these words are checked against the cache again.

The cause in the words of "results removed" is the description of the
notice, `notice.cause.description`. When the notice lists the analysis
in `stopped`, its calculation stopped by a new variants file, the panel,
ready or locked, adds "The calculation of the diversity was stopped
because a new variants file was loaded." while that notice is up. The
notice itself, with the words of a result both removed and stopped, is
the shell's (`docs/specs/shell.md`).

The comparison of an opened project file, `check` of the state done, in
words the shell and the other analyses share:

- same: "These are the numbers the project file was saved with."
- differs: "These numbers differ from those the project file was saved
  with. The variants file may not be the one the project was made with,
  or it changed since." and, when the store names them, "popnei is 0.2.0
  now and was 0.1.0 then." and "This version of the application, 0.3.0,
  calculates the diversity in another way than 0.2.0, which saved the
  file."

The state `running` covers a request that waits in the queue of the
calculation worker as well as one that runs; the store does not tell
them apart. "Opened again" is what happens after a stop that ended the
worker, or after an undo back to a load already read: the new worker
reads the whole file before it calculates (`docs/specs/core/store.md`,
"The notice, and the calculations it stops").

### What it sends and reads

It reads, through `useAppState`, the hook by which a screen reads the
state of the store (`.claude/skills/coding/react.md`, "Reading core"),
the status of `diversity` among `state.analyses`, the `RunView` of its
run, what the store says of a calculation under way, for `afterStop`,
the notice,
and the project for `populationsToRun` and the name of the variants file;
and the time the run started from `src/ui/runs.ts` (see the
assumptions). It sends `store.startRun("diversity")` from Run and
`store.cancelRun("diversity")` from Stop. It holds no state of the
project; the one state of its own is the tick of the clock of the
running state, which stops when the state is left.

### Its words

The locked reasons and the warnings are those of the module, above. The
error state, by what the store gives:

| the failure | the text |
|---|---|
| popnei refused an empty pass: its message starts with "the pass gave no variant" | "The filters kept none of the variants of panel.nei, so there is no variant to calculate the diversity over. Loosen the filters in the Variants step." |
| popnei refused a genotype of another ploidy than the one the VCF was read with: its message starts "line ‹n› of the VCF, the column of ‹individual›: its genotype is of the ploidy ‹found› and the reader was asked for the ploidy ‹given›" | "At line 5 of tetraploid.vcf.gz, the genotype of t00 has 4 alleles, and the file was read with ploidy 2. Set the ploidy of the VCF to 4 in the Variants step and pick the file again." |
| popnei refused a line of the VCF it cannot read, or a gzipped file that is damaged or cut short: its message starts "line ‹n› of the VCF" or "the VCF was written by bgzip" | "popnei could not read panel.vcf.gz: ‹its message›. Correct the file, or fetch it again, and load it in the Variants step." |
| popnei refused for another reason | "popnei could not calculate the diversity: ‹its message›. Change the settings, or load the variants file again, to run it again." |
| the worker crashed, `workerFailed` | "The calculation stopped unexpectedly. Run it again. If it stops again, load panel.nei again in the Variants step." (`docs/specs/worker/runner.md`, **Open 1** there) |
| a message of ours that did not validate, `defect` | "The application met an error of its own: ‹message›. Run it again." |
| the worker could not start, `couldNotStart` | "The application could not start its calculations. Save the project, reload the page, and open the project again." |
| a stale file after a deploy, `protocolMismatch` | "The page is out of date. Save the project, reload the page, and open the project again." |
| the files wasm refused, `files` | cannot happen: the calculation worker, which runs every job, holds no files wasm, and no answer of it becomes this kind (`docs/specs/worker/client.md`, "Crashes, defects, and every read answered") |

`refusalText` of the module makes the first four, the message without
its full stop as `project.md` shows popnei's messages. A VCF is refused
at the first pass and not at its open for these two causes, since popnei
opens a VCF by its header and reads its lines only in a pass
(`docs/specs/worker/runner.md`, "Opening the load"); the source is read,
so the Variants step shows nothing wrong, and the panel's words are the
ones that say what to do. popnei's refusals have
no kind by which a program can tell them apart, so the empty pass, the
ploidy and a line of the VCF are recognised by the start of the message, and the test of the runner,
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
  population.
- Its defaults: a variant has a value in a population only when at least
  20 of its individuals have a called genotype there, so that no mean
  leans on frequencies estimated from a handful of individuals; a
  population of fewer than 20 has no values. Both numbers are popnei's
  defaults.
- When not to trust it: the proportion of polymorphic variants grows
  with the number of individuals, so populations of very different sizes
  cannot be compared by it until the rarefaction comes, with the
  inbreeding coefficient F, the mean number of alleles and the private
  alleles; the heterozygosities are over the variants of the file, not
  per site of the genome, and cannot be compared with values over all
  sites, nor between panels of variants chosen in different ways.
- In Python: `popnei.calc_per_var_distribs(variants, pops=pops)`, whose
  `unbiased_exp_het.mean`, `obs_het.mean` and
  `poly_vars_ratio.poly_ratio` are the three columns.

### Accessibility

A screen reader is the program that reads the page aloud to a user who
cannot see it; the focus is the element the keyboard acts on, which Tab
moves.

- The table is the `Table` of React Aria, named by its caption, the
  caption's element given to the table as `aria-labelledby`, with header
  cells for its columns, and the column Population marked `isRowHeader`,
  so that the name of the population is the header of each row and a
  screen reader reads "p2, Observed heterozygosity, 0.3512". The number
  of individuals is its own column, not a colour or a note.
- The start and the end of a run are announced by the shell's status
  region, an element whose text a screen reader reads out when it
  changes, without moving the focus (WCAG 2.2, success criterion 4.1.3,
  which asks that such messages reach a screen reader without taking the
  user away from where they are). The words are the shell's, and this
  spec does not repeat them (`docs/specs/shell.md`, "The status region"),
  "Diversity: done, 2 warnings." among them. The clock of the running
  state is not in such a region, so it is not read out every second. The
  notice of results removed is the shell's toast, the small panel at the
  bottom of the page, which is read out by itself.
- The keyboard: in the order of the screen, the Run or Stop button, the
  warnings, the table, the download. Run and Stop are one button in one
  place, so the focus stays on it when it changes. The button goes when
  the run ends done, or ends refused by popnei, since neither state
  offers Run; then, when the focus was on the button, it moves to the
  heading of the panel, so that a user of the keyboard is not sent to the
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

## What this spec assumes of the specs written beside it

Where one of these says otherwise, the two specs are settled before the
plan of stage 2, and the one that is wrong changes.

- `docs/specs/worker/runner.md`: the runner answers the request of
  "The request" as said there: the filters in their order,
  `numIndividuals` of what it gave popnei, every array in the order of
  the request whatever order popnei gives, `numVarsRead` from the counts
  of the pass; a job with a filter of individuals answered as a defect,
  which the lock of **Open 5** keeps from being sent; and its test
  asserts the numbers of the table above and popnei's messages of the
  empty pass and of the ploidy, as literals.
- `docs/specs/worker/messages.md`: its validator of the result checks
  the fields of `DiversityResult`, the arrays with `instanceof`.
- `docs/specs/worker/client.md`: the client opens the file of the load
  of `fileId` with its read options before the request, and the runner
  finds it open.
- `docs/specs/core/projectFile.md`: it saves the options of the diversity
  when the project holds them, and its check numbers, with its key
  version, and reads them back through `parseOptions`; its assumption
  that the check numbers are the expected heterozygosity alone, and its
  fixture `v1-nei-diversity.popnei.json`, follow **Open 4**.
- `docs/specs/entry.md`: the entry gives `createStore` a `numVarsOf` that
  reads `numVarsRead` of a `DiversityResult`, and lists the definition
  through `src/core/apps.ts`.
- `docs/specs/shell.md`: `src/ui/runs.ts` keeps the time each run
  started and gives it by the id of the run; the status region announces
  the start and the end of a run, in the shell's words; the notice of
  results removed and of calculations stopped is the shell's, with its
  words.
- `docs/specs/steps/variants.md`: the missing data filter can be set to
  0.05 and to 1, and its command is described "the missing data filter
  changed"; a VCF refused at its first pass for its ploidy is told by
  this panel in the words of "Its words", and no longer by "popnei could
  not calculate the diversity".
- `docs/specs/steps/individuals.md`: the step offers as the column of
  the populations the columns other than the first, sets the grouping
  with `setGrouping`, says the step "Individuals", and lists the
  populations with `populationsToRun`; the flow's
  `e2e/fixtures/panel_pops.csv` is `panel_pops.txt` of popnei written as
  a CSV, with the header `IID,popcat`.
- The flow of the walking skeleton covers a Cancel in the middle of a
  run (`docs/specs/worker/client.md`, "How it is verified") and the save
  and the opening of a project after a run of the diversity
  (`docs/specs/core/projectFile.md`), so the flow of this spec has
  neither.

## Open points

1. **The diversity without an individuals file, or without a column
   chosen.** `docs/functionality.md`, section 4, says that the metadata
   file is optional, and that without it every individual belongs to one
   population; `docs/specs/core/project.md` gives the grouping `null` the
   same meaning. This spec locks the analysis instead, "Load an
   individuals file in the Individuals step." and "Choose the column that
   defines the populations in the Individuals step.", as the brief of the
   walking skeleton asked. Running it would give a table of one row,
   named "All individuals", over every individual; popnei does that when
   it is given no populations. Locking costs the user of a single
   population a file of one column; running costs a table whose one row
   may be taken for a mistake when the user forgot to choose the column.
   The recommendation is to run it as one population, with the rows of
   the table saying so, from stage 4, when the individuals step is whole,
   and to lock it in the walking skeleton. Meanwhile, it is locked. It is
   the same decision as **Open 1** of `docs/specs/steps/individuals.md`,
   and the two are answered together; an answer is needed before the
   plan of stage 4, and the walking skeleton is built on the meanwhile.
2. **Polymorphic below 0.95, or at most 0.95.** popnei counts a variant
   as polymorphic when its commonest allele is below `polyThreshold`,
   strictly, as pyNei does; `docs/functionality.md`, section 6, says at
   most 0.95. They differ at exactly 0.95, which is common in small
   populations: 20 diploid individuals with two heterozygotes give 38 of
   40 alleles. Changing popnei would change a number verified against
   pyNei; changing the document costs a sentence. The recommendation is to
   correct `docs/functionality.md` to popnei's rule. Meanwhile, the panel
   and its help say "below 0.95", as popnei calculates.
3. **When the variants without a value in a population are warned of.**
   This spec warns whenever a population has a value at fewer variants
   than the filters kept, with the counts. In a dataset with missing
   data, a population of 20 to 30 individuals raises it almost always,
   which is when its means are over other variants than the others'; a
   population of 80 raises it only for variants missing in most of its
   individuals. A threshold, a warning only above 5% of the variants,
   would make it rarer and hide the small cases. The recommendation is to
   warn always, as written, and judge it on the screens of stage 2.
   Meanwhile, it is always raised.
4. **Which numbers of the diversity are its check numbers.** This spec
   gives the number of variants the filters kept, then the expected
   heterozygosity, the observed heterozygosity and the proportion of
   polymorphic variants of each population: 1 + 3 × the populations, 10
   numbers for the panel of three. `docs/functionality.md`, section 9,
   names the mean expected heterozygosity of each population, and
   `docs/specs/core/projectFile.md` assumes it alone, 3 numbers, in its
   example and in its fixture `v1-nei-diversity.popnei.json`. The fuller
   set tells apart two files that give the same expected heterozygosity
   and not the same variants or genotypes: a file with other variants,
   by their number; one whose genotypes changed so that the observed
   heterozygosity differs, which the expected one can miss; it costs a
   few numbers more in the file. The shorter set follows functionality as
   written and costs nothing now; changing the set later raises the key
   version of the diversity, and every file saved before then reads as
   "calculated in another way" (`docs/specs/core/projectFile.md`, "A
   change to what an analysis's checkNumbers gives"). The recommendation
   is the fuller set, with section 9 of `docs/functionality.md` corrected
   to name it, and the example, the assumption and the fixture of
   `projectFile.md` made to follow before the fixture is first written.
   Meanwhile, the fuller set.
5. **The filters of individuals in the walking skeleton.** No screen of
   stage 2 sets one, but a project file can hold one, and
   `docs/specs/core/project.md` checks their lists in `projectNeeds`.
   The options: (a) leave them to stage 3, as
   `docs/specs/worker/protocol.md` has it, since two of the four need a
   pass of popnei's statistics per individual whose variants stage 3
   chooses, and lock the diversity while the project holds one, with the
   reason of the first row of "Why it cannot run"; the runner then
   answers a job with one as a defect (`docs/specs/worker/runner.md`);
   (b) apply in stage 2 the two lists, to keep and to remove, which need
   no pass, as one `filterIndividuals`, and lock only on the two
   thresholds, which adds a list to the runner and a narrowing of the
   populations to this module. The recommendation is (a): no user of
   stage 2 can set a filter of individuals, and (b) builds half of a part
   whose order among the filters of the variants stage 3 has still to
   decide. Meanwhile, (a).

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
- A cell of an xlsx as the name of a population, and whether pandas reads
  it as the same text as the application, `1` and `1.0`: stage 4, with the
  xlsx.
- How a CSV opens in Excel set to a language whose separator is `;`, and
  whether the downloads start with the byte order mark of UTF-8, which
  makes Excel read the accents of a name right and puts a stray
  character before the first header in a program that does not expect
  it: the downloads of every table, a point for the report of stage 6.
