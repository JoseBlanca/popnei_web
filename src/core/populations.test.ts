/**
 * The tests of what `populations.ts` adds to its functions, which
 * `project.test.ts` tests where they were until 1 October 2026
 * (docs/specs/core/project.md, "How it is verified"): which modules
 * import which, read from their text, so that `project.ts`,
 * `individualsKept.ts` and `populations.ts` do not come to import each
 * other again; and the helpers the spec lists from that day.
 */

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  defaultPopulationsColumn,
  loosenText,
  populationColumnChoices,
  populationsByLists,
  populationsColumnOf,
} from "./populations.ts";
import { individualsBoxNeeds, MAX_LISTED_POPULATIONS } from "./project.ts";
import type { IndividualsRead, Project, TableRead } from "./project.ts";
import { deepFreeze } from "./testSupport.ts";
import type {
  Cell,
  IndividualsFileError,
  IndividualsTable,
  RunError,
} from "../worker/protocol.ts";

/** The text of a module of src/core. */
function sourceOf(name: string): string {
  return readFileSync(new URL(name, import.meta.url), "utf8");
}

/** The statements of `source` that import or export from `module`, each
    on one line. */
function statementsFrom(source: string, module: string): string[] {
  const statements =
    source.match(/^(?:import|export)\b[^;]*?\bfrom\s+"[^"]+";/gmu) ?? [];
  return statements
    .filter((statement) => statement.endsWith(`from "${module}";`))
    .map((statement) => statement.replaceAll(/\s+/gu, " "));
}

describe("PA10 the modules of the populations do not import each other", () => {
  test("project.ts takes nothing of individualsKept.ts but a type", () => {
    expect(
      statementsFrom(sourceOf("project.ts"), "./individualsKept.ts"),
    ).toEqual(['import type { IndividualsKept } from "./individualsKept.ts";']);
  });

  test("project.ts takes nothing of populations.ts", () => {
    expect(statementsFrom(sourceOf("project.ts"), "./populations.ts")).toEqual(
      [],
    );
  });

  test("individualsKept.ts takes nothing of populations.ts", () => {
    expect(
      statementsFrom(sourceOf("individualsKept.ts"), "./populations.ts"),
    ).toEqual([]);
  });

  test("populations.ts has no constant made when it loads, which the module that loaded it first could find not yet made", () => {
    expect(
      sourceOf("populations.ts").match(/^(?:export )?const /gmu),
    ).toBeNull();
  });
});

/** A project of population genetics whose variants file holds `i1` to
    `i4`, with the metadata file of the diversity's worked example and its
    column `pop` chosen, and the filters of individuals `filters`. */
function project(
  individualFilters: Project["individualFilters"] = [],
  grouping: Project["grouping"] = { kind: "populations", column: "pop" },
): Project {
  return deepFreeze<Project>({
    app: "popgen",
    variants: {
      fileId: "00112233445566778899aabbccddeeff",
      name: "panel.nei",
      size: 100,
      format: "nei",
      readOptions: null,
      read: {
        kind: "read",
        individuals: ["i1", "i2", "i3", "i4"],
        ploidy: 2,
        numVars: null,
        keepsPassed: false,
      },
    },
    filters: [],
    filtersOff: [],
    individualFilters,
    individualFiltersOff: [],
    individuals: {
      fileId: "ffeeddccbbaa99887766554433221100",
      name: "pops.csv",
      csv: { encoding: "auto", separator: "auto", decimal: "auto" },
      typesSet: [],
      read: {
        kind: "read",
        table: {
          columns: ["name", "pop"],
          rows: [
            ["i1", "A"],
            ["i2", "B"],
            ["i3", "A"],
            ["i4", null],
            ["i5", "C"],
          ],
        },
        columns: [{ kind: "identifier" }, { kind: "categorical" }],
        found: {
          encoding: "utf-8",
          separator: ",",
          decimal: ".",
          undecodedLine: null,
        },
      },
    },
    grouping,
    analyses: [],
    reference: null,
  });
}

describe("PA10 the helpers of the populations the spec lists", () => {
  test("populationsColumnOf gives the column chosen, and null for the one population", () => {
    expect(populationsColumnOf(project())).toBe("pop");
    expect(populationsColumnOf(project([], { kind: "onePopulation" }))).toBe(
      null,
    );
    expect(
      populationsColumnOf(project([], { kind: "populations", column: null })),
    ).toBe(null);
  });

  test("populationsByLists gives the populations the lists leave, each with an individual, and not one they empty", () => {
    expect(populationsByLists(project())).toEqual([
      ["A", ["i1", "i3"]],
      ["B", ["i2"]],
    ]);
    expect(
      populationsByLists(project([{ kind: "remove", individuals: ["i2"] }])),
    ).toEqual([["A", ["i1", "i3"]]]);
    expect(
      populationsByLists(project([{ kind: "keep", individuals: ["i4"] }])),
    ).toEqual([]);
  });

  test("loosenText says what to do about one population left empty, and about several", () => {
    expect(loosenText(true)).toBe(
      "Loosen the filters of individuals in the Variants step to keep it.",
    );
    expect(loosenText(false)).toBe(
      "Loosen the filters of individuals in the Variants step to keep them.",
    );
  });
});

// The box of the individuals file of popgen2.html (the project spec, "The
// counts per population on popgen2.html").

/** The table of a CSV fixture of e2e/fixtures as the reader of TypeScript
    gave it, every cell a text, with the columns `numeric` made numbers,
    as table_io gives a column whose every value is one. */
function csvTable(
  name: string,
  numeric: readonly string[] = [],
): IndividualsTable {
  const text = readFileSync(
    new URL(`../../e2e/fixtures/${name}`, import.meta.url),
    "utf8",
  );
  const [header, ...lines] = text.trim().split("\n");
  if (header === undefined) {
    throw new Error(`${name} has no header`);
  }
  const columns = header.split(",");
  return {
    columns,
    rows: lines.map((line) =>
      line
        .split(",")
        .map((cell, index): Cell =>
          numeric.includes(columns[index] ?? "") ? Number(cell) : cell,
        ),
    ),
  };
}

/** `panel_pops.csv`: `s000` to `s199` in p0 (48), p2 (84) and p1 (68),
    which first appear in that order. */
const PANEL_POPS = csvTable("panel_pops.csv");

/** The table of `excel_en.xlsx` as table_io reads it, written down from
    a read of the light worker's reader under node on 9 October 2026. */
const EXCEL_EN: IndividualsTable = {
  columns: [
    "Individuo",
    "Población",
    "Altura",
    "Fecha",
    "Hora",
    "Afectado",
    "Código",
  ],
  rows: [
    ["ind1", "Andalucía", 1.75, "2024-05-13", "14:30:00", true, 7],
    ["ind2", "Castilla y León", 1.62, "2024-05-14", "09:05:00", false, 12],
    ["001", "Castilla y León", 1.8, "2024-05-15", "18:45:00", true, 3],
    ["ind4", "Murcia", 1.55, "2024-05-16", "07:00:00", false, null],
    ["ind5", "Murcia", 1.7, "2024-05-17", "12:15:00", true, null],
  ],
};

/** A read of the table `table`, of a CSV with the decimal mark
    `decimal`, or of an xlsx with `decimal` null. */
function readOf(
  table: IndividualsTable,
  decimal: "." | "," | null = ".",
): TableRead {
  return deepFreeze<TableRead>({
    kind: "read",
    table,
    columns: table.columns.map((_, index) =>
      index === 0 ? { kind: "identifier" } : { kind: "categorical" },
    ),
    found:
      decimal === null
        ? null
        : {
            encoding: "utf-8",
            separator: decimal === "," ? ";" : ",",
            decimal,
            undecodedLine: null,
          },
  });
}

/** A table `IID,<columns>` of the rows `rows`, each named `s000`,
    `s001`, … in its order. */
function tableOf(
  columns: readonly string[],
  rows: readonly (readonly Cell[])[],
): IndividualsTable {
  return {
    columns: ["IID", ...columns],
    rows: rows.map((row, index) => [
      `s${String(index).padStart(3, "0")}`,
      ...row,
    ]),
  };
}

/** `count` rows of one cell, `p0`, `p1`, … each once. */
function distinctValues(count: number): Cell[][] {
  return Array.from({ length: count }, (_, index) => [`p${String(index)}`]);
}

/** The individuals of `panel.nei`, those of `panel_pops.csv` in its
    order. */
const PANEL_INDIVIDUALS: readonly string[] = PANEL_POPS.rows.map((row) =>
  String(row[0]),
);

/** A project of popgen2.html: `panel.nei` of the individuals
    `variantsIndividuals`, or no variants file read with `null`, and the
    individuals file `panel_pops.csv` with the read `read`, its column
    `popcat` chosen, or the grouping `grouping`; with the filters of
    individuals `individualFilters` and of the variants `filters`. */
function popgen2Project(
  options: {
    readonly read?: IndividualsRead | null;
    readonly grouping?: Project["grouping"];
    readonly variantsIndividuals?: readonly string[] | null;
    readonly individualFilters?: Project["individualFilters"];
    readonly filters?: Project["filters"];
  } = {},
): Project {
  const read = options.read === undefined ? readOf(PANEL_POPS) : options.read;
  const variantsIndividuals =
    options.variantsIndividuals === undefined
      ? PANEL_INDIVIDUALS
      : options.variantsIndividuals;
  return deepFreeze<Project>({
    app: "popgen",
    variants: {
      fileId: "00112233445566778899aabbccddeeff",
      name: "panel.nei",
      size: 261_490,
      format: "nei",
      readOptions: null,
      read:
        variantsIndividuals === null
          ? { kind: "pending" }
          : {
              kind: "read",
              individuals: variantsIndividuals,
              ploidy: 2,
              numVars: null,
              keepsPassed: false,
            },
    },
    filters: options.filters ?? [],
    filtersOff: [],
    individualFilters: options.individualFilters ?? [],
    individualFiltersOff: [],
    individuals:
      read === null
        ? null
        : {
            fileId: "ffeeddccbbaa99887766554433221100",
            name: "panel_pops.csv",
            csv: { encoding: "auto", separator: "auto", decimal: "auto" },
            typesSet: [],
            read,
          },
    grouping: options.grouping ?? { kind: "populations", column: "popcat" },
    analyses: [],
    reference: null,
  });
}

/** A project whose individuals file `panel_pops.csv` was refused with
    `error`, read as the format `format`. */
function refused(
  error: IndividualsFileError,
  format: "text" | "xlsx" | null = "text",
): Project {
  return popgen2Project({ read: { kind: "failed", error, format } });
}

/** A project whose read of `panel_pops.csv` failed in the light worker
    with `error`. */
function workerFailed(
  error: Exclude<RunError, { readonly kind: "files" }>,
): Project {
  return popgen2Project({
    read: { kind: "failed", error: { kind: "worker", error }, format: null },
  });
}

describe("IN4 D1 the column the page chooses, the columns its list offers, and the words of the box", () => {
  test("the bound of the values of a column of populations is the owner's 20", () => {
    expect(MAX_LISTED_POPULATIONS).toBe(20);
  });

  test("defaultPopulationsColumn chooses popcat of panel_pops.csv", () => {
    expect(defaultPopulationsColumn(readOf(PANEL_POPS))).toBe("popcat");
  });

  test("defaultPopulationsColumn chooses popcat of panel_meta.csv, and not altitude, its numbers", () => {
    const meta = csvTable("panel_meta.csv", ["altitude"]);
    expect(meta.columns).toEqual(["IID", "popcat", "altitude"]);
    expect(defaultPopulationsColumn(readOf(meta))).toBe("popcat");
  });

  test("defaultPopulationsColumn chooses pop of ld_pops.csv, its two values", () => {
    expect(defaultPopulationsColumn(readOf(csvTable("ld_pops.csv")))).toBe(
      "pop",
    );
  });

  test("defaultPopulationsColumn chooses Población of excel_en.xlsx", () => {
    expect(defaultPopulationsColumn(readOf(EXCEL_EN, null))).toBe("Población");
  });

  test("defaultPopulationsColumn chooses no column of a table of numbers alone", () => {
    const numbers = tableOf(
      ["n", "x"],
      [
        [1, 1.5],
        [2, 2.5],
      ],
    );
    expect(defaultPopulationsColumn(readOf(numbers))).toBeNull();
  });

  test("defaultPopulationsColumn chooses no column when the only column of text has 21 values", () => {
    expect(
      defaultPopulationsColumn(readOf(tableOf(["pop"], distinctValues(21)))),
    ).toBeNull();
  });

  test("defaultPopulationsColumn chooses no column of booleans, nor one of numbers", () => {
    const table = tableOf(
      ["affected", "code"],
      [
        [true, 1],
        [false, 2],
        [true, 1],
      ],
    );
    expect(defaultPopulationsColumn(readOf(table))).toBeNull();
  });

  test("defaultPopulationsColumn chooses a column of 20 values with missing cells, which are not counted", () => {
    const table = tableOf(["pop"], [...distinctValues(20), [null], [null]]);
    expect(defaultPopulationsColumn(readOf(table))).toBe("pop");
  });

  test("defaultPopulationsColumn passes over a first column of text of 21 values for a later one of 2", () => {
    const table = tableOf(
      ["accession", "pop"],
      distinctValues(21).map((row, index) => [
        ...row,
        index % 2 === 0 ? "a" : "b",
      ]),
    );
    expect(defaultPopulationsColumn(readOf(table))).toBe("pop");
  });

  test("defaultPopulationsColumn passes over an integer column before the populations", () => {
    const table = tableOf(
      ["batch", "pop"],
      [
        [1, "north"],
        [2, "south"],
        [1, "north"],
      ],
    );
    expect(defaultPopulationsColumn(readOf(table))).toBe("pop");
  });

  test("defaultPopulationsColumn takes a column with one text among numbers, as table_io gives a column of text", () => {
    const table = tableOf(["pop"], [["7"], ["north"], ["7"]]);
    expect(defaultPopulationsColumn(readOf(table))).toBe("pop");
  });

  test("defaultPopulationsColumn of a table read as texts alone, before table_io, chooses its first column of 1 to 20 values", () => {
    expect(defaultPopulationsColumn(readOf(csvTable("panel_meta.csv")))).toBe(
      "popcat",
    );
  });

  test("defaultPopulationsColumn never chooses the first column, the names", () => {
    const table: IndividualsTable = {
      columns: ["pop", "n"],
      rows: [
        ["a", 1],
        ["b", 2],
      ],
    };
    expect(defaultPopulationsColumn(readOf(table))).toBeNull();
  });

  test("defaultPopulationsColumn compares the values as cellShown writes them", () => {
    // 21 cells, 20 values once written: a text "1,5" and a number 1.5
    // read with the comma are the one value 1,5.
    const table = tableOf(["pop"], [...distinctValues(19), ["1,5"], [1.5]]);
    expect(defaultPopulationsColumn(readOf(table, ","))).toBe("pop");
    expect(defaultPopulationsColumn(readOf(table, "."))).toBeNull();
  });

  test("populationColumnChoices offers every column of excel_en.xlsx but the names and Afectado, its booleans", () => {
    expect(populationColumnChoices(readOf(EXCEL_EN, null))).toEqual([
      "Población",
      "Altura",
      "Fecha",
      "Hora",
      "Código",
    ]);
  });

  test("populationColumnChoices offers a column of booleans with missing cells no more, and offers a column of missing cells alone", () => {
    const table = tableOf(
      ["affected", "empty", "pop"],
      [
        [true, null, "a"],
        [null, null, "b"],
      ],
    );
    expect(populationColumnChoices(readOf(table))).toEqual(["empty", "pop"]);
  });

  test("populationColumnChoices offers a column of booleans and texts, which is not a column of booleans", () => {
    const table = tableOf(["mixed"], [[true], ["north"]]);
    expect(populationColumnChoices(readOf(table))).toEqual(["mixed"]);
  });

  test("individualsBoxNeeds gives nothing with no file and with a file read", () => {
    expect(individualsBoxNeeds(popgen2Project({ read: null }))).toBeNull();
    expect(individualsBoxNeeds(popgen2Project())).toBeNull();
  });

  test("individualsBoxNeeds says the file is being read", () => {
    expect(
      individualsBoxNeeds(popgen2Project({ read: { kind: "pending" } })),
    ).toBe("Reading panel_pops.csv.");
  });

  test("individualsBoxNeeds throws a defect for a file not given, which popgen2.html cannot have", () => {
    expect(() =>
      individualsBoxNeeds(popgen2Project({ read: { kind: "notGiven" } })),
    ).toThrow("popnei_web defect:");
  });

  test("individualsBoxNeeds ends a row of the wrong length and a quote never closed with another separator under the tab", () => {
    expect(
      individualsBoxNeeds(
        refused({
          kind: "raggedRow",
          line: 2,
          expected: 1,
          found: 2,
          separator: ",",
        }),
      ),
    ).toBe(
      "panel_pops.csv could not be read: line 2 has 2 cells where the header has 1, read with the comma as the separator. Choose another separator under the tab Individuals file, or open a corrected file.",
    );
    expect(
      individualsBoxNeeds(
        refused({ kind: "unclosedQuote", line: 5, separator: ";" }),
      ),
    ).toBe(
      "panel_pops.csv could not be read: the quote that opens a cell on line 5 is never closed, read with the semicolon as the separator. Choose another separator under the tab Individuals file, or open a corrected file.",
    );
  });

  test("individualsBoxNeeds says a variants file is opened in the box Variants file", () => {
    expect(individualsBoxNeeds(refused({ kind: "variantsFile" }))).toBe(
      "panel_pops.csv could not be read: it is a variants file; open it with Open variants file in the box Variants file.",
    );
  });

  test("individualsBoxNeeds names the file too large an individuals file", () => {
    expect(
      individualsBoxNeeds(
        refused({ kind: "tooLarge", size: 312_400_000, max: 20_000_000 }, null),
      ),
    ).toBe(
      "panel_pops.csv could not be read: it is 312.4 MB, more than the 20 MB an individuals file can have; check that it is the individuals file and not the variants file.",
    );
  });

  test("individualsBoxNeeds says the part of the page that reads tables could not be downloaded", () => {
    expect(
      individualsBoxNeeds(
        refused({ kind: "readerNotLoaded", message: "fetch failed" }),
      ),
    ).toBe(
      "panel_pops.csv could not be read: the part of the page that reads tables could not be downloaded. Check the connection and open the file again.",
    );
  });

  test("individualsBoxNeeds asks a file the browser could not read to be opened again", () => {
    expect(
      individualsBoxNeeds(
        refused({ kind: "unreadable", message: "NotReadableError" }),
      ),
    ).toBe(
      "panel_pops.csv could not be read: the browser could not read it; it may have been changed, moved or deleted since it was picked. Open it again.",
    );
  });

  test.each<[IndividualsFileError, string]>([
    [
      { kind: "files", message: "zip" },
      "it could not be read as an Excel workbook and may be damaged; open it in Excel and save it again",
    ],
    [
      { kind: "oldExcel" },
      "it is a workbook of Excel 97–2003; in Excel, save it as Excel Workbook (.xlsx)",
    ],
    [
      { kind: "encrypted" },
      "it is protected by a password; in Excel, save a copy without the password",
    ],
    [
      { kind: "emptySheet", sheet: "Notas" },
      "its first sheet, Notas, is empty, and only the first sheet is read; put the table in the first sheet",
    ],
    [
      { kind: "cellError", error: "#GETTING_DATA" },
      "a cell holds the error #GETTING_DATA, which cannot be read; in Excel, find the cells with an error with Find & Select › Go To Special › Formulas › Errors, and correct the formula or replace it with its value",
    ],
    [
      { kind: "headerError", row: 3, column: 4, error: "#VALUE!" },
      "the header has the error #VALUE! at row 3, column D, where the name of a column should be; in Excel, type the name of the column in that cell",
    ],
  ])(
    "individualsBoxNeeds ends a refusal whose words say what to do in Excel with Then open it again: %o",
    (error, words) => {
      expect(individualsBoxNeeds(refused(error, "xlsx"))).toBe(
        `panel_pops.csv could not be read: ${words}. Then open it again.`,
      );
    },
  );

  test("individualsBoxNeeds ends a sheet too large with Then open it again", () => {
    expect(
      individualsBoxNeeds(
        refused(
          {
            kind: "sheetTooLarge",
            sheet: "Hoja1",
            lastRow: 1_048_576,
            lastColumn: "XFD",
            max: 20_000_000,
          },
          "xlsx",
        ),
      ),
    ).toMatch(
      /^panel_pops\.csv could not be read: its first sheet, Hoja1, has values as far as row 1,048,576 and column XFD, .*\. Then open it again\.$/u,
    );
  });

  test.each<[IndividualsFileError, "text" | "xlsx", string]>([
    [{ kind: "empty" }, "text", "it has no row of individuals"],
    [
      { kind: "duplicateColumn", name: "pop" },
      "text",
      "two columns are named pop",
    ],
    [
      { kind: "duplicateIndividual", name: "s001" },
      "text",
      "the individual s001 is in two rows",
    ],
    [
      { kind: "unnamedColumn", column: 4 },
      "xlsx",
      "column D has values but no name in the header",
    ],
    [
      { kind: "unnamedColumn", column: 4 },
      "text",
      "column 4 has values but no name in the header",
    ],
    [
      { kind: "emptyIndividual", line: 7 },
      "xlsx",
      "row 7 has no name of an individual in its first column",
    ],
    [
      { kind: "notText" },
      "text",
      "it is neither a text file, a CSV or a TSV, nor an Excel workbook (.xlsx)",
    ],
    [
      { kind: "cutShort" },
      "text",
      "it ends in the middle of a character and may have been cut short",
    ],
    [
      { kind: "notWorkbook" },
      "xlsx",
      "it is a zip file that holds no Excel workbook",
    ],
  ])(
    "individualsBoxNeeds ends every other refusal with Open a corrected file: %o in a file of %s",
    (error, format, words) => {
      expect(individualsBoxNeeds(refused(error, format))).toBe(
        `panel_pops.csv could not be read: ${words}. Open a corrected file.`,
      );
    },
  );

  test.each<Exclude<RunError, { readonly kind: "files" }>>([
    { kind: "couldNotStart", reason: "no worker" },
    { kind: "protocolMismatch" },
  ])(
    "individualsBoxNeeds asks a reload when the light worker could not start or is of another build: %o",
    (error) => {
      expect(individualsBoxNeeds(workerFailed(error))).toBe(
        "panel_pops.csv could not be read: the page could not start the part that reads files. Reload the page and open the file again.",
      );
    },
  );

  test.each<Exclude<RunError, { readonly kind: "files" }>>([
    { kind: "workerFailed", message: "out of memory" },
    { kind: "defect", message: "a defect" },
  ])(
    "individualsBoxNeeds says the page stopped while it read the file, after a crash or a defect: %o",
    (error) => {
      expect(individualsBoxNeeds(workerFailed(error))).toBe(
        "panel_pops.csv could not be read: the page stopped while it read it. Open the file again.",
      );
    },
  );

  test("individualsBoxNeeds escapes the name of the file, as every reason does", () => {
    const p = popgen2Project({ read: { kind: "pending" } });
    const named: Project = deepFreeze({
      ...p,
      individuals:
        p.individuals === null
          ? null
          : { ...p.individuals, name: "pan\u202eel.csv" },
    });
    expect(individualsBoxNeeds(named)).toBe("Reading pan\\u202eel.csv.");
  });
});
