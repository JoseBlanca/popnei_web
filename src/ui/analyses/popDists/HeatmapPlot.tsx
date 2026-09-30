/**
 * The mount of the heatmap of the distances between populations,
 * `createHeatmap` of src/charts/heatmap.ts (react.md, "Mounting a plot";
 * docs/specs/charts/heatmap.md): created once in its element, updated
 * when its data change, the other measure among them, and destroyed when
 * it leaves the page. The element holds nothing React draws; its width
 * comes from the CSS of the panel, and its height from its ratio of 1 by
 * 1.
 *
 * The element is never narrower than the margins of the names and the
 * legend, which the heatmap gives from its data, and a grid of
 * `GRID_MIN_WIDTH` pixels a side: with names of 20 characters the
 * margins take 270 pixels, and at that width or less the grid would have
 * no room at all. Below that width the frame scrolls sideways, as a
 * table does, and while it does, and only then, a line over it says so
 * and the Tab key reaches the frame, a region named by the title of the
 * heatmap, so that the arrow keys scroll it (WCAG 1.4.10 and 2.1.1).
 */
import { useEffect, useRef, useState } from "react";

import { createHeatmap, heatmapMargin } from "../../../charts/heatmap.ts";
import type { HeatmapData } from "../../../charts/heatmap.ts";
import type { ChartHandle } from "../../../charts/types.ts";
import { classOf } from "../../classOf.ts";
import styles from "./PopDistsResults.module.css";
import { HEATMAP_SCROLL_TEXT } from "./words.ts";

/**
 * The least side of the grid, in pixels, below which the element does
 * not shrink: 128, three bands of 43 pixels, which hold the names of
 * the axes and no values. A page 320 pixels wide gives the panel 288,
 * and the heatmap of panel.nei, with names of 2 characters and the
 * legend of "Hudson's Fst", takes 148 of them in margins, leaving a grid
 * of 140: at 160 it scrolled sideways by 20 pixels. Meanwhile, refined
 * in the running application with the width of 40rem and the 56 pixels
 * under which a cell holds no value (heatmap.md, "The size").
 */
const GRID_MIN_WIDTH = 128;

/** What the mount of the heatmap is drawn with. */
export interface HeatmapPlotProps {
  /** What the heatmap draws, the same object until the result or the
      measure changes, so that it is not drawn again on every render. */
  readonly data: HeatmapData;
}

/** The frame of the heatmap, and the heatmap in it. */
export function HeatmapPlot({ data }: HeatmapPlotProps): React.JSX.Element {
  const frameRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<ChartHandle<HeatmapData> | null>(null);
  // Whether the heatmap is wider than its frame, which the browser
  // measures and React does not: kept up to date by a ResizeObserver,
  // which also reports the first size of what it observes.
  const [scrolls, setScrolls] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (element === null) return;
    if (plotRef.current === null) {
      plotRef.current = createHeatmap(element, data);
    } else {
      plotRef.current.update(data);
    }
  }, [data]);

  useEffect(() => {
    return () => {
      plotRef.current?.destroy();
      plotRef.current = null;
    };
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    const element = containerRef.current;
    if (frame === null || element === null) return;
    const observer = new ResizeObserver(() => {
      setScrolls(frame.scrollWidth > frame.clientWidth);
    });
    observer.observe(frame);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  const margin = heatmapMargin(data);
  const minWidth = Math.ceil(margin.left + margin.right + GRID_MIN_WIDTH);

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
        {...(scrolls && {
          role: "region",
          "aria-label": data.title,
          tabIndex: 0,
        })}
      >
        {/* The least width is the heatmap's, from its data, in the
            pixels its margins are counted in. */}
        <div
          ref={containerRef}
          className={classOf(styles, "heatmap")}
          style={{ minInlineSize: `${String(minWidth)}px` }}
        />
      </div>
    </div>
  );
}
