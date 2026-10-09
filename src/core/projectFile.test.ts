import { readFileSync } from "node:fs";
import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import { popDists } from "./analyses/popDists.ts";
import {
  POPGEN2_ANALYSES,
  POPGEN_ANALYSES,
  countsOf,
  individualStatsOf,
} from "./apps.ts";
import { checkSettings, keyFromWire, settingsAsSaved } from "./keys.ts";
import {
  emptyProject,
  freezeProject,
  individualsNeeds,
  setVariantFilter,
  turnOffVariantFilter,
  variantFilterNeeds,
} from "./project.ts";
import type { Check, Project, Reference, VariantSource } from "./project.ts";
import {
  askedFileText,
  checkVerdictText,
  compareIdentity,
  identityWarning,
  PROJECT_FILE_EXTENSION,
  projectFileErrorText,
  projectFileName,
  readProjectFile,
  uncomparedText,
  writeProjectFile,
} from "./projectFile.ts";
import type { ProjectFileError } from "./projectFile.ts";
import { createStore } from "./store.ts";
import type { AnalysisStatus, AppState, CheckVerdict } from "./store.ts";
import {
  SAMPLE_INDIVIDUALS_ID,
  SAMPLE_VARIANTS_ID,
  TEST_DEFS,
  deepFreeze,
  noPopDiversity,
  sampleProject,
  wholeProject,
} from "./testSupport.ts";
import type { TestDefResult } from "./testSupport.ts";
import type {
  DiversityResult,
  Job,
  JobResult,
  Outcome,
  Run,
} from "../worker/protocol.ts";

// What the tests of the project file share: the definitions of the
// application of population genetics, a state of the store built from a
// project, and the fixtures of version 1.

/** The definitions of the analyses of population genetics, diversity and
    pca, in their order. */
const POPGEN_DEFS = TEST_DEFS.filter((def) => def.app.includes("popgen"));

/** The page that opens a file: `popgen.html`, with no box of the filter
    of the FILTER column, and `popgen2.html`, with one. */
const OLD_PAGE = { passedFilter: false } as const;
const NEW_PAGE = { passedFilter: true } as const;

/** The definition of the diversity among the test definitions. */
const DIVERSITY = defOf("diversity");

function defOf(id: string): (typeof TEST_DEFS)[number] {
  const def = TEST_DEFS.find((d) => d.id === id);
  if (def === undefined) {
    throw new Error(`no test definition ${id}`);
  }
  return def;
}

/** Any key; the writer does not read it. */
const A_KEY = keyFromWire("ab".repeat(32));

/** The state of the store with the project `project`, the version of
    popnei `popneiVersion`, and the analyses of population genetics in
    `statuses`, every other one ready. */
function stateOf(
  project: Project,
  statuses: Readonly<Record<string, AnalysisStatus<TestDefResult>>> = {},
  popneiVersion: string | null = "0.1.0",
): AppState<TestDefResult> {
  return deepFreeze<AppState<TestDefResult>>({
    project,
    undo: null,
    redo: null,
    historyMoves: 0,
    popneiVersion,
    analyses: POPGEN_DEFS.map((def) => ({
      id: def.id,
      status: statuses[def.id] ?? { kind: "ready", key: A_KEY, stopped: null },
    })),
    runs: [],
    notice: null,
    individualsKept: null,
    write: null,
  });
}

/** The diversity done, with the check numbers `numbers`. */
function diversityDone(
  numbers: readonly (number | null)[],
): AnalysisStatus<TestDefResult> {
  return {
    kind: "done",
    key: A_KEY,
    result: { analysis: "diversity", numbers },
    warnings: [],
    check: null,
  };
}

/** The file written of `state` by version 0.2.0 of the application. */
function written(state: AppState<TestDefResult>): string {
  return writeProjectFile(
    state,
    POPGEN_DEFS,
    "0.2.0",
    "2026-09-25T14:03:11.000Z",
  );
}

/** The JSON of the file written of `state`, as an object whose fields the
    tests read. */
function writtenJson(
  state: AppState<TestDefResult>,
): Readonly<Record<string, unknown>> {
  const parsed: unknown = JSON.parse(written(state));
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("the file is not an object");
  }
  return Object.fromEntries(Object.entries(parsed));
}

/** The text of a fixture of `src/core/fixtures/projectFile/`. */
function fixture(name: string): string {
  return readFileSync(
    new URL(`./fixtures/projectFile/${name}`, import.meta.url),
    "utf8",
  );
}

/** The JSON of a fixture of `src/core/fixtures/projectFile/`, as an object
    whose fields the tests replace. */
function fixtureJson(name: string): Readonly<Record<string, unknown>> {
  const parsed: unknown = JSON.parse(fixture(name));
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error(`the fixture ${name} is not an object`);
  }
  return Object.fromEntries(Object.entries(parsed));
}

/** The variants file of `sampleProject`, read. */
const PANEL: VariantSource = {
  fileId: SAMPLE_VARIANTS_ID,
  name: "panel.nei",
  size: 1024,
  format: "nei",
  readOptions: null,
  read: {
    kind: "read",
    individuals: ["i1", "i2", "i3", "i4"],
    ploidy: 2,
    numVars: 1200,
    keepsPassed: false,
  },
};

/** The same file, as a reference of an opened project keeps it, under the
    load id of another session. */
const PANEL_SAVED: VariantSource = {
  ...PANEL,
  fileId: "99999999999999999999999999999999",
};

/** `sampleProject` with the variants file `variants` and the reference
    `reference`. */
function withFiles(
  variants: VariantSource | null,
  reference: Reference | null,
): Project {
  return deepFreeze<Project>({ ...sampleProject(), variants, reference });
}

/** A reference of `PANEL_SAVED` whose check of the diversity was made
    with the settings of `settingsOf`, with the numbers [1, 2] of version
    0.1.0 of popnei and of the application. */
function referenceFor(settingsOf: Project): Reference {
  return {
    variants: PANEL_SAVED,
    checks: [
      {
        analysis: "diversity",
        numbers: [1, 2],
        keyVersion: 1,
        popneiVersion: "0.1.0",
        appVersion: "0.1.0",
        settings: checkSettings(DIVERSITY, settingsOf, PANEL_SAVED, null),
      },
    ],
  };
}

/** The check of the diversity of `referenceFor`, as the file holds it. */
const CARRIED_CHECK = {
  analysis: "diversity",
  numbers: [1, 2],
  keyVersion: 1,
  popneiVersion: "0.1.0",
  appVersion: "0.1.0",
};

describe("WS6 D1 what is written", () => {
  test("a variants file read is written as it is, its load id included", () => {
    const json = writtenJson(stateOf(withFiles(PANEL, null)));
    expect(json["variants"]).toEqual({
      fileId: "00112233445566778899aabbccddeeff",
      name: "panel.nei",
      size: 1024,
      format: "nei",
      readOptions: null,
      read: {
        kind: "read",
        individuals: ["i1", "i2", "i3", "i4"],
        ploidy: 2,
        numVars: 1200,
      },
    });
  });

  test("a variants file loaded and pending, of the reference's identity, is written as the reference's", () => {
    const loaded: VariantSource = { ...PANEL, read: { kind: "pending" } };
    const p = withFiles(loaded, null);
    const json = writtenJson(stateOf({ ...p, reference: referenceFor(p) }));
    expect(json["variants"]).toEqual({
      fileId: "99999999999999999999999999999999",
      name: "panel.nei",
      size: 1024,
      format: "nei",
      readOptions: null,
      read: {
        kind: "read",
        individuals: ["i1", "i2", "i3", "i4"],
        ploidy: 2,
        numVars: 1200,
      },
    });
  });

  test("a VCF of the reference's identity read again with ploidy 4, pending, is written with ploidy 4 and no check, and opens so", () => {
    const savedVcf: VariantSource = {
      fileId: "99999999999999999999999999999999",
      name: "panel.vcf.gz",
      size: 2048,
      format: "vcf",
      readOptions: { ploidy: 2, onlyPassed: true },
      read: {
        kind: "read",
        individuals: ["i1", "i2", "i3", "i4"],
        ploidy: 2,
        numVars: 7,
        keepsPassed: true,
      },
    };
    const loaded: VariantSource = {
      ...savedVcf,
      fileId: SAMPLE_VARIANTS_ID,
      readOptions: { ploidy: 4, onlyPassed: true },
      read: { kind: "pending" },
    };
    const p = withFiles(loaded, null);
    const reference: Reference = {
      variants: savedVcf,
      checks: [
        {
          ...CARRIED_CHECK,
          settings: checkSettings(DIVERSITY, p, savedVcf, null),
        },
      ],
    };
    const state = stateOf({ ...p, reference });
    const json = writtenJson(state);
    expect(json["variants"]).toEqual({
      fileId: SAMPLE_VARIANTS_ID,
      name: "panel.vcf.gz",
      size: 2048,
      format: "vcf",
      readOptions: { ploidy: 4, onlyPassed: true },
      read: { kind: "pending" },
    });
    expect(json["checks"]).toEqual([]);

    const opened = readProjectFile(
      written(state),
      "popgen",
      POPGEN_DEFS,
      OLD_PAGE,
    );
    if (!opened.ok) {
      throw new Error(`the file did not open: ${opened.error.kind}`);
    }
    expect(opened.value.reference).toEqual({
      variants: {
        fileId: SAMPLE_VARIANTS_ID,
        name: "panel.vcf.gz",
        size: 2048,
        format: "vcf",
        readOptions: { ploidy: 4, onlyPassed: true },
        read: { kind: "pending" },
      },
      checks: [],
    });
  });

  test("no variants file loaded and a reference: the reference's is written", () => {
    const p = withFiles(null, null);
    const json = writtenJson(stateOf({ ...p, reference: referenceFor(p) }));
    expect(json["variants"]).toEqual({
      fileId: "99999999999999999999999999999999",
      name: "panel.nei",
      size: 1024,
      format: "nei",
      readOptions: null,
      read: {
        kind: "read",
        individuals: ["i1", "i2", "i3", "i4"],
        ploidy: 2,
        numVars: 1200,
      },
    });
  });

  test("no variants file and no reference: null", () => {
    const json = writtenJson(stateOf(withFiles(null, null)));
    expect(json["variants"]).toBeNull();
  });

  test("a variants file whose read failed is written with its read pending", () => {
    const failed: VariantSource = {
      fileId: SAMPLE_VARIANTS_ID,
      name: "bad.vcf",
      size: 300,
      format: "vcf",
      readOptions: { ploidy: 2, onlyPassed: false },
      read: {
        kind: "failed",
        error: { kind: "popnei", message: "line 3 has 9 fields" },
      },
    };
    const json = writtenJson(stateOf(withFiles(failed, null)));
    expect(json["variants"]).toEqual({
      fileId: "00112233445566778899aabbccddeeff",
      name: "bad.vcf",
      size: 300,
      format: "vcf",
      readOptions: { ploidy: 2, onlyPassed: false },
      read: { kind: "pending" },
    });
  });

  test("an individuals file read is written as it is, its load id and its table included", () => {
    const json = writtenJson(stateOf(sampleProject()));
    expect(json["individuals"]).toEqual({
      fileId: SAMPLE_INDIVIDUALS_ID,
      name: "pops.csv",
      csv: { encoding: "auto", separator: "auto", decimal: "auto" },
      typesSet: [],
      read: {
        kind: "read",
        table: {
          columns: ["id", "pop", "sex", "height"],
          rows: [
            ["i1", "P1", "1", "1.52"],
            ["i2", "P1", "2", null],
            ["i3", "P2", "1", "1.61"],
            ["i4", "P2", "2", "1.70"],
          ],
        },
        columns: [
          { kind: "identifier" },
          { kind: "categorical" },
          { kind: "binary", one: "2", zero: "1" },
          { kind: "continuous" },
        ],
        found: {
          encoding: "utf-8",
          separator: ",",
          decimal: ".",
          undecodedLine: null,
        },
      },
    });
  });

  test("an individuals file pending, failed or notGiven is written as notGiven, with its name, its options and its types set, and the grouping by its column", () => {
    const sample = sampleProject();
    const base = sample.individuals;
    if (base === null) {
      throw new Error("the sample has an individuals file");
    }
    for (const read of [
      { kind: "pending" },
      { kind: "failed", error: { kind: "empty" }, format: "text" },
      { kind: "failed", error: { kind: "encrypted" }, format: "xlsx" },
      { kind: "notGiven" },
    ] as const) {
      const p = deepFreeze<Project>({
        ...sample,
        individuals: {
          ...base,
          csv: { encoding: "windows-1252", separator: ";", decimal: "," },
          typesSet: [
            ["pop", { kind: "categorical" }],
            ["status", { kind: "binary", one: "no", zero: "yes" }],
          ],
          read,
        },
      });
      const json = writtenJson(stateOf(p));
      expect(json["individuals"]).toEqual({
        fileId: SAMPLE_INDIVIDUALS_ID,
        name: "pops.csv",
        csv: { encoding: "windows-1252", separator: ";", decimal: "," },
        typesSet: [
          ["pop", { kind: "categorical" }],
          ["status", { kind: "binary", one: "no", zero: "yes" }],
        ],
        read: { kind: "notGiven" },
      });
      expect(json["grouping"]).toEqual({ kind: "populations", column: "pop" });
    }
  });

  test("the reference is not written as such: no field reference, and no fingerprint", () => {
    const p = withFiles(null, null);
    const state = stateOf({ ...p, reference: referenceFor(p) });
    const text = written(state);
    expect(Object.keys(writtenJson(state))).toEqual([
      "format",
      "formatVersion",
      "app",
      "appVersion",
      "popneiVersion",
      "saved",
      "variants",
      "filters",
      "filtersOff",
      "individualFilters",
      "individualFiltersOff",
      "individuals",
      "grouping",
      "analyses",
      "checks",
    ]);
    expect(text).not.toContain("reference");
    expect(text).not.toContain("settings");
  });

  test("a result done gives its numbers, with the key version and the versions now", () => {
    const json = writtenJson(
      stateOf(
        withFiles(PANEL, null),
        { diversity: diversityDone([1200, 0.3527, null]) },
        "0.3.0",
      ),
    );
    expect(json["checks"]).toEqual([
      {
        analysis: "diversity",
        numbers: [1200, 0.3527, null],
        keyVersion: 1,
        popneiVersion: "0.3.0",
        appVersion: "0.2.0",
      },
    ]);
  });

  test("an analysis removed, with a reference whose fingerprint matches, carries the reference's check with its versions", () => {
    const p = withFiles(PANEL, null);
    const json = writtenJson(
      stateOf(
        { ...p, reference: referenceFor(p) },
        { diversity: { kind: "removed", key: A_KEY } },
        "0.3.0",
      ),
    );
    expect(json["checks"]).toEqual([CARRIED_CHECK]);
  });

  test("an analysis whose settings changed carries no check", () => {
    const p = withFiles(PANEL, null);
    const before = deepFreeze<Project>({ ...p, analyses: [] });
    const json = writtenJson(
      stateOf({ ...p, reference: referenceFor(before) }),
    );
    expect(json["checks"]).toEqual([]);
  });

  test("a variants file of another size carries no check", () => {
    const p = withFiles({ ...PANEL, size: 1025 }, null);
    const json = writtenJson(stateOf({ ...p, reference: referenceFor(p) }));
    expect(json["checks"]).toEqual([]);
  });

  test("a VCF loaded again, pending, with the reference's name and size and other read options carries no check", () => {
    const savedVcf: VariantSource = {
      fileId: "99999999999999999999999999999999",
      name: "panel.vcf",
      size: 2048,
      format: "vcf",
      readOptions: { ploidy: 2, onlyPassed: true },
      read: {
        kind: "read",
        individuals: ["i1", "i2"],
        ploidy: 2,
        numVars: 7,
        keepsPassed: true,
      },
    };
    const loaded: VariantSource = {
      ...savedVcf,
      fileId: SAMPLE_VARIANTS_ID,
      readOptions: { ploidy: 2, onlyPassed: false },
      read: { kind: "pending" },
    };
    const p = withFiles(loaded, null);
    const reference: Reference = {
      variants: savedVcf,
      checks: [
        {
          analysis: "diversity",
          numbers: [1, 2],
          keyVersion: 1,
          popneiVersion: "0.1.0",
          appVersion: "0.1.0",
          settings: checkSettings(DIVERSITY, p, savedVcf, null),
        },
      ],
    };
    const json = writtenJson(stateOf({ ...p, reference }));
    expect(json["checks"]).toEqual([]);
  });

  test("a variants file of the reference's name and size with other individuals carries no check", () => {
    const p = withFiles(
      {
        ...PANEL,
        read: {
          kind: "read",
          individuals: ["i1", "i2", "i3", "i5"],
          ploidy: 2,
          numVars: 1200,
          keepsPassed: false,
        },
      },
      null,
    );
    const json = writtenJson(stateOf({ ...p, reference: referenceFor(p) }));
    expect(json["checks"]).toEqual([]);
  });

  test("a result done wins over a matching check of the reference", () => {
    const p = withFiles(PANEL, null);
    const json = writtenJson(
      stateOf(
        { ...p, reference: referenceFor(p) },
        { diversity: diversityDone([9, 9]) },
        "0.3.0",
      ),
    );
    expect(json["checks"]).toEqual([
      {
        analysis: "diversity",
        numbers: [9, 9],
        keyVersion: 1,
        popneiVersion: "0.3.0",
        appVersion: "0.2.0",
      },
    ]);
  });

  test("a result done on a file of another identity, or under other settings, is saved", () => {
    const done = {
      analysis: "diversity",
      numbers: [9, 9],
      keyVersion: 1,
      popneiVersion: "0.3.0",
      appVersion: "0.2.0",
    };
    const otherFile = withFiles({ ...PANEL, size: 1025 }, null);
    expect(
      writtenJson(
        stateOf(
          { ...otherFile, reference: referenceFor(otherFile) },
          { diversity: diversityDone([9, 9]) },
          "0.3.0",
        ),
      )["checks"],
    ).toEqual([done]);
    const p = withFiles(PANEL, null);
    const before = deepFreeze<Project>({ ...p, analyses: [] });
    expect(
      writtenJson(
        stateOf(
          { ...p, reference: referenceFor(before) },
          { diversity: diversityDone([9, 9]) },
          "0.3.0",
        ),
      )["checks"],
    ).toEqual([done]);
  });

  test("a check of the reference is carried with its own key version", () => {
    const p = withFiles(PANEL, null);
    const reference = referenceFor(p);
    const json = writtenJson(
      stateOf({
        ...p,
        reference: {
          ...reference,
          checks: reference.checks.map((check) => ({
            ...check,
            keyVersion: 0,
          })),
        },
      }),
    );
    expect(json["checks"]).toEqual([{ ...CARRIED_CHECK, keyVersion: 0 }]);
  });

  test("a file loaded, pending, of another identity than the reference's is written, not the reference's", () => {
    const loaded: VariantSource = {
      ...PANEL,
      name: "panel_2027.nei",
      read: { kind: "pending" },
    };
    const p = withFiles(loaded, null);
    const json = writtenJson(stateOf({ ...p, reference: referenceFor(p) }));
    expect(json["variants"]).toEqual({
      fileId: "00112233445566778899aabbccddeeff",
      name: "panel_2027.nei",
      size: 1024,
      format: "nei",
      readOptions: null,
      read: { kind: "pending" },
    });
  });

  test("an analysis done with no version of popnei throws a defect", () => {
    const state = stateOf(
      withFiles(PANEL, null),
      { diversity: diversityDone([1]) },
      null,
    );
    expect(() => written(state)).toThrow(/^popnei_web defect: /);
  });

  test("a number of the project that is not finite throws a defect", () => {
    const p = deepFreeze<Project>({
      ...sampleProject(),
      filters: [{ kind: "maf", maxAllowedMaf: Infinity }],
    });
    expect(() => written(stateOf(p))).toThrow(/^popnei_web defect: /);
  });

  test("a check number of Infinity throws a defect", () => {
    const state = stateOf(withFiles(PANEL, null), {
      diversity: diversityDone([1, Infinity]),
    });
    expect(() => written(state)).toThrow(/^popnei_web defect: /);
  });

  test("the same project with the fields of every object in the reverse order gives the same text", () => {
    const text = written(
      stateOf(forwardProject(), { diversity: diversityDone([1, null]) }),
    );
    expect(
      writtenJson(
        stateOf(forwardProject(), { diversity: diversityDone([1, null]) }),
      )["checks"],
    ).toMatchObject([{ analysis: "diversity" }, { analysis: "pca" }]);
    expect(
      written(
        stateOf(reversedProject(), { diversity: diversityDone([1, null]) }),
      ),
    ).toBe(text);
  });

  test("the options of an analysis are written with their fields sorted", () => {
    const p = deepFreeze<Project>({
      ...emptyProject("popgen"),
      analyses: [{ analysis: "diversity", options: { b: 1, a: 2 } }],
    });
    expect(written(stateOf(p))).toContain(
      [
        '  "analyses": [',
        "    {",
        '      "analysis": "diversity",',
        '      "options": {',
        '        "a": 2,',
        '        "b": 1',
        "      }",
        "    }",
        "  ],",
      ].join("\n"),
    );
  });

  test("a row of the table of the individuals is one line", () => {
    expect(written(stateOf(sampleProject()))).toContain(
      '\n          ["i2", "P1", "2", null],\n',
    );
  });

  test("the name proposed is the variants file's without its extension", () => {
    const name = (fileName: string): string =>
      projectFileName(withFiles({ ...PANEL, name: fileName }, null));
    expect(name("panel_2026.nei")).toBe("panel_2026.popnei.json");
    expect(name("panel.vcf")).toBe("panel.popnei.json");
    expect(name("panel.vcf.gz")).toBe("panel.popnei.json");
  });

  test("the name proposed: an extension in capitals removed, one alone the default, another kept", () => {
    const name = (fileName: string): string =>
      projectFileName(withFiles({ ...PANEL, name: fileName }, null));
    expect(name("PANEL.NEI")).toBe("PANEL.popnei.json");
    expect(name("a.vcf.GZ")).toBe("a.popnei.json");
    expect(name(".nei")).toBe("project.popnei.json");
    expect(name("data.bcf")).toBe("data.bcf.popnei.json");
    expect(PROJECT_FILE_EXTENSION).toBe(".popnei.json");
  });

  test("the name proposed is the reference's variants file's when none is loaded, and project.popnei.json with neither", () => {
    const p = withFiles(null, null);
    expect(projectFileName({ ...p, reference: referenceFor(p) })).toBe(
      "panel.popnei.json",
    );
    expect(projectFileName(p)).toBe("project.popnei.json");
  });
});

/** A VCF read, of two individuals. */
const PANEL_VCF: VariantSource = {
  fileId: SAMPLE_VARIANTS_ID,
  name: "panel.vcf",
  size: 2048,
  format: "vcf",
  readOptions: { ploidy: 2, onlyPassed: true },
  read: {
    kind: "read",
    individuals: ["i1", "i2"],
    ploidy: 2,
    numVars: 7,
    keepsPassed: true,
  },
};

/** A project with a part of every kind, its fields in the order of their
    types, and a reference whose check of the pca is carried. */
function forwardProject(): Project {
  const p: Project = {
    app: "popgen",
    variants: PANEL_VCF,
    filters: [
      { kind: "maf", maxAllowedMaf: 0.95 },
      { kind: "ld", maxAllowedR2: 0.5, maxDist: 1000 },
    ],
    filtersOff: [],
    individualFilters: [
      { kind: "keep", individuals: ["i1", "i2"] },
      { kind: "obs_het", maxAllowedObsHet: 0.6 },
    ],
    individualFiltersOff: [],
    individuals: {
      fileId: SAMPLE_INDIVIDUALS_ID,
      name: "pops.csv",
      csv: { encoding: "utf-8", separator: ";", decimal: "," },
      typesSet: [],
      read: {
        kind: "read",
        table: {
          columns: ["id", "sex"],
          rows: [
            ["i1", "m"],
            ["i2", "f"],
          ],
        },
        columns: [
          { kind: "identifier" },
          { kind: "binary", one: "m", zero: "f" },
        ],
        found: {
          encoding: "utf-8",
          separator: ";",
          decimal: ",",
          undecodedLine: null,
        },
      },
    },
    grouping: { kind: "populations", column: "sex" },
    analyses: [{ analysis: "pca", options: { numPcs: 3, center: true } }],
    reference: null,
  };
  return deepFreeze<Project>({
    ...p,
    reference: {
      variants: { ...PANEL_VCF, fileId: "99999999999999999999999999999999" },
      checks: [
        {
          analysis: "pca",
          numbers: [0.5],
          keyVersion: 1,
          popneiVersion: "0.1.0",
          appVersion: "0.1.0",
          settings: checkSettings(defOf("pca"), p, PANEL_VCF, null),
        },
      ],
    },
  });
}

/** `forwardProject` with the fields of every object in the reverse
    order. */
function reversedProject(): Project {
  const p: Project = {
    reference: null,
    analyses: [{ options: { center: true, numPcs: 3 }, analysis: "pca" }],
    grouping: { column: "sex", kind: "populations" },
    individuals: {
      read: {
        found: {
          decimal: ",",
          separator: ";",
          encoding: "utf-8",
          undecodedLine: null,
        },
        columns: [
          { kind: "identifier" },
          { zero: "f", one: "m", kind: "binary" },
        ],
        table: {
          rows: [
            ["i1", "m"],
            ["i2", "f"],
          ],
          columns: ["id", "sex"],
        },
        kind: "read",
      },
      typesSet: [],
      csv: { decimal: ",", separator: ";", encoding: "utf-8" },
      name: "pops.csv",
      fileId: SAMPLE_INDIVIDUALS_ID,
    },
    individualFiltersOff: [],
    individualFilters: [
      { individuals: ["i1", "i2"], kind: "keep" },
      { maxAllowedObsHet: 0.6, kind: "obs_het" },
    ],
    filtersOff: [],
    filters: [
      { maxAllowedMaf: 0.95, kind: "maf" },
      { maxDist: 1000, maxAllowedR2: 0.5, kind: "ld" },
    ],
    variants: {
      read: {
        keepsPassed: true,
        numVars: 7,
        ploidy: 2,
        individuals: ["i1", "i2"],
        kind: "read",
      },
      readOptions: { onlyPassed: true, ploidy: 2 },
      format: "vcf",
      size: 2048,
      name: "panel.vcf",
      fileId: SAMPLE_VARIANTS_ID,
    },
    app: "popgen",
  };
  return deepFreeze<Project>({
    reference: {
      checks: [
        {
          settings: checkSettings(defOf("pca"), p, PANEL_VCF, null),
          appVersion: "0.1.0",
          popneiVersion: "0.1.0",
          keyVersion: 1,
          numbers: [0.5],
          analysis: "pca",
        },
      ],
      variants: {
        read: {
          keepsPassed: true,
          numVars: 7,
          ploidy: 2,
          individuals: ["i1", "i2"],
          kind: "read",
        },
        readOptions: { onlyPassed: true, ploidy: 2 },
        format: "vcf",
        size: 2048,
        name: "panel.vcf",
        fileId: "99999999999999999999999999999999",
      },
    },
    analyses: p.analyses,
    grouping: p.grouping,
    individuals: p.individuals,
    individualFiltersOff: p.individualFiltersOff,
    individualFilters: p.individualFilters,
    filtersOff: p.filtersOff,
    filters: p.filters,
    variants: p.variants,
    app: p.app,
  });
}

/** The project of `v1-nei-diversity.popnei.json` once opened, without the
    fingerprint of its check, which `opened` adds. */
function neiDiversityProject(): Project {
  return {
    app: "popgen",
    variants: null,
    filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.1 }],
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
        table: {
          columns: ["id", "pop"],
          rows: [
            ["ind_001", "north"],
            ["ind_002", "south"],
            ["ind_003", "north"],
            ["ind_004", "south"],
            ["ind_005", "north"],
            ["ind_006", "south"],
          ],
        },
        columns: [{ kind: "identifier" }, { kind: "categorical" }],
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
    reference: {
      variants: {
        fileId: "00112233445566778899aabbccddeeff",
        name: "panel.nei",
        size: 52428800,
        format: "nei",
        readOptions: null,
        read: {
          kind: "read",
          individuals: [
            "ind_001",
            "ind_002",
            "ind_003",
            "ind_004",
            "ind_005",
            "ind_006",
          ],
          ploidy: 2,
          numVars: 1203554,
          keepsPassed: false,
        },
      },
      checks: [
        {
          analysis: "diversity",
          numbers: [
            1150112, 0.3120051, 0.3089214, 0.9124, 0.2987112, 0.2954871, 0.8977,
          ],
          keyVersion: 1,
          popneiVersion: "0.1.0",
          appVersion: "0.1.0",
          settings: { passedKept: "", passedNotKept: "" },
        },
      ],
    },
  };
}

/** The project of `v1-vcf-pending.popnei.json` once opened, without the
    fingerprint of its check. */
function vcfPendingProject(): Project {
  return {
    app: "popgen",
    variants: null,
    filters: [
      { kind: "missing_data", maxAllowedMissingRate: 0.2 },
      { kind: "maf", maxAllowedMaf: 0.95 },
    ],
    filtersOff: [],
    individualFilters: [],
    individualFiltersOff: [],
    individuals: null,
    grouping: { kind: "populations", column: "pop" },
    analyses: [],
    reference: {
      variants: {
        fileId: "0123456789abcdef0123456789abcdef",
        name: "tetraploid.vcf.gz",
        size: 734003,
        format: "vcf",
        readOptions: { ploidy: 4, onlyPassed: true },
        read: { kind: "pending" },
      },
      checks: [
        {
          analysis: "diversity",
          numbers: [8012, 0.2811, null, 0.75],
          keyVersion: 1,
          popneiVersion: "0.1.0",
          appVersion: "0.1.0",
          settings: { passedKept: "", passedNotKept: "" },
        },
      ],
    },
  };
}

/** A project as an opening gives it: the fingerprint of each check of its
    reference made from the project and the read options of the
    reference's variants file. */
function opened(p: Project): Project {
  const reference = p.reference;
  if (reference === null) {
    return deepFreeze(p);
  }
  return deepFreeze<Project>({
    ...p,
    reference: {
      ...reference,
      checks: reference.checks.map((check) => ({
        ...check,
        settings: checkSettings(
          defOf(check.analysis),
          p,
          reference.variants,
          null,
        ),
      })),
    },
  });
}

/** The three fixtures of version 1: the file, the project it opens into,
    and the header's versions and date. */
const FIXTURES: readonly {
  readonly file: string;
  readonly project: () => Project;
  readonly appVersion: string;
  readonly popneiVersion: string | null;
  readonly saved: string;
}[] = [
  {
    file: "v1-empty.popnei.json",
    project: () => emptyProject("popgen"),
    appVersion: "0.1.0",
    popneiVersion: "0.1.0",
    saved: "2026-09-25T09:30:00.000Z",
  },
  {
    file: "v1-nei-diversity.popnei.json",
    project: neiDiversityProject,
    appVersion: "0.1.0",
    popneiVersion: "0.1.0",
    saved: "2026-09-25T14:03:11.000Z",
  },
  {
    file: "v1-vcf-pending.popnei.json",
    project: vcfPendingProject,
    appVersion: "0.1.0",
    popneiVersion: null,
    saved: "2026-09-25T16:45:02.500Z",
  },
];

describe("WS6 D2 the opening", () => {
  // Each is written back with the lists of the filters turned off added,
  // in "IP3 D2 the project file of the switches".
  for (const f of FIXTURES) {
    test(`${f.file} opens into its project`, () => {
      expect(
        readProjectFile(fixture(f.file), "popgen", POPGEN_DEFS, OLD_PAGE),
      ).toEqual({
        ok: true,
        value: opened(f.project()),
      });
    });
  }

  /** The error of opening in population genetics the file whose JSON is
      that of v1-nei-diversity.popnei.json changed by `change`. */
  function refusalOf(
    change: (file: Record<string, unknown>) => Record<string, unknown>,
  ): ProjectFileError | null {
    const file: unknown = JSON.parse(fixture("v1-nei-diversity.popnei.json"));
    if (typeof file !== "object" || file === null) {
      throw new Error("the fixture is not an object");
    }
    return refusalOfText(
      JSON.stringify(change(Object.fromEntries(Object.entries(file)))),
    );
  }

  /** The error of opening the text `text` in population genetics. */
  function refusalOfText(text: string): ProjectFileError | null {
    const opening = readProjectFile(text, "popgen", POPGEN_DEFS, OLD_PAGE);
    return opening.ok ? null : opening.error;
  }

  /** A check of the diversity, with `fields` added or replaced. */
  function checkWith(fields: Record<string, unknown>): Record<string, unknown> {
    return {
      analysis: "diversity",
      numbers: [1],
      keyVersion: 1,
      popneiVersion: "0.1.0",
      appVersion: "0.1.0",
      ...fields,
    };
  }

  test("a text that is not JSON is refused as notJson", () => {
    expect(refusalOfText("{")).toEqual({ kind: "notJson" });
  });

  test("JSON that is not an object with the format of a project file is refused as notProjectFile", () => {
    expect(refusalOfText("[]")).toEqual({ kind: "notProjectFile" });
  });

  test("a version of the format above this one is refused as newerFormat before the rest is read", () => {
    expect(
      refusalOfText('{"format": "popnei_web project", "formatVersion": 2}'),
    ).toEqual({ kind: "newerFormat", formatVersion: 2, appVersion: null });
  });

  for (const version of [0, 1.5, "1"]) {
    test(`a version of the format ${JSON.stringify(version)} is refused as header`, () => {
      expect(
        refusalOf((file) => ({ ...file, formatVersion: version })),
      ).toEqual({
        kind: "header",
        field: "formatVersion",
        expected: "a whole number, 1 or more",
      });
    });
  }

  test("a file of association opened in population genetics is refused as otherApp", () => {
    expect(
      refusalOf((file) => ({
        ...file,
        app: "gwas",
        grouping: { kind: "roles", roles: [] },
        checks: [],
      })),
    ).toEqual({ kind: "project", error: { kind: "otherApp", found: "gwas" } });
  });

  test("a file of association with a field this version does not write is refused as otherApp, before the rest", () => {
    expect(
      refusalOf((file) => ({ ...file, app: "gwas", notes: "mine" })),
    ).toEqual({ kind: "project", error: { kind: "otherApp", found: "gwas" } });
  });

  for (const [field, value] of [
    ["appVersion", 3],
    ["popneiVersion", 5],
    ["saved", 7],
  ] as const) {
    test(`the field ${field} of the wrong value is refused as header`, () => {
      expect(refusalOf((file) => ({ ...file, [field]: value }))).toMatchObject({
        kind: "header",
        field,
      });
    });
  }

  test("checks that are not objects are refused as header", () => {
    expect(refusalOf((file) => ({ ...file, checks: [1] }))).toMatchObject({
      kind: "header",
      field: "checks",
    });
  });

  test("a field at the top that this version does not write is refused as unknownField", () => {
    expect(refusalOf((file) => ({ ...file, notes: "mine" }))).toEqual({
      kind: "unknownField",
      name: "notes",
    });
  });

  test("a field missing at the top is refused as missingField", () => {
    expect(
      refusalOf((file) =>
        Object.fromEntries(
          Object.entries(file).filter(([name]) => name !== "appVersion"),
        ),
      ),
    ).toEqual({ kind: "missingField", name: "appVersion" });
  });

  test("checks that are not a list are refused as header", () => {
    expect(refusalOf((file) => ({ ...file, checks: {} }))).toMatchObject({
      kind: "header",
      field: "checks",
    });
  });

  test("a check with a field settings is refused as header", () => {
    expect(
      refusalOf((file) => ({
        ...file,
        checks: [
          checkWith({
            settings: {
              passedKept: "0".repeat(64),
              passedNotKept: "0".repeat(64),
            },
          }),
        ],
      })),
    ).toMatchObject({ kind: "header", field: "checks" });
  });

  test("a check of an analysis this version does not know is refused as unknownAnalysis", () => {
    expect(
      refusalOf((file) => ({
        ...file,
        checks: [checkWith({ analysis: "fst" })],
      })),
    ).toEqual({
      kind: "project",
      error: { kind: "unknownAnalysis", id: "fst" },
    });
  });

  test("checks with no variants file are refused as header", () => {
    expect(
      refusalOf((file) => ({
        ...file,
        variants: null,
        checks: [checkWith({})],
      })),
    ).toMatchObject({ kind: "header", field: "checks" });
  });

  test("a check of the diversity with 6 numbers where its count is 7 is refused as header, with its text", () => {
    const counted = POPGEN_DEFS.map((def) =>
      def.id === "diversity" ? { ...def, numCheckNumbers: () => 7 } : def,
    );
    const file = (numbers: readonly number[]): string =>
      JSON.stringify({
        ...fixtureJson("v1-nei-diversity.popnei.json"),
        checks: [checkWith({ numbers })],
      });
    const opening = readProjectFile(
      file([1, 2, 3, 4, 5, 6]),
      "popgen",
      counted,
      OLD_PAGE,
    );
    const expected: ProjectFileError = {
      kind: "header",
      field: "checks",
      expected:
        "7 numbers for the analysis diversity, as many as the rest of the file gives it, and not 6",
    };
    expect(opening).toEqual({ ok: false, error: expected });
    expect(projectFileErrorText(expected, "run1.popnei.json")).toBe(
      "The project file cannot be opened: the check numbers should be 7 numbers for the analysis diversity, as many as the rest of the file gives it, and not 6. The file was changed outside the application, or is damaged. Open a copy saved before the change, or make the project again.",
    );
    expect(
      readProjectFile(file([1, 2, 3, 4, 5, 6, 7]), "popgen", counted, OLD_PAGE)
        .ok,
    ).toBe(true);
  });

  test("a check whose count its analysis does not fix opens with any count", () => {
    expect(
      refusalOf((file) => ({
        ...file,
        checks: [checkWith({ numbers: [1, 2, 3, 4, 5, 6] })],
      })),
    ).toBeNull();
  });

  test("the count with the diversity's own definition: v1-nei-diversity.popnei.json opens, and is refused with one of its 7 numbers removed", () => {
    const text = fixture("v1-nei-diversity.popnei.json");
    expect(readProjectFile(text, "popgen", POPGEN_ANALYSES, OLD_PAGE).ok).toBe(
      true,
    );
    const shortened = JSON.stringify({
      ...fixtureJson("v1-nei-diversity.popnei.json"),
      checks: [
        checkWith({
          numbers: [
            1150112, 0.3120051, 0.3089214, 0.9124, 0.2987112, 0.2954871,
          ],
        }),
      ],
    });
    expect(
      readProjectFile(shortened, "popgen", POPGEN_ANALYSES, OLD_PAGE),
    ).toEqual({
      ok: false,
      error: {
        kind: "header",
        field: "checks",
        expected:
          "7 numbers for the analysis diversity, as many as the rest of the file gives it, and not 6",
      },
    });
  });

  test("with the diversity's own definition, a Save writes as many check numbers as its opening asks for, from a result and from a check kept of the reference", () => {
    const opening = readProjectFile(
      fixture("v1-nei-diversity.popnei.json"),
      "popgen",
      POPGEN_ANALYSES,
      OLD_PAGE,
    );
    if (!opening.ok || opening.value.reference === null) {
      throw new Error("the fixture opens, with its reference");
    }
    const opened = opening.value;
    const reference = opening.value.reference;
    // The file the project was made with, given again.
    const p = deepFreeze<Project>({ ...opened, variants: reference.variants });
    const result: DiversityResult = {
      analysis: "diversity",
      pops: ["north", "south"],
      numIndividuals: Uint32Array.from([3, 3]),
      unbiasedExpHet: Float64Array.from([0.31, 0.29]),
      obsHet: Float64Array.from([0.3, NaN]),
      polyRatio: Float64Array.from([0.91, 0.89]),
      numVarsWithValue: Uint32Array.from([1150112, 0]),
      ...noPopDiversity(2),
      passStats: {
        numVars: 1150112,
        filtering: {
          missing_data: { varsProcessed: 1203554, varsKept: 1150112 },
        },
      },
    };
    const stateWith = (
      status: AnalysisStatus<JobResult>,
    ): AppState<JobResult> => ({
      project: p,
      undo: null,
      redo: null,
      historyMoves: 0,
      popneiVersion: "0.1.0",
      analyses: POPGEN_ANALYSES.map((def) => ({
        id: def.id,
        status:
          def.id === "diversity"
            ? status
            : { kind: "ready", key: A_KEY, stopped: null },
      })),
      runs: [],
      notice: null,
      individualsKept: null,
      write: null,
    });
    const done = stateWith({
      kind: "done",
      key: A_KEY,
      result,
      warnings: [],
      check: null,
    });
    const kept = stateWith({ kind: "ready", key: A_KEY, stopped: null });
    for (const state of [done, kept]) {
      const text = writeProjectFile(
        state,
        POPGEN_ANALYSES,
        "0.2.0",
        "2026-09-25T14:03:11.000Z",
      );
      const again = readProjectFile(text, "popgen", POPGEN_ANALYSES, OLD_PAGE);
      if (!again.ok) {
        throw new Error(JSON.stringify(again.error));
      }
      expect(
        again.value.reference?.checks.map((c) => c.numbers.length),
      ).toEqual([7]);
    }
  });

  test("an individuals file whose read is pending is refused as header", () => {
    expect(
      refusalOf((file) => ({
        ...file,
        individuals: {
          fileId: "ffeeddccbbaa99887766554433221100",
          name: "pops.csv",
          csv: { encoding: "auto", separator: "auto", decimal: "auto" },
          typesSet: [],
          read: { kind: "pending" },
        },
      })),
    ).toMatchObject({ kind: "header", field: "individuals" });
  });

  test("a variants file whose read failed is refused as header", () => {
    expect(
      refusalOf((file) => ({
        ...file,
        variants: {
          fileId: "00112233445566778899aabbccddeeff",
          name: "panel.nei",
          size: 52428800,
          format: "nei",
          readOptions: null,
          read: { kind: "failed", error: { kind: "popnei", message: "bad" } },
        },
      })),
    ).toMatchObject({ kind: "header", field: "variants" });
  });

  test("the text of notJson", () => {
    expect(projectFileErrorText({ kind: "notJson" }, "notes.txt")).toBe(
      "notes.txt cannot be opened as a project: it is not a project file, or it was cut short or changed outside the application. Open the .popnei.json file the application saved, or a copy of it.",
    );
  });

  test("the text of newerFormat, with and without the version of the application", () => {
    expect(
      projectFileErrorText(
        { kind: "newerFormat", formatVersion: 2, appVersion: "0.4.0" },
        "p.popnei.json",
      ),
    ).toBe(
      "This project file was saved by a newer version of the application, 0.4.0, in a format this version cannot read. Reload the page to get the newest version, and open the file again.",
    );
    expect(
      projectFileErrorText(
        { kind: "newerFormat", formatVersion: 2, appVersion: null },
        "p.popnei.json",
      ),
    ).toBe(
      "This project file was saved by a newer version of the application in a format this version cannot read. Reload the page to get the newest version, and open the file again.",
    );
  });

  test("the text of a header error", () => {
    expect(
      projectFileErrorText(
        {
          kind: "header",
          field: "formatVersion",
          expected: "a whole number, 1 or more",
        },
        "p.popnei.json",
      ),
    ).toBe(
      "The project file cannot be opened: the version of its format should be a whole number, 1 or more. The file was changed outside the application, or is damaged. Open a copy saved before the change, or make the project again.",
    );
  });

  test("the texts of tooLarge, notProjectFile, unknownField, missingField and project", () => {
    expect(
      projectFileErrorText({ kind: "tooLarge", size: 70_000_000 }, "notes.vcf"),
    ).toBe(
      "notes.vcf cannot be opened as a project: it is larger than 64 MB, and a project file, which holds settings and no genotypes, is much smaller. Open the .popnei.json file the application saved.",
    );
    expect(projectFileErrorText({ kind: "notProjectFile" }, "data.json")).toBe(
      "data.json cannot be opened as a project: it is not a project file of the application. Open the .popnei.json file the application saved.",
    );
    expect(
      projectFileErrorText({ kind: "unknownField", name: "notes" }, "p.json"),
    ).toBe(
      'The project file cannot be opened: it has a field "notes", which the application does not write. The file was changed outside the application, or is damaged. Open a copy saved before the change, or make the project again.',
    );
    expect(
      projectFileErrorText({ kind: "missingField", name: "checks" }, "p.json"),
    ).toBe(
      'The project file cannot be opened: its field "checks" is missing. The file was changed outside the application, or is damaged. Open a copy saved before the change, or make the project again.',
    );
    expect(
      projectFileErrorText(
        { kind: "project", error: { kind: "otherApp", found: "gwas" } },
        "p.json",
      ),
    ).toBe(
      "This project file is of the association application. Open it there.",
    );
  });

  test("a byte order mark before the text of v1-empty.popnei.json: it opens", () => {
    expect(
      readProjectFile(
        `\uFEFF${fixture("v1-empty.popnei.json")}`,
        "popgen",
        POPGEN_DEFS,
        OLD_PAGE,
      ),
    ).toEqual({ ok: true, value: emptyProject("popgen") });
  });

  test("each check of an opened file holds the fingerprint of its settings", () => {
    const opening = readProjectFile(
      fixture("v1-vcf-pending.popnei.json"),
      "popgen",
      POPGEN_DEFS,
      OLD_PAGE,
    );
    if (!opening.ok) {
      throw new Error("the fixture opens");
    }
    const p = opening.value;
    if (p.reference === null) {
      throw new Error("the fixture has a reference");
    }
    expect(p.reference.variants.readOptions).toEqual({
      ploidy: 4,
      onlyPassed: true,
    });
    expect(p.reference.checks.map((check) => check.settings)).toEqual([
      checkSettings(DIVERSITY, p, p.reference.variants, null),
    ]);
  });
});

/** Names of individuals, `ind_001` to the count given. */
function individualsNamed(count: number, first = 1): string[] {
  return Array.from(
    { length: count },
    (_, index) => `ind_${String(first + index).padStart(3, "0")}`,
  );
}

/** The variants file of the functionality's example: panel_2026.nei, 342
    individuals and 1,203,554 variants. */
const PANEL_2026: VariantSource = {
  fileId: "99999999999999999999999999999999",
  name: "panel_2026.nei",
  size: 52428800,
  format: "nei",
  readOptions: null,
  read: {
    kind: "read",
    individuals: individualsNamed(342),
    ploidy: 2,
    numVars: 1203554,
    keepsPassed: false,
  },
};

/** `PANEL_2026` loaded again, with its read replaced by `read`. */
function givenAgain(
  read: Partial<{
    individuals: readonly string[];
    ploidy: number;
    numVars: number | null;
  }>,
): VariantSource {
  const saved = PANEL_2026.read;
  if (saved.kind !== "read") {
    throw new Error("PANEL_2026 is read");
  }
  return {
    ...PANEL_2026,
    fileId: SAMPLE_VARIANTS_ID,
    read: { ...saved, ...read },
  };
}

/** A project opened from a file made with `PANEL_2026`, with `variants`
    loaded. */
function openedWith(variants: VariantSource | null): Project {
  return deepFreeze<Project>({
    ...emptyProject("popgen"),
    variants,
    reference: { variants: PANEL_2026, checks: [] },
  });
}

/** The read of the VCF a project was made with: 4 individuals, ploidy 2,
    100 variants. */
const VCF_2026_READ = {
  kind: "read",
  individuals: ["i1", "i2", "i3", "i4"],
  ploidy: 2,
  numVars: 100,
  keepsPassed: true,
} as const;

/** The VCF a project was made with, read with ploidy 2 and only the
    variants that passed. */
const VCF_2026: VariantSource = {
  fileId: "99999999999999999999999999999999",
  name: "panel.vcf.gz",
  size: 4096,
  format: "vcf",
  readOptions: { ploidy: 2, onlyPassed: true },
  read: VCF_2026_READ,
};

/** A check of the diversity, as a reference keeps it. */
const DIVERSITY_CHECK = {
  analysis: "diversity",
  numbers: [1, 2],
  keyVersion: 1,
  popneiVersion: "0.1.0",
  appVersion: "0.1.0",
  settings: { passedKept: "0".repeat(64), passedNotKept: "0".repeat(64) },
} as const;

/** A project opened from a file made with `VCF_2026`, with the check of
    the diversity when `withCheck`, and `VCF_2026` loaded again with the
    read options `readOptions` and the read `read`. */
function vcfOpenedWith(
  readOptions: { ploidy: number; onlyPassed: boolean },
  read: VariantSource["read"],
  withCheck = false,
): Project {
  return deepFreeze<Project>({
    ...emptyProject("popgen"),
    variants: {
      ...VCF_2026,
      fileId: SAMPLE_VARIANTS_ID,
      readOptions,
      read:
        read.kind === "read" ? { ...read, ploidy: readOptions.ploidy } : read,
    },
    reference: {
      variants: VCF_2026,
      checks: withCheck ? [DIVERSITY_CHECK] : [],
    },
  });
}

/** The project of `v1-every-filter.popnei.json` once opened, without the
    fingerprint of its check: the four filters of the variants in their
    fixed order and the four filters of the individuals in theirs. The
    lists keep ind_001, ind_003 and ind_005 of the north and ind_004 of
    the south; the thresholds, which the statistics of each individual
    decide, had left the north alone when the file was saved, so its
    check holds the 4 numbers of one population. */
function everyFilterProject(): Project {
  const individuals = [
    "ind_001",
    "ind_002",
    "ind_003",
    "ind_004",
    "ind_005",
    "ind_006",
  ];
  return {
    app: "popgen",
    variants: null,
    filters: [
      { kind: "missing_data", maxAllowedMissingRate: 0.05 },
      { kind: "obs_het", maxAllowedObsHet: 0.6 },
      { kind: "maf", maxAllowedMaf: 0.95 },
      { kind: "ld", maxAllowedR2: 0.2, maxDist: 100000 },
    ],
    filtersOff: [],
    individualFilters: [
      { kind: "keep", individuals: individuals.slice(0, 5) },
      { kind: "remove", individuals: ["ind_002"] },
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
      { kind: "obs_het", maxAllowedObsHet: 0.5 },
    ],
    individualFiltersOff: [],
    individuals: {
      fileId: "b0b1b2b3b4b5b6b7b8b9babbbcbdbebf",
      name: "pops.csv",
      csv: { encoding: "auto", separator: "auto", decimal: "auto" },
      typesSet: [],
      read: {
        kind: "read",
        table: {
          columns: ["id", "pop"],
          rows: individuals.map((name, index) => [
            name,
            index % 2 === 0 ? "north" : "south",
          ]),
        },
        columns: [{ kind: "identifier" }, { kind: "categorical" }],
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
    reference: {
      variants: {
        fileId: "a0a1a2a3a4a5a6a7a8a9aaabacadaeaf",
        name: "panel_2026.vcf.gz",
        size: 18350120,
        format: "vcf",
        readOptions: { ploidy: 2, onlyPassed: false },
        read: {
          kind: "read",
          individuals,
          ploidy: 2,
          numVars: 25000,
          keepsPassed: true,
        },
      },
      checks: [
        {
          analysis: "diversity",
          numbers: [18211, 0.2811, 0.2754, 0.8406],
          keyVersion: 1,
          popneiVersion: "0.1.0",
          appVersion: "0.1.0",
          settings: { passedKept: "", passedNotKept: "" },
        },
      ],
    },
  };
}

describe("VS3 D8 the project file of stage 3", () => {
  const FILE = "v1-every-filter.popnei.json";

  test(`${FILE} opens into its project, every filter in its order`, () => {
    expect(
      readProjectFile(fixture(FILE), "popgen", POPGEN_DEFS, OLD_PAGE),
    ).toEqual({
      ok: true,
      value: opened(everyFilterProject()),
    });
  });

  test("a file of version 1 whose filters of the variants are maf then missing_data is refused as filterOutOfOrder, with its text", () => {
    const text = JSON.stringify({
      ...fixtureJson(FILE),
      filters: [
        { kind: "maf", maxAllowedMaf: 0.95 },
        { kind: "missing_data", maxAllowedMissingRate: 0.05 },
      ],
    });
    const expected: ProjectFileError = {
      kind: "project",
      error: { kind: "filterOutOfOrder", path: ["filters", 1] },
    };
    expect(readProjectFile(text, "popgen", POPGEN_DEFS, OLD_PAGE)).toEqual({
      ok: false,
      error: expected,
    });
    expect(projectFileErrorText(expected, "run1.popnei.json")).toBe(
      "The project file cannot be opened: the filters of the variants should be in the order the FILTER column, missing genotypes, observed heterozygosity, major allele frequency, linkage disequilibrium, and the second one is out of that order. The file was changed outside the application, or is damaged. Open a copy saved before the change, or make the project again.",
    );
  });

  test("with the diversity's own definition, the count of the check numbers is not checked with a threshold on the individuals, and is with the lists alone", () => {
    // The file's 4 numbers, of the north alone, open: the thresholds keep
    // individuals by statistics not yet calculated for the new load.
    expect(
      readProjectFile(fixture(FILE), "popgen", POPGEN_ANALYSES, OLD_PAGE).ok,
    ).toBe(true);
    // Without the thresholds, the lists keep both populations, which give
    // 7 numbers.
    const listsAlone = JSON.stringify({
      ...fixtureJson(FILE),
      individualFilters: [
        {
          kind: "keep",
          individuals: ["ind_001", "ind_002", "ind_003", "ind_004", "ind_005"],
        },
        { kind: "remove", individuals: ["ind_002"] },
      ],
    });
    expect(
      readProjectFile(listsAlone, "popgen", POPGEN_ANALYSES, OLD_PAGE),
    ).toEqual({
      ok: false,
      error: {
        kind: "header",
        field: "checks",
        expected:
          "7 numbers for the analysis diversity, as many as the rest of the file gives it, and not 4",
      },
    });
  });
});

describe("WS6 D3 the comparisons", () => {
  test("a name that differs", () => {
    expect(
      compareIdentity(PANEL_2026, {
        ...givenAgain({}),
        name: "panel_2027.nei",
      }),
    ).toEqual([{ kind: "name", now: "panel_2027.nei" }]);
  });

  test("a format that differs", () => {
    expect(
      compareIdentity(PANEL_2026, {
        ...givenAgain({}),
        format: "vcf",
        readOptions: { ploidy: 2, onlyPassed: false },
      }),
    ).toEqual([{ kind: "format", now: "vcf" }]);
  });

  test("a format that differs, and no size then, which always differs across formats", () => {
    expect(
      compareIdentity(PANEL_2026, {
        ...givenAgain({}),
        format: "vcf",
        size: 87304,
        readOptions: { ploidy: 2, onlyPassed: false },
      }),
    ).toEqual([{ kind: "format", now: "vcf" }]);
  });

  test("a size that differs", () => {
    expect(
      compareIdentity(PANEL_2026, { ...givenAgain({}), size: 52430112 }),
    ).toEqual([{ kind: "size", saved: 52428800, now: 52430112 }]);
  });

  test("a number of individuals that differs", () => {
    expect(
      compareIdentity(
        PANEL_2026,
        givenAgain({ individuals: individualsNamed(360) }),
      ),
    ).toEqual([{ kind: "individualsCount", now: 360 }]);
  });

  test("other individuals, as many", () => {
    const now = individualsNamed(342).filter(
      (name) => !["ind_031", "ind_044"].includes(name),
    );
    expect(
      compareIdentity(
        PANEL_2026,
        givenAgain({ individuals: [...now, "x1", "x2"] }),
      ),
    ).toEqual([{ kind: "otherIndividuals", missing: ["ind_031", "ind_044"] }]);
  });

  test("the same individuals in another order", () => {
    expect(
      compareIdentity(
        PANEL_2026,
        givenAgain({ individuals: individualsNamed(342).toReversed() }),
      ),
    ).toEqual([{ kind: "individualsOrder" }]);
  });

  test("a ploidy that differs", () => {
    expect(compareIdentity(PANEL_2026, givenAgain({ ploidy: 4 }))).toEqual([
      { kind: "ploidy", saved: 2, now: 4 },
    ]);
  });

  test("a choice of the passed variants that differs, before the file is read and after, after the ploidy", () => {
    const pending: VariantSource = {
      ...VCF_2026,
      fileId: SAMPLE_VARIANTS_ID,
      readOptions: { ploidy: 2, onlyPassed: false },
      read: { kind: "pending" },
    };
    expect(compareIdentity(VCF_2026, pending)).toEqual([
      { kind: "onlyPassed", now: false },
    ]);
    const read: VariantSource = {
      ...VCF_2026,
      fileId: SAMPLE_VARIANTS_ID,
      readOptions: { ploidy: 4, onlyPassed: false },
      read: { ...VCF_2026_READ, ploidy: 4, numVars: 90 },
    };
    expect(compareIdentity(VCF_2026, read)).toEqual([
      { kind: "ploidy", saved: 2, now: 4 },
      { kind: "onlyPassed", now: false },
      { kind: "numVars", now: 90 },
    ]);
    expect(
      compareIdentity(VCF_2026, { ...VCF_2026, fileId: SAMPLE_VARIANTS_ID }),
    ).toEqual([]);
  });

  test("the warning of a choice of the passed variants that differs, both ways", () => {
    const made =
      "The project was made with panel.vcf.gz, 4 individuals and 100 variants; this file";
    const end =
      "Load the file the project was made with, or go on with this one.";
    expect(
      identityWarning(
        vcfOpenedWith({ ploidy: 2, onlyPassed: false }, { kind: "pending" }),
      ),
    ).toBe(
      `${made} is read with every variant where that one was read with only the variants with PASS or . in the FILTER column. ${end}`,
    );
    const everyVariant: Reference = {
      variants: {
        ...VCF_2026,
        readOptions: { ploidy: 2, onlyPassed: false },
      },
      checks: [],
    };
    expect(
      identityWarning(
        deepFreeze<Project>({
          ...emptyProject("popgen"),
          variants: { ...VCF_2026, fileId: SAMPLE_VARIANTS_ID },
          reference: everyVariant,
        }),
      ),
    ).toBe(
      `${made} is read with only the variants with PASS or . in the FILTER column where that one was read with every variant. ${end}`,
    );
  });

  test("the line of numbers not compared, for each read option and for both", () => {
    const start = "Not compared with the numbers of the project file:";
    const passed = "only the variants with PASS or . in the FILTER column";
    expect(
      uncomparedText(
        vcfOpenedWith({ ploidy: 2, onlyPassed: false }, VCF_2026_READ, true),
        "diversity",
      ),
    ).toBe(
      `${start} this file was read with every variant, and the project's with ${passed}. To compare them, read the file again in the Variants step with ${passed}.`,
    );
    expect(
      uncomparedText(
        vcfOpenedWith({ ploidy: 4, onlyPassed: true }, VCF_2026_READ, true),
        "diversity",
      ),
    ).toBe(
      `${start} this file was read with ploidy 4, and the project's with ploidy 2. To compare them, read the file again in the Variants step with ploidy 2.`,
    );
    expect(
      uncomparedText(
        vcfOpenedWith({ ploidy: 4, onlyPassed: false }, VCF_2026_READ, true),
        "diversity",
      ),
    ).toBe(
      `${start} this file was read with ploidy 4 and every variant, and the project's with ploidy 2 and ${passed}. To compare them, read the file again in the Variants step with ploidy 2 and ${passed}.`,
    );
  });

  test("the line of numbers not compared, for a file of the other format, both ways", () => {
    const start = "Not compared with the numbers of the project file:";
    expect(
      uncomparedText(
        deepFreeze<Project>({
          ...emptyProject("popgen"),
          variants: {
            ...VCF_2026,
            fileId: SAMPLE_VARIANTS_ID,
            name: "panel_2026.vcf.gz",
          },
          reference: { variants: PANEL_2026, checks: [DIVERSITY_CHECK] },
        }),
        "diversity",
      ),
    ).toBe(
      `${start} this file is a VCF, and the project was made with a .nei file. Load panel_2026.nei in the Variants step to compare them.`,
    );
    expect(
      uncomparedText(
        deepFreeze<Project>({
          ...emptyProject("popgen"),
          variants: { ...givenAgain({}), name: "panel.nei" },
          reference: { variants: VCF_2026, checks: [DIVERSITY_CHECK] },
        }),
        "diversity",
      ),
    ).toBe(
      `${start} this file is a .nei file, and the project was made with a VCF. Load panel.vcf.gz in the Variants step to compare them.`,
    );
    expect(
      uncomparedText(
        deepFreeze<Project>({
          ...emptyProject("popgen"),
          variants: { ...givenAgain({}), name: "panel.nei" },
          reference: { variants: VCF_2026, checks: [] },
        }),
        "diversity",
      ),
    ).toBeNull();
  });

  test("no line of numbers not compared with the same read options, no check of the analysis, a .nei file, or no reference", () => {
    expect(
      uncomparedText(
        vcfOpenedWith({ ploidy: 2, onlyPassed: true }, VCF_2026_READ, true),
        "diversity",
      ),
    ).toBeNull();
    expect(
      uncomparedText(
        vcfOpenedWith({ ploidy: 4, onlyPassed: false }, VCF_2026_READ, true),
        "pca",
      ),
    ).toBeNull();
    expect(
      uncomparedText(
        vcfOpenedWith({ ploidy: 4, onlyPassed: false }, VCF_2026_READ, false),
        "diversity",
      ),
    ).toBeNull();
    expect(
      uncomparedText(
        deepFreeze<Project>({
          ...openedWith(givenAgain({ ploidy: 4 })),
          reference: { variants: PANEL_2026, checks: [DIVERSITY_CHECK] },
        }),
        "diversity",
      ),
    ).toBeNull();
    expect(
      uncomparedText(
        deepFreeze<Project>({
          ...emptyProject("popgen"),
          variants: {
            ...VCF_2026,
            readOptions: { ploidy: 4, onlyPassed: true },
          },
        }),
        "diversity",
      ),
    ).toBeNull();
    expect(
      uncomparedText(
        deepFreeze<Project>({
          ...emptyProject("popgen"),
          reference: { variants: VCF_2026, checks: [DIVERSITY_CHECK] },
        }),
        "diversity",
      ),
    ).toBeNull();
  });

  test("a number of variants that differs, once both are counted", () => {
    expect(
      compareIdentity(PANEL_2026, givenAgain({ numVars: 1203600 })),
    ).toEqual([{ kind: "numVars", now: 1203600 }]);
    expect(compareIdentity(PANEL_2026, givenAgain({ numVars: null }))).toEqual(
      [],
    );
  });

  test("the warning of docs/functionality.md, whole", () => {
    expect(
      identityWarning(
        openedWith(givenAgain({ individuals: individualsNamed(360) })),
      ),
    ).toBe(
      "The project was made with panel_2026.nei, 342 individuals and 1,203,554 variants; this file has 360 individuals. Load the file the project was made with, or go on with this one.",
    );
  });

  test("the warning names every difference, and the individuals lacking as the project names them", () => {
    const now = individualsNamed(342).filter(
      (name) => !individualsNamed(12, 31).includes(name),
    );
    expect(
      identityWarning(
        openedWith({
          ...givenAgain({
            individuals: [...now, ...individualsNamed(12, 500)],
          }),
          name: "panel_2027.nei",
          size: 52430112,
        }),
      ),
    ).toBe(
      "The project was made with panel_2026.nei, 342 individuals and 1,203,554 variants; this file is called panel_2027.nei, has 52,430,112 bytes where that one had 52,428,800 and lacks 12 individuals of that one: ind_031, ind_032 and 10 more. Load the file the project was made with, or go on with this one.",
    );
  });

  test("no warning with no reference, no file, or no difference", () => {
    expect(identityWarning(openedWith(null))).toBeNull();
    expect(identityWarning(openedWith(givenAgain({})))).toBeNull();
    expect(
      identityWarning(
        deepFreeze<Project>({
          ...emptyProject("popgen"),
          variants: PANEL_2026,
        }),
      ),
    ).toBeNull();
  });

  test("the file asked for after an opening", () => {
    expect(askedFileText(openedWith(null))).toBe(
      "This project was made with panel_2026.nei, of 342 individuals and 1,203,554 variants. Load it to run its analyses again.",
    );
    expect(
      askedFileText(
        deepFreeze<Project>({
          ...emptyProject("popgen"),
          reference: {
            variants: { ...PANEL_2026, read: { kind: "pending" } },
            checks: [],
          },
        }),
      ),
    ).toBe(
      "This project was made with panel_2026.nei. Load it to run its analyses again.",
    );
    expect(askedFileText(openedWith(givenAgain({})))).toBeNull();
    expect(askedFileText(emptyProject("popgen"))).toBeNull();
  });

  test("the words of the same numbers", () => {
    expect(checkVerdictText({ kind: "same" })).toBe(
      "The same numbers as in the project file: this variants file gives the results the project was saved with.",
    );
  });

  test("the words of other numbers, with and without the other causes", () => {
    const differs =
      "Not the same numbers as in the project file. The variants file may not be the one the project was saved with, or it was changed since.";
    expect(checkVerdictText({ kind: "differs", popnei: null, app: null })).toBe(
      differs,
    );
    expect(
      checkVerdictText({
        kind: "differs",
        popnei: { saved: "0.1.0", now: "0.2.0" },
        app: { saved: "0.2.0", now: "0.3.0" },
      }),
    ).toBe(
      `${differs} The numbers were calculated with popnei 0.1.0, and this is popnei 0.2.0. The numbers were calculated by version 0.2.0 of the application, which calculated this analysis in another way than this version, 0.3.0.`,
    );
  });
});

// The properties. `wholeProject` draws the fingerprints of the checks at
// random, and they never match; `savedState` makes that of half of them
// with the settings of the project drawn, gives the project the
// reference's variants file in half of the draws that have both, so that
// the rule of the carried check numbers is met, and draws the state of
// each analysis.

/** A check number JSON writes back as itself. */
const checkNumber = fc.option(
  fc.double({ noNaN: true, noDefaultInfinity: true }),
);

/** The state of an analysis, as drawn: done with its numbers, or not. */
const drawnStatus = fc.oneof(
  fc.constant<"ready" | "removed" | "locked">("ready"),
  fc.constant<"ready" | "removed" | "locked">("removed"),
  fc.constant<"ready" | "removed" | "locked">("locked"),
  // Done as often as the three others, so that a result done beside a
  // matching check of the reference is drawn in most runs.
  { arbitrary: fc.array(checkNumber, { maxLength: 7 }), weight: 3 },
);

/** Any state of the store that a project file is written from. */
const savedState: fc.Arbitrary<AppState<TestDefResult>> = fc
  .record({
    drawn: wholeProject,
    sameFile: fc.boolean(),
    matched: fc.array(fc.boolean(), { minLength: 3, maxLength: 3 }),
    statuses: fc.array(drawnStatus, { minLength: 3, maxLength: 3 }),
    popneiVersion: fc.option(fc.string()),
  })
  .map(({ drawn, sameFile, matched, statuses, popneiVersion }) => {
    const reference = drawn.reference;
    const p: Project =
      sameFile && reference !== null && drawn.variants !== null
        ? {
            ...drawn,
            // Read, so that an analysis can be done on it beside the
            // reference's checks; a pending read of the reference is not
            // compared, so the identity stays the same.
            variants: {
              ...reference.variants,
              fileId: drawn.variants.fileId,
              read:
                reference.variants.read.kind === "read"
                  ? reference.variants.read
                  : {
                      kind: "read",
                      individuals: ["i1"],
                      ploidy: 2,
                      numVars: null,
                      keepsPassed: reference.variants.format === "vcf",
                    },
            },
          }
        : drawn;
    const project: Project =
      reference === null
        ? p
        : {
            ...p,
            reference: {
              ...reference,
              checks: reference.checks.map((check, index) =>
                matched[index] === true
                  ? {
                      ...check,
                      settings: checkSettings(
                        defOf(check.analysis),
                        p,
                        p.variants ?? reference.variants,
                        null,
                      ),
                    }
                  : check,
              ),
            },
          };
    const canRun = project.variants?.read.kind === "read";
    const views = TEST_DEFS.map((def, index) => {
      const drawnOne = statuses[index] ?? "ready";
      const status: AnalysisStatus<TestDefResult> =
        typeof drawnOne === "string"
          ? drawnOne === "locked"
            ? { kind: "locked", reason: "Load a variants file." }
            : drawnOne === "ready"
              ? { kind: "ready", key: A_KEY, stopped: null }
              : { kind: drawnOne, key: A_KEY }
          : canRun
            ? {
                kind: "done",
                key: A_KEY,
                result: { analysis: def.id, numbers: drawnOne },
                warnings: [],
                check: null,
              }
            : { kind: "ready", key: A_KEY, stopped: null };
      return { id: def.id, status };
    });
    const anyDone = views.some((view) => view.status.kind === "done");
    return deepFreeze<AppState<TestDefResult>>({
      project,
      undo: null,
      redo: null,
      historyMoves: 0,
      popneiVersion:
        anyDone && popneiVersion === null ? "0.1.0" : popneiVersion,
      analyses: views,
      runs: [],
      notice: null,
      individualsKept: null,
      write: null,
    });
  });

/** The file of `state`, written by version 0.2.0 on a fixed date. */
function savedText(state: AppState<TestDefResult>): string {
  return writeProjectFile(
    state,
    TEST_DEFS,
    "0.2.0",
    "2026-09-25T14:03:11.000Z",
  );
}

/** Every name of a field the tables of the spec name, of the top of the
    file and of every object inside it but the options of an analysis. */
const NAMED_FIELDS = new Set([
  // the top
  "format",
  "formatVersion",
  "app",
  "appVersion",
  "popneiVersion",
  "saved",
  "variants",
  "filters",
  "filtersOff",
  "individualFilters",
  "individualFiltersOff",
  "individuals",
  "grouping",
  "analyses",
  "checks",
  // the variants file
  "fileId",
  "name",
  "size",
  "readOptions",
  "ploidy",
  "onlyPassed",
  "read",
  "kind",
  "numVars",
  // the filters
  "maxAllowedMissingRate",
  "maxAllowedMaf",
  "maxAllowedObsHet",
  "maxAllowedR2",
  "maxDist",
  // the individuals file
  "csv",
  "encoding",
  "separator",
  "decimal",
  "typesSet",
  "table",
  "columns",
  "rows",
  "one",
  "zero",
  "found",
  "undecodedLine",
  // the grouping
  "column",
  "roles",
  // the options and the checks
  "analysis",
  "options",
  "numbers",
  "keyVersion",
]);

/** The names of the fields of `value` and of what it holds that no table
    of the spec names, the options of the analyses left out. */
function unnamedFields(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(unnamedFields);
  }
  if (typeof value !== "object" || value === null) {
    return [];
  }
  return Object.entries(value).flatMap(([name, field]) => [
    ...(NAMED_FIELDS.has(name) ? [] : [name]),
    ...(name === "options" ? [] : unnamedFields(field)),
  ]);
}

/** Whether the variants file `now` has the identity of `saved`, as the
    spec's table of the identity compares them, written here apart from
    compareIdentity. */
function sameIdentity(saved: VariantSource, now: VariantSource): boolean {
  if (
    saved.name !== now.name ||
    saved.format !== now.format ||
    saved.size !== now.size
  ) {
    return false;
  }
  const a = saved.read;
  const b = now.read;
  if (a.kind !== "read" || b.kind !== "read") {
    return true;
  }
  return (
    a.individuals.length === b.individuals.length &&
    a.individuals.every((name, index) => b.individuals[index] === name) &&
    a.ploidy === b.ploidy &&
    (a.numVars === null || b.numVars === null || a.numVars === b.numVars)
  );
}

/** The checks the file of `state` holds, by the three rules of the spec's
    "The check numbers", without their fingerprints: a −0 read back as 0. */
function expectedChecks(
  state: AppState<TestDefResult>,
): Omit<Reference["checks"][number], "settings">[] {
  const p = state.project;
  const reference = p.reference;
  const checks: Omit<Reference["checks"][number], "settings">[] = [];
  for (const [index, def] of TEST_DEFS.entries()) {
    const status = state.analyses[index]?.status;
    if (status?.kind === "done") {
      checks.push({
        analysis: def.id,
        numbers: status.result.numbers.map((n) => (n === 0 ? 0 : n)),
        keyVersion: def.keyVersion,
        popneiVersion: state.popneiVersion ?? "",
        appVersion: "0.2.0",
      });
      continue;
    }
    const kept = reference?.checks.find((c) => c.analysis === def.id);
    if (
      reference === null ||
      kept === undefined ||
      (p.variants !== null && !sameIdentity(reference.variants, p.variants))
    ) {
      continue;
    }
    const source = p.variants ?? reference.variants;
    if (settingsAsSaved(def, p, kept, source, null)) {
      checks.push({
        analysis: kept.analysis,
        numbers: kept.numbers,
        keyVersion: kept.keyVersion,
        popneiVersion: kept.popneiVersion,
        appVersion: kept.appVersion,
      });
    }
  }
  return checks;
}

describe("WS6 D4 the properties of the project file", () => {
  test("a file written opens into the project the table of what is written gives", () => {
    fc.assert(
      fc.property(savedState, (state) => {
        const p = state.project;
        const opening = readProjectFile(
          savedText(state),
          p.app,
          TEST_DEFS,
          NEW_PAGE,
        );
        if (!opening.ok) {
          throw new Error(JSON.stringify(opening.error));
        }
        const got = opening.value;
        expect(got.variants).toBeNull();
        expect(got.filters).toEqual(p.filters);
        expect(got.individualFilters).toEqual(p.individualFilters);
        expect(got.individuals).toEqual(
          p.individuals === null || p.individuals.read.kind === "read"
            ? p.individuals
            : { ...p.individuals, read: { kind: "notGiven" } },
        );
        expect(got.grouping).toEqual(p.grouping);
        expect(got.analyses).toEqual(p.analyses);
        expect(
          (got.reference?.checks ?? []).map((check) => ({
            analysis: check.analysis,
            numbers: check.numbers,
            keyVersion: check.keyVersion,
            popneiVersion: check.popneiVersion,
            appVersion: check.appVersion,
          })),
        ).toEqual(expectedChecks(state));
        const candidates = [p.variants, p.reference?.variants ?? null]
          .filter((v): v is VariantSource => v !== null)
          .map((v): VariantSource =>
            v.read.kind === "read"
              ? {
                  ...v,
                  read: { ...v.read, keepsPassed: v.format === "vcf" },
                }
              : { ...v, read: { kind: "pending" } },
          );
        if (candidates.length === 0) {
          expect(got.reference).toBeNull();
        } else {
          expect(candidates).toContainEqual(got.reference?.variants);
        }
      }),
    );
  }, 30_000);

  test("written, opened, and written again with no result, a project gives the same text", () => {
    fc.assert(
      fc.property(savedState, (state) => {
        const text = savedText(state);
        const opening = readProjectFile(
          text,
          state.project.app,
          TEST_DEFS,
          NEW_PAGE,
        );
        if (!opening.ok) {
          throw new Error(JSON.stringify(opening.error));
        }
        const again = deepFreeze<AppState<TestDefResult>>({
          ...state,
          project: opening.value,
          analyses: TEST_DEFS.map((def) => ({
            id: def.id,
            status: { kind: "ready", key: A_KEY, stopped: null },
          })),
        });
        expect(savedText(again)).toBe(text);
      }),
    );
  });

  test("the text is JSON and holds no field the spec does not name", () => {
    fc.assert(
      fc.property(savedState, (state) => {
        const parsed: unknown = JSON.parse(savedText(state));
        expect(unnamedFields(parsed)).toEqual([]);
      }),
    );
  });
});

// The key version of the diversity raised to 2 when the filters of
// individuals came first (docs/specs/analyses/diversity.md, "What goes
// into its key"; entry A of docs/specs/stage-4-open-points.md): a project
// file saved by stage 3 compares its check numbers, and a difference
// names the versions of the application as well as the variants file.

/**
 * The comparison the store of the application, with `POPGEN_ANALYSES` and
 * the application's version `appVersion`, gives the diversity of the
 * project of `v1-nei-diversity.popnei.json`, whose check was saved under
 * key version 1, once the file's variants file is given again and read
 * and the diversity ends with the numbers of `numbers`: numVars, then the
 * expected and observed heterozygosity and the proportion polymorphic of
 * north and of south.
 */
function diversityVerdictOfStage3(
  numbers: readonly [number, number, number, number, number, number, number],
  appVersion: string,
): CheckVerdict | null {
  const [
    numVars,
    northExp,
    northObs,
    northPoly,
    southExp,
    southObs,
    southPoly,
  ] = numbers;
  const result: DiversityResult = {
    analysis: "diversity",
    pops: ["north", "south"],
    numIndividuals: Uint32Array.from([3, 3]),
    unbiasedExpHet: Float64Array.from([northExp, southExp]),
    obsHet: Float64Array.from([northObs, southObs]),
    polyRatio: Float64Array.from([northPoly, southPoly]),
    numVarsWithValue: Uint32Array.from([numVars, numVars]),
    ...noPopDiversity(2),
    passStats: {
      numVars,
      filtering: {
        missing_data: { varsProcessed: 1203554, varsKept: numVars },
      },
    },
  };
  return diversityVerdictOf("v1-nei-diversity.popnei.json", result, appVersion);
}

/**
 * The comparison the store of the application, with `POPGEN_ANALYSES` and
 * the application's version `appVersion`, gives the diversity of the
 * project of the fixture `file`, once the file's variants file is given
 * again and read and the diversity ends with `result`.
 */
function diversityVerdictOf(
  file: string,
  result: DiversityResult,
  appVersion: string,
): CheckVerdict | null {
  const opened = readProjectFile(
    fixture(file),
    "popgen",
    POPGEN_ANALYSES,
    OLD_PAGE,
  );
  if (!opened.ok) {
    throw new Error("the fixture does not open");
  }
  const sent: { key: string; run: Run<JobResult> }[] = [];
  const store = createStore<Job, JobResult>({
    first: emptyProject("popgen"),
    analyses: POPGEN_ANALYSES,
    send: (key) => {
      const run: Run<JobResult> = {
        id: sent.length + 1,
        outcome: new Promise<Outcome<JobResult>>(() => undefined),
        cancel: () => undefined,
      };
      sent.push({ key, run });
      return run;
    },
    countsOf,
    counts: "filterCounts",
    statistics: { analysis: "individualChecks", of: individualStatsOf },
    write: null,
    appVersion,
    cacheMaxBytes: 1024 * 1024,
    maxUndoSteps: 200,
  });
  store.popneiReady("0.1.0");
  store.open(() => opened.value);
  const reference = opened.value.reference;
  if (reference === null) {
    throw new Error("the fixture has no reference");
  }
  const { read, ...load } = reference.variants;
  store.apply("a variants file was loaded", (p) => ({
    ...p,
    variants: {
      ...load,
      fileId: SAMPLE_VARIANTS_ID,
      read: { kind: "pending" },
    },
  }));
  if (read.kind !== "read") {
    throw new Error("the fixture has no variants file read");
  }
  store.variantsRead(SAMPLE_VARIANTS_ID, read);
  store.startRun("diversity");
  const request = sent[0];
  if (request === undefined) {
    throw new Error("no request of the diversity was sent");
  }
  store.runEnded(request.run.id, {
    kind: "done",
    key: request.key,
    result,
  });
  const status = store
    .getState()
    .analyses.find((view) => view.id === "diversity")?.status;
  if (status?.kind !== "done") {
    throw new Error("the diversity is not done");
  }
  return status.check;
}

describe("IP2 D2 the check numbers of a project file of stage 3", () => {
  test("the diversity of a file saved under key version 1 is compared under key version 3: the same numbers give same, and others name both versions of the application", () => {
    const saved = [
      1150112, 0.3120051, 0.3089214, 0.9124, 0.2987112, 0.2954871, 0.8977,
    ] as const;
    expect(
      POPGEN_ANALYSES.find((def) => def.id === "diversity")?.keyVersion,
    ).toBe(3);

    expect(diversityVerdictOfStage3(saved, "0.2.0")).toStrictEqual({
      kind: "same",
    });

    const other = [
      1117, 0.3120051, 0.3089214, 0.9124, 0.2987112, 0.2954871, 0.8977,
    ] as const;
    const verdict = diversityVerdictOfStage3(other, "0.2.0");
    expect(verdict).toStrictEqual({
      kind: "differs",
      popnei: null,
      app: { saved: "0.1.0", now: "0.2.0" },
    });
    expect(verdict === null ? null : checkVerdictText(verdict)).toBe(
      "Not the same numbers as in the project file. The variants file may not be the one the project was saved with, or it was changed since. The numbers were calculated by version 0.1.0 of the application, which calculated this analysis in another way than this version, 0.2.0.",
    );
  });
});

/** The project of `v1-ld-no-distance.popnei.json` once opened: panel.nei,
    no metadata file, the missing data filter at 0.1 and the LD filter at
    r² 0.3 whose distance was not typed when the project was saved, and
    no check. */
function ldNoDistanceProject(): Project {
  return {
    app: "popgen",
    variants: null,
    filters: [
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
      { kind: "ld", maxAllowedR2: 0.3, maxDist: null },
    ],
    filtersOff: [],
    individualFilters: [],
    individualFiltersOff: [],
    individuals: null,
    grouping: { kind: "populations", column: null },
    analyses: [],
    reference: {
      variants: {
        fileId: "c0c1c2c3c4c5c6c7c8c9cacbcccdcecf",
        name: "panel.nei",
        size: 261570,
        format: "nei",
        readOptions: null,
        read: {
          kind: "read",
          individuals: ["ind_001", "ind_002", "ind_003", "ind_004"],
          ploidy: 2,
          numVars: 1200,
          keepsPassed: false,
        },
      },
      checks: [],
    },
  };
}

describe("IP3 D2 the project file of the switches", () => {
  const FILE = "v1-ld-no-distance.popnei.json";

  test(`${FILE} opens into its project, the LD filter with no distance and its lock`, () => {
    const read = readProjectFile(
      fixture(FILE),
      "popgen",
      POPGEN_DEFS,
      OLD_PAGE,
    );
    expect(read).toEqual({ ok: true, value: opened(ldNoDistanceProject()) });
    expect(read.ok && variantFilterNeeds(read.value)).toBe(
      "The LD pruning of the Variants step needs the distance within which variants are compared. It has no default, because it depends on how far linkage disequilibrium extends in the genome of your species. Type a distance in base pairs, or turn off the LD pruning, in the Variants step.",
    );
  });

  test(`${FILE} is written back byte for byte from its project, with "maxDist": null`, () => {
    const state = stateOf(
      opened(ldNoDistanceProject()),
      Object.fromEntries(
        POPGEN_DEFS.map((def) => [
          def.id,
          { kind: "locked", reason: "Load a variants file." },
        ]),
      ),
    );
    const text = writeProjectFile(
      state,
      POPGEN_DEFS,
      "0.1.0",
      "2026-09-28T10:15:30.000Z",
    );
    expect(text).toBe(fixture(FILE));
    expect(text).toContain('"maxDist": null');
  });
});

/** The project of `v1-filters-off.popnei.json` once opened: panel.nei, no
    metadata file, the missing data filter at 0.1 on, the MAF filter at
    0.9 and the LD filter at r² 0.2 within 50000 turned off, the threshold
    of observed heterozygosity at 0.38 turned off, and no check. */
function filtersOffProject(): Project {
  return {
    app: "popgen",
    variants: null,
    filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.1 }],
    filtersOff: [
      { kind: "maf", maxAllowedMaf: 0.9 },
      { kind: "ld", maxAllowedR2: 0.2, maxDist: 50000 },
    ],
    individualFilters: [],
    individualFiltersOff: [{ kind: "obs_het", maxAllowedObsHet: 0.38 }],
    individuals: null,
    grouping: { kind: "populations", column: null },
    analyses: [],
    reference: {
      variants: {
        fileId: "d0d1d2d3d4d5d6d7d8d9dadbdcdddedf",
        name: "panel.nei",
        size: 261570,
        format: "nei",
        readOptions: null,
        read: {
          kind: "read",
          individuals: ["ind_001", "ind_002", "ind_003", "ind_004"],
          ploidy: 2,
          numVars: 1200,
          keepsPassed: false,
        },
      },
      checks: [],
    },
  };
}

/**
 * The text of a fixture saved before the filters turned off were kept, as
 * this version writes it back: `"filtersOff": []` before its filters of
 * the individuals and `"individualFiltersOff": []` before its individuals
 * file, and nothing else changed.
 */
function withListsOff(text: string): string {
  const once = (from: string, to: string, into: string): string => {
    if (into.split(from).length !== 2) {
      throw new Error(`the fixture does not have ${from} once`);
    }
    return into.replace(from, to);
  };
  return once(
    '\n  "individuals": ',
    '\n  "individualFiltersOff": [],\n  "individuals": ',
    once(
      '\n  "individualFilters": ',
      '\n  "filtersOff": [],\n  "individualFilters": ',
      text,
    ),
  );
}

/**
 * The text of a fixture saved before the types the user set were written,
 * as this version writes it back: `"typesSet": []` before the read of its
 * individuals file, when it has one, and nothing else changed.
 */
function withTypesSetEmpty(text: string): string {
  const csvEnd = '\n      "decimal": "auto"\n    },\n    "read": ';
  if (!text.includes('\n  "individuals": {')) {
    return text;
  }
  if (text.split(csvEnd).length !== 2) {
    throw new Error("the fixture does not have the end of its CSV once");
  }
  return text.replace(
    csvEnd,
    '\n      "decimal": "auto"\n    },\n    "typesSet": [],\n    "read": ',
  );
}

describe("IP3 D2 the project file of the filters turned off", () => {
  const FILE = "v1-filters-off.popnei.json";

  test(`${FILE} opens into its project, the filters off with their values`, () => {
    expect(
      readProjectFile(fixture(FILE), "popgen", POPGEN_DEFS, OLD_PAGE),
    ).toEqual({
      ok: true,
      value: opened(filtersOffProject()),
    });
  });

  test(`${FILE} is written back byte for byte from its project`, () => {
    const state = stateOf(
      opened(filtersOffProject()),
      Object.fromEntries(
        POPGEN_DEFS.map((def) => [
          def.id,
          { kind: "locked", reason: "Load a variants file." },
        ]),
      ),
    );
    expect(
      writeProjectFile(state, POPGEN_DEFS, "0.1.0", "2026-09-28T16:40:05.000Z"),
    ).toBe(fixture(FILE));
  });

  test(`${FILE} opened, the LD filter turned on again with the values kept`, () => {
    const read = readProjectFile(
      fixture(FILE),
      "popgen",
      POPGEN_DEFS,
      OLD_PAGE,
    );
    if (!read.ok) {
      throw new Error("the fixture opens");
    }
    const p = read.value;
    const kept = p.filtersOff.find((f) => f.kind === "ld");
    if (kept === undefined) {
      throw new Error("the fixture keeps the LD filter");
    }
    const on = setVariantFilter(freezeProject(p), kept);
    expect(on.filters).toStrictEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
      { kind: "ld", maxAllowedR2: 0.2, maxDist: 50000 },
    ]);
    expect(on.filtersOff).toStrictEqual([{ kind: "maf", maxAllowedMaf: 0.9 }]);
    expect(variantFilterNeeds(on)).toBeNull();
  });

  test.each([
    ...FIXTURES,
    {
      file: "v1-every-filter.popnei.json",
      project: everyFilterProject,
      appVersion: "0.1.0",
      popneiVersion: "0.1.0",
      saved: "2026-09-26T11:20:45.000Z",
    },
  ])(
    "$file, saved before the filters off were kept, is written back with the two lists empty added and nothing else changed",
    (f) => {
      const state = stateOf(
        opened(f.project()),
        Object.fromEntries(
          POPGEN_DEFS.map((def) => [
            def.id,
            { kind: "locked", reason: "Load a variants file." },
          ]),
        ),
        f.popneiVersion,
      );
      const text = writeProjectFile(state, POPGEN_DEFS, f.appVersion, f.saved);
      expect(fixture(f.file)).not.toContain("filtersOff");
      expect(fixture(f.file)).not.toContain("individualFiltersOff");
      expect(text).toBe(withTypesSetEmpty(withListsOff(fixture(f.file))));
      expect(text).toContain('\n  "filtersOff": [],\n');
      expect(text).toContain('\n  "individualFiltersOff": [],\n');
    },
  );

  test("a file with one of the two lists and not the other opens, the other empty", () => {
    const rest = Object.fromEntries(
      Object.entries(fixtureJson(FILE)).filter(
        ([name]) => name !== "individualFiltersOff",
      ),
    );
    const read = readProjectFile(
      JSON.stringify(rest),
      "popgen",
      POPGEN_DEFS,
      OLD_PAGE,
    );
    expect(read.ok && read.value.filtersOff).toStrictEqual(
      filtersOffProject().filtersOff,
    );
    expect(read.ok && read.value.individualFiltersOff).toStrictEqual([]);
  });

  test("a file whose filters off hold a filter on is refused, with its text", () => {
    const text = JSON.stringify({
      ...fixtureJson(FILE),
      filtersOff: [{ kind: "missing_data", maxAllowedMissingRate: 0.2 }],
    });
    const expected: ProjectFileError = {
      kind: "project",
      error: {
        kind: "twoFiltersOfAKind",
        path: ["filtersOff", 0],
        filter: "missing_data",
      },
    };
    expect(readProjectFile(text, "popgen", POPGEN_DEFS, OLD_PAGE)).toEqual({
      ok: false,
      error: expected,
    });
    expect(projectFileErrorText(expected, "run1.popnei.json")).toBe(
      "The project file cannot be opened: it has the filter of the variants by missing genotypes both on and turned off, and a filter is one or the other. The file was changed outside the application, or is damaged. Open a copy saved before the change, or make the project again.",
    );
  });
});

// The project file of stage 4: the types the user set, a metadata file
// not read when the project was saved, and a project with no metadata
// file, whose diversity runs on one population.

/** A project as an opening with the definitions of the application gives
    it: the fingerprint of each check of its reference made, with the
    definition of its analysis, from the project and the read options of
    the reference's variants file. */
function openedInPopgen(p: Project): Project {
  const reference = p.reference;
  if (reference === null) {
    return deepFreeze(p);
  }
  return deepFreeze<Project>({
    ...p,
    reference: {
      ...reference,
      checks: reference.checks.map((check) => {
        const def = POPGEN_ANALYSES.find((d) => d.id === check.analysis);
        if (def === undefined) {
          throw new Error(`no definition of ${check.analysis}`);
        }
        return {
          ...check,
          settings: checkSettings(def, p, reference.variants, null),
        };
      }),
    },
  });
}

/** The state of the store of the application of population genetics with
    the project `p`, popnei 0.1.0, the diversity of the status `diversity`
    when one is given, and every other analysis locked. The project is
    frozen, and the result is not, since its typed arrays cannot be. */
function popgenState(
  p: Project,
  diversity: AnalysisStatus<JobResult> | null = null,
): AppState<JobResult> {
  return {
    project: deepFreeze(p),
    undo: null,
    redo: null,
    historyMoves: 0,
    popneiVersion: "0.1.0",
    analyses: POPGEN_ANALYSES.map((def) => ({
      id: def.id,
      status:
        def.id === "diversity" && diversity !== null
          ? diversity
          : { kind: "locked", reason: "Load a variants file." },
    })),
    runs: [],
    notice: null,
    individualsKept: null,
    write: null,
  };
}

/** The project of `v1-types.popnei.json` once opened, without the
    fingerprint of its check: the example of the spec whole, `pop` set
    categorical where the reader inferred binary, and `status`, of yes and
    no, set binary with no coded 1. */
function typesProject(): Project {
  return {
    ...neiDiversityProject(),
    individuals: {
      fileId: "ffeeddccbbaa99887766554433221100",
      name: "pops.csv",
      csv: { encoding: "auto", separator: "auto", decimal: "auto" },
      typesSet: [
        ["pop", { kind: "categorical" }],
        ["status", { kind: "binary", one: "no", zero: "yes" }],
      ],
      read: {
        kind: "read",
        table: {
          columns: ["id", "pop", "status"],
          rows: [
            ["ind_001", "north", "yes"],
            ["ind_002", "south", "no"],
            ["ind_003", "north", "no"],
            ["ind_004", "south", "yes"],
            ["ind_005", "north", "yes"],
            ["ind_006", "south", "no"],
          ],
        },
        columns: [
          { kind: "identifier" },
          { kind: "categorical" },
          { kind: "binary", one: "no", zero: "yes" },
        ],
        found: {
          encoding: "utf-8",
          separator: ",",
          decimal: ".",
          undecodedLine: null,
        },
      },
    },
  };
}

/** The project of `v1-metadata-not-read.popnei.json` once opened:
    panel.nei, the missing data filter at 0.1, pops.csv not read when the
    project was saved, with `pop` set categorical, the grouping by `pop`,
    and no check. */
function metadataNotReadProject(): Project {
  return {
    app: "popgen",
    variants: null,
    filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.1 }],
    filtersOff: [],
    individualFilters: [],
    individualFiltersOff: [],
    individuals: {
      fileId: "f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff",
      name: "pops.csv",
      csv: { encoding: "auto", separator: "auto", decimal: "auto" },
      typesSet: [["pop", { kind: "categorical" }]],
      read: { kind: "notGiven" },
    },
    grouping: { kind: "populations", column: "pop" },
    analyses: [],
    reference: {
      variants: {
        fileId: "e0e1e2e3e4e5e6e7e8e9eaebecedeeef",
        name: "panel.nei",
        size: 261490,
        format: "nei",
        readOptions: null,
        read: {
          kind: "read",
          individuals: ["ind_001", "ind_002", "ind_003", "ind_004"],
          ploidy: 2,
          numVars: 1200,
          keepsPassed: false,
        },
      },
      checks: [],
    },
  };
}

/** The 200 individuals of panel.nei, s000 to s199. */
const PANEL_INDIVIDUALS = Array.from(
  { length: 200 },
  (_, index) => `s${String(index).padStart(3, "0")}`,
);

/** The check numbers of the diversity of panel.nei with no metadata file
    and the missing data filter at 0.05: the variants kept, then the
    expected and observed heterozygosity and the proportion polymorphic of
    "All individuals" (docs/specs/analyses/diversity.md, "How it is
    verified"). */
const ONE_POPULATION_NUMBERS = [
  1152, 0.37487834409014364, 0.3541409192154764, 0.9791666666666666,
];

/** The project of `v1-one-population.popnei.json` once opened, without
    the fingerprint of its check: panel.nei, no metadata file, the grouping
    of one population, the missing data filter at 0.05, and the check of
    the diversity of "All individuals". */
function onePopulationProject(): Project {
  return {
    app: "popgen",
    variants: null,
    filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.05 }],
    filtersOff: [],
    individualFilters: [],
    individualFiltersOff: [],
    individuals: null,
    grouping: { kind: "onePopulation" },
    analyses: [],
    reference: {
      variants: {
        fileId: "a0a1a2a3a4a5a6a7a8a9aaabacadaeaf",
        name: "panel.nei",
        size: 261490,
        format: "nei",
        readOptions: null,
        read: {
          kind: "read",
          individuals: PANEL_INDIVIDUALS,
          ploidy: 2,
          numVars: 1200,
          keepsPassed: false,
        },
      },
      checks: [
        {
          analysis: "diversity",
          numbers: ONE_POPULATION_NUMBERS,
          keyVersion: 2,
          popneiVersion: "0.1.0",
          appVersion: "0.1.0",
          settings: { passedKept: "", passedNotKept: "" },
        },
      ],
    },
  };
}

describe("IP4 D4 the project file of stage 4", () => {
  test("v1-types.popnei.json opens into its project, the types set applied, and is written back byte for byte", () => {
    const FILE = "v1-types.popnei.json";
    expect(
      readProjectFile(fixture(FILE), "popgen", POPGEN_DEFS, OLD_PAGE),
    ).toEqual({
      ok: true,
      value: opened(typesProject()),
    });
    const state = stateOf(
      opened(typesProject()),
      Object.fromEntries(
        POPGEN_DEFS.map((def) => [
          def.id,
          { kind: "locked", reason: "Load a variants file." },
        ]),
      ),
    );
    expect(
      writeProjectFile(state, POPGEN_DEFS, "0.1.0", "2026-09-25T14:03:11.000Z"),
    ).toBe(fixture(FILE));
  });

  test("v1-metadata-not-read.popnei.json, pops.csv notGiven, opens into its project, locked until the file is loaded again, and is written back byte for byte", () => {
    const FILE = "v1-metadata-not-read.popnei.json";
    const read = readProjectFile(
      fixture(FILE),
      "popgen",
      POPGEN_ANALYSES,
      OLD_PAGE,
    );
    expect(read).toEqual({ ok: true, value: metadataNotReadProject() });
    expect(read.ok && individualsNeeds(read.value)).toBe(
      "pops.csv was not read when this project was saved, so the project file does not hold it. Load pops.csv again in the Individuals step.",
    );
    expect(
      writeProjectFile(
        popgenState(deepFreeze(metadataNotReadProject())),
        POPGEN_ANALYSES,
        "0.1.0",
        "2026-09-28T17:05:40.000Z",
      ),
    ).toBe(fixture(FILE));
  });

  test("v1-nei-diversity.popnei.json, saved before the types set were written, is written back with an empty typesSet added to its individuals file, and nothing else changed but the filters off", () => {
    const FILE = "v1-nei-diversity.popnei.json";
    expect(fixture(FILE)).not.toContain("typesSet");
    const state = stateOf(
      opened(neiDiversityProject()),
      Object.fromEntries(
        POPGEN_DEFS.map((def) => [
          def.id,
          { kind: "locked", reason: "Load a variants file." },
        ]),
      ),
    );
    const text = writeProjectFile(
      state,
      POPGEN_DEFS,
      "0.1.0",
      "2026-09-25T14:03:11.000Z",
    );
    expect(text).toBe(withTypesSetEmpty(withListsOff(fixture(FILE))));
    expect(text).toContain(
      '\n      "decimal": "auto"\n    },\n    "typesSet": [],\n    "read": {\n      "kind": "read",\n',
    );
    expect(text.split('"typesSet"')).toHaveLength(2);
  });

  test("v1-one-population.popnei.json, no metadata file, opens with the 4 check numbers of one population, is written back byte for byte, and is refused with 7", () => {
    const FILE = "v1-one-population.popnei.json";
    const project = openedInPopgen(onePopulationProject());
    expect(
      readProjectFile(fixture(FILE), "popgen", POPGEN_ANALYSES, OLD_PAGE),
    ).toEqual({
      ok: true,
      value: project,
    });
    expect(
      writeProjectFile(
        popgenState(project),
        POPGEN_ANALYSES,
        "0.1.0",
        "2026-09-28T17:20:15.000Z",
      ),
    ).toBe(fixture(FILE));

    // With no metadata file, the grouping by no column is one population
    // too.
    const noColumn = JSON.stringify({
      ...fixtureJson(FILE),
      grouping: { kind: "populations", column: null },
    });
    expect(
      readProjectFile(noColumn, "popgen", POPGEN_ANALYSES, OLD_PAGE).ok,
    ).toBe(true);

    const seven = JSON.stringify({
      ...fixtureJson(FILE),
      checks: [
        {
          analysis: "diversity",
          numbers: [...ONE_POPULATION_NUMBERS, 0.3, 0.3, 0.9],
          keyVersion: 2,
          popneiVersion: "0.1.0",
          appVersion: "0.1.0",
        },
      ],
    });
    expect(readProjectFile(seven, "popgen", POPGEN_ANALYSES, OLD_PAGE)).toEqual(
      {
        ok: false,
        error: {
          kind: "header",
          field: "checks",
          expected:
            "4 numbers for the analysis diversity, as many as the rest of the file gives it, and not 7",
        },
      },
    );
  });

  test("the diversity of a project with no metadata file, done over All individuals, is saved with its 4 check numbers, which open again", () => {
    const opening = readProjectFile(
      fixture("v1-one-population.popnei.json"),
      "popgen",
      POPGEN_ANALYSES,
      OLD_PAGE,
    );
    if (!opening.ok || opening.value.reference === null) {
      throw new Error("the fixture opens, with its reference");
    }
    const p = deepFreeze<Project>({
      ...opening.value,
      variants: opening.value.reference.variants,
    });
    const result: DiversityResult = {
      analysis: "diversity",
      pops: ["All individuals"],
      numIndividuals: Uint32Array.from([200]),
      unbiasedExpHet: Float64Array.from([0.37487834409014364]),
      obsHet: Float64Array.from([0.3541409192154764]),
      polyRatio: Float64Array.from([0.9791666666666666]),
      numVarsWithValue: Uint32Array.from([1152]),
      ...noPopDiversity(1),
      passStats: {
        numVars: 1152,
        filtering: {
          missing_data: { varsProcessed: 1200, varsKept: 1152 },
        },
      },
    };
    const text = writeProjectFile(
      popgenState(p, {
        kind: "done",
        key: A_KEY,
        result,
        warnings: [],
        check: null,
      }),
      POPGEN_ANALYSES,
      "0.2.0",
      "2026-09-28T18:00:00.000Z",
    );
    const again = readProjectFile(text, "popgen", POPGEN_ANALYSES, OLD_PAGE);
    if (!again.ok) {
      throw new Error(JSON.stringify(again.error));
    }
    expect(again.value.grouping).toEqual({ kind: "onePopulation" });
    expect(again.value.individuals).toBeNull();
    expect(again.value.reference?.checks.map((c) => c.numbers)).toEqual([
      ONE_POPULATION_NUMBERS,
    ]);
  });

  test("a read of the individuals file pending or failed is refused as header, with its text, and one notGiven opens", () => {
    const file = fixtureJson("v1-metadata-not-read.popnei.json");
    const individuals = file["individuals"];
    if (typeof individuals !== "object" || individuals === null) {
      throw new Error("the fixture has an individuals file");
    }
    const withRead = (read: unknown): string =>
      JSON.stringify({ ...file, individuals: { ...individuals, read } });
    const expected: ProjectFileError = {
      kind: "header",
      field: "individuals",
      expected:
        "the table read, or no table for a file not read, as the application saves it",
    };
    for (const read of [
      { kind: "pending" },
      { kind: "failed", error: { kind: "empty" }, format: "text" },
    ]) {
      expect(
        readProjectFile(withRead(read), "popgen", POPGEN_DEFS, OLD_PAGE),
      ).toEqual({
        ok: false,
        error: expected,
      });
    }
    expect(projectFileErrorText(expected, "run1.popnei.json")).toBe(
      "The project file cannot be opened: what was read of the individuals file should be the table read, or no table for a file not read, as the application saves it. The file was changed outside the application, or is damaged. Open a copy saved before the change, or make the project again.",
    );
    expect(
      readProjectFile(
        withRead({ kind: "notGiven" }),
        "popgen",
        POPGEN_DEFS,
        OLD_PAGE,
      ).ok,
    ).toBe(true);
  });
});

describe("IP10 D3 the cases of the project file", () => {
  test("a project saved while its VCF was read, opened, is compared with the file given by its name, its size, its format and the choice of the passed variants alone", () => {
    const opening = readProjectFile(
      fixture("v1-vcf-pending.popnei.json"),
      "popgen",
      POPGEN_DEFS,
      OLD_PAGE,
    );
    if (!opening.ok || opening.value.reference === null) {
      throw new Error("the fixture opens, with its reference");
    }
    const saved = opening.value.reference.variants;
    expect(saved.read).toEqual({ kind: "pending" });
    const given: VariantSource = {
      ...saved,
      fileId: SAMPLE_VARIANTS_ID,
      read: {
        kind: "read",
        individuals: ["i1", "i2", "i3"],
        ploidy: 4,
        numVars: 99,
        keepsPassed: true,
      },
    };
    const withGiven = (variants: VariantSource): Project =>
      deepFreeze<Project>({ ...opening.value, variants });

    // Its individuals, its ploidy read and its number of variants are not
    // known of the file saved, so they are not compared.
    expect(compareIdentity(saved, given)).toEqual([]);
    expect(identityWarning(withGiven(given))).toBeNull();

    const other: VariantSource = {
      ...given,
      name: "tetraploid_2027.vcf.gz",
      size: 734100,
      readOptions: { ploidy: 4, onlyPassed: false },
    };
    expect(compareIdentity(saved, other)).toEqual([
      { kind: "name", now: "tetraploid_2027.vcf.gz" },
      { kind: "size", saved: 734003, now: 734100 },
      { kind: "onlyPassed", now: false },
    ]);
    expect(
      compareIdentity(saved, {
        ...given,
        format: "nei",
        readOptions: null,
      }),
    ).toEqual([{ kind: "format", now: "nei" }]);
  });

  test("a project saved while its metadata file was read opens with a check of the diversity of any count, which cannot be counted without the table", () => {
    const file = fixtureJson("v1-metadata-not-read.popnei.json");
    const withCheck = JSON.stringify({
      ...file,
      checks: [
        {
          analysis: "diversity",
          numbers: [1152, 0.37, 0.35],
          keyVersion: 2,
          popneiVersion: "0.1.0",
          appVersion: "0.1.0",
        },
      ],
    });
    const opening = readProjectFile(
      withCheck,
      "popgen",
      POPGEN_ANALYSES,
      OLD_PAGE,
    );
    if (!opening.ok) {
      throw new Error(JSON.stringify(opening.error));
    }
    expect(opening.value.reference?.checks.map((c) => c.numbers)).toEqual([
      [1152, 0.37, 0.35],
    ]);
    expect(individualsNeeds(opening.value)).toBe(
      "pops.csv was not read when this project was saved, so the project file does not hold it. Load pops.csv again in the Individuals step.",
    );
  });
});

describe("PA6 D3 the options of the three analyses of the populations in a project file", () => {
  /** The definitions of the application, the two analyses of stage 5
      among them. */
  const ANALYSES = POPGEN_ANALYSES;

  /** The fixture with the diversity's options `diversityOptions`, and
      those of the distances and of the LD decay. */
  function withOptions(diversityOptions: unknown): string {
    return JSON.stringify({
      ...fixtureJson("v1-nei-diversity.popnei.json"),
      analyses: [
        { analysis: "diversity", options: diversityOptions },
        {
          analysis: "popDists",
          options: { minNumIndividuals: 10, measure: "dest" },
        },
        {
          analysis: "ldDecay",
          options: { maxDist: 100000, maxAllowedMaf: 0.9 },
        },
      ],
    });
  }

  test("a file with a draw of 60 typed, the distances at 10 and dest, and the LD decay at 100000 and 0.9 opens with them", () => {
    const opened = readProjectFile(
      withOptions({
        minNumIndividuals: 20,
        polyThreshold: 0.95,
        numCalledAlleles: 60,
      }),
      "popgen",
      ANALYSES,
      OLD_PAGE,
    );
    expect(opened.ok && opened.value.analyses).toEqual([
      {
        analysis: "diversity",
        options: {
          minNumIndividuals: 20,
          polyThreshold: 0.95,
          numCalledAlleles: 60,
        },
      },
      {
        analysis: "popDists",
        options: { minNumIndividuals: 10, measure: "dest" },
      },
      {
        analysis: "ldDecay",
        options: { maxDist: 100000, maxAllowedMaf: 0.9 },
      },
    ]);
  });

  test("the diversity's two options of before stage 5, with no draw, are refused with what they should be", () => {
    expect(
      readProjectFile(
        withOptions({ minNumIndividuals: 20, polyThreshold: 0.95 }),
        "popgen",
        ANALYSES,
        OLD_PAGE,
      ),
    ).toEqual({
      ok: false,
      error: {
        kind: "project",
        error: {
          kind: "wrongValue",
          path: ["analyses", 0, "options"],
          expected:
            "the minimum of individuals, a whole number from 0 to 4,294,967,295, the frequency below which a variant is polymorphic, a number from 0 to 1, and the chromosomes of the rarefaction, null or a whole number from 2 to 4,294,967,295, and nothing else",
        },
      },
    });
  });
});

/** The definitions of the application of population genetics, the two
    analyses of stage 5 among them. */
const STAGE_5_ANALYSES = POPGEN_ANALYSES;

/** The check numbers of the distances of panel.nei and the column `popcat`
    of panel_pops.csv with the missing data filter at 0.1: the variants
    kept, then Fst and D of p0 and p2, of p0 and p1 and of p2 and p1,
    which popnei js-v0.1.0-dev.3 gives at a minimum of 10 as at 20
    (docs/specs/core/projectFile.md, "How it is verified"). */
const DISTANCES_NUMBERS = [
  1200, 0.10273588423661377, 0.06129813142463423, 0.10496244498389443,
  0.06354346296076403, 0.10962148955018115, 0.06567052128821259,
];

/** The project of `v1-stage5-options.popnei.json` once opened, the
    fingerprint of its check made with the definition of the distances:
    panel.nei and panel_pops.csv grouped by `popcat`, whose 200 rows are
    read from e2e/fixtures/panel_pops.csv, the file the fixture names,
    rather than written out here; the missing data filter at 0.1; the
    options of the diversity with a draw of 60 typed, of the distances at
    a minimum of 10 with Jost's D, and of the LD decay within 100000 bp
    below a major allele frequency of 0.9; and the check of the
    distances. */
function stage5OptionsProject(): Project {
  const pops = readFileSync(
    new URL("../../e2e/fixtures/panel_pops.csv", import.meta.url),
    "utf8",
  )
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => line.split(","));
  const variants: VariantSource = {
    fileId: "b0b1b2b3b4b5b6b7b8b9babbbcbdbebf",
    name: "panel.nei",
    size: 261490,
    format: "nei",
    readOptions: null,
    read: {
      kind: "read",
      individuals: PANEL_INDIVIDUALS,
      ploidy: 2,
      numVars: 1200,
      keepsPassed: false,
    },
  };
  const p: Project = {
    app: "popgen",
    variants: null,
    filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.1 }],
    filtersOff: [],
    individualFilters: [],
    individualFiltersOff: [],
    individuals: {
      fileId: "c0c1c2c3c4c5c6c7c8c9cacbcccdcecf",
      name: "panel_pops.csv",
      csv: { encoding: "auto", separator: "auto", decimal: "auto" },
      typesSet: [],
      read: {
        kind: "read",
        table: { columns: ["IID", "popcat"], rows: pops },
        columns: [{ kind: "identifier" }, { kind: "categorical" }],
        found: {
          encoding: "utf-8",
          separator: ",",
          decimal: ".",
          undecodedLine: null,
        },
      },
    },
    grouping: { kind: "populations", column: "popcat" },
    analyses: [
      {
        analysis: "diversity",
        options: {
          minNumIndividuals: 20,
          polyThreshold: 0.95,
          numCalledAlleles: 60,
        },
      },
      {
        analysis: "popDists",
        options: { minNumIndividuals: 10, measure: "dest" },
      },
      {
        analysis: "ldDecay",
        options: { maxDist: 100000, maxAllowedMaf: 0.9 },
      },
    ],
    reference: { variants, checks: [] },
  };
  return deepFreeze<Project>({
    ...p,
    reference: {
      variants,
      checks: [
        {
          analysis: "popDists",
          numbers: DISTANCES_NUMBERS,
          keyVersion: 1,
          popneiVersion: "0.1.0",
          appVersion: "0.1.0",
          settings: checkSettings(popDists, p, variants, null),
        },
      ],
    },
  });
}

describe("PA6 D7 the project file of stage 5", () => {
  const FILE = "v1-stage5-options.popnei.json";

  test("v1-stage5-options.popnei.json opens into its project, with the options of the three analyses and the 7 check numbers of the distances, and is written back byte for byte", () => {
    const project = stage5OptionsProject();
    expect(
      readProjectFile(fixture(FILE), "popgen", STAGE_5_ANALYSES, OLD_PAGE),
    ).toEqual({
      ok: true,
      value: project,
    });
    const state: AppState<JobResult> = {
      ...popgenState(project),
      analyses: STAGE_5_ANALYSES.map((def) => ({
        id: def.id,
        status: { kind: "locked", reason: "Load a variants file." },
      })),
    };
    expect(
      writeProjectFile(
        state,
        STAGE_5_ANALYSES,
        "0.1.0",
        "2026-09-30T17:10:25.000Z",
      ),
    ).toBe(fixture(FILE));
  });

  test("the distances at a minimum of 10 over p0, p1 and p2 are refused with 6 check numbers, as with the 3 of two populations", () => {
    for (const numbers of [
      DISTANCES_NUMBERS.slice(0, 6),
      DISTANCES_NUMBERS.slice(0, 3),
    ]) {
      const file = JSON.stringify({
        ...fixtureJson(FILE),
        checks: [
          {
            analysis: "popDists",
            numbers,
            keyVersion: 1,
            popneiVersion: "0.1.0",
            appVersion: "0.1.0",
          },
        ],
      });
      expect(
        readProjectFile(file, "popgen", STAGE_5_ANALYSES, OLD_PAGE),
      ).toEqual({
        ok: false,
        error: {
          kind: "header",
          field: "checks",
          expected: `7 numbers for the analysis popDists, as many as the rest of the file gives it, and not ${String(numbers.length)}`,
        },
      });
    }
  });
});

describe("PA6 D5 the check numbers of a project file of stage 4", () => {
  /** The result of the diversity over All individuals of the fixture, with
      `numbers`: numVars, then the expected and observed heterozygosity and
      the proportion polymorphic. */
  function onePopulationResult(numbers: readonly number[]): DiversityResult {
    const [numVars = 0, expected = 0, observed = 0, polymorphic = 0] = numbers;
    return {
      analysis: "diversity",
      pops: ["All individuals"],
      numIndividuals: Uint32Array.from([200]),
      unbiasedExpHet: Float64Array.from([expected]),
      obsHet: Float64Array.from([observed]),
      polyRatio: Float64Array.from([polymorphic]),
      numVarsWithValue: Uint32Array.from([numVars]),
      ...noPopDiversity(1),
      passStats: {
        numVars,
        filtering: {
          missing_data: { varsProcessed: 1200, varsKept: numVars },
        },
      },
    };
  }

  test("the diversity of v1-one-population.popnei.json, saved under key version 2, is compared under key version 3, and a difference is told as calculated in another way", () => {
    const file = "v1-one-population.popnei.json";
    expect(fixtureJson(file)).toMatchObject({
      checks: [{ analysis: "diversity", keyVersion: 2, appVersion: "0.1.0" }],
    });
    expect(
      diversityVerdictOf(
        file,
        onePopulationResult(ONE_POPULATION_NUMBERS),
        "0.2.0",
      ),
    ).toStrictEqual({ kind: "same" });

    const verdict = diversityVerdictOf(
      file,
      onePopulationResult([1117, ...ONE_POPULATION_NUMBERS.slice(1)]),
      "0.2.0",
    );
    expect(verdict).toStrictEqual({
      kind: "differs",
      popnei: null,
      app: { saved: "0.1.0", now: "0.2.0" },
    });
    expect(verdict === null ? null : checkVerdictText(verdict)).toBe(
      "Not the same numbers as in the project file. The variants file may not be the one the project was saved with, or it was changed since. The numbers were calculated by version 0.1.0 of the application, which calculated this analysis in another way than this version, 0.2.0.",
    );
  });
});

describe("SF2 D2 a project file read gives keepsPassed by the format", () => {
  test.each([
    ["a .nei file", PANEL, true, false],
    ["a VCF", PANEL_VCF, false, true],
  ])(
    "%s read with keepsPassed %s is opened as the reference's with keepsPassed %s",
    (_name, source, saved, opened) => {
      const read = source.read.kind === "read" ? source.read : null;
      if (read === null) {
        throw new Error("the source of the test is read");
      }
      const p = withFiles(
        { ...source, read: { ...read, keepsPassed: saved } },
        null,
      );
      const opening = readProjectFile(
        savedText(stateOf(p)),
        p.app,
        TEST_DEFS,
        OLD_PAGE,
      );
      expect(opening.ok && opening.value.reference?.variants.read).toEqual({
        ...read,
        keepsPassed: opened,
      });
    },
  );
});

describe("SF2 D3 an opened project and the variants file given again give the same fingerprint", () => {
  /** Every analysis of the two pages of population genetics. */
  const DEFS = [...POPGEN_ANALYSES, ...POPGEN2_ANALYSES];

  /** low_qual.nei as the test needs it: 200 individuals of ploidy 2 and
      1,200 variants that record their FILTER, keepsPassed true, as popnei
      0.2.2 opens it under node; the names of the individuals are the
      test's. */
  const LOW_QUAL_NEI: VariantSource = {
    fileId: SAMPLE_VARIANTS_ID,
    name: "low_qual.nei",
    size: 261746,
    format: "nei",
    readOptions: null,
    read: {
      kind: "read",
      individuals: individualsNamed(200),
      ploidy: 2,
      numVars: 1200,
      keepsPassed: true,
    },
  };

  /** A VCF read with every variant, as popgen2.html opens each. */
  const ALL_VCF: VariantSource = {
    ...PANEL_VCF,
    readOptions: { ploidy: 2, onlyPassed: false },
  };

  /** `source` as an opened project file keeps it: under the load id of
      another session, its read with keepsPassed by the format, as
      readProjectFile gives it. */
  function asSaved(source: VariantSource): VariantSource {
    if (source.read.kind !== "read") {
      throw new Error("the source of the test is read");
    }
    return {
      ...source,
      fileId: "99999999999999999999999999999999",
      read: { ...source.read, keepsPassed: source.format === "vcf" },
    };
  }

  /** The project of population genetics, with the filter of the FILTER
      column on when `passedOn`. */
  function settingsWith(passedOn: boolean): Project {
    const p = emptyProject("popgen");
    return passedOn ? setVariantFilter(p, { kind: "passed" }) : p;
  }

  /** The project opened from a file saved with `saved`'s settings and
      `source`, with a check of `def` whose fingerprints are made as the
      opening makes them, and `source` given again and read. */
  function givenAgain(
    def: (typeof DEFS)[number],
    saved: Project,
    source: VariantSource,
  ): { readonly given: Project; readonly check: Check } {
    const reference = asSaved(source);
    const opened: Project = { ...saved, variants: null };
    const check: Check = {
      analysis: def.id,
      numbers: [1],
      keyVersion: def.keyVersion,
      popneiVersion: "0.2.2",
      appVersion: "0.2.0",
      settings: checkSettings(def, opened, reference, null),
    };
    return {
      given: deepFreeze<Project>({
        ...opened,
        variants: source,
        reference: { variants: reference, checks: [check] },
      }),
      check,
    };
  }

  /** The checks the file saved of `p` holds, with every analysis ready. */
  function checksSaved(p: Project): unknown {
    const state = deepFreeze<AppState<JobResult>>({
      project: p,
      undo: null,
      redo: null,
      historyMoves: 0,
      popneiVersion: "0.2.2",
      analyses: DEFS.map((def) => ({
        id: def.id,
        status: { kind: "ready", key: A_KEY, stopped: null },
      })),
      runs: [],
      notice: null,
      individualsKept: null,
      write: null,
    });
    const file: unknown = JSON.parse(
      writeProjectFile(state, DEFS, "0.2.0", "2026-10-08T10:00:00.000Z"),
    );
    return typeof file === "object" && file !== null && "checks" in file
      ? file.checks
      : null;
  }

  const cases = DEFS.flatMap((def) =>
    [true, false].flatMap((passedOn) =>
      [LOW_QUAL_NEI, PANEL, ALL_VCF].map(
        (source) =>
          [def.id, passedOn ? "on" : "off", source.name, def, source] as const,
      ),
    ),
  );

  test.each(cases)(
    "%s with the FILTER filter on %s and %s: the settings are those saved, and a save carries the check",
    (_id, passedOn, _name, def, source) => {
      const { given, check } = givenAgain(
        def,
        settingsWith(passedOn === "on"),
        source,
      );
      expect(settingsAsSaved(def, given, check, source, null)).toBe(true);
      expect(checksSaved(given)).toEqual([
        {
          analysis: def.id,
          numbers: [1],
          keyVersion: def.keyVersion,
          popneiVersion: "0.2.2",
          appVersion: "0.2.0",
        },
      ]);
    },
  );

  test.each([
    [
      "low_qual.nei, whose variants record their FILTER",
      "other",
      LOW_QUAL_NEI,
      false,
    ],
    ["panel.nei, whose variants do not", "the same", PANEL, true],
    ["a VCF", "other", ALL_VCF, false],
  ])(
    "saved with the FILTER filter on and given again with it off, %s: the settings of the diversity are %s",
    (_name, _words, source, same) => {
      const def = defIn(DEFS, "diversity");
      const { given, check } = givenAgain(def, settingsWith(true), source);
      const off = turnOffVariantFilter(given, "passed");
      expect(settingsAsSaved(def, off, check, source, null)).toBe(same);
    },
  );

  /** The project of `given` before its variants file is read again: none
      given, or given and its read pending. */
  function beforeTheRead(given: Project, variants: "none" | "pending") {
    return deepFreeze<Project>({
      ...given,
      variants:
        variants === "none"
          ? null
          : { ...LOW_QUAL_NEI, read: { kind: "pending" } },
    });
  }

  const beforeRead = [true, false].flatMap((savedOn) =>
    (["none", "pending"] as const).map(
      (variants) => [savedOn ? "on" : "off", variants, savedOn] as const,
    ),
  );

  test.each(beforeRead)(
    "low_qual.nei saved with the FILTER filter %s, saved again with the variants file %s and nothing changed: the check is carried",
    (_on, variants, savedOn) => {
      const def = defIn(DEFS, "diversity");
      const { given } = givenAgain(def, settingsWith(savedOn), LOW_QUAL_NEI);
      expect(checksSaved(beforeTheRead(given, variants))).toEqual([
        {
          analysis: def.id,
          numbers: [1],
          keyVersion: def.keyVersion,
          popneiVersion: "0.2.2",
          appVersion: "0.2.0",
        },
      ]);
    },
  );

  // The file read again may record the FILTER of its variants, which the
  // reference's read, by its format, says it does not; so a save before
  // the read cannot tell whether turning the filter on or off changed the
  // numbers, and carries none.
  test.each(beforeRead)(
    "low_qual.nei saved with the FILTER filter %s, turned the other way and saved again with the variants file %s: no check is carried",
    (_on, variants, savedOn) => {
      const def = defIn(DEFS, "diversity");
      const { given } = givenAgain(def, settingsWith(savedOn), LOW_QUAL_NEI);
      const before = beforeTheRead(given, variants);
      const turned = savedOn
        ? turnOffVariantFilter(before, "passed")
        : setVariantFilter(before, { kind: "passed" });
      expect(checksSaved(turned)).toEqual([]);
    },
  );
});

/** The definition of `id` among `defs`. */
function defIn<T extends { readonly id: string }>(
  defs: readonly T[],
  id: string,
): T {
  const def = defs.find((d) => d.id === id);
  if (def === undefined) {
    throw new Error(`no definition ${id}`);
  }
  return def;
}

/** The project of `v1-passed.popnei.json` once opened: panel.vcf.gz of
    200 individuals and 1,200 variants, read with every variant at ploidy
    2, as popgen2.html opens a VCF but for its ploidy; the filter of the
    FILTER column and the missing data filter at 0.1 on, the MAF filter at
    0.9 off; no individuals file and no check. */
function passedProject(): Project {
  return {
    app: "popgen",
    variants: null,
    filters: [
      { kind: "passed" },
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
    ],
    filtersOff: [{ kind: "maf", maxAllowedMaf: 0.9 }],
    individualFilters: [],
    individualFiltersOff: [],
    individuals: null,
    grouping: { kind: "populations", column: null },
    analyses: [],
    reference: {
      variants: {
        fileId: "e0e1e2e3e4e5e6e7e8e9eaebecedeeef",
        name: "panel.vcf.gz",
        size: 87304,
        format: "vcf",
        readOptions: { ploidy: 2, onlyPassed: false },
        read: {
          kind: "read",
          individuals: Array.from(
            { length: 200 },
            (_, i) => `s${String(i).padStart(3, "0")}`,
          ),
          ploidy: 2,
          numVars: 1200,
          keepsPassed: true,
        },
      },
      checks: [],
    },
  };
}

describe("SF4 D1 the project file of the filter of the FILTER column", () => {
  const FILE = "v1-passed.popnei.json";

  /** The fixture with its filter of the FILTER column turned off: kept in
      `filtersOff`, first there as in `filters`, and not in `filters`. */
  function passedOffJson(): Readonly<Record<string, unknown>> {
    return {
      ...fixtureJson(FILE),
      filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.1 }],
      filtersOff: [{ kind: "passed" }, { kind: "maf", maxAllowedMaf: 0.9 }],
    };
  }

  function passedOff(): string {
    return JSON.stringify(passedOffJson());
  }

  test(`${FILE} opens on the new page into its project`, () => {
    expect(
      readProjectFile(fixture(FILE), "popgen", POPGEN_DEFS, NEW_PAGE),
    ).toEqual({
      ok: true,
      value: opened(passedProject()),
    });
  });

  test(`${FILE} is written back byte for byte from its project`, () => {
    const state = stateOf(
      opened(passedProject()),
      Object.fromEntries(
        POPGEN_DEFS.map((def) => [
          def.id,
          { kind: "locked", reason: "Load a variants file." },
        ]),
      ),
      "0.2.2",
    );
    expect(
      writeProjectFile(state, POPGEN_DEFS, "0.1.0", "2026-10-08T11:20:41.000Z"),
    ).toBe(fixture(FILE));
  });

  test(`${FILE} is refused on the old page as newPageFilter, with its text`, () => {
    const expected: ProjectFileError = { kind: "newPageFilter" };
    expect(
      readProjectFile(fixture(FILE), "popgen", POPGEN_DEFS, OLD_PAGE),
    ).toEqual({
      ok: false,
      error: expected,
    });
    expect(projectFileErrorText(expected, "pops.popnei.json")).toBe(
      "pops.popnei.json was saved by popgen2.html, the new page of population genetics. Its filter of the FILTER column works differently from the box on this page, so it was not opened. The file is unchanged: open it in popgen2.html.",
    );
  });

  test("the file with the filter of the FILTER column turned off is refused on the old page as newPageFilter, and opens on the new page with the filter kept off", () => {
    expect(
      readProjectFile(passedOff(), "popgen", POPGEN_DEFS, OLD_PAGE),
    ).toEqual({
      ok: false,
      error: { kind: "newPageFilter" },
    });
    const read = readProjectFile(passedOff(), "popgen", POPGEN_DEFS, NEW_PAGE);
    expect(read.ok && read.value.filters).toStrictEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
    ]);
    expect(read.ok && read.value.filtersOff).toStrictEqual([
      { kind: "passed" },
      { kind: "maf", maxAllowedMaf: 0.9 },
    ]);
  });

  test("the file with also a check of the wrong count is refused as header on the old page, not as newPageFilter", () => {
    const wrongCount = {
      analysis: "diversity",
      numbers: [1200, 0.3, 0.3],
      keyVersion: 3,
      popneiVersion: "0.2.2",
      appVersion: "0.1.0",
    };
    const expected = {
      ok: false,
      error: {
        kind: "header",
        field: "checks",
        expected:
          "4 numbers for the analysis diversity, as many as the rest of the file gives it, and not 3",
      },
    };
    for (const file of [fixtureJson(FILE), passedOffJson()]) {
      const damaged = JSON.stringify({ ...file, checks: [wrongCount] });
      expect(
        readProjectFile(damaged, "popgen", POPGEN_ANALYSES, OLD_PAGE),
      ).toEqual(expected);
    }
  });

  test("the file with its filter of the FILTER column removed by hand opens on the old page", () => {
    const removed = JSON.stringify({
      ...fixtureJson(FILE),
      filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.1 }],
    });
    expect(readProjectFile(removed, "popgen", POPGEN_DEFS, OLD_PAGE).ok).toBe(
      true,
    );
  });

  test("v1-every-filter.popnei.json, from before the filter of the FILTER column, opens on the old page as before", () => {
    expect(
      readProjectFile(
        fixture("v1-every-filter.popnei.json"),
        "popgen",
        POPGEN_DEFS,
        OLD_PAGE,
      ),
    ).toEqual({ ok: true, value: opened(everyFilterProject()) });
  });

  test("a file written opens on the old page as on the new one when its project holds no filter of the FILTER column, and is refused as newPageFilter when it holds one, on or off", () => {
    let held = 0;
    fc.assert(
      fc.property(savedState, (state) => {
        const p = state.project;
        const text = savedText(state);
        const holds = [...p.filters, ...p.filtersOff].some(
          (f) => f.kind === "passed",
        );
        if (holds) held += 1;
        expect(readProjectFile(text, p.app, TEST_DEFS, OLD_PAGE)).toEqual(
          holds
            ? { ok: false, error: { kind: "newPageFilter" } }
            : readProjectFile(text, p.app, TEST_DEFS, NEW_PAGE),
        );
      }),
    );
    expect(held).toBeGreaterThan(0);
  });
});
