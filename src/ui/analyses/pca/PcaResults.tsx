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
 * On popgen2.html (docs/specs/steps/popgen2-pca.md, "The result" and
 * "The downloads") the plot has a title, "Principal components of
 * panel.nei", with the menu "Download…" of the plot at the end of its
 * line, before the bar of controls: its images from the handle of the
 * plot drawn, 2D or 3D, and its data the coordinates vavilov-explorer
 * imports, `pcaCoordinatesCsv`; the menu waits while three.js downloads.
 * Each table has its menu in the place of the old buttons, and the 3D
 * view that could not be downloaded says to reload the page, since the
 * page saves no project.
 *
 * The state of its own is the group highlighted, kept with the colouring
 * it was pressed in and given to the plots only while that colouring is
 * the one drawn; what became of the 3D view, loading, drawn, or not drawn
 * and why; its handle, for the buttons; and the sort of the table.
 */
import { useEffect, useMemo, useRef, useState } from "react";

import { legendOf } from "../../../charts/legend.ts";
import type { Pca3dHandle } from "../../../charts/pca3d.ts";
import { SCATTER_MARGIN } from "../../../charts/scatter.ts";
import type { ScatterData } from "../../../charts/scatter.ts";
import type { ChartHandle } from "../../../charts/types.ts";
import {
  axesShown,
  colourColumns,
  pcaColours,
  pcaCoordinatesCsv,
  pcaCsv,
  pcaOptions,
  pcaPageOf,
  pcaRows,
  varianceCsv,
} from "../../../core/analyses/pca.ts";
import type { PcaColours, PcaPage } from "../../../core/analyses/pca.ts";
import { individualStatsOf, summaryStatsOf } from "../../../core/apps.ts";
import { downloadName, variantsStem } from "../../../core/fileNames.ts";
import { shown } from "../../../core/project.ts";
import type { AnalysisDef } from "../../../core/store.ts";
import type { Job, JobResult, PcaResult } from "../../../worker/protocol.ts";
import { classOf } from "../../classOf.ts";
import { downloadText } from "../../download.ts";
import { useAnnouncer } from "../../shell/announcer.tsx";
import { useAppState, useStore } from "../../store.tsx";
import { Button } from "../../widgets/Button.tsx";
import { DownloadMenu } from "../../widgets/DownloadMenu.tsx";
import { plotItems } from "../../widgets/downloadItems.ts";
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
import {
  axisCommand,
  colourCommand,
  commandPageOf,
  viewCommand,
} from "./commands.ts";
import type { OptionCommand } from "../optionCommand.ts";
import { notesAppeared, notesOf } from "./notes.ts";
import { Pca3dView } from "./Pca3dView.tsx";
import type { Pca3dFailure } from "./Pca3dView.tsx";
import { PcaLegend } from "./PcaLegend.tsx";
import styles from "./PcaResults.module.css";
import { pca3dData, scatterData } from "./plotData.ts";
import { ScatterPlot } from "./ScatterPlot.tsx";
import { whenShown } from "./whenShown.ts";
import {
  AXIS_LABELS_2D,
  AXIS_LABELS_3D,
  COLOUR_LABEL,
  LOAD_FAILED_3D,
  NO_WEBGL,
  PLOT_WAITS_3D,
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
  pcaDownloadWhat,
  pcaResultTitle,
  pcaTabLoadFailed3d,
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

/** What the result of the principal components is drawn with. */
interface PcaResultsProps extends ResultsProps {
  /** The definition of the principal components the store runs, `pca`
      or `pcaOnPopgen2`, whose page gives the options, the colours and
      the notes. */
  readonly analysis: AnalysisDef<Job, JobResult>;
}

/** The result of the principal components, as the panel shows it. */
export function PcaResults({
  result,
  check,
  analysis,
}: PcaResultsProps): React.JSX.Element {
  if (result.analysis !== "pca") {
    throw new Error(
      `popnei_web defect: the panel of the principal components was given a result of ${result.analysis}.`,
    );
  }
  return (
    <PcaResultOf result={result} check={check} page={pcaPageOf(analysis)} />
  );
}

/** What the result is drawn with, once it is the PCA's. */
interface PcaResultOfProps {
  readonly result: PcaResult;
  readonly check: string | null;
  readonly page: PcaPage;
}

function PcaResultOf({
  result,
  check,
  page,
}: PcaResultOfProps): React.JSX.Element {
  const store = useStore();
  const announcer = useAnnouncer();
  const project = useAppState((s) => s.project);
  const popneiVersion = useAppState((s) => s.popneiVersion);
  // The statistics of each individual: on popgen.html the result of
  // their own analysis; on popgen2.html that of the one pass, which
  // calculates them, the store of that page having no other.
  const checks = useAppState((s) =>
    page === "popgen"
      ? resultOf(statusOf(s, "individualChecks"), "individualChecks")
      : null,
  );
  const summary = useAppState((s) =>
    page === "popgen2"
      ? resultOf(statusOf(s, "variantsSummary"), "variantsSummary")
      : null,
  );
  const options = pcaOptions(project, page);
  const commandPage = commandPageOf(page, options.method);
  // The same object for the same result, table, grouping and option, so
  // that the highlight is kept with it.
  const colours = pcaColours(result, project, page);
  const columns = colourColumns(project);
  const shownAxes = axesShown(options, result);
  const axes = shownAxes.axes;
  const axesKey = axes.join(",");
  const stats =
    checks !== null
      ? individualStatsOf(checks)
      : summary !== null
        ? summaryStatsOf(summary)
        : null;
  const notes = notesOf(result, project, stats, page);

  const [pressed, setPressed] = useState<Pressed | null>(null);
  const highlighted =
    pressed !== null && pressed.colours === colours ? pressed.group : null;
  const [failure3d, setFailure3d] = useState<Pca3dFailure | null>(null);
  const [handle, setHandle] = useState<Pca3dHandle | null>(null);
  const [sort, setSort] = useState<TableSort<PcaColumnId> | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const why2dRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  // Stops waiting for the result to be shown to say why the 3D view was
  // not drawn: a failure in a tab hidden is said when the tab is shown,
  // as "Loading the 3D view…" is.
  const stopSaying3d = useRef<() => void>(() => undefined);
  useEffect(
    () => () => {
      stopSaying3d.current();
    },
    [],
  );
  // The handle of the 2D plot, for the images of its menu on
  // popgen2.html.
  const scatterRef = useRef<ChartHandle<ScatterData> | null>(null);
  const onPopgen2 = page === "popgen2";

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
            page,
          )
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the project only for the name of its variants file, in the description
    [drawn, result, colours, axesKey, highlighted, variants, page],
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
            page,
          )
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the project only for the name of its variants file, in the description
    [drawn, result, colours, axesKey, highlighted, variants, page],
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
          {
            id: row.individual,
            cells: rowCells(row, colours.noneName),
            // The values as stored, which the CSV of the table holds.
            values: [row.individual, row.colour, ...row.projections],
          },
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
        csvLabel: colours.title,
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
  const stem = variantsStem(variantsName);
  const method = result.method;
  const loadFailed3d = onPopgen2
    ? pcaTabLoadFailed3d(method, variantsName)
    : LOAD_FAILED_3D;

  /** Applies an option, and announces the notes it made appear, since the
      focus is then on the control that made them. */
  const applyShown = (step: OptionCommand): void => {
    const before = notesOf(result, store.getState().project, stats, page);
    store.apply(step.description, step.command);
    const after = notesOf(result, store.getState().project, stats, page);
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
  const varianceRows = varianceCells(result).map(([component, percent], i) => ({
    id: component,
    cells: [component, percent],
    values: [component, result.explainedVariancePercent[i] ?? null],
  }));
  const varianceColumns = [
    { id: "component", label: "Component", isRowHeader: true },
    { id: "percent", label: "Explained variance", isNumeric: true },
  ];

  // The images of the plot drawn, from its handle at the choice: the 3D
  // view's once three.js has drawn it, which the menu waits for.
  const plotHandle = {
    get current(): ChartHandle<ScatterData> | Pca3dHandle | null {
      return drawn === "3d" ? handle : scatterRef.current;
    },
  };

  return (
    <div ref={resultsRef} className={classOf(styles, "results")}>
      {onPopgen2 && drawn !== "none" && (
        <div className={classOf(styles, "titleLine")}>
          <h3 className={classOf(styles, "title")}>
            {pcaResultTitle(method, variantsName)}
          </h3>
          <div className={classOf(styles, "titleMenu")}>
            <DownloadMenu
              what={pcaDownloadWhat("plot", method)}
              items={plotItems(
                {
                  what: pcaDownloadWhat("plot", method),
                  stem,
                  imageWhat: method,
                  csvWhat: `${method}.coordinates`,
                  csv: () => pcaCoordinatesCsv(result),
                  waiting: null,
                },
                plotHandle,
              )}
              waiting={drawn === "3d" && handle === null ? PLOT_WAITS_3D : null}
            />
          </div>
        </div>
      )}
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
              applyShown(viewCommand(view, commandPage));
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
                applyShown(axisCommand(axes, axis, Number(id), commandPage));
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
                commandPage,
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
            {failure3d === "load" ? loadFailed3d : NO_WEBGL}
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
        <div
          className={
            onPopgen2
              ? `${classOf(styles, "plotArea")} ${classOf(styles, "legendBelow")}`
              : classOf(styles, "plotArea")
          }
        >
          {data3d !== null ? (
            <Pca3dView
              data={data3d}
              onHandle={setHandle}
              onFailed={(failure) => {
                setFailure3d(failure);
                const words = failure === "load" ? loadFailed3d : NO_WEBGL;
                stopSaying3d.current();
                stopSaying3d.current = whenShown(resultsRef.current, () => {
                  announcer.announce(words);
                });
              }}
            />
          ) : (
            data2d !== null && (
              <ScatterPlot
                data={data2d}
                onHandle={(drawn2d) => {
                  scatterRef.current = drawn2d;
                }}
              />
            )
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
        {onPopgen2 ? (
          <Table
            caption={varianceCaption(result)}
            columns={varianceColumns}
            rows={varianceRows}
            download={{
              what: pcaDownloadWhat("variance", method),
              fileName: downloadName(stem, `${method}.variance`, "csv"),
              waiting: null,
            }}
          />
        ) : (
          <Table
            caption={varianceCaption(result)}
            columns={varianceColumns}
            rows={varianceRows}
          />
        )}
        {variancePcoa !== null && (
          <p className={classOf(styles, "line")}>{variancePcoa}</p>
        )}
        {!onPopgen2 && (
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
        )}
      </div>
      <div className={classOf(styles, "part")}>
        <p className={classOf(styles, "line")}>
          {tableCaption(result, variantsName)}
        </p>
        <div ref={tableRef} className={classOf(styles, "table")}>
          {onPopgen2 ? (
            <SortableTable
              label={tableCaption(result, variantsName)}
              columns={tableColumns}
              rows={tableRows}
              sort={sort}
              onSortChange={setSort}
              headingLines={1}
              moreColumnsCue
              download={{
                what: pcaDownloadWhat("table", method),
                fileName: downloadName(stem, `${method}.table`, "csv"),
                waiting: null,
              }}
            />
          ) : (
            <SortableTable
              label={tableCaption(result, variantsName)}
              columns={tableColumns}
              rows={tableRows}
              sort={sort}
              onSortChange={setSort}
              headingLines={1}
            />
          )}
        </div>
        {check !== null && <p className={classOf(styles, "line")}>{check}</p>}
        <div className={classOf(styles, "download")}>
          {!onPopgen2 && (
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
          )}
          <p className={classOf(styles, "muted")}>
            {versionsText(popneiVersion, APP_VERSION)}
          </p>
        </div>
      </div>
    </div>
  );
}
