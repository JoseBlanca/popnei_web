/**
 * A progress bar: React Aria's `ProgressBar`, with our look (react.md,
 * "Widgets: React Aria, wrapped once"). A screen reader reads its name
 * and its value, "35%", when the user reaches it; it is not a live
 * region, so its changes are not read out as they come. With no value it
 * is busy: a screen reader says so, and the bar is drawn hatched over its
 * whole length, still, since a bar that moved by itself for the whole of
 * a long calculation would be motion the user cannot stop (WCAG 2.2.2);
 * the clock beside it shows that the calculation goes on.
 */
import { ProgressBar as AriaProgressBar } from "react-aria-components";

import { classOf } from "../classOf.ts";
import styles from "./ProgressBar.module.css";

/** What a progress bar is drawn with. */
export interface ProgressBarProps {
  /** Its name for a screen reader, "Calculating the diversity"; the
      words shown beside it say the same to the eye. */
  readonly label: string;
  /** The share done, a whole percentage from 0 to 100, or `null` while
      it is not known. */
  readonly value: number | null;
}

/** A progress bar, empty to full. */
export function ProgressBar({
  label,
  value,
}: ProgressBarProps): React.JSX.Element {
  return (
    <AriaProgressBar
      aria-label={label}
      className={classOf(styles, "bar")}
      {...(value === null ? { isIndeterminate: true } : { value })}
    >
      {({ percentage, isIndeterminate }) => (
        <div className={classOf(styles, "track")}>
          {isIndeterminate ? (
            <div className={classOf(styles, "fillUnknown")} />
          ) : (
            <div
              className={classOf(styles, "fill")}
              style={{ inlineSize: `${String(percentage ?? 0)}%` }}
            />
          )}
        </div>
      )}
    </AriaProgressBar>
  );
}
