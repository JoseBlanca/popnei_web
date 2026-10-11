/**
 * The words of the band at the top of popgen2.html
 * (docs/specs/steps/popgen2-band.md, "Its words" and "Its place"): the
 * line after "Popnei" in its whole words and in its short form, which
 * the band shows under 30 rem, a screen reader still given the whole;
 * and its Stop, by what it stops. The words of an error of the
 * application are the error bar's, `barText` of shell/barSave.ts.
 */
import { escaped } from "../../core/project.ts";
import type { PcaMethod } from "../../worker/protocol.ts";
import { STOP_RECALCULATING } from "../analyses/AnalysisPanel.tsx";
import { methodName } from "../analyses/pca/words.ts";
import { clockText } from "../analyses/words.ts";
import type { BandLine, Stopping } from "./bandLine.ts";

/** The page's heading, at the band's left. */
export const PAGE_HEADING = "Popnei";

/** The name of the band for a screen reader. */
export const BAND_NAME = "What the page is doing";

/** The button that shows the count of the errors after the first and
    Copy the details, and hides them. */
export const DETAILS_LABEL = "Details";

/** The words of the line, whole and in their short form. */
export interface LineWords {
  /** The whole words: "Statistics of panel.vcf.gz · 45%". */
  readonly full: string;
  /** The short form under 30 rem: "Statistics · 45%". */
  readonly short: string;
}

/** The Stop that follows the words of a line. */
export interface BandStop {
  /** Its words: "Stop", or "Stop recalculating" for the PCA about to
      start. */
  readonly label: string;
  /** Its name for a screen reader, by what it stops: "Stop the PCA". */
  readonly name: string;
  /** What it stops: the one pass, the box's Stop; the PCA running, the
      PCA tab's Stop; or the PCA about to start, the PCA tab's Stop
      recalculating. Both of the PCA end its live state. */
  readonly stops: "pass" | "pca" | "live";
}

/**
 * The words of `line`, with the clock of a PCA running at `seconds`;
 * `null` for a line that says nothing.
 */
export function lineWords(line: BandLine, seconds: number): LineWords | null {
  switch (line.kind) {
    case "nothing":
      return null;
    case "reading":
      // The one pass, named as the box names it, "Calculating the
      // statistics of panel.nei…".
      return {
        full: withShare(`Statistics of ${escaped(line.name)}`, line.share),
        short: withShare("Statistics", line.share),
      };
    case "pcaRunning": {
      const name = methodName(line.method);
      const clock = clockText(seconds);
      return {
        full: `${name} running · ${clock}`,
        short: `${name} · ${clock}`,
      };
    }
    case "writing":
      return {
        full: withShare(`Writing ${escaped(line.name)}`, line.share),
        short: withShare("Writing", line.share),
      };
    case "stopping":
      return { full: stoppingWords(line.what), short: "Stopping…" };
    case "aboutToStart": {
      const name = methodName(line.method);
      // The words of the PCA tab's line of the quiet second, and, while
      // the dialog of the download holds the start, of that dialog's.
      return line.waitsFor === "download"
        ? {
            full: `The ${name} starts again when the download is written or closed`,
            short: `${name} later`,
          }
        : line.waitsFor === "afterCrash"
          ? {
              full: `The ${name} starts again after the next change`,
              short: `${name} later`,
            }
          : {
              full: `The ${name} starts again in a moment`,
              short: `${name} soon`,
            };
    }
    case "result":
      return resultWords(line.method, line.warnings);
  }
}

/**
 * The Stop after the words of `line`, or `null` when it has none: the
 * Stop of the one pass, "Stop the statistics of panel.vcf.gz"; of the PCA running,
 * "Stop the PCA"; while the PCA is about to start, "Stop
 * recalculating", named "Stop recalculating the PCA". "PCoA" under the
 * PCoA. None for the PCA while the PCA tab, which shows its own, is
 * shown.
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
      };
    case "pcaRunning":
      if (!line.withStop) return null;
      return {
        label: "Stop",
        name: `Stop the ${methodName(line.method)}`,
        stops: "pca",
      };
    case "aboutToStart":
      return line.withStop ? recalculating(line.method) : null;
  }
}

/** Stop recalculating, named by the method `method`. */
function recalculating(method: PcaMethod): BandStop {
  return {
    label: STOP_RECALCULATING,
    name: `Stop recalculating the ${methodName(method)}`,
    stops: "live",
  };
}

/** The words of the link to the PCA tab: its `warnings`, or, `null`,
    that it could not be calculated. */
function resultWords(method: PcaMethod, warnings: number | null): LineWords {
  const name = methodName(method);
  const what =
    warnings === null
      ? "could not be calculated"
      : `${String(warnings)} ${warnings === 1 ? "warning" : "warnings"}`;
  return {
    full: `${name}: ${what}, in the PCA tab`,
    short: warnings === null ? `${name}: failed` : `${name}: ${what}`,
  };
}

/** The whole words of a Stop under way of `what`. */
function stoppingWords(what: Stopping): string {
  switch (what.kind) {
    case "pca":
      return `Stopping the ${methodName(what.method)}…`;
    case "reading":
      return `Stopping the statistics of ${escaped(what.name)}…`;
    case "analysis":
      return `Stopping the calculation of ${what.title}…`;
  }
}

/** `words` followed by the share, "· 45%", when there is one. */
function withShare(words: string, share: number | null): string {
  return share === null ? words : `${words} · ${String(share)}%`;
}
