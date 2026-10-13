/**
 * The lines of a live analysis of popgen2.html that reads the
 * populations, the diversity, the LD decay and the distances, that the
 * page says whichever tab is shown, written once from how the page names
 * it, `LiveAnalysisName`, with its verbs and pronouns in its number
 * (docs/specs/steps/popgen2-pca.md, "Several analyses calculated again by
 * themselves"; popgen2-populations.md and popgen2-distances.md, "Run and
 * Stop" and "Its words"): in the status region, its start by itself, its
 * hold after a crash, its Stop and the end of its run. The lines of its
 * tab, of what it waits for, of a Stop, of a crash that holds it and of
 * a failure that ended its live state, are in `liveTabLines.ts`,
 * downloaded with the code of the tabs. Until 13 October 2026 each
 * analysis had its own copy of each, and the distances' plural made them
 * drift. The PCA's are its tab's, which name it by its method and not
 * the populations. Pure, so that a test in node checks them.
 */
import { escaped } from "../../core/project.ts";
import type { AppState } from "../../core/store.ts";
import type { JobResult } from "../../worker/protocol.ts";
import { statusOf } from "./status.ts";
import type { LiveAnalysisName } from "./status.ts";
import { failedText, failedWordsOf } from "./words.ts";
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
export function numberOf(named: LiveAnalysisName): {
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
export function capitalized(words: string): string {
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}

/** The analysis `named` as a title: "Diversity", "LD decay",
    "Distances". */
function titleOf(named: LiveAnalysisName): string {
  return capitalized(named.name.replace(/^the /u, ""));
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
