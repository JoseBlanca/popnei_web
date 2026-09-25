import { describe, expect, test } from "vitest";
import type { IndividualsFileError } from "../protocol.ts";
import { readCsv } from "./csv.ts";
import type { CsvRead } from "./csv.ts";

const AUTO = { separator: "auto", decimal: "auto" } as const;

/** The read of `text`, which the test expects to succeed. */
function readOk(
  text: string,
  options: Parameters<typeof readCsv>[1] = AUTO,
): CsvRead {
  const result = readCsv(text, options);
  if (!result.ok) {
    throw new Error(`the read failed: ${JSON.stringify(result.error)}`);
  }
  return result.value;
}

/** The refusal of `text`, which the test expects to fail. */
function readError(
  text: string,
  options: Parameters<typeof readCsv>[1] = AUTO,
): IndividualsFileError {
  const result = readCsv(text, options);
  if (result.ok) {
    throw new Error(`the read succeeded: ${JSON.stringify(result.value)}`);
  }
  return result.error;
}

describe("WS4 D1 readCsv", () => {
  describe("the table of cases of the reader spec", () => {
    test("a CSV of commas is read with , and ., and P1/P2 is binary with P2 as 1", () => {
      expect(readOk("id,pop\nA,P1\nB,P2\nC,P1\n")).toEqual({
        table: {
          columns: ["id", "pop"],
          rows: [
            ["A", "P1"],
            ["B", "P2"],
            ["C", "P1"],
          ],
        },
        columns: [
          { kind: "identifier" },
          { kind: "binary", one: "P2", zero: "P1" },
        ],
        separator: ",",
        decimal: ".",
      });
    });

    test("a file of tabs is read with the tab", () => {
      expect(readOk("id\tpop\nA\tP1\n")).toEqual({
        table: { columns: ["id", "pop"], rows: [["A", "P1"]] },
        columns: [{ kind: "identifier" }, { kind: "categorical" }],
        separator: "\t",
        decimal: ".",
      });
    });

    test("a file of ; with decimal commas is read with ; and , and h is continuous", () => {
      expect(readOk("id;h\nA;1,5\nB;1,7\nC;1,9\n")).toEqual({
        table: {
          columns: ["id", "h"],
          rows: [
            ["A", "1,5"],
            ["B", "1,7"],
            ["C", "1,9"],
          ],
        },
        columns: [{ kind: "identifier" }, { kind: "continuous" }],
        separator: ";",
        decimal: ",",
      });
    });

    test("a file that mixes 1.5 with 1,7 and 1,9 takes the comma, and h is categorical", () => {
      const read = readOk("id;h\nA;1.5\nB;1,7\nC;1,9\n");
      expect(read.separator).toBe(";");
      expect(read.decimal).toBe(",");
      expect(read.columns).toEqual([
        { kind: "identifier" },
        { kind: "categorical" },
      ]);
    });

    test("the identifiers 001, 002 and 003 stay text as written", () => {
      const read = readOk("id,x\n001,1\n002,2\n003,3\n");
      expect(read.table.rows.map((row) => row[0])).toEqual([
        "001",
        "002",
        "003",
      ]);
      expect(read.columns).toEqual([
        { kind: "identifier" },
        { kind: "continuous" },
      ]);
    });

    test("an empty cell and NA are missing, and case/control is binary with case as 1", () => {
      const read = readOk("id,st\nA,case\nB,control\nC,\nD,NA\n");
      expect(read.table.rows).toEqual([
        ["A", "case"],
        ["B", "control"],
        ["C", null],
        ["D", null],
      ]);
      expect(read.columns[1]).toEqual({
        kind: "binary",
        one: "case",
        zero: "control",
      });
    });

    test("the numbers 1 and 2 are binary with the text 2 as 1", () => {
      expect(readOk("id,g\nA,1\nB,2\n").columns[1]).toEqual({
        kind: "binary",
        one: "2",
        zero: "1",
      });
    });

    test("four whole numbers from 1 to 5 are continuous", () => {
      const read = readOk("id,s\nA,1\nB,2\nC,3\nD,5\n");
      expect(read.columns[1]).toEqual({ kind: "continuous" });
      expect(read.table.columns).toEqual(["id", "s"]);
    });

    test("a quoted cell holds the separator and a doubled quote", () => {
      expect(readOk('id,n\nA,"x, y"\nB,"say ""hi"""\n').table.rows).toEqual([
        ["A", "x, y"],
        ["B", 'say "hi"'],
      ]);
    });

    test("the line endings \\r\\n and \\r give the table of \\n, the blank line skipped", () => {
      const expected: CsvRead = {
        table: {
          columns: ["id", "n"],
          rows: [
            ["A", "1"],
            ["B", "2"],
          ],
        },
        columns: [
          { kind: "identifier" },
          { kind: "binary", one: "2", zero: "1" },
        ],
        separator: ",",
        decimal: ".",
      };
      expect(readOk("id,n\nA,1\n\nB,2\n")).toEqual(expected);
      expect(readOk("id,n\r\nA,1\r\n\r\nB,2\r\n")).toEqual(expected);
      expect(readOk("id,n\rA,1\r\rB,2\r")).toEqual(expected);
    });

    test("the empty columns of trailing separators are dropped", () => {
      const read = readOk("id;pop;;\nA;P1;;\n");
      expect(read.separator).toBe(";");
      expect(read.table).toEqual({
        columns: ["id", "pop"],
        rows: [["A", "P1"]],
      });
      expect(read.columns).toHaveLength(2);
    });

    test("a row shorter than the header is a raggedRow on its line", () => {
      expect(readError("id,pop\nA,P1\nB\n")).toEqual({
        kind: "raggedRow",
        line: 3,
        expected: 2,
        found: 1,
        separator: ",",
      });
    });

    test("a row with no name in its first cell is an emptyIndividual", () => {
      expect(readError("id,pop\n,P1\n")).toEqual({
        kind: "emptyIndividual",
        line: 2,
      });
    });

    test("an individual in two rows is a duplicateIndividual", () => {
      expect(readError("id,pop\nA,P1\nA,P2\n")).toEqual({
        kind: "duplicateIndividual",
        name: "A",
      });
    });

    test("two columns of one name are a duplicateColumn", () => {
      expect(readError("id,pop,pop\nA,1,2\n")).toEqual({
        kind: "duplicateColumn",
        name: "pop",
      });
    });

    test("a column with values and no name is an unnamedColumn, counted from 1", () => {
      expect(readError("id,,pop\nA,1,P1\n")).toEqual({
        kind: "unnamedColumn",
        column: 2,
      });
    });

    test("a quote never closed is an unclosedQuote at the line of its cell", () => {
      expect(
        readError('id,pop\nA,"P1\nB,P2\n', { separator: ",", decimal: "auto" }),
      ).toEqual({ kind: "unclosedQuote", line: 2, separator: "," });
    });

    test("a header alone, and the empty text, are empty", () => {
      expect(readError("id,pop\n")).toEqual({ kind: "empty" });
      expect(readError("")).toEqual({ kind: "empty" });
    });

    test("the BOM of UTF-8 at the start of the text is not part of the first name", () => {
      expect(readOk("﻿id,pop\nA,P1\n").table.columns).toEqual(["id", "pop"]);
    });

    test("when the tab and ; both fit with two cells, the tab is taken", () => {
      const read = readOk("id;n\tx\nA;1\t2\n");
      expect(read.separator).toBe("\t");
      expect(read.table).toEqual({
        columns: ["id;n", "x"],
        rows: [["A;1", "2"]],
      });
    });

    test("when no separator fits, the one of the most cells in the header is used and the row refused", () => {
      expect(readError("id,pop\nA,P1\nB,P2,P3\n")).toEqual({
        kind: "raggedRow",
        line: 3,
        expected: 2,
        found: 3,
        separator: ",",
      });
    });

    test("the line of a row counts the lines inside a quoted cell above it", () => {
      expect(readError('id,n\nA,"x\ny"\nB,1,2\n')).toEqual({
        kind: "raggedRow",
        line: 4,
        expected: 2,
        found: 3,
        separator: ",",
      });
    });

    test("a file of one column is read with , as one column", () => {
      expect(readOk("only\nA\nB\n")).toEqual({
        table: { columns: ["only"], rows: [["A"], ["B"]] },
        columns: [{ kind: "identifier" }],
        separator: ",",
        decimal: ".",
      });
    });
  });

  describe("the rest of the rules of the rows and the cells", () => {
    test("spaces at the ends of a cell are removed, and inside quotes kept", () => {
      expect(
        readOk('id,pop\nind_01, pop1 \nind_02, " p 2 "\n').table.rows,
      ).toEqual([
        ["ind_01", "pop1"],
        ["ind_02", " p 2 "],
      ]);
    });

    test("tabs at the ends of a cell are removed when the separator is not a tab", () => {
      expect(
        readOk("id;pop\nA;\tP1\t\n", { separator: ";", decimal: "auto" }).table
          .rows,
      ).toEqual([["A", "P1"]]);
    });

    test("what follows a closing quote is part of the cell, and a quote inside a cell is a character", () => {
      expect(readOk('id,n\nA,"x"y\nB,a"b\n').table.rows).toEqual([
        ["A", "xy"],
        ["B", 'a"b'],
      ]);
    });

    test("a quoted cell keeps its line break", () => {
      expect(readOk('id,n\nA,"x\r\ny"\n').table.rows).toEqual([
        ["A", "x\r\ny"],
      ]);
    });

    test("NA and - are missing quoted or not, and na, N/A and NaN are text", () => {
      expect(
        readOk('id,v\nA,"NA"\nB,-\nC,na\nD,N/A\nE,NaN\n').table.rows,
      ).toEqual([
        ["A", null],
        ["B", null],
        ["C", "na"],
        ["D", "N/A"],
        ["E", "NaN"],
      ]);
    });

    test("NA and - in the first column are names, and NA in the header a name", () => {
      expect(readOk("NA,pop\nNA,P1\n-,P2\n").table).toEqual({
        columns: ["NA", "pop"],
        rows: [
          ["NA", "P1"],
          ["-", "P2"],
        ],
      });
    });

    test("the first column is kept with an empty name", () => {
      expect(readOk(",pop\nA,P1\n").table.columns).toEqual(["", "pop"]);
    });

    test("a row of empty cells is skipped wherever it is, above the header too", () => {
      expect(readOk(";;\nid;pop\n;;\nA;P1\n\n").table).toEqual({
        columns: ["id", "pop"],
        rows: [["A", "P1"]],
      });
    });

    test("a row with more cells, all empty past the header, is read", () => {
      expect(readOk("id,pop\nA,P1,,\n").table.rows).toEqual([["A", "P1"]]);
    });

    test("names are compared exactly: Ind_1 and ind_1 are two", () => {
      expect(readOk("id,pop\nInd_1,P1\nind_1,P2\n").table.rows).toHaveLength(2);
    });

    test("a set separator is used, and a Spanish file of ; is found", () => {
      const text =
        "Individuo;Población;Altura\nind_001;España;1,75\nind_002;Italia;1,82\n";
      const found = readOk(text);
      expect(found.separator).toBe(";");
      expect(found.decimal).toBe(",");
      expect(found.table.columns).toEqual(["Individuo", "Población", "Altura"]);
      // Read with the comma, the decimal comma of 1,75 splits the row.
      expect(readError(text, { separator: ",", decimal: "auto" })).toEqual({
        kind: "raggedRow",
        line: 2,
        expected: 1,
        found: 2,
        separator: ",",
      });
    });

    test("a decimal comma with the separator , needs quotes, and is read", () => {
      const read = readOk('id,h\nA,"1,5"\nB,"1,7"\nC,"1,9"\n', {
        separator: ",",
        decimal: ",",
      });
      expect(read.decimal).toBe(",");
      expect(read.columns[1]).toEqual({ kind: "continuous" });
    });

    test("with the separator , the decimal mark auto is the point", () => {
      expect(readOk('id,h\nA,"1,5"\nB,"1,7"\nC,"1,9"\n').decimal).toBe(".");
    });

    test("the order of the refusals: a ragged row before an unnamed column", () => {
      expect(readError("id,,pop\nA,1,P1\nB,2\n")).toEqual({
        kind: "raggedRow",
        line: 3,
        expected: 3,
        found: 2,
        separator: ",",
      });
    });

    test("the order of the refusals: an unnamed column before a duplicate one", () => {
      expect(readError("id,pop,pop,\nA,1,2,3\n")).toEqual({
        kind: "unnamedColumn",
        column: 4,
      });
    });

    test("the order of the refusals: the rows in the order of the file", () => {
      expect(readError("id,pop\nA,P1\nA,P2\n,P3\n")).toEqual({
        kind: "duplicateIndividual",
        name: "A",
      });
    });

    test("an unclosed quote found with auto names the separator taken", () => {
      // No separator fits; ; gives the header the most cells.
      expect(readError('id;pop\nA;"P1\nB;P2\n')).toEqual({
        kind: "unclosedQuote",
        line: 2,
        separator: ";",
      });
    });

    test("a title line of three cells over the header is an unnamedColumn", () => {
      expect(readError("Tabla 1;;\nid;pop;h\nA;P1;1,5\n")).toEqual({
        kind: "unnamedColumn",
        column: 2,
      });
    });
  });
});
