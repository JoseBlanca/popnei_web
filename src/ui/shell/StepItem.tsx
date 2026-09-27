/**
 * The link of one step of the stepper (docs/specs/shell.md, "The
 * stepper"): its name, its state as a word and a symbol, and its reason
 * as the description and the tooltip of the link, from `stepStateOf` of
 * words.ts. The state and the reason are selected as two strings, so that
 * the link is drawn again when they change and not at each message of
 * progress of a calculation, which changes the state of the store and
 * not theirs.
 */
import type { StepId } from "../../core/apps.ts";
import { SHELL_WORDS } from "../analyses/titles.ts";
import { useAppState } from "../store.tsx";
import { StepLink } from "../widgets/StepLink.tsx";
import { STEP_NAMES, hashOfStep } from "./steps.ts";
import { stepStateOf } from "./words.ts";
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

/** What the link of one step is drawn with. */
export interface StepItemProps {
  /** The step. */
  readonly id: StepId;
  /** Whether it is the step on screen. */
  readonly isCurrent: boolean;
}

/** The link of one step. */
export function StepItem({ id, isCurrent }: StepItemProps): React.JSX.Element {
  const status = useAppState((s) => stepStateOf(s, id, SHELL_WORDS).status);
  const reason = useAppState((s) => stepStateOf(s, id, SHELL_WORDS).reason);
  return (
    <StepLink
      href={hashOfStep(id)}
      label={STEP_NAMES[id]}
      state={STATUS_SHOWN[status].word}
      symbol={STATUS_SHOWN[status].symbol}
      reason={reason}
      isCurrent={isCurrent}
    />
  );
}
