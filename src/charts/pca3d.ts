/**
 * The 3D plot of the PCA (docs/specs/charts/pca3d.md): the individuals on
 * three principal components, drawn with three.js and WebGL 2, a view the
 * user turns by dragging, with the Ctrl key and the wheel, or with the
 * buttons the screen draws, which call the handle. The marks, the legend
 * and the point under the pointer are the scatter's (scatter.md). Only the
 * screen imports this file, with `import()`, so that three.js is a file of
 * its own the browser downloads when the 3D view is first shown; nothing
 * the page loads with it imports it.
 */

import { pathRound } from "d3-path";
import { select } from "d3-selection";
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  OrthographicCamera,
  Points,
  PointsMaterial,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import "./charts.css";
import { exportPng, exportSvg, type ExportSize } from "./export.ts";
import { createTooltip, nearestPoint, tooltipLines } from "./hover.ts";
import { nextChartIds } from "./ids.ts";
import { drawLegendSvg, legendOf, type Legend } from "./legend.ts";
import { MAX_SVG_POINTS } from "./limits.ts";
import {
  drawSymbolAt,
  groupColourClass,
  groupMark,
  groupSymbol,
  highlightedGroup,
  NO_GROUP,
  PATH_DIGITS,
  SYMBOL_AREA,
  symbolPath,
  viridisColour,
  viridisStep,
  type PointColours,
} from "./marks.ts";
import { Pca3dError } from "./pca3dError.ts";
import { projectToScreen } from "./project.ts";
import { SCATTER_MARGIN } from "./scatter.ts";
import type { ChartHandle } from "./types.ts";

/** The data of the 3D plot: three coordinates, a name and a colour per point. */
export interface Pca3dData {
  /** The name of the canvas for a screen reader. */
  readonly title: string;
  /** Its description, written by the screen. */
  readonly description: string;
  /** The coordinate of each point on the first component shown; NaN or an infinity is not drawn. */
  readonly x: Float64Array;
  /** On the second. */
  readonly y: Float64Array;
  /** On the third, which is kept up. */
  readonly z: Float64Array;
  /** The short names of the components, for the tooltip: "PC1", "PC2", "PC3". */
  readonly axisNames: readonly [string, string, string];
  /** The labels at the ends of the lines: "PC1 (3.55%)". */
  readonly axisLabels: readonly [string, string, string];
  /** The name of each point, an individual, for the tooltip. */
  readonly pointNames: readonly string[];
  /** How the points are coloured, by group or by value, as in the scatter. */
  readonly colours: PointColours;
}

/** The callbacks of the 3D plot, which change nothing that is drawn. */
export interface Pca3dEvents {
  /** The point under the pointer, by its index, or null; called when it changes. */
  onHover?(point: number | null): void;
  /** The WebGL context was lost (true) or given back and drawn again (false). */
  onContextChange?(lost: boolean): void;
}

/**
 * A turn of the view: `vertical`, about the third component, which is
 * kept up; `horizontal`, about the horizontal of the screen.
 */
export type TurnAxis = "vertical" | "horizontal";

/** The handle of the 3D plot: the four functions of every plot, and the turns of the view. */
export interface Pca3dHandle extends ChartHandle<Pca3dData> {
  /**
   * Turns the cloud as a drag in that direction does: `vertical` with a
   * positive angle as a drag to the right, `horizontal` with a positive
   * angle as a drag upwards, stopping at straight down or straight up the
   * third component. Throws an `Error`, a defect of the caller, for an
   * angle that is not finite.
   */
  rotate(axis: TurnAxis, degrees: number): void;
  /** Looks down component 0, 1 or 2 of the data. */
  viewAlong(component: 0 | 1 | 2): void;
  /**
   * Multiplies the camera's zoom by `factor`, above 1 nearer, within
   * ZOOM_MIN and ZOOM_MAX. Throws an `Error`, a defect of the caller, for
   * a factor that is not finite or is 0 or less.
   */
  zoom(factor: number): void;
  /** The starting view and zoom. */
  resetView(): void;
}

/** The bounds of the zoom, the controls' minZoom and maxZoom and the buttons' alike. */
export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 20;

/** A view: along component 0, 1 or 2, or the starting one. */
export type ViewName = 0 | 1 | 2 | "start";

/**
 * The side of the square each point is drawn on, in CSS pixels: it holds
 * the star, the largest mark, which reaches 8.05 pixels from its point.
 */
const POINT_SQUARE = 18;

/** The side of the texture of a mark, in pixels: the square at a pixel ratio of 2. */
const TEXTURE_SIDE = 36;

/** The largest pixel ratio drawn: above 2 the points look no sharper. */
const MAX_PIXEL_RATIO = 2;

/**
 * Half the shorter side of the view, in the units of the scene, where the
 * largest coordinate is 1, at a zoom of 1: the cloud and the labels at the
 * ends of its lines fit with room to turn; meanwhile, refined in the
 * running application.
 */
const VIEW_HALF = 1.3;

/** From the camera to the centre of the scene, beyond every point, which lie within √3 of it. */
const CAMERA_DISTANCE = 5;
const CAMERA_NEAR = 0.01;
const CAMERA_FAR = 10;

/** The starting view: 20° above the plane of the first two components. */
const START_ELEVATION_DEGREES = 20;
/** And turned 30° about the third from the view along the second. */
const START_AZIMUTH_DEGREES = 30;

/** The opacity of a group faded by the highlight of another, as the scatter's. */
const FADED_OPACITY = 0.25;

/** The pixels within which a point is under the pointer, as in the scatter. */
const HOVER_RADIUS = 10;

/** The pixels a pointer may move between down and up and still be a tap. */
const TAP_SLOP = 3;

/** From the end of a line to its label, across and up, in pixels. */
const LABEL_OFFSET = 4;

/** The span of the lines when no point is drawn: from −1 to 1. */
const EMPTY_SPAN = 1;

const DEGREE = Math.PI / 180;
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/**
 * The attributes WebGLRenderer asks a context for by default
 * (three.module.js of three 0.186.1, line 16425), asked by the plot
 * itself so that no context means `noWebGl`.
 */
const CONTEXT_ATTRIBUTES: WebGLContextAttributes = {
  alpha: true,
  depth: true,
  stencil: false,
  antialias: false,
  premultipliedAlpha: true,
  preserveDrawingBuffer: false,
};

/**
 * The points with three finite coordinates, in the units of the scene,
 * the largest absolute value among them brought to 1: `positions` x, y
 * and z per point drawn, `index` the index in the data of each, `scale`
 * the units of the scene per unit of the components, 1 when none is
 * drawn. Throws an `Error`, a defect of the caller, for coordinates of
 * different lengths.
 */
export function scenePositions(
  x: Float64Array,
  y: Float64Array,
  z: Float64Array,
): {
  readonly positions: Float32Array;
  readonly index: Uint32Array;
  readonly scale: number;
} {
  if (y.length !== x.length || z.length !== x.length) {
    throw new Error(
      `popnei_web defect: the 3D plot was given ${String(x.length)}, ${String(y.length)} and ${String(z.length)} coordinates.`,
    );
  }
  const drawn: number[] = [];
  let largest = 0;
  for (const [point, px] of x.entries()) {
    const py = y[point] ?? Number.NaN;
    const pz = z[point] ?? Number.NaN;
    if (!Number.isFinite(px) || !Number.isFinite(py) || !Number.isFinite(pz)) {
      continue;
    }
    drawn.push(point);
    largest = Math.max(largest, Math.abs(px), Math.abs(py), Math.abs(pz));
  }
  // With halves, as the scatter's scales, so that a value near ±1.8e308
  // gives no infinity.
  const scale = largest > 0 ? 0.5 / (largest / 2) : 1;
  const positions = new Float32Array(3 * drawn.length);
  for (const [at, point] of drawn.entries()) {
    positions[3 * at] = (x[point] ?? Number.NaN) * scale;
    positions[3 * at + 1] = (y[point] ?? Number.NaN) * scale;
    positions[3 * at + 2] = (z[point] ?? Number.NaN) * scale;
  }
  return { positions, index: Uint32Array.from(drawn), scale };
}

/**
 * The frustum of the camera of a plot of `width` by `height` CSS pixels:
 * VIEW_HALF from the centre to the nearer edges, and the same scale
 * across and up.
 */
function frustumOf(
  width: number,
  height: number,
): { left: number; right: number; top: number; bottom: number } {
  const aspect = width > 0 && height > 0 ? width / height : 1;
  const halfWidth = aspect >= 1 ? VIEW_HALF * aspect : VIEW_HALF;
  const halfHeight = aspect >= 1 ? VIEW_HALF : VIEW_HALF / aspect;
  return {
    left: -halfWidth,
    right: halfWidth,
    top: halfHeight,
    bottom: -halfHeight,
  };
}

/**
 * The orthographic camera of a plot of `width` by `height` CSS pixels,
 * with the third component up, and its OrbitControls, with no pan and
 * no damping, at the starting view. `canvas` null gives controls that
 * listen to nothing.
 */
export function createView(
  canvas: HTMLCanvasElement | null,
  width: number,
  height: number,
): { readonly camera: OrthographicCamera; readonly controls: OrbitControls } {
  const { left, right, top, bottom } = frustumOf(width, height);
  const camera = new OrthographicCamera(
    left,
    right,
    top,
    bottom,
    CAMERA_NEAR,
    CAMERA_FAR,
  );
  // Before the controls are made: they read it once, in their
  // constructor, as the axis they keep up (OrbitControls.js, line 406).
  camera.up.set(0, 0, 1);
  camera.position.set(0, -CAMERA_DISTANCE, 0);
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableDamping = false;
  controls.minZoom = ZOOM_MIN;
  controls.maxZoom = ZOOM_MAX;
  lookAlong(controls, "start");
  return { camera, controls };
}

/** The polar angle and the azimuth of OrbitControls of each view, in radians. */
function anglesOf(view: ViewName): { polar: number; azimuth: number } {
  switch (view) {
    case 0:
      // On the positive side of the first component.
      return { polar: Math.PI / 2, azimuth: Math.PI / 2 };
    case 1:
      // On the negative side of the second.
      return { polar: Math.PI / 2, azimuth: 0 };
    case 2:
      // Straight above; the controls keep it 0.000001 radians off.
      return { polar: 0, azimuth: 0 };
    case "start":
      return {
        polar: (90 - START_ELEVATION_DEGREES) * DEGREE,
        azimuth: START_AZIMUTH_DEGREES * DEGREE,
      };
  }
}

/**
 * Puts the camera along component 0, 1 or 2, as "The view" of pca3d.md
 * says, or at the starting view, 20° above the plane of the first two and
 * turned 30° about the third from the view along the second. The zoom is
 * kept.
 */
export function lookAlong(controls: OrbitControls, view: ViewName): void {
  const { polar, azimuth } = anglesOf(view);
  // The spherical coordinates of OrbitControls turned back from its
  // space, whose y is the camera's up, to the scene's, whose z is.
  const across = CAMERA_DISTANCE * Math.sin(polar);
  controls.target.set(0, 0, 0);
  controls.object.position.set(
    across * Math.sin(azimuth),
    -across * Math.cos(azimuth),
    CAMERA_DISTANCE * Math.cos(polar),
  );
  controls.update();
}

/**
 * Turns the view as `rotate` of the handle does. Throws an `Error`, a
 * defect of the caller, for an angle that is not finite.
 */
export function turnView(
  controls: OrbitControls,
  axis: TurnAxis,
  degrees: number,
): void {
  if (!Number.isFinite(degrees)) {
    throw new Error(
      `popnei_web defect: the 3D view was turned by ${String(degrees)} degrees, not a finite angle.`,
    );
  }
  const radians = degrees * DEGREE;
  switch (axis) {
    case "vertical":
      controls.rotateLeft(radians);
      break;
    case "horizontal":
      controls.rotateUp(-radians);
      break;
  }
  controls.update();
}

/**
 * Zooms the view as `zoom` of the handle does, on the camera of
 * `controls`: its `zoom` multiplied by `factor` within ZOOM_MIN and
 * ZOOM_MAX. Not the controls' dollyIn, whose factor above 1 zooms an
 * orthographic camera out. Throws an `Error`, a defect of the caller, for
 * a factor that is not finite or is 0 or less.
 */
export function zoomView(controls: OrbitControls, factor: number): void {
  if (!Number.isFinite(factor) || factor <= 0) {
    throw new Error(
      `popnei_web defect: the 3D view was zoomed by ${String(factor)}, not a finite factor above 0.`,
    );
  }
  const camera = controls.object;
  if (!(camera instanceof OrthographicCamera)) {
    throw new Error(
      "popnei_web defect: the camera of the 3D view is not orthographic.",
    );
  }
  camera.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, camera.zoom * factor));
  camera.updateProjectionMatrix();
}

/**
 * The paths of the exported view, in the order they are drawn: runs of
 * consecutive points of one path from far to near, `depth` one per point
 * drawn and `index` its index in the data; `path` gives the path of each
 * point of the data, its group or its step of viridis. With `highlighted`,
 * the runs of every other path first, then those of the highlighted one.
 * Points at one depth keep the order of `index`. Throws an `Error`, a
 * defect of the caller, when `depth` and `index` differ in length or an
 * index has no path.
 */
export function exportRuns(
  depth: Float32Array,
  index: Uint32Array,
  path: Uint16Array,
  highlighted: number | null,
): readonly { readonly path: number; readonly points: Uint32Array }[] {
  if (depth.length !== index.length) {
    throw new Error(
      `popnei_web defect: ${String(index.length)} points drawn were given ${String(depth.length)} depths.`,
    );
  }
  const pathOf = (drawn: number): number => {
    const point = index[drawn] ?? Number.NaN;
    const found = path[point];
    if (found === undefined) {
      throw new Error(
        `popnei_web defect: point ${String(point)} has no path, of ${String(path.length)}.`,
      );
    }
    return found;
  };
  const farToNear = Array.from({ length: index.length }, (_v, at) => at)
    // The largest depth is the farthest.
    .toSorted((a, b) => (depth[b] ?? 0) - (depth[a] ?? 0));
  const order =
    highlighted === null
      ? farToNear
      : [
          ...farToNear.filter((drawn) => pathOf(drawn) !== highlighted),
          ...farToNear.filter((drawn) => pathOf(drawn) === highlighted),
        ];
  const runs: { path: number; points: number[] }[] = [];
  for (const drawn of order) {
    const drawnPath = pathOf(drawn);
    const lastRun = runs.at(-1);
    const point = index[drawn] ?? Number.NaN;
    if (lastRun?.path === drawnPath) lastRun.points.push(point);
    else runs.push({ path: drawnPath, points: [point] });
  }
  return runs.map((run) => ({
    path: run.path,
    points: Uint32Array.from(run.points),
  }));
}

/**
 * Throws an `Error`, a defect of the caller, when `x`, `y`, `z`,
 * `pointNames` and the groups or the values of the colours are not all of
 * one length, for more than MAX_SVG_POINTS points, and for colours that
 * checkPointColours refuses; and gives the legend of the points drawn.
 */
function checkPca3d(data: Pca3dData): Legend {
  const numPoints = data.x.length;
  if (data.y.length !== numPoints || data.z.length !== numPoints) {
    throw new Error(
      `popnei_web defect: the 3D plot was given ${String(numPoints)}, ${String(data.y.length)} and ${String(data.z.length)} coordinates.`,
    );
  }
  if (data.pointNames.length !== numPoints) {
    throw new Error(
      `popnei_web defect: a 3D plot of ${String(numPoints)} points was given ${String(data.pointNames.length)} names.`,
    );
  }
  if (numPoints > MAX_SVG_POINTS) {
    throw new Error(
      `popnei_web defect: a plot was given ${String(numPoints)} points, more than the ${String(MAX_SVG_POINTS)} it draws.`,
    );
  }
  // legendOf checks the colours with checkPointColours.
  return legendOf(data.colours, [data.x, data.y, data.z]);
}

/**
 * The path of each point of the data: its group, or NO_GROUP; for a
 * colouring by values, its step of viridis between the smallest and the
 * largest value drawn, or NO_GROUP for no value.
 */
function pathsOf(data: Pca3dData, legend: Legend): Uint16Array {
  const { colours } = data;
  switch (colours.kind) {
    case "groups":
      return Uint16Array.from(colours.group);
    case "values": {
      const paths = new Uint16Array(colours.values.length).fill(NO_GROUP);
      if (legend.kind !== "values" || legend.min === null) return paths;
      const { min, max } = legend;
      if (max === null) return paths;
      for (const [point, value] of colours.values.entries()) {
        if (Number.isFinite(value) && value >= min && value <= max) {
          paths[point] = viridisStep(value, min, max);
        }
      }
      return paths;
    }
  }
}

/** The value of the token `name` on `element`, a colour of src/ui/tokens.css. */
function tokenOf(element: HTMLElement, name: string): string {
  const value = getComputedStyle(element).getPropertyValue(name).trim();
  if (value === "") {
    throw new Error(
      `popnei_web defect: the token ${name} has no value where the 3D plot is drawn.`,
    );
  }
  return value;
}

/** The pixels of the padding of `element` at its left and its top. */
function paddingOf(element: HTMLElement): { left: number; top: number } {
  const style = getComputedStyle(element);
  const pixels = (value: string): number => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  return { left: pixels(style.paddingLeft), top: pixels(style.paddingTop) };
}

/** The size of the content of `element`, where the canvas is. */
function contentBoxOf(element: HTMLElement): ExportSize {
  const style = getComputedStyle(element);
  const pixels = (value: string): number => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  return {
    width: Math.max(
      0,
      element.clientWidth -
        pixels(style.paddingLeft) -
        pixels(style.paddingRight),
    ),
    height: Math.max(
      0,
      element.clientHeight -
        pixels(style.paddingTop) -
        pixels(style.paddingBottom),
    ),
  };
}

/** Something of three.js that holds memory of the graphics card until disposed. */
interface Disposable {
  dispose(): void;
}

/** What one build of the scene made from the data, and has to dispose of. */
interface Built {
  readonly data: Pca3dData;
  readonly legend: Legend;
  /** The points drawn, in the units of the scene, and their index in the data. */
  readonly positions: Float32Array;
  readonly index: Uint32Array;
  /** The position drawn of each point of the data, or −1. */
  readonly drawnAt: Int32Array;
  /** The path of each point of the data, its group or its step. */
  readonly paths: Uint16Array;
  /** The ends of the three lines, x, y and z of the negative end then the positive, per line. */
  readonly ends: Float32Array;
  readonly objects: readonly (Points | LineSegments)[];
  readonly materials: readonly PointsMaterial[];
  readonly disposables: readonly Disposable[];
}

/** The ends of the three lines over the range of the positions, through the origin. */
function lineEnds(positions: Float32Array): Float32Array {
  const ends = new Float32Array(18);
  for (let axis = 0; axis < 3; axis++) {
    let low = 0;
    let high = 0;
    for (let at = axis; at < positions.length; at += 3) {
      const value = positions[at] ?? 0;
      low = Math.min(low, value);
      high = Math.max(high, value);
    }
    if (positions.length === 0) {
      low = -EMPTY_SPAN;
      high = EMPTY_SPAN;
    }
    ends[6 * axis + axis] = low;
    ends[6 * axis + 3 + axis] = high;
  }
  return ends;
}

/**
 * Draws the mark `d`, a path of SYMBOL_AREA centred on 0,0, on a texture
 * of TEXTURE_SIDE pixels, which the square of a point holds: filled with
 * `fill`, or not filled for a ring, and outlined with `outline` in 1 CSS
 * pixel with round joins, as in 2D.
 */
function markTexture(
  d: string,
  fill: string | null,
  outline: string,
): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_SIDE;
  canvas.height = TEXTURE_SIDE;
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error(
      "popnei_web defect: the browser gave no 2D context for the texture of a mark.",
    );
  }
  context.translate(TEXTURE_SIDE / 2, TEXTURE_SIDE / 2);
  context.scale(TEXTURE_SIDE / POINT_SQUARE, TEXTURE_SIDE / POINT_SQUARE);
  const path = new Path2D(d);
  if (fill !== null) {
    context.fillStyle = fill;
    context.fill(path);
  }
  context.lineWidth = 1;
  context.lineJoin = "round";
  context.strokeStyle = outline;
  context.stroke(path);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/**
 * Draws the 3D plot of `data` in `element`, whose size the screen's CSS
 * gives and which it makes `position: relative`, and returns its handle.
 * `events.onHover` is called with the index of the point under the
 * pointer, or null, each time it changes; `events.onContextChange` when
 * the browser takes the WebGL context away and when it is given back and
 * drawn again.
 *
 * Throws a Pca3dError of kind `noWebGl`, leaving the element as it was,
 * when the browser gives no WebGL 2 context. Throws an `Error`, a defect
 * of the caller, here and in `update`, when `x`, `y`, `z`, `pointNames`
 * and the groups or the values of the colours are not all of one length;
 * for more than MAX_SVG_POINTS points; for a group index neither below
 * the number of names nor NO_GROUP; for a `highlighted` neither null nor a
 * whole number from 0; and for more than MAX_POINT_GROUPS names.
 */
export function createPca3d(
  element: HTMLElement,
  data: Pca3dData,
  events: Pca3dEvents = {},
): Pca3dHandle {
  let legend = checkPca3d(data);

  const canvas = document.createElement("canvas");
  // The plot asks for the context itself, so that none means noWebGl and
  // not the words of an error of three.js; a context the browser hands
  // over already lost draws nothing, and three.js throws a TypeError of
  // its own reading its attributes (pca3d.md, "When the browser has no
  // WebGL").
  const context = canvas.getContext("webgl2", CONTEXT_ATTRIBUTES);
  if (context === null || context.isContextLost()) throw new Pca3dError();

  const ids = nextChartIds();
  const renderer = new WebGLRenderer({ canvas, context });
  const pointRange: unknown = context.getParameter(
    context.ALIASED_POINT_SIZE_RANGE,
  );
  // The largest point the graphics card draws, in pixels of the screen;
  // WebGL 2 promises 1 only.
  const largestPoint =
    pointRange instanceof Float32Array
      ? (pointRange[1] ?? 1)
      : TEXTURE_SIDE * MAX_PIXEL_RATIO;
  const { camera, controls } = createView(canvas, 1, 1);
  const scene = new Scene();

  canvas.className = "chart-pca3d-canvas";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-labelledby", ids.title);
  canvas.setAttribute("aria-describedby", ids.desc);
  const title = document.createElement("div");
  title.id = ids.title;
  title.hidden = true;
  const desc = document.createElement("div");
  desc.id = ids.desc;
  desc.hidden = true;
  const labels = [0, 1, 2].map(() => {
    const label = document.createElement("div");
    label.className = "chart-pca3d-label";
    label.setAttribute("aria-hidden", "true");
    return label;
  });
  element.append(canvas, title, desc, ...labels);

  let current = data;
  let built: Built | null = null;
  /** The size of the last draw, in CSS pixels; null before the element had one. */
  let drawnSize: ExportSize | null = null;
  let pending: ExportSize | null = null;
  let waitingFrame: number | null = null;
  let destroyed = false;
  let hovered: number | null = null;
  let dismissed: number | null = null;
  let down: { x: number; y: number } | null = null;

  /** The side of the square of a point in CSS pixels, within what the card draws. */
  function pointSize(): number {
    return Math.min(POINT_SQUARE, largestPoint / renderer.getPixelRatio());
  }

  function writeText(): void {
    title.textContent = current.title;
    desc.textContent = current.description;
    for (const [axis, label] of labels.entries()) {
      label.textContent = current.axisLabels[axis] ?? "";
    }
  }

  function disposeBuilt(): void {
    if (built === null) return;
    for (const object of built.objects) scene.remove(object);
    for (const each of built.disposables) each.dispose();
    built = null;
  }

  /** Makes the objects of the scene of `next`, with the colours of the tokens now. */
  function build(next: Pca3dData, nextLegend: Legend): void {
    disposeBuilt();
    const { positions, index } = scenePositions(next.x, next.y, next.z);
    const drawnAt = new Int32Array(next.x.length).fill(-1);
    for (const [at, point] of index.entries()) drawnAt[point] = at;
    const paths = pathsOf(next, nextLegend);
    const ends = lineEnds(positions);
    const objects: (Points | LineSegments)[] = [];
    const materials: PointsMaterial[] = [];
    const disposables: Disposable[] = [];
    const outline = tokenOf(element, "--chart-axis");

    const lineGeometry = new BufferGeometry();
    lineGeometry.setAttribute("position", new BufferAttribute(ends, 3));
    const lineMaterial = new LineBasicMaterial({
      color: new Color().setStyle(outline),
    });
    objects.push(new LineSegments(lineGeometry, lineMaterial));
    disposables.push(lineGeometry, lineMaterial);

    // The points of each path, as positions drawn.
    const members = new Map<number, number[]>();
    for (const [at, point] of index.entries()) {
      const path = paths[point] ?? NO_GROUP;
      const list = members.get(path);
      if (list === undefined) members.set(path, [at]);
      else list.push(at);
    }
    const { colours } = next;
    const highlighted =
      colours.kind === "groups" ? highlightedGroup(colours) : null;
    const textures = new Map<string, CanvasTexture>();
    const textureOf = (path: number): CanvasTexture => {
      let key: string;
      let fill: string | null;
      if (path === NO_GROUP) {
        key = "none";
        fill = null;
      } else if (colours.kind === "groups") {
        const mark = groupMark(path);
        key = `mark-${String(mark.colour)}-${String(mark.symbol)}`;
        fill = tokenOf(element, `--chart-cat-${String(mark.colour + 1)}`);
      } else {
        key = `step-${String(path)}`;
        fill = viridisColour(path);
      }
      const found = textures.get(key);
      if (found !== undefined) return found;
      const d =
        colours.kind === "groups" ? symbolPath(path) : symbolPath(NO_GROUP);
      const texture = markTexture(d, fill, outline);
      textures.set(key, texture);
      disposables.push(texture);
      return texture;
    };
    for (const [path, list] of members) {
      const array = new Float32Array(3 * list.length);
      for (const [slot, at] of list.entries()) {
        array[3 * slot] = positions[3 * at] ?? Number.NaN;
        array[3 * slot + 1] = positions[3 * at + 1] ?? Number.NaN;
        array[3 * slot + 2] = positions[3 * at + 2] ?? Number.NaN;
      }
      const geometry = new BufferGeometry();
      geometry.setAttribute("position", new BufferAttribute(array, 3));
      // While a group is highlighted every group is transparent to
      // three.js, which draws the opaque ones first whatever their order,
      // so that the highlighted one, drawn last, is over the faded ones.
      const faded = highlighted !== null && path !== highlighted;
      const opacity = faded ? FADED_OPACITY : 1;
      const material = new PointsMaterial({
        size: pointSize(),
        sizeAttenuation: false,
        map: textureOf(path),
        transparent: highlighted !== null,
        opacity,
        depthWrite: !faded,
        // three.js compares it with the alpha of the texture times the
        // opacity.
        alphaTest: opacity / 2,
      });
      const points = new Points(geometry, material);
      points.renderOrder = highlighted !== null && !faded ? 1 : 0;
      objects.push(points);
      materials.push(material);
      disposables.push(geometry, material);
    }
    for (const object of objects) scene.add(object);
    built = {
      data: next,
      legend: nextLegend,
      positions,
      index,
      drawnAt,
      paths,
      ends,
      objects,
      materials,
      disposables,
    };
  }

  /** The camera's projection times its view, 16 numbers, column-major. */
  function viewProjection(): ArrayLike<number> {
    camera.updateMatrixWorld();
    return new Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    ).elements;
  }

  /** Where `positions` fall on a plot of `size`, and how deep. */
  function project(
    positions: Float32Array,
    size: ExportSize,
  ): { xy: Float32Array; depth: Float32Array } {
    const numPoints = positions.length / 3;
    const xy = new Float32Array(2 * numPoints);
    const depth = new Float32Array(numPoints);
    projectToScreen(
      positions,
      viewProjection(),
      size.width,
      size.height,
      xy,
      depth,
    );
    return { xy, depth };
  }

  function placeLabels(size: ExportSize): void {
    if (built === null) return;
    const positive = new Float32Array(9);
    for (let axis = 0; axis < 3; axis++) {
      positive.set(built.ends.subarray(6 * axis + 3, 6 * axis + 6), 3 * axis);
    }
    const { xy } = project(positive, size);
    const padding = paddingOf(element);
    for (const [axis, label] of labels.entries()) {
      const x = xy[2 * axis] ?? Number.NaN;
      const y = xy[2 * axis + 1] ?? Number.NaN;
      label.style.left = `${String(padding.left + x + LABEL_OFFSET)}px`;
      label.style.top = `${String(padding.top + y - LABEL_OFFSET)}px`;
      // A label whose end the zoom brought out of the plot is hidden, so
      // that it is not drawn over what surrounds the plot (pca3d.md, "What
      // the user sees").
      label.hidden = !(x >= 0 && x <= size.width && y >= 0 && y <= size.height);
    }
  }

  function render(): void {
    if (destroyed || drawnSize === null) return;
    renderer.render(scene, camera);
    placeLabels(drawnSize);
  }

  function clearHover(): void {
    if (hovered === null) return;
    hovered = null;
    tooltip.hide();
    events.onHover?.(null);
  }

  const tooltip = createTooltip(
    element,
    (by) => {
      if (hovered === null) return;
      dismissed = by === "escape" ? hovered : null;
      hovered = null;
      events.onHover?.(null);
    },
    (target) => target === canvas,
  );

  /** The pointer at (x, y) of the canvas: shows the tooltip of the point under it. */
  function pointerAt(x: number, y: number): void {
    if (built === null || drawnSize === null) return;
    const { xy, depth } = project(built.positions, drawnSize);
    // The point whose tooltip is shown stays under the pointer while the
    // pointer is within HOVER_RADIUS of it, so that it can reach its
    // tooltip.
    if (hovered !== null) {
      const at = built.drawnAt[hovered] ?? -1;
      const px = xy[2 * at] ?? Number.NaN;
      const py = xy[2 * at + 1] ?? Number.NaN;
      if (Math.hypot(px - x, py - y) <= HOVER_RADIUS) return;
    }
    const nearest = nearestPoint(xy, x, y, HOVER_RADIUS, depth);
    if (nearest === null) {
      dismissed = null;
      clearHover();
      return;
    }
    const point = built.index[nearest];
    if (point === undefined) {
      throw new Error(
        `popnei_web defect: point ${String(nearest)} drawn has no index.`,
      );
    }
    if (point === hovered || point === dismissed) return;
    showHover(built.data, point, xy[2 * nearest], xy[2 * nearest + 1]);
  }

  function showHover(
    shown: Pca3dData,
    point: number,
    px: number | undefined,
    py: number | undefined,
  ): void {
    const name = shown.pointNames[point];
    const x = shown.x[point];
    const y = shown.y[point];
    const z = shown.z[point];
    if (
      px === undefined ||
      py === undefined ||
      name === undefined ||
      x === undefined ||
      y === undefined ||
      z === undefined
    ) {
      throw new Error(
        `popnei_web defect: point ${String(point)} under the pointer is not a point of the plot.`,
      );
    }
    hovered = point;
    dismissed = null;
    const padding = paddingOf(element);
    const [xName, yName, zName] = shown.axisNames;
    tooltip.show(
      tooltipLines(name, shown.colours, point, [
        [xName, x],
        [yName, y],
        [zName, z],
      ]),
      padding.left + px,
      padding.top + py,
    );
    events.onHover?.(point);
  }

  /** The position of `event` in the pixels of the canvas. */
  function onCanvas(event: PointerEvent): { x: number; y: number } {
    const box = canvas.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }

  const onPointerMove = (event: PointerEvent): void => {
    // A drag turns the view, and a finger moving is a drag.
    if (event.buttons !== 0 || event.pointerType === "touch") return;
    const at = onCanvas(event);
    pointerAt(at.x, at.y);
  };
  const onPointerDown = (event: PointerEvent): void => {
    down = onCanvas(event);
  };
  const onPointerUp = (event: PointerEvent): void => {
    const start = down;
    down = null;
    if (start === null) return;
    const at = onCanvas(event);
    // A tap that does not move shows the tooltip of the point tapped.
    if (Math.hypot(at.x - start.x, at.y - start.y) <= TAP_SLOP) {
      pointerAt(at.x, at.y);
    }
  };
  const onPointerLeave = (event: PointerEvent): void => {
    // A finger lifted leaves the canvas too; the tooltip of a tap stays
    // until the next tap on the plot.
    if (event.pointerType === "touch") return;
    if (tooltip.holds(event.relatedTarget)) return;
    dismissed = null;
    clearHover();
  };

  /**
   * Heard before the listener of OrbitControls on the canvas: a wheel
   * without Ctrl stops here and scrolls the page; with Ctrl it goes on to
   * the controls, which zoom and keep the page from being enlarged
   * (pca3d.md, "The view", and Open 1).
   */
  const onWheel = (event: WheelEvent): void => {
    if (!event.ctrlKey) event.stopPropagation();
  };

  /** A turn by a drag or a wheel: the tooltip goes, and the view is drawn. */
  const onControlsChange = (): void => {
    dismissed = null;
    clearHover();
    render();
  };

  const onContextLost = (): void => {
    dismissed = null;
    clearHover();
    events.onContextChange?.(true);
  };
  // three.js heard it first, since its listener was added in its
  // constructor, and has made its state again.
  const onContextRestored = (): void => {
    render();
    events.onContextChange?.(false);
  };

  /** A change of theme: the textures and the lines drawn again from the tokens. */
  const onTheme = (): void => {
    if (destroyed || built === null) return;
    build(built.data, built.legend);
    render();
  };

  function drawAt(size: ExportSize): void {
    drawnSize = size;
    renderer.setPixelRatio(Math.min(devicePixelRatio, MAX_PIXEL_RATIO));
    renderer.setSize(size.width, size.height, false);
    Object.assign(camera, frustumOf(size.width, size.height));
    camera.updateProjectionMatrix();
    const side = pointSize();
    for (const material of built?.materials ?? []) material.size = side;
    render();
  }

  function onFrame(): void {
    waitingFrame = null;
    const size = pending;
    pending = null;
    // An element of no size, a tab that is hidden, keeps its last drawing.
    if (size === null || size.width <= 0 || size.height <= 0) return;
    if (
      drawnSize !== null &&
      drawnSize.width === size.width &&
      drawnSize.height === size.height
    ) {
      return;
    }
    dismissed = null;
    clearHover();
    drawAt(size);
  }

  const observer = new ResizeObserver((entries) => {
    const entry = entries.findLast((each) => each.target === element);
    if (entry === undefined) return;
    pending = {
      width: entry.contentRect.width,
      height: entry.contentRect.height,
    };
    waitingFrame ??= requestAnimationFrame(onFrame);
  });

  const darkScheme = window.matchMedia("(prefers-color-scheme: dark)");
  const themeObserver = new MutationObserver(onTheme);

  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);
  element.addEventListener("wheel", onWheel, { capture: true, passive: true });
  controls.addEventListener("change", onControlsChange);
  darkScheme.addEventListener("change", onTheme);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  writeText();
  build(current, legend);
  const start = contentBoxOf(element);
  if (start.width > 0 && start.height > 0) drawAt(start);
  observer.observe(element);

  function live(call: string): void {
    if (destroyed) {
      throw new Error(
        `popnei_web defect: ${call} of a 3D plot after its destroy.`,
      );
    }
  }

  /** The size of the last draw, for the export. */
  function lastSize(call: string): ExportSize {
    live(call);
    if (drawnSize === null) {
      throw new Error(
        `popnei_web defect: ${call} of a 3D plot that was never drawn, whose element never had a size.`,
      );
    }
    return drawnSize;
  }

  /** A turn, a zoom or a view: the tooltip goes, and the view is drawn. */
  function viewChanged(): void {
    dismissed = null;
    clearHover();
    render();
  }

  /** The SVG of the view as it is, with the legend of the file (pca3d.md, "The export"). */
  function exportedSvg(size: ExportSize): string {
    if (built === null) {
      throw new Error("popnei_web defect: a 3D plot with no scene exported.");
    }
    const shown = built;
    const svg = document.createElementNS(SVG_NAMESPACE, "svg");
    svg.setAttribute("class", "chart chart-pca3d");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-labelledby", `${ids.title}-svg ${ids.desc}-svg`);
    svg.setAttribute("width", String(size.width));
    svg.setAttribute("height", String(size.height));
    svg.setAttribute(
      "viewBox",
      `0 0 ${String(size.width)} ${String(size.height)}`,
    );
    const svgTitle = document.createElementNS(SVG_NAMESPACE, "title");
    svgTitle.id = `${ids.title}-svg`;
    svgTitle.textContent = shown.data.title;
    const svgDesc = document.createElementNS(SVG_NAMESPACE, "desc");
    svgDesc.id = `${ids.desc}-svg`;
    svgDesc.textContent = shown.data.description;
    const axes = document.createElementNS(SVG_NAMESPACE, "g");
    axes.setAttribute("class", "chart-pca3d-axes");
    const marks = document.createElementNS(SVG_NAMESPACE, "g");
    marks.setAttribute("class", "chart-marks");
    const legendGroup = document.createElementNS(SVG_NAMESPACE, "g");
    legendGroup.setAttribute("class", "chart-legend");
    svg.append(svgTitle, svgDesc, axes, marks, legendGroup);

    const round = (value: number | undefined): string =>
      String(Math.round((value ?? Number.NaN) * 10) / 10);
    const ends = project(shown.ends, size).xy;
    for (let axis = 0; axis < 3; axis++) {
      const line = document.createElementNS(SVG_NAMESPACE, "line");
      line.setAttribute("class", "chart-pca3d-axis");
      line.setAttribute("x1", round(ends[4 * axis]));
      line.setAttribute("y1", round(ends[4 * axis + 1]));
      line.setAttribute("x2", round(ends[4 * axis + 2]));
      line.setAttribute("y2", round(ends[4 * axis + 3]));
      const label = document.createElementNS(SVG_NAMESPACE, "text");
      label.setAttribute("class", "chart-axis-label chart-pca3d-label-text");
      label.setAttribute(
        "x",
        round((ends[4 * axis + 2] ?? Number.NaN) + LABEL_OFFSET),
      );
      label.setAttribute(
        "y",
        round((ends[4 * axis + 3] ?? Number.NaN) - LABEL_OFFSET),
      );
      label.textContent = shown.data.axisLabels[axis] ?? "";
      axes.append(line, label);
    }

    const { xy, depth } = project(shown.positions, size);
    const { colours } = shown.data;
    const highlighted =
      colours.kind === "groups" ? highlightedGroup(colours) : null;
    for (const run of exportRuns(
      depth,
      shown.index,
      shown.paths,
      highlighted,
    )) {
      const d = pathRound(PATH_DIGITS);
      const symbol =
        colours.kind === "groups"
          ? groupSymbol(run.path)
          : groupSymbol(NO_GROUP);
      for (const point of run.points) {
        const at = shown.drawnAt[point] ?? -1;
        drawSymbolAt(
          d,
          symbol,
          SYMBOL_AREA,
          xy[2 * at] ?? Number.NaN,
          xy[2 * at + 1] ?? Number.NaN,
        );
      }
      const path = document.createElementNS(SVG_NAMESPACE, "path");
      if (colours.kind === "groups" || run.path === NO_GROUP) {
        const faded =
          highlighted !== null && run.path !== highlighted
            ? " chart-points-faded"
            : "";
        path.setAttribute(
          "class",
          `chart-points ${groupColourClass(run.path)}${faded}`,
        );
      } else {
        path.setAttribute("class", "chart-points chart-points-value");
        path.setAttribute("fill", viridisColour(run.path));
      }
      path.setAttribute("d", d.toString());
      marks.append(path);
    }

    drawLegendSvg(
      select(legendGroup),
      shown.legend,
      SCATTER_MARGIN.left,
      size.width - SCATTER_MARGIN.right,
      SCATTER_MARGIN.top,
      size.height - SCATTER_MARGIN.bottom,
    );
    return exportSvg(svg, size);
  }

  return {
    update(next) {
      live("update");
      const nextLegend = checkPca3d(next);
      current = next;
      legend = nextLegend;
      writeText();
      dismissed = null;
      clearHover();
      build(current, legend);
      render();
    },
    destroy() {
      if (destroyed) return;
      // A screen that marked the row of the point unmarks it.
      clearHover();
      destroyed = true;
      observer.disconnect();
      if (waitingFrame !== null) cancelAnimationFrame(waitingFrame);
      waitingFrame = null;
      pending = null;
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      element.removeEventListener("wheel", onWheel, { capture: true });
      controls.removeEventListener("change", onControlsChange);
      darkScheme.removeEventListener("change", onTheme);
      themeObserver.disconnect();
      controls.dispose();
      disposeBuilt();
      renderer.dispose();
      // The browser keeps the context until it is collected, and allows
      // only a few at once (charts.md, "destroy").
      renderer.forceContextLoss();
      canvas.remove();
      title.remove();
      desc.remove();
      for (const label of labels) label.remove();
      tooltip.destroy();
    },
    toSVG() {
      return exportedSvg(lastSize("toSVG"));
    },
    // async, so that a defect of the caller rejects the promise, as every
    // other failure of toPNG does.
    async toPNG(scale) {
      const size = lastSize("toPNG");
      return exportPng(() => exportedSvg(size), size, scale);
    },
    rotate(axis, degrees) {
      live("rotate");
      turnView(controls, axis, degrees);
      viewChanged();
    },
    viewAlong(component) {
      live("viewAlong");
      lookAlong(controls, component);
      viewChanged();
    },
    zoom(factor) {
      live("zoom");
      zoomView(controls, factor);
      viewChanged();
    },
    resetView() {
      live("resetView");
      camera.zoom = 1;
      camera.updateProjectionMatrix();
      lookAlong(controls, "start");
      viewChanged();
    },
  };
}
