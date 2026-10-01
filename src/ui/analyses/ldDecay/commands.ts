/**
 * The commands of the options of the LD decay
 * (docs/specs/analyses/ldDecay.md, "What it sends and reads"): each
 * option the panel changes is `setAnalysisOptions(p, ldDecay, {
 * ...ldDecayOptions(p), ‹the option› })`, with the description that ends
 * the notice and names the header's Undo. Pure, so that a test in node
 * checks them.
 */
import { ldDecay, ldDecayOptions } from "../../../core/analyses/ldDecay.ts";
import type { LdDecayOptions } from "../../../core/analyses/ldDecay.ts";
import { optionCommand } from "../optionCommand.ts";
import type { OptionCommand, OptionsOf } from "../optionCommand.ts";
import { MAX_DIST_DESCRIPTION, MAX_MAF_DESCRIPTION } from "./words.ts";

/** The options of the LD decay, as the commands read and write them. */
const LD_DECAY_OPTIONS: OptionsOf<LdDecayOptions> = Object.freeze({
  analysis: ldDecay,
  read: ldDecayOptions,
  json: (o: LdDecayOptions) => ({
    maxDist: o.maxDist,
    maxAllowedMaf: o.maxAllowedMaf,
  }),
});

/** The command that sets `change` in the options the project has. */
function withOptions(
  description: string,
  change: Partial<LdDecayOptions>,
): OptionCommand {
  return optionCommand(LD_DECAY_OPTIONS, description, (o) => ({
    ...o,
    ...change,
  }));
}

/** The largest distance between the two variants of a pair, in base
    pairs, which removes the result. */
export function maxDistCommand(maxDist: number): OptionCommand {
  return withOptions(MAX_DIST_DESCRIPTION, { maxDist });
}

/** The largest major allele frequency a variant has in a population and
    is still counted there, which removes the result. */
export function maxAllowedMafCommand(maxAllowedMaf: number): OptionCommand {
  return withOptions(MAX_MAF_DESCRIPTION, { maxAllowedMaf });
}
