/**
 * Which tab of the analyses of popgen2.html is greyed, and why
 * (docs/specs/core/popgen2Tabs.md, "How it is verified" and "The cases"),
 * on frozen projects of `panel.nei`, of 200 individuals, and
 * `panel_pops.csv`, whose column `popcat` gives p0 48, p2 84 and p1 68.
 */
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import { individualsKept } from "./individualsKept.ts";
import type { IndividualsKept } from "./individualsKept.ts";
import { analysisTabs } from "./popgen2Tabs.ts";
import {
  FORMAT_VERSION,
  emptyProject,
  loadIndividuals,
  loadVariants,
  parseProject,
  recordIndividualsRead,
  recordVariantsRead,
  setGrouping,
  setIndividualFilter,
} from "./project.ts";
import type {
  Grouping,
  IndividualsReadGiven,
  Project,
  TableRead,
} from "./project.ts";
import { deepFreeze } from "./testSupport.ts";
import type {
  Cell,
  CsvOptions,
  IndividualFilter,
  IndividualsTable,
} from "../worker/protocol.ts";

/** The table of `panel_pops.csv`, every cell a text. */
function panelPops(): IndividualsTable {
  const text = readFileSync(
    new URL("../../e2e/fixtures/panel_pops.csv", import.meta.url),
    "utf8",
  );
  const [header, ...lines] = text.trim().split("\n");
  if (header === undefined) {
    throw new Error("panel_pops.csv has no header");
  }
  return {
    columns: header.split(","),
    rows: lines.map((line) => line.split(",")),
  };
}

const PANEL_POPS = panelPops();

/** The individuals of `panel.nei`, those of `panel_pops.csv` in its
    order. */
const PANEL_INDIVIDUALS: readonly string[] = PANEL_POPS.rows.map((row) =>
  String(row[0]),
);

/** The individuals of p0 in `panel_pops.csv`. */
const P0: readonly string[] = PANEL_POPS.rows
  .filter((row) => row[1] === "p0")
  .map((row) => String(row[0]));

/** A read of the table `table`, of a CSV. */
function readOf(table: IndividualsTable): TableRead {
  return {
    kind: "read",
    table,
    columns: table.columns.map((_, index) =>
      index === 0 ? { kind: "identifier" } : { kind: "categorical" },
    ),
    found: {
      encoding: "utf-8",
      separator: ",",
      decimal: ".",
      undecodedLine: null,
    },
  };
}

/** `panel_pops.csv` with its column `popcat` given the cells `cellOf`
    gives each row, by its index. */
function panelPopsWith(cellOf: (index: number) => Cell): IndividualsTable {
  return {
    columns: PANEL_POPS.columns,
    rows: PANEL_POPS.rows.map((row, index) => [row[0] ?? "", cellOf(index)]),
  };
}

/** The variants file of the project: none, `panel.nei` being opened,
    failed, or read. */
type VariantsState = "none" | "pending" | "failed" | "read";

/** The load id of the variants file, and of the individuals file. */
const VARIANTS_ID = "00112233445566778899aabbccddeeff";
const INDIVIDUALS_ID = "ffeeddccbbaa99887766554433221100";

/** How the individuals file is read: every option found by the
    reader. */
const CSV: CsvOptions = {
  encoding: "auto",
  separator: "auto",
  decimal: "auto",
};

/**
 * A frozen project of popgen2.html, made with the commands of
 * docs/specs/core/project.md as the page makes it: `panel.nei` loaded
 * and in the state `variants`, named `variantsName`; the individuals file
 * `panel_pops.csv` loaded with the read `read`, left pending with
 * `{ kind: "pending" }`, or none with `null`, and then the grouping
 * `grouping`, the column `popcat` when absent; the filters of individuals
 * `individualFilters`. With no individuals file the grouping is the
 * empty project's, no column, as the page leaves it.
 */
function project(
  options: {
    readonly variants?: VariantsState;
    readonly variantsName?: string;
    readonly read?: IndividualsReadGiven | { readonly kind: "pending" } | null;
    readonly grouping?: Grouping;
    readonly individualFilters?: readonly IndividualFilter[];
  } = {},
): Project {
  const variants = options.variants ?? "read";
  const read = options.read === undefined ? readOf(PANEL_POPS) : options.read;
  let p = emptyProject("popgen");
  if (variants !== "none") {
    p = loadVariants(p, {
      fileId: VARIANTS_ID,
      name: options.variantsName ?? "panel.nei",
      size: 261_490,
      format: "nei",
      readOptions: null,
    });
  }
  if (variants === "failed") {
    p = recordVariantsRead(p, VARIANTS_ID, {
      kind: "failed",
      error: { kind: "popnei", message: "not a file" },
    });
  }
  if (variants === "read") {
    p = recordVariantsRead(p, VARIANTS_ID, {
      kind: "read",
      individuals: PANEL_INDIVIDUALS,
      ploidy: 2,
      numVars: null,
      keepsPassed: false,
    });
  }
  if (read !== null) {
    p = loadIndividuals(p, {
      fileId: INDIVIDUALS_ID,
      name: "panel_pops.csv",
      csv: CSV,
    });
    if (read.kind !== "pending") {
      p = recordIndividualsRead(p, INDIVIDUALS_ID, CSV, read);
    }
    p = setGrouping(
      p,
      options.grouping ?? { kind: "populations", column: "popcat" },
    );
  }
  for (const filter of options.individualFilters ?? []) {
    p = setIndividualFilter(p, filter);
  }
  return deepFreeze(p);
}

/** `p`, its variants file read, with its individuals file's read made
    `notGiven`, as only the opening of a project file makes it: `p`
    written as a project file holds it, with no `keepsPassed`, which no
    project file holds, and read back by `parseProject`. */
function withIndividualsNotGiven(p: Project): Project {
  const { variants, individuals } = p;
  if (variants?.read.kind !== "read" || individuals === null) {
    throw new Error(
      "the project has no variants file read or no individuals file",
    );
  }
  const { kind, individuals: names, ploidy, numVars } = variants.read;
  const read = { kind, individuals: names, ploidy, numVars };
  const written: unknown = JSON.parse(
    JSON.stringify({
      ...p,
      variants: { ...variants, read },
      individuals: { ...individuals, read: { kind: "notGiven" } },
    }),
  );
  const parsed = parseProject(written, "popgen", FORMAT_VERSION, []);
  if (!parsed.ok) {
    throw new Error(
      `the project file was refused: ${JSON.stringify(parsed.error)}`,
    );
  }
  return deepFreeze(parsed.value);
}

/** The individuals kept of `p`, whose filters need no statistics. */
function keptOf(p: Project): IndividualsKept {
  const kept = individualsKept(p, null);
  if (kept === null) {
    throw new Error("the project gives no individuals kept");
  }
  return kept;
}

describe("AP1 D1 which tab of the analyses is greyed, and why", () => {
  test("with no variants file the three tabs are greyed with noVariants", () => {
    expect(
      analysisTabs(project({ variants: "none", read: null }), null),
    ).toEqual({
      pca: { kind: "noVariants" },
      populations: { kind: "noVariants" },
      distances: { kind: "noVariants" },
    });
  });

  test("with panel.nei being opened the three tabs are greyed with variantsOpening and its name", () => {
    const opening = { kind: "variantsOpening", name: "panel.nei" };
    expect(analysisTabs(project({ variants: "pending" }), null)).toEqual({
      pca: opening,
      populations: opening,
      distances: opening,
    });
  });

  test("with the opening of panel.nei failed the three tabs are greyed with variantsFailed", () => {
    const failed = { kind: "variantsFailed", name: "panel.nei" };
    expect(analysisTabs(project({ variants: "failed" }), null)).toEqual({
      pca: failed,
      populations: failed,
      distances: failed,
    });
  });

  test("another variants file opened over panel.nei being opened greys the three tabs with the new name", () => {
    const first = analysisTabs(project({ variants: "pending" }), null);
    expect(first.pca).toEqual({ kind: "variantsOpening", name: "panel.nei" });
    const other = deepFreeze(
      loadVariants(project({ variants: "pending" }), {
        fileId: "aabbccddeeff00112233445566778899",
        name: "other.vcf.gz",
        size: 1_000,
        format: "vcf",
        readOptions: { ploidy: 2, onlyPassed: false },
      }),
    );
    const opening = { kind: "variantsOpening", name: "other.vcf.gz" };
    expect(analysisTabs(other, null)).toEqual({
      pca: opening,
      populations: opening,
      distances: opening,
    });
  });

  test("panel.nei read with no individuals file: PCA and Populations open, Distances noIndividuals", () => {
    const p = project({ read: null });
    expect(analysisTabs(p, keptOf(p))).toEqual({
      pca: null,
      populations: null,
      distances: { kind: "noIndividuals" },
    });
  });

  test("panel_pops.csv being read greys Distances with individualsReading and its name", () => {
    const p = project({ read: { kind: "pending" } });
    expect(analysisTabs(p, keptOf(p)).distances).toEqual({
      kind: "individualsReading",
      name: "panel_pops.csv",
    });
  });

  test("panel_pops.csv refused greys Distances with individualsFailed and its name", () => {
    const p = project({
      read: { kind: "failed", error: { kind: "empty" }, format: "text" },
    });
    expect(analysisTabs(p, keptOf(p))).toEqual({
      pca: null,
      populations: null,
      distances: { kind: "individualsFailed", name: "panel_pops.csv" },
    });
  });

  test("panel_pops.csv named by a project file that did not hold it, notGiven, greys Distances with individualsFailed and its name", () => {
    const p = withIndividualsNotGiven(project());
    expect(p.individuals?.read).toEqual({ kind: "notGiven" });
    expect(analysisTabs(p, keptOf(p))).toEqual({
      pca: null,
      populations: null,
      distances: { kind: "individualsFailed", name: "panel_pops.csv" },
    });
  });

  test("popcat chosen, the individuals kept not known: no tab greyed", () => {
    expect(analysisTabs(project(), null)).toEqual({
      pca: null,
      populations: null,
      distances: null,
    });
  });

  test("popcat chosen, everyone kept: no tab greyed", () => {
    const p = project();
    expect(analysisTabs(p, keptOf(p))).toEqual({
      pca: null,
      populations: null,
      distances: null,
    });
  });

  test("no column chosen greys Distances with noColumn", () => {
    const p = project({ grouping: { kind: "populations", column: null } });
    expect(analysisTabs(p, keptOf(p)).distances).toEqual({ kind: "noColumn" });
  });

  test("a column the list does not offer gives noColumn", () => {
    const p = project({
      grouping: { kind: "populations", column: "IID" },
    });
    expect(analysisTabs(p, keptOf(p)).distances).toEqual({ kind: "noColumn" });
  });

  test("a column of one value for every individual gives fewPopulations with 1 and panel.nei", () => {
    const p = project({ read: readOf(panelPopsWith(() => "all")) });
    expect(analysisTabs(p, keptOf(p)).distances).toEqual({
      kind: "fewPopulations",
      column: "popcat",
      numPopulations: 1,
      variantsName: "panel.nei",
      individualsName: "panel_pops.csv",
      noneInFile: false,
    });
  });

  test("a column of more than 20 values gives tooManyValues with the column and its number of values", () => {
    const p = project({
      read: readOf(panelPopsWith((index) => `c${String(index % 35)}`)),
    });
    expect(analysisTabs(p, keptOf(p)).distances).toEqual({
      kind: "tooManyValues",
      column: "popcat",
      numValues: 35,
    });
  });

  test("an individuals file none of whose names is in panel.nei gives fewPopulations with 0 and noneInFile", () => {
    const table: IndividualsTable = {
      columns: PANEL_POPS.columns,
      rows: PANEL_POPS.rows.map((row) => [`x${String(row[0])}`, row[1] ?? ""]),
    };
    const p = project({ read: readOf(table) });
    expect(analysisTabs(p, keptOf(p)).distances).toEqual({
      kind: "fewPopulations",
      column: "popcat",
      numPopulations: 0,
      variantsName: "panel.nei",
      individualsName: "panel_pops.csv",
      noneInFile: true,
    });
  });

  test("names that match with every cell of the column empty give fewPopulations with 0 and not noneInFile", () => {
    const p = project({ read: readOf(panelPopsWith(() => null)) });
    expect(analysisTabs(p, keptOf(p)).distances).toEqual({
      kind: "fewPopulations",
      column: "popcat",
      numPopulations: 0,
      variantsName: "panel.nei",
      individualsName: "panel_pops.csv",
      noneInFile: false,
    });
  });

  test("a list kept of the individuals of p0 alone gives fewKept with 1", () => {
    const p = project({
      individualFilters: [{ kind: "keep", individuals: P0 }],
    });
    expect(analysisTabs(p, keptOf(p))).toEqual({
      pca: null,
      populations: null,
      distances: { kind: "fewKept", numPopulations: 1 },
    });
  });

  test("a threshold that keeps no individual gives fewKept with 0, and leaves the PCA and Populations open", () => {
    const p = project({
      individualFilters: [{ kind: "missing_data", maxAllowedMissingRate: 0.5 }],
    });
    const stats = {
      individuals: PANEL_INDIVIDUALS,
      missingGtRate: new Float64Array(PANEL_INDIVIDUALS.length).fill(0.9),
      obsHetRate: new Float64Array(PANEL_INDIVIDUALS.length).fill(0.1),
    };
    const kept = individualsKept(p, stats);
    expect(kept?.list).toEqual({ kind: "known", individuals: [] });
    expect(analysisTabs(p, kept)).toEqual({
      pca: null,
      populations: null,
      distances: { kind: "fewKept", numPopulations: 0 },
    });
  });

  test("a threshold whose list is not known yet follows the populations before the thresholds", () => {
    const p = project({
      individualFilters: [{ kind: "missing_data", maxAllowedMissingRate: 0.5 }],
    });
    expect(analysisTabs(p, keptOf(p)).distances).toBeNull();
  });

  test("two columns of too many values in a row give the second column and its count", () => {
    const table: IndividualsTable = {
      columns: [...PANEL_POPS.columns, "region"],
      rows: PANEL_POPS.rows.map((row, index) => [
        row[0] ?? "",
        `c${String(index % 35)}`,
        `r${String(index % 25)}`,
      ]),
    };
    expect(
      analysisTabs(project({ read: readOf(table) }), null).distances,
    ).toEqual({ kind: "tooManyValues", column: "popcat", numValues: 35 });
    expect(
      analysisTabs(
        project({
          read: readOf(table),
          grouping: { kind: "populations", column: "region" },
        }),
        null,
      ).distances,
    ).toEqual({ kind: "tooManyValues", column: "region", numValues: 25 });
  });

  test("the same inputs twice give the same object", () => {
    const p = project({ read: null });
    const kept = keptOf(p);
    const first = analysisTabs(p, kept);
    expect(analysisTabs(p, kept)).toBe(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.distances)).toBe(true);
  });

  test("a list kept that changes but leaves the same reasons gives the same object", () => {
    const everyone = project();
    const first = analysisTabs(everyone, keptOf(everyone));
    const fewer = project({
      individualFilters: [
        { kind: "remove", individuals: PANEL_INDIVIDUALS.slice(0, 10) },
      ],
    });
    expect(analysisTabs(fewer, keptOf(fewer))).toBe(first);
    const greyed = project({ read: null });
    const second = analysisTabs(greyed, keptOf(greyed));
    expect(second).not.toBe(first);
    const again = project({
      read: null,
      individualFilters: [
        { kind: "remove", individuals: PANEL_INDIVIDUALS.slice(0, 10) },
      ],
    });
    expect(analysisTabs(again, keptOf(again))).toBe(second);
  });
});
