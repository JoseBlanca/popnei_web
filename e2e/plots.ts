/**
 * The script of e2e/plots.html, the page of the tests of the plots
 * (docs/specs/charts/plot2d.md and scatter.md, "How it is verified"): the
 * histogram of the MAF of e2e/fixtures/panel.nei, its bins as literals,
 * and a scatter of 9,381 points in four populations and none, drawn at
 * the size a test sets, with the handle given to the test as
 * `window.plotsPage`. No screen offers the export before stage 6, nor the
 * scatter before the PCA panel, so this page is where they are seen
 * working in a browser.
 */

import "../src/ui/tokens.css";
import { PngError } from "../src/charts/export.ts";
import { createHistogram } from "../src/charts/histogram.ts";
import type { HistogramData } from "../src/charts/histogram.ts";
import { NO_GROUP } from "../src/charts/marks.ts";
import {
  createScatter,
  SCATTER_MARGIN,
  scatterScales,
} from "../src/charts/scatter.ts";
import type { ScatterData } from "../src/charts/scatter.ts";
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

/** The points of the scatter: the most individuals popnei takes. */
const NUM_POINTS = 9381;

/**
 * The name of point 0: markup that would run if it were set as HTML
 * (scatter.md, "The cases").
 */
const MARKUP_NAME = '<img src=x onerror="window.plotsInjected = true">';

/**
 * The scatter: four populations around (±1, ±0.5), each point within
 * 0.45 of its centre, and every fifth point in none, within 0.45 of
 * (0, 0), placed by a linear congruential generator so that every engine
 * draws the same. Point 0, of P1, is alone at (0, 1.1), the top of the
 * data, 0.55 at least from every other point, 90 pixels at the scale of a
 * plot of 600 by 450; point 1, of P2, alone at (1.6, −1.1), the bottom
 * right corner, where its tooltip has no room on the right nor below.
 * The name of the fourth population is markup.
 */
function scatterData(): ScatterData {
  let state = 12345;
  const next = (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
  const centres: readonly (readonly [number, number])[] = [
    [-1, 0.5],
    [1, 0.5],
    [-1, -0.5],
    [1, -0.5],
  ];
  const x = new Float64Array(NUM_POINTS);
  const y = new Float64Array(NUM_POINTS);
  const group = new Uint16Array(NUM_POINTS);
  const pointNames: string[] = [];
  for (let index = 0; index < NUM_POINTS; index++) {
    const kind = index % 5;
    const [centreX, centreY] = centres[kind] ?? [0, 0];
    const radius = 0.45 * Math.sqrt(next());
    const angle = 2 * Math.PI * next();
    x[index] = centreX + radius * Math.cos(angle);
    y[index] = centreY + radius * Math.sin(angle);
    group[index] = kind === 4 ? NO_GROUP : kind;
    pointNames.push(`ind${String(index)}`);
  }
  x[0] = 0;
  y[0] = 1.1;
  pointNames[0] = MARKUP_NAME;
  x[1] = 1.6;
  y[1] = -1.1;
  return {
    title: "Principal components",
    description: `Principal components of ${NUM_POINTS.toLocaleString("en-US")} individuals, for the tests.`,
    xLabel: "PC1 (3.55%)",
    yLabel: "PC2 (3.40%)",
    x,
    y,
    xName: "PC1",
    yName: "PC2",
    pointNames,
    colours: {
      kind: "groups",
      title: "Population",
      group,
      names: ["P1", "P2", "P3", "<b>P4</b>"],
      noneName: "No population",
      highlighted: null,
    },
  };
}

const SCATTER = scatterData();

/** The scatter with `highlighted` as the group the legend highlights. */
function highlightedData(highlighted: number | null): ScatterData {
  if (SCATTER.colours.kind !== "groups") {
    throw new Error("popnei_web defect: the page's scatter is not of groups.");
  }
  return { ...SCATTER, colours: { ...SCATTER.colours, highlighted } };
}

/** A plot of the page: its element and its handle. */
type Drawn =
  | {
      readonly kind: "histogram";
      readonly element: HTMLElement;
      readonly handle: ChartHandle<HistogramData>;
    }
  | {
      readonly kind: "scatter";
      readonly element: HTMLElement;
      readonly handle: ChartHandle<ScatterData>;
    };

const found = document.getElementById("plots");
if (found === null) {
  throw new Error("popnei_web defect: e2e/plots.html has no #plots.");
}
const plots: HTMLElement = found;

let drawn: Drawn | null = null;
/** The calls of the scatter's onHover since it was drawn. */
let hovers: (number | null)[] = [];

function last(): Drawn {
  if (drawn === null) {
    throw new Error("popnei_web defect: no plot was drawn on the page.");
  }
  return drawn;
}

function lastScatter(): Extract<Drawn, { kind: "scatter" }> {
  const plot = last();
  if (plot.kind !== "scatter") {
    throw new Error("popnei_web defect: the plot drawn last is no scatter.");
  }
  return plot;
}

/**
 * A new element of `width` by `height` CSS pixels, in place of the plot
 * drawn before, `position: relative` as the screen's CSS makes the
 * element of a scatter, so that its tooltip is placed inside it.
 */
function newElement(width: number, height: number): HTMLElement {
  if (drawn !== null) {
    drawn.handle.destroy();
    drawn.element.remove();
    drawn = null;
  }
  const element = document.createElement("div");
  element.style.position = "relative";
  element.style.width = `${String(width)}px`;
  element.style.height = `${String(height)}px`;
  plots.append(element);
  return element;
}

/**
 * Where each point of the scatter in `element` is in the viewport, x and
 * y, two per point: the corner of the element, the margin and the scales,
 * computed apart from what the plot computes from the pointer.
 */
function viewportPixels(element: HTMLElement): Float64Array {
  const innerWidth =
    element.clientWidth - SCATTER_MARGIN.left - SCATTER_MARGIN.right;
  const innerHeight =
    element.clientHeight - SCATTER_MARGIN.top - SCATTER_MARGIN.bottom;
  const scales = scatterScales(SCATTER, innerWidth, innerHeight);
  const box = element.getBoundingClientRect();
  const pixels = new Float64Array(2 * NUM_POINTS);
  for (const [index, x] of SCATTER.x.entries()) {
    pixels[2 * index] = box.left + SCATTER_MARGIN.left + scales.x(x);
    pixels[2 * index + 1] =
      box.top + SCATTER_MARGIN.top + scales.y(SCATTER.y[index] ?? Number.NaN);
  }
  return pixels;
}

/**
 * Waits for the next frame drawn: a callback of that frame, then a
 * message, which runs once it has been drawn, as the walking skeleton
 * measured its points (e2e/measure/points.ts).
 */
async function nextFrame(): Promise<void> {
  await new Promise((done) => requestAnimationFrame(done));
  await new Promise((done) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = done;
    channel.port2.postMessage(null);
  });
}

const page: PlotsPage = {
  draw(width, height) {
    const element = newElement(width, height);
    const handle = createHistogram(element, MAF);
    drawn = { kind: "histogram", element, handle };
    return handle;
  },
  drawScatter(width, height) {
    const element = newElement(width, height);
    hovers = [];
    const handle = createScatter(element, SCATTER, {
      onHover(point) {
        hovers.push(point);
      },
    });
    drawn = { kind: "scatter", element, handle };
    return handle;
  },
  highlight(highlighted) {
    lastScatter().handle.update(highlightedData(highlighted));
  },
  pointPixel(index) {
    const pixels = viewportPixels(lastScatter().element);
    const x = pixels[2 * index];
    const y = pixels[2 * index + 1];
    if (x === undefined || y === undefined) {
      throw new Error(
        `popnei_web defect: the scatter has no point ${String(index)}.`,
      );
    }
    return { x, y };
  },
  nearestDistance(x, y, except) {
    const pixels = viewportPixels(lastScatter().element);
    let nearest = Infinity;
    for (let index = 0; index < NUM_POINTS; index++) {
      if (index === except) continue;
      const dx = (pixels[2 * index] ?? Number.NaN) - x;
      const dy = (pixels[2 * index + 1] ?? Number.NaN) - y;
      nearest = Math.min(nearest, Math.hypot(dx, dy));
    }
    return nearest;
  },
  hovers: () => [...hovers],
  markupRan: () => "plotsInjected" in window,
  async timeScatter(width, height, repeats) {
    const element = newElement(width, height);
    const create: number[] = [];
    const createCall: number[] = [];
    const highlight: number[] = [];
    const highlightCall: number[] = [];
    // One drawing first that is not counted, as the plot's own first
    // drawing warms the engine's compiler.
    for (let repeat = -1; repeat < repeats; repeat++) {
      await nextFrame();
      const start = performance.now();
      const handle = createScatter(element, SCATTER);
      const createReturned = performance.now();
      await nextFrame();
      const created = performance.now();
      // A group highlighted, a different one in each repetition.
      handle.update(highlightedData(Math.max(0, repeat) % 4));
      const updateReturned = performance.now();
      await nextFrame();
      const updated = performance.now();
      handle.destroy();
      if (repeat >= 0) {
        create.push(created - start);
        createCall.push(createReturned - start);
        highlight.push(updated - created);
        highlightCall.push(updateReturned - created);
      }
    }
    element.remove();
    return { create, createCall, highlight, highlightCall };
  },
  element: () => last().element,
  handle: () => last().handle,
  pngErrorKind: (error) => (error instanceof PngError ? error.kind : null),
};

window.plotsPage = page;
