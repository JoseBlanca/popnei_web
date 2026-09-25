/**
 * The stepper (docs/specs/shell.md, "The stepper"): a `<nav>` labelled
 * "Steps", with one link per step in their order, each with its state as
 * a word and a symbol, and the reason of a step that is not done as the
 * description and the tooltip of its link; the link of the step on screen
 * marked. The states and the reasons are those of `stepStates` of
 * words.ts, from the state of the store.
 */
import type { StepId } from "../../core/apps.ts";
import { titleOf } from "../analyses/panels.ts";
import { classOf } from "../classOf.ts";
import { useAppState } from "../store.tsx";
import { StepLink } from "../widgets/StepLink.tsx";
import styles from "./Stepper.module.css";
import { STEP_NAMES, hashOfStep } from "./steps.ts";
import { stepStates } from "./words.ts";
import type { StepStatus } from "./words.ts";

/** The words of each state of a step, as the table of the stepper has
    them, and the symbol beside them, which is not read. */
const STATUS_SHOWN: Readonly<
  Record<StepStatus, { readonly word: string; readonly symbol: string }>
> = {
  todo: { word: "To do", symbol: "○" },
  reading: { word: "Reading", symbol: "◔" },
  problem: { word: "Problem", symbol: "!" },
  done: { word: "Done", symbol: "✓" },
  locked: { word: "Locked", symbol: "–" },
  running: { word: "Running", symbol: "◔" },
  removed: { word: "Results removed", symbol: "↺" },
  failed: { word: "Failed", symbol: "✕" },
  ready: { word: "Ready", symbol: "▸" },
};

/** What the stepper is drawn with. */
export interface StepperProps {
  /** The step on screen. */
  readonly current: StepId;
}

/** The stepper, the row of the links of the steps. */
export function Stepper({ current }: StepperProps): React.JSX.Element {
  // The whole state, which the store keeps as the same object until it
  // changes: the states of the steps read the project, the analyses and
  // the notice.
  const state = useAppState((s) => s);
  return (
    <nav aria-label="Steps" className={classOf(styles, "stepper")}>
      <ol className={classOf(styles, "steps")}>
        {stepStates(state, titleOf).map(({ id, status, reason }) => (
          <li key={id}>
            <StepLink
              href={hashOfStep(id)}
              label={STEP_NAMES[id]}
              state={STATUS_SHOWN[status].word}
              symbol={STATUS_SHOWN[status].symbol}
              reason={reason}
              isCurrent={id === current}
            />
          </li>
        ))}
      </ol>
    </nav>
  );
}
