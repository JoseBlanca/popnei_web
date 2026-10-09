/**
 * The fields of "Stricter for the PCA" of the PCA tab of popgen2.html
 * (docs/specs/steps/popgen2-pca.md, "Its filters"): the upper end of the
 * missing data's and of the MAF's field, the Variants tab's value or 1
 * while it has that threshold off, the decimals the field takes, the
 * value it shows, never looser than the one the PCA uses, and the lines
 * under it, of a number refused and of the Variants tab stricter than the
 * value set here. Pure, so that a test in node checks them; task 6.3 of
 * docs/plans/analyses-pca.md draws them.
 */

import { pcaOptions } from "../../../core/analyses/pca.ts";
import { THRESHOLD_OFF_AT } from "../../../core/project.ts";
import type { Project } from "../../../core/project.ts";
import { VARIANT_THRESHOLD_DECIMALS } from "../../../core/thresholds.ts";
import type { PcaMethod } from "../../../worker/protocol.ts";
import { numberText } from "../../widgets/committedNumber.ts";
import type { NumberRefusal } from "../../widgets/committedNumber.ts";
import { thresholdRefusedText } from "../../steps/variants/words.ts";
import { methodName } from "./words.ts";

/** The two filters the PCA can make stricter than the Variants tab's. */
export type StricterKind = "missing_data" | "maf";

/** The fewest decimals a field of "Stricter for the PCA" takes, as the
    fields of the old panel. */
const LEAST_DECIMALS = 2;

/** The field of a filter made stricter for the PCA. */
export interface StricterBound {
  /** The Variants tab's value of that threshold, or `null` while it is
      off. */
  readonly tab: number | null;
  /** The upper end of the field: the Variants tab's value, or 1 while it
      has that threshold off. */
  readonly max: number;
  /** The most decimals a number typed may have: those of the step of the
      Variants tab's box of that threshold, three at most as its box, those
      of the Variants tab's value, and two at least. */
  readonly decimals: number;
  /** The number the field shows: the PCA's own value, or the Variants
      tab's when that is stricter, which the PCA then uses. */
  readonly shown: number;
}

/**
 * The field of the filter `kind` made stricter for the PCA in `p`, with
 * `stepDecimals`, the decimals of the step of the Variants tab's box of
 * that threshold, which the axis of its histogram gives (`thresholdStep`
 * of src/core/thresholds.ts), or `null` before the one pass has drawn the
 * histogram. Read whether the PCA follows the Variants tab or not: while
 * it follows, `shown` is its own value kept in the project, bounded by the
 * Variants tab.
 */
export function stricterBound(
  p: Project,
  kind: StricterKind,
  stepDecimals: number | null,
): StricterBound {
  const tab = tabValue(p, kind);
  const own = ownValue(p, kind);
  const max = tab ?? THRESHOLD_OFF_AT;
  const decimals = Math.max(
    LEAST_DECIMALS,
    stepDecimals === null
      ? 0
      : Math.min(stepDecimals, VARIANT_THRESHOLD_DECIMALS),
    tab === null ? 0 : decimalsOf(tab),
  );
  return { tab, max, decimals, shown: Math.min(own, max) };
}

/** The lines under a field of "Stricter for the PCA". */
export interface StricterLines {
  /** The line of a number the field refused, `refusal`, with the number
      it keeps, `kept`, as `refusedText` of the number field takes it. */
  readonly refusedText: (refusal: NumberRefusal, kept: number) => string;
  /** The line of the Variants tab stricter than the PCA's own value,
      which the PCA then uses; `null` otherwise. */
  readonly tabStricter: string | null;
}

/**
 * The lines under the field of the filter `kind` made stricter for the PCA
 * in `p`, the method `method` naming the PCA or the PCoA: a number above
 * the Variants tab's value, "0.2 is more than the 0.1 of the Variants tab;
 * the maximum proportion of missing genotypes for the PCA stays 0.05.";
 * any other refusal, and a number above 1 while the Variants tab has that
 * threshold off, the old panel's line, "1.5 is more than 1; the threshold
 * stays 0.05."; and, while the Variants tab is stricter than the PCA's
 * own value, "The Variants tab keeps at most 0.03, stricter than the 0.05
 * set here, so the PCA uses 0.03.".
 */
export function stricterLines(
  p: Project,
  kind: StricterKind,
  method: PcaMethod,
): StricterLines {
  const tab = tabValue(p, kind);
  const own = ownValue(p, kind);
  const name = methodName(method);
  const what = WHAT[kind];
  const refusedText = (refusal: NumberRefusal, kept: number): string =>
    refusal.kind === "aboveMax" && tab !== null
      ? `${refusal.typed} is more than the ${numberText(tab)} of the Variants tab; ${what} for the ${name} stays ${numberText(kept)}.`
      : thresholdRefusedText(refusal, kept);
  const tabStricter =
    tab !== null && tab < own
      ? `The Variants tab keeps at most ${numberText(tab)}, stricter than the ${numberText(own)} set here, so the ${name} uses ${numberText(tab)}.`
      : null;
  return { refusedText, tabStricter };
}

/** What each field sets, as its line of a refusal names it. */
const WHAT: Readonly<Record<StricterKind, string>> = Object.freeze({
  missing_data: "the maximum proportion of missing genotypes",
  maf: "the maximum major allele frequency",
});

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

/** The PCA's own value of the filter `kind` in `p`, kept in the project
    whether it follows the Variants tab or not. */
function ownValue(p: Project, kind: StricterKind): number {
  const o = pcaOptions(p, "popgen2");
  return kind === "missing_data"
    ? o.missingData.maxAllowedMissingRate
    : o.maf.maxAllowedMaf;
}

/** The decimals `value` is written with: 2 for 0.05, 4 for 0.0035. */
function decimalsOf(value: number): number {
  const text = numberText(value);
  const point = text.indexOf(".");
  return point === -1 ? 0 : text.length - point - 1;
}
