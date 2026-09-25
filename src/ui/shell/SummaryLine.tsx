/**
 * The summary line under the stepper (docs/specs/shell.md, "The summary
 * line"): what the analyses would be run on, "panel.nei · 200 individuals
 * · 1 filter · 3 populations by pop", from `summaryLine` of words.ts. It
 * is text, and is not announced when it changes.
 */
import { classOf } from "../classOf.ts";
import { useAppState } from "../store.tsx";
import styles from "./SummaryLine.module.css";
import { summaryLine } from "./words.ts";

/** The summary line of the project. */
export function SummaryLine(): React.JSX.Element {
  const project = useAppState((s) => s.project);
  return <p className={classOf(styles, "summary")}>{summaryLine(project)}</p>;
}
