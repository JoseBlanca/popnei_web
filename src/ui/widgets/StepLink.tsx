/**
 * A link of the stepper to one step of the application: React Aria's
 * `Link`, an `<a>` to the step's hash that the browser follows and makes
 * an entry of its history (docs/specs/shell.md, "The stepper"). It shows
 * the name of the step and, under it, its state, a word with a symbol
 * beside it, so that the state is not told by colour alone (WCAG 1.4.1);
 * its name for a screen reader is the two, "Variants, To do", which
 * holds the words on the screen (WCAG 2.5.3), the symbol left out. The
 * reason of a step that is not done is its description, and a tooltip on
 * hover and on focus. The link of the step on screen has
 * `aria-current="step"` and a mark that is not colour alone. Each name is
 * as wide as itself in bold, whether it is in bold or not, so that the
 * links do not move when the step changes (StepLink.module.css).
 */
import { Link as AriaLink } from "react-aria-components";

import { classOf } from "../classOf.ts";
import styles from "./StepLink.module.css";
import { WithTooltip } from "./Tooltip.tsx";

/** What a link of the stepper is drawn with. */
export interface StepLinkProps {
  /** The hash of the step, `#variants`. */
  readonly href: string;
  /** The name of the step, the one of its `<h1>`. */
  readonly label: string;
  /** The state of the step in a word or two, "To do". */
  readonly state: string;
  /** The symbol beside the state, which a screen reader does not read. */
  readonly symbol: string;
  /** Why the step is not done, or `null` when it needs no reason. */
  readonly reason: string | null;
  /** Whether the step is the one on screen. */
  readonly isCurrent: boolean;
}

/** A link of the stepper. */
export function StepLink({
  href,
  label,
  state,
  symbol,
  reason,
  isCurrent,
}: StepLinkProps): React.JSX.Element {
  return (
    <WithTooltip text={reason}>
      {(describedBy) => (
        <AriaLink
          className={classOf(styles, "step")}
          href={href}
          aria-current={isCurrent ? "step" : undefined}
          // The name and the state, which are on two lines on the screen,
          // with a comma between them for a screen reader.
          aria-label={`${label}, ${state}`}
          {...(describedBy !== undefined && {
            "aria-describedby": describedBy,
          })}
        >
          {/* The name in bold, drawn hidden by the CSS for its width
              alone. */}
          <span className={classOf(styles, "name")} data-label={label}>
            {label}
          </span>
          <span className={classOf(styles, "state")}>
            <span aria-hidden="true">{symbol}</span> {state}
          </span>
        </AriaLink>
      )}
    </WithTooltip>
  );
}
