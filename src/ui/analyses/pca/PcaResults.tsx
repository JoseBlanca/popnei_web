/**
 * The result of the principal components (docs/specs/analyses/pca.md,
 * "What it shows", the result): the bar of controls above the plot, the
 * switch between the 3D view and the 2D plot, the selects of the
 * components and of the colour, and in 3D the buttons of the view; the
 * plot, the 3D view first, or the 2D plot with the words that say why
 * when the browser cannot draw 3D; the legend over it, whose press
 * highlights a group in both plots; the link to the table; the notes; the
 * explained variance and its download; the table of the individuals and
 * its download; and the line of the versions. The frame of
 * `AnalysisPanel.tsx` draws the warnings above it and gives the words of
 * the comparison with the check numbers, drawn under the table.
 *
 * The state of its own is the group highlighted, kept with the colouring
 * it was pressed in and given to the plots only while that colouring is
 * the one drawn; what became of the 3D view, loading, drawn, or not drawn
 * and why; its handle, for the buttons; and the sort of the table.
 */
import { useMemo, useRef, useState } from "react";

import { legendOf } from "../../../charts/legend.ts";
import type { Pca3dHandle } from "../../../charts/pca3d.ts";
import { SCATTER_MARGIN } from "../../../charts/scatter.ts";
import {
  axesShown,
  colourColumns,
  pcaColours,
  pcaCsv,
  pcaOptions,
  pcaRows,
  varianceCsv,
} from "../../../core/analyses/pca.ts";
import type { PcaColours } from "../../../core/analyses/pca.ts";
import { individualStatsOf } from "../../../core/apps.ts";
import { shown } from "../../../core/project.ts";
import type { PcaResult } from "../../../worker/protocol.ts";
import { classOf } from "../../classOf.ts";
import { downloadText } from "../../download.ts";
import { useAnnouncer } from "../../shell/announcer.tsx";
import { useAppState, useStore } from "../../store.tsx";
import { Button } from "../../widgets/Button.tsx";
import { Link } from "../../widgets/Link.tsx";
import { Select } from "../../widgets/Select.tsx";
import { SortableTable } from "../../widgets/SortableTable.tsx";
import type { SortableColumn } from "../../widgets/SortableTable.tsx";
import { Table } from "../../widgets/Table.tsx";
import type { TableSort } from "../../widgets/tableSort.ts";
import { ToggleButtonGroup } from "../../widgets/ToggleButtonGroup.tsx";
import type { ResultsProps } from "../panels.ts";
import { resultOf, statusOf } from "../status.ts";
import { versionsText } from "../words.ts";
import { axisCommand, colourCommand, viewCommand } from "./commands.ts";
import type { OptionCommand } from "./commands.ts";
import { notesAppeared, notesOf } from "./notes.ts";
import { Pca3dView } from "./Pca3dView.tsx";
import type { Pca3dFailure } from "./Pca3dView.tsx";
import { PcaLegend } from "./PcaLegend.tsx";
import styles from "./PcaResults.module.css";
import { pca3dData, scatterData } from "./plotData.ts";
import { ScatterPlot } from "./ScatterPlot.tsx";
import {
  AXIS_LABELS_2D,
  AXIS_LABELS_3D,
  COLOUR_LABEL,
  LOAD_FAILED_3D,
  NO_WEBGL,
  POPULATION_ITEM,
  RESET_VIEW,
  TABLE_CSV_LABEL,
  TILT_DOWN,
  TILT_UP,
  TO_TABLE,
  TRY_AGAIN,
  TURN_LEFT,
  TURN_RIGHT,
  VARIANCE_CSV_LABEL,
  VIEW_2D,
  VIEW_3D,
  VIEW_LABEL,
  ZOOM_IN,
  ZOOM_OUT,
  noteAnnounced,
  pcName,
  pcoaVarianceLine,
  rowCells,
  sortedRows,
  tableCaption,
  tableCsvName,
  varianceCaption,
  varianceCells,
  varianceCsvName,
  viewAlongLabel,
} from "./words.ts";
import type { PcaColumnId } from "./words.ts";

/** The id of the item "Population" of the select of the colour, which no
    column of a metadata file can be: the ids of the columns are their
    names after this prefix. */
const POPULATION_ID = "population";
const COLUMN_PREFIX = "column:";

/** The narrowest each column of the table may be, in CSS pixels: the
    individual, its group or value, and each component, "−10.0000". The
    first two hold their header, its arrow and its padding on one line
    also in DejaVu Sans, the sans-serif font of Ubuntu, whose bold
    "Individual" and "Population" wrapped in the 112 and 128 pixels
    these had, on GitHub's runners on 29 September 2026. */
const INDIVIDUAL_WIDTH = 136;
const COLOUR_WIDTH = 144;
const COMPONENT_WIDTH = 96;

/** The factors of the buttons of the zoom, and the step of the turns, in
    degrees (docs/specs/charts/pca3d.md, "The buttons of the bar above the
    plot"). */
const ZOOM_FACTOR = 1.25;
const TURN_DEGREES = 15;

/** The group pressed in the legend, with the colouring it was pressed
    in. */
interface Pressed {
  readonly colours: PcaColours;
  readonly group: number;
}

/** The result of the principal components, as the panel shows it. */
export function PcaResults({ result, check }: ResultsProps): React.JSX.Element {
  if (result.analysis !== "pca") {
    throw new Error(
      `popnei_web defect: the panel of the principal components was given a result of ${result.analysis}.`,
    );
  }
  return <PcaResultOf result={result} check={check} />;
}

/** What the result is drawn with, once it is the PCA's. */
interface PcaResultOfProps {
  readonly result: PcaResult;
  readonly check: string | null;
}

function PcaResultOf({ result, check }: PcaResultOfProps): React.JSX.Element {
  const store = useStore();
  const announcer = useAnnouncer();
  const project = useAppState((s) => s.project);
  const popneiVersion = useAppState((s) => s.popneiVersion);
  const checks = useAppState((s) =>
    resultOf(statusOf(s, "individualChecks"), "individualChecks"),
  );
  const options = pcaOptions(project);
  // The same object for the same result, table, grouping and option, so
  // that the highlight is kept with it.
  const colours = pcaColours(result, project);
  const columns = colourColumns(project);
  const shownAxes = axesShown(options, result);
  const axes = shownAxes.axes;
  const axesKey = axes.join(",");
  const stats = checks === null ? null : individualStatsOf(checks);
  const notes = notesOf(result, project, stats);

  const [pressed, setPressed] = useState<Pressed | null>(null);
  const highlighted =
    pressed !== null && pressed.colours === colours ? pressed.group : null;
  const [failure3d, setFailure3d] = useState<Pca3dFailure | null>(null);
  const [handle, setHandle] = useState<Pca3dHandle | null>(null);
  const [sort, setSort] = useState<TableSort<PcaColumnId> | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const why2dRef = useRef<HTMLDivElement>(null);

  const numComps = result.numComps;
  const plot: "none" | "2d" | "3d" =
    numComps < 2 ? "none" : numComps < 3 || options.view === "2d" ? "2d" : "3d";
  // In 3D, the view when it can be drawn; the 2D plot in its place when
  // three.js could not be downloaded or the browser has no WebGL 2.
  const drawn: "none" | "2d" | "3d" =
    plot === "3d" && failure3d !== null ? "2d" : plot;

  const variants = project.variants;
  // The data of the plot drawn, made again only when what it is made of
  // changes, since a plot given new data draws again.
  const data2d = useMemo(
    () =>
      drawn === "2d"
        ? scatterData(
            result,
            colours,
            axesKey.split(",").map(Number),
            highlighted,
            project,
          )
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the project only for the name of its variants file, in the description
    [drawn, result, colours, axesKey, highlighted, variants],
  );
  const data3d = useMemo(
    () =>
      drawn === "3d"
        ? pca3dData(
            result,
            colours,
            axesKey.split(",").map(Number),
            highlighted,
            project,
          )
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the project only for the name of its variants file, in the description
    [drawn, result, colours, axesKey, highlighted, variants],
  );
  const legend = useMemo(() => {
    const data = data3d ?? data2d;
    if (data === null) return null;
    const coordinates =
      "z" in data ? [data.x, data.y, data.z] : [data.x, data.y];
    return legendOf(data.colours, coordinates);
  }, [data2d, data3d]);

  // The rows of the table, the same objects in every order, and their
  // cells, made again only when the result or the colouring change.
  const rows = pcaRows(result, colours);
  const cellsOf = useMemo(
    () =>
      new Map(
        rows.map((row) => [
          row,
          { id: row.individual, cells: rowCells(row, colours.noneName) },
        ]),
      ),
    [rows, colours.noneName],
  );
  const tableRows = useMemo(
    () =>
      sortedRows(rows, sort).map((row) => {
        const cells = cellsOf.get(row);
        if (cells === undefined) {
          throw new Error(
            `popnei_web defect: the row of ${row.individual} has no cells.`,
          );
        }
        return cells;
      }),
    [rows, sort, cellsOf],
  );
  const tableColumns = useMemo<readonly SortableColumn<PcaColumnId>[]>(
    () => [
      {
        id: "individual",
        label: "Individual",
        isRowHeader: true,
        minWidth: INDIVIDUAL_WIDTH,
      },
      {
        id: "colour",
        label: shown(colours.title),
        // A column of numbers, right-aligned as the components are.
        isNumeric: colours.kind === "values",
        minWidth: COLOUR_WIDTH,
      },
      ...Array.from({ length: numComps }, (_, i) => ({
        id: `pc${String(i + 1)}` as const,
        label: pcName(i + 1),
        isNumeric: true,
        minWidth: COMPONENT_WIDTH,
      })),
    ],
    [colours.title, colours.kind, numComps],
  );

  if (variants === null || popneiVersion === null) {
    throw new Error(
      "popnei_web defect: a result of the principal components is shown with no variants file or no version of popnei.",
    );
  }
  const variantsName = variants.name;

  /** Applies an option, and announces the notes it made appear, since the
      focus is then on the control that made them. */
  const applyShown = (step: OptionCommand): void => {
    const before = notesOf(result, store.getState().project, stats);
    store.apply(step.description, step.command);
    const after = notesOf(result, store.getState().project, stats);
    for (const note of notesAppeared(before, after)) {
      announcer.announce(noteAnnounced(note));
    }
  };

  const colourItems = [
    { id: POPULATION_ID, label: POPULATION_ITEM },
    ...columns.map((column) => ({
      id: `${COLUMN_PREFIX}${column}`,
      label: shown(column),
    })),
  ];
  const colourValue =
    options.colourBy === null
      ? POPULATION_ID
      : columns.includes(options.colourBy)
        ? `${COLUMN_PREFIX}${options.colourBy}`
        : null;

  const axisItems = Array.from({ length: numComps }, (_, i) => ({
    id: String(i + 1),
    label: pcName(i + 1),
  }));
  const axisLabels = drawn === "3d" ? AXIS_LABELS_3D : AXIS_LABELS_2D;
  const axesDrawn = drawn === "3d" ? axes : axes.slice(0, 2);

  const variancePcoa = pcoaVarianceLine(result);

  return (
    <div className={classOf(styles, "results")}>
      <div className={classOf(styles, "bar")}>
        {plot !== "none" && (
          <ToggleButtonGroup
            label={VIEW_LABEL}
            look="segments"
            orientation="horizontal"
            keepsOne
            value={plot}
            items={[
              { id: "3d", label: VIEW_3D, isDisabled: numComps < 3 },
              { id: "2d", label: VIEW_2D },
            ]}
            onChange={(view) => {
              if (view === null || view === options.view) return;
              if (view === "3d") setFailure3d(null);
              applyShown(viewCommand(view));
            }}
          />
        )}
        {drawn !== "none" &&
          axesDrawn.map((component, axis) => (
            <Select
              key={axisLabels[axis]}
              label={axisLabels[axis] ?? ""}
              items={axisItems}
              value={String(component)}
              onChange={(id) => {
                applyShown(axisCommand(axes, axis, Number(id)));
              }}
            />
          ))}
        <Select
          label={COLOUR_LABEL}
          items={colourItems}
          value={colourValue}
          onChange={(id) => {
            applyShown(
              colourCommand(
                id === POPULATION_ID ? null : id.slice(COLUMN_PREFIX.length),
              ),
            );
          }}
        />
        {drawn === "3d" && handle !== null && (
          <div className={classOf(styles, "viewButtons")}>
            <Button
              label={TURN_LEFT}
              onPress={() => {
                handle.rotate("vertical", -TURN_DEGREES);
              }}
            />
            <Button
              label={TURN_RIGHT}
              onPress={() => {
                handle.rotate("vertical", TURN_DEGREES);
              }}
            />
            <Button
              label={TILT_UP}
              onPress={() => {
                handle.rotate("horizontal", TURN_DEGREES);
              }}
            />
            <Button
              label={TILT_DOWN}
              onPress={() => {
                handle.rotate("horizontal", -TURN_DEGREES);
              }}
            />
            {([0, 1, 2] as const).map((component) => (
              <Button
                key={component}
                label={viewAlongLabel(axes[component] ?? component + 1)}
                onPress={() => {
                  handle.viewAlong(component);
                }}
              />
            ))}
            <Button
              label={ZOOM_IN}
              onPress={() => {
                handle.zoom(ZOOM_FACTOR);
              }}
            />
            <Button
              label={ZOOM_OUT}
              onPress={() => {
                handle.zoom(1 / ZOOM_FACTOR);
              }}
            />
            <Button
              label={RESET_VIEW}
              onPress={() => {
                handle.resetView();
              }}
            />
          </div>
        )}
      </div>
      {plot === "3d" && failure3d !== null && (
        <div ref={why2dRef} className={classOf(styles, "why2d")}>
          <p className={classOf(styles, "line")}>
            {failure3d === "load" ? LOAD_FAILED_3D : NO_WEBGL}
          </p>
          {failure3d === "load" && (
            <Button
              label={TRY_AGAIN}
              onPress={() => {
                // The button goes with the words: the focus moves to the
                // heading of the panel, as when Run or Stop goes, and not
                // to the start of the page (WCAG 2.4.3).
                why2dRef.current
                  ?.closest("section")
                  ?.querySelector<HTMLElement>("h2")
                  ?.focus();
                setFailure3d(null);
              }}
            />
          )}
        </div>
      )}
      {drawn !== "none" && (
        <div className={classOf(styles, "plotArea")}>
          {data3d !== null ? (
            <Pca3dView
              data={data3d}
              onHandle={setHandle}
              onFailed={(failure) => {
                setFailure3d(failure);
                announcer.announce(
                  failure === "load" ? LOAD_FAILED_3D : NO_WEBGL,
                );
              }}
            />
          ) : (
            data2d !== null && <ScatterPlot data={data2d} />
          )}
          {legend !== null && (
            <PcaLegend
              legend={legend}
              highlighted={highlighted}
              onHighlight={(group) => {
                setPressed(group === null ? null : { colours, group });
              }}
              top={SCATTER_MARGIN.top}
              right={SCATTER_MARGIN.right}
            />
          )}
        </div>
      )}
      {drawn !== "none" && (
        <Link
          label={TO_TABLE}
          onPress={() => {
            tableRef.current
              ?.querySelector<HTMLElement>('[role="grid"]')
              ?.focus();
          }}
        />
      )}
      {notes.length > 0 && (
        <ul className={classOf(styles, "notes")}>
          {notes.map((note) => (
            <li key={note} className={classOf(styles, "line")}>
              {noteAnnounced(note)}
            </li>
          ))}
        </ul>
      )}
      <div className={classOf(styles, "part")}>
        <Table
          caption={varianceCaption(result)}
          columns={[
            { id: "component", label: "Component", isRowHeader: true },
            { id: "percent", label: "Explained variance", isNumeric: true },
          ]}
          rows={varianceCells(result).map(([component, percent]) => ({
            id: component,
            cells: [component, percent],
          }))}
        />
        {variancePcoa !== null && (
          <p className={classOf(styles, "line")}>{variancePcoa}</p>
        )}
        <Button
          label={VARIANCE_CSV_LABEL}
          onPress={() => {
            downloadText(
              varianceCsvName(variantsName, result.method),
              varianceCsv(result),
              "text/csv",
            );
          }}
        />
      </div>
      <div className={classOf(styles, "part")}>
        <p className={classOf(styles, "line")}>
          {tableCaption(result, variantsName)}
        </p>
        <div ref={tableRef} className={classOf(styles, "table")}>
          <SortableTable
            label={tableCaption(result, variantsName)}
            columns={tableColumns}
            rows={tableRows}
            sort={sort}
            onSortChange={setSort}
            headingLines={1}
          />
        </div>
        {check !== null && <p className={classOf(styles, "line")}>{check}</p>}
        <div className={classOf(styles, "download")}>
          <Button
            label={TABLE_CSV_LABEL}
            onPress={() => {
              downloadText(
                tableCsvName(variantsName, result.method),
                pcaCsv(result, colours),
                "text/csv",
              );
            }}
          />
          <p className={classOf(styles, "muted")}>
            {versionsText(popneiVersion, APP_VERSION)}
          </p>
        </div>
      </div>
    </div>
  );
}
