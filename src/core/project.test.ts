import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import { canonical } from "./keys.ts";
import type { JsonObject, JsonValue } from "./keys.ts";
import {
  FORMAT_VERSION,
  INDIVIDUAL_FILTER_ORDER,
  analysisOptions,
  emptyProject,
  freezeProject,
  loadIndividuals,
  loadVariants,
  moveVariantFilter,
  ordinal,
  parseProject,
  projectErrorText,
  recordIndividualsRead,
  recordVariantsCounted,
  recordVariantsRead,
  removeIndividualFilter,
  removeIndividuals,
  removeVariantFilter,
  setAnalysisOptions,
  setColumnType,
  setCsvOptions,
  setGrouping,
  setIndividualFilter,
  setVariantFilter,
} from "./project.ts";
import type {
  AppId,
  FieldPath,
  IndividualsRead,
  ParsedAnalysis,
  Project,
  ProjectError,
  SourceError,
  SourceRead,
} from "./project.ts";
import type { Result } from "./result.ts";
import type { ColumnType, IndividualsTable } from "../worker/protocol.ts";
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
  "individualFilters",
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
  test("the worked case: a MAF filter set again is replaced in its place", () => {
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
      { kind: "maf", maxAllowedMaf: 0.9 },
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
    ]);
    expect(
      setVariantFilter(p, {
        kind: "missing_data",
        maxAllowedMissingRate: 0.1,
      }),
    ).toBe(p);
  });

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

    test("setVariantFilter of a new kind puts it last", () => {
      const p = sampleProject();
      const q = setVariantFilter(p, { kind: "obs_het", maxAllowedObsHet: 0.5 });
      expect(q.filters).toEqual([
        ...p.filters,
        { kind: "obs_het", maxAllowedObsHet: 0.5 },
      ]);
      expect(q.filters[0]).toBe(p.filters[0]);
      expectKept(p, q, ["filters"]);
    });

    test("removeVariantFilter takes out the filter of its kind", () => {
      const p = sampleProject();
      const q = removeVariantFilter(p, "maf");
      expect(q.filters).toEqual([
        { kind: "missing_data", maxAllowedMissingRate: 0.1 },
      ]);
      expect(q.filters[0]).toBe(p.filters[1]);
      expectKept(p, q, ["filters"]);
    });

    test("moveVariantFilter moves the filter to its new position", () => {
      const p = sampleProject();
      const q = moveVariantFilter(p, "missing_data", 0);
      expect(q.filters).toEqual([p.filters[1], p.filters[0]]);
      expect(q.filters[0]).toBe(p.filters[1]);
      expectKept(p, q, ["filters"]);
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
      individualFilters: [],
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
    ["removeVariantFilter", (p) => removeVariantFilter(p, "ld")],
    ["moveVariantFilter", (p) => moveVariantFilter(p, "maf", 0)],
    [
      "setIndividualFilter",
      (p) => setIndividualFilter(p, { kind: "remove", individuals: ["i4"] }),
    ],
    ["removeIndividualFilter", (p) => removeIndividualFilter(p, "keep")],
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
        /^popnei_web defect: setVariantFilter .*\["filters",0,"maxAllowedMaf"\]/,
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
    test("removeVariantFilter of a kind not there gives the project itself", () => {
      const p = deepFreeze(emptyProject("popgen"));
      expect(removeVariantFilter(p, "maf")).toBe(p);
    });

    test("removeIndividualFilter of a kind not there gives the project itself", () => {
      const p = sampleProject();
      expect(removeIndividualFilter(p, "obs_het")).toBe(p);
    });

    test("removeIndividuals with no individuals file gives the project itself", () => {
      const p = deepFreeze(emptyProject("popgen"));
      expect(removeIndividuals(p)).toBe(p);
    });

    test("moveVariantFilter of a kind not there is a defect", () => {
      expect(() => moveVariantFilter(sampleProject(), "ld", 0)).toThrow(DEFECT);
    });

    test.each([-1, 2, 0.5])(
      "moveVariantFilter to the position %d of two filters is a defect",
      (to) => {
        expect(() => moveVariantFilter(sampleProject(), "maf", to)).toThrow(
          DEFECT,
        );
      },
    );

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
          popneiVersion: "0.1.0",
          appVersion: "0.1.0",
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
  found: { encoding: "utf-8", separator: ",", decimal: "." },
};

const OTHER_ID = "abcdefabcdefabcdefabcdefabcdefab";

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

  test("a worker that could not start: the read is recorded as failed with its error", () => {
    const p = pendingProject();
    const read: SourceRead = {
      kind: "failed",
      error: {
        kind: "worker",
        error: { kind: "couldNotStart", reason: "no ready message, twice" },
      },
    };
    const q = recordVariantsRead(p, NEW_ID, read);
    expect(q.variants?.read).toBe(read);
    expect(recordVariantsRead(deepFreeze(q), NEW_ID, VARIANTS_READ)).toBe(q);
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
  popneiVersion: "0.1.0",
  appVersion: "0.1.0",
  checks: [
    {
      analysis: "diversity",
      numbers: [0.5, null],
      keyVersion: 1,
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

    test("a reference with no version of popnei", () => {
      const data = fileWith({
        reference: {
          variants: REFERENCE.variants,
          appVersion: "0.1.0",
          checks: [],
        },
      });
      expect(errorOf(parse(data))).toEqual({
        kind: "missingField",
        path: ["reference", "popneiVersion"],
      });
    });

    test("a reference whose version of the application is not a text", () => {
      expect(parse(referenceWith({ appVersion: 1 }))).toEqual(
        wrong(["reference", "appVersion"], "a text"),
      );
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
        "This project file has the analysis admixture, which this version of the application does not know: it was saved by another version of the application.",
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
        'The project file cannot be opened: the first filter of the variants has a field "minAllowedMaf", which the application does not write. The file was changed outside the application, or is damaged.',
      );
    });

    test("of the threshold of the second filter of the variants", () => {
      const text = projectErrorText({
        kind: "wrongValue",
        path: ["filters", 1, "maxAllowedMaf"],
        expected: "a number from 0 to 1",
      });
      expect(text).toBe(
        "The project file cannot be opened: the threshold of the second filter of the variants should be a number from 0 to 1. The file was changed outside the application, or is damaged.",
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
      `The project file cannot be opened: ${words}. The file was changed outside the application, or is damaged.`;

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
          "the distance of the first filter of the variants should be a whole number, 1 or more",
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
            found: { encoding: "auto", separator: ",", decimal: "." },
          }),
        ),
      ).toBe(
        opened(
          "the encoding found in the individuals file should be UTF-8 or Windows-1252",
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
        `This project file has the analysis ${"x".repeat(20)}\\n${"y".repeat(18)}…, which this version of the application does not know: it was saved by another version of the application.`,
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
