# The bar plot of named values

Written on 12 October 2026 for the owner's first round of trying the
Populations tab of `popgen2.html` (`docs/plans/population-tab.md`,
"Work package 7, round 1"), where the owner asked for one plot per
statistic of the table of the diversity, so that the populations are
compared at a glance. Its code is `src/charts/bars.ts`. This spec gives
the plot of one number for each of a few named things: one horizontal
bar per name, in the order given, from 0 to its value, the names down
the left side and the axis of the values along the bottom. Its first
user is the Populations tab, one plot for each of five columns of the
table (`docs/specs/steps/popgen2-populations.md`, "The result"); the
plot knows nothing of populations or of heterozygosity. It is built on
the base of the 2D plots, `docs/specs/charts/plot2d.md`, which gives it
its SVG and frame, its size, its axes, its text for a screen reader,
its handle and its export, and it colours each bar by the colours of
the groups of `docs/specs/charts/scatter.md`, "The marks of the
groups", so that a population has one colour in every plot of the tab.
It depends on `.claude/skills/coding/charts.md` and `css.md`.

The bars lie across, and not upright, so that each name is written
level at the start of its bar: a name of the user's file can be long,
and the names of the populations are at most 20 on `popgen2.html`
(`MAX_LISTED_POPULATIONS`), which fit one under the other.

## What it does

### What the user sees

- **A bar per name**, in the order of the data, the first at the top,
  each in a row of 28 pixels, the bar 21 pixels high, filled with the
  colour of its group, `chart-colour-‹group % 7›`, the colour of
  group `i` of the scatter. A bar of one of the three light colours,
  orange, sky blue and yellow, below 3:1 on the light background, has
  an outline of 1 pixel in `--chart-axis`, as the marks of those
  colours have; the four others have none.
- **The names**, down the left side, each level and ending 20 pixels
  before the frame. A name is not told by its colour alone: it is
  written beside its bar (WCAG 2.2, 1.4.1).
- **The mark of each name**, between the name and the frame: the symbol
  of its group, of the area of a point of the scatter, 64 square
  pixels, in the colour of its group and with the outline every point
  has, `symbolPath` of `marks.ts`, its centre 10 pixels left of the
  frame, on the middle of its row; the same mark as the group's points
  and line in the line plot, so that a population is followed from plot
  to plot by its colour and its shape, which repeat only after 49
  groups, and not by its colour alone, which repeats after 7. (From 12
  October 2026, the review of round 1: with colour alone, populations 0,
  7 and 14 of the tab were alike.)
- **A name with no value**, NaN: no bar, and the words the data give,
  "no value", written in its row from 4 pixels right of the axis, so
  that a missing value is not read as a value of 0.
- **The axis of the values**, along the bottom, from 0 to the largest
  value made round by `nice()` of `d3-scale`: 0.3567 gives 0.4, and
  1.9867 gives 2. With no value above 0, it runs from 0 to 1. Its label,
  under it, is `xLabel`; the axis of the names has no label, `yLabel`
  empty, since the names say what the rows are.
- No legend: each bar has its name.
- No pointer: no tooltip, no overlay. The numbers are in the screen's
  table.

### The room of the names

The left margin holds the longest name as written, measured, with 20
pixels between the name and the frame, 4 to the mark, 12 for it and 4
more, and 4 before the left edge of the SVG. A name keeps at most 20
characters, and at most what 40% of the width of the element holds once
those 24 pixels are taken, 0.4 × width − 24 pixels; a longer name is cut in the middle, to as many of its
first and last characters as fit about an ellipsis, the first half one
more for an odd number, "Landr…oast", and 3 and the ellipsis at the
fewest, so that the names of one collection, alike in their starts,
stay apart. When two rows or more would still write the same, each
writes its name cut to the room its number leaves and the number of its
row in brackets, from 1, which is its row in the screen's table,
"Lan…_1 (2)" and "Lan…_1 (3)" at 288 pixels; two names alike whole, as two
populations alike once escaped, are numbered so too. (From 12 October
2026, the review of round 1: cut at their ends, "Landrace_Valencia_coast"
and "Landrace_Valencia_inland" both read "Landrace_Va…" at 288 pixels,
and nothing told the two bars apart but the order of the table.) A name is measured in the font of the plots at its 12
pixels, by `textWidth` of `src/charts/textWidth.ts`; where
nothing measures, under jsdom, a character counts 9 pixels, as the
heatmap counts its names (`docs/specs/charts/heatmap.md`, "The names on
the axes"). A width measured is taken a tenth wider, to a hundredth of
a pixel: WebKit draws the exported image, the PNG, in a wider font than
the page's, and a name that fit the screen started about 10 pixels left
of the image. (Changed on 12 October 2026, the review of round 1: the names
were counted at 9 pixels a character, and a name of capital Ws, 11
pixels each in the system font of the Mac, started 13.5 pixels left of
the SVG and was cut on the screen and in the files.)

### The height

The plot never sets the size of its element (charts.md). The screen
gives the element the height `barsHeight(n)` gives for `n` names: 8
pixels above the frame, 28 a row, 44 below it, for the axis and its
label, and 16 more for a label broken into two lines, which the base
takes from the frame; 152 pixels for 3 names. So the rows keep their 28
pixels when the label takes two lines, as "Alleles per variant,
rarefied to 40 chromosomes" does in a plot 355 pixels wide, and a label
on one line leaves 16 pixels free under the plot. (Corrected on 12
October 2026, after the screen of one population: without those 16
pixels its one bar was 8 pixels high under a label on two lines.)

## The TypeScript interface

```ts
// src/charts/bars.ts
/** What a bar plot draws. Every text is the screen's. */
export interface BarsData extends PlotText {
  /** The bars, the first at the top; at most MAX_BARS; two may have one name. */
  readonly bars: readonly Bar[];
  /** The words in the row of a bar with no value: "no value". */
  readonly noValue: string;
}

/** One named value. */
export interface Bar {
  /** The name written beside the bar, as text. */
  readonly name: string;
  /** Its group for the colour and the mark, a whole number from 0, as
      the scatter's. */
  readonly group: number;
  /** Its value, finite and 0 or above; NaN for none. */
  readonly value: number;
}

/** The height in CSS pixels of an element that holds `numBars` rows. */
export function barsHeight(numBars: number): number;

export const createBars: Chart<BarsData>;
```

`createBars` throws an `Error`, a defect of the caller, here and in
`update`, for more than `MAX_BARS` bars, 200, of `src/charts/limits.ts`;
for a group that is not a whole number from 0; and for a value below 0
or infinite. No bar is a plot of an empty frame and its axes. Two bars
may have one name, as two populations whose names differ only in a
character a text escapes, a newline and a backslash followed by n: each
has a row of its own, since the rows are keyed by their place in the
data and the name is only what the row writes (from 12 October 2026,
the review of round 1; before, two such names were refused, and the
five bar plots of the tab were blanked).

## The SVG it builds

The base makes the skeleton with the class `chart chart-bars`, and no
`chart-overlay`. In `chart-marks`, one `rect.chart-bars-bar
chart-colour-‹group % 7›` per name with a value, keyed by its place,
with the class `chart-bars-outlined` too for a light colour. In
`chart-annotations`, one `text.chart-bars-none` per name with no value,
and one `path.chart-points chart-bars-mark chart-colour-‹group % 7›`
per name, its mark, translated to its place left of the frame.
The kind is `bars`, not `bar`, since `chart-bar` is the class of a bar
of the histogram, whose fill would reach every element of the SVG.

The classes the plot adds to `charts.css`, colours from the tokens:

```css
.chart-bars-bar      { stroke: none; }
.chart-bars-outlined { stroke: var(--chart-axis); stroke-width: 1px; }
.chart-bars-none     { fill: var(--color-text); font-size: 12px; }
```

The margins are 8 pixels at the top, 20 at the right, room for half the
last number of the axis, 44 at the bottom, and at the left those of
"The room of the names", named constants of `bars.ts`.

## The cases

- **Every value NaN**: the words in every row, and the axis from 0 to 1.
- **One name**: one row, a bar of 21 pixels, as the one population of
  the Populations tab has.
- **A value of 0**: a bar of no width, its outline alone for a light
  colour; the name says it is there, and the screen's table gives 0.
- **A name with markup**, `<b>p1</b>`: written as text.
- **A change of theme**: nothing is drawn again; the file is in the
  light theme.

## How it runs

On the page, in the main thread, drawn again at each change of size or
of data, by the base: 20 bars at most on `popgen2.html`.

## How it is verified

**Under jsdom**, in the project `charts` of Vitest, with the size of the
element stubbed at 400 by 136:

- the skeleton with `chart chart-bars`, no `chart-overlay` and no
  legend;
- three bars of groups 0, 2 and 1 and the values 0.3, 0.2 and NaN: two
  `rect.chart-bars-bar`, the first `chart-colour-0` and
  `chart-bars-outlined`, the second `chart-colour-2` without it; the
  first wider than the second in the ratio of their values, both from
  x = 0; one `text.chart-bars-none`, "no value", in the third row;
- the names on the axis, "p0", "p2", "p1", from the top down;
- the axis from 0 to 0.3: its last tick 0.3; with every value NaN, from
  0 to 1;
- where nothing measures, the left margin of names of 2 characters, 42
  pixels, 4, 18 and 20; a name of 30 characters at 400 pixels, where 15
  characters fit, written as its first 7 and last 7 about an ellipsis,
  with a left margin of 159; at 1,000 pixels, as its first 10 and last
  9, with a margin of 204;
- at 288 pixels, where 10 characters fit, "Landrace_Valencia_coast" and
  "Landrace_Valencia_inland" written "Landr…oast" and "Landr…land";
  "Landrace_Valencia_set_A_1" and "Landrace_Mallorca_set_A_1" in the
  rows 2 and 3, alike once cut, written "Lan…_1 (2)" and "Lan…_1 (3)",
  and "p0" in row 1 whole, in a left margin of 114;
- measured by a fake measure of the test that gives a W 11 pixels and
  any other character 5.5, the tenth more included: ten Ws whole at 1,000 pixels, in a left margin
  of 134; twenty Ws at 400 pixels cut to six, the ellipsis and five,
  the 126.5 pixels that fit 136, in a margin of 151;
- the marks: three names of groups 0, 2 and 1, three
  `path.chart-points.chart-bars-mark` of `chart-colour-0`, `-2` and
  `-1`, the symbols of those groups, each translated to x −10 and the
  middle of its row;
- `barsHeight(3)` 152 and `barsHeight(1)` 96;
- two bars of one name, `a\nb` twice: two rows, each with its bar,
  written "a\nb (1)" and "a\nb (2)";
- from the review of round 1, 12 October 2026: a value of 0, one bar of
  no width; a largest value of 0.3567, the axis to 0.4; words of no
  value other than "no value", written as given, at `dy` 0.35em;
  exactly 200 bars drawn; a name exactly as long as its room, 15
  characters at 400 pixels, whole;
  at 100 pixels a name keeps 4 characters, "ab…o";
- `check` throws for 201 bars, a group of 1.5, a value of −0.1 and one
  of Infinity.

**In Playwright**, the screen's flows (`popgen2-populations.md`, "How it
is checked"): the five plots of the table drawn, the SVG of one in the
light theme when the page is dark, and no sideways scroll at 320
pixels.

## What this spec asks of other documents

- `docs/architecture.md`, section 9: `bars.ts` as the plot of one value
  per name, the Populations tab's, made with this spec.
- `src/charts/limits.ts` gets `MAX_BARS`, 200, with the code.

## Not in this spec

- What the Populations tab gives the plots, their titles, labels and
  words: `docs/specs/steps/popgen2-populations.md` and
  `docs/specs/analyses/diversity.md`, "On popgen2.html".
- A tooltip, values written at the ends of the bars, error bars: with
  the first screen that asks for them.
