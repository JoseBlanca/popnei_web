/**
 * The result of the Populations tab of popgen2.html, whose code is
 * downloaded apart from the page's (docs/specs/steps/
 * popgen2-populations.md, "The result", its code), as the PCA tab's is
 * (`PcaTabResults.tsx`, which says why at length): the table, the
 * histograms of the spectrum and their parts are not in the first load
 * of the page.
 *
 * The download starts when the Populations tab is first shown with a
 * variants file, `prefetchPopulationsResults`, so that it is there when
 * a run ends; a result drawn before it arrives asks for it too, and says
 * "Loading the result…" meanwhile. A download that fails is caught here,
 * not by the boundary of the tab: its words stand in the place of the
 * result with "Try again", which asks for it again, and the status
 * region says them once the tab is shown.
 */
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { classOf } from "../../classOf.ts";
import { createCodeDownload } from "../../codeDownload.ts";
import { useAnnouncer } from "../../shell/announcer.tsx";
import { useAppState } from "../../store.tsx";
import { Button } from "../../widgets/Button.tsx";
import styles from "../AnalysisPanel.module.css";
import type { ResultsProps } from "../panels.ts";
import { LOADING_RESULT } from "../pca/tabWords.ts";
import { whenShown } from "../pca/whenShown.ts";
import { TRY_AGAIN } from "../pca/words.ts";
import { diversityTabResultFailed } from "./tabWords.ts";

/** The download of the code of the result. */
const RESULTS_CODE = createCodeDownload(
  () => import("./PopulationsTabResultView.tsx"),
);

/** Starts the download of the code of the result, when it has not
    arrived; a failure is left to the result drawn, which asks again. */
export function prefetchPopulationsResults(): void {
  if (RESULTS_CODE.state() === "loaded") return;
  RESULTS_CODE.load().catch(() => undefined);
}

/** The result of the diversity of the definition the store of
    popgen2.html runs, once its code is there; until then the line that
    says it loads, or the words of a download that failed with "Try
    again". */
export function PopulationsTabResults(props: ResultsProps): React.JSX.Element {
  const state = useSyncExternalStore(
    RESULTS_CODE.subscribe,
    RESULTS_CODE.state,
  );
  const announcer = useAnnouncer();
  const failedWords = useAppState((s) =>
    s.project.variants === null
      ? null
      : diversityTabResultFailed(s.project.variants.name),
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
    return <code.PopulationsTabResultView {...props} />;
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
              // heading of the tab, and not to the start of the page.
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
