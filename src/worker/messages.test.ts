import fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { DiversityJob, DiversityResult } from "./protocol.ts";
import {
  describeMessageError,
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
  individualFilters: [
    { kind: "keep", individuals: ["i1", "i2", "i4"] },
    { kind: "remove", individuals: ["i3"] },
    { kind: "missing_data", maxAllowedMissingRate: 0.1 },
    { kind: "obs_het", maxAllowedObsHet: 0.6 },
  ],
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
  numVars: 1152,
  numVarsRead: 1200,
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
    found: { encoding: "utf-8", separator: ",", decimal: "." },
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
      { kind: "ready", protocol: 1, popneiVersion: "0.1.0" },
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
    ["the ready of the light worker", { kind: "ready", protocol: 1 }],
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
        expected: ["open", "run"],
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
        protocol: 1,
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
    expect(parseFromRunner({ kind: "ready", protocol: 1 })).toEqual({
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
  test("a ready of protocol 2 with no other field, from the calculation worker", () => {
    expect(parseFromRunner({ kind: "ready", protocol: 2 })).toEqual({
      ok: false,
      error: { kind: "otherProtocol", found: 2 },
    });
  });

  test("a ready of protocol 2 with no other field, from the light worker", () => {
    expect(parseFromFilesRunner({ kind: "ready", protocol: 2 })).toEqual({
      ok: false,
      error: { kind: "otherProtocol", found: 2 },
    });
  });

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
      numVars: number,
      numVarsRead: number,
    }),
  );

const workerStop = fc.oneof(
  fc.record({ kind: fc.constant("crashed" as const), message: text }),
  fc.record({ kind: fc.constant("badRequest" as const), message: text }),
);

const fromRunnerMessage = fc.oneof(
  fc.record({
    kind: fc.constant("ready" as const),
    protocol: fc.constant(1),
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
    result: diversityResult,
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
      }),
    }),
  ),
  fc.record({ kind: fc.constant("failed" as const), error: fileError }),
);

const fromFilesRunnerMessage = fc.oneof(
  fc.record({ kind: fc.constant("ready" as const), protocol: fc.constant(1) }),
  fc.record({
    kind: fc.constant("individuals" as const),
    id: whole,
    read: fileRead,
  }),
  workerStop,
);
