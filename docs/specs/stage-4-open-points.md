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
stage 3.

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
**calculation worker** is the thread of the tab that runs popnei; its
memory grows and never shrinks, and starting it again gives the memory
back.

## Decided by the owner on 27 September 2026

- **The PCoA is popnei's**, asked of popnei that day, and stage 4 builds
  it last. It was specified against popnei's draft of it, and is now in
  popnei's release `js-v0.1.0-dev.3`, whose names are the draft's.
- **The PCoA corrects a matrix that is not Euclidean by Lingoes'
  method**, as the owner decided: popnei refuses
  such a matrix unless the correction is asked for, popnei_web asks for
  it by default, and warns its users that the distances were corrected.
  The Kosman distances of `e2e/fixtures/panel.nei`, 200 individuals,
  with the PCA's filters and its pruning at r² 0.1 within 50,000 base
  pairs, give 61 negative eigenvalues of 200, 7.94% of the variance, and
  45 with the pruning off, so the correction is the common case and not
  an exception (`pca.md`). Recorded in popnei's `docs/specs/pca.md`,
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

### 3. The PCA's pruning: r² 0.1, and no default distance

popnei gives no default of either. On popnei's test file of LD, with a
window of 50,000 base pairs, plink2 at an r² of 0.3 keeps 41 variants,
and popnei keeps 46 at 0.15 and 35 at 0.1 (`docs/specs/filters.md` of
popnei), so a threshold of popnei is lower than the same habit in plink.
Decided: the pruning is on by default at an r² of 0.1, as recommended,
and its distance has no default, in the owner's words because "the
distance really depends on the LD/recombination of the regions, so I
don't think we can set a default, the user should choose." Not taken: a
default distance of 50,000 base pairs, which was recommended.

What a user meets: the PCA of a new project cannot run until the user
types a distance or turns the pruning off, which gives the warning of
the pruning off on the result. The reason is text beside the field of
the distance and beside the disabled Run button: "The LD pruning of the
PCA needs the distance within which variants are compared. It has no
default, because it depends on how far linkage disequilibrium extends
in the genome of your species. Type a distance in base pairs, or turn
the pruning off." The help says the same, and points to the LD decay of
stage 5, once it exists, as the way to choose the distance. When the
dataset's own LD filter is on, the PCA does not prune again, asks for no
distance and is not locked by its own pruning, since that filter has its
own; while that filter's distance is not typed yet, the PCA is locked by
it (point 16).

In the specs, the option of the PCA's pruning holds whether it is on,
its r² and its distance, the distance empty until the user types one.
Turning the pruning off keeps the r² and the distance, so that turning
it on again gives them back and a distance once typed is not asked for
again, as the writers settled on 27 September 2026. A project file saved
before the distance was typed opens with it still empty; the key of the
result, the hash of what the result was calculated from, holds the
pruning as the user set it while it is on, and leaves out the r² and
the distance kept while it is off, which the result was not calculated
from;
and the Python script that the project gives, which calculates the same
results with popnei in Python, has no lines for a PCA that cannot run. The LD filter of
the Variants step, which starts at an r² of 0.3 when the user turns it
on, is a different thing, and this point did not change it; its
distance, 10,000 base pairs in stage 3, starts empty since point 16.
Specs: `pca.md`, its options, "Why it cannot run", the panel
and the help; `runner.md`, whose test types the distance;
`docs/functionality.md`, section 5 and open point 4.

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
site, one of them 7.5 MB unpacked; the modules of D3 the scatter uses
that stage 3 did not, `d3-shape`, `d3-path` and `d3-scale-chromatic`,
with their types; and Rust 1.98.0 and `wasm-bindgen-cli` 0.2.128 on
every machine that builds the site, CI among them. calamine is not
approved yet (below, "Asked of the owner to make or approve").

## Decided by the owner on 28 September 2026

### 16. The LD filter of the Variants step starts with no distance

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
filter." Until a distance is typed, what reads the filters is locked
with the same words, ending "in the Variants step" where they are shown
in another step: in the Variants step, the Count of what each filter
kept, the statistics of each individual and the writing of the
filtered variants; in the Analyses step, the diversity and the PCA. An
analysis that read only the filters of individuals would be locked
too, since the individuals a threshold keeps come from the statistics
of each individual; none does in stages 2 to 4. The histograms of the
variants read no filter and can still be calculated. No count is shown
beside the filters, and the stepper shows the Variants step with a
problem. The summary line under the stepper counts the filter among
the filters and says nothing of its distance. The PCA does not prune
again when the dataset has an LD filter, with or without its distance,
so it asks for no distance of its own and is locked by the dataset's
filter until that distance is typed. The help says why there is no
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
the same lock. Turned off, the filter leaves the project as the others
do, and turned on again starts empty, where the PCA's pruning keeps the
distance typed.

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

This changes the code of stage 3, which is built: `LD_DIST_TURNED_ON`,
the 10,000 base pairs the switch starts at in
`src/ui/steps/variants/commands.ts`, which the plan of stage 4 removes
with its test, so that `turnedOnFilter("ld")` gives the filter with
`maxDist` `null`; the type of the filters in the project, the locks of
the store, the jobs of the Count, the statistics, the writing and the
diversity, the field of the distance, and the validation of the
project file. The plan of stage 4 carries the change.
Specs: `steps/variants.md`, "The distance of the LD pruning";
`project.md`, `variantFilterNeeds`, the reason of the lock, and
`jobFilters`; `store.md`; `keys.md`; `projectFile.md`; `protocol.md`;
`pca.md`; `filterCounts.md`, `individualChecks.md`, `writeVariants.md`
and `diversity.md`; `shell.md`; `docs/functionality.md`, sections 3 and
5 and open point 4; `docs/architecture.md`, sections 1, 2 and 4.

## Recommended on 27 September 2026, not yet answered

Each was put to the owner in chat that day with its recommendation. The
specs take the recommendation as the meanwhile; an answer that differs
changes the spec named, and nothing else unless said.

### 2. Which variants the PCA reads

The PCA has a MAF filter of its own, at 0.95, and a pruning of its own,
and popnei takes one filter of each kind on a file. Recommended: the
PCA reads the dataset's filters with two changes, its MAF threshold the
stricter of the dataset's and its own, and one pruning, the dataset's
when it has one and otherwise its own; then the individuals the filters
keep, last, as in every analysis. So the frequencies and the r² are
counted over every individual of the file, as the dataset's filters are,
and a PCA reads the same variants as every other analysis with the same
filters, but for its MAF and its pruning. On `panel.nei`, with the
missing data filter at 0.1, the PCA uses 535 variants with its pruning
at r² 0.1 within 50,000 base pairs and 1,175 with its pruning off. Not taken: the individuals
removed first for the PCA alone, so that its frequencies are those of the
individuals kept. Spec: `pca.md`, "Which variants it reads".

### 4. Variants of more than two alleles

popnei's PCA refuses a file that has one, unless it is told to count
every allele that is not the major one as the same. Recommended: count
them so, and say so in the help; the user could not mend the file in the
application, which has no filter of such variants. popnei does not say
how many there were, so no warning counts them. Spec: `pca.md`.

### 5. The PCA opens in 2D

`docs/functionality.md` section 5 said the PCA is shown in 3D; the build
order builds 2D first. Recommended: the panel opens on the 2D plot of the
first two components, and 3D is one button away. The 2D plot is what the
export and the report carry and what a screen reader's description says,
and it needs no WebGL, no download of three.js and no rotation.
`docs/functionality.md` is revised so, as the meanwhile. Specs: `pca.md`,
`scatter.md`, `pca3d.md`.

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

### 7. The lasso out of stage 4

Selecting points on the PCA to assign a population, which the owner's
widget `any_scatter3d` does. Recommended: not in stage 4, since it needs a
design of its own, an edit of the populations made on a plot changing
the keys of every analysis that reads them, and a way for the keyboard.
Stage 4 takes from the widget the legend that highlights a population,
the legend over the plot, the individuals of no population in a mark of
their own and counted, and the bar of buttons above the plot.

## Opened by the specs

Each with its options and its recommendation in the spec named, which is
the meanwhile.

9. **The individuals with many missing genotypes.** The PCA gives a
   missing genotype the mean of its variant, which pulls an individual
   with many of them toward the centre of the plot. popnei's PCA does not
   say how many genotypes each individual had. Recommended: a note under
   the plot naming the individuals above 0.2 of missing genotypes, when
   the statistics of each individual of the Variants step are already
   calculated for the filters as they are, and a warning kept with the
   result once popnei gives the counts. Not taken: a Run of the PCA that
   calculates those statistics first, a pass more. `pca.md`, Open 2.
10. **Whether the mouse wheel zooms the 3D view.** If it does, a user
   who scrolls the panel with the pointer over the plot zooms the plot
   instead. Recommended: the wheel zooms with the Ctrl key held, as maps
   in a page do, which also gives the pinch of a Mac's trackpad; the
   wheel alone scrolls the page. `pca3d.md`, Open 1.
11. **An error cell of Excel, `#N/A`.** Recommended: read as the text
   `#N/A`, as in the CSV Excel saves from the same sheet, so nothing is
   left out without the user seeing it; the user replaces it with `NA`.
   Not taken: read as missing, as Excel means it. `files.md`, Open 1.
12. **The name of the sheet read from an xlsx, shown beside the file.**
   The first sheet read is the first that is not hidden, which a user
   may not know. Recommended: name it, "Read from the sheet Hoja1, the
   first of 3 not hidden", which adds the sheet to what a read reports.
   Meanwhile a line says only that the first sheet was read.
   `docs/specs/worker/individuals.md`, Open 1.
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
  takes its components as covariates whichever the method. The MAF and
  the pruning apply to both, so that the two read the same variants
  (`pca.md`).
- **The PCA asks popnei for no weights of the variants**, so it reads the
  file once and not twice; the screen shows no weights (`pca.md`).
- **The result keeps the first 10 components.** popnei gives every
  component with variance, and at 9,381 individuals their projections
  would take 704 MB, above the 256 MB the cache of results holds
  (`pca.md`).
- **The colour, the components on the axes, and 2D or 3D are options of
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
- **The warnings of the PCA**: the pruning turned off; fewer variants
  used than individuals; and, for the PCoA, a warning whenever the
  distances were corrected, whatever the size of the correction, with
  its size in its words: on `panel.nei` with the pruning at r² 0.1
  within 50,000 base pairs, the correction adds to every squared
  distance 53% of their mean, and draws two individuals of the same
  genotypes 0.22 apart; with the pruning off, 30% and 0.17. The share of
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
- **In the 3D view the third component is up**, so that looking straight
  down it, five presses of "Tilt down" from the start, gives exactly the
  2D plot of the first two; there, "Turn left" and "Turn right" spin the
  plot in its plane. Not taken: the second component up, where the view
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
- **A file not sorted by position under the LD filter of the Variants
  step** is told in the same words by every calculation, the diversity,
  the Count and the statistics of each individual as well as the PCA:
  the chromosome and the two positions, and to sort the file or turn the
  filter off (`diversity.md`, "Its words").
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
September 2026 that Vite builds a package imported so into a file of its
own and finds its `.wasm`. What a user meets does not change: the same
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
section 13, points 11 to 14, the questions it opens, which are below.
Revised with it: `files.md`, `docs/specs/worker/individuals.md` and
`site.md`; `docs/technology.md`, sections 2, 3, 4, 5 and 7, and
`docs/build-order.md`, stage 4; and the skills `coding` (`SKILL.md`,
`configs.md`, `worker.md`, `testing.md`), `code-review` and
`writing-plans`.

## Asked of the owner to make or approve

- **The repository of xlsx_rs**: to confirm its name and its place,
  `github.com/JoseBlanca/xlsx_rs`, public as popnei is, which the specs
  assume, and to create it. The name was free on npm on 28 September
  2026. No session of popnei_web creates it (`docs/architecture.md`,
  section 13, point 11).
- **How xlsx_rs makes its releases.** Recommended: by hand, as popnei
  makes its own, a tag `js-v0.1.0-dev.1` and the packed package attached
  to a pre-release, and a workflow for both projects when popnei has
  one. Not taken: a workflow for xlsx_rs first, hours of work
  (`docs/architecture.md`, section 13, point 13).
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
- **calamine 0.36.1 in xlsx_rs**, 0.30 MB gzipped, downloaded the
  first time an xlsx is read, and `rust_xlsxwriter` 0.99.1 for its tests
  alone. Not approved yet: on 27 September 2026 the owner was weighing
  making the reader of xlsx a project of its own, which the owner decided
  on 28 September 2026 (above). It is the owner's to approve, now as a
  dependency of xlsx_rs; its first release waits for it
  (`docs/architecture.md`, section 13, point 12). The other new
  dependencies were approved on 27 September 2026 (above). `d3-delaunay`, which
  `.claude/skills/coding/charts.md` listed for finding the point under the
  pointer, is not needed: a plain loop over 50,000 points took 0.027 ms
  in node.

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
  slowest engine of the walking skeleton, against the 100 ms within
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
