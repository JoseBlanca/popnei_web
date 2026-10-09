import { describe, expect, test } from "vitest";
import { MAX_SHEET_CELLS } from "./individuals/sheet.ts";
import { readXlsxCells } from "./xlsxCells.ts";
import type { XlsxReadFields } from "./xlsxCells.ts";

/** An XlsxRead of the files wasm as the test gives it: the fields, with
    those not given empty, and a free() that counts its calls. */
function xlsxRead(fields: Partial<Omit<XlsxReadFields, "free">>): {
  readonly read: XlsxReadFields;
  readonly frees: () => number;
} {
  let frees = 0;
  return {
    read: {
      refusal: "",
      detail: "",
      sheet: "",
      firstRow: 0,
      firstColumn: 0,
      numRows: 0,
      numColumns: 0,
      cells: [],
      ...fields,
      free: () => {
        frees += 1;
      },
    },
    frees: () => frees,
  };
}

/** A readXlsx of the test that gives `read`, and keeps what it was
    called with. */
function giving(read: XlsxReadFields): {
  readonly readXlsx: (bytes: Uint8Array, maxCells: number) => XlsxReadFields;
  readonly calls: [Uint8Array, number][];
} {
  const calls: [Uint8Array, number][] = [];
  return {
    readXlsx: (bytes, maxCells) => {
      calls.push([bytes, maxCells]);
      return read;
    },
    calls,
  };
}

const BYTES = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);

describe("IP9 D1 the xlsx in node: readXlsxCells", () => {
  test("a sheet read gives its cells with the same numbers, calls readXlsx with the bytes and MAX_SHEET_CELLS, and frees the read once", () => {
    const { read, frees } = xlsxRead({
      sheet: "Hoja1",
      firstRow: 3,
      firstColumn: 2,
      numRows: 2,
      numColumns: 2,
      cells: ["id", "pop", "a", 1],
    });
    const { readXlsx, calls } = giving(read);

    expect(readXlsxCells(readXlsx, BYTES)).toEqual({
      kind: "cells",
      cells: {
        sheet: "Hoja1",
        firstRow: 3,
        firstColumn: 2,
        numColumns: 2,
        cells: ["id", "pop", "a", 1],
      },
    });
    expect(calls).toEqual([[BYTES, MAX_SHEET_CELLS]]);
    expect(MAX_SHEET_CELLS).toBe(2_000_000);
    expect(frees()).toBe(1);
  });

  test("the cells null, a text, a number and a boolean cross as they are", () => {
    const { read } = xlsxRead({
      sheet: "S",
      firstRow: 1,
      firstColumn: 1,
      numRows: 1,
      numColumns: 4,
      cells: [null, "x", 1.5, false],
    });
    const cells = readXlsxCells(giving(read).readXlsx, BYTES);
    expect(cells).toMatchObject({
      kind: "cells",
      cells: { cells: [null, "x", 1.5, false] },
    });
  });

  test.each([
    ["notXlsx", {}, { kind: "notWorkbook" }],
    ["oldExcel", {}, { kind: "oldExcel" }],
    ["encrypted", {}, { kind: "encrypted" }],
    ["emptySheet", { sheet: "Hoja1" }, { kind: "emptySheet", sheet: "Hoja1" }],
    [
      "cellError",
      { detail: "#GETTING_DATA" },
      { kind: "cellError", error: "#GETTING_DATA" },
    ],
  ])(
    "the refusal %s gives that refusal, with its fields, and frees the read once",
    (refusal, fields, error) => {
      const { read, frees } = xlsxRead({ refusal, ...fields });
      expect(readXlsxCells(giving(read).readXlsx, BYTES)).toEqual({
        kind: "failed",
        error,
      });
      expect(frees()).toBe(1);
    },
  );

  test("sheetTooLarge from row 1 and column 1, of 123 rows and 16,384 columns, is the last row 123 and the column XFD", () => {
    const { read, frees } = xlsxRead({
      refusal: "sheetTooLarge",
      sheet: "Hoja1",
      firstRow: 1,
      firstColumn: 1,
      numRows: 123,
      numColumns: 16_384,
    });
    expect(readXlsxCells(giving(read).readXlsx, BYTES)).toEqual({
      kind: "failed",
      error: {
        kind: "sheetTooLarge",
        sheet: "Hoja1",
        lastRow: 123,
        lastColumn: "XFD",
        max: MAX_SHEET_CELLS,
      },
    });
    expect(frees()).toBe(1);
  });

  test("sheetTooLarge from C2 gives the last row and column of the sheet, not of the rectangle", () => {
    const { read } = xlsxRead({
      refusal: "sheetTooLarge",
      sheet: "Datos",
      firstRow: 2,
      firstColumn: 3,
      numRows: 199,
      numColumns: 16_382,
    });
    expect(readXlsxCells(giving(read).readXlsx, BYTES)).toMatchObject({
      error: { lastRow: 200, lastColumn: "XFD" },
    });
  });

  test("an Error that readXlsx throws is the refusal files, with its message", () => {
    const readXlsx = (): XlsxReadFields => {
      throw new Error("Zip error");
    };
    expect(readXlsxCells(readXlsx, BYTES)).toEqual({
      kind: "failed",
      error: { kind: "files", message: "Zip error" },
    });
  });

  test("a trap of the wasm, a WebAssembly.RuntimeError, and a throw that is not an Error are thrown on, not made files", () => {
    const trap = new WebAssembly.RuntimeError("unreachable");
    expect(() =>
      readXlsxCells(() => {
        throw trap;
      }, BYTES),
    ).toThrow(trap);
    expect(() =>
      readXlsxCells(() => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- what the test gives readXlsxCells
        throw "not an Error";
      }, BYTES),
    ).toThrow("not an Error");
  });

  test("a code of refusal it does not know is a defect, and the read is still freed once", () => {
    const { read, frees } = xlsxRead({ refusal: "other" });
    expect(() => readXlsxCells(giving(read).readXlsx, BYTES)).toThrow(
      /^popnei_web defect: xlsx_rs gave the refusal "other"/,
    );
    expect(frees()).toBe(1);
  });

  test("cells 3 long for 2 rows of 2 columns are a defect, and the read is still freed once", () => {
    const { read, frees } = xlsxRead({
      sheet: "Hoja1",
      firstRow: 1,
      firstColumn: 1,
      numRows: 2,
      numColumns: 2,
      cells: ["id", "pop", "a"],
    });
    expect(() => readXlsxCells(giving(read).readXlsx, BYTES)).toThrow(
      /^popnei_web defect: xlsx_rs gave 3 cells for a sheet of 2 rows and 2 columns/,
    );
    expect(frees()).toBe(1);
  });

  test.each([[Number.NaN], [Infinity], [undefined], [{}]])(
    "a cell %o, which the package does not declare, is a defect",
    (cell) => {
      const { read, frees } = xlsxRead({
        sheet: "S",
        firstRow: 1,
        firstColumn: 1,
        numRows: 1,
        numColumns: 1,
        cells: [cell],
      });
      expect(() => readXlsxCells(giving(read).readXlsx, BYTES)).toThrow(
        /^popnei_web defect: xlsx_rs gave a cell/,
      );
      expect(frees()).toBe(1);
    },
  );
});
