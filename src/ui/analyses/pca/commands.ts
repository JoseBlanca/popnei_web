/**
 * The commands of the options of the principal components
 * (docs/specs/analyses/pca.md, "What it sends and reads"): each option the
 * panel changes is `setAnalysisOptions(p, pca, { ...pcaOptions(p), ‹the
 * option› })`, with the description that ends the notice and names the
 * header's Undo. Pure, so that a test in node checks them.
 */

import {
  PCA_NUM_COMPS_KEPT,
  pca,
  pcaOptions,
} from "../../../core/analyses/pca.ts";
import type { PcaOptions } from "../../../core/analyses/pca.ts";
import type { JsonObject } from "../../../core/keys.ts";
import { setAnalysisOptions } from "../../../core/project.ts";
import type { Project } from "../../../core/project.ts";
import type { PcaMethod } from "../../../worker/protocol.ts";
import {
  AXES_DESCRIPTION,
  COLOUR_DESCRIPTION,
  METHOD_DESCRIPTION,
  ownValueDescription,
  setBackDescription,
  setOwnDescription,
  viewDescription,
} from "./words.ts";
import type { OwnFilterKind } from "./words.ts";

/** A command of the store, with its description. */
export interface OptionCommand {
  /** The words that end the notice of the results it removes. */
  readonly description: string;
  /** The new project, of the project it is given. */
  readonly command: (p: Project) => Project;
}

/** The options as the JSON object `parseOptions` reads. */
function optionsJson(o: PcaOptions): JsonObject {
  return {
    method: o.method,
    missingData: {
      follow: o.missingData.follow,
      maxAllowedMissingRate: o.missingData.maxAllowedMissingRate,
    },
    maf: { follow: o.maf.follow, maxAllowedMaf: o.maf.maxAllowedMaf },
    ld: {
      follow: o.ld.follow,
      maxAllowedR2: o.ld.maxAllowedR2,
      maxDist: o.ld.maxDist,
    },
    colourBy: o.colourBy,
    axes: [...o.axes],
    view: o.view,
  };
}

/** The command that changes the options of the project as `change` makes
    them of those it has. */
function withOptions(
  description: string,
  change: (o: PcaOptions) => PcaOptions,
): OptionCommand {
  return {
    description,
    command: (p) =>
      setAnalysisOptions(p, pca, optionsJson(change(pcaOptions(p)))),
  };
}

/** The method. */
export function methodCommand(method: PcaMethod): OptionCommand {
  return withOptions(METHOD_DESCRIPTION, (o) => ({ ...o, method }));
}

/** The filter of `kind` set for the analysis alone, `follow` false, with
    the values it keeps; or set back to that of the Variants step, `follow`
    true, the values kept for the next time. */
export function followCommand(
  kind: OwnFilterKind,
  follow: boolean,
): OptionCommand {
  const description = follow
    ? setBackDescription(kind)
    : setOwnDescription(kind);
  return withOptions(description, (o) => {
    switch (kind) {
      case "missing_data":
        return { ...o, missingData: { ...o.missingData, follow } };
      case "maf":
        return { ...o, maf: { ...o.maf, follow } };
      case "ld":
        return { ...o, ld: { ...o.ld, follow } };
    }
  });
}

/** A value of a filter set for the analysis alone. */
export type OwnValue =
  | { readonly kind: "missing_data"; readonly maxAllowedMissingRate: number }
  | { readonly kind: "maf"; readonly maxAllowedMaf: number }
  | { readonly kind: "ld"; readonly maxAllowedR2: number }
  | { readonly kind: "ld"; readonly maxDist: number };

/** The value `value` of a filter set for the analysis alone. */
export function ownValueCommand(value: OwnValue): OptionCommand {
  return withOptions(ownValueDescription(value.kind), (o) => {
    switch (value.kind) {
      case "missing_data":
        return {
          ...o,
          missingData: {
            ...o.missingData,
            maxAllowedMissingRate: value.maxAllowedMissingRate,
          },
        };
      case "maf":
        return { ...o, maf: { ...o.maf, maxAllowedMaf: value.maxAllowedMaf } };
      case "ld":
        return "maxAllowedR2" in value
          ? { ...o, ld: { ...o.ld, maxAllowedR2: value.maxAllowedR2 } }
          : { ...o, ld: { ...o.ld, maxDist: value.maxDist } };
    }
  });
}

/** The column that colours the points, or `null` for the populations. */
export function colourCommand(colourBy: string | null): OptionCommand {
  return withOptions(COLOUR_DESCRIPTION, (o) => ({ ...o, colourBy }));
}

/** The view, 3D or 2D. */
export function viewCommand(view: "3d" | "2d"): OptionCommand {
  return withOptions(viewDescription(view), (o) => ({ ...o, view }));
}

/**
 * The component `component` on the axis `axis`, 0 to 2, of those shown
 * `shown`, which may differ from the options' when these are beyond the
 * result: the axes become those shown with the choice, and the rest of the
 * options' after them. The three axes are always three different
 * components: choosing for one axis the component another shows swaps the
 * two, so that PC2 on the horizontal axis of PC1 against PC2 gives PC2
 * against PC1, in one command.
 */
export function axisCommand(
  shown: readonly number[],
  axis: number,
  component: number,
): OptionCommand {
  return withOptions(AXES_DESCRIPTION, (o) => {
    const axes: number[] = [...o.axes];
    for (const [i, one] of shown.entries()) axes[i] = one;
    // An axis of the options not shown that repeats one shown takes the
    // first component no axis has, so that the three stay different.
    for (let i = shown.length; i < axes.length; i++) {
      if (axes.slice(0, i).includes(axes[i] ?? 0)) {
        axes[i] =
          Array.from({ length: PCA_NUM_COMPS_KEPT }, (_, c) => c + 1).find(
            (c) => !axes.includes(c),
          ) ?? 0;
      }
    }
    const current = axes[axis];
    const other = axes.indexOf(component);
    if (current === undefined) {
      throw new Error(
        `popnei_web defect: the axis ${String(axis)} of the principal components was chosen, of three.`,
      );
    }
    if (other !== -1) axes[other] = current;
    axes[axis] = component;
    const [first, second, third] = axes;
    if (first === undefined || second === undefined || third === undefined) {
      throw new Error(
        "popnei_web defect: the principal components have fewer than three axes.",
      );
    }
    return { ...o, axes: [first, second, third] };
  });
}
