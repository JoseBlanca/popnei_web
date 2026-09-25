/**
 * The shell of the population genetics application, what surrounds every
 * step (docs/specs/shell.md). For now the step alone, Variants, in
 * `<main>` with its `<h1>`; the header, the stepper and the status region
 * join it with the frame of the shell.
 */

/** The shell, drawn by the entry inside the providers of the page. */
export function Shell(): React.JSX.Element {
  return (
    <main>
      {/* It takes the focus when the step changes and after Close of the
          error bar, and is not in the order of the Tab key. */}
      <h1 tabIndex={-1}>Variants</h1>
    </main>
  );
}
