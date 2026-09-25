/**
 * A link of the stepper to one step of the application: React Aria's
 * `Link`, an `<a>` to the step's hash that the browser follows and makes
 * an entry of its history (docs/specs/shell.md, "The stepper"). The link
 * of the step on screen has `aria-current="step"` and a mark that is not
 * colour alone (WCAG 1.4.1). Each link is as wide as its name in bold,
 * whether it is in bold or not, so that the links do not move when the
 * step changes (StepLink.module.css).
 */
import { Link as AriaLink } from "react-aria-components";

import { classOf } from "../classOf.ts";
import styles from "./StepLink.module.css";

/** What a link of the stepper is drawn with. */
export interface StepLinkProps {
  /** The hash of the step, `#variants`. */
  readonly href: string;
  /** The name of the step, the one of its `<h1>`. */
  readonly label: string;
  /** Whether the step is the one on screen. */
  readonly isCurrent: boolean;
}

/** A link of the stepper. */
export function StepLink({
  href,
  label,
  isCurrent,
}: StepLinkProps): React.JSX.Element {
  return (
    <AriaLink
      className={classOf(styles, "step")}
      href={href}
      aria-current={isCurrent ? "step" : undefined}
      // The name in bold, drawn hidden by the CSS for its width alone.
      data-label={label}
    >
      {label}
    </AriaLink>
  );
}
