/**
 * The block of the folded site frequency spectrum, below the table of the
 * diversity in its state done (docs/specs/analyses/sfs.md, "The block of
 * the panel"): its heading, which names it as a region of the page; its
 * caption, which the warning of a MAF filter on the spectrum ends, said
 * here beside the histograms and not among the warnings above the table;
 * two tabs, "Histograms", selected when the
 * block is drawn, with one histogram per population on one vertical scale,
 * each in a group named by the heading of its population, one level
 * under the block's, or the line
 * that says why it has none, and the line under them while any population
 * has a histogram; and "Table", the expected numbers and the proportions of
 * every population; under them the download of the spectrum as CSV. A
 * draw of more bars than a histogram draws gives its line in place of the
 * histograms, and the lines of the populations with none under it. Which
 * tab is selected is the block's own state, kept while it is drawn.
 *
 * In the Populations tab of popgen2.html, `page` "popgen2", the warning
 * is in that page's words, and the spectrum is one plot of lines, a line
 * per population, in a tab "Plot" in place of the histograms, with its
 * own "Download…" above it, `SpectrumLines.tsx`, from 12 October 2026;
 * its caption says what the axes of the plot are and what it leaves out.
 * The old button of the download of the spectrum gives way to that menu
 * and to one below the table, "Table as CSV", as every plot and table of
 * that page offers its data (docs/specs/analyses/sfs.md, "On
 * popgen2.html"). The warning is a target of the focus, which the band's
 * link to it gives it (docs/specs/steps/popgen2-band.md, "The warning of
 * the spectrum").
 *
 * Each population's histogram, and on popgen2.html the plot of the lines,
 * is inside an error boundary of its own, so that one that throws takes
 * neither the others nor the table, the fields and the Run of the panel
 * with it; the boundary of the lines draws the heading "Plot" in its
 * place.
 *
 * The histograms go in a grid of as many columns as the width holds, each
 * at least 28rem wide, one column at the width of a phone: the spec leaves
 * their layout to the running application.
 *
 * The block is not drawn again while its result, the name of the variants
 * file, the minimum and the words of its warning are the same: the frame of the panel is drawn
 * again when a notice comes or goes, and the table of a draw of 20,000
 * has 10,001 rows.
 */
import { memo, useId, useMemo, useState } from "react";

import type { HistogramData } from "../../../charts/histogram.ts";
import { MAX_HISTOGRAM_BINS } from "../../../charts/limits.ts";
import { diversityOptions } from "../../../core/analyses/diversity.ts";
import type { DiversityPage } from "../../../core/analyses/diversity.ts";
import { allSpectraCsv, spectraOf } from "../../../core/analyses/sfs.ts";
import { spectrumWarnings } from "../../../core/analyses/sfsWarnings.ts";
import type { SpectrumOfPop } from "../../../core/analyses/sfs.ts";
import { escaped } from "../../../core/project.ts";
import type { DiversityResult } from "../../../worker/protocol.ts";
import { classOf } from "../../classOf.ts";
import { downloadText } from "../../download.ts";
import { ErrorBoundary } from "../../shell/ErrorBoundary.tsx";
import { useAppState } from "../../store.tsx";
import { Button } from "../../widgets/Button.tsx";
import { HistogramPlot } from "../../widgets/HistogramPlot.tsx";
import { Table } from "../../widgets/Table.tsx";
import type { TableColumn, TableRow } from "../../widgets/Table.tsx";
import { Tabs } from "../../widgets/Tabs.tsx";
import { Warning } from "../../widgets/Warning.tsx";
import { SPECTRUM_WARNING_ATTRIBUTE } from "../Warnings.tsx";
import { SpectrumLines } from "./SpectrumLines.tsx";
import styles from "./SpectrumBlock.module.css";
import {
  COUNT_COLUMN,
  HISTOGRAMS_TAB,
  PLOT_TAB,
  SPECTRUM_CSV_LABEL,
  SPECTRUM_HEADING,
  SPECTRUM_TABLE_CAPTION,
  SPECTRUM_TABLE_TAB,
  SPECTRUM_TABLE_WHAT,
  SPECTRUM_TABS_LABEL,
  SPECTRUM_Y_LABEL,
  drawLineOf,
  linesCaption,
  noSpectrumLine,
  populationCells,
  populationColumns,
  populationValues,
  spectrumCaption,
  allSpectraCsvName,
  spectrumDescription,
  tooManyBarsLine,
  underHistogramsLine,
  xLabelOf,
} from "./spectrumWords.ts";

/** The ids of the two tabs. */
const HISTOGRAMS_ID = "histograms";
const TABLE_ID = "table";
type SpectrumTab = typeof HISTOGRAMS_ID | typeof TABLE_ID;

/** What the block is drawn with. */
export interface SpectrumBlockProps {
  /** The result of the diversity, which holds the spectra. */
  readonly result: DiversityResult;
  /** The name of the variants file, which the caption and the download
      name. */
  readonly variantsName: string;
  /** The page it is drawn on, whose words its warning takes, and which
      has the old button of the download on popgen.html alone. */
  readonly page: DiversityPage;
}

/** The block of the spectrum of each population. */
export const SpectrumBlock = memo(function SpectrumBlock({
  result,
  variantsName,
  page,
}: SpectrumBlockProps): React.JSX.Element {
  const headingId = useId();
  const [tab, setTab] = useState<SpectrumTab>(HISTOGRAMS_ID);
  // The warnings of the spectrum, of the project the result is shown
  // under; their words and not the project, so that a change of the
  // project that keeps the result does not draw the block again.
  const warning = useAppState((s) =>
    spectrumWarnings(result, s.project, page)
      .map((found) => found.text)
      .join(" "),
  );
  // The result is shown under the key of the options it was made with.
  const minimum = useAppState(
    (s) => diversityOptions(s.project).minNumIndividuals,
  );
  const spectra = spectraOf(result);
  const draw = spectra.numCalledAlleles;
  const tooMany = Math.floor(draw / 2) > MAX_HISTOGRAM_BINS;
  const anyProportions = spectra.pops.some((pop) => pop.proportions !== null);

  const download = (): void => {
    downloadText(
      allSpectraCsvName(variantsName),
      allSpectraCsv(result),
      "text/csv",
    );
  };

  const histograms = (
    <div className={classOf(styles, "histograms")}>
      {tooMany && (
        <p className={classOf(styles, "line")}>{tooManyBarsLine(draw)}</p>
      )}
      <div className={classOf(styles, "plots")}>
        {spectra.pops.map((pop) => {
          const noSpectrum = noSpectrumLine(pop, minimum, draw);
          // Above the bars a histogram draws, a population with a
          // spectrum has no group: the line above says so for all.
          if (tooMany && noSpectrum === null) return null;
          return (
            <ErrorBoundary
              key={pop.population}
              level={4}
              heading={escaped(pop.population)}
            >
              <PopulationSpectrum
                pop={pop}
                numCalledAlleles={draw}
                yMax={spectra.largestProportion}
                noSpectrum={noSpectrum}
              />
            </ErrorBoundary>
          );
        })}
      </div>
      {!tooMany && anyProportions && (
        <p className={classOf(styles, "muted")}>{underHistogramsLine(draw)}</p>
      )}
    </div>
  );

  return (
    <section aria-labelledby={headingId} className={classOf(styles, "block")}>
      <h3 id={headingId} className={classOf(styles, "blockHeading")}>
        {SPECTRUM_HEADING}
      </h3>
      <div className={classOf(styles, "captionBox")}>
        <p className={classOf(styles, "caption")}>
          {(page === "popgen2" ? linesCaption : spectrumCaption)(
            draw,
            result.passStats.numVars,
            variantsName,
          )}
        </p>
        {warning !== "" && (
          // Reached by the band's link alone, not by the Tab key.
          <div
            tabIndex={-1}
            {...{ [SPECTRUM_WARNING_ATTRIBUTE]: "" }}
            className={classOf(styles, "warning")}
          >
            <Warning>{warning}</Warning>
          </div>
        )}
      </div>
      <Tabs<SpectrumTab>
        label={SPECTRUM_TABS_LABEL}
        selected={tab}
        onChange={setTab}
        tabs={[
          page === "popgen2"
            ? {
                id: HISTOGRAMS_ID,
                label: PLOT_TAB,
                content: (
                  <ErrorBoundary level={4} heading={PLOT_TAB}>
                    <SpectrumLines
                      result={result}
                      variantsName={variantsName}
                      minimum={minimum}
                    />
                  </ErrorBoundary>
                ),
              }
            : { id: HISTOGRAMS_ID, label: HISTOGRAMS_TAB, content: histograms },
          {
            id: TABLE_ID,
            label: SPECTRUM_TABLE_TAB,
            content: (
              <SpectrumTable
                result={result}
                page={page}
                fileName={
                  page === "popgen2" ? allSpectraCsvName(variantsName) : null
                }
              />
            ),
          },
        ]}
      />
      {page === "popgen" && (
        <div>
          <Button label={SPECTRUM_CSV_LABEL} onPress={download} />
        </div>
      )}
    </section>
  );
});

/** What the spectrum of one population is drawn with. */
interface PopulationSpectrumProps {
  /** Its spectrum. */
  readonly pop: SpectrumOfPop;
  /** The size of the draw. */
  readonly numCalledAlleles: number;
  /** The top of every vertical axis, the largest proportion of any
      population. */
  readonly yMax: number;
  /** The line in place of its histogram, or `null` when it has one. */
  readonly noSpectrum: string | null;
}

/** The group of one population: its heading, and its histogram with the
    line of its draw, or the line that says why it has none. */
function PopulationSpectrum({
  pop,
  numCalledAlleles,
  yMax,
  noSpectrum,
}: PopulationSpectrumProps): React.JSX.Element {
  const headingId = useId();
  const proportions = pop.proportions;
  return (
    <div
      role="group"
      aria-labelledby={headingId}
      className={classOf(styles, "population")}
    >
      <h4 id={headingId} className={classOf(styles, "heading")}>
        {escaped(pop.population)}
      </h4>
      {noSpectrum === null && proportions !== null ? (
        <>
          <p className={classOf(styles, "muted")}>{drawLineOf(pop)}</p>
          <SpectrumHistogram
            pop={pop}
            proportions={proportions}
            numCalledAlleles={numCalledAlleles}
            yMax={yMax}
          />
        </>
      ) : (
        <p className={classOf(styles, "line")}>{noSpectrum}</p>
      )}
    </div>
  );
}

/** What the histogram of a population is drawn with. */
interface SpectrumHistogramProps {
  /** Its spectrum. */
  readonly pop: SpectrumOfPop;
  /** Its proportions, which a population with a histogram has. */
  readonly proportions: Float64Array;
  /** The size of the draw. */
  readonly numCalledAlleles: number;
  /** The top of every vertical axis. */
  readonly yMax: number;
}

/** The histogram of a population with proportions, its data made once for
    its spectrum and the shared top, so that it is not drawn again on
    every render (react.md, "Mounting a plot"). */
function SpectrumHistogram({
  pop,
  proportions,
  numCalledAlleles,
  yMax,
}: SpectrumHistogramProps): React.JSX.Element {
  const data = useMemo((): HistogramData => {
    // Each bar one count wide and centred on it, from 0.5 to n / 2 + 0.5.
    const edges = Float64Array.from(
      { length: proportions.length + 1 },
      (_, i) => i + 0.5,
    );
    return {
      title: `The spectrum of ${escaped(pop.population)}`,
      description: spectrumDescription(pop, numCalledAlleles),
      xLabel: xLabelOf(numCalledAlleles),
      yLabel: SPECTRUM_Y_LABEL,
      edges,
      counts: proportions,
      threshold: null,
      yMax,
      xWholeNumbers: true,
    };
  }, [pop, proportions, numCalledAlleles, yMax]);
  return <HistogramPlot data={data} shape="tall" />;
}

/** The table of the spectra: a row per count of the rarer allele, 0 to
    n / 2, and two columns per population, "no value" in those of a
    population not calculated, made once for the result; with its
    "Download…" below it, "Table as CSV" of the values of its cells, saved
    as `fileName`, on popgen2.html, and none with `fileName` `null`; the
    header of a population's proportions in the words of `page`. */
function SpectrumTable({
  result,
  page,
  fileName,
}: {
  readonly result: DiversityResult;
  readonly page: DiversityPage;
  readonly fileName: string | null;
}): React.JSX.Element {
  const { columns, rows } = useMemo(() => {
    const spectra = spectraOf(result);
    const tableColumns: TableColumn[] = [
      { id: "count", label: COUNT_COLUMN, isRowHeader: true, isNumeric: true },
      ...spectra.pops.flatMap((pop, i) =>
        populationColumns(pop.population, page).map(
          (label, j): TableColumn => ({
            id: `pop${String(i)}_${String(j)}`,
            label,
            isNumeric: true,
          }),
        ),
      ),
    ];
    const tableRows = Array.from(
      { length: Math.floor(spectra.numCalledAlleles / 2) + 1 },
      (
        _,
        count,
      ): TableRow & { readonly values: readonly (number | null)[] } => ({
        id: String(count),
        cells: [
          String(count),
          ...spectra.pops.flatMap((pop) => populationCells(pop, count)),
        ],
        values: [
          count,
          ...spectra.pops.flatMap((pop) => populationValues(pop, count)),
        ],
      }),
    );
    return { columns: tableColumns, rows: tableRows };
  }, [result, page]);
  return (
    <Table
      caption={SPECTRUM_TABLE_CAPTION}
      columns={columns}
      rows={rows}
      {...(fileName !== null && {
        download: { what: SPECTRUM_TABLE_WHAT, fileName, waiting: null },
      })}
    />
  );
}
