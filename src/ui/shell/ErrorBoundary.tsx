/**
 * The error boundary around the body of a step, around each analysis
 * panel of the Analyses step, and around each part of a check of the
 * Variants step, a histogram, the block of the histograms and the Count
 * (react.md, "Errors"; docs/specs/entry.md, "The errors nothing else
 * shows"): it catches what throws while React draws what it holds, and
 * draws in its place the step's `<h1>` alone, the panel's `<h2>`, or the
 * part's `<h3>`, so that the header, the stepper, the other steps and the
 * rest of the step keep working. It has no words of its own: React gives the error to
 * `onCaughtError` of the application's root, and the entry gives it to the
 * error bar, which says what happened. The shell keys it by the step, so
 * that going to another step and back draws the step again.
 *
 * A class, since React has no function form of a boundary.
 */
import { Component } from "react";
import type { ReactNode } from "react";

/** What the boundary is drawn with. */
export interface ErrorBoundaryProps {
  /** The name of the step, the words of its `<h1>`, or the title of an
      analysis panel or of a part of a check; `null` for a part inside a
      line, the count beside a filter, in whose place nothing is drawn,
      since a heading there would stand once per filter, and the error bar
      says what happened. */
  readonly heading: string | null;
  /** The level of the heading: 1 for a step, the default, 2 for an
      analysis panel inside the Analyses step, 3 for a part of a check
      of the Variants step, 4 for the spectrum of a population, under
      the heading of its block. */
  readonly level?: 1 | 2 | 3 | 4;
  /** A value whose change draws again what caught a defect, the id of
      the variants file loaded for the PCA tab of popgen2.html, so that a
      defect does not last past another file; what caught nothing keeps
      what it holds, where a `key` would draw it anew. Absent, nothing
      draws it again but a `key`. */
  readonly resetOn?: string;
  /** The body of the step. */
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  /** Something under the boundary threw while it was drawn. */
  readonly failed: boolean;
  /** The `resetOn` the boundary was last drawn with. */
  readonly resetOn: string | undefined;
}

/** The boundary of a step's body. */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = {
    failed: false,
    resetOn: this.props.resetOn,
  };

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { failed: true };
  }

  static getDerivedStateFromProps(
    props: ErrorBoundaryProps,
    state: ErrorBoundaryState,
  ): Partial<ErrorBoundaryState> | null {
    return props.resetOn === state.resetOn
      ? null
      : { failed: false, resetOn: props.resetOn };
  }

  override render(): ReactNode {
    if (this.state.failed) {
      if (this.props.heading === null) return null;
      // It takes the focus when the step changes, as the step's own does.
      switch (this.props.level) {
        case 4:
          return <h4 tabIndex={-1}>{this.props.heading}</h4>;
        case 3:
          return <h3 tabIndex={-1}>{this.props.heading}</h3>;
        case 2:
          return <h2 tabIndex={-1}>{this.props.heading}</h2>;
        case 1:
        case undefined:
          return <h1 tabIndex={-1}>{this.props.heading}</h1>;
      }
    }
    return this.props.children;
  }
}
