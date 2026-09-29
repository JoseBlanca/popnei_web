/**
 * The 3D plot of the PCA, docs/specs/charts/pca3d.md, "How it is
 * verified", "In the project `charts` of Vitest": the pieces the plot is
 * built from, with the very camera and controls of three.js the plot uses,
 * which compute in node with no WebGL; the defects of the data; and the
 * plot under jsdom, which gives no WebGL. What needs WebGL is checked in
 * Playwright, on e2e/plots.html.
 */

import { Vector3, type OrthographicCamera } from "three";
import { describe, expect, test } from "vitest";
import { MAX_SVG_POINTS } from "./limits.ts";
import { NO_GROUP, type PointColours } from "./marks.ts";
import {
  createPca3d,
  createView,
  exportRuns,
  lookAlong,
  scenePositions,
  turnView,
  ZOOM_MAX,
  ZOOM_MIN,
  zoomView,
  type Pca3dData,
} from "./pca3d.ts";
import { Pca3dError } from "./pca3dError.ts";

/** The polar angle the controls keep the camera at, straight above: 0.000001 radians. */
const TOP = 0.000001;
const DEGREE = Math.PI / 180;

/** Where the point (x, y, z) of the scene falls with `camera`, in its coordinates from −1 to 1. */
function ndcOf(
  camera: OrthographicCamera,
  x: number,
  y: number,
  z: number,
): Vector3 {
  camera.updateMatrixWorld();
  return new Vector3(x, y, z).project(camera);
}

/** The ends of the first, second and third components, on the screen. */
function endsOf(camera: OrthographicCamera): [Vector3, Vector3, Vector3] {
  return [
    ndcOf(camera, 1, 0, 0),
    ndcOf(camera, 0, 1, 0),
    ndcOf(camera, 0, 0, 1),
  ];
}

function groupsOf(group: readonly number[], names: readonly string[]) {
  return {
    kind: "groups",
    title: "Population",
    group: Uint16Array.from(group),
    names,
    noneName: "No population",
    highlighted: null,
  } as const satisfies PointColours;
}

function dataOf(
  x: readonly number[],
  y: readonly number[],
  z: readonly number[],
  colours: PointColours = groupsOf(
    x.map(() => 0),
    ["P1"],
  ),
  pointNames: readonly string[] = x.map((_x, at) => `s${String(at)}`),
): Pca3dData {
  return {
    title: "Principal components, in 3D",
    description: "The individuals on PC1, PC2 and PC3",
    x: Float64Array.from(x),
    y: Float64Array.from(y),
    z: Float64Array.from(z),
    axisNames: ["PC1", "PC2", "PC3"],
    axisLabels: ["PC1 (3.55%)", "PC2 (3.40%)", "PC3 (1.89%)"],
    pointNames,
    colours,
  };
}

describe("IP8 D1 the 3D plot in node, scenePositions", () => {
  test("for x [1, −4, NaN], y [2, 0, 1] and z [0, 2, 3], the scale is 1/4, the positions (0.25, 0.5, 0) and (−1, 0, 0.5), and the index [0, 1]", () => {
    const { positions, index, scale } = scenePositions(
      Float64Array.from([1, -4, Number.NaN]),
      Float64Array.from([2, 0, 1]),
      Float64Array.from([0, 2, 3]),
    );
    expect(scale).toBeCloseTo(0.25, 12);
    expect([...positions]).toEqual([0.25, 0.5, 0, -1, 0, 0.5]);
    expect([...index]).toEqual([0, 1]);
  });

  test("the third coordinate counts for the scale, and a point with only its third coordinate not finite is not drawn", () => {
    const { positions, index, scale } = scenePositions(
      Float64Array.from([1, 0, 0.5]),
      Float64Array.from([0, 1, 0.5]),
      Float64Array.from([-8, 2, Number.NaN]),
    );
    expect(scale).toBeCloseTo(0.125, 12);
    expect([...positions]).toEqual([0.125, 0, -1, 0, 0.125, 0.25]);
    expect([...index]).toEqual([0, 1]);
  });

  test("no point with three finite coordinates gives no position and the scale 1", () => {
    const { positions, index, scale } = scenePositions(
      Float64Array.from([Number.NaN, 1]),
      Float64Array.from([0, Number.POSITIVE_INFINITY]),
      Float64Array.from([0, 0]),
    );
    expect(positions).toHaveLength(0);
    expect(index).toHaveLength(0);
    expect(scale).toBe(1);
  });
});

describe("IP8 D1 the 3D plot in node, the views", () => {
  test("along component 2 the first component runs to the right and the second up, the third at the centre within 0.0001 of the width, and the polar angle is 0.000001", () => {
    const { camera, controls } = createView(null, 400, 300);
    lookAlong(controls, 2);
    const [first, second, third] = endsOf(camera);
    expect(first.x).toBeGreaterThan(0.1);
    expect(Math.abs(first.y)).toBeLessThan(0.0002);
    expect(second.y).toBeGreaterThan(0.1);
    expect(Math.abs(second.x)).toBeLessThan(0.0002);
    // 0.0001 of the width is 0.0002 of the two units from −1 to 1.
    expect(Math.abs(third.x)).toBeLessThan(0.0002);
    expect(Math.abs(third.y)).toBeLessThan(0.0002);
    expect(controls.getPolarAngle()).toBeCloseTo(TOP, 9);
  });

  test("along component 0 the second component runs to the right and the third up", () => {
    const { camera, controls } = createView(null, 400, 300);
    lookAlong(controls, 0);
    const [first, second, third] = endsOf(camera);
    expect(second.x).toBeGreaterThan(0.1);
    expect(Math.abs(second.y)).toBeLessThan(1e-6);
    expect(third.y).toBeGreaterThan(0.1);
    expect(Math.abs(third.x)).toBeLessThan(1e-6);
    expect(Math.abs(first.x)).toBeLessThan(1e-6);
    expect(Math.abs(first.y)).toBeLessThan(1e-6);
  });

  test("along component 1 the first component runs to the right and the third up", () => {
    const { camera, controls } = createView(null, 400, 300);
    lookAlong(controls, 1);
    const [first, second, third] = endsOf(camera);
    expect(first.x).toBeGreaterThan(0.1);
    expect(Math.abs(first.y)).toBeLessThan(1e-6);
    expect(third.y).toBeGreaterThan(0.1);
    expect(Math.abs(third.x)).toBeLessThan(1e-6);
    expect(Math.abs(second.x)).toBeLessThan(1e-6);
    expect(Math.abs(second.y)).toBeLessThan(1e-6);
  });

  test("the starting view, which createView gives and lookAlong(…, 'start') gives back, is at a polar angle of 70° and an azimuth of 30°", () => {
    const { controls } = createView(null, 400, 300);
    expect(controls.getPolarAngle()).toBeCloseTo(70 * DEGREE, 10);
    expect(controls.getAzimuthalAngle()).toBeCloseTo(30 * DEGREE, 10);
    lookAlong(controls, 0);
    lookAlong(controls, "start");
    expect(controls.getPolarAngle()).toBeCloseTo(70 * DEGREE, 10);
    expect(controls.getAzimuthalAngle()).toBeCloseTo(30 * DEGREE, 10);
  });
});

describe("IP8 D1 the 3D plot in node, the turns", () => {
  test("from the view along component 2, a turn of −15° about the horizontal leaves the view at the top, and one of 15° makes the polar angle 15°", () => {
    const { controls } = createView(null, 400, 300);
    lookAlong(controls, 2);
    turnView(controls, "horizontal", -15);
    expect(controls.getPolarAngle()).toBeCloseTo(TOP, 9);
    turnView(controls, "horizontal", 15);
    // 15° from the 0.000001 radians of the top.
    expect(controls.getPolarAngle()).toBeCloseTo(15 * DEGREE + TOP, 9);
  });

  test("from the starting view, five turns of −15° about the horizontal stop at the top, the azimuth still 30°", () => {
    const { controls } = createView(null, 400, 300);
    for (let press = 0; press < 5; press++) {
      turnView(controls, "horizontal", -15);
    }
    expect(controls.getPolarAngle()).toBeCloseTo(TOP, 9);
    expect(controls.getAzimuthalAngle()).toBeCloseTo(30 * DEGREE, 6);
  });

  test("from the view along component 1, a turn of 15° about the vertical moves the end of the first component to cos 15° of its length to the right and the end of the second to the left of the centre", () => {
    const { camera, controls } = createView(null, 400, 300);
    lookAlong(controls, 1);
    const before = ndcOf(camera, 1, 0, 0).x;
    turnView(controls, "vertical", 15);
    const [first, second] = endsOf(camera);
    expect(first.x / before).toBeCloseTo(Math.cos(15 * DEGREE), 6);
    expect(first.x / before).toBeCloseTo(0.966, 3);
    expect(second.x).toBeLessThan(0);
  });
});

describe("IP8 D1 the 3D plot in node, the zoom", () => {
  test("a zoom of 1.25 from the start makes the camera's zoom 1.25, and the end of the first component 1.25 times as far from the centre", () => {
    const { camera, controls } = createView(null, 400, 300);
    const before = ndcOf(camera, 1, 0, 0);
    zoomView(controls, 1.25);
    expect(camera.zoom).toBeCloseTo(1.25, 12);
    const after = ndcOf(camera, 1, 0, 0);
    expect(Math.hypot(after.x, after.y)).toBeCloseTo(
      1.25 * Math.hypot(before.x, before.y),
      9,
    );
  });

  test("20 zooms of 1.25 stop at ZOOM_MAX, 20, and 10 of 0.8 from the start stop at ZOOM_MIN, 0.25; the controls keep the same bounds", () => {
    const zoomedIn = createView(null, 400, 300);
    for (let press = 0; press < 20; press++) zoomView(zoomedIn.controls, 1.25);
    expect(zoomedIn.camera.zoom).toBe(20);
    expect(ZOOM_MAX).toBe(20);
    expect(zoomedIn.controls.maxZoom).toBe(ZOOM_MAX);
    const zoomedOut = createView(null, 400, 300);
    for (let press = 0; press < 10; press++) zoomView(zoomedOut.controls, 0.8);
    expect(zoomedOut.camera.zoom).toBe(0.25);
    expect(ZOOM_MIN).toBe(0.25);
    expect(zoomedOut.controls.minZoom).toBe(ZOOM_MIN);
    expect(zoomedOut.controls.enablePan).toBe(false);
    expect(zoomedOut.controls.enableDamping).toBe(false);
  });
});

describe("IP8 D1 the 3D plot in node, exportRuns", () => {
  const A = 0;
  const B = 1;

  test("three points of groups A, B and A, from far to near, give three runs, A, B and A", () => {
    // Given in another order than their depth: point 2 is the farthest.
    const runs = exportRuns(
      Float32Array.from([0.1, -0.5, 0.9]),
      Uint32Array.from([0, 1, 2]),
      Uint16Array.from([B, A, A]),
      null,
    );
    expect(runs.map((run) => [run.path, [...run.points]])).toEqual([
      [A, [2]],
      [B, [0]],
      [A, [1]],
    ]);
  });

  test("with B highlighted, one run of A's two points from far to near, then B's", () => {
    const runs = exportRuns(
      Float32Array.from([0.1, -0.5, 0.9]),
      Uint32Array.from([0, 1, 2]),
      Uint16Array.from([B, A, A]),
      B,
    );
    expect(runs.map((run) => [run.path, [...run.points]])).toEqual([
      [A, [2, 1]],
      [B, [0]],
    ]);
  });
});

describe("IP8 D1 the 3D plot in node, its defects", () => {
  test("a turn by an angle that is not finite throws", () => {
    const { controls } = createView(null, 400, 300);
    for (const angle of [Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => {
        turnView(controls, "vertical", angle);
      }).toThrow(/popnei_web defect/);
      expect(() => {
        turnView(controls, "horizontal", angle);
      }).toThrow(/popnei_web defect/);
    }
  });

  test("a zoom by a factor that is not finite, or is 0 or less, throws and leaves the zoom", () => {
    const { camera, controls } = createView(null, 400, 300);
    for (const factor of [Number.NaN, Number.POSITIVE_INFINITY, 0, -1.25]) {
      expect(() => {
        zoomView(controls, factor);
      }).toThrow(/popnei_web defect/);
    }
    expect(camera.zoom).toBe(1);
  });

  test("createPca3d throws for x, y, z or names of different lengths, more than MAX_SVG_POINTS points, and colours of a group beyond the names, before it asks for WebGL", () => {
    const cases: Pca3dData[] = [
      dataOf([0, 1], [0], [0, 1]),
      dataOf([0, 1], [0, 1], [0]),
      dataOf([0, 1], [0, 1], [0, 1], undefined, ["s0"]),
      dataOf([0, 1], [0, 1], [0, 1], groupsOf([0], ["P1"])),
      dataOf([0, 1], [0, 1], [0, 1], groupsOf([0, 2], ["P1", "P2"])),
    ];
    const many = Array.from({ length: MAX_SVG_POINTS + 1 }, () => 0);
    cases.push(dataOf(many, many, many));
    for (const data of cases) {
      const element = document.createElement("div");
      expect(() => createPca3d(element, data)).toThrow(/popnei_web defect/);
      expect(() => createPca3d(element, data)).not.toThrow(Pca3dError);
      expect(element.childNodes).toHaveLength(0);
    }
  });

  test("scenePositions of coordinates of different lengths, and exportRuns of depths not one per point or an index with no path, throw", () => {
    expect(() =>
      scenePositions(
        new Float64Array(2),
        new Float64Array(1),
        new Float64Array(2),
      ),
    ).toThrow(/popnei_web defect/);
    expect(() =>
      exportRuns(
        new Float32Array(2),
        new Uint32Array(1),
        new Uint16Array(1),
        null,
      ),
    ).toThrow(/popnei_web defect/);
    expect(() =>
      exportRuns(
        new Float32Array(1),
        Uint32Array.from([3]),
        new Uint16Array(1),
        null,
      ),
    ).toThrow(/popnei_web defect/);
  });
});

describe("IP8 D1 the 3D plot in node, under jsdom", () => {
  test("with no WebGL, createPca3d throws a Pca3dError of kind noWebGl and leaves the element with no child", () => {
    const element = document.createElement("div");
    document.body.append(element);
    let thrown: unknown = null;
    try {
      createPca3d(
        element,
        dataOf([0, 1], [1, 0], [0, 1], groupsOf([0, NO_GROUP], ["P1"])),
      );
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(Pca3dError);
    expect(thrown instanceof Pca3dError ? thrown.kind : null).toBe("noWebGl");
    expect(element.childNodes).toHaveLength(0);
    element.remove();
  });
});
