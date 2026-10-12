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
import {
  DIVERSITY_ONE_POPULATION,
  popgen2OnePopulationLine,
} from "../../../core/analyses/onePopulation.ts";
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
import {
  afterCrashLine,
  failureEndedLine,
  panelLive,
  stoppedLine,
  waitingLine,
} from "../liveLines.ts";
import { DIVERSITY_NAMES } from "../status.ts";
import type { LiveAnalysisName, RunWithheld } from "../status.ts";
import { populationsText } from "../words.ts";
import { minimumAndDrawLines } from "./words.ts";

/** The analysis in the middle of a sentence. */
export const DIVERSITY_TAB_NAME = "the diversity";

/** The line after a Stop, until Run or another variants file, in the
    place of the bar, the Run of after the next change while the state
    offers none, `noRunYet` (`stoppedLine` of liveLines.ts). */
export function diversityStoppedLine(noRunYet: boolean): string {
  return stoppedLine(DIVERSITY_NAMES, noRunYet);
}

/** The line in the place of the bar while a crash of the worker, which
    ended another live state, holds the diversity until the next change
    or a Run, which the tab then offers beside Stop recalculating. */
export const DIVERSITY_AFTER_CRASH_LINE = afterCrashLine(DIVERSITY_NAMES);

/** The line after a failure that ended the live state, under the
    failure's words, until Run or another variants file, in the place of
    the bar, while the tab offers Run; the user pressed no Stop. */
export const DIVERSITY_FAILURE_ENDED_LINE = failureEndedLine(
  DIVERSITY_NAMES,
  null,
);

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
export function unclassifiedLine(numLeftOut: number): string {
  return numLeftOut === 1
    ? "1 unclassified individual kept is left out, as the box Individuals says."
    : `${counted(numLeftOut, "unclassified individual")} kept are left out, as the box Individuals says.`;
}

/** The populations the thresholds of the individuals leave empty, which
    a run leaves out, and what to do: "p9 has no individual left after
    the thresholds of the individuals, and is left out. Loosen the
    thresholds of the individuals in the Variants tab to keep it." */
export function emptiedLine(emptied: readonly string[]): string {
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
            ? popgen2OnePopulationLine(
                p,
                first[1].length,
                DIVERSITY_ONE_POPULATION,
              )
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

/** The line in the place of the bar while the diversity is live, does
    not run, and is about to start, waiting for `waits`, with `before`
    the live analysis its line names, "the PCA" or "the PCoA", `null` for
    none (docs/specs/steps/popgen2-populations.md, "Run and Stop", the
    line in the place of the bar; `waitingLine` of liveLines.ts). */
export function diversityWaitingLine(
  waits: AboutToStart,
  before: LiveAnalysisName | null,
): string {
  return waitingLine(DIVERSITY_NAMES, waits, before);
}

/** The live state `state` of the diversity as its panel draws it, with
    `before`, the live analysis its line of waiting names, and why its
    state offers no Run, `withheld` (`panelLive` of liveLines.ts). */
export function diversityPanelLive(
  state: LiveState,
  before: LiveAnalysisName | null,
  withheld: RunWithheld,
): PanelLive {
  return panelLive(DIVERSITY_NAMES, state, before, withheld);
}
