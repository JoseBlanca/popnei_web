/**
 * The element of a histogram with no plot in it: as large as the element
 * of `HistogramPlot` of the same shape, from the same styles, for a screen
 * that keeps the room of a plot not drawn yet. It holds no D3, so that a
 * page draws it before the code of the plots is downloaded.
 */
import { classOf } from "../classOf.ts";
import styles from "./HistogramPlot.module.css";

/** What the room of a histogram is drawn with. */
export interface HistogramSpaceProps {
  /** The shape of the plot that will be drawn in its place. */
  readonly shape?: "wide" | "tall";
}

/** The room of a histogram, empty. */
export function HistogramSpace({
  shape = "wide",
}: HistogramSpaceProps): React.JSX.Element {
  return <div className={classOf(styles, shape)} />;
}
