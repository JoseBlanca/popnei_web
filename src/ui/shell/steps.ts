/**
 * The step on screen, which the URL hash names (docs/specs/shell.md, "The
 * step in the hash"; react.md, "What state goes where"). A change of step
 * is a link the browser follows, which makes it an entry of its history,
 * so the back button goes to the step before.
 */
import { useSyncExternalStore } from "react";

import { POPGEN_STEPS } from "../../core/apps.ts";
import type { StepId } from "../../core/apps.ts";

/** The name of each step, the one of its `<h1>` and of its link. */
export const STEP_NAMES: Readonly<Record<StepId, string>> = {
  variants: "Variants",
  individuals: "Individuals",
  analyses: "Analyses",
};

/** The step the hash names, `"#analyses"`; Variants for an empty hash,
    or one that names no step. */
export function stepOfHash(hash: string): StepId {
  return POPGEN_STEPS.find((step) => hash === `#${step}`) ?? "variants";
}

/** The hash of the link of `step`, `"#analyses"`. */
export function hashOfStep(step: StepId): string {
  return `#${step}`;
}

/** The title of the page while `step` is on screen, so that a tab and the
    history of the browser say where the user is (WCAG 2.4.2). */
export function titleOfStep(step: StepId): string {
  return `${STEP_NAMES[step]} · Population genetics · popnei web`;
}

function subscribeToHash(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
  };
}

function readHash(): string {
  return window.location.hash;
}

/** The URL hash, read again at every change of it. */
export function useStepHash(): string {
  return useSyncExternalStore(subscribeToHash, readHash);
}
