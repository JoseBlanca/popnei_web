/**
 * What the status region of popgen2.html says of the diversity of the
 * Populations tab, whichever tab is shown (docs/specs/steps/
 * popgen2-populations.md, "Its words" and "Accessibility"): its start by
 * itself, its Stop, and the end of its run, done or failed, over the
 * store of the page with a fake worker.
 */
import { describe, expect, test } from "vitest";

import { noPopDiversity, summaryResult } from "../../../core/testSupport.ts";
import type {
  Job,
  JobResult,
  Outcome,
  Run,
  RunError,
} from "../../../worker/protocol.ts";
import { createPopgen2Store, openVariantsFile } from "../../popgen2Store.ts";
import type { Popgen2PageStore } from "../../popgen2Store.ts";
import {
  DIVERSITY_STARTED_BY_ITSELF,
  diversityEndAnnouncement,
  diversityStoppedText,
} from "./liveWords.ts";

/** The ten individuals of the variants file. */
const INDIVIDUALS = Array.from({ length: 10 }, (_, i) => `s00${String(i)}`);

/** A result of the diversity of the one population. */
function diversityResult(): JobResult {
  return {
    analysis: "diversity",
    pops: ["Unclassified"],
    numIndividuals: Uint32Array.from([10]),
    unbiasedExpHet: Float64Array.from([0.3]),
    obsHet: Float64Array.from([0.3]),
    polyRatio: Float64Array.from([0.9]),
    numVarsWithValue: Uint32Array.from([1200]),
    ...noPopDiversity(1),
    passStats: { numVars: 1200, filtering: {} },
  };
}

/** The store of popgen2.html with `panel.nei` read and its one pass
    done, and `end`, which ends the diversity once started. */
function pageStore(): {
  readonly store: Popgen2PageStore<JobResult, Blob>;
  readonly endDiversity: (outcome: (key: string) => Outcome<JobResult>) => void;
} {
  const keys: string[] = [];
  const jobs: Job[] = [];
  const store = createPopgen2Store({
    send: (key, job): Run<JobResult> => {
      keys.push(key);
      jobs.push(job);
      return {
        id: jobs.length,
        outcome: new Promise<Outcome<JobResult>>(() => undefined),
        cancel: () => undefined,
      };
    },
    sendWrite: () => {
      throw new Error("popnei_web defect: no write is sent here");
    },
    appVersion: "0.1.0",
  });
  store.popneiReady("0.2.2");
  const fileId = "a".repeat(32);
  openVariantsFile(store, {
    fileId,
    name: "panel.nei",
    size: 261_490,
    format: "nei",
    readOptions: null,
  });
  store.variantsRead(fileId, {
    kind: "read",
    individuals: INDIVIDUALS,
    ploidy: 2,
    numVars: null,
    keepsPassed: false,
  });
  store.startRun("variantsSummary");
  const passKey = keys[0];
  if (passKey === undefined) throw new Error("the one pass did not start");
  store.runEnded(1, {
    kind: "done",
    key: passKey,
    result: summaryResult(["1"], [1200], INDIVIDUALS),
  });
  return {
    store,
    endDiversity: (outcome) => {
      const at = jobs.findIndex((job) => job.analysis === "diversity");
      const key = keys[at];
      if (at < 0 || key === undefined) throw new Error("no diversity sent");
      store.runEnded(at + 1, outcome(key));
    },
  };
}

describe("PT2 D2 the status region's words of the diversity", () => {
  test("its start by itself names the tab where it is stopped", () => {
    expect(DIVERSITY_STARTED_BY_ITSELF).toBe(
      "Calculating the diversity again. To change the filters or the populations, stop it in the Populations tab.",
    );
  });

  test("a Stop, with Run to press in the Populations tab, or alone", () => {
    expect(diversityStoppedText(true)).toBe(
      "Diversity stopped. Press Run in the Populations tab to calculate it again.",
    );
    expect(diversityStoppedText(false)).toBe("Diversity stopped.");
  });

  test('done: "Diversity of panel.nei calculated.", once', () => {
    const { store, endDiversity } = pageStore();
    const ready = store.getState();
    store.startRun("diversity");
    const running = store.getState();
    expect(diversityEndAnnouncement(ready, running)).toBeNull();
    endDiversity((key) => ({ kind: "done", key, result: diversityResult() }));
    const done = store.getState();
    expect(diversityEndAnnouncement(running, done)).toBe(
      "Diversity of panel.nei calculated.",
    );
    expect(diversityEndAnnouncement(done, done)).toBeNull();
  });

  test("a crash of the worker, and popnei's refusal, in the words the tab draws", () => {
    const failures: readonly [RunError, string][] = [
      [
        { kind: "workerFailed", message: "a crash" },
        "The calculation stopped unexpectedly. Run it again. If it stops again, open panel.nei again in the Variants tab.",
      ],
      [
        { kind: "popnei", message: "a refusal of popnei" },
        "a refusal of popnei",
      ],
    ];
    for (const [error, words] of failures) {
      const { store, endDiversity } = pageStore();
      store.startRun("diversity");
      const running = store.getState();
      endDiversity(() => ({ kind: "failed", error }));
      const said = diversityEndAnnouncement(running, store.getState());
      expect(said).toMatch(
        /^The diversity of panel\.nei could not be calculated: /u,
      );
      expect(said).toContain(words);
    }
  });

  test("a run stopped says nothing at its end: the Stop is said", () => {
    const { store } = pageStore();
    store.startRun("diversity");
    const running = store.getState();
    store.cancelRun("diversity");
    expect(diversityEndAnnouncement(running, store.getState())).toBeNull();
  });
});
