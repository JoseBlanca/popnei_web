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
 * locked reason). A button may instead have a hint, what pressing it would
 * do, which is shown in a tooltip on hover and on the focus of the
 * keyboard and is its description as well, as Undo and Redo have
 * (docs/specs/shell.md, "The header").
 */
import { useId } from "react";
import { Button as AriaButton } from "react-aria-components";

import { classOf } from "../classOf.ts";
import styles from "./Button.module.css";
import { WithTooltip } from "./Tooltip.tsx";

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
  /** What pressing it would do, shown in a tooltip and read with it, or
      `null` for none; none when absent. */
  readonly hint?: string | null;
  /** The element of the button, for a screen that moves the focus to it. */
  readonly ref?: React.Ref<HTMLButtonElement>;
}

/** A button with its words. */
export function Button({
  label,
  onPress,
  isDisabled = false,
  description,
  hint = null,
  ref,
}: ButtonProps): React.JSX.Element {
  const descriptionId = useId();
  const button = (
    <WithTooltip text={hint}>
      {(hintId) => {
        const describedBy = [
          description === undefined ? undefined : descriptionId,
          hintId,
        ].filter((id) => id !== undefined);
        return (
          <AriaButton
            className={classOf(styles, "button")}
            isDisabled={isDisabled}
            {...(onPress !== undefined && { onPress })}
            {...(ref !== undefined && { ref })}
            {...(describedBy.length > 0 && {
              "aria-describedby": describedBy.join(" "),
            })}
          >
            {label}
          </AriaButton>
        );
      }}
    </WithTooltip>
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
