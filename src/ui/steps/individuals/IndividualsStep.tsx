/**
 * The Individuals step (docs/specs/steps/individuals.md). For now its
 * `<h1>` alone; the step comes with work package 8 of the walking
 * skeleton.
 */

/** The Individuals step, in the `<main>` of the shell. */
export function IndividualsStep(): React.JSX.Element {
  return (
    // It takes the focus when the step changes and after Close of the
    // error bar, and is not in the order of the Tab key.
    <h1 tabIndex={-1}>Individuals</h1>
  );
}
