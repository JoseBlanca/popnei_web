/**
 * The mount of a histogram of src/charts (react.md, "Mounting a plot";
 * docs/specs/charts/histogram.md), by `usePlot`: the plot is created once
 * in its element, updated when its data change, the threshold typed among
 * them, and destroyed when the component leaves the page. The element holds
 * nothing React draws, and its size comes from the CSS beside it, of the
 * shape it is given: the histograms of the Variants step, wide, and those
 * of the spectrum of the diversity, taller, so that the label of their
 * vertical axis, "Share of the variants with both alleles", fits along it
 * at the width of a phone. Given a download, it draws the menu
 * "Download…" above the plot, whose images come from the plot's handle
 * (docs/specs/widgets/downloads.md, "A plot"); popgen.html gives none. A
 * screen that lays something over the plot places the menu and the
 * plot's element itself, by `arrange`.
 */
import { createHistogram } from "../../charts/histogram.ts";
import type { HistogramData, HistogramFrame } from "../../charts/histogram.ts";
import { classOf } from "../classOf.ts";
import { plotItems } from "./downloadItems.ts";
import type { PlotDownload } from "./downloadItems.ts";
import { DownloadMenu } from "./DownloadMenu.tsx";
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
  /** The download of the plot, which draws the menu "Download…" above
      it; none when absent, as on popgen.html. */
  readonly download?: PlotDownload;
  /** Places the menu, `null` with no download, and the plot's element,
      for a screen that lays something over the plot: the histograms of
      popgen2.html put the menu in the row of the box of the threshold,
      and the plot in the box its line is placed against, which the menu
      would otherwise push the plot down in. It is called at each render
      and must place both in the same elements every time, so that the
      plot stays in the element it was drawn in. Without it, the menu is
      a line of its own above the plot. */
  readonly arrange?: (
    menu: React.JSX.Element | null,
    plot: React.JSX.Element,
  ) => React.JSX.Element;
}

/** The element of a histogram, and the plot in it. */
export function HistogramPlot({
  data,
  shape = "wide",
  onFrame,
  download,
  arrange,
}: HistogramPlotProps): React.JSX.Element {
  const { ref, handle } = usePlot(
    createHistogram,
    data,
    onFrame === undefined ? {} : { onFrame },
  );
  const menu =
    download === undefined ? null : (
      <DownloadMenu
        what={download.what}
        items={plotItems(download, handle)}
        waiting={download.waiting}
      />
    );
  const plot = <div ref={ref} className={classOf(styles, shape)} />;
  if (arrange !== undefined) return arrange(menu, plot);
  // The element of the plot is the same with a download and without, so
  // that one given or taken away after the first draw leaves the plot in
  // the element shown: the menu is a line of its own before it, and
  // nothing wraps the two.
  return (
    <>
      {menu !== null && (
        <div className={classOf(styles, "menuLine")}>{menu}</div>
      )}
      {plot}
    </>
  );
}
