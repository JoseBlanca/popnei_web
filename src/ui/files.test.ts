import { describe, expect, test } from "vitest";

import { createFiles } from "./files.tsx";

describe("WS7 D1 addFile", () => {
  test("gives 32 hexadecimal digits, new at every call, and the client holds the File under it when it returns", () => {
    const held = new Map<string, File>();
    const files = createFiles({
      addFile: (fileId, file) => {
        held.set(fileId, file);
      },
    });
    const panel = new File(["ARROW1"], "panel.nei");

    const first = files.addFile(panel);
    expect(first).toMatch(/^[0-9a-f]{32}$/);
    expect(held.get(first)).toBe(panel);
    const second = files.addFile(panel);
    expect(second).toMatch(/^[0-9a-f]{32}$/);
    expect(second).not.toBe(first);
    expect(held.get(second)).toBe(panel);

    expect(files.fileOf(first)).toBe(panel);
    expect(files.fileOf("ffffffffffffffffffffffffffffffff")).toBeNull();
  });
});
