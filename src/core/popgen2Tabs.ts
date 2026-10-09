/**
 * Which of the three tabs of the analyses of popgen2.html, PCA,
 * Populations and Distances, is greyed, and why
 * (docs/specs/core/popgen2Tabs.md). A greyed tab does not open, and its
 * reason is its tooltip and its description for a screen reader, so a
 * wrong reason sends the user to fix what is not broken, and a tab greyed
 * by mistake hides an analysis that could run. The words of each reason
 * are the screen's (docs/specs/steps/popgen2-pca.md, "Its words"); this
 * module gives the kind of the reason and the names and counts its words
 * need.
 */

import { defect } from "./analyses/words.ts";
import type { IndividualsKept } from "./individualsKept.ts";
import { populationColumnChoices, populationCounts } from "./populations.ts";
import type { Project } from "./project.ts";

/** The ids of the three tabs of the analyses. */
export type AnalysisTabId = "pca" | "populations" | "distances";

/** The ids of the five tabs of the page, in their order: the two of the
    files, then the three of the analyses. */
export type PageTab = "variants" | "individuals" | AnalysisTabId;

/** Why a tab of the analyses is greyed, each with what its words need;
    `name` is the file's name as the project holds it. */
export type TabGreyed =
  /** No variants file in the project. */
  | { readonly kind: "noVariants" }
  /** The variants file `name` is being opened. */
  | { readonly kind: "variantsOpening"; readonly name: string }
  /** The variants file `name` could not be opened. */
  | { readonly kind: "variantsFailed"; readonly name: string }
  /** No individuals file in the project. */
  | { readonly kind: "noIndividuals" }
  /** The individuals file `name` is being read. */
  | { readonly kind: "individualsReading"; readonly name: string }
  /** The individuals file `name` was refused, or its read failed. */
  | { readonly kind: "individualsFailed"; readonly name: string }
  /** The list of the populations offers no column: the table of the
      individuals file `name` holds nothing but the names of the
      individuals and columns of booleans, as a file of semicolons read
      with the comma gives. */
  | {
      readonly kind: "noColumnToChoose";
      readonly name: string;
      /** A CSV or a TSV, whose separator the user can choose. */
      readonly textFile: boolean;
    }
  /** No column of the populations is chosen, or the one chosen is not
      among those the list offers. */
  | { readonly kind: "noColumn" }
  /** The column `column` has `numValues` values, more than a column of
      populations can have. */
  | {
      readonly kind: "tooManyValues";
      readonly column: string;
      readonly numValues: number;
    }
  /** Fewer than two populations of the column `column` have an
      individual in the variants file `variantsName`. */
  | {
      readonly kind: "fewPopulations";
      readonly column: string;
      readonly numPopulations: 0 | 1;
      readonly variantsName: string;
      readonly individualsName: string;
      /** No individual of the variants file is in the individuals file. */
      readonly noneInFile: boolean;
    }
  /** The individuals kept, known, are of fewer than two populations. */
  | { readonly kind: "fewKept"; readonly numPopulations: 0 | 1 };

/** Each tab of the analyses and its reason, or `null` when it is not
    greyed. */
export type AnalysisTabs = Readonly<Record<AnalysisTabId, TabGreyed | null>>;

/**
 * Each tab's reason, or `null` when it is not greyed, from the project
 * `p` and the store's `individualsKept`, `kept`. PCA and Populations are
 * greyed while no variants file is open; Distances for the same reasons,
 * then while fewer than two populations have an individual in the
 * variants file, then, once the list of the individuals kept is known,
 * while fewer than two populations keep one. The same frozen object as
 * the call before when the reasons are the same, so that the row of tabs,
 * which reads it at every change of the store, is not drawn again for a
 * threshold moved.
 */
export function analysisTabs(
  p: Project,
  kept: IndividualsKept | null,
): AnalysisTabs {
  const made = tabsOf(p, kept);
  const last = lastTabs;
  if (last !== null && sameTabs(last, made)) {
    return last;
  }
  const frozen: AnalysisTabs = Object.freeze({
    pca: frozenReason(made.pca),
    populations: frozenReason(made.populations),
    distances: frozenReason(made.distances),
  });
  lastTabs = frozen;
  return frozen;
}

/** The last answer of `analysisTabs`. The one state of this module: the
    store makes a new list of the individuals kept at every change of the
    project, which no memo keyed by its reference would find again. Set at
    the first call, so that this module makes nothing when it loads. */
let lastTabs: AnalysisTabs | null = null;

/** Each tab's reason, worked out anew: the three greyed alike while no
    variants file is open, and then Distances alone by its own reasons. */
function tabsOf(p: Project, kept: IndividualsKept | null): AnalysisTabs {
  const variants = p.variants;
  if (variants === null) {
    return alike({ kind: "noVariants" });
  }
  switch (variants.read.kind) {
    case "pending":
      return alike({ kind: "variantsOpening", name: variants.name });
    case "failed":
      return alike({ kind: "variantsFailed", name: variants.name });
    case "read":
      return {
        pca: null,
        populations: null,
        distances: distancesGreyed(p, variants.name, kept),
      };
  }
}

/** The three tabs greyed for the same `reason`. */
function alike(reason: TabGreyed): AnalysisTabs {
  return { pca: reason, populations: reason, distances: reason };
}

/** Why the tab Distances is greyed, with the variants file
    `variantsName` open, or `null` when it is not. */
function distancesGreyed(
  p: Project,
  variantsName: string,
  kept: IndividualsKept | null,
): TabGreyed | null {
  const individuals = p.individuals;
  if (individuals === null) {
    return { kind: "noIndividuals" };
  }
  switch (individuals.read.kind) {
    case "pending":
      return { kind: "individualsReading", name: individuals.name };
    // A file a project file named but did not hold, which popgen2.html,
    // saving no project, never has; were it to, the user opens the file
    // again, as after a failed read.
    case "failed":
    case "notGiven":
      return { kind: "individualsFailed", name: individuals.name };
    case "read":
      break;
  }
  const counts = populationCounts(p, kept);
  if (counts === null) {
    throw defect("an individuals file read gave no counts.");
  }
  if (counts.column === null) {
    return populationColumnChoices(individuals.read).length === 0
      ? {
          kind: "noColumnToChoose",
          name: individuals.name,
          textFile: individuals.read.found !== null,
        }
      : { kind: "noColumn" };
  }
  if (counts.tooMany) {
    return {
      kind: "tooManyValues",
      column: counts.column,
      numValues: counts.numValues,
    };
  }
  const numPopulations = fewer(counts.populations.length);
  if (numPopulations !== null) {
    return {
      kind: "fewPopulations",
      column: counts.column,
      numPopulations,
      variantsName,
      individualsName: individuals.name,
      noneInFile: counts.noneInFile !== null,
    };
  }
  if (counts.known) {
    const numKept = fewer(
      counts.populations.filter((population) => (population.kept ?? 0) > 0)
        .length,
    );
    if (numKept !== null) {
      return { kind: "fewKept", numPopulations: numKept };
    }
  }
  return null;
}

/** `count` when it is fewer than two populations, `null` otherwise. */
function fewer(count: number): 0 | 1 | null {
  switch (count) {
    case 0:
      return 0;
    case 1:
      return 1;
    default:
      return null;
  }
}

/** Whether the reasons of `a` and `b` are the same, tab by tab. */
function sameTabs(a: AnalysisTabs, b: AnalysisTabs): boolean {
  return (
    sameReason(a.pca, b.pca) &&
    sameReason(a.populations, b.populations) &&
    sameReason(a.distances, b.distances)
  );
}

/** Whether two reasons are the same: both none, or of the same kind with
    the same fields. The fields are strings, numbers and booleans. */
function sameReason(a: TabGreyed | null, b: TabGreyed | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  const aFields = Object.entries(a);
  return (
    aFields.length === Object.keys(b).length &&
    aFields.every(([field, value]) => Object.is(fieldOf(b, field), value))
  );
}

/** The value of the field `field` of `reason`, or `undefined` when it has
    none. */
function fieldOf(reason: TabGreyed, field: string): unknown {
  return Object.entries(reason).find(([name]) => name === field)?.[1];
}

/** `reason` frozen, or `null`. */
function frozenReason(reason: TabGreyed | null): TabGreyed | null {
  return reason === null ? null : Object.freeze(reason);
}
