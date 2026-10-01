<!-- spec: docs/specs/analyses/sfs.md -->
<!-- heading: The site frequency spectrum -->
<!-- row: the site frequency spectrum -->
<!-- sections: "The cases" and "How it is verified" -->
<!-- file sfs: src/core/analyses/sfs.test.ts -->
<!-- file sw: src/ui/analyses/diversity/spectrumWords.test.ts -->
<!-- file dui: src/ui/analyses/diversity/panel.test.ts -->
<!-- file div: src/core/analyses/diversity.test.ts -->
<!-- file run: src/worker/runner.test.ts -->
<!-- file e2e: e2e/diversity.spec.ts -->

The spec was written for stage 5 and is mapped whole. The spectrum is
calculated in the diversity's call and drawn as a block of its panel,
so its tests are among the diversity's.

### The cases

| item | test | note |
|---|---|---|
| A population under the minimum: not in popnei's call, `calculated` false; in the block a line with the words of the minimum, from the diversity's options, and no histogram {{@ - **A population under the minimum number of individuals.** Not in}} | {{run: p0 cut to 12 individuals and left out of calcPopDiversity has NaN in its six numbers and no spectrum, …}}; {{sfs: a population not given to popnei is not calculated and not in the CSV}}; {{sw: the lines in place of a histogram: …}}; {{dui: its caption, a group per population named by its heading, one histogram for the population with shares, …}} | |
| It is not in the table nor in the CSV {{@ It is not in the table nor in the CSV.}} | in part: {{sfs: a population not given to popnei is not calculated and not in the CSV}} | the CSV leaves it out; the table keeps its two columns with "no value", as {{dui: the tab of the table shows a row per count and two columns per population, no value in those of a population not calculated, …}} checks: "Where a spec and the code differ", above |
| Populations that hold fewer than 2 chromosomes between them, one haploid individual: no call, the minimum and `calculated` false; its line says it holds fewer than 2 chromosomes {{@ - **Populations that hold fewer than 2 chromosomes between them**}} | {{div: run sends it with no population for calcPopDiversity, the first pass alone, and the draw of 2}}; {{sw: the lines in place of a histogram: …}} | |
| A population that no variant counted for, or that reached the draw at none: `variantsInDraw` 0, a spectrum of zeros, no shares, a line, no histogram; its rows in the table and the CSV, zeros with empty shares {{@ - **A population that no variant counted for, or that reached the draw}} | {{+sfs: a population calculated that reached the draw at no variant has a spectrum of zeros and no shares, and its rows of zeros with empty shares in the CSV}}; {{sw: the lines in place of a histogram: …}}; {{sw: the columns and cells of the table, and the name of the download}}; {{+run: a draw of 130 gives p0, whose 96 chromosomes never reach it, …}} | |
| A size of the draw above the ploidy times the minimum: on `panel.nei` at n = 96, p0 reached it at 278 of its 1,200 variants, a spectrum of whole numbers; the line of each population gives its variants in the draw, and the diversity's warning names it {{@ - **A size of the draw above the ploidy times the minimum.**}} | {{+run: a draw of 96 with no filter: p0, of 48 individuals, reaches it at 278 of its 1,200 variants, …}}; {{sw: the line under a heading, and the description of the histogram with its largest share}}; {{div: p0 in a draw of 96 at 277 of its 1,152 variants gives variantsNotInDraw with 24%, …}} | |
| An odd size of the draw: `floor(n / 2) + 1` bins, 21 for 41; the line about the half height of the last bin left out {{@ - **An odd size of the draw.**}} | {{run: an odd draw, 41, gives spectra of 21 values, floor(41 / 2) + 1}}; {{sfs: an odd draw gives floor(n / 2) + 1 bins, the last with its share}}; {{sw: the axis, the line under the histograms of an even and an odd draw, and too many bars}} | |
| More than 1,000 bins drawn, a draw above 2,001: no histograms, the block says why, the table and the CSV hold every bin {{@ - **More than 1,000 bins drawn, a size of the draw above 2,001.**}} | {{dui: a draw of more bars than a histogram draws gives the line in their place, and the table stays}}; {{dui: the bar limit: a draw of 2,000 draws its 1,000 bars, and one of 2,002 does not}}; {{sw: the axis, the line under the histograms of an even and an odd draw, and too many bars}} | |
| The filters keep no variant: popnei refuses the diversity's call, the panel shows the diversity's error, and the block is not shown {{@ - **The filters keep no variant.** popnei refuses the diversity's call}} | {{div: refusalText of an empty pass tells to loosen the filters}}; {{run: filters that keep no variant are refused with popnei's counts of the pass}} | the block is part of the result, which a refusal does not have |
| Every variant of a population the same allele in the draw: no shares, a line {{@ - **Every variant of a population the same allele in the draw**}} | {{sfs: the worked example: the shares, the variants in the draw and the largest share}}; {{sw: the lines in place of a histogram: …}} | |
| One population, "All individuals": one histogram, the same words; `panel.nei` as one population, a spectrum of 21 bins over its 1,200 variants at n = 41 {{@ - **One population, "All individuals".**}} | {{+run: All individuals at a draw of 41 with no filter: one spectrum of 21 values over the 1,200 variants}}; {{run: All individuals, one population, gives F and the alleles, …}} | |

### How it is verified

| item | test | note |
|---|---|---|
| `spectraOf` of a population not calculated: `calculated` false, `expected` empty, `shares` `null`, left out of the CSV {{@ - **`spectraOf` of a population not calculated**}} | {{sfs: a population not given to popnei is not calculated and not in the CSV}} | |
| `spectraOf` on the worked example: the shares `[0.5, 0.5]` and 5, no shares and 3, `largestShare` 0.5 {{@ - **`spectraOf` on a worked example.**}} | {{sfs: the worked example: the shares, the variants in the draw and the largest share}} | |
| the same object for the same result {{@ The same object for the same result, compared with `===`.}} | {{sfs: the same object for the same result}} | |
| a `foldedSfs` of 2 values for n = 4 throws the defect {{@ A `foldedSfs` array of 2 values for n = 4 throws the defect.}} | {{sfs: a spectrum of 2 values for a draw of 4 is a defect}} | |
| `noSpectrumLine` of a population not calculated: the words of the minimum, and of fewer than 2 chromosomes {{@ - **`noSpectrumLine`** of the block's words}} | {{sw: the lines in place of a histogram: …}} | |
| `spectrumWarnings`: none without a MAF filter {{@ - **`spectrumWarnings`**: no warning without a MAF filter;}} | {{sfs: no warning without a MAF filter}} | |
| none with one that kept every variant it was given {{@ none with one that kept every variant it was given;}} | {{sfs: no warning for a MAF filter that kept every variant it was given}} | |
| the MAF filter at 0.95, 1,152 given and 1,128 kept: the text to the letter {{@ with a project whose MAF filter is at 0.95,}} | {{sfs: the text of the flow's MAF filter at 0.95, to the letter}} | |
| `spectraCsv` on the worked example, to the letter {{@ - **`spectraCsv`** on the worked example, to the letter.}} | {{sfs: the worked example, to the letter}} | |
| The numbers of popnei at n = 40 with no filter: the shares of p0 at bins 1 and 20, of p2 at bin 1, and `largestShare` 0.05618145165329451 {{@ - **The numbers of popnei**, with a result written as literals}} | {{sfs: panel.nei at a draw of 40 with no filter}} | |
| The runner: `foldedSfs` in the request's order, 21 values each, p0's first two values, and equal to a call that asks `folded_sfs` alone {{@ - **The runner**, in its test under node over `panel.nei`}} | {{run: the spectra with no filter are in the order of the job, of 21 values each, …}} | |
| The flow of the diversity goes on to the block: three histograms, each titled with its population, 20 bars each, and the table of 21 rows {{@ In Playwright, in Chromium, Firefox and WebKit, the flow of the}} | {{e2e: PA7 D2 three histograms, each headed by its population, of 20 bars, and the table of 21 rows, and axe}} | in Chromium and WebKit |
| with the MAF filter at 0.95 after the missing data filter at 0.05, the warning "…it removed 24 of the 1,152 it was given. …" in the block, after its caption, and not among the warnings above the table {{@ with the MAF filter at 0.95 added to the flow's missing}} | {{e2e: PA7 D2 the MAF filter at 0.95 after the missing data filter at 0.05 gives the warning of the spectrum, …}} | in Chromium and WebKit |
| the heading "Site frequency spectrum" at level 3 and those of the populations at level 4 {{@ the heading "Site frequency spectrum" at}} | {{e2e: PA7 D2 three histograms, each headed by its population, …}} | in Chromium and WebKit |
| the description of p0's histogram starting "1,152 variants in the draw" {{@ the description of p0's histogram starting "1,152 variants in the draw"}} | in part: {{e2e: PA7 D2 three histograms, each headed by its population, …}} | the flow runs at the default missing data filter, 0.1, and reads each description whole from "1,200 variants in the draw"; no flow reads it at the filter at 0.05 |
| the block at 320 pixels wide, and axe {{@ is looked at in both themes and at 320 pixels wide}} | {{e2e: PA7 D2 at 320 px the block of the spectrum is one histogram to a row and the page does not scroll sideways, and axe}} | both themes are the pictures of `npm run screens`, which the owner looked at, at stop B |
