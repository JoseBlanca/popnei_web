/**
 * The lock of the PCA's Run by the one pass on popgen2.html
 * (docs/specs/steps/popgen2-pca.md, "Run and Stop"): the PCA runs once
 * the one pass has read the variants file to the end, since the
 * calculation worker runs one request at a time and a PCA sent during
 * the pass would wait in its queue with a bar that does not move. The
 * store tells a pass that runs, one done and one that failed; only the
 * code that starts the pass by itself, `startedUnder` of
 * src/ui/autoRuns.ts, tells a pass the user stopped from one about to
 * start, ready in the store for the instant before it starts. Read from
 * the store alone, the lock would free Run in that instant and the PCA
 * would slip into the queue ahead of the pass. Pure, so that a test in
 * node checks it.
 */

import type { Key } from "../../../core/keys.ts";
import { escaped } from "../../../core/project.ts";
import type { AnalysisStatus } from "../../../core/store.ts";
import type { JobResult } from "../../../worker/protocol.ts";
import { startAgainMends } from "../../variants/chain.ts";

/** Why the one pass locks the PCA. */
export type PassLock =
  /** The pass runs, or is about to start by itself. */
  | "reading"
  /** The user stopped it, or it failed in a way the box's Start again
      may mend; the box offers Start again. */
  | "stopped"
  /** popnei refused it, or the file could no longer be read, or the
      page could not run it; the box offers no Start again. */
  | "unreadable";

/**
 * The lock of the PCA by the one pass whose status is `pass`, the
 * store's status of the summary of the variants file, given
 * `startedUnder` of autoRuns.ts: `null` once it read the file to the end,
 * `done`; "reading" while it runs, and while it is ready under a key it
 * was not started under, which autoRuns starts in a moment; "stopped"
 * when it is ready under a key it was started under, which only a Stop
 * of the user leaves, and after a failure Start again may mend;
 * "unreadable" after any other failure. `null` too while the pass is
 * locked, which it is only with no variants file read, when the PCA is
 * locked by the store and its tab greyed.
 */
export function passLock(
  pass: AnalysisStatus<JobResult>,
  startedUnder: (key: Key) => boolean,
): PassLock | null {
  switch (pass.kind) {
    case "done":
    case "locked":
      return null;
    case "running":
      return "reading";
    case "ready":
    case "removed":
      return startedUnder(pass.key) ? "stopped" : "reading";
    case "error":
      return startAgainMends(pass.error) ? "stopped" : "unreadable";
  }
}

/**
 * The words of the lock `lock` beside the Run of an analysis, of the
 * variants file `variantsName`, `name` being the analysis in a sentence,
 * "the PCA", "the PCoA":
 * "Run once panel.nei is read to the end: the reading under way in the
 * box Variants and the PCA cannot run at once.", "…: Start again its
 * reading in the box Variants.", "…: it could not be read, as the
 * box Variants says. Open it again, or another, in the Variants tab.".
 */
export function passLockText(
  lock: PassLock,
  variantsName: string,
  name: string,
): string {
  const start = `Run once ${escaped(variantsName)} is read to the end: `;
  switch (lock) {
    case "reading":
      return `${start}the reading under way in the box Variants and ${name} cannot run at once.`;
    case "stopped":
      return `${start}Start again its reading in the box Variants.`;
    case "unreadable":
      return `${start}it could not be read, as the box Variants says. Open it again, or another, in the Variants tab.`;
  }
}
