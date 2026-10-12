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

/** The attribute of the heading of the warnings, by which the band's
    link to the warnings of the PCA on popgen2.html finds it. */
export const WARNINGS_HEADING_ATTRIBUTE = "data-warnings-heading";

/** The attribute of the warning of the spectrum of the diversity, said
    at the end of the caption of its block and not among the warnings
    above the result, by which the band's link on popgen2.html finds it
    when it is the only warning (docs/specs/steps/popgen2-band.md, "The
    warning of the spectrum"). */
export const SPECTRUM_WARNING_ATTRIBUTE = "data-spectrum-warning";

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
      {/* It takes the focus from the band's link to the warnings of the
          PCA on popgen2.html, and is not in the order of the Tab key. */}
      <h3
        id={headingId}
        tabIndex={-1}
        {...{ [WARNINGS_HEADING_ATTRIBUTE]: "" }}
        className={classOf(styles, "warningsHeading")}
      >
        {warningsHeading(warnings.length)}
      </h3>
      <ul className={classOf(styles, "warningList")}>
        {/* A code can come more than once, one warning per population of
            the LD decay, so the key is the code and the place. */}
        {warnings.map((warning, index) => (
          <li key={`${String(index)} ${warning.code}`}>
            <Warning>{warning.text}</Warning>
          </li>
        ))}
      </ul>
    </section>
  );
}
