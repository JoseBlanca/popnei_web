import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { Cell, IndividualsTable } from "../protocol.ts";
import { cellText, inferColumnTypes } from "./columnTypes.ts";

// The property that a table written as CSV reads back as itself is
// table_io's since 9 October 2026, in its own tests.
describe("WS4 D4 the properties of the reader", () => {
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
                .map((row) => cellText(row[index] ?? null, decimal))
                .filter((text) => text !== null),
            );
            expect(values).toEqual(new Set([type.one, type.zero]));
            expect(type.one).not.toBe(type.zero);
          }
        },
      ),
    );
  });
});

describe("IP4 D2 the types of an xlsx are those of its text", () => {
  /** A cell of an xlsx: missing, a number, a boolean or a text, among
      them texts and numbers written alike. */
  const xlsxCell = fc.constantFrom<Cell>(
    null,
    1,
    "1",
    0,
    "0",
    2,
    1.5,
    "1.5",
    true,
    "true",
    false,
    "P1",
  );

  test("inferColumnTypes of a table of an xlsx equals that of its texts", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 3 })
          .chain((numOther) =>
            fc.array(
              fc.array(xlsxCell, { minLength: numOther, maxLength: numOther }),
              { minLength: 1, maxLength: 8 },
            ),
          ),
        (cells) => {
          const numOther = cells[0]?.length ?? 0;
          const columns = [
            "id",
            ...Array.from(
              { length: numOther },
              (_, index) => `c${String(index)}`,
            ),
          ];
          const table: IndividualsTable = {
            columns,
            rows: cells.map((row, index): Cell[] => [
              `i${String(index)}`,
              ...row,
            ]),
          };
          const texts: IndividualsTable = {
            columns,
            rows: table.rows.map((row) =>
              row.map((cell) => cellText(cell, ".")),
            ),
          };
          expect(inferColumnTypes(table, ".")).toEqual(
            inferColumnTypes(texts, "."),
          );
        },
      ),
    );
  });
});
