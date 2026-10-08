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
import { DIALOG_MARK } from "./dialogMark.ts";
import styles from "./Dialog.module.css";

/** What a dialog shows above its fields and its buttons. */
export interface DialogContent {
  /** Its heading, which is also its name for a screen reader. */
  readonly title: string;
  /** The words under its heading, which describe it for a screen reader,
      read after its name as it opens; words with a link among them, drawn
      by the screen; `null` for none. */
  readonly text: string | React.JSX.Element | null;
}

/** What a dialog is drawn with, whose content is of the type `C`. */
export interface DialogProps<C extends DialogContent> {
  /** What it shows while it is open, or `null` while it is closed. */
  readonly content: C | null;
  /** Called when the user closes it with Escape. */
  readonly onClose: () => void;
  /** A dialog, or an alert dialog for a question or an error; a dialog
      when absent. */
  readonly role?: "dialog" | "alertdialog";
  /** What it holds under its words, its fields and its buttons, drawn
      from its content. */
  readonly children: (content: C) => React.ReactNode;
}

/** A dialog with its heading. */
export function Dialog<C extends DialogContent>({
  content,
  onClose,
  role = "dialog",
  children,
}: DialogProps<C>): React.JSX.Element {
  const textId = useId();
  const text = content === null ? null : content.text;
  return (
    <ModalOverlay
      isOpen={content !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      className={classOf(styles, "overlay")}
    >
      {/* The modal is drawn while the overlay closes too, which React Aria
          waits for before it takes the overlay off the page; its content,
          gone by then, is not. */}
      <Modal className={classOf(styles, "modal")}>
        <AriaDialog
          role={role}
          className={classOf(styles, "dialog")}
          {...{ [DIALOG_MARK]: "" }}
          {...(text !== null && { "aria-describedby": textId })}
        >
          {content !== null && (
            <>
              <Heading
                slot="title"
                level={2}
                className={classOf(styles, "title")}
              >
                {content.title}
              </Heading>
              {text !== null && (
                <p id={textId} className={classOf(styles, "text")}>
                  {text}
                </p>
              )}
              {children(content)}
            </>
          )}
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}
