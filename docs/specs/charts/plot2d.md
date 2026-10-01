# The base of the 2D plots

Written on 26 September 2026, for stage 3 of `docs/build-order.md`, the
Variants step whole, after the owner asked that day that stage 3 make
one piece for what every 2D plot has in common; approved by the owner on 26 September 2026. There is no code in `src/charts` yet.
Revised on 27 September 2026 for the scatter plot of the PCA,
`docs/specs/charts/scatter.md`, in stage 4, approved by the owner on 28 September 2026: the
overlay and the calls of the pointer, the hook that draws the legend
into the exported file, with the argument of `exportSvg` that carries
it into the SVG and the PNG, and the mark of the point under the
pointer left out of that file; and after the last review of the
scatter the same day, the element the pointer went onto given to
`pointer.leave`, and the round joins of the outlines written on the
exported file with `stroke-linejoin`. Revised on 30 September 2026 for
the plots of stage 5, the heatmap of `docs/specs/charts/heatmap.md` and
the line plot of `docs/specs/charts/line.md`, and the histograms of the
spectrum of `docs/specs/analyses/sfs.md`: an axis of names drawn from a
band scale, its labels slanted when asked, no text for an empty label
of an axis, and ticks at whole numbers on the horizontal axis alone,
`xWholeNumbers`; approved by the owner on 30 September 2026. Revised on
1 October 2026 for two decisions of the owner of that day: the size of
the element given to the margins, for the heatmap, and the label of the
horizontal axis written on two lines when one would not fit, for the
histograms of the spectrum on a screen of 320 pixels
(`docs/specs/stage-5-open-points.md`). This spec gives
`src/charts/plot2d.ts`, the function that every plot drawn in two
dimensions makes its handle with: the histogram of
`docs/specs/charts/histogram.md` now, and the scatter plot of the PCA,
the Manhattan plot and the QQ plot of later stages. It holds what those
plots share: the SVG and its frame with the margins, the size and its
changes, the axes drawn from the plot's scales, the themes, the text
that a screen reader reads for the plot and the rule of the table of the
numbers behind it, the handle with its `update` and `destroy`, and the
export as SVG and PNG. A plot adds to it only what it draws, its marks,
its annotations and its legend. It is built and tested in stage 3 with
the histogram; the export is offered by buttons only in stage 6, with
the report, as the owner decided on 26 September 2026 (point C of
`docs/specs/stage-3-open-points.md`). It develops the row `src/charts/`
of section 9 of `docs/architecture.md` and its section 7, "A plot is a
function", and depends on `.claude/skills/coding/charts.md`, `css.md`
and `testing.md`.

A **handle** is the object a plot function returns, through which the
screen gives the plot new data, removes it and exports it
(`charts.md`, "The contract of a plot"). A **definition** of a plot is
what a kind of plot gives this base: its name, the check of its data,
its margins and the function that draws its marks.

## Its form: a function that makes the handle from a definition

`createPlot2d(element, data, definition)` returns the handle of the
plot, and each 2D plot is that call with its definition:

```ts
export const createHistogram: Chart<HistogramData> = (element, data) =>
  createPlot2d(element, data, histogramDefinition);
```

The base owns what happens between the calls of the screen, the order
in which the SVG is made, drawn, drawn again after a change of size and
removed, and calls the plot's `draw` with a frame of the right size. So
the rules that are easy to get wrong once per plot, nothing drawn at a
size of 0, one draw per frame of the screen after a resize, `destroy`
safe to call twice, a check that throws before anything is added to the
page, are written and tested once.

It is a function and not a class, for the reasons `charts.md` gives for
every handle and that section 7 of the architecture sets, "a plot is a
function": the handle is a closure over the state of its plot, which
nothing outside can reach into, and has no `this` that a method passed
as a callback would lose. A base class with a subclass per plot would
give the same sharing through inheritance, with each plot overriding
methods whose order of calls the base decides, and the state of the
plot in fields that the subclass and the base both write. The option
not taken on the other side, a set of helper functions that each plot
calls from its own `createX`, would share the drawing of the frame and
the axes but leave each plot to write again the lifecycle above, where
the defects are. The definition is the same shape as the definition of
an analysis in section 4 of the architecture: plain functions that a
common piece calls.

The 3D plot of the PCA, `pca3d.ts`, is not built on this base, since it
draws with WebGL and not into an SVG; it shares with it `export.ts`, the
ids and the rules of the handle (`charts.md`, "The 3D PCA with
three.js").

## What it does

### The SVG and its frame

The base makes the skeleton of `charts.md`, "The SVG, its parts and
their names", in the element it is given, once, when the plot is
created: the `<svg>` with the classes `chart chart-‹kind›`, `chart
chart-histogram` for the histogram, its `<title>` and `<desc>`, the clip
of the marks in `<defs>`, and the groups `chart-frame`, `chart-grid`,
`chart-axis-x`, `chart-axis-y`, `chart-marks`, `chart-annotations`, the
two labels of the axes and `chart-legend`. It gives the plot the groups
where it draws, and writes nothing inside `chart-marks`,
`chart-annotations` and `chart-legend` itself.

The overlay, `rect.chart-overlay`, a transparent rectangle over the
frame that takes the movements of the pointer, is made by the base for
a plot whose definition has `pointer`, the scatter of stage 4 the first;
the histogram has none, and so no overlay. It is the last child of
`chart-frame`, over everything drawn, of the size of the frame at each
draw, with `fill: none` and `pointer-events: all` in `charts.css`, so
that it takes the pointer where it is transparent. The base listens on
it to `pointermove` and `pointerdown`, and calls `pointer.move(x, y)`
with the position of the pointer in the pixels of the frame, from
`pointer` of `d3-selection`, so that a tap on a touch screen, which
moves no pointer before it, is a move too; and to `pointerleave` from a
mouse or a pen, and calls `pointer.leave(to)` with the element the
pointer went onto, the event's `relatedTarget`, or `null` when it left
the page, so that a plot whose tooltip takes the pointer can tell a
leave onto its tooltip from a leave of the plot (`scatter.md`, "The
point under the pointer"). A finger that leaves the
screen is not a leave, so that the tooltip of a tap stays
(`scatter.md`, "The point under the pointer"). The listeners go with
the SVG in `destroy`. What the plot does with the position, the nearest
point, its tooltip and its events, is the plot's.

The ids of each plot are unique in the page, from a counter of
`src/charts/ids.ts`: a prefix such as `chart3`, and the ids
`chart3-title`, `chart3-desc` and `chart3-clip`, since two histograms of
one screen would otherwise name each other's title and clip.

The frame follows the margin convention of D3 (`charts.md`, "The
margins"): the SVG takes the size of the element, the margins of the
plot hold its axes and their labels, and the frame is the rest, of
`innerWidth` by `innerHeight`, which the base gives the plot. The
margins are the definition's, a function of the data, since the
histogram's top margin is larger when it draws a legend, and, from 1
October 2026, of the size of the element, which the base gives with the
data, since the heatmap makes its margins without its names when the
size leaves them no room (`docs/specs/charts/heatmap.md`, "The names on
the axes"); a plot whose margins do not depend on the size does not
read it. They are fixed
numbers and not measured from the text, because jsdom, the DOM of the
unit tests, cannot measure text, and a browser can measure it only once its fonts
are loaded. So the text of every plot has a size in pixels in
`charts.css`, 12 for the ticks and the legend and 13 for the labels of
the axes, which fits the fixed margins whatever size of text the user
set in the browser; a zoom of the page enlarges the whole plot, its text
with it, which is what WCAG 2.2, success criterion 1.4.4, asks.

### The size and its changes

The plot never sets the size of its element (`charts.md`): the screen's
CSS gives it a width, from its container, and a height or an
`aspect-ratio`. The base reads the size when the plot is created, and
draws at once when the element has one, so that the report, which draws
a plot outside the visible page and takes its SVG
(`docs/architecture.md`, section 8), gets a plot drawn. Then a
`ResizeObserver` on the element calls it at each change of size, with
the size of the element's content box, inside its padding and its
border, as `contentRect`. So the size at creation is that box too, the
`clientWidth` and `clientHeight` of the element less its padding, and an
element with a padding or a border is drawn at one size and not at two.
`getBoundingClientRect` would give the box outside the border, and a
size changed by a CSS transform. `clientWidth` is rounded to a whole
pixel, so an element 600.5 pixels wide is drawn at 600 when the plot is
created and once more at 600.5 at the observer's first call, which comes
at the next frame of the screen. After a change of size the base draws
once per frame of the screen, with `requestAnimationFrame`, at the last
size the observer gave, since a drag of the window gives many calls and
the eye sees no more than one draw per frame. While the
element has no size, a tab that is hidden, nothing is drawn, and the
next call with a size draws. `width`, `height` and the `viewBox` of the
SVG are the size in CSS pixels at the last draw, so one unit is one
pixel on the screen and in the file.

### The axes

The plot builds its scales at each draw, from its data and the size of
the frame, with the ranges `[0, innerWidth]` and `[innerHeight, 0]`,
since a scale kept from a draw before is how a plot shows new data on an
old axis (`charts.md`, "Drawing"). The base draws the two axes from
those scales, with `d3-axis`, and writes the labels of the axes, the
`xLabel` and `yLabel` of the data, centred under the horizontal axis
and turned along the vertical one, in the margins:

- about one tick for every 80 pixels of the width of the frame and one
  for every 40 pixels of its height, meanwhile, refined in the running
  application;
- the labels of the ticks in the format the scale gives, `tickFormat`
  of `d3-scale`, or the one the plot asks for;
- for a count, ticks at whole numbers only, written with a comma between
  thousands, "12,000", since a count of 0.5 variants means nothing; the
  histogram asks for them on its vertical axis, `yWholeNumbers`. From
  stage 5 the same holds for the horizontal axis alone, `xWholeNumbers`:
  the counts of the rarer allele of the spectrum, whose bars are shares
  and whose vertical ticks are not whole, and the distances in base
  pairs of the LD decay, "20,000". One option for each axis, since
  `tickShown` acts on both axes and would take away the ticks of the
  shares;
- from stage 5, **an axis of names**, for the heatmap: either axis may
  be drawn from a band scale of `d3-scale`, `ScaleBand<string>`, whose
  labels are the names, each written as the plot's `nameFormat` gives
  it, cut by the plot and never by the base, the scale keeping the whole
  names, with no tick marks; and the labels of the
  horizontal axis slanted by `xLabelAngle` degrees, −45 for the
  heatmap, anchored at their end so that a long name runs down and to
  the left of its column;
- an empty `xLabel` or `yLabel` writes no text, from stage 5, since the
  names of the heatmap say what its rows and columns are;
- from 1 October 2026, **a label of the horizontal axis that would not
  fit is written on two lines**, as the owner decided that day (point 26
  of the report of `docs/plans/population-analyses.md`). The label is
  centred under the frame, so it fits while half its width is at most
  the room from the middle of the frame to the nearer side of the SVG,
  the half of the frame and the left or the right margin. Its width is
  counted, 7.1 pixels a character, and not measured, as the margins
  are: at its 13 pixels the label of the spectrum took 6.0 pixels a
  character in the font of the Mac and 7.1 in DejaVu Sans, the font of
  the checks at 320 pixels, in Chromium and WebKit, the widest of the
  two. At 7.2, the count of the numbers of the axes, "Expected
  heterozygosity (unbiased)", 34 characters under a histogram of the
  Variants step at 320 pixels, counted 122.4 pixels of half width
  against 122 of room and was broken, where it fits. A label that does
  not fit is broken at the space nearest its middle, the two lines
  centred under the frame and 16 pixels apart, and the base adds 16
  pixels to the bottom margin the definition gave, so that the frame is
  16 pixels lower and the second line stands where the one line did, 8
  pixels above the bottom of the SVG. `Frame.margin` is the margin as
  drawn. The first line keeps its space at its end, so that the text of
  the label, read from the SVG, is the label. A label with no space is
  not broken, and one that fits is drawn as before, on one line and
  with the definition's margins, so no plot whose label fits changes.
  On a screen of 320 pixels "Copies of the rarer allele among 40
  chromosomes", 47 characters, was 278 to 326 pixels long under a frame
  of about 205 pixels in an SVG of 281, and its end was cut. The option
  not taken was a shorter label on narrow screens, which mends one plot
  and not every plot with a long label;
- **the label of the vertical axis is treated the same way**, centred
  along the frame and turned: it fits while half its counted width is at
  most half the height of the frame and the top or the bottom margin,
  whichever is smaller; otherwise it is broken at the space nearest its
  middle into two lines 16 pixels apart, the first 16 pixels from the
  left of the SVG as the one line is, and the base adds 16 pixels to the
  left margin, so that the numbers of the axis keep their room. The
  owner's report said that this label "also looks cut" at 320 pixels:
  "Share of the variants with both alleles", 247.6 pixels long in DejaVu
  Sans, ran 3.8 pixels above the top of its SVG, in Chromium, once the
  frame of the histogram was 16 pixels lower for the label under it.
  The two decisions read each other, since a second line under the
  frame makes it lower and one along it makes it narrower: the base
  decides them again, at most three times, until neither changes. A
  label that fits is drawn on one line, with the definition's margins.

The grid, `chart-grid`, stays empty until a plot asks for one.

### The themes

The base writes classes and no colour, as every plot does (`charts.md`,
"Colours, themes and the exported file"): `charts.css` gives each class
its colours from the tokens of `src/ui/tokens.css`, so a change of theme
changes the tokens and the plot on the screen follows with no redraw.
The exported file is always in the light theme (below, "The export").

### The text alternative and the table of the numbers

A screen reader reads the plot as one image, and a user who cannot see
it needs what it shows in words and the numbers behind its marks
(`charts.md`, "Accessibility"):

- **The SVG has `role="img"`, with `aria-labelledby` naming its
  `<title>` and its `<desc>`**, which the base writes from the `title`
  and the `description` of the data, as text and never as markup, since
  a title can hold the name of a population from the user's files. The
  screen writes the description, because it knows what the numbers mean.
- **A table beside the plot**, drawn by the screen and not by the plot,
  since the tables of the applications are made with React Aria, the
  library of accessible widgets of the screens, and the plots
  know nothing of React (`docs/architecture.md`, section 7). Each plot
  gives the screen its rows with a pure function of its data, one row
  per mark, `histogramRows` for the histogram, from which the screen
  draws the table, writes its CSV and writes the description, so that
  the table and the plot never disagree. The scatter of the PCA gives
  none: its table, of every component kept, is the PCA's, from the same
  result as the plot's data (`scatter.md`). The one rule the tables of
  the plots share is `tableNumber(x)`, a number shown to 12 significant
  digits, `Number(x.toPrecision(12))`, so that an edge that popnei gives
  as 0.07500000000000001 reads 0.075; the rows and the CSV keep every
  digit. It is in `src/charts/numbers.ts`, a module of its own, so that
  the tooltip and the legend, which the 3D view loads too, do not bring
  the base and its D3 with them.
- The marks are not stops of the Tab key: the table is the way in for
  the keyboard, and a few thousand tab stops would be of no use.

### The handle

`createPlot2d` returns the `ChartHandle<Data>` of `charts.md`:

- **`update(data)`** checks the data with the definition's `check`,
  writes the title and the description, and draws at once at the size
  of the last draw, in the same `<svg>` element, so that the threshold line of a histogram, which follows the number
  the user types in the field of its filter, moves as the key is
  pressed. A draw that a
  resize scheduled still runs, and draws the new data at the new size.
- **`destroy()`** disconnects the `ResizeObserver`, cancels a draw that
  waits for its frame, and removes the SVG, leaving the element with no
  child and no listener. A second call does nothing, because React in
  development mounts every effect, removes it and mounts it again
  (`react.md`).
- **`toSVG()` and `toPNG(scale)`**, below.

### The export

`toSVG()` and `toPNG(scale)` are made by `src/charts/export.ts`, as
`charts.md`, "Colours, themes and the exported file" and "PNG", has
them, from the SVG of the plot and its size; the 3D plot calls the same
functions with the SVG it projects. In stage 3 no screen calls them: the
buttons "Download as SVG" and "Download as PNG" come in stage 6, when
every plot is offered so (`docs/build-order.md`), and until then the
export is checked by its tests (below, "How it is verified").

- **What the file holds**: the plot as it is on the screen, at its size,
  with its title, its description, its axes, its marks, its annotations
  and its legend; the colours of the light theme written on each
  element, with the other properties of the list of `charts.md`,
  `stroke-linejoin` among them from stage 4 so that the outlines of the
  scatter keep their round joins, with no `var(` left, resolved in a hidden container with
  `data-theme="light"`, since the file goes to papers and to print; a
  first rectangle of the background colour, since a transparent plot on
  a dark slide cannot be read; the overlay removed when there is one,
  and the mark of the point under the pointer, `chart-hover`, since
  neither is part of the plot; the fonts named as `charts.md`, "Fonts",
  has them. Not the table, and not the versions of popnei and of the
  application, which the page shows beside every download
  (`docs/functionality.md`, section 9).
- **What the screen draws beside the SVG**, the legend of the scatter,
  which on the screen is HTML of the screen (`scatter.md`, "The legend,
  drawn by the screen"): the definition's `drawExport` draws it into
  the `chart-legend` group of the copy that is exported, before the
  styles are written on it, with the frame of the last draw, and the
  plot on the screen is not changed. `exportSvg` of `export.ts` takes
  the function that does it as a third argument, `drawBeside`, which it
  calls with the copy once the overlay and the mark of the point under
  the pointer are removed and before it writes the styles, so that what
  it draws gets its colours written like the rest. The base gives
  `exportSvg` a function that finds the `chart-legend` group of the copy
  and calls `drawExport` with it, the frame and the data of the last
  draw, and gives the same function in `toSVG` and in `toPNG`, whose
  PNG is drawn from `exportSvg`'s SVG: a PNG made without it would lack
  the legend its SVG has. The 3D plot builds its SVG with the legend in
  it, and gives no third argument.
- **The PNG** is the SVG of `toSVG` drawn on a canvas at `scale` times
  its size, 3 for print at 300 dpi and 2 for slides. `toPNG` rejects
  with a `PngError` whose `kind` tells the two failures apart:
  `tooLarge`, when that scale would make a side above 4,096 pixels,
  which a canvas of iOS does not draw, checked before anything is drawn;
  and `notMade`, when the browser gives no canvas, cannot draw the SVG
  on it or makes no PNG. Every failure of `toPNG` is a rejection of its
  promise, a defect of the caller among them, so that a screen that
  handles the promise sees them all; a rejection that is not a
  `PngError` is a defect, which the screen does not show as a refused
  PNG and throws again. The screen picks the scale: it asks for 3, and
  for 2 after a `tooLarge`.
  A histogram is at most 40rem wide (`histogram.md`, "The size"), 640
  pixels at the browser's default size of text, 16 pixels, so 3 times is
  1,920 pixels; it takes 2 times only above 1,365 pixels a side, a size
  of text above 34 pixels, and is refused above 2,048, a size of text
  above 51 pixels.
- **The fonts.** `toPNG` draws only once `document.fonts.ready` has
  resolved, the promise of the browser that the fonts the page uses are
  loaded, so that the PNG has its text in them (`charts.md`, "Fonts").
  `toSVG` returns at once and waits for nothing, since the applications
  load no web font while they use the fonts of the system, and no part
  of a plot or of its export measures text: its file is the same before
  and after the fonts are loaded. The work that gives the applications
  a typeface of their own makes `toSVG` wait for it too.
  The SVG of the PNG is written when `toPNG` is called, before the wait,
  so that the PNG is the plot as it was then, legend and marks alike,
  even when an `update` comes before the fonts are ready (found by the
  review of the scatter, 28 September 2026).
- **The canvas of a PNG** is emptied, to a width and a height of 0, once
  the PNG is made or refused. WebKit counts the memory of the canvases
  of a page until they are collected, and Safari on iOS then gives no
  context for a new canvas, which would refuse with `notMade` the PNG of
  a plot that was saved as one a moment before.
- **The words of a refused PNG**, drafted with this spec for the screen
  spec that gives the buttons in stage 6: "The plot is too large to save
  as a PNG. Save it as SVG, or make the window narrower and try again."
  for a `tooLarge` at 2, and "The browser could not make the PNG. Save
  the plot as SVG." for a `notMade`, both said without moving the focus
  (WCAG 2.2, 4.1.3).
- **The name of each file** is the analysis's, which gives it with its
  plot (`docs/specs/analyses/variantChecks.md` and
  `individualChecks.md`).

## The TypeScript interface

The texts every 2D plot draws, which the data of each plot hold beside
its numbers:

```ts
// src/charts/plot2d.ts
export interface PlotText {
  readonly title: string;          // the <title> of the SVG
  readonly description: string;    // the <desc>, written by the screen
  readonly xLabel: string;
  readonly yLabel: string;
}

export interface Margin {
  readonly top: number;            // CSS pixels
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}
```

What the base gives the plot's `draw`: the size of the frame and the
margins around it, the groups where the plot draws, and the axes to draw
from its scales. The margins are there for a plot that draws in them, as
the histogram places its legend from the top left of the SVG, so that it
does not compute them again from its data.

```ts
export interface AxesOptions {
  /** The labels of the ticks; the scale's tickFormat when absent. */
  readonly xFormat?: (value: number) => string;
  readonly yFormat?: (value: number) => string;
  /** Ticks at whole numbers only, with a comma between thousands, on
      the vertical axis, and, from stage 5, on the horizontal one. */
  readonly yWholeNumbers?: boolean;
  readonly xWholeNumbers?: boolean;
  /** From stage 5, the angle of the labels of a horizontal axis of
      names, in degrees; 0 when absent. */
  readonly xLabelAngle?: number;
  /** From stage 5, the label of a name on an axis of names, the name
      cut as the plot writes it; the name itself when absent. The band
      scale keeps the whole names, so that two names alike in their
      first characters stay two rows. */
  readonly nameFormat?: (name: string) => string;
  /** Whether a tick of either axis is drawn, of those its scale gives;
      all are when absent. */
  readonly tickShown?: (value: number) => boolean;
}

export interface Frame {
  readonly innerWidth: number;     // above 0: draw is never called at a size of 0
  readonly innerHeight: number;
  readonly margin: Margin;         // the definition's for these data, around the frame
  readonly marks: Selection<SVGGElement, unknown, null, undefined>;
  readonly annotations: Selection<SVGGElement, unknown, null, undefined>;
  readonly legend: Selection<SVGGElement, unknown, null, undefined>;
  /** Draws the two axes and their labels from the plot's scales; from
      stage 5 either may be a band scale of names, drawn with no tick marks. */
  axes(
    x: ScaleContinuousNumeric<number, number> | ScaleBand<string>,
    y: ScaleContinuousNumeric<number, number> | ScaleBand<string>,
    options?: AxesOptions,
  ): void;
}
```

`Selection` is `d3-selection`'s and `ScaleContinuousNumeric` and
`ScaleBand` are `d3-scale`'s; they stay inside `src/charts`.

What a kind of plot gives the base. `check` throws an `Error` for a
defect of the caller, data the plot cannot draw by its contract, as
`charts.md` asks; `draw` draws the whole plot for the data and the
frame, and can be called any number of times with the same arguments.
`pointer` and `drawExport` are for a plot that takes the pointer or
draws something beside its SVG, the scatter; the histogram has neither.
A definition is a constant when the plot keeps no state of its own
between draws, as the histogram's is, and is made in each call of the
plot's function when it does, as the scatter's holds the positions of
its last draw and its tooltip.

```ts
export interface Plot2dDefinition<Data extends PlotText> {
  /** The name in the class of the SVG, chart-‹kind›: "histogram". */
  readonly kind: string;
  readonly check: (data: Data) => void;
  /** The margins for `data` in an element of `size`, above 0 by 0. */
  readonly margin: (data: Data, size: ExportSize) => Margin;
  readonly draw: (frame: Frame, data: Data) => void;
  /** The base makes the overlay and calls these, in the pixels of the frame. */
  readonly pointer?: {
    readonly move: (x: number, y: number) => void;
    /** `to`: the element the pointer went onto, the event's relatedTarget; null off the page or for the base's own call. */
    readonly leave: (to: EventTarget | null) => void;
  };
  /** Draws into `legend`, of the exported copy, what the screen shows beside the SVG. */
  readonly drawExport?: (
    legend: Selection<SVGGElement, unknown, null, undefined>,
    frame: ExportFrame,
    data: Data,
  ) => void;
}

/** The frame of the last draw, for what is drawn into the exported copy. */
export interface ExportFrame {
  readonly innerWidth: number;
  readonly innerHeight: number;
  readonly margin: Margin;
}

export function createPlot2d<Data extends PlotText>(
  element: HTMLElement,
  data: Data,
  definition: Plot2dDefinition<Data>,
): ChartHandle<Data>;
```

```ts
// src/charts/numbers.ts
/** A number of a table of a plot, to 12 significant digits. */
export function tableNumber(value: number): number;
```

The export of a plot and the error a PNG is refused with, in
`src/charts/export.ts`. `exportSvg` has, from stage 3, the SVG of the
plot and its size at the last draw; stage 4 adds `drawBeside`.

```ts
export interface ExportSize {
  readonly width: number;          // CSS pixels, the SVG's at the last draw
  readonly height: number;
}

/**
 * The SVG of the file: a copy of `svg` with the colours of the light
 * theme written on it, a first rectangle of the background, and no
 * overlay and no mark of the point under the pointer. `drawBeside`, when
 * given, draws into the copy before the colours are written.
 */
export function exportSvg(
  svg: SVGSVGElement,
  size: ExportSize,
  drawBeside?: (copy: SVGSVGElement) => void,
): string;

/** The PNG of the SVG that `svgText` gives, at `scale` times `size`. */
export function exportPng(
  svgText: () => string,
  size: ExportSize,
  scale: PngScale,                 // 2 | 3, of src/charts/types.ts
): Promise<Blob>;

export class PngError extends Error {
  readonly kind: "tooLarge" | "notMade"; // a side above 4,096 pixels at that scale; no canvas, or no PNG made
}
```

`src/charts/limits.ts` holds the side of the largest canvas,
`MAX_CANVAS_SIDE`, 4,096 pixels, beside the limits of each plot.

## The cases

- **Data the plot cannot draw**, when it is created: `check` throws
  before the base adds anything to the element. In `update`: the plot
  stays as it was, the previous data drawn.
- **An element with no size when the plot is created**: the SVG is made,
  with its title and description, and nothing is drawn until the
  observer gives a size.
- **An element whose size becomes 0 after a draw**, in a tab that is
  hidden: nothing is drawn, the last drawing stays, and `toSVG` and
  `toPNG` export it.
- **An element with a size but no room for the frame**, not larger than
  the margins: a histogram with a threshold in an element 56 to 100
  pixels high, whose top margin of 56 and bottom margin of 44 take all
  of it. The plot's `draw` is not called; the base removes everything
  drawn in the marks, the annotations, the legend and the axes, and
  gives the SVG a `width` and a `height` of 0 and no `viewBox`, so that
  no bar of an earlier draw stays on the screen under the title of new
  data, and the browser does not show an SVG with no width at its
  default size of 300 by 150 pixels. `toSVG` then throws an `Error` that
  says the frame has no area, and `toPNG` rejects with it, a defect of
  the caller,
  since a screen gives its plot a size larger than its margins. The next
  draw with room for the frame, after a resize or an `update` to data
  with smaller margins, draws the plot again.
- **`update`, `toSVG` or `toPNG` after `destroy`**, and `toSVG` or
  `toPNG` of a plot never drawn, whose element never had a size: an
  `Error`, a defect of the caller, since a screen exports only a plot it
  shows. `update` and `toSVG` throw it, and `toPNG` rejects with it.
- **A title or a label with markup in it**, `<b>P1</b>`, from a name the
  user gave: written as text; no `b` element is made.
- **A change of theme** while the plot is on the screen: nothing is
  drawn again; a later `toSVG` is in the light theme all the same.
- **A frame with no area, for a plot with an overlay**: the overlay is
  given a size of 0 and `pointer.leave(null)` is called, so that no tooltip
  stays over an empty frame.

## How it runs

On the page, in the main thread, as every plot. The base adds one
`ResizeObserver` and at most one waiting `requestAnimationFrame` per
plot; nothing it holds grows with the data.

## How it is verified

At `createPlot2d` and the handle, with a definition of a test that draws
one rect per value, and again through the histogram, whose tests are in
its spec.

**Without a DOM, in the project `charts` of Vitest** (`testing.md`):
`tableNumber` of 0.07500000000000001 is 0.075 and of 0.9500000000000001
is 0.95; the ticks of a vertical axis of whole numbers for a domain of 0
to 3 are 0, 1, 2 and 3, and, from stage 5, those of a horizontal axis
with `xWholeNumbers` for a domain of 0.5 to 2.5 the whole numbers 1 and
2 alone, where d3's ticks without it are 0.5, 1, 1.5, 2 and 2.5, while
the vertical axis of the same plot, from 0 to 0.06, keeps ticks that
are not whole; a domain of 0.5 to 20.5 cannot test it, since d3 gives
whole ticks there by itself.

**The SVG, under jsdom**, with the size of the element given by a stub
of `clientWidth` and `clientHeight` and a `ResizeObserver` the test
calls:

- the skeleton of "The SVG and its frame", with `role="img"`, the
  classes `chart chart-‹kind›`, the `<title>` and `<desc>` of the data,
  and ids that differ between two plots made in one element each;
- a `check` that throws leaves the element with no child; an `update`
  whose `check` throws leaves the SVG of the data before;
- a size of 0 draws nothing; the first call of the observer with a size
  draws, once, at the next frame, and three calls within one frame draw
  once, at the last size;
- an element of 420 by 320 pixels with a padding of 10 is drawn at 400
  by 300 when the plot is made, and not again when the observer gives
  that content box;
- an element not larger than the margins, when the plot is made and
  after an `update` to data with larger margins, gives an SVG of 0 by 0
  with nothing in its marks, its annotations, its legend and its axes,
  and a `toSVG` that throws saying the frame has no area; a resize with
  room for the frame draws it again;
- `width`, `height` and the `viewBox` of the SVG at the size of the last
  draw, and the frame of `innerWidth` by `innerHeight` of that size less
  the margins;
- from 1 October 2026, with margins of 12, 16, 44 and 60 pixels, top,
  right, bottom and left: in an element of 600 by 375 pixels the label
  "Copies of the rarer allele among 40 chromosomes" is one text with no
  line of its own inside, and the frame is 319 pixels high; in one of
  281 by 288 pixels it is two lines, "Copies of the rarer allele " and
  "among 40 chromosomes", both centred under the frame, the second 16
  pixels under the first and 8 above the bottom of the SVG, the frame
  216 pixels high, 16 fewer than the margins alone leave, the margin
  given to `draw` with a bottom of 60, and the text of the label still
  the label; a resize back to 600 by 375 gives one line and the frame
  of 319 again; a label of 46 characters with no space stays one line
  at 281 pixels; "Major allele frequency" stays one line at 281;
- from 1 October 2026, with the same margins, in an element of 281 by
  288 pixels the vertical label "Share of the variants with both
  alleles" is two lines, "Share of the variants " and "with both
  alleles", the left margin given to `draw` 76 and the frame 189 pixels
  wide, the label under it on two lines as well; "Count" stays one line;
- an `update` redraws in the same `<svg>` element;
- a title `<b>P1</b>` is text in the `<title>`, and no `b` element
  exists;
- `destroy` leaves the element with no child, disconnects the observer,
  cancels a waiting draw, and a second `destroy` throws nothing; an
  `update` and a `toSVG` after it throw, and a `toPNG` after it, or of a
  plot never drawn, returns a promise that rejects, and throws nothing;
- from stage 5, an axis of a band scale of the names p2, p0, p1 draws
  three labels in that order and no tick line; with `xLabelAngle` −45
  each label of the horizontal axis has the rotation −45 and the anchor
  `end`; a name `<b>P1</b>` is text; an empty `xLabel` leaves no text
  element of the label;
- a definition with `pointer` gives `rect.chart-overlay`, the last child
  of `chart-frame`, of the size of the frame after a draw and after a
  resize, and of 0 by 0 with `leave` called when the frame has no area;
  one without it gives none;
- `toSVG` of a definition with `drawExport` holds in its `chart-legend`
  what `drawExport` drew there, with the frame of the last draw, and the
  `chart-legend` on the screen stays empty; a `path.chart-hover` in the
  plot is not in the file.

**In Playwright, in Chromium, Firefox and WebKit**, where the export is
first seen working. No screen offers the export in stage 3, so the tests
open a page of their own, `e2e/plots.html`, which draws the histogram of
the MAF of `e2e/fixtures/panel.nei`, its bins as literals, at a size the
test sets, and gives the test its handle through `page.evaluate`. The
page is built only for the tests, when `test:e2e` sets the variable
`POPNEI_TEST_PAGES`, so that the flows run against the built site as
`testing.md`, "Against the built site", asks, and the site that users
open does not carry it. It is built in a second build of its own, after
the site's, with it as the only page, into `dist/e2e/` with its own
assets under `dist/e2e/assets/`, so that the files of the site are byte
for byte those of a build without the variable. Added to the same build
as the pages of the site, it changed how the bundler splits the code
they share: with Vite 8.3.0 on 26 September 2026, the CSS of
`popgen.html`, 20.4 kB, became 18.0 kB and a file of the tokens of 2.4
kB, a script of Vite to preload modules was added, and the scripts of
`popgen.html` and `probe.html` changed, so every test in a browser ran
on files that were not those deployed. The option not
taken was to open that page on the development server of
Vite, which serves the sources one by one and so is not the site the
export will run in.

- the SVG of `toSVG` holds no `var(` and no `chart-overlay`, has a first
  background rectangle, and has the light colours when the page is dark:
  the fill of a kept bar is `rgb(0, 114, 178)`; and `exportSvg` with a
  `drawBeside` that adds a mark of the classes `chart-points
  chart-colour-0`, a path or any other element, since `exportSvg` treats
  them alike, gives that mark a fill of `rgb(230, 159, 0)` written on
  it, as the colours of the plot are;
- `toPNG(3)` of a plot of 600 by 375 pixels is a PNG of 1,800 by 1,125
  pixels; of a plot 1,400 pixels wide it rejects with `tooLarge`, and
  `toPNG(2)` gives 2,800 pixels; `toPNG(2)` of a plot above 2,048 pixels
  a side rejects with `tooLarge` without drawing; an image not decoded,
  a canvas with no context, a `drawImage` that throws, and a `toBlob`
  that gives `null` or throws, each stubbed, reject with `notMade`; the
  canvas of a PNG made, and of one refused with `notMade`, is left of 0
  by 0 pixels;
- a resize of the element draws the plot again at its new size, and
  after `destroy` the element is empty;
- on the scatter, the page's second plot from stage 4, a move of the
  mouse over the overlay calls `pointer.move` with the position in the
  pixels of the frame, a tap calls it too, and a mouse that leaves the
  frame calls `pointer.leave` with the element it went onto
  (`scatter.md`, "How it is verified"); and
  its PNG holds the legend that `drawExport` draws, as its SVG does,
  read from the pixels of the PNG (`scatter.md`).

**The dependencies it adds**, all approved by the owner on 24 September
2026 (`docs/technology.md`, section 2), and in `package.json` at these
versions since stage 3: `d3-selection` 3.0.0, `d3-scale` 4.0.2 and
`d3-axis` 3.0.0, with `@types/d3-selection` 3.0.12, `@types/d3-scale`
4.0.9 and `@types/d3-axis` 3.0.6 for development; and `jsdom` 30.1.1 for
development, with the project `charts` of `vite.config.ts`
(`testing.md`, "Vitest"). The versions are those of `npm view` on 26
September 2026.

## What this spec asks of other documents

Stage 5, 30 September 2026: nothing more; the heatmap, the line plot
and the histograms of the spectrum use the additions above. On 1
October 2026 `docs/specs/charts/histogram.md` was given the 16 pixels
that a label on two lines adds to its bottom margin. On 1 October
2026 the size of the element was added to what the definition's `margin`
is given, for the owner's decision that the heatmap makes its margins
without the names it does not write (`docs/specs/stage-5-open-points.md`,
"Decided by the owner on 1 October 2026: the distances, the heatmap and
what the analyses share").

Written into those documents with this spec, on 26 September 2026:

- `.claude/skills/coding/charts.md`: that every 2D plot makes its handle
  with `createPlot2d`, and that the skeleton, the size and the export
  are made there.
- `docs/architecture.md`, section 9: `plot2d.ts` in the list of the
  modules of `src/charts`.
- `.claude/skills/coding/testing.md`, "Against the built site": the page
  `e2e/plots.html`, built for the tests alone; `vite.config.ts` and the
  script `test:e2e`, which are code, come with the plan.

## Not in this spec

- What the histogram draws, its margins, its legend and its rows:
  `docs/specs/charts/histogram.md`.
- The zoom and a grid: with the first plot that has them, the Manhattan
  plot in stage 7. The heatmap and the line plot of stage 5 have
  neither. What the scatter does with the pointer, its nearest
  point and its tooltip: `scatter.md`.
- The buttons of the export, their words and the line of the versions
  beside them: stage 6, with the report.
- The 3D plot: `docs/specs/charts/pca3d.md`, in stage 4.
