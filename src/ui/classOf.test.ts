/**
 * The classes of a CSS Module read by name (src/ui/classOf.ts).
 */
import { describe, expect, test } from "vitest";

import { classOf } from "./classOf.ts";

describe("classOf", () => {
  test("gives the class of the module as Vite renamed it", () => {
    expect(classOf({ bar: "_bar_1x2y3" }, "bar")).toBe("_bar_1x2y3");
  });

  test("throws a defect for a class the module does not have", () => {
    expect(() => classOf({ bar: "_bar_1x2y3" }, "baz")).toThrow(
      "popnei_web defect: the CSS Module has no class .baz.",
    );
  });
});
