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
 * keep the PCA from starting for good. A widget sees of the gate only
 * `holdChange`, with the kind of its hold, a control in use or the dialog
 * of the download, through the narrow holder of this file, which
 * popgen2.html gives as the gate and popgen.html as a holder that holds
 * nothing; a widget drawn with neither is a defect, so that a holder
 * forgotten is not a PCA that starts in the middle of a drag.
 */
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import type { HoldKind } from "../variants/thresholdRun.ts";

/** What a widget holds its change under way on: the gate of
    popgen2.html, which fits this, or a holder that holds nothing. */
export interface ChangeHolds {
  /** Holds a change under way of the kind `kind`, "control" when
      absent, "download" for the dialog of the download, and gives the
      function that lets it go; a second call of that function changes
      nothing. */
  readonly holdChange: (kind?: HoldKind) => () => void;
}

/** The holder of popgen.html, whose PCA waits for no quiet second:
    a hold there holds nothing. */
export const HOLDS_NOTHING: ChangeHolds = Object.freeze({
  holdChange: () => () => undefined,
});

const ChangeHoldsContext = createContext<ChangeHolds | null>(null);

/** Gives the holder to every widget under it. */
export const ChangeHoldsProvider = ChangeHoldsContext.Provider;

/** The holder given. Throws a defect outside a `ChangeHoldsProvider`. */
function useChangeHolds(): ChangeHolds {
  const holds = useContext(ChangeHoldsContext);
  if (holds === null) {
    throw new Error(
      "popnei_web defect: a widget that holds a change under way is drawn outside a ChangeHoldsProvider",
    );
  }
  return holds;
}

/** Calls `release`, and throws what it throws a moment later, to the
    page's handler of errors, as the gate does at a hold taken: a
    release runs in the cleanup of a layout effect, or in a widget's
    handler before the end of its change, and a listener of the gate
    that threw there would tear the page's tree down, or leave the
    change half made. */
function releaseNow(release: () => void): void {
  try {
    release();
  } catch (error) {
    queueMicrotask(() => {
      throw error;
    });
  }
}

/** Holds a change under way of the kind `kind`, "control" when absent,
    while `held` is true, and lets it go once it is false, or when the
    component leaves the page. The hold is taken
    and let go as React draws the change, after the handler that made it,
    so a change the release ends with, a choice of a list, has reached
    the project when the gate tells its listeners. */
export function useHoldWhile(held: boolean, kind: HoldKind = "control"): void {
  const holds = useChangeHolds();
  useLayoutEffect(() => {
    if (!held) return undefined;
    const release = holds.holdChange(kind);
    return () => {
      releaseNow(release);
    };
  }, [held, kind, holds]);
}

/** A hold taken and let go by the handlers of a widget, for a change
    under way that its drawing does not show, a drag of the line of a
    threshold, the typing in a number box. */
export interface ChangeHold {
  /** Takes the hold, when none is held. */
  readonly take: () => void;
  /** Lets it go, when one is held. */
  readonly release: () => void;
}

/** A hold of the holder for a widget's handlers, let go when the widget
    leaves the page. */
export function useChangeHold(): ChangeHold {
  const holds = useChangeHolds();
  const holdsRef = useRef(holds);
  useLayoutEffect(() => {
    holdsRef.current = holds;
  });
  // The release of the hold held now, or null.
  const held = useRef<(() => void) | null>(null);
  const [hold] = useState<ChangeHold>(() => ({
    take: () => {
      if (held.current !== null) return;
      held.current = holdsRef.current.holdChange();
    },
    release: () => {
      const release = held.current;
      held.current = null;
      if (release !== null) releaseNow(release);
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
