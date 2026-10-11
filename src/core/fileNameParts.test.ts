import { describe, expect, test } from "vitest";

import { fileNameParts } from "./fileNameParts.ts";
import { downloadName } from "./fileNames.ts";

describe("PT2 D1 the names of populations made parts of file names", () => {
  test("every character other than a letter, a digit, - and _ is written _, and a name an earlier one gave gets _2", () => {
    expect(fileNameParts(["p0", "a/b", "a?b", "é"])).toEqual([
      "p0",
      "a_b",
      "a_b_2",
      "é",
    ]);
  });

  test("letters of another alphabet, digits, - and _ are kept; spaces and dots are written _", () => {
    expect(fileNameParts(["日本", "Ωμέγα", "p-1_b", "pop 1", "p.1"])).toEqual([
      "日本",
      "Ωμέγα",
      "p-1_b",
      "pop_1",
      "p_1",
    ]);
  });

  test("a third name that gives the same part gets _3, and a name that is itself an earlier _2 is not given twice", () => {
    expect(fileNameParts(["a b", "a/b", "a?b"])).toEqual([
      "a_b",
      "a_b_2",
      "a_b_3",
    ]);
    expect(fileNameParts(["a_b", "a/b", "a_b_2"])).toEqual([
      "a_b",
      "a_b_2",
      "a_b_2_2",
    ]);
  });

  test("the names of a histogram of the spectrum", () => {
    const [p0] = fileNameParts(["p0"]);
    expect(downloadName("panel", `sfs.${p0 ?? ""}`, "svg")).toBe(
      "panel.sfs.p0.svg",
    );
  });

  test("two names that differ only in case give different parts, since macOS and Windows hold one file for both", () => {
    expect(fileNameParts(["P1", "p1", "A/b", "a?B"])).toEqual([
      "P1",
      "p1_2",
      "A_b",
      "a_B_2",
    ]);
    expect(fileNameParts(["Ωμέγα", "ΩΜΈΓΑ"])).toEqual(["Ωμέγα", "ΩΜΈΓΑ_2"]);
  });

  test("a name given by an earlier one in another case is not given twice", () => {
    expect(fileNameParts(["a", "A", "a_2"])).toEqual(["a", "A_2", "a_2_2"]);
  });
});
