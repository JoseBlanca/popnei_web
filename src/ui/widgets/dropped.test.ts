import { describe, expect, test } from "vitest";

import { droppedOf } from "./dropped.ts";

describe("droppedOf", () => {
  test("files alone, one or several", () => {
    expect(droppedOf(["file"])).toBe("files");
    expect(droppedOf(["file", "file"])).toBe("files");
  });

  test("one folder, and one piece of text", () => {
    expect(droppedOf(["directory"])).toBe("folder");
    expect(droppedOf(["text"])).toBe("text");
  });

  test("several things of which one is a folder", () => {
    expect(droppedOf(["file", "directory"])).toBe("several");
    expect(droppedOf(["directory", "file"])).toBe("several");
    expect(droppedOf(["directory", "directory"])).toBe("several");
  });

  test("text that comes with a file or a folder is left out", () => {
    expect(droppedOf(["file", "text"])).toBe("files");
    expect(droppedOf(["text", "file", "file"])).toBe("files");
    expect(droppedOf(["directory", "text"])).toBe("folder");
  });

  test("nothing", () => {
    expect(droppedOf([])).toBe("nothing");
  });
});
