/**
 * The statistics of the open file on popgen2.html in their boundary of
 * errors (docs/plans/file-stats.md, "Where it goes"), which draws their
 * name alone in their place when something throws as they are drawn. The
 * boundary is made again for each file picked, so that a throw for one
 * file does not leave the section empty for the next ones while their
 * statistics are calculated.
 *
 * Their code, the plots, D3 and the table, which no one needs before a
 * file is open, is downloaded apart from the page's, from the moment a
 * file is picked, so that it is there when the statistics start after the
 * file is read and its variants counted: the page's first download does
 * not carry it. Until it is there, the section's room is drawn, empty,
 * by code the page has (StatsLayout.tsx), so that the open button under
 * it is where it will stay. Once downloaded, the section of the next file is drawn at
 * once, with no pause. A download that fails is caught by the boundary,
 * which gives it to the error bar, whose words say to reload the page; the
 * next file picked asks for it again, which WebKit 26.6 downloads, and
 * Chromium 153 does not, keeping the failure until the page is reloaded.
 */
import { Suspense, lazy } from "react";

import type { AutoRuns } from "../autoRuns.ts";
import { ErrorBoundary } from "../shell/ErrorBoundary.tsx";
import { useAppState } from "../store.tsx";
import type { FileStatsProps } from "./FileStats.tsx";
import { StatsRoom } from "./StatsLayout.tsx";
import { STATS_NAME } from "./statsWords.ts";
import type { StatsShown } from "./announceChanges.ts";

/** What the section is drawn with. */
export interface StatsSectionProps {
  /** The analyses the page starts by itself. */
  readonly autoRuns: AutoRuns;
  /** The open button of the page, which takes the focus when the section
      goes with it. */
  readonly openButton: React.RefObject<HTMLButtonElement | null>;
  /** Told when the section of a load is drawn, and when it goes. */
  readonly onShown: StatsShown;
}

/** The statistics of the open file, or their room; nothing before a file
    is picked. */
export function StatsSection({
  autoRuns,
  openButton,
  onShown,
}: StatsSectionProps): React.JSX.Element | null {
  const fileId = useAppState((s) => s.project.variants?.fileId ?? null);
  if (fileId === null) return null;
  return (
    // Another load is another boundary, which has caught nothing, and
    // another download if the one before failed.
    <ErrorBoundary key={fileId} heading={STATS_NAME} level={2}>
      <LoadedStats
        autoRuns={autoRuns}
        openButton={openButton}
        onShown={onShown}
      />
    </ErrorBoundary>
  );
}

/** The section's code, downloaded once and drawn for every file after. A
    lazy component made for each file would wait for its code each time,
    even once downloaded, and React then holds the section back 300 ms
    before drawing it (React 19.3). Made again after a download that
    failed, which it would otherwise keep, so that the next file picked
    asks for the code again. */
let LazyFileStats = lazy(loadFileStats);

/** Downloads the code of the statistics, or takes it from the browser's
    modules once it was downloaded. */
async function loadFileStats(): Promise<{
  readonly default: React.ComponentType<FileStatsProps>;
}> {
  try {
    const module = await import("./FileStats.tsx");
    return { default: module.FileStats };
  } catch (error) {
    LazyFileStats = lazy(loadFileStats);
    throw error;
  }
}

/** The statistics of one load, drawn once their code is there, and their
    room until then, so that the open button under them does not move
    when the code arrives. */
function LoadedStats(props: StatsSectionProps): React.JSX.Element {
  // Read as it is drawn, since a failed download replaces it.
  const FileStats = LazyFileStats;
  return (
    <Suspense fallback={<StatsRoom />}>
      <FileStats {...props} />
    </Suspense>
  );
}
