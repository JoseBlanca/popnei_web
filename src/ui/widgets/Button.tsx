/**
 * A button: React Aria's `Button`, with our look (react.md, "Widgets:
 * React Aria, wrapped once"). React Aria gives it the same behaviour for
 * the mouse, the keyboard and touch, and its state as data attributes,
 * which Button.module.css draws.
 *
 * A button may be disabled, and described. A disabled button cannot take
 * the focus, so its description is text on the screen, after it, which a
 * screen reader reaches in its reading and reads with the button, by
 * `aria-describedby`; a disabled button alone would say neither why nor
 * what to do (docs/specs/analyses/diversity.md, "Accessibility", the
 * locked reason). Undo and Redo, described on hover as well
 * (docs/specs/shell.md, "The header"), add that in the shell.
 */
import { useId } from "react";
import { Button as AriaButton } from "react-aria-components";

import { classOf } from "../classOf.ts";
import styles from "./Button.module.css";

/** What a button is drawn with. */
export interface ButtonProps {
  /** The words on the button, which are also its name for a screen
      reader. */
  readonly label: string;
  /** What pressing it does, with the mouse, the keyboard or a touch;
      absent only inside a widget that gives the press itself, the
      `FileTrigger` of `FileZone`. */
  readonly onPress?: () => void;
  /** Whether it cannot be pressed now; false when absent. */
  readonly isDisabled?: boolean;
  /** Words that say more of the button, why it is disabled among them,
      shown after it and read with it. */
  readonly description?: string;
  /** The element of the button, for a screen that moves the focus to it. */
  readonly ref?: React.Ref<HTMLButtonElement>;
}

/** A button with its words. */
export function Button({
  label,
  onPress,
  isDisabled = false,
  description,
  ref,
}: ButtonProps): React.JSX.Element {
  const descriptionId = useId();
  const button = (
    <AriaButton
      className={classOf(styles, "button")}
      isDisabled={isDisabled}
      {...(onPress !== undefined && { onPress })}
      {...(ref !== undefined && { ref })}
      {...(description !== undefined && {
        "aria-describedby": descriptionId,
      })}
    >
      {label}
    </AriaButton>
  );
  // The same tree with a description and without, so that a button that
  // gains or loses one stays the same element, and keeps the focus and
  // the refs that hold it.
  return (
    <span className={classOf(styles, "described")}>
      {button}
      {description !== undefined && (
        <span id={descriptionId} className={classOf(styles, "description")}>
          {description}
        </span>
      )}
    </span>
  );
}
