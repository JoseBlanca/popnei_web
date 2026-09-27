/**
 * The Analyses step: its `<h1>` and the panel of each analysis of the
 * application shown in this step, by `src/core/apps.ts`, under it, in
 * their order (docs/specs/analyses/diversity.md, "The panel"; it has no
 * spec of its own while it holds one panel). The checks of the Variants
 * step are drawn there and not here. Each panel has an error boundary of
 * its own, so that a panel that fails to draw leaves its heading and the
 * others.
 */
import { POPGEN_ANALYSES } from "../../../core/apps.ts";
import { AnalysisPanel } from "../../analyses/AnalysisPanel.tsx";
import { stepOf, titleOf } from "../../analyses/titles.ts";
import { classOf } from "../../classOf.ts";
import { ErrorBoundary } from "../../shell/ErrorBoundary.tsx";
import styles from "./AnalysesStep.module.css";

/** The analyses shown in the Analyses step, in their order. */
const ANALYSES_OF_STEP = POPGEN_ANALYSES.filter(
  (analysis) => stepOf(analysis.id) === "analyses",
);

/** The Analyses step, in the `<main>` of the shell. */
export function AnalysesStep(): React.JSX.Element {
  return (
    <div className={classOf(styles, "step")}>
      {/* It takes the focus when the step changes and after Close of the
          error bar, and is not in the order of the Tab key. */}
      <h1 tabIndex={-1}>Analyses</h1>
      {ANALYSES_OF_STEP.map((analysis) => (
        <ErrorBoundary
          key={analysis.id}
          heading={titleOf(analysis.id)}
          level={2}
        >
          <AnalysisPanel id={analysis.id} />
        </ErrorBoundary>
      ))}
    </div>
  );
}
