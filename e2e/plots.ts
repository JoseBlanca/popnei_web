/**
 * The script of e2e/plots.html, the page of the tests of the plots
 * (docs/specs/charts/plot2d.md, "How it is verified"): the histogram of
 * the MAF of e2e/fixtures/panel.nei, its bins as literals, drawn at the
 * size a test sets, with its handle given to the test as
 * `window.plotsPage`. No screen offers the export before stage 6, so this
 * page is where it is seen working in a browser.
 */

import "../src/ui/tokens.css";
import { PngError } from "../src/charts/export.ts";
import { createHistogram } from "../src/charts/histogram.ts";
import type { HistogramData } from "../src/charts/histogram.ts";
import type { ChartHandle } from "../src/charts/types.ts";
import type { PlotsPage } from "./plotsPage.ts";

/**
 * The edges of the default 40 bins over [0, 1] as popnei gives them,
 * `histBinEdges` of calcPerVarDistribs with the release js-v0.1.0-dev.2,
 * on 26 September 2026, as in src/charts/histogram.test.ts.
 */
const EDGES_40 = Float64Array.from([
  0, 0.025, 0.05, 0.07500000000000001, 0.1, 0.125, 0.15000000000000002,
  0.17500000000000002, 0.2, 0.225, 0.25, 0.275, 0.30000000000000004, 0.325,
  0.35000000000000003, 0.375, 0.4, 0.42500000000000004, 0.45,
  0.47500000000000003, 0.5, 0.525, 0.55, 0.5750000000000001, 0.6000000000000001,
  0.625, 0.65, 0.675, 0.7000000000000001, 0.7250000000000001, 0.75, 0.775, 0.8,
  0.8250000000000001, 0.8500000000000001, 0.875, 0.9, 0.925, 0.9500000000000001,
  0.9750000000000001, 1,
]);

/** The counts of the MAF of panel.nei, every variant and individual. */
const MAF_COUNTS = Uint32Array.from([
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 69, 75, 62, 71,
  60, 74, 72, 83, 70, 68, 64, 83, 64, 63, 67, 57, 48, 25, 22, 3,
]);

/** The histogram, at the threshold of the MAF filter of a new project. */
const MAF: HistogramData = {
  title: "Major allele frequency",
  description: "The major allele frequency of 1,200 variants.",
  xLabel: "Major allele frequency",
  yLabel: "Variants",
  edges: EDGES_40,
  counts: MAF_COUNTS,
  threshold: {
    value: 0.95,
    label: "Maximum 0.95",
    keptLabel: "Kept by this filter",
    removedLabel: "Removed by this filter",
  },
};

/** A plot of the page: its element and its handle. */
interface Drawn {
  readonly element: HTMLElement;
  readonly handle: ChartHandle<HistogramData>;
}

const found = document.getElementById("plots");
if (found === null) {
  throw new Error("popnei_web defect: e2e/plots.html has no #plots.");
}
const plots: HTMLElement = found;

let drawn: Drawn | null = null;

function last(): Drawn {
  if (drawn === null) {
    throw new Error("popnei_web defect: no plot was drawn on the page.");
  }
  return drawn;
}

const page: PlotsPage = {
  draw(width, height) {
    if (drawn !== null) {
      drawn.handle.destroy();
      drawn.element.remove();
    }
    const element = document.createElement("div");
    element.style.width = `${String(width)}px`;
    element.style.height = `${String(height)}px`;
    plots.append(element);
    const handle = createHistogram(element, MAF);
    drawn = { element, handle };
    return handle;
  },
  element: () => last().element,
  handle: () => last().handle,
  pngErrorKind: (error) => (error instanceof PngError ? error.kind : null),
};

window.plotsPage = page;
