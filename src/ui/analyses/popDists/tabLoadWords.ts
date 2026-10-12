/**
 * The words of the Distances tab of popgen2.html that the page loads
 * with its first screen (docs/specs/steps/popgen2-distances.md, "The
 * result", its code, and "Its words"): the heading of its analysis,
 * which the boundary of errors of the tab keeps after a defect, and the
 * words in the place of the tab while its code downloads and after a
 * download that failed. The rest of the tab's words come with its code,
 * in `tabWords.ts`. Pure, so that a test in node checks them.
 */
import { escaped } from "../../../core/project.ts";

/** The heading of the tab's analysis, its `<h2>`, the title of the old
    page's panel. */
export const DISTANCES_TAB_TITLE = "Distances between populations";

/** The line in the place of the tab while its code downloads, at its
    first show. */
export const DISTANCES_TAB_LOADING = "Loading the Distances tab…";

/** The words in the place of the tab whose code could not be
    downloaded, of the variants file `variantsName`, with "Try again"
    under them. */
export function distancesTabFailed(variantsName: string): string {
  return `The Distances tab could not be loaded. Press Try again. If it fails again, the site may have been updated since this page was opened: reload the page and open ${escaped(variantsName)} again; what the page has calculated is lost.`;
}
