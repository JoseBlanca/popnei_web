import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { keyFromWire, settingsFingerprint } from "./keys.ts";
import { emptyProject } from "./project.ts";
import type { Project, Reference, VariantSource } from "./project.ts";
import { projectFileName, writeProjectFile } from "./projectFile.ts";
import type { AnalysisStatus, AppState } from "./store.ts";
import {
  SAMPLE_INDIVIDUALS_ID,
  SAMPLE_VARIANTS_ID,
  TEST_DEFS,
  deepFreeze,
  sampleProject,
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
  }
});
