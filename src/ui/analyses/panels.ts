/**
 * The panel of each analysis, by its id (react.md, "The layout of a
 * screen and of an analysis"): what the frame of `AnalysisPanel.tsx`
 * needs of an analysis beyond the state the store gives, its title, its
 * name in a sentence, the line of its ready state, the words of popnei's
 * refusals, and the component that draws its result. The title is that
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
  populationsToRun,
  refusalText,
} from "../../core/analyses/diversity.ts";
import type { AnalysisId, Project } from "../../core/project.ts";
import type { JobResult } from "../../worker/protocol.ts";
import { DiversityResults } from "./diversity/DiversityResults.tsx";
import { populationsText } from "./diversity/words.ts";
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
  /** The line beside Run in the state ready, what it will run on, or
      `null` for none. */
  readonly readyText: (p: Project) => string | null;
  /** The words of a refusal of popnei, its message given, for the
      project `p`. */
  readonly refusalText: (message: string, p: Project) => string;
  /** Draws the result: its table, its plot, its download. */
  readonly Results: ComponentType<ResultsProps>;
}

/** The panel of the diversity (docs/specs/analyses/diversity.md, "The
    panel"). */
const DIVERSITY: AnalysisUi = Object.freeze({
  title: titleOf("diversity"),
  name: "the diversity",
  resultName: "the table",
  readyText: (p: Project): string | null => {
    const pops = populationsToRun(p);
    return pops === null ? null : populationsText(pops);
  },
  refusalText,
  Results: DiversityResults,
});

/** The panel of every analysis of the Analyses step, by its id. */
export const PANELS: ReadonlyMap<AnalysisId, AnalysisUi> = new Map([
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
