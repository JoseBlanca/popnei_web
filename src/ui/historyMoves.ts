/**
 * The undos, redos and openings of a store, counted, so that what a
 * screen holds of its own beside a part of the project starts again at
 * the project after each: the text of a list of individuals not applied,
 * which the Variants step shows as the list of the project after an Undo
 * or a Redo even when the step undone did not change the list
 * (docs/specs/steps/variants.md, "The two lists"). The store tells no
 * change of its history apart from a command, so the page counts them
 * where it makes them: `undoOrRedo` of the shell and the opening of a
 * project file.
 */
import { useSyncExternalStore } from "react";

import { useStore } from "./store.tsx";

/** The count of one store, and who is told of it. */
interface Moves {
  count: number;
  readonly listeners: Set<() => void>;
  /** Bound once, since `useSyncExternalStore` subscribes again when it
      changes. */
  readonly subscribe: (listener: () => void) => () => void;
}

const MOVES = new WeakMap<object, Moves>();

/** The count of `store`, made at its first use. */
function movesOf(store: object): Moves {
  const known = MOVES.get(store);
  if (known !== undefined) return known;
  const listeners = new Set<() => void>();
  const made: Moves = {
    count: 0,
    listeners,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  MOVES.set(store, made);
  return made;
}

/** Counts an undo, a redo or an opening of `store`, before it is made,
    so that a screen drawn again by the change reads the new count. */
export function historyMoved(store: object): void {
  const moves = movesOf(store);
  moves.count += 1;
  for (const listener of [...moves.listeners]) listener();
}

/** The undos, redos and openings of the store of the page so far. */
export function useHistoryMoves(): number {
  const moves = movesOf(useStore());
  return useSyncExternalStore(moves.subscribe, () => moves.count);
}
