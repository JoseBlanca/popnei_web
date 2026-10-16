/**
 * The words of the unclassified individuals kept that a run of the
 * populations leaves out, and of the populations the thresholds of the
 * individuals leave empty, one set for the diversity and the LD decay of
 * the Populations tab and the distances of the Distances tab
 * (docs/specs/steps/popgen2-populations.md and popgen2-distances.md,
 * "The populations it runs on"), which until 13 October 2026 each had
 * their own copy. Pure, so that a test in node checks them.
 */
import type { IndividualsKept } from "../../core/individualsKept.ts";
import {
  counted,
  namesOf,
  popgen2PopulationsKept,
} from "../../core/project.ts";
import type { Project } from "../../core/project.ts";

/** The number of the unclassified individuals of `p` kept, `kept`, that
    a run of the populations leaves out; 0 with none, for the one
    population, and with no individuals kept known. */
export function unclassifiedLeftOutOf(
  p: Project,
  kept: IndividualsKept | null,
): number {
  if (kept === null) return 0;
  const individuals =
    kept.list.kind === "known" ? kept.list.individuals : kept.byLists;
  return popgen2PopulationsKept(p, individuals)?.unclassifiedLeftOut ?? 0;
}

/** The unclassified individuals kept, `numLeftOut`, at the start of a
    sentence: "1 unclassified individual kept is", "7 unclassified
    individuals kept are". */
function leftOutSubject(numLeftOut: number): string {
  return numLeftOut === 1
    ? "1 unclassified individual kept is"
    : `${counted(numLeftOut, "unclassified individual")} kept are`;
}

/** The line under the options of what a run leaves out: "7
    unclassified individuals kept are left out, as the Individuals tab
    says." */
export function unclassifiedLine(numLeftOut: number): string {
  return `${leftOutSubject(numLeftOut)} left out, as the Individuals tab says.`;
}

/** The sentence that ends the caption of a result when unclassified
    individuals kept, `numLeftOut`, are left out: of a table of each
    population, the diversity's and the LD decay's, "notInIt", "7
    unclassified individuals kept are not in it."; of the distances,
    "leftOut", "… are left out." */
export function unclassifiedCaption(
  numLeftOut: number,
  how: "notInIt" | "leftOut",
): string {
  return `${leftOutSubject(numLeftOut)} ${how === "notInIt" ? "not in it" : "left out"}.`;
}

/** The populations the thresholds of the individuals leave empty, which
    a run leaves out, and what to do: "p9 has no individual left after
    the thresholds of the individuals, and is left out. Loosen the
    thresholds of the individuals in the Variants tab to keep it." */
export function emptiedLine(emptied: readonly string[]): string {
  const one = emptied.length === 1;
  return `${namesOf(emptied)} ${one ? "has" : "have"} no individual left after the thresholds of the individuals, and ${one ? "is" : "are"} left out. Loosen the thresholds of the individuals in the Variants tab to keep ${one ? "it" : "them"}.`;
}
