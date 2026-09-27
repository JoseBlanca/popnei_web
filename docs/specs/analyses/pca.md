# The principal components of the individuals

Written on 27 September 2026, for stage 4 of `docs/build-order.md`, the
Individuals step and the PCA, and revised the same day to agree with the
specs written beside it: the buttons of the 3D view and its words, the
legend drawn by the panel, the columns that can colour the points, and
the populations and the numbers of a column read by the functions of
`docs/specs/core/project.md`; and revised again that day after its
reviews, for the PCoA as popnei's draft now gives it, with the correction
of distances that cannot all be drawn in one space; and again after its
last reviews: the notes of the colours in the words of the populations,
a group that keeps its mark when the filters leave it no individual, the
highlight given to the plots only with the colouring it was pressed in,
the refusals worded without popnei's code, the control of React Aria of
each option, what is announced, and a metadata file loaded while the
PCA runs; and when the specs of stage 4 were made to agree: the words
of the LD filter over a file not sorted, made once with the
diversity's; the labels of the fields of its pruning, those of the
Variants step; the selects of the axes in 3D; one format for each
number, the minus sign among them; and the help on the keys of the
plots; and again that day with the owner's answers of 27 September
2026: the pruning on by default at r² 0.1 with no distance, which the
user types before the PCA can run, the pruned variants not kept between
two PCAs, and the worker started again after a large PCA, Open 1; and
again that day, the option of the pruning made to keep its r² and its
distance while the pruning is off, so that turning it off and on again
does not lose the distance typed. There is no code of it yet. This spec gives
the analysis that places the individuals of a dataset on a few axes, to
see its structure and check the populations against it: the module
`src/core/analyses/pca.ts`, which says what the components are calculated
from, which variants they read, when they cannot run, what they ask of
the calculation worker, what they warn of, what they keep in the project
file and write in the Python script; and, after it, the panel of
`src/ui/analyses/pca/` that shows them, as a scatter plot in two
dimensions and in three. It develops section 5 of `docs/functionality.md`
and section 4 of `docs/architecture.md`, whose shape of an analysis it
fills, with the row `analyses/` of its section 9. It depends on the specs
of stage 3, `docs/specs/core/keys.md`, `store.md`, `project.md`,
`individualsKept.md` and `docs/specs/worker/protocol.md` and `runner.md`,
the last two revised for stage 4 beside this one; on the specs of the two
plots written beside it, `docs/specs/charts/scatter.md` and `pca3d.md`;
and on the revision of `docs/specs/core/project.md` for stage 4, the
grouping of one population. What it relies on in them is listed at the
end.

The words of the documents used here, as `docs/specs/analyses/diversity.md`
and `individualChecks.md` define them: the **key** of a result, a hash of
everything it was calculated from, under which the store shows it, so
that a change of any of those inputs takes the result off the screen and
an undo brings it back from the cache with no calculation
(`docs/architecture.md`, section 3); the **load** of the variants file,
the id of one pick of it with its read options; a **pass**, one reading
of the variants from the start of the file, through the **steps** put on
popnei's `Variants`, the filters and the list of individuals; and the
**check numbers**, a few numbers of a result saved in the project file,
to compare a later run with. The **filters of the variants** are missing
data, observed heterozygosity, the major allele frequency (MAF) and the
LD pruning, in that fixed order, with the regions of a BED file first
once popnei has that filter; the **filters of individuals** make one list
of the individuals kept, which a job carries and the runner puts last
(`docs/architecture.md`, sections 2 and 4). A **component** is one axis
of the analysis, PC1 the one along which the individuals vary most; the
**projection** of an individual on a component is its coordinate there;
the **explained variance** of a component is the share of the variance
of the individuals it holds, in percent. The terms of the genetics, the
major allele, the dosage, the ploidy, the Kosman distance, are those of
popnei's `docs/glossary.md`.

The words of the web this spec needs, as it uses them. The **calculation
worker** is the second thread of the tab, where popnei runs so that the
page does not freeze, and **wasm** is popnei compiled to run there; the
memory wasm takes grows to the largest calculation it has made and is
not given back while the worker lives. **React** is the library that
draws the screens of the application from the state of the project,
again after every change of it, and **React Aria** the library of
controls built on it that the screens use, which gives each control the
keys and the names a screen reader expects. A **screen reader** is the
program that reads the page aloud to a user who cannot see it, and the
**focus** is the control the keyboard acts on, which the Tab key moves
from one control to the next. **WebGL** is the part of the browser that
draws with the graphics card, and **three.js** the library that draws
the 3D view with it (`docs/specs/charts/pca3d.md`). **WCAG 2.2** is the
standard of accessibility the applications meet, at its level AA, and
each of its **success criteria**, numbered as 1.4.1 is, one thing it
asks. The **shell** is the part of the page around the steps, the
header, the stepper, the summary line and the notices, and its **status
region** a part of the page whose new text a screen reader reads out
without moving the focus (`docs/specs/shell.md`).

The decisions of the owner and of the writers of the specs of stage 4,
of 27 September 2026, that this spec takes are named where they apply,
and gathered in `docs/specs/stage-4-open-points.md`. Some of them were
recommended to the owner and are not answered yet; this spec follows the
recommendation until the owner answers, and says so where each applies.
Two more are this spec's own, at the end: **Open 1**, which the owner
decided on 27 September 2026, and **Open 2**, open, with what the
implementer does meanwhile.

## The module

### What it does

It gives, for each individual the filters keep, its projection on the
first 10 components, and the explained variance of each, by one of two
methods, which the user chooses:

- **The PCA of the genotypes**, the default: each variant becomes one
  number per individual, its dosage, the alleles of its genotype that
  are not the major allele of the variant; popnei's
  `doPcaFromVariants` of `js/popnei/src/pca.ts` centres and standardizes
  each variant and takes the components of the individuals × individuals
  matrix. A missing genotype takes the mean dosage of its variant, so
  that it pulls its individual nowhere (the doc comment of
  `doPcaFromVariants`).
- **The PCoA of the Kosman distances**, a principal coordinate analysis:
  the Kosman distance of every pair of individuals, the mean over the
  variants both have called of how many alleles differ, divided by the
  ploidy (`calcPairwiseKosmanDists` of `js/popnei/src/dists.ts`), and the
  components of the space where the individuals lie at those distances,
  as nearly as a space can. Each pair is compared over its own variants,
  so an individual with many missing genotypes is not drawn toward the
  centre, which is what it is for (`docs/functionality.md`, section 5).
  popnei gives it as `doPcoaFromVariants`, which the owner asked of
  popnei on 27 September 2026 and which popnei's draft spec describes,
  "The principal coordinates of distances" of `docs/specs/pca.md` on its
  branch `spec/pcoa`; every name of it this spec uses is provisional, and
  is listed in "The names of popnei's PCoA, provisional", below.

**The Kosman distances are corrected when no space holds them.** A PCoA
places the individuals in a space where the straight line between two of
them is as long as their distance; the variance along each of its
components is an eigenvalue of a matrix made of the distances. When no
space has points at those distances, some eigenvalues are negative, a
variance below 0 that no direction has. The Kosman distances of real
data are often so, since each pair is compared over its own variants:
popnei's panel of 200 individuals, with 3 genotypes in 100 missing, gives
44 negative eigenvalues of 200, holding 2.98% of the variance of the
distances, in popnei's draft. popnei refuses such distances unless it is
asked to correct them, by Lingoes' method: with c the most negative
eigenvalue in absolute value, it adds 2c to the square of the distance
of every pair of different individuals, which raises the eigenvalues by
c and makes every one of them 0 or above. The owner decided on 27 September 2026 that
popnei_web asks for the correction always and warns its users that the
distances were corrected (popnei's draft at its commit `2f7545f`, where
the decision is recorded; `docs/specs/stage-4-open-points.md`). So the
application calls `doPcoaFromVariants(variants, { correctByLingoes: true
})`, and a PCoA it shows is of the corrected distances whenever they
needed it (below, "The warnings").

Both read the same variants, the dataset's filters with the PCA's own
MAF filter and pruning, so that the two can be compared, and both give
the same shape of result, so that one panel and one plot draw either.
One analysis with the method as its option, and not two analyses, is the
writers' decision of 27 September 2026 (`docs/specs/stage-4-open-points.md`): one panel,
one plot, and the GWAS of stage 7 takes the components as covariates
whichever the method.

Every number is popnei's, but for three that the panel's words make by
arithmetic on them: the centre of each group in the description of the
plot, and, in the warning of the correction, how large the constant is
beside the distances and how far apart it draws two individuals of the
same genotypes. In each component popnei makes the projection
of the largest absolute value positive, so that the same data give the
same signs in TypeScript and in Python (`PcaResult` of `pca.ts`).

What a user would see go wrong because of this module, and what the
rules below prevent: a plot of other filters shown as current, when the
key misses an input; a plot taken off the screen, and minutes of
calculation, for a change of its colours; a PCA refused with a message
about its arguments, when the module could have said beforehand what
was missing; a PCA dominated by a linked region, or drawn from a handful
of variants, with no word of it.

### Which variants it reads

popnei takes one filter of each kind on a `Variants`, and a second of one
kind throws (`docs/specs/worker/protocol.md`), so the PCA cannot add its
MAF filter to a dataset that has one. The job carries the dataset's
filters of the variants, in their fixed order, with two changes, as was
recommended to the owner on 27 September 2026 (meanwhile, "Which
variants the PCA reads" in `docs/specs/stage-4-open-points.md`):

- **The MAF filter is the stricter of the dataset's and the PCA's own**,
  the smaller of the two thresholds, since popnei keeps a variant whose
  major allele frequency is at most the threshold; it is in the
  dataset's MAF filter's place, or, when the dataset has none, in the
  place of the MAF in the fixed order, after missing data and observed
  heterozygosity.
- **One LD pruning, last among the filters of the variants**: the
  dataset's when it has one, since `docs/functionality.md` section 5 has
  the PCA not prune again then; otherwise the PCA's own when its pruning
  is on and has a distance; otherwise none. A pruning of the PCA with no
  distance yet puts no LD filter in the list, since popnei's `filterByLd`
  needs one, and locks the analysis (below, "Why it cannot run"), so
  that list is never sent.

Then the list of the individuals kept, last, as for every analysis
(`docs/architecture.md`, section 2). So the frequencies and the r² of the
pruning are counted over every individual of the file, as the dataset's
filters are, and which individuals are removed changes no variant the PCA
reads. The option not taken was the individuals first, for the PCA alone,
which would count the frequencies over the individuals analysed at the
cost of a pass whose variants depend on the individuals kept, unlike
every other pass of the application.

`pcaFilters(filters, options)` makes that list, a pure function of the
project's filters and the options. Worked examples, for the filters of a
first project, the missing data filter at 0.1 (`firstProject` of
`src/core/apps.ts`), and the PCA's defaults, the MAF at 0.95 and the
pruning at r² 0.1 with no distance, or with a distance of 50,000 base
pairs typed by the user, the one the numbers of "How it is verified"
were calculated with:

| the dataset's filters | the PCA's options | the filters of the job |
|---|---|---|
| missing data 0.1 | defaults | missing data 0.1, MAF 0.95; the PCA is locked until a distance is typed |
| missing data 0.1 | defaults, 50,000 typed | missing data 0.1, MAF 0.95, LD r² 0.1 within 50,000 |
| missing data 0.1, MAF 0.9 | defaults, 50,000 typed | missing data 0.1, MAF 0.9, LD r² 0.1 within 50,000 |
| missing data 0.1, MAF 0.98 | defaults, 50,000 typed | missing data 0.1, MAF 0.95, LD r² 0.1 within 50,000 |
| missing data 0.1, heterozygosity 0.9, LD r² 0.3 within 10,000 | defaults | missing data 0.1, heterozygosity 0.9, MAF 0.95, LD r² 0.3 within 10,000 |
| missing data 0.1, MAF 0.9, LD r² 0.3 within 10,000 | defaults, 50,000 typed | missing data 0.1, MAF 0.9, LD r² 0.3 within 10,000 |
| none | pruning off | MAF 0.95 |
| missing data 0.1 | pruning off, 50,000 typed before | missing data 0.1, MAF 0.95 |
| missing data 0.1 | MAF 1, pruning off | missing data 0.1, MAF 1 |

A pruning that is off puts no LD filter in the list, whatever r² and
distance it keeps for when it is turned on again.

A MAF of 1 keeps every variant; the MAF filter is always in the job, so
that the user's number is always the one popnei is given
(`docs/specs/worker/protocol.md`, "The number the user types").

The Variants step shows beside each filter how many variants it kept,
counted by the pass of an analysis. The pass of the PCA has other
filters than the project's, so its counts are not shown there. The one
number taken from it is the number of variants of the file,
`varsProcessed` of its first filter, which is the whole file whatever
the filter: `countsOf` of `src/core/apps.ts` gives `null` counts for the
PCA and that number (`docs/specs/analyses/filterCounts.md`, "Which
results fill it").

### Its options

The options of the analysis, as the project holds them, `PcaOptions`:

| option | what it is | default | from |
|---|---|---|---|
| `method` | `"pca"`, the PCA of the genotypes, or `"pcoa"`, the PCoA of the Kosman distances | `"pca"` | `docs/functionality.md`, section 5 |
| `maxAllowedMaf` | the PCA's maximum major allele frequency, a number from 0 to 1 | 0.95 | `docs/functionality.md`, sections 3 and 5 |
| `ldPruning` | the PCA's own LD pruning, `{ on, maxAllowedR2, maxDist }`: whether it prunes, the largest r² between two variants kept, and the window in base pairs, `maxDist` `null` until the user types one; the two numbers are kept while `on` is false | `{ on: true, maxAllowedR2: 0.1, maxDist: null }` | decided by the owner on 27 September 2026, below |
| `colourBy` | the column of the individuals file whose values colour the points, or `null` for the populations of the grouping | `null` | `docs/functionality.md`, section 5 |
| `axes` | the three components drawn, from 1: the 2D plot shows the first against the second, the 3D plot all three | `[1, 2, 3]` | `docs/functionality.md`, section 5 |
| `view` | `"2d"` or `"3d"` | `"2d"` | recommended to the owner, "The PCA opens in 2D" in `docs/specs/stage-4-open-points.md` |

The names of the thresholds are those of the filters of
`docs/specs/worker/protocol.md`, which are popnei's arguments, so that
`pcaFilters` copies them and a reader of the project file finds one name
for one number.

**The pruning is on by default at r² 0.1, with no distance**, as the
owner decided on 27 September 2026 (point 3, "The PCA's pruning: r²
0.1, and no default distance", in `docs/specs/stage-4-open-points.md`).
popnei gives no default of either. The r² of 0.1: on popnei's LD test file, at 50,000 base pairs,
plink2 at r² 0.3 keeps 41 variants where popnei keeps 46 at 0.15 and 35
at 0.1 (`docs/specs/filters.md` of popnei, near its line 940), so a
threshold of popnei is lower than a habit of plink; 0.1 keeps no more
than plink's common setting. The distance has no default, in the
owner's words because "the distance really depends on the LD/recombination
of the regions", so the user chooses it: how far linkage disequilibrium
extends differs from one species, and one genome, to another. The
option not taken was a default of 50,000 base pairs, which had been
recommended. Until the user types a distance, or turns the pruning off,
the PCA is locked (below, "Why it cannot run"). Turning the pruning off
changes `on` alone and keeps the r² and the distance, so that turning it
on again gives back the values the user had, and a distance once typed
does not have to be typed again, nor the PCA be locked again for it. The
writers decided so on 27 September 2026; the option not taken, the
pruning `null` when off, lost both numbers at every turn off. When the dataset has
an LD filter the PCA does not prune, so its distance is not asked for
and nothing locks, since that filter has its own distance. The LD
filter of the dataset, which starts at r² 0.3 within 10,000 base pairs
(stage 3), is another thing, a thinning of the dataset, and is not
changed by this decision. On `panel.nei` the pruning at r² 0.1 within
50,000 base pairs keeps 535 of the 1,175 variants the MAF filter leaves
(below, "How it is verified").

**The last three options change nothing that is calculated.** They are
saved in the project file with the others, so that a project opens with
the plot as the user left it, and a change of one is a command, a step of
Undo, that removes no result, since the key leaves them out (below). They
are options of the analysis, and not state of the screen, because the
project file restores what the user set, and the report of stage 6 draws
the plot as the user drew it. The writers decided so on 27 September
2026, among the choices the owner may overrule
(`docs/specs/stage-4-open-points.md`).

`pcaOptions(p)` gives the options of the project for `pca`, or
`PCA_DEFAULTS`.

`parseOptions(o, 1)` gives back an object with exactly the six fields:
`method` `"pca"` or `"pcoa"`; `maxAllowedMaf` a number from 0 to 1;
`ldPruning` an object of exactly `on`, `true` or `false`, `maxAllowedR2`,
a number from 0 to 1, and `maxDist`, a whole number from 1 to
9,007,199,254,740,991, the ranges popnei's `filterByMaf` and `filterByLd`
accept, or `null`, a distance not typed yet, which a project saved while
the PCA was locked for it holds, or saved with the pruning off before a
distance was typed; `colourBy` a
text or `null`, not checked against the table, which a later file may
change; `axes` three different whole numbers from 1 to 10,
`PCA_NUM_COMPS_KEPT`; and `view` `"2d"` or `"3d"`. `"pcoa"` is taken
before popnei's release has the PCoA, and the analysis is then locked
(below, "Why it cannot run"), so that a project file of a later version
of the application opens. The ranges are those of the fields of the
panel, which take fewer numbers still (below, "What it shows"), so that
no option the panel sends is refused here, which would be a defect of
`setAnalysisOptions` (`docs/specs/core/project.md`). Anything else is
refused with the words that follow "should be" in `projectErrorText`:
"the method, "pca" or "pcoa"; the maximum major allele frequency, a
number from 0 to 1; the LD pruning, whether it is on, true or false,
its maximum r², a number from 0 to 1, and its window, a whole number of
base pairs from 1 to 9,007,199,254,740,991 or null; the column that colours the points, a text or
null; three different components from 1 to 10 for the axes; and the
view, "2d" or "3d"; and nothing else". Every later version of the format
reads version 1 so (`docs/architecture.md`, section 12).

### What goes into its key

`filtersRead` is `{ variants: true, individuals: true }`: every filter
changes the variants or the individuals the components are made of.
`keyOf` of `docs/specs/core/keys.md` puts in itself the id `pca`, the key
version, the version of popnei, the load and both lists of filters.

`keyInputs(p)` gives the rest:

```ts
{
  method: "pca" | "pcoa",
  filters: pcaFilters(p.filters, pcaOptions(p)),
  ldPruning: { maxAllowedR2: number, maxDist: number | null } | null,
                                        // the PCA's own while on; null when off,
                                        // or when the dataset has an LD filter
}
```

the method; the filters popnei is given, which hold the PCA's MAF and
pruning as they reach popnei; and the PCA's own pruning, its r² and its
distance, `maxDist` `null` included, when it is on and the dataset has
no LD filter, and `null` otherwise. The last is there so that the key
holds the pruning as the user set it, as the owner's answer of 27
September 2026 has it: the pruning with no distance puts no LD filter in
the list, and without it would share the key of the pruning off, whether
or not a key is ever asked for while the PCA is locked, since
`keyInputs` answers for any project (`docs/specs/core/keys.md`). Once a
distance is typed, or the pruning is off, the filters alone tell the
settings apart. The r² and the distance kept while the pruning is off
are not in the key, as the colours and the axes are not (below): they
are not inputs of the result, which is calculated with no pruning, and
in the key a change of them would take off the screen a result they did
not make. The flag `on` is not a field of its own in the key, since
`null` says that the pruning is off.
So a change of the PCA's MAF that the dataset's stricter one overrides,
of its pruning while the dataset prunes, or of the r² or the distance
of its pruning while it is off, keeps the key, and takes
nothing off the screen for a change that changes no number. The
dataset's filters are in the key twice, once from `keyOf` and once
here, and the PCA's pruning twice when it prunes; that costs a few bytes
of text to hash.

Not in the key:

- **`colourBy`, `axes` and `view`**, which draw the result and are not
  inputs of it. In the key, a change of the colours would take the plot
  off the screen and ask minutes of calculation for the same numbers.
- **The r² and the distance of the PCA's pruning while it is off**, for
  the same reason: the result is calculated with no pruning, and the
  numbers wait for the pruning to be turned on again.
- **The individuals file and the grouping**, which only colour the
  points: changing the column of the populations changes the key of the
  diversity and not that of the PCA (`docs/architecture.md`, section 3).
  So a PCA calculated before the metadata file is loaded is shown after
  it, coloured by it, with no calculation.
- The options of the other analyses, the reference of an opened project
  file.

The key version is 1. `PCA_NUM_COMPS_KEPT` is not in the key, since
the job carries it and no project changes it, so a release of the
application that changes it raises the key version: a result kept under
the key before holds another number of components.

| change to the project | the key |
|---|---|
| a new load of the variants file, the same file included; the ploidy or `onlyPassed` of a VCF | changes |
| a filter of the variants added, removed, or its threshold | changes |
| a filter of individuals, a list or a threshold, whether or not it keeps other individuals | changes |
| `method` | changes |
| `maxAllowedMaf`, when it changes the filters of the job; `ldPruning` turned off or on, or its r² or its distance, a distance typed included, while it is on and the dataset has no LD filter | changes |
| `maxAllowedMaf` above the dataset's MAF; the r² or the distance of `ldPruning` while it is off; `ldPruning` while the dataset prunes | same |
| `colourBy`, `axes`, `view` | same |
| the individuals file, its types, the grouping | same |
| the options of another analysis, the reference | same |
| the key version, the version of popnei | changes |

### Why it cannot run

The store asks `projectNeeds` and, since the PCA reads the filters of
individuals, `individualListNeeds` of `docs/specs/core/project.md` first,
and the two locks of the individuals kept, which read the cache
(`docs/specs/core/store.md`, "The state of an analysis"). Then `needs(p)`
gives the first of these:

| the project | the reason |
|---|---|
| the method `"pcoa"` while popnei's release in the application has no `doPcoaFromVariants`, `PCOA_IN_POPNEI` false | "This project asks for the PCoA of the Kosman distances, which this version of the application cannot calculate yet. Choose the PCA of the genotypes as the method." |
| more individuals in the variants file than the method's limit, 9,381 for the PCA and 8,695 for the PCoA | "panel.nei has 12,000 individuals, and the principal components of more than 9,381 need more memory than a browser tab can hold. Calculate them with popnei in Python, outside the browser." For the PCoA, "…the principal coordinates of more than 8,695…" |
| any reason of `individualsNeeds` of `project.md`: the metadata file being read, "Reading pops.csv."; its read refused or failed; a file named by an opened project and not read when the project was saved, `notGiven`, "pops.csv was not read when this project was saved, so the project file does not hold it. Load pops.csv again in the Individuals step."; individuals of the variants missing from it, "12 individuals of panel.nei are not in pops.csv: ind_031, ind_044 and 10 more. Add them to the file and load it again in the Individuals step." | its words |
| the PCA's pruning on, `on` true, with no distance, `maxDist` `null`, and no LD filter in the dataset, `pruningDistanceReason` | "The LD pruning of the PCA needs the distance within which variants are compared. It has no default, because it depends on how far linkage disequilibrium extends in the genome of your species. Type a distance in base pairs, or turn the pruning off." |

**The pruning with no distance.** The owner decided on 27 September 2026
that the distance of the PCA's pruning has no default (above, "Its
options"), so a new project's PCA is locked until the user types one, or
turns the pruning off, which then gives the warning `pruningOff` on the
result (below, "The warnings"). The reason is last in the table; the
panel shows it beside the field of the distance whenever it
holds, and not only when it is the first reason, so that the empty
field always says why it has to be filled (below, "What it shows"). While
the pruning is off, `on` false, a distance still `null` locks nothing,
since no pruning is made. While the dataset has an LD filter the PCA
does not prune, and nothing locks. The words say why there is no
default and what to do; the help says how to choose the distance.

**The PCoA before popnei's release has it.** `PCOA_IN_POPNEI`, a
constant of the module, says whether the release of popnei the
application is built on has `doPcoaFromVariants`; it is false until the
commit that names that release in `package.json` sets it true, and a
Vitest test, which may import popnei where core may not, asserts that it
equals `typeof doPcoaFromVariants === "function"` of the installed
package, so that the two cannot drift apart. While it is false a
project whose options say `"pcoa"`, a file of a later version of the
application or one written by hand, is locked with the words above, and
the panel shows its two radio buttons of the method so that the user can
choose the PCA; with the PCA chosen, the panel shows no method. So the
store never sends a job of the PCoA, and the runner answers one as a
request it cannot take
(`docs/specs/worker/runner.md`, "The principal components").

**The limit on the individuals.** popnei refuses a PCA of more than
9,381 individuals, since the individuals × individuals matrix, its
eigenvectors and the workspace of the decomposition take about 6.1 × 8
bytes per pair, more than the 4 GB wasm addresses at 9,382
(`room_for_the_square_of` of `crates/popnei-js/src/pca.rs` of popnei;
`docs/architecture.md`, section 11). It refuses before the pass, in 1 ms,
and it counts the individuals of the file and not those the list of
individuals keeps: in node, with the release, a VCF of 9,382 individuals
with `filterIndividuals` of 100 of them was refused with the same
message, "the principal components of 9382 individuals hold about 5 GB,
…" (27 September 2026, `js-v0.1.0-dev.2`; the same code is on popnei's
`main` at `2d2229c`). So the lock counts the individuals of the file,
and its words do not offer the filters of individuals, which would not
help. The user reads the application's words of the table above, before
any Run, and never popnei's message. popnei is asked to count the individuals of the pass (below,
"What this spec asks of popnei"); when it does, the lock counts the
individuals the lists keep, `byLists` of `individualsKept`, and its words
end "Keep at most 9,381 with the filters of individuals in the Variants
step, or calculate them with popnei in Python, outside the browser.", and
a threshold that leaves more is told by popnei's refusal after the Run,
as the diversity's empty populations are. The PCoA's 8,695 is popnei's
draft, worked out from its peak of 56.8 bytes for each cell of the
individuals × individuals matrix and not yet measured; popnei's plan
measures it under node through `doPcoaFromVariants` with the correction,
and its draft says the limit may then be the PCA's 9,381
(`PCOA_MAX_INDIVIDUALS`, provisional, checked against popnei's release).

**The metadata file, which only colours.** The PCA locks while the
individuals file is being read, when it could not be read, when an
opened project names a file that was not read when the project was
saved, `notGiven`, and when the file lacks individuals of the variants,
as every analysis that reads the file does, although the PCA reads it
only for its colours. `docs/functionality.md`
section 4 has the application run nothing until such a file is fixed, and
a plot coloured by a file that is not the one the user loaded, or with
individuals of no colour for a reason the legend would not give, is a
plot that misleads without a warning. What the lock costs is small: the
key holds nothing of the file, so the result stays in the cache, and it
is on the screen again with no calculation as soon as the file is read,
or fixed and loaded again. Meanwhile the notice of the load lists the
PCA among the results removed, and the store takes it out of that list
when the read gives the key back (`docs/specs/core/store.md`, "The
notice, and the calculations it stops"; below, "The cases"). The option not taken was to run and draw
through a bad file, coloured as one group, with a line naming its
problem. A project with no individuals file is not locked: from stage 4
the file is optional, and the points are then of one group, "All
individuals" (`docs/specs/core/project.md`, "The populations"). While the result is locked the store makes no key for it, so
the cache may drop it to stay under its bound (`docs/specs/core/cache.md`),
which a PCA of a few hundred kilobytes makes unlikely.

`needs` gives no reason about the column of the populations, which
locks the diversity (`populationsNeeds` of `docs/specs/core/project.md`, "The populations"):
with no column chosen the points are of one group, and the panel says
why (below, "Its words").

### The request

`run(p, c)` sends, through the client the store bound to its key:

```ts
{
  analysis: "pca",
  fileId: p.variants.fileId,
  filters: pcaFilters(p.filters, pcaOptions(p)),
  individuals: c.individuals,   // the individuals kept; null when the filters remove nobody
  method: "pca",                // or "pcoa"
  numCompsKept: 10,             // PCA_NUM_COMPS_KEPT
}
```

What the runner does with it (`docs/specs/worker/runner.md`, "The
principal components"): it puts the filters of the job on the open
`Variants` in their order and the list after them, as for any job; for
the PCA it calls `doPcaFromVariants(variants, { numPrinComps: 0,
transformToBiallelic: true })`, and for the PCoA `doPcoaFromVariants(
variants, { correctByLingoes: true })`; and it keeps the first
`numCompsKept` components of what popnei gives.

- **`numPrinComps: 0`** asks popnei for no weights of the variants, which
  makes one pass over the file instead of two:
  `numPassesOf("doPcaFromVariants", { numPrinComps: 0 })` is 1 and
  without it 2, in node with the release on 27 September 2026. The screen
  shows no weights, the writers' decision of 27 September 2026.
- **`transformToBiallelic: true`** counts every allele that is not the
  major one the same, which gives a variant of more than two alleles a
  dosage; popnei refuses such a variant otherwise, and a user could not
  mend the file in the application. popnei does not say how many such
  variants there were, so no warning counts them, and the help says it
  (meanwhile, "Variants of more than two alleles" in
  `docs/specs/stage-4-open-points.md`). The Kosman
  distance takes any number of alleles.
- **`correctByLingoes: true`** corrects the Kosman distances when no
  space holds them, as the owner decided (above, "What it does"), and
  changes nothing when a space does: the constant is then 0 and the
  result that of the distances as they are. `minNumSnps` is left to
  popnei's default, so a pair needs one variant called in both
  individuals to have a distance.
- **The first 10 components are kept**, `PCA_NUM_COMPS_KEPT`, the
  writers' decision of 27 September 2026. popnei gives every component
  with variance, the individuals less one at most, and the projections of
  all of them at 9,381 individuals would be 9,380 × 9,381 × 8 bytes, 704
  MB, above the 256 MB bound of the cache of the page. The explained
  variance of each of the 10 is popnei's, over the variance of every
  component, so the 10 add up to less than 100%. The GWAS of stage 7
  takes its components within these 10. The number goes in the job, and
  not in a constant of the runner, since the runner imports nothing of
  core and the options of the axes are checked against it.

The result, a member of `JobResult`:

```ts
{
  analysis: "pca",
  method: "pca",                        // as the job had it
  individuals: readonly string[],       // those of the pass, in the order of the file
  numComps: number,                     // the components kept: the smaller of 10 and numCompsFound
  numCompsFound: number,                // every component with variance that popnei gave
  projections: Float64Array,            // individuals × numComps, row after row
  explainedVariancePercent: Float64Array, // numComps, over the variance of every component
  numVarsUsed: number | null,           // the PCA: the variants with variance it used; the PCoA: null
  lingoesConstant: number | null,       // the PCoA: c, 0 when no correction was needed; the PCA: null
  negativeEigenvaluesPercent: number | null, // the PCoA: of the distances before the correction; the PCA: null
  passStats: PassStats,                 // the counts of its pass, which fill no counts
}
```

`numVarsUsed` is the length of popnei's `usedVars`: a variant whose
called genotypes all have one dosage has no variance and is left out.
`numCompsFound` lets the panel say how many components there were,
"PC1 to PC10 of 199".

`lingoesConstant` and `negativeEigenvaluesPercent` are the two numbers
popnei's draft adds to the PCoA's result: c, the most negative eigenvalue
of the distances in absolute value, which the correction adds twice to
every squared distance, and the share of the variance of the distances
that lay in the negative eigenvalues before the correction, in percent,
2.98 on popnei's panel. Both are 0 when the distances needed no
correction. The percentages of the components are of the distances as
corrected, and add up to 100 over every component; a correction leaves at
most the individuals less two components, 198 on popnei's panel of 200.

popnei refuses the call, with a plain `Error`, in the cases its
`@throws` lists; the module rules out those it can see (the limit on the
individuals, above; the options, by `parseOptions`), and these reach the
user as the panel's error words (below, "Its words"):

- **No variant left**: "there are no variants to do a PCA with", with no
  counts, whether the file holds none or the filters kept none, seen in
  node with the release on 27 September 2026 for a VCF of a header
  alone, with and without a MAF filter, and for `panel.nei` with the
  missing data filter at 0.05 and a MAF filter at 0. It is not the "the
  pass gave no variant: …" of the other calculations of popnei, which
  tells the two apart; popnei is asked for it (below).
- **No variant with variance**: "no variant has more than one dosage
  among its called genotypes, so none of them varies and there is
  nothing to do a PCA with", which one individual kept gives: `panel.nei`
  with the MAF filter at 0.95 and a list of one individual, in node on the
  same day.
- **A source not sorted, with an LD pruning**: popnei's LD filter compares
  a variant with those kept behind it on its chromosome, and refuses, at
  the pass, a variant whose position falls below the one before it: "the
  variant 2 of the ones the filter by linkage disequilibrium has read, on
  the chromosome 1, does not come after the one before it, …; give it a
  source whose variants come with each chromosome together and in the
  order of their positions, which `bcftools sort` writes". The same file
  with the pruning off gives a result. The PCA meets it more than any
  other analysis, since its pruning is on by default.
- **A VCF of another ploidy, a line of a VCF popnei cannot read**, as for
  every analysis.
- **The PCoA**, by popnei's draft, whose messages are provisional: a
  pair of individuals with no variant called in both has no Kosman
  distance, and the PCoA is refused, with a message that counts such
  pairs, names the first and the individual in most of them; every
  distance 0, "every distance is 0, so the individuals are all at one
  point and there is nothing to do a PCoA with"; fewer than two
  individuals, before the pass. A pass that keeps no variant is refused
  with the words of popnei's other calculations, "the pass gave no
  variant and its source holds none" or "the pass gave no variant: …"
  with the counts of each filter, since the PCoA's pass is that of the
  Kosman distances. A matrix that no space holds is not refused, since
  the application asks for the correction.

### The warnings

`warnings(r, p)` gives them from the result and the project of the
request, in this order; each has its code, which the tests assert, and
its text.

| code | when | the text |
|---|---|---|
| `pruningOff` | the job had no LD filter: the PCA's pruning off and none in the dataset | "The LD pruning is off, so a region of the genome counts once for each of its variants, and a region of many variants in linkage disequilibrium, such as an inversion, can make a component of its own that separates the individuals by that region rather than by their ancestry. Turn the pruning on, unless such regions are what you are looking for." |
| `fewVariants` | fewer variants used than individuals: `numVarsUsed` for the PCA, `passStats.numVars` for the PCoA, below `individuals.length` | "The PCA used 150 variants that vary among its 200 individuals, fewer variants than individuals, so each component rests on few variants and can show chance differences as structure. If the dataset has more, loosen the filters in the Variants step, or the maximum major allele frequency or the LD pruning of the PCA." For the PCoA: "The PCoA used 150 variants for its 200 individuals, …" |
| `lingoesCorrection` | the PCoA, `lingoesConstant` above 0 | "The Kosman distances between these individuals cannot all be drawn in one space: 2.98% of their variance lies in directions that no space has. So they were corrected, by Lingoes' method, which adds the same amount, here 0.028, to the square of the distance between every two individuals, 30% of the mean of those squares. This moves the closest individuals apart the most: two individuals of the same genotypes are drawn 0.17 apart, and groups look looser than their distances make them. The percentages of the components are of the corrected distances. Compare with the PCA of the genotypes, which needs no correction." |

The warning of functionality section 5, that linked regions can dominate
the components, is `pruningOff`. Its condition is the job's filters and
not the option, so that a PCA whose dataset prunes does not warn of a
pruning that is on.

`fewVariants` at fewer variants than individuals is the writers': below it the matrix of the individuals has no more
components with variance than variants, and each component is estimated
from few. On `panel.nei` the pruning at r² 0.1 within 50,000 base pairs
uses 535 variants for 200 individuals, and no warning.

`lingoesCorrection` is given for every PCoA whose distances were
corrected, as the owner asked that users be warned of it, whatever the
size of the correction; no threshold is set, since popnei's draft leaves
the values to warn at to the application and gives no rule, and the
words say how large the correction was, for the user to judge. The three
numbers of its words:

- **The share of the variance that lay in directions no space has**,
  `negativeEigenvaluesPercent`, to two decimals as the other
  percentages, "2.98%".
- **The amount added to every squared distance**, 2c, twice
  `lingoesConstant`, to two significant digits, "0.028", and **how large
  it is beside the distances**, 2c over the mean of d² over the pairs of
  individuals, d their Kosman distance, in whole percent, "30%". popnei's draft
  measures the correction so: on its panel, 2c is 30 in 100 of the mean
  of d², and the nearest pair goes from 0.137 to 0.217 while the farthest
  goes from 0.358 to 0.396. The result does not hold the mean of d²,
  which the module works out from popnei's numbers by additions,
  multiplications and divisions: the variance along PC1 is the sum of the
  squares of its projections, λ1; the variance of the corrected
  distances is 100 λ1 over the percentage of PC1; the correction raised
  n − 1 eigenvalues by c, n the individuals of the result, so the
  variance before it is that less c(n − 1); and the mean of d² over the
  n(n − 1)/2 pairs is twice that over n − 1. On ape's projections of
  popnei's panel this gives 0.0947419715584643, where the mean of the
  squares of R's Kosman distances of that panel is 0.0947419715584647,
  and a share of 0.299387868729125.
- **How far apart it draws two individuals of the same genotypes**, the
  square root of 2c, to two decimals, "0.17": the correction puts two
  such individuals at that distance (popnei's draft, "How it runs").

The example of the table is popnei's panel, `tests/reference/dists/
panel.vcf.gz` of popnei, and not `e2e/fixtures/panel.nei`, whose PCoA
waits for popnei's release.

Two things that could have been warnings of the module are not:

- **More than 9,381 individuals** is a lock before the Run, above, and
  not a warning after it, since popnei refuses it before any pass.
- **Individuals with many missing genotypes**, which the PCA draws toward
  the centre, since a missing genotype takes the mean dosage: an
  individual missing everywhere is drawn at 0 on every component, seen in
  node on a VCF of three individuals whose third had no genotype. A
  warning is made from the result and the project alone, and neither
  holds how many genotypes each individual lacks: popnei's
  `doPcaFromVariants` does not give it, and a warning cannot run a
  calculation. The statistics of each individual, `individualChecks`,
  count it, over the variants of the dataset's filters, which are the
  PCA's but for its MAF and pruning. So the panel shows a note made from
  them when they are in the cache for the filters as they are, and
  nothing when they are not (below, "The note of the missing genotypes";
  **Open 2**). popnei is asked for the called genotypes of each
  individual with the PCA, which would make it a warning.

### The check numbers

`checkNumbers(r)` gives four: `passStats.numVars`, the variants the pass
gave; and the explained variance of PC1, PC2 and PC3, `null` for a
component the result does not have. In the check numbers of every
analysis `null` already stands for a number that popnei gave as NaN, not
a number (`docs/specs/core/store.md`); here it stands also for a
component that is not there. The two do not meet, since none of the
four numbers of the PCA is ever NaN, so a `null` among them is always a
missing component. A `null` compares equal only to another `null`, so a
result with a PC3 never matches one without. `numCheckNumbers(p)` gives
4. The
store compares them exactly (`docs/specs/core/store.md`, "The comparison
with the check numbers"), which holds for the PCA: the eigendecomposition
is popnei's compiled Rust in the same wasm, and four runs of the PCA
on `panel.nei`, pruned at r² 0.1 within 50,000 base pairs, in one process, one of them after a diversity, gave
the same percentages and projections to the last bit (node, the release,
27 September 2026). The PCoA decomposes with the same code and is
expected to hold as well; it is run twice in the runner's test once
popnei's release has it. A new release of popnei may give other last
digits, and the comparison then names both versions, as for any
analysis. The percentages of a PCoA are of the corrected distances, so
they check the constant of the correction too.

- **The number of variants**, and not `numVarsUsed`, because it means
  the same for both methods: the PCoA uses no count of variants with
  variance. A file with the same individuals and other variants gives
  another number here.
- **The percentages of the first three components** say how the variance
  of the dataset is shared, which a file with other genotypes changes.
  They depend on no sign.
- **No projection**, though the sign rule makes them stable: a projection
  checks one individual, chosen by a rule of its own, where the
  percentages move with the genotypes of every individual; and it hangs
  on the sign rule, which a tie of two projections of the same size and
  opposite sign could turn round in a new release.

Four numbers, and not the ten percentages, for a check that three make
as well. The fingerprint of the settings, which the comparison needs to
be the file's, holds the method and the filters of the job, so the four
numbers are only compared with those of the same method.

### Its lines of the Python script

`script(p)` gives the lines that calculate the same components with the
Python API of popnei, after the lines of `src/core/script.ts`, in stage
6. popnei puts a filter on a `Variants` for good, and the script's
`variants` holds the dataset's filters already, so the PCA opens the file
again into a `Variants` of its own, with the call that opened it, and
puts on it the filters of the job, from `pcaFilters`, and the list of the
individuals kept, `individuals_kept`, which `script.ts` makes before
`variants.filter_individuals` (`docs/specs/analyses/individualChecks.md`,
"Its lines of the Python script"), when the project has a filter of
individuals. For the project of the flow below, `panel.nei` with the
filters of a first project, the PCA's defaults and a distance of 50,000
base pairs typed:

```python
# The principal components of the individuals, a PCA of the genotypes,
# over the filters of the dataset, the PCA's maximum major allele
# frequency and its LD pruning, on a Variants of its own
pca_variants = popnei.open_vars("panel.nei")
pca_variants.filter_by_missing_data(0.1)
pca_variants.filter_by_maf(0.95)
pca_variants.filter_by_ld(0.1, 50000)
pca = popnei.do_pca_from_variants(
    pca_variants, transform_to_biallelic=True, num_prin_comps=0
)
print(pca.explained_variance_percent.iloc[:10].to_string())
print(pca.projections.iloc[:, :10].to_string())
```

A VCF is opened with `popnei.open_vcf("panel.vcf.gz", ploidy=2,
only_passed=True)`, its read options written out; a filter of
individuals adds `pca_variants.filter_individuals(individuals_kept)`
after the filters. The PCoA calls `pcoa = popnei.do_pcoa_from_variants(
pca_variants, correct_by_lingoes=True)` in the place of
`do_pca_from_variants`, and prints `pcoa.lingoes_constant` and
`pcoa.negative_eigenvalues_percent` as well, with popnei's draft names,
provisional. The argument is written out because in Python it is false
by default, the owner's word that there the user decides, and popnei
then refuses distances no space holds, with a message that names it. popnei names the components `PC0`, `PC1`, … in Python, with
zeros on the left, `PC000` for 199, where the application writes PC1 to
PC10, as a user reads them; the help says so.

These lines, with the missing data filter at 0.05 in the place of 0.1,
were run with popnei's Python package, built natively from popnei's
`main` at `2d2229c`, on 27 September 2026: PC1 to PC3 explained
3.5791902392779886, 3.459168102873343 and 1.9063456362555027, where the
wasm of the release gives 3.5791902392779953, 3.4591681028733494 and
1.9063456362555034, the same to 13 significant digits. The native build
decomposes with another library than the wasm, so the script gives the
application's numbers to about 1e-14 and not to the last digit, and the
comparison of the check numbers is between runs of the application
alone. The warnings as comments come in stage 6 with `script.ts`.
`script` is asked only for an analysis that has run, as the diversity's
is, so a PCA locked by a pruning with no distance writes no line, and
asking for its lines is a defect.

### The TypeScript interface

The request and the result are members of `Job` and `JobResult` of
`src/worker/protocol.ts`, where they are written as the other jobs are,
without `readonly` (`docs/specs/worker/protocol.md`); core reads them as
below:

```ts
export interface PcaJob {
  readonly analysis: "pca";
  readonly fileId: string;
  readonly filters: readonly VariantFilter[];   // pcaFilters of the project's
  readonly individuals: readonly string[] | null;
  readonly method: "pca" | "pcoa";
  readonly numCompsKept: number;                // PCA_NUM_COMPS_KEPT, a whole number from 1
}

export interface PcaResult {
  readonly analysis: "pca";
  readonly method: "pca" | "pcoa";
  readonly individuals: readonly string[];
  readonly numComps: number;
  readonly numCompsFound: number;
  readonly projections: Float64Array;
  readonly explainedVariancePercent: Float64Array;
  readonly numVarsUsed: number | null;
  readonly lingoesConstant: number | null;
  readonly negativeEigenvaluesPercent: number | null;
  readonly passStats: PassStats;
}
```

The module exports its definition, which `src/core/apps.ts` lists for
both applications, and what the panel reads:

```ts
export const pca: AnalysisDef<Job, JobResult>;
// id "pca"; app ["popgen", "gwas"]; keyVersion 1;
// filtersRead { variants: true, individuals: true }; defaults PCA_DEFAULTS

export interface PcaOptions {
  readonly method: "pca" | "pcoa";
  readonly maxAllowedMaf: number;
  readonly ldPruning: {
    readonly on: boolean;
    readonly maxAllowedR2: number;
    readonly maxDist: number | null;    // null until the user types a distance
  };
  readonly colourBy: string | null;
  readonly axes: readonly [number, number, number];
  readonly view: "2d" | "3d";
}
export const PCA_DEFAULTS: PcaOptions;             // frozen, the table of "Its options"
export const PCA_NUM_COMPS_KEPT = 10;
export const PCA_MAX_INDIVIDUALS = 9381;           // popnei's limit
export const PCOA_MAX_INDIVIDUALS = 8695;          // popnei's draft, provisional
/** Whether popnei's release in package.json has doPcoaFromVariants; false
    until the commit that names such a release, which a Vitest test ties to
    the installed package (above, "Why it cannot run"). */
export const PCOA_IN_POPNEI: boolean;
/** The reason of the lock of a PCoA that popnei's release lacks, or null;
    needs calls it with PCOA_IN_POPNEI, and the tests with both values. */
export function pcoaLock(o: PcaOptions, inPopnei: boolean): string | null;
/** The reason of the lock of the PCA's pruning, on with no distance, while
    the dataset has no LD filter, or null; needs gives it, and the panel shows
    it beside the field of the distance (above, "Why it cannot run"). */
export function pruningDistanceReason(p: Project): string | null;
export const MANY_MISSING_RATE = 0.2;              // the note of the missing genotypes
/** The group of an individual with no population or no value, 0xffff:
    NO_GROUP of src/charts/marks.ts, which core does not import; a test of
    the panel asserts the two are equal. */
export const NO_COLOUR_GROUP = 0xffff;
/** The most groups the points are coloured by: MAX_POINT_GROUPS of
    src/charts/limits.ts, which the scatter refuses above; the same test
    asserts it. */
export const MAX_COLOUR_GROUPS = 1000;

/** The options of the project for the PCA, or the defaults. */
export function pcaOptions(p: Project): PcaOptions;

/** The filters of the job: the project's, with the stricter MAF and one
    LD pruning (above, "Which variants it reads"). The same frozen value
    for the same inputs. */
export function pcaFilters(filters: readonly VariantFilter[], o: PcaOptions): readonly VariantFilter[];

/** How the individuals of a result are coloured (below, "The colours"):
    by groups, or by the numbers of a continuous column. The panel gives
    the plots the `PointColours` of `src/charts/marks.ts` made of it, with
    the group it highlights; core imports nothing of `src/charts`. */
export type PcaColours =
  | {
      readonly kind: "groups";
      readonly title: string;                 // "Population", or the column's name
      readonly names: readonly string[];      // every group of the table, in the order of first appearance
      readonly group: Uint16Array;            // of each individual of the result; NO_COLOUR_GROUP for none
      readonly counts: readonly number[];     // the individuals of the result in each group, 0 for some
      readonly numNone: number;               // those in no group
      readonly noneName: "No population" | "No value";
      readonly note: string | null;           // why the colours are not those the options ask
    }
  | {
      readonly kind: "values";
      readonly title: string;                 // the column's name
      readonly values: Float64Array;          // of each individual of the result; NaN for none
      readonly numNone: number;
      readonly noneName: "No value";
      readonly note: string | null;
    };
export function pcaColours(r: PcaResult, p: Project): PcaColours;

/** The columns the colour can be taken from: every column of the table
    but the first, the identifiers, and but a categorical or binary
    column of more than MAX_COLOUR_GROUPS values, in its order. */
export function colourColumns(p: Project): readonly string[];

/** The components drawn, from the options and the result, and the line
    that says why they are not those chosen, or null. */
export function axesShown(o: PcaOptions, r: PcaResult):
  { readonly axes: readonly number[]; readonly note: string | null };

/** The rows of the table, one per individual in the order of the result,
    and the table as the text of a CSV file; the same array for the same
    result and groups. */
export interface PcaRow {
  readonly individual: string;
  readonly colour: string | number | null;   // its group's name, or its value; null for none
  readonly projections: readonly number[];   // numComps
}
export function pcaRows(r: PcaResult, c: PcaColours): readonly PcaRow[];
export function pcaCsv(r: PcaResult, c: PcaColours): string;
export function varianceCsv(r: PcaResult): string;

/** The text a screen reader reads for the plot, the 2D plot with two
    axes and the 3D view with three (below, "Accessibility"). */
export function pcaDescription(r: PcaResult, c: PcaColours, axes: readonly number[],
  highlighted: number | null, p: Project): string;

/** The note of the individuals with many missing genotypes, from the
    statistics of each individual when the store has them for the filters
    as they are, or null. */
export function manyMissingNote(r: PcaResult, stats: IndividualStats | null, p: Project): string | null;

/** The words of a refusal of popnei, and of the statistics that a Run
    waited for and that failed, for the error state of the panel. */
export function refusalText(message: string, p: Project): string;
/** The words of a worker that stopped with no answer, by the memory the
    calculation of numIndividuals needed (below, "Its words"). */
export function crashText(p: Project, numIndividuals: number): string;
export const PCA_MEMORY_WORDS_BYTES = 250_000_000;
export function statisticsFailedText(
  error: AnalysisError, p: Project, failureText: (failure: Failure) => string,
): string;
```

`warnings` and `checkNumbers` throw a defect for a result of another
analysis, as the diversity's do. `pcaRows` remembers the rows it made
for a result and its groups, and `pcaFilters` the list it made for the
project's filters and the options, and each gives back the very same
array when asked again, in a `WeakMap`, a table of JavaScript that lets
go of an entry once nothing else holds its result. A panel drawn again,
which React does at every tick of the clock of a run, then hands the
table and the plots the same array they already have, and they see by comparing
it with `===` that nothing changed, so they do not sort the 9,381 rows
or draw the points again (`.claude/skills/coding/react.md`, "Reading
core"). The names of
the files downloaded are made from the stem of the variants file,
`variantsStem` of `src/core/fileNames.ts`.

### The colours

`pcaColours(r, p)` gives how each individual of the result is coloured,
in the two ways the scatter draws (`docs/specs/charts/scatter.md`, "The
colours: groups, or the values of a column"):

- **`colourBy` null, the populations of the grouping**, as groups titled
  "Population", those `populationsOf` of `docs/specs/core/project.md`
  gives, so that the plot and the diversity name the same populations.
  With a column of the populations chosen, its values; with the grouping
  of one population, or no metadata file, one group, "All individuals".
  When the populations cannot be given, `populationsNeeds` of
  `project.md` gives the reason, with its kind, and the note is that
  reason, `reason` and not `inStep`, since the panel is not in the
  Individuals step, followed by "Meanwhile the points are not coloured
  by population; another column can colour them.", so that one condition
  has one text in the stepper, the step and the panel. With no column
  chosen yet, `noColumn`, and with a column the table no longer has,
  `noSuchColumn`, the points are one group, "All individuals": "pops.csv
  has no column popcat, from which the populations were taken. Choose
  the column that defines the populations, or all individuals in one
  population, in the Individuals step. Meanwhile the points are not
  coloured by population; another column can colour them." When no
  individual of the variants file has a population in the column,
  `noPopulation`, each point is in no group, a ring, and the legend has
  the one entry "No population (200)", with the note of that reason.
- **`colourBy` a categorical or binary column**, as groups titled by the
  name of the column, a group by the text of each cell, a number or a
  boolean of an xlsx written with `String`, as the diversity names its
  populations.
- **`colourBy` a continuous column**, as values: the number of each cell,
  read as the reader of the individuals file reads a number, with the
  decimal mark of the read, `found.decimal`, the point for an xlsx, by
  `cellNumber` of `src/worker/individuals/columnTypes.ts`, which core
  may import (`docs/specs/worker/individuals.md`). The scatter colours
  them along viridis, and a colouring by values has no highlight.
- **`colourBy` a column the table does not have**, after a new metadata
  file without it: the populations of the grouping, as for `null`, and
  the note "pops.csv has no column country, by which the points were
  coloured, so they are coloured by the populations." The option stays
  as it was, so that loading the file with that column again, or an
  undo, colours by it again; it is not changed without a command of the
  user.
- **`colourBy` a column, and no metadata file**, after the user removed
  it: the one population, "All individuals", and the note "No metadata
  file is loaded, so the points cannot be coloured by country." The
  option stays, as above.

The type of the column, as the user set it in the Individuals step,
decides between groups and values, so a score from 1 to 5 set as
categorical colours five groups. An individual whose cell is missing is
in no group, `NO_COLOUR_GROUP`, or has NaN, and the legend names it "No
population", or "No value" for another column, last, with its count; the
scatter draws it as a ring (`scatter.md`). The groups are every group of
the table, in the order in which each first appears in the file, as the
diversity's populations, and not only those of the individuals the
filters keep: the index of a group gives its mark, so a population keeps
its colour and its shape when a filter of individuals leaves it with no
individual, and the one after it does not take them. A group with no
individual in the result has a count of 0, and the legend, which lists
the groups with points, leaves it out (`legendOf` of `scatter.md`). The
identifiers are not offered, since each individual would be a group of
one, and neither is a categorical or binary column of more than 1,000
values, `MAX_COLOUR_GROUPS`, since the scatter draws a path and a legend
entry per group and refuses more (`docs/specs/charts/scatter.md`, "The
TypeScript interface"); a continuous column is offered whatever the
number of its values. A colouring the options ask that would give more
than 1,000 groups, a `colourBy` saved before its column grew, or more
populations than that, is drawn as one group, "All individuals", with
the note "popcat has 1,204 different values, more than the 1,000 the
plot can tell apart, so the points are of one colour; the table gives
each individual's value.", and the option is not changed. The plots give group `i` colour `i % 7` and shape `(i + ⌊i / 7⌋) %
7`, 49 different marks (`.claude/skills/coding/charts.md`, "Not colour
alone"); past 49 groups the marks repeat, and the legend and the table,
which name each individual's group, still tell them apart, so the panel
adds the line "The 60 values of collection are drawn with 49 marks, which
repeat; the legend and the table tell them apart."

### The note of the missing genotypes

For the PCA, not the PCoA, `manyMissingNote` names the individuals of the
result whose proportion of missing genotypes is above `MANY_MISSING_RATE`,
0.2, in the statistics of each individual that the store holds for the
filters as they are (`docs/specs/analyses/individualChecks.md`):

"s012 and s044 lack more than 20% of their genotypes among the variants
the filters of the Variants step keep. The PCA gives a missing genotype
the mean of its variant, which draws an individual toward the centre of
the plot about as much as it lacks. The PCoA of the Kosman distances
compares each pair over the variants both have called, and does not."

With more than three, the first two and how many more, as `project.md`
lists individuals. 0.2 is decided here: the projection of an individual
shrinks toward the centre roughly in proportion to its missing share, so
at 0.2 it is drawn about a fifth of the way in, which moves a point off
its cluster on the plot. The statistics count over the dataset's filters
and not over the PCA's MAF and pruning, which the words say. The note is
not a warning: it is not kept with the result nor in the report, and it
comes and goes with the statistics in the cache (**Open 2**).

### The cases

- **Two individuals.** One component has variance, PC1, 100%, with `s000`
  at 18.78829422805594 and `s001` its opposite, in node with the MAF
  filter at 0.95 and the list of the two (27 September 2026, the
  release). There is no plot: the panel shows the table and the line
  "Only one component has variance, since 2 individuals have one axis
  between them, so there is no plot; the table gives each individual's
  place on it." Three individuals give two components, a 2D plot and no
  3D.
- **The filters keep no variant, or the file holds none.** popnei refuses
  the PCA with "there are no variants to do a PCA with", and the PCoA
  with the words of its other calculations, which tell the two apart; the
  store keeps the refusal under the key (`docs/specs/core/store.md`, "A
  calculation that failed").
- **No variant varies among the individuals kept**, as with one
  individual: refused, above.
- **More than 9,381 individuals** in the variants file, or 8,695 for the
  PCoA: locked, above.
- **Kosman distances that no space holds**, the common case: corrected,
  with the warning `lingoesCorrection`. Distances that a space holds, as
  popnei's `four_alleles.vcf.gz` of 40 individuals gives, are not
  changed, and there is no warning; the line under the explained variance
  says they needed no correction.
- **Two individuals with no variant called in both**, for the PCoA:
  refused, with the words that name the individual in most such pairs;
  the PCA places them.
- **A project that asks for the PCoA before popnei's release has it**:
  locked, above.
- **A cancel** ends the worker wherever it is, the decomposition
  included, and the store keeps no result (`docs/architecture.md`, section
  5); a restart of the worker loses nothing of the PCA's, which keeps no
  intermediate result.
- **A result that arrives after a change.** It goes into the cache under
  the key it was asked for and is not shown, as any result
  (`docs/specs/core/store.md`, "The cases"). A change of `colourBy`,
  `axes` or `view` while it runs gives the same key, so the calculation
  goes on and its result is drawn with the options as they are when it
  arrives.
- **The method changed.** The key changes: the PCA leaves the screen with
  the notice, and the PCoA needs a Run. Both stay in the cache, and an
  undo, or setting the method back, shows the other with no calculation.
- **A new metadata file loaded over a PCA that is done.** While the file
  is read the PCA is locked, "Reading pops.csv.", and the notice of the
  load lists it among the results removed. When the read is recorded and
  the file holds every individual of the variants, the project gives
  the key of the result again, since the key holds nothing of the file:
  the plot is back with no calculation, coloured by the new file, and
  the store takes the PCA out of the notice, which goes if it held
  nothing else (`docs/specs/core/store.md`, "The notice, and the
  calculations it stops"). When the colour column is not in the new
  file, the plot is coloured by the populations, with the note of "The
  colours". When the read is refused, or the file lacks individuals, the
  PCA stays locked with that reason and in the notice, and an undo of
  the load brings the plot back.
- **A new metadata file loaded while the PCA runs.** The load locks the
  PCA, so the notice of the load names its calculation among those left
  behind, which will be stopped unless the change is undone. When the
  read is recorded and gives the key of the calculation again, the store
  takes it out of those left behind and it goes on: the panel shows it
  running, and its result is drawn when it arrives, coloured by the new
  file. When the read is refused, or the file lacks individuals, the PCA
  stays locked and its calculation stays left behind, named by the
  notice, and is stopped unless the load is undone, as any calculation
  a change leaves behind (`docs/specs/core/store.md`, "The notice, and
  the calculations it stops").
- **The axes chosen are beyond the result**, a project file's `axes` of
  `[4, 5, 6]` and a result of three components: `axesShown` gives the
  first components, PC1, PC2 and PC3, and the note "The axes chosen, PC4,
  PC5 and PC6, are beyond the 3 components of this result, so PC1, PC2
  and PC3 are drawn." The option stays.
- **The LD filter of the Variants step turned off while the PCA's
  pruning has no distance.** The PCA that ran on the dataset's pruning
  leaves the screen with the notice, as for any change of the filters,
  and is locked with the reason of the pruning with no distance until
  the user types one; an undo brings the plot back.
- **A pruning over a file not sorted by position** is refused, above,
  and the words say to sort it or turn the pruning off.
- **The dataset's filters of individuals leave the PCA fewer than two
  individuals.** One is refused by popnei, above; none cannot start, as
  for every analysis (`docs/architecture.md`, section 4).

### How it runs

One pass over the file in the calculation worker, for either method,
`numPassesOf` 1, then the decomposition, which gives no progress. popnei
calls `onProgress` at each range of 4 MiB it reads and once at the end of
the run, and the end comes after the decomposition: over a VCF of
20,066,850 bytes, 2,500 individuals and 2,000 variants, the last range
was told at 0.04 s and the end at 6.75 s (node 26.8.2, the release, on the
owner's Mac, an Apple M5 Pro, 27 September 2026). So the bar of the
panel stops at the share of the last range and stays there while the
components are calculated, which the running state says in words (below).

The decomposition grows as the cube of the individuals, and its memory
as their square. Measured the same day in node, with the release, on
VCFs of 300 variants: 1,000 individuals in 0.45 s, the memory of the
process grown by 69 MB; 2,000 in 3.0 s and 196 MB; 4,000 in 21 s and 662
MB, against popnei's estimate of 6.1 × 8 bytes per pair of individuals,
49, 195 and 781 MB. At 9,381 individuals the cube gives about four
minutes and the estimate 4.3 GB. These are node's times; the browsers
run the same wasm, and the plan measures them in Chromium and WebKit.
Here a pair is a cell of the individuals × individuals matrix, n² of
them. The PCoA holds, by popnei's draft, the sums of the Kosman
distances while the pass runs, 4 bytes a cell, and at its peak at most
56.8 bytes a cell, 8 more than the PCA, since it writes the projections
of every component while the eigenvectors are held: 3.6 GB at 8,000
individuals. The correction adds nothing to it, since popnei makes it
from the eigenvalues it already has, with no second decomposition.

The memory of wasm grows to the matrix and never shrinks
(`docs/architecture.md`, section 11), so a worker that made a PCA of
4,000 individuals holds some 700 MB until it is started again. The
client starts the calculation worker again after a PCA or a PCoA of more
than `PCA_RESTART_INDIVIDUALS`, 700 individuals. The number is set by
the memory the calculation leaves behind: at 700 individuals a PCA
holds about 24 MB, 700 × 700 × 48.8 bytes, and a PCoA 28 MB, about the
25 MB above which a written file restarts the worker too
(`WRITE_RESTART_BYTES`, `docs/specs/worker/client.md`), so the two
restarts come at the same memory left behind. In stage 4
the restart costs the reading of the header of the file, at most 49 ms
(`docs/architecture.md`, section 13, point 5), and nothing else: the
worker keeps no intermediate result ("The pruned variants are not kept
between two PCAs" in `docs/specs/stage-4-open-points.md`), and
the next analysis, whose filters are not the PCA's, would open the file
again in any case (`docs/specs/worker/runner.md`, "The steps"). This is a
second exception to the owner's decision of 26 September 2026 that the
worker is not restarted between requests, which the owner decided on 27
September 2026 (**Open 1**, below).

The result in the cache is 8 bytes × individuals × 10 for the
projections, 80 bytes for the percentages, and the names at 2 bytes a
character, as the cache counts them: at 9,381 individuals of eight
characters, 750,480 + 80 + 150,096 = 900,656 bytes, about 0.90 MB, far
under its bound of 256 MB (`docs/specs/core/cache.md`). So the words
"Undo brings back the plot and the table as they were, with no
calculation" hold as they do for the diversity. The pruning is made again
at every PCA, as the owner decided on 27 September 2026 ("The pruned
variants are not kept between two PCAs" in
`docs/specs/stage-4-open-points.md`), and its time is measured in stage
4, on `panel.nei` and on the files of 20,000 variants, with and without
it.

`pcaColours` walks the table once per result and table, kept in a
`WeakMap` by the result, the table, the grouping and the option, so a
change of the axes or of the view does not walk it again, and gives the
same object, which the highlight of the legend is kept with.

### How it is verified

With Vitest, at the functions of the definition, on frozen projects:

- **`pcaFilters`**, one test for each of the nine rows of the table of
  "Which variants it reads", in its order, as literals. The first two:
  the filters `[{ kind: "missing_data", maxAllowedMissingRate: 0.1 }]`
  and `PCA_DEFAULTS` give `[{ kind: "missing_data",
  maxAllowedMissingRate: 0.1 }, { kind: "maf", maxAllowedMaf: 0.95 }]`,
  and with `maxDist` 50000 `[{ kind: "missing_data",
  maxAllowedMissingRate: 0.1 }, { kind: "maf", maxAllowedMaf: 0.95 }, {
  kind: "ld", maxAllowedR2: 0.1, maxDist: 50000 }]`. Then the same
  frozen value twice for the same inputs.
- **`run`**, with a fake client that records its job: the filters of
  `pcaFilters`, the method, `numCompsKept` 10, and `individuals` as the
  client gives it, `null` and a list.
- **The key**: for each row of its table, two projects that differ in it,
  and `keyOf` equal or not as the row says; `keyInputs` of an empty
  project does not read `p.variants`, which the test makes a getter that
  throws.
- **`needs`**: a variants file of 9,382 individuals locked with the words
  above, of 9,381 not, and a PCoA of 8,696 locked; `pcoaLock` of the
  method `"pcoa"` with `false` gives the words of a PCoA not yet in
  popnei, and with `true`, or of the method `"pca"`, `null`; each reason of `individualsNeeds` comes through; with `PCA_DEFAULTS`
  and the filters of a first project, the words of the pruning with no
  distance, and none with `maxDist` 50000, with the pruning off, `on`
  false and `maxDist` `null`, or with an LD filter in the dataset;
  `pruningDistanceReason` gives the same
  words in the same cases, also while another reason comes first; a
  project with no metadata file, and one with a file and no column
  chosen, each with a distance typed, are not locked.
- **The key**, beside its table: `PCA_DEFAULTS`, with no distance, and
  the pruning off give different keys, though `pcaFilters` gives both
  the same list. The pruning off with `maxDist` `null`, with 50000, and
  with 50000 and r² 0.3 give one key, since the numbers kept while it is
  off are not inputs of the result; turned on again with 50000, the key
  is that of the pruning on with 50000 typed, so the result of before
  comes back from the cache.
- **`PCOA_IN_POPNEI`** equals `typeof doPcoaFromVariants === "function"`
  of the popnei installed.
- **`parseOptions`**: the defaults back, `maxDist` `null` among them,
  `maxDist` 50000, `method` `"pcoa"`, `ldPruning` `{ on: false,
  maxAllowedR2: 0.1, maxDist: 50000 }` and `{ on: false, maxAllowedR2:
  0.1, maxDist: null }`, `axes` `[10, 9, 1]`; a missing field, a field
  more, a method `"tsne"`, `maxAllowedMaf` 1.5, `ldPruning` `null`
  or without `on`, `on` `1`, `maxDist`
  0 or 2.5, `axes` `[1, 1, 2]` or `[1, 2, 11]`, `view` `"4d"`, refused.
- **`warnings`**: a result whose job had no LD filter gives `pruningOff`,
  and one of the dataset's LD filter none; `numVarsUsed` 150 for 200
  individuals gives `fewVariants` with the text above, 200 for 200 none.
  For `lingoesCorrection`, a result of the PCoA made in the test from the
  worked example of popnei's draft, the ten distances of pyNei's
  `test_pcoa` corrected: five individuals, PC1's projections
  −0.431869046368213, −0.283479006142767, −0.269028184151739,
  0.492920681079785 and 0.491455555582935 and its percentage
  77.1278402980914, `lingoesConstant` 0.0640069399611263 and
  `negativeEigenvaluesPercent` 7.88262807403034. It gives the warning
  with "7.88%", "0.13", "32%" and "0.36": the mean of the squared
  distances worked out is 0.406 within 1e-12, the ten squares adding up
  to 4.06, and the share 0.3153051229612133. The same result with
  `lingoesConstant` and `negativeEigenvaluesPercent` 0 gives none.
- **`checkNumbers`**: the numbers of the flow below, `[535,
  3.543326238768707, 3.4381786862515153, 1.920566779749705]`; a result of
  one component, `[1175, 100, null, null]`.
- **`pcaColours`**, on the worked table of the diversity's spec, `i1 A`,
  `i2 B`, `i3 A`, `i4` with no population, the column `pop`: the groups
  A and B, in that order, counts 2 and 1, and `i4` in `NO_COLOUR_GROUP`,
  `numNone` 1; a result of `i1`, `i2` and `i4` alone, as a filter of
  individuals gives it, the names A and B still, counts 1 and 1, so that
  B keeps its index 1; a result of `i1`, `i3` and `i4`, the names A and
  B, counts 2 and 0; a continuous column of `1,5`, `2`, `3` and a
  missing cell, read with the comma, the values 1.5, 2, 3 and NaN; with
  `colourBy` a column that is not in the table, the populations and the
  note; with no metadata file, the one group "All individuals"; with no
  metadata file and `colourBy` `country`, the same group and the note of
  a colour with no file; with a file and no column chosen, one group and
  the note made of the `reason` of `noColumn`; with the column `pop` and
  no individual of the variants in it, every individual in `NO_GROUP`
  and the note of `noPopulation`; with `colourBy` a categorical column
  of 1,001 values, one group and the note of a column of more values
  than the plot can tell apart.
- **`colourColumns`**: every column but the first, and not a categorical
  column of 1,001 values, where a continuous one of as many is offered.
- **`axesShown`**, `[4, 5, 6]` on three components, the first three and
  the note; `[2, 1, 3]` on two, `[2, 1]` and a note for the third.
- **`pcaCsv`** and **`varianceCsv`** of the result of the flow, as
  literals of their first rows; a group named `a,"b"` quoted.
- **`pcaDescription`** of the result of the flow, coloured by `popcat`,
  with p1 highlighted, gives the description of "Accessibility", below,
  as a literal; coloured by `altitude` of `panel_meta.csv`, its line of
  the range.
- **`manyMissingNote`**: statistics of 0.25 and 0.1 for two individuals
  name the first; a PCoA, or no statistics, give `null`.
- **`refusalText`**, each row of "Its words" with popnei's messages as
  literals: "there are no variants to do a PCA with" with a source of 0
  variants known and not known; the message of no variance; the message
  of the LD filter over the VCF of three individuals whose second variant
  is at position 10 after one at 30, with the PCA's pruning and with the
  dataset's; the ploidy of `tetraploid.vcf.gz` read with ploidy 2; and,
  for the PCoA, the messages of popnei's draft of the pairs with no
  distance, of every distance 0, and "the pass gave no variant: …",
  replaced by those of popnei's release when it has the PCoA.
- **`crashText`**: a PCA of 4,000 individuals gives the words of memory
  with "about 0.8 GB", the gigabytes to one decimal; of 2,264 the same
  words, and of 2,263 the diversity's; a PCoA of 2,098 the words of
  memory and of 2,097 the diversity's.
- **`script`** of the project of the flow gives the lines above, as a
  literal.

The numbers of the runner's test in node and of the Playwright flow, on
`e2e/fixtures/panel.nei`, 1,200 variants of 200 diploid individuals, with
the populations of `e2e/fixtures/panel_pops.csv`, p0 of 48, p2 of 84 and
p1 of 68 individuals in the order they first appear, were given by the
release the application builds on, `js-v0.1.0-dev.2`, as installed in
`node_modules/popnei` of the main checkout of popnei_web, its
`package-lock.json` resolving it to
`https://github.com/JoseBlanca/popnei/releases/download/js-v0.1.0-dev.2/popnei-0.1.0.tgz`,
on 27 September
2026, in node 26.8.2, by this script, saved as `pca_numbers.mjs` in a
folder whose `node_modules` is that one and run with
`FIXTURES=‹the worktree›/e2e/fixtures node pca_numbers.mjs`:

```js
import { readFileSync } from "node:fs";
import { init, openVars, doPcaFromVariants } from "popnei";
await init();
const runs = [
  ["pruned", (v) => { v.filterByMissingData(0.1); v.filterByMaf(0.95); v.filterByLd(0.1, 50000); }],
  ["pruning off", (v) => { v.filterByMissingData(0.1); v.filterByMaf(0.95); }],
];
for (const [label, put] of runs) {
  const v = openVars(new Uint8Array(readFileSync(`${process.env.FIXTURES}/panel.nei`)));
  put(v);
  const progress = [];
  v.onProgress((p) => progress.push(p));
  const r = doPcaFromVariants(v, { numPrinComps: 0, transformToBiallelic: true });
  v.free();
  const k = r.numComps;
  console.log(label, k, r.usedVars.length, JSON.stringify(r.passStats),
    JSON.stringify([...r.explainedVariancePercent.slice(0, 10)]),
    r.individuals[0], JSON.stringify([...r.projections.slice(0, 3)]),
    r.individuals[199], JSON.stringify([...r.projections.slice(199 * k, 199 * k + 3)]),
    JSON.stringify(progress));
}
```

| | the pruning at r² 0.1 within 50,000 | the pruning off |
|---|---|---|
| filters of the job | missing data 0.1, MAF 0.95, LD | missing data 0.1, MAF 0.95 |
| `passStats` | `missing_data` 1,200 to 1,200, `maf` 1,200 to 1,175, `ld` 1,175 to 535; `numVars` 535 | `missing_data` 1,200 to 1,200, `maf` 1,200 to 1,175; `numVars` 1,175 |
| `usedVars`, `numVarsUsed` | 535 | 1,175 |
| components found | 199 | 199 |
| PC1, PC2, PC3, explained % | 3.543326238768707, 3.4381786862515153, 1.920566779749705 | 7.7259798956433725, 5.607518517973541, 1.562751904323915 |
| `s000` on PC1, PC2, PC3 | −0.7546702846382134, 7.577178941266335, −4.924745039386669 | 1.5339065839147532, 12.930969544429235, −5.957159200821336 |
| `s199` on PC1, PC2, PC3 | −2.633169063152295, −0.5579069230470312, −1.9284342262244138 | −9.28420972449867, −2.158094322945647, 4.43518504525279 |

The ten percentages of the pruning, which the cut keeps:
3.543326238768707, 3.4381786862515153, 1.920566779749705,
1.8449703994478044, 1.770199736345114, 1.7520689760233366,
1.7399545794492481, 1.700511107629948, 1.6551669240097038,
1.635487451555156. Of the pruning off, from the fourth:
1.5232473149032213, 1.5020363517560236, 1.4902070790894821,
1.4710450676779012, 1.4527098234387317, 1.419762992925622,
1.3933823406088568. `panel.vcf.gz` read with ploidy 2 and only the passed
variants gives the same numbers as `panel.nei`. The progress of each run
was the two calls of the diversity, `{ bytesRead: 0, numBytes: 261490,
pass: 1, numPasses: 1 }` and `{ bytesRead: 259376, … }`. The pruning
halves the share of PC1 on this panel, which is simulated with weak
structure; with it the first two components are 3.5% and 3.4%.

The runner's test asserts these as literals, with the result cut to 10
components: `numComps` 10, `numCompsFound` 199, `projections` of 2,000
numbers, whose first three are `s000`'s above; and the two refusals of
"The request", as literals. The PCoA's numbers on `panel.nei` are got by
the same script with `doPcoaFromVariants(v, { correctByLingoes: true })`
once popnei's release has it, and the runner's test asserts them then:
`numCompsFound`, the first three percentages, `s000` on PC1 to PC3,
`lingoesConstant` and `negativeEigenvaluesPercent`, and the same numbers
from a second run, for the exact comparison of the check numbers.
popnei's draft gives numbers for another panel,
`tests/reference/dists/panel.vcf.gz` of popnei, which is not
`e2e/fixtures/panel.vcf.gz` (their MD5 differ).

**The fixture with a column of numbers**, `e2e/fixtures/panel_meta.csv`,
which the flow below needs to colour by values: the 200 individuals of
`panel_pops.csv` in its order, with its columns `IID` and `popcat`, and a
third, `altitude`, 100 + 10 × i for the individual `s‹i›`, from 100 for
`s000` to 2,060 for `s196`, and `NA` for `s197`, `s198` and `s199`, so
that the column is continuous and three individuals have no value.
`e2e/fixtures/make_fixtures.mjs` writes it from `panel_pops.csv`, as it
writes that file; making it is a task of the plan.

The Playwright flow, in Chromium, Firefox and WebKit
(`.claude/skills/coding/testing.md`): loads `panel.nei` and
`panel_meta.csv`, chooses `popcat`; reads the reason of the pruning with
no distance beside the field of the distance and beside Run, which is
disabled; types 50000 as the distance, runs the PCA and
reads "PC1 (3.54%)" and "PC2 (3.44%)" on the axes and `s000` at −0.7547,
7.5772 in the table; highlights p1 from the legend, with the keyboard,
and sees its entry checked, an element of the role `radio` with
`aria-checked="true"`, and the description name it; colours by
`altitude`, sees the bar of its scale and "Coloured by altitude, from
100 to 2060; 3 individuals have no value." in the description, and
back to the populations, and sees no calculation and one step of Undo
for each; turns the pruning off, sees the plot go with its notice, runs and
reads 7.73%; undoes and reads 3.54% again with no calculation; turns the
pruning off and reads 7.73% from the cache, turns it on again and reads
50000 still in the field of the distance and 3.54% with no calculation;
opens the
3D view, turns it with the buttons, and back to 2D; saves the table and
reads its header and the row of `s000`; runs axe, the checker of
accessibility, in each state it reaches. Once popnei's release has the
PCoA, it chooses the PCoA, runs it, and reads the warning of the
correction and the line under the explained variance with the numbers
of the runner's test. What it cannot check, whether
the 3D view and the plot read well, is seen by the owner in the running
application.

## The panel

The panel of the principal components in the Analyses step, from the
module above, drawn inside the frame of every analysis,
`src/ui/analyses/AnalysisPanel.tsx`, which draws the state the store
gives. Its heading, an `<h2>`, is "Principal components", the title by
which the shell names it in the notice and the status region, in
`src/ui/analyses/titles.ts`; it says "PCA" and "PCoA" in its lines by the
method.

### What it shows

**The options**, above the Run button, each a command of
`setAnalysisOptions`:

- **Method**, two radio buttons of React Aria's `RadioGroup`: "PCA of
  the genotypes" and "PCoA of the Kosman distances, for data with many
  missing genotypes". The PCoA is
  offered once popnei's release has it, `PCOA_IN_POPNEI`; until then the
  method is not shown, but for a project that asks for the PCoA, which
  is locked and shows both so that the user can choose the PCA (above,
  "Why it cannot run").
- **Maximum major allele frequency**, a `NumberField`, React Aria's
  field of a number, 0.95, "from 0 to 1", as the MAF filter of the
  Variants step. When the dataset's MAF
  filter is stricter, a line under it: "The MAF filter of the Variants
  step, 0.9, is stricter, and is the one used."
- **LD pruning**, a `Checkbox` "Prune variants in linkage
  disequilibrium", on, with two `NumberField`s labelled as those of the
  LD filter of the Variants step, "Maximum r² with a variant kept before
  it", 0.1, "from 0 to 1", and "Distance within which variants are
  compared, in base pairs", empty until the user types a distance,
  "from 1". While it is empty and the pruning on, the reason of
  `pruningDistanceReason` is the text beside it, which describes the
  field to a screen reader, as it is beside the disabled Run button
  when it is the reason `needs` gives first (above, "Why it cannot
  run"). The checkbox sends `on` alone, and keeps the r² and the
  distance as they are. Unchecked, the two fields go, as the fields of a
  filter turned off go in the Variants step, so that no field is shown
  for a number that is not used; checked again, they come back with the
  numbers the project kept, where a filter of the Variants step turned on
  again starts from the values of its table, since a filter that is off
  is not in that project. When the dataset has an LD filter, the three are
  disabled, no distance is asked for, and a line says why: "The LD filter
  of the Variants step, r² at most 0.3 within 10,000 base pairs, is used,
  and the PCA does not prune again."

The three number fields follow the rules of the fields of the Variants
step, "A number the fields do not take" and "A character the fields do
not take" of `docs/specs/steps/variants.md`: the MAF and the r² take
numbers from 0 to 1 of at most two decimals, the window a whole number
from 1 to 9007199254740991, written with no comma between thousands; a
number outside that, or with more decimals, is refused with the line of
that step under the field, "1.5 is more than 1; the maximum r² stays
0.1.", "0 is less than 1; the distance stays 50000.", or, while there is
no distance, "0 is less than 1; the distance is still to be typed.", and
sends nothing; a field left empty sends nothing and shows its value
again, or stays empty while there is no distance. The field of the
distance is given `NaN` for a `null` distance, which React Aria's
`NumberField` shows as empty, and not `undefined`, which would let it
keep a number the project no longer has after an undo; an arrow key in
the empty field sends nothing, so that no distance of 1 base pair is
sent that the user never typed. So every
option the fields send is one `parseOptions` takes, whose ranges are
these.
- A line of what it will run on: "200 individuals of panel.nei", or "119
  of the 200 individuals of panel.nei, those the filters of individuals
  keep", and, while a threshold on the individuals waits for their
  statistics, the diversity's line, "Run calculates the statistics of
  each individual first, …".

**The result**, once calculated:

- **A bar of controls above the plot**: "2D" and "3D", two
  `ToggleButton`s of a `ToggleButtonGroup` of one selection, React
  Aria's buttons that stay pressed; the components on the axes, React
  Aria's `Select`s of PC1 to PC‹numComps›, "Horizontal axis" and
  "Vertical axis" in 2D, and in 3D "First axis", "Second axis" and
  "Third axis, kept up", since the view turns and only the third
  component keeps its direction (`docs/specs/charts/pca3d.md`, "The
  view"); "Colour the
  points by", a `Select` of "Population" and the columns of
  `colourColumns`; and, in 3D, the `Button`s of the view of
  `docs/specs/charts/pca3d.md`, "The buttons of the bar above the plot",
  in these words: "Turn left" and "Turn right", which turn the view
  about the third component shown, as a drag left or right does, so
  that in the view down that component the plot spins in its plane; and
  "Tilt up" and "Tilt down", as a drag up or down does, by 15° each.
  Five presses of "Tilt down" from the start look straight down the
  third component, with the plot still turned by the 30° of the
  starting view; "View along PC3" gives the 2D plot of the other two
  exactly, the first across and the second up. "View along PC1", "View
  along PC2" and "View along PC3", named by the components of the axes,
  look down one of them and show the plot of the other two, the third
  component up in the first two (`docs/specs/charts/pca3d.md`); "Zoom
  in", "Zoom out" and "Reset view". They call `rotate`, `viewAlong`, `zoom` and `resetView` of the plot's
  handle. A change of the view, the axes or the colour is a command,
  which removes nothing; a turn or a zoom of the 3D view is not, and is
  not saved. The three axes are always three different components, which
  `parseOptions` asks: choosing for one axis the component another axis
  shows swaps the two, so that choosing PC2 for the horizontal axis of
  PC1 against PC2 gives PC2 against PC1, in one command.
- **The plot**: the 2D scatter of `docs/specs/charts/scatter.md`,
  `createScatter`, of the two components chosen, each axis labelled with
  its explained variance, "PC1 (3.54%)"; or the 3D view of
  `docs/specs/charts/pca3d.md`, `createPca3d`, with three.js loaded when
  the user first opens it. 2D opens first, meanwhile ("The PCA opens in
  2D" in `docs/specs/stage-4-open-points.md`).
  With one component there is no plot: the panel shows the line of "The
  cases", the explained variance and the table, whose second column
  still follows "Colour the points by", the one control of the bar left.
  With two, the 3D button is disabled and a line says why: "The 3D view
  needs three components, and this result has 2."; a project whose
  `view` is `"3d"`, opened or undone to, draws the 2D plot with the same
  line, and the option stays as it was. The panel makes the data of both
  plots with one function of its own, from the result, `pcaColours` and
  the axes shown: the components taken out of the projections as
  columns, `x`, `y` and, in 3D, `z`, and the colours as the
  `PointColours` of `src/charts/marks.ts` with the group highlighted, so
  that the two plots give a group the same mark.
- **The legend**, over the top right corner of the plot, drawn by the
  panel with React Aria's `ToggleButtonGroup` of one selection, with
  `orientation="vertical"`, since its entries are a column, one
  legend for the 2D and the 3D plot (`docs/specs/charts/scatter.md`,
  "The legend, drawn by the screen"): an entry per group, from `legendOf`
  of `src/charts/legend.ts`, each with its mark, `symbolPath`, its name
  and its count, "p0 (48)", and "No population (5)" last. Pressing one
  highlights its group and fades the others, a second press clears it,
  and pressing another moves the highlight; one group at a time, the
  group of no population among them. The highlight is state of the
  screen, kept while the panel is drawn, from the 2D plot to the 3D one
  and back, and not in the project, since it changes nothing the user
  would save. The panel keeps the group pressed with the colouring it
  was pressed in, the `PcaColours` of that draw, and at each draw gives
  the plots that group only when the colouring of the draw is the same
  object, `pcaColours` giving the same object for the same result,
  table, grouping and option (above, "How it runs"), and no highlight
  otherwise. So a change of the colouring, whose index would mark
  another group, drops the highlight in the draw that shows it, and no
  draw marks the wrong group. A faded entry fades its mark and not its
  name, whose contrast stays that of the text; the legend sits at the
  same place over the plot in 2D and in 3D
  (`docs/specs/charts/scatter.md`). A colouring by the
  values of a continuous column has a bar of its scale for a legend, and
  no highlight. This is what stage 4 takes from the owner's widget
  any_scatter3d, which the owner named on 27 September 2026 for the look
  and the interaction: the legend that picks a population, over the
  plot, and the bar of controls above it; not its keys listened for on
  the whole page.
- **The explained variance**: a table of the components kept, PC and
  percent, with a caption, "The variance of the individuals explained by
  each component, of the 199 components of the PCA.", and, for the PCoA,
  a line under it. When the distances were corrected: "The percentages
  are of the Kosman distances after Lingoes' correction, which added
  0.028 to the square of every distance, as the warning says; over all
  the 198 components of the PCoA they add up to 100." When they needed
  none: "The Kosman distances of these individuals can all be drawn in
  one space, so they were not corrected; over all the 39 components of
  the PCoA the percentages add up to 100." The numbers are those of
  popnei's panel and of its `four_alleles.vcf.gz`, 2c as in the warning
  and `numCompsFound`. Its
  download, "Download the explained variance as CSV",
  `panel.pca_variance.csv`, or `panel.pcoa_variance.csv`, with the header
  `component,explained_variance_percent` and rows `PC1,3.543326238768707`.
- **The table of the individuals**, one row per individual of the result
  in the order of the file: Individual; its group or its value, headed
  by the title of the colours, "Population" or the column's name; and PC1
  to PC‹numComps›.
  Sortable by any column, React Aria's `Table`, which a
  screen reader reads as a table and the keyboard moves through cell by
  cell, as the statistics of each individual are, in a box that scrolls
  with its header in view. Its caption:
  "The place of each of the 200 individuals of panel.nei on the first 10
  of the 199 components, from 535 variants." Its download, "Download the
  table as CSV", `panel.pca.csv` or `panel.pcoa.csv`: the header
  `individual,population,PC1,…,PC10`, the second field named by the title
  of the colours in lower case, and a row per individual, numbers as
  `String` writes them, and a field that holds a comma, a quote or a new
  line written between double quotes, each quote inside doubled, as the
  common rule of CSV files, RFC 4180, has it, so that a spreadsheet opens
  it into the right columns.
- **The notes**: the note of the colours, of the axes, of the marks past
  49 groups, and of the missing genotypes, under the plot; they are not
  warnings, and have no count on the heading.
- The line of the versions, "Calculated with popnei 0.1.0, in version
  0.1.0 of the application.", as the diversity's.

The numbers are written in one way each, decided here. A coordinate is
written to four decimals in the table, "−0.7547", and to three
significant digits in the tooltip of the plot, "−0.755", as
`docs/specs/charts/scatter.md` has it, since a tooltip is read at a
glance and the table is where the numbers are read; the percentages to
two decimals, "3.54%"; a value of a column as `tableNumber` of
`src/charts/plot2d.ts` gives it, up to 12 significant digits, with no
comma between thousands, in the table, the tooltip, the ends of the bar
of viridis and the range of the description; the centres of the groups
in the description to one decimal; the ticks of the axes as the base
writes them (`docs/specs/charts/plot2d.md`, "The axes"); every negative
number on the screen with the minus sign, "−", and not the hyphen; and
every number of the downloaded files as `String` writes it, with the
hyphen. The plot is not offered as SVG or PNG in stage 4: its export is
built and tested with the scatter and the 3D view, and offered by
buttons in stage 6, as the owner decided for every plot on 26 September
2026 (point C of `docs/specs/stage-3-open-points.md`;
`docs/specs/charts/plot2d.md`). What is exported then is the 2D plot, or
the 3D view as it is turned (`charts.md`, "Export of the 3D plot").

### The states

| state | what the user sees | what they can do |
|---|---|---|
| empty | cannot happen: until the variants file is read the analysis is locked with a reason | |
| locked | the reason, as text beside a Run button that is disabled and described by it: "panel.nei has 12,000 individuals, and the principal components of more than 9,381 need more memory …", "This project asks for the PCoA of the Kosman distances, which this version of the application cannot calculate yet. …", "12 individuals of panel.nei are not in pops.csv: …", "Reading pops.csv.", "pops.csv was not read when this project was saved, so the project file does not hold it. …", "The LD pruning of the PCA needs the distance within which variants are compared. …", this one also beside the field of the distance; or the store's when the filters keep no individual. The options stay editable, since they are what the user may change | go to the step the reason names; type the distance or turn the pruning off; change the options |
| ready | the options, the line of the individuals it will run on, and Run | set the options; Run |
| running | the bar and the clock of the diversity, "Calculating · 35% · 0:12", its words after a stop and while it waits for the statistics of each individual; and under them "The bar shows the reading of panel.nei. The components are calculated once it is read, and the bar does not move meanwhile: from under a second for 1,000 individuals to minutes for several thousand." The options stay editable, as in every analysis and in the Variants step: a change of the method, the MAF or the pruning that changes the key leaves the calculation behind, with the notice of the store, which says it will be stopped unless the change is undone (`docs/specs/core/store.md`, "The notice, and the calculations it stops"), and the panel shows the state of the new settings; a change of the colour, the axes or the view keeps the key and the calculation | Stop; change the options |
| done | the bar of controls, the plot, the legend, the explained variance, the table and their downloads; the warnings above the plot, with their count on the heading, "2 warnings"; the notes; after an opened project file, the comparison with its check numbers under the table; and the options, whose change removes the result | draw, colour, turn, highlight, sort, download; change the options |
| results removed | the words of the change that removed it, below, and the options and the line of the individuals, as in ready | Run; the Undo or Redo of the notice or of the header |
| error | what happened and what to do, below; a refusal of popnei stays for these settings, and Run is not offered, since popnei would refuse them again; nor after `reopenFailed`, a variants file the browser can no longer read, which fails again until it is loaded again; as the diversity's | Run again after another failure; change the settings after a refusal; load the file again after `reopenFailed` |

### What it sends and reads

It reads, through `useAppState`, the hook by which a screen reads the
state of the store and is drawn again when the part it reads changes
(`.claude/skills/coding/react.md`, "Reading core"): the status of `pca`
among `state.analyses`; the `RunView` of its run, the calculation in
flight with its progress (`docs/specs/core/store.md`, "The TypeScript
interface"); the notice; the project, for `pcaOptions`, `pcaColours`,
`colourColumns` and the names of the files; the individuals kept as the
store gives them; and the status of `individualChecks`, whose result,
when done, gives the statistics of the note of the missing genotypes,
through `individualStatsOf` of `src/core/apps.ts`
(`docs/specs/entry.md`, "The TypeScript interface"). Run calls
`startAnalysis(store, "pca")` of `src/ui/runs.ts` (`docs/specs/entry.md`,
"The outcome of a calculation"), Stop sends `store.cancelRun("pca")`,
and each option is `store.apply(description, (p) =>
setAnalysisOptions(p, pca, { ...pcaOptions(p), ‹the option› }))`, the
two commands of the store of `docs/specs/core/store.md`, "The TypeScript
interface", and the command of the project of
`docs/specs/core/project.md`. The descriptions, which end the notice and name the header's Undo:

| the change | the description |
|---|---|
| `method` | "the method of the principal components changed" |
| `maxAllowedMaf` | "the maximum major allele frequency of the principal components changed" |
| `on` of `ldPruning`, the checkbox, which sends `ldPruning: { ...pcaOptions(p).ldPruning, on }`, with the r² and the distance as they are | "the LD pruning of the principal components was turned off", "… was turned on" |
| `ldPruning`, its r² or its window, fields shown only while it is on | "the LD pruning of the principal components changed" |
| `colourBy` | "the colour of the points of the principal components changed" |
| `axes` | "the components on the axes changed" |
| `view` | "the principal components were drawn in 3D", "… in 2D" |

The panel holds no state of the project; its own state is the tick of
the clock, the group highlighted, and the 3D view as it is turned and
zoomed, which a change of the colour, of the axes or of the highlight
does not reset, and a switch to 2D does, since the 3D plot is destroyed
then, so that it holds no WebGL context while it is not shown
(`docs/specs/charts/pca3d.md`, "`update`, the view and `destroy`").

### Its words

The locked reasons and the warnings are those of the module. The results
removed, by the cause of the notice, as the diversity's, with
`resultName` "the plot and the table": "The principal components were
removed because the LD pruning of the principal components was turned
off. Undo brings back the plot and the table as they were, with no
calculation; Run calculates new ones for the new settings.", and after an
undo or a redo "Undone: … The principal components were removed; Redo
brings back …".

The error state, by what the store gives; the method is named "the PCA"
or "the PCoA":

| the failure | the text |
|---|---|
| the statistics of each individual a Run waited for failed, `ofStatistics` | the diversity's row, with "so the PCA was not run" in place of "so the diversity was not run" |
| "there are no variants to do a PCA with", and a pass has counted the file at 0 variants (`numVars` of the read of the variants file) | the words of a file with no variant, `emptySourceText` of `src/core/analyses/words.ts`: "empty.vcf has no variants, so there is no variant to do the PCA with. Load another variants file in the Variants step.", or, for a VCF read with only the passed variants, "failed.vcf has no variant with PASS or . in its FILTER column, …" |
| the same, the variants of the file not counted or more than 0 | "No variant of panel.nei is left after the filters of the Variants step and the options of the PCA, so there is no variant to do the PCA with. Loosen the filters, or the maximum major allele frequency of the PCA; the Count button of the Variants step shows how many each filter keeps." |
| "no variant has more than one dosage among its called genotypes" | "No variant left after the filters varies among the individuals kept, so there is nothing to do the PCA with. This happens with one individual, or a few of one line; keep more individuals with the filters of individuals in the Variants step." |
| a message that starts "the variant ‹n› of the ones the filter by linkage disequilibrium has read", the pruning the PCA's own | `ldOrderText` of `src/core/analyses/words.ts` (`docs/specs/analyses/diversity.md`, "Its words"), with the PCA's pruning: "The LD pruning of the PCA needs the variants of each chromosome together and in the order of their positions, and panel.vcf.gz does not have them so: on chromosome 1, a variant at position 10 comes after one at position 30. Sort the file, with bcftools sort for a VCF, and load it again, or turn the LD pruning of the PCA off." A variant of a chromosome that had already ended: "…: a variant of chromosome 1, at position 10, comes after a variant of another chromosome, though variants of chromosome 1 came before that one." |
| the same, the pruning the dataset's | the diversity's row, with the LD filter of the Variants step: "The LD filter of the Variants step needs …, or turn off the LD filter in the Variants step." |
| a genotype of another ploidy; a line of the VCF | the diversity's rows, `otherPloidyText` and the line of the VCF |
| "the principal components of ‹n› individuals hold about", or of the PCoA "the principal coordinates of ‹n› individuals hold about", which the lock prevents | "panel.nei has 12,000 individuals, …", the words of the lock |
| the PCoA's empty pass, "the pass gave no variant and its source holds none" or "the pass gave no variant: …" | the two rows of the empty pass above, with "the PCoA" |
| the PCoA's refusal of the pairs with no distance, recognised by the start of popnei's message once its release words it (provisional) | "‹n› pairs of individuals of panel.nei have no variant called in both, so they have no Kosman distance and the PCoA cannot place them; s082 is in 17 of them. Remove the individuals with many missing genotypes with the filters of individuals in the Variants step, or use the PCA of the genotypes, which places every individual." |
| the PCoA's refusal of fewer than two individuals (provisional), which the filters of individuals give when they keep one | "The filters of individuals keep one individual of panel.nei, and the PCoA needs two at least to place them. Keep more individuals with the filters of individuals in the Variants step." |
| the PCoA's "every distance is 0" (provisional) | "Every two of the individuals kept have the same alleles at every variant both have called, so their Kosman distances are all 0 and the PCoA has nothing to place. Keep more individuals, or more variants, with the filters of the Variants step." |
| any other refusal | "popnei could not calculate the principal components: ‹its message›. Change the settings, or load the variants file again, to run it again." |
| the worker stopped with no answer, `workerFailed`, with the memory the calculation needs estimated at `PCA_MEMORY_WORDS_BYTES`, 250 MB, or more: 48.8 bytes for the PCA, 56.8 for the PCoA, for each cell of the individuals × individuals matrix of the individuals it ran on, 2,264 individuals or more for the PCA | "The calculation stopped unexpectedly, perhaps because the principal components of 4,000 individuals, which need about 0.8 GB, did not fit in the memory of this tab; a phone or a tablet gives a tab far less than a computer. Keep fewer individuals with the filters of individuals in the Variants step, close other tabs and run it again, or calculate them with popnei in Python, outside the browser." |
| `workerFailed` below that, `reopenFailed`, `defect`, `couldNotStart`, `protocolMismatch`, `files` | the diversity's rows |

The words of the LD filter's refusal take from popnei's message only
the chromosome and the two positions, as the diversity's row says
(`docs/specs/analyses/diversity.md`, "Its words"), where they are made
once for every panel.

In the row of any other refusal, ‹its message› is popnei's sentence,
shown as text with its backquotes left out: a refusal that no row foresees is one the application
did not expect, and popnei's words, which say what it refused and why,
are then the only account the user has. It is not rewritten, since a
rewording made without knowing the case could say something false.

`refusalText` makes the rows of popnei's refusals; the rows of the
refusals of the diversity whose words are not the PCA's are not used,
since popnei's PCA words its empty pass otherwise. `crashText` makes the
two rows of `workerFailed`.

A browser may refuse the memory well below popnei's limit: wasm can
address 4 GB, but a tab is given what the browser and the machine allow,
and a memory that cannot grow ends the worker with no answer, a
`workerFailed` (`docs/specs/worker/runner.md`, "What it answers when
something goes wrong"), and not with popnei's refusal. So a crash of a
large PCA is told as one of memory, whose remedy is fewer individuals,
and not with the diversity's words, which say to load the file again.
250 MB is decided here, as the size below which no browser of a computer
was expected to refuse the memory; where each engine does refuse it, in
Chromium, Firefox and WebKit on the owner's Mac and on a phone, is
measured by the plan, which moves the number. The words count the
individuals the calculation ran on, those the filters keep, since the
matrix is theirs.

The notes of "What it shows" and of the module are its other words.

The 3D view, in the place of the plot, with the 2D button still
offered in each case (`docs/specs/charts/pca3d.md`, "Loading three.js",
"When the browser has no WebGL" and "The WebGL context lost"):

| when | the text |
|---|---|
| three.js is being downloaded, the first time 3D is shown | "Loading the 3D view…", announced without moving the focus. A download that ends after the user went back to 2D is dropped, and draws nothing (`docs/specs/charts/pca3d.md`, "Loading three.js") |
| its download failed, the connection down or the site deployed again since the page was opened | "The 3D view could not be loaded. If the connection works, the site may have been updated since this page was opened: save the project, reload the page and open the project again.", with a "Try again" button |
| the browser gives no WebGL 2, `Pca3dError` of kind `noWebGl` | "This browser cannot draw the 3D view: WebGL, the part of the browser that draws it, is turned off or not available on this computer. The 2D plot shows any two of the components." A project saved in 3D and opened there shows the same, and is not switched to 2D by the screen |
| the browser took the drawing away, `onContextChange(true)`, until `onContextChange(false)` | "The browser stopped drawing the 3D view. It is drawn again when the browser allows it, or when you switch to 2D and back to 3D." |

`pca3d.md` points here for them.

The help, for the drawer of stage 8:

- What it gives: the place of each individual on the axes along which the
  individuals differ most, PC1 the most; the explained variance of each;
  how to read clusters, and that the distance along a component with
  little variance means little.
- Its defaults: the MAF filter at 0.95 and the pruning at r² 0.1, for
  this analysis alone and for both its methods, and why: rare variants
  and linked regions would otherwise shape the components; when the
  Variants step has its own, the stricter MAF and its LD filter are used.
- The distance of the pruning, which the user types, and why it has no
  default: it depends on how far linkage disequilibrium extends in the
  genome of the species, and differs from one species to another. Once
  the application has the LD decay, stage 5 of `docs/build-order.md`,
  which gives the distance at which r² falls to half, the help points to
  it as the way to choose the distance.
- When not to trust it: with the pruning off, a linked region can make a
  component; with few variants, chance can look like structure; the PCA
  draws individuals with many missing genotypes toward the centre, and
  the PCoA of the Kosman distances is for such data; a variant of more
  than two alleles counts every allele but the major one the same, and
  popnei does not say how many there were.
- The correction of the PCoA: Kosman distances compared over the
  variants each pair has called often cannot all be drawn in one space;
  the PCoA then adds the same amount to every squared distance, Lingoes'
  method, which draws the closest individuals apart the most, so that
  tight groups look looser and two individuals of the same genotypes are
  drawn apart; its warning gives how much was added beside the mean of
  the squared distances, and the PCA of the genotypes, which needs no
  correction, is the one to compare with.
- How to use the plots: Escape hides the tooltip of a point; the 3D
  view turns by dragging or with the buttons, and zooms with the wheel
  while the Ctrl key is held, by pinching, or with the buttons
  (`docs/specs/charts/pca3d.md`, **Open 1**).
- In Python: `popnei.do_pca_from_variants(variants,
  transform_to_biallelic=True, num_prin_comps=0)` after the same filters,
  whose components are named `PC0`, `PC1`, … where the application
  writes PC1, PC2, …; the numbers agree to about 1e-14. The PCoA is
  `popnei.do_pcoa_from_variants(variants, correct_by_lingoes=True)`:
  without the argument, which is false in Python, popnei refuses
  distances that need the correction and says so.

### Accessibility

- **The tooltip** of the point under the pointer stays while the pointer
  is on the point or on the tooltip, does not cover its point, and hides
  when Escape is pressed, in 2D and in 3D, as WCAG 2.2 asks of what a
  hover shows (success criterion 1.4.13: it can be dismissed, hovered
  and stays until the user moves away). Escape is heard by a listener on
  the whole page that exists only while a tooltip is shown and acts on
  that key alone (`docs/specs/charts/scatter.md`); the help says so.
- **The plot** is an image with a text alternative, the title and the
  description of the base of the 2D plots (`docs/specs/charts/plot2d.md`):
  the title "Principal components, PC1 and PC2", or of the 3D view
  "Principal components, PC1, PC2 and PC3", by the axes shown; and the
  description from `pcaDescription`: "Principal components of 200 individuals of
  panel.nei, PC1, 3.54% of the variance, across, and PC2, 3.44%, up.
  Coloured by population: p0, 48 individuals, centred at 0.6 on PC1 and
  7.3 on PC2; p2, 84, centred at −4.5 and −1.9; p1, 68, centred at 5.1
  and −2.8. p1 is highlighted. The table of the individuals gives each
  one's place." The centre of a group is the mean of its projections,
  arithmetic on popnei's numbers, written to one decimal; those of the
  example are of the PCA of `panel.nei` pruned at r² 0.1 within 50,000
  base pairs, coloured by `popcat`,
  0.611 and 7.324, −4.497 and −1.937, 5.124 and −2.777 to three
  decimals, the means of the projections of the script of "How it is
  verified" over the populations of `panel_pops.csv`, in node with the
  release on 27 September 2026. Coloured by the values of a column, it
  says their range in place of the groups: "Coloured by altitude, from
  100 to 2060; 3 individuals have no value.", as `panel_meta.csv` gives.
  A description cannot hold 200 points; it
  says where each group lies, which is what a user reads the plot for.
- **The table is the keyboard's way in** to the points, which are not
  stops of the Tab key, since a few thousand stops are no use
  (`charts.md`, "The data are also a table"): the plot is followed by
  React Aria's `Link` "Go to the table of the individuals, which gives
  the place of each one.", which moves the focus to the table.
- **The legend** is React Aria's `ToggleButtonGroup` of one selection,
  vertical (`docs/specs/charts/scatter.md`, "The legend, drawn by the
  screen"): one stop of the Tab key for the whole list, the Up and Down
  arrow keys to move along it, as its entries are a column, Space or Enter to press, and a press on the pressed entry to
  clear it. React Aria 1.21.1 gives the group the role of a group of
  radio buttons and each entry that of a radio button, so a screen reader
  says "p1 (68), radio button, 3 of 3", and whether it is checked, which
  is how the highlight is said. The group is named by the title of the
  colours, "Population" or the column's name. The legend hears keys only
  while it has the focus, and not on the whole page, where it would take
  the keys of the fields; the one listener of the page is that of
  Escape while a tooltip is shown, above.
- **The 3D view** is turned and zoomed by its buttons, since WCAG 2.2
  asks that what a drag does can be done with single presses (success
  criterion 2.5.7) and what a pinch of two fingers does with one pointer
  (2.5.1). It is drawn on a canvas, a surface of pixels a screen reader
  cannot see into, which is described by `pcaDescription` with the three
  axes: "The 3D view of the same 200 individuals of panel.nei on PC1, PC2
  and PC3, which the 2D plot shows two at a time. The table of the
  individuals gives every coordinate." A description of a turned view cannot say what is across
  and what is up, so it names the components and points to the 2D plot
  and the table. When the browser cannot draw it, or takes the drawing
  away, the view says so in the words of "Its words", and the 2D button
  stays.
- **Not colour alone**, since WCAG 2.2 asks that colour is never the
  only way a thing is told apart (1.4.1): each group has its shape as well as its
  colour, the legend shows both, and the table names each individual's
  group in words. The faded groups of a highlight keep their shapes. A
  colouring by the values of a continuous column is told by colour alone
  on the plot, since viridis has no shapes; so the bar of the legend
  writes its smallest and largest value, the tooltip writes the value of
  its point, "altitude: 1280", and the table has each individual's value
  in its second column, which can be sorted by it.
- **The keyboard order**: the options, Run or Stop, the warnings, the bar
  of controls, the legend, the plot's link to the table, the explained
  variance, the table, the downloads. The switch of 2D and 3D keeps the
  focus on the button pressed. Run and Stop are one button, and the focus
  moves to the heading when it goes, as the diversity's.
- **Announced without moving the focus**, since WCAG 2.2 asks that a
  message of status reach a screen reader without taking the user away
  from where they are (4.1.3): the end of a run and the notice, by the
  shell's status region, and by the toast, the message with its Undo
  that the shell shows over the page for a while (`docs/specs/shell.md`).
  The panel announces its own through `announce` of the shell, which
  writes into the same region: the loading of the 3D view, its failure
  to load, a browser with no WebGL and a drawing taken away, in the
  words of "Its words", when each appears, since the focus is then on
  the 3D button or on a button of the bar and a screen reader would not
  read the text that replaced the plot; and the notes that appear after
  a change of the colour, the axes or the view, "Note: " and their
  words, since the focus is then on the select or the button that made
  them; and the reason of the pruning with no distance when turning the
  pruning on makes it appear, since the focus is then on the checkbox.
  A highlight is said by the checked state of its entry and not
  announced again.
- A warning says "Warning:" in words, and a note "Note:".

### Left for the running application

The layout of the bar of controls and of the legend over the plot, the
size of the plot and of the points, how much the faded groups are
faded, where the notes go, and whether the options fold away once
there is a result. The step of the turns, 15°, is decided in
`docs/specs/charts/pca3d.md`, whose tests rest on it.

## What this spec asks of other documents

Of the specs written beside it for stage 4:

- `docs/specs/charts/scatter.md`: `createScatter` takes the x and y of
  the two components, the group of each point with the names of the
  groups, and a group to highlight, drawn with the others faded and with
  their shapes kept; the title and the description come from the panel;
  the legend is the panel's list of buttons, over the plot, from the
  scatter's `legendOf`.
- `docs/specs/charts/pca3d.md`: `createPca3d` takes the three components
  as columns, the groups and a group to highlight, and has `rotate`,
  `viewAlong`, `zoom` and `resetView`.
- `docs/specs/core/project.md`: `Grouping` gains `{ kind: "onePopulation" }`,
  and `individualsNeeds` no longer locks on no file, from stage 4.
- `docs/specs/steps/individuals.md`: the types of the columns as the
  user sets them, which decide between groups and values.
- `docs/specs/worker/individuals.md`: `cellNumber`, pure, where core can
  import it, for the values of a continuous column.
- `docs/specs/worker/messages.md`: the check of `PcaJob` and `PcaResult`,
  the arrays with `instanceof`, `numCompsKept` a whole number, its range
  from 1 kept by core and the runner,
  `lingoesConstant` and `negativeEigenvaluesPercent` numbers for the PCoA
  and `null` for the PCA, and
  the version of the messages raised for a new member; its example of
  "pass 2 of 2" of a PCA, which no run of stage 4 makes, and its
  intermediate results with the PCA, which stage 4 does not keep.
- `docs/specs/analyses/diversity.md`: its run of two passes, "the PCA of
  stage 4", in "How it runs", which no longer holds, since the PCA asks
  for no weights; and its words "Undo brings back the table", which ask that "Undo brings back
  the table" be checked against the cache when the PCA comes: a result of
  the PCA is at most 900 KB, and the words hold.
- `docs/specs/core/keys.md`, "The key of an intermediate result", and
  `docs/specs/core/cache.md`, where it names an intermediate result:
  their example, the
  variants kept by the pruning of the PCA, is not kept in stage 4; the
  kinship of stage 7 is the first intermediate result.
- `docs/specs/shell.md`: the title "Principal components" in the notice
  and the status region.
- `docs/specs/core/store.md`: an analysis leaves the results removed of
  the notice, and its calculation those left behind, when a read of a
  file gives its key again, and a calculation the notice names stays
  among those left behind when a read keeps it locked, which the cases
  of a metadata file loaded over a PCA rest on; made after the last
  reviews of 27 September 2026.
- `docs/architecture.md`, section 13: point 9, the restart after a large
  PCA (**Open 1**, decided by the owner on 27 September 2026); and section 11, the times and the memory of "How it
  runs".
- `src/core/script.ts`, stage 6: `individuals_kept`, the list of the
  individuals kept, in the script, and the call that opened the variants
  file, which the PCA writes again.
- `docs/specs/stage-3-open-points.md`, "For stage 4": answered by "Which
  variants it reads".

Each of these was made in its document on 27 September 2026, when the
specs of stage 4 were made to agree, `docs/architecture.md` among them,
but that of `src/core/script.ts`, which stage 6 writes.

Revised by the writer of this spec, in the same session:
`docs/specs/worker/protocol.md`, `runner.md` and `client.md`,
`docs/specs/core/store.md`, `docs/specs/analyses/filterCounts.md` and
`docs/specs/entry.md`, where they name the PCA. `entry.md` lists `pca`
in `POPGEN_ANALYSES` of `src/core/apps.ts`, before the diversity, since
the PCA is where the user checks the populations the diversity then uses
(`docs/build-order.md`, stage 4), in the Analyses step.

## What this spec asks of popnei

- **The limit on the individuals counted on the individuals of the
  pass**, after `filterIndividuals`, and not on those of the source:
  `pca_of_variants` of `crates/popnei-js/src/vars.rs` and `vcf.rs` gives
  `self.individuals.len()` to `room_for_the_analysis_of_the_variants`, on
  the release and on `main` at `2d2229c`, so a file of 12,000 individuals
  cannot be analysed through a list of 5,000. Until then the application
  locks on the file's individuals.
- **The refusal of the PCA's empty pass in the words of the other
  calculations**, "the pass gave no variant and its source holds none"
  or "the pass gave no variant: …" with the counts of each filter, in
  the place of "there are no variants to do a PCA with", so that the user
  is told which filter dropped them.
- **A call of `onProgress` when the reading of the pass ends**, before
  the decomposition, or a progress of the decomposition, so that the bar
  says what is being done for the minutes of a large PCA.
- **The called genotypes of each individual with the PCA**, one number
  per individual, which would make the note of the missing genotypes a
  warning of the result.
- **`doPcoaFromVariants` with `correctByLingoes`**, asked by the owner on
  27 September 2026 and being built on popnei's branch `plan/pcoa`, in a
  release of popnei's TypeScript package with a new version.

## The names of popnei's PCoA, provisional

From popnei's draft spec on its branch `spec/pcoa`, "The principal
coordinates of distances" of `docs/specs/pca.md`, at commit `aa78e7e` of
27 September 2026, whose plan, on the branch `plan/pcoa`, the owner
approved and which is being built: the function
`doPcoaFromVariants(variants, { minNumSnps, correctByLingoes })`, called
with `correctByLingoes: true` and `minNumSnps` left out, so a pair needs
one variant called in both; its result's `individuals`, `numComps`,
`projections`, `explainedVariancePercent` and `passStats`, as those of
`doPcaFromVariants`, with no `usedVars`, and the two numbers it adds,
`lingoesConstant` and `negativeEigenvaluesPercent`;
`numPassesOf("doPcoaFromVariants")` 1; the limit of 8,695 individuals,
which popnei's plan measures; the refusals of the pairs with no
distance, of every distance 0 and of fewer than two individuals, and
their words; in Python `do_pcoa_from_variants`, `correct_by_lingoes`,
`lingoes_constant` and `negative_eigenvalues_percent`. Each is checked
against popnei's release that has the PCoA, and this spec corrected to
it, before the code of the runner's call and before `PCOA_IN_POPNEI` is
set true; the rest of the PCoA, its options, its key, its warning, its
words and its panel, is written against these names with the PCA, and
tested on results the tests build.

## Open points

The points of `docs/specs/stage-4-open-points.md` this spec rests on
are listed there once. Decided by the owner on 27 September 2026: the
pruned variants not kept between two PCAs, and its default pruning, r²
0.1 with no distance. Recommended and not yet answered, which this spec
follows until they are: which variants the PCA reads, the variants of
more than two alleles, and the PCA opening in 2D. Of the two that
follow, this spec's own, the owner decided the first on 27 September
2026; the second is open, and until the owner decides it the
implementer builds what its "Meanwhile" says.

**Open 1, decided by the owner on 27 September 2026: the calculation
worker started again after a large PCA.** A PCA of n individuals grows
the memory of wasm by about 49 bytes per pair, 662 MB at 4,000 in node,
and that memory never shrinks, so the tab would keep it until the next
load of the variants file. The client starts the worker again after a
PCA or a PCoA of more than 700 individuals, as after a written file
above 25 MB (`docs/specs/worker/client.md`). It costs the reading of the
header of the file, at most 49 ms, and nothing else in stage 4, since
the worker keeps no intermediate result; from stage 7 it would also cost
the kinship the worker keeps, and the bound is decided again then. The
option not taken: not starting it again, as the owner decided on 26
September 2026 for every request but a write (`docs/architecture.md`,
section 13, point 2), which leaves the tab holding up to 4.3 GB after a
PCA of 9,381 individuals, which a phone, or a laptop with the variants
file and other tabs open, may not have for the next analysis.

**Open 2: the individuals with many missing genotypes told by a note of
the panel.** The PCA draws them toward the centre, and the result does
not hold their missing genotypes. The options:

- A note of the panel, from the statistics of each individual when the
  store has them for the filters as they are, as above: nothing to
  calculate, but shown only after those statistics are calculated, not
  kept with the result nor in the report, and counted over the dataset's
  filters rather than the PCA's.
- A warning of the module, which needs popnei to give the called
  genotypes of each individual with the PCA (asked above), and until
  then nothing.
- The PCA's Run calculates the statistics of each individual first, as a
  Run with a threshold on the individuals does: a pass more, of the
  length of the PCA's own, for every PCA without them.

Recommendation: the note meanwhile, and the warning once popnei gives the
counts. Meanwhile the note, at 0.2.

## Not in this spec

- The lasso that edits the populations on the plot: not in stage 4, the
  owner's meanwhile of 27 September 2026, with a design of its own.
- The principal components as covariates of the GWAS, and the colour of a
  trait of the traits file: stage 7.
- The weights of the variants, which popnei gives with `numPrinComps`
  above 0, and a second pass: not shown.
- The variants kept by the pruning, kept for the next PCA: not built, as
  the owner decided on 27 September 2026 ("The pruned variants are not
  kept between two PCAs" in `docs/specs/stage-4-open-points.md`).
- The export of the plots as SVG and PNG, and the report: stage 6.
- The scatter and the 3D view as plots: `docs/specs/charts/scatter.md`
  and `pca3d.md`.
- The notice, its toast, the status region: `docs/specs/shell.md`.
