/**
 * The script of e2e/plots.html, the page of the tests of the plots
 * (docs/specs/charts/plot2d.md and scatter.md, "How it is verified"): the
 * histogram of the MAF of e2e/fixtures/panel.nei, its bins as literals,
 * and a scatter of 9,381 points in four populations and none, drawn at
 * the size a test sets, with the handle given to the test as
 * `window.plotsPage`; and the 3D plot of those points with a third
 * coordinate, loaded with `import()` as the screen loads it
 * (docs/specs/charts/pca3d.md, "How it is verified"). No screen offers the
 * export before stage 6, nor the scatter and the 3D plot before the PCA
 * panel, so this page is where they are seen working in a browser.
 */

import "../src/ui/tokens.css";
import { PngError } from "../src/charts/export.ts";
import { createHistogram } from "../src/charts/histogram.ts";
import type { HistogramData } from "../src/charts/histogram.ts";
import { NO_GROUP } from "../src/charts/marks.ts";
import type * as Pca3dModule from "../src/charts/pca3d.ts";
import type { Pca3dData, Pca3dHandle, ViewName } from "../src/charts/pca3d.ts";
import { projectToScreen } from "../src/charts/project.ts";
import {
  createScatter,
  SCATTER_MARGIN,
  scatterScales,
} from "../src/charts/scatter.ts";
import type { ScatterData } from "../src/charts/scatter.ts";
import type { ChartHandle } from "../src/charts/types.ts";
import type { Pca3dKind, PlotsPage } from "./plotsPage.ts";

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
 * right corner, where its tooltip has no room on the right nor below;
 * point 2, in no population, alone at (−1.6, −1.1), the bottom left
 * corner, a ring whose middle shows the background. The name of the
 * fourth population is markup.
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
  x[2] = -1.6;
  y[2] = -1.1;
  group[2] = NO_GROUP;
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

/**
 * The cloud of the 3D plot: the scatter's points with a third coordinate,
 * each population around a depth of its own, −0.5 or 0.5, and none around
 * 0, within 0.4 of it, by a generator of its own. Point 0 at a depth of
 * 0.9, point 1 of −0.9 and point 2 of 0.9; points 3 and 4 moved to one
 * place across and up, (−1.6, 1.1), 0.85 from the centre of the nearest
 * population, at the depths −0.5 and 0.5.
 */
function cloudData(): Pca3dData {
  let state = 67890;
  const next = (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
  const depths = [0.5, -0.5, -0.5, 0.5, 0];
  const x = Float64Array.from(SCATTER.x);
  const y = Float64Array.from(SCATTER.y);
  const z = new Float64Array(NUM_POINTS);
  for (let index = 0; index < NUM_POINTS; index++) {
    z[index] = (depths[index % 5] ?? 0) + 0.4 * (2 * next() - 1);
  }
  z[0] = 0.9;
  z[1] = -0.9;
  z[2] = 0.9;
  x[3] = -1.6;
  y[3] = 1.1;
  z[3] = -0.5;
  x[4] = -1.6;
  y[4] = 1.1;
  z[4] = 0.5;
  return {
    title: "Principal components, in 3D",
    description: `Principal components of ${NUM_POINTS.toLocaleString("en-US")} individuals in 3D, for the tests.`,
    x,
    y,
    z,
    axisNames: ["PC1", "PC2", "PC3"],
    axisLabels: ["PC1 (3.55%)", "PC2 (3.40%)", "PC3 (1.89%)"],
    pointNames: SCATTER.pointNames,
    colours: SCATTER.colours,
  };
}

/** Five points in five populations, P1 to P5, each alone in its path. */
function fiveData(): Pca3dData {
  return {
    title: "Five individuals, in 3D",
    description: "Five individuals in five populations, for the tests.",
    x: Float64Array.from([0.2, -0.9, 0.5, 1, -0.3]),
    y: Float64Array.from([-0.4, 0.8, 0.1, -1, 0.6]),
    z: Float64Array.from([0.3, -0.2, 0.7, -0.6, 0]),
    axisNames: ["PC1", "PC2", "PC3"],
    axisLabels: ["PC1 (3.55%)", "PC2 (3.40%)", "PC3 (1.89%)"],
    pointNames: ["a", "b", "c", "d", "e"],
    colours: {
      kind: "groups",
      title: "Population",
      group: Uint16Array.from([0, 1, 2, 3, 4]),
      names: ["P1", "P2", "P3", "P4", "P5"],
      noneName: "No population",
      highlighted: null,
    },
  };
}

/** Forty points on a circle, each in a population of its own, Q1 to Q40. */
function fortyData(): Pca3dData {
  const count = 40;
  const angles = Array.from(
    { length: count },
    (_v, at) => (2 * Math.PI * at) / count,
  );
  return {
    title: "Forty populations, in 3D",
    description: "Forty individuals in forty populations, for the tests.",
    x: Float64Array.from(angles, Math.cos),
    y: Float64Array.from(angles, Math.sin),
    z: Float64Array.from(angles, (_angle, at) => at / count - 0.5),
    axisNames: ["PC1", "PC2", "PC3"],
    axisLabels: ["PC1 (3.55%)", "PC2 (3.40%)", "PC3 (1.89%)"],
    pointNames: angles.map((_angle, at) => `q${String(at)}`),
    colours: {
      kind: "groups",
      title: "Population",
      group: Uint16Array.from(angles, (_angle, at) => at),
      names: angles.map((_angle, at) => `Q${String(at + 1)}`),
      noneName: "No population",
      highlighted: null,
    },
  };
}

/**
 * Two points at (0.5, −0.5) across and up, away from the lines, point 0
 * of P1 at a depth of −0.5 and point 1 of P2 at 0.5, above it, and point
 * 2, of neither, at (1, 1, 1), which sets the scale.
 */
function pairData(): Pca3dData {
  return {
    title: "Two individuals at one place, in 3D",
    description: "Two individuals at one place, for the tests.",
    x: Float64Array.from([0.5, 0.5, 1]),
    y: Float64Array.from([-0.5, -0.5, 1]),
    z: Float64Array.from([-0.5, 0.5, 1]),
    axisNames: ["PC1", "PC2", "PC3"],
    axisLabels: ["PC1 (3.55%)", "PC2 (3.40%)", "PC3 (1.89%)"],
    pointNames: ["below", "above", "corner"],
    colours: {
      kind: "groups",
      title: "Population",
      group: Uint16Array.from([0, 1, NO_GROUP]),
      names: ["P1", "P2"],
      noneName: "No population",
      highlighted: null,
    },
  };
}

/**
 * The five points of `five`, coloured by the values 100, 200, 300 and 400
 * of the first four, and the fifth, e, with no value, a ring.
 */
function valuesData(): Pca3dData {
  return {
    ...fiveData(),
    title: "Five individuals by altitude, in 3D",
    description: "Five individuals coloured by altitude, for the tests.",
    colours: {
      kind: "values",
      title: "altitude",
      values: Float64Array.from([100, 200, 300, 400, Number.NaN]),
      noneName: "No value",
    },
  };
}

/** The five points of `five` with no first coordinate: none is drawn. */
function noneData(): Pca3dData {
  return {
    ...fiveData(),
    title: "No individual drawn, in 3D",
    description: "Five individuals with no first coordinate, for the tests.",
    x: new Float64Array(5).fill(Number.NaN),
  };
}

/** The five points of `five` with the first and second coordinates, and their labels, swapped. */
function swappedData(): Pca3dData {
  const five = fiveData();
  return {
    ...five,
    x: five.y,
    y: five.x,
    axisNames: ["PC2", "PC1", "PC3"],
    axisLabels: ["PC2 (3.40%)", "PC1 (3.55%)", "PC3 (1.89%)"],
  };
}

/**
 * The five points of `five` with markup in the title, the description,
 * the labels of the lines and the name of P4, which must show as text.
 */
function markupData(): Pca3dData {
  const five = fiveData();
  if (five.colours.kind !== "groups") {
    throw new Error("popnei_web defect: the page's five are not of groups.");
  }
  return {
    ...five,
    title: "<i>T</i>",
    description: MARKUP_NAME,
    axisLabels: ["<b>PC1</b>", "<b>PC2</b>", "<b>PC3</b>"],
    colours: {
      ...five.colours,
      names: ["P1", "P2", "P3", "<b>P4</b>", "P5"],
    },
  };
}

/**
 * A thousand points on a sphere of radius 1, spread by the golden angle,
 * each in a population of its own, T1 to T1000: the most groups a plot
 * draws.
 */
function thousandData(): Pca3dData {
  const count = 1000;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const at = Array.from({ length: count }, (_v, index) => index);
  const height = (index: number): number => 1 - (2 * (index + 0.5)) / count;
  const radius = (index: number): number => Math.sqrt(1 - height(index) ** 2);
  return {
    title: "A thousand populations, in 3D",
    description:
      "A thousand individuals in a thousand populations, for the tests.",
    x: Float64Array.from(
      at,
      (index) => radius(index) * Math.cos(golden * index),
    ),
    y: Float64Array.from(
      at,
      (index) => radius(index) * Math.sin(golden * index),
    ),
    z: Float64Array.from(at, height),
    axisNames: ["PC1", "PC2", "PC3"],
    axisLabels: ["PC1 (3.55%)", "PC2 (3.40%)", "PC3 (1.89%)"],
    pointNames: at.map((index) => `t${String(index)}`),
    colours: {
      kind: "groups",
      title: "Population",
      group: Uint16Array.from(at),
      names: at.map((index) => `T${String(index + 1)}`),
      noneName: "No population",
      highlighted: null,
    },
  };
}

/** The data of each kind of 3D plot of the page. */
function pca3dDataOf(kind: Pca3dKind): Pca3dData {
  switch (kind) {
    case "cloud":
      return cloudData();
    case "five":
      return fiveData();
    case "forty":
      return fortyData();
    case "pair":
      return pairData();
    case "values":
      return valuesData();
    case "none":
      return noneData();
    case "swapped":
      return swappedData();
    case "markup":
      return markupData();
    case "thousand":
      return thousandData();
  }
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
    }
  | {
      readonly kind: "pca3d";
      readonly element: HTMLElement;
      readonly handle: Pca3dHandle;
      readonly data: Pca3dData;
      readonly module: typeof Pca3dModule;
    };

const found = document.getElementById("plots");
if (found === null) {
  throw new Error("popnei_web defect: e2e/plots.html has no #plots.");
}
const plots: HTMLElement = found;

let drawn: Drawn | null = null;
/** The calls of onHover of the scatter or the 3D plot since it was drawn. */
let hovers: (number | null)[] = [];
/** The calls of onContextChange of the 3D plot since it was drawn. */
let contextChanges: boolean[] = [];

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

function lastPca3d(): Extract<Drawn, { kind: "pca3d" }> {
  const plot = last();
  if (plot.kind !== "pca3d") {
    throw new Error("popnei_web defect: the plot drawn last is no 3D plot.");
  }
  return plot;
}

/**
 * Where each point of the 3D plot drawn last is in the viewport at `view`
 * with a zoom of 1, x and y, two per point, NaN for a point not drawn:
 * the corner of the element, its padding, and the camera of that view
 * made apart from the plot's.
 */
function pca3dViewport(view: ViewName): Float64Array {
  const plot = lastPca3d();
  const { element, data, module } = plot;
  const style = getComputedStyle(element);
  const padLeft = Number.parseFloat(style.paddingLeft);
  const padTop = Number.parseFloat(style.paddingTop);
  const width =
    element.clientWidth - padLeft - Number.parseFloat(style.paddingRight);
  const height =
    element.clientHeight - padTop - Number.parseFloat(style.paddingBottom);
  const { camera, controls } = module.createView(null, width, height);
  module.lookAlong(controls, view);
  camera.updateMatrixWorld();
  const matrix = camera.projectionMatrix
    .clone()
    .multiply(camera.matrixWorldInverse)
    .toArray();
  const { positions, index } = module.scenePositions(data.x, data.y, data.z);
  const xy = new Float32Array((2 * positions.length) / 3);
  const depth = new Float32Array(positions.length / 3);
  projectToScreen(positions, matrix, width, height, xy, depth);
  const box = element.getBoundingClientRect();
  const pixels = new Float64Array(2 * data.x.length).fill(Number.NaN);
  for (const [at, point] of index.entries()) {
    pixels[2 * point] = box.left + padLeft + (xy[2 * at] ?? Number.NaN);
    pixels[2 * point + 1] = box.top + padTop + (xy[2 * at + 1] ?? Number.NaN);
  }
  return pixels;
}

/**
 * The padding of the element of the scatter, so that the tests see the
 * plot and its tooltip placed inside it.
 */
const SCATTER_PADDING = 8;

/**
 * A new element whose content is `width` by `height` CSS pixels, with
 * `padding` pixels around it, in place of the plot drawn before,
 * `position: relative` as the screen's CSS makes the element of a
 * scatter, so that its tooltip is placed inside it.
 */
function newElement(width: number, height: number, padding = 0): HTMLElement {
  if (drawn !== null) {
    drawn.handle.destroy();
    drawn.element.remove();
    drawn = null;
  }
  const element = document.createElement("div");
  element.style.position = "relative";
  element.style.width = `${String(width)}px`;
  element.style.height = `${String(height)}px`;
  element.style.padding = `${String(padding)}px`;
  plots.append(element);
  return element;
}

/**
 * Where each point of the scatter in `element` is in the viewport, x and
 * y, two per point: the corner of the element, its padding, the margin
 * and the scales, computed apart from what the plot computes from the
 * pointer.
 */
function viewportPixels(element: HTMLElement): Float64Array {
  const style = getComputedStyle(element);
  const padLeft = Number.parseFloat(style.paddingLeft);
  const padTop = Number.parseFloat(style.paddingTop);
  const innerWidth =
    element.clientWidth -
    padLeft -
    Number.parseFloat(style.paddingRight) -
    SCATTER_MARGIN.left -
    SCATTER_MARGIN.right;
  const innerHeight =
    element.clientHeight -
    padTop -
    Number.parseFloat(style.paddingBottom) -
    SCATTER_MARGIN.top -
    SCATTER_MARGIN.bottom;
  const scales = scatterScales(SCATTER, innerWidth, innerHeight);
  const box = element.getBoundingClientRect();
  const pixels = new Float64Array(2 * NUM_POINTS);
  for (const [index, x] of SCATTER.x.entries()) {
    pixels[2 * index] = box.left + padLeft + SCATTER_MARGIN.left + scales.x(x);
    pixels[2 * index + 1] =
      box.top +
      padTop +
      SCATTER_MARGIN.top +
      scales.y(SCATTER.y[index] ?? Number.NaN);
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
    const element = newElement(width, height, SCATTER_PADDING);
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
  webgl() {
    const context = document.createElement("canvas").getContext("webgl2");
    if (context === null) return false;
    // Given back at once: a browser allows only a few at a time.
    context.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  },
  async drawPca3d(width, height, kind) {
    const module = await import("../src/charts/pca3d.ts");
    const element = newElement(width, height, SCATTER_PADDING);
    hovers = [];
    contextChanges = [];
    const data = pca3dDataOf(kind);
    const handle = module.createPca3d(element, data, {
      onHover(point) {
        hovers.push(point);
      },
      onContextChange(lost) {
        contextChanges.push(lost);
      },
    });
    drawn = { kind: "pca3d", element, handle, data, module };
  },
  pca3dData: () => lastPca3d().data,
  pca3dHighlight(highlighted) {
    const plot = lastPca3d();
    const { colours } = plot.data;
    if (colours.kind !== "groups") {
      throw new Error("popnei_web defect: the 3D plot is not of groups.");
    }
    const data = { ...plot.data, colours: { ...colours, highlighted } };
    drawn = { ...plot, data };
    plot.handle.update(data);
  },
  pca3dUpdate(kind) {
    const plot = lastPca3d();
    const data = pca3dDataOf(kind);
    drawn = { ...plot, data };
    plot.handle.update(data);
  },
  pca3dPixel(index, view) {
    const pixels = pca3dViewport(view);
    const x = pixels[2 * index];
    const y = pixels[2 * index + 1];
    if (x === undefined || y === undefined) {
      throw new Error(
        `popnei_web defect: the 3D plot has no point ${String(index)}.`,
      );
    }
    return { x, y };
  },
  pca3dNearest(index, view) {
    const pixels = pca3dViewport(view);
    const x = pixels[2 * index] ?? Number.NaN;
    const y = pixels[2 * index + 1] ?? Number.NaN;
    let nearest = Infinity;
    for (let other = 0; other < pixels.length / 2; other++) {
      if (other === index) continue;
      const dx = (pixels[2 * other] ?? Number.NaN) - x;
      const dy = (pixels[2 * other + 1] ?? Number.NaN) - y;
      nearest = Math.min(nearest, Math.hypot(dx, dy));
    }
    return nearest;
  },
  contextChanges: () => [...contextChanges],
  element: () => last().element,
  handle: () => last().handle,
  pca3d: () => lastPca3d().handle,
  pngErrorKind: (error) => (error instanceof PngError ? error.kind : null),
};

window.plotsPage = page;
