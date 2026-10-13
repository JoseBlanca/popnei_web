/**
 * The words of the band at the top of popgen2.html
 * (docs/specs/steps/popgen2-band.md, "Its words" and "Its place"): the
 * line after "Popnei" in its whole words and in its short form, which
 * the band shows under 45 em, a screen reader still given the whole;
 * its Stop, by what it stops; and its Stop all, by the analyses it
 * ends. An analysis is named as the page's words name it in the middle
 * of a sentence, "the PCA", "the diversity" (`LiveAnalysisName` of
 * analyses/status.ts), and at the start of the line by the same words,
 * "PCA", "Diversity". The words of an error of the
 * application are the error bar's, `barText` of shell/barSave.ts.
 */
import type { Popgen2LiveId } from "../../core/apps.ts";
import { escaped } from "../../core/project.ts";
import { STOP_RECALCULATING } from "../analyses/AnalysisPanel.tsx";
import { methodName } from "../analyses/pca/words.ts";
import type { LiveAnalysisName } from "../analyses/status.ts";
import { clockText } from "../analyses/words.ts";
import type { AboutToStart } from "../autoRuns.ts";
import type { BandLine, Stopping } from "./bandLine.ts";

/** The page's heading, at the band's left. */
export const PAGE_HEADING = "Popnei";

/** The name of the band for a screen reader. */
export const BAND_NAME = "What the page is doing";

/** The button that shows the count of the errors after the first and
    Copy the details, and hides them. */
export const DETAILS_LABEL = "Details";

/** The button that ends the live state of every live analysis. */
export const STOP_ALL_LABEL = "Stop all";

/** The words of the line, whole and in their short form. */
export interface LineWords {
  /** The whole words: "Statistics of panel.vcf.gz · 45%". */
  readonly full: string;
  /** The short form under 45 em: "Statistics · 45%". */
  readonly short: string;
  /** The whole words split around the name of the file they hold, which
      the band cuts with "…" when the line has no room for it, the rest
      kept whole: "Statistics of ", "panel.vcf.gz", " · 45%"; `null` for
      words that hold no file's name. */
  readonly aroundName: AroundName | null;
  /** The words shown at 45 em and wider when they are not the whole
      words, which a screen reader is then still given: with two or more
      analyses waiting after the one running, the next and the count of
      the others, "PCA running · 0:00 · then the diversity and 2 more",
      so that the line keeps to one row (13 October 2026); absent when
      the whole words are shown. */
  readonly shownWide?: string;
}

/** The whole words of a line split around the name of a file. */
export interface AroundName {
  /** The words before the name: "Statistics of ". */
  readonly before: string;
  /** The name: "panel.vcf.gz". */
  readonly name: string;
  /** The words after it: " · 45%", or "…". */
  readonly after: string;
}

/** The Stop that follows the words of a line. */
export interface BandStop {
  /** Its words: "Stop", or "Stop recalculating" for an analysis about
      to start. */
  readonly label: string;
  /** Its name for a screen reader, by what it stops: "Stop the PCA". */
  readonly name: string;
  /** What it stops: the one pass, "pass", the box's Stop; or an analysis
      that can be live, by its id, running, its tab's Stop, or about to
      start, its tab's Stop recalculating; both end its live state. */
  readonly stops: "pass" | Popgen2LiveId;
  /** Whether the band draws it only at 45 em wide and more, and not
      at all while narrow (narrow.ts): a Stop recalculating beside Stop
      all, which under 45 em the line has no room for beside the short
      form, as the owner chose on 12 October 2026; its tab keeps its
      own, and Stop all ends it with the others. */
  readonly wideOnly: boolean;
}

/** The Stop all that follows the words of a line, beside its Stop. */
export interface BandStopAll {
  /** Its words, "Stop all". */
  readonly label: string;
  /** Its name for a screen reader, with the analyses it ends: "Stop all:
      the PCA and the diversity". */
  readonly name: string;
}

/**
 * The words of `line`, with the clock of a live analysis running at
 * `seconds`; `null` for a line that says nothing.
 */
export function lineWords(line: BandLine, seconds: number): LineWords | null {
  switch (line.kind) {
    case "nothing":
      return null;
    case "reading":
      // The one pass, named as the box names it, "Calculating the
      // statistics of panel.nei…".
      return namedWords(
        "Statistics of ",
        escaped(line.name),
        withShare("", line.share),
        withShare("Statistics", line.share),
      );
    case "running": {
      const title = titleOf(line.named);
      const clock = clockText(seconds);
      const start = `${title} running · ${clock}`;
      const [next, ...others] = line.then;
      const words = {
        full:
          next === undefined
            ? start
            : `${start} · then ${joined(line.then.map((one) => one.name))}`,
        short: `${title} · ${clock}`,
        aroundName: null,
      };
      return next === undefined || others.length === 0
        ? words
        : {
            ...words,
            shownWide: `${start} · then ${next.name} and ${String(others.length)} more`,
          };
    }
    case "writing":
      return namedWords(
        "Writing ",
        escaped(line.name),
        withShare("", line.share),
        withShare("Writing", line.share),
      );
    case "stopping":
      return stoppingWords(line.what);
    case "aboutToStart":
      return aboutToStartWords(line.named, line.waitsFor);
    case "result":
      return resultWords(line.named, line.warnings);
  }
}

/**
 * The Stop after the words of `line`, or `null` when it has none: the
 * Stop of the one pass, "Stop the statistics of panel.vcf.gz"; of an
 * analysis running, "Stop the PCA"; while one analysis alone is about to
 * start, "Stop recalculating", named "Stop recalculating the PCA". "PCoA"
 * under the PCoA. None for an analysis while its tab, which shows its
 * own, is shown, nor for several about to start, which Stop all ends.
 * A Stop recalculating beside Stop all is shown at 45 em and wider
 * only, `wideOnly`.
 */
export function stopOf(line: BandLine): BandStop | null {
  switch (line.kind) {
    case "nothing":
    case "writing":
    case "stopping":
    case "result":
      return null;
    case "reading":
      return {
        label: "Stop",
        name: `Stop the statistics of ${escaped(line.name)}`,
        stops: "pass",
        wideOnly: false,
      };
    case "running":
      if (!line.withStop) return null;
      return {
        label: "Stop",
        name: `Stop ${line.named.name}`,
        stops: line.id,
        wideOnly: false,
      };
    case "aboutToStart": {
      const [only] = line.named;
      const [onlyId] = line.ids;
      if (!line.withStop || only === undefined || onlyId === undefined) {
        return null;
      }
      return {
        label: STOP_RECALCULATING,
        name: `Stop recalculating ${only.name}`,
        stops: onlyId,
        wideOnly: line.stopAll !== null,
      };
    }
  }
}

/** The Stop all after the words of `line`, or `null` when it has none:
    while two or more analyses are live and one of them runs, waits or is
    about to start, named by those it ends, "Stop all: the PCA and the
    diversity". */
export function stopAllOf(line: BandLine): BandStopAll | null {
  if (line.kind !== "running" && line.kind !== "aboutToStart") return null;
  if (line.stopAll === null) return null;
  return {
    label: STOP_ALL_LABEL,
    name: `${STOP_ALL_LABEL}: ${joined(line.stopAll.map((one) => one.name))}`,
  };
}

/** The analysis `named` at the start of a line: "PCA", "PCoA",
    "Diversity". */
function titleOf(named: LiveAnalysisName): string {
  return capitalized(named.name.replace(/^the /u, ""));
}

/** `words` with its first letter in capitals. */
function capitalized(words: string): string {
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}

/** The analyses `names`, in their order, as a sentence names them: "the
    PCA", "the PCA and the diversity", "the PCA, the diversity and the LD
    decay". */
function joined(names: readonly string[]): string {
  const last = names.at(-1) ?? "";
  return names.length < 2
    ? last
    : `${names.slice(0, -1).join(", ")} and ${last}`;
}

/** The words of the analyses `named`, one or more, about to start,
    waiting for `waitsFor`, as their tabs say it: "The PCA starts in a
    moment", "The PCA and the diversity start in a moment"; after a
    crash, "The PCA starts after the next change"; under the dialog of
    the download, "… starts after the download", shorter than the
    tabs' "… starts again when the download is written or closed.",
    which beside Stop recalculating and Stop all took 831 px of the
    736 of the line at its widest (the review of work package 4, 12
    October 2026). */
function aboutToStartWords(
  named: readonly LiveAnalysisName[],
  waitsFor: AboutToStart,
): LineWords {
  const [only] = named;
  const one = named.length === 1 && only !== undefined;
  const subject = capitalized(joined(named.map((each) => each.name)));
  // One analysis named in the plural, "the distances", takes the verb
  // of several.
  const verb = one && !only.plural ? "starts" : "start";
  const who = one ? titleOf(only) : "Analyses";
  const [first, ...others] = named;
  // More than two: the first and the count of the others shown, so that
  // the line keeps to one row at 45 em (13 October 2026).
  const counted =
    first !== undefined && others.length >= 2
      ? `${capitalized(first.name)} and ${String(others.length)} more`
      : null;
  const words = (rest: string, shortRest: string): LineWords => ({
    full: `${subject} ${verb} ${rest}`,
    short: `${who} ${shortRest}`,
    aroundName: null,
    ...(counted !== null && { shownWide: `${counted} ${verb} ${rest}` }),
  });
  switch (waitsFor) {
    case "download":
      return words("after the download", "later");
    case "afterCrash":
      return words("after the next change", "later");
    // Behind another calculation the line names the one running; the
    // band says so only when that one is not live, as the one pass.
    case "behind":
    case "changes":
      return words("in a moment", "soon");
  }
}

/** The words of the link to the tab of `named`: its `warnings`, or,
    `null`, that it could not be calculated. */
function resultWords(
  named: LiveAnalysisName,
  warnings: number | null,
): LineWords {
  const title = titleOf(named);
  const what =
    warnings === null
      ? "could not be calculated"
      : `${String(warnings)} ${warnings === 1 ? "warning" : "warnings"}`;
  return {
    full: `${title}: ${what}, in the ${named.tab} tab`,
    short: warnings === null ? `${title}: failed` : `${title}: ${what}`,
    aroundName: null,
  };
}

/** The words of a Stop under way of `what`. */
function stoppingWords(what: Stopping): LineWords {
  const short = "Stopping…";
  switch (what.kind) {
    case "pca":
      return {
        full: `Stopping the ${methodName(what.method)}…`,
        short,
        aroundName: null,
      };
    case "reading":
      return namedWords(
        "Stopping the statistics of ",
        escaped(what.name),
        "…",
        short,
      );
    case "analysis":
      return { full: `Stopping ${what.name}…`, short, aroundName: null };
  }
}

/** The words `before`, the name of a file `name` and the words `after`,
    whole, with `short`, their short form. */
function namedWords(
  before: string,
  name: string,
  after: string,
  short: string,
): LineWords {
  return {
    full: `${before}${name}${after}`,
    short,
    aroundName: { before, name, after },
  };
}

/** `words` followed by the share, " · 45%", when there is one. */
function withShare(words: string, share: number | null): string {
  return share === null ? words : `${words} · ${String(share)}%`;
}
