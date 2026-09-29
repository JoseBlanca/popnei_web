/**
 * The words of the Individuals step and the rules they rest on
 * (docs/specs/steps/individuals.md): what a name tells of a file, the
 * items of the three options of the reader, the lines of the card, the
 * table of the columns, the check and the populations. Pure, so that a
 * test in node checks them; the step draws them.
 */

import type {
  AppId,
  ColumnAllows,
  ColumnTypeOf,
  Grouping,
  IndividualsCheck,
  TableRead,
} from "../../../core/project.ts";
import {
  counted,
  escaped,
  firstValues,
  grouped,
  individualsStepRefusal,
  typeLostReason,
} from "../../../core/project.ts";
import type {
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
  ".xlsx",
]);

/** The endings of a file read as a CSV or a TSV, the reader finding the
    separator whatever the ending. */
const TEXT_ENDINGS = [".csv", ".tsv", ".txt"] as const;

/** The endings of a variants file, which the Variants step takes. */
const VARIANTS_ENDINGS = [".vcf", ".vcf.gz", ".bcf", ".nei"] as const;

/** What the end of `name` tells, compared without regard to case: a CSV
    or a TSV, or an xlsx, which are loaded; a workbook of the older Excel,
    `.xls`, a variants file, or a file of any other name, which are not. */
export function kindOfName(
  name: string,
): "text" | "xlsx" | "xls" | "variants" | "other" {
  const lower = name.toLowerCase();
  if (TEXT_ENDINGS.some((ending) => lower.endsWith(ending))) return "text";
  if (lower.endsWith(".xlsx")) return "xlsx";
  if (lower.endsWith(".xls")) return "xls";
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

/** What the step says of a workbook of the older Excel, `.xls`, which it
    did not load, as the owner decided on 25 September 2026. */
export function xlsText(name: string): string {
  return `${escaped(name)} was not loaded: this version reads .xlsx files and not the older .xls. In Excel, save the sheet with File › Save As, as an Excel Workbook (.xlsx) or as CSV, and load that file.`;
}

/** What the step says of a file of another name, which it did not load. */
export function otherNameText(name: string): string {
  return `${escaped(name)} was not loaded: the Individuals step reads a CSV or a TSV, whose name ends in .csv, .tsv or .txt, or an Excel file, whose name ends in .xlsx. If it is one of them, rename it.`;
}

/** The line of the card of an xlsx read, which says that only its first
    sheet was read, with no name of the sheet, as the owner decided on 28
    September 2026 (docs/specs/worker/individuals.md, Open 1). */
export function firstSheetText(name: string): string {
  return `Read from the first sheet of ${escaped(name)}; any other sheet is not read.`;
}

/** What the step says when several files are dropped or pasted at
    once, or several things of which one is not a file. A paste is a drop
    to the step, and a user of the keyboard pastes and cannot drop, so the
    words say "load". */
export const SEVERAL_DROPPED = "Load one metadata file at a time.";

/** What the step says when a folder is dropped or pasted. */
export const FOLDER_DROPPED =
  "Load a metadata file, a CSV, a TSV or an .xlsx file, not a folder.";

/** What the step says when a piece of text is dropped, dragged from
    another window, or pasted. */
export const TEXT_DROPPED =
  "Load a metadata file, a CSV, a TSV or an .xlsx file, not a piece of text.";

/** The line of the zone with no file, which says what the analyses per
    population run on, as the owner decided on 25 September 2026. */
export const NO_FILE =
  "No metadata file: every individual is in one population.";

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
  "The types are inferred from the values. Change one where the inference is wrong: a column of numbered populations, 1 to 12, is inferred continuous and is categorical. The populations are the values of their column, whatever its type.";

/** A value of the user's file as the screen shows it, escaped and not
    cut. */
function valueText(value: string | number | boolean): string {
  return escaped(String(value));
}

/** What joins the values of a column, its first values and the two of a
    binary column: a dot and not a comma, as the owner decided on 25
    September 2026, since a column of the decimal comma would read "1,75,
    1,62, 1,80". The space before the dot does not break, so that a value
    keeps its dot on its line, and a line of a narrow page never starts
    with a dot, which would read as the mark of a list. */
const VALUES_DOT = "\u00a0·";

/** A value of a coding in words, escaped and between quotation marks,
    since a bare value reads as a word of the sentence, "no is coded 0."
    as nothing coded 0 (stop B 1, decided by the owner on 29 September
    2026). */
function codedText(value: string): string {
  return `"${valueText(value)}"`;
}

/** The type of a column in words: "identifier", "continuous",
    "categorical", and a binary one with its coding, `binary with "yes"
    coded 1`. */
export function typeWords(type: ColumnType): string {
  switch (type.kind) {
    case "identifier":
    case "continuous":
    case "categorical":
      return type.kind;
    case "binary":
      return `binary with ${codedText(type.one)} coded 1`;
  }
}

/** A type the select of a column offers, by its kind; a binary column
    takes its coding from the second select of its row. */
export type TypeItemId = Exclude<ColumnType["kind"], "identifier">;

/** The items of the select of the type of a column that allows
    `allows`: categorical, always; binary, for a column of exactly two
    values; continuous, for a column of numbers. */
export function typeItems(
  allows: ColumnAllows,
): readonly OptionItem<TypeItemId>[] {
  const items: OptionItem<TypeItemId>[] = [
    { id: "categorical", label: "categorical" },
  ];
  if (allows.binary !== null) items.push({ id: "binary", label: "binary" });
  if (allows.continuous) items.push({ id: "continuous", label: "continuous" });
  return items;
}

/** The type the item `id` of the select of a column that allows `allows`
    stands for: binary with the coding the reader proposes, from
    `columnAllows`. Throws a defect for an item the column does not
    allow, which its select does not offer. */
export function typeOfItem(id: TypeItemId, allows: ColumnAllows): ColumnType {
  switch (id) {
    case "categorical":
      return { kind: "categorical" };
    case "continuous":
      if (!allows.continuous) {
        throw new Error(
          "popnei_web defect: continuous was chosen for a column that is not all numbers.",
        );
      }
      return { kind: "continuous" };
    case "binary":
      if (allows.binary === null) {
        throw new Error(
          "popnei_web defect: binary was chosen for a column that has not exactly two values.",
        );
      }
      return allows.binary;
  }
}

/** The name of the select of the type of the column `column`, its label,
    hidden from the eye, since the header of the table says "Type" for
    every row: "Type of score". */
export function typeLabel(column: string): string {
  return `Type of ${escaped(column)}`;
}

/** The label shown of the select of the value coded 1 of a binary
    column. */
export const CODING_LABEL = "Coded 1, the case";

/** The end of the name of the select of the value coded 1 of the column
    `column`, after its label shown, `CODING_LABEL`: the column, which the
    eye takes from the row and a screen reader does not, so that the name
    is "Coded 1, the case, in status". */
export function codingLabelEnd(column: string): string {
  return `, in ${escaped(column)}`;
}

/** The items of the select of the value coded 1 of a binary column of
    the two values `binary`, in the order of the reader's proposal, so
    that they keep their place when the user changes the coding; each is
    the value, escaped. */
export function codingItems(binary: {
  readonly one: string;
  readonly zero: string;
}): readonly OptionItem<string>[] {
  return [
    { id: binary.one, label: valueText(binary.one) },
    { id: binary.zero, label: valueText(binary.zero) },
  ];
}

/** The line beside the value coded 1, which names the other: `"no" is
    coded 0.`. */
export function codedZeroText(zero: string): string {
  return `${codedText(zero)} is coded 0.`;
}

/** The warning of the types the user set that a read does not apply,
    after the "Warning: " of the screen: one sentence for one column,
    and for several an opening, a line for each column in the order of
    `typesLost`, and a closing. */
export type TypesLostWords =
  | { readonly kind: "one"; readonly text: string }
  | {
      readonly kind: "several";
      readonly opening: string;
      readonly lines: readonly string[];
      readonly closing: string;
    };

/**
 * The words of the types set that the read `read` of the file `name`
 * does not apply, `lost`, the `typesLost` of its source, each by the
 * reason `typeLostReason` gives; `null` when there is none. The file is
 * named as the source names it, so after a new load, the new file. The
 * words do not say that the file was just read, since a project opened
 * from a project file shows the same warning.
 */
export function typesLostWords(
  name: string,
  read: TableRead,
  lost: readonly ColumnTypeOf[],
): TypesLostWords | null {
  const file = escaped(name);
  const [only] = lost;
  if (only === undefined) return null;
  if (lost.length === 1) {
    const [column, type] = only;
    const col = escaped(column);
    const set = typeWords(type);
    switch (typeLostReason(read, column)) {
      case "values":
        return {
          kind: "one",
          text: `${col} does not have the type you set, ${set}, since its values in ${file} do not allow it; it is ${typeWords(typeNow(read, column))}, as its values give it. The type you set comes back when the file is read with values that allow it.`,
        };
      case "gone":
        return {
          kind: "one",
          text: `${file} has no column ${col}, whose type you set as ${set}. The type comes back when the file is read with a column of that name.`,
        };
      case "firstColumn":
        return {
          kind: "one",
          text: `${col} is the first column of ${file}, whose cells are the names of the individuals, so it does not have the type you set, ${set}. If it should not be first, correct the file and load it again; the type you set then comes back.`,
        };
    }
  }
  return {
    kind: "several",
    opening: `${counted(lost.length, "column")} do not have the type you set:`,
    lines: lost.map(([column, type]) => {
      const col = escaped(column);
      const start = `${col}: ${typeWords(type)}`;
      switch (typeLostReason(read, column)) {
        case "values":
          return `${start}; its values do not allow it, and it is ${typeWords(typeNow(read, column))}`;
        case "gone":
          return `${start}; ${file} has no column ${col}`;
        case "firstColumn":
          return `${start}; it is the first column, the names of the individuals`;
      }
    }),
    closing:
      "Each type you set comes back when the file is read with a column that allows it.",
  };
}

/** The type the read gives its column `column`. */
function typeNow(read: TableRead, column: string): ColumnType {
  const type = read.columns[read.table.columns.indexOf(column)];
  if (type === undefined) {
    throw new Error(
      `popnei_web defect: the column ${column} of the read has no type.`,
    );
  }
  return type;
}

/** The button beside the warning of the types set and not applied, for
    `count` of them. */
export function forgetLabel(count: number): string {
  return count === 1 ? "Forget this type" : "Forget these types";
}

/** The first three distinct values of the column at `index` that are
    not missing, in the order of the file, escaped: "España · Italia ·
    Perú". Core's `firstValues` keeps them by the table, so that a table
    of 10,000 rows is not walked at each drawing of the step. */
export function firstValuesText(
  table: IndividualsTable,
  index: number,
): string {
  return firstValuesParts(table, index).join(" ");
}

/** The same values as the parts the step draws each on one line, each
    but the last with its dot: "España\u00a0·", "Italia\u00a0·", "Perú".
    Joined by a space, they are `firstValuesText`. */
export function firstValuesParts(
  table: IndividualsTable,
  index: number,
): string[] {
  const values = firstValues(table)[index];
  if (values === undefined) {
    throw new Error(
      `popnei_web defect: the table has no column ${String(index)}.`,
    );
  }
  const last = values.length - 1;
  return values.map((value, at) =>
    at < last ? `${escaped(value)}${VALUES_DOT}` : escaped(value),
  );
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

/** The button under the list of the individuals missing, which copies
    their names: "Copy the 12 names", or "Copy the name" for one. */
export function copyLabel(numMissing: number): string {
  return numMissing === 1
    ? "Copy the name"
    : `Copy the ${counted(numMissing, "name")}`;
}

/** What the status region says once the names of `numMissing`
    individuals missing are on the clipboard. */
export function copiedText(numMissing: number): string {
  return numMissing === 1
    ? "The name was copied."
    : `${counted(numMissing, "name")} copied.`;
}

/** What the status region says when the page has no clipboard, which the
    browser gives only to a page served over HTTPS or from the machine
    itself, or the browser refused the copy. */
export const NOT_COPIED =
  "The names could not be copied. Select them in the list.";

/** The text the copy puts on the clipboard: the names as the variants
    file has them, one a line, to paste into a sheet. */
export function copiedNames(names: readonly string[]): string {
  return names.join("\n");
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

/** The line under the select of the populations. */
export const POPULATIONS_HELP =
  "Any column can define the populations, whatever its type. An individual with an empty cell in it is in no population.";

/** The item of the select of the populations that puts every individual
    in one population. */
export const ONE_POPULATION_ITEM = "All individuals in one population";

/** The id of an item of the select of the populations: `one`, the one
    population, or `column:` and the name of a column, so that a column
    named "one", or "All individuals in one population", is not taken for
    the one population. */
export type PopulationItemId = "one" | `column:${string}`;

/** The id of the item of the column `column`. */
function columnItem(column: string): PopulationItemId {
  return `column:${column}`;
}

/** The items of the select of the populations of a table of the columns
    `columns`: the one population first, then every column but the first,
    which names the individuals, whatever its type, escaped. */
export function populationItems(
  columns: readonly string[],
): readonly OptionItem<PopulationItemId>[] {
  return [
    { id: "one", label: ONE_POPULATION_ITEM },
    ...columns
      .slice(1)
      .map((name) => ({ id: columnItem(name), label: escaped(name) })),
  ];
}

/** The item the select of the populations shows as chosen for the
    grouping `grouping` of a table of the columns `columns`: the one
    population, the column chosen when the table has it, or `null`,
    "Choose a column", for no column or one the table does not have. */
export function chosenPopulationItem(
  grouping: Grouping,
  columns: readonly string[],
): PopulationItemId | null {
  switch (grouping.kind) {
    case "onePopulation":
      return "one";
    case "populations": {
      const column = grouping.column;
      return column !== null && columns.slice(1).includes(column)
        ? columnItem(column)
        : null;
    }
    case "roles":
      return null;
  }
}

/** The column the item `id` of a column of the select of the populations
    names. */
export function columnOfItem(id: `column:${string}`): string {
  return id.slice("column:".length);
}
