/**
 * The two checks the runner makes of popnei's answer to an LD decay
 * (docs/specs/worker/runner.md, "The LD decay"; docs/specs/analyses/
 * ldDecay.md, "The request"): every population has the number of bins of
 * the job, and the bins of every population are at the distances of those
 * of the first. popnei's rule makes both hold, so no real file breaks
 * them: popnei is mocked, `calcLdAndDistPerPop` runs over ld.nei, and the
 * bins of the second population are then replaced by bins made for the
 * case.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type * as Popnei from "popnei";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import type { LdDecayJob, Pops } from "./protocol.ts";
import { createRunner, loadPopnei } from "./runner.ts";

/** How the bins of the second population are changed; not while `null`. */
const tampering: {
  change: ((bins: Popnei.LdBins) => Popnei.LdBins) | null;
} = { change: null };

vi.mock("popnei", async (importOriginal) => {
  const original = await importOriginal<typeof Popnei>();
  return {
    ...original,
    calcLdAndDistPerPop: (
      ...args: Parameters<typeof original.calcLdAndDistPerPop>
    ): Popnei.LdAndDistPerPop => {
      const given = original.calcLdAndDistPerPop(...args);
      const change = tampering.change;
      const bins = given.perPop["pop_b"];
      if (change === null || bins === undefined) {
        return given;
      }
      return { ...given, perPop: { ...given.perPop, pop_b: change(bins) } };
    },
  };
});

const FIXTURES = join(import.meta.dirname, "..", "..", "e2e", "fixtures");
const FILE_ID = "load-1";

beforeAll(async () => {
  expect(await loadPopnei()).toEqual({ ok: true, value: "0.1.0" });
});

afterEach(() => {
  tampering.change = null;
});

/** The individuals of ld.nei, i000 to i099. */
const INDIVIDUALS = Array.from(
  { length: 100 },
  (_, i) => `i${String(i).padStart(3, "0")}`,
);

const POPS: Pops = [
  ["pop_a", INDIVIDUALS.slice(0, 50)],
  ["pop_b", INDIVIDUALS.slice(50)],
];

const JOB: LdDecayJob = {
  analysis: "ldDecay",
  fileId: FILE_ID,
  filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.1 }],
  individuals: null,
  pops: POPS,
  minDist: 1,
  maxDist: 100000,
  numBins: 50,
  maxAllowedMaf: 0.95,
};

function ignore(): void {
  // The progress, which these tests do not look at.
}

/** What the runner answers the job over ld.nei. */
function run(): ReturnType<ReturnType<typeof createRunner>["run"]> {
  const runner = createRunner();
  const opened = runner.open(
    { fileId: FILE_ID, format: "nei", readOptions: null },
    {
      name: "ld.nei",
      source: new Uint8Array(readFileSync(join(FIXTURES, "ld.nei"))),
    },
  );
  expect(opened.kind).toBe("ok");
  return runner.run(JOB, ignore);
}

describe("PA2 D2 the runner's LD decay: its checks of popnei's answer", () => {
  test("popnei's answer unchanged passes both checks", () => {
    expect(run().kind).toBe("ok");
  });

  test("bins of the second population at other distances than those of the first are thrown as a defect", () => {
    tampering.change = (bins) => ({
      ...bins,
      smallestDist: bins.smallestDist.map((dist, bin) =>
        bin === 1 ? dist + 1 : dist,
      ),
    });
    expect(run).toThrow(
      'popnei_web defect: the bins of the population "pop_b" are not at the distances of those of "pop_a"',
    );
  });

  test("the largest distances of the second population's bins changed are thrown as a defect too", () => {
    tampering.change = (bins) => ({
      ...bins,
      largestDist: bins.largestDist.map((dist, bin) =>
        bin === 49 ? dist - 1 : dist,
      ),
    });
    expect(run).toThrow(
      /^popnei_web defect: the bins of the population "pop_b" are not at the distances/u,
    );
  });

  test("another number of bins than the job's is thrown as a defect", () => {
    tampering.change = (bins) => ({
      ...bins,
      numPairs: bins.numPairs.slice(0, 49),
    });
    expect(run).toThrow(
      'popnei_web defect: popnei gave the population "pop_b" 49 bins, not 50',
    );
  });
});
