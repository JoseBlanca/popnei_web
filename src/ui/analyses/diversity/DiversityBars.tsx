/**
 * The bar plots of the table of the diversity, under the table in the
 * Populations tab of popgen2.html (docs/specs/steps/popgen2-populations.md,
 * "The result", the plots of the table): a section with its heading and
 * its line, then five plots, one for each column of `BAR_PLOTS`, each
 * with its heading, the label of its column, its "Download…" on a line
 * of its own above it, "Image as SVG", "Image as PNG" and "Data as CSV",
 * and the plot, `createBars` of src/charts/bars.ts mounted by `usePlot`,
 * a bar per population in the colour of its line in the plot of the
 * spectrum.
 *
 * The plots stand side by side, as many to a row as the width holds at
 * 20rem at least each, one to a row at the width of a phone; each
 * element is as high as `barsHeight` gives for the populations, which
 * the CSS reads as --bars-height. Each plot is inside an error boundary
 * of its own, so that one that throws takes neither the others nor the
 * table with it.
 */
import { useId, useMemo } from "react";

import { barsHeight, createBars } from "../../../charts/bars.ts";
import { diversityRows } from "../../../core/analyses/diversity.ts";
import { variantsStem } from "../../../core/fileNames.ts";
import type { DiversityResult } from "../../../worker/protocol.ts";
import { classOf } from "../../classOf.ts";
import { ErrorBoundary } from "../../shell/ErrorBoundary.tsx";
import { plotItems } from "../../widgets/downloadItems.ts";
import { DownloadMenu } from "../../widgets/DownloadMenu.tsx";
import { usePlot } from "../../widgets/usePlot.ts";
import styles from "./DiversityBars.module.css";
import {
  BAR_PLOTS,
  BAR_PLOTS_HEADING,
  BAR_PLOTS_LINE,
  barPlotWhat,
  barsCsv,
  barsDataOf,
  barsHeading,
} from "./barPlots.ts";
import type { BarPlot } from "./barPlots.ts";

/** The height of an element, which the CSS reads. */
type BarsHeight = React.CSSProperties & Record<"--bars-height", string>;

/** What the bar plots are drawn with. */
export interface DiversityBarsProps {
  /** The result of the diversity, whose table the plots draw. */
  readonly result: DiversityResult;
  /** The name of the variants file, which the files are named after. */
  readonly variantsName: string;
}

/** The section of the five bar plots of the table. */
export function DiversityBars({
  result,
  variantsName,
}: DiversityBarsProps): React.JSX.Element {
  const headingId = useId();
  const draw = result.numCalledAlleles;
  return (
    <section aria-labelledby={headingId} className={classOf(styles, "bars")}>
      <h3 id={headingId} className={classOf(styles, "heading")}>
        {BAR_PLOTS_HEADING}
      </h3>
      <p className={classOf(styles, "line")}>{BAR_PLOTS_LINE}</p>
      <div className={classOf(styles, "plots")}>
        {BAR_PLOTS.map((plot) => (
          <ErrorBoundary
            key={plot.file}
            level={4}
            heading={barsHeading(plot, draw)}
          >
            <OneBarPlot
              result={result}
              variantsName={variantsName}
              plot={plot}
            />
          </ErrorBoundary>
        ))}
      </div>
    </section>
  );
}

/** One plot: its heading, its "Download…" and the plot, its data made
    once for the result. */
function OneBarPlot({
  result,
  variantsName,
  plot,
}: {
  readonly result: DiversityResult;
  readonly variantsName: string;
  readonly plot: BarPlot;
}): React.JSX.Element {
  const headingId = useId();
  const draw = result.numCalledAlleles;
  const data = useMemo(
    () => barsDataOf(diversityRows(result), plot, draw),
    [result, plot, draw],
  );
  const { ref, handle } = usePlot(createBars, data);
  const what = barPlotWhat(plot, draw);
  const items = useMemo(
    () =>
      plotItems(
        {
          what,
          stem: variantsStem(variantsName),
          imageWhat: plot.file,
          csvWhat: plot.file,
          csv: () => barsCsv(diversityRows(result), plot, draw),
          waiting: null,
        },
        handle,
      ),
    [what, variantsName, plot, result, draw, handle],
  );
  const height = useMemo(
    (): BarsHeight => ({
      "--bars-height": `${String(barsHeight(data.bars.length))}px`,
    }),
    [data],
  );
  return (
    <div
      role="group"
      aria-labelledby={headingId}
      className={classOf(styles, "plot")}
    >
      <h4 id={headingId} className={classOf(styles, "plotHeading")}>
        {barsHeading(plot, draw)}
      </h4>
      <div>
        <DownloadMenu what={what} items={items} waiting={null} />
      </div>
      <div ref={ref} className={classOf(styles, "element")} style={height} />
    </div>
  );
}
