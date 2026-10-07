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
chromosomes with their number of variants, and the density of variants
along each chromosome, the number of variants in each window of the
genome, which popnei will give (decided by the owner on 26 September
2026). The new page, popgen2.html, gives the number of chromosomes and
leaves out the variants on each of them for now (the owner, 6 October
2026). For a VCF it also gives how many variants failed their FILTER,
those whose FILTER column is neither PASS nor a dot, counted by a second
pass after the first, "FILTER failures: 300" of 1,200 on low_qual.vcf.gz;
every variant, failed or not, stays in the count and the statistics,
since the FILTER filter as a filter the user sets comes with the filters
of that page. A .nei file has no such line, since one written before
format 1.2 of popnei holds no FILTER (docs/plans/live-stats.md).

### The filters of variants

Each filter is optional. The applications report, for each filter of a
pass, how many variants it was given and how many it kept, which popnei
gives already.

| filter | keeps a variant when | default |
|---|---|---|
| missing data | its proportion of missing genotypes is at most a threshold | on, 0.1 |
| major allele frequency (MAF) | the frequency of its commonest allele is at most a threshold | off; the PCA can have its own (section 5), and the GWAS has it on, at 0.95 |
| observed heterozygosity | its observed heterozygosity is at most a threshold | off |
| genomic regions | it falls inside a region of a BED file; the filter is popnei's, decided by the owner on 26 September 2026 | off |
| linkage disequilibrium (LD pruning) | it is not in LD above a threshold with a variant already kept within a distance in base pairs | off as a filter of the dataset, where it serves to thin a large one, and turned on at an r² of 0.3 with no distance, which the user types; the PCA can have its own, at an r² of 0.1 (section 5) |

The thresholds are popnei's, and each filter keeps what is at most its
threshold, as popnei's filters do; the number the user types is the one
popnei is given (`docs/specs/worker/protocol.md`). The MAF is the major
allele frequency, popnei's, as the owner decided on 24 September 2026, and
not the minor allele frequency: for a variant with two alleles, a major
allele frequency of at most 0.95 is a minor one of at least 0.05, but for
a variant with three or more alleles it is not, since the other alleles
share the rest, and a variant with alleles at 0.90, 0.06 and 0.04 is kept.

The distance of the LD pruning of the dataset has no default, as the
owner decided on 28 September 2026, "just like PCA's pruning", for the
reason given in section 5: how far linkage disequilibrium extends
depends on the genome of the species. Until the user types one, nothing
that reads the filters runs, with the reason said beside the field and
beside each Run button; the histograms of the variants, which read no
filter of the variants, still do. The option not taken, a start at 10,000 base pairs,
was the application's from 26 September 2026 until then. A filter
turned off keeps what the user typed, and turned on again has it back,
so that a distance once typed is not asked for again, as the owner
decided the same day for the LD pruning; every filter of the step with
a switch does the same.

### The filters of individuals

- By a list of individuals to keep or to remove.
- By their proportion of missing genotypes, above a threshold.
- By their observed heterozygosity, above a threshold, which catches
  contaminated and mixed samples.

For each individual, its proportion of missing genotypes and its observed
heterozygosity are shown, as a table and as histograms, before the
thresholds are chosen. A high heterozygosity in a selfing species is
itself a finding.

### The order of the filters

The filters of individuals act before the other filters of the
variants, which count over the individuals they keep, as the owner
decided on 28 September 2026, "All analyses should calculate the filters
using the individuals kept", as plink 1.9 applies `--mind` before
`--geno`. So the missing rate, the frequencies and the LD of a variant,
which its filters keep it by, are those of the individuals the analyses
read; the histograms of the variants are drawn over those individuals
too, so that a threshold read on a histogram keeps what the histogram
shows; and the Variants step shows the filters of the individuals
before those of the variants. The owner decided the last two the same
day; not taken, the histograms over every individual of the file.

The order is fixed, and the genomic regions come first, as the owner
decided later on 28 September 2026, once the application has that
filter:

1. the genomic regions of a BED file;
2. each individual's proportion of missing genotypes and observed
   heterozygosity, counted over the variants inside the regions, or
   over every variant of the file without that filter, one calculation
   for each file loaded and each BED file;
3. the filters of individuals;
4. the other filters of the variants, missing data, observed
   heterozygosity, MAF, and the LD pruning last, since it keeps a
   variant according to those kept before it.

So a VCF of a capture with calls off the target, loaded with the BED of
the target, has each individual judged on the calls the analyses read,
as plink 1.9 removes the variants outside the regions before `--mind`.
Not taken: the regions after the filters of individuals, with the other
filters of the variants. An individual's missing genotypes include
those at the bad variants the missing data filter drops, which is the
cost of this order (`docs/architecture.md`, section 2, and section 13,
point 15).

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

- `.xlsx` is read directly, the first sheet of the file in the order of
  its tabs that is not hidden, which the application says in a line
  that names no sheet, as the owner decided on 28 September 2026, a merged cell giving its value to every
  cell of its range as Excel shows it, with calamine,
  which is pure Rust, in xlsx_rs, a small project of its own whose
  package the applications install as they install popnei's
  (`docs/architecture.md`, section 6; `docs/technology.md`).
- CSV and TSV are read by the applications, in TypeScript, and a BOM at
  the start of the file is removed.
- Their encoding, their separator and their decimal mark are detected,
  and the user can set each one when the detection is wrong, as the owner
  decided on 24 September 2026. The encoding is UTF-8 when the file
  starts with the byte order mark of UTF-8, which Excel writes in "CSV
  UTF-8", or is valid UTF-8, and otherwise Windows-1252, which is what
  Excel on Windows writes for "CSV (comma delimited)" in Spanish and the
  other languages of Western Europe; the separator is `,`, `;` or a tab;
  the decimal mark is a point or a comma. A file with the mark of UTF-8
  and a bad byte is read as UTF-8, the bad byte shown as �, with a
  warning that names its line, as the owner decided on 25 September
  2026: read as Windows-1252, every accented letter of it would come out
  wrong. What was used is shown beside the file, with a way to change
  it. No file is refused for its encoding but one: a UTF-16 file that
  ends in the middle of a character is refused, with words that say it
  may have been cut short, as the owner decided on 25 September 2026,
  since a table read from it would lack its last rows without a word.
- Missing values are an empty cell, `NA` or `-`, and in an `.xlsx` also
  every error of Excel: `#N/A`, which Excel shows for a value not
  available, and `#DIV/0!`, `#NAME?`, `#NULL!`, `#NUM!`, `#REF!` and
  `#VALUE!`, which a formula that failed gives, as the owner decided on
  28 September 2026. The reader of the xlsx receives an error as its
  text, so the same text typed in a cell of an xlsx is missing too. Not taken: those six read as their text, so that a
  broken formula showed among the values of its column. The CSV that
  Excel saves from the same sheet writes the errors as text, which is
  read as a value there. An error of the newest Excel that the reader
  does not know, `#SPILL!` among them, refuses the file, with words that
  say how to find it in Excel.
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

- The default is a PCA of the genotypes as 0, 1, 2 counts, over the
  filters of the variants of the dataset. The PCA has its own filters of
  missing data, MAF and LD, set on its page, since a PCA usually wants
  stricter missing data and LD filters than the other analyses, as the
  owner decided on 28 September 2026. By default each follows the
  filter of that kind of the Variants step, and the page says so, "As in
  the Variants step: 0.1"; set to a value of its own, it replaces the
  dataset's filter of that kind for the PCA alone, and set back, it
  keeps that value for the next time. With the filters of a new
  project, which have no LD filter, the PCA does not prune, and its
  result carries a warning that linked regions can dominate the
  components, which says where to set an LD filter. The options not
  taken: the PCA's own missing data and LD filters alone, and a filter
  of its own for every filter of the variants. This replaces the MAF
  filter at 0.95 and the LD pruning on by default, both for the PCA
  alone, of 27 September 2026.
- The PCA's own LD filter starts at an r² of 0.1 and has no default
  distance: how far linkage disequilibrium extends depends on the
  genome of the species, so the user types it, and the PCA does not run
  until the user has typed one or set the filter back to that of the
  Variants step, with the reason said beside the field and beside the
  Run button. Decided by the owner on 27 September 2026 for the PCA's
  pruning, and kept for its own LD filter; the option not taken, a
  default of 50,000 base pairs. The LD decay of section 6 is the way to
  choose it. The LD filter of the dataset has no
  default distance either (section 3). Each PCA with an LD filter
  prunes again inside its one pass over the file: popnei has no way to keep the variants a
  pruning left and to give them to the next PCA, and a PCA reads the
  whole file anyway, so keeping them would spare only the calculation
  of r². Decided by the owner on 27 September 2026; the time of the
  pruning is measured in stage 4, and popnei is asked for a way to keep
  them only if it is large (`docs/specs/stage-4-open-points.md`).
- The alternative is a principal coordinate analysis (PCoA) of the Kosman
  distances between the individuals, for data with a lot of missing
  genotypes. The owner asked it of popnei on 27 September 2026, and
  popnei gives it, `doPcoaFromVariants`, from its release
  `js-v0.1.0-dev.3` of 28 September 2026, with Lingoes' correction of
  distances that cannot all be drawn in one space (section 11;
  `docs/specs/analyses/pca.md`).
- It is shown in two dimensions, the first two components by default,
  and in three, drawn with WebGL, the first three by default, with the
  variance each one explains; the user chooses the components of each
  axis. It opens in three, and two are one button away, as the owner
  decided on 28 September 2026. Where the browser has no WebGL 2, or the
  code of the 3D view cannot be downloaded, it shows the two dimensions,
  with the words that say why. The option not taken, which had been
  recommended, opened in two, which needs no WebGL.
- The points are coloured by any column of the file of the individuals
  but the first, the names: a population or a metadata column, or a trait
  in association; a column of groups, categorical or binary, of more
  than 1,000 different values, which no legend could show, is not
  offered.
- The coordinates of the individuals are downloaded as a table that
  vavilov-explorer, the owner's desktop application, imports: a CSV
  whose first column holds the names of the individuals and whose other
  columns hold one component each. Building groups of individuals on the
  plot, with a lasso, is vavilov-explorer's, not the application's, as
  the owner decided on 5 October 2026; the groups come back as a file of
  populations. This replaces the lasso of the application, planned for
  later until then (`docs/use-cases.md`, case 3).

## 6. Each population

### Diversity

For each population, over the variants:

- The expected heterozygosity, unbiased (Nei's).
- The observed heterozygosity.
- The inbreeding coefficient, F = 1 − Ho/He, popnei's F_IS of the
  population, as the owner decided on 30 September 2026; the option not
  taken was the application's own arithmetic on the two heterozygosities.
- The proportion of polymorphic variants, a variant being polymorphic when
  its commonest allele has a frequency below 0.95, the default, as popnei
  counts it.
- The mean number of alleles per variant.
- The number of private alleles, alleles found in this population and in
  no other, counted by popnei over the variants at which every population
  has enough individuals with a called genotype, 20 by default, the
  minimum the diversity already uses. A population with fewer
  individuals than that minimum has no private alleles, and the words
  beside it say why; it is left out of their calculation, and the private
  alleles of the others are counted among the populations that remain,
  which the words say too, as the owner decided on 30 September 2026. Left
  in, such a population would take every variant out of the count of
  every population. The option not taken was a warning with no private
  alleles for any population. A private allele needs a second
  population to be absent from, so the table has no private alleles for
  the one population of every individual, nor when one population alone
  has the minimum of individuals, and the words say why
  (`docs/specs/analyses/diversity.md`, "The populations").

Each is given with the number of individuals of the population beside it.

### Rarefaction

The number of alleles and the private alleles grow with the number of
individuals sampled, so populations of 8 and of 60 individuals cannot be
compared as they are. popnei rarefies them to a common number of
sampled chromosomes, and the application gives the raw and the rarefied
values. The number is by default the ploidy times the minimum number of
individuals the diversity uses, 40 for diploids at the minimum of 20,
and the user can change it, as the owner decided on 30 September 2026.
The option not taken, the size of the smallest population, rests every
population's values on its smallest one, and on `panel.nei` it left the
rarefied values of population p0 on 278 of its 1,200 variants. The
proportion of polymorphic variants is not rarefied, as the owner decided
the same day: on variants of two alleles it is the rarefied number of
alleles minus 1. The application warns whenever a population reaches
that number of chromosomes at fewer variants than it has a value at,
with how many, since its rarefied values then rest on those alone. At
the default every variant with a value reaches the draw, and the
warning comes only from a larger number, or from the default draw of 2
at a minimum of 0, or of 1 in a haploid file, where a variant with one
allele called has a value (`docs/specs/analyses/diversity.md`, "The
warnings").

### The site frequency spectrum

The site frequency spectrum (SFS) of each population: how many variants
have their minor allele in 1, 2, ... of the sampled chromosomes.

- Folded by default, since most users do not know the ancestral allele.
  Unfolded when the user gives the ancestral allele, a case to decide
  (open point 3).
- Missing genotypes and populations of different sizes make the spectra
  of different variants and populations incomparable, so the spectra are
  projected down to a common number of chromosomes, the same number the
  rarefaction draws, set by its one field.
- It is calculated in the same call of popnei as the rest of the
  diversity, and shown below the diversity's table, in the diversity's
  Run and with no pass of its own, as the owner decided on 30 September
  2026 (point 11 of
  `docs/specs/stage-5-open-points.md`). The option not taken was an
  analysis of its own, with a pass and a Run of its own.
- The height of each bar is the share of the population's variants that
  show both alleles in the draw, the variants with one allele only in
  the table and not drawn, so that populations with different numbers
  of variants compare by their shapes; the table gives popnei's expected
  numbers of variants as well (point 18 there, decided by the owner on
  30 September 2026). The option not taken was popnei's expected
  numbers as the heights.
- A MAF filter of the Variants step removes the variants whose rarer
  allele is rare over all the individuals, and so empties the first bins
  of the spectrum; the application warns of it and says to turn it off
  (point 17 there, decided by the owner on 30 September 2026). The
  option not taken was the spectrum reading every filter but the MAF,
  with a pass of its own.

### LD decay

The linkage disequilibrium, r² of Rogers and Huff, between pairs of
variants against the physical distance between them, per population, as
a plot, with one number that sums it up: the distance at which r² falls
to half of its maximum. The application warns when a population has few
individuals, because r² is then biased upwards.

- The plot draws the mean r² of each bin of distance and the curve
  popnei fitted to the pairs, which the application draws from popnei's
  parameters of the fit, with a mark at the distance at which the curve
  falls to half. The distance and the fit are popnei's. The option not
  taken was the bins alone. The owner decided the plot and the curve on
  30 September 2026.
- The largest distance between two variants of a pair has no default,
  since what fits depends on the genome; the user types it, and the
  analysis cannot run until then, as with the distance of the LD pruning
  (section 3), by the owner's rule of no default that depends on the
  genome.
- It reads the variants every filter of the Variants step keeps but the
  LD pruning, which would take out the very pairs it measures, as the
  owner decided on 30 September 2026. It has no LD filter of its own,
  where the PCA puts its own in the place of that of the Variants step
  (section 5). The option not taken was all the filters.
- A variant counts in a population only when its major allele frequency
  there is at most 0.95, popnei's default, which the user can change
  from 0.5 to 1: the r² of a variant that hardly varies rests on one or
  two individuals.
- popnei counts the pairs at every distance up to the largest one, in up
  to 40 bytes for each base pair and population, so the analysis cannot
  run when those counts would pass 1 GB, 25,000,000 base pairs for one
  population, and says so with the largest distance allowed.
- The warning of few individuals comes below 20, the minimum of the
  diversity: on popnei's reference file of LD, populations of 10 gave
  half distances of 10,509 to 11,357 bp where populations of 50 gave
  7,340 and 7,548 (`docs/specs/analyses/ldDecay.md`, "The warnings").

## 7. Between populations

- A matrix of distances between the populations, with Hudson's Fst as the
  default and Jost's D as the alternative, without standard errors, as
  the owner decided on 30 September 2026. A variant counts for a pair
  only where both populations have the minimum number of individuals
  with a called genotype, 20 by default, which a field changes, since
  populations of 5 to 15 are common in collections of varieties and
  breeds. A population with fewer individuals than the minimum is left
  out and named, since every pair it is in would have no value, as the
  owner decided on 30 September 2026 (point 13 of
  `docs/specs/stage-5-open-points.md`; the option not taken, sending it
  to popnei, would give the heatmap the order of the metadata file).
  The option not taken for the errors of the distances, standard
  errors when the user types a length of the blocks they are resampled
  over, needs that length, which depends on how far the LD reaches in the
  user's genome.
- Shown as a heatmap of the measure the user picks and as a table of
  the pairs, each with both measures and the number of variants it was
  calculated over, up to 200 populations; above 200 neither is drawn,
  the panel says how many populations there are, and the table is
  downloaded as CSV (point 16 of `docs/specs/stage-5-open-points.md`,
  decided by the owner on 30 September 2026). The heatmap orders the
  populations
  along the first axis of popnei's PCoA of the distance matrix, so that
  similar ones are together, and in the order of the metadata file when
  popnei cannot place them, as when a pair has no distance, as the owner
  decided on 30 September 2026. The option not taken was a clustering
  tree written in the application. A matrix that no set of points has
  as its distances, as a matrix of Fst often is, is corrected by
  Lingoes' method before the PCoA, which leaves its first axis as it
  was; a negative distance, which two populations the variants cannot
  tell apart give, is taken as 0 for the order alone and shown as popnei
  gave it (point 14 there, decided by the owner on 30 September 2026;
  the option not taken was the order of the metadata file whenever a
  distance is negative).

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
The file downloaded holds the table or the plot alone, and the versions
of popnei and of the application that calculated it are shown on the
page beside the download, as the owner decided on 25 September 2026.

### The project file

A JSON file, `<name>.popnei.json`. JSON because it can be read in any
editor, compared between two versions, and read natively by TypeScript and
by Python. It holds:

- **A header**: the version of the format, the application it belongs
  to, population genetics or association, the versions of popnei and of
  the application, and the date.
- **The identity of the variant file**: its name, its size, its number of
  variants, its ploidy, the list of its individuals and, for a VCF,
  whether only the variants with PASS or . in its FILTER column were
  read, which the owner added on 25 September 2026, since a VCF read
  with the other choice gives other variants. It serves only to
  say, when the project is opened again, whether the file given is the one
  the project was made with. Nothing is hashed from the file: every
  analysis is calculated again whenever a variant file is given, the same
  one included, so the identity never decides whether a result is
  reused.
- **The file of the individuals, whole**: its rows, the types of its
  columns and, in the traits file, their roles; in population genetics,
  the column that defines the populations. A file that was still being
  read, or was refused, when the project was saved is named without its
  rows, and asked for again when the project is opened. It is kept whole because it is small, so that a project
  needs no file other than the variants.
- **The filters of the dataset, in their order, with their parameters.**
- **The options of each analysis**, those that were run and those that
  were set, with the preprocessing of the analysis itself, such as the
  PCA's own filters.
- **A few numbers of each result that was run**: for the diversity, the
  number of variants the filters kept, and the expected heterozygosity,
  the observed heterozygosity and the proportion of polymorphic variants
  of each population, as the owner decided on 25 September 2026; the Fst
  matrix; the λ and the top hit of a GWAS. Beside the numbers of each
  analysis are the version of the application's calculation of it and
  the versions of popnei and of the application that calculated them, so
  that a file that holds numbers of two sessions names the right versions
  for each. They are there to check a new run against, never shown as
  results.

Nothing of the project is kept in the browser, so a page closed or
reloaded loses what was not saved. While the project holds anything
that the last project file saved or opened does not, a setting changed
or a result calculated since, the page asks before it is closed or
reloaded, and before another project file replaces it, as the owner
decided on 26 September 2026.

Opening a project:

1. The application asks for the variant file, and names the one the
   project was made with.
2. It compares the identity of the file given with the one in the
   project, the name, the size, the individuals, the ploidy and the
   choice of the passed variants as soon as the file is open, and the
   number of variants once the first pass has counted it. When they differ it warns, and says in what: "The
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
   changed that could explain it: the variant file; the version of
   popnei; or the application's calculation of that analysis, when a
   later version of the application calculates it in another way, which
   the project file records with the numbers of each analysis. A VCF
   read with another ploidy or the other choice of the passed variants
   than the project's gives numbers that are not compared, and the
   analysis says why and how to read the file as the project did. This is
   what catches a file with the same individuals and
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
- Rarefaction of the number of alleles and the private alleles.
- The inbreeding coefficient F per population.
- The folded SFS, with projection.
- The distance at which the LD decays to half.
- The filters of individuals by missing data and by observed
  heterozygosity.

popnei's release `js-v0.1.0-dev.3` has the first six, as checked on 30
September 2026: `calcPopDists`; `calcPopDiversity`, with the private
alleles, the rarefaction, F and the folded SFS; and
`calcLdAndDistPerPop`, with the fitted curve and its half distance.
`calcLdAndDistPerPop` does not refuse a variants file whose variants are
not sorted by position, and counts fewer pairs without a word; popnei
is asked to refuse it, as its LD filter does, in popnei issue #5, as
the owner decided on 30 September 2026 (point 19 of
`docs/specs/stage-5-open-points.md`).

- A VCF writer, for the variants after the filters (section 3).
- The filter of the variants by the regions of a BED file (section 3).
- The histogram of the proportion of missing genotypes per variant,
  beside those popnei gives of the MAF and the heterozygosity, for the
  missing data filter (section 3).
- The density of variants along each chromosome (section 3).

The last four the owner decided on 26 September 2026 to add to popnei,
and popnei's release `js-v0.1.0-dev.3` of 28 September 2026 has them.
- The PCoA of the Kosman distances between the individuals (section 5),
  asked of popnei by the owner on 27 September 2026, and in
  `js-v0.1.0-dev.3`.
- The expected and observed heterozygosities and the proportion of
  polymorphic variants from `calcPopDiversity`, beside its other
  statistics, so that the diversity reads the variants file once and not
  twice, asked of popnei by the owner on 30 September 2026 (popnei issue
  #4). Until popnei has them the diversity calls `calcPerVarDistribs` as
  well, a second pass over the file.
- The GWAS with covariates, the λ, the pseudo heritability; the GWAS spec
  of popnei is not written yet.

## 12. Open points

1. Whether calamine reads right the xlsx files that users make. That it
   builds for both wasm targets, and what it weighs, was measured on 24
   September 2026 (`docs/technology.md`).
2. Where the reader of the files of the individuals lives. Settled by
   the owner on 24 September 2026, because reading these files is not
   popnei's business: CSV and TSV, and the inference of the types of the
   columns, are read by the applications in TypeScript, and xlsx by
   xlsx_rs, a small Rust project of its own, since 28 September 2026
   (`docs/architecture.md`, section 6). Nothing of it is asked of popnei. The Python script reads the file
   with pandas (section 9).
3. Whether the unfolded SFS, with the ancestral allele given by the user,
   is in the 95%.
4. The default thresholds of LD pruning and of the filters of
   individuals. The missing data filter is on at 0.1 by default, plink's
   default for `--geno`, as the owner decided on 25 September 2026. The
   PCA's own LD filter starts at an r² of 0.1 with no default distance,
   which the user types, as the owner decided on 27 September 2026 for
   its pruning, which since 28 September 2026 follows the LD filter of
   the dataset unless the user sets one for the PCA (section 5).
   The LD filter of the dataset is another thing, which starts at r² 0.3
   when the user turns it on, as the owner left it on 26 September 2026
   (`docs/specs/stage-3-open-points.md`), and with no distance, which
   the user types, as the owner decided on 28 September 2026 (section 3);
   until then it started within 10,000 base pairs.
5. The number of principal components offered as covariates by default.
6. The schema of the project file, field by field, and which numbers of
   each result it keeps to check a new run against.
7. Whether a user can go from one application to the other keeping the
   variants and their filters.
8. The order of the steps and the screens, which the document of the
   interface decides.
