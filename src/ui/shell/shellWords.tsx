/**
 * What the words of the shell need of the application, its `ShellWords`,
 * given to the components of the shell (docs/specs/shell.md, "What it
 * sends and reads"). The entry gives the population genetics
 * application's, `SHELL_WORDS` of src/ui/analyses/titles.ts, through
 * `ShellWordsProvider`, as it gives the store; the stepper and the
 * summary line read it with `useShellWords`, so that the shell imports
 * nothing of one application. The notice reads the part of them it
 * needs, the titles, from noticeWords.tsx.
 */
import { createContext, useContext } from "react";

import type { JobResult } from "../../worker/protocol.ts";
import type { ShellWords } from "./words.ts";

const ShellWordsContext = createContext<ShellWords<JobResult> | null>(null);

/** Gives the words of the application to every component under it. */
export const ShellWordsProvider = ShellWordsContext.Provider;

/** The words of the application of the page. Throws a defect outside a
    `ShellWordsProvider`. */
export function useShellWords(): ShellWords<JobResult> {
  const words = useContext(ShellWordsContext);
  if (words === null) {
    throw new Error(
      "popnei_web defect: useShellWords outside a ShellWordsProvider",
    );
  }
  return words;
}
