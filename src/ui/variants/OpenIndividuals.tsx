/**
 * The opening of the individuals file on popgen2.html
 * (docs/specs/steps/popgen2-input.md, "The box of the individuals file";
 * docs/plans/file-buttons.md, 16 October 2026): a zone that takes a
 * dropped or pasted file, with the button "Open individuals file…" at
 * the end of the box Individuals before a file is open, and "Open another
 * individuals file…" beside Remove at the end of the Individuals tab once
 * one is; the box of a file open takes no drop, as the owner decided on
 * 16 October 2026. The two are one opening, `useIndividualsOpening`,
 * which the page makes once: the same path for a file picked, dropped or pasted,
 * the same words of the last one not opened, which the box shows, and
 * the same wait while an analysis that reads the populations runs, when
 * the zones are greyed with the reason of the lock of the populations and
 * a file then opens nothing (popgen2-input.md, "While the diversity
 * runs").
 */
import { useState } from "react";

import { usePopulationsLock, usePopulationsRunning } from "./filtersLock.ts";
import { openIndividualsCommand } from "./individualsCommands.ts";
import {
  INDIVIDUALS_FOLDER_DROPPED,
  INDIVIDUALS_SEVERAL_DROPPED,
  INDIVIDUALS_TEXT_DROPPED,
  OPEN_ANOTHER_INDIVIDUALS_FILE,
  OPEN_INDIVIDUALS_FILE,
  PASTE_INDIVIDUALS_FILE,
  notOpenedWhileRunningText,
} from "./individualsWords.ts";
import { useFiles } from "../files.tsx";
import { useAnnouncer } from "../shell/announcer.tsx";
import { PICKER_ENDINGS } from "../steps/individuals/words.ts";
import { useAppState, usePopgen2Store } from "../store.tsx";
import { FileZone } from "../widgets/FileZone.tsx";
import type { ZoneWaiting } from "../widgets/FileZone.tsx";

/** What the page says of a drop, or a paste, that is not of one file. */
const NOT_FILES_WORDS = {
  folder: INDIVIDUALS_FOLDER_DROPPED,
  text: INDIVIDUALS_TEXT_DROPPED,
  several: INDIVIDUALS_SEVERAL_DROPPED,
} as const;

/** A drop or a paste not opened, with its words: of something that is
    not one file; or refused by the lock of the populations, whose words
    go with the lock; and the load id of the individuals file open when it
    was refused, or null with none, since an opening or a removal takes
    the words away. */
interface Refusal {
  readonly kind: "notOneFile" | "locked";
  readonly text: string;
  readonly fileId: string | null;
}

/** The one opening of the individuals file, which its zones share. */
export interface IndividualsOpening {
  /** The words of the last drop, paste or pick not opened, until the
      next opening or removal, or, refused by the lock, until the lock
      ends; `null` with none. */
  readonly refusal: string | null;
  /** Opens the one file of `files`, or says why not. */
  readonly onFiles: (files: readonly File[]) => void;
  /** Says why a folder, a piece of text or several things were not
      opened. */
  readonly onNotFiles: (dropped: keyof typeof NOT_FILES_WORDS) => void;
  /** Why the zones wait, while an analysis that reads the populations
      runs, and what they do with a file then; `null` when they do not. */
  readonly waiting: ZoneWaiting | null;
}

/** The opening of the individuals file of the page, made once. */
export function useIndividualsOpening(): IndividualsOpening {
  const store = usePopgen2Store();
  const files = useFiles();
  const announcer = useAnnouncer();
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const fileId = useAppState((s) => s.project.individuals?.fileId ?? null);
  const lock = usePopulationsLock();
  const running = usePopulationsRunning();
  // The lock ended, or a file was opened or removed: the words of the
  // refusal go, set while drawing, as React keeps a state that follows
  // another.
  if (
    refusal !== null &&
    ((refusal.kind === "locked" && lock === null) || refusal.fileId !== fileId)
  ) {
    setRefusal(null);
  }

  const refuse = (kind: Refusal["kind"], text: string): void => {
    setRefusal({ kind, text, fileId });
    // The focus stays where it was, so a screen reader would not read the
    // words by themselves.
    announcer.announce(text);
  };

  return {
    refusal: refusal?.text ?? null,
    onFiles: (picked) => {
      const [file, ...others] = picked;
      if (file === undefined) return;
      if (others.length > 0) {
        refuse("notOneFile", INDIVIDUALS_SEVERAL_DROPPED);
        return;
      }
      // Any file: the reader says what it is from its bytes, not its
      // name. An opening starts the history afresh (popgen2-input.md,
      // "What it sends and reads").
      setRefusal(null);
      store.applyAfresh(
        openIndividualsCommand(files.addFile(file), file.name).command,
      );
    },
    onNotFiles: (dropped) => {
      refuse("notOneFile", NOT_FILES_WORDS[dropped]);
    },
    waiting:
      lock === null || running === null
        ? null
        : {
            reason: lock,
            onRefused: (name) => {
              if (name === null) {
                refuse("notOneFile", INDIVIDUALS_SEVERAL_DROPPED);
              } else {
                refuse("locked", notOpenedWhileRunningText(name, running));
              }
            },
          },
  };
}

/** What a zone of the individuals file is drawn with. */
export interface OpenIndividualsProps {
  /** The page's one opening of the individuals file. */
  readonly opening: IndividualsOpening;
  /** The element of the button, for the page to move the focus to it. */
  readonly buttonRef: React.RefObject<HTMLButtonElement | null>;
  /** What can be done with the file, after the button: Remove. */
  readonly actions?: React.ReactNode;
}

/** A zone that opens the individuals file, with its button. */
export function OpenIndividuals({
  opening,
  buttonRef,
  actions,
}: OpenIndividualsProps): React.JSX.Element {
  const individualsOpen = useAppState((s) => s.project.individuals !== null);
  return (
    <FileZone
      pasteLabel={PASTE_INDIVIDUALS_FILE}
      buttonLabel={
        individualsOpen ? OPEN_ANOTHER_INDIVIDUALS_FILE : OPEN_INDIVIDUALS_FILE
      }
      accept={PICKER_ENDINGS}
      onFiles={opening.onFiles}
      onNotFiles={opening.onNotFiles}
      buttonRef={buttonRef}
      {...(actions !== undefined && { actions })}
      waiting={opening.waiting}
    />
  );
}
