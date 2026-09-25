import { readFileSync } from "node:fs";
import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import { keyFromWire, settingsFingerprint } from "./keys.ts";
import { emptyProject } from "./project.ts";
import type { Project, Reference, VariantSource } from "./project.ts";
import {
  askedFileText,
  checkVerdictText,
  compareIdentity,
  identityWarning,
  PROJECT_FILE_EXTENSION,
  projectFileErrorText,
  projectFileName,
  readProjectFile,
  writeProjectFile,
} from "./projectFile.ts";
import type { ProjectFileError } from "./projectFile.ts";
import type { AnalysisStatus, AppState } from "./store.ts";
import {
  SAMPLE_INDIVIDUALS_ID,
  SAMPLE_VARIANTS_ID,
  TEST_DEFS,
  deepFreeze,
  sampleProject,
  wholeProject,
} from "./testSupport.ts";
import type { TestDefResult } from "./testSupport.ts";

// What the tests of the project file share: the definitions of the
// application of population genetics, a state of the store built from a
// project, and the fixtures of version 1.

/** The definitions of the analyses of population genetics, diversity and
    pca, in their order. */
const POPGEN_DEFS = TEST_DEFS.filter((def) => def.app.includes("popgen"));

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
    popneiVersion,
    analyses: POPGEN_DEFS.map((def) => ({
      id: def.id,
      status: statuses[def.id] ?? { kind: "ready", key: A_KEY },
    })),
    runs: [],
    notice: null,
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
        settings: settingsFingerprint(
          DIVERSITY,
          settingsOf,
          PANEL_SAVED.readOptions,
          null,
        ),
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
        found: { encoding: "utf-8", separator: ",", decimal: "." },
      },
    });
  });

  test("an individuals file pending or failed is written as null, and the grouping by its column", () => {
    const sample = sampleProject();
    const base = sample.individuals;
    if (base === null) {
      throw new Error("the sample has an individuals file");
    }
    for (const read of [
      { kind: "pending" },
      { kind: "failed", error: { kind: "empty" } },
    ] as const) {
      const p = deepFreeze<Project>({
        ...sample,
        individuals: { ...base, read },
      });
      const json = writtenJson(stateOf(p));
      expect(json["individuals"]).toBeNull();
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
      "individualFilters",
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
      read: { kind: "read", individuals: ["i1", "i2"], ploidy: 2, numVars: 7 },
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
          settings: settingsFingerprint(
            DIVERSITY,
            p,
            savedVcf.readOptions,
            null,
          ),
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
        },
      },
      null,
    );
    const json = writtenJson(stateOf({ ...p, reference: referenceFor(p) }));
    expect(json["checks"]).toEqual([]);
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
  read: { kind: "read", individuals: ["i1", "i2"], ploidy: 2, numVars: 7 },
};

/** A project with a part of every kind, its fields in the order of their
    types, and a reference whose check of the pca is carried. */
function forwardProject(): Project {
  const p: Project = {
    app: "popgen",
    variants: PANEL_VCF,
    filters: [
      { kind: "ld", maxAllowedR2: 0.5, maxDist: 1000 },
      { kind: "maf", maxAllowedMaf: 0.95 },
    ],
    individualFilters: [
      { kind: "keep", individuals: ["i1", "i2"] },
      { kind: "obs_het", maxAllowedObsHet: 0.6 },
    ],
    individuals: {
      fileId: SAMPLE_INDIVIDUALS_ID,
      name: "pops.csv",
      csv: { encoding: "utf-8", separator: ";", decimal: "," },
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
        found: { encoding: "utf-8", separator: ";", decimal: "," },
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
          settings: settingsFingerprint(
            defOf("pca"),
            p,
            PANEL_VCF.readOptions,
            null,
          ),
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
        found: { decimal: ",", separator: ";", encoding: "utf-8" },
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
      csv: { decimal: ",", separator: ";", encoding: "utf-8" },
      name: "pops.csv",
      fileId: SAMPLE_INDIVIDUALS_ID,
    },
    individualFilters: [
      { individuals: ["i1", "i2"], kind: "keep" },
      { maxAllowedObsHet: 0.6, kind: "obs_het" },
    ],
    filters: [
      { maxDist: 1000, maxAllowedR2: 0.5, kind: "ld" },
      { maxAllowedMaf: 0.95, kind: "maf" },
    ],
    variants: {
      read: { numVars: 7, ploidy: 2, individuals: ["i1", "i2"], kind: "read" },
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
          settings: settingsFingerprint(
            defOf("pca"),
            p,
            PANEL_VCF.readOptions,
            null,
          ),
          appVersion: "0.1.0",
          popneiVersion: "0.1.0",
          keyVersion: 1,
          numbers: [0.5],
          analysis: "pca",
        },
      ],
      variants: {
        read: {
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
    individualFilters: p.individualFilters,
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
    individualFilters: [],
    individuals: {
      fileId: "ffeeddccbbaa99887766554433221100",
      name: "pops.csv",
      csv: { encoding: "auto", separator: "auto", decimal: "auto" },
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
        found: { encoding: "utf-8", separator: ",", decimal: "." },
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
          settings: "",
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
      { kind: "maf", maxAllowedMaf: 0.95 },
      { kind: "missing_data", maxAllowedMissingRate: 0.2 },
    ],
    individualFilters: [],
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
          settings: "",
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
        settings: settingsFingerprint(
          defOf(check.analysis),
          p,
          reference.variants.readOptions,
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
  for (const f of FIXTURES) {
    test(`${f.file} is written back byte for byte from its project`, () => {
      const project = opened(f.project());
      const state = stateOf(
        project,
        Object.fromEntries(
          POPGEN_DEFS.map((def) => [
            def.id,
            { kind: "locked", reason: "Load a variants file." },
          ]),
        ),
        f.popneiVersion,
      );
      expect(writeProjectFile(state, POPGEN_DEFS, f.appVersion, f.saved)).toBe(
        fixture(f.file),
      );
    });

    test(`${f.file} opens into its project`, () => {
      expect(readProjectFile(fixture(f.file), "popgen", POPGEN_DEFS)).toEqual({
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
    const opening = readProjectFile(text, "popgen", POPGEN_DEFS);
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
        checks: [checkWith({ settings: "0".repeat(64) })],
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

  test("an individuals file whose read is pending is refused as header", () => {
    expect(
      refusalOf((file) => ({
        ...file,
        individuals: {
          fileId: "ffeeddccbbaa99887766554433221100",
          name: "pops.csv",
          csv: { encoding: "auto", separator: "auto", decimal: "auto" },
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
      ),
    ).toEqual({ ok: true, value: emptyProject("popgen") });
  });

  test("each check of an opened file holds the fingerprint of its settings", () => {
    const opening = readProjectFile(
      fixture("v1-vcf-pending.popnei.json"),
      "popgen",
      POPGEN_DEFS,
    );
    if (!opening.ok) {
      throw new Error("the fixture opens");
    }
    const p = opening.value;
    expect(p.reference?.checks.map((check) => check.settings)).toEqual([
      settingsFingerprint(DIVERSITY, p, { ploidy: 4, onlyPassed: true }, null),
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
      "This project was made with panel_2026.nei, 342 individuals and 1,203,554 variants. Load it in the Variants step to run its analyses again.",
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
  fc.array(checkNumber, { maxLength: 7 }),
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
            variants: { ...reference.variants, fileId: drawn.variants.fileId },
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
                      settings: settingsFingerprint(
                        defOf(check.analysis),
                        p,
                        (p.variants ?? reference.variants).readOptions,
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
            : { kind: drawnOne, key: A_KEY }
          : canRun
            ? {
                kind: "done",
                key: A_KEY,
                result: { analysis: def.id, numbers: drawnOne },
                warnings: [],
                check: null,
              }
            : { kind: "ready", key: A_KEY };
      return { id: def.id, status };
    });
    const anyDone = views.some((view) => view.status.kind === "done");
    return deepFreeze<AppState<TestDefResult>>({
      project,
      undo: null,
      redo: null,
      popneiVersion:
        anyDone && popneiVersion === null ? "0.1.0" : popneiVersion,
      analyses: views,
      runs: [],
      notice: null,
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
  "individualFilters",
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
  "table",
  "columns",
  "rows",
  "one",
  "zero",
  "found",
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

describe("WS6 D4 the properties of the project file", () => {
  test("a file written opens into the project the table of what is written gives", () => {
    fc.assert(
      fc.property(savedState, (state) => {
        const p = state.project;
        const opening = readProjectFile(savedText(state), p.app, TEST_DEFS);
        if (!opening.ok) {
          throw new Error(JSON.stringify(opening.error));
        }
        const got = opening.value;
        expect(got.variants).toBeNull();
        expect(got.filters).toEqual(p.filters);
        expect(got.individualFilters).toEqual(p.individualFilters);
        expect(got.individuals).toEqual(
          p.individuals?.read.kind === "read" ? p.individuals : null,
        );
        expect(got.grouping).toEqual(p.grouping);
        expect(got.analyses).toEqual(p.analyses);
        const candidates = [p.variants, p.reference?.variants ?? null]
          .filter((v): v is VariantSource => v !== null)
          .map((v): VariantSource =>
            v.read.kind === "read" ? v : { ...v, read: { kind: "pending" } },
          );
        if (candidates.length === 0) {
          expect(got.reference).toBeNull();
        } else {
          expect(candidates).toContainEqual(got.reference?.variants);
        }
      }),
    );
  });

  test("written, opened, and written again with no result, a project gives the same text", () => {
    fc.assert(
      fc.property(savedState, (state) => {
        const text = savedText(state);
        const opening = readProjectFile(text, state.project.app, TEST_DEFS);
        if (!opening.ok) {
          throw new Error(JSON.stringify(opening.error));
        }
        const again = deepFreeze<AppState<TestDefResult>>({
          ...state,
          project: opening.value,
          analyses: TEST_DEFS.map((def) => ({
            id: def.id,
            status: { kind: "ready", key: A_KEY },
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
