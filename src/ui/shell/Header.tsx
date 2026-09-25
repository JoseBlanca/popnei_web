/**
 * The header of the shell (docs/specs/shell.md, "The header"): "popnei
 * web", a link to the start page of the site, and the name of the
 * application as text, not a heading, since the `<h1>` of the page is the
 * step's; and Undo and Redo, which the keyboard gives too. Open project…
 * and Save project join it with task 9.4 of the walking skeleton.
 *
 * Undo and Redo are described by what they would take back or bring
 * again, "Undo: the missing data filter changed", and are disabled when
 * there is none. When the one that has the focus becomes disabled, after
 * the last step was undone or redone, the focus moves to the other, which
 * that change has just enabled, since a disabled button cannot hold the
 * focus, which the browser would drop to the start of the page (WCAG
 * 2.4.3). An undo or a redo is announced as undoRedo.ts says.
 */
import { useEffect, useRef } from "react";
import { flushSync } from "react-dom";

import { classOf } from "../classOf.ts";
import { useAppState, useStore } from "../store.tsx";
import { Button } from "../widgets/Button.tsx";
import { Link } from "../widgets/Link.tsx";
import { useAnnouncer } from "./announcer.tsx";
import styles from "./Header.module.css";
import { isForTheProject, shortcutOf } from "./shortcuts.ts";
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
    // given the focus.
    flushSync(() => {
      undoOrRedo(store, announcer, which);
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
      if (which === null || !isForTheProject(event.target)) return;
      event.preventDefault();
      change(which);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
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
      </span>
    </header>
  );
}
