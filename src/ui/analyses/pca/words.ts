/**
 * The words of the panel of the principal components
 * (docs/specs/analyses/pca.md, "The panel", "What it shows" and "Its
 * words"): the labels of its options and of the bar of controls above the
 * plot, the lines of its ready and running states, the words of the 3D
 * view, the captions of its two tables and their cells, the names of the
 * downloads, and the line of the marks that repeat past 49 groups. Pure,
 * so that a test in node checks them; the panel draws them. The locked
 * reasons, the warnings, the notes of the colours, of the axes and of the
 * missing genotypes, and the description a screen reader reads, are
 * core's, in src/core/analyses/pca.ts.
 */

import type { PcaColours, PcaRow } from "../../../core/analyses/pca.ts";
import { variantsStem } from "../../../core/fileNames.ts";
import type { IndividualsKept } from "../../../core/individualsKept.ts";
import { counted, escaped, grouped, shown } from "../../../core/project.ts";
import type { Project, ProjectVariantFilter } from "../../../core/project.ts";
import type { PcaMethod, PcaResult } from "../../../worker/protocol.ts";
import { tableNumber } from "../../../charts/numbers.ts";
import { numberText } from "../../widgets/committedNumber.ts";
import type { TableSort } from "../../widgets/tableSort.ts";
import { WAITS_FOR_STATISTICS_TEXT } from "../words.ts";

/** The method as the lines of the panel name it: "PCA" or "PCoA". */
export function methodName(method: PcaMethod): string {
  return method === "pca" ? "PCA" : "PCoA";
}

/** The name of the group of the method. */
export const METHOD_LABEL = "Method";

/** The two methods, as their radio buttons say them. */
export const METHOD_ITEMS: readonly {
  readonly id: PcaMethod;
  readonly label: string;
}[] = Object.freeze([
  { id: "pca", label: "PCA of the genotypes" },
  {
    id: "pcoa",
    label: "PCoA of the Kosman distances, for data with many missing genotypes",
  },
]);

/** The heading of the filters of the analysis: "Filters of the variants
    for the PCA", or "for the PCoA". */
export function filtersHeading(method: PcaMethod): string {
  return `Filters of the variants for the ${methodName(method)}`;
}

/** The line under that heading. */
export function filtersLine(method: PcaMethod): string {
  const name = methodName(method);
  return `The ${name} uses the filters of the Variants step. Set a filter here to use another value for the ${name} alone.`;
}

/** The line under the heading of the filters on popgen2.html, whose
    filters of the PCA narrow those of the Variants tab
    (docs/specs/steps/popgen2-pca.md, "Its filters"). */
export function popgen2FiltersLine(method: PcaMethod): string {
  return `The ${methodName(method)} reads the variants the Variants tab keeps. Its own missing data and MAF filters can only be stricter.`;
}

/** The radio button of a missing data or a MAF filter of popgen2.html
    that follows the Variants tab, with the Variants tab's value as its
    box writes it, "As in the Variants tab: 0.1", or "As in the Variants
    tab: off" while that threshold is off. */
export function tabFollowLabel(
  kind: "missing_data" | "maf",
  filters: readonly ProjectVariantFilter[],
): string {
  const start = "As in the Variants tab: ";
  const filter = filters.find((one) => one.kind === kind);
  switch (filter?.kind) {
    case undefined:
      return `${start}off`;
    case "missing_data":
      return `${start}${numberText(filter.maxAllowedMissingRate)}`;
    case "maf":
      return `${start}${numberText(filter.maxAllowedMaf)}`;
    case "passed":
    case "obs_het":
    case "ld":
      throw new Error(
        `popnei_web defect: the filter of the kind ${kind} was found as ${filter.kind}.`,
      );
  }
}

/** The radio button of a filter made stricter on popgen2.html: "Stricter
    for the PCA", "Stricter for the PCoA". */
export function stricterLabel(method: PcaMethod): string {
  return `Stricter for the ${methodName(method)}`;
}

/** The label of the field of a filter made stricter, with its upper end
    `max`, the Variants tab's value or 1: "Maximum proportion of missing
    genotypes, from 0 to 0.1", "Maximum major allele frequency, from 0 to
    0.95". */
export function stricterFieldLabel(
  kind: "missing_data" | "maf",
  max: number,
): string {
  const what =
    kind === "missing_data"
      ? "Maximum proportion of missing genotypes"
      : "Maximum major allele frequency";
  return `${what}, from 0 to ${numberText(max)}`;
}

/** The kinds of filter the analysis has of its own, in the order of the
    Variants step. */
export type OwnFilterKind = "missing_data" | "maf" | "ld";

/** The radio button of a filter set for the analysis alone, by the
    method, as the heading above it: "For the PCA alone", "For the PCoA
    alone" (stop C 5 of docs/specs/stage-4-open-points.md). */
export function ownLabel(method: PcaMethod): string {
  return `For the ${methodName(method)} alone`;
}

/**
 * The radio button of a filter that follows the Variants step, with what
 * the step has on: "As in the Variants step: 0.1", written as the step's
 * field writes it; "As in the Variants step: off" while the step has that
 * filter off; for the LD filter, "As in the Variants step: r² at most 0.3
 * within 10000 base pairs", or, while the step's filter has no distance,
 * "As in the Variants step: r² at most 0.3, its distance still to be typed
 * there".
 */
export function followLabel(
  kind: OwnFilterKind,
  filters: readonly ProjectVariantFilter[],
): string {
  const start = "As in the Variants step: ";
  const filter = filters.find((one) => one.kind === kind);
  if (filter === undefined) return `${start}off`;
  switch (filter.kind) {
    case "missing_data":
      return `${start}${numberText(filter.maxAllowedMissingRate)}`;
    case "maf":
      return `${start}${numberText(filter.maxAllowedMaf)}`;
    case "ld": {
      const r2 = `r² at most ${numberText(filter.maxAllowedR2)}`;
      return filter.maxDist === null
        ? `${start}${r2}, its distance still to be typed there`
        : `${start}${r2} within ${numberText(filter.maxDist)} base pairs`;
    }
    case "passed":
    case "obs_het":
      throw new Error(
        `popnei_web defect: the principal components have no filter of their own of the kind ${filter.kind}.`,
      );
  }
}

/** The filters as the descriptions of their commands name them. */
const FILTER_NAMES: Readonly<Record<OwnFilterKind, string>> = Object.freeze({
  missing_data: "the missing data filter",
  maf: "the MAF filter",
  ld: "the LD filter",
});

/** The description of the command that sets a filter for the analysis
    alone: "the missing data filter of the principal components was set
    for them alone". */
export function setOwnDescription(kind: OwnFilterKind): string {
  return `${FILTER_NAMES[kind]} of the principal components was set for them alone`;
}

/** The description of the command that sets a filter back: "the MAF
    filter of the principal components was set back to that of the
    Variants step". */
export function setBackDescription(kind: OwnFilterKind): string {
  return `${FILTER_NAMES[kind]} of the principal components was set back to that of the Variants step`;
}

/** The description of the command of a value of a filter set for the
    analysis: "the LD filter of the principal components changed". */
export function ownValueDescription(kind: OwnFilterKind): string {
  return `${FILTER_NAMES[kind]} of the principal components changed`;
}

/** The descriptions of the other commands of the options. */
export const METHOD_DESCRIPTION =
  "the method of the principal components changed";
export const COLOUR_DESCRIPTION =
  "the colour of the points of the principal components changed";
export const AXES_DESCRIPTION = "the components on the axes changed";

/** The description of the command of the view: "the principal components
    were drawn in 3D", or "in 2D". */
export function viewDescription(view: "3d" | "2d"): string {
  return `the principal components were drawn in ${view === "3d" ? "3D" : "2D"}`;
}

/** The filters as the descriptions of the commands of popgen2.html name
    them, before "of the PCA". */
const FILTER_NAMES_2: Readonly<Record<OwnFilterKind, string>> = Object.freeze({
  missing_data: "the missing data filter",
  maf: "the MAF filter",
  ld: "the LD pruning",
});

/**
 * The descriptions of the commands of the PCA on popgen2.html, which name
 * the PCA or the PCoA by the method of the project after the command, as
 * the words of its tab follow the method, and the Variants tab
 * (docs/specs/steps/popgen2-pca.md, "What is a step"): "the MAF filter of
 * the PCA was made stricter".
 */
export const POPGEN2_DESCRIPTIONS = Object.freeze({
  method: (method: PcaMethod): string =>
    `the method of the ${methodName(method)} changed`,
  stricter: (kind: "missing_data" | "maf", method: PcaMethod): string =>
    `${FILTER_NAMES_2[kind]} of the ${methodName(method)} was made stricter`,
  setBack: (kind: OwnFilterKind, method: PcaMethod): string =>
    kind === "ld"
      ? `the LD pruning of the ${methodName(method)} was turned off`
      : `${FILTER_NAMES_2[kind]} of the ${methodName(method)} was set back to as in the Variants tab`,
  turnedOn: (method: PcaMethod): string =>
    `the LD pruning of the ${methodName(method)} was turned on`,
  value: (kind: OwnFilterKind, method: PcaMethod): string =>
    `${FILTER_NAMES_2[kind]} of the ${methodName(method)} changed`,
  colour: (method: PcaMethod): string =>
    `the colour of the points of the ${methodName(method)} changed`,
  view: (view: "3d" | "2d", method: PcaMethod): string =>
    `the ${methodName(method)} was drawn in ${view === "3d" ? "3D" : "2D"}`,
});

/**
 * The lines of the ready state, and of the state of a result removed: the
 * individuals a run will take, "200 individuals of panel.nei", or "111 of
 * the 200 individuals of panel.nei, those the filters of individuals
 * keep"; while a threshold on the individuals waits for their statistics,
 * those the lists keep, and the diversity's line that Run calculates the
 * statistics first. None without a variants file read or individuals kept,
 * which lock the analysis.
 */
export function readyLines(
  p: Project,
  kept: IndividualsKept | null,
): readonly string[] {
  const read = p.variants?.read;
  if (p.variants === null || read?.kind !== "read" || kept === null) {
    return [];
  }
  const total = read.individuals.length;
  const name = escaped(p.variants.name);
  const waits = kept.list.kind === "needsStatistics";
  const numKept =
    kept.list.kind === "known"
      ? (kept.list.individuals?.length ?? total)
      : kept.byLists.length;
  const line =
    numKept === total
      ? `${counted(total, "individual")} of ${name}`
      : `${grouped(numKept)} of the ${counted(total, "individual")} of ${name}, those the filters of individuals keep`;
  return waits ? [line, WAITS_FOR_STATISTICS_TEXT] : [line];
}

/** The individuals a calculation of the project `p` ran on, those the
    filters of individuals keep, `kept` of the state of the store under
    the same filters as its key: the known list, or every individual of
    the variants file when the filters remove none; those the lists keep
    should the statistics a threshold needs have left the cache since. A
    defect with no variants file read, or no individuals kept, which lock
    the analysis before any calculation. */
export function individualsRunOn(
  p: Project,
  kept: IndividualsKept | null,
): number {
  const read = p.variants?.read;
  if (kept === null || read?.kind !== "read") {
    throw new Error(
      "popnei_web defect: the principal components failed with no individuals kept.",
    );
  }
  return kept.list.kind === "known"
    ? (kept.list.individuals?.length ?? read.individuals.length)
    : kept.byLists.length;
}

/** The line under the bar of a calculation under way: the bar does not
    move while the components are calculated, which popnei tells nothing
    of. */
export function decompositionLine(variantsName: string): string {
  return `The bar shows the reading of ${escaped(variantsName)}. The components are calculated once it is read, and the bar does not move meanwhile: from under a second for 1,000 individuals to minutes for several thousand.`;
}

/** The words of the 3D view (docs/specs/analyses/pca.md, "Its words"). */
/** The line under the field of the distance of the LD pruning of
    popgen2.html, on how to choose it, with no number, since no distance
    holds for every genome (docs/specs/steps/popgen2-pca.md, "Its
    filters"). */
export const DISTANCE_HINT =
  "Choose the distance beyond which the r² between two variants falls to its background level in your species, as studies of its LD decay report.";

export const LOADING_3D = "Loading the 3D view…";
export const LOAD_FAILED_3D =
  "The 3D view could not be loaded, so the 2D plot is shown in its place. If the connection works, the site may have been updated since this page was opened: save the project, reload the page and open the project again.";
export const NO_WEBGL =
  "This browser cannot draw the 3D view: WebGL, the part of the browser that draws it, is turned off or not available on this computer, so the 2D plot is shown in its place. It shows any two of the components; choose them above the plot.";
export const CONTEXT_LOST =
  "The browser stopped drawing the 3D view. It is drawn again when the browser allows it, or when you switch to 2D and back to 3D.";
export const TRY_AGAIN = "Try again";

/** A component as the screen names it, "PC3". */
export function pcName(component: number): string {
  return `PC${String(component)}`;
}

/** The minus sign the screen writes a negative number with. */
const MINUS = "−";

/** A percentage of the variance, to two decimals: "3.55%". */
export function percentText(percent: number): string {
  return `${percent.toFixed(2)}%`;
}

/** The label of an axis, with its explained variance: "PC1 (3.55%)". */
export function axisLabel(r: PcaResult, component: number): string {
  const percent = r.explainedVariancePercent[component - 1];
  if (percent === undefined) {
    throw new Error(
      `popnei_web defect: the label of ${pcName(component)} was asked of a result of ${String(r.numComps)} components.`,
    );
  }
  return `${pcName(component)} (${percentText(percent)})`;
}

/** The title of the plot, its name for a screen reader, by the
    components shown and the method `method`: "Principal components, PC1
    and PC2", "Principal coordinates, PC1, PC2 and PC3" under the PCoA;
    `null` for "Principal components" under both methods, as popgen.html
    names its plot (docs/specs/steps/popgen2-pca.md, "The result"). */
export function plotTitle(
  axes: readonly number[],
  method: PcaMethod | null,
): string {
  const names = axes.map(pcName);
  const last = names.at(-1) ?? "";
  const what =
    method === "pcoa" ? "Principal coordinates" : "Principal components";
  return `${what}, ${names.slice(0, -1).join(", ")} and ${last}`;
}

/** The names of the selects of the components, in 2D and in 3D, where
    the view turns and only the third component keeps its direction. */
export const AXIS_LABELS_2D: readonly string[] = Object.freeze([
  "Horizontal axis",
  "Vertical axis",
]);
export const AXIS_LABELS_3D: readonly string[] = Object.freeze([
  "First axis",
  "Second axis",
  "Third axis, kept up",
]);

/** The select of the colour, and its first item. */
export const COLOUR_LABEL = "Colour the points by";
export const POPULATION_ITEM = "Population";

/** The name of the switch between the two plots, and its two buttons. */
export const VIEW_LABEL = "View of the plot";
export const VIEW_3D = "3D";
export const VIEW_2D = "2D";

/** The buttons of the 3D view (docs/specs/charts/pca3d.md, "The buttons
    of the bar above the plot"). */
export const TURN_LEFT = "Turn left";
export const TURN_RIGHT = "Turn right";
export const TILT_UP = "Tilt up";
export const TILT_DOWN = "Tilt down";
export const ZOOM_IN = "Zoom in";
export const ZOOM_OUT = "Zoom out";
export const RESET_VIEW = "Reset view";

/** The button that looks down a component: "View along PC3". */
export function viewAlongLabel(component: number): string {
  return `View along ${pcName(component)}`;
}

/** The link from the plot to the table. */
export const TO_TABLE =
  "Go to the table of the individuals, which gives the place of each one.";

/** A note under the plot, as the status region says it when it appears. */
export function noteAnnounced(note: string): string {
  return `Note: ${note}`;
}

/** The line of the marks past 49 groups, which repeat: "The 60 values of
    collection are drawn with 49 marks, which repeat; the legend and the
    table tell them apart."; "The 60 populations …" by the populations.
    `null` for 49 groups or fewer. */
export function marksNote(c: PcaColours): string | null {
  if (c.kind !== "groups") return null;
  const numGroups = c.counts.filter((count) => count > 0).length;
  if (numGroups <= DIFFERENT_MARKS) return null;
  const what =
    c.title === POPULATION_ITEM
      ? `${grouped(numGroups)} populations`
      : `${grouped(numGroups)} values of ${shown(c.title)}`;
  return `The ${what} are drawn with ${String(DIFFERENT_MARKS)} marks, which repeat; the legend and the table tell them apart.`;
}

/** The different marks of the groups, 7 colours by 7 shapes. */
const DIFFERENT_MARKS = 49;

/** The caption of the table of the explained variance: "The variance of
    the individuals explained by each component, of the 199 components of
    the PCA." */
export function varianceCaption(r: PcaResult): string {
  return `The variance of the individuals explained by each component, of the ${counted(r.numCompsFound, "component")} of the ${methodName(r.method)}.`;
}

/** The line under the explained variance of a PCoA: of the distances
    corrected, with 2c to two significant digits, or not corrected; `null`
    for the PCA. */
export function pcoaVarianceLine(r: PcaResult): string | null {
  if (r.method !== "pcoa") return null;
  const c = r.lingoesConstant;
  if (c !== null && c > 0) {
    return `The percentages are of the Kosman distances after Lingoes' correction, which added ${(2 * c).toPrecision(2)} to the square of every distance, as the warning says; over all the ${counted(r.numCompsFound, "component")} of the PCoA they add up to 100.`;
  }
  return `The Kosman distances of these individuals can all be drawn in one space, so they were not corrected; over all the ${counted(r.numCompsFound, "component")} of the PCoA the percentages add up to 100.`;
}

/** The cells of the row of component `index` of the explained variance. */
export function varianceCells(
  r: PcaResult,
): readonly (readonly [string, string])[] {
  return Array.from(r.explainedVariancePercent, (percent, i) => [
    pcName(i + 1),
    percentText(percent),
  ]);
}

/** The caption of the table of the individuals: "The place of each of the
    200 individuals of panel.nei on the first 10 of the 199 components,
    from 548 variants." */
export function tableCaption(r: PcaResult, variantsName: string): string {
  const numVars = r.numVarsUsed ?? r.passStats.numVars;
  const first =
    r.numComps === r.numCompsFound
      ? `the ${counted(r.numComps, "component")}`
      : `the first ${grouped(r.numComps)} of the ${counted(r.numCompsFound, "component")}`;
  return `The place of each of the ${counted(r.individuals.length, "individual")} of ${escaped(variantsName)} on ${first}, from ${counted(numVars, "variant")}.`;
}

/** A coordinate of the table, to four decimals with the minus sign:
    "−0.7139". */
export function coordinateText(value: number): string {
  const text = value.toFixed(4);
  return text === "-0.0000" ? "0.0000" : text.replace("-", MINUS);
}

/** A value of a column in the table, as tableNumber of the plots gives
    it, up to 12 significant digits, with no comma between thousands and
    the minus sign. */
export function valueText(value: number): string {
  return String(tableNumber(value)).replace("-", MINUS);
}

/** The cells of a row of the table of the individuals: the individual as
    a text shows a name of the user's files, its group or value, or
    `noneName`, "No population" or "No value", as the legend names the
    individuals in no group, and its coordinates. */
export function rowCells(row: PcaRow, noneName: string): readonly string[] {
  return [
    escaped(row.individual),
    row.colour === null
      ? noneName
      : typeof row.colour === "number"
        ? valueText(row.colour)
        : escaped(row.colour),
    ...row.projections.map(coordinateText),
  ];
}

/** The id of a column of the table of the individuals: the individual,
    its colour, or a component, "pc1". */
export type PcaColumnId = "individual" | "colour" | `pc${string}`;

/**
 * The rows sorted as `sort` says, into a copy; as they are with no sort.
 * The individuals by their names, compared as the screen compares text;
 * the colour by the names of the groups, or by the values, those with
 * none last in either direction; a component by its number.
 */
export function sortedRows(
  rows: readonly PcaRow[],
  sort: TableSort<PcaColumnId> | null,
): readonly PcaRow[] {
  if (sort === null) return rows;
  const sign = sort.direction === "ascending" ? 1 : -1;
  const column = sort.column;
  if (column === "individual") {
    return rows.toSorted(
      (a, b) => sign * a.individual.localeCompare(b.individual, "en-US"),
    );
  }
  if (column === "colour") {
    return rows.toSorted((a, b) => {
      if (a.colour === null || b.colour === null) {
        return a.colour === null ? (b.colour === null ? 0 : 1) : -1;
      }
      return (
        sign *
        (typeof a.colour === "number" && typeof b.colour === "number"
          ? a.colour - b.colour
          : String(a.colour).localeCompare(String(b.colour), "en-US", {
              numeric: true,
            }))
      );
    });
  }
  const index = Number(column.slice(2)) - 1;
  return rows.toSorted(
    (a, b) =>
      sign * ((a.projections[index] ?? 0) - (b.projections[index] ?? 0)),
  );
}

/** The downloads and their names: the stem of the variants file and
    `.pca.csv`, `.pcoa.csv`, `.pca_variance.csv` or `.pcoa_variance.csv`. */
export const TABLE_CSV_LABEL = "Download the table as CSV";
export const VARIANCE_CSV_LABEL = "Download the explained variance as CSV";
export function tableCsvName(variantsName: string, method: PcaMethod): string {
  return `${variantsStem(variantsName)}.${method}.csv`;
}
export function varianceCsvName(
  variantsName: string,
  method: PcaMethod,
): string {
  return `${variantsStem(variantsName)}.${method}_variance.csv`;
}

/** The title over the plot of a result of the tab, of the variants file
    `variantsName`: "Principal components of panel.nei", "Principal
    coordinates of panel.nei" (docs/specs/steps/popgen2-pca.md, "The
    result"). */
export function pcaResultTitle(
  method: PcaMethod,
  variantsName: string,
): string {
  const what =
    method === "pca" ? "Principal components" : "Principal coordinates";
  return `${what} of ${escaped(variantsName)}`;
}

/** The reason the plot's menu waits while three.js downloads. */
export const PLOT_WAITS_3D = "Download once the 3D view is drawn.";

/** What each menu of a result downloads, after "Download ": "the plot of
    the PCA", "the explained variance of the PCA", "the table of the
    individuals of the PCA" (docs/specs/steps/popgen2-pca.md, "Its
    words"). */
export function pcaDownloadWhat(
  part: "plot" | "variance" | "table",
  method: PcaMethod,
): string {
  const name = methodName(method);
  switch (part) {
    case "plot":
      return `the plot of the ${name}`;
    case "variance":
      return `the explained variance of the ${name}`;
    case "table":
      return `the table of the individuals of the ${name}`;
  }
}

/** The words of the 3D view that could not be downloaded, of the
    variants file `variantsName`, on this page, which saves no project and
    has no file open after a reload: "… reload the page, open panel.nei
    again and run the PCA again." (docs/specs/steps/popgen2-pca.md, "Its
    words", the errors). */
export function pcaTabLoadFailed3d(
  method: PcaMethod,
  variantsName: string,
): string {
  return `The 3D view could not be loaded, so the 2D plot is shown in its place. If the connection works, the site may have been updated since this page was opened: reload the page, open ${escaped(variantsName)} again and run the ${methodName(method)} again.`;
}
