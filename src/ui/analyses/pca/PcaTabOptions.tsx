/**
 * The options of the PCA tab of popgen2.html, above its Run button in
 * every state (docs/specs/steps/popgen2-pca.md, "The PCA tab" and "Its
 * filters"): the method; under the heading "Filters of the variants for
 * the PCA", the missing data and the MAF, each two radio buttons, "As in
 * the Variants tab: 0.1" and "Stricter for the PCA", the second with its
 * field under it, whose upper end is the Variants tab's value, or 1
 * while that threshold is off, and which never shows a value looser
 * than the one the PCA uses; and the LD pruning, a switch with its r²
 * and its distance under it while it is on. Every "PCA" is "PCoA" under
 * the PCoA. Each choice and each number committed is one command, a step
 * of Undo, with this page's description.
 *
 * Choosing "Stricter for the PCA" sends one command, `stricterCommand`,
 * at the upper end of the field, so that the choice alone changes no
 * variant the PCA reads; a number typed over the one the field shows is
 * sent though it is the same, so that the PCA keeps it as its own when
 * the Variants tab is loosened. While the LD pruning has no distance, the
 * reason of the lock stands under that field and describes it, and is
 * announced when the switch turned on makes it appear, since the focus
 * is then on the switch.
 *
 * The decimals of each field are those of the Variants tab's box of that
 * threshold, from the axis of its histogram once the one pass has read
 * the file to the end, and before that those of the Variants tab's
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
  MAF_SWITCH,
  MISSING_DATA_LINE,
  MISSING_DATA_SWITCH,
  R2_LABEL,
  distanceRefusedText,
  r2RefusedText,
} from "../../steps/variants/words.ts";
import { useAppState, useStore } from "../../store.tsx";
import { NumberField } from "../../widgets/NumberField.tsx";
import { Problem } from "../../widgets/Problem.tsx";
import { RadioGroup } from "../../widgets/RadioGroup.tsx";
import { Switch } from "../../widgets/Switch.tsx";
import type { OptionCommand } from "../optionCommand.ts";
import { summaryStatus } from "../../variants/words.ts";
import {
  followCommand,
  methodCommand,
  ownValueCommand,
  stricterCommand,
} from "./commands.ts";
import type { Popgen2CommandPage } from "./commands.ts";
import styles from "./PcaTabOptions.module.css";
import { stepDecimalsOf, stricterBound, stricterLines } from "./stricter.ts";
import type { StricterKind } from "./stricter.ts";
import {
  METHOD_ITEMS,
  METHOD_LABEL,
  filtersHeading,
  popgen2FiltersLine,
  stricterFieldLabel,
  stricterLabel,
  tabFollowLabel,
} from "./words.ts";

/** The r² takes two decimals, and an arrow key moves it by 0.01, as on
    the old panel. */
const R2_STEP = 0.01;
const R2_DECIMALS = 2;

/** The two choices of a missing data or a MAF filter. */
type StricterChoice = "follow" | "stricter";

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
      <RadioGroup
        label={METHOD_LABEL}
        items={METHOD_ITEMS}
        value={options.method}
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
          label={MISSING_DATA_SWITCH}
          line={MISSING_DATA_LINE}
          stricter={!options.missingData.follow}
          page={page}
          describedBy={lineId}
          onCommand={apply}
          onRefused={announce}
        />
        <StricterFilter
          kind="maf"
          label={MAF_SWITCH}
          line={MAF_LINE}
          stricter={!options.maf.follow}
          page={page}
          describedBy={lineId}
          onCommand={apply}
          onRefused={announce}
        />
        <div className={classOf(styles, "filter")}>
          <Switch
            label={LD_SWITCH}
            isSelected={!options.ld.follow}
            describedBy={lineId}
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
              {ldReason !== null && (
                <Problem id={ldReasonId}>{ldReason}</Problem>
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
  /** The name of its two radio buttons, as on the old panel. */
  readonly label: string;
  /** The line of what popnei filters on, under the field. */
  readonly line: string;
  /** Whether it is made stricter for the PCA, `follow` false. */
  readonly stricter: boolean;
  /** The page of the commands, with the method of the project. */
  readonly page: Popgen2CommandPage;
  /** The id of the line under the heading, which describes the group. */
  readonly describedBy: string;
  /** Applies a command of the user. */
  readonly onCommand: (step: OptionCommand) => void;
  /** Announces the line of a number refused. */
  readonly onRefused: (text: string) => void;
}

/** A missing data or a MAF filter: its two radio buttons, and its field
    with its lines while it is made stricter. */
function StricterFilter({
  kind,
  label,
  line,
  stricter,
  page,
  describedBy,
  onCommand,
  onRefused,
}: StricterFilterProps): React.JSX.Element {
  const filters = useAppState((s) => s.project.filters);
  const stepDecimals = useAppState((s) => stepDecimalsIn(s, kind));
  const project = useAppState((s) => s.project);
  const bound = stricterBound(project, kind, stepDecimals);
  const lines = stricterLines(project, kind, page.method);
  const lineId = useId();
  const tabStricterId = useId();
  const items: readonly {
    readonly id: StricterChoice;
    readonly label: string;
  }[] = [
    { id: "follow", label: tabFollowLabel(kind, filters) },
    { id: "stricter", label: stricterLabel(page.method) },
  ];
  const send = (value: number): void => {
    onCommand(
      ownValueCommand(
        kind === "missing_data"
          ? { kind, maxAllowedMissingRate: value }
          : { kind, maxAllowedMaf: value },
        page,
      ),
    );
  };
  return (
    <div className={classOf(styles, "filter")}>
      <RadioGroup
        label={label}
        items={items}
        value={stricter ? "stricter" : "follow"}
        describedBy={describedBy}
        onChange={(choice) => {
          onCommand(
            choice === "follow"
              ? followCommand(kind, true, page)
              : stricterCommand(kind, bound.max, page),
          );
        }}
      />
      {stricter && (
        <div className={classOf(styles, "own")}>
          <NumberField
            label={stricterFieldLabel(kind, bound.max)}
            value={bound.shown}
            minValue={0}
            maxValue={bound.max}
            step={Number(`1e-${String(bound.decimals)}`)}
            decimals={bound.decimals}
            describedBy={[
              ...(lines.tabStricter === null ? [] : [tabStricterId]),
              lineId,
            ].join(" ")}
            refusedText={lines.refusedText}
            onRefused={onRefused}
            onChange={send}
            // The value the field shows typed again: the Variants tab's,
            // stricter than the PCA's own, is then kept as the PCA's own.
            onSameCommitted={send}
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
      )}
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
