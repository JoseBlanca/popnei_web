/**
 * The stepper (docs/specs/shell.md, "The stepper"): a `<nav>` labelled
 * "Steps", with one link per step in their order, the link of the step on
 * screen marked. The state of each step and its reason join the names
 * with work package 9 of the walking skeleton.
 */
import { POPGEN_STEPS } from "../../core/apps.ts";
import type { StepId } from "../../core/apps.ts";
import { classOf } from "../classOf.ts";
import { StepLink } from "../widgets/StepLink.tsx";
import styles from "./Stepper.module.css";
import { STEP_NAMES, hashOfStep } from "./steps.ts";

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
        {POPGEN_STEPS.map((step) => (
          <li key={step}>
            <StepLink
              href={hashOfStep(step)}
              label={STEP_NAMES[step]}
              isCurrent={step === current}
            />
          </li>
        ))}
      </ol>
    </nav>
  );
}
