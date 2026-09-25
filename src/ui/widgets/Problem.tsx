/**
 * A problem said in words: a file refused, a file not loaded. Its mark
 * and a line of the colour of danger go beside the words, which say what
 * it is by themselves, so that it is never told by colour alone (WCAG
 * 1.4.1). Not operated, and so not a widget of React Aria; it is here
 * because the steps share it.
 */
import { classOf } from "../classOf.ts";
import styles from "./Problem.module.css";

/** What a problem is drawn with. */
export interface ProblemProps {
  /** The words of the problem. */
  readonly children: React.ReactNode;
}

/** A paragraph that says a problem, with its mark. */
export function Problem({ children }: ProblemProps): React.JSX.Element {
  return (
    <p className={classOf(styles, "problem")}>
      <ProblemIcon />
      <span>{children}</span>
    </p>
  );
}

/** The mark of a problem, beside its words, which say it too. */
export function ProblemIcon(): React.JSX.Element {
  return (
    <svg
      className={classOf(styles, "icon")}
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="7" />
      <line x1="8" y1="4" x2="8" y2="9" />
      <line x1="8" y1="11.5" x2="8" y2="12" />
    </svg>
  );
}
