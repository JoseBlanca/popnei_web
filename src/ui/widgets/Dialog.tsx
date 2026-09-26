/**
 * A dialog over the page: React Aria's `ModalOverlay`, `Modal` and
 * `Dialog`, with its heading (react.md, "Widgets: React Aria, wrapped
 * once", a question that blocks). React Aria takes the focus into it when
 * it opens, keeps the Tab key inside it, closes it on Escape, hides the
 * rest of the page from a screen reader while it is open, and gives the
 * focus back to where it was when it closes.
 *
 * It is opened and closed by the screen that draws it, since the dialogs
 * of the shell open after a file is read as well as after a press. An
 * alert dialog is one that asks a question or says what went wrong, which
 * a screen reader reads out as it opens.
 */
import { useId } from "react";
import {
  Dialog as AriaDialog,
  Heading,
  Modal,
  ModalOverlay,
} from "react-aria-components";

import { classOf } from "../classOf.ts";
import styles from "./Dialog.module.css";

/** What a dialog is drawn with. */
export interface DialogProps {
  /** Its heading, which is also its name for a screen reader. */
  readonly title: string;
  /** Whether it is open. */
  readonly isOpen: boolean;
  /** Called when the user closes it with Escape. */
  readonly onClose: () => void;
  /** A dialog, or an alert dialog for a question or an error; a dialog
      when absent. */
  readonly role?: "dialog" | "alertdialog";
  /** The words under its heading, which describe it for a screen reader,
      read after its name as it opens; none when absent. */
  readonly text?: string;
  /** What it holds under its words: its fields and its buttons. */
  readonly children: React.ReactNode;
}

/** A dialog with its heading. */
export function Dialog({
  title,
  isOpen,
  onClose,
  role = "dialog",
  text,
  children,
}: DialogProps): React.JSX.Element {
  const textId = useId();
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      className={classOf(styles, "overlay")}
    >
      <Modal className={classOf(styles, "modal")}>
        <AriaDialog
          role={role}
          className={classOf(styles, "dialog")}
          {...(text !== undefined && { "aria-describedby": textId })}
        >
          <Heading slot="title" level={2} className={classOf(styles, "title")}>
            {title}
          </Heading>
          {text !== undefined && (
            <p id={textId} className={classOf(styles, "text")}>
              {text}
            </p>
          )}
          {children}
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}
