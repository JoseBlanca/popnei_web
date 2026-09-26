import fc from "fast-check";
import { describe, expect, test } from "vitest";
import type {
  DiversityJob,
  DiversityResult,
  FilterCountsJob,
  FilterCountsResult,
  IndividualChecksJob,
  IndividualChecksResult,
  PassStats,
  VariantChecksJob,
  VariantChecksResult,
  VariantDistrib,
  WriteJob,
} from "./protocol.ts";
import {
  describeMessageError,
  messageOf,
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
};

const RESULT: DiversityResult = {
  analysis: "diversity",
  pops: ["p0", "p1"],
  numIndividuals: Uint32Array.from([2, 1]),
  unbiasedExpHet: Float64Array.from([0.31, Number.NaN]),
  obsHet: Float64Array.from([0.28, Number.NaN]),
  polyRatio: Float64Array.from([0.9, Number.NaN]),
  numVarsWithValue: Uint32Array.from([1152, 0]),
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
      { kind: "ready", protocol: 2, popneiVersion: "0.1.0" },
    ],
    ["opened", { kind: "opened", id: 1, individuals: ["i1", "i2"], ploidy: 2 }],
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
    ["the ready of the light worker", { kind: "ready", protocol: 2 }],
    ["an individuals file read", INDIVIDUALS_READ],
    [
      "an individuals file refused",
      {
        kind: "individuals",
        id: 4,
        read: { kind: "failed", error: { kind: "empty" } },
      },
    ],
    [
      "an individuals file refused with facts",
      {
        kind: "individuals",
        id: 4,
        read: {
          kind: "failed",
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
    const read = { kind: "failed", error: { kind: "tooManyColumns" } };
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
        protocol: 2,
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
    expect(parseFromRunner({ kind: "ready", protocol: 2 })).toEqual({
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
  test("a ready of protocol 3 with no other field, from the calculation worker", () => {
    expect(parseFromRunner({ kind: "ready", protocol: 3 })).toEqual({
      ok: false,
      error: { kind: "otherProtocol", found: 3 },
    });
  });

  test("a ready of protocol 3 with no other field, from the light worker", () => {
    expect(parseFromFilesRunner({ kind: "ready", protocol: 3 })).toEqual({
      ok: false,
      error: { kind: "otherProtocol", found: 3 },
    });
  });

  test.each([
    ["calculation", parseFromRunner],
    ["light", parseFromFilesRunner],
  ])(
    "a ready of protocol 3 with fields of its own, from the %s worker, is otherProtocol and not a refusal of its fields",
    (_name, parse) => {
      expect(
        parse({
          kind: "ready",
          protocol: 3,
          popneiVersion: 3,
          features: ["pca"],
        }),
      ).toEqual({
        ok: false,
        error: { kind: "otherProtocol", found: 3 },
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
  filters: FILTERS_AT_0_05,
};
const VARIANT_CHECKS_JOB: VariantChecksJob = {
  analysis: "variantChecks",
  fileId: "load-a",
  filters: [],
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

  test("a write of the format vcf, which popnei cannot write yet", () => {
    const job = { ...WRITE_JOB, format: "vcf" };
    expect(
      parseToRunner({ kind: "write", id: 5, key: "k2", job }),
    ).toMatchObject({
      ok: false,
      error: {
        kind: "unknownValue",
        messageKind: "write",
        path: "job.format",
        found: "vcf",
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
        kind: "wrongLength",
        messageKind: "written",
        path: "result.numBytes",
        expected: 3594,
        found: 3593,
      },
    });
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
  ])("a ready of protocol 3, from the %s worker", (_name, parse) => {
    expect(parse({ kind: "ready", protocol: 3 })).toEqual({
      ok: false,
      error: { kind: "otherProtocol", found: 3 },
    });
  });

  test.each([
    ["calculation", parseFromRunner],
    ["light", parseFromFilesRunner],
  ])('a ready of protocol "2", from the %s worker', (_name, parse) => {
    expect(parse({ kind: "ready", protocol: "2" })).toMatchObject({
      ok: false,
      error: { kind: "wrongType", path: "protocol", found: "string" },
    });
  });
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
      missing_data: filteringStats,
      obs_het: filteringStats,
      maf: filteringStats,
      ld: filteringStats,
    },
    { requiredKeys: [] },
  ),
});

const diversityResult: fc.Arbitrary<DiversityResult> = fc
  .array(text, { maxLength: 5 })
  .chain((pops) =>
    fc.record({
      analysis: fc.constant("diversity" as const),
      pops: fc.constant(pops),
      numIndividuals: uint32s(pops.length),
      unbiasedExpHet: float64s(pops.length),
      obsHet: float64s(pops.length),
      polyRatio: float64s(pops.length),
      numVarsWithValue: uint32s(pops.length),
      passStats,
    }),
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
const jobResult = fc.oneof(
  diversityResult,
  individualChecksResult,
  variantChecksResult,
  filterCountsResult,
);
const written = fc.nat({ max: 64 }).chain((numBytes) =>
  fc.record({
    format: fc.constant("nei" as const),
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
    protocol: fc.constant(2),
    popneiVersion: text,
  }),
  fc.record({
    kind: fc.constant("opened" as const),
    id: whole,
    individuals: fc.array(text),
    ploidy: number,
  }),
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
    one: cellValue,
    zero: cellValue,
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
      found: fc.record({
        encoding: fc.constantFrom("utf-8", "windows-1252", "utf-16"),
        separator,
        decimal: fc.constantFrom(".", ","),
        undecodedLine: fc.option(fc.integer({ min: 1, max: 100_000 }), {
          nil: null,
        }),
      }),
    }),
  ),
  fc.record({ kind: fc.constant("failed" as const), error: fileError }),
);

const fromFilesRunnerMessage = fc.oneof(
  fc.record({ kind: fc.constant("ready" as const), protocol: fc.constant(2) }),
  fc.record({
    kind: fc.constant("individuals" as const),
    id: whole,
    read: fileRead,
  }),
  workerStop,
);

// The requests of the page, drawn by fast-check.

const variantFilter = fc.oneof(
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
const diversityJob = fc.record({
  analysis: fc.constant("diversity" as const),
  fileId: text,
  filters,
  individuals: individualsKept,
  pops: fc.array(fc.tuple(text, fc.array(text, { maxLength: 3 })), {
    maxLength: 3,
  }),
  minNumIndividuals: number,
  polyThreshold: number,
});
const individualChecksJob = fc.record({
  analysis: fc.constant("individualChecks" as const),
  fileId: text,
  filters,
});
const variantChecksJob = fc.record({
  analysis: fc.constant("variantChecks" as const),
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
});
const writeJob = fc.record({
  format: fc.constant("nei" as const),
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
    readOptions: fc.record({ ploidy: number, onlyPassed: fc.boolean() }),
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
      return Object.fromEntries(
        entries.map(([name, child]) => [name, name === head ? {} : child]),
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
