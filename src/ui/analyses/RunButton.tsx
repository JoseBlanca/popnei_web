/**
 * Run or Stop, one button in one place, so the focus stays on it when it
 * changes (docs/specs/analyses/diversity.md, "Accessibility"). A disabled
 * Run is described by the reason it cannot run. When the button leaves
 * the page while it has the focus, the calculation done or refused, it
 * calls `onGone`, for the part that holds it to move the focus: a panel
 * or the block of the histograms to its heading, the Count to the line
 * of the total or to the words of its error; so that a user of the
 * keyboard is not sent to the top of the page (WCAG 2.4.3).
 */
import { useLayoutEffect, useRef } from "react";

import { Button } from "../widgets/Button.tsx";
import type { ButtonOf } from "./status.ts";

/** What the button of a panel is drawn with. */
export interface RunButtonProps {
  /** Run, with the reason it cannot, or Stop. */
  readonly button: NonNullable<ButtonOf>;
  /** The words of the button that starts the calculation: "Run", or
      "Calculate the histograms of the variants" for a check of the
      Variants step. */
  readonly runLabel: string;
  /** Starts the calculation. */
  readonly onRun: () => void;
  /** Stops the calculation. */
  readonly onStop: () => void;
  /** Called when the button leaves the page while it has the focus, to
      move the focus where the part that holds it says. */
  readonly onGone: () => void;
}

/** Run or Stop, one button in one place. */
export function RunButton({
  button,
  runLabel,
  onRun,
  onStop,
  onGone,
}: RunButtonProps): React.JSX.Element {
  const element = useRef<HTMLButtonElement>(null);
  // The latest onGone, for the cleanup below, which runs once.
  const gone = useRef(onGone);
  useLayoutEffect(() => {
    gone.current = onGone;
  });
  useLayoutEffect(() => {
    const node = element.current;
    return () => {
      // The cleanup of a layout effect runs while the button is still in
      // the page, so the focus is still on it when it had it.
      if (node !== null && document.activeElement === node) {
        gone.current();
      }
    };
  }, []);

  if (button.kind === "stop") {
    return <Button label="Stop" onPress={onStop} ref={element} />;
  }
  return (
    <Button
      label={runLabel}
      onPress={onRun}
      ref={element}
      isDisabled={button.reason !== null}
      {...(button.reason !== null && { description: button.reason })}
    />
  );
}
