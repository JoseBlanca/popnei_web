/**
 * One histogram of the statistics of the open file on popgen2.html, in a
 * group named by its full title: one row, its short title, "max:" and the
 * box of its threshold, "Obs. het. max: [0.04]"; under it one line, what
 * the threshold keeps, "Keeps 1,050 of 1,200 variants"; and the plot,
 * with the line of the threshold the user drags over it
 * (docs/plans/thresholds.md, "Round 1 with the owner"). The line of what
 * it keeps holds one row, kept at the height of its longest form, so
 * that the plot does not move as the words change while the line is
 * dragged. No table of its bins and no download, which the owner wants
 * out of this page until the piece of the downloads
 * (docs/plans/file-stats.md, "Where it goes"). Drawn from the result, or
 * from a result so far while the pass runs, whose words say so.
 *
 * The threshold is shown only (docs/plans/thresholds.md): it changes no
 * statistic and no project. The box and the line follow each other: the
 * line follows the number as it is typed, and the box the line as it is
 * dragged or moved with the keys. A number typed is rounded to the step
 * of the axis, which the box then shows, with no words: it shows the
 * decimals of the step. The line of what it keeps describes the box, so
 * that a screen reader reads it as the box takes the focus.
 *
 * The arrow keys in the box move the threshold as they move the line, one
 * step of the axis, Page Up and Page Down ten, from where the line is,
 * at the number typed when one is, which the box puts back first: React
 * Aria would step from the number the box holds. They are bounded by the range of the box, 0 to 1, and
 * not by the axis, which ends at a threshold beyond the bins: from 0.11
 * on an axis of bins to 0.1, Down gives 0.109 and Up 0.11 again.
 *
 * From the first change of its text to the first commit or to its blur,
 * the box keeps the number it showed at that change: a threshold never
 * set follows the top of the axis, which a result so far can widen, and
 * React Aria would put the new number over what the user is typing. Until
 * the user types, the box shows the number counted, as the line does.
 */
import { useId, useLayoutEffect, useRef, useState } from "react";

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

/** Writes `frame`, where the plot drew its frame, on `element`, around
    the plot and its line, as the custom properties the line is placed
    by; nothing when either is not there yet. */
function writeFrame(
  element: HTMLElement | null,
  frame: HistogramFrame | null,
): void {
  if (element === null || frame === null) return;
  for (const [name, pixels] of [
    ["--frame-left", frame.left],
    ["--frame-top", frame.top],
    ["--frame-width", frame.width],
    ["--frame-height", frame.height],
  ] as const) {
    element.style.setProperty(name, `${String(pixels)}px`);
  }
}

/** A histogram of the section, with its threshold. */
export function StatsHistogram({
  plot,
  boxValue,
  onThreshold,
  onTyped,
}: StatsHistogramProps): React.JSX.Element {
  const wordsId = useId();
  const announcer = useAnnouncer();
  // The element of the plot and the line, on which the frame of the plot
  // is written as the plot draws it, the frame last drawn, and whether it
  // was drawn once, before which the line has nowhere to go.
  const plotRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HistogramFrame | null>(null);
  const [framed, setFramed] = useState(false);
  // Written as custom properties during the draw, before the browser
  // paints: the line, placed by them, is painted with the plot after a
  // resize. A state of React would place it a frame later. The first
  // draw, in the layout effect of the plot, comes before the element has
  // its ref, and is written by the layout effect below.
  const onFrame = (frame: HistogramFrame): void => {
    frameRef.current = frame;
    writeFrame(plotRef.current, frame);
    setFramed(true);
  };
  useLayoutEffect(() => {
    writeFrame(plotRef.current, frameRef.current);
  }, []);
  // The number the box keeps from the first change of its text to its
  // first commit or its blur; null when it shows `boxValue`.
  const [held, setHeld] = useState<number | null>(null);
  const { threshold } = plot;
  return (
    <div
      role="group"
      aria-label={plot.data.title}
      className={classOf(styles, "block")}
    >
      <div
        className={classOf(styles, "head")}
        onInput={() => {
          if (held === null) setHeld(boxValue);
        }}
        onBlur={() => {
          setHeld(null);
        }}
      >
        <NumberField
          label={threshold.name}
          shownLabel={threshold.shownLabel}
          value={held ?? boxValue}
          minValue={threshold.box.minValue}
          maxValue={threshold.box.maxValue}
          step={threshold.box.step}
          decimals={threshold.box.decimals}
          describedBy={wordsId}
          refusedText={thresholdRefusedText}
          onRefused={(text) => {
            announcer.announce(text);
          }}
          onTyped={onTyped}
          onChange={(value) => {
            setHeld(null);
            onThreshold(threshold.onStep(value));
          }}
          // From where the line is, at the number typed when one is, which
          // the field puts back and tells the screen it is typed no more.
          onSteps={(steps) => {
            const { step, value } = threshold.slider;
            const { minValue, maxValue } = threshold.box;
            const moved = threshold.onStep(
              Math.min(maxValue, Math.max(minValue, value + steps * step)),
            );
            setHeld(null);
            // Set even when it is the number set: a number typed at the
            // bound of the box, stepped past it, is then set.
            onThreshold(moved);
          }}
        />
      </div>
      <p id={wordsId} className={classOf(styles, "keeps")}>
        {threshold.line}
      </p>
      <div ref={plotRef} className={classOf(styles, "plot")}>
        <HistogramPlot data={plot.data} onFrame={onFrame} />
        {framed && (
          <ThresholdSlider
            label={threshold.name}
            minValue={threshold.slider.min}
            maxValue={threshold.slider.max}
            step={threshold.slider.step}
            value={threshold.slider.value}
            valueText={threshold.valueText}
            onChange={(value) => {
              onThreshold(threshold.onStep(value));
            }}
          />
        )}
      </div>
    </div>
  );
}
