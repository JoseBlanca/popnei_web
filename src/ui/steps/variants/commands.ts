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
import type { Project, VariantLoad } from "../../../core/project.ts";
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

/** Options of a VCF the user set and has not yet applied by a pick or a
    read again, with the load they were set on. */
export interface EditedOptions {
  /** The load id of the variants file when they were set; `null` with
      none. */
  readonly forLoad: string | null;
  /** The options. */
  readonly options: VcfReadOptions;
}

/**
 * The options the step shows: those the user set and did not apply,
 * while the load they were set on is the project's; otherwise those it
 * starts at, of the VCF loaded, of the reference or the defaults. The
 * step forgets the edits once a pick or a read again applies them, so
 * that an undo shows the options of the load it goes back to.
 */
export function shownOptions(
  edited: EditedOptions | null,
  p: Project,
): VcfReadOptions {
  const loadId = p.variants?.fileId ?? null;
  return edited !== null && edited.forLoad === loadId
    ? edited.options
    : startingOptions(p);
}
