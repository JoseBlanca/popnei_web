/**
 * The status region of the error bar of popgen.html and of the band of
 * popgen2.html, which say what their Save and their Copy the details
 * did (docs/specs/shell.md, "The error bar"; docs/specs/steps/
 * popgen2-band.md, "An error of the application").
 */
import { useEffect, useRef, useState } from "react";

/** The text of a status region and the functions that change it. */
export interface SaidRegion {
  /** What the region says now. */
  readonly said: string;
  /** Empties it and writes `text` a frame later. */
  readonly say: (text: string) => void;
  /** Empties it. */
  readonly clear: () => void;
}

/** Whether the last save failed, for a region that saves nothing. */
function neverFailed(): boolean {
  return false;
}

/**
 * The text of the status region of the error bar of popgen.html, or of
 * the band of popgen2.html, and `say`, which empties it and writes
 * `text` a frame later: a screen reader reads a text written again only
 * if it changed, so a second Save or Copy, which gives the same words,
 * would otherwise not be heard; and `clear`, which empties it.
 *
 * On the error bar, each text is written with `failedNow()`, whether the
 * last save failed when it was written, and `said` gives it only while
 * `failed`, the same as the bar's first line reads, is still that; a
 * text whose moment has passed is emptied as the bar is drawn, so that
 * it does not come back. Its words, "could not be saved" or "handed to
 * the browser", would otherwise contradict a first line changed by a
 * Save of the header. The band, which saves nothing, gives neither, and
 * its texts stay until the next.
 */
export function useSaid(
  failedNow: () => boolean = neverFailed,
  failed = false,
): SaidRegion {
  const [said, setSaid] = useState<Said>(NOTHING_SAID);
  const pending = useRef<number | null>(null);
  const cancel = (): void => {
    if (pending.current !== null) cancelAnimationFrame(pending.current);
    pending.current = null;
  };
  useEffect(() => cancel, []);
  // A text written with another state of the saves than the present one
  // is emptied here, in the drawing, as react.dev's "adjusting some state
  // when a prop changes" does.
  const current = said.text === "" || said.failed === failed;
  if (!current) setSaid(NOTHING_SAID);
  return {
    said: current ? said.text : "",
    say: (text) => {
      cancel();
      const failedThen = failedNow();
      setSaid(NOTHING_SAID);
      pending.current = requestAnimationFrame(() => {
        pending.current = null;
        setSaid({ text, failed: failedThen });
      });
    },
    clear: () => {
      cancel();
      setSaid(NOTHING_SAID);
    },
  };
}

/** A text of the status region, with whether the last save had failed
    when it was written. */
interface Said {
  readonly text: string;
  readonly failed: boolean;
}

const NOTHING_SAID: Said = Object.freeze({ text: "", failed: false });
