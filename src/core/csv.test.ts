/**
 * The CSV of a table and of the bins of a histogram, and the names of
 * the downloaded files (docs/specs/widgets/downloads.md, "How it is
 * verified", with Vitest in node).
 */
import { describe, expect, test } from "vitest";

import { binsCsv, downloadName, tableCsv } from "./csv.ts";

describe("AP5 D1 the CSV of a table, of the bins of a histogram, and the names of the files", () => {
  test("a table is written with its values in full, its texts quoted and guarded, and an empty field for null and NaN", () => {
    expect(
      tableCsv(
        ["individual", "PC1"],
        [
          ["s000", -0.7138853335304419],
          ['a,"b"', null],
          ["=x", NaN],
          ["-A12", 1e-7],
        ],
      ),
    ).toBe(
      'individual,PC1\ns000,-0.7138853335304419\n"a,""b""",\n\'=x,\n\'-A12,1e-7\n',
    );
  });

  test("a yes or no is written true or false, and an infinity as String writes it", () => {
    expect(
      tableCsv(
        ["name", "tall", "ratio"],
        [
          ["p1", true, Infinity],
          ["p2", false, -Infinity],
        ],
      ),
    ).toBe("name,tall,ratio\np1,true,Infinity\np2,false,-Infinity\n");
  });

  test("a header with its labels quoted as any text, and no row, is the header alone", () => {
    expect(tableCsv(["Missing, %", "name"], [])).toBe('"Missing, %",name\n');
  });

  test("a row of three fields under a header of two is a defect", () => {
    expect(() => tableCsv(["a", "b"], [["1", "2", "3"]])).toThrow(
      /popnei_web defect/u,
    );
  });

  test("a row of one field under a header of two is a defect", () => {
    expect(() => tableCsv(["a", "b"], [["1"]])).toThrow(/popnei_web defect/u);
  });

  test("the bins of a histogram are a row each, with their edges and counts", () => {
    expect(
      binsCsv(new Float64Array([0, 0.5, 1]), new Uint32Array([3, 4]), null),
    ).toBe("left_edge,right_edge,count\n0,0.5,3\n0.5,1,4\n");
  });

  test("the values in no bin are a last row with empty edges", () => {
    expect(
      binsCsv(new Float64Array([0, 0.5, 1]), new Float64Array([3, 4]), 2),
    ).toBe("left_edge,right_edge,count\n0,0.5,3\n0.5,1,4\n,,2\n");
  });

  test("edges that are not one more than the counts are a defect", () => {
    expect(() =>
      binsCsv(new Float64Array([0, 1]), new Uint32Array([3, 4]), null),
    ).toThrow(/popnei_web defect/u);
  });

  test("the name of a file is the stem, what is downloaded and the extension, joined by dots", () => {
    expect(downloadName("panel", "pca.coordinates", "csv")).toBe(
      "panel.pca.coordinates.csv",
    );
    expect(downloadName("panel_pops", "table", "csv")).toBe(
      "panel_pops.table.csv",
    );
    expect(downloadName("panel", "maf_variants", "png")).toBe(
      "panel.maf_variants.png",
    );
  });
});
