/**
 * The Analyses step: its `<h1>` and the panel of each analysis of the
 * application under it, in their order (docs/specs/analyses/diversity.md,
 * "The panel"; it has no spec of its own while it holds one panel). Each
 * panel has an error boundary of its own, so that a panel that fails to
 * draw leaves its heading and the others.
 */
import { POPGEN_ANALYSES } from "../../../core/apps.ts";
import { AnalysisPanel } from "../../analyses/AnalysisPanel.tsx";
import { titleOf } from "../../analyses/panels.ts";
import { classOf } from "../../classOf.ts";
import { ErrorBoundary } from "../../shell/ErrorBoundary.tsx";
import styles from "./AnalysesStep.module.css";

/** The Analyses step, in the `<main>` of the shell. */
export function AnalysesStep(): React.JSX.Element {
  return (
    <div className={classOf(styles, "step")}>
      {/* It takes the focus when the step changes and after Close of the
          error bar, and is not in the order of the Tab key. */}
      <h1 tabIndex={-1}>Analyses</h1>
      {POPGEN_ANALYSES.map((analysis) => (
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
