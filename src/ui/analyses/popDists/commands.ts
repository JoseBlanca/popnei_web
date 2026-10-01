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
import type { ShownMeasure } from "../../../worker/protocol.ts";
import { optionCommand } from "../optionCommand.ts";
import type { OptionCommand, OptionsOf } from "../optionCommand.ts";
import { MEASURE_DESCRIPTION, MINIMUM_DESCRIPTION } from "./words.ts";

/** The options of the distances, as the commands read and write them. */
const POP_DISTS_OPTIONS: OptionsOf<PopDistsOptions> = Object.freeze({
  analysis: popDists,
  read: popDistsOptions,
  json: (o: PopDistsOptions) => ({
    minNumIndividuals: o.minNumIndividuals,
    measure: o.measure,
  }),
});

/** The command that sets `change` in the options the project has. */
function withOptions(
  description: string,
  change: Partial<PopDistsOptions>,
): OptionCommand {
  return optionCommand(POP_DISTS_OPTIONS, description, (o) => ({
    ...o,
    ...change,
  }));
}

/** The minimum number of individuals, which removes the result. */
export function minimumCommand(minNumIndividuals: number): OptionCommand {
  return withOptions(MINIMUM_DESCRIPTION, { minNumIndividuals });
}

/** The measure the heatmap draws, which removes nothing. */
export function measureCommand(measure: ShownMeasure): OptionCommand {
  return withOptions(MEASURE_DESCRIPTION, { measure });
}
