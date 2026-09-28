import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import { canonical } from "./keys.ts";
import type { JsonObject, JsonValue } from "./keys.ts";
import {
  FORMAT_VERSION,
  INDIVIDUAL_FILTER_ORDER,
  VARIANT_FILTER_ORDER,
  analysisOptions,
  emptyProject,
  freezeProject,
  counted,
  escaped,
  grouped,
  individualListNeeds,
  individualsCheck,
  individualsNeeds,
  jobFilters,
  loadIndividuals,
  loadVariants,
  namesOf,
  ordinal,
  parseProject,
  projectErrorText,
  projectNeeds,
  recordIndividualsRead,
  recordVariantsCounted,
  recordVariantsRead,
  removeIndividualFilter,
  removeIndividuals,
  setAnalysisOptions,
  setColumnType,
  setCsvOptions,
  setGrouping,
  setIndividualFilter,
  setVariantFilter,
  shown,
  turnOffIndividualFilter,
  turnOffVariantFilter,
  variantFilterNeeds,
  variantsStepNeeds,
  individualsStepMissing,
  individualsStepNeeds,
  ONE_POPULATION,
  populationsBeforeRun,
  populationsKept,
  populationsNeeds,
  populationsOf,
  populationsToRun,
} from "./project.ts";
import type {
  AppId,
  FieldPath,
  Grouping,
  IndividualsRead,
  ParsedAnalysis,
  Project,
  ProjectError,
  SourceError,
  SourceRead,
} from "./project.ts";
import type { Result } from "./result.ts";
import { MAX_UNDO_STEPS, commit, startHistory, undo } from "./history.ts";
import type {
  Cell,
  ColumnType,
  IndividualsFileError,
  IndividualsTable,
} from "../worker/protocol.ts";
import {
  SAMPLE_INDIVIDUALS_ID,
  SAMPLE_VARIANTS_ID,
  TEST_ANALYSES,
  deepFreeze,
  testAnalysis,
  drawnCommand,
  jsonObjectOf,
  sampleProject,
  wholeProject,
} from "./testSupport.ts";

const NEW_ID = "0123456789abcdef0123456789abcdef";

const PROJECT_FIELDS: readonly (keyof Project)[] = [
  "app",
  "variants",
  "filters",
  "filtersOff",
  "individualFilters",
  "individualFiltersOff",
  "individuals",
  "grouping",
  "analyses",
  "reference",
];

/** Asserts that `after` is a new project, and that every field of `before`
    but those of `changed` is the same object in it. */
function expectKept(
  before: Project,
  after: Project,
  changed: readonly (keyof Project)[],
): void {
  expect(after).not.toBe(before);
  for (const field of PROJECT_FIELDS) {
    if (!changed.includes(field)) {
      expect(after[field], field).toBe(before[field]);
    }
  }
}

/** The individuals file of a project, which the test expects to be
    there. */
function individualsOf(p: Project): NonNullable<Project["individuals"]> {
  if (p.individuals === null) {
    throw new Error(
      "popnei_web defect: the test expected an individuals file.",
    );
  }
  return p.individuals;
}

/** The sample project with the individuals file read from an xlsx. */
function xlsxProject(): Project {
  const p = sampleProject();
  return deepFreeze({
    ...p,
    individuals: { ...individualsOf(p), name: "pops.xlsx", csv: null },
  });
}

/** The sample project with no individuals file. */
function withoutIndividuals(): Project {
  return deepFreeze({ ...sampleProject(), individuals: null });
}

const DEFECT = /^popnei_web defect: /;

/** An object whose lists are nested so that it is `levels` levels deep,
    itself the first. */
function nested(levels: number): JsonObject {
  let value: JsonValue = [];
  for (let level = 2; level < levels; level++) {
    value = [value];
  }
  return levels === 1 ? {} : { x: value };
}

describe("WP1 D3 the commands", () => {
  describe("each command changes its part and keeps the others", () => {
    test("loadVariants puts a new load, pending", () => {
      const p = sampleProject();
      const q = loadVariants(p, {
        fileId: NEW_ID,
        name: "panel.vcf",
        size: 4096,
        format: "vcf",
        readOptions: { ploidy: 4, onlyPassed: true },
      });
      expect(q.variants).toEqual({
        fileId: NEW_ID,
        name: "panel.vcf",
        size: 4096,
        format: "vcf",
        readOptions: { ploidy: 4, onlyPassed: true },
        read: { kind: "pending" },
      });
      expectKept(p, q, ["variants"]);
    });

    test("setVariantFilter puts a new kind in the fixed order", () => {
      const p = sampleProject();
      const q = setVariantFilter(p, { kind: "obs_het", maxAllowedObsHet: 0.5 });
      expect(q.filters).toEqual([
        p.filters[0],
        { kind: "obs_het", maxAllowedObsHet: 0.5 },
        p.filters[1],
      ]);
      expect(q.filters[0]).toBe(p.filters[0]);
      expect(q.filters[2]).toBe(p.filters[1]);
      expectKept(p, q, ["filters"]);
    });

    test("turnOffVariantFilter takes the filter of its kind out of the filters on, into filtersOff", () => {
      const p = sampleProject();
      const q = turnOffVariantFilter(p, "maf");
      expect(q.filters).toEqual([
        { kind: "missing_data", maxAllowedMissingRate: 0.1 },
      ]);
      expect(q.filters[0]).toBe(p.filters[0]);
      expect(q.filtersOff).toEqual([{ kind: "maf", maxAllowedMaf: 0.95 }]);
      expectKept(p, q, ["filters", "filtersOff"]);
    });

    test("setIndividualFilter puts a new kind in the fixed order", () => {
      const p = sampleProject();
      const q = setIndividualFilter(p, {
        kind: "keep",
        individuals: ["i1", "i2"],
      });
      expect(q.individualFilters).toEqual([
        { kind: "keep", individuals: ["i1", "i2"] },
        ...p.individualFilters,
      ]);
      expect(q.individualFilters[1]).toBe(p.individualFilters[0]);
      expectKept(p, q, ["individualFilters"]);
    });

    test("removeIndividualFilter takes out the filter of its kind", () => {
      const p = sampleProject();
      const q = removeIndividualFilter(p, "remove");
      expect(q.individualFilters).toEqual([
        { kind: "missing_data", maxAllowedMissingRate: 0.2 },
      ]);
      expectKept(p, q, ["individualFilters"]);
    });

    test("loadIndividuals puts a new load, pending", () => {
      const p = sampleProject();
      const q = loadIndividuals(p, {
        fileId: NEW_ID,
        name: "pops.xlsx",
        csv: null,
      });
      expect(q.individuals).toEqual({
        fileId: NEW_ID,
        name: "pops.xlsx",
        csv: null,
        read: { kind: "pending" },
      });
      expectKept(p, q, ["individuals"]);
    });

    test("setCsvOptions sets the options and puts the read to pending", () => {
      const p = sampleProject();
      const csv = { encoding: "utf-8", separator: ";", decimal: "," } as const;
      const q = setCsvOptions(p, csv);
      expect(q.individuals).toEqual({
        fileId: SAMPLE_INDIVIDUALS_ID,
        name: "pops.csv",
        csv,
        read: { kind: "pending" },
      });
      expectKept(p, q, ["individuals"]);
    });

    test("setColumnType sets the type of one column", () => {
      const p = sampleProject();
      const q = setColumnType(p, "pop", { kind: "continuous" });
      const before = individualsOf(p).read;
      const after = individualsOf(q).read;
      if (before.kind !== "read" || after.kind !== "read") {
        throw new Error("popnei_web defect: the test expected a table read.");
      }
      expect(after.columns[1]).toEqual({ kind: "continuous" });
      for (const index of [0, 2, 3]) {
        expect(after.columns[index]).toBe(before.columns[index]);
      }
      expect(after.table).toBe(before.table);
      expect(after.found).toBe(before.found);
      expectKept(p, q, ["individuals"]);
    });

    test("removeIndividuals takes out the individuals file", () => {
      const p = sampleProject();
      const q = removeIndividuals(p);
      expect(q.individuals).toBeNull();
      expectKept(p, q, ["individuals"]);
    });

    test("setGrouping sets the column of the populations", () => {
      const p = sampleProject();
      const q = setGrouping(p, { kind: "populations", column: "sex" });
      expect(q.grouping).toEqual({ kind: "populations", column: "sex" });
      expectKept(p, q, ["grouping"]);
    });

    test("setAnalysisOptions replaces the options of an analysis", () => {
      const p = sampleProject();
      const q = setAnalysisOptions(p, testAnalysis("diversity"), {
        minNumInds: 10,
      });
      expect(q.analyses).toEqual([
        { analysis: "diversity", options: { minNumInds: 10 } },
      ]);
      expectKept(p, q, ["analyses"]);
    });
  });

  test.each([
    ["popgen", { kind: "populations", column: null }],
    ["gwas", { kind: "roles", roles: [] }],
  ] as const)("emptyProject of %s", (app, grouping) => {
    expect(emptyProject(app)).toStrictEqual({
      app,
      variants: null,
      filters: [],
      filtersOff: [],
      individualFilters: [],
      individualFiltersOff: [],
      individuals: null,
      grouping,
      analyses: [],
      reference: null,
    });
  });

  test("analysisOptions gives the entry of an analysis", () => {
    const p = sampleProject();
    expect(analysisOptions(p, "diversity", { minNumInds: 5 })).toBe(
      p.analyses[0]?.options,
    );
  });

  test("analysisOptions gives the defaults of an analysis with no entry", () => {
    const defaults = { numPrinComps: 10 };
    expect(analysisOptions(sampleProject(), "pca", defaults)).toBe(defaults);
  });

  test.each<[string, (p: Project) => Project, (() => Project)?]>([
    [
      "loadVariants",
      (p) =>
        loadVariants(p, {
          fileId: SAMPLE_VARIANTS_ID,
          name: "panel.nei",
          size: 1024,
          format: "nei",
          readOptions: null,
        }),
    ],
    [
      "setVariantFilter",
      (p) => setVariantFilter(p, { kind: "maf", maxAllowedMaf: 0.95 }),
    ],
    ["turnOffVariantFilter", (p) => turnOffVariantFilter(p, "ld")],
    [
      "setIndividualFilter",
      (p) => setIndividualFilter(p, { kind: "remove", individuals: ["i4"] }),
    ],
    ["removeIndividualFilter", (p) => removeIndividualFilter(p, "keep")],
    ["turnOffIndividualFilter", (p) => turnOffIndividualFilter(p, "obs_het")],
    [
      "loadIndividuals",
      (p) =>
        loadIndividuals(p, {
          fileId: SAMPLE_INDIVIDUALS_ID,
          name: "pops.csv",
          csv: { encoding: "auto", separator: "auto", decimal: "auto" },
        }),
    ],
    [
      "setCsvOptions",
      (p) =>
        setCsvOptions(p, {
          encoding: "auto",
          separator: "auto",
          decimal: "auto",
        }),
    ],
    [
      "setColumnType",
      (p) => setColumnType(p, "sex", { kind: "binary", one: "2", zero: "1" }),
    ],
    ["removeIndividuals", (p) => removeIndividuals(p), withoutIndividuals],
    [
      "setGrouping",
      (p) => setGrouping(p, { kind: "populations", column: "pop" }),
    ],
    [
      "setAnalysisOptions",
      (p) =>
        setAnalysisOptions(p, testAnalysis("diversity"), { minNumInds: 20 }),
    ],
  ])(
    "%s given the value already there gives the project itself",
    (_name, command, start = sampleProject) => {
      const p = start();
      expect(command(p)).toBe(p);
    },
  );

  describe("a value parseProject would refuse is a defect", () => {
    test("a threshold above 1", () => {
      expect(() =>
        setVariantFilter(sampleProject(), { kind: "maf", maxAllowedMaf: 1.5 }),
      ).toThrow(
        /^popnei_web defect: setVariantFilter .*\["filters",1,"maxAllowedMaf"\]/,
      );
    });

    test("a threshold that is NaN", () => {
      expect(() =>
        setIndividualFilter(sampleProject(), {
          kind: "obs_het",
          maxAllowedObsHet: Number.NaN,
        }),
      ).toThrow(
        /^popnei_web defect: setIndividualFilter .*\["individualFilters",2,"maxAllowedObsHet"\]/,
      );
    });

    test("a maxDist that is not a whole number", () => {
      expect(() =>
        setVariantFilter(sampleProject(), {
          kind: "ld",
          maxAllowedR2: 0.5,
          maxDist: 0.5,
        }),
      ).toThrow(
        /^popnei_web defect: setVariantFilter .*\["filters",2,"maxDist"\]/,
      );
    });

    test("a ploidy of 256", () => {
      expect(() =>
        loadVariants(sampleProject(), {
          fileId: NEW_ID,
          name: "panel.vcf",
          size: 1,
          format: "vcf",
          readOptions: { ploidy: 256, onlyPassed: true },
        }),
      ).toThrow(
        /^popnei_web defect: loadVariants .*\["variants","readOptions","ploidy"\]/,
      );
    });

    test("read options for a .nei", () => {
      expect(() =>
        loadVariants(sampleProject(), {
          fileId: NEW_ID,
          name: "panel.nei",
          size: 1,
          format: "nei",
          readOptions: { ploidy: 2, onlyPassed: true },
        }),
      ).toThrow(
        /^popnei_web defect: loadVariants .*\["variants","readOptions"\]/,
      );
    });

    test("a load id in upper case", () => {
      expect(() =>
        loadIndividuals(sampleProject(), {
          fileId: NEW_ID.toUpperCase(),
          name: "pops.csv",
          csv: null,
        }),
      ).toThrow(
        /^popnei_web defect: loadIndividuals .*\["individuals","fileId"\]/,
      );
    });
  });

  describe("the rows of the table of the commands", () => {
    test("turnOffVariantFilter of a kind not on gives the project itself", () => {
      const p = deepFreeze(emptyProject("popgen"));
      expect(turnOffVariantFilter(p, "maf")).toBe(p);
    });

    test("removeIndividualFilter of a kind not there gives the project itself", () => {
      const p = sampleProject();
      expect(removeIndividualFilter(p, "keep")).toBe(p);
    });

    test("removeIndividuals with no individuals file gives the project itself", () => {
      const p = deepFreeze(emptyProject("popgen"));
      expect(removeIndividuals(p)).toBe(p);
    });

    test("setCsvOptions with no individuals file is a defect", () => {
      const p = deepFreeze(emptyProject("popgen"));
      expect(() =>
        setCsvOptions(p, { encoding: "auto", separator: ",", decimal: "." }),
      ).toThrow(DEFECT);
    });

    test("setCsvOptions on an xlsx is a defect", () => {
      expect(() =>
        setCsvOptions(xlsxProject(), {
          encoding: "auto",
          separator: ",",
          decimal: ".",
        }),
      ).toThrow(DEFECT);
    });

    test("setColumnType with the file not read is a defect", () => {
      const p = deepFreeze(
        loadIndividuals(sampleProject(), {
          fileId: NEW_ID,
          name: "pops.csv",
          csv: null,
        }),
      );
      expect(() => setColumnType(p, "pop", { kind: "continuous" })).toThrow(
        DEFECT,
      );
    });

    test("setColumnType of a column not in the table is a defect", () => {
      expect(() =>
        setColumnType(sampleProject(), "breed", { kind: "categorical" }),
      ).toThrow(DEFECT);
    });

    test("setColumnType of identifier for another column than the first is a defect", () => {
      expect(() =>
        setColumnType(sampleProject(), "pop", { kind: "identifier" }),
      ).toThrow(
        /^popnei_web defect: setColumnType .*\["individuals","read","columns",1\]/,
      );
    });

    test("setColumnType of another type for the first column is a defect", () => {
      expect(() =>
        setColumnType(sampleProject(), "id", { kind: "categorical" }),
      ).toThrow(
        /^popnei_web defect: setColumnType .*\["individuals","read","columns",0\]/,
      );
    });

    test.each([
      ["values not of the column", "pop", 1, "P1", "P3"],
      ["one value twice", "sex", 2, "1", "1"],
      ["a column of three values", "height", 3, "1.52", "1.61"],
    ])(
      "setColumnType of binary with %s is a defect",
      (_why, column, index, one, zero) => {
        expect(() =>
          setColumnType(sampleProject(), column, { kind: "binary", one, zero }),
        ).toThrow(`"path":["individuals","read","columns",${String(index)}]`);
      },
    );

    test("setGrouping of the other application is a defect", () => {
      expect(() =>
        setGrouping(sampleProject(), {
          kind: "roles",
          roles: [["height", "trait"]],
        }),
      ).toThrow(/^popnei_web defect: setGrouping .*\["grouping","kind"\]/);
    });

    test("setAnalysisOptions with no entry adds one last, also of the defaults", () => {
      const p = sampleProject();
      const q = setAnalysisOptions(p, testAnalysis("pca"), {
        numPrinComps: 10,
      });
      expect(q.analyses).toEqual([
        ...p.analyses,
        { analysis: "pca", options: { numPrinComps: 10 } },
      ]);
      expect(q.analyses[0]).toBe(p.analyses[0]);
    });

    test("loadVariants of a new load keeps the settings and the reference", () => {
      const sample = sampleProject();
      const variants = sample.variants;
      if (variants === null) {
        throw new Error(
          "popnei_web defect: the test expected a variants file.",
        );
      }
      const p = deepFreeze({
        ...sample,
        reference: {
          variants,
          checks: [],
        },
      });
      const q = loadVariants(p, {
        fileId: NEW_ID,
        name: "panel.nei",
        size: 1024,
        format: "nei",
        readOptions: null,
      });
      expect(q.variants?.read).toEqual({ kind: "pending" });
      expectKept(p, q, ["variants"]);
    });

    test("loadIndividuals of a new load: the read pending, the grouping kept, the types gone", () => {
      const p = sampleProject();
      const q = loadIndividuals(p, {
        fileId: NEW_ID,
        name: "pops.csv",
        csv: { encoding: "auto", separator: "auto", decimal: "auto" },
      });
      expect(individualsOf(q).read).toEqual({ kind: "pending" });
      expect(q.grouping).toBe(p.grouping);
    });

    test("setCsvOptions of other options: the read pending, the grouping kept, the types gone", () => {
      const p = sampleProject();
      const q = setCsvOptions(p, {
        encoding: "windows-1252",
        separator: "\t",
        decimal: ",",
      });
      expect(individualsOf(q).read).toEqual({ kind: "pending" });
      expect(individualsOf(q).fileId).toBe(SAMPLE_INDIVIDUALS_ID);
      expect(q.grouping).toBe(p.grouping);
    });
  });

  test("any sequence of commands keeps one filter of each kind, the individuals' in their order", () => {
    fc.assert(
      fc.property(fc.array(drawnCommand, { maxLength: 20 }), (commands) => {
        let p = sampleProject();
        for (const command of commands) {
          const bound = command.bind(p);
          if (bound === null) {
            continue;
          }
          p = deepFreeze(bound(p));
          const kinds = p.filters.map((f) => f.kind);
          expect(new Set(kinds).size).toBe(kinds.length);
          const ranks = p.individualFilters.map((f) =>
            INDIVIDUAL_FILTER_ORDER.indexOf(f.kind),
          );
          expect(ranks).toEqual([...new Set(ranks)].toSorted((a, b) => a - b));
        }
      }),
    );
  });

  test("a command applied twice gives, the second time, the project it was given", () => {
    fc.assert(
      fc.property(fc.array(drawnCommand, { maxLength: 20 }), (commands) => {
        let p = sampleProject();
        for (const command of commands) {
          const bound = command.bind(p);
          if (bound === null) {
            continue;
          }
          const once = deepFreeze(bound(p));
          expect(bound(once), command.name).toBe(once);
          p = once;
        }
      }),
    );
  });

  test.each<[string, () => { q: Project; change: () => void }]>([
    [
      "setAnalysisOptions",
      () => {
        const options = { minNumInds: 10, pops: ["P1"] };
        const q = setAnalysisOptions(
          sampleProject(),
          testAnalysis("pca"),
          options,
        );
        return {
          q,
          change: () => {
            options.minNumInds = 99;
            options.pops.push("P2");
          },
        };
      },
    ],
    [
      "setAnalysisOptions over an entry",
      () => {
        const options = { minNumInds: 10 };
        const q = setAnalysisOptions(
          sampleProject(),
          testAnalysis("diversity"),
          options,
        );
        return { q, change: () => (options.minNumInds = 99) };
      },
    ],
    [
      "setVariantFilter",
      () => {
        const filter = { kind: "maf" as const, maxAllowedMaf: 0.5 };
        const q = setVariantFilter(sampleProject(), filter);
        return { q, change: () => (filter.maxAllowedMaf = 0.7) };
      },
    ],
    [
      "setIndividualFilter",
      () => {
        const filter = { kind: "keep" as const, individuals: ["i1"] };
        const q = setIndividualFilter(sampleProject(), filter);
        return { q, change: () => filter.individuals.push("i2") };
      },
    ],
    [
      "loadVariants",
      () => {
        const readOptions = { ploidy: 2, onlyPassed: true };
        const q = loadVariants(sampleProject(), {
          fileId: NEW_ID,
          name: "panel.vcf",
          size: 1,
          format: "vcf",
          readOptions,
        });
        return { q, change: () => (readOptions.ploidy = 4) };
      },
    ],
    [
      "loadIndividuals",
      () => {
        const csv = {
          encoding: "auto" as const,
          separator: "auto" as const,
          decimal: "auto" as const,
        };
        const q = loadIndividuals(sampleProject(), {
          fileId: NEW_ID,
          name: "pops.csv",
          csv,
        });
        return { q, change: () => Object.assign(csv, { separator: ";" }) };
      },
    ],
    [
      "setCsvOptions",
      () => {
        const csv = {
          encoding: "utf-8" as const,
          separator: "," as const,
          decimal: "." as const,
        };
        const q = setCsvOptions(sampleProject(), csv);
        return { q, change: () => Object.assign(csv, { separator: ";" }) };
      },
    ],
    [
      "setColumnType",
      () => {
        const type = { kind: "binary" as const, one: "1", zero: "2" };
        const q = setColumnType(sampleProject(), "sex", type);
        return { q, change: () => (type.one = "3") };
      },
    ],
    [
      "setGrouping",
      () => {
        const grouping = { kind: "populations" as const, column: "sex" };
        const q = setGrouping(sampleProject(), grouping);
        return { q, change: () => (grouping.column = "height") };
      },
    ],
  ])("%s keeps its own copy of what it was given", (_command, run) => {
    const { q, change } = run();
    const before = canonical(q, null);
    change();
    expect(canonical(q, null)).toBe(before);
  });

  test("freezeProject freezes every part of a project and gives it back", () => {
    const p = setVariantFilter(emptyProject("popgen"), {
      kind: "maf",
      maxAllowedMaf: 0.9,
    });
    expect(freezeProject(p)).toBe(p);
    expect(Object.isFrozen(p)).toBe(true);
    expect(Object.isFrozen(p.filters)).toBe(true);
    expect(Object.isFrozen(p.filters[0])).toBe(true);
    expect(Object.isFrozen(p.grouping)).toBe(true);
  });

  test("freezeProject does not walk a part already frozen", () => {
    const options = { list: [1] };
    const analyses = Object.freeze([{ analysis: "pca", options }]);
    const p = freezeProject({ ...emptyProject("popgen"), analyses });
    expect(Object.isFrozen(p)).toBe(true);
    expect(Object.isFrozen(options)).toBe(false);
  });

  describe("a value with a field more is the value already there", () => {
    test("setCsvOptions of the same options with a field more gives the project itself", () => {
      const p = sampleProject();
      const csv = {
        encoding: "auto",
        separator: "auto",
        decimal: "auto",
        comment: "#",
      } as const;
      expect(setCsvOptions(p, csv)).toBe(p);
    });

    test("setColumnType of the same type with a field more gives the project itself", () => {
      const p = sampleProject();
      const type = {
        kind: "binary",
        one: "2",
        zero: "1",
        note: "sex",
      } as const;
      expect(setColumnType(p, "sex", type)).toBe(p);
    });

    test("setGrouping of the same grouping with a field more gives the project itself", () => {
      const p = sampleProject();
      const grouping = {
        kind: "populations",
        column: "pop",
        colour: "red",
      } as const;
      expect(setGrouping(p, grouping)).toBe(p);
    });
  });

  describe("a load with the load id already there", () => {
    const vcf = {
      fileId: NEW_ID,
      name: "panel.vcf",
      size: 4096,
      format: "vcf",
      readOptions: { ploidy: 2, onlyPassed: true },
    } as const;

    test("loadVariants with the same fields gives the project itself", () => {
      const p = deepFreeze(loadVariants(sampleProject(), vcf));
      expect(
        loadVariants(p, {
          ...vcf,
          readOptions: { ploidy: 2, onlyPassed: true },
        }),
      ).toBe(p);
    });

    test.each([
      ["another ploidy", { readOptions: { ploidy: 4, onlyPassed: true } }],
      [
        "another choice of the variants that passed",
        { readOptions: { ploidy: 2, onlyPassed: false } },
      ],
      ["another name", { name: "panel2.vcf" }],
      ["another size", { size: 4097 }],
    ])("loadVariants with %s is a defect", (_what, change) => {
      const p = deepFreeze(loadVariants(sampleProject(), vcf));
      expect(() => loadVariants(p, { ...vcf, ...change })).toThrow(DEFECT);
    });

    test("loadIndividuals with other options is a defect", () => {
      expect(() =>
        loadIndividuals(sampleProject(), {
          fileId: SAMPLE_INDIVIDUALS_ID,
          name: "pops.csv",
          csv: { encoding: "auto", separator: ";", decimal: "auto" },
        }),
      ).toThrow(DEFECT);
    });
  });

  describe("setAnalysisOptions checks its analysis and its options", () => {
    const refusing = {
      id: "pca",
      parseOptions: (): Result<JsonObject, string> => ({
        ok: false,
        error: "a number of components from 1 to 10",
      }),
    };
    /** An analysis whose parseOptions accepts `options` as they are. */
    const accepting = (options: JsonObject): ParsedAnalysis => ({
      id: "pca",
      parseOptions: () => ({ ok: true, value: options }),
    });

    test("options its parseOptions refuses are a defect", () => {
      expect(() =>
        setAnalysisOptions(sampleProject(), refusing, { numPrinComps: 0 }),
      ).toThrow(DEFECT);
    });

    test("options that are not JSON are a defect, whatever its parseOptions says", () => {
      expect(() =>
        setAnalysisOptions(sampleProject(), accepting({ x: Number.NaN }), {
          x: Number.NaN,
        }),
      ).toThrow(DEFECT);
    });

    test("options nested deeper than 64 levels are a defect", () => {
      expect(() =>
        setAnalysisOptions(sampleProject(), accepting(nested(65)), nested(65)),
      ).toThrow(DEFECT);
    });

    test("options are checked as of the format this version writes", () => {
      const versions: number[] = [];
      const analysis = {
        id: "pca",
        parseOptions: (o: unknown, version: number) => {
          versions.push(version);
          return jsonObjectOf(o);
        },
      };
      setAnalysisOptions(sampleProject(), analysis, {});
      expect(versions).toEqual([FORMAT_VERSION]);
    });

    test("keeps the options its parseOptions gives back, the defaults filled in", () => {
      const filling = {
        id: "pca",
        parseOptions: (): Result<JsonObject, string> => ({
          ok: true,
          value: { numPrinComps: 10, scale: true },
        }),
      };
      const q = setAnalysisOptions(sampleProject(), filling, {
        numPrinComps: 10,
      });
      expect(q.analyses.at(-1)).toEqual({
        analysis: "pca",
        options: { numPrinComps: 10, scale: true },
      });
    });
  });

  test("loadVariants of a size below 0 is a defect", () => {
    expect(() =>
      loadVariants(sampleProject(), {
        fileId: NEW_ID,
        name: "panel.nei",
        size: -1,
        format: "nei",
        readOptions: null,
      }),
    ).toThrow(DEFECT);
  });

  test("setGrouping of roles that name a column twice is a defect", () => {
    const p = deepFreeze({ ...emptyProject("gwas") });
    expect(() =>
      setGrouping(p, {
        kind: "roles",
        roles: [
          ["height", "trait"],
          ["height", "covariate"],
        ],
      }),
    ).toThrow(DEFECT);
  });

  test("setColumnType reads a few cells of a binary column of many values, not all", () => {
    let reads = 0;
    const rows = Array.from(
      { length: 1000 },
      (_, row) =>
        new Proxy(["i" + String(row), "P1", String(row), null], {
          get(target, key, receiver): unknown {
            if (key === "2") {
              reads += 1;
            }
            return Reflect.get(target, key, receiver);
          },
        }),
    );
    const sample = sampleProject();
    const individuals = individualsOf(sample);
    const p: Project = {
      ...sample,
      individuals: {
        ...individuals,
        read: {
          kind: "read",
          table: { columns: ["id", "pop", "sex", "height"], rows },
          columns: [
            { kind: "identifier" },
            { kind: "categorical" },
            { kind: "categorical" },
            { kind: "continuous" },
          ],
          found: null,
        },
      },
    };
    expect(() =>
      setColumnType(p, "sex", { kind: "binary", one: "1", zero: "0" }),
    ).toThrow(DEFECT);
    expect(reads).toBeLessThan(10);
  });

  test.each([
    ["encoding", { encoding: "utf-8" }],
    ["separator", { separator: ";" }],
    ["decimal", { decimal: "," }],
  ] as const)(
    "setCsvOptions with another %s puts the read to pending",
    (_field, change) => {
      const p = sampleProject();
      const csv = {
        encoding: "auto",
        separator: "auto",
        decimal: "auto",
        ...change,
      } as const;
      expect(individualsOf(setCsvOptions(p, csv)).read).toEqual({
        kind: "pending",
      });
    },
  );
});

/** The sample project with a new load of each file, both pending. */
function pendingProject(): Project {
  let p = loadVariants(sampleProject(), {
    fileId: NEW_ID,
    name: "panel.vcf",
    size: 4096,
    format: "vcf",
    readOptions: { ploidy: 2, onlyPassed: true },
  });
  p = loadIndividuals(p, { fileId: NEW_ID, name: "pops.csv", csv: CSV });
  return deepFreeze(p);
}

const CSV = { encoding: "auto", separator: "auto", decimal: "auto" } as const;

const VARIANTS_READ: SourceRead = {
  kind: "read",
  individuals: ["i1", "i2"],
  ploidy: 2,
  numVars: null,
};

const INDIVIDUALS_READ: IndividualsRead = {
  kind: "read",
  table: {
    columns: ["id", "pop"],
    rows: [
      ["i1", "P1"],
      ["i2", "P2"],
    ],
  },
  columns: [{ kind: "identifier" }, { kind: "categorical" }],
  found: {
    encoding: "utf-8",
    separator: ",",
    decimal: ".",
    undecodedLine: null,
  },
};

const OTHER_ID = "abcdefabcdefabcdefabcdefabcdefab";

/** The sample project with the read of its variants file replaced. */
function withVariantsRead(read: SourceRead): Project {
  const p = sampleProject();
  if (p.variants === null) {
    throw new Error("popnei_web defect: the test expected a variants file.");
  }
  return deepFreeze({ ...p, variants: { ...p.variants, read } });
}

/** The sample project with the variants file read with these
    individuals, in this order. */
function withVariantIndividuals(individuals: readonly string[]): Project {
  return withVariantsRead({
    kind: "read",
    individuals,
    ploidy: 2,
    numVars: null,
  });
}

/** The sample project with these filters of the individuals. */
function withLists(individualFilters: Project["individualFilters"]): Project {
  return deepFreeze({ ...sampleProject(), individualFilters });
}

/** The reason `individualListNeeds` gives, or `null`. */
function listReason(p: Project): string | null {
  return individualListNeeds(p)?.reason ?? null;
}

/** The sample project with the read of its individuals file replaced. */
function withIndividualsRead(read: IndividualsRead): Project {
  const p = sampleProject();
  return deepFreeze({ ...p, individuals: { ...individualsOf(p), read } });
}

describe("WP1 D4 the records and the needs", () => {
  describe("recordVariantsRead", () => {
    test("records the read into the variants file of its load", () => {
      const p = pendingProject();
      const q = recordVariantsRead(p, NEW_ID, VARIANTS_READ);
      expect(q.variants).toEqual({ ...p.variants, read: VARIANTS_READ });
      expectKept(p, q, ["variants"]);
    });

    test("gives the project itself for another load", () => {
      const p = pendingProject();
      expect(recordVariantsRead(p, OTHER_ID, VARIANTS_READ)).toBe(p);
    });

    test("gives the project itself for a read already recorded", () => {
      const p = deepFreeze(
        recordVariantsRead(pendingProject(), NEW_ID, VARIANTS_READ),
      );
      expect(
        recordVariantsRead(p, NEW_ID, { ...VARIANTS_READ, ploidy: 4 }),
      ).toBe(p);
    });
  });

  describe("recordVariantsCounted", () => {
    test("records the number of variants into the file of its load", () => {
      const p = deepFreeze(
        recordVariantsRead(pendingProject(), NEW_ID, VARIANTS_READ),
      );
      const q = recordVariantsCounted(p, NEW_ID, 1203554);
      expect(q.variants?.read).toEqual({ ...VARIANTS_READ, numVars: 1203554 });
      expect(q.variants?.fileId).toBe(NEW_ID);
      expectKept(p, q, ["variants"]);
    });

    test("gives the project itself for another load", () => {
      const p = deepFreeze(
        recordVariantsRead(pendingProject(), NEW_ID, VARIANTS_READ),
      );
      expect(recordVariantsCounted(p, OTHER_ID, 10)).toBe(p);
    });

    test("gives the project itself for a file not read yet", () => {
      const p = pendingProject();
      expect(recordVariantsCounted(p, NEW_ID, 10)).toBe(p);
    });

    test("gives the project itself when the number is set already", () => {
      const p = deepFreeze(
        recordVariantsCounted(
          recordVariantsRead(pendingProject(), NEW_ID, VARIANTS_READ),
          NEW_ID,
          10,
        ),
      );
      expect(recordVariantsCounted(p, NEW_ID, 11)).toBe(p);
    });
  });

  describe("recordIndividualsRead", () => {
    test("records the read into the individuals file of its load", () => {
      const p = pendingProject();
      const q = recordIndividualsRead(p, NEW_ID, CSV, INDIVIDUALS_READ);
      expect(q.individuals).toEqual({
        ...p.individuals,
        read: INDIVIDUALS_READ,
      });
      expectKept(p, q, ["individuals"]);
    });

    test("records the read of an xlsx, read with no options", () => {
      const p = deepFreeze(
        loadIndividuals(sampleProject(), {
          fileId: NEW_ID,
          name: "pops.xlsx",
          csv: null,
        }),
      );
      const read = { ...INDIVIDUALS_READ, found: null };
      expect(
        recordIndividualsRead(p, NEW_ID, null, read).individuals?.read,
      ).toBe(read);
    });

    test("gives the project itself for another load", () => {
      const p = pendingProject();
      expect(recordIndividualsRead(p, OTHER_ID, CSV, INDIVIDUALS_READ)).toBe(p);
    });

    test("gives the project itself for a read already recorded", () => {
      const p = deepFreeze(
        recordIndividualsRead(pendingProject(), NEW_ID, CSV, INDIVIDUALS_READ),
      );
      expect(
        recordIndividualsRead(p, NEW_ID, CSV, {
          kind: "failed",
          error: { kind: "empty" },
        }),
      ).toBe(p);
    });

    test("gives the project itself for a read of other options", () => {
      const p = pendingProject();
      expect(
        recordIndividualsRead(
          p,
          NEW_ID,
          { ...CSV, separator: ";" },
          INDIVIDUALS_READ,
        ),
      ).toBe(p);
    });

    test("records the read of the options set since, and drops the earlier one", () => {
      const p = deepFreeze(
        setCsvOptions(pendingProject(), { ...CSV, separator: ";" }),
      );
      expect(recordIndividualsRead(p, NEW_ID, CSV, INDIVIDUALS_READ)).toBe(p);
      const q = recordIndividualsRead(
        p,
        NEW_ID,
        { ...CSV, separator: ";" },
        INDIVIDUALS_READ,
      );
      expect(q.individuals?.read).toBe(INDIVIDUALS_READ);
    });
  });

  test("two picks of files before the first read comes back: the first read changes nothing", () => {
    const first = "11111111111111111111111111111111";
    const second = "22222222222222222222222222222222";
    const load = (p: Project, fileId: string): Project =>
      deepFreeze(
        loadVariants(p, {
          fileId,
          name: "panel.nei",
          size: 1024,
          format: "nei",
          readOptions: null,
        }),
      );
    const p = load(load(deepFreeze(emptyProject("popgen")), first), second);
    expect(recordVariantsRead(p, first, VARIANTS_READ)).toBe(p);
    expect(recordVariantsRead(p, second, VARIANTS_READ).variants?.read).toBe(
      VARIANTS_READ,
    );
  });

  test("a worker that could not start: the read is recorded as failed with its error, and a read after the restart replaces it", () => {
    const p = pendingProject();
    const read: SourceRead = {
      kind: "failed",
      error: {
        kind: "worker",
        error: { kind: "couldNotStart", reason: "no ready message, twice" },
      },
    };
    const q = deepFreeze(recordVariantsRead(p, NEW_ID, read));
    expect(q.variants?.read).toBe(read);
    const r = recordVariantsRead(q, NEW_ID, VARIANTS_READ);
    expect(r.variants?.read).toBe(VARIANTS_READ);
    expectKept(q, r, ["variants"]);
  });

  describe("a read after a failure of the worker", () => {
    const WORKER_ERRORS = [
      { kind: "workerFailed", message: "out of memory" },
      { kind: "defect", message: "a message that did not validate" },
      { kind: "protocolMismatch" },
      { kind: "couldNotStart", reason: "no ready message, twice" },
    ] as const;

    /** The pending project with the variants file failed with `error`. */
    function variantsFailed(error: SourceError): Project {
      return deepFreeze(
        recordVariantsRead(pendingProject(), NEW_ID, { kind: "failed", error }),
      );
    }

    /** The pending project with the individuals file failed with
        `error`, read with the options CSV. */
    function individualsFailed(
      error: Extract<IndividualsRead, { kind: "failed" }>["error"],
    ): Project {
      return deepFreeze(
        recordIndividualsRead(pendingProject(), NEW_ID, CSV, {
          kind: "failed",
          error,
        }),
      );
    }

    test.each(WORKER_ERRORS)(
      "a read of the variants file replaces a failure %o",
      (error) => {
        const p = variantsFailed({ kind: "worker", error });
        expect(p.variants?.read.kind).toBe("failed");
        expect(
          recordVariantsRead(p, NEW_ID, VARIANTS_READ).variants?.read,
        ).toBe(VARIANTS_READ);
      },
    );

    test("a failure of the worker replaces one of the variants file", () => {
      const p = variantsFailed({
        kind: "worker",
        error: { kind: "workerFailed", message: "out of memory" },
      });
      const read: SourceRead = {
        kind: "failed",
        error: { kind: "worker", error: { kind: "protocolMismatch" } },
      };
      expect(recordVariantsRead(p, NEW_ID, read).variants?.read).toBe(read);
    });

    test("a refusal of popnei is not replaced", () => {
      const p = variantsFailed({ kind: "popnei", message: "no header line" });
      expect(recordVariantsRead(p, NEW_ID, VARIANTS_READ)).toBe(p);
    });

    test("a failure of the variants file of another load is not replaced", () => {
      const p = variantsFailed({
        kind: "worker",
        error: { kind: "workerFailed", message: "out of memory" },
      });
      expect(recordVariantsRead(p, OTHER_ID, VARIANTS_READ)).toBe(p);
    });

    test.each(WORKER_ERRORS)(
      "a read of the individuals file with the same options replaces a failure %o",
      (error) => {
        const p = individualsFailed({ kind: "worker", error });
        expect(p.individuals?.read.kind).toBe("failed");
        expect(
          recordIndividualsRead(p, NEW_ID, CSV, INDIVIDUALS_READ).individuals
            ?.read,
        ).toBe(INDIVIDUALS_READ);
      },
    );

    test("a read of the individuals file with other options does not replace a failure", () => {
      const p = individualsFailed({
        kind: "worker",
        error: { kind: "workerFailed", message: "out of memory" },
      });
      expect(
        recordIndividualsRead(
          p,
          NEW_ID,
          { ...CSV, separator: ";" },
          INDIVIDUALS_READ,
        ),
      ).toBe(p);
      expect(recordIndividualsRead(p, OTHER_ID, CSV, INDIVIDUALS_READ)).toBe(p);
    });

    test.each([
      { kind: "empty" },
      { kind: "raggedRow", line: 7, expected: 4, found: 3, separator: "," },
      { kind: "files", message: "not an xlsx file" },
    ] as const)("a refusal of the reader, %o, is not replaced", (error) => {
      const p = individualsFailed(error);
      expect(recordIndividualsRead(p, NEW_ID, CSV, INDIVIDUALS_READ)).toBe(p);
    });

    test("options A, then B, then A: the read of A that succeeds after one that failed is recorded", () => {
      const p = deepFreeze(
        setCsvOptions(
          deepFreeze(
            setCsvOptions(pendingProject(), { ...CSV, separator: ";" }),
          ),
          CSV,
        ),
      );
      const failed = deepFreeze(
        recordIndividualsRead(p, NEW_ID, CSV, {
          kind: "failed",
          error: {
            kind: "worker",
            error: { kind: "workerFailed", message: "the worker crashed" },
          },
        }),
      );
      expect(individualsNeeds(failed)).toMatch(/could not be read/);
      const read = recordIndividualsRead(failed, NEW_ID, CSV, INDIVIDUALS_READ);
      expect(read.individuals?.read).toBe(INDIVIDUALS_READ);
      expectKept(failed, read, ["individuals"]);
    });
  });

  test("recordIndividualsRead records a read whose options have a field more", () => {
    const p = pendingProject();
    const csv = { ...CSV, comment: "#" };
    expect(
      recordIndividualsRead(p, NEW_ID, csv, INDIVIDUALS_READ).individuals?.read,
    ).toBe(INDIVIDUALS_READ);
  });

  test.each([
    [
      "a column named twice",
      {
        ...INDIVIDUALS_READ,
        table: { columns: ["id", "id"], rows: [["i1", "P1"]] },
      },
    ],
    [
      "an individual in two rows",
      {
        ...INDIVIDUALS_READ,
        table: {
          columns: ["id", "pop"],
          rows: [
            ["i1", "P1"],
            ["i1", "P2"],
          ],
        },
      },
    ],
    ["what was found of a CSV, for an xlsx", INDIVIDUALS_READ],
  ] as const)(
    "recordIndividualsRead records a read with %s as a defect of the reader",
    (what, read) => {
      const xlsx = what.includes("xlsx");
      const p = deepFreeze(
        loadIndividuals(sampleProject(), {
          fileId: NEW_ID,
          name: xlsx ? "pops.xlsx" : "pops.csv",
          csv: xlsx ? null : CSV,
        }),
      );
      const recorded = recordIndividualsRead(p, NEW_ID, xlsx ? null : CSV, read)
        .individuals?.read;
      expect(recorded).toMatchObject({
        kind: "failed",
        error: { kind: "worker", error: { kind: "defect" } },
      });
    },
  );

  test.each([
    ["encoding", { encoding: "utf-8" }],
    ["separator", { separator: ";" }],
    ["decimal", { decimal: "," }],
  ] as const)(
    "recordIndividualsRead drops a read of another %s",
    (_field, change) => {
      const p = pendingProject();
      expect(
        recordIndividualsRead(
          p,
          NEW_ID,
          { ...CSV, ...change },
          INDIVIDUALS_READ,
        ),
      ).toBe(p);
    },
  );

  describe("projectNeeds", () => {
    test("an empty project: load a variants file", () => {
      expect(projectNeeds(deepFreeze(emptyProject("popgen")))).toBe(
        "Load a variants file in the Variants step.",
      );
    });

    test("a project whose variants file is read and whose lists are right needs nothing", () => {
      expect(projectNeeds(sampleProject())).toBeNull();
      expect(
        projectNeeds(
          withLists([
            { kind: "keep", individuals: ["i1", "i2", "i3"] },
            { kind: "remove", individuals: ["i3"] },
          ]),
        ),
      ).toBeNull();
    });

    test("the variants file being read", () => {
      expect(projectNeeds(pendingProject())).toBe("Reading panel.vcf.");
    });

    test("popnei refused the file: its message, and load a variants file", () => {
      expect(
        projectNeeds(
          withVariantsRead({
            kind: "failed",
            error: { kind: "popnei", message: "the file has no header line" },
          }),
        ),
      ).toBe(
        "popnei could not read panel.nei: the file has no header line. Load a variants file in the Variants step.",
      );
    });

    test("a message of popnei that ends with a full stop is shown without it", () => {
      expect(
        projectNeeds(
          withVariantsRead({
            kind: "failed",
            error: { kind: "popnei", message: "ploidy 0 is not valid." },
          }),
        ),
      ).toBe(
        "popnei could not read panel.nei: ploidy 0 is not valid. Load a variants file in the Variants step.",
      );
    });

    test("a worker that could not start: the reason says so, not that the file is being read", () => {
      const read: SourceRead = {
        kind: "failed",
        error: {
          kind: "worker",
          error: { kind: "couldNotStart", reason: "no ready message, twice" },
        },
      };
      const p = deepFreeze(recordVariantsRead(pendingProject(), NEW_ID, read));
      expect(projectNeeds(p)).toBe(
        "panel.vcf could not be read: the application could not start its calculations. Reload the page and load it again.",
      );
    });

    test.each([
      [
        { kind: "workerFailed", message: "out of memory" },
        "the calculation stopped unexpectedly. Load it again in the Variants step.",
      ],
      [
        { kind: "defect", message: "a message that did not validate" },
        "the calculation stopped unexpectedly. Load it again in the Variants step.",
      ],
      [
        { kind: "files", message: "not an xlsx file" },
        "the calculation stopped unexpectedly. Load it again in the Variants step.",
      ],
      [
        { kind: "couldNotStart", reason: "no ready message, twice" },
        "the application could not start its calculations. Reload the page and load it again.",
      ],
      [
        { kind: "protocolMismatch" },
        "the page is out of date. Reload the page and load it again.",
      ],
    ] as const)(
      "the worker failed with %o: what happened, and what to do",
      (error, words) => {
        expect(
          projectNeeds(
            withVariantsRead({
              kind: "failed",
              error: { kind: "worker", error },
            }),
          ),
        ).toBe(`panel.nei could not be read: ${words}`);
      },
    );

    test.each(["keep", "remove"] as const)(
      "an empty list of individuals to %s",
      (kind) => {
        expect(listReason(withLists([{ kind, individuals: [] }]))).toBe(
          `The list of individuals to ${kind} is empty. Add individuals to it, or remove the filter, in the Variants step.`,
        );
      },
    );

    test("a list that names an individual more than once", () => {
      expect(
        listReason(
          withLists([{ kind: "remove", individuals: ["i1", "i3", "i1"] }]),
        ),
      ).toBe(
        "The list of individuals to remove names i1 more than once. Change the list, or remove the filter, in the Variants step.",
      );
    });

    test("a list that repeats several individuals names each once, in the order of the list", () => {
      expect(
        listReason(
          withLists([
            { kind: "keep", individuals: ["i3", "i1", "i2", "i1", "i3"] },
          ]),
        ),
      ).toBe(
        "The list of individuals to keep names i3 and i1 more than once. Change the list, or remove the filter, in the Variants step.",
      );
    });

    test("a name written three times is said more than once", () => {
      expect(
        listReason(
          withLists([{ kind: "keep", individuals: ["i2", "i2", "i2"] }]),
        ),
      ).toBe(
        "The list of individuals to keep names i2 more than once. Change the list, or remove the filter, in the Variants step.",
      );
    });

    test("a list that names 1 individual not in the variants: the singular", () => {
      expect(
        listReason(withLists([{ kind: "keep", individuals: ["i1", "x9"] }])),
      ).toBe(
        "The list of individuals to keep names 1 individual that is not in panel.nei: x9. Change the list, or remove the filter, in the Variants step.",
      );
    });

    test.each([
      [["x1", "x2"], "2 individuals that are not in panel.nei: x1 and x2"],
      [
        ["x1", "x2", "x3"],
        "3 individuals that are not in panel.nei: x1, x2 and x3",
      ],
      [
        ["x1", "x2", "x3", "x4"],
        "4 individuals that are not in panel.nei: x1, x2 and 2 more",
      ],
    ] as const)(
      "a list that names individuals not in the variants: %o",
      (names, words) => {
        expect(
          listReason(withLists([{ kind: "remove", individuals: names }])),
        ).toBe(
          `The list of individuals to remove names ${words}. Change the list, or remove the filter, in the Variants step.`,
        );
      },
    );

    test("the individuals not in the variants are named in the order of the list, and a large count has commas", () => {
      const names = Array.from(
        { length: 1205 },
        (_, i) => `x${String(1205 - i)}`,
      );
      expect(
        listReason(
          withLists([{ kind: "keep", individuals: ["i1", ...names] }]),
        ),
      ).toBe(
        "The list of individuals to keep names 1,205 individuals that are not in panel.nei: x1205, x1204 and 1,203 more. Change the list, or remove the filter, in the Variants step.",
      );
    });

    test("a name is shown with its control characters escaped and cut at 40 characters", () => {
      expect(
        listReason(
          withLists([
            { kind: "keep", individuals: ["i1", "x\n1", "a".repeat(45)] },
          ]),
        ),
      ).toContain(`: x\\n1 and ${"a".repeat(40)}…. Change the list`);
    });

    test("of 4 names, the first is shown escaped", () => {
      expect(
        listReason(
          withLists([
            { kind: "keep", individuals: ["x\u00071", "x2", "x3", "x4"] },
          ]),
        ),
      ).toContain(": x\\u00071, x2 and 2 more. Change the list");
    });

    test("the individuals not in the variants are named in the order of the list, not sorted", () => {
      expect(
        listReason(
          withLists([{ kind: "remove", individuals: ["x9", "x1", "x5"] }]),
        ),
      ).toContain(": x9, x1 and x5. Change the list");
    });

    test("the list to keep is named before the list to remove", () => {
      expect(
        listReason(
          withLists([
            { kind: "keep", individuals: ["i1", "x9"] },
            { kind: "remove", individuals: [] },
          ]),
        ),
      ).toMatch(/^The list of individuals to keep names 1 individual/);
    });

    test("the list to remove is named when the list to keep is right", () => {
      expect(
        listReason(
          withLists([
            { kind: "keep", individuals: ["i1", "i2"] },
            { kind: "remove", individuals: ["x9"] },
          ]),
        ),
      ).toMatch(/^The list of individuals to remove names 1 individual/);
    });

    test("names repeated are named before names not in the variants", () => {
      expect(
        listReason(
          withLists([{ kind: "keep", individuals: ["x8", "i1", "i1"] }]),
        ),
      ).toBe(
        "The list of individuals to keep names i1 more than once. Change the list, or remove the filter, in the Variants step.",
      );
    });

    test("the filters by thresholds are not looked at", () => {
      expect(
        listReason(
          withLists([
            { kind: "missing_data", maxAllowedMissingRate: 0 },
            { kind: "obs_het", maxAllowedObsHet: 0 },
          ]),
        ),
      ).toBeNull();
    });

    test("the variants file is named before the lists", () => {
      const p = deepFreeze({
        ...pendingProject(),
        individualFilters: [{ kind: "keep" as const, individuals: [] }],
      });
      expect(projectNeeds(p)).toBe("Reading panel.vcf.");
    });
  });

  describe("how names are shown", () => {
    /** The names of a list of individuals to keep, none in the variants,
        as the reason of individualListNeeds shows them. */
    function namesShown(...names: readonly string[]): string {
      const reason =
        listReason(withLists([{ kind: "keep", individuals: names }])) ?? "";
      return reason.slice(
        reason.indexOf(": ") + 2,
        reason.indexOf(". Change the list"),
      );
    }

    test.each([
      ["a quote", 'ind "7"', 'ind "7"'],
      ["a backslash", "ind\\7", "ind\\7"],
      ["a new line", "ind\n7", "ind\\n7"],
      ["a tab", "ind\t7", "ind\\t7"],
      ["a carriage return", "ind\r7", "ind\\r7"],
      ["a character of code 0", "ind\u00007", "ind\\u00007"],
      ["a bell", "ind\u00077", "ind\\u00077"],
      ["the delete character", "ind\u007f7", "ind\\u007f7"],
      ["a mark that reverses the text, U+202E", "ind\u202e7", "ind\\u202e7"],
      ["a mark of left to right, U+200E", "ind\u200e7", "ind\\u200e7"],
      ["an isolate of the direction, U+2066", "ind\u20667", "ind\\u20667"],
      ["a tag beyond four digits, U+E0001", "ind\u{e0001}7", "ind\\u{e0001}7"],
      ["half of a pair, alone", "ind\ud8007", "ind\\ud8007"],
      ["a letter beyond four digits", "ind\u{1d49c}7", "ind\u{1d49c}7"],
      ["an accented letter", "índ_7", "índ_7"],
    ])("a name with %s", (_what, name, text) => {
      expect(namesShown(name)).toBe(text);
    });

    test("a name is cut after 40 of its characters, an escape counting as one", () => {
      expect(namesShown(`${"a".repeat(39)}\nbbb`)).toBe(
        `${"a".repeat(39)}\\n…`,
      );
      expect(namesShown(`${"a".repeat(38)}\u202ebbb`)).toBe(
        `${"a".repeat(38)}\\u202eb…`,
      );
      expect(namesShown("a".repeat(40))).toBe("a".repeat(40));
    });

    test("the name of the variants file is escaped, and not cut", () => {
      const p = pendingProject();
      const name = `pa\nnel\u0007${"x".repeat(50)}.nei`;
      if (p.variants === null) {
        throw new Error(
          "popnei_web defect: the test expected a variants file.",
        );
      }
      expect(
        projectNeeds(deepFreeze({ ...p, variants: { ...p.variants, name } })),
      ).toBe(`Reading pa\\nnel\\u0007${"x".repeat(50)}.nei.`);
    });

    test("the name of the individuals file is escaped", () => {
      const p = pendingProject();
      expect(
        individualsNeeds(
          deepFreeze({
            ...p,
            individuals: { ...individualsOf(p), name: 'pops "\u202e".csv' },
          }),
        ),
      ).toBe('Reading pops "\\u202e".csv.');
    });

    test("the id of an unknown analysis shows its quotes as they are", () => {
      expect(
        projectErrorText({ kind: "unknownAnalysis", id: 'div"x' }),
      ).toContain('the analysis div"x, which');
    });
  });

  describe("an empty name, and an empty message", () => {
    test("an empty name not in the variants", () => {
      expect(
        listReason(withLists([{ kind: "keep", individuals: ["i1", ""] }])),
      ).toBe(
        "The list of individuals to keep names 1 individual that is not in panel.nei: an empty name. Change the list, or remove the filter, in the Variants step.",
      );
    });

    test("an empty name repeated", () => {
      expect(
        listReason(withLists([{ kind: "remove", individuals: ["", ""] }])),
      ).toBe(
        "The list of individuals to remove names an empty name more than once. Change the list, or remove the filter, in the Variants step.",
      );
    });

    test("an empty name of the variants missing from the individuals file", () => {
      expect(individualsNeeds(withVariantIndividuals(["i1", ""]))).toBe(
        "1 individual of panel.nei is not in pops.csv: an empty name. Add it to the file and load the file again in the Individuals step.",
      );
    });

    test.each([
      [{ kind: "duplicateColumn", name: "" }, "two columns have an empty name"],
      [
        { kind: "duplicateIndividual", name: "" },
        "two rows have an empty name",
      ],
    ] as const)("the reader refused the file, %o", (error, found) => {
      expect(
        individualsNeeds(withIndividualsRead({ kind: "failed", error })),
      ).toBe(
        `pops.csv could not be read: ${found}. Load a metadata file in the Individuals step.`,
      );
    });

    test.each(["", "  ", "."])(
      "a message of popnei %o is left out with its colon",
      (message) => {
        expect(
          projectNeeds(
            withVariantsRead({
              kind: "failed",
              error: { kind: "popnei", message },
            }),
          ),
        ).toBe(
          "popnei could not read panel.nei. Load a variants file in the Variants step.",
        );
      },
    );

    test("an empty message of the files wasm is left out with its colon", () => {
      expect(
        individualsNeeds(
          withIndividualsRead({
            kind: "failed",
            error: { kind: "files", message: "" },
          }),
        ),
      ).toBe(
        "pops.csv could not be read. Load a metadata file in the Individuals step.",
      );
    });
  });

  describe("individualsNeeds", () => {
    test("no individuals file", () => {
      expect(individualsNeeds(withoutIndividuals())).toBeNull();
    });

    test("a file with every individual of the variants, and one more, needs nothing", () => {
      expect(individualsNeeds(sampleProject())).toBeNull();
      expect(individualsNeeds(withVariantIndividuals(["i3", "i1"]))).toBeNull();
    });

    test("the individuals file being read", () => {
      expect(individualsNeeds(pendingProject())).toBe("Reading pops.csv.");
    });

    test("the files wasm refused the file: its message, and load an individuals file", () => {
      expect(
        individualsNeeds(
          withIndividualsRead({
            kind: "failed",
            error: { kind: "files", message: "the file is not an xlsx file." },
          }),
        ),
      ).toBe(
        "pops.csv could not be read: the file is not an xlsx file. Load a metadata file in the Individuals step.",
      );
    });

    test.each([
      [{ kind: "empty" }, "it has no row of individuals"],
      [{ kind: "duplicateColumn", name: "pop" }, "two columns are named pop"],
      [
        { kind: "duplicateIndividual", name: "ind_031" },
        "the individual ind_031 is in two rows",
      ],
      [
        { kind: "raggedRow", line: 7, expected: 4, found: 3, separator: "," },
        "line 7 has 3 cells where the header has 4, read with the comma as the separator",
      ],
      [
        { kind: "raggedRow", line: 12, expected: 4, found: 1, separator: "," },
        "line 12 has 1 cell where the header has 4, read with the comma as the separator",
      ],
      [
        {
          kind: "raggedRow",
          line: 12045,
          expected: 1204,
          found: 1203,
          separator: ",",
        },
        "line 12045 has 1,203 cells where the header has 1,204, read with the comma as the separator",
      ],
      [
        { kind: "duplicateColumn", name: "po\np" },
        "two columns are named po\\np",
      ],
      [
        { kind: "duplicateIndividual", name: "i".repeat(45) },
        `the individual ${"i".repeat(40)}… is in two rows`,
      ],
    ] as const)(
      "the reader refused the file, %o: what it found, and load an individuals file",
      (error, found) => {
        expect(
          individualsNeeds(withIndividualsRead({ kind: "failed", error })),
        ).toBe(
          `pops.csv could not be read: ${found}. Load a metadata file in the Individuals step.`,
        );
      },
    );

    test.each([
      [
        { kind: "couldNotStart", reason: "no ready message, twice" },
        "the application could not start its calculations. Reload the page and load it again.",
      ],
      [
        { kind: "workerFailed", message: "out of memory" },
        "the calculation stopped unexpectedly. Load it again in the Individuals step.",
      ],
      [
        { kind: "defect", message: "a read the project cannot hold" },
        "the calculation stopped unexpectedly. Load it again in the Individuals step.",
      ],
      [
        { kind: "popnei", message: "a message of popnei" },
        "the calculation stopped unexpectedly. Load it again in the Individuals step.",
      ],
      [
        { kind: "protocolMismatch" },
        "the page is out of date. Reload the page and load it again.",
      ],
    ] as const)(
      "the worker failed with %o: what happened, and what to do",
      (error, words) => {
        expect(
          individualsNeeds(
            withIndividualsRead({
              kind: "failed",
              error: { kind: "worker", error },
            }),
          ),
        ).toBe(`pops.csv could not be read: ${words}`);
      },
    );

    test("1 individual of the variants missing from the file: the singular", () => {
      expect(individualsNeeds(withVariantIndividuals(["i1", "ind_031"]))).toBe(
        "1 individual of panel.nei is not in pops.csv: ind_031. Add it to the file and load the file again in the Individuals step.",
      );
    });

    test.each([
      [
        ["x1", "x2"],
        "2 individuals of panel.nei are not in pops.csv: x1 and x2",
      ],
      [
        ["x1", "x2", "x3"],
        "3 individuals of panel.nei are not in pops.csv: x1, x2 and x3",
      ],
      [
        ["x1", "x2", "x3", "x4"],
        "4 individuals of panel.nei are not in pops.csv: x1, x2 and 2 more",
      ],
    ] as const)(
      "individuals of the variants missing from the file: %o",
      (names, words) => {
        expect(individualsNeeds(withVariantIndividuals(["i2", ...names]))).toBe(
          `${words}. Add them to the file and load it again in the Individuals step.`,
        );
      },
    );

    test("12 individuals missing, named in the order of the variants file", () => {
      const missing = [
        "ind_044",
        "ind_031",
        ...Array.from({ length: 10 }, (_, i) => `ind_${String(109 - i)}`),
      ];
      expect(
        individualsNeeds(withVariantIndividuals(["i1", ...missing, "i2"])),
      ).toBe(
        "12 individuals of panel.nei are not in pops.csv: ind_044, ind_031 and 10 more. Add them to the file and load it again in the Individuals step.",
      );
    });

    test("3 individuals missing, named in the order of the variants file", () => {
      expect(
        individualsNeeds(withVariantIndividuals(["z9", "i1", "b2", "m5"])),
      ).toBe(
        "3 individuals of panel.nei are not in pops.csv: z9, b2 and m5. Add them to the file and load it again in the Individuals step.",
      );
    });

    test.each([
      ["no variants file", null],
      ["the variants file being read", { kind: "pending" }],
      [
        "the variants file refused",
        { kind: "failed", error: { kind: "popnei", message: "no header" } },
      ],
    ] as const)(
      "with %s, the individuals of the variants are not looked at",
      (_what, read) => {
        const p = sampleProject();
        const variants =
          read === null || p.variants === null ? null : { ...p.variants, read };
        const missingAll = {
          ...individualsOf(p),
          read: {
            ...INDIVIDUALS_READ,
            table: { columns: ["id", "pop"], rows: [["x1", "P1"]] },
          },
        };
        expect(
          individualsNeeds(
            deepFreeze({ ...p, variants, individuals: missingAll }),
          ),
        ).toBeNull();
      },
    );
  });
});

/** The sample project with some of its parts replaced, as the data a
    project file would give. */
function fileWith(parts: Readonly<Record<string, unknown>>): unknown {
  return { ...sampleProject(), ...parts };
}

/** The sample project's variants file with some of its fields replaced. */
function variantsWith(fields: Readonly<Record<string, unknown>>): unknown {
  return fileWith({ variants: { ...sampleProject().variants, ...fields } });
}

/** The sample project's table read with some of its fields replaced. */
function readWith(fields: Readonly<Record<string, unknown>>): unknown {
  const individuals = individualsOf(sampleProject());
  return fileWith({
    individuals: { ...individuals, read: { ...individuals.read, ...fields } },
  });
}

const SAMPLE_TABLE: IndividualsTable = {
  columns: ["id", "pop", "sex", "height"],
  rows: [
    ["i1", "P1", "1", "1.52"],
    ["i2", "P1", "2", null],
    ["i3", "P2", "1", "1.61"],
    ["i4", "P2", "2", "1.70"],
  ],
};

const SAMPLE_TYPES: readonly ColumnType[] = [
  { kind: "identifier" },
  { kind: "categorical" },
  { kind: "binary", one: "2", zero: "1" },
  { kind: "continuous" },
];

const REFERENCE = {
  variants: sampleProject().variants,
  checks: [
    {
      analysis: "diversity",
      numbers: [0.5, null],
      keyVersion: 1,
      popneiVersion: "0.1.0",
      appVersion: "0.2.0",
      settings: "0123456789abcdef".repeat(4),
    },
  ],
};

function referenceWith(fields: Readonly<Record<string, unknown>>): unknown {
  return fileWith({ reference: { ...REFERENCE, ...fields } });
}

function checkWith(fields: Readonly<Record<string, unknown>>): unknown {
  return referenceWith({ checks: [{ ...REFERENCE.checks[0], ...fields }] });
}

function parse(data: unknown): Result<Project, ProjectError> {
  return parseProject(data, "popgen", 1, TEST_ANALYSES);
}

function wrong(path: FieldPath, expected: string): unknown {
  return { ok: false, error: { kind: "wrongValue", path, expected } };
}

function inconsistent(path: FieldPath): Partial<ProjectError> {
  return { kind: "inconsistentTable", path };
}

/** The error of a result that the test expects to be one. */
function errorOf(result: Result<Project, ProjectError>): ProjectError {
  if (result.ok) {
    throw new Error("popnei_web defect: the test expected an error.");
  }
  return result.error;
}

const READ_PATH = ["individuals", "read"] as const;

/** Every path of a project read from its JSON, the options of an analysis
    as one field, since parseProject names no field inside them. */
function pathsOf(value: unknown, path: FieldPath): FieldPath[] {
  const paths: FieldPath[] = path.length === 0 ? [] : [path];
  if (typeof value !== "object" || value === null) {
    return paths;
  }
  if (path.length === 3 && path[0] === "analyses" && path[2] === "options") {
    return paths;
  }
  const entries: [string | number, unknown][] = Array.isArray(value)
    ? Array.from(value.entries())
    : Object.entries(value);
  for (const [name, field] of entries) {
    paths.push(...pathsOf(field, [...path, name]));
  }
  return paths;
}

/** Asserts a text the user reads shows no value of the code: no name of
    a field of the code, no underscore, no id of an application, no number
    of seven digits or more, and no field named for want of words, which the
    fallback of fieldWords calls "a part of". A value of the file, in
    quotes, is left out of the check. */
function expectWords(text: string): void {
  expect(text).not.toContain('the field "');
  expect(text).not.toContain("a part of");
  const words = text.replaceAll(/"[^"]*"/g, "");
  expect(words).not.toMatch(/_/);
  expect(words).not.toMatch(/[a-z][A-Z]/);
  expect(words).not.toMatch(/\b(popgen|gwas)\b/);
  expect(words).not.toMatch(/\d{7,}/);
}

describe("WP1 D5 the validation", () => {
  test("reads the sample project back equal to itself", () => {
    const p = sampleProject();
    expect(parse(JSON.parse(JSON.stringify(p)))).toStrictEqual({
      ok: true,
      value: p,
    });
  });

  describe("each check, with its kind and its path", () => {
    test("a number that is not finite", () => {
      expect(parse(variantsWith({ size: Number.POSITIVE_INFINITY }))).toEqual(
        wrong(["variants", "size"], "a number"),
      );
    });

    test.each([-0.1, 1.5])("a threshold of %d", (threshold) => {
      expect(
        parse(
          fileWith({ filters: [{ kind: "maf", maxAllowedMaf: threshold }] }),
        ),
      ).toEqual(wrong(["filters", 0, "maxAllowedMaf"], "a number from 0 to 1"));
    });

    test("a threshold of a filter of the individuals above 1", () => {
      expect(
        parse(
          fileWith({
            individualFilters: [{ kind: "obs_het", maxAllowedObsHet: 1.01 }],
          }),
        ),
      ).toEqual(
        wrong(
          ["individualFilters", 0, "maxAllowedObsHet"],
          "a number from 0 to 1",
        ),
      );
    });

    test.each([0, 2.5, 2 ** 53])("a maxDist of %d", (maxDist) => {
      expect(
        errorOf(
          parse(
            fileWith({
              filters: [{ kind: "ld", maxAllowedR2: 0.2, maxDist }],
            }),
          ),
        ),
      ).toMatchObject({
        kind: "wrongValue",
        path: ["filters", 0, "maxDist"],
      });
    });

    test("a maxDist of 2^53 − 1 is accepted", () => {
      const data = fileWith({
        filters: [{ kind: "ld", maxAllowedR2: 0.2, maxDist: 2 ** 53 - 1 }],
      });
      expect(parse(data).ok).toBe(true);
    });

    test.each([0, 256])("a ploidy of %d in the read options", (ploidy) => {
      expect(
        errorOf(
          parse(
            variantsWith({
              format: "vcf",
              readOptions: { ploidy, onlyPassed: true },
            }),
          ),
        ),
      ).toMatchObject({
        path: ["variants", "readOptions", "ploidy"],
      });
    });

    test("a ploidy of 255 is accepted, and of 256 in the read refused", () => {
      const ok = variantsWith({
        format: "vcf",
        readOptions: { ploidy: 255, onlyPassed: true },
      });
      expect(parse(ok).ok).toBe(true);
      const read = { ...VARIANTS_READ, ploidy: 256 };
      expect(errorOf(parse(variantsWith({ read })))).toMatchObject({
        path: ["variants", "read", "ploidy"],
      });
    });

    test("read options for a .nei", () => {
      expect(
        errorOf(
          parse(variantsWith({ readOptions: { ploidy: 2, onlyPassed: true } })),
        ),
      ).toMatchObject({ path: ["variants", "readOptions"] });
    });

    test("no read options for a VCF", () => {
      expect(errorOf(parse(variantsWith({ format: "vcf" })))).toMatchObject({
        path: ["variants", "readOptions"],
      });
    });

    test.each([
      ["of the variants file in upper case", ["variants", "fileId"]],
      ["of the individuals file of 31 digits", ["individuals", "fileId"]],
    ] as const)("a load id %s", (_what, path) => {
      const data =
        path[0] === "variants"
          ? variantsWith({ fileId: SAMPLE_VARIANTS_ID.toUpperCase() })
          : fileWith({
              individuals: {
                ...individualsOf(sampleProject()),
                fileId: SAMPLE_INDIVIDUALS_ID.slice(1),
              },
            });
      expect(parse(data)).toEqual(
        wrong(path, "32 lower case hexadecimal digits"),
      );
    });

    test("two filters of the variants of one kind", () => {
      const data = fileWith({
        filters: [
          { kind: "maf", maxAllowedMaf: 0.95 },
          { kind: "maf", maxAllowedMaf: 0.9 },
        ],
      });
      expect(parse(data)).toEqual({
        ok: false,
        error: {
          kind: "twoFiltersOfAKind",
          path: ["filters", 1],
          filter: "maf",
        },
      });
    });

    test("two filters of the individuals of one kind", () => {
      const data = fileWith({
        individualFilters: [
          { kind: "remove", individuals: ["i4"] },
          { kind: "remove", individuals: ["i3"] },
        ],
      });
      expect(parse(data)).toEqual({
        ok: false,
        error: {
          kind: "twoFiltersOfAKind",
          path: ["individualFilters", 1],
          filter: "remove",
        },
      });
    });

    test("the filters of the individuals out of their order", () => {
      const data = fileWith({
        individualFilters: [
          { kind: "missing_data", maxAllowedMissingRate: 0.2 },
          { kind: "keep", individuals: ["i1"] },
        ],
      });
      expect(errorOf(parse(data))).toEqual({
        kind: "filterOutOfOrder",
        path: ["individualFilters", 1],
      });
    });

    test("a row not as long as the header", () => {
      const rows = SAMPLE_TABLE.rows.with(1, ["i2", "P1", "2"]);
      expect(
        errorOf(parse(readWith({ table: { ...SAMPLE_TABLE, rows } }))),
      ).toMatchObject(inconsistent([...READ_PATH, "table", "rows", 1]));
    });

    test("a type fewer than the columns", () => {
      expect(
        errorOf(parse(readWith({ columns: SAMPLE_TYPES.slice(0, 3) }))),
      ).toMatchObject(inconsistent([...READ_PATH, "columns"]));
    });

    test("a first column that is not the identifier", () => {
      const columns = SAMPLE_TYPES.with(0, { kind: "categorical" });
      expect(errorOf(parse(readWith({ columns })))).toMatchObject(
        inconsistent([...READ_PATH, "columns", 0]),
      );
    });

    test("another column that is the identifier", () => {
      const columns = SAMPLE_TYPES.with(3, { kind: "identifier" });
      expect(errorOf(parse(readWith({ columns })))).toMatchObject(
        inconsistent([...READ_PATH, "columns", 3]),
      );
    });

    test.each([
      ["values not of the column", "2", "3"],
      ["one equal to zero", "1", "1"],
      ["the number 1 where the column holds the text", 1, "2"],
    ])("a binary type with %s", (_what, one, zero) => {
      const columns = SAMPLE_TYPES.with(2, { kind: "binary", one, zero });
      expect(errorOf(parse(readWith({ columns })))).toMatchObject(
        inconsistent([...READ_PATH, "columns", 2]),
      );
    });

    test("an analysis not of those given", () => {
      const data = fileWith({
        analyses: [{ analysis: "admixture", options: {} }],
      });
      expect(parse(data)).toEqual({
        ok: false,
        error: { kind: "unknownAnalysis", id: "admixture" },
      });
    });

    test("options the analysis refuses", () => {
      const analyses = [
        {
          id: "pca",
          parseOptions: (): Result<JsonObject, string> => ({
            ok: false,
            error: "a number of components from 1 to 10",
          }),
        },
      ];
      const data = fileWith({
        analyses: [{ analysis: "pca", options: { numPrinComps: 0 } }],
      });
      expect(parseProject(data, "popgen", 1, analyses)).toEqual(
        wrong(
          ["analyses", 0, "options"],
          "a number of components from 1 to 10",
        ),
      );
    });

    test("options read with the version of the format of the file", () => {
      const versions: number[] = [];
      const analyses = [
        {
          id: "pca",
          parseOptions: (o: unknown, version: number) => {
            versions.push(version);
            return jsonObjectOf(o);
          },
        },
      ];
      const data = fileWith({ analyses: [{ analysis: "pca", options: {} }] });
      expect(parseProject(data, "popgen", 3, analyses).ok).toBe(true);
      expect(versions).toEqual([3]);
    });

    test("a file of the other application", () => {
      expect(parse(fileWith({ app: "gwas" }))).toEqual({
        ok: false,
        error: { kind: "otherApp", found: "gwas" },
      });
    });

    test("an application that is neither", () => {
      expect(errorOf(parse(fileWith({ app: "admixture" })))).toMatchObject({
        kind: "wrongValue",
        path: ["app"],
      });
    });

    test("a grouping of the other application", () => {
      expect(
        errorOf(parse(fileWith({ grouping: { kind: "roles", roles: [] } }))),
      ).toMatchObject({
        kind: "wrongValue",
        path: ["grouping", "kind"],
      });
    });

    test.each([1.5, -1])("a check with a key version of %d", (keyVersion) => {
      expect(errorOf(parse(checkWith({ keyVersion })))).toMatchObject({
        path: ["reference", "checks", 0, "keyVersion"],
      });
    });

    test("a check whose fingerprint has 63 digits", () => {
      const settings = "0123456789abcdef".repeat(4).slice(1);
      expect(parse(checkWith({ settings }))).toEqual(
        wrong(
          ["reference", "checks", 0, "settings"],
          "64 lower case hexadecimal digits",
        ),
      );
    });

    test("a reference with its checks is accepted", () => {
      const data: unknown = JSON.parse(JSON.stringify(referenceWith({})));
      expect(parse(data).ok).toBe(true);
    });

    test("a field the type does not have", () => {
      const data = fileWith({
        filters: [{ kind: "maf", maxAllowedMaf: 0.95, minAllowedMaf: 0.05 }],
      });
      expect(errorOf(parse(data))).toEqual({
        kind: "unknownField",
        path: ["filters", 0],
        name: "minAllowedMaf",
      });
    });

    test("a field named __proto__ the type does not have", () => {
      const data: unknown = JSON.parse(
        JSON.stringify(sampleProject()).replace(
          '"app":"popgen"',
          '"app":"popgen","__proto__":{}',
        ),
      );
      expect(errorOf(parse(data))).toEqual({
        kind: "unknownField",
        path: [],
        name: "__proto__",
      });
    });

    test("a field that is missing", () => {
      const variants = Object.fromEntries(
        Object.entries(sampleProject().variants ?? {}).filter(
          ([name]) => name !== "name",
        ),
      );
      expect(errorOf(parse(fileWith({ variants })))).toEqual({
        kind: "missingField",
        path: ["variants", "name"],
      });
    });

    test("a field of the wrong shape", () => {
      expect(parse(fileWith({ filters: {} }))).toEqual(
        wrong(["filters"], "a list"),
      );
    });
  });

  describe("the texts the user reads", () => {
    test("of a file of the other application", () => {
      expect(projectErrorText({ kind: "otherApp", found: "gwas" })).toBe(
        "This project file is of the association application. Open it there.",
      );
    });

    test("of an analysis this version does not know", () => {
      expect(
        projectErrorText({ kind: "unknownAnalysis", id: "admixture" }),
      ).toBe(
        "This project file has the analysis admixture, which this version of the application does not know: it was saved by another version of the application. Open it with the version of the application that saved it.",
      );
    });

    test("of a field the type does not have", () => {
      const result = parse(
        fileWith({
          filters: [{ kind: "maf", maxAllowedMaf: 0.95, minAllowedMaf: 0.05 }],
        }),
      );
      if (result.ok) {
        throw new Error("popnei_web defect: the test expected an error.");
      }
      expect(projectErrorText(result.error)).toBe(
        'The project file cannot be opened: the first filter of the variants has a field "minAllowedMaf", which the application does not write. The file was changed outside the application, or is damaged. Open a copy saved before the change, or make the project again.',
      );
    });

    test("of the threshold of the second filter of the variants", () => {
      const text = projectErrorText({
        kind: "wrongValue",
        path: ["filters", 1, "maxAllowedMaf"],
        expected: "a number from 0 to 1",
      });
      expect(text).toBe(
        "The project file cannot be opened: the threshold of the second filter of the variants should be a number from 0 to 1. The file was changed outside the application, or is damaged. Open a copy saved before the change, or make the project again.",
      );
      expect(text).not.toContain("filters");
    });

    test.each([
      [0, "first"],
      [9, "tenth"],
      [10, "11th"],
      [11, "12th"],
      [12, "13th"],
      [20, "21st"],
      [21, "22nd"],
      [22, "23rd"],
      [110, "111th"],
    ])("the position %d as the ordinal %s", (index, words) => {
      expect(ordinal(index)).toBe(words);
    });
  });

  test("an opened project file with a read pending is accepted", () => {
    const p = pendingProject();
    expect(parse(JSON.parse(JSON.stringify(p)))).toStrictEqual({
      ok: true,
      value: p,
    });
  });

  test("every project reads back from its JSON equal to itself", () => {
    fc.assert(
      fc.property(wholeProject, (p) => {
        const read = parseProject(
          JSON.parse(JSON.stringify(p)),
          p.app,
          1,
          TEST_ANALYSES,
        );
        expect(read).toStrictEqual({ ok: true, value: p });
      }),
    );
  });

  describe("the checks found by the review", () => {
    test("a header that names a column twice", () => {
      const table = {
        ...SAMPLE_TABLE,
        columns: ["id", "pop", "pop", "height"],
      };
      expect(errorOf(parse(readWith({ table })))).toEqual({
        kind: "repeated",
        path: [...READ_PATH, "table", "columns", 2],
        what: "column",
        value: "pop",
      });
    });

    test("an individual in two rows", () => {
      const rows = SAMPLE_TABLE.rows.with(3, ["i1", "P2", "2", "1.70"]);
      expect(
        errorOf(parse(readWith({ table: { ...SAMPLE_TABLE, rows } }))),
      ).toEqual({
        kind: "repeated",
        path: [...READ_PATH, "table", "rows", 3, 0],
        what: "individual",
        value: "i1",
      });
    });

    test("a table with no row", () => {
      expect(
        errorOf(parse(readWith({ table: { ...SAMPLE_TABLE, rows: [] } }))),
      ).toMatchObject({
        kind: "inconsistentTable",
        path: [...READ_PATH, "table"],
      });
    });

    test("a table with no column", () => {
      const data = readWith({
        table: { columns: [], rows: [[]] },
        columns: [],
      });
      expect(errorOf(parse(data))).toMatchObject({
        kind: "inconsistentTable",
        path: [...READ_PATH, "table", "columns"],
      });
    });

    test.each([
      ["empty", ""],
      ["a number", 7],
      ["missing", null],
    ])("an individual whose name is %s", (_what, name) => {
      const rows = SAMPLE_TABLE.rows.with(1, [name, "P1", "2", null]);
      expect(
        errorOf(parse(readWith({ table: { ...SAMPLE_TABLE, rows } }))),
      ).toMatchObject({
        kind: "inconsistentTable",
        path: [...READ_PATH, "table", "rows", 1, 0],
      });
    });

    test("what was found of a CSV, for an xlsx", () => {
      const individuals = individualsOf(sampleProject());
      const data = fileWith({ individuals: { ...individuals, csv: null } });
      expect(errorOf(parse(data))).toMatchObject({
        kind: "wrongValue",
        path: ["individuals", "read", "found"],
      });
    });

    test("roles that name a column twice", () => {
      const data = fileWith({
        app: "gwas",
        grouping: {
          kind: "roles",
          roles: [
            ["height", "trait"],
            ["height", "covariate"],
          ],
        },
      });
      expect(errorOf(parseProject(data, "gwas", 1, TEST_ANALYSES))).toEqual({
        kind: "repeated",
        path: ["grouping", "roles", 1, 0],
        what: "column",
        value: "height",
      });
    });

    test("a check of an analysis not among those given", () => {
      expect(errorOf(parse(checkWith({ analysis: "admixture" })))).toEqual({
        kind: "unknownAnalysis",
        id: "admixture",
      });
    });

    test("two checks of one analysis", () => {
      const check = REFERENCE.checks[0];
      expect(errorOf(parse(referenceWith({ checks: [check, check] })))).toEqual(
        {
          kind: "repeated",
          path: ["reference", "checks", 1],
          what: "analysis",
          value: "diversity",
        },
      );
    });

    test("an analysis named twice", () => {
      const data = fileWith({
        analyses: [
          { analysis: "pca", options: {} },
          { analysis: "pca", options: {} },
        ],
      });
      expect(errorOf(parse(data))).toEqual({
        kind: "repeated",
        path: ["analyses", 1],
        what: "analysis",
        value: "pca",
      });
    });

    test.each([-1, 2.5])("a size of %d", (size) => {
      expect(errorOf(parse(variantsWith({ size })))).toMatchObject({
        kind: "wrongValue",
        path: ["variants", "size"],
      });
    });

    test.each([-2.5, -1, 0.5])("a number of variants of %d", (numVars) => {
      const read = { ...VARIANTS_READ, numVars };
      expect(errorOf(parse(variantsWith({ read })))).toMatchObject({
        kind: "wrongValue",
        path: ["variants", "read", "numVars"],
      });
    });

    test("options nested 64 levels are accepted, 65 refused", () => {
      const at = (depth: number) =>
        fileWith({ analyses: [{ analysis: "pca", options: nested(depth) }] });
      expect(parse(at(64)).ok).toBe(true);
      expect(errorOf(parse(at(65)))).toMatchObject({
        kind: "wrongValue",
        path: ["analyses", 0, "options"],
      });
    });

    test("options nested 100,000 levels are refused, not a crash", () => {
      const data = fileWith({
        analyses: [{ analysis: "pca", options: nested(100_000) }],
      });
      expect(errorOf(parse(data))).toMatchObject({
        kind: "wrongValue",
        path: ["analyses", 0, "options"],
      });
    });
  });

  describe("the types and what the module gives", () => {
    test("a refusal of popnei is never a failure of the worker, nor one of the files reader", () => {
      const popnei: SourceError = {
        kind: "worker",
        // @ts-expect-error -- a refusal of popnei is the kind popnei of SourceError
        error: { kind: "popnei", message: "no variants" },
      };
      const files: IndividualsRead = {
        kind: "failed",
        error: {
          kind: "worker",
          // @ts-expect-error -- a refusal of the xlsx reader is the kind files of IndividualsFileError
          error: { kind: "files", message: "no sheet" },
        },
      };
      expect([popnei.kind, files.kind]).toEqual(["worker", "failed"]);
    });

    test("two filters of one kind name a kind of filter", () => {
      const error: ProjectError = {
        kind: "twoFiltersOfAKind",
        path: ["filters", 1],
        // @ts-expect-error -- hwe is not a kind of filter
        filter: "hwe",
      };
      expect(error.kind).toBe("twoFiltersOfAKind");
    });

    test("the checks of each value are not given to other modules", async () => {
      const module: object = await import("./project.ts");
      const names = Object.keys(module);
      for (const name of [
        "variantFilterError",
        "individualFilterError",
        "loadIdError",
        "variantLoadError",
        "groupingError",
        "tableError",
        "individualsReadError",
      ]) {
        expect(names).not.toContain(name);
      }
      for (const name of [
        "MAX_PLOIDY",
        "MAX_LD_DIST",
        "INDIVIDUAL_FILTER_ORDER",
        "FORMAT_VERSION",
        "MAX_OPTIONS_DEPTH",
        "freezeProject",
      ]) {
        expect(names).toContain(name);
      }
    });
  });

  describe("the bounds of every threshold are accepted", () => {
    const variantFilters = [
      ["missing_data", "maxAllowedMissingRate"],
      ["maf", "maxAllowedMaf"],
      ["obs_het", "maxAllowedObsHet"],
      ["ld", "maxAllowedR2"],
    ] as const;
    const individualFilters = [
      ["missing_data", "maxAllowedMissingRate"],
      ["obs_het", "maxAllowedObsHet"],
    ] as const;

    test.each(
      variantFilters.flatMap(([kind, field]) =>
        [0, 1].map((threshold) => [kind, field, threshold] as const),
      ),
    )("a filter of the variants %s with %s of %d", (kind, field, threshold) => {
      const filter =
        kind === "ld"
          ? { kind, maxAllowedR2: threshold, maxDist: 1 }
          : { kind, [field]: threshold };
      expect(parse(fileWith({ filters: [filter] })).ok).toBe(true);
    });

    test.each(
      individualFilters.flatMap(([kind, field]) =>
        [0, 1].map((threshold) => [kind, field, threshold] as const),
      ),
    )(
      "a filter of the individuals %s with %s of %d",
      (kind, field, threshold) => {
        const data = fileWith({
          individualFilters: [{ kind, [field]: threshold }],
        });
        expect(parse(data).ok).toBe(true);
      },
    );
  });

  describe("the texts of the review", () => {
    /** The text of the error `parse` gives for `data`. */
    const textOf = (data: unknown, app: AppId = "popgen"): string =>
      projectErrorText(errorOf(parseProject(data, app, 1, TEST_ANALYSES)));
    const opened = (words: string): string =>
      `The project file cannot be opened: ${words}. The file was changed outside the application, or is damaged. Open a copy saved before the change, or make the project again.`;

    test("of a field the type does not have", () => {
      const filters = [
        { kind: "maf", maxAllowedMaf: 0.95 },
        { kind: "missing_data", maxAllowedMissingRate: 0.1, minRate: 0.1 },
      ];
      expect(textOf(fileWith({ filters }))).toBe(
        opened(
          'the second filter of the variants has a field "minRate", which the application does not write',
        ),
      );
    });

    test("of a field missing", () => {
      const filters = [{ kind: "maf", maxAllowedMaf: 0.95 }, { kind: "maf" }];
      expect(textOf(fileWith({ filters }))).toBe(
        opened("the threshold of the second filter of the variants is missing"),
      );
    });

    test("of two filters of one kind", () => {
      const filters = [
        { kind: "missing_data", maxAllowedMissingRate: 0.1 },
        { kind: "missing_data", maxAllowedMissingRate: 0.2 },
      ];
      expect(textOf(fileWith({ filters }))).toBe(
        opened(
          "it has two filters of the variants by missing genotypes, and a project has at most one of each kind",
        ),
      );
    });

    test("of two lists of individuals to keep", () => {
      const individualFilters = [
        { kind: "keep", individuals: ["i1"] },
        { kind: "keep", individuals: ["i2"] },
      ];
      expect(textOf(fileWith({ individualFilters }))).toBe(
        opened(
          "it has two lists of individuals to keep, and a project has at most one of each kind",
        ),
      );
    });

    test("of the filters of the individuals out of their order", () => {
      const individualFilters = [
        { kind: "missing_data", maxAllowedMissingRate: 0.2 },
        { kind: "remove", individuals: ["i4"] },
      ];
      expect(textOf(fileWith({ individualFilters }))).toBe(
        opened(
          "the filters of the individuals should be in the order individuals to keep, individuals to remove, missing genotypes, observed heterozygosity, and the second one is out of that order",
        ),
      );
    });

    test("of an analysis named twice", () => {
      const analyses = [
        { analysis: "diversity", options: {} },
        { analysis: "diversity", options: {} },
      ];
      expect(textOf(fileWith({ analyses }))).toBe(
        opened("the second analysis repeats the analysis diversity"),
      );
    });

    test("of the identifier given to another column", () => {
      const columns = SAMPLE_TYPES.with(1, { kind: "identifier" });
      expect(textOf(readWith({ columns }))).toBe(
        opened(
          "the type of the second column of the individuals file cannot be identifier: only the first column can have that type",
        ),
      );
    });

    test("of a binary type whose values are not those of its column", () => {
      const columns = SAMPLE_TYPES.with(2, {
        kind: "binary",
        one: "3",
        zero: "1",
      });
      expect(textOf(readWith({ columns }))).toBe(
        opened(
          "the type of the third column of the individuals file should be binary, with the two values found in the column coded 1 and 0",
        ),
      );
    });

    test("of a limit that is the largest number a program holds", () => {
      const filters = [{ kind: "ld", maxAllowedR2: 0.5, maxDist: 0.5 }];
      expect(textOf(fileWith({ filters }))).toBe(
        opened(
          "the distance of the first filter of the variants should be a whole number, 1 or more, or nothing",
        ),
      );
    });

    test("of a value coded 0 that is not a value of a cell", () => {
      // A value of the file no type allows: an object for a value.
      const columns = [
        ...SAMPLE_TYPES.slice(0, 2),
        { kind: "binary", one: "2", zero: {} },
        ...SAMPLE_TYPES.slice(3),
      ];
      expect(textOf(readWith({ columns }))).toBe(
        opened(
          "the value coded 0 of the third column of the individuals file should be a text, a number, true or false",
        ),
      );
    });

    test("of a check number that is not a number", () => {
      expect(textOf(checkWith({ numbers: [0.5, "NaN"] }))).toBe(
        opened(
          "the second number of the first analysis with check numbers should be a number or nothing",
        ),
      );
    });

    test("of the role of a column", () => {
      const data = fileWith({
        app: "gwas",
        grouping: {
          kind: "roles",
          roles: [
            ["height", "trait"],
            ["sex", "phenotype"],
          ],
        },
      });
      expect(textOf(data, "gwas")).toBe(
        opened(
          "the role of the second column in the roles of the columns should be trait, covariate or ignored",
        ),
      );
    });

    test("of the ploidy set to read a VCF", () => {
      const data = variantsWith({
        format: "vcf",
        readOptions: { ploidy: 0, onlyPassed: true },
      });
      expect(textOf(data)).toBe(
        opened(
          "the ploidy set to read the variants file should be a whole number from 1 to 255",
        ),
      );
    });

    test("of the separator set to read a CSV", () => {
      const individuals = individualsOf(sampleProject());
      const data = fileWith({
        individuals: {
          ...individuals,
          csv: { encoding: "auto", separator: "|", decimal: "auto" },
        },
      });
      expect(textOf(data)).toBe(
        opened(
          "the separator set to read the individuals file should be a comma, a semicolon, a tab or found by the application",
        ),
      );
    });

    test("of the reason a variants file could not be read", () => {
      const read = {
        kind: "failed",
        error: { kind: "worker", error: { kind: "couldNotStart", reason: 3 } },
      };
      expect(textOf(variantsWith({ read }))).toBe(
        opened(
          "the reason the variants file could not be read should be a text",
        ),
      );
    });

    test("of the encoding found in the individuals file", () => {
      expect(
        textOf(
          readWith({
            found: {
              encoding: "auto",
              separator: ",",
              decimal: ".",
              undecodedLine: null,
            },
          }),
        ),
      ).toBe(
        opened(
          "the encoding found in the individuals file should be UTF-8, Windows-1252 or UTF-16",
        ),
      );
    });

    test("of an analysis that is not in the form the application writes", () => {
      expect(textOf(fileWith({ analyses: ["diversity"] }))).toBe(
        opened(
          "the first analysis should be in the form the application writes",
        ),
      );
    });

    test("of an unknown analysis whose id is long and holds a new line", () => {
      const id = "x".repeat(20) + "\n" + "y".repeat(280);
      const text = projectErrorText({ kind: "unknownAnalysis", id });
      expect(text).toBe(
        `This project file has the analysis ${"x".repeat(20)}\\n${"y".repeat(19)}…, which this version of the application does not know: it was saved by another version of the application. Open it with the version of the application that saved it.`,
      );
    });

    test("every field of every project is named in words, with no value of the code", () => {
      fc.assert(
        fc.property(wholeProject, (p) => {
          for (const path of pathsOf(JSON.parse(JSON.stringify(p)), [])) {
            expectWords(projectErrorText({ kind: "missingField", path }));
          }
        }),
      );
    });

    test("every kind of error is written in words, with no value of the code", () => {
      const errors: ProjectError[] = [
        { kind: "otherApp", found: "popgen" },
        { kind: "otherApp", found: "gwas" },
        { kind: "unknownAnalysis", id: "admixture" },
        { kind: "unknownField", path: ["filters", 1], name: "minRate" },
        { kind: "missingField", path: ["filters", 1, "maxAllowedMaf"] },
        {
          kind: "wrongValue",
          path: ["variants", "size"],
          expected: "a number",
        },
        ...(["missing_data", "maf", "obs_het", "ld"] as const).map(
          (filter): ProjectError => ({
            kind: "twoFiltersOfAKind",
            path: ["filters", 1],
            filter,
          }),
        ),
        ...(["keep", "remove", "missing_data", "obs_het"] as const).map(
          (filter): ProjectError => ({
            kind: "twoFiltersOfAKind",
            path: ["individualFilters", 1],
            filter,
          }),
        ),
        { kind: "filterOutOfOrder", path: ["individualFilters", 1] },
        {
          kind: "repeated",
          path: ["analyses", 1],
          what: "analysis",
          value: "pca",
        },
        {
          kind: "inconsistentTable",
          path: ["individuals", "read", "table", "rows", 1],
          problem: "has 3 cells where the header has 4",
        },
      ];
      for (const error of errors) {
        expectWords(projectErrorText(error));
      }
    });
  });
});

/** A failed read of the individuals file with the refusal `error`, and
    its variants file read. */
function refusedWith(error: IndividualsFileError): Project {
  return withIndividualsRead({ kind: "failed", error });
}

/** The sample project with its individuals file refused as `error`,
    parsed back from its JSON. */
function parsedRefusal(error: IndividualsFileError): unknown {
  return parse(JSON.parse(JSON.stringify(refusedWith(error))));
}

/** The eight kinds of refusal of the reader that stage 2 adds, the last
    two by the owner's decisions of 25 September 2026, each with the words
    `individualsNeeds` gives after "could not be read:". */
const NEW_REFUSALS: readonly (readonly [IndividualsFileError, string])[] = [
  [
    { kind: "unnamedColumn", column: 4 },
    "column 4 has values but no name in the header",
  ],
  [
    { kind: "emptyIndividual", line: 7 },
    "line 7 has no name of an individual in its first column",
  ],
  [
    { kind: "unclosedQuote", line: 7, separator: "," },
    "the quote that opens a cell on line 7 is never closed, read with the comma as the separator",
  ],
  [
    { kind: "tooLarge", size: 312_400_000, max: 20_000_000 },
    "it is 312.4 MB, more than the 20 MB a metadata file can have; check that it is the metadata file and not the variants",
  ],
  [
    { kind: "unreadable", message: "NotReadableError" },
    "the browser could not read it; it may have been changed, moved or deleted since it was picked",
  ],
  [
    { kind: "notText" },
    "it is not a text file; in Excel, save the sheet as CSV",
  ],
  [
    { kind: "variantsFile" },
    "it is a variants file, which the Variants step takes",
  ],
  [
    { kind: "cutShort" },
    "it ends in the middle of a character and may have been cut short",
  ],
];

describe("WS1 D3 the additions to project.ts", () => {
  describe("individualsCheck", () => {
    test("is null when the variants file is not read", () => {
      expect(
        individualsCheck(withVariantsRead({ kind: "pending" })),
      ).toBeNull();
    });

    test("is null when the individuals file is not read", () => {
      expect(individualsCheck(pendingProject())).toBeNull();
      expect(individualsCheck(withoutIndividuals())).toBeNull();
    });

    test("gives the individuals found, all those missing in the order of the variants file, and the rows ignored", () => {
      // The table holds i1 to i4; the variants file i9, i2, i7, i1 and i8.
      const p = withVariantIndividuals(["i9", "i2", "i7", "i1", "i8"]);
      expect(individualsCheck(p)).toStrictEqual({
        found: 2,
        missing: ["i9", "i7", "i8"],
        ignoredRows: 2,
      });
    });

    test("gives the same object for the same two reads, and a new one for another read", () => {
      const p = withVariantIndividuals(["i1", "i5"]);
      const first = individualsCheck(p);
      expect(individualsCheck(deepFreeze({ ...p }))).toBe(first);
      const other = withVariantIndividuals(["i1", "i5"]);
      expect(individualsCheck(other)).not.toBe(first);
      expect(individualsCheck(other)).toStrictEqual(first);
    });

    test("keeps no answer of another variants file for the same table", () => {
      const p = withVariantIndividuals(["i1", "i5"]);
      const first = individualsCheck(p);
      const q = deepFreeze({
        ...p,
        variants:
          p.variants === null
            ? null
            : {
                ...p.variants,
                read: {
                  kind: "read" as const,
                  individuals: ["i6", "i1"],
                  ploidy: 2,
                  numVars: null,
                },
              },
      });
      expect(q.individuals).toBe(p.individuals);
      const second = individualsCheck(q);
      expect(second).not.toBe(first);
      expect(second?.missing).toStrictEqual(["i6"]);
    });

    test("individualsNeeds names the individuals it gives as missing", () => {
      const p = withVariantIndividuals(["i9", "i2", "i7", "i1", "i8"]);
      expect(individualsCheck(p)?.missing).toStrictEqual(["i9", "i7", "i8"]);
      expect(individualsNeeds(p)).toBe(
        "3 individuals of panel.nei are not in pops.csv: i9, i7 and i8. Add them to the file and load it again in the Individuals step.",
      );
    });
  });

  test("escaped escapes a name and does not cut it, where shown cuts it after 40 characters", () => {
    const name = `${"a".repeat(45)}\n‮`;
    expect(escaped(name)).toBe(`${"a".repeat(45)}\\n\\u202e`);
    expect(shown(name)).toBe(`${"a".repeat(40)}…`);
  });

  test.each(NEW_REFUSALS)(
    "individualsNeeds gives the words of %o",
    (error, words) => {
      expect(individualsNeeds(refusedWith(error))).toBe(
        `pops.csv could not be read: ${words}. Load a metadata file in the Individuals step.`,
      );
    },
  );

  test.each(NEW_REFUSALS)(
    "the validation of a project file accepts a failed read of %o with its fields",
    (error) => {
      const parsed = parsedRefusal(error);
      expect(parsed).toMatchObject({ ok: true });
      expect(parsed).toStrictEqual({ ok: true, value: refusedWith(error) });
    },
  );

  test("a column number is a position, written with no comma", () => {
    expect(
      individualsNeeds(refusedWith({ kind: "unnamedColumn", column: 1204 })),
    ).toBe(
      "pops.csv could not be read: column 1204 has values but no name in the header. Load a metadata file in the Individuals step.",
    );
  });

  test("the limit of tooLarge is written from its value", () => {
    expect(
      individualsNeeds(
        refusedWith({ kind: "tooLarge", size: 12_000_001, max: 10_000_000 }),
      ),
    ).toBe(
      "pops.csv could not be read: it is 12.1 MB, more than the 10 MB a metadata file can have; check that it is the metadata file and not the variants. Load a metadata file in the Individuals step.",
    );
  });

  test("a reopenFailed of the light worker, which it never gives, is told as a defect", () => {
    expect(
      individualsNeeds(
        withIndividualsRead({
          kind: "failed",
          error: {
            kind: "worker",
            error: {
              kind: "reopenFailed",
              name: "pops.csv",
              message: "a range",
            },
          },
        }),
      ),
    ).toBe(
      "pops.csv could not be read: the calculation stopped unexpectedly. Load it again in the Individuals step.",
    );
  });

  test.each([
    [
      "a raggedRow whose separator is not one a CSV can have",
      { kind: "raggedRow", line: 7, expected: 4, found: 3, separator: "|" },
      ["individuals", "read", "error", "separator"],
    ],
    [
      "a tooLarge whose size is not a number",
      { kind: "tooLarge", size: "big", max: 20_000_000 },
      ["individuals", "read", "error", "size"],
    ],
  ] as const)("the validation refuses %s", (_what, error, path) => {
    const data = fileWith({
      individuals: {
        ...individualsOf(sampleProject()),
        read: { kind: "failed", error },
      },
    });
    expect(errorOf(parse(data))).toMatchObject({ kind: "wrongValue", path });
  });

  test("the validation refuses a reopenFailed whose message is not a text", () => {
    const data = variantsWith({
      read: {
        kind: "failed",
        error: {
          kind: "worker",
          error: { kind: "reopenFailed", name: "panel.nei", message: 3 },
        },
      },
    });
    expect(parse(data)).toEqual(
      wrong(["variants", "read", "error", "error", "message"], "a text"),
    );
  });

  test("the words of raggedRow name the separator the read used", () => {
    expect(
      individualsNeeds(
        refusedWith({
          kind: "raggedRow",
          line: 7,
          expected: 4,
          found: 3,
          separator: ";",
        }),
      ),
    ).toBe(
      "pops.csv could not be read: line 7 has 3 cells where the header has 4, read with the semicolon as the separator. Load a metadata file in the Individuals step.",
    );
  });

  test("the words of unclosedQuote name the separator the read used", () => {
    expect(
      individualsNeeds(
        refusedWith({ kind: "unclosedQuote", line: 12, separator: "\t" }),
      ),
    ).toBe(
      "pops.csv could not be read: the quote that opens a cell on line 12 is never closed, read with the tab as the separator. Load a metadata file in the Individuals step.",
    );
  });

  test("a size just above the limit is rounded up, 20.1 MB and never 20.0 MB", () => {
    expect(
      individualsNeeds(
        refusedWith({ kind: "tooLarge", size: 20_000_001, max: 20_000_000 }),
      ),
    ).toContain("it is 20.1 MB, more than the 20 MB");
  });

  test("a separator the reader does not use is refused in a project file", () => {
    const data = fileWith({
      individuals: {
        ...individualsOf(sampleProject()),
        read: {
          kind: "failed",
          error: { kind: "unclosedQuote", line: 7, separator: "|" },
        },
      },
    });
    expect(errorOf(parse(data))).toMatchObject({
      kind: "wrongValue",
      path: ["individuals", "read", "error", "separator"],
    });
  });

  test('"utf-16" is accepted among the encodings found', () => {
    const data = readWith({
      found: {
        encoding: "utf-16",
        separator: ",",
        decimal: ".",
        undecodedLine: null,
      },
    });
    expect(parse(data)).toMatchObject({
      ok: true,
      value: {
        individuals: {
          read: {
            found: {
              encoding: "utf-16",
              separator: ",",
              decimal: ".",
              undecodedLine: null,
            },
          },
        },
      },
    });
  });

  test("the line of a character not decoded is accepted as a whole number of at least 1, and refused otherwise", () => {
    const found = (undecodedLine: unknown): unknown =>
      readWith({
        found: {
          encoding: "utf-8",
          separator: ",",
          decimal: ".",
          undecodedLine,
        },
      });
    expect(parse(found(3))).toMatchObject({
      ok: true,
      value: { individuals: { read: { found: { undecodedLine: 3 } } } },
    });
    for (const wrong of [0, 1.5, "3"]) {
      expect(errorOf(parse(found(wrong)))).toMatchObject({
        kind: "wrongValue",
        path: ["individuals", "read", "found", "undecodedLine"],
      });
    }
    const without = readWith({
      found: { encoding: "utf-8", separator: ",", decimal: "." },
    });
    expect(errorOf(parse(without))).toMatchObject({
      kind: "missingField",
      path: ["individuals", "read", "found", "undecodedLine"],
    });
  });

  test("projectNeeds gives the words of a variants file the browser can no longer read", () => {
    expect(
      projectNeeds(
        withVariantsRead({
          kind: "failed",
          error: {
            kind: "worker",
            error: {
              kind: "reopenFailed",
              name: "panel.nei",
              message:
                "the source could not be read: the browser did not give popnei the bytes",
            },
          },
        }),
      ),
    ).toBe(
      "panel.nei could not be read; it may have changed on the disk since it was picked. Load it again in the Variants step.",
    );
  });

  describe("individualsStepNeeds, the words of the Individuals step", () => {
    test("no individuals file, and a file read, need nothing there", () => {
      expect(individualsStepNeeds(withoutIndividuals())).toBeNull();
      expect(individualsStepNeeds(sampleProject())).toBeNull();
      // Individuals missing are not a reason of the read of the file.
      expect(
        individualsStepNeeds(withVariantIndividuals(["i1", "ind_031"])),
      ).toBeNull();
    });

    test("the individuals file being read", () => {
      expect(individualsStepNeeds(pendingProject())).toBe("Reading pops.csv.");
    });

    test.each([
      [
        { kind: "raggedRow", line: 7, expected: 4, found: 3, separator: ";" },
        "line 7 has 3 cells where the header has 4, read with the semicolon as the separator. Choose another separator, or load a corrected file.",
      ],
      [
        { kind: "unclosedQuote", line: 7, separator: "," },
        "the quote that opens a cell on line 7 is never closed, read with the comma as the separator. Choose another separator, or load a corrected file.",
      ],
      [
        { kind: "variantsFile" },
        "it is a variants file, which the Variants step takes. Load a metadata file.",
      ],
      [
        { kind: "unreadable", message: "NotReadableError" },
        "the browser could not read it; it may have been changed, moved or deleted since it was picked. Choose it again.",
      ],
      [
        { kind: "empty" },
        "it has no row of individuals. Load a corrected file.",
      ],
      [
        { kind: "duplicateColumn", name: "pop" },
        "two columns are named pop. Load a corrected file.",
      ],
      [
        { kind: "duplicateIndividual", name: "ind_031" },
        "the individual ind_031 is in two rows. Load a corrected file.",
      ],
      [
        { kind: "unnamedColumn", column: 4 },
        "column 4 has values but no name in the header. Load a corrected file.",
      ],
      [
        { kind: "emptyIndividual", line: 7 },
        "line 7 has no name of an individual in its first column. Load a corrected file.",
      ],
      [
        { kind: "tooLarge", size: 312_400_000, max: 20_000_000 },
        "it is 312.4 MB, more than the 20 MB a metadata file can have; check that it is the metadata file and not the variants. Load a corrected file.",
      ],
      [
        { kind: "notText" },
        "it is not a text file; in Excel, save the sheet as CSV. Load a corrected file.",
      ],
      [
        { kind: "cutShort" },
        "it ends in the middle of a character and may have been cut short. Load a corrected file.",
      ],
      [
        { kind: "files", message: "the file is not an xlsx file." },
        "the file is not an xlsx file. Load a corrected file.",
      ],
    ] as const)(
      "the reader refused the file, %o: what it found, and what mends it there",
      (error, words) => {
        expect(
          individualsStepNeeds(withIndividualsRead({ kind: "failed", error })),
        ).toBe(`pops.csv could not be read: ${words}`);
      },
    );

    test.each([
      [
        { kind: "workerFailed", message: "out of memory" },
        "the calculation stopped unexpectedly. Choose it again.",
      ],
      [
        { kind: "defect", message: "a read the project cannot hold" },
        "the calculation stopped unexpectedly. Choose it again.",
      ],
      [
        { kind: "couldNotStart", reason: "no ready message, twice" },
        "the application could not start its calculations. Reload the page and choose it again.",
      ],
      [
        { kind: "protocolMismatch" },
        "the page is out of date. Reload the page and choose it again.",
      ],
    ] as const)(
      "the light worker failed with %o: what happened, and what to do there",
      (error, words) => {
        expect(
          individualsStepNeeds(
            withIndividualsRead({
              kind: "failed",
              error: { kind: "worker", error },
            }),
          ),
        ).toBe(`pops.csv could not be read: ${words}`);
      },
    );

    test('a variants file picked as a traits file ends "Load a traits file."', () => {
      const gwas = deepFreeze({
        ...refusedWith({ kind: "variantsFile" }),
        app: "gwas" as const,
        grouping: { kind: "roles" as const, roles: [] },
      });
      expect(individualsStepNeeds(gwas)).toBe(
        "pops.csv could not be read: it is a variants file, which the Variants step takes. Load a traits file.",
      );
    });

    test("individuals of the variants missing, named with the file to add them to", () => {
      const missing = [
        "ind_044",
        "ind_031",
        ...Array.from({ length: 10 }, (_, i) => `ind_${String(109 - i)}`),
      ];
      expect(
        individualsStepMissing(
          withVariantIndividuals(["i1", ...missing, "i2"]),
        ),
      ).toBe(
        "12 individuals of panel.nei are not in pops.csv: ind_044, ind_031 and 10 more. Add them to pops.csv and load it again.",
      );
      expect(
        individualsStepMissing(withVariantIndividuals(["i1", "ind_031"])),
      ).toBe(
        "1 individual of panel.nei is not in pops.csv: ind_031. Add it to pops.csv and load pops.csv again.",
      );
      // Beside a Run button, the words name the step.
      expect(individualsNeeds(withVariantIndividuals(["i1", "ind_031"]))).toBe(
        "1 individual of panel.nei is not in pops.csv: ind_031. Add it to the file and load the file again in the Individuals step.",
      );
    });

    test("no individual missing, or a file not read, gives no words of individuals missing", () => {
      expect(individualsStepMissing(sampleProject())).toBeNull();
      expect(individualsStepMissing(withoutIndividuals())).toBeNull();
      expect(individualsStepMissing(pendingProject())).toBeNull();
    });

    test("beside a Run button, a refusal still ends as individualsNeeds gives it", () => {
      expect(individualsNeeds(refusedWith({ kind: "variantsFile" }))).toBe(
        "pops.csv could not be read: it is a variants file, which the Variants step takes. Load a metadata file in the Individuals step.",
      );
    });
  });

  describe("variantsStepNeeds, the words of the Variants step", () => {
    test("no variants file, and a file read, need nothing there", () => {
      expect(variantsStepNeeds(deepFreeze(emptyProject("popgen")))).toBeNull();
      expect(variantsStepNeeds(sampleProject())).toBeNull();
      // A list of individuals that names the wrong ones is not a reason of
      // the file.
      expect(
        variantsStepNeeds(withLists([{ kind: "keep", individuals: [] }])),
      ).toBeNull();
    });

    test("the variants file being read", () => {
      expect(variantsStepNeeds(pendingProject())).toBe("Reading panel.vcf.");
    });

    test("popnei refused the file: its message, and choose another file", () => {
      expect(
        variantsStepNeeds(
          withVariantsRead({
            kind: "failed",
            error: { kind: "popnei", message: "the file has no header line." },
          }),
        ),
      ).toBe(
        "popnei could not read panel.nei: the file has no header line. Choose another file.",
      );
    });

    test.each([
      [
        { kind: "workerFailed", message: "out of memory" },
        "the calculation stopped unexpectedly. Choose it again.",
      ],
      [
        { kind: "defect", message: "a message that did not validate" },
        "the calculation stopped unexpectedly. Choose it again.",
      ],
      [
        { kind: "couldNotStart", reason: "no ready message, twice" },
        "the application could not start its calculations. Reload the page and choose it again.",
      ],
      [
        { kind: "protocolMismatch" },
        "the page is out of date. Reload the page and choose it again.",
      ],
    ] as const)(
      "the worker failed with %o: what happened, and what to do there",
      (error, words) => {
        expect(
          variantsStepNeeds(
            withVariantsRead({
              kind: "failed",
              error: { kind: "worker", error },
            }),
          ),
        ).toBe(`panel.nei could not be read: ${words}`);
      },
    );

    test("a variants file the browser can no longer read: choose it again", () => {
      expect(
        variantsStepNeeds(
          withVariantsRead({
            kind: "failed",
            error: {
              kind: "worker",
              error: {
                kind: "reopenFailed",
                name: "panel.nei",
                message: "the browser did not give popnei the bytes",
              },
            },
          }),
        ),
      ).toBe(
        "panel.nei could not be read; it may have changed on the disk since it was picked. Choose it again.",
      );
    });
  });

  test("a read of the variants file failed with reopenFailed is read back by the validation of a project file", () => {
    const p = withVariantsRead({
      kind: "failed",
      error: {
        kind: "worker",
        error: { kind: "reopenFailed", name: "panel.nei", message: "a range" },
      },
    });
    expect(parse(JSON.parse(JSON.stringify(p)))).toStrictEqual({
      ok: true,
      value: p,
    });
    const noName = variantsWith({
      read: {
        kind: "failed",
        error: {
          kind: "worker",
          error: { kind: "reopenFailed", message: "a range" },
        },
      },
    });
    expect(errorOf(parse(noName))).toStrictEqual({
      kind: "missingField",
      path: ["variants", "read", "error", "error", "name"],
    });
  });

  test('the reasons of the association application name "a traits file"', () => {
    const gwas = (p: Project): Project =>
      deepFreeze({
        ...p,
        app: "gwas",
        grouping: { kind: "roles", roles: [] },
      });
    expect(individualsNeeds(gwas(withoutIndividuals()))).toBe(
      "Load a traits file in the Individuals step.",
    );
    expect(
      individualsNeeds(
        gwas(
          refusedWith({ kind: "tooLarge", size: 312_400_000, max: 20_000_000 }),
        ),
      ),
    ).toBe(
      "pops.csv could not be read: it is 312.4 MB, more than the 20 MB a traits file can have; check that it is the traits file and not the variants. Load a traits file in the Individuals step.",
    );
  });

  test("namesOf, counted and grouped are those of the reasons", () => {
    expect(namesOf(["a", "b", "c", "d"])).toBe("a, b and 2 more");
    expect(counted(1203, "individual")).toBe("1,203 individuals");
    expect(grouped(1203554)).toBe("1,203,554");
  });
});

describe("WS1 D4 the versions of a check", () => {
  test("a check is read with its version of popnei and of the application", () => {
    const data: unknown = JSON.parse(JSON.stringify(referenceWith({})));
    expect(parse(data)).toMatchObject({
      ok: true,
      value: {
        reference: {
          checks: [
            {
              analysis: "diversity",
              popneiVersion: "0.1.0",
              appVersion: "0.2.0",
            },
          ],
        },
      },
    });
  });

  test.each(["popneiVersion", "appVersion"])(
    "a check without its %s is refused",
    (field) => {
      const check = Object.fromEntries(
        Object.entries(REFERENCE.checks[0] ?? {}).filter(
          ([name]) => name !== field,
        ),
      );
      expect(errorOf(parse(referenceWith({ checks: [check] })))).toStrictEqual({
        kind: "missingField",
        path: ["reference", "checks", 0, field],
      });
    },
  );

  test("a check whose version of the application is not a text is refused", () => {
    expect(parse(checkWith({ appVersion: 1 }))).toEqual(
      wrong(["reference", "checks", 0, "appVersion"], "a text"),
    );
  });

  test("a reference is read without versions of its own, and one with a version of popnei is refused", () => {
    const parsed = parse(JSON.parse(JSON.stringify(referenceWith({}))));
    if (!parsed.ok) {
      throw new Error("popnei_web defect: the test expected a project.");
    }
    expect(Object.keys(parsed.value.reference ?? {})).toStrictEqual([
      "variants",
      "checks",
    ]);
    expect(errorOf(parse(referenceWith({ popneiVersion: "0.1.0" })))).toEqual({
      kind: "unknownField",
      path: ["reference"],
      name: "popneiVersion",
    });
  });
});

/** The sample project with its variants file, panel.nei, read with the
    individuals ind_031 and ind_044, or with the read `read`, and the
    filters of individuals `lists`. */
function withListsOfPanel(
  lists: Project["individualFilters"],
  read: SourceRead = {
    kind: "read",
    individuals: ["ind_031", "ind_044"],
    ploidy: 2,
    numVars: null,
  },
): Project {
  const p = sampleProject();
  if (p.variants === null) {
    throw new Error("popnei_web defect: the test expected a variants file.");
  }
  return deepFreeze({
    ...p,
    variants: { ...p.variants, read },
    individualFilters: lists,
  });
}

describe("VS2 D1 the filters of a project", () => {
  describe("the fixed order of the variants' filters", () => {
    test("VARIANT_FILTER_ORDER is missing data, observed heterozygosity, MAF, LD", () => {
      expect(VARIANT_FILTER_ORDER).toEqual([
        "missing_data",
        "obs_het",
        "maf",
        "ld",
      ]);
    });

    test("the worked case: each filter goes to the place of its kind, and one set again is replaced in its place", () => {
      let p = deepFreeze(emptyProject("popgen"));
      p = deepFreeze(setVariantFilter(p, { kind: "maf", maxAllowedMaf: 0.95 }));
      p = deepFreeze(
        setVariantFilter(p, {
          kind: "missing_data",
          maxAllowedMissingRate: 0.1,
        }),
      );
      p = deepFreeze(setVariantFilter(p, { kind: "maf", maxAllowedMaf: 0.9 }));
      expect(p.filters).toEqual([
        { kind: "missing_data", maxAllowedMissingRate: 0.1 },
        { kind: "maf", maxAllowedMaf: 0.9 },
      ]);
      const before = p;
      p = deepFreeze(
        setVariantFilter(p, { kind: "ld", maxAllowedR2: 0.5, maxDist: 1000 }),
      );
      p = deepFreeze(
        setVariantFilter(p, { kind: "obs_het", maxAllowedObsHet: 0.6 }),
      );
      expect(p.filters.map((f) => f.kind)).toEqual([
        "missing_data",
        "obs_het",
        "maf",
        "ld",
      ]);
      expect(p.filters[0]).toBe(before.filters[0]);
      expect(p.filters[2]).toBe(before.filters[1]);
      expect(
        setVariantFilter(p, {
          kind: "missing_data",
          maxAllowedMissingRate: 0.1,
        }),
      ).toBe(p);
    });

    test("no command moves a filter: project.ts exports none whose name starts with move", async () => {
      const module: object = await import("./project.ts");
      expect(
        Object.keys(module).filter((name) => name.startsWith("move")),
      ).toEqual([]);
    });

    test("any sequence of commands keeps the filters of the variants in their fixed order, one of each kind", () => {
      fc.assert(
        fc.property(fc.array(drawnCommand, { maxLength: 20 }), (commands) => {
          let p = sampleProject();
          for (const command of commands) {
            const bound = command.bind(p);
            if (bound === null) {
              continue;
            }
            p = deepFreeze(bound(p));
            const ranks = p.filters.map((f) =>
              VARIANT_FILTER_ORDER.indexOf(f.kind),
            );
            expect(ranks).toEqual(
              [...new Set(ranks)].toSorted((a, b) => a - b),
            );
          }
        }),
      );
    });
  });

  describe("individualListNeeds", () => {
    test.each([
      [
        "keep",
        [],
        "The list of individuals to keep is empty. Add individuals to it, or remove the filter, in the Variants step.",
      ],
      [
        "remove",
        [],
        "The list of individuals to remove is empty. Add individuals to it, or remove the filter, in the Variants step.",
      ],
      [
        "keep",
        ["ind_044", "ind_031", "ind_031"],
        "The list of individuals to keep names ind_031 more than once. Change the list, or remove the filter, in the Variants step.",
      ],
      [
        "remove",
        ["ind_044", "ind_031", "ind_031"],
        "The list of individuals to remove names ind_031 more than once. Change the list, or remove the filter, in the Variants step.",
      ],
      [
        "keep",
        ["ind_031", "ind_900", "ind_901"],
        "The list of individuals to keep names 2 individuals that are not in panel.nei: ind_900 and ind_901. Change the list, or remove the filter, in the Variants step.",
      ],
      [
        "remove",
        ["ind_031", "ind_900", "ind_901"],
        "The list of individuals to remove names 2 individuals that are not in panel.nei: ind_900 and ind_901. Change the list, or remove the filter, in the Variants step.",
      ],
    ] as const)(
      "the list to %s of %o gives its list and its reason",
      (list, individuals, reason) => {
        expect(
          individualListNeeds(
            withListsOfPanel([{ kind: list, individuals: [...individuals] }]),
          ),
        ).toEqual({ list, reason });
      },
    );

    test("null for a bad list while the variants file is not read", () => {
      const lists = [{ kind: "keep" as const, individuals: [] }];
      const reads: readonly SourceRead[] = [
        { kind: "pending" },
        { kind: "failed", error: { kind: "popnei", message: "not a nei" } },
      ];
      for (const read of reads) {
        expect(individualListNeeds(withListsOfPanel(lists, read))).toBeNull();
      }
      expect(
        individualListNeeds(
          deepFreeze({ ...withListsOfPanel(lists), variants: null }),
        ),
      ).toBeNull();
    });

    test("projectNeeds gives null for a read file with a bad list", () => {
      const p = withListsOfPanel([
        { kind: "keep", individuals: [] },
        { kind: "remove", individuals: ["ind_900"] },
      ]);
      expect(individualListNeeds(p)).not.toBeNull();
      expect(projectNeeds(p)).toBeNull();
    });

    test("null for lists popnei accepts, and the list to keep named before the list to remove", () => {
      expect(
        individualListNeeds(
          withListsOfPanel([
            { kind: "keep", individuals: ["ind_031", "ind_044"] },
            { kind: "remove", individuals: ["ind_044"] },
          ]),
        ),
      ).toBeNull();
      expect(
        individualListNeeds(
          withListsOfPanel([
            { kind: "keep", individuals: ["ind_900"] },
            { kind: "remove", individuals: [] },
          ]),
        )?.list,
      ).toBe("keep");
    });
  });

  describe("parseProject refuses the filters of the variants out of their order", () => {
    test("[maf, missing_data] is filterOutOfOrder at the second filter, with its text", () => {
      const result = parse(
        fileWith({
          filters: [
            { kind: "maf", maxAllowedMaf: 0.95 },
            { kind: "missing_data", maxAllowedMissingRate: 0.1 },
          ],
        }),
      );
      expect(result).toEqual({
        ok: false,
        error: { kind: "filterOutOfOrder", path: ["filters", 1] },
      });
      expect(projectErrorText(errorOf(result))).toBe(
        "The project file cannot be opened: the filters of the variants should be in the order missing genotypes, observed heterozygosity, major allele frequency, linkage disequilibrium, and the second one is out of that order. The file was changed outside the application, or is damaged. Open a copy saved before the change, or make the project again.",
      );
    });

    test.each([
      [["obs_het", "missing_data"], 1],
      [["maf", "obs_het"], 1],
      [["missing_data", "ld", "maf"], 2],
    ] as const)("the kinds %o are refused at the filter %d", (kinds, index) => {
      const all = {
        missing_data: { kind: "missing_data", maxAllowedMissingRate: 0.1 },
        obs_het: { kind: "obs_het", maxAllowedObsHet: 0.5 },
        maf: { kind: "maf", maxAllowedMaf: 0.95 },
        ld: { kind: "ld", maxAllowedR2: 0.5, maxDist: 1000 },
      };
      expect(
        parse(fileWith({ filters: kinds.map((kind) => all[kind]) })),
      ).toEqual({
        ok: false,
        error: { kind: "filterOutOfOrder", path: ["filters", index] },
      });
    });

    test("the four filters in their order are accepted", () => {
      const filters = [
        { kind: "missing_data", maxAllowedMissingRate: 0.1 },
        { kind: "obs_het", maxAllowedObsHet: 0.5 },
        { kind: "maf", maxAllowedMaf: 0.95 },
        { kind: "ld", maxAllowedR2: 0.5, maxDist: 1000 },
      ];
      const result = parse(fileWith({ filters }));
      expect(result.ok && result.value.filters).toEqual(filters);
    });
  });
});

// The LD filter of the variants with no distance: the project spec, "What
// an analysis needs of every project", "The validation" and "How it is
// verified", `variantFilterNeeds` and `jobFilters`.

/** The reason of the LD filter with no distance, in the spec's words. */
const LD_NO_DISTANCE_REASON =
  "The LD filter of the Variants step needs the distance within which variants are compared. It has no default, because it depends on how far linkage disequilibrium extends in the genome of your species. Type a distance in base pairs, or turn off the LD filter, in the Variants step.";

/** The LD filter as its switch turns it on, with no distance. */
const LD_NO_DISTANCE = {
  kind: "ld",
  maxAllowedR2: 0.3,
  maxDist: null,
} as const;

describe("IP3 D1 the LD filter with no distance", () => {
  test("variantFilterNeeds gives its reason with no variants file", () => {
    const p = setVariantFilter(
      freezeProject(emptyProject("popgen")),
      LD_NO_DISTANCE,
    );
    expect(p.variants).toBeNull();
    expect(variantFilterNeeds(p)).toBe(LD_NO_DISTANCE_REASON);
  });

  test("variantFilterNeeds gives its reason with a variants file read", () => {
    const p = setVariantFilter(sampleProject(), LD_NO_DISTANCE);
    expect(projectNeeds(p)).toBeNull();
    expect(variantFilterNeeds(p)).toBe(LD_NO_DISTANCE_REASON);
  });

  test("variantFilterNeeds gives null with a distance, with no LD filter, and for an empty project", () => {
    expect(
      variantFilterNeeds(
        setVariantFilter(sampleProject(), { ...LD_NO_DISTANCE, maxDist: 1 }),
      ),
    ).toBeNull();
    expect(sampleProject().filters.some((f) => f.kind === "ld")).toBe(false);
    expect(variantFilterNeeds(sampleProject())).toBeNull();
    expect(
      variantFilterNeeds(freezeProject(emptyProject("popgen"))),
    ).toBeNull();
  });

  test("setVariantFilter of the LD filter with no distance is accepted, in the place of its kind, and of 0 and 2.5 a defect", () => {
    const p = setVariantFilter(sampleProject(), LD_NO_DISTANCE);
    expect(p.filters).toStrictEqual([
      ...sampleProject().filters,
      LD_NO_DISTANCE,
    ]);
    for (const maxDist of [0, 2.5]) {
      expect(() =>
        setVariantFilter(sampleProject(), { ...LD_NO_DISTANCE, maxDist }),
      ).toThrow(DEFECT);
    }
  });

  test("jobFilters gives the filters of a project with a distance, the same array", () => {
    const p = setVariantFilter(sampleProject(), {
      ...LD_NO_DISTANCE,
      maxDist: 50000,
    });
    expect(jobFilters(p.filters)).toBe(p.filters);
    const sample = sampleProject().filters;
    expect(jobFilters(sample)).toBe(sample);
    const none = freezeProject(emptyProject("popgen")).filters;
    expect(jobFilters(none)).toBe(none);
  });

  test("jobFilters of a list with the LD filter with no distance is a defect", () => {
    const p = setVariantFilter(sampleProject(), LD_NO_DISTANCE);
    expect(() => jobFilters(p.filters)).toThrow(DEFECT);
  });

  test("parseProject of the LD filter with no distance accepts it", () => {
    const filters = [
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
      LD_NO_DISTANCE,
    ];
    const result = parse(fileWith({ filters }));
    expect(result.ok && result.value.filters).toStrictEqual(filters);
    expect(result.ok && variantFilterNeeds(result.value)).toBe(
      LD_NO_DISTANCE_REASON,
    );
  });

  test("parseProject of a maxDist of 0 refuses it, a whole number, 1 or more, or nothing", () => {
    expect(
      parse(fileWith({ filters: [{ ...LD_NO_DISTANCE, maxDist: 0 }] })),
    ).toStrictEqual(
      wrong(["filters", 0, "maxDist"], "a whole number, 1 or more, or nothing"),
    );
  });

  test('parseProject of a maxDist of "1000" refuses it, a number or nothing', () => {
    expect(
      parse(fileWith({ filters: [{ ...LD_NO_DISTANCE, maxDist: "1000" }] })),
    ).toStrictEqual(wrong(["filters", 0, "maxDist"], "a number or nothing"));
  });

  test("the LD filter turned on, its r² changed, then its distance typed: two commands, the reason until the second", () => {
    const off = freezeProject(emptyProject("popgen"));
    const on = freezeProject(setVariantFilter(off, LD_NO_DISTANCE));
    expect(on).not.toBe(off);
    expect(variantFilterNeeds(on)).toBe(LD_NO_DISTANCE_REASON);
    const r2 = freezeProject(
      setVariantFilter(on, { ...LD_NO_DISTANCE, maxAllowedR2: 0.2 }),
    );
    expect(r2.filters).toStrictEqual([
      { ...LD_NO_DISTANCE, maxAllowedR2: 0.2 },
    ]);
    expect(variantFilterNeeds(r2)).toBe(LD_NO_DISTANCE_REASON);
    expect(setVariantFilter(r2, { ...LD_NO_DISTANCE, maxAllowedR2: 0.2 })).toBe(
      r2,
    );
    const typed = setVariantFilter(r2, {
      kind: "ld",
      maxAllowedR2: 0.2,
      maxDist: 50000,
    });
    expect(variantFilterNeeds(typed)).toBeNull();
    expect(typed.individualFilters).toBe(r2.individualFilters);
  });

  test("for every project, variantFilterNeeds gives a reason exactly when the LD filter has no distance, jobFilters throws exactly then, and the project reads back from its JSON", () => {
    /** Projects with the LD filter with no distance in about half. */
    const withLd = fc
      .tuple(
        wholeProject,
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.option(fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }), {
          freq: 2,
        }),
        fc.boolean(),
      )
      .map(([p, r2, maxDist, add]) =>
        add
          ? freezeProject(
              setVariantFilter(p, { kind: "ld", maxAllowedR2: r2, maxDist }),
            )
          : p,
      );
    let noDistance = 0;
    fc.assert(
      fc.property(withLd, (p) => {
        const none = p.filters.some(
          (f) => f.kind === "ld" && f.maxDist === null,
        );
        noDistance += none ? 1 : 0;
        expect(variantFilterNeeds(p)).toBe(none ? LD_NO_DISTANCE_REASON : null);
        if (none) {
          expect(() => jobFilters(p.filters)).toThrow(DEFECT);
        } else {
          expect(jobFilters(p.filters)).toBe(p.filters);
        }
        expect(
          parseProject(JSON.parse(JSON.stringify(p)), p.app, 1, TEST_ANALYSES),
        ).toStrictEqual({ ok: true, value: p });
      }),
      { numRuns: 200 },
    );
    // The drawn projects reach the filter with no distance.
    expect(noDistance).toBeGreaterThan(20);
  });
});

/** The text of an error of a project file around the words of what is
    wrong. */
function openedText(what: string): string {
  return `The project file cannot be opened: ${what}. The file was changed outside the application, or is damaged. Open a copy saved before the change, or make the project again.`;
}

describe("IP3 D1 the filters turned off", () => {
  test("the worked case of the filters of the variants: two turned off with their values, one turned on again with the values kept, and an undo of each the project before it", () => {
    let p = freezeProject(emptyProject("popgen"));
    for (const filter of [
      { kind: "maf", maxAllowedMaf: 0.95 },
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
      { kind: "maf", maxAllowedMaf: 0.9 },
      { kind: "ld", maxAllowedR2: 0.2, maxDist: 50000 },
      { kind: "obs_het", maxAllowedObsHet: 0.6 },
    ] as const) {
      p = freezeProject(setVariantFilter(p, filter));
    }
    expect(p.filters.map((f) => f.kind)).toStrictEqual([
      "missing_data",
      "obs_het",
      "maf",
      "ld",
    ]);
    expect(p.filtersOff).toStrictEqual([]);

    let h = startHistory(p, MAX_UNDO_STEPS);
    const step = (command: (q: Project) => Project): Project => {
      const next = freezeProject(command(h.present.project));
      h = commit(h, next, "a switch");
      return next;
    };
    const obsHetOff = step((q) => turnOffVariantFilter(q, "obs_het"));
    const ldOff = step((q) => turnOffVariantFilter(q, "ld"));
    expect(ldOff.filters).toStrictEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
      { kind: "maf", maxAllowedMaf: 0.9 },
    ]);
    expect(ldOff.filtersOff).toStrictEqual([
      { kind: "obs_het", maxAllowedObsHet: 0.6 },
      { kind: "ld", maxAllowedR2: 0.2, maxDist: 50000 },
    ]);
    expect(ldOff.individualFilters).toBe(p.individualFilters);

    const kept = ldOff.filtersOff[1];
    if (kept === undefined) {
      throw new Error("the LD filter is kept");
    }
    const ldOn = step((q) => setVariantFilter(q, kept));
    expect(ldOn.filters).toStrictEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
      { kind: "maf", maxAllowedMaf: 0.9 },
      { kind: "ld", maxAllowedR2: 0.2, maxDist: 50000 },
    ]);
    expect(ldOn.filtersOff).toStrictEqual([
      { kind: "obs_het", maxAllowedObsHet: 0.6 },
    ]);

    h = undo(h);
    expect(h.present.project).toBe(ldOff);
    h = undo(h);
    expect(h.present.project).toBe(obsHetOff);
    h = undo(h);
    expect(h.present.project).toBe(p);
  });

  test("the worked case of the individuals: the threshold of observed heterozygosity at 0.38 turned off is kept, and turned on again leaves the list of those off", () => {
    const p = sampleProject();
    const on = freezeProject(
      setIndividualFilter(p, { kind: "obs_het", maxAllowedObsHet: 0.38 }),
    );
    const off = freezeProject(turnOffIndividualFilter(on, "obs_het"));
    expect(off.individualFilters).toStrictEqual(p.individualFilters);
    expect(off.individualFiltersOff).toStrictEqual([
      { kind: "obs_het", maxAllowedObsHet: 0.38 },
    ]);
    expect(off.filters).toBe(p.filters);
    expect(off.filtersOff).toBe(p.filtersOff);

    const kept = off.individualFiltersOff[0];
    if (kept === undefined) {
      throw new Error("the threshold is kept");
    }
    const back = setIndividualFilter(off, kept);
    expect(back.individualFilters).toStrictEqual(on.individualFilters);
    expect(back.individualFiltersOff).toStrictEqual([]);
  });

  test("a filter off by a project that already keeps one of its kind is a defect, for the variants and the individuals", () => {
    const md = { kind: "missing_data", maxAllowedMissingRate: 0.1 } as const;
    const both = freezeProject({
      ...sampleProject(),
      filters: [md],
      filtersOff: [md],
    });
    expect(() => turnOffVariantFilter(both, "missing_data")).toThrow(
      /^popnei_web defect: /u,
    );
    const threshold = { kind: "obs_het", maxAllowedObsHet: 0.38 } as const;
    const bothIndividuals = freezeProject({
      ...sampleProject(),
      individualFilters: [threshold],
      individualFiltersOff: [threshold],
    });
    expect(() => turnOffIndividualFilter(bothIndividuals, "obs_het")).toThrow(
      /^popnei_web defect: /u,
    );
  });

  test("turned off after it was turned on again, a filter goes among those off at the place of its kind, before one of a later kind", () => {
    let p = sampleProject();
    p = freezeProject(turnOffVariantFilter(p, "missing_data"));
    p = freezeProject(turnOffVariantFilter(p, "maf"));
    p = freezeProject(
      setVariantFilter(p, { kind: "missing_data", maxAllowedMissingRate: 0.3 }),
    );
    p = freezeProject(turnOffVariantFilter(p, "missing_data"));
    expect(p.filters).toStrictEqual([]);
    expect(p.filtersOff).toStrictEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.3 },
      { kind: "maf", maxAllowedMaf: 0.95 },
    ]);
  });

  test("setVariantFilter of a kind kept off with other values turns it on with them, the kind gone from filtersOff", () => {
    const off = freezeProject(turnOffVariantFilter(sampleProject(), "maf"));
    const on = setVariantFilter(off, { kind: "maf", maxAllowedMaf: 0.8 });
    expect(on.filters).toStrictEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
      { kind: "maf", maxAllowedMaf: 0.8 },
    ]);
    expect(on.filtersOff).toStrictEqual([]);
  });

  test("turnOffVariantFilter and turnOffIndividualFilter of a kind not on give the project itself, whatever the list of the filters off holds", () => {
    const off = freezeProject(
      turnOffIndividualFilter(
        turnOffVariantFilter(sampleProject(), "maf"),
        "missing_data",
      ),
    );
    expect(off.filtersOff).toHaveLength(1);
    expect(off.individualFiltersOff).toHaveLength(1);
    expect(turnOffVariantFilter(off, "maf")).toBe(off);
    expect(turnOffVariantFilter(off, "ld")).toBe(off);
    expect(turnOffIndividualFilter(off, "missing_data")).toBe(off);
    expect(turnOffIndividualFilter(off, "obs_het")).toBe(off);
  });

  test("the LD filter turned off before its distance was typed is kept with no distance, locks nothing, and turned on again locks again", () => {
    const on = freezeProject(setVariantFilter(sampleProject(), LD_NO_DISTANCE));
    expect(variantFilterNeeds(on)).toBe(LD_NO_DISTANCE_REASON);
    const off = freezeProject(turnOffVariantFilter(on, "ld"));
    expect(off.filtersOff).toStrictEqual([LD_NO_DISTANCE]);
    expect(variantFilterNeeds(off)).toBeNull();
    expect(jobFilters(off.filters)).toBe(off.filters);
    const kept = off.filtersOff[0];
    if (kept === undefined) {
      throw new Error("the LD filter is kept");
    }
    expect(variantFilterNeeds(setVariantFilter(off, kept))).toBe(
      LD_NO_DISTANCE_REASON,
    );
  });

  test("parseProject of a project with neither list of the filters off opens it with both empty", () => {
    const rest = Object.fromEntries(
      Object.entries(sampleProject()).filter(
        ([name]) => name !== "filtersOff" && name !== "individualFiltersOff",
      ),
    );
    expect(parse(JSON.parse(JSON.stringify(rest)))).toStrictEqual({
      ok: true,
      value: { ...sampleProject(), filtersOff: [], individualFiltersOff: [] },
    });
  });

  test("parseProject of the missing data filter both on and off refuses it at the one off, with its text", () => {
    const result = parse(
      fileWith({
        filtersOff: [{ kind: "maf", maxAllowedMaf: 0.9 }],
      }),
    );
    expect(result).toStrictEqual({
      ok: false,
      error: {
        kind: "twoFiltersOfAKind",
        path: ["filtersOff", 0],
        filter: "maf",
      },
    });
    const both = parse(
      fileWith({
        filtersOff: [{ kind: "missing_data", maxAllowedMissingRate: 0.3 }],
      }),
    );
    expect(both).toStrictEqual({
      ok: false,
      error: {
        kind: "twoFiltersOfAKind",
        path: ["filtersOff", 0],
        filter: "missing_data",
      },
    });
    expect(projectErrorText(errorOf(both))).toBe(
      openedText(
        "it has the filter of the variants by missing genotypes both on and turned off, and a filter is one or the other",
      ),
    );
  });

  test("parseProject of a threshold of the individuals both on and off refuses it at the one off, with its text", () => {
    const result = parse(
      fileWith({
        individualFiltersOff: [
          { kind: "missing_data", maxAllowedMissingRate: 0.3 },
        ],
      }),
    );
    expect(result).toStrictEqual({
      ok: false,
      error: {
        kind: "twoFiltersOfAKind",
        path: ["individualFiltersOff", 0],
        filter: "missing_data",
      },
    });
    expect(projectErrorText(errorOf(result))).toBe(
      openedText(
        "it has the filter of the individuals by missing genotypes both on and turned off, and a filter is one or the other",
      ),
    );
  });

  test("parseProject of a list to keep in individualFiltersOff refuses it as a wrong kind", () => {
    const result = parse(
      fileWith({
        individualFiltersOff: [{ kind: "keep", individuals: ["i1"] }],
      }),
    );
    expect(result).toStrictEqual(
      wrong(
        ["individualFiltersOff", 0, "kind"],
        "missing genotypes or observed heterozygosity",
      ),
    );
    expect(projectErrorText(errorOf(result))).toBe(
      openedText(
        "the kind of the first filter of the individuals turned off should be missing genotypes or observed heterozygosity",
      ),
    );
  });

  test("parseProject of two filters of one kind turned off, of the filters off out of their order, and of a threshold off above 1, each with its text", () => {
    const two = parse(
      fileWith({
        filters: [],
        filtersOff: [
          { kind: "maf", maxAllowedMaf: 0.9 },
          { kind: "maf", maxAllowedMaf: 0.8 },
        ],
      }),
    );
    expect(two).toStrictEqual({
      ok: false,
      error: {
        kind: "twoFiltersOfAKind",
        path: ["filtersOff", 1, "kind"],
        filter: "maf",
      },
    });
    expect(projectErrorText(errorOf(two))).toBe(
      openedText(
        "it has two filters of the variants turned off by major allele frequency, and a project has at most one of each kind",
      ),
    );

    const order = parse(
      fileWith({
        individualFilters: [],
        individualFiltersOff: [
          { kind: "obs_het", maxAllowedObsHet: 0.3 },
          { kind: "missing_data", maxAllowedMissingRate: 0.3 },
        ],
      }),
    );
    expect(order).toStrictEqual({
      ok: false,
      error: { kind: "filterOutOfOrder", path: ["individualFiltersOff", 1] },
    });
    expect(projectErrorText(errorOf(order))).toBe(
      openedText(
        "the filters of the individuals turned off should be in the order missing genotypes, observed heterozygosity, and the second one is out of that order",
      ),
    );

    const above = parse(
      fileWith({
        filters: [],
        filtersOff: [{ kind: "missing_data", maxAllowedMissingRate: 1.5 }],
      }),
    );
    expect(above).toStrictEqual(
      wrong(["filtersOff", 0, "maxAllowedMissingRate"], "a number from 0 to 1"),
    );
    expect(projectErrorText(errorOf(above))).toBe(
      openedText(
        "the threshold of the first filter of the variants turned off should be a number from 0 to 1",
      ),
    );

    const thresholdAbove = parse(
      fileWith({
        individualFilters: [],
        individualFiltersOff: [{ kind: "obs_het", maxAllowedObsHet: 1.5 }],
      }),
    );
    expect(thresholdAbove).toStrictEqual(
      wrong(
        ["individualFiltersOff", 0, "maxAllowedObsHet"],
        "a number from 0 to 1",
      ),
    );
    expect(projectErrorText(errorOf(thresholdAbove))).toBe(
      openedText(
        "the threshold of the first filter of the individuals turned off should be a number from 0 to 1",
      ),
    );
  });

  test("for every project, an LD filter with no distance in filtersOff locks nothing, and the project reads back from its JSON", () => {
    let offWithNoDistance = 0;
    fc.assert(
      fc.property(wholeProject, (p) => {
        const onNone = p.filters.some(
          (f) => f.kind === "ld" && f.maxDist === null,
        );
        const offNone = p.filtersOff.some(
          (f) => f.kind === "ld" && f.maxDist === null,
        );
        offWithNoDistance += offNone ? 1 : 0;
        expect(variantFilterNeeds(p)).toBe(
          onNone ? LD_NO_DISTANCE_REASON : null,
        );
        expect(
          parseProject(JSON.parse(JSON.stringify(p)), p.app, 1, TEST_ANALYSES),
        ).toStrictEqual({ ok: true, value: p });
      }),
      { numRuns: 300 },
    );
    // The drawn projects reach an LD filter with no distance turned off.
    expect(offWithNoDistance).toBeGreaterThan(10);
  });

  test("for every sequence of commands, each of the four lists of filters has one filter of each kind at most, in its fixed order, no kind is both on and off, and a filter turned off then on again by the value kept gives the filters on of before", () => {
    const rankIn =
      <K extends string>(order: readonly K[]) =>
      (filters: readonly { readonly kind: K }[]): number[] =>
        filters.map((f) => order.indexOf(f.kind));
    const strictlyRising = (ranks: readonly number[]): boolean =>
      ranks.every((rank, at) => at === 0 || rank > (ranks[at - 1] ?? -1));
    const variantRanks = rankIn(VARIANT_FILTER_ORDER);
    const individualRanks = rankIn(INDIVIDUAL_FILTER_ORDER);
    let turnedBack = 0;
    let keptOff = 0;
    fc.assert(
      fc.property(fc.array(drawnCommand, { maxLength: 30 }), (commands) => {
        let p = sampleProject();
        for (const command of commands) {
          const bound = command.bind(p);
          if (bound === null) {
            continue;
          }
          const before = p;
          p = deepFreeze(bound(p));
          for (const list of [p.filters, p.filtersOff]) {
            expect(strictlyRising(variantRanks(list))).toBe(true);
          }
          for (const list of [p.individualFilters, p.individualFiltersOff]) {
            expect(strictlyRising(individualRanks(list))).toBe(true);
          }
          expect(
            p.filtersOff.filter((f) =>
              p.filters.some((g) => g.kind === f.kind),
            ),
          ).toStrictEqual([]);
          expect(
            p.individualFiltersOff.filter((f) =>
              p.individualFilters.some((g) => g.kind === f.kind),
            ),
          ).toStrictEqual([]);
          keptOff +=
            p.filtersOff.length + p.individualFiltersOff.length > 0 ? 1 : 0;

          // Turned off, then on again by the value kept: the filters on
          // of before.
          for (const filter of before.filters) {
            const off = deepFreeze(turnOffVariantFilter(before, filter.kind));
            const kept = off.filtersOff.find((f) => f.kind === filter.kind);
            if (kept === undefined) {
              throw new Error("the filter turned off is kept");
            }
            expect(setVariantFilter(off, kept).filters).toStrictEqual(
              before.filters,
            );
            turnedBack += 1;
          }
          for (const filter of before.individualFilters) {
            if (filter.kind === "keep" || filter.kind === "remove") {
              continue;
            }
            const off = deepFreeze(
              turnOffIndividualFilter(before, filter.kind),
            );
            const kept = off.individualFiltersOff.find(
              (f) => f.kind === filter.kind,
            );
            if (kept === undefined) {
              throw new Error("the threshold turned off is kept");
            }
            expect(
              setIndividualFilter(off, kept).individualFilters,
            ).toStrictEqual(before.individualFilters);
          }
        }
      }),
      { numRuns: 200 },
    );
    expect(keptOff).toBeGreaterThan(100);
    expect(turnedBack).toBeGreaterThan(100);
  });
});

/** The table of the worked example of docs/specs/analyses/diversity.md,
    "How it is verified": `i4` has no population, and `i5` is not in the
    variants file. */
const POPS_TABLE: IndividualsTable = {
  columns: ["name", "pop", "other"],
  rows: [
    ["i1", "A", "x"],
    ["i2", "B", "y"],
    ["i3", "A", "x"],
    ["i4", null, "z"],
    ["i5", "C", "y"],
  ],
};

/** A table of the individuals `names`, each with its population in
    `pops`, in a column `pop`. */
function popsTableOf(
  names: readonly string[],
  pops: readonly Cell[],
): IndividualsTable {
  return {
    columns: ["name", "pop"],
    rows: names.map((name, i) => [name, pops[i] ?? null]),
  };
}

/** A project of population genetics of the worked example, frozen
    deeply: a `.nei` file `panel.nei` read with `individuals`, `i1` to
    `i4` unless given, a CSV `pops.csv` read with `table`, or no
    individuals file when `table` is `null`, and the grouping `grouping`,
    the column `pop` unless given. */
function popsProject(
  options: {
    readonly individuals?: readonly string[];
    readonly table?: IndividualsTable | null;
    readonly grouping?: Grouping;
  } = {},
): Project {
  const table = options.table === undefined ? POPS_TABLE : options.table;
  return deepFreeze<Project>({
    ...emptyProject("popgen"),
    variants: {
      fileId: SAMPLE_VARIANTS_ID,
      name: "panel.nei",
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
    individuals:
      table === null
        ? null
        : {
            fileId: SAMPLE_INDIVIDUALS_ID,
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
    grouping: options.grouping ?? { kind: "populations", column: "pop" },
  });
}

/** The project `p` with its individuals file pending. */
function popsPending(p: Project): Project {
  if (p.individuals === null) {
    throw new Error("the project of the test has an individuals file");
  }
  return deepFreeze<Project>({
    ...p,
    individuals: { ...p.individuals, read: { kind: "pending" } },
  });
}

/** The project `p` whose `variants` is a getter that throws, so that a
    function that reads it fails the test. */
function variantsUnread(p: Project): Project {
  const copy = { ...p };
  Object.defineProperty(copy, "variants", {
    get: () => {
      throw new Error("the variants file was read");
    },
    enumerable: true,
  });
  return Object.freeze(copy);
}

/** The groupings a project of population genetics can hold. */
const EVERY_GROUPING: readonly Grouping[] = [
  { kind: "populations", column: "pop" },
  { kind: "populations", column: null },
  { kind: "onePopulation" },
];

/** The words of the reasons about the column of the populations, beside
    a Run button and in the Individuals step. */
const NO_COLUMN = {
  kind: "noColumn",
  reason:
    "Choose the column that defines the populations, or all individuals in one population, in the Individuals step.",
  inStep:
    "Choose the column that defines the populations, or all individuals in one population.",
};

describe("IP4 D1 the populations", () => {
  test("without a metadata file, whatever the grouping, the one population of every individual of the variants file", () => {
    for (const grouping of EVERY_GROUPING) {
      const p = popsProject({ table: null, grouping });
      expect(populationsOf(p)).toBe("all");
      expect(populationsToRun(p)).toStrictEqual([
        ["All individuals", ["i1", "i2", "i3", "i4"]],
      ]);
      expect(populationsKept(p, ["i1", "i3"])).toStrictEqual({
        pops: [["All individuals", ["i1", "i3"]]],
        emptied: [],
      });
      expect(populationsNeeds(p)).toBeNull();
    }
    expect(ONE_POPULATION).toBe("All individuals");
  });

  test("with a metadata file and the grouping onePopulation, the same one population", () => {
    const p = popsProject({ grouping: { kind: "onePopulation" } });
    expect(populationsOf(p)).toBe("all");
    expect(populationsToRun(p)).toStrictEqual([
      ["All individuals", ["i1", "i2", "i3", "i4"]],
    ]);
    expect(populationsKept(p, ["i1", "i3"])).toStrictEqual({
      pops: [["All individuals", ["i1", "i3"]]],
      emptied: [],
    });
    expect(populationsNeeds(p)).toBeNull();
  });

  test("populationsOf of the one population does not read the variants file, with no metadata file or with onePopulation", () => {
    expect(populationsOf(variantsUnread(popsProject({ table: null })))).toBe(
      "all",
    );
    expect(
      populationsOf(
        variantsUnread(popsProject({ grouping: { kind: "onePopulation" } })),
      ),
    ).toBe("all");
    expect(populationsOf(variantsUnread(popsProject()))).toStrictEqual([
      ["A", ["i1", "i3"]],
      ["B", ["i2"]],
      ["C", ["i5"]],
    ]);
  });

  test("a metadata file read with no column chosen gives no populations, and populationsNeeds of the kind noColumn with its words", () => {
    const p = popsProject({ grouping: { kind: "populations", column: null } });
    expect(populationsOf(p)).toBeNull();
    expect(populationsToRun(p)).toBeNull();
    expect(populationsKept(p, null)).toBeNull();
    expect(populationsNeeds(p)).toStrictEqual(NO_COLUMN);
  });

  test("a metadata file not read gives no populations and no reason, whatever the grouping, the one population included", () => {
    for (const grouping of EVERY_GROUPING) {
      const p = popsPending(popsProject({ grouping }));
      expect(populationsOf(p)).toBeNull();
      expect(populationsToRun(p)).toBeNull();
      expect(populationsNeeds(p)).toBeNull();
    }
  });

  test("the column of an xlsx whose cells are the number 1, the text 1 and the number 2 gives the populations 1 and 2", () => {
    const table: IndividualsTable = {
      columns: ["name", "pop"],
      rows: [
        ["i1", 1],
        ["i2", "1"],
        ["i3", 2],
        ["i4", 2],
      ],
    };
    const base = popsProject({ table });
    if (base.individuals === null) {
      throw new Error("the project of the test has an individuals file");
    }
    const xlsx = deepFreeze<Project>({
      ...base,
      individuals: { ...base.individuals, name: "pops.xlsx", csv: null },
    });
    expect(populationsOf(xlsx)).toStrictEqual([
      ["1", ["i1", "i2"]],
      ["2", ["i3", "i4"]],
    ]);
    expect(populationsToRun(xlsx)).toStrictEqual([
      ["1", ["i1", "i2"]],
      ["2", ["i3", "i4"]],
    ]);
  });

  test("populationsBeforeRun of a column takes the known list, and the individuals the lists keep while a threshold waits for the statistics", () => {
    const p = popsProject();
    expect(
      populationsBeforeRun(p, {
        list: { kind: "known", individuals: ["i1", "i3"] },
        byLists: ["i1", "i2", "i3"],
        counts: [],
      }),
    ).toStrictEqual({ pops: [["A", ["i1", "i3"]]], emptied: ["B"] });
    expect(
      populationsBeforeRun(p, {
        list: { kind: "needsStatistics" },
        byLists: ["i2"],
        counts: [],
      }),
    ).toStrictEqual({ pops: [["B", ["i2"]]], emptied: ["A"] });
  });

  test("populationsBeforeRun of the one population takes the known list, and the individuals the lists keep while a threshold waits for the statistics", () => {
    for (const p of [
      popsProject({ table: null }),
      popsProject({ grouping: { kind: "onePopulation" } }),
    ]) {
      expect(
        populationsBeforeRun(p, {
          list: { kind: "known", individuals: ["i1", "i3"] },
          byLists: ["i1", "i2", "i3"],
          counts: [],
        }),
      ).toStrictEqual({
        pops: [["All individuals", ["i1", "i3"]]],
        emptied: [],
      });
      expect(
        populationsBeforeRun(p, {
          list: { kind: "needsStatistics" },
          byLists: ["i2", "i4"],
          counts: [],
        }),
      ).toStrictEqual({
        pops: [["All individuals", ["i2", "i4"]]],
        emptied: [],
      });
      expect(
        populationsBeforeRun(p, {
          list: { kind: "known", individuals: null },
          byLists: ["i1", "i2", "i3", "i4"],
          counts: [],
        }),
      ).toBe(populationsKept(p, null));
    }
  });

  test("populationsToRun of the one population is the same array for the same read of the variants file, and follows a new read", () => {
    const p = popsProject({ table: null });
    expect(populationsToRun(p)).toBe(populationsToRun(p));
    if (p.variants === null) {
      throw new Error("the project of the test has a variants file");
    }
    const other = deepFreeze<Project>({
      ...p,
      variants: {
        ...p.variants,
        read: {
          kind: "read",
          individuals: ["i2", "i1"],
          ploidy: 2,
          numVars: null,
        },
      },
    });
    expect(populationsToRun(other)).toStrictEqual([
      ["All individuals", ["i2", "i1"]],
    ]);
  });

  test("every function of the populations is null for a project of association", () => {
    const p = deepFreeze<Project>({
      ...popsProject(),
      app: "gwas",
      grouping: { kind: "roles", roles: [] },
    });
    const noFile = deepFreeze<Project>({ ...p, individuals: null });
    for (const project of [p, noFile]) {
      expect(populationsOf(project)).toBeNull();
      expect(populationsToRun(project)).toBeNull();
      expect(populationsKept(project, null)).toBeNull();
      expect(
        populationsBeforeRun(project, {
          list: { kind: "known", individuals: null },
          byLists: ["i1"],
          counts: [],
        }),
      ).toBeNull();
      expect(populationsNeeds(project)).toBeNull();
    }
  });

  test("populationsNeeds gives inStep, the words of reason without the Individuals step, for no column", () => {
    expect(
      populationsNeeds(
        popsProject({ grouping: { kind: "populations", column: null } }),
      ),
    ).toStrictEqual(NO_COLUMN);
  });

  test("populationsNeeds gives inStep, the words of reason without the Individuals step, for no column of that name", () => {
    expect(
      populationsNeeds(
        popsProject({ grouping: { kind: "populations", column: "popcat" } }),
      ),
    ).toStrictEqual({
      kind: "noSuchColumn",
      reason:
        "pops.csv has no column popcat, from which the populations were taken. Choose the column that defines the populations, or all individuals in one population, in the Individuals step.",
      inStep:
        "pops.csv has no column popcat, from which the populations were taken. Choose the column that defines the populations, or all individuals in one population.",
    });
  });

  test("populationsNeeds gives inStep, the words of reason without the Individuals step, for no individual with a population", () => {
    expect(
      populationsNeeds(
        popsProject({
          table: popsTableOf(["i1", "i2", "i3"], [null, null, null]),
          individuals: ["i1", "i2", "i3"],
        }),
      ),
    ).toStrictEqual({
      kind: "noPopulation",
      reason:
        "No individual of panel.nei has a population in the column pop of pops.csv. Fill in the column and load the file again, or choose another column, in the Individuals step.",
      inStep:
        "No individual of panel.nei has a population in the column pop of pops.csv. Fill in the column and load the file again, or choose another column.",
    });
  });

  test("individualsNeeds with no metadata file is null in population genetics, whatever the grouping", () => {
    for (const grouping of EVERY_GROUPING) {
      expect(
        individualsNeeds(popsProject({ table: null, grouping })),
      ).toBeNull();
    }
    expect(individualsNeeds(emptyProject("popgen"))).toBeNull();
  });

  test("individualsNeeds with no traits file gives its reason in association", () => {
    expect(
      individualsNeeds(
        deepFreeze<Project>({
          ...popsProject({ table: null }),
          app: "gwas",
          grouping: { kind: "roles", roles: [] },
        }),
      ),
    ).toBe("Load a traits file in the Individuals step.");
  });

  test("the one population chosen, with a file that lacks individuals of the variants, is locked by individualsNeeds, and runs once the file is removed", () => {
    const p = popsProject({
      individuals: ["i1", "i2", "i6"],
      grouping: { kind: "onePopulation" },
    });
    expect(individualsNeeds(p)).toBe(
      "1 individual of panel.nei is not in pops.csv: i6. Add it to the file and load the file again in the Individuals step.",
    );
    const removed = removeIndividuals(p);
    expect(individualsNeeds(removed)).toBeNull();
    expect(populationsToRun(removed)).toStrictEqual([
      ["All individuals", ["i1", "i2", "i6"]],
    ]);
  });

  test("a column chosen, then the file removed: one population, the column kept, and found again by its name when the file is loaded again", () => {
    const p = popsProject();
    const removed = removeIndividuals(p);
    expect(removed.grouping).toBe(p.grouping);
    expect(populationsOf(removed)).toBe("all");
    const loaded = loadIndividuals(removed, {
      fileId: NEW_ID,
      name: "pops.csv",
      csv: { encoding: "auto", separator: "auto", decimal: "auto" },
    });
    const read = p.individuals?.read;
    if (read?.kind !== "read") {
      throw new Error("the project of the test has an individuals file read");
    }
    const again = recordIndividualsRead(
      loaded,
      NEW_ID,
      { encoding: "auto", separator: "auto", decimal: "auto" },
      read,
    );
    expect(populationsOf(again)).toStrictEqual(populationsOf(p));
  });
});

describe("IP4 D1 the grouping onePopulation", () => {
  test("setGrouping sets onePopulation in population genetics, and gives the project itself when it is set", () => {
    const p = popsProject();
    const one = setGrouping(p, { kind: "onePopulation" });
    expect(one.grouping).toStrictEqual({ kind: "onePopulation" });
    expect(one.individuals).toBe(p.individuals);
    expect(one.variants).toBe(p.variants);
    expect(setGrouping(deepFreeze(one), { kind: "onePopulation" })).toBe(one);
  });

  test("setGrouping of onePopulation in association is a defect", () => {
    expect(() =>
      setGrouping(emptyProject("gwas"), { kind: "onePopulation" }),
    ).toThrow(/^popnei_web defect: /);
  });

  test("parseProject opens the grouping onePopulation in population genetics and refuses it in association", () => {
    const p = popsProject({ grouping: { kind: "onePopulation" } });
    const data: unknown = JSON.parse(JSON.stringify(p));
    expect(
      parseProject(data, "popgen", FORMAT_VERSION, TEST_ANALYSES),
    ).toStrictEqual({ ok: true, value: p });
    const gwas: unknown = JSON.parse(JSON.stringify({ ...p, app: "gwas" }));
    expect(
      parseProject(gwas, "gwas", FORMAT_VERSION, TEST_ANALYSES),
    ).toMatchObject({
      ok: false,
      error: { kind: "wrongValue", path: ["grouping", "kind"] },
    });
  });
});

describe("WS5 D3 the populations, moved from the module of the diversity", () => {
  test("populationsOf keeps populations named with whole numbers in the order of the file", () => {
    const p = popsProject({
      table: popsTableOf(["i1", "i2", "i3", "i4"], ["3", "1", "2", "10"]),
    });
    expect(populationsOf(p)).toEqual([
      ["3", ["i1"]],
      ["1", ["i2"]],
      ["2", ["i3"]],
      ["10", ["i4"]],
    ]);
  });

  test("populationsToRun gives back the same array each time", () => {
    const p = popsProject();
    expect(populationsToRun(p)).toBe(populationsToRun(p));
    expect(populationsToRun(p)).toEqual([
      ["A", ["i1", "i3"]],
      ["B", ["i2"]],
    ]);
  });

  test("populationsToRun follows the individuals of a variants file changed in place, which it does not keep", () => {
    const individuals = ["i1", "i2", "i3", "i4"];
    const base = popsProject();
    if (base.variants === null) {
      throw new Error("the project of the test has a variants file");
    }
    const p: Project = {
      ...base,
      variants: {
        ...base.variants,
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

  test("populationsOf follows a row changed in place in a frozen table whose rows are not frozen", () => {
    const second: Cell[] = ["i2", "B", "y"];
    const table: IndividualsTable = Object.freeze({
      columns: Object.freeze(["name", "pop", "other"]),
      rows: Object.freeze([["i1", "A", "x"], second]),
    });
    const base = popsProject();
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

describe("VS3 D3 the populations, moved from the module of the diversity", () => {
  test("populationsKept gives the same value for the same frozen list, the populations to run whole for null, and null with no populations to run", () => {
    const p = popsProject();
    const kept = Object.freeze(["i1", "i2"]);
    expect(populationsKept(p, kept)).toBe(populationsKept(p, kept));
    expect(populationsKept(p, null)).toBe(populationsKept(p, null));
    expect(populationsKept(p, null)).toEqual({
      pops: populationsToRun(p),
      emptied: [],
    });
    expect(
      populationsKept(
        popsProject({ grouping: { kind: "populations", column: null } }),
        kept,
      ),
    ).toBeNull();
  });

  test("populationsBeforeRun takes the known list, and the individuals the lists keep while a threshold waits for the statistics", () => {
    const p = popsProject();
    expect(
      populationsBeforeRun(p, {
        list: { kind: "known", individuals: ["i1", "i3"] },
        byLists: ["i1", "i2", "i3"],
        counts: [],
      }),
    ).toEqual({ pops: [["A", ["i1", "i3"]]], emptied: ["B"] });
    expect(
      populationsBeforeRun(p, {
        list: { kind: "known", individuals: null },
        byLists: ["i2"],
        counts: [],
      }),
    ).toBe(populationsKept(p, null));
    expect(
      populationsBeforeRun(p, {
        list: { kind: "needsStatistics" },
        byLists: ["i2"],
        counts: [],
      }),
    ).toEqual({ pops: [["B", ["i2"]]], emptied: ["A"] });
    expect(
      populationsBeforeRun(
        popsProject({ grouping: { kind: "populations", column: null } }),
        {
          list: { kind: "needsStatistics" },
          byLists: ["i2"],
          counts: [],
        },
      ),
    ).toBeNull();
  });

  test("populationsKept follows a list changed in place, which it does not keep", () => {
    const p = popsProject();
    const kept = ["i1", "i2"];
    expect(populationsKept(p, kept)?.emptied).toEqual([]);
    kept.pop();
    expect(populationsKept(p, kept)?.emptied).toEqual(["B"]);
  });
});
