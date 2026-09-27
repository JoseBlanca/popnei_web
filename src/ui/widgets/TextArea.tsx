/**
 * A field of several lines of text: React Aria's `TextField` with a
 * `TextArea`, and its label (react.md, "Widgets: React Aria, wrapped
 * once"), for a list of names typed or pasted one per line, the lists of
 * individuals of the Variants step. Enter in it starts a new line, and
 * its Ctrl+Z and Cmd+Z are the browser's undo of its text, as in any
 * field of text (docs/specs/shell.md, "The header").
 */
import {
  Label,
  TextArea as AriaTextArea,
  TextField as AriaTextField,
} from "react-aria-components";

import { classOf } from "../classOf.ts";
import styles from "./TextArea.module.css";

/** What a field of several lines is drawn with. */
export interface TextAreaProps {
  /** The label of the field, which is also its name for a screen reader. */
  readonly label: string;
  /** The text in the field. */
  readonly value: string;
  /** Called with the text at every change of it. */
  readonly onChange: (value: string) => void;
  /** The ids of the elements whose words describe the field, in the
      order they are read, or `null` for none; none when absent. */
  readonly describedBy?: string | null;
}

/** A field of several lines with its label. */
export function TextArea({
  label,
  value,
  onChange,
  describedBy = null,
}: TextAreaProps): React.JSX.Element {
  return (
    <AriaTextField
      className={classOf(styles, "field")}
      value={value}
      onChange={onChange}
      {...(describedBy !== null && { "aria-describedby": describedBy })}
    >
      <Label className={classOf(styles, "label")}>{label}</Label>
      <AriaTextArea
        className={classOf(styles, "input")}
        rows={6}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
      />
    </AriaTextField>
  );
}
