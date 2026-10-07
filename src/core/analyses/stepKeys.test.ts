/**
 * The tests of the keys of the three analyses of the Variants step, from
 * the table "What goes into its key" of
 * docs/specs/analyses/individualChecks.md and the "How it is verified" of
 * variantChecks.md and filterCounts.md, as they read the filters from 28
 * September 2026, the filters of individuals first: for each row, two
 * projects that differ in it, and `keyOf` equal or not as the row says.
 * The statistics of each individual read no filter; the histograms of the
 * variants read the filters of individuals alone, and a key that missed
 * one would show the histograms of other individuals as current; the
 * counts read both, since the filters of the variants count over the
 * individuals kept. Each
 * `keyInputs` is also given the empty project and a project whose reads
 * are pending, as docs/specs/core/keys.md asks of every analysis.
 */

import { describe, expect, test } from "vitest";
import { filterCounts } from "./filterCounts.ts";
import { individualChecks } from "./individualChecks.ts";
import { variantChecks } from "./variantChecks.ts";
import { createKeyMemo, keyOf } from "../keys.ts";
import type { Key, KeyedDef } from "../keys.ts";
import { emptyProject } from "../project.ts";
import type { Project, VariantSource } from "../project.ts";
import { deepFreeze } from "../testSupport.ts";
import type {
  IndividualFilter,
  IndividualsTable,
  VariantFilter,
} from "../../worker/protocol.ts";

const VARIANTS_ID = "00112233445566778899aabbccddeeff";
const OTHER_VARIANTS_ID = "0123456789abcdef0123456789abcdef";
const INDIVIDUALS_ID = "ffeeddccbbaa99887766554433221100";

const TABLE: IndividualsTable = {
  columns: ["name", "pop", "other"],
  rows: [
    ["i1", "A", "x"],
    ["i2", "B", "y"],
    ["i3", "A", "x"],
  ],
};

/** A project of population genetics, frozen deeply: a `.nei` file read
    with i1 to i3, the missing data filter of the variants at 0.1, no
    filter of individuals, and a CSV of `table` whose populations are in
    `column`. */
function project(
  options: {
    readonly table?: IndividualsTable;
    readonly column?: string | null;
  } = {},
): Project {
  const table = options.table ?? TABLE;
  return deepFreeze<Project>({
    app: "popgen",
    variants: {
      fileId: VARIANTS_ID,
      name: "panel.nei",
      size: 261_490,
      format: "nei",
      readOptions: null,
      read: {
        kind: "read",
        individuals: ["i1", "i2", "i3"],
        ploidy: 2,
        numVars: null,
      },
    },
    filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.1 }],
    filtersOff: [],
    individualFilters: [],
    individualFiltersOff: [],
    individuals: {
      fileId: INDIVIDUALS_ID,
      name: "pops.csv",
      csv: { encoding: "auto", separator: "auto", decimal: "auto" },
      typesSet: [],
      read: {
        kind: "read",
        table,
        columns: table.columns.map((_, i) =>
          i === 0 ? { kind: "identifier" } : { kind: "categorical" },
        ),
        found: {
          encoding: "utf-8",
          separator: ",",
          decimal: ".",
          undecodedLine: null,
        },
      },
    },
    grouping: {
      kind: "populations",
      column: options.column === undefined ? "pop" : options.column,
    },
    analyses: [],
    reference: null,
  });
}

/** The key of `def` for `p`, with popnei 0.1.0 unless another version is
    given. */
function keyFor(def: KeyedDef, p: Project, popneiVersion = "0.1.0"): Key {
  return keyOf(def, p, popneiVersion, createKeyMemo());
}

/** The variants file of `p`, which the projects of these tests have. */
function variantsOf(p: Project): VariantSource {
  if (p.variants === null) {
    throw new Error("the project of the test has a variants file");
  }
  return p.variants;
}

/** `p` with its variants file changed by `change`. */
function withVariants(p: Project, change: Partial<VariantSource>): Project {
  return deepFreeze<Project>({
    ...p,
    variants: { ...variantsOf(p), ...change },
  });
}

/** `p` with the filters of the variants `filters`. */
function withFilters(p: Project, filters: readonly VariantFilter[]): Project {
  return deepFreeze<Project>({ ...p, filters });
}

/** `p` with the filters of individuals `individualFilters`. */
function withIndividualFilters(
  p: Project,
  individualFilters: readonly IndividualFilter[],
): Project {
  return deepFreeze<Project>({ ...p, individualFilters });
}

/** `p` loaded again, the same file with a new load id. */
function reloaded(p: Project): Project {
  return withVariants(p, { fileId: OTHER_VARIANTS_ID });
}

/** `p` with its variants file a VCF read with `ploidy` and `onlyPassed`. */
function asVcf(p: Project, ploidy: number, onlyPassed: boolean): Project {
  return withVariants(p, {
    name: "panel.vcf.gz",
    format: "vcf",
    readOptions: { ploidy, onlyPassed },
  });
}

/** Projects that differ from `project()` in a filter of the variants:
    its threshold, another added, and none. */
function variantFilterChanges(): readonly Project[] {
  const base = project();
  const two = withFilters(base, [
    { kind: "missing_data", maxAllowedMissingRate: 0.1 },
    { kind: "maf", maxAllowedMaf: 0.95 },
  ]);
  return [
    withFilters(base, [{ kind: "missing_data", maxAllowedMissingRate: 0.05 }]),
    two,
    withFilters(two, [{ kind: "maf", maxAllowedMaf: 0.95 }]),
    withFilters(base, []),
  ];
}

/** Projects that differ from `project()` in a filter of individuals: a
    list kept, a list removed, a threshold of each kind, and a threshold
    moved. */
function individualFilterChanges(): readonly Project[] {
  const base = project();
  return [
    withIndividualFilters(base, [{ kind: "keep", individuals: ["i1", "i2"] }]),
    withIndividualFilters(base, [{ kind: "remove", individuals: ["i3"] }]),
    withIndividualFilters(base, [
      { kind: "missing_data", maxAllowedMissingRate: 0.03 },
    ]),
    withIndividualFilters(base, [
      { kind: "missing_data", maxAllowedMissingRate: 0.2 },
    ]),
    withIndividualFilters(base, [{ kind: "obs_het", maxAllowedObsHet: 0.5 }]),
  ];
}

/** Projects that differ from `project()` in the individuals file or the
    column of the populations: another column, every individual in one
    population, a cell of the populations changed, and no file. */
function individualsFileChanges(): readonly Project[] {
  const changedCell: IndividualsTable = {
    columns: TABLE.columns,
    rows: TABLE.rows.map((cells, r) =>
      cells.map((cell, c) => (r === 1 && c === 1 ? "A" : cell)),
    ),
  };
  return [
    project({ column: "other" }),
    project({ column: null }),
    project({ table: changedCell }),
    deepFreeze<Project>({
      ...project({ column: null }),
      individuals: null,
    }),
  ];
}

/** A copy of `p` whose `variants` is a getter that throws, so that a test
    sees any read of it. */
function withVariantsUnreadable(p: Project): Project {
  const copy: Project = { ...p };
  Object.defineProperty(copy, "variants", {
    get(): never {
      throw new Error("keyInputs read p.variants");
    },
  });
  return copy;
}

/** `project()` with both its reads pending, and its variants unreadable. */
function pendingUnreadable(): Project {
  const base = project();
  const individuals = base.individuals;
  if (individuals === null) {
    throw new Error("the project of the test has an individuals file");
  }
  return withVariantsUnreadable(
    deepFreeze<Project>({
      ...withVariants(base, { read: { kind: "pending" } }),
      individuals: { ...individuals, read: { kind: "pending" } },
    }),
  );
}

describe("IP2 D2 the key of the statistics of each individual", () => {
  const base = project();
  const baseKey = keyFor(individualChecks, base);

  test("a new load of the variants file, the same file included, or the ploidy or onlyPassed of a VCF, changes the key", () => {
    const vcf = asVcf(base, 2, false);
    expect(keyFor(individualChecks, reloaded(base))).not.toBe(baseKey);
    expect(keyFor(individualChecks, asVcf(base, 4, false))).not.toBe(
      keyFor(individualChecks, vcf),
    );
    expect(keyFor(individualChecks, asVcf(base, 2, true))).not.toBe(
      keyFor(individualChecks, vcf),
    );
  });

  test("a filter of the variants added or removed, or its threshold, leaves the key the same", () => {
    for (const p of variantFilterChanges()) {
      expect(keyFor(individualChecks, p)).toBe(baseKey);
    }
  });

  test("a filter of individuals, a list or a threshold, leaves the key the same", () => {
    for (const p of individualFilterChanges()) {
      expect(keyFor(individualChecks, p)).toBe(baseKey);
    }
  });

  test("the individuals file, or the column of the populations, leaves the key the same", () => {
    for (const p of individualsFileChanges()) {
      expect(keyFor(individualChecks, p)).toBe(baseKey);
    }
  });

  test("the key version, 2, or the version of popnei, changes the key", () => {
    expect(individualChecks.keyVersion).toBe(2);
    const earlier: KeyedDef = { ...individualChecks, keyVersion: 1 };
    expect(keyFor(earlier, base)).not.toBe(baseKey);
    expect(keyFor(individualChecks, base, "0.2.0")).not.toBe(baseKey);
  });

  test("keyInputs gives null for the empty project and for pending reads, without reading p.variants", () => {
    expect(
      individualChecks.keyInputs(
        withVariantsUnreadable(emptyProject("popgen")),
      ),
    ).toBeNull();
    expect(individualChecks.keyInputs(pendingUnreadable())).toBeNull();
  });
});

describe("IP2 D2 the key of the histograms of the variants", () => {
  const base = project();
  const baseKey = keyFor(variantChecks, base);

  test("a filter of the variants added or removed, or its threshold, leaves the key the same", () => {
    for (const p of variantFilterChanges()) {
      expect(keyFor(variantChecks, p)).toBe(baseKey);
    }
  });

  test("a filter of individuals, a list or a threshold, changes the key", () => {
    const keys = [
      baseKey,
      ...individualFilterChanges().map((p) => keyFor(variantChecks, p)),
    ];
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("the individuals file, or the column of the populations, leaves the key the same", () => {
    for (const p of individualsFileChanges()) {
      expect(keyFor(variantChecks, p)).toBe(baseKey);
    }
  });

  test("a new load, the read options of a VCF, the key version, 4, and the version of popnei change the key", () => {
    const vcf = asVcf(base, 2, false);
    expect(keyFor(variantChecks, reloaded(base))).not.toBe(baseKey);
    expect(keyFor(variantChecks, asVcf(base, 4, false))).not.toBe(
      keyFor(variantChecks, vcf),
    );
    expect(keyFor(variantChecks, asVcf(base, 2, true))).not.toBe(
      keyFor(variantChecks, vcf),
    );
    expect(variantChecks.keyVersion).toBe(4);
    const earlier: KeyedDef = { ...variantChecks, keyVersion: 3 };
    expect(keyFor(earlier, base)).not.toBe(baseKey);
    expect(keyFor(variantChecks, base, "0.2.0")).not.toBe(baseKey);
  });

  test("keyInputs gives null for the empty project and for pending reads, without reading p.variants", () => {
    expect(
      variantChecks.keyInputs(withVariantsUnreadable(emptyProject("popgen"))),
    ).toBeNull();
    expect(variantChecks.keyInputs(pendingUnreadable())).toBeNull();
  });
});

describe("IP2 D2 the key of the counts of the filters", () => {
  const base = project();
  const baseKey = keyFor(filterCounts, base);

  test("any filter of the variants changes the key", () => {
    const keys = [
      baseKey,
      ...variantFilterChanges().map((p) => keyFor(filterCounts, p)),
    ];
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("any filter of individuals, a list or a threshold, changes the key", () => {
    const keys = [
      baseKey,
      ...individualFilterChanges().map((p) => keyFor(filterCounts, p)),
    ];
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("the individuals file, or the column of the populations, leaves the key the same", () => {
    for (const p of individualsFileChanges()) {
      expect(keyFor(filterCounts, p)).toBe(baseKey);
    }
  });

  test("a new load, the key version, 2, or the version of popnei changes the key", () => {
    expect(keyFor(filterCounts, reloaded(base))).not.toBe(baseKey);
    expect(filterCounts.keyVersion).toBe(2);
    const earlier: KeyedDef = { ...filterCounts, keyVersion: 1 };
    expect(keyFor(earlier, base)).not.toBe(baseKey);
    expect(keyFor(filterCounts, base, "0.2.0")).not.toBe(baseKey);
  });

  test("keyInputs gives null for the empty project and for pending reads, without reading p.variants", () => {
    expect(
      filterCounts.keyInputs(withVariantsUnreadable(emptyProject("popgen"))),
    ).toBeNull();
    expect(filterCounts.keyInputs(pendingUnreadable())).toBeNull();
  });
});
