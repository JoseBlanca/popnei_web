/**
 * The words of the Individuals step and the rules they rest on
 * (docs/specs/steps/individuals.md): what a name tells of a file, the
 * items of the three options of the reader, the lines of the card, the
 * table of the columns, the check and the populations. Pure, so that a
 * test in node checks them; the step draws them.
 */

import type { IndividualsCheck } from "../../../core/project.ts";
import type { AppId } from "../../../core/project.ts";
import {
  counted,
  escaped,
  grouped,
  individualsStepRefusal,
} from "../../../core/project.ts";
import type {
  Cell,
  ColumnType,
  CsvFound,
  CsvOptions,
  IndividualsTable,
} from "../../../worker/protocol.ts";

/** The options of a CSV of a new pick: each found by the reader. */
export const AUTO_CSV: CsvOptions = Object.freeze({
  encoding: "auto",
  separator: "auto",
  decimal: "auto",
});

/** The endings the file picker offers first; any file is under "All
    files". */
export const PICKER_ENDINGS: readonly string[] = Object.freeze([
  ".csv",
  ".tsv",
  ".txt",
]);

/** The endings of a file read as a CSV or a TSV, the reader finding the
    separator whatever the ending. */
const TEXT_ENDINGS = [".csv", ".tsv", ".txt"] as const;

/** The endings of an Excel file, not read in this version. */
const EXCEL_ENDINGS = [".xlsx", ".xls"] as const;

/** The endings of a variants file, which the Variants step takes. */
const VARIANTS_ENDINGS = [".vcf", ".vcf.gz", ".bcf", ".nei"] as const;

/** What the end of `name` tells, compared without regard to case: a CSV
    or a TSV, which is loaded; an Excel file, a variants file, or a file
    of any other name, which are not. */
export function kindOfName(
  name: string,
): "text" | "excel" | "variants" | "other" {
  const lower = name.toLowerCase();
  if (TEXT_ENDINGS.some((ending) => lower.endsWith(ending))) return "text";
  if (EXCEL_ENDINGS.some((ending) => lower.endsWith(ending))) return "excel";
  if (VARIANTS_ENDINGS.some((ending) => lower.endsWith(ending))) {
    return "variants";
  }
  return "other";
}

/** What the step says of a variants file of the application `app`, told
    by its name, which it did not load: the words of the reader for a VCF
    found by its first line, as the owner decided on 25 September 2026. */
export function variantsNameText(name: string, app: AppId): string {
  return `${escaped(name)} was not loaded: ${individualsStepRefusal({ kind: "variantsFile" }, app)}`;
}

/** What the step says of an Excel file, which it did not load. */
export function excelText(name: string): string {
  return `${escaped(name)} was not loaded: this version reads a CSV or a TSV, and reads .xlsx files from a later version. In Excel, save the sheet with File › Save As › CSV, and load that file.`;
}

/** What the step says of a file of another name, which it did not load. */
export function otherNameText(name: string): string {
  return `${escaped(name)} was not loaded: the Individuals step reads a CSV or a TSV, whose name ends in .csv, .tsv or .txt. If it is one of them, rename it.`;
}

/** What the step says when several files are dropped or pasted at
    once, or several things of which one is not a file. A paste is a drop
    to the step, and a user of the keyboard pastes and cannot drop, so the
    words say "load". */
export const SEVERAL_DROPPED = "Load one metadata file at a time.";

/** What the step says when a folder is dropped or pasted. */
export const FOLDER_DROPPED =
  "Load a metadata file, a CSV or a TSV, not a folder.";

/** What the step says when a piece of text is dropped, dragged from
    another window, or pasted. */
export const TEXT_DROPPED =
  "Load a metadata file, a CSV or a TSV, not a piece of text.";

/** The line of the zone with no file. */
export const NO_FILE =
  "No metadata file. The analyses per population need one.";

/** The line of the size of a table read: "360 rows, 5 columns". */
export function sizeText(table: IndividualsTable): string {
  return `${counted(table.rows.length, "row")}, ${counted(table.columns.length, "column")}`;
}

/** One of the three options of the reader. */
export type CsvOption = keyof CsvOptions;

/** The names of what the reader finds or is set to, as the items of the
    selects give them. */
const ENCODING_NAMES: Readonly<Record<CsvFound["encoding"], string>> = {
  "utf-8": "UTF-8",
  "windows-1252": "Windows-1252",
  "utf-16": "UTF-16",
};
const SEPARATOR_NAMES: Readonly<Record<CsvFound["separator"], string>> = {
  ",": "comma",
  ";": "semicolon",
  "\t": "tab",
};
const DECIMAL_NAMES: Readonly<Record<CsvFound["decimal"], string>> = {
  ".": "point",
  ",": "comma",
};

/** The words of the first item of a select, "auto": what the reader
    detected, "Detected: semicolon", when the option is "auto" and the
    file was read with it; "Detected" alone otherwise, while a read is
    under way, after a refusal, or once the user set the option, when
    `found` holds what was set. */
export function detectedText(
  option: CsvOption,
  csv: CsvOptions,
  found: CsvFound | null,
): string {
  if (found === null || csv[option] !== "auto") return "Detected";
  switch (option) {
    case "encoding":
      return `Detected: ${ENCODING_NAMES[found.encoding]}`;
    case "separator":
      return `Detected: ${SEPARATOR_NAMES[found.separator]}`;
    case "decimal":
      return `Detected: ${DECIMAL_NAMES[found.decimal]}`;
  }
}

/** An item of the select of an option of the reader, as the select of
    src/ui/widgets/Select.tsx takes it; not imported from there, since the
    tests in node of this file read no CSS. */
export interface OptionItem<T extends string> {
  /** The value of the option. */
  readonly id: T;
  /** Its words on the list. */
  readonly label: string;
}

/** The items of the encoding, the first "auto" with the words of
    `detectedText`. */
export function encodingItems(
  detected: string,
): readonly OptionItem<CsvOptions["encoding"]>[] {
  return [
    { id: "auto", label: detected },
    { id: "utf-8", label: "UTF-8" },
    {
      id: "windows-1252",
      label: "Windows-1252, as Excel writes a CSV on Windows",
    },
  ];
}

/** The items of the separator, the first "auto". */
export function separatorItems(
  detected: string,
): readonly OptionItem<CsvOptions["separator"]>[] {
  return [
    { id: "auto", label: detected },
    { id: ",", label: "Comma" },
    { id: ";", label: "Semicolon" },
    { id: "\t", label: "Tab" },
  ];
}

/** The items of the decimal mark, the first "auto". */
export function decimalItems(
  detected: string,
): readonly OptionItem<CsvOptions["decimal"]>[] {
  return [
    { id: "auto", label: detected },
    { id: ".", label: "Point" },
    { id: ",", label: "Comma" },
  ];
}

/** The lines under the three options. */
export const OPTIONS_HELP =
  'If names with accents come out garbled, "EspaÃ±a" for "España", change the encoding. If the whole file shows as a single column, change the separator. Changing one reads the file again.';

/** The line that replaces the encoding of a file that starts with the
    mark of UTF-16. */
export const UTF16_TEXT =
  "Encoding: UTF-16, from the mark at the start of the file.";

/** The line that replaces the three options of a file the page holds no
    copy of, in a project opened from a project file. */
export function loadAgainText(name: string): string {
  return `To change how ${escaped(name)} is read, load it again.`;
}

/** The line above the table of the columns. */
export const TYPES_LINE =
  "The types are inferred from the values; changing them comes in a later version.";

/** A value of the user's file as the screen shows it, escaped and not
    cut. */
function valueText(value: string | number | boolean): string {
  return escaped(String(value));
}

/** The number of distinct values the table shows of each column. */
const FIRST_VALUES = 3;

/** What joins the values of a column, its first values and the two of a
    binary column: a dot and not a comma, as the owner decided on 25
    September 2026, since a column of the decimal comma would read "1,75,
    1,62, 1,80". The space before the dot does not break, so that a value
    keeps its dot on its line, and a line of a narrow page never starts
    with a dot, which would read as the mark of a list. */
const VALUES_JOIN = "\u00a0· ";

/** The type of a column in words: "identifier", "binary: yes · no",
    "continuous", "categorical". */
export function typeText(type: ColumnType): string {
  switch (type.kind) {
    case "identifier":
    case "continuous":
    case "categorical":
      return type.kind;
    case "binary":
      return `binary: ${valueText(type.one)}${VALUES_JOIN}${valueText(type.zero)}`;
  }
}

/** The first three distinct values of the column at `index` that are
    not missing, in the order of the file: "España · Italia · Perú". */
export function firstValuesText(
  table: IndividualsTable,
  index: number,
): string {
  const values: string[] = [];
  for (const row of table.rows) {
    const cell: Cell | undefined = row[index];
    if (cell === undefined || cell === null) continue;
    const text = valueText(cell);
    if (!values.includes(text)) values.push(text);
    if (values.length === FIRST_VALUES) break;
  }
  return values.join(VALUES_JOIN);
}

/** The heading of the check of the individuals of the variants file
    `variantsName`, `null` while the project has none: "Individuals of
    panel.nei". */
export function checkHeading(variantsName: string | null): string {
  return variantsName === null
    ? "Individuals of the variants file"
    : `Individuals of ${escaped(variantsName)}`;
}

/** The warning of a character the read of the file `name` could not
    decode, first on the line `line`, after the "Warning: " of the screen:
    what it is, and, but for UTF-16, whose encoding cannot be chosen, the
    encoding that may be the right one. Only UTF-8 has another to offer:
    a file of UTF-16 is read so by its mark, and Windows-1252 decodes
    every byte, so a read of it has such a line only in a project file
    edited by hand. */
export function undecodedText(
  name: string,
  found: CsvFound,
  line: number,
): string {
  const where = `line ${String(line)} of ${escaped(name)}`;
  const what = `${where} has bytes that could not be read as ${ENCODING_NAMES[found.encoding]}, shown as �. Correct them in the file and load it again`;
  return found.encoding === "utf-8"
    ? `${what}, or, if every letter with an accent shows as �, choose Windows-1252 as the encoding.`
    : `${what}.`;
}

/** The line of the check before the variants file is read. */
export const NOT_CHECKED_YET =
  "The individuals are checked against the variants file once it is read.";

/** The line of the check when every individual of the variants file
    `variantsName` is found: "All 342 individuals of panel.nei found · 18
    rows not in panel.nei, ignored", the second half only when there are
    such rows. */
export function allFoundText(
  check: IndividualsCheck,
  variantsName: string,
): string {
  const name = escaped(variantsName);
  const found = `All ${counted(check.found, "individual")} of ${name} found`;
  return check.ignoredRows === 0
    ? found
    : `${found} · ${counted(check.ignoredRows, "row")} not in ${name}, ignored`;
}

/** The words of the disclosure of the individuals missing: "The 12
    individuals missing". */
export function missingLabel(numMissing: number): string {
  return `The ${counted(numMissing, "individual")} missing`;
}

/** A population of the list, its name and its number of individuals of
    the variants file: shown "P1 · 48", read "P1, 48 individuals". */
export interface PopulationLine {
  /** What the screen shows. */
  readonly shown: string;
  /** What a screen reader reads, the number in words. */
  readonly read: string;
}

/** The line of a population named `name` with `size` individuals. */
export function populationLine(name: string, size: number): PopulationLine {
  const pop = escaped(name);
  return {
    shown: `${pop} · ${grouped(size)}`,
    read: `${pop}, ${counted(size, "individual")}`,
  };
}

/** The line of the individuals found that are in no population, which
    comes last in the list. */
export function noPopulationLine(size: number): PopulationLine {
  const left = "left out of the analyses per population";
  return {
    shown: `No population · ${grouped(size)}, ${left}`,
    read: `No population, ${counted(size, "individual")}, ${left}`,
  };
}
