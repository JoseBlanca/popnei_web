/**
 * One histogram of the statistics of the open file on popgen2.html: its
 * title, the line of how many variants or individuals are in its bins,
 * and the plot, in a group named by its title. No table of its bins and
 * no download, which the owner wants out of this page until the piece of
 * the downloads (docs/plans/file-stats.md, "Where it goes"). Drawn from
 * the result, or from a result so far while the pass runs, whose line
 * says so.
 */
import { useId } from "react";

import { classOf } from "../classOf.ts";
import { HistogramPlot } from "../widgets/HistogramPlot.tsx";
import type { StatsPlot } from "./statsPlots.ts";
import styles from "./StatsHistogram.module.css";

/** What one histogram is drawn with. */
export interface StatsHistogramProps {
  /** The histogram, the same object until its result changes, so that
      the plot is not drawn again on renders that changed nothing. */
  readonly plot: StatsPlot;
}

/** A histogram of the section. */
export function StatsHistogram({
  plot,
}: StatsHistogramProps): React.JSX.Element {
  const titleId = useId();
  return (
    <div
      role="group"
      aria-labelledby={titleId}
      className={classOf(styles, "block")}
    >
      <p id={titleId} className={classOf(styles, "title")}>
        {plot.data.title}
      </p>
      <p className={classOf(styles, "muted")}>{plot.countLine}</p>
      <HistogramPlot data={plot.data} />
    </div>
  );
}
