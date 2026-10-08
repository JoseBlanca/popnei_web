/**
 * The entry of the new page of population genetics, `popgen2.html`
 * (docs/plans/open-variants.md, "A new page, beside the old one"): the
 * opening of popgen.html, with the functions of pageStart.tsx, without
 * the stepper, the saving and the shell. It makes the store of the page
 * and the worker client, the announcer of the status region, the reads
 * the project waits for and the analyses that start by themselves, and
 * draws the error bar and the page in two roots, all in one run of this
 * code.
 */
import "./tokens.css";
import "./base.css";

import type { Store } from "../core/store.ts";
import type { JobResult } from "../worker/protocol.ts";
import { createAutoRuns } from "./autoRuns.ts";
import type { AutoRuns } from "./autoRuns.ts";
import type { Defects } from "./defects.ts";
import { FilesProvider } from "./files.tsx";
import {
  connectStore,
  renderApplication,
  startPage,
  syncReads,
} from "./pageStart.tsx";
import type { DrawBar } from "./pageStart.tsx";
import { POPGEN2_AUTO_GROUPS, createPopgen2Store } from "./popgen2Store.ts";
import { startAnalysis } from "./runs.ts";
import { AnnouncerProvider } from "./shell/announcer.tsx";
import { Notice } from "./shell/Notice.tsx";
import { NoticeWordsProvider } from "./shell/noticeWords.tsx";
import { createAnnouncer } from "./shell/status.ts";
import { StoreProvider } from "./store.tsx";
import { VariantsPage } from "./variants/VariantsPage.tsx";
import { announceChanges } from "./variants/announceChanges.ts";
import { NOTICE_WORDS } from "./variants/statsWords.ts";
import { reportDefects } from "./variants/workerDefects.ts";

/** The opening after the guard, the listeners and the bar: the store and
    the worker client, the bar with the store and no saving, the
    announcer, the reads, the analyses that start by themselves, and the
    page. */
function startApplication(defects: Defects, drawBar: DrawBar): void {
  const { store, client, files } = connectStore((senders) =>
    createPopgen2Store({ send: senders.send, appVersion: APP_VERSION }),
  );
  // No project is saved on this page yet, so the bar offers no Save.
  drawBar(store, null);

  const announcer = createAnnouncer();
  // Stop or Start again of the box, while one is shown.
  let countButton: HTMLButtonElement | null = null;
  const statsShown = announceChanges(store, announcer, () => countButton);
  reportDefects(store, defects);
  syncReads(store, client);
  const autoRuns = startByThemselves(store);

  renderApplication(
    defects,
    <StoreProvider value={store}>
      <AnnouncerProvider value={announcer}>
        <FilesProvider value={files}>
          <NoticeWordsProvider value={NOTICE_WORDS}>
            <VariantsPage
              autoRuns={autoRuns}
              onCountButton={(node) => {
                countButton = node;
              }}
              onStatsShown={statsShown}
            />
            <Notice />
          </NoticeWordsProvider>
        </FilesProvider>
      </AnnouncerProvider>
    </StoreProvider>,
  );
}

/** The summary of the variants file, the one pass of the count and the
    statistics of the open file, started once the file is read
    (docs/plans/live-stats.md). A change of the store
    starts them after the listeners of that change have all run, so that a
    start is not made in the middle of telling them. */
function startByThemselves(store: Store<JobResult, Blob>): AutoRuns {
  const autoRuns = createAutoRuns({
    store,
    groups: POPGEN2_AUTO_GROUPS,
    start: (id) => startAnalysis(store, id),
  });
  store.subscribe(() => {
    queueMicrotask(() => {
      autoRuns.sync();
    });
  });
  autoRuns.sync();
  return autoRuns;
}

startPage(startApplication);
