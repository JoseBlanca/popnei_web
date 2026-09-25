import { describe, expect, test } from "vitest";

import type { IndividualsTable } from "../../../worker/protocol.ts";
import {
  allFoundText,
  checkHeading,
  detectedText,
  excelText,
  firstValuesText,
  kindOfName,
  loadAgainText,
  missingLabel,
  noPopulationLine,
  otherNameText,
  populationLine,
  sizeText,
  typeText,
  undecodedText,
  variantsNameText,
} from "./words.ts";

const TABLE: IndividualsTable = {
  columns: ["id", "country", "height"],
  rows: [
    ["i1", "España", "1,75"],
    ["i2", null, "1,62"],
    ["i3", "España", null],
    ["i4", "Italia", "1,80"],
    ["i5", "Perú", "1,70"],
    ["i6", "Chile", "1,60"],
  ],
};

const AUTO = { encoding: "auto", separator: "auto", decimal: "auto" } as const;
const FOUND = {
  encoding: "windows-1252",
  separator: ";",
  decimal: ",",
  undecodedLine: null,
} as const;

describe("the words of the Individuals step", () => {
  test("the kind of a file is told by the end of its name, without regard to case", () => {
    expect(kindOfName("pops.csv")).toBe("text");
    expect(kindOfName("POPS.TSV")).toBe("text");
    expect(kindOfName("pops.txt")).toBe("text");
    expect(kindOfName("pops.xlsx")).toBe("excel");
    expect(kindOfName("POPS.XLS")).toBe("excel");
    expect(kindOfName("pops.dat")).toBe("other");
    expect(kindOfName("pops.csv.gz")).toBe("other");
  });

  test("WS8 D1 a variants file is told by its name, .vcf, .vcf.gz, .bcf or .nei, and named as one", () => {
    expect(kindOfName("panel.vcf")).toBe("variants");
    expect(kindOfName("PANEL.VCF.GZ")).toBe("variants");
    expect(kindOfName("panel.bcf")).toBe("variants");
    expect(kindOfName("panel.nei")).toBe("variants");
    expect(kindOfName("panel.gz")).toBe("other");
    expect(variantsNameText("panel.vcf.gz", "popgen")).toBe(
      "panel.vcf.gz was not loaded: it is a variants file, which the Variants step takes. Load a metadata file.",
    );
  });

  test("a file not loaded is named in its message", () => {
    expect(excelText("pops.xlsx")).toBe(
      "pops.xlsx was not loaded: this version reads a CSV or a TSV, and reads .xlsx files from a later version. In Excel, save the sheet with File › Save As › CSV, and load that file.",
    );
    expect(excelText("pops.xls")).toBe(
      "pops.xls was not loaded: this version reads a CSV or a TSV, and reads .xlsx files from a later version. In Excel, save the sheet with File › Save As › CSV, and load that file.",
    );
    expect(otherNameText("pops.dat")).toBe(
      "pops.dat was not loaded: the Individuals step reads a CSV or a TSV, whose name ends in .csv, .tsv or .txt. If it is one of them, rename it.",
    );
    expect(loadAgainText("pops.csv")).toBe(
      "To change how pops.csv is read, load it again.",
    );
  });

  test("the first item of an option names what was detected only while it is auto and the file is read", () => {
    expect(detectedText("encoding", AUTO, FOUND)).toBe(
      "Detected: Windows-1252",
    );
    expect(detectedText("separator", AUTO, FOUND)).toBe("Detected: semicolon");
    expect(detectedText("decimal", AUTO, FOUND)).toBe("Detected: comma");
    expect(detectedText("separator", { ...AUTO, separator: ";" }, FOUND)).toBe(
      "Detected",
    );
    expect(detectedText("decimal", { ...AUTO, separator: ";" }, FOUND)).toBe(
      "Detected: comma",
    );
    expect(detectedText("encoding", AUTO, null)).toBe("Detected");
  });

  test("the size, the types and the first three distinct values of a table", () => {
    expect(sizeText(TABLE)).toBe("6 rows, 3 columns");
    expect(sizeText({ columns: ["id"], rows: [["a"]] })).toBe(
      "1 row, 1 column",
    );
    expect(typeText({ kind: "identifier" })).toBe("identifier");
    expect(typeText({ kind: "binary", one: "yes", zero: "no" })).toBe(
      "binary: yes, no",
    );
    expect(typeText({ kind: "continuous" })).toBe("continuous");
    expect(typeText({ kind: "categorical" })).toBe("categorical");
    expect(firstValuesText(TABLE, 1)).toBe("España · Italia · Perú");
    expect(firstValuesText(TABLE, 2)).toBe("1,75 · 1,62 · 1,80");
    expect(
      firstValuesText({ columns: ["id", "x"], rows: [["a", "b\n"]] }, 1),
    ).toBe("b\\n");
  });

  test("the check names the file of the variants, and the rows ignored when there are any", () => {
    expect(
      allFoundText({ found: 342, missing: [], ignoredRows: 18 }, "panel.nei"),
    ).toBe(
      "All 342 individuals of panel.nei found · 18 rows not in panel.nei, ignored",
    );
    expect(
      allFoundText({ found: 200, missing: [], ignoredRows: 0 }, "panel.nei"),
    ).toBe("All 200 individuals of panel.nei found");
    expect(missingLabel(12)).toBe("The 12 individuals missing");
  });

  test("WS8 D1 the check has a heading that names the variants file, or says it is not there", () => {
    expect(checkHeading("panel.nei")).toBe("Individuals of panel.nei");
    expect(checkHeading("pa\nnel.nei")).toBe("Individuals of pa\\nnel.nei");
    expect(checkHeading(null)).toBe("Individuals of the variants file");
  });

  test("WS8 D1 the warning of a character not decoded names its line, and the way out of each encoding", () => {
    expect(undecodedText("pops.csv", { ...FOUND, encoding: "utf-8" }, 3)).toBe(
      "line 3 of pops.csv has bytes that could not be read as UTF-8, shown as �. Correct them in the file and load it again, or, if every letter with an accent shows as �, choose Windows-1252 as the encoding.",
    );
    expect(
      undecodedText("pops.csv", { ...FOUND, encoding: "utf-16" }, 12045),
    ).toBe(
      "line 12045 of pops.csv has bytes that could not be read as UTF-16, shown as �. Correct them in the file and load it again.",
    );
  });

  test("a population is shown with its number and read with its individuals", () => {
    expect(populationLine("P1", 1203)).toEqual({
      shown: "P1 · 1,203",
      read: "P1, 1,203 individuals",
    });
    expect(noPopulationLine(4)).toEqual({
      shown: "No population · 4, left out of the analyses per population",
      read: "No population, 4 individuals, left out of the analyses per population",
    });
  });
});
