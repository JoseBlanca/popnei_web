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
import { createPopgen2Store } from "./popgen2Store.ts";
import { startAnalysis } from "./runs.ts";
import { AnnouncerProvider } from "./shell/announcer.tsx";
import { createAnnouncer } from "./shell/status.ts";
import type { Announcer } from "./shell/status.ts";
import { StoreProvider } from "./store.tsx";
import { VariantsPage } from "./variants/VariantsPage.tsx";
import { SUMMARY_ID, announcementsOf } from "./variants/words.ts";
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
  // Stop or Count again of the count, while one is shown.
  let countButton: HTMLButtonElement | null = null;
  announceChanges(store, announcer, () => countButton);
  reportDefects(store, defects);
  syncReads(store, client);
  const autoRuns = startByThemselves(store);

  renderApplication(
    defects,
    <StoreProvider value={store}>
      <AnnouncerProvider value={announcer}>
        <FilesProvider value={files}>
          <VariantsPage
            autoRuns={autoRuns}
            onCountButton={(node) => {
              countButton = node;
            }}
          />
        </FilesProvider>
      </AnnouncerProvider>
    </StoreProvider>,
  );
}

/** The summary of the variants file, started once the file is read. A
    change of the store starts it after the listeners of that change have
    all run, so that a start is not made in the middle of telling them. */
function startByThemselves(store: Store<JobResult, Blob>): AutoRuns {
  const autoRuns = createAutoRuns({
    store,
    ids: [SUMMARY_ID],
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

/** Announces in the status region what each change of the store did
    away from the focus: the file read and its count. It listens before
    the page is drawn, so it is told of a change before React draws it,
    with the focus still where the change found it: on the button of the
    count, `countButton` gives it, as the count ends, the page moves the
    focus onto the words of the end, which are then not said again. */
function announceChanges(
  store: Store<JobResult, Blob>,
  announcer: Announcer,
  countButton: () => HTMLButtonElement | null,
): void {
  let before = store.getState();
  store.subscribe(() => {
    const after = store.getState();
    const button = countButton();
    const texts = announcementsOf(before, after, {
      focusOnCountButton: button !== null && document.activeElement === button,
    });
    before = after;
    for (const text of texts) announcer.announce(text);
  });
}

startPage(startApplication);
