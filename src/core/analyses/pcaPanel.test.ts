/**
 * The functions of core that the panel of the principal components reads
 * (docs/specs/analyses/pca.md, "How it is verified"): the colours, the
 * columns that can colour, the components drawn, the rows and the CSV
 * files, the description a screen reader reads, and the note of the
 * missing genotypes. The result of the flow is popnei's, the PCA of
 * panel.nei with the missing data filter at 0.1 and the PCA's own LD
 * filter at r² 0.1 within 50,000 base pairs, which
 * e2e/fixtures/make_fixtures.mjs wrote to panel_pca.json, since the tests
 * of core may not call popnei; the metadata file is panel_meta.csv, which
 * it wrote too.
 */
import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

import {
  MANY_MISSING_RATE,
  MAX_COLOUR_GROUPS,
  NO_COLOUR_GROUP,
  PCA_DEFAULTS,
  axesShown,
  colourColumns,
  manyMissingNote,
  pca,
  pcaColours,
  pcaCsv,
  pcaOptions,
  pcaDescription,
  pcaRows,
  varianceCsv,
} from "./pca.ts";
import type { PcaColours, PcaOptions } from "./pca.ts";
import type { IndividualStats } from "../individualsKept.ts";
import type { JsonObject } from "../keys.ts";
import type { Grouping, Project } from "../project.ts";
import { deepFreeze } from "../testSupport.ts";
import type {
  Cell,
  ColumnType,
  IndividualsTable,
  PassStats,
  PcaResult,
} from "../../worker/protocol.ts";

const VARIANTS_ID = "00112233445566778899aabbccddeeff";
const INDIVIDUALS_ID = "ffeeddccbbaa99887766554433221100";

/** The PCA's options over its defaults, as the project holds them. */
function optionsJson(options: Partial<PcaOptions>): JsonObject {
  const parsed = pca.parseOptions({ ...PCA_DEFAULTS, ...options }, 1);
  if (!parsed.ok) {
    throw new Error(`options refused: ${parsed.error}`);
  }
  return parsed.value;
}

/** A metadata file as a test gives it: its table, the type of each
    column but the first, and the decimal mark of its read, `null` for an
    xlsx, whose read finds none. */
interface Meta {
  readonly name?: string;
  readonly table: IndividualsTable;
  readonly types: readonly ColumnType[];
  readonly decimal?: "." | "," | null;
}

/** What a test sets of a project. */
interface Setting {
  /** The individuals of the variants file. */
  readonly individuals: readonly string[];
  /** The name of the variants file; panel.nei. */
  readonly variantsName?: string;
  /** The metadata file, or none. */
  readonly meta: Meta | null;
  /** The grouping; the populations of the column `pop`. */
  readonly grouping?: Grouping;
  /** The options of the PCA over its defaults. */
  readonly options?: Partial<PcaOptions>;
}

/** A project of population genetics, frozen deeply. */
function project(setting: Setting): Project {
  const meta = setting.meta;
  return deepFreeze<Project>({
    app: "popgen",
    variants: {
      fileId: VARIANTS_ID,
      name: setting.variantsName ?? "panel.nei",
      size: 261_490,
      format: "nei",
      readOptions: null,
      read: {
        kind: "read",
        individuals: [...setting.individuals],
        ploidy: 2,
        numVars: 1200,
      },
    },
    filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.1 }],
    filtersOff: [],
    individualFilters: [],
    individualFiltersOff: [],
    individuals:
      meta === null
        ? null
        : {
            fileId: INDIVIDUALS_ID,
            name: meta.name ?? "pops.csv",
            csv: { encoding: "auto", separator: "auto", decimal: "auto" },
            typesSet: [],
            read: {
              kind: "read",
              table: meta.table,
              columns: [{ kind: "identifier" }, ...meta.types],
              found:
                meta.decimal === null
                  ? null
                  : {
                      encoding: "utf-8",
                      separator: ",",
                      decimal: meta.decimal ?? ".",
                      undecodedLine: null,
                    },
            },
          },
    grouping: setting.grouping ?? { kind: "populations", column: "pop" },
    analyses:
      setting.options === undefined
        ? []
        : [{ analysis: "pca", options: optionsJson(setting.options) }],
    reference: null,
  });
}

const PASS: PassStats = { numVars: 1200, filtering: {} };

/** A result of the PCA of `individuals` on `numComps` components, each
    individual's projections `rows[i]`, or 0 on each. */
function result(
  individuals: readonly string[],
  numComps = 3,
  rows: readonly (readonly number[])[] = [],
  method: "pca" | "pcoa" = "pca",
): PcaResult {
  const projections = new Float64Array(individuals.length * numComps);
  for (const [i, row] of rows.entries()) {
    projections.set(row, i * numComps);
  }
  return {
    analysis: "pca",
    method,
    individuals: [...individuals],
    numComps,
    numCompsFound: numComps,
    projections,
    explainedVariancePercent: Float64Array.from(
      { length: numComps },
      (_, i) => 10 - i,
    ),
    numVarsUsed: method === "pca" ? 1200 : null,
    lingoesConstant: method === "pca" ? null : 0,
    negativeEigenvaluesPercent: method === "pca" ? null : 0,
    passStats: PASS,
  };
}

// The worked table of the diversity's spec: i1 A, i2 B, i3 A, i4 with no
// population, in the column pop.
const WORKED: Meta = {
  table: {
    columns: ["IID", "pop"],
    rows: [
      ["i1", "A"],
      ["i2", "B"],
      ["i3", "A"],
      ["i4", null],
    ],
  },
  types: [{ kind: "categorical" }],
};
const FOUR = ["i1", "i2", "i3", "i4"];

/** The colours as groups, or a failure of the test. */
function groupsOf(
  c: PcaColours,
): Extract<PcaColours, { readonly kind: "groups" }> {
  if (c.kind !== "groups") {
    throw new Error(`the colours are ${c.kind}, not groups`);
  }
  return c;
}

/** The meaning of the reason noColumn and what follows it in the note. */
const NO_COLUMN_NOTE =
  "Choose the column that defines the populations, or all individuals in one population, in the Individuals step. Meanwhile the points are not coloured by population; another column can colour them.";

describe("IP8 D3 pcaColours", () => {
  test("the populations of the worked table: A and B in their order, counts 2 and 1, and i4 in no group", () => {
    const p = project({ individuals: FOUR, meta: WORKED });
    const c = groupsOf(pcaColours(result(FOUR), p));
    expect(c.title).toBe("Population");
    expect(c.names).toEqual(["A", "B"]);
    expect([...c.group]).toEqual([0, 1, 0, NO_COLOUR_GROUP]);
    expect(c.counts).toEqual([2, 1]);
    expect(c.numNone).toBe(1);
    expect(c.noneName).toBe("No population");
    expect(c.note).toBeNull();
  });

  test("a result of i1, i2 and i4 alone, as a filter of individuals gives it: the names A and B still, counts 1 and 1, so B keeps its index", () => {
    const p = project({ individuals: FOUR, meta: WORKED });
    const c = groupsOf(pcaColours(result(["i1", "i2", "i4"]), p));
    expect(c.names).toEqual(["A", "B"]);
    expect([...c.group]).toEqual([0, 1, NO_COLOUR_GROUP]);
    expect(c.counts).toEqual([1, 1]);
  });

  test("a result of i1, i3 and i4: the names A and B, counts 2 and 0", () => {
    const p = project({ individuals: FOUR, meta: WORKED });
    const c = groupsOf(pcaColours(result(["i1", "i3", "i4"]), p));
    expect(c.names).toEqual(["A", "B"]);
    expect(c.counts).toEqual([2, 0]);
    expect(c.numNone).toBe(1);
  });

  test("a continuous column of 1,5, 2, 3 and a missing cell, read with the comma: the values 1.5, 2, 3 and NaN", () => {
    const p = project({
      individuals: FOUR,
      meta: {
        table: {
          columns: ["IID", "pop", "height"],
          rows: [
            ["i1", "A", "1,5"],
            ["i2", "B", "2"],
            ["i3", "A", "3"],
            ["i4", null, null],
          ],
        },
        types: [{ kind: "categorical" }, { kind: "continuous" }],
        decimal: ",",
      },
      options: { colourBy: "height" },
    });
    const c = pcaColours(result(FOUR), p);
    expect(c.kind).toBe("values");
    if (c.kind !== "values") return;
    expect([...c.values]).toEqual([1.5, 2, 3, NaN]);
    expect(c.numNone).toBe(1);
    expect(c.title).toBe("height");
    expect(c.noneName).toBe("No value");
    expect(c.note).toBeNull();
  });

  test("a categorical or binary column colours by the text of each cell, titled by its name, with No value for a missing cell", () => {
    const p = project({
      individuals: FOUR,
      meta: {
        table: {
          columns: ["IID", "pop", "sex"],
          rows: [
            ["i1", "A", "f"],
            ["i2", "B", null],
            ["i3", "A", "m"],
            ["i4", null, "f"],
          ],
        },
        types: [
          { kind: "categorical" },
          { kind: "binary", one: "f", zero: "m" },
        ],
      },
      options: { colourBy: "sex" },
    });
    const c = groupsOf(pcaColours(result(FOUR), p));
    expect(c.title).toBe("sex");
    expect(c.names).toEqual(["f", "m"]);
    expect([...c.group]).toEqual([0, NO_COLOUR_GROUP, 1, 0]);
    expect(c.counts).toEqual([2, 1]);
    expect(c.noneName).toBe("No value");
    expect(c.note).toBeNull();
  });

  test("the numbers and booleans of an xlsx in a categorical or binary column are groups by their text, a score from 1 to 5 set as categorical five groups", () => {
    const p = project({
      individuals: FOUR,
      meta: {
        name: "pops.xlsx",
        table: {
          columns: ["IID", "pop", "score", "sick"],
          rows: [
            ["i1", "A", 1, true],
            ["i2", "B", 5, false],
            ["i3", "A", 3, true],
            ["i4", null, 2.5, null],
          ],
        },
        types: [
          { kind: "categorical" },
          { kind: "categorical" },
          { kind: "binary", one: "true", zero: "false" },
        ],
        decimal: null,
      },
      options: { colourBy: "score" },
    });
    const score = groupsOf(pcaColours(result(FOUR), p));
    expect(score.title).toBe("score");
    expect(score.names).toEqual(["1", "5", "3", "2.5"]);
    expect([...score.group]).toEqual([0, 1, 2, 3]);
    const sick = groupsOf(
      pcaColours(result(FOUR), {
        ...p,
        analyses: [
          { analysis: "pca", options: optionsJson({ colourBy: "sick" }) },
        ],
      }),
    );
    expect(sick.names).toEqual(["true", "false"]);
    expect([...sick.group]).toEqual([0, 1, 0, NO_COLOUR_GROUP]);
    expect(sick.counts).toEqual([2, 1]);
    const scores = project({
      individuals: FOUR,
      meta: {
        table: {
          columns: ["IID", "pop", "score"],
          rows: [
            ["i1", "A", "1"],
            ["i2", "B", "2"],
            ["i3", "A", "3"],
            ["i4", null, "4"],
            ["i5", null, "5"],
          ],
        },
        types: [{ kind: "categorical" }, { kind: "categorical" }],
      },
      options: { colourBy: "score" },
    });
    expect(groupsOf(pcaColours(result(FOUR), scores)).names).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);
  });

  test("a continuous column of an xlsx is read with the point: its numbers, and a text with a point", () => {
    const p = project({
      individuals: FOUR,
      meta: {
        name: "pops.xlsx",
        table: {
          columns: ["IID", "pop", "altitude"],
          rows: [
            ["i1", "A", 1.5],
            ["i2", "B", "2.25"],
            ["i3", "A", "3,5"],
            ["i4", null, null],
          ],
        },
        types: [{ kind: "categorical" }, { kind: "continuous" }],
        decimal: null,
      },
      options: { colourBy: "altitude" },
    });
    const c = pcaColours(result(FOUR), p);
    if (c.kind !== "values") {
      throw new Error(`the colours are ${c.kind}, not values`);
    }
    expect([...c.values]).toEqual([1.5, 2.25, NaN, NaN]);
    expect(c.numNone).toBe(2);
  });

  test("more populations than 1,000, with colourBy null: one group, and the note of a column of more values than the plot can tell apart", () => {
    const names = Array.from(
      { length: MAX_COLOUR_GROUPS + 1 },
      (_, i) => `i${String(i)}`,
    );
    const p = project({
      individuals: names,
      meta: {
        table: {
          columns: ["IID", "pop"],
          rows: names.map((name): Cell[] => [name, `p${name}`]),
        },
        types: [{ kind: "categorical" }],
      },
    });
    const c = groupsOf(pcaColours(result(names), p));
    expect(c.title).toBe("Population");
    expect(c.names).toEqual(["All individuals"]);
    expect(c.counts).toEqual([1001]);
    expect(c.note).toBe(
      "pop has 1,001 different values, more than the 1,000 the plot can tell apart, so the points are of one colour; the table gives each individual's value.",
    );
    expect(pcaOptions(p).colourBy).toBeNull();
    // The table gives each individual's population, as the note says
    // (stop C 9).
    expect(c.cellTexts?.slice(0, 2)).toEqual(["pi0", "pi1"]);
    const rows = pcaRows(result(names), c);
    expect(rows.map((row) => row.colour).slice(0, 2)).toEqual(["pi0", "pi1"]);
    expect(pcaCsv(result(names), c).split("\n")[1]).toMatch(/^i0,pi0,/);
  });

  test("a categorical column of more than 1,000 values: one group, and the table gives each individual's value, No value for a missing cell", () => {
    const names = Array.from(
      { length: MAX_COLOUR_GROUPS + 2 },
      (_, i) => `i${String(i)}`,
    );
    const p = project({
      individuals: names,
      meta: {
        table: {
          columns: ["IID", "pop", "plot"],
          rows: names.map((name, i): Cell[] => [
            name,
            "A",
            i === 1 ? null : `plot${name}`,
          ]),
        },
        types: [{ kind: "categorical" }, { kind: "categorical" }],
      },
      options: { colourBy: "plot" },
    });
    const c = groupsOf(pcaColours(result(names), p));
    expect(c.title).toBe("plot");
    expect(c.names).toEqual(["All individuals"]);
    expect(c.cellTexts?.slice(0, 3)).toEqual(["ploti0", null, "ploti2"]);
    expect(
      pcaRows(result(names), c)
        .slice(0, 3)
        .map((row) => row.colour),
    ).toEqual(["ploti0", null, "ploti2"]);
  });

  test("a colouring the plot can draw gives no text of each individual", () => {
    const p = project({ individuals: FOUR, meta: WORKED });
    expect(groupsOf(pcaColours(result(FOUR), p)).cellTexts).toBeNull();
    const none = project({ individuals: FOUR, meta: null });
    expect(groupsOf(pcaColours(result(FOUR), none)).cellTexts).toBeNull();
  });

  test("colourBy a column the table does not have: the populations, and the note", () => {
    const p = project({
      individuals: FOUR,
      meta: WORKED,
      options: { colourBy: "country" },
    });
    const c = groupsOf(pcaColours(result(FOUR), p));
    expect(c.title).toBe("Population");
    expect(c.names).toEqual(["A", "B"]);
    expect(c.note).toBe(
      "pops.csv has no column country, by which the points were coloured, so they are coloured by the populations.",
    );
  });

  test("with no metadata file, the one group All individuals and no note", () => {
    const p = project({ individuals: FOUR, meta: null });
    const c = groupsOf(pcaColours(result(FOUR), p));
    expect(c.names).toEqual(["All individuals"]);
    expect([...c.group]).toEqual([0, 0, 0, 0]);
    expect(c.counts).toEqual([4]);
    expect(c.numNone).toBe(0);
    expect(c.note).toBeNull();
  });

  test("with no metadata file and colourBy country, the same group and the note of a colour with no file", () => {
    const p = project({
      individuals: FOUR,
      meta: null,
      options: { colourBy: "country" },
    });
    const c = groupsOf(pcaColours(result(FOUR), p));
    expect(c.names).toEqual(["All individuals"]);
    expect(c.note).toBe(
      "No metadata file is loaded, so the points cannot be coloured by country.",
    );
  });

  test("with a file and no column chosen, one group and the note made of the reason of noColumn", () => {
    const p = project({
      individuals: FOUR,
      meta: WORKED,
      grouping: { kind: "populations", column: null },
    });
    const c = groupsOf(pcaColours(result(FOUR), p));
    expect(c.names).toEqual(["All individuals"]);
    expect(c.counts).toEqual([4]);
    expect(c.note).toBe(NO_COLUMN_NOTE);
  });

  test("with a column of the populations the table no longer has, one group and the note of noSuchColumn", () => {
    const p = project({
      individuals: FOUR,
      meta: WORKED,
      grouping: { kind: "populations", column: "popcat" },
    });
    const c = groupsOf(pcaColours(result(FOUR), p));
    expect(c.names).toEqual(["All individuals"]);
    expect(c.note).toBe(
      `pops.csv has no column popcat, from which the populations were taken. ${NO_COLUMN_NOTE}`,
    );
  });

  test("with the grouping of one population, the one group and no note", () => {
    const p = project({
      individuals: FOUR,
      meta: WORKED,
      grouping: { kind: "onePopulation" },
    });
    const c = groupsOf(pcaColours(result(FOUR), p));
    expect(c.names).toEqual(["All individuals"]);
    expect(c.note).toBeNull();
  });

  test("with the column pop and no individual of the variants in it, every individual in no group and the note of noPopulation", () => {
    const others = ["x1", "x2"];
    const p = project({ individuals: others, meta: WORKED });
    const c = groupsOf(pcaColours(result(others), p));
    expect(c.names).toEqual(["A", "B"]);
    expect([...c.group]).toEqual([NO_COLOUR_GROUP, NO_COLOUR_GROUP]);
    expect(c.counts).toEqual([0, 0]);
    expect(c.numNone).toBe(2);
    expect(c.note).toBe(
      "No individual of panel.nei has a population in the column pop of pops.csv. Fill in the column and load the file again, or choose another column, in the Individuals step. Meanwhile the points are not coloured by population; another column can colour them.",
    );
  });

  test("colourBy a categorical column of 1,001 values: one group and the note of a column of more values than the plot can tell apart; 1,000 are groups", () => {
    const many = (count: number): Meta => ({
      table: {
        columns: ["IID", "pop", "popcat"],
        rows: FOUR.map((name, i): Cell[] => [
          name,
          "A",
          `v${String(i)}`,
        ]).concat(
          Array.from({ length: count - 4 }, (_, i): Cell[] => [
            `extra${String(i)}`,
            "A",
            `w${String(i)}`,
          ]),
        ),
      },
      types: [{ kind: "categorical" }, { kind: "categorical" }],
    });
    const over = project({
      individuals: FOUR,
      meta: many(MAX_COLOUR_GROUPS + 1),
      options: { colourBy: "popcat" },
    });
    const c = groupsOf(pcaColours(result(FOUR), over));
    expect(c.title).toBe("popcat");
    expect(c.names).toEqual(["All individuals"]);
    expect(c.counts).toEqual([4]);
    expect(c.note).toBe(
      "popcat has 1,001 different values, more than the 1,000 the plot can tell apart, so the points are of one colour; the table gives each individual's value.",
    );
    const at = project({
      individuals: FOUR,
      meta: many(MAX_COLOUR_GROUPS),
      options: { colourBy: "popcat" },
    });
    expect(groupsOf(pcaColours(result(FOUR), at)).names).toHaveLength(1000);
  });

  test("the same object for the same result and project, and for a change of the axes or the view; another for another colour, and the first again when it comes back", () => {
    const r = result(FOUR);
    const p = project({ individuals: FOUR, meta: WORKED });
    const first = pcaColours(r, p);
    expect(pcaColours(r, p)).toBe(first);
    const axes = {
      ...p,
      analyses: [
        {
          analysis: "pca",
          options: optionsJson({ axes: [2, 1, 3], view: "2d" }),
        },
      ],
    };
    expect(pcaColours(r, axes)).toBe(first);
    const byNone = {
      ...p,
      analyses: [
        { analysis: "pca", options: optionsJson({ colourBy: "pop" }) },
      ],
    };
    const other = pcaColours(r, byNone);
    expect(other).not.toBe(first);
    expect(groupsOf(other).title).toBe("pop");
    expect(pcaColours(r, p)).toBe(first);
    expect(pcaColours(result(FOUR), p)).not.toBe(first);
  });

  test("a new metadata file, or another column of the populations, colours the same result anew", () => {
    const r = result(FOUR);
    const p = project({ individuals: FOUR, meta: WORKED });
    expect(groupsOf(pcaColours(r, p)).names).toEqual(["A", "B"]);
    const reloaded = project({
      individuals: FOUR,
      meta: {
        table: {
          columns: ["IID", "pop"],
          rows: [
            ["i1", "C"],
            ["i2", "C"],
            ["i3", "D"],
            ["i4", "D"],
          ],
        },
        types: [{ kind: "categorical" }],
      },
    });
    // The same grouping and option, and another file.
    const sameGrouping = { ...p, individuals: reloaded.individuals };
    expect(groupsOf(pcaColours(r, sameGrouping)).names).toEqual(["C", "D"]);
    const regrouped = {
      ...p,
      grouping: { kind: "onePopulation" } as const,
    };
    expect(groupsOf(pcaColours(r, regrouped)).names).toEqual([
      "All individuals",
    ]);
    expect(groupsOf(pcaColours(r, p)).names).toEqual(["A", "B"]);
  });
});

describe("IP8 D3 colourColumns", () => {
  test("every column but the first, and not a categorical column of 1,001 values, where a continuous one of as many is offered; one of 1,000 is offered", () => {
    const rows = Array.from(
      { length: MAX_COLOUR_GROUPS + 1 },
      (_, i): Cell[] => [
        `s${String(i)}`,
        i % 2 === 0 ? "p0" : "p1",
        `c${String(i)}`,
        String(i),
        i % 2 === 0 ? "yes" : "no",
        // 1,000 values: the last row repeats the first.
        `b${String(i % MAX_COLOUR_GROUPS)}`,
      ],
    );
    const p = project({
      individuals: ["s0"],
      meta: {
        table: {
          columns: ["IID", "pop", "code", "altitude", "sick", "batch"],
          rows,
        },
        types: [
          { kind: "categorical" },
          { kind: "categorical" },
          { kind: "continuous" },
          { kind: "binary", one: "yes", zero: "no" },
          { kind: "categorical" },
        ],
      },
    });
    expect(colourColumns(p)).toEqual(["pop", "altitude", "sick", "batch"]);
    expect(colourColumns(p)).toBe(colourColumns(p));
    expect(colourColumns(project({ individuals: FOUR, meta: WORKED }))).toEqual(
      ["pop"],
    );
    expect(colourColumns(project({ individuals: FOUR, meta: null }))).toEqual(
      [],
    );
  });
});

describe("IP8 D3 axesShown", () => {
  test("[4, 5, 6] on three components: the first three, and the note", () => {
    const o = { ...PCA_DEFAULTS, axes: [4, 5, 6] as const };
    expect(axesShown(o, result(FOUR, 3))).toEqual({
      axes: [1, 2, 3],
      note: "The axes chosen, PC4, PC5 and PC6, are beyond the 3 components of this result, so PC1, PC2 and PC3 are drawn.",
    });
  });

  test("[2, 1, 3] on two: [2, 1], and the note of the third, which the 3D view needs", () => {
    const o = { ...PCA_DEFAULTS, axes: [2, 1, 3] as const };
    expect(axesShown(o, result(FOUR, 2))).toEqual({
      axes: [2, 1],
      note: "The 3D view needs three components, and this result has 2.",
    });
  });

  test("the axes chosen within the result are drawn as chosen with no note; one beyond takes the first component not shown", () => {
    expect(
      axesShown({ ...PCA_DEFAULTS, axes: [3, 1, 2] }, result(FOUR, 10)),
    ).toEqual({ axes: [3, 1, 2], note: null });
    expect(
      axesShown({ ...PCA_DEFAULTS, axes: [1, 5, 2] }, result(FOUR, 3)),
    ).toEqual({
      axes: [1, 3, 2],
      note: "The axis chosen, PC5, is beyond the 3 components of this result, so PC1, PC3 and PC2 are drawn.",
    });
  });

  test("one component: PC1 and the line that there is no plot", () => {
    expect(axesShown(PCA_DEFAULTS, result(["s000", "s001"], 1))).toEqual({
      axes: [1],
      note: "Only one component has variance, since 2 individuals have one axis between them, so there is no plot; the table gives each individual's place on it.",
    });
  });
});

/** The PCA of the flow that make_fixtures.mjs wrote with popnei. */
function flowResult(): PcaResult {
  const parsed: unknown = JSON.parse(
    readFileSync(
      new URL("../../../e2e/fixtures/panel_pca.json", import.meta.url),
      "utf8",
    ),
  );
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("individuals" in parsed) ||
    !("numComps" in parsed) ||
    !("numCompsFound" in parsed) ||
    !("numVarsUsed" in parsed) ||
    !("explainedVariancePercent" in parsed) ||
    !("projections" in parsed)
  ) {
    throw new Error("panel_pca.json lacks a field");
  }
  const numbers = (value: unknown): Float64Array =>
    Float64Array.from(Array.isArray(value) ? value : [], (v: unknown) =>
      typeof v === "number" ? v : NaN,
    );
  const { individuals, numComps, numCompsFound, numVarsUsed } = parsed;
  if (
    !Array.isArray(individuals) ||
    typeof numComps !== "number" ||
    typeof numCompsFound !== "number" ||
    typeof numVarsUsed !== "number"
  ) {
    throw new Error("panel_pca.json has a field of another type");
  }
  return {
    analysis: "pca",
    method: "pca",
    individuals: individuals.map(String),
    numComps,
    numCompsFound,
    projections: numbers(parsed.projections),
    explainedVariancePercent: numbers(parsed.explainedVariancePercent),
    numVarsUsed,
    lingoesConstant: null,
    negativeEigenvaluesPercent: null,
    passStats: {
      numVars: 548,
      filtering: {
        missing_data: { varsProcessed: 1200, varsKept: 1200 },
        ld: { varsProcessed: 1200, varsKept: 548 },
      },
    },
  };
}

/** panel_meta.csv as the reader reads it: its header, and a cell of NA
    missing. */
function panelMeta(): IndividualsTable {
  const [header = "", ...lines] = readFileSync(
    new URL("../../../e2e/fixtures/panel_meta.csv", import.meta.url),
    "utf8",
  )
    .trim()
    .split("\n");
  return {
    columns: header.split(","),
    rows: lines.map((line) =>
      line.split(",").map((cell): Cell => (cell === "NA" ? null : cell)),
    ),
  };
}

/** The project of the flow: panel.nei, panel_meta.csv, the populations of
    popcat, and the PCA's options over its defaults. */
function flowProject(options: Partial<PcaOptions> = {}): Project {
  const table = panelMeta();
  return project({
    individuals: table.rows.map((row) => String(row[0])),
    meta: {
      name: "panel_meta.csv",
      table,
      types: [{ kind: "categorical" }, { kind: "continuous" }],
    },
    grouping: { kind: "populations", column: "popcat" },
    options: {
      ld: { follow: false, maxAllowedR2: 0.1, maxDist: 50000 },
      ...options,
    },
  });
}

describe("IP8 D3 pcaRows, pcaCsv and varianceCsv", () => {
  test("the CSV of the table and of the explained variance of the flow, as literals of their first rows", () => {
    const r = flowResult();
    const p = flowProject();
    const c = pcaColours(r, p);
    const csv = pcaCsv(r, c).split("\n");
    expect(csv.slice(0, 3)).toEqual([
      "individual,population,PC1,PC2,PC3,PC4,PC5,PC6,PC7,PC8,PC9,PC10",
      "s000,p0,-0.7138853335304419,7.676473141448964,-4.384383801903496,-0.6857327411694335,4.150190887986513,-4.2950761371553305,-6.489974158703465,-1.9126066310267416,-4.692272485950648,-2.9771327283230535",
      "s001,p0,0.7233147341437971,8.731867503840187,-5.453095719394304,-1.7873112301287846,5.388370055155143,-4.215014734336747,-7.179373585248658,-3.806509412182633,-4.715164870056299,-4.398776112703681",
    ]);
    expect(csv).toHaveLength(202);
    expect(csv.at(-1)).toBe("");
    expect(varianceCsv(r)).toBe(
      [
        "component,explained_variance_percent",
        "PC1,3.5476992895181616",
        "PC2,3.402040462155611",
        "PC3,1.8945553874570624",
        "PC4,1.8450769825884152",
        "PC5,1.758262625226421",
        "PC6,1.7485467724341495",
        "PC7,1.708007168008476",
        "PC8,1.686458089265927",
        "PC9,1.6382789728126605",
        "PC10,1.6282559875034457",
        "",
      ].join("\n"),
    );
    const byAltitude = pcaColours(r, flowProject({ colourBy: "altitude" }));
    const altitude = pcaCsv(r, byAltitude).split("\n");
    expect(altitude[0]).toBe(
      "individual,altitude,PC1,PC2,PC3,PC4,PC5,PC6,PC7,PC8,PC9,PC10",
    );
    expect(altitude[1]?.startsWith("s000,100,-0.7138853335304419,")).toBe(true);
    expect(altitude[200]?.startsWith("s199,,")).toBe(true);
  });

  test('a group named a,"b" is quoted with its quotes doubled, as is an individual, and a title is in lower case; no group is an empty field', () => {
    const names = ["x,1", "x2"];
    const p = project({
      individuals: names,
      meta: {
        table: {
          columns: ["IID", "Origin"],
          rows: [
            ["x,1", 'a,"b"'],
            ["x2", null],
          ],
        },
        types: [{ kind: "categorical" }],
      },
      options: { colourBy: "Origin" },
    });
    const r = result(names, 2, [
      [-1.5, 2],
      [3, -0.25],
    ]);
    const c = pcaColours(r, p);
    expect(pcaCsv(r, c)).toBe(
      'individual,origin,PC1,PC2\n"x,1","a,""b""",-1.5,2\nx2,,3,-0.25\n',
    );
  });

  test("PA10 an individual, a group and a column that start with =, - or + have a quote before them, and a negative coordinate stays a number", () => {
    const names = ["=x1", "x2"];
    const p = project({
      individuals: names,
      meta: {
        table: {
          columns: ["IID", "+Origin"],
          rows: [
            ["=x1", "-north"],
            ["x2", null],
          ],
        },
        types: [{ kind: "categorical" }],
      },
      options: { colourBy: "+Origin" },
    });
    const r = result(names, 2, [
      [-1.5, 2],
      [3, -0.25],
    ]);
    const c = pcaColours(r, p);
    expect(pcaCsv(r, c)).toBe(
      "individual,'+origin,PC1,PC2\n'=x1,'-north,-1.5,2\nx2,,3,-0.25\n",
    );
  });

  test("the rows: each individual with its group or value and every component kept, the same frozen array for the same result and colours", () => {
    const r = flowResult();
    const c = pcaColours(r, flowProject({ colourBy: "altitude" }));
    const rows = pcaRows(r, c);
    expect(rows).toHaveLength(200);
    expect(rows[0]).toEqual({
      individual: "s000",
      colour: 100,
      projections: Array.from(r.projections.subarray(0, 10)),
    });
    expect(rows[199]?.colour).toBeNull();
    expect(pcaRows(r, c)).toBe(rows);
    expect(Object.isFrozen(rows)).toBe(true);
  });
});

describe("IP8 D3 pcaDescription", () => {
  test("the 2D plot of the flow, coloured by popcat, with p1 highlighted, and the 3D view: the descriptions of 'Accessibility'", () => {
    const r = flowResult();
    const p = flowProject();
    const c = groupsOf(pcaColours(r, p));
    const p1 = c.names.indexOf("p1");
    expect(c.names).toEqual(["p0", "p2", "p1"]);
    expect(pcaDescription(r, c, [1, 2], p1, p)).toBe(
      "Principal components of 200 individuals of panel.nei, PC1, 3.55% of the variance, across, and PC2, 3.40%, up. Coloured by population: p0, 48 individuals, centred at 0.4 on PC1 and 7.4 on PC2; p2, 84, centred at −4.5 and −2.1; p1, 68, centred at 5.3 and −2.7. p1 is highlighted. The table of the individuals gives each one's place.",
    );
    expect(pcaDescription(r, c, [1, 2, 3], p1, p)).toBe(
      "Principal components of 200 individuals of panel.nei in 3D, on PC1, 3.55% of the variance, PC2, 3.40%, and PC3, 1.89%. Coloured by population: p0, 48 individuals, centred at 0.4 on PC1, 7.4 on PC2 and −0.2 on PC3; p2, 84, centred at −4.5, −2.1 and −0.2; p1, 68, centred at 5.3, −2.7 and 0.4. p1 is highlighted. The view turns, so it has no across and up; the 2D plot, one button away, shows two components at a time, and the table of the individuals gives every coordinate.",
    );
  });

  test("coloured by altitude of panel_meta.csv: its line of the range, and no highlight", () => {
    const r = flowResult();
    const p = flowProject({ colourBy: "altitude" });
    const c = pcaColours(r, p);
    expect(pcaDescription(r, c, [2, 1], 0, p)).toBe(
      "Principal components of 200 individuals of panel.nei, PC2, 3.40% of the variance, across, and PC1, 3.55%, up. Coloured by altitude, from 100 to 2060; 3 individuals have no value. The table of the individuals gives each one's place.",
    );
  });

  test("the individuals in no group come last, a highlight of them names them, and a centre that rounds to 0 has no sign", () => {
    const p = project({ individuals: FOUR, meta: WORKED });
    const r = result(FOUR, 2, [
      [-0.04, 1],
      [2, -3],
      [0.02, 1],
      [-7.25, 0.5],
    ]);
    const c = pcaColours(r, p);
    expect(pcaDescription(r, c, [1, 2], NO_COLOUR_GROUP, p)).toBe(
      "Principal components of 4 individuals of panel.nei, PC1, 10.00% of the variance, across, and PC2, 9.00%, up. Coloured by population: A, 2 individuals, centred at 0.0 on PC1 and 1.0 on PC2; B, 1, centred at 2.0 and −3.0; No population, 1, centred at −7.3 and 0.5. No population is highlighted. The table of the individuals gives each one's place.",
    );
    const withoutB = result(["i1", "i3", "i4"], 2, [
      [1, 1],
      [3, 1],
      [0, 0],
    ]);
    expect(
      pcaDescription(withoutB, pcaColours(withoutB, p), [1, 2], null, p),
    ).toBe(
      "Principal components of 3 individuals of panel.nei, PC1, 10.00% of the variance, across, and PC2, 9.00%, up. Coloured by population: A, 2 individuals, centred at 2.0 on PC1 and 1.0 on PC2; No population, 1, centred at 0.0 and 0.0. The table of the individuals gives each one's place.",
    );
    expect(() => pcaDescription(r, c, [1], null, p)).toThrow(
      /^popnei_web defect:/,
    );
    expect(() => pcaDescription(r, c, [1, 3], null, p)).toThrow(
      /^popnei_web defect:/,
    );
  });
});

/** Statistics of each individual with the missing rates `rates`. */
function stats(
  individuals: readonly string[],
  rates: readonly number[],
): IndividualStats {
  return {
    individuals,
    missingGtRate: Float64Array.from(rates),
    obsHetRate: Float64Array.from(rates, () => 0.3),
  };
}

describe("IP8 D3 manyMissingNote", () => {
  test("statistics of 0.25 and 0.1 for two individuals name the first", () => {
    const two = ["s012", "s013"];
    const p = project({ individuals: two, meta: null });
    expect(manyMissingNote(result(two), stats(two, [0.25, 0.1]), p)).toBe(
      "s012 lacks more than 20% of its genotypes over the variants of panel.nei. The PCA gives a missing genotype the mean of its variant, which draws an individual toward the centre of the plot about as much as it lacks. The PCoA of the Kosman distances compares each pair over the variants both have called, and does not.",
    );
  });

  test("a PCoA, or no statistics, give null; a rate of exactly 0.2 is not above it; more than three are the first two and how many more", () => {
    const five = ["a", "b", "c", "d", "e"];
    const p = project({ individuals: five, meta: null });
    const s = stats(five, [0.3, 0.5, MANY_MISSING_RATE, 0.9, 0.21]);
    expect(manyMissingNote(result(five, 3, [], "pcoa"), s, p)).toBeNull();
    expect(manyMissingNote(result(five), null, p)).toBeNull();
    expect(
      manyMissingNote(result(five), stats(five, [0, 0, 0.2, 0, 0]), p),
    ).toBeNull();
    expect(manyMissingNote(result(five), s, p)).toBe(
      "a, b and 2 more lack more than 20% of their genotypes over the variants of panel.nei. The PCA gives a missing genotype the mean of its variant, which draws an individual toward the centre of the plot about as much as it lacks. The PCoA of the Kosman distances compares each pair over the variants both have called, and does not.",
    );
  });
});
