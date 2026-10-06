/**
 * The layout of the statistics of the open file on popgen2.html, and the
 * room it keeps before they are drawn (docs/plans/file-stats.md, "Round 1
 * with the owner"). The open button is under the statistics, so they keep
 * one height from the pick of a file to the end of their second pass,
 * and a click aimed at the button as a pass ends is not lost: the row of
 * their button is one button high in every state; the words of a part
 * lie over the room of its plots, which takes the height of the plots
 * before they are drawn; and the download of the individuals keeps its
 * room, hidden, until the table is there.
 *
 * The pieces hold no D3, so that the page draws `StatsRoom`, the whole
 * room with no words, from the pick of a file, while the code of the
 * plots is downloaded and the file read; the section of FileStats.tsx is
 * built of the same pieces, and so takes the same room.
 */
import { classOf } from "../classOf.ts";
import { Button } from "../widgets/Button.tsx";
import { HistogramSpace } from "../widgets/HistogramSpace.tsx";
import styles from "./StatsLayout.module.css";
import histogramStyles from "./StatsHistogram.module.css";
import {
  INDIVIDUALS_CSV_LABEL,
  INDIVIDUALS_HEADING,
  INDIVIDUAL_STATISTICS,
  STATS_NAME,
  VARIANTS_HEADING,
  VARIANT_STATISTICS,
  individualTitle,
  variantTitle,
} from "./statsWords.ts";

/** What the section is drawn with. */
interface StatsFrameProps {
  /** The element of the section, for the focus that leaves it. */
  readonly sectionRef?: React.Ref<HTMLElement>;
  /** The row of the button, then the two parts. */
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

/** The row of the bar of the pass running and the button of the
    statistics: one button high in every state, empty with no button. */
export function ControlsRow({
  children,
}: {
  readonly children?: React.ReactNode;
}): React.JSX.Element {
  return <div className={classOf(styles, "controls")}>{children}</div>;
}

/** What a part is drawn with. */
interface PartProps {
  /** Its heading. */
  readonly heading: string;
  /** The element of its heading, which takes the focus when the button
      goes with it. */
  readonly headingRef?: React.Ref<HTMLHeadingElement>;
  /** What it holds under its heading. */
  readonly children: React.ReactNode;
}

/** A part of the section: its heading, then what it holds. */
export function Part({
  heading,
  headingRef,
  children,
}: PartProps): React.JSX.Element {
  return (
    <div className={classOf(styles, "part")}>
      {/* It takes the focus when the button goes with it, and is not in
          the order of the Tab key. */}
      <h2 ref={headingRef} tabIndex={-1} className={classOf(styles, "heading")}>
        {heading}
      </h2>
      {children}
    </div>
  );
}

/** What the room of the plots of a part is drawn with. */
interface PlotsRoomProps {
  /** The words of the part over its plots, or `null` for none. */
  readonly line: string | null;
  /** The plots, or the room they keep. */
  readonly children: React.ReactNode;
}

/** The plots of a part, two side by side when each has 20rem, and the
    words of the part over their room, which take no height of it. */
export function PlotsRoom({
  line,
  children,
}: PlotsRoomProps): React.JSX.Element {
  return (
    <div className={classOf(styles, "room")}>
      {line !== null && <p className={classOf(styles, "roomLine")}>{line}</p>}
      <div className={classOf(styles, "plots")}>{children}</div>
    </div>
  );
}

/** What the place of a histogram of the individuals is drawn with. */
interface IndividualPlaceProps {
  /** The histogram, or its room. */
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

/** The room of a histogram not drawn yet: its title, a line of one row
    and the element of the plot, as a histogram drawn has them, hidden
    from the eyes and from a screen reader. */
export function PlotSpace({
  title,
}: {
  readonly title: string;
}): React.JSX.Element {
  return (
    <div aria-hidden="true" className={classOf(histogramStyles, "space")}>
      <p className={classOf(histogramStyles, "title")}>{title}</p>
      <p className={classOf(histogramStyles, "muted")}>{"\u00a0"}</p>
      <HistogramSpace />
    </div>
  );
}

/** The download of the statistics of each individual: the button, or,
    with no `onPress`, its room, hidden and out of reach. */
export function IndividualsDownload({
  onPress,
}: {
  readonly onPress: (() => void) | null;
}): React.JSX.Element {
  return (
    <div
      className={classOf(
        styles,
        onPress === null ? "downloadRoom" : "download",
      )}
      {...(onPress === null && { "aria-hidden": true, inert: true })}
    >
      <Button
        label={INDIVIDUALS_CSV_LABEL}
        onPress={onPress ?? (() => undefined)}
      />
    </div>
  );
}

/** The room of the statistics with nothing in it, as high as the section
    whose results are not there yet: drawn from the pick of a file until
    the file is read and the code of the plots downloaded. */
export function StatsRoom(): React.JSX.Element {
  return (
    <StatsFrame>
      <ControlsRow />
      <Part heading={VARIANTS_HEADING}>
        <PlotsRoom line={null}>
          {VARIANT_STATISTICS.map((statistic) => (
            <PlotSpace key={statistic} title={variantTitle(statistic)} />
          ))}
        </PlotsRoom>
      </Part>
      <Part heading={INDIVIDUALS_HEADING}>
        <PlotsRoom line={null}>
          {INDIVIDUAL_STATISTICS.map((statistic) => (
            <IndividualPlace key={statistic} noValueLine={null}>
              <PlotSpace title={individualTitle(statistic)} />
            </IndividualPlace>
          ))}
        </PlotsRoom>
        <IndividualsDownload onPress={null} />
      </Part>
    </StatsFrame>
  );
}
