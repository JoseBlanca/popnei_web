/**
 * The Individuals step (docs/specs/steps/individuals.md): the user picks
 * the metadata file, a CSV or a TSV, sees how it was read and can change
 * it, sees its columns with the types the reader inferred, chooses the
 * column that defines the populations, and learns whether every
 * individual of the variants file is in it. The step reads the project
 * from the store and sends it commands; what it holds itself is the
 * message of a file it did not load.
 */
import { useId, useRef, useState } from "react";

import {
  populationsNeeds,
  populationsToRun,
} from "../../../core/analyses/diversity.ts";
import {
  escaped,
  individualsCheck,
  individualsNeeds,
} from "../../../core/project.ts";
import type {
  IndividualsCheck,
  IndividualsSource,
} from "../../../core/project.ts";
import type {
  ColumnType,
  CsvFound,
  CsvOptions,
  IndividualsTable,
} from "../../../worker/protocol.ts";
import {
  columnWarningText,
  columnWarnings,
} from "../../../worker/individuals/columnTypes.ts";
import { classOf } from "../../classOf.ts";
import { useFiles } from "../../files.tsx";
import { useAnnouncer } from "../../shell/announcer.tsx";
import { useAppState, useStore } from "../../store.tsx";
import { Button } from "../../widgets/Button.tsx";
import { Disclosure } from "../../widgets/Disclosure.tsx";
import { FileZone } from "../../widgets/FileZone.tsx";
import { Problem } from "../../widgets/Problem.tsx";
import { Select } from "../../widgets/Select.tsx";
import type { StepCommand } from "../variants/commands.ts";
import {
  REMOVE_COMMAND,
  csvOptionCommand,
  groupingCommand,
  pickCommand,
} from "./commands.ts";
import styles from "./IndividualsStep.module.css";
import {
  NOT_CHECKED_YET,
  NO_FILE,
  OPTIONS_HELP,
  PICKER_ENDINGS,
  SEVERAL_DROPPED,
  TYPES_LINE,
  UTF16_TEXT,
  allFoundText,
  decimalItems,
  detectedText,
  encodingItems,
  excelText,
  firstValuesText,
  kindOfName,
  loadAgainText,
  missingLabel,
  noPopulationLine,
  otherNameText,
  populationLine,
  separatorItems,
  sizeText,
  typeText,
} from "./words.ts";
import type { PopulationLine } from "./words.ts";

/** The line under the column of the populations. */
const COLUMN_DESCRIPTION =
  "Any column can define the populations, whatever its type.";

/** The Individuals step, in the `<main>` of the shell. */
export function IndividualsStep(): React.JSX.Element {
  const store = useStore();
  const files = useFiles();
  const announcer = useAnnouncer();
  const individuals = useAppState((s) => s.project.individuals);
  const reason = useAppState((s) => individualsNeeds(s.project));

  // The message of a file not loaded, until the next pick.
  const [message, setMessage] = useState<string | null>(null);
  const fileButton = useRef<HTMLButtonElement>(null);
  const fileHeading = useId();
  const optionsHeading = useId();

  const send = (step: StepCommand): void => {
    store.apply(step.description, step.command);
  };

  const refuse = (text: string): void => {
    setMessage(text);
    // The focus stays on the button, so a screen reader would not read
    // the message by itself.
    announcer.announce(text);
  };

  const onFiles = (picked: readonly File[]): void => {
    const [file, ...others] = picked;
    if (file === undefined) return;
    if (others.length > 0) {
      refuse(SEVERAL_DROPPED);
      return;
    }
    switch (kindOfName(file.name)) {
      case "excel":
        refuse(excelText(file.name));
        return;
      case "other":
        refuse(otherNameText(file.name));
        return;
      case "text":
        break;
    }
    setMessage(null);
    const fileId = files.addFile(file);
    send(pickCommand(fileId, file.name));
  };

  const remove = (): void => {
    send(REMOVE_COMMAND);
    // Remove goes with the file; the file button is in every state.
    fileButton.current?.focus();
  };

  const read = individuals?.read ?? null;
  // The options of the reader, `null` with no file or with an xlsx.
  const csv = individuals?.csv ?? null;

  return (
    <div className={classOf(styles, "step")}>
      {/* It takes the focus when the step changes and after Close of the
          error bar, and is not in the order of the Tab key. */}
      <h1 tabIndex={-1}>Individuals</h1>

      <div className={classOf(styles, "top")}>
        <section
          aria-labelledby={fileHeading}
          className={classOf(styles, "section")}
        >
          <h2 id={fileHeading} className={classOf(styles, "heading")}>
            Metadata file
          </h2>
          <FileZone
            pasteLabel="Paste a metadata file"
            buttonLabel={
              individuals === null
                ? "Choose a metadata file…"
                : `Replace ${escaped(individuals.name)}…`
            }
            accept={PICKER_ENDINGS}
            onFiles={onFiles}
            buttonRef={fileButton}
            actions={
              individuals !== null && (
                <Button
                  label={`Remove ${escaped(individuals.name)}`}
                  onPress={remove}
                />
              )
            }
          >
            {individuals === null ? (
              <p className={classOf(styles, "muted")}>{NO_FILE}</p>
            ) : (
              <FileCard individuals={individuals} reason={reason} />
            )}
          </FileZone>
          {message !== null && <Problem>{message}</Problem>}
        </section>

        {individuals !== null && csv !== null && (
          <section
            aria-labelledby={optionsHeading}
            className={classOf(styles, "section")}
          >
            <h2 id={optionsHeading} className={classOf(styles, "heading")}>
              How the file is read
            </h2>
            {files.fileOf(individuals.fileId) === null ? (
              <p className={classOf(styles, "line")}>
                {loadAgainText(individuals.name)}
              </p>
            ) : (
              <ReadOptions
                name={individuals.name}
                csv={csv}
                found={read?.kind === "read" ? read.found : null}
                send={send}
              />
            )}
          </section>
        )}
      </div>

      {individuals !== null && read?.kind === "read" && (
        <>
          <Columns
            table={read.table}
            columns={read.columns}
            decimal={read.found?.decimal ?? "."}
          />
          <Populations
            individuals={individuals}
            table={read.table}
            reason={reason}
            send={send}
          />
        </>
      )}
    </div>
  );
}

/** What the card of a loaded file is drawn with. */
interface FileCardProps {
  /** The metadata file of the project. */
  readonly individuals: IndividualsSource;
  /** The reason `individualsNeeds` gives, for a file being read or
      refused. */
  readonly reason: string | null;
}

/** The card of the loaded file: its name, and its size once read, or
    why it is not. */
function FileCard({ individuals, reason }: FileCardProps): React.JSX.Element {
  const read = individuals.read;
  return (
    <div className={classOf(styles, "card")}>
      <p className={classOf(styles, "fileName")}>{escaped(individuals.name)}</p>
      {read.kind === "read" ? (
        <p className={classOf(styles, "muted")}>{sizeText(read.table)}</p>
      ) : read.kind === "pending" ? (
        <p className={classOf(styles, "line")}>
          {reasonOf(individuals, reason)}
        </p>
      ) : (
        <Problem>{reasonOf(individuals, reason)}</Problem>
      )}
    </div>
  );
}

/** The reason of a file being read or refused, which `individualsNeeds`
    always gives. */
function reasonOf(
  individuals: IndividualsSource,
  reason: string | null,
): string {
  if (reason === null) {
    throw new Error(
      `popnei_web defect: individualsNeeds gave no reason for the metadata file ${individuals.fileId}, ${individuals.read.kind}.`,
    );
  }
  return reason;
}

/** What the three options of the reader are drawn with. */
interface ReadOptionsProps {
  /** The name of the file. */
  readonly name: string;
  /** How it is read now. */
  readonly csv: CsvOptions;
  /** What the last read used, `null` while it is under way or after a
      refusal. */
  readonly found: CsvFound | null;
  /** Sends a command to the store. */
  readonly send: (step: StepCommand) => void;
}

/** The encoding, the separator and the decimal mark, each with the way to
    change it, and the lines that say when to. */
function ReadOptions({
  name,
  csv,
  found,
  send,
}: ReadOptionsProps): React.JSX.Element {
  return (
    <>
      {found?.encoding === "utf-16" ? (
        <p className={classOf(styles, "line")}>{UTF16_TEXT}</p>
      ) : (
        <Select
          label="Encoding"
          items={encodingItems(detectedText("encoding", csv, found))}
          value={csv.encoding}
          onChange={(encoding) => {
            send(csvOptionCommand("encoding", name, { ...csv, encoding }));
          }}
        />
      )}
      <Select
        label="Separator"
        items={separatorItems(detectedText("separator", csv, found))}
        value={csv.separator}
        onChange={(separator) => {
          send(csvOptionCommand("separator", name, { ...csv, separator }));
        }}
      />
      <Select
        label="Decimal mark"
        items={decimalItems(detectedText("decimal", csv, found))}
        value={csv.decimal}
        onChange={(decimal) => {
          send(csvOptionCommand("decimal", name, { ...csv, decimal }));
        }}
      />
      <p className={classOf(styles, "muted")}>{OPTIONS_HELP}</p>
    </>
  );
}

/** What the table of the columns is drawn with. */
interface ColumnsProps {
  /** The table read. */
  readonly table: IndividualsTable;
  /** The type of each of its columns. */
  readonly columns: readonly ColumnType[];
  /** The decimal mark it was read with. */
  readonly decimal: "." | ",";
}

/** The columns of the file, one row each: its name, its type with the
    warning of a column of a few whole numbers, and its first values. A
    native table, which the Tab key does not enter. */
function Columns({ table, columns, decimal }: ColumnsProps): React.JSX.Element {
  const heading = useId();
  const warnings = new Map(
    columnWarnings(table, columns, decimal).map((w) => [w.column, w]),
  );
  return (
    <section aria-labelledby={heading} className={classOf(styles, "section")}>
      <h2 id={heading} className={classOf(styles, "heading")}>
        Columns
      </h2>
      <p className={classOf(styles, "muted")}>{TYPES_LINE}</p>
      <table aria-labelledby={heading} className={classOf(styles, "table")}>
        <colgroup>
          <col className={classOf(styles, "nameColumn")} />
          <col className={classOf(styles, "typeColumn")} />
          <col className={classOf(styles, "valuesColumn")} />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className={classOf(styles, "nameCell")}>
              Column
            </th>
            <th scope="col" className={classOf(styles, "nameCell")}>
              Type
            </th>
            <th scope="col" className={classOf(styles, "nameCell")}>
              First values
            </th>
          </tr>
        </thead>
        <tbody>
          {table.columns.map((name, index) => {
            const type = columns[index];
            if (type === undefined) {
              throw new Error(
                `popnei_web defect: the column ${String(index)} of the table has no type.`,
              );
            }
            const warning = warnings.get(name);
            return (
              <tr key={name}>
                <th scope="row" className={classOf(styles, "nameCell")}>
                  {escaped(name)}
                </th>
                <td className={classOf(styles, "cell")}>
                  {typeText(type)}
                  {warning !== undefined && (
                    <span className={classOf(styles, "warning")}>
                      <WarningIcon />
                      <span>Warning: {columnWarningText(warning)}</span>
                    </span>
                  )}
                </td>
                <td className={classOf(styles, "cell")}>
                  {firstValuesText(table, index)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

/** What the part of the populations is drawn with. */
interface PopulationsProps {
  /** The metadata file, read. */
  readonly individuals: IndividualsSource;
  /** Its table. */
  readonly table: IndividualsTable;
  /** The reason `individualsNeeds` gives, which names the individuals
      missing. */
  readonly reason: string | null;
  /** Sends a command to the store. */
  readonly send: (step: StepCommand) => void;
}

/** The column that defines the populations, the check of the
    individuals of the variants file, and the populations. */
function Populations({
  individuals,
  table,
  reason,
  send,
}: PopulationsProps): React.JSX.Element {
  const heading = useId();
  const grouping = useAppState((s) => s.project.grouping);
  const variants = useAppState((s) => s.project.variants);
  const check = useAppState((s) => individualsCheck(s.project));
  const toRun = useAppState((s) => populationsToRun(s.project));
  // Two primitives, since populationsNeeds gives a new object each call.
  // The reason of no column chosen is the placeholder of the select.
  const columnReason = useAppState((s) => {
    const need = populationsNeeds(s.project);
    return need === null || need.kind === "noColumn" ? null : need.reason;
  });

  const choosable = table.columns.slice(1);
  const column = grouping.kind === "populations" ? grouping.column : null;
  const chosen = column !== null && choosable.includes(column) ? column : null;

  return (
    <section aria-labelledby={heading} className={classOf(styles, "section")}>
      <h2 id={heading} className={classOf(styles, "heading")}>
        Populations
      </h2>
      <Select
        label="Column that defines the populations"
        items={choosable.map((name) => ({ id: name, label: escaped(name) }))}
        value={chosen}
        placeholder="Choose a column"
        description={COLUMN_DESCRIPTION}
        {...(columnReason !== null && { problem: columnReason })}
        onChange={(name) => {
          send(groupingCommand(name));
        }}
      />
      <Check
        individuals={individuals}
        check={check}
        variantsName={variants?.name ?? null}
        reason={reason}
      />
      {check !== null && check.missing.length === 0 && toRun !== null && (
        <PopulationList
          lines={[
            ...toRun.map(([pop, members]) =>
              populationLine(pop, members.length),
            ),
            ...unassignedLines(check, toRun),
          ]}
        />
      )}
    </section>
  );
}

/** The line of the individuals found in no population, when there are
    any: those found less those of the populations. */
function unassignedLines(
  check: IndividualsCheck,
  toRun: readonly (readonly [string, readonly string[]])[],
): PopulationLine[] {
  const inPopulations = toRun.reduce(
    (sum, [, members]) => sum + members.length,
    0,
  );
  const left = check.found - inPopulations;
  return left > 0 ? [noPopulationLine(left)] : [];
}

/** What the check is drawn with. */
interface CheckProps {
  /** The metadata file, read. */
  readonly individuals: IndividualsSource;
  /** The check, `null` while the variants file is not read. */
  readonly check: IndividualsCheck | null;
  /** The name of the variants file, `null` with none. */
  readonly variantsName: string | null;
  /** The reason `individualsNeeds` gives. */
  readonly reason: string | null;
}

/** Whether every individual of the variants file is in the metadata
    file: not yet, all of them, or the error with the list of those
    missing. */
function Check({
  individuals,
  check,
  variantsName,
  reason,
}: CheckProps): React.JSX.Element {
  if (check === null || variantsName === null) {
    return <p className={classOf(styles, "line")}>{NOT_CHECKED_YET}</p>;
  }
  if (check.missing.length === 0) {
    return (
      <p className={classOf(styles, "line")}>
        {allFoundText(check, variantsName)}
      </p>
    );
  }
  return (
    <div className={classOf(styles, "missing")}>
      <Problem>{reasonOf(individuals, reason)}</Problem>
      <Disclosure label={missingLabel(check.missing.length)}>
        <ul className={classOf(styles, "names")}>
          {check.missing.map((name) => (
            <li key={name}>{escaped(name)}</li>
          ))}
        </ul>
      </Disclosure>
    </div>
  );
}

/** The populations, each with its number of individuals of the variants
    file, shown "P1 · 48" and read "P1, 48 individuals". */
function PopulationList({
  lines,
}: {
  readonly lines: readonly PopulationLine[];
}): React.JSX.Element {
  return (
    <ul className={classOf(styles, "populations")}>
      {lines.map((line) => (
        <li key={line.read}>
          <span aria-hidden="true">{line.shown}</span>
          <span className={classOf(styles, "visuallyHidden")}>{line.read}</span>
        </li>
      ))}
    </ul>
  );
}

/** The mark of a warning, beside its words, which say it too. */
function WarningIcon(): React.JSX.Element {
  return (
    <svg
      className={classOf(styles, "icon")}
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
      <path d="M8 1.5 15 14.5H1Z" />
      <line x1="8" y1="6" x2="8" y2="10" />
      <line x1="8" y1="12.2" x2="8" y2="12.5" />
    </svg>
  );
}
