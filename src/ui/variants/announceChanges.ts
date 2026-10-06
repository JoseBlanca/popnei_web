/**
 * What the status region of popgen2.html says of each change of the
 * store, away from the focus: the file read, its count, and the
 * statistics of the open file. The entry calls it once, before the page is
 * drawn; a test calls it over the store of the page and the section alone.
 */
import type { AppState, Store } from "../../core/store.ts";
import type { JobResult } from "../../worker/protocol.ts";
import type { Announcer } from "../shell/status.ts";
import { statsAnnouncementsOf } from "./statsWords.ts";
import { announcementsOf } from "./words.ts";

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
  store: Store<JobResult, Blob>,
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
      announcer.announce(text, ...(replaces === null ? [] : [{ replaces }]));
    }
    heard = after;
  };

  store.subscribe(() => {
    const after = store.getState();
    const button = countButton();
    const texts = announcementsOf(before, after, {
      focusOnCountButton: button !== null && document.activeElement === button,
    });
    before = after;
    for (const text of texts) announcer.announce(text);
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

/** The id of the load of the variants file in `s`, or `null`. */
function fileIdOf(s: AppState<JobResult, Blob>): string | null {
  return s.project.variants?.fileId ?? null;
}
