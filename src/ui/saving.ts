/**
 * The saving of the project (docs/specs/entry.md, "The saving"): it makes
 * the text of the project file and hands it to the browser as a download,
 * for Save project of the header and Save the project of the error bar
 * alike; reads the text of a project file picked with Open project…, with
 * the same application and analyses; and keeps what the question before
 * leaving the page needs.
 *
 * The base project is the project the page started with, the one last
 * opened from a project file, or the one last saved. The project has
 * changed when the present project is another object than the base, and
 * the page then asks the browser to confirm before it is left. A save
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
import type { AnalysisDef, Store } from "../core/store.ts";

/** What the saving is made with: the store, of results `R` of requests
    `J`, the application and the definitions of its analyses. */
export interface SavingDeps<J, R> {
  /** The store of the page. */
  readonly store: Store<R>;
  /** The application of the page, whose project files it reads. */
  readonly app: AppId;
  /** The definitions of the analyses of the application. */
  readonly analyses: readonly AnalysisDef<J, R>[];
  /** The version of the application, written into the file. */
  readonly appVersion: string;
  /** Hands the text to the browser to download under the name; a fake in
      the tests. */
  readonly download: (name: string, text: string) => void;
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
      writes with, or why it does not open. */
  read(text: string): Result<Project, ProjectFileError>;
  /** A project file was opened and `p` is its project: it is the base. */
  opened(p: Project): void;
  /** Whether the present project is another than the base. */
  changed(): boolean;
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

/** The saving of the store of `deps`, whose base is its present
    project. */
export function createSaving<J, R>(deps: SavingDeps<J, R>): Saving {
  const { store, app, analyses, appVersion, download } = deps;
  let base: Project = store.getState().project;
  return {
    proposedName: () => projectFileName(store.getState().project),
    save: (name) => {
      const state = store.getState();
      const text = writeProjectFile(
        state,
        analyses,
        appVersion,
        new Date().toISOString(),
      );
      const used = savedName(name);
      download(used, text);
      base = state.project;
      return used;
    },
    read: (text) => readProjectFile(text, app, analyses),
    opened: (p) => {
      base = p;
    },
    changed: () => store.getState().project !== base,
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
