/**
 * A slider with its name and its value: React Aria's `Slider` with one
 * thumb, its `Label`, its `SliderOutput` and its `SliderTrack`, with our
 * look (react.md, "Widgets: React Aria, wrapped once"), for a number
 * between two ends that the user moves to, as the PCA's own missing data
 * and MAF filters of popgen2.html (docs/specs/steps/popgen2-pca.md, "Its
 * filters"). The name stands above the track, the value after the track,
 * under it on a narrow column, in the words the screen gives, which a
 * screen reader reads as the slider's value too, and the words of the two
 * ends under the ends of the track.
 *
 * Keyboard, as React Aria gives it: the arrow keys move it a step, Page
 * Up and Page Down a tenth of its range, Home and End to its ends.
 *
 * It is controlled, and gives a value when a drag ends, when the pointer
 * that dragged the thumb is released, and at once for any other change,
 * a press of a key or a change of its input that a screen reader of a
 * phone makes. While the thumb is dragged, it shows the value it is
 * dragged to, its own state until the drag ends, so that a drag is one
 * change of the screen's and not one at each pixel.
 *
 * It may wait, with its reason, as the filters a running PCA reads on
 * popgen2.html do (waiting.ts): its input keeps the Tab key and is marked
 * `aria-disabled`, with the reason as its tooltip, on the mouse, a press
 * and the focus (WaitingTooltip.tsx), and its description; its track and
 * thumb are drawn greyed; and a key or a drag moves it nowhere. React
 * Aria's slider has no state of its own for that, so it is the value
 * given back unchanged that holds the thumb where it is.
 *
 * On popgen2.html a press of the pointer is a change under way
 * (changeHold.ts), held from the press, moved or held still, to the end
 * of the drag, to the browser cancelling the press, a touch
 * interrupted, or until the slider leaves the page; a key is a change at
 * once, and holds nothing.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Slider as AriaSlider,
  Label,
  SliderOutput,
  SliderThumb,
  SliderTrack,
} from "react-aria-components";

import { classOf } from "../classOf.ts";
import { useChangeHold } from "./changeHold.ts";
import styles from "./Slider.module.css";
import { WaitingTooltip } from "./WaitingTooltip.tsx";
import { ariaDisabledRef, describedByOf } from "./waiting.ts";

/** What a slider is drawn with. */
export interface SliderProps {
  /** Its name, above it: "Maximum proportion of missing genotypes for
      the PCA". */
  readonly label: string;
  /** The left end. */
  readonly minValue: number;
  /** The right end. */
  readonly maxValue: number;
  /** What an arrow key moves it by. */
  readonly step: number;
  /** Where it is. */
  readonly value: number;
  /** The words of a value, shown after the track, under it on a narrow
      column, and read by a screen reader: "0.05", "0.1, as in the
      Variants tab". */
  readonly valueText: (value: number) => string;
  /** The words of its two ends, drawn under them: "0" and "0.1". */
  readonly ends: { readonly min: string; readonly max: string };
  /** The id of an element elsewhere on the page that describes the
      slider, the line under it. */
  readonly describedBy?: string;
  /** Called with the value a move ended at, when it is not the value
      the move started from. */
  readonly onChangeEnd: (value: number) => void;
  /** The reason the slider waits, its tooltip and its description, while
      a key or a drag moves it nowhere; or `null`, when it does not wait.
      `null` when absent. */
  readonly waiting?: string | null;
}

/** A slider with its name and its value. */
export function Slider({
  label,
  minValue,
  maxValue,
  step,
  value,
  valueText,
  ends,
  describedBy,
  onChangeEnd,
  waiting = null,
}: SliderProps): React.JSX.Element {
  const waits = waiting !== null;
  // The value the thumb is dragged to, until the drag ends.
  const [moving, setMoving] = useState<number | null>(null);
  // Whether a pointer pressed on the track or the thumb drags it, until
  // React Aria ends the move: a change that comes otherwise, a key or the
  // input's own change, which a screen reader of a phone makes and which
  // React Aria ends with no `onChangeEnd`, is given at once.
  const dragging = useRef(false);
  // The press under way, held from the press of the pointer: a thumb
  // pressed and held still is a change the user is in the middle of.
  const hold = useChangeHold();
  // The function that stops listening for the browser cancelling the
  // press, while one is held: React Aria ends a press on the track only
  // at the release, so a touch interrupted would hold for good.
  const stopCancel = useRef<(() => void) | null>(null);
  const endPress = (): void => {
    stopCancel.current?.();
    stopCancel.current = null;
    hold.release();
  };
  // A slider gone while pressed listens no more; its hold goes with it.
  useEffect(
    () => () => {
      stopCancel.current?.();
      stopCancel.current = null;
    },
    [],
  );
  const shown = waits ? value : (moving ?? value);
  const text = valueText(shown);
  const trackRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // React Aria writes its own value text, the number as its formatter
  // writes it, and takes none from its props: written over it after each
  // draw, before the browser paints and before a screen reader reads it.
  // React Aria never marks the input aria-disabled; a slider it disables
  // leaves the order of the Tab key.
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (input === null) return;
    input.setAttribute("aria-valuetext", text);
    ariaDisabledRef(waits)(input);
  });
  return (
    <WaitingTooltip text={waiting} anchor={trackRef}>
      {(hintId) => {
        const description = describedByOf(describedBy, hintId);
        return (
          <AriaSlider
            className={
              waits
                ? `${classOf(styles, "slider")} ${classOf(styles, "waiting")}`
                : classOf(styles, "slider")
            }
            value={shown}
            minValue={minValue}
            maxValue={maxValue}
            step={step}
            onChange={(moved) => {
              // React Aria divides by the range, and gives NaN when its
              // two ends are the same.
              if (waits || !Number.isFinite(moved)) return;
              if (dragging.current) setMoving(moved);
              else if (moved !== value) onChangeEnd(moved);
            }}
            onChangeEnd={(ended) => {
              const dragged = dragging.current;
              dragging.current = false;
              setMoving(null);
              // A press with no move ends where it started, and changes
              // nothing; a key was given at its change. The hold goes
              // after the value is given.
              try {
                if (
                  !waits &&
                  dragged &&
                  Number.isFinite(ended) &&
                  ended !== value
                ) {
                  onChangeEnd(ended);
                }
              } finally {
                endPress();
              }
            }}
          >
            <Label className={classOf(styles, "label")}>{label}</Label>
            {/* The pointer pressed on the track or the thumb, before
                React Aria's handler, with the button and keys that start
                its move, the main button and no Alt, Ctrl or Meta: a
                right-click or a click with Ctrl starts none, and no
                onChangeEnd would end the drag. The element is no
                widget. */}
            <div
              className={classOf(styles, "row")}
              onPointerDownCapture={(event) => {
                const target = event.target;
                if (
                  !waits &&
                  event.button === 0 &&
                  !event.altKey &&
                  !event.ctrlKey &&
                  !event.metaKey &&
                  target instanceof Node &&
                  trackRef.current?.contains(target) === true
                ) {
                  dragging.current = true;
                  hold.take();
                  const ownerWindow =
                    event.currentTarget.ownerDocument.defaultView;
                  if (stopCancel.current === null && ownerWindow !== null) {
                    const cancelled = (): void => {
                      endPress();
                    };
                    ownerWindow.addEventListener("pointercancel", cancelled);
                    stopCancel.current = () => {
                      ownerWindow.removeEventListener(
                        "pointercancel",
                        cancelled,
                      );
                    };
                  }
                }
              }}
            >
              <div className={classOf(styles, "trackColumn")}>
                <SliderTrack
                  ref={trackRef}
                  className={classOf(styles, "track")}
                >
                  <SliderThumb
                    className={classOf(styles, "thumb")}
                    inputRef={inputRef}
                    {...(description !== undefined && {
                      "aria-describedby": description,
                    })}
                  />
                </SliderTrack>
                {/* The ends, for the eye: a screen reader reads them from
                    the slider's input. */}
                <div className={classOf(styles, "ends")} aria-hidden="true">
                  <span>{ends.min}</span>
                  <span>{ends.max}</span>
                </div>
              </div>
              <SliderOutput className={classOf(styles, "output")}>
                {text}
              </SliderOutput>
            </div>
          </AriaSlider>
        );
      }}
    </WaitingTooltip>
  );
}
