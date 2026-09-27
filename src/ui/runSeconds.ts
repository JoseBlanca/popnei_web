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

/** The whole seconds from `start`, in the milliseconds of
    performance.now(), to now; 0 with no start. */
function secondsSince(start: number | null): number {
  return start === null
    ? 0
    : Math.floor((performance.now() - start) / SECOND_MS);
}

/** The whole seconds since the request `runId` started, drawn again at
    each whole second; from the first drawing when `runs.ts` has no start
    of it. The first drawing already gives the time since the start, so a
    panel drawn again after a visit to another step does not show 0:00
    for a moment. The time is first read when the component is drawn for
    the first time, so a caller draws a new component for a new request,
    with `key={runId}`. */
export function useRunSeconds(runId: number): number {
  const [seconds, setSeconds] = useState(() => secondsSince(startedAt(runId)));

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
