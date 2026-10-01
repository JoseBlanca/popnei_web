/**
 * The mount of the line plot of the LD decay, `createLine` of
 * src/charts/line.ts (react.md, "Mounting a plot";
 * docs/specs/charts/line.md), by `usePlot`: created once in its element,
 * updated when its data change, and destroyed when it leaves the page, as
 * when the tab of the table of the bins is chosen. The element holds nothing React
 * draws, and its size comes from the CSS of the panel.
 *
 * The element is never narrower than the label of its horizontal axis
 * needs, which the plot would cut at the edge of its SVG. Below that
 * width the frame scrolls sideways, as a table does, and while it does,
 * and only then, a line over it says so and the Tab key reaches the
 * frame, a region named "Plot of the LD decay", and not by the title of
 * the plot, "LD decay", which is the name of the panel's own region, so
 * that the arrow keys scroll it (WCAG 1.4.10 and 2.1.1).
 */
import { useRef } from "react";

import { createLine } from "../../../charts/line.ts";
import type { LineData } from "../../../charts/line.ts";
import { classOf } from "../../classOf.ts";
import { useSidewaysFrame } from "../../widgets/sidewaysFrame.ts";
import { usePlot } from "../../widgets/usePlot.ts";
import styles from "./LdDecayResults.module.css";
import { PLOT_FRAME_NAME, PLOT_SCROLL_TEXT } from "./words.ts";

/** What the mount of the line plot is drawn with. */
export interface LinePlotProps {
  /** What the plot draws, the same object until the result or the
      largest distance changes, so that it is not drawn again on every
      render. */
  readonly data: LineData;
}

/** The frame of the line plot, and the plot in it. */
export function LinePlot({ data }: LinePlotProps): React.JSX.Element {
  const frameRef = useRef<HTMLDivElement>(null);
  const containerRef = usePlot(createLine, data);
  // Whether the plot is wider than its frame, which the browser measures
  // and React does not, and what the frame is then.
  const frame = useSidewaysFrame(frameRef);

  return (
    <div className={classOf(styles, "plotFrame")}>
      {frame.scrolls && (
        <p className={classOf(styles, "scrollLine")}>{PLOT_SCROLL_TEXT}</p>
      )}
      {/* A frame that scrolls is reached by the Tab key, so that a user
          of the keyboard scrolls it with the arrow keys (WCAG 2.1.1). */}
      <div
        ref={frameRef}
        className={classOf(styles, "plotScroll")}
        {...frame.attributes}
        {...(frame.attributes.role !== undefined && {
          "aria-label": PLOT_FRAME_NAME,
        })}
      >
        <div ref={containerRef} className={classOf(styles, "plot")} />
      </div>
    </div>
  );
}
