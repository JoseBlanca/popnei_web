/**
 * The saving of the project (docs/specs/entry.md, "The saving"): it makes
 * the text of the project file and hands it to the browser as a download,
 * for Save project of the header and Save the project of the error bar
 * alike, and keeps what the question before leaving the page needs.
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
  writeProjectFile,
} from "../core/projectFile.ts";
import type { Project } from "../core/project.ts";
import type { AnalysisDef, Store } from "../core/store.ts";
import type { Job, JobResult } from "../worker/protocol.ts";

/** What the saving is made with. */
export interface SavingDeps {
  /** The store of the page. */
  readonly store: Store<JobResult>;
  /** The definitions of the analyses of the application. */
  readonly analyses: readonly AnalysisDef<Job, JobResult>[];
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
      when it does not end so, and makes the present project the base;
      returns the name used. Throws a defect on a check number that is
      not finite. */
  save(name: string): string;
  /** A project file was opened and `p` is its project: it is the base. */
  opened(p: Project): void;
  /** Whether the present project is another than the base. */
  changed(): boolean;
}

/** The name of the file saved for the name `name` the user left in the
    field: `panel` gives `panel.popnei.json`, so that the file opens
    again with Open project…. */
export function savedName(name: string): string {
  return name.endsWith(PROJECT_FILE_EXTENSION)
    ? name
    : `${name}${PROJECT_FILE_EXTENSION}`;
}

/** The saving of the store of `deps`, whose base is its present
    project. */
export function createSaving(deps: SavingDeps): Saving {
  const { store, analyses, appVersion, download } = deps;
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
