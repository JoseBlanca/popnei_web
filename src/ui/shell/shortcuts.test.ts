/**
 * The keys of the keyboard's Undo and Redo (docs/specs/shell.md, "The
 * header"). Where they are listened for, and a text field that keeps
 * them, are checked in the browser, in e2e/shell.spec.ts.
 */
import { describe, expect, test } from "vitest";

import { keysAction, shortcutOf, undoesAnotherField } from "./shortcuts.ts";
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

describe("AP4 D2 what popgen2.html does with the keys of Undo and Redo", () => {
  // The rows of docs/specs/steps/popgen2-pca.md, "The keys", that need no
  // page: who the element of the focus gives the keys to, whether a part
  // of the page took them first, and whether they wait. A run of the
  // arrow keys made a change, and a menu "Download…" left open, are read
  // in jsdom and in the browser.

  test("a number box with something typed took the keys itself, to put back its number: the page leaves them", () => {
    expect(keysAction({ handled: true, owner: "project", waits: false })).toBe(
      "leave",
    );
  });

  test("a number box with nothing typed, the heading, a line or an open menu: the page's Undo, taken from the browser", () => {
    expect(keysAction({ handled: false, owner: "project", waits: false })).toBe(
      "take",
    );
  });

  test("the dialog of the download of the filtered variants, open: nothing, and taken from the browser", () => {
    expect(keysAction({ handled: false, owner: "dialog", waits: false })).toBe(
      "swallow",
    );
  });

  test("while the keys wait, as during a PCA: nothing, and taken from the browser, wherever the focus is but in a text field", () => {
    expect(keysAction({ handled: false, owner: "project", waits: true })).toBe(
      "swallow",
    );
    expect(keysAction({ handled: false, owner: "dialog", waits: true })).toBe(
      "swallow",
    );
    expect(keysAction({ handled: false, owner: "text", waits: true })).toBe(
      "leave",
    );
  });

  test("a field of free text keeps the browser's own undo", () => {
    expect(keysAction({ handled: false, owner: "text", waits: false })).toBe(
      "leave",
    );
  });

  test("Cmd+Y, the history of the browser on macOS, is no key of the page; Ctrl+Y and Cmd+Shift+Z redo", () => {
    expect(shortcutOf(keys("y", { metaKey: true }))).toBeNull();
    expect(shortcutOf(keys("y", { ctrlKey: true }))).toBe("redo");
    expect(shortcutOf(keys("Z", { metaKey: true, shiftKey: true }))).toBe(
      "redo",
    );
    expect(shortcutOf(keys("z", { metaKey: true }))).toBe("undo");
  });
});
