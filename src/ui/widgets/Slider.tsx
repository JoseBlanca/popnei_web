/**
 * A slider with its name and its value: React Aria's `Slider` with one
 * thumb, its `Label`, its `SliderOutput` and its `SliderTrack`, with our
 * look (react.md, "Widgets: React Aria, wrapped once"), for a number
 * between two ends that the user moves to, as the PCA's own missing data
 * and MAF filters of popgen2.html (docs/specs/steps/popgen2-pca.md, "Its
 * filters"). The name stands above the track and the value at the end of
 * the name's line, in the words the screen gives, which a screen reader
 * reads as the slider's value too.
 *
 * Keyboard, as React Aria gives it: the arrow keys move it a step, Page
 * Up and Page Down a tenth of its range, Home and End to its ends.
 *
 * It is controlled, and gives a value when a move ends: when the pointer
 * that dragged the thumb is released, and at each press of a key, React
 * Aria's `onChangeEnd`. While the thumb is dragged, it shows the value it
 * is dragged to, its own state until the move ends, so that a drag is one
 * change of the screen's and not one at each pixel.
 *
 * It may wait, with its reason, as the filters a running PCA reads on
 * popgen2.html do (waiting.ts): its input keeps the Tab key and is marked
 * `aria-disabled`, with the reason as its tooltip, on the mouse, a press
 * and the focus (WaitingTooltip.tsx), and its description; its track and
 * thumb are drawn greyed; and a key or a drag moves it nowhere. React
 * Aria's slider has no state of its own for that, so it is the value
 * given back unchanged that holds the thumb where it is.
 */
import { useLayoutEffect, useRef, useState } from "react";
import {
  Slider as AriaSlider,
  Label,
  SliderOutput,
  SliderThumb,
  SliderTrack,
} from "react-aria-components";

import { classOf } from "../classOf.ts";
import styles from "./Slider.module.css";
import { WaitingTooltip } from "./WaitingTooltip.tsx";
import { describedByOf } from "./waiting.ts";

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
  /** The words of a value, shown beside the name and read by a screen
      reader: "0.05", "0.1, as in the Variants tab". */
  readonly valueText: (value: number) => string;
  /** The id of an element elsewhere on the page that describes the
      slider, the line under it. */
  readonly describedBy?: string;
  /** Called with the value a move ended at. */
  readonly onChange: (value: number) => void;
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
  describedBy,
  onChange,
  waiting = null,
}: SliderProps): React.JSX.Element {
  const waits = waiting !== null;
  // The value the thumb is dragged to, until the move ends.
  const [moving, setMoving] = useState<number | null>(null);
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
    if (waits) input.setAttribute("aria-disabled", "true");
    else input.removeAttribute("aria-disabled");
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
              if (!waits) setMoving(moved);
            }}
            onChangeEnd={(ended) => {
              setMoving(null);
              if (!waits) onChange(ended);
            }}
          >
            <Label className={classOf(styles, "label")}>{label}</Label>
            <div className={classOf(styles, "row")}>
              <SliderTrack ref={trackRef} className={classOf(styles, "track")}>
                <SliderThumb
                  className={classOf(styles, "thumb")}
                  inputRef={inputRef}
                  {...(description !== undefined && {
                    "aria-describedby": description,
                  })}
                />
              </SliderTrack>
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
