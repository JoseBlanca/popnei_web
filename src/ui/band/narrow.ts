/**
 * Whether the band at the top of popgen2.html is narrow, the window under
 * 44 rem wide, where it shows the short forms of its words, the heading
 * smaller and the parts closer, and leaves out a Stop recalculating
 * beside Stop all (docs/specs/steps/popgen2-band.md, "Its place" and
 * "Several live analyses"). Decided here alone, by one media query that
 * the band's CSS does not write again: a button the band leaves out is
 * then not drawn at all, so that the focus it had goes to the heading
 * "Popnei" as when any control of the band goes by itself, where a
 * button hidden by CSS left the focus on nothing after the window was
 * narrowed (the review of work package 4 of
 * docs/plans/population-tab.md, 12 October 2026).
 */
import { useSyncExternalStore } from "react";

/** The media query under which the band is narrow: the one place the
    width is written. 44 rem, 704 px at the browser's usual size of
    text, the least at which every line of the band fits whole with its
    buttons, the widest in 660 px of the 672 there; 30 rem until 12
    October 2026, under which the words of a line with two buttons were
    cut between 480 and 700 px (the review of work package 4). */
export const BAND_NARROW_QUERY = "(width < 44em)";

function narrowQuery(): MediaQueryList {
  return window.matchMedia(BAND_NARROW_QUERY);
}

function subscribeToNarrow(listener: () => void): () => void {
  const list = narrowQuery();
  list.addEventListener("change", listener);
  return () => {
    list.removeEventListener("change", listener);
  };
}

function isNarrow(): boolean {
  return narrowQuery().matches;
}

/** Whether the window is under 44 rem wide now, read again at each
    change of its width across that line. */
export function useBandNarrow(): boolean {
  return useSyncExternalStore(subscribeToNarrow, isNarrow);
}
