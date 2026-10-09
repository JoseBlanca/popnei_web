/**
 * The result of the PCA tab of popgen2.html, whose code is downloaded
 * apart from the page's (docs/specs/steps/popgen2-pca.md, "The result",
 * its code): it draws its plots with D3 and three.js, which the page does
 * not download before a file is open (the flow FS2 of
 * e2e/fileStats.spec.ts), and would add some 58 KB gzipped to the first
 * load of popgen2.html, more than the 50 KB the design allows the PCA
 * tab (docs/plans/analyses-pca.md, work package 6, deliverable 6).
 *
 * The download starts when the PCA tab is first shown with a variants
 * file, `prefetchPcaResults`, so that it is there when a run of minutes
 * ends; a result drawn before it arrives asks for it too, and says
 * "Loading the result…" meanwhile. A download that fails is caught here,
 * not by the boundary of the tab, which would keep the tab empty until a
 * reload and give the error bar a network failure as an error of the
 * application's own: its words stand in the place of the result with
 * "Try again", which asks for it again, at another address in a browser
 * that keeps a failed `import()` (src/ui/codeDownload.ts); the status
 * region says them once the tab is shown. Chromium 153 keeps the failure
 * of each file for the life of the page, and the retry asks for the
 * first file of the result at another address, but not the files it
 * imports, which popgen.html shares: when one of those failed, only a
 * reload mends it there, as the words say; WebKit 26.6 asks again for
 * every file.
 */
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { pcaOptions } from "../../../core/analyses/pca.ts";
import { classOf } from "../../classOf.ts";
import { createCodeDownload } from "../../codeDownload.ts";
import { useAnnouncer } from "../../shell/announcer.tsx";
import { useAppState } from "../../store.tsx";
import { Button } from "../../widgets/Button.tsx";
import styles from "../AnalysisPanel.module.css";
import type { ResultsProps } from "../panels.ts";
import { LOADING_RESULT, pcaTabResultFailed } from "./tabWords.ts";
import { whenShown } from "./whenShown.ts";
import { TRY_AGAIN } from "./words.ts";

/** The download of the code of the result. */
const RESULTS_CODE = createCodeDownload(() => import("./PcaTabResultView.tsx"));

/** Starts the download of the code of the result, when it has not
    arrived; a failure is left to the result drawn, which asks again. */
export function prefetchPcaResults(): void {
  if (RESULTS_CODE.state() === "loaded") return;
  RESULTS_CODE.load().catch(() => undefined);
}

/** The result of the PCA of the definition the store of popgen2.html
    runs, once its code is there; until then the line that says it loads,
    or the words of a download that failed with "Try again". */
export function PcaTabResults(props: ResultsProps): React.JSX.Element {
  const state = useSyncExternalStore(
    RESULTS_CODE.subscribe,
    RESULTS_CODE.state,
  );
  const announcer = useAnnouncer();
  const failedWords = useAppState((s) =>
    s.project.variants === null
      ? null
      : pcaTabResultFailed(
          pcaOptions(s.project, "popgen2").method,
          s.project.variants.name,
        ),
  );
  const placeRef = useRef<HTMLDivElement>(null);
  // Each press of Try again is another attempt, which the effect makes.
  const [attempt, setAttempt] = useState(0);
  // The latest words, for a failure that arrives after the render.
  const latest = useRef({ announcer, failedWords });
  useLayoutEffect(() => {
    latest.current = { announcer, failedWords };
  });

  useEffect(() => {
    if (RESULTS_CODE.loaded() !== null) return;
    let over = false;
    let stopSaying = (): void => undefined;
    RESULTS_CODE.load().then(
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
  }, [attempt]);

  const code = RESULTS_CODE.loaded();
  if (code !== null) {
    return <code.PcaTabResultView {...props} />;
  }
  return (
    <div ref={placeRef}>
      {state === "failed" ? (
        <>
          <p className={classOf(styles, "line")}>{failedWords}</p>
          <Button
            label={TRY_AGAIN}
            onPress={() => {
              // The button goes with the words: the focus moves to the
              // heading of the tab, as when Run or Stop goes, and not to
              // the start of the page (WCAG 2.4.3).
              placeRef.current
                ?.closest("section")
                ?.querySelector<HTMLElement>("h2")
                ?.focus();
              setAttempt((count) => count + 1);
            }}
          />
        </>
      ) : (
        <p className={classOf(styles, "line")}>{LOADING_RESULT}</p>
      )}
    </div>
  );
}
