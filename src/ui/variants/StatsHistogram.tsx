/**
 * One histogram of the statistics of the open file on popgen2.html, in a
 * group named by its full title: one row, its short title, "max:" and the
 * box of its threshold, "Obs. het. max: [0.04]"; and under it the plot,
 * with the line of the threshold the user drags over it
 * (docs/plans/thresholds.md, "Round 1 with the owner"). No words say what
 * the threshold keeps (the owner, 8 October 2026, docs/plans/popnei-0.2.2.md):
 * a threshold that keeps every variant or individual with a value is
 * drawn in grey, its line and the number in its box, and a screen reader
 * hears it in the value of the line, "1, keeps every variant", and in the
 * description of the box, "This threshold removes no variant.", a text
 * of the page that is not drawn (WCAG 1.4.1, colour is never the only
 * sign). A screen reader reads that description only when the box takes
 * the focus, so a number committed in the box, by Enter, by leaving it or
 * by an arrow key, that turns the threshold grey or back is announced,
 * once, "This threshold removes no variant." or "This threshold removes
 * variants.". No table of its bins and no download, which the owner wants
 * out of this page until the piece of the downloads
 * (docs/plans/file-stats.md, "Where it goes"). Drawn from the result, or
 * from a result so far while the pass runs, whose words say so.
 *
 * The threshold is shown only (docs/plans/thresholds.md): it changes no
 * statistic and no project. The box and the line follow each other: the
 * line follows the number as it is typed, and the box the line as it is
 * dragged or moved with the keys. A number typed is rounded to the step
 * of the axis, which the box then shows, with no words: it shows the
 * decimals of the step.
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
 * the user types, the box shows the number of the line.
 */
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

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
  /** The histogram with its threshold, the one typed
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
  const removesNothingId = useId();
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
  // Whether a screen reader last heard that the threshold keeps every
  // variant or individual, from the description of the box as it took
  // the focus or from an announcement since; and whether the box
  // committed a number since the last draw.
  const heardKeepsAll = useRef(threshold.keepsAll);
  const committed = useRef(false);
  // After the draw of a number committed in the box: what it turned the
  // threshold into, when that is not what was heard.
  useEffect(() => {
    if (!committed.current) return;
    committed.current = false;
    if (threshold.keepsAll === heardKeepsAll.current) return;
    heardKeepsAll.current = threshold.keepsAll;
    announcer.announce(threshold.turnedText);
  });
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
        onFocus={() => {
          heardKeepsAll.current = threshold.keepsAll;
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
          muted={threshold.keepsAll}
          {...(threshold.removesNothing !== null && {
            describedBy: removesNothingId,
          })}
          refusedText={thresholdRefusedText}
          onRefused={(text) => {
            announcer.announce(text);
          }}
          onTyped={onTyped}
          onChange={(value) => {
            setHeld(null);
            committed.current = true;
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
            committed.current = true;
            // Set even when it is the number set: a number typed at the
            // bound of the box, stepped past it, is then set.
            onThreshold(moved);
          }}
        />
        {threshold.removesNothing !== null && (
          // Read as the description of the box, and not drawn: the grey
          // of the number says it to the eye.
          <p id={removesNothingId} className={classOf(styles, "hidden")}>
            {threshold.removesNothing}
          </p>
        )}
      </div>
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
            muted={threshold.keepsAll}
            onChange={(value) => {
              onThreshold(threshold.onStep(value));
            }}
          />
        )}
      </div>
    </div>
  );
}
