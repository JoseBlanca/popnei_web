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
Written on 9 October 2026; no code yet. It develops section 7 of
`docs/architecture.md`, as revised that day, and depends on
`docs/specs/charts/plot2d.md`, "The export", for `toSVG` and `toPNG`,
and on `docs/specs/analyses/pca.md`, "On popgen2.html", for the CSV of
the PCA's coordinates. The old page, `popgen.html`, gets none of this:
where it shares a component, the download is a prop it does not give.

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
Escape closes it and gives the focus back to the button. A choice calls
the item's function, which hands the file to the browser at once
(`downloadText` and `downloadFile` of `src/ui/download.ts`), and the
status region says "Saving ‹the file's name›." The page cannot know that
the file was saved: a browser set to ask where to save opens its own
dialog, which the user may cancel.

The button can wait, disabled, with its reason as its tooltip and its
description, as the histograms of the Variants tab do until the one
pass ends: "Download once panel.nei is read to the end." A button
disabled for React Aria cannot take the focus, so its tooltip would show
to the mouse alone, and a keyboard user would not learn why it waits.
So a waiting button stays a stop of the Tab key: the widget gives React
Aria an enabled button, marks it `aria-disabled` itself, draws it as
disabled, and opens nothing on a press, as the greyed tabs of
`docs/specs/steps/popgen2-pca.md` do; its tooltip shows on the focus
and on the mouse. A menu open when it begins to wait, as when a new
file is dropped, closes, and does not open again by itself when the
wait ends.

An item that fails says so in words under the button, until the next
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
`download`. With it they draw the menu above the table's top right
corner, with one item, "Table as CSV". Its menu can wait, as a plot's
does, with the reason the screen gives: the counts per population of
the box of the individuals file wait for the one pass, "…" in place of
each (`docs/specs/steps/popgen2-input.md`, "The counts that wait"), and
a file of them then would hold counts of part of the variants with
nothing to mark them. The CSV:

- **Every row**, in the order shown, sorted as the user sorted it, and
  every column in its order, the header the labels of the columns.
- **The values as stored**, which the table is given beside the texts it
  shows: each cell a `CellValue`, a string, a number or `null`. A
  number is written as `String` writes it, in full, with the point and
  the hyphen, `-0.7138853335304419`; `NaN` and `null` as an empty field.
  `SortableTable`'s rows hold their texts only today,
  `cells: readonly string[]`, and gain `values`; `Table`'s cells may be
  elements, and its rows gain `values` too.
- **The text as written**, by `csvField` of `src/core/analyses/words.ts`:
  between double quotes when it holds a comma, a quote or a new line,
  each quote doubled, as RFC 4180, the common rule of CSV files, has it;
  and with a ', before it when it starts with "=", "+", "-" or "@", so
  that a spreadsheet does not run it as a formula.
- **Line ends** `\n`, and a last line end after the last row, as every
  CSV of the application.

### A plot

The React wrappers of the plots, `HistogramPlot` of
`src/ui/widgets/`, and `ScatterPlot` and `Pca3dView` of
`src/ui/analyses/pca/`, take an optional `download`. With it they draw
the menu above the plot's top right corner, with three items:

- **"Image as SVG"**: `toSVG()` of the plot's handle, the plot as drawn,
  in the colours of the light theme, with its legend and its threshold's
  line, and with no mark of the point under the mouse; the 3D view as it
  is turned.
- **"Image as PNG"**: `toPNG(2)`, the same at twice the size of the plot
  on the screen.
- **"Data as CSV"**: the text the screen gives in `download.csv`, a
  function called at the choice, so that a CSV is written only when it
  is asked for.

The handle of the plot comes from `usePlot`, which gives it beside the
element's ref; the 2D scatter and the 3D view, which mount their plots
themselves, keep their handle in a ref already and give it to the menu.
The plots of `src/charts` do not change.

What each plot's CSV holds, written by the functions of core below:

- **A histogram**: `binsCsv`, a row per bin as the plot draws it, its
  left edge, its right edge and its count, header
  `left_edge,right_edge,count`; for the heterozygosity of the
  individuals, whose plot counts apart those with none, a last row with
  empty edges and their count.
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
// SortableRow and TableRow gain: readonly values?: readonly CellValue[], one per column,
// required when the table is given a download (a defect otherwise);
// SortableTableProps and TableProps gain: readonly download?: TableDownload.

/** What a plot takes to be downloaded. */
export interface PlotDownload {
  readonly what: string;       // "the plot of the PCA"
  readonly stem: string;       // "panel"
  readonly imageWhat: string;  // "pca": downloadName(stem, imageWhat, "svg" | "png")
  readonly csvWhat: string;    // "pca.coordinates": downloadName(stem, csvWhat, "csv")
  readonly csv: () => string;
  readonly waiting: string | null;
}
// HistogramPlotProps, ScatterPlotProps and Pca3dViewProps gain: readonly download?: PlotDownload.
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
`.claude/skills/coding/testing.md` and the tests of the tabs do: a `SortableTable` of three rows sorted descending by a number
column, "Table as CSV" chosen: the text handed to `downloadText` has
the rows in that order and the values, not the texts; a table given a
download and a row with no `values`: a defect; a `DownloadMenu` with a
`save` that throws `PngError("tooLarge")`: the words under the button
and in the status region; a waiting menu: `aria-disabled`, its tooltip,
and no menu on Enter.

With Playwright, in Chromium and WebKit, on the built site, as
`docs/specs/steps/popgen2-pca.md`, "How it is checked", lists: each
menu by the keyboard alone, the files saved and read back, the SVG of a
histogram with its threshold's line, a PNG of the 3D view, and axe with
no finding.

## Not in this spec

- Which tables and plots get a menu, their `what` and their file names:
  `docs/specs/steps/popgen2-pca.md`, "The downloads".
- The export itself, the SVG and the PNG of a plot:
  `docs/specs/charts/plot2d.md`, "The export", and `charts.md`.
- The download of the filtered variants and of the statistics of each
  individual, which keep their own buttons: `popgen2-download.md`.
