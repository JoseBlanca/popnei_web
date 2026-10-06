/**
 * The layout of the statistics of the open file on popgen2.html
 * (docs/plans/file-stats.md, "Round 1 with the owner"): the section, its
 * two parts, the grid of their plots, the place of a histogram of the
 * individuals with the line under it, and the download of the
 * individuals. No room is kept for what is not drawn yet: the open
 * button under the section moves down as the plots arrive, which the
 * owner chose over empty space (docs/plans/live-stats.md, "The open
 * widget moves with the plots").
 */
import { classOf } from "../classOf.ts";
import { Button } from "../widgets/Button.tsx";
import styles from "./StatsLayout.module.css";
import { INDIVIDUALS_CSV_LABEL, STATS_NAME } from "./statsWords.ts";

/** What the section is drawn with. */
interface StatsFrameProps {
  /** The element of the section, for the focus that leaves it. */
  readonly sectionRef?: React.Ref<HTMLElement>;
  /** The two parts. */
  readonly children: React.ReactNode;
}

/** The section of the statistics, named for a screen reader. */
export function StatsFrame({
  sectionRef,
  children,
}: StatsFrameProps): React.JSX.Element {
  return (
    <section
      ref={sectionRef}
      aria-label={STATS_NAME}
      className={classOf(styles, "stats")}
    >
      {children}
    </section>
  );
}

/** What a part is drawn with. */
interface PartProps {
  /** Its heading. */
  readonly heading: string;
  /** What it holds under its heading. */
  readonly children: React.ReactNode;
}

/** A part of the section: its heading, then what it holds. */
export function Part({ heading, children }: PartProps): React.JSX.Element {
  return (
    <div className={classOf(styles, "part")}>
      <h2 className={classOf(styles, "heading")}>{heading}</h2>
      {children}
    </div>
  );
}

/** What a line of a part is drawn with. */
interface PartLineProps {
  /** Its words. */
  readonly children: string;
}

/** A line of a part, over its plots: the share calculated, that it was
    stopped, or that it was not calculated. */
export function PartLine({ children }: PartLineProps): React.JSX.Element {
  return <p className={classOf(styles, "line")}>{children}</p>;
}

/** What the plots of a part are drawn with. */
interface PlotsProps {
  /** The plots. */
  readonly children: React.ReactNode;
}

/** The plots of a part, two side by side when each has 20rem. */
export function Plots({ children }: PlotsProps): React.JSX.Element {
  return <div className={classOf(styles, "plots")}>{children}</div>;
}

/** What the place of a histogram of the individuals is drawn with. */
interface IndividualPlaceProps {
  /** The histogram, or nothing when no individual has a value. */
  readonly children: React.ReactNode;
  /** The line under it of the individuals with no value, or `null`. */
  readonly noValueLine: string | null;
}

/** A histogram of the individuals and the line under it of those with
    no value. */
export function IndividualPlace({
  children,
  noValueLine,
}: IndividualPlaceProps): React.JSX.Element {
  return (
    <div className={classOf(styles, "plot")}>
      {children}
      {noValueLine !== null && (
        <p className={classOf(styles, "line")}>{noValueLine}</p>
      )}
    </div>
  );
}

/** The download of the statistics of each individual. */
export function IndividualsDownload({
  onPress,
}: {
  readonly onPress: () => void;
}): React.JSX.Element {
  return (
    <div className={classOf(styles, "download")}>
      <Button label={INDIVIDUALS_CSV_LABEL} onPress={onPress} />
    </div>
  );
}
