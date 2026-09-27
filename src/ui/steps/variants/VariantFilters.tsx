/**
 * The section of the filters of the variants in the Variants step
 * (docs/specs/steps/variants.md, "The filters of the variants"): the four
 * filters in their fixed order, missing data, observed heterozygosity,
 * MAF and LD pruning, each a switch with the line of what popnei filters
 * on under it, and, while it is on, its number fields. Turned on, a
 * filter starts at the values of the table of the filters; each field
 * committed, and each switch, is one command.
 *
 * Beside each filter that is on, once the filters as they are are
 * counted, what it kept of what it was given, which describes its fields;
 * under the four, the part of the Count (FilterCountsPart.tsx).
 *
 * While the variants file is not read, the line that the histograms, the
 * counts and the statistics of each individual come once it is stands
 * under the heading, in their place; the filters are drawn in every
 * state, since they belong to the project.
 */
import { useId, useState } from "react";

import { filterCountRows } from "../../../core/analyses/filterCounts.ts";
import type { FilterCountRow } from "../../../core/analyses/filterCounts.ts";
import { MAX_LD_DIST } from "../../../core/project.ts";
import type {
  VariantFilter,
  VariantFilterKind,
} from "../../../worker/protocol.ts";
import { statusOf } from "../../analyses/status.ts";
import { classOf } from "../../classOf.ts";
import { useAnnouncer } from "../../shell/announcer.tsx";
import { useAppState, useStore } from "../../store.tsx";
import { NumberField } from "../../widgets/NumberField.tsx";
import { Switch } from "../../widgets/Switch.tsx";
import { filterCommand, filterSwitchCommand } from "./commands.ts";
import { FilterCountsPart } from "./FilterCountsPart.tsx";
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
  OBS_HET_SWITCH,
  R2_LABEL,
  THRESHOLD_LABEL,
  distanceRefusedText,
  keptText,
  r2RefusedText,
  thresholdRefusedText,
} from "./words.ts";

/** The thresholds of the variants take two decimals, and an arrow key
    moves them by 0.01, as the owner decided for the missing data filter
    on 25 September 2026. */
const THRESHOLD_STEP = 0.01;
const THRESHOLD_DECIMALS = 2;

/** The filter of the kind `kind` among `filters`, or `null` when it is
    off. */
function filterOf<K extends VariantFilterKind>(
  filters: readonly VariantFilter[],
  kind: K,
): Extract<VariantFilter, { readonly kind: K }> | null {
  const isKind = (
    filter: VariantFilter,
  ): filter is Extract<VariantFilter, { readonly kind: K }> =>
    filter.kind === kind;
  return filters.find(isKind) ?? null;
}

/** The section of the filters of the variants. */
export function VariantFilters(): React.JSX.Element {
  const store = useStore();
  const announcer = useAnnouncer();
  const filters = useAppState((s) => s.project.filters);
  const read = useAppState((s) => s.project.variants?.read.kind === "read");
  const variantsName = useAppState((s) => s.project.variants?.name ?? null);
  // The histograms of the variants, once calculated: the result the store
  // keeps, the same object until it changes.
  const histograms = useAppState((s) => {
    const status = statusOf(s, "variantChecks");
    return status.kind === "done" && status.result.analysis === "variantChecks"
      ? status.result
      : null;
  });
  // The numbers typed in the thresholds of the two filters that have a
  // histogram, and not yet committed, which the threshold on each
  // histogram follows; `null` while nothing is typed that the field would
  // take (the spec, "The threshold typed and not yet committed").
  const [typedObsHet, setTypedObsHet] = useState<number | null>(null);
  const [typedMaf, setTypedMaf] = useState<number | null>(null);
  // The counts of the filters as they are, once counted: the result the
  // store keeps, the same object until it changes, and the project it is
  // done for, whose filters give the rows their order.
  const counts = useAppState((s) => {
    const status = statusOf(s, "filterCounts");
    return status.kind === "done" && status.result.analysis === "filterCounts"
      ? status.result
      : null;
  });
  const project = useAppState((s) => s.project);
  const rows = counts === null ? [] : filterCountRows(counts, project);
  const countOf = (kind: VariantFilterKind): string | null => {
    const row: FilterCountRow | undefined = rows.find((r) => r.kind === kind);
    return row === undefined ? null : keptText(row.given, row.kept);
  };
  const headingId = useId();

  const set = (filter: VariantFilter): void => {
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

  /** The histogram of `statistic` beside its filter, with `threshold`,
      once the histograms are calculated. */
  const histogram = (
    statistic: "maf" | "obsHet" | "unbiasedExpHet",
    threshold: number | null,
  ): React.ReactNode =>
    histograms !== null &&
    variantsName !== null && (
      <VariantHistogram
        statistic={statistic}
        result={histograms}
        threshold={threshold}
        variantsName={variantsName}
      />
    );

  return (
    <section aria-labelledby={headingId} className={classOf(styles, "section")}>
      <h2 id={headingId} className={classOf(styles, "heading")}>
        {FILTERS_HEADING}
      </h2>
      {read ? (
        <VariantChecksBlock />
      ) : (
        <p className={classOf(styles, "line")}>{NOT_READ_LINE}</p>
      )}
      <div className={classOf(styles, "filters")}>
        <Filter
          label={MISSING_DATA_SWITCH}
          count={countOf("missing_data")}
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
          count={countOf("obs_het")}
          line={null}
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
          count={countOf("maf")}
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
          count={countOf("ld")}
          line={LD_LINE}
          isOn={ld !== null}
          onSwitch={(on) => {
            turn("ld", on);
          }}
        >
          {(described) =>
            ld !== null && (
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
                  value={ld.maxDist}
                  minValue={1}
                  maxValue={MAX_LD_DIST}
                  step={1}
                  {...described}
                  refusedText={distanceRefusedText}
                  onRefused={announce}
                  onChange={(maxDist) => {
                    set({ ...ld, maxDist });
                  }}
                />
              </div>
            )
          }
        </Filter>
      </div>
      {read && <FilterCountsPart />}
    </section>
  );
}

/** The description a field of a filter is given: the ids of the count
    of its filter and of the line under its switch, in that order, or
    nothing for a filter with neither. */
interface Described {
  readonly describedBy?: string;
}

/** What one filter of the variants is drawn with. */
interface FilterProps {
  /** The words of its switch. */
  readonly label: string;
  /** The line under the switch, which describes the switch and the
      fields; `null` for the filter by observed heterozygosity, which has
      none. */
  readonly line: string | null;
  /** Whether the filter is on. */
  readonly isOn: boolean;
  /** What it kept of what it was given, "Kept 1,152 of the 1,200
      variants it was given.", or `null` while the filters as they are
      are not counted. */
  readonly count: string | null;
  /** Called when the switch is turned on or off. */
  readonly onSwitch: (on: boolean) => void;
  /** The fields of the filter, given their description; nothing while
      it is off. */
  readonly children: (described: Described) => React.ReactNode;
  /** What comes after the fields, whether the filter is on or off: the
      histograms of the number it keeps a variant by; nothing when
      absent. */
  readonly after?: React.ReactNode;
}

/** One filter of the variants: its switch, the line under it, its
    fields, and what it kept. */
function Filter({
  label,
  line,
  isOn,
  count,
  onSwitch,
  children,
  after,
}: FilterProps): React.JSX.Element {
  const lineId = useId();
  const countId = useId();
  // The switch is described by the line alone, and a field by the count
  // first, so that a user who moves to it hears what it kept before the
  // advice.
  const switchDescribed: Described =
    line !== null ? { describedBy: lineId } : {};
  const shownCount = isOn ? count : null;
  const ids = [
    ...(shownCount !== null ? [countId] : []),
    ...(line !== null ? [lineId] : []),
  ];
  const described: Described =
    ids.length > 0 ? { describedBy: ids.join(" ") } : {};
  return (
    <div className={classOf(styles, "filter")}>
      <Switch
        label={label}
        isSelected={isOn}
        {...switchDescribed}
        onChange={onSwitch}
      />
      {line !== null && (
        <p id={lineId} className={classOf(styles, "filterLine")}>
          {line}
        </p>
      )}
      {children(described)}
      {shownCount !== null && (
        <p id={countId} className={classOf(styles, "count")}>
          {shownCount}
        </p>
      )}
      {after}
    </div>
  );
}
