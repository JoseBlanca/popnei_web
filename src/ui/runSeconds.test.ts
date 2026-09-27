import { describe, expect, test } from "vitest";

import { secondsSince } from "./runSeconds.ts";

// The seconds of the clock of a calculation under way, rounded down.

describe("VS5 D3 the seconds of the clock of a calculation", () => {
  test("the seconds are rounded down, and 0 with no start", () => {
    expect(secondsSince(1000, 1999)).toBe(0);
    expect(secondsSince(1000, 2999)).toBe(1);
    expect(secondsSince(1000, 3000)).toBe(2);
    expect(secondsSince(null, 5000)).toBe(0);
  });
});
