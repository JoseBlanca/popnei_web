/**
 * The projection of the 3D plot onto the screen,
 * docs/specs/charts/pca3d.md, "How it is verified": `projectToScreen`
 * against the pixels a camera of three.js gives, with no WebGL.
 */

import fc from "fast-check";
import { OrthographicCamera, Vector3 } from "three";
import { describe, expect, test } from "vitest";
import { createView, turnView } from "./pca3d.ts";
import { projectToScreen } from "./project.ts";

/** The camera's projection times its view, as the plot gives it. */
function viewProjectionOf(camera: OrthographicCamera): number[] {
  camera.updateMatrixWorld();
  return camera.projectionMatrix
    .clone()
    .multiply(camera.matrixWorldInverse)
    .toArray();
}

/** Projects the points of `positions` with `camera` onto `width` by `height`. */
function projected(
  positions: readonly number[],
  camera: OrthographicCamera,
  width: number,
  height: number,
): { xy: Float32Array; depth: Float32Array } {
  const numPoints = positions.length / 3;
  const xy = new Float32Array(2 * numPoints);
  const depth = new Float32Array(numPoints);
  projectToScreen(
    Float32Array.from(positions),
    viewProjectionOf(camera),
    width,
    height,
    xy,
    depth,
  );
  return { xy, depth };
}

describe("IP8 D1 the 3D plot in node, projectToScreen", () => {
  test("an orthographic camera of −2 to 2 by −1 to 1 at (0, 0, 5) puts the origin at the centre of 400 by 200 pixels, (2, 1, 0) at the top right corner, (−1, −0.5, 0) at (100, 150), and (0, 0, 1) nearer than (0, 0, −1)", () => {
    const camera = new OrthographicCamera(-2, 2, 1, -1, 0.1, 10);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
    const { xy, depth } = projected(
      [0, 0, 0, 2, 1, 0, -1, -0.5, 0, 0, 0, 1, 0, 0, -1],
      camera,
      400,
      200,
    );
    expect(xy[0]).toBeCloseTo(200, 3);
    expect(xy[1]).toBeCloseTo(100, 3);
    expect(xy[2]).toBeCloseTo(400, 3);
    expect(xy[3]).toBeCloseTo(0, 3);
    expect(xy[4]).toBeCloseTo(100, 3);
    expect(xy[5]).toBeCloseTo(150, 3);
    expect(depth[3]).toBeLessThan(depth[4] ?? Number.NaN);
  });

  test("for 100 points drawn by fast-check, the pixels are those of Vector3.project of three.js, within 0.001 pixel, with the view turned", () => {
    const { camera, controls } = createView(null, 400, 300);
    turnView(controls, "vertical", 23);
    turnView(controls, "horizontal", 11);
    const coordinate = fc.double({ min: -1, max: 1, noNaN: true });
    fc.assert(
      fc.property(
        fc.array(fc.tuple(coordinate, coordinate, coordinate), {
          minLength: 100,
          maxLength: 100,
        }),
        (points) => {
          const positions = points.flat();
          const { xy } = projected(positions, camera, 400, 300);
          camera.updateMatrixWorld();
          for (const [at, [x, y, z]] of points.entries()) {
            // Rounded to a float32 as the positions of the plot are.
            const ndc = new Vector3(
              Math.fround(x),
              Math.fround(y),
              Math.fround(z),
            ).project(camera);
            const px = ((ndc.x + 1) / 2) * 400;
            const py = ((1 - ndc.y) / 2) * 300;
            expect(Math.abs((xy[2 * at] ?? Number.NaN) - px)).toBeLessThan(
              0.001,
            );
            expect(Math.abs((xy[2 * at + 1] ?? Number.NaN) - py)).toBeLessThan(
              0.001,
            );
          }
        },
      ),
      { numRuns: 1 },
    );
  });

  test("a NaN position gives NaN pixels and a NaN depth", () => {
    const camera = new OrthographicCamera(-2, 2, 1, -1, 0.1, 10);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
    const { xy, depth } = projected([Number.NaN, 0, 0], camera, 400, 200);
    expect(xy[0]).toBeNaN();
    expect(xy[1]).toBeNaN();
    expect(depth[0]).toBeNaN();
  });

  test("positions not three per point, a matrix not of 16 numbers, or arrays of another size throw", () => {
    const matrix = new Array<number>(16).fill(0);
    expect(() => {
      projectToScreen(
        new Float32Array(4),
        matrix,
        1,
        1,
        new Float32Array(2),
        new Float32Array(1),
      );
    }).toThrow(/popnei_web defect/);
    expect(() => {
      projectToScreen(
        new Float32Array(3),
        matrix.slice(1),
        1,
        1,
        new Float32Array(2),
        new Float32Array(1),
      );
    }).toThrow(/popnei_web defect/);
    expect(() => {
      projectToScreen(
        new Float32Array(3),
        matrix,
        1,
        1,
        new Float32Array(1),
        new Float32Array(1),
      );
    }).toThrow(/popnei_web defect/);
    expect(() => {
      projectToScreen(
        new Float32Array(3),
        matrix,
        1,
        1,
        new Float32Array(2),
        new Float32Array(2),
      );
    }).toThrow(/popnei_web defect/);
  });
});
