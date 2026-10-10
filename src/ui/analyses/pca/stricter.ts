/**
 * The sliders of the PCA's own missing data and MAF on the PCA tab of
 * popgen2.html (docs/specs/steps/popgen2-pca.md, "Its filters"): their
 * ends, from 0, or 0.5 for the MAF, to the Variants tab's value or 1
 * while it has that threshold off; their step, of the decimals of the
 * Variants tab's box of that threshold; the value shown, the upper end
 * while the PCA follows the Variants tab and never looser than the one
 * the PCA uses; the words of that value; the command of a move; and the
 * line under a slider while the Variants tab is stricter than the value
 * set there. Pure, so that a test in node checks them.
 */

import { pcaOptions } from "../../../core/analyses/pca.ts";
import { THRESHOLD_OFF_AT } from "../../../core/project.ts";
import type { Project } from "../../../core/project.ts";
import {
  VARIANT_THRESHOLD_DECIMALS,
  variantThresholdStep,
} from "../../../core/thresholds.ts";
import type {
  PcaMethod,
  VariantsSummaryResult,
} from "../../../worker/protocol.ts";
import { numberText } from "../../widgets/committedNumber.ts";
import type { OptionCommand } from "../optionCommand.ts";
import { followCommand, ownValueCommand, stricterCommand } from "./commands.ts";
import type { Popgen2CommandPage } from "./commands.ts";
import { methodName } from "./words.ts";

/** The two filters the PCA can make stricter than the Variants tab's. */
export type StricterKind = "missing_data" | "maf";

/** The fewest decimals a slider moves by, a step of 0.01 at the most. */
const LEAST_DECIMALS = 2;

/** The lower end of the slider of the MAF: the major allele frequency of
    a variant of two alleles is never below it. */
const MAF_SLIDER_MIN = 0.5;

/** The slider of a filter of the PCA's own. */
export interface StricterBound {
  /** The Variants tab's value of that threshold, or `null` while it is
      off. */
  readonly tab: number | null;
  /** The lower end: 0 for the missing data; for the MAF 0.5, or the
      upper end when that is lower, as a variant of more than two alleles
      allows. */
  readonly min: number;
  /** The upper end: the Variants tab's value, or 1 while it has that
      threshold off. At it, the PCA follows the Variants tab. */
  readonly max: number;
  /** The decimals of a value: those of the step of the Variants tab's
      box of that threshold, three at most as its box, those of the
      Variants tab's value, and two at least. */
  readonly decimals: number;
  /** What a key moves it by: 10 to the minus `decimals`. */
  readonly step: number;
  /** The value it shows: the upper end while the PCA follows the
      Variants tab; otherwise the PCA's own value, or the Variants tab's
      when that is stricter, which the PCA then uses. */
  readonly shown: number;
}

/**
 * The slider of the filter `kind` of the PCA in `p`, with `stepDecimals`,
 * the decimals of the step of the Variants tab's box of that threshold,
 * which the axis of its histogram gives (`thresholdStep` of
 * src/core/thresholds.ts), or `null` before the one pass has drawn the
 * histogram.
 */
export function stricterBound(
  p: Project,
  kind: StricterKind,
  stepDecimals: number | null,
): StricterBound {
  const tab = tabValue(p, kind);
  const { follow, value: own } = ownOf(p, kind);
  const max = tab ?? THRESHOLD_OFF_AT;
  const min = kind === "maf" ? Math.min(MAF_SLIDER_MIN, max) : 0;
  const decimals = Math.max(
    LEAST_DECIMALS,
    stepDecimals === null
      ? 0
      : Math.min(stepDecimals, VARIANT_THRESHOLD_DECIMALS),
    tab === null ? 0 : decimalsOf(tab),
  );
  return {
    tab,
    min,
    max,
    decimals,
    step: Number(`1e-${String(decimals)}`),
    shown: follow ? max : Math.min(own, max),
  };
}

/**
 * The words of the value `value` of the slider `bound`, shown beside its
 * name and read by a screen reader: at the upper end, "0.1, as in the
 * Variants tab", or "Off, as in the Variants tab" while the Variants tab
 * has that threshold off; below it, the value rounded to the slider's
 * decimals, "0.05".
 */
export function stricterValueText(bound: StricterBound, value: number): string {
  if (value >= bound.max) {
    return bound.tab === null
      ? `Off, ${AS_IN_THE_TAB}`
      : `${numberText(bound.tab)}, ${AS_IN_THE_TAB}`;
  }
  return numberText(rounded(value, bound.decimals));
}

/** The words of a slider at its upper end, after its value. */
const AS_IN_THE_TAB = "as in the Variants tab";

/**
 * The command of a move of the slider of the filter `kind` of the PCA in
 * `p` to `value`, with `stepDecimals` as `stricterBound` takes it, on the
 * page `page`: at the upper end, the filter set back to as in the
 * Variants tab, `follow` true, which stays so whatever the Variants tab
 * becomes; below it, from the upper end, `stricterCommand`, `follow`
 * false and the value in one step; from a value of the PCA's own, the
 * value alone. The value is rounded to the slider's decimals. A command
 * that changes nothing gives the project it was given.
 */
export function stricterMoveCommand(
  p: Project,
  kind: StricterKind,
  value: number,
  stepDecimals: number | null,
  page: Popgen2CommandPage,
): OptionCommand {
  const bound = stricterBound(p, kind, stepDecimals);
  if (value >= bound.max) return followCommand(kind, true, page);
  const given = rounded(value, bound.decimals);
  if (ownOf(p, kind).follow) return stricterCommand(kind, given, page);
  return ownValueCommand(
    kind === "missing_data"
      ? { kind, maxAllowedMissingRate: given }
      : { kind, maxAllowedMaf: given },
    page,
  );
}

/** `value` rounded to `decimals` decimals, as a number a program reads
    back the same: 0.073 for 0.07300000000000001. */
function rounded(value: number, decimals: number): number {
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
}

/** The lines under a slider of the PCA's own. */
export interface StricterLines {
  /** The line of the Variants tab stricter than the PCA's own value,
      which the PCA then uses; `null` otherwise. */
  readonly tabStricter: string | null;
}

/**
 * The lines under the slider of the filter `kind` of the PCA in `p`, the
 * method `method` naming the PCA or the PCoA: while the Variants tab is
 * stricter than the PCA's own value, "The Variants tab keeps at most
 * 0.03, stricter than the 0.05 set here, so the PCA uses 0.03.".
 */
export function stricterLines(
  p: Project,
  kind: StricterKind,
  method: PcaMethod,
): StricterLines {
  const tab = tabValue(p, kind);
  const { follow, value: own } = ownOf(p, kind);
  const name = methodName(method);
  const tabStricter =
    !follow && tab !== null && tab < own
      ? `The Variants tab keeps at most ${numberText(tab)}, stricter than the ${numberText(own)} set here, so the ${name} uses ${numberText(tab)}.`
      : null;
  return { tabStricter };
}

/** The Variants tab's value of the threshold `kind` in `p`, `null` while
    it is off. */
function tabValue(p: Project, kind: StricterKind): number | null {
  const filter = p.filters.find((one) => one.kind === kind);
  switch (filter?.kind) {
    case "missing_data":
      return filter.maxAllowedMissingRate;
    case "maf":
      return filter.maxAllowedMaf;
    case undefined:
      return null;
    case "passed":
    case "obs_het":
    case "ld":
      throw new Error(
        `popnei_web defect: the filter of the kind ${kind} was found as ${filter.kind}.`,
      );
  }
}

/** Whether the PCA follows the Variants tab in the filter `kind` in `p`,
    and its own value, kept in the project whether it follows or not. */
function ownOf(
  p: Project,
  kind: StricterKind,
): { readonly follow: boolean; readonly value: number } {
  const o = pcaOptions(p, "popgen2");
  return kind === "missing_data"
    ? {
        follow: o.missingData.follow,
        value: o.missingData.maxAllowedMissingRate,
      }
    : { follow: o.maf.follow, value: o.maf.maxAllowedMaf };
}

/** The decimals `value` is written with: 2 for 0.05, 4 for 0.0035. */
function decimalsOf(value: number): number {
  const text = numberText(value);
  const point = text.indexOf(".");
  return point === -1 ? 0 : text.length - point - 1;
}

/**
 * The decimals of the step of the Variants tab's box of the threshold
 * `kind`, which the axis of its histogram gives, from the result of the
 * one pass `result` over individuals of ploidy `ploidy`: those of
 * `variantThresholdStep`, which the histogram draws with, 3 for the
 * missing rate of `panel.nei`, whose axis goes from 0 to 0.1. Made once
 * for a result, since the field reads it at each change of the store.
 * For `stricterBound`, once the one pass has read the file to the end.
 */
export function stepDecimalsOf(
  result: VariantsSummaryResult,
  kind: StricterKind,
  ploidy: number,
): number {
  return variantThresholdStep(
    result.perVar,
    kind === "missing_data" ? "missingRate" : "maf",
    { numIndividuals: result.perIndividual.individuals.length, ploidy },
  ).decimals;
}
