/**
 * The Analyses step, which holds the panel of each analysis
 * (docs/specs/analyses/diversity.md). For now its `<h1>` alone; the panel
 * of the diversity comes with work package 8 of the walking skeleton.
 */

/** The Analyses step, in the `<main>` of the shell. */
export function AnalysesStep(): React.JSX.Element {
  return (
    // It takes the focus when the step changes and after Close of the
    // error bar, and is not in the order of the Tab key.
    <h1 tabIndex={-1}>Analyses</h1>
  );
}
