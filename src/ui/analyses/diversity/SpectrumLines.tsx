/**
 * The plot of the spectrum as lines, in the tab "Plot" of the block of
 * the spectrum of popgen2.html (docs/specs/analyses/sfs.md, "On
 * popgen2.html"): the lines of the populations with none above it; its
 * "Download…" on a line of its own above the plot, "Image as SVG",
 * "Image as PNG" and "Data as CSV", the CSV of `spectrumLinesCsv`; the
 * plot, `createLine` of src/charts/line.ts mounted by `usePlot`, a line
 * per population in the colour and the shape of its place among the
 * populations of the project, as in the principal components, with its
 * legend; and under it the variants of each population
 * with both alleles in the draw, which its proportions are over, and, for
 * an even draw, the line of the points at 0.5.
 * A draw whose lines hold more points than the plot draws gives its line
 * in place of the plot, the menu and the lines under it.
 *
 * The plot's element is as wide as the block and never wider, so that at
 * 320 px it fits the page with no sideways scroll; the legend of the line
 * plot stands above the frame in a narrow element, and the element is
 * then higher by what that legend asks (`lineLegendRoom`), as the CSS
 * beside it reads from three lengths set here.
 */
import { useMemo } from "react";

import { createLine, lineLegendRoom } from "../../../charts/line.ts";
import {
  spectraOf,
  spectrumLinesCsv,
  spectrumLinesOf,
} from "../../../core/analyses/sfs.ts";
import { variantsStem } from "../../../core/fileNames.ts";
import { populationsOf } from "../../../core/project.ts";
import type { DiversityResult } from "../../../worker/protocol.ts";
import { classOf } from "../../classOf.ts";
import { plotItems } from "../../widgets/downloadItems.ts";
import { DownloadMenu } from "../../widgets/DownloadMenu.tsx";
import { useAppState } from "../../store.tsx";
import { usePlot } from "../../widgets/usePlot.ts";
import styles from "./SpectrumLines.module.css";
import { spectrumPlotData, tooManyPoints } from "./spectrumPlotData.ts";
import {
  LINES_WHAT,
  bothAllelesOf,
  halfPointsLine,
  linesDescription,
  noSpectrumLine,
  tooManyPointsLine,
  variantsInDrawLine,
} from "./spectrumWords.ts";

/** What the images of the plot are, in the names of their files:
    `panel.sfs.svg`. */
const IMAGE_WHAT = "sfs";

/** What its data are, in the name of their file:
    `panel.sfs.proportions.csv`. */
const CSV_WHAT = "sfs.proportions";

/** The lengths the CSS of the plot reads, by their names there. */
type LegendLengths = React.CSSProperties &
  Record<
    | "--legend-narrow-under"
    | "--legend-narrow-height"
    | "--legend-narrow-width",
    string
  >;

/** What the plot of the spectrum is drawn with. */
export interface SpectrumLinesProps {
  /** The result of the diversity, which holds the spectra. */
  readonly result: DiversityResult;
  /** The name of the variants file, which the files are named after. */
  readonly variantsName: string;
  /** The minimum of individuals of the options the result was made
      with, which the line of a population left out of the call names. */
  readonly minimum: number;
}

/** The tab "Plot" of the block of the spectrum of popgen2.html. */
export function SpectrumLines({
  result,
  variantsName,
  minimum,
}: SpectrumLinesProps): React.JSX.Element {
  const spectra = spectraOf(result);
  const spectrum = spectrumLinesOf(result);
  const draw = spectrum.numCalledAlleles;
  const noLines = spectra.pops
    .map((pop) => noSpectrumLine(pop, minimum, draw, "line"))
    .filter((line) => line !== null);
  const drawn = spectrum.lines.length > 0;
  const tooMany = tooManyPoints(draw, spectrum.lines.length);
  const half = halfPointsLine(draw);
  const withLine = spectrum.lines.map((line) => {
    const pop = spectra.pops[line.index];
    if (pop === undefined) {
      throw new Error(
        `popnei_web defect: the line of ${line.population} has no spectrum.`,
      );
    }
    return { population: pop.population, bothAlleles: bothAllelesOf(pop) };
  });

  return (
    <div className={classOf(styles, "lines")}>
      {noLines.map((line) => (
        <p key={line} className={classOf(styles, "line")}>
          {line}
        </p>
      ))}
      {drawn && tooMany && (
        <p className={classOf(styles, "line")}>
          {tooManyPointsLine(draw, spectrum.lines.length)}
        </p>
      )}
      {drawn && !tooMany && (
        <>
          <LinesPlot result={result} variantsName={variantsName} />
          <p className={classOf(styles, "muted")}>
            {variantsInDrawLine(withLine)}
          </p>
          {half !== null && <p className={classOf(styles, "muted")}>{half}</p>}
        </>
      )}
    </div>
  );
}

/** The menu "Download…" and the plot of the lines of `result`, its data
    made once for the result. */
function LinesPlot({
  result,
  variantsName,
}: {
  readonly result: DiversityResult;
  readonly variantsName: string;
}): React.JSX.Element {
  // The result is shown under the key of the populations of the project.
  const pops = useAppState((s) => populationsOf(s.project));
  const data = useMemo(() => {
    const spectrum = spectrumLinesOf(result);
    return spectrumPlotData(spectrum, linesDescription(spectrum), pops);
  }, [result, pops]);
  const { ref, handle } = usePlot(createLine, data);
  const legend = useMemo((): LegendLengths => {
    const room = lineLegendRoom(data);
    return {
      "--legend-narrow-under": `${String(room.narrowUnder)}px`,
      "--legend-narrow-height": `${String(room.narrowHeight)}px`,
      "--legend-narrow-width": `${String(room.narrowWidth)}px`,
    };
  }, [data]);
  const items = useMemo(
    () =>
      plotItems(
        {
          what: LINES_WHAT,
          stem: variantsStem(variantsName),
          imageWhat: IMAGE_WHAT,
          csvWhat: CSV_WHAT,
          csv: () => spectrumLinesCsv(result),
          waiting: null,
        },
        handle,
      ),
    [result, variantsName, handle],
  );
  return (
    <>
      <div className={classOf(styles, "menuLine")}>
        <DownloadMenu what={LINES_WHAT} items={items} waiting={null} />
      </div>
      <div className={classOf(styles, "frame")}>
        <div ref={ref} className={classOf(styles, "plot")} style={legend} />
      </div>
    </>
  );
}
