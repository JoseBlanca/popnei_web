/**
 * The statistics of the open file on popgen2.html, between the box of
 * the file and the open button, which the owner put at the bottom of the
 * page (docs/plans/file-stats.md, "The design" and "Round 1 with the
 * owner"; steps 3 and 4 of case 2 of docs/use-cases.md). Two parts, each
 * under its heading, both from the result of the summary of the variants
 * file, whose one pass counts the variants and calculates them
 * (docs/plans/live-stats.md, "One pass for the count and the
 * statistics"):
 *
 * - Variants: the histograms of the missing rate, the MAF, the observed
 *   and the expected heterozygosity (unbiased), each with its threshold,
 *   grey when it keeps every variant in their bins; and, for a file whose
 *   variants record their FILTER, the FILTER box, in every state of the
 *   pass (PassedFilterBox.tsx);
 * - Individuals: the histograms of the missing rate and of the observed
 *   heterozygosity of each individual, binned here from popnei's values,
 *   each with its threshold, grey when it keeps every one; and the
 *   download of their table as CSV, which is not drawn, since there may
 *   be thousands of individuals.
 *
 * Plain, as the owner wants this page: no mean in the titles, no table of
 * the bins, and no bar nor button of its own: the bar of the pass, its
 * Stop and Start again are in the box of the file. Each part says, over
 * its plots, that it is calculated, with the share done, or that it was
 * stopped; once the pass failed, whose words the box says, a short line
 * in place of its plots. When another file is opened with the focus in
 * the section, the focus goes to the open button.
 *
 * The plots fill in while the pass runs (docs/plans/live-stats.md, "The
 * plots so far"): from the first result so far of the pass, about two
 * seconds after its start, they are drawn from the last one, the words of
 * each plot saying they are so far, and at the end from the result,
 * where they were: the line of the pass keeps its room, hidden, once it
 * ended. While the pass runs, or is about to, and before the first
 * result so far, the room of the plots is kept, hidden, so that the
 * FILTER box at the end of the variants and the part of the individuals
 * do not move down by 574 pixels at 1280 as the plots arrive, where a
 * user may be about to click or have the focus (the review of work
 * package 7 of docs/plans/filters.md, 8 October 2026). The download of
 * the table of the individuals comes with the result alone, and moves the
 * open button down by its height.
 *
 * The code of the plots, with D3, SectionPlots.tsx, is downloaded apart
 * from the page's, from the moment a file is picked, so that the page's
 * first download does not carry it. The section itself, its parts, its
 * lines and the FILTER box, is the page's, and is drawn from the read of
 * the file, the code of the plots there or not: so the FILTER box is one
 * element from the read on, and a keyboard user's focus on it stays when
 * that code arrives. While it downloads, a part whose plots would be
 * drawn says that it is calculated, over the room of its plots, and the
 * status region says nothing of the statistics. A download that fails is
 * caught by the boundary of StatsSection.tsx, which gives it to the error
 * bar, whose words say to reload the page; the next file picked asks for
 * it again, which WebKit 26.6 downloads, and Chromium 153 does not,
 * keeping the failure until the page is reloaded.
 */
import {
  Suspense,
  lazy,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { DEFAULT_MAX_MISSING_RATE } from "../../core/apps.ts";

import type { AnalysisStatus } from "../../core/store.ts";
import type {
  JobResult,
  VariantsSummaryResult,
} from "../../worker/protocol.ts";
import { progressShare } from "../analyses/words.ts";
import type { AutoRuns } from "../autoRuns.ts";
import { individualChecksCsv } from "../../core/analyses/individualChecks.ts";
import { downloadText } from "../download.ts";
import { statsCsvName } from "../steps/variants/individualStats.ts";
import { useAppState } from "../store.tsx";
import {
  IndividualsDownload,
  Part,
  PartLine,
  PlotsRoom,
  StatsFrame,
} from "./StatsLayout.tsx";
import {
  INDIVIDUALS_HEADING,
  INDIVIDUAL_STATISTICS,
  PART_FAILED,
  PART_STOPPED,
  VARIANTS_HEADING,
  VARIANT_STATISTICS,
  individualTitle,
  statsRunningLine,
  thresholdShownLabel,
  variantTitle,
} from "./statsWords.ts";
import type { StatsPart } from "./statsWords.ts";
import type { StatsShown } from "./announceChanges.ts";
import { PassedFilterBox } from "./PassedFilterBox.tsx";
import type * as PlotsModule from "./SectionPlots.tsx";
import type {
  IndividualThresholds,
  VariantThresholds,
} from "./SectionPlots.tsx";
import { summaryStatus } from "./words.ts";

/** What the section is drawn with. */
export interface FileStatsProps {
  /** The analyses the page starts by itself, which tell a pass stopped
      from one about to start. */
  readonly autoRuns: AutoRuns;
  /** The open button of the page, which takes the focus when the section
      goes with it, another file opened. */
  readonly openButton: React.RefObject<HTMLButtonElement | null>;
  /** Told when the section of a load is drawn with the code of its
      plots, and when it goes, so that the status region says nothing of
      the statistics before. */
  readonly onShown: StatsShown;
}

/** The statistics of the open file; nothing before a file is read. The
    code of the plots is asked for from the moment a file is picked. */
export function FileStats({
  autoRuns,
  openButton,
  onShown,
}: FileStatsProps): React.JSX.Element | null {
  const variants = useAppState((s) => s.project.variants);
  if (variants === null) return null;
  // Asked for as the file is picked, before the read, so that it is there
  // when the pass starts; a download that fails is said by the plots that
  // wait for it, once the file is read.
  const plots = plotsDownload(variants.fileId).plots;
  if (variants.read.kind !== "read") return null;
  return (
    // Another load is another section, so that the one before goes, with
    // the focus it held.
    <Stats
      key={variants.fileId}
      autoRuns={autoRuns}
      openButton={openButton}
      onShown={onShown}
      plots={plots}
      fileId={variants.fileId}
      variantsName={variants.name}
      ploidy={variants.read.ploidy}
    />
  );
}

/** The module of the code of the plots. */
type PlotsCode = typeof PlotsModule;

/** The components of the code of the plots, each drawn once that code
    is there, and each throwing to the boundary of the section when its
    download failed. */
interface LazyPlots {
  readonly CodeMark: React.LazyExoticComponent<PlotsCode["PlotsCodeMark"]>;
  readonly VariantPlots: React.LazyExoticComponent<PlotsCode["VariantPlots"]>;
  readonly IndividualPlots: React.LazyExoticComponent<
    PlotsCode["IndividualPlots"]
  >;
}

/** A download of the code of the plots. */
interface PlotsDownload {
  /** The load it was asked for. */
  readonly fileId: string;
  /** Whether it failed. */
  failed: boolean;
  /** Its components. */
  readonly plots: LazyPlots;
}

/** The download of the code of the plots, once asked for. */
let download: PlotsDownload | null = null;

/** The download of the code of the plots for the load `fileId`: the one
    asked for before, under way or done, which every file after draws at
    once, or failed for this same load; or a new one, the first, or after
    a download that failed for another load, so that the next file picked
    asks for the code again, which WebKit 26.6 downloads, and Chromium 153
    does not, keeping the failure until the page is reloaded. A lazy
    component made for each file would wait for its code each time, even
    once downloaded, and React then holds what it draws back 300 ms
    (React 19.3). Called as the section is drawn, as lazy() itself asks
    for its code. */
function plotsDownload(fileId: string): PlotsDownload {
  if (download === null || (download.failed && download.fileId !== fileId)) {
    const code = import("./SectionPlots.tsx");
    const made: PlotsDownload = {
      fileId,
      failed: false,
      plots: {
        CodeMark: lazy(async () => ({ default: (await code).PlotsCodeMark })),
        VariantPlots: lazy(async () => ({
          default: (await code).VariantPlots,
        })),
        IndividualPlots: lazy(async () => ({
          default: (await code).IndividualPlots,
        })),
      },
    };
    code.catch(() => {
      made.failed = true;
    });
    download = made;
  }
  return download;
}

/** What the section of one load is drawn with. */
interface StatsProps extends FileStatsProps {
  /** The components of the code of the plots. */
  readonly plots: LazyPlots;
  /** The id of the load. */
  readonly fileId: string;
  /** The name of the variants file, which the downloads are named
      after. */
  readonly variantsName: string;
  /** The ploidy popnei read the file with, which, with the individuals,
      sets the narrowest bar of the histogram of the MAF. */
  readonly ploidy: number;
}

/** The short titles of the histograms of the variants, as their boxes
    show them, for the room of their plots. */
const VARIANT_ROOM = VARIANT_STATISTICS.map((statistic) =>
  thresholdShownLabel(variantTitle(statistic)),
);

/** The same of the histograms of the individuals. */
const INDIVIDUAL_ROOM = INDIVIDUAL_STATISTICS.map((statistic) =>
  thresholdShownLabel(individualTitle(statistic)),
);

/** The section of one load of the file. */
function Stats({
  autoRuns,
  openButton,
  onShown,
  plots,
  fileId,
  variantsName,
  ploidy,
}: StatsProps): React.JSX.Element {
  const sectionRef = useRef<HTMLElement>(null);
  const status = useAppState(summaryStatus);
  // The thresholds on the plots, state of this load alone: another file
  // is another section, which starts them again. They are shown only,
  // and change no statistic and no project (docs/plans/thresholds.md).
  const [thresholds, setThresholds] = useState(START_THRESHOLDS);
  // Selected for what autoRuns knows, which tells a pass stopped from one
  // about to start, and which a Stop with no pass running changes and the
  // store does not.
  useSyncExternalStore(autoRuns.subscribe, autoRuns.getVersion);
  const { CodeMark, VariantPlots, IndividualPlots } = plots;

  useLayoutEffect(() => {
    const section = sectionRef.current;
    // The open button is one element whatever the zone holds.
    const button = openButton.current;
    return () => {
      // The section goes, another file opened or dropped, while the focus
      // is in it: the focus goes to the open button, not to the top of
      // the page. The cleanup of a layout effect runs while the section
      // is still in the page.
      if (section?.contains(document.activeElement) === true) {
        button?.focus();
      }
    };
  }, [openButton]);

  /** Whether the pass about to start or running has given no result so
      far yet: the plots will come, and their room is kept. */
  const stopped =
    (status.kind === "ready" || status.kind === "removed") &&
    autoRuns.startedUnder(status.key);
  const coming =
    (status.kind === "running" && status.soFar === null) ||
    ((status.kind === "ready" || status.kind === "removed") && !stopped);

  /** What a part says over its plots: the share done while the pass
      runs, that it was stopped, why it cannot run, or nothing once done,
      failed or about to start. */
  const lineOf = (part: StatsPart): string | null => {
    switch (status.kind) {
      case "done":
      case "error":
        return null;
      case "running":
        return statsRunningLine(
          part,
          status.progress === null ? null : progressShare(status.progress),
        );
      case "ready":
      case "removed":
        // Not started under its key, the pass starts by itself in a
        // moment.
        return stopped ? PART_STOPPED : null;
      case "locked":
        return status.reason;
    }
  };

  const shown = shownOf(status);
  const soFar = shown?.soFar ?? false;
  const done = status.kind === "done" ? shown?.result : undefined;
  return (
    <StatsFrame sectionRef={sectionRef}>
      {/* Tells the status region, once the code of the plots is there,
          that the section is drawn; nothing before, nothing after a
          download that failed. */}
      <Suspense fallback={null}>
        <CodeMark fileId={fileId} onShown={onShown} />
      </Suspense>
      <Part heading={VARIANTS_HEADING}>
        {status.kind === "error" ? (
          <PartLine>{PART_FAILED}</PartLine>
        ) : shown === null ? (
          <>
            <LineOrRoom
              line={lineOf("variants")}
              part="variants"
              room={coming}
            />
            {coming && <PlotsRoom titles={VARIANT_ROOM} />}
          </>
        ) : (
          <Suspense fallback={<Waiting part="variants" />}>
            <LineOrRoom line={lineOf("variants")} part="variants" room />
            <VariantPlots
              result={shown.result.perVar}
              numIndividuals={shown.result.perIndividual.individuals.length}
              ploidy={ploidy}
              soFar={soFar}
              thresholds={thresholds.variants}
              onThreshold={(statistic, value) => {
                setThresholds((before) => ({
                  ...before,
                  variants: { ...before.variants, [statistic]: value },
                }));
              }}
            />
          </Suspense>
        )}
        <PassedFilterBox />
      </Part>
      <Part heading={INDIVIDUALS_HEADING}>
        {status.kind === "error" ? (
          <PartLine>{PART_FAILED}</PartLine>
        ) : shown === null ? (
          <>
            <LineOrRoom
              line={lineOf("individuals")}
              part="individuals"
              room={coming}
            />
            {coming && <PlotsRoom titles={INDIVIDUAL_ROOM} />}
          </>
        ) : (
          <Suspense fallback={<Waiting part="individuals" />}>
            <LineOrRoom line={lineOf("individuals")} part="individuals" room />
            <IndividualPlots
              result={shown.result.perIndividual}
              soFar={soFar}
              thresholds={thresholds.individuals}
              onThreshold={(statistic, value) => {
                setThresholds((before) => ({
                  ...before,
                  individuals: { ...before.individuals, [statistic]: value },
                }));
              }}
            />
            {done !== undefined && (
              <IndividualsDownload
                onPress={() => {
                  downloadText(
                    statsCsvName(variantsName),
                    individualChecksCsv(done.perIndividual),
                    "text/csv",
                  );
                }}
              />
            )}
          </Suspense>
        )}
      </Part>
    </StatsFrame>
  );
}

/** A part whose plots wait for their code: it says that it is
    calculated, never a count done with no word of the statistics, over
    the room of its plots. */
function Waiting({ part }: { readonly part: StatsPart }): React.JSX.Element {
  return (
    <>
      <PartLine>{statsRunningLine(part, null)}</PartLine>
      <PlotsRoom
        titles={part === "variants" ? VARIANT_ROOM : INDIVIDUAL_ROOM}
      />
    </>
  );
}

/** What the line over the plots of a part is drawn with. */
interface LineOrRoomProps {
  /** What the part says over its plots, or `null` for nothing. */
  readonly line: string | null;
  readonly part: StatsPart;
  /** Whether its room is kept when it says nothing: with plots drawn
      under it, or coming. */
  readonly room: boolean;
}

/** The line over the plots of a part; with nothing to say over plots
    drawn or coming, the room of its last line, "Calculating the
    statistics of the variants… 100%", hidden, so that the plots, drawn
    under that line from the results so far, do not move up as the result
    comes, by 40 pixels at 1280 (the review of round 1, ux F2), nor down
    as the pass about to start says its share; nothing otherwise. */
function LineOrRoom({
  line,
  part,
  room,
}: LineOrRoomProps): React.JSX.Element | null {
  if (line !== null) return <PartLine>{line}</PartLine>;
  if (!room) return null;
  return <PartLine room>{statsRunningLine(part, 100)}</PartLine>;
}

/** What the plots are drawn from: the result of the summary once done,
    or its last result so far while it runs, `soFar`. */
interface Shown {
  readonly result: VariantsSummaryResult;
  readonly soFar: boolean;
}

/** What the plots are drawn from in `status`; `null` before the first
    result so far, and in any state but running and done. A defect for a
    result of another analysis, which the store never gives it. */
function shownOf(status: AnalysisStatus<JobResult>): Shown | null {
  let result: JobResult;
  let soFar: boolean;
  if (status.kind === "done") {
    result = status.result;
    soFar = false;
  } else if (status.kind === "running" && status.soFar !== null) {
    result = status.soFar;
    soFar = true;
  } else {
    return null;
  }
  if (result.analysis !== "variantsSummary") {
    throw new Error(
      `popnei_web defect: the summary of the variants file has a result of ${result.analysis}.`,
    );
  }
  return { result, soFar };
}

/** The thresholds of the six histograms, as the user set them: a
    number, rounded to the step of its axis when it was committed and
    drawn as it is, or `null` for the top of the axis, which
    keeps everything and follows the axis as a result so far widens it. */
interface Thresholds {
  readonly variants: VariantThresholds;
  readonly individuals: IndividualThresholds;
}

/** The thresholds of a file just open: the missing rate of the variants
    at 0.1, the default of its filter in docs/functionality.md, and the
    five others at the top of their axis (docs/plans/thresholds.md, "The
    starting values"). */
const START_THRESHOLDS: Thresholds = Object.freeze({
  variants: Object.freeze({
    missingRate: DEFAULT_MAX_MISSING_RATE,
    maf: null,
    obsHet: null,
    unbiasedExpHet: null,
  }),
  individuals: Object.freeze({
    missingGenotypes: null,
    observedHeterozygosity: null,
  }),
});
