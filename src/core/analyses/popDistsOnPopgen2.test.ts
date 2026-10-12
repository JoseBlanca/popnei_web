/**
 * The tests of the distances between populations of popgen2.html,
 * `popDistsOnPopgen2` (docs/specs/analyses/popDists.md, "On
 * popgen2.html", "How it is verified"): its populations, where the
 * unclassified are left out, its locks, its warnings, its refusals and
 * its key, beside the old page's, which stay in popDists.test.ts.
 */
import { describe, expect, test } from "vitest";

import { popDists, popDistsOnPopgen2, refusalText } from "./popDists.ts";
import type { IndividualsKept } from "../individualsKept.ts";
import { createKeyMemo, keyOf } from "../keys.ts";
import type { KeyedDef } from "../keys.ts";
import type { Project } from "../project.ts";
import type { Warning, WorkerClient } from "../store.ts";
import { deepFreeze } from "../testSupport.ts";
import type {
  Cell,
  IndividualsTable,
  Job,
  JobResult,
  PopDistsJob,
  PopDistsResult,
  Run,
} from "../../worker/protocol.ts";

const VARIANTS_ID = "00112233445566778899aabbccddeeff";
const INDIVIDUALS_ID = "ffeeddccbbaa99887766554433221100";

/** The worked example of the diversity: `i4` has no population, and
    `i5` is not in the variants file. */
const EXAMPLE_TABLE: IndividualsTable = {
  columns: ["name", "pop", "other"],
  rows: [
    ["i1", "A", "x"],
    ["i2", "B", "y"],
    ["i3", "A", "x"],
    ["i4", null, "z"],
    ["i5", "C", "y"],
  ],
};

/** A table `name,pop` of the individuals `names`, each with its
    population in `pops`. */
function tableOf(
  names: readonly string[],
  pops: readonly Cell[],
): IndividualsTable {
  return {
    columns: ["name", "pop"],
    rows: names.map((name, i) => [name, pops[i] ?? null]),
  };
}

/** A project of popgen2.html, frozen deeply: `panel.nei` read with
    `individuals`, the missing data filter at 0.1, an individuals file
    `pops.csv` read with `table` (none for `null`), its column `column`,
    and the minimum of the distances `min`. */
function project(
  options: {
    readonly table?: IndividualsTable | null;
    readonly tableName?: string;
    readonly column?: string | null;
    readonly individuals?: readonly string[];
    readonly min?: number;
    readonly measure?: "fst" | "dest";
    readonly pending?: boolean;
  } = {},
): Project {
  const table = options.table === undefined ? EXAMPLE_TABLE : options.table;
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
        individuals: options.individuals ?? ["i1", "i2", "i3", "i4"],
        ploidy: 2,
        numVars: null,
        keepsPassed: false,
      },
    },
    filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.1 }],
    filtersOff: [],
    individualFilters: [],
    individualFiltersOff: [],
    individuals:
      table === null
        ? null
        : {
            fileId: INDIVIDUALS_ID,
            name: options.tableName ?? "pops.csv",
            csv: { encoding: "auto", separator: "auto", decimal: "auto" },
            typesSet: [],
            read:
              options.pending === true
                ? { kind: "pending" }
                : {
                    kind: "read",
                    table,
                    columns: table.columns.map((_, i) =>
                      i === 0
                        ? { kind: "identifier" }
                        : { kind: "categorical" },
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
    analyses: [
      {
        analysis: "popDists",
        options: {
          minNumIndividuals: options.min ?? 1,
          measure: options.measure ?? "fst",
        },
      },
    ],
    reference: null,
  });
}

/** Populations p0, p1, … of the sizes `sizes`, of individuals s000, s001,
    … in that order, with `unclassified` more individuals of no
    population after them. */
function sizedProject(
  sizes: readonly number[],
  min: number,
  unclassified = 0,
): Project {
  const names: string[] = [];
  const pops: Cell[] = [];
  for (const [pop, size] of sizes.entries()) {
    for (let i = 0; i < size; i++) {
      names.push(`s${String(names.length).padStart(3, "0")}`);
      pops.push(`p${String(pop)}`);
    }
  }
  for (let i = 0; i < unclassified; i++) {
    names.push(`s${String(names.length).padStart(3, "0")}`);
    pops.push(null);
  }
  return project({
    table: tableOf(names, pops),
    tableName: "panel_pops.csv",
    individuals: names,
    min,
  });
}

/** The individuals kept, known, `list`, out of `byLists`. */
function knownKept(
  byLists: readonly string[],
  list: readonly string[],
): IndividualsKept {
  return { byLists, list: { kind: "known", individuals: list }, counts: [] };
}

/** The `keptNeeds` of the distances of popgen2.html, which it has. */
function keptNeeds(p: Project, kept: IndividualsKept): string | null {
  if (popDistsOnPopgen2.keptNeeds === undefined) {
    throw new Error("the distances of popgen2.html have a keptNeeds");
  }
  return popDistsOnPopgen2.keptNeeds(p, kept);
}

/** The jobs `run` of the page's definition sends for `p`, the
    individuals kept `individuals`. */
function sentJobs(
  p: Project,
  individuals: readonly string[] | null = null,
): readonly PopDistsJob[] {
  const jobs: PopDistsJob[] = [];
  const client: WorkerClient<Job, JobResult> = {
    run(job): Run<JobResult> {
      if (job.analysis !== "popDists") {
        throw new Error(`the distances sent a job of ${job.analysis}`);
      }
      jobs.push(job);
      return {
        id: 1,
        outcome: Promise.resolve({ kind: "cancelled" }),
        cancel: () => undefined,
      };
    },
    intermediateKey: () => "",
    individuals,
  };
  popDistsOnPopgen2.run(p, client);
  return jobs;
}

/** A result of the populations `pops`, three pairs or one, every pair
    over 100 variants, with the populations left out `leftOut`. */
function result(
  pops: readonly string[],
  leftOut: PopDistsResult["leftOut"] = [],
): PopDistsResult {
  const numPairs = (pops.length * (pops.length - 1)) / 2;
  const values = Array.from({ length: numPairs }, () => 0.1);
  return {
    analysis: "popDists",
    pops,
    numIndividuals: Uint32Array.from(pops.map(() => 20)),
    fst: Float64Array.from(values),
    dest: Float64Array.from(values),
    numVarsPerPair: Uint32Array.from(values.map(() => 100)),
    order: {
      fst: { kind: "file", reason: "twoPopulations" },
      dest: { kind: "file", reason: "twoPopulations" },
    },
    leftOut,
    passStats: {
      numVars: 100,
      filtering: { missing_data: { varsProcessed: 100, varsKept: 100 } },
    },
  };
}

/** The codes and texts of the warnings of `r` for `p`. */
function warningsOf(r: PopDistsResult, p: Project): readonly Warning[] {
  return popDistsOnPopgen2.warnings(r, p, null);
}

/** The key of the page's definition for `p`. */
function keyOn(def: KeyedDef, p: Project): string {
  return keyOf(def, p, "0.2.2", createKeyMemo());
}

/** The words of the lock of fewer than two populations. */
const TWO_POPULATIONS =
  "The distances between populations need two populations or more with individuals in panel.nei. Choose a column of the populations in the box Individuals that gives them two or more.";

describe("DT1 D1 the definition of the distances of popgen2.html", () => {
  test("both definitions are of the id popDists and key version 1", () => {
    expect(popDistsOnPopgen2.id).toBe("popDists");
    expect(popDistsOnPopgen2.keyVersion).toBe(1);
  });

  test("run leaves out the unclassified i4 and i5, not in the variants file, with no lock", () => {
    const p = project();
    expect(popDistsOnPopgen2.needs(p)).toBeNull();
    const [job] = sentJobs(p);
    expect(job?.pops).toEqual([
      ["A", ["i1", "i3"]],
      ["B", ["i2"]],
    ]);
    expect(job?.leftOut).toEqual([]);
  });

  test("an individual of the variants file not in the individuals file does not lock", () => {
    const p = project({ individuals: ["i1", "i2", "i3", "i4", "i6"] });
    expect(popDistsOnPopgen2.needs(p)).toBeNull();
    expect(sentJobs(p)[0]?.pops).toEqual([
      ["A", ["i1", "i3"]],
      ["B", ["i2"]],
    ]);
  });

  test("a population under the minimum is sent apart as left out", () => {
    const p = sizedProject([3, 3, 1], 2, 2);
    const [job] = sentJobs(p);
    expect(job?.pops.map(([pop]) => pop)).toEqual(["p0", "p1"]);
    expect(job?.leftOut).toEqual([["p2", 1]]);
  });

  test("with no individuals file, None, or a column that classifies nobody, the lock of two populations", () => {
    expect(popDistsOnPopgen2.needs(project({ table: null }))).toBe(
      TWO_POPULATIONS,
    );
    expect(popDistsOnPopgen2.needs(project({ column: null }))).toBe(
      TWO_POPULATIONS,
    );
    expect(
      popDistsOnPopgen2.needs(
        project({
          table: tableOf(
            ["i1", "i2", "i3", "i4", "i9"],
            [null, null, null, null, "A"],
          ),
        }),
      ),
    ).toBe(TWO_POPULATIONS);
  });

  test("one population of the column with individuals in the variants file locks with the same words", () => {
    const p = project({
      table: tableOf(["i1", "i2", "i3", "i4"], ["A", "A", null, null]),
    });
    expect(popDistsOnPopgen2.needs(p)).toBe(TWO_POPULATIONS);
  });

  test("the individuals file being read", () => {
    expect(popDistsOnPopgen2.needs(project({ pending: true }))).toBe(
      "The distances wait for pops.csv to be read.",
    );
  });

  test("fewer than two populations with the minimum, over every individual", () => {
    expect(popDistsOnPopgen2.needs(sizedProject([30, 10, 5], 20))).toBe(
      "Only p0 has 20 individuals or more, and a variant counts for a pair of populations only where both have 20 individuals with a called genotype, so no pair has a distance. Lower the individuals needed per variant, above, or merge populations in panel_pops.csv.",
    );
    expect(popDistsOnPopgen2.needs(sizedProject([10, 5], 20))).toBe(
      "No population has 20 individuals or more, and a variant counts for a pair of populations only where both have 20 individuals with a called genotype, so no pair has a distance. Lower the individuals needed per variant, above, or merge populations in panel_pops.csv.",
    );
    expect(popDistsOnPopgen2.needs(sizedProject([20, 20], 20))).toBeNull();
  });

  test("keptNeeds: the thresholds leave one population", () => {
    const p = sizedProject([3, 3], 1);
    const all = ["s000", "s001", "s002", "s003", "s004", "s005"];
    expect(keptNeeds(p, knownKept(all, ["s000", "s003"]))).toBeNull();
    expect(keptNeeds(p, knownKept(all, ["s000", "s001"]))).toBe(
      "The thresholds of the individuals leave one population, p0, and the distances need two or more. Loosen the thresholds of the individuals in the Variants tab.",
    );
  });

  test("keptNeeds: the thresholds take populations below the minimum", () => {
    const p = sizedProject([3, 3, 3], 2);
    const all = Array.from(
      { length: 9 },
      (_, i) => `s${String(i).padStart(3, "0")}`,
    );
    expect(keptNeeds(p, knownKept(all, ["s000", "s001", "s003", "s006"]))).toBe(
      "Only p0 has 2 individuals or more among the individuals the thresholds keep, and a variant counts for a pair of populations only where both have 2 individuals with a called genotype, so no pair has a distance. Lower the individuals needed per variant, above, merge populations in panel_pops.csv, or loosen the thresholds of the individuals in the Variants tab.",
    );
  });

  test("keptNeeds: the thresholds keep only unclassified individuals", () => {
    const p = sizedProject([2, 2], 1, 2);
    const all = ["s000", "s001", "s002", "s003", "s004", "s005"];
    expect(keptNeeds(p, knownKept(all, ["s004", "s005"]))).toMatch(
      /Loosen the thresholds of the individuals in the Variants tab to keep them\.$/u,
    );
  });

  test("keptNeeds: null while the list is not known", () => {
    const p = sizedProject([3, 3], 1);
    expect(
      keptNeeds(p, {
        byLists: [],
        list: { kind: "needsStatistics" },
        counts: [],
      }),
    ).toBeNull();
  });

  test("the warnings: no individualsWithoutPopulation for the unclassified i4", () => {
    const codes = warningsOf(result(["A", "B"]), project()).map((w) => w.code);
    expect(codes).not.toContain("individualsWithoutPopulation");
    expect(codes).toEqual([]);
  });

  test("tooFewIndividuals in the words of popgen2.html", () => {
    const p = sizedProject([30, 30, 12], 20);
    const [warning] = warningsOf(result(["p0", "p1"], [["p2", 12]]), p);
    expect(warning).toEqual({
      code: "tooFewIndividuals",
      text: "Population p2 has 12 individuals, fewer than the 20 individuals needed per variant, so it is left out of the distances. To include it, lower the individuals needed per variant, or merge it with another population in panel_pops.csv.",
    });
    const two = sizedProject([30, 30, 12, 8], 20);
    expect(
      warningsOf(
        result(
          ["p0", "p1"],
          [
            ["p2", 12],
            ["p3", 8],
          ],
        ),
        two,
      )[0]?.text,
    ).toBe(
      "Populations p2 and p3 have 12 and 8 individuals, fewer than the 20 individuals needed per variant, so they are left out of the distances. To include them, lower the individuals needed per variant, or merge each with another population in panel_pops.csv.",
    );
  });

  test("tooFewIndividuals when the thresholds took individuals from one", () => {
    const p = sizedProject([30, 30, 22], 20);
    expect(warningsOf(result(["p0", "p1"], [["p2", 12]]), p)[0]?.text).toBe(
      "Population p2 has 12 individuals, fewer than the 20 individuals needed per variant, so it is left out of the distances. To include it, lower the individuals needed per variant, merge it with another population in panel_pops.csv, or loosen the thresholds of the individuals in the Variants tab.",
    );
  });

  test("populationNotInResult names a population the thresholds emptied", () => {
    const p = sizedProject([3, 3, 3], 1);
    expect(warningsOf(result(["p0", "p1"]), p)).toEqual([
      {
        code: "populationNotInResult",
        text: "Population p2 has no individual among the individuals of panel.nei that the filters kept, so it is not in the distances.",
      },
    ]);
  });

  test("the refusals in the words of popgen2.html; the old page's unchanged", () => {
    const p = project();
    expect(
      refusalText(
        "the pass gave no variant: its source gave 1200 and the steps kept none of them",
        p,
        "popgen2",
      ),
    ).toBe(
      "The thresholds of the Variants tab kept none of the variants of panel.nei, so there is no variant to calculate the distances between populations over. Loosen them. The distances are then calculated again by themselves.",
    );
    expect(
      refusalText(
        "the pass gave no variant: its source gave 1200 and the steps kept none of them",
        p,
        "popgen",
      ),
    ).toBe(
      "The filters kept none of the variants of panel.nei, so there is no variant to calculate the distances between populations over. Loosen the filters in the Variants step.",
    );
    // A refusal of the variants file itself, in the words of the box
    // Variants, with no sentence of what follows (the review of the
    // Distances tab, 12 October 2026).
    expect(
      refusalText(
        "the pass gave no variant and its source holds none",
        p,
        "popgen2",
      ),
    ).toBe(
      "panel.nei has no variants. Open another variants file in the box Variants.",
    );
    // In the plural, and said once (the review of the Distances tab, 12
    // October 2026).
    expect(refusalText("something else went wrong.", p, "popgen2")).toBe(
      "popnei could not calculate the distances between populations: something else went wrong. Change the settings, or open the variants file again in the box Variants, and the distances are then calculated again by themselves.",
    );
  });

  test("the key: another individuals file of the same table, None, other populations of the same file and column, and another column of the same values change it; the measure does not", () => {
    const p = project();
    expect(keyOn(popDistsOnPopgen2, p)).not.toBe(
      keyOn(popDistsOnPopgen2, project({ tableName: "other.csv" })),
    );
    expect(keyOn(popDistsOnPopgen2, p)).not.toBe(
      keyOn(popDistsOnPopgen2, project({ column: null })),
    );
    expect(keyOn(popDistsOnPopgen2, p)).toBe(
      keyOn(popDistsOnPopgen2, project({ measure: "dest" })),
    );
    expect(keyOn(popDistsOnPopgen2, p)).not.toBe(
      keyOn(popDistsOnPopgen2, project({ min: 2 })),
    );
    // The same file and column with other populations: i3 moved to B.
    const moved: IndividualsTable = {
      ...EXAMPLE_TABLE,
      rows: EXAMPLE_TABLE.rows.map((row) =>
        row[0] === "i3" ? ["i3", "B", "x"] : row,
      ),
    };
    expect(keyOn(popDistsOnPopgen2, p)).not.toBe(
      keyOn(popDistsOnPopgen2, project({ table: moved })),
    );
    // A second column of the same values under another name: the same
    // populations, named in the warnings by another column.
    const twice: IndividualsTable = {
      columns: ["name", "pop", "site"],
      rows: EXAMPLE_TABLE.rows.map((row) => [
        row[0] ?? null,
        row[1] ?? null,
        row[1] ?? null,
      ]),
    };
    expect(keyOn(popDistsOnPopgen2, project({ table: twice }))).not.toBe(
      keyOn(popDistsOnPopgen2, project({ table: twice, column: "site" })),
    );
    // The old page's key reads no name of the individuals file.
    expect(keyOn(popDists, p)).toBe(
      keyOn(popDists, project({ tableName: "other.csv" })),
    );
  });

  test("no script on popgen2.html, which saves no project and writes no report: asked, a defect, where it gave the old page's script (the review of the Distances tab, 12 October 2026)", () => {
    expect(() => popDistsOnPopgen2.script(project())).toThrow(
      "popnei_web defect: the Python script of the distances was asked on popgen2.html, which writes none.",
    );
    expect(popDists.script(project())).toContain("popnei.calc_pop_dists(");
  });

  test("no check numbers on popgen2.html", () => {
    expect(popDistsOnPopgen2.numCheckNumbers(sizedProject([3, 3], 1))).toBe(
      null,
    );
  });
});
