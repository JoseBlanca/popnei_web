/**
 * The Analyses step: its `<h1>`, the list of links to its analyses, and
 * the panel of each analysis of the application shown in this step, by
 * `src/core/apps.ts`, under it, in their order (docs/specs/shell.md, "The
 * links to the analyses"; docs/specs/analyses/diversity.md, "The panel";
 * it has no spec of its own). The checks of the Variants step are drawn
 * there and not here. Each panel has an error boundary of its own, so that
 * a panel that fails to draw leaves its heading and the others.
 */
import { useRef } from "react";

import { POPGEN_ANALYSES } from "../../../core/apps.ts";
import type { AnalysisId } from "../../../core/project.ts";
import { AnalysisPanel } from "../../analyses/AnalysisPanel.tsx";
import { stepOf, titleOf } from "../../analyses/titles.ts";
import { classOf } from "../../classOf.ts";
import { ErrorBoundary } from "../../shell/ErrorBoundary.tsx";
import { Link } from "../../widgets/Link.tsx";
import styles from "./AnalysesStep.module.css";

/** The analyses shown in the Analyses step, in their order. */
const ANALYSES_OF_STEP = POPGEN_ANALYSES.filter(
  (analysis) => stepOf(analysis.id) === "analyses",
);

/** The name of the list of links, for a screen reader. */
const LINKS_LABEL = "Analyses of this step";

/** The Analyses step, in the `<main>` of the shell. */
export function AnalysesStep(): React.JSX.Element {
  // The element around each panel, by its analysis, where a link finds
  // the heading of the panel, or that of its error boundary.
  const panels = useRef(new Map<AnalysisId, HTMLElement>());

  return (
    <div className={classOf(styles, "step")}>
      {/* It takes the focus when the step changes and after Close of the
          error bar, and is not in the order of the Tab key. */}
      <h1 tabIndex={-1}>Analyses</h1>
      {/* Links within the page that move the focus, not anchors: the
          address after # names the step (shell.md, "The links to the
          analyses"). */}
      <nav aria-label={LINKS_LABEL}>
        <ul className={classOf(styles, "links")}>
          {ANALYSES_OF_STEP.map((analysis) => (
            <li key={analysis.id}>
              <Link
                label={titleOf(analysis.id)}
                onPress={() => {
                  panels.current
                    .get(analysis.id)
                    ?.querySelector<HTMLElement>("h2")
                    ?.focus();
                }}
              />
            </li>
          ))}
        </ul>
      </nav>
      {ANALYSES_OF_STEP.map((analysis) => (
        <div
          key={analysis.id}
          ref={(element) => {
            if (element === null) {
              panels.current.delete(analysis.id);
            } else {
              panels.current.set(analysis.id, element);
            }
          }}
        >
          <ErrorBoundary heading={titleOf(analysis.id)} level={2}>
            <AnalysisPanel id={analysis.id} />
          </ErrorBoundary>
        </div>
      ))}
    </div>
  );
}
