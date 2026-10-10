/**
 * The body of popgen2.html (docs/specs/steps/popgen2-input.md, "The order
 * of the page"): the page's one heading, "Popnei", alone on its line, as
 * the page has no Undo and no Redo since 10 October 2026
 * (docs/specs/steps/popgen2-pca.md, "No Undo and no Redo"); under it the
 * two boxes
 * of the files, side by side from 720 pixels and one above the other
 * below, the variants file's first; and under them the row of five tabs,
 * "Variants", "Individuals", "PCA", "Populations" and "Distances"
 * (docs/specs/steps/popgen2-pca.md, "The row of tabs"), the first shown
 * when the page opens and never changed by the page, drawn by
 * `PageTabs` in a boundary of errors of its own, so that a throw in it
 * leaves the two boxes.
 *
 * The box of the variants file holds the lines of the file open, in a
 * boundary of errors made again for each file, which draws their name
 * alone in their place when they throw, and ends with the zone that opens
 * a variants file, moved there from the end of the page. The zone is
 * outside that boundary: inside it, it would be drawn anew at each
 * opening, and the button the user pressed, which holds the focus, would
 * be replaced, leaving the focus on nothing. It has a boundary of its
 * own, made again at each turn of the tabs, so that a throw in it leaves
 * the page a way to open a file without a reload. The tab "Variants" holds
 * the statistics of the file open (docs/plans/file-stats.md), and the
 * status region says what changes away from the focus, whichever tab is
 * shown. The tab "Individuals" is in a boundary made again for
 * each individuals file, as the statistics are for each variants file.
 * The page holds the words of the last file not opened, which the
 * opening says and the box shows. The tab shown, the screen's and not
 * the project's, is the page's store of it, `pageTab`, which the band at
 * the top of the page reads and changes too.
 */
import { useId, useRef, useState } from "react";

import { classOf } from "../classOf.ts";
import type { AutoRuns } from "../autoRuns.ts";
import { ErrorBoundary } from "../shell/ErrorBoundary.tsx";
import { StatusRegion } from "../shell/StatusRegion.tsx";
import { useAppState } from "../store.tsx";
import { usePageTab } from "../pageTab.ts";
import type { PageTabStore } from "../pageTab.ts";
import { ANALYSES_TABS_LABEL } from "./analysisTabsWords.ts";
import { IndividualsBox } from "./IndividualsBox.tsx";
import { OpenVariants } from "./OpenVariants.tsx";
import type { Refusal } from "./OpenVariants.tsx";
import type { StatsShown } from "./announceChanges.ts";
import { PageTabs } from "./PageTabs.tsx";
import styles from "./VariantsPage.module.css";
import { VariantsSummary } from "./VariantsSummary.tsx";
import { INFO_NAME, OPENING_NAME, OPENING_ZONE_NAME } from "./words.ts";

/** What the page is drawn with. */
export interface VariantsPageProps {
  /** The analyses the page starts by itself. */
  readonly autoRuns: AutoRuns;
  /** The tab shown, which the row of tabs reads and changes. */
  readonly pageTab: PageTabStore;
  /** Called with the element of Stop or Start again of the box while
      one is shown, and with `null` when it goes, for the entry to tell
      whether the focus is on it as the count ends. */
  readonly onCountButton: (node: HTMLButtonElement | null) => void;
  /** Told when the section of the statistics of a load is drawn, and when
      it goes. */
  readonly onStatsShown: StatsShown;
}

/** The page that opens a variants file and shows what it holds. */
export function VariantsPage({
  autoRuns,
  pageTab,
  onCountButton,
  onStatsShown,
}: VariantsPageProps): React.JSX.Element {
  const openButton = useRef<HTMLButtonElement>(null);
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const tab = usePageTab(pageTab);
  const variantsHeadingId = useId();
  const fileId = useAppState((s) => s.project.variants?.fileId ?? null);
  return (
    <>
      <main className={classOf(styles, "page")}>
        {/* It takes the focus after Close of the error bar, and is not in
            the order of the Tab key. */}
        <h1 tabIndex={-1} className={classOf(styles, "title")}>
          Popnei
        </h1>
        <div className={classOf(styles, "boxes")}>
          <section
            aria-labelledby={variantsHeadingId}
            className={classOf(styles, "box")}
          >
            <h2
              id={variantsHeadingId}
              className={classOf(styles, "boxHeading")}
            >
              {OPENING_NAME}
            </h2>
            {/* Another load is another boundary, which has caught
                nothing, so that a throw while the lines of one file are
                drawn leaves the next file its lines, its Stop and its
                Start again. */}
            <ErrorBoundary key={fileId ?? "none"} heading={INFO_NAME} level={3}>
              <VariantsSummary
                autoRuns={autoRuns}
                openButton={openButton}
                onCountButton={onCountButton}
                refusal={refusal}
              />
            </ErrorBoundary>
            {/* Its own boundary, made again at each turn of the tabs:
                after a throw the zone is gone, and with it the one way to
                open a file, so a turn of the tab draws it again, as a
                turn of the step draws the step on popgen.html. Not keyed
                by the load, which would replace the button at each
                opening. */}
            <ErrorBoundary key={tab} heading={OPENING_ZONE_NAME} level={3}>
              <OpenVariants buttonRef={openButton} onRefusal={setRefusal} />
            </ErrorBoundary>
          </section>
          <IndividualsBox autoRuns={autoRuns} tab={tab} />
        </div>
        {/* A defect in the reasons of the tabs costs the row alone, not
            the boxes of the files. */}
        <ErrorBoundary heading={ANALYSES_TABS_LABEL} level={2}>
          <PageTabs
            tab={tab}
            onTabChange={(next) => {
              pageTab.show(next);
            }}
            autoRuns={autoRuns}
            openButton={openButton}
            onStatsShown={onStatsShown}
          />
        </ErrorBoundary>
      </main>
      <StatusRegion />
    </>
  );
}
