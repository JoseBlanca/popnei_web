/**
 * The numbers of the cells of the individuals file and the type of each of
 * its columns, as the reader infers them (docs/specs/worker/individuals.md,
 * "The decimal mark and the numbers" and "The types of the columns"). The
 * reader of CSV and TSV calls it, and the reader of xlsx will; core calls
 * `cellNumber` and `inferColumnTypes` for the types each column allows
 * (docs/specs/core/project.md, `columnAllows`), so every function here is
 * pure.
 *
 * The values of a column are compared as text: a text as it is, a number
 * or a boolean of an xlsx as `String` writes it, so that a number 1 and a
 * text "1" of one column are one value.
 */

import type { Cell, ColumnType, IndividualsTable } from "../protocol.ts";

/**
 * The most distinct whole numbers, counted by value, that a continuous
 * column can have and still be warned of as maybe codes. 20 covers the
 * scores of 1 to 5, 1 to 7 and 1 to 9 and the numbers of populations of
 * most collections; it moves only which columns get the warning.
 */
export const MAX_FEW_WHOLE_LEVELS = 20;

/** A number with a decimal point: an optional sign, digits with at most
    one point among or around them, and an optional exponent. */
const NUMBER_WITH_POINT = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

/** The same with a decimal comma. */
const NUMBER_WITH_COMMA = /^[+-]?(?:\d+,?\d*|,\d+)(?:[eE][+-]?\d+)?$/;

/** A whole number: an optional sign and digits, no mark, no exponent. */
const WHOLE_NUMBER = /^[+-]?\d+$/;

/** The text of a cell by which the types compare it: a text as it is, a
    number or a boolean as `String` writes it; null for a missing cell. */
export function cellText(cell: Cell): string | null {
  return cell === null ? null : String(cell);
}

/**
 * The number a cell holds, or null: a missing cell, a text that is not a
 * number, a boolean. A text is a number when it is an optional sign,
 * digits with at most one decimal mark `decimal` among or around them, and
 * an optional exponent, and its value is finite; nothing else is, no
 * thousands separator, no space, no `%`, no `Inf`. A number cell, which
 * only an xlsx gives, is its number.
 */
export function cellNumber(cell: Cell, decimal: "." | ","): number | null {
  if (typeof cell === "number") return Number.isFinite(cell) ? cell : null;
  if (typeof cell !== "string") return null;
  if (decimal === ",") {
    if (!NUMBER_WITH_COMMA.test(cell)) return null;
    return finiteOrNull(Number(cell.replace(",", ".")));
  }
  if (!NUMBER_WITH_POINT.test(cell)) return null;
  return finiteOrNull(Number(cell));
}

function finiteOrNull(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}

/**
 * The type of each column of `table`, in its order, from the values of the
 * column, the texts of its cells that are not missing (`cellText`). The
 * first column is identifier; a column of exactly two distinct values is
 * binary; of three or more, every one a number read with `decimal`,
 * continuous; any other, one value, none, or three with one not a number,
 * categorical. A row not as long as the columns is a defect, and throws.
 */
export function inferColumnTypes(
  table: IndividualsTable,
  decimal: "." | ",",
): ColumnType[] {
  checkRowLengths(table);
  return table.columns.map((_, index) =>
    index === 0
      ? { kind: "identifier" }
      : typeOfValues(distinctTexts(table, index), decimal),
  );
}

/** Throws a defect when a row of `table` is not as long as its columns:
    the functions of this file are called with tables the reader of CSV
    did not make, the screen's and, from stage 4, the xlsx's. */
function checkRowLengths(table: IndividualsTable): void {
  for (const [index, row] of table.rows.entries()) {
    if (row.length !== table.columns.length) {
      throw new Error(
        `popnei_web defect: row ${String(index + 1)} of the table has ${String(row.length)} cells and the table ${String(table.columns.length)} columns`,
      );
    }
  }
}

/** The cell of `row` at `index`, which `checkRowLengths` made sure of. */
function cellAt(row: readonly Cell[], index: number): Cell {
  const cell = row[index];
  if (cell === undefined) {
    throw new Error(
      `popnei_web defect: a row of the table has no cell ${String(index)}`,
    );
  }
  return cell;
}

/** The distinct texts of the column at `index`, in the order of the
    rows. */
function distinctTexts(table: IndividualsTable, index: number): string[] {
  const texts = new Set<string>();
  for (const row of table.rows) {
    const text = cellText(cellAt(row, index));
    if (text !== null) texts.add(text);
  }
  return [...texts];
}

function typeOfValues(
  values: readonly string[],
  decimal: "." | ",",
): ColumnType {
  if (values.length === 2) {
    const [first, second] = values;
    if (first === undefined || second === undefined) {
      throw new Error(
        "popnei_web defect: two values without a first and a second",
      );
    }
    return binaryOf(first, second, decimal);
  }
  if (
    values.length >= 3 &&
    values.every((value) => cellNumber(value, decimal) !== null)
  ) {
    return { kind: "continuous" };
  }
  return { kind: "categorical" };
}

/**
 * The pairs of words whose first is the case, coded 1, compared in lower
 * case (the reader spec, "The types of the columns", rule 2).
 */
const KNOWN_PAIRS: readonly (readonly [one: string, zero: string])[] = [
  ["case", "control"],
  ["yes", "no"],
  ["y", "n"],
  ["true", "false"],
  ["t", "f"],
  ["affected", "unaffected"],
  ["positive", "negative"],
  ["present", "absent"],
  ["sí", "no"],
  ["si", "no"],
];

/**
 * The binary type of the two texts `a` and `b`, with the one coded 1: of
 * two numbers of different value the larger; of a known pair of words the
 * case; otherwise the one that comes second compared by code units. The
 * result does not depend on which of the two came first in the file.
 */
function binaryOf(a: string, b: string, decimal: "." | ","): ColumnType {
  const numberA = cellNumber(a, decimal);
  const numberB = cellNumber(b, decimal);
  if (numberA !== null && numberB !== null && numberA !== numberB) {
    return numberA > numberB
      ? { kind: "binary", one: a, zero: b }
      : { kind: "binary", one: b, zero: a };
  }
  const wordA = a.toLowerCase();
  const wordB = b.toLowerCase();
  for (const [one, zero] of KNOWN_PAIRS) {
    if (wordA === one && wordB === zero)
      return { kind: "binary", one: a, zero: b };
    if (wordB === one && wordA === zero)
      return { kind: "binary", one: b, zero: a };
  }
  return a > b
    ? { kind: "binary", one: a, zero: b }
    : { kind: "binary", one: b, zero: a };
}

/** A column taken as continuous whose values may be codes. */
export interface ColumnWarning {
  /** The one kind of warning: few whole numbers. */
  readonly kind: "fewWholeLevels";
  /** The name of the column. */
  readonly column: string;
  /** Its distinct numbers, counted by value, 1 to `MAX_FEW_WHOLE_LEVELS`. */
  readonly numLevels: number;
  /** Its distinct texts, compared as text; at least `numLevels`. */
  readonly numTexts: number;
  /** The smallest of them. */
  readonly min: number;
  /** The largest of them. */
  readonly max: number;
}

/**
 * The warnings of the columns, in the order of the table: one for each
 * column typed continuous, by the reader or by the user, whose values are all whole numbers, written as
 * digits with an optional sign and no decimal mark or exponent, and that
 * has at most `MAX_FEW_WHOLE_LEVELS` distinct numbers counted by value,
 * since such a column is often a code or an ordinal score. It is not
 * stored, so a table read now and one restored from a project file give
 * the same warnings. A row, or `columns`, not as long as the columns of
 * the table is a defect, and throws.
 */
export function columnWarnings(
  table: IndividualsTable,
  columns: readonly ColumnType[],
  decimal: "." | ",",
): ColumnWarning[] {
  if (columns.length !== table.columns.length) {
    throw new Error(
      `popnei_web defect: ${String(columns.length)} types were given for a table of ${String(table.columns.length)} columns`,
    );
  }
  checkRowLengths(table);
  const warnings: ColumnWarning[] = [];
  for (const [index, type] of columns.entries()) {
    if (type.kind !== "continuous") continue;
    const name = table.columns[index];
    if (name === undefined) {
      throw new Error(
        `popnei_web defect: the table has no column ${String(index)}`,
      );
    }
    const whole = wholeLevels(table, index, decimal);
    if (whole === null || whole.levels.size === 0) continue;
    if (whole.levels.size > MAX_FEW_WHOLE_LEVELS) continue;
    warnings.push({
      kind: "fewWholeLevels",
      column: name,
      numLevels: whole.levels.size,
      numTexts: whole.numTexts,
      min: Math.min(...whole.levels),
      max: Math.max(...whole.levels),
    });
  }
  return warnings;
}

/**
 * The words of a warning, which the screen shows beside its column after
 * the "Warning: " that is its own (docs/specs/worker/individuals.md, "The
 * types of the columns"). The numbers are written as JavaScript writes
 * them.
 */
export function columnWarningText(warning: ColumnWarning): string {
  const measurement = "and is taken as a measurement.";
  if (warning.numLevels === 1) {
    const ways = warning.numTexts > 1 ? ", written in different ways," : ",";
    return `${warning.column} holds only one whole number, ${String(warning.min)}${ways} ${measurement} If it is a code, such as a numbered population, set its type to categorical.`;
  }
  return `${warning.column} holds only ${String(warning.numLevels)} different whole numbers, from ${String(warning.min)} to ${String(warning.max)}, ${measurement} If they are codes, such as numbered populations, set its type to categorical.`;
}

/** The distinct numbers of the column at `index`, with the number of its
    distinct texts, or null when one of its values is not a whole number. */
function wholeLevels(
  table: IndividualsTable,
  index: number,
  decimal: "." | ",",
): { levels: Set<number>; numTexts: number } | null {
  const levels = new Set<number>();
  const texts = new Set<string>();
  for (const row of table.rows) {
    const cell = cellAt(row, index);
    if (cell === null) continue;
    const isWhole =
      typeof cell === "number"
        ? Number.isInteger(cell)
        : typeof cell === "string" && WHOLE_NUMBER.test(cell);
    const value = cellNumber(cell, decimal);
    if (!isWhole || value === null) return null;
    levels.add(value);
    texts.add(String(cell));
  }
  return { levels, numTexts: texts.size };
}
