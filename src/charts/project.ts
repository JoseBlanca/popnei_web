/**
 * Where a point of the 3D view falls on the screen (docs/specs/charts/
 * pca3d.md, "The TypeScript interface"): plain arithmetic over typed
 * arrays, with the matrix of the camera as 16 numbers, so that it imports
 * nothing of three.js and the scatter, which shares the hover, loads none
 * of it. It serves the point under the pointer, the labels of the axes and
 * the export of the 3D plot.
 */

/**
 * Projects `positions`, x, y and z per point in the units of the scene,
 * with `viewProjection`, the camera's projection times its view, 16
 * numbers in the column-major order of three.js, onto an element of
 * `width` by `height` CSS pixels: `xy` gets x and y in pixels from the
 * top left, two per point, and `depth` from −1, the nearest, to 1, the
 * farthest, one per point. A NaN position gives NaN. Throws an `Error`, a
 * defect of the caller, when `positions` is not three numbers per point,
 * `viewProjection` not 16 numbers, or `xy` and `depth` not of the size of
 * the points.
 */
export function projectToScreen(
  positions: Float32Array,
  viewProjection: ArrayLike<number>,
  width: number,
  height: number,
  xy: Float32Array,
  depth: Float32Array,
): void {
  if (positions.length % 3 !== 0) {
    throw new Error(
      `popnei_web defect: the positions of the scene are ${String(positions.length)} numbers, not three per point.`,
    );
  }
  const numPoints = positions.length / 3;
  if (viewProjection.length !== 16) {
    throw new Error(
      `popnei_web defect: a matrix of ${String(viewProjection.length)} numbers was given for the 16 of a projection.`,
    );
  }
  if (xy.length !== 2 * numPoints || depth.length !== numPoints) {
    throw new Error(
      `popnei_web defect: ${String(numPoints)} points were given room for ${String(xy.length)} pixel numbers and ${String(depth.length)} depths.`,
    );
  }
  const nan = Number.NaN;
  const [
    m0 = nan,
    m1 = nan,
    m2 = nan,
    m3 = nan,
    m4 = nan,
    m5 = nan,
    m6 = nan,
    m7 = nan,
    m8 = nan,
    m9 = nan,
    m10 = nan,
    m11 = nan,
    m12 = nan,
    m13 = nan,
    m14 = nan,
    m15 = nan,
  ] = Array.from(viewProjection);
  for (let point = 0; point < numPoints; point++) {
    const x = positions[3 * point] ?? Number.NaN;
    const y = positions[3 * point + 1] ?? Number.NaN;
    const z = positions[3 * point + 2] ?? Number.NaN;
    // Column-major: the element of row r and column c is m[4c + r].
    const clipX = m0 * x + m4 * y + m8 * z + m12;
    const clipY = m1 * x + m5 * y + m9 * z + m13;
    const clipZ = m2 * x + m6 * y + m10 * z + m14;
    const clipW = m3 * x + m7 * y + m11 * z + m15;
    const ndcX = clipX / clipW;
    const ndcY = clipY / clipW;
    // eslint-disable-next-line no-param-reassign -- the contract: the caller gives the arrays, kept from one projection to the next
    xy[2 * point] = ((ndcX + 1) / 2) * width;
    // eslint-disable-next-line no-param-reassign -- the contract: the caller gives the arrays, kept from one projection to the next
    xy[2 * point + 1] = ((1 - ndcY) / 2) * height;
    // eslint-disable-next-line no-param-reassign -- the contract: the caller gives the arrays, kept from one projection to the next
    depth[point] = clipZ / clipW;
  }
}
