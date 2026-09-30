# The folded site frequency spectrum of each population

Written on 30 September 2026, for stage 5 of `docs/build-order.md`, the
analyses of the populations. There is no code of it yet. This spec gives
the folded site frequency spectrum (SFS) of each population, the part of
section 6 of `docs/functionality.md` headed "The site frequency
spectrum": what popnei gives for it, how it rides in the pass of the
diversity, what it warns of, the functions of core that turn it into rows,
a CSV and warnings, and the block of the diversity's panel that draws it.
It develops section 4 of `docs/architecture.md`, whose shape of an
analysis it adds to the diversity's rather than filling again, and the
rows `analyses/` and `charts/` of its section 9. It depends on
`docs/specs/analyses/diversity.md`, revised for stage 5 beside this spec,
and on `docs/specs/charts/histogram.md`, which draws it; what it needs of
them is listed at the end, in "What this spec asks of other documents".

A few words are used throughout. The **spectrum** of a population counts
its variants by how many copies of the rarer allele they show. **Folded**
means that the count j and the count n − j are one bin, since nothing in
a VCF says which allele is the ancestral one. The **draw** is popnei's
way to make the spectra of variants with different numbers of called
genotypes, and of populations of different sizes, comparable: at each
variant, n of the called alleles of the population are taken without
replacement, and the spectrum is the expectation over every such draw,
which popnei calls projection. n is `numCalledAlleles` of popnei's
`calcPopDiversity`, the same number the rarefaction of the diversity
draws, and this spec calls it the **size of the draw**. A **pass** is one
reading of the variants file from start to end, minutes on a file of
several GB. The **minimum number of individuals**, 20 by default, is how
many individuals of a population must have a called genotype at a
variant for the variant to count for it, popnei's `minNumIndividuals`.
The words of the application are those of `docs/architecture.md`: a
**job** is one request the page sends the calculation worker, the second
thread of the tab where popnei runs; the **Run** button of an analysis
sends its job; and the **key** of a result is a hash of everything it was
calculated from, so that a change of any of those takes the result off
the screen, and the **key version** is a number of the analysis raised
when its result changes meaning for the same inputs (section 3). The
**store** is the part of core that holds the project, the cache of the
results and the state of each analysis (section 9).

The diversity's job makes two passes until popnei issue #4 is closed:
one of `calcPerVarDistribs`, for the expected and observed
heterozygosities and the proportion of polymorphic variants, and one of
`calcPopDiversity`, for F, the alleles, the private alleles and the
rarefaction; the issue asks popnei to give the first three from
`calcPopDiversity` too, so that one pass does (decision 4 of
`docs/specs/stage-5-open-points.md`).

## What is decided here, and what is asked

The spectrum is part of the diversity: the same call of popnei, the same
pass, the same size of the draw and the same field that sets it, the
same Run, and a block of its own in the diversity's panel, below the
table (**Open 1**, below). Each population's spectrum is drawn as a small
histogram of its own, the histogram of stage 3 with three additions:
heights that are not whole numbers, one vertical scale shared by the
histograms of every population, and ticks at whole counts. The heights
are shares of the variants that show both alleles in the
draw, so that populations with different numbers of variants can be
compared, bin 0 is in the table and not drawn, and every histogram has
the same vertical scale (**Open 3**). A MAF filter of the Variants step raises a warning on the
spectrum and is not left out of its pass (**Open 2**).

## The module

### What it does

popnei's `calcPopDiversity` (`js/popnei/src/diversity.ts`) gives the
spectrum when its option `stats` names `folded_sfs` and a size of the
draw is given; without the size it refuses the call. Its field
`foldedSfs` holds, under the name of each population, a `Float64Array`
of `floor(n / 2) + 1` values: the value at j is the expected number of
the population's variants that show j copies of the rarer allele in a
draw of n, for j from 0 to n / 2. The values are not whole numbers,
since each variant spreads over the bins by the chance of each count, and
they sum to `numVars.inDraw` of that population, its variants that
counted for it and reached n called alleles. On `panel.nei` with no
filter and n = 40, p0's 21 values sum to 1199.9999999999998, 1,200 but for the rounding of the last digit
(below, "The numbers of popnei"). A population no variant counted for has
a spectrum of zeros.

Asking for the spectrum in the call that gives the other statistics of
the diversity changes no value of theirs, as popnei's doc of `stats`
says and as node showed on `panel.nei` (below), and adds no pass: the
spectrum is counted from the same called alleles as the rest, while the
variants are read. What it adds is arithmetic, measured on the panel
held in memory, where no reading from the disk hides it: 50 calls each,
`calcPopDiversity` took 1.8 to 2.2 ms without the spectrum and 2.2 to
2.3 ms with it, and a call for the spectrum alone, a pass of its own,
1.2 ms (node 26.8.2 on an Apple M5 Pro, popnei's release
`js-v0.1.0-dev.3`, 30 September 2026). On a file of several GB a pass is
minutes of reading, which a separate call of the spectrum would add and
the shared call does not; the time of a pass on such a file is to be
measured by the plan of stage 5 (`docs/specs/stage-5-open-points.md`,
"Set by a measurement").

So the spectrum is not an analysis of its own, with its key, its job and
its Run. It is a statistic more of the diversity's call:

- **One pass.** The diversity's job asks `calcPopDiversity` for
  `folded_sfs` beside its other statistics, and the result of the
  diversity carries the spectra. A user who reads the table and the
  spectrum waits for one job, today two passes, one once popnei issue #4
  is closed (`docs/specs/stage-5-open-points.md`, decision 4).
- **One size of the draw.** The spectrum is drawn at the size the
  rarefaction draws, the ploidy times the minimum number of individuals
  by default, 40 for diploids, and the one field that changes it is the
  diversity's (decision 5 of `docs/specs/stage-5-open-points.md`). popnei
  documents rarefaction and projection as one operation on one number.
  With that default, a variant that counts for a population always
  reaches the draw, since it has at least the minimum of individuals
  called, so the spectrum of each population is over the same variants
  as the rest of its row of the table; on `panel.nei`, 1,200 of 1,200 for
  each of the three populations.
- **One key.** The size of the draw, the populations, the filters and
  the minimum are in the diversity's key already, and the spectrum
  depends on nothing else, so it adds nothing to the key; its arrival in
  the result is one of the changes for which the diversity's key version
  is raised in stage 5.

A population that the diversity leaves out of its call of
`calcPopDiversity`, one with fewer individuals than the minimum
(decision 7), has no spectrum: at no variant can it have the minimum of
individuals called, so its spectrum would be zeros whether it was in the
call or not. Its entry of `foldedSfs` is `null`, as its other values of
`calcPopDiversity` are NaN, and the block names it with the words of
"Its words". When no population has the minimum, the diversity makes no
call of `calcPopDiversity`, every entry is `null`, and the block holds
those lines alone.

### What it shows of each bin

The spectrum's bin 0 is the variants the draw is expected to show with
one allele only. In a VCF of variants, which holds no site that is the
same in every individual, bin 0 counts the variants that vary in other
populations and not, or rarely, in this one, so its size says more of
the other populations than of this one. It is shown in the table and not
drawn: the plot draws bins 1 to n / 2.

This section is **Open 3**, below. The height of bin j of a population
is its **share**: the value of bin
j over the sum of bins 1 to n / 2, the variants expected to show both
alleles in the draw. popnei gives expected numbers of variants, and two
populations have different numbers of them: on `panel.nei` at n = 40,
p0 has 1,155.2 and p2 1,151.7, and in a dataset whose filters leave one
population fewer variants the difference is larger. Shares compare the
shape of the spectra, which is what a user reads in them: an excess of
rare alleles, a lack of them. The table gives both the expected numbers,
popnei's, and the shares. This division is arithmetic on popnei's
numbers, which the application does (`docs/build-order.md`, section 4).
A population whose bins 1 to n / 2 sum to 0, every variant expected to
show one allele in the draw, has no shares, and its histogram is not
drawn.

When n is even, the last bin, n / 2, gathers one count, where every
other bin gathers two, j and n − j; so it is about half the height of
the bins before it (p0 at n = 40: 30.4 against 61.1 at bin 19). The
words under the plots say it, so that no user reads it as a fall.

### The warnings

The spectrum's warnings are among those of the diversity's `warnings(r,
p)`, after the diversity's own, and shown with them above the panel.
One is the spectrum's own:

| code | when | the text |
|---|---|---|
| `mafFilterOnSpectrum` | the request's filters hold a MAF filter with a threshold below 1, and it removed at least one variant: in `passStats.filtering.maf` of the result, popnei's counts of the pass, the variants the filter was given, `varsProcessed`, are more than those it kept, `varsKept` | "The MAF filter of the Variants step removes the variants whose commonest allele is above 0.95 in the individuals kept, taken together, and it removed 25 of the 1,200 it was given. So the spectrum lacks many of the rare alleles, and its first bins are lower than those of the population. To see every variant in the spectrum, turn off the MAF filter in the Variants step." |

The threshold is written as the project holds it, and the numbers with a
comma between groups of three digits, as `counted` of `project.ts` does.
A MAF filter that removed no variant raises nothing, and so does one at
1, which removes only the variants with no called allele: popnei's
`filterByMaf` keeps none of those, whatever the threshold, so the count
removed is not all of the frequency, and the text does not say it is. The warning is
about the spectrum; what the same filter does to the heterozygosities
and the number of alleles of the table is the diversity's to warn of
(asked below).

The filter acts on the frequency of all the individuals kept together,
not on each population's, so a variant rare in p0 and common in p2
stays: the spectrum loses some of its rare alleles, not all. On
`panel.nei` at n = 40, the MAF filter at 0.95 removed 25 of the 1,200
variants, and p0's share at bin 1 fell from 0.0330 to 0.0301, p2's from
0.0426 to 0.0367 (below, "The numbers of popnei"). A cut this uneven cannot
be undone by reading the plot, which is why the warning asks for the
filter off rather than for care.

No other filter warns. The missing data filter chooses variants by their
called genotypes and not by their alleles. The filter by observed
heterozygosity removes variants with too many heterozygous genotypes,
which in most datasets are paralogous regions read as one site, errors
the spectrum is better without. The LD pruning chooses variants by their
linkage with the ones already kept, not by the frequency of their rarer
allele, and whether it moves the shape of a spectrum was not measured:
`panel.nei` cannot tell, its 1,200 variants lying at positions 1 to
1,200 of one chromosome.

The diversity's warnings about the draw, a population that reaches the
size of the draw at few of its variants among them, hold for the
spectrum too, since it is the same draw, and are not given twice.

### The check numbers

None of its own. The spectrum comes from the same call and the same draw
as the diversity's numbers, whose check numbers already catch a variants
file or a popnei that gives other results; 21 more numbers per
population for a draw of 40 would say the same thing. The option not
taken was the share of bin 1 of each population, one number each.

### Its lines of the Python script

After the diversity's lines, whose call of `calc_pop_diversity` asks for
`folded_sfs` among its `stats` with `num_called_alleles=40`, and whose
result they name `diversity` (asked below). popnei's Python package
gives the spectrum as a pandas table, one row per count of the rarer
allele, `rarer_allele`, and one column per population:

```python
# The folded site frequency spectrum of each population, in a draw of
# 40 chromosomes: the expected number of variants with each count of the
# rarer allele, and the share of each count among the variants that show
# both alleles in the draw
spectrum = diversity.folded_sfs
print(spectrum.to_string())
both_alleles = spectrum.iloc[1:]
print((both_alleles / both_alleles.sum()).to_string())
```

The 40 is the size of the draw of the project, written as a whole
number.

### The TypeScript interface

The spectra arrive in the diversity's result, `DiversityResult` of
`src/worker/protocol.ts`, as two fields its spec adds (asked below):
`numCalledAlleles`, the size of the draw the request gave, and
`foldedSfs`, one `Float64Array` per population in the order of `pops`
of the result, popnei's arrays put back in the request's order as the
runner puts every array of the diversity, and `null` for a population
not given to `calcPopDiversity`. With `numVarsInDraw`, popnei's
`numVars.inDraw`, one whole number per population in the same order,
which the diversity's result carries for its rarefaction (asked below),
and `passStats`, which every result carries, that is all this module
reads.

The functions the block of the panel calls, in
`src/core/analyses/sfs.ts`:

```ts
/** The spectrum of one population, as the block draws it. */
export interface SpectrumOfPop {
  readonly population: string;
  /** False for a population not given to calcPopDiversity, under the minimum
      of individuals: then variantsInDraw is 0, expected is empty and shares null. */
  readonly calculated: boolean;
  /** The variants of the population in the draw, popnei's numVars.inDraw. */
  readonly variantsInDraw: number;
  /** popnei's values, bins 0 to floor(n / 2), expected numbers of variants. */
  readonly expected: Float64Array;
  /** Bins 1 to floor(n / 2) over their sum; null when that sum is 0. */
  readonly shares: Float64Array | null;
}

export interface Spectra {
  readonly numCalledAlleles: number;
  readonly pops: readonly SpectrumOfPop[];  // in the order of the result
  /** The largest share of any population, the top of every vertical axis; 0 when no population has shares. */
  readonly largestShare: number;
}

/** The spectra of a diversity result; the same object for the same result. */
export function spectraOf(r: DiversityResult): Spectra;

/** The spectra as the text of a CSV file (the panel, "What it shows"). */
export function spectraCsv(r: DiversityResult): string;

/** The warnings of the spectrum, which the diversity's warnings append. */
export function spectrumWarnings(r: DiversityResult, p: Project): Warning[];
```

`spectraOf` keeps its answer in a `WeakMap` keyed by the result object,
as `diversityRows` does, and not in the cache of the store, so that the
block, drawn again by React for the same result, gets the same object. It throws a defect, `popnei_web defect: ...`, when an array
of `foldedSfs` that is not `null` does not hold
`floor(numCalledAlleles / 2) + 1` values or
when `foldedSfs` has not one array per population, which would be a
defect of the runner.

### The cases

- **A population under the minimum number of individuals.** Not in
  popnei's call (decision 7), `calculated` false; in the block, a line
  with the words of "Its words", which take the minimum from the
  diversity's options in the project, as its warning
  `tooFewIndividuals` does, and no histogram. It is not in the table nor
  in the CSV.
- **A population that no variant counted for, or that reached the draw
  at none.** `variantsInDraw` 0, a spectrum of zeros, no shares: a line
  that says so, and no histogram; its rows are in the table and the CSV,
  zeros with empty shares.
- **A size of the draw above the ploidy times the minimum.** Some
  variants that count for a population may not reach it; on `panel.nei`
  at n = 96, p0, of 48 individuals, reached it at 278 of its 1,200
  variants, and its spectrum is over those, whole numbers since a draw of
  all 96 chromosomes is no draw. The line of each population gives its
  variants in the draw, and the diversity's warning about the draw names
  it.
- **An odd size of the draw.** popnei gives `floor(n / 2) + 1` bins, 21 for
  41, and the last bin gathers two counts, 20 and 21, like the others; the
  line about the half height of the last bin is left out.
- **More than 1,000 bins drawn, a size of the draw above 2,001.** The
  histogram refuses more than `MAX_HISTOGRAM_BINS`, 1,000
  (`docs/specs/charts/histogram.md`). The block does not draw the
  histograms and says why; the table and the CSV hold every bin.
- **The filters keep no variant.** popnei refuses the diversity's call,
  and the panel shows the diversity's error; the block is not shown.
- **Every variant of a population the same allele in the draw**, the
  sum of bins 1 to n / 2 at 0: no shares, a line that says so.
- **One population, "All individuals".** One histogram, with the same
  words; `panel.nei` as one population gave a spectrum of 21 bins over
  its 1,200 variants at n = 41.

### How it runs

In the calculation worker, inside the diversity's call, as above. The
spectra are `floor(n / 2) + 1` numbers of 8 bytes per population, 168
bytes per population at n = 40, and the cache counts them with the rest
of the result. `spectraOf` divides a few thousand numbers on the page at
most.

### How it is verified

With Vitest, at the highest functions that show each thing:

- **`spectraOf` of a population not calculated**: a third population
  with `foldedSfs` `null` and `numVarsInDraw` 0 gives `calculated`
  false, `expected` empty, `shares` `null`, and is left out of the CSV
  of `spectraCsv`.
- **`spectraOf` on a worked example.** A diversity result of two
  populations with `numCalledAlleles` 4, `numVarsInDraw` `[5, 3]` and
  `foldedSfs` `[1, 2, 2]` and `[3, 0, 0]`: the first has the shares
  `[0.5, 0.5]` and `variantsInDraw` 5, the second no shares and
  `variantsInDraw` 3; `largestShare` 0.5. The same object
  for the same result, compared with `===`. A `foldedSfs` array of 2
  values for n = 4 throws the defect.
- **`spectrumWarnings`**: no warning without a MAF filter; none with one
  that kept every variant it was given; with `passStats.filtering.maf`
  of 1,200 given and 1,175 kept and a threshold of 0.95, the text of the
  table above to the letter.
- **`spectraCsv`** on the worked example, to the letter.
- **The numbers of popnei**, with a result written as literals from the
  run below: at n = 40 with no filter, `spectraOf` gives p0 a share at
  bin 1 of 0.03296202862168288 and at bin 20 of 0.026276898456079615,
  p2 at bin 1 of 0.042616971066566346, and `largestShare`
  0.05618145165329451, p1's at bin 15.
- **The runner**, in its test under node over `panel.nei`
  (`docs/specs/worker/runner.md`): the diversity's result holds
  `foldedSfs` in the request's order, p0, p2, p1, each of 21 values,
  p0's first value 44.79323144486922 and second 38.07795856907602, and
  the values of the spectrum equal those of a call that asks
  `folded_sfs` alone, to the last digit.

In Playwright, in Chromium, Firefox and WebKit, the flow of the
diversity (`docs/specs/analyses/diversity.md`) goes on to the block: three
histograms, each titled with its population, 20 bars each, and the table
of 21 rows; with the MAF filter at 0.95, the warning's text. The block
is looked at in both themes and at 320 pixels wide, as
`.claude/skills/coding/testing.md` says, and axe runs on it.

### The numbers of popnei, and the command that gave them

popnei's release `js-v0.1.0-dev.3` under node 26.8.2, on 30 September
2026, from the root of the repository, with `e2e/fixtures/panel.nei`
and the populations of `e2e/fixtures/panel_pops.csv` (p0 of 48, p2 of
84, p1 of 68 individuals, in the order of the file):

```js
import * as p from "popnei"; import fs from "fs"; await p.init();
const rows = fs.readFileSync("e2e/fixtures/panel_pops.csv", "utf8")
  .trim().split("\n").slice(1).map((l) => l.split(","));
const pops = {}; for (const [i, g] of rows) (pops[g] ??= []).push(i);
const bytes = new Uint8Array(fs.readFileSync("e2e/fixtures/panel.nei"));
const v = p.openVars(bytes); // v.filterByMaf(0.95) for the second row
const r = p.calcPopDiversity(v, { pops, numCalledAlleles: 40,
  minNumIndividuals: 20, stats: ["folded_sfs"] });
```

| n, filter | population | variants in the draw | bin 0 | bin 1 | bin n / 2 | bins 1 to n / 2, summed | share at bin 1 | largest share, at bin |
|---|---|---|---|---|---|---|---|---|
| 40, none | p0 | 1,200 | 44.79323144486922 | 38.07795856907602 | 30.355250953099038 | 1155.2067685551308 | 0.03296202862168288 | 0.05590275165567829, 15 |
| 40, none | p2 | 1,200 | 48.34836722710054 | 49.07990431264654 | 29.716367046239476 | 1151.6516327728993 | 0.042616971066566346 | 0.055148953110288834, 11 |
| 40, none | p1 | 1,200 | 49.419228567305325 | 43.859352021499134 | 31.22705006573954 | 1150.580771432695 | 0.03811931601019699 | 0.05618145165329451, 15 |
| 40, MAF 0.95, 1,175 kept | p0 | 1,175 | 36.44032846059611 | 34.21378678743365 | 30.35525095309904 | 1138.5596715394038 | 0.030050060302218917 | 0.056720116395990845, 15 |
| 40, MAF 0.95, 1,175 kept | p2 | 1,175 | 38.38170270726871 | 41.7646232182723 | 29.71636704623948 | 1136.618297292731 | 0.03674463390018435 | 0.055878373568248194, 11 |
| 96, none | p0 | 278 | 4 | 2 | 4 | 274 | 0.0072992700729927005 | 0.043795620437956206, 40 |

The same call with every statistic of the diversity, `num_alleles`,
`private_alleles`, `variable_vars_ratio`, `fis` and `folded_sfs`, gave
the same spectra to the last digit. Without `numCalledAlleles` popnei
refuses `folded_sfs`, and with 402, above the 400 gene copies of the
panel's 200 diploid individuals, it refuses the draw; the diversity's
spec keeps both from any request.

## The block of the panel

The spectrum of each population, `docs/functionality.md` section 6, in
the diversity's panel, below its table, from the functions above. The
block is shown in the panel's state done alone; in the other six states
of the panel it is not there, and the panel says what the diversity's
spec says.

### What it shows

No option of its own. The size of the draw is the diversity's field,
above the table, and the block names it in its caption, so that a user
who reads the spectrum learns where it is set.

- **A caption**: "The folded site frequency spectrum of each population,
  in a draw of 40 of its chromosomes at each variant, over the 1,200
  variants of panel.nei the filters kept. The number of chromosomes is
  set above the table, with the rarefaction."
- **One histogram per population**, in the order of the result, each
  in a group of the page named by a heading the block writes in the
  page, the name of its population, since the title a plot is given is
  the `<title>` of its SVG, which browsers do not draw
  (`docs/specs/charts/plot2d.md`); a line under the heading,
  "1,200 variants in the draw, about 1,155 of them with both alleles",
  and the bins 1 to n / 2 with their shares. The horizontal axis,
  "Copies of the rarer allele among 40 chromosomes", runs from 0.5 to
  n / 2 + 0.5, each bar one count wide and centred on it, with ticks at
  whole numbers; the vertical axis, "Share of the variants with both
  alleles", runs from 0 to `largestShare` made round by the scale's
  `nice`, as the histogram's vertical axis is, the same in every
  histogram, so that heights compare across populations. No threshold,
  no legend.
- **A line under the histograms**: "Each bar is the share of the
  population's variants, among those that show both alleles in a draw of
  40 chromosomes, whose rarer allele is expected in that many of the 40.
  The last bar, 20, holds one count where the others hold two, such as 1
  and 39, so it is about half as tall. The variants that show one allele
  only in the draw are in the table and not drawn." The second sentence
  is left out when n is odd.
- **A table**, in a tab beside the histograms as every plot has it
  (`docs/specs/charts/histogram.md`, "The numbers without the picture"):
  one row per count of the rarer allele, 0 to n / 2, and, for each
  population, two columns, "p0, variants", the expected number to one
  decimal, and "p0, share", to four decimals; bin 0's share cell reads
  "not drawn".
- **A download**, "Download the spectrum as CSV", saves
  `panel.sfs.csv`, named as `panel.diversity.csv` is, with the text of
  `spectraCsv`: the header `population,rarer_allele,variants,share`, one
  row per population and count, the numbers as `String` writes them,
  and an empty share for bin 0; quoted as the diversity's CSV.

The spectra of a population with no histogram are replaced by a line,
in "Its words".

### The states

| state | what the user sees |
|---|---|
| empty, locked, ready, running, results removed, error | the diversity panel's state; the block is not shown, since it has nothing of its own to say in any of them |
| done | the caption, a histogram or a line per population, the line under them, the table in its tab, the download; the spectrum's warnings with the diversity's, above the panel |

### What it sends and reads

It sends nothing: the diversity's Run calculates it. It reads the
diversity's result from the store, through `spectraOf` and
`spectraCsv`, and the name of the variants file and the number of
variants kept, which the diversity's caption reads too.

### Its words

- The caption, the line under a title, the axes, the line under the
  histograms and the download: above.
- A population left out of the call (decision 7): "p3 has 12
  individuals, fewer than the 20 a variant needs to count for a
  population, so it has no spectrum."
- A population with no variant in the draw: "p3 has no variant with 40
  called chromosomes, so it has no spectrum."
- A population with no variant with both alleles in the draw: "Every
  variant of p3 in the draw shows one allele only, so its spectrum has
  no bar."
- Too many bins: "A draw of 2,400 chromosomes gives 1,200 bars per
  population, too many to draw. The table and the CSV hold them."
- The warning: "The warnings", above.
- The help drawer, stage 8: what the folded spectrum is and why it is
  folded; what the draw is, that it is the rarefaction's, and why it
  makes spectra comparable; that bin 0 is not drawn and why; that the
  heights are shares; that a VCF of a SNP array, whose variants were
  chosen for being common, gives a spectrum poor in rare alleles, which
  no warning can see; and the lines of the Python script.

### Accessibility

Each histogram has the text alternative of the base
(`docs/specs/charts/plot2d.md`), a description the block writes: "The
spectrum of p0: 1,200 variants in the draw of 40 chromosomes, about
1,155 with both alleles, in 20 bars from 1 to 20 copies of the rarer
allele; the largest share, 0.0559, at 15." The table is reachable by the
keyboard and read by a screen reader with a header cell for every column
and row. The keyboard goes through the tabs of the plots and the table,
then the download. The end of the run is announced by the diversity's
panel, and the block announces nothing of its own. No colour carries
anything: the populations are told apart by the headings of their
histograms, each histogram a group named by its heading, as the
histograms of the Variants step are (`docs/specs/steps/variants.md`).

### Left for the running application

How many histograms go in a row, their size, and whether the table
becomes one table per population when there are many populations.

## What this spec asks of other documents

Of `docs/specs/analyses/diversity.md`, revised for stage 5 beside this
spec:

- Its paragraph that makes the spectrum an analysis of its own, whose
  call does not ask for `folded_sfs` (in its draft of 30 September 2026,
  "The folded site frequency spectrum, which `calcPopDiversity` gives as
  well, is an analysis of its own ..."), is replaced by one that says
  the spectrum is a statistic of its call, shown in a block of its
  panel, as this spec gives it; the two cannot both stand, and **Open
  1** decides between them.
- Its call of `calcPopDiversity` names `folded_sfs` among `stats`, in
  each of its forms, with one population of enough individuals too, and
  its result carries `numCalledAlleles` and `foldedSfs`, one array per
  population in the order of `pops` (above, "The TypeScript
  interface"), and `numVarsInDraw`, popnei's `numVars.inDraw`, which its
  rarefaction needs as well.
- Its `warnings` appends `spectrumWarnings(r, p)` after its own, and its
  panel shows the block of this spec below its table in the state done.
- Its default size of the draw is never below 2, which popnei refuses:
  the ploidy times a minimum of 0, or of 1 for a haploid dataset, gives
  less.
- Its script names its result `diversity` and its `stats` hold
  `folded_sfs`, so that the lines of this spec follow it.
- It decides whether the MAF filter warns on its own table too: it
  removes the variants rare in all the individuals together, which moves
  the heterozygosities, the proportion of polymorphic variants and the
  number of alleles.
- The field of the size of the draw says that it sets the spectrum as
  well as the rarefaction.

Of the other specs:

- `docs/specs/worker/protocol.md` and `messages.md`: the two fields of
  `DiversityResult`, and their check.
- `docs/specs/worker/runner.md`, "The diversity": `foldedSfs`, which
  popnei gives as an object by population name, put in the order of the
  request's populations, as the other arrays are, `null` for a
  population not given to `calcPopDiversity`; its test puts populations
  named `10`, `9` and `p` in that order, which JavaScript iterates as 9,
  10, p, so that a runner that took popnei's order would fail it.
- `docs/specs/charts/histogram.md`: three additions for the spectrum.
  `counts` may be a `Float64Array` of values that are not whole, with
  the vertical ticks then as the scale gives them and not whole numbers
  only; an optional top of the vertical axis, `yMax`, which the screen
  gives so that several histograms share one scale; and the ticks of the
  horizontal axis at whole numbers only, when asked, which needs an
  option of the base for that axis alone, `xWholeNumbers` beside
  `yWholeNumbers` of `plot2d.md`, since its `tickShown` acts on both
  axes and would take away the ticks of the shares. `histogramRows` gives `count` as a number of
  either kind. Its "Not in this spec" names the histograms of several
  populations for stage 5: they are drawn side by side, one plot each.
- `docs/build-order.md`, stage 5: the folded SFS is part of the
  diversity, a block of its panel, and not a module of its own.
- `docs/functionality.md`, section 6, "The site frequency spectrum": the
  size of the draw is the rarefaction's, the heights are shares of the
  variants with both alleles in the draw, and a MAF filter warns.
- `docs/specs/stage-5-open-points.md`: the three open points below,
  under "Opened by the specs".

## Open points

**Open 1. The spectrum as part of the diversity, or as an analysis of
its own.** What is decided: whether the spectrum shares the diversity's
pass, its size of the draw and its Run.

- **Part of the diversity**, as this spec is written. One Run and one
  pass give the table and the spectrum; one number sets the rarefaction
  and the spectrum; nothing is added to the store or to the list of the
  analyses. A user who wants the spectrum alone waits for the whole
  diversity, today two passes of which the spectrum needs one.
- **An analysis of its own**, with its key, its job and its Run, calling
  `calcPopDiversity` for `folded_sfs` alone, one pass, and a field of
  its own for the size of the draw, or the diversity's read by its key.
  A user who reads both waits for three passes today, two after popnei
  issue #4. A field of its own would let a user draw a spectrum finer
  than 40 chromosomes, which the demographic inference that needs it
  does not do in the application (`docs/functionality.md`, section 10).
  An analysis of its own that is also filled by the diversity's pass,
  so that a user who ran the diversity waits for nothing more, would
  change the store: today it puts what one job gives under the key of
  another analysis in one case only, the counts of the filters that
  every pass gives, and a second case needs a design first (`docs/architecture.md`,
  section 4: adding an analysis changes nothing else).

The draft of `docs/specs/analyses/diversity.md` revised beside this
spec takes the second option, with the reason that one job of two
analyses would take both results off the screen at a change of the
options of either. The first option is not a job of two analyses: the
spectrum is a statistic of the diversity, with no option of its own,
and every input it has is already an input of the table, so there is
no change that should take one off the screen and not the other.

Recommended: part of the diversity. Meanwhile, the implementer builds
it as part of the diversity, as this spec gives it, once the owner has
decided and the two specs agree.

**Open 2. A MAF filter on the spectrum: a warning, or left out of its
pass.** What is decided: what the spectrum does when the Variants step
has a MAF filter, which removes the variants whose rarer allele is rare
in all the individuals together, and so lowers the first bins.

- **A warning**, as this spec is written: the spectrum reads every
  filter, as the table beside it does, and the warning says what the
  filter removed and to turn it off. The MAF filter is off by default in
  the population genetics application (`docs/functionality.md`, section
  3), so the user who sees it set it.
- **The spectrum reads every filter but the MAF**, as the LD decay reads
  every filter but the LD pruning (decision 8), since the filter removes
  what the spectrum measures. Then, whenever a MAF filter is on, the
  spectrum reads other variants than the table and cannot come from the
  diversity's pass: it needs a job and a pass of its own, which is the
  second option of Open 1, at least for those projects.

Recommended: the warning. Meanwhile, the implementer builds the
warning, `mafFilterOnSpectrum`.

**Open 3. The heights of the bars.** What is decided: what a bar of the
spectrum measures. `docs/functionality.md`, section 6, speaks of how
many variants fall in each bin.

- **Shares**, as this spec is written: each bar the share of the
  population's variants with both alleles in the draw, bin 0 in the
  table and not drawn, one vertical scale for every population. The
  shapes of the spectra compare across populations with different
  numbers of variants; the numbers of variants are in the line under
  each heading and in the table.
- **Expected numbers of variants**, popnei's values as they are, bin 0
  drawn or not. What a population holds is read off the axis, and two
  populations with different numbers of variants in the draw differ in
  height for that reason too, which the shape alone does not show.

Recommended: shares, with bin 0 not drawn. Meanwhile, the implementer
builds the shares; the table gives both, so the choice moves the plot
alone.

## Not in this spec

- The unfolded spectrum, with the ancestral allele given by the user:
  open point 3 of `docs/functionality.md`.
- The field of the size of the draw, its label, its default, its limits
  and its warnings: `docs/specs/analyses/diversity.md`.
- The spectrum as SVG and PNG, and its place in the report: stage 6.
- Demographic inference from the spectrum: left out
  (`docs/functionality.md`, section 10).
