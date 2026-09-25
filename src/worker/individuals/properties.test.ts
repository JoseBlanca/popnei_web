import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { Cell, IndividualsTable, Separator } from "../protocol.ts";
import { inferColumnTypes } from "./columnTypes.ts";
import { readCsv } from "./csv.ts";

const SEPARATORS: readonly Separator[] = [",", ";", "\t"];
const LINE_ENDINGS = ["\n", "\r\n", "\r"] as const;

/** The characters of the texts: letters, digits, an accent, and every
    character the writer has to quote or the reader to trim. */
const CHARACTERS = [
  "a",
  "B",
  "1",
  "é",
  ".",
  ",",
  ";",
  "\t",
  '"',
  " ",
  "\n",
  "\r",
];

/** A text that is not empty and has no space or tab at its ends. */
const text = fc
  .array(fc.constantFrom(...CHARACTERS), { minLength: 1, maxLength: 6 })
  .map((characters) => characters.join(""))
  .filter((value) => !/^[ \t]|[ \t]$/.test(value));

/** A cell outside the first column: missing, or a text that does not read
    as missing. */
const otherCell: fc.Arbitrary<Cell> = fc.oneof(
  fc.constant(null),
  text.filter((value) => value !== "NA" && value !== "-"),
);

/** A table as the reader gives one: distinct names, distinct individuals,
    at least one row, and `minColumns` columns or more. */
function tableArbitrary(minColumns: number): fc.Arbitrary<IndividualsTable> {
  return fc
    .uniqueArray(text, { minLength: minColumns, maxLength: 4 })
    .chain((columns) =>
      fc
        .uniqueArray(text, { minLength: 1, maxLength: 6 })
        .chain((names) =>
          fc.tuple(
            ...names.map((name) =>
              fc
                .array(otherCell, {
                  minLength: columns.length - 1,
                  maxLength: columns.length - 1,
                })
                .map((cells): Cell[] => [name, ...cells]),
            ),
          ),
        )
        .map((rows) => ({ columns, rows })),
    );
}

/** A cell as a CSV writes it: in quotes when it holds the separator, a
    quote or a line break, a quote doubled; a missing cell empty. */
function writeCell(cell: Cell, separator: Separator): string {
  if (cell === null) return "";
  const value = String(cell);
  const needsQuotes = value.includes(separator) || /["\r\n]/.test(value);
  return needsQuotes ? `"${value.replaceAll('"', '""')}"` : value;
}

function writeCsv(
  table: IndividualsTable,
  separator: Separator,
  lineEnding: string,
): string {
  return [table.columns, ...table.rows]
    .map((row) => row.map((cell) => writeCell(cell, separator)).join(separator))
    .join(lineEnding)
    .concat(lineEnding);
}

/** Whether no name and no cell holds any of the three separators. */
function holdsNoSeparator(table: IndividualsTable): boolean {
  return [table.columns, ...table.rows].every((row) =>
    row.every((cell) => cell === null || !/[,;\t]/.test(String(cell))),
  );
}

describe("WS4 D4 the properties of the reader", () => {
  test("a table written as CSV and read with its separator set reads back as itself", () => {
    fc.assert(
      fc.property(
        tableArbitrary(1),
        fc.constantFrom(...SEPARATORS),
        fc.constantFrom(...LINE_ENDINGS),
        (table, separator, lineEnding) => {
          const read = readCsv(writeCsv(table, separator, lineEnding), {
            separator,
            decimal: "auto",
          });
          expect(read.ok && read.value.table).toEqual(table);
        },
      ),
    );
  });

  test("with auto, a table of two columns or more with no separator in its cells finds the one written", () => {
    fc.assert(
      fc.property(
        tableArbitrary(2).filter(holdsNoSeparator),
        fc.constantFrom(...SEPARATORS),
        fc.constantFrom(...LINE_ENDINGS),
        (table, separator, lineEnding) => {
          const read = readCsv(writeCsv(table, separator, lineEnding), {
            separator: "auto",
            decimal: "auto",
          });
          expect(read.ok && read.value.separator).toBe(separator);
          expect(read.ok && read.value.table).toEqual(table);
        },
      ),
    );
  });

  /** A table of values that make every type: numbers, with both marks,
      whole numbers written two ways, the words of known pairs, others. */
  const typedTable: fc.Arbitrary<IndividualsTable> = fc
    .integer({ min: 1, max: 4 })
    .chain((numOther) =>
      fc
        .array(
          fc.array(
            fc.constantFrom<Cell>(
              null,
              "1",
              "01",
              "2",
              "3",
              "1,5",
              "1.5",
              "case",
              "Control",
              "P1",
              "P2",
            ),
            { minLength: numOther, maxLength: numOther },
          ),
          { minLength: 1, maxLength: 8 },
        )
        .map((cells) => ({
          columns: [
            "id",
            ...Array.from(
              { length: numOther },
              (_, index) => `c${String(index)}`,
            ),
          ],
          rows: cells.map((row, index): Cell[] => [
            `i${String(index)}`,
            ...row,
          ]),
        })),
    );

  test("the types do not depend on the order of the rows", () => {
    fc.assert(
      fc.property(
        typedTable.chain((table) =>
          fc.tuple(
            fc.constant(table),
            fc.shuffledSubarray([...table.rows], {
              minLength: table.rows.length,
              maxLength: table.rows.length,
            }),
          ),
        ),
        fc.constantFrom<"." | ",">(".", ","),
        ([table, shuffled], decimal) => {
          expect(
            inferColumnTypes(
              { columns: table.columns, rows: shuffled },
              decimal,
            ),
          ).toEqual(inferColumnTypes(table, decimal));
        },
      ),
    );
  });

  test("the first type is identifier and no other is, and a binary type holds the two values of its column", () => {
    fc.assert(
      fc.property(
        typedTable,
        fc.constantFrom<"." | ",">(".", ","),
        (table, decimal) => {
          const types = inferColumnTypes(table, decimal);
          expect(types).toHaveLength(table.columns.length);
          for (const [index, type] of types.entries()) {
            expect(type.kind === "identifier").toBe(index === 0);
            if (type.kind !== "binary") continue;
            const values = new Set(
              table.rows
                .map((row) => row[index])
                .filter((cell) => cell !== null),
            );
            expect(values).toEqual(new Set([type.one, type.zero]));
            expect(type.one).not.toBe(type.zero);
          }
        },
      ),
    );
  });
});
