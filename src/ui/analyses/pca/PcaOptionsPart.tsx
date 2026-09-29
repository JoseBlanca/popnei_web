/**
 * The options of the principal components, above the Run button in every
 * state (docs/specs/analyses/pca.md, "What it shows", the options): the
 * method, and the three filters of the variants the analysis may have of
 * its own, missing data, MAF and LD, in the order of the Variants step,
 * each two radio buttons, "As in the Variants step" with what the step has
 * on, and "For the PCA alone", which shows under it the number fields of
 * that filter in the Variants step, with their labels, their refusals and
 * the line of what popnei filters on. Each choice and each field committed
 * is one command. While the analysis's own LD filter has no distance, the
 * reason of the lock stands beside the empty field and describes it, and
 * is announced when choosing "For the PCA alone" makes it appear, since
 * the focus is then on the radio button.
 */
import { useId } from "react";

import {
  pcaOptions,
  pruningDistanceReason,
} from "../../../core/analyses/pca.ts";
import { MAX_LD_DIST } from "../../../core/project.ts";
import { classOf } from "../../classOf.ts";
import { useAnnouncer } from "../../shell/announcer.tsx";
import { useAppState, useStore } from "../../store.tsx";
import { NumberField } from "../../widgets/NumberField.tsx";
import { Problem } from "../../widgets/Problem.tsx";
import { RadioGroup } from "../../widgets/RadioGroup.tsx";
import {
  DISTANCE_LABEL,
  LD_LINE,
  LD_SWITCH,
  MAF_LABEL,
  MAF_LINE,
  MAF_SWITCH,
  MISSING_DATA_LINE,
  MISSING_DATA_SWITCH,
  R2_LABEL,
  THRESHOLD_LABEL,
  distanceRefusedText,
  r2RefusedText,
  thresholdRefusedText,
} from "../../steps/variants/words.ts";
import { followCommand, methodCommand, ownValueCommand } from "./commands.ts";
import type { OptionCommand, OwnValue } from "./commands.ts";
import styles from "./PcaOptionsPart.module.css";
import {
  METHOD_ITEMS,
  METHOD_LABEL,
  OWN_LABEL,
  filtersHeading,
  filtersLine,
  followLabel,
} from "./words.ts";
import type { OwnFilterKind } from "./words.ts";

/** The thresholds take two decimals, and an arrow key moves them by
    0.01, as in the Variants step. */
const THRESHOLD_STEP = 0.01;
const THRESHOLD_DECIMALS = 2;

/** The two choices of a filter: following the Variants step, or set for
    the analysis alone. */
type FollowChoice = "follow" | "own";

/** The options of the principal components. */
export function PcaOptionsPart(): React.JSX.Element {
  const store = useStore();
  const announcer = useAnnouncer();
  // The same object while the options of the project are the same.
  const options = useAppState((s) => pcaOptions(s.project));
  const filters = useAppState((s) => s.project.filters);
  const ldReason = useAppState((s) => pruningDistanceReason(s.project));
  const headingId = useId();
  const lineId = useId();
  const ldReasonId = useId();

  const apply = (step: OptionCommand): void => {
    store.apply(step.description, step.command);
  };
  const setValue = (value: OwnValue): void => {
    apply(ownValueCommand(value));
  };
  const announce = (text: string): void => {
    announcer.announce(text);
  };
  const choose = (kind: OwnFilterKind, choice: FollowChoice): void => {
    apply(followCommand(kind, choice === "follow"));
    // The focus stays on the radio button, so the reason that the choice
    // made appear beside the field of the distance is announced.
    if (kind === "ld" && choice === "own") {
      const reason = pruningDistanceReason(store.getState().project);
      if (reason !== null) announce(reason);
    }
  };
  const itemsOf = (
    kind: OwnFilterKind,
  ): readonly { readonly id: FollowChoice; readonly label: string }[] => [
    { id: "follow", label: followLabel(kind, filters) },
    { id: "own", label: OWN_LABEL },
  ];
  const choiceOf = (follow: boolean): FollowChoice =>
    follow ? "follow" : "own";

  return (
    <div className={classOf(styles, "options")}>
      <RadioGroup
        label={METHOD_LABEL}
        items={METHOD_ITEMS}
        value={options.method}
        onChange={(method) => {
          apply(methodCommand(method));
        }}
      />
      <section
        aria-labelledby={headingId}
        className={classOf(styles, "filters")}
      >
        <h3 id={headingId} className={classOf(styles, "heading")}>
          {filtersHeading(options.method)}
        </h3>
        <p id={lineId} className={classOf(styles, "line")}>
          {filtersLine(options.method)}
        </p>
        <OwnFilter
          label={MISSING_DATA_SWITCH}
          items={itemsOf("missing_data")}
          choice={choiceOf(options.missingData.follow)}
          describedBy={lineId}
          line={MISSING_DATA_LINE}
          onChoose={(choice) => {
            choose("missing_data", choice);
          }}
        >
          {(describedBy) => (
            <NumberField
              label={THRESHOLD_LABEL}
              value={options.missingData.maxAllowedMissingRate}
              minValue={0}
              maxValue={1}
              step={THRESHOLD_STEP}
              decimals={THRESHOLD_DECIMALS}
              describedBy={describedBy}
              refusedText={thresholdRefusedText}
              onRefused={announce}
              onChange={(maxAllowedMissingRate) => {
                setValue({ kind: "missing_data", maxAllowedMissingRate });
              }}
            />
          )}
        </OwnFilter>
        <OwnFilter
          label={MAF_SWITCH}
          items={itemsOf("maf")}
          choice={choiceOf(options.maf.follow)}
          describedBy={lineId}
          line={MAF_LINE}
          onChoose={(choice) => {
            choose("maf", choice);
          }}
        >
          {(describedBy) => (
            <NumberField
              label={MAF_LABEL}
              value={options.maf.maxAllowedMaf}
              minValue={0}
              maxValue={1}
              step={THRESHOLD_STEP}
              decimals={THRESHOLD_DECIMALS}
              describedBy={describedBy}
              refusedText={thresholdRefusedText}
              onRefused={announce}
              onChange={(maxAllowedMaf) => {
                setValue({ kind: "maf", maxAllowedMaf });
              }}
            />
          )}
        </OwnFilter>
        <OwnFilter
          label={LD_SWITCH}
          items={itemsOf("ld")}
          choice={choiceOf(options.ld.follow)}
          describedBy={lineId}
          line={LD_LINE}
          onChoose={(choice) => {
            choose("ld", choice);
          }}
          after={
            ldReason !== null && <Problem id={ldReasonId}>{ldReason}</Problem>
          }
        >
          {(describedBy) => (
            <div className={classOf(styles, "fields")}>
              <NumberField
                label={R2_LABEL}
                value={options.ld.maxAllowedR2}
                minValue={0}
                maxValue={1}
                step={THRESHOLD_STEP}
                decimals={THRESHOLD_DECIMALS}
                describedBy={describedBy}
                refusedText={r2RefusedText}
                onRefused={announce}
                onChange={(maxAllowedR2) => {
                  setValue({ kind: "ld", maxAllowedR2 });
                }}
              />
              <NumberField
                label={DISTANCE_LABEL}
                // No distance typed yet: React Aria shows NaN as an empty
                // field, where undefined would let it keep the number an
                // Undo took out of the project.
                value={options.ld.maxDist ?? Number.NaN}
                minValue={1}
                maxValue={MAX_LD_DIST}
                step={1}
                // The reason first, after the line of a number refused,
                // which the field puts before it.
                describedBy={[
                  ...(ldReason === null ? [] : [ldReasonId]),
                  describedBy,
                ].join(" ")}
                refusedText={distanceRefusedText}
                onRefused={announce}
                onChange={(maxDist) => {
                  setValue({ kind: "ld", maxDist });
                }}
              />
            </div>
          )}
        </OwnFilter>
      </section>
    </div>
  );
}

/** What a filter of the analysis's own is drawn with. */
interface OwnFilterProps {
  /** The name of its two radio buttons, the name of its switch in the
      Variants step. */
  readonly label: string;
  /** The two radio buttons. */
  readonly items: readonly {
    readonly id: FollowChoice;
    readonly label: string;
  }[];
  /** The one chosen. */
  readonly choice: FollowChoice;
  /** The id of the line under the heading, which describes the group. */
  readonly describedBy: string;
  /** The line of what popnei filters on, under the fields. */
  readonly line: string;
  /** Called with the choice of the user. */
  readonly onChoose: (choice: FollowChoice) => void;
  /** The fields, while the filter is set for the analysis, given the id
      of the line under them, which describes them. */
  readonly children: (describedBy: string) => React.ReactNode;
  /** What stands after the line while the filter is set: the reason of
      the LD filter with no distance. */
  readonly after?: React.ReactNode;
}

/** A filter of the analysis's own: its two radio buttons, and its fields
    with the line of what popnei filters on while it is set. */
function OwnFilter({
  label,
  items,
  choice,
  describedBy,
  line,
  onChoose,
  children,
  after,
}: OwnFilterProps): React.JSX.Element {
  const ownLineId = useId();
  return (
    <div className={classOf(styles, "filter")}>
      <RadioGroup
        label={label}
        items={items}
        value={choice}
        describedBy={describedBy}
        onChange={onChoose}
      />
      {choice === "own" && (
        <div className={classOf(styles, "own")}>
          {children(ownLineId)}
          <p id={ownLineId} className={classOf(styles, "muted")}>
            {line}
          </p>
          {after}
        </div>
      )}
    </div>
  );
}
