/**
 * What the status region of popgen2.html says of each change of the
 * store, away from the focus: the file read, its count, the statistics
 * of the open file, the sentence of no variant that takes the place
 * of the button of the download after a change of the filters, and the
 * end of a run of the PCA, whichever tab is shown. The
 * entry calls it once, before the page is drawn; a test calls it over the
 * store of the page and the section alone.
 */
import { pcaOptions } from "../../core/analyses/pca.ts";
import { isPopgen2Live } from "../../core/apps.ts";
import type { Popgen2LiveId } from "../../core/apps.ts";
import type { AnalysisId } from "../../core/project.ts";
import type { AppState } from "../../core/store.ts";
import type { JobResult, PcaMethod } from "../../worker/protocol.ts";
import {
  DIVERSITY_HELD_AFTER_CRASH,
  DIVERSITY_STARTED_BY_ITSELF,
  diversityEndAnnouncement,
  diversityStoppedText,
} from "../analyses/diversity/liveWords.ts";
import {
  roundText,
  runWaitedText,
  stopAllText,
} from "../analyses/liveWords.ts";
import {
  pcaEndAnnouncement,
  pcaHeldAfterCrashText,
  pcaStartedByItselfText,
  pcaStoppedText,
} from "../analyses/pca/tabWords.ts";
import { buttonOf, liveAnalysisOf, statusOf } from "../analyses/status.ts";
import { STOP_ALL_OFFERED } from "../analyses/words.ts";
import type { AutoRuns } from "../autoRuns.ts";
import type { Announcer } from "../shell/status.ts";
import { noVariantAnnouncement } from "./downloadState.ts";
import { statsAnnouncementsOf } from "./statsWords.ts";
import { announcementsOf } from "./words.ts";
import type { PageStore } from "../store.tsx";

/** What the status region says of one live analysis alone, in `s`. */
interface LiveSaid {
  /** The kind of its words of a run, its start by itself and its end,
      of which only the latest is said: the end of a run drops its start
      still waiting to be written, so that the two are never joined. A
      start never drops the end of the run before it, since a live
      analysis starts by itself a quiet second after a change, which is
      longer than the region's pause. */
  readonly runKind: string;
  /** Its start by itself, alone in its round. */
  readonly startedAlone: (s: AppState<JobResult, Blob>) => string;
  /** That a crash of the worker holds it, and what starts it. */
  readonly heldAfterCrash: (s: AppState<JobResult, Blob>) => string;
  /** Its Stop, with Run to press when `runOffered`. */
  readonly stopped: (
    s: AppState<JobResult, Blob>,
    runOffered: boolean,
  ) => string;
}

/** The words of each live analysis of the page, keyed by `POPGEN2_LIVE`
    of src/core/apps.ts, so that one added to it without its words does
    not compile. */
const LIVE_SAID: Readonly<Record<Popgen2LiveId, LiveSaid>> = Object.freeze({
  pca: Object.freeze({
    runKind: "pcaRun",
    startedAlone: (s: AppState<JobResult, Blob>) =>
      pcaStartedByItselfText(methodOf(s)),
    heldAfterCrash: (s: AppState<JobResult, Blob>) =>
      pcaHeldAfterCrashText(methodOf(s)),
    stopped: (s: AppState<JobResult, Blob>, runOffered: boolean) =>
      pcaStoppedText(methodOf(s), runOffered),
  }),
  diversity: Object.freeze({
    runKind: "diversityRun",
    startedAlone: () => DIVERSITY_STARTED_BY_ITSELF,
    heldAfterCrash: () => DIVERSITY_HELD_AFTER_CRASH,
    stopped: (_s: AppState<JobResult, Blob>, runOffered: boolean) =>
      diversityStoppedText(runOffered),
  }),
});

/** The words of the live analysis `id`; a defect for an analysis that
    is not live on popgen2.html. */
function liveSaidOf(id: AnalysisId): LiveSaid {
  if (!isPopgen2Live(id)) {
    throw new Error(
      `popnei_web defect: ${id} is not an analysis popgen2.html calculates again by itself.`,
    );
  }
  return LIVE_SAID[id];
}

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
    const diversityEnd = diversityEndAnnouncement(before, after);
    before = after;
    for (const text of texts) announcer.announce(text);
    if (noVariant !== null) announcer.announce(noVariant);
    // Of the kind of the start by itself, which it drops while the start
    // still waits to be written: a PCA that ends within the region's
    // pause is said by its end alone.
    if (pcaEnd !== null) {
      announcer.announce(pcaEnd, { replaces: LIVE_SAID.pca.runKind });
    }
    if (diversityEnd !== null) {
      announcer.announce(diversityEnd, {
        replaces: LIVE_SAID.diversity.runKind,
      });
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
 * tells beyond the store (docs/specs/steps/popgen2-pca.md, "Running",
 * "Stop" and "Several analyses calculated again by themselves", "The
 * status region"; docs/specs/steps/popgen2-populations.md,
 * "Accessibility"), without moving the focus, so that a user who changed
 * a threshold and then finds it greyed learns why:
 *
 * - the first start of a round of two analyses or more names them once,
 *   in their order, "Calculating the PCA and then the diversity again.
 *   To change the filters, stop each in its tab; to change the
 *   populations, stop the diversity in the Populations tab.", with Stop
 *   all named
 *   once the band offers it; the later starts of the round say nothing;
 *   only the end of its last analysis drops it within the region's
 *   pause;
 * - a start by itself alone in its round, its own words, "Calculating the
 *   PCA again. To change the filters, stop it in the PCA tab.";
 * - a Run that waited, at its start, "Calculating the diversity of
 *   panel.nei.";
 * - a Stop, in a tab or in the band, which may leave the tab out of
 *   sight, "PCA stopped. Press Run in the PCA tab to calculate it
 *   again.", "Diversity stopped. …", or the first sentence alone when the
 *   tab then offers no Run to press;
 * - a crash of the worker that holds the others about to start, each
 *   held, "The diversity did not start: it starts after the next change
 *   of the filters, of its options or of the populations, or when Run is
 *   pressed in the Populations tab.";
 * - Stop all, once: "Stopped: the PCA and the diversity no longer start
 *   by themselves. Press Run in their tabs to calculate them again.",
 *   with Run named only in the tabs that then offer it.
 *
 * "PCoA" under the PCoA, the method read from `store` then. It listens
 * for as long as the page lives.
 */
export function announceLive(
  store: Pick<PageStore, "getState">,
  live: Pick<AutoRuns, "onLive">,
  announcer: Announcer,
): void {
  live.onLive((event) => {
    const s = store.getState();
    switch (event.kind) {
      case "startedByItself": {
        const [first, ...rest] = event.round;
        const last = event.round.at(-1);
        if (first === undefined || last === undefined) return;
        const text =
          rest.length === 0
            ? liveSaidOf(first).startedAlone(s)
            : roundText(
                event.round.map((id) => liveAnalysisOf(s, id)),
                STOP_ALL_OFFERED,
              );
        // Of the kind of the round's last analysis, whose end alone drops
        // it: an end of an earlier one within the region's pause is said
        // after it, since the next one then starts, said nowhere else.
        announcer.announce(text, { replaces: liveSaidOf(last).runKind });
        return;
      }
      case "startedAfterWaiting": {
        const variants = s.project.variants;
        if (variants === null) return;
        announcer.announce(
          runWaitedText(liveAnalysisOf(s, event.id).name, variants.name),
          { replaces: liveSaidOf(event.id).runKind },
        );
        return;
      }
      case "paused":
        announcer.announce(
          liveSaidOf(event.id).stopped(s, runOffered(s, event.id)),
        );
        return;
      case "pausedAll": {
        const [only, ...others] = event.ids;
        if (only === undefined) return;
        announcer.announce(
          others.length === 0
            ? liveSaidOf(only).stopped(s, runOffered(s, only))
            : stopAllText(
                event.ids.map((id) => ({
                  named: liveAnalysisOf(s, id),
                  runOffered: runOffered(s, id),
                })),
              ),
        );
        return;
      }
      case "heldAfterCrash":
        // After the crash's own words, said as the store changed.
        for (const id of event.ids) {
          announcer.announce(liveSaidOf(id).heldAfterCrash(s));
        }
        return;
    }
  });
}

/** The method of the PCA of the project in `s`. */
function methodOf(s: AppState<JobResult, Blob>): PcaMethod {
  return pcaOptions(s.project, "popgen2").method;
}
