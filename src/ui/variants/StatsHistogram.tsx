/**
 * One histogram of the statistics of the open file on popgen2.html: its
 * title, the line of how many variants or individuals are in its bins,
 * and the plot, in a group named by its title. No table of its bins and
 * no download, which the owner wants out of this page until the piece of
 * the downloads (docs/plans/file-stats.md, "Where it goes").
 *
 * Before its result it keeps the room it will take, hidden, `PlotSpace`
 * of StatsLayout.tsx, so that the plot's arrival moves nothing under it,
 * the open button among it (docs/plans/file-stats.md, "Round 1 with the
 * owner").
 */
import { useId } from "react";

import { classOf } from "../classOf.ts";
import { HistogramPlot } from "../widgets/HistogramPlot.tsx";
import { PlotSpace } from "./StatsLayout.tsx";
import type { StatsPlot } from "./statsPlots.ts";
import styles from "./StatsHistogram.module.css";

/** What one histogram is drawn with. */
export interface StatsHistogramProps {
  /** Its title, the same as that of `plot`. */
  readonly title: string;
  /** The histogram, the same object until its result changes, so that
      the plot is not drawn again on renders that changed nothing; `null`
      before its result, for the room it will take. */
  readonly plot: StatsPlot | null;
}

/** A histogram of the section, or the room it will take. */
export function StatsHistogram({
  title,
  plot,
}: StatsHistogramProps): React.JSX.Element {
  const titleId = useId();
  if (plot === null) {
    return <PlotSpace title={title} />;
  }
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
