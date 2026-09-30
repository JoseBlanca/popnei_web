/**
 * The words of the panel of the distances between populations that are
 * not core's (docs/specs/analyses/popDists.md, "The panel" and
 * "Accessibility"): the title of the heatmap, and what the status region
 * of the shell says when the radio buttons change the measure, since the
 * heatmap is drawn again without moving the focus (docs/specs/shell.md,
 * "The status region").
 */
import { MEASURE_NAMES } from "../../../core/analyses/popDists.ts";
import type { ShownMeasure } from "../../../worker/protocol.ts";

/** The title of the heatmap of `measure`, "Hudson's Fst between
    populations". */
export function heatmapTitle(measure: ShownMeasure): string {
  return `${MEASURE_NAMES[measure]} between populations`;
}

/** What the status region says when the radio buttons "Distance in the
    heatmap" are set to `measure`, "Heatmap of Jost's D". */
export function measureAnnounced(measure: ShownMeasure): string {
  return `Heatmap of ${MEASURE_NAMES[measure]}`;
}
