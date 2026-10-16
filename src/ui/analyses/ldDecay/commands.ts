/**
 * The commands of the options of the LD decay
 * (docs/specs/analyses/ldDecay.md, "What it sends and reads"): each
 * option the panel changes is `setAnalysisOptions(p, ldDecay, {
 * ...ldDecayOptions(p), ‹the option› })`, with the description that ends
 * the notice and names the header's Undo. Pure, so that a test in node
 * checks them.
 */
import { ldDecay, ldDecayOptions } from "../../../core/analyses/ldDecay.ts";
import type {
  LdDecayOptions,
  LdDecayPage,
} from "../../../core/analyses/ldDecay.ts";
import { optionCommand } from "../optionCommand.ts";
import type { OptionCommand, OptionsOf } from "../optionCommand.ts";
import { MAX_DIST_DESCRIPTION, MAX_MAF_DESCRIPTION } from "./words.ts";

/** The options of the LD decay of the page `page`, as the commands read
    and write them: read with that page's defaults, so that a change of
    the frequency on popgen2.html, with none set, keeps its default
    distance. */
function optionsOf(page: LdDecayPage): OptionsOf<LdDecayOptions> {
  return {
    analysis: ldDecay,
    read: (p) => ldDecayOptions(p, page),
    json: (o: LdDecayOptions) => ({
      maxDist: o.maxDist,
      maxAllowedMaf: o.maxAllowedMaf,
    }),
  };
}

/** The command of the page `page` that sets `change` in the options the
    project has. */
function withOptions(
  description: string,
  change: Partial<LdDecayOptions>,
  page: LdDecayPage,
): OptionCommand {
  return optionCommand(optionsOf(page), description, (o) => ({
    ...o,
    ...change,
  }));
}

/** The largest distance between the two variants of a pair, in base
    pairs, which removes the result; `null`, no distance, for the field
    emptied on popgen2.html, which locks the LD decay until one is
    typed. */
export function maxDistCommand(
  maxDist: number | null,
  page: LdDecayPage,
): OptionCommand {
  return withOptions(MAX_DIST_DESCRIPTION, { maxDist }, page);
}

/** The largest major allele frequency a variant has in a population and
    is still counted there, which removes the result. */
export function maxAllowedMafCommand(
  maxAllowedMaf: number,
  page: LdDecayPage,
): OptionCommand {
  return withOptions(MAX_MAF_DESCRIPTION, { maxAllowedMaf }, page);
}
