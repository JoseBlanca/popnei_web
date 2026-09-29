/**
 * The runner's checks of popnei's answer to a PCA or a PCoA
 * (docs/specs/worker/runner.md, "The principal components", step 3):
 * popnei's individuals are those the pass was to give, in their order,
 * and its projections hold individuals × components numbers, or the
 * runner throws a defect, since the projections would be read under other
 * names. popnei always answers in the order of the job, so these answers
 * are made here: popnei is mocked, each of its two calls giving popnei's
 * own answer changed by `tamper`, and passing it on as it is while
 * `tamper` is `null`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type * as Popnei from "popnei";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import type { PcaJob, PcaMethod } from "./protocol.ts";
import { createRunner, loadPopnei } from "./runner.ts";
import type { Runner } from "./runner.ts";

/** What popnei's answer to a PCA or a PCoA holds that the checks read. */
interface Answered {
  readonly individuals: readonly string[];
  readonly projections: Float64Array;
  readonly numComps: number;
}

/** The change made to popnei's answer, or `null` for none. */
const tampering: { tamper: (<T extends Answered>(found: T) => T) | null } = {
  tamper: null,
};

vi.mock("popnei", async (importOriginal) => {
  const original = await importOriginal<typeof Popnei>();
  const changed = <T extends Answered>(found: T): T =>
    tampering.tamper === null ? found : tampering.tamper(found);
  return {
    ...original,
    doPcaFromVariants: (
      ...args: Parameters<typeof original.doPcaFromVariants>
    ) => changed(original.doPcaFromVariants(...args)),
    doPcoaFromVariants: (
      ...args: Parameters<typeof original.doPcoaFromVariants>
    ) => changed(original.doPcoaFromVariants(...args)),
  };
});

const FIXTURES = join(import.meta.dirname, "..", "..", "e2e", "fixtures");
const FILE_ID = "load-1";

beforeAll(async () => {
  expect(await loadPopnei()).toEqual({ ok: true, value: "0.1.0" });
});

afterEach(() => {
  tampering.tamper = null;
});

/** A runner with panel.nei opened, its 200 individuals s000 to s199. */
function opened(): Runner {
  const runner = createRunner();
  const answer = runner.open(
    { fileId: FILE_ID, format: "nei", readOptions: null },
    {
      name: "panel.nei",
      source: new Uint8Array(readFileSync(join(FIXTURES, "panel.nei"))),
    },
  );
  expect(answer.kind).toBe("ok");
  return runner;
}

function job(method: PcaMethod, individuals: readonly string[] | null): PcaJob {
  return {
    analysis: "pca",
    fileId: FILE_ID,
    filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.1 }],
    individuals,
    method,
    numCompsKept: 10,
  };
}

function ignore(): void {
  // The progress, which these tests do not look at.
}

const NOT_OF_THE_PASS =
  /^popnei_web defect: the principal components are not of the individuals the pass was to give, in their order/;

/** For each method, with no list and with a list of 5. */
const CASES = (["pca", "pcoa"] as const).flatMap((method) => [
  [method, null] as const,
  [method, ["s000", "s003", "s010", "s011", "s150"]] as const,
]);

describe("IP6 D2 the runner's checks of popnei's answer to the principal components", () => {
  test.each(CASES)(
    "%s, individuals %j: popnei's answer passed on as it is gives a result",
    (method, individuals) => {
      const answer = opened().run(job(method, individuals), ignore);
      expect(answer.kind).toBe("ok");
    },
  );

  test.each(CASES)(
    "%s, individuals %j: the first two individuals swapped are a defect thrown",
    (method, individuals) => {
      tampering.tamper = (found) => {
        const [first, second, ...rest] = found.individuals;
        if (first === undefined || second === undefined) {
          throw new Error("popnei gave fewer than two individuals");
        }
        return { ...found, individuals: [second, first, ...rest] };
      };
      expect(() => opened().run(job(method, individuals), ignore)).toThrow(
        NOT_OF_THE_PASS,
      );
    },
  );

  test.each(CASES)(
    "%s, individuals %j: the last individual missing, with the projections of one fewer, is a defect thrown",
    (method, individuals) => {
      tampering.tamper = (found) => ({
        ...found,
        individuals: found.individuals.slice(0, -1),
        projections: found.projections.slice(0, -found.numComps),
      });
      expect(() => opened().run(job(method, individuals), ignore)).toThrow(
        NOT_OF_THE_PASS,
      );
    },
  );

  test.each(CASES)(
    "%s, individuals %j: projections one number short are a defect thrown that says their number",
    (method, individuals) => {
      tampering.tamper = (found) => ({
        ...found,
        projections: found.projections.slice(0, -1),
      });
      expect(() => opened().run(job(method, individuals), ignore)).toThrow(
        /^popnei_web defect: popnei gave \d+ projections for \d+ individuals and \d+ components$/,
      );
    },
  );
});
