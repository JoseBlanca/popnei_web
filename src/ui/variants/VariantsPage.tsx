/**
 * The body of popgen2.html (docs/specs/steps/popgen2-input.md, "The order
 * of the page"): the page's one heading, "Popnei"; under it the two boxes
 * of the files, side by side from 720 pixels and one above the other
 * below, the variants file's first; and under them the row of five tabs,
 * "Variants", "Individuals", "PCA", "Populations" and "Distances"
 * (docs/specs/steps/popgen2-pca.md, "The row of tabs"), the first shown
 * when the page opens and never changed by the page. Every tab stays
 * drawn, those not shown inert and hidden, so that a turn to another and
 * back finds the plots and the thresholds as they were ("Both tabs kept
 * drawn"). A tab of the analyses that cannot run, from `analysisTabs` of
 * core, is greyed with its reason, and shows the reason in place of its
 * content while it is shown greyed.
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
 * opening says and the box shows, and the tab shown, which is the
 * screen's and not the project's.
 */
import { useId, useRef, useState } from "react";

import { analysisTabs } from "../../core/popgen2Tabs.ts";
import type {
  AnalysisTabId,
  PageTab,
  TabGreyed,
} from "../../core/popgen2Tabs.ts";
import { classOf } from "../classOf.ts";
import type { AutoRuns } from "../autoRuns.ts";
import { ErrorBoundary } from "../shell/ErrorBoundary.tsx";
import { StatusRegion } from "../shell/StatusRegion.tsx";
import { useAppState } from "../store.tsx";
import { Tabs } from "../widgets/Tabs.tsx";
import type { TabItem } from "../widgets/Tabs.tsx";
import {
  greyedText,
  ANALYSES_TABS_LABEL,
  DISTANCES_NOT_BUILT,
  PAGE_TAB_LABELS,
  PCA_HEADING,
  POPULATIONS_NOT_BUILT,
} from "./analysisTabsWords.ts";
import { IndividualsBox } from "./IndividualsBox.tsx";
import { IndividualsTab } from "./IndividualsTab.tsx";
import { INDIVIDUALS_TAB_CONTENT_NAME } from "./individualsWords.ts";
import { OpenVariants } from "./OpenVariants.tsx";
import type { Refusal } from "./OpenVariants.tsx";
import type { StatsShown } from "./announceChanges.ts";
import { StatsSection } from "./StatsSection.tsx";
import styles from "./VariantsPage.module.css";
import { VariantsSummary } from "./VariantsSummary.tsx";
import {
  INFO_NAME,
  NO_VARIANTS_FILE_TAB,
  OPENING_NAME,
  OPENING_ZONE_NAME,
} from "./words.ts";

/** What the page is drawn with. */
export interface VariantsPageProps {
  /** The analyses the page starts by itself. */
  readonly autoRuns: AutoRuns;
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
  onCountButton,
  onStatsShown,
}: VariantsPageProps): React.JSX.Element {
  const openButton = useRef<HTMLButtonElement>(null);
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const [tab, setTab] = useState<PageTab>("variants");
  const variantsHeadingId = useId();
  const fileId = useAppState((s) => s.project.variants?.fileId ?? null);
  const individualsId = useAppState(
    (s) => s.project.individuals?.fileId ?? null,
  );
  // The same object while the reasons are the same, so that a threshold
  // moved does not draw the row again.
  const tabReasons = useAppState((s) =>
    analysisTabs(s.project, s.individualsKept),
  );
  return (
    <>
      <main className={classOf(styles, "page")}>
        {/* It takes the focus after Close of the error bar, and is not in
            the order of the Tab key. */}
        <h1 tabIndex={-1} className={classOf(styles, "title")}>
          Popnei
        </h1>
        {/* The row of Undo and Redo, the shell's UndoRedoButtons, which
            stood here with their keys, Ctrl+Z, Ctrl+Y and Cmd+Shift+Z, is
            hidden by the owner's decision of 8 October 2026, until a later
            feature needs it (docs/specs/steps/popgen2-filters.md, "Undo,
            Redo and their keys"). Kept ready to draw it again in a
            <div> of its own: the store's history, the thresholds and
            the FILTER box as commands with their descriptions, a run of
            the keys made a change before any other command (runGate.tsx,
            thresholdRun.ts), and the words of an undo (undoRedo.ts). */}
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
        <Tabs<PageTab>
          label={ANALYSES_TABS_LABEL}
          selected={tab}
          onChange={setTab}
          keepHidden
          tabs={[
            {
              id: "variants",
              label: PAGE_TAB_LABELS.variants,
              content: (
                <>
                  {fileId === null && (
                    <p className={classOf(styles, "boxLine")}>
                      {NO_VARIANTS_FILE_TAB}
                    </p>
                  )}
                  <StatsSection
                    autoRuns={autoRuns}
                    openButton={openButton}
                    onShown={onStatsShown}
                  />
                </>
              ),
            },
            {
              id: "individuals",
              label: PAGE_TAB_LABELS.individuals,
              content: (
                // Another load is another boundary, which has caught
                // nothing, as the statistics of the variants file have.
                <ErrorBoundary
                  key={individualsId ?? "none"}
                  heading={INDIVIDUALS_TAB_CONTENT_NAME}
                  level={2}
                >
                  <IndividualsTab shown={tab === "individuals"} />
                </ErrorBoundary>
              ),
            },
            analysisTab(
              "pca",
              tabReasons.pca,
              <h2 className={classOf(styles, "boxHeading")}>{PCA_HEADING}</h2>,
            ),
            analysisTab(
              "populations",
              tabReasons.populations,
              <p className={classOf(styles, "boxLine")}>
                {POPULATIONS_NOT_BUILT}
              </p>,
            ),
            analysisTab(
              "distances",
              tabReasons.distances,
              <p className={classOf(styles, "boxLine")}>
                {DISTANCES_NOT_BUILT}
              </p>,
            ),
          ]}
        />
      </main>
      <StatusRegion />
    </>
  );
}

/** A tab of the analyses: greyed with the words of `reason`, which are
    then its content too, or showing `content`. */
function analysisTab(
  id: AnalysisTabId,
  reason: TabGreyed | null,
  content: React.ReactNode,
): TabItem<AnalysisTabId> {
  const words = reason === null ? null : greyedText(id, reason);
  return {
    id,
    label: PAGE_TAB_LABELS[id],
    content:
      words === null ? (
        content
      ) : (
        <p className={classOf(styles, "boxLine")}>{words}</p>
      ),
    greyedReason: words,
  };
}
