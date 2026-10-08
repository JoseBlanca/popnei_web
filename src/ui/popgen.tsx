/**
 * The entry of the population genetics page, `popgen.html`: the code that
 * runs once when the page opens (docs/specs/entry.md, "At the opening").
 * It takes over from the start guard of the page, puts on the window the
 * listeners of the errors nothing else shows, makes the store, the
 * worker client and the announcer of the status region, asks for the
 * reads the project waits for, and draws the error bar and the
 * application in two roots, with the functions of pageStart.tsx that the
 * new page, popgen2.html, shares. The global styles, the tokens and the
 * base, come first. All of it runs in one run of this code, so that
 * nothing that listens is made after the first message of a worker could
 * arrive.
 */
import "./tokens.css";
import "./base.css";

import { POPGEN_ANALYSES } from "../core/apps.ts";
import type { Store } from "../core/store.ts";
import type { JobResult } from "../worker/protocol.ts";
import { SHELL_WORDS } from "./analyses/titles.ts";
import type { Defects } from "./defects.ts";
import { FilesProvider } from "./files.tsx";
import { downloadFile, downloadText } from "./download.ts";
import {
  connectStore,
  renderApplication,
  startPage,
  syncReads,
} from "./pageStart.tsx";
import type { DrawBar } from "./pageStart.tsx";
import { createPopgenStore } from "./popgenStore.ts";
import { SavingProvider, createSaving } from "./saving.ts";
import type { Saving } from "./saving.ts";
import { AnnouncerProvider } from "./shell/announcer.tsx";
import { NoticeWordsProvider } from "./shell/noticeWords.tsx";
import { Shell } from "./shell/Shell.tsx";
import { ShellWordsProvider } from "./shell/shellWords.tsx";
import { createAnnouncer } from "./shell/status.ts";
import type { Announcer } from "./shell/status.ts";
import { announcementsOf, writtenDiscarded } from "./shell/words.ts";
import { StoreProvider } from "./store.tsx";

/** Steps 3 to 7 of the opening, after the guard, the listeners and the
    bar of `startPage`: the store, the worker client, the saving and the
    question before leaving, the bar with the store, the announcer and
    the reads, and the application. */
function startApplication(defects: Defects, drawBar: DrawBar): void {
  // 3 and 4. The store, with the counts of the filters, the statistics of
  // each individual and the writing of the filtered variants, and the
  // worker client its `send` and its write reach.
  const { store, client, files } = connectStore((senders) =>
    createPopgenStore({ ...senders, appVersion: APP_VERSION }),
  );

  // 5. The saving, and the question before the page is left while the
  // project has changed or a written file is not saved; the error bar
  // again, now with the store and its Save.
  const saving = createSaving({
    store,
    app: "popgen",
    analyses: POPGEN_ANALYSES,
    appVersion: APP_VERSION,
    download: (name, text) => {
      downloadText(name, text, "application/json");
    },
    downloadFile,
  });
  askBeforeLeaving(saving, store);
  drawBar(store, saving);

  // 6. The announcer of the shell's status region, with the announcements
  // made from two states of the store, and the reads the project waits
  // for, asked after every change of it.
  const announcer = createAnnouncer();
  announceChanges(store, announcer);
  syncReads(store, client);

  // 7. The application, in its own root.
  renderApplication(
    defects,
    <StoreProvider value={store}>
      <AnnouncerProvider value={announcer}>
        <FilesProvider value={files}>
          <SavingProvider value={saving}>
            <ShellWordsProvider value={SHELL_WORDS}>
              <NoticeWordsProvider value={SHELL_WORDS}>
                <Shell />
              </NoticeWordsProvider>
            </ShellWordsProvider>
          </SavingProvider>
        </FilesProvider>
      </AnnouncerProvider>
    </StoreProvider>,
  );
}

/** Asks the browser to confirm before the page is left, reloaded or
    closed while the project has changed since the page opened, since a
    project file was last opened, or since the last Save, or while a file
    of the filtered variants of the store `store` is written and not
    saved, since nothing of either is kept in the browser. The browser
    asks with its own words, which a page cannot change. */
function askBeforeLeaving(saving: Saving, store: Store<JobResult, Blob>): void {
  window.addEventListener("beforeunload", (event) => {
    const unsaved = store.getState().write?.kind === "done";
    if (!saving.changed() && !unsaved) return;
    event.preventDefault();
    // Chrome and Edge before 119, above the floor of 111, do not ask on
    // preventDefault alone; they ask when the event's returnValue is set,
    // a legacy use the standard keeps for them (MDN, "beforeunload").
    // eslint-disable-next-line no-param-reassign, @typescript-eslint/no-deprecated -- the only way those browsers ask
    event.returnValue = true;
  });
}

/** Announces in the status region what each change of the store did
    that the user may not be looking at, the start and the end of a
    calculation and the end of a read, with the words of
    `announcementsOf` of the shell, and empties the region when a file
    written and not saved is discarded (docs/specs/shell.md, "The status
    region"). */
function announceChanges(
  store: Store<JobResult, Blob>,
  announcer: Announcer,
): void {
  let before = store.getState();
  store.subscribe(() => {
    const after = store.getState();
    const texts = announcementsOf(before, after, SHELL_WORDS);
    // Before this change's own texts: the words of a file written and
    // not saved, which say to save it, no longer hold once it is gone.
    if (writtenDiscarded(before, after)) announcer.clear();
    before = after;
    for (const text of texts) announcer.announce(text);
  });
}

startPage(startApplication);
