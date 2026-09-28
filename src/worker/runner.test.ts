/**
 * The runner of the calculation worker in node, over the fixtures of
 * e2e/fixtures/ given as bytes (docs/specs/worker/runner.md, "How it is
 * verified"). The numbers are popnei's of the release js-v0.1.0-dev.3,
 * compared exactly: the runner passes them on with no arithmetic. They are
 * those of js-v0.1.0-dev.2 in the spec's table, but the sizes of the files
 * written, which are dev.3's own.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- the test spies on free() of popnei's Variants, which the runner never exposes
import { Variants } from "popnei";

import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
  vi,
} from "vitest";

import type {
  DiversityJob,
  DiversityResult,
  FilterCountsJob,
  IndividualChecksJob,
  IndividualChecksResult,
  JobResult,
  PassStats,
  PcaJob,
  PcaResult,
  Pops,
  Progress,
  VariantChecksJob,
  VariantFilter,
  WriteJob,
  Written,
} from "./protocol.ts";
import {
  answerOfThrown,
  createRunner,
  loadPopnei,
  transferablesOf,
} from "./runner.ts";
import type { Answer, LoadFile, LoadToOpen, Runner } from "./runner.ts";

const FIXTURES = join(import.meta.dirname, "..", "..", "e2e", "fixtures");

/** The bytes of a fixture, a copy: node keeps a small file it reads inside
    a larger buffer it shares, which popnei would be given whole. */
function bytesOf(name: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(readFileSync(join(FIXTURES, name)));
}

/** The populations of panel_pops.txt, in the order they first appear:
    p0 of 48, p2 of 84 and p1 of 68. */
function panelPops(): Pops {
  const lines = readFileSync(join(FIXTURES, "panel_pops.txt"), "utf8")
    .trim()
    .split("\n")
    .slice(1);
  const pops = new Map<string, string[]>();
  for (const line of lines) {
    const [individual, pop] = line.split("\t");
    if (individual === undefined || pop === undefined) {
      throw new Error(`a line of panel_pops.txt with no tab: ${line}`);
    }
    const members = pops.get(pop) ?? [];
    members.push(individual);
    pops.set(pop, members);
  }
  return [...pops.entries()];
}

const FILE_ID = "load-1";
const NEI: LoadToOpen = { fileId: FILE_ID, format: "nei", readOptions: null };
const VCF: LoadToOpen = {
  fileId: FILE_ID,
  format: "vcf",
  readOptions: { ploidy: 2, onlyPassed: true },
};

function missingData(maxAllowedMissingRate: number): VariantFilter {
  return { kind: "missing_data", maxAllowedMissingRate };
}

function diversityJob(
  filters: readonly VariantFilter[],
  pops: Pops = panelPops(),
): DiversityJob {
  return {
    analysis: "diversity",
    fileId: FILE_ID,
    filters,
    individuals: null,
    pops,
    minNumIndividuals: 20,
    polyThreshold: 0.95,
  };
}

/** A runner with the fixture `name` opened as `load`. */
function opened(
  name: string,
  load: LoadToOpen = name.endsWith(".nei") ? NEI : VCF,
): Runner {
  const runner = createRunner();
  const answer = runner.open(load, { name, source: bytesOf(name) });
  expect(answer.kind).toBe("ok");
  return runner;
}

function ignore(): void {
  // The progress, which these tests do not look at.
}

/** The value of an answer that has to be `ok`; of a run, a result that
    has to be the diversity's. */
function valueOf(answer: Answer<JobResult>): DiversityResult;
function valueOf<T>(answer: Answer<T>): T;
function valueOf<T>(answer: Answer<T>): T {
  if (answer.kind !== "ok") {
    throw new Error(`the answer is ${answer.kind}: ${JSON.stringify(answer)}`);
  }
  const value = answer.value;
  if (
    typeof value === "object" &&
    value !== null &&
    "analysis" in value &&
    value.analysis !== "diversity"
  ) {
    throw new Error(`the result is of ${String(value.analysis)}`);
  }
  return value;
}

/** The numbers of a diversity result as plain arrays, for `toEqual`. */
function numbersOf(result: DiversityResult): unknown {
  return {
    pops: result.pops,
    numIndividuals: [...result.numIndividuals],
    unbiasedExpHet: [...result.unbiasedExpHet],
    obsHet: [...result.obsHet],
    polyRatio: [...result.polyRatio],
    numVarsWithValue: [...result.numVarsWithValue],
    passStats: result.passStats,
  };
}

/** The table of the runner spec with no filter, and with the filter at 1
    or 0.1, which keep every variant. */
const NO_FILTER = {
  pops: ["p0", "p2", "p1"],
  numIndividuals: [48, 84, 68],
  unbiasedExpHet: [0.35193160994408107, 0.344856554637815, 0.35038890489752544],
  obsHet: [0.35642172473116646, 0.3512221180544642, 0.356734697819302],
  polyRatio: [0.9266666666666666, 0.9108333333333334, 0.9175],
  numVarsWithValue: [1200, 1200, 1200],
  passStats: { numVars: 1200, filtering: {} },
};

/** The table of the runner spec with the missing data filter at 0.05. */
const AT_0_05 = {
  pops: ["p0", "p2", "p1"],
  numIndividuals: [48, 84, 68],
  unbiasedExpHet: [0.35267894847982756, 0.3440824705971255, 0.3498365468860467],
  obsHet: [0.35667985874177544, 0.3512406974637824, 0.35603713961547323],
  polyRatio: [0.9288194444444444, 0.9105902777777778, 0.9157986111111112],
  numVarsWithValue: [1152, 1152, 1152],
  passStats: {
    numVars: 1152,
    filtering: { missing_data: { varsProcessed: 1200, varsKept: 1152 } },
  },
};

beforeAll(async () => {
  const loaded = await loadPopnei();
  expect(loaded).toEqual({ ok: true, value: "0.1.0" });
});

describe("WS3 D1 the open and the diversity", () => {
  test("panel.nei opens with its 200 individuals, the first s000, of ploidy 2", () => {
    const answer = createRunner().open(NEI, {
      name: "panel.nei",
      source: bytesOf("panel.nei"),
    });
    const value = valueOf(answer);
    expect(value.individuals.length).toBe(200);
    expect(value.individuals[0]).toBe("s000");
    expect(value.ploidy).toBe(2);
  });

  test("panel.vcf.gz read with ploidy 2 and only the passed variants opens as panel.nei does", () => {
    const answer = createRunner().open(VCF, {
      name: "panel.vcf.gz",
      source: bytesOf("panel.vcf.gz"),
    });
    const value = valueOf(answer);
    expect(value.individuals.length).toBe(200);
    expect(value.individuals[0]).toBe("s000");
    expect(value.ploidy).toBe(2);
  });

  for (const name of ["panel.nei", "panel.vcf.gz"]) {
    test(`the diversity of ${name} with no filter gives the numbers of the table, in the order of the job`, () => {
      const answer = opened(name).run(diversityJob([]), ignore);
      expect(numbersOf(valueOf(answer))).toEqual(NO_FILTER);
    });

    test(`the diversity of ${name} with the missing data filter at 1 gives the numbers with no filter, and keeps 1200 of its 1200 variants`, () => {
      const answer = opened(name).run(diversityJob([missingData(1)]), ignore);
      expect(numbersOf(valueOf(answer))).toEqual({
        ...NO_FILTER,
        passStats: {
          numVars: 1200,
          filtering: { missing_data: { varsProcessed: 1200, varsKept: 1200 } },
        },
      });
    });

    test(`the diversity of ${name} with the missing data filter at 0.05 keeps 1152 of its 1200 variants`, () => {
      const answer = opened(name).run(
        diversityJob([missingData(0.05)]),
        ignore,
      );
      expect(numbersOf(valueOf(answer))).toEqual(AT_0_05);
    });
  }

  test("told is given popnei's two calls of a diversity over panel.nei, as they came", () => {
    const told: Progress[] = [];
    const answer = opened("panel.nei").run(diversityJob([]), (progress) => {
      told.push(progress);
    });
    expect(answer.kind).toBe("ok");
    expect(told).toEqual([
      { bytesRead: 0, numBytes: 261490, pass: 1, numPasses: 1 },
      { bytesRead: 259376, numBytes: 261490, pass: 1, numPasses: 1 },
    ]);
  });

  test("told is given 0 then the 87304 bytes of panel.vcf.gz, compressed", () => {
    const told: Progress[] = [];
    opened("panel.vcf.gz").run(
      diversityJob([missingData(0.05)]),
      (progress) => {
        told.push(progress);
      },
    );
    expect(told).toEqual([
      { bytesRead: 0, numBytes: 87304, pass: 1, numPasses: 1 },
      { bytesRead: 87304, numBytes: 87304, pass: 1, numPasses: 1 },
    ]);
  });

  test("a file of 0 bytes is refused at the open, so no run tells a progress over 0 bytes", () => {
    for (const load of [NEI, VCF]) {
      const runner = createRunner();
      const answer = runner.open(load, {
        name: "empty",
        source: new Uint8Array(0),
      });
      expect(answer.kind).toBe("refused");
      const told: Progress[] = [];
      expect(
        runner.run(diversityJob([]), (progress) => {
          told.push(progress);
        }).kind,
      ).toBe("badRequest");
      expect(told).toEqual([]);
    }
  });

  test("the missing data filter at 0.05 keeps the 39 variants whose missing rate is exactly 0.05, which 0.045 drops", () => {
    const at005 = opened("panel.nei").run(
      diversityJob([missingData(0.05)]),
      ignore,
    );
    const at0045 = opened("panel.nei").run(
      diversityJob([missingData(0.045)]),
      ignore,
    );
    expect(valueOf(at005).passStats.numVars).toBe(1152);
    expect(valueOf(at0045).passStats.numVars).toBe(1113);
  });

  test("a change of the filters opens the file again, and each run gives the numbers of its own filters", () => {
    const runner = opened("panel.nei");
    expect(
      valueOf(runner.run(diversityJob([missingData(0.05)]), ignore)).passStats
        .numVars,
    ).toBe(1152);
    expect(
      valueOf(runner.run(diversityJob([missingData(0.045)]), ignore)).passStats
        .numVars,
    ).toBe(1113);
    expect(numbersOf(valueOf(runner.run(diversityJob([]), ignore)))).toEqual(
      NO_FILTER,
    );
    expect(
      numbersOf(valueOf(runner.run(diversityJob([missingData(0.05)]), ignore))),
    ).toEqual(AT_0_05);
  });

  test("a filter popnei refuses midway is refused, and the next run opens the file again", () => {
    const runner = opened("panel.nei");
    const refused = runner.run(
      diversityJob([missingData(0.05), { kind: "maf", maxAllowedMaf: 1.5 }]),
      ignore,
    );
    expect(refused.kind).toBe("refused");
    expect(refused.kind === "refused" ? refused.message : "").toContain("1.5");
    const next = runner.run(
      diversityJob([missingData(0.05), { kind: "maf", maxAllowedMaf: 0.9 }]),
      ignore,
    );
    expect(valueOf(next).passStats.filtering.missing_data?.varsProcessed).toBe(
      1200,
    );
    expect(valueOf(next).passStats.numVars).toBe(1058);
  });

  test("the same filters in another order open the file again, and are counted in their order", () => {
    const nei = bytesOf("panel.nei");
    let reads = 0;
    const file: LoadFile = {
      name: "panel.nei",
      get source() {
        reads += 1;
        return nei;
      },
    };
    const runner = createRunner();
    expect(runner.open(NEI, file).kind).toBe("ok");
    const maf: VariantFilter = { kind: "maf", maxAllowedMaf: 0.9 };
    const first = runner.run(diversityJob([missingData(0.05), maf]), ignore);
    expect(valueOf(first).passStats.numVars).toBe(1058);
    expect(reads).toBe(1);
    const again = runner.run(diversityJob([missingData(0.05), maf]), ignore);
    expect(valueOf(again).passStats.numVars).toBe(1058);
    expect(reads).toBe(1);
    const swapped = runner.run(diversityJob([maf, missingData(0.05)]), ignore);
    expect(reads).toBe(2);
    expect(valueOf(swapped).passStats.filtering.maf?.varsProcessed).toBe(1200);
  });

  test("a second call of loadPopnei gives the same promise", () => {
    expect(loadPopnei()).toBe(loadPopnei());
  });

  test("populations named 10, 2 and p1 come back in the order of the job, not in popnei's", () => {
    const [p0, p2, p1] = panelPops();
    if (p0 === undefined || p2 === undefined || p1 === undefined) {
      throw new Error("panel_pops.txt has not three populations");
    }
    const pops: Pops = [
      ["10", p0[1]],
      ["2", p2[1]],
      ["p1", p1[1]],
    ];
    const result = valueOf(
      opened("panel.nei").run(diversityJob([], pops), ignore),
    );
    expect(numbersOf(result)).toEqual({
      ...NO_FILTER,
      pops: ["10", "2", "p1"],
    });
    // With 50 individuals asked for, p0, of 48, has no value at any variant,
    // so the counts of the three differ and their order shows.
    const fifty = { ...diversityJob([], pops), minNumIndividuals: 50 };
    const counts = valueOf(opened("panel.nei").run(fifty, ignore));
    expect([...counts.numVarsWithValue]).toEqual([0, 1200, 1200]);
    expect([...counts.polyRatio]).toEqual([NaN, 0.9108333333333334, 0.9175]);
  });

  test("minNumIndividuals is given to popnei: at 50, p0 of 48 individuals has no value", () => {
    const job = { ...diversityJob([]), minNumIndividuals: 50 };
    const result = valueOf(opened("panel.nei").run(job, ignore));
    expect(numbersOf(result)).toEqual({
      ...NO_FILTER,
      unbiasedExpHet: [NaN, 0.344856554637815, 0.35038890489752544],
      obsHet: [NaN, 0.3512221180544642, 0.356734697819302],
      polyRatio: [NaN, 0.9108333333333334, 0.9175],
      numVarsWithValue: [0, 1200, 1200],
    });
  });

  test("polyThreshold is given to popnei: at 0.9 fewer variants are polymorphic", () => {
    // The shares popnei gave in node on 25 September 2026, js-v0.1.0-dev.2.
    const job = { ...diversityJob([]), polyThreshold: 0.9 };
    const result = valueOf(opened("panel.nei").run(job, ignore));
    expect(numbersOf(result)).toEqual({
      ...NO_FILTER,
      polyRatio: [0.8458333333333333, 0.8266666666666667, 0.8358333333333333],
    });
  });

  test("onlyPassed is given to popnei: of a VCF with 100 variants that failed a filter, true keeps 1100 and false 1200", () => {
    // The panel's VCF with every twelfth variant marked q10 in its FILTER
    // column, made here and never written to the disk.
    let numVariant = 0;
    const lines = gunzipSync(bytesOf("panel.vcf.gz"))
      .toString("utf8")
      .trimEnd()
      .split("\n")
      .map((line) => {
        if (line.startsWith("#")) {
          return line;
        }
        numVariant += 1;
        if (numVariant % 12 !== 0) {
          return line;
        }
        const fields = line.split("\t");
        fields[6] = "q10";
        return fields.join("\t");
      });
    const source = new TextEncoder().encode(lines.join("\n") + "\n");
    for (const [onlyPassed, numVars] of [
      [true, 1100],
      [false, 1200],
    ] as const) {
      const runner = createRunner();
      const load: LoadToOpen = {
        fileId: FILE_ID,
        format: "vcf",
        readOptions: { ploidy: 2, onlyPassed },
      };
      expect(runner.open(load, { name: "q10.vcf", source }).kind).toBe("ok");
      const result = valueOf(runner.run(diversityJob([]), ignore));
      expect(result.passStats).toEqual({ numVars, filtering: {} });
    }
  });

  test("the observed heterozygosity filter at 0.5 keeps 1098 of the 1200 variants", () => {
    // The counts popnei gave in node on 25 September 2026, js-v0.1.0-dev.2.
    const filter: VariantFilter = { kind: "obs_het", maxAllowedObsHet: 0.5 };
    const result = valueOf(
      opened("panel.nei").run(diversityJob([filter]), ignore),
    );
    expect(result.passStats).toEqual({
      numVars: 1098,
      filtering: { obs_het: { varsProcessed: 1200, varsKept: 1098 } },
    });
  });

  test("the LD filter at an r² of 0.1 within 1000 base pairs keeps 562 of the 1200 variants", () => {
    // The counts popnei gave in node on 25 September 2026, js-v0.1.0-dev.2.
    const filter: VariantFilter = {
      kind: "ld",
      maxAllowedR2: 0.1,
      maxDist: 1000,
    };
    const result = valueOf(
      opened("panel.nei").run(diversityJob([filter]), ignore),
    );
    expect(result.passStats).toEqual({
      numVars: 562,
      filtering: { ld: { varsProcessed: 1200, varsKept: 562 } },
    });
  });

  test("the Variants replaced by an open again is freed", () => {
    const free = vi.spyOn(Variants.prototype, "free");
    try {
      const runner = opened("panel.nei");
      runner.run(diversityJob([missingData(0.05)]), ignore);
      expect(free).toHaveBeenCalledTimes(0);
      runner.run(diversityJob([missingData(0.045)]), ignore);
      expect(free).toHaveBeenCalledTimes(1);
    } finally {
      free.mockRestore();
    }
  });

  test("a population named __proto__ is a population like any other", () => {
    const [p0, p2, p1] = panelPops();
    if (p0 === undefined || p2 === undefined || p1 === undefined) {
      throw new Error("panel_pops.txt has not three populations");
    }
    const pops: Pops = [["__proto__", p0[1]], p2, p1];
    const result = valueOf(
      opened("panel.nei").run(diversityJob([], pops), ignore),
    );
    expect(result.pops).toEqual(["__proto__", "p2", "p1"]);
    expect([...result.unbiasedExpHet]).toEqual(NO_FILTER.unbiasedExpHet);
  });
});

describe("WS3 D2 what goes wrong: transferablesOf", () => {
  test("gives the buffer of each array of a diversity result, and one buffer held by two fields once", () => {
    const result = valueOf(opened("panel.nei").run(diversityJob([]), ignore));
    expect(transferablesOf(result)).toEqual([
      result.numIndividuals.buffer,
      result.unbiasedExpHet.buffer,
      result.obsHet.buffer,
      result.polyRatio.buffer,
      result.numVarsWithValue.buffer,
    ]);
    const shared = new Float64Array(3);
    const twice: DiversityResult = {
      ...result,
      obsHet: shared,
      polyRatio: shared,
    };
    const buffers = transferablesOf(twice);
    expect(buffers.length).toBe(4);
    expect(buffers.filter((buffer) => buffer === shared.buffer).length).toBe(1);
  });

  test("throws a defect for an array that is a view of part of a buffer", () => {
    const result = valueOf(opened("panel.nei").run(diversityJob([]), ignore));
    const view = new Float64Array(new ArrayBuffer(64), 8, 3);
    expect(() => transferablesOf({ ...result, obsHet: view })).toThrow(
      /^popnei_web defect: an array of a result is a view/,
    );
  });
});

describe("WS3 D1 the open and the diversity: a small population", () => {
  test("a population of fewer than 20 individuals is not refused, and its values are NaN", () => {
    const runner = createRunner();
    const load: LoadToOpen = {
      fileId: FILE_ID,
      format: "vcf",
      readOptions: { ploidy: 4, onlyPassed: true },
    };
    const source = bytesOf("tetraploid.vcf.gz");
    const individuals = valueOf(
      runner.open(load, { name: "tetraploid.vcf.gz", source }),
    ).individuals;
    const result = valueOf(
      runner.run(diversityJob([], [["all", individuals]]), ignore),
    );
    expect([...result.numIndividuals]).toEqual([12]);
    expect([...result.unbiasedExpHet]).toEqual([NaN]);
    expect([...result.obsHet]).toEqual([NaN]);
    expect([...result.polyRatio]).toEqual([NaN]);
    expect([...result.numVarsWithValue]).toEqual([0]);
  });
});

/** popnei's message for bad.vcf opened as a `.nei` file. */
const BAD_AS_NEI =
  "the source is not a vars file: it does not start with the 6 bytes `ARROW1` that an arrow IPC file starts with";

/** popnei's message for a range of panel.nei that the browser refused. */
const PANEL_NOT_GIVEN =
  "the source could not be read: the browser did not give popnei the 261490 bytes from 0 of this file, which holds 261490 bytes, and said: ";

/**
 * A `Blob` that keeps its bytes, and whose pieces keep theirs, so that the
 * `FileReaderSync` of the tests reads a piece at once, as a browser's does
 * in a worker; node has no such reader.
 */
class BytesBlob extends Blob {
  readonly content: Uint8Array<ArrayBuffer>;

  constructor(content: Uint8Array<ArrayBuffer>) {
    super([content]);
    this.content = content;
  }

  override slice(start?: number, end?: number): Blob {
    return new BytesBlob(this.content.slice(start, end));
  }
}

/** What the `FileReaderSync` of the tests does with a range: read it,
    throw as a browser does for a file changed on the disk or removed from
    it, or give it one byte short. */
let reading: "read" | "notReadable" | "notFound" | "short" = "read";

/** While `reading` is "read", the ranges read well before the reader
    throws as for a file changed on the disk; `null` for never. */
let rangesBeforeFailing: number | null = null;

/** The `FileReaderSync` of the tests, put in place with `vi.stubGlobal`. */
class TestFileReaderSync {
  readAsArrayBuffer(blob: Blob): ArrayBuffer {
    if (!(blob instanceof BytesBlob)) {
      throw new Error("the reader of the tests reads a BytesBlob only");
    }
    switch (reading) {
      case "read":
        if (rangesBeforeFailing !== null) {
          if (rangesBeforeFailing === 0) {
            throw new DOMException("the file changed", "NotReadableError");
          }
          rangesBeforeFailing -= 1;
        }
        return blob.content.slice().buffer;
      case "notReadable":
        throw new DOMException("the file changed", "NotReadableError");
      case "notFound":
        throw new DOMException("the file is gone", "NotFoundError");
      case "short":
        return blob.content.slice(0, blob.content.length - 1).buffer;
    }
  }
}

/** panel.nei as a `Blob`, which popnei reads through `FileReaderSync`. */
function panelBlob(): LoadFile {
  return { name: "panel.nei", source: new BytesBlob(bytesOf("panel.nei")) };
}

describe("WS3 D2 what goes wrong: a file that no longer reads", () => {
  beforeAll(() => {
    vi.stubGlobal("FileReaderSync", TestFileReaderSync);
  });
  afterEach(() => {
    reading = "read";
    rangesBeforeFailing = null;
  });

  test("a range the browser refuses in the middle of a pass is reopenFailed", () => {
    // The panel's VCF, its variants written five times over at later
    // positions: 4,990,837 bytes, so that a pass reads a second range of
    // the file after the first 4 MiB; panel.nei is read in one range.
    const lines = gunzipSync(bytesOf("panel.vcf.gz"))
      .toString("utf8")
      .trimEnd()
      .split("\n");
    const header = lines.filter((line) => line.startsWith("#"));
    const variants = lines.filter((line) => !line.startsWith("#"));
    const copies = [0, 1, 2, 3, 4].flatMap((copy) =>
      variants.map((line) => {
        const [chrom, pos, ...rest] = line.split("\t");
        return [chrom, String(Number(pos) + copy * 10000), ...rest].join("\t");
      }),
    );
    const text = new TextEncoder().encode(
      [...header, ...copies].join("\n") + "\n",
    );
    expect(text.length).toBe(4990837);
    const runner = createRunner();
    const file = { name: "big.vcf", source: new BytesBlob(text) };
    expect(runner.open(VCF, file).kind).toBe("ok");
    rangesBeforeFailing = 1;
    expect(runner.run(diversityJob([missingData(0.05)]), ignore)).toEqual({
      kind: "reopenFailed",
      name: "big.vcf",
      message:
        "the source could not be read: the browser did not give popnei the 796533 bytes from 4194304 of this file, which holds 4990837 bytes, and said: the file changed",
    });
  });
  afterAll(() => {
    vi.unstubAllGlobals();
  });

  test("an open again that popnei refuses is reopenFailed, and so is the next run, which opens again", () => {
    const nei = bytesOf("panel.nei");
    const bad = bytesOf("bad.vcf");
    let reads = 0;
    const file: LoadFile = {
      name: "panel.nei",
      get source() {
        reads += 1;
        return reads === 1 ? nei : bad;
      },
    };
    const runner = createRunner();
    expect(runner.open(NEI, file).kind).toBe("ok");
    expect(reads).toBe(1);
    const first = runner.run(diversityJob([missingData(0.05)]), ignore);
    expect(valueOf(first).passStats.numVars).toBe(1152);
    expect(reads).toBe(1);
    // The same filters again: the Variants as it is, no read of the file.
    const again = runner.run(diversityJob([missingData(0.05)]), ignore);
    expect(valueOf(again).passStats.numVars).toBe(1152);
    expect(reads).toBe(1);
    const reopenFailed = {
      kind: "reopenFailed",
      name: "panel.nei",
      message: BAD_AS_NEI,
    };
    expect(runner.run(diversityJob([missingData(0.045)]), ignore)).toEqual(
      reopenFailed,
    );
    expect(reads).toBe(2);
    expect(runner.run(diversityJob([missingData(0.05)]), ignore)).toEqual(
      reopenFailed,
    );
    expect(reads).toBe(3);
  });

  test("a Blob that reads opens with 200 individuals and gives the numbers of the table", () => {
    const runner = createRunner();
    const individuals = valueOf(runner.open(NEI, panelBlob())).individuals;
    expect(individuals.length).toBe(200);
    const answer = runner.run(diversityJob([missingData(0.05)]), ignore);
    expect(numbersOf(valueOf(answer))).toEqual(AT_0_05);
  });

  test("a file the browser refuses to read at a run with the same filters is reopenFailed, with popnei's message", () => {
    const runner = createRunner();
    expect(runner.open(NEI, panelBlob()).kind).toBe("ok");
    reading = "notReadable";
    expect(runner.run(diversityJob([missingData(0.05)]), ignore)).toEqual({
      kind: "reopenFailed",
      name: "panel.nei",
      message: `${PANEL_NOT_GIVEN}the file changed`,
    });
  });

  test("a file the browser says is gone at a run is reopenFailed", () => {
    const runner = createRunner();
    expect(runner.open(NEI, panelBlob()).kind).toBe("ok");
    reading = "notFound";
    expect(runner.run(diversityJob([missingData(0.05)]), ignore)).toEqual({
      kind: "reopenFailed",
      name: "panel.nei",
      message: `${PANEL_NOT_GIVEN}the file is gone`,
    });
  });

  test("a file the browser refuses to read at an open again is reopenFailed", () => {
    const runner = createRunner();
    expect(runner.open(NEI, panelBlob()).kind).toBe("ok");
    const first = runner.run(diversityJob([missingData(0.05)]), ignore);
    expect(first.kind).toBe("ok");
    reading = "notReadable";
    expect(runner.run(diversityJob([missingData(0.045)]), ignore)).toEqual({
      kind: "reopenFailed",
      name: "panel.nei",
      message: `${PANEL_NOT_GIVEN}the file changed`,
    });
  });

  test("a file the browser refuses to read at the open of a new runner is reopenFailed", () => {
    reading = "notReadable";
    expect(createRunner().open(NEI, panelBlob())).toEqual({
      kind: "reopenFailed",
      name: "panel.nei",
      message: `${PANEL_NOT_GIVEN}the file changed`,
    });
  });

  test("a file whose ranges come back one byte short is reopenFailed", () => {
    const runner = createRunner();
    expect(runner.open(NEI, panelBlob()).kind).toBe("ok");
    reading = "short";
    const answer = runner.run(diversityJob([missingData(0.05)]), ignore);
    expect(answer.kind).toBe("reopenFailed");
    expect(answer.kind === "reopenFailed" ? answer.message : "").toMatch(
      /^the source could not be read: popnei asked this file for the 261490 bytes from 0 and the browser gave 261489 of them/,
    );
  });

  test("a gzipped VCF cut short is refused, a refusal of its data and not a file that changed", () => {
    const runner = createRunner();
    const source = bytesOf("panel.vcf.gz").slice(0, 60000);
    const open = runner.open(VCF, { name: "panel.vcf.gz", source });
    expect(open.kind).toBe("ok");
    expect(runner.run(diversityJob([]), ignore)).toEqual({
      kind: "refused",
      message: "the source could not be read: incomplete deflate stream",
    });
  });
});

describe("WS3 D2 what goes wrong: told, popnei's refusals and the defects", () => {
  test("what told throws is thrown by run, that very value, and not answered refused", () => {
    const thrown = new Error("told");
    let caught: unknown = null;
    try {
      opened("panel.nei").run(diversityJob([]), () => {
        throw thrown;
      });
    } catch (error: unknown) {
      caught = error;
    }
    expect(caught).toBe(thrown);
  });

  test("what told throws at popnei's last call, at the end of the run, is thrown by run too", () => {
    const thrown = new Error("told at the end");
    let calls = 0;
    let caught: unknown = null;
    try {
      opened("panel.nei").run(diversityJob([]), () => {
        calls += 1;
        // The second of the two calls of a diversity over panel.nei.
        if (calls === 2) {
          throw thrown;
        }
      });
    } catch (error: unknown) {
      caught = error;
    }
    expect(calls).toBe(2);
    expect(caught).toBe(thrown);
  });

  test("a VCF of tetraploids read with ploidy 2 opens with its 12 individuals and its diversity is refused", () => {
    const runner = createRunner();
    const open = runner.open(VCF, {
      name: "tetraploid.vcf.gz",
      source: bytesOf("tetraploid.vcf.gz"),
    });
    const { individuals, ploidy } = valueOf(open);
    expect(individuals.length).toBe(12);
    expect(ploidy).toBe(2);
    const job = diversityJob([], [["all", individuals]]);
    expect(runner.run(job, ignore)).toEqual({
      kind: "refused",
      message:
        "line 5 of the VCF, the column of t00: its genotype is of the ploidy 4 and the reader was asked for the ploidy 2; popnei does not read a VCF whose genotypes are of different ploidies, and the ploidy is an argument of the reader",
    });
  });

  test("bad.vcf is refused at the open as a VCF", () => {
    const file = { name: "bad.vcf", source: bytesOf("bad.vcf") };
    expect(createRunner().open(VCF, file)).toEqual({
      kind: "refused",
      message: "the source is not a VCF: it starts with `This is a line o`",
    });
  });

  test("bad.vcf is refused at the open as a .nei file", () => {
    const file = { name: "bad.vcf", source: bytesOf("bad.vcf") };
    expect(createRunner().open(NEI, file)).toEqual({
      kind: "refused",
      message: BAD_AS_NEI,
    });
  });

  test("filters that keep no variant are refused with popnei's counts of the pass", () => {
    const job = diversityJob([
      missingData(0.05),
      { kind: "maf", maxAllowedMaf: 0 },
    ]);
    expect(opened("panel.nei").run(job, ignore)).toEqual({
      kind: "refused",
      message:
        "the pass gave no variant: its source gave 1200 and the steps kept none of them, the `missing_data` filter was given 1200 and kept 1152, the `maf` filter was given 1152 and kept 0; a statistic of a pass is calculated over the variants it gives",
    });
  });

  test("a ploidy above 255 is refused by popnei at the open", () => {
    const load: LoadToOpen = {
      ...VCF,
      readOptions: { ploidy: 256, onlyPassed: true },
    };
    const file = { name: "panel.vcf.gz", source: bytesOf("panel.vcf.gz") };
    expect(createRunner().open(load, file)).toEqual({
      kind: "refused",
      message:
        "the ploidy asked of the VCF reader is 256, and a genotype holds one allele at least and 255 at most",
    });
  });

  test("a population that names an individual the file does not have is refused with popnei's message", () => {
    const job = diversityJob([], [["p0", ["s000", "nobody"]]]);
    expect(opened("panel.nei").run(job, ignore)).toEqual({
      kind: "refused",
      message:
        "`nobody` is named in the population `p0` and is not an individual of the variants; `individuals` gives the names the variants have, which are the ones the filter of individuals keeps when there is one",
    });
  });

  test("WS8 D2 a VCF of a header alone opens, and its diversity is refused as a file with no variant, with the missing data filter and without it", () => {
    const header =
      '##fileformat=VCFv4.2\n##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">\n' +
      "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\ta\tb\n";
    for (const filters of [[], [missingData(0.1)]]) {
      const runner = createRunner();
      const open = runner.open(VCF, {
        name: "empty.vcf",
        source: new TextEncoder().encode(header),
      });
      expect(valueOf(open).individuals).toEqual(["a", "b"]);
      expect(
        runner.run(diversityJob(filters, [["A", ["a", "b"]]]), ignore),
      ).toEqual({
        kind: "refused",
        message:
          "the pass gave no variant and its source holds none: a statistic of a pass is calculated over the variants it gives",
      });
    }
  });

  test("a VCF whose every variant fails FILTER is refused as a source that holds none when read with only the passed variants, and gives its 2 variants when read with all", () => {
    const vcf =
      '##fileformat=VCFv4.2\n##FILTER=<ID=q10,Description="Quality below 10">\n##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">\n' +
      "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\ta\tb\n" +
      "1\t100\t.\tA\tG\t5\tq10\t.\tGT\t0/1\t1/1\n" +
      "1\t200\t.\tC\tT\t5\tq10\t.\tGT\t0/0\t0/1\n";
    const runOn = (onlyPassed: boolean): Runner => {
      const runner = createRunner();
      const open = runner.open(
        { ...VCF, readOptions: { ploidy: 2, onlyPassed } },
        { name: "failed.vcf", source: new TextEncoder().encode(vcf) },
      );
      expect(valueOf(open).individuals).toEqual(["a", "b"]);
      return runner;
    };
    const job = diversityJob([], [["A", ["a", "b"]]]);
    expect(runOn(true).run(job, ignore)).toEqual({
      kind: "refused",
      message:
        "the pass gave no variant and its source holds none: a statistic of a pass is calculated over the variants it gives",
    });
    expect(valueOf(runOn(false).run(job, ignore)).passStats.numVars).toBe(2);
  });

  test("a run before the open is badRequest", () => {
    const answer = createRunner().run(diversityJob([]), ignore);
    expect(answer.kind).toBe("badRequest");
  });

  test("a run of another load than the one opened is badRequest", () => {
    const job = { ...diversityJob([]), fileId: "load-2" };
    expect(opened("panel.nei").run(job, ignore).kind).toBe("badRequest");
  });

  test("a run after an open that popnei refused is badRequest", () => {
    const runner = createRunner();
    const file = { name: "bad.vcf", source: bytesOf("bad.vcf") };
    expect(runner.open(VCF, file).kind).toBe("refused");
    expect(runner.run(diversityJob([]), ignore).kind).toBe("badRequest");
  });

  test("a VCF with no read options cannot be written, so no open meets it", () => {
    // @ts-expect-error -- a VCF is always opened with its read options
    const load: LoadToOpen = {
      fileId: FILE_ID,
      format: "vcf",
      readOptions: null,
    };
    expect(load.format).toBe("vcf");
  });

  test("a second open after an open that popnei refused is badRequest", () => {
    const runner = createRunner();
    const bad = { name: "bad.vcf", source: bytesOf("bad.vcf") };
    expect(runner.open(VCF, bad).kind).toBe("refused");
    const panel = { name: "panel.nei", source: bytesOf("panel.nei") };
    expect(runner.open(NEI, panel).kind).toBe("badRequest");
  });

  test("a second open is badRequest", () => {
    const runner = opened("panel.nei");
    const file = { name: "panel.nei", source: bytesOf("panel.nei") };
    expect(runner.open(NEI, file).kind).toBe("badRequest");
  });

  test("two populations of one name are badRequest", () => {
    const [p0, p2] = panelPops();
    if (p0 === undefined || p2 === undefined) {
      throw new Error("panel_pops.txt has not three populations");
    }
    const job = diversityJob([], [p0, ["p0", p2[1]]]);
    expect(opened("panel.nei").run(job, ignore).kind).toBe("badRequest");
  });

  test("a job with an empty list of individuals is badRequest", () => {
    const job: DiversityJob = { ...diversityJob([]), individuals: [] };
    expect(opened("panel.nei").run(job, ignore).kind).toBe("badRequest");
  });
});

describe("WS3 D2 what goes wrong: answerOfThrown", () => {
  test("a plain Error is refused, with its message", () => {
    expect(answerOfThrown(new Error("x"))).toEqual({
      kind: "refused",
      message: "x",
    });
  });

  test("a RangeError, of a memory that cannot grow, is crashed", () => {
    expect(answerOfThrown(new RangeError("x"))).toEqual({
      kind: "crashed",
      message: "x",
    });
  });

  test("a trap of the wasm is crashed", () => {
    const trap = new WebAssembly.RuntimeError("unreachable");
    expect(answerOfThrown(trap)).toEqual({
      kind: "crashed",
      message: "unreachable",
    });
  });

  test("a TypeError, a mistake of the code, is crashed", () => {
    expect(answerOfThrown(new TypeError("x is not a function"))).toEqual({
      kind: "crashed",
      message: "x is not a function",
    });
  });

  test("a thrown string is crashed", () => {
    expect(answerOfThrown("a string")).toEqual({
      kind: "crashed",
      message: "a string",
    });
  });
});

/** The result of an answer that has to be `ok`, of the analysis given. */
function resultOf<A extends JobResult["analysis"]>(
  answer: Answer<JobResult>,
  analysis: A,
): Extract<JobResult, { readonly analysis: A }> {
  if (answer.kind !== "ok") {
    throw new Error(`the answer is ${answer.kind}: ${JSON.stringify(answer)}`);
  }
  const result = answer.value;
  if (!isResultOf(result, analysis)) {
    throw new Error(`the result is of ${result.analysis}, not ${analysis}`);
  }
  return result;
}

function isResultOf<A extends JobResult["analysis"]>(
  result: JobResult,
  analysis: A,
): result is Extract<JobResult, { readonly analysis: A }> {
  return result.analysis === analysis;
}

/** The job of the statistics of each individual, which has no filter. */
function individualChecksJob(): IndividualChecksJob {
  return { analysis: "individualChecks", fileId: FILE_ID, filters: [] };
}

/** The job of the histograms, with popnei's defaults of the bins, over the
    individuals of `individuals`, or every individual. */
function variantChecksJob(
  individuals: readonly string[] | null = null,
): VariantChecksJob {
  return {
    analysis: "variantChecks",
    fileId: FILE_ID,
    filters: [],
    individuals,
    minNumIndividuals: 0,
    numBins: 40,
    range: [0, 1],
  };
}

/** The job of the counts of `filters`, over the individuals of
    `individuals`, or every individual. */
function filterCountsJob(
  filters: readonly VariantFilter[],
  individuals: readonly string[] | null = null,
): FilterCountsJob {
  return { analysis: "filterCounts", fileId: FILE_ID, filters, individuals };
}

/** The three filters of the counts: missing data at 0.05, observed
    heterozygosity at 0.9 and MAF at 0.95, in that order. */
const THREE_FILTERS: readonly VariantFilter[] = [
  missingData(0.05),
  { kind: "obs_het", maxAllowedObsHet: 0.9 },
  { kind: "maf", maxAllowedMaf: 0.95 },
];

/** The counts of the pass of the three filters over every individual. */
const THREE_COUNTS = {
  numVars: 1128,
  filtering: {
    missing_data: { varsProcessed: 1200, varsKept: 1152 },
    obs_het: { varsProcessed: 1152, varsKept: 1152 },
    maf: { varsProcessed: 1152, varsKept: 1128 },
  },
};

/** The counts of the pass of the three filters over the list of 111, put
    before them. */
const THREE_COUNTS_OF_111 = {
  numVars: 1096,
  filtering: {
    missing_data: { varsProcessed: 1200, varsKept: 1117 },
    obs_het: { varsProcessed: 1117, varsKept: 1117 },
    maf: { varsProcessed: 1117, varsKept: 1096 },
  },
};

/** The counts of the pass of the missing data filter at 0.05. */
const COUNTS_AT_0_05 = AT_0_05.passStats;

/** The counts of the missing data filter at 0.05 over the list of 116. */
const COUNTS_AT_0_05_OF_116 = {
  numVars: 1103,
  filtering: { missing_data: { varsProcessed: 1200, varsKept: 1103 } },
};

/** The counts of the missing data filter at 0.05 over the list of 111. */
const COUNTS_AT_0_05_OF_111 = {
  numVars: 1117,
  filtering: { missing_data: { varsProcessed: 1200, varsKept: 1117 } },
};

/** The statistics of each individual of panel.nei, over every variant of
    the file, from a run of the runner, as core gets them. */
function panelStats(): IndividualChecksResult {
  return resultOf(
    opened("panel.nei").run(individualChecksJob(), ignore),
    "individualChecks",
  );
}

/** The individuals, in the order of the file, whose missing rate is at
    most 0.03 and, when `maxObsHet` is given, whose observed
    heterozygosity is at most it: the list of 116, and of 111. */
function listOf(
  stats: IndividualChecksResult,
  maxObsHet: number | null,
): string[] {
  return stats.individuals.filter((_, index) => {
    const missing = stats.missingGtRate[index];
    const obsHet = stats.obsHetRate[index];
    if (missing === undefined || obsHet === undefined) {
      throw new Error("a statistic missing from the result");
    }
    return missing <= 0.03 && (maxObsHet === null || obsHet <= maxObsHet);
  });
}

/** The list of 116 and the list of 111, made from the statistics of each
    individual as core makes them. */
function lists(): { readonly of116: string[]; readonly of111: string[] } {
  const stats = panelStats();
  return { of116: listOf(stats, null), of111: listOf(stats, 0.38) };
}

/** The diversity job with the missing data filter at 0.05, or `filters`,
    and the list, the populations holding only the individuals of it. */
function diversityWithList(
  list: readonly string[],
  filters: readonly VariantFilter[] = [missingData(0.05)],
): DiversityJob {
  const kept = new Set(list);
  const pops: Pops = panelPops().map(([pop, individuals]) => [
    pop,
    individuals.filter((individual) => kept.has(individual)),
  ]);
  return { ...diversityJob(filters, pops), individuals: list };
}

/** A panel.nei whose reads of the source are counted. */
function countedPanel(): { readonly file: LoadFile; reads: () => number } {
  const nei = bytesOf("panel.nei");
  let numReads = 0;
  const file: LoadFile = {
    name: "panel.nei",
    get source() {
      numReads += 1;
      return nei;
    },
  };
  return { file, reads: () => numReads };
}

describe("IP2 D1 the worker in the new order: the statistics of each individual", () => {
  test("with no filter panel.nei gives its 200 individuals, popnei's numbers of the first three, no NaN, and the counts of the 1,200 variants", () => {
    const result = panelStats();
    expect(result.individuals.length).toBe(200);
    expect(result.individuals.slice(0, 3)).toEqual(["s000", "s001", "s002"]);
    expect(result.missingGtRate.length).toBe(200);
    expect(result.obsHetRate.length).toBe(200);
    expect([...result.missingGtRate.slice(0, 3)]).toEqual([
      0.028333333333333332, 0.03666666666666667, 0.03333333333333333,
    ]);
    expect([...result.obsHetRate.slice(0, 3)]).toEqual([
      0.3653516295025729, 0.34342560553633217, 0.3724137931034483,
    ]);
    expect(result.obsHetRate.some((rate) => Number.isNaN(rate))).toBe(false);
    expect(result.passStats).toEqual({ numVars: 1200, filtering: {} });
  });

  test("the statistics that the tests of core read from panel_individual_stats.json are those popnei gives the runner with no filter", () => {
    // The tests of core may not call popnei, and read its statistics from
    // this file, which make_fixtures.mjs writes with popnei: this test
    // fails when the release of popnei the runner uses gives others. The
    // file holds a NaN as null, as JSON.stringify writes it.
    const result = panelStats();
    const fixture: unknown = JSON.parse(
      readFileSync(join(FIXTURES, "panel_individual_stats.json"), "utf8"),
    );
    expect(fixture).toEqual({
      filters: [],
      individuals: result.individuals,
      missingGtRate: [...result.missingGtRate],
      obsHetRate: [...result.obsHetRate].map((rate) =>
        Number.isNaN(rate) ? null : rate,
      ),
    });
  });

  test("a VCF of two individuals, the second missing at both variants, gives the rates 0 and 1 and the heterozygosities 0.5 and NaN", () => {
    const vcf =
      '##fileformat=VCFv4.2\n##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">\n' +
      "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\ta\tb\n" +
      "1\t100\t.\tA\tG\t.\tPASS\t.\tGT\t0/1\t./.\n" +
      "1\t200\t.\tC\tT\t.\tPASS\t.\tGT\t0/0\t./.\n";
    const runner = createRunner();
    const open = runner.open(VCF, {
      name: "two.vcf",
      source: new TextEncoder().encode(vcf),
    });
    expect(open.kind).toBe("ok");
    const result = resultOf(
      runner.run(individualChecksJob(), ignore),
      "individualChecks",
    );
    expect(result.individuals).toEqual(["a", "b"]);
    expect([...result.missingGtRate]).toEqual([0, 1]);
    expect([...result.obsHetRate]).toEqual([0.5, NaN]);
    expect(result.passStats).toEqual({ numVars: 2, filtering: {} });
  });

  test("after a diversity with a list and a filter, the statistics open the file again and are of every individual and every variant", () => {
    const { of111 } = lists();
    const { file, reads } = countedPanel();
    const runner = createRunner();
    expect(runner.open(NEI, file).kind).toBe("ok");
    valueOf(runner.run(diversityWithList(of111), ignore));
    expect(reads()).toBe(1);
    const result = resultOf(
      runner.run(individualChecksJob(), ignore),
      "individualChecks",
    );
    expect(reads()).toBe(2);
    expect(result.individuals.length).toBe(200);
    expect(result.missingGtRate[0]).toBe(0.028333333333333332);
    expect(result.passStats).toEqual({ numVars: 1200, filtering: {} });
  });
});

describe("VS1 D3 the passes of the runner: the statistics of each individual, the defects", () => {
  test("names of popnei's that are not those the open gave, in their order, are a defect thrown", () => {
    // The 200 names of panel.nei with the first two swapped, as the open
    // gives them: popnei's statistics then give the same names in another
    // order.
    const [first, second, ...rest] = panelStats().individuals;
    if (first === undefined || second === undefined) {
      throw new Error("panel.nei has not two individuals");
    }
    const names = vi
      .spyOn(Variants.prototype, "individuals", "get")
      .mockReturnValueOnce([second, first, ...rest]);
    try {
      const runner = opened("panel.nei");
      expect(() => runner.run(individualChecksJob(), ignore)).toThrow(
        /^popnei_web defect: the statistics of each individual are not of the individuals the open gave/,
      );
    } finally {
      names.mockRestore();
    }
  });

  test("names of popnei's that are fewer or more than those the open gave, each at its place the same, are a defect thrown", () => {
    // The open gives the 200 names of panel.nei and one more, or all but
    // the last: popnei's statistics then give 200 names, one fewer or one
    // more, and only their number tells.
    const all = panelStats().individuals;
    for (const given of [[...all, "s200"], all.slice(0, -1)]) {
      const names = vi
        .spyOn(Variants.prototype, "individuals", "get")
        .mockReturnValueOnce(given);
      try {
        const runner = opened("panel.nei");
        expect(() => runner.run(individualChecksJob(), ignore)).toThrow(
          /^popnei_web defect: the statistics of each individual are not of the individuals the open gave/,
        );
      } finally {
        names.mockRestore();
      }
    }
  });
});

describe("IP2 D1 the worker in the new order: the diversity with the list", () => {
  test("with the list of 116 before the filter at 0.05, popnei's numbers of the three populations, and the filter keeps 1,103 of 1,200", () => {
    const { of116 } = lists();
    expect(of116.length).toBe(116);
    expect(of116.slice(0, 3)).toEqual(["s000", "s003", "s004"]);
    const result = valueOf(
      opened("panel.nei").run(diversityWithList(of116), ignore),
    );
    expect(numbersOf(result)).toEqual({
      pops: ["p0", "p2", "p1"],
      numIndividuals: [29, 51, 36],
      unbiasedExpHet: [
        0.3533112768773785, 0.343162019844528, 0.35122154846050563,
      ],
      obsHet: [0.35890535785555633, 0.3500736606408556, 0.35645096138403165],
      polyRatio: [0.9310970081595649, 0.8975521305530372, 0.9084315503173164],
      numVarsWithValue: [1103, 1103, 1103],
      passStats: COUNTS_AT_0_05_OF_116,
    });
  });

  test("with the list of 111 before the filter at 0.05, the numbers of the table of diversity.md, and the filter keeps 1,117 of 1,200", () => {
    const { of116, of111 } = lists();
    expect(of111.length).toBe(111);
    expect(of116.filter((name) => !of111.includes(name))).toEqual([
      "s023",
      "s042",
      "s086",
      "s168",
      "s183",
    ]);
    const result = valueOf(
      opened("panel.nei").run(diversityWithList(of111), ignore),
    );
    expect(numbersOf(result)).toEqual({
      pops: ["p0", "p2", "p1"],
      numIndividuals: [29, 48, 34],
      unbiasedExpHet: [
        0.3536745729996746, 0.34293262196030005, 0.3508361148330853,
      ],
      obsHet: [0.35866753886603864, 0.3480322658477853, 0.35471161450059036],
      polyRatio: [0.9310653536257834, 0.9015219337511191, 0.9015219337511191],
      numVarsWithValue: [1117, 1117, 1117],
      passStats: COUNTS_AT_0_05_OF_111,
    });
  });
});

describe("VS1 D3 the passes of the runner: the diversity with a list of individuals, the refusals", () => {
  test("a list that names an individual twice is refused with popnei's message", () => {
    const job: DiversityJob = {
      ...diversityJob([missingData(0.05)], [["p0", ["s000"]]]),
      individuals: ["s000", "s000"],
    };
    const answer = opened("panel.nei").run(job, ignore);
    expect(answer.kind).toBe("refused");
    expect(answer.kind === "refused" ? answer.message : "").toContain("s000");
  });

  test("an empty list of individuals is badRequest, before any filter is put", () => {
    const put = vi.spyOn(Variants.prototype, "filterByMissingData");
    const individuals = vi.spyOn(Variants.prototype, "filterIndividuals");
    try {
      const runner = opened("panel.nei");
      const job: DiversityJob = {
        ...diversityJob([missingData(0.05)]),
        individuals: [],
      };
      expect(runner.run(job, ignore)).toEqual({
        kind: "badRequest",
        message: "an empty list of individuals",
      });
      expect(put).toHaveBeenCalledTimes(0);
      expect(individuals).toHaveBeenCalledTimes(0);
    } finally {
      put.mockRestore();
      individuals.mockRestore();
    }
  });

  test("a job of the histograms or of the counts with an empty list of individuals is badRequest, before any step is put", () => {
    const individuals = vi.spyOn(Variants.prototype, "filterIndividuals");
    try {
      for (const job of [
        variantChecksJob([]),
        filterCountsJob([missingData(0.05)], []),
      ]) {
        expect(opened("panel.nei").run(job, ignore)).toEqual({
          kind: "badRequest",
          message: "an empty list of individuals",
        });
      }
      expect(individuals).toHaveBeenCalledTimes(0);
    } finally {
      individuals.mockRestore();
    }
  });
});

describe("IP2 D1 the worker in the new order: the steps with the list", () => {
  test("after the diversity with the list, the same filter and no list opens the file again, and so does the list and that filter again", () => {
    const { of111 } = lists();
    const { file, reads } = countedPanel();
    const runner = createRunner();
    expect(runner.open(NEI, file).kind).toBe("ok");
    const withList = valueOf(runner.run(diversityWithList(of111), ignore));
    expect([...withList.numIndividuals]).toEqual([29, 48, 34]);
    expect(reads()).toBe(1);
    const noList = valueOf(
      runner.run(diversityJob([missingData(0.05)]), ignore),
    );
    expect(reads()).toBe(2);
    expect(numbersOf(noList)).toEqual(AT_0_05);
    const again = valueOf(runner.run(diversityWithList(of111), ignore));
    expect(reads()).toBe(3);
    expect(again.passStats).toEqual(COUNTS_AT_0_05_OF_111);
  });

  test("after the diversity with the list, the same list in another order opens the file again", () => {
    const { of111 } = lists();
    const { file, reads } = countedPanel();
    const runner = createRunner();
    expect(runner.open(NEI, file).kind).toBe("ok");
    runner.run(diversityWithList(of111), ignore);
    expect(reads()).toBe(1);
    const reversed = valueOf(
      runner.run(diversityWithList(of111.toReversed()), ignore),
    );
    expect(reads()).toBe(2);
    expect([...reversed.numIndividuals]).toEqual([29, 48, 34]);
    expect(reversed.passStats).toEqual(COUNTS_AT_0_05_OF_111);
  });

  test("after the diversity with the list, the same filter and the same list do not open the file again, for a diversity nor for the counts", () => {
    const { of111 } = lists();
    const { file, reads } = countedPanel();
    const runner = createRunner();
    expect(runner.open(NEI, file).kind).toBe("ok");
    runner.run(diversityWithList(of111), ignore);
    const again = valueOf(runner.run(diversityWithList([...of111]), ignore));
    expect(reads()).toBe(1);
    expect([...again.unbiasedExpHet]).toEqual([
      0.3536745729996746, 0.34293262196030005, 0.3508361148330853,
    ]);
    const counts = resultOf(
      runner.run(filterCountsJob([missingData(0.05)], [...of111]), ignore),
      "filterCounts",
    );
    expect(reads()).toBe(1);
    expect(counts.passStats).toEqual(COUNTS_AT_0_05_OF_111);
  });

  test("popnei holds the list as the first step and the filter after it", () => {
    const { of111 } = lists();
    const put = vi.spyOn(Variants.prototype, "filterByMissingData");
    const individuals = vi.spyOn(Variants.prototype, "filterIndividuals");
    try {
      valueOf(opened("panel.nei").run(diversityWithList(of111), ignore));
      expect(individuals).toHaveBeenCalledTimes(1);
      expect(put).toHaveBeenCalledTimes(1);
      const [listCall] = individuals.mock.invocationCallOrder;
      const [filterCall] = put.mock.invocationCallOrder;
      expect(
        listCall !== undefined && filterCall !== undefined
          ? listCall < filterCall
          : null,
      ).toBe(true);
    } finally {
      put.mockRestore();
      individuals.mockRestore();
    }
  });
});

describe("IP2 D1 the worker in the new order: the histograms and the counts with the list", () => {
  test("the histograms with the list of 111 and no filter of the variants: popnei's means over those individuals, and counts that add up to 1,200", () => {
    const { of111 } = lists();
    const result = resultOf(
      opened("panel.nei").run(variantChecksJob(of111), ignore),
      "variantChecks",
    );
    expect(result.maf.mean).toBe(0.7173150249650765);
    expect(result.obsHet.mean).toBe(0.3528596566999348);
    expect(result.unbiasedExpHet.mean).toBe(0.3749397114515978);
    for (const distrib of [result.maf, result.obsHet, result.unbiasedExpHet]) {
      expect(distrib.counts.reduce((sum, count) => sum + count, 0)).toBe(1200);
    }
    expect(result.passStats).toEqual({ numVars: 1200, filtering: {} });
  });

  test("the counts with the list of 111 before the three filters count over those individuals, and a diversity with the same filters and list gives the same counts", () => {
    const { of111 } = lists();
    const counts = resultOf(
      opened("panel.nei").run(filterCountsJob(THREE_FILTERS, of111), ignore),
      "filterCounts",
    );
    expect(counts.passStats).toEqual(THREE_COUNTS_OF_111);
    expect(Object.keys(counts.passStats.filtering)).toEqual([
      "missing_data",
      "obs_het",
      "maf",
    ]);
    const diversity = valueOf(
      opened("panel.nei").run(diversityWithList(of111, THREE_FILTERS), ignore),
    );
    expect(diversity.passStats).toEqual(THREE_COUNTS_OF_111);
    expect([...diversity.numIndividuals]).toEqual([29, 48, 34]);
  });
});

describe("VS1 D3 the passes of the runner: the histograms and the counts", () => {
  test("the histograms of panel.nei with no filter, 40 bins from 0 to 1: popnei's edges, means and counts", () => {
    const result = resultOf(
      opened("panel.nei").run(variantChecksJob(), ignore),
      "variantChecks",
    );
    expect(result.binEdges.length).toBe(41);
    expect(result.binEdges[0]).toBe(0);
    expect(result.binEdges[3]).toBe(0.07500000000000001);
    expect(result.binEdges[38]).toBe(0.9500000000000001);
    expect(result.binEdges[40]).toBe(1);
    expect(result.binEdges.buffer.byteLength).toBe(41 * 8);
    expect(result.maf.mean).toBe(0.7163445463101891);
    expect(result.obsHet.mean).toBe(0.35429523451520484);
    expect(result.unbiasedExpHet.mean).toBe(0.3754712450806149);
    expect([...result.maf.counts]).toEqual([
      ...Array<number>(20).fill(0),
      69,
      75,
      62,
      71,
      60,
      74,
      72,
      83,
      70,
      68,
      64,
      83,
      64,
      63,
      67,
      57,
      48,
      25,
      22,
      3,
    ]);
    expect([...result.obsHet.counts]).toEqual([
      0,
      4,
      9,
      18,
      20,
      25,
      30,
      34,
      50,
      61,
      53,
      69,
      62,
      84,
      89,
      101,
      113,
      102,
      108,
      58,
      62,
      27,
      14,
      5,
      2,
      ...Array<number>(15).fill(0),
    ]);
    expect([...result.unbiasedExpHet.counts]).toEqual([
      0,
      3,
      10,
      13,
      12,
      26,
      30,
      30,
      39,
      46,
      44,
      58,
      45,
      80,
      58,
      70,
      88,
      109,
      130,
      240,
      69,
      ...Array<number>(19).fill(0),
    ]);
    for (const distrib of [result.maf, result.obsHet, result.unbiasedExpHet]) {
      expect(distrib.counts.reduce((sum, count) => sum + count, 0)).toBe(1200);
    }
    expect(result.passStats).toEqual({ numVars: 1200, filtering: {} });
  });

  test("the histograms of panel.vcf.gz are those of panel.nei: the same edges, means and counts", () => {
    const ofNei = resultOf(
      opened("panel.nei").run(variantChecksJob(), ignore),
      "variantChecks",
    );
    const ofVcf = resultOf(
      opened("panel.vcf.gz").run(variantChecksJob(), ignore),
      "variantChecks",
    );
    expect(ofVcf.maf.mean).toBe(0.7163445463101891);
    expect(ofVcf).toEqual(ofNei);
  });

  test("a variant of three alleles is in a bin of the MAF below 0.5, and a variant with one allele called has a MAF of 1, in the last bin", () => {
    // 21 diploid individuals: 42 alleles, so that no frequency falls on
    // an edge of the 40 bins. The first variant has 15 alleles A, 14 G and
    // 13 T, a major allele frequency of 15/42, 0.357, in the bin from
    // 0.35 to 0.375; at the second every call is 0/0.
    const alleles = [
      ...Array<number>(15).fill(0),
      ...Array<number>(14).fill(1),
      ...Array<number>(13).fill(2),
    ];
    const names = Array.from({ length: 21 }, (_, i) => `i${String(i)}`);
    const triallelic = names.map(
      (_, i) => `${String(alleles[2 * i])}/${String(alleles[2 * i + 1])}`,
    );
    const vcf =
      '##fileformat=VCFv4.2\n##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">\n' +
      `#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\t${names.join("\t")}\n` +
      `1\t100\t.\tA\tG,T\t.\tPASS\t.\tGT\t${triallelic.join("\t")}\n` +
      `1\t200\t.\tC\tT\t.\tPASS\t.\tGT\t${names.map(() => "0/0").join("\t")}\n`;
    const runner = createRunner();
    const open = runner.open(VCF, {
      name: "alleles.vcf",
      source: new TextEncoder().encode(vcf),
    });
    expect(open.kind).toBe("ok");
    const result = resultOf(
      runner.run(variantChecksJob(), ignore),
      "variantChecks",
    );
    const expected = Array<number>(40).fill(0);
    expected[14] = 1;
    expected[39] = 1;
    expect([...result.maf.counts]).toEqual(expected);
    expect(result.maf.mean).toBeCloseTo((15 / 42 + 1) / 2, 12);
  });

  test("the bins are the job's: 20 from 0 to 0.5 give 21 edges and 20 counts, the values above 0.5 in no bin and in the mean", () => {
    const job: VariantChecksJob = {
      ...variantChecksJob(),
      numBins: 20,
      range: [0, 0.5],
    };
    const result = resultOf(
      opened("panel.nei").run(job, ignore),
      "variantChecks",
    );
    expect(result.binEdges.length).toBe(21);
    expect(result.binEdges[20]).toBe(0.5);
    expect([...result.maf.counts]).toEqual([...Array<number>(19).fill(0), 3]);
    expect(result.maf.mean).toBe(0.7163445463101891);
    expect(result.obsHet.counts.length).toBe(20);
    expect(result.unbiasedExpHet.counts.length).toBe(20);
  });

  test("minNumIndividuals is the job's: at 200 each histogram counts the 2 variants at which every individual is called", () => {
    const job: VariantChecksJob = {
      ...variantChecksJob(),
      minNumIndividuals: 200,
    };
    const result = resultOf(
      opened("panel.nei").run(job, ignore),
      "variantChecks",
    );
    for (const distrib of [result.maf, result.obsHet, result.unbiasedExpHet]) {
      expect(distrib.counts.reduce((sum, count) => sum + count, 0)).toBe(2);
    }
    expect(result.maf.mean).toBe(0.74375);
  });

  test("the histograms after a diversity at 0.05 are of every variant, the file opened again", () => {
    const runner = opened("panel.nei");
    runner.run(diversityJob([missingData(0.05)]), ignore);
    const result = resultOf(
      runner.run(variantChecksJob(), ignore),
      "variantChecks",
    );
    expect(result.passStats).toEqual({ numVars: 1200, filtering: {} });
    expect(result.maf.mean).toBe(0.7163445463101891);
  });

  test("the counts of the three filters, in their order, from a pass that keeps nothing of the blocks", () => {
    const told: Progress[] = [];
    const result = resultOf(
      opened("panel.nei").run(filterCountsJob(THREE_FILTERS), (progress) => {
        told.push(progress);
      }),
      "filterCounts",
    );
    expect(result.passStats).toEqual(THREE_COUNTS);
    expect(Object.keys(result.passStats.filtering)).toEqual([
      "missing_data",
      "obs_het",
      "maf",
    ]);
    expect(told).toEqual([
      { bytesRead: 0, numBytes: 261490, pass: 1, numPasses: 1 },
      { bytesRead: 259376, numBytes: 261490, pass: 1, numPasses: 1 },
    ]);
  });

  test("the counts of filters that keep no variant are a result, not a refusal", () => {
    const job = filterCountsJob([
      missingData(0.05),
      { kind: "maf", maxAllowedMaf: 0 },
    ]);
    const result = resultOf(
      opened("panel.nei").run(job, ignore),
      "filterCounts",
    );
    expect(result.passStats).toEqual({
      numVars: 0,
      filtering: {
        missing_data: { varsProcessed: 1200, varsKept: 1152 },
        maf: { varsProcessed: 1152, varsKept: 0 },
      },
    });
  });

  test("what told throws in the pass of the counts is thrown by run, that very value", () => {
    const thrown = new Error("told");
    let caught: unknown = null;
    try {
      opened("panel.nei").run(filterCountsJob([missingData(0.05)]), () => {
        throw thrown;
      });
    } catch (error: unknown) {
      caught = error;
    }
    expect(caught).toBe(thrown);
  });

  test.each([
    [
      "with no entry of a filter of the job",
      { numVars: 1152, filtering: {} },
      /^popnei_web defect: the counts of the pass have no filter missing_data$/,
    ],
    [
      "with an entry of a kind the job has not",
      {
        numVars: 1152,
        filtering: {
          missing_data: { varsProcessed: 1200, varsKept: 1152 },
          maf: { varsProcessed: 1152, varsKept: 1152 },
        },
      },
      /^popnei_web defect: the counts of the pass have filters the job has not: maf$/,
    ],
  ])(
    "popnei's counts of a pass %s are a defect thrown",
    (_case, counts, message) => {
      // The blocks of the pass are popnei's; only the counts read after
      // them are replaced.
      const iterBlocks = vi
        .spyOn(Variants.prototype, "iterBlocks")
        .mockImplementationOnce(function (this: Variants, options) {
          iterBlocks.mockRestore();
          const blocks = this.iterBlocks(options);
          vi.spyOn(blocks, "passStats", "get").mockReturnValue(counts);
          return blocks;
        });
      try {
        const runner = opened("panel.nei");
        expect(() =>
          runner.run(filterCountsJob([missingData(0.05)]), ignore),
        ).toThrow(message);
      } finally {
        iterBlocks.mockRestore();
      }
    },
  );
});

describe("VS1 D3 the passes of the runner: a file that no longer reads, in the new passes", () => {
  beforeAll(() => {
    vi.stubGlobal("FileReaderSync", TestFileReaderSync);
  });
  afterEach(() => {
    reading = "read";
  });
  afterAll(() => {
    vi.unstubAllGlobals();
  });

  test("a range the browser refuses in the iteration of the counts is reopenFailed", () => {
    const runner = createRunner();
    expect(runner.open(NEI, panelBlob()).kind).toBe("ok");
    reading = "notReadable";
    expect(runner.run(filterCountsJob([]), ignore)).toEqual({
      kind: "reopenFailed",
      name: "panel.nei",
      message: `${PANEL_NOT_GIVEN}the file changed`,
    });
  });

  test("a range the browser refuses in the statistics of each individual and in the histograms is reopenFailed", () => {
    for (const job of [individualChecksJob(), variantChecksJob()]) {
      const runner = createRunner();
      expect(runner.open(NEI, panelBlob()).kind).toBe("ok");
      reading = "notReadable";
      expect(runner.run(job, ignore).kind).toBe("reopenFailed");
      reading = "read";
    }
  });
});

describe("VS1 D3 the passes of the runner: transferablesOf", () => {
  test("of a diversity result, the five buffers of its five arrays, each once", () => {
    const result = valueOf(opened("panel.nei").run(diversityJob([]), ignore));
    const buffers = transferablesOf(result);
    expect(buffers.length).toBe(5);
    expect(new Set(buffers).size).toBe(5);
  });

  test("of the statistics of each individual, the buffers of popnei's two arrays", () => {
    const result = panelStats();
    expect(transferablesOf(result)).toEqual([
      result.missingGtRate.buffer,
      result.obsHetRate.buffer,
    ]);
  });

  test("of the histograms, the buffers of the edges and of the three counts, and one buffer held by two fields once", () => {
    const result = resultOf(
      opened("panel.nei").run(variantChecksJob(), ignore),
      "variantChecks",
    );
    const buffers = transferablesOf(result);
    expect(buffers).toEqual([
      result.binEdges.buffer,
      result.maf.counts.buffer,
      result.obsHet.counts.buffer,
      result.unbiasedExpHet.counts.buffer,
    ]);
    expect(new Set(buffers).size).toBe(4);
    const twice = {
      ...result,
      obsHet: { ...result.obsHet, counts: result.maf.counts },
    };
    expect(transferablesOf(twice).length).toBe(3);
  });

  test("of the counts of the filters, no buffer", () => {
    const result = resultOf(
      opened("panel.nei").run(filterCountsJob([missingData(0.05)]), ignore),
      "filterCounts",
    );
    expect(transferablesOf(result)).toEqual([]);
  });

  test("an array of the statistics of each individual that is a view of part of a buffer throws a defect", () => {
    const result = panelStats();
    const view = new Float64Array(new ArrayBuffer(8 * 201), 8, 200);
    expect(() => transferablesOf({ ...result, obsHetRate: view })).toThrow(
      /^popnei_web defect: an array of a result is a view/,
    );
  });
});

function writeJob(
  filters: readonly VariantFilter[],
  individuals: readonly string[] | null = null,
): WriteJob {
  return { format: "nei", fileId: FILE_ID, filters, individuals };
}

/** The file of an answer to a write that has to be `ok`, with its bytes. */
async function writtenOf(answer: Answer<Written<Blob>>): Promise<{
  readonly written: Written<Blob>;
  readonly bytes: Uint8Array<ArrayBuffer>;
}> {
  if (answer.kind !== "ok") {
    throw new Error(`the answer is ${answer.kind}: ${JSON.stringify(answer)}`);
  }
  const written = answer.value;
  expect(written.file).toBeInstanceOf(Blob);
  return {
    written,
    bytes: new Uint8Array(await written.file.arrayBuffer()),
  };
}

/** What openVars reads back from written bytes, through a runner of its
    own: the individuals, and the variants a pass with no filter gives. */
function readBack(bytes: Uint8Array<ArrayBuffer>): {
  readonly individuals: readonly string[];
  readonly numVars: number;
} {
  const runner = createRunner();
  const { individuals } = valueOf(
    runner.open(NEI, { name: "written.nei", source: bytes }),
  );
  const counts = resultOf(
    runner.run(filterCountsJob([]), ignore),
    "filterCounts",
  );
  return { individuals, numVars: counts.passStats.numVars };
}

/** The progress of a pass over panel.nei, the two calls of the diversity. */
const PANEL_PROGRESS: readonly Progress[] = [
  { bytesRead: 0, numBytes: 261490, pass: 1, numPasses: 1 },
  { bytesRead: 259376, numBytes: 261490, pass: 1, numPasses: 1 },
];

/** The missing data filter at 0.05 and a MAF filter at 0, which keep no
    variant. */
const NO_VARIANT_KEPT: readonly VariantFilter[] = [
  missingData(0.05),
  { kind: "maf", maxAllowedMaf: 0 },
];

describe("IP1 D1 the written files of dev.3, VS1 D4 the written file of the runner: the three files with no list", () => {
  test("with no filter, a Blob of 261,570 bytes, numBytes 261,570, that openVars opens again with the 200 individuals and 1,200 variants", async () => {
    const { written, bytes } = await writtenOf(
      opened("panel.nei").write(writeJob([]), ignore),
    );
    expect(written.format).toBe("nei");
    expect(written.file.size).toBe(261570);
    expect(written.numBytes).toBe(261570);
    expect(bytes.length).toBe(261570);
    expect(written.passStats).toEqual({ numVars: 1200, filtering: {} });
    const back = readBack(bytes);
    expect(back.individuals.length).toBe(200);
    expect(back.individuals[0]).toBe("s000");
    expect(back.numVars).toBe(1200);
  });

  test("at 0.05, 251,074 bytes and the counts 1,152 of 1,200, that open again with 200 individuals and 1,152 variants", async () => {
    const { written, bytes } = await writtenOf(
      opened("panel.nei").write(writeJob([missingData(0.05)]), ignore),
    );
    expect(written.file.size).toBe(251074);
    expect(written.numBytes).toBe(251074);
    expect(written.passStats).toEqual(COUNTS_AT_0_05);
    const back = readBack(bytes);
    expect(back.individuals.length).toBe(200);
    expect(back.numVars).toBe(1152);
  });

  test("at 0.05 with a MAF filter at 0, a file of no variant, 3,682 bytes, written and not refused", async () => {
    const { written, bytes } = await writtenOf(
      opened("panel.nei").write(writeJob(NO_VARIANT_KEPT), ignore),
    );
    expect(written.file.size).toBe(3682);
    expect(written.numBytes).toBe(3682);
    expect(written.passStats).toEqual({
      numVars: 0,
      filtering: {
        missing_data: { varsProcessed: 1200, varsKept: 1152 },
        maf: { varsProcessed: 1152, varsKept: 0 },
      },
    });
    const back = readBack(bytes);
    expect(back.individuals.length).toBe(200);
    expect(back.numVars).toBe(0);
  });
});

describe("IP1 D1 the written files of dev.3, IP2 D1 the worker in the new order: the written files with the lists", () => {
  test("with the list of 116 before the filter at 0.05, 160,186 bytes and the counts 1,103 of 1,200, that open again with those 116 individuals in their order", async () => {
    const { of116 } = lists();
    expect(of116.length).toBe(116);
    const { written, bytes } = await writtenOf(
      opened("panel.nei").write(writeJob([missingData(0.05)], of116), ignore),
    );
    expect(written.file.size).toBe(160186);
    expect(written.numBytes).toBe(160186);
    expect(written.passStats).toEqual(COUNTS_AT_0_05_OF_116);
    const back = readBack(bytes);
    expect(back.individuals).toEqual(of116);
    expect(back.numVars).toBe(1103);
  });

  test("with the list of 111 before the filter at 0.05, 156,818 bytes and the counts 1,117 of 1,200, that open again with those 111 individuals", async () => {
    const { of111 } = lists();
    expect(of111.length).toBe(111);
    const { written, bytes } = await writtenOf(
      opened("panel.nei").write(writeJob([missingData(0.05)], of111), ignore),
    );
    expect(written.file.size).toBe(156818);
    expect(written.numBytes).toBe(156818);
    expect(written.passStats).toEqual(COUNTS_AT_0_05_OF_111);
    const back = readBack(bytes);
    expect(back.individuals).toEqual(of111);
    expect(back.numVars).toBe(1117);
  });
});

describe("VS1 D4 the written file of the runner: a file that holds no variant", () => {
  test("a Count and a write of a VCF of a header alone give the same counts, with no filter and with the missing data filter at 0.1", async () => {
    const header =
      '##fileformat=VCFv4.2\n##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">\n' +
      "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\ta\tb\n";
    const cases = [
      { filters: [], passStats: { numVars: 0, filtering: {} } },
      {
        filters: [missingData(0.1)],
        passStats: {
          numVars: 0,
          filtering: { missing_data: { varsProcessed: 0, varsKept: 0 } },
        },
      },
    ];
    for (const { filters, passStats } of cases) {
      const runner = createRunner();
      const open = runner.open(VCF, {
        name: "empty.vcf",
        source: new TextEncoder().encode(header),
      });
      expect(open.kind).toBe("ok");
      const counted = resultOf(
        runner.run(filterCountsJob(filters), ignore),
        "filterCounts",
      );
      const { written } = await writtenOf(
        runner.write(writeJob(filters), ignore),
      );
      expect(counted.passStats).toEqual(passStats);
      expect(written.passStats).toEqual(passStats);
    }
  });
});

describe("VS1 D4 the written file of the runner: its progress, told and the defects", () => {
  test("the progress of each of the five writes is the two calls of the diversity over panel.nei, in their order", () => {
    const { of116, of111 } = lists();
    const jobs = [
      writeJob([]),
      writeJob([missingData(0.05)]),
      writeJob([missingData(0.05)], of116),
      writeJob([missingData(0.05)], of111),
      writeJob(NO_VARIANT_KEPT),
    ];
    for (const job of jobs) {
      const told: Progress[] = [];
      const answer = opened("panel.nei").write(job, (progress) => {
        told.push(progress);
      });
      expect(answer.kind).toBe("ok");
      expect(told).toEqual(PANEL_PROGRESS);
    }
  });

  test("what told throws is thrown by write, that very value, and not answered refused", () => {
    const thrown = new Error("told");
    let caught: unknown = null;
    try {
      opened("panel.nei").write(writeJob([]), () => {
        throw thrown;
      });
    } catch (error: unknown) {
      caught = error;
    }
    expect(caught).toBe(thrown);
  });

  test("what told throws at popnei's last call, at the end of the write, is thrown by write too", () => {
    const thrown = new Error("told at the end");
    let calls = 0;
    let caught: unknown = null;
    try {
      opened("panel.nei").write(writeJob([]), () => {
        calls += 1;
        // The second of the two calls of a pass over panel.nei.
        if (calls === 2) {
          throw thrown;
        }
      });
    } catch (error: unknown) {
      caught = error;
    }
    expect(calls).toBe(2);
    expect(caught).toBe(thrown);
  });

  test("a write before the open is badRequest", () => {
    expect(createRunner().write(writeJob([]), ignore)).toEqual({
      kind: "badRequest",
      message: "a write before the open",
    });
  });

  test("a write of another load, after an open that popnei refused, or with an empty list of individuals is badRequest", () => {
    const other: WriteJob = { ...writeJob([]), fileId: "load-2" };
    expect(opened("panel.nei").write(other, ignore).kind).toBe("badRequest");
    const refused = createRunner();
    expect(
      refused.open(NEI, { name: "bad.vcf", source: bytesOf("bad.vcf") }).kind,
    ).toBe("refused");
    expect(refused.write(writeJob([]), ignore).kind).toBe("badRequest");
    expect(opened("panel.nei").write(writeJob([], []), ignore)).toEqual({
      kind: "badRequest",
      message: "an empty list of individuals",
    });
  });

  test("a write after a run with its steps does not open the file again, and one with other steps does", () => {
    const { file, reads } = countedPanel();
    const runner = createRunner();
    expect(runner.open(NEI, file).kind).toBe("ok");
    const counts = runner.run(filterCountsJob([missingData(0.05)]), ignore);
    expect(counts.kind).toBe("ok");
    expect(reads()).toBe(1);
    const same = runner.write(writeJob([missingData(0.05)]), ignore);
    expect(same.kind).toBe("ok");
    expect(reads()).toBe(1);
    const other = runner.write(writeJob([missingData(0.045)]), ignore);
    expect(other.kind).toBe("ok");
    expect(reads()).toBe(2);
  });

  test("a write with the first 100 of the list of 116, after one with the 116, opens the file again and holds those 100", async () => {
    // The list of 100 is a prefix of the one popnei already has, and the
    // steps are compared by the whole list, its length among it.
    const { of116 } = lists();
    const first100 = of116.slice(0, 100);
    const { file, reads } = countedPanel();
    const runner = createRunner();
    expect(runner.open(NEI, file).kind).toBe("ok");
    const all = await writtenOf(
      runner.write(writeJob([missingData(0.05)], of116), ignore),
    );
    expect(readBack(all.bytes).individuals).toEqual(of116);
    expect(reads()).toBe(1);
    const prefix = await writtenOf(
      runner.write(writeJob([missingData(0.05)], first100), ignore),
    );
    expect(reads()).toBe(2);
    expect(readBack(prefix.bytes).individuals).toEqual(first100);
  });
});

describe("VS1 D4 the written file of the runner: a file that no longer reads", () => {
  beforeAll(() => {
    vi.stubGlobal("FileReaderSync", TestFileReaderSync);
  });
  afterEach(() => {
    reading = "read";
  });
  afterAll(() => {
    vi.unstubAllGlobals();
  });

  test("a range the browser refuses in the write is reopenFailed, with popnei's message", () => {
    const runner = createRunner();
    expect(runner.open(NEI, panelBlob()).kind).toBe("ok");
    reading = "notReadable";
    expect(runner.write(writeJob([]), ignore)).toEqual({
      kind: "reopenFailed",
      name: "panel.nei",
      message: `${PANEL_NOT_GIVEN}the file changed`,
    });
  });
});

// The principal components, a PCA or a PCoA, on panel.nei, with the numbers
// of docs/specs/analyses/pca.md, "How it is verified", given by
// js-v0.1.0-dev.3 in node on 28 September 2026 (docs/specs/worker/runner.md,
// "How it is verified").

/** The LD filter the PCA has of its own in the flow of pca.md, r² 0.1
    within 50,000 base pairs. */
const OWN_LD: VariantFilter = { kind: "ld", maxAllowedR2: 0.1, maxDist: 50000 };

/** The filters of the PCA with its own LD filter: the missing data filter
    of a new project, which it follows, and its LD filter. */
const WITH_OWN_LD: readonly VariantFilter[] = [missingData(0.1), OWN_LD];

/** A job of the principal components of every individual, the PCA and 10
    components unless `overrides` says otherwise. */
function pcaJob(
  filters: readonly VariantFilter[],
  overrides: Partial<
    Pick<PcaJob, "individuals" | "method" | "numCompsKept">
  > = {},
): PcaJob {
  return {
    analysis: "pca",
    fileId: FILE_ID,
    filters,
    individuals: null,
    method: "pca",
    numCompsKept: 10,
    ...overrides,
  };
}

/** The first three numbers of the row of the individual at `row`. */
function rowOf(result: PcaResult, row: number): number[] {
  const start = row * result.numComps;
  return [...result.projections.slice(start, start + 3)];
}

/** The counts of the pass of the PCA with its own LD filter, in the order
    of its filters. */
const OWN_LD_COUNTS: PassStats = {
  numVars: 548,
  filtering: {
    missing_data: { varsProcessed: 1200, varsKept: 1200 },
    ld: { varsProcessed: 1200, varsKept: 548 },
  },
};

/** The header of a VCF of the individuals `names`, for the files the
    tests write. */
function vcfHeader(names: readonly string[]): string {
  return (
    '##fileformat=VCFv4.2\n##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">\n' +
    `#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\t${names.join("\t")}\n`
  );
}

/** A runner with the VCF of the text `vcf` opened. */
function openedVcf(name: string, vcf: string): Runner {
  const runner = createRunner();
  const open = runner.open(VCF, {
    name,
    source: new TextEncoder().encode(vcf),
  });
  expect(open.kind).toBe("ok");
  return runner;
}

/** Three individuals whose second variant is at position 10 after one at
    30, which popnei's LD filter refuses. */
const UNSORTED_VCF =
  vcfHeader(["a", "b", "c"]) +
  "1\t30\t.\tA\tG\t.\tPASS\t.\tGT\t0/0\t0/1\t1/1\n" +
  "1\t10\t.\tC\tT\t.\tPASS\t.\tGT\t0/1\t0/0\t1/1\n" +
  "1\t50\t.\tG\tA\t.\tPASS\t.\tGT\t1/1\t0/1\t0/0\n";

const LD_NOT_SORTED =
  "the variant 2 of the ones the filter by linkage disequilibrium has read, on the chromosome 1, does not come after the one before it, and that filter compares a variant with the ones it kept behind it on its chromosome: it is at the position 10 of its chromosome and the variant before it at the position 30 of the same chromosome; give it a source whose variants come with each chromosome together and in the order of their positions, which `bcftools sort` writes";

describe("IP6 D2 the runner's PCA", () => {
  test("the PCA with its own LD filter: popnei's numbers cut to 10 components, 548 variants used, the counts of its two filters in their order, and the two calls of the progress", () => {
    const told: Progress[] = [];
    const result = resultOf(
      opened("panel.nei").run(pcaJob(WITH_OWN_LD), (progress) => {
        told.push(progress);
      }),
      "pca",
    );
    expect(result.method).toBe("pca");
    expect(result.individuals.length).toBe(200);
    expect(result.individuals[0]).toBe("s000");
    expect(result.numCompsFound).toBe(199);
    expect(result.numComps).toBe(10);
    expect(result.projections.length).toBe(2000);
    expect(rowOf(result, 0)).toEqual([
      -0.7138853335304419, 7.676473141448964, -4.384383801903496,
    ]);
    expect(rowOf(result, 199)).toEqual([
      -2.395576470232154, -0.7377179681081428, -2.345958102269474,
    ]);
    expect([...result.explainedVariancePercent]).toEqual([
      3.5476992895181616, 3.402040462155611, 1.8945553874570624,
      1.8450769825884152, 1.758262625226421, 1.7485467724341495,
      1.708007168008476, 1.686458089265927, 1.6382789728126605,
      1.6282559875034457,
    ]);
    expect(result.numVarsUsed).toBe(548);
    expect(result.lingoesConstant).toBeNull();
    expect(result.negativeEigenvaluesPercent).toBeNull();
    expect(result.passStats).toEqual(OWN_LD_COUNTS);
    expect(Object.keys(result.passStats.filtering)).toEqual([
      "missing_data",
      "ld",
    ]);
    expect(told).toEqual(PANEL_PROGRESS);
  });

  test("the PCA with the filters of a new project: PC1 7.61% and PC2 5.56%, s000 at 1.573 on PC1, and the 1,200 variants used", () => {
    const result = resultOf(
      opened("panel.nei").run(pcaJob([missingData(0.1)]), ignore),
      "pca",
    );
    expect(result.numComps).toBe(10);
    expect(result.numCompsFound).toBe(199);
    expect([...result.explainedVariancePercent]).toEqual([
      7.605779109441194, 5.555518021523858, 1.5660537372523171,
      1.524724130017964, 1.5009086368595066, 1.4889112799690014,
      1.470027654529171, 1.4483203636207653, 1.4166200151078203,
      1.382667451283622,
    ]);
    expect(rowOf(result, 0)).toEqual([
      1.5730359180131923, 12.900303725888635, -5.079684984380475,
    ]);
    expect(result.numVarsUsed).toBe(1200);
    expect(result.passStats).toEqual({
      numVars: 1200,
      filtering: { missing_data: { varsProcessed: 1200, varsKept: 1200 } },
    });
  });

  test("a job with numCompsKept 3 keeps 3 components, each row the first three of popnei's", () => {
    const runner = opened("panel.nei");
    const ten = resultOf(runner.run(pcaJob(WITH_OWN_LD), ignore), "pca");
    const three = resultOf(
      runner.run(pcaJob(WITH_OWN_LD, { numCompsKept: 3 }), ignore),
      "pca",
    );
    expect(three.numComps).toBe(3);
    expect(three.numCompsFound).toBe(199);
    expect(three.projections.length).toBe(600);
    expect([...three.explainedVariancePercent]).toEqual([
      3.5476992895181616, 3.402040462155611, 1.8945553874570624,
    ]);
    for (let row = 0; row < 200; row += 1) {
      expect([...three.projections.slice(row * 3, row * 3 + 3)]).toEqual(
        rowOf(ten, row),
      );
    }
  });

  test("two individuals, the list before the MAF filter at 0.95, which counts over them: one component of 100%", () => {
    const result = resultOf(
      opened("panel.nei").run(
        pcaJob([{ kind: "maf", maxAllowedMaf: 0.95 }], {
          individuals: ["s000", "s001"],
        }),
        ignore,
      ),
      "pca",
    );
    expect(result.individuals).toEqual(["s000", "s001"]);
    expect(result.numComps).toBe(1);
    expect(result.numCompsFound).toBe(1);
    expect([...result.explainedVariancePercent]).toEqual([100]);
    expect(result.projections[0]).toBe(18.841443681416774);
    expect(result.numVarsUsed).toBe(355);
    expect(result.passStats).toEqual({
      numVars: 613,
      filtering: { maf: { varsProcessed: 1200, varsKept: 613 } },
    });
  });

  test("filters that keep no variant are refused with popnei's words of the PCA", () => {
    expect(opened("panel.nei").run(pcaJob(NO_VARIANT_KEPT), ignore)).toEqual({
      kind: "refused",
      message: "there are no variants to do a PCA with",
    });
  });

  test("one individual is refused, since no variant varies", () => {
    expect(
      opened("panel.nei").run(
        pcaJob([{ kind: "maf", maxAllowedMaf: 0.95 }], {
          individuals: ["s000"],
        }),
        ignore,
      ),
    ).toEqual({
      kind: "refused",
      message:
        "no variant has more than one dosage among its called genotypes, so none of them varies and there is nothing to do a PCA with",
    });
  });

  test("a VCF whose second variant comes before the first is refused under an LD filter, and gives a result without it", () => {
    const runner = openedVcf("unsorted.vcf", UNSORTED_VCF);
    expect(runner.run(pcaJob([OWN_LD]), ignore)).toEqual({
      kind: "refused",
      message: LD_NOT_SORTED,
    });
    const result = resultOf(runner.run(pcaJob([]), ignore), "pca");
    expect(result.individuals).toEqual(["a", "b", "c"]);
    expect(result.numComps).toBe(2);
  });

  test("a variant of three alleles is not refused: every allele but the major one counts the same", () => {
    const vcf =
      vcfHeader(["a", "b", "c", "d"]) +
      "1\t10\t.\tA\tG,T\t.\tPASS\t.\tGT\t0/0\t0/1\t1/2\t2/2\n" +
      "1\t20\t.\tC\tT\t.\tPASS\t.\tGT\t0/1\t0/0\t1/1\t0/1\n";
    const result = resultOf(
      openedVcf("alleles.vcf", vcf).run(pcaJob([]), ignore),
      "pca",
    );
    expect(result.individuals).toEqual(["a", "b", "c", "d"]);
    expect(result.numVarsUsed).toBe(2);
  });

  test("the PCoA with the PCA's own LD filter: popnei's numbers of the corrected distances cut to 10 components, and a second run the same to the last bit", () => {
    const runner = opened("panel.nei");
    const told: Progress[] = [];
    const job = pcaJob(WITH_OWN_LD, { method: "pcoa" });
    const result = resultOf(
      runner.run(job, (progress) => {
        told.push(progress);
      }),
      "pca",
    );
    expect(result.method).toBe("pcoa");
    expect(result.individuals.length).toBe(200);
    expect(result.numCompsFound).toBe(198);
    expect(result.numComps).toBe(10);
    expect(result.projections.length).toBe(2000);
    expect([...result.explainedVariancePercent]).toEqual([
      3.679886264523731, 3.5413304853438237, 1.9573102613242979,
      1.8471127804041167, 1.8315661674388577, 1.7562462600666455,
      1.7027784245122337, 1.6731238565502609, 1.6316941256138073,
      1.6111863636656447,
    ]);
    expect(rowOf(result, 0)).toEqual([
      -0.0030332529765406636, 0.08117502269333857, 0.03633252913562992,
    ]);
    expect(rowOf(result, 199)).toEqual([
      -0.03392775490492186, -0.0011194016192959228, 0.012970339016726626,
    ]);
    expect(result.lingoesConstant).toBe(0.023674522901958598);
    expect(result.negativeEigenvaluesPercent).toBe(7.87126617431627);
    expect(result.numVarsUsed).toBeNull();
    expect(result.passStats).toEqual(OWN_LD_COUNTS);
    expect(told).toEqual(PANEL_PROGRESS);
    const again = resultOf(runner.run(job, ignore), "pca");
    expect(again).toEqual(result);
    expect(new Uint8Array(again.projections.buffer)).toEqual(
      new Uint8Array(result.projections.buffer),
    );
    expect(new Uint8Array(again.explainedVariancePercent.buffer)).toEqual(
      new Uint8Array(result.explainedVariancePercent.buffer),
    );
    expect(again.lingoesConstant).toBe(result.lingoesConstant);
    expect(again.negativeEigenvaluesPercent).toBe(
      result.negativeEigenvaluesPercent,
    );
  });

  test("the PCoA of the filters of a new project: PC1 9.62%, c 0.0142 and 2.98% of negative eigenvalues", () => {
    const result = resultOf(
      opened("panel.nei").run(
        pcaJob([missingData(0.1)], { method: "pcoa" }),
        ignore,
      ),
      "pca",
    );
    expect([...result.explainedVariancePercent.slice(0, 3)]).toEqual([
      9.624071140419273, 6.651014052013717, 1.7358089994362516,
    ]);
    expect(rowOf(result, 0)).toEqual([
      0.013100992356696437, 0.10359303419094794, -0.046161057061637055,
    ]);
    expect(result.lingoesConstant).toBe(0.014182298472042042);
    expect(result.negativeEigenvaluesPercent).toBe(2.983436163735554);
  });

  test("the PCoA of one individual is refused before the pass", () => {
    expect(
      opened("panel.nei").run(
        pcaJob([missingData(0.1)], { method: "pcoa", individuals: ["s000"] }),
        ignore,
      ),
    ).toEqual({
      kind: "refused",
      message:
        "there is 1 individual, and a principal coordinate analysis places 2 at least by the distance of each pair",
    });
  });

  test("the PCoA of filters that keep no variant is refused with the words of popnei's other calculations", () => {
    expect(
      opened("panel.nei").run(
        pcaJob(NO_VARIANT_KEPT, { method: "pcoa" }),
        ignore,
      ),
    ).toEqual({
      kind: "refused",
      message:
        "the pass gave no variant: its source gave 1200 and the steps kept none of them, the `missing_data` filter was given 1200 and kept 1152, the `maf` filter was given 1152 and kept 0; a statistic of a pass is calculated over the variants it gives",
    });
  });

  test("the PCoA of five individuals, the fifth called only where the others are missing, is refused for the pairs with no distance", () => {
    const vcf =
      vcfHeader(["a", "b", "c", "d", "e"]) +
      "1\t10\t.\tA\tG\t.\tPASS\t.\tGT\t0/0\t0/1\t1/1\t0/1\t./.\n" +
      "1\t20\t.\tC\tT\t.\tPASS\t.\tGT\t0/1\t0/0\t1/1\t1/1\t./.\n" +
      "1\t30\t.\tG\tA\t.\tPASS\t.\tGT\t./.\t./.\t./.\t./.\t0/1\n";
    expect(
      openedVcf("five.vcf", vcf).run(pcaJob([], { method: "pcoa" }), ignore),
    ).toEqual({
      kind: "refused",
      message:
        "4 of the 10 pairs of individuals have no distance, the first of them `a` and `e`, and `e` is in 4 of them; those pairs were called together at no variant; take that individual out with `filterIndividuals`, or run the PCA of the variants, which gives every individual a projection",
    });
  });

  test("the PCoA under an LD filter of a VCF not sorted is refused as the PCA is", () => {
    expect(
      openedVcf("unsorted.vcf", UNSORTED_VCF).run(
        pcaJob([OWN_LD], { method: "pcoa" }),
        ignore,
      ),
    ).toEqual({ kind: "refused", message: LD_NOT_SORTED });
  });

  test("the steps of a PCA: after a diversity at 0.1, the PCA with its own LD filter opens the file again, and a second PCA of the same job does not", () => {
    const { file, reads } = countedPanel();
    const runner = createRunner();
    expect(runner.open(NEI, file).kind).toBe("ok");
    valueOf(runner.run(diversityJob([missingData(0.1)]), ignore));
    expect(reads()).toBe(1);
    const first = resultOf(runner.run(pcaJob(WITH_OWN_LD), ignore), "pca");
    expect(reads()).toBe(2);
    const second = resultOf(runner.run(pcaJob(WITH_OWN_LD), ignore), "pca");
    expect(reads()).toBe(2);
    expect(second).toEqual(first);
  });

  test("a PCA whose numCompsKept is 0 is a badRequest, before any step", () => {
    const { file, reads } = countedPanel();
    const runner = createRunner();
    expect(runner.open(NEI, file).kind).toBe("ok");
    expect(
      runner.run(pcaJob(WITH_OWN_LD, { numCompsKept: 0 }), ignore),
    ).toEqual({
      kind: "badRequest",
      message: "numCompsKept 0: the principal components keep 1 at least",
    });
    expect(reads()).toBe(1);
  });

  test("a PCA with an empty list of individuals is a badRequest", () => {
    expect(
      opened("panel.nei").run(pcaJob(WITH_OWN_LD, { individuals: [] }), ignore),
    ).toEqual({ kind: "badRequest", message: "an empty list of individuals" });
  });

  test("transferablesOf of a result of the PCA: the buffers of its projections and of its percentages, each once, and a view of part of a buffer throws", () => {
    const result = resultOf(
      opened("panel.nei").run(pcaJob(WITH_OWN_LD, { numCompsKept: 3 }), ignore),
      "pca",
    );
    expect(transferablesOf(result)).toEqual([
      result.projections.buffer,
      result.explainedVariancePercent.buffer,
    ]);
    expect(
      transferablesOf({
        ...result,
        explainedVariancePercent: result.projections,
      }),
    ).toEqual([result.projections.buffer]);
    const view = new Float64Array(new ArrayBuffer(8 * 4), 8, 3);
    expect(() =>
      transferablesOf({ ...result, explainedVariancePercent: view }),
    ).toThrow(/^popnei_web defect: an array of a result is a view/);
  });
});

describe("IP4 D1 the diversity on one population", () => {
  test('the 200 individuals of panel.nei as "All individuals", with the missing data filter at 0.05, give the first row of the table of diversity.md', () => {
    const everyone = panelPops().flatMap(([, individuals]) => individuals);
    expect(everyone.length).toBe(200);
    const result = valueOf(
      opened("panel.nei").run(
        diversityJob([missingData(0.05)], [["All individuals", everyone]]),
        ignore,
      ),
    );
    expect(numbersOf(result)).toEqual({
      pops: ["All individuals"],
      numIndividuals: [200],
      unbiasedExpHet: [0.37487834409014364],
      obsHet: [0.3541409192154764],
      polyRatio: [0.9791666666666666],
      numVarsWithValue: [1152],
      passStats: AT_0_05.passStats,
    });
  });
});
