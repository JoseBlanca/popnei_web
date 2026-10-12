/**
 * The time of the last run of the LD decay of popgen2.html
 * (docs/specs/steps/popgen2-populations.md, "The LD decay", "Run, Stop
 * and the time of the last run"), over the real store of the page with
 * a fake worker and a clock of the test.
 */
import { describe, expect, test } from "vitest";

import { summaryResult } from "../../../core/testSupport.ts";
import { flush, ldDecayResult, page } from "../../band/testSupport.ts";
import { openVariantsFile } from "../../popgen2Store.ts";
import { createLastRunClock } from "./lastRun.ts";

const SUMMARY = summaryResult(["1"], [1200], ["s000", "s001"]);

describe("LT1 D4 the time of the last run of the LD decay", () => {
  test("none before a run; the time of a run that ended with a result; kept over a run stopped; gone with another variants file", async () => {
    const testPage = page(SUMMARY);
    await testPage.endPass();
    let now = 1000;
    const clock = createLastRunClock(testPage.store, "ldDecay", () => now);
    const told: (number | null)[] = [];
    clock.subscribe(() => told.push(clock.seconds()));
    expect(clock.seconds()).toBeNull();

    testPage.auto.run("ldDecay");
    await flush();
    now += 3_725_400;
    const first = testPage.lastLdDecay();
    first.end({ kind: "done", key: first.key, result: ldDecayResult() });
    await flush();
    expect(clock.seconds()).toBeCloseTo(3725.4, 6);
    expect(told).toEqual([clock.seconds()]);

    // A change that starts it again, stopped before its end.
    testPage.setLdDecay({ maxDist: 50_000 });
    testPage.store.startRun("ldDecay");
    now += 9_000;
    testPage.auto.pause("ldDecay");
    await flush();
    expect(clock.seconds()).toBeCloseTo(3725.4, 6);

    openVariantsFile(testPage.store, {
      fileId: "f".repeat(32),
      name: "other.nei",
      size: 10,
      format: "nei",
      readOptions: null,
    });
    expect(clock.seconds()).toBeNull();
  });

  test("a run that ended with an error counts", async () => {
    const testPage = page(SUMMARY);
    await testPage.endPass();
    let now = 0;
    const clock = createLastRunClock(testPage.store, "ldDecay", () => now);
    testPage.auto.run("ldDecay");
    await flush();
    now += 500;
    testPage.lastLdDecay().end({
      kind: "failed",
      error: { kind: "popnei", message: "`numBins` is 0." },
    });
    await flush();
    expect(clock.seconds()).toBeCloseTo(0.5, 6);
  });
});
