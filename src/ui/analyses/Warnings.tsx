/**
 * The warnings of a result, above it, each a sentence, with their count
 * on their heading, "2 warnings" (react.md, "The states of an analysis"),
 * shared by the panels of the Analyses step and the checks of the
 * Variants step. The class names are those of AnalysisPanel.module.css.
 */
import { useId, useRef } from "react";

import type { Warning as DataWarning } from "../../core/store.ts";
import { classOf } from "../classOf.ts";
import { Link } from "../widgets/Link.tsx";
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

/** A warning said elsewhere in the result, which the list names last
    with a link that gives the focus to it. */
export interface WarningElsewhere {
  /** The words of its item, after "Warning:". */
  readonly text: string;
  /** The words of the link, after them. */
  readonly link: string;
  /** The attribute of the element the link gives the focus to, beside
      the list in the panel. */
  readonly target: string;
}

/** The warnings of a result, above it, with their count on their
    heading; with `elsewhere`, one more, said elsewhere in the result,
    named last with its link, and counted. */
export function Warnings({
  warnings,
  elsewhere = null,
}: {
  readonly warnings: readonly DataWarning[];
  readonly elsewhere?: WarningElsewhere | null;
}): React.JSX.Element {
  const headingId = useId();
  const section = useRef<HTMLElement>(null);
  const follow = (target: string): void => {
    // The warning is in the result, beside the list in the panel.
    const found = section.current?.parentElement?.querySelector(`[${target}]`);
    if (found instanceof HTMLElement) found.focus();
  };
  return (
    <section
      ref={section}
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
        {warningsHeading(warnings.length + (elsewhere === null ? 0 : 1))}
      </h3>
      <ul className={classOf(styles, "warningList")}>
        {/* A code can come more than once, one warning per population of
            the LD decay, so the key is the code and the place. */}
        {warnings.map((warning, index) => (
          <li key={`${String(index)} ${warning.code}`}>
            <Warning>{warning.text}</Warning>
          </li>
        ))}
        {elsewhere !== null && (
          <li>
            <Warning>
              {elsewhere.text}{" "}
              <Link
                label={elsewhere.link}
                onPress={() => {
                  follow(elsewhere.target);
                }}
              />
            </Warning>
          </li>
        )}
      </ul>
    </section>
  );
}
