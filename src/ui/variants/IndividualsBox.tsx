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
 * among them. It ends with the zone that opens an individuals file, its
 * button, a drop or a paste. The individuals per population and the
 * button that removes the file are in the Individuals tab.
 *
 * While an analysis that reads the populations runs, the list and the
 * zone wait, greyed with the reason of the lock of the populations, so
 * that no change leaves the running analysis behind; a file dropped,
 * pasted or picked then opens nothing, and the box shows that it was not
 * opened and what to do where it shows the words of a folder dropped
 * (popgen2-input.md, "While the diversity runs").
 *
 * The lines of the file are in a boundary of errors made again for each
 * file, as those of the variants file are; the zone is outside it, so
 * that the button the user pressed, which holds the focus, is not
 * replaced at each opening, and has a boundary of its own, made again at
 * each turn of the tabs, as the zone of the variants file has. The box
 * holds the words of the last drop or paste it did not open, until the
 * next opening or removal; those of a file refused by the lock, until the
 * lock ends, so that they do not come back at the next run.
 */
import { useId, useState } from "react";

import { populationCounts } from "../../core/populations.ts";
import type { PageTab } from "../../core/popgen2Tabs.ts";
import { escaped, individualsBoxNeeds } from "../../core/project.ts";
import type { IndividualsSource, Project } from "../../core/project.ts";
import { classOf } from "../classOf.ts";
import { useFiles } from "../files.tsx";
import { ErrorBoundary } from "../shell/ErrorBoundary.tsx";
import { useAnnouncer } from "../shell/announcer.tsx";
import { PICKER_ENDINGS } from "../steps/individuals/words.ts";
import type { StepCommand } from "../steps/variants/commands.ts";
import { useAppState, usePopgen2Store, useStore } from "../store.tsx";
import { FileZone } from "../widgets/FileZone.tsx";
import { usePopulationsLock, usePopulationsRunning } from "./filtersLock.ts";
import { Problem } from "../widgets/Problem.tsx";
import { Select } from "../widgets/Select.tsx";
import styles from "./IndividualsBox.module.css";
import {
  CountsLineShown,
  usePassWait,
  waitingCount,
} from "./IndividualsCounts.tsx";
import pageStyles from "./VariantsPage.module.css";
import {
  chosenColumnItem,
  columnItemCommand,
  columnItems,
  openIndividualsCommand,
} from "./individualsCommands.ts";
import {
  COLUMN_LIST_LABEL,
  INDIVIDUALS_BOX_NAME,
  INDIVIDUALS_FOLDER_DROPPED,
  INDIVIDUALS_LINES_NAME,
  INDIVIDUALS_SEVERAL_DROPPED,
  INDIVIDUALS_TEXT_DROPPED,
  OPENING_INDIVIDUALS_ZONE_NAME,
  OPEN_ANOTHER_INDIVIDUALS_FILE,
  OPEN_INDIVIDUALS_FILE,
  PASTE_INDIVIDUALS_FILE,
  countsShown,
  noColumnQualifiedText,
  noFileCounts,
  notOpenedWhileRunningText,
} from "./individualsWords.ts";
import type { SummaryLine } from "./individualsWords.ts";

/** What the box says of a drop, or a paste, that is not of one file. */
const NOT_FILES_WORDS = {
  folder: INDIVIDUALS_FOLDER_DROPPED,
  text: INDIVIDUALS_TEXT_DROPPED,
  several: INDIVIDUALS_SEVERAL_DROPPED,
} as const;

/** A drop or a paste the box did not open, with its words: of something
    that is not one file; or refused by the lock of the populations,
    whose words go with the lock; and the load id of the individuals file
    open when it was refused, or null with none, since an opening or a
    removal takes the words away. */
interface Refusal {
  readonly kind: "notOneFile" | "locked";
  readonly text: string;
  readonly fileId: string | null;
}

/** What the box is drawn with. */
export interface IndividualsBoxProps {
  /** The tab shown, whose turn draws the zone again after a throw. */
  readonly tab: PageTab;
  /** The zone's button, which Remove in the Individuals tab gives the
      focus to. */
  readonly openButton: React.RefObject<HTMLButtonElement | null>;
}

/** The box of the individuals file. */
export function IndividualsBox({
  tab,
  openButton,
}: IndividualsBoxProps): React.JSX.Element {
  const headingId = useId();
  const store = usePopgen2Store();
  const files = useFiles();
  const announcer = useAnnouncer();
  // The last drop or paste not opened, until the next opening or
  // removal, or, refused by the lock, until the lock ends.
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const individuals = useAppState((s) => s.project.individuals);
  const fileId = individuals?.fileId ?? null;
  const lock = usePopulationsLock();
  const running = usePopulationsRunning();
  // The lock ended, or a file was opened or removed, Remove being in the
  // Individuals tab: the words of the refusal go, set while drawing, as
  // React keeps a state that follows another.
  if (
    refusal !== null &&
    ((refusal.kind === "locked" && lock === null) || refusal.fileId !== fileId)
  ) {
    setRefusal(null);
  }

  // An opening and a removal start the history afresh (popgen2-input.md, "What it sends and reads").
  const send = (step: StepCommand): void => {
    store.applyAfresh(step.command);
  };

  const refuse = (kind: Refusal["kind"], text: string): void => {
    setRefusal({ kind, text, fileId });
    // The focus stays where it was, so a screen reader would not read the
    // words by themselves.
    announcer.announce(text);
  };

  const onFiles = (picked: readonly File[]): void => {
    const [file, ...others] = picked;
    if (file === undefined) return;
    if (others.length > 0) {
      refuse("notOneFile", INDIVIDUALS_SEVERAL_DROPPED);
      return;
    }
    // Any file: the reader says what it is from its bytes, not its name.
    setRefusal(null);
    send(openIndividualsCommand(files.addFile(file), file.name));
  };

  return (
    <section aria-labelledby={headingId} className={classOf(pageStyles, "box")}>
      <h2 id={headingId} className={classOf(pageStyles, "boxHeading")}>
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
      {refusal !== null && <Problem>{refusal.text}</Problem>}
      {/* Its own boundary, made again at each turn of the tabs, as the
          zone of the variants file has. */}
      <ErrorBoundary
        key={tab}
        heading={OPENING_INDIVIDUALS_ZONE_NAME}
        level={3}
      >
        <FileZone
          pasteLabel={PASTE_INDIVIDUALS_FILE}
          buttonLabel={
            individuals === null
              ? OPEN_INDIVIDUALS_FILE
              : OPEN_ANOTHER_INDIVIDUALS_FILE
          }
          accept={PICKER_ENDINGS}
          onFiles={onFiles}
          onNotFiles={(dropped) => {
            refuse("notOneFile", NOT_FILES_WORDS[dropped]);
          }}
          buttonRef={openButton}
          waiting={
            lock === null || running === null
              ? null
              : {
                  reason: lock,
                  onRefused: (name) => {
                    if (name === null) {
                      refuse("notOneFile", INDIVIDUALS_SEVERAL_DROPPED);
                    } else {
                      refuse(
                        "locked",
                        notOpenedWhileRunningText(name, running),
                      );
                    }
                  },
                }
          }
        />
      </ErrorBoundary>
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
