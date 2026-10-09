/**
 * The key of the body of a sortable table, which decides whether a sort
 * draws the rows anew or moves them (tableSort.ts, `bodyKey`).
 */
import { describe, expect, test } from "vitest";

import { MOST_COLUMNS_REDRAWN, bodyKey } from "./tableSort.ts";

describe("the key of the body of a sortable table", () => {
  test("up to 8 columns, as the 4 of the statistics of each individual: a key for each sort, and for none", () => {
    expect(MOST_COLUMNS_REDRAWN).toBe(8);
    const keys = [
      bodyKey(null, 4),
      bodyKey({ column: "a", direction: "ascending" }, 4),
      bodyKey({ column: "a", direction: "descending" }, 4),
      bodyKey({ column: "b", direction: "ascending" }, 8),
    ];
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("past 8 columns, as the 20 of individuals_10000.xlsx: the same key for every sort", () => {
    const keys = [
      bodyKey(null, 20),
      bodyKey({ column: "a", direction: "ascending" }, 20),
      bodyKey({ column: "a", direction: "descending" }, 20),
      bodyKey({ column: "b", direction: "ascending" }, 9),
    ];
    expect(new Set(keys).size).toBe(1);
  });
});
