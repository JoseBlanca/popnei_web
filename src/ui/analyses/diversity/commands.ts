/**
 * The commands of the options of the diversity
 * (docs/specs/analyses/diversity.md, "What it sends and reads"): each
 * field the panel changes is `setAnalysisOptions(p, diversity, {
 * ...diversityOptions(p), ‹the option› })`, with the description that
 * ends the notice and names the header's Undo. Pure, so that a test in
 * node checks them.
 */
import {
  diversity,
  diversityOptions,
} from "../../../core/analyses/diversity.ts";
import type { DiversityOptions } from "../../../core/analyses/diversity.ts";
import { optionCommand } from "../optionCommand.ts";
import type { OptionCommand, OptionsOf } from "../optionCommand.ts";
import {
  DRAW_DESCRIPTION,
  MINIMUM_DESCRIPTION,
  TYPED_DRAW_DESCRIPTION,
  THRESHOLD_DESCRIPTION,
} from "./words.ts";

/** The options of the diversity, as the commands read and write them. */
const DIVERSITY_OPTIONS: OptionsOf<DiversityOptions> = Object.freeze({
  analysis: diversity,
  read: diversityOptions,
  json: (o: DiversityOptions) => ({
    minNumIndividuals: o.minNumIndividuals,
    polyThreshold: o.polyThreshold,
    numCalledAlleles: o.numCalledAlleles,
  }),
});

/** The command that sets `change` in the options the project has. */
function withOptions(
  description: string,
  change: Partial<DiversityOptions>,
): OptionCommand {
  return optionCommand(DIVERSITY_OPTIONS, description, (o) => ({
    ...o,
    ...change,
  }));
}

/** The minimum number of individuals with a called genotype. */
export function minimumCommand(minNumIndividuals: number): OptionCommand {
  return withOptions(MINIMUM_DESCRIPTION, { minNumIndividuals });
}

/** The frequency of the commonest allele below which a variant is
    polymorphic. */
export function thresholdCommand(polyThreshold: number): OptionCommand {
  return withOptions(THRESHOLD_DESCRIPTION, { polyThreshold });
}

/** The chromosomes drawn for the rarefaction as typed, or `null` for the
    default draw, which "Use the default" sends. */
export function drawCommand(numCalledAlleles: number | null): OptionCommand {
  return withOptions(DRAW_DESCRIPTION, { numCalledAlleles });
}

/** The default's own number typed over the default draw: the number of
    the field is the same, and the draw is now typed, so it no longer
    follows the minimum; its description says so, where "changed" would
    name a change the user did not see (the owner, 1 October 2026). */
export function typedDrawCommand(numCalledAlleles: number): OptionCommand {
  return withOptions(TYPED_DRAW_DESCRIPTION, { numCalledAlleles });
}
