/**
 * The box of the individuals file on popgen2.html, beside the box of the
 * variants file, or under it below 720 pixels
 * (docs/specs/steps/popgen2-input.md, "The box of the individuals
 * file"). With no file, nothing before the variants file has given its
 * individuals, and then the counts with one row, "Unclassified"; with a
 * file, its name and, as it is read, refused or read, the words of the
 * read, of the refusal, or the list "Column of the populations" with the
 * individuals the filters keep in each population, or in the one row
 * "Unclassified" when the column classifies nobody, and the lines under
 * them. The counts have no caption on the screen and no menu
 * "Download…", as the owner asked on 11 October 2026, so that the box,
 * which stands above every tab, stays small. It ends with the zone that
 * opens an individuals file, its button, a drop or a paste, and with a
 * file the button that removes it.
 *
 * The lines of the file are in a boundary of errors made again for each
 * file, as those of the variants file are; the zone is outside it, so
 * that the button the user pressed, which holds the focus, is not
 * replaced at each opening, and has a boundary of its own, made again at
 * each turn of the tabs, as the zone of the variants file has. The box
 * holds the words of the last drop or paste it did not open, until the
 * next opening.
 */
import { useId, useRef, useState, useSyncExternalStore } from "react";

import { populationCounts } from "../../core/populations.ts";
import type { PageTab } from "../../core/popgen2Tabs.ts";
import { escaped, individualsBoxNeeds } from "../../core/project.ts";
import type { IndividualsSource, Project } from "../../core/project.ts";
import type { AutoRuns } from "../autoRuns.ts";
import { classOf } from "../classOf.ts";
import { useFiles } from "../files.tsx";
import { ErrorBoundary } from "../shell/ErrorBoundary.tsx";
import { useAnnouncer } from "../shell/announcer.tsx";
import { PICKER_ENDINGS } from "../steps/individuals/words.ts";
import type { StepCommand } from "../steps/variants/commands.ts";
import { useAppState, usePopgen2Store, useStore } from "../store.tsx";
import { Button } from "../widgets/Button.tsx";
import { FileZone } from "../widgets/FileZone.tsx";
import { Problem } from "../widgets/Problem.tsx";
import { Select } from "../widgets/Select.tsx";
import { Table } from "../widgets/Table.tsx";
import { VISUALLY_HIDDEN } from "../widgets/visuallyHidden.ts";
import type { TableRow } from "../widgets/Table.tsx";
import { Warning } from "../widgets/Warning.tsx";
import styles from "./IndividualsBox.module.css";
import pageStyles from "./VariantsPage.module.css";
import {
  REMOVE_INDIVIDUALS_COMMAND,
  chosenColumnItem,
  columnItemCommand,
  columnItems,
  openIndividualsCommand,
} from "./individualsCommands.ts";
import {
  COLUMN_LIST_LABEL,
  INDIVIDUALS_BOX_NAME,
  INDIVIDUALS_FOLDER_DROPPED,
  INDIVIDUALS_HEADER,
  INDIVIDUALS_LINES_NAME,
  INDIVIDUALS_SEVERAL_DROPPED,
  INDIVIDUALS_TEXT_DROPPED,
  NOT_COUNTED_YET,
  OPENING_INDIVIDUALS_ZONE_NAME,
  OPEN_ANOTHER_INDIVIDUALS_FILE,
  OPEN_INDIVIDUALS_FILE,
  PASTE_INDIVIDUALS_FILE,
  POPULATION_HEADER,
  WAITING_COUNT,
  countText,
  countsCaption,
  countsShown,
  UNCLASSIFIED_ROW,
  noColumnQualifiedText,
  noFileCounts,
  passWaitOf,
  removeLabel,
} from "./individualsWords.ts";
import type { CountsLine, PassWait } from "./individualsWords.ts";

/** What the box says of a drop, or a paste, that is not of one file. */
const NOT_FILES_WORDS = {
  folder: INDIVIDUALS_FOLDER_DROPPED,
  text: INDIVIDUALS_TEXT_DROPPED,
  several: INDIVIDUALS_SEVERAL_DROPPED,
} as const;

/** The columns of the table of the counts. */
const COUNT_COLUMNS = [
  { id: "population", label: POPULATION_HEADER, isRowHeader: true },
  { id: "individuals", label: INDIVIDUALS_HEADER, isNumeric: true },
] as const;

/** What the box is drawn with. */
export interface IndividualsBoxProps {
  /** The analyses the page starts by itself, which tell a pass stopped
      from one about to start. */
  readonly autoRuns: AutoRuns;
  /** The tab shown, whose turn draws the zone again after a throw. */
  readonly tab: PageTab;
}

/** The box of the individuals file. */
export function IndividualsBox({
  autoRuns,
  tab,
}: IndividualsBoxProps): React.JSX.Element {
  const headingId = useId();
  const store = usePopgen2Store();
  const files = useFiles();
  const announcer = useAnnouncer();
  const openButton = useRef<HTMLButtonElement>(null);
  // The words of the last drop or paste not opened, until the next
  // opening or removal.
  const [refusal, setRefusal] = useState<string | null>(null);
  const individuals = useAppState((s) => s.project.individuals);

  // An opening and a removal start the history afresh (popgen2-input.md, "What it sends and reads").
  const send = (step: StepCommand): void => {
    store.applyAfresh(step.command);
  };

  const refuse = (text: string): void => {
    setRefusal(text);
    // The focus stays where it was, so a screen reader would not read the
    // words by themselves.
    announcer.announce(text);
  };

  const onFiles = (picked: readonly File[]): void => {
    const [file, ...others] = picked;
    if (file === undefined) return;
    if (others.length > 0) {
      refuse(INDIVIDUALS_SEVERAL_DROPPED);
      return;
    }
    // Any file: the reader says what it is from its bytes, not its name.
    setRefusal(null);
    send(openIndividualsCommand(files.addFile(file), file.name));
  };

  const remove = (): void => {
    setRefusal(null);
    send(REMOVE_INDIVIDUALS_COMMAND);
    // Remove goes with the file; the zone's button stays.
    openButton.current?.focus();
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
        <FileLines individuals={individuals} autoRuns={autoRuns} />
      </ErrorBoundary>
      {refusal !== null && <Problem>{refusal}</Problem>}
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
            refuse(NOT_FILES_WORDS[dropped]);
          }}
          buttonRef={openButton}
          actions={
            individuals !== null && (
              <Button label={removeLabel(individuals.name)} onPress={remove} />
            )
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
  /** The analyses the page starts by itself. */
  readonly autoRuns: AutoRuns;
}

/** The lines of the file: with no file, the counts of the unclassified;
    or its name and its read, refusal, or list and counts. */
function FileLines({
  individuals,
  autoRuns,
}: FileLinesProps): React.JSX.Element | null {
  if (individuals === null) return <NoFileCounts autoRuns={autoRuns} />;
  return (
    <div className={classOf(styles, "lines")}>
      <p className={classOf(styles, "fileName")}>{escaped(individuals.name)}</p>
      <ReadLines individuals={individuals} autoRuns={autoRuns} />
    </div>
  );
}

/** The lines of the read of `individuals`: being read, refused, or the
    list and the counts. */
function ReadLines({
  individuals,
  autoRuns,
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
      return <ColumnAndCounts project={project} autoRuns={autoRuns} />;
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

/** What the list and the counts are drawn with. */
interface ColumnAndCountsProps {
  /** The project, whose individuals file is read. */
  readonly project: Project;
  /** The analyses the page starts by itself. */
  readonly autoRuns: AutoRuns;
}

/** The list "Column of the populations", with the line of no column
    chosen under it, and the counts with their lines. */
function ColumnAndCounts({
  project,
  autoRuns,
}: ColumnAndCountsProps): React.JSX.Element {
  const store = useStore();
  const kept = useAppState((s) => s.individualsKept);
  const wait = usePassWait(autoRuns);
  const read = project.individuals?.read;
  const counts = populationCounts(project, kept);
  if (read?.kind !== "read" || counts === null) {
    throw new Error(
      "popnei_web defect: the counts of an individuals file not read were drawn.",
    );
  }
  const noColumn = noColumnQualifiedText(project);
  const shown = countsShown(project, counts, wait);
  return (
    <>
      <Select
        label={COLUMN_LIST_LABEL}
        items={columnItems(read)}
        value={chosenColumnItem(project)}
        {...(noColumn !== null && { description: noColumn })}
        onChange={(id) => {
          const step = columnItemCommand(id);
          store.apply(step.description, step.command);
        }}
      />
      {shown.table !== "none" && project.variants !== null && (
        <CountsTable
          variantsName={project.variants.name}
          rows={
            shown.table === "populations"
              ? counts.populations.map(({ pop, kept: numKept }) => ({
                  id: pop,
                  cells: [escaped(pop), countCell(numKept)],
                }))
              : [
                  unclassifiedRow(
                    counts.known ? (counts.unclassified?.kept ?? null) : null,
                  ),
                ]
          }
        />
      )}
      {shown.lines.map((line) => (
        <CountsLineShown key={line.text} line={line} />
      ))}
    </>
  );
}

/** The counts with no individuals file: one row, "Unclassified", with
    the individuals kept, and the line of why they wait; nothing before
    the variants file has given its individuals (`noFileCounts`). */
function NoFileCounts({
  autoRuns,
}: {
  readonly autoRuns: AutoRuns;
}): React.JSX.Element | null {
  const project = useAppState((s) => s.project);
  const kept = useAppState((s) => s.individualsKept);
  const wait = usePassWait(autoRuns);
  const counts = noFileCounts(project, kept, wait);
  if (counts === null || project.variants === null) return null;
  return (
    <div className={classOf(styles, "lines")}>
      <CountsTable
        variantsName={project.variants.name}
        rows={[unclassifiedRow(counts.kept)]}
      />
      {counts.lines.map((line) => (
        <CountsLineShown key={line.text} line={line} />
      ))}
    </div>
  );
}

/** What the table of the counts is drawn with. */
interface CountsTableProps {
  /** The name of the variants file, which names the table. */
  readonly variantsName: string;
  /** A row per population, or the one row of the unclassified. */
  readonly rows: readonly TableRow[];
}

/** The table of the counts, with no menu "Download…" and with its caption
    hidden from the screen and kept as its name for a screen reader: the
    owner took both out of the box on 11 October 2026. */
function CountsTable({
  variantsName,
  rows,
}: CountsTableProps): React.JSX.Element {
  return (
    <Table
      caption={countsCaption(variantsName)}
      captionHidden
      columns={COUNT_COLUMNS}
      rows={rows}
    />
  );
}

/** The one row of the counts, "Unclassified", of every individual kept,
    `kept`, or null while the count waits. */
function unclassifiedRow(kept: number | null): TableRow {
  return { id: UNCLASSIFIED_ROW, cells: [UNCLASSIFIED_ROW, countCell(kept)] };
}

/** A count of the table: its number, or "…" while it is not known, read
    as "not counted yet". */
function countCell(kept: number | null): string | React.JSX.Element {
  if (kept !== null) return countText(kept);
  return (
    <span>
      <span aria-hidden="true">{WAITING_COUNT}</span>
      <span className={VISUALLY_HIDDEN}>{NOT_COUNTED_YET}</span>
    </span>
  );
}

/** A line under the list: words, or a warning. */
function CountsLineShown({
  line,
}: {
  readonly line: CountsLine;
}): React.JSX.Element {
  return (
    <p className={classOf(styles, "line")}>
      {line.kind === "warning" ? <Warning>{line.text}</Warning> : line.text}
    </p>
  );
}

/** Why the counts wait for the one pass, a primitive, so that a progress
    of the pass, which changes the statuses and not the answer, draws the
    box no more; and read again when the analyses the page starts by
    itself tell a Stop. */
function usePassWait(autoRuns: AutoRuns): PassWait {
  useSyncExternalStore(autoRuns.subscribe, autoRuns.getVersion);
  return useAppState((s) => passWaitOf(s, (key) => autoRuns.startedUnder(key)));
}
