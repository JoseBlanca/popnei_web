/**
 * The body of popgen2.html (docs/specs/steps/popgen2-input.md, "The order
 * of the page"): the page's one heading, "Popnei"; under it the two boxes
 * of the files, side by side from 720 pixels and one above the other
 * below, the variants file's first; and under them the two tabs, "Variants
 * file" and "Individuals file", the first shown when the page opens and
 * never changed by the page. Both tabs stay drawn, the one not shown inert
 * and hidden, so that a turn to the other and back finds the plots and the
 * thresholds as they were ("Both tabs kept drawn").
 *
 * The box of the variants file holds the lines of the file open, in a
 * boundary of errors made again for each file, which draws their name
 * alone in their place when they throw, and ends with the zone that opens
 * a variants file, moved there from the end of the page. The zone is
 * outside that boundary: inside it, it would be drawn anew at each
 * opening, and the button the user pressed, which holds the focus, would
 * be replaced, leaving the focus on nothing. The tab "Variants file" holds
 * the statistics of the file open (docs/plans/file-stats.md), and the
 * status region says what changes away from the focus, whichever tab is
 * shown. The page holds the words of the last file not opened, which the
 * opening says and the box shows, and the tab shown, which is the
 * screen's and not the project's.
 */
import { useId, useRef, useState } from "react";

import { classOf } from "../classOf.ts";
import type { AutoRuns } from "../autoRuns.ts";
import { ErrorBoundary } from "../shell/ErrorBoundary.tsx";
import { StatusRegion } from "../shell/StatusRegion.tsx";
import { useAppState } from "../store.tsx";
import { Tabs } from "../widgets/Tabs.tsx";
import { IndividualsBox } from "./IndividualsBox.tsx";
import {
  INDIVIDUALS_BOX_NAME,
  NO_INDIVIDUALS_FILE_TAB,
} from "./individualsWords.ts";
import { OpenVariants } from "./OpenVariants.tsx";
import type { Refusal } from "./OpenVariants.tsx";
import type { StatsShown } from "./announceChanges.ts";
import { StatsSection } from "./StatsSection.tsx";
import styles from "./VariantsPage.module.css";
import { VariantsSummary } from "./VariantsSummary.tsx";
import {
  FILES_TABS_LABEL,
  INFO_NAME,
  NO_VARIANTS_FILE_TAB,
  OPENING_NAME,
  OPENING_ZONE_NAME,
} from "./words.ts";

/** The ids of the two tabs of the files. */
type FileTab = "variants" | "individuals";

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
  const [tab, setTab] = useState<FileTab>("variants");
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
            <ErrorBoundary heading={OPENING_ZONE_NAME} level={3}>
              <OpenVariants buttonRef={openButton} onRefusal={setRefusal} />
            </ErrorBoundary>
          </section>
          <IndividualsBox />
        </div>
        <Tabs<FileTab>
          label={FILES_TABS_LABEL}
          selected={tab}
          onChange={setTab}
          keepHidden
          tabs={[
            {
              id: "variants",
              label: OPENING_NAME,
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
              label: INDIVIDUALS_BOX_NAME,
              content: (
                <p className={classOf(styles, "boxLine")}>
                  {NO_INDIVIDUALS_FILE_TAB}
                </p>
              ),
            },
          ]}
        />
      </main>
      <StatusRegion />
    </>
  );
}
