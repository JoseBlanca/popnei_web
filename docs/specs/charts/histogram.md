# The histogram

Written on 26 September 2026, for stage 3 of `docs/build-order.md`, the
Variants step whole; approved by the owner on 26 September 2026. There is no code in
`src/charts` yet. Revised on 30 September 2026 for the folded site
frequency spectrum of stage 5 (`docs/specs/analyses/sfs.md`), drawn as
one histogram per population in the block of the diversity's panel:
counts that are not whole numbers, a top of the vertical axis the
screen gives, so that several histograms share one scale, and ticks at
whole numbers on the horizontal axis when asked; approved by the
owner on 30 September 2026. Revised on 1 October 2026 for the owner's
decisions of that day (`docs/specs/stage-5-open-points.md`): the left
margin follows the numbers of the vertical axis, the bottom one is 16
pixels deeper under a label on two lines, and the example of the
vertical axis of the spectrum is corrected. This spec gives the first plot of the applications: the
function of `src/charts/histogram.ts` that draws a histogram whose bins
are already counted, and marks which bins the threshold of a filter keeps
and which it removes. The Variants step draws five histograms with it:
the major allele frequency (MAF), the observed and the expected
heterozygosity of the variants, and the proportion of missing genotypes
and the observed heterozygosity of the individuals
(`docs/functionality.md`, section 3). It is drawn on the base of the 2D
plots, `docs/specs/charts/plot2d.md`, which gives it its SVG and frame,
its size, its axes, its text for a screen reader, its handle and its
export as SVG and PNG, and which the histogram is the first plot of; the
owner decided on 26 September 2026 that the export is not offered by a
button until stage 6 (point C of `docs/specs/stage-3-open-points.md`).
It develops the row `src/charts/` of section 9 of `docs/architecture.md`
and its section 7, "A plot draws the bins it is given". It depends on
`plot2d.md`, on `.claude/skills/coding/charts.md` and `css.md`, and on
two specs written beside it, `docs/specs/analyses/variantChecks.md` and
`individualChecks.md`, which call it; what it assumes of them is listed
at the end.

## What it does

### What the user sees

A histogram shows, for one statistic, how many variants or how many
individuals fall in each bin: bars side by side over a horizontal axis of
the statistic, from the first edge of the bins to the last, and a
vertical axis of the count, from 0. The three histograms of the variants
run from 0 to 1; the two of the individuals from their smallest value to
their largest (`docs/specs/analyses/individualChecks.md`). The title of the plot, the labels of
its axes and a description are given by the screen.

Beside a filter whose threshold is set, the histogram also shows what the
threshold does, and follows the number the user types as they type it,
with no calculation, since the counts of the bins do not depend on the
threshold:

- a dashed vertical line at the threshold, in the colour of the
  thresholds, `--chart-threshold`;
- the bars the filter keeps filled, and the bars it removes drawn as
  outlines only, so that the two are told apart without colour (WCAG 2.2,
  success criterion 1.4.1);
- a bar that holds values on both sides of the threshold, partly kept,
  filled on the left of the line and outlined on its right;
- a legend of three rows at the top right: the dashed line with the
  threshold, "Maximum 0.95" in an example, a filled square and the words
  of what is kept, and an outlined square and the words of what is
  removed. The three texts are given by the screen.

From 7 October 2026 a threshold may come with no legend, for the
thresholds of `popgen2.html`, which are no filters and which the screen
shows in a box after the short title, "Obs. het. max: 0.04"
(`docs/plans/thresholds.md`): the line and the bars as above, no
legend, and the top margin of a plot without one. From 8 October 2026
such a threshold may say that it keeps every value, `keepsAll` of
`HistogramThreshold`, which the screen knows from what it counted and
the bars drawn may not tell, a bar holding values on both sides of the
line: the line is then dotted, where the red one is dashed, and drawn in
a bluish grey, the class `chart-threshold-keeps-all`, a threshold that
removes nothing, which the screen says in words to a screen reader
(`docs/plans/popnei-0.2.2.md`, "The owner's first round"). The pattern
tells the two lines apart without their colour: a review that simulated
deuteranopia found the grey of the first round and the red at a contrast
of 1.10. The screen
lays the line the user drags over the plot, aligned with its frame,
which the histogram tells it after each draw that moves it,
`HistogramEvents.onFrame`.

Every filter of `docs/functionality.md` section 3 that has a histogram
keeps what is at most its threshold, as popnei's filters do, so the kept
bars are always on the left of the line. A histogram with no threshold,
the expected heterozygosity, or one beside a filter that is off, has every
bar filled, no line and no legend.

What is kept or removed is said of this filter alone. The other filters
remove variants or individuals too, and the numbers of what each filter
kept are shown beside the filters, from their counts
(`docs/architecture.md`, section 4, "What each filter kept"); the plot
does not count what is kept, since a partly kept bar does not say how many
of its values are on each side.

### Where the bins come from

The plot draws the bins it is given and counts nothing
(`.claude/skills/coding/charts.md`, "The contract of a plot"). The bins of
the statistics of the variants are popnei's, `histBinEdges` and
`histCounts` of the `StatsDistrib` that `calcPerVarDistribs` of
`js/popnei/src/stats.ts` gives; with one population, of every individual,
`histCounts` holds the bins of that population alone and is given to the
plot as it is. The bins of the statistics of each individual are made in
core, by `src/core/histogram.ts`, which
`docs/specs/analyses/individualChecks.md` specifies, from the values of
popnei's `calcPerIndividualStats`, with the rule of popnei's bins
(`docs/architecture.md`, section 7). `charts.md` gives every binning to
Rust; the architecture corrected that on 26 September 2026 for the
statistics of each individual, a few thousand numbers, and `charts.md` is
to be corrected so (below, "What this spec asks of other documents").

A value falls in the bin whose left edge is below it and whose right
edge is at least it, and the first bin takes its left edge too, as
popnei's bins asked with `closed: "right"` do from popnei 0.2.2
(`HistKwargs` of popnei's `stats.d.ts`), which both pages ask for since
7 October 2026 (`docs/plans/popnei-0.2.2.md`). So a bin holds the values
above its lower edge up to its upper edge, included, except the first,
which includes its lower edge too; the bars up to a threshold on an edge
hold the values at most it, what the filters keep.

### Which bins the threshold keeps

For a threshold t and a bin from l to r:

- **kept** when r ≤ t: every value of the bin is at most r;
- **removed** when l ≥ t, for a bin that is not the first, since every
  value of it is above l; for the first bin, which takes l too, when
  l > t;
- **partly kept** otherwise: the bin may hold values at most t and values
  above it.

A data that sets `firstBinOnLowerEdge` has its first bin **kept** when
l ≤ t as well, as if its values were all on l: the bin of 0 to 0.001 of
the missing rate on popgen2.html, which holds the variants with no
missing genotype alone below 1,000 individuals, and those with a missing
rate up to 0.001 with them from 1,000 on (8 October 2026). Without it, a
threshold of 0 would keep a part of it of width 0, and the bar would be
drawn removed.

The edges are compared as popnei gives them, the decimals i / n of the
range 0 to 1 since popnei 0.2.2, so that 0.95 is the edge 38 of 40 bins
and not the double above it, and the threshold as the project holds it,
which is the number the user typed (`docs/functionality.md`, section 3).

What that gives on `e2e/fixtures/panel.nei`, 1,200 variants of 200
individuals, with `calcPerVarDistribs` of every variant and individual,
`minNumIndividuals` 0 and 40 bins over 0 to 1 that hold their right
edge, and popnei's filters alone on the same file, in node on 7 October
2026 with popnei 0.2.2, the bins numbered from 0 at the left:

| statistic, threshold | bins kept | partly kept | removed | what popnei's filter keeps |
|---|---|---|---|---|
| MAF, 0.95 | 0 to 37, 1,175 variants | none | 38 and 39, 25 variants | 1,175 |
| observed heterozygosity, 0.6 | 0 to 23, 1,198 variants | none | 24 to 39, 2 variants | 1,198 |
| observed heterozygosity, 0.5 | 0 to 19, 1,098 variants | none | 20 to 39, 102 variants | 1,098 |
| observed heterozygosity, 0.51 | 0 to 19, 1,098 variants | 20, from 0.5, 54 variants | 21 to 39, 48 variants | 1,116 |

At 0.51 the line falls inside bin 20, and 18 of its 54 variants have a
heterozygosity of at most 0.51, which the filter keeps: the bin is
partly kept, its part right of the line drawn outlined, and the table of
the bins says it is partly kept (below, "The numbers without the
picture"). The legend has no row for a bar partly kept, and the outlined
part reads as removed, so that the plot would say 1,098 variants kept
where the filter keeps 1,116: the screen names the
bin a threshold splits in a line under the plot, as the owner decided on
27 September 2026 at stop A of `docs/plans/variants-step.md`; a fourth row of the
legend, the other way, would take room from the plot at 320 pixels
wide and change where the legend is placed.

### The axes

- **The horizontal axis** runs from the first edge to the last, 0 to 1
  for the three histograms of the variants and the range of the values
  for the two of the individuals, widened to take the threshold when it
  lies outside them, so that its line is always drawn. The axis of the
  major allele frequency, and the table of its bins, start at 0 too,
  though no variant of two alleles has a value below 0.5, so that the
  three histograms of the variants share one axis for every file; the
  owner kept it so on 27 September 2026.
    Its ticks are those the base draws, with the format of `d3-scale`'s
  linear scale (`plot2d.md`, "The axes").
- **The vertical axis** runs from 0 to the largest count, made round by
  the scale's `nice`, and from 0 to 1 when every count is 0. Its ticks
  are whole numbers only, written with a comma between thousands,
  "12,000", the base's `yWholeNumbers`. It is linear: a log
  axis cannot show a bin of 0, and the table gives every count.
- **From stage 5, for the spectrum**, three options. `counts` may be a
  `Float64Array` of values that are not whole, the shares of the
  spectrum, and the vertical ticks are then as the scale gives them and
  not whole numbers only. `yMax`, when given, is the top of the vertical
  axis before `nice`, in the place of the largest count, so that the
  histograms of the populations, each a plot of its own, share one
  scale, the largest share of any of them. `xWholeNumbers` asks the
  base for ticks at whole numbers on the horizontal axis alone
  (`plot2d.md`, "The axes"), the counts of the rarer allele, under bars
  centred on them from edges at the halves, 0.5 to 20.5.
- **A bin with a count of 0 has no bar.** It is still a row of the table.

## The TypeScript interface

The contract of every plot, in `src/charts/types.ts`, is the one of
`charts.md`, "The contract of a plot": `ChartHandle<Data>` with
`update`, `destroy`, `toSVG` and `toPNG`, and `Chart<Data, Events>`. The
histogram makes its handle with `createPlot2d` of `plot2d.md`, from its
definition, `kind` `"histogram"`, its `check`, its margins and its
`draw`.

What the histogram draws. Every text is the screen's, since the screen
knows what the numbers mean; the plot writes none of its own.

```ts
// src/charts/histogram.ts
/** With the texts of PlotText: xLabel "Major allele frequency", yLabel "Variants". */
export interface HistogramData extends PlotText {

  /** The edges of the bins, one more than the bins, finite and increasing. */
  readonly edges: Readonly<Float64Array>;
  /** The count of each bin, from the left; from stage 5 a Float64Array
      of values that are not whole, finite and not negative. */
  readonly counts: Uint32Array | Float64Array;
  /** The threshold of the filter beside the plot, or null for none. */
  readonly threshold: HistogramThreshold | null;
  /** From stage 5: the top of the vertical axis before nice, at least
      the largest count; the largest count when absent. */
  readonly yMax?: number;
  /** From stage 5: ticks at whole numbers on the horizontal axis. */
  readonly xWholeNumbers?: boolean;
  /** From 8 October 2026: the first bin drawn as if its values were
      all on its lower edge, kept whole by a threshold on that edge; the
      zeros of the missing rate on popgen2.html. False when absent. */
  readonly firstBinOnLowerEdge?: boolean;
}

/** A threshold that keeps what is at most `value`, with the legend of
    a filter, or with none (7 October 2026). */
export interface HistogramThreshold {
  readonly value: number;
  readonly legend: ThresholdLegend | null;
}

/** The rows of the legend: "Maximum 0.95", "Kept by this filter",
    "Removed by this filter". */
export interface ThresholdLegend {
  readonly label: string;
  readonly keptLabel: string;
  readonly removedLabel: string;
}

/** Where the frame was drawn, in CSS pixels from the top left of the
    element. */
export interface HistogramFrame {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface HistogramEvents {
  /** At the first draw, and at each draw that moves the frame. */
  onFrame?(frame: HistogramFrame): void;
}

export const createHistogram: Chart<HistogramData, HistogramEvents>;
```

The one event, from 7 October 2026, says where the frame is, for the
line of a threshold that `popgen2.html` lays over the plot; the
histogram has no hover and no selection (below, "Not in this spec").

What each bin holds and what the threshold does to it, as numbers. The
screen draws the table of the bins from these rows, and writes its
CSV and its description from them, so that the table and the plot never
disagree on a bin.

```ts
export type BinState = "kept" | "partlyKept" | "removed";

export interface HistogramRow {
  readonly from: number;           // the lower edge, as given
  readonly fromIncluded: boolean;  // true for the first bin alone
  readonly to: number;             // the upper edge, as given, included
  readonly count: number;           // a whole number, or from stage 5 a share
  readonly state: BinState | null; // null when there is no threshold
}

/** One row per bin, from the left, by the rules above. */
export function histogramRows(data: HistogramData): HistogramRow[];
```

`createHistogram`, `update` and `histogramRows` throw an `Error`, a
defect of the caller and not a state to show (`charts.md`), from the
`check` of the definition, when `counts` is empty,
when `edges` is not one longer than `counts`, when an edge is not finite
or not above the one before, when the threshold's value is not finite,
from stage 5 when a count of a `Float64Array` is not finite or is
negative, or `yMax` is below the largest count or not finite,
and when there are more than `MAX_HISTOGRAM_BINS` bins, 1,000, a constant
of `src/charts/limits.ts`: 40 bars are drawn as one element each, by a
join, and a thousand still are, while more would be a histogram no one
can read.

The ids, the export with its `PngError`, `charts.css` and
`src/charts/limits.ts`, which every later plot uses too, are the base's
(`plot2d.md`); `limits.ts` holds `MAX_HISTOGRAM_BINS` beside them.

## The SVG it builds

The base makes the skeleton, with the class `chart chart-histogram` and
no `chart-overlay`, since the histogram takes no pointer events
(`plot2d.md`, "The SVG and its frame"); the histogram draws, in
`chart-marks`:

- one `rect.chart-bar` per bin of a count above 0, keyed by the index of
  the bin, and a partly kept bin as two, split at the threshold, the left
  one of width 0 left out;
- each rect with `chart-bar-kept` or `chart-bar-removed`, and with
  neither when there is no threshold; a rect with neither is drawn as a
  kept one.

In `chart-annotations`, when there is a threshold, `line.chart-threshold`
from the bottom of the frame to its top, and in `chart-legend` the three
rows of its legend when it has one.

The legend is placed without measuring its text, as the margins are
(`plot2d.md`, "The SVG and its frame"): each row has its text anchored at its end, `text-anchor: end`,
and its mark to the right of the text, at the right edge of the frame, in
the top margin. So the top margin is larger when there is a legend.
The margins are named constants of `histogram.ts`, meanwhile these, in CSS
pixels, refined in the running application:

| margin | without a legend | with one |
|---|---|---|
| top | 12 | 56 |
| right | 16 | 16 |
| bottom | 44 | 44 |
| left | 60 | 60 |

The left margin is 60 pixels, or, when the longest number of the
vertical axis has more than four characters, 22 pixels, 7.2 a character
and 9: 22 for the label of the axis and the gap after it, the number
counted and not measured, and 9 for the tick and its gap. The owner
took it on 1 October 2026 (point 26 of the report of
`docs/plans/population-analyses.md`): with a draw of 96 the shares of
the spectrum have three decimals, "0.035", and at 60 pixels they ran
over the label of the axis by 1 to 2.4 pixels, in Chromium and WebKit;
they now stand 4.6 to 7 pixels from it. The longest number is the top
of the axis as it is written with the most ticks a frame of 640 pixels
has, 16, since the margin does not know the height. The histograms of
the Variants step keep 60 while the top of their axis of counts is
below 1,000, as on `panel.nei`, and get 67 from "1,000", five
characters with its comma.

The bottom margin is 16 pixels deeper, 60, when the base writes the
label of the horizontal axis on two lines, which it does when one line
would not fit (`plot2d.md`, "The axes"): "Copies of the rarer allele
among 40 chromosomes" under a histogram of the spectrum on a screen of
320 pixels. The left margin is 16 pixels deeper in the same way when
the label of the vertical axis is on two lines: "Share of the variants
with both alleles" along the same histogram.


### Colours and the two themes

The plot writes classes and no colour (`charts.md`):

```css
.chart-bar          { fill: var(--chart-bar); stroke: var(--chart-axis); stroke-width: 1px; }
.chart-bar-removed  { fill: none; }
.chart-threshold    { stroke: var(--chart-threshold); stroke-width: 2px; stroke-dasharray: 4 3; }
.chart-threshold-keeps-all { stroke: var(--chart-threshold-keeps-all); stroke-dasharray: 1 3; }
```

The colour of a threshold that keeps every value,
`--chart-threshold-keeps-all`, is a grey with some of the blue of the
bars, so that it reads as a threshold still to be moved, and not as the
grey of a disabled control, which it was until the owner asked so on 8
October 2026: #54758c in the light theme, 4.88:1 on the background, and
#6387a1 in the dark, 4.67:1, above the 3:1 of a line (1.4.11) and the
4.5:1 of the number in the box of popgen2.html, which takes the same
colour; it is 3.46:1 and 3.16:1 from the text, so that such a number is
told from a black one at a glance. `src/ui/tokens.test.ts` checks the
four ratios. The handle of such a threshold over the plot is hollow, an
outline of that colour over the background, where the red one is
filled.

The bars need a colour that the tokens do not have yet, `--chart-bar`,
since the seven colours of Okabe and Ito name populations and a bar is
none. Meanwhile #0072b2, the blue of Okabe and Ito, in the light theme,
5.19:1 on the background #ffffff, and #56b4e9, their sky blue, in the
dark theme, 7.71:1 on #16181b; each is above the 3:1 that the marks of a
plot need (WCAG 2.2, 1.4.11), so a filled bar is told from an outlined
one in both themes, and the outline in `--chart-axis` carries the edge of
both. The threshold line on a filled bar would be 1.26:1 in the light
theme, red on blue; it always has the background on its right, since a
bar the line crosses is split there and is outlined on its right.

A change of theme changes the tokens, and the plot on the screen follows
with no redraw; the exported file is in the light theme (`plot2d.md`,
"The themes").

## The numbers without the picture

The base writes the text alternative, and gives the rule of the table
(`plot2d.md`, "The text alternative and the table of the numbers"). What
the histogram adds:

- **The description**, which the screen writes as a summary,
  from `histogramRows`, in this form: what is counted and how many, the
  bins and their range, and, with a threshold, the bins it keeps, the
  bin it splits when there is one, and the bins it removes, each with
  the variants or the individuals in them, as the owner decided on 26
  September 2026 (point I of `docs/specs/stage-3-open-points.md`):
  "The major allele frequency of 1,200 variants, in 40 bins from 0 to 1.
  The threshold 0.95 keeps the 38 bins up to it, 1,175 variants, and
  removes the 2 bins above it, 25 variants." With a bin split, the
  observed heterozygosity at 0.51 of the table above: "… The threshold
  0.51 keeps the 20 bins up to it, 1,098 variants, splits the bin from 0.5
  to 0.525, 54 variants, and removes the 19 bins above it, 48 variants."
  A split bin is named with its edges, since the plot cannot say how
  many of its values the threshold keeps. The edges and the threshold
  are written to four decimals at most, with no zero at the end, as the
  table below rounds them; a part with no bin is left out, "keeps none
  of the bins" when the threshold is below the first edge. The analyses'
  specs give the words of what is counted.
- **A table of the bins, drawn by the screen from `histogramRows`**,
  one row per bin, in the order of the bins: the lower edge, the upper
  edge, the count, and, when there is a threshold, whether the filter
  keeps the bin, "Kept", "Partly kept" or "Removed", in words and not by
  a colour or a mark. The edges are shown with `tableNumber` of
  the base, to 12 significant digits, so that 0.07500000000000001 reads
  0.075; the rows hold them as popnei gave them. A line above the table
  says that each bin runs from above its lower edge up to its upper edge,
  included, and that the first includes its lower edge too. The table is
  reachable by the keyboard and by a screen reader; the bars are not
  focusable.
- **The threshold and what it keeps are in the table and in the
  description**, so that the state of each bin does not rest on the
  difference between a filled and an outlined bar alone.

The Variants step puts the plot and the table in two tabs of one block,
as `.claude/skills/coding/react.md` has the results of an analysis
(`docs/specs/steps/variants.md`, "The histograms beside the filters of
the variants").

## The export

The handle's `toSVG` and `toPNG` are the base's (`plot2d.md`, "The
export"), and the file holds the plot as it is on the screen, the
threshold line and the legend with it when there is a threshold. No
screen offers them in stage 3; the names of the five files they will be
saved under in stage 6 are the analyses', `panel.variant_maf.svg`
among them.

## The size

The plot never sets the size of its element (`charts.md`). The screen's
CSS gives the element its width, that of its container, and its height,
meanwhile `aspect-ratio: 16 / 10` and a `max-width` of 40rem, refined in
the running application.

How the plot follows the size of its element is the base's
(`plot2d.md`, "The size and its changes").

## The cases

- **The threshold changes as the user types.** The screen calls `update`
  with the new threshold, which redraws the line, the states of the bars
  and the legend, with no pass. A field that holds no number yet, "0." on
  the way to "0.05", keeps the threshold of the project, which the screen
  gives; the plot is never given one that is not finite.
- **Every count is 0**, the histograms of the variants of a file none of
  whose variants has a called genotype: the axes are drawn, the vertical
  one from 0 to 1, and no bar. The screen says why. The individuals never
  give it: when none has a value, `binValues` gives no bins, and the
  screen draws no histogram.
- **Values in no bin.** A variant with no value, or an individual with no
  heterozygosity, NaN, is in no bin, and the plot does not know of it: the
  screen says how many there are, as `charts.md` asks of every value that
  cannot be drawn.
- **A threshold outside the range** widens the horizontal axis to take
  it (above); every bar is then kept, or every bar removed.
- **Other bins after an `update`**, another number of bins: the join adds
  and removes bars by the index of the bin, in the same SVG.
- **`destroy`, a size of 0, and a title with markup in it** are the
  base's cases (`plot2d.md`, "The cases").

## How it runs

On the page, in the main thread. A histogram of 40 bins is 40 rects at
most, drawn in well under a frame; nothing grows with the dataset, since
the bins are counted before.

## How it is verified

At `histogramRows`, `createHistogram` and the handle, the highest
functions at which each thing can be seen. What the base does for every
plot, the skeleton, the ids, the size, `destroy` and the export, is
verified in `plot2d.md`, the export on this histogram.

**Without a DOM, in the project `charts` of Vitest** (`testing.md`):

- `histogramRows` on the bins of `panel.nei` written as literals, the
  edges of 40 bins over [0, 1] as popnei gives them, the decimals i / 40,
  and the counts `calcPerVarDistribs` gave in node on 7 October 2026 with
  popnei's release `js-v0.2.2`, `openVars` of `e2e/fixtures/panel.nei` and
  `calcPerVarDistribs(v, { minNumIndividuals: 0, stats: ["maf", "obs_het", "unbiased_exp_het"], histKwargs: { numBins: 40, range: [0, 1], closed: "right" } })`:
  - MAF, `0` for bins 0 to 18, then `3,66,75,62,71,63,71,72,83,70,70,62,85,62,63,69,55,48,25,22,3`;
  - observed heterozygosity,
    `0,4,9,18,21,24,30,37,47,61,53,69,62,84,90,105,108,102,108,66,54,27,14,5,2`,
    then `0` for bins 25 to 39;

  and the four thresholds of the table of "Which bins the threshold
  keeps", each giving the bins kept, partly kept and removed there, the
  sum of the counts of the kept bins equal to what popnei's filter kept,
  1,175 at 0.95 of the MAF and 1,198 at 0.6 and 1,098 at 0.5 of the
  heterozygosity, and at 0.51 the kept bins' 1,098 below popnei's 1,116
  and the kept and partly kept bins' 1,152 above it. A bin holds its upper
  edge: kept at a threshold equal to it, partly kept just below it; the
  first bin holds its lower edge, partly kept at a threshold on it, and
  kept, drawn filled, with `firstBinOnLowerEdge`. No threshold: every
  state `null`.
- Each defect of "The TypeScript interface" throws.
- The domains of the two scales: the widened horizontal one for a
  threshold of 1.2, and the vertical one of 0 to 1 when every count is 0;
  the vertical ticks whole numbers for counts of 0 to 3. From stage 5:
  the shares of p0 at n = 40 of `docs/specs/analyses/sfs.md`, "The
  numbers of popnei", as a `Float64Array` over the edges 0.5 to 20.5,
  with `yMax` 0.061, give a vertical domain of 0 to 0.065, made round
  from it by the scale's `nice`, where p0's largest share,
  0.05590275165567829, would give 0 to 0.06 (the largest share of the
  three populations, 0.05618145165329451, gives 0 to 0.06 as well, so
  it cannot tell the two apart). This example read 0 to 0.07 until 1
  October 2026, which d3's `nice` gives only when it is told to round
  to 5 ticks, and the histograms of stage 4 would change with that; ticks
  that are not whole on it; `xWholeNumbers` over the edges 0.5 to 2.5,
  two bins, the ticks 1 and 2 alone, where d3 would give fractions; a count of −0.1 or NaN, and a `yMax` below the largest count,
  throw.

**The SVG, under jsdom**, with the size of the element given by a stub
of `clientWidth` and `clientHeight` and a `ResizeObserver` the test
calls:

- the class `chart chart-histogram`, and no `chart-overlay`;
- on the MAF of `panel.nei` at 0.95: 18 `rect.chart-bar-kept` and 2
  `rect.chart-bar-removed`, and no rect for the 20 empty bins; at 0.5 of
  the heterozygosity, bin 20 drawn as one outlined rect, since its kept
  part has a width of 0; a threshold inside a bin, 0.51, splits it into
  two rects that meet at the x of the line;
- an `update` from the threshold 0.95 to `null` removes the line and the
  legend and leaves every bar filled, in the same `<svg>` element;
- an `update` to 20 bins of a count of 1 each gives 20 rects, in the same `<svg>` element;
- the top margin 56 with a legend and 12 without, after an `update`
  in each direction;
- the left margin 60 for shares up to 0.5, of at most four characters
  at any height, and 67 for shares of 0.044 and 0.02, whose axis ends
  at "0.045", five characters, 22 + 5 × 7.2 + 9, while the same shares
  under a `yMax` of 0.936 keep 60; 60 for counts up to 240 and 74.2
  for counts up to 12,000, "12,000".


**In Playwright, in Chromium, Firefox and WebKit**:

- at 320 pixels wide, the width of a phone of WCAG 2.2, 1.4.10, the
  three rows of the legend lie inside the SVG, their boxes measured with
  `getBBox`, with the longest words of the step, "Removed by this
  filter";
- at 320 pixels wide, with the committed font of the checks, the label
  under each histogram of the spectrum, on its two lines, lies inside
  its SVG, its box measured with `getBBox`, and so does the label
  along its vertical axis; the labels under the histograms of the
  Variants step are on one line there;
- the Variants step with its histograms, in both themes, in the screens
  of `e2e/screens.spec.ts`, looked at as `testing.md` says, and axe on
  each.

**The dependencies** are those of the base (`plot2d.md`). The histogram
imports no other module of D3: its numbers are formatted by `d3-scale`'s
`tickFormat`, and `d3-format`, `d3-array`, `d3-shape`, `d3-path`,
`d3-zoom`, `d3-delaunay` and `d3-scale-chromatic` are added by the first
plot that imports them.

## What this spec assumes of the analyses that call it

Of `docs/specs/analyses/variantChecks.md`:

- its result holds `binEdges`, popnei's `histBinEdges`, shared by the
  three statistics, and for each of them its `counts`, popnei's
  `histCounts` of its one population of every individual, with
  `minNumIndividuals` 0 and the bins 40 over [0, 1], popnei's defaults
  given explicitly; the three are the MAF, the observed heterozygosity
  and the unbiased expected heterozygosity, which popnei names `"maf"`,
  `"obs_het"` and `"unbiased_exp_het"` in its option `stats`, and it
  refuses `"obsHet"`, seen in node on 26 September 2026;
- the screen gives the MAF histogram the threshold of the MAF filter, and
  the observed heterozygosity the threshold of the filter by observed
  heterozygosity, each when its filter is on, and the expected
  heterozygosity none;
- it says how many variants are in no bin, the variants of the pass less
  the sum of the counts.

Of `docs/specs/analyses/individualChecks.md`:

- `src/core/histogram.ts`, which that spec specifies, `binValues`, gives
  the two statistics of each individual as a `Float64Array` of edges and
  a `Uint32Array` of counts, 20 bins over the range of the values, over
  the edges `numpy.histogram` makes, the start plus i times the width,
  each bin holding its upper edge as popnei's bins of the variants do, so
  that the rule of the threshold treats both kinds alike, and the number
  of NaN values apart;
- the screen gives each histogram the threshold of its filter of
  individuals when it is on, and says how many individuals have no
  heterozygosity and that the filter by heterozygosity removes them
  (`docs/architecture.md`, section 13, point 4).

Of both: the screens write the title, the labels, the description, the
legend's three texts and the table with its CSV, from `histogramRows`,
and own the names of the files of the export, which no button offers
until stage 6.

## What this spec asks of other documents

Stage 5, 30 September 2026: `xWholeNumbers` of the base, in
`plot2d.md`, made there the same day.

Written into those documents with the specs of stage 3, on 26 September
2026, but `src/ui/tokens.css`, which is code and comes with the plan.

- `.claude/skills/coding/charts.md`, "The contract of a plot": the
  histograms of the statistics of each individual are binned in core, as
  `docs/architecture.md`, section 7, decided on 26 September 2026; only
  the bins of the variants, and the thinning and the clustering, are
  Rust's.
- `.claude/skills/coding/css.md` and `src/ui/tokens.css`: the token
  `--chart-bar`, #0072b2 in the light theme and #56b4e9 in the dark one,
  and its pair with the background in the test of the tokens.
- `.claude/skills/coding/charts.md`, "The SVG, its parts and their names":
  a plot with no pointer events has no `chart-overlay`.
- `.claude/skills/coding/charts.md`, "PNG": `toPNG` rejects with a
  `PngError` of kind `tooLarge` or `notMade`, now in `plot2d.md`;
  written there on 26 September 2026.

## Open points

The two open points of this spec, points C and I of
`docs/specs/stage-3-open-points.md`, were decided by the owner on 26
September 2026, and are written above as decided:

1. **Whether the histograms of stage 3 offer their download as SVG and
   PNG.** No: the plots are offered as SVG and PNG in stage 6, as
   `docs/build-order.md` has it, and the export is built and tested in
   stage 3 on this histogram, with the base of the 2D plots that the
   owner asked stage 3 to make (`plot2d.md`). The option not taken was
   two buttons on each of the five histograms from stage 3, with their
   two messages and their line of the versions.
2. **What the description counts.** The variants or the individuals in
   the bins kept, split and removed, as "The numbers without the
   picture" has it, which says what the plot shows a sighted user. The
   option not taken named the bins alone, "keeps bins up to 0.95 and
   removes 2 bins above it", shorter, and with nothing a user of a
   screen reader can compare with the counts beside the filter.

## Not in this spec

- A tooltip on a bar, and the highlight of the row of the table under the
  pointer: the table gives every number, and a hover can be added with
  `events` when a user asks for it.
- A threshold set by dragging its line, which the architecture excludes
  (`docs/architecture.md`, section 11): the thresholds are typed.
- A log axis of the counts.
- The histograms of several populations side by side, which the
  spectrum of stage 5 draws: each is a plot of its own, and the block of
  the diversity's panel lays them out (`docs/specs/analyses/sfs.md`).
- The histogram of the proportion of missing genotypes of each variant,
  which comes with popnei's release that has it.
- The binning of the statistics of each individual, `src/core/histogram.ts`:
  `docs/specs/analyses/individualChecks.md`.
