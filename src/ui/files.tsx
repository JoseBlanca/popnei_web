/**
 * The files the user picks (docs/specs/entry.md, the paragraph on a file
 * the user picks): each gets a load id here, and its `File` goes to the
 * worker client before the step puts the load into the project, so that
 * the read the entry then asks for always finds it. The entry makes them
 * once, and gives them to the screens through `FilesProvider`.
 */
import { createContext, useContext } from "react";

import type { Client } from "../worker/client.ts";

/** The files of the loads of this page. */
export interface Files {
  /** Makes the load id of the picked `file`, 16 random bytes as 32
      hexadecimal digits, and gives the file to the worker client under
      it; before the command that puts the load into the project. */
  addFile(file: File): string;
  /** The `File` of a load of this page; null for a load id this page did
      not make, that of an opened project file. */
  fileOf(fileId: string): File | null;
}

/** A load id: 16 random bytes written as 32 lower case hexadecimal
    digits (docs/architecture.md, section 3). */
function newLoadId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** The files of the page, which hand each `File` to `client`. */
export function createFiles(client: Pick<Client, "addFile">): Files {
  const files = new Map<string, File>();
  return {
    addFile: (file) => {
      const fileId = newLoadId();
      client.addFile(fileId, file);
      files.set(fileId, file);
      return fileId;
    },
    fileOf: (fileId) => files.get(fileId) ?? null,
  };
}

const FilesContext = createContext<Files | null>(null);

/** Gives the files of the page to every component under it. */
export const FilesProvider = FilesContext.Provider;

/** The files of the page. Throws a defect outside a `FilesProvider`. */
export function useFiles(): Files {
  const files = useContext(FilesContext);
  if (files === null) {
    throw new Error("popnei_web defect: useFiles outside a FilesProvider");
  }
  return files;
}
