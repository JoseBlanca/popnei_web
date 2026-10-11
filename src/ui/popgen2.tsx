/**
 * The entry of the new page of population genetics, `popgen2.html`
 * (docs/plans/open-variants.md, "A new page, beside the old one"): the
 * opening of popgen.html, with the functions of pageStart.tsx, without
 * the stepper, the saving and the shell. It makes the store of the page,
 * wrapped for the screens by the gate of the thresholds' runs, and the
 * worker client, the announcer of the status region, the reads
 * the project waits for, the analyses that start by themselves, the
 * one pass and the PCA once live, with the gate's changes under way
 * holding the PCA's quiet second, the keys of Undo and Redo refused, so
 * that they reach no action of the browser on a page with no Undo, and
 * the column of the populations chosen at each read of
 * the individuals file, and draws the band, with the page's heading and
 * the errors of the application, and the page in two roots, all in one
 * run of this code.
 */
import "./tokens.css";
import "./base.css";

import { LIVE_QUIET_MS, createAutoRuns } from "./autoRuns.ts";
import type { AutoRuns } from "./autoRuns.ts";
import type { Defects } from "./defects.ts";
import { FilesProvider } from "./files.tsx";
import { createPageTab } from "./pageTab.ts";
import {
  connectStore,
  renderApplication,
  startPage,
  syncReads,
} from "./pageStart.tsx";
import type { DrawBar } from "./pageStart.tsx";
import { Band } from "./band/Band.tsx";
import type { BandWith } from "./band/Band.tsx";
import {
  POPGEN2_AUTO_GROUPS,
  POPGEN2_LIVE,
  createPopgen2Store,
  popgen2EndsLive,
} from "./popgen2Store.ts";
import { choosePopulationColumns } from "./populationColumn.ts";
import { startAnalysis } from "./runs.ts";
import { AnnouncerProvider } from "./shell/announcer.tsx";
import { refuseUndoKeys } from "./shell/shortcuts.ts";
import { createAnnouncer } from "./shell/status.ts";
import { StoreProvider } from "./store.tsx";
import type { PageStore } from "./store.tsx";
import { VariantsPage } from "./variants/VariantsPage.tsx";
import { announceChanges, announceLive } from "./variants/announceChanges.ts";
import { AutoRunsProvider } from "./variants/filtersLock.ts";
import { RunGateProvider } from "./variants/runGate.tsx";
import { createRunGate, gatedStore } from "./variants/thresholdRun.ts";
import type { RunGate } from "./variants/thresholdRun.ts";
import { reportDefects } from "./variants/workerDefects.ts";
import { ChangeHoldsProvider } from "./widgets/changeHold.ts";

/** The opening after the guard, the listeners and the band: the store
    and the worker client, the announcer, the reads, the analyses that
    start by themselves, the tab shown, the band with them, the column
    of the populations, and the page. */
function startApplication(defects: Defects, drawBar: DrawBar<BandWith>): void {
  const { store, client, files } = connectStore((senders) =>
    createPopgen2Store({ ...senders, appVersion: APP_VERSION }),
  );

  const announcer = createAnnouncer();
  // Stop or Start again of the box, while one is shown.
  let countButton: HTMLButtonElement | null = null;
  const statsShown = announceChanges(store, announcer, () => countButton);
  reportDefects(store, defects);
  syncReads(store, client);
  // The keys of Undo and Redo do nothing on this page, which has none,
  // and reach no browser's own action, for as long as the page lives.
  refuseUndoKeys(window);
  // The screens' commands pass the gate of the thresholds, which makes a
  // run of the keys waiting a change before any other.
  const gate = createRunGate();
  const gated = gatedStore(store, gate);
  const autoRuns = startByThemselves(store, gated, gate);
  // The tab shown, which the row of tabs and the band both read and
  // change.
  const pageTab = createPageTab();
  // The band at the top of the page, which carries its heading and says
  // what it is doing; its error line has no Save, as this page saves no
  // project.
  drawBar({ store, autoRuns, pageTab, announcer });
  // The PCA started again by itself, and its Stop, said in the status
  // region wherever the focus is.
  announceLive(store, autoRuns, announcer);
  // The column of the populations at each read of the individuals file,
  // recorded as the read is, with no step: sent to the store itself, so
  // that it ends no run of the keys and applies nothing typed. It
  // watches as long as the page lives, as the reads and the runs do.
  choosePopulationColumns({
    store,
    announce: (words) => {
      announcer.announce(words);
    },
  });

  renderApplication(
    defects,
    <StoreProvider value={gated}>
      <RunGateProvider value={gate}>
        {/* The widgets hold their changes under way on the gate, and see
            nothing else of it. */}
        <ChangeHoldsProvider value={gate}>
          <AnnouncerProvider value={announcer}>
            <FilesProvider value={files}>
              {/* The lock of the filters and the download's wait read
                  which analyses are live from it. */}
              <AutoRunsProvider value={autoRuns}>
                <VariantsPage
                  autoRuns={autoRuns}
                  pageTab={pageTab}
                  onCountButton={(node) => {
                    countButton = node;
                  }}
                  onStatsShown={statsShown}
                />
              </AutoRunsProvider>
            </FilesProvider>
          </AnnouncerProvider>
        </ChangeHoldsProvider>
      </RunGateProvider>
    </StoreProvider>,
  );
}

/** The summary of the variants file, the one pass of the count and the
    statistics of the open file, started once the file is read
    (docs/plans/live-stats.md); and the PCA, started again by itself a
    quiet second after a change once the user's Run made it live, its
    Run passing the gate `gate` through the screens' store `gated`
    (docs/specs/steps/popgen2-pca.md, "The PCA calculated again by
    itself"). A change of the store starts them after the listeners of
    that change have all run, so that a start is not made in the middle
    of telling them. */
function startByThemselves(
  store: PageStore,
  gated: PageStore,
  gate: RunGate,
): AutoRuns {
  const autoRuns = createAutoRuns({
    store,
    groups: POPGEN2_AUTO_GROUPS,
    start: (id) => startAnalysis(store, id),
    live: {
      analyses: POPGEN2_LIVE,
      changes: gate,
      runStart: (id) => startAnalysis(gated, id),
      quietMs: LIVE_QUIET_MS,
      endsLive: popgen2EndsLive,
    },
  });
  store.subscribe(() => {
    queueMicrotask(() => {
      autoRuns.sync();
    });
  });
  autoRuns.sync();
  return autoRuns;
}

startPage<BandWith>(startApplication, (defects, made) => (
  <Band defects={defects} page={made} appVersion={APP_VERSION} />
));
