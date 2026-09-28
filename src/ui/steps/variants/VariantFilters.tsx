/**
 * The section of the filters of the variants in the Variants step
 * (docs/specs/steps/variants.md, "The filters of the variants"): the four
 * filters in their fixed order, missing data, observed heterozygosity,
 * MAF and LD pruning, each a switch with the line of what popnei filters
 * on under it, and, while it is on, its number fields. Turned off, a
 * filter is kept with its values among the filters off, and turned on
 * again it has them back; the first time, it starts at the values of the
 * table of the filters, the LD pruning with no distance, whose field is
 * then empty with the reason beside it. Each field committed, and each
 * switch, is one command.
 *
 * Beside each filter that is on, once the filters as they are are
 * counted, what it kept of what it was given, which describes its fields;
 * under the four, the part of the Count (FilterCountsPart.tsx).
 *
 * The block of the histograms, each histogram, each count and the part of
 * the Count are drawn inside an error boundary of their own, and each
 * reads its result inside it, so that a defect in drawing one leaves the
 * filters and the rest of the step (react.md, "Errors").
 *
 * While the variants file is not read, the line that the histograms, the
 * counts and the statistics of each individual come once it is stands
 * under the heading, in their place; the filters are drawn in every
 * state, since they belong to the project.
 */
import { useId, useState } from "react";

import {
  filterCountRows,
  variantsOfFile,
} from "../../../core/analyses/filterCounts.ts";
import type { VariantStatistic } from "../../../core/analyses/variantChecks.ts";
import { MAX_LD_DIST, variantFilterNeeds } from "../../../core/project.ts";
import type { Project, ProjectVariantFilter } from "../../../core/project.ts";
import type { VariantFilterKind } from "../../../worker/protocol.ts";
import { resultOf, statusOf } from "../../analyses/status.ts";
import { titleOf } from "../../analyses/titles.ts";
import { classOf } from "../../classOf.ts";
import { useAnnouncer } from "../../shell/announcer.tsx";
import { ErrorBoundary } from "../../shell/ErrorBoundary.tsx";
import { useAppState, useStore } from "../../store.tsx";
import { NumberField } from "../../widgets/NumberField.tsx";
import { Problem } from "../../widgets/Problem.tsx";
import { filterCommand, filterSwitchCommand } from "./commands.ts";
import { Filter } from "./Filter.tsx";
import { FilterCountsPart } from "./FilterCountsPart.tsx";
import { VARIANT_HISTOGRAMS } from "./histogramWords.ts";
import { FocusOnLeave } from "./FocusOnLeave.tsx";
import { VariantChecksBlock } from "./VariantChecksBlock.tsx";
import { VariantHistogram } from "./VariantHistogram.tsx";
import styles from "./VariantsStep.module.css";
import {
  DISTANCE_LABEL,
  FILTERS_HEADING,
  LD_LINE,
  LD_SWITCH,
  MAF_LABEL,
  MAF_LINE,
  MAF_SWITCH,
  MISSING_DATA_LINE,
  MISSING_DATA_SWITCH,
  NOT_READ_LINE,
  OBS_HET_LABEL,
  OBS_HET_LINE,
  OBS_HET_SWITCH,
  R2_LABEL,
  THRESHOLD_LABEL,
  distanceRefusedText,
  keptText,
  r2RefusedText,
  thresholdRefusedText,
  withoutTheStep,
} from "./words.ts";

/** The thresholds of the variants take two decimals, and an arrow key
    moves them by 0.01, as the owner decided for the missing data filter
    on 25 September 2026. */
const THRESHOLD_STEP = 0.01;
const THRESHOLD_DECIMALS = 2;

/** The filter of the kind `kind` among `filters`, or `null` when it is
    off. */
function filterOf<K extends VariantFilterKind>(
  filters: readonly ProjectVariantFilter[],
  kind: K,
): Extract<ProjectVariantFilter, { readonly kind: K }> | null {
  const isKind = (
    filter: ProjectVariantFilter,
  ): filter is Extract<ProjectVariantFilter, { readonly kind: K }> =>
    filter.kind === kind;
  return filters.find(isKind) ?? null;
}

/** The section of the filters of the variants. */
export function VariantFilters(): React.JSX.Element {
  const store = useStore();
  const announcer = useAnnouncer();
  const filters = useAppState((s) => s.project.filters);
  const read = useAppState((s) => s.project.variants?.read.kind === "read");
  // Whether the histograms of the variants are calculated, and the
  // filters as they are counted over a file that holds variants, since
  // for one that holds none the part of the Count shows its warning
  // alone; each histogram and each count reads its result itself, inside
  // its boundary.
  const histogramsDone = useAppState(
    (s) => statusOf(s, "variantChecks").kind === "done",
  );
  const counted = useAppState((s) => {
    const counts = resultOf(statusOf(s, "filterCounts"), "filterCounts");
    return counts !== null && variantsOfFile(counts.passStats) > 0;
  });
  // The numbers typed in the thresholds of the two filters that have a
  // histogram, and not yet committed, which the threshold on each
  // histogram follows; `null` while nothing is typed that the field would
  // take (the spec, "The threshold typed and not yet committed").
  const [typedObsHet, setTypedObsHet] = useState<number | null>(null);
  const [typedMaf, setTypedMaf] = useState<number | null>(null);
  const headingId = useId();
  const checksHeadingId = useId();
  const ldReasonId = useId();

  const set = (filter: ProjectVariantFilter): void => {
    const step = filterCommand(filter);
    store.apply(step.description, step.command);
  };
  const turn = (kind: VariantFilterKind, on: boolean): void => {
    const step = filterSwitchCommand(kind, on);
    store.apply(step.description, step.command);
  };
  const announce = (text: string): void => {
    announcer.announce(text);
  };

  const missingData = filterOf(filters, "missing_data");
  const obsHet = filterOf(filters, "obs_het");
  const maf = filterOf(filters, "maf");
  const ld = filterOf(filters, "ld");
  // The reason of the LD pruning with no distance, beside the empty field
  // of the distance, without the end "in the Variants step".
  const ldReason = useAppState((s) => ldNoDistanceText(s.project));

  /** The histogram of `statistic` beside its filter, with `threshold`,
      once the histograms are calculated. */
  const histogram = (
    statistic: VariantStatistic,
    threshold: number | null,
  ): React.ReactNode =>
    histogramsDone && (
      <ErrorBoundary level={3} heading={VARIANT_HISTOGRAMS[statistic].name}>
        <FocusOnLeave sectionHeadingId={headingId} headingId={checksHeadingId}>
          <HistogramOf statistic={statistic} threshold={threshold} />
        </FocusOnLeave>
      </ErrorBoundary>
    );

  return (
    <section aria-labelledby={headingId} className={classOf(styles, "section")}>
      {/* It takes the focus when a part of a check leaves the page with
          its block, and is not in the order of the Tab key. */}
      <h2 id={headingId} tabIndex={-1} className={classOf(styles, "heading")}>
        {FILTERS_HEADING}
      </h2>
      {read ? (
        <ErrorBoundary level={3} heading={titleOf("variantChecks")}>
          <VariantChecksBlock headingId={checksHeadingId} />
        </ErrorBoundary>
      ) : (
        <p className={classOf(styles, "line")}>{NOT_READ_LINE}</p>
      )}
      <div className={classOf(styles, "filters")}>
        <Filter
          label={MISSING_DATA_SWITCH}
          count={counted ? <KeptCount kind="missing_data" /> : null}
          line={MISSING_DATA_LINE}
          isOn={missingData !== null}
          onSwitch={(on) => {
            turn("missing_data", on);
          }}
        >
          {(described) =>
            missingData !== null && (
              <NumberField
                label={THRESHOLD_LABEL}
                value={missingData.maxAllowedMissingRate}
                minValue={0}
                maxValue={1}
                step={THRESHOLD_STEP}
                decimals={THRESHOLD_DECIMALS}
                {...described}
                refusedText={thresholdRefusedText}
                onRefused={announce}
                onChange={(maxAllowedMissingRate) => {
                  set({ kind: "missing_data", maxAllowedMissingRate });
                }}
              />
            )
          }
        </Filter>
        <Filter
          label={OBS_HET_SWITCH}
          count={counted ? <KeptCount kind="obs_het" /> : null}
          line={OBS_HET_LINE}
          isOn={obsHet !== null}
          onSwitch={(on) => {
            setTypedObsHet(null);
            turn("obs_het", on);
          }}
          after={
            <>
              {histogram(
                "obsHet",
                obsHet === null
                  ? null
                  : (typedObsHet ?? obsHet.maxAllowedObsHet),
              )}
              {histogram("unbiasedExpHet", null)}
            </>
          }
        >
          {(described) =>
            obsHet !== null && (
              <NumberField
                label={OBS_HET_LABEL}
                value={obsHet.maxAllowedObsHet}
                minValue={0}
                maxValue={1}
                step={THRESHOLD_STEP}
                decimals={THRESHOLD_DECIMALS}
                {...described}
                refusedText={thresholdRefusedText}
                onRefused={announce}
                onTyped={setTypedObsHet}
                onChange={(maxAllowedObsHet) => {
                  set({ kind: "obs_het", maxAllowedObsHet });
                }}
              />
            )
          }
        </Filter>
        <Filter
          label={MAF_SWITCH}
          count={counted ? <KeptCount kind="maf" /> : null}
          line={MAF_LINE}
          isOn={maf !== null}
          onSwitch={(on) => {
            setTypedMaf(null);
            turn("maf", on);
          }}
          after={histogram(
            "maf",
            maf === null ? null : (typedMaf ?? maf.maxAllowedMaf),
          )}
        >
          {(described) =>
            maf !== null && (
              <NumberField
                label={MAF_LABEL}
                value={maf.maxAllowedMaf}
                minValue={0}
                maxValue={1}
                step={THRESHOLD_STEP}
                decimals={THRESHOLD_DECIMALS}
                {...described}
                refusedText={thresholdRefusedText}
                onRefused={announce}
                onTyped={setTypedMaf}
                onChange={(maxAllowedMaf) => {
                  set({ kind: "maf", maxAllowedMaf });
                }}
              />
            )
          }
        </Filter>
        <Filter
          label={LD_SWITCH}
          count={counted ? <KeptCount kind="ld" /> : null}
          line={LD_LINE}
          isOn={ld !== null}
          onSwitch={(on) => {
            turn("ld", on);
            // The focus stays on the switch, so the reason that the
            // switch made appear, and the lock it says, are announced.
            const reason = on
              ? ldNoDistanceText(store.getState().project)
              : null;
            if (reason !== null) announce(reason);
          }}
        >
          {(described) =>
            ld !== null && (
              <>
                <div className={classOf(styles, "fields")}>
                  <NumberField
                    label={R2_LABEL}
                    value={ld.maxAllowedR2}
                    minValue={0}
                    maxValue={1}
                    step={THRESHOLD_STEP}
                    decimals={THRESHOLD_DECIMALS}
                    {...described}
                    refusedText={r2RefusedText}
                    onRefused={announce}
                    onChange={(maxAllowedR2) => {
                      set({ ...ld, maxAllowedR2 });
                    }}
                  />
                  <NumberField
                    label={DISTANCE_LABEL}
                    // No distance typed yet: React Aria shows NaN as an
                    // empty field, where undefined would let it keep the
                    // number an Undo took out of the project.
                    value={ld.maxDist ?? Number.NaN}
                    minValue={1}
                    maxValue={MAX_LD_DIST}
                    step={1}
                    // The reason after the line of a number refused, which
                    // the field puts first, and before the count and the
                    // line under the switch.
                    describedBy={[
                      ...(ldReason === null ? [] : [ldReasonId]),
                      ...(described.describedBy === undefined
                        ? []
                        : [described.describedBy]),
                    ].join(" ")}
                    refusedText={distanceRefusedText}
                    onRefused={announce}
                    onChange={(maxDist) => {
                      set({ ...ld, maxDist });
                    }}
                  />
                </div>
                {ldReason !== null && (
                  <Problem id={ldReasonId}>{ldReason}</Problem>
                )}
              </>
            )
          }
        </Filter>
      </div>
      {read && (
        <ErrorBoundary level={3} heading={titleOf("filterCounts")}>
          <FilterCountsPart />
        </ErrorBoundary>
      )}
    </section>
  );
}

/** The reason of the LD pruning with no distance, as the step shows it,
    without its end "in the Variants step", or `null` when the filters of
    `p` give popnei all it needs. */
function ldNoDistanceText(p: Project): string | null {
  const reason = variantFilterNeeds(p);
  return reason === null ? null : withoutTheStep(reason);
}

/** What the filter of the kind `kind` kept of what it was given, "Kept
    1,152 of the 1,200 variants it was given.", once the filters as they
    are are counted. */
function KeptCount({
  kind,
}: {
  readonly kind: VariantFilterKind;
}): string | null {
  // The counts the store keeps, the same object until they change, and
  // the project they are done for, whose filters give the rows their
  // order.
  const counts = useAppState((s) =>
    resultOf(statusOf(s, "filterCounts"), "filterCounts"),
  );
  const project = useAppState((s) => s.project);
  if (counts === null) return null;
  const row = filterCountRows(counts, project).find((r) => r.kind === kind);
  return row === undefined ? null : keptText(row.given, row.kept);
}

/** The histogram of `statistic` with `threshold`, from the histograms the
    store keeps, once they are calculated. */
function HistogramOf({
  statistic,
  threshold,
}: {
  readonly statistic: VariantStatistic;
  readonly threshold: number | null;
}): React.JSX.Element | null {
  const histograms = useAppState((s) =>
    resultOf(statusOf(s, "variantChecks"), "variantChecks"),
  );
  const variantsName = useAppState((s) => s.project.variants?.name ?? null);
  return histograms === null || variantsName === null ? null : (
    <VariantHistogram
      statistic={statistic}
      result={histograms}
      threshold={threshold}
      variantsName={variantsName}
    />
  );
}
