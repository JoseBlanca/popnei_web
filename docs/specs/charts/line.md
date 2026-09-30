# The line plot

Written on 30 September 2026, for stage 5 of `docs/build-order.md`,
with the LD decay, `docs/specs/analyses/ldDecay.md`, its first user.
There is no code of it yet. This spec gives `src/charts/line.ts`, the
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
  area, so that the eye finds it among them.
- **A legend** in the top right corner of the frame: for each series
  its mark, a short piece of its line, and its label, which the screen
  gives, "pop_a · half at 7,548 bp". The series differ by shape as well
  as by colour, and the legend shows both (WCAG 2.2, success criterion
  1.4.1).

The lines are drawn first, then the points, then the marks, series by
series in their order within each, so that no line covers a point.

The legend is in the SVG, and so in the exported file with no
`drawExport`, as the histogram's is (`docs/specs/charts/histogram.md`),
and not HTML of the screen, as the scatter's is: the scatter's legend is
made of buttons that highlight a population, which must be outside the
SVG to be reached by the keyboard, and this legend has no control.
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

export const createLine: Chart<LineData> = (element, data) =>
  createPlot2d(element, data, lineDefinition);
```

The colour and the shape of a series are those of its `group`, which
the screen gives, and not of its place in `series`: the LD decay gives
the index of the population among every population of the metadata
file, as the PCA does (`scatter.md`, "The marks of the groups"), so a
population keeps its mark when the filters empty a population before it,
and has the same mark in both analyses. The legend lists the series in
their order in `series`.

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

In `chart-annotations`, for each mark, `line.chart-mark-line
chart-line-colour-‹group % 7›` and `path.chart-points chart-mark
chart-colour-‹group % 7›`. In `chart-legend`, one `g.chart-legend-row` per
series, its text anchored at its end at the right edge of the frame and
its mark and piece of line to the right of the text, one row every 18
pixels from 8 pixels below the top of the frame; the legend is placed
without measuring its text, as the histogram's is.

The classes the plot adds to `charts.css`, colours from the tokens:

```css
.chart-line          { fill: none; stroke-width: 2px; stroke-linejoin: round; }
.chart-line-casing   { fill: none; stroke: var(--chart-axis); stroke-width: 4px; stroke-linejoin: round; }
.chart-line-colour-0 { stroke: var(--chart-cat-1); }   /* to .chart-line-colour-6, --chart-cat-7 */
.chart-mark-line     { stroke-width: 1px; stroke-dasharray: 4 3; }
```

The margins are named constants of `line.ts`, meanwhile 12 at the top,
16 at the right, 44 at the bottom and 60 at the left, in CSS pixels, as
the histogram's without a threshold, refined in the running
application; the legend is inside the frame and asks for no margin.

## The cases

- **A series with no point and no line**, a population with no pair and
  no curve: it has its row in the legend, with the words the screen
  gives it, "pop_c · no pair", and nothing in the frame.
- **Every series empty**: the axes and the legend, and an empty frame.
- **A mark with a NaN** is not drawn, as a point is not.
- **More series than the legend has room for** in the frame: the rows
  run below the frame's bottom and are cut by the SVG, and a series
  would be drawn with no name. So the screen gives no more series than
  its frame holds rows, one every 18 pixels: a frame 300 pixels high
  holds 16, which the LD decay draws at most. How the legend holds more
  is left for the running application, checked with 3 and with 16.
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
  frame to the y of the mark; two legend rows with the labels as text;
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
and the legend in the file; `toPNG(2)` of the plot. A test of the tokens
checks the four colours without a casing at 3:1 or more on the
background of each theme, as the scatter's test does for the marks.

## What this spec asks of other documents

- `docs/specs/charts/plot2d.md`, `AxesOptions`: `xWholeNumbers`, ticks
  at whole numbers with a comma between thousands on the horizontal
  axis, beside its `yWholeNumbers`.
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
