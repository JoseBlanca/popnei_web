/**
 * What a tab of popgen2.html draws from code downloaded apart from the
 * page's, `src/ui/codeDownload.ts`: the result of the PCA tab
 * (docs/specs/steps/popgen2-pca.md, "The result", its code) and the
 * whole Populations tab (docs/specs/steps/popgen2-populations.md, "The
 * result", its code). Until the code is there, a line that says it loads; a download that
 * failed is caught here, not by the boundary of the tab, which would
 * keep the tab empty until a reload and give the error bar a network
 * failure as an error of the application's own: its words stand in the
 * place of what the code draws, with "Try again", which asks for the
 * code again, and the status region says them once the place is shown.
 *
 * Try again asks the network for every file of the code again: the
 * download asks for each with `fetch` before the `import()`
 * (src/ui/codeFiles.ts), since a browser keeps the failure an `import()`
 * met, of the file and of every file it imports, for the life of the
 * page (src/ui/codeDownload.ts).
 */
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { classOf } from "../classOf.ts";
import type { CodeDownload } from "../codeDownload.ts";
import { useAnnouncer } from "../shell/announcer.tsx";
import { Button } from "../widgets/Button.tsx";
import styles from "./AnalysisPanel.module.css";
import { whenShown } from "./pca/whenShown.ts";
import { TRY_AGAIN } from "./pca/words.ts";

/** What a part drawn from code downloaded apart is drawn with. */
export interface CodeSplitProps<M> {
  /** The download of the code. */
  readonly code: CodeDownload<M>;
  /** What the code draws, once it is there. */
  readonly render: (module: M) => React.ReactNode;
  /** The line while the code downloads: "Loading the result…". */
  readonly loadingLine: string;
  /** The words of a download that failed, which the status region says
      too; `null` when there is nothing to say them of. */
  readonly failedWords: string | null;
  /** Where the focus goes when Try again is pressed, since the button
      goes with the words: "section", the heading of the section around
      the place, which stays while the code downloads, as the frame of an
      analysis does around its result; "place", the place itself, and
      then the first heading the code draws once it arrives, for a whole
      tab, of which nothing stays. Either way not the start of the page
      (WCAG 2.4.3). */
  readonly retryFocus: "section" | "place";
}

/** What the code `code` draws once it is there; until then the line
    that says it loads, or the words of a download that failed with
    "Try again". */
export function CodeSplit<M>({
  code,
  render,
  loadingLine,
  failedWords,
  retryFocus,
}: CodeSplitProps<M>): React.JSX.Element {
  const state = useSyncExternalStore(code.subscribe, code.state);
  const announcer = useAnnouncer();
  const placeRef = useRef<HTMLDivElement>(null);
  // The element whose first heading takes the focus once the code
  // arrives after Try again, with "place"; `null` otherwise.
  const focusAfter = useRef<HTMLElement | null>(null);
  // Each press of Try again is another attempt, which the effect makes.
  const [attempt, setAttempt] = useState(0);
  // The latest words, for a failure that arrives after the render.
  const latest = useRef({ announcer, failedWords });
  useLayoutEffect(() => {
    latest.current = { announcer, failedWords };
  });

  useEffect(() => {
    if (code.loaded() !== null) return;
    let over = false;
    let stopSaying = (): void => undefined;
    code.load().then(
      () => undefined,
      () => {
        if (over) return;
        stopSaying = whenShown(placeRef.current, () => {
          const words = latest.current.failedWords;
          if (words !== null) latest.current.announcer.announce(words);
        });
      },
    );
    return () => {
      over = true;
      stopSaying();
    };
  }, [code, attempt]);

  // The code arrived after Try again, while the focus was on the place,
  // which is gone: the focus goes to the first heading it drew.
  useEffect(() => {
    const around = focusAfter.current;
    if (state !== "loaded" || around === null) return;
    focusAfter.current = null;
    const active = document.activeElement;
    if (active === null || active === document.body) {
      around.querySelector<HTMLElement>("h2")?.focus();
    }
  }, [state]);

  const loaded = code.loaded();
  if (loaded !== null) return <>{render(loaded)}</>;
  return (
    <div ref={placeRef} tabIndex={retryFocus === "place" ? -1 : undefined}>
      {state === "failed" ? (
        <>
          <p className={classOf(styles, "line")}>{failedWords}</p>
          <Button
            label={TRY_AGAIN}
            onPress={() => {
              const place = placeRef.current;
              if (retryFocus === "section") {
                place
                  ?.closest("section")
                  ?.querySelector<HTMLElement>("h2")
                  ?.focus();
              } else {
                focusAfter.current = place?.parentElement ?? null;
                place?.focus();
              }
              setAttempt((count) => count + 1);
            }}
          />
        </>
      ) : (
        <p className={classOf(styles, "line")}>{loadingLine}</p>
      )}
    </div>
  );
}
