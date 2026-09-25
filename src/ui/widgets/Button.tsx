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
  /** What pressing it does, with the mouse, the keyboard or a touch. */
  readonly onPress: () => void;
}

/** A button with its words. */
export function Button({ label, onPress }: ButtonProps): React.JSX.Element {
  return (
    <AriaButton className={classOf(styles, "button")} onPress={onPress}>
      {label}
    </AriaButton>
  );
}
