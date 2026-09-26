/**
 * The stepper (docs/specs/shell.md, "The stepper"): a `<nav>` labelled
 * "Steps", with one link per step in their order, each with its state as
 * a word and a symbol, and the reason of a step that is not done as the
 * description and the tooltip of its link; the link of the step on screen
 * marked. Each link is a StepItem.tsx, which reads its state and its
 * reason from the store.
 */
import { POPGEN_STEPS } from "../../core/apps.ts";
import type { StepId } from "../../core/apps.ts";
import { classOf } from "../classOf.ts";
import { StepItem } from "./StepItem.tsx";
import styles from "./Stepper.module.css";

/** What the stepper is drawn with. */
export interface StepperProps {
  /** The step on screen. */
  readonly current: StepId;
}

/** The stepper, the row of the links of the steps. */
export function Stepper({ current }: StepperProps): React.JSX.Element {
  return (
    <nav aria-label="Steps" className={classOf(styles, "stepper")}>
      <ol className={classOf(styles, "steps")}>
        {POPGEN_STEPS.map((id) => (
          <li key={id}>
            <StepItem id={id} isCurrent={id === current} />
          </li>
        ))}
      </ol>
    </nav>
  );
}
