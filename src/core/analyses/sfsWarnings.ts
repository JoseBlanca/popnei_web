/**
 * The warning of the folded site frequency spectrum, of a MAF filter that
 * removed variants from the pass of the diversity
 * (docs/specs/analyses/sfs.md, "The warnings" and "On popgen2.html"):
 * apart from sfs.ts since 12 October 2026, so that the band of
 * popgen2.html, which counts this warning with the diversity's and loads
 * with the page, does not bring the rows and the CSV of the spectrum with
 * it.
 */

import { filtersApplied } from "../filtersApplied.ts";
import { grouped } from "../project.ts";
import type { Project } from "../project.ts";
import type { Warning } from "../store.ts";
import type { DiversityPage } from "./diversity.ts";
import type { DiversityResult } from "../../worker/protocol.ts";

/** How the warning of the spectrum names the MAF filter, after "The
    MAF", and how it is turned off, by the page. */
const MAF_PLACES: Readonly<
  Record<DiversityPage, { readonly filter: string; readonly turnOff: string }>
> = Object.freeze({
  popgen: Object.freeze({
    filter: "filter of the Variants step",
    turnOff: "turn off the MAF filter in the Variants step",
  }),
  popgen2: Object.freeze({
    filter: "threshold of the Variants tab",
    turnOff: "turn the MAF threshold off in the Variants tab",
  }),
});

/** The threshold of the MAF filter at which it removes only the variants
    with no called allele, which the warning does not count. */
const MAF_KEEPS_ALL = 1;

/**
 * The warnings of the spectrum, which the block of the spectrum writes
 * at the end of its caption, given the project `p` the request of `r`
 * was made from: a MAF filter with a threshold below 1 that removed at
 * least one of the variants it was given, as the counts of the pass of
 * `r` have them, in the words of the page `page` of the diversity's
 * definition (sfs.md, "On popgen2.html").
 */
export function spectrumWarnings(
  r: DiversityResult,
  p: Project,
  page: DiversityPage,
): Warning[] {
  const filter = filtersApplied(p).find((f) => f.kind === "maf");
  const counts = r.passStats.filtering.maf;
  if (
    filter?.kind !== "maf" ||
    filter.maxAllowedMaf >= MAF_KEEPS_ALL ||
    counts === undefined ||
    counts.varsKept >= counts.varsProcessed
  ) {
    return [];
  }
  const removed = counts.varsProcessed - counts.varsKept;
  const place = MAF_PLACES[page];
  return [
    {
      code: "mafFilterOnSpectrum",
      text: `The MAF ${place.filter} removes the variants whose commonest allele is above ${String(filter.maxAllowedMaf)} in the individuals kept, taken together, and it removed ${grouped(removed)} of the ${grouped(counts.varsProcessed)} it was given. So the spectrum lacks many of the rare alleles, and its first bins are lower than those of the population. To see every variant in the spectrum, ${place.turnOff}.`,
    },
  ];
}
