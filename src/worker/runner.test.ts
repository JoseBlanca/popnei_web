/**
 * The runner of the calculation worker in node, over the fixtures of
 * e2e/fixtures/ given as bytes (docs/specs/worker/runner.md, "How it is
 * verified"). The numbers are popnei's of the release js-v0.1.0-dev.2, as
 * the spec's table has them, compared exactly: the runner passes them on
 * with no arithmetic.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

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
  Pops,
  Progress,
  VariantFilter,
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
    individualFilters: [],
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

/** The value of an answer that has to be `ok`. */
function valueOf<T>(answer: Answer<T>): T {
  if (answer.kind !== "ok") {
    throw new Error(`the answer is ${answer.kind}: ${JSON.stringify(answer)}`);
  }
  return answer.value;
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
    numVars: result.numVars,
    numVarsRead: result.numVarsRead,
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
  numVars: 1200,
  numVarsRead: 1200,
};

/** The table of the runner spec with the missing data filter at 0.05. */
const AT_0_05 = {
  pops: ["p0", "p2", "p1"],
  numIndividuals: [48, 84, 68],
  unbiasedExpHet: [0.35267894847982756, 0.3440824705971255, 0.3498365468860467],
  obsHet: [0.35667985874177544, 0.3512406974637824, 0.35603713961547323],
  polyRatio: [0.9288194444444444, 0.9105902777777778, 0.9157986111111112],
  numVarsWithValue: [1152, 1152, 1152],
  numVars: 1152,
  numVarsRead: 1200,
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
    expect(valueOf(at005).numVars).toBe(1152);
    expect(valueOf(at0045).numVars).toBe(1113);
  });

  test("a change of the filters opens the file again, and each run gives the numbers of its own filters", () => {
    const runner = opened("panel.nei");
    expect(
      valueOf(runner.run(diversityJob([missingData(0.05)]), ignore)).numVars,
    ).toBe(1152);
    expect(
      valueOf(runner.run(diversityJob([missingData(0.045)]), ignore)).numVars,
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
    expect(valueOf(next).numVarsRead).toBe(1200);
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
    expect(result.pops).toEqual(["10", "2", "p1"]);
    expect([...result.numIndividuals]).toEqual([48, 84, 68]);
    expect([...result.unbiasedExpHet]).toEqual(NO_FILTER.unbiasedExpHet);
    expect([...result.obsHet]).toEqual(NO_FILTER.obsHet);
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

/** The `FileReaderSync` of the tests, put in place with `vi.stubGlobal`. */
class TestFileReaderSync {
  readAsArrayBuffer(blob: Blob): ArrayBuffer {
    if (!(blob instanceof BytesBlob)) {
      throw new Error("the reader of the tests reads a BytesBlob only");
    }
    switch (reading) {
      case "read":
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
    expect(valueOf(first).numVars).toBe(1152);
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

  test("a job with a filter of individuals is badRequest", () => {
    const job: DiversityJob = {
      ...diversityJob([]),
      individualFilters: [{ kind: "remove", individuals: ["s000"] }],
    };
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
