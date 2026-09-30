# The heatmap

Written on 30 September 2026, for stage 5 of `docs/build-order.md`, the
analyses of the populations; not yet approved by the owner, and there is
no code of it. This spec gives the function of `src/charts/heatmap.ts`
that draws a symmetric matrix of values between named things, the
distances between populations of `docs/specs/analyses/popDists.md`, as a
square grid of cells coloured by their value. It is drawn on the base of
the 2D plots, `docs/specs/charts/plot2d.md`, which gives it its SVG and
frame, its size, its axes, its text for a screen reader, its handle and
its export, and which this spec asks to draw axes of names (below, "What
this spec asks of other documents"). It takes from the scatter,
`docs/specs/charts/scatter.md`, the colours of viridis of
`src/charts/marks.ts` and the tooltip of `src/charts/hover.ts`. It
develops the row `src/charts/` of section 9 of `docs/architecture.md`,
where `heatmap.ts` is listed, and depends on
`.claude/skills/coding/charts.md`, `css.md` and `testing.md`.

The words of the web this spec needs are those of the scatter's spec,
which it uses as that spec defines them: SVG and `<path>`, the base, a
handle, React Aria, a screen reader, the focus, WCAG 2.2 and its success
criteria, jsdom. The words of this spec: a **name** is one of the things
the matrix is between, a population; a **cell** is the square of a row
and a column, the value of the pair of their two names; the
**diagonal** is the cells of a name with itself; a **band** is the width
of a row, which is also the height of a column, in pixels.

## What it does

### What the user sees

A square grid with a row and a column for each name, in the order the
data give, the first row at the top and the first column at the left.
The names are written left of their rows and under their columns, those
under the columns slanted, so that long names do not overlap. Each cell
off the diagonal is filled with the colour of its value, dark purple for
0 and yellow for the largest value of the matrix, and, when the cell is
large enough, the value is written in it. The cells of the diagonal are
left empty, since a name with itself is no pair. A cell with no value is
left unfilled and crossed by a line from corner to corner. Right of the
grid, a bar of the colours with the value at each end, under the name
of the value, "Hudson's Fst". Moving the pointer over a cell shows its
tooltip, the two names and the value, and outlines the cell.

The plot draws the order it is given and computes none: the order of
the populations is made by popnei in the calculation worker
(`popDists.md`, "The order of the heatmap"), since "clustering the order
of the heatmap" is a calculation, which is Rust's where Python gets the
same (`charts.md`, "The contract of a plot").

### The cells

One band for each name, from `scaleBand` of `d3-scale`, over the side of
the grid, the smaller of the frame's width and height, so that the cells
are square; the grid sits at the top left of the frame, and the room
left over lies right of it or under it. A gap of 1 pixel separates the
cells, `paddingInner` of the band scale at one pixel over the band, so
that two cells of close colours are still seen as two. The numbers of
the paths are rounded to a tenth of a pixel, `pathRound(1)` of
`d3-path`, as the scatter's are.

The cells are drawn as the scatter draws its points, one `<path>` per
step of viridis with a cell of that step, each cell a rectangle of its
path, written by a plain loop (`charts.md`, "Drawing"): at the 200 names
of `MAX_HEATMAP_NAMES` there are 39,800 cells off the diagonal, and an
element per cell would make as many elements. The cells with no value
are one path, `path.chart-cell-none`, with no fill, outlined, and with a
line from corner to corner in each, `--chart-axis`, so that a cell with
no value is told by its shape and not by a missing colour.

### The colours

The colour of a value is viridis, `viridisStep` and `viridisColour` of
`marks.ts`, the scale `charts.md` names for the heatmap: uniform to the
eye, readable in grey and to the common kinds of colour blindness, the
same in both themes and in the file, written on each path as its `fill`
attribute.

The scale runs from 0 to the largest finite value of the matrix, off
the diagonal (**Open 1**, below). When that largest value is above 0,
the step of a value v is `viridisStep(max(v, 0), 0, max)`; a negative
value, which a distance between two populations the data cannot tell
apart can be (`popDists.md`), takes the colour of 0, and its cell and its
tooltip write the value. When no value is above 0, the plot calls no
`viridisStep`, which gives the middle step, 128, for two equal ends and
throws for a value above its largest: every finite cell takes step 0,
and the bar of the legend is one band, "0". On
`panel.nei` the Fst of the three pairs, 0.1027, 0.1050 and 0.1096, are
at steps 239, 245 and 255 (node, 30 September 2026, with `viridisStep`
as `marks.ts` has it).

### The values in the cells

The value is written in the middle of its cell when the band is at least
`CELL_TEXT_MIN`, 56 pixels, meanwhile, refined in the running
application: "−0.0113", the longest value, is about 50 pixels wide at
the 12 pixels of the text of the plots, 7.2 pixels a character, the
width the scatter's legend counts (`scatter.md`, "The export"), and the
cell is the band less its gap of 1 pixel. Below that the cells hold no text,
and the tooltip and the table beside the plot give the values. The
format is that of the table of `popDists.md`: four decimals, the minus
sign U+2212 for a negative value, `heatmapNumber` below.

The text is black on the steps of viridis from 111 to 255 and white on
those from 0 to 110, whichever of the two has the larger contrast with
the step: its least contrast, at step 110, is 4.60:1, above the 4.5:1
of text (WCAG 2.2, 1.4.3), computed in node on 30 September 2026 from
`interpolateViridis` of `d3-scale-chromatic` 3.1.0 with the relative
luminance of WCAG. They are the tokens `--chart-text-on-light` and
`--chart-text-on-dark`, black and white in both themes, since the colour
under them is the same in both.

### The names on the axes

The base draws the two axes from the plot's scales, and needs, for the
heatmap, to draw one from a band scale, with the names as its labels and
no tick marks, and the labels of the horizontal one slanted at −45°
(below, "What this spec asks of other documents"). The two labels of the
axes, `xLabel` and `yLabel`, are empty, since the names say what the
rows are, and the base writes no text for an empty label.

A name is written whole up to 20 characters, and cut after 19 with an
ellipsis, "…", above them; the tooltip gives it whole. The margins are
fixed numbers made from the data, since nothing in a plot measures text
(`plot2d.md`, "The SVG and its frame"), at 7.2 pixels a character: left,
8 pixels and 7.2 for each character of the longest name as it is
written; bottom, 8 pixels and 0.71 of that width, the slant of 45°, and
8 more; top, 24, where the name of the value stands over the legend;
right, the legend's, below. When a band is narrower than
12 pixels, the size of the text, the names of that axis are not
written, since they would overlap, and the description says the order
in words.

### The legend

Drawn by the plot inside the SVG, in `chart-legend`, on the screen and
in the file alike: the heatmap's legend has nothing to press, where the
scatter's is buttons and so HTML of the screen (`scatter.md`, "The
legend, drawn by the screen"). It is a bar of 32 bands of viridis, 12
pixels wide and as high as the grid, at most 240 pixels, the largest
value at its top and 0 at its bottom, each band a rectangle with its
`fill`, as the bar of the scatter's exported legend is; the two values
at its ends, in `heatmapNumber`; the name of the value, `valueName`,
above it, in the top margin. The right margin is 16 pixels, the bar and 4 pixels, and 7.2
pixels for each character of the longest of the name of the value and
the two numbers at the ends.

### The cell under the pointer

The base makes the overlay and gives the plot the position of the
pointer (`plot2d.md`). The cell under it is the band of each axis that
holds that position, found by division; the gaps between cells and the
room right of or under the grid are no cell, and neither is the
diagonal. Then, as the scatter does for its point:

- **The tooltip**, `createTooltip` of `hover.ts`, with two lines, "p0
  and p2" and "Hudson's Fst 0.1027", or "Hudson's Fst: no value", the
  names whole and set as text, never as markup, beside the cell as
  `hover.ts` places it; it stays while the pointer is on the cell or on
  the tooltip, and goes with Escape, a leave of the plot or a draw
  (`scatter.md`, "The point under the pointer", 1.4.13).
- **The mark of the cell**, an outline of 2 pixels in `--color-text`
  around it, `path.chart-hover` in `chart-annotations`, which the export
  leaves out.
- **A tap** on a touch screen shows the tooltip of the cell tapped, as
  on the scatter.

The heatmap gives no events: no screen needs to know the cell under the
pointer.

## The TypeScript interface

```ts
// src/charts/heatmap.ts
export interface HeatmapData extends PlotText {   // xLabel and yLabel empty
  /** The names, the first row at the top and the first column at the left. */
  readonly names: readonly string[];
  /** names.length × names.length values, row by row, symmetric; the
      diagonal is not read; NaN for no value. */
  readonly values: Float64Array;
  /** What the values are, "Hudson's Fst": the title of the legend and
      the start of the tooltip's value. */
  readonly valueName: string;
}

export const createHeatmap: Chart<HeatmapData>;

/** A value of a cell, of its tooltip and of the legend: four decimals,
    the minus sign U+2212, "0.1027", "−0.0113". */
export function heatmapNumber(value: number): string;
```

```ts
// src/charts/limits.ts
/** The most names a heatmap draws: 39,800 cells off the diagonal. */
export const MAX_HEATMAP_NAMES = 200;
```

`check` throws an `Error`, a defect of the caller, for fewer than 2 or
more than `MAX_HEATMAP_NAMES` names, two names alike, `values` not of
`names.length` squared numbers, and two cells of one pair whose values
differ, NaN being equal to NaN there. A matrix of one name is no pair,
and the panel of the distances needs two populations to run.

`createHeatmap` makes its definition for the base in each call, since
the definition keeps the state of one plot, the bands of its last draw
and its tooltip, and wraps the base's handle so that `destroy` also
removes the tooltip, as `createScatter` does.

## The SVG it builds

The base makes the skeleton, with the class `chart chart-heatmap` and
the overlay (`plot2d.md`). The heatmap draws:

- in `chart-marks`: one `path.chart-cells` per step of viridis with a
  cell, keyed by the step, with its `fill` attribute; the path
  `path.chart-cell-none` of the cells with no value; and, when the band
  is at least `CELL_TEXT_MIN`, one `text.chart-cell-text` per cell with
  a value, with the class `chart-cell-text-dark` or
  `chart-cell-text-light` of its step, keyed by its row and column;
- in `chart-annotations`: `path.chart-hover` while a cell is under the
  pointer;
- in `chart-legend`: the rectangles of the bar, each with its `fill`,
  the two numbers and the name of the value, `text.chart-legend-text`.

```css
.chart-cell-none        { fill: none; stroke: var(--chart-axis); stroke-width: 1px; }
.chart-cell-text        { font-size: 12px; text-anchor: middle; dominant-baseline: central; }
.chart-cell-text-dark   { fill: var(--chart-text-on-light); }  /* black, on steps 111 to 255 */
.chart-cell-text-light  { fill: var(--chart-text-on-dark); }   /* white, on steps 0 to 110 */
```

## The numbers without the picture

- **The description**, which the screen writes: what the values are,
  how many names, the order in words and the range of the values, in the
  words of `popDistsDescription` (`popDists.md`, "Accessibility").
- **The table**, drawn by the screen, one row per pair with the values
  of both measures and the number of variants, from `popDistsRows`
  (`popDists.md`). The heatmap gives no rows of its own, as the scatter
  gives none: the panel makes the rows and the data of the plot from
  the same result, so the two never disagree.
- **The cells are not stops of the Tab key**, as the marks of every
  plot are not (`charts.md`, "Accessibility"); the table is the way in
  for the keyboard.
- **A value is told by more than its colour**: written in its cell when
  the cell is large enough, in the tooltip, and in the table (1.4.1).

## The export

The handle's `toSVG` and `toPNG` are the base's (`plot2d.md`, "The
export"), and no screen offers them until stage 6. The file holds the
grid, the names, the values in the cells and the legend, all of which
are in the SVG on the screen, so the heatmap has no `drawExport`; the
overlay, the mark of the cell under the pointer and the tooltip are
left out, as the base leaves them out. The colours of viridis are
already written on their paths, and the two colours of the text are
written from their tokens as the base writes every colour.

## The size

The screen's CSS gives the element its width, that of its container,
and meanwhile `aspect-ratio: 1 / 1` and a `max-width` of 40rem, refined
in the running application. At 40rem, 640 pixels at the default size of
text, with names of 3 characters and the legend of "Hudson's Fst", the
margins are about 30 pixels left, 31 below, 24 above and 118 right,
and the grid about 490 pixels a side: 3 populations give bands of about
164 pixels, with their values written, 8 populations bands of about 61,
still with them, and 9 of about 54, without. At 320 pixels wide, the width of a phone in WCAG
2.2, 1.4.10, the grid is about 170 pixels a side. Its PNG at 3 times is
1,920 pixels wide at 40rem.

## The cases

- **Two names**: a grid of two by two, one pair drawn twice, the bar
  from 0 to its value.
- **Every value NaN**, Jost's D at ploidy 1: every cell crossed, no bar
  but the name of the value and "no value".
- **No value above 0**: every finite cell the colour of 0, the bar one
  band; `viridisStep` is not called.
- **A negative value**: the colour of 0, and its number with the minus
  sign in the cell and the tooltip.
- **An `update` to the other measure, or another order**: the paths are
  joined by their steps and the texts by their row and column, in the
  same SVG; the tooltip is hidden.
- **A band below 12 pixels**: no names on the axes; below
  `CELL_TEXT_MIN`, no values in the cells.
- **A name with markup in it**, `<b>P1</b>`: written as text on the axis
  and in the tooltip; no `b` element is made.
- **`destroy`, a size of 0, a frame with no area, data the plot refuses
  and a change of theme** are the base's cases (`plot2d.md`, "The
  cases"); `destroy` also removes the tooltip.

## How it runs

On the page, in the main thread. The heatmap keeps the bands of its last
draw and the tooltip; the cells are the SVG's paths, at most 257 of
them, and at most a few dozen texts, since values are written only
in bands of 56 pixels or more, at most 8 names in a grid of 490
pixels, 56 texts. A draw is a loop over the cells.

## How it is verified

**Without a DOM**, in the project `charts` of Vitest: `heatmapNumber`
of 0.10273588423661377 is "0.1027" and of −0.011276258310056011
"−0.0113"; the step of a value and the class of its text, black at 111
and white at 110.

**The SVG, under jsdom**, with the size of the element stubbed, as for
the base: the matrix of Fst of `panel.nei` in the order p2, p0, p1, in
an element of 640 by 640 pixels, gives three paths of cells, of the
steps 239, 245 and 255, each with the colour of `viridisColour` of its
step and two cells, and the six values written, "0.1027" in the cells of
p2 and p0; a matrix whose values are all 0 or below gives one path, of
step 0, and a bar of one band; the names on the vertical axis read p2, p0, p1 from the top;
the diagonal has no cell. A matrix with a NaN pair gives the path
`chart-cell-none` with its two cells crossed; a negative value is of
step 0 and writes "−0.0113"; a band of 55 pixels writes no value; two
names alike, a matrix not symmetric, one name or 201, throw. A move of
the pointer to the middle of the cell of p2 and p1 shows the tooltip "p2
and p1" and "Hudson's Fst 0.1096"; to the diagonal or to a gap, none.

**In Playwright, in Chromium, Firefox and WebKit**, on the page of the
plots of the tests, `e2e/plots.html` (`plot2d.md`, "How it is
verified"): the heatmap of the same matrix drawn, its SVG of `toSVG`
with the colours of viridis and the colour of the text written on each
element, and no `var(`; a hover shows the tooltip, and Escape hides it;
axe finds nothing on the page. The flow of the panel checks the heatmap
in the running application (`popDists.md`, "How it is verified").

## What this spec asks of other documents

- `docs/specs/charts/plot2d.md`: `Frame.axes` takes a band scale of
  names, `ScaleBand<string>` of `d3-scale`, for either axis, drawn with
  no tick marks and each label cut by the plot as it gives it; an
  option of `AxesOptions` that slants the labels of the horizontal axis,
  `xLabelAngle`, −45 for the heatmap; and an empty `xLabel` or `yLabel`
  writes no text.
- `docs/specs/charts/scatter.md` and `src/charts/hover.ts`: nothing
  changes; the heatmap calls `createTooltip` as the scatter does, with
  lines of its own.
- `.claude/skills/coding/css.md` and `src/ui/tokens.css`: the tokens
  `--chart-text-on-light`, black, and `--chart-text-on-dark`, white, the
  same in both themes, for the text over the colours of viridis.
- `.claude/skills/coding/charts.md`: the heatmap's data, its legend in
  the SVG, and that the order of its names comes from popnei's
  principal coordinates and not from a clustering.

## Open points

**Open 1: where the colours start.** From 0, as above, or from the
smallest value of the matrix. It is **Open 2** of
`docs/specs/analyses/popDists.md`, asked there with its options once,
since it changes what the distances look like; meanwhile, from 0.

## Not in this spec

- The order of the names, the table and the description:
  `docs/specs/analyses/popDists.md`.
- A zoom of a large heatmap, and names picked to be drawn when bands are
  narrow: not in stage 5; the table has every pair.
- The buttons of the export: stage 6.
