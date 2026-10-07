import { describe, expect, test } from "vitest";
import {
  csvField,
  csvNumber,
  fourDecimals,
  percentOf,
  populationWarnings,
  pythonOpenVariants,
} from "./words.ts";
import type { PopulationWords } from "./words.ts";
import type { Project } from "../project.ts";
import { deepFreeze } from "../testSupport.ts";
import type { IndividualsTable } from "../../worker/protocol.ts";

/** The words of the diversity, of the distances between populations and
    of the LD decay (diversity.md, "The warnings"). */
const DIVERSITY: PopulationWords = {
  leftOutOf: "the diversity",
  notIn: "the table",
};
const DISTANCES: PopulationWords = {
  leftOutOf: "the distances",
  notIn: "the distances",
};
const LD_DECAY: PopulationWords = {
  leftOutOf: "the LD decay",
  notIn: "the plot",
};

/** The table of the worked example of the diversity: `i4` has no
    population, and `i5`, of C, is not in the variants file. */
const EXAMPLE_TABLE: IndividualsTable = {
  columns: ["name", "pop"],
  rows: [
    ["i1", "A"],
    ["i2", "B"],
    ["i3", "A"],
    ["i4", null],
    ["i5", "C"],
    ["i6", null],
    ["i7", "D"],
  ],
};

/** A project of population genetics, frozen deeply: `panel.nei` read with
    `individuals`, and `pops.csv` read with EXAMPLE_TABLE and its column
    `pop` chosen. */
function project(individuals: readonly string[]): Project {
  const table = EXAMPLE_TABLE;
  return deepFreeze<Project>({
    app: "popgen",
    variants: {
      fileId: "00112233445566778899aabbccddeeff",
      name: "panel.nei",
      size: 261_490,
      format: "nei",
      readOptions: null,
      read: { kind: "read", individuals, ploidy: 2, numVars: null },
    },
    filters: [],
    filtersOff: [],
    individualFilters: [],
    individualFiltersOff: [],
    individuals: {
      fileId: "ffeeddccbbaa99887766554433221100",
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
    grouping: { kind: "populations", column: "pop" },
    analyses: [],
    reference: null,
  });
}

describe("PA1 D2 the warnings of the populations", () => {
  test("with the diversity's words, populationWarnings gives the texts of stage 4", () => {
    // i4 has no population; B, whose individual is in the variants file,
    // is not in the result, and C, whose individual is not, is not named.
    const p = project(["i1", "i2", "i3", "i4"]);
    expect(populationWarnings(["A"], p, DIVERSITY)).toEqual([
      {
        code: "individualsWithoutPopulation",
        text: "1 individual of panel.nei has no population, and is left out of the diversity: i4. If it belongs to one, fill in its population in the metadata file and load it again.",
      },
      {
        code: "populationNotInResult",
        text: "Population B has no individual among the individuals of panel.nei that the filters kept, so it is not in the table.",
      },
    ]);
    expect(populationWarnings(["A", "B"], p, DIVERSITY)).toEqual([
      {
        code: "individualsWithoutPopulation",
        text: "1 individual of panel.nei has no population, and is left out of the diversity: i4. If it belongs to one, fill in its population in the metadata file and load it again.",
      },
    ]);
  });

  test("with two individuals and two populations, the texts are in the plural", () => {
    const p = project(["i1", "i2", "i4", "i6", "i7"]);
    expect(populationWarnings([], p, DIVERSITY)).toEqual([
      {
        code: "individualsWithoutPopulation",
        text: "2 individuals of panel.nei have no population, and are left out of the diversity: i4 and i6. If they belong to one, fill in their population in the metadata file and load it again.",
      },
      {
        code: "populationNotInResult",
        text: "Populations A, B and D have no individual among the individuals of panel.nei that the filters kept, so they are not in the table.",
      },
    ]);
  });

  test("with the words of the distances and of the LD decay, the texts end in theirs", () => {
    const p = project(["i1", "i2", "i3", "i4"]);
    expect(populationWarnings(["A"], p, DISTANCES)).toEqual([
      {
        code: "individualsWithoutPopulation",
        text: "1 individual of panel.nei has no population, and is left out of the distances: i4. If it belongs to one, fill in its population in the metadata file and load it again.",
      },
      {
        code: "populationNotInResult",
        text: "Population B has no individual among the individuals of panel.nei that the filters kept, so it is not in the distances.",
      },
    ]);
    expect(populationWarnings(["A"], p, LD_DECAY)).toEqual([
      {
        code: "individualsWithoutPopulation",
        text: "1 individual of panel.nei has no population, and is left out of the LD decay: i4. If it belongs to one, fill in its population in the metadata file and load it again.",
      },
      {
        code: "populationNotInResult",
        text: "Population B has no individual among the individuals of panel.nei that the filters kept, so it is not in the plot.",
      },
    ]);
  });

  test("with the words of the distances, a population left out for its size is in pops and is not named, and the name of the variants file is escaped", () => {
    // The distances pass the populations of their result and those left
    // out under the minimum, here B, which populationNotInResult does not
    // name; D, with no individual kept, it does.
    const base = project(["i1", "i2", "i3", "i4", "i7"]);
    if (base.variants === null) {
      throw new Error("the project of the test has a variants file");
    }
    const p = deepFreeze<Project>({
      ...base,
      variants: { ...base.variants, name: "a\tb.nei" },
    });
    expect(populationWarnings(["A", "B"], p, DISTANCES)).toEqual([
      {
        code: "individualsWithoutPopulation",
        text: "1 individual of a\\tb.nei has no population, and is left out of the distances: i4. If it belongs to one, fill in its population in the metadata file and load it again.",
      },
      {
        code: "populationNotInResult",
        text: "Population D has no individual among the individuals of a\\tb.nei that the filters kept, so it is not in the distances.",
      },
    ]);
  });

  test("gives none for the one population, without a metadata file and with the grouping onePopulation", () => {
    const withFile = project(["i1", "i2", "i4"]);
    const noFile = deepFreeze<Project>({ ...withFile, individuals: null });
    const onePopulation = deepFreeze<Project>({
      ...withFile,
      grouping: { kind: "onePopulation" },
    });
    for (const p of [noFile, onePopulation]) {
      expect(populationWarnings([], p, DIVERSITY)).toEqual([]);
      expect(populationWarnings(["All individuals"], p, LD_DECAY)).toEqual([]);
    }
  });

  test("gives none when every population of the variants file is in the result and every individual has one", () => {
    expect(
      populationWarnings(["A", "B"], project(["i1", "i2", "i3"]), DISTANCES),
    ).toEqual([]);
  });

  test("throws a defect on a variants file not read and on a project of association", () => {
    const p = project(["i1"]);
    const pending = deepFreeze<Project>({ ...p, variants: null });
    expect(() => populationWarnings([], pending, DIVERSITY)).toThrow(
      "popnei_web defect:",
    );
    const roles = deepFreeze<Project>({
      ...p,
      grouping: { kind: "roles", roles: [] },
    });
    expect(() => populationWarnings([], roles, DIVERSITY)).toThrow(
      "popnei_web defect:",
    );
    const rolesNoFile = deepFreeze<Project>({
      ...roles,
      app: "gwas",
      individuals: null,
    });
    expect(() => populationWarnings([], rolesNoFile, DIVERSITY)).toThrow(
      "popnei_web defect:",
    );
  });
});

describe("PA3 D4 percentOf", () => {
  test("5 of 1,152 is 1%, the rounding to 0 of a share above none", () => {
    expect(percentOf(5, 1152)).toBe("1%");
  });

  test("0 of 1,152 is 0%", () => {
    expect(percentOf(0, 1152)).toBe("0%");
  });

  test("1,151 of 1,152 is 99%, the rounding to 100 of a share below all, and 1,152 of 1,152 is 100%", () => {
    expect(percentOf(1151, 1152)).toBe("99%");
    expect(percentOf(1152, 1152)).toBe("100%");
  });

  test("641 of 1,152 is 56%, rounded to the nearest", () => {
    expect(percentOf(641, 1152)).toBe("56%");
  });
});

describe("PA3 D4 fourDecimals", () => {
  test("−0.1027 is written with the minus sign U+2212", () => {
    expect(fourDecimals(-0.10273588423661377)).toBe("\u22120.1027");
  });

  test("−0.00004, which rounds to 0, is written 0.0000, with no sign", () => {
    expect(fourDecimals(-0.00004)).toBe("0.0000");
  });

  test("0 is 0.0000, and 0.10962148955018115 is 0.1096", () => {
    expect(fourDecimals(0)).toBe("0.0000");
    expect(fourDecimals(0.10962148955018115)).toBe("0.1096");
  });
});

describe("PA10 csvField, a cell of text of every CSV of the application", () => {
  test("a name that starts with =, +, - or @ is written with a quote before it, so that a spreadsheet does not run it as a formula", () => {
    expect(csvField("=p1")).toBe("'=p1");
    expect(csvField("+p1")).toBe("'+p1");
    expect(csvField("-p1")).toBe("'-p1");
    expect(csvField("@p1")).toBe("'@p1");
    expect(csvField('=HYPERLINK("http://x")')).toBe(
      '"\'=HYPERLINK(""http://x"")"',
    );
    expect(csvField("=a,b")).toBe('"\'=a,b"');
  });

  test("a name that is a negative number is still a name, and has the quote", () => {
    expect(csvField("-1")).toBe("'-1");
    expect(csvField("-0.0128")).toBe("'-0.0128");
  });

  test("a name that holds one of the four after its first character, an empty one and a plain one are written as they are", () => {
    expect(csvField("p=1")).toBe("p=1");
    expect(csvField("p-1")).toBe("p-1");
    expect(csvField("a@b")).toBe("a@b");
    expect(csvField(" =p1")).toBe(" =p1");
    expect(csvField("")).toBe("");
    expect(csvField("p1")).toBe("p1");
    expect(csvField("'p1")).toBe("'p1");
  });

  test("a name with a comma, a quote or a new line is quoted as RFC 4180 has it", () => {
    expect(csvField('a,"b"')).toBe('"a,""b"""');
    expect(csvField("a\nb")).toBe('"a\nb"');
    expect(csvField("a\rb")).toBe('"a\rb"');
  });

  test("csvNumber writes a negative number as a number, with no quote before it", () => {
    expect(csvNumber(-0.0128)).toBe("-0.0128");
    expect(csvNumber(0.5)).toBe("0.5");
    expect(csvNumber(null)).toBe("");
  });
});

describe("the Python call that opens the variants file", () => {
  test("a .nei file is opened with open_vars, its name quoted as JSON quotes it", () => {
    expect(
      pythonOpenVariants({ name: 'my "panel".nei', readOptions: null }),
    ).toBe('popnei.open_vars("my \\"panel\\".nei")');
  });

  test("a VCF is opened with open_vcf and its ploidy and onlyPassed", () => {
    expect(
      pythonOpenVariants({
        name: "panel.vcf.gz",
        readOptions: { ploidy: 4, onlyPassed: true },
      }),
    ).toBe('popnei.open_vcf("panel.vcf.gz", ploidy=4, only_passed=True)');
    expect(
      pythonOpenVariants({
        name: "panel.vcf.gz",
        readOptions: { ploidy: 2, onlyPassed: false },
      }),
    ).toBe('popnei.open_vcf("panel.vcf.gz", ploidy=2, only_passed=False)');
  });

  test("a VCF with no ploidy given is opened with open_vcf and no ploidy, which popnei reads from the file", () => {
    expect(
      pythonOpenVariants({
        name: "tetraploid.vcf.gz",
        readOptions: { ploidy: null, onlyPassed: true },
      }),
    ).toBe('popnei.open_vcf("tetraploid.vcf.gz", only_passed=True)');
  });
});
