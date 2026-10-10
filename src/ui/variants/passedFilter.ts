/**
 * The FILTER box of popgen2.html, apart from its drawing
 * (docs/specs/steps/popgen2-filters.md, "The FILTER box" and "What it
 * sends and reads"): whether it is shown, whether it is ticked, and the
 * change of the project a click makes, with its description, the words
 * the store keeps with the change, which popgen2.html, with no Undo
 * since 10 October 2026, shows nowhere. Pure, so that a test in node
 * checks them over the real store of the page.
 */
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

/** The description of a click that ticks the box, in the box's own
    words (decided by the session on 8 October 2026, when the hints of
    Undo and Redo named it); shown nowhere on popgen2.html, which has no
    Undo since 10 October 2026. */
const PASSED_FILTER_ON = "the variants that failed their FILTER are left out";

/** The description of a click that unticks it. */
const PASSED_FILTER_OFF = "the variants that failed their FILTER are kept";

/** A change of the project and its description. */
export interface PassedFilterChange {
  /** The description of the change, the words of the box, "the variants
      that failed their FILTER are kept", which the store keeps with the
      change and popgen2.html shows nowhere. */
  readonly description: string;
  /** The command of the project. */
  readonly command: (p: Project) => Project;
}

/** The change a click on the box makes, turning the filter of the
    FILTER column on when `on`, and off, kept with the filters off,
    otherwise. It changes no plot, since the key of the one pass holds no
    filter. */
export function passedFilterChange(on: boolean): PassedFilterChange {
  return on
    ? {
        description: PASSED_FILTER_ON,
        command: (p) => setVariantFilter(p, { kind: "passed" }),
      }
    : {
        description: PASSED_FILTER_OFF,
        command: (p) => turnOffVariantFilter(p, "passed"),
      };
}
