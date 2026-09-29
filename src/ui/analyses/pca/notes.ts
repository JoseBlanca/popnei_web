/**
 * The notes under the plot of the principal components
 * (docs/specs/analyses/pca.md, "What it shows", the notes): why the
 * colours are not those the options ask, why the components drawn are not
 * those chosen, the marks that repeat past 49 groups, and the individuals
 * with many missing genotypes. They are not warnings, and have no count
 * on the heading. The panel announces those that a change of the colour,
 * the axes or the view makes appear, since the focus is then on the
 * control that made them (the spec, "Accessibility"). Pure, so that a
 * test in node checks them.
 */

import {
  axesShown,
  manyMissingNote,
  pcaColours,
  pcaOptions,
} from "../../../core/analyses/pca.ts";
import type { IndividualStats } from "../../../core/individualsKept.ts";
import type { Project } from "../../../core/project.ts";
import type { PcaResult } from "../../../worker/protocol.ts";
import { marksNote } from "./words.ts";

/** The notes of the result `r` in the project `p`, with the statistics
    of each individual `stats` when the store has them, in the order
    they are shown. */
export function notesOf(
  r: PcaResult,
  p: Project,
  stats: IndividualStats | null,
): readonly string[] {
  const colours = pcaColours(r, p);
  return [
    colours.note,
    axesShown(pcaOptions(p), r).note,
    marksNote(colours),
    manyMissingNote(r, stats, p),
  ].filter((note) => note !== null);
}

/** The notes of `after` that `before` did not have, which a change made
    appear. */
export function notesAppeared(
  before: readonly string[],
  after: readonly string[],
): readonly string[] {
  return after.filter((note) => !before.includes(note));
}
