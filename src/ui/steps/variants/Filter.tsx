/**
 * One filter with a threshold on the Variants step, of the variants or
 * of the individuals (docs/specs/steps/variants.md, "The filters of the
 * variants" and "The two thresholds"): its switch, the line under it,
 * its fields while it is on, what it kept, and what comes after, its
 * histograms. A field is described by the line of a number it refused,
 * which the field adds itself, then by the count of its filter, then by
 * the elements of `describedAlso`, then by the line under the switch, so
 * that a user who moves to it hears what it kept before the advice; the
 * switch by the line alone.
 */
import { useId } from "react";

import { classOf } from "../../classOf.ts";
import { ErrorBoundary } from "../../shell/ErrorBoundary.tsx";
import { Switch } from "../../widgets/Switch.tsx";
import styles from "./VariantsStep.module.css";

/** The description a field of a filter is given: the ids of the count
    of its filter, while it is shown, of `describedAlso`, and of the line
    under its switch, in that order. */
export interface Described {
  /** Those ids, separated by spaces, as `aria-describedby` takes them;
      absent when there is none, so that a field spread with it gets no
      empty description. */
  readonly describedBy?: string;
}

/** What one filter is drawn with. */
export interface FilterProps {
  /** The words of its switch. */
  readonly label: string;
  /** The line under the switch, which describes the switch and the
      fields, or `null` for none. */
  readonly line: string | null;
  /** Whether the filter is on. */
  readonly isOn: boolean;
  /** What it kept, "Kept 1,152 of the 1,200 variants it was given.",
      drawn inside an error boundary of its own, or `null` while it has
      no count. */
  readonly count: React.ReactNode;
  /** The ids of elements elsewhere that describe the fields after the
      count, separated by spaces, or `null` for none. */
  readonly describedAlso?: string | null;
  /** Called when the switch is turned on or off. */
  readonly onSwitch: (on: boolean) => void;
  /** The fields of the filter, given their description; nothing while
      it is off. */
  readonly children: (described: Described) => React.ReactNode;
  /** What comes after the fields, whether the filter is on or off: the
      histograms of the number it keeps by; nothing when absent. */
  readonly after?: React.ReactNode;
}

/** One filter: its switch, the line under it, its fields, and what it
    kept. */
export function Filter({
  label,
  line,
  isOn,
  count,
  describedAlso = null,
  onSwitch,
  children,
  after,
}: FilterProps): React.JSX.Element {
  const lineId = useId();
  const countId = useId();
  const shown = isOn && count !== null;
  const ids = [
    shown ? countId : null,
    describedAlso,
    line === null ? null : lineId,
  ].filter((id) => id !== null);
  const described: Described =
    ids.length === 0 ? {} : { describedBy: ids.join(" ") };
  return (
    <div className={classOf(styles, "filter")}>
      <Switch
        label={label}
        isSelected={isOn}
        {...(line === null ? {} : { describedBy: lineId })}
        onChange={onSwitch}
      />
      {line !== null && (
        <p id={lineId} className={classOf(styles, "filterLine")}>
          {line}
        </p>
      )}
      {children(described)}
      {shown && (
        // The line is there whatever its count gives, so that the fields
        // it describes name only what is on the page.
        <p id={countId} className={classOf(styles, "count")}>
          <ErrorBoundary heading={null}>{count}</ErrorBoundary>
        </p>
      )}
      {after}
    </div>
  );
}
