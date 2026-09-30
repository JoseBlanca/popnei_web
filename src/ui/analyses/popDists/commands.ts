/**
 * The commands of the options of the distances between populations
 * (docs/specs/analyses/popDists.md, "What it sends and reads"): each
 * option the panel changes is `setAnalysisOptions(p, popDists, {
 * ...popDistsOptions(p), ‹the option› })`, with the description that ends
 * the notice and names the header's Undo. Pure, so that a test in node
 * checks them.
 */
import { popDists, popDistsOptions } from "../../../core/analyses/popDists.ts";
import type { PopDistsOptions } from "../../../core/analyses/popDists.ts";
import { setAnalysisOptions } from "../../../core/project.ts";
import type { Project } from "../../../core/project.ts";
import type { ShownMeasure } from "../../../worker/protocol.ts";
import { MEASURE_DESCRIPTION, MINIMUM_DESCRIPTION } from "./words.ts";

/** A command of the store, with its description. */
export interface OptionCommand {
  /** The words that end the notice of the results it removes. */
  readonly description: string;
  /** The new project, of the project it is given. */
  readonly command: (p: Project) => Project;
}

/** The command that sets `change` in the options the project has. */
function withOptions(
  description: string,
  change: Partial<PopDistsOptions>,
): OptionCommand {
  return {
    description,
    command: (p) => {
      const next = { ...popDistsOptions(p), ...change };
      return setAnalysisOptions(p, popDists, {
        minNumIndividuals: next.minNumIndividuals,
        measure: next.measure,
      });
    },
  };
}

/** The minimum number of individuals, which removes the result. */
export function minimumCommand(minNumIndividuals: number): OptionCommand {
  return withOptions(MINIMUM_DESCRIPTION, { minNumIndividuals });
}

/** The measure the heatmap draws, which removes nothing. */
export function measureCommand(measure: ShownMeasure): OptionCommand {
  return withOptions(MEASURE_DESCRIPTION, { measure });
}
