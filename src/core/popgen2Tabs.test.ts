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
import type { Project, IndividualsRead, TableRead } from "./project.ts";
import { deepFreeze } from "./testSupport.ts";
import type { Cell, IndividualsTable } from "../worker/protocol.ts";

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

/** A frozen project of popgen2.html: `panel.nei` in the state `variants`,
    named `variantsName`, and the individuals file `panel_pops.csv` with
    the read `read`, or none with `null`, its column `popcat` chosen or
    the grouping `grouping`, with the filters of individuals
    `individualFilters`. */
function project(
  options: {
    readonly variants?: VariantsState;
    readonly variantsName?: string;
    readonly read?: IndividualsRead | null;
    readonly grouping?: Project["grouping"];
    readonly individualFilters?: Project["individualFilters"];
  } = {},
): Project {
  const variants = options.variants ?? "read";
  const read = options.read === undefined ? readOf(PANEL_POPS) : options.read;
  return deepFreeze<Project>({
    app: "popgen",
    variants:
      variants === "none"
        ? null
        : {
            fileId: "00112233445566778899aabbccddeeff",
            name: options.variantsName ?? "panel.nei",
            size: 261_490,
            format: "nei",
            readOptions: null,
            read:
              variants === "pending"
                ? { kind: "pending" }
                : variants === "failed"
                  ? {
                      kind: "failed",
                      error: { kind: "popnei", message: "not a file" },
                    }
                  : {
                      kind: "read",
                      individuals: PANEL_INDIVIDUALS,
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

  test("another variants file opened over panel.nei greys the three tabs with the new name", () => {
    const p = project();
    expect(analysisTabs(p, keptOf(p)).pca).toBeNull();
    const opening = { kind: "variantsOpening", name: "other.vcf.gz" };
    expect(
      analysisTabs(
        project({ variants: "pending", variantsName: "other.vcf.gz" }),
        null,
      ),
    ).toEqual({ pca: opening, populations: opening, distances: opening });
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
