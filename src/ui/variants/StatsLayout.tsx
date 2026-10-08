/**
 * The layout of the statistics of the open file on popgen2.html
 * (docs/plans/file-stats.md, "Round 1 with the owner"): the section, its
 * two parts, the grid of their plots, the room of the plots before they
 * are drawn, the place of a histogram of the individuals with the line
 * under it, and the download of the individuals. The room of the plots
 * is kept while the pass has given none yet, so that what is under them
 * does not move down as they arrive (FileStats.tsx); the download is
 * given no room, and the open button under the section moves down as it
 * arrives, which the owner chose over empty space
 * (docs/plans/live-stats.md, "The open widget moves with the plots").
 *
 * Apart from SectionPlots.tsx, and with no D3, since FileStats.tsx draws
 * the section with it while the code of the plots downloads: the page's
 * first download carries it, and not the plots.
 */
import { classOf } from "../classOf.ts";
import { Button } from "../widgets/Button.tsx";
import { NumberField } from "../widgets/NumberField.tsx";
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
  /** Whether it only keeps its room, hidden, its words those it had: the
      line of the pass once it ended, so that the plots under it stay
      where they were. False when absent. */
  readonly room?: boolean;
}

/** A line of a part, over its plots: the share calculated, that it was
    stopped, or that it was not calculated; or, hidden, the room of the
    line of the pass once it ended. */
export function PartLine({
  children,
  room = false,
}: PartLineProps): React.JSX.Element {
  return room ? (
    <p
      className={`${classOf(styles, "line")} ${classOf(styles, "room")}`}
      aria-hidden="true"
    >
      {children}
    </p>
  ) : (
    <p className={classOf(styles, "line")}>{children}</p>
  );
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

/** What the room of the plots of a part is drawn with. */
interface PlotsRoomProps {
  /** The short title of each plot, as the box of its threshold shows
      it, "Obs. het. max:". */
  readonly titles: readonly string[];
}

/** The room of the plots of a part before they are drawn, hidden, and
    out of reach of the keyboard and of a screen reader: for each plot
    the row of its short title and the box of its threshold, a box of the
    same field, which takes the same height and wraps its title at the
    same width, and under it the room of the plot, of its shape. */
export function PlotsRoom({ titles }: PlotsRoomProps): React.JSX.Element {
  return (
    <div
      className={`${classOf(styles, "plots")} ${classOf(styles, "room")}`}
      aria-hidden="true"
      inert
    >
      {titles.map((title) => (
        <div key={title} className={classOf(styles, "plotRoom")}>
          <NumberField
            label={title}
            shownLabel={title}
            value={0}
            minValue={0}
            maxValue={1}
            step={1}
            refusedText={nothingRefused}
            onRefused={nothing}
            onChange={nothing}
          />
          <div className={classOf(styles, "plotShape")} />
        </div>
      ))}
    </div>
  );
}

/** The words of a refusal of a box of the room, which takes no key. */
function nothingRefused(): string {
  return "";
}

/** What a box of the room does when changed, which it cannot be. */
function nothing(): void {
  // The room is inert.
}

/** What the place of a histogram of the individuals is drawn with. */
interface IndividualPlaceProps {
  /** The histogram, or nothing when no individual has a value. */
  readonly children: React.ReactNode;
  /** The line under it of the individuals with no value, or `null`. */
  readonly noValueLine: string | null;
  /** The longer words that line can take, whose room it keeps, hidden,
      or `null`. */
  readonly noValueRoom: string | null;
}

/** A histogram of the individuals and the line under it of those with
    no value, as high as its longer words, so that what is under it does
    not move when the line gains or loses ", and this filter removes
    them" and wraps on one line more or less. */
export function IndividualPlace({
  children,
  noValueLine,
  noValueRoom,
}: IndividualPlaceProps): React.JSX.Element {
  return (
    <div className={classOf(styles, "plot")}>
      {children}
      {noValueLine !== null && (
        <div className={classOf(styles, "lineStack")}>
          <p className={classOf(styles, "line")}>{noValueLine}</p>
          {noValueRoom !== null && noValueRoom !== noValueLine && (
            <p
              className={`${classOf(styles, "line")} ${classOf(styles, "room")}`}
              aria-hidden="true"
            >
              {noValueRoom}
            </p>
          )}
        </div>
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
