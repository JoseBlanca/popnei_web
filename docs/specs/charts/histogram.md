# The histogram

Written on 26 September 2026, for stage 3 of `docs/build-order.md`, the
Variants step whole; approved by the owner on 26 September 2026. There is no code in
`src/charts` yet. This spec gives the first plot of the applications: the
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

A value falls in the bin whose left edge is at most it and whose right
edge is above it, and the last bin takes its right edge too, as
`numpy.histogram` does (`calcPerVarDistribs`, its doc comment). So a bin
holds the values from its lower edge, included, up to its upper edge, not
included, except the last, which includes it.

### Which bins the threshold keeps

For a threshold t and a bin from l to r:

- **removed** when l > t: every value of the bin is at least l, above t;
- **kept** when no number lies above t and below r, for a bin that is not
  the last, since every value of it is below r; for the last bin, which
  takes r too, when r ≤ t;
- **partly kept** otherwise: the bin may hold values at most t and values
  above it.

"No number above t and below r" is `r <= nextUp(t)`, where `nextUp(t)` is
the smallest double above t, and not `r <= t`, because the edges popnei
gives are the start of the range plus i times the width of a bin, which
in floating point puts some of them one step above the round number.
Seen in node on 26 September 2026 with popnei's release
`js-v0.1.0-dev.2`: of the 41 edges of the default 40 bins over [0, 1],
the fourth is 0.07500000000000001, the 25th 0.6000000000000001 and the
39th 0.9500000000000001, each `nextUp` of the number a user types, while
the fifth and the 21st are 0.1 and 0.5 exactly. With `r <= t`, a
threshold of 0.95 would mark the bin below 0.95 as partly kept, although
no value can lie between 0.95 and its upper edge. The edges are compared
as popnei gives them, and the threshold as the project holds it, which is
the number the user typed (`docs/functionality.md`, section 3).

What that gives on `e2e/fixtures/panel.nei`, 1,200 variants of 200
individuals, with `calcPerVarDistribs` of every variant and individual,
`minNumIndividuals` 0 and the default bins, and popnei's filters alone on
the same file, in node on 26 September 2026, the bins numbered from 0 at the left:

| statistic, threshold | bins kept | partly kept | removed | what popnei's filter keeps |
|---|---|---|---|---|
| MAF, 0.95 | 0 to 37, 1,175 variants | none | 38 and 39, 25 variants | 1,175 |
| observed heterozygosity, 0.6 | 0 to 23, 1,198 variants | none | 24 to 39, 2 variants | 1,198 |
| observed heterozygosity, 0.5 | 0 to 19, 1,090 variants | 20, from 0.5, 62 variants | 21 to 39, 48 variants | 1,098 |

At 0.5 the line falls on the lower edge of bin 20, and 8 of its 62
variants have a heterozygosity of 0.5 exactly, which the filter keeps: the
bin is partly kept, it is drawn outlined, since the line is at its left
edge, and the table beside the plot says it is partly kept (below, "The
numbers without the picture"). The legend has no row for a bar partly
kept, and the outlined bar reads as removed, so that the plot would say
1,090 variants kept where the filter keeps 1,098: the screen names the
bin a threshold splits in a line under the plot, as the owner is to
judge at stop A of `docs/plans/variants-step.md`; a fourth row of the
legend, the other way, would take room from the plot at 320 pixels
wide and change where the legend is placed.

### The axes

- **The horizontal axis** runs from the first edge to the last, 0 to 1
  for the three histograms of the variants and the range of the values
  for the two of the individuals, widened to take the threshold when it
  lies outside them, so that its line is always drawn.
    Its ticks are those the base draws, with the format of `d3-scale`'s
  linear scale (`plot2d.md`, "The axes").
- **The vertical axis** runs from 0 to the largest count, made round by
  the scale's `nice`, and from 0 to 1 when every count is 0. Its ticks
  are whole numbers only, written with a comma between thousands,
  "12,000", the base's `yWholeNumbers`. It is linear: a log
  axis cannot show a bin of 0, and the table gives every count.
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
  /** The count of each bin, from the left. */
  readonly counts: Uint32Array;
  /** The threshold of the filter beside the plot, or null for none. */
  readonly threshold: HistogramThreshold | null;
}

/**
 * A threshold that keeps what is at most `value`. The three labels are
 * the rows of the legend: "Maximum 0.95", "Kept by this filter",
 * "Removed by this filter".
 */
export interface HistogramThreshold {
  readonly value: number;
  readonly label: string;
  readonly keptLabel: string;
  readonly removedLabel: string;
}

export const createHistogram: Chart<HistogramData> = (element, data) =>
  createPlot2d(element, data, histogramDefinition);
```

No events: the histogram has no hover and no selection in this stage
(below, "Not in this spec").

What each bin holds and what the threshold does to it, as numbers. The
screen draws the table beside the plot from these rows, and writes its
CSV and its description from them, so that the table and the plot never
disagree on a bin.

```ts
export type BinState = "kept" | "partlyKept" | "removed";

export interface HistogramRow {
  readonly from: number;           // the lower edge, as given
  readonly to: number;             // the upper edge, as given
  readonly toIncluded: boolean;    // true for the last bin alone
  readonly count: number;
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
from the bottom of the frame to its top, and in `chart-legend` its three
rows.

The legend is placed without measuring its text, as the margins are
(`plot2d.md`, "The SVG and its frame"): each row has its text anchored at its end, `text-anchor: end`,
and its mark to the right of the text, at the right edge of the frame, in
the top margin. So the top margin is larger when there is a threshold.
The margins are named constants of `histogram.ts`, meanwhile these, in CSS
pixels, refined in the running application:

| margin | without a threshold | with one |
|---|---|---|
| top | 12 | 56 |
| right | 16 | 16 |
| bottom | 44 | 44 |
| left | 60 | 60 |



### Colours and the two themes

The plot writes classes and no colour (`charts.md`):

```css
.chart-bar          { fill: var(--chart-bar); stroke: var(--chart-axis); stroke-width: 1px; }
.chart-bar-removed  { fill: none; }
.chart-threshold    { stroke: var(--chart-threshold); stroke-width: 2px; stroke-dasharray: 4 3; }
```

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
  observed heterozygosity at 0.5 of the table above: "… The threshold
  0.5 keeps the 20 bins up to it, 1,090 variants, splits the bin from 0.5
  to 0.525, 62 variants, and removes the 19 bins above it, 48 variants."
  A split bin is named with its edges, since the plot cannot say how
  many of its values the threshold keeps. The edges and the threshold
  are written to four decimals at most, with no zero at the end, as the
  table below rounds them; a part with no bin is left out, "keeps none
  of the bins" when the threshold is below the first edge. The analyses'
  specs give the words of what is counted.
- **A table beside the plot, drawn by the screen from `histogramRows`**,
  one row per bin, in the order of the bins: the lower edge, the upper
  edge, the count, and, when there is a threshold, whether the filter
  keeps the bin, "Kept", "Partly kept" or "Removed", in words and not by
  a colour or a mark. The edges are shown with `tableNumber` of
  the base, to 12 significant digits, so that 0.07500000000000001 reads
  0.075; the rows hold them as popnei gave them. A line above the table
  says that each bin runs from its lower edge up to its upper edge, not
  included, and that the last includes its upper edge. The table is
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
  edges of 40 bins over [0, 1] as popnei gives them, 0.07500000000000001
  and 0.9500000000000001 among them, and the counts `calcPerVarDistribs`
  gave in node on 26 September 2026 with popnei's release
  `js-v0.1.0-dev.2`, `openVars` of `e2e/fixtures/panel.nei` and
  `calcPerVarDistribs(v, { minNumIndividuals: 0, stats: ["maf", "obs_het", "unbiased_exp_het"] })`:
  - MAF, `0` for bins 0 to 19, then `69,75,62,71,60,74,72,83,70,68,64,83,64,63,67,57,48,25,22,3`;
  - observed heterozygosity,
    `0,4,9,18,20,25,30,34,50,61,53,69,62,84,89,101,113,102,108,58,62,27,14,5,2`,
    then `0` for bins 25 to 39;

  and the three thresholds of the table of "Which bins the threshold
  keeps", each giving the bins kept, partly kept and removed there, the
  sum of the counts of the kept bins equal to what popnei's filter kept,
  1,175 at 0.95 of the MAF and 1,198 at 0.6 of the heterozygosity, and at
  0.5 the kept bins' 1,090 below popnei's 1,098 and the kept and partly
  kept bins' 1,152 above it. The last bin: kept at a threshold equal to
  its upper edge, partly kept just below it. No threshold: every state
  `null`.
- Each defect of "The TypeScript interface" throws.
- The domains of the two scales: the widened horizontal one for a
  threshold of 1.2, and the vertical one of 0 to 1 when every count is 0;
  the vertical ticks whole numbers for counts of 0 to 3.

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
- the top margin 56 with a threshold and 12 without, after an `update`
  in each direction.


**In Playwright, in Chromium, Firefox and WebKit**:

- at 320 pixels wide, the width of a phone of WCAG 2.2, 1.4.10, the
  three rows of the legend lie inside the SVG, their boxes measured with
  `getBBox`, with the longest words of the step, "Removed by this
  filter";
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
  a `Uint32Array` of counts, 20 bins over the range of the values, as
  `numpy.histogram` makes them, with the edges made as popnei makes its
  own, the start plus i times the width, so that the rule of the
  threshold treats both kinds alike, and the number of NaN values apart;
- the screen gives each histogram the threshold of its filter of
  individuals when it is on, and says how many individuals have no
  heterozygosity and that the filter by heterozygosity removes them
  (`docs/architecture.md`, section 13, point 4).

Of both: the screens write the title, the labels, the description, the
legend's three texts and the table with its CSV, from `histogramRows`,
and own the names of the files of the export, which no button offers
until stage 6.

## What this spec asks of other documents

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
- A log axis of the counts, and the histograms of several populations
  side by side, which stage 5 may need.
- The histogram of the proportion of missing genotypes of each variant,
  which comes with popnei's release that has it.
- The binning of the statistics of each individual, `src/core/histogram.ts`:
  `docs/specs/analyses/individualChecks.md`.
