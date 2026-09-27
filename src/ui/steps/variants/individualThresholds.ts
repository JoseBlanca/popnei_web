/**
 * The two thresholds of the filters of individuals of the Variants step,
 * on the proportion of missing genotypes and on the observed
 * heterozygosity of each individual, and what each filter of individuals
 * kept (docs/specs/steps/variants.md, "The two thresholds" and "What each
 * filter of the individuals kept"): the words of each switch and field,
 * the values they start at, their commands, the line of a threshold
 * beside its histogram, the count beside each filter, and the line of the
 * individuals that pass them all or the reason that none does. Pure, so
 * that a test in node applies the commands to the real store;
 * `IndividualFilters.tsx` draws them.
 */

import type { IndividualStatistic } from "../../../core/analyses/individualChecks.ts";
import { keptNoneReason } from "../../../core/individualsKept.ts";
import type { IndividualsKept } from "../../../core/individualsKept.ts";
import {
  counted,
  escaped,
  grouped,
  removeIndividualFilter,
  setIndividualFilter,
} from "../../../core/project.ts";
import type { Project } from "../../../core/project.ts";
import type {
  IndividualFilter,
  IndividualFilterKind,
} from "../../../worker/protocol.ts";
import type { StepCommand } from "./commands.ts";
import { individualThreshold } from "./individualStats.ts";
import { inTheStep } from "./writeWords.ts";

/** The two thresholds, in their fixed order. */
export const THRESHOLD_KINDS = ["missing_data", "obs_het"] as const;

/** One of the two thresholds. */
export type ThresholdKind = (typeof THRESHOLD_KINDS)[number];

/** An arrow key moves a threshold of the individuals by 0.01. */
export const INDIVIDUAL_THRESHOLD_STEP = 0.01;

/** A threshold of the individuals takes four decimals: the proportions
    of missing genotypes of panel.nei lie from 0.0165 to 0.0434, where two
    decimals would give three thresholds (the spec, "The two
    thresholds"). */
export const INDIVIDUAL_THRESHOLD_DECIMALS = 4;

/** The proportion of missing genotypes the filter of individuals by
    missing data starts at when it is turned on: 0.1, plink's default for
    `--mind`, as the owner decided on 26 September 2026 (point F of
    docs/specs/stage-3-open-points.md). */
export const INDIVIDUAL_MISSING_TURNED_ON = 0.1;

/** The observed heterozygosity the filter of individuals by observed
    heterozygosity starts at when it is turned on. popnei gives no
    default; the owner kept 0.5 on 26 September 2026 (point F). */
export const INDIVIDUAL_OBS_HET_TURNED_ON = 0.5;

/** The words of a threshold of the individuals. */
export interface ThresholdWords {
  /** The statistic its histogram shows. */
  readonly statistic: IndividualStatistic;
  /** The words of its switch. */
  readonly switchLabel: string;
  /** The label of its field, with its range. */
  readonly label: string;
  /** The line under its switch, or `null` for none. */
  readonly line: string | null;
  /** The filter in the middle of a sentence, which the descriptions of
      its commands and the line beside its histogram name. */
  readonly filterName: string;
}

/** The words of each threshold (the spec, the table of "The two
    thresholds"). */
export const THRESHOLD_WORDS: Readonly<Record<ThresholdKind, ThresholdWords>> =
  Object.freeze({
    missing_data: {
      statistic: "missingGenotypes",
      switchLabel: "Filter the individuals by missing data",
      label:
        "Maximum proportion of missing genotypes of an individual, from 0 to 1",
      line: null,
      filterName: "the filter of individuals by missing data",
    },
    obs_het: {
      statistic: "observedHeterozygosity",
      switchLabel: "Filter the individuals by observed heterozygosity",
      label: "Maximum observed heterozygosity of an individual, from 0 to 1",
      line: "An individual with no called genotype has no observed heterozygosity, and this filter removes it.",
      filterName: "the filter of individuals by observed heterozygosity",
    },
  });

/** The threshold of the kind `kind` among `filters`, or `null` while
    that filter is off. */
export function thresholdOf(
  filters: readonly IndividualFilter[],
  kind: ThresholdKind,
): number | null {
  return individualThreshold(filters, THRESHOLD_WORDS[kind].statistic);
}

/** The filter of the kind `kind` at `value`. */
function thresholdFilter(kind: ThresholdKind, value: number): IndividualFilter {
  switch (kind) {
    case "missing_data":
      return { kind, maxAllowedMissingRate: value };
    case "obs_het":
      return { kind, maxAllowedObsHet: value };
  }
}

/** A threshold committed: "the filter of individuals by missing data
    changed". */
export function thresholdCommand(
  kind: ThresholdKind,
  value: number,
): StepCommand {
  const filter = thresholdFilter(kind, value);
  return {
    description: `${THRESHOLD_WORDS[kind].filterName} changed`,
    command: (p) => setIndividualFilter(p, filter),
  };
}

/** The switch of a threshold turned on, at the value it starts at, or
    off: "the filter of individuals by missing data was turned on". */
export function thresholdSwitchCommand(
  kind: ThresholdKind,
  on: boolean,
): StepCommand {
  const name = THRESHOLD_WORDS[kind].filterName;
  if (on) {
    const filter = thresholdFilter(
      kind,
      kind === "missing_data"
        ? INDIVIDUAL_MISSING_TURNED_ON
        : INDIVIDUAL_OBS_HET_TURNED_ON,
    );
    return {
      description: `${name} was turned on`,
      command: (p) => setIndividualFilter(p, filter),
    };
  }
  return {
    description: `${name} was turned off`,
    command: (p) => removeIndividualFilter(p, kind),
  };
}

/** The line beside the histogram of a threshold that says it in words,
    and that the histogram counts every individual of the file, where the
    count beside the filter counts those the filters above it kept:
    "Threshold of the filter of individuals by missing data: 0.03, drawn
    over every individual of the file". */
export function individualThresholdText(
  kind: ThresholdKind,
  value: number,
): string {
  return `Threshold of ${THRESHOLD_WORDS[kind].filterName}: ${String(value)}, drawn over every individual of the file`;
}

/** What a filter of individuals says in place of its count while it
    waits for the statistics of each individual. */
export const KNOWN_ONCE_TEXT =
  "Known once the statistics of each individual are calculated for these filters of the variants.";

/** What a filter of individuals says in place of its count while the
    statistics of each individual are in their error state. */
export const NOT_KNOWN_TEXT =
  "Not known: the statistics of each individual could not be calculated, and their block says why.";

/** What one filter of individuals kept: "Kept 125 of the 200 individuals
    it was given.", "Kept 1 of the 1 individual it was given." */
export function individualKeptText(given: number, kept: number): string {
  return `Kept ${grouped(kept)} of the ${counted(given, "individual")} it was given.`;
}

/**
 * The count beside the filter of individuals of the kind `kind`, from the
 * individuals kept the store gives: what it kept, or, when that needs
 * statistics the page does not have, the words that say so, which say
 * they could not be calculated when `statsFailed`, the statistics in
 * their error state; `null` when
 * the filter is not set, or when `kept` is `null`, a list refused or a
 * variants file not read.
 */
export function individualCountText(
  kept: IndividualsKept | null,
  kind: IndividualFilterKind,
  statsFailed: boolean,
): string | null {
  const count = kept?.counts.find((c) => c.kind === kind);
  if (count === undefined) return null;
  if (count.given !== null && count.kept !== null) {
    return individualKeptText(count.given, count.kept);
  }
  return statsFailed ? NOT_KNOWN_TEXT : KNOWN_ONCE_TEXT;
}

/** What stands under the filters of individuals: nothing; the line of
    the individuals that pass them; or the reason that they keep none. */
export type KeptTotal =
  | { readonly kind: "nothing" }
  | { readonly kind: "passed"; readonly text: string }
  | { readonly kind: "keptNone"; readonly text: string };

const NOTHING: KeptTotal = Object.freeze({ kind: "nothing" });

/**
 * What stands under the filters of individuals of `p`, from the
 * individuals kept the store gives: "119 of the 200 individuals of
 * panel.nei pass the filters."; when they keep none, the reason
 * `keptNoneReason` gives without its end "in the Variants step", "The
 * filters of individuals keep none of the 200 individuals of panel.nei.
 * Loosen them."; nothing while no filter of individuals is set, while
 * `kept` is `null`, and while the individuals kept wait for the
 * statistics.
 */
export function keptTotal(p: Project, kept: IndividualsKept | null): KeptTotal {
  if (kept === null || p.individualFilters.length === 0) return NOTHING;
  const reason = keptNoneReason(p, kept);
  if (reason !== null) return { kind: "keptNone", text: inTheStep(reason) };
  const list = kept.list;
  if (list.kind === "needsStatistics" || p.variants?.read.kind !== "read") {
    return NOTHING;
  }
  const numIndividuals = p.variants.read.individuals.length;
  const numKept = list.individuals?.length ?? numIndividuals;
  const verb = numKept === 1 ? "passes" : "pass";
  return {
    kind: "passed",
    text: `${grouped(numKept)} of the ${counted(numIndividuals, "individual")} of ${escaped(p.variants.name)} ${verb} the filters.`,
  };
}

/** What the step announces after a command of the section that changed
    the reason of no individual kept from `before` to `after`: the reason,
    as it is shown, when there is one now that was not there before;
    `null` otherwise. */
export function appearedKeptNone(
  before: KeptTotal,
  after: KeptTotal,
): string | null {
  if (after.kind !== "keptNone") return null;
  return before.kind === "keptNone" && before.text === after.text
    ? null
    : after.text;
}
