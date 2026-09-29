/**
 * The panel of each analysis, by its id (react.md, "The layout of a
 * screen and of an analysis"): what the frame of `AnalysisPanel.tsx`
 * needs of an analysis beyond the state the store gives, its title, its
 * name in a sentence, the lines of its ready state, the words of popnei's
 * refusals and of the statistics of each individual that failed, and the
 * component that draws its result. The title is that
 * of `titles.ts`, by which the shell names the analysis in the notice and
 * the status region (docs/specs/shell.md, "What it sends and reads").
 *
 * The three checks of the Variants step have no panel here: the Variants
 * step draws their parts among its filters
 * (docs/specs/steps/variants.md). `AnalysisId` is a string, so the
 * compiler cannot tell an analysis with no panel; `panelOf` throws a
 * defect for one, which the Analyses step, drawing a panel for every
 * analysis of its step, meets at once.
 */
import type { ComponentType } from "react";

import {
  refusalText,
  statisticsFailedText,
} from "../../core/analyses/diversity.ts";
import {
  refusalText as pcaRefusalText,
  statisticsFailedText as pcaStatisticsFailedText,
} from "../../core/analyses/pca.ts";
import type { Failure } from "../../core/analyses/individualChecks.ts";
import type { IndividualsKept } from "../../core/individualsKept.ts";
import { populationsBeforeRun, populationsOf } from "../../core/project.ts";
import type { AnalysisId, Project } from "../../core/project.ts";
import type { AnalysisError } from "../../core/store.ts";
import type { JobResult } from "../../worker/protocol.ts";
import { DiversityResults } from "./diversity/DiversityResults.tsx";
import { readyLines } from "./diversity/words.ts";
import { titleOf } from "./titles.ts";

/** What the component of a result is drawn with. */
export interface ResultsProps {
  /** The result the store gives the analysis in its state done. */
  readonly result: JobResult;
  /** The words of the comparison with the check numbers of an opened
      project file, or of why the numbers are not compared, drawn under
      the table; `null` when there is neither. */
  readonly check: string | null;
}

/** What the frame needs of one analysis. */
export interface AnalysisUi {
  /** The title of the panel, its `<h2>`, "Diversity", by which the shell
      names it. */
  readonly title: string;
  /** The analysis in the middle of a sentence, "the diversity". */
  readonly name: string;
  /** Its result in the middle of a sentence, "the table", which the
      words of a result removed say Undo brings back and Run makes anew. */
  readonly resultName: string;
  /** The lines beside Run in the states ready and removed, what it will
      run on, from the project `p` and the individuals the filters keep,
      `kept` of the state of the store; none for none. */
  readonly readyLines: (
    p: Project,
    kept: IndividualsKept | null,
  ) => readonly string[];
  /** The words of a refusal of popnei, its message given, for the
      project `p`. */
  readonly refusalText: (message: string, p: Project) => string;
  /** The words of the failure of the statistics of each individual that
      a Run waited for, the store's error with `ofStatistics`, for an
      analysis that reads the filters of individuals; `null` for one that
      does not, which the store never gives that error. */
  readonly statisticsFailedText:
    | ((
        error: AnalysisError,
        p: Project,
        failureText: (failure: Failure) => string,
      ) => string)
    | null;
  /** Draws the result: its table, its plot, its download. */
  readonly Results: ComponentType<ResultsProps>;
}

/** The panel of the diversity (docs/specs/analyses/diversity.md, "The
    panel"). */
const DIVERSITY: AnalysisUi = Object.freeze({
  title: titleOf("diversity"),
  name: "the diversity",
  resultName: "the table",
  readyLines: (p: Project, kept: IndividualsKept | null): readonly string[] => {
    // No individuals kept, `null`, comes of a variants file not read or
    // of lists popnei would refuse, and the store locks the diversity for
    // both before it is ready or removed, the only states that draw these
    // lines (store.md, "The state of an analysis").
    if (kept === null) {
      throw new Error(
        "popnei_web defect: the diversity is ready or removed with no individuals kept.",
      );
    }
    // While a threshold waits for the statistics, the populations the
    // lists keep, before it.
    const waits = kept.list.kind === "needsStatistics";
    const pops = populationsBeforeRun(p, kept);
    const kind =
      populationsOf(p) !== "all"
        ? "populations"
        : p.individuals === null
          ? "noFile"
          : "onePopulation";
    return pops === null ? [] : readyLines(pops, waits, kind);
  },
  refusalText,
  statisticsFailedText,
  Results: DiversityResults,
});

/**
 * The panel of the principal components (docs/specs/analyses/pca.md, "The
 * panel"), for now its words alone: the frame draws its options of none,
 * its Run, its warnings and its error state, and its result draws
 * nothing. The panel whole, the options, the plots, the legend, the
 * explained variance, the table and its lines before a Run, is task 8.4
 * of docs/plans/individuals-pca.md, which replaces `readyLines` and
 * `Results` here.
 */
const PCA: AnalysisUi = Object.freeze({
  title: titleOf("pca"),
  name: "the principal components",
  resultName: "the plot and the table",
  readyLines: (): readonly string[] => [],
  refusalText: pcaRefusalText,
  statisticsFailedText: pcaStatisticsFailedText,
  Results: (): null => null,
});

/** The panel of every analysis of the Analyses step, by its id. */
export const PANELS: ReadonlyMap<AnalysisId, AnalysisUi> = new Map([
  ["pca", PCA],
  ["diversity", DIVERSITY],
]);

/** The panel of the analysis `id`; a defect when it has none. */
export function panelOf(id: AnalysisId): AnalysisUi {
  const panel = PANELS.get(id);
  if (panel === undefined) {
    throw new Error(`popnei_web defect: the analysis ${id} has no panel.`);
  }
  return panel;
}
