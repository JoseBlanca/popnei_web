/**
 * What the legend of the points of the PCA shows, as data: the screen
 * draws it over the 2D and the 3D plot with React, and the export draws it
 * in the file (docs/specs/charts/scatter.md, "The legend, drawn by the
 * screen"). The plots know nothing of React, so the legend comes to the
 * screen from here, with the mark of each group from symbolPath of
 * marks.ts. The legend of the exported file, which has no screen beside
 * it, is drawn into the SVG by drawLegendSvg (scatter.md, "The export").
 */

import type { Selection } from "d3-selection";
import { MAX_SVG_POINTS } from "./limits.ts";
import {
  checkPointColours,
  groupColourClass,
  highlightedGroup,
  NO_GROUP,
  symbolPath,
  viridisColour,
  type PointColours,
} from "./marks.ts";
import { tableNumber } from "./plot2d.ts";

/** An entry of the legend of a colouring by groups. */
export interface LegendGroup {
  /** The index of the group in `names`, or NO_GROUP; its mark is symbolPath(group). */
  readonly group: number;
  readonly name: string;
  /** How many points of the group are drawn, those with finite coordinates. */
  readonly count: number;
  /** True when another group is highlighted. */
  readonly faded: boolean;
}

/** The legend of the points drawn, by groups or by values. */
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
      /** How many points drawn have no value, NaN, or one that is not finite. */
      readonly noneCount: number;
    };

/**
 * Which points are drawn: those whose every coordinate is finite. Throws
 * an `Error`, a defect of the caller, when there is no coordinate, when
 * the coordinates are not all of one length, and when there are more than
 * MAX_SVG_POINTS points.
 */
function drawnPoints(coordinates: readonly Float64Array[]): Uint8Array {
  const [first] = coordinates;
  if (first === undefined) {
    throw new Error("popnei_web defect: a legend was given no coordinate.");
  }
  const numPoints = first.length;
  for (const axis of coordinates) {
    if (axis.length !== numPoints) {
      throw new Error(
        `popnei_web defect: the coordinates of a legend are of ${String(numPoints)} and ${String(axis.length)} points.`,
      );
    }
  }
  if (numPoints > MAX_SVG_POINTS) {
    throw new Error(
      `popnei_web defect: a plot was given ${String(numPoints)} points, more than the ${String(MAX_SVG_POINTS)} it draws.`,
    );
  }
  const drawn = new Uint8Array(numPoints).fill(1);
  for (const axis of coordinates) {
    for (const [index, value] of axis.entries()) {
      if (!Number.isFinite(value)) drawn[index] = 0;
    }
  }
  return drawn;
}

/**
 * The legend of the points drawn, those whose every coordinate is
 * finite: [x, y] for the scatter, [x, y, z] for the 3D plot. What the
 * screen shows over the plot and the export writes in the file. Throws an
 * `Error`, a defect of the caller, for coordinates of different lengths or
 * of more than MAX_SVG_POINTS points, and for colours that
 * checkPointColours refuses.
 */
export function legendOf(
  colours: PointColours,
  coordinates: readonly Float64Array[],
): Legend {
  const drawn = drawnPoints(coordinates);
  checkPointColours(colours, drawn.length);
  switch (colours.kind) {
    case "groups": {
      const counts = new Uint32Array(colours.names.length);
      let noneCount = 0;
      for (const [index, group] of colours.group.entries()) {
        if (drawn[index] !== 1) continue;
        if (group === NO_GROUP) noneCount += 1;
        else counts[group] = (counts[group] ?? 0) + 1;
      }
      const highlighted = highlightedGroup(colours);
      const fadedUnless = (group: number): boolean =>
        highlighted !== null && highlighted !== group;
      const entries: LegendGroup[] = [];
      for (const [group, name] of colours.names.entries()) {
        const count = counts[group] ?? 0;
        if (count === 0) continue;
        entries.push({ group, name, count, faded: fadedUnless(group) });
      }
      if (noneCount > 0) {
        entries.push({
          group: NO_GROUP,
          name: colours.noneName,
          count: noneCount,
          faded: fadedUnless(NO_GROUP),
        });
      }
      return { kind: "groups", title: colours.title, entries };
    }
    case "values": {
      let min: number | null = null;
      let max: number | null = null;
      let noneCount = 0;
      for (const [index, value] of colours.values.entries()) {
        if (drawn[index] !== 1) continue;
        if (!Number.isFinite(value)) {
          noneCount += 1;
          continue;
        }
        if (min === null || value < min) min = value;
        if (max === null || value > max) max = value;
      }
      return {
        kind: "values",
        title: colours.title,
        min,
        max,
        noneName: colours.noneName,
        noneCount,
      };
    }
  }
}

/** From the middle of one row of the legend of the file to the next. */
const LEGEND_ROW = 16;
/** Between the background of the legend and its rows, on each side. */
const LEGEND_PADDING = 4;
/** The width of the place of a mark, at the right of each row. */
const LEGEND_MARK = 16;
/** Between the end of the text of a row and its mark. */
const LEGEND_GAP = 6;
/**
 * The width reckoned for a character of the text, 0.6 of its 12 pixels,
 * since nothing measures text (plot2d.md, "The SVG and its frame").
 */
const CHARACTER_WIDTH = 7.2;
/** The bands of viridis of the bar of a colouring by values. */
const BAR_BANDS = 32;
/** The height of the bar of a colouring by values. */
const BAR_HEIGHT = 96;
/** The width of the bar of a colouring by values, centred on the marks. */
const BAR_WIDTH = 10;
/** The steps of viridis a band of the bar stands for, 256 / 32. */
const STEPS_PER_BAND = 256 / BAR_BANDS;
/** The minus sign, U+2212, which the ticks of d3-axis write. */
const MINUS = "−";

const COUNT_FORMAT = new Intl.NumberFormat("en-US");

/** A row of the legend of the file: its text, and its mark if it has one. */
interface SvgRow {
  readonly text: string;
  /** The group whose mark the row shows; null for a row of text alone. */
  readonly group: number | null;
  readonly faded: boolean;
}

/** A value of the bar, as a table of a plot writes it, with the minus sign. */
function valueText(value: number): string {
  return String(tableNumber(value)).replaceAll("-", MINUS);
}

/** The text of an entry: its name and its count, "P1 (48)". */
function entryText(name: string, count: number): string {
  return `${name} (${COUNT_FORMAT.format(count)})`;
}

/**
 * The rows of a legend by groups that fit in `numRows`, the title first:
 * when they do not all fit, the last row that fits says how many entries
 * are left out, "and 12 more".
 */
function groupRows(
  title: string,
  entries: readonly LegendGroup[],
  numRows: number,
): SvgRow[] {
  const rows: SvgRow[] = [
    { text: title, group: null, faded: false },
    ...entries.map((entry) => ({
      text: entryText(entry.name, entry.count),
      group: entry.group,
      faded: entry.faded,
    })),
  ];
  if (rows.length <= numRows) return rows;
  if (numRows <= 0) return [];
  const shown = rows.slice(0, numRows - 1);
  // The title is not an entry.
  const numEntriesShown = Math.max(0, shown.length - 1);
  shown.push({
    text: `and ${COUNT_FORMAT.format(entries.length - numEntriesShown)} more`,
    group: null,
    faded: false,
  });
  return shown;
}

/**
 * Draws `legend` into `group` of an exported SVG, its rows ending at
 * `right` and starting at `top`, in SVG pixels, no row below `bottom`,
 * and its background no wider than from `left` to `right`, the edges of
 * the frame (scatter.md, "The export"). For the scatter and the 3D plot.
 *
 * One row of 16 pixels per entry, the title first, each with its text
 * ending before its mark and its mark at the right; a faded entry's mark
 * with `chart-legend-faded`, and its text as the others. Behind the rows,
 * `rect.chart-legend-background`, as wide as the longest row reckoned at
 * 7.2 pixels per character, with the mark and 4 pixels on each side. When
 * the rows would pass `bottom`, the last row that fits says "and 12 more".
 * For values, a bar of 32 bands of viridis, 96 pixels high, the largest
 * value at its top and the smallest at its bottom, one value when they
 * are the same, and then the ring and "No value (3)" when some points
 * have none. The texts are set as text, never as markup.
 */
export function drawLegendSvg(
  group: Selection<SVGGElement, unknown, null, undefined>,
  legend: Legend,
  left: number,
  right: number,
  top: number,
  bottom: number,
): void {
  group.selectAll("*").remove();
  const background = group
    .append("rect")
    .attr("class", "chart-legend-background")
    .attr("y", top);
  // Where each mark ends, 4 pixels inside the background.
  const rowsRight = right - LEGEND_PADDING;
  const textEnd = -(LEGEND_MARK + LEGEND_GAP);
  const texts: string[] = [];

  /** Draws `row` with its middle at `middle`. */
  function drawRow(row: SvgRow, middle: number): void {
    const g = group
      .append("g")
      .attr("class", "chart-legend-row")
      .attr("transform", `translate(${String(rowsRight)},${String(middle)})`);
    if (row.group !== null) {
      const faded = row.faded ? " chart-legend-faded" : "";
      g.append("path")
        .attr("class", `chart-points ${groupColourClass(row.group)}${faded}`)
        .attr("transform", `translate(${String(-LEGEND_MARK / 2)},0)`)
        .attr("d", symbolPath(row.group));
    }
    g.append("text")
      .attr("class", "chart-legend-text")
      .attr("x", textEnd)
      .attr("dy", "0.35em")
      .text(row.text);
    texts.push(row.text);
  }

  const firstMiddle = top + LEGEND_PADDING + LEGEND_ROW / 2;
  let height = 0;
  switch (legend.kind) {
    case "groups": {
      const numRows = Math.floor(
        (bottom - top - 2 * LEGEND_PADDING) / LEGEND_ROW,
      );
      const rows = groupRows(legend.title, legend.entries, numRows);
      for (const [index, row] of rows.entries()) {
        drawRow(row, firstMiddle + index * LEGEND_ROW);
      }
      height = rows.length * LEGEND_ROW;
      break;
    }
    case "values": {
      drawRow({ text: legend.title, group: null, faded: false }, firstMiddle);
      height = LEGEND_ROW;
      if (legend.min !== null && legend.max !== null) {
        const barTop = top + LEGEND_PADDING + LEGEND_ROW;
        const bandHeight = BAR_HEIGHT / BAR_BANDS;
        const bar = group
          .append("g")
          .attr("class", "chart-legend-bar")
          .attr(
            "transform",
            `translate(${String(rowsRight - (LEGEND_MARK + BAR_WIDTH) / 2)},${String(barTop)})`,
          );
        // Band 0, at the bottom, stands for the first 8 steps of viridis,
        // and is the colour of their middle.
        for (let band = 0; band < BAR_BANDS; band++) {
          bar
            .append("rect")
            .attr("class", "chart-legend-band")
            .attr("x", 0)
            .attr("y", BAR_HEIGHT - (band + 1) * bandHeight)
            .attr("width", BAR_WIDTH)
            .attr("height", bandHeight)
            .attr(
              "fill",
              viridisColour(band * STEPS_PER_BAND + STEPS_PER_BAND / 2),
            );
        }
        const labels: [number, number][] = [
          [legend.max, barTop + LEGEND_ROW / 2],
        ];
        if (legend.min !== legend.max) {
          labels.push([legend.min, barTop + BAR_HEIGHT - LEGEND_ROW / 2]);
        }
        for (const [value, middle] of labels) {
          const text = valueText(value);
          group
            .append("text")
            .attr("class", "chart-legend-text chart-legend-value")
            .attr("x", rowsRight + textEnd)
            .attr("y", middle)
            .attr("dy", "0.35em")
            .text(text);
          texts.push(text);
        }
        height += BAR_HEIGHT;
      }
      if (legend.noneCount > 0) {
        drawRow(
          {
            text: entryText(legend.noneName, legend.noneCount),
            group: NO_GROUP,
            faded: false,
          },
          firstMiddle + height,
        );
        height += LEGEND_ROW;
      }
      break;
    }
  }

  const longest = Math.max(0, ...texts.map((text) => text.length));
  const width = Math.min(
    right - left,
    longest * CHARACTER_WIDTH + LEGEND_GAP + LEGEND_MARK + 2 * LEGEND_PADDING,
  );
  background
    .attr("x", right - width)
    .attr("width", width)
    .attr("height", height === 0 ? 0 : height + 2 * LEGEND_PADDING);
}
