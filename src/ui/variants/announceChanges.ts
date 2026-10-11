/**
 * What the status region of popgen2.html says of each change of the
 * store, away from the focus: the file read, its count, the statistics
 * of the open file, the sentence of no variant that takes the place
 * of the button of the download after a change of the filters, and the
 * end of a run of the PCA, whichever tab is shown. The
 * entry calls it once, before the page is drawn; a test calls it over the
 * store of the page and the section alone.
 */
import type { AnalysisId } from "../../core/project.ts";
import type { AppState } from "../../core/store.ts";
import { buttonOf, statusOf } from "../analyses/status.ts";
import type { AutoRuns } from "../autoRuns.ts";
import type { JobResult } from "../../worker/protocol.ts";
import { pcaOptions } from "../../core/analyses/pca.ts";
import {
  liveStoppedText,
  pcaEndAnnouncement,
  startedByItselfText,
} from "../analyses/pca/tabWords.ts";
import type { Announcer } from "../shell/status.ts";
import { noVariantAnnouncement } from "./downloadState.ts";
import { statsAnnouncementsOf } from "./statsWords.ts";
import { announcementsOf } from "./words.ts";
import type { PageStore } from "../store.tsx";

/** The kind of the status region's words of a run of the PCA, its start
    by itself and its end, of which only the latest is said: the end of a
    run drops its start still waiting to be written. A start never drops
    the end of the run before it, since a PCA starts by itself a quiet
    second after a change, which is longer than the region's pause. */
const PCA_RUN_KIND = "pcaRun";

/**
 * Called by the section of the statistics of the load `fileId` once it is
 * drawn; returns the function it calls when it goes. The region says
 * nothing of the statistics of a load until its section is drawn, so that
 * a user does not hear that they are calculated and then find no section,
 * while its code is still downloading, or when the download failed.
 */
export type StatsShown = (fileId: string) => () => void;

/**
 * Listens to `store` and announces with `announcer` what each change did.
 * It listens before the page is drawn, so it is told of a change before
 * React draws it, with the focus still where the change found it: on the
 * button of the count, which `countButton` gives, as the count ends, the
 * page moves the focus onto the words of the end, which are then not said
 * again. Of the statistics it says the latest of their progress within
 * one of the region's pauses, and only while their section is drawn; when
 * the section is drawn after they changed, it says then what changed
 * since the file was read. Returns what the section calls once drawn.
 */
export function announceChanges(
  store: PageStore,
  announcer: Announcer,
  countButton: () => HTMLButtonElement | null,
): StatsShown {
  let before = store.getState();
  // The state of the store the statistics were last said for: the last
  // change while their section was drawn, or else the first change of the
  // current load, from which the section says what changed when drawn.
  let heard = before;
  // The load whose section of the statistics is drawn.
  let shownFor: string | null = null;

  const sayStats = (after: AppState<JobResult, Blob>): void => {
    for (const { text, replaces } of statsAnnouncementsOf(heard, after)) {
      announcer.announce(text, { replaces });
    }
    heard = after;
  };

  store.subscribe(() => {
    const after = store.getState();
    const button = countButton();
    const texts = announcementsOf(before, after, {
      focusOnCountButton: button !== null && document.activeElement === button,
    });
    const noVariant = noVariantAnnouncement(before, after);
    const pcaEnd = pcaEndAnnouncement(before, after);
    before = after;
    for (const text of texts) announcer.announce(text);
    if (noVariant !== null) announcer.announce(noVariant);
    // Of the kind of the start by itself, which it drops while the start
    // still waits to be written: a PCA that ends within the region's
    // pause is said by its end alone.
    if (pcaEnd !== null) {
      announcer.announce(pcaEnd, { replaces: PCA_RUN_KIND });
    }
    const fileId = fileIdOf(after);
    if (fileId !== null && fileId === shownFor) {
      sayStats(after);
    } else if (fileId !== fileIdOf(heard)) {
      heard = after;
    }
  });

  return (fileId) => {
    shownFor = fileId;
    const now = store.getState();
    if (fileIdOf(now) === fileId) sayStats(now);
    return () => {
      if (shownFor === fileId) shownFor = null;
    };
  };
}

/** Whether the panel of the analysis `id` offers an enabled Run once it
    is stopped in `s`: ready, or a failure it may run again; or running
    still, its run cancelled, whose end gives Run. Not while locked, nor
    with its result shown. The lock of the one pass, which the store does
    not know, is not read: a live analysis is stopped only once the pass
    is read to the end, since its Run waits for that. */
function runOffered(s: AppState<JobResult, Blob>, id: AnalysisId): boolean {
  const status = statusOf(s, id);
  if (status.kind === "running") return true;
  const button = buttonOf(status);
  return button?.kind === "run" && button.reason === null;
}

/** The id of the load of the variants file in `s`, or `null`. */
function fileIdOf(s: AppState<JobResult, Blob>): string | null {
  return s.project.variants?.fileId ?? null;
}

/**
 * Says with `announcer` what `live`, the analyses started by themselves,
 * tells of the PCA beyond the store (docs/specs/steps/popgen2-pca.md,
 * "Running" and "Stop"): "Calculating the PCA again. To change the
 * filters, stop it in the PCA tab." once at each start by itself, and does not move the
 * focus, so that a user who changed a threshold and then finds it greyed
 * learns why; and "PCA stopped. Press Run in the PCA tab to calculate it
 * again." at a Stop, in the tab or in the band, which leaves the tab out
 * of sight, or "PCA stopped." alone when the tab then offers no Run to
 * press. "PCoA" under the PCoA, the method read from `store` then.
 * It listens for as long as the page lives.
 */
export function announceLive(
  store: Pick<PageStore, "getState">,
  live: Pick<AutoRuns, "onLive">,
  announcer: Announcer,
): void {
  live.onLive((event) => {
    const method = pcaOptions(store.getState().project, "popgen2").method;
    switch (event.kind) {
      case "startedByItself":
        announcer.announce(startedByItselfText(method), {
          replaces: PCA_RUN_KIND,
        });
        return;
      case "paused":
        announcer.announce(
          liveStoppedText(method, runOffered(store.getState(), event.id)),
        );
        return;
      // No Run waits and no Stop all is offered until the Populations
      // tab makes a second analysis live; their words come with it
      // (docs/plans/population-tab.md, work package 2).
      case "startedAfterWaiting":
      case "pausedAll":
        return;
    }
  });
}
