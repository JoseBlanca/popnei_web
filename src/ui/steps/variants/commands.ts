/**
 * The commands the Variants step sends to the store, each with the
 * description that ends its notice and names its step of undo
 * (docs/specs/steps/variants.md, "What it sends and reads"), and the
 * options of a VCF the step shows. Pure, so that a test in node applies
 * them to the real store.
 */

import { DEFAULT_MAX_MISSING_RATE } from "../../../core/apps.ts";
import {
  loadVariants,
  removeVariantFilter,
  setVariantFilter,
} from "../../../core/project.ts";
import type { Project, Reference, VariantLoad } from "../../../core/project.ts";
import type { VcfReadOptions } from "../../../worker/protocol.ts";
import { startingOptions } from "./words.ts";

/** A command of the step with its description. */
export interface StepCommand {
  /** The words that end the notice of the command, and its undo. */
  readonly description: string;
  /** The change of the project. */
  readonly command: (p: Project) => Project;
}

/** A file picked or dropped, a new load. */
export function pickCommand(load: VariantLoad): StepCommand {
  return {
    description: "a new variants file was loaded",
    command: (p) => loadVariants(p, load),
  };
}

/** The same `File` loaded again under a new load id, with other options. */
export function readAgainCommand(load: VariantLoad): StepCommand {
  return {
    description: "the variants file was read again with other options",
    command: (p) => loadVariants(p, load),
  };
}

/** A threshold of the missing data filter committed. */
export function thresholdCommand(maxAllowedMissingRate: number): StepCommand {
  return {
    description: "the missing data filter changed",
    command: (p) =>
      setVariantFilter(p, { kind: "missing_data", maxAllowedMissingRate }),
  };
}

/** The switch of the missing data filter turned on, or off. */
export function filterSwitchCommand(on: boolean): StepCommand {
  return on
    ? {
        description: "the missing data filter was turned on",
        command: (p) =>
          setVariantFilter(p, {
            kind: "missing_data",
            maxAllowedMissingRate: DEFAULT_MAX_MISSING_RATE,
          }),
      }
    : {
        description: "the missing data filter was turned off",
        command: (p) => removeVariantFilter(p, "missing_data"),
      };
}

/** The files of the project that something the step holds of its own
    was set beside: the load of the variants file, and the file an opened
    project was made with, its reference, by its identity, which only an
    opening changes. */
export interface Beside {
  /** The load id of the variants file; `null` with none. */
  readonly forLoad: string | null;
  /** The reference of the project; `null` with none. */
  readonly forReference: Reference | null;
}

/** The files of `p` that what the step sets now is set beside. */
export function besideOf(p: Pick<Project, "variants" | "reference">): Beside {
  return { forLoad: p.variants?.fileId ?? null, forReference: p.reference };
}

/** Whether `beside` names the files `p` has: no Undo, Redo, pick or
    opening has replaced them since. */
export function isBeside(
  beside: Beside,
  p: Pick<Project, "variants" | "reference">,
): boolean {
  return (
    beside.forLoad === (p.variants?.fileId ?? null) &&
    beside.forReference === p.reference
  );
}

/** Options of a VCF the user set and has not yet applied by a pick or a
    read again, with the files they were set beside. */
export interface EditedOptions extends Beside {
  /** The options. */
  readonly options: VcfReadOptions;
}

/**
 * The options the step shows: those the user set and did not apply,
 * while the load and the reference they were set beside are the
 * project's; otherwise those it starts at, of the VCF loaded, of the
 * reference or the defaults. The step forgets the edits once a pick or a
 * read again applies them, so that an undo shows the options of the load
 * it goes back to, and an opening those of the file the project was made
 * with.
 */
export function shownOptions(
  edited: EditedOptions | null,
  p: Project,
): VcfReadOptions {
  return edited !== null && isBeside(edited, p)
    ? edited.options
    : startingOptions(p);
}
