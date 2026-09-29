/**
 * The header of the shell (docs/specs/shell.md, "The header"): "popnei
 * web", a link to the start page of the site, and the name of the
 * application as text, not a heading, since the `<h1>` of the page is the
 * step's; Undo and Redo, which the keyboard gives too; and Open project…
 * and Save project, in ProjectButtons.tsx.
 *
 * Undo and Redo are described by what they would take back or bring
 * again, "Undo: the filter of the variants by missing data changed", and are disabled when
 * there is none. When the one that has the focus becomes disabled, after
 * the last step was undone or redone, the focus moves to the other, which
 * that change has just enabled, since a disabled button cannot hold the
 * focus, which the browser would drop to the start of the page (WCAG
 * 2.4.3); and when an undo or a redo removes another control that had
 * the focus, the focus goes to the `<h1>` of the step, as focusKept.ts
 * says. An undo or a redo is announced as undoRedo.ts says. The
 * browser's own undo in a text field is kept from reaching another field,
 * as shortcuts.ts says.
 */
import { useEffect, useRef } from "react";
import { flushSync } from "react-dom";

import { classOf } from "../classOf.ts";
import { useAppState, useStore } from "../store.tsx";
import { Button } from "../widgets/Button.tsx";
import { Link } from "../widgets/Link.tsx";
import { useAnnouncer } from "./announcer.tsx";
import { keepingFocus } from "./focusKept.ts";
import styles from "./Header.module.css";
import { OpenProject, SaveProject } from "./ProjectButtons.tsx";
import { ownerOfKeys, shortcutOf, undoesAnotherField } from "./shortcuts.ts";
import type { Shortcut } from "./shortcuts.ts";
import { undoOrRedo } from "./undoRedo.ts";

/** The header of the population genetics application. */
export function Header(): React.JSX.Element {
  const store = useStore();
  const announcer = useAnnouncer();
  const undoText = useAppState((s) => s.undo);
  const redoText = useAppState((s) => s.redo);
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
    // with the change hands it to the h1 of the step.
    keepingFocus(() => {
      flushSync(() => {
        undoOrRedo(store, announcer, which);
      });
    });
    if (hadFocus && store.getState()[which] === null) other.current?.focus();
  };

  // The keyboard's Undo and Redo, on the whole page. The listener is put
  // on again at each drawing of the header, which happens when Undo or
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
    <header className={classOf(styles, "header")}>
      <Link href="index.html" label="popnei web" />
      <span className={classOf(styles, "application")}>
        Population genetics
      </span>
      <span className={classOf(styles, "actions")}>
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
        <OpenProject />
        <SaveProject />
      </span>
    </header>
  );
}
