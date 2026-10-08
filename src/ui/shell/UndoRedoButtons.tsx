/**
 * Undo and Redo, the two buttons and their keys, which popgen.html draws
 * in the header of its shell, beside Open project… and Save project
 * (docs/specs/shell.md, "The header"). popgen2.html drew them in a row of
 * their own above the box of the file, hidden since the owner's decision
 * of 8 October 2026 (docs/specs/steps/popgen2-filters.md, "Undo, Redo and
 * their keys"); what is said of popgen2.html below holds when it draws
 * them again.
 *
 * Undo and Redo are described by what they would take back or bring
 * again, "Undo: the filter of the variants by missing data changed", and
 * are disabled when there is none. On popgen2.html, while a run of the
 * arrow keys on a threshold waits to become a change (thresholdRun.ts),
 * Undo is enabled and names that change, which a click makes before it
 * undoes it, as Ctrl+Z does; and Redo is disabled, since that change
 * leaves nothing to redo. When the one that has the focus
 * becomes disabled, after the last step was undone or redone, the focus
 * moves to the other, which that change has just enabled, since a
 * disabled button cannot hold the focus, which the browser would drop to
 * the start of the page (WCAG 2.4.3); and when an undo or a redo removes
 * another control that had the focus, the focus goes to the `<h1>` of the
 * page, as focusKept.ts says. An undo or a redo is announced as
 * undoRedo.ts says. The keys, Ctrl+Z, Ctrl+Shift+Z and Ctrl+Y, and Cmd+Z
 * and Cmd+Shift+Z on macOS, are caught on the whole window while the
 * buttons are drawn, as shortcuts.ts says, and the browser's own undo in
 * a text field is kept from reaching another field.
 *
 * The two buttons are drawn with nothing around them, so that the page
 * places them in a row of its own.
 */
import { useEffect, useRef } from "react";
import { flushSync } from "react-dom";

import { useAppState, useStore } from "../store.tsx";
import { usePendingChange } from "../variants/runGate.tsx";
import { Button } from "../widgets/Button.tsx";
import { useAnnouncer } from "./announcer.tsx";
import { keepingFocus } from "./focusKept.ts";
import { ownerOfKeys, shortcutOf, undoesAnotherField } from "./shortcuts.ts";
import type { Shortcut } from "./shortcuts.ts";
import { undoOrRedo } from "./undoRedo.ts";

/** The buttons Undo and Redo, and the keys of both on the window. */
export function UndoRedoButtons(): React.JSX.Element {
  const store = useStore();
  const announcer = useAnnouncer();
  const pending = usePendingChange();
  const undoText = useAppState((s) => s.undo);
  const storeRedo = useAppState((s) => s.redo);
  // A run waiting will be the step Undo takes back, and will leave nothing
  // to redo; the gated store makes it before an undo or a redo.
  const shownUndo = pending ?? undoText;
  const redoText = pending === null ? storeRedo : null;
  const undoRef = useRef<HTMLButtonElement>(null);
  const redoRef = useRef<HTMLButtonElement>(null);

  /** Undoes or redoes, from the button or the keyboard. */
  const change = (which: Shortcut): void => {
    const [own, other] =
      which === "undo" ? [undoRef, redoRef] : [redoRef, undoRef];
    const hadFocus =
      own.current !== null && document.activeElement === own.current;
    // Drawn at once, so that the other button is enabled before it is
    // given the focus; and a control that had the focus and left the page
    // with the change hands it to the h1 of the page.
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
      if (event.defaultPrevented) return;
      const which = shortcutOf(event);
      if (which === null) return;
      const owner = ownerOfKeys(event.target);
      if (owner === "text") return;
      // Also in a dialog, where they do nothing: WebKit would otherwise
      // undo the typing of the last field edited behind it.
      event.preventDefault();
      if (owner === "project") change(which);
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
        isDisabled={shownUndo === null}
        hint={shownUndo === null ? null : `Undo: ${shownUndo}`}
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
