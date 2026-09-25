/**
 * The options of the next VCF the Variants step holds, and the loads
 * that apply them (docs/specs/steps/variants.md, "How a VCF is read").
 * The step makes one when it is drawn and loses it when it is left, and
 * reads it with `useSyncExternalStore`; a pick or a read again goes
 * through `load`, which sends the command and forgets the options it
 * applied, so that an undo shows those of the load it goes back to. Plain
 * TypeScript, so that a test in node drives it on the real store.
 */

import type { Store } from "../../../core/store.ts";
import type { JobResult, VcfReadOptions } from "../../../worker/protocol.ts";
import { shownOptions } from "./commands.ts";
import type { EditedOptions, StepCommand } from "./commands.ts";

/** The options of the next VCF of one drawing of the step. */
export interface VcfOptions {
  /** The options the user set and has not applied, or `null`; the same
      object until they change. A property, bound once, since the step
      hands it to `useSyncExternalStore`. */
  readonly getEdited: () => EditedOptions | null;
  /** The options the step shows now, from the store and the edits. */
  shown(): VcfReadOptions;
  /** The user set `options`, on the load the project has now. */
  edit(options: VcfReadOptions): void;
  /** Sends a pick or a read again, and forgets the edits it applied. */
  load(step: StepCommand): void;
  /** Calls `listener` after every change of the edits, and returns the
      function that stops it. The same function on every read. */
  readonly subscribe: (listener: () => void) => () => void;
}

/** The options of the next VCF, with no edit, over `store`. */
export function createVcfOptions(
  store: Pick<Store<JobResult>, "apply" | "getState">,
): VcfOptions {
  let edited: EditedOptions | null = null;
  const listeners = new Set<() => void>();
  const change = (next: EditedOptions | null): void => {
    edited = next;
    for (const listener of [...listeners]) listener();
  };
  return {
    getEdited: () => edited,
    shown: () => shownOptions(edited, store.getState().project),
    edit: (options) => {
      change({
        forLoad: store.getState().project.variants?.fileId ?? null,
        options,
      });
    },
    load: (step) => {
      store.apply(step.description, step.command);
      change(null);
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
