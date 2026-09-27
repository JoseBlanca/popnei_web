import { describe, expect, test } from "vitest";
import {
  DIVERSITY_DEFAULTS,
  diversity,
  diversityCsv,
  diversityRows,
  populationsKept,
  populationsNeeds,
  populationsOf,
  populationsToRun,
  refusalText,
  statisticsFailedText,
} from "./diversity.ts";
import { createKeyMemo, keyOf } from "../keys.ts";
import type { Key, KeyedDef } from "../keys.ts";
import { emptyProject, individualsNeeds } from "../project.ts";
import type { Project, VariantSource } from "../project.ts";
import type { WorkerClient } from "../store.ts";
import { deepFreeze } from "../testSupport.ts";
import type {
  Cell,
  DiversityJob,
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

/** The project of `project()` with its variants file a VCF named `name`,
    read with ploidy 2 and `onlyPassed`. */
function vcfProject(name: string, onlyPassed: boolean): Project {
  const p = project({ variantsName: name });
  if (p.variants === null) {
    throw new Error("the project of project() has a variants file");
  }
  return deepFreeze<Project>({
    ...p,
    variants: {
      ...p.variants,
      format: "vcf",
      readOptions: { ploidy: 2, onlyPassed },
    },
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
    passStats: {
      numVars: fields.numVars,
      filtering: {
        missing_data: { varsProcessed: 1200, varsKept: fields.numVars },
      },
    },
  };
}

/** A client that records the jobs of the diversity it is given and
    answers none. */
function recordingClient(): {
  readonly client: WorkerClient<Job, JobResult>;
  readonly jobs: DiversityJob[];
} {
  const jobs: DiversityJob[] = [];
  const client: WorkerClient<Job, JobResult> = {
    run(job): Run<JobResult> {
      if (job.analysis !== "diversity") {
        throw new Error(`the diversity sent a job of ${job.analysis}`);
      }
      jobs.push(job);
      return {
        id: 1,
        outcome: Promise.resolve({ kind: "cancelled" }),
        cancel: () => undefined,
      };
    },
    intermediateKey: () => "",
    individuals: null,
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
        individuals: null,
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
    ]);
    // A, alone, as the filters of individuals of stage 3 could leave it:
    // B, whose individual is in the variants file, is said to be missing,
    // and C, whose individual is not, is not.
    const aAlone = result({
      pops: ["A"],
      numIndividuals: [2],
      numVarsWithValue: [0],
      numVars: 1000,
    });
    expect(diversity.warnings(aAlone, p).map((w) => w.code)).toEqual([
      "tooFewIndividuals",
      "individualsWithoutPopulation",
      "populationNotInResult",
    ]);
    expect(diversity.warnings(aAlone, p).at(-1)).toEqual({
      code: "populationNotInResult",
      text: "Population B has no individual among the individuals of panel.nei that the filters kept, so it is not in the table.",
    });
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

  test("WS8 D2 refusalText of a pass over a file with no variant says the file has none", () => {
    expect(
      refusalText(
        "the pass gave no variant and its source holds none: a statistic of a pass is calculated over the variants it gives",
        project({ variantsName: "empty.vcf" }),
      ),
    ).toBe(
      "empty.vcf has no variants, so there is no variant to calculate the diversity over. Load another variants file in the Variants step.",
    );
  });

  test("refusalText of a pass over a VCF read with every variant, whose source holds none, says the file has none", () => {
    expect(
      refusalText(
        "the pass gave no variant and its source holds none: a statistic of a pass is calculated over the variants it gives",
        vcfProject("empty.vcf", false),
      ),
    ).toBe(
      "empty.vcf has no variants, so there is no variant to calculate the diversity over. Load another variants file in the Variants step.",
    );
  });

  test("refusalText of a pass over a VCF read with only the passed variants, whose source holds none, tells to untick the box of the passed variants", () => {
    expect(
      refusalText(
        "the pass gave no variant and its source holds none: a statistic of a pass is calculated over the variants it gives",
        vcfProject("failed.vcf", true),
      ),
    ).toBe(
      'failed.vcf has no variant with PASS or . in its FILTER column, and it was read with only those, so there is no variant to calculate the diversity over. Untick "Only the variants with PASS or . in the FILTER column" in the Variants step and read the file again.',
    );
  });

  test("refusalText tells a source that holds none from an empty pass by the colon, whatever the order of the tests", () => {
    expect(
      refusalText(
        "the pass gave no variant: its source gave 1200 and the steps kept none of them",
        project(),
      ),
    ).toMatch(/^The filters kept none/u);
    expect(
      refusalText(
        "the pass gave no variant and its source holds none",
        project(),
      ),
    ).toMatch(/^panel\.nei has no variants/u);
    expect(refusalText("the pass gave no variantx", project())).toMatch(
      /^popnei could not calculate the diversity/u,
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
      "At line 5 of tetraploid.vcf.gz, the genotype of t00 has 4 alleles, and the file was read with ploidy 2. If every genotype of the file has 4 alleles, set the ploidy of the VCF to 4 in the Variants step and read the file again. A file that mixes ploidies, such as one with the X of males haploid among diploid autosomes, cannot be read in this version.",
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

/** The key of the diversity for `p`, with popnei 0.1.0 unless another
    version is given. */
function keyOfDiversity(
  p: Project,
  popneiVersion = "0.1.0",
  def: KeyedDef = diversity,
): Key {
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

/** The rows of the project of the key: the worked example, with a column
    `pop2` that groups the individuals otherwise and a column `popcopy`
    that makes the same populations as `pop`. */
const KEY_ROWS: readonly (readonly Cell[])[] = [
  ["i1", "A", "x", "X", "A"],
  ["i2", "B", "y", "X", "B"],
  ["i3", "A", "x", "Y", "A"],
  ["i4", null, "z", "Y", null],
  ["i5", "C", "y", "Y", "C"],
];

/** The project of the key, of the rows `rows` and the column of the
    populations `column`. */
function keyProject(
  rows: readonly (readonly Cell[])[] = KEY_ROWS,
  column = "pop",
): Project {
  return project({
    table: { columns: ["name", "pop", "other", "pop2", "popcopy"], rows },
    column,
  });
}

/** `KEY_ROWS` with the cell of the row `row` and the column `column`
    replaced by `cell`. */
function rowsWith(row: number, column: number, cell: Cell): Cell[][] {
  return KEY_ROWS.map((cells, r) =>
    cells.map((value, c) => (r === row && c === column ? cell : value)),
  );
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

describe("WS5 D2 the key", () => {
  const base = keyProject();
  const baseKey = keyOfDiversity(base);

  test("a new load of the variants file, the same file included, changes the key", () => {
    const reloaded = withVariants(base, {
      fileId: "0123456789abcdef0123456789abcdef",
    });
    expect(keyOfDiversity(reloaded)).not.toBe(baseKey);
  });

  test("the ploidy or onlyPassed of a VCF changes the key", () => {
    const vcf = withVariants(base, {
      format: "vcf",
      readOptions: { ploidy: 2, onlyPassed: false },
    });
    const ploidy4 = withVariants(vcf, {
      readOptions: { ploidy: 4, onlyPassed: false },
    });
    const onlyPassed = withVariants(vcf, {
      readOptions: { ploidy: 2, onlyPassed: true },
    });
    expect(keyOfDiversity(ploidy4)).not.toBe(keyOfDiversity(vcf));
    expect(keyOfDiversity(onlyPassed)).not.toBe(keyOfDiversity(vcf));
  });

  test("the name of the variants file, or its read recorded, leaves the key the same", () => {
    const renamed = withVariants(base, { name: "other.nei" });
    const pending = withVariants(base, { read: { kind: "pending" } });
    const counted = withVariants(base, {
      read: {
        kind: "read",
        individuals: ["i1", "i2", "i3", "i4"],
        ploidy: 2,
        numVars: 1200,
      },
    });
    expect(keyOfDiversity(renamed)).toBe(baseKey);
    expect(keyOfDiversity(pending)).toBe(baseKey);
    expect(keyOfDiversity(counted)).toBe(baseKey);
  });

  test("the threshold of the missing data filter, or a filter added, removed or moved, changes the key", () => {
    const two = deepFreeze<Project>({
      ...base,
      filters: [
        { kind: "missing_data", maxAllowedMissingRate: 0.1 },
        { kind: "maf", maxAllowedMaf: 0.95 },
      ],
    });
    const changed = [
      deepFreeze<Project>({
        ...base,
        filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.05 }],
      }),
      two,
      deepFreeze<Project>({ ...base, filters: [] }),
      deepFreeze<Project>({ ...two, filters: two.filters.toReversed() }),
    ];
    const keys = [baseKey, ...changed.map((p) => keyOfDiversity(p))];
    expect(new Set(keys).size).toBe(5);
  });

  test("a filter of individuals changes the key", () => {
    const filtered = deepFreeze<Project>({
      ...base,
      individualFilters: [{ kind: "missing_data", maxAllowedMissingRate: 0.2 }],
    });
    expect(keyOfDiversity(filtered)).not.toBe(baseKey);
  });

  test("another column of the populations that groups the individuals otherwise changes the key", () => {
    expect(keyOfDiversity(keyProject(KEY_ROWS, "pop2"))).not.toBe(baseKey);
  });

  test("another column that makes the same populations with the same names leaves the key the same", () => {
    expect(keyOfDiversity(keyProject(KEY_ROWS, "popcopy"))).toBe(baseKey);
  });

  test("a cell of the column of the populations changes the key, one of an individual not in the variants file included", () => {
    const inVariants = keyProject(rowsWith(1, 1, "A"));
    const notInVariants = keyProject(rowsWith(4, 1, "D"));
    expect(keyOfDiversity(inVariants)).not.toBe(baseKey);
    expect(keyOfDiversity(notInVariants)).not.toBe(baseKey);
  });

  test("a cell of another column leaves the key the same", () => {
    expect(keyOfDiversity(keyProject(rowsWith(0, 2, "w")))).toBe(baseKey);
  });

  test("the rows of the file in another order change the key, since the order of the table follows them", () => {
    const [first, second, ...rest] = KEY_ROWS;
    if (first === undefined || second === undefined) {
      throw new Error("the rows of the test are more than two");
    }
    const swapped = keyProject([second, first, ...rest]);
    expect(keyOfDiversity(swapped)).not.toBe(baseKey);
  });

  test("the type of a column leaves the key the same", () => {
    const individuals = base.individuals;
    if (individuals?.read.kind !== "read") {
      throw new Error("the project of the test has an individuals file read");
    }
    const retyped = deepFreeze<Project>({
      ...base,
      individuals: {
        ...individuals,
        read: {
          ...individuals.read,
          columns: [
            { kind: "identifier" },
            { kind: "categorical" },
            { kind: "continuous" },
            { kind: "binary", one: "Y", zero: "X" },
            { kind: "categorical" },
          ],
        },
      },
    });
    expect(keyOfDiversity(retyped)).toBe(baseKey);
  });

  test("the same table from another file, or with other options of the CSV, leaves the key the same", () => {
    const individuals = base.individuals;
    if (individuals?.read.kind !== "read") {
      throw new Error("the project of the test has an individuals file read");
    }
    const otherFile = deepFreeze<Project>({
      ...base,
      individuals: {
        ...individuals,
        fileId: "fedcba9876543210fedcba9876543210",
        name: "populations.tsv",
        csv: { encoding: "windows-1252", separator: "\t", decimal: "," },
        read: {
          ...individuals.read,
          found: {
            encoding: "windows-1252",
            separator: "\t",
            decimal: ",",
            undecodedLine: null,
          },
        },
      },
    });
    expect(keyOfDiversity(otherFile)).toBe(baseKey);
  });

  test("minNumIndividuals or polyThreshold changes the key", () => {
    const withOptions = (options: {
      readonly minNumIndividuals: number;
      readonly polyThreshold: number;
    }): Project =>
      deepFreeze<Project>({
        ...base,
        analyses: [{ analysis: "diversity", options }],
      });
    const fewer = withOptions({ minNumIndividuals: 10, polyThreshold: 0.95 });
    const lower = withOptions({ minNumIndividuals: 20, polyThreshold: 0.9 });
    expect(keyOfDiversity(fewer)).not.toBe(baseKey);
    expect(keyOfDiversity(lower)).not.toBe(baseKey);
  });

  test("the options of another analysis, or the reference, leave the key the same", () => {
    const otherOptions = deepFreeze<Project>({
      ...base,
      analyses: [{ analysis: "pca", options: { numComponents: 10 } }],
    });
    const referenced = deepFreeze<Project>({
      ...base,
      reference: {
        variants: variantsOf(base),
        checks: [
          {
            analysis: "diversity",
            numbers: [1152, 0.35, 0.36, 0.93],
            keyVersion: 1,
            popneiVersion: "0.1.0",
            appVersion: "0.1.0",
            settings: "0".repeat(64),
          },
        ],
      },
    });
    expect(keyOfDiversity(otherOptions)).toBe(baseKey);
    expect(keyOfDiversity(referenced)).toBe(baseKey);
  });

  test("the key version, or the version of popnei, changes the key", () => {
    const raised: KeyedDef = { ...diversity, keyVersion: 2 };
    expect(keyOfDiversity(base, "0.1.0", raised)).not.toBe(baseKey);
    expect(keyOfDiversity(base, "0.2.0")).not.toBe(baseKey);
  });

  test("keyInputs of an empty project gives no populations and the defaults, without reading p.variants", () => {
    const p = withVariantsUnreadable(emptyProject("popgen"));
    expect(diversity.keyInputs(p)).toEqual({
      pops: null,
      options: DIVERSITY_DEFAULTS,
    });
  });

  test("keyInputs of a project whose reads are pending gives no populations and the defaults, without reading p.variants", () => {
    const individuals = base.individuals;
    if (individuals === null) {
      throw new Error("the project of the test has an individuals file");
    }
    const pending = withVariantsUnreadable(
      deepFreeze<Project>({
        ...withVariants(base, { read: { kind: "pending" } }),
        individuals: { ...individuals, read: { kind: "pending" } },
      }),
    );
    expect(diversity.keyInputs(pending)).toEqual({
      pops: null,
      options: DIVERSITY_DEFAULTS,
    });
  });
});

/** A project whose populations are `sizes.length` populations named
    `names`, each of `sizes[i]` individuals, all in the variants file. */
function projectOfSizes(
  names: readonly string[],
  sizes: readonly number[],
): Project {
  const individuals: string[] = [];
  const pops: string[] = [];
  names.forEach((name, i) => {
    for (const individual of individualsNamed(`${name}_`, sizes[i] ?? 0)) {
      individuals.push(individual);
      pops.push(name);
    }
  });
  return project({ table: tableOf(individuals, pops), individuals });
}

describe("WS5 D3 the rest of the module, after its review", () => {
  test("warnings of two populations with a value at fewer variants give their counts and shares", () => {
    const p = projectOfSizes(["p0a", "p0b"], [20, 20]);
    const r = result({
      pops: ["p0a", "p0b"],
      numIndividuals: [20, 20],
      numVarsWithValue: [641, 1100],
      numVars: 1152,
    });
    expect(diversity.warnings(r, p)).toEqual([
      {
        code: "variantsWithoutValue",
        text: "p0a and p0b have a value at 641 and 1,100 of the 1,152 variants kept (56% and 95%); at the others fewer than 20 of their individuals have a genotype.",
      },
    ]);
  });

  test("warnings of five populations with a value at fewer variants name two and how many more, with no counts", () => {
    const names = ["p0a", "p0b", "p0c", "p0d", "p0e"];
    const p = projectOfSizes(names, [20, 20, 20, 20, 20]);
    const r = result({
      pops: names,
      numIndividuals: [20, 20, 20, 20, 20],
      numVarsWithValue: [641, 1100, 10, 11, 12],
      numVars: 1152,
    });
    expect(diversity.warnings(r, p)).toEqual([
      {
        code: "variantsWithoutValue",
        text: "p0a, p0b and 3 more have a value at fewer than the 1,152 variants kept; at the others fewer than 20 of their individuals have a genotype.",
      },
    ]);
  });

  test("warnings of a population with a value at none of the variants kept says none", () => {
    const p = projectOfSizes(["p0a"], [20]);
    const r = result({
      pops: ["p0a"],
      numIndividuals: [20],
      numVarsWithValue: [0],
      numVars: 1152,
    });
    expect(diversity.warnings(r, p)).toEqual([
      {
        code: "variantsWithoutValue",
        text: "p0a has a value at none of the 1,152 variants kept: at each, fewer than 20 of its individuals have a genotype.",
      },
    ]);
  });

  test("warnings of a population with no value at the one variant kept says the one variant", () => {
    const p = projectOfSizes(["A"], [20]);
    const r = result({
      pops: ["A"],
      numIndividuals: [20],
      numVarsWithValue: [0],
      numVars: 1,
    });
    expect(diversity.warnings(r, p)).toEqual([
      {
        code: "variantsWithoutValue",
        text: "A has no value at the one variant kept: fewer than 20 of its individuals have a genotype there.",
      },
    ]);
  });

  test("warnings of two populations with no value at the one variant kept says the one variant", () => {
    const p = projectOfSizes(["A", "B"], [20, 20]);
    const r = result({
      pops: ["A", "B"],
      numIndividuals: [20, 20],
      numVarsWithValue: [0, 0],
      numVars: 1,
    });
    expect(diversity.warnings(r, p)).toEqual([
      {
        code: "variantsWithoutValue",
        text: "A and B have no value at the one variant kept: fewer than 20 of their individuals have a genotype there.",
      },
    ]);
  });

  test("warnings of one population of fewer than 20 individuals names it with its count", () => {
    const p = projectOfSizes(["p3"], [12]);
    const r = result({
      pops: ["p3"],
      numIndividuals: [12],
      numVarsWithValue: [0],
      numVars: 1152,
    });
    expect(diversity.warnings(r, p)).toEqual([
      {
        code: "tooFewIndividuals",
        text: "Population p3 has 12 individuals, and a variant has a value in a population only when at least 20 of its individuals have a called genotype there, so p3 has no values. To have them, merge it with another population in the metadata file.",
      },
    ]);
  });

  test("warnings of five individuals of the variants file with no population names two and how many more", () => {
    const names = ["s0", "s1", "s2", "s3", "s4", ...individualsNamed("p", 20)];
    const p = project({
      table: tableOf(names, [
        null,
        null,
        null,
        null,
        null,
        ...names.slice(5).map(() => "p0"),
      ]),
      individuals: names,
    });
    const r = result({ pops: ["p0"], numIndividuals: [20], numVars: 1152 });
    expect(diversity.warnings(r, p)).toEqual([
      {
        code: "individualsWithoutPopulation",
        text: "5 individuals of panel.nei have no population, and are left out of the diversity: s0, s1 and 3 more. If they belong to one, fill in their population in the metadata file and load it again.",
      },
    ]);
  });

  test("warnings escape the control characters of a population's name and cut it after 40 characters", () => {
    const long = "x".repeat(45);
    const p = project({
      table: tableOf(["i1", "i2"], [long, "p\n9"]),
      individuals: ["i1", "i2"],
    });
    const r = result({ pops: [long], numIndividuals: [1], numVars: 1152 });
    expect(diversity.warnings(r, p)).toEqual([
      {
        code: "tooFewIndividuals",
        text: `Population ${"x".repeat(40)}… has 1 individual, and a variant has a value in a population only when at least 20 of its individuals have a called genotype there, so ${"x".repeat(40)}… has no values. To have them, merge it with another population in the metadata file.`,
      },
      {
        code: "populationNotInResult",
        text: "Population p\\n9 has no individual among the individuals of panel.nei that the filters kept, so it is not in the table.",
      },
    ]);
  });

  test("populationsOf keeps populations named with whole numbers in the order of the file", () => {
    const p = project({
      table: tableOf(["i1", "i2", "i3", "i4"], ["3", "1", "2", "10"]),
    });
    expect(populationsOf(p)).toEqual([
      ["3", ["i1"]],
      ["1", ["i2"]],
      ["2", ["i3"]],
      ["10", ["i4"]],
    ]);
  });

  test("diversityRows and populationsToRun give back the same array each time", () => {
    expect(diversityRows(FLOW_RESULT)).toBe(diversityRows(FLOW_RESULT));
    const p = project();
    expect(populationsToRun(p)).toBe(populationsToRun(p));
    expect(populationsToRun(p)).toEqual([
      ["A", ["i1", "i3"]],
      ["B", ["i2"]],
    ]);
  });

  test("populationsToRun follows the individuals of a variants file changed in place, which it does not keep", () => {
    const individuals = ["i1", "i2", "i3", "i4"];
    const base = project();
    const p: Project = {
      ...base,
      variants: {
        ...variantsOf(base),
        read: { kind: "read", individuals, ploidy: 2, numVars: null },
      },
    };
    expect(populationsToRun(p)).toEqual([
      ["A", ["i1", "i3"]],
      ["B", ["i2"]],
    ]);
    individuals.splice(1, 1);
    expect(populationsToRun(p)).toEqual([["A", ["i1", "i3"]]]);
  });

  test("refusalText of a gzipped VCF cut short tells to correct or fetch the file", () => {
    const message =
      "the VCF was written by bgzip and does not end with the empty member of 28 bytes that marks the end of a bgzipped file, so the file is cut short and the variants after the cut are not in it; the file has to be fetched or copied again. bcftools says of the same file `no BGZF EOF marker; file may be truncated`";
    expect(
      refusalText(message, project({ variantsName: "panel.vcf.gz" })),
    ).toBe(
      `popnei could not read panel.vcf.gz: ${message}. Correct the file, or fetch it again, and load it in the Variants step.`,
    );
  });

  test("needs throws a defect on a project of association whose individuals file is read", () => {
    const p = deepFreeze<Project>({
      ...project(),
      app: "gwas",
      grouping: { kind: "roles", roles: [] },
    });
    expect(() => diversity.needs(p)).toThrow(/^popnei_web defect: /);
  });

  test("refusalText throws a defect on a project with no variants file", () => {
    const p = deepFreeze<Project>({ ...project(), variants: null });
    expect(() => refusalText("the pass gave no variant", p)).toThrow(
      /^popnei_web defect: /,
    );
  });
});

describe("WS5 D2 the key, after its review", () => {
  test("a cell of the column of the populations changed in place, in a table not frozen, changes the key", () => {
    const second: Cell[] = ["i2", "B", "y"];
    const base = project();
    const individuals = base.individuals;
    if (individuals?.read.kind !== "read") {
      throw new Error("the project of the test has an individuals file read");
    }
    const p: Project = {
      ...base,
      individuals: {
        ...individuals,
        read: {
          ...individuals.read,
          table: {
            columns: ["name", "pop", "other"],
            rows: [["i1", "A", "x"], second, ["i3", "A", "x"]],
          },
        },
      },
    };
    const before = keyOfDiversity(p);
    second[1] = "A";
    expect(keyOfDiversity(p)).not.toBe(before);
  });
});

describe("WS5 D1 the example and the reasons, with options set and reasons together", () => {
  test("options of 10 and 0.9 go into the request and the script, and a population of 15 is not too small", () => {
    const p = deepFreeze<Project>({
      ...projectOfSizes(["p0"], [15]),
      analyses: [
        {
          analysis: "diversity",
          options: { minNumIndividuals: 10, polyThreshold: 0.9 },
        },
      ],
    });
    const { client, jobs } = recordingClient();
    diversity.run(p, client);
    expect(
      jobs.map((job) => [job.minNumIndividuals, job.polyThreshold]),
    ).toEqual([[10, 0.9]]);
    expect(diversity.script(p)).toContain(
      "    variants, pops=pops, min_num_individuals=10, poly_threshold=0.9\n",
    );
    const r = result({ pops: ["p0"], numIndividuals: [15], numVars: 1152 });
    expect(diversity.warnings(r, p)).toEqual([]);
  });

  test("needs gives a reason of individualsNeeds before the column, whatever the filters of individuals", () => {
    const noFileNoColumn = deepFreeze<Project>({
      ...project({ column: null }),
      individuals: null,
    });
    expect(diversity.needs(noFileNoColumn)).toBe(
      "Load a metadata file in the Individuals step.",
    );
    const filteredToo = deepFreeze<Project>({
      ...noFileNoColumn,
      individualFilters: [{ kind: "remove", individuals: ["i4"] }],
    });
    expect(diversity.needs(filteredToo)).toBe(
      "Load a metadata file in the Individuals step.",
    );
    const missingAndNoColumn = project({
      column: null,
      individuals: ["i1", "i6"],
    });
    expect(diversity.needs(missingAndNoColumn)).toBe(
      "1 individual of panel.nei is not in pops.csv: i6. Add it to the file and load the file again in the Individuals step.",
    );
  });
});

describe("WS5 D2 the key, on one frozen table", () => {
  test("two columns of one frozen table that group the individuals otherwise give different keys", () => {
    const table = deepFreeze<IndividualsTable>({
      columns: ["name", "pop", "other", "pop2", "popcopy"],
      rows: KEY_ROWS,
    });
    const byPop = project({ table, column: "pop" });
    const byPop2 = project({ table, column: "pop2" });
    expect(keyOfDiversity(byPop)).not.toBe(keyOfDiversity(byPop2));
  });
});

describe("WS5 D3 the rest of the module, its words at their bounds", () => {
  test("warnings of two populations not in the result name both, in the plural", () => {
    const p = project({
      table: tableOf(["i1", "i2", "i3"], ["A", "C", "D"]),
      individuals: ["i1", "i2", "i3"],
    });
    const r = result({ pops: ["A"], numIndividuals: [20], numVars: 1152 });
    expect(diversity.warnings(r, p)).toEqual([
      {
        code: "populationNotInResult",
        text: "Populations C and D have no individual among the individuals of panel.nei that the filters kept, so they are not in the table.",
      },
    ]);
  });

  test("warnings of exactly three populations too small give their counts", () => {
    const p = projectOfSizes(["A", "B", "C"], [1, 2, 3]);
    const r = result({
      pops: ["A", "B", "C"],
      numIndividuals: [1, 2, 3],
      numVarsWithValue: [0, 0, 0],
      numVars: 1152,
    });
    expect(diversity.warnings(r, p)).toEqual([
      {
        code: "tooFewIndividuals",
        text: "Populations A, B and C have fewer than 20 individuals, 1, 2 and 3, and a variant has a value in a population only when at least 20 of its individuals have a called genotype there, so they have no values. To have them, merge each with another population in the metadata file.",
      },
    ]);
  });

  test("warnings of exactly three populations with a value at fewer variants give their counts and shares", () => {
    const p = projectOfSizes(["A", "B", "C"], [20, 20, 20]);
    const r = result({
      pops: ["A", "B", "C"],
      numIndividuals: [20, 20, 20],
      numVarsWithValue: [641, 1100, 576],
      numVars: 1152,
    });
    expect(diversity.warnings(r, p)).toEqual([
      {
        code: "variantsWithoutValue",
        text: "A, B and C have a value at 641, 1,100 and 576 of the 1,152 variants kept (56%, 95% and 50%); at the others fewer than 20 of their individuals have a genotype.",
      },
    ]);
  });

  test("warnings name no individual with no population who is not in the variants file", () => {
    const p = project({
      table: tableOf(["i1", "i9"], ["A", null]),
      individuals: ["i1"],
    });
    const r = result({ pops: ["A"], numIndividuals: [20], numVars: 1152 });
    expect(diversity.warnings(r, p)).toEqual([]);
  });

  test("diversityCsv quotes a population with a new line", () => {
    const r = result({ pops: ["a\nb"], numIndividuals: [3], numVars: 10 });
    expect(diversityCsv(r)).toBe(
      'population,individuals,expected_heterozygosity_unbiased,observed_heterozygosity,proportion_polymorphic\n"a\nb",3,,,\n',
    );
  });

  test("parseOptions refuses a polyThreshold of -0.1 or NaN, and options that are null, without throwing", () => {
    const expected =
      "the minimum of individuals, a whole number from 0 to 4,294,967,295, and the frequency below which a variant is polymorphic, a number from 0 to 1, and nothing else";
    for (const options of [
      { minNumIndividuals: 20, polyThreshold: -0.1 },
      { minNumIndividuals: 20, polyThreshold: NaN },
      null,
    ]) {
      expect(diversity.parseOptions(options, 1)).toEqual({
        ok: false,
        error: expected,
      });
    }
  });

  test("populationsOf follows a row changed in place in a frozen table whose rows are not frozen", () => {
    const second: Cell[] = ["i2", "B", "y"];
    const table: IndividualsTable = Object.freeze({
      columns: Object.freeze(["name", "pop", "other"]),
      rows: Object.freeze([["i1", "A", "x"], second]),
    });
    const base = project();
    const individuals = base.individuals;
    if (individuals?.read.kind !== "read") {
      throw new Error("the project of the test has an individuals file read");
    }
    const p: Project = {
      ...base,
      individuals: { ...individuals, read: { ...individuals.read, table } },
    };
    expect(populationsOf(p)).toEqual([
      ["A", ["i1"]],
      ["B", ["i2"]],
    ]);
    second[1] = "A";
    expect(populationsOf(p)).toEqual([["A", ["i1", "i2"]]]);
  });
});

describe("WS5 D3 the count of the check numbers", () => {
  test("1 + 3 x the populations run, as many as checkNumbers gives for them", () => {
    const p = project();
    expect(diversity.numCheckNumbers(p)).toBe(7);
    const r = result({
      pops: ["A", "B"],
      numIndividuals: [2, 1],
      numVarsWithValue: [0, 0],
      numVars: 1000,
    });
    expect(diversity.checkNumbers(r)).toHaveLength(7);
    expect(
      diversity.numCheckNumbers(
        project({ table: tableOf(["i1", "i2"], ["A", "A"]) }),
      ),
    ).toBe(4);
  });

  test("null with a threshold on the individuals, with no column of the populations, with no individuals file, and with the variants file not read", () => {
    const p = project();
    expect(
      diversity.numCheckNumbers(
        deepFreeze<Project>({
          ...p,
          individualFilters: [
            { kind: "missing_data", maxAllowedMissingRate: 0.2 },
          ],
        }),
      ),
    ).toBeNull();
    expect(diversity.numCheckNumbers(project({ column: null }))).toBeNull();
    expect(
      diversity.numCheckNumbers(withVariants(p, { read: { kind: "pending" } })),
    ).toBeNull();
    expect(
      diversity.numCheckNumbers(
        deepFreeze<Project>({ ...p, individuals: null }),
      ),
    ).toBeNull();
  });
});

describe("WS10 the cases of the spec", () => {
  test("the check numbers of the flow's result at 0.05 are those of the spec", () => {
    expect(diversity.checkNumbers(FLOW_RESULT)).toEqual([
      1152, 0.35267894847982756, 0.35667985874177544, 0.9288194444444444,
      0.3440824705971255, 0.3512406974637824, 0.9105902777777778,
      0.3498365468860467, 0.35603713961547323, 0.9157986111111112,
    ]);
  });

  test("the first column, the identifiers, chosen as the populations gives a population of one to each individual, a table with no values and one warning", () => {
    const p = project({ column: "name" });
    expect(populationsOf(p)).toEqual([
      ["i1", ["i1"]],
      ["i2", ["i2"]],
      ["i3", ["i3"]],
      ["i4", ["i4"]],
      ["i5", ["i5"]],
    ]);
    const { client, jobs } = recordingClient();
    diversity.run(p, client);
    expect(jobs.map((j) => j.pops)).toEqual([
      [
        ["i1", ["i1"]],
        ["i2", ["i2"]],
        ["i3", ["i3"]],
        ["i4", ["i4"]],
      ],
    ]);
    const r = result({
      pops: ["i1", "i2", "i3", "i4"],
      numIndividuals: [1, 1, 1, 1],
      numVarsWithValue: [0, 0, 0, 0],
      numVars: 1000,
    });
    expect(diversity.warnings(r, p).map((w) => w.code)).toEqual([
      "tooFewIndividuals",
    ]);
  });
});

/** A client that records the jobs of the diversity it is given, bound to
    the individuals kept `individuals`. */
function keptClient(individuals: readonly string[] | null): {
  readonly client: WorkerClient<Job, JobResult>;
  readonly jobs: DiversityJob[];
} {
  const { client, jobs } = recordingClient();
  return { client: { ...client, individuals }, jobs };
}

/** The project of the worked example with the filters of individuals
    `filters`. */
function filteredProject(filters: Project["individualFilters"]): Project {
  return deepFreeze<Project>({ ...project(), individualFilters: filters });
}

describe("VS3 D3 the diversity of stage 3", () => {
  test("with the individuals kept i1 and i2, run sends them and the populations narrowed to them", () => {
    const { client, jobs } = keptClient(["i1", "i2"]);
    diversity.run(project(), client);
    expect(jobs.map((job) => [job.individuals, job.pops])).toEqual([
      [
        ["i1", "i2"],
        [
          ["A", ["i1"]],
          ["B", ["i2"]],
        ],
      ],
    ]);
  });

  test("with the individuals kept i1 and i3, run sends A alone, and populationsKept gives B as emptied", () => {
    const { client, jobs } = keptClient(["i1", "i3"]);
    const p = project();
    diversity.run(p, client);
    expect(jobs.map((job) => [job.individuals, job.pops])).toEqual([
      [["i1", "i3"], [["A", ["i1", "i3"]]]],
    ]);
    expect(populationsKept(p, ["i1", "i3"])).toEqual({
      pops: [["A", ["i1", "i3"]]],
      emptied: ["B"],
    });
  });

  test("with no individual removed, null, run sends the populations of the worked example and individuals null", () => {
    const { client, jobs } = keptClient(null);
    diversity.run(project(), client);
    expect(jobs.map((job) => [job.individuals, job.pops])).toEqual([
      [
        null,
        [
          ["A", ["i1", "i3"]],
          ["B", ["i2"]],
        ],
      ],
    ]);
  });

  test("a result of A alone adds populationNotInResult naming B", () => {
    const aAlone = result({
      pops: ["A"],
      numIndividuals: [2],
      numVarsWithValue: [0],
      numVars: 1000,
    });
    const found = diversity.warnings(
      aAlone,
      filteredProject([{ kind: "missing_data", maxAllowedMissingRate: 0.2 }]),
    );
    expect(found.map((w) => w.code)).toEqual([
      "tooFewIndividuals",
      "individualsWithoutPopulation",
      "populationNotInResult",
    ]);
    expect(found.at(-1)).toEqual({
      code: "populationNotInResult",
      text: "Population B has no individual among the individuals of panel.nei that the filters kept, so it is not in the table.",
    });
  });

  test("a result of A with 1 individual, where populationsToRun gives it 2, ends tooFewIndividuals with the filters of individuals", () => {
    const r = result({
      pops: ["A"],
      numIndividuals: [1],
      numVarsWithValue: [0],
      numVars: 1000,
    });
    expect(diversity.warnings(r, project()).at(0)).toEqual({
      code: "tooFewIndividuals",
      text: "Population A has 1 individual, and a variant has a value in a population only when at least 20 of its individuals have a called genotype there, so A has no values. To have them, merge it with another population in the metadata file, or loosen the filters of individuals in the Variants step.",
    });
    const both = result({
      pops: ["A", "B"],
      numIndividuals: [1, 1],
      numVarsWithValue: [0, 0],
      numVars: 1000,
    });
    expect(diversity.warnings(both, project()).at(0)).toEqual({
      code: "tooFewIndividuals",
      text: "Populations A and B have fewer than 20 individuals, 1 and 1, and a variant has a value in a population only when at least 20 of its individuals have a called genotype there, so they have no values. To have them, merge each with another population in the metadata file, or loosen the filters of individuals in the Variants step.",
    });
  });

  test("numCheckNumbers with a list to remove i2 is 4, for the one population left", () => {
    expect(
      diversity.numCheckNumbers(
        filteredProject([{ kind: "remove", individuals: ["i2"] }]),
      ),
    ).toBe(4);
    expect(
      diversity.numCheckNumbers(
        filteredProject([{ kind: "keep", individuals: ["i1", "i2"] }]),
      ),
    ).toBe(7);
  });

  test("numCheckNumbers with a threshold on the individuals is null, on the heterozygosity or after a list", () => {
    expect(
      diversity.numCheckNumbers(
        filteredProject([{ kind: "obs_het", maxAllowedObsHet: 0.4 }]),
      ),
    ).toBeNull();
    expect(
      diversity.numCheckNumbers(
        filteredProject([
          { kind: "remove", individuals: ["i2"] },
          { kind: "missing_data", maxAllowedMissingRate: 0.2 },
        ]),
      ),
    ).toBeNull();
  });

  test("needs of a list to keep i4, who has no population, gives the reason of the lists, with a threshold after it too; of lists that leave one, or of thresholds alone, none", () => {
    const reason =
      "The lists of individuals to keep and to remove leave none of the individuals of panel.nei that have a population in pop, so no population is left. Change the lists in the Variants step.";
    expect(
      diversity.needs(filteredProject([{ kind: "keep", individuals: ["i4"] }])),
    ).toBe(reason);
    expect(
      diversity.needs(
        filteredProject([
          { kind: "keep", individuals: ["i4", "i2"] },
          { kind: "remove", individuals: ["i1"] },
        ]),
      ),
    ).toBeNull();
    expect(
      diversity.needs(
        filteredProject([
          { kind: "missing_data", maxAllowedMissingRate: 0.2 },
          { kind: "obs_het", maxAllowedObsHet: 0.4 },
        ]),
      ),
    ).toBeNull();
    expect(
      diversity.needs(
        filteredProject([
          { kind: "keep", individuals: ["i1", "i2", "i3"] },
          { kind: "remove", individuals: ["i1", "i2", "i3"] },
        ]),
      ),
    ).toBe(reason);
    // A threshold after the list does not hide the reason of the lists,
    // which is known before the statistics are.
    expect(
      diversity.needs(
        filteredProject([
          { kind: "keep", individuals: ["i4"] },
          { kind: "missing_data", maxAllowedMissingRate: 0.2 },
        ]),
      ),
    ).toBe(reason);
  });

  test("a population of the metadata with more individuals than it has in the variants file, and no filter of individuals, is too small with no advice to loosen the filters", () => {
    // A is i1 and i3 in the metadata, and the variants file holds i1 alone.
    const r = result({
      pops: ["A", "B"],
      numIndividuals: [1, 1],
      numVarsWithValue: [0, 0],
      numVars: 1000,
    });
    expect(
      diversity.warnings(r, project({ individuals: ["i1", "i2"] })).at(0),
    ).toEqual({
      code: "tooFewIndividuals",
      text: "Populations A and B have fewer than 20 individuals, 1 and 1, and a variant has a value in a population only when at least 20 of its individuals have a called genotype there, so they have no values. To have them, merge each with another population in the metadata file.",
    });
  });

  test("the words of the statistics that failed, refused for the empty pass of the missing data filter at 0.05 and the MAF filter at 0.4, are the statistics' and not the diversity's", () => {
    const message =
      "the pass gave no variant: its source gave 1200 and the steps kept none of them, the `missing_data` filter was given 1200 and kept 1152, the `maf` filter was given 1152 and kept 0; a statistic of a pass is calculated over the variants it gives";
    expect(
      statisticsFailedText({ kind: "refused", message }, project(), () => {
        throw new Error("a refusal was given the words of a failure");
      }),
    ).toBe(
      "The statistics of each individual, which the thresholds of the filters of individuals are applied to, could not be calculated, so the diversity was not run. The filters kept none of the variants of panel.nei, so there is no variant to count each individual's genotypes over. Loosen the filters of the variants in the Variants step.",
    );
  });

  test("popnei's refusal with no population tells to loosen the thresholds", () => {
    expect(
      refusalText(
        "`pops` names no population, and a result holds one value for each population: leave `pops` out for one population of every individual",
        project(),
      ),
    ).toBe(
      "The thresholds of the filters of individuals leave none of the individuals of panel.nei that have a population in pop, so no population is left. Loosen the thresholds in the Variants step.",
    );
  });
});

describe("VS3 D3 the diversity of stage 3, at its bounds", () => {
  test("the words of the statistics that failed otherwise are those the frame gives the failure", () => {
    const failure = { kind: "workerFailed", message: "a trap" } as const;
    const given: unknown[] = [];
    expect(
      statisticsFailedText(
        { kind: "failed", error: failure },
        project(),
        (error) => {
          given.push(error);
          return "The calculation stopped unexpectedly.";
        },
      ),
    ).toBe(
      "The statistics of each individual, which the thresholds of the filters of individuals are applied to, could not be calculated, so the diversity was not run. The calculation stopped unexpectedly.",
    );
    expect(given).toEqual([failure]);
  });

  test("with thresholds that leave no population, run sends no population, for popnei to refuse", () => {
    const { client, jobs } = keptClient(["i4"]);
    diversity.run(project(), client);
    expect(jobs.map((job) => [job.individuals, job.pops])).toEqual([
      [["i4"], []],
    ]);
    expect(populationsKept(project(), ["i4"])?.emptied).toEqual(["A", "B"]);
  });

  test("populationsKept gives the same value for the same frozen list, the populations to run whole for null, and null with no populations to run", () => {
    const p = project();
    const kept = Object.freeze(["i1", "i2"]);
    expect(populationsKept(p, kept)).toBe(populationsKept(p, kept));
    expect(populationsKept(p, null)).toBe(populationsKept(p, null));
    expect(populationsKept(p, null)).toEqual({
      pops: populationsToRun(p),
      emptied: [],
    });
    expect(populationsKept(project({ column: null }), kept)).toBeNull();
  });

  test("populationsKept follows a list changed in place, which it does not keep", () => {
    const p = project();
    const kept = ["i1", "i2"];
    expect(populationsKept(p, kept)?.emptied).toEqual([]);
    kept.pop();
    expect(populationsKept(p, kept)?.emptied).toEqual(["B"]);
  });

  test("the reason of the lists names the file escaped, and a list popnei would refuse is left to the store", () => {
    const p = deepFreeze<Project>({
      ...project({ variantsName: "a\tb.nei" }),
      individualFilters: [{ kind: "remove", individuals: ["i1", "i2", "i3"] }],
    });
    expect(diversity.needs(p)).toBe(
      "The lists of individuals to keep and to remove leave none of the individuals of a\\tb.nei that have a population in pop, so no population is left. Change the lists in the Variants step.",
    );
    expect(
      diversity.needs(filteredProject([{ kind: "keep", individuals: ["i9"] }])),
    ).toBeNull();
  });
});
