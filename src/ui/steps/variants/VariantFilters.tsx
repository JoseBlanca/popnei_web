/**
 * The section of the filters of the variants in the Variants step
 * (docs/specs/steps/variants.md, "The filters of the variants"): the four
 * filters in their fixed order, missing data, observed heterozygosity,
 * MAF and LD pruning, each a switch with the line of what popnei filters
 * on under it, and, while it is on, its number fields. Turned on, a
 * filter starts at the values of the table of the filters; each field
 * committed, and each switch, is one command.
 *
 * While the variants file is not read, the line that the histograms, the
 * counts and the statistics of each individual come once it is stands
 * under the heading, in their place; the filters are drawn in every
 * state, since they belong to the project.
 */
import { useId } from "react";

import { MAX_LD_DIST } from "../../../core/project.ts";
import type {
  VariantFilter,
  VariantFilterKind,
} from "../../../worker/protocol.ts";
import { classOf } from "../../classOf.ts";
import { useAnnouncer } from "../../shell/announcer.tsx";
import { useAppState, useStore } from "../../store.tsx";
import { NumberField } from "../../widgets/NumberField.tsx";
import { Switch } from "../../widgets/Switch.tsx";
import { filterCommand, filterSwitchCommand } from "./commands.ts";
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

  return (
    <section aria-labelledby={headingId} className={classOf(styles, "section")}>
      <h2 id={headingId} className={classOf(styles, "heading")}>
        {FILTERS_HEADING}
      </h2>
      {!read && <p className={classOf(styles, "line")}>{NOT_READ_LINE}</p>}
      <div className={classOf(styles, "filters")}>
        <Filter
          label={MISSING_DATA_SWITCH}
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
          line={null}
          isOn={obsHet !== null}
          onSwitch={(on) => {
            turn("obs_het", on);
          }}
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
                onChange={(maxAllowedObsHet) => {
                  set({ kind: "obs_het", maxAllowedObsHet });
                }}
              />
            )
          }
        </Filter>
        <Filter
          label={MAF_SWITCH}
          line={MAF_LINE}
          isOn={maf !== null}
          onSwitch={(on) => {
            turn("maf", on);
          }}
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
                onChange={(maxAllowedMaf) => {
                  set({ kind: "maf", maxAllowedMaf });
                }}
              />
            )
          }
        </Filter>
        <Filter
          label={LD_SWITCH}
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
    </section>
  );
}

/** The description a field of a filter is given: the id of the line
    under its switch, or nothing for a filter with no line. */
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
  /** Called when the switch is turned on or off. */
  readonly onSwitch: (on: boolean) => void;
  /** The fields of the filter, given their description; nothing while
      it is off. */
  readonly children: (described: Described) => React.ReactNode;
}

/** One filter of the variants: its switch, the line under it, and its
    fields. */
function Filter({
  label,
  line,
  isOn,
  onSwitch,
  children,
}: FilterProps): React.JSX.Element {
  const lineId = useId();
  const described: Described = line !== null ? { describedBy: lineId } : {};
  return (
    <div className={classOf(styles, "filter")}>
      <Switch
        label={label}
        isSelected={isOn}
        {...described}
        onChange={onSwitch}
      />
      {line !== null && (
        <p id={lineId} className={classOf(styles, "filterLine")}>
          {line}
        </p>
      )}
      {children(described)}
    </div>
  );
}
