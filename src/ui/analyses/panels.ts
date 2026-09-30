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
  crashText,
  refusalText as pcaRefusalText,
  statisticsFailedText as pcaStatisticsFailedText,
} from "../../core/analyses/pca.ts";
import { statisticsFailedWords } from "../../core/analyses/individualChecks.ts";
import type { Failure } from "../../core/analyses/individualChecks.ts";
import { refusalText as ldDecayRefusalText } from "../../core/analyses/ldDecay.ts";
import { refusalText as popDistsRefusalText } from "../../core/analyses/popDists.ts";
import type { IndividualsKept } from "../../core/individualsKept.ts";
import { populationsBeforeRun, populationsOf } from "../../core/project.ts";
import type { AnalysisId, Project } from "../../core/project.ts";
import type { AnalysisError } from "../../core/store.ts";
import type { JobResult } from "../../worker/protocol.ts";
import { DiversityResults } from "./diversity/DiversityResults.tsx";
import { readyLines } from "./diversity/words.ts";
import { LdDecayPlaceholder } from "./ldDecay/LdDecayPlaceholder.tsx";
import { PcaOptionsPart } from "./pca/PcaOptionsPart.tsx";
import { PcaResults } from "./pca/PcaResults.tsx";
import { PopDistsPlaceholder } from "./popDists/PopDistsPlaceholder.tsx";
import { decompositionLine, readyLines as pcaReadyLines } from "./pca/words.ts";
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
  /** Whether the analysis and its result are named in the plural, "the
      principal components", "the plot and the table", as the words of a
      result removed say them. */
  readonly plural: boolean;
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
      analysis that reads the filters of individuals, "was not run" when
      its own Run waited for them, `waited`, "cannot run" when it did
      not; `null` for one that does not read them, which the store never
      gives that error. */
  readonly statisticsFailedText:
    | ((
        error: AnalysisError,
        p: Project,
        failureText: (failure: Failure) => string,
        waited: boolean,
      ) => string)
    | null;
  /** Draws the result: its table, its plot, its download. */
  readonly Results: ComponentType<ResultsProps>;
  /** Draws the options of the analysis, above its Run button, in every
      state, since they are what the user may change; `null` for an
      analysis with none. */
  readonly Options: ComponentType | null;
  /** A line under the bar of a calculation under way, for the project
      `p`, what the bar does not show; `null` for none. */
  readonly runningLine: (p: Project) => string | null;
  /** The words of a worker that stopped with no answer, `workerFailed`,
      for the project `p` and the individuals kept of the state of the
      store, when the analysis has its own; `null` for the words every
      analysis shares. */
  readonly workerFailedText:
    ((p: Project, kept: IndividualsKept | null) => string) | null;
}

/** The panel of the diversity (docs/specs/analyses/diversity.md, "The
    panel"). */
const DIVERSITY: AnalysisUi = Object.freeze({
  title: titleOf("diversity"),
  name: "the diversity",
  resultName: "the table",
  plural: false,
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
  Options: null,
  runningLine: (): null => null,
  workerFailedText: null,
});

/** The panel of the principal components (docs/specs/analyses/pca.md,
    "The panel"). */
const PCA: AnalysisUi = Object.freeze({
  title: titleOf("pca"),
  name: "the principal components",
  resultName: "the plot and the table",
  plural: true,
  readyLines: pcaReadyLines,
  refusalText: pcaRefusalText,
  statisticsFailedText: pcaStatisticsFailedText,
  Results: PcaResults,
  Options: PcaOptionsPart,
  runningLine: (p: Project): string | null =>
    p.variants === null ? null : decompositionLine(p.variants.name),
  workerFailedText: (p: Project, kept: IndividualsKept | null): string =>
    crashText(p, individualsRunOn(p, kept)),
});

/** The placeholder of the panel of the distances between populations,
    its Run button alone, until task 5.2 of the plan of stage 5 draws its
    panel, with the field of the minimum, the radio buttons of the
    measure, the heatmap and the table (docs/specs/analyses/popDists.md,
    "The panel"): a result draws nothing. */
const POP_DISTS: AnalysisUi = Object.freeze({
  title: titleOf("popDists"),
  name: "the distances between populations",
  resultName: "the heatmap and the table",
  plural: true,
  readyLines: (): readonly string[] => [],
  refusalText: popDistsRefusalText,
  statisticsFailedText: (
    error: AnalysisError,
    p: Project,
    failureText: (failure: Failure) => string,
    waited: boolean,
  ): string =>
    statisticsFailedWords(
      error,
      p,
      failureText,
      waited
        ? "the distances between populations were not run"
        : "the distances between populations cannot run",
    ),
  Results: PopDistsPlaceholder,
  Options: null,
  runningLine: (): null => null,
  workerFailedText: null,
});

/** The placeholder of the panel of the LD decay, its Run button alone,
    until task 8.1 of the plan of stage 5 draws its panel
    (docs/plans/population-analyses.md, "Where the specs are thin"): the
    measurements of its memory run it from here, with its options set by
    a project file, and a result draws nothing. */
const LD_DECAY: AnalysisUi = Object.freeze({
  title: titleOf("ldDecay"),
  name: "the LD decay",
  resultName: "the plot and the tables",
  plural: false,
  readyLines: (): readonly string[] => [],
  refusalText: ldDecayRefusalText,
  statisticsFailedText: (
    error: AnalysisError,
    p: Project,
    failureText: (failure: Failure) => string,
    waited: boolean,
  ): string =>
    statisticsFailedWords(
      error,
      p,
      failureText,
      waited ? "the LD decay was not run" : "the LD decay cannot run",
    ),
  Results: LdDecayPlaceholder,
  Options: null,
  runningLine: (): null => null,
  workerFailedText: null,
});

/** The individuals a calculation of the project `p` ran on, those the
    filters of individuals keep, `kept` of the state of the store under
    the same filters as its key: the known list, or every individual of
    the variants file when the filters remove none; those the lists keep
    should the statistics a threshold needs have left the cache since. A
    defect with no variants file read, or no individuals kept, which lock
    the analysis before any calculation. */
function individualsRunOn(p: Project, kept: IndividualsKept | null): number {
  const read = p.variants?.read;
  if (kept === null || read?.kind !== "read") {
    throw new Error(
      "popnei_web defect: the principal components failed with no individuals kept.",
    );
  }
  return kept.list.kind === "known"
    ? (kept.list.individuals?.length ?? read.individuals.length)
    : kept.byLists.length;
}

/** The panel of every analysis of the Analyses step, by its id. */
export const PANELS: ReadonlyMap<AnalysisId, AnalysisUi> = new Map([
  ["pca", PCA],
  ["diversity", DIVERSITY],
  ["popDists", POP_DISTS],
  ["ldDecay", LD_DECAY],
]);

/** The panel of the analysis `id`; a defect when it has none. */
export function panelOf(id: AnalysisId): AnalysisUi {
  const panel = PANELS.get(id);
  if (panel === undefined) {
    throw new Error(`popnei_web defect: the analysis ${id} has no panel.`);
  }
  return panel;
}
