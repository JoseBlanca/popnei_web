/**
 * The frame of a table or a plot that scrolls sideways on a page
 * narrower than what it holds (WCAG 1.4.10): whether it scrolls, measured
 * by the browser at every change of size of the frame or of what it
 * holds, and the attributes that make it, while it scrolls, a stop of the
 * Tab key named as a region, so that the arrow keys scroll it (WCAG
 * 2.1.1). A frame that stops scrolling while it has the focus, the page
 * widened by a phone turned, a window resized or the zoom reduced, stays
 * a region that takes the focus, out of the order of the Tab key, until
 * the focus leaves it: taking its `tabindex` away would send the focus to
 * the body of the page (WCAG 2.4.3). Shared by `Table.tsx` and the
 * heatmap of the distances between populations. A frame of limited
 * height, that of a table of many rows, is followed the same way for what
 * it holds being higher than it, when asked with `down`.
 */
import { useEffect, useState } from "react";
import type { RefObject } from "react";

/** The attributes of the frame: none while it neither scrolls nor keeps
    the focus. */
export interface SidewaysFrameAttributes {
  readonly role?: "region";
  readonly tabIndex?: 0 | -1;
  readonly "data-scrolls"?: true;
  readonly onBlur?: () => void;
}

/** What the frame is now. */
export interface SidewaysFrame {
  /** Whether what it holds is wider than it. */
  readonly scrolls: boolean;
  /** Whether what it holds is higher than it; false unless asked with
      `down`. */
  readonly scrollsDown: boolean;
  /** Its attributes, to spread on it with those of its name. */
  readonly attributes: SidewaysFrameAttributes;
}

/**
 * Whether what `frame` holds is wider than it, as it would be with the
 * headers of a table wrapped: on a narrow page the headers of a table
 * that scrolls sideways stay on one line (Table.module.css), which widens
 * it, so measured as drawn a table that scrolled would go on scrolling
 * after the page widened, where with its headers wrapped it fits, as the
 * table of the distances between populations of panel.nei did on a page
 * of 340 pixels after one of 320, 352 pixels wide in a frame of 308. So the mark of a frame that scrolls is taken off for the
 * measure and put back, with how far it was scrolled, within the one
 * task, before the page is drawn.
 */
function widerWhenWrapped(frame: HTMLElement): boolean {
  const marked = frame.getAttribute("data-scrolls");
  if (marked === null) return frame.scrollWidth > frame.clientWidth;
  const scrolled = frame.scrollLeft;
  frame.removeAttribute("data-scrolls");
  const wider = frame.scrollWidth > frame.clientWidth;
  frame.setAttribute("data-scrolls", marked);
  frame.scrollTo({ left: scrolled });
  return wider;
}

/** Follows the frame `frameRef` and what it holds, and gives whether it
    scrolls and its attributes; with `down`, for a frame of limited height,
    whether it scrolls down too, which makes it a stop of the Tab key as
    scrolling sideways does. */
export function useSidewaysFrame(
  frameRef: RefObject<HTMLElement | null>,
  down = false,
): SidewaysFrame {
  const [scrolls, setScrolls] = useState(false);
  const [scrollsDown, setScrollsDown] = useState(false);
  // Whether it stopped scrolling while it had the focus, and has it still.
  const [kept, setKept] = useState(false);
  useEffect(() => {
    const frame = frameRef.current;
    if (frame === null) return;
    const observer = new ResizeObserver(() => {
      const wider = widerWhenWrapped(frame);
      const higher = down && frame.scrollHeight > frame.clientHeight;
      setScrolls(wider);
      setScrollsDown(higher);
      if (!wider && !higher && document.activeElement === frame) setKept(true);
    });
    observer.observe(frame);
    for (const child of Array.from(frame.children)) observer.observe(child);
    return () => {
      observer.disconnect();
    };
  }, [frameRef, down]);

  const onBlur = (): void => {
    setKept(false);
  };
  // `data-scrolls` marks the two side edges with a shadow, so it is for a
  // frame that scrolls sideways alone.
  const attributes: SidewaysFrameAttributes = scrolls
    ? { role: "region", tabIndex: 0, "data-scrolls": true, onBlur }
    : scrollsDown
      ? { role: "region", tabIndex: 0, onBlur }
      : kept
        ? { role: "region", tabIndex: -1, onBlur }
        : {};
  return { scrolls, scrollsDown, attributes };
}
