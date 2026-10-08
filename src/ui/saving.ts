/**
 * The saving of the project (docs/specs/entry.md, "The saving"): it makes
 * the text of the project file and hands it to the browser as a download,
 * for Save project of the header and Save the project of the error bar
 * alike; reads the text of a project file picked with Open project…, with
 * the same application and analyses; and keeps what the question before
 * leaving the page needs. From stage 3 it also hands the browser a file
 * of the filtered variants the calculation worker wrote, and then has the
 * store forget it (docs/specs/entry.md, "A file of the filtered variants
 * saved").
 *
 * The base project is the project the page started with, the one last
 * opened from a project file, or the one last saved, with the keys of the
 * analyses done in it. The project has changed when the present project
 * is another object than the base, or when an analysis is done under a
 * key that was not done in the base, a result that ended since, as the
 * owner decided on 26 September 2026; the page then asks the browser to
 * confirm before it is left. A save
 * sets the base, as the owner decided on 25 September 2026, to confirm
 * (point K of docs/specs/stage-2-open-points.md): the page does not
 * learn whether the download was kept.
 *
 * The entry makes it once and gives it to the screens through
 * `SavingProvider`, and to the error bar, in its own root, directly.
 */
import { createContext, useContext } from "react";

import {
  PROJECT_FILE_EXTENSION,
  projectFileName,
  readProjectFile,
  writeProjectFile,
} from "../core/projectFile.ts";
import type { ProjectFileError } from "../core/projectFile.ts";
import type { AppId, Project } from "../core/project.ts";
import type { Result } from "../core/result.ts";
import type { Key } from "../core/keys.ts";
import type { AnalysisDef, AppState, Store } from "../core/store.ts";

/** What the saving is made with: the store, of results `R` of requests
    `J` and written files `F`, the application and the definitions of its
    analyses. */
export interface SavingDeps<J, R, F> {
  /** The store of the page. */
  readonly store: Store<R, F>;
  /** The application of the page, whose project files it reads. */
  readonly app: AppId;
  /** The definitions of the analyses of the application. */
  readonly analyses: readonly AnalysisDef<J, R>[];
  /** The version of the application, written into the file. */
  readonly appVersion: string;
  /** Hands the text to the browser to download under the name; a fake in
      the tests. */
  readonly download: (name: string, text: string) => void;
  /** Hands the file to the browser to download under the name, and
      releases its address a minute later; a fake in the tests. */
  readonly downloadFile: (name: string, file: F) => void;
}

/** The saving of the page, made once by the entry. */
export interface Saving {
  /** The name the dialog of Save proposes, `projectFileName` of the
      present project. */
  proposedName(): string;
  /** Downloads the project file under `name`, with `.popnei.json` added
      when it does not end so, in place of a `.json` it ends in
      (`savedName`), and makes the present project the base;
      returns the name used. Throws a defect on a check number that is
      not finite. */
  save(name: string): string;
  /** The project of the text `text` of a picked project file, read by
      `readProjectFile` with the application and the analyses the saving
      writes with, or why it does not open. The page has no box of the
      filter of the FILTER column, so a file that holds that filter, on or
      off, is refused as `newPageFilter`. */
  read(text: string): Result<Project, ProjectFileError>;
  /** A project file was opened and `p` is its project: it is the base. */
  opened(p: Project): void;
  /** Whether the last save threw as it wrote or handed over the file,
      until a save succeeds. */
  saveFailed(): boolean;
  /** Calls `listener` when `saveFailed` changes; returns the function
      that stops it. A property made once, so React keeps it. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Whether the present project is another than the base, or an
      analysis is done under a key that was not done in the base: a result
      that ended since, which the file saved lacks. */
  changed(): boolean;
  /** Hands the file of the filtered variants the store holds, `write` in
      `done`, to the browser to download under `name`, "panel.filtered.nei",
      then tells the store, which forgets the file and is `saved`. Throws a
      defect when `write` is not `done`: Save is shown only then. */
  saveWritten(name: string): void;
}

/** The name of the file saved for the name `name` the user left in the
    field, so that the file opens again with Open project…: `panel`
    gives `panel.popnei.json`, and `run1.json` gives `run1.popnei.json`,
    the `.json` replaced rather than doubled; a name that ends in
    `.popnei.json` is kept. The endings are found in any case. */
export function savedName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(PROJECT_FILE_EXTENSION)) {
    return name;
  }
  const stem = lower.endsWith(JSON_EXTENSION)
    ? name.slice(0, -JSON_EXTENSION.length)
    : name;
  return `${stem}${PROJECT_FILE_EXTENSION}`;
}

/** The ending of a name that `savedName` replaces rather than doubles. */
const JSON_EXTENSION = ".json";

/** The keys under which the analyses of `state` are done. */
function doneKeys<R, F>(state: AppState<R, F>): ReadonlySet<Key> {
  const keys = new Set<Key>();
  for (const view of state.analyses) {
    if (view.status.kind === "done") keys.add(view.status.key);
  }
  return keys;
}

/** The saving of the store of `deps`, whose base is its present
    project. */
export function createSaving<J, R, F>(deps: SavingDeps<J, R, F>): Saving {
  const { store, app, analyses, appVersion, download, downloadFile } = deps;
  let base: Project = store.getState().project;
  // The keys done in the base: a result done under another key ended
  // after it, and the file saved lacks its check numbers.
  let baseDone = doneKeys(store.getState());
  // Whether the last save threw, which the error bar reads.
  let failed = false;
  const listeners = new Set<() => void>();
  const setFailed = (value: boolean): void => {
    if (failed === value) return;
    failed = value;
    for (const listener of [...listeners]) listener();
  };
  return {
    proposedName: () => projectFileName(store.getState().project),
    save: (name) => {
      const state = store.getState();
      const used = savedName(name);
      try {
        const text = writeProjectFile(
          state,
          analyses,
          appVersion,
          new Date().toISOString(),
        );
        download(used, text);
      } catch (error) {
        // Recorded and thrown on: a defect, which the error bar shows.
        setFailed(true);
        throw error;
      }
      setFailed(false);
      base = state.project;
      baseDone = doneKeys(state);
      return used;
    },
    saveFailed: () => failed,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    // popgen.html, the one page that saves, has no box of the filter of
    // the FILTER column (docs/specs/core/projectFile.md, "Opening").
    read: (text) =>
      readProjectFile(text, app, analyses, { passedFilter: false }),
    opened: (p) => {
      base = p;
      baseDone = doneKeys(store.getState());
    },
    changed: () => {
      const state = store.getState();
      return (
        state.project !== base ||
        state.analyses.some(
          (view) =>
            view.status.kind === "done" && !baseDone.has(view.status.key),
        )
      );
    },
    saveWritten: (name) => {
      const write = store.getState().write;
      if (write?.kind !== "done") {
        throw new Error(
          `popnei_web defect: saveWritten was called with the writing ${write === null ? "absent" : `in the state ${write.kind}`}; Save is shown only when a file is written and not saved.`,
        );
      }
      downloadFile(name, write.written.file);
      store.writeSaved();
    },
  };
}

const SavingContext = createContext<Saving | null>(null);

/** Gives the saving of the page to every component under it. */
export const SavingProvider = SavingContext.Provider;

/** The saving of the page. Throws a defect outside a `SavingProvider`. */
export function useSaving(): Saving {
  const saving = useContext(SavingContext);
  if (saving === null) {
    throw new Error("popnei_web defect: useSaving outside a SavingProvider");
  }
  return saving;
}
