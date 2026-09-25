import { describe, expect, test } from "vitest";

import { messageOf } from "./thrown.ts";

describe("messageOf", () => {
  test("gives the message of an Error, of its subclasses too, and the text of anything else thrown", () => {
    expect(messageOf(new Error("the source is not a VCF"))).toBe(
      "the source is not a VCF",
    );
    expect(messageOf(new RangeError("out of memory"))).toBe("out of memory");
    expect(messageOf("a text, not an Error")).toBe("a text, not an Error");
    expect(messageOf(42)).toBe("42");
    expect(messageOf(null)).toBe("null");
    expect(messageOf({ message: "an object, not an Error" })).toBe(
      "[object Object]",
    );
  });
});
