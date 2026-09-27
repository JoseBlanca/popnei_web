/**
 * The commands the Variants step sends to the store, each with the
 * description that ends its notice and names its step of undo
 * (docs/specs/steps/variants.md, "What it sends and reads"), and the
 * options of a VCF the step shows. Pure, so that a test in node applies
 * them to the real store.
 */

import { FILTER_NAMES } from "../../../core/analyses/filterCounts.ts";
import { DEFAULT_MAX_MISSING_RATE } from "../../../core/apps.ts";
import {
  loadVariants,
  removeVariantFilter,
  setVariantFilter,
} from "../../../core/project.ts";
import type { Project, Reference, VariantLoad } from "../../../core/project.ts";
import type {
  VariantFilter,
  VariantFilterKind,
  VcfReadOptions,
} from "../../../worker/protocol.ts";
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

/** The threshold the filter by observed heterozygosity starts at when it
    is turned on: 0.5, the most a variant of two alleles has in
    Hardy-Weinberg proportions, so that more points to a paralogue read as
    one site. popnei gives no default; the owner kept this value on 26
    September 2026 (docs/specs/stage-3-open-points.md, point F). */
export const OBS_HET_TURNED_ON = 0.5;

/** The threshold the MAF filter starts at when it is turned on, the
    default of docs/functionality.md, section 3. */
export const MAF_TURNED_ON = 0.95;

/** The maximum r² the LD pruning starts at when it is turned on, the
    example of the doc comment of popnei's filters; kept by the owner on
    26 September 2026, as the observed heterozygosity's. */
export const LD_R2_TURNED_ON = 0.3;

/** The distance in base pairs the LD pruning starts at when it is
    turned on, with its r². */
export const LD_DIST_TURNED_ON = 10000;

/** The filter of the kind `kind` with the values it starts at when its
    switch is turned on (docs/specs/steps/variants.md, "The filters of the
    variants"). */
export function turnedOnFilter(kind: VariantFilterKind): VariantFilter {
  switch (kind) {
    case "missing_data":
      return { kind, maxAllowedMissingRate: DEFAULT_MAX_MISSING_RATE };
    case "obs_het":
      return { kind, maxAllowedObsHet: OBS_HET_TURNED_ON };
    case "maf":
      return { kind, maxAllowedMaf: MAF_TURNED_ON };
    case "ld":
      return {
        kind,
        maxAllowedR2: LD_R2_TURNED_ON,
        maxDist: LD_DIST_TURNED_ON,
      };
  }
}

/** The name of a filter of the variants inside a sentence, "the MAF
    filter", as the words of the counts of the filters name it. */
function filterName(kind: VariantFilterKind): string {
  const name = FILTER_NAMES[kind];
  return `${name.charAt(0).toLowerCase()}${name.slice(1)}`;
}

/** A field of a filter of the variants committed: the filter with its
    fields, "the MAF filter changed". */
export function filterCommand(filter: VariantFilter): StepCommand {
  return {
    description: `${filterName(filter.kind)} changed`,
    command: (p) => setVariantFilter(p, filter),
  };
}

/** The switch of the filter of the kind `kind` turned on, with the values
    it starts at, or off. */
export function filterSwitchCommand(
  kind: VariantFilterKind,
  on: boolean,
): StepCommand {
  if (on) {
    const filter = turnedOnFilter(kind);
    return {
      description: `${filterName(kind)} was turned on`,
      command: (p) => setVariantFilter(p, filter),
    };
  }
  return {
    description: `${filterName(kind)} was turned off`,
    command: (p) => removeVariantFilter(p, kind),
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
