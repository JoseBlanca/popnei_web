/**
 * The words, the cells and the order of the block "Statistics of each
 * individual" (docs/specs/analyses/individualChecks.md, "The panel"): the
 * caption, the words of the statistics removed, the column Kept and its
 * words, the order of each column sorted with no value after every number
 * in both directions, the names of the CSV files, and the line of the
 * individuals with no heterozygosity. The order of panel.nei at 0.05 is
 * read from the fixture e2e/fixtures/make_fixtures.mjs wrote with popnei.
 */
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import type { IndividualRow } from "../../../core/analyses/individualChecks.ts";
import type { IndividualsKept } from "../../../core/individualsKept.ts";
import type { Notice } from "../../../core/store.ts";
import {
  individualBinsCsvName,
  individualCells,
  individualThreshold,
  keptColumn,
  noHeterozygosityText,
  sortedRows,
  statsCaption,
  statsCsvName,
  statsRemovedText,
  tableRowsText,
} from "./individualStats.ts";

/** A row of the table. */
function row(
  individual: string,
  missingGenotypes: number,
  observedHeterozygosity: number | null,
): IndividualRow {
  return { individual, missingGenotypes, observedHeterozygosity };
}

/** Four rows, one with no heterozygosity and two equal in each number. */
const ROWS: readonly IndividualRow[] = Object.freeze([
  row("b", 0.2, 0.3),
  row("a", 0.1, null),
  row("d", 0.2, 0.1),
  row("c", 0.05, 0.3),
]);

const names = (rows: readonly IndividualRow[]): string[] =>
  rows.map((r) => r.individual);

/** A notice of a change, of the kind `kind`. */
function notice(kind: Notice["cause"]["kind"]): Notice {
  return {
    cause: { kind, description: "the MAF filter changed" },
    removed: ["individualChecks"],
    leftBehind: [],
    stopped: [],
    writeLeftBehind: false,
    writeStopped: false,
    writeDiscarded: false,
  };
}

/** The individuals kept, the list `individuals`. */
function kept(individuals: readonly string[] | null): IndividualsKept {
  return {
    list: { kind: "known", individuals },
    byLists: [],
    counts: [],
  };
}

/** The rows of panel.nei with the missing data filter at 0.05. */
function panelRows(): readonly IndividualRow[] {
  const parsed: unknown = JSON.parse(
    readFileSync(
      new URL(
        "../../../../e2e/fixtures/panel_individual_stats.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("maxAllowedMissingRate" in parsed) ||
    parsed.maxAllowedMissingRate !== 0.05 ||
    !("individuals" in parsed) ||
    !Array.isArray(parsed.individuals) ||
    !("missingGtRate" in parsed) ||
    !Array.isArray(parsed.missingGtRate) ||
    !("obsHetRate" in parsed) ||
    !Array.isArray(parsed.obsHetRate)
  ) {
    throw new Error("panel_individual_stats.json is not of the filter at 0.05");
  }
  const { individuals, missingGtRate, obsHetRate } = parsed;
  return individuals.map((name: unknown, i) => {
    const missing: unknown = missingGtRate[i];
    const obsHet: unknown = obsHetRate[i];
    if (typeof name !== "string" || typeof missing !== "number") {
      throw new Error("panel_individual_stats.json has a row of no number");
    }
    return row(name, missing, typeof obsHet === "number" ? obsHet : null);
  });
}

describe("VS7 D1 the words of the statistics of each individual", () => {
  test("the caption of panel.nei at 0.05, and of one individual and one variant", () => {
    expect(statsCaption(200, "panel.nei", 1152)).toBe(
      "The statistics of the 200 individuals of panel.nei, over the 1,152 variants the filters kept.",
    );
    expect(statsCaption(1, "one.vcf", 1)).toBe(
      "The statistics of the one individual of one.vcf, over the one variant the filters kept.",
    );
  });

  test("the statistics removed by a command, an undo and a redo", () => {
    expect(statsRemovedText(notice("command"))).toBe(
      "The statistics of each individual were removed because the MAF filter changed. Undo brings back the table as it was, with no calculation; Calculate makes a new one for the new settings.",
    );
    expect(statsRemovedText(notice("undo"))).toBe(
      "Undone: the MAF filter changed. The statistics of each individual were removed; Redo brings back the table as it was, with no calculation, and Calculate makes a new one for the settings as they are now.",
    );
    expect(statsRemovedText(notice("redo"))).toBe(
      "Redone: the MAF filter changed. The statistics of each individual were removed; Undo brings back the table as it was, with no calculation, and Calculate makes a new one for the settings as they are now.",
    );
  });

  test("the names of the three CSV files, from the stem of the variants file", () => {
    expect(statsCsvName("panel.nei")).toBe("panel.individual_stats.csv");
    expect(statsCsvName("panel.vcf.gz")).toBe("panel.individual_stats.csv");
    expect(individualBinsCsvName("panel.nei", "missingGenotypes")).toBe(
      "panel.individual_missing_rate_bins.csv",
    );
    expect(individualBinsCsvName("panel.nei", "observedHeterozygosity")).toBe(
      "panel.individual_obs_het_bins.csv",
    );
  });

  test("the line of the individuals with no heterozygosity: none, one, several", () => {
    expect(noHeterozygosityText(0)).toBeNull();
    expect(noHeterozygosityText(1)).toBe(
      "1 individual with no called genotype is not in the histogram.",
    );
    expect(noHeterozygosityText(3)).toBe(
      "3 individuals with no called genotype are not in the histogram.",
    );
  });

  test("the cells: four decimals, no value, and kept or removed only with the column", () => {
    expect(
      individualCells(row("s000", 0.026041666666666668, null), null),
    ).toEqual(["s000", "0.0260", "no value"]);
    expect(
      individualCells(row("s000", 0.02, 0.3672014260249554), true),
    ).toEqual(["s000", "0.0200", "0.3672", "kept"]);
    expect(individualCells(row("s000", 0.02, 0.36), false)).toEqual([
      "s000",
      "0.0200",
      "0.3600",
      "removed",
    ]);
  });
});

describe("VS7 D1 the threshold marked on each histogram", () => {
  test("the threshold of the filter on its statistic, whatever the other filters, and none while it is off", () => {
    const filters = [
      { kind: "keep", individuals: ["s000"] },
      { kind: "missing_data", maxAllowedMissingRate: 0.03 },
      { kind: "obs_het", maxAllowedObsHet: 0.38 },
    ] as const;
    expect(individualThreshold(filters, "missingGenotypes")).toBe(0.03);
    expect(individualThreshold(filters, "observedHeterozygosity")).toBe(0.38);
    expect(
      individualThreshold(filters.slice(0, 2), "observedHeterozygosity"),
    ).toBeNull();
    expect(individualThreshold([], "missingGenotypes")).toBeNull();
  });
});

describe("VS7 D1 the column Kept of the table", () => {
  test("left out while no filter of individuals is set", () => {
    expect(keptColumn(0, kept(null)).kind).toBe("none");
  });

  test("not known while the store gives no individuals kept", () => {
    expect(keptColumn(1, null).kind).toBe("notKnown");
  });

  test("every individual kept when the filters remove none, and only those of the list otherwise", () => {
    const all = keptColumn(1, kept(null));
    if (all.kind !== "shown") throw new Error("no column Kept");
    expect(all.isKept("s000")).toBe(true);
    const some = keptColumn(2, kept(["s001"]));
    if (some.kind !== "shown") throw new Error("no column Kept");
    expect(some.isKept("s001")).toBe(true);
    expect(some.isKept("s000")).toBe(false);
  });

  test("a list that waits for the statistics shown is a defect", () => {
    expect(() =>
      keptColumn(1, {
        list: { kind: "needsStatistics" },
        byLists: [],
        counts: [],
      }),
    ).toThrow(/^popnei_web defect: /);
  });
});

describe("VS7 D1 the order of the table", () => {
  test("no sort gives the rows of the file themselves", () => {
    expect(sortedRows(ROWS, null, null)).toBe(ROWS);
  });

  test("by the proportion of missing genotypes, equal rows in the order of the file in both directions", () => {
    expect(
      names(
        sortedRows(
          ROWS,
          { column: "missingGenotypes", direction: "ascending" },
          null,
        ),
      ),
    ).toEqual(["c", "a", "b", "d"]);
    expect(
      names(
        sortedRows(
          ROWS,
          { column: "missingGenotypes", direction: "descending" },
          null,
        ),
      ),
    ).toEqual(["b", "d", "a", "c"]);
  });

  test("by the heterozygosity, no value last in both directions", () => {
    expect(
      names(
        sortedRows(
          ROWS,
          { column: "observedHeterozygosity", direction: "ascending" },
          null,
        ),
      ),
    ).toEqual(["d", "b", "c", "a"]);
    expect(
      names(
        sortedRows(
          ROWS,
          { column: "observedHeterozygosity", direction: "descending" },
          null,
        ),
      ),
    ).toEqual(["b", "c", "d", "a"]);
  });

  test("by the individual, as text in English", () => {
    expect(
      names(
        sortedRows(
          ROWS,
          { column: "individual", direction: "ascending" },
          null,
        ),
      ),
    ).toEqual(["a", "b", "c", "d"]);
    expect(
      names(
        sortedRows(
          ROWS,
          { column: "individual", direction: "descending" },
          null,
        ),
      ),
    ).toEqual(["d", "c", "b", "a"]);
  });

  test("by Kept, kept first going up and removed first going down, each in the order of the file", () => {
    const isKept = (name: string): boolean => name === "d" || name === "a";
    expect(
      names(
        sortedRows(ROWS, { column: "kept", direction: "ascending" }, isKept),
      ),
    ).toEqual(["a", "d", "b", "c"]);
    expect(
      names(
        sortedRows(ROWS, { column: "kept", direction: "descending" }, isKept),
      ),
    ).toEqual(["b", "c", "a", "d"]);
    expect(() =>
      sortedRows(ROWS, { column: "kept", direction: "ascending" }, null),
    ).toThrow(/^popnei_web defect: /);
  });

  test("the rows given are left as they were", () => {
    const rows = Object.freeze([...ROWS]);
    sortedRows(
      rows,
      { column: "missingGenotypes", direction: "ascending" },
      null,
    );
    expect(names(rows)).toEqual(["b", "a", "d", "c"]);
  });

  test("panel.nei at 0.05 sorted down by the proportion of missing genotypes puts s082 first, 0.0434", () => {
    const [first] = sortedRows(
      panelRows(),
      { column: "missingGenotypes", direction: "descending" },
      null,
    );
    expect(first?.individual).toBe("s082");
    expect(first === undefined ? null : individualCells(first, null)[1]).toBe(
      "0.0434",
    );
  });
});

describe("the line before the table", () => {
  test("the count of the individuals, and that the table scrolls and its CSV holds them all", () => {
    expect(tableRowsText(200)).toBe(
      "200 individuals; the table scrolls, and its CSV holds them all.",
    );
    expect(tableRowsText(10000)).toBe(
      "10,000 individuals; the table scrolls, and its CSV holds them all.",
    );
  });
});
