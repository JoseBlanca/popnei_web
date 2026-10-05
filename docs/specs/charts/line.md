# The line plot

Written on 30 September 2026, for stage 5 of `docs/build-order.md`,
with the LD decay, `docs/specs/analyses/ldDecay.md`, its first user,
and revised on 1 October 2026 with what the owner decided after trying
the panel of the LD decay: the legend outside the frame, the room of
the last number of the horizontal axis, the edge of the dashed line of
a mark, and which group the LD decay gives a population
(`docs/specs/stage-5-open-points.md`, "Decided by the owner on 1
October 2026: the LD decay and the line plot", C2 and points 5, 14 and
22).
Its code is `src/charts/line.ts`. This spec gives `src/charts/line.ts`, the
plot of a few series of numbers against a numeric horizontal axis, each
series drawn as its points, a line and marks at chosen places along it.
The LD decay draws one series per population: the mean r² of each bin of
distance as the points, the curve popnei fitted as the line, and a mark
at the distance where the curve falls to half. The name is the one
section 9 of `docs/architecture.md` gives the file, `line.ts`, and what
it draws is not particular to LD: the plot knows nothing of distances or
of r². It is built on the base of the 2D plots, `docs/specs/charts/plot2d.md`,
which gives it its SVG and frame, its size, its axes, its text for a
screen reader, its handle and its export, and it takes the marks of the
groups of the scatter of the PCA, `docs/specs/charts/scatter.md`, "The
marks of the groups", so that a population has one mark in every plot.
It develops the row `src/charts/` of section 9 and section 7 of the
architecture, and depends on `.claude/skills/coding/charts.md` and
`css.md`.

A **series** is one set of numbers to draw together, a population for
the LD decay. Its **points** are drawn one mark each; its **line** is a
path through its own list of positions, in their order; its **marks**
are places along the horizontal axis, each drawn as a dashed vertical
line from the axis up to a height and a mark of the series at its top.

## What it does

### What the user sees

A frame with a horizontal axis over the range the data give and a
vertical one over theirs, both from the data and never from the points,
so that two plots of the same range read alike. For each series, in the
colour and the shape of its group, the rule of `scatter.md`: a series of
group `i` has the colour `i % 7` of Okabe and Ito and the shape
`(i + Math.floor(i / 7)) % 7` of the seven filled symbols of `d3-shape`.

- **Its points**, one mark of 64 square pixels each, `SYMBOL_AREA` of
  `src/charts/marks.ts`, drawn by `drawSymbolAt` into one path per
  series, as the scatter draws its groups; a mark of the three light
  colours has the outline of `--chart-axis`, and the other four none.
- **Its line**, a path 2 pixels wide in the colour of the series, drawn
  under the points. A line of one of the three light colours, orange,
  sky blue and yellow, below 3:1 on the light background, is drawn over
  a casing, the same path 4 pixels wide in `--chart-axis`, which gives
  it the edge the colour does not; the other four have none, as their
  marks have no outline (`scatter.md`, "The marks of the groups").
- **Its marks**, each a dashed vertical line 1 pixel wide in the colour
  of the series from the horizontal axis up to its height, and the mark
  of the series at the top, drawn over the points at 1.5 times their
  area, so that the eye finds it among them. The dashed line of one of
  the three light colours is drawn over a casing as the line of the
  series is: the same dashes, 3 pixels wide, in `--chart-axis`. On the
  light theme the dashed lines of orange, sky blue and yellow were
  2.25, 2.31 and 1.32 to 1 on white, and both guides of `ld.nei`,
  orange and sky blue, were faint (point 22).
- **A legend** outside the frame, so that no row of it lies over a
  point: for each series a short piece of its line with its mark on it,
  and then its label, which the screen gives, "pop_a · half at 7,548
  bp". The series differ by shape as well as by colour, and the legend
  shows both (WCAG 2.2, success criterion 1.4.1). It stands in a margin
  at the right of the frame, its rows from the top of the frame down,
  while that leaves the frame 300 pixels wide or more; in a narrower
  element it stands above the plot, in the top margin, where the
  histogram has its legend, its rows from the top left corner of the
  SVG, since a margin at the right would leave little or no plot: on a
  screen of 320 pixels the legend of `ld.nei`, 226 pixels wide, would
  leave a frame of 34. The owner decided the legend outside the frame
  on 1 October 2026 (C2); inside it, at the top right, the last rows of
  16 populations lay over the points, and a long label would have
  covered most of the plot. The legend above a narrow plot is the
  choice of the task that built it, within that decision; under the
  plot it would stand between the numbers of the horizontal axis and
  the label of that axis, which the base writes at the foot of the
  bottom margin.

The lines are drawn first, then the points, then the marks, series by
series in their order within each, so that no line covers a point.

The legend is in the SVG, and so in the exported file with no
`drawExport`, as the histogram's is (`docs/specs/charts/histogram.md`),
and not HTML of the screen, as the scatter's is: the scatter's legend is
made of buttons that highlight a population, which must be outside the
SVG to be reached by the keyboard, and this legend has no control.

**The room of the legend** is counted and not measured, as the margins
of every plot are (`plot2d.md`): a label is taken to be 7.5 pixels wide
for each of its characters, at the 12 pixels of the text of a legend,
which held the labels of two populations named in 16 capitals,
"MESOAMERICA_WILD", in the system font of macOS and in DejaVu Sans, the
font of the Linux of the checks; a row is its piece of line, 24 pixels,
6 more, and its label. At the right, the legend starts 12 pixels from
the frame, and the right margin is those 12, the longest row and 4
more, and never less than 28 pixels: with the 16 the plot had, the last
number of the axis of the LD decay, "100,000", was cut by 3.5 to 7.5
pixels at the right edge of the SVG in Chromium and WebKit (point 5).
Above the plot, the right margin is 28 pixels, the top margin grows by
8 pixels and 18 for each row, and the longest row needs an element as
wide as it and 8 pixels on each side. The screen gives the element the
height the legend above the plot needs, and a width that holds its
longest row, from `lineLegendRoom`, below; what an element too small
does is in "The cases".

`charts.md`, "Accessibility", has the lines of the LD decay labelled at
their ends; the legend takes that place, since the curves of the LD
decay of `ld.nei` end 0.0008 apart in r², at 0.0500 and 0.0492 at
100,000 bp, half a pixel on a frame 300 pixels high whose axis runs
from 0 to 0.5, and their labels would lie on each other (`docs/specs/analyses/ldDecay.md`, the
fitted curve).

### The ranges

The data give the range of each axis, `xDomain` and `yDomain`, and the
plot draws within it; the screen chooses them, since it knows what the
axes mean: for the LD decay, 0 to the largest distance, and 0 to the
largest value drawn rounded up to a tenth. The scales are linear and
not made round by `nice`, so that the axis ends where the data say, at
100,000 and not beyond. The ticks are the base's, about one every 80
pixels across and every 40 up, with a comma between thousands when the
data ask for whole numbers on that axis, `xWholeNumbers`, as the
distances in base pairs are.

A point, a position of a line or a mark outside the ranges is not drawn,
and the marks are clipped to the frame by the base's clip, so that a
curve that runs above the top does not cross the axes. A mark outside
the horizontal range is left out whole, not drawn at the edge; the
screen says where it is, as the LD decay does in the legend, "half at
1,599,810 bp, beyond the plot".

A value that is not finite, NaN or an infinity, is not drawn
(`charts.md`, "The contract of a plot"): a point is skipped, and a line
is broken at it and goes on after it, with `defined` of `d3-shape`'s
`line`. The screen says what the missing values are: for the LD decay,
the bins with no pair, which its table of the bins shows as "no pair".

### The numbers without the picture

The base writes the title and the description the screen gives. The
plot gives no rows: the table beside it is the analysis's, as the
scatter's is (`plot2d.md`, "The text alternative and the table of the
numbers"), since the numbers a user reads are the analysis's, the bins
and the half distances, and not the positions of the curve, which the
screen computed to draw it. The points and the marks are not stops of
the Tab key.

### No pointer

The plot takes no pointer in this stage, so the base makes no overlay:
every number it draws is in the tables of the analysis, and a tooltip on
a point would give the mean r² of a bin that the table gives with its
distances and its pairs. A tooltip is added with the first screen that
needs it.

## The TypeScript interface

```ts
// src/charts/line.ts
/** With the texts of PlotText: xLabel "Distance between the two variants (bp)",
    yLabel "Mean r² of the pairs". */
export interface LineData extends PlotText {
  readonly series: readonly LineSeries[];        // at most MAX_LINE_SERIES
  readonly xDomain: readonly [number, number];   // finite, the first below the second
  readonly yDomain: readonly [number, number];
  readonly xWholeNumbers: boolean;               // ticks at whole numbers, with commas
  readonly yWholeNumbers: boolean;
}

export interface LineSeries {
  /** The label of the legend, written as text. */
  readonly label: string;
  /** Its group for the colour and the shape, by the rule of the scatter. */
  readonly group: number;
  /** Drawn one mark each; NaN skipped. */
  readonly points: XY;
  /** Drawn through in order, broken at a NaN; null for no line. */
  readonly line: XY | null;
  /** Each a dashed vertical line from the axis up to y, and the mark at its top. */
  readonly marks: readonly { readonly x: number; readonly y: number }[];
}

/** Two arrays of one length. */
export interface XY {
  readonly x: Float64Array;
  readonly y: Float64Array;
}

/** What the legend of `data` asks of the element, in CSS pixels, for
    the screen that sizes it. */
export interface LineLegendRoom {
  /** The legend stands above the plot in an element narrower than this. */
  readonly narrowUnder: number;
  /** What the legend above the plot adds to the height of the element. */
  readonly narrowHeight: number;
  /** The least width of an element that holds the longest row of the
      legend above the plot. */
  readonly narrowWidth: number;
}
export function lineLegendRoom(data: LineData): LineLegendRoom;

export const createLine: Chart<LineData> = (element, data) =>
  createPlot2d(element, data, lineDefinition);
```

The colour and the shape of a series are those of its `group`, which
the screen gives, and not of its place in `series`: with up to 49
populations in the metadata file, the LD decay gives the index of the
population among every population of the file, as the PCA does
(`scatter.md`, "The marks of the groups"), so a population keeps its
mark when the filters empty a population before it, and has the same
mark in both analyses. With more than 49, where two of those indices
would give one mark, which this plot refuses, it gives the index among
the populations it draws, 16 at most (point 14;
`docs/specs/analyses/ldDecay.md`, "What it shows"). The legend lists
the series in their order in `series`.

`createLine`, `update` and the `check` of the definition throw an
`Error`, a defect of the caller (`charts.md`): for a domain whose ends
are not finite or not in order; for `points` or a `line` whose two
arrays differ in length; for a `group` that is not a whole number from
0; for two series of one group, which would draw two populations alike;
for more than `MAX_LINE_SERIES` series, 49, the number of different
marks the rule of the groups gives; and for more than `MAX_SVG_POINTS`,
50,000, points and positions of lines together (`scatter.md`, "The
points"). The LD decay gives at most 16 × (50 + 200), 4,000. Both
constants are in `src/charts/limits.ts`.

## The SVG it builds

The base makes the skeleton with the class `chart chart-line`. In
`chart-marks`, for each series `i`, in this order across the series:

- `path.chart-line-casing` for a light colour, and `path.chart-line
  chart-line-colour-‹group % 7›`, with the numbers of the path rounded to one
  decimal, `pathRound(1)`, as the scatter's;
- `path.chart-points chart-colour-‹group % 7›`, the points of the series, as
  the scatter's groups.

In `chart-annotations`, for each mark of a light colour
`line.chart-mark-casing`, and for each mark `line.chart-mark-line
chart-line-colour-‹group % 7›` and `path.chart-points chart-mark
chart-colour-‹group % 7›`, every casing under every dashed line and
every dashed line under every mark. In `chart-legend`, one
`g.chart-legend-row` per series, one row every 18 pixels: its piece of
line, 24 pixels, on a casing for a light colour, its mark at the middle
of the piece, and its text, anchored at its start, 6 pixels after the
piece. At the right of the frame the rows start 12 pixels from it, the
first 8 pixels below its top; above the plot they start 8 pixels from
the left edge of the SVG, the first 8 pixels below its top, and the
frame starts 12 pixels under the last. `chart-legend` has `data-place`,
"right" or "above". The legend is placed without measuring its text, as
the histogram's is.

The classes the plot adds to `charts.css`, colours from the tokens:

```css
.chart-line          { fill: none; stroke-width: 2px; stroke-linejoin: round; }
.chart-line-casing   { fill: none; stroke: var(--chart-axis); stroke-width: 4px; stroke-linejoin: round; }
.chart-line-colour-0 { stroke: var(--chart-cat-1); }   /* to .chart-line-colour-6, --chart-cat-7 */
.chart-mark-line     { stroke-width: 1px; stroke-dasharray: 4 3; }
.chart-mark-casing   { stroke: var(--chart-axis); stroke-width: 3px; stroke-dasharray: 4 3; }
.chart.chart-line .chart-legend-text { text-anchor: start; }
```

The margins are 12 at the top, 44 at the bottom and 60 at the left, in
CSS pixels, as the histogram's without a threshold, named constants of
`line.ts`; the right margin, and the top one with the legend above the
plot, are those of "The room of the legend", above, and so depend
on the data and on the width of the element, which the base gives the
definition's `margin` with the data from 1 October 2026 (`plot2d.md`,
`Plot2dDefinition`).

## The cases

- **A series with no point and no line**, a population with no pair and
  no curve: it has its row in the legend, with the words the screen
  gives it, "pop_c · no pair", and nothing in the frame.
- **Every series empty**: the axes and the legend, and an empty frame.
- **A mark with a NaN** is not drawn, as a point is not.
- **More series than the legend has room for** at the right of the
  frame: the rows run below the bottom of the SVG and are cut by it,
  and a series would be drawn with no name. So the screen gives no more
  series than its element holds rows, one every 18 pixels from 20
  pixels below its top: an element 360 pixels high, the least the panel
  of the LD decay gives its plot, holds 18, and the LD decay draws 16
  at most, saying in a line under the plot which populations it left
  out, words that are the screen's and not this plot's
  (`docs/specs/analyses/ldDecay.md`, "Its words", with their check in
  its "How it is verified"). How the legend holds more is left for the
  running application, checked with 3 and with 16.
- **An element too low for the legend above the plot**, one the screen
  did not make `narrowHeight` higher: the margins leave the frame no
  height, and the base draws nothing, as for any element not larger
  than its margins (`plot2d.md`). The panel of the LD decay makes its
  element higher by `narrowHeight` exactly when it is narrower than
  `narrowUnder`, and never narrower than `narrowWidth`, below which it
  scrolls sideways in its frame as it does under 320 pixels.
- **A label longer than its room**, wider than 7.5 pixels a character:
  cut by the right edge of the SVG. The LD decay cuts the names of its
  labels at 16 characters (`ldDecay.md`, "What it shows").
- **A label with markup**, `<b>p1</b>`: written as text.
- **A change of theme**: nothing is drawn again; the file is in the
  light theme.

## How it runs

On the page, in the main thread, drawn again at each change of size or
of data, by the base. What it draws grows with the points and positions,
4,000 at most for the LD decay, well under the 50,000 the walking
skeleton drew in 16 to 19 ms (`scatter.md`, "The points").

## How it is verified

At `createLine` and the handle, as the histogram and the scatter are.

**Under jsdom**, in the project `charts` of Vitest, with the size of the
element stubbed at 600 by 375:

- the skeleton with `chart chart-line` and no `chart-overlay`;
- two series of groups 0 and 1, of three points, a line of four
  positions and one mark each: two `path.chart-line` and two
  `path.chart-line-casing`, since orange and sky blue are both light
  colours, and none more when a third series of group 2, green, is
  added; two `path.chart-points` with the classes `chart-colour-0` and
  `chart-colour-1`; a series of group 9 has `chart-colour-2` and the
  shape of index 3; two `line.chart-mark-line`, from the bottom of the
  frame to the y of the mark, each over a `line.chart-mark-casing` of
  the same ends, and none for the mark of a third series of group 2;
  two legend rows with the labels as text;
- the legend at 600 by 375 with labels of 24 characters: `data-place`
  "right", a right margin of 226 pixels, 12, 24, 6, 180 and 4, and the
  rows from 12 pixels right of the frame; at 320 by 404 the same data
  give `data-place` "above", a right margin of 28, a top margin of 56
  and the rows from 8 pixels right of the left edge and 8 below the
  top; `lineLegendRoom` of those data gives `narrowUnder` 586, the left
  margin of 60, a frame of 300 and the 226, `narrowHeight` 44 and
  `narrowWidth` 226; a series more makes the right margin no larger
  and `narrowHeight` 18 larger; with no series, a right margin of 28;
- the order in `chart-marks`: every line before every set of points;
- a NaN in `points.y` leaves that point out of the path; a NaN in
  `line.y` breaks the path into two parts, two `M` commands;
- a mark at an x beyond `xDomain` draws no line and no mark;
- `check` throws for a domain `[1, 1]` or `[0, NaN]`, for arrays of
  different lengths, for 50 series, and for 50,001 points and positions;
- the ticks of a horizontal axis from 0 to 100,000 with
  `xWholeNumbers` read "0", "20,000", …, "100,000" at 600 pixels.

**In Playwright**, on the page of the plots of the tests, `e2e/plots.html`
(`plot2d.md`, "How it is verified"), which draws the plot of the LD
decay of `ld.nei` with its numbers as literals from
`docs/specs/analyses/ldDecay.md`, "How it is verified": the SVG of
`toSVG` in the light theme when the page is dark, the line of
`chart-line-colour-0` with the stroke `rgb(230, 159, 0)` and a casing,
the casings of the two dashed lines, and the legend in the file;
`toPNG(2)` of the plot; that no text of the legend or of the axes
passes the right edge of the SVG at 700 pixels, with the legend at the
right, and at 320, with the legend above the plot, in the committed
font, for the labels of `ld.nei` and for two of 16 capitals, and that
no row of the legend lies over the frame. A test of the tokens
checks the four colours without a casing at 3:1 or more on the
background of each theme, as the scatter's test does for the marks.

## What this spec asks of other documents

Made in those documents on 30 September 2026, but `limits.ts`, which is
code and comes with the plan. `xWholeNumbers` is one option of the base
for the horizontal axis, which the histograms of the spectrum ask for
too (`docs/specs/analyses/sfs.md`).

- `docs/specs/charts/plot2d.md`, `AxesOptions`: `xWholeNumbers`, ticks
  at whole numbers with a comma between thousands on the horizontal
  axis, beside its `yWholeNumbers`.
- `docs/specs/charts/plot2d.md`, `Plot2dDefinition`: nothing more. The
  size of the element that `margin` is given from 1 October 2026, added
  there for the heatmap, is what the legend of this plot reads to stand
  at the right of a wide element and above the plot in a narrow one.
- `.claude/skills/coding/charts.md`, "Accessibility": that the lines of
  the LD decay are told apart by the legend and the marks of their
  points, not by labels at their ends, for the reason of "What the user
  sees".
- `docs/architecture.md`, section 9: `line.ts` as the plot of series of
  points, lines and marks, the LD decay's.
- `src/charts/limits.ts` gets `MAX_LINE_SERIES`, with the plan.

## Not in this spec

- What the LD decay gives the plot, its ranges, labels and words:
  `docs/specs/analyses/ldDecay.md`.
- A tooltip, a zoom, a log scale of the distance: with the first screen
  that needs them.
- The buttons of the export: stage 6.
