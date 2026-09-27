/**
 * The mount of a histogram of src/charts (react.md, "Mounting a plot";
 * docs/specs/charts/histogram.md): the plot is created once in its
 * element, updated when its data change, the threshold typed among them,
 * and destroyed when the component leaves the page. The element holds
 * nothing React draws, and its size comes from the CSS beside it.
 */
import { useEffect, useRef } from "react";

import { createHistogram } from "../../../charts/histogram.ts";
import type { HistogramData } from "../../../charts/histogram.ts";
import type { ChartHandle } from "../../../charts/types.ts";
import { classOf } from "../../classOf.ts";
import styles from "./HistogramBlock.module.css";

/** What the mount of a histogram is drawn with. */
export interface HistogramPlotProps {
  /** What the plot draws, the same object until something in it
      changes, so that it is not drawn again on every render. */
  readonly data: HistogramData;
}

/** The element of a histogram, and the plot in it. */
export function HistogramPlot({ data }: HistogramPlotProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<ChartHandle<HistogramData> | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (element === null) return;
    if (plotRef.current === null) {
      plotRef.current = createHistogram(element, data);
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

  return <div ref={containerRef} className={classOf(styles, "plot")} />;
}
