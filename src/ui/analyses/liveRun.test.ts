/**
 * The Run of a tab of a live analysis on popgen2.html: it makes the
 * analysis live, and says the tab's line once when the Run waits behind
 * another calculation (docs/specs/steps/popgen2-populations.md,
 * "Accessibility").
 */
import { describe, expect, test } from "vitest";

import type { AnalysisId } from "../../core/project.ts";
import type { AppState } from "../../core/store.ts";
import type { JobResult } from "../../worker/protocol.ts";
import type { LiveState, RunAnswer } from "../autoRuns.ts";
import { createPopgen2Store } from "../popgen2Store.ts";
import { runLive } from "./liveRun.ts";

/** The state of the store of the page, with nothing open. */
function stateNow(): AppState<JobResult, Blob> {
  return createPopgen2Store({
    send: () => {
      throw new Error("nothing is sent here");
    },
    sendWrite: () => {
      throw new Error("no write here");
    },
    appVersion: "0.1.0",
  }).getState();
}

/** Presses Run of `id` with `run` answering `answer` and the live state
    after it `after`; gives what was said and the analyses run. */
function pressed(
  id: AnalysisId,
  answer: RunAnswer,
  after: LiveState,
): { readonly said: string[]; readonly ran: AnalysisId[] } {
  const said: string[] = [];
  const ran: AnalysisId[] = [];
  const s = stateNow();
  runLive(
    {
      autoRuns: {
        run: (one) => {
          ran.push(one);
          return answer;
        },
        liveState: () => after,
      },
      announcer: {
        announce: (text) => {
          said.push(text);
        },
      },
      getState: () => s,
    },
    id,
    (waitsFor) => `waits for ${waitsFor?.name ?? "nothing"}`,
  );
  return { said, ran };
}

/** Waiting behind the analysis `after`. */
function behind(after: AnalysisId): LiveState {
  return { kind: "live", aboutToStart: "behind", running: false, after };
}

describe("PT2 D2 a Run of a live analysis says its line of waiting once", () => {
  test.each(["started", "kept", "refused"] as const)(
    "a Run %s is made and says nothing",
    (answer) => {
      const { said, ran } = pressed("diversity", answer, behind("pca"));
      expect(ran).toEqual(["diversity"]);
      expect(said).toEqual([]);
    },
  );

  test("a Run that waits says the tab's line once, naming the analysis it waits for", () => {
    expect(pressed("diversity", "waiting", behind("pca")).said).toEqual([
      "waits for the PCA",
    ]);
    expect(pressed("pca", "waiting", behind("diversity")).said).toEqual([
      "waits for the diversity",
    ]);
  });
});
