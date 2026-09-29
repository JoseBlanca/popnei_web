/**
 * The mount of the 2D scatter of the principal components, `createScatter`
 * of src/charts/scatter.ts (react.md, "Mounting a plot";
 * docs/specs/charts/scatter.md): created once in its element, updated when
 * its data change, the colours and the highlight among them, and destroyed
 * when it leaves the page. The element holds nothing React draws, and its
 * size comes from the CSS of the panel.
 */
import { useEffect, useRef } from "react";

import { createScatter } from "../../../charts/scatter.ts";
import type { ScatterData } from "../../../charts/scatter.ts";
import type { ChartHandle } from "../../../charts/types.ts";
import { classOf } from "../../classOf.ts";
import styles from "./PcaResults.module.css";

/** What the mount of the scatter is drawn with. */
export interface ScatterPlotProps {
  /** What the plot draws, the same object until something in it changes,
      so that it is not drawn again on every render. */
  readonly data: ScatterData;
}

/** The element of the 2D scatter, and the plot in it. */
export function ScatterPlot({ data }: ScatterPlotProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<ChartHandle<ScatterData> | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (element === null) return;
    if (plotRef.current === null) {
      plotRef.current = createScatter(element, data);
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
