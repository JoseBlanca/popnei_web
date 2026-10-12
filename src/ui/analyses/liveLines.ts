/**
 * The lines of a live analysis of popgen2.html that reads the
 * populations, the diversity, the LD decay and the distances, written
 * once from how the page names it, `LiveAnalysisName`, with its verbs and
 * pronouns in its number (docs/specs/steps/popgen2-pca.md, "Several
 * analyses calculated again by themselves"; popgen2-populations.md and
 * popgen2-distances.md, "Run and Stop" and "Its words"): in its tab, the
 * line of what it waits for, of a Stop, of a crash that holds it and of
 * a failure that ended its live state; in the status region, its start
 * by itself, its hold after a crash, its Stop and the end of its run.
 * Until 13 October 2026 each analysis had its own copy of each, and the
 * distances' plural made them drift. The PCA's are its tab's, which name
 * it by its method and not the populations. Pure, so that a test in node
 * checks them.
 */
import { escaped } from "../../core/project.ts";
import type { AppState } from "../../core/store.ts";
import type { JobResult } from "../../worker/protocol.ts";
import type { AboutToStart, LiveState } from "../autoRuns.ts";
import type { PanelLive } from "./AnalysisPanel.tsx";
import { statusOf } from "./status.ts";
import type { LiveAnalysisName, RunWithheld } from "./status.ts";
import { failedText, failedWordsOf, runningUntilEnd } from "./words.ts";
import type { PanelErrorWords } from "./words.ts";

/** What the lines of a live analysis that reads the populations are
    written from: how the page names it, and the words of its end in the
    status region. */
export interface LiveLines {
  /** How the page names it, in its tab and its number. */
  readonly named: LiveAnalysisName;
  /** Its name in the status region's start and errors, "the distances
      between populations", which may be longer than `named.name`. */
  readonly longName: string;
  /** Its name before the variants file at the end of its run, "the
      distances between the populations of", "the diversity of". */
  readonly ofFile: string;
  /** The words of its errors, which the end of a failed run says. */
  readonly errors: PanelErrorWords;
}

/** The words of `named` in its number: its verb "starts" or "start",
    its pronoun "it" or "them", its possessive "its" or "their" and its
    reflexive "itself" or "themselves". */
function numberOf(named: LiveAnalysisName): {
  readonly starts: string;
  readonly it: string;
  readonly its: string;
  readonly itself: string;
} {
  return named.plural
    ? { starts: "start", it: "them", its: "their", itself: "themselves" }
    : { starts: "starts", it: "it", its: "its", itself: "itself" };
}

/** `words` with its first letter in capitals. */
function capitalized(words: string): string {
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}

/** The analysis `named` as a title: "Diversity", "LD decay",
    "Distances". */
function titleOf(named: LiveAnalysisName): string {
  return capitalized(named.name.replace(/^the /u, ""));
}

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

/** What the status region says when the analysis of `lines` starts
    again by itself, alone in its round, with the tab where it is
    stopped and what it locks, the filters and the populations:
    "Calculating the diversity again. To change the filters or the
    populations, stop it in the Populations tab." */
export function startedByItselfText(lines: LiveLines): string {
  return `Calculating ${lines.longName} again. To change the filters or the populations, stop ${numberOf(lines.named).it} in the ${lines.named.tab} tab.`;
}

/** What the status region says when a crash of the worker that ended
    another live state holds `named`, about to start, until the next
    change or its Run (docs/specs/steps/popgen2-pca.md, "A failure that
    ends a live state"). */
export function heldAfterCrashText(named: LiveAnalysisName): string {
  const { starts, its } = numberOf(named);
  const they = named.plural ? "they" : "it";
  return `${capitalized(named.name)} did not start: ${they} ${starts} after the next change of the filters, of ${its} options or of the populations, or when Run is pressed in the ${named.tab} tab.`;
}

/** What the status region says at a Stop of `named`, in its tab or in
    the band, which may leave the tab out of sight: "Diversity stopped.
    Press Run in the Populations tab to calculate it again." when the tab
    then offers Run, `runOffered`; "Diversity stopped." alone when it
    does not, Run disabled by a lock or the result shown with no
    button. */
export function stoppedText(
  named: LiveAnalysisName,
  runOffered: boolean,
): string {
  const stopped = `${titleOf(named)} stopped.`;
  return runOffered
    ? `${stopped} Press Run in the ${named.tab} tab to calculate ${numberOf(named).it} again.`
    : stopped;
}

/**
 * What the status region says as the store goes from `before` to
 * `after`, when a run of the analysis of `lines` ends, whichever tab is
 * shown: "Diversity of panel.nei calculated."; "The diversity of
 * panel.nei could not be calculated: " and the words of its error, as
 * the tab draws them. `null` for any other change: a run stopped, or
 * left behind by a change, ends with no result and no error, and its
 * Stop is said apart.
 */
export function endAnnouncement(
  lines: LiveLines,
  before: AppState<JobResult, unknown>,
  after: AppState<JobResult, unknown>,
): string | null {
  const id = lines.named.id;
  const then = statusOf(before, id);
  const now = statusOf(after, id);
  const variants = after.project.variants;
  if (then.kind !== "running" || variants === null) return null;
  const name = escaped(variants.name);
  switch (now.kind) {
    case "done":
      return `${capitalized(lines.ofFile.replace(/^the /u, ""))} ${name} calculated.`;
    case "error":
      return `${capitalized(lines.ofFile)} ${name} could not be calculated: ${failedText(
        now.error,
        after.project,
        lines.longName,
        // Live: a run on this page is one, and a refusal that would end
        // it, for memory, does not read it.
        failedWordsOf(lines.errors, now, after.individualsKept, true),
      )}`;
    case "locked":
    case "ready":
    case "removed":
    case "running":
      return null;
  }
}
