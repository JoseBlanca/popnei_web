/**
 * The body of popgen2.html, the first of the new screens
 * (docs/plans/open-variants.md): the page's heading, the opening of the
 * variants file and what the file holds, each in a boundary of errors
 * that draws its heading alone in its place, and the status region that
 * says what changes away from the focus.
 */
import { useRef } from "react";

import { classOf } from "../classOf.ts";
import type { AutoRuns } from "../autoRuns.ts";
import { ErrorBoundary } from "../shell/ErrorBoundary.tsx";
import { StatusRegion } from "../shell/StatusRegion.tsx";
import { OpenVariants } from "./OpenVariants.tsx";
import styles from "./VariantsPage.module.css";
import { VariantsSummary } from "./VariantsSummary.tsx";
import { SUMMARY_HEADING } from "./words.ts";

/** What the page is drawn with. */
export interface VariantsPageProps {
  /** The analyses the page starts by itself. */
  readonly autoRuns: AutoRuns;
}

/** The page that opens a variants file and shows what it holds. */
export function VariantsPage({
  autoRuns,
}: VariantsPageProps): React.JSX.Element {
  const openButton = useRef<HTMLButtonElement>(null);
  return (
    <>
      <main className={classOf(styles, "page")}>
        {/* It takes the focus after Close of the error bar, and is not in
            the order of the Tab key. */}
        <h1 tabIndex={-1} className={classOf(styles, "title")}>
          Population genetics
        </h1>
        <ErrorBoundary heading="Variants file" level={2}>
          <OpenVariants buttonRef={openButton} />
        </ErrorBoundary>
        <ErrorBoundary heading={SUMMARY_HEADING} level={2}>
          <VariantsSummary autoRuns={autoRuns} openButton={openButton} />
        </ErrorBoundary>
      </main>
      <StatusRegion />
    </>
  );
}
