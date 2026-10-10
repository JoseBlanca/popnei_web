/**
 * The options of the PCA tab of popgen2.html, above its Run button in
 * every state (docs/specs/steps/popgen2-pca.md, "The PCA tab" and "Its
 * filters"): the method, a drop-down list; under the heading "Filters of
 * the variants for the PCA", the missing data and the MAF, each a
 * slider from 0, or 0.5 for the MAF, to the Variants tab's value, or 1
 * while that threshold is off, whose upper end is "as in the Variants
 * tab" and which never shows a value looser than the one the PCA uses;
 * and the LD pruning, a switch with its r² and its distance under it
 * while it is on. Every "PCA" is "PCoA" under the PCoA. Each choice, each
 * number committed and each move of a slider is one command, a step of
 * Undo, with this page's description.
 *
 * Under the distance a line says how to choose it. While the LD pruning
 * has no distance, the reason of the lock, in full, stands under that
 * field as a line of what is needed, describes it, and is announced when
 * the switch turned on makes it appear, since the focus is then on the
 * switch; Run beside it says only a short line.
 *
 * While a PCA runs every option waits, with "Stop the PCA to change the
 * filters." as its tooltip and its description (`useFiltersLock`), so
 * that no change leaves the PCA behind.
 *
 * The step of each slider is of the decimals of the Variants tab's box of
 * that threshold, from the axis of its histogram once the one pass has
 * read the file to the end, and before that those of the Variants tab's
 * value; two at least.
 */
import { useId } from "react";

import {
  pcaOptions,
  pruningDistanceReason,
} from "../../../core/analyses/pca.ts";
import { MAX_LD_DIST } from "../../../core/project.ts";
import type { AppState } from "../../../core/store.ts";
import type { JobResult } from "../../../worker/protocol.ts";
import { classOf } from "../../classOf.ts";
import { useAnnouncer } from "../../shell/announcer.tsx";
import {
  DISTANCE_LABEL,
  LD_LINE,
  LD_SWITCH,
  MAF_LINE,
  MISSING_DATA_LINE,
  R2_LABEL,
  distanceRefusedText,
  r2RefusedText,
} from "../../steps/variants/words.ts";
import { useAppState, useStore } from "../../store.tsx";
import { NumberField } from "../../widgets/NumberField.tsx";
import { Select } from "../../widgets/Select.tsx";
import { Slider } from "../../widgets/Slider.tsx";
import { Switch } from "../../widgets/Switch.tsx";
import type { OptionCommand } from "../optionCommand.ts";
import { useFiltersLock } from "../../variants/filtersLock.ts";
import { summaryStatus } from "../../variants/words.ts";
import { followCommand, methodCommand, ownValueCommand } from "./commands.ts";
import type { Popgen2CommandPage } from "./commands.ts";
import styles from "./PcaTabOptions.module.css";
import {
  emptyRangeLine,
  stepDecimalsOf,
  stricterBound,
  stricterEnds,
  stricterLines,
  stricterMoveCommand,
  stricterValueText,
} from "./stricter.ts";
import type { StricterKind } from "./stricter.ts";
import {
  DISTANCE_HINT,
  METHOD_ITEMS,
  METHOD_LABEL,
  filtersHeading,
  popgen2FiltersLine,
  stricterSliderLabel,
} from "./words.ts";

/** The r² takes two decimals, and an arrow key moves it by 0.01, as on
    the old panel. */
const R2_STEP = 0.01;
const R2_DECIMALS = 2;

/** The options of the PCA tab. */
export function PcaTabOptions(): React.JSX.Element {
  const store = useStore();
  const announcer = useAnnouncer();
  // The same object while the options of the project are the same.
  const options = useAppState((s) => pcaOptions(s.project, "popgen2"));
  const ldReason = useAppState((s) =>
    pruningDistanceReason(s.project, "popgen2"),
  );
  const page: Popgen2CommandPage = { page: "popgen2", method: options.method };
  const lock = useFiltersLock();
  const headingId = useId();
  const lineId = useId();
  const ldLineId = useId();
  const ldReasonId = useId();

  const apply = (step: OptionCommand): void => {
    store.apply(step.description, step.command);
  };
  const announce = (text: string): void => {
    announcer.announce(text);
  };

  return (
    <div className={classOf(styles, "options")}>
      <Select
        label={METHOD_LABEL}
        items={METHOD_ITEMS}
        value={options.method}
        waiting={lock}
        onChange={(method) => {
          apply(methodCommand(method, page));
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
          {popgen2FiltersLine(options.method)}
        </p>
        <StricterFilter
          kind="missing_data"
          line={MISSING_DATA_LINE}
          page={page}
          describedBy={lineId}
          lock={lock}
          onCommand={apply}
        />
        <StricterFilter
          kind="maf"
          line={MAF_LINE}
          page={page}
          describedBy={lineId}
          lock={lock}
          onCommand={apply}
        />
        <div className={classOf(styles, "filter")}>
          <Switch
            label={LD_SWITCH}
            isSelected={!options.ld.follow}
            describedBy={lineId}
            waiting={lock}
            onChange={(on) => {
              apply(followCommand("ld", !on, page));
              // The focus stays on the switch, so the reason that turning
              // it on made appear under the field of the distance is
              // announced.
              if (on) {
                const reason = pruningDistanceReason(
                  store.getState().project,
                  "popgen2",
                );
                if (reason !== null) announce(reason);
              }
            }}
          />
          {!options.ld.follow && (
            <div className={classOf(styles, "own")}>
              <div className={classOf(styles, "fields")}>
                <NumberField
                  label={R2_LABEL}
                  value={options.ld.maxAllowedR2}
                  minValue={0}
                  maxValue={1}
                  step={R2_STEP}
                  decimals={R2_DECIMALS}
                  describedBy={ldLineId}
                  waiting={lock}
                  refusedText={r2RefusedText}
                  onRefused={announce}
                  onChange={(maxAllowedR2) => {
                    apply(ownValueCommand({ kind: "ld", maxAllowedR2 }, page));
                  }}
                />
                <NumberField
                  label={DISTANCE_LABEL}
                  // No distance typed yet: React Aria shows NaN as an
                  // empty field, where undefined would let it keep the
                  // number an Undo took out of the project.
                  value={options.ld.maxDist ?? Number.NaN}
                  minValue={1}
                  maxValue={MAX_LD_DIST}
                  step={1}
                  // The reason first, after the line of a number refused,
                  // which the field puts before it.
                  describedBy={[
                    ...(ldReason === null ? [] : [ldReasonId]),
                    ldLineId,
                  ].join(" ")}
                  description={DISTANCE_HINT}
                  waiting={lock}
                  refusedText={distanceRefusedText}
                  onRefused={announce}
                  onChange={(maxDist) => {
                    apply(ownValueCommand({ kind: "ld", maxDist }, page));
                  }}
                />
              </div>
              <p id={ldLineId} className={classOf(styles, "muted")}>
                {LD_LINE}
              </p>
              {/* What is needed, not an error of the user's: a line,
                  with no mark of a problem, and said once, the line
                  beside Run being short. */}
              {ldReason !== null && (
                <p id={ldReasonId} className={classOf(styles, "muted")}>
                  {ldReason}
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/** What a missing data or a MAF filter of the tab is drawn with. */
interface StricterFilterProps {
  /** The filter. */
  readonly kind: StricterKind;
  /** The line of what popnei filters on, under the slider. */
  readonly line: string;
  /** The page of the commands, with the method of the project. */
  readonly page: Popgen2CommandPage;
  /** The id of the line under the heading, which describes the slider
      after its own lines. */
  readonly describedBy: string;
  /** The reason the filter waits, while a PCA runs, or `null`. */
  readonly lock: string | null;
  /** Applies a command of the user. */
  readonly onCommand: (step: OptionCommand) => void;
}

/** A missing data or a MAF filter: its slider, and its lines under it. */
function StricterFilter({
  kind,
  line,
  page,
  describedBy,
  lock,
  onCommand,
}: StricterFilterProps): React.JSX.Element {
  const store = useStore();
  const stepDecimals = useAppState((s) => stepDecimalsIn(s, kind));
  const project = useAppState((s) => s.project);
  const bound = stricterBound(project, kind, stepDecimals);
  const lines = stricterLines(project, kind, page.method);
  const lineId = useId();
  const tabStricterId = useId();
  const label = stricterSliderLabel(kind, page.method);
  const empty = emptyRangeLine(bound, page.method);
  if (empty !== null) {
    // The two ends the same: no slider, whose thumb could not move, and
    // which React Aria cannot draw, since it divides by its range.
    return (
      <div className={classOf(styles, "filter")}>
        <p className={classOf(styles, "name")}>{label}</p>
        <p className={classOf(styles, "line")}>{empty}</p>
        <p className={classOf(styles, "muted")}>{line}</p>
      </div>
    );
  }
  return (
    <div className={classOf(styles, "filter")}>
      <Slider
        label={label}
        minValue={bound.min}
        maxValue={bound.max}
        step={bound.step}
        value={bound.shown}
        valueText={(value) => stricterValueText(bound, value)}
        ends={stricterEnds(bound)}
        describedBy={[
          ...(lines.tabStricter === null ? [] : [tabStricterId]),
          lineId,
          describedBy,
        ].join(" ")}
        waiting={lock}
        onChange={(value) => {
          const step = stricterMoveCommand(
            store.getState().project,
            kind,
            value,
            stepDecimals,
            page,
          );
          if (step !== null) onCommand(step);
        }}
      />
      {lines.tabStricter !== null && (
        <p id={tabStricterId} className={classOf(styles, "line")}>
          {lines.tabStricter}
        </p>
      )}
      <p id={lineId} className={classOf(styles, "muted")}>
        {line}
      </p>
    </div>
  );
}

/** The decimals of the step of the Variants tab's box of the threshold
    `kind`, once the one pass has read the file to the end; `null`
    before. */
function stepDecimalsIn(
  s: AppState<JobResult, unknown>,
  kind: StricterKind,
): number | null {
  const pass = summaryStatus(s);
  const read = s.project.variants?.read;
  if (pass.kind !== "done" || read?.kind !== "read") return null;
  const result: JobResult = pass.result;
  if (result.analysis !== "variantsSummary") {
    throw new Error(
      `popnei_web defect: the summary of the variants file has a result of ${result.analysis}.`,
    );
  }
  return stepDecimalsOf(result, kind, read.ploidy);
}
