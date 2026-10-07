/**
 * One histogram of the statistics of the open file on popgen2.html: its
 * title, the box of its threshold, the line of how many variants or
 * individuals are in its bins, the plot with the line of the threshold
 * the user drags over it, and the line under the plot of what the
 * threshold keeps and removes, in a group named by its title. No table
 * of its bins and no download, which the owner wants out of this page
 * until the piece of the downloads (docs/plans/file-stats.md, "Where it
 * goes"). Drawn from the result, or from a result so far while the pass
 * runs, whose lines say so.
 *
 * The threshold is shown only (docs/plans/thresholds.md): it changes no
 * statistic and no project. The box and the line follow each other: the
 * line follows the number as it is typed, and the box the line as it is
 * dragged or moved with the keys.
 */
import { useId, useState } from "react";

import type { HistogramFrame } from "../../charts/histogram.ts";
import { classOf } from "../classOf.ts";
import { useAnnouncer } from "../shell/announcer.tsx";
import { thresholdRefusedText } from "../steps/variants/words.ts";
import { HistogramPlot } from "../widgets/HistogramPlot.tsx";
import { NumberField } from "../widgets/NumberField.tsx";
import { ThresholdSlider } from "../widgets/ThresholdSlider.tsx";
import type { StatsPlot } from "./statsPlots.ts";
import styles from "./StatsHistogram.module.css";

/** What one histogram is drawn with. */
export interface StatsHistogramProps {
  /** The histogram with the threshold drawn and counted, the one typed
      while a number is typed in the box; the same object until its
      result or its threshold changes, so that the plot is not drawn
      again on renders that changed nothing. */
  readonly plot: StatsPlot;
  /** The number the box shows, the threshold set, which a number typed
      and not yet committed does not change. */
  readonly boxValue: number;
  /** Called with the threshold the user set, typed in the box and
      committed, or moved on the line. */
  readonly onThreshold: (threshold: number) => void;
  /** Called at each key typed in the box with the number it holds, or
      `null` while it holds none the box would take, and at each commit. */
  readonly onTyped: (typed: number | null) => void;
}

/** A histogram of the section, with its threshold. */
export function StatsHistogram({
  plot,
  boxValue,
  onThreshold,
  onTyped,
}: StatsHistogramProps): React.JSX.Element {
  const titleId = useId();
  const announcer = useAnnouncer();
  // Where the plot drew its frame, which the line is laid over; none
  // before its first draw.
  const [frame, setFrame] = useState<HistogramFrame | null>(null);
  const { threshold } = plot;
  return (
    <div
      role="group"
      aria-labelledby={titleId}
      className={classOf(styles, "block")}
    >
      <p id={titleId} className={classOf(styles, "title")}>
        {plot.data.title}
      </p>
      <NumberField
        label={threshold.name}
        value={boxValue}
        minValue={threshold.box.minValue}
        maxValue={threshold.box.maxValue}
        step={threshold.box.step}
        decimals={threshold.box.decimals}
        width="long"
        refusedText={thresholdRefusedText}
        onRefused={(text) => {
          announcer.announce(text);
        }}
        onTyped={onTyped}
        onChange={onThreshold}
      />
      <p className={classOf(styles, "muted")}>{plot.countLine}</p>
      <div className={classOf(styles, "plot")}>
        <HistogramPlot data={plot.data} onFrame={setFrame} />
        {frame !== null && (
          <ThresholdSlider
            label={threshold.name}
            minValue={threshold.slider.min}
            maxValue={threshold.slider.max}
            step={threshold.slider.step}
            value={threshold.slider.value}
            valueText={threshold.valueText}
            frame={frame}
            onChange={(value) => {
              onThreshold(threshold.fromSlider(value));
            }}
          />
        )}
      </div>
      <p className={classOf(styles, "line")}>{threshold.line}</p>
    </div>
  );
}
