/**
 * The body of popgen2.html, the first of the new screens
 * (docs/plans/open-variants.md; the owner's layouts of 6 October 2026):
 * the page's one heading, "Popnei"; the box of the file open, with what
 * went wrong with it; under it the opening of the variants file; under
 * that the statistics of the open file (docs/plans/file-stats.md); each in
 * a boundary of errors that draws its name alone in its place; and the
 * status region that says what changes away from the focus. The page holds the words of the last file
 * not opened, which the opening says and the box shows.
 */
import { useRef, useState } from "react";

import { classOf } from "../classOf.ts";
import type { AutoRuns } from "../autoRuns.ts";
import { ErrorBoundary } from "../shell/ErrorBoundary.tsx";
import { StatusRegion } from "../shell/StatusRegion.tsx";
import { FileStats } from "./FileStats.tsx";
import { OpenVariants } from "./OpenVariants.tsx";
import type { Refusal } from "./OpenVariants.tsx";
import styles from "./VariantsPage.module.css";
import { STATS_NAME } from "./statsWords.ts";
import { VariantsSummary } from "./VariantsSummary.tsx";
import { INFO_NAME, OPENING_NAME } from "./words.ts";

/** What the page is drawn with. */
export interface VariantsPageProps {
  /** The analyses the page starts by itself. */
  readonly autoRuns: AutoRuns;
  /** Called with the element of Stop or Count again of the count while
      one is shown, and with `null` when it goes, for the entry to tell
      whether the focus is on it as the count ends. */
  readonly onCountButton: (node: HTMLButtonElement | null) => void;
}

/** The page that opens a variants file and shows what it holds. */
export function VariantsPage({
  autoRuns,
  onCountButton,
}: VariantsPageProps): React.JSX.Element {
  const openButton = useRef<HTMLButtonElement>(null);
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  return (
    <>
      <main className={classOf(styles, "page")}>
        {/* It takes the focus after Close of the error bar, and is not in
            the order of the Tab key. */}
        <h1 tabIndex={-1} className={classOf(styles, "title")}>
          Popnei
        </h1>
        <ErrorBoundary heading={INFO_NAME} level={2}>
          <VariantsSummary
            autoRuns={autoRuns}
            openButton={openButton}
            onCountButton={onCountButton}
            refusal={refusal}
          />
        </ErrorBoundary>
        <ErrorBoundary heading={OPENING_NAME} level={2}>
          <OpenVariants buttonRef={openButton} onRefusal={setRefusal} />
        </ErrorBoundary>
        <ErrorBoundary heading={STATS_NAME} level={2}>
          <FileStats autoRuns={autoRuns} openButton={openButton} />
        </ErrorBoundary>
      </main>
      <StatusRegion />
    </>
  );
}
