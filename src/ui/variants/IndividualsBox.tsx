/**
 * The box of the individuals file on popgen2.html, beside the box of the
 * variants file, or under it below 720 pixels
 * (docs/specs/steps/popgen2-input.md, "The box of the individuals
 * file"). A summary since 16 October 2026, when the owner asked for a box
 * that stays small above every tab: with no file, nothing before the
 * variants file has given its individuals, and then the summary line of
 * the individuals kept, all unclassified; with a file, its name and, as
 * it is read, refused or read, the words of the read, of the refusal, or
 * the list "Column of the populations" with the summary line, "180
 * individuals classified in 3 populations, 20 unclassified", and the
 * lines under it, the warnings that say the counts cannot be trusted
 * among them. The words of the last file not opened follow them.
 *
 * With no file, the box ends with the zone that opens one, its button,
 * "Open individuals file…", at the bottom of the box, at the height of
 * the button of the box Variants; an opening by that button, which goes
 * with the zone, gives the focus to the box's heading. With a file, the
 * whole box takes a file dropped or pasted, with no button and no frame
 * drawn, and "Open another individuals file…" and Remove are at the end
 * of the Individuals tab (docs/plans/file-buttons.md, 16 October 2026).
 * The zones are those of the page's one opening, `useIndividualsOpening`,
 * which waits while an analysis that reads the populations runs, and
 * the list of the column waits with it, so that no change leaves the
 * running analysis behind.
 *
 * The lines of the file are in a boundary of errors made again for each
 * file, as those of the variants file are; the zone has a boundary of its
 * own, drawn again at each turn of the tabs after a throw, as the zone of
 * the variants file has; around the box of a file open, its boundary
 * draws the box's heading alone in its place.
 */
import { useId, useRef } from "react";

import { populationCounts } from "../../core/populations.ts";
import type { PageTab } from "../../core/popgen2Tabs.ts";
import { escaped, individualsBoxNeeds } from "../../core/project.ts";
import type { IndividualsSource, Project } from "../../core/project.ts";
import { classOf } from "../classOf.ts";
import { ErrorBoundary } from "../shell/ErrorBoundary.tsx";
import { useAppState, useStore } from "../store.tsx";
import { usePopulationsLock } from "./filtersLock.ts";
import { useFocusOnGone } from "./focusOnGone.ts";
import { Problem } from "../widgets/Problem.tsx";
import { Select } from "../widgets/Select.tsx";
import styles from "./IndividualsBox.module.css";
import {
  CountsLineShown,
  usePassWait,
  waitingCount,
} from "./IndividualsCounts.tsx";
import { OpenIndividuals } from "./OpenIndividuals.tsx";
import type { IndividualsOpening } from "./OpenIndividuals.tsx";
import pageStyles from "./VariantsPage.module.css";
import {
  chosenColumnItem,
  columnItemCommand,
  columnItems,
} from "./individualsCommands.ts";
import {
  COLUMN_LIST_LABEL,
  INDIVIDUALS_BOX_NAME,
  INDIVIDUALS_LINES_NAME,
  OPENING_INDIVIDUALS_ZONE_NAME,
  countsShown,
  noColumnQualifiedText,
  noFileCounts,
} from "./individualsWords.ts";
import type { SummaryLine } from "./individualsWords.ts";

/** What the box is drawn with. */
export interface IndividualsBoxProps {
  /** The tab shown, whose turn draws the zone again after a throw. */
  readonly tab: PageTab;
  /** The page's one opening of the individuals file. */
  readonly opening: IndividualsOpening;
  /** The zone's button, before a file is open, which Remove in the
      Individuals tab gives the focus to. */
  readonly openButton: React.RefObject<HTMLButtonElement | null>;
}

/** The box of the individuals file. */
export function IndividualsBox({
  tab,
  opening,
  openButton,
}: IndividualsBoxProps): React.JSX.Element {
  const headingId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const individuals = useAppState((s) => s.project.individuals);
  // An opening by the box's button: the button goes with its zone, and
  // the focus goes to the box's heading.
  const zoneEnd = useFocusOnGone(() => heading.current);
  const lines = (
    <>
      {/* It takes the focus after an opening by the box's button, and is
          not a stop of the Tab key. */}
      <h2
        ref={heading}
        id={headingId}
        tabIndex={-1}
        className={classOf(pageStyles, "boxHeading")}
      >
        {INDIVIDUALS_BOX_NAME}
      </h2>
      {/* Another load is another boundary, which has caught nothing. */}
      <ErrorBoundary
        key={individuals?.fileId ?? "none"}
        heading={INDIVIDUALS_LINES_NAME}
        level={3}
      >
        <FileLines individuals={individuals} />
      </ErrorBoundary>
      {opening.refusal !== null && <Problem>{opening.refusal}</Problem>}
    </>
  );

  if (individuals !== null) {
    return (
      <section
        aria-labelledby={headingId}
        className={`${classOf(pageStyles, "box")} ${classOf(pageStyles, "boxDrop")}`}
      >
        {/* A throw in the zone leaves the box its heading. */}
        <ErrorBoundary heading={INDIVIDUALS_BOX_NAME} level={2} resetOn={tab}>
          <OpenIndividuals opening={opening}>
            <div className={classOf(pageStyles, "boxInner")}>{lines}</div>
          </OpenIndividuals>
        </ErrorBoundary>
      </section>
    );
  }
  return (
    <section
      aria-labelledby={headingId}
      className={`${classOf(pageStyles, "box")} ${classOf(pageStyles, "boxInner")}`}
    >
      {lines}
      <div ref={zoneEnd} className={classOf(pageStyles, "boxEnd")}>
        {/* Its own boundary, drawn again at each turn of the tabs after a
            throw, as the zone of the variants file has. */}
        <ErrorBoundary
          heading={OPENING_INDIVIDUALS_ZONE_NAME}
          level={3}
          resetOn={tab}
        >
          <OpenIndividuals opening={opening} buttonRef={openButton} />
        </ErrorBoundary>
      </div>
    </section>
  );
}

/** What the lines of the file are drawn with. */
interface FileLinesProps {
  /** The individuals file of the project, or null with none. */
  readonly individuals: IndividualsSource | null;
}

/** The lines of the file: with no file, the counts of the unclassified;
    or its name and its read, refusal, or list and counts. */
function FileLines({ individuals }: FileLinesProps): React.JSX.Element | null {
  if (individuals === null) return <NoFileCounts />;
  return (
    <div className={classOf(styles, "lines")}>
      <p className={classOf(styles, "fileName")}>{escaped(individuals.name)}</p>
      <ReadLines individuals={individuals} />
    </div>
  );
}

/** The lines of the read of `individuals`: being read, refused, or the
    list and the counts. */
function ReadLines({
  individuals,
}: FileLinesProps & {
  readonly individuals: IndividualsSource;
}): React.JSX.Element {
  const project = useAppState((s) => s.project);
  switch (individuals.read.kind) {
    case "pending":
      return <p className={classOf(styles, "line")}>{reasonOf(project)}</p>;
    case "failed":
    case "notGiven":
      return <Problem>{reasonOf(project)}</Problem>;
    case "read":
      return <ColumnAndCounts project={project} />;
  }
}

/** The words of a file being read or refused, which
    `individualsBoxNeeds` always gives then. */
function reasonOf(p: Project): string {
  const reason = individualsBoxNeeds(p);
  if (reason === null) {
    throw new Error(
      "popnei_web defect: core gave no words for an individuals file being read or refused.",
    );
  }
  return reason;
}

/** What the list and the summary line are drawn with. */
interface ColumnAndCountsProps {
  /** The project, whose individuals file is read. */
  readonly project: Project;
}

/** The list "Column of the populations", with the line of no column
    chosen under it, and the summary line with the lines of the counts,
    or the warning in its place. */
function ColumnAndCounts({ project }: ColumnAndCountsProps): React.JSX.Element {
  const store = useStore();
  const kept = useAppState((s) => s.individualsKept);
  const wait = usePassWait();
  const read = project.individuals?.read;
  const counts = populationCounts(project, kept);
  if (read?.kind !== "read" || counts === null) {
    throw new Error(
      "popnei_web defect: the counts of an individuals file not read were drawn.",
    );
  }
  const noColumn = noColumnQualifiedText(project);
  const shown = countsShown(project, counts, wait);
  const lock = usePopulationsLock();
  return (
    <>
      <Select
        label={COLUMN_LIST_LABEL}
        items={columnItems(read)}
        value={chosenColumnItem(project)}
        {...(noColumn !== null && { description: noColumn })}
        waiting={lock}
        onChange={(id) => {
          const step = columnItemCommand(id);
          store.apply(step.description, step.command);
        }}
      />
      {shown.kind === "counts" && <SummaryLineShown line={shown.summary} />}
      {shown.boxLines.map((line) => (
        <CountsLineShown key={line.text} line={line} />
      ))}
    </>
  );
}

/** The summary line with no individuals file, of the individuals kept,
    all unclassified, and the line of why they wait; nothing before the
    variants file has given its individuals (`noFileCounts`). */
function NoFileCounts(): React.JSX.Element | null {
  const project = useAppState((s) => s.project);
  const kept = useAppState((s) => s.individualsKept);
  const wait = usePassWait();
  const counts = noFileCounts(project, kept, wait);
  if (counts === null) return null;
  return (
    <div className={classOf(styles, "lines")}>
      <SummaryLineShown line={counts.summary} />
      {counts.lines.map((line) => (
        <CountsLineShown key={line.text} line={line} />
      ))}
    </div>
  );
}

/** The summary line, each count that waits drawn "…" and read "not
    counted yet". */
function SummaryLineShown({
  line,
}: {
  readonly line: SummaryLine;
}): React.JSX.Element {
  return (
    <p className={classOf(styles, "line")}>
      {line.map((part, index) => part ?? waitingCount(index))}
    </p>
  );
}
