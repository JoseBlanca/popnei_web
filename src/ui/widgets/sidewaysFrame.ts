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
 * heatmap of the distances between populations.
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
  /** Its attributes, to spread on it with those of its name. */
  readonly attributes: SidewaysFrameAttributes;
}

/** Follows the frame `frameRef` and what it holds, and gives whether it
    scrolls and its attributes. */
export function useSidewaysFrame(
  frameRef: RefObject<HTMLElement | null>,
): SidewaysFrame {
  const [scrolls, setScrolls] = useState(false);
  // Whether it stopped scrolling while it had the focus, and has it still.
  const [kept, setKept] = useState(false);
  useEffect(() => {
    const frame = frameRef.current;
    if (frame === null) return;
    const observer = new ResizeObserver(() => {
      const wider = frame.scrollWidth > frame.clientWidth;
      setScrolls(wider);
      if (!wider && document.activeElement === frame) setKept(true);
    });
    observer.observe(frame);
    for (const child of Array.from(frame.children)) observer.observe(child);
    return () => {
      observer.disconnect();
    };
  }, [frameRef]);

  const onBlur = (): void => {
    setKept(false);
  };
  const attributes: SidewaysFrameAttributes = scrolls
    ? { role: "region", tabIndex: 0, "data-scrolls": true, onBlur }
    : kept
      ? { role: "region", tabIndex: -1, onBlur }
      : {};
  return { scrolls, attributes };
}
