# The decisions of the specs of stage 4

27 September 2026, for the owner. Stage 4 of `docs/build-order.md` is the
Individuals step whole and the PCA: the metadata file read from an xlsx
as well as a CSV, the file made optional, the types of its columns set by
the user, and the principal components of the individuals, drawn in 2D
and in 3D. This file gathers what the specs of stage 4 ask the owner to
decide, what they decided alone that a user meets, what the owner is
asked to make or approve, and what is asked of popnei. None of the specs
is reviewed or approved yet.

The specs are, new: `docs/specs/analyses/pca.md`, the analysis and its
panel; `docs/specs/charts/scatter.md`, the 2D plot, and `pca3d.md`, the
3D one; `docs/specs/worker/files.md`, the reader of xlsx in Rust. Revised:
`docs/specs/steps/individuals.md`, rewritten whole; `docs/specs/core/project.md`,
`projectFile.md` and `store.md`; `docs/specs/analyses/diversity.md` and
`filterCounts.md`; `docs/specs/worker/protocol.md`, `messages.md`,
`runner.md`, `client.md` and `individuals.md`; `docs/specs/charts/plot2d.md`;
`docs/specs/shell.md`, `entry.md` and `site.md`. They are written against
the branch of stage 3, which is not merged yet, and against
`docs/architecture.md` as revised the same day, whose section 1 says what
changed.

A few words are used throughout. The **PCA** is the principal component
analysis of the genotypes, popnei's `doPcaFromVariants`; the **PCoA** is
the principal coordinate analysis of the Kosman distances between the
individuals, which popnei does not have yet and which the owner asked of
popnei on 27 September 2026. **Pruning** is popnei's filter of linkage
disequilibrium, which keeps a variant when its r² with every variant
already kept within a window of base pairs is at most a threshold. The
**calculation worker** is the thread of the tab that runs popnei; its
memory grows and never shrinks, and starting it again gives the memory
back.

## Decided by the owner on 27 September 2026

- **The PCoA is popnei's**, asked of popnei that day, and stage 4 builds
  it last, against popnei's draft of it, whose names are provisional
  until popnei's release.
- **The PCoA corrects a matrix that is not Euclidean by Lingoes'
  method**, as popnei's draft records the owner decided: popnei refuses
  such a matrix unless the correction is asked for, popnei_web asks for
  it by default, and warns its users that the distances were corrected.
  The Kosman distances of popnei's own test panel of 200 individuals,
  `tests/reference/dists/panel.vcf.gz`, give 44 negative eigenvalues, so
  the correction is the common case and not an exception (`pca.md`).
  Recorded at popnei's commit `2f7545f`, on its branch `spec/pcoa`.

## Recommended on 27 September 2026, not yet answered

Each was put to the owner in chat that day with its recommendation. The
specs take the recommendation as the meanwhile; an answer that differs
changes the spec named, and nothing else unless said.

### 1. The pruned variants are not kept between two PCAs

`docs/functionality.md` section 5 said the variants kept by the pruning
are kept for the next PCA. popnei cannot hold them: its pruning is a
step of the file made again at every pass, and it has no way to put a
list of variants back on a file. The one way through popnei, writing the
pruned file into memory and opening it again, holds the whole file in
the tab. Recommended: each PCA prunes again inside its one pass over the
file, which it makes anyway, so what keeping them would spare is the
calculation of r²; its time is measured in stage 4, and popnei is asked
for a way to keep them if it is large. Not taken: asking popnei now.
Specs: `pca.md`, `runner.md`; `docs/functionality.md` and
`docs/architecture.md`, section 5.

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
missing data filter at 0.1, the PCA uses 535 variants with its default
pruning and 1,175 with its pruning off. Not taken: the individuals
removed first for the PCA alone, so that its frequencies are those of the
individuals kept. Spec: `pca.md`, "Which variants it reads".

### 3. The PCA's default pruning

popnei gives no default. On popnei's test file of LD, with a window of
50,000 base pairs, plink2 at an r² of 0.3 keeps 41 variants, and popnei
keeps 46 at 0.15 and 35 at 0.1 (`docs/specs/filters.md` of popnei), so a
threshold of popnei is lower than the same habit in plink. Recommended:
an r² of 0.1 within 50,000 base pairs, on by default, unless the owner
knows better for the species of the users. It is a different thing from
the dataset's pruning filter, which starts at 0.3 within 10,000 when the
user turns it on (stage 3). Spec: `pca.md`, its options.

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
column still has exactly those two values; otherwise the inferred type,
and the step says which columns lost the type set, and why. Specs:
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

8. **The calculation worker started again after a PCA of more than 700
   individuals.** A PCA grows the memory of the worker by about 49 bytes
   per pair of individuals, 662 MB at 4,000 in node, which stays until
   the next load of the variants file: up to about 4.3 GB after a PCA of
   9,381. Recommended: start the worker again, which in stage 4 costs
   reading the header of the file, at most 49 ms. It is a second
   exception to the owner's decision of 26 September 2026 not to start
   it again between calculations, the first being a large written file.
   `pca.md`, Open 1; `client.md`; `docs/architecture.md`, section 13,
   point 9.
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
  that fails. They are counted on the variants file, not on the
  individuals the filters keep, as popnei counts them now, so the words
  do not suggest the filters of individuals (`pca.md`).
- **The warnings of the PCA**: the pruning turned off; fewer variants
  used than individuals; and, for the PCoA, a warning whenever the
  distances were corrected, whatever the size of the correction, with
  its size in its words: on popnei's panel, the correction adds to every
  squared distance 30% of their mean, and draws two individuals of the
  same genotypes 0.17 apart. The share of the mean is worked out by the
  application from popnei's numbers, which popnei does not give as such
  (`pca.md`).
- **The PCoA is locked before popnei's release has it**, with words, for
  a project that asks for it, a project file among them; the method is
  not offered otherwise until then (`pca.md`).
- **A PCA that ends the calculation worker, when it needed 250 MB or
  more**, 2,264 individuals for the PCA, is told as the tab lacking
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
  a column of text of more than 1,000 different values is not offered,
  since no legend could show it. A colouring that would still give more,
  after a new file, is drawn as one group with a note, and so is a PCA
  coloured by a column the new file no longer has (`pca.md`,
  `scatter.md`).
- **The PCA comes before the diversity in the Analyses step**, since it
  is where the user checks the populations the diversity groups by
  (`pca.md`, `entry.md`).
- **The warning of few variants** is raised when the PCA used fewer
  variants than there are individuals (`pca.md`).
- **The legend** is a row of buttons over the top right corner of the
  plot, one tab stop, the arrow keys moving between them; a press
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
- **A browser without WebGL 2** gets words that say so, and the 2D plot;
  three.js has needed WebGL 2 since its release r163 (`pca3d.md`).
- **The one population is named "All individuals"**, and a project with
  a metadata file can choose it, "All individuals in one population". A
  metadata file loaded with no column chosen still locks the analyses
  per population until the user chooses a column or the one population
  (`project.md`, `steps/individuals.md`).
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
  had failed, opens asking for that file**: the analyses per population
  are locked with words that say to load it again in the Individuals
  step, and never run on one population while the project names a
  column of populations (`projectFile.md`, `project.md`).

## Asked of the owner to make or approve

- **Eight xlsx files for the tests of the reader**, in
  `crates/files/tests/data/`, which a test cannot write: a small
  metadata sheet with a date column and a column of decimals, saved from
  Excel in Spanish and in English, from LibreOffice, in Excel's date
  system of 1904, with a password, as an old `.xls`, with a cell of
  `#SPILL!`, and, if possible, from Google Sheets. `files.md` says what
  each holds. Until they exist, their tests are skipped and say so.
- **New dependencies**, for the plan of stage 4 to name and the owner to
  approve with it: three.js 0.186.1, loaded only when the 3D view is
  first shown, 134 KB gzipped; its types, `@types/three` 0.186.0, for
  development, which bring six packages that never reach the site, one
  of them 7.5 MB unpacked; the modules of D3 the scatter uses that stage
  3 did not, `d3-shape`, `d3-path` and `d3-scale-chromatic`, with their
  types; calamine 0.36.1 in the crate, 0.30 MB gzipped, downloaded the
  first time an xlsx is read, and `rust_xlsxwriter` 0.99.1 for its tests
  alone; Rust 1.98.0 and `wasm-bindgen-cli` 0.2.128 on every machine that
  builds the site, CI among them. `d3-delaunay`, which
  `.claude/skills/coding/charts.md` listed for finding the point under the
  pointer, is not needed: a plain loop over 50,000 points took 0.027 ms
  in node.

## Asked of popnei

Besides the PCoA, asked on 27 September 2026, the specs ask:

- the limit of 9,381 individuals of the PCA counted on the individuals
  the filters keep, not on those of the file, so that a file of more can
  be analysed on a part of them;
- a progress while the PCA decomposes its matrix, which took 6.7 of the
  6.75 s of a PCA of 2,500 individuals in node, while the bar stood
  full;
- the words of the PCA when no variant is left, as popnei's other
  calculations say it, with the counts of each filter;
- the called genotypes of each individual with the PCA, for the warning
  of point 9;
- a way to keep the variants a pruning left, only if point 1 measures
  its time as large.

## Set by a measurement, not by the owner

Each has a value in its spec meanwhile, and the first work package that
meets it measures it:

- the time of the pruning inside a PCA, on `panel.nei` and on the files
  of 20,000 variants, for point 1;
- the time and the memory of a PCA in the three engines, at 1,000 to
  9,381 individuals, and whether 700 individuals is the right bound of
  point 8;
- the time to draw 9,381 points of 64 square pixels in WebKit, the
  slowest engine of the walking skeleton, against the 100 ms within
  which a redraw feels immediate (`scatter.md`);
- which of the headless engines of the tests, on the owner's Mac and on
  GitHub's machines, give WebGL, without which the tests of the 3D view
  are reported as not run (`pca3d.md`);
- the time of the Rust build and of the tests in CI, cold and with its
  cache, which set the timeouts of the workflow (`site.md`);
- the size of the files of three.js and of the reader of xlsx in the
  built site.

## Not repeated here

The open points of earlier stages that stage 4 does not touch stay in
their specs: the bound of the cache (`cache.md`), how far back undo goes
(`history.md`), and the words of the project file (`projectFile.md`).
