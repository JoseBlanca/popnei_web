import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import {
  INDIVIDUAL_FILTER_ORDER,
  analysisOptions,
  emptyProject,
  loadIndividuals,
  loadVariants,
  moveVariantFilter,
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
import type { Project } from "./project.ts";
import {
  SAMPLE_INDIVIDUALS_ID,
  SAMPLE_VARIANTS_ID,
  deepFreeze,
  drawnCommand,
  sampleProject,
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
      const q = setAnalysisOptions(p, "diversity", { minNumInds: 10 });
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
          name: "other.vcf",
          size: 1,
          format: "vcf",
          readOptions: { ploidy: 2, onlyPassed: false },
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
      (p) => setAnalysisOptions(p, "diversity", { minNumInds: 20 }),
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
      const q = setAnalysisOptions(p, "pca", { numPrinComps: 10 });
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
});
