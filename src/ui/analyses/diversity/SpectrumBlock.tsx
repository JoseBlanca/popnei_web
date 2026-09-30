/**
 * The block of the folded site frequency spectrum, below the table of the
 * diversity in its state done (docs/specs/analyses/sfs.md, "The block of
 * the panel"): its caption; two tabs, "Histograms", selected when the
 * block is drawn, with one histogram per population on one vertical scale,
 * each in a group named by the heading of its population, or the line
 * that says why it has none, and the line under them; and "Table", the
 * expected numbers and the shares of every population; under them the
 * download of the spectrum as CSV. Which tab is selected is the block's
 * own state, kept while it is drawn.
 *
 * The histograms go in a grid of as many columns as the width holds, each
 * at least 28rem wide, one column at the width of a phone: the spec leaves
 * their layout to the running application.
 */
import { useId, useMemo, useState } from "react";

import type { HistogramData } from "../../../charts/histogram.ts";
import { MAX_HISTOGRAM_BINS } from "../../../charts/limits.ts";
import { diversityOptions } from "../../../core/analyses/diversity.ts";
import { spectraCsv, spectraOf } from "../../../core/analyses/sfs.ts";
import type { SpectrumOfPop } from "../../../core/analyses/sfs.ts";
import { escaped } from "../../../core/project.ts";
import type { DiversityResult } from "../../../worker/protocol.ts";
import { classOf } from "../../classOf.ts";
import { downloadText } from "../../download.ts";
import { useAppState } from "../../store.tsx";
import { Button } from "../../widgets/Button.tsx";
import { Table } from "../../widgets/Table.tsx";
import type { TableColumn, TableRow } from "../../widgets/Table.tsx";
import { Tabs } from "../../widgets/Tabs.tsx";
import styles from "./SpectrumBlock.module.css";
import { SpectrumPlot } from "./SpectrumPlot.tsx";
import {
  COUNT_COLUMN,
  HISTOGRAMS_TAB,
  SPECTRUM_CSV_LABEL,
  SPECTRUM_TABLE_CAPTION,
  SPECTRUM_TABLE_TAB,
  SPECTRUM_TABS_LABEL,
  SPECTRUM_Y_LABEL,
  drawLineOf,
  noSpectrumLine,
  populationCells,
  populationColumns,
  spectrumCaption,
  spectrumCsvName,
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
}

/** The block of the spectrum of each population. */
export function SpectrumBlock({
  result,
  variantsName,
}: SpectrumBlockProps): React.JSX.Element {
  const captionId = useId();
  const [tab, setTab] = useState<SpectrumTab>(HISTOGRAMS_ID);
  // The result is shown under the key of the options it was made with.
  const minimum = useAppState(
    (s) => diversityOptions(s.project).minNumIndividuals,
  );
  const spectra = spectraOf(result);
  const n = spectra.numCalledAlleles;
  const tooMany = Math.floor(n / 2) > MAX_HISTOGRAM_BINS;

  const download = (): void => {
    downloadText(spectrumCsvName(variantsName), spectraCsv(result), "text/csv");
  };

  return (
    <section aria-labelledby={captionId} className={classOf(styles, "block")}>
      <p id={captionId} className={classOf(styles, "caption")}>
        {spectrumCaption(n, result.passStats.numVars, variantsName)}
      </p>
      <Tabs<SpectrumTab>
        label={SPECTRUM_TABS_LABEL}
        selected={tab}
        onChange={setTab}
        tabs={[
          {
            id: HISTOGRAMS_ID,
            label: HISTOGRAMS_TAB,
            content: tooMany ? (
              <p className={classOf(styles, "line")}>{tooManyBarsLine(n)}</p>
            ) : (
              <div className={classOf(styles, "histograms")}>
                <div className={classOf(styles, "plots")}>
                  {spectra.pops.map((pop, i) => (
                    <PopulationSpectrum
                      key={pop.population}
                      pop={pop}
                      numCalledAlleles={n}
                      yMax={spectra.largestShare}
                      noSpectrum={noSpectrumLine(
                        pop,
                        result.numIndividuals[i] ?? 0,
                        minimum,
                        n,
                      )}
                    />
                  ))}
                </div>
                <p className={classOf(styles, "muted")}>
                  {underHistogramsLine(n)}
                </p>
              </div>
            ),
          },
          {
            id: TABLE_ID,
            label: SPECTRUM_TABLE_TAB,
            content: <SpectrumTable result={result} />,
          },
        ]}
      />
      <div>
        <Button label={SPECTRUM_CSV_LABEL} onPress={download} />
      </div>
    </section>
  );
}

/** What the spectrum of one population is drawn with. */
interface PopulationSpectrumProps {
  /** Its spectrum. */
  readonly pop: SpectrumOfPop;
  /** The size of the draw. */
  readonly numCalledAlleles: number;
  /** The top of every vertical axis, the largest share of any
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
  return (
    <div
      role="group"
      aria-labelledby={headingId}
      className={classOf(styles, "population")}
    >
      <h3 id={headingId} className={classOf(styles, "heading")}>
        {escaped(pop.population)}
      </h3>
      {noSpectrum === null ? (
        <>
          <p className={classOf(styles, "muted")}>{drawLineOf(pop)}</p>
          <SpectrumHistogram
            pop={pop}
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

/** The histogram of a population with shares, its data made once for
    its spectrum and the shared top, so that it is not drawn again on
    every render (react.md, "Mounting a plot"). */
function SpectrumHistogram({
  pop,
  numCalledAlleles,
  yMax,
}: Omit<PopulationSpectrumProps, "noSpectrum">): React.JSX.Element {
  const data = useMemo((): HistogramData => {
    const shares = pop.shares ?? new Float64Array(0);
    // Each bar one count wide and centred on it, from 0.5 to n / 2 + 0.5.
    const edges = Float64Array.from(
      { length: shares.length + 1 },
      (_, i) => i + 0.5,
    );
    return {
      title: `The spectrum of ${escaped(pop.population)}`,
      description: spectrumDescription(pop, numCalledAlleles),
      xLabel: xLabelOf(numCalledAlleles),
      yLabel: SPECTRUM_Y_LABEL,
      edges,
      counts: shares,
      threshold: null,
      yMax,
      xWholeNumbers: true,
    };
  }, [pop, numCalledAlleles, yMax]);
  return <SpectrumPlot data={data} />;
}

/** The table of the spectra: a row per count of the rarer allele, 0 to
    n / 2, and two columns per population calculated, made once for the
    result. */
function SpectrumTable({
  result,
}: {
  readonly result: DiversityResult;
}): React.JSX.Element {
  const { columns, rows } = useMemo(() => {
    const spectra = spectraOf(result);
    const shown = spectra.pops.filter((pop) => pop.calculated);
    const tableColumns: TableColumn[] = [
      { id: "count", label: COUNT_COLUMN, isRowHeader: true, isNumeric: true },
      ...shown.flatMap((pop, i) =>
        populationColumns(pop.population).map((label, j): TableColumn => ({
          id: `pop${String(i)}_${String(j)}`,
          label,
          isNumeric: true,
        })),
      ),
    ];
    const tableRows: TableRow[] = Array.from(
      { length: Math.floor(spectra.numCalledAlleles / 2) + 1 },
      (_, count) => ({
        id: String(count),
        cells: [
          String(count),
          ...shown.flatMap((pop) => populationCells(pop, count)),
        ],
      }),
    );
    return { columns: tableColumns, rows: tableRows };
  }, [result]);
  return (
    <Table caption={SPECTRUM_TABLE_CAPTION} columns={columns} rows={rows} />
  );
}
