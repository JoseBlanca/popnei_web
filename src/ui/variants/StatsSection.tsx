/**
 * The statistics of the open file on popgen2.html in their boundary of
 * errors (docs/plans/file-stats.md, "Where it goes"), which draws their
 * name alone in their place when something throws as they are drawn, or
 * when the code of their plots fails to download (FileStats.tsx). The
 * boundary is made again for each file picked, so that a throw for one
 * file does not leave the section empty for the next ones while their
 * statistics are calculated, and so that the next file asks for the code
 * of the plots again.
 */
import type { AutoRuns } from "../autoRuns.ts";
import { ErrorBoundary } from "../shell/ErrorBoundary.tsx";
import { useAppState } from "../store.tsx";
import { FileStats } from "./FileStats.tsx";
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

/** The statistics of the open file; nothing before a file is picked. */
export function StatsSection({
  autoRuns,
  openButton,
  onShown,
}: StatsSectionProps): React.JSX.Element | null {
  const fileId = useAppState((s) => s.project.variants?.fileId ?? null);
  if (fileId === null) return null;
  return (
    // Another load is another boundary, which has caught nothing.
    <ErrorBoundary key={fileId} heading={STATS_NAME} level={2}>
      <FileStats
        autoRuns={autoRuns}
        openButton={openButton}
        onShown={onShown}
      />
    </ErrorBoundary>
  );
}
