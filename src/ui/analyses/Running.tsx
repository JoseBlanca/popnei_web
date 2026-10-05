/**
 * The bar and the line of a calculation under way, with the time since
 * it started, counted every second, and the pass being read of a run of
 * several (docs/specs/analyses/diversity.md, "The states", running), and the words of a Run that waits for the
 * statistics of each individual, shared by the panels of the Analyses step and
 * the checks of the Variants step. The class names are those of
 * AnalysisPanel.module.css.
 */
import { classOf } from "../classOf.ts";
import { useRunSeconds } from "../runSeconds.ts";
import { useAppState } from "../store.tsx";
import { ProgressBar } from "../widgets/ProgressBar.tsx";
import type { Progress } from "../../worker/protocol.ts";
import styles from "./AnalysisPanel.module.css";
import {
  passesOf,
  progressShare,
  runningBarLabel,
  runningText,
} from "./words.ts";

/** What the part of a calculation under way is drawn with. */
export interface RunningProps {
  /** The analysis in the middle of a sentence, "the diversity", which
      names the bar. */
  readonly name: string;
  /** The id of its request. */
  readonly runId: number;
  /** How far it has gone, or `null` until the worker says. */
  readonly progress: Progress | null;
  /** Whether it is a Run that waits for the statistics of each
      individual, whose request `runId` and `progress` are then. */
  readonly waitsForStatistics: boolean;
  /** A line under the bar, what the bar does not show of the calculation:
      the principal components, whose bar stands still while they are
      calculated; none when absent. */
  readonly line?: string | null;
}

/** The bar and the line of a calculation under way, with the time since
    it started, counted every second. */
export function Running({
  name,
  runId,
  progress,
  waitsForStatistics,
  line,
}: RunningProps): React.JSX.Element {
  const afterStop = useAppState(
    (s) => s.runs.find((r) => r.runId === runId)?.afterStop ?? false,
  );
  const variantsName = useAppState((s) => s.project.variants?.name ?? null);
  const seconds = useRunSeconds(runId);

  const share = progress === null ? null : progressShare(progress);
  return (
    <div className={classOf(styles, "running")}>
      <ProgressBar
        label={runningBarLabel(name, waitsForStatistics)}
        value={share}
      />
      <p className={classOf(styles, "line")}>
        {runningText({
          share,
          seconds,
          waitingFor: afterStop ? variantsName : null,
          waitsForStatistics,
          passes: passesOf(progress),
        })}
      </p>
      {line !== undefined && line !== null && (
        <p className={classOf(styles, "line")}>{line}</p>
      )}
    </div>
  );
}
