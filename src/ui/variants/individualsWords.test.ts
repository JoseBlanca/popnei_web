/**
 * The words of the box and of the tab of the individuals file on
 * popgen2.html (docs/specs/steps/popgen2-input.md, "The box of the
 * individuals file", "The tab Individuals file" and "Its words"), each
 * asserted whole: with no individuals file, in each row of the box's
 * table and each line of the counts, what the tab shows from the read and
 * its format, and what the status region says of a read.
 */
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import { individualsKept } from "../../core/individualsKept.ts";
import type {
  IndividualStats,
  IndividualsKept,
} from "../../core/individualsKept.ts";
import { populationCounts } from "../../core/populations.ts";
import type { PopulationCounts } from "../../core/populations.ts";
import {
  emptyProject,
  individualsBoxNeeds,
  loadVariants,
} from "../../core/project.ts";
import type {
  IndividualsRead,
  IndividualsSource,
  Project,
} from "../../core/project.ts";
import type { Cell, IndividualsTable } from "../../worker/protocol.ts";
import {
  COLUMN_LIST_LABEL,
  INDIVIDUALS_BOX_NAME,
  INDIVIDUALS_FOLDER_DROPPED,
  INDIVIDUALS_HEADER,
  INDIVIDUALS_SEVERAL_DROPPED,
  INDIVIDUALS_TEXT_DROPPED,
  NOT_COUNTED_YET,
  NO_COLUMN_ITEM,
  NO_INDIVIDUALS_FILE_TAB,
  OPEN_ANOTHER_INDIVIDUALS_FILE,
  OPEN_INDIVIDUALS_FILE,
  PASTE_INDIVIDUALS_FILE,
  POPULATION_HEADER,
  WAITING_COUNT,
  columnShown,
  countText,
  countsCaption,
  countsShown,
  individualsReadAnnouncement,
  individualsTabShows,
  noColumnQualifiedText,
  noIndividualsFileText,
  notInFileHeading,
  removeLabel,
  tableLabel,
  tableSizeText,
} from "./individualsWords.ts";
import type { PassWait } from "./individualsWords.ts";

const FILE_ID = "0123456789abcdef0123456789abcdef";

/** A project with the `.nei` file `name` opened, not yet read. */
function opened(name: string): Project {
  return loadVariants(emptyProject("popgen"), {
    fileId: FILE_ID,
    name,
    size: 1000,
    format: "nei",
    readOptions: null,
  });
}

/** The same, read with `numIndividuals` individuals. */
function read(name: string, numIndividuals: number): Project {
  const p = opened(name);
  if (p.variants === null) throw new Error("no variants file opened");
  return {
    ...p,
    variants: {
      ...p.variants,
      read: {
        kind: "read",
        individuals: Array.from(
          { length: numIndividuals },
          (_, i) => `s${String(i).padStart(3, "0")}`,
        ),
        ploidy: 2,
        numVars: null,
        keepsPassed: false,
      },
    },
  };
}

describe("IN3 the words of no individuals file on popgen2.html", () => {
  test("the heading of the box and the words of the tab", () => {
    expect(INDIVIDUALS_BOX_NAME).toBe("Individuals file");
    expect(NO_INDIVIDUALS_FILE_TAB).toBe("No individuals file open.");
  });

  test("with no variants file, the first sentence alone", () => {
    expect(noIndividualsFileText(emptyProject("popgen").variants)).toBe(
      "No individuals file: every individual is unclassified.",
    );
  });

  test("before the variants file has given its individuals, the first sentence alone", () => {
    expect(noIndividualsFileText(opened("panel.nei").variants)).toBe(
      "No individuals file: every individual is unclassified.",
    );
  });

  test("with a variants file read, its individuals and its name", () => {
    expect(noIndividualsFileText(read("panel.nei", 200).variants)).toBe(
      "No individuals file: all 200 individuals of panel.nei are unclassified, and the analyses per population will take them as one population.",
    );
  });

  test("a count of thousands with its comma", () => {
    expect(noIndividualsFileText(read("big.vcf.gz", 1250).variants)).toBe(
      "No individuals file: all 1,250 individuals of big.vcf.gz are unclassified, and the analyses per population will take them as one population.",
    );
  });

  test("one individual, in the singular", () => {
    expect(noIndividualsFileText(read("one.nei", 1).variants)).toBe(
      "No individuals file: the one individual of one.nei is unclassified.",
    );
  });

  test("a character that would reverse the text is written escaped in the name", () => {
    expect(noIndividualsFileText(read("a\u202eb.nei", 2).variants)).toBe(
      "No individuals file: all 2 individuals of a\\u202eb.nei are unclassified, and the analyses per population will take them as one population.",
    );
  });
});

// The individuals file read (IN5 D1).

/** The table of `panel_pops.csv`: `s000` to `s199` in p0 (48), p2 (84)
    and p1 (68), which first appear in that order. */
const PANEL_POPS: IndividualsTable = (() => {
  const text = readFileSync(
    new URL("../../../e2e/fixtures/panel_pops.csv", import.meta.url),
    "utf8",
  );
  const [header, ...lines] = text.trim().split("\n");
  if (header === undefined) throw new Error("panel_pops.csv has no header");
  return {
    columns: header.split(","),
    rows: lines.map((line): Cell[] => line.split(",")),
  };
})();

/** The individuals of `panel.nei`, those of `panel_pops.csv` in its
    order. */
const PANEL_INDIVIDUALS: readonly string[] = PANEL_POPS.rows.map((row) =>
  String(row[0]),
);

/** A read of `table`, of a CSV read with the comma and the point, or of
    an xlsx with `text` false. */
function tableRead(
  table: IndividualsTable,
  text = true,
): Extract<IndividualsRead, { readonly kind: "read" }> {
  return {
    kind: "read",
    table,
    columns: table.columns.map((_, index) =>
      index === 0 ? { kind: "identifier" } : { kind: "categorical" },
    ),
    found: text
      ? { encoding: "utf-8", separator: ",", decimal: ".", undecodedLine: null }
      : null,
  };
}

/** A project of popgen2.html: `panel.nei` of `variantsIndividuals`, or
    not read with `null`, and `panel_pops.csv` with the read `read`, or
    none with `null`, the grouping `popcat` or `grouping`, and the filters
    of the individuals `individualFilters`. */
function project(
  options: {
    readonly read?: IndividualsRead | null;
    readonly name?: string;
    readonly grouping?: Project["grouping"];
    readonly variantsIndividuals?: readonly string[] | null;
    readonly individualFilters?: Project["individualFilters"];
  } = {},
): Project {
  const individualsRead =
    options.read === undefined ? tableRead(PANEL_POPS) : options.read;
  const variantsIndividuals =
    options.variantsIndividuals === undefined
      ? PANEL_INDIVIDUALS
      : options.variantsIndividuals;
  return {
    app: "popgen",
    variants: {
      fileId: FILE_ID,
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
    filters: [],
    filtersOff: [],
    individualFilters: options.individualFilters ?? [],
    individualFiltersOff: [],
    individuals:
      individualsRead === null
        ? null
        : {
            fileId: "ffeeddccbbaa99887766554433221100",
            name: options.name ?? "panel_pops.csv",
            csv: { encoding: "auto", separator: "auto", decimal: "auto" },
            typesSet: [],
            read: individualsRead,
          },
    grouping: options.grouping ?? { kind: "populations", column: "popcat" },
    analyses: [],
    reference: null,
  };
}

/** The individuals kept of `p` with the statistics `stats`, or null when
    its variants file is not read. */
function keptOf(
  p: Project,
  stats: IndividualStats | null = null,
): IndividualsKept | null {
  return individualsKept(p, stats);
}

/** The counts of `p`, which has an individuals file read. */
function countsOf(p: Project, kept = keptOf(p)): PopulationCounts {
  const counts = populationCounts(p, kept);
  if (counts === null) throw new Error("the project gives no counts");
  return counts;
}

/** `panel_pops.csv` with its rows changed by `change`, and without the
    rows of `dropped`. */
function panelPopsWith(
  dropped: readonly string[],
  change: (row: readonly Cell[]) => readonly Cell[] = (row) => row,
): IndividualsTable {
  return {
    columns: PANEL_POPS.columns,
    rows: PANEL_POPS.rows
      .filter((row) => !dropped.includes(String(row[0])))
      .map(change),
  };
}

/** A table `IID,pop` of `count` rows, each of a value of its own. */
function manyValues(count: number): IndividualsTable {
  return {
    columns: ["IID", "pop"],
    rows: PANEL_INDIVIDUALS.slice(0, count).map((name, index) => [
      name,
      `v${String(index)}`,
    ]),
  };
}

/** The missing rate of the individuals at `rate`. */
function missingAt(rate: number): Project["individualFilters"] {
  return [{ kind: "missing_data", maxAllowedMissingRate: rate }];
}

describe("IN5 D1 the words of the box of the individuals file", () => {
  test("its buttons, its zone and the words of a drop that is not one file", () => {
    expect(OPEN_INDIVIDUALS_FILE).toBe("Open individuals file…");
    expect(OPEN_ANOTHER_INDIVIDUALS_FILE).toBe(
      "Open another individuals file…",
    );
    expect(PASTE_INDIVIDUALS_FILE).toBe("Paste an individuals file");
    expect(removeLabel("panel_pops.csv")).toBe("Remove panel_pops.csv");
    expect(removeLabel("a\u202eb.csv")).toBe("Remove a\\u202eb.csv");
    expect(INDIVIDUALS_FOLDER_DROPPED).toBe(
      "Open an individuals file, a CSV, a TSV or an xlsx, not a folder.",
    );
    expect(INDIVIDUALS_TEXT_DROPPED).toBe(
      "Open an individuals file, a CSV, a TSV or an xlsx, not a piece of text.",
    );
    expect(INDIVIDUALS_SEVERAL_DROPPED).toBe(
      "Open one individuals file at a time.",
    );
  });

  test("the list of the column, its first item, and its value: the column of the grouping when the list offers it, None otherwise", () => {
    expect(COLUMN_LIST_LABEL).toBe("Column of the populations");
    expect(NO_COLUMN_ITEM).toBe("None: every individual unclassified");
    expect(columnShown(project())).toBe("popcat");
    expect(
      columnShown(project({ grouping: { kind: "populations", column: null } })),
    ).toBeNull();
    expect(
      columnShown(
        project({ grouping: { kind: "populations", column: "gone" } }),
      ),
    ).toBeNull();
    expect(
      columnShown(
        project({
          read: tableRead(
            panelPopsWith([], (row) => [row[0] ?? null, row[1] === "p0"]),
          ),
        }),
      ),
    ).toBeNull();
    expect(columnShown(project({ read: { kind: "pending" } }))).toBeNull();
  });

  test("the line of no column qualified, when the page chose none and the list is on None", () => {
    const names: IndividualsTable = {
      columns: ["IID;popcat"],
      rows: PANEL_INDIVIDUALS.map((name) => [name]),
    };
    expect(
      noColumnQualifiedText(
        project({
          read: tableRead(names),
          grouping: { kind: "populations", column: null },
        }),
      ),
    ).toBe(
      "No column of panel_pops.csv holds text with 20 different values or fewer, so none was chosen as the column of the populations. Choose it in the list.",
    );
    // A column that qualifies, or a column chosen, gives no line.
    expect(
      noColumnQualifiedText(
        project({ grouping: { kind: "populations", column: null } }),
      ),
    ).toBeNull();
    const numbers: IndividualsTable = {
      columns: ["IID", "code"],
      rows: PANEL_INDIVIDUALS.map((name, index) => [name, index % 3]),
    };
    expect(
      noColumnQualifiedText(
        project({
          read: tableRead(numbers),
          grouping: { kind: "populations", column: "code" },
        }),
      ),
    ).toBeNull();
    expect(
      noColumnQualifiedText(
        project({
          read: tableRead(numbers),
          grouping: { kind: "populations", column: "gone" },
        }),
      ),
    ).toBe(
      "No column of panel_pops.csv holds text with 20 different values or fewer, so none was chosen as the column of the populations. Choose it in the list.",
    );
    expect(noColumnQualifiedText(project({ read: null }))).toBeNull();
  });

  test("the caption, the headers and the counts, a count not known written … and read not counted yet", () => {
    expect(countsCaption("panel.nei")).toBe(
      "Individuals of panel.nei after the filters of individuals",
    );
    expect(POPULATION_HEADER).toBe("Population");
    expect(INDIVIDUALS_HEADER).toBe("Individuals");
    expect(WAITING_COUNT).toBe("…");
    expect(NOT_COUNTED_YET).toBe("not counted yet");
    expect(countText(31)).toBe("31");
    expect(countText(1250)).toBe("1,250");
    expect(countText(0)).toBe("0");
    expect(countText(null)).toBe("…");
  });

  test("both files read, every individual classified: the table, and the line of the rows not used, 0", () => {
    const p = project();
    expect(countsShown(p, countsOf(p), "running")).toEqual({
      table: true,
      lines: [
        {
          kind: "line",
          text: "Individuals in panel_pops.csv but not in panel.nei: 0",
        },
      ],
    });
  });

  test("some unclassified of both causes: the count, each cause and three names, then the rest counted", () => {
    const dropped = ["s031", "s044", "s102", "s150"];
    const emptied = ["s001", "s060", "s120"];
    const p = project({
      read: tableRead(
        panelPopsWith(dropped, (row) =>
          emptied.includes(String(row[0])) ? [row[0] ?? null, null] : row,
        ),
      ),
    });
    expect(countsShown(p, countsOf(p), "running")).toEqual({
      table: true,
      lines: [
        {
          kind: "line",
          text: "Unclassified, left out of the analyses per population: 7 individuals kept, 3 with an empty cell in popcat and 4 that are not in panel_pops.csv. Not in panel_pops.csv: s031, s044, s102 and 1 more; the tab Individuals file lists them all.",
        },
        {
          kind: "line",
          text: "Individuals in panel_pops.csv but not in panel.nei: 0",
        },
      ],
    });
  });

  test("the unclassified of one cause, and of one individual", () => {
    const empty = project({
      read: tableRead(
        panelPopsWith([], (row) =>
          ["s001", "s060", "s120"].includes(String(row[0]))
            ? [row[0] ?? null, null]
            : row,
        ),
      ),
    });
    expect(countsShown(empty, countsOf(empty), "running").lines[0]).toEqual({
      kind: "line",
      text: "Unclassified, left out of the analyses per population: 3 individuals kept with an empty cell in popcat.",
    });
    const missing = project({
      read: tableRead(panelPopsWith(["s031", "s044", "s102"])),
    });
    expect(countsShown(missing, countsOf(missing), "running").lines[0]).toEqual(
      {
        kind: "line",
        text: "Unclassified, left out of the analyses per population: 3 individuals kept that are not in panel_pops.csv: s031, s044 and s102.",
      },
    );
    const five = project({
      read: tableRead(panelPopsWith(["s031", "s044", "s102", "s150", "s160"])),
    });
    expect(countsShown(five, countsOf(five), "running").lines[0]).toEqual({
      kind: "line",
      text: "Unclassified, left out of the analyses per population: 5 individuals kept that are not in panel_pops.csv: s031, s044, s102 and 2 more; the tab Individuals file lists them all.",
    });
    const one = project({ read: tableRead(panelPopsWith(["s031"])) });
    expect(countsShown(one, countsOf(one), "running").lines[0]).toEqual({
      kind: "line",
      text: "Unclassified, left out of the analyses per population: 1 individual kept that is not in panel_pops.csv: s031.",
    });
    const both = project({
      read: tableRead(
        panelPopsWith(["s031"], (row) =>
          row[0] === "s001" ? ["s001", null] : row,
        ),
      ),
    });
    expect(countsShown(both, countsOf(both), "running").lines[0]).toEqual({
      kind: "line",
      text: "Unclassified, left out of the analyses per population: 2 individuals kept, 1 with an empty cell in popcat and 1 that is not in panel_pops.csv. Not in panel_pops.csv: s031.",
    });
  });

  test("none of the individuals in the file: the warning with the first name of each, no table", () => {
    const p = project({
      read: tableRead(
        panelPopsWith([], (row) => [
          String(row[0]).replace("s", "S-"),
          row[1] ?? null,
        ]),
      ),
    });
    expect(countsShown(p, countsOf(p), "running")).toEqual({
      table: false,
      lines: [
        {
          kind: "warning",
          text: "none of the 200 individuals of panel.nei is in panel_pops.csv, so all of them are unclassified. The first column of panel_pops.csv has to hold their names as panel.nei writes them: panel.nei starts with s000, and panel_pops.csv with S-000.",
        },
        {
          kind: "line",
          text: "Individuals in panel_pops.csv but not in panel.nei: 200",
        },
      ],
    });
  });

  test("None chosen: every individual kept unclassified, no table", () => {
    const p = project({ grouping: { kind: "populations", column: null } });
    expect(countsShown(p, countsOf(p), "running")).toEqual({
      table: false,
      lines: [
        {
          kind: "line",
          text: "All 200 individuals kept are unclassified, and the analyses per population will take them as one population.",
        },
        {
          kind: "line",
          text: "Individuals in panel_pops.csv but not in panel.nei: 0",
        },
      ],
    });
  });

  test("a column of 21 values: its warning and the line of the rows not used, no table", () => {
    const p = project({
      read: tableRead(manyValues(21)),
      grouping: { kind: "populations", column: "pop" },
    });
    expect(countsShown(p, countsOf(p), "running")).toEqual({
      table: false,
      lines: [
        {
          kind: "warning",
          text: "pop has 21 different values, too many for a column of populations: the individuals are counted here only for a column of 20 different values or fewer. If it is not the column of the populations, choose another in the list.",
        },
        {
          kind: "line",
          text: "Individuals in panel_pops.csv but not in panel.nei: 0",
        },
      ],
    });
  });

  test("before the variants file is read: the line of the counts to come, and the warning of too many values still", () => {
    const p = project({ variantsIndividuals: null });
    expect(countsShown(p, countsOf(p, null), "running")).toEqual({
      table: false,
      lines: [
        {
          kind: "line",
          text: "The individuals are counted once a variants file is open.",
        },
      ],
    });
    const many = project({
      variantsIndividuals: null,
      read: tableRead(manyValues(200)),
      grouping: { kind: "populations", column: "pop" },
    });
    expect(countsShown(many, countsOf(many, null), "running")).toEqual({
      table: false,
      lines: [
        {
          kind: "warning",
          text: "pop has 200 different values, too many for a column of populations: the individuals are counted here only for a column of 20 different values or fewer. If it is not the column of the populations, choose another in the list.",
        },
        {
          kind: "line",
          text: "The individuals are counted once a variants file is open.",
        },
      ],
    });
  });

  test.each<[PassWait, string]>([
    [
      "running",
      "The individuals the filters keep are counted once panel.nei is read to the end.",
    ],
    [
      "stopped",
      "Not counted: the reading of panel.nei was stopped. Start it again in the box of panel.nei to count the individuals the filters keep.",
    ],
    [
      "failed",
      "Not counted: panel.nei could not be read to the end; the box of panel.nei says why.",
    ],
  ])(
    "a threshold on and the pass not finished, %s: the table of …, the line of why, the line of the rows",
    (wait, words) => {
      const p = project({ individualFilters: missingAt(0.03) });
      const counts = countsOf(p);
      expect(counts.known).toBe(false);
      expect(countsShown(p, counts, wait)).toEqual({
        table: true,
        lines: [
          { kind: "line", text: words },
          {
            kind: "line",
            text: "Individuals in panel_pops.csv but not in panel.nei: 0",
          },
        ],
      });
    },
  );

  test("a file name and a column with a character that would reverse the text are written escaped", () => {
    const renamed = project({
      name: "a\u202eb.csv",
      read: tableRead({ ...manyValues(21), columns: ["IID", "p\u202eop"] }),
      grouping: { kind: "populations", column: "p\u202eop" },
    });
    expect(countsShown(renamed, countsOf(renamed), "running").lines).toEqual([
      {
        kind: "warning",
        text: "p\\u202eop has 21 different values, too many for a column of populations: the individuals are counted here only for a column of 20 different values or fewer. If it is not the column of the populations, choose another in the list.",
      },
      {
        kind: "line",
        text: "Individuals in a\\u202eb.csv but not in panel.nei: 0",
      },
    ]);
  });
});

describe("IN5 D1 what the tab Individuals file shows", () => {
  /** The individuals file of `p`. */
  function sourceOf(p: Project): IndividualsSource | null {
    return p.individuals;
  }

  test("no file", () => {
    expect(individualsTabShows(null, null)).toEqual({
      kind: "none",
      text: "No individuals file open.",
    });
  });

  test("being read: the words of a read, with the options when the last read of the load was of a text file", () => {
    const pending = sourceOf(project({ read: { kind: "pending" } }));
    expect(individualsTabShows(pending, null)).toEqual({
      kind: "reading",
      text: "Reading panel_pops.csv.",
      options: false,
    });
    expect(individualsTabShows(pending, "text")).toEqual({
      kind: "reading",
      text: "Reading panel_pops.csv.",
      options: true,
    });
    expect(individualsTabShows(pending, "xlsx")).toEqual({
      kind: "reading",
      text: "Reading panel_pops.csv.",
      options: false,
    });
  });

  test("refused as text: the options and the line that sends to the box", () => {
    const refused = sourceOf(
      project({
        read: {
          kind: "failed",
          error: {
            kind: "raggedRow",
            line: 2,
            expected: 1,
            found: 2,
            separator: ",",
          },
          format: "text",
        },
      }),
    );
    expect(individualsTabShows(refused, null)).toEqual({
      kind: "refused",
      text: "panel_pops.csv could not be read; the box Individuals file says why.",
      options: true,
    });
  });

  test("refused as an xlsx, or before table_io read it, or the worker failed: the line alone", () => {
    for (const read of [
      {
        kind: "failed",
        error: { kind: "oldExcel" },
        format: "xlsx",
      },
      {
        kind: "failed",
        error: { kind: "tooLarge", size: 312_400_000, max: 20_000_000 },
        format: null,
      },
      {
        kind: "failed",
        error: {
          kind: "worker",
          error: { kind: "workerFailed", message: "x" },
        },
        format: null,
      },
    ] as const satisfies readonly IndividualsRead[]) {
      expect(
        individualsTabShows(
          sourceOf(project({ read, name: "panel_pops.xlsx" })),
          "text",
        ),
      ).toEqual({
        kind: "refused",
        text: "panel_pops.xlsx could not be read; the box Individuals file says why.",
        options: false,
      });
    }
  });

  test("read from a text file: the options; from an xlsx, the line of the first sheet", () => {
    expect(individualsTabShows(sourceOf(project()), null)).toEqual({
      kind: "read",
      options: true,
      sheetLine: null,
    });
    expect(
      individualsTabShows(
        sourceOf(
          project({
            read: tableRead(PANEL_POPS, false),
            name: "panel_pops.xlsx",
          }),
        ),
        null,
      ),
    ).toEqual({
      kind: "read",
      options: false,
      sheetLine:
        "Read from the first sheet of panel_pops.xlsx; any other sheet is not read.",
    });
  });

  test("the heading of the individuals not in the file, and the name of the table", () => {
    expect(notInFileHeading("panel.nei", "panel_pops.csv")).toBe(
      "Individuals in panel.nei but not in panel_pops.csv, before the filters",
    );
    expect(tableLabel("panel_pops.csv")).toBe("The table of panel_pops.csv");
    expect(tableLabel("a\u202eb.csv")).toBe("The table of a\\u202eb.csv");
  });

  test("the line over the table: its size, and Sorting… after it while a sort is drawn", () => {
    const table = {
      columns: ["IID", "pop"],
      rows: [
        ["s0", "p0"],
        ["s1", "p1"],
      ],
    };
    expect(tableSizeText(table, false)).toBe("2 rows, 2 columns");
    expect(tableSizeText(table, true)).toBe("2 rows, 2 columns. Sorting…");
  });
});

describe("IN5 D1 what the status region says of a read of the individuals file", () => {
  test("nothing with no file, or a file being read", () => {
    const none = project({ read: null });
    expect(individualsReadAnnouncement(none, keptOf(none))).toBeNull();
    const pending = project({ read: { kind: "pending" } });
    expect(individualsReadAnnouncement(pending, keptOf(pending))).toBeNull();
  });

  test("a file read with its column", () => {
    const p = project();
    expect(individualsReadAnnouncement(p, keptOf(p))).toBe(
      "panel_pops.csv read: 200 rows, the populations from popcat.",
    );
  });

  test("a file read with no column chosen, and with no column qualified", () => {
    const none = project({ grouping: { kind: "populations", column: null } });
    expect(individualsReadAnnouncement(none, keptOf(none))).toBe(
      "panel_pops.csv read: 200 rows, no column chosen for the populations.",
    );
    const names = project({
      read: tableRead({
        columns: ["IID;popcat"],
        rows: PANEL_INDIVIDUALS.map((name) => [name]),
      }),
      grouping: { kind: "populations", column: null },
    });
    expect(individualsReadAnnouncement(names, keptOf(names))).toBe(
      "panel_pops.csv read: 200 rows, no column chosen for the populations. No column of panel_pops.csv holds text with 20 different values or fewer, so none was chosen as the column of the populations. Choose it in the list.",
    );
  });

  test("a file read and the warning of none in the file after it", () => {
    const p = project({
      read: tableRead(
        panelPopsWith([], (row) => [
          String(row[0]).toUpperCase(),
          row[1] ?? null,
        ]),
      ),
    });
    expect(individualsReadAnnouncement(p, keptOf(p))).toBe(
      "panel_pops.csv read: 200 rows, the populations from popcat. Warning: none of the 200 individuals of panel.nei is in panel_pops.csv, so all of them are unclassified. The first column of panel_pops.csv has to hold their names as panel.nei writes them: panel.nei starts with s000, and panel_pops.csv with S000.",
    );
  });

  test("a file read and the warning of too many values after it, before the variants file too", () => {
    const p = project({
      read: tableRead(manyValues(21)),
      grouping: { kind: "populations", column: "pop" },
      variantsIndividuals: null,
    });
    expect(individualsReadAnnouncement(p, keptOf(p))).toBe(
      "panel_pops.csv read: 21 rows, the populations from pop. Warning: pop has 21 different values, too many for a column of populations: the individuals are counted here only for a column of 20 different values or fewer. If it is not the column of the populations, choose another in the list.",
    );
  });

  test("a file of one row", () => {
    const p = project({
      read: tableRead(panelPopsWith(PANEL_INDIVIDUALS.slice(1))),
    });
    expect(individualsReadAnnouncement(p, keptOf(p))).toBe(
      "panel_pops.csv read: 1 row, the populations from popcat.",
    );
  });

  test("a file refused: the words of the box", () => {
    const p = project({
      read: {
        kind: "failed",
        error: {
          kind: "raggedRow",
          line: 2,
          expected: 1,
          found: 2,
          separator: ",",
        },
        format: "text",
      },
    });
    const words = individualsReadAnnouncement(p, keptOf(p));
    expect(words).toBe(individualsBoxNeeds(p));
    expect(words).toMatch(
      /^panel_pops\.csv could not be read: .*\. Choose another separator in the tab Individuals file, or open a corrected file\.$/u,
    );
  });
});
