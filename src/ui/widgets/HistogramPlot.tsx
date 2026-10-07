/**
 * The mount of a histogram of src/charts (react.md, "Mounting a plot";
 * docs/specs/charts/histogram.md), by `usePlot`: the plot is created once
 * in its element, updated when its data change, the threshold typed among
 * them, and destroyed when the component leaves the page. The element holds
 * nothing React draws, and its size comes from the CSS beside it, of the
 * shape it is given: the histograms of the Variants step, wide, and those
 * of the spectrum of the diversity, taller, so that the label of their
 * vertical axis, "Share of the variants with both alleles", fits along it
 * at the width of a phone.
 */
import { createHistogram } from "../../charts/histogram.ts";
import type { HistogramData, HistogramFrame } from "../../charts/histogram.ts";
import { classOf } from "../classOf.ts";
import styles from "./HistogramPlot.module.css";
import { usePlot } from "./usePlot.ts";

/** What the mount of a histogram is drawn with. */
export interface HistogramPlotProps {
  /** What the plot draws, the same object until something in it
      changes, so that it is not drawn again on every render. */
  readonly data: HistogramData;
  /** The shape of its element: "wide", 16 by 10, or "tall", 4 by 3 and
      never lower than 18rem; wide when absent. */
  readonly shape?: "wide" | "tall";
  /** Told where the frame of the plot is drawn in its element, at the
      first draw and whenever a draw moves it: for what the screen lays
      over the plot, the line of a threshold the user drags. Called during
      the draw, which a resize makes in an animation frame, before the
      browser paints: what it changes outside React, a style, is painted
      with the plot, and a state of React would be a frame late. The one
      of the first render is kept, so it must not depend on values that
      change. */
  readonly onFrame?: (frame: HistogramFrame) => void;
}

/** The element of a histogram, and the plot in it. */
export function HistogramPlot({
  data,
  shape = "wide",
  onFrame,
}: HistogramPlotProps): React.JSX.Element {
  const containerRef = usePlot(
    createHistogram,
    data,
    onFrame === undefined ? {} : { onFrame },
  );
  return <div ref={containerRef} className={classOf(styles, shape)} />;
}
