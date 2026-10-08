/**
 * The body of popgen2.html, the first of the new screens
 * (docs/plans/open-variants.md; the owner's layouts of 6 October 2026):
 * the page's one heading, "Popnei"; the row of Undo and Redo, the
 * shell's buttons, which undo and redo the changes of the filters and not
 * the opening of a file, there before any file, disabled, so that the
 * page does not move down when the first file is opened
 * (docs/specs/steps/popgen2-filters.md, "The order of the page"); the box
 * of the file open, with what
 * went wrong with it; under it the statistics of the open file
 * (docs/plans/file-stats.md); and at the bottom the opening of the
 * variants file, which the owner put after the statistics on 6 October
 * 2026, and which is alone under the heading before a file is opened.
 * Each is in a boundary of errors that draws its name alone in its place,
 * those of the box and of the statistics made again for each file; and
 * the status region
 * says what changes away from the focus. The page holds the words of the last file
 * not opened, which the opening says and the box shows.
 */
import { useRef, useState } from "react";

import { classOf } from "../classOf.ts";
import type { AutoRuns } from "../autoRuns.ts";
import { ErrorBoundary } from "../shell/ErrorBoundary.tsx";
import { StatusRegion } from "../shell/StatusRegion.tsx";
import { UndoRedoButtons } from "../shell/UndoRedoButtons.tsx";
import { useAppState } from "../store.tsx";
import { OpenVariants } from "./OpenVariants.tsx";
import type { Refusal } from "./OpenVariants.tsx";
import type { StatsShown } from "./announceChanges.ts";
import { StatsSection } from "./StatsSection.tsx";
import styles from "./VariantsPage.module.css";
import { VariantsSummary } from "./VariantsSummary.tsx";
import { INFO_NAME, OPENING_NAME } from "./words.ts";

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
  const fileId = useAppState((s) => s.project.variants?.fileId ?? null);
  return (
    <>
      <main className={classOf(styles, "page")}>
        {/* It takes the focus after Close of the error bar, and is not in
            the order of the Tab key. */}
        <h1 tabIndex={-1} className={classOf(styles, "title")}>
          Popnei
        </h1>
        <div className={classOf(styles, "history")}>
          <UndoRedoButtons />
        </div>
        {/* Another load is another boundary, which has caught nothing, so
            that a throw while the box of one file is drawn leaves the
            next file its box, its Stop and its Start again. */}
        <ErrorBoundary key={fileId ?? "none"} heading={INFO_NAME} level={2}>
          <VariantsSummary
            autoRuns={autoRuns}
            openButton={openButton}
            onCountButton={onCountButton}
            refusal={refusal}
          />
        </ErrorBoundary>
        <StatsSection
          autoRuns={autoRuns}
          openButton={openButton}
          onShown={onStatsShown}
        />
        <ErrorBoundary heading={OPENING_NAME} level={2}>
          <OpenVariants buttonRef={openButton} onRefusal={setRefusal} />
        </ErrorBoundary>
      </main>
      <StatusRegion />
    </>
  );
}
