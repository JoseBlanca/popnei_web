/**
 * The hold a widget takes on the gate of popgen2.html while the user is
 * in the middle of a change that has not reached the project, a slider
 * dragged, a list or a menu open, digits typed and not confirmed, the
 * dialog of the download open; the PCA starts again by itself only a
 * quiet second after the last hold is let go
 * (docs/specs/steps/popgen2-pca.md, "The PCA calculated again by
 * itself"). Each hold is `holdChange` of the gate, never `holdKeyRun`,
 * which any change by another control ends. A hold is let go at its
 * release and when its widget leaves the page, so that none is left to
 * keep the PCA from starting for good. On popgen.html, which gives no
 * gate, a widget holds nothing.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { useRunGateIfAny } from "../variants/runGate.tsx";

/** Holds a change under way while `held` is true, and lets it go once it
    is false, or when the component leaves the page. The hold is taken
    and let go as React draws the change, after the handler that made it,
    so a change the release ends with, a choice of a list, has reached
    the project when the gate tells its listeners. */
export function useHoldWhile(held: boolean): void {
  const gate = useRunGateIfAny();
  useLayoutEffect(() => {
    if (!held || gate === null) return undefined;
    return gate.holdChange();
  }, [held, gate]);
}

/** A hold taken and let go by the handlers of a widget, for a change
    under way that its drawing does not show, a drag of the line of a
    threshold. */
export interface ChangeHold {
  /** Takes the hold, when none is held. */
  readonly take: () => void;
  /** Lets it go, when one is held. */
  readonly release: () => void;
}

/** A hold of the gate for a widget's handlers, let go when the widget
    leaves the page. Both functions do nothing with no gate. */
export function useChangeHold(): ChangeHold {
  const gate = useRunGateIfAny();
  const gateRef = useRef(gate);
  useLayoutEffect(() => {
    gateRef.current = gate;
  });
  // The release of the hold held now, or null.
  const held = useRef<(() => void) | null>(null);
  const [hold] = useState<ChangeHold>(() => ({
    take: () => {
      if (held.current !== null || gateRef.current === null) return;
      held.current = gateRef.current.holdChange();
    },
    release: () => {
      const release = held.current;
      held.current = null;
      release?.();
    },
  }));
  useEffect(
    () => () => {
      hold.release();
    },
    [hold],
  );
  return hold;
}
