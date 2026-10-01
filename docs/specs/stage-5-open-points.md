# The decisions of the specs of stage 5

30 September 2026, for the owner. Stage 5 of `docs/build-order.md` is
the analyses of the populations: the distances between populations, as a
heatmap and a table; the diversity whole, with F, the private alleles and
the rarefaction; the LD against distance, with the distance at which r²
falls to half; and the folded site frequency spectrum. This file gathers
the owner's decisions of 30 September 2026: the nine points the specs of
stage 5 asked, 11 to 19, which the owner answered that day, each as
recommended; and the ten decided before the specs were written, 1 to
10. It gathers as well what the specs decided alone that a user meets,
what is asked of popnei, and what a measurement will set.

The specs, all written on 30 September 2026 and approved by the owner
the same day, with the revision of `docs/architecture.md`, are
`docs/specs/analyses/popDists.md` with the heatmap,
`docs/specs/charts/heatmap.md`; `docs/specs/analyses/diversity.md`,
revised; `docs/specs/analyses/ldDecay.md` with the line plot,
`docs/specs/charts/line.md`; and `docs/specs/analyses/sfs.md`, the
spectrum; the other specs and documents were brought to them the same
day. The specs state points 11 to 19 as decided by the owner, and
`docs/architecture.md` has the restart of point 12 as its point 16 of
section 13, approved by the owner with that answer.

A few words are used throughout. A **pass** is one reading of the
variants file from start to end, which on a file of several GB takes
minutes. **F** is the inbreeding coefficient of a population, 1 − Ho/He,
the observed heterozygosity over the expected one. The **minimum number
of individuals**, 20, is how many individuals of a population must have a
called genotype at a variant for the variant to count for that
population, in the diversity since stage 2 and in popnei's calculations,
where the option is called `minNumIndividuals`. The **rarefaction**
brings the number of alleles and the private alleles of every population
down to a common number of sampled chromosomes, so that a population of
20 individuals and one of 200 can be compared. The **PCoA** is the
principal coordinate analysis, popnei's `doPcoa`, which places the
populations along axes from their matrix of distances. The **LD decay**
is the mean r² of the pairs of variants against the distance between
them, per population; popnei fits a curve to the pairs, and the **half
distance** is where that curve falls to half of its value at a distance
of 0. The **LD pruning** is the filter of the Variants step that removes
a variant in LD with one already kept. The **calculation worker** is the
second thread of the browser tab in which popnei runs, so that the page
does not freeze; a **job** is one request the page sends it, and a
**call** is one call of a function of popnei inside a job. `panel.nei`
is the test dataset of the application, 200 diploid individuals in three
populations, p0 of 48, p1 of 68 and p2 of 84, and 1,200 variants.
The **draw** is the number of chromosomes of the rarefaction, which the
spectrum uses too. The **key** of a result is a hash of everything it
was calculated from: a change of any of those takes the result off the
screen, and an undo brings it back from the cache with no calculation.
The **cache** keeps results in the page, so that an undo brings one
back with no calculation. A **browser engine** is what runs the page:
Chromium in Chrome and Edge, WebKit in Safari. A **panel** is the part of the Analyses step that shows one analysis,
with its Run button, which the panel **locks**, disabled with the
reason beside it, when the analysis cannot run; its state before a Run lists the populations the
Run will take. The **check numbers** are a few numbers of a result that
the project file keeps, so that a project opened again and run says
whether it gave the same numbers; the **key version** of an analysis is
a number raised when its result changes meaning for the same inputs,
so that numbers of an older version are told as calculated in another
way and not blamed on the variants file.

## What is still the owner's

No point that the specs asked is open: the owner answered the nine,
11 to 19, on 30 September 2026, below. What is left to the owner is the
approval of the specs, and the decisions of their writers further
below, which stand unless the owner overrules them.

## Decided by the owner on 30 September 2026, on the points of the specs

Every answer took the recommendation, with which the specs had been
written, so the specs now state each as decided and change nothing
else.

### 11. The spectrum is a block of the diversity

"OK, a block". The folded spectrum shares the diversity's call of
popnei, its pass, its draw and its Run, and is drawn in a part of the
diversity's panel of its own, below its table (`docs/specs/analyses/sfs.md`). It
adds no pass, and 0.1 to 0.3 ms to the call on `panel.nei` held in
memory, in node; one field sets the draw of both. A user who wants the
spectrum alone waits for the whole diversity: today two passes, and one
once popnei issue #4 lets the diversity make one. Not taken: an
analysis of its own, with its key, its job and its Run, for which a
user who wants both would wait for three passes today, two after the
issue.

### 12. The calculation worker is started again after every LD decay

"OK". The calculation worker is ended and a new one started after each
LD decay, after its result, a refusal or a defect, and not after a
variants file that can no longer be read (`docs/specs/analyses/ldDecay.md`,
`docs/specs/worker/client.md`). Ending the worker is the only way the
tab gets back the memory popnei took, since popnei's memory never
shrinks while its worker lives. It is a third exception to the owner's
decision of 26 September 2026 not to restart the worker between two
calculations, after a written file and after a PCA of more than 700
individuals, each because it leaves more than about 25 MB behind; it is
point 16 of section 13 of `docs/architecture.md`, which the owner
approved with this answer.

An LD decay leaves the memory larger by two things: the blocks of
variants popnei holds while it reads, about 0.4 to 0.6 GB for 1,000
individuals whatever the distance; and its counts of the pairs at each
distance, 16 bytes a base pair and population, 4.8 MB for three
populations at 100,000 bp and 480 MB at 10,000,000 bp. Measured in
node, the memory grew by 64 MB for 100 individuals and 20,000 variants
at 100,000 bp, and by 0.4 to 1.1 GB for 1,000 individuals and the same
variants at 100,000 and 1,000,000 bp. The restart costs at most 49 ms
from the start of the new worker to the file opened, measured on the
`.nei` file of 19 MB and its VCF in Chromium 153 and WebKit 26.6 at the
end of stage 2, against 0.6 s and more for the LD decay itself on
20,000 variants, in node, which has not been timed in a browser. After a new version of the site is put online
while the page is open, the restarted worker cannot start, and the user
saves the project, reloads the page and picks the variants file again,
as after a cancel or a large PCA today. From stage 7 the restart would
also drop the kinship matrix of the GWAS, up to 800 MB and minutes to
calculate again, so the point is decided again then.

Not taken: a restart above a bound of the individuals and the distance,
as for the PCA, which a few hundred individuals would pass almost
always, and which would have to be measured in both engines first; and
no restart, which leaves up to a gigabyte with the tab after one LD
decay of 1,000 individuals, so that a later calculation that needs
memory may not fit. The plan measures, in Chromium and WebKit, the
memory the browser has gained 3 s after an LD decay, with the restart
and without it.

### 13. A population under the minimum is left out of the distances

"leave it out". The owner's decision 7, which leaves a population of
fewer individuals than the minimum out of the private alleles, holds
for the distances between populations as well
(`docs/specs/analyses/popDists.md`). Such a population is named in the
panel before the Run, "p3 has 12 individuals, fewer than the minimum of
20, and is left out.", and in a warning after it, with the minimum to
lower; the heatmap keeps its order by similarity. The diversity and the
distances find the populations under the minimum with one function and
name them in the same words. popnei's `calcPopDists` counts a variant
for a pair only where both populations have the minimum of individuals
called, so a population under it has no value in any pair, and leaving
it out changes no other number: on `panel.nei`, with 10 individuals of
p0 made a population p0s, the three pairs of p0s had 0 variants and no
value, and the other three pairs gave the same Fst to the last digit
with p0s left out (node, popnei's release `js-v0.1.0-dev.3`). Not
taken: sending it to popnei, which makes each pair it is in a row of
"no value" in the table and a crossed cell in the heatmap, and, since
popnei's PCoA refuses a matrix with a pair of no value, gives the
heatmap of every population the order of the metadata file (decision 2)
instead of the order by similarity.

### 14. A negative distance is taken as 0 for the order of the heatmap

"OK". popnei gives a negative Fst or Jost's D for two populations the
variants cannot tell apart, and its PCoA refuses a negative distance;
on `panel.nei`, p0 split in two halves of 24 gives an Fst of −0.0113.
A negative distance is taken as 0 in the matrix given to the PCoA, and
nowhere else: the table, the cell and the tooltip show popnei's value,
and a warning says that the order takes it as 0
(`docs/specs/analyses/popDists.md`). It is one comparison with 0 made by
the application, for the order and never for a number shown. The
reason: a negative estimate of a distance is an estimate of 0 that
sampling pushed below it. Not taken: the order of the metadata file
whenever a distance is negative, with which a dataset with two close
populations, where the order helps most, loses it for every
population.

### 15. The colours of the heatmap start at 0

"yes, at 0". The darkest colour of the heatmap is a distance of 0, and
the lightest the largest distance of the matrix; the colours run from
dark purple to yellow, 256 steps (`docs/specs/analyses/popDists.md`,
`docs/specs/charts/heatmap.md`). So the colours say how far apart the
pairs are: on `panel.nei` the three pairs, 0.1027 to 0.1096, fall at
steps 239, 245 and 255 of the 256, where 255 is the lightest yellow,
three yellows that look alike, since the three pairs are about equally
far apart; the values in the cells and the table give the differences.
Not taken: colours from the smallest distance of the matrix, with which
the same three pairs are the darkest, the middle and the lightest, and a
difference of 0.007 looks as large as one of 0.3, which the principle of
`docs/functionality.md`, nothing that misleads without warning, rules
out.

### 16. Above 200 populations, neither the heatmap nor the table

"whatever, more than 50 populations is already too much for this app".
The recommendation stands: above 200 populations the panel of the
distances draws neither the heatmap nor the table, says how many
populations there are, and offers the table's download as CSV
(`docs/specs/analyses/popDists.md`). The table has a row per pair: 250
populations are 31,125 rows, and a column of 1,000 names chosen by
mistake as the populations gives 499,500 pairs, which a table that makes
an element of the page for each row would take seconds to draw, an
estimate not measured; the heatmap draws up to 200 populations. The
numbers are calculated and can be taken out, and a column chosen by
mistake shows its count at once. The owner added that more than 50
populations is already beyond what the application is for; 200 stays
the bound, since it is the most the heatmap draws. Not taken: the analysis locked
above 200 populations, and the table drawn whatever its size.

### 17. A MAF filter on the spectrum raises a warning

"add the warning". The spectrum reads every filter of the Variants
step, as the table of the diversity does, and when a MAF filter is on a
warning says what the filter removed and to turn it off
(`docs/specs/analyses/sfs.md`). The MAF filter removes the variants
whose rarer allele is rare in all the individuals kept, taken together,
and so empties the first bars of the spectrum, the variants with one or
a few copies of the rarer allele in the draw: on `panel.nei`, after
the missing data filter at 0.05 with which the flow of the diversity
is tested, the filter at 0.95 removed 24 of the 1,152 variants, and the
share of p2 at one copy of the rarer allele fell from 0.0424 to 0.0367;
with the missing data filter at its default of 0.1, which keeps all
1,200, it removed 25, and the share fell from 0.0426 to 0.0367. The filter is off by default in
the population genetics application, so a user who sees the warning
turned it on. Not taken: the spectrum reading every filter but the MAF,
as the LD decay reads every filter but the LD pruning (decision 8),
with which it reads other variants than the table whenever a MAF filter
is on, and needs a pass and a Run of its own for those projects.

### 18. The bars of the spectrum are shares

"OK". popnei gives, for each count of the rarer allele in the draw, the
expected number of the population's variants with that count. Each bar
of the spectrum is a share of the population's variants that show both
alleles in the draw, so the bars of a population sum to 1; the variants
that show one allele only are in the table and not drawn; one vertical
scale serves every population (`docs/specs/analyses/sfs.md`). So
populations with different numbers of variants compare by their shapes.
The table and the CSV give both the shares and popnei's expected
numbers. Not taken: popnei's expected numbers as the heights, the bar of
one allele drawn or not, with which two populations with different
numbers of variants differ in height for that reason too.

### 19. popnei is asked to refuse a variants file not sorted by position in the LD decay

"yes, popnei should refuse non-sorted files in those cases. open an
issue". The issue is popnei issue #5, opened on 30 September 2026
(below, "Asked of popnei"). popnei's `calcLdAndDistPerPop` counts the
pairs of a variant with the variants held within the largest distance
of it, and drops a block of variants once none is in reach, so a file
whose chromosomes are interleaved, or whose positions go back, gives
fewer pairs, with no word: 1,517,002 of 1,520,324 pairs on a file made
for it, and 7,785 of 3,044,978 lost with two chromosomes interleaved
(node, `js-v0.1.0-dev.3`). The LD pruning of the Variants step, popnei's
LD filter, refuses such a file already, and the application has the
words for that refusal, which it gives this one too once a release of
popnei has it (`docs/specs/analyses/ldDecay.md`). The check is popnei's,
where the numbers are verified, and it costs the pass nothing. Stage 5
does not wait for the release: until then, the help of the panel says
the file must be sorted, and no check is made. Not taken: a check in the
application, a pass of its own over the whole file reading the
positions, minutes more for each Run on a file of several GB; and
leaving it, with a line of the help alone.

## Decided by the owner on 1 October 2026: the distances, the heatmap and what the analyses share

On 1 October 2026 the owner tried the panel of the distances between
populations as built, in Firefox, with their own data, at the first
stop of `docs/plans/population-analyses.md`, and took every
recommendation of the plan's report as written. The report,
`docs/plans/population-analyses.report.md`, names them A1 to A9, under
"Stop A", and by number under "For the owner, as the work goes"; each
is below under what it decides, with its name there. The specs changed
are `docs/specs/analyses/popDists.md`, `docs/specs/charts/heatmap.md`
and `plot2d.md`, `docs/specs/core/project.md`, and a sentence each of
`docs/specs/analyses/diversity.md`, `pca.md` and
`docs/specs/steps/variants.md`.

The warnings and the locks of the distances (`popDists.md`, "The
warnings" and "Why it cannot run"):

- **The warning of a negative distance says what the heatmap does only
  when it does it** (A1). "The heatmap orders them as if the distance
  were 0, and shows the value." is written when a heatmap is drawn, 200
  populations or fewer, and a measure the warning names is ordered by
  similarity; with the order of the metadata file, "The heatmap shows
  the value."; above 200 populations, where no heatmap is drawn,
  nothing. The warning is made once for a result, so it reads the
  orders of the measures it names, not the measure the radio buttons
  draw. Not taken: the sentence as it was, in every case.
- **A pair with variants and no Fst has a warning of its own** (A2),
  "p0 and p2 share one allele at every variant counted for them, so
  Hudson's Fst has no value (0/0)." popnei gives no Fst where its
  divisor is 0. Not taken: "no value" in the table beside a count of
  variants, unexplained.
- **At a minimum of 0 or 1 the warnings do not count individuals**
  (A3): "p0 and p3 have no variant at which both have a called
  genotype, so the pair has no distance.", and, for the pairs over fewer
  variants, "at the others, one of the two populations has no called
  genotype." Not taken: "fewer than 0 individuals with a called
  genotype".
- **The lock's advice names the field as its label does, and where it
  is** (A4): "Lower the number of individuals needed, above". Not
  taken: "Lower the minimum of individuals below", the field being
  above the Run button and labelled "Individuals with a called genotype
  needed in each population, per variant".
- **When every pair is over fewer variants, the warning says "All"**
  (A6): "All 20,100 pairs are over fewer than the 1,152 variants kept,
  down to 641 (56%) for p0 and p3.", without the clause "at the
  others, …". Not taken: "20,100 of the 20,100 pairs … at the
  others, …".
- **Two sentences of the warnings are the code's** (point 9): the
  advice of a population left out, when the filters of individuals took
  some of it, is one list with one "or", "lower the minimum of
  individuals, merge it with another population in the metadata file,
  or loosen the filters of individuals in the Variants step"; and the
  warning of several negative pairs ends "shows the values". Not taken:
  the spec's two "or" and its singular.
- **The lists or the filters of individuals leaving one population
  lock with words of their own** (point 10): "The lists of individuals
  leave one population, p0, and the distances need two or more. Change
  the lists in the Variants step.", and, known once the individuals
  kept are, "The filters of individuals leave one population, p0, and
  the distances need two or more. Loosen the filters of individuals in
  the Variants step." The words of the minimum are given only when two
  populations or more are left. Not taken: "Only p0 has 20 individuals
  or more … Lower the minimum…", which cannot help when the others have
  no individual.

What both panels say before a Run, and every download:

- **The populations under the minimum, of two or three** (A5): "p0a and
  p0b have 24 and 24 individuals, fewer than the minimum of 25, and are
  left out", in the distances and, with its own consequence, in the
  diversity (`project.md`, `underMinimumText`). Not taken: "…have fewer
  individuals than the minimum of 25, 24 and 24, …", which reads as
  three minimums.
- **A name that a spreadsheet would run as a formula is written with a
  quote before it** (A7): in every CSV of the application, a cell of
  text that starts with "=", "+", "-" or "@", the name of a population,
  of an individual or of a column, is written `'=p1`; a number is never
  changed, so `-0.0128` stays a number (`diversity.md`, "What it
  shows"). Not taken: the names as they are.

The Python script of the distances (`popDists.md`, "Its lines of the
Python script"):

- **The lines follow the six steps of the application's order, and keep
  a population only when it holds an individual** (point 11). Run in
  popnei's Python on 1 October 2026 they gave the application's numbers
  and orders, also where the lines of 30 September raised: at a minimum
  of 0 with a population left empty, on a pair of no value, on
  distances all 0 or below, and with two populations. Not taken: lines
  that raise where the application gives a result.

The heatmap (`heatmap.md`):

- **The grid is at the bottom left of its frame** (point 4), so that
  the names of the columns stand right under them. Not taken: the grid
  at the top, with the names 90 to 130 pixels below the last row at 640
  pixels; an option of the base of the plots that places the axis.
- **The heatmap has a least width, and scrolls sideways below it** (A8
  and point 13): the margins of its names and its legend and a grid of
  128 pixels; the box scrolls as the tables do and is reached with the
  Tab key. Not taken: names cut shorter as the width falls.
- **When the names are not written, the margins are made without them**
  (point 13), so the grid takes the room: below bands of 12 pixels, 8
  pixels left and below. Not taken: the margins kept empty, 270 pixels
  of 640 with 32 populations of long names.
- **A name is counted at 9 pixels a character in the margins** (point
  21), where it was 7.2. The recommendation offered a measurement of
  each name in the browser, or 9 pixels; the measurement was not taken,
  since it needs the font loaded and a browser, which the tests of the
  plots do not have (`.claude/skills/coding/charts.md`, "The margins").
  At 9 pixels a name of 20 capitals fits, and "WMA", made of the two
  widest letters, still loses 3.2 pixels of its "W", where it lost 8.6.
- **The 56 pixels under which a cell holds no value, and the width of
  40rem**, the two values the spec gave as "meanwhile", are kept.

The modules and two sentences of the specs:

- **The functions the three analyses share are in a module of their
  own, `src/core/populations.ts`** (point 2), so that `project.ts` and
  `individualsKept.ts` no longer import each other, and the helpers
  beside them are listed in the spec (point 3; `project.md`, "What the
  analyses per population share from stage 5"). Not taken: the functions
  left in `project.ts`, where a constant added at the top of either
  module could stop the page at load.
- **Two sentences corrected** (A9): `steps/variants.md` names the
  distances among what an empty distance of the LD pruning locks; and
  the interface of `popDists.md` lists `MEASURE_NAMES`,
  `PopDistsHeatmap` and `orderText` giving none for two populations. The
  report said the LD decay locks too; it does not, since it does not
  read the LD pruning (decision 8), and the sentence says so.

## Decided by the writers of the specs, for the owner to overrule

Each is written in its spec with its reason and the option not taken;
none is asked, and each stands unless the owner says otherwise.

The diversity (`docs/specs/analyses/diversity.md`):

- No private alleles when one population alone is in popnei's call,
  "All individuals" or a column of which one population has the minimum:
  popnei would count every allele called as private, 2,304 for "All
  individuals" of `panel.nei`. The three columns say "no value", and a
  warning says why.
- The check numbers the project file keeps stay the number of variants
  and three numbers per population, as in stages 2 to 4, and the key
  version is raised to 3: more numbers would make every project file of
  stages 2 to 4 with a diversity refused at the opening as damaged.
- The table has 11 columns, F after the proportion of polymorphic
  variants, so that the first five columns of the CSV are those of
  stages 2 to 4; the private alleles have three columns, their total,
  their mean per variant and that mean rarefied.
- A draw larger than the chromosomes of the individuals kept locks the
  panel before the Run; without the lock popnei refuses it only after
  the whole first pass.
- A MAF filter raises no warning on the table, since every filter
  changes the variants the means are over; the spectrum warns (point
  17).
- The warning of variants outside the draw comes whenever one variant
  is outside it, the owner's rule of 25 September 2026 for the variants
  without a value, and `docs/functionality.md` says so where it said "at
  few of its variants".
- A haploid file has words for F, which popnei gives as no value.
- The populations under the minimum are named in the panel before the
  Run, as the distances name theirs, "p3 has 12
  individuals, fewer than the minimum of 20, so it will have no values,
  and is left out of the count of the private alleles of the others.";
  decided when the specs were made to agree.

The distances between populations (`docs/specs/analyses/popDists.md`):

- A matrix that no set of points has as its distances, as a matrix of
  Fst often is, is ordered by popnei's PCoA after Lingoes' correction,
  popnei's `correctDistsByLingoes`, which adds one amount to every
  squared distance so that the PCoA accepts the matrix, and keeps its
  first axis: of 200 random matrices of 3 to 10
  populations, 177 were such, and all 200 got the order of the first
  axis of the matrix itself. This settles the first point "Opened by
  the specs", below, but for the negative distances, point 14.
- The minimum of individuals has a field, default 20, since
  populations of 5 to 15 individuals are common in collections of
  varieties and breeds.
- Both measures are calculated in the one pass; the choice of Fst or D
  says only what the heatmap draws, calculates nothing, and is left out
  of the key, as the colouring of the PCA is.
- The panel comes after the diversity in the Analyses step, and the LD
  decay after it.

The LD decay (`docs/specs/analyses/ldDecay.md`):

- The largest major allele frequency of each population, popnei's
  `maxAllowedMaf`, 0.95 by default, is an option of the panel, from 0.5
  to 1.
- The warning of few individuals comes below 20, the minimum of the
  diversity: on popnei's reference file of LD, 10 individuals gave half
  distances of 10,509 to 11,357 bp where 50 gave 7,340 and 7,548.
- The panel locks when popnei's counts of each distance would pass 1 GB,
  40 bytes × the largest distance × the populations: 25,000,000 bp for
  one population, 8,333,333 for three. The plan measures an LD decay at
  that bound in Chromium and WebKit.
- The plot draws at most 16 populations, the rows its legend holds; the
  tables hold all.

## Decided by the owner on 30 September 2026, before the specs

The owner answered nine questions, each with its options, and a tenth
follows from the owner's standing rule.

### 1. The distances have no standard errors

"no standard errors". The distances between populations are popnei's
`calcPopDists` with no standard errors. Not taken: standard errors when
the user types the length of the blocks they are resampled over, which
depends on how far the LD reaches in the user's genome; and popnei's
blocks of one variant each, which are right only for unlinked markers.

### 2. The heatmap is ordered by popnei's PCoA of the distances

"OK to a". The heatmap orders the populations along the first axis of
popnei's `doPcoa` of the distance matrix, so that similar ones are
together, and in the order of the metadata file where popnei cannot
place them. Not
taken: a clustering tree written in the application; the file's order
always. The question put to the owner named one way it fails, a pair
with no distance; popnei refuses more matrices than that, and whether
the file's order serves for all of them was open, and the spec of the
distances settled it but for the negative distances (below, "Opened by
the specs", point 1; and point 14, above).

### 3. F is popnei's

"popnei's F". F is popnei's F_IS, the `fis` of `calcPopDiversity`: one
minus the mean observed heterozygosity over the mean unbiased expected
one. Not taken: the application's own 1 − Ho/He from popnei's
heterozygosities, which `docs/build-order.md` section 5 had said.

### 4. popnei is asked for the heterozygosities in the diversity's call

"Could you create an issue in popnei's github asking for that?". The
diversity table takes the expected and observed heterozygosities and the
proportion of polymorphic variants from popnei's `calcPerVarDistribs`,
and F, the alleles, the private alleles and the rarefaction from
`calcPopDiversity`, so it reads the variants file twice. popnei is asked
to give the first three from `calcPopDiversity` as well (below, "Asked of
popnei"). Until it does, the diversity calls both in one job of the
calculation worker, two passes.

### 5. The rarefaction draws the ploidy times the minimum number of individuals

"b, the minimum number of individuals allowed for the calculations". The
number of chromosomes of the rarefaction is by default the ploidy times
the minimum number of individuals, 40 for diploids and 80 for
tetraploids, and a field changes it. Not taken: the smallest population
times the ploidy, which `docs/functionality.md` said, and which rests
every population's values on the smallest. On `panel.nei` that is p0,
48 individuals, so a draw of 96 chromosomes: p0 reaches 96 called
chromosomes at 278 of its 1,200 variants and has rarefied values on
those alone, where a draw of 40
gives all three populations values on all 1,200 (popnei's release
`js-v0.1.0-dev.3` under node, 30 September 2026). Also not taken: no
default.

### 6. The proportion of polymorphic variants is not rarefied

"OK, leave out". On variants of two alleles the rarefied proportion of
polymorphic variants is the rarefied number of alleles minus 1, so it
would show the same thing twice. Not taken: showing it.

### 7. A population under the minimum has no private alleles, and the others keep theirs

"No private alleles for populations with fewer than 20 individuals", and
to the option of blanking the private alleles of every population when
one is under 20: "No, just leave that population out for that analysis".
A population under the minimum is left out of the call of popnei that
gives the private alleles, and shows none, with words that say why; the
private alleles of the others are counted among the populations that
remain, and the words say so. Left in, it would take the private alleles
of every population away: popnei counts them over the variants at which
every population reaches the minimum, and a population of fewer than 20
individuals reaches it at none. On `panel.nei`, with p0 cut to 12
individuals and left in, every population has 0 private alleles. Not taken: a warning and no private alleles for any
population; merging the small population with another.

### 8. The LD decay reads every filter but the LD pruning

"OK". The LD decay reads the variants every filter of the Variants step
keeps but the LD pruning, which would remove the pairs in LD that the
decay measures. Not taken: every filter.

### 9. The LD plot draws the bins, the fitted curve and the half distance

"if you have the numbers for the fitted curve you can draw the curve, no
need to ask popnei for that". The plot draws the mean r² of each bin of
distance and the curve popnei fitted to the pairs, evaluated in the
application from the two numbers of popnei's fit, `rhoPerBp`, by how
much the scaled recombination of the curve grows with each base pair,
and `r2AtZero`, the curve's value at a distance of 0, with a mark at
popnei's half distance, `halfDist`. Not taken:
the bins alone; asking popnei for the points of the curve.

### 10. The LD decay has no default largest distance

Decided by the owner's standing rule of no default that depends on the
genome, which set the distance of the LD pruning in stage 3. The largest
distance between the two variants of a pair, popnei's `maxDist`, has no
default: the user types it, and the analysis cannot run until then, as
the LD pruning cannot. Not taken: popnei's default of 1,000,000 base
pairs.

## Asked of popnei

- **The heterozygosities in `calcPopDiversity`**, popnei issue #4, opened
  on 30 September 2026 (https://github.com/JoseBlanca/popnei/issues/4):
  that `calcPopDiversity` accept `unbiased_exp_het`, `obs_het` and
  `poly_vars_ratio` in its list of statistics, each equal to the last
  digit to what `calcPerVarDistribs` gives, with the options
  `polyThreshold` and `ploidy`, so that the diversity is one pass. Stage
  5 does not wait for it.
- **The refusal of a variants file out of order in the LD decay**,
  popnei issue #5, opened on 30 September 2026 as the owner decided in
  point 19 (https://github.com/JoseBlanca/popnei/issues/5): that
  `calcLdAndDistPerPop`, `calc_ld_and_dist` in Rust, refuse a variant
  that comes out of order as its LD filter does, with the same refusal,
  which names the variant and its chromosome and says whether its
  position falls below the one before or its chromosome came back after
  another; a variant at the same position as the one before is not
  refused. And, in the JavaScript package, that a population named
  `__proto__`, a name that JavaScript treats specially, be kept in the
  result of `calcLdAndDistPerPop` and in the `foldedSfs` of
  `calcPopDiversity` as every other population is: today the first loses
  it, and the second holds it where a lookup by that name finds it but
  a list of the populations of the result does not. Stage 5 does not
  wait for it.

popnei's release `js-v0.1.0-dev.3`, which the application has
installed since stage 4, has every other calculation of the stage, as checked in its code and by running it under node on 30
September 2026: `calcPopDists`, `correctDistsByLingoes` and `doPcoa`,
`calcPopDiversity` with F, the private alleles, the rarefaction and the
folded SFS, and `calcLdAndDistPerPop` with the bins, the fit and the
half distance.

## Set by a measurement, not by the owner

Each has a value in its spec meanwhile, and the plan of stage 5
measures it where its code first meets it:

- **The memory of the LD decay in the browsers**: the growth of the
  browser and its size 3 s after a Run, with the restart of point 12 and
  without it, in Chromium and WebKit, on a VCF of 20,000 variants and
  1,000 individuals, at 100,000 and 1,000,000 bp; and an LD decay at the
  lock of 1 GB of counts, over a file whose positions are not evenly
  spaced, so that most distances hold a pair, with the time of the fit
  that follows the pass and tells no progress; and a file of 1,000
  individuals with a variant every 100 bp at several million base
  pairs, since the lock bounds popnei's counts and not the variants it
  holds within the distance, about 3 to 4 GB there by extrapolation: if
  a tab closes, the lock counts the individuals as well.
- **The time of the second pass of the diversity**, while popnei issue
  #4 is open, on `panel.nei` and on the `.nei` file of 19,161,178 bytes
  of `docs/architecture.md` section 13, so that the owner knows what the
  issue would save.
- **The time of the distances between populations**, on the same two
  files, with three populations and with twenty.

## Opened by the specs

1. **The order of the heatmap when popnei's PCoA refuses the matrix.**
   Found on 30 September 2026 in the documentation of `doPcoa` in
   `js-v0.1.0-dev.3`: it refuses a matrix with a pair that has no
   distance, one with a negative distance, and one that no set of points
   has as its distances. Settled by
   the spec of the distances as its writer's decision, above: a matrix
   that no set of points has as its distances is corrected by Lingoes' method, which keeps the
   first axis; two populations, a pair with no distance, every distance
   0, and any other refusal keep the file's order. The negative
   distances are point 14.
