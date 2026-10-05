/**
 * The mount of the heatmap of the distances between populations,
 * `createHeatmap` of src/charts/heatmap.ts (react.md, "Mounting a plot";
 * docs/specs/charts/heatmap.md): created once in its element, updated
 * when its data change, the other measure among them, and destroyed when
 * it leaves the page. The element holds nothing React draws; its width
 * comes from the CSS of the panel, and its height is that width less the
 * left and the right margins of the heatmap and with the top and the
 * bottom ones added, so that the square grid fills the frame from its
 * top to the names under its columns (heatmap.md, "The size").
 *
 * The element is never narrower than the margins of the names and the
 * legend, which the heatmap gives from its data, and a grid of
 * `GRID_MIN_WIDTH` pixels a side: with names of 20 characters the
 * margins take 306 pixels, and at that width or less the grid would have
 * no room for its names. Below that width the frame scrolls sideways, as a
 * table does, and while it does, and only then, a line over it says so
 * and the Tab key reaches the frame, a region named by the title of the
 * heatmap, so that the arrow keys scroll it (WCAG 1.4.10 and 2.1.1).
 */
import { useMemo, useRef } from "react";

import { createHeatmap, heatmapMargin } from "../../../charts/heatmap.ts";
import type { HeatmapData } from "../../../charts/heatmap.ts";
import { classOf } from "../../classOf.ts";
import { useSidewaysFrame } from "../../widgets/sidewaysFrame.ts";
import { usePlot } from "../../widgets/usePlot.ts";
import styles from "./PopDistsResults.module.css";
import { HEATMAP_SCROLL_TEXT } from "./words.ts";

/**
 * The least side of the grid, in pixels, below which the element does
 * not shrink: 128, three bands of 43 pixels, which hold the names of
 * the axes and no values. A page 320 pixels wide gives the panel 288,
 * and the heatmap of panel.nei, with names of 2 characters and the
 * legend of "Hudson's Fst", takes 144.4 of them in margins, leaving a
 * grid of 143: at 160 it scrolled sideways. The owner kept it on 1
 * October 2026 (heatmap.md, "The size").
 */
const GRID_MIN_WIDTH = 128;

/** What the mount of the heatmap is drawn with. */
export interface HeatmapPlotProps {
  /** What the heatmap draws, the same object until the result or the
      measure changes, so that it is not drawn again on every render. */
  readonly data: HeatmapData;
}

/** The lengths the CSS of the panel reads, by their names there. */
type HeatmapLengths = React.CSSProperties &
  Record<"--heatmap-least-width" | "--heatmap-beyond-width", string>;

/** The frame of the heatmap, and the heatmap in it. */
export function HeatmapPlot({ data }: HeatmapPlotProps): React.JSX.Element {
  const frameRef = useRef<HTMLDivElement>(null);
  const containerRef = usePlot(createHeatmap, data);
  // Whether the heatmap is wider than its frame, which the browser
  // measures and React does not, and what the frame is then.
  const frame = useSidewaysFrame(frameRef);
  const scrolls = frame.scrolls;

  // The margins with the names, which the heatmap keeps down to this
  // width, and by which its height exceeds its width: a grid as wide as
  // the frame, and as high.
  const lengths = useMemo((): HeatmapLengths => {
    const margin = heatmapMargin(data);
    const minWidth = Math.ceil(margin.left + margin.right + GRID_MIN_WIDTH);
    const beyond = margin.top + margin.bottom - margin.left - margin.right;
    return {
      "--heatmap-least-width": `${String(minWidth)}px`,
      "--heatmap-beyond-width": `${String(beyond)}px`,
    };
  }, [data]);

  return (
    <div className={classOf(styles, "heatmapFrame")}>
      {scrolls && (
        <p className={classOf(styles, "scrollLine")}>{HEATMAP_SCROLL_TEXT}</p>
      )}
      {/* A frame that scrolls is reached by the Tab key, so that a user
          of the keyboard scrolls it with the arrow keys (WCAG 2.1.1). */}
      <div
        ref={frameRef}
        className={classOf(styles, "heatmapScroll")}
        {...frame.attributes}
        {...(frame.attributes.role !== undefined && {
          "aria-label": data.title,
        })}
      >
        {/* The least width and the height are the heatmap's, from its
            data, in the pixels its margins are counted in. */}
        <div
          ref={containerRef}
          className={classOf(styles, "heatmap")}
          style={lengths}
        />
      </div>
    </div>
  );
}
