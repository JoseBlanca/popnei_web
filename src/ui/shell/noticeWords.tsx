/**
 * What the words of the notice need of the page, its `NoticeWords`,
 * given to the notice (docs/specs/steps/popgen2-filters.md, "The
 * notice"). Each entry gives its own through `NoticeWordsProvider`, as it
 * gives the store: popgen.html the words of its shell, `SHELL_WORDS` of
 * src/ui/analyses/titles.ts, and popgen2.html the title of its one
 * analysis, `NOTICE_WORDS` of src/ui/variants/statsWords.ts. So the
 * notice is drawn on a page with no steps and no counts of the filters.
 */
import { createContext, useContext } from "react";

import type { NoticeWords } from "./words.ts";

const NoticeWordsContext = createContext<NoticeWords | null>(null);

/** Gives the words of the notice of the page to every component under
    it. */
export const NoticeWordsProvider = NoticeWordsContext.Provider;

/** The words of the notice of the page. Throws a defect outside a
    `NoticeWordsProvider`. */
export function useNoticeWords(): NoticeWords {
  const words = useContext(NoticeWordsContext);
  if (words === null) {
    throw new Error(
      "popnei_web defect: useNoticeWords outside a NoticeWordsProvider",
    );
  }
  return words;
}
