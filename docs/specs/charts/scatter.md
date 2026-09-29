# The scatter plot of the PCA

Written on 27 September 2026, for stage 4 of `docs/build-order.md`, the
Individuals step and the PCA; revised the same day to agree with the
specs written beside it: the description and the labels in the words of
`docs/specs/analyses/pca.md`, which columns colour by groups, and
`.claude/skills/coding/charts.md` and `testing.md` revised for it;
reviewed the same day, and revised for the review: the tooltip that can
be dismissed and hovered, its numbers, the marks inside the frame, the
legend's faded entries and its background in the file; and again after
its last review: the tooltip placed where the pointer can reach it, a
highlight beyond the names taken as none, a group that keeps its mark
when it has no point, the legend a vertical list, the numbers of the
table as `pca.md` writes them, and the round joins kept in the exported
file; and when the specs of stage 4 were made to agree, the legend over
the plot as its **Open 1**; and with the owner's answer of 27 September
2026 to that point, to judge it on the running screen; and on 28
September 2026 for the owner's decision that the PCA opens on the 3D
view, the scatter one button away and drawn in its place when the
browser cannot draw 3D; approved by the owner on 28 September 2026. There is no
code of it yet; the base it is drawn on, `src/charts/plot2d.ts`, and the
histogram exist from stage 3. This spec gives the function of
`src/charts/scatter.ts` that draws the individuals on two principal
components, each a mark whose colour and shape say its population, or
coloured by the values of a column of the metadata file; and the pieces
the 3D plot of the PCA shares with it, the marks of the groups, the
legend and the point under the pointer, in `src/charts/marks.ts`,
`legend.ts` and `hover.ts`. It is drawn on the base of the 2D plots,
`docs/specs/charts/plot2d.md`, which gives it its SVG and frame, its
size, its axes, its text for a screen reader, its handle and its export,
and which this spec revises for the pointer and the legend of the
exported file (below, "What this spec asks of other documents"). It
develops the row `src/charts/` of section 9 of `docs/architecture.md`
and its section 7, and depends on `.claude/skills/coding/charts.md`,
`css.md` and `testing.md`. The PCA whose result it draws, its options
and its panel are `docs/specs/analyses/pca.md`; the 3D plot is
`docs/specs/charts/pca3d.md`.

The words of the web this spec needs, as it uses them. **SVG** is the
format of drawings made of lines and shapes that the browser draws
inside the page, and a `<path>` is one of its elements, any number of
shapes given by a text of drawing commands. The **base** is
`src/charts/plot2d.ts`, the piece every 2D plot is drawn on
(`plot2d.md`), and a **handle** the object a plot's function returns,
through which the screen gives the plot new data, removes it and
exports it. **React** is the library that draws the screens from the
state of the project, and **React Aria** the library of controls built
on it that the screens use, which gives each control the keys and the
names a screen reader expects. A **screen reader** is the program that
reads the page aloud to a user who cannot see it, and the **focus** the
control the keyboard acts on, which the Tab key moves from one control
to the next. **WCAG 2.2** is the standard of accessibility the
applications meet, at its level AA, and each of its **success
criteria**, numbered as 1.4.1 is, one thing it asks. **jsdom** is the
imitation of a page, with no layout and no drawing, in which the unit
tests run under node.

The words of this spec: a **group** is one of the values that colour
the points, a population of the grouping or a value of a column the
user chose; a point with no value there is in **no group**, which the
legend names "No population" or "No value". A point is
**highlighted** when the user picked its group in the legend, and the
others are then **faded**, drawn pale. The **legend** is the list of
the groups over the top right corner of the plot, which the screen
draws; the **tooltip** is
the small box of text that the plot shows next to the point under the
pointer.

## What it does

### What the user sees

One mark per individual, at its projection on the two components of the
axes, `axes[0]` across and `axes[1]` up (`pca.md`, the options),
PC1 and PC2 by default. The labels of the axes say the component and the
share of the variance it explains, "PC1 (3.55%)", which the screen
writes from `explainedVariancePercent` of the result. The marks of one
population share a colour and a shape. Over the top right corner of the
frame, the legend lists the populations with their marks and the number
of individuals in each, "P1 (48)", and "No population (12)" last when
some individuals have none. Pressing a population in the legend
highlights it: its points are drawn on top and the others faded. A
second press on the same population clears the highlight, and every
point is drawn as before; a press on another population highlights that
one instead. Moving the
pointer over a point shows its tooltip, the name of the individual, its
population and its two coordinates.

When the user colours the points by a column of numbers, a trait or an
age, each point is coloured by its value along viridis, a scale of
colours from dark purple to yellow that stays in order to the eye, in
grey and to the common kinds of colour blindness; the legend is then a
bar of that scale with its smallest and largest value, and no press
highlights anything.

### The marks of the groups

The rule of `charts.md`, "Accessibility", which the 3D plot follows too,
so that a population has the same mark in both:

- group `i` has the colour `i % 7`, of the seven colours of Okabe and
  Ito, `--chart-cat-1` to `--chart-cat-7`, and the shape
  `(i + Math.floor(i / 7)) % 7` of the seven filled symbols of
  `d3-shape`, `symbolsFill`: circle, cross, diamond, square, star,
  triangle and wye. The first seven groups differ in colour and in
  shape, and the first 49 have 49 different marks; group 49 has the mark
  of group 0 again, and the legend and the tooltip still name each.
- every mark has an outline of 1 pixel in `--chart-axis`, since three of
  the seven colours are below 3:1 on the light background, orange,
  sky blue and yellow, and the outline gives the edge of each mark the
  contrast the fill does not (`css.md`, "Contrast and colour"). The
  outline has round joins, `stroke-linejoin: round`: with the default
  joins, mitred, the outline of a sharp corner runs past the corner by
  half its width divided by the sine of half the angle, and at the tips
  of the star, of 36°, it reaches 9.2 pixels from the centre; with round
  joins no mark reaches beyond 8.05 pixels, the tips of the star, 7.55,
  and half the outline.
- a point in no group is a ring, a circle with no fill outlined in
  `--chart-axis`, since a mark with no colour of its own is what "no
  value" looks like, and the ring differs in shape from the seven filled
  symbols, so no colour needs to be added to the tokens. Its points are
  drawn first, under every group.
- a mark has an area of 64 square pixels, `SYMBOL_AREA`, a circle 9
  pixels across, meanwhile, refined in the running application: the
  cross, the narrowest of the seven, then has arms 3.6 pixels wide, of
  which the outline, drawn on the edge, leaves 2.6 pixels of colour.
  The walking skeleton, stage 2 of `docs/build-order.md`, the first
  application that went through every part once, measured circles of 16 square pixels; at 16, the
  arms of the cross are 1.8 pixels wide and the outline leaves 0.8 of
  colour.

The index of a group is its place in the names the screen gives, so a
population keeps its mark as long as the screen gives the populations in
the same order: in the 2D and the 3D plot, after a filter, after an undo.
The PCA gives the names of every group of the metadata file, in the
order each first appears, those with no point among them, so that a
filter of individuals that leaves a population with no individual does
not give its mark to the next one (`pca.md`, "The colours"); such a
group has no path and no entry in the legend.

### The points: one path per group, drawn by a loop

The points of one group are one SVG `<path>`, whose drawing commands a
plain loop over the typed arrays writes, each point its symbol at its
position, as `charts.md`, "Drawing", has it: an element per point would
make 9,381 elements and objects for the largest PCA, where one path per
group makes a few. `drawSymbolAt` of `src/charts/marks.ts` draws a
`d3-shape` symbol into a `d3-path` through a context that adds the
offset of the point.

The numbers of the path are rounded to one decimal, a tenth of a pixel,
with `pathRound(1)` of `d3-path` 3.1.0. The walking skeleton measured
it: an SVG of 50,000 points is 3.1 MB so and 9.7 MB with every digit,
and its drawing up to 26% slower in WebKit and 50% slower in Chromium
(`docs/plans/walking-skeleton.report.md`, "The points an SVG plot can
hold", measured on 26 September 2026 on the owner's Apple M5 Pro). The
report recommended both, the 50,000 points at most and the one decimal;
the owner took its recommendations on 26 September 2026, and its summary
named the 50,000 alone, so the one decimal is written here as this
spec's decision, on the report's numbers. The option not taken, every
digit, draws faster and writes an exported file three times larger, and
a tenth of a pixel is below what a screen or a printer at 300 dpi shows.

A plot is given at most `MAX_SVG_POINTS` points, 50,000, a constant of
`src/charts/limits.ts`, and more is a defect of the caller. The PCA has
at most 9,381 points, since popnei refuses more individuals
(`docs/architecture.md`, section 11), and the walking skeleton drew
10,000 points, rounded to one decimal, in 19 ms in WebKit and 16 ms in
Chromium, with circles of 16 square pixels, where Chromium's time leaves
out the turning of the paths into pixels, which it does on other
threads. The marks here are four times that area, so the time of this
plot is measured again, on 9,381 points, when it is built (below, "How
it is verified").

A point whose coordinate is not finite, NaN or an infinity, is not drawn
and is not counted in the legend, and the screen says how many there
are (`charts.md`, "The contract of a plot"); popnei's PCA gives none, and
the rule is there for the PCoA and any later use.

### The colours: groups, or the values of a column

The points are coloured one of two ways, which the data say
(`PointColours`, below). The screen chooses which from the type of the
column the user colours by, as the user set it in the Individuals step
(`pca.md`, "The colours"): the populations and a categorical or binary
column give groups; a continuous column gives values.

**Groups.** Each point has the index of its group, or `NO_GROUP` when it
has none, and the names of the groups. The marks are those above.

**Values.** Each point has a number, NaN when it has none. The colour of
a value is viridis, `interpolateViridis` of `d3-scale-chromatic`, at its
place between the smallest and the largest finite value, in 256 steps,
which are the 256 colours that `interpolateViridis` holds, so nothing is
lost by the steps. The points of one step are one path, 256 paths at
most, all circles, each with an outline in `--chart-axis`, since the
yellow end of viridis is below 3:1 on the light background. The colour of
each step is written on its path as its `fill` attribute: viridis is
the same in both themes and in the file, so it is the one colour a plot
writes that is not a token. A point with no value is a ring, as a point
in no group is. When every finite value is the same, every point takes
the middle of the scale, step 128, and the bar of the legend shows that
one value.

### The highlighted group

The data hold the group the legend highlights, or none. When a group is
highlighted, the paths of the other groups have the class
`chart-points-faded`, at an opacity of 0.25 meanwhile, and the path of
the highlighted group is drawn last, over them. The no-group can be
highlighted too, to see where the individuals with no population lie. A
faded mark is below the 3:1 of a mark on purpose: it is the context of
the highlighted group, and its group is still in the legend and the
table. The highlight is state of the screen and not of the project
(`docs/architecture.md`, section 7): it is not saved, is not a step of
Undo, and is kept by the screen when the user goes from the 2D plot to
the 3D one and back (`pca.md`). A colouring by values has no highlight.

### The axes: one scale for both

The two components are drawn at the same scale, as many pixels for a
unit of PC1 as for a unit of PC2, so that a distance on the plot is the
same distance whichever way it points, and a component that explains
little variance looks narrow. With a scale for each axis, each filling
its side of the frame, PC2 at 3% of the variance would be spread as wide
as PC1 at 30%, and clusters that differ only along PC1 would look as
far apart along PC2; that is the option not taken.

The scale is the largest at which every point fits in the frame with 10
pixels to spare on each side, so that no mark is cut by its edge, since
a mark reaches 8.05 pixels from its point (above, "The marks of the
groups"):
`k = min((innerWidth − 20) / spanX, (innerHeight − 20) / spanY)` pixels
per unit, where each span is the range of the finite values of that
axis. Each axis then runs over `innerWidth / k` or `innerHeight / k`
units, centred on the middle of its data. So the axis along which the
data are narrower for the shape of the frame runs past its data at both
ends, and an empty band lies along two opposite sides of the frame, the
ticks running into it: for PC1 spread over 2 units and PC2 over 1, in a
frame of 400 by 300 pixels, `k` is 190, and bands of 55 pixels lie
above and below the points. The option of shrinking the frame to the
shape of the data would leave the same empty room outside the axes,
which then would not start at the corner of the plot. When a span is 0,
every point at the same place along that axis, the other axis sets `k`;
when both are 0, a single point or every point at one place, both spans
are taken as 2, one unit either side of the point, which is then at the
centre of the frame.

The scales are not made round by `nice`, which would change the scale of
one axis and not of the other. The ticks are the base's, one about every
80 pixels across and every 40 up (`plot2d.md`, "The axes"), so their step
can differ between the axes while the scale does not.

### The legend, drawn by the screen

The legend is HTML beside the SVG, drawn by the screen with React and
placed over the top right corner of the frame, and not part of the SVG.
Three reasons:

- **The keyboard and the screen reader.** The SVG has `role="img"`,
  which makes everything inside it one image to a screen reader, so a
  button inside it cannot be reached or named. The buttons have to be
  outside it.
- **One legend for the 2D and the 3D plot.** The 3D plot has no SVG; a
  legend of the screen stays in place when the user switches between the
  two, with its highlight.
- **The widgets of the screens are React Aria's**, the library of
  accessible widgets the applications use (`docs/technology.md`). Its
  `ToggleButtonGroup` with `selectionMode="single"` and
  `orientation="vertical"`, since its entries are a column, is what the
  legend needs: one stop of the Tab key for the whole list, the Up and
  Down arrow keys to move along it, Space or Enter to press, and a press on the pressed
  entry to clear it, as the owner's widget does
  (https://github.com/JoseBlanca/any_scatter3d, which the owner named on
  27 September 2026 for the look and the interaction). In that mode
  React Aria 1.21.1 gives the group the role `radiogroup` and each entry
  the role `radio` (`useToggleButtonGroup`, read in its code on 27
  September 2026), so a screen reader says "P1 (48), radio button, 1 of
  4". A plot that drew its own buttons with D3 would have to write that
  keyboard handling again.

The plots know nothing of React (`docs/architecture.md`, section 7), so
what the legend shows comes from the charts as data and marks:
`legendOf(colours, coordinates)` gives the entries of the points drawn, each group with its name, its
number of points and whether it is faded, the no-group last and a group
with no point left out; `symbolPath(group)` gives the drawing of its
mark, which the screen puts in a small SVG of its own, hidden from a
screen reader, with the class of its colour. The screen places the
legend with its corner at the corner of the frame, `SCATTER_MARGIN.top`
pixels from the top of the plot's element and `SCATTER_MARGIN.right`
from its right, in 2D and in 3D alike (`pca3d.md`). An entry that is
faded fades its mark alone, at the opacity of the faded points: its
name keeps the contrast of every text, 4.5:1 (WCAG 2.2, success
criterion 1.4.3), since the user reads it to find the group to press
next. Its look, a background of the surface so that the points under it
do not show through its text, a height beyond which it scrolls, and
whether it can be folded away, are left for the running application.

The legend in the exported file is drawn by the plot, since the file has
no screen beside it (below, "The export").

### The point under the pointer

A transparent rectangle over the frame, `chart-overlay`, which the base
makes for a plot that asks for it (`plot2d.md`, revised with this spec),
takes the movements of the pointer, since the marks are paths of many
points and a path cannot say which of its points is under the pointer.
The base gives the plot the position of the pointer in the pixels of
the frame; the plot finds the nearest point:

- **The nearest point within 10 pixels**, or none, by a loop over the
  pixel positions of the drawn points, kept from the last draw. In node
  26.8.2 on the owner's Apple M5 Pro, a loop over 50,000 points took
  0.027 ms at the median and 0.079 ms at the 99th percentile of 1,000
  calls, on 27 September 2026; a movement of the pointer comes at most
  once a frame, 16 ms. `charts.md` had a Delaunay triangulation of
  `d3-delaunay` for this, which finds the point in fewer steps but is a
  module of D3 and two packages more, `delaunator` and
  `robust-predicates`, for a search that the loop does well inside a
  frame; not taken. The 3D plot finds its point by the same loop over
  its projected points, with their depth: among the points whose mark
  covers the pointer, within `MARK_RADIUS` pixels, the one nearest the
  camera (`pca3d.md`). Of points at the same distance, the first in the
  order of the data is taken. A faded point can be under the pointer too:
  fading draws it pale, and it is still a point. While a point's tooltip
  is shown, that point stays the one under the pointer as long as the
  pointer is within 10 pixels of it, even where another point is nearer,
  as the next bullets have the tooltip stay; the nearest point is looked
  for again once the pointer is beyond them.
- **The tooltip** is one HTML `<div>`, `chart-tooltip`, that the plot
  adds to its element on the first hover and removes in `destroy`,
  placed with its nearest corner 6 pixels right of and 6 pixels below
  the point, and on its left or above it where it would leave the
  element; where it fits on neither side, as in a plot narrower than
  twice the tooltip, it is placed against the left or the top edge of the
  element, and may then cover the mark it names. That corner is 8.5
  pixels from the point: inside the 10 pixels within which the point
  stays under the pointer, so that a pointer that goes from the point
  straight to the tooltip never leaves them and finds the tooltip still
  shown. That corner is square, the other three rounded as the theme has
  them: rounded by 4 pixels, its edge on the line from the point would be
  10.1 pixels from it. Both were found by the flows on 28 September 2026,
  in the clusters of the page of the plots: with the corner at 7 pixels,
  9.9 from the point, or rounded, the browser, which finds the element
  under the pointer at a whole pixel, gave the pointer to the overlay a
  step before the tooltip, beyond the 10 pixels, and it showed the
  tooltip of the next point. And every place of the tooltip is at least
  6 pixels right of and 6 below the point, so 8.5 pixels from it at
  least, beyond the 8.05 a mark reaches: the tooltip covers no part of
  the mark it names. The option not taken, the tooltip further away and a
  wait of some 300 ms before it is hidden, adds a timer to every
  movement of the pointer and a wait to every test of it. It is HTML and not SVG, since it wraps text and is
  not part of the exported plot. Its lines are the name of the
  individual; the name of its group or its value, after the title of
  the colouring, "Population: P2", "No population", "Height: 1.72",
  "Year: 2019"; and the coordinates, "PC1 −0.0231, PC2 0.0104". A
  coordinate is written to three significant digits,
  `Intl.NumberFormat("en-US", { maximumSignificantDigits: 3 })`, since
  its digits beyond those mean nothing on a plot; a value of a column is
  written as `tableNumber` of `numbers.ts` gives it (`plot2d.md`), up to 12 significant
  digits, since three would write a year of 2019 as "2,020". A negative
  number is written with the minus sign, U+2212, "−0.0231", as the
  labels of the ticks of `d3-axis` write it, where `Intl.NumberFormat`
  writes the hyphen, U+002D; the plot replaces the one with the other.
  Its text is set with `textContent` and never as markup, since the
  names come from the user's files and a name holding `<img onerror=…>`
  would run in the page (`charts.md`, "Hover and tooltips"). It has
  `aria-hidden="true"`: the table beside the plot gives the same numbers
  to a screen reader and a keyboard.
- **The tooltip stays while it is read, and goes when the user wants
  it gone**, as WCAG 2.2, success criterion 1.4.13, asks of content
  that appears on hover. It stays while the pointer is within 10 pixels
  of its point, and while the pointer is on the tooltip itself, which
  takes the pointer for that, so that a user who reads with the screen
  enlarged can move onto it; the pointer that leaves the tooltip hides
  it, or shows the tooltip of the point it lands near: onto the overlay,
  the plot finds the point under it; onto anything else, an axis, the
  margin or the page outside the plot, the tooltip hides itself and
  tells the plot, which calls `onHover(null)`. The tooltip is
  not inside the overlay, so a pointer that goes onto it leaves the
  overlay, and the base gives `pointer.leave` the element the pointer
  went onto, the `relatedTarget` of the browser's event (`plot2d.md`,
  revised): a leave onto the tooltip, which `holds` of the tooltip
  tells, is not a leave of the plot, and the tooltip stays. It goes when a
  draw makes it stale, below. And the Escape key hides it, with the mark
  of the point, and calls `onHover(null)`; it stays hidden until the
  pointer is near another point, or leaves every point and comes back.
  Escape is listened for on the document, from the moment a tooltip is
  shown until it is hidden, and the listener acts on Escape alone and
  neither stops the key nor prevents what it does elsewhere, so a field
  or a dialog that has the focus gets it as before. A listener on the
  plot's element would hear no key, since nothing in the plot takes the
  focus and the focus is elsewhere while the pointer is over it.
  `createTooltip` of `hover.ts` does all of this, for the scatter and
  the 3D plot alike.
- **The mark of the point**, a ring of 2 pixels around it in
  `--color-text`, one `path.chart-hover` in `chart-annotations`, drawn
  over the marks. The export leaves it out, as it leaves out the overlay.
- **`events.onHover`** is called with the index of the point, or with
  `null`, each time the point under the pointer changes and never twice
  with the same one, so that a screen can mark the row of the table.
- **A mouse or a pen that leaves the frame**, but for the tooltip,
  hides the tooltip and calls `onHover(null)`. **A tap** on a touch
  screen shows the tooltip of the nearest point, and a tap on the plot
  away from every point hides it; a tap outside the plot leaves it shown
  until the next tap on the plot, since the plot listens to the pointer
  on its own element and not on the page.
- **A draw hides the tooltip**, after `update` or a resize, since the
  point under the pointer may have moved, and calls `onHover(null)` when
  a point was under it; the next movement of the pointer finds the point
  again.

## The TypeScript interface

What the scatter and the 3D plot share: how the points are coloured,
and the mark of each group. `highlighted` and the texts are the
screen's.

```ts
// src/charts/marks.ts
/** The group of a point with no population, or no value in the column. */
export const NO_GROUP = 0xffff;

/** How the points are coloured: by their group, or by a number. */
export type PointColours = GroupColours | ValueColours;

export interface GroupColours {
  readonly kind: "groups";
  /** The title of the legend and of the tooltip: "Population", or the column's name. */
  readonly title: string;
  /** The index of each point's group in `names`, or NO_GROUP. */
  readonly group: Uint16Array;
  /** The names of the groups; the index of a group gives its mark. */
  readonly names: readonly string[];
  /** The name of the points of NO_GROUP: "No population", "No value". */
  readonly noneName: string;
  /** The group the legend highlights, an index of `names` or NO_GROUP; null for none, and a whole number at or above names.length is none too. */
  readonly highlighted: number | null;
}

export interface ValueColours {
  readonly kind: "values";
  /** The title of the legend and of the tooltip: the column's name. */
  readonly title: string;
  /** The value of each point; NaN for none. */
  readonly values: Float64Array;
  /** The name of the points with no value: "No value". */
  readonly noneName: string;
}

/** The mark of group `group`: its colour, 0 to 6, and its symbol, 0 to 6, of symbolsFill. */
export function groupMark(group: number): { readonly colour: number; readonly symbol: number };

/**
 * The drawing of the mark of `group`, centred on 0,0, of SYMBOL_AREA,
 * as the `d` of an SVG path; the ring for NO_GROUP. For the legend.
 */
export function symbolPath(group: number): string;

/** The step of viridis, 0 to 255, of `value` between `min` and `max`; 128 when they are equal. */
export function viridisStep(value: number, min: number, max: number): number;

/** The colour of a step of viridis, "#440154" for 0 and "#fde725" for 255. */
export function viridisColour(step: number): string;

/**
 * The group drawn highlighted: `highlighted`, or null when it is null or
 * a whole number at or above names.length that is not NO_GROUP.
 */
export function highlightedGroup(colours: GroupColours): number | null;

/**
 * Throws an Error, a defect of the caller, for the colours of `numPoints`
 * points that the plots refuse (below, the defects of `createScatter`).
 */
export function checkPointColours(colours: PointColours, numPoints: number): void;

/** The area of a mark in square pixels. */
export const SYMBOL_AREA = 64;

/** The radius of a circle of SYMBOL_AREA, 4.51 pixels: where a mark covers the pointer, for the 3D plot. */
export const MARK_RADIUS = Math.sqrt(SYMBOL_AREA / Math.PI);
```

`symbolPath` and `drawSymbolAt`, the loop's function, draw the same
`d3-shape` symbols, so the legend and the plot cannot differ; the 3D plot
draws them on a canvas with the same symbol types.

What the legend shows, as data, for the screen's legend and for the one
of the exported file:

```ts
// src/charts/legend.ts
export interface LegendGroup {
  /** The index of the group in `names`, or NO_GROUP; its mark is symbolPath(group). */
  readonly group: number;
  readonly name: string;
  /** How many points of the group are drawn, those with finite coordinates. */
  readonly count: number;
  /** True when another group is highlighted. */
  readonly faded: boolean;
}

export type Legend =
  | {
      readonly kind: "groups";
      readonly title: string;
      /** The groups in the order of `names`, those with no point left out, then NO_GROUP when it has points. */
      readonly entries: readonly LegendGroup[];
    }
  | {
      readonly kind: "values";
      readonly title: string;
      /** The smallest and largest finite value of the points drawn; null when none has one. */
      readonly min: number | null;
      readonly max: number | null;
      readonly noneName: string;
      /** How many points drawn have no value. */
      readonly noneCount: number;
    };

/**
 * The legend of the points drawn, those whose every coordinate is
 * finite: [x, y] for the scatter, [x, y, z] for the 3D plot. What the
 * screen shows over the plot and the export writes in the file.
 */
export function legendOf(
  colours: PointColours,
  coordinates: readonly Float64Array[],
): Legend;

/**
 * Draws `legend` into `group` of an exported SVG, its rows ending at
 * `right` and starting at `top`, in SVG pixels, no row below `bottom`,
 * and its background no wider than from `left` to `right`, the edges of
 * the frame (below, "The export"). For the scatter and the 3D plot.
 */
export function drawLegendSvg(
  group: Selection<SVGGElement, unknown, null, undefined>,
  legend: Legend,
  left: number,
  right: number,
  top: number,
  bottom: number,
): void;
```

`left` was added on 28 September 2026, when the plot was built: the
background of the legend is at most the width of the frame (below, "The
export"), and without the left edge of the frame the function cannot
cap it.

The point under the pointer and its tooltip, shared with the 3D plot:

```ts
// src/charts/hover.ts
/**
 * The index of the point nearest to (px, py) within `radius` pixels, or
 * null. `positions` holds x and y in pixels, two per point, NaN for a
 * point not drawn. With `depth`, one per point, from −1 the nearest the
 * camera: among the points within MARK_RADIUS of (px, py), the one
 * nearest the camera; when none is, the nearest within `radius`
 * (pca3d.md).
 */
export function nearestPoint(
  positions: Float32Array,
  px: number,
  py: number,
  radius: number,
  depth?: Float32Array,
): number | null;

/**
 * The lines of the tooltip of point `index`, with its coordinates by
 * name, [["PC1", -0.02314], ["PC2", 0.01041]], written "PC1 −0.0231,
 * PC2 0.0104", with the minus sign U+2212.
 */
export function tooltipLines(
  name: string,
  colours: PointColours,
  index: number,
  coordinates: readonly (readonly [string, number])[],
): string[];

/**
 * How the user hid a tooltip: by Escape, or by a mouse or a pen that
 * left the plot's element from the tooltip itself.
 */
export type TooltipDismissal = "escape" | "leave";

/**
 * The tooltip of a plot, a <div> in `element`, made at the first `show`:
 * kept while the pointer is on it; hidden by Escape, which then calls
 * `onDismiss("escape")`, and by a mouse or a pen that leaves it onto
 * anything but the element that takes the pointer for the plot, for
 * which `takesPointer` is true, which calls `onDismiss("leave")`, as "The
 * point under the pointer" says.
 */
export interface Tooltip {
  /** Shows `lines` beside the point at (x, y), in the pixels of `element`. */
  show(lines: readonly string[], x: number, y: number): void;
  hide(): void;
  /** True when `target` is the tooltip or inside it: a leave of the plot onto it is none. */
  holds(target: EventTarget | null): boolean;
  /** Removes the <div> and the listener of Escape; safe to call twice. */
  destroy(): void;
}

export function createTooltip(
  element: HTMLElement,
  onDismiss: (by: TooltipDismissal) => void,
  /** True for the element that takes the pointer for the plot: the overlay of the scatter, the canvas of the 3D plot. */
  takesPointer: (target: EventTarget | null) => boolean,
): Tooltip;
```

`TooltipDismissal` was added on 28 September 2026, when the scatter was
first tried in a browser: with one call for both, a pointer that left
the plot from the tooltip and came back to the same point found the
tooltip still hidden, as if Escape had hidden it, where "The point under
the pointer" keeps a tooltip hidden that way only after Escape. After a
leave, the pointer has left every point, and the tooltip shows again
when it comes back. `takesPointer` was added and `hovered` taken out the
same day, after the review of the plot: a pointer that left the tooltip
onto an axis or the margin, where neither the overlay nor the element
hears a leave, found the tooltip still shown far from its point, and
nothing read `hovered`. `highlightedGroup` and `checkPointColours`,
which the 3D plot uses, were written here then too.

The scatter. Its texts are the screen's, with those of `PlotText`:
`xLabel` "PC1 (3.55%)" and `yLabel` "PC2 (3.40%)".

```ts
// src/charts/scatter.ts
export interface ScatterData extends PlotText {
  /** The coordinate of each point across and up; NaN or an infinity is not drawn. */
  readonly x: Float64Array;
  readonly y: Float64Array;
  /** The short names of the two axes, for the tooltip and the table: "PC1", "PC2". */
  readonly xName: string;
  readonly yName: string;
  /** The name of each point, an individual, for the tooltip. */
  readonly pointNames: readonly string[];
  readonly colours: PointColours;
}

export interface ScatterEvents {
  /** The point under the pointer, by its index, or null; called when it changes. */
  onHover?(point: number | null): void;
}

export const createScatter: Chart<ScatterData, ScatterEvents>;

/** The margins of the scatter, in CSS pixels; the screen places the legend by them. */
export const SCATTER_MARGIN: Margin; // top 12, right 16, bottom 44, left 60

/** The two scales, of the same pixels per unit, for a frame of this size. */
export function scatterScales(
  data: ScatterData,
  innerWidth: number,
  innerHeight: number,
): { readonly x: ScaleLinear<number, number>; readonly y: ScaleLinear<number, number> };
```

`createScatter`, `update` and `legendOf` throw an
`Error`, a defect of the caller, from the check of the data, when `x`,
`y`, `pointNames` and the `group` or the `values` of the colours are not
all of one length; when there are more than `MAX_SVG_POINTS` points,
50,000; when a group index is neither below the number of names nor
`NO_GROUP`; when `highlighted` is neither null nor a whole number from
0; and when there are more than `MAX_POINT_GROUPS`
names, 1,000, a constant of `src/charts/limits.ts`: each group is a path
and an entry of the legend, and a thousand are still drawn, while more
is a column of names, which the screen does not offer for colouring
(`pca.md`). A highlighted group with no point drawn is not a defect:
every point is then faded. A `highlighted` at or above the number of
names, and not `NO_GROUP`, is drawn as no highlight, and not refused:
the highlight is state of the screen, kept apart from the names it
indexes, and a screen that gave it for one draw after the names changed
would otherwise break the plot, where this rule costs one draw with no
highlight. The PCA's panel gives it only with the colouring it was
pressed in (`pca.md`, "What it shows"), so it does not meet this.

`createScatter` makes its definition for the base in each call, since
the definition holds the state of one plot, the pixel positions of the
last draw, the tooltip and the events, and wraps the base's handle so
that `destroy` also removes the tooltip (`plot2d.md`, revised).

## The SVG it builds

The base makes the skeleton, with the class `chart chart-scatter` and the
overlay, `rect.chart-overlay`, the last child of `chart-frame`
(`plot2d.md`). The scatter draws, in `chart-marks`, which the base clips
to the frame:

- for groups: one `path.chart-points` per group with a point drawn, with
  the class of its colour, `chart-colour-‹0 to 6›`, keyed by the index of
  the group; the path of the no-group, `path.chart-points
  chart-points-none`, first, and the highlighted group's last; each
  path of a group that is not highlighted, while another is, with
  `chart-points-faded`;
- for values: one `path.chart-points chart-points-value` per step of
  viridis with a point, keyed by the step, with its `fill` attribute,
  and the ring path of the points with no value first.

In `chart-annotations`, `path.chart-hover` while a point is under the
pointer. The group `chart-legend` of the SVG stays empty on the screen;
the export draws into it (below).

```css
.chart-points         { stroke: var(--chart-axis); stroke-width: 1px; stroke-linejoin: round; }
.chart-colour-0       { fill: var(--chart-cat-1); }   /* … to .chart-colour-6, --chart-cat-7 */
.chart-points-none    { fill: none; }
.chart-points-faded   { opacity: 0.25; }
.chart-hover          { fill: none; stroke: var(--color-text); stroke-width: 2px; }
.chart-overlay        { fill: none; pointer-events: all; }
.chart-tooltip        { position: absolute; … }   /* takes the pointer, 1.4.13 */
.chart-legend-background { fill: var(--color-background); fill-opacity: 0.85; stroke: none; }
```

The colours of the groups are the same in both themes (`css.md`, "Light
and dark"), and the outline, the ring and the mark under the pointer
follow the theme through their tokens with no redraw. The tooltip takes
the surface and the text of the theme.

## The numbers without the picture

The base writes the text alternative and gives the rule of the table
(`plot2d.md`, "The text alternative and the table of the numbers"). What
the scatter adds:

- **The description**, which the screen writes: the individuals drawn,
  the two components and the variance each explains, and where each
  group lies, or the range of the values and how many have none, in the
  words of `pca.md`, "Accessibility", `pcaDescription`: "Principal
  components of 200 individuals of panel.nei, PC1, 3.55% of the
  variance, across, and PC2, 3.40%, up. Coloured by population: p0, 48
  individuals, centred at …". It describes the 2D plot; the 3D view,
  which the PCA opens on since the owner's decision of 28 September
  2026, has a description of its own (`pca.md`, "Accessibility"; "The
  PCA opens on the 3D view" in `docs/specs/stage-4-open-points.md`).
  The scatter is also what the panel draws in the place of the 3D view
  when the browser cannot draw it, with the same description.
- **A table of the individuals, drawn by the screen**, one row per
  individual with its name, its group or value and its coordinates on
  every component the result keeps, from `pcaRows` of core (`pca.md`),
  the coordinates written to four decimals and the values of a column
  as `tableNumber` gives them, as `pca.md` decides for the panel, and
  the plot is linked to it. The scatter gives no rows of its own, where `plot2d.md` has each
  plot give them: the table holds all 10 components and the plot two,
  and the panel makes the rows and the data of the plot from the same
  result and the same colours, so that the two never disagree.
  The table is reachable by the keyboard and read by a screen reader;
  the marks are not, since 9,381 stops of the Tab key would be of use to
  no one (`charts.md`, "Accessibility").
- **The groups are told apart by more than colour**: by the shape of the
  mark, by the legend with the names and counts, by the tooltip and by
  the table (WCAG 2.2, success criterion 1.4.1).

## The export

The handle's `toSVG` and `toPNG` are the base's (`plot2d.md`, "The
export"), and no screen offers them until stage 6. The file holds the
plot as it is on the screen, the highlight with it, with no overlay, no
mark of a point under the pointer and no tooltip; and it holds the
legend, which on the screen is the screen's, drawn by the plot into the
`chart-legend` group of the copy that `toSVG` writes, through the hook
of the base for it, `drawExport` (`plot2d.md`, revised). The legend of
the file is `legendOf` of the data, drawn by `drawLegendSvg` as the
screen draws it:

- at the top right of the frame, over the points, as on the screen, one
  row of 16 pixels per entry, its text ending before its mark and its
  mark at the right edge of the frame, so that it needs no measure of
  the text (`histogram.md`, "The SVG it builds"), with the title first;
- behind the rows, a rectangle of the background of the plot at an
  opacity of 0.85, `rect.chart-legend-background`, so that the points
  under the legend do not cross its text, as the background of the
  screen's legend keeps them from it; its width is reckoned from the
  longest row, 7.2 pixels per character, 0.6 of the 12 pixels of the
  text, with the mark and 4 pixels on each side, since nothing measures
  text (`plot2d.md`, "The SVG and its frame"), and at most the width of
  the frame; a row of wide letters may pass its left edge by a few
  pixels, and is still read over the pale points;
- the mark of a faded entry with the class `chart-legend-faded`, at the
  opacity of the faded points, and its text as the others;
- for values, a bar of 32 bands of viridis, 96 pixels high, the largest
  value at its top and the smallest at its bottom, each band a
  rectangle with its `fill`, which needs no gradient and so no id of its
  own; then the ring and "No value (3)" when there are some. When every
  value is the same, the bar is one band of step 128, 16 pixels high,
  the colour of every point, with that value at its middle. In a frame
  too low for the bar, it is shorter, so that no row passes the bottom
  of the frame, down to 32 pixels, one per band; below that the bar and
  its values are left out, and a row that does not fit, "No value (3)"
  or the title, is left out too;
- when the rows would pass the bottom of the frame, the last row that
  fits says "and 12 more", since the file cannot scroll; the table,
  downloaded beside it as CSV, has every group.

The outlines of the marks keep their round joins in the file:
`stroke-linejoin` is among the properties the export writes on each
element (`charts.md`, "Colours, themes and the exported file"), and
without it a program that opens the file draws the mitred joins, whose
tips reach 9.2 pixels from the point of a star.

A plot 48rem wide, the largest of "The size" below, is 768 pixels wide
at the browser's default size of text, 16 pixels, so its PNG at 3 times
is 2,304 pixels wide; it takes 2 times above a size of text of 28.4
pixels, and is refused above 42.7 (`plot2d.md`, "The export").

## The size

The plot never sets the size of its element (`charts.md`). The screen's
CSS gives the element its width, that of its container, and its height,
meanwhile `aspect-ratio: 4 / 3`, with a `max-width` of 48rem, refined in
the running application; the 3D plot takes the same size, so that the
switch between the two does not move the page (`pca3d.md`). The element
is `position: relative`, so that the tooltip is placed inside it
(`css.md`). At 320 pixels wide, the width of a phone in WCAG 2.2,
1.4.10, the frame is 244 by 184 pixels.

## The cases

- **No point with finite coordinates**: the axes are drawn as for one
  point at (0, 0), no mark is drawn, and the legend counts none; the
  screen says why.
- **One point, or every point at one place**: it is drawn at the centre
  of the frame (above, "The axes").
- **A group with no point drawn** has no path and no entry in the
  legend, and keeps its mark: the next group is not given its colour.
- **An `update` to another colouring**, from groups to values or to
  another column: the paths are joined by their keys, those of the
  groups or of the steps, in the same SVG; the tooltip is hidden.
- **An `update` that only changes the highlight** redraws the paths with
  their classes and order. For the 9,381 points of the largest PCA it is
  drawn within the next frame, 17 ms in WebKit and in Chromium on the
  owner's Mac (below, "How it is verified").
- **A resize** draws again at the new size, with new scales and new
  pixel positions, and hides the tooltip.
- **A name with markup in it**, of an individual, a population or a
  column, `<b>P1</b>`: shown as text in the tooltip, and as text in the
  legend of the file; no `b` element is made.
- **A change of theme**: nothing is drawn again; a later `toSVG` is in
  the light theme all the same.
- **`destroy`, a size of 0, a frame with no area and data the plot
  refuses** are the base's cases (`plot2d.md`, "The cases"); `destroy`
  also removes the tooltip, and calls `onHover(null)` when a point was
  under the pointer, so that a screen that marked its row, and draws
  the 3D view in the scatter's place, unmarks it; a second call does
  nothing.
- **Numbers near the largest a number of 64 bits holds**, about
  1.797e308, such as the ±1.7e308 of the tests (1.8e308 is past it, and
  is Infinity in JavaScript): the step of viridis is computed with
  halves, `(value / 2 − min / 2) / (max / 2 − min / 2)`, so that no
  difference overflows to an infinity. The axes of such coordinates run
  past the largest number, since the frame is wider than the data along
  one of them: the scatter then draws its scales over the coordinates
  times a half, a quarter, down to a 256th, the first at which the ends
  of both axes are finite, which places every point where it would be,
  since a power of two multiplies exactly, and writes the labels of the
  ticks at the size of the coordinates. A tick of an axis that runs past
  the largest number would read "Infinity" there, which a user would
  take for a value of the data, so a tick whose label would not be a
  finite number is left out, by the base's `tickShown` (`plot2d.md`).
  `scatterScales` gives the scales at 1. The points are drawn and
  coloured as any others.

## How it runs

On the page, in the main thread. The scatter keeps the pixel positions
of the last draw, two 4-byte numbers per point, 75 KB for 9,381 points,
and the tooltip; the paths are the SVG's. A draw is a loop over the
points and a join of at most a few hundred paths.

## How it is verified

At `createScatter`, its handle and the pure functions of the four
modules, the highest functions at which each thing can be seen. What
the base does for every plot is verified in `plot2d.md`, with the
overlay and the legend of the exported file added there.

**The pure functions, in the project `charts` of Vitest** (`testing.md`):

- `groupMark`: group 0 is colour 0 and symbol 0, group 7 colour 0 and
  symbol 1, group 8 colour 1 and symbol 2, the 49 groups 0 to 48 have
  49 different pairs, and group 49 the pair of group 0.
- `scatterScales` for x from −1 to 1 and y from 0 to 1 in a frame of 400
  by 300: 190 pixels per unit on both axes, the domain of x
  −1.0526315789473684 to 1.0526315789473684 and of y
  −0.2894736842105263 to 1.2894736842105263, so that y = 1 is 55 pixels
  below the top; for one point at (2, 3) in the same frame, 140 pixels
  per unit, (300 − 20) / 2, and the point at (200, 150); and for no
  finite point, the same scale around (0, 0). Computed in node on 27
  September 2026 from the rule above.
- `legendOf`: for groups `[0, 1, NO_GROUP, 0, 2]` with names `P1`, `P2`,
  `P3`, `P4` and the fifth point not drawn, the entries P1 2, P2 1 and
  "No population" 1, with no P3, whose one point is not drawn, and no P4;
  with P2 highlighted, P1 and "No population" faded; for values
  `[1.5, NaN, 2.5]`, min 1.5, max 2.5 and 1 with no value.
- `viridisStep` of the smallest value 0, of the largest 255, of a value
  when min and max are equal 128; `viridisColour` of 0 "#440154" and of
  255 "#fde725".
- `nearestPoint`: the nearer of two points within 10 pixels; none beyond
  10; a NaN position never; with a depth, the point nearer the camera
  among two at the same pixel; a point at the pointer, of depth 0.5,
  rather than one 8 pixels away and nearer the camera, of depth −0.5,
  since only the first covers the pointer; and of two points 6 and 8
  pixels away, neither covering the pointer, the one at 6 whatever their
  depths.
- `tooltipLines` of a point of P2 at (−0.02314, 0.01041): "Population:
  P2" and "PC1 −0.0231, PC2 0.0104", whose first character after "PC1 "
  is U+2212; of a point of no group, "No population"; of a value 2019 of
  the column Year, "Year: 2019", and of −1.5, "Year: −1.5".
- Each defect of "The TypeScript interface" throws, with 50,000 points
  accepted and 50,001 refused.
- The path of one group of two points is the one `drawSymbolAt` writes
  with one decimal, a literal made by `symbol` and `pathRound(1)` of D3
  for those points and written into the test.

**The SVG, under jsdom**, with the size of the element given by a stub
of `clientWidth` and `clientHeight` and a `ResizeObserver` the test
calls, as `plot2d.md` does:

- the class `chart chart-scatter`, and `rect.chart-overlay` as the last
  child of `chart-frame`, of the size of the frame;
- four groups and a no-group: five `path.chart-points`, the
  `chart-points-none` first, each group with the class of its colour;
  with group 2 highlighted, its path last and the four others with
  `chart-points-faded`; an `update` to no highlight removes the class,
  and so does an `update` with `highlighted` 4, beyond the four names,
  which throws nothing;
- values: one path per step used, each with a `fill` attribute that is
  a colour of viridis, and the ring path of the points with no value;
- an `update` from groups to values and back, in the same `<svg>`
  element, with no path of the other colouring left;
- `toSVG` holds the legend in `chart-legend`: first its
  `rect.chart-legend-background`, then one row per entry with its text,
  "No population (1)" last, and "and ‹n› more" when the frame holds
  fewer rows than the entries: 20 groups of one point each in an element
  400 by 150 pixels, whose frame of 94 pixels holds five rows, give the
  title "Population", "P1 (1)" to "P3 (1)" and "and 17 more"; with P2
  highlighted, the class `chart-legend-faded` on the marks of the other
  entries and on no text; `chart-legend` of the plot on the screen stays
  empty after it;
- `destroy` after a hover leaves the element with no child, the tooltip
  gone.

jsdom has no layout, so the position of the pointer that `pointer` of
`d3-selection` computes from the SVG's place on the page cannot be had
there; the hover is verified in the browser.

**In Playwright, in Chromium, Firefox and WebKit**, on the page of the
tests of the plots, `e2e/plots.html`, which draws a scatter of 9,381
points in 5 groups, a no-group among them, from literal arrays, at a
size the test sets:

- the pointer moved to the pixel of point 0, which the page computes
  with `scatterScales`, shows a tooltip with its name, and `onHover` is
  called with 0; moved 30 pixels away from every point, the tooltip is
  hidden and `onHover` called with `null`; a name `<img src=x
  onerror=…>` shows as text and runs nothing;
- the pointer moved from point 0 onto its tooltip in 10 steps,
  `mouse.move` with `steps: 10`, so that the browser sees the pixels in
  between as a user's hand would pass them, keeps it shown, and moved
  off it, away from every point, hides it; Escape pressed while
  the focus is in a text field of the page hides the tooltip, and the
  field keeps the focus and its text;
- a tap, in a context with touch, shows the tooltip of the point tapped;
- `toSVG` has no `chart-overlay`, no `chart-hover` and no `var(`,
  holds the legend, and has `stroke-linejoin: round` in the style of
  each `path.chart-points`; its PNG at 3 times of a plot of 600 by 450 is 1,800
  by 1,350 pixels, and holds the legend too: the pixel at the centre of
  the mark of the first entry, where the PNG is drawn on a canvas and
  read, has the colour of the first group, `rgb(230, 159, 0)`, within 8
  of each channel;
- the time from `createScatter` to the next frame drawn, for the 9,381
  points, and of an `update` that only changes the highlight, five times
  each, printed with the engine and the machine, as the walking skeleton
  measured it; no bound fails the test, and the times are written into
  this spec with their engines.

The times, measured on 29 September 2026 on the owner's Apple M5 Pro
with 64 GB, macOS 27.0, Playwright 1.63.0, by the last of those flows
run alone, `--workers=1`, on a plot of 600 by 450 pixels, after the fixes
of the review of the scatter changed its drawing, at load averages of
2.9, 2.5 and 2.4 over 1, 5 and 15 minutes, since a virtual machine and
the photo analysis of macOS each held a core; five times each after one
not counted, the median and the range:

| | Chromium 153.0.8010.12 | WebKit 26.6 |
|---|---|---|
| `createScatter` to the next frame drawn | 16.8 ms (16.0 to 18.2) | 18.0 ms (18 to 19) |
| the call of `createScatter` alone | 7.9 ms (6.4 to 10.8) | 10.0 ms (9 to 10) |
| an `update` of the highlight to the next frame drawn | 16.9 ms (16.6 to 17.8) | 18.0 ms (17 to 23) |
| the call of that `update` alone | 9.8 ms (7.1 to 10.7) | 10.0 ms (9 to 10) |

The call draws the plot before it returns, and the time to the next
frame holds the wait for it, a frame every 16.7 ms: in both engines the
scatter of the largest PCA is drawn, and its highlight changed, within
the frame after the call. WebKit gives `performance.now()` to the
millisecond. The first measurement, on 28 September 2026 before those
fixes, gave within 2 ms of these: 17.0 and 19.0 ms to the frame after
`createScatter`, and 16.7 and 17.0 ms after an `update`, in Chromium
and WebKit.

The PCA panel in both themes, with the legend over the plot and a group
highlighted, is in the screens of `e2e/screens.spec.ts`, looked at as
`testing.md` says, and axe runs on it (`pca.md`).

**The dependencies it adds**, in `package.json` at these versions since
work package 7 of stage 4, the versions those of `npm view` on 27
September 2026: `d3-shape` 3.2.0, which brings `d3-path`, and `d3-path`
3.1.0, imported for `pathRound`; `d3-scale-chromatic` 3.1.0, which
brings `d3-color` and `d3-interpolate`, already brought by `d3-scale`;
for development, `@types/d3-shape` 3.2.0, `@types/d3-path` 3.1.1 and
`@types/d3-scale-chromatic` 3.1.0. The owner took these modules on 24
September 2026 (`docs/technology.md`, section 2), and approved them at
these versions on 27 September 2026. `d3-delaunay` is not added (above,
"The point under the pointer"), and `d3-format`, `d3-array` and
`d3-zoom` neither: the numbers of the tooltip are formatted by
`Intl.NumberFormat`, the ranges by a loop, and the scatter has no zoom
in stage 4.

## What this spec assumes of other specs

Of `docs/specs/analyses/pca.md`:

- the options `colourBy` and `axes`, the 2D plot showing `axes[0]`
  against `axes[1]`, and a function that turns the result and the
  metadata into `x`, `y`, the names and `PointColours`, shared with the
  3D plot, which gives the names of the groups in the same order
  whatever is shown;
- which columns colour by groups and which by values, and that a
  categorical or binary column of more than `MAX_POINT_GROUPS` values is
  not offered, `MAX_COLOUR_GROUPS` of `pca.md`, which draws a colouring
  that would give more as one group;
- the words: the labels of the axes with the percentages, `xName`, the
  title of the colouring, `noneName`, the description, and the legend's
  name for a screen reader;
- the panel draws the legend with React Aria's `ToggleButtonGroup`, as
  "The legend, drawn by the screen" says, at the same offset from the
  corner in 2D and 3D, with the mark of a faded entry faded and its name
  not, vertical; keeps the highlight as state of the screen, and gives
  it to the plots only with the colouring it was pressed in, since the
  highlight is an index into the names; and gives it to the 2D and the
  3D plot alike;
- the names of the groups are every group of the metadata file, those
  with no point among them, so that a population keeps its index, and
  its mark, when a filter leaves it no individual;
- the coordinates of the table written to four decimals;
- the table of the individuals, the panel's, from `pcaRows` with every
  component kept, made from the same result and colours as the data of
  the plot, and linked from it.

## What this spec asks of other documents

- `docs/specs/charts/plot2d.md`: revised with this spec, on 27 September
  2026, for the overlay and the calls of the pointer, `pointer` of the
  definition, whose `leave` is given the element the pointer went onto;
  `stroke-linejoin` among the properties the export writes; the hook that draws into the exported copy, `drawExport`,
  carried by the third argument of `exportSvg`, `drawBeside`, in `toSVG`
  and in `toPNG` alike; the export leaving out `chart-hover`; a
  definition made per plot when it holds the state of one plot.
- `.claude/skills/coding/charts.md`:
  - "The contract of a plot": `ScatterData` as above, the colours in
    `PointColours` of `marks.ts`, shared with the 3D plot;
  - "The SVG, its parts and their names" and "Colours, themes and the
    exported file": the class of the colour of a path is
    `chart-colour-‹0 to 6›`, where it was `chart-group-‹i›`, since a
    group's colour is `i % 7` and the class names the colour; the
    outline is set once on `.chart-points`, with round joins;
  - "Hover and tooltips": the nearest point by a loop over the pixel
    positions, 0.027 ms for 50,000 points in node, and not a Delaunay;
    `d3-delaunay` off the list of the modules; after the review of 27
    September 2026, the tooltip kept while the pointer is on it and
    hidden by Escape (WCAG 2.2, 1.4.13), and its numbers with the minus
    sign;
  - "Colours, themes and the exported file": the colours of viridis are
    written on their paths, the one colour a plot writes, the same in
    both themes;
  - "Accessibility": a point in no group, or with no value, is a ring in
    `--chart-axis`, drawn first; the marks are of 64 square pixels, and
    reach 8.05 pixels from their point, so the scatter keeps 10 pixels
    inside its frame;
  - "The 3D PCA with three.js": the legend is the screen's, in React,
    shared by the two plots, and not HTML the plot makes;
  - "What SVG can draw": the numbers of the paths rounded to one
    decimal with `pathRound(1)`.
- `docs/architecture.md`, section 9: `marks.ts`, `legend.ts` and
  `hover.ts` in the list of `src/charts`.
- `.claude/skills/coding/css.md`: the classes of `charts.css` above use
  no new token.
- `.claude/skills/coding/testing.md`, "Against the built site": the
  page `e2e/plots.html` draws the scatter and the 3D plot too.

Each of these was made in its document on 27 September 2026, when the
specs of stage 4 were made to agree, `docs/architecture.md` among them,
but that of `css.md`, which needs no change.

## Open points

**Open 1: the legend over the plot hides the points under it.** The
legend sits over the top right corner of the frame, on a background of
the surface, and the scale fills the whole frame, so the few points
under it can be neither seen nor pointed at. The options:

- Keep it over the plot, as the owner's widget has it: the plot keeps
  its full size, and the highlight of a population and the table of the
  individuals reach every point.
- A strip beside the plot for the legend: every point can be seen, and
  the plot is narrower by the width of the legend, most on a phone.

Recommendation: over the plot. The owner answered on 27 September 2026,
"we'll fix those details when we have the application working", so the
point stays open and is judged on the running screen, when the owner
tries the PCA panel. Meanwhile, over the plot, as above (point 14 of
`docs/specs/stage-4-open-points.md`).

The 50,000 points are the owner's decision of 26 September 2026, and
the one decimal is decided above with the numbers of the walking
skeleton. The points of `docs/specs/stage-4-open-points.md` this spec
leans on are the PCA opening on the 3D view, with this plot drawn in
its place where the browser cannot draw 3D (point 5), and the drawing
options kept out of the key of the PCA (`pca.md`).

## Not in this spec

- The lasso that assigns the points to a population, which is not in
  stage 4 and needs a design of its own (`charts.md`, "The lasso,
  later").
- A zoom and a pan of the 2D plot, with `d3-zoom`, which the Manhattan
  plot brings in stage 7; the 3D plot zooms (`pca3d.md`).
- A grid, and lines at 0 of each component.
- The buttons of the export, in stage 6.
- The legend as a React component, the bar above the plot and the switch
  between 2D and 3D: `pca.md`, the panel.
- A scatter of two quantities of different units, whose axes would each
  need their own scale: the option comes with the first such plot.
