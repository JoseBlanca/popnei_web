# The use cases of the applications

Written on 5 October 2026 from the use cases the owner gave that day,
with the owner's answers of the same day to the questions they raised.
The screens of the applications, the code under `src/ui`, are started
again from these cases. The code that reads the files, runs popnei in
the background and keeps the results, and the code that draws the
plots, are kept where the cases do not change them. Before the first
case is built, the assistant goes through that code to find which parts
of it assume the screens of until now, and reports to the owner what is
kept and what is rewritten. Each case is built as a
small piece, and the owner walks through it in a browser before the next
piece is started.  What the applications compute is in `docs/functionality.md`,
and that document still holds. This document says what a user comes to
do, and so what a screen has to let them do.

popnei_web is a convenient interface around popnei for the simple cases,
as the owner said on 5 October 2026. How fast an analysis runs is
popnei's work, not the application's: the application shows that a
calculation is running and how far it has got, and does not try to make
it faster.

A use case here says who the user is, which files they bring, what they
want to leave with, what they do in order, and what they must see to make
each decision. It also says where they could go wrong without noticing,
since by the principles of `docs/functionality.md` the application warns
them there. It does not say how a screen looks. That is worked out in the
browser, piece by piece.

A case is done when the owner has walked through it in a browser, with
the test files of the repository, and has reached what the user wanted to
leave with. The test files are small, so that each round of building and
trying takes seconds: `panel.nei` and `panel.vcf.gz` hold 200
individuals and 1,200 variants, and `panel_pops.csv` assigns them to
populations. The association application needs a traits file for them,
which the repository does not have yet.

Every statistic below is one that popnei gives already, through the
functions of its wasm package, popnei compiled to run in the browser. So none of the five cases waits on
popnei.

## 1. Filter a large variants file

**The user** has a VCF with millions of variants. Many of them are
useless: some are missing in most of the individuals, and some have a
major allele frequency so close to 1 that they hardly vary.

**They want to leave with** a smaller variants file, a VCF or a `.nei`
file, popnei's own format, which is read many times faster than a VCF.
The file holds only the variants worth analysing. They also want the
number of variants each filter removed, to write in their methods.

**What they do:**

1. They open the VCF.
2. They see how many individuals and variants it holds, and on which
   chromosomes.
3. They set a maximum proportion of missing genotypes and a maximum major
   allele frequency. They choose both by looking at the distributions of
   those two statistics over the variants, which is case 2.
4. They see how many variants each filter removes and how many are left,
   and change the thresholds until the count is one they can work with.
5. They write the filtered variants to a file.

**What they must see to decide:** the distribution of the missing rate and
of the major allele frequency over the variants, with the thresholds
marked on them; and, for each threshold, how many variants it keeps.
While the thresholds are set, the owner decided on 8 October 2026, no
count stands under them: each plot shades what its threshold would
leave out, and draws in grey a threshold that removes none of its
values. How many variants each filter removed, and how many are left,
are counted by the reading that carries the filters out, the download
of the filtered file of step 5, and said in the text that takes the
place of its button once the file is downloaded, as the owner decided
on 8 October 2026 (`docs/designs/stats-filters.md`).

**Where they could go wrong:** a threshold of the major allele frequency
read as one of the minor allele frequency. The two differ for a variant
with three or more alleles (`docs/functionality.md`, section 3). The
filters keep a variant whose value is at most the threshold, as popnei's
do, so a user who expects "at least" would keep the wrong half; the
screen has to say "at most" beside each threshold. A file of millions of
variants takes a while to read, so the user has to see that the reading
is progressing and how far it has got.

## 2. Get a first idea of a variants file

**The user** has just received a VCF, from a sequencing service or a
colleague, and wants to know what is in it before they do anything with
it.

**They want to leave with** an idea of the quality and the diversity of
the dataset, which individuals look wrong, and the plots to show it to
someone else.

**What they do:**

1. They open the VCF.
2. They see how many individuals and variants it holds, its ploidy, and
   the chromosomes with the density of variants along each. The density
   is a later piece: the first, built in October 2026, gives the number
   of chromosomes (`docs/plans/open-variants.md`).
3. They look at the distributions over the variants of the observed
   heterozygosity, the expected heterozygosity, the missing rate and the
   major allele frequency, and at the site frequency spectrum of all the
   individuals taken as one population.
4. They look at the distributions over the individuals of the missing
   rate and the observed heterozygosity, which catch the bad samples:
   failed ones with most genotypes missing, and contaminated or mixed
   ones with too many heterozygous genotypes. The filters of individuals
   of `docs/functionality.md` remove them, by a maximum of each.
5. They download the plots, and the tables behind them.

**What they must see to decide:** each distribution with its mean, and
the number of variants or individuals it was computed over; and, for the
individuals, which ones lie in the tail. An observed heterozygosity well
above the expected one points to paralogous sequences called as one
locus. An observed one well below it points to selfing or to a structure
of populations.

**Where they could go wrong:** the site frequency spectrum of individuals
of several populations taken as one has more variants at intermediate
frequencies than any one population, and could be read as a sign of
balancing selection. A high heterozygosity of an individual in a selfing
species is itself a finding, not always a bad sample. This case does not
need the populations. Its plots come before any filter, and can be drawn
again after the filters of case 1.

## 3. Look for clusters of individuals

**The user** has a variants file, filtered or not, and wants to know
whether the individuals form groups, and how many.

**They want to leave with** a PCA, or a PCoA when many genotypes are
missing, in two or three dimensions, as a plot they can download, and
the coordinates of the individuals as a table.

**What they do:**

1. They open the variants file, and, if they have it, a file of the
   individuals with their metadata.
2. They run a PCA. Because linked regions weigh too much in it, they
   first set an LD pruning, which needs a distance in base pairs that
   depends on their genome and that they type, from what they know of
   their species or from the LD decay of case 4.
3. They look at the first components, coloured by a column of the
   metadata when they have one, and turn the plot in three dimensions.
4. They download the plot and the coordinates.

**What they must see to decide:** the variance each component explains;
how many variants and individuals went into the analysis; which point is
which individual.

**Where they could go wrong:** without an LD pruning, a single region of
the genome, an inversion or a region of low recombination, can make up a
whole component. Individuals with many missing genotypes are pulled
towards the centre of a PCA, which is why the PCoA is there.

**What it leaves to vavilov-explorer:** the application has no lasso, a line drawn
around points on the plot to select them, and names no groups, as the owner decided on 5 October 2026.
vavilov-explorer, the owner's desktop application at
`~/devel/vavilov-explorer`, does that: it opens a table of the
individuals and lets the user build the groups on a 3D scatter. So the
coordinates are downloaded as a table that vavilov-explorer imports, a
CSV, TSV or xlsx file whose first column holds the names of the
individuals and whose other columns hold one component each. The groups
built there come back to case 4 as a file of populations.

## 4. Characterise populations and the distances between them

**The user** has a variants file and a file that assigns each individual
to a population: the accessions of a genebank by country, or the
breeds of a species.

**They want to leave with** a table of the diversity of each population,
the decay of the linkage disequilibrium in each, the distances between
the populations, and the plots of all three, to compare the populations
and to write them up.

**What they do:**

1. They open the variants file and the file of the populations.
2. They see how many individuals each population has, since a small one
   gives values that cannot be compared with the others.
3. They compute the diversity of each population: the expected and the
   observed heterozygosity, the inbreeding coefficient, the proportion of
   polymorphic variants, the number of alleles and of private alleles,
   raw and rarefied, and the site frequency spectrum.
4. They compute the LD decay of each population, how the r² between two
   variants falls with the distance between them, up to a largest
   distance they type, and read the distance at which r² falls to half
   its maximum. The owner put the LD decay in this case on 5 October
   2026.
5. They compute the distances between the populations, Hudson's Fst or
   Jost's D, and look at them as a heatmap.
6. They download the tables and the plots.

**What they must see to decide:** the number of individuals of each
population beside its values; which populations were left out, and why;
the number of variants each value rests on.

**Where they could go wrong:** comparing the number of alleles of a
population of 8 individuals with that of a population of 60, which is what
the rarefaction is for. A filter of the major allele frequency removes the
variants with a rare allele, and so empties the first classes of the
spectrum, those of the alleles found in one or two chromosomes. The r²
of a population of few individuals is biased upwards, so its LD seems to
reach further than it does.

## 5. Look for the variants associated with a trait

This is the case of the association application, the second of the two
applications of `docs/functionality.md`, added by the owner on 5 October
2026.

**The user** has a variants file of individuals that usually belong to
one population, a panel of varieties or of animals of one breed, and a
traits file with a value of one or more traits for each individual: a
measured trait such as the weight of the fruit, or a binary one such as
resistant or not.

**They want to leave with** the variants associated with the trait, as a
Manhattan plot, a QQ plot and a table, and the share of the variance of
the trait the genotypes explain, the pseudo heritability.

**What they do:**

1. They open the variants file and the traits file.
2. They filter the variants, as in case 1. The filter of the major
   allele frequency is on by default here, at a maximum of 0.95, which
   for a variant with two alleles keeps a minor allele frequency of at
   least 0.05, since an association cannot be tested at a
   variant that hardly varies.
3. They choose the trait. For a measured trait they look at its
   histogram, and choose a transformation, none, log or rank based
   inverse normal, by the histogram after it.
4. They choose the covariates: columns of the traits file, and the first
   principal components of a PCA of the individuals, as in case 3. The kinship between the individuals is included by default, and the
   user can turn it off.
5. They run the GWAS, and look at the Manhattan plot with the thresholds
   of Bonferroni and of the false discovery rate on it, and at the QQ
   plot.
6. They download the table of the variants and the plots.

**What they must see to decide:** the histogram of the trait before and
after the transformation; how many individuals have a value of the
trait; the genomic inflation factor λ beside the QQ plot; for each
variant, its effect, the standard error of the effect, its MAF and its p
value.

**Where they could go wrong:** a λ well above 1 means the structure of the
individuals is not accounted for, and many of the associations are false;
turning the kinship off, or giving too few components, does that. A
binary trait with few individuals of one of its two values has little
power to find an association.

## The order in which the cases are built

The first four cases often happen one after the other with the same
file. The user gets a first idea of the file (case 2), chooses the
thresholds of the filters from what they saw (case 1), looks for clusters
in what the filters kept (case 3), and characterises the populations
(case 4). But each case can also be the only one a user does: someone
with an already filtered file and a file of populations goes straight to
case 4.

So the screens are built in this order:

1. Cases 2 and 1 together, since they open the same file and the
   filters are chosen from the distributions. By 8 October 2026 they
   are built up to the setting of the filters (`docs/plans/filters.md`).
   Not built yet: the writing of the filtered file, step 5 of case 1,
   one button, "Download filtered variants…", after the Variants and
   Individuals sections (`docs/designs/stats-filters.md`); and, of case
   2, the site frequency spectrum and the download of the plots.
2. Case 3.
3. Case 4.
4. Case 5, last, since the association application opens the files,
   filters the variants and runs the PCA as cases 1 to 3 do, and those
   pieces are settled by then.
