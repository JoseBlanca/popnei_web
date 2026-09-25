/**
 * The keys of the keyboard's Undo and Redo (docs/specs/shell.md, "The
 * header"). Where they are listened for, and a text field that keeps
 * them, are checked in the browser, in e2e/shell.spec.ts.
 */
import { describe, expect, test } from "vitest";

import { shortcutOf } from "./shortcuts.ts";
import type { KeysPressed } from "./shortcuts.ts";

/** The key `key` with the modifiers `held`, none by default. */
function keys(key: string, held: Partial<KeysPressed> = {}): KeysPressed {
  return {
    key,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    ...held,
  };
}

describe("the shortcuts of Undo and Redo", () => {
  test("Ctrl+Z and Cmd+Z undo", () => {
    expect(shortcutOf(keys("z", { ctrlKey: true }))).toBe("undo");
    expect(shortcutOf(keys("z", { metaKey: true }))).toBe("undo");
  });

  test("Ctrl+Shift+Z and Cmd+Shift+Z redo, whose key is the capital Z", () => {
    expect(shortcutOf(keys("Z", { ctrlKey: true, shiftKey: true }))).toBe(
      "redo",
    );
    expect(shortcutOf(keys("Z", { metaKey: true, shiftKey: true }))).toBe(
      "redo",
    );
  });

  test("Ctrl+Y redoes, and Cmd+Y, the history of the browser on macOS, does nothing", () => {
    expect(shortcutOf(keys("y", { ctrlKey: true }))).toBe("redo");
    expect(shortcutOf(keys("y", { metaKey: true }))).toBeNull();
    expect(shortcutOf(keys("Y", { ctrlKey: true, shiftKey: true }))).toBeNull();
  });

  test("Z and Y alone, with Shift alone, or with Alt, do nothing", () => {
    expect(shortcutOf(keys("z"))).toBeNull();
    expect(shortcutOf(keys("y"))).toBeNull();
    expect(shortcutOf(keys("Z", { shiftKey: true }))).toBeNull();
    expect(shortcutOf(keys("z", { ctrlKey: true, altKey: true }))).toBeNull();
    expect(shortcutOf(keys("x", { ctrlKey: true }))).toBeNull();
  });
});
