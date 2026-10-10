/**
 * Undo and Redo, the two buttons and their keys, in the header of the
 * shell of popgen.html, beside Open project… and Save project
 * (docs/specs/shell.md, "The header"). popgen2.html has no Undo and no
 * Redo since 10 October 2026 (docs/specs/steps/popgen2-pca.md, "No Undo
 * and no Redo").
 *
 * Undo and Redo are described by what they would take back or bring
 * again, "Undo: the filter of the variants by missing data changed".
 * Both are always drawn, and disabled when they have none. When a press
 * takes the last step and its button becomes disabled, the focus moves
 * to the other, which that press has just enabled, since the browser
 * would otherwise drop the focus to the start of the page (WCAG 2.4.3).
 * When an undo or a redo removes another control that had the focus,
 * the focus goes to the `<h1>` of the step (focusKept.ts). An undo or a
 * redo is announced as undoRedo.ts says.
 *
 * The keys, Ctrl+Z, Ctrl+Shift+Z and Ctrl+Y, and Cmd+Z and Cmd+Shift+Z on
 * macOS, are caught on the whole window while this part is drawn, which
 * is from the opening of the page, as shortcuts.ts says: a key with no
 * step to take does nothing and does not reach the browser's own undo.
 * The browser's own undo in a text field is kept from reaching another
 * field.
 *
 * The two buttons are drawn with nothing around them, so that the header
 * places them.
 */
import { useEffect, useRef } from "react";
import { flushSync } from "react-dom";

import { useAppState, useUndoStore } from "../store.tsx";
import { Button } from "../widgets/Button.tsx";
import { useAnnouncer } from "./announcer.tsx";
import { keepingFocus } from "./focusKept.ts";
import {
  keysAction,
  ownerOfKeys,
  shortcutOf,
  undoesAnotherField,
} from "./shortcuts.ts";
import type { Shortcut } from "./shortcuts.ts";
import { undoOrRedo } from "./undoRedo.ts";

/** The buttons Undo and Redo, and the keys of both on the window. */
export function UndoRedoButtons(): React.JSX.Element {
  const store = useUndoStore();
  const announcer = useAnnouncer();
  const undoText = useAppState((s) => s.undo);
  const redoText = useAppState((s) => s.redo);
  const undoRef = useRef<HTMLButtonElement | null>(null);
  const redoRef = useRef<HTMLButtonElement | null>(null);

  /** Undoes or redoes, from the button or the keyboard. */
  const change = (which: Shortcut): void => {
    const [own, other] =
      which === "undo" ? [undoRef, redoRef] : [redoRef, undoRef];
    const hadFocus =
      own.current !== null && document.activeElement === own.current;
    // Drawn at once, so that the other button is enabled before it is
    // given the focus; and a control that had the focus and left the
    // page with the change hands it to the h1 of the step.
    keepingFocus(() => {
      flushSync(() => {
        undoOrRedo(store, announcer, which);
      });
    });
    if (hadFocus && store.getState()[which] === null) other.current?.focus();
  };

  // The keyboard's Undo and Redo, on the whole page. The listener is put
  // on again at each drawing of the buttons, which happens when Undo or
  // Redo change.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const which = shortcutOf(event);
      if (which === null) return;
      const action = keysAction({
        handled: event.defaultPrevented,
        owner: ownerOfKeys(event.target),
      });
      if (action === "leave") return;
      event.preventDefault();
      if (action === "take") change(which);
    };
    // The browser's undo of a text field reaches no other field.
    const onBeforeInput = (event: InputEvent): void => {
      if (
        undoesAnotherField(
          event.inputType,
          event.target,
          document.activeElement,
        )
      ) {
        event.preventDefault();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("beforeinput", onBeforeInput, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("beforeinput", onBeforeInput, true);
    };
  });

  return (
    <>
      <Button
        label="Undo"
        ref={undoRef}
        isDisabled={undoText === null}
        hint={undoText === null ? null : `Undo: ${undoText}`}
        onPress={() => {
          change("undo");
        }}
      />
      <Button
        label="Redo"
        ref={redoRef}
        isDisabled={redoText === null}
        hint={redoText === null ? null : `Redo: ${redoText}`}
        onPress={() => {
          change("redo");
        }}
      />
    </>
  );
}
