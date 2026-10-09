/**
 * The commands of the options of the principal components
 * (docs/specs/analyses/pca.md, "What it sends and reads" and "On
 * popgen2.html"): each option the panel changes is `setAnalysisOptions(p,
 * ‹the page's definition›, { ...pcaOptions(p, page), ‹the option› })`,
 * with the description that ends the notice and names the header's Undo,
 * in the words of the page (docs/specs/steps/popgen2-pca.md, "What is a
 * step"). Each reads and writes the options of its page: on popgen2.html a
 * command that read the old page's would write PCA_DEFAULTS, whose LD
 * filter follows, and turn the LD pruning off at the first change of the
 * colour. Pure, so that a test in node checks them.
 */

import {
  PCA_NUM_COMPS_KEPT,
  pca,
  pcaOnPopgen2,
  pcaOptions,
} from "../../../core/analyses/pca.ts";
import type { PcaOptions, PcaPage } from "../../../core/analyses/pca.ts";
import type { JsonObject } from "../../../core/keys.ts";
import type { Project } from "../../../core/project.ts";
import type { PcaMethod } from "../../../worker/protocol.ts";
import { optionCommand } from "../optionCommand.ts";
import type { OptionCommand, OptionsOf } from "../optionCommand.ts";
import {
  AXES_DESCRIPTION,
  COLOUR_DESCRIPTION,
  METHOD_DESCRIPTION,
  POPGEN2_DESCRIPTIONS,
  ownValueDescription,
  setBackDescription,
  setOwnDescription,
  viewDescription,
} from "./words.ts";
import type { OwnFilterKind } from "./words.ts";

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

/**
 * The page a command is made for: the old page, or popgen2.html with the
 * method of its project, which names the PCA or the PCoA in the
 * descriptions of that page. The method is the caller's, which draws the
 * options with it, since a description is made before the command meets
 * the project.
 */
export type CommandPage =
  "popgen" | { readonly page: "popgen2"; readonly method: PcaMethod };

/** The page of the options of `page`. */
function pageOf(page: CommandPage): PcaPage {
  return page === "popgen" ? "popgen" : page.page;
}

/** The options of the principal components of each page, as the commands
    read and write them: the page's definition and its defaults. */
const PCA_OPTIONS: Readonly<Record<PcaPage, OptionsOf<PcaOptions>>> =
  Object.freeze({
    popgen: Object.freeze({
      analysis: pca,
      read: (p: Project) => pcaOptions(p, "popgen"),
      json: optionsJson,
    }),
    popgen2: Object.freeze({
      analysis: pcaOnPopgen2,
      read: (p: Project) => pcaOptions(p, "popgen2"),
      json: optionsJson,
    }),
  });

/** The command of the page `page` that changes the options of the
    project as `change` makes them of those it has, with the description
    of the old page, `old`, or of popgen2.html, `ofPopgen2` given the
    method of its project. */
function withOptions(
  page: CommandPage,
  old: string,
  ofPopgen2: (method: PcaMethod) => string,
  change: (o: PcaOptions) => PcaOptions,
): OptionCommand {
  return optionCommand(
    PCA_OPTIONS[pageOf(page)],
    page === "popgen" ? old : ofPopgen2(page.method),
    change,
  );
}

/** The method; on popgen2.html its description names the method chosen,
    the method of the project after it. */
export function methodCommand(
  method: PcaMethod,
  page: CommandPage,
): OptionCommand {
  return withOptions(
    page,
    METHOD_DESCRIPTION,
    () => POPGEN2_DESCRIPTIONS.method(method),
    (o) => ({ ...o, method }),
  );
}

/**
 * The filter of `kind` set for the analysis alone, `follow` false, with
 * the values it keeps; or set back to that of the Variants step, `follow`
 * true, the values kept for the next time. On popgen2.html, the LD
 * pruning turned on or off; a missing data or a MAF filter is made
 * stricter there by `stricterCommand`, whose description this gives.
 */
export function followCommand(
  kind: OwnFilterKind,
  follow: boolean,
  page: CommandPage,
): OptionCommand {
  const old = follow ? setBackDescription(kind) : setOwnDescription(kind);
  const ofPopgen2 = (method: PcaMethod): string =>
    follow
      ? POPGEN2_DESCRIPTIONS.setBack(kind, method)
      : kind === "ld"
        ? POPGEN2_DESCRIPTIONS.turnedOn(method)
        : POPGEN2_DESCRIPTIONS.stricter(kind, method);
  return withOptions(page, old, ofPopgen2, (o) => {
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
export function ownValueCommand(
  value: OwnValue,
  page: CommandPage,
): OptionCommand {
  const ofPopgen2 = (method: PcaMethod): string =>
    POPGEN2_DESCRIPTIONS.value(value.kind, method);
  return withOptions(page, ownValueDescription(value.kind), ofPopgen2, (o) => {
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

/**
 * A missing data or a MAF filter of popgen2.html made stricter than the
 * Variants tab's: `follow` false and the value `value` in one command, one
 * step of Undo, the value the upper end of its field, so that the choice
 * alone changes no variant the PCA reads (docs/specs/steps/popgen2-pca.md,
 * "Its filters").
 */
export function stricterCommand(
  kind: "missing_data" | "maf",
  value: number,
  page: CommandPage,
): OptionCommand {
  const ofPopgen2 = (method: PcaMethod): string =>
    POPGEN2_DESCRIPTIONS.stricter(kind, method);
  return withOptions(page, setOwnDescription(kind), ofPopgen2, (o) =>
    kind === "missing_data"
      ? { ...o, missingData: { follow: false, maxAllowedMissingRate: value } }
      : { ...o, maf: { follow: false, maxAllowedMaf: value } },
  );
}

/** The column that colours the points, or `null` for the populations. */
export function colourCommand(
  colourBy: string | null,
  page: CommandPage,
): OptionCommand {
  return withOptions(
    page,
    COLOUR_DESCRIPTION,
    POPGEN2_DESCRIPTIONS.colour,
    (o) => ({
      ...o,
      colourBy,
    }),
  );
}

/** The view, 3D or 2D. */
export function viewCommand(
  view: "3d" | "2d",
  page: CommandPage,
): OptionCommand {
  const ofPopgen2 = (method: PcaMethod): string =>
    POPGEN2_DESCRIPTIONS.view(view, method);
  return withOptions(page, viewDescription(view), ofPopgen2, (o) => ({
    ...o,
    view,
  }));
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
  page: CommandPage,
): OptionCommand {
  const ofPopgen2 = (): string => AXES_DESCRIPTION;
  return withOptions(page, AXES_DESCRIPTION, ofPopgen2, (o) => {
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
