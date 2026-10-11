/**
 * The words of the Populations tab of popgen2.html that the page loads
 * with its first screen (docs/specs/steps/popgen2-populations.md, "The
 * result", its code, and "Its words"): the heading of its analysis,
 * which the boundary of errors of the tab keeps after a defect, and the
 * words in the place of the tab while its code downloads and after a
 * download that failed. The rest of the tab's words come with its code,
 * in `tabWords.ts`. Pure, so that a test in node checks them.
 */
import { escaped } from "../../../core/project.ts";

/** The heading of the tab's analysis, its `<h2>`. */
export const DIVERSITY_TAB_TITLE = "Diversity";

/** The line in the place of the tab while its code downloads, at its
    first show. */
export const POPULATIONS_TAB_LOADING = "Loading the Populations tab…";

/** The words in the place of the tab whose code could not be
    downloaded, of the variants file `variantsName`, with "Try again"
    under them. */
export function populationsTabFailed(variantsName: string): string {
  return `The Populations tab could not be loaded. If the connection works, the site may have been updated since this page was opened: try again, or reload the page and open ${escaped(variantsName)} again.`;
}
