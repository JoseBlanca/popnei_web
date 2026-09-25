/**
 * A button: React Aria's `Button`, with our look (react.md, "Widgets:
 * React Aria, wrapped once"). React Aria gives it the same behaviour for
 * the mouse, the keyboard and touch, and its state as data attributes,
 * which Button.module.css draws.
 */
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
  /** The element of the button, for a screen that moves the focus to it. */
  readonly ref?: React.Ref<HTMLButtonElement>;
}

/** A button with its words. */
export function Button({
  label,
  onPress,
  ref,
}: ButtonProps): React.JSX.Element {
  return (
    <AriaButton
      className={classOf(styles, "button")}
      {...(onPress !== undefined && { onPress })}
      {...(ref !== undefined && { ref })}
    >
      {label}
    </AriaButton>
  );
}
