/**
 * The lock of the PCA's Run by the one pass on popgen2.html
 * (docs/specs/steps/popgen2-pca.md, "Run and Stop" and "How it is
 * checked"): `passLock` running, about to start, stopped by the user,
 * failed with Start again offered, refused by popnei, the file no longer
 * readable, read to the end; and the words of each lock.
 */
import { describe, expect, test } from "vitest";

import { keyFromWire } from "../../../core/keys.ts";
import type { AnalysisError, AnalysisStatus } from "../../../core/store.ts";
import { summaryResult } from "../../../core/testSupport.ts";
import type { JobResult } from "../../../worker/protocol.ts";
import { passLock, passLockText } from "./passLock.ts";

const KEY = keyFromWire("a".repeat(64));

/** `startedUnder` of autoRuns.ts for a pass started under `KEY`, and
    for one not started under it. */
const started = (key: string): boolean => key === KEY;
const notStarted = (): boolean => false;

/** The pass in error with `error`. */
function failed(error: AnalysisError): AnalysisStatus<JobResult> {
  return { kind: "error", key: KEY, error, ofStatistics: false, waited: false };
}

describe("AP6 D1 passLock, the lock of Run by the one pass", () => {
  test("running: reading", () => {
    const pass: AnalysisStatus<JobResult> = {
      kind: "running",
      key: KEY,
      runId: 1,
      progress: null,
      waitsForStatistics: false,
      soFar: null,
    };
    expect(passLock(pass, started)).toBe("reading");
  });

  test("about to start, ready under a key it was not started under: reading, which the store alone would free", () => {
    const pass: AnalysisStatus<JobResult> = {
      kind: "ready",
      key: KEY,
      stopped: null,
    };
    expect(passLock(pass, notStarted)).toBe("reading");
  });

  test("stopped by the user, ready under the key it was started under: stopped", () => {
    const pass: AnalysisStatus<JobResult> = {
      kind: "ready",
      key: KEY,
      stopped: null,
    };
    expect(passLock(pass, started)).toBe("stopped");
  });

  test("failed with Start again offered, a worker that stopped: stopped", () => {
    expect(
      passLock(
        failed({
          kind: "failed",
          error: { kind: "workerFailed", message: "out of memory" },
        }),
        started,
      ),
    ).toBe("stopped");
  });

  test("refused by popnei, or the file no longer readable, or the page that could not start its calculations: unreadable", () => {
    for (const error of [
      { kind: "refused", message: "the pass gave no variant" },
      {
        kind: "failed",
        error: { kind: "reopenFailed", name: "panel.nei", message: "gone" },
      },
      { kind: "failed", error: { kind: "couldNotStart", reason: "no ready" } },
      { kind: "failed", error: { kind: "protocolMismatch" } },
    ] as const) {
      expect(passLock(failed(error), started)).toBe("unreadable");
    }
  });

  test("read to the end: no lock; and none while it is locked, with no file read", () => {
    expect(
      passLock(
        {
          kind: "done",
          key: KEY,
          result: summaryResult(["chr1"], [1200]),
          warnings: [],
          check: null,
        },
        started,
      ),
    ).toBeNull();
    expect(
      passLock({ kind: "locked", reason: "no file read" }, started),
    ).toBeNull();
  });
});

describe("AP6 D1 passLockText, the words of the lock", () => {
  test("each lock in the words of 'Run and Stop', the PCA and the PCoA", () => {
    expect(passLockText("reading", "panel.nei", "the PCA")).toBe(
      "Run once panel.nei is read to the end: the reading under way in the box Variants and the PCA cannot run at once.",
    );
    expect(passLockText("reading", "panel.nei", "the PCoA")).toBe(
      "Run once panel.nei is read to the end: the reading under way in the box Variants and the PCoA cannot run at once.",
    );
    expect(passLockText("stopped", "panel.nei", "the PCA")).toBe(
      "Run once panel.nei is read to the end: Start again its reading in the box Variants.",
    );
    expect(passLockText("unreadable", "panel.nei", "the PCA")).toBe(
      "Run once panel.nei is read to the end: it could not be read, as the box Variants says. Open it again there, or open another.",
    );
  });
});
