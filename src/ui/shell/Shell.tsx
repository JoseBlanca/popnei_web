/**
 * The shell of the population genetics application, what surrounds every
 * step (docs/specs/shell.md): the header, the stepper, the summary line,
 * the step the URL hash names in `<main>`, the status region and the
 * notice, which React Aria draws at the end of the page. When the hash
 * changes, the title of the page names the new step and the focus moves
 * to its `<h1>`, since a screen reader says nothing of a content replaced
 * without a new page (react.md, "Moving focus"); not when the page opens,
 * where the browser puts the reader at the start.
 */
import { useEffect, useRef } from "react";

import type { StepId } from "../../core/apps.ts";
import { classOf } from "../classOf.ts";
import { AnalysesStep } from "../steps/analyses/AnalysesStep.tsx";
import { IndividualsStep } from "../steps/individuals/IndividualsStep.tsx";
import { VariantsStep } from "../steps/variants/VariantsStep.tsx";
import { Header } from "./Header.tsx";
import { Notice } from "./Notice.tsx";
import styles from "./Shell.module.css";
import { StatusRegion } from "./StatusRegion.tsx";
import { Stepper } from "./Stepper.tsx";
import { SummaryLine } from "./SummaryLine.tsx";
import { ErrorBoundary } from "./ErrorBoundary.tsx";
import { STEP_NAMES, stepOfHash, titleOfStep, useStepHash } from "./steps.ts";

/** The shell, drawn by the entry inside the providers of the page. */
export function Shell(): React.JSX.Element {
  const hash = useStepHash();
  const step = stepOfHash(hash);
  const mainRef = useRef<HTMLElement>(null);
  // The hash the last effect saw; null before the first, when the page
  // opens.
  const hashSeen = useRef<string | null>(null);

  useEffect(() => {
    document.title = titleOfStep(step);
  }, [step]);

  useEffect(() => {
    const before = hashSeen.current;
    hashSeen.current = hash;
    if (before === null || before === hash) return;
    mainRef.current?.querySelector("h1")?.focus();
  }, [hash]);

  return (
    <div className={classOf(styles, "shell")}>
      <Header />
      <Stepper current={step} />
      <SummaryLine />
      <main ref={mainRef} className={classOf(styles, "main")}>
        {/* Keyed by the step, so that going to another step and back draws
            a step that threw again. */}
        <ErrorBoundary key={step} heading={STEP_NAMES[step]}>
          <StepBody step={step} />
        </ErrorBoundary>
      </main>
      <StatusRegion />
      <Notice />
    </div>
  );
}

/** What the step `step` shows. */
function StepBody({ step }: { readonly step: StepId }): React.JSX.Element {
  switch (step) {
    case "variants":
      return <VariantsStep />;
    case "individuals":
      return <IndividualsStep />;
    case "analyses":
      return <AnalysesStep />;
  }
}
