/**
 * The legend of the points as data, and the defects of the data of the
 * points, docs/specs/charts/scatter.md, "How it is verified", "The pure
 * functions".
 */

import { describe, expect, test } from "vitest";
import { legendOf } from "./legend.ts";
import { MAX_POINT_GROUPS, MAX_SVG_POINTS } from "./limits.ts";
import { NO_GROUP, type GroupColours, type ValueColours } from "./marks.ts";

function groups(
  group: readonly number[],
  names: readonly string[],
  highlighted: number | null = null,
): GroupColours {
  return {
    kind: "groups",
    title: "Population",
    group: Uint16Array.from(group),
    names,
    noneName: "No population",
    highlighted,
  };
}

function values(value: readonly number[]): ValueColours {
  return {
    kind: "values",
    title: "Height",
    values: Float64Array.from(value),
    noneName: "No value",
  };
}

/** Five points, the fifth, of P3, not drawn. */
const X = Float64Array.from([0, 1, 2, 3, Number.NaN]);
const Y = Float64Array.from([0, 1, 2, 3, 4]);
const FIVE = groups([0, 1, NO_GROUP, 0, 2], ["P1", "P2", "P3", "P4"]);

describe("IP7 D1 the pieces of the scatter, the legend", () => {
  test("the groups with a point drawn, in the order of the names, then no population", () => {
    expect(legendOf(FIVE, [X, Y])).toEqual({
      kind: "groups",
      title: "Population",
      entries: [
        { group: 0, name: "P1", count: 2, faded: false },
        { group: 1, name: "P2", count: 1, faded: false },
        { group: NO_GROUP, name: "No population", count: 1, faded: false },
      ],
    });
  });

  test("with P2 highlighted, P1 and no population are faded", () => {
    const legend = legendOf({ ...FIVE, highlighted: 1 }, [X, Y]);
    expect(legend.kind === "groups" && legend.entries).toEqual([
      { group: 0, name: "P1", count: 2, faded: true },
      { group: 1, name: "P2", count: 1, faded: false },
      { group: NO_GROUP, name: "No population", count: 1, faded: true },
    ]);
  });

  test("with no population highlighted, every group is faded but it", () => {
    const legend = legendOf({ ...FIVE, highlighted: NO_GROUP }, [X, Y]);
    expect(
      legend.kind === "groups" && legend.entries.map((entry) => entry.faded),
    ).toEqual([true, true, false]);
  });

  test("a highlight at or above the number of names, and not NO_GROUP, is none", () => {
    const legend = legendOf({ ...FIVE, highlighted: 4 }, [X, Y]);
    expect(
      legend.kind === "groups" && legend.entries.map((entry) => entry.faded),
    ).toEqual([false, false, false]);
  });

  test("a highlighted group with no point drawn fades every entry", () => {
    const legend = legendOf({ ...FIVE, highlighted: 3 }, [X, Y]);
    expect(
      legend.kind === "groups" && legend.entries.map((entry) => entry.faded),
    ).toEqual([true, true, true]);
  });

  test("the values: the smallest and largest drawn, and how many have none", () => {
    const x = Float64Array.from([0, 1, 2]);
    expect(legendOf(values([1.5, Number.NaN, 2.5]), [x, x])).toEqual({
      kind: "values",
      title: "Height",
      min: 1.5,
      max: 2.5,
      noneName: "No value",
      noneCount: 1,
    });
  });

  test("the values of points not drawn are left out, and no value drawn gives no range", () => {
    const x = Float64Array.from([0, Number.NaN, 2]);
    const y = Float64Array.from([0, 1, Infinity]);
    const legend = legendOf(values([1, 99, -5]), [x, y]);
    expect(legend).toMatchObject({ min: 1, max: 1, noneCount: 0 });
    const none = legendOf(values([Number.NaN, 3, 4]), [x, y]);
    expect(none).toMatchObject({ min: null, max: null, noneCount: 1 });
  });

  test("a third coordinate that is not finite leaves its point out, as for the 3D plot", () => {
    const z = Float64Array.from([0, 0, 0, Number.NaN, 0]);
    const legend = legendOf(FIVE, [X, Y, z]);
    expect(legend.kind === "groups" && legend.entries).toEqual([
      { group: 0, name: "P1", count: 1, faded: false },
      { group: 1, name: "P2", count: 1, faded: false },
      { group: NO_GROUP, name: "No population", count: 1, faded: false },
    ]);
  });
});

describe("IP7 D1 the pieces of the scatter, the defects of the data", () => {
  test("coordinates of different lengths are a defect", () => {
    expect(() => legendOf(FIVE, [X, Float64Array.from([0, 1, 2, 3])])).toThrow(
      /popnei_web defect/,
    );
  });

  test("no coordinate is a defect", () => {
    expect(() => legendOf(FIVE, [])).toThrow(/popnei_web defect/);
  });

  test("groups of another length than the points are a defect", () => {
    expect(() => legendOf(groups([0, 1], ["P1", "P2"]), [X, Y])).toThrow(
      /popnei_web defect/,
    );
  });

  test("values of another length than the points are a defect", () => {
    expect(() => legendOf(values([1, 2]), [X, Y])).toThrow(/popnei_web defect/);
  });

  test("a group index neither below the number of names nor NO_GROUP is a defect", () => {
    expect(() =>
      legendOf(groups([0, 1, 2, 0, 4], ["P1", "P2", "P3", "P4"]), [X, Y]),
    ).toThrow(/popnei_web defect/);
    expect(() =>
      legendOf(groups([0, 1, 2, 0, NO_GROUP - 1], ["P1", "P2", "P3", "P4"]), [
        X,
        Y,
      ]),
    ).toThrow(/popnei_web defect/);
  });

  test("a highlight that is neither null nor a whole number from 0 is a defect", () => {
    expect(() => legendOf({ ...FIVE, highlighted: -1 }, [X, Y])).toThrow(
      /popnei_web defect/,
    );
    expect(() => legendOf({ ...FIVE, highlighted: 1.5 }, [X, Y])).toThrow(
      /popnei_web defect/,
    );
    expect(() =>
      legendOf({ ...FIVE, highlighted: Number.NaN }, [X, Y]),
    ).toThrow(/popnei_web defect/);
  });

  test("1,000 names are taken and 1,001 are a defect", () => {
    const names = Array.from({ length: MAX_POINT_GROUPS }, (_name, index) =>
      String(index),
    );
    expect(MAX_POINT_GROUPS).toBe(1000);
    expect(() => legendOf({ ...FIVE, names }, [X, Y])).not.toThrow();
    expect(() =>
      legendOf({ ...FIVE, names: [...names, "one more"] }, [X, Y]),
    ).toThrow(/popnei_web defect/);
  });

  test("50,000 points are taken", () => {
    expect(MAX_SVG_POINTS).toBe(50_000);
    const x = new Float64Array(50_000);
    const legend = legendOf(groups(new Array<number>(50_000).fill(0), ["P1"]), [
      x,
      x,
    ]);
    expect(legend.kind === "groups" && legend.entries).toEqual([
      { group: 0, name: "P1", count: 50_000, faded: false },
    ]);
  });

  test("50,001 points are a defect", () => {
    const x = new Float64Array(50_001);
    expect(() =>
      legendOf(groups(new Array<number>(50_001).fill(0), ["P1"]), [x, x]),
    ).toThrow(/popnei_web defect/);
    expect(() =>
      legendOf(values(new Array<number>(50_001).fill(1)), [x, x]),
    ).toThrow(/popnei_web defect/);
  });
});
