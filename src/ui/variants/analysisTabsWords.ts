/**
 * The words of the row of five tabs of popgen2.html, Variants,
 * Individuals, PCA, Populations and Distances, and of each reason a tab
 * of the analyses is greyed, from the kind `analysisTabs` of core gives
 * (docs/specs/steps/popgen2-pca.md, "Its words"; docs/specs/core/popgen2Tabs.md).
 * Each reason says what is missing and what to do; it is the tab's
 * tooltip, its description for a screen reader, and the content of the
 * tab when it is greyed while shown. Pure, so that a test in node checks
 * them.
 */

import type {
  AnalysisTabId,
  PageTab,
  TabGreyed,
} from "../../core/popgen2Tabs.ts";
import {
  escaped,
  grouped,
  shown,
  MAX_LISTED_POPULATIONS,
} from "../../core/project.ts";

/** The label of each tab, in the order of the row. */
export const PAGE_TAB_LABELS: Readonly<Record<PageTab, string>> = {
  variants: "Variants",
  individuals: "Individuals",
  pca: "PCA",
  populations: "Populations",
  distances: "Distances",
};

/** The name of the row of tabs, for a screen reader. */
export const ANALYSES_TABS_LABEL = "Files and analyses";

/** The heading of the PCA tab. */
export const PCA_HEADING = "PCA";

/** What the Populations tab says once it is not greyed. */
export const POPULATIONS_NOT_BUILT =
  "Not built yet: the diversity of each population, its site frequency spectrum and its LD decay come in a later version of the page.";

/** What the Distances tab says once it is not greyed. */
export const DISTANCES_NOT_BUILT =
  "Not built yet: the distances between the populations, Hudson's Fst or Jost's D, come in a later version of the page.";

/** What each tab of the analyses needs, the start of its reasons. */
const SUBJECTS: Readonly<Record<AnalysisTabId, string>> = {
  pca: "The PCA needs",
  populations: "The analyses of the populations need",
  distances: "The distances between populations need",
};

/** The start of the reasons of Distances once a variants file is open. */
const TWO_POPULATIONS = `${SUBJECTS.distances} at least two populations`;

/** Where the user chooses another column. */
const ANOTHER_COLUMN = "Choose another column in the box Individuals file.";

/** What to do when the filters leave too few populations. */
const LOOSEN = "Loosen the filters of the individuals in the Variants tab.";

/**
 * The words of the reason `reason` the tab `tab` is greyed: "The PCA
 * needs a variants file: panel.nei is being opened." The names of the
 * files are escaped and the column cut, as the page shows every value of
 * the user's files. The reasons of the individuals file and its column
 * are those of Distances whichever tab is named, since only Distances is
 * given them.
 */
export function greyedText(tab: AnalysisTabId, reason: TabGreyed): string {
  const subject = SUBJECTS[tab];
  switch (reason.kind) {
    case "noVariants":
      return `${subject} a variants file. Open one in the box Variants file.`;
    case "variantsOpening":
      return `${subject} a variants file: ${escaped(reason.name)} is being opened.`;
    case "variantsFailed":
      return `${subject} a variants file: ${escaped(reason.name)} could not be opened; the box Variants file says why and what to do.`;
    case "noIndividuals":
      return `${TWO_POPULATIONS}. Open an individuals file that assigns the individuals to them.`;
    case "individualsReading":
      return `${TWO_POPULATIONS}: ${escaped(reason.name)} is being read.`;
    case "individualsFailed":
      return `${TWO_POPULATIONS}: ${escaped(reason.name)} could not be read; the box Individuals file says why and what to do.`;
    case "noColumnToChoose":
      return `${TWO_POPULATIONS}, and ${escaped(reason.name)} has no column to choose besides the names of the individuals. ${
        reason.textFile
          ? "If it has more, choose its separator in the Individuals tab."
          : "Add a column of the populations to it and open it again in the box Individuals file."
      }`;
    case "noColumn":
      return `${TWO_POPULATIONS}, and no column of the populations is chosen. Choose one in the box Individuals file.`;
    case "tooManyValues":
      return `${TWO_POPULATIONS}, and ${shown(reason.column)} has ${grouped(reason.numValues)} values, more than the ${String(MAX_LISTED_POPULATIONS)} a column of populations can have. ${ANOTHER_COLUMN}`;
    case "fewPopulations":
      return `${TWO_POPULATIONS}, and ${fewPopulationsText(reason)}`;
    case "fewKept":
      return reason.numPopulations === 1
        ? `${TWO_POPULATIONS}, and the filters keep individuals of 1 population. ${LOOSEN}`
        : `${TWO_POPULATIONS}, and the filters keep no individual of any population. ${LOOSEN}`;
  }
}

/** The end of the reason of fewer than two populations among the
    individuals of the variants file. */
function fewPopulationsText(
  reason: Extract<TabGreyed, { readonly kind: "fewPopulations" }>,
): string {
  const variants = escaped(reason.variantsName);
  if (reason.numPopulations === 1) {
    return `${shown(reason.column)} gives 1 population among the individuals of ${variants}. ${ANOTHER_COLUMN}`;
  }
  if (reason.noneInFile) {
    const individuals = escaped(reason.individualsName);
    return `no individual of ${variants} is in ${individuals}. Check that ${individuals} names the individuals as ${variants} does.`;
  }
  return `no individual of ${variants} has a value in ${shown(reason.column)}. ${ANOTHER_COLUMN}`;
}
