/**
 * The clock of a calculation under way, which the panel of an analysis
 * and the writing of the Variants step show beside its bar: the whole
 * seconds since the request started, counted every second from the start
 * `runs.ts` noted, so that the time is not lost when the user goes to
 * another step and back.
 */
import { useEffect, useState } from "react";

import { startedAt } from "./runs.ts";

/** A second, in the milliseconds of performance.now(). */
const SECOND_MS = 1000;

/** The whole seconds since the request `runId` started, drawn again at
    each whole second; from the first drawing when `runs.ts` has no start
    of it. */
export function useRunSeconds(runId: number): number {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const start = startedAt(runId) ?? performance.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = (): void => {
      const elapsed = performance.now() - start;
      setSeconds(Math.floor(elapsed / SECOND_MS));
      // The next tick at the next whole second since the start.
      timer = setTimeout(tick, SECOND_MS - (elapsed % SECOND_MS));
    };
    timer = setTimeout(tick);
    return () => {
      clearTimeout(timer);
    };
  }, [runId]);

  return seconds;
}
