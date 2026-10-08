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
 * in a dialog with OK, and a file of the new page of population genetics
 * with a link to that page, which opens in a new tab so that the project
 * on this one stays. When the project has changed since it was opened
 * or saved, calculations are in flight, or a file of the filtered
 * variants is written and not saved, a dialog asks first, since an
 * opening cannot be undone. After the opening the Variants step is on
 * screen, with the focus on its `<h1>`. A file whose read ends while the
 * dialog of Save is open is answered once that dialog has closed, so that
 * no project replaces the one it is saving and no dialog opens over it.
 *
 * React Aria gives the focus back to the button that opened a dialog when
 * it takes the dialog off the page, if the focus is lost to the page
 * then; after OK, Keep the current project and Cancel it has done so by
 * the next frame. Two moves are the page's own, a frame after the dialog
 * closes. After a Save that downloads the file, React Aria gives the focus
 * back only 2 frames later in Chromium 153 and 4 or 5 in WebKit 26.6,
 * with the focus on the body of the page until then, and in WebKit it was
 * seen to land on Save project after a later dialog had closed; so the
 * page gives it back to Save project itself. After an opening answered in
 * the question while the Variants step is on screen, where no change of
 * the step moves the focus, the page moves it to the heading.
 */
import { useEffect, useId, useRef, useState } from "react";
import { FileTrigger } from "react-aria-components";

import { writtenName } from "../../core/fileNames.ts";
import type { Project } from "../../core/project.ts";
import type { AppState } from "../../core/store.ts";
import { classOf } from "../classOf.ts";
import { useSaving } from "../saving.ts";
import { useAppState, useStore } from "../store.tsx";
import { Button } from "../widgets/Button.tsx";
import { Dialog } from "../widgets/Dialog.tsx";
import { isDialogOnPage, whenNoDialog } from "../widgets/dialogMark.ts";
import { Link } from "../widgets/Link.tsx";
import { TextField } from "../widgets/TextField.tsx";
import { useAnnouncer } from "./announcer.tsx";
import styles from "./ProjectButtons.module.css";
import {
  KEEP_PROJECT,
  NAME_NEEDED,
  SAVE_BEFORE_LEAVING,
  aroundLink,
  handedText,
  openButtonText,
  openQuestion,
  openedText,
  readPicked,
} from "./saveOpen.ts";
import type { Refusal } from "./saveOpen.ts";
import { hashOfStep, stepOfHash } from "./steps.ts";

/** A function that asks for the focus to move to the element `target`
    gives a frame after the next drawing of the component, which closes a
    dialog. */
function useFocusLater(): (target: () => Element | null) => void {
  const pending = useRef<(() => Element | null) | null>(null);
  useEffect(() => {
    const target = pending.current;
    if (target === null) return;
    pending.current = null;
    // The drawing took the content of the dialog, with the button that had
    // the focus, off the page, and the browser gave the focus to the body.
    // A user quick enough to have moved the focus in that frame, into a
    // field of the step, keeps it there: Enter pressed in that field would
    // otherwise press the button that opened the dialog, and open it
    // again.
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (active !== null && active !== document.body) return;
      const element = target();
      if (element instanceof HTMLElement) element.focus();
    });
  });
  return (target) => {
    pending.current = target;
  };
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
  // The words of an empty name, which describe the field and Save.
  const nameNeededId = useId();
  const focusLater = useFocusLater();

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
      <Dialog
        content={
          name === null
            ? null
            : { title: "Save the project", text: SAVE_BEFORE_LEAVING, name }
        }
        onClose={close}
      >
        {(content) => (
          <form
            className={classOf(styles, "form")}
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            <TextField
              label="File name"
              value={content.name}
              onChange={setName}
              autoFocus
              // The Tab key skips the disabled Save, so the field says
              // why too.
              describedBy={given === "" ? nameNeededId : null}
            />
            <div className={classOf(styles, "buttons")}>
              <Button
                label="Save"
                isSubmit
                isDisabled={given === ""}
                {...(given === "" && {
                  description: NAME_NEEDED,
                  descriptionId: nameNeededId,
                })}
              />
              <Button label="Cancel" onPress={close} />
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}

/** The name of the file of the filtered variants written and not saved,
    `write` in `done`, "panel.filtered.nei", or `null` when there is
    none. */
function unsavedName(s: AppState<unknown, unknown>): string | null {
  return s.write?.kind === "done" ? writtenName(s.project) : null;
}

/** The name of the file of the filtered variants being written,
    "panel.filtered.nei": a request of the writing in flight, or the
    writing waiting for the statistics of each individual, whose request
    is then the writing's; `null` when none is. */
function writingName(s: AppState<unknown, unknown>): string | null {
  const writing =
    s.write?.kind === "running" || s.runs.some((r) => r.analysis === null);
  return writing ? writtenName(s.project) : null;
}

/** Whether calculations of analyses are in flight, other than the
    statistics of each individual a write waits for. */
function calculating(s: AppState<unknown, unknown>): boolean {
  const forWrite =
    s.write?.kind === "running" && s.write.waitsForStatistics
      ? s.write.runId
      : null;
  return s.runs.some((r) => r.analysis !== null && r.runId !== forWrite);
}

/** What Open project… is showing, besides its button. */
type Opening =
  | { readonly kind: "none" }
  | ({ readonly kind: "refused" } & Refusal)
  | {
      readonly kind: "asking";
      readonly name: string;
      readonly project: Project;
    };

const NONE: Opening = { kind: "none" };

/** The words of `refusal` under the heading of its dialog, with the page
    they name last as a link that opens in a new tab. */
function refusalText(refusal: Refusal): string | React.JSX.Element {
  const around = aroundLink(refusal);
  if (around === null) return refusal.text;
  return (
    <>
      {around.before}
      <Link href={around.link} newTab label={around.link} />
      {around.after}
    </>
  );
}

/** Open project…, the dialog of a file refused, and the question before
    an opening. */
export function OpenProject(): React.JSX.Element {
  const store = useStore();
  const saving = useSaving();
  const announcer = useAnnouncer();
  const [opening, setOpening] = useState<Opening>(NONE);
  const focusLater = useFocusLater();
  // The number of the last file picked: a file read after one picked
  // after it, a large one picked first, is not answered.
  const lastPick = useRef(0);
  const button = useRef<HTMLButtonElement>(null);

  /** Closes a dialog; React Aria gives the focus back to Open
      project…. */
  const back = (): void => {
    setOpening(NONE);
  };

  /** Opens `project`, of the file `name`: a new history, the saving's
      base, the Variants step on screen with the focus on its heading, and
      the opening said in the status region; `asked` when the question
      before an opening is open, and closed by it. */
  const open = (name: string, project: Project, asked: boolean): void => {
    store.open(() => project);
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
    if (isDialogOnPage(document)) {
      // The dialog of Save, opened while the file was read.
      await whenNoDialog(document);
      if (pick !== lastPick.current) return;
      // Where a dialog opened now gives the focus back, as after a pick.
      button.current?.focus();
    }
    if (picked.kind === "refused") {
      setOpening(picked);
      return;
    }
    const state = store.getState();
    if (
      saving.changed() ||
      state.runs.length > 0 ||
      unsavedName(state) !== null
    ) {
      setOpening({ kind: "asking", name: file.name, project: picked.project });
      return;
    }
    open(file.name, picked.project, false);
  };

  // Read at every drawing, so that the question loses its sentence of the
  // calculations when they end while it is open, and gains the one of a
  // file written while it is open.
  const running = useAppState(calculating);
  const writing = useAppState(writingName);
  const unsaved = useAppState(unsavedName);
  const question =
    opening.kind === "asking"
      ? {
          ...opening,
          ...openQuestion(opening.name, {
            calculating: running,
            writing,
            unsaved,
          }),
        }
      : null;

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
        content={
          opening.kind === "refused"
            ? { title: opening.title, text: refusalText(opening) }
            : null
        }
        role="alertdialog"
        onClose={back}
      >
        {() => (
          <div className={classOf(styles, "buttons")}>
            <Button label="OK" onPress={back} autoFocus />
          </div>
        )}
      </Dialog>
      <Dialog content={question} role="alertdialog" onClose={back}>
        {(asking) => (
          <div className={classOf(styles, "buttons")}>
            <Button
              label={openButtonText(asking.name)}
              onPress={() => {
                open(asking.name, asking.project, true);
              }}
            />
            {/* The focus starts on the answer that loses nothing. */}
            <Button label={KEEP_PROJECT} onPress={back} autoFocus />
          </div>
        )}
      </Dialog>
    </>
  );
}
