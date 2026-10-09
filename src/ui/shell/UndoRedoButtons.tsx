/**
 * Undo and Redo, the two buttons and their keys, which both pages draw:
 * popgen.html in the header of its shell, beside Open project… and Save
 * project (docs/specs/shell.md, "The header"), and popgen2.html at the
 * right end of the line of its heading "Popnei"
 * (docs/specs/steps/popgen2-pca.md, "Undo and Redo").
 *
 * Undo and Redo are described by what they would take back or bring
 * again, "Undo: the filter of the variants by missing data changed". On
 * popgen.html both are always drawn, and disabled when they have none.
 * On popgen2.html, with `onlyWithStep`, each is drawn only while it has
 * one, and is otherwise not in the page at all, neither a stop of the Tab
 * key nor found by a screen reader; each stands in a place of its own,
 * which keeps the width of its button while it is hidden, so that neither
 * moves when the other comes or goes, and a second click lands where the
 * first did.
 *
 * On popgen2.html, while a run of the arrow keys on a threshold waits to
 * become a change (thresholdRun.ts), Undo names that change, which a
 * press makes before it undoes it, as Ctrl+Z does; and Redo is not
 * offered, since that change leaves nothing to redo. When a press takes
 * the last step and its button goes, or becomes disabled on popgen.html,
 * the focus moves to the other, which that press has just offered, since
 * the browser would otherwise drop the focus to the start of the page
 * (WCAG 2.4.3). When a button with the focus goes on popgen2.html for any
 * other reason, a command from a control that does not take the focus on
 * a click, as in Safari, or a file dropped on a box, the focus goes to
 * the `<h1>` of the page, as it does when an undo or a redo removes
 * another control that had the focus (focusKept.ts). An undo or a redo is
 * announced as undoRedo.ts says.
 *
 * The keys, Ctrl+Z, Ctrl+Shift+Z and Ctrl+Y, and Cmd+Z and Cmd+Shift+Z on
 * macOS, are caught on the whole window while this part is drawn, which on
 * both pages is from their opening, whether or not a button is shown, as
 * shortcuts.ts says: a key with no step to take does nothing and does not
 * reach the browser's own undo. The page may make them wait, as
 * popgen2.html is to do while a PCA runs. The browser's own undo in a
 * text field is kept from reaching another field.
 *
 * The two buttons, or their two places, are drawn with nothing around
 * them, so that the page places them.
 */
import { useCallback, useEffect, useRef } from "react";
import { flushSync } from "react-dom";

import { classOf } from "../classOf.ts";
import { useAppState, useStore } from "../store.tsx";
import { useEndRuns, usePendingChange } from "../variants/runGate.tsx";
import { Button } from "../widgets/Button.tsx";
import { useAnnouncer } from "./announcer.tsx";
import { headingAfter, keepingFocus } from "./focusKept.ts";
import {
  keysAction,
  ownerOfKeys,
  shortcutOf,
  undoesAnotherField,
} from "./shortcuts.ts";
import type { Shortcut } from "./shortcuts.ts";
import { undoOrRedo } from "./undoRedo.ts";
import styles from "./UndoRedoButtons.module.css";

/** What Undo and Redo are drawn with. */
export interface UndoRedoButtonsProps {
  /** popgen2.html's setting: each button drawn only while it has a step
      to take, in a place of its own kept while it is hidden, and the
      focus of a button that goes for another reason than its own press
      given to the heading. Absent, as on popgen.html, both are always
      drawn, disabled when they have no step. */
  readonly onlyWithStep?: boolean;
  /** Whether the keys wait: while true, they do nothing and do not reach
      the browser's own undo, as popgen2.html is to make them while a PCA
      runs (docs/plans/analyses-pca.md, the owner's answer 2 of 9 October
      2026). False when absent. */
  readonly keysWait?: boolean;
}

/** The buttons Undo and Redo, and the keys of both on the window. */
export function UndoRedoButtons({
  onlyWithStep = false,
  keysWait = false,
}: UndoRedoButtonsProps): React.JSX.Element {
  const store = useStore();
  const announcer = useAnnouncer();
  const pending = usePendingChange();
  const endRuns = useEndRuns();
  const undoText = useAppState((s) => s.undo);
  const storeRedo = useAppState((s) => s.redo);
  // A run waiting will be the step Undo takes back, and will leave nothing
  // to redo; the run is made a change before an undo or a redo.
  const shownUndo = pending ?? undoText;
  const redoText = pending === null ? storeRedo : null;
  const undoRef = useRef<HTMLButtonElement | null>(null);
  const redoRef = useRef<HTMLButtonElement | null>(null);

  // The element of each button, kept for the focus; on popgen2.html, a
  // button that leaves the page with the focus hands it to the heading,
  // unless the press that removed it has given it to the other. React
  // lets go of the element before it takes it off the page, so that it
  // still has the focus then.
  const placeUndo = useCallback(
    (node: HTMLButtonElement | null): void => {
      const before = undoRef.current;
      undoRef.current = node;
      if (node === null && before !== null && onlyWithStep) {
        headingAfter(before);
      }
    },
    [onlyWithStep],
  );
  const placeRedo = useCallback(
    (node: HTMLButtonElement | null): void => {
      const before = redoRef.current;
      redoRef.current = node;
      if (node === null && before !== null && onlyWithStep) {
        headingAfter(before);
      }
    },
    [onlyWithStep],
  );

  /** Undoes or redoes, from the button or the keyboard. */
  const change = (which: Shortcut): void => {
    const [own, other] =
      which === "undo" ? [undoRef, redoRef] : [redoRef, undoRef];
    const hadFocus =
      own.current !== null && document.activeElement === own.current;
    // A run waiting is made a change first, so that an undo finds it.
    endRuns();
    // Drawn at once, so that the other button is drawn or enabled before
    // it is given the focus; and a control that had the focus and left
    // the page with the change hands it to the h1 of the page.
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
        waits: keysWait,
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

  const undo = (
    <Button
      label="Undo"
      ref={placeUndo}
      isDisabled={shownUndo === null}
      hint={shownUndo === null ? null : `Undo: ${shownUndo}`}
      onPress={() => {
        change("undo");
      }}
    />
  );
  const redo = (
    <Button
      label="Redo"
      ref={placeRedo}
      isDisabled={redoText === null}
      hint={redoText === null ? null : `Redo: ${redoText}`}
      onPress={() => {
        change("redo");
      }}
    />
  );
  if (!onlyWithStep) {
    return (
      <>
        {undo}
        {redo}
      </>
    );
  }
  return (
    <span className={classOf(styles, "places")}>
      <span className={classOf(styles, "place")} data-place="undo">
        <ButtonWidth label="Undo" />
        {shownUndo !== null && undo}
      </span>
      <span className={classOf(styles, "place")} data-place="redo">
        <ButtonWidth label="Redo" />
        {redoText !== null && redo}
      </span>
    </span>
  );
}

/** The words of a button, drawn as the button would be and unseen, by
    the eye and by a screen reader, which give its place the button's
    width and height while it is hidden. */
function ButtonWidth({ label }: { readonly label: string }): React.JSX.Element {
  return (
    <span aria-hidden="true" className={classOf(styles, "width")}>
      {label}
    </span>
  );
}
