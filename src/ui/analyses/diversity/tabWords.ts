/**
 * The words of the Populations tab of popgen2.html around its options
 * (docs/specs/steps/popgen2-populations.md, "The populations it runs
 * on", "Run and Stop", "The result" and "Its words"): its name in a
 * sentence; the line of the populations it will run on, read
 * from `popgen2PopulationsKept` of core, the one function every part of
 * the tab that counts the populations reads, so that the line and the
 * table never disagree; the locks of Run by the one pass; the line of a
 * Stop; and the words of its errors, in this page's words. Its heading
 * is in `tabLoadWords.ts`, which the page loads first. The sentence of the
 * caption of the table that counts the unclassified is with the words of
 * the result, in `resultWords.ts`. Pure, so that a test
 * in node checks them; `populationsTabPanel` and the result draw them.
 */

import { diversityOptions, drawOf } from "../../../core/analyses/diversity.ts";
import { popgen2OnePopulationLine } from "../../../core/analyses/diversityOnePopulation.ts";
import type { IndividualsKept } from "../../../core/individualsKept.ts";
import {
  counted,
  escaped,
  namesOf,
  popgen2OnePopulationCause,
  popgen2PopulationsKept,
} from "../../../core/project.ts";
import type { Popgen2PopulationsKept, Project } from "../../../core/project.ts";
import { passLockText } from "../pca/passLock.ts";
import type { PassLock } from "../pca/passLock.ts";
import type { AboutToStart, LiveState } from "../../autoRuns.ts";
import type { PanelLive } from "../AnalysisPanel.tsx";
import type { LiveAnalysisName } from "../status.ts";
import { populationsText, runningUntilEnd } from "../words.ts";
import { minimumAndDrawLines } from "./words.ts";

/** The analysis in the middle of a sentence. */
export const DIVERSITY_TAB_NAME = "the diversity";

/** The line after a Stop, until Run or another variants file, in the
    place of the bar: "Stopped: the diversity no longer starts by itself
    after a change. Run calculates it and starts it again after each
    change."; with the result shown, `resultShown`, which offers no Run
    until a change takes it away, "… After the next change, Run
    calculates it and starts it again after each change." */
export function diversityStoppedLine(resultShown: boolean): string {
  const stopped =
    "Stopped: the diversity no longer starts by itself after a change.";
  return resultShown
    ? `${stopped} After the next change, Run calculates it and starts it again after each change.`
    : `${stopped} Run calculates it and starts it again after each change.`;
}

/** The line in the place of the bar while a crash of the worker, which
    ended another live state, holds the diversity until the next change
    or a Run, which the tab then offers beside Stop recalculating. */
export const DIVERSITY_AFTER_CRASH_LINE =
  "The diversity starts after the next change of the filters, of its options or of the populations, or when Run is pressed.";

/** The line after a failure that ended the live state, under the
    failure's words, until Run or another variants file, in the place of
    the bar; the user pressed no Stop. */
export const DIVERSITY_FAILURE_ENDED_LINE =
  "The diversity no longer starts by itself after a change, since its calculation failed. Run calculates it and starts it again after each change.";

/** The populations of `p` a run will take with the individuals kept
    `kept`: with their list when it is known, and before the thresholds,
    by the lists to keep and to remove alone, while a threshold waits for
    the statistics of the one pass; `null` when none can be made. */
function populationsOf(
  p: Project,
  kept: IndividualsKept,
): Popgen2PopulationsKept | null {
  return popgen2PopulationsKept(
    p,
    kept.list.kind === "known" ? kept.list.individuals : kept.byLists,
  );
}

/** The line of the unclassified left out: "7 unclassified individuals
    kept are left out, as the box Individuals says." */
function unclassifiedLine(numLeftOut: number): string {
  return numLeftOut === 1
    ? "1 unclassified individual kept is left out, as the box Individuals says."
    : `${counted(numLeftOut, "unclassified individual")} kept are left out, as the box Individuals says.`;
}

/** The populations the thresholds of the individuals leave empty, which
    a run leaves out, and what to do: "p9 has no individual left after
    the thresholds of the individuals, and is left out. Loosen the
    thresholds of the individuals in the Variants tab to keep it." */
function emptiedLine(emptied: readonly string[]): string {
  const one = emptied.length === 1;
  return `${namesOf(emptied)} ${one ? "has" : "have"} no individual left after the thresholds of the individuals, and ${one ? "is" : "are"} left out. Loosen the thresholds of the individuals in the Variants tab to keep ${one ? "it" : "them"}.`;
}

/**
 * The lines under the options, of what Run will take, in `p` with the
 * individuals kept `kept`: the populations with the individuals kept of
 * each, "3 populations: p0, 48 individuals; …", or the one population,
 * "1 population, Unclassified: 200 individuals. …", with why when the
 * individuals file or its column is the cause; the unclassified left
 * out; the populations under the minimum and those that hold fewer
 * chromosomes than the draw; those the thresholds of the individuals
 * leave empty; and, while a threshold waits for the one pass, that it
 * may take individuals from the populations named, which are then those
 * before the thresholds. None with no individuals kept known, which
 * only a variants file not read or lists popnei would refuse give.
 */
export function diversityTabReadyLines(
  p: Project,
  kept: IndividualsKept | null,
): readonly string[] {
  if (kept === null || p.variants === null) return [];
  const pops = populationsOf(p, kept);
  if (pops === null) return [];
  const onePopulation = popgen2OnePopulationCause(p) !== null;
  const [first] = pops.pops;
  const numCalledAlleles = drawOf(p);
  const read = p.variants.read;
  const draw =
    numCalledAlleles === null || read.kind !== "read"
      ? null
      : { numCalledAlleles, ploidy: read.ploidy };
  return [
    ...(first === undefined
      ? []
      : [
          onePopulation
            ? popgen2OnePopulationLine(p, first[1].length)
            : populationsText(pops.pops),
        ]),
    ...(pops.unclassifiedLeftOut > 0
      ? [unclassifiedLine(pops.unclassifiedLeftOut)]
      : []),
    ...minimumAndDrawLines(
      pops.pops,
      diversityOptions(p).minNumIndividuals,
      onePopulation,
      draw,
    ),
    ...(pops.emptied.length > 0 ? [emptiedLine(pops.emptied)] : []),
    ...(kept.list.kind === "needsStatistics"
      ? [
          `The thresholds of the individuals may take individuals from them once ${escaped(p.variants.name)} is read to the end.`,
        ]
      : []),
  ];
}

/**
 * The lock of Run that the page adds to the store's, in `p`, from the
 * lock of the one pass, `lock` of `passLock`: "Run once panel.nei is read
 * to the end: …", with the diversity named; `null` while the pass locks
 * nothing.
 */
export function diversityTabLock(
  p: Project,
  lock: PassLock | null,
): string | null {
  return lock === null || p.variants === null
    ? null
    : passLockText(lock, p.variants.name, DIVERSITY_TAB_NAME);
}

/**
 * The line in the place of the bar while the diversity is live, does not
 * run, and is about to start, waiting for `waits`, with `before` the
 * live analysis its line names, "the PCA" or "the PCoA", `null` for none
 * (docs/specs/steps/popgen2-populations.md, "Run and Stop", the line in
 * the place of the bar): "behind", the analysis that runs, "The
 * diversity starts once the PCA, which is running, ends."; "changes",
 * the quiet second, "The diversity starts after the PCA, once the
 * filters, the options and the populations stop changing." with one
 * about to start before it, or "The diversity starts in a moment, later
 * if the filters, its options or the populations change.", true also in
 * the quiet second after a Stop of the PCA it waited for, when nothing
 * changed; "download", "The diversity starts again when the download is
 * written or closed."; "afterCrash", `DIVERSITY_AFTER_CRASH_LINE`.
 */
export function diversityWaitingLine(
  waits: AboutToStart,
  before: LiveAnalysisName | null,
): string {
  const inAMoment =
    "The diversity starts in a moment, later if the filters, its options or the populations change.";
  switch (waits) {
    case "behind":
      return before === null
        ? inAMoment
        : `The diversity starts once ${runningUntilEnd(before)}.`;
    case "changes":
      return before === null
        ? inAMoment
        : `The diversity starts after ${before.name}, once the filters, the options and the populations stop changing.`;
    case "download":
      return "The diversity starts again when the download is written or closed.";
    case "afterCrash":
      return DIVERSITY_AFTER_CRASH_LINE;
  }
}

/** The live state `state` of the diversity as its panel draws it, with
    `before`, the live analysis its line of waiting names, "the PCA",
    or `null`, and whether its result is shown, `resultShown`: the line
    of a Stop, of a failure that ended it, or of what it waits for while
    it is about to start. */
export function diversityPanelLive(
  state: LiveState,
  before: LiveAnalysisName | null,
  resultShown: boolean,
): PanelLive {
  switch (state.kind) {
    case "off":
      return { kind: "off" };
    case "stopped":
      return { kind: "stopped", line: diversityStoppedLine(resultShown) };
    case "endedByFailure":
      return { kind: "stopped", line: DIVERSITY_FAILURE_ENDED_LINE };
    case "live":
      return {
        kind: "live",
        aboutToStartLine:
          state.aboutToStart === null
            ? null
            : diversityWaitingLine(state.aboutToStart, before),
        runBeside: state.aboutToStart === "afterCrash",
      };
  }
}
