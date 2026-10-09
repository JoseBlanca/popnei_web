/**
 * The table of the individuals file under the tab "Individuals file" of
 * popgen2.html, as the sortable table takes it
 * (docs/specs/steps/popgen2-input.md, "The table"): every column and row
 * of the file in its order, each cell as `cellShown` writes it, and the
 * sort by a column, numbers by value, texts by their code units, missing
 * values last.
 */
import { describe, expect, test } from "vitest";

import type { TableRead } from "../../core/project.ts";
import type { Cell, IndividualsTable } from "../../worker/protocol.ts";
import {
  individualsTableColumns,
  individualsTableRows,
  sortedTableRows,
} from "./individualsTable.ts";

/** A read of `table` with the decimal mark `decimal`, its first column
    the names, the others categorical. */
function readOf(table: IndividualsTable, decimal: "." | ","): TableRead {
  return {
    kind: "read",
    table,
    columns: table.columns.map((_, index) =>
      index === 0 ? { kind: "identifier" } : { kind: "categorical" },
    ),
    found: {
      encoding: "utf-8",
      separator: decimal === "," ? ";" : ",",
      decimal,
      undecodedLine: null,
    },
  };
}

const TABLE: IndividualsTable = {
  columns: ["IID", "pop", "h", "ok"],
  rows: [
    ["s1", "b", 10, true],
    ["s2", "B", 9, false],
    ["s3", null, 1.75, null],
    ["s4", "a", null, true],
  ] satisfies Cell[][],
};

/** The names of `rows`, in their order. */
function namesOf(rows: readonly { readonly id: string }[]): string[] {
  return rows.map((row) => row.id);
}

describe("IN6 D1 the table of the individuals file", () => {
  test("a header and a cell with U+202E, which turns the text after it around, and a tab show them escaped, as the list and the counts do; the sort reads the cells as the file holds them", () => {
    const table: IndividualsTable = {
      columns: ["IID", "pop\u202eulation"],
      rows: [
        ["s\u202e1", "b\tc"],
        ["s2", "a\u202e"],
      ] satisfies Cell[][],
    };
    const read = readOf(table, ".");
    expect(individualsTableColumns(read).map((c) => c.label)).toEqual([
      "IID",
      "pop\\u202eulation",
    ]);
    const rows = individualsTableRows(read);
    expect(rows.map((row) => row.cells)).toEqual([
      ["s\\u202e1", "b\\tc"],
      ["s2", "a\\u202e"],
    ]);
    expect(
      namesOf(
        sortedTableRows(read, rows, { column: "c1", direction: "ascending" }),
      ),
    ).toEqual(["s2", "s\u202e1"]);
  });

  test("every column in the order of the file, the first the header of each row, a column of numbers aligned as numbers", () => {
    const columns = individualsTableColumns(readOf(TABLE, "."));
    expect(columns.map((c) => c.label)).toEqual(["IID", "pop", "h", "ok"]);
    expect(columns.map((c) => c.isRowHeader === true)).toEqual([
      true,
      false,
      false,
      false,
    ]);
    expect(columns.map((c) => c.isNumeric === true)).toEqual([
      false,
      false,
      true,
      false,
    ]);
    expect(new Set(columns.map((c) => c.id)).size).toBe(4);
  });

  test("a column is as wide as its whole header on one line in bold, with its padding and the arrow, and not narrower than 96 pixels", () => {
    const table: IndividualsTable = {
      columns: ["IID", "Individuo", "Fecha de muestreo"],
      rows: [["s1", "a", "b"]] satisfies Cell[][],
    };
    expect(
      individualsTableColumns(readOf(table, ".")).map((c) => c.minWidth),
    ).toEqual([96, 130, 210]);
  });

  test("every row in the order of the file, a missing value empty, a number with the decimal mark of the read, a boolean true or false", () => {
    const rows = individualsTableRows(readOf(TABLE, ","));
    expect(namesOf(rows)).toEqual(["s1", "s2", "s3", "s4"]);
    expect(rows.map((row) => row.cells)).toEqual([
      ["s1", "b", "10", "true"],
      ["s2", "B", "9", "false"],
      ["s3", "", "1,75", ""],
      ["s4", "a", "", "true"],
    ]);
  });

  test("the same rows, the same objects, for the same read", () => {
    const read = readOf(TABLE, ".");
    expect(individualsTableRows(read)).toBe(individualsTableRows(read));
  });

  test("no sort gives the rows of the file in their order", () => {
    const read = readOf(TABLE, ".");
    const rows = individualsTableRows(read);
    expect(sortedTableRows(read, rows, null)).toBe(rows);
  });

  test("a column of numbers sorts by value, up then down, the missing value last both ways", () => {
    const read = readOf(TABLE, ".");
    const rows = individualsTableRows(read);
    const h = individualsTableColumns(read)[2]?.id;
    if (h === undefined) throw new Error("no third column");
    expect(
      namesOf(
        sortedTableRows(read, rows, { column: h, direction: "ascending" }),
      ),
    ).toEqual(["s3", "s2", "s1", "s4"]);
    expect(
      namesOf(
        sortedTableRows(read, rows, { column: h, direction: "descending" }),
      ),
    ).toEqual(["s1", "s2", "s3", "s4"]);
  });

  test("a column of texts sorts by code units, capitals before small letters, the missing value last", () => {
    const read = readOf(TABLE, ".");
    const rows = individualsTableRows(read);
    const pop = individualsTableColumns(read)[1]?.id;
    if (pop === undefined) throw new Error("no second column");
    expect(
      namesOf(
        sortedTableRows(read, rows, { column: pop, direction: "ascending" }),
      ),
    ).toEqual(["s2", "s4", "s1", "s3"]);
    expect(
      namesOf(
        sortedTableRows(read, rows, { column: pop, direction: "descending" }),
      ),
    ).toEqual(["s1", "s4", "s2", "s3"]);
  });

  test("a sort keeps the row objects, and keeps the order of the file between equal values", () => {
    const read = readOf(TABLE, ".");
    const rows = individualsTableRows(read);
    const ok = individualsTableColumns(read)[3]?.id;
    if (ok === undefined) throw new Error("no fourth column");
    const sorted = sortedTableRows(read, rows, {
      column: ok,
      direction: "ascending",
    });
    expect(namesOf(sorted)).toEqual(["s2", "s1", "s4", "s3"]);
    expect(sorted[1]).toBe(rows[0]);
  });
});
