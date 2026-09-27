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
 * statistics of each individual (IndividualChecksBlock.tsx); then the two
 * thresholds, each a switch and a field of four decimals, drawn in every
 * state as the lists are, with the histogram of its statistic after it
 * once the statistics are calculated, its threshold marked while the
 * filter is on and following the number typed; then the table of the
 * individuals with its download. Beside each filter that is set, what it
 * kept, from the individuals kept the store gives, or that it is known
 * once the statistics are calculated; under them all, the individuals
 * that pass, or the reason that none does, which describes the field of
 * each threshold and is announced when a command of the section makes it
 * appear (individualThresholds.ts). The block, each histogram and the
 * table are drawn inside an error boundary of their own, and each reads
 * its result inside it, so that a defect in drawing one leaves the lists
 * and the rest of the step (react.md, "Errors").
 */
import { memo, useId, useMemo, useState } from "react";

import type { IndividualStatistic } from "../../../core/analyses/individualChecks.ts";
import { individualListNeeds } from "../../../core/project.ts";
import { resultOf, statusOf } from "../../analyses/status.ts";
import { titleOf } from "../../analyses/titles.ts";
import { ErrorBoundary } from "../../shell/ErrorBoundary.tsx";
import { classOf } from "../../classOf.ts";
import { useAnnouncer } from "../../shell/announcer.tsx";
import { useAppState, useStore } from "../../store.tsx";
import { Button } from "../../widgets/Button.tsx";
import { NumberField } from "../../widgets/NumberField.tsx";
import { Problem } from "../../widgets/Problem.tsx";
import { TextArea } from "../../widgets/TextArea.tsx";
import type { StepCommand } from "./commands.ts";
import { Filter } from "./Filter.tsx";
import { IndividualChecksBlock } from "./IndividualChecksBlock.tsx";
import { IndividualHistogram } from "./IndividualHistogram.tsx";
import { FocusOnLeave } from "./FocusOnLeave.tsx";
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
import { INDIVIDUAL_HISTOGRAMS, STATS_TABLE_NAME } from "./individualStats.ts";
import {
  INDIVIDUAL_THRESHOLD_DECIMALS,
  INDIVIDUAL_THRESHOLD_STEP,
  THRESHOLD_KINDS,
  THRESHOLD_WORDS,
  keptAnnouncement,
  individualCountText,
  individualThresholdText,
  keptTotal,
  thresholdCommand,
  thresholdOf,
  thresholdSwitchCommand,
} from "./individualThresholds.ts";
import type { ThresholdKind } from "./individualThresholds.ts";
import styles from "./VariantsStep.module.css";
import { thresholdRefusedText } from "./words.ts";

/** The texts typed in the two lists, `null` where nothing was typed. */
type TypedLists = Readonly<Record<ListKind, TypedList | null>>;

const NOTHING_TYPED: TypedLists = { keep: null, remove: null };

/** The Clears of each list so far. */
type Clears = Readonly<Record<ListKind, number>>;

const NO_CLEAR: Clears = { keep: 0, remove: 0 };

/** The numbers typed in the two thresholds and not yet committed, which
    the threshold on each histogram follows; `null` while nothing is typed
    that the field would take (the spec, "The threshold typed and not yet
    committed"). */
type TypedThresholds = Readonly<Record<ThresholdKind, number | null>>;

const NO_THRESHOLD_TYPED: TypedThresholds = {
  missing_data: null,
  obs_het: null,
};

/** The section of the filters of the individuals. */
export function IndividualFilters(): React.JSX.Element {
  const store = useStore();
  const announcer = useAnnouncer();
  const project = useAppState((s) => s.project);
  const kept = useAppState((s) => s.individualsKept);
  const moves = useAppState((s) => s.historyMoves);
  const [typed, setTyped] = useState<TypedLists>(NOTHING_TYPED);
  const [clears, setClears] = useState<Clears>(NO_CLEAR);
  const [typedThresholds, setTypedThresholds] =
    useState<TypedThresholds>(NO_THRESHOLD_TYPED);
  const headingId = useId();
  const keptNoneId = useId();
  const statsHeadingId = useId();
  const needs = useMemo(() => individualListNeeds(project), [project]);
  const total = keptTotal(project, kept);
  const read = project.variants?.read.kind === "read";
  const statsDone = useAppState(
    (s) => statusOf(s, "individualChecks").kind === "done",
  );
  const statsFailed = useAppState(
    (s) => statusOf(s, "individualChecks").kind === "error",
  );

  /** Sends a command of the section, and announces the reason of a list
      that it makes appear, or else what the filters now keep, since the
      focus stays on the control that sent it. */
  const send = (step: StepCommand): void => {
    const state = store.getState();
    const before = individualListNeeds(state.project);
    const totalBefore = keptTotal(state.project, state.individualsKept);
    store.apply(step.description, step.command);
    const after = store.getState();
    const reason = appearedReason(before, individualListNeeds(after.project));
    if (reason !== null) {
      announcer.announce(reason);
      return;
    }
    const kept = keptAnnouncement(
      totalBefore,
      keptTotal(after.project, after.individualsKept),
    );
    // Only the latest of what the filters keep is said, when a
    // threshold is stepped several times within the pause of the region.
    if (kept !== null) {
      announcer.announce(kept, { replaces: "individualsKept" });
    }
  };
  const type = (kind: ListKind, text: string): void => {
    setTyped((before) => ({ ...before, [kind]: { text, moves } }));
  };
  const typeThreshold = (kind: ThresholdKind, value: number | null): void => {
    setTypedThresholds((before) =>
      before[kind] === value ? before : { ...before, [kind]: value },
    );
  };

  return (
    <section aria-labelledby={headingId} className={classOf(styles, "section")}>
      {/* It takes the focus when a part of a check leaves the page with
          its block, and is not in the order of the Tab key. */}
      <h2 id={headingId} tabIndex={-1} className={classOf(styles, "heading")}>
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
              count={individualCountText(kept, kind, statsFailed)}
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
          <IndividualChecksBlock headingId={statsHeadingId} />
        </ErrorBoundary>
      )}
      <div className={classOf(styles, "filters")}>
        {THRESHOLD_KINDS.map((kind) => {
          const words = THRESHOLD_WORDS[kind];
          const value = thresholdOf(project.individualFilters, kind);
          // The plot follows the number typed, while it is typed.
          const shown =
            value === null ? null : (typedThresholds[kind] ?? value);
          return (
            <Filter
              key={kind}
              label={words.switchLabel}
              line={words.line}
              isOn={value !== null}
              count={individualCountText(kept, kind, statsFailed)}
              describedAlso={total.kind === "keptNone" ? keptNoneId : null}
              onSwitch={(on) => {
                typeThreshold(kind, null);
                send(thresholdSwitchCommand(kind, on));
              }}
              after={
                read &&
                statsDone && (
                  <ErrorBoundary
                    level={3}
                    heading={INDIVIDUAL_HISTOGRAMS[words.statistic].title}
                  >
                    <FocusOnLeave
                      sectionHeadingId={headingId}
                      headingId={statsHeadingId}
                    >
                      <HistogramOf
                        statistic={words.statistic}
                        threshold={shown}
                        thresholdLine={
                          shown === null
                            ? null
                            : individualThresholdText(kind, shown)
                        }
                      />
                    </FocusOnLeave>
                  </ErrorBoundary>
                )
              }
            >
              {(described) =>
                value !== null && (
                  <NumberField
                    label={words.label}
                    value={value}
                    minValue={0}
                    maxValue={1}
                    step={INDIVIDUAL_THRESHOLD_STEP}
                    decimals={INDIVIDUAL_THRESHOLD_DECIMALS}
                    {...described}
                    refusedText={thresholdRefusedText}
                    onRefused={(text) => {
                      announcer.announce(text);
                    }}
                    onTyped={(number) => {
                      typeThreshold(kind, number);
                    }}
                    onChange={(committed) => {
                      send(thresholdCommand(kind, committed));
                    }}
                  />
                )
              }
            </Filter>
          );
        })}
      </div>
      {read && statsDone && (
        <ErrorBoundary level={3} heading={STATS_TABLE_NAME}>
          <FocusOnLeave sectionHeadingId={headingId} headingId={statsHeadingId}>
            <TableOf />
          </FocusOnLeave>
        </ErrorBoundary>
      )}
      {total.kind === "passed" && (
        <p className={classOf(styles, "count")}>{total.text}</p>
      )}
      {total.kind === "keptNone" && (
        <Problem id={keptNoneId}>{total.text}</Problem>
      )}
    </section>
  );
}

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
  thresholdLine,
}: {
  readonly statistic: IndividualStatistic;
  readonly threshold: number | null;
  readonly thresholdLine: string | null;
}): React.JSX.Element | null {
  const { result, variantsName } = useStats();
  return result === null || variantsName === null ? null : (
    <IndividualHistogram
      statistic={statistic}
      result={result}
      threshold={threshold}
      thresholdLine={thresholdLine}
      variantsName={variantsName}
    />
  );
}

/** The table of the individuals, from the statistics the store keeps,
    once they are calculated. It takes no props and reads the store
    itself, and `memo` keeps it from being drawn again with the section,
    at each key typed in a list or a threshold, whose text is the
    section's state: with 10,000 individuals each key drew the table
    again, 20 to 35 ms more a key in Chromium 153 and WebKit 26.6, on 27
    September 2026. */
const TableOf = memo(function TableOf(): React.JSX.Element | null {
  const { result, variantsName } = useStats();
  return result === null || variantsName === null ? null : (
    <IndividualTable result={result} variantsName={variantsName} />
  );
});

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
  /** What the list applied kept, or `null` while it has no count. */
  readonly count: string | null;
  /** Called with the text at each change of it. */
  readonly onType: (text: string) => void;
  /** Called by Apply. */
  readonly onApply: () => void;
  /** Called by Clear. */
  readonly onClear: () => void;
}

/** One list: its text area, the line under it, the line of a list not
    applied, the reason of a list popnei would refuse, its two buttons,
    and what it kept. */
function IndividualList({
  kind,
  edition,
  text,
  applied,
  reason,
  count,
  onType,
  onApply,
  onClear,
}: IndividualListProps): React.JSX.Element {
  const words = LIST_WORDS[kind];
  const notAppliedId = useId();
  const reasonId = useId();
  const countId = useId();
  // The line of not applied, then the reason of the list, then its count
  // (the spec, "Accessibility").
  const described = [
    applied ? null : notAppliedId,
    reason === null ? null : reasonId,
    count === null ? null : countId,
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
      {count !== null && (
        <p id={countId} className={classOf(styles, "count")}>
          {count}
        </p>
      )}
    </div>
  );
}
