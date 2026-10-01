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
does not lose the distance typed; and on 28 September 2026 to popnei's
release `js-v0.1.0-dev.3`, which has the PCoA: its names, its limit of
9,381 individuals counted on those the filters keep, its refusals, its
memory and its numbers on `panel.nei`, where it differs from the draft
this spec had followed ("The PCoA of popnei's release", at the end); and
again that day after its review, the limit of the PCoA made a lock of the
known list of the individuals kept, `keptNeeds`, so that a threshold on
the individuals leads to a lock and not to a refusal after the Run;
and again that day for the owner's decision that the LD filter of the
Variants step starts with no distance, as the PCA's pruning does: while
the dataset's filter has none, the PCA does not prune again and is
locked by that filter, with the reason of `variantFilterNeeds` of
`docs/specs/core/project.md`, until the distance is typed in the
Variants step; and again that day for two decisions of the owner of 28
September 2026: Lingoes' correction has no switch, the PCoA always asks
popnei for it; and the LD filter of the Variants step keeps its values
while it is off, as this analysis's pruning does, so that neither
analysis nor step loses a distance typed. Revised again on 28 September
2026 for the owner's later decisions of that day. The PCA has its own
filters of missing data, MAF and LD, each "as in the Variants step" by
default and set by the user to a value of its own, which replaces the
dataset's filter of that kind for the PCA alone. They replace its own
MAF filter at 0.95 and its own pruning on by default, so that with the
filters of a new project the PCA no longer prunes, and warns of it (below,
"Which variants it reads" and "Its options"). The panel opens on the 3D
view, with 2D one button away and in its place when the browser cannot
draw 3D. And four recommendations were taken: the variants of more
than two alleles counted as popnei's `transformToBiallelic` counts them,
the lasso left out of stage 4, the note of the missing genotypes, Open
2, and the zoom of the 3D view by the wheel with Ctrl held. The filters,
the PCA's among them, count over the individuals kept, as the owner
decided the same day for every analysis (`docs/architecture.md`,
section 2). Approved by the owner on 28 September 2026.
There is no code of it yet. This spec gives
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
of the individuals kept, which a job carries, and over which the filters
of the variants but the regions count, as the owner decided on 28
September 2026; the regions come before the list, as the owner decided
later that day (`docs/architecture.md`, sections 2 and 4). A **component** is one axis
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
of 27 and 28 September 2026, that this spec takes are named where they
apply, and gathered in `docs/specs/stage-4-open-points.md`. Two more are
this spec's own, at the end: **Open 1** and **Open 2**, both decided by
the owner.

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
  popnei gives it as `doPcoaFromVariants` of `js/popnei/src/pcoa.ts`,
  which the owner asked of popnei on 27 September 2026 and which is in
  popnei's release `js-v0.1.0-dev.3` of 28 September 2026; popnei's
  `docs/specs/pca.md`, "The principal coordinates of distances", says
  what it computes. The application builds on that release from stage 4
  ("The PCoA of popnei's release", at the end).

**The Kosman distances are corrected when no space holds them.** A PCoA
places the individuals in a space where the straight line between two of
them is as long as their distance; the variance along each of its
components is an eigenvalue of a matrix made of the distances. When no
space has points at those distances, some eigenvalues are negative, a
variance below 0 that no direction has. The Kosman distances of real
data are often so, since each pair is compared over its own variants:
`e2e/fixtures/panel.nei`, 200 individuals, with the filters of a new
project, the missing data filter at 0.1 and no other, gives 44 negative
eigenvalues of 200, holding 2.98% of the variance of the distances, and
with an LD filter of the PCA's own at r² 0.1 within 50,000 base pairs
as well, 61, holding 7.87% (popnei's refusal of the distances
uncorrected, in node with `js-v0.1.0-dev.3` on 28 September 2026). popnei refuses such distances
unless it is asked to correct them, by Lingoes' method: with c the most
negative eigenvalue in absolute value, it adds 2c to the square of the
distance of every pair of different individuals, which raises the
eigenvalues by c and makes every one of them 0 or above. The owner
decided on 27 September 2026 that popnei_web asks for the correction
always and warns its users that the distances were corrected, and that
in popnei the correction is not made unless it is asked for, so
`correctByLingoes` is false by default there (popnei's
`docs/specs/pca.md`, where the decision is recorded;
`docs/specs/stage-4-open-points.md`). So the application calls
`doPcoaFromVariants(variants, { correctByLingoes: true })`, and a PCoA
it shows is of the corrected distances whenever they needed it (below,
"The warnings").

The correction has no switch, as the owner decided on 28 September
2026: the PCoA always asks popnei for it, and its warning gives how
large it was. Two options were not taken. A switch that turned the
correction off would only make popnei refuse: its release
`js-v0.1.0-dev.3` refuses the PCoA without the correction whenever an
eigenvalue is negative, which on `panel.nei` with the filters of a new
project is 44 of 200.
And asking popnei for a PCoA of the distances uncorrected, which
popnei does not make, would be a new calculation asked of popnei, and a
second kind of result for the panel to draw and explain.

Both read the same variants, the dataset's filters with those the PCA
has of its own in their place, so that the two can be compared, and both give
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
of variants, with no word of it; a PCA whose own filters the panel shows
and the job does not carry.

### Which variants it reads

The PCA has three filters of its own, of missing data, of the major
allele frequency (MAF) and of LD, as the owner decided on 28 September
2026: "PCA is a bit special because usually we want stricter missing
data and ld filters. I would put those widgets in the PCA/PCoA page, by
default they follow what ever is set for the rest of the analyses, but
the user can also set specific values for the PCA/PCoA there." Each of
the three is, as the user sets it in the panel (below, "Its options"):

- **As in the Variants step**, the default: the dataset's filter of that
  kind, as the step has it on, or none while the step has it off. A
  change of it in the Variants step changes the PCA's.
- **Its own**, a value the user sets in the panel for the PCA alone. It
  replaces the dataset's filter of that kind for the PCA, whether it is
  stricter or looser, and is the PCA's alone when the dataset has none
  of that kind.

popnei takes one filter of each kind on a `Variants`, and a second of
one kind throws (`docs/specs/worker/protocol.md`), so a filter of the
PCA's own cannot be added to the dataset's of its kind, and takes its
place. The job carries the dataset's filters of the variants, in their
fixed order, with the PCA's own of each kind in the place of the
dataset's, or, when the dataset has none of that kind, in the place of
its kind in the fixed order. The filter of observed heterozygosity is
always the dataset's, and so will be the regions of a BED file once
popnei has that filter. An LD filter with no distance, the dataset's or
the PCA's own, is copied as it is: popnei's `filterByLd` cannot be given
it, and `needs`, the function of the module that says why it cannot
run, locks the PCA before the store sends a job: for the dataset's,
which the PCA follows, with the reason `variantFilterNeeds` of
`docs/specs/core/project.md` gives while the LD filter of the Variants
step is on with no distance; for the PCA's own, with the reason
`pruningDistanceReason` of this module gives while the PCA's own LD
filter has none (below, "Why it cannot run"). So such a list is never
sent.

Two options were not taken by the owner: the PCA's own missing data and
LD alone, its MAF the dataset's; and a filter of its own for every
filter of the variants. A third choice for each filter, no filter of
that kind for the PCA while the dataset has one, was not taken by the
writers: the owner asked for stricter filters, and a missing data or a
MAF filter of the PCA's own at 1 keeps every variant already. An LD
filter of the dataset that the PCA should not have has no such number;
it is a choice to add when a user needs it.

The filters of the variants count over the individuals the filters of
individuals keep, for the PCA as for every analysis, as the owner
decided on 28 September 2026 (`docs/architecture.md`, section 2): the
missing data, the frequencies and the r² of the PCA's pass are those of
the individuals it places. The list of the individuals kept is in the
job, as for every analysis.

`pcaFilters(filters, options)` makes the list of the filters of the
variants, a pure function of the project's filters on and the options.
Worked examples, from the filters of a new project, the missing data
filter at 0.1 (`firstProject` of `src/core/apps.ts`). In the column of
the options, "defaults" is the three filters as in the Variants step,
and "own" a filter the user set in the panel:

| the dataset's filters | the PCA's options | the filters of the job |
|---|---|---|
| missing data 0.1 | defaults | missing data 0.1; no LD filter, so the warning `pruningOff` on the result |
| missing data 0.1 | own LD, r² 0.1, no distance typed | missing data 0.1, LD r² 0.1 with no distance; the PCA is locked until the distance is typed in its panel |
| missing data 0.1 | own LD, r² 0.1 within 50,000 | missing data 0.1, LD r² 0.1 within 50,000 |
| missing data 0.1 | own missing data 0.05, own MAF 0.95, own LD r² 0.1 within 50,000 | missing data 0.05, MAF 0.95, LD r² 0.1 within 50,000 |
| missing data 0.1, MAF 0.9 | defaults | missing data 0.1, MAF 0.9 |
| missing data 0.1, MAF 0.9 | own MAF 0.98 | missing data 0.1, MAF 0.98 |
| missing data 0.1, heterozygosity 0.9, LD r² 0.3 within 10,000 | defaults | missing data 0.1, heterozygosity 0.9, LD r² 0.3 within 10,000 |
| missing data 0.1, heterozygosity 0.9, LD r² 0.3 within 10,000 | own missing data 0.02, own LD r² 0.1 within 50,000 | missing data 0.02, heterozygosity 0.9, LD r² 0.1 within 50,000 |
| missing data 0.1, LD r² 0.3 with no distance | defaults | missing data 0.1, LD r² 0.3 with no distance; the PCA is locked until the distance is typed in the Variants step |
| missing data 0.1, LD r² 0.3 with no distance | own LD r² 0.1 within 50,000 | missing data 0.1, LD r² 0.1 within 50,000; the PCA can run, since it does not use the step's LD filter (below, "Why it cannot run") |
| none | own missing data 0.05 | missing data 0.05 |
| missing data 0.1 | LD back to as in the Variants step, with r² 0.1 and 50,000 kept | missing data 0.1 |

A filter of the PCA's own set back to as in the Variants step puts
nothing of its own in the list, whatever values it keeps for when it is
set again. A filter of the Variants step that is off is not the
dataset's either: the project keeps it among the filters off,
`filtersOff` of `docs/specs/core/project.md`, which `pcaFilters` does
not read, and a PCA that follows it has no filter of that kind. A value
of the PCA's own is given to popnei as typed, as every number the user
types (`docs/specs/worker/protocol.md`, "The number the user types"): a
MAF of 1, which keeps every variant, is a MAF filter at 1.

The Variants step shows beside each filter how many variants it kept,
counted by the pass of an analysis. The pass of the PCA can have other
filters than the project's, so its counts are not shown there. A PCA
whose three filters follow the Variants step has the project's, and its
counts are not shown either, since telling which PCAs have the
project's filters is not worth its code, and the Count or the diversity
fill them. The one number taken from it is the number of
variants of the file, `varsProcessed` of its first filter, which is the
whole file whatever the filter: `countsOf` of `src/core/apps.ts` gives
`null` counts for the PCA and that number
(`docs/specs/analyses/filterCounts.md`, "Which results fill it").

### Its options

The options of the analysis, as the project holds them, `PcaOptions`:

| option | what it is | default | from |
|---|---|---|---|
| `method` | `"pca"`, the PCA of the genotypes, or `"pcoa"`, the PCoA of the Kosman distances | `"pca"` | `docs/functionality.md`, section 5 |
| `missingData` | the PCA's missing data filter, `{ follow, maxAllowedMissingRate }`: `follow` true while it is as in the Variants step, false while it is the PCA's own; and its maximum proportion of missing genotypes, a number from 0 to 1, kept while `follow` is true | `{ follow: true, maxAllowedMissingRate: 0.1 }` | decided by the owner on 28 September 2026, below |
| `maf` | the PCA's MAF filter, `{ follow, maxAllowedMaf }`, its maximum major allele frequency from 0 to 1, kept while it follows | `{ follow: true, maxAllowedMaf: 0.95 }` | the same |
| `ld` | the PCA's LD filter, `{ follow, maxAllowedR2, maxDist }`: the largest r² between two variants kept, and the window in base pairs, `maxDist` `null` until the user types one; both kept while it follows | `{ follow: true, maxAllowedR2: 0.1, maxDist: null }` | decided by the owner on 27 and 28 September 2026, below |
| `colourBy` | the column of the individuals file whose values colour the points, or `null` for the populations of the grouping | `null` | `docs/functionality.md`, section 5 |
| `axes` | the three components drawn, from 1: the 3D view shows all three, the 2D plot the first against the second | `[1, 2, 3]` | `docs/functionality.md`, section 5 |
| `view` | `"3d"` or `"2d"` | `"3d"` | decided by the owner on 28 September 2026, below |

The names of the thresholds are those of the filters of
`docs/specs/worker/protocol.md`, which are popnei's arguments, so that
`pcaFilters` copies them and a reader of the project file finds one name
for one number.

**The PCA's own filters follow the Variants step until the user sets
them.** The owner decided on 28 September 2026 that the PCA has its own
filters of missing data, MAF and LD, which by default follow what is set
for the other analyses, since a PCA usually wants stricter missing data
and LD filters than they do (above, "Which variants it reads"). A filter
set for the PCA starts at a fixed value: the missing data at 0.1 and the
MAF at 0.95, the values the Variants step turns those filters on at the
first time (`docs/specs/steps/variants.md`, "The filters of the
variants"); the LD at r² 0.1 with no distance, as the owner decided for
the PCA's pruning on 27 September 2026 (point 3, "The PCA's pruning: r²
0.1, and no default distance", in `docs/specs/stage-4-open-points.md`),
and kept for its own LD filter on 28 September 2026. popnei gives no
default of either. The r² of 0.1: on popnei's LD test file, at 50,000
base pairs, plink2 at r² 0.3 keeps 41 variants where popnei keeps 46 at
0.15 and 35 at 0.1 (`docs/specs/filters.md` of popnei, near its line
940), so a threshold of popnei is lower than a habit of plink; 0.1 keeps
no more than plink's common setting. The distance has no default, in
the owner's words because "the distance really depends on the
LD/recombination of the regions", so the user chooses it: how far
linkage disequilibrium extends differs from one species, and one
genome, to another. While the PCA's own LD filter has no distance, the
PCA is locked (below, "Why it cannot run").

A filter set back to as in the Variants step changes `follow` alone and
keeps its values, so that setting it for the PCA again gives back what
the user typed, and a distance once typed is not asked for again. It is
the rule of the switches of the Variants step, whose filters keep their
values while they are off, as the owner decided on 28 September 2026
(`docs/specs/core/project.md`, "The filters turned off"). The writers
decided the form the same day: one object for each filter, its flag and
its values. Three forms were not taken. A union, `{ follow: true }` or
`{ follow: false, maxAllowedMissingRate }`, would lose the value each
time the filter follows the step again, against that rule. The form of
the project's filters, lists of the filters on and off, is there because
many parts of the application read the project's filters
(`project.md`, "The filters turned off"), where the PCA's are read by
`pcaFilters` alone. And a filter set for the PCA could start at the
dataset's value of the moment, but its option would then need a state
"never set", and the number the user starts from would depend on the
Variants step at the moment of the choice.

This replaces what the PCA had until then, as the owner decided: its own
MAF filter at 0.95, applied as the stricter of its own and the
dataset's, and its own pruning, on by default at r² 0.1 with no
distance, which locked the PCA of a new project until the user typed a
distance. Now, with the filters of a new project, the PCA reads the
variants the diversity reads: it prunes nothing, and its result carries
the warning that no LD filter was applied, whose words say where to set
one (below, "The warnings"). On `panel.nei` the PCA with the filters of
a new project uses 1,200 variants, and with its own LD filter at r² 0.1
within 50,000 base pairs 548 (below, "How it is verified").

**The panel opens on the 3D view**, `view` `"3d"`, as the owner decided
on 28 September 2026; the 2D plot is one button away, and is drawn in
its place, with the words that say why, when the browser has no WebGL 2
or three.js cannot be downloaded (below, "The panel"). The option not
taken, which had been recommended, was to open on the 2D plot, which
needs no WebGL and no download, and is what the export and the report
carry. What it costs: three.js, 134 KB gzipped, is downloaded when the
first result of a PCA is drawn, and not only when the user asks for 3D.

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

`parseOptions(o, 1)` gives back an object with exactly the seven fields:
`method` `"pca"` or `"pcoa"`; `missingData` an object of exactly
`follow`, `true` or `false`, and `maxAllowedMissingRate`, a number from
0 to 1; `maf` an object of exactly `follow` and `maxAllowedMaf`, a
number from 0 to 1; `ld` an object of exactly `follow`, `maxAllowedR2`,
a number from 0 to 1, and `maxDist`, a whole number from 1 to
9,007,199,254,740,991, the ranges popnei's `filterByMissingData`,
`filterByMaf` and `filterByLd` accept, or `null`, a distance not typed
yet, which a project saved while the PCA was locked for it holds, or
saved while the filter followed the step before a distance was ever
typed; `colourBy` a text or `null`, not checked against the table, which
a later file may change; `axes` three different whole numbers from 1 to
10, `PCA_NUM_COMPS_KEPT`; and `view` `"3d"` or `"2d"`. The ranges are
those of the fields of the panel, which take fewer numbers still (below,
"What it shows"), so that no option the panel sends is refused here,
which would be a defect of `setAnalysisOptions`
(`docs/specs/core/project.md`). Anything else is refused with the words
that follow "should be" in `projectErrorText`: "the method, "pca" or
"pcoa"; the missing data filter of the PCA, whether it follows the
Variants step, true or false, and its maximum proportion of missing
genotypes, a number from 0 to 1; its MAF filter, whether it follows the
Variants step, true or false, and its maximum major allele frequency, a
number from 0 to 1; its LD filter, whether it follows the Variants
step, true or false, its maximum r², a number from 0 to 1, and its
window, a whole number of base pairs from 1 to 9,007,199,254,740,991 or
null; the column that colours the points, a text or null; three
different components from 1 to 10 for the axes; and the view, "3d" or
"2d"; and nothing else". No option is of Lingoes' correction, which the
PCoA always asks for (above, "What it does"), so a field
`correctByLingoes` is a field more and is refused, and so are the
fields of the options before 28 September 2026, `maxAllowedMaf` and
`ldPruning`, which no project file holds, since the PCA is not built
yet. Every later version of the format reads version 1 so
(`docs/architecture.md`, section 12).

### What goes into its key

`filtersRead`, the part of the definition of an analysis that says
which of the two lists of the project's filters its key holds, and so
which of them the store locks it for (`docs/specs/core/store.md`, "The
definition of an analysis"), is `{ variants: false, individuals: true }`. The filters of
the individuals change the individuals the components are made of, and
`keyOf` of `docs/specs/core/keys.md` puts them in the key, with the id
`pca`, the key version, the version of popnei and the load. The filters
of the variants enter the key through `keyInputs`, as `pcaFilters` gives
them, the list the job carries, and not as the project's list through
`keyOf`: a filter of the Variants step that the PCA replaces with its
own is not an input of the result, and in the key its change would take
the plot off the screen for a change that changes no number. So the
store does not ask `variantFilterNeeds` of the PCA, which it asks of an
analysis whose `filtersRead.variants` is true
(`docs/specs/core/store.md`, "The definition of an analysis"), and the
PCA's `needs` gives that reason when its LD filter follows the dataset's
(below, "Why it cannot run").

`keyInputs(p)` gives the rest:

```ts
{
  method: "pca" | "pcoa",
  filters: pcaFilters(p.filters, pcaOptions(p)),  // an LD filter with no distance included
}
```

the method, and the filters popnei is given, with those of the PCA's own
in the place of the dataset's, as they reach popnei. An LD filter with
no distance, the dataset's or the PCA's own, is in the list with
`maxDist` `null`, so the key tells it from no LD filter, whether or not
a key is ever asked for while the PCA is locked, since `keyInputs`
answers for any project (`docs/specs/core/keys.md`). The flags `follow`
are not in the key, and neither are the values a filter of the PCA's
own keeps while it follows the Variants step: the list says which
filter the job has, and a value not used is not an input of the result.
So a change of the Variants step's filter of a kind the PCA has of its
own, of the values the PCA keeps while it follows, or setting for the
PCA the value the dataset's filter already has, keeps the key, and
takes nothing off the screen.

Not in the key:

- **`colourBy`, `axes` and `view`**, which draw the result and are not
  inputs of it. In the key, a change of the colours would take the plot
  off the screen and ask minutes of calculation for the same numbers.
- **The values of a filter of the PCA's own while it follows the
  Variants step**, for the same reason: the result is calculated with
  the dataset's filter, and the values wait for the user to set the
  filter for the PCA again.
- **The filters of the Variants step that the PCA replaces**, above.
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
| a filter of the Variants step of a kind the PCA follows, turned on or off, or its threshold, a distance typed included | changes |
| the observed heterozygosity filter of the Variants step | changes |
| a filter of individuals, a list or a threshold, whether or not it keeps other individuals | changes |
| `method` | changes |
| a filter of the PCA's own set, or set back to as in the Variants step, when the filters of the job differ; its value, or its r² or distance, while it is set | changes |
| a filter of the Variants step of a kind the PCA has of its own; the values of `missingData`, `maf` or `ld` while it follows; a filter of the PCA's own set to the value the dataset's already has | same |
| `colourBy`, `axes`, `view` | same |
| the individuals file, its types, the grouping | same |
| the options of another analysis, the reference | same |
| the key version, the version of popnei | changes |

### Why it cannot run

The store asks `projectNeeds`, and, since the PCA reads the filters of
individuals, `individualListNeeds` of `docs/specs/core/project.md` first,
and the two locks of the individuals kept, which read the cache
(`docs/specs/core/store.md`, "The state of an analysis"): the filters
keeping no individual, and the analysis's own `keptNeeds`, which for
the PCoA is its limit of 9,381 individuals (below, "The limit on the
individuals"). Then `needs(p)` gives the first of these, the step's LD
filter first, at the place where the store asks `variantFilterNeeds` of
the diversity, after the lists of individuals and before the other
reasons, so that one project gives the two analyses the same reason
(`docs/specs/core/store.md`, "The definition of an analysis"):

| the project | the reason |
|---|---|
| the PCA's LD filter following the Variants step, `follow` true, and the step's LD filter on with no distance: the reason of `variantFilterNeeds` | "The LD pruning of the Variants step needs the distance within which variants are compared. It has no default, because it depends on how far linkage disequilibrium extends in the genome of your species. Type a distance in base pairs, or turn off the LD pruning, in the Variants step." |
| the PCA, and more than 9,381 individuals in the variants file, `PCA_MAX_INDIVIDUALS` | "panel.nei has 12,000 individuals, and the principal components of more than 9,381 need more memory than a browser tab can hold. Calculate them with popnei in Python, outside the browser." |
| any reason of `individualsNeeds` of `project.md`: the metadata file being read, "Reading pops.csv."; its read refused or failed; a file named by an opened project and not read when the project was saved, `notGiven`, "pops.csv was not read when this project was saved, so the project file does not hold it. Load pops.csv again in the Individuals step."; individuals of the variants missing from it, "12 individuals of panel.nei are not in pops.csv: ind_031, ind_044 and 10 more. Add them to the file and load it again in the Individuals step." | its words |
| the PCA's own LD filter, `follow` false, with no distance, `maxDist` `null`, `pruningDistanceReason` | "The LD pruning of the PCA needs the distance within which variants are compared. It has no default, because it depends on how far linkage disequilibrium extends in the genome of your species. Type a distance in base pairs, or set the LD pruning of the PCA back to as in the Variants step.", and "the PCoA" in both places under the PCoA, as the choice "For the PCoA alone" follows the method (stop C 5); "the LD pruning", as the Variants step names its filter since stop A 1 of `docs/specs/stage-4-open-points.md`. Until 29 September 2026 it said "The LD filter of the PCA" under both methods. The status region says the same words when choosing "For the PCA alone", or "For the PCoA alone", makes them appear |

**The LD filter with no distance.** The distance of an LD filter has no
default, as the owner decided for the PCA on 27 September 2026 and for
the Variants step on 28 September 2026 (above, "Its options"). So the
PCA whose own LD filter has no distance is locked until the user types
one in the panel, or sets the filter back to as in the Variants step.
The reason is last in the table; the panel shows it beside the field of
the distance whenever it holds, and not only when it is the first
reason, so that the empty field always says why it has to be filled
(below, "What it shows"). While the LD filter follows the Variants
step, a distance still `null` that it keeps locks nothing, since it is
not used.

The LD filter of the Variants step with no distance locks the PCA
while the PCA's LD filter follows it, with the reason of
`variantFilterNeeds` and its words, which send the user to the Variants
step, as it locks every analysis that reads that filter. While the PCA
has an LD filter of its own, the step's is not among the filters the
PCA reads, and does not lock it: the PCA runs with its own. The store
does not ask `variantFilterNeeds` of the PCA, whose
`filtersRead.variants` is false (above, "What goes into its key"), so
`needs` asks it, only while the LD filter follows the step. The option
not taken, the PCA locked by the step's filter whatever its own, as
every analysis whose `filtersRead.variants` is true is, would keep a
user who set the PCA's own LD filter from running it until they typed a
distance they had chosen not to use. The words say why there is no
default and what to do; the help says how to choose the distance.

**The limit on the individuals.** popnei refuses a PCA of more than
9,381 individuals, since the individuals × individuals matrix, its
eigenvectors and the workspace of the decomposition take about 6.1 × 8
bytes per pair, more than the 4 GB wasm addresses at 9,382
(`room_for_the_square_of` of `crates/popnei-js/src/pca.rs` of popnei;
`docs/architecture.md`, section 11). It refuses before the pass, in 1 ms,
and it counts the individuals of the file and not those the list of
individuals keeps: in node, a VCF of 9,382 individuals with
`filterIndividuals` of 100 of them was refused with the same message,
"the principal components of 9382 individuals hold about 5 GB, …", with
`js-v0.1.0-dev.2` on 27 September 2026 and again with `js-v0.1.0-dev.3`
on 28 September 2026. So the lock of the PCA counts the individuals of
the file, and its words do not offer the filters of individuals, which
would not help. popnei is still asked to count the individuals of the
PCA's pass (below, "What this spec asks of popnei").

The PCoA takes the same limit, 9,381, and counts the individuals of its
pass, after `filterIndividuals`: the same VCF of 9,382 individuals with
a list of 100 gave a PCoA of 100 individuals, and without the list was
refused before the pass, "the principal coordinates of 9382 individuals
hold about 5 GB, …" (node, `js-v0.1.0-dev.3`, 28 September 2026;
`room_for_the_principal_coordinates_of` of `crates/popnei-js/src/pca.rs`).
popnei measured the peak of the PCoA at 44.4 bytes a cell of the
individuals × individuals matrix, and counts the PCA's 48.8, since the
edge is set by one allocation that does not fit and not by the memory
the analysis holds (below, "How it runs", which says what it was
measured on). So the lock of the PCoA counts the individuals the
filters of individuals keep, and its words offer those filters.

That count is the list of the individuals kept, `individualsKept` of
`docs/specs/core/individualsKept.md`, which is known from the project
alone when the filters are lists, the individuals the lists keep,
`byLists`, and every individual of the file with no filter; and, with a
threshold, only once the statistics of each individual the threshold
needs are in the cache. So the lock is the PCoA's `keptNeeds`, which the
store asks only when the list is known and keeps some individual, and
not a row of `needs`, which sees the project and not the cache; it is written as the diversity's `keptNeeds`
is, and the store asks it in the same place (`docs/specs/core/store.md`,
"The state of an analysis"). `keptNeeds(p, kept)` gives, for the PCoA,
when the known list, or every individual of the file when the list is
`null` because the filters remove none, holds more than 9,381:

- "panel.nei has 12,000 individuals, and the principal coordinates of
  more than 9,381 need more memory than a browser tab can hold. Keep at
  most 9,381 with the filters of individuals in the Variants step, or
  calculate them with popnei in Python, outside the browser.", when the
  filters remove none;
- "panel.nei has 12,000 individuals and the filters of individuals keep
  10,000 of them, and the principal coordinates of more than 9,381 need
  …", the rest the same, when they remove some;

and `null` for the PCA, whose limit is a row of `needs` above, and for a
PCoA of 9,381 or fewer.

While a threshold waits for its statistics, the list is not known, and
the PCoA is not locked by its limit, even when `byLists` keeps more than
9,381: the threshold may remove enough. A Run then calculates the
statistics first, as the diversity's does (`docs/specs/core/store.md`,
"A Run that waits for the statistics"), and once they are in the cache
the lock applies to the list: when it keeps more than 9,381, the Run
ends with nothing sent, the panel is locked with the words above, and
the shell announces "Principal components were not run. " and the same
words, as it does for the diversity (`docs/specs/shell.md`, the
announcements, "Diversity was not run"). So the number the
words give as kept is always that of a known list, and the request of a
PCoA always carries 9,381 individuals or fewer: popnei's refusal of
more is never reached, and "Its words" has no row for it. The user
reads the application's words, and never popnei's message.

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
  filters: jobFilters(pcaFilters(p.filters, pcaOptions(p))), // every LD filter with its distance
  individuals: c.individuals,   // the individuals kept; null when the filters remove nobody
  method: "pca",                // or "pcoa"
  numCompsKept: 10,             // PCA_NUM_COMPS_KEPT
}
```

What the runner does with it (`docs/specs/worker/runner.md`, "The
principal components"): it puts the list of the individuals kept on
the open `Variants` first and the filters of the job after it, in their
order, as for any job since the filters of individuals act first; for
the PCA it calls `doPcaFromVariants(variants, { numPrinComps: 0,
transformToBiallelic: true })`, and for the PCoA `doPcoaFromVariants(
variants, { correctByLingoes: true })`; and it keeps the first
`numCompsKept` components of what popnei gives.

- **`numPrinComps: 0`** asks popnei for no weights of the variants, which
  makes one pass over the file instead of two:
  `numPassesOf("doPcaFromVariants", { numPrinComps: 0 })` is 1 and
  without it 2, in node with `js-v0.1.0-dev.2` on 27 September 2026 and
  with `js-v0.1.0-dev.3` on 28 September 2026. The screen
  shows no weights, the writers' decision of 27 September 2026.
- **`transformToBiallelic: true`** counts every allele that is not the
  major one the same, which gives a variant of more than two alleles a
  dosage; popnei refuses such a variant otherwise, and a user could not
  mend the file in the application. popnei does not say how many such
  variants there were, so no warning counts them, and the help says it,
  as was recommended and the owner decided on 28 September 2026
  ("Variants of more than two alleles" in
  `docs/specs/stage-4-open-points.md`). The Kosman
  distance takes any number of alleles.
- **`correctByLingoes: true`** corrects the Kosman distances when no
  space holds them, as the owner decided (above, "What it does"), and
  changes nothing when a space does: the constant is then 0 and the
  result that of the distances as they are. It is written out because
  popnei's default is false, and the distances would then be refused.
  `minNumSnps` is left to popnei's default, 0, so a pair needs one
  variant called in both individuals to have a distance.
- **These keys and no other.** From `js-v0.1.0-dev.3` every options
  object of popnei refuses a key it does not know, where
  `js-v0.1.0-dev.2` ignored it: `{ correctByLingoes: true, numCompsKept:
  10 }` is refused with "popnei: `numCompsKept` is not an option of
  `doPcoaFromVariants`, whose options are `minNumSnps` and
  `correctByLingoes`", and so is a key of the job given to
  `doPcaFromVariants` (node, 28 September 2026). So the runner builds
  each options object from these keys alone, and never spreads the job
  into one.
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
popnei's `VariantsPcoaResult` adds to the fields a plot draws, which it
names and shapes as `doPcaFromVariants` does: c, the most negative
eigenvalue of the distances in absolute value, in the units of a squared
distance, which the correction adds twice to every squared distance; and
the share of the variance of the distances that lay in the negative
eigenvalues before the correction, in percent, 7.87 on `panel.nei` with
the LD filter of the flow, and 2.98 with the filters of a new project. Both are 0 when the distances needed no
correction. The percentages of the components are of the distances as
corrected, and add up to 100 over every component; a correction leaves at
most the individuals less two components, 198 on `panel.nei`, of 200
individuals.

popnei refuses the call, with a plain `Error`, in the cases its
`@throws` lists; the module rules out those it can see (the limit on the
individuals, above; the options, by `parseOptions`), and these reach the
user as the panel's error words (below, "Its words"):

- **No variant left**: "there are no variants to do a PCA with", with no
  counts, whether the file holds none or the filters kept none, seen in
  node with `js-v0.1.0-dev.2` on 27 September 2026 and with
  `js-v0.1.0-dev.3` on 28 September 2026, for a VCF of a header
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
  with no LD filter gives a result. The PCA meets it whenever the user
  gives it an LD filter of its own, as well as with the dataset's.
- **A VCF of another ploidy, a line of a VCF popnei cannot read**, as for
  every analysis.
- **The PCoA**, in these messages of `js-v0.1.0-dev.3`, seen in node on
  28 September 2026:
  - a pair of individuals with no variant called in both has no Kosman
    distance, and the PCoA is refused, "4 of the 10 pairs of
    individuals have no distance, the first of them `a` and `e`, and `e`
    is in 4 of them; those pairs were called together at no variant;
    take that individual out with `filterIndividuals`, or run the PCA
    of the variants, which gives every individual a projection", and
    with one pair "1 of the 6 pairs of individuals has no distance, …";
  - every distance 0, "every distance is 0, so the individuals are all
    at one point and there is nothing to do a PCoA with";
  - one individual, before the pass, "there is 1 individual, and a
    principal coordinate analysis places 2 at least by the distance of
    each pair";
  - more than 9,381 individuals of the pass, before it, "the principal
    coordinates of 9382 individuals hold about 5 GB, …", which the lock
    of `keptNeeds` prevents, a threshold on the individuals included,
    since a request is sent only with a known list (above, "Why it
    cannot run");
  - a pass that keeps no variant, in the words of popnei's other
    calculations, "the pass gave no variant and its source holds none:
    …" or "the pass gave no variant: its source gave 1200 and the steps
    kept none of them, the `missing_data` filter was given 1200 and kept
    1152, the `maf` filter was given 1152 and kept 0; …", since the
    PCoA's pass is that of the Kosman distances;
  - a file not sorted by position under an LD pruning, in the PCA's
    message above.

  A matrix that no space holds is not refused, since the application
  asks for the correction.

### The warnings

`warnings(r, p)` gives them from the result and the project of the
request, in this order; each has its code, which the tests assert, and
its text.

| code | when | the text |
|---|---|---|
| `pruningOff` | the job had no LD filter: the PCA's LD filter follows the Variants step and the step has none on | "No LD filter was applied, neither in the Variants step nor for the PCA, so a region of the genome counts once for each of its variants, and a region of many variants in linkage disequilibrium, such as an inversion, can make a component of its own that separates the individuals by that region rather than by their ancestry. Set an LD filter for the PCA in its options above, or for every analysis in the Variants step, unless such regions are what you are looking for." For the PCoA, "…nor for the PCoA, …" and "…for the PCoA in its options above, …" |
| `fewVariants` | fewer variants used than individuals: `numVarsUsed` for the PCA, `passStats.numVars` for the PCoA, below `individuals.length` | "The PCA used 150 variants that vary among its 200 individuals, fewer variants than individuals, so each component rests on few variants and can show chance differences as structure. If the dataset has more, loosen the filters of the PCA in its options above, or those of the Variants step that it follows." For the PCoA: "The PCoA used 150 variants for its 200 individuals, …" |
| `lingoesCorrection` | the PCoA, `lingoesConstant` above 0 | "The Kosman distances between these individuals cannot all be drawn in one space: 7.87% of their variance lies in directions that no space has. So they were corrected, by Lingoes' method, which adds the same amount, here 0.047, to the square of the distance between every two individuals, 53% of the mean of those squares. This moves the closest individuals apart the most: two individuals of the same genotypes are drawn 0.22 apart, and groups look looser than their distances make them. The percentages of the components are of the corrected distances. Compare with the PCA of the genotypes, which needs no correction." With the filters of a new project, no LD filter: "…2.98% of their variance…, here 0.028, …, 30% of the mean of those squares. … drawn 0.17 apart, …" |

The warning of functionality section 5, that linked regions can dominate
the components, is `pruningOff`. Its condition is the filters of the
job and not the options, so that it is given whether the LD filter came
from the Variants step or from the PCA's own, and not given when either
prunes. Since 28 September 2026 it is given by default: a new project
has no LD filter in the Variants step, and the PCA follows it (above,
"Its options"). So its words say where an LD filter is set, the options
above the plot or the Variants step, for a user who has not met them.

`fewVariants` at fewer variants than individuals is the writers': below it the matrix of the individuals has no more
components with variance than variants, and each component is estimated
from few. On `panel.nei` the PCA uses 1,200 variants for 200
individuals with the filters of a new project, and 548 with an LD filter
at r² 0.1 within 50,000 base pairs, and no warning.

`lingoesCorrection` is given for every PCoA whose distances were
corrected, as the owner asked that users be warned of it, whatever the
size of the correction; no threshold is set, since popnei leaves the
values to warn at to the application, "Which values a user should be
warned at is the application's to decide" (the doc comment of
`correctDistsByLingoes`), and the words say how large the correction
was, for the user to judge. The three numbers of its words, on
`panel.nei` with the filters of the flow, the missing data filter at 0.1
of a new project and the PCA's own LD filter at r² 0.1 within 50,000
base pairs:

- **The share of the variance that lay in directions no space has**,
  `negativeEigenvaluesPercent`, to two decimals as the other
  percentages, "7.87%".
- **The amount added to every squared distance**, 2c, twice
  `lingoesConstant`, to two significant digits, "0.047", and **how large
  it is beside the distances**, 2c over the mean of d² over the pairs of
  individuals, d their Kosman distance, in whole percent, "53%". The
  correction moves the nearest pairs the most: on `panel.nei` so
  filtered, 2c is 53 in 100 of the mean of d², and the nearest pair goes
  from 0.132 to 0.254 while the farthest goes from 0.354 to 0.416; with
  no LD filter, 30 in 100, from 0.137 to 0.217 and from 0.358 to 0.396
  (`correctDistsByLingoes` of `calcPairwiseKosmanDists`, node,
  `js-v0.1.0-dev.3`, 28 September 2026). The result does not hold the mean of d²,
  which the module works out from popnei's numbers by additions,
  multiplications and divisions: the variance along PC1 is the sum of the
  squares of its projections, λ1; the variance of the corrected
  distances is 100 λ1 over the percentage of PC1; the correction raised
  n − 1 eigenvalues by c, n the individuals of the result, so the
  variance before it is that less c(n − 1); and the mean of d² over the
  n(n − 1)/2 pairs is twice that over n − 1. On popnei's PCoA of
  `panel.nei` so filtered this gives 0.08929029017900945, where the mean
  of the squares of the 19,900 distances of `calcPairwiseKosmanDists`
  with the same filters is 0.08929029017900912, and a share of
  0.530282136041799; with no LD filter, 0.09474197155846419 against
  0.09474197155846473, and 0.2993878687291262.
- **How far apart it draws two individuals of the same genotypes**, the
  square root of 2c, to two decimals, "0.22", and "0.17" with no LD
  filter: the correction puts two such individuals at that distance
  (popnei's `docs/specs/pca.md`, "How it runs" of the principal
  coordinates).

The example of the table is `e2e/fixtures/panel.nei` with the filters of
the flow, and its numbers are those of "How it is verified", below. The
LD filter, which keeps 548 of the 1,200 variants, raises the correction
there from 30% to 53% of the mean squared distance.

Two things that could have been warnings of the module are not:

- **More than 9,381 individuals** is a lock, above, and not a warning
  after the Run, since popnei refuses it before any pass: before the Run,
  or, with a threshold whose statistics are not in the cache, once a Run
  has calculated them, and then nothing is sent.
- **Individuals with many missing genotypes**, which the PCA draws toward
  the centre, since a missing genotype takes the mean dosage: an
  individual missing everywhere is drawn at 0 on every component, seen in
  node on a VCF of three individuals whose third had no genotype. A
  warning is made from the result and the project alone, and neither
  holds how many genotypes each individual lacks: popnei's
  `doPcaFromVariants` does not give it, and a warning cannot run a
  calculation. The statistics of each individual, `individualChecks`,
  count it, over every variant of the file, in one pass for each load of
  it, as the owner decided on 28 September 2026 (`docs/architecture.md`,
  section 2). So the panel shows a note made from them when they are in
  the cache, and nothing when they are not (below, "The note of the
  missing genotypes"; **Open 2**, decided by the owner). popnei is asked
  for the called genotypes of each individual with the PCA, which would
  make it a warning.

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
on `panel.nei`, with the MAF filter at 0.95 and pruned at r² 0.1 within 50,000 base pairs, the PCA's filters of that day, in one process, one of them after a diversity, gave
the same percentages and projections to the last bit (node,
`js-v0.1.0-dev.2`, 27 September 2026), and `js-v0.1.0-dev.3` gave the
same numbers the next day; two runs of the PCoA with the same filters,
in one process, gave the same percentages, constant and projections to
the last bit (node, `js-v0.1.0-dev.3`, 28 September 2026), and the
runner's test runs it twice. A new release of popnei may give other last
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
filters of a new project and the PCA's own LD filter at r² 0.1 within
50,000 base pairs:

```python
# The principal components of the individuals, a PCA of the genotypes,
# over the filters of the Variants step, with the PCA's own LD filter
# in the place of the step's, on a Variants of its own
pca_variants = popnei.open_vars("panel.nei")
pca_variants.filter_by_missing_data(0.1)
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
before the filters of the variants, so that they count over the
individuals kept, as in the application (`docs/architecture.md`,
section 2). The comment names the filters of the PCA's own the project
has, "with the PCA's own missing data and LD filters in the place of
the step's", and says "over the filters of the Variants step" alone
when the PCA follows every one. The PCoA calls `pcoa = popnei.do_pcoa_from_variants(
pca_variants, correct_by_lingoes=True)` in the place of
`do_pca_from_variants`, and prints `pcoa.lingoes_constant` and
`pcoa.negative_eigenvalues_percent` as well, the names of
`python/popnei/pca.py` at the tag `js-v0.1.0-dev.3`. The argument is written out because in Python it is false
by default, the owner's word that there the user decides, and popnei
then refuses distances no space holds, with a message that names it. popnei names the components `PC0`, `PC1`, … in Python, with
zeros on the left, `PC000` for 199, where the application writes PC1 to
PC10, as a user reads them; the help says so.

The lines of the PCA as it was then, with the missing data filter at
0.05, the MAF filter at 0.95 and the pruning at r² 0.1 within 50,000
base pairs, were run with popnei's Python package, built natively from popnei's
`main` at `2d2229c`, on 27 September 2026: PC1 to PC3 explained
3.5791902392779886, 3.459168102873343 and 1.9063456362555027, where the
wasm of `js-v0.1.0-dev.2` gives 3.5791902392779953, 3.4591681028733494 and
1.9063456362555034, the same to 13 significant digits. The native build
decomposes with another library than the wasm, so the script gives the
application's numbers to about 1e-14 and not to the last digit, and the
comparison of the check numbers is between runs of the application
alone. The warnings as comments come in stage 6 with `script.ts`.
`script` is asked only for an analysis that has run, as the diversity's
is, so a PCA locked by an LD filter with no distance writes no line,
and asking for its lines is a defect.

### The TypeScript interface

The request and the result are members of `Job` and `JobResult` of
`src/worker/protocol.ts`, written as the other jobs are, with every
field `readonly` and every array `readonly T[]`
(`docs/specs/worker/protocol.md`):

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
// filtersRead { variants: false, individuals: true }, the filters of the
// variants in keyInputs (above, "What goes into its key"); defaults PCA_DEFAULTS;
// keptNeeds, the PCoA's limit on the known list (above, "Why it cannot run")

/** The options of the PCA. Each of its three filters follows the Variants
    step while `follow` is true, and keeps its values meanwhile, for when
    the user sets it for the PCA again. */
export interface PcaOptions {
  readonly method: "pca" | "pcoa";
  readonly missingData: { readonly follow: boolean; readonly maxAllowedMissingRate: number };
  readonly maf: { readonly follow: boolean; readonly maxAllowedMaf: number };
  readonly ld: {
    readonly follow: boolean;
    readonly maxAllowedR2: number;
    readonly maxDist: number | null;    // null until the user types a distance
  };
  readonly colourBy: string | null;
  readonly axes: readonly [number, number, number];
  readonly view: "3d" | "2d";
}
export const PCA_DEFAULTS: PcaOptions;             // frozen, the table of "Its options"
export const PCA_NUM_COMPS_KEPT = 10;
/** popnei's limit, the same for both methods: the individuals of the file
    for the PCA, those of the known list of the individuals kept for the
    PCoA (above, "Why it cannot run"). */
export const PCA_MAX_INDIVIDUALS = 9381;
/** The reason of the lock of the PCA's own LD filter, set with no
    distance, or null; needs gives it, and the panel shows it beside the
    field of the distance (above, "Why it cannot run"). */
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

/** The filters of the job: the project's filters on, with the PCA's own
    of each kind in the place of the dataset's (above, "Which variants it
    reads"). The same frozen value for the same inputs. */
export function pcaFilters(
  filters: readonly ProjectVariantFilter[], o: PcaOptions,
): readonly ProjectVariantFilter[];   // run gives the job jobFilters of it

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
      readonly cellTexts: readonly (string | null)[] | null;
        // of each individual of the result, its value, or its population, when the colouring
        // asked has more than MAX_COLOUR_GROUPS groups and is drawn as one; null for none; else null
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
each individual's value.", and the option is not changed. The table of
the individuals and its CSV then give, as the note says, each
individual's value in that column, or its population, and "No value"
or "No population" for an individual with none, from `cellTexts`,
while the plots, the legend and the tooltip show the one group, as the
owner decided on 29 September 2026 (stop C 9 of
`docs/specs/stage-4-open-points.md`); until then the table showed "All
individuals" in every row. The plots give group `i` colour `i % 7` and shape `(i + ⌊i / 7⌋) %
7`, 49 different marks (`.claude/skills/coding/charts.md`, "Not colour
alone"); past 49 groups the marks repeat, and the legend and the table,
which name each individual's group, still tell them apart, so the panel
adds the line "The 60 values of collection are drawn with 49 marks, which
repeat; the legend and the table tell them apart."

### The note of the missing genotypes

For the PCA, not the PCoA, `manyMissingNote` names the individuals of the
result whose proportion of missing genotypes is above `MANY_MISSING_RATE`,
0.2, in the statistics of each individual that the store holds for the
load of the variants file (`docs/specs/analyses/individualChecks.md`):

"s012 and s044 lack more than 20% of their genotypes over the variants
of panel.nei. The PCA gives a missing genotype
the mean of its variant, which draws an individual toward the centre of
the plot about as much as it lacks. The PCoA of the Kosman distances
compares each pair over the variants both have called, and does not."

With more than three, the first two and how many more, as `project.md`
lists individuals. 0.2 is decided here: the projection of an individual
shrinks toward the centre roughly in proportion to its missing share, so
at 0.2 it is drawn about a fifth of the way in, which moves a point off
its cluster on the plot. The statistics count over every variant of the
file, and not over the variants the PCA reads, which the words say. The
note is not a warning: it is not kept with the result nor in the report,
and it comes and goes with the statistics in the cache, as the owner
decided on 28 September 2026 (**Open 2**, below).

### The cases

- **Two individuals.** One component has variance, PC1, 100%, with `s000`
  at 18.841443681416774 and `s001` its opposite, from 355 variants used
  of the 613 the pass kept, in node with the list of the two put first
  and the MAF filter at 0.95 after it, which then counts over those two
  and keeps 613 of the 1,200 (node, `js-v0.1.0-dev.3`, 28 September
  2026; `docs/specs/worker/runner.md`, "How it is verified"). There is no plot: the panel shows the table and the line
  "Only one component has variance, since 2 individuals have one axis
  between them, so there is no plot; the table gives each individual's
  place on it." Three individuals give two components, a 2D plot and no
  3D. The PCoA of the same two gives one component, 100%, `s000` at
  0.1597938144329897, and a constant of 0, since two points are always
  at their distance in a line, so no warning (node, `js-v0.1.0-dev.3`,
  28 September 2026).
- **The filters keep no variant, or the file holds none.** popnei refuses
  the PCA with "there are no variants to do a PCA with", and the PCoA
  with the words of its other calculations, which tell the two apart; the
  store keeps the refusal under the key (`docs/specs/core/store.md`, "A
  calculation that failed").
- **No variant varies among the individuals kept**, as with one
  individual: refused, above.
- **More than 9,381 individuals** in the variants file for the PCA, or
  in the known list of the individuals kept for the PCoA: locked, above.
  A threshold on the individuals whose statistics are not in the cache
  leaves the PCoA ready; its Run calculates them, and ends locked, with
  nothing sent, when the list keeps more than 9,381.
- **Kosman distances that no space holds**, the common case: corrected,
  with the warning `lingoesCorrection`. Distances that a space holds, as
  popnei's `four_alleles.vcf.gz` of 40 individuals gives, with 39
  components and a constant of 0 (node, `js-v0.1.0-dev.3`, 28 September
  2026), are not changed, and there is no warning; the line under the
  explained variance says they needed no correction.
- **Two individuals with no variant called in both**, for the PCoA:
  refused, with the words that name the individual in most such pairs;
  the PCA places them.
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
  and PC3 are drawn." The option stays. Each axis beyond the result takes
  the first component that the other axes chosen do not show, so `[1, 5,
  2]` on three components draws PC1, PC3 and PC2, with the note "The axis
  chosen, PC5, is beyond the 3 components of this result, so PC1, PC3
  and PC2 are drawn."; written here on 29 September 2026, as the owner
  decided that day, the spec taking the code.
- **The LD filter of the Variants step turned off while the PCA follows
  it.** The PCA that ran with that filter leaves the screen with the
  notice, as for any change of the filters it reads, and is ready: a Run
  gives a PCA with no LD filter and the warning `pruningOff`; an undo
  brings the plot back.
- **A filter of the Variants step changed, of a kind the PCA has of its
  own.** The key of the PCA does not change (above, "What goes into its
  key"): its plot stays, and the notice of the change does not name it.
- **A filter of the PCA's own set, or set back to as in the Variants
  step, with the value the dataset's has**, the missing data at 0.1 of
  the PCA's own over the step's 0.1: the filters of the job are the
  same, and so is the key, so the plot stays, though the command is a
  step of Undo.
- **An LD filter over a file not sorted by position**, the dataset's or
  the PCA's own, is refused, above, and the words say to sort the file,
  or to turn the filter off where it was set.
- **The dataset's filters of individuals leave the PCA fewer than two
  individuals.** One is refused by popnei, above; none cannot start, as
  for every analysis (`docs/architecture.md`, section 4).

### How it runs

One pass over the file in the calculation worker, for either method,
`numPassesOf` 1, `numPassesOf("doPcoaFromVariants")` among them (node,
`js-v0.1.0-dev.3`, 28 September 2026), then the decomposition, which
gives no progress in that release either. popnei
calls `onProgress` at each range of 4 MiB it reads and once at the end of
the run, and the end comes after the decomposition: over a VCF of
20,066,850 bytes, 2,500 individuals and 2,000 variants, the last range
was told at 0.04 s and the end at 6.75 s (node 26.8.2, `js-v0.1.0-dev.2`, on the
owner's Mac, an Apple M5 Pro, 27 September 2026). So the bar of the
panel stops at the share of the last range and stays there while the
components are calculated, which the running state says in words (below).

The decomposition grows as the cube of the individuals, and its memory
as their square. Measured the same day in node, with `js-v0.1.0-dev.2`, on
VCFs of 300 variants: 1,000 individuals in 0.45 s, the memory of the
process grown by 69 MB; 2,000 in 3.0 s and 196 MB; 4,000 in 21 s and 662
MB, against popnei's estimate of 6.1 × 8 bytes per pair of individuals,
49, 195 and 781 MB. At 9,381 individuals the cube gives about four
minutes and the estimate 4.3 GB. These are node's times; those of the
browsers follow.
Here a pair is a cell of the individuals × individuals matrix, n² of
them. The PCoA asks for the matrix it decomposes, 8 bytes a cell,
before the pass, and holds beside it, while the pass runs, the sums of
the Kosman distances, two counts of 4 bytes for each pair, 4 bytes a
cell: about 12 bytes a cell during the pass, 1.1 GB at 9,381
individuals. It drops the sums before the decomposition
(`pcoa_of_variants` of `crates/popnei/src/pca/pcoa.rs` of popnei, the
PCoA of the variants in its Rust core, at the tag). Its peak was
measured by popnei under node 26.8.2 on the owner's Apple M5 Pro on 27
September 2026, by popnei's `js/popnei/bench/memory_of_pcoa.mjs`, on
VCFs of diploid individuals and 300 variants with 2 in 100 genotypes
missing, with the correction: the memory of wasm grew by 45.6 bytes a
cell at 3,000 individuals and 44.4 at 8,695 to 9,413, less than the
PCA's count, since it writes the projections once
the workspace of the decomposition is given back; popnei counts the
PCA's 48.8, since 9,414 individuals failed on one allocation that did
not fit and not with the memory full, so the two methods share the
limit of 9,381 (popnei's `docs/specs/pca.md`, "How it runs" of the
principal coordinates, and the doc comment of `doPcoaFromVariants`).
The correction adds nothing to it, since popnei makes it from the
eigenvalues and eigenvectors it already has, with no second
decomposition.

In the browsers the same wasm took less time than in node, and the tab
grew by less than popnei's count. Each PCA and PCoA was run from its
panel in the application, on a new page, on gzipped VCFs of 300
variants of `e2e/bigVcf.ts` with the filters of a new project, by
`IP6 D6` of `e2e/measure.spec.ts`, on 29 September 2026, with
`js-v0.1.0-dev.3`, on the owner's Apple M5 Pro with 64 GB and macOS
27.0, Playwright 1.63.0, load averages of 1.4 to 2.9, since a virtual
machine and the photo analysis of macOS each held a core. The time is
from the run posted to the calculation worker to its result, the pass
over the file and the calculation together: popnei tells a progress at
each range of 4 MiB it reads and at the end of the run, after the
decomposition, so in these files, all under 4 MiB, no progress marks
the end of the pass, and it is not timed apart; the memory is the footprints
of all the processes of the engine summed, as macOS counts them, its
largest during the run less its value before it. Up to 2,000
individuals, the median of 5 runs, whose ranges were within 0.01 s and
18 MB; above, one run each:

| individuals | Chromium 153 PCA | Chromium 153 PCoA | WebKit 26.6 PCA | WebKit 26.6 PCoA |
|---|---|---|---|---|
| 700 | 0.12 s, 29 MB | 0.14 s, 30 MB | 0.10 s, 134 MB | 0.12 s, 138 MB |
| 1,000 | 0.31 s, 49 MB | 0.36 s, 46 MB | 1.21 s, 143 MB | 1.26 s, 145 MB |
| 2,000 | 2.11 s, 175 MB | 2.50 s, 171 MB | 1.25 s, 276 MB | 1.63 s, 261 MB |
| 4,000 | 16.0 s, 613 MB | 18.9 s, 620 MB | 10.2 s, 745 MB | 12.9 s, 724 MB |
| 9,381 | 205 s, 3.03 GB | 240 s, 3.30 GB | 121 s, 3.12 GB | 156 s, 3.40 GB |

So the largest PCA takes three and a half minutes in Chromium and two
in WebKit, and the PCoA a sixth to three tenths more; neither engine
closed the tab, and in a first run the same day the PCoA of 9,381
individuals grew WebKit by 4.10 GB. In Chromium the PCA of 9,381 grew
the tab by 34 bytes a cell, under popnei's count of 48.8. In WebKit a
PCA of 1,000 took 1.21 s, four times Chromium's and as long as one of
2,000, in each of its 5 runs and in a first run of the same day; why is
not known, and a user waits a second for it. The memory of WebKit grew
by about 135 MB for any PCA up to 1,000 individuals, and all but 15
MB of it was given back after a PCA of 700, which does not restart
the worker (below).

The memory of wasm grows to the matrix and never shrinks
(`docs/architecture.md`, section 11), so a worker that made a PCA of
4,000 individuals holds some 700 MB until it is started again. The
client starts the calculation worker again after a PCA or a PCoA of more
than `PCA_RESTART_INDIVIDUALS`, 700 individuals. The number is set by
the memory the calculation leaves behind: at 700 individuals a PCA
holds about 24 MB, 700 × 700 × 48.8 bytes, and a PCoA the same by
popnei's count, about the 25 MB above which a written file restarts the
worker too
(`WRITE_RESTART_BYTES`, `docs/specs/worker/client.md`), so the two
restarts come at the same memory left behind. Measured on 29 September
2026 (above), a PCA or a PCoA of 700 individuals left the engine 11 to
15 MB larger in Chromium, and 15 to 18 MB in WebKit, 3 s after its
result, the medians of 5 runs; every run of 1,000 individuals or more
started the worker again, and 3 s later the engine was no larger than
before the Run. So the bound stays at 700. In stage 4
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
calculation" hold as they do for the diversity. The LD filter, the
PCA's own or the dataset's, is applied again at every PCA, as the owner decided on 27 September 2026 ("The pruned
variants are not kept between two PCAs" in
`docs/specs/stage-4-open-points.md`). The pruning takes at least three
fifths of such a PCA. Measured on 29 September 2026 as the table above,
a PCA with the PCA's own LD filter at r² 0.1 and 100,000 bp against one
with no LD filter, 5 runs of each, alternating, the medians:

| file | Chromium 153, with no LD filter / with it | WebKit 26.6, with no LD filter / with it | the pruning at least, Chromium / WebKit | its share of the PCA with it, at least |
|---|---|---|---|---|
| `panel.nei`, 200 individuals, 1,200 variants, 548 kept | 28 / 73 ms | 26 / 72 ms | 45 / 46 ms | 62% / 64% |
| `big.nei`, 1,000 individuals, 20,000 variants, 18,646 kept, 19,161,194 bytes | 1,174 / 3,395 ms | 1,068 / 3,293 ms | 2,220 / 2,225 ms | 65% / 68% |
| `big.vcf`, the same variants, 80,692,954 bytes | 1,285 / 3,514 ms | 1,187 / 3,418 ms | 2,229 / 2,231 ms | 63% / 65% |

The pruning is at least the difference of the two times, a lower
bound, since the PCA with the filter also calculates over fewer
variants, 548 of 1,200 in `panel.nei` and 18,646 of 20,000 in the
files of 20,000 variants; popnei's progress cannot time the pruning
apart, since it is a step of the same pass. Each range was within 19
ms. The files of 20,000 variants are those of `e2e/measure.spec.ts`,
their variants 1,000 bases apart, so the distance compares each with
the 100 before it; their genotypes are simulated with no
linkage between variants, so the pruning kept 93% of them, and on a genome with
linkage it would keep fewer. A second Run of the same PCA would spare
the 2.2 s or more of its pruning if popnei kept the pruned variants, which
point 1 of that file leaves to this measurement.

`pcaColours` walks the table once per result and table, kept in a
`WeakMap` by the result, the table, the grouping and the option, so a
change of the axes or of the view does not walk it again, and gives the
same object, which the highlight of the legend is kept with.

### How it is verified

With Vitest, at the functions of the definition, on frozen projects:

- **`pcaFilters`**, one test for each of the twelve rows of the table
  of "Which variants it reads", in its order, as literals. The first
  three: the filters `[{ kind: "missing_data", maxAllowedMissingRate:
  0.1 }]` and `PCA_DEFAULTS` give `[{ kind: "missing_data",
  maxAllowedMissingRate: 0.1 }]`; with `ld` `{ follow: false, maxAllowedR2: 0.1, maxDist: null }`,
  `[{ kind: "missing_data", maxAllowedMissingRate: 0.1 }, { kind: "ld",
  maxAllowedR2: 0.1, maxDist: null }]`; with `maxDist` 50000, the same
  with 50000. Then the same frozen value twice for the same inputs. The
  two rows of the dataset's LD filter with no distance: `pcaFilters`
  gives it with `maxDist` `null` while the PCA follows it, and the PCA's
  own in its place otherwise.
- **`run`**, with a fake client that records its job: the filters of
  `pcaFilters`, the method, `numCompsKept` 10, and `individuals` as the
  client gives it, `null` and a list.
- **The key**: for each row of its table, two projects that differ in it,
  and `keyOf` equal or not as the row says; `keyInputs` of an empty
  project does not read `p.variants`, which the test makes a getter that
  throws.
- **`needs`**: a variants file of 9,382 individuals locked with the words
  above for the PCA, whatever the lists keep, and of 9,381 not; for the
  PCoA, the same file not locked by `needs`, whatever its filters; each reason of `individualsNeeds` comes through; with `PCA_DEFAULTS`
  and the filters of a new project, no reason; with `ld` `{ follow:
  false, maxAllowedR2: 0.1, maxDist: null }`, the words of the LD filter
  of the PCA with no distance, with or without an LD filter in the
  dataset, and none with `maxDist` 50000, or with `follow` true and
  `maxDist` `null`; `pruningDistanceReason` gives the same words in the
  same cases, also while another reason comes first; with the step's LD
  filter on with no distance, the reason of `variantFilterNeeds` while
  `ld` follows, none with the PCA's own LD filter at 50000, and none
  once 20000 is typed in the step; with that filter and a variants file
  of 9,382 individuals, or an individuals file being read, the reason of
  `variantFilterNeeds`, which comes first; with that filter and a list
  to keep that names an individual not in the file, the store gives the
  PCA and the diversity the same reason, that of `individualListNeeds`; and the store, over the definition,
  asks no `variantFilterNeeds` of the PCA, whose `filtersRead.variants`
  is false, so a PCA with its own LD filter over a step's filter with no
  distance is ready while the diversity is locked; a project with no
  metadata file, and one with a file and no column chosen, are not
  locked.
- **`keptNeeds`**, over the `IndividualsKept` that `individualsKept` of
  `src/core/individualsKept.ts` makes: for the PCoA of a variants file of
  9,382 individuals with no filter, the list `null`, the words that say
  the file has 9,382 and offer the filters of individuals; with a list
  that keeps 9,381, `null`; for a file of 9,400 with a threshold on the
  missing data and statistics under which it keeps 9,390, "big.vcf has
  9,400 individuals and the filters of individuals keep 9,390 of them,
  …", and under which it keeps 100, `null`; for the PCA, `null` in each
  of these. The Run that waits for the statistics and then ends with
  nothing sent is the store's, and so is its test, "keptNeeds of the
  analysis locks it for the individuals kept, and a Run that waited for
  them ends with nothing sent" (`docs/specs/core/store.md`).
- **The key**, beside its table: the PCA's own LD filter with no
  distance and the LD filter following a dataset that has none give
  different keys. The LD filter following the step with `maxDist`
  `null`, with 50000, and with 50000 and r² 0.3 give one key, since the
  values kept while it follows are not inputs of the result; set for the
  PCA again with 50000, the key is that of the PCA's own LD filter with
  50000 typed, so the result of before comes back from the cache. The
  missing data filter of the step changed from 0.1 to 0.05 while the PCA
  has its own at 0.02 keeps the key; while it follows, it changes it.
  The PCA's own missing data at 0.1 over the step's 0.1 gives the key of
  the PCA that follows.
- **`parseOptions`**: the defaults back, `maxDist` `null` among them;
  `method` `"pcoa"`; `missingData` `{ follow: false,
  maxAllowedMissingRate: 0.05 }`; `maf` `{ follow: false, maxAllowedMaf:
  1 }`; `ld` `{ follow: false, maxAllowedR2: 0.1, maxDist: 50000 }` and
  `{ follow: false, maxAllowedR2: 0.1, maxDist: null }`; `view` `"2d"`;
  `axes` `[10, 9, 1]`. Refused: a missing field, a field more,
  `correctByLingoes` `false`, `maxAllowedMaf` 0.95 and `ldPruning` `{
  on: true, maxAllowedR2: 0.1, maxDist: null }` of the options before 28
  September 2026 among them; a method `"tsne"`; `missingData` without
  `follow`, or `follow` `1`; `maxAllowedMissingRate` 1.5; `maf` `null`;
  `ld` without `maxDist`, `maxDist` 0 or 2.5; `axes` `[1, 1, 2]` or `[1,
  2, 11]`; `view` `"4d"`.
- **`warnings`**: a result whose job had no LD filter gives `pruningOff`,
  with the words of the PCA and, of a PCoA, of the PCoA; one of the
  dataset's LD filter, and one of the PCA's own, none; `numVarsUsed` 150 for 200
  individuals gives `fewVariants` with the text above, 200 for 200 none.
  For `lingoesCorrection`, a result of the PCoA made in the test from the
  worked example of popnei's `js/popnei/test/pcoa.test.ts`, R's numbers
  for the ten distances of pyNei's `test_pcoa` corrected, the same at
  the tag `js-v0.1.0-dev.3`: five individuals, PC1's projections
  −0.431869046368213, −0.283479006142767, −0.269028184151739,
  0.492920681079785 and 0.491455555582935 and its percentage
  77.1278402980914, `lingoesConstant` 0.0640069399611263 and
  `negativeEigenvaluesPercent` 7.88262807403034. It gives the warning
  with "7.88%", "0.13", "32%" and "0.36": the mean of the squared
  distances worked out is 0.406 within 1e-12, the ten squares adding up
  to 4.06, and the share 0.3153051229612133. The same result with
  `lingoesConstant` and `negativeEigenvaluesPercent` 0 gives none.
- **`checkNumbers`**: the numbers of the flow below, the PCA with its
  own LD filter, `[548, 3.5476992895181616, 3.402040462155611,
  1.8945553874570624]`; a result of one component, the two individuals
  above, `[613, 100, null, null]`.
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
  than the plot can tell apart, with `cellTexts` the value of each
  individual, and `pcaRows` giving it as each row's colour; `cellTexts`
  `null` in every other case.
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
  is at position 10 after one at 30, with the PCA's own LD filter and
  with the dataset's; the ploidy of `tetraploid.vcf.gz` read with ploidy 2; and,
  for the PCoA, the messages of `js-v0.1.0-dev.3` of "The request": the
  pairs with no distance, with four pairs and with one; one individual;
  every distance 0; and "the pass gave no
  variant: …", with and without variants in the source.
- **`crashText`**: a PCA of 4,000 individuals gives the words of memory
  with "about 0.8 GB", the gigabytes to one decimal; of 2,264 the same
  words, and of 2,263 the diversity's; a PCoA the same at the same
  numbers, with "the principal coordinates".
- **`script`** of the project of the flow gives the lines above, as a
  literal.

The numbers of the runner's test in node and of the Playwright flow, on
`e2e/fixtures/panel.nei`, 1,200 variants of 200 diploid individuals, with
the populations of `e2e/fixtures/panel_pops.csv`, p0 of 48, p2 of 84 and
p1 of 68 individuals in the order they first appear, were given by
popnei's release `js-v0.1.0-dev.3`, which the `package.json` of the
application names from the plan of stage 4, installed on 28 September
2026 in a folder of its own with `npm install
https://github.com/JoseBlanca/popnei/releases/download/js-v0.1.0-dev.3/popnei-0.1.0.tgz`,
in node 26.8.2, by the script below, saved in that folder and run there
with `FIXTURES=‹the worktree›/e2e/fixtures` and `node` followed by the
path of the script. The two runs are the two settings of the flow: the
filters of a new project, the missing data filter at 0.1, which the PCA
follows with no filter of its own; and the same with the PCA's own LD
filter at r² 0.1 within 50,000 base pairs. Neither has a filter of
individuals, so every individual is kept, and the order of the filters
decided on 28 September 2026, the individuals first, changes none of
these numbers.

```js
import { readFileSync } from "node:fs";
import { init, openVars, doPcaFromVariants, doPcoaFromVariants, numPassesOf } from "popnei";
await init();
const runs = [
  ["new project", (v) => { v.filterByMissingData(0.1); }],
  ["own LD", (v) => { v.filterByMissingData(0.1); v.filterByLd(0.1, 50000); }],
];
const bytes = new Uint8Array(readFileSync(`${process.env.FIXTURES}/panel.nei`));
for (const [label, put] of runs) {
  for (const method of ["pca", "pcoa", "pcoa"]) {
    const v = openVars(bytes);
    put(v);
    const progress = [];
    v.onProgress((p) => progress.push(p));
    const r = method === "pca"
      ? doPcaFromVariants(v, { numPrinComps: 0, transformToBiallelic: true })
      : doPcoaFromVariants(v, { correctByLingoes: true });
    v.free();
    const k = r.numComps;
    console.log(label, method, k, method === "pca" ? r.usedVars.length : "-",
      JSON.stringify(r.passStats),
      JSON.stringify([...r.explainedVariancePercent.slice(0, 10)]),
      r.individuals[0], JSON.stringify([...r.projections.slice(0, 3)]),
      r.individuals[199], JSON.stringify([...r.projections.slice(199 * k, 199 * k + 3)]),
      method === "pcoa" ? JSON.stringify([r.lingoesConstant, r.negativeEigenvaluesPercent]) : "",
      JSON.stringify(progress));
  }
}
console.log(numPassesOf("doPcoaFromVariants"), numPassesOf("doPcaFromVariants", { numPrinComps: 0 }));
```

The PCA:

| | the filters of a new project | with the PCA's own LD filter, r² 0.1 within 50,000 |
|---|---|---|
| filters of the job | missing data 0.1 | missing data 0.1, LD |
| `passStats` | `missing_data` 1,200 to 1,200; `numVars` 1,200 | `missing_data` 1,200 to 1,200, `ld` 1,200 to 548; `numVars` 548 |
| `usedVars`, `numVarsUsed` | 1,200 | 548 |
| components found | 199 | 199 |
| PC1, PC2, PC3, explained % | 7.605779109441194, 5.555518021523858, 1.5660537372523171 | 3.5476992895181616, 3.402040462155611, 1.8945553874570624 |
| `s000` on PC1, PC2, PC3 | 1.5730359180131923, 12.900303725888635, −5.079684984380475 | −0.7138853335304419, 7.676473141448964, −4.384383801903496 |
| `s199` on PC1, PC2, PC3 | −9.286407763122794, −2.223391280100779, 2.9999714011936853 | −2.395576470232154, −0.7377179681081428, −2.345958102269474 |

The ten percentages with the LD filter, which the cut keeps:
3.5476992895181616, 3.402040462155611, 1.8945553874570624,
1.8450769825884152, 1.758262625226421, 1.7485467724341495,
1.708007168008476, 1.686458089265927, 1.6382789728126605,
1.6282559875034457. With the filters of a new project, from the fourth:
1.524724130017964, 1.5009086368595066, 1.4889112799690014,
1.470027654529171, 1.4483203636207653, 1.4166200151078203,
1.382667451283622. Every variant kept by the missing data filter varies,
so `numVarsUsed` is the 1,200 of the pass. The progress of each run was
the two calls of the diversity, `{ bytesRead: 0, numBytes: 261490, pass:
1, numPasses: 1 }` and `{ bytesRead: 259376, … }`. The LD filter halves
the share of PC1 on this panel, which is simulated with weak structure:
with it the first two components are 3.5% and 3.4%, and without it 7.6%
and 5.6%.

The PCoA, `doPcoaFromVariants(v, { correctByLingoes: true })`, with the
same filters:

| | the filters of a new project | with the PCA's own LD filter, r² 0.1 within 50,000 |
|---|---|---|
| `passStats` | as the PCA's: `numVars` 1,200 | as the PCA's: `numVars` 548 |
| components found | 198 | 198 |
| PC1, PC2, PC3, explained % | 9.624071140419273, 6.651014052013717, 1.7358089994362516 | 3.679886264523731, 3.5413304853438237, 1.9573102613242979 |
| `s000` on PC1, PC2, PC3 | 0.013100992356696437, 0.10359303419094794, −0.046161057061637055 | −0.0030332529765406636, 0.08117502269333857, 0.03633252913562992 |
| `s199` on PC1, PC2, PC3 | −0.0728375733863348, −0.016308136642461602, 0.010810214766670077 | −0.03392775490492186, −0.0011194016192959228, 0.012970339016726626 |
| `lingoesConstant`, c | 0.014182298472042042 | 0.023674522901958598 |
| `negativeEigenvaluesPercent` | 2.983436163735554 | 7.87126617431627 |

The ten percentages with the LD filter: 3.679886264523731,
3.5413304853438237, 1.9573102613242979, 1.8471127804041167,
1.8315661674388577, 1.7562462600666455, 1.7027784245122337,
1.6731238565502609, 1.6316941256138073, 1.6111863636656447. With the
filters of a new project, from the fourth: 1.6738260237925666,
1.6117897681313083, 1.5731704299982983, 1.5406935339991399,
1.5248489797155544, 1.4991825047298317, 1.4907358208852532. The 198
percentages add up to 100 within 5e-14, 100.00000000000004 and
100.00000000000003. The second run of each gave the same numbers to
the last bit; the progress was the PCA's two calls; `numPassesOf` is 1
for both calls. Without the correction the same distances are refused,
"44 of the 200 eigenvalues of the matrix of the squared distances are
negative, 2.98 percent of the sum of all of them, …", and with the LD
filter "61 of the 200 …, 7.87 percent …". The numbers of the warning,
worked out from these (above, "The warnings"), with the LD filter and
without it: 2c 0.047349045803917196 and 0.028364596944084084, the mean
of d² 0.08929029017900945 and 0.09474197155846419, the shares
0.530282136041799 and 0.2993878687291262, and the square root of 2c
0.21759835891825377 and 0.16841792346447002, which the words write
"0.047", "53%" and "0.22", and "0.028", "30%" and "0.17".

The runner's test asserts these as literals, with the result cut to 10
components: for the PCA with the LD filter, `numComps` 10,
`numCompsFound` 199, `projections` of 2,000 numbers, whose first three
are `s000`'s above; for the PCoA with the LD filter, `numComps` 10,
`numCompsFound` 198, the first three percentages, `s000` on PC1 to PC3,
`lingoesConstant` and `negativeEigenvaluesPercent`, `numVarsUsed`
`null`, and the same numbers from a second run, for the exact
comparison of the check numbers, `[548, 3.679886264523731,
3.5413304853438237, 1.9573102613242979]`; and the refusals of "The
request", as literals.

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
`panel_meta.csv`, chooses `popcat`; reads the three filters of the PCA
at "As in the Variants step", the missing data at 0.1 and the MAF and
the LD filters off there, and Run enabled; runs the PCA and sees the
3D view drawn first, or, in an engine that gives no WebGL, the 2D plot
with the words of a browser with no WebGL, which the report of the
flow says; reads the warning of no LD filter; switches to 2D and reads
"PC1 (7.61%)" and "PC2 (5.56%)" on the axes. It sets the LD filter for
the PCA and reads the reason of the LD filter with no distance beside
the field of the distance and beside Run, which is disabled; types
50000 as the distance, runs the PCA and reads "PC1 (3.55%)" and "PC2
(3.40%)" on the axes, no warning, and `s000` at −0.7139, 7.6765 in the
table; highlights p1 from the legend, with the keyboard, and sees its
entry checked, an element of the role `radio` with
`aria-checked="true"`, and the description name it; colours by
`altitude`, sees the bar of its scale and "Coloured by altitude, from
100 to 2060; 3 individuals have no value." in the description, and
back to the populations, and sees no calculation and one step of Undo
for each. It sets the LD filter back to as in the Variants step, and
reads 7.61% at once, from the cache with no calculation, with no notice,
since the PCA was done before the change and is done after it
(`docs/specs/core/store.md`, "The notice, and the calculations it
stops"); sets it for the PCA again and reads 50000 still in the
field of the distance and 3.55% with no calculation; switches to 3D,
turns the view with the buttons, and back to 2D; saves the table and
reads its header and the row of `s000`; runs axe, the checker of
accessibility, in each state it reaches. Then it chooses the PCoA, with
the PCA's own LD filter at 50000, runs it, and reads "PC1 (3.68%)" and
"PC2 (3.54%)" on the axes of the 2D plot, the warning of the correction
with "7.87%", "0.047", "53%" and "0.22", and the line under the
explained variance with "0.047" and "198 components". What it cannot
check, whether the 3D view and the plot read well, is seen by the owner
in the running application.

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
  missing genotypes". The PCoA has no control of its own: its
  correction is made whenever the distances need it, and nothing turns
  it off (above, "What it does").
- **Its filters**, under the heading "Filters of the variants for the
  PCA", an `<h3>`, and the line "The PCA uses the filters of the
  Variants step. Set a filter here to use another value for the PCA
  alone.", which says "the PCoA" by the method. Then its three filters,
  in the order of the Variants step: missing data, MAF, LD. Each is a
  React Aria `RadioGroup` of two radio buttons, named as the switch of
  its filter in the Variants step is, "Filter the variants by missing
  data", "Filter the variants by major allele frequency (MAF)" and
  "Prune the variants by linkage disequilibrium (LD)"
  (`docs/specs/steps/variants.md`, "The filters of the variants"):
  - **"As in the Variants step: 0.1"**, chosen by default, with the
    value the step has on, written as the step's field writes it; "As
    in the Variants step: off" while the step has that filter off. For
    the LD filter, "As in the Variants step: r² at most 0.3 within 10000
    base pairs", "As in the Variants step: off", or, while the step's
    filter has no distance, "As in the Variants step: r² at most 0.3,
    its distance still to be typed there".
  - **"For the PCA alone"**, or "For the PCoA alone" under the PCoA,
    following the method as the heading and the line above do, as the
    owner decided on 29 September 2026 (stop C 5 of
    `docs/specs/stage-4-open-points.md`), where it said PCA under both
    methods. It shows under it the number fields of
    that filter in the Variants step, the same component of
    `src/ui/widgets/` with the same labels: "Maximum proportion of
    missing genotypes, from 0 to 1"; "Maximum major allele frequency,
    from 0 to 1"; for the LD, "Maximum r² with a variant kept before
    it, from 0 to 1" and "Distance within which variants are compared,
    in base pairs, from 1". Under the fields, the line of the Variants
    step that says what popnei filters on, "The frequency of the
    commonest allele: 0.95 removes a variant whose commonest allele is
    above 0.95. …" among them, since a label alone would mislead here as
    it would there.

  Choosing "For the PCA alone", or "For the PCoA alone", sends `follow`
  false with the values the
  option keeps: the first time, 0.1 for the missing data, 0.95 for the
  MAF, and r² 0.1 with the distance empty for the LD (above, "Its
  options"); after that, the values the user last typed. Choosing "As in
  the Variants step" sends `follow` true alone, which is how the user
  sets a filter back: its fields go, as the fields of a filter turned off
  go in the Variants step, and its values are kept for the next time.
  While the PCA's own LD filter has no distance, the reason of
  `pruningDistanceReason` is the text beside the field of the distance,
  which describes the field to a screen reader, as it is beside the
  disabled Run button when it is the reason `needs` gives first (above,
  "Why it cannot run").

  Two radio buttons, and not a switch, are the writers' decision of 28
  September 2026: each of the two choices says in its own words what the
  PCA uses, the value of the Variants step among them, so that the user
  sees what the PCA reads without opening the step, and a screen reader
  says "As in the Variants step: 0.1, radio button, 1 of 2". A switch
  "For the PCA alone" would need a line of its own for what is used
  while it is off.

The four number fields follow the rules of the fields of the Variants
step, "A number the fields do not take" and "A character the fields do
not take" of `docs/specs/steps/variants.md`: the missing data, the MAF
and the r² take numbers from 0 to 1 of at most two decimals, the window
a whole number from 1 to 9007199254740991, written with no comma
between thousands; a number outside that, or with more decimals, is
refused with the line of that step under the field, "1.5 is more than
1; the maximum r² stays 0.1.", "0 is less than 1; the distance stays
50000.", or, while there is no distance, "0 is less than 1; the
distance is still to be typed.", and sends nothing; a field left empty
sends nothing and shows its value again, or stays empty while there is
no distance. The field of the distance is given `NaN` for a `null`
distance, which React Aria's `NumberField` shows as empty, and not
`undefined`, which would let it keep a number the project no longer has
after an undo; in the empty field no key that steps a number sends
anything, the arrow keys, Page Up, Page Down, Home and End, which React
Aria would turn into a distance of 1 or of 9007199254740991 base pairs
that the user never typed, the rule the number field of
`src/ui/widgets/` makes for every field given `NaN`; and in a field
that holds a number End and Home move the caret only, and never the
number to a bound of its range, as the number field makes it for every
field (`docs/specs/steps/variants.md`, "A number the fields do not
take", decided by the owner on 29 September 2026). So
every option the fields send is one `parseOptions` takes, whose ranges
are these.
- A line of what it will run on: "200 individuals of panel.nei", or "111
  of the 200 individuals of panel.nei, those the filters of individuals
  keep", and, while a threshold on the individuals waits for their
  statistics, the diversity's line, "Run calculates the statistics of
  each individual first, …".

**The result**, once calculated:

- **A bar of controls above the plot**: "3D" and "2D", two
  `ToggleButton`s of a `ToggleButtonGroup` of one selection, React
  Aria's buttons that stay pressed, which show the option `view`; the components on the axes, React
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
- **The plot**: the 3D view of `docs/specs/charts/pca3d.md`,
  `createPca3d`, of the three components chosen, with three.js
  downloaded the first time a result is drawn in the tab; or the 2D
  scatter of `docs/specs/charts/scatter.md`, `createScatter`, of the
  first two components chosen, each axis labelled with its explained variance, "PC1
  (3.55%)". The 3D view opens first, as the owner decided on 28
  September 2026 (above, "Its options"); while three.js is downloaded
  the place of the plot says "Loading the 3D view…". When the browser
  has no WebGL 2, or three.js could not be downloaded, the panel draws
  the 2D plot of the first two components chosen in its place, with the bar of
  controls of the 2D plot, and above it the words of "Its words" that say
  why. The option stays `"3d"`, and so does the pressed button, since
  the screen does not change an option without a command of the user;
  pressing "2D" sets `view` to `"2d"`, a command, and the words go.
  With one component there is no plot: the panel shows the line of "The
  cases", the explained variance and the table, whose second column
  still follows "Colour the points by", the one control of the bar left.
  With two, the 3D button is disabled and a note says why, one of the
  notes under the plot below, "Note: The 3D view needs three components,
  and this result has 2."; a project whose `view` is `"3d"`, opened or
  undone to, draws the 2D plot with the same note, and the option stays
  as it was. The panel makes the data of both
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
  0.047 to the square of every distance, as the warning says; over all
  the 198 components of the PCoA they add up to 100." When they needed
  none: "The Kosman distances of these individuals can all be drawn in
  one space, so they were not corrected; over all the 39 components of
  the PCoA the percentages add up to 100." The numbers are those of
  `panel.nei` with the LD filter of the flow and of popnei's
  `four_alleles.vcf.gz`, 2c as in the warning and `numCompsFound`. Its
  download, "Download the explained variance as CSV",
  `panel.pca_variance.csv`, or `panel.pcoa_variance.csv`, with the header
  `component,explained_variance_percent` and rows `PC1,3.5476992895181616`.
- **The table of the individuals**, one row per individual of the result
  in the order of the file: Individual; its group or its value, its
  value in the column also when the colouring has more than 1,000
  groups and the points are of one colour (above, "The colours"), headed
  by the title of the colours, "Population" or the column's name, and
  for an individual in no group or with no value the words of the
  legend, "No population" or "No value"; and PC1
  to PC‹numComps›.
  Sortable by any column, React Aria's `Table`, which a
  screen reader reads as a table and the keyboard moves through cell by
  cell, as the statistics of each individual are, in a box that scrolls
  with its header in view. Its caption:
  "The place of each of the 200 individuals of panel.nei on the first 10
  of the 199 components, from 548 variants." Its download, "Download the
  table as CSV", `panel.pca.csv` or `panel.pcoa.csv`: the header
  `individual,population,PC1,…,PC10`, the second field named by the title
  of the colours in lower case, and a row per individual, numbers as
  `String` writes them, and a field that holds a comma, a quote or a new
  line written between double quotes, each quote inside doubled, as the
  common rule of CSV files, RFC 4180, has it, so that a spreadsheet opens
  it into the right columns; from 1 October 2026 a name, of an
  individual, of a group or of the column of the colours, that starts
  with "=", "+", "-" or "@" has a quote, ', before it, as in every CSV
  of the application (`diversity.md`, "What it shows"), and a number of a
  continuous column is written as a number.
- **The notes**: the note of the colours, of the axes, of the marks past
  49 groups, and of the missing genotypes, under the plot; they are not
  warnings, and have no count on the heading.
- The line of the versions, "Calculated with popnei 0.1.0, in version
  0.1.0 of the application.", as the diversity's.

The numbers are written in one way each, decided here. A coordinate is
written to four decimals in the table, "−0.7139", and to three
significant digits in the tooltip of the plot, "−0.714", as
`docs/specs/charts/scatter.md` has it, since a tooltip is read at a
glance and the table is where the numbers are read; the percentages to
two decimals, "3.55%"; a value of a column as `tableNumber` of
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
| locked | the reason, as text beside a Run button that is disabled and described by it: "panel.nei has 12,000 individuals, and the principal components of more than 9,381 need more memory …", for the PCoA, once the list of the individuals kept is known, "… the principal coordinates of more than 9,381 need more memory than a browser tab can hold. Keep at most 9,381 with the filters of individuals in the Variants step, …", "12 individuals of panel.nei are not in pops.csv: …", "Reading pops.csv.", "pops.csv was not read when this project was saved, so the project file does not hold it. …", "The LD pruning of the PCA needs the distance within which variants are compared. …", or "of the PCoA", this one also beside the field of the distance, "The LD pruning of the Variants step needs the distance …"; or the store's when the filters keep no individual. The options stay editable, since they are what the user may change | go to the step the reason names; type the distance, or set the LD pruning of the PCA back to as in the Variants step; keep fewer individuals for the PCoA; change the options |
| ready | the options, the line of the individuals it will run on, and Run | set the options; Run |
| running | the bar and the clock of the diversity, "Calculating · 35% · 0:12", its words after a stop and while it waits for the statistics of each individual; and under them "The bar shows the reading of panel.nei. The components are calculated once it is read, and the bar does not move meanwhile: from under a second for 1,000 individuals to minutes for several thousand." The options stay editable, as in every analysis and in the Variants step: a change of the method or of a filter, of the PCA's own or of the Variants step, that changes the key leaves the calculation behind, with the notice of the store, which says it will be stopped unless the change is undone (`docs/specs/core/store.md`, "The notice, and the calculations it stops"), and the panel shows the state of the new settings. The colour, the axes and the view are chosen in the bar of controls, which is there only once a result is, so while the PCA runs only an Undo or a Redo can change them, and that keeps the key and the calculation (decided by the owner on 29 September 2026, the spec taking the code) | Stop; change the options |
| done | the bar of controls, the plot, in 3D first, or the 2D plot with the words of why when the browser cannot draw 3D, the legend, the explained variance, the table and their downloads; the warnings above the plot, with their count on the heading, "2 warnings"; the notes; after an opened project file, the comparison with its check numbers under the table; and the options, whose change removes the result | draw, colour, turn, highlight, sort, download; change the options |
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
| `missingData`, `maf` or `ld` set for the PCA, the radio button "For the PCA alone", or "For the PCoA alone", which sends `ld: { ...pcaOptions(p).ld, follow: false }`, with the values as they are | "the missing data filter of the principal components was set for them alone", "the MAF filter …", "the LD filter …" |
| the same set back, the radio button "As in the Variants step", `follow` true and the values as they are | "the missing data filter of the principal components was set back to that of the Variants step", "the MAF filter …", "the LD filter …" |
| a value of a filter set for the PCA, its fields shown only while it is | "the missing data filter of the principal components changed", "the MAF filter of the principal components changed", "the LD filter of the principal components changed" |
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
removed because the LD filter of the principal components was set back
to that of the Variants step. Undo brings back the plot and the table as they were, with no
calculation; Run calculates new ones for the new settings.", and after an
undo or a redo "Undone: … The principal components were removed; Redo
brings back …".

The error state, by what the store gives; the method is named "the PCA"
or "the PCoA":

| the failure | the text |
|---|---|
| the statistics of each individual a Run waited for failed, `ofStatistics` | the diversity's row, with "so the PCA was not run" in place of "so the diversity was not run" when the PCA's own Run waited for them, `waited`, and "so the PCA cannot run" when it did not (stop C 4); "the PCoA" by the method |
| "there are no variants to do a PCA with", and a pass has counted the file at 0 variants (`numVars` of the read of the variants file) | the words of a file with no variant, `emptySourceText` of `src/core/analyses/words.ts`: "empty.vcf has no variants, so there is no variant to do the PCA with. Load another variants file in the Variants step.", or, for a VCF read with only the passed variants, "failed.vcf has no variant with PASS or . in its FILTER column, …" |
| the same, the variants of the file not counted or more than 0 | "No variant of panel.nei is left after the filters of the PCA, so there is no variant to do the PCA with. Loosen the filters the PCA has for itself in its options above, or those of the Variants step that it follows; the Count button of the Variants step shows how many each filter of the step keeps." |
| "no variant has more than one dosage among its called genotypes" | "No variant left after the filters varies among the individuals kept, so there is nothing to do the PCA with. This happens with one individual, or a few of one line; keep more individuals with the filters of individuals in the Variants step." |
| a message that starts "the variant ‹n› of the ones the filter by linkage disequilibrium has read", the LD filter the PCA's own | `ldOrderText` of `src/core/analyses/words.ts` (`docs/specs/analyses/diversity.md`, "Its words"), with the PCA's LD filter: "The LD filter of the PCA needs the variants of each chromosome together and in the order of their positions, and panel.vcf.gz does not have them so: on chromosome 1, a variant at position 10 comes after one at position 30. Sort the file, with bcftools sort for a VCF, and load it again, or set the LD filter of the PCA back to as in the Variants step." A variant of a chromosome that had already ended: "…: a variant of chromosome 1, at position 10, comes after a variant of another chromosome, though variants of chromosome 1 came before that one." |
| the same, the LD filter the dataset's, which the PCA follows | the diversity's row, with the LD pruning of the Variants step: "The LD pruning of the Variants step needs …, or turn off the LD pruning in the Variants step." |
| a genotype of another ploidy; a line of the VCF | the diversity's rows, `otherPloidyText` and the line of the VCF |
| "the principal components of ‹n› individuals hold about", which the lock prevents | "panel.nei has 12,000 individuals, …", the words of the lock of the PCA |
| the PCoA's empty pass, "the pass gave no variant and its source holds none: …" or "the pass gave no variant: …" | the two rows of the empty pass above, with "the PCoA" |
| the PCoA's refusal of the pairs with no distance, a message that matches "‹n› of the ‹m› pairs of individuals has no distance" or "… have no distance", then "the first of them ‹a› and ‹b›, and ‹c› is in ‹k› of them", each name between backquotes (above, "The request") | "4 pairs of individuals of panel.nei have no variant called in both, so they have no Kosman distance and the PCoA cannot place them; s082 is in 3 of them. Remove the individuals with many missing genotypes with the filters of individuals in the Variants step, or use the PCA of the genotypes, which places every individual." With one pair, "1 pair of individuals of panel.nei has no variant called in both, so it has no Kosman distance and the PCoA cannot place it; s082 is in it. …" |
| the PCoA's "there is 1 individual, and a principal coordinate analysis places 2 at least", which the filters of individuals give when they keep one | "The filters of individuals keep one individual of panel.nei, and the PCoA needs two at least to place them. Keep more individuals with the filters of individuals in the Variants step." |
| the PCoA's "every distance is 0" | "Every two of the individuals kept have the same alleles at every variant both have called, so their Kosman distances are all 0 and the PCoA has nothing to place. Keep more individuals, or more variants, with the filters of the Variants step." |
| any other refusal | "popnei could not calculate the principal components: ‹its message›. Change the settings, or load the variants file again, to run it again." Not popnei's refusal of an option it does not know, which only the application can send, and which the runner answers as a defect (below) |
| the worker stopped with no answer, `workerFailed`, with the memory the calculation needs estimated at `PCA_MEMORY_WORDS_BYTES`, 250 MB, or more: 48.8 bytes for either method, popnei's count, for each cell of the individuals × individuals matrix of the individuals it ran on, 2,264 individuals or more; "the principal coordinates" for the PCoA | "The calculation stopped unexpectedly, perhaps because the principal components of 4,000 individuals, which need about 0.8 GB, did not fit in the memory of this tab; a phone or a tablet gives a tab far less than a computer. Keep fewer individuals with the filters of individuals in the Variants step, close other tabs and run it again, or calculate them with popnei in Python, outside the browser." |
| `workerFailed` below that, `reopenFailed`, `defect`, `couldNotStart`, `protocolMismatch`, `files` | the diversity's rows |
| a defect of the application, `defect`: a `popnei_web defect:` thrown in the calculation worker during the PCA, such as popnei's individuals or projections not those the pass was to give (`docs/specs/worker/runner.md`, "The principal components", step 3), or popnei's refusal of an option it does not know | the diversity's row of `defect`, whatever the number of individuals: "The application met an error of its own: popnei gave 10 projections for 3 individuals and 2 components. Run it again." Before 29 September 2026 the first reached the panel as a crash, `workerFailed`, whose words said to load panel.nei again below 2,264 individuals and blamed the memory of the tab from there up, and the second as a refusal, whose words said to change the settings; the owner decided on that day that a defect of the application is told as one (stops A 9 and C 6 of `docs/specs/stage-4-open-points.md`) |

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
two rows of `workerFailed`, and is for a crash alone: a worker that
stopped for a trap of the wasm, a memory that could not grow, or a throw
that is not a defect of ours.

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

The words of the 3D view, which the panel opens on, with the 2D button
offered in each case (`docs/specs/charts/pca3d.md`, "Loading three.js",
"When the browser has no WebGL" and "The WebGL context lost"). While
three.js loads, and while the browser has taken the drawing away, the
words stand alone in the place of the plot, since the 3D view is about
to be drawn or drawn again. When three.js could not be downloaded, or
the browser has no WebGL 2, the 2D plot is drawn in the place of the 3D
view, and the words stand above it:

| when | the text |
|---|---|
| three.js is being downloaded, the first time a result is drawn in 3D in the tab | "Loading the 3D view…", announced without moving the focus. A download that ends after the user went back to 2D is dropped, and draws nothing (`docs/specs/charts/pca3d.md`, "Loading three.js") |
| its download failed, the connection down or the site deployed again since the page was opened | above the 2D plot: "The 3D view could not be loaded, so the 2D plot is shown in its place. If the connection works, the site may have been updated since this page was opened: save the project, reload the page and open the project again.", with a "Try again" button, which downloads it again and draws the 3D view in the place of the 2D plot when it arrives |
| the browser gives no WebGL 2, `Pca3dError` of kind `noWebGl` | above the 2D plot: "This browser cannot draw the 3D view: WebGL, the part of the browser that draws it, is turned off or not available on this computer, so the 2D plot is shown in its place. It shows any two of the components; choose them above the plot." Every result of the PCA shows it in such a browser until the user presses "2D", and a project saved in 3D and opened there shows it too; the screen does not switch the option to 2D |
| the browser took the drawing away, `onContextChange(true)`, until `onContextChange(false)` | "The browser stopped drawing the 3D view. It is drawn again when the browser allows it, or when you switch to 2D and back to 3D." |

`pca3d.md` points here for them.

The help, for the drawer of stage 8:

- What it gives: the place of each individual on the axes along which the
  individuals differ most, PC1 the most; the explained variance of each;
  how to read clusters, and that the distance along a component with
  little variance means little.
- Its filters: by default the PCA uses the filters of the Variants
  step, and each of its filters of missing data, MAF and LD can be set
  for the PCA alone, for both its methods, without changing the other
  analyses. Why a PCA often wants its own: a stricter missing data
  filter, since the PCA gives a missing genotype the mean of its
  variant; a MAF filter, since rare variants add noise to the
  components; and an LD filter, since a region of many linked variants
  can make a component of its own. A value set for the PCA replaces
  that of the step, stricter or looser; set back to as in the Variants
  step, it is kept for the next time.
- The distance of the LD filter, which the user types, and why it has
  no default: it depends on how far linkage disequilibrium extends in
  the genome of the species, and differs from one species to another.
  It starts at r² 0.1, lower than the 0.3 of the Variants step, since
  on popnei's test file popnei at 0.1 keeps no more variants than
  plink at 0.3 does. The help points to the LD decay, built in stage 5
  of `docs/build-order.md`, which gives the distance at which r² falls
  to half, as the way to choose the distance.
- The 3D view, which the panel opens on, and the 2D plot, one button
  away, which shows two components at a time and needs no WebGL.
- When not to trust it: with no LD filter, a linked region can make a
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
  correction, is the one to compare with. The correction cannot be
  turned off, since popnei does not draw such distances without it.
- How to use the plots: Escape hides the tooltip of a point; the 3D
  view turns by dragging or with the buttons, and zooms with the wheel
  while the Ctrl key is held, by pinching, or with the buttons, as the
  owner decided on 28 September 2026 (`docs/specs/charts/pca3d.md`,
  **Open 1**).
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
  description from `pcaDescription`, of the 2D plot: "Principal components of 200 individuals of
  panel.nei, PC1, 3.55% of the variance, across, and PC2, 3.40%, up.
  Coloured by population: p0, 48 individuals, centred at 0.4 on PC1 and
  7.4 on PC2; p2, 84, centred at −4.5 and −2.1; p1, 68, centred at 5.3
  and −2.7. p1 is highlighted. The table of the individuals gives each
  one's place." The groups are named in their order, a group with no
  individual in the result left out, and the individuals in no group
  last, under the name the legend gives them, "No population" or "No
  value", with their count and their centre as a group's; written here
  on 29 September 2026, as the owner decided that day, the spec taking
  the code. The centre of a group is the mean of its projections,
  arithmetic on popnei's numbers, written to one decimal; those of the
  example are of the PCA of `panel.nei` with the filters of the flow,
  the missing data filter at 0.1 and the PCA's own LD filter at r² 0.1
  within 50,000 base pairs, coloured by `popcat`: 0.447, 7.373 and
  −0.220 on PC1 to PC3, −4.517, −2.062 and −0.214, 5.265, −2.658 and
  0.420 to three decimals, the means of the projections of the script
  of "How it is verified" over the populations of `panel_pops.csv`, in
  node with `js-v0.1.0-dev.3` on 28 September 2026. Coloured by the values of a column, it
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
  axes. Since the panel opens on it, its description is the first a
  screen reader meets, and it says where each group lies, as that of the
  2D plot does: "Principal components of 200 individuals of panel.nei in
  3D, on PC1, 3.55% of the variance, PC2, 3.40%, and PC3, 1.89%.
  Coloured by population: p0, 48 individuals, centred at 0.4 on PC1,
  7.4 on PC2 and −0.2 on PC3; p2, 84, centred at −4.5, −2.1 and −0.2;
  p1, 68, centred at 5.3, −2.7 and 0.4. p1 is highlighted. The view
  turns, so it has no across and up; the 2D plot, one button away, shows
  two components at a time, and the table of the individuals gives every
  coordinate." A description of a turned view cannot say what is across
  and what is up, so it gives the centres on the three components and
  points to the 2D plot and the table. When the browser cannot draw it,
  or takes the drawing away, the view says so in the words of "Its
  words", and the 2D button stays; the 2D plot drawn in its place has
  the description of the 2D plot.
- **Not colour alone**, since WCAG 2.2 asks that colour is never the
  only way a thing is told apart (1.4.1): each group has its shape as well as its
  colour, the legend shows both, and the table names each individual's
  group in words. The faded groups of a highlight keep their shapes. A
  colouring by the values of a continuous column is told by colour alone
  on the plot, since viridis has no shapes; so the bar of the legend
  writes its smallest and largest value, the tooltip writes the value of
  its point, "altitude: 1280", and the table has each individual's value
  in its second column, which can be sorted by it.
- **The keyboard order**: the options, the method, then the three
  filters, each group of two radio buttons one stop of the Tab key with
  its fields after it while it is set for the PCA; Run or Stop, the warnings, the bar
  of controls, "Try again" when the 3D view could not be loaded, the
  legend, the plot's link to the table, the explained variance and its
  download, the table and its download: each download beside what it
  downloads, as the owner decided on 29 September 2026, the spec taking
  the code, where it had put the downloads last. A number typed in a field is
  committed by the Tab key before the focus moves, so that a distance
  typed in the field of the PCA's own LD filter enables Run before the
  Tab key reaches it, and the next stop is that Run and not the
  diversity's, as the review of work package 8 of
  `docs/plans/individuals-pca.md` found on 29 September 2026; the number
  field of `src/ui/widgets/` does it for every field. The switch of 2D and 3D keeps the
  focus on the button pressed. "Try again" goes with the words of a
  failed download, and the focus moves to the heading of the panel, as
  when Run or Stop goes. Run and Stop are one button, and the focus
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
  the heading, after a Run, or on the 3D button or a button of the bar,
  and a screen reader would not
  read the text that replaced the plot or stands above it; and the notes that appear after
  a change of the colour, the axes or the view, "Note: " and their
  words, since the focus is then on the select or the button that made
  them; and the reason of the LD filter of the PCA with no distance when
  choosing "For the PCA alone", or "For the PCoA alone", makes it
  appear, since the focus is then
  on the radio button.
  A highlight is said by the checked state of its entry and not
  announced again.
- A warning says "Warning:" in words, and a note "Note:".

### Left for the running application

The layout of the bar of controls and of the legend over the plot, the
size of the plot and of the points, how much the faded groups are
faded, where the notes go, how the three filters of the PCA are laid
out, and whether the options fold away once there is a result. The step of the turns, 15°, is decided in
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
  and `individualsNeeds` no longer locks on no file, from stage 4; the
  filters of the project are `ProjectVariantFilter`s, whose LD filter
  may have no distance, which `variantFilterNeeds` locks and
  `jobFilters` never gives a job.
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

Revised on 28 September 2026 with this spec, for popnei's release
`js-v0.1.0-dev.3`: `docs/specs/worker/runner.md` and `client.md`,
`docs/specs/stage-4-open-points.md`, `docs/architecture.md`, sections 1,
11 and 13, `docs/build-order.md` and `docs/functionality.md`; and the
sizes of a written file, which that release changes, in
`docs/specs/analyses/writeVariants.md`, `filterCounts.md`,
`docs/specs/entry.md`, `docs/specs/steps/variants.md` and
`docs/specs/worker/protocol.md`.

Revised on 28 September 2026 with this spec, for the owner's decisions
of the PCA's own filters and of the 3D view first:
`docs/specs/charts/scatter.md` and `pca3d.md`, where they said the PCA
opens in 2D, and their examples, "PC1 (3.55%)";
`docs/specs/stage-4-open-points.md`; `docs/functionality.md`, sections 3
and 5 and open point 4; `docs/architecture.md`, section 4, "What each
filter kept"; and `docs/specs/steps/variants.md`, where it said the MAF
filter is on at 0.95 inside the PCA. Made the same day in the specs
revised for the order of the filters, after them:

- `docs/specs/worker/protocol.md`: the PCA's job carries the dataset's
  filters with the PCA's own of each kind in their place, and not the
  stricter MAF and one pruning; the comment of `PcaJob.filters`.
- `docs/specs/worker/runner.md`: its test of the PCA and the PCoA takes
  the numbers of "How it is verified", 548 variants with the LD filter
  of the flow and no MAF filter, in the place of 535 with the MAF at
  0.95; its words on the filters of the PCA's job.
- `docs/specs/core/project.md`: where it names the PCA's `ldPruning` and
  its pruning, the PCA's own LD filter, `ld`, which keeps its values
  while it follows the Variants step.
- `docs/specs/core/keys.md`: "Every analysis of sections 5 to 8 reads
  all the filters" holds for the PCA through its `keyInputs`, whose
  `filtersRead.variants` is false (above, "What goes into its key").
- `docs/specs/entry.md`: its example of the counts of a PCA's pass.
- `docs/technology.md`, section 2: three.js is downloaded when the
  first result of a PCA is drawn, since the panel opens on 3D, and not
  only when a user opens the 3D view.

## What this spec asks of popnei

Checked against the release `js-v0.1.0-dev.3` on 28 September 2026, which
gives the PCoA and none of the four others:

- **The limit on the individuals of the PCA counted on the individuals of
  the pass**, after `filterIndividuals`, and not on those of the source:
  at the tag, the Rust function behind `doPcaFromVariants`, in
  `crates/popnei-js/src/vars.rs` for a `.nei` file and `vcf.rs` for a
  VCF, still gives the individuals of the source to the check of the
  limit, `room_for_the_analysis_of_the_variants` of `pca.rs`, and a VCF
  of 9,382 individuals with a list of 100 is refused, so a file of 12,000
  individuals cannot be analysed through a list of 5,000. Until then the
  application locks the PCA on the file's individuals. The PCoA of the
  release counts those of its pass, which is what is asked here.
- **The refusal of the PCA's empty pass in the words of the other
  calculations**, "the pass gave no variant and its source holds none"
  or "the pass gave no variant: …" with the counts of each filter, in
  the place of "there are no variants to do a PCA with", which the
  release still gives, so that the user is told which filter dropped
  them. The PCoA of the release words it so.
- **A call of `onProgress` when the reading of the pass ends**, before
  the decomposition, or a progress of the decomposition, so that the bar
  says what is being done for the minutes of a large PCA or PCoA. The
  release calls it as before: at 0 bytes, at each range, and at the end
  of the run, after the decomposition.
- **The called genotypes of each individual with the PCA**, one number
  per individual, which would make the note of the missing genotypes a
  warning of the result. `VariantsPcaResult` of the release has no such
  field.

The variants a pruning kept are not asked yet: the owner decided on 27
September 2026 to ask for a way to keep them only if the time of the
pruning, measured in stage 4, is large ("The pruned variants are not
kept between two PCAs" in `docs/specs/stage-4-open-points.md`). The
release has no way to put a list of variants back on a `Variants`.

## The PCoA of popnei's release

The PCoA was written first against popnei's draft, "The principal
coordinates of distances" of popnei's `docs/specs/pca.md` at its commit
`aa78e7e` of 27 September 2026. It is in popnei's release
`js-v0.1.0-dev.3`, made on 28 September 2026 from popnei's `main` at
`eae29a2`, and this spec now follows the release: `package.json` names
`https://github.com/JoseBlanca/popnei/releases/download/js-v0.1.0-dev.3/popnei-0.1.0.tgz`
from the plan of stage 4, so the application never runs on a popnei
without the PCoA, and the lock of a PCoA that popnei lacked,
`PCOA_IN_POPNEI` with its test and its words, is gone.

What the release has, from `js/popnei/src/pcoa.ts` and `passes.ts` at
the tag and from running it in node: `doPcoaFromVariants(variants, {
minNumSnps, correctByLingoes })`, both optional, `minNumSnps` 0 and
`correctByLingoes` false when not given; its `VariantsPcoaResult` with
`individuals`, `numComps`, `projections`, `explainedVariancePercent` and
`passStats` of the names and shapes of `doPcaFromVariants`, which a
check at compile time in popnei keeps so, and `lingoesConstant` and
`negativeEigenvaluesPercent`, with no `usedVars`, `numPrinComps` or
`princomps`; `numPassesOf("doPcoaFromVariants")` 1; and, in Python,
`do_pcoa_from_variants(variants, min_num_snps=None,
correct_by_lingoes=False)`, whose result has `lingoes_constant` and
`negative_eigenvalues_percent`. The release also has `doPcoa`, the PCoA
of a `Distances`, and `correctDistsByLingoes`, which the application
does not call.

Where the release differs from the draft this spec had followed, and
what changed here for it:

- **The limit is 9,381 individuals, not 8,695, and it counts the
  individuals of the pass.** The draft worked 8,695 out from a peak of
  56.8 bytes a cell, which popnei's spec counted and did not measure: the
  PCA's 48.8, measured, and 8 for the projections written while the
  eigenvectors are held (popnei's `docs/specs/pca.md`, "How it runs" of
  the principal coordinates, 27 September 2026); and this spec counted
  the individuals of the file. The release measured 44.4 bytes a cell,
  under node 26.8.2 on the owner's Apple M5 Pro on 27 September 2026,
  on VCFs of 300 variants and 8,695 to 9,413 diploid individuals (below,
  "How it runs"), counts the PCA's 48.8, and asks the page for the
  individuals `filterIndividuals` leaves. So `PCOA_MAX_INDIVIDUALS` is
  gone for `PCA_MAX_INDIVIDUALS`, the lock of the PCoA counts the known
  list of the individuals kept and offers the filters of individuals,
  and the words of a crash of memory and the restart
  after a large PCoA count 48.8 bytes a cell, as for the PCA ("Why it
  cannot run", "How it runs", "Its words").
- **The refusals have their final words**, given in "The request" and
  recognised in "Its words": the pairs with no distance, "‹n› of the ‹m›
  pairs of individuals has no distance" or "… have no distance", which
  names the first pair and the individual in most of them, and says to
  take it out with `filterIndividuals` or run the PCA; one individual,
  "there is 1 individual, and a principal coordinate analysis places 2
  at least by the distance of each pair"; and more than 9,381, "the
  principal coordinates of ‹n› individuals hold about ‹g› GB, …". Every
  distance 0 is worded as the draft had it.
- **`correctByLingoes` is false by default in TypeScript as well as in
  Python**, where this spec had said so of Python alone; the application
  passes it as it did.
- **An option that is not one of `minNumSnps` and `correctByLingoes` is
  refused**, as every options object of the release refuses a key it
  does not know ("The request").
- **The numbers of the warnings and of the tests are those of
  `panel.nei`**, where the draft gave only those of popnei's own panel,
  `tests/reference/dists/panel.vcf.gz`, which is not
  `e2e/fixtures/panel.vcf.gz` (their MD5 differ), 2.98%, "0.028", 30%
  and "0.17". Since the owner's decisions of 28 September 2026 they are
  7.87%, "0.047", 53% and "0.22" with the LD filter of the flow, and,
  with the filters of a new project, the same four as popnei's panel
  gave ("The warnings", "How it is verified").

The names, the option, the fields, the one pass and the correction made
inside the analysis from the eigenvalues it has are as the draft had
them.

## Open points

The points of `docs/specs/stage-4-open-points.md` this spec rests on
are listed there once, and the owner has decided each. On 27 September
2026: the pruned variants not kept between two PCAs, and the r² of 0.1
with no default distance of the PCA's pruning, now of its own LD
filter. On 28 September 2026: Lingoes' correction with no switch; the
PCA's own filters of missing data, MAF and LD, which follow the
Variants step by default, in the place of the recommendation of 27
September 2026 on which variants the PCA reads; the panel opening on
the 3D view; and, as recommended, the variants of more than two
alleles, the lasso out of stage 4, and the zoom by the wheel with Ctrl
held. The two that follow, this spec's own, are decided by the owner.

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
file and other tabs open, may not have for the next analysis. The
measurement of 29 September 2026 ("How it runs") kept the bound: a PCA
of 700 left at most 18 MB behind in Chromium and WebKit, and the worker
started again after one of 1,000 or more gave the tab back its size.

**Open 2, decided by the owner on 28 September 2026, as recommended:
the individuals with many missing genotypes told by a note of the
panel.** The PCA draws them toward the centre, and the result does not
hold their missing genotypes. Decided: a note of the panel, at 0.2,
from the statistics of each individual when the store has them, as
above, and a warning of the module once popnei gives the called
genotypes of each individual with the PCA (asked above). The note needs
nothing calculated, but is shown only after those statistics are, and
is not kept with the result nor in the report. With the order of the
filters decided the same day, the statistics of each individual are
counted in one pass for each load, over every variant of the file, and
the note says so. Not taken: the PCA's Run calculating the statistics
of each individual first, as a Run with a threshold on the individuals
does, a pass more for every PCA without them.

## Not in this spec

- The lasso that edits the populations on the plot: not in stage 4, as
  recommended and the owner decided on 28 September 2026; it needs a
  design of its own.
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
