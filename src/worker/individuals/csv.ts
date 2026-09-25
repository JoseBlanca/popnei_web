/**
 * The reader of the text of a CSV or TSV of the individuals: it finds the
 * separator and the decimal mark when they are `"auto"`, makes the table
 * of the project, and infers the type of each column
 * (docs/specs/worker/individuals.md, "The separator", "The rows and the
 * cells" and "The refusals and their words"). It takes text: the bytes
 * are decoded before, by individualsFile.ts. A refusal is a value, never
 * an exception.
 */

import type { Result } from "../../core/result.ts";
import type {
  Cell,
  ColumnType,
  CsvOptions,
  IndividualsFileError,
  IndividualsTable,
} from "../protocol.ts";
import { cellNumber, inferColumnTypes } from "./columnTypes.ts";

/** What a read of a CSV or TSV gives. */
export interface CsvRead {
  /** The table, its first column the individuals. */
  readonly table: IndividualsTable;
  /** The type of each column, one per column, the first identifier. */
  readonly columns: readonly ColumnType[];
  /** The separator used, as set or as found. */
  readonly separator: Separator;
  /** The decimal mark used, as set or as found. */
  readonly decimal: "." | ",";
}

type Separator = "," | ";" | "\t";

/** The separators tried with `"auto"`, in the order that settles a tie: a
    tab is the least likely of the three to be inside a value. */
const SEPARATORS_BY_PRECEDENCE: readonly Separator[] = ["\t", ";", ","];

/** The texts of a missing value outside the first column, exactly
    (docs/functionality.md, section 4). */
const MISSING_TEXTS: readonly string[] = ["", "NA", "-"];

const QUOTE = 0x22;
const SPACE = 0x20;
const TAB = 0x09;
const LINE_FEED = 0x0a;
const CARRIAGE_RETURN = 0x0d;

/**
 * Reads the text of a CSV or TSV into the table of the individuals, with
 * the separator and the decimal mark of `options`, or those it finds when
 * they are `"auto"`, and infers the type of each column. It refuses, in
 * this order: a quote never closed, `unclosedQuote`; no row below the
 * header, `empty`; a row of the wrong length, `raggedRow`, the first by
 * line; a column with values and no name, `unnamedColumn`, then two
 * columns of one name, `duplicateColumn`; then, row by row, a row with no
 * name, `emptyIndividual`, or an individual already seen,
 * `duplicateIndividual`.
 */
export function readCsv(
  text: string,
  options: {
    readonly separator: CsvOptions["separator"];
    readonly decimal: CsvOptions["decimal"];
  },
): Result<CsvRead, IndividualsFileError> {
  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const separator =
    options.separator === "auto" ? findSeparator(body) : options.separator;
  const scanned = scan(body, separator, makeCell);
  if (scanned.unclosedQuoteLine !== null) {
    return fail({
      kind: "unclosedQuote",
      line: scanned.unclosedQuoteLine,
      separator,
    });
  }
  const rows = scanned.rows.filter((row) => !row.cells.every(isEmptyText));
  const [header, ...individuals] = rows;
  if (header === undefined || individuals.length === 0) {
    return fail({ kind: "empty" });
  }
  const numColumns = header.cells.length;
  for (const row of individuals) {
    if (!fitsHeader(row.cells, numColumns, isEmptyText)) {
      return fail({
        kind: "raggedRow",
        line: row.line,
        expected: numColumns,
        found: row.cells.length,
        separator,
      });
    }
  }
  const kept = keptColumns(header.cells, individuals);
  if (!kept.ok) return kept;
  const columns = kept.value.map((index) => header.cells[index] ?? "");
  const duplicate = firstRepeated(columns);
  if (duplicate !== null)
    return fail({ kind: "duplicateColumn", name: duplicate });

  const tableRows: Cell[][] = [];
  const seen = new Set<string>();
  for (const row of individuals) {
    const name = row.cells[0] ?? "";
    if (name === "") return fail({ kind: "emptyIndividual", line: row.line });
    if (seen.has(name)) return fail({ kind: "duplicateIndividual", name });
    seen.add(name);
    tableRows.push(
      kept.value.map((index, position) => {
        const cell = row.cells[index] ?? "";
        return position === 0 || !MISSING_TEXTS.includes(cell) ? cell : null;
      }),
    );
  }
  const table: IndividualsTable = { columns, rows: tableRows };
  const decimal =
    options.decimal === "auto"
      ? findDecimal(table, separator)
      : options.decimal;
  return {
    ok: true,
    value: {
      table,
      columns: inferColumnTypes(table, decimal),
      separator,
      decimal,
    },
  };
}

function fail(
  error: IndividualsFileError,
): Result<never, IndividualsFileError> {
  return { ok: false, error };
}

function isEmptyText(cell: string): boolean {
  return cell === "";
}

/** Whether a row of these cells fits a header of `numColumns` cells: as
    many cells, or more whose cells past the header are all empty. */
function fitsHeader<C>(
  cells: readonly C[],
  numColumns: number,
  isEmpty: (cell: C) => boolean,
): boolean {
  if (cells.length < numColumns) return false;
  return cells.slice(numColumns).every(isEmpty);
}

/**
 * The indices of the columns kept, in the order of the file: the first
 * always, one with a name, and none with an empty name whose cells are all
 * empty, the columns Excel adds with a trailing separator. A column with
 * an empty name and a value is refused, with its number counted from 1.
 */
function keptColumns(
  names: readonly string[],
  rows: readonly ScannedRow<string>[],
): Result<number[], IndividualsFileError> {
  const kept: number[] = [];
  for (const [index, name] of names.entries()) {
    if (index === 0 || name !== "") {
      kept.push(index);
    } else if (rows.some((row) => (row.cells[index] ?? "") !== "")) {
      return fail({ kind: "unnamedColumn", column: index + 1 });
    }
  }
  return { ok: true, value: kept };
}

/** The first name that appears a second time, or null. */
function firstRepeated(names: readonly string[]): string | null {
  const seen = new Set<string>();
  for (const name of names) {
    if (seen.has(name)) return name;
    seen.add(name);
  }
  return null;
}

/**
 * The separator of `"auto"`. Each of the three is tried by counting the
 * cells of each row, without making them. One fits when it gives the
 * header two cells or more, every row fits the header, and no quote is
 * left open. Of those that fit, the one that gives the header the most
 * cells, a tie going by `SEPARATORS_BY_PRECEDENCE`; when none fits, the
 * same over them all, so that the read then refuses the row that does not
 * fit; and when every one gives the header one cell, or none, the comma.
 */
function findSeparator(text: string): Separator {
  const tries = SEPARATORS_BY_PRECEDENCE.map((separator) => {
    const scanned = scan(text, separator, isEmptyCell);
    const rows = scanned.rows.filter((row) => !row.cells.every(isTrue));
    const [header, ...individuals] = rows;
    const numColumns = header?.cells.length ?? 0;
    const fits =
      scanned.unclosedQuoteLine === null &&
      numColumns >= 2 &&
      individuals.every((row) => fitsHeader(row.cells, numColumns, isTrue));
    return { separator, numColumns, fits };
  });
  const mostColumns = (candidates: typeof tries): Separator | null => {
    let best: (typeof tries)[number] | null = null;
    for (const candidate of candidates) {
      if (best === null || candidate.numColumns > best.numColumns) {
        best = candidate;
      }
    }
    return best !== null && best.numColumns >= 2 ? best.separator : null;
  };
  return (
    mostColumns(tries.filter((candidate) => candidate.fits)) ??
    mostColumns(tries) ??
    ","
  );
}

function isTrue(value: boolean): boolean {
  return value;
}

/**
 * The decimal mark of `"auto"`: the point with the separator `,`;
 * otherwise the comma when more cells below the header and outside the
 * first column are numbers written with a comma than with a point, and
 * the point when not, a file of whole numbers among them.
 */
function findDecimal(table: IndividualsTable, separator: Separator): "." | "," {
  if (separator === ",") return ".";
  let withComma = 0;
  let withPoint = 0;
  for (const row of table.rows) {
    for (const cell of row.slice(1)) {
      if (typeof cell !== "string") continue;
      if (cell.includes(",") && cellNumber(cell, ",") !== null) withComma += 1;
      if (cell.includes(".") && cellNumber(cell, ".") !== null) withPoint += 1;
    }
  }
  return withComma > withPoint ? "," : ".";
}

/** A row as the scanner found it: the line of the file where it starts,
    counted from 1, and its cells. */
interface ScannedRow<C> {
  readonly line: number;
  readonly cells: C[];
}

/** The rows of a text, and the line of the cell whose quote is never
    closed, or null; that cell takes the rest of the text, in the last
    row. */
interface Scanned<C> {
  readonly rows: ScannedRow<C>[];
  readonly unclosedQuoteLine: number | null;
}

/**
 * Where a cell is in the text: the part inside its quotes, when it has
 * them, or the whole cell, and the part after the closing quote. The
 * spaces at the ends are already left out.
 */
interface CellSpan {
  readonly quoted: boolean;
  readonly start: number;
  readonly end: number;
  readonly trailStart: number;
  readonly trailEnd: number;
}

/** The text of a cell: the quotes taken off, a doubled one made one, and
    what follows the closing quote kept. */
function makeCell(text: string, span: CellSpan): string {
  const inner = text.slice(span.start, span.end);
  if (!span.quoted) return inner;
  return (
    inner.replaceAll('""', '"') + text.slice(span.trailStart, span.trailEnd)
  );
}

/** Whether a cell is empty, without making its text. */
function isEmptyCell(_text: string, span: CellSpan): boolean {
  return span.end === span.start && span.trailEnd === span.trailStart;
}

/**
 * Splits `text` into rows of cells with `separator`, each cell given to
 * `cellOf` by its place in the text. The lines end with `\r\n`, `\n` or
 * `\r`, and are counted from 1, those inside a quoted cell too. A cell
 * that starts with `"`, after its spaces, goes on to the next `"` that is
 * not doubled; a `"` elsewhere is an ordinary character. Spaces, and tabs
 * when the separator is not a tab, are left out at the ends of a cell and
 * kept inside its quotes.
 */
function scan<C>(
  text: string,
  separator: Separator,
  cellOf: (text: string, span: CellSpan) => C,
): Scanned<C> {
  const rows: ScannedRow<C>[] = [];
  const length = text.length;
  if (length === 0) return { rows, unclosedQuoteLine: null };
  const separatorCode = separator.charCodeAt(0);
  const isBlank = (code: number): boolean =>
    code === SPACE || (code === TAB && separator !== "\t");
  const endsCell = (code: number): boolean =>
    code === separatorCode || code === LINE_FEED || code === CARRIAGE_RETURN;
  const trimEnd = (start: number, end: number): number => {
    let trimmed = end;
    while (trimmed > start && isBlank(text.charCodeAt(trimmed - 1))) {
      trimmed -= 1;
    }
    return trimmed;
  };

  let position = 0;
  let line = 1;
  for (;;) {
    const rowLine = line;
    const cells: C[] = [];
    for (;;) {
      while (position < length && isBlank(text.charCodeAt(position))) {
        position += 1;
      }
      if (text.charCodeAt(position) === QUOTE) {
        const cellLine = line;
        const start = position + 1;
        position = start;
        let closed = false;
        while (position < length) {
          const code = text.charCodeAt(position);
          if (code === QUOTE) {
            if (text.charCodeAt(position + 1) === QUOTE) {
              position += 2;
              continue;
            }
            closed = true;
            break;
          }
          if (code === CARRIAGE_RETURN) {
            line += 1;
            if (text.charCodeAt(position + 1) === LINE_FEED) position += 1;
          } else if (code === LINE_FEED) {
            line += 1;
          }
          position += 1;
        }
        if (!closed) {
          cells.push(
            cellOf(text, {
              quoted: true,
              start,
              end: length,
              trailStart: length,
              trailEnd: length,
            }),
          );
          rows.push({ line: rowLine, cells });
          return { rows, unclosedQuoteLine: cellLine };
        }
        const end = position;
        position += 1;
        const trailStart = position;
        while (position < length && !endsCell(text.charCodeAt(position))) {
          position += 1;
        }
        const trailEnd = trimEnd(trailStart, position);
        cells.push(
          cellOf(text, { quoted: true, start, end, trailStart, trailEnd }),
        );
      } else {
        const start = position;
        while (position < length && !endsCell(text.charCodeAt(position))) {
          position += 1;
        }
        const end = trimEnd(start, position);
        cells.push(
          cellOf(text, {
            quoted: false,
            start,
            end,
            trailStart: end,
            trailEnd: end,
          }),
        );
      }
      if (text.charCodeAt(position) === separatorCode) {
        position += 1;
        continue;
      }
      break;
    }
    rows.push({ line: rowLine, cells });
    if (position >= length) break;
    if (
      text.charCodeAt(position) === CARRIAGE_RETURN &&
      text.charCodeAt(position + 1) === LINE_FEED
    ) {
      position += 1;
    }
    position += 1;
    line += 1;
    if (position >= length) break;
  }
  return { rows, unclosedQuoteLine: null };
}
