/**
 * The FILTER box of popgen2.html, apart from its drawing
 * (docs/specs/steps/popgen2-filters.md, "The FILTER box" and "What it
 * sends and reads"): whether it is shown, whether it is ticked, and the
 * change of the project a click makes, with the description that names
 * its step of Undo and ends its notice. Pure, so that a test in node
 * checks them over the real store of the page.
 */
import { filterNameInSentence } from "../../core/analyses/filterCounts.ts";
import { setVariantFilter, turnOffVariantFilter } from "../../core/project.ts";
import type { Project } from "../../core/project.ts";

/** Whether the box is shown: once the opening of the file has answered
    that its variants record whether they passed their FILTER, popnei's
    `keepsPassed` in the read of the file, for a VCF as for a `.nei`
    file. Not while the file is opened, nor after an opening that failed,
    whatever the format; so not `keepsPassed(project.variants)`, which
    answers by the format before the read. */
export function passedFilterShown(p: Project): boolean {
  const read = p.variants?.read;
  return read?.kind === "read" && read.keepsPassed;
}

/** Whether the box is ticked: the filter of the FILTER column on in the
    project, whatever the file open. */
export function passedFilterOn(p: Project): boolean {
  return p.filters.some((f) => f.kind === "passed");
}

/** A change of the project and the description of its step of Undo. */
export interface PassedFilterChange {
  /** The words that name the step of Undo and end its notice, "the
      filter of the FILTER column was turned off". */
  readonly description: string;
  /** The command of the project. */
  readonly command: (p: Project) => Project;
}

/** The change a click on the box makes, turning the filter of the
    FILTER column on when `on`, and off, kept with the filters off,
    otherwise. It changes no plot, since the key of the one pass holds no
    filter. */
export function passedFilterChange(on: boolean): PassedFilterChange {
  const name = filterNameInSentence("passed");
  return on
    ? {
        description: `${name} was turned on`,
        command: (p) => setVariantFilter(p, { kind: "passed" }),
      }
    : {
        description: `${name} was turned off`,
        command: (p) => turnOffVariantFilter(p, "passed"),
      };
}
