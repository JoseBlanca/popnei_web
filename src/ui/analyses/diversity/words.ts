/**
 * The words of the panel of the diversity (docs/specs/analyses/diversity.md,
 * "The panel"): its three options, the lines under the field of the draw
 * and the refusals of the fields, the descriptions of their commands, the
 * lines of its ready state, the caption of its table, its headers and its
 * cells, the line of the draw beside the download, and the name of the
 * download; the line of the versions and the words of the ready state
 * that other panels share are in `../words.ts`. Pure, so that a test in
 * node checks them; the panel draws them.
 */

import type { DiversityRow } from "../../../core/analyses/diversity.ts";
import { fourDecimals } from "../../../core/analyses/words.ts";
import { variantsStem } from "../../../core/fileNames.ts";
import {
  ONE_POPULATION,
  counted,
  escaped,
  grouped,
  populationsWithMinimum,
  underMinimumText,
} from "../../../core/project.ts";
import type { PopulationsKept } from "../../../core/project.ts";
import { MIN_DRAW } from "../../../worker/protocol.ts";
import { numberText } from "../../widgets/committedNumber.ts";
import type { NumberRefusal } from "../../widgets/committedNumber.ts";
import {
  WAITS_FOR_STATISTICS_TEXT,
  emptiedText,
  populationsText,
  refusedWhy,
} from "../words.ts";
import type { NotTakenWords } from "../words.ts";

/** The label of the field of the minimum of individuals. */
export const MINIMUM_LABEL =
  "Minimum number of individuals with a genotype, a whole number from 0";

/** The line under the field of the minimum. */
export const MINIMUM_LINE =
  "A variant has a value in a population only when at least this many of its individuals have a called genotype there. A population with fewer individuals has no values.";

/** The label of the field of the threshold of polymorphism. */
export const THRESHOLD_LABEL =
  "Frequency of the commonest allele below which a variant is polymorphic, from 0 to 1";

/** The label of the field of the draw of the rarefaction. */
export const DRAW_LABEL = `Chromosomes drawn for the rarefaction, a whole number from ${String(MIN_DRAW)}`;

/** The button beside a draw typed, which sets the draw back to its
    default. */
export const USE_DEFAULT_LABEL = "Use the default";

/** The description of a change of the minimum, which ends the notice of
    the result it removes. */
export const MINIMUM_DESCRIPTION =
  "the minimum number of individuals of the diversity changed";

/** The description of a change of the threshold of polymorphism. */
export const THRESHOLD_DESCRIPTION =
  "the frequency below which a variant is polymorphic changed";

/** The description of a change of the draw, a number typed or the
    default set back. */
export const DRAW_DESCRIPTION =
  "the number of chromosomes of the rarefaction changed";

/** What the field of the draw needs to say where its number comes
    from: whether a draw was typed, the minimum of the options, and,
    once the variants file is read, its ploidy and the default draw. */
export type DrawLineFacts = {
  /** Whether the draw in use was typed, and is not the default. */
  readonly typed: boolean;
  /** The minimum number of individuals of the options. */
  readonly minNumIndividuals: number;
} & (
  | { readonly kind: "unread" }
  | {
      readonly kind: "read";
      /** The ploidy of the variants file. */
      readonly ploidy: number;
      /** The default draw, `defaultDrawOf`. */
      readonly defaultDraw: number;
    }
);

/** What the draw is for, after the line of the default or of a number
    typed, since a draw typed sets the spectrum as well. */
const DRAW_PURPOSE =
  "The alleles and the private alleles of every population are also given for a draw of this many chromosomes, so that populations of different sizes can be compared, and the site frequency spectrum below the table is of the same draw.";

/**
 * The line under the field of the draw: while it is the default, "The
 * default: the ploidy, 2, times the minimum number of individuals, 20.",
 * and what the draw is for; before the variants file is read, "The
 * default: the ploidy of the variants file times the minimum number of
 * individuals, 20."; once a number is typed, "Typed; the default would be
 * 40.", or, before the variants file is read, "Typed; the default would
 * be the ploidy of the variants file times the minimum number of
 * individuals, 20.", each with what the draw is for.
 */
export function drawLine(facts: DrawLineFacts): string {
  const minimum = grouped(facts.minNumIndividuals);
  if (facts.typed) {
    return facts.kind === "unread"
      ? `Typed; the default would be the ploidy of the variants file times the minimum number of individuals, ${minimum}. ${DRAW_PURPOSE}`
      : `Typed; the default would be ${grouped(facts.defaultDraw)}. ${DRAW_PURPOSE}`;
  }
  if (facts.kind === "unread") {
    return `The default: the ploidy of the variants file times the minimum number of individuals, ${minimum}.`;
  }
  return `The default: the ploidy, ${grouped(facts.ploidy)}, times the minimum number of individuals, ${minimum}. ${DRAW_PURPOSE}`;
}

/** What the field of the threshold says of a character it threw away. */
const THRESHOLD_NOT_TAKEN: NotTakenWords = Object.freeze({
  comma: "Write the decimals with a point, 0.1 and not 0,1",
  other:
    "cannot be typed in the frequency, which is written with digits and a point, as 0.95",
});

/** The line under the field of the threshold for a number it refused, or
    a character it threw away, with the frequency kept: "1.5 is more than
    1; the frequency stays 0.95.", "0.955 has more than two decimals; the
    frequency stays 0.95.", "Write the decimals with a point, 0.1 and not
    0,1; the frequency stays 0.95." */
export function thresholdRefusedText(
  refusal: NumberRefusal,
  kept: number,
): string {
  return `${refusedWhy(refusal, THRESHOLD_NOT_TAKEN)}; the frequency stays ${numberText(kept)}.`;
}

/** What the field of the draw says of a character it threw away. */
const DRAW_NOT_TAKEN: NotTakenWords = Object.freeze({
  comma:
    "Write the number of chromosomes with digits alone, 2400 and not 2,400 or 40,0",
  other:
    "cannot be typed in the number of chromosomes, which is a whole number, as 40",
});

/** The line under the field of the draw for a number it refused, or a
    character it threw away, with the draw kept, its whole numbers with
    commas between thousands: "1 is less than 2; the number of chromosomes
    stays 40."; or, while the field is empty before the variants file is
    read, `kept` being `NaN`, "…; the number of chromosomes stays the
    default." */
export function drawRefusedText(refusal: NumberRefusal, kept: number): string {
  const why = refusedWhy(refusal, DRAW_NOT_TAKEN, grouped);
  return Number.isNaN(kept)
    ? `${why}; the number of chromosomes stays the default.`
    : `${why}; the number of chromosomes stays ${grouped(kept)}.`;
}

/** The caption of the table: "The diversity of each population, over the
    1,152 variants of panel.nei the filters kept." */
export function captionText(numVars: number, variantsName: string): string {
  return `The diversity of each population, over the ${counted(numVars, "variant")} of ${escaped(variantsName)} the filters kept.`;
}

/** The headers of the table after the population, in the order of its
    cells, the rarefied ones naming the draw of the result: "Alleles per
    variant, rarefied to 40 chromosomes". */
export function numberHeaders(numCalledAlleles: number): readonly string[] {
  const rarefied = `rarefied to ${counted(numCalledAlleles, "chromosome")}`;
  return [
    "Individuals",
    "Expected heterozygosity (unbiased)",
    "Observed heterozygosity",
    "Proportion of polymorphic variants",
    "F",
    "Alleles per variant",
    `Alleles per variant, ${rarefied}`,
    "Private alleles",
    "Private alleles per variant",
    `Private alleles per variant, ${rarefied}`,
  ];
}

/** A number of the table, to four decimals with a point and a negative
    one with the minus sign U+2212, "−0.0113", or "no value" where popnei
    gave none. */
export function cellText(value: number | null): string {
  return value === null ? "no value" : fourDecimals(value);
}

/** A count of the table, with a comma between groups of three digits, or
    "no value" where popnei gave none. */
function countText(value: number | null): string {
  return value === null ? "no value" : grouped(value);
}

/** The cells of a row of the table: the population as a text shows a
    name of the user's files, so that two names that differ by a hidden
    character look different; its individuals and its private alleles as
    whole numbers with a comma between groups of three digits; its other
    numbers to four decimals. */
export function rowCells(row: DiversityRow): readonly string[] {
  return [
    escaped(row.population),
    grouped(row.individuals),
    cellText(row.expectedHeterozygosity),
    cellText(row.observedHeterozygosity),
    cellText(row.polymorphic),
    cellText(row.f),
    cellText(row.allelesPerVariant),
    cellText(row.allelesPerVariantRarefied),
    countText(row.privateAlleles),
    cellText(row.privateAllelesPerVariant),
    cellText(row.privateAllelesPerVariantRarefied),
  ];
}

/** The line beside the download, which says the draw the rarefied
    columns are of, since the headers of the CSV do not: "Rarefied to 40
    chromosomes." */
export function rarefiedText(numCalledAlleles: number): string {
  return `Rarefied to ${counted(numCalledAlleles, "chromosome")}.`;
}

/** The name of the download of the table: the stem of the variants
    file, `variantsStem`, then `.diversity.csv`; `panel.vcf.gz` gives
    `panel.diversity.csv`. */
export function csvName(variantsName: string): string {
  return `${variantsStem(variantsName)}.diversity.csv`;
}

/** The one population a run will take, "All individuals", with its
    size: "1 population, All individuals: 200 individuals". */
export function onePopulationText(size: number): string {
  return `1 population, ${ONE_POPULATION}: ${counted(size, "individual")}`;
}

/** The line of the ready state without a metadata file, the words of
    the Individuals step, so that a user who meant to load one learns it
    here. */
export const NO_METADATA_TEXT =
  "No metadata file: every individual is in one population.";

/** What the ready state says follows for the populations under the
    minimum, of one and of several. */
const UNDER_MINIMUM = Object.freeze({
  one: "so it will have no values, and is left out of the count of the private alleles of the others.",
  many: "so they will have no values, and are left out of the count of the private alleles of the others.",
});

/** What it says of the populations under the minimum when no private
    alleles are counted: the one population, or fewer than two
    populations of the minimum. */
const NO_OTHERS_UNDER_MINIMUM = Object.freeze({
  one: "so it will have no values.",
  many: "so they will have no values.",
});

/** What the populations of a run are: every individual in one
    population, without a metadata file or with one, or populations. */
export type PopulationsKind = "noFile" | "onePopulation" | "populations";

/**
 * The lines of the ready state, and of the state of a result removed:
 * the populations a run will take with their sizes, when any is left, or
 * the one population, `kind` saying which, with the line of no metadata
 * file after it when there is none; the populations of `kept` under
 * `minNumIndividuals`, which will have no values, "p3 has 12
 * individuals, fewer than the minimum of 20, so it will have no values,
 * and is left out of the count of the private alleles of the others.";
 * the populations the filters of individuals leave empty, when any; and,
 * when `waitsForStatistics`, a threshold on the individuals waiting for
 * the statistics of each individual, the line that says Run calculates
 * them first, `kept` being then the populations before the thresholds.
 */
export function readyLines(
  kept: PopulationsKept,
  minNumIndividuals: number,
  waitsForStatistics: boolean,
  kind: PopulationsKind,
): readonly string[] {
  const [one] = kept.pops;
  const { withMinimum, under } = populationsWithMinimum(
    kept.pops,
    minNumIndividuals,
  );
  const onePopulation = kind !== "populations" && one !== undefined;
  // Private alleles are counted among two populations of the minimum or
  // more: with fewer, a population under it is left out of no count.
  const noOthers = onePopulation || withMinimum.length < 2;
  return [
    ...(onePopulation
      ? [onePopulationText(one[1].length)]
      : kept.pops.length > 0
        ? [populationsText(kept.pops)]
        : []),
    ...(kind === "noFile" ? [NO_METADATA_TEXT] : []),
    ...(under.length > 0
      ? [
          underMinimumText(
            under,
            minNumIndividuals,
            noOthers ? NO_OTHERS_UNDER_MINIMUM : UNDER_MINIMUM,
          ),
        ]
      : []),
    ...(kept.emptied.length > 0 ? [emptiedText(kept.emptied)] : []),
    ...(waitsForStatistics ? [WAITS_FOR_STATISTICS_TEXT] : []),
  ];
}
