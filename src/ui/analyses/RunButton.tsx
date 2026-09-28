/**
 * Run or Stop, one button in one place, so the focus stays on it when it
 * changes (docs/specs/analyses/diversity.md, "Accessibility"). A disabled
 * Run is described by the reason it cannot run, and is another button,
 * since a disabled one cannot hold the focus. When the button leaves the
 * page while it has the focus, the calculation done or refused, or a
 * Stop turned into a disabled Run, a Run that waited for the statistics
 * of each individual locked by filters that keep no one, it calls
 * `onGone`, for the part that holds it to move the focus: a panel
 * or the block of the histograms to its heading, the Count to the line
 * of the total or to the words of its error; so that a user of the
 * keyboard is not sent to the top of the page (WCAG 2.4.3). A part that
 * gives `reasonRef` can move the focus to the reason of a disabled Run;
 * the Run then calls `onGone` too when it leaves the page with the focus
 * on its reason.
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
  /** Called when the button leaves the page while it, or its reason
      given `reasonRef`, has the focus, to move the focus where the part
      that holds it says. */
  readonly onGone: () => void;
  /** Called with the element of the button shown, and `null` when it
      goes, for the part to move the focus to it. */
  readonly onButton?: (node: HTMLButtonElement | null) => void;
  /** Given the element of the reason of a disabled Run, which then takes
      the focus from a script. */
  readonly reasonRef?: React.RefObject<HTMLSpanElement | null>;
}

/** Run or Stop, one button in one place. */
export function RunButton(props: RunButtonProps): React.JSX.Element {
  const disabled = props.button.kind === "run" && props.button.reason !== null;
  // A disabled Run is another button, so that the cleanup of the one
  // before it moves the focus when it had it.
  return <OneButton key={disabled ? "disabled" : "enabled"} {...props} />;
}

/** The button: one element for an enabled Run and a Stop, and another
    for a disabled Run. */
function OneButton({
  button,
  runLabel,
  onRun,
  onStop,
  onGone,
  onButton,
  reasonRef,
}: RunButtonProps): React.JSX.Element {
  const element = useRef<HTMLButtonElement>(null);
  const setElement = (node: HTMLButtonElement | null): void => {
    element.current = node;
    onButton?.(node);
  };
  // The latest onGone, for the cleanup below, which runs once.
  const gone = useRef(onGone);
  useLayoutEffect(() => {
    gone.current = onGone;
  });
  useLayoutEffect(() => {
    const node = element.current;
    const reason = reasonRef?.current ?? null;
    return () => {
      // The cleanup of a layout effect runs while the button is still in
      // the page, so the focus is still on it when it had it.
      const active = document.activeElement;
      if (
        (node !== null && active === node) ||
        (reason !== null && active === reason)
      ) {
        gone.current();
      }
    };
    // The ref of the reason is the part's, the same object at every
    // drawing, so the effect runs once, at the mount of this button.
  }, [reasonRef]);

  if (button.kind === "stop") {
    return <Button label="Stop" onPress={onStop} ref={setElement} />;
  }
  return (
    <Button
      label={runLabel}
      onPress={onRun}
      ref={setElement}
      isDisabled={button.reason !== null}
      {...(button.reason !== null && { description: button.reason })}
      {...(button.reason !== null &&
        reasonRef !== undefined && {
          descriptionRef: reasonRef,
          descriptionName: `${runLabel} is unavailable: `,
        })}
    />
  );
}
