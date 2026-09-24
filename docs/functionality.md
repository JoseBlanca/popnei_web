# popnei web: what the applications do

September 2026, first draft. The analyses a user can run in the web
applications of popnei, what each one gives and with what defaults, what
the user takes out of them, and what was left out on purpose and why. How
the applications look and in which order they lead the user through the
steps is decided in their own document; this one is the functionality
alone.

The applications run popnei in the tab, through its wasm package, as
`docs/architecture.md` of popnei describes in its section 11. The data of
the user never leaves the browser.

## 1. Two applications

There are two applications, because their users, their inputs and their
questions have nothing in common:

- **Population genetics**: the diversity of a set of populations and how
  they differ. It takes the variants and a metadata file that assigns the
  individuals to populations.
- **Association**: the variants associated with a trait, the GWAS. It
  takes the variants and a traits file; its individuals usually belong to
  one population.

They share the step that reads, checks and filters the variants (section
3), the format of the files of the individuals (section 4), the PCA of
the individuals, and the way the work is taken out (section 9). A
variants file saved from one opens in the other. The start page offers
both.

## 2. Principles

- **Lean.** The applications offer what about 95% of the users need. The
  other 5% use the Python API of popnei, and the applications help them
  get there with the script of section 9.
- **Right defaults.** Every analysis runs with defaults that are right
  for most datasets, and a user who changes none of them gets a sound
  result. An option is added only when a common case needs it.
- **Nothing that misleads without warning.** An analysis whose
  assumptions commonly fail, and whose users do not notice when they do,
  is left out, or comes with a measure of how well its assumptions hold.
  Section 10 lists what this rule excluded.
- **Everything leaves the application, and can be done again.** Every
  table can be downloaded as CSV and every plot as SVG or PNG, and a
  project file restores the settings of an analysis so that it can be run
  again (section 9).

## 3. The variants, in both applications

### Reading and writing

- Read a VCF, gzipped or bgzipped or plain, and a `.nei` file, popnei's
  vars file.
- Write the variants, after the filters, as a VCF or as a `.nei` file.
  Converting a VCF to `.nei` once is what the applications suggest, since
  the `.nei` file is read many times faster.

### What the dataset holds

The number of individuals, the number of variants, the ploidy, the
chromosomes with their number of variants.

### The filters of variants

Each filter is optional. The applications report, for each filter of a
pass, how many variants it was given and how many it kept, which popnei
gives already.

| filter | keeps a variant when | default |
|---|---|---|
| missing data | its proportion of missing genotypes is at most a threshold | on, threshold to decide |
| major allele frequency (MAF) | the frequency of its commonest allele is at most a threshold | on for the PCA and the GWAS, 0.95; off otherwise |
| observed heterozygosity | its observed heterozygosity is at most a threshold | off |
| genomic regions | it falls inside a region of a BED file | off |
| linkage disequilibrium (LD pruning) | it is not in LD above a threshold with a variant already kept | off as a filter of the dataset, where it serves to thin a large one; on inside the PCA (section 5) |

The thresholds are popnei's, and each filter keeps what is at most its
threshold, as popnei's filters do; the number the user types is the one
popnei is given (`docs/specs/worker/protocol.md`). The MAF is the major
allele frequency, popnei's, as the owner decided on 24 September 2026, and
not the minor allele frequency: for a variant with two alleles, a major
allele frequency of at most 0.95 is a minor one of at least 0.05, but for
a variant with three or more alleles it is not, since the other alleles
share the rest, and a variant with alleles at 0.90, 0.06 and 0.04 is kept.

### The filters of individuals

- By a list of individuals to keep or to remove.
- By their proportion of missing genotypes, above a threshold.
- By their observed heterozygosity, above a threshold, which catches
  contaminated and mixed samples.

For each individual, its proportion of missing genotypes and its observed
heterozygosity are shown, as a table and as histograms, before the
thresholds are chosen. A high heterozygosity in a selfing species is
itself a finding.

## 4. The files of the individuals

### Two files, one format

A file of the individuals is a table with one row per individual. The
first column holds the names of the individuals, which must match those
of the variants; the other columns hold anything the user knows of them.
Each application takes its own:

- **The metadata file**, in population genetics: the country of origin, a
  morphological classification, a collection. The user picks which column
  defines the populations, and can change it without editing the file. An
  individual with an empty value in that column belongs to no population
  and is left out of the calculations per population. The file is
  optional; without it, every individual belongs to one population.
- **The traits file**, in association: the traits, and the covariates,
  which are often what one would call metadata, the trial, the location,
  the year. It is required, since the GWAS needs a trait. An individual
  with an empty value in a trait is left out of the GWAS of that trait.

Both have the same format and are read by the same reader, so a user who
keeps everything in one sheet gives that sheet to both applications.

When a file is given, every individual of the variants must be in it. One
that is not is an error, and the application names the missing
individuals and runs nothing until the file is fixed. The file may hold
individuals that are not in the variants, which are ignored, so that one
file can serve several variant files of the same collection.

### The format

Most users make these files in Excel, whose default file is `.xlsx`, and
whose CSV depends on the language of the computer: in Spanish, German or
French it separates the fields with `;` and writes decimals with a comma,
and its encoding varies with the version. So:

- `.xlsx` is read directly, the first sheet of the file, with calamine,
  which is pure Rust, in a small Rust crate of the applications
  (`docs/architecture.md`, section 6; `docs/technology.md`).
- CSV and TSV are read by the applications, in TypeScript, and a BOM at
  the start of the file is removed.
- Their encoding, their separator and their decimal mark are detected,
  and the user can set each one when the detection is wrong, as the owner
  decided on 24 September 2026. The encoding is UTF-8 when the file is
  valid UTF-8, and otherwise Windows-1252, which is what Excel on Windows
  writes for "CSV (comma delimited)" in Spanish and the other languages of
  Western Europe; the separator is `,`, `;` or a tab; the decimal mark is
  a point or a comma. What was used is shown beside the file, with a way
  to change it. No file is refused for its encoding.
- Missing values are an empty cell, `NA` or `-`.
- The file is written as `.xlsx` for the user and as TSV for scripts and
  the Python API.

### The types of the columns

The GWAS and the covariates need to know what a column holds. The
application infers a type for each column and the user can change it; the
types are kept in the project (section 9), not in the file, because a row
of types in a sheet edited in Excel would be broken or misunderstood.

| type | inferred when | used for |
|---|---|---|
| identifier | the first column, always | naming the individuals, matched to those of the variants |
| binary | the column has two distinct values, numbers such as 0/1 and 1/2, or text such as yes/no, case/control | a binary trait, a covariate, populations |
| continuous | the column holds numbers with more than two distinct values; a column of a few integer levels, such as a score from 1 to 5, is continuous with a warning | a continuous trait, a covariate |
| categorical | anything else | populations, a covariate, the colour of the PCA |

A binary column also has its coding, which of its two values is 1, the
case, and which 0, kept in the project with its type: the application
proposes one and the user can change it. The GWAS and the Python script
use it.

In the traits file each column also has a role: trait, covariate, or
ignored. A continuous or binary column is a trait by default, the others
are ignored.

## 5. The PCA of the individuals, in both applications

A principal component analysis of the individuals, to see the structure
of the dataset, check the populations against it, and, in association,
give the principal components that go into the GWAS as covariates.

- The default is a PCA of the genotypes as 0, 1, 2 counts, after the MAF
  filter at 0.95 and LD pruning, both applied for the PCA alone. The
  pruning is on by default and can be turned off, with a warning on the
  result that linked regions can dominate the components. When the
  filters of the dataset have pruned already, the PCA does not prune
  again. The pruned variants are kept for the next PCA, since pruning is
  costly.
- The alternative is a principal coordinate analysis (PCoA) of the Kosman
  distances between the individuals, for data with a lot of missing
  genotypes.
- It is shown in three dimensions, drawn with WebGL, the first three
  components by default, with the variance each one explains.
- The points are coloured by any column of the file of the individuals:
  a population or a metadata column, or a trait in association.
- Later, not in the first version: selecting a group of points with a
  lasso to assign or rename a population, which writes into the
  populations of the project.

## 6. Each population

### Diversity

For each population, over the variants:

- The expected heterozygosity, unbiased (Nei's).
- The observed heterozygosity.
- The inbreeding coefficient, F = 1 − Ho/He.
- The proportion of polymorphic variants, a variant being polymorphic when
  its commonest allele has a frequency of at most 0.95, the default.
- The mean number of alleles per variant.
- The number of private alleles, alleles found in this population and in
  no other.

Each is given with the number of individuals of the population beside it.

### Rarefaction

The number of alleles, the proportion of polymorphic variants and the
private alleles grow with the number of individuals sampled, so
populations of 8 and of 60 individuals cannot be compared as they are.
The application rarefies them to a common sample size, by default the
size of the smallest population, and gives the raw and the rarefied
values. It warns when a population is so small that the rarefied values
of all of them rest on few individuals.

### The site frequency spectrum

The site frequency spectrum (SFS) of each population: how many variants
have their minor allele in 1, 2, ... of the sampled chromosomes.

- Folded by default, since most users do not know the ancestral allele.
  Unfolded when the user gives the ancestral allele, a case to decide
  (open point 3).
- Missing genotypes and populations of different sizes make the spectra
  of different variants and populations incomparable, so the spectra are
  projected down to a common number of chromosomes.

### LD decay

The linkage disequilibrium, r² of Rogers and Huff, between pairs of
variants against the physical distance between them, per population, as
a plot, with one number that sums it up: the distance at which r² falls
to half of its maximum. The application warns when a population has few
individuals, because r² is then biased upwards.

## 7. Between populations

- A matrix of distances between the populations, with Hudson's Fst as the
  default and Jost's D as the alternative.
- Shown as a heatmap, with the populations ordered so that similar ones
  are together, and as a table.

## 8. The GWAS

An association between each variant and a trait of the individuals.

- **The trait** is a continuous or binary column of the traits file.
- **A transformation** of a continuous trait: none, log, or rank based
  inverse normal. The histogram of the trait is shown before and after.
- **The model** follows from the type of the trait: linear for a
  continuous trait, logistic for a binary one, which are the null models
  of popnei. The kinship between the individuals is included by default,
  and can be turned off.
- **Covariates**: the columns of the traits file with the role of
  covariate, and the first k principal components of the individuals, k
  to decide.
- **The results**:
  - a Manhattan plot of the p values, with the thresholds of Bonferroni
    and of the false discovery rate drawn on it;
  - a QQ plot of the p values, with the genomic inflation factor λ;
  - a table of the variants, sortable, with the effect, its standard
    error, the MAF and the p value;
  - the pseudo heritability of the trait, from the mixed model.

## 9. Taking the work out, and doing it again

Two things are taken out: a project file, for the application, which
holds the settings of an analysis and none of its results; and a report,
for people, which says what was done and what came out and needs no
application to be read.

### Any table or plot

From where it is shown, every table as CSV and every plot as SVG or PNG.

### The project file

A JSON file, `<name>.popnei.json`. JSON because it can be read in any
editor, compared between two versions, and read natively by TypeScript and
by Python. It holds:

- **A header**: the version of the format, the application it belongs
  to, population genetics or association, the versions of popnei and of
  the application, and the date.
- **The identity of the variant file**: its name, its size, its number of
  variants, its ploidy and the list of its individuals. It serves only to
  say, when the project is opened again, whether the file given is the one
  the project was made with. Nothing is hashed from the file: every
  analysis is calculated again whenever a variant file is given, the same
  one included, so the identity never decides whether a result is
  reused.
- **The file of the individuals, whole**: its rows, the types of its
  columns and, in the traits file, their roles; in population genetics,
  the column that defines the populations and the population of each
  individual. It is kept whole because it is small, so that a project
  needs no file other than the variants, and because the populations
  edited in the application, with the lasso, are in no file of the
  user.
- **The filters of the dataset, in their order, with their parameters.**
- **The options of each analysis**, those that were run and those that
  were set, with the preprocessing of the analysis itself, such as the
  pruning of the PCA.
- **A few numbers of each result that was run**: the mean expected
  heterozygosity of each population, the Fst matrix, the λ and the top
  hit of a GWAS. They are there to check a new run against, never shown
  as results.

Opening a project:

1. The application asks for the variant file, and names the one the
   project was made with.
2. It compares the identity of the file given with the one in the
   project, the name, the size, the individuals and the ploidy as soon as
   the file is open, and the number of variants once the first pass has
   counted it. When they differ it warns, and says in what: "The
   project was made with panel_2026.nei, 342 individuals and 1,203,554
   variants; this file has 360 individuals". It does not refuse, because
   running the settings of one analysis on a new batch of the same
   collection is a use of the project, and it calculates everything again
   in any case.
3. It restores the filters, the file of the individuals, the populations
   and the options of the analyses. No result is loaded: every analysis is
   ready to run, and one action runs them all.
4. After a run, it compares the numbers of the result with those of the
   project, and says whether they are the same or differ, and what
   changed that could explain it, the variant file or the version of
   popnei. This is what catches a file with the same individuals and
   number of variants as the project's and other genotypes, which the
   comparison of step 2 lets pass: the numbers come from the genotypes.

### The report

One zip, with:

- `report.html`, one self-contained page that opens anywhere and prints
  to PDF: the input files and their identity, the name, the number of
  individuals and of variants, the list of the individuals; the filters
  with what each one kept; the populations with their sizes; each
  analysis with its parameters, its table, its plot and the warnings it
  raised; the versions of popnei and of the application.
- `project.popnei.json`, the project file.
- The file of the individuals as `.xlsx`, as it is in the application,
  with the populations assigned there, in the format that the application
  reads, so that it can be edited and loaded again.
- `individuals_kept.txt`, the individuals left after the filters.
- `results/`, every table as CSV, and `plots/`, every plot as SVG.
- `reproduce.py`, below.
- Optionally, the filtered variants as a `.nei` file, off by default
  because it can be large.

### The Python script

A script that does the same analyses with the Python API of popnei,
written out call by call: the files read, the filters with their
thresholds, the file of the individuals, which the script reads from the
`.xlsx` of the report with pandas, the populations, which it builds in
plain Python from the column chosen, named by its name, with the types of
the columns kept in the project, the analyses with their options,
and the warnings of the application as comments. It is written out, and
does not read the project file, because it is meant to be read: it is
what a user who outgrows the application learns the API from.

## 10. What is left out, and why

| analysis | why it is left out |
|---|---|
| ancestry and admixture bar plots, as STRUCTURE and ADMIXTURE draw | their models assume random mating, and in autogamous species, as many plants are, they give clusters that are not populations; users do not know it. They would come back with a model that includes F, a piece of research of its own |
| trees of populations or individuals, NJ and UPGMA | a tree drawn from populations with admixture is misleading, and users do not know it. It would come back only with a measure of how tree-like the distance matrix is |
| nucleotide diversity, π, and Tajima's D | they need the invariant sites, which a VCF of SNPs does not have, and computed over the variants alone they are wrong |
| AMOVA | the few who need it can use the Python API |
| selection scans, Fst per variant | the same |
| demographic inference from the SFS | the same |
| haplotype statistics, imputation, phasing | outside what popnei does |
| filtering variants by Hardy-Weinberg equilibrium | with structure or selfing, most variants depart from it for reasons that are not errors |

## 11. What popnei needs for this

What the applications ask of popnei that popnei does not have yet, or
has not decided:

- Hudson's Fst between populations.
- Private alleles per population.
- Rarefaction of the number of alleles, the proportion of polymorphic
  variants and the private alleles.
- The inbreeding coefficient F per population.
- The folded SFS, with projection.
- The distance at which the LD decays to half.
- The filters of individuals by missing data and by observed
  heterozygosity.
- The GWAS with covariates, the λ, the pseudo heritability; the GWAS spec
  of popnei is not written yet.

## 12. Open points

1. Whether calamine reads right the xlsx files that users make. That it
   builds for both wasm targets, and what it weighs, was measured on 24
   September 2026 (`docs/technology.md`).
2. Where the reader of the files of the individuals lives. Settled by
   the owner on 24 September 2026, because reading these files is not
   popnei's business: CSV and TSV, and the inference of the types of the
   columns, are read by the applications in TypeScript, and xlsx by a
   small Rust crate of the applications (`docs/architecture.md`, section
   6). Nothing of it is asked of popnei. The Python script reads the file
   with pandas (section 9).
3. Whether the unfolded SFS, with the ancestral allele given by the user,
   is in the 95%.
4. The default thresholds of the missing data filter, of LD pruning, and
   of the filters of individuals.
5. The number of principal components offered as covariates by default.
6. The schema of the project file, field by field, and which numbers of
   each result it keeps to check a new run against.
7. Whether a user can go from one application to the other keeping the
   variants and their filters.
8. The order of the steps and the screens, which the document of the
   interface decides.
