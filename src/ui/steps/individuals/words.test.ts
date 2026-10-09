import { describe, expect, test } from "vitest";

import type { IndividualsTable } from "../../../worker/protocol.ts";
import {
  allFoundText,
  NO_FILE,
  ONE_POPULATION_ITEM,
  checkHeading,
  chosenPopulationItem,
  detectedText,
  firstValuesParts,
  firstValuesText,
  kindOfName,
  loadAgainText,
  missingLabel,
  noPopulationLine,
  otherNameText,
  firstSheetText,
  xlsText,
  FOLDER_DROPPED,
  TEXT_DROPPED,
  PICKER_ENDINGS,
  populationItems,
  populationLine,
  sizeText,
  CODING_LABEL,
  NOT_COPIED,
  TYPES_LINE,
  codedZeroText,
  codingItems,
  codingLabelEnd,
  copiedNames,
  copiedText,
  copyLabel,
  forgetLabel,
  typeItems,
  typeLabel,
  typeOfItem,
  typeWords,
  typesLostWords,
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
    expect(kindOfName("pops.xlsx")).toBe("xlsx");
    expect(kindOfName("POPS.XLSX")).toBe("xlsx");
    expect(kindOfName("POPS.XLS")).toBe("xls");
    expect(kindOfName("pops.xlsm")).toBe("other");
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
    expect(xlsText("pops.xls")).toBe(
      "pops.xls was not loaded: this version reads .xlsx files and not the older .xls. In Excel, save the sheet with File › Save As, as an Excel Workbook (.xlsx) or as CSV, and load that file.",
    );
    expect(otherNameText("pops.dat")).toBe(
      "pops.dat was not loaded: the Individuals step reads a CSV or a TSV, whose name ends in .csv, .tsv or .txt, or an Excel file, whose name ends in .xlsx. If it is one of them, rename it.",
    );
    expect(loadAgainText("pops.csv")).toBe(
      "To change how pops.csv is read, load it again.",
    );
  });

  test("IP9 the words of an xlsx: the line of the first sheet, the picker, a folder and a piece of text", () => {
    expect(firstSheetText("pops.xlsx")).toBe(
      "Read from the first sheet of pops.xlsx; any other sheet is not read.",
    );
    expect(firstSheetText("po\npsI.xlsx")).toBe(
      "Read from the first sheet of po\\npsI.xlsx; any other sheet is not read.",
    );
    expect(PICKER_ENDINGS).toEqual([".csv", ".tsv", ".txt", ".xlsx"]);
    expect(FOLDER_DROPPED).toBe(
      "Load a metadata file, a CSV, a TSV or an .xlsx file, not a folder.",
    );
    expect(TEXT_DROPPED).toBe(
      "Load a metadata file, a CSV, a TSV or an .xlsx file, not a piece of text.",
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
    // The values joined by a dot, after a space that does not break.
    expect(firstValuesText(TABLE, 1, ",")).toBe(
      "España\u00a0· Italia\u00a0· Perú",
    );
    expect(firstValuesText(TABLE, 2, ",")).toBe("1,75\u00a0· 1,62\u00a0· 1,80");
    // Each value with its dot, drawn on one line; joined, the text.
    expect(firstValuesParts(TABLE, 1, ",")).toEqual([
      "España\u00a0·",
      "Italia\u00a0·",
      "Perú",
    ]);
    expect(
      firstValuesText({ columns: ["id", "x"], rows: [["a", "b\n"]] }, 1, "."),
    ).toBe("b\\n");
  });

  test("IN1 D3 the numbers of a read with the decimal comma are written with the comma, and with the point otherwise", () => {
    const table = {
      columns: ["id", "h"],
      rows: [
        ["a", 1.75],
        ["b", 2],
      ],
    };
    expect(firstValuesText(table, 1, ",")).toBe("1,75\u00a0· 2");
    expect(firstValuesText(table, 1, ".")).toBe("1.75\u00a0· 2");
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

describe("IP5 D2 the file and the populations of stage 4", () => {
  test("the line of no file says what the analyses run on", () => {
    expect(NO_FILE).toBe(
      "No metadata file: every individual is in one population.",
    );
  });

  test("the items of the select of the populations: the one population first, then every column but the first, escaped", () => {
    expect(populationItems(["IID", "popcat", "reg\u202eion"])).toEqual([
      { id: "one", label: "All individuals in one population" },
      { id: "column:popcat", label: "popcat" },
      { id: "column:reg\u202eion", label: "reg\\u202eion" },
    ]);
    expect(populationItems(["IID"])).toEqual([
      { id: "one", label: ONE_POPULATION_ITEM },
    ]);
  });

  test("a column named one, or as the item of the one population, is a column", () => {
    const columns = ["IID", "one", ONE_POPULATION_ITEM];
    expect(populationItems(columns).map((item) => item.id)).toEqual([
      "one",
      "column:one",
      `column:${ONE_POPULATION_ITEM}`,
    ]);
    expect(
      chosenPopulationItem({ kind: "populations", column: "one" }, columns),
    ).toBe("column:one");
    expect(
      chosenPopulationItem(
        { kind: "populations", column: ONE_POPULATION_ITEM },
        columns,
      ),
    ).toBe(`column:${ONE_POPULATION_ITEM}`);
  });

  test("the item shown as chosen: the one population, a column of the table, or none", () => {
    const columns = ["IID", "popcat"];
    expect(chosenPopulationItem({ kind: "onePopulation" }, columns)).toBe(
      "one",
    );
    expect(
      chosenPopulationItem({ kind: "populations", column: "popcat" }, columns),
    ).toBe("column:popcat");
    expect(
      chosenPopulationItem({ kind: "populations", column: null }, columns),
    ).toBeNull();
    expect(
      chosenPopulationItem({ kind: "populations", column: "region" }, columns),
    ).toBeNull();
    // The first column names the individuals and is not offered.
    expect(
      chosenPopulationItem({ kind: "populations", column: "IID" }, columns),
    ).toBeNull();
  });

  test("the line of the one population", () => {
    expect(populationLine("All individuals", 342)).toEqual({
      shown: "All individuals · 342",
      read: "All individuals, 342 individuals",
    });
  });
});

/** A read of pops.csv: the names, a binary column status coded yes, a
    column of numbers score, and a column of words code. */
const READ = {
  kind: "read",
  table: {
    columns: ["IID", "status", "score", "code"],
    rows: [
      ["i1", "yes", "1", "a"],
      ["i2", "no", "2", "b"],
      ["i3", "yes", "3", "c"],
    ],
  },
  columns: [
    { kind: "identifier" },
    { kind: "binary", one: "yes", zero: "no" },
    { kind: "continuous" },
    { kind: "categorical" },
  ],
  found: { ...FOUND, separator: ",", decimal: "." },
} as const;

const BINARY_YES = { kind: "binary", one: "yes", zero: "no" } as const;

describe("IP5 D2 the words of the columns and their types", () => {
  test("the line above the table says the types can be changed and do not make the populations", () => {
    expect(TYPES_LINE).toBe(
      "The types are inferred from the values. Change one where the inference is wrong: a column of numbered populations, 1 to 12, is inferred continuous and is categorical. The populations are the values of their column, whatever its type.",
    );
  });

  test("a type in words, a binary one with its coding, escaped", () => {
    expect(typeWords({ kind: "identifier" })).toBe("identifier");
    expect(typeWords({ kind: "categorical" })).toBe("categorical");
    expect(typeWords({ kind: "continuous" })).toBe("continuous");
    expect(typeWords(BINARY_YES)).toBe('binary with "yes" coded 1');
    expect(typeWords({ kind: "binary", one: "y\ne", zero: "n" })).toBe(
      'binary with "y\\ne" coded 1',
    );
  });

  test("the items of the type are categorical always, binary for two values, continuous for numbers", () => {
    const ids = (allows: Parameters<typeof typeItems>[0]): string[] =>
      typeItems(allows).map((item) => item.id);
    expect(ids({ continuous: false, binary: null })).toEqual(["categorical"]);
    expect(ids({ continuous: true, binary: null })).toEqual([
      "categorical",
      "continuous",
    ]);
    expect(ids({ continuous: false, binary: BINARY_YES })).toEqual([
      "categorical",
      "binary",
    ]);
    expect(
      typeItems({
        continuous: true,
        binary: { kind: "binary", one: "2", zero: "1" },
      }),
    ).toEqual([
      { id: "categorical", label: "categorical" },
      { id: "binary", label: "binary" },
      { id: "continuous", label: "continuous" },
    ]);
  });

  test("binary chosen is the coding the reader proposes, and a type not allowed is a defect", () => {
    const allows = { continuous: false, binary: BINARY_YES };
    expect(typeOfItem("binary", allows)).toEqual(BINARY_YES);
    expect(typeOfItem("categorical", allows)).toEqual({ kind: "categorical" });
    expect(() => typeOfItem("continuous", allows)).toThrow(
      /^popnei_web defect: /,
    );
    expect(() =>
      typeOfItem("binary", { continuous: true, binary: null }),
    ).toThrow(/^popnei_web defect: /);
    expect(
      typeOfItem("continuous", { continuous: true, binary: null }),
    ).toEqual({ kind: "continuous" });
  });

  test("the names of the selects of a row: the type and the value coded 1, the column escaped", () => {
    expect(typeLabel("score")).toBe("Type of score");
    expect(typeLabel("sc‮ore")).toBe("Type of sc\\u202eore");
    expect(CODING_LABEL).toBe("Coded 1, the case");
    expect(`${CODING_LABEL}${codingLabelEnd("status")}`).toBe(
      "Coded 1, the case, in status",
    );
    expect(codingLabelEnd("st\natus")).toBe(", in st\\natus");
    expect(codedZeroText("no")).toBe('"no" is coded 0.');
    expect(codedZeroText("n\to")).toBe('"n\\to" is coded 0.');
  });

  test("the items of the value coded 1 are the two values, in the order of the reader's proposal, escaped", () => {
    expect(codingItems({ one: "yes", zero: "n\no" })).toEqual([
      { id: "yes", label: "yes" },
      { id: "n\no", label: "n\\no" },
    ]);
  });

  test("the warning of one type not applied, by each of the three reasons, names the file", () => {
    // Its values: status set continuous where it is binary.
    expect(
      typesLostWords("pops.csv", READ, [["status", { kind: "continuous" }]]),
    ).toEqual({
      kind: "one",
      text: 'status does not have the type you set, continuous, since its values in pops.csv do not allow it; it is binary with "yes" coded 1, as its values give it. The type you set comes back when the file is read with values that allow it.',
    });
    expect(
      typesLostWords("pops.csv", READ, [
        ["code", { kind: "binary", one: "yes", zero: "no" }],
      ]),
    ).toEqual({
      kind: "one",
      text: 'code does not have the type you set, binary with "yes" coded 1, since its values in pops.csv do not allow it; it is categorical, as its values give it. The type you set comes back when the file is read with values that allow it.',
    });
    expect(
      typesLostWords("new.csv", READ, [["region", { kind: "categorical" }]]),
    ).toEqual({
      kind: "one",
      text: "new.csv has no column region, whose type you set as categorical. The type comes back when the file is read with a column of that name.",
    });
    expect(typesLostWords("pops.csv", READ, [["IID", BINARY_YES]])).toEqual({
      kind: "one",
      text: 'IID is the first column of pops.csv, whose cells are the names of the individuals, so it does not have the type you set, binary with "yes" coded 1. If it should not be first, correct the file and load it again; the type you set then comes back.',
    });
    expect(typesLostWords("pops.csv", READ, [])).toBeNull();
  });

  test("the warning of several types not applied is a sentence and a line for each, in the order of typesLost", () => {
    expect(
      typesLostWords("po\nps.csv", READ, [
        ["code", BINARY_YES],
        ["region", { kind: "categorical" }],
        ["IID", { kind: "categorical" }],
      ]),
    ).toEqual({
      kind: "several",
      opening: "3 columns do not have the type you set:",
      lines: [
        'code: binary with "yes" coded 1; its values do not allow it, and it is categorical',
        "region: categorical; po\\nps.csv has no column region",
        "IID: categorical; it is the first column, the names of the individuals",
      ],
      closing:
        "Each type you set comes back when the file is read with a column that allows it.",
    });
  });

  test("the button that forgets the types, for one and for several", () => {
    expect(forgetLabel(1)).toBe("Forget this type");
    expect(forgetLabel(2)).toBe("Forget these types");
  });

  test("the button of the copy of the names missing, and its three announcements", () => {
    expect(copyLabel(12)).toBe("Copy the 12 names");
    expect(copyLabel(1)).toBe("Copy the name");
    expect(copyLabel(1200)).toBe("Copy the 1,200 names");
    expect(copiedText(12)).toBe("12 names copied.");
    expect(copiedText(1)).toBe("The name was copied.");
    expect(NOT_COPIED).toBe(
      "The names could not be copied. Select them in the list.",
    );
    expect(copiedNames(["s031", "s044"])).toBe("s031\ns044");
    expect(copiedNames(["s031"])).toBe("s031");
  });
});
