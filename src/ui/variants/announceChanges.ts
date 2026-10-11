/**
 * What the status region of popgen2.html says of each change of the
 * store, away from the focus: the file read, its count, the statistics
 * of the open file, the sentence of no variant that takes the place
 * of the button of the download after a change of the filters, and the
 * end of a run of the PCA, whichever tab is shown. The
 * entry calls it once, before the page is drawn; a test calls it over the
 * store of the page and the section alone.
 */
import { diversityOnPopgen2 } from "../../core/analyses/diversity.ts";
import { pcaOnPopgen2, pcaOptions } from "../../core/analyses/pca.ts";
import { escaped } from "../../core/project.ts";
import type { AnalysisId } from "../../core/project.ts";
import type { AppState } from "../../core/store.ts";
import type { JobResult, PcaMethod } from "../../worker/protocol.ts";
import {
  DIVERSITY_STARTED_BY_ITSELF,
  diversityEndAnnouncement,
  diversityStoppedText,
} from "../analyses/diversity/liveWords.ts";
import {
  liveStoppedText,
  pcaEndAnnouncement,
  startedByItselfText,
} from "../analyses/pca/tabWords.ts";
import { buttonOf, liveAnalysisOf, statusOf } from "../analyses/status.ts";
import { STOP_ALL_OFFERED } from "../analyses/words.ts";
import type { AutoRuns, RunAnswer } from "../autoRuns.ts";
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

/** The kind of the status region's words of a run of the diversity, as
    `PCA_RUN_KIND` is the PCA's. */
const DIVERSITY_RUN_KIND = "diversityRun";

/** The kind of the words of a run of the live analysis `id`: the start
    of a round, said with the kind of its first analysis, is dropped by
    the end of that analysis within the region's pause, so that the two
    are never joined. */
function runKindOf(id: AnalysisId): string {
  return id === pcaOnPopgen2.id ? PCA_RUN_KIND : DIVERSITY_RUN_KIND;
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
      announcer.announce(pcaEnd, { replaces: PCA_RUN_KIND });
    }
    if (diversityEnd !== null) {
      announcer.announce(diversityEnd, { replaces: DIVERSITY_RUN_KIND });
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
 *   To change the filters, stop each in its tab.", with Stop all named
 *   once the band offers it; the later starts of the round say nothing;
 * - a start by itself alone in its round, its own words, "Calculating the
 *   PCA again. To change the filters, stop it in the PCA tab.";
 * - a Run that waited, at its start, "Calculating the diversity of
 *   panel.nei.";
 * - a Stop, in a tab or in the band, which may leave the tab out of
 *   sight, "PCA stopped. Press Run in the PCA tab to calculate it
 *   again.", "Diversity stopped. …", or the first sentence alone when the
 *   tab then offers no Run to press;
 * - Stop all, once: "Stopped: the PCA and the diversity no longer start
 *   by themselves. Press Run in their tabs to calculate them again."
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
        if (first === undefined) return;
        const text =
          rest.length === 0
            ? startedAloneText(s, first)
            : roundText(
                event.round.map((id) => liveAnalysisOf(s, id).name),
                STOP_ALL_OFFERED,
              );
        announcer.announce(text, { replaces: runKindOf(first) });
        return;
      }
      case "startedAfterWaiting": {
        const variants = s.project.variants;
        if (variants === null) return;
        announcer.announce(
          runWaitedText(liveAnalysisOf(s, event.id).name, variants.name),
          { replaces: runKindOf(event.id) },
        );
        return;
      }
      case "paused":
        announcer.announce(stoppedText(s, event.id, runOffered(s, event.id)));
        return;
      case "pausedAll": {
        const [only, ...others] = event.ids;
        if (only === undefined) return;
        announcer.announce(
          others.length === 0
            ? stoppedText(s, only, runOffered(s, only))
            : stopAllText(event.ids.map((id) => liveAnalysisOf(s, id).name)),
        );
        return;
      }
    }
  });
}

/** What the status region says when the live analysis `id` starts by
    itself alone in its round, in `s`. */
function startedAloneText(
  s: AppState<JobResult, Blob>,
  id: AnalysisId,
): string {
  return id === diversityOnPopgen2.id
    ? DIVERSITY_STARTED_BY_ITSELF
    : startedByItselfText(methodOf(s));
}

/** What the status region says at a Stop of the live analysis `id` in
    `s`, with Run to press when `offered`. */
function stoppedText(
  s: AppState<JobResult, Blob>,
  id: AnalysisId,
  offered: boolean,
): string {
  return id === diversityOnPopgen2.id
    ? diversityStoppedText(offered)
    : liveStoppedText(methodOf(s), offered);
}

/** The analyses `names`, in their order, joined as a sentence names
    them: "the PCA", "the PCA and the diversity", "the PCA, the
    diversity and the LD decay"; with `then`, "and then" before the
    last. */
function joined(names: readonly string[], then: boolean): string {
  const last = names.at(-1) ?? "";
  if (names.length < 2) return last;
  return `${names.slice(0, -1).join(", ")} ${then ? "and then" : "and"} ${last}`;
}

/**
 * What the status region says at the first start of a round of the live
 * analyses `names`, two or more in their order, "the PCA", "the
 * diversity": "Calculating the PCA and then the diversity again. To
 * change the filters, press Stop all beside the heading Popnei, or stop
 * each in its tab." when the band offers Stop all, `stopAllOffered`;
 * until then "… To change the filters, stop each in its tab."
 */
export function roundText(
  names: readonly string[],
  stopAllOffered: boolean,
): string {
  const how = stopAllOffered
    ? "press Stop all beside the heading Popnei, or stop each in its tab"
    : "stop each in its tab";
  return `Calculating ${joined(names, true)} again. To change the filters, ${how}.`;
}

/** What the status region says when a Run of the analysis `name`, "the
    diversity", starts after it waited for another calculation, on the
    variants file `variantsName`, since the bar then comes in a tab the
    user may not see: "Calculating the diversity of panel.nei." */
export function runWaitedText(name: string, variantsName: string): string {
  return `Calculating ${name} of ${escaped(variantsName)}.`;
}

/** What the status region says at Stop all, which ended the live state
    of the analyses `names`, two or more in their order: "Stopped: the
    PCA and the diversity no longer start by themselves. Press Run in
    their tabs to calculate them again." */
export function stopAllText(names: readonly string[]): string {
  return `Stopped: ${joined(names, false)} no longer start by themselves. Press Run in their tabs to calculate them again.`;
}

/**
 * Says with `announcer` the line of a Run that waits, `line`, "The
 * diversity starts once the PCA, which is running, ends.", when the
 * answer of `autoRuns.run` is "waiting": the Run starts nothing, and no
 * bar comes, so a user of a screen reader learns why. Nothing for a Run
 * started, kept or refused, whose bar, result or lock says what
 * happened. The Run of each tab calls it, with the line of that tab.
 */
export function announceRunWaiting(
  announcer: Pick<Announcer, "announce">,
  answer: RunAnswer,
  line: string,
): void {
  if (answer === "waiting") announcer.announce(line);
}

/** The method of the PCA of the project in `s`. */
function methodOf(s: AppState<JobResult, Blob>): PcaMethod {
  return pcaOptions(s.project, "popgen2").method;
}
