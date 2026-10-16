/**
 * The body of popgen2.html (docs/specs/steps/popgen2-input.md, "The order
 * of the page"), under the band at the top of the window, which carries
 * the page's one heading, "Popnei", since 10 October 2026
 * (docs/specs/steps/popgen2-band.md, "Its place"): the
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
 * alone in their place when they throw. Before a file is open it ends
 * with the zone that opens one, at its bottom, at the height of the
 * button of the box Individuals; the zone has a boundary of its own,
 * drawn again at each turn of the tabs after a throw, so that a throw in
 * it leaves the page a way to open a file without a reload. An opening
 * by its button, which goes with the zone, gives the focus to the box's
 * heading. Once a file is open the box has no zone and takes no drop,
 * which is stopped as one anywhere outside a zone, and "Open another
 * variants file…" is at the end of the Variants tab, under "Download
 * filtered variants…", where a file is dropped
 * (docs/plans/file-buttons.md; the owner's decisions of 16 October 2026).
 * The tab
 * "Variants" holds the statistics of the file open
 * (docs/plans/file-stats.md), and the
 * status region says what changes away from the focus, whichever tab is
 * shown. The tab "Individuals" is in a boundary made again for
 * each individuals file, as the statistics are for each variants file.
 * The page holds the words of the last file not opened, which the
 * opening says and the box shows; the one opening of the individuals
 * file, whose zones are in the box and at the end of the Individuals
 * tab; and the buttons that open a file, the box's before a file and
 * the tab's after, one at a time under each ref, which Remove and the
 * statistics give the focus to. The tab shown, the screen's and not
 * the project's, is the page's store of it, `pageTab`, which the band at
 * the top of the page reads and changes too.
 */
import { useId, useRef, useState } from "react";

import { classOf } from "../classOf.ts";
import { ErrorBoundary } from "../shell/ErrorBoundary.tsx";
import { StatusRegion } from "../shell/StatusRegion.tsx";
import { useAppState } from "../store.tsx";
import { usePageTab } from "../pageTab.ts";
import type { PageTabStore } from "../pageTab.ts";
import { ANALYSES_TABS_LABEL } from "./analysisTabsWords.ts";
import { useFocusOnGone } from "./focusOnGone.ts";
import { IndividualsBox } from "./IndividualsBox.tsx";
import { useIndividualsOpening } from "./OpenIndividuals.tsx";
import { OpenVariants } from "./OpenVariants.tsx";
import type { Refusal } from "./OpenVariants.tsx";
import type { StatsShown } from "./announceChanges.ts";
import { PageTabs } from "./PageTabs.tsx";
import styles from "./VariantsPage.module.css";
import { VariantsSummary } from "./VariantsSummary.tsx";
import { INFO_NAME, OPENING_NAME, OPENING_ZONE_NAME } from "./words.ts";

/** What the page is drawn with. */
export interface VariantsPageProps {
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
  pageTab,
  onCountButton,
  onStatsShown,
}: VariantsPageProps): React.JSX.Element {
  const openButton = useRef<HTMLButtonElement>(null);
  const individualsOpenButton = useRef<HTMLButtonElement>(null);
  const variantsHeading = useRef<HTMLHeadingElement>(null);
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const individualsOpening = useIndividualsOpening();
  const tab = usePageTab(pageTab);
  const variantsHeadingId = useId();
  const fileId = useAppState((s) => s.project.variants?.fileId ?? null);
  // An opening by the box's button: the button goes with its zone, and
  // the focus goes to the box's heading.
  const zoneEnd = useFocusOnGone(() => variantsHeading.current);
  return (
    <>
      <main className={classOf(styles, "page")}>
        <div className={classOf(styles, "boxes")}>
          <section
            aria-labelledby={variantsHeadingId}
            className={classOf(styles, "box")}
          >
            {/* It takes the focus after an opening by the box's button,
                and when the lines of a file go with it; it is not a stop
                of the Tab key. */}
            <h2
              ref={variantsHeading}
              id={variantsHeadingId}
              tabIndex={-1}
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
                focusTarget={variantsHeading}
                onCountButton={onCountButton}
                refusal={refusal}
              />
            </ErrorBoundary>
            {fileId === null && (
              <div ref={zoneEnd} className={classOf(styles, "boxEnd")}>
                {/* Its own boundary, drawn again at each turn of the tabs
                    after a throw: after a throw the zone is gone, and with
                    it the one way to open a file, so a turn of the tab
                    draws it again, as a turn of the step draws the step on
                    popgen.html. */}
                <ErrorBoundary
                  heading={OPENING_ZONE_NAME}
                  level={3}
                  resetOn={tab}
                >
                  <OpenVariants buttonRef={openButton} onRefusal={setRefusal} />
                </ErrorBoundary>
              </div>
            )}
          </section>
          <IndividualsBox
            tab={tab}
            opening={individualsOpening}
            openButton={individualsOpenButton}
          />
        </div>
        {/* A defect in the reasons of the tabs costs the row alone, not
            the boxes of the files. */}
        <ErrorBoundary heading={ANALYSES_TABS_LABEL} level={2}>
          <PageTabs
            tab={tab}
            onTabChange={(next) => {
              pageTab.show(next);
            }}
            openButton={openButton}
            variantsRefusal={refusal}
            onVariantsRefusal={setRefusal}
            individualsOpenButton={individualsOpenButton}
            individualsOpening={individualsOpening}
            onStatsShown={onStatsShown}
          />
        </ErrorBoundary>
      </main>
      <StatusRegion />
    </>
  );
}
