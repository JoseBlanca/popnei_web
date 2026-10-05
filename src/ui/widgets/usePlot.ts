/**
 * The mount of a plot of src/charts in an element of a screen (react.md,
 * "Mounting a plot"): the plot is created once in the element, updated
 * when its data change, and destroyed when the component leaves the page.
 * The element holds nothing React draws, and its size comes from the CSS
 * of the screen. In development React runs the effects of a component
 * just mounted twice: the second run destroys the plot and empties the
 * handle, and the first creates it again from nothing. Shared by the
 * histograms, the heatmap of the distances between populations and the
 * line plot of the LD decay.
 */
import { useEffect, useRef } from "react";
import type { RefObject } from "react";

import type { Chart, ChartHandle } from "../../charts/types.ts";

/**
 * Mounts the plot `create` makes of `data` in the element given the ref
 * it returns. `create` is a function of src/charts, the same at every
 * render; `data` is the same object until something in it changes, so
 * that the plot is not drawn again on every render.
 */
export function usePlot<Data>(
  create: Chart<Data>,
  data: Data,
): RefObject<HTMLDivElement | null> {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<ChartHandle<Data> | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (element === null) return;
    if (plotRef.current === null) {
      plotRef.current = create(element, data);
    } else {
      plotRef.current.update(data);
    }
  }, [create, data]);

  useEffect(() => {
    return () => {
      plotRef.current?.destroy();
      plotRef.current = null;
    };
  }, []);

  return containerRef;
}
