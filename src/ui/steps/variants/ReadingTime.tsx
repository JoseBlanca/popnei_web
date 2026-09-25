/**
 * The seconds since the step saw a read start, after "Reading
 * panel.nei." (docs/specs/steps/variants.md, "The states", running). The
 * step keeps them while it is on the screen and loses them when it is
 * left; a new load is a new count, by the `key` the step gives.
 */
import { useEffect, useState } from "react";

import { elapsedText } from "./words.ts";

/** How often the count is written again, in milliseconds. */
const TICK_MS = 1000;

/** What the count is drawn with. */
export interface ReadingTimeProps {
  /** The class of its text. */
  readonly className: string;
}

/** "12 seconds so far.", from the first second. */
export function ReadingTime({
  className,
}: ReadingTimeProps): React.JSX.Element | null {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const timer = setInterval(() => {
      setSeconds(Math.floor((performance.now() - start) / TICK_MS));
    }, TICK_MS);
    return () => {
      clearInterval(timer);
    };
  }, []);
  const text = elapsedText(seconds);
  return text === "" ? null : <span className={className}>{text}</span>;
}
