# The download of every table and every plot

The button "Download…" that every table and every plot of
`popgen2.html` carries, its menu, and the files each choice writes: a
table as CSV; a plot's image as SVG or PNG and its data as CSV. The
owner's principle of 9 October 2026 is that the user can download the
data of every table and every plot, and the image of every plot, built
into the components of the tables and the plots and not added screen by
screen (`docs/designs/analyses-pca.md`, "Every table and every plot can
be downloaded"; `docs/functionality.md`, section 2). This spec gives the
widget of the menu, what the components of the tables and the React
wrappers of the plots take for it, `usePlot`, which gives a wrapper the
handle of its plot, and the pure functions of core that write the CSV.
Written on 9 October 2026, and built on the branch `pca-tab` on 9 and
10 October 2026, work packages 5 and 6 of `docs/plans/analyses-pca.md`,
in `src/core/csv.ts`, `src/core/fileNames.ts`,
`src/ui/widgets/DownloadMenu.tsx` and `downloadItems.ts`; its reviews
placed the menu on a line of its own, made a table's download able to
wait, and put the PCA's menu beside the title of its plot, as the
sections below now say. It develops section 7 of
`docs/architecture.md`, as revised that day, and depends on
`docs/specs/charts/plot2d.md`, "The export", for `toSVG` and `toPNG`,
and on `docs/specs/analyses/pca.md`, "On popgen2.html", for the CSV of
the PCA's coordinates. The old page, `popgen.html`, gets none of this:
where it shares a component, the download is a prop it does not give.

Revised and built on the branch `population-tab` on 11 October 2026
(`docs/plans/population-tab.md`, work package 2 and the review of work
packages 2 and 3), not yet tried by the owner: a histogram of the
spectrum of a population downloads the population's rows of the CSV of
the spectra ("A plot"), and Tab or Shift+Tab in an open menu closes it
and moves the focus on ("The menu").

Revised on 12 October 2026 for the owner's first round of trying the
Populations tab (`docs/plans/population-tab.md`, "Work package 7, round
1"): the spectrum is one plot of lines, with one menu, and no longer a
histogram per population ("A plot").

## What it does

A user who downloads a table to work on in a spreadsheet, or in R or
Python, needs every row, not those drawn in view; the numbers as
numbers, not the "−0.7139" the screen rounds to four decimals with a
minus sign a spreadsheet reads as text; the names as the user wrote
them; and the columns in the order shown. What goes wrong otherwise: a
file of the rows in view, 40 of 10,000; a column of numbers read as
text; a name that starts with "=" run as a formula; a file named so
that the browser saves the second one as "(1)".

### The menu

`DownloadMenu`, one widget in `src/ui/widgets/`, React Aria's
`MenuTrigger`, `Button` and `Menu` wrapped once: a button "Download…",
named for a screen reader "Download " followed by what it downloads,
"Download the plot of the PCA"; the menu of its items; Enter, Space or
the Down arrow key open it, the arrow keys move in it, Enter chooses,
Escape closes it and gives the focus back to the button, and Tab or
Shift+Tab closes it and moves the focus to the element after the button
or before it, as the menu button pattern of the WAI-ARIA Authoring
Practices, the W3C's guide to such widgets, asks. React Aria's menu
holds the focus inside its popover, so that until 11 October 2026 Tab
left the menu open, with the focus on the menu itself and on none of its
items, as the review of work packages 2 and 3 of
`docs/plans/population-tab.md` found. A choice calls the
item's function, which hands the file to the browser at once
(`downloadText` and `downloadFile` of `src/ui/download.ts`), and the
status region says "Saving ‹the file's name›." The page cannot know that
the file was saved: a browser set to ask where to save opens its own
dialog, which the user may cancel.

The button can wait, disabled, with its reason as its tooltip and its
description, as the histograms of the Variants tab do until the one
pass ends: "Download once panel.nei is read to the end.", or, once the
user stopped the pass or it failed, the words of
`docs/specs/steps/popgen2-pca.md`, "Its words", which say that it will
not end by itself. A button
disabled for React Aria cannot take the focus, so its tooltip would show
to the mouse alone, and a keyboard user would not learn why it waits.
So a waiting button stays a stop of the Tab key: the widget gives React
Aria an enabled button, marks it `aria-disabled` itself, draws it as
disabled, and opens nothing on a press, as the greyed tabs of
`docs/specs/steps/popgen2-pca.md` do; its tooltip shows on the focus
and on the mouse, and on a click, a tap, Enter or Space, which open
nothing else and do not close it, since a click that did nothing
visible, or a tap on a touch screen, where no mouse rests on the
button, would otherwise leave the user without the reason. The tooltip
stays while the focus is on the button, through a scroll of the page
that brings the button into view, and while the mouse is over the
button or the tooltip; it goes with Escape, when the focus or the
mouse leaves, and when the button no longer waits. A menu open when it begins to wait, as when a new
file is dropped, closes, and does not open again by itself when the
wait ends.

An item that fails says so in words under the button, with the mark
and the line of a problem the page gives its other refusals, drawn over
what lies under the button so that no plot or box beside it moves, until the next
choice of that menu or until the menu begins to wait: the PNG of a plot, which the browser can refuse,
`PngError` of `src/charts/export.ts`, `tooLarge`, "The image of this
plot is too large for a PNG in this browser; download it as SVG.", or
`notMade`, "The image of this plot could not be made as a PNG in this
browser; download it as SVG."; the words are also said in the status
region. The words, of a file saved or refused, are always those of the
last choice: a PNG that ends after a later choice, or after the menu
began to wait, says nothing. Any other error of an item, whether its
function rejects or throws before it gives its promise, is a defect,
thrown again in a promise that nothing handles, which the bar of the
errors of the page shows; the menu closes as after any choice.

### A table

`SortableTable` and `Table` of `src/ui/widgets/` take an optional
`download`. With it they draw the menu below the table's bottom right
corner, on a line of its own, with one item, "Table as CSV": below the
table since 11 October 2026, as the owner asked on trying the page
(round 1 of work package 8 of `docs/plans/no-undo.md`), and above it
before. Its menu can wait, as a plot's
does, with the reason the screen gives, for a table whose values wait
for the one pass; the counts per population of the box of the
individuals file, which did until 11 October 2026, have no menu since
(`docs/specs/steps/popgen2-input.md`). The CSV:

- **Every row**, in the order shown, sorted as the user sorted it, and
  every column in its order, the header the labels of the columns; for
  a table of the user's file, the names of its columns as the file holds
  them, which the screen shows with a control character escaped, as it
  shows the cells (`csvLabel` of a column of `SortableTable`).
- **The values as stored**, which the table is given beside the texts it
  shows: each cell a `CellValue`, a string, a number or `null`. A
  number is written as `String` writes it, in full, with the point and
  the hyphen, `-0.7138853335304419`; `NaN` and `null` as an empty field.
  `SortableTable`'s rows hold their texts, `cells: readonly string[]`,
  and `Table`'s may hold elements; a table given a download takes rows
  that carry `values` too, which the type of its props asks for, so that
  a row without them does not compile, and a row of another number of
  values than the columns is a defect as the table is drawn. The values
  are taken at the choice, not at each draw.
- **The text as written**, by `csvField` of `src/core/analyses/words.ts`:
  between double quotes when it holds a comma, a quote or a new line,
  each quote doubled, as RFC 4180, the common rule of CSV files, has it;
  and with a ', before it when it starts with "=", "+", "-" or "@", so
  that a spreadsheet does not run it as a formula.
- **Line ends** `\n`, and a last line end after the last row, as every
  CSV of the application.

### A plot

`HistogramPlot` of `src/ui/widgets/` takes an optional `download`, and
with it draws the menu on a line of its own above the plot, or where the
screen places it with `arrange`: the histograms of `popgen2.html` put it
under the row of the threshold's box, so that the plot keeps the box its
line is placed against. The PCA's plot is one of two plots at a time,
the 2D scatter or the 3D view, so its menu belongs to neither: the
result of the PCA, `PcaResults` of `src/ui/analyses/pca/`, draws one
menu beside the title of the plot, "Principal components of
panel.nei", before the bar of controls, and `ScatterPlot` and
`Pca3dView` take no download. Each gives the result the handle of its
plot by `onHandle` when it creates the plot, and `null` when it destroys
it. Every menu of a plot has three items, made by `plotItems` of
`src/ui/widgets/downloadItems.ts`:

- **"Image as SVG"**: `toSVG()` of the plot's handle, the plot as drawn,
  in the colours of the light theme, with its legend and its threshold's
  line, and with no mark of the point under the mouse; the 3D view as it
  is turned.
- **"Image as PNG"**: `toPNG(2)`, the same at twice the size of the plot
  on the screen.
- **"Data as CSV"**: the text the screen gives in `download.csv`, a
  function called at the choice, so that a CSV is written only when it
  is asked for.

`plotItems` reads the handle at the choice, from an object whose
`current` is the handle or `null`: the histogram's comes from `usePlot`,
which gives it beside the element's ref, and the PCA's is that of the
plot drawn at the choice, the 3D view's or the scatter's. It takes only
the exports of the handle, `toSVG` and `toPNG`, whatever the data the
plot draws, so that one menu serves the two plots of the PCA. A choice
while it holds no handle is a defect: the menu of the 3D view waits
until three.js has drawn it ("The cases"). The plots of `src/charts` do
not change. (Until 10 October 2026 this part said that the three
wrappers took a `download` each and drew the menu above the plot; the
review of work package 6 of `docs/plans/analyses-pca.md` found the
design built otherwise, as above.)

What each plot's CSV holds, written by the functions of core below:

- **A histogram**: `binsCsv`, a row per bin as the plot draws it, its
  left edge, its right edge and its count, header
  `left_edge,right_edge,count`; for the heterozygosity of the
  individuals, whose plot counts apart those with none, a last row with
  empty edges and their count.
- **The plot of the spectrum**, in the Populations tab of
  `popgen2.html`, from 12 October 2026: `spectrumLinesCsv` of
  `docs/specs/analyses/sfs.md`, "On popgen2.html", a row per point of
  each line, header
  `population,rarer_allele,commonest_allele_frequency,variants,proportion`,
  the expected number of variants as popnei gives it beside the
  frequency and the proportion the plot draws; its files
  `panel.sfs.svg`, `panel.sfs.png` and `panel.sfs.proportions.csv`. Its
  element is drawn by the screen, which places the menu on a line of its
  own above it, as `HistogramPlot` does. (From 11 October 2026 until
  then, each population's histogram of the spectrum had a menu, whose
  CSV was that population's rows of the CSV of the spectra.)
- **The PCA's plot**, 2D or 3D: `pcaCoordinatesCsv` of
  `docs/specs/analyses/pca.md`, the coordinates vavilov-explorer
  imports.

### The names of the files

`downloadName(stem, what, extension)` of `src/core/fileNames.ts`, where
the names of every file the application writes are made: the stem, a
dot, what is downloaded, a dot, the extension,
"panel.pca.coordinates.csv". The stem is that of the variants file,
`variantsStem`, or, for the table of the individuals file,
`individualsStem`, the name of that file without its last extension,
`panel_pops` from `panel_pops.csv`, and "individuals" for a file named
only by an extension, `.csv`. The `what` of each table and plot
is the screen's (`docs/specs/steps/popgen2-pca.md`, "The downloads").

## The TypeScript interface

The value of a cell, as stored:

```ts
export type CellValue = string | number | boolean | null;
```

A boolean, a cell of a column of true and false values of the
individuals file, is written `true` or `false`; a number that is not
finite, `Infinity` or `-Infinity` as `String` writes them, and `NaN` as
an empty field.

The functions of core, in `src/core/csv.ts`, pure and tested in node:

```ts
/** A CSV of a header and rows, each field by `csvField` for a string, `String` for a number
    or a boolean, and empty for null or NaN; "\n" after every line. A defect when a row has
    another number of fields than the header. */
export function tableCsv(header: readonly string[], rows: readonly (readonly CellValue[])[]): string;

/** The bins of a histogram as drawn: `edges` one more than `counts`; `none`, the count of
    the values in no bin, as a last row with empty edges, or null for no such row. */
export function binsCsv(
  edges: Readonly<Float64Array>,
  counts: Uint32Array | Float64Array,
  none: number | null,
): string;
```

The names of the files, in `src/core/fileNames.ts`, beside
`variantsStem` and `writtenName`, pure and tested in node:

```ts
/** "panel_pops" from "panel_pops.csv": the name without its last extension, or
    "individuals" when nothing is left. */
export function individualsStem(name: string): string;

/** "panel.pca.coordinates.csv" from "panel", "pca.coordinates", "csv". */
export function downloadName(stem: string, what: string, extension: "csv" | "svg" | "png"): string;
```

The widget and the props, in `src/ui/widgets/`:

```ts
/** One item of a menu: its words, and the function that hands the file to the browser and
    gives its name, for the status region; it may throw a PngError. */
export interface DownloadItem {
  readonly label: "Table as CSV" | "Image as SVG" | "Image as PNG" | "Data as CSV";
  readonly save: () => Promise<string>;
}
export interface DownloadMenuProps {
  /** What it downloads, after "Download ": "the plot of the PCA". */
  readonly what: string;
  readonly items: readonly DownloadItem[];
  /** The reason it waits, or null. */
  readonly waiting: string | null;
}
export function DownloadMenu(props: DownloadMenuProps): React.JSX.Element;

/** What a table takes to be downloaded. */
export interface TableDownload {
  readonly what: string;       // "the table of panel_pops.csv"
  readonly fileName: string;   // downloadName(…, "csv")
  readonly waiting: string | null;
}
/** What a row of a table given a download holds beside what it shows. */
export interface RowValues {
  readonly id: string;
  readonly values: readonly CellValue[];   // one per column
}
// SortableTableProps and TableProps are their look and one of:
//   { rows: readonly SortableRow[]; download?: never }             (no menu)
//   { rows: readonly (SortableRow & RowValues)[]; download: TableDownload }
// and the same with TableRow.

/** What a plot takes to be downloaded. */
export interface PlotDownload {
  readonly what: string;       // "the plot of the PCA"
  readonly stem: string;       // "panel"
  readonly imageWhat: string;  // "pca": downloadName(stem, imageWhat, "svg" | "png")
  readonly csvWhat: string;    // "pca.coordinates": downloadName(stem, csvWhat, "csv")
  readonly csv: () => string;
  readonly waiting: string | null;
}
// HistogramPlotProps gains: readonly download?: PlotDownload, and readonly arrange?, which
// places the menu and the plot's element.

/** The exports of a plot's handle, whatever the data it draws. */
export type PlotExports = Pick<ChartHandle<unknown>, "toSVG" | "toPNG">;

/** The three items of a plot, whose images come from the handle `handle` holds at the
    choice; a defect when it holds none. */
export function plotItems(
  download: PlotDownload,
  handle: { readonly current: PlotExports | null },
): readonly DownloadItem[];

// ScatterPlotProps gains: readonly onHandle?: (handle: ChartHandle<ScatterData> | null) => void;
// Pca3dViewProps has: readonly onHandle: (handle: Pca3dHandle | null) => void.
// The PCA's result gives its menu `waiting` itself, "Download once the 3D view is drawn.",
// and its PlotDownload `waiting: null`.
```

`usePlot` gives the handle beside the ref:

```ts
export function usePlot<Data, Events = object>(
  create: Chart<Data, Events>, data: Data, events?: Events,
): {
  readonly ref: RefObject<HTMLDivElement | null>;
  /** The handle of the plot, null before it is created and after it is destroyed. */
  readonly handle: RefObject<ChartHandle<Data> | null>;
};
```

Its callers today, the histogram and, on the old page, the heatmap of
the distances between populations and the line plot of the LD decay,
take `ref` where they took the value it returned.

## The cases

- **A table sorted while its menu is open**: the menu closes, as React
  Aria closes a popover when the focus leaves it; the CSV is written at
  the choice, so it is always of the order shown then.
- **A plot not drawn yet**, the 3D view while three.js downloads: the
  menu waits, with "Download once the 3D view is drawn.", the data
  with the images, since a menu has one reason.
- **The 3D view replaced by the 2D plot** where the browser has no
  WebGL: the 2D plot's menu, the same files.
- **A plot whose tab is hidden**: its menu cannot be reached, since the
  tab is inert.
- **A name that starts with "-"** in a table: written `'-A12`; in the
  PCA's coordinates, written `-A12` (`docs/specs/analyses/pca.md`, "On
  popgen2.html").

## How it runs

On the page's thread, at the choice. A table of 10,000 rows of 20
columns is 200,000 fields, a few tenths of a second by its size, not
measured; the plan measures it, in Chromium and WebKit, and moves the
writing to the light worker if it stops the page for more than 200 ms.
A PNG is made by the browser from the SVG, asynchronously.

## How it is verified

With Vitest, in node, at `tableCsv`, `binsCsv`, `downloadName` and
`individualsStem`:

- `tableCsv(["individual", "PC1"], [["s000", -0.7138853335304419],
  ["a,\"b\"", null], ["=x", NaN], ["-A12", 1e-7]])` gives
  `individual,PC1\ns000,-0.7138853335304419\n"a,""b""",\n'=x,\n'-A12,1e-7\n`.
- A row of three fields under a header of two: a defect.
- `binsCsv` of edges `[0, 0.5, 1]`, counts `[3, 4]` and none `null`:
  `left_edge,right_edge,count\n0,0.5,3\n0.5,1,4\n`; with none 2, a last
  line `,,2`.
- `downloadName("panel", "pca.coordinates", "csv")` is
  `panel.pca.coordinates.csv`.
- `individualsStem("panel_pops.csv")` is `panel_pops`, and
  `individualsStem(".csv")` is `individuals`.

With Vitest, the widgets drawn by React in a page that jsdom simulates
in node, with `createRoot` and `act` and no testing library, as
`.claude/skills/coding/testing.md` and the tests of the tabs do: a
`SortableTable` of three rows sorted descending by a number column, in
another order than by their names, "Table as CSV" chosen: the text
handed to `downloadText` has the rows in that order and the values, not
the texts; a table given a download and a row with fewer `values` than
columns: a defect as it is drawn, and one with none: a type error, by a
`@ts-expect-error`; a `DownloadMenu` with a `save` that throws
`PngError("tooLarge")`: the words under the button and in the status
region; a waiting menu: `aria-disabled`, its tooltip, and no menu on
Enter; Tab in an open menu: the menu closed and the focus on the
button, from where the browser's own move of Tab goes on; a `SortableTable` and a `Table` given a download: the button
"Download…" after the table in the document.

With Playwright, in Chromium and WebKit, on the built site, as
`docs/specs/steps/popgen2-pca.md`, "How it is checked", lists: each
menu by the keyboard alone, the files saved and read back, the SVG of a
histogram with its threshold's line, a PNG of the 3D view, and axe with
no finding; Tab and Shift+Tab in the open menu of a histogram, and
Shift+Tab in that of the table of the individuals file, whose button is
the last stop of the page, the menu closed and the focus on the element
after the button or before it, on `popgen2.html`, the one page that
draws the menu; and the "Download…" of the PCA's explained variance, of its
table of the individuals and of the table of the Individuals tab after
its table in the page and drawn below it, at 1280 and 320 px.

## Not in this spec

- Which tables and plots get a menu, their `what` and their file names:
  `docs/specs/steps/popgen2-pca.md`, "The downloads".
- The export itself, the SVG and the PNG of a plot:
  `docs/specs/charts/plot2d.md`, "The export", and `charts.md`.
- The download of the filtered variants and of the statistics of each
  individual, which keep their own buttons: `popgen2-download.md`.
