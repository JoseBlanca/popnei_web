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
 * screen reader, is what the screen says it keeps, "0.1, keeps 1,050 of
 * 1,200 variants", where React Aria would say the number alone. Nothing is announced at each step: the
 * value is read as the thumb moves, as of any slider.
 */
import { useLayoutEffect, useRef } from "react";
import { Slider, SliderThumb, SliderTrack } from "react-aria-components";

import { classOf } from "../classOf.ts";
import styles from "./ThresholdSlider.module.css";

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
  /** Called with each value it is moved to, as it is dragged too. */
  readonly onChange: (value: number) => void;
}

/** The line of a threshold, over the frame of its plot. */
export function ThresholdSlider({
  label,
  minValue,
  maxValue,
  step,
  value,
  valueText,
  onChange,
}: ThresholdSliderProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  // React Aria writes its own value text, the number in the units of the
  // slider, and takes none from its props: written over it after each
  // draw, before the browser paints, and before a screen reader reads it,
  // which it does on the change of the value that caused the draw.
  useLayoutEffect(() => {
    inputRef.current?.setAttribute("aria-valuetext", valueText);
  });

  const onKeyDownCapture = (event: React.KeyboardEvent): void => {
    const direction = pageDirectionOf(event);
    if (direction === 0) return;
    // Before React Aria's handler and the browser's, which move it a
    // tenth of the range.
    event.preventDefault();
    event.stopPropagation();
    const moved = value + direction * PAGE_STEPS * step;
    const bounded = Math.min(maxValue, Math.max(minValue, moved));
    if (bounded !== value) onChange(bounded);
  };

  return (
    // The keys of the thumb reach it first; the element is no widget.
    <div
      className={classOf(styles, "overlay")}
      onKeyDownCapture={onKeyDownCapture}
    >
      <Slider
        aria-label={label}
        className={classOf(styles, "slider")}
        value={value}
        minValue={minValue}
        maxValue={maxValue}
        step={step}
        onChange={onChange}
      >
        <SliderTrack className={classOf(styles, "track")}>
          <SliderThumb
            className={classOf(styles, "thumb")}
            inputRef={inputRef}
          />
        </SliderTrack>
      </Slider>
    </div>
  );
}
