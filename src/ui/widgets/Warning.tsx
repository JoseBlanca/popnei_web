/**
 * A warning said in words: a fact of the data that changes how a result
 * is read. Its words start with "Warning:", and a mark of the colour of
 * warning goes beside them, so that it is never told by colour alone
 * (WCAG 1.4.1). Not operated, and so not a widget of React Aria; it is
 * here because the screens share it.
 */
import { classOf } from "../classOf.ts";
import styles from "./Warning.module.css";

/** What a warning is drawn with. */
export interface WarningProps {
  /** The words of the warning, after "Warning:". */
  readonly children: React.ReactNode;
}

/** A line that says a warning, with its mark. */
export function Warning({ children }: WarningProps): React.JSX.Element {
  return (
    <span className={classOf(styles, "warning")}>
      <WarningIcon />
      <span>Warning: {children}</span>
    </span>
  );
}

/** The mark of a warning, beside its words, which say it too. */
export function WarningIcon(): React.JSX.Element {
  return (
    <svg
      className={classOf(styles, "icon")}
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
      <path d="M8 1.5 15 14.5H1Z" />
      <line x1="8" y1="6" x2="8" y2="10" />
      <line x1="8" y1="12.2" x2="8" y2="12.5" />
    </svg>
  );
}
