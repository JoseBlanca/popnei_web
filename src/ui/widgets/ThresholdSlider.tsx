/**
 * The line of a threshold that the user drags over a histogram: React
 * Aria's `Slider` with one thumb, laid over the plot so that the thumb is
 * the vertical line of the threshold and the track the frame of the plot
 * (docs/plans/thresholds.md, "The line the user drags"). It is placed by
 * the custom properties of the frame of the plot, `--frame-left`,
 * `--frame-top`, `--frame-width` and `--frame-height`, which the screen
 * sets on an element around it as the plot draws, so that the line and
 * the plot are painted together after a resize. The plot draws
 * the dashed line itself; the thumb is a band as wide as a target of
 * WCAG 2.5.8 around it, clear but for a handle in the margin above the
 * frame and a solid line over the dashed one while it is hovered,
 * dragged or focused, so that the line stays thin. The track takes no
 * pointer, so that a click or a swipe on the bars moves nothing and
 * scrolls the page on a phone; the thumb is dragged.
 *
 * Keyboard: the arrow keys move it one step, Page Up and Page Down ten,
 * and so do Shift and an arrow key, where React Aria would move it a
 * tenth of its range, and Home and End to the ends of the axis. Its name is not drawn, since the number field
 * beside it has the same name in its visible label; its value, for a
 * screen reader, is the screen's, "0.05", or "1, keeps every variant"
 * for a threshold that is off, whose handle and line are then grey,
 * `muted`, as the plot draws its line. Nothing is announced at each
 * step: the value is read as the thumb moves, as of any slider.
 *
 * Each move is given with what made it, the pointer or a key, and the
 * end of a drag apart, when the pointer that moved the thumb is
 * released, never after a key. React Aria's own end of a change,
 * `onChangeEnd`, is not used: it comes after every press of a key as
 * well, since React Aria takes a press for a short drag
 * (docs/specs/steps/popgen2-filters.md, "The end of a drag, and the
 * keys"), and a screen that made a change of its project there would
 * make one at each press.
 *
 * It may wait, with its reason, as the thresholds of popgen2.html do
 * while a PCA runs (waiting.ts): it keeps the Tab key, a key or a drag
 * moves it nowhere, its handle is drawn in the colour of a control that
 * cannot be used, and its input is marked `aria-disabled`, with the
 * reason as its tooltip and its description. React Aria's slider has no
 * state of its own for that, so it is the value given back unchanged
 * that holds the thumb where it is.
 */
import { useEffect, useLayoutEffect, useRef } from "react";
import { Slider, SliderThumb, SliderTrack } from "react-aria-components";

import { classOf } from "../classOf.ts";
import styles from "./ThresholdSlider.module.css";
import { WithTooltip } from "./Tooltip.tsx";

/** The steps Page Up and Page Down move the thumb by. */
const PAGE_STEPS = 10;

/** Whether the key of `event` moves the thumb by ten steps, and which
    way: Page Up and Page Down, with Shift or without, and Shift with an
    arrow key, up and right up, down and left down; 0 for any other key,
    and with Alt, Ctrl or ⌘ held. */
function pageDirectionOf(event: React.KeyboardEvent): -1 | 0 | 1 {
  if (event.altKey || event.ctrlKey || event.metaKey) return 0;
  if (event.key === "PageUp") return 1;
  if (event.key === "PageDown") return -1;
  if (!event.shiftKey) return 0;
  if (event.key === "ArrowUp" || event.key === "ArrowRight") return 1;
  if (event.key === "ArrowDown" || event.key === "ArrowLeft") return -1;
  return 0;
}

/** What the line of a threshold is drawn with. */
export interface ThresholdSliderProps {
  /** Its name for a screen reader, the label of the number field beside
      it: "Maximum proportion of missing genotypes". */
  readonly label: string;
  /** The left end of the horizontal axis of the plot, in the units of
      the slider. */
  readonly minValue: number;
  /** The right end. */
  readonly maxValue: number;
  /** What an arrow key moves it by. */
  readonly step: number;
  /** Where it is. */
  readonly value: number;
  /** What a screen reader says as its value. */
  readonly valueText: string;
  /** Whether its handle and its line are drawn in grey, a threshold that
      removes nothing, which `valueText` says. */
  readonly muted: boolean;
  /** Called with each value it is moved to, and with what moved it: the
      pointer, as it is dragged, or a key. */
  readonly onChange: (value: number, by: MovedBy) => void;
  /** Called with the value it was dragged to when the pointer that moved
      it is released; not for a press of the thumb that moved nothing,
      and never after a key. */
  readonly onDragEnd: (value: number) => void;
  /** The reason the line waits, its tooltip and its description, while a
      key or a drag moves it nowhere; or `null`, when it does not wait.
      `null` when absent. */
  readonly waiting?: string | null;
}

/** What moved the thumb: the pointer or a key. */
export type MovedBy = "pointer" | "key";

/** The line of a threshold, over the frame of its plot. */
export function ThresholdSlider({
  label,
  minValue,
  maxValue,
  step,
  value,
  valueText,
  muted,
  onChange,
  onDragEnd,
  waiting = null,
}: ThresholdSliderProps): React.JSX.Element {
  const waits = waiting !== null;
  const inputRef = useRef<HTMLInputElement>(null);
  // While a pointer is down on the thumb: the value it last moved it to,
  // or `null` before it moved it; and the function that stops listening
  // for its release.
  const drag = useRef<{
    moved: number | null;
    readonly stop: () => void;
  } | null>(null);
  // The latest onDragEnd, for the listener of the release, made at the
  // press.
  const dragEndRef = useRef(onDragEnd);
  useLayoutEffect(() => {
    dragEndRef.current = onDragEnd;
  });
  // A slider gone while dragged listens no more.
  useEffect(
    () => () => {
      drag.current?.stop();
      drag.current = null;
    },
    [],
  );
  // React Aria writes its own value text, the number in the units of the
  // slider, and takes none from its props: written over it after each
  // draw, before the browser paints, and before a screen reader reads it,
  // which it does on the change of the value that caused the draw.
  useLayoutEffect(() => {
    const input = inputRef.current;
    input?.setAttribute("aria-valuetext", valueText);
    // React Aria never marks the input so; a slider it disables leaves
    // the order of the Tab key.
    if (waits) input?.setAttribute("aria-disabled", "true");
    else input?.removeAttribute("aria-disabled");
  });

  const onKeyDownCapture = (event: React.KeyboardEvent): void => {
    const direction = pageDirectionOf(event);
    if (direction === 0) return;
    // Before React Aria's handler and the browser's, which move it a
    // tenth of the range.
    event.preventDefault();
    event.stopPropagation();
    if (waits) return;
    const moved = value + direction * PAGE_STEPS * step;
    const bounded = Math.min(maxValue, Math.max(minValue, moved));
    if (bounded !== value) onChange(bounded, "key");
  };

  /** A pointer pressed on the thumb, before React Aria's handler: its
      release, on the window wherever it is, ends the drag. */
  const onPointerDownCapture = (event: React.PointerEvent): void => {
    if (waits || !event.isPrimary || drag.current !== null) return;
    const ownerWindow = event.currentTarget.ownerDocument.defaultView;
    if (ownerWindow === null) return;
    const release = (up: PointerEvent): void => {
      if (up.pointerId !== event.pointerId) return;
      const ended = drag.current;
      drag.current = null;
      stop();
      if (ended?.moved !== null && ended?.moved !== undefined) {
        dragEndRef.current(ended.moved);
      }
    };
    const stop = (): void => {
      ownerWindow.removeEventListener("pointerup", release);
      ownerWindow.removeEventListener("pointercancel", release);
    };
    ownerWindow.addEventListener("pointerup", release);
    ownerWindow.addEventListener("pointercancel", release);
    drag.current = { moved: null, stop };
  };

  return (
    // The keys and the pointer of the thumb reach it first; the element
    // is no widget.
    <div
      className={classOf(styles, "overlay")}
      {...(muted && { "data-muted": "" })}
      {...(waits && { "data-waiting": "" })}
      onKeyDownCapture={onKeyDownCapture}
      onPointerDownCapture={onPointerDownCapture}
    >
      <WithTooltip text={waiting} keepOnPress={waits}>
        {(hintId) => (
          <Slider
            aria-label={label}
            className={classOf(styles, "slider")}
            value={value}
            minValue={minValue}
            maxValue={maxValue}
            step={step}
            onChange={(moved) => {
              // Waiting, the value given back holds the thumb.
              if (waits) return;
              const dragged = drag.current;
              if (dragged === null) {
                onChange(moved, "key");
                return;
              }
              dragged.moved = moved;
              onChange(moved, "pointer");
            }}
          >
            <SliderTrack className={classOf(styles, "track")}>
              <SliderThumb
                className={classOf(styles, "thumb")}
                inputRef={inputRef}
                {...(hintId !== undefined && { "aria-describedby": hintId })}
              />
            </SliderTrack>
          </Slider>
        )}
      </WithTooltip>
    </div>
  );
}
