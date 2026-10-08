/**
 * One histogram of the statistics of the open file on popgen2.html, in a
 * group named by its full title: one row, its short title, "max:" and the
 * box of its threshold, "Obs. het. max: [0.04]"; and under it the plot,
 * with the line of the threshold the user drags over it
 * (docs/plans/thresholds.md, "Round 1 with the owner"). The expected
 * heterozygosity, on which popnei has no filter, has its short title
 * alone, and no box and no line. No table of its bins and no download,
 * which the owner wants out of this page until the piece of the
 * downloads (docs/plans/file-stats.md, "Where it goes"). Drawn from the
 * result, or from a result so far while the pass runs, whose words say
 * so.
 *
 * The threshold is a filter of the project
 * (docs/specs/steps/popgen2-filters.md, "A threshold, on and off", "When
 * a threshold changes the project"): the box and the line show the
 * project's value, so that Undo and Redo move them, and change it once
 * per drag, at the release of the pointer, once per number committed in
 * the box, by Enter, Tab or leaving it, and once per run of the keys, a
 * second after the last press or when the focus leaves; meanwhile only
 * this histogram follows the number dragged, typed or moved. An emptied
 * box, or 1, turns the filter off. From off, Down and Page Down in the
 * box turn it on one and ten steps below the top of the axis, as on the
 * line, and Up and Page Up do nothing. No words on the screen say what a
 * threshold keeps: one that keeps every variant or individual of its
 * plot, or is off, is drawn in grey, its line and the number in its box,
 * and a screen reader hears it in the value of the line and in a
 * description of the box that the screen does not draw. A number
 * committed in the box, or a run of the keys made a change, that turns
 * the threshold on, grey or off from another of the three is announced
 * once, in the words of thresholdLookChangeText; a drag, seen, is not.
 *
 * Ctrl+Z and Ctrl+Y on the line or in the box while a run waits make the
 * run a change, and then go on to the page's Undo or Redo, so that Undo
 * undoes the run. A threshold that leaves the page, the worker crashed,
 * makes its run, its drag or its number typed a change first, and the
 * focus it held goes to the heading of the page.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import type { HistogramFrame } from "../../charts/histogram.ts";
import { classOf } from "../classOf.ts";
import { useAnnouncer } from "../shell/announcer.tsx";
import { shortcutOf } from "../shell/shortcuts.ts";
import type { ThresholdLook } from "../../core/thresholds.ts";
import { thresholdRefusedText } from "../steps/variants/words.ts";
import { HistogramPlot } from "../widgets/HistogramPlot.tsx";
import { NumberField } from "../widgets/NumberField.tsx";
import { ThresholdSlider } from "../widgets/ThresholdSlider.tsx";
import { useRunGate } from "./runGate.tsx";
import type { PlotThreshold, StatsPlot } from "./statsPlots.ts";
import { thresholdLookChangeText } from "./statsWords.ts";
import styles from "./StatsHistogram.module.css";
import { createThresholdRun } from "./thresholdRun.ts";
import type { ThresholdRun } from "./thresholdRun.ts";

/** What one histogram is drawn with. */
export interface StatsHistogramProps {
  /** The histogram with its threshold as it is drawn, the number typed
      while one is typed in the box; the same object until its result or
      its threshold changes, so that the plot is not drawn again on
      renders that changed nothing. */
  readonly plot: StatsPlot;
  /** Its threshold with no number typed: the project's, or the one
      dragged or moved with the keys and not yet a change; `null` for the
      expected heterozygosity, which has none. */
  readonly set: PlotThreshold | null;
  /** Called with the threshold dragged or moved with the keys and not
      yet a change of the project, on the step of its axis, or `null`
      when the threshold shows the project's again. */
  readonly onMoving: (value: number | null) => void;
  /** Called at each key typed in the box with the number it holds, or
      `null` while it holds none the box would take, and at each commit. */
  readonly onTyped: (typed: number | null) => void;
  /** Sets the threshold of the project to `value`, on the step of its
      axis, 1 for off, or `null` for an emptied box. */
  readonly onSet: (value: number | null) => void;
  /** The description of the step of Undo that `onSet(value)` would make
      now, "the MAF filter changed", or `null` when it would make none;
      Undo names it while a run of the keys waits. */
  readonly describeSet: (value: number) => string | null;
}

/** The kind of the announcement of a threshold's look, of which only the
    latest is said, and which an undo just after drops. */
const LOOK_ANNOUNCED = "thresholdLook";

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
  set,
  onMoving,
  onTyped,
  onSet,
  describeSet,
}: StatsHistogramProps): React.JSX.Element {
  const announcer = useAnnouncer();
  const gate = useRunGate();
  const blockRef = useRef<HTMLDivElement>(null);
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

  // The latest callbacks, for the run, whose timer ends it after the
  // render that made it, and for the cleanup.
  const onSetRef = useRef(onSet);
  const onMovingRef = useRef(onMoving);
  const describeSetRef = useRef(describeSet);
  const setRef = useRef(set);
  useLayoutEffect(() => {
    onSetRef.current = onSet;
    onMovingRef.current = onMoving;
    describeSetRef.current = describeSet;
    setRef.current = set;
  });
  // Says once that a change turned the threshold on, grey or off from
  // another of the three; nothing while it leaves the page.
  const leavingRef = useRef(false);
  const announceLook = (text: string | null): void => {
    if (text === null || leavingRef.current) return;
    announcer.announce(text, { replaces: LOOK_ANNOUNCED });
  };
  // The look of the threshold where the run waiting started.
  const runFromLookRef = useRef<ThresholdLook | null>(null);
  // The run of the keys of this threshold, made at its first press; read
  // in the handlers alone.
  const runRef = useRef<ThresholdRun | null>(null);
  const runOf = (): ThresholdRun => {
    runRef.current ??= createThresholdRun({
      gate,
      describe: (to) => describeSetRef.current(to),
      // The threshold drawn at the end of the run is drawn at `to`, in
      // the look the change gives it.
      change: (to) => {
        const before = runFromLookRef.current;
        const after = setRef.current;
        onSetRef.current(to);
        if (before !== null && after !== null) {
          announceLook(
            thresholdLookChangeText(before, after.look, to, after.counted),
          );
        }
      },
      ended: () => {
        onMovingRef.current(null);
      },
    });
    return runRef.current;
  };
  // The drag under way: where the line stood before it, and where it was
  // last dragged to.
  const drag = useRef<{ readonly from: number; to: number } | null>(null);
  // The commit of the box, as Enter would, while it is drawn; held by the
  // gate for an opening by a drop or a paste, which leave the focus in it.
  const commitRef = useRef<(() => void) | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(
    () =>
      gate.typing(() => {
        if (boxRef.current?.contains(document.activeElement) === true) {
          commitRef.current?.();
        }
      }),
    [gate],
  );

  // The threshold leaving the page, the worker crashed: what the user did
  // and has not made a change is made one, and the focus it held goes to
  // the heading of the page once it is gone, not to nothing. Before the
  // elements go: the cleanup of a layout effect runs while they are in
  // the page. The commands it gives the store, and the state it sets on
  // the histogram above, come in React's commit and not in a render, as
  // from a layout effect: React draws what they change once the commit
  // ends, and drops without a warning a state set on a component that is
  // leaving (StatsSection.test.ts checks that nothing is warned). Nothing
  // is announced from here.
  // Set again after the cleanup that <StrictMode> runs at the mount.
  useLayoutEffect(() => {
    leavingRef.current = false;
  }, []);
  useLayoutEffect(
    () => () => {
      leavingRef.current = true;
      const block = blockRef.current;
      const hadFocus = block?.contains(document.activeElement) === true;
      if (boxRef.current?.contains(document.activeElement) === true) {
        commitRef.current?.();
      }
      runRef.current?.end();
      const dragged = drag.current;
      drag.current = null;
      if (dragged !== null && dragged.to !== dragged.from) {
        onSetRef.current(dragged.to);
      }
      if (!hadFocus) return;
      queueMicrotask(() => {
        const now = document.activeElement;
        if (now !== null && now !== document.body && now.isConnected) return;
        const heading = document.querySelector("main h1");
        if (heading instanceof HTMLElement) heading.focus();
      });
    },
    [],
  );

  const { threshold } = plot;
  if (threshold === null || set === null) {
    return (
      <div
        role="group"
        aria-label={plot.data.title}
        className={classOf(styles, "block")}
      >
        <p className={classOf(styles, "title")}>{plot.shortTitle}</p>
        <div className={classOf(styles, "plot")}>
          <HistogramPlot data={plot.data} />
        </div>
      </div>
    );
  }

  /** A press of a key moved the threshold to `value`, on its step. */
  const pressed = (value: number): void => {
    if (runRef.current?.waiting() !== true) runFromLookRef.current = set.look;
    runOf().press(set.slider.value, value);
    onMoving(value);
  };

  return (
    <div
      ref={blockRef}
      role="group"
      aria-label={plot.data.title}
      className={classOf(styles, "block")}
      onKeyDown={(event) => {
        // Undo or Redo with a run waiting: the run made a change first,
        // and the keys go on to the page's Undo or Redo, which the page
        // does not draw since the owner's decision of 8 October 2026
        // (VariantsPage.tsx). With something typed in the box, its own
        // handler has put its number back.
        if (
          !event.defaultPrevented &&
          shortcutOf(event) !== null &&
          runRef.current?.waiting() === true
        ) {
          runRef.current.end();
        }
      }}
      onBlur={() => {
        runRef.current?.end();
      }}
    >
      <div ref={boxRef} className={classOf(styles, "head")}>
        <NumberField
          label={threshold.name}
          shownLabel={threshold.shownLabel}
          value={set.box.value}
          minValue={threshold.box.minValue}
          maxValue={threshold.box.maxValue}
          step={threshold.box.step}
          decimals={threshold.box.decimals}
          muted={threshold.look !== "on"}
          {...(threshold.hiddenDescription !== null && {
            hiddenDescription: threshold.hiddenDescription,
          })}
          refusedText={thresholdRefusedText}
          onRefused={(text) => {
            announcer.announce(text);
          }}
          onCommitReady={(commit) => {
            commitRef.current = commit;
          }}
          onTyped={onTyped}
          // The threshold drawn is drawn at the number committed, which
          // was typed, and the one set is the project's.
          onChange={(value) => {
            runRef.current?.end();
            const committed = threshold.onStep(value);
            onSet(committed);
            announceLook(
              thresholdLookChangeText(
                set.look,
                threshold.look,
                committed,
                threshold.counted,
              ),
            );
          }}
          onEmptied={() => {
            runRef.current?.end();
            onSet(null);
            announceLook(
              thresholdLookChangeText(set.look, "off", 1, threshold.counted),
            );
          }}
          // From where the line is, at the number typed when one is, which
          // the field puts back and tells the screen it is typed no more.
          // From off, at the top of the axis, Down goes below it, and Up
          // leaves the threshold off, where React Aria would go a step
          // below 1 and widen the axis.
          onSteps={(steps) => {
            if (set.look === "off" && steps > 0) return;
            const { step, value } = threshold.slider;
            const { minValue, maxValue } = threshold.box;
            pressed(
              threshold.onStep(
                Math.min(maxValue, Math.max(minValue, value + steps * step)),
              ),
            );
          }}
        />
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
            muted={threshold.look !== "on"}
            onChange={(value, by) => {
              const moved = threshold.onStep(value);
              if (by === "key") {
                pressed(moved);
                return;
              }
              if (drag.current === null) {
                // A run waiting is a change of its own, before the drag.
                runRef.current?.end();
                drag.current = { from: set.slider.value, to: moved };
              } else {
                drag.current.to = moved;
              }
              onMoving(moved);
            }}
            onDragEnd={(value) => {
              const moved = threshold.onStep(value);
              const dragged = drag.current;
              drag.current = null;
              if (dragged !== null && moved !== dragged.from) onSet(moved);
              onMoving(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
