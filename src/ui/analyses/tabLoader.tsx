/**
 * A whole tab of popgen2.html whose code is downloaded apart from the
 * page's, `src/ui/codeDownload.ts`, the first time the tab is shown: the
 * Populations tab (docs/specs/steps/popgen2-populations.md, "The
 * result", its code) and the Distances tab
 * (docs/specs/steps/popgen2-distances.md, "The result", its code), so
 * that the first load of the page carries only the tab's name and
 * heading and the store's definitions. Until the code arrives, the
 * tab's line that it loads; a download that failed, its words with Try
 * again, as `CodeSplit.tsx` draws them. Kept once it arrives, so that the
 * tab drawn again, after another variants file, is drawn at once.
 */
import { useState } from "react";

import type { AppState } from "../../core/store.ts";
import type { JobResult } from "../../worker/protocol.ts";
import { createCodeDownload } from "../codeDownload.ts";
import { codeFilesReady } from "../codeFiles.ts";
import { useAppState } from "../store.tsx";
import { CodeSplit } from "./CodeSplit.tsx";

/** How a tab loaded apart is downloaded and drawn. */
export interface TabLoaderParts<M> {
  /** The `import()` of the module of the tab, which only this imports,
      so that the bundler makes a file of it. */
  readonly load: () => Promise<M>;
  /** The path of that module from the root of the repository, as the
      manifest of the build names it: "src/ui/analyses/popDists/
      DistancesTabView.tsx". A wrong one fails only in the built site,
      where the files of the code are asked for by it (codeFiles.ts), so
      a test reads each against its `import()`. */
  readonly source: string;
  /** What the module draws. */
  readonly render: (module: M) => React.ReactNode;
  /** The line while the code downloads: "Loading the Distances tab…". */
  readonly loadingLine: string;
  /** The words of a download that failed, for the variants file named
      `variantsName`. */
  readonly failedWords: (variantsName: string) => string;
}

/** What a tab loaded apart is drawn with. */
export interface TabLoaderProps {
  /** Whether the tab is shown and not greyed: its code is then
      downloaded, the first time. */
  readonly shown: boolean;
}

/** The component of a tab loaded apart, from its `parts`: nothing until
    it is first shown, then its code and what it draws. One download for
    the life of the page, made once here. */
export function createTabLoader<M>(
  parts: TabLoaderParts<M>,
): (props: TabLoaderProps) => React.JSX.Element | null {
  const code = createCodeDownload(parts.load, () =>
    codeFilesReady(parts.source),
  );
  const failedWordsOf = (s: AppState<JobResult, Blob>): string | null =>
    s.project.variants === null
      ? null
      : parts.failedWords(s.project.variants.name);
  return function TabLoader({ shown }: TabLoaderProps) {
    // Once shown, the tab stays asked for, hidden behind another tab as
    // every tab of the row is.
    const [asked, setAsked] = useState(shown);
    if (shown && !asked) setAsked(true);
    const failedWords = useAppState(failedWordsOf);
    if (!asked) return null;
    return (
      <CodeSplit
        code={code}
        render={parts.render}
        loadingLine={parts.loadingLine}
        failedWords={failedWords}
        retryFocus="place"
      />
    );
  };
}
