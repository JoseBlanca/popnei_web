/**
 * The runner's checks of popnei's answer to a PCA or a PCoA
 * (docs/specs/worker/runner.md, "The principal components", step 3):
 * popnei's individuals are those the pass was to give, in their order,
 * and its projections hold individuals × components numbers, or the
 * runner throws a defect, since the projections would be read under other
 * names. popnei always answers in the order of the job, so these answers
 * are made here: popnei is mocked, each of its two calls giving popnei's
 * own answer changed by `tamper`, and passing it on as it is while
 * `tamper` is `null`. With `extraOption`, each call is given one option
 * more than the runner gives it, as a mistake of the runner would, and
 * popnei's own refusal of it is what the runner answers (stops A 9 and
 * C 6 of docs/specs/stage-4-open-points.md).
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

/** The change made to popnei's answer, or `null` for none; and whether
    each call is given the option `numCompsKept` too, which popnei does
    not know. */
const tampering: {
  tamper: (<T extends Answered>(found: T) => T) | null;
  extraOption: boolean;
} = {
  tamper: null,
  extraOption: false,
};

vi.mock("popnei", async (importOriginal) => {
  const original = await importOriginal<typeof Popnei>();
  const changed = <T extends Answered>(found: T): T =>
    tampering.tamper === null ? found : tampering.tamper(found);
  /** The options given, with `numCompsKept` too when asked for, in an
      object built apart, which TypeScript does not check for a key too
      many, as one built by a mistake would be. */
  const optionsOf = <O extends object>(
    options: O | undefined,
  ): O | undefined =>
    tampering.extraOption
      ? Object.assign({}, options, { numCompsKept: 3 })
      : options;
  return {
    ...original,
    doPcaFromVariants: (
      variants: Parameters<typeof original.doPcaFromVariants>[0],
      options?: Parameters<typeof original.doPcaFromVariants>[1],
    ) => changed(original.doPcaFromVariants(variants, optionsOf(options))),
    doPcoaFromVariants: (
      variants: Parameters<typeof original.doPcoaFromVariants>[0],
      options?: Parameters<typeof original.doPcoaFromVariants>[1],
    ) => changed(original.doPcoaFromVariants(variants, optionsOf(options))),
  };
});

const FIXTURES = join(import.meta.dirname, "..", "..", "e2e", "fixtures");
const FILE_ID = "load-1";

beforeAll(async () => {
  expect(await loadPopnei()).toEqual({ ok: true, value: "0.1.0" });
});

afterEach(() => {
  tampering.tamper = null;
  tampering.extraOption = false;
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

describe("stops A 9 and C 6 popnei's refusal of an option it does not know is a defect of the application", () => {
  test.each([
    [
      "pca",
      "popnei_web defect: popnei: `numCompsKept` is not an option of `doPcaFromVariants`, whose options are `transformToBiallelic` and `numPrinComps`",
    ],
    [
      "pcoa",
      "popnei_web defect: popnei: `numCompsKept` is not an option of `doPcoaFromVariants`, whose options are `minNumSnps` and `correctByLingoes`",
    ],
  ] as const)(
    "%s: crashed with popnei's message after the start of a defect, and not refused",
    (method, message) => {
      tampering.extraOption = true;
      expect(opened().run(job(method, null), ignore)).toEqual({
        kind: "crashed",
        message,
      });
    },
  );
});
