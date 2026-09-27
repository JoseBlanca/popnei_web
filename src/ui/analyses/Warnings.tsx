/**
 * The warnings of a result, above it, each a sentence, with their count
 * on their heading, "2 warnings" (react.md, "The states of an analysis"),
 * shared by the panels of the Analyses step and the checks of the
 * Variants step. The class names are those of AnalysisPanel.module.css.
 */
import { useId } from "react";

import type { Warning as DataWarning } from "../../core/store.ts";
import { classOf } from "../classOf.ts";
import { Warning } from "../widgets/Warning.tsx";
import styles from "./AnalysisPanel.module.css";
import { warningsHeading } from "./words.ts";

/** The warnings of a result, above it, with their count on their
    heading. */
export function Warnings({
  warnings,
}: {
  readonly warnings: readonly DataWarning[];
}): React.JSX.Element {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className={classOf(styles, "warnings")}
    >
      <h3 id={headingId} className={classOf(styles, "warningsHeading")}>
        {warningsHeading(warnings.length)}
      </h3>
      <ul className={classOf(styles, "warningList")}>
        {warnings.map((warning) => (
          <li key={warning.code}>
            <Warning>{warning.text}</Warning>
          </li>
        ))}
      </ul>
    </section>
  );
}
