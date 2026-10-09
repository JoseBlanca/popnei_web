import fc from "fast-check";
import { describe, expect, test } from "vitest";
import type {
  DiversityJob,
  DiversityResult,
  FilterCountsJob,
  FilterCountsResult,
  HeatmapOrder,
  IndividualChecksJob,
  IndividualChecksResult,
  LdDecayJob,
  LdDecayResult,
  PassStats,
  PcaJob,
  PcaResult,
  PopDistsJob,
  PopDistsResult,
  VariantChecksJob,
  VariantChecksResult,
  VariantDistrib,
  VariantsSummaryJob,
  VariantsSummaryResult,
  WriteJob,
} from "./protocol.ts";
import {
  describeMessageError,
  messageOf,
  PROTOCOL_VERSION,
  parseFromFilesRunner,
  parseFromRunner,
  parseToFilesRunner,
  parseToRunner,
} from "./messages.ts";

const NEI_FILE = new File(["NEI"], "panel.nei");
const VCF_FILE = new File(["##fileformat=VCFv4.2\n"], "panel.vcf.gz");
const CSV_FILE = new File(["id,pop\ni1,p0\n"], "individuals.csv");

const JOB: DiversityJob = {
  analysis: "diversity",
  fileId: "load-a",
  filters: [
    { kind: "missing_data", maxAllowedMissingRate: 0.05 },
    { kind: "maf", maxAllowedMaf: 0.95 },
    { kind: "obs_het", maxAllowedObsHet: 0.5 },
    { kind: "ld", maxAllowedR2: 0.2, maxDist: 100000 },
  ],
  individuals: null,
  pops: [
    ["p0", ["i1", "i2"]],
    ["p1", ["i4"]],
  ],
  minNumIndividuals: 20,
  polyThreshold: 0.95,
  numCalledAlleles: 40,
  popDiversityPops: [],
};

const RESULT: DiversityResult = {
  analysis: "diversity",
  pops: ["p0", "p1"],
  numIndividuals: Uint32Array.from([2, 1]),
  unbiasedExpHet: Float64Array.from([0.31, Number.NaN]),
  obsHet: Float64Array.from([0.28, Number.NaN]),
  polyRatio: Float64Array.from([0.9, Number.NaN]),
  numVarsWithValue: Uint32Array.from([1152, 0]),
  fis: Float64Array.from([NaN, NaN]),
  numAllelesMean: Float64Array.from([NaN, NaN]),
  numAllelesInDraw: Float64Array.from([NaN, NaN]),
  privateAllelesTotal: Float64Array.from([NaN, NaN]),
  privateAllelesMean: Float64Array.from([NaN, NaN]),
  privateAllelesInDraw: Float64Array.from([NaN, NaN]),
  numVarsInDraw: Uint32Array.from([0, 0]),
  numVarsEveryPop: null,
  numVarsEveryPopInDraw: null,
  numCalledAlleles: 40,
  foldedSfs: [null, null],
  passStats: {
    numVars: 1152,
    filtering: { missing_data: { varsProcessed: 1200, varsKept: 1152 } },
  },
};

const OPEN_VCF = {
  kind: "open",
  id: 1,
  fileId: "load-a",
  file: VCF_FILE,
  format: "vcf",
  readOptions: { ploidy: 2, onlyPassed: false },
};
const OPEN_NEI = {
  kind: "open",
  id: 1,
  fileId: "load-a",
  file: NEI_FILE,
  format: "nei",
  readOptions: null,
};
const RUN = { kind: "run", id: 2, key: "k1", job: JOB };
const PROGRESS = {
  kind: "progress",
  id: 3,
  bytesRead: 259376,
  numBytes: 261490,
  pass: 1,
  numPasses: 1,
};
const READ_INDIVIDUALS = {
  kind: "readIndividuals",
  id: 4,
  file: CSV_FILE,
  csv: { encoding: "auto", separator: ",", decimal: "auto" },
};
const INDIVIDUALS_READ = {
  kind: "individuals",
  id: 4,
  read: {
    kind: "read",
    table: {
      columns: ["id", "pop", "height", "sick"],
      rows: [
        ["i1", "p0", "1.5", "yes"],
        ["i2", null, "2", "no"],
      ],
    },
    columns: [
      { kind: "identifier" },
      { kind: "categorical" },
      { kind: "continuous" },
      { kind: "binary", one: "yes", zero: "no" },
    ],
    found: {
      encoding: "utf-8",
      separator: ",",
      decimal: ".",
      undecodedLine: null,
    },
  },
};

describe("WS2 D1 the messages accepted", () => {
  test.each([
    ["the open of a VCF", OPEN_VCF],
    [
      "the open of a VCF whose ploidy popnei reads from the file",
      { ...OPEN_VCF, readOptions: { ploidy: null, onlyPassed: true } },
    ],
    ["the open of a .nei file", OPEN_NEI],
    ["a diversity run with a filter of each kind", RUN],
  ])("parseToRunner accepts %s", (_name, message) => {
    expect(parseToRunner(message)).toEqual({ ok: true, value: message });
  });

  test("parseToRunner keeps the File it was given", () => {
    const checked = parseToRunner(OPEN_NEI);
    expect(
      checked.ok && checked.value.kind === "open" && checked.value.file,
    ).toBe(NEI_FILE);
  });

  test.each([
    [
      "the ready of the calculation worker",
      { kind: "ready", protocol: 15, popneiVersion: "0.1.0" },
    ],
    [
      "opened",
      {
        kind: "opened",
        id: 1,
        individuals: ["i1", "i2"],
        ploidy: 2,
        keepsPassed: false,
      },
    ],
    ["the progress of a run", PROGRESS],
    [
      "the result of a diversity run",
      { kind: "result", id: 2, key: "k1", result: RESULT },
    ],
    [
      "refused",
      { kind: "refused", id: 2, message: "the pass gave no variant" },
    ],
    [
      "reopenFailed",
      {
        kind: "reopenFailed",
        id: 2,
        name: "panel.nei",
        message: "the range was short",
      },
    ],
    ["crashed", { kind: "crashed", message: "unreachable" }],
    [
      "badRequest",
      { kind: "badRequest", message: "The message run lacks the fields id." },
    ],
  ])("parseFromRunner accepts %s", (_name, message) => {
    expect(parseFromRunner(message)).toEqual({ ok: true, value: message });
  });

  test("parseToFilesRunner accepts readIndividuals", () => {
    expect(parseToFilesRunner(READ_INDIVIDUALS)).toEqual({
      ok: true,
      value: READ_INDIVIDUALS,
    });
  });

  test.each([
    ["the ready of the light worker", { kind: "ready", protocol: 15 }],
    ["an individuals file read", INDIVIDUALS_READ],
    [
      "an individuals file refused",
      {
        kind: "individuals",
        id: 4,
        read: { kind: "failed", error: { kind: "empty" }, format: "text" },
      },
    ],
    [
      "an individuals file refused with facts",
      {
        kind: "individuals",
        id: 4,
        read: {
          kind: "failed",
          format: "text",
          error: {
            kind: "raggedRow",
            line: 3,
            expected: 4,
            found: 3,
            separator: ";",
          },
        },
      },
    ],
    ["crashed", { kind: "crashed", message: "out of memory" }],
  ])("parseFromFilesRunner accepts %s", (_name, message) => {
    expect(parseFromFilesRunner(message)).toEqual({ ok: true, value: message });
  });

  test("parseFromRunner accepts the structured clone of any message of the calculation worker", () => {
    fc.assert(
      fc.property(fromRunnerMessage, (message) => {
        expect(parseFromRunner(structuredClone(message))).toEqual({
          ok: true,
          value: message,
        });
      }),
    );
  });

  test("parseFromFilesRunner accepts the structured clone of any message of the light worker", () => {
    fc.assert(
      fc.property(fromFilesRunnerMessage, (message) => {
        expect(parseFromFilesRunner(structuredClone(message))).toEqual({
          ok: true,
          value: message,
        });
      }),
    );
  });
});

describe("WS2 D2 the messages refused", () => {
  test("a message that is not an object", () => {
    expect(parseFromRunner("ready")).toEqual({
      ok: false,
      error: { kind: "notObject", found: "string" },
    });
  });

  test("a message with no kind", () => {
    expect(parseToRunner({ id: 1 })).toEqual({
      ok: false,
      error: { kind: "noKind" },
    });
  });

  test("a message whose kind is not text", () => {
    expect(parseToFilesRunner({ kind: 3 })).toEqual({
      ok: false,
      error: { kind: "kindNotText", found: "number" },
    });
  });

  test("a message of an unknown kind, the other side's", () => {
    expect(parseToRunner({ kind: "readIndividuals" })).toEqual({
      ok: false,
      error: {
        kind: "unknownKind",
        found: "readIndividuals",
        expected: ["open", "run", "write"],
      },
    });
  });

  test("an id of 1.5", () => {
    expect(parseToRunner({ ...RUN, id: 1.5 })).toEqual({
      ok: false,
      error: {
        kind: "wrongType",
        messageKind: "run",
        path: "id",
        expected: "a whole number",
        found: "number",
      },
    });
  });

  test("a field missing at the top", () => {
    const lacking = Object.fromEntries(
      Object.entries(RUN).filter(([name]) => name !== "key"),
    );
    expect(parseToRunner(lacking)).toEqual({
      ok: false,
      error: {
        kind: "missingFields",
        messageKind: "run",
        path: "",
        fields: ["key"],
      },
    });
  });

  test("a field more at the top", () => {
    expect(parseToRunner({ ...RUN, numVars: 1200 })).toEqual({
      ok: false,
      error: {
        kind: "extraFields",
        messageKind: "run",
        path: "",
        fields: ["numVars"],
      },
    });
  });

  test("a field missing in job.filters.0", () => {
    const job = { ...JOB, filters: [{ kind: "missing_data" }] };
    expect(parseToRunner({ ...RUN, job })).toEqual({
      ok: false,
      error: {
        kind: "missingFields",
        messageKind: "run",
        path: "job.filters.0",
        fields: ["maxAllowedMissingRate"],
      },
    });
  });

  test("a field more in job.filters.0", () => {
    const job = {
      ...JOB,
      filters: [
        { kind: "maf", maxAllowedMaf: 0.95, maxAllowedMissingRate: 0.1 },
      ],
    };
    expect(parseToRunner({ ...RUN, job })).toEqual({
      ok: false,
      error: {
        kind: "extraFields",
        messageKind: "run",
        path: "job.filters.0",
        fields: ["maxAllowedMissingRate"],
      },
    });
  });

  test("an id on the prototype is missing", () => {
    const inherited: unknown = Object.assign(Object.create({ id: 1 }), {
      kind: "run",
      key: "k1",
      job: JOB,
    });
    expect(parseToRunner(inherited)).toEqual({
      ok: false,
      error: {
        kind: "missingFields",
        messageKind: "run",
        path: "",
        fields: ["id"],
      },
    });
  });

  test("an array of numbers where a Float64Array is expected", () => {
    const result = { ...RESULT, obsHet: [0.28, 0.3] };
    expect(
      parseFromRunner({ kind: "result", id: 2, key: "k1", result }),
    ).toEqual({
      ok: false,
      error: {
        kind: "wrongType",
        messageKind: "result",
        path: "result.obsHet",
        expected: "a Float64Array",
        found: "array",
      },
    });
  });

  test("a .nei file with read options", () => {
    expect(
      parseToRunner({
        ...OPEN_NEI,
        readOptions: { ploidy: 2, onlyPassed: false },
      }),
    ).toMatchObject({
      ok: false,
      error: {
        kind: "wrongType",
        messageKind: "open",
        path: "readOptions",
        found: "object",
      },
    });
  });

  test("a VCF whose ploidy is a text", () => {
    expect(
      parseToRunner({
        ...OPEN_VCF,
        readOptions: { ploidy: "2", onlyPassed: false },
      }),
    ).toMatchObject({
      ok: false,
      error: {
        kind: "wrongType",
        messageKind: "open",
        path: "readOptions.ploidy",
        found: "string",
      },
    });
  });

  test("a VCF without read options", () => {
    expect(parseToRunner({ ...OPEN_VCF, readOptions: null })).toMatchObject({
      ok: false,
      error: {
        kind: "wrongType",
        messageKind: "open",
        path: "readOptions",
        found: "null",
      },
    });
  });

  test("a progress with the fields of the draft before and popnei's too", () => {
    expect(parseFromRunner({ ...PROGRESS, done: 1, total: 2 })).toEqual({
      ok: false,
      error: {
        kind: "extraFields",
        messageKind: "progress",
        path: "",
        fields: ["done", "total"],
      },
    });
  });

  test("a progress with the fields of the draft before alone", () => {
    expect(
      parseFromRunner({ kind: "progress", id: 3, done: 1, total: 2 }),
    ).toEqual({
      ok: false,
      error: {
        kind: "missingFields",
        messageKind: "progress",
        path: "",
        fields: ["bytesRead", "numBytes", "pass", "numPasses"],
      },
    });
  });

  test("a row of the table one cell short", () => {
    const read = {
      ...INDIVIDUALS_READ.read,
      table: {
        ...INDIVIDUALS_READ.read.table,
        rows: [
          ["i1", "p0", "1.5", "yes"],
          ["i2", null, "2"],
        ],
      },
    };
    expect(parseFromFilesRunner({ ...INDIVIDUALS_READ, read })).toEqual({
      ok: false,
      error: {
        kind: "wrongLength",
        messageKind: "individuals",
        path: "read.table.rows.1",
        expected: 4,
        found: 3,
      },
    });
  });

  test("three types for a table of four columns", () => {
    const read = {
      ...INDIVIDUALS_READ.read,
      columns: INDIVIDUALS_READ.read.columns.slice(0, 3),
    };
    expect(parseFromFilesRunner({ ...INDIVIDUALS_READ, read })).toEqual({
      ok: false,
      error: {
        kind: "wrongLength",
        messageKind: "individuals",
        path: "read.columns",
        expected: 4,
        found: 3,
      },
    });
  });

  test("a refusal of the reader of a kind its spec does not give", () => {
    const read = {
      kind: "failed",
      error: { kind: "tooManyColumns" },
      format: "text",
    };
    expect(
      parseFromFilesRunner({ kind: "individuals", id: 4, read }),
    ).toMatchObject({
      ok: false,
      error: {
        kind: "unknownValue",
        messageKind: "individuals",
        path: "read.error.kind",
        found: "tooManyColumns",
      },
    });
  });

  test("a ready of the light worker with a popnei version", () => {
    expect(
      parseFromFilesRunner({
        kind: "ready",
        protocol: 15,
        popneiVersion: "0.1.0",
      }),
    ).toEqual({
      ok: false,
      error: {
        kind: "extraFields",
        messageKind: "ready",
        path: "",
        fields: ["popneiVersion"],
      },
    });
  });

  test("a ready of the calculation worker without a popnei version", () => {
    expect(parseFromRunner({ kind: "ready", protocol: 15 })).toEqual({
      ok: false,
      error: {
        kind: "missingFields",
        messageKind: "ready",
        path: "",
        fields: ["popneiVersion"],
      },
    });
  });

  test("a population that is not a pair", () => {
    const job = { ...JOB, pops: [["p0", ["i1"], "p1"]] };
    expect(parseToRunner({ ...RUN, job })).toEqual({
      ok: false,
      error: {
        kind: "wrongLength",
        messageKind: "run",
        path: "job.pops.0",
        expected: 2,
        found: 3,
      },
    });
  });

  test("a result with fewer values than populations", () => {
    const result = { ...RESULT, polyRatio: Float64Array.from([0.9]) };
    expect(
      parseFromRunner({ kind: "result", id: 2, key: "k1", result }),
    ).toEqual({
      ok: false,
      error: {
        kind: "wrongLength",
        messageKind: "result",
        path: "result.polyRatio",
        expected: 2,
        found: 1,
      },
    });
  });

  test("a readIndividuals whose file is its name", () => {
    expect(
      parseToFilesRunner({ ...READ_INDIVIDUALS, file: "individuals.csv" }),
    ).toEqual({
      ok: false,
      error: {
        kind: "wrongType",
        messageKind: "readIndividuals",
        path: "file",
        expected: "a File",
        found: "string",
      },
    });
  });
});

describe("WS2 D2 the messages refused: the version", () => {
  test("a ready of protocol 16 with no other field, from the calculation worker", () => {
    expect(parseFromRunner({ kind: "ready", protocol: 16 })).toEqual({
      ok: false,
      error: { kind: "otherProtocol", found: 16 },
    });
  });

  test("a ready of protocol 16 with no other field, from the light worker", () => {
    expect(parseFromFilesRunner({ kind: "ready", protocol: 16 })).toEqual({
      ok: false,
      error: { kind: "otherProtocol", found: 16 },
    });
  });

  test.each([
    ["calculation", parseFromRunner],
    ["light", parseFromFilesRunner],
  ])(
    "a ready of protocol 16 with fields of its own, from the %s worker, is otherProtocol and not a refusal of its fields",
    (_name, parse) => {
      expect(
        parse({
          kind: "ready",
          protocol: 16,
          popneiVersion: 3,
          features: ["pca"],
        }),
      ).toEqual({
        ok: false,
        error: { kind: "otherProtocol", found: 16 },
      });
    },
  );

  test.each([
    ["calculation", parseFromRunner],
    ["light", parseFromFilesRunner],
  ])('a ready of protocol "1", from the %s worker', (_name, parse) => {
    expect(parse({ kind: "ready", protocol: "1" })).toEqual({
      ok: false,
      error: {
        kind: "wrongType",
        messageKind: "ready",
        path: "protocol",
        expected: "a number",
        found: "string",
      },
    });
  });
});

describe("WS2 D2 the messages refused: describeMessageError", () => {
  test("names the path and the kind of the message", () => {
    const text = describeMessageError({
      kind: "wrongType",
      messageKind: "run",
      path: "job.filters.0.maxAllowedMissingRate",
      expected: "a number",
      found: "string",
    });
    expect(text).toContain("job.filters.0.maxAllowedMissingRate");
    expect(text).toContain("run");
  });
});

// The messages of stage 3 (docs/specs/worker/messages.md, "How it is
// verified").

const PASS_AT_0_05: PassStats = {
  numVars: 1152,
  filtering: { missing_data: { varsProcessed: 1200, varsKept: 1152 } },
};
const FILTERS_AT_0_05 = [
  { kind: "missing_data", maxAllowedMissingRate: 0.05 },
] as const;
const INDIVIDUAL_CHECKS_JOB: IndividualChecksJob = {
  analysis: "individualChecks",
  fileId: "load-a",
  filters: [],
};
const VARIANT_CHECKS_JOB: VariantChecksJob = {
  analysis: "variantChecks",
  fileId: "load-a",
  filters: [],
  individuals: null,
  minNumIndividuals: 0,
  numBins: 40,
  range: [0, 1],
};
const FILTER_COUNTS_JOB: FilterCountsJob = {
  analysis: "filterCounts",
  fileId: "load-a",
  filters: [
    { kind: "missing_data", maxAllowedMissingRate: 0.05 },
    { kind: "obs_het", maxAllowedObsHet: 0.9 },
    { kind: "maf", maxAllowedMaf: 0.95 },
  ],
  individuals: null,
};
const WRITE_JOB: WriteJob = {
  format: "nei",
  fileId: "load-a",
  filters: FILTERS_AT_0_05,
  individuals: ["i1", "i2", "i4"],
};

/** `length` numbers from 0.005 up, by 0.001. */
function rates(length: number): Float64Array {
  return Float64Array.from({ length }, (_, i) => 0.005 + i / 1000);
}

const INDIVIDUAL_CHECKS_RESULT: IndividualChecksResult = {
  analysis: "individualChecks",
  individuals: Array.from({ length: 200 }, (_, i) => `s${String(i)}`),
  missingGtRate: rates(200),
  obsHetRate: Float64Array.from({ length: 200 }, (_, i) =>
    i === 7 ? Number.NaN : 0.35,
  ),
  passStats: PASS_AT_0_05,
};

/** A histogram of 40 bins, whose counts add up to `numVars`. */
function distrib(mean: number, numVars: number): VariantDistrib {
  const counts = new Uint32Array(40);
  counts[39] = numVars;
  return { mean, counts };
}

const VARIANT_CHECKS_RESULT: VariantChecksResult = {
  analysis: "variantChecks",
  binEdges: Float64Array.from({ length: 41 }, (_, i) => i / 40),
  missingRate: distrib(0.03, 1200),
  maf: distrib(0.7, 1200),
  obsHet: distrib(0.35, 1200),
  unbiasedExpHet: distrib(0.35, 1200),
  passStats: { numVars: 1200, filtering: {} },
};
const FILTER_COUNTS_RESULT: FilterCountsResult = {
  analysis: "filterCounts",
  passStats: {
    numVars: 1128,
    filtering: {
      missing_data: { varsProcessed: 1200, varsKept: 1152 },
      obs_het: { varsProcessed: 1152, varsKept: 1152 },
      maf: { varsProcessed: 1152, varsKept: 1128 },
    },
  },
};
const WRITTEN = {
  kind: "written",
  id: 5,
  key: "k2",
  result: {
    format: "nei",
    file: new Blob([new Uint8Array(3594)]),
    numBytes: 3594,
    passStats: { ...PASS_AT_0_05, numVars: 0 },
  },
};

/** A `result` message of the id 2 under the key k1. */
function resultMessage(result: unknown): unknown {
  return { kind: "result", id: 2, key: "k1", result };
}

describe("VS1 D1 the messages of stage 3 accepted", () => {
  test.each([
    ["the diversity, over every individual", JOB],
    ["the statistics of each individual", INDIVIDUAL_CHECKS_JOB],
    ["the histograms of the variants", VARIANT_CHECKS_JOB],
    ["the counts of the filters", FILTER_COUNTS_JOB],
  ])("parseToRunner accepts a run of %s", (_name, job) => {
    const run = { kind: "run", id: 2, key: "k1", job };
    expect(parseToRunner(run)).toEqual({ ok: true, value: run });
  });

  test("parseToRunner accepts a run of the diversity with a list of individuals", () => {
    const run = { ...RUN, job: { ...JOB, individuals: ["i1", "i2", "i4"] } };
    expect(parseToRunner(run)).toEqual({ ok: true, value: run });
  });

  test.each([
    ["the diversity", RESULT],
    ["the statistics of each individual", INDIVIDUAL_CHECKS_RESULT],
    ["the histograms of the variants", VARIANT_CHECKS_RESULT],
    ["the counts of the filters", FILTER_COUNTS_RESULT],
  ])("parseFromRunner accepts a result of %s", (_name, result) => {
    const message = resultMessage(result);
    expect(parseFromRunner(message)).toEqual({ ok: true, value: message });
  });

  test("parseToRunner accepts a write", () => {
    const write = { kind: "write", id: 5, key: "k2", job: WRITE_JOB };
    expect(parseToRunner(write)).toEqual({ ok: true, value: write });
  });

  test("parseFromRunner accepts a written of no variant, and keeps its Blob", () => {
    const checked = parseFromRunner(WRITTEN);
    expect(checked).toEqual({ ok: true, value: WRITTEN });
    expect(
      checked.ok &&
        checked.value.kind === "written" &&
        checked.value.result.file,
    ).toBe(WRITTEN.result.file);
  });

  test("parseFromRunner accepts the progress of a write", () => {
    const progress = { ...PROGRESS, id: 5 };
    expect(parseFromRunner(progress)).toEqual({ ok: true, value: progress });
  });

  test("parseToRunner accepts a run and a write whose list of individuals is empty, which the runner refuses", () => {
    const run = { ...RUN, job: { ...JOB, individuals: [] } };
    const write = {
      kind: "write",
      id: 5,
      key: "k2",
      job: { ...WRITE_JOB, individuals: [] },
    };
    expect(parseToRunner(run)).toEqual({ ok: true, value: run });
    expect(parseToRunner(write)).toEqual({ ok: true, value: write });
  });

  test("parseFromRunner accepts the structured clone of any result and any written of stage 3", () => {
    const stage3 = fc.oneof(
      fc.record({
        kind: fc.constant("result" as const),
        id: whole,
        key: text,
        result: jobResult,
      }),
      fc.record({
        kind: fc.constant("written" as const),
        id: whole,
        key: text,
        result: written,
      }),
    );
    fc.assert(
      fc.property(stage3, (message) => {
        expect(parseFromRunner(structuredClone(message))).toEqual({
          ok: true,
          value: message,
        });
      }),
    );
  });

  test("parseToRunner accepts any run and any write of stage 3", () => {
    fc.assert(
      fc.property(toRunnerMessage, (message) => {
        expect(parseToRunner(message)).toEqual({ ok: true, value: message });
      }),
    );
  });
});

describe("VS1 D2 the messages of stage 3 refused", () => {
  test("a diversity job with the field individualFilters of stage 2 beside individuals", () => {
    const job = { ...JOB, individualFilters: [] };
    expect(parseToRunner({ ...RUN, job })).toEqual({
      ok: false,
      error: {
        kind: "extraFields",
        messageKind: "run",
        path: "job",
        fields: ["individualFilters"],
      },
    });
  });

  test("a diversity job without individuals", () => {
    const job = Object.fromEntries(
      Object.entries(JOB).filter(([name]) => name !== "individuals"),
    );
    expect(parseToRunner({ ...RUN, job })).toEqual({
      ok: false,
      error: {
        kind: "missingFields",
        messageKind: "run",
        path: "job",
        fields: ["individuals"],
      },
    });
  });

  test("a job whose individuals is neither null nor a list of texts", () => {
    const job = { ...JOB, individuals: "i1" };
    expect(parseToRunner({ ...RUN, job })).toMatchObject({
      ok: false,
      error: { kind: "wrongType", path: "job.individuals", found: "string" },
    });
  });

  test("a result without passStats", () => {
    const result = Object.fromEntries(
      Object.entries(RESULT).filter(([name]) => name !== "passStats"),
    );
    expect(parseFromRunner(resultMessage(result))).toEqual({
      ok: false,
      error: {
        kind: "missingFields",
        messageKind: "result",
        path: "result",
        fields: ["passStats"],
      },
    });
  });

  test("a result with numVars at its top, as stage 2 had it", () => {
    const result = { ...RESULT, numVars: 1152 };
    expect(parseFromRunner(resultMessage(result))).toEqual({
      ok: false,
      error: {
        kind: "extraFields",
        messageKind: "result",
        path: "result",
        fields: ["numVars"],
      },
    });
  });

  test("a passStats.filtering with a field regions, before popnei has that filter", () => {
    const result = {
      ...FILTER_COUNTS_RESULT,
      passStats: {
        numVars: 1128,
        filtering: {
          regions: { varsProcessed: 1300, varsKept: 1200 },
          ...FILTER_COUNTS_RESULT.passStats.filtering,
        },
      },
    };
    expect(parseFromRunner(resultMessage(result))).toEqual({
      ok: false,
      error: {
        kind: "extraFields",
        messageKind: "result",
        path: "result.passStats.filtering",
        fields: ["regions"],
      },
    });
  });

  test("an obsHetRate of 199 numbers beside a missingGtRate of 200", () => {
    const result = { ...INDIVIDUAL_CHECKS_RESULT, obsHetRate: rates(199) };
    expect(parseFromRunner(resultMessage(result))).toEqual({
      ok: false,
      error: {
        kind: "wrongLength",
        messageKind: "result",
        path: "result.obsHetRate",
        expected: 200,
        found: 199,
      },
    });
  });

  test("an individuals of 199 beside the two arrays of 200", () => {
    const result = {
      ...INDIVIDUAL_CHECKS_RESULT,
      individuals: INDIVIDUAL_CHECKS_RESULT.individuals.slice(0, 199),
    };
    expect(parseFromRunner(resultMessage(result))).toEqual({
      ok: false,
      error: {
        kind: "wrongLength",
        messageKind: "result",
        path: "result.missingGtRate",
        expected: 199,
        found: 200,
      },
    });
  });

  test("binEdges of 41 numbers and the counts of the MAF of 41", () => {
    const result = {
      ...VARIANT_CHECKS_RESULT,
      maf: { mean: 0.7, counts: new Uint32Array(41) },
    };
    expect(parseFromRunner(resultMessage(result))).toEqual({
      ok: false,
      error: {
        kind: "wrongLength",
        messageKind: "result",
        path: "result.maf.counts",
        expected: 40,
        found: 41,
      },
    });
  });

  test("the counts of the missing rate of 39 with binEdges of 41 numbers", () => {
    const result = {
      ...VARIANT_CHECKS_RESULT,
      missingRate: { mean: 0.03, counts: new Uint32Array(39) },
    };
    expect(parseFromRunner(resultMessage(result))).toEqual({
      ok: false,
      error: {
        kind: "wrongLength",
        messageKind: "result",
        path: "result.missingRate.counts",
        expected: 40,
        found: 39,
      },
    });
  });

  test("a result of the histograms of the variants without the missing rate, that of protocol 6", () => {
    const result = Object.fromEntries(
      Object.entries(VARIANT_CHECKS_RESULT).filter(
        ([name]) => name !== "missingRate",
      ),
    );
    expect(parseFromRunner(resultMessage(result))).toEqual({
      ok: false,
      error: {
        kind: "missingFields",
        messageKind: "result",
        path: "result",
        fields: ["missingRate"],
      },
    });
  });

  test("binEdges as a list of numbers where a Float64Array is expected", () => {
    const result = { ...VARIANT_CHECKS_RESULT, binEdges: [0, 0.5, 1] };
    expect(parseFromRunner(resultMessage(result))).toMatchObject({
      ok: false,
      error: {
        kind: "wrongType",
        path: "result.binEdges",
        expected: "a Float64Array",
        found: "array",
      },
    });
  });

  test("a result of the counts of the filters with a field more", () => {
    const result = { ...FILTER_COUNTS_RESULT, numVarsRead: 1200 };
    expect(parseFromRunner(resultMessage(result))).toEqual({
      ok: false,
      error: {
        kind: "extraFields",
        messageKind: "result",
        path: "result",
        fields: ["numVarsRead"],
      },
    });
  });

  test("a variantChecks job whose range is not a pair", () => {
    const job = { ...VARIANT_CHECKS_JOB, range: [0, 0.5, 1] };
    expect(parseToRunner({ ...RUN, job })).toEqual({
      ok: false,
      error: {
        kind: "wrongLength",
        messageKind: "run",
        path: "job.range",
        expected: 2,
        found: 3,
      },
    });
  });

  test("a variantChecks job with a filter", () => {
    const job = { ...VARIANT_CHECKS_JOB, filters: FILTERS_AT_0_05 };
    expect(parseToRunner({ ...RUN, job })).toEqual({
      ok: false,
      error: {
        kind: "wrongLength",
        messageKind: "run",
        path: "job.filters",
        expected: 0,
        found: 1,
      },
    });
  });

  test("a written whose numBytes is not its file's size", () => {
    const message = {
      ...WRITTEN,
      result: { ...WRITTEN.result, numBytes: 3593 },
    };
    expect(parseFromRunner(message)).toEqual({
      ok: false,
      error: {
        kind: "wrongSize",
        messageKind: "written",
        path: "result.numBytes",
        expected: 3594,
        found: 3593,
      },
    });
  });

  test("a wrongSize is described as a size in bytes, not as a list", () => {
    expect(
      describeMessageError({
        kind: "wrongSize",
        messageKind: "written",
        path: "result.numBytes",
        expected: 3594,
        found: 3593,
      }),
    ).toBe(
      "The field result.numBytes of the message written is 3593, not the size of its file, 3,594 bytes.",
    );
  });

  test("a written whose file is an ArrayBuffer", () => {
    const message = {
      ...WRITTEN,
      result: { ...WRITTEN.result, file: new ArrayBuffer(3594) },
    };
    expect(parseFromRunner(message)).toEqual({
      ok: false,
      error: {
        kind: "wrongType",
        messageKind: "written",
        path: "result.file",
        expected: "a Blob",
        found: "object",
      },
    });
  });
});

describe("VS1 D2 the messages of stage 3 refused: the version", () => {
  test.each([
    ["calculation", parseFromRunner],
    ["light", parseFromFilesRunner],
  ])(
    "a ready of protocol 1, the walking skeleton's, with no other field, from the %s worker",
    (_name, parse) => {
      expect(parse({ kind: "ready", protocol: 1 })).toEqual({
        ok: false,
        error: { kind: "otherProtocol", found: 1 },
      });
    },
  );

  test.each([
    ["calculation", parseFromRunner],
    ["light", parseFromFilesRunner],
  ])('a ready of protocol "3", from the %s worker', (_name, parse) => {
    expect(parse({ kind: "ready", protocol: "3" })).toMatchObject({
      ok: false,
      error: { kind: "wrongType", path: "protocol", found: "string" },
    });
  });
});

// The jobs of the three checks of the Variants step in the order of 28
// September 2026, the individuals first (docs/specs/worker/messages.md,
// "How it is verified").

const LIST_OF_THREE = ["s000", "s003", "s004"] as const;

describe("IP2 D1 the worker in the new order: the messages", () => {
  test("an individualChecks job with a filter is refused", () => {
    const job = { ...INDIVIDUAL_CHECKS_JOB, filters: FILTERS_AT_0_05 };
    expect(parseToRunner({ ...RUN, job })).toEqual({
      ok: false,
      error: {
        kind: "wrongLength",
        messageKind: "run",
        path: "job.filters",
        expected: 0,
        found: 1,
      },
    });
  });

  test("an individualChecks job with a list of individuals is refused", () => {
    const job = { ...INDIVIDUAL_CHECKS_JOB, individuals: [...LIST_OF_THREE] };
    expect(parseToRunner({ ...RUN, job })).toEqual({
      ok: false,
      error: {
        kind: "extraFields",
        messageKind: "run",
        path: "job",
        fields: ["individuals"],
      },
    });
  });

  test.each([
    ["the histograms of the variants", VARIANT_CHECKS_JOB],
    ["the counts of the filters", FILTER_COUNTS_JOB],
  ])("a job of %s with a list of individuals is accepted", (_name, job) => {
    const run = { ...RUN, job: { ...job, individuals: [...LIST_OF_THREE] } };
    expect(parseToRunner(run)).toEqual({ ok: true, value: run });
  });

  test.each([
    ["variantChecks", VARIANT_CHECKS_JOB],
    ["filterCounts", FILTER_COUNTS_JOB],
  ])("a %s job without individuals is refused", (_name, job) => {
    const without = Object.fromEntries(
      Object.entries(job).filter(([name]) => name !== "individuals"),
    );
    expect(parseToRunner({ ...RUN, job: without })).toEqual({
      ok: false,
      error: {
        kind: "missingFields",
        messageKind: "run",
        path: "job",
        fields: ["individuals"],
      },
    });
  });

  test.each([
    ["variantChecks", VARIANT_CHECKS_JOB],
    ["filterCounts", FILTER_COUNTS_JOB],
  ])("a %s job whose individuals are one text is refused", (_name, job) => {
    const run = { ...RUN, job: { ...job, individuals: "s000" } };
    expect(parseToRunner(run)).toMatchObject({
      ok: false,
      error: { kind: "wrongType", path: "job.individuals" },
    });
  });

  test.each([
    ["calculation", parseFromRunner],
    ["light", parseFromFilesRunner],
  ])(
    "a ready of protocol 2, stage 3's, with no other field, from the %s worker",
    (_name, parse) => {
      expect(parse({ kind: "ready", protocol: 2 })).toEqual({
        ok: false,
        error: { kind: "otherProtocol", found: 2 },
      });
    },
  );
});

// The messages of the two workers, drawn by fast-check.

const whole = fc.nat();
const text = fc.string();
const number = fc.double();
const float64s = (length: number): fc.Arbitrary<Float64Array> =>
  fc
    .array(fc.double(), { minLength: length, maxLength: length })
    .map((values) => Float64Array.from(values));
const uint32s = (length: number): fc.Arbitrary<Uint32Array> =>
  fc
    .array(fc.nat({ max: 4294967295 }), {
      minLength: length,
      maxLength: length,
    })
    .map((values) => Uint32Array.from(values));

const filteringStats = fc.record({ varsProcessed: number, varsKept: number });
const passStats: fc.Arbitrary<PassStats> = fc.record({
  numVars: number,
  filtering: fc.record(
    {
      passed: filteringStats,
      missing_data: filteringStats,
      obs_het: filteringStats,
      maf: filteringStats,
      ld: filteringStats,
    },
    { requiredKeys: [] },
  ),
});

const diversityResult: fc.Arbitrary<DiversityResult> = fc
  .tuple(fc.array(text, { maxLength: 5 }), fc.integer({ min: 2, max: 12 }))
  .chain(([pops, numCalledAlleles]) =>
    fc
      .record({
        analysis: fc.constant("diversity" as const),
        pops: fc.constant(pops),
        numIndividuals: uint32s(pops.length),
        unbiasedExpHet: float64s(pops.length),
        obsHet: float64s(pops.length),
        polyRatio: float64s(pops.length),
        numVarsWithValue: uint32s(pops.length),
        fis: float64s(pops.length),
        numAllelesMean: float64s(pops.length),
        numAllelesInDraw: float64s(pops.length),
        privateAllelesTotal: float64s(pops.length),
        privateAllelesMean: float64s(pops.length),
        privateAllelesInDraw: float64s(pops.length),
        numVarsInDraw: uint32s(pops.length),
        everyPop: fc.option(fc.tuple(whole, whole), { nil: null }),
        numCalledAlleles: fc.constant(numCalledAlleles),
        foldedSfs: fc.array(
          fc.option(float64s(Math.floor(numCalledAlleles / 2) + 1), {
            nil: null,
          }),
          { minLength: pops.length, maxLength: pops.length },
        ),
        passStats,
      })
      .map(({ everyPop, ...result }) => ({
        ...result,
        numVarsEveryPop: everyPop === null ? null : everyPop[0],
        numVarsEveryPopInDraw: everyPop === null ? null : everyPop[1],
      })),
  );
const individualChecksResult: fc.Arbitrary<IndividualChecksResult> = fc
  .array(text, { maxLength: 5 })
  .chain((individuals) =>
    fc.record({
      analysis: fc.constant("individualChecks" as const),
      individuals: fc.constant(individuals),
      missingGtRate: float64s(individuals.length),
      obsHetRate: float64s(individuals.length),
      passStats,
    }),
  );
const variantChecksResult: fc.Arbitrary<VariantChecksResult> = fc
  .integer({ min: 1, max: 6 })
  .chain((numEdges) => {
    const distrib = fc.record({ mean: number, counts: uint32s(numEdges - 1) });
    return fc.record({
      analysis: fc.constant("variantChecks" as const),
      binEdges: float64s(numEdges),
      missingRate: distrib,
      maf: distrib,
      obsHet: distrib,
      unbiasedExpHet: distrib,
      passStats,
    });
  });
const filterCountsResult: fc.Arbitrary<FilterCountsResult> = fc.record({
  analysis: fc.constant("filterCounts" as const),
  passStats,
});
const variantsSummaryResult: fc.Arbitrary<VariantsSummaryResult> = fc
  .array(text, { maxLength: 4 })
  .chain((chroms) =>
    fc.record({
      analysis: fc.constant("variantsSummary" as const),
      chroms: fc.constant(chroms),
      numVarsPerChrom: uint32s(chroms.length),
      perVar: variantChecksResult.map((r) => ({
        binEdges: r.binEdges,
        missingRate: r.missingRate,
        maf: r.maf,
        obsHet: r.obsHet,
        unbiasedExpHet: r.unbiasedExpHet,
        passStats: r.passStats,
      })),
      perIndividual: individualChecksResult.map((r) => ({
        individuals: r.individuals,
        missingGtRate: r.missingGtRate,
        obsHetRate: r.obsHetRate,
        passStats: r.passStats,
      })),
      passStats,
      filterColumn: fc.option(
        fc.record({ passed: fc.nat(), failed: fc.nat() }),
        { nil: null },
      ),
    }),
  );
const pcaResult: fc.Arbitrary<PcaResult> = fc
  .record({
    individuals: fc.array(text, { maxLength: 5 }),
    numComps: fc.nat({ max: 4 }),
    numCompsFound: fc.nat({ max: 10 }),
    method: fc.constantFrom("pca" as const, "pcoa" as const),
  })
  .chain(({ individuals, numComps, numCompsFound, method }) =>
    fc.record({
      analysis: fc.constant("pca" as const),
      method: fc.constant(method),
      individuals: fc.constant(individuals),
      numComps: fc.constant(numComps),
      numCompsFound: fc.constant(numCompsFound),
      projections: float64s(individuals.length * numComps),
      explainedVariancePercent: float64s(numComps),
      numVarsUsed: method === "pca" ? number : fc.constant(null),
      lingoesConstant: method === "pca" ? fc.constant(null) : number,
      negativeEigenvaluesPercent: method === "pca" ? fc.constant(null) : number,
      passStats,
    }),
  );
const ldDecayResult: fc.Arbitrary<LdDecayResult> = fc
  .record({
    pops: fc.array(text, { maxLength: 3 }),
    numBins: fc.nat({ max: 5 }),
  })
  .chain(({ pops, numBins }) =>
    fc.record({
      analysis: fc.constant("ldDecay" as const),
      pops: fc.constant(pops),
      numIndividuals: uint32s(pops.length),
      numVars: float64s(pops.length),
      smallestDist: float64s(numBins),
      largestDist: float64s(numBins),
      numPairs: float64s(pops.length * numBins),
      meanR2: float64s(pops.length * numBins),
      sdR2: float64s(pops.length * numBins),
      rhoPerBp: float64s(pops.length),
      r2AtZero: float64s(pops.length),
      halfDist: float64s(pops.length),
      passStats,
    }),
  );
/** An order of the heatmap of `numPops` populations, of each kind. */
const heatmapOrder = (numPops: number): fc.Arbitrary<HeatmapOrder> =>
  fc.oneof(
    fc
      .shuffledSubarray(
        Array.from({ length: numPops }, (_, at) => at),
        { minLength: numPops, maxLength: numPops },
      )
      .map((order) => ({
        kind: "pcoa" as const,
        order: Uint32Array.from(order),
      })),
    fc.record({
      kind: fc.constant("file" as const),
      reason: fc.constantFrom(
        "twoPopulations" as const,
        "noDistance" as const,
        "allZero" as const,
      ),
    }),
    fc.record({
      kind: fc.constant("file" as const),
      reason: fc.constant("notPlaced" as const),
      message: text,
    }),
  );
const leftOut = fc.array(fc.tuple(text, whole), { maxLength: 3 });
const popDistsResult: fc.Arbitrary<PopDistsResult> = fc
  .array(text, { maxLength: 5 })
  .chain((pops) => {
    const numPairs = (pops.length * (pops.length - 1)) / 2;
    return fc.record({
      analysis: fc.constant("popDists" as const),
      pops: fc.constant(pops),
      numIndividuals: uint32s(pops.length),
      fst: float64s(numPairs),
      dest: float64s(numPairs),
      numVarsPerPair: uint32s(numPairs),
      order: fc.record({
        fst: heatmapOrder(pops.length),
        dest: heatmapOrder(pops.length),
      }),
      leftOut,
      passStats,
    });
  });
const jobResult = fc.oneof(
  diversityResult,
  individualChecksResult,
  variantChecksResult,
  filterCountsResult,
  variantsSummaryResult,
  pcaResult,
  popDistsResult,
  ldDecayResult,
);
const written = fc.nat({ max: 64 }).chain((numBytes) =>
  fc.record({
    format: fc.constantFrom("nei" as const, "vcf" as const),
    file: fc.constant(new Blob([new Uint8Array(numBytes)])),
    numBytes: fc.constant(numBytes),
    passStats,
  }),
);

const workerStop = fc.oneof(
  fc.record({ kind: fc.constant("crashed" as const), message: text }),
  fc.record({ kind: fc.constant("badRequest" as const), message: text }),
);

const fromRunnerMessage = fc.oneof(
  fc.record({
    kind: fc.constant("ready" as const),
    protocol: fc.constant(PROTOCOL_VERSION),
    popneiVersion: text,
  }),
  fc.record({
    kind: fc.constant("opened" as const),
    id: whole,
    individuals: fc.array(text),
    ploidy: number,
    keepsPassed: fc.boolean(),
  }),
  fc.record({
    kind: fc.constant("result" as const),
    id: whole,
    key: text,
    result: jobResult,
  }),
  fc.record({
    kind: fc.constant("soFar" as const),
    id: whole,
    key: text,
    result: jobResult,
  }),
  fc.record({
    kind: fc.constant("written" as const),
    id: whole,
    key: text,
    result: written,
  }),
  fc.record({
    kind: fc.constant("refused" as const),
    id: whole,
    message: text,
  }),
  fc.record({
    kind: fc.constant("reopenFailed" as const),
    id: whole,
    name: text,
    message: text,
  }),
  fc.record({
    kind: fc.constant("progress" as const),
    id: whole,
    bytesRead: number,
    numBytes: number,
    pass: number,
    numPasses: number,
  }),
  workerStop,
);

const separator = fc.constantFrom(",", ";", "\t");
const cellValue = fc.oneof(text, number, fc.boolean());
const cell = fc.oneof(cellValue, fc.constant(null));
const columnType = fc.oneof(
  fc.constant({ kind: "identifier" as const }),
  fc.record({
    kind: fc.constant("binary" as const),
    one: text,
    zero: text,
  }),
  fc.constant({ kind: "continuous" as const }),
  fc.constant({ kind: "categorical" as const }),
);
const fileError = fc.oneof(
  fc.constant({ kind: "empty" as const }),
  fc.record({ kind: fc.constant("duplicateColumn" as const), name: text }),
  fc.record({ kind: fc.constant("duplicateIndividual" as const), name: text }),
  fc.record({
    kind: fc.constant("raggedRow" as const),
    line: number,
    expected: number,
    found: number,
    separator,
  }),
  fc.record({ kind: fc.constant("files" as const), message: text }),
  fc.record({ kind: fc.constant("unnamedColumn" as const), column: number }),
  fc.record({ kind: fc.constant("emptyIndividual" as const), line: number }),
  fc.record({
    kind: fc.constant("unclosedQuote" as const),
    line: number,
    separator,
  }),
  fc.record({
    kind: fc.constant("tooLarge" as const),
    size: number,
    max: number,
  }),
  fc.record({ kind: fc.constant("unreadable" as const), message: text }),
  fc.constant({ kind: "notText" as const }),
  fc.constant({ kind: "variantsFile" as const }),
  fc.constant({ kind: "cutShort" as const }),
  fc.constant({ kind: "oldExcel" as const }),
  fc.constant({ kind: "encrypted" as const }),
  fc.constant({ kind: "notWorkbook" as const }),
  fc.record({ kind: fc.constant("emptySheet" as const), sheet: text }),
  fc.record({ kind: fc.constant("cellError" as const), error: text }),
  fc.record({
    kind: fc.constant("headerError" as const),
    row: number,
    column: number,
    error: text,
  }),
  fc.record({
    kind: fc.constant("sheetTooLarge" as const),
    sheet: text,
    lastRow: number,
    lastColumn: text,
    max: number,
  }),
  fc.record({
    kind: fc.constant("readerNotLoaded" as const),
    message: text,
  }),
);
const fileRead = fc.oneof(
  fc.integer({ min: 0, max: 5 }).chain((numColumns) =>
    fc.record({
      kind: fc.constant("read" as const),
      table: fc.record({
        columns: fc.array(text, {
          minLength: numColumns,
          maxLength: numColumns,
        }),
        rows: fc.array(
          fc.array(cell, { minLength: numColumns, maxLength: numColumns }),
          {
            maxLength: 5,
          },
        ),
      }),
      columns: fc.array(columnType, {
        minLength: numColumns,
        maxLength: numColumns,
      }),
      // null for an xlsx.
      found: fc.option(
        fc.record({
          encoding: fc.constantFrom("utf-8", "windows-1252", "utf-16"),
          separator,
          decimal: fc.constantFrom(".", ","),
          undecodedLine: fc.option(fc.integer({ min: 1, max: 100_000 }), {
            nil: null,
          }),
        }),
        { nil: null },
      ),
    }),
  ),
  fc.record({
    kind: fc.constant("failed" as const),
    error: fileError,
    format: fc.constantFrom("text" as const, "xlsx" as const, null),
  }),
);

const fromFilesRunnerMessage = fc.oneof(
  fc.record({
    kind: fc.constant("ready" as const),
    protocol: fc.constant(PROTOCOL_VERSION),
  }),
  fc.record({
    kind: fc.constant("individuals" as const),
    id: whole,
    read: fileRead,
  }),
  workerStop,
);

// The requests of the page, drawn by fast-check.

const variantFilter = fc.oneof(
  fc.record({ kind: fc.constant("passed" as const) }),
  fc.record({
    kind: fc.constant("missing_data" as const),
    maxAllowedMissingRate: number,
  }),
  fc.record({ kind: fc.constant("maf" as const), maxAllowedMaf: number }),
  fc.record({
    kind: fc.constant("obs_het" as const),
    maxAllowedObsHet: number,
  }),
  fc.record({
    kind: fc.constant("ld" as const),
    maxAllowedR2: number,
    maxDist: number,
  }),
);
const individualsKept = fc.option(fc.array(text, { maxLength: 4 }), {
  nil: null,
});
const filters = fc.array(variantFilter, { maxLength: 4 });
const diversityJob = fc
  .array(fc.tuple(text, fc.array(text, { maxLength: 3 })), { maxLength: 3 })
  .chain((pops) =>
    fc.record({
      analysis: fc.constant("diversity" as const),
      fileId: text,
      filters,
      individuals: individualsKept,
      pops: fc.constant(pops),
      minNumIndividuals: number,
      polyThreshold: number,
      numCalledAlleles: fc.integer({ min: 2, max: 4294967295 }),
      popDiversityPops: fc.subarray(pops.map(([pop]) => pop)),
    }),
  );
const individualChecksJob = fc.record({
  analysis: fc.constant("individualChecks" as const),
  fileId: text,
  filters: fc.constant([] as const),
});
const variantChecksJob = fc.record({
  analysis: fc.constant("variantChecks" as const),
  fileId: text,
  filters: fc.constant([] as const),
  individuals: individualsKept,
  minNumIndividuals: number,
  numBins: number,
  range: fc.tuple(number, number),
});
const variantsSummaryJob = fc.record({
  analysis: fc.constant("variantsSummary" as const),
  fileId: text,
  filters: fc.constant([] as const),
  minNumIndividuals: number,
  numBins: number,
  range: fc.tuple(number, number),
});
const filterCountsJob = fc.record({
  analysis: fc.constant("filterCounts" as const),
  fileId: text,
  filters,
  individuals: individualsKept,
});
const pcaJob = fc.record({
  analysis: fc.constant("pca" as const),
  fileId: text,
  filters,
  individuals: individualsKept,
  method: fc.constantFrom("pca" as const, "pcoa" as const),
  numCompsKept: fc.integer(),
});
const popDistsJob = fc.record({
  analysis: fc.constant("popDists" as const),
  fileId: text,
  filters,
  individuals: individualsKept,
  pops: fc.array(fc.tuple(text, fc.array(text, { maxLength: 3 })), {
    maxLength: 3,
  }),
  leftOut,
  minNumIndividuals: number,
});
const ldDecayJob = fc.record({
  analysis: fc.constant("ldDecay" as const),
  fileId: text,
  filters,
  individuals: individualsKept,
  pops: fc.array(fc.tuple(text, fc.array(text, { maxLength: 3 })), {
    maxLength: 3,
  }),
  minDist: number,
  maxDist: number,
  numBins: number,
  maxAllowedMaf: number,
});
const writeJob = fc.record({
  format: fc.constantFrom("nei" as const, "vcf" as const),
  fileId: text,
  filters,
  individuals: individualsKept,
});
const toRunnerMessage = fc.oneof(
  fc.record({
    kind: fc.constant("open" as const),
    id: whole,
    fileId: text,
    file: fc.constant(VCF_FILE),
    format: fc.constant("vcf" as const),
    readOptions: fc.record({
      ploidy: fc.option(number, { nil: null }),
      onlyPassed: fc.boolean(),
    }),
  }),
  fc.record({
    kind: fc.constant("open" as const),
    id: whole,
    fileId: text,
    file: fc.constant(NEI_FILE),
    format: fc.constant("nei" as const),
    readOptions: fc.constant(null),
  }),
  fc.record({
    kind: fc.constant("run" as const),
    id: whole,
    key: text,
    job: fc.oneof(
      diversityJob,
      individualChecksJob,
      variantChecksJob,
      filterCountsJob,
      variantsSummaryJob,
      pcaJob,
      popDistsJob,
      ldDecayJob,
    ),
  }),
  fc.record({
    kind: fc.constant("write" as const),
    id: whole,
    key: text,
    job: writeJob,
  }),
);
const toFilesRunnerMessage = fc.record({
  kind: fc.constant("readIndividuals" as const),
  id: whole,
  file: fc.constant(CSV_FILE),
  csv: fc.record({
    encoding: fc.constantFrom("auto", "utf-8", "windows-1252"),
    separator: fc.constantFrom("auto", ",", ";", "\t"),
    decimal: fc.constantFrom("auto", ".", ","),
  }),
});

/** A valid message of any kind of either side, with the check of its
    side. */
const anyMessage: fc.Arbitrary<{
  readonly message: unknown;
  readonly parse: (data: unknown) => { readonly ok: boolean };
}> = fc.oneof(
  toRunnerMessage.map((message) => ({ message, parse: parseToRunner })),
  fromRunnerMessage.map((message) => ({ message, parse: parseFromRunner })),
  toFilesRunnerMessage.map((message) => ({
    message,
    parse: parseToFilesRunner,
  })),
  fromFilesRunnerMessage.map((message) => ({
    message,
    parse: parseFromFilesRunner,
  })),
);

/** A leaf of a message: a value that is not a plain object nor a list,
    with the path to it and whether it is a field of an object. */
interface Leaf {
  readonly path: readonly (string | number)[];
  readonly inObject: boolean;
}

function isPlainObject(value: unknown): value is object {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !ArrayBuffer.isView(value) &&
    !(value instanceof Blob)
  );
}

/** Every leaf of a message but its own `kind`, which names the message. */
function leavesOf(
  value: unknown,
  path: readonly (string | number)[] = [],
): Leaf[] {
  if (isPlainObject(value)) {
    return Object.entries(value).flatMap(([name, child]) =>
      path.length === 0 && name === "kind"
        ? []
        : isPlainObject(child) || Array.isArray(child)
          ? leavesOf(child, [...path, name])
          : [{ path: [...path, name], inObject: true }],
    );
  }
  if (Array.isArray(value)) {
    return value.flatMap((child: unknown, index) =>
      isPlainObject(child) || Array.isArray(child)
        ? leavesOf(child, [...path, index])
        : [{ path: [...path, index], inObject: false }],
    );
  }
  return [];
}

/** The ways a leaf is corrupted. */
type Corruption = "delete" | "addBeside" | "wrongType";

/** A copy of `value` with the leaf at `path` corrupted. */
function corrupt(
  value: unknown,
  path: readonly (string | number)[],
  how: Corruption,
): unknown {
  const [head, ...rest] = path;
  if (Array.isArray(value)) {
    return value.map((child: unknown, index) =>
      index !== head
        ? child
        : rest.length === 0
          ? {}
          : corrupt(child, rest, how),
    );
  }
  if (!isPlainObject(value)) {
    return value;
  }
  const entries = Object.entries(value);
  if (rest.length > 0) {
    return Object.fromEntries(
      entries.map(([name, child]) => [
        name,
        name === head ? corrupt(child, rest, how) : child,
      ]),
    );
  }
  switch (how) {
    case "delete":
      return Object.fromEntries(entries.filter(([name]) => name !== head));
    case "addBeside":
      return Object.fromEntries([...entries, ["extra", 1]]);
    case "wrongType":
      // An object is of the wrong type for every leaf but a null that
      // stands for an object, as the options of a CSV of an xlsx, whose
      // check then names the fields missing: a symbol is of no type any
      // message holds.
      return Object.fromEntries(
        entries.map(([name, child]) => [
          name,
          name !== head ? child : child === null ? Symbol("wrong") : {},
        ]),
      );
  }
}

describe("WS2 D2 the messages refused: any leaf corrupted", () => {
  test("a message with one leaf deleted, one field added beside it, or one leaf of the wrong type is refused at that leaf", () => {
    fc.assert(
      fc.property(
        anyMessage,
        fc.nat(),
        fc.constantFrom<Corruption>("delete", "addBeside", "wrongType"),
        ({ message, parse }, pick, drawn) => {
          const leaves = leavesOf(message);
          const leaf = leaves[pick % Math.max(leaves.length, 1)];
          if (leaf === undefined) {
            return;
          }
          const how = leaf.inObject ? drawn : "wrongType";
          const parent = leaf.path.slice(0, -1).join(".");
          const name = String(leaf.path.at(-1));
          const expected =
            how === "delete"
              ? { kind: "missingFields", path: parent, fields: [name] }
              : how === "addBeside"
                ? { kind: "extraFields", path: parent, fields: ["extra"] }
                : { kind: "wrongType", path: leaf.path.join(".") };
          expect(parse(corrupt(message, leaf.path, how))).toMatchObject({
            ok: false,
            error: expected,
          });
        },
      ),
      // A message has tens of leaves, and each case tries one: 2,000
      // cases reach the rarer ones, the second value of a binary column
      // among them, in under 0.1 s on this Mac.
      { numRuns: 2000 },
    );
  });

  test("a Uint32Array of a result not as long as its populations", () => {
    const result = { ...RESULT, numIndividuals: Uint32Array.from([2]) };
    expect(
      parseFromRunner({ kind: "result", id: 2, key: "k1", result }),
    ).toMatchObject({
      ok: false,
      error: {
        kind: "wrongLength",
        path: "result.numIndividuals",
        expected: 2,
        found: 1,
      },
    });
  });

  test.each([
    ["parseToRunner", parseToRunner],
    ["parseFromRunner", parseFromRunner],
    ["parseToFilesRunner", parseToFilesRunner],
    ["parseFromFilesRunner", parseFromFilesRunner],
  ])(
    "%s refuses the kind toString, which every object inherits",
    (_name, parse) => {
      expect(parse({ kind: "toString" })).toMatchObject({
        ok: false,
        error: { kind: "unknownKind", found: "toString" },
      });
    },
  );

  test("a filter of the kind toString is refused", () => {
    const job = { ...JOB, filters: [{ kind: "toString" }] };
    expect(parseToRunner({ ...RUN, job })).toMatchObject({
      ok: false,
      error: { kind: "unknownValue", path: "job.filters.0.kind" },
    });
  });

  test("a result of the id 1.5", () => {
    expect(
      parseFromRunner({ kind: "result", id: 1.5, key: "k1", result: RESULT }),
    ).toMatchObject({
      ok: false,
      error: { kind: "wrongType", path: "id", expected: "a whole number" },
    });
  });
});

describe("IP9 D1 the messages of an xlsx", () => {
  const XLSX_FILE = new File(["PK"], "pops.xlsx");
  const READ_XLSX = {
    kind: "readIndividuals",
    id: 5,
    file: XLSX_FILE,
    csv: null,
  };
  const XLSX_READ = {
    kind: "individuals",
    id: 5,
    read: {
      kind: "read",
      table: {
        columns: ["id", "h", "ok"],
        rows: [
          ["1", 1.75, true],
          ["2", "1.8", null],
        ],
      },
      columns: [
        { kind: "identifier" },
        { kind: "categorical" },
        { kind: "categorical" },
      ],
      found: null,
    },
  };

  test("parseToFilesRunner accepts a readIndividuals of an xlsx, whose csv is null", () => {
    expect(parseToFilesRunner(READ_XLSX)).toEqual({
      ok: true,
      value: READ_XLSX,
    });
  });

  test("parseFromFilesRunner accepts a read of an xlsx, whose found is null, with its numbers and booleans", () => {
    expect(parseFromFilesRunner(XLSX_READ)).toEqual({
      ok: true,
      value: XLSX_READ,
    });
  });

  test.each([
    [{ kind: "notWorkbook" }],
    [{ kind: "oldExcel" }],
    [{ kind: "encrypted" }],
    [{ kind: "emptySheet", sheet: "Hoja1" }],
    [{ kind: "cellError", error: "#SPILL!" }],
    [{ kind: "headerError", row: 1, column: 4, error: "#VALUE!" }],
    [
      {
        kind: "sheetTooLarge",
        sheet: "Hoja1",
        lastRow: 123,
        lastColumn: "XFD",
        max: 2_000_000,
      },
    ],
    [{ kind: "readerNotLoaded", message: "Failed to fetch" }],
  ])("parseFromFilesRunner accepts the refusal %o", (error) => {
    const message = {
      kind: "individuals",
      id: 5,
      read: { kind: "failed", error, format: "xlsx" },
    };
    expect(parseFromFilesRunner(message)).toEqual({
      ok: true,
      value: message,
    });
  });

  test("a readIndividuals whose csv is {} is missingFields", () => {
    expect(parseToFilesRunner({ ...READ_XLSX, csv: {} })).toEqual({
      ok: false,
      error: {
        kind: "missingFields",
        messageKind: "readIndividuals",
        path: "csv",
        fields: ["encoding", "separator", "decimal"],
      },
    });
  });

  test("a binary type whose one is the number 1 is wrongType", () => {
    const message = {
      ...XLSX_READ,
      read: {
        ...XLSX_READ.read,
        columns: [
          { kind: "identifier" },
          { kind: "binary", one: 1, zero: "0" },
          { kind: "categorical" },
        ],
      },
    };
    expect(parseFromFilesRunner(message)).toMatchObject({
      ok: false,
      error: { kind: "wrongType", path: "read.columns.1.one" },
    });
  });

  test("a found of an xlsx with the fields of a CsvFound but undecodedLine is missingFields", () => {
    const message = {
      ...XLSX_READ,
      read: {
        ...XLSX_READ.read,
        found: { encoding: "utf-8", separator: ",", decimal: "." },
      },
    };
    expect(parseFromFilesRunner(message)).toEqual({
      ok: false,
      error: {
        kind: "missingFields",
        messageKind: "individuals",
        path: "read.found",
        fields: ["undecodedLine"],
      },
    });
  });

  test("an emptySheet without its sheet is missingFields", () => {
    const message = {
      kind: "individuals",
      id: 5,
      read: { kind: "failed", error: { kind: "emptySheet" }, format: "xlsx" },
    };
    expect(parseFromFilesRunner(message)).toEqual({
      ok: false,
      error: {
        kind: "missingFields",
        messageKind: "individuals",
        path: "read.error",
        fields: ["sheet"],
      },
    });
  });

  test.each([["lastRow"], ["max"]])(
    "a sheetTooLarge whose %s is a text is wrongType",
    (name) => {
      const message = {
        kind: "individuals",
        id: 5,
        read: {
          kind: "failed",
          format: "xlsx",
          error: {
            kind: "sheetTooLarge",
            sheet: "Hoja1",
            lastRow: 123,
            lastColumn: "XFD",
            max: 2_000_000,
            [name]: "123",
          },
        },
      };
      expect(parseFromFilesRunner(message)).toMatchObject({
        ok: false,
        error: { kind: "wrongType", path: `read.error.${name}` },
      });
    },
  );
});

describe("messageOf", () => {
  test("gives the message of an Error, of its subclasses too, and the text of anything else thrown", () => {
    expect(messageOf(new Error("the source is not a VCF"))).toBe(
      "the source is not a VCF",
    );
    expect(
      messageOf(new WebAssembly.RuntimeError("unreachable executed")),
    ).toBe("unreachable executed");
    expect(messageOf("a text, not an Error")).toBe("a text, not an Error");
    expect(messageOf(undefined)).toBe("undefined");
  });
});

// The job and the result of the principal components, stage 4
// (docs/specs/worker/messages.md, "How it is verified").

const PCA_JOB: PcaJob = {
  analysis: "pca",
  fileId: "load-a",
  filters: [
    { kind: "missing_data", maxAllowedMissingRate: 0.1 },
    { kind: "ld", maxAllowedR2: 0.1, maxDist: 50000 },
  ],
  individuals: null,
  method: "pca",
  numCompsKept: 10,
};

const PCA_PASS: PassStats = {
  numVars: 548,
  filtering: {
    missing_data: { varsProcessed: 1200, varsKept: 1200 },
    ld: { varsProcessed: 1200, varsKept: 548 },
  },
};

/** A result of the PCA of 200 individuals and 10 components. */
const PCA_RESULT: PcaResult = {
  analysis: "pca",
  method: "pca",
  individuals: Array.from({ length: 200 }, (_, i) => `s${String(i)}`),
  numComps: 10,
  numCompsFound: 199,
  projections: Float64Array.from({ length: 2000 }, (_, i) => i / 100 - 10),
  explainedVariancePercent: Float64Array.from(
    { length: 10 },
    (_, i) => 3.5 - i / 10,
  ),
  numVarsUsed: 548,
  lingoesConstant: null,
  negativeEigenvaluesPercent: null,
  passStats: PCA_PASS,
};

/** The same, of the PCoA. */
const PCOA_RESULT: PcaResult = {
  ...PCA_RESULT,
  method: "pcoa",
  numCompsFound: 198,
  numVarsUsed: null,
  lingoesConstant: 0.023674522901958598,
  negativeEigenvaluesPercent: 7.87126617431627,
};

describe("IP6 D1 the messages of the PCA", () => {
  test.each([
    ["the PCA over every individual", PCA_JOB],
    ["the PCoA over every individual", { ...PCA_JOB, method: "pcoa" }],
    [
      "the PCA with a list of individuals",
      { ...PCA_JOB, individuals: [...LIST_OF_THREE] },
    ],
    [
      "the PCoA with a list of individuals",
      { ...PCA_JOB, method: "pcoa", individuals: [...LIST_OF_THREE] },
    ],
  ])("parseToRunner accepts a run of %s", (_name, job) => {
    const run = { ...RUN, job };
    expect(parseToRunner(run)).toEqual({ ok: true, value: run });
  });

  test.each([
    ["the PCA", PCA_RESULT],
    ["the PCoA", PCOA_RESULT],
    [
      "one component of two individuals",
      {
        ...PCA_RESULT,
        individuals: ["s000", "s001"],
        numComps: 1,
        numCompsFound: 1,
        projections: Float64Array.of(18.841443681416774, -18.841443681416774),
        explainedVariancePercent: Float64Array.of(100),
      },
    ],
  ])("parseFromRunner accepts a result of %s", (_name, result) => {
    const message = resultMessage(result);
    expect(parseFromRunner(message)).toEqual({ ok: true, value: message });
  });

  test("parseFromRunner accepts the progress of a PCA", () => {
    const progress = { ...PROGRESS, id: 3 };
    expect(parseFromRunner(progress)).toEqual({ ok: true, value: progress });
  });

  test('a pca job whose method is "tsne" is unknownValue', () => {
    const job = { ...PCA_JOB, method: "tsne" };
    expect(parseToRunner({ ...RUN, job })).toEqual({
      ok: false,
      error: {
        kind: "unknownValue",
        messageKind: "run",
        path: "job.method",
        found: "tsne",
        expected: ["pca", "pcoa"],
      },
    });
  });

  test("a pca job whose numCompsKept is 1.5 is wrongType", () => {
    const job = { ...PCA_JOB, numCompsKept: 1.5 };
    expect(parseToRunner({ ...RUN, job })).toMatchObject({
      ok: false,
      error: {
        kind: "wrongType",
        path: "job.numCompsKept",
        expected: "a whole number",
        found: "number",
      },
    });
  });

  test("a pca job without its method is missingFields, and one with the options of popnei is extraFields", () => {
    const without = Object.fromEntries(
      Object.entries(PCA_JOB).filter(([name]) => name !== "method"),
    );
    expect(parseToRunner({ ...RUN, job: without })).toEqual({
      ok: false,
      error: {
        kind: "missingFields",
        messageKind: "run",
        path: "job",
        fields: ["method"],
      },
    });
    const job = { ...PCA_JOB, correctByLingoes: true };
    expect(parseToRunner({ ...RUN, job })).toEqual({
      ok: false,
      error: {
        kind: "extraFields",
        messageKind: "run",
        path: "job",
        fields: ["correctByLingoes"],
      },
    });
  });

  test("a result whose projections are a list of numbers is wrongType", () => {
    const result = { ...PCA_RESULT, projections: [...PCA_RESULT.projections] };
    expect(parseFromRunner(resultMessage(result))).toMatchObject({
      ok: false,
      error: {
        kind: "wrongType",
        path: "result.projections",
        expected: "a Float64Array",
        found: "array",
      },
    });
  });

  test("a result of 1,999 projections for 200 individuals and 10 components is wrongLength", () => {
    const result = {
      ...PCA_RESULT,
      projections: PCA_RESULT.projections.slice(0, 1999),
    };
    expect(parseFromRunner(resultMessage(result))).toEqual({
      ok: false,
      error: {
        kind: "wrongLength",
        messageKind: "result",
        path: "result.projections",
        expected: 2000,
        found: 1999,
      },
    });
  });

  test("a result of 9 percentages for 10 components is wrongLength", () => {
    const result = {
      ...PCA_RESULT,
      explainedVariancePercent: PCA_RESULT.explainedVariancePercent.slice(0, 9),
    };
    expect(parseFromRunner(resultMessage(result))).toEqual({
      ok: false,
      error: {
        kind: "wrongLength",
        messageKind: "result",
        path: "result.explainedVariancePercent",
        expected: 10,
        found: 9,
      },
    });
  });

  test("a result of the PCA whose numVarsUsed is null is wrongType", () => {
    const result = { ...PCA_RESULT, numVarsUsed: null };
    expect(parseFromRunner(resultMessage(result))).toMatchObject({
      ok: false,
      error: { kind: "wrongType", path: "result.numVarsUsed", found: "null" },
    });
  });

  test("a result of the PCoA whose lingoesConstant is null is wrongType", () => {
    const result = { ...PCOA_RESULT, lingoesConstant: null };
    expect(parseFromRunner(resultMessage(result))).toMatchObject({
      ok: false,
      error: {
        kind: "wrongType",
        path: "result.lingoesConstant",
        found: "null",
      },
    });
  });

  test("a result of the PCA with the numbers of the PCoA, and one of the PCoA with numVarsUsed, are wrongType", () => {
    const withConstant = { ...PCA_RESULT, lingoesConstant: 0 };
    expect(parseFromRunner(resultMessage(withConstant))).toMatchObject({
      ok: false,
      error: {
        kind: "wrongType",
        path: "result.lingoesConstant",
        found: "number",
      },
    });
    const withPercent = { ...PCA_RESULT, negativeEigenvaluesPercent: 0 };
    expect(parseFromRunner(resultMessage(withPercent))).toMatchObject({
      ok: false,
      error: {
        kind: "wrongType",
        path: "result.negativeEigenvaluesPercent",
        found: "number",
      },
    });
    const withUsed = { ...PCOA_RESULT, numVarsUsed: 548 };
    expect(parseFromRunner(resultMessage(withUsed))).toMatchObject({
      ok: false,
      error: { kind: "wrongType", path: "result.numVarsUsed", found: "number" },
    });
  });

  test("a result whose numComps is 1.5, or whose method is not one of the two, is refused", () => {
    expect(
      parseFromRunner(resultMessage({ ...PCA_RESULT, numComps: 1.5 })),
    ).toMatchObject({
      ok: false,
      error: { kind: "wrongType", path: "result.numComps" },
    });
    expect(
      parseFromRunner(resultMessage({ ...PCA_RESULT, method: "tsne" })),
    ).toMatchObject({
      ok: false,
      error: { kind: "unknownValue", path: "result.method" },
    });
  });

  test("parseFromRunner accepts the structured clone of any result of the principal components, and parseToRunner any run of them", () => {
    fc.assert(
      fc.property(
        fc.record({
          kind: fc.constant("result" as const),
          id: whole,
          key: text,
          result: pcaResult,
        }),
        (message) => {
          expect(parseFromRunner(structuredClone(message))).toEqual({
            ok: true,
            value: message,
          });
        },
      ),
    );
    fc.assert(
      fc.property(
        fc.record({
          kind: fc.constant("run" as const),
          id: whole,
          key: text,
          job: pcaJob,
        }),
        (message) => {
          expect(parseToRunner(message)).toEqual({ ok: true, value: message });
        },
      ),
    );
  });
});

describe("IP4 D2 the binary type of the messages holds texts", () => {
  test("a binary type whose one is the number 1 is refused", () => {
    const read = {
      ...INDIVIDUALS_READ.read,
      columns: [
        ...INDIVIDUALS_READ.read.columns.slice(0, 3),
        { kind: "binary", one: 1, zero: "no" },
      ],
    };
    expect(
      parseFromFilesRunner({ kind: "individuals", id: 4, read }),
    ).toMatchObject({
      ok: false,
      error: {
        kind: "wrongType",
        messageKind: "individuals",
        path: "read.columns.3.one",
      },
    });
  });

  test("a binary type whose zero is the boolean false is refused", () => {
    const read = {
      ...INDIVIDUALS_READ.read,
      columns: [
        ...INDIVIDUALS_READ.read.columns.slice(0, 3),
        { kind: "binary", one: "yes", zero: false },
      ],
    };
    expect(
      parseFromFilesRunner({ kind: "individuals", id: 4, read }),
    ).toMatchObject({
      ok: false,
      error: { kind: "wrongType", path: "read.columns.3.zero" },
    });
  });
});

// The job and the result of the LD decay, stage 5, and the version of the
// messages of stage 5 (docs/specs/worker/messages.md, "How it is
// verified").

const LD_DECAY_JOB: LdDecayJob = {
  analysis: "ldDecay",
  fileId: "load-a",
  filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.1 }],
  individuals: null,
  pops: [
    ["pop_a", ["i000", "i001"]],
    ["pop_b", ["i050"]],
  ],
  minDist: 1,
  maxDist: 100000,
  numBins: 50,
  maxAllowedMaf: 0.95,
};

/** A result of the LD decay of two populations and 50 bins, the second
    population with no curve and its last bin with no pair. */
const LD_DECAY_RESULT: LdDecayResult = {
  analysis: "ldDecay",
  pops: ["pop_a", "pop_b"],
  numIndividuals: Uint32Array.of(50, 50),
  numVars: Float64Array.of(432, 432),
  smallestDist: Float64Array.from({ length: 50 }, (_, i) => 1 + 2000 * i),
  largestDist: Float64Array.from({ length: 50 }, (_, i) => 2000 * (i + 1)),
  numPairs: Float64Array.from({ length: 100 }, (_, i) =>
    i === 99 ? 0 : 745 - i,
  ),
  meanR2: Float64Array.from({ length: 100 }, (_, i) =>
    i === 99 ? Number.NaN : 0.31 - i / 1000,
  ),
  sdR2: Float64Array.from({ length: 100 }, (_, i) =>
    i === 99 ? Number.NaN : 0.28,
  ),
  rhoPerBp: Float64Array.of(0.00029996668947275404, Number.NaN),
  r2AtZero: Float64Array.of(0.46942148760330576, Number.NaN),
  halfDist: Float64Array.of(7548.08187836982, Number.NaN),
  passStats: {
    numVars: 500,
    filtering: { missing_data: { varsProcessed: 500, varsKept: 500 } },
  },
};

describe("PA2 D1 the messages of the LD decay", () => {
  test.each([
    ["over every individual", LD_DECAY_JOB],
    [
      "with a list of individuals",
      { ...LD_DECAY_JOB, individuals: ["i000", "i001", "i050"] },
    ],
  ])("parseToRunner accepts a run of the LD decay %s", (_name, job) => {
    const run = { ...RUN, job };
    expect(parseToRunner(run)).toEqual({ ok: true, value: run });
  });

  test("parseFromRunner accepts a result of the LD decay of two populations and 50 bins", () => {
    const message = resultMessage(LD_DECAY_RESULT);
    expect(parseFromRunner(message)).toEqual({ ok: true, value: message });
  });

  test("a result of two populations and 50 bins with 99 values of meanR2 is wrongLength", () => {
    const result = {
      ...LD_DECAY_RESULT,
      meanR2: LD_DECAY_RESULT.meanR2.slice(0, 99),
    };
    expect(parseFromRunner(resultMessage(result))).toEqual({
      ok: false,
      error: {
        kind: "wrongLength",
        messageKind: "result",
        path: "result.meanR2",
        expected: 100,
        found: 99,
      },
    });
  });

  test.each([
    ["largestDist", 49],
    ["numPairs", 99],
    ["sdR2", 101],
    ["numVars", 3],
    ["rhoPerBp", 1],
    ["r2AtZero", 1],
    ["halfDist", 3],
  ])("a result whose %s has %d values is wrongLength", (name, length) => {
    const result = { ...LD_DECAY_RESULT, [name]: new Float64Array(length) };
    expect(parseFromRunner(resultMessage(result))).toMatchObject({
      ok: false,
      error: { kind: "wrongLength", path: `result.${name}`, found: length },
    });
  });

  test("a result whose numIndividuals has one value is wrongLength", () => {
    const result = { ...LD_DECAY_RESULT, numIndividuals: Uint32Array.of(50) };
    expect(parseFromRunner(resultMessage(result))).toMatchObject({
      ok: false,
      error: {
        kind: "wrongLength",
        path: "result.numIndividuals",
        expected: 2,
        found: 1,
      },
    });
  });

  test("a result whose smallestDist is a list of numbers is wrongType", () => {
    const result = {
      ...LD_DECAY_RESULT,
      smallestDist: [...LD_DECAY_RESULT.smallestDist],
    };
    expect(parseFromRunner(resultMessage(result))).toMatchObject({
      ok: false,
      error: { kind: "wrongType", path: "result.smallestDist" },
    });
  });

  test("a result of 10 bins, whose smallestDist gives the number of bins, is accepted with its other arrays of 10 and 20 values", () => {
    const result = {
      ...LD_DECAY_RESULT,
      smallestDist: new Float64Array(10),
      largestDist: new Float64Array(10),
      numPairs: new Float64Array(20),
      meanR2: new Float64Array(20),
      sdR2: new Float64Array(20),
    };
    const message = resultMessage(result);
    expect(parseFromRunner(message)).toEqual({ ok: true, value: message });
  });

  test("an ldDecay job without maxDist is missingFields, and one with a field more is extraFields", () => {
    const without = Object.fromEntries(
      Object.entries(LD_DECAY_JOB).filter(([name]) => name !== "maxDist"),
    );
    expect(parseToRunner({ ...RUN, job: without })).toEqual({
      ok: false,
      error: {
        kind: "missingFields",
        messageKind: "run",
        path: "job",
        fields: ["maxDist"],
      },
    });
    expect(
      parseToRunner({ ...RUN, job: { ...LD_DECAY_JOB, ldPruning: false } }),
    ).toEqual({
      ok: false,
      error: {
        kind: "extraFields",
        messageKind: "run",
        path: "job",
        fields: ["ldPruning"],
      },
    });
  });

  test.each(["minDist", "maxDist", "numBins", "maxAllowedMaf"])(
    "an ldDecay job whose %s is a text is wrongType",
    (name) => {
      const job = { ...LD_DECAY_JOB, [name]: "100000" };
      expect(parseToRunner({ ...RUN, job })).toMatchObject({
        ok: false,
        error: { kind: "wrongType", path: `job.${name}` },
      });
    },
  );

  test("an ldDecay job whose population is not a pair is wrongLength", () => {
    const job = { ...LD_DECAY_JOB, pops: [["pop_a", ["i000"], "pop_b"]] };
    expect(parseToRunner({ ...RUN, job })).toMatchObject({
      ok: false,
      error: { kind: "wrongLength", path: "job.pops.0" },
    });
  });

  test.each([
    ["calculation", parseFromRunner],
    ["light", parseFromFilesRunner],
  ])(
    "a ready of protocol 3, stage 4's, with no other field, from the %s worker, is otherProtocol",
    (_name, parse) => {
      expect(parse({ kind: "ready", protocol: 3 })).toEqual({
        ok: false,
        error: { kind: "otherProtocol", found: 3 },
      });
    },
  );

  test.each([
    ["calculation", parseFromRunner],
    ["light", parseFromFilesRunner],
  ])(
    "a ready of protocol 4, stage 5's, with no other field, from the %s worker, is otherProtocol",
    (_name, parse) => {
      expect(parse({ kind: "ready", protocol: 4 })).toEqual({
        ok: false,
        error: { kind: "otherProtocol", found: 4 },
      });
    },
  );

  test.each([
    ["calculation", parseFromRunner],
    ["light", parseFromFilesRunner],
  ])(
    "a ready of protocol 5, before the ploidy read from the file, with no other field, from the %s worker, is otherProtocol",
    (_name, parse) => {
      expect(parse({ kind: "ready", protocol: 5 })).toEqual({
        ok: false,
        error: { kind: "otherProtocol", found: 5 },
      });
    },
  );

  test.each([
    ["calculation", parseFromRunner],
    ["light", parseFromFilesRunner],
  ])(
    'a ready of protocol "4", from the %s worker, is wrongType',
    (_name, parse) => {
      expect(parse({ kind: "ready", protocol: "4" })).toEqual({
        ok: false,
        error: {
          kind: "wrongType",
          messageKind: "ready",
          path: "protocol",
          expected: "a number",
          found: "string",
        },
      });
    },
  );

  test.each([
    ["calculation", parseFromRunner],
    ["light", parseFromFilesRunner],
  ])(
    "a ready of protocol 6, before the missing rate of the variants, with no other field, from the %s worker, is otherProtocol",
    (_name, parse) => {
      expect(parse({ kind: "ready", protocol: 6 })).toEqual({
        ok: false,
        error: { kind: "otherProtocol", found: 6 },
      });
    },
  );

  test.each([
    ["calculation", parseFromRunner],
    ["light", parseFromFilesRunner],
  ])(
    "a ready of protocol 10, with the count of the FILTER failures, with no other field, from the %s worker, is otherProtocol",
    (_name, parse) => {
      expect(parse({ kind: "ready", protocol: 10 })).toEqual({
        ok: false,
        error: { kind: "otherProtocol", found: 10 },
      });
    },
  );

  test.each([
    ["calculation", parseFromRunner],
    ["light", parseFromFilesRunner],
  ])(
    "a ready of protocol 11, before the filter of the FILTER column and before the summary gave the FILTER failures, with no other field, from the %s worker, is otherProtocol",
    (_name, parse) => {
      expect(parse({ kind: "ready", protocol: 11 })).toEqual({
        ok: false,
        error: { kind: "otherProtocol", found: 11 },
      });
    },
  );

  test.each([
    ["calculation", parseFromRunner],
    ["light", parseFromFilesRunner],
  ])(
    "a ready of protocol 12, with the filter of the FILTER column or with the summary's FILTER failures but not both, with no other field, from the %s worker, is otherProtocol",
    (_name, parse) => {
      expect(parse({ kind: "ready", protocol: 12 })).toEqual({
        ok: false,
        error: { kind: "otherProtocol", found: 12 },
      });
    },
  );
});

// The job and the result of the distances between populations, stage 5
// (docs/specs/worker/messages.md, "How it is verified").

const POP_DISTS_JOB: PopDistsJob = {
  analysis: "popDists",
  fileId: "load-a",
  filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.1 }],
  individuals: null,
  pops: [
    ["p0", ["s000", "s001"]],
    ["p2", ["s002"]],
    ["p1", ["s003"]],
  ],
  leftOut: [["p3", 12]],
  minNumIndividuals: 20,
};

/** A result of the distances of p0, p2 and p1, the numbers of panel.nei at
    the missing data filter at 0.1, ordered along the first axis of each
    measure. */
const POP_DISTS_RESULT: PopDistsResult = {
  analysis: "popDists",
  pops: ["p0", "p2", "p1"],
  numIndividuals: Uint32Array.of(48, 84, 68),
  fst: Float64Array.of(
    0.10273588423661377,
    0.10496244498389443,
    0.10962148955018115,
  ),
  dest: Float64Array.of(
    0.06129813142463423,
    0.06354346296076403,
    0.06567052128821259,
  ),
  numVarsPerPair: Uint32Array.of(1200, 1200, 1200),
  order: {
    fst: { kind: "pcoa", order: Uint32Array.of(1, 0, 2) },
    dest: { kind: "pcoa", order: Uint32Array.of(1, 0, 2) },
  },
  leftOut: [["p3", 12]],
  passStats: {
    numVars: 1200,
    filtering: { missing_data: { varsProcessed: 1200, varsKept: 1200 } },
  },
};

describe("PA3 D1 the messages of the distances", () => {
  test.each([
    ["over every individual", POP_DISTS_JOB],
    [
      "with a list of individuals and no population left out",
      {
        ...POP_DISTS_JOB,
        individuals: ["s000", "s001", "s002", "s003"],
        leftOut: [],
      },
    ],
  ])("parseToRunner accepts a run of the distances %s", (_name, job) => {
    const run = { ...RUN, job };
    expect(parseToRunner(run)).toEqual({ ok: true, value: run });
  });

  test.each<[string, PopDistsResult["order"]]>([
    ["of the kind pcoa for both measures", POP_DISTS_RESULT.order],
    [
      "of the file, for a pair of no distance and for every distance 0",
      {
        fst: { kind: "file", reason: "noDistance" },
        dest: { kind: "file", reason: "allZero" },
      },
    ],
    [
      "of the file, for a refusal of popnei, with its message, beside one of the PCoA",
      {
        fst: {
          kind: "file",
          reason: "notPlaced",
          message: "popnei: the linear algebra could not be done",
        },
        dest: { kind: "pcoa", order: Uint32Array.of(2, 1, 0) },
      },
    ],
  ])(
    "parseFromRunner accepts a result of the distances with orders %s",
    (_name, order) => {
      const message = resultMessage({ ...POP_DISTS_RESULT, order });
      expect(parseFromRunner(message)).toEqual({ ok: true, value: message });
    },
  );

  test("parseFromRunner accepts a result of two populations whose orders are twoPopulations", () => {
    const message = resultMessage({
      ...POP_DISTS_RESULT,
      pops: ["p2", "p1"],
      numIndividuals: Uint32Array.of(84, 68),
      fst: Float64Array.of(0.10962148955018115),
      dest: Float64Array.of(0.06567052128821259),
      numVarsPerPair: Uint32Array.of(1200),
      order: {
        fst: { kind: "file", reason: "twoPopulations" },
        dest: { kind: "file", reason: "twoPopulations" },
      },
      leftOut: [
        ["p0a", 24],
        ["p0b", 24],
      ],
    });
    expect(parseFromRunner(message)).toEqual({ ok: true, value: message });
  });

  test("a result of three populations with two values of fst is wrongLength", () => {
    const result = {
      ...POP_DISTS_RESULT,
      fst: POP_DISTS_RESULT.fst.slice(0, 2),
    };
    expect(parseFromRunner(resultMessage(result))).toEqual({
      ok: false,
      error: {
        kind: "wrongLength",
        messageKind: "result",
        path: "result.fst",
        expected: 3,
        found: 2,
      },
    });
  });

  test.each([
    ["dest", new Float64Array(4)],
    ["numVarsPerPair", new Uint32Array(2)],
    ["numIndividuals", new Uint32Array(2)],
  ])(
    "a result of three populations whose %s is not as long is wrongLength",
    (name, array) => {
      const result = { ...POP_DISTS_RESULT, [name]: array };
      expect(parseFromRunner(resultMessage(result))).toMatchObject({
        ok: false,
        error: { kind: "wrongLength", path: `result.${name}` },
      });
    },
  );

  test("a result whose numVarsPerPair is a Float64Array is wrongType", () => {
    const result = {
      ...POP_DISTS_RESULT,
      numVarsPerPair: Float64Array.of(1200, 1200, 1200),
    };
    expect(parseFromRunner(resultMessage(result))).toMatchObject({
      ok: false,
      error: { kind: "wrongType", path: "result.numVarsPerPair" },
    });
  });

  test.each([
    ["[0, 0, 2], which holds 0 twice and 1 never", [0, 0, 2]],
    ["[0, 1, 3], which holds an index beyond the three populations", [0, 1, 3]],
  ])("an order of the kind pcoa of %s is refused", (_name, indexes) => {
    const result = {
      ...POP_DISTS_RESULT,
      order: {
        ...POP_DISTS_RESULT.order,
        dest: { kind: "pcoa", order: Uint32Array.from(indexes) },
      },
    };
    expect(parseFromRunner(resultMessage(result))).toMatchObject({
      ok: false,
      error: {
        kind: "wrongType",
        path: "result.order.dest.order",
        expected:
          "a Uint32Array that holds each index of the 3 populations once",
      },
    });
  });

  test("an order of the kind pcoa of two indexes for three populations is wrongLength", () => {
    const result = {
      ...POP_DISTS_RESULT,
      order: {
        ...POP_DISTS_RESULT.order,
        fst: { kind: "pcoa", order: Uint32Array.of(1, 0) },
      },
    };
    expect(parseFromRunner(resultMessage(result))).toMatchObject({
      ok: false,
      error: {
        kind: "wrongLength",
        path: "result.order.fst.order",
        expected: 3,
        found: 2,
      },
    });
  });

  test("an order notPlaced without its message is missingFields", () => {
    const result = {
      ...POP_DISTS_RESULT,
      order: {
        ...POP_DISTS_RESULT.order,
        fst: { kind: "file", reason: "notPlaced" },
      },
    };
    expect(parseFromRunner(resultMessage(result))).toEqual({
      ok: false,
      error: {
        kind: "missingFields",
        messageKind: "result",
        path: "result.order.fst",
        fields: ["message"],
      },
    });
  });

  test("an order of another reason with a message is extraFields", () => {
    const result = {
      ...POP_DISTS_RESULT,
      order: {
        ...POP_DISTS_RESULT.order,
        fst: { kind: "file", reason: "noDistance", message: "no distance" },
      },
    };
    expect(parseFromRunner(resultMessage(result))).toEqual({
      ok: false,
      error: {
        kind: "extraFields",
        messageKind: "result",
        path: "result.order.fst",
        fields: ["message"],
      },
    });
  });

  test("an order of the file whose reason is not one of the four is unknownValue", () => {
    const result = {
      ...POP_DISTS_RESULT,
      order: {
        ...POP_DISTS_RESULT.order,
        dest: { kind: "file", reason: "notEuclidean" },
      },
    };
    expect(parseFromRunner(resultMessage(result))).toMatchObject({
      ok: false,
      error: {
        kind: "unknownValue",
        path: "result.order.dest.reason",
        found: "notEuclidean",
      },
    });
  });

  test("an order of a kind that is not pcoa nor file is unknownValue, and a result without the order of dest is missingFields", () => {
    const tree = {
      ...POP_DISTS_RESULT,
      order: { ...POP_DISTS_RESULT.order, fst: { kind: "tree" } },
    };
    expect(parseFromRunner(resultMessage(tree))).toMatchObject({
      ok: false,
      error: { kind: "unknownValue", path: "result.order.fst.kind" },
    });
    const noDest = {
      ...POP_DISTS_RESULT,
      order: { fst: POP_DISTS_RESULT.order.fst },
    };
    expect(parseFromRunner(resultMessage(noDest))).toMatchObject({
      ok: false,
      error: {
        kind: "missingFields",
        path: "result.order",
        fields: ["dest"],
      },
    });
  });

  test.each([
    ["a count that is not whole", [["p3", 12.5]], "leftOut.0.1"],
    ["a name that is a number", [[3, 12]], "leftOut.0.0"],
  ])(
    "a job and a result whose leftOut holds %s are wrongType",
    (_name, left, path) => {
      expect(
        parseToRunner({ ...RUN, job: { ...POP_DISTS_JOB, leftOut: left } }),
      ).toMatchObject({
        ok: false,
        error: { kind: "wrongType", path: `job.${path}` },
      });
      expect(
        parseFromRunner(resultMessage({ ...POP_DISTS_RESULT, leftOut: left })),
      ).toMatchObject({
        ok: false,
        error: { kind: "wrongType", path: `result.${path}` },
      });
    },
  );

  test("a popDists job without leftOut is missingFields, and one with a measure is extraFields", () => {
    const without = Object.fromEntries(
      Object.entries(POP_DISTS_JOB).filter(([name]) => name !== "leftOut"),
    );
    expect(parseToRunner({ ...RUN, job: without })).toEqual({
      ok: false,
      error: {
        kind: "missingFields",
        messageKind: "run",
        path: "job",
        fields: ["leftOut"],
      },
    });
    expect(
      parseToRunner({ ...RUN, job: { ...POP_DISTS_JOB, measure: "fst" } }),
    ).toEqual({
      ok: false,
      error: {
        kind: "extraFields",
        messageKind: "run",
        path: "job",
        fields: ["measure"],
      },
    });
  });
});

/** A diversity job of stage 5 over three populations, p0, p2 and p1, all
    three given to calcPopDiversity. */
const DIVERSITY_JOB_5: DiversityJob = {
  ...JOB,
  pops: [
    ["p0", ["s000", "s003"]],
    ["p2", ["s001"]],
    ["p1", ["s002"]],
  ],
  minNumIndividuals: 1,
  numCalledAlleles: 40,
  popDiversityPops: ["p0", "p2", "p1"],
};

/** A diversity result of stage 5 of p2 and p1, given to calcPopDiversity,
    and p0, of 12 individuals, not given, at the draw of 40: 21 values in
    each spectrum. The numbers of diversity.md, p0 cut to 12. */
const DIVERSITY_RESULT_5: DiversityResult = {
  analysis: "diversity",
  pops: ["p0", "p2", "p1"],
  numIndividuals: Uint32Array.of(12, 84, 68),
  unbiasedExpHet: Float64Array.of(NaN, 0.3440824705971255, 0.3498365468860467),
  obsHet: Float64Array.of(NaN, 0.3512406974637824, 0.35603713961547323),
  polyRatio: Float64Array.of(NaN, 0.9105902777777778, 0.9157986111111112),
  numVarsWithValue: Uint32Array.of(0, 1152, 1152),
  fis: Float64Array.of(NaN, -0.020803811522959625, -0.017724256612463796),
  numAllelesMean: Float64Array.of(NaN, 1.9861111111111112, 1.9809027777777777),
  numAllelesInDraw: Float64Array.of(
    NaN,
    1.9595644507442256,
    1.9582701017879214,
  ),
  privateAllelesTotal: Float64Array.of(NaN, 22, 16),
  privateAllelesMean: Float64Array.of(
    NaN,
    0.019097222222222224,
    0.013888888888888888,
  ),
  privateAllelesInDraw: Float64Array.of(
    NaN,
    0.038418511541450096,
    0.037124162585145296,
  ),
  numVarsInDraw: Uint32Array.of(0, 1152, 1152),
  numVarsEveryPop: 1152,
  numVarsEveryPopInDraw: 1152,
  numCalledAlleles: 40,
  foldedSfs: [null, new Float64Array(21), new Float64Array(21)],
  passStats: {
    numVars: 1152,
    filtering: { missing_data: { varsProcessed: 1200, varsKept: 1152 } },
  },
};

describe("PA6 D1 the messages of the diversity of stage 5", () => {
  test("parseToRunner accepts a run of the diversity with the draw and the populations of calcPopDiversity", () => {
    for (const popDiversityPops of [["p0", "p2", "p1"], ["p2"], []]) {
      const run = { ...RUN, job: { ...DIVERSITY_JOB_5, popDiversityPops } };
      expect(parseToRunner(run)).toEqual({ ok: true, value: run });
    }
  });

  test("parseFromRunner accepts a result with its spectra, a population not given to calcPopDiversity among them", () => {
    const message = resultMessage(DIVERSITY_RESULT_5);
    expect(parseFromRunner(message)).toEqual({ ok: true, value: message });
  });

  test("a diversity job with numCalledAlleles 1, below popnei's smallest draw, is wrongType, and so are 0 and 2.5", () => {
    for (const numCalledAlleles of [1, 0, 2.5]) {
      expect(
        parseToRunner({
          ...RUN,
          job: { ...DIVERSITY_JOB_5, numCalledAlleles },
        }),
      ).toMatchObject({
        ok: false,
        error: {
          kind: "wrongType",
          path: "job.numCalledAlleles",
          expected: "a whole number of 2 or more",
        },
      });
    }
  });

  test("a diversity job whose popDiversityPops names a population not in pops is wrongType", () => {
    const job = { ...DIVERSITY_JOB_5, popDiversityPops: ["p0", "p3"] };
    expect(parseToRunner({ ...RUN, job })).toMatchObject({
      ok: false,
      error: { kind: "wrongType", path: "job.popDiversityPops" },
    });
  });

  test("a diversity job whose popDiversityPops holds two populations in another order than theirs, or one twice, is wrongType", () => {
    for (const popDiversityPops of [
      ["p2", "p0"],
      ["p0", "p1", "p2"],
      ["p2", "p2"],
    ]) {
      const job = { ...DIVERSITY_JOB_5, popDiversityPops };
      expect(parseToRunner({ ...RUN, job })).toMatchObject({
        ok: false,
        error: { kind: "wrongType", path: "job.popDiversityPops" },
      });
    }
  });

  test("a diversity job without the two fields of stage 5 is missingFields", () => {
    const stage4 = Object.fromEntries(
      Object.entries(DIVERSITY_JOB_5).filter(
        ([name]) => name !== "numCalledAlleles" && name !== "popDiversityPops",
      ),
    );
    expect(parseToRunner({ ...RUN, job: stage4 })).toEqual({
      ok: false,
      error: {
        kind: "missingFields",
        messageKind: "run",
        path: "job",
        fields: ["numCalledAlleles", "popDiversityPops"],
      },
    });
  });

  test("a diversity result with numVarsEveryPop a number and numVarsEveryPopInDraw null, or the other way round, is wrongType", () => {
    for (const [numVarsEveryPop, numVarsEveryPopInDraw] of [
      [1152, null],
      [null, 1152],
    ]) {
      const result = {
        ...DIVERSITY_RESULT_5,
        numVarsEveryPop,
        numVarsEveryPopInDraw,
      };
      expect(parseFromRunner(resultMessage(result))).toMatchObject({
        ok: false,
        error: { kind: "wrongType", path: "result.numVarsEveryPopInDraw" },
      });
    }
  });

  test("a diversity result whose foldedSfs holds 20 values for a draw of 40 is wrongLength", () => {
    const result = {
      ...DIVERSITY_RESULT_5,
      foldedSfs: [null, new Float64Array(21), new Float64Array(20)],
    };
    expect(parseFromRunner(resultMessage(result))).toEqual({
      ok: false,
      error: {
        kind: "wrongLength",
        messageKind: "result",
        path: "result.foldedSfs.2",
        expected: 21,
        found: 20,
      },
    });
  });

  test("a diversity result with fewer spectra than populations, or a spectrum that is a list of numbers, is refused", () => {
    expect(
      parseFromRunner(
        resultMessage({ ...DIVERSITY_RESULT_5, foldedSfs: [null, null] }),
      ),
    ).toMatchObject({
      ok: false,
      error: { kind: "wrongLength", path: "result.foldedSfs", expected: 3 },
    });
    expect(
      parseFromRunner(
        resultMessage({
          ...DIVERSITY_RESULT_5,
          foldedSfs: [null, new Array<number>(21).fill(0), null],
        }),
      ),
    ).toMatchObject({
      ok: false,
      error: { kind: "wrongType", path: "result.foldedSfs.1" },
    });
  });

  test.each([
    "fis",
    "numAllelesMean",
    "numAllelesInDraw",
    "privateAllelesTotal",
    "privateAllelesMean",
    "privateAllelesInDraw",
  ])(
    "a diversity result of three populations whose %s holds two values is wrongLength",
    (name) => {
      const result = { ...DIVERSITY_RESULT_5, [name]: new Float64Array(2) };
      expect(parseFromRunner(resultMessage(result))).toMatchObject({
        ok: false,
        error: { kind: "wrongLength", path: `result.${name}`, expected: 3 },
      });
    },
  );

  test("a diversity result whose numVarsInDraw holds four values, or whose privateAllelesTotal is popnei's Uint32Array, is refused", () => {
    expect(
      parseFromRunner(
        resultMessage({
          ...DIVERSITY_RESULT_5,
          numVarsInDraw: new Uint32Array(4),
        }),
      ),
    ).toMatchObject({
      ok: false,
      error: { kind: "wrongLength", path: "result.numVarsInDraw" },
    });
    expect(
      parseFromRunner(
        resultMessage({
          ...DIVERSITY_RESULT_5,
          privateAllelesTotal: Uint32Array.of(0, 22, 16),
        }),
      ),
    ).toMatchObject({
      ok: false,
      error: { kind: "wrongType", path: "result.privateAllelesTotal" },
    });
  });

  test("a diversity result whose numCalledAlleles is 1 is wrongType", () => {
    const result = { ...DIVERSITY_RESULT_5, numCalledAlleles: 1 };
    expect(parseFromRunner(resultMessage(result))).toMatchObject({
      ok: false,
      error: { kind: "wrongType", path: "result.numCalledAlleles" },
    });
  });
});

// The job and the result of the summary of the variants file
// (docs/plans/open-variants.md, "The phases", 1; docs/plans/live-stats.md,
// phase 1).

const VARIANTS_SUMMARY_JOB: VariantsSummaryJob = {
  analysis: "variantsSummary",
  fileId: "load-a",
  filters: [],
  minNumIndividuals: 0,
  numBins: 2,
  range: [0, 1],
};
const SUMMARY_PASS = { numVars: 500, filtering: {} };
const VARIANTS_SUMMARY_RESULT: VariantsSummaryResult = {
  analysis: "variantsSummary",
  chroms: ["chr1", "chr2"],
  numVarsPerChrom: Uint32Array.of(250, 250),
  perVar: {
    binEdges: Float64Array.of(0, 0.5, 1),
    missingRate: { mean: 0.1, counts: Uint32Array.of(500, 0) },
    maf: { mean: 0.8, counts: Uint32Array.of(0, 500) },
    obsHet: { mean: 0.3, counts: Uint32Array.of(500, 0) },
    unbiasedExpHet: { mean: 0.3, counts: Uint32Array.of(500, 0) },
    passStats: SUMMARY_PASS,
  },
  perIndividual: {
    individuals: ["a", "b"],
    missingGtRate: Float64Array.of(0.1, 0.2),
    obsHetRate: Float64Array.of(0.3, Number.NaN),
    passStats: SUMMARY_PASS,
  },
  passStats: SUMMARY_PASS,
  filterColumn: { passed: 400, failed: 100 },
};

describe("open-variants 1 the messages of the summary of the variants file", () => {
  test("its job and its result are accepted as they are", () => {
    const run = { ...RUN, job: VARIANTS_SUMMARY_JOB };
    expect(parseToRunner(run)).toEqual({ ok: true, value: run });
    const message = resultMessage(VARIANTS_SUMMARY_RESULT);
    expect(parseFromRunner(message)).toEqual({ ok: true, value: message });
  });

  test("live-stats 2 a result so far of the summary is accepted as it is, and is checked as the result is", () => {
    const message = {
      kind: "soFar",
      id: 2,
      key: "k1",
      result: VARIANTS_SUMMARY_RESULT,
    };
    expect(parseFromRunner(message)).toEqual({ ok: true, value: message });
    expect(
      parseFromRunner({
        ...message,
        result: {
          ...VARIANTS_SUMMARY_RESULT,
          numVarsPerChrom: Uint32Array.of(250),
        },
      }),
    ).toMatchObject({
      ok: false,
      error: {
        kind: "wrongLength",
        messageKind: "soFar",
        path: "result.numVarsPerChrom",
        expected: 2,
        found: 1,
      },
    });
    expect(parseFromRunner({ ...message, progress: 1 })).toEqual({
      ok: false,
      error: {
        kind: "extraFields",
        messageKind: "soFar",
        path: "",
        fields: ["progress"],
      },
    });
    expect(
      parseFromRunner({
        kind: "soFar",
        id: 2,
        result: VARIANTS_SUMMARY_RESULT,
      }),
    ).toEqual({
      ok: false,
      error: {
        kind: "missingFields",
        messageKind: "soFar",
        path: "",
        fields: ["key"],
      },
    });
  });

  test("a result of no chromosome, as a pass refused never gives but the check allows, is accepted", () => {
    const message = resultMessage({
      ...VARIANTS_SUMMARY_RESULT,
      chroms: [],
      numVarsPerChrom: new Uint32Array(0),
    });
    expect(parseFromRunner(message)).toEqual({ ok: true, value: message });
  });

  test("a job with a filter is wrongLength, and one with a list of individuals extraFields", () => {
    expect(
      parseToRunner({
        ...RUN,
        job: { ...VARIANTS_SUMMARY_JOB, filters: FILTERS_AT_0_05 },
      }),
    ).toEqual({
      ok: false,
      error: {
        kind: "wrongLength",
        messageKind: "run",
        path: "job.filters",
        expected: 0,
        found: 1,
      },
    });
    expect(
      parseToRunner({
        ...RUN,
        job: { ...VARIANTS_SUMMARY_JOB, individuals: null },
      }),
    ).toEqual({
      ok: false,
      error: {
        kind: "extraFields",
        messageKind: "run",
        path: "job",
        fields: ["individuals"],
      },
    });
  });

  test("a result with a count fewer than its chromosomes is wrongLength", () => {
    const result = {
      ...VARIANTS_SUMMARY_RESULT,
      numVarsPerChrom: Uint32Array.of(250),
    };
    expect(parseFromRunner(resultMessage(result))).toMatchObject({
      ok: false,
      error: {
        kind: "wrongLength",
        path: "result.numVarsPerChrom",
        expected: 2,
        found: 1,
      },
    });
  });

  test("a result whose counts are an array of numbers, or a Float64Array, is wrongType", () => {
    for (const numVarsPerChrom of [[250, 250], Float64Array.of(250, 250)]) {
      expect(
        parseFromRunner(
          resultMessage({ ...VARIANTS_SUMMARY_RESULT, numVarsPerChrom }),
        ),
      ).toMatchObject({
        ok: false,
        error: { kind: "wrongType", path: "result.numVarsPerChrom" },
      });
    }
  });

  test("a result whose chromosome is a number is wrongType, and one without its passStats missingFields", () => {
    expect(
      parseFromRunner(
        resultMessage({ ...VARIANTS_SUMMARY_RESULT, chroms: ["chr1", 2] }),
      ),
    ).toMatchObject({
      ok: false,
      error: { kind: "wrongType", path: "result.chroms.1" },
    });
    const without = Object.fromEntries(
      Object.entries(VARIANTS_SUMMARY_RESULT).filter(
        ([name]) => name !== "passStats",
      ),
    );
    expect(parseFromRunner(resultMessage(without))).toMatchObject({
      ok: false,
      error: {
        kind: "missingFields",
        path: "result",
        fields: ["passStats"],
      },
    });
  });

  test("a part of the statistics is checked as the result of its own request: counts fewer than the edges, or an array of the individuals shorter than they are, is wrongLength", () => {
    const perVar = {
      ...VARIANTS_SUMMARY_RESULT.perVar,
      maf: { mean: 0.8, counts: Uint32Array.of(500) },
    };
    expect(
      parseFromRunner(resultMessage({ ...VARIANTS_SUMMARY_RESULT, perVar })),
    ).toMatchObject({
      ok: false,
      error: {
        kind: "wrongLength",
        path: "result.perVar.maf.counts",
        expected: 2,
        found: 1,
      },
    });
    const perIndividual = {
      ...VARIANTS_SUMMARY_RESULT.perIndividual,
      obsHetRate: Float64Array.of(0.3),
    };
    expect(
      parseFromRunner(
        resultMessage({ ...VARIANTS_SUMMARY_RESULT, perIndividual }),
      ),
    ).toMatchObject({
      ok: false,
      error: {
        kind: "wrongLength",
        path: "result.perIndividual.obsHetRate",
        expected: 2,
        found: 1,
      },
    });
  });

  test("a part with the field analysis of its own result is extraFields, and a summary without its parts missingFields", () => {
    const perVar = {
      ...VARIANTS_SUMMARY_RESULT.perVar,
      analysis: "variantChecks",
    };
    expect(
      parseFromRunner(resultMessage({ ...VARIANTS_SUMMARY_RESULT, perVar })),
    ).toMatchObject({
      ok: false,
      error: {
        kind: "extraFields",
        path: "result.perVar",
        fields: ["analysis"],
      },
    });
    const without = Object.fromEntries(
      Object.entries(VARIANTS_SUMMARY_RESULT).filter(
        ([name]) => name !== "perVar" && name !== "perIndividual",
      ),
    );
    expect(parseFromRunner(resultMessage(without))).toMatchObject({
      ok: false,
      error: {
        kind: "missingFields",
        path: "result",
        fields: ["perVar", "perIndividual"],
      },
    });
  });

  test("a job without the bins of the histograms is missingFields", () => {
    const withoutBins = Object.fromEntries(
      Object.entries(VARIANTS_SUMMARY_JOB).filter(
        ([name]) => name !== "numBins",
      ),
    );
    expect(parseToRunner({ ...RUN, job: withoutBins })).toMatchObject({
      ok: false,
      error: { kind: "missingFields", path: "job", fields: ["numBins"] },
    });
  });

  test("popnei-0.2.2 its counts of the FILTER may be null", () => {
    const message = resultMessage({
      ...VARIANTS_SUMMARY_RESULT,
      filterColumn: null,
    });
    expect(parseFromRunner(message)).toEqual({ ok: true, value: message });
  });

  test.each([
    [
      "a count not whole",
      { passed: 1, failed: 1.5 },
      { kind: "wrongType", path: "result.filterColumn.failed" },
    ],
    [
      "a count missing",
      { passed: 1 },
      {
        kind: "missingFields",
        path: "result.filterColumn",
        fields: ["failed"],
      },
    ],
    [
      "a field more",
      { passed: 1, failed: 1, x: 0 },
      { kind: "extraFields", path: "result.filterColumn", fields: ["x"] },
    ],
    [
      "a string",
      "1 failed",
      { kind: "wrongType", path: "result.filterColumn" },
    ],
  ])(
    "popnei-0.2.2 its counts of the FILTER with %s are refused",
    (_name, filterColumn, error) => {
      expect(
        parseFromRunner(
          resultMessage({ ...VARIANTS_SUMMARY_RESULT, filterColumn }),
        ),
      ).toMatchObject({ ok: false, error });
    },
  );
});

describe("one-pass the count of the FILTER failures is no longer a message", () => {
  test("its job is refused", () => {
    expect(
      parseToRunner({
        ...RUN,
        job: { analysis: "filterFailures", fileId: "load-1", filters: [] },
      }),
    ).toMatchObject({
      ok: false,
      error: {
        kind: "unknownValue",
        path: "job.analysis",
        found: "filterFailures",
      },
    });
  });
});

// The filter of the FILTER column in the messages, from 7 October 2026
// (docs/specs/worker/messages.md, "How it is verified"; the numbers are
// those of low_qual.vcf.gz under passed and the missing data filter).

describe("SF1 D2 the filter of the FILTER column in the messages", () => {
  const PASSED_AND_MISSING = [
    { kind: "passed" },
    { kind: "missing_data", maxAllowedMissingRate: 0.05 },
  ] as const;

  test("parseToRunner accepts a diversity job whose filters are passed and the missing data filter", () => {
    const run = { ...RUN, job: { ...JOB, filters: PASSED_AND_MISSING } };
    expect(parseToRunner(run)).toEqual({ ok: true, value: run });
  });

  test("parseToRunner accepts a write whose filters are passed and the missing data filter", () => {
    const write = {
      kind: "write",
      id: 5,
      key: "k2",
      job: { ...WRITE_JOB, filters: PASSED_AND_MISSING },
    };
    expect(parseToRunner(write)).toEqual({ ok: true, value: write });
  });

  test("parseFromRunner accepts a result whose counts hold passed before missing_data, and keeps that order", () => {
    const message = resultMessage({
      ...RESULT,
      passStats: {
        numVars: 865,
        filtering: {
          passed: { varsProcessed: 1200, varsKept: 900 },
          missing_data: { varsProcessed: 900, varsKept: 865 },
        },
      },
    });
    const checked = parseFromRunner(message);
    expect(checked).toEqual({ ok: true, value: message });
    expect(
      checked.ok && checked.value.kind === "result"
        ? Object.keys(checked.value.result.passStats.filtering)
        : null,
    ).toEqual(["passed", "missing_data"]);
  });

  test("a filter passed with a threshold in a diversity job is extraFields at job.filters.0", () => {
    const job = {
      ...JOB,
      filters: [{ kind: "passed", maxAllowedMissingRate: 0.1 }],
    };
    expect(parseToRunner({ ...RUN, job })).toEqual({
      ok: false,
      error: {
        kind: "extraFields",
        messageKind: "run",
        path: "job.filters.0",
        fields: ["maxAllowedMissingRate"],
      },
    });
  });
});

describe("SF2 D1 whether the variants record their FILTER, in the messages", () => {
  test.each([true, false])(
    "parseFromRunner accepts an opened with keepsPassed %s",
    (keepsPassed) => {
      const message = {
        kind: "opened",
        id: 1,
        individuals: ["s000", "s001"],
        ploidy: 2,
        keepsPassed,
      };
      expect(parseFromRunner(message)).toEqual({ ok: true, value: message });
    },
  );

  test("an opened without keepsPassed is missingFields", () => {
    expect(
      parseFromRunner({
        kind: "opened",
        id: 1,
        individuals: ["s000"],
        ploidy: 2,
      }),
    ).toEqual({
      ok: false,
      error: {
        kind: "missingFields",
        messageKind: "opened",
        path: "",
        fields: ["keepsPassed"],
      },
    });
  });

  test('an opened with keepsPassed "true" is wrongType', () => {
    expect(
      parseFromRunner({
        kind: "opened",
        id: 1,
        individuals: ["s000"],
        ploidy: 2,
        keepsPassed: "true",
      }),
    ).toEqual({
      ok: false,
      error: {
        kind: "wrongType",
        messageKind: "opened",
        path: "keepsPassed",
        expected: "a boolean",
        found: "string",
      },
    });
  });

  test.each([
    ["calculation", parseFromRunner],
    ["light", parseFromFilesRunner],
  ])(
    "a ready of protocol 13, before opened gave keepsPassed, with no other field, from the %s worker, is otherProtocol",
    (_name, parse) => {
      expect(parse({ kind: "ready", protocol: 13 })).toEqual({
        ok: false,
        error: { kind: "otherProtocol", found: 13 },
      });
    },
  );
});

describe("DL2 D2 the messages of a write of a VCF", () => {
  const WRITE = { kind: "write", id: 5, key: "k2", job: WRITE_JOB };

  test("parseToRunner accepts a write of the format vcf", () => {
    const write = { ...WRITE, job: { ...WRITE_JOB, format: "vcf" } };
    expect(parseToRunner(write)).toEqual({ ok: true, value: write });
  });

  test("parseFromRunner accepts a written of the format vcf, and keeps its Blob", () => {
    const vcf = { ...WRITTEN, result: { ...WRITTEN.result, format: "vcf" } };
    const checked = parseFromRunner(vcf);
    expect(checked).toEqual({ ok: true, value: vcf });
    expect(
      checked.ok &&
        checked.value.kind === "written" &&
        checked.value.result.file,
    ).toBe(WRITTEN.result.file);
  });

  test.each(["bcf", "vcf.gz"])(
    "a write of the format %s is unknownValue at job.format, which expects nei and vcf",
    (format) => {
      expect(
        parseToRunner({ ...WRITE, job: { ...WRITE_JOB, format } }),
      ).toEqual({
        ok: false,
        error: {
          kind: "unknownValue",
          messageKind: "write",
          path: "job.format",
          found: format,
          expected: ["nei", "vcf"],
        },
      });
    },
  );

  test.each(["bcf", "vcf.gz"])(
    "a written of the format %s is unknownValue at result.format, which expects nei and vcf",
    (format) => {
      expect(
        parseFromRunner({
          ...WRITTEN,
          result: { ...WRITTEN.result, format },
        }),
      ).toEqual({
        ok: false,
        error: {
          kind: "unknownValue",
          messageKind: "written",
          path: "result.format",
          found: format,
          expected: ["nei", "vcf"],
        },
      });
    },
  );

  test("the version of the messages is 15", () => {
    expect(PROTOCOL_VERSION).toBe(15);
  });

  test.each([
    ["calculation", parseFromRunner],
    ["light", parseFromFilesRunner],
  ])(
    "a ready of protocol 14, before a write could be of a VCF, with no other field, from the %s worker, is otherProtocol",
    (_name, parse) => {
      expect(parse({ kind: "ready", protocol: 14 })).toEqual({
        ok: false,
        error: { kind: "otherProtocol", found: 14 },
      });
    },
  );
});

describe("IN1 D2 the failed read carries the format of its file", () => {
  /** An answer of the light worker whose read failed as `read` says. */
  function failedAnswer(read: Record<string, unknown>): unknown {
    return { kind: "individuals", id: 7, read };
  }

  test.each([["text"], ["xlsx"], [null]] as const)(
    "a failed read of the format %o is accepted",
    (format) => {
      const message = failedAnswer({
        kind: "failed",
        error: { kind: "empty" },
        format,
      });
      expect(parseFromFilesRunner(message)).toEqual({
        ok: true,
        value: message,
      });
    },
  );

  test("a failed read without its format is missingFields", () => {
    expect(
      parseFromFilesRunner(
        failedAnswer({ kind: "failed", error: { kind: "empty" } }),
      ),
    ).toEqual({
      ok: false,
      error: {
        kind: "missingFields",
        messageKind: "individuals",
        path: "read",
        fields: ["format"],
      },
    });
  });

  test.each([["csv"], ["XLSX"], [""], [1]])(
    "a failed read of the format %o is refused at the format",
    (format) => {
      expect(
        parseFromFilesRunner(
          failedAnswer({ kind: "failed", error: { kind: "empty" }, format }),
        ),
      ).toMatchObject({
        ok: false,
        error: { messageKind: "individuals", path: "read.format" },
      });
    },
  );

  test.each([
    [{ kind: "notWorkbook" }],
    [{ kind: "readerNotLoaded", message: "Failed to fetch" }],
  ])("the refusal %o is accepted", (error) => {
    const message = failedAnswer({ kind: "failed", error, format: null });
    expect(parseFromFilesRunner(message)).toEqual({
      ok: true,
      value: message,
    });
  });

  test.each([
    [{ kind: "notXlsx" }],
    [{ kind: "xlsxReaderNotLoaded", message: "Failed to fetch" }],
  ])("the refusal %o, a kind of before table_io, is refused", (error) => {
    expect(
      parseFromFilesRunner(
        failedAnswer({ kind: "failed", error, format: "xlsx" }),
      ),
    ).toMatchObject({
      ok: false,
      error: {
        kind: "unknownValue",
        messageKind: "individuals",
        path: "read.error.kind",
      },
    });
  });
});
