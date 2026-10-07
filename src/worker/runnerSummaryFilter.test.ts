/**
 * The runner's check of popnei's counts of the FILTER column in the
 * summary of the variants file (docs/plans/popnei-0.2.2.md, phase 3):
 * the runner asks for them when the open variants keep the FILTER, and
 * popnei gives them then and only then, or the runner throws a defect,
 * since a box would show a count of another file or lose one it was
 * given. popnei never answers otherwise, so these answers are made here:
 * popnei is mocked, its `calcVariantsSummary` giving its own summary with
 * `filterColumn` changed by `tamper`, and passing it on as it is while
 * `tamper` is `null`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type * as Popnei from "popnei";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import type { LoadToOpen, Runner } from "./runner.ts";
import { createRunner, loadPopnei } from "./runner.ts";
import type { VariantsSummaryJob } from "./protocol.ts";
import { INSTALLED_POPNEI_VERSION } from "./testSupport.ts";

/** The counts of the FILTER column of popnei's summary. */
type FilterColumn = ReturnType<
  typeof Popnei.calcVariantsSummary
>["filterColumn"];

/** The change made to the counts of popnei's final summary, or `null` for
    none. */
const tampering: { tamper: ((found: FilterColumn) => FilterColumn) | null } = {
  tamper: null,
};

vi.mock("popnei", async (importOriginal) => {
  const original = await importOriginal<typeof Popnei>();
  return {
    ...original,
    calcVariantsSummary: (
      ...args: Parameters<typeof original.calcVariantsSummary>
    ) => {
      const summary = original.calcVariantsSummary(...args);
      return tampering.tamper === null
        ? summary
        : { ...summary, filterColumn: tampering.tamper(summary.filterColumn) };
    },
  };
});

const FIXTURES = join(import.meta.dirname, "..", "..", "e2e", "fixtures");
const FILE_ID = "load-1";
const JOB: VariantsSummaryJob = {
  analysis: "variantsSummary",
  fileId: FILE_ID,
  filters: [],
  minNumIndividuals: 0,
  numBins: 1000,
  range: [0, 1],
};

/** low_qual.vcf.gz read as popgen2.html reads it, every variant whatever
    its FILTER, whose counts popnei gives; panel.nei, which does not
    record its FILTER, and whose counts the runner does not ask for. */
const CASES: readonly (readonly [string, LoadToOpen])[] = [
  [
    "low_qual.vcf.gz",
    {
      fileId: FILE_ID,
      format: "vcf",
      readOptions: { ploidy: null, onlyPassed: false },
    },
  ],
  ["panel.nei", { fileId: FILE_ID, format: "nei", readOptions: null }],
];

beforeAll(async () => {
  expect(await loadPopnei()).toEqual({
    ok: true,
    value: INSTALLED_POPNEI_VERSION,
  });
});

afterEach(() => {
  tampering.tamper = null;
});

function opened(name: string, load: LoadToOpen): Runner {
  const runner = createRunner();
  const source = new Uint8Array(readFileSync(join(FIXTURES, name)));
  expect(runner.open(load, { name, source }).kind).toBe("ok");
  return runner;
}

function ignore(): void {
  // The progress, which these tests do not look at.
}

const NO_PART =
  /^popnei_web defect: calcVariantsSummary gave no value of a part it was asked for/;

describe("popnei-0.2.2 3 the runner's check of popnei's counts of the FILTER", () => {
  test.each(CASES)(
    "%s: popnei's summary passed on as it is gives a result",
    (name, load) => {
      expect(opened(name, load).run(JOB, ignore).kind).toBe("ok");
    },
  );

  test("low_qual.vcf.gz: no counts where they were asked for is a defect thrown", () => {
    const [name, load] = CASES[0] ?? [];
    if (name === undefined || load === undefined) throw new Error("no case");
    tampering.tamper = () => null;
    expect(() => opened(name, load).run(JOB, ignore)).toThrow(NO_PART);
  });

  test("panel.nei: counts where none were asked for are a defect thrown", () => {
    const [name, load] = CASES[1] ?? [];
    if (name === undefined || load === undefined) throw new Error("no case");
    tampering.tamper = () => ({ passed: 1200, failed: 0 });
    expect(() => opened(name, load).run(JOB, ignore)).toThrow(NO_PART);
  });
});
