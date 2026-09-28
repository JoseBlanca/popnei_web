# The decisions of the specs of stage 4

27 September 2026, for the owner. Stage 4 of `docs/build-order.md` is the
Individuals step whole and the PCA: the metadata file read from an xlsx
as well as a CSV, the file made optional, the types of its columns set by
the user, and the principal components of the individuals, drawn in 2D
and in 3D. This file gathers what the specs of stage 4 ask the owner to
decide, what they decided alone that a user meets, what the owner is
asked to make or approve, and what is asked of popnei. None of the specs
is reviewed or approved yet. On 27 September 2026 the owner answered
points 1, 3, 8, 14 and 15 and approved the new dependencies but
calamine, and the specs named with each were revised the same day. On
28 September 2026 the specs were revised to popnei's release
`js-v0.1.0-dev.3`, which has the PCoA (below, "popnei's release
`js-v0.1.0-dev.3`"), and the owner decided point 16, the LD filter of
the Variants step turned on with no distance, which changes the code of
stage 3. Later that day the owner gave four more answers, which the
specs now say as decided: the LD filter keeps its r² and its distance
while it is off (point 16); Lingoes' correction of the PCoA has no
switch; the repository of xlsx_rs and how it makes its releases; and
calamine, approved (below, "Decided by the owner on 28 September
2026"). Later again that day the owner answered points 2, 4, 5, 7 and 9
to 12, the last four of them each a line, and the specs say them as
decided: the PCA has its own filters of missing data, MAF and LD, which
follow the Variants step by default (point 2); the panel opens on the
3D view (point 5); `#N/A` of an xlsx is a missing value (point 11);
the sheet read is said in a fixed line (point 12); and points 4, 7, 9
and 10 as recommended. The owner's answer A of the same day puts the
filters of individuals before those of the variants, which changes the
code of stage 3 as well (point A). Later again that day the owner
answered four more, which the specs now say as decided: every error of
Excel in an xlsx is a missing value, the six others as `#N/A` (point
11); the filter of the regions of a BED file acts before the filters of
individuals, once the application has it; the histograms of the
variants count over the individuals kept; and the Variants step shows
the section of the individuals before that of the variants (the last
three under point A).

The specs are, new: `docs/specs/analyses/pca.md`, the analysis and its
panel; `docs/specs/charts/scatter.md`, the 2D plot, and `pca3d.md`, the
3D one; `docs/specs/worker/files.md`, the reader of xlsx in Rust. Revised:
`docs/specs/steps/individuals.md`, rewritten whole; `docs/specs/core/project.md`,
`projectFile.md`, `store.md`, `keys.md`, `cache.md` and
`individualsKept.md`; `docs/specs/analyses/diversity.md` and
`filterCounts.md`; `docs/specs/steps/variants.md`; `docs/specs/worker/protocol.md`, `messages.md`,
`runner.md`, `client.md` and `individuals.md`; `docs/specs/charts/plot2d.md`;
`docs/specs/shell.md`, `entry.md` and `site.md`; and, beside them,
`docs/functionality.md`, `docs/technology.md`, `docs/build-order.md` and
the coding skills under `.claude/skills/coding/`. They are written against
the branch of stage 3, which is not merged yet, and against
`docs/architecture.md` as revised the same day, whose section 1 says what
changed.

A few words are used throughout. The **PCA** is the principal component
analysis of the genotypes, popnei's `doPcaFromVariants`; the **PCoA** is
the principal coordinate analysis of the Kosman distances between the
individuals, which the owner asked of popnei on 27 September 2026 and
which popnei's release `js-v0.1.0-dev.3` of 28 September 2026 has. **Pruning** is popnei's filter of linkage
disequilibrium, which keeps a variant when its r² with every variant
already kept within a window of base pairs is at most a threshold. The
**xlsx_rs** is a project of the owner's, in a repository of its own,
that reads an xlsx for the application with **calamine**, a Rust library
that reads the cells of Excel files (below, "The reader of xlsx in a
project of its own"). The **calculation worker** is the thread of the tab that runs popnei; its
memory grows and never shrinks, and starting it again gives the memory
back. The **light worker** is a second thread, which reads the files of
the user, the metadata file among them. **three.js** is the library that
draws the 3D view, with **WebGL**, the part of the browser that draws
with the graphics card; three.js needs its version 2. The **store** is
the part of the page that holds the project, the results and what locks
each analysis, and the **stepper** is the row of the steps at the top of
the page, each marked done, to do or with a problem. A **screen reader**
reads the page aloud to a user who cannot see it.

## What is still the owner's

- **To approve the specs.** None is approved yet, and the plan of stage
  4 is written from approved specs.
- **To decide two points**, whose recommendations the specs follow
  meanwhile, and which the plan can be written without: point 6, the types the user set, kept when the file is read
  again; and point 13, what a page opened before a new version of the
  site shows. Point 14, the legend over the plot, is judged on the
  running screen, when the owner tries the PCA panel.
- **To make or approve three things**, below, "Asked of the owner to
  make or approve": the repository of xlsx_rs, where the zip of the
  report is made (for stage 6), and eight xlsx files for the tests. None
  of them stops the plan of stage 4 from being written: the xlsx comes
  last in the stage, and waits for the repository and its first release.
- **Possibly, the key of the zoom on a Mac**: if Ctrl clashes there when
  the plan tries it, the plan asks whether ⌘ takes its place (point 10).

## Decided by the owner on 27 September 2026

- **The PCoA is popnei's**, asked of popnei that day, and stage 4 builds
  it last. It was specified against popnei's draft of it, and is now in
  popnei's release `js-v0.1.0-dev.3`, whose names are the draft's.
- **The PCoA corrects a matrix that is not Euclidean by Lingoes'
  method**, as the owner decided: popnei refuses
  such a matrix unless the correction is asked for, popnei_web asks for
  it by default, and warns its users that the distances were corrected.
  The Kosman distances of `e2e/fixtures/panel.nei`, 200 individuals,
  with the missing data filter at 0.1 of a new project, give 44
  negative eigenvalues of 200, 2.98% of the variance, and 61, 7.87%, with
  an LD filter at r² 0.1 within 50,000 base pairs as well, so the
  correction is the common case and not an exception (`pca.md`). Recorded in popnei's `docs/specs/pca.md`,
  where `correctByLingoes` is false by default.

The four numbered points below were put to the owner with a
recommendation, and keep their numbers, which the specs cite.

### 1. The pruned variants are not kept between two PCAs

`docs/functionality.md` section 5 said the variants kept by the pruning
are kept for the next PCA. popnei cannot hold them: its pruning is a
step of the file made again at every pass, and it has no way to put a
list of variants back on a file. The one way through popnei, writing the
pruned file into memory and opening it again, holds the whole file in
the tab. Decided, as recommended: each PCA prunes again inside its one
pass over the file, which it makes anyway, so what keeping them would
spare is the calculation of r²; its time is measured in stage 4, and
popnei is asked for a way to keep them if it is large. The owner's
reason: "usually we don't need to redo the PCA exactly the same way, so
I don't think this is a problem. We'll see in the future what happens
when we use the application." Not taken: asking popnei now. Specs:
`pca.md`, `runner.md`, `client.md`; `docs/functionality.md` and
`docs/architecture.md`, section 5.

### 3. The PCA's own LD filter: r² 0.1, and no default distance

popnei gives no default of either. On popnei's test file of LD, with a
window of 50,000 base pairs, plink2 at an r² of 0.3 keeps 41 variants,
and popnei keeps 46 at 0.15 and 35 at 0.1 (`docs/specs/filters.md` of
popnei), so a threshold of popnei is lower than the same habit in plink.
Decided: an r² of 0.1, as recommended, and no default distance, in the
owner's words because "the distance really depends on the
LD/recombination of the regions, so I don't think we can set a default,
the user should choose." Not taken: a default distance of 50,000 base
pairs, which was recommended. On 27 September these were the values of
a pruning on by default in every PCA; since point 2, decided on 28
September 2026, they are where the PCA's own LD filter starts when the
user sets one, and a PCA whose LD filter follows the Variants step, as
in a new project, uses the step's.

What a user meets: the PCA of a new project runs at once, with the
warning that no LD filter was applied. Once the user chooses "For the
PCA alone" for the LD filter, its field of r² shows 0.1 and its field
of the distance is empty, and the PCA cannot run until a distance is
typed. The reason is text beside the field of the distance and beside
the disabled Run button: "The LD filter of the PCA needs the distance
within which variants are compared. It has no default, because it
depends on how far linkage disequilibrium extends in the genome of your
species. Type a distance in base pairs, or set the LD filter of the PCA
back to as in the Variants step." The help says the same, and points to
the LD decay of stage 5, once it exists, as the way to choose the
distance. While the PCA's LD filter follows the Variants step, the
step's LD filter with no distance locks the PCA with the step's words
(point 16).

In the specs, the option `ld` of the PCA holds whether it follows the
step, `follow`, and its own r² and distance, the distance `null` until
the user types one. Setting it back to follow the step keeps the r² and
the distance, so that choosing "For the PCA alone" again gives them
back and a distance once typed is not asked for again. A project file
saved before the distance was typed opens with it still empty. The key
of the result is the hash of what the result was calculated from. So
it holds the LD filter the PCA applies: the PCA's own while the user
has set one, and the step's while the PCA follows the step. The values
of its own filter, kept while the PCA follows the step, are not in the
key, since the result was not calculated from them. The Python script
that the project gives, which calculates the same results with popnei
in Python, has no lines for a PCA that cannot run. The LD filter of the
Variants step, which starts at an r² of 0.3 when the user turns it on,
is a different thing, and this point did not change it; its distance,
10,000 base pairs in stage 3, starts empty since point 16, and is kept
while the filter is off, as the PCA's is while it follows. Specs:
`pca.md`, its options, "Why it cannot run", the panel and the help;
`runner.md`, whose test types the distance; `docs/functionality.md`,
section 5 and open point 4.

### 8. The calculation worker started again after a PCA or a PCoA of more than 700 individuals

A PCA grows the memory of the worker by about 49 bytes per pair of
individuals, 662 MB at 4,000 in node, which stays until the next load of
the variants file: up to about 4.3 GB after a PCA of 9,381. Decided, as
recommended: the worker is started again, which in stage 4 costs reading
the header of the file, at most 49 ms. It is a second exception to the
owner's decision of 26 September 2026 not to start it again between
calculations, the first being a filtered variants file written above
25 MB, decided on 26 September 2026. Not taken: keeping
the worker, and its memory, until the next load. Whether 700 is the
right bound is measured in the plan (below). `pca.md`, Open 1;
`client.md`; `docs/architecture.md`, section 13, point 9.

### 15. A date cell of an xlsx, with or without its time

calamine gives the value of a date cell and not its format, so a cell of
`=NOW()` that Excel shows as 13/05/2024 holds the time as well. Decided,
as recommended: a time that, rounded to the millisecond, is midnight
gives the date alone, `2024-05-13`, and any other the date and the time,
`2024-05-13 14:31:07`, so such a cell does not match the other dates of
its column and the user sees why in its values. Not taken: always the
date and the time, which writes `2024-05-13 00:00:00` for every plain
date. `files.md`, Open 2.

### The new dependencies of stage 4, but calamine

Approved by the owner: three.js 0.186.1, loaded only when the 3D view is
first shown, 134 KB gzipped, and its types, `@types/three` 0.186.0, for
development, with the six packages they bring, which never reach the
site, one of them 7.5 MB unpacked; the modules of D3, the library of
the 2D plots, that the scatter uses
that stage 3 did not, `d3-shape`, `d3-path` and `d3-scale-chromatic`,
with their types; and Rust 1.98.0 and `wasm-bindgen-cli` 0.2.128 on
every machine that builds the site, CI among them. calamine was not
approved that day, and was approved on 28 September 2026 (below,
"calamine and rust_xlsxwriter in xlsx_rs"). `d3-delaunay`, which
`.claude/skills/coding/charts.md` listed for finding the point under the
pointer, is not needed: a plain loop over 50,000 points took 0.027 ms
in node.

## Decided by the owner on 28 September 2026

### 16. The LD filter of the Variants step starts with no distance, and keeps it while off

In stage 3 the LD filter of the dataset, turned on in the Variants
step, started at an r² of 0.3 within 10,000 base pairs, the example of
popnei's doc comment of the filters, as the owner left it on 26
September 2026 (`docs/specs/stage-3-open-points.md`, point F). Decided
by the owner: it starts with no distance, "just like PCA's pruning", for
the reason of point 3: how far linkage disequilibrium extends depends on
the genome of the species, so the application sets no default and the
user chooses. Its r² still starts at 0.3. Not taken: the 10,000 base
pairs of stage 3.

What a user meets: turned on, the filter shows an empty field of the
distance, and beside it "The LD filter of the Variants step needs the
distance within which variants are compared. It has no default, because
it depends on how far linkage disequilibrium extends in the genome of
your species. Type a distance in base pairs, or turn off the LD
filter." Until a distance is typed, what reads the filters of the
variants is locked with the same words, ending "in the Variants step"
where they are shown in another step: in the Variants step, the Count
of what each filter kept and the writing of the filtered variants; in
the Analyses step, the diversity, and the PCA while its LD filter
follows the step's (point 2). The statistics of each individual, which
read no filter since point A, below, and the histograms of the
variants, which read only the filters of individuals, are not locked
and can still be calculated. No count is shown
beside the filters, and the stepper shows the Variants step with a
problem. The summary line under the stepper counts the filter among
the filters and says nothing of its distance. The help says why there is no
default and points to the LD decay of stage 5.

Decided by the writers, the same day: the filter turned on is in the
project, the settings the user has made, with its distance `null`, and
is not held by the step alone until a distance is typed. So turning it
on is a command and a step of Undo, as for every filter of the step. The
results that read the filters leave the screen at once, with the notice
of what was removed and its Undo. An Undo after the distance is typed
gives back the empty field and the lock; a second one turns the filter
off. A project file saved before the distance is typed keeps the
filter, written with `"maxDist": null`; the format of the project file
stays at its version 1, which the owner keeps until the first release of
the application, and the project opens again with the field empty and
the same lock.

Not taken: the switch on and the field empty as the step's own state,
with no command until a distance is typed. The step would then show a
filter on that no analysis applies. The diversity could run, and a
project be saved, with the switch on and no pruning made. And an Undo or
a reload would lose the switch.

The request each calculation sends to popnei, its job, never carries a
filter with no distance: a new function of core, `jobFilters`, gives
the filters of every job, and would stop with an error of the
application if one had none, which the lock rules out. The Python
script of stage 6, which does with popnei in Python what the project
does, has no line for a filter with no distance; stage 6 says what it
writes for such a project.

Decided by the owner later the same day: the filter keeps its r² and its
distance while it is off, as the PCA's pruning does, so that turning it
on again gives back what was typed, and a distance once typed is not
asked for again. Not taken: the filter out of the project while off,
starting again with no distance at every turn on, as the specs had it
until then. The writers made it the rule of every switch of the
Variants step, the four filters of the variants, by missing data, by
observed heterozygosity, by MAF and by LD, and the two thresholds of
the individuals, by missing data and by observed heterozygosity, so that the switches of one step behave alike; the
two lists of individuals have no switch, and Clear keeps nothing.

What a user meets: a filter turned off and on again is the filter they
had, its fields holding what they typed; the first time a filter is
turned on, it has the values of the table of the Variants step, the LD
filter with an empty distance. The results of before come back from the
cache while it holds them, since the keys are those of before.

Decided by the writers, the same day, the form: the filters on stay in
the project's `filters` and `individualFilters`, and a filter turned
off moves, with its values, to two new lists, `filtersOff` and
`individualFiltersOff`, in the same fixed order. Turning a filter off
or on is one command and one step of Undo. The values kept while off
are in no key, no job and no lock, since no result is calculated from
them, and an LD filter turned off with no distance locks nothing. The
project file writes the two lists, still in version 1, and a file saved
without them opens with nothing kept. Not taken: a field `on` in every
filter, the form of the PCA's option `ldPruning`. The code of stage 3
reads `filters` and `individualFilters` as the filters applied in at
least five places, the keys, the individuals kept, the summary line,
the words of the step and the writing; with a field `on` each would
have to skip the filters off, and one that missed it would apply or
count a filter the user had turned off, with nothing on the screen to
show it.

This changes the code of stage 3, which is built: `LD_DIST_TURNED_ON`,
the 10,000 base pairs the switch starts at in
`src/ui/steps/variants/commands.ts`, which the plan of stage 4 removes
with its test, so that `turnedOnFilter(p, "ld")` gives the filter kept
while off, or, when none is, the filter with `maxDist` `null`; the type
of the filters in the project and its two lists of the filters off,
with `turnOffVariantFilter` and `turnOffIndividualFilter` in the place
of the commands that removed a filter turned off; the locks of the
store, the jobs of the Count, the statistics, the writing and the
diversity, the field of the distance, and the validation and the
fixtures of the project file. The plan of stage 4 carries the change.
Specs: `steps/variants.md`, "The distance of the LD pruning" and "The
filters of the variants";
`project.md`, "The filters turned off", `variantFilterNeeds`, the reason
of the lock, and `jobFilters`; `store.md`; `keys.md`; `projectFile.md`;
`protocol.md`; `docs/specs/stage-3-open-points.md`, point F;
`pca.md`; `filterCounts.md`, `individualChecks.md`, `writeVariants.md`
and `diversity.md`; `shell.md`; `docs/functionality.md`, sections 3 and
5 and open point 4; `docs/architecture.md`, sections 1, 2, 3 and 4.

### A. The filters of individuals act first

In stage 3 the filter of individuals came after every filter of the
variants, which counted over every individual of the file, and each
individual's proportion of missing genotypes and observed
heterozygosity were counted over the variants those filters kept, as
the owner decided on 26 September 2026 (`docs/architecture.md`, section
13, points 3 and 8). Decided by the owner on 28 September 2026: "All
analyses should calculate the filters using the individuals kept", so
that each filter of the variants counts over the individuals the
analyses read, and not over individuals a filter of individuals
removed. The
list of the individuals kept, which the two lists and the two
thresholds make, is put on the variants first, and the filters of the
variants count over the individuals it keeps, as plink 1.9 applies
`--mind` before `--geno`; each individual's two numbers are counted over
every variant of the file, one calculation per file loaded. What it
costs, said to the owner: an individual's missing genotypes include
those at the bad variants the missing data filter would drop; and the
code of stage 3, which is built, changes. Two options were not taken.
One put the lists of individuals first and the thresholds last, with
the statistics counted over the variants the filters keep among the
individuals of the lists. popnei takes one list of individuals per
pass, so the analyses would be given the final list first, and the
thresholds would have been set from statistics of other individuals
than those the filters of the variants then count over. The other kept
the order of stage 3.
`docs/architecture.md`, sections 1, 2, 3, 4, 5, 8, 11 and 13, has the
options and what would show the choice wrong.

What a user meets:

- The Variants step shows the filters of the individuals, the lists,
  the statistics of each individual and the two thresholds, before the
  filters of the variants, since the step shows the filters in the
  order they act. Proposed by the writers from the rule the step already
  had, and decided by the owner later on 28 September 2026. Not taken:
  the section of the variants first, as in stage 3.
- The statistics of each individual are calculated once for each file
  loaded; moving a filter of the variants leaves them, their table, the
  counts beside the thresholds and the individuals kept, with no
  calculation. The count of a threshold that waits for them reads
  "Known once the statistics of each individual are calculated.", no
  longer "… for these filters of the variants".
- The histograms of the variants are drawn over the individuals kept,
  so that each shows the number its filter keeps a variant by, as the
  filter counts it; a change of a filter of individuals removes them,
  with the notice of the change and its Undo, and a Calculate draws them
  again; with a threshold on the individuals their Calculate first
  calculates the statistics when they are not there. The writers' reading
  of what the owner's words ask of the numbers the filters are set from,
  confirmed by the owner later on 28 September 2026. Not taken: the
  histograms over every individual. On `panel.nei`, with the thresholds
  of the flow, the MAF filter at 0.95 counts over the 111 individuals
  kept and keeps 1,178 variants; histograms over all 200 individuals
  would show 1,175 at a MAF up to 0.95, a number the filter does not
  keep by.
- The counts beside the filters of the variants go at every change of a
  filter of individuals as well, and a Count waits for the statistics
  as the diversity does. A list of individuals that names someone not
  in the file, or filters of individuals that keep nobody, lock the
  Count and the histograms of the variants, with the reason beside
  their buttons; the statistics of each individual stay unlocked.
- The LD filter with no distance locks the Count, the writing, the
  diversity and the PCA, and no longer the statistics of each
  individual (point 16, above, revised).
- The line under the missing data filter of the variants reads "the
  proportion is over the individuals the filters of individuals keep."
  where it read "over every individual of the file."
- The numbers of `panel.nei`: the thresholds of 0.03 and 0.38 keep 116
  and 111 individuals, where they kept 125 and 119; the missing data
  filter at 0.05 keeps 1,117 of the 1,200 variants over those 111, where
  it keeps 1,152 over every individual; the summary line with the
  missing data filter at 0.05, the filter by heterozygosity at 0.9, the
  MAF filter at 0.95 and the two thresholds reads "panel.nei · 111 of
  200 individuals kept · 1,096 of 1,200 variants kept · 5 filters · 3
  populations by pop". They were given by popnei in node, by the script
  `orderA.mjs` of `docs/specs/worker/runner.md`, "How it is verified".
- A project file saved by stage 3 opens as before. The check numbers of
  its diversity are compared with a key version raised to 2, so that,
  with a filter of individuals, a difference is said to come from the
  application's calculation and not from the file; those of the three
  checks are compared only where their result is the same as stage 3's,
  since their settings now hold other filters.

The histograms of the variants over the individuals kept, the writers'
reading of the owner's words, were confirmed by the owner later on 28
September 2026. The option not taken kept them over every individual,
one pass per load, and showed numbers the filters no longer count by.
Each Calculate again after a change of a filter of individuals costs
one pass, as a diversity's, 248 ms in Chromium 153 over a VCF of 80.7 MB
on the owner's Mac, and minutes over a gzipped VCF of gigabytes. Specs:
`variantChecks.md`; `docs/architecture.md`, section 4.

Left open by the architecture review of the same day, and decided by
the owner later that day, as recommended: the filter of the regions of
a BED file, which the application has not built, acts before the
filters of individuals. The order is the regions first, then each
individual's statistics over the variants inside the regions, then the
filters of individuals, then the other filters of the variants, as
plink 1.9 removes the variants outside the regions before `--mind`.
Otherwise a user who loads a VCF of a capture with calls off the
target, and the BED of the target, would see individuals removed by a
threshold on their missing genotypes for calls no analysis reads. What
it costs: the statistics are one pass per load and per BED file. Not
taken: the regions among the other filters of the variants, after the
individuals; the statistics would then have stayed one pass per load,
whatever the regions. Nothing is built for it in stage 4. `docs/architecture.md`,
sections 1 and 2, and section 13, point 15; `docs/functionality.md`,
section 3.

The code of stage 3 that the plan of stage 4 changes, each with its
spec. `filtersRead` is what each analysis declares it reads of the
filters, those of the variants and those of individuals, which decides
what goes into its key and what locks it:

- `src/core/analyses/individualChecks.ts`: `filtersRead` `{ variants:
  false, individuals: false }`, the job with `filters: []`, the key
  version 2, the words of its warning ("among the 1,200 variants of
  panel.nei") and of its results removed, and no row of filters that
  keep no variant (`individualChecks.md`).
- `src/core/analyses/variantChecks.ts`: `filtersRead` `{ variants: false,
  individuals: true }`, the job with `individuals` from the bound
  client, the key version 2, the caption and the warning with the
  individuals kept, the script with `filter_individuals`
  (`variantChecks.md`).
- `src/core/analyses/filterCounts.ts`: `filtersRead` `{ variants: true,
  individuals: true }`, the job with `individuals`, the key version 2,
  the warning `filterKeptNone` without "and the statistics of each
  individual" (`filterCounts.md`).
- `src/core/analyses/diversity.ts`: the key version 2 (`diversity.md`).
- `src/core/apps.ts`: `countsOf` gives no counts for `individualChecks`,
  and `POPGEN_ANALYSES` puts `individualChecks` first (`docs/specs/entry.md`).
- `src/core/store.ts`: `createStore` refuses a definition of the
  statistics that reads any filter, and no longer refuses a definition
  of the counts that reads the filters of individuals (`store.md`).
- `src/worker/protocol.ts` and `messages.ts`: the jobs of
  `individualChecks`, with `filters: readonly []`, and of `variantChecks`
  and `filterCounts`, with `individuals`, and their checks
  (`protocol.md`, `messages.md`).
- `src/worker/runner.ts`: the list put before the filters, in `stepsOf`,
  `stepsAre` and the steps put on the `Variants`, and the list of the
  jobs of `variantChecks` and `filterCounts` (`runner.md`).
- `src/ui/steps/variants/`: the section of the individuals before that
  of the variants, the words of the count that waits, of the missing
  data filter and of the caption of the histograms, and the locks shown
  beside the Count and the histograms (`steps/variants.md`).
- The lock of the LD filter with no distance is not a change of stage
  3's code but an addition, with the rest of point 16, since stage 3
  gave the filter 10,000 base pairs from its switch: `variantFilterNeeds`
  of `src/core/project.ts`, which the store asks only of what reads the
  filters of the variants, after the lists of individuals (`project.md`,
  `store.md`).
- The tests and fixtures: `e2e/fixtures/panel_individual_stats.json`,
  written again by `make_fixtures.mjs` with no filter; the numbers of
  the tests of core, of the runner and of the flow, the lists of 116 and
  111 in the place of 125 and 119 (`individualsKept.md`, `runner.md`,
  `diversity.md`, `writeVariants.md`, `shell.md`).

### Lingoes' correction has no switch

The PCoA always asks popnei for Lingoes' correction, and the warning
`lingoesCorrection` gives its size, as the owner decided. Two options
were not taken: a switch that turns the correction off, which would
only make popnei refuse, since its release `js-v0.1.0-dev.3` refuses the
PCoA without the correction whenever an eigenvalue is negative, which
on `panel.nei`, with the filters of a new project, is 44 of 200; and
asking popnei for a PCoA of the
distances uncorrected, which popnei does not make. What a user meets:
the panel has no control of the correction, and its help says that the
correction cannot be turned off. Spec: `pca.md`, "What it does", its
options, `parseOptions`, the panel and the help.

### The repository of xlsx_rs and its releases

xlsx_rs is the project of its own that reads an xlsx for the
application (below, "The reader of xlsx in a project of its own"). Its
repository is `github.com/JoseBlanca/xlsx_rs`, public,
under the owner's account as popnei's is, so that `npm ci`, the command
that installs the site's dependencies, downloads
its releases with no token. Its releases are made by hand, as popnei's
are, a tag `js-v0.1.0-dev.1` and the packed package attached to a
pre-release, and later by a workflow of GitHub Actions shared with
popnei. Not taken: a workflow for xlsx_rs first, hours of work, which
would have tied every release to its source from the first; until the
shared workflow, nothing checks that a release was built from its tag,
as nothing checks it for popnei's. The repository did not exist on 28
September 2026, and the owner creates it (below, "Asked of the owner to
make or approve"). `docs/architecture.md`, section 13, points 11 and
13; `docs/technology.md`, sections 2, 5 and 7; `files.md`; `site.md`;
`docs/build-order.md`.

### calamine and rust_xlsxwriter in xlsx_rs

Approved by the owner: calamine 0.36.1 as a dependency of xlsx_rs, 0.30
MB gzipped, downloaded the first time an xlsx is read, and
rust_xlsxwriter 0.99.1, a Rust library that writes xlsx files, for its
tests alone until the writer of stage 6.
The xlsx of stage 4 now waits only for the repository and the first
release of xlsx_rs. `docs/architecture.md`, section 13, point 12;
`docs/technology.md`, section 2; `files.md`.

### 2. The PCA's own filters of missing data, MAF and LD

Recommended on 27 September 2026: the PCA reads the dataset's filters
with its own MAF at 0.95, the stricter of the two taken, and one
pruning, the dataset's or its own. Decided by the owner instead: "PCA
is a bit special because usually we want stricter missing data and ld
filters. I would put those widgets in the PCA/PCoA page, by default they
follow what ever is set for the rest of the analyses, but the user can
also set specific values for the PCA/PCoA there." The PCA has three
filters of its own, missing data, MAF and LD. Each shows "As in the
Variants step" with the step's value until the user sets a value for
the PCA alone, which replaces the dataset's filter of that kind for the
PCA, stricter or looser; popnei takes one filter of each kind. The
filter of observed heterozygosity is always the dataset's. Not taken:
missing data and LD alone, the PCA's MAF the dataset's; and a filter of
its own for every filter of the variants. The order of the filters, the
individuals first, is the owner's other decision of the same day, which
holds for the PCA as for every analysis.

What a user meets: with the filters of a new project, the PCA reads the
variants the diversity reads, prunes nothing and gives the warning that
no LD filter was applied, whose words say where to set one, in the
PCA's options or in the Variants step. It no longer waits for a
distance: it runs at once. On `e2e/fixtures/panel.nei` it uses 1,200
variants, PC1 7.61% and PC2 5.56%, where the PCA of before, with its
MAF at 0.95 and its pruning within 50,000 base pairs, used 535; with
its own LD filter at r² 0.1 within 50,000, it uses 548, PC1 3.55% and
PC2 3.40%. A filter set for the PCA starts at 0.1 for the missing data,
0.95 for the MAF, and, for the LD, at r² 0.1 with no distance, which
the user types before the PCA can run (point 3). A filter set back to
"As in the Variants step" keeps its values for the next time, as a
filter of the step turned off does (point 16). While the PCA has its
own LD filter, the step's LD filter with no distance does not lock the
PCA, which does not use it; the diversity stays locked.

Decided by the writers the same day. Each filter is two radio buttons,
"As in the Variants step: 0.1" and "For the PCA alone", with the number
fields of the Variants step under the second, so that the page says
what the PCA uses without opening the step; not taken, a switch "For
the PCA alone", which would need a line of its own for what is used
while it is off. In the project each filter is one object, whether it
follows and its values; not taken, a form that drops the values when it
follows. A filter set for the PCA starts at fixed values and not at the
step's of the moment. A change of a filter of the step that the PCA has
replaced with its own does not take the PCA off the screen, since it
changes none of its numbers. `pca.md`, "Which variants it reads", its
options, the key, "Why it cannot run", the warnings, the panel, the
help and the numbers; `docs/functionality.md`, sections 3 and 5.

### 4. Variants of more than two alleles

Decided by the owner, as recommended: popnei's PCA, which refuses a
file that has one unless it is told to count every allele that is not
the major one as the same, is told so, and the help says it; the user
could not mend the file in the application, which has no filter of such
variants. popnei does not say how many there were, so no warning counts
them. Not taken: leaving popnei's refusal, so that a file with such a
variant had no PCA in the application at all. `pca.md`.

### 5. The PCA opens on the 3D view

Recommended on 27 September 2026: the 2D plot first. Decided by the
owner instead: the panel opens on the 3D view, and 2D is one button
away. Where the browser has no WebGL 2, or three.js cannot be
downloaded, the panel shows the 2D plot with the words that say why,
above it. Not taken: 2D first, which needs no WebGL and no download, and
is what the export and the report carry.

What a user meets: three.js, 134 KB gzipped, is downloaded when the
first result of a PCA is drawn, and "Loading the 3D view…" stands in
the place of the plot meanwhile. A user whose browser cannot draw 3D
sees the 2D plot with the words at every PCA until they press "2D",
since the screen does not change the option by itself. The description
a screen reader reads first is that of the 3D view, which gives the
centre of each population on the three components. `pca.md`,
`pca3d.md`, `scatter.md`; `docs/functionality.md`, section 5.

### 7. The lasso out of stage 4

Decided by the owner, as recommended: selecting points on the PCA to
assign a population, which the owner's widget `any_scatter3d` does, is
not in stage 4, since it needs a design of its own, an edit of the
populations made on a plot changing the keys of every analysis that
reads them, and a way for the keyboard. Stage 4 takes from the widget
the legend that highlights a population, the legend over the plot, the
individuals of no population in a mark of their own and counted, and
the bar of buttons above the plot. Not taken: the lasso in stage 4,
which would have made the design of such an edit, and its way for the
keyboard, part of this stage.

### 9. The individuals with many missing genotypes

Decided by the owner, as recommended: a note under the plot naming the
individuals above 0.2 of missing genotypes, when the statistics of each
individual are already calculated, and a warning kept with the result
once popnei gives the counts. With the order of the filters decided the
same day, the statistics of each individual are counted in one pass for
each load, over every variant of the file, and the note says so. Not
taken: a Run of the PCA that calculates those statistics first, a pass
more. `pca.md`, Open 2.

### 10. The wheel zooms the 3D view with Ctrl held

Decided by the owner, as recommended: the wheel zooms the 3D view with
the Ctrl key held, as maps in a page do on Windows and Linux, which
also gives the pinch of a trackpad in Chrome and Firefox; the wheel alone scrolls the page, so a user who
scrolls the panel with the pointer over the plot is not caught by it.
Not taken: the wheel alone, and no wheel at all. `pca3d.md`, Open 1.

To be tried in the plan, in Safari and WebKit on a Mac: Safari sends a
pinch of the trackpad as events of its own, and not as a wheel with
Ctrl, so a pinch may not zoom the plot there; maps in a page zoom with
⌘ and the wheel on a Mac; and macOS, when its zoom of accessibility is
turned on, takes Ctrl and the scroll for itself. The buttons "Zoom in"
and "Zoom out" work in every case. If Ctrl clashes on a Mac, ⌘ is the
alternative there, and the plan brings it back to the owner.

### 11. An error cell of Excel: every error missing

Recommended: `#N/A` read as the text `#N/A`, as in the CSV Excel saves
from the same sheet. Decided by the owner instead: in an xlsx, `#N/A` is
a missing value, as Excel means it, "not available", and as a lookup,
`VLOOKUP`, gives it for a name it did not find; a column of heights with
one `#N/A` stays continuous. The CSV Excel saves from the same sheet
still writes `#N/A` as text, which is a value there, so the two files
give two tables. xlsx_rs gives the text of the error, and popnei_web's
reader makes it missing, beside `NA` and `-`.

The writers then kept the other six errors calamine knows, `#DIV/0!`,
`#NAME?`, `#NULL!`, `#NUM!`, `#REF!` and `#VALUE!`, as text, and put it
to the owner. Decided by the owner later on 28 September 2026: the six
are missing as well, as `#N/A` is, in popnei_web's reader; xlsx_rs
still gives the text of the error. Not taken: the six as text, so that
a broken formula made its column categorical and showed among its
values. What a user meets: a column of heights with one `#DIV/0!` stays
continuous, that individual with no height, and nothing in the column
shows that a formula of the sheet failed; the help says that every
error of Excel is read as missing. An error calamine does not know,
`#SPILL!` among them, still refuses the sheet, as `files.md` has it.
`files.md`, the table of the cells, its tests and Open 1;
`docs/specs/worker/individuals.md`, "The xlsx", its cases and tests;
`steps/individuals.md`, its help; `docs/functionality.md`, section 4.

### 12. The sheet read, said in a fixed line

Recommended: name the sheet read, "Read from the sheet Hoja1, the first
of 3 not hidden". Decided by the owner instead: a fixed line, "Read from
the first sheet of pops.xlsx; any other sheet is not read.", with no
name of the sheet. What a read reports does not change. The first sheet
is still the first in the order of the tabs that is not hidden, which
the help says. `docs/specs/worker/individuals.md`, Open 1;
`steps/individuals.md`.

## Recommended on 27 September 2026, not yet answered

Put to the owner in chat that day with its recommendation, which the
specs take as the meanwhile; an answer that differs changes the specs
named, and nothing else unless said. Points 2, 4, 5 and 7, put the same
day, are answered above.

### 6. The types the user set, kept when the file is read again

From stage 4 the user sets the type of each column. Changing the
separator of a CSV, or loading the file again, reads a new table, and
until now brought back the inferred types, open point 1 of
`docs/specs/core/project.md`. Recommended: each type set is kept by the
name of its column when the new values allow it, a binary type when the
column still has exactly those two values. A type the new read cannot
apply is not dropped: it waits, the column shows its inferred type, the
step says which types wait and why, and the type is applied again when a
later read allows it, so that correcting a wrong separator brings every
type back. A button beside that warning forgets the types that wait,
added by the writer of the spec (below). Not taken: dropping a type the
read cannot apply, which a wrong separator, making the file one column,
would do to every type set. Specs:
`project.md`, `steps/individuals.md`.

## Opened by the specs

Each with its options and its recommendation in the spec named, which is
the meanwhile. Points 9 to 12 are answered above.

13. **A page opened before a new version of the site is deployed.** The
   files of the 3D view and of the reader of xlsx are downloaded the
   first time they are needed, and a deploy removes those of the old
   version, so such a page fails to download them. Recommended: the
   screen says so and what works, save the project, reload the page and
   open it again. `docs/architecture.md`, section 11 and section 13,
   point 10.

14. **The legend over the plot hides the points under it.** The legend
   sits over the top right corner of the plot, as in the owner's widget,
   on a background, and the scale fills the whole plot, so the few points
   under it can be neither seen nor pointed at. Recommended: keep it
   over the plot, since the highlight of a population and the table of
   the individuals reach every point, and the plot keeps its full size.
   Not taken: a strip beside the plot for the legend, which makes the
   plot narrower, most on a phone. The owner answered on 27 September
   2026, "we'll fix those details when we have the application
   working": the recommendation stands meanwhile, and the point is
   judged on the running screen, when the owner tries the PCA panel.
   `scatter.md`, Open 1.

## Choices of a spec the owner may overrule

Each was decided by the writer of its spec, and each changes what a user
meets.

- **One analysis with the method as its option**, the PCA or the PCoA,
  and not two analyses: one panel, one plot, and the GWAS of stage 7
  takes its components as covariates whichever the method. The PCA's
  own filters apply to both, so that the two read the same variants
  (`pca.md`).
- **The PCA asks popnei for no weights of the variants**, so it reads the
  file once and not twice; the screen shows no weights (`pca.md`).
- **The result keeps the first 10 components.** popnei gives every
  component with variance, and at 9,381 individuals their projections
  would take 704 MB, above the 256 MB the cache of results holds
  (`pca.md`).
- **The colour, the components on the axes, and 3D or 2D are options of
  the PCA left out of its key**: saved in the project file and undone by
  Undo, and a change of them calculates nothing
  (`docs/architecture.md`, section 4).
- **The PCA locks while the metadata file is read, when it failed, and
  when individuals of the variants are missing from it**, although it
  only colours by it, since `docs/functionality.md` section 4 runs
  nothing until such a file is fixed; its result stays in the cache and
  comes back with no calculation. With no metadata file it runs, one
  group, "All individuals" (`pca.md`).
- **More than 9,381 individuals locks the PCA before its Run**, with
  words that point to popnei in Python, and not a warning after a Run
  that fails. For the PCA they are counted on the variants file, not on
  the individuals the filters keep, as popnei counts them, so the words
  do not suggest the filters of individuals; for the PCoA, whose limit
  popnei counts on the individuals of the pass, they are counted on
  the list of the individuals the filters keep, and the words offer the
  filters of individuals. That list is known from the project when the
  filters are lists, and, with a threshold, once the statistics of each
  individual are calculated; while they are not, the PCoA can run, and
  its Run calculates them first and then locks when more than 9,381 are
  kept, as the diversity does when the individuals kept leave no
  population (`pca.md`, "Why it cannot run").
- **The warnings of the PCA**: no LD filter applied, which a new
  project gives since the owner's decision of point 2; fewer variants
  used than individuals; and, for the PCoA, a warning whenever the
  distances were corrected, whatever the size of the correction, with
  its size in its words: on `panel.nei` with an LD filter at r² 0.1
  within 50,000 base pairs, the correction adds to every squared
  distance 53% of their mean, and draws two individuals of the same
  genotypes 0.22 apart; with no LD filter, 30% and 0.17. The share of
  the mean is worked out by the application from popnei's numbers,
  which popnei does not give as such (`pca.md`).
- **A PCA that ends the calculation worker, when it needed 250 MB or
  more**, 2,264 individuals for the PCA or the PCoA, is told as the tab lacking
  memory, with what to do: fewer individuals, other tabs closed, or
  popnei in Python. Where each browser really refuses is measured in the
  plan (`pca.md`).
- **The options of the PCA can be changed while it runs**, as those of
  every analysis: a change of what it calculates leaves the run behind,
  with the notice and its Undo; a change of the colour, the axes or the
  view keeps it. **Choosing for an axis the component another axis
  shows swaps the two** (`pca.md`).
- **The check numbers of the PCA**: the variants of its pass, and the
  share of the variance of the first three components; no projection
  (`pca.md`).
- **Every column but the first can colour the PCA**: a column of two
  values or of text by groups, a column of numbers by the colours of
  viridis, which people with a colour vision deficiency can tell apart;
  a column of groups, categorical or binary, of more than 1,000 different
  values is not offered,
  since no legend could show it. A colouring that would still give more,
  after a new file, is drawn as one group with a note, and so is a PCA
  coloured by a column the new file no longer has (`pca.md`,
  `scatter.md`).
- **The PCA comes before the diversity in the Analyses step**, since it
  is where the user checks the populations the diversity groups by
  (`pca.md`, `entry.md`).
- **The warning of few variants** is raised when the PCA used fewer
  variants than there are individuals (`pca.md`).
- **The legend** is a column of buttons over the top right corner of the
  plot, one tab stop, the Up and Down arrow keys moving between them; a press
  highlights a population and fades the others, and a second press
  clears it. The highlight is not saved (`scatter.md`).
- **The individuals of no population** are drawn as rings, not in a
  colour of their own, and counted in the legend (`scatter.md`).
- **The 3D view** starts turned 30° about the vertical and 20° up; its
  buttons turn it by 15°, look along one component, zoom and reset; it
  has no moving sideways, which a button could not do for a user who
  cannot drag. Switching to 2D and back starts the view again
  (`pca3d.md`).
- **In the 3D view the third component is up**, so that "View along
  PC3", looking straight down it, gives exactly the 2D plot of the first
  two; there, "Turn left" and "Turn right" spin the plot in its plane.
  Five presses of "Tilt down" from the start also look straight down
  PC3, but leave the plot turned by the 30° of the starting view. Not taken: the second component up, where the view
  along the second component falls where the controls of three.js
  cannot turn (`pca3d.md`).
- **The tooltip** of a point stays while the pointer is on it, does not
  cover its point, and Escape hides it; its coordinates have three
  significant digits and the true minus sign, and a value of a column is
  written whole, so that a year of 2019 is not "2,020" (`scatter.md`).
- **The exported legend** sits on a background, so that it can be read
  over a dense cloud of points; a faded entry of the legend fades its
  mark and not its name (`scatter.md`).
- **The selects of the components in 3D** read "First axis", "Second
  axis" and "Third axis, kept up", and not "Horizontal", "Vertical" and
  "Depth", since the view turns and only the third component keeps its
  direction (`pca.md`).
- **A file not sorted by position under an LD filter** is told in the
  same words by every calculation that applies one, the diversity, the
  Count, to whose words the writing of the filtered variants sends the
  user, and the PCA under the step's LD filter or its own: the chromosome and the two positions, and
  to sort the file or turn the filter off, the PCA's own words sending
  the user to the PCA's LD filter (`diversity.md`, "Its words";
  `pca.md`). The statistics of each individual read no filter since
  point A, and never meet it.
- **A browser without WebGL 2** gets words that say so, and the 2D plot;
  three.js has needed WebGL 2 since its release r163 (`pca3d.md`).
- **The one population is named "All individuals"**, and a project with
  a metadata file can choose it, "All individuals in one population". A
  metadata file loaded with no column chosen still locks the analyses
  per population until the user chooses a column or the one population
  (`project.md`, `steps/individuals.md`).
- **A number 1 and a text `1` in one column of an xlsx are one value**,
  compared by their text, so that a column where some cells were typed
  as numbers and some pasted as text is not split in two
  (`docs/specs/worker/individuals.md`, "The types of the columns").
- **Every column but the first has a select of its type**, even when its
  values allow one type (`steps/individuals.md`).
- **An xlsx**: the first sheet that is not hidden; a merged cell gives
  its value to every cell of its range, as Excel shows it; a date is
  written as `2024-05-13`; a sheet of more than 2,000,000 cells is
  refused (`files.md`).
- **The download of the reader of xlsx failing is a refusal of that
  file**, with words, and the next xlsx tries again; not a crash of the
  worker. Its words advise saving the project before reloading the page,
  as those of the 3D view do (`files.md`, `messages.md`).
- **What types a column allows is worked out in core from the table**,
  and saved nowhere, so that the format of the project file, which users
  keep, gains only the types the user set. It needs core to import the
  pure functions of the reader of the individuals file, which the lint of
  the code forbade; `.claude/skills/coding/configs.md` is revised to let
  that one file through (`project.md`; `docs/architecture.md`, section
  9).
- **A project saved while its metadata file was still being read, or
  had failed, opens asking for that file**: every analysis that uses it
  is locked, "pops.csv was not read when this project was saved, so the
  project file does not hold it. Load pops.csv again in the Individuals
  step.", the stepper shows Individuals to do and the summary line
  "pops.csv not loaded"; it never runs on one population while the
  project names a column of populations. Not taken: opening it as a
  project with no file, which ran the diversity on "All individuals"
  without a word (`projectFile.md`, `project.md`).
- **Loading a metadata file while the project is in one population**
  removes the diversity, with its notice, while the file is read; once it
  is read, the result comes back from the cache and the notice no longer
  names it (`project.md`, `store.md`).
- **A type set on a column that the new file puts first waits**, with
  words that say so, since the first column is always the names of the
  individuals; it comes back if a later file puts the column elsewhere
  (`steps/individuals.md`).
- **"Forget these types"**, a button beside the warning of the types
  that wait, so that a type set on a column the file no longer has is
  not warned of at every read; otherwise only removing the file, which
  loses every type set, would end it (`project.md`,
  `steps/individuals.md`).
- **"Copy the 12 names"**, a button that copies the individuals missing
  from the metadata file, one a line, for a user of the keyboard alone,
  who cannot select text without a mouse (`steps/individuals.md`).
- **The check of the individuals and the choice of the populations are
  not shown while the metadata file has no table**, being read, refused
  or not given by an opened project; the choice made is kept
  (`steps/individuals.md`).
- **A project file saved by the code of stages 2 and 3 while its
  metadata file was not read** holds no file, and opens on one
  population; only the owner's development files can be such
  (`projectFile.md`).
- **After a worker that could not start**, the words say to save the
  project before reloading the page, since a new version of the site
  deployed since the page was opened is one cause (`project.md`, Open
  4).

## The reader of xlsx in a project of its own, decided by the owner on 28 September 2026

The owner decided: "xlsx read should be a separate project following the
same conventions and skills that popnei follows. we could call it
xlsx_rs". So the reader of xlsx, which the specs of 27 September had as
a Rust crate of this repository built by the site, is **xlsx_rs**, a
project in a repository of its own, with popnei's `CLAUDE.md`, skills and
docs adapted to it, which releases its wasm package as popnei releases
its own. The site names a release by its URL in `package.json` and
installs it with `npm ci`, and the light worker imports it the first
time an xlsx is read, as before; a project of trial checked on 28
September 2026 that Vite, the tool that builds the site, puts a package
imported so, on first need, into a file of its own and finds its
`.wasm`. What a user meets does not change: the same
0.30 MB downloaded the first time an xlsx is read, the same cells and
the same refusals.

What it changes for the owner and for stage 4:

- **The site needs no Rust.** Rust 1.98.0 and `wasm-bindgen-cli`
  0.2.128, approved on 27 September 2026 for every machine that builds
  the site (above, "The new dependencies of stage 4, but calamine"), are
  no longer needed by it, nor the Rust setup of its workflow; they are
  needed only where xlsx_rs is built, on the owner's Mac.
- **A change of how an xlsx is read waits for a release of xlsx_rs**, a
  tag and the package built and packed by hand, about ten minutes, an
  estimate, and a new URL in the site.
- **The xlsx comes last in stage 4**, as the PCoA did while it waited
  for popnei: it waits for the repository of xlsx_rs and its first
  release (`docs/build-order.md`).
- **`files.md` is the first spec of xlsx_rs**, which moves there when
  its repository is made; what stays here, the light worker's import of
  the package, the refusal when it cannot be downloaded, and
  `readXlsxCells`, moved into `docs/specs/worker/individuals.md`, "The
  package of xlsx_rs, loaded on first need".

Considered and not taken: the crate in this repository, built by the
site, which needs Rust on every machine that builds the site and in
each of the three jobs of its workflow, and makes `npm run dev` about
1 s slower, 5.2 s the first time; and a crate of xlsx_rs published on
crates.io and built by the site, which keeps those costs and adds the
wait of a release, under another name, since `xlsx-rs`, which crates.io
takes as the same, belongs to another author. `docs/architecture.md`,
section 6, "The files wasm, the package of xlsx_rs", has the comparison;
section 13, points 11 to 14, the questions it opens: the owner decided
11 to 13 on 28 September 2026 (above), and 14 is below.
Revised with it: `files.md`, `docs/specs/worker/individuals.md` and
`site.md`; `docs/technology.md`, sections 2, 3, 4, 5 and 7, and
`docs/build-order.md`, stage 4; and the skills `coding` (`SKILL.md`,
`configs.md`, `worker.md`, `testing.md`), `code-review` and
`writing-plans`.

## Asked of the owner to make or approve

- **The repository of xlsx_rs**, `github.com/JoseBlanca/xlsx_rs`, to
  create, as decided on 28 September 2026 (above). It did not exist that
  day, and no session of popnei_web creates it (`docs/architecture.md`,
  section 13, point 11).
- **Where the zip of the report is made**, for stage 6. Recommended: in
  xlsx_rs, whose writer of xlsx brings the `zip` crate already. Not
  taken: in TypeScript, or with a library of JavaScript, a new
  dependency (`docs/architecture.md`, section 13, point 14).
- **Eight xlsx files for the tests of the reader**, in
  `tests/data/` of xlsx_rs, which a test cannot write: a small
  metadata sheet with a date column and a column of decimals, saved from
  Excel in Spanish and in English, from LibreOffice, in Excel's date
  system of 1904, with a password, as an old `.xls`, with a cell of
  `#SPILL!`, and, if possible, from Google Sheets. The file with `#SPILL!`
  settles whether the newest errors of Excel are refused by name or read
  as the text `#VALUE!`, which the specs cannot tell before it. `files.md` says what
  each holds. Until they exist, their tests are skipped and say so.
  Three of them, `excel_en.xlsx`, `encrypted.xlsx` and the sheet of
  10,000 rows a test of xlsx_rs writes, are copied into `e2e/fixtures/`
  of this repository for the flow of the Individuals step.

## Asked of popnei

The PCoA, asked on 27 September 2026, is in popnei's release
`js-v0.1.0-dev.3` of 28 September 2026. Of the four other asks, that
release gives none for the PCA, as checked that day in its code and in
node, and they stay asked:

- the limit of 9,381 individuals of the PCA counted on the individuals
  the filters keep, not on those of the file, so that a file of more can
  be analysed on a part of them; the release's PCoA counts them so, and
  its PCA does not;
- a progress while the PCA decomposes its matrix, which took 6.7 of the
  6.75 s of a PCA of 2,500 individuals in node, while the bar stood
  full; the release reports none for the PCA or the PCoA;
- the words of the PCA when no variant is left, as popnei's other
  calculations say it, with the counts of each filter; the release's
  PCoA words it so, and its PCA still says "there are no variants to do
  a PCA with";
- the called genotypes of each individual with the PCA, for the warning
  of point 9, "The individuals with many missing genotypes".

A fifth, a way to keep the variants a pruning left so that a second PCA
does not prune again, is not asked yet: the owner decided on 27
September 2026 to ask for it only if the time of the pruning, measured in
stage 4, is large (above, "1. The pruned variants are not kept between
two PCAs").

## popnei's release `js-v0.1.0-dev.3`

Made on 28 September 2026 from popnei's `main` at `eae29a2`; the
`package.json` of the application names it from the plan of stage 4,
in the place of `js-v0.1.0-dev.2`. What stage 4 meets in it:

- **The PCoA**, `doPcoaFromVariants`, with the names, the option and the
  fields the specs had taken from popnei's draft. It differs from the
  draft in its limit, 9,381 individuals and not 8,695, counted on the
  individuals of the pass; in its memory, where the draft counted a peak
  of 56.8 bytes per cell of the individuals × individuals matrix, the
  PCA's 48.8 and 8 for the projections, and the release measured 44.4,
  under node 26.8.2 on the owner's Apple M5 Pro on 27 September 2026, on
  VCFs of 300 variants and 8,695 to 9,413 diploid individuals, and counts
  the PCA's 48.8; and in the words of its refusals. The lock of a PCoA
  that popnei did not have is gone from the specs. `pca.md`, "The PCoA
  of popnei's release", has each difference.
- **Every options object refuses a key it does not know**, where
  `js-v0.1.0-dev.2` ignored it; the runner passes only popnei's keys
  (`runner.md`).
- **A written `.nei` file is larger**, 251,074 bytes for `panel.nei` at
  the missing data filter at 0.05 against 250,994, since the release
  writes version 1.1 of popnei's vars file; the tests and the flows that
  read the size of a written file take the new sizes (`runner.md`,
  `writeVariants.md`). The committed `e2e/fixtures/panel.nei` is read
  with the same numbers by both releases and is not written again.
- **The wasm is 72 KB larger gzipped**, 774,080 bytes against 701,996,
  measured by `gzip`; the build of stage 4 measures it as Vite does
  (`docs/architecture.md`, section 11).
- **`version()` still gives "0.1.0"**, as the two releases before it
  (`runner.md`).
- **The four needs of stage 3 that popnei lacked** are in it: the
  writer of the variants kept as a VCF, `writeVcf`; the filter by the
  regions of a BED file, `Variants.filterByRegions`; the histogram of the
  missing rate of each variant; and the density of variants along the
  chromosomes, `calcVarDensity` (`docs/build-order.md`).
  Stage 4 does not use them.

## Set by a measurement, not by the owner

Each has a value in its spec meanwhile, and the first work package that
meets it measures it:

- the time of the pruning inside a PCA, on `panel.nei` and on the files
  of 20,000 variants, which decides whether popnei is asked to keep the
  pruned variants (point 1, "The pruned variants are not kept between two
  PCAs");
- the time and the memory of a PCA in the three engines, at 1,000 to
  9,381 individuals, and whether 700 individuals is the right bound of
  point 8;
- the time to draw 9,381 points of 64 square pixels in WebKit, the
  engine of Safari, the slowest in the measurements of stage 2, against the 100 ms within
  which a redraw feels immediate (`scatter.md`);
- which of the headless engines of the tests, on the owner's Mac and on
  GitHub's machines, give WebGL, without which the tests of the 3D view
  are reported as not run (`pca3d.md`);
- the size of the files of three.js and of the reader of xlsx in the
  built site, the second with the first release of xlsx_rs. The time of
  a Rust build in CI, which was to set the timeouts of the workflow, is
  no longer measured: the site builds no Rust since 28 September 2026.

## Not repeated here

The open points of earlier stages that stage 4 does not touch stay in
their specs: the bound of the cache (`cache.md`), how far back undo goes
(`history.md`), and the words of the project file (`projectFile.md`).
