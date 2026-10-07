/**
 * The order of the heatmap of the distances between populations in the
 * cases panel.nei does not give (docs/specs/worker/runner.md, "The
 * distances between populations", step 4, and
 * docs/specs/analyses/popDists.md, "The order of the heatmap"): a pair
 * with no distance, every distance 0 once a negative one is taken as 0,
 * and a refusal of popnei's PCoA, `notPlaced`, which no real matrix of Fst
 * or D was found to bring about. popnei is mocked: `calcPopDists` runs over
 * panel.nei and the populations of panel_pops.csv, and its distances of a
 * measure are then replaced by a matrix made for the case. An infinite
 * distance is such a matrix: popnei's Lingoes' correction refuses it with
 * its own message, which the runner keeps as the reason `notPlaced`. The
 * checks of popnei's answer, its populations, its measures and its counts,
 * are here too, with answers changed in the same way.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type * as Popnei from "popnei";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import type { Pops, PopDistsJob, PopDistsResult } from "./protocol.ts";
import { createRunner, loadPopnei } from "./runner.ts";
import { INSTALLED_POPNEI_VERSION } from "./testSupport.ts";

/** The changes made to popnei's answers, none while every field is
    `null`. */
const tampering: {
  /** The distances of each measure given in the place of popnei's. */
  fst: readonly number[] | null;
  dest: readonly number[] | null;
  /** The counts of variants of each pair in the place of popnei's. */
  numVars: readonly number[] | null;
  /** The populations in the place of popnei's. */
  pops: readonly string[] | null;
  /** Whether popnei's answer holds no Jost's D. */
  noDest: boolean;
  /** What `doPcoa` throws in the place of its answer. */
  pcoaThrows: Error | null;
  /** The populations and the options popnei was given at its last call. */
  given: readonly unknown[];
} = {
  fst: null,
  dest: null,
  numVars: null,
  pops: null,
  noDest: false,
  pcoaThrows: null,
  given: [],
};

vi.mock("popnei", async (importOriginal) => {
  const original = await importOriginal<typeof Popnei>();
  /** The distances of popnei's `given` with the vector `made`, when one
      was made. */
  const madeOr = (
    given: Popnei.Distances | null,
    made: readonly number[] | null,
  ): Popnei.Distances | null =>
    given === null || made === null
      ? given
      : new original.Distances(
          Float64Array.from(made),
          given.names,
          given.passStats,
        );
  return {
    ...original,
    calcPopDists: (
      ...args: Parameters<typeof original.calcPopDists>
    ): Popnei.PopDists => {
      tampering.given = [args[1], args[2]];
      const given = original.calcPopDists(...args);
      return {
        ...given,
        pops: tampering.pops ?? given.pops,
        fst: madeOr(given.fst, tampering.fst),
        dest: tampering.noDest ? null : madeOr(given.dest, tampering.dest),
        numVars:
          tampering.numVars === null
            ? given.numVars
            : Int32Array.from(tampering.numVars),
      };
    },
    doPcoa: (distances: Popnei.Distances): Popnei.PcoaResult => {
      if (tampering.pcoaThrows !== null) {
        throw tampering.pcoaThrows;
      }
      return original.doPcoa(distances);
    },
  };
});

const FIXTURES = join(import.meta.dirname, "..", "..", "e2e", "fixtures");
const FILE_ID = "load-1";

beforeAll(async () => {
  expect(await loadPopnei()).toEqual({
    ok: true,
    value: INSTALLED_POPNEI_VERSION,
  });
});

afterEach(() => {
  tampering.fst = null;
  tampering.dest = null;
  tampering.numVars = null;
  tampering.pops = null;
  tampering.noDest = false;
  tampering.pcoaThrows = null;
});

/** The populations of panel_pops.csv, p0, p2 and p1, in the order they
    first appear. */
function panelPops(): Pops {
  const lines = readFileSync(join(FIXTURES, "panel_pops.csv"), "utf8")
    .trim()
    .split("\n")
    .slice(1);
  const pops = new Map<string, string[]>();
  for (const line of lines) {
    const [individual, pop] = line.split(",");
    if (individual === undefined || pop === undefined) {
      throw new Error(`a line of panel_pops.csv with no comma: ${line}`);
    }
    const members = pops.get(pop) ?? [];
    members.push(individual);
    pops.set(pop, members);
  }
  return [...pops.entries()];
}

const JOB: PopDistsJob = {
  analysis: "popDists",
  fileId: FILE_ID,
  filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.1 }],
  individuals: null,
  pops: panelPops(),
  leftOut: [],
  minNumIndividuals: 20,
};

function ignore(): void {
  // The progress, which these tests do not look at.
}

/** What the runner answers the job `job` over panel.nei. */
function run(
  job: PopDistsJob = JOB,
): ReturnType<ReturnType<typeof createRunner>["run"]> {
  const runner = createRunner();
  const opened = runner.open(
    { fileId: FILE_ID, format: "nei", readOptions: null },
    {
      name: "panel.nei",
      source: new Uint8Array(readFileSync(join(FIXTURES, "panel.nei"))),
    },
  );
  expect(opened.kind).toBe("ok");
  return runner.run(job, ignore);
}

/** The result of the job `job`, which has to be of the distances. */
function resultOfRun(job: PopDistsJob = JOB): PopDistsResult {
  const answer = run(job);
  if (answer.kind !== "ok" || answer.value.analysis !== "popDists") {
    throw new Error(`the answer is ${JSON.stringify(answer)}`);
  }
  return answer.value;
}

/** popnei's refusal of an infinite distance of p0 and p2, js-v0.1.0-dev.3,
    held as a literal: a change of its words is a change of what the
    panel shows. */
const INFINITE_REFUSED =
  "the distance of `p0` and `p2` is Infinity, and a principal coordinate analysis needs every distance finite and 0 or above; a negative F_ST or f_2 is of two populations the dataset cannot tell apart";

/** The order p2, p0, p1 of p0, p2 and p1, which panel.nei gives. */
const P2_P0_P1 = { kind: "pcoa", order: Uint32Array.of(1, 0, 2) };

describe("PA3 D2 the runner's distances: the orders panel.nei does not give", () => {
  test("a pair with no distance keeps the order of the file for that measure alone, noDistance, and the result holds its NaN", () => {
    tampering.fst = [0.1, Number.NaN, 0.11];
    const result = resultOfRun();
    expect([...result.fst]).toEqual([0.1, Number.NaN, 0.11]);
    expect(result.order).toEqual({
      fst: { kind: "file", reason: "noDistance" },
      dest: P2_P0_P1,
    });
  });

  test("distances negative or 0 keep the order of the file, allZero, and the result holds the negative ones as popnei gave them", () => {
    tampering.dest = [-0.01, 0, -0.002];
    const result = resultOfRun();
    expect([...result.dest]).toEqual([-0.01, 0, -0.002]);
    expect(result.order).toEqual({
      fst: P2_P0_P1,
      dest: { kind: "file", reason: "allZero" },
    });
  });

  test("a negative distance is taken as 0 for the order alone: p0 and p2 at −0.05 are placed together, as at 0, and the result holds −0.05", () => {
    // p0 and p2 at 0 of each other and both 0.3 from p1: p1 at one end.
    tampering.fst = [-0.05, 0.3, 0.3];
    const result = resultOfRun();
    expect(result.fst[0]).toBe(-0.05);
    const order = result.order.fst;
    if (order.kind !== "pcoa") {
      throw new Error(`the order is ${JSON.stringify(order)}`);
    }
    expect([order.order[0], order.order[2]]).toContain(2);
    expect(order.order[1]).not.toBe(2);
  });

  test("an infinite distance, refused by popnei's Lingoes' correction, keeps the order of the file, notPlaced, with popnei's message, and the other measure is ordered", () => {
    tampering.fst = [Number.POSITIVE_INFINITY, 0.1, 0.11];
    const result = resultOfRun();
    expect(result.order).toEqual({
      fst: { kind: "file", reason: "notPlaced", message: INFINITE_REFUSED },
      dest: P2_P0_P1,
    });
  });

  test("a plain Error of doPcoa is notPlaced with its message, and what else it throws, a RangeError of the memory, is thrown", () => {
    tampering.pcoaThrows = new Error("popnei: the linear algebra failed");
    expect(resultOfRun().order).toEqual({
      fst: {
        kind: "file",
        reason: "notPlaced",
        message: "popnei: the linear algebra failed",
      },
      dest: {
        kind: "file",
        reason: "notPlaced",
        message: "popnei: the linear algebra failed",
      },
    });
    tampering.pcoaThrows = new RangeError("could not allocate memory");
    expect(() => run()).toThrow(RangeError);
  });
});

describe("PA3 D2 the runner's distances: popnei's answer checked", () => {
  test("popnei is given the populations of the job in its order, and the options of no standard errors, the two measures and the minimum alone", () => {
    resultOfRun();
    const [pops, options] = tampering.given;
    expect(Object.keys(pops ?? {})).toEqual(["p0", "p2", "p1"]);
    expect(options).toStrictEqual({
      jackknifeGroup: null,
      measures: ["fst", "dest"],
      minNumIndividuals: 20,
    });
  });

  test("a negative count of variants of a pair is thrown as a defect", () => {
    tampering.numVars = [1200, -1, 1200];
    expect(() => run()).toThrow(
      /^popnei_web defect: calcPopDists counted -1 variants for the pair "p0", "p1"$/,
    );
  });

  test("populations of popnei that are not the job's are thrown as a defect", () => {
    tampering.pops = ["p0", "p2", "p3"];
    expect(() => run()).toThrow(
      /^popnei_web defect: calcPopDists gave the populations/,
    );
  });

  test("no Jost's D in popnei's answer is thrown as a defect", () => {
    tampering.noDest = true;
    expect(() => run()).toThrow(
      "popnei_web defect: calcPopDists gave no dest, which was asked for",
    );
  });
});

describe("PA3 D2 the runner's distances: popnei's pairs put back in the order of the job", () => {
  test("the counts of variants of each pair follow popnei's order of the names 3, 1 and 2, and are put back in the job's", () => {
    const [p0, p2, p1] = panelPops();
    if (p0 === undefined || p2 === undefined || p1 === undefined) {
      throw new Error("panel_pops.csv has three populations");
    }
    const job: PopDistsJob = {
      ...JOB,
      pops: [
        ["3", p0[1]],
        ["1", p2[1]],
        ["2", p1[1]],
      ],
    };
    // popnei orders the names 1, 2, 3: its pairs are (1, 2), (1, 3) and
    // (2, 3), and the job's (3, 1), (3, 2) and (1, 2).
    tampering.numVars = [10, 20, 30];
    const result = resultOfRun(job);
    expect(result.pops).toEqual(["3", "1", "2"]);
    expect(result.numVarsPerPair).toEqual(Uint32Array.of(20, 30, 10));
  });
});

describe("PA3 D2 the runner's distances: an exact tie of the first axis", () => {
  test("p2 and p1, at 0 of each other and 0.3 from p0, have the same projection, and keep the order of the file, p2 before p1", () => {
    tampering.fst = [0.3, 0.3, 0];
    expect(resultOfRun().order.fst).toEqual({
      kind: "pcoa",
      order: Uint32Array.of(1, 2, 0),
    });
  });
});
