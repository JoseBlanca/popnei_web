/**
 * The individuals per population in the tab "Individuals" of
 * popgen2.html, in the box of the individuals file until 16 October 2026,
 * when the owner asked for a box that summarises
 * (docs/specs/steps/popgen2-input.md, "The Individuals tab", "The
 * individuals per population"): the heading "Individuals per population,
 * after the filters of individuals", the table of two columns,
 * "Population" and "Individuals", or its one row "Unclassified" when the
 * column classifies nobody, and under it the line of the unclassified
 * kept, or of why the counts wait for the one pass. Nothing before the
 * variants file is read, with a column of more than 20 values, or with no
 * individual of the variants file in the individuals file, which the box
 * says. The table has no caption on the screen, its heading standing above
 * it, and no menu "Download…"; its hidden caption names it for a screen
 * reader.
 *
 * Also the parts the box draws of the counts with it: a count that waits,
 * "…" read as "not counted yet", and a line of the counts, words or a
 * warning.
 */
import { useId } from "react";

import { populationCounts } from "../../core/populations.ts";
import { escaped } from "../../core/project.ts";
import { useLive } from "../autoRunsContext.ts";
import { classOf } from "../classOf.ts";
import { useAppState } from "../store.tsx";
import { Table } from "../widgets/Table.tsx";
import type { TableRow } from "../widgets/Table.tsx";
import { VISUALLY_HIDDEN } from "../widgets/visuallyHidden.ts";
import { Warning } from "../widgets/Warning.tsx";
import styles from "./IndividualsTab.module.css";
import {
  COUNTS_HEADING,
  INDIVIDUALS_HEADER,
  NOT_COUNTED_YET,
  POPULATION_HEADER,
  UNCLASSIFIED_ROW,
  WAITING_COUNT,
  countText,
  countsCaption,
  countsShown,
  passWaitOf,
} from "./individualsWords.ts";
import type { CountsLine, PassWait } from "./individualsWords.ts";

/** The columns of the table of the counts. */
const COUNT_COLUMNS = [
  { id: "population", label: POPULATION_HEADER, isRowHeader: true },
  { id: "individuals", label: INDIVIDUALS_HEADER, isNumeric: true },
] as const;

/** The individuals per population of the individuals file read, in the
    Individuals tab; nothing when the box says why there are none. */
export function IndividualsCounts(): React.JSX.Element | null {
  const headingId = useId();
  const project = useAppState((s) => s.project);
  const kept = useAppState((s) => s.individualsKept);
  const wait = usePassWait();
  const counts = populationCounts(project, kept);
  if (counts === null || project.variants === null) return null;
  const shown = countsShown(project, counts, wait);
  if (shown.table === "none") return null;
  const rows: TableRow[] =
    shown.table === "populations"
      ? counts.populations.map(({ pop, kept: numKept }) => ({
          id: pop,
          cells: [escaped(pop), countCell(numKept)],
        }))
      : [
          {
            id: UNCLASSIFIED_ROW,
            cells: [
              UNCLASSIFIED_ROW,
              countCell(
                counts.known ? (counts.unclassified?.kept ?? null) : null,
              ),
            ],
          },
        ];
  return (
    <section aria-labelledby={headingId} className={classOf(styles, "counts")}>
      <h2 id={headingId} className={classOf(styles, "heading")}>
        {COUNTS_HEADING}
      </h2>
      <Table
        caption={countsCaption(project.variants.name)}
        captionHidden
        columns={COUNT_COLUMNS}
        rows={rows}
      />
      {shown.tabLines.map((line) => (
        <CountsLineShown key={line.text} line={line} />
      ))}
    </section>
  );
}

/** A count: its number, or "…" while it is not known, read as "not
    counted yet". */
function countCell(kept: number | null): string | React.JSX.Element {
  return kept === null ? waitingCount() : countText(kept);
}

/** A count that waits for the one pass: "…" on the screen, "not counted
    yet" for a screen reader; `key` for it among the parts of a line. */
export function waitingCount(key?: number): React.JSX.Element {
  return (
    <span key={key}>
      <span aria-hidden="true">{WAITING_COUNT}</span>
      <span className={VISUALLY_HIDDEN}>{NOT_COUNTED_YET}</span>
    </span>
  );
}

/** A line of the counts: words, or a warning. */
export function CountsLineShown({
  line,
}: {
  readonly line: CountsLine;
}): React.JSX.Element {
  return (
    <p className={classOf(styles, "line")}>
      {line.kind === "warning" ? <Warning>{line.text}</Warning> : line.text}
    </p>
  );
}

/** Why the counts wait for the one pass, a primitive, so that a progress
    of the pass, which changes the statuses and not the answer, draws the
    counts no more; and read again when the analyses the page starts by
    itself tell a Stop. */
export function usePassWait(): PassWait {
  return useLive((s, autoRuns) =>
    passWaitOf(s, (key) => autoRuns.startedUnder(key)),
  );
}
