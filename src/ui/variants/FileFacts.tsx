/**
 * The size of the variants file open, its chromosomes and its ploidy, at
 * the top of the Variants tab of popgen2.html, before "Filters of the
 * variants" (docs/specs/steps/popgen2-input.md, "The Variants tab"). The
 * box of the variants file showed them until 11 October 2026, when the
 * owner asked that the boxes, which stand above every tab, keep only what
 * matters most. The size is known at the opening; the ploidy once the
 * file is read; the chromosomes once the one pass counts them, so far
 * while it runs. A file that could not be opened shows none of them: its
 * box says why.
 */

import { useAutoRuns } from "../autoRunsContext.ts";
import { classOf } from "../classOf.ts";
import { useAppState } from "../store.tsx";
import { chainButton, chainStatuses } from "./chain.ts";
import styles from "./FileFacts.module.css";
import {
  CHROMOSOMES_READING,
  FACTS_NAME,
  PLOIDY_READING,
  chromosomesLineOf,
  fileSizeLine,
  ploidyLine,
  summaryStatus,
} from "./words.ts";

/** The three lines of the file open; nothing with no file, or one that
    could not be opened. */
export function FileFacts(): React.JSX.Element | null {
  const variants = useAppState((s) => s.project.variants);
  if (variants === null || variants.read.kind === "failed") return null;
  const read = variants.read;
  return (
    // A region named for a screen reader, which lists it among the
    // regions of the page; the lines have no heading on the screen.
    <section aria-label={FACTS_NAME} className={classOf(styles, "facts")}>
      <p className={classOf(styles, "fact")}>{fileSizeLine(variants)}</p>
      {read.kind === "read" ? (
        <Chromosomes />
      ) : (
        <p className={classOf(styles, "fact")}>{CHROMOSOMES_READING}</p>
      )}
      <p className={classOf(styles, "fact")}>
        {read.kind === "read" ? ploidyLine(read.ploidy) : PLOIDY_READING}
      </p>
    </section>
  );
}

/** The line of the chromosomes of a file read, in each state of their
    count by the one pass. */
function Chromosomes(): React.JSX.Element {
  const status = useAppState(summaryStatus);
  const analyses = useAppState((s) => s.analyses);
  // Drawn again at each change of what autoRuns knows, which a Stop of a
  // pass about to start changes and the store does not.
  const autoRuns = useAutoRuns();
  const stopped =
    chainButton(chainStatuses(analyses), (key) => autoRuns.startedUnder(key))
      ?.kind === "run";
  return (
    <p className={classOf(styles, "fact")}>
      {chromosomesLineOf(status, stopped)}
    </p>
  );
}
