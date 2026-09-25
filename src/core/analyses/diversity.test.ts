import { describe, expect, test } from "vitest";
import {
  DIVERSITY_DEFAULTS,
  diversity,
  diversityCsv,
  populationsNeeds,
  populationsOf,
  refusalText,
} from "./diversity.ts";
import { individualsNeeds } from "../project.ts";
import type { Project } from "../project.ts";
import type { WorkerClient } from "../store.ts";
import { deepFreeze } from "../testSupport.ts";
import type {
  Cell,
  DiversityResult,
  IndividualsTable,
  Job,
  JobResult,
  Run,
} from "../../worker/protocol.ts";

const VARIANTS_ID = "00112233445566778899aabbccddeeff";
const INDIVIDUALS_ID = "ffeeddccbbaa99887766554433221100";

/** The table of the worked example of the spec: `i4` has no population,
    and `i5` is not in the variants file. */
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

/** A project of population genetics, frozen deeply: a `.nei` file named
    `variantsName`, read with `individuals`, the missing data filter at
    0.1, a CSV `pops.csv` read with `table`, and the column `column`. */
function project(
  options: {
    readonly individuals?: readonly string[];
    readonly table?: IndividualsTable;
    readonly column?: string | null;
    readonly variantsName?: string;
  } = {},
): Project {
  const table = options.table ?? EXAMPLE_TABLE;
  return deepFreeze<Project>({
    app: "popgen",
    variants: {
      fileId: VARIANTS_ID,
      name: options.variantsName ?? "panel.nei",
      size: 261_490,
      format: "nei",
      readOptions: null,
      read: {
        kind: "read",
        individuals: options.individuals ?? ["i1", "i2", "i3", "i4"],
        ploidy: 2,
        numVars: null,
      },
    },
    filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.1 }],
    individualFilters: [],
    individuals: {
      fileId: INDIVIDUALS_ID,
      name: "pops.csv",
      csv: { encoding: "auto", separator: "auto", decimal: "auto" },
      read: {
        kind: "read",
        table,
        columns: table.columns.map((_, i) =>
          i === 0 ? { kind: "identifier" } : { kind: "categorical" },
        ),
        found: { encoding: "utf-8", separator: ",", decimal: "." },
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

/** A project whose individuals file has one population, of the
    individuals `names`, each with its population in `pops`, in a column
    `pop`. */
function tableOf(
  names: readonly string[],
  pops: readonly Cell[],
): IndividualsTable {
  return {
    columns: ["name", "pop"],
    rows: names.map((name, i) => [name, pops[i] ?? null]),
  };
}

/** A result of the diversity; the arrays are made from the lists. */
function result(fields: {
  readonly pops: readonly string[];
  readonly numIndividuals: readonly number[];
  readonly unbiasedExpHet?: readonly number[];
  readonly obsHet?: readonly number[];
  readonly polyRatio?: readonly number[];
  readonly numVarsWithValue?: readonly number[];
  readonly numVars: number;
}): DiversityResult {
  const nan = fields.pops.map(() => NaN);
  return {
    analysis: "diversity",
    pops: fields.pops,
    numIndividuals: Uint32Array.from(fields.numIndividuals),
    unbiasedExpHet: Float64Array.from(fields.unbiasedExpHet ?? nan),
    obsHet: Float64Array.from(fields.obsHet ?? nan),
    polyRatio: Float64Array.from(fields.polyRatio ?? nan),
    numVarsWithValue: Uint32Array.from(
      fields.numVarsWithValue ?? fields.pops.map(() => fields.numVars),
    ),
    numVars: fields.numVars,
    numVarsRead: 1200,
  };
}

/** A client that records the jobs it is given and answers none. */
function recordingClient(): {
  readonly client: WorkerClient<Job, JobResult>;
  readonly jobs: Job[];
} {
  const jobs: Job[] = [];
  const client: WorkerClient<Job, JobResult> = {
    run(job): Run<JobResult> {
      jobs.push(job);
      return {
        id: 1,
        outcome: Promise.resolve({ kind: "cancelled" }),
        cancel: () => undefined,
      };
    },
    intermediateKey: () => "",
  };
  return { client, jobs };
}

/** The individuals `s000` to `s0nn` of a population of `count`. */
function individualsNamed(prefix: string, count: number): string[] {
  return Array.from(
    { length: count },
    (_, i) => `${prefix}${String(i).padStart(3, "0")}`,
  );
}

/** The flow's result with the missing data filter at 0.05 (the spec, "How
    it is verified"). */
const FLOW_RESULT = result({
  pops: ["p0", "p2", "p1"],
  numIndividuals: [48, 84, 68],
  unbiasedExpHet: [0.35267894847982756, 0.3440824705971255, 0.3498365468860467],
  obsHet: [0.35667985874177544, 0.3512406974637824, 0.35603713961547323],
  polyRatio: [0.9288194444444444, 0.9105902777777778, 0.9157986111111112],
  numVars: 1152,
});

describe("WS5 D1 the example and the reasons", () => {
  test("the worked example gives the populations, the request, the warnings, the key inputs and the check numbers of the spec", () => {
    const p = project();
    expect(populationsOf(p)).toEqual([
      ["A", ["i1", "i3"]],
      ["B", ["i2"]],
      ["C", ["i5"]],
    ]);
    const { client, jobs } = recordingClient();
    diversity.run(p, client);
    expect(jobs).toEqual([
      {
        analysis: "diversity",
        fileId: VARIANTS_ID,
        filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.1 }],
        individualFilters: [],
        pops: [
          ["A", ["i1", "i3"]],
          ["B", ["i2"]],
        ],
        minNumIndividuals: 20,
        polyThreshold: 0.95,
      },
    ]);
    const r = result({
      pops: ["A", "B"],
      numIndividuals: [2, 1],
      numVarsWithValue: [0, 0],
      numVars: 1000,
    });
    expect(diversity.warnings(r, p)).toEqual([
      {
        code: "tooFewIndividuals",
        text: "Populations A and B have fewer than 20 individuals, 2 and 1, and a variant has a value in a population only when at least 20 of its individuals have a called genotype there, so they have no values. To have them, merge each with another population in the metadata file.",
      },
      {
        code: "individualsWithoutPopulation",
        text: "1 individual of panel.nei has no population, and is left out of the diversity: i4. If it belongs to one, fill in its population in the metadata file and load it again.",
      },
      {
        code: "populationNotInResult",
        text: "Population C has no individual among the individuals of panel.nei that the filters kept, so it is not in the table.",
      },
    ]);
    expect(diversity.keyInputs(p)).toEqual({
      pops: [
        ["A", ["i1", "i3"]],
        ["B", ["i2"]],
        ["C", ["i5"]],
      ],
      options: DIVERSITY_DEFAULTS,
    });
    expect(diversity.checkNumbers(r)).toEqual([
      1000,
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  test("needs locks a project with two filters of individuals, and says how many", () => {
    const p = deepFreeze<Project>({
      ...project(),
      individualFilters: [
        { kind: "remove", individuals: ["i4"] },
        { kind: "missing_data", maxAllowedMissingRate: 0.2 },
      ],
    });
    expect(diversity.needs(p)).toBe(
      "The filters of individuals come in a later version of the application, and this project holds 2 of them, so the diversity cannot run in this version. To run it, open the project file in a text editor, empty the list named individualFilters in it, and open the project again.",
    );
  });

  test("needs locks a project with one filter of individuals, saying one of them", () => {
    const p = deepFreeze<Project>({
      ...project(),
      individualFilters: [{ kind: "remove", individuals: ["i4"] }],
    });
    expect(diversity.needs(p)).toBe(
      "The filters of individuals come in a later version of the application, and this project holds one of them, so the diversity cannot run in this version. To run it, open the project file in a text editor, empty the list named individualFilters in it, and open the project again.",
    );
  });

  test("needs gives each reason of individualsNeeds in its words", () => {
    const noFile = deepFreeze<Project>({ ...project(), individuals: null });
    expect(diversity.needs(noFile)).toBe(
      "Load a metadata file in the Individuals step.",
    );
    const base = project();
    if (base.individuals === null) {
      throw new Error("the project of the test has an individuals file");
    }
    const pending = deepFreeze<Project>({
      ...base,
      individuals: { ...base.individuals, read: { kind: "pending" } },
    });
    expect(diversity.needs(pending)).toBe("Reading pops.csv.");
    const refused = deepFreeze<Project>({
      ...base,
      individuals: {
        ...base.individuals,
        read: { kind: "failed", error: { kind: "empty" } },
      },
    });
    expect(diversity.needs(refused)).toBe(individualsNeeds(refused));
    expect(diversity.needs(refused)).not.toBeNull();
    const missing = project({ individuals: ["i1", "i2", "i6"] });
    expect(diversity.needs(missing)).toBe(
      "1 individual of panel.nei is not in pops.csv: i6. Add it to the file and load the file again in the Individuals step.",
    );
  });

  test("needs asks for the column of the populations when none is chosen", () => {
    expect(diversity.needs(project({ column: null }))).toBe(
      "Choose the column that defines the populations in the Individuals step.",
    );
  });

  test("needs says the table has no column of the name chosen", () => {
    expect(diversity.needs(project({ column: "popcat" }))).toBe(
      "pops.csv has no column popcat, from which the populations were taken. Choose the column that defines the populations in the Individuals step.",
    );
  });

  test("needs says no individual of the variants file has a population in the column", () => {
    const p = project({
      table: tableOf(["i1", "i2", "i3"], [null, null, null]),
      individuals: ["i1", "i2", "i3"],
    });
    expect(diversity.needs(p)).toBe(
      "No individual of panel.nei has a population in the column pop of pops.csv. Fill in the column and load the file again, or choose another column, in the Individuals step.",
    );
  });

  test("populationsNeeds gives the kind noColumn with the words of needs", () => {
    const p = project({ column: null });
    expect(populationsNeeds(p)).toEqual({
      kind: "noColumn",
      reason: diversity.needs(p),
    });
  });

  test("populationsNeeds gives the kind noSuchColumn with the words of needs", () => {
    const p = project({ column: "popcat" });
    expect(populationsNeeds(p)).toEqual({
      kind: "noSuchColumn",
      reason:
        "pops.csv has no column popcat, from which the populations were taken. Choose the column that defines the populations in the Individuals step.",
    });
  });

  test("populationsNeeds gives the kind noPopulation with the words of needs", () => {
    const p = project({
      table: tableOf(["i1", "i2", "i3"], [null, null, null]),
      individuals: ["i1", "i2", "i3"],
    });
    expect(populationsNeeds(p)).toEqual({
      kind: "noPopulation",
      reason:
        "No individual of panel.nei has a population in the column pop of pops.csv. Fill in the column and load the file again, or choose another column, in the Individuals step.",
    });
  });

  test("populationsNeeds is null for a project whose individuals file is not read", () => {
    const base = project({ column: null });
    if (base.individuals === null) {
      throw new Error("the project of the test has an individuals file");
    }
    const pending = deepFreeze<Project>({
      ...base,
      individuals: { ...base.individuals, read: { kind: "pending" } },
    });
    expect(populationsNeeds(pending)).toBeNull();
  });
});

describe("WS5 D3 the rest of the module", () => {
  const EXPECTED =
    "the minimum of individuals, a whole number from 0 to 4,294,967,295, and the frequency below which a variant is polymorphic, a number from 0 to 1, and nothing else";

  test("parseOptions gives the defaults back", () => {
    expect(
      diversity.parseOptions({ minNumIndividuals: 20, polyThreshold: 0.95 }, 1),
    ).toEqual({
      ok: true,
      value: { minNumIndividuals: 20, polyThreshold: 0.95 },
    });
  });

  test("parseOptions takes a minNumIndividuals of 4,294,967,295", () => {
    expect(
      diversity.parseOptions(
        { minNumIndividuals: 4_294_967_295, polyThreshold: 0.95 },
        1,
      ),
    ).toEqual({
      ok: true,
      value: { minNumIndividuals: 4_294_967_295, polyThreshold: 0.95 },
    });
  });

  test("parseOptions refuses a missing field", () => {
    expect(diversity.parseOptions({ minNumIndividuals: 20 }, 1)).toEqual({
      ok: false,
      error: EXPECTED,
    });
  });

  test("parseOptions refuses a field more", () => {
    expect(
      diversity.parseOptions(
        { minNumIndividuals: 20, polyThreshold: 0.95, stats: [] },
        1,
      ),
    ).toEqual({ ok: false, error: EXPECTED });
  });

  test("parseOptions refuses a minNumIndividuals of 2.5", () => {
    expect(
      diversity.parseOptions(
        { minNumIndividuals: 2.5, polyThreshold: 0.95 },
        1,
      ),
    ).toEqual({ ok: false, error: EXPECTED });
  });

  test("parseOptions refuses a minNumIndividuals of -1", () => {
    expect(
      diversity.parseOptions({ minNumIndividuals: -1, polyThreshold: 0.95 }, 1),
    ).toEqual({ ok: false, error: EXPECTED });
  });

  test("parseOptions refuses a minNumIndividuals of 4,294,967,296", () => {
    expect(
      diversity.parseOptions(
        { minNumIndividuals: 4_294_967_296, polyThreshold: 0.95 },
        1,
      ),
    ).toEqual({ ok: false, error: EXPECTED });
  });

  test("parseOptions refuses a polyThreshold of 1.5", () => {
    expect(
      diversity.parseOptions({ minNumIndividuals: 20, polyThreshold: 1.5 }, 1),
    ).toEqual({ ok: false, error: EXPECTED });
  });

  test("parseOptions refuses a polyThreshold that is a text", () => {
    expect(
      diversity.parseOptions(
        { minNumIndividuals: 20, polyThreshold: "0.95" },
        1,
      ),
    ).toEqual({ ok: false, error: EXPECTED });
  });

  /** A project of one population, p0a, of the first 20 individuals, and
      its result with `withValue` of the 1,152 variants kept. */
  function p0a(withValue: number): {
    readonly p: Project;
    readonly r: DiversityResult;
  } {
    const names = individualsNamed("s", 20);
    return {
      p: project({
        table: tableOf(
          names,
          names.map(() => "p0a"),
        ),
        individuals: names,
      }),
      r: result({
        pops: ["p0a"],
        numIndividuals: [20],
        unbiasedExpHet: [0.35],
        obsHet: [0.35],
        polyRatio: [0.9],
        numVarsWithValue: [withValue],
        numVars: 1152,
      }),
    };
  }

  test("warnings of a population with a value at 641 of 1,152 variants gives variantsWithoutValue with 56%", () => {
    const { p, r } = p0a(641);
    expect(diversity.warnings(r, p)).toEqual([
      {
        code: "variantsWithoutValue",
        text: "p0a has a value at 641 of the 1,152 variants kept (56%); at the others fewer than 20 of its individuals have a genotype.",
      },
    ]);
  });

  test("warnings of 1,151 of 1,152 variants writes 99%, not 100%", () => {
    const { p, r } = p0a(1151);
    expect(diversity.warnings(r, p)).toEqual([
      {
        code: "variantsWithoutValue",
        text: "p0a has a value at 1,151 of the 1,152 variants kept (99%); at the others fewer than 20 of its individuals have a genotype.",
      },
    ]);
  });

  test("warnings of 1 of 1,152 variants writes 1%, not 0%", () => {
    const { p, r } = p0a(1);
    expect(diversity.warnings(r, p)).toEqual([
      {
        code: "variantsWithoutValue",
        text: "p0a has a value at 1 of the 1,152 variants kept (1%); at the others fewer than 20 of its individuals have a genotype.",
      },
    ]);
  });

  test("warnings of a population with a value at every variant kept is none", () => {
    const { p, r } = p0a(1152);
    expect(diversity.warnings(r, p)).toEqual([]);
  });

  test("warnings of four populations of fewer than 20 names two and how many more, with no counts", () => {
    const names = ["i1", "i2", "i3", "i4"];
    const p = project({
      table: tableOf(names, ["P1", "P2", "P3", "P4"]),
      individuals: names,
    });
    const r = result({
      pops: ["P1", "P2", "P3", "P4"],
      numIndividuals: [1, 1, 1, 1],
      numVarsWithValue: [0, 0, 0, 0],
      numVars: 1152,
    });
    expect(diversity.warnings(r, p)).toEqual([
      {
        code: "tooFewIndividuals",
        text: "Populations P1, P2 and 2 more have fewer than 20 individuals, and a variant has a value in a population only when at least 20 of its individuals have a called genotype there, so they have no values. To have them, merge each with another population in the metadata file.",
      },
    ]);
  });

  test("script of the project of the flow gives the lines of the spec", () => {
    const p = project({
      table: {
        columns: ["IID", "popcat"],
        rows: [
          ["s000", "p0"],
          ["s001", "p2"],
        ],
      },
      individuals: ["s000", "s001"],
      column: "popcat",
    });
    expect(diversity.script(p)).toBe(
      `# The diversity of each population, from the column "popcat"
pops = {}
for individual, pop in zip(individuals.iloc[:, 0], individuals["popcat"]):
    if not pandas.isna(pop):
        pops.setdefault(pop, []).append(individual)
kept = set(variants.individuals)
pops = {pop: [i for i in names if i in kept] for pop, names in pops.items()}
pops = {pop: names for pop, names in pops.items() if names}
diversity = popnei.calc_per_var_distribs(
    variants, pops=pops, min_num_individuals=20, poly_threshold=0.95
)
print(pandas.DataFrame({
    "individuals": {pop: len(names) for pop, names in pops.items()},
    "expected_heterozygosity_unbiased": diversity.unbiased_exp_het.mean,
    "observed_heterozygosity": diversity.obs_het.mean,
    "proportion_polymorphic": diversity.poly_vars_ratio.poly_ratio,
}).to_string())
`,
    );
  });

  test("diversityCsv of the result of the flow gives the text of the spec", () => {
    expect(diversityCsv(FLOW_RESULT)).toBe(
      `population,individuals,expected_heterozygosity_unbiased,observed_heterozygosity,proportion_polymorphic
p0,48,0.35267894847982756,0.35667985874177544,0.9288194444444444
p2,84,0.3440824705971255,0.3512406974637824,0.9105902777777778
p1,68,0.3498365468860467,0.35603713961547323,0.9157986111111112
`,
    );
  });

  test("diversityCsv quotes a population with a comma and quotes, and leaves no value empty", () => {
    const r = result({
      pops: ['a,"b"'],
      numIndividuals: [3],
      numVars: 10,
    });
    expect(diversityCsv(r)).toBe(
      `population,individuals,expected_heterozygosity_unbiased,observed_heterozygosity,proportion_polymorphic
"a,""b""",3,,,
`,
    );
  });

  test("refusalText of an empty pass tells to loosen the filters", () => {
    expect(
      refusalText(
        "the pass gave no variant: its source gave 1200 and the steps kept none of them, the `missing_data` filter was given 1200 and kept 1152, the `maf` filter was given 1152 and kept 0; a statistic of a pass is calculated over the variants it gives",
        project(),
      ),
    ).toBe(
      "The filters kept none of the variants of panel.nei, so there is no variant to calculate the diversity over. Loosen the filters in the Variants step.",
    );
  });

  test("refusalText of a genotype of another ploidy tells to set the ploidy", () => {
    expect(
      refusalText(
        "line 5 of the VCF, the column of t00: its genotype is of the ploidy 4 and the reader was asked for the ploidy 2; popnei does not read a VCF whose genotypes are of different ploidies, and the ploidy is an argument of the reader",
        project({ variantsName: "tetraploid.vcf.gz" }),
      ),
    ).toBe(
      "At line 5 of tetraploid.vcf.gz, the genotype of t00 has 4 alleles, and the file was read with ploidy 2. Set the ploidy of the VCF to 4 in the Variants step and read the file again.",
    );
  });

  test("refusalText of a line of the VCF popnei cannot read tells to correct the file", () => {
    expect(
      refusalText(
        "line 4 of the VCF, the column of a: `z` is not an allele number, which is a run of digits",
        project({ variantsName: "panel.vcf.gz" }),
      ),
    ).toBe(
      "popnei could not read panel.vcf.gz: line 4 of the VCF, the column of a: `z` is not an allele number, which is a run of digits. Correct the file, or fetch it again, and load it in the Variants step.",
    );
  });

  test("refusalText of another message gives popnei's message without its full stop", () => {
    expect(refusalText("the memory of the tab ran out.", project())).toBe(
      "popnei could not calculate the diversity: the memory of the tab ran out. Change the settings, or load the variants file again, to run it again.",
    );
  });
});
