/**
 * A field of text: React Aria's `TextField`, with its label (react.md,
 * "Widgets: React Aria, wrapped once"). The field may take the focus when
 * it is drawn, with its text selected, so that typing replaces it, as the
 * field of the name in the dialog of Save does (docs/specs/shell.md,
 * "Accessibility").
 */
import {
  Input,
  Label,
  TextField as AriaTextField,
} from "react-aria-components";

import { classOf } from "../classOf.ts";
import styles from "./TextField.module.css";

/** What a field of text is drawn with. */
export interface TextFieldProps {
  /** The label of the field, which is also its name for a screen reader. */
  readonly label: string;
  /** The text in the field. */
  readonly value: string;
  /** Called with the text at every change of it. */
  readonly onChange: (value: string) => void;
  /** Whether it takes the focus, its text selected, when it is drawn;
      false when absent. */
  readonly autoFocus?: boolean;
}

/** A field of text with its label. */
export function TextField({
  label,
  value,
  onChange,
  autoFocus = false,
}: TextFieldProps): React.JSX.Element {
  return (
    <AriaTextField
      className={classOf(styles, "field")}
      value={value}
      onChange={onChange}
      autoFocus={autoFocus}
      // The text selected when the field takes the focus, so that typing
      // replaces it.
      onFocus={(event) => {
        if (autoFocus && event.target instanceof HTMLInputElement) {
          event.target.select();
        }
      }}
    >
      <Label className={classOf(styles, "label")}>{label}</Label>
      <Input className={classOf(styles, "input")} spellCheck={false} />
    </AriaTextField>
  );
}
