/**
 * The panel of the PCA tab of popgen2.html, as the frame of
 * `AnalysisPanel.tsx` draws it (docs/plans/analyses-pca.md, work package
 * 6): its heading and its name by the method, "PCA" or "PCoA"; the line
 * of the individuals it will run on; its options, `PcaTabOptions`; its
 * result, the parts of the old panel given the definition the store of
 * this page runs, `pcaOnPopgen2`; the line under the bar of a run under
 * way; and its errors in this page's words, which name the box Variants
 * file and the Variants tab.
 */
import { createElement } from "react";

import { pcaOnPopgen2 } from "../../../core/analyses/pca.ts";
import type { Project } from "../../../core/project.ts";
import type { PcaMethod } from "../../../worker/protocol.ts";
import type { AnalysisUi, ResultsProps } from "../panels.ts";
import { PcaResults } from "./PcaResults.tsx";
import { PcaTabOptions } from "./PcaTabOptions.tsx";
import {
  PCA_TAB_ERRORS,
  pcaTabName,
  pcaTabReadyLines,
  pcaTabTitle,
} from "./tabWords.ts";
import { decompositionLine } from "./words.ts";

/** The result of the PCA of the definition the store of popgen2.html
    runs. */
function PcaTabResults(props: ResultsProps): React.JSX.Element {
  return createElement(PcaResults, { ...props, analysis: pcaOnPopgen2 });
}

/** The panel of the PCA tab with the method `method`. */
function panelOf(method: PcaMethod): AnalysisUi {
  return Object.freeze({
    title: pcaTabTitle(method),
    name: pcaTabName(method),
    // The page makes no notice, so the words of a result removed, which
    // name these, are never drawn on it.
    resultName: "the plot and the table",
    plural: false,
    readyLines: pcaTabReadyLines,
    refusalText: PCA_TAB_ERRORS.refusalText,
    statisticsFailedText: PCA_TAB_ERRORS.statisticsFailedText,
    Results: PcaTabResults,
    Options: PcaTabOptions,
    runningLine: (p: Project): string | null =>
      p.variants === null ? null : decompositionLine(p.variants.name),
    workerFailedText: PCA_TAB_ERRORS.workerFailedText,
    failureText: PCA_TAB_ERRORS.failureText,
  });
}

/** The panels of the tab, one for each method, made once, so that the
    frame is given the same object while the method is the same. */
const PANELS: Readonly<Record<PcaMethod, AnalysisUi>> = Object.freeze({
  pca: panelOf("pca"),
  pcoa: panelOf("pcoa"),
});

/** The panel of the PCA tab for the method `method` of the project. */
export function pcaTabPanel(method: PcaMethod): AnalysisUi {
  return PANELS[method];
}
