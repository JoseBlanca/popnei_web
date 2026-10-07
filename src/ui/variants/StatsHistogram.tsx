/**
 * One histogram of the statistics of the open file on popgen2.html: its
 * title, the line of how many variants or individuals are in its bins,
 * the plot with the line of the threshold the user drags over it, and
 * under the plot one row, the box of the threshold after the word
 * "Maximum" and what it keeps and removes, in a group named by its
 * title. No table of its bins and no download, which the owner wants out
 * of this page until the piece of the downloads
 * (docs/plans/file-stats.md, "Where it goes"). Drawn from the result, or
 * from a result so far while the pass runs, whose lines say so.
 *
 * The threshold is shown only (docs/plans/thresholds.md): it changes no
 * statistic and no project. The box and the line follow each other: the
 * line follows the number as it is typed, and the box the line as it is
 * dragged or moved with the keys. The words of the counts describe the
 * box, so that a screen reader reads them as the box takes the focus. A
 * number typed and moved to the nearest of popnei's fine edges is said
 * once under the row, until the next change.
 *
 * The arrow keys in the box move the threshold as they move the line, one
 * step of the line, Page Up and Page Down ten, from where the line is,
 * at the number typed when one is: React Aria would step from the number
 * shown, with four decimals, to the edge nearest it, which for 0.0703,
 * shown for the edge 0.0703125, is the same edge.
 *
 * From its focus to the first commit or to its blur, the box keeps the
 * number it showed when it took the focus: a threshold never set follows
 * the top of the axis, which a result so far can widen, and React Aria
 * would put the new number over what the user is typing.
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
import { snappedText, THRESHOLD_SHOWN_LABEL } from "./statsWords.ts";
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

/** A number typed that the box moved to an edge, and the words that say
    so. */
interface Snapped {
  /** The number the box shows for it. */
  readonly at: number;
  readonly text: string;
}

/** The steps an arrow key in the box moves the threshold by, and which
    way: one for the Up and the Down arrow, ten for Page Up and Page
    Down; 0 for another key, or with a modifier held, which the box
    leaves to the browser. */
function boxStepsOf(event: React.KeyboardEvent): number {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
    return 0;
  }
  switch (event.key) {
    case "ArrowUp":
      return 1;
    case "ArrowDown":
      return -1;
    case "PageUp":
      return PAGE_STEPS;
    case "PageDown":
      return -PAGE_STEPS;
    default:
      return 0;
  }
}

/** The steps of the line that Page Up and Page Down move it by, in the
    box as on the line. */
const PAGE_STEPS = 10;

/** A histogram of the section, with its threshold. */
export function StatsHistogram({
  plot,
  boxValue,
  onThreshold,
  onTyped,
}: StatsHistogramProps): React.JSX.Element {
  const titleId = useId();
  const wordsId = useId();
  const snappedId = useId();
  const announcer = useAnnouncer();
  // Where the plot drew its frame, which the line is laid over; none
  // before its first draw.
  const [frame, setFrame] = useState<HistogramFrame | null>(null);
  // The number the box keeps from its focus to its first commit or its
  // blur; null when it shows `boxValue`.
  const [held, setHeld] = useState<number | null>(null);
  // The last number typed and moved to an edge, said while the box shows
  // where it went.
  const [snapped, setSnapped] = useState<Snapped | null>(null);
  const { threshold } = plot;
  const snappedLine =
    snapped !== null && snapped.at === threshold.shown ? snapped.text : null;
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
              setSnapped(null);
              onThreshold(threshold.fromSlider(value));
            }}
          />
        )}
      </div>
      <div
        className={classOf(styles, "row")}
        onFocus={() => {
          if (held === null) setHeld(boxValue);
        }}
        onBlur={() => {
          setHeld(null);
        }}
        onKeyDownCapture={(event) => {
          const steps = boxStepsOf(event);
          // An empty box is left to the field, which moves nothing.
          if (
            steps === 0 ||
            !(event.target instanceof HTMLInputElement) ||
            event.target.value.trim() === ""
          ) {
            return;
          }
          // Before the field and React Aria, which would step from the
          // number shown.
          event.preventDefault();
          event.stopPropagation();
          const { min, max, step, value } = threshold.slider;
          const moved = Math.min(max, Math.max(min, value + steps * step));
          if (moved === value) return;
          setHeld(null);
          setSnapped(null);
          onThreshold(threshold.fromSlider(moved));
        }}
      >
        <NumberField
          label={threshold.name}
          shownLabel={THRESHOLD_SHOWN_LABEL}
          value={held ?? boxValue}
          minValue={threshold.box.minValue}
          maxValue={threshold.box.maxValue}
          step={threshold.box.step}
          decimals={threshold.box.decimals}
          describedBy={
            snappedLine === null ? wordsId : `${wordsId} ${snappedId}`
          }
          refusedText={thresholdRefusedText}
          onRefused={(text) => {
            announcer.announce(text);
          }}
          onTyped={onTyped}
          onChange={(value) => {
            setHeld(null);
            const at = threshold.snapped(value);
            if (at === null) {
              setSnapped(null);
            } else {
              const text = snappedText(value, at);
              setSnapped({ at, text });
              announcer.announce(text);
            }
            onThreshold(value);
          }}
        />
        <p id={wordsId} className={classOf(styles, "line")}>
          {threshold.line}
        </p>
      </div>
      {snappedLine !== null && (
        <p id={snappedId} className={classOf(styles, "muted")}>
          {snappedLine}
        </p>
      )}
    </div>
  );
}
