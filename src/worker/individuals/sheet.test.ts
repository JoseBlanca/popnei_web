import { describe, expect, test } from "vitest";
import { columnLetters } from "./columnTypes.ts";
import { readSheet } from "./sheet.ts";
import type { SheetCell, SheetCells } from "./sheet.ts";

/** The rectangle of these rows, from row `firstRow` and column
    `firstColumn`, 1 unless given. */
function sheetOf(
  rows: readonly (readonly SheetCell[])[],
  at: { readonly firstRow?: number; readonly firstColumn?: number } = {},
): SheetCells {
  const numColumns = rows[0]?.length ?? 1;
  return {
    sheet: "Hoja1",
    firstRow: at.firstRow ?? 1,
    firstColumn: at.firstColumn ?? 1,
    numColumns,
    cells: rows.flat(),
  };
}

/** The table and the types of a read that the test expects to succeed. */
function read(sheet: SheetCells) {
  const result = readSheet(sheet);
  if (!result.ok) {
    throw new Error(`refused: ${JSON.stringify(result.error)}`);
  }
  return result.value;
}

describe("IP9 D1 the xlsx in node: readSheet", () => {
  test("numbers in the first column are names as String writes them, and pop is binary", () => {
    const { table, columns } = read(
      sheetOf([
        ["id", "pop"],
        [1, "P1"],
        [2, "P2"],
        [3, "P1"],
      ]),
    );
    expect(table.rows.map((row) => row[0])).toEqual(["1", "2", "3"]);
    expect(columns).toEqual([
      { kind: "identifier" },
      { kind: "binary", one: "P2", zero: "P1" },
    ]);
  });

  test("a column of numbers and a text 1.8 is continuous, each cell as it was", () => {
    const { table, columns } = read(
      sheetOf([
        ["id", "h"],
        ["A", 1.75],
        ["B", "1.8"],
        ["C", 1.69],
      ]),
    );
    expect(table.rows.map((row) => row[1])).toEqual([1.75, "1.8", 1.69]);
    expect(columns[1]).toEqual({ kind: "continuous" });
  });

  test("the number 1 and the text 1 are one value: g is binary, one 1, zero 0", () => {
    const { columns } = read(
      sheetOf([
        ["id", "g"],
        ["A", 1],
        ["B", "1"],
        ["C", 0],
      ]),
    );
    expect(columns[1]).toEqual({ kind: "binary", one: "1", zero: "0" });
  });

  test("a text 1,75 is text in an xlsx, and h is categorical", () => {
    const { columns } = read(
      sheetOf([
        ["id", "h"],
        ["A", "1,75"],
        ["B", 1.8],
        ["C", 1.7],
      ]),
    );
    expect(columns[1]).toEqual({ kind: "categorical" });
  });

  test("booleans are binary, one true, zero false", () => {
    const { columns } = read(
      sheetOf([
        ["id", "ok"],
        ["A", true],
        ["B", false],
      ]),
    );
    expect(columns[1]).toEqual({ kind: "binary", one: "true", zero: "false" });
  });

  test("a header of the number 2024 names its column 2024", () => {
    const { table } = read(
      sheetOf([
        ["id", 2024],
        ["A", 1],
      ]),
    );
    expect(table.columns).toEqual(["id", "2024"]);
  });

  test("a text has its spaces at the ends removed, and NA and spaces alone are missing", () => {
    const { table } = read(
      sheetOf([
        ["id", "pop"],
        ["A", " P1 "],
        ["B", "NA"],
        ["C", "  "],
        [" D\t", "-"],
      ]),
    );
    expect(table.rows).toEqual([
      ["A", "P1"],
      ["B", null],
      ["C", null],
      ["D", null],
    ]);
  });

  test("a row named NA whose other cells are all missing is kept, NA a name", () => {
    const { table } = read(
      sheetOf([
        ["id", "pop"],
        ["NA", "#N/A"],
        ["B", "P1"],
      ]),
    );
    expect(table.rows).toEqual([
      ["NA", null],
      ["B", "P1"],
    ]);
  });

  test("a blank row is skipped", () => {
    const { table } = read(
      sheetOf([
        ["id", "pop"],
        [null, null],
        ["A", "P1"],
      ]),
    );
    expect(table.rows).toEqual([["A", "P1"]]);
  });

  test("a blank row before the header is skipped, and the header is the first row that is not blank", () => {
    const { table } = read(
      sheetOf([
        [null, " "],
        ["id", "pop"],
        ["A", "P1"],
      ]),
    );
    expect(table.columns).toEqual(["id", "pop"]);
  });

  test("an empty cell at the end of the header over no value is dropped", () => {
    const { table } = read(
      sheetOf([
        ["id", "pop", null],
        ["A", "P1", null],
      ]),
    );
    expect(table.columns).toEqual(["id", "pop"]);
    expect(table.rows).toEqual([["A", "P1"]]);
  });

  test("a column with no name and a value is unnamedColumn, the column D of the sheet", () => {
    expect(
      readSheet(
        sheetOf(
          [
            ["id", null, "pop"],
            ["A", "x", "P1"],
          ],
          { firstColumn: 3, firstRow: 5 },
        ),
      ),
    ).toEqual({ ok: false, error: { kind: "unnamedColumn", column: 4 } });
  });

  test("an empty cell at the end of the header over a value is unnamedColumn, the column of the sheet", () => {
    expect(
      readSheet(
        sheetOf(
          [
            ["id", "pop", null],
            ["A", "P1", 3],
          ],
          { firstColumn: 2 },
        ),
      ),
    ).toEqual({ ok: false, error: { kind: "unnamedColumn", column: 4 } });
  });

  test("a row with no name is emptyIndividual, the row of the sheet", () => {
    expect(
      readSheet(
        sheetOf(
          [
            ["id", "pop"],
            [null, "P1"],
          ],
          { firstRow: 5 },
        ),
      ),
    ).toEqual({ ok: false, error: { kind: "emptyIndividual", line: 6 } });
  });

  test("a blank row counts in the rows of the sheet that a refusal names", () => {
    expect(
      readSheet(
        sheetOf([
          ["id", "pop"],
          [null, null],
          ["A", "P1"],
          ["  ", "P2"],
        ]),
      ),
    ).toEqual({ ok: false, error: { kind: "emptyIndividual", line: 4 } });
  });

  test("the number 1 and the text 1 are one individual, duplicateIndividual 1", () => {
    expect(
      readSheet(
        sheetOf([
          ["id", "pop"],
          [1, "P1"],
          ["1", "P2"],
        ]),
      ),
    ).toEqual({
      ok: false,
      error: { kind: "duplicateIndividual", name: "1" },
    });
  });

  test("two columns named 2024, one a number and one a text, are duplicateColumn", () => {
    expect(
      readSheet(
        sheetOf([
          ["id", 2024, "2024"],
          ["A", 1, 2],
        ]),
      ),
    ).toEqual({ ok: false, error: { kind: "duplicateColumn", name: "2024" } });
  });

  test("a header alone is empty", () => {
    expect(readSheet(sheetOf([["id", "pop"]]))).toEqual({
      ok: false,
      error: { kind: "empty" },
    });
  });

  test("#N/A names a column in the header, and is missing below it", () => {
    const { table } = read(
      sheetOf([
        ["id", "#N/A"],
        ["A", "#N/A"],
      ]),
    );
    expect(table.columns).toEqual(["id", "#N/A"]);
    expect(table.rows).toEqual([["A", null]]);
  });

  test("#DIV/0! is missing, and h stays continuous", () => {
    const { table, columns } = read(
      sheetOf([
        ["id", "h"],
        ["A", "#DIV/0!"],
        ["B", 1.5],
        ["C", 1.6],
        ["D", 1.7],
      ]),
    );
    expect(table.rows[0]).toEqual(["A", null]);
    expect(columns[1]).toEqual({ kind: "continuous" });
  });

  test("#NAME?, #NULL!, #NUM!, #REF! and #VALUE! are missing", () => {
    const { table } = read(
      sheetOf([
        ["id", "h"],
        ["A", "#NAME?"],
        ["B", "#NULL!"],
        ["C", "#NUM!"],
        ["D", "#REF!"],
        ["E", "#VALUE!"],
        ["F", 1.5],
      ]),
    );
    expect(table.rows.map((row) => row[1])).toEqual([
      null,
      null,
      null,
      null,
      null,
      1.5,
    ]);
  });

  test("an error with spaces around it is missing, and an error of another text, #SPILL!, is a value", () => {
    const { table } = read(
      sheetOf([
        ["id", "h"],
        ["A", " #N/A "],
        ["B", "#SPILL!"],
        ["C", "#n/a"],
      ]),
    );
    expect(table.rows.map((row) => row[1])).toEqual([null, "#SPILL!", "#n/a"]);
  });

  test("the individuals #N/A and #REF! are names", () => {
    const { table } = read(
      sheetOf([
        ["id", "h"],
        ["#N/A", 1.5],
        ["#REF!", 2.5],
      ]),
    );
    expect(table.rows.map((row) => row[0])).toEqual(["#N/A", "#REF!"]);
  });

  test("a date of the files wasm is text, and a column of dates categorical", () => {
    const { table, columns } = read(
      sheetOf([
        ["id", "date"],
        ["A", "2024-05-13"],
        ["B", "2024-05-14"],
        ["C", "2024-05-15"],
      ]),
    );
    expect(table.rows[0]).toEqual(["A", "2024-05-13"]);
    expect(columns[1]).toEqual({ kind: "categorical" });
  });

  test("cells that are not a whole number of rows are a defect", () => {
    expect(() =>
      readSheet({
        sheet: "Hoja1",
        firstRow: 1,
        firstColumn: 1,
        numColumns: 2,
        cells: ["id", "pop", "A"],
      }),
    ).toThrow(
      /^popnei_web defect: the sheet Hoja1 has 3 cells, not a whole number of rows of 2 columns/,
    );
    expect(() =>
      readSheet({
        sheet: "Hoja1",
        firstRow: 1,
        firstColumn: 1,
        numColumns: 0,
        cells: [],
      }),
    ).toThrow(/^popnei_web defect: /);
  });
});

describe("IP9 D1 the xlsx in node: columnLetters", () => {
  test.each([
    [1, "A"],
    [4, "D"],
    [26, "Z"],
    [27, "AA"],
    [52, "AZ"],
    [53, "BA"],
    [702, "ZZ"],
    [703, "AAA"],
    [16_384, "XFD"],
  ])("column %i is %s", (column, letters) => {
    expect(columnLetters(column)).toBe(letters);
  });

  test("a column below 1, or not whole, is a defect", () => {
    expect(() => columnLetters(0)).toThrow(/^popnei_web defect: /);
    expect(() => columnLetters(1.5)).toThrow(/^popnei_web defect: /);
  });
});

describe("IP10 D3 the cases of the reader spec: an xlsx", () => {
  test("a column of heights with one text n.d. is categorical, and n.d. a value of it", () => {
    const { table, columns } = read(
      sheetOf([
        ["id", "h"],
        ["A", 1.75],
        ["B", "n.d."],
        ["C", 1.69],
        ["D", 1.8],
      ]),
    );
    expect(table.rows[1]).toEqual(["B", "n.d."]);
    expect(columns[1]).toEqual({ kind: "categorical" });
  });

  test("a column of heights with #N/A in the place of n.d., typed as text or an error of Excel, is continuous, that individual with no height", () => {
    const { table, columns } = read(
      sheetOf([
        ["id", "h"],
        ["A", 1.75],
        ["B", "#N/A"],
        ["C", 1.69],
        ["D", 1.8],
      ]),
    );
    expect(table.rows[1]).toEqual(["B", null]);
    expect(columns[1]).toEqual({ kind: "continuous" });
  });

  test("a column of years typed as numbers is continuous, each year a number", () => {
    const { table, columns } = read(
      sheetOf([
        ["id", "year"],
        ["A", 2019],
        ["B", 2021],
        ["C", 2024],
      ]),
    );
    expect(table.rows.map((row) => row[1])).toEqual([2019, 2021, 2024]);
    expect(columns[1]).toEqual({ kind: "continuous" });
  });
});
