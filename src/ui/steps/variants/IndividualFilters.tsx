/**
 * The section of the filters of the individuals in the Variants step
 * (docs/specs/steps/variants.md, "The filters of the individuals"): the
 * list to keep and the list to remove, each a text area of one name per
 * line with Apply and Clear.
 *
 * The text of each list is the step's until Apply sends it: it starts at
 * the list of the project each time the step is drawn and after each
 * undo, redo or opening, and while its names are not the list applied a
 * line under it says so. The reason `individualListNeeds` gives for a
 * list popnei would refuse, a name not in the variants file among them,
 * stands under the list it names without its end "in the Variants step",
 * describes its text area, and is announced when an Apply or a Clear
 * makes it appear, since the focus stays on the button; the stepper and
 * the writing show it too. The lists are drawn in every state, since they belong to the
 * project, and a list is checked only once the variants file is read.
 *
 * After the lists, once the variants file is read, the block of the
 * statistics of each individual (IndividualChecksBlock.tsx); once they
 * are calculated, the histogram of each of the two statistics, in the
 * place of the threshold of its filter, with that threshold marked while
 * the filter is on, and the table of the individuals with its download.
 * The block, each histogram and the table are drawn inside an error
 * boundary of their own, and each reads its result inside it, so that a
 * defect in drawing one leaves the lists and the rest of the step
 * (react.md, "Errors").
 */
import { useId, useMemo, useState } from "react";

import type { IndividualStatistic } from "../../../core/analyses/individualChecks.ts";
import { individualListNeeds } from "../../../core/project.ts";
import { resultOf, statusOf } from "../../analyses/status.ts";
import { titleOf } from "../../analyses/titles.ts";
import { ErrorBoundary } from "../../shell/ErrorBoundary.tsx";
import { classOf } from "../../classOf.ts";
import { useHistoryMoves } from "../../historyMoves.ts";
import { useAnnouncer } from "../../shell/announcer.tsx";
import { useAppState, useStore } from "../../store.tsx";
import { Button } from "../../widgets/Button.tsx";
import { Problem } from "../../widgets/Problem.tsx";
import { TextArea } from "../../widgets/TextArea.tsx";
import type { StepCommand } from "./commands.ts";
import { IndividualChecksBlock } from "./IndividualChecksBlock.tsx";
import { IndividualHistogram } from "./IndividualHistogram.tsx";
import { IndividualTable } from "./IndividualTable.tsx";
import {
  INDIVIDUAL_FILTERS_HEADING,
  LIST_KINDS,
  LIST_WORDS,
  applyCommand,
  appearedReason,
  clearCommand,
  isApplied,
  listOf,
  listReasonText,
  notAppliedText,
  shownText,
} from "./individualLists.ts";
import type { ListKind, TypedList } from "./individualLists.ts";
import {
  INDIVIDUAL_HISTOGRAMS,
  STATS_TABLE_NAME,
  individualThreshold,
} from "./individualStats.ts";
import styles from "./VariantsStep.module.css";

/** The texts typed in the two lists, `null` where nothing was typed. */
type TypedLists = Readonly<Record<ListKind, TypedList | null>>;

const NOTHING_TYPED: TypedLists = { keep: null, remove: null };

/** The Clears of each list so far. */
type Clears = Readonly<Record<ListKind, number>>;

const NO_CLEAR: Clears = { keep: 0, remove: 0 };

/** The section of the filters of the individuals. */
export function IndividualFilters(): React.JSX.Element {
  const store = useStore();
  const announcer = useAnnouncer();
  const project = useAppState((s) => s.project);
  const moves = useHistoryMoves();
  const [typed, setTyped] = useState<TypedLists>(NOTHING_TYPED);
  const [clears, setClears] = useState<Clears>(NO_CLEAR);
  const headingId = useId();
  const needs = useMemo(() => individualListNeeds(project), [project]);
  const read = project.variants?.read.kind === "read";
  const statsDone = useAppState(
    (s) => statusOf(s, "individualChecks").kind === "done",
  );

  /** Sends the command of Apply or Clear, and announces the reason of
      a list that it makes appear. */
  const send = (step: StepCommand): void => {
    const before = individualListNeeds(store.getState().project);
    store.apply(step.description, step.command);
    const appeared = appearedReason(
      before,
      individualListNeeds(store.getState().project),
    );
    if (appeared !== null) announcer.announce(appeared);
  };
  const type = (kind: ListKind, text: string): void => {
    setTyped((before) => ({ ...before, [kind]: { text, moves } }));
  };

  return (
    <section aria-labelledby={headingId} className={classOf(styles, "section")}>
      <h2 id={headingId} className={classOf(styles, "heading")}>
        {INDIVIDUAL_FILTERS_HEADING}
      </h2>
      <div className={classOf(styles, "lists")}>
        {LIST_KINDS.map((kind) => {
          const list = listOf(project, kind);
          const text = shownText(typed[kind], moves, list);
          return (
            <IndividualList
              key={kind}
              kind={kind}
              edition={`${String(moves)} ${String(clears[kind])}`}
              text={text}
              applied={isApplied(text, list)}
              reason={needs?.list === kind ? listReasonText(needs) : null}
              onType={(next) => {
                type(kind, next);
              }}
              onApply={() => {
                send(applyCommand(kind, text));
              }}
              onClear={() => {
                type(kind, "");
                setClears((before) => ({
                  ...before,
                  [kind]: before[kind] + 1,
                }));
                send(clearCommand(kind));
              }}
            />
          );
        })}
      </div>
      {read && (
        <ErrorBoundary level={3} heading={titleOf("individualChecks")}>
          <IndividualChecksBlock />
        </ErrorBoundary>
      )}
      {read && statsDone && (
        <>
          <div className={classOf(styles, "filters")}>
            {STATISTICS.map((statistic) => (
              // The threshold of the filter of the statistic goes before
              // its histogram.
              <div key={statistic} className={classOf(styles, "filter")}>
                <ErrorBoundary
                  level={3}
                  heading={INDIVIDUAL_HISTOGRAMS[statistic].title}
                >
                  <HistogramOf
                    statistic={statistic}
                    threshold={individualThreshold(
                      project.individualFilters,
                      statistic,
                    )}
                  />
                </ErrorBoundary>
              </div>
            ))}
          </div>
          <ErrorBoundary level={3} heading={STATS_TABLE_NAME}>
            <TableOf />
          </ErrorBoundary>
        </>
      )}
    </section>
  );
}

/** The two statistics, in the order of their filters. */
const STATISTICS: readonly IndividualStatistic[] = Object.freeze([
  "missingGenotypes",
  "observedHeterozygosity",
]);

/** The statistics of each individual the store keeps, and the name of
    the variants file, once they are calculated. */
function useStats(): {
  readonly result: ReturnType<typeof resultOf<"individualChecks">>;
  readonly variantsName: string | null;
} {
  const result = useAppState((s) =>
    resultOf(statusOf(s, "individualChecks"), "individualChecks"),
  );
  const variantsName = useAppState((s) => s.project.variants?.name ?? null);
  return { result, variantsName };
}

/** The histogram of `statistic` with `threshold`, from the statistics the
    store keeps, once they are calculated. */
function HistogramOf({
  statistic,
  threshold,
}: {
  readonly statistic: IndividualStatistic;
  readonly threshold: number | null;
}): React.JSX.Element | null {
  const { result, variantsName } = useStats();
  return result === null || variantsName === null ? null : (
    <IndividualHistogram
      statistic={statistic}
      result={result}
      threshold={threshold}
      variantsName={variantsName}
    />
  );
}

/** The table of the individuals, from the statistics the store keeps,
    once they are calculated. */
function TableOf(): React.JSX.Element | null {
  const { result, variantsName } = useStats();
  return result === null || variantsName === null ? null : (
    <IndividualTable result={result} variantsName={variantsName} />
  );
}

/** What one list is drawn with. */
interface IndividualListProps {
  /** Which list it is. */
  readonly kind: ListKind;
  /** Changes whenever the step sets the text itself, after an undo, a
      redo, an opening or a Clear, and the text area is then drawn anew:
      the browser's own undo of the field would otherwise work on the text
      before, and its redo put back what the user did not type. After
      "s000" applied and undone with the button of the header, Cmd+Z and
      then Cmd+Shift+Z in the emptied field gave "s000s000" in the
      Chromium and the WebKit of Playwright 1.63, on 27 September 2026. */
  readonly edition: string;
  /** The text it shows. */
  readonly text: string;
  /** Whether the names of the text are the list applied. */
  readonly applied: boolean;
  /** The reason popnei would refuse the list applied, or `null`. */
  readonly reason: string | null;
  /** Called with the text at each change of it. */
  readonly onType: (text: string) => void;
  /** Called by Apply. */
  readonly onApply: () => void;
  /** Called by Clear. */
  readonly onClear: () => void;
}

/** One list: its text area, the line under it, the line of a list not
    applied, the reason of a list popnei would refuse, and its two
    buttons. */
function IndividualList({
  kind,
  edition,
  text,
  applied,
  reason,
  onType,
  onApply,
  onClear,
}: IndividualListProps): React.JSX.Element {
  const words = LIST_WORDS[kind];
  const notAppliedId = useId();
  const reasonId = useId();
  const described = [
    applied ? null : notAppliedId,
    reason === null ? null : reasonId,
  ].filter((id) => id !== null);
  return (
    <div className={classOf(styles, "list")}>
      <TextArea
        key={edition}
        label={words.label}
        value={text}
        onChange={onType}
        describedBy={described.length === 0 ? null : described.join(" ")}
      />
      <p className={classOf(styles, "filterLine")}>{words.line}</p>
      {!applied && (
        <p id={notAppliedId} className={classOf(styles, "line")}>
          {notAppliedText(kind)}
        </p>
      )}
      {reason !== null && <Problem id={reasonId}>{reason}</Problem>}
      <div className={classOf(styles, "buttons")}>
        <Button label={words.apply} onPress={onApply} />
        <Button label={words.clear} onPress={onClear} />
      </div>
    </div>
  );
}
