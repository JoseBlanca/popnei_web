import { describe, expect, test } from "vitest";
import {
  DIVERSITY_DEFAULTS,
  defaultDrawOf,
  diversity,
  diversityCsv,
  diversityOptions,
  diversityRows,
  drawOf,
  refusalText,
  statisticsFailedText,
} from "./diversity.ts";
import { POPGEN_ANALYSES, countsOf, individualStatsOf } from "../apps.ts";
import type { IndividualsKept } from "../individualsKept.ts";
import { createKeyMemo, keyOf } from "../keys.ts";
import type { Key, KeyedDef } from "../keys.ts";
import {
  emptyProject,
  individualsNeeds,
  loadIndividuals,
  loadVariants,
  populationsKept,
  populationsNeeds,
  populationsOf,
  populationsToRun,
  removeIndividuals,
  setGrouping,
} from "../project.ts";
import { populationsKeptNeeds } from "../populations.ts";
import type { Project, VariantSource } from "../project.ts";
import { spectrumWarnings } from "./sfs.ts";
import { createStore } from "../store.ts";
import type { AnalysisStatus, Warning, WorkerClient } from "../store.ts";
import { deepFreeze, noPopDiversity, withPassedOn } from "../testSupport.ts";
import type {
  Cell,
  DiversityJob,
  DiversityResult,
  IndividualsTable,
  Job,
  JobResult,
  Outcome,
  Run,
} from "../../worker/protocol.ts";

/** What the options should be, the words of `parseOptions` for any
    options it refuses. */
const OPTIONS_EXPECTED =
  "the minimum of individuals, a whole number from 0 to 4,294,967,295, the frequency below which a variant is polymorphic, a number from 0 to 1, and the chromosomes of the rarefaction, null or a whole number from 2 to 4,294,967,295, and nothing else";

/** The options the key holds for the defaults: the default draw is left
    out of the key, since the load and the minimum fix it. */
const KEY_OPTIONS = { minNumIndividuals: 20, polyThreshold: 0.95 };

/** The `keptNeeds` of the diversity, which it has. */
function keptNeeds(p: Project, kept: IndividualsKept): string | null {
  if (diversity.keptNeeds === undefined) {
    throw new Error("the diversity has a keptNeeds");
  }
  return diversity.keptNeeds(p, kept);
}

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
        keepsPassed: false,
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

/** The project of `project()` with its variants file a VCF named `name`,
    read with ploidy 2 and `onlyPassed`. */
function vcfProject(name: string, onlyPassed: boolean): Project {
  return withVariants(project({ variantsName: name }), {
    format: "vcf",
    readOptions: { ploidy: 2, onlyPassed },
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

/** A result of the diversity; the arrays are made from the lists. Each
    population reaches the draw at every variant it has a value at. */
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
  const withValue =
    fields.numVarsWithValue ?? fields.pops.map(() => fields.numVars);
  return {
    analysis: "diversity",
    pops: fields.pops,
    numIndividuals: Uint32Array.from(fields.numIndividuals),
    unbiasedExpHet: Float64Array.from(fields.unbiasedExpHet ?? nan),
    obsHet: Float64Array.from(fields.obsHet ?? nan),
    polyRatio: Float64Array.from(fields.polyRatio ?? nan),
    numVarsWithValue: Uint32Array.from(withValue),
    ...noPopDiversity(fields.pops.length),
    numVarsInDraw: Uint32Array.from(withValue),
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

/** `privateAllelesNeedTwoPopulations` of stage 5 for a column whose one
    population of `min` individuals or more is `pop`, which a result with
    one such population also gives. */
function needTwo(pop: string, min = 20): Warning {
  return {
    code: "privateAllelesNeedTwoPopulations",
    text: `Only ${pop} has ${String(min)} individuals or more, and private alleles are counted among such populations, so the table has none: an allele is private when one population has it and no other does.`,
  };
}

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
        numCalledAlleles: 40,
        popDiversityPops: [],
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
        text: "Populations A and B have fewer than 20 individuals, 2 and 1, and a variant has a value in a population only when at least 20 of its individuals have a called genotype there, so they have no values. To have them, merge each with another population in the metadata file, or lower the minimum number of individuals in the options of the diversity.",
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
      options: KEY_OPTIONS,
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
    expect(diversity.needs(noFile)).toBeNull();
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
      "Choose the column that defines the populations, or all individuals in one population, in the Individuals step.",
    );
  });

  test("needs says the table has no column of the name chosen", () => {
    expect(diversity.needs(project({ column: "popcat" }))).toBe(
      "pops.csv has no column popcat, from which the populations were taken. Choose the column that defines the populations, or all individuals in one population, in the Individuals step.",
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
      inStep:
        "Choose the column that defines the populations, or all individuals in one population.",
    });
  });

  test("populationsNeeds gives the kind noSuchColumn with the words of needs", () => {
    const p = project({ column: "popcat" });
    expect(populationsNeeds(p)).toEqual({
      kind: "noSuchColumn",
      reason:
        "pops.csv has no column popcat, from which the populations were taken. Choose the column that defines the populations, or all individuals in one population, in the Individuals step.",
      inStep:
        "pops.csv has no column popcat, from which the populations were taken. Choose the column that defines the populations, or all individuals in one population.",
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
      inStep:
        "No individual of panel.nei has a population in the column pop of pops.csv. Fill in the column and load the file again, or choose another column.",
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
      needTwo("p0a"),
    ]);
  });

  test("warnings of 1,151 of 1,152 variants writes 99%, not 100%", () => {
    const { p, r } = p0a(1151);
    expect(diversity.warnings(r, p)).toEqual([
      {
        code: "variantsWithoutValue",
        text: "p0a has a value at 1,151 of the 1,152 variants kept (99%); at the others fewer than 20 of its individuals have a genotype.",
      },
      needTwo("p0a"),
    ]);
  });

  test("warnings of 1 of 1,152 variants writes 1%, not 0%", () => {
    const { p, r } = p0a(1);
    expect(diversity.warnings(r, p)).toEqual([
      {
        code: "variantsWithoutValue",
        text: "p0a has a value at 1 of the 1,152 variants kept (1%); at the others fewer than 20 of its individuals have a genotype.",
      },
      needTwo("p0a"),
    ]);
  });

  test("warnings of a population with a value at every variant kept is none", () => {
    const { p, r } = p0a(1152);
    expect(diversity.warnings(r, p)).toEqual([needTwo("p0a")]);
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
        text: "Populations P1, P2 and 2 more have fewer than 20 individuals, and a variant has a value in a population only when at least 20 of its individuals have a called genotype there, so they have no values. To have them, merge each with another population in the metadata file, or lower the minimum number of individuals in the options of the diversity.",
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
per_var = popnei.calc_per_var_distribs(
    variants, pops=pops, min_num_individuals=20, poly_threshold=0.95
)
table = pandas.DataFrame({
    "individuals": {pop: len(names) for pop, names in pops.items()},
    "expected_heterozygosity_unbiased": per_var.unbiased_exp_het.mean,
    "observed_heterozygosity": per_var.obs_het.mean,
    "proportion_polymorphic": per_var.poly_vars_ratio.poly_ratio,
})
# A population of fewer than 20 individuals has a value at no variant; it
# is left out here, where it would take every variant out of the private
# alleles of the others. A private allele needs two populations.
large = {pop: names for pop, names in pops.items() if len(names) >= 20}
if large:
    stats = [
        popnei.PopDiversityStat.NUM_ALLELES,
        popnei.PopDiversityStat.FIS,
        popnei.PopDiversityStat.FOLDED_SFS,
    ]
    if len(large) > 1:
        stats.append(popnei.PopDiversityStat.PRIVATE_ALLELES)
    diversity = popnei.calc_pop_diversity(
        variants, large, stats=stats, num_called_alleles=40, min_num_individuals=20
    )
    table["f"] = diversity.fis
    table["alleles_per_variant"] = diversity.num_alleles["mean"]
    table["alleles_per_variant_rarefied"] = diversity.num_alleles["in_draw"]
    if diversity.private_alleles is not None:
        table["private_alleles"] = diversity.private_alleles["total"]
        table["private_alleles_per_variant"] = diversity.private_alleles["mean"]
        table["private_alleles_per_variant_rarefied"] = diversity.private_alleles["in_draw"]
    # The folded site frequency spectrum of each population, in a draw of
    # 40 chromosomes: the expected number of variants with each count of the
    # rarer allele, and the share of each count among the variants that show
    # both alleles in the draw
    spectrum = diversity.folded_sfs
    print(spectrum.to_string())
    both_alleles = spectrum.iloc[1:]
    print((both_alleles / both_alleles.sum()).to_string())
print(table.to_string())
`,
    );
  });

  test("diversityCsv of the result of the flow gives the text of the spec", () => {
    expect(diversityCsv(FLOW_RESULT)).toBe(
      `population,individuals,expected_heterozygosity_unbiased,observed_heterozygosity,proportion_polymorphic,f,alleles_per_variant,alleles_per_variant_rarefied,private_alleles,private_alleles_per_variant,private_alleles_per_variant_rarefied
p0,48,0.35267894847982756,0.35667985874177544,0.9288194444444444,,,,,,
p2,84,0.3440824705971255,0.3512406974637824,0.9105902777777778,,,,,,
p1,68,0.3498365468860467,0.35603713961547323,0.9157986111111112,,,,,,
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
      `population,individuals,expected_heterozygosity_unbiased,observed_heterozygosity,proportion_polymorphic,f,alleles_per_variant,alleles_per_variant_rarefied,private_alleles,private_alleles_per_variant,private_alleles_per_variant_rarefied
"a,""b""",3,,,,,,,,,
`,
    );
  });

  test("PA10 diversityCsv writes a population named =SUM(A1) with a quote before it", () => {
    const r = result({
      pops: ["=SUM(A1)"],
      numIndividuals: [3],
      numVars: 10,
    });
    expect(diversityCsv(r).split("\n")[1]).toBe("'=SUM(A1),3,,,,,,,,,");
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
        "line 5 of the VCF, the column of t00: its genotype is of the ploidy 4 and the variants are read with the ploidy 2; popnei does not read a VCF whose genotypes are of different ploidies",
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

  test("refusalText of another message with words between backquotes gives popnei's message without them", () => {
    expect(
      refusalText(
        "`minNumIndividuals` is 0, and `calcDiversity` needs one at least.",
        project(),
      ),
    ).toBe(
      "popnei could not calculate the diversity: minNumIndividuals is 0, and calcDiversity needs one at least. Change the settings, or load the variants file again, to run it again.",
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

/** `p` with its variants file changed by `change`; a VCF read records
    the FILTER of its variants, `keepsPassed` true, as every VCF's does. */
function withVariants(p: Project, change: Partial<VariantSource>): Project {
  const variants = { ...variantsOf(p), ...change };
  return deepFreeze<Project>({
    ...p,
    variants:
      variants.format === "vcf" && variants.read.kind === "read"
        ? { ...variants, read: { ...variants.read, keepsPassed: true } }
        : variants,
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
        keepsPassed: false,
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

  test("a filter of individuals removed, a name of its list changed, or its threshold moved to one that keeps the same individuals, changes the key", () => {
    const filtered = deepFreeze<Project>({
      ...base,
      individualFilters: [
        { kind: "remove", individuals: ["ind_900"] },
        { kind: "missing_data", maxAllowedMissingRate: 0.2 },
      ],
    });
    const changed = [
      deepFreeze<Project>({
        ...base,
        individualFilters: [{ kind: "remove", individuals: ["ind_900"] }],
      }),
      deepFreeze<Project>({
        ...base,
        individualFilters: [
          { kind: "remove", individuals: ["ind_901"] },
          { kind: "missing_data", maxAllowedMissingRate: 0.2 },
        ],
      }),
      // No individual of the table is named ind_900 or has statistics,
      // so each threshold keeps the same individuals.
      deepFreeze<Project>({
        ...base,
        individualFilters: [
          { kind: "remove", individuals: ["ind_900"] },
          { kind: "missing_data", maxAllowedMissingRate: 0.25 },
        ],
      }),
    ];
    const keys = [filtered, ...changed].map((p) => keyOfDiversity(p));
    expect(new Set(keys).size).toBe(4);
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
        typesSet: [],
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
      readonly numCalledAlleles: null;
    }): Project =>
      deepFreeze<Project>({
        ...base,
        analyses: [{ analysis: "diversity", options }],
      });
    const fewer = withOptions({
      minNumIndividuals: 10,
      polyThreshold: 0.95,
      numCalledAlleles: null,
    });
    const lower = withOptions({
      minNumIndividuals: 20,
      polyThreshold: 0.9,
      numCalledAlleles: null,
    });
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
            settings: {
              passedKept: "0".repeat(64),
              passedNotKept: "0".repeat(64),
            },
          },
        ],
      },
    });
    expect(keyOfDiversity(otherOptions)).toBe(baseKey);
    expect(keyOfDiversity(referenced)).toBe(baseKey);
  });

  test("the key version, 3, or the version of popnei, changes the key", () => {
    expect(diversity.keyVersion).toBe(3);
    const earlier: KeyedDef = { ...diversity, keyVersion: 2 };
    expect(keyOfDiversity(base, "0.1.0", earlier)).not.toBe(baseKey);
    expect(keyOfDiversity(base, "0.2.0")).not.toBe(baseKey);
  });

  test("keyInputs of an empty project gives the one population and the defaults, without reading p.variants", () => {
    const p = withVariantsUnreadable(emptyProject("popgen"));
    expect(diversity.keyInputs(p)).toEqual({
      pops: "all",
      options: KEY_OPTIONS,
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
      options: KEY_OPTIONS,
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
      needTwo("p0a"),
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
      needTwo("A"),
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
        text: "Population p3 has 12 individuals, and a variant has a value in a population only when at least 20 of its individuals have a called genotype there, so p3 has no values. To have them, merge it with another population in the metadata file, or lower the minimum number of individuals in the options of the diversity.",
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
      needTwo("p0"),
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
        text: `Population ${"x".repeat(40)}… has 1 individual, and a variant has a value in a population only when at least 20 of its individuals have a called genotype there, so ${"x".repeat(40)}… has no values. To have them, merge it with another population in the metadata file, or lower the minimum number of individuals in the options of the diversity.`,
      },
      {
        code: "populationNotInResult",
        text: "Population p\\n9 has no individual among the individuals of panel.nei that the filters kept, so it is not in the table.",
      },
    ]);
  });

  test("diversityRows gives back the same array each time", () => {
    expect(diversityRows(FLOW_RESULT)).toBe(diversityRows(FLOW_RESULT));
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
          options: {
            minNumIndividuals: 10,
            polyThreshold: 0.9,
            numCalledAlleles: null,
          },
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
    expect(diversity.warnings(r, p)).toEqual([needTwo("p0", 10)]);
  });

  test("needs gives a reason of individualsNeeds before the column, whatever the filters of individuals", () => {
    const noColumn = project({ column: null });
    if (noColumn.individuals === null) {
      throw new Error("the project of the test has an individuals file");
    }
    const readingNoColumn = deepFreeze<Project>({
      ...noColumn,
      individuals: { ...noColumn.individuals, read: { kind: "pending" } },
    });
    expect(diversity.needs(readingNoColumn)).toBe("Reading pops.csv.");
    const filteredToo = deepFreeze<Project>({
      ...readingNoColumn,
      individualFilters: [{ kind: "remove", individuals: ["i4"] }],
    });
    expect(diversity.needs(filteredToo)).toBe("Reading pops.csv.");
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
      needTwo("A"),
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
        text: "Populations A, B and C have fewer than 20 individuals, 1, 2 and 3, and a variant has a value in a population only when at least 20 of its individuals have a called genotype there, so they have no values. To have them, merge each with another population in the metadata file, or lower the minimum number of individuals in the options of the diversity.",
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
    expect(diversity.warnings(r, p)).toEqual([needTwo("A")]);
  });

  test("diversityCsv quotes a population with a new line", () => {
    const r = result({ pops: ["a\nb"], numIndividuals: [3], numVars: 10 });
    expect(diversityCsv(r)).toBe(
      'population,individuals,expected_heterozygosity_unbiased,observed_heterozygosity,proportion_polymorphic,f,alleles_per_variant,alleles_per_variant_rarefied,private_alleles,private_alleles_per_variant,private_alleles_per_variant_rarefied\n"a\nb",3,,,,,,,,,\n',
    );
  });

  test("parseOptions refuses a polyThreshold of -0.1 or NaN, and options that are null, without throwing", () => {
    for (const options of [
      { minNumIndividuals: 20, polyThreshold: -0.1, numCalledAlleles: null },
      { minNumIndividuals: 20, polyThreshold: NaN, numCalledAlleles: null },
      null,
    ]) {
      expect(diversity.parseOptions(options, 1)).toEqual({
        ok: false,
        error: OPTIONS_EXPECTED,
      });
    }
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

  test("null with a threshold on the individuals, with no column of the populations, and with the variants file not read; 4 with no individuals file", () => {
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
    ).toBe(4);
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

  test("the first column, the identifiers, chosen as the populations is no column of the populations, and locks the diversity with the reason of a column not in the file", () => {
    const p = project({ column: "name" });
    expect(populationsOf(p)).toBeNull();
    const reason =
      "pops.csv has no column name, from which the populations were taken. Choose the column that defines the populations, or all individuals in one population, in the Individuals step.";
    expect(populationsNeeds(p)?.kind).toBe("noSuchColumn");
    expect(diversity.needs(p)).toBe(reason);
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
      text: "Population A has 1 individual, and a variant has a value in a population only when at least 20 of its individuals have a called genotype there, so A has no values. To have them, merge it with another population in the metadata file, or lower the minimum number of individuals in the options of the diversity, or loosen the filters of individuals in the Variants step.",
    });
    const both = result({
      pops: ["A", "B"],
      numIndividuals: [1, 1],
      numVarsWithValue: [0, 0],
      numVars: 1000,
    });
    expect(diversity.warnings(both, project()).at(0)).toEqual({
      code: "tooFewIndividuals",
      text: "Populations A and B have fewer than 20 individuals, 1 and 1, and a variant has a value in a population only when at least 20 of its individuals have a called genotype there, so they have no values. To have them, merge each with another population in the metadata file, or lower the minimum number of individuals in the options of the diversity, or loosen the filters of individuals in the Variants step.",
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
      text: "Populations A and B have fewer than 20 individuals, 1 and 1, and a variant has a value in a population only when at least 20 of its individuals have a called genotype there, so they have no values. To have them, merge each with another population in the metadata file, or lower the minimum number of individuals in the options of the diversity.",
    });
  });

  test("the words of the statistics that failed, refused for the empty pass of the missing data filter at 0.05 and the MAF filter at 0.4, are the statistics' words of any other refusal and not the diversity's", () => {
    const message =
      "the pass gave no variant: its source gave 1200 and the steps kept none of them, the `missing_data` filter was given 1200 and kept 1152, the `maf` filter was given 1152 and kept 0; a statistic of a pass is calculated over the variants it gives";
    expect(
      statisticsFailedText(
        { kind: "refused", message },
        project(),
        () => {
          throw new Error("a refusal was given the words of a failure");
        },
        true,
      ),
    ).toBe(
      "The statistics of each individual, which the thresholds of the individuals need, could not be calculated, so the diversity was not run. popnei could not calculate the statistics of each individual: the pass gave no variant: its source gave 1200 and the steps kept none of them, the missing_data filter was given 1200 and kept 1152, the maf filter was given 1152 and kept 0; a statistic of a pass is calculated over the variants it gives. Change the settings, or load the variants file again, to calculate them again.",
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
        true,
      ),
    ).toBe(
      "The statistics of each individual, which the thresholds of the individuals need, could not be calculated, so the diversity was not run. The calculation stopped unexpectedly.",
    );
    expect(given).toEqual([failure]);
  });

  test("the words of the statistics that failed when the diversity's own Run did not wait for them say it cannot run (stop C 4)", () => {
    const failure = { kind: "workerFailed", message: "a trap" } as const;
    expect(
      statisticsFailedText(
        { kind: "failed", error: failure },
        project(),
        () => "The calculation stopped unexpectedly.",
        false,
      ),
    ).toBe(
      "The statistics of each individual, which the thresholds of the individuals need, could not be calculated, so the diversity cannot run. The calculation stopped unexpectedly.",
    );
  });

  test("with thresholds that leave no population, run sends no population, for popnei to refuse", () => {
    const { client, jobs } = keptClient(["i4"]);
    diversity.run(project(), client);
    expect(jobs.map((job) => [job.individuals, job.pops])).toEqual([
      [["i4"], []],
    ]);
    expect(populationsKept(project(), ["i4"])?.emptied).toEqual(["A", "B"]);
  });
});

describe("PA1 D1 the diversity locks with the shared functions of the populations", () => {
  test("needs gives the reason of the lists, that of populationListsNeeds, and keptNeeds that of populationsKeptNeeds", () => {
    const p = filteredProject([{ kind: "keep", individuals: ["i4"] }]);
    expect(diversity.needs(p)).toBe(
      "The lists of individuals to keep and to remove leave none of the individuals of panel.nei that have a population in pop, so no population is left. Change the lists in the Variants step.",
    );
    const kept: IndividualsKept = {
      list: { kind: "known", individuals: ["i4"] },
      byLists: ["i1", "i2", "i3", "i4"],
      counts: [],
    };
    const reason = populationsKeptNeeds(project(), kept);
    expect(reason).not.toBeNull();
    expect(keptNeeds(project(), kept)).toBe(reason);
  });
});

describe("IP3 D1 the filters of the job of the diversity", () => {
  test("run sends the filters of the project, the same array, the LD filter with its distance", () => {
    const p = deepFreeze<Project>({
      ...project(),
      filters: [
        { kind: "missing_data", maxAllowedMissingRate: 0.1 },
        { kind: "ld", maxAllowedR2: 0.3, maxDist: 50000 },
      ],
    });
    const { client, jobs } = recordingClient();
    diversity.run(p, client);
    expect(jobs[0]?.filters).toBe(p.filters);
  });

  test("run of a project whose LD filter has no distance is a defect, and sends nothing", () => {
    const p = deepFreeze<Project>({
      ...project(),
      filters: [{ kind: "ld", maxAllowedR2: 0.3, maxDist: null }],
    });
    const { client, jobs } = recordingClient();
    expect(() => diversity.run(p, client)).toThrow(/^popnei_web defect: /);
    expect(jobs).toStrictEqual([]);
  });
});

/** The project of the worked example with no metadata file, the grouping
    `pop` kept, frozen deeply. */
function noFileProject(): Project {
  return deepFreeze<Project>({ ...project(), individuals: null });
}

/** The project of the worked example with the grouping `onePopulation`. */
function onePopulationProject(): Project {
  return deepFreeze<Project>({
    ...project(),
    grouping: { kind: "onePopulation" },
  });
}

/** The lines of the Python script from `per_var` on, with the defaults
    and a draw of 40, which the one population shares with a column (the
    spec, "Its lines of the Python script"). */
const SCRIPT_AFTER_POPS = `per_var = popnei.calc_per_var_distribs(
    variants, pops=pops, min_num_individuals=20, poly_threshold=0.95
)
table = pandas.DataFrame({
    "individuals": {pop: len(names) for pop, names in pops.items()},
    "expected_heterozygosity_unbiased": per_var.unbiased_exp_het.mean,
    "observed_heterozygosity": per_var.obs_het.mean,
    "proportion_polymorphic": per_var.poly_vars_ratio.poly_ratio,
})
# A population of fewer than 20 individuals has a value at no variant; it
# is left out here, where it would take every variant out of the private
# alleles of the others. A private allele needs two populations.
large = {pop: names for pop, names in pops.items() if len(names) >= 20}
if large:
    stats = [
        popnei.PopDiversityStat.NUM_ALLELES,
        popnei.PopDiversityStat.FIS,
        popnei.PopDiversityStat.FOLDED_SFS,
    ]
    if len(large) > 1:
        stats.append(popnei.PopDiversityStat.PRIVATE_ALLELES)
    diversity = popnei.calc_pop_diversity(
        variants, large, stats=stats, num_called_alleles=40, min_num_individuals=20
    )
    table["f"] = diversity.fis
    table["alleles_per_variant"] = diversity.num_alleles["mean"]
    table["alleles_per_variant_rarefied"] = diversity.num_alleles["in_draw"]
    if diversity.private_alleles is not None:
        table["private_alleles"] = diversity.private_alleles["total"]
        table["private_alleles_per_variant"] = diversity.private_alleles["mean"]
        table["private_alleles_per_variant_rarefied"] = diversity.private_alleles["in_draw"]
    # The folded site frequency spectrum of each population, in a draw of
    # 40 chromosomes: the expected number of variants with each count of the
    # rarer allele, and the share of each count among the variants that show
    # both alleles in the draw
    spectrum = diversity.folded_sfs
    print(spectrum.to_string())
    both_alleles = spectrum.iloc[1:]
    print((both_alleles / both_alleles.sum()).to_string())
print(table.to_string())
`;

/** The lines of the Python script of the one population, with the
    defaults (the spec, "Its lines of the Python script"). */
const ONE_POPULATION_SCRIPT = [
  "# The diversity of every individual, as one population",
  'pops = {"All individuals": list(variants.individuals)}',
]
  .map((line) => `${line}\n`)
  .join("")
  .concat(SCRIPT_AFTER_POPS);

describe("IP4 D1 the one population", () => {
  test("with no metadata file and the grouping pop kept, needs is null, keyInputs the one population, run sends All individuals, narrowed to the individuals kept, and numCheckNumbers is 4", () => {
    const p = noFileProject();
    expect(diversity.needs(p)).toBeNull();
    expect(diversity.keyInputs(p)).toEqual({
      pops: "all",
      options: KEY_OPTIONS,
    });
    const whole = recordingClient();
    diversity.run(p, whole.client);
    expect(whole.jobs.map((job) => [job.individuals, job.pops])).toEqual([
      [null, [["All individuals", ["i1", "i2", "i3", "i4"]]]],
    ]);
    const narrowed = keptClient(["i1", "i3"]);
    diversity.run(p, narrowed.client);
    expect(narrowed.jobs.map((job) => [job.individuals, job.pops])).toEqual([
      [["i1", "i3"], [["All individuals", ["i1", "i3"]]]],
    ]);
    expect(diversity.numCheckNumbers(p)).toBe(4);
  });

  test("the key of the one population is the same with the file and onePopulation, and with neither the file nor a column; it differs from that of the column pop", () => {
    const noFile = keyOfDiversity(noFileProject());
    expect(keyOfDiversity(onePopulationProject())).toBe(noFile);
    expect(
      keyOfDiversity(
        deepFreeze<Project>({
          ...project({ column: null }),
          individuals: null,
        }),
      ),
    ).toBe(noFile);
    expect(keyOfDiversity(project())).not.toBe(noFile);
    expect(
      keyOfDiversity(
        deepFreeze<Project>({ ...onePopulationProject(), individuals: null }),
      ),
    ).toBe(noFile);
  });

  test("the one population with the file and onePopulation needs nothing, sends All individuals and has 4 check numbers", () => {
    const p = onePopulationProject();
    expect(diversity.needs(p)).toBeNull();
    const { client, jobs } = recordingClient();
    diversity.run(p, client);
    expect(jobs.map((job) => job.pops)).toEqual([
      [["All individuals", ["i1", "i2", "i3", "i4"]]],
    ]);
    expect(diversity.numCheckNumbers(p)).toBe(4);
  });

  test("a result of All individuals with 2 individuals gives tooFewIndividuals in the words of the one population, and no individualsWithoutPopulation", () => {
    const r = result({
      pops: ["All individuals"],
      numIndividuals: [2],
      numVarsWithValue: [0],
      numVars: 1000,
    });
    const p = deepFreeze<Project>({
      ...project({ individuals: ["i1", "i2"] }),
      individuals: null,
    });
    expect(diversity.warnings(r, p)).toEqual([
      {
        code: "tooFewIndividuals",
        text: "All individuals, the one population, has 2 individuals, and a variant has a value in a population only when at least 20 of its individuals have a called genotype there, so it has no values. To have them, lower the minimum number of individuals in the options of the diversity.",
      },
    ]);
    // With the file, whose i4 has no population in pop, and the one
    // population chosen: i4 is in it.
    const withFile = deepFreeze<Project>({
      ...project({ individuals: ["i1", "i4"] }),
      grouping: { kind: "onePopulation" },
    });
    expect(diversity.warnings(r, withFile).map((w) => w.code)).toEqual([
      "tooFewIndividuals",
    ]);
  });

  test("a result of All individuals that the filters of individuals took individuals from ends tooFewIndividuals with the filters", () => {
    const r = result({
      pops: ["All individuals"],
      numIndividuals: [3],
      numVarsWithValue: [0],
      numVars: 1000,
    });
    expect(diversity.warnings(r, noFileProject())).toEqual([
      {
        code: "tooFewIndividuals",
        text: "All individuals, the one population, has 3 individuals, and a variant has a value in a population only when at least 20 of its individuals have a called genotype there, so it has no values. To have them, lower the minimum number of individuals in the options of the diversity, or loosen the filters of individuals in the Variants step.",
      },
    ]);
  });

  test("a result without All individuals raises no populationNotInResult for the one population", () => {
    const r = result({ pops: [], numIndividuals: [], numVars: 1000 });
    expect(diversity.warnings(r, noFileProject())).toEqual([]);
  });

  test("script gives the lines of the one population, with no metadata file and with onePopulation", () => {
    expect(diversity.script(noFileProject())).toBe(ONE_POPULATION_SCRIPT);
    expect(diversity.script(onePopulationProject())).toBe(
      ONE_POPULATION_SCRIPT,
    );
  });

  test("a metadata file whose read is under way locks the one population, and one that lacks individuals of the variants too", () => {
    const one = onePopulationProject();
    if (one.individuals === null) {
      throw new Error("the project of the test has an individuals file");
    }
    const reading = deepFreeze<Project>({
      ...one,
      individuals: { ...one.individuals, read: { kind: "pending" } },
    });
    expect(diversity.needs(reading)).toBe("Reading pops.csv.");
    const lacking = deepFreeze<Project>({
      ...project({ individuals: ["i1", "i6"] }),
      grouping: { kind: "onePopulation" },
    });
    expect(diversity.needs(lacking)).toBe(
      "1 individual of panel.nei is not in pops.csv: i6. Add it to the file and load the file again in the Individuals step.",
    );
  });

  test("every individual with no population in the column, then the one population chosen: the lock of noPopulation goes", () => {
    const p = project({
      table: tableOf(["i1", "i2", "i3"], [null, null, null]),
      individuals: ["i1", "i2", "i3"],
    });
    expect(populationsNeeds(p)?.kind).toBe("noPopulation");
    const one = deepFreeze<Project>({
      ...p,
      grouping: { kind: "onePopulation" },
    });
    expect(diversity.needs(one)).toBeNull();
    expect(populationsToRun(one)).toEqual([
      ["All individuals", ["i1", "i2", "i3"]],
    ]);
  });
});

describe("IP10 D3 the cases of the one population", () => {
  test("an opened project whose metadata file was not read when it was saved is locked with the reason of individualsNeeds, with the column chosen, with none, and with the one population", () => {
    const base = project();
    if (base.individuals === null) {
      throw new Error("the project of the test has an individuals file");
    }
    const notGiven = deepFreeze<Project>({
      ...base,
      individuals: { ...base.individuals, read: { kind: "notGiven" } },
    });
    const reason =
      "pops.csv was not read when this project was saved, so the project file does not hold it. Load pops.csv again in the Individuals step.";
    expect(individualsNeeds(notGiven)).toBe(reason);
    for (const grouping of [
      { kind: "populations", column: "pop" },
      { kind: "populations", column: null },
      { kind: "onePopulation" },
    ] as const) {
      const p = deepFreeze<Project>({ ...notGiven, grouping });
      expect(diversity.needs(p)).toBe(reason);
    }
  });

  test("with no metadata file the diversity of All individuals is done, and stays when a column is chosen; a metadata file read with that column takes it off, and the file removed brings it back from the cache with no calculation", () => {
    const sent: { key: string; job: Job; run: Run<JobResult> }[] = [];
    const store = createStore<Job, JobResult>({
      first: emptyProject("popgen"),
      analyses: POPGEN_ANALYSES,
      send: (key, job) => {
        const run: Run<JobResult> = {
          id: sent.length + 1,
          outcome: new Promise<Outcome<JobResult>>(() => undefined),
          cancel: () => undefined,
        };
        sent.push({ key, job, run });
        return run;
      },
      countsOf,
      counts: "filterCounts",
      statistics: { analysis: "individualChecks", of: individualStatsOf },
      write: null,
      appVersion: "0.1.0",
      cacheMaxBytes: 1024 * 1024,
      maxUndoSteps: 200,
    });
    const status = (): AnalysisStatus<JobResult> | undefined =>
      store.getState().analyses.find((view) => view.id === "diversity")?.status;
    store.popneiReady("0.1.0");
    store.apply("a variants file was loaded", (p) =>
      loadVariants(p, {
        fileId: VARIANTS_ID,
        name: "panel.nei",
        size: 261_490,
        format: "nei",
        readOptions: null,
      }),
    );
    store.variantsRead(VARIANTS_ID, {
      kind: "read",
      individuals: ["i1", "i2", "i3", "i4"],
      ploidy: 2,
      numVars: null,
      keepsPassed: false,
    });
    store.startRun("diversity");
    const request = sent.at(-1);
    if (request?.job.analysis !== "diversity") {
      throw new Error("no request of the diversity was sent");
    }
    expect(request.job.pops).toEqual([
      ["All individuals", ["i1", "i2", "i3", "i4"]],
    ]);
    const done = result({
      pops: ["All individuals"],
      numIndividuals: [4],
      numVars: 1000,
    });
    store.runEnded(request.run.id, {
      kind: "done",
      key: request.key,
      result: done,
    });
    expect(status()?.kind).toBe("done");
    const numSent = sent.length;

    // A column chosen with no file leaves the one population, whatever
    // the grouping holds.
    store.apply("the column pop chosen", (p) =>
      setGrouping(p, { kind: "populations", column: "pop" }),
    );
    expect(status()).toMatchObject({ kind: "done", key: request.key });

    store.apply("a metadata file was loaded", (p) =>
      loadIndividuals(p, {
        fileId: INDIVIDUALS_ID,
        name: "pops.csv",
        csv: { encoding: "auto", separator: "auto", decimal: "auto" },
      }),
    );
    expect(status()).toStrictEqual({
      kind: "locked",
      reason: "Reading pops.csv.",
    });
    const read = project().individuals?.read;
    if (read?.kind !== "read") {
      throw new Error("the project of the test has an individuals file read");
    }
    store.individualsRead(
      INDIVIDUALS_ID,
      { encoding: "auto", separator: "auto", decimal: "auto" },
      {
        kind: "read",
        table: read.table,
        columns: read.columns,
        found: read.found,
      },
    );
    const ofColumn = status();
    expect(ofColumn?.kind).toBe("removed");
    expect(ofColumn?.kind !== "locked" && ofColumn?.key).not.toBe(request.key);

    store.apply("the metadata file was removed", removeIndividuals);

    const back = status();
    expect(back).toMatchObject({ kind: "done", key: request.key });
    expect(back?.kind === "done" && back.result).toBe(done);
    expect(sent).toHaveLength(numSent);
  });
});

describe("PA6 D3 the populations of calcPopDiversity and the default draw that run sends", () => {
  /** The worked example with the minimum `minNumIndividuals` and a
      variants file of ploidy `ploidy`. */
  function withMinimum(minNumIndividuals: number, ploidy = 2): Project {
    const p = project();
    if (p.variants?.read.kind !== "read") {
      throw new Error("the project of project() has a variants file read");
    }
    return deepFreeze<Project>({
      ...p,
      variants: { ...p.variants, read: { ...p.variants.read, ploidy } },
      analyses: [
        {
          analysis: "diversity",
          options: {
            minNumIndividuals,
            polyThreshold: 0.95,
            numCalledAlleles: null,
          },
        },
      ],
    });
  }

  /** What run sends of the stage 5: the draw and the populations. */
  function sentOf(p: Project): readonly [number, readonly string[]] {
    const { client, jobs } = recordingClient();
    diversity.run(p, client);
    const [job] = jobs;
    if (job === undefined || jobs.length !== 1) {
      throw new Error("run sent no job, or more than one");
    }
    return [job.numCalledAlleles, job.popDiversityPops];
  }

  test("with minNumIndividuals 2, A of 2 individuals is given and B of 1 is not, at a draw of 4 for ploidy 2", () => {
    expect(sentOf(withMinimum(2))).toEqual([4, ["A"]]);
  });

  test("with minNumIndividuals 1, A and B in their order, at a draw of 2", () => {
    expect(sentOf(withMinimum(1))).toEqual([2, ["A", "B"]]);
  });

  test("with the default of 20, no population, at a draw of 40", () => {
    expect(sentOf(project())).toEqual([40, []]);
  });

  test("the draw is the ploidy times the minimum, 80 for ploidy 4 at 20, and never below 2, as at a minimum of 0", () => {
    expect(sentOf(withMinimum(20, 4))[0]).toBe(80);
    expect(sentOf(withMinimum(0, 1))).toEqual([2, ["A", "B"]]);
  });

  test("the populations are counted among the individuals kept: with i1 and i2 kept, A has 1 and is not given at a minimum of 2", () => {
    const { client, jobs } = recordingClient();
    diversity.run(withMinimum(2), { ...client, individuals: ["i1", "i2"] });
    expect(
      jobs.map((job) => [job.pops, job.popDiversityPops, job.numCalledAlleles]),
    ).toEqual([
      [
        [
          ["A", ["i1"]],
          ["B", ["i2"]],
        ],
        [],
        4,
      ],
    ]);
  });
});

/** The project `p` with the options of the diversity: the minimum
    `minNumIndividuals` and the draw `numCalledAlleles`, `null` for the
    default. */
function withDiversity(
  p: Project,
  minNumIndividuals: number,
  numCalledAlleles: number | null,
): Project {
  return deepFreeze<Project>({
    ...p,
    analyses: [
      {
        analysis: "diversity",
        options: { minNumIndividuals, polyThreshold: 0.95, numCalledAlleles },
      },
    ],
  });
}

/** What `parseOptions` gives for options it refuses. */
const REFUSED = { ok: false, error: OPTIONS_EXPECTED };

describe("PA6 D3 parseOptions of the three options", () => {
  test("gives the defaults back, the default draw as null, in a new object", () => {
    const given = {
      minNumIndividuals: 20,
      polyThreshold: 0.95,
      numCalledAlleles: null,
    };
    const read = diversity.parseOptions(given, 1);
    expect(read).toStrictEqual({ ok: true, value: given });
    expect(read.ok && read.value).not.toBe(given);
    expect(diversity.parseOptions(DIVERSITY_DEFAULTS, 1)).toStrictEqual({
      ok: true,
      value: { ...DIVERSITY_DEFAULTS },
    });
  });

  test("takes a minNumIndividuals of 0 and of 4,294,967,295", () => {
    for (const minNumIndividuals of [0, 4_294_967_295]) {
      const options = {
        minNumIndividuals,
        polyThreshold: 0.95,
        numCalledAlleles: null,
      };
      expect(diversity.parseOptions(options, 1)).toStrictEqual({
        ok: true,
        value: options,
      });
    }
  });

  test("takes a numCalledAlleles of 2 and of 4,294,967,295", () => {
    for (const numCalledAlleles of [2, 4_294_967_295]) {
      const options = {
        minNumIndividuals: 20,
        polyThreshold: 0.95,
        numCalledAlleles,
      };
      expect(diversity.parseOptions(options, 1)).toStrictEqual({
        ok: true,
        value: options,
      });
    }
  });

  test("refuses each field missing", () => {
    for (const options of [
      { polyThreshold: 0.95, numCalledAlleles: null },
      { minNumIndividuals: 20, numCalledAlleles: null },
      { minNumIndividuals: 20, polyThreshold: 0.95, stats: null },
      // The draw inherited, not a field of its own.
      Object.assign(Object.create({ numCalledAlleles: null }), {
        minNumIndividuals: 20,
        polyThreshold: 0.95,
        stats: null,
      }),
    ]) {
      expect(diversity.parseOptions(options, 1)).toStrictEqual(REFUSED);
    }
  });

  test("refuses a field more", () => {
    expect(
      diversity.parseOptions(
        {
          minNumIndividuals: 20,
          polyThreshold: 0.95,
          numCalledAlleles: null,
          stats: [],
        },
        1,
      ),
    ).toStrictEqual(REFUSED);
  });

  test("refuses a minNumIndividuals of 2.5, of -1 and of 4,294,967,296", () => {
    for (const minNumIndividuals of [2.5, -1, 4_294_967_296]) {
      expect(
        diversity.parseOptions(
          { minNumIndividuals, polyThreshold: 0.95, numCalledAlleles: null },
          1,
        ),
      ).toStrictEqual(REFUSED);
    }
  });

  test("refuses a polyThreshold of 1.5 and one that is a text", () => {
    for (const polyThreshold of [1.5, "0.95"]) {
      expect(
        diversity.parseOptions(
          { minNumIndividuals: 20, polyThreshold, numCalledAlleles: null },
          1,
        ),
      ).toStrictEqual(REFUSED);
    }
  });

  test("refuses a numCalledAlleles of 1, 0, 2.5, 4,294,967,296, a text, and undefined", () => {
    for (const numCalledAlleles of [
      1,
      0,
      2.5,
      4_294_967_296,
      "40",
      undefined,
    ]) {
      expect(
        diversity.parseOptions(
          { minNumIndividuals: 20, polyThreshold: 0.95, numCalledAlleles },
          1,
        ),
      ).toStrictEqual(REFUSED);
    }
  });

  test("refuses the two fields of stage 2 alone", () => {
    expect(
      diversity.parseOptions({ minNumIndividuals: 20, polyThreshold: 0.95 }, 1),
    ).toStrictEqual(REFUSED);
  });

  test("diversityOptions gives the defaults of a project with no entry, and the entry of one with it", () => {
    expect(diversityOptions(project())).toStrictEqual({
      ...DIVERSITY_DEFAULTS,
    });
    expect(diversityOptions(withDiversity(project(), 10, 60))).toStrictEqual({
      minNumIndividuals: 10,
      polyThreshold: 0.95,
      numCalledAlleles: 60,
    });
  });
});

describe("PA6 D3 the draw of drawOf and run", () => {
  /** The project of the worked example with its variants file of ploidy
      `ploidy`. */
  function ofPloidy(ploidy: number): Project {
    const p = project();
    if (p.variants?.read.kind !== "read") {
      throw new Error("the project of project() has a variants file read");
    }
    return deepFreeze<Project>({
      ...p,
      variants: { ...p.variants, read: { ...p.variants.read, ploidy } },
    });
  }

  test("a draw typed, 7, is sent as typed whatever the minimum", () => {
    for (const min of [1, 2, 20]) {
      const { client, jobs } = recordingClient();
      diversity.run(withDiversity(project(), min, 7), client);
      expect(jobs.map((job) => job.numCalledAlleles)).toEqual([7]);
    }
  });

  test("drawOf of ploidy 4 and the minimum 20 gives 80, and of ploidy 1 and the minimum 0 gives 2", () => {
    expect(drawOf(ofPloidy(4))).toBe(80);
    expect(drawOf(withDiversity(ofPloidy(1), 0, null))).toBe(2);
  });

  test("drawOf of the default follows the minimum, 20 at a minimum of 10 for diploids, and a draw typed does not", () => {
    expect(drawOf(withDiversity(project(), 10, null))).toBe(20);
    expect(drawOf(withDiversity(project(), 10, 60))).toBe(60);
  });

  test("drawOf of the default is null while the variants file is not read, and a draw typed is given", () => {
    const p = project();
    if (p.variants === null) {
      throw new Error("the project of project() has a variants file");
    }
    const pending = deepFreeze<Project>({
      ...p,
      variants: { ...p.variants, read: { kind: "pending" } },
    });
    expect(drawOf(pending)).toBeNull();
    expect(drawOf(withDiversity(pending, 20, 9))).toBe(9);
  });
});

describe("PA6 D3 the lock of the draw", () => {
  test("a draw of 5 over A, the largest population, of 2 individuals and 4 chromosomes, locks in needs with the words of no list, which name A", () => {
    expect(diversity.needs(withDiversity(project(), 2, 5))).toBe(
      "The rarefaction draws 5 chromosomes, and the largest population, A, holds 4, those of its 2 individuals at a ploidy of 2. Type a number of chromosomes of at most 4 in the options of the diversity.",
    );
  });

  test("a draw of 4, which A holds, does not lock, and one of 8, which the 4 individuals of the variants file hold and no population does, locks", () => {
    expect(diversity.needs(withDiversity(project(), 2, 4))).toBeNull();
    expect(diversity.needs(withDiversity(project(), 2, 8))).toBe(
      "The rarefaction draws 8 chromosomes, and the largest population, A, holds 4, those of its 2 individuals at a ploidy of 2. Type a number of chromosomes of at most 4 in the options of the diversity.",
    );
  });

  test("with a list to remove i3, A and B of one individual each, and a draw of 3, needs locks with the words of the lists, which name A, the first of the two", () => {
    const p = withDiversity(
      filteredProject([{ kind: "remove", individuals: ["i3"] }]),
      1,
      3,
    );
    expect(diversity.needs(p)).toBe(
      "The rarefaction draws 3 chromosomes, and the largest population the lists of individuals keep, A, holds 2, those of its one individual at a ploidy of 2. Type a number of chromosomes of at most 2 in the options of the diversity, or change the lists in the Variants step.",
    );
  });

  test("on populations of 48, 84 and 68 individuals, as panel.nei's, a draw of 168 does not lock and one of 169 names p2, its 168 and its 84 individuals", () => {
    const p = projectOfSizes(["p0", "p2", "p1"], [48, 84, 68]);
    expect(diversity.needs(withDiversity(p, 20, 168))).toBeNull();
    expect(diversity.needs(withDiversity(p, 20, 169))).toBe(
      "The rarefaction draws 169 chromosomes, and the largest population, p2, holds 168, those of its 84 individuals at a ploidy of 2. Type a number of chromosomes of at most 168 in the options of the diversity.",
    );
  });

  test("the one population of one individual the lists keep, at a draw of 3, locks with the one individual", () => {
    const p = withDiversity(
      deepFreeze<Project>({
        ...filteredProject([
          { kind: "remove", individuals: ["i2", "i3", "i4"] },
        ]),
        individuals: null,
      }),
      1,
      3,
    );
    expect(diversity.needs(p)).toBe(
      "The rarefaction draws 3 chromosomes, and the one individual the lists of individuals keep holds 2 at a ploidy of 2. Type a number of chromosomes of at most 2 in the options of the diversity, or change the lists in the Variants step.",
    );
  });

  test("with no population of the minimum there is no lock: the default draw at 20, and a draw of 9 at 20", () => {
    expect(diversity.needs(project())).toBeNull();
    expect(diversity.needs(withDiversity(project(), 20, 9))).toBeNull();
  });

  test("the one population locks too, with no metadata file, at its individuals: a draw of 9 over the 4, and not one of 8", () => {
    const onePopulation = deepFreeze<Project>({
      ...project(),
      individuals: null,
    });
    expect(diversity.needs(withDiversity(onePopulation, 2, 9))).toBe(
      "The rarefaction draws 9 chromosomes, and the 4 individuals of panel.nei hold 8 at a ploidy of 2. Type a number of chromosomes of at most 8 in the options of the diversity.",
    );
    expect(diversity.needs(withDiversity(onePopulation, 2, 8))).toBeNull();
  });

  test("keptNeeds with a threshold, the individuals kept i1 and i3 and a draw of 5, locks with the words of the filters", () => {
    const p = withDiversity(
      filteredProject([{ kind: "missing_data", maxAllowedMissingRate: 0.2 }]),
      2,
      5,
    );
    const kept: IndividualsKept = {
      list: { kind: "known", individuals: ["i1", "i3"] },
      byLists: ["i1", "i2", "i3", "i4"],
      counts: [],
    };
    expect(keptNeeds(p, kept)).toBe(
      "The rarefaction draws 5 chromosomes, and the largest population the filters of individuals keep, A, holds 4, those of its 2 individuals at a ploidy of 2. Type a number of chromosomes of at most 4 in the options of the diversity, or loosen the filters of individuals in the Variants step.",
    );
  });

  test("keptNeeds with the individuals kept i1 and i2, A and B of one each, and a draw of 3, names A and its one individual", () => {
    const p = withDiversity(
      filteredProject([{ kind: "missing_data", maxAllowedMissingRate: 0.2 }]),
      1,
      3,
    );
    const kept: IndividualsKept = {
      list: { kind: "known", individuals: ["i1", "i2"] },
      byLists: ["i1", "i2", "i3", "i4"],
      counts: [],
    };
    // A holds 4 among the individuals the lists keep, which needs counts.
    expect(diversity.needs(p)).toBeNull();
    expect(keptNeeds(p, kept)).toBe(
      "The rarefaction draws 3 chromosomes, and the largest population the filters of individuals keep, A, holds 2, those of its one individual at a ploidy of 2. Type a number of chromosomes of at most 2 in the options of the diversity, or loosen the filters of individuals in the Variants step.",
    );
  });

  test("keptNeeds of the one population with one individual kept says the one individual", () => {
    const p = withDiversity(
      deepFreeze<Project>({
        ...filteredProject([
          { kind: "missing_data", maxAllowedMissingRate: 0.2 },
        ]),
        individuals: null,
      }),
      1,
      3,
    );
    const kept: IndividualsKept = {
      list: { kind: "known", individuals: ["i1"] },
      byLists: ["i1", "i2", "i3", "i4"],
      counts: [],
    };
    expect(keptNeeds(p, kept)).toBe(
      "The rarefaction draws 3 chromosomes, and the one individual the filters of individuals keep holds 2 at a ploidy of 2. Type a number of chromosomes of at most 2 in the options of the diversity, or loosen the filters of individuals in the Variants step.",
    );
  });

  test("keptNeeds leaves to needs the list null, a list as long as the lists keep, and a list not known", () => {
    const p = withDiversity(project(), 2, 9);
    const byLists = ["i1", "i2", "i3", "i4"];
    for (const list of [
      { kind: "known", individuals: null },
      { kind: "known", individuals: byLists },
      { kind: "needsStatistics" },
    ] as const) {
      expect(keptNeeds(p, { list, byLists, counts: [] })).toBeNull();
    }
  });
});

describe("PA10 populations that hold fewer than 2 chromosomes", () => {
  /** A project whose variants file, of ploidy 1, holds `individuals`,
      with the minimum 1 and the draw `draw`: with `pops`, a population
      for each individual in a column; without, no metadata file. */
  function haploid(
    individuals: readonly string[],
    draw: number | null,
    pops: readonly string[] | null,
    minNumIndividuals = 1,
  ): Project {
    const p =
      pops === null
        ? deepFreeze<Project>({
            ...project({ individuals }),
            individuals: null,
          })
        : project({ individuals, table: tableOf(individuals, pops) });
    if (p.variants?.read.kind !== "read") {
      throw new Error("the project of project() has a variants file read");
    }
    return withDiversity(
      deepFreeze<Project>({
        ...p,
        variants: { ...p.variants, read: { ...p.variants.read, ploidy: 1 } },
      }),
      minNumIndividuals,
      draw,
    );
  }

  /** The draw and the populations of calcPopDiversity that run sends. */
  function sentOf(p: Project): readonly [number, readonly string[]] {
    const { client, jobs } = recordingClient();
    diversity.run(p, client);
    const [job] = jobs;
    if (job === undefined || jobs.length !== 1) {
      throw new Error("run sent no job, or more than one");
    }
    return [job.numCalledAlleles, job.popDiversityPops];
  }

  test("one haploid individual does not lock, at the default draw of 2 and at a draw typed of 5", () => {
    expect(diversity.needs(haploid(["i1"], null, null))).toBeNull();
    expect(diversity.needs(haploid(["i1"], 5, null))).toBeNull();
  });

  test("run sends it with no population for calcPopDiversity, the first pass alone, and the draw of 2", () => {
    expect(sentOf(haploid(["i1"], null, null))).toEqual([2, []]);
  });

  test("its result gives tooFewChromosomesForDraw and noFInHaploid, and neither the warning of one population nor that of the draw", () => {
    const p = haploid(["i1"], null, null);
    const r = result({
      pops: ["All individuals"],
      numIndividuals: [1],
      numVars: 1152,
    });
    const found = diversity.warnings(
      { ...r, numVarsInDraw: Uint32Array.from([0]), numCalledAlleles: 2 },
      p,
    );
    expect(found.map((w) => w.code)).toEqual([
      "tooFewChromosomesForDraw",
      "noFInHaploid",
    ]);
    expect(found[0]?.text).toBe(
      "The diversity was calculated over one individual of ploidy 1, which holds 1 chromosome, and the rarefaction and the spectrum draw 2 or more. So the alleles per variant, the private alleles, their rarefied values and the spectrum, which are calculated together, have no value.",
    );
  });

  test("two haploid individuals in two populations run at the default draw, with both populations, and a draw of 3 locks at the 2 chromosomes of the individuals", () => {
    const two = ["i1", "i2"];
    expect(diversity.needs(haploid(two, null, ["A", "B"]))).toBeNull();
    expect(sentOf(haploid(two, null, ["A", "B"]))).toEqual([2, ["A", "B"]]);
    expect(diversity.needs(haploid(two, 3, ["A", "B"]))).toBe(
      "The rarefaction draws 3 chromosomes, and the 2 individuals of panel.nei hold 2 at a ploidy of 1. Type a number of chromosomes of at most 2 in the options of the diversity.",
    );
  });

  // The case "One haploid individual, at a minimum of 0 or 1" of
  // diversity.md, at 0.
  test("at a minimum of 0, one haploid individual does not lock either, and run sends the draw of 2 with no population for calcPopDiversity", () => {
    expect(diversity.needs(haploid(["i1"], null, null, 0))).toBeNull();
    expect(sentOf(haploid(["i1"], null, null, 0))).toEqual([2, []]);
  });

  // The case "A haploid VCF" of diversity.md: the default draw is the
  // minimum.
  test("a haploid VCF at the minimum of 20 has the default draw of 20, the minimum", () => {
    expect(defaultDrawOf(haploid(["i1"], null, null, 20))).toBe(20);
    expect(drawOf(haploid(["i1"], null, null, 20))).toBe(20);
  });

  test("a result of two haploid individuals in two populations gives no tooFewChromosomesForDraw", () => {
    const p = haploid(["i1", "i2"], null, ["A", "B"]);
    const r = result({ pops: ["A", "B"], numIndividuals: [1, 1], numVars: 9 });
    expect(warningsOf(r, p, "tooFewChromosomesForDraw")).toEqual([]);
  });
});

/** A result of stage 5: that of `result` for `pops` and their sizes, over
    1,152 variants, with `changes` over its fields. */
function stage5Result(
  pops: readonly string[],
  numIndividuals: readonly number[],
  changes: Partial<DiversityResult> = {},
): DiversityResult {
  return { ...result({ pops, numIndividuals, numVars: 1152 }), ...changes };
}

/** The warnings of `code` among those of `r`. */
function warningsOf(
  r: DiversityResult,
  p: Project,
  code: string,
): readonly Warning[] {
  return diversity.warnings(r, p).filter((w) => w.code === code);
}

/** The project of the flow, the column popcat, with two individuals. */
function flowProject(): Project {
  return project({
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
}

describe("PA6 D4 the warnings of stage 5", () => {
  test("a population of 12 among others of 20 or more gives privateAllelesWithoutSmall naming it, after tooFewIndividuals", () => {
    const names = ["p0", "p2", "p1", "p3"];
    const sizes = [48, 84, 68, 12];
    const p = projectOfSizes(names, sizes);
    const r = stage5Result(names, sizes, {
      // p3, not given to calcPopDiversity, is in no draw, and no warning
      // of the draw names it.
      numVarsInDraw: Uint32Array.from([1152, 1152, 1152, 0]),
      numVarsEveryPop: 1152,
      numVarsEveryPopInDraw: 1152,
    });
    expect(diversity.warnings(r, p)).toEqual([
      {
        code: "tooFewIndividuals",
        text: "Population p3 has 12 individuals, and a variant has a value in a population only when at least 20 of its individuals have a called genotype there, so p3 has no values. To have them, merge it with another population in the metadata file, or lower the minimum number of individuals in the options of the diversity.",
      },
      {
        code: "privateAllelesWithoutSmall",
        text: "The private alleles of p0, p2 and p1 are counted among these populations alone, without p3, which has fewer than 20 individuals: an allele they share only with p3 counts as private.",
      },
    ]);
  });

  test("more than three populations counted are counted by their number, and those left out named", () => {
    const names = ["a", "b", "c", "d", "p3", "p5"];
    const sizes = [20, 20, 20, 20, 12, 8];
    const r = stage5Result(names, sizes, {
      numVarsEveryPop: 1152,
      numVarsEveryPopInDraw: 1152,
    });
    expect(
      warningsOf(r, projectOfSizes(names, sizes), "privateAllelesWithoutSmall"),
    ).toEqual([
      {
        code: "privateAllelesWithoutSmall",
        text: "The private alleles of the 4 populations with 20 individuals or more are counted among them alone, without p3 and p5, which have fewer than 20 individuals: an allele they share only with some of those populations counts as private.",
      },
    ]);
  });

  test("one population of the column in the call gives privateAllelesNeedTwoPopulations with the words of the column, and no privateAllelesWithoutSmall", () => {
    const p = projectOfSizes(["p2", "p3"], [20, 12]);
    const r = stage5Result(["p2", "p3"], [20, 12]);
    expect(warningsOf(r, p, "privateAllelesNeedTwoPopulations")).toEqual([
      {
        code: "privateAllelesNeedTwoPopulations",
        text: "Only p2 has 20 individuals or more, and private alleles are counted among such populations, so the table has none: an allele is private when one population has it and no other does.",
      },
    ]);
    expect(warningsOf(r, p, "privateAllelesWithoutSmall")).toEqual([]);
  });

  test("All individuals in the call gives privateAllelesNeedTwoPopulations with the words of the one population", () => {
    const p = deepFreeze<Project>({ ...project(), individuals: null });
    const r = stage5Result(["All individuals"], [200]);
    expect(diversity.warnings(r, p)).toEqual([
      {
        code: "privateAllelesNeedTwoPopulations",
        text: "With every individual in one population, no allele can be private, found in this population and in no other, so the table has no private alleles. Choose a column that defines the populations in the Individuals step to count them.",
      },
    ]);
  });

  test("numVarsEveryPop 641 of 1,152 gives privateAllelesOverFewerVariants with 56%, and 0 its words of none", () => {
    const names = ["p0", "p2", "p1"];
    const sizes = [48, 84, 68];
    const p = projectOfSizes(names, sizes);
    expect(
      diversity.warnings(
        stage5Result(names, sizes, {
          numVarsEveryPop: 641,
          numVarsEveryPopInDraw: 641,
        }),
        p,
      ),
    ).toEqual([
      {
        code: "privateAllelesOverFewerVariants",
        text: "The private alleles are counted over the 641 of the 1,152 variants kept (56%) at which every population has a value; at the others, fewer than 20 individuals of some population have a genotype.",
      },
    ]);
    expect(
      diversity.warnings(
        stage5Result(names, sizes, {
          numVarsEveryPop: 0,
          numVarsEveryPopInDraw: 0,
        }),
        p,
      ),
    ).toEqual([
      {
        code: "privateAllelesOverFewerVariants",
        text: "The private alleles are counted over the variants at which every population has a value, and there is none among the 1,152 kept: at each, fewer than 20 individuals of some population have a genotype. So no population has private alleles.",
      },
    ]);
    // Not asked for, so not counted over any variant.
    expect(
      warningsOf(
        stage5Result(names, sizes),
        p,
        "privateAllelesOverFewerVariants",
      ),
    ).toEqual([]);
  });

  test("p0 in a draw of 96 at 277 of its 1,152 variants gives variantsNotInDraw with 24%, and the last sentence when the rarefied private alleles are over fewer", () => {
    const names = ["p0", "p2", "p1"];
    const sizes = [48, 84, 68];
    const p = projectOfSizes(names, sizes);
    const draw = {
      numCalledAlleles: 96,
      numVarsInDraw: Uint32Array.from([277, 1152, 1152]),
    };
    const first =
      "p0 reaches 96 called chromosomes at 277 of the 1,152 variants at which it has a value (24%), so its rarefied values are over those alone.";
    expect(
      diversity.warnings(
        stage5Result(names, sizes, {
          ...draw,
          numVarsEveryPop: 1152,
          numVarsEveryPopInDraw: 1152,
        }),
        p,
      ),
    ).toEqual([{ code: "variantsNotInDraw", text: first }]);
    expect(
      diversity.warnings(
        stage5Result(names, sizes, {
          ...draw,
          numVarsEveryPop: 1152,
          numVarsEveryPopInDraw: 277,
        }),
        p,
      ),
    ).toEqual([
      {
        code: "variantsNotInDraw",
        text: `${first} The rarefied private alleles are over the 277 variants at which every population reaches 96.`,
      },
    ]);
  });

  test("the last sentence of variantsNotInDraw over the one variant at which every population reaches the draw, and over none", () => {
    const names = ["p0", "p2", "p1"];
    const sizes = [48, 84, 68];
    const p = projectOfSizes(names, sizes);
    const first =
      "p0 reaches 96 called chromosomes at 277 of the 1,152 variants at which it has a value (24%), so its rarefied values are over those alone.";
    const atEveryPop = (inDraw: number): readonly Warning[] =>
      warningsOf(
        stage5Result(names, sizes, {
          numCalledAlleles: 96,
          numVarsInDraw: Uint32Array.from([277, 1152, 1152]),
          numVarsEveryPop: 1152,
          numVarsEveryPopInDraw: inDraw,
        }),
        p,
        "variantsNotInDraw",
      );
    expect(atEveryPop(1)).toEqual([
      {
        code: "variantsNotInDraw",
        text: `${first} The rarefied private alleles are over the one variant at which every population reaches 96.`,
      },
    ]);
    expect(atEveryPop(0)).toEqual([
      {
        code: "variantsNotInDraw",
        text: `${first} No variant has every population at 96 called chromosomes, so there are no rarefied private alleles.`,
      },
    ]);
  });

  test("a population in the draw at none of its variants has no rarefied values, and is told to lower the draw except at 2", () => {
    const p = projectOfSizes(["p0", "p2"], [48, 84]);
    const none = (numCalledAlleles: number): DiversityResult =>
      stage5Result(["p0", "p2"], [48, 84], {
        numCalledAlleles,
        numVarsInDraw: Uint32Array.from([0, 1152]),
        numVarsEveryPop: 1152,
        numVarsEveryPopInDraw: 1152,
      });
    expect(warningsOf(none(96), p, "variantsNotInDraw")).toEqual([
      {
        code: "variantsNotInDraw",
        text: "p0 reaches 96 called chromosomes at none of the variants at which it has a value, so it has no rarefied values. Lower the number of chromosomes of the rarefaction in the options of the diversity.",
      },
    ]);
    expect(warningsOf(none(2), p, "variantsNotInDraw")).toEqual([
      {
        code: "variantsNotInDraw",
        text: "p0 reaches 2 called chromosomes at none of the variants at which it has a value, so it has no rarefied values.",
      },
    ]);
  });

  test("two populations short of the draw are listed with their counts and shares", () => {
    const p = projectOfSizes(["p0", "p2"], [48, 84]);
    const r = stage5Result(["p0", "p2"], [48, 84], {
      numCalledAlleles: 96,
      numVarsWithValue: Uint32Array.from([1152, 1100]),
      numVarsInDraw: Uint32Array.from([277, 1000]),
      numVarsEveryPop: 1100,
      numVarsEveryPopInDraw: 270,
    });
    expect(warningsOf(r, p, "variantsNotInDraw")).toEqual([
      {
        code: "variantsNotInDraw",
        text: "p0 and p2 reach 96 called chromosomes at 277 and 1,000 of the 1,152 and 1,100 variants at which each has a value (24% and 91%), so their rarefied values are over those alone. The rarefied private alleles are over the 270 variants at which every population reaches 96.",
      },
    ]);
  });

  test("a variants file of ploidy 1 gives noFInHaploid, the last warning, the spectrum's being said in its block and not here", () => {
    const vcf = vcfProject("panel.vcf.gz", false);
    if (vcf.variants?.read.kind !== "read") {
      throw new Error("the project of vcfProject has a variants file read");
    }
    const p = deepFreeze<Project>({
      ...vcf,
      variants: {
        ...vcf.variants,
        readOptions: { ploidy: 1, onlyPassed: false },
        read: { ...vcf.variants.read, ploidy: 1 },
      },
      filters: [{ kind: "maf", maxAllowedMaf: 0.95 }],
    });
    const r: DiversityResult = {
      ...result({ pops: ["A", "B"], numIndividuals: [1, 1], numVars: 1152 }),
      passStats: {
        numVars: 1152,
        filtering: { maf: { varsProcessed: 1200, varsKept: 1152 } },
      },
    };
    expect(
      diversity
        .warnings(r, p)
        .map((w) => w.code)
        .slice(-1),
    ).toEqual(["noFInHaploid"]);
    expect(warningsOf(r, p, "mafFilterOnSpectrum")).toEqual([]);
    // The spectrum's own function still gives it, for its block.
    expect(spectrumWarnings(r, p).map((w) => w.code)).toEqual([
      "mafFilterOnSpectrum",
    ]);
    expect(warningsOf(r, p, "noFInHaploid")).toEqual([
      {
        code: "noFInHaploid",
        text: "The variants of panel.vcf.gz have a ploidy of 1, and a genotype of one allele cannot be heterozygous, so F has no value.",
      },
    ]);
    expect(warningsOf(r, project(), "noFInHaploid")).toEqual([]);
  });
});

/** The result of the flow with the missing data filter at 0.05, with the
    numbers of stage 5 (the spec, "How it is verified"). */
const FLOW_RESULT_STAGE_5: DiversityResult = {
  ...FLOW_RESULT,
  fis: Float64Array.from([
    -0.011344341019483117, -0.020803811522959625, -0.017724256612463796,
  ]),
  numAllelesMean: Float64Array.from([
    1.9791666666666667, 1.9861111111111112, 1.9809027777777777,
  ]),
  numAllelesInDraw: Float64Array.from([
    1.9646163579517928, 1.9595644507442256, 1.9582701017879214,
  ]),
  privateAllelesTotal: Float64Array.from([0, 1, 0]),
  privateAllelesMean: Float64Array.from([0, 0.0008680555555555555, 0]),
  privateAllelesInDraw: Float64Array.from([
    0.0028348059148665707, 0.0031646710919597015, 0.002521711046320405,
  ]),
  numVarsInDraw: Uint32Array.from([1152, 1152, 1152]),
  numVarsEveryPop: 1152,
  numVarsEveryPopInDraw: 1152,
};

describe("PA6 D4 the rows, the CSV and the script of stage 5", () => {
  test("diversityRows of a result with NaN in privateAllelesTotal gives null in the three cells of the private alleles, and not 0", () => {
    const r: DiversityResult = {
      ...FLOW_RESULT_STAGE_5,
      pops: ["All individuals"],
      numIndividuals: Uint32Array.from([200]),
      unbiasedExpHet: Float64Array.from([0.37487834409014364]),
      obsHet: Float64Array.from([0.3541409192154764]),
      polyRatio: Float64Array.from([0.9791666666666666]),
      numVarsWithValue: Uint32Array.from([1152]),
      fis: Float64Array.from([0.055317745614243075]),
      numAllelesMean: Float64Array.from([2]),
      numAllelesInDraw: Float64Array.from([1.992568885944447]),
      privateAllelesTotal: Float64Array.from([NaN]),
      privateAllelesMean: Float64Array.from([NaN]),
      privateAllelesInDraw: Float64Array.from([NaN]),
      numVarsInDraw: Uint32Array.from([1152]),
      numVarsEveryPop: null,
      numVarsEveryPopInDraw: null,
      foldedSfs: [null],
    };
    expect(diversityRows(r)).toEqual([
      {
        population: "All individuals",
        individuals: 200,
        expectedHeterozygosity: 0.37487834409014364,
        observedHeterozygosity: 0.3541409192154764,
        polymorphic: 0.9791666666666666,
        f: 0.055317745614243075,
        allelesPerVariant: 2,
        allelesPerVariantRarefied: 1.992568885944447,
        privateAlleles: null,
        privateAllelesPerVariant: null,
        privateAllelesPerVariantRarefied: null,
      },
    ]);
  });

  test("diversityCsv of the result of the flow gives the eleven columns of the spec", () => {
    expect(diversityCsv(FLOW_RESULT_STAGE_5)).toBe(
      `population,individuals,expected_heterozygosity_unbiased,observed_heterozygosity,proportion_polymorphic,f,alleles_per_variant,alleles_per_variant_rarefied,private_alleles,private_alleles_per_variant,private_alleles_per_variant_rarefied
p0,48,0.35267894847982756,0.35667985874177544,0.9288194444444444,-0.011344341019483117,1.9791666666666667,1.9646163579517928,0,0,0.0028348059148665707
p2,84,0.3440824705971255,0.3512406974637824,0.9105902777777778,-0.020803811522959625,1.9861111111111112,1.9595644507442256,1,0.0008680555555555555,0.0031646710919597015
p1,68,0.3498365468860467,0.35603713961547323,0.9157986111111112,-0.017724256612463796,1.9809027777777777,1.9582701017879214,0,0,0.002521711046320405
`,
    );
  });

  test("script puts the spectrum's lines of sfs.md inside the block if large:, with the draw run sends and the minimum set", () => {
    const spectrumLines = `    # The folded site frequency spectrum of each population, in a draw of
    # 40 chromosomes: the expected number of variants with each count of the
    # rarer allele, and the share of each count among the variants that show
    # both alleles in the draw
    spectrum = diversity.folded_sfs
    print(spectrum.to_string())
    both_alleles = spectrum.iloc[1:]
    print((both_alleles / both_alleles.sum()).to_string())
`;
    expect(diversity.script(flowProject())).toContain(
      `        table["private_alleles_per_variant_rarefied"] = diversity.private_alleles["in_draw"]
${spectrumLines}print(table.to_string())
`,
    );
    expect(diversity.script(withDiversity(flowProject(), 10, 96))).toBe(
      `# The diversity of each population, from the column "popcat"
pops = {}
for individual, pop in zip(individuals.iloc[:, 0], individuals["popcat"]):
    if not pandas.isna(pop):
        pops.setdefault(pop, []).append(individual)
kept = set(variants.individuals)
pops = {pop: [i for i in names if i in kept] for pop, names in pops.items()}
pops = {pop: names for pop, names in pops.items() if names}
per_var = popnei.calc_per_var_distribs(
    variants, pops=pops, min_num_individuals=10, poly_threshold=0.95
)
table = pandas.DataFrame({
    "individuals": {pop: len(names) for pop, names in pops.items()},
    "expected_heterozygosity_unbiased": per_var.unbiased_exp_het.mean,
    "observed_heterozygosity": per_var.obs_het.mean,
    "proportion_polymorphic": per_var.poly_vars_ratio.poly_ratio,
})
# A population of fewer than 10 individuals has a value at no variant; it
# is left out here, where it would take every variant out of the private
# alleles of the others. A private allele needs two populations.
large = {pop: names for pop, names in pops.items() if len(names) >= 10}
if large:
    stats = [
        popnei.PopDiversityStat.NUM_ALLELES,
        popnei.PopDiversityStat.FIS,
        popnei.PopDiversityStat.FOLDED_SFS,
    ]
    if len(large) > 1:
        stats.append(popnei.PopDiversityStat.PRIVATE_ALLELES)
    diversity = popnei.calc_pop_diversity(
        variants, large, stats=stats, num_called_alleles=96, min_num_individuals=10
    )
    table["f"] = diversity.fis
    table["alleles_per_variant"] = diversity.num_alleles["mean"]
    table["alleles_per_variant_rarefied"] = diversity.num_alleles["in_draw"]
    if diversity.private_alleles is not None:
        table["private_alleles"] = diversity.private_alleles["total"]
        table["private_alleles_per_variant"] = diversity.private_alleles["mean"]
        table["private_alleles_per_variant_rarefied"] = diversity.private_alleles["in_draw"]
    # The folded site frequency spectrum of each population, in a draw of
    # 96 chromosomes: the expected number of variants with each count of the
    # rarer allele, and the share of each count among the variants that show
    # both alleles in the draw
    spectrum = diversity.folded_sfs
    print(spectrum.to_string())
    both_alleles = spectrum.iloc[1:]
    print((both_alleles / both_alleles.sum()).to_string())
print(table.to_string())
`,
    );
  });
});

describe("PA6 D5 the key of stage 5", () => {
  test("keyInputs with the default draw gives no numCalledAlleles, not even null, and with a draw typed gives it", () => {
    const p = project();
    expect(diversity.keyInputs(p)).toStrictEqual({
      pops: populationsOf(p),
      options: KEY_OPTIONS,
    });
    expect(JSON.stringify(diversity.keyInputs(p))).not.toContain(
      "numCalledAlleles",
    );
    expect(diversity.keyInputs(withDiversity(p, 20, 60))).toStrictEqual({
      pops: populationsOf(p),
      options: { ...KEY_OPTIONS, numCalledAlleles: 60 },
    });
  });

  test("minNumIndividuals changes the key with the default draw, which follows it", () => {
    const p = project();
    const at20 = keyOfDiversity(withDiversity(p, 20, null));
    expect(keyOfDiversity(p)).toBe(at20);
    expect(keyOfDiversity(withDiversity(p, 10, null))).not.toBe(at20);
    expect(drawOf(withDiversity(p, 10, null))).toBe(20);
  });

  test("numCalledAlleles typed changes the key, the default's number included, and set back to the default gives the key of the default again", () => {
    const p = project();
    const byDefault = keyOfDiversity(withDiversity(p, 20, null));
    expect(drawOf(p)).toBe(40);
    const typed40 = keyOfDiversity(withDiversity(p, 20, 40));
    expect(typed40).not.toBe(byDefault);
    expect(keyOfDiversity(withDiversity(p, 20, 60))).not.toBe(typed40);
    expect(keyOfDiversity(withDiversity(p, 20, 60))).not.toBe(byDefault);
    // Set back: the options of the default again.
    expect(keyOfDiversity(withDiversity(p, 20, null))).toBe(byDefault);
  });
});

describe("PA6 D4 the rows and the CSV of stage 5, each population its own numbers", () => {
  /** A result whose six numbers of stage 5 differ in every population, so
      that a row read from another population's place fails. */
  const r: DiversityResult = {
    ...FLOW_RESULT_STAGE_5,
    fis: Float64Array.from([-0.01, -0.02, -0.03]),
    numAllelesMean: Float64Array.from([1.1, 1.2, 1.3]),
    numAllelesInDraw: Float64Array.from([1.01, 1.02, 1.03]),
    privateAllelesTotal: Float64Array.from([3, 1, 2]),
    privateAllelesMean: Float64Array.from([0.3, 0.1, 0.2]),
    privateAllelesInDraw: Float64Array.from([0.03, 0.01, 0.02]),
  };

  test("diversityRows gives each population the numbers at its own place", () => {
    expect(
      diversityRows(r).map((row) => [
        row.population,
        row.f,
        row.allelesPerVariant,
        row.allelesPerVariantRarefied,
        row.privateAlleles,
        row.privateAllelesPerVariant,
        row.privateAllelesPerVariantRarefied,
      ]),
    ).toEqual([
      ["p0", -0.01, 1.1, 1.01, 3, 0.3, 0.03],
      ["p2", -0.02, 1.2, 1.02, 1, 0.1, 0.01],
      ["p1", -0.03, 1.3, 1.03, 2, 0.2, 0.02],
    ]);
  });

  test("diversityCsv writes each population's numbers on its own row", () => {
    expect(diversityCsv(r).split("\n").slice(1)).toEqual([
      "p0,48,0.35267894847982756,0.35667985874177544,0.9288194444444444,-0.01,1.1,1.01,3,0.3,0.03",
      "p2,84,0.3440824705971255,0.3512406974637824,0.9105902777777778,-0.02,1.2,1.02,1,0.1,0.01",
      "p1,68,0.3498365468860467,0.35603713961547323,0.9157986111111112,-0.03,1.3,1.03,2,0.2,0.02",
      "",
    ]);
  });
});

describe("PA6 D3 the default draw", () => {
  test("defaultDrawOf is the ploidy times the minimum, at least 2, whatever draw is typed, and drawOf gives it while none is", () => {
    const p = project();
    expect(defaultDrawOf(withDiversity(p, 20, null))).toBe(40);
    expect(defaultDrawOf(withDiversity(p, 20, 60))).toBe(40);
    expect(defaultDrawOf(withDiversity(p, 0, null))).toBe(2);
    expect(drawOf(withDiversity(p, 0, null))).toBe(2);
    expect(drawOf(withDiversity(p, 20, 60))).toBe(60);
  });

  test("defaultDrawOf is null while the variants file is not read", () => {
    const p = project();
    if (p.variants === null) {
      throw new Error("the project of project() has a variants file");
    }
    const pending = deepFreeze<Project>({
      ...p,
      variants: { ...p.variants, read: { kind: "pending" } },
    });
    expect(defaultDrawOf(pending)).toBeNull();
  });
});

describe("SF2 D4 the diversity reads the filters that apply to the file", () => {
  test("with passed on and a .nei file whose read says keepsPassed false, the job and the key are those of the filters without it", () => {
    const p = withPassedOn(project(), false);
    const keeping = withPassedOn(project(), true);
    const { client, jobs } = recordingClient();
    diversity.run(p, client);
    diversity.run(project(), client);
    expect(jobs[0]?.filters).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
    ]);
    expect(jobs[0]).toEqual(jobs[1]);
    expect(keyOfDiversity(p)).toBe(keyOfDiversity(project()));
    diversity.run(keeping, client);
    expect(jobs[2]?.filters[0]).toEqual({ kind: "passed" });
    expect(keyOfDiversity(keeping)).not.toBe(keyOfDiversity(project()));
  });
});
