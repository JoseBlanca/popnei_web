/**
 * The lines of the tab of a live analysis of popgen2.html that reads the
 * populations, the diversity, the LD decay and the distances, in the
 * place of its bar: what it waits for, a Stop, a crash that holds it and
 * a failure that ended its live state, written once from how the page
 * names it, `LiveAnalysisName`, in its number, by `numberOf` of
 * `liveLines.ts` (docs/specs/steps/popgen2-populations.md and
 * popgen2-distances.md, "Run and Stop" and "Its words"). Apart from the
 * lines of the status region, which the page says before any tab is
 * shown, so that it is downloaded with the code of the tabs and not
 * with the page (the review of the merge of the LD decay and the
 * distances, 13 October 2026). Pure, so that a test in node checks
 * them.
 */
import type { AboutToStart, LiveState } from "../autoRuns.ts";
import type { PanelLive } from "./AnalysisPanel.tsx";
import { capitalized, numberOf } from "./liveLines.ts";
import type { LiveAnalysisName, RunWithheld } from "./status.ts";
import { runningUntilEnd } from "./words.ts";

/** The end of a line that names the Run its tab offers: "Run calculates
    it and starts it again after each change." */
function runStartsIt(named: LiveAnalysisName): string {
  const { it } = numberOf(named);
  return `Run calculates ${it} and starts ${it} again after each change.`;
}

/**
 * The line in the place of the bar while `named` is live, does not run,
 * and is about to start, waiting for `waits`, with `before` the live
 * analysis the line names, `null` for none: "behind", the analysis that
 * runs, "The diversity starts once the PCA, which is running, ends.";
 * "changes", the quiet second, "The diversity starts after the PCA, once
 * the filters, the options and the populations stop changing." with one
 * about to start before it, or "The diversity starts in a moment, later
 * if the filters, its options or the populations change."; "download",
 * "The diversity starts again when the download is written or closed.";
 * "afterCrash", `afterCrashLine`.
 */
export function waitingLine(
  named: LiveAnalysisName,
  waits: AboutToStart,
  before: LiveAnalysisName | null,
): string {
  const { starts, its } = numberOf(named);
  const subject = `${capitalized(named.name)} ${starts}`;
  const inAMoment = `${subject} in a moment, later if the filters, ${its} options or the populations change.`;
  switch (waits) {
    case "behind":
      return before === null
        ? inAMoment
        : `${subject} once ${runningUntilEnd(before)}.`;
    case "changes":
      return before === null
        ? inAMoment
        : `${subject} after ${before.name}, once the filters, the options and the populations stop changing.`;
    case "download":
      return `${subject} again when the download is written or closed.`;
    case "afterCrash":
      return afterCrashLine(named);
  }
}

/** The line in the place of the bar while a crash of the worker, which
    ended another live state, holds `named` until the next change or a
    Run, which the tab then offers beside Stop recalculating. */
export function afterCrashLine(named: LiveAnalysisName): string {
  const { starts, its } = numberOf(named);
  return `${capitalized(named.name)} ${starts} after the next change of the filters, of ${its} options or of the populations, or when Run is pressed.`;
}

/** The line after a Stop of `named`, until Run or another variants
    file, in the place of the bar; with no Run until a change,
    `noRunYet`, the result shown or popnei's refusal, the Run of after
    the next change. */
export function stoppedLine(
  named: LiveAnalysisName,
  noRunYet: boolean,
): string {
  const { starts, itself } = numberOf(named);
  const stopped = `Stopped: ${named.name} no longer ${starts} by ${itself} after a change.`;
  return noRunYet
    ? `${stopped} After the next change, ${runStartsIt(named)}`
    : `${stopped} ${runStartsIt(named)}`;
}

/** The line after a failure that ended the live state of `named`, under
    the failure's words, until Run or another variants file, in the
    place of the bar; the user pressed no Stop. While the tab offers Run,
    `withheld` `null`, that Run; when it offers none, what brings it
    back: after the variants file could no longer be read, its opening
    again; with a result shown or popnei's refusal, the next change (the
    review of the LD decay, 12 October 2026: the line named a Run that
    was not there). */
export function failureEndedLine(
  named: LiveAnalysisName,
  withheld: RunWithheld,
): string {
  const { starts, itself, its } = numberOf(named);
  const ended = `${capitalized(named.name)} no longer ${starts} by ${itself} after a change, since ${its} calculation failed.`;
  switch (withheld) {
    case null:
      return `${ended} ${runStartsIt(named)}`;
    case "unreadable":
      return `${ended} Once the variants file is opened again in the box Variants, ${runStartsIt(named)}`;
    case "result":
    case "refused":
      return `${ended} After the next change, ${runStartsIt(named)}`;
  }
}

/** The live state `state` of `named` as its panel draws it, with
    `before`, the live analysis its line of waiting names, or `null`,
    and why its state offers no Run, `withheld`, `runWithheldOf` of its
    status: the line of a Stop, of a failure that ended it, given by
    `failureEnded`, or of what it waits for while it is about to start;
    the first two name a Run only while the state offers it. */
export function panelLive(
  named: LiveAnalysisName,
  state: LiveState,
  before: LiveAnalysisName | null,
  withheld: RunWithheld,
  failureEnded: (withheld: RunWithheld) => string = (why) =>
    failureEndedLine(named, why),
): PanelLive {
  switch (state.kind) {
    case "off":
      return { kind: "off" };
    case "stopped":
      return { kind: "stopped", line: stoppedLine(named, withheld !== null) };
    case "endedByFailure":
      return { kind: "stopped", line: failureEnded(withheld) };
    case "live":
      return {
        kind: "live",
        aboutToStartLine:
          state.aboutToStart === null
            ? null
            : waitingLine(named, state.aboutToStart, before),
        runBeside: state.aboutToStart === "afterCrash",
      };
  }
}
