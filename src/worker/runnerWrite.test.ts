/**
 * The written file by pieces, in node, over the fixtures of e2e/fixtures/
 * given as bytes and a VCF of 3,000 variants of 1,000 individuals that
 * e2e/bigVcf.ts writes into a folder of the test's
 * (docs/specs/worker/runner.md, "How it is verified", bullet "The written
 * file, by pieces"). From popnei 0.2.2 the runner gives `onBytes` to
 * `writeVars` and `writeVcf` and gathers the pieces of 1 MiB into parts;
 * each test compares the bytes of its `Blob` with those the same popnei
 * call gives whole, without `onBytes`, over a `Variants` the test opens
 * and filters itself. The sizes are popnei 0.2.2's, taken under node on 8
 * October 2026.
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- the test writes the whole file with popnei's own call, without onBytes, to compare the runner's pieces with it
import { openVars, openVcf, writeVars, writeVcf } from "popnei";
import type { Variants } from "popnei";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

import { writeBigVcf } from "../../e2e/bigVcf.ts";
import type {
  PassStats,
  VariantFilter,
  WriteJob,
  Written,
} from "./protocol.ts";
import { createRunner, loadPopnei } from "./runner.ts";
import type { Answer, LoadToOpen, Runner, RunnerOptions } from "./runner.ts";
import { INSTALLED_POPNEI_VERSION } from "./testSupport.ts";

const FIXTURES = join(import.meta.dirname, "..", "..", "e2e", "fixtures");
const FILE_ID = "load-1";
const ONE_PIECE = 1_048_576;

const NEI: LoadToOpen = { fileId: FILE_ID, format: "nei", readOptions: null };
/** A VCF opened as popgen2.html opens every VCF, with every variant. */
const VCF: LoadToOpen = {
  fileId: FILE_ID,
  format: "vcf",
  readOptions: { ploidy: 2, onlyPassed: false },
};

const PASSED: VariantFilter = { kind: "passed" };

function missingData(maxAllowedMissingRate: number): VariantFilter {
  return { kind: "missing_data", maxAllowedMissingRate };
}

/** The bytes of a fixture, a copy: node keeps a small file it reads inside
    a larger buffer it shares, which popnei would be given whole. */
function bytesOf(name: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(readFileSync(join(FIXTURES, name)));
}

/** The folder of the test, where the big VCF is written. */
let folder = "";
/** The big VCF, 3,000 variants of 1,000 individuals, gzipped. */
let bigVcf: Uint8Array<ArrayBuffer> = new Uint8Array(0);

beforeAll(async () => {
  expect(await loadPopnei()).toEqual({
    ok: true,
    value: INSTALLED_POPNEI_VERSION,
  });
  folder = mkdtempSync(join(tmpdir(), "popnei-web-write-"));
  const path = join(folder, "big.vcf.gz");
  await writeBigVcf(path, 3000);
  bigVcf = new Uint8Array(readFileSync(path));
});

afterAll(() => {
  if (folder !== "") {
    rmSync(folder, { recursive: true, force: true });
  }
});

function ignore(): void {
  // The progress, which these tests do not look at.
}

function writeJob(
  format: WriteJob["format"],
  filters: readonly VariantFilter[],
): WriteJob {
  return { format, fileId: FILE_ID, filters, individuals: null };
}

/** A runner made with `options`, with `source` opened as `load`. */
function opened(
  load: LoadToOpen,
  source: Uint8Array<ArrayBuffer>,
  options: RunnerOptions = {},
): Runner {
  const runner = createRunner(options);
  expect(runner.open(load, { name: "source", source }).kind).toBe("ok");
  return runner;
}

/** The file of an answer to a write that has to be `ok`, with its bytes. */
async function writtenOf(answer: Answer<Written<Blob>>): Promise<{
  readonly written: Written<Blob>;
  readonly bytes: Uint8Array;
}> {
  if (answer.kind !== "ok") {
    throw new Error(`the answer is ${answer.kind}: ${JSON.stringify(answer)}`);
  }
  expect(answer.value.file).toBeInstanceOf(Blob);
  return {
    written: answer.value,
    bytes: new Uint8Array(await answer.value.file.arrayBuffer()),
  };
}

/** Checks that `found` holds the bytes of `expected`, comparing them as
    node's `Buffer`s: Vitest's deep equality walks an array of megabytes
    element by element, for seconds. */
function expectSameBytes(found: Uint8Array, expected: Uint8Array): void {
  expect(found.length).toBe(expected.length);
  expect(Buffer.from(found).compare(Buffer.from(expected))).toBe(0);
}

/** `source` opened as `load` by popnei itself, with the filters on it. */
function popneiVariants(
  load: LoadToOpen,
  source: Uint8Array<ArrayBuffer>,
  filters: readonly VariantFilter[],
): Variants {
  const variants =
    load.format === "nei"
      ? openVars(source)
      : openVcf(source, { ploidy: 2, onlyPassed: false });
  for (const filter of filters) {
    switch (filter.kind) {
      case "passed":
        variants.filterPassed();
        break;
      case "missing_data":
        variants.filterByMissingData(filter.maxAllowedMissingRate);
        break;
      case "maf":
        variants.filterByMaf(filter.maxAllowedMaf);
        break;
      case "obs_het":
        variants.filterByObsHet(filter.maxAllowedObsHet);
        break;
      case "ld":
        variants.filterByLd(filter.maxAllowedR2, filter.maxDist);
        break;
    }
  }
  return variants;
}

/** The whole file popnei writes of `source` with the filters, without
    `onBytes`. */
function wholeFile(
  format: WriteJob["format"],
  load: LoadToOpen,
  source: Uint8Array<ArrayBuffer>,
  filters: readonly VariantFilter[],
): Uint8Array {
  const variants = popneiVariants(load, source, filters);
  try {
    return format === "nei"
      ? writeVars(variants).bytes
      : writeVcf(variants, { bgzip: true }).bytes;
  } finally {
    variants.free();
  }
}

/** The individuals and the variants popnei reads back from a written
    file, with `openVars` or `openVcf`. */
function readBack(
  format: WriteJob["format"],
  bytes: Uint8Array,
): { readonly numIndividuals: number; readonly numVars: number } {
  const source = new Uint8Array(bytes);
  const variants =
    format === "nei" ? openVars(source) : openVcf(source, { ploidy: 2 });
  try {
    const blocks = variants.iterBlocks();
    for (const block of blocks) {
      expect(block.numVars).toBeGreaterThan(0);
    }
    return {
      numIndividuals: variants.individuals.length,
      numVars: blocks.passStats.numVars,
    };
  } finally {
    variants.free();
  }
}

/** One case of the fixtures: the source, its load and filters, and what
    each format gives. */
interface FixtureCase {
  readonly name: string;
  readonly load: LoadToOpen;
  readonly filters: readonly VariantFilter[];
  readonly numBytes: { readonly nei: number; readonly vcf: number };
  readonly passStats: PassStats;
}

const FIXTURE_CASES: readonly FixtureCase[] = [
  {
    name: "panel.nei",
    load: NEI,
    filters: [missingData(0.05)],
    numBytes: { nei: 251_074, vcf: 95_879 },
    passStats: {
      numVars: 1152,
      filtering: { missing_data: { varsProcessed: 1200, varsKept: 1152 } },
    },
  },
  {
    name: "panel.vcf.gz",
    load: VCF,
    filters: [PASSED, missingData(0.1)],
    numBytes: { nei: 261_746, vcf: 100_409 },
    passStats: {
      numVars: 1200,
      filtering: {
        passed: { varsProcessed: 1200, varsKept: 1200 },
        missing_data: { varsProcessed: 1200, varsKept: 1200 },
      },
    },
  },
  {
    name: "low_qual.vcf.gz",
    load: VCF,
    filters: [PASSED, missingData(0.1)],
    numBytes: { nei: 197_866, vcf: 75_577 },
    passStats: {
      numVars: 900,
      filtering: {
        passed: { varsProcessed: 1200, varsKept: 900 },
        missing_data: { varsProcessed: 900, varsKept: 900 },
      },
    },
  },
];

describe("DL2 D1 the written file, by pieces: the fixtures in both formats", () => {
  for (const fixture of FIXTURE_CASES) {
    for (const format of ["nei", "vcf"] as const) {
      test(`${fixture.name} as ${format}: ${String(fixture.numBytes[format])} bytes, those of popnei's whole file, with its counts, read back with ${String(fixture.passStats.numVars)} variants of 200 individuals`, async () => {
        const source = bytesOf(fixture.name);
        const { written, bytes } = await writtenOf(
          opened(fixture.load, source).write(
            writeJob(format, fixture.filters),
            ignore,
          ),
        );
        expect(written.format).toBe(format);
        expect(written.numBytes).toBe(fixture.numBytes[format]);
        expect(written.file.size).toBe(fixture.numBytes[format]);
        expect(written.passStats).toEqual(fixture.passStats);
        expectSameBytes(
          bytes,
          wholeFile(format, fixture.load, source, fixture.filters),
        );
        expect(readBack(format, bytes)).toEqual({
          numIndividuals: 200,
          numVars: fixture.passStats.numVars,
        });
      });
    }
  }
});

describe("DL2 D1 the written file, by pieces: a file of several pieces, a part of each", () => {
  test.each([
    ["nei", 3_320_026],
    ["vcf", 1_297_166],
  ] as const)(
    "the VCF of 3,000 variants of 1,000 individuals as %s, with a part of each piece: %i bytes, those of popnei's whole file",
    async (format, numBytes) => {
      const { written, bytes } = await writtenOf(
        opened(VCF, bigVcf, { writePartBytes: ONE_PIECE }).write(
          writeJob(format, []),
          ignore,
        ),
      );
      expect(written.numBytes).toBe(numBytes);
      expect(written.passStats).toEqual({ numVars: 3000, filtering: {} });
      expectSameBytes(bytes, wholeFile(format, VCF, bigVcf, []));
    },
  );

  test("with parts of 16 MiB, the default, the .nei file of the VCF of 3,000 variants is the same bytes", async () => {
    const { bytes } = await writtenOf(
      opened(VCF, bigVcf).write(writeJob("nei", []), ignore),
    );
    expectSameBytes(bytes, wholeFile("nei", VCF, bigVcf, []));
  });
});

describe("DL2 D1 the written file, by pieces: a file of no variant", () => {
  test.each([
    ["nei", 3682],
    ["vcf", 528],
  ] as const)(
    "the missing data filter at 0.05 and the MAF filter at 0.4 on panel.nei, as %s: %i bytes, numVars 0, answered and not refused",
    async (format, numBytes) => {
      const filters: readonly VariantFilter[] = [
        missingData(0.05),
        { kind: "maf", maxAllowedMaf: 0.4 },
      ];
      const source = bytesOf("panel.nei");
      const { written, bytes } = await writtenOf(
        opened(NEI, source).write(writeJob(format, filters), ignore),
      );
      expect(written.numBytes).toBe(numBytes);
      expect(written.passStats.numVars).toBe(0);
      expectSameBytes(bytes, wholeFile(format, NEI, source, filters));
    },
  );
});

describe("DL2 D1 the written file, by pieces: what goes wrong", () => {
  test("readLastByte is given the whole Blob, and a write with one that does not throw is answered ok", () => {
    const read: Blob[] = [];
    const answer = opened(NEI, bytesOf("panel.nei"), {
      readLastByte: (file) => {
        read.push(file);
      },
    }).write(writeJob("vcf", [missingData(0.05)]), ignore);
    expect(answer.kind).toBe("ok");
    expect(read).toHaveLength(1);
    expect(answer.kind === "ok" && answer.value.file).toBe(read[0]);
  });

  test.each(["nei", "vcf"] as const)(
    "a readLastByte that throws answers the %s write crashed, with the words of a file the browser could not keep",
    (format) => {
      const answer = opened(NEI, bytesOf("panel.nei"), {
        readLastByte: () => {
          throw new DOMException("the blob is gone", "NotReadableError");
        },
      }).write(writeJob(format, [missingData(0.05)]), ignore);
      const numBytes = format === "nei" ? 251_074 : 95_879;
      expect(answer).toEqual({
        kind: "crashed",
        message: `the browser could not keep the written file of ${String(numBytes)} bytes: the blob is gone`,
      });
    },
  );

  test("what told throws is thrown by a write of a VCF, that very value, and not answered refused", () => {
    const thrown = new Error("told");
    let caught: unknown = null;
    try {
      opened(NEI, bytesOf("panel.nei")).write(writeJob("vcf", []), () => {
        throw thrown;
      });
    } catch (error: unknown) {
      caught = error;
    }
    expect(caught).toBe(thrown);
  });

  test("what throws in keeping a piece is thrown by a write of the VCF of 3,000 variants, that very value, and not answered refused", () => {
    // The runner makes a Blob of each piece here, inside the onBytes that
    // popnei calls, so a Blob that throws is a defect of ours there.
    const thrown = new Error("no Blob");
    const runner = opened(VCF, bigVcf, { writePartBytes: ONE_PIECE });
    const NodeBlob = Blob;
    vi.stubGlobal(
      "Blob",
      class extends NodeBlob {
        constructor() {
          super();
          throw thrown;
        }
      },
    );
    let caught: unknown = null;
    try {
      runner.write(writeJob("vcf", []), ignore);
    } catch (error: unknown) {
      caught = error;
    } finally {
      vi.unstubAllGlobals();
    }
    expect(caught).toBe(thrown);
  });

  test.each(["nei", "vcf"] as const)(
    "a %s write whose pass popnei refuses after it gave pieces is answered refused, with popnei's message and no file",
    async (format) => {
      // A VCF of 12,000 variants, plain, with a line of a position that is
      // not a number after them: popnei's blocks hold about 10 MB of
      // genotypes, some 5,000 variants of 1,000 individuals, and it has
      // written the first two when it reaches the line.
      const plain = join(folder, "broken.vcf");
      await writeBigVcf(plain, 12_000);
      const good = readFileSync(plain);
      const broken = new Uint8Array(
        Buffer.concat([
          good,
          Buffer.from(
            `chr1\tnotAPosition\tbad\tA\tT\t.\t.\t.\tGT\t${Array.from({ length: 1000 }, () => "0/0").join("\t")}\n`,
          ),
        ]),
      );
      const runner = opened(VCF, broken, { writePartBytes: ONE_PIECE });
      // The parts the runner made, one of each piece, which shows that
      // popnei gave pieces before it refused.
      let numParts = 0;
      const NodeBlob = Blob;
      vi.stubGlobal(
        "Blob",
        class extends NodeBlob {
          constructor(parts?: BlobPart[]) {
            super(parts);
            numParts += 1;
          }
        },
      );
      let answer: Answer<Written<Blob>>;
      try {
        answer = runner.write(writeJob(format, []), ignore);
      } finally {
        vi.unstubAllGlobals();
      }
      expect(numParts).toBeGreaterThan(0);
      expect(answer).toEqual({
        kind: "refused",
        message:
          "line 12005 of the VCF, the column POS: `notAPosition` is not a position",
      });
    },
  );
});
