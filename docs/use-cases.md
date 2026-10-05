# The use cases of the population genetics application

Written on 5 October 2026 from the four use cases the owner gave that day.
The screens of the application are started again from these cases. Each
case is built as a small piece, and the owner walks through it in a
browser before the next piece is started. The screens built until now
had their specs written before the screens existed, and the owner saw
them only at the end of each plan. What the application computes is in
`docs/functionality.md`, and that document still holds. This document
says what a user comes to do, and so what a screen has to let them do.
More cases will be added as they come up. The questions for the owner
are at the end.

A use case here says who the user is, which files they bring, what they
want to leave with, what they do in order, and what they must see to make
each decision. It also says where they could go wrong without noticing,
since by the principles of `docs/functionality.md` the application warns
them there. It does not say how a screen looks. That is worked out in the
browser, piece by piece. A case is done when the owner has walked
through it in a browser, with a dataset of the kind the case names, and
has reached what the user wanted to leave with.

Every statistic below is one that popnei gives already, through the
functions its wasm package exports. So none of the four cases waits on
popnei.

## 1. Filter a large variants file

**The user** has a VCF with many variants, a million or more, called in a
few hundred individuals; those sizes are assumed until the owner answers
the first question at the end. Many of the variants are useless: some are
missing in most of the individuals, and some have a major allele
frequency so close to 1 that they hardly vary.

**They want to leave with** a smaller variants file, a VCF or a `.nei`
file, that holds only the variants worth analysing, and with the numbers
of how many variants each filter removed, to write in their methods.

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

**Where they could go wrong:** a threshold of the major allele frequency
read as one of the minor allele frequency. The two differ for a variant
with three or more alleles (`docs/functionality.md`, section 3). The
filters keep a variant whose value is at most the threshold, so a user
who expects "at least" keeps the wrong half. Reading a VCF of a million
variants takes minutes, so the user has to see that it is progressing
and how far it has got.

## 2. Get a first idea of a variants file

**The user** has just received a VCF, from a sequencing service or a
colleague, and wants to know what is in it before they do anything with
it.

**They want to leave with** an idea of the quality and the diversity of
the dataset, and the plots to show it to someone else.

**What they do:**

1. They open the VCF.
2. They see how many individuals and variants it holds, its ploidy, and
   the chromosomes with the density of variants along each.
3. They look at the distributions over the variants of the observed
   heterozygosity, the expected heterozygosity, the missing rate and the
   major allele frequency, and at the site frequency spectrum of all the
   individuals taken as one population.
4. They download the plots, and the tables behind them.

**What they must see to decide:** each distribution with its mean, and
the number of variants it was computed over. An observed
heterozygosity well above the expected one points to paralogous
sequences called as one locus. An observed one well below it points to
selfing or to a structure of populations.

**Where they could go wrong:** the site frequency spectrum of individuals
of several populations taken as one has more variants at intermediate
frequencies than any one population, and could be read as a sign of
balancing selection. This case does not need the populations. Its plots
come before any filter, and can be drawn again after the filters of case
1.

## 3. Look for clusters of individuals

**The user** has a variants file, filtered or not, and wants to know
whether the individuals form groups, and how many.

**They want to leave with** a PCA, or a PCoA when many genotypes are
missing, in two or three dimensions, as a plot they can download. Often
they also want the groups they saw named, so that they become the
populations of case 4.

**What they do:**

1. They open the variants file, and, if they have it, a file of the
   individuals with their metadata.
2. They run a PCA. Because it gives more weight to linked regions, they
   first set an LD pruning, which needs a distance in base pairs that
   depends on their genome.
3. They look at the first components, coloured by a column of the
   metadata when they have one, and turn the plot in three dimensions.
4. They download the plot and the coordinates.

**What they must see to decide:** the variance each component explains;
how many variants and individuals went into the analysis; which point is
which individual.

**Where they could go wrong:** without an LD pruning, a single region of
the genome, an inversion or a region of low recombination, can make up a
whole component. Many missing genotypes pull the individuals with them
towards the centre of a PCA, which is why the PCoA is there.

## 4. Characterise populations and the distances between them

**The user** has a variants file and a file that assigns each individual
to a population: the accessions of a genebank by country, or the
breeds of a species.

**They want to leave with** a table of the diversity of each population,
the distances between the populations, and the plots of both, to compare
the populations and to write them up.

**What they do:**

1. They open the variants file and the file of the populations.
2. They see how many individuals each population has, since a small one
   gives values that cannot be compared with the others.
3. They compute the diversity of each population: the expected and the
   observed heterozygosity, the inbreeding coefficient, the proportion of
   polymorphic variants, the number of alleles and of private alleles,
   raw and rarefied, and the site frequency spectrum.
4. They compute the distances between the populations, Hudson's Fst or
   Jost's D, and look at them as a heatmap.
5. They download the tables and the plots.

**What they must see to decide:** the number of individuals of each
population beside its values; which populations were left out, and why;
the number of variants each value rests on.

**Where they could go wrong:** comparing the number of alleles of a
population of 8 individuals with that of a population of 60, which is what
the rarefaction is for. A filter of the major allele frequency empties
the first bins of the spectrum.

## How the cases follow each other

The four cases often happen one after the other with the same file. The
user gets a first idea of the file (case 2), chooses the thresholds of
the filters from what they saw (case 1), looks for clusters in what the
filters kept (case 3), and characterises the populations (case 4). But
each case can also be the only one a user does: someone with an
already filtered file and a file of populations goes straight to case 4.

So the screens are built in this order: cases 2 and 1 together, since
they open the same file and the filters are chosen from the
distributions; then case 3; then case 4.

## Questions for the owner

1. **The size of the files.** What sizes are usual for the files of case
   1, in variants and individuals? This document assumes a million or
   more variants in a few hundred individuals. The size decides how long the user waits for
   each pass over the file, and so how much of the work the screen has to
   show while it waits.
2. **The individuals in case 2.** Does case 2 also show the missing rate
   and the observed heterozygosity of each individual? Those distributions
   catch the bad samples, which the filters of individuals of
   `docs/functionality.md` remove. Recommended: yes, beside the
   distributions of the variants.
3. **The LD decay.** The LD pruning of case 3 needs a distance that
   depends on the genome. The LD decay of `docs/functionality.md` is the
   way to choose that distance, but none of the four cases has it.
   Recommended: put it in case 3, before the PCA, for the users who do not
   know the extent of the LD in their species.
4. **Naming the clusters.** Is naming the groups of case 3 with a lasso,
   so that they become populations, part of case 3 now, or later?
   `docs/functionality.md` has it as later.
5. **The datasets to walk through.** Which datasets should the owner walk
   each case through? `panel.nei`, the test file of the repository, has
   200 individuals and 1,200 variants, which shows neither the waits of case 1 nor what a real
   plot looks like. Recommended: one real dataset of the owner for each
   case, kept out of the repository.
6. **The association application.** No case covers the GWAS. Is the
   association application left until the population genetics cases are
   built?
