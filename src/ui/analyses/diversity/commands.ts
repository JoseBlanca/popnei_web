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
import { setAnalysisOptions } from "../../../core/project.ts";
import type { Project } from "../../../core/project.ts";
import {
  DRAW_DESCRIPTION,
  MINIMUM_DESCRIPTION,
  THRESHOLD_DESCRIPTION,
} from "./words.ts";

/** A command of the store, with its description. */
export interface OptionCommand {
  /** The words that end the notice of the result it removes. */
  readonly description: string;
  /** The new project, of the project it is given. */
  readonly command: (p: Project) => Project;
}

/** The command that sets `change` in the options the project has. */
function withOptions(
  description: string,
  change: Partial<DiversityOptions>,
): OptionCommand {
  return {
    description,
    command: (p) => {
      const next = { ...diversityOptions(p), ...change };
      return setAnalysisOptions(p, diversity, {
        minNumIndividuals: next.minNumIndividuals,
        polyThreshold: next.polyThreshold,
        numCalledAlleles: next.numCalledAlleles,
      });
    },
  };
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
