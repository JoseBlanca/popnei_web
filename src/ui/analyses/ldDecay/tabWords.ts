/**
 * The words of the LD decay in the Populations tab of popgen2.html
 * around its options (docs/specs/steps/popgen2-populations.md, "The LD
 * decay"): its name in a sentence; the line of the populations it will
 * run on, read from `popgen2PopulationsKept` of core, the function the
 * diversity's line reads, so that the two parts of the tab never count
 * other populations; the lock of Run by the one pass; the lines of a
 * Stop, of a failure that ended its live state and of what it waits for;
 * and the time of its last run. Pure, so that a test in node checks
 * them; the panel of the tab draws them.
 */
import {
  LD_DECAY_ONE_POPULATION,
  popgen2OnePopulationLine,
} from "../../../core/analyses/onePopulation.ts";
import type { IndividualsKept } from "../../../core/individualsKept.ts";
import {
  escaped,
  grouped,
  popgen2OnePopulationCause,
  popgen2PopulationsKept,
} from "../../../core/project.ts";
import type { Project } from "../../../core/project.ts";
import type { AboutToStart, LiveState } from "../../autoRuns.ts";
import type { PanelLive } from "../AnalysisPanel.tsx";
import {
  afterCrashLine,
  failureEndedLine,
  panelLive,
  stoppedLine,
  waitingLine,
} from "../liveLines.ts";
import { LD_DECAY_NAMES } from "../status.ts";
import type { LiveAnalysisName, RunWithheld } from "../status.ts";
import type { LastRun } from "./lastRun.ts";
import { emptiedLine, unclassifiedLine } from "../unclassifiedWords.ts";
import { passLockText } from "../pca/passLock.ts";
import type { PassLock } from "../pca/passLock.ts";
import { clockText, populationsText } from "../words.ts";

/** The analysis in the middle of a sentence. */
export const LD_DECAY_TAB_NAME = "the LD decay";

/** The heading of its part of the tab. */
export const LD_DECAY_TAB_TITLE = "LD decay";

/** The line after a Stop, until Run or another variants file, in the
    place of the bar; with no Run until a change, `noRunYet`, the result
    shown or popnei's refusal, the Run of after the next change. */
export function ldDecayStoppedLine(noRunYet: boolean): string {
  return stoppedLine(LD_DECAY_NAMES, noRunYet);
}

/** The line in the place of the bar while a crash of the worker, which
    ended another live state, holds the LD decay until the next change
    or a Run, which the tab then offers beside Stop recalculating. */
export const LD_DECAY_AFTER_CRASH_LINE = afterCrashLine(LD_DECAY_NAMES);

/** The line after a failure that ended the live state, under the
    failure's words, until Run or another variants file, while the tab
    offers Run. */
export const LD_DECAY_FAILURE_ENDED_LINE = failureEndedLine(
  LD_DECAY_NAMES,
  null,
);

/** The line after a failure that ended the live state, as
    `failureEndedLine` of liveLines.ts, but for popnei's refusal for
    memory, which ends it, and after which the changes the refusal asks
    for bring Run back (the review of the LD decay, 12 October 2026). */
export function ldDecayFailureEndedLine(withheld: RunWithheld): string {
  return withheld === "refused"
    ? "The LD decay no longer starts by itself after a change, since popnei refused it for lack of memory. Once a smaller largest distance is typed, or fewer individuals are kept, Run comes back: it calculates the LD decay and starts it again after each change."
    : failureEndedLine(LD_DECAY_NAMES, withheld);
}

/**
 * The lines under the options, of what Run will take, in `p` with the
 * individuals kept `kept`: the populations with the individuals kept of
 * each, or the one population, "1 population, Unclassified: 100
 * individuals. …", with why when the individuals file or its column is
 * the cause and what the mixture does to r²; the unclassified left out;
 * the populations the thresholds of the individuals leave empty; and,
 * while a threshold waits for the one pass, that it may take
 * individuals from them. None with no individuals kept known.
 */
export function ldDecayTabReadyLines(
  p: Project,
  kept: IndividualsKept | null,
): readonly string[] {
  if (kept === null || p.variants === null) return [];
  const pops = popgen2PopulationsKept(
    p,
    kept.list.kind === "known" ? kept.list.individuals : kept.byLists,
  );
  if (pops === null) return [];
  const [first] = pops.pops;
  return [
    ...(first === undefined
      ? []
      : [
          popgen2OnePopulationCause(p) !== null
            ? popgen2OnePopulationLine(
                p,
                first[1].length,
                LD_DECAY_ONE_POPULATION,
              )
            : populationsText(pops.pops),
        ]),
    ...(pops.unclassifiedLeftOut > 0
      ? [unclassifiedLine(pops.unclassifiedLeftOut)]
      : []),
    ...(pops.emptied.length > 0 ? [emptiedLine(pops.emptied)] : []),
    ...(kept.list.kind === "needsStatistics"
      ? [
          `The thresholds of the individuals may take individuals from them once ${escaped(p.variants.name)} is read to the end.`,
        ]
      : []),
  ];
}

/** The lock of Run that the page adds to the store's, from the lock of
    the one pass, `lock`, with the LD decay named; `null` while the pass
    locks nothing. */
export function ldDecayTabLock(
  p: Project,
  lock: PassLock | null,
): string | null {
  return lock === null || p.variants === null
    ? null
    : passLockText(lock, p.variants.name, LD_DECAY_TAB_NAME);
}

/** The line in the place of the bar while the LD decay is live, does
    not run, and is about to start, waiting for `waits`, with `before`
    the live analysis its line names, `null` for none (`waitingLine` of
    liveLines.ts). */
export function ldDecayWaitingLine(
  waits: AboutToStart,
  before: LiveAnalysisName | null,
): string {
  return waitingLine(LD_DECAY_NAMES, waits, before);
}

/** The live state `state` of the LD decay as its panel draws it, with
    `before`, the live analysis its line of waiting names, and why its
    state offers no Run, `withheld`, its line of a failure that ended it
    its own (`ldDecayFailureEndedLine`). */
export function ldDecayPanelLive(
  state: LiveState,
  before: LiveAnalysisName | null,
  withheld: RunWithheld,
): PanelLive {
  return panelLive(
    LD_DECAY_NAMES,
    state,
    before,
    withheld,
    ldDecayFailureEndedLine,
  );
}

/** The time of the last run of the LD decay that ended with a result or
    an error, `last`, as the clock of the bar writes it, with its largest
    distance, which its time grows with: "The last run, pairs up to
    100,000 base pairs, took 3:42."; "… took less than a second." under
    one (the distance from 12 October 2026, the review of the LD
    decay). */
export function lastRunText(last: LastRun): string {
  const { seconds, maxDist } = last;
  const took = seconds < 1 ? "less than a second" : clockText(seconds);
  return maxDist === null
    ? `The last run took ${took}.`
    : `The last run, pairs up to ${grouped(maxDist)} base pairs, took ${took}.`;
}
