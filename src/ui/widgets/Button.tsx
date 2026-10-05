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
 * locked reason). A button may also have a hint, what pressing it would
 * do, which is shown in a tooltip on hover and on the focus of the
 * keyboard and is its description as well, as Undo and Redo have
 * (docs/specs/shell.md, "The header"); a button given both is described
 * by the two, the description first. A button may look like a link, in a
 * line of text, as "Use the default" of the diversity does, so that it is
 * not taken for the button of a step; it keeps the role and the keys of a
 * button, since it changes the project and goes nowhere.
 */
import { useId } from "react";
import { Button as AriaButton } from "react-aria-components";

import { classOf } from "../classOf.ts";
import styles from "./Button.module.css";
import { WithTooltip } from "./Tooltip.tsx";

/** Whether the description takes the focus from a script: with its
    element and the words that name the button, both or neither, so that
    words given with no element to hold them do not compile. */
export type DescriptionFocus =
  | {
      readonly descriptionRef?: never;
      readonly descriptionName?: never;
    }
  | {
      /** Given, the description takes the focus from a script, and is not
          a stop of the Tab key, as the reason of a disabled button does:
          its element, for the screen that moves the focus to it. */
      readonly descriptionRef: React.Ref<HTMLSpanElement>;
      /** Words hidden from the eye that a screen reader reads before the
          description when it has the focus, which name the button, since
          the same reason may stand beside several buttons. The
          description the button is described by stays the words shown. */
      readonly descriptionName: string;
    };

/** What a button is drawn with. */
export type ButtonProps = ButtonBaseProps & DescriptionFocus;

/** What every button is drawn with. */
interface ButtonBaseProps {
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
  /** The id of the element of the description, for a field that is
      described by it too, as the field of the name of Save is; one of
      React's when absent. */
  readonly descriptionId?: string;
  /** What pressing it would do, shown in a tooltip and read with it, or
      `null` for none; none when absent. */
  readonly hint?: string | null;
  /** The element of the button, for a screen that moves the focus to it. */
  readonly ref?: React.Ref<HTMLButtonElement>;
  /** Whether it sends the form it is in, as Enter in a field of the form
      does; false when absent. */
  readonly isSubmit?: boolean;
  /** Whether it takes the focus when it is drawn, as the OK of a dialog
      that says what went wrong does; false when absent. */
  readonly autoFocus?: boolean;
  /** How it looks: a button, the default, or a link in a line of text,
      with no border, underlined and in the colour of the links. */
  readonly look?: "button" | "link";
}

/** A button with its words. */
export function Button({
  label,
  onPress,
  isDisabled = false,
  description,
  descriptionId: givenId,
  hint = null,
  ref,
  descriptionRef,
  descriptionName = "",
  isSubmit = false,
  autoFocus = false,
  look = "button",
}: ButtonProps): React.JSX.Element {
  const ownId = useId();
  const descriptionId = givenId ?? ownId;
  const button = (
    <WithTooltip text={hint}>
      {(hintId) => {
        const describedBy = [
          description === undefined ? undefined : descriptionId,
          hintId,
        ].filter((id) => id !== undefined);
        return (
          <AriaButton
            className={classOf(styles, look === "link" ? "link" : "button")}
            isDisabled={isDisabled}
            type={isSubmit ? "submit" : "button"}
            autoFocus={autoFocus}
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
      {description !== undefined &&
        (descriptionRef === undefined ? (
          <span id={descriptionId} className={classOf(styles, "description")}>
            {description}
          </span>
        ) : (
          <span
            ref={descriptionRef}
            tabIndex={-1}
            className={classOf(styles, "description")}
          >
            <span className={classOf(styles, "visuallyHidden")}>
              {descriptionName}
            </span>
            <span id={descriptionId}>{description}</span>
          </span>
        ))}
    </span>
  );
}
