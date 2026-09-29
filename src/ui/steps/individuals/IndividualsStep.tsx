/**
 * The Individuals step (docs/specs/steps/individuals.md): the user picks
 * the metadata file, a CSV or a TSV, or goes on without one, every
 * individual then in one population; sees how it was read and can change
 * it, sees its columns and sets their types and the coding of a binary
 * column, forgets the types set that a read does not apply, chooses the
 * column that defines the populations or all individuals in one
 * population, and learns whether every individual of the variants file
 * is in it, copying the names of those missing. The step reads the project
 * from the store and sends it commands; what it holds itself is the
 * message of a file it did not load.
 */
import { useId, useRef, useState } from "react";

import {
  columnAllows,
  columnWarningsOf,
  escaped,
  individualsCheck,
  individualsStepMissing,
  individualsStepNeeds,
  populationsNeeds,
  populationsToRun,
  typesLost,
} from "../../../core/project.ts";
import type {
  ColumnAllows,
  IndividualsCheck,
  IndividualsSource,
  TableRead,
} from "../../../core/project.ts";
import type {
  ColumnType,
  CsvFound,
  CsvOptions,
  IndividualsTable,
} from "../../../worker/protocol.ts";
import { columnWarningText } from "../../../worker/individuals/columnTypes.ts";
import { classOf } from "../../classOf.ts";
import { useFiles } from "../../files.tsx";
import { useAnnouncer } from "../../shell/announcer.tsx";
import { useAppState, useStore } from "../../store.tsx";
import { Button } from "../../widgets/Button.tsx";
import { Disclosure } from "../../widgets/Disclosure.tsx";
import { FileZone } from "../../widgets/FileZone.tsx";
import { Problem } from "../../widgets/Problem.tsx";
import { Select } from "../../widgets/Select.tsx";
import { Warning } from "../../widgets/Warning.tsx";
import type { StepCommand } from "../variants/commands.ts";
import {
  FORGET_TYPES_COMMAND,
  REMOVE_COMMAND,
  codingCommand,
  csvOptionCommand,
  pickCommand,
  populationItemCommand,
  typeCommand,
} from "./commands.ts";
import styles from "./IndividualsStep.module.css";
import {
  CODING_LABEL,
  FOLDER_DROPPED,
  NOT_CHECKED_YET,
  NOT_COPIED,
  NO_FILE,
  OPTIONS_HELP,
  PICKER_ENDINGS,
  POPULATIONS_HELP,
  SEVERAL_DROPPED,
  TEXT_DROPPED,
  TYPES_LINE,
  UTF16_TEXT,
  allFoundText,
  checkHeading,
  chosenPopulationItem,
  codedZeroText,
  codingItems,
  codingLabelEnd,
  copiedNames,
  copiedText,
  copyLabel,
  decimalItems,
  detectedText,
  encodingItems,
  excelText,
  firstValuesText,
  forgetLabel,
  kindOfName,
  loadAgainText,
  missingLabel,
  noPopulationLine,
  otherNameText,
  populationItems,
  populationLine,
  separatorItems,
  sizeText,
  typeItems,
  typeLabel,
  typeOfItem,
  typeWords,
  typesLostWords,
  undecodedText,
  variantsNameText,
} from "./words.ts";
import type { PopulationLine } from "./words.ts";

/** What the step says of a drop, or a paste, that is not of one file. */
const NOT_FILES_WORDS = {
  folder: FOLDER_DROPPED,
  text: TEXT_DROPPED,
  several: SEVERAL_DROPPED,
} as const;

/** The Individuals step, in the `<main>` of the shell. */
export function IndividualsStep(): React.JSX.Element {
  const store = useStore();
  const files = useFiles();
  const announcer = useAnnouncer();
  const individuals = useAppState((s) => s.project.individuals);
  const app = useAppState((s) => s.project.app);
  const missingReason = useAppState((s) => individualsStepMissing(s.project));
  const readReason = useAppState((s) => individualsStepNeeds(s.project));

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
      case "variants":
        refuse(variantsNameText(file.name, app));
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
  const found = read?.kind === "read" ? read.found : null;

  // The load whose file starts with the mark of UTF-16, as a read of it
  // found. The mark does not change with the options, so the line that
  // says it stays while a read of other options is under way, when there
  // is no `found`, rather than the encoding coming back for a second. It
  // is what an earlier drawing saw, kept as React keeps such a value: set
  // while drawing, for the load it belongs to.
  const [utf16Load, setUtf16Load] = useState<string | null>(null);
  const fileId = individuals?.fileId ?? null;
  if (found?.encoding === "utf-16" && fileId !== null && utf16Load !== fileId) {
    setUtf16Load(fileId);
  }
  const isUtf16 =
    found !== null ? found.encoding === "utf-16" : utf16Load === fileId;

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
            onNotFiles={(dropped) => {
              refuse(NOT_FILES_WORDS[dropped]);
            }}
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
              <FileCard individuals={individuals} reason={readReason} />
            )}
          </FileZone>
          {message !== null && <Problem>{message}</Problem>}
        </section>

        {/* A file notGiven is loaded again rather than read with other
            options, so it has none. */}
        {individuals !== null && csv !== null && read?.kind !== "notGiven" && (
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
                found={found}
                isUtf16={isUtf16}
                send={send}
              />
            )}
          </section>
        )}
      </div>

      {individuals !== null && read?.kind === "read" && (
        <>
          <Columns
            source={individuals}
            read={read}
            send={send}
            fileButton={fileButton}
          />
          <CheckSection individuals={individuals} reason={missingReason} />
          <Populations table={read.table} send={send} />
        </>
      )}
    </div>
  );
}

/** What the card of a loaded file is drawn with. */
interface FileCardProps {
  /** The metadata file of the project. */
  readonly individuals: IndividualsSource;
  /** The reason `individualsStepNeeds` gives, for a file being read or
      refused. */
  readonly reason: string | null;
}

/** The card of the loaded file: its name, and its size once read, with
    the warning of a character not decoded, or why it is not read. */
function FileCard({ individuals, reason }: FileCardProps): React.JSX.Element {
  const read = individuals.read;
  const undecodedLine =
    read.kind === "read" ? (read.found?.undecodedLine ?? null) : null;
  return (
    <div className={classOf(styles, "card")}>
      <p className={classOf(styles, "fileName")}>{escaped(individuals.name)}</p>
      {read.kind === "read" ? (
        <>
          <p className={classOf(styles, "muted")}>{sizeText(read.table)}</p>
          {read.found !== null && undecodedLine !== null && (
            <p className={classOf(styles, "line")}>
              <Warning>
                {undecodedText(individuals.name, read.found, undecodedLine)}
              </Warning>
            </p>
          )}
        </>
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

/** The reason of a file being read or refused, or of individuals missing,
    which `individualsStepNeeds` and `individualsStepMissing` always
    give. */
function reasonOf(
  individuals: IndividualsSource,
  reason: string | null,
): string {
  if (reason === null) {
    throw new Error(
      `popnei_web defect: core gave no reason for the metadata file ${individuals.fileId}, ${individuals.read.kind}.`,
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
  /** Whether the file starts with the mark of UTF-16, which no encoding
      changes. */
  readonly isUtf16: boolean;
  /** Sends a command to the store. */
  readonly send: (step: StepCommand) => void;
}

/** The encoding, the separator and the decimal mark, each with the way to
    change it, and the lines that say when to. */
function ReadOptions({
  name,
  csv,
  found,
  isUtf16,
  send,
}: ReadOptionsProps): React.JSX.Element {
  return (
    <>
      {isUtf16 ? (
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
  /** The metadata file, whose read is `read`. */
  readonly source: IndividualsSource;
  /** Its read, with the table. */
  readonly read: TableRead;
  /** Sends a command to the store. */
  readonly send: (step: StepCommand) => void;
  /** The file button, which takes the focus after the types are
      forgotten when the table has no select of a type. */
  readonly fileButton: React.RefObject<HTMLButtonElement | null>;
}

/** The columns of the file, one row each: its name, the select of its
    type, and of the value coded 1 of a binary column, with the warning
    of a column of a few whole numbers, and its first values; above them,
    the warning of the types set that the read does not apply, with the
    button that forgets them. The table of HTML and not a grid, so that
    the Tab key stops at each select in it (the spec, "Accessibility"). */
function Columns({
  source,
  read,
  send,
  fileButton,
}: ColumnsProps): React.JSX.Element {
  const heading = useId();
  // The select of the type of the first column that has one, the second.
  const firstType = useRef<HTMLButtonElement>(null);
  const { table, columns } = read;
  const allows = columnAllows(read);
  const warnings = new Map(columnWarningsOf(read).map((w) => [w.column, w]));
  const lost = typesLost(source);
  const lostWords = typesLostWords(source.name, read, lost);

  const forget = (): void => {
    send(FORGET_TYPES_COMMAND);
    // The warning goes with its button; the table stays as it is, since
    // only types not applied are forgotten.
    (firstType.current ?? fileButton.current)?.focus();
  };

  return (
    <section aria-labelledby={heading} className={classOf(styles, "section")}>
      <h2 id={heading} className={classOf(styles, "heading")}>
        Columns
      </h2>
      <p className={classOf(styles, "muted")}>{TYPES_LINE}</p>
      {lostWords !== null && (
        <div className={classOf(styles, "typesLost")}>
          {lostWords.kind === "one" ? (
            <p className={classOf(styles, "line")}>
              <Warning>{lostWords.text}</Warning>
            </p>
          ) : (
            <div className={classOf(styles, "lostWords")}>
              <p className={classOf(styles, "line")}>
                <Warning>{lostWords.opening}</Warning>
              </p>
              <ul className={classOf(styles, "lostList")}>
                {lostWords.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <p className={classOf(styles, "line")}>{lostWords.closing}</p>
            </div>
          )}
          <Button label={forgetLabel(lost.length)} onPress={forget} />
        </div>
      )}
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
            const allowed = allows[index];
            if (allowed === undefined) {
              throw new Error(
                `popnei_web defect: the column ${String(index)} of the table has no types allowed.`,
              );
            }
            return (
              <tr key={name}>
                <th scope="row" className={classOf(styles, "nameCell")}>
                  <span className={classOf(styles, "cellText")}>
                    {escaped(name)}
                  </span>
                </th>
                <td className={classOf(styles, "cell")}>
                  {index === 0 ? (
                    // The names of the individuals, whose type cannot be
                    // changed.
                    typeWords(type)
                  ) : type.kind === "identifier" ? (
                    identifierDefect(name)
                  ) : (
                    <TypeSelects
                      column={name}
                      type={type}
                      allowed={allowed}
                      send={send}
                      {...(index === 1 && { buttonRef: firstType })}
                    />
                  )}
                  {warning !== undefined && (
                    <span className={classOf(styles, "columnWarning")}>
                      <Warning>
                        {columnWarningText({
                          ...warning,
                          column: escaped(warning.column),
                        })}
                      </Warning>
                    </span>
                  )}
                </td>
                <td className={classOf(styles, "valuesCell")}>
                  <span className={classOf(styles, "cellText")}>
                    {firstValuesText(table, index)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

/** A column other than the first typed identifier, which only the first
    column is: a defect. */
function identifierDefect(column: string): never {
  throw new Error(
    `popnei_web defect: the column ${column}, not the first, is the identifier.`,
  );
}

/** What the selects of the type of a column are drawn with. */
interface TypeSelectsProps {
  /** The name of the column. */
  readonly column: string;
  /** Its type now, never identifier, which only the first column has. */
  readonly type: Exclude<ColumnType, { readonly kind: "identifier" }>;
  /** The types its values allow, `columnAllows` of the read. */
  readonly allowed: ColumnAllows;
  /** Sends a command to the store. */
  readonly send: (step: StepCommand) => void;
  /** The element of the select of the type, for the focus. */
  readonly buttonRef?: React.Ref<HTMLButtonElement>;
}

/** The select of the type of a column, with the types its values allow,
    and, for a binary column, the select of its value coded 1 and the line
    that names the value coded 0. A column that allows one type still has
    its select, so that every row reads alike (the spec, "The
    columns"). */
function TypeSelects({
  column,
  type,
  allowed,
  send,
  buttonRef,
}: TypeSelectsProps): React.JSX.Element {
  return (
    <div className={classOf(styles, "typeSelects")}>
      <Select
        label={typeLabel(column)}
        labelShown="hidden"
        items={typeItems(allowed)}
        value={type.kind}
        onChange={(id) => {
          if (id !== type.kind) {
            send(typeCommand(column, typeOfItem(id, allowed)));
          }
        }}
        {...(buttonRef !== undefined && { buttonRef })}
      />
      {type.kind === "binary" && (
        <>
          <Select
            label={codingLabelEnd(column)}
            labelShown={{ start: CODING_LABEL }}
            // In the order of the reader's proposal, so that the two keep
            // their place when the coding changes.
            items={codingItems(binaryAllowed(column, allowed))}
            value={type.one}
            onChange={(one) => {
              if (one !== type.one) {
                send(codingCommand(column, one, type.one));
              }
            }}
          />
          <p className={classOf(styles, "line")}>{codedZeroText(type.zero)}</p>
        </>
      )}
    </div>
  );
}

/** The binary type the values of the binary column `column` allow, with
    the reader's coding. A column typed binary whose values are not two is
    a defect: the record and the validation put a binary type only where
    `columnAllows` gives one. */
function binaryAllowed(
  column: string,
  allowed: ColumnAllows,
): NonNullable<ColumnAllows["binary"]> {
  if (allowed.binary === null) {
    throw new Error(
      `popnei_web defect: the column ${column} is binary and its values are not two.`,
    );
  }
  return allowed.binary;
}

/** What the part of the populations is drawn with. */
interface PopulationsProps {
  /** The table of the metadata file, read. */
  readonly table: IndividualsTable;
  /** Sends a command to the store. */
  readonly send: (step: StepCommand) => void;
}

/** The select of what defines the populations, "All individuals in one
    population" or a column, and the populations, once every individual
    of the variants file is found. */
function Populations({ table, send }: PopulationsProps): React.JSX.Element {
  const heading = useId();
  const grouping = useAppState((s) => s.project.grouping);
  const check = useAppState((s) => individualsCheck(s.project));
  const toRun = useAppState((s) => populationsToRun(s.project));
  // Primitives, since populationsNeeds gives a new object each call. The
  // reasons are those of the step, `inStep`, without its place. No column
  // chosen yet is not a problem of the choice made, so its reason is read
  // with the line under the select; the others are problems of it.
  const needKind = useAppState((s) => populationsNeeds(s.project)?.kind);
  const needText = useAppState((s) => populationsNeeds(s.project)?.inStep);

  return (
    <section aria-labelledby={heading} className={classOf(styles, "section")}>
      <h2 id={heading} className={classOf(styles, "heading")}>
        Populations
      </h2>
      <Select
        label="Column that defines the populations"
        items={populationItems(table.columns)}
        value={chosenPopulationItem(grouping, table.columns)}
        placeholder="Choose a column"
        description={
          needKind === "noColumn" && needText !== undefined
            ? `${needText} ${POPULATIONS_HELP}`
            : POPULATIONS_HELP
        }
        {...(needKind !== undefined &&
          needKind !== "noColumn" &&
          needText !== undefined && { problem: needText })}
        onChange={(id) => {
          send(populationItemCommand(id));
        }}
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

/** What the part of the check is drawn with. */
interface CheckSectionProps {
  /** The metadata file, read. */
  readonly individuals: IndividualsSource;
  /** The reason `individualsStepMissing` gives, which names the
      individuals missing and the file to add them to. */
  readonly reason: string | null;
}

/** The check of the individuals of the variants file, under a heading of
    its own, "Individuals of panel.nei", so that the individuals missing
    do not read as a matter of the column of the populations, as the
    owner decided on 25 September 2026. */
function CheckSection({
  individuals,
  reason,
}: CheckSectionProps): React.JSX.Element {
  const heading = useId();
  const variants = useAppState((s) => s.project.variants);
  const check = useAppState((s) => individualsCheck(s.project));
  const variantsName = variants?.name ?? null;
  return (
    <section aria-labelledby={heading} className={classOf(styles, "section")}>
      <h2 id={heading} className={classOf(styles, "heading")}>
        {checkHeading(variantsName)}
      </h2>
      <Check
        individuals={individuals}
        check={check}
        variantsName={variantsName}
        reason={reason}
      />
    </section>
  );
}

/** What the check is drawn with. */
interface CheckProps {
  /** The metadata file, read. */
  readonly individuals: IndividualsSource;
  /** The check, `null` while the variants file is not read. */
  readonly check: IndividualsCheck | null;
  /** The name of the variants file, `null` with none. */
  readonly variantsName: string | null;
  /** The reason `individualsStepMissing` gives. */
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
        <div className={classOf(styles, "missingList")}>
          <ul className={classOf(styles, "names")}>
            {check.missing.map((name) => (
              <li key={name}>{escaped(name)}</li>
            ))}
          </ul>
          <CopyNames names={check.missing} />
        </div>
      </Disclosure>
    </div>
  );
}

/** The button under the list of the individuals missing that copies
    their names to the clipboard, one a line, for a user of the keyboard,
    who cannot select the list, and says in the status region whether it
    did, since the focus stays on the button (the spec, "Its words"). */
function CopyNames({
  names,
}: {
  readonly names: readonly string[];
}): React.JSX.Element {
  const announcer = useAnnouncer();
  async function copy(): Promise<void> {
    let copied = true;
    try {
      // navigator.clipboard is missing on a page served over plain HTTP
      // from another machine, and the call then throws; a browser may
      // also refuse the write.
      await navigator.clipboard.writeText(copiedNames(names));
    } catch {
      copied = false;
    }
    announcer.announce(copied ? copiedText(names.length) : NOT_COPIED);
  }
  return (
    <Button
      label={copyLabel(names.length)}
      onPress={() => {
        void copy();
      }}
    />
  );
}

/** The populations, each with its number of individuals of the variants
    file, shown "P1 · 48" and read "P1, 48 individuals". The words read
    are text hidden beside the line, and not the label of the item, which
    NVDA and JAWS may skip as they read the page; they cannot be
    selected, so that a copy of the list gives the lines shown alone. */
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
