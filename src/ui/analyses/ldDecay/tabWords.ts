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
  popgen2OnePopulationCause,
  popgen2PopulationsKept,
} from "../../../core/project.ts";
import type { Project } from "../../../core/project.ts";
import type { AboutToStart, LiveState } from "../../autoRuns.ts";
import type { PanelLive } from "../AnalysisPanel.tsx";
import type { RunWithheld } from "../status.ts";
import { emptiedLine, unclassifiedLine } from "../diversity/tabWords.ts";
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
  const stopped =
    "Stopped: the LD decay no longer starts by itself after a change.";
  return noRunYet
    ? `${stopped} After the next change, Run calculates it and starts it again after each change.`
    : `${stopped} Run calculates it and starts it again after each change.`;
}

/** The line in the place of the bar while a crash of the worker, which
    ended another live state, holds the LD decay until the next change
    or a Run, which the tab then offers beside Stop recalculating. */
export const LD_DECAY_AFTER_CRASH_LINE =
  "The LD decay starts after the next change of the filters, of its options or of the populations, or when Run is pressed.";

/** The start of the line after a failure that ended the live state. */
const FAILURE_ENDED =
  "The LD decay no longer starts by itself after a change, since its calculation failed.";

/** The end of a line that names the Run the tab offers. */
const RUN_STARTS_IT =
  "Run calculates it and starts it again after each change.";

/** The line after a failure that ended the live state, under the
    failure's words, until Run or another variants file, while the tab
    offers Run. */
export const LD_DECAY_FAILURE_ENDED_LINE = `${FAILURE_ENDED} ${RUN_STARTS_IT}`;

/** The line after a failure that ended the live state, as
    `LD_DECAY_FAILURE_ENDED_LINE`, when the tab offers no Run, `withheld`:
    after popnei's refusal for memory, the changes the refusal asks for;
    after the variants file could no longer be read, its opening again;
    with a result shown, the next change (the review of the LD decay, 12
    October 2026: the line named a Run that was not there). */
export function ldDecayFailureEndedLine(withheld: RunWithheld): string {
  switch (withheld) {
    case null:
      return LD_DECAY_FAILURE_ENDED_LINE;
    case "refused":
      return "The LD decay no longer starts by itself after a change, since popnei refused it for lack of memory. Once a smaller largest distance is typed, or fewer individuals are kept, Run comes back: it calculates the LD decay and starts it again after each change.";
    case "unreadable":
      return `${FAILURE_ENDED} Once the variants file is opened again in the box Variants, ${RUN_STARTS_IT}`;
    case "result":
      return `${FAILURE_ENDED} After the next change, ${RUN_STARTS_IT}`;
  }
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
    the live analysis its line names, "the PCA", "the diversity", `null`
    for none: the diversity's lines with "The LD decay". */
export function ldDecayWaitingLine(
  waits: AboutToStart,
  before: string | null,
): string {
  const inAMoment =
    "The LD decay starts in a moment, later if the filters, its options or the populations change.";
  switch (waits) {
    case "behind":
      return before === null
        ? inAMoment
        : `The LD decay starts once ${before}, which is running, ends.`;
    case "changes":
      return before === null
        ? inAMoment
        : `The LD decay starts after ${before}, once the filters, the options and the populations stop changing.`;
    case "download":
      return "The LD decay starts again when the download is written or closed.";
    case "afterCrash":
      return LD_DECAY_AFTER_CRASH_LINE;
  }
}

/** The live state `state` of the LD decay as its panel draws it, with
    `before`, the live analysis its line of waiting names, and why its
    state offers no Run, `withheld`, `runWithheldOf` of its status. */
export function ldDecayPanelLive(
  state: LiveState,
  before: string | null,
  withheld: RunWithheld,
): PanelLive {
  switch (state.kind) {
    case "off":
      return { kind: "off" };
    case "stopped":
      return {
        kind: "stopped",
        line: ldDecayStoppedLine(withheld !== null),
      };
    case "endedByFailure":
      return { kind: "stopped", line: ldDecayFailureEndedLine(withheld) };
    case "live":
      return {
        kind: "live",
        aboutToStartLine:
          state.aboutToStart === null
            ? null
            : ldDecayWaitingLine(state.aboutToStart, before),
        runBeside: state.aboutToStart === "afterCrash",
      };
  }
}

/** The time of the last run of the LD decay that ended with a result or
    an error, `seconds` long, as the clock of the bar writes it: "The
    last run took 3:42."; "The last run took less than a second." under
    one. */
export function lastRunText(seconds: number): string {
  return seconds < 1
    ? "The last run took less than a second."
    : `The last run took ${clockText(seconds)}.`;
}
