/**
 * Open project… and Save project, in the header of the shell
 * (docs/specs/shell.md, "Saving" and "Opening").
 *
 * Save project opens a dialog with the name of the file, which starts at
 * the name the saving proposes, selected, so that typing replaces it; Save
 * hands the project file to the browser to download, and the status
 * region says so, never that it was saved, since the page does not learn
 * whether the browser kept it.
 *
 * Open project… opens the file picker of the system. The file is read and
 * checked before anything is asked, so that the user is not asked to give
 * up their project for a file that does not open; a file refused is told
 * in a dialog with OK. When the project has changed since it was opened
 * or saved, or calculations are in flight, a dialog asks first, since an
 * opening cannot be undone. After the opening the Variants step is on
 * screen, with the focus on its `<h1>`.
 *
 * Each dialog gives the focus back to the button that opened it, and the
 * opening to the heading of Variants, once the drawing without the dialog
 * is on the page: React Aria, which gives the focus back itself only when
 * it was lost to the page, then leaves it there, and its dialog, which
 * keeps the focus inside while it is open, is gone.
 */
import { useEffect, useRef, useState } from "react";
import { FileTrigger } from "react-aria-components";

import type { Project } from "../../core/project.ts";
import { classOf } from "../classOf.ts";
import { useSaving } from "../saving.ts";
import { useAppState, useStore } from "../store.tsx";
import { Button } from "../widgets/Button.tsx";
import { Dialog } from "../widgets/Dialog.tsx";
import { isInDialog } from "../widgets/dialogMark.ts";
import { TextField } from "../widgets/TextField.tsx";
import { useAnnouncer } from "./announcer.tsx";
import styles from "./ProjectButtons.module.css";
import {
  KEEP_PROJECT,
  NAME_NEEDED,
  handedText,
  openButtonText,
  openQuestion,
  openedText,
  readPicked,
} from "./saveOpen.ts";
import { hashOfStep, stepOfHash } from "./steps.ts";

/** A function that asks for the focus to move to the element `target`
    gives once the dialog the next drawing of the component closes is off
    the page; `opener` is the button that opened the dialog. */
function useFocusLater(
  opener: React.RefObject<HTMLButtonElement | null>,
): (target: () => Element | null) => void {
  const pending = useRef<(() => Element | null) | null>(null);
  useEffect(() => {
    const target = pending.current;
    if (target === null) return;
    pending.current = null;
    // A frame later: React Aria takes its dialog off the page in a drawing
    // of its own, after this one, and until then keeps the focus inside.
    // A user quick enough to have moved the focus in that frame, into a
    // field of the step, keeps it there: Enter pressed in that field would
    // otherwise press the button that opened the dialog, and open it
    // again.
    requestAnimationFrame(() => {
      if (isFocusPlaced(opener.current)) return;
      const element = target();
      if (element instanceof HTMLElement) element.focus();
    });
  });
  return (target) => {
    pending.current = target;
  };
}

/** Whether the focus is on an element of the page, put there by the user
    after the dialog closed, rather than lost to the page, still in the
    dialog on its way out, or given back by React Aria to `opener`, the
    button that opened the dialog. */
function isFocusPlaced(opener: Element | null): boolean {
  const active = document.activeElement;
  return (
    active !== null &&
    active !== document.body &&
    active !== opener &&
    active.isConnected &&
    !isInDialog(active)
  );
}

/** The `<h1>` of the step on screen. */
function stepHeading(): Element | null {
  return document.querySelector("main h1");
}

/** Save project and its dialog. */
export function SaveProject(): React.JSX.Element {
  const saving = useSaving();
  const announcer = useAnnouncer();
  const button = useRef<HTMLButtonElement>(null);
  // The name in the field while the dialog is open; null when it is
  // closed.
  const [name, setName] = useState<string | null>(null);
  const given = name?.trim() ?? "";
  const focusLater = useFocusLater(button);

  /** Closes the dialog and gives the focus back to Save project. */
  const close = (): void => {
    focusLater(() => button.current);
    setName(null);
  };

  const save = (): void => {
    if (given === "") return;
    // Closed first, so that a defect thrown in writing the file, which the
    // error bar shows, does not leave the dialog open over the bar.
    close();
    announcer.announce(handedText(saving.save(given)));
  };

  return (
    <>
      <Button
        label="Save project"
        ref={button}
        onPress={() => {
          setName(saving.proposedName());
        }}
      />
      <Dialog title="Save the project" isOpen={name !== null} onClose={close}>
        <form
          className={classOf(styles, "form")}
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <TextField
            label="File name"
            value={name ?? ""}
            onChange={setName}
            autoFocus
          />
          <div className={classOf(styles, "buttons")}>
            <Button
              label="Save"
              isSubmit
              isDisabled={given === ""}
              {...(given === "" && { description: NAME_NEEDED })}
            />
            <Button label="Cancel" onPress={close} />
          </div>
        </form>
      </Dialog>
    </>
  );
}

/** What Open project… is showing, besides its button. */
type Opening =
  | { readonly kind: "none" }
  | { readonly kind: "refused"; readonly title: string; readonly text: string }
  | {
      readonly kind: "asking";
      readonly name: string;
      readonly project: Project;
    };

const NONE: Opening = { kind: "none" };

/** Open project…, the dialog of a file refused, and the question before
    an opening. */
export function OpenProject(): React.JSX.Element {
  const store = useStore();
  const saving = useSaving();
  const announcer = useAnnouncer();
  const button = useRef<HTMLButtonElement>(null);
  const [opening, setOpening] = useState<Opening>(NONE);
  const focusLater = useFocusLater(button);
  // The number of the last file picked: a file read after one picked
  // after it, a large one picked first, is not answered.
  const lastPick = useRef(0);

  /** Closes a dialog and gives the focus back to Open project…. */
  const back = (): void => {
    focusLater(() => button.current);
    setOpening(NONE);
  };

  /** Opens `project`, of the file `name`: a new history, the saving's
      base, the Variants step on screen with the focus on its heading, and
      the opening said in the status region; `asked` when the question
      before an opening is open, and closed by it. */
  const open = (name: string, project: Project, asked: boolean): void => {
    store.open(project);
    saving.opened(project);
    const onVariants = stepOfHash(window.location.hash) === "variants";
    window.location.hash = hashOfStep("variants");
    // When the step changes, the shell moves the focus to its heading once
    // the browser has told it of the new hash; otherwise it moves here.
    if (asked) {
      if (onVariants) focusLater(stepHeading);
      setOpening(NONE);
    } else if (onVariants) {
      const heading = stepHeading();
      if (heading instanceof HTMLElement) heading.focus();
    }
    announcer.announce(openedText(name, project));
  };

  const onPicked = async (file: File): Promise<void> => {
    lastPick.current += 1;
    const pick = lastPick.current;
    const picked = await readPicked(file, (text) => saving.read(text));
    if (pick !== lastPick.current) return;
    if (picked.kind === "refused") {
      setOpening(picked);
      return;
    }
    if (saving.changed() || store.getState().runs.length > 0) {
      setOpening({ kind: "asking", name: file.name, project: picked.project });
      return;
    }
    open(file.name, picked.project, false);
  };

  // Read at every drawing, so that the question loses its sentence of the
  // calculations when they end while it is open.
  const running = useAppState((s) => s.runs.length > 0);
  const question =
    opening.kind === "asking" ? openQuestion(opening.name, running) : null;

  return (
    <>
      <FileTrigger
        acceptedFileTypes={[".json"]}
        onSelect={(list) => {
          const file = list?.[0];
          // A rejection reaches the window's handler and the error bar.
          if (file !== undefined) void onPicked(file);
        }}
      >
        <Button label="Open project…" ref={button} />
      </FileTrigger>
      <Dialog
        title={opening.kind === "refused" ? opening.title : ""}
        role="alertdialog"
        isOpen={opening.kind === "refused"}
        onClose={back}
        text={opening.kind === "refused" ? opening.text : ""}
      >
        <div className={classOf(styles, "buttons")}>
          <Button label="OK" onPress={back} autoFocus />
        </div>
      </Dialog>
      <Dialog
        title={question?.title ?? ""}
        role="alertdialog"
        isOpen={opening.kind === "asking"}
        onClose={back}
        text={question?.text ?? ""}
      >
        <div className={classOf(styles, "buttons")}>
          <Button
            label={
              opening.kind === "asking" ? openButtonText(opening.name) : ""
            }
            onPress={() => {
              if (opening.kind === "asking") {
                open(opening.name, opening.project, true);
              }
            }}
          />
          {/* The focus starts on the answer that loses nothing. */}
          <Button label={KEEP_PROJECT} onPress={back} autoFocus />
        </div>
      </Dialog>
    </>
  );
}
