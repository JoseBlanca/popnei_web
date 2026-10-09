/**
 * What a table and a plot take to be downloaded, and the items of their
 * menus (docs/specs/widgets/downloads.md, "A table", "A plot" and "The
 * TypeScript interface"): a table's CSV of its values, every row in the
 * order shown; a plot's image as SVG or PNG, from the handle of the plot,
 * and its data as the CSV the screen writes at the choice.
 */
import type { ChartHandle } from "../../charts/types.ts";
import { tableCsv } from "../../core/csv.ts";
import type { CellValue } from "../../core/csv.ts";
import { downloadName } from "../../core/fileNames.ts";
import { downloadFile, downloadText } from "../download.ts";

/** One item of a menu of downloads: its words, and the function that
    hands the file to the browser and gives the file's name, for the
    status region. It may reject with a `PngError`, a PNG the browser
    refused; any other rejection is a defect. */
export interface DownloadItem {
  /** The words of the item. */
  readonly label:
    "Table as CSV" | "Image as SVG" | "Image as PNG" | "Data as CSV";
  /** Hands the file to the browser, and gives its name. */
  readonly save: () => Promise<string>;
}

/** What a table takes to be downloaded. */
export interface TableDownload {
  /** What it downloads, after "Download ": "the table of panel_pops.csv". */
  readonly what: string;
  /** The name of the file, made by `downloadName` with "csv". */
  readonly fileName: string;
}

/** What a plot takes to be downloaded. */
export interface PlotDownload {
  /** What it downloads, after "Download ": "the plot of the PCA". */
  readonly what: string;
  /** The stem of the names of its files: "panel". */
  readonly stem: string;
  /** What the image is in the names of its files: "pca", for
      "panel.pca.svg" and "panel.pca.png". */
  readonly imageWhat: string;
  /** What the data are in the name of their file: "pca.coordinates",
      for "panel.pca.coordinates.csv". */
  readonly csvWhat: string;
  /** The CSV of the data of the plot, written at the choice. */
  readonly csv: () => string;
  /** The reason the menu waits, or null. */
  readonly waiting: string | null;
}

/** The media type of a CSV. */
const CSV_TYPE = "text/csv";

/** The media type of an SVG. */
const SVG_TYPE = "image/svg+xml";

/** How many times the size on the screen the PNG of a plot is made at
    (docs/specs/widgets/downloads.md, "A plot"). */
const PNG_SCALE = 2;

/**
 * The item "Table as CSV" of a table of columns labelled `header`, whose
 * rows give their values, one per column, in the order shown: the CSV is
 * written at the choice, of the rows as they are then.
 */
export function tableItem(
  fileName: string,
  header: readonly string[],
  values: () => readonly (readonly CellValue[])[],
): DownloadItem {
  return {
    label: "Table as CSV",
    save: () => {
      downloadText(fileName, tableCsv(header, values()), CSV_TYPE);
      return Promise.resolve(fileName);
    },
  };
}

/**
 * The three items of a plot, "Image as SVG", "Image as PNG" and "Data as
 * CSV", whose images come from the handle `handle` holds at the choice; a
 * defect when it holds none, a plot not drawn.
 */
export function plotItems<Data>(
  download: PlotDownload,
  handle: { readonly current: ChartHandle<Data> | null },
): readonly DownloadItem[] {
  const plot = (): ChartHandle<Data> => {
    const current = handle.current;
    if (current === null) {
      throw new Error(
        `popnei_web defect: the plot of ${download.what} was downloaded before it was drawn.`,
      );
    }
    return current;
  };
  const named = (what: string, extension: "csv" | "svg" | "png"): string =>
    downloadName(download.stem, what, extension);
  return [
    {
      label: "Image as SVG",
      save: () => {
        const name = named(download.imageWhat, "svg");
        downloadText(name, plot().toSVG(), SVG_TYPE);
        return Promise.resolve(name);
      },
    },
    {
      label: "Image as PNG",
      save: async () => {
        const name = named(download.imageWhat, "png");
        downloadFile(name, await plot().toPNG(PNG_SCALE));
        return name;
      },
    },
    {
      label: "Data as CSV",
      save: () => {
        const name = named(download.csvWhat, "csv");
        downloadText(name, download.csv(), CSV_TYPE);
        return Promise.resolve(name);
      },
    },
  ];
}
