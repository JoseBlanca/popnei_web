/**
 * The keys of the keyboard's Undo and Redo (docs/specs/shell.md, "The
 * header"). Where they are listened for, and a text field that keeps
 * them, are checked in the browser, in e2e/shell.spec.ts.
 */
import { describe, expect, test } from "vitest";

import { shortcutOf, undoesAnotherField } from "./shortcuts.ts";
import type { KeysPressed } from "./shortcuts.ts";

/** The key `key` with the modifiers `held`, none by default, at the
    place `code` of the keyboard, by default that of the letter on a US
    keyboard, KeyZ for "z". */
function keys(key: string, held: Partial<KeysPressed> = {}): KeysPressed {
  return {
    key,
    code: `Key${key.toUpperCase()}`,
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

  test("on a Russian or a Greek layout, the keys of Z and Y undo and redo", () => {
    expect(shortcutOf(keys("я", { code: "KeyZ", ctrlKey: true }))).toBe("undo");
    expect(
      shortcutOf(keys("Я", { code: "KeyZ", ctrlKey: true, shiftKey: true })),
    ).toBe("redo");
    expect(shortcutOf(keys("н", { code: "KeyY", ctrlKey: true }))).toBe("redo");
    expect(shortcutOf(keys("ζ", { code: "KeyZ", metaKey: true }))).toBe("undo");
    expect(shortcutOf(keys("υ", { code: "KeyY", ctrlKey: true }))).toBe("redo");
  });

  test("on a layout of Latin letters, the letter decides and not the place", () => {
    // AZERTY: Z where a US keyboard has W, and W where it has Z.
    expect(shortcutOf(keys("z", { code: "KeyW", ctrlKey: true }))).toBe("undo");
    expect(shortcutOf(keys("w", { code: "KeyZ", ctrlKey: true }))).toBeNull();
    // QWERTZ: Y where a US keyboard has Z.
    expect(shortcutOf(keys("y", { code: "KeyZ", ctrlKey: true }))).toBe("redo");
  });
});

describe("the browser's undo of a field that has not the focus", () => {
  const focused = { name: "the field of the name" };
  const behind = { name: "the threshold" };

  test("an undo or a redo of another field is one, and of the field with the focus is not", () => {
    // Stand-ins for the elements, compared by identity alone.
    const [name, threshold] = [focused, behind] as unknown as [
      Element,
      Element,
    ];
    expect(undoesAnotherField("historyUndo", threshold, name)).toBe(true);
    expect(undoesAnotherField("historyRedo", threshold, name)).toBe(true);
    expect(undoesAnotherField("historyUndo", name, name)).toBe(false);
    expect(undoesAnotherField("insertText", threshold, name)).toBe(false);
  });
});
