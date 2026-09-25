/**
 * The error boundary around the body of a step, and around each analysis
 * panel of the Analyses step (react.md, "Errors";
 * docs/specs/entry.md, "The errors nothing else shows"): it catches what
 * throws while React draws the step, and draws in its place the step's
 * `<h1>` alone, or the panel's `<h2>`, so that the header, the stepper and the other steps keep
 * working. It has no words of its own: React gives the error to
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
      analysis panel. */
  readonly heading: string;
  /** The level of the heading: 1 for a step, the default, 2 for an
      analysis panel inside the Analyses step. */
  readonly level?: 1 | 2;
  /** The body of the step. */
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  /** Something under the boundary threw while it was drawn. */
  readonly failed: boolean;
}

/** The boundary of a step's body. */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  override render(): ReactNode {
    if (this.state.failed) {
      // It takes the focus when the step changes, as the step's own does.
      return this.props.level === 2 ? (
        <h2 tabIndex={-1}>{this.props.heading}</h2>
      ) : (
        <h1 tabIndex={-1}>{this.props.heading}</h1>
      );
    }
    return this.props.children;
  }
}
