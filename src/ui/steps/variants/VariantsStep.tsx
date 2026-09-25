/**
 * The Variants step (docs/specs/steps/variants.md). For now its `<h1>`
 * alone; the step comes with task 7.4 of the walking skeleton.
 */

/** The Variants step, in the `<main>` of the shell. */
export function VariantsStep(): React.JSX.Element {
  return (
    // It takes the focus when the step changes and after Close of the
    // error bar, and is not in the order of the Tab key.
    <h1 tabIndex={-1}>Variants</h1>
  );
}
