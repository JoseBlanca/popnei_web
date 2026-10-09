/**
 * The box of the individuals file on popgen2.html, beside the box of the
 * variants file, or under it below 720 pixels
 * (docs/specs/steps/popgen2-input.md, "The box of the individuals
 * file"). The page opens no individuals file yet, so it holds its
 * heading and the words of no file: that every individual is
 * unclassified, and, once the variants file has given its individuals,
 * how many and what the analyses per population will do with them. The
 * zone that opens a file, the list of the column of the populations and
 * the counts come with work package 6 of docs/plans/input-page.md.
 */
import { useId } from "react";

import { classOf } from "../classOf.ts";
import { useAppState } from "../store.tsx";
import {
  INDIVIDUALS_BOX_NAME,
  noIndividualsFileText,
} from "./individualsWords.ts";
import styles from "./VariantsPage.module.css";

/** The box of the individuals file. */
export function IndividualsBox(): React.JSX.Element {
  const headingId = useId();
  // The variants file alone: a progress of the one pass changes the
  // results and not the project, and draws the box no more.
  const variants = useAppState((s) => s.project.variants);
  return (
    <section aria-labelledby={headingId} className={classOf(styles, "box")}>
      <h2 id={headingId} className={classOf(styles, "boxHeading")}>
        {INDIVIDUALS_BOX_NAME}
      </h2>
      <p className={classOf(styles, "boxLine")}>
        {noIndividualsFileText(variants)}
      </p>
    </section>
  );
}
