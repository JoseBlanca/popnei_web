// @vitest-environment jsdom
/**
 * The keys of the keyboard's Undo and Redo (docs/specs/shell.md, "The
 * header"). Where they are listened for, and a text field that keeps
 * them, are checked in the browser, in e2e/shell.spec.ts.
 */
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { NUMBER_FIELD_ATTRIBUTE } from "../widgets/committedNumber.ts";
import { DIALOG_MARK } from "../widgets/dialogMark.ts";
import {
  keysAction,
  refuseUndoKeys,
  shortcutOf,
  undoesAnotherField,
} from "./shortcuts.ts";
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

describe("AP4 D2 what the window does with the keys of Undo and Redo", () => {
  // The rows of docs/specs/steps/popgen2-pca.md, "The keys", that need no
  // page: who the element of the focus gives the keys to, and whether a
  // part of the page took them first. A run of the arrow keys made a
  // change, and a menu "Download…" left open, are read in jsdom and in
  // the browser.

  test("a number box with something typed took the keys itself, to put back its number: the page leaves them", () => {
    expect(keysAction({ handled: true, owner: "project" })).toBe("leave");
  });

  test("a number box with nothing typed, the heading, a line or an open menu: the page's Undo, taken from the browser", () => {
    expect(keysAction({ handled: false, owner: "project" })).toBe("take");
  });

  test("the dialog of the download of the filtered variants, open: nothing, and taken from the browser", () => {
    expect(keysAction({ handled: false, owner: "dialog" })).toBe("swallow");
  });

  test("a field of free text keeps the browser's own undo", () => {
    expect(keysAction({ handled: false, owner: "text" })).toBe("leave");
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

describe("NU2 the window of popgen2.html takes the keys of Undo and Redo from the browser", () => {
  // Chromium on macOS empties a number box whose text is selected at
  // Ctrl+Y, its "yank", in a beforeinput that cannot be cancelled; only
  // the keydown can be (seen by the review of 10 October 2026).
  let stop: () => void = () => undefined;
  beforeEach(() => {
    stop = refuseUndoKeys(window);
  });
  afterEach(() => {
    stop();
    document.body.replaceChildren();
  });

  /** Presses `held` with `key` on `element`, the event bubbling to the
      window as a key does; gives whether its default was prevented. */
  const press = (
    element: Element,
    key: string,
    held: Partial<KeysPressed>,
  ): boolean => {
    const event = new KeyboardEvent("keydown", {
      ...keys(key, held),
      bubbles: true,
      cancelable: true,
    });
    element.dispatchEvent(event);
    return event.defaultPrevented;
  };
  /** Every key of Undo and Redo, as the modifiers held with its letter. */
  const UNDO_KEYS: readonly (readonly [string, Partial<KeysPressed>])[] = [
    ["z", { ctrlKey: true }],
    ["z", { metaKey: true }],
    ["Z", { ctrlKey: true, shiftKey: true }],
    ["Z", { metaKey: true, shiftKey: true }],
    ["y", { ctrlKey: true }],
  ];
  /** An element of `tag` added to the page, with `attributes`. */
  const added = (
    tag: string,
    attributes: Readonly<Record<string, string>> = {},
  ): HTMLElement => {
    const element = document.createElement(tag);
    for (const [name, value] of Object.entries(attributes)) {
      element.setAttribute(name, value);
    }
    document.body.append(element);
    return element;
  };

  test("a number box with nothing typed, the heading and an open dialog: every key taken from the browser", () => {
    const places = [
      added("input", { type: "text", [NUMBER_FIELD_ATTRIBUTE]: "" }),
      added("h1", { tabindex: "-1" }),
    ];
    const dialog = added("div", { [DIALOG_MARK]: "" });
    const button = document.createElement("button");
    dialog.append(button);
    places.push(button);
    for (const place of places) {
      for (const [key, held] of UNDO_KEYS) {
        expect(press(place, key, held)).toBe(true);
      }
    }
  });

  test("a field of free text keeps the browser's own undo", () => {
    const field = added("input", { type: "text" });
    for (const [key, held] of UNDO_KEYS) {
      expect(press(field, key, held)).toBe(false);
    }
  });

  test("Cmd+Y, the history of the browser on macOS, and keys of no shortcut are left to the browser", () => {
    const box = added("input", { type: "text", [NUMBER_FIELD_ATTRIBUTE]: "" });
    expect(press(box, "y", { metaKey: true })).toBe(false);
    expect(press(box, "y", {})).toBe(false);
    expect(press(box, "z", { ctrlKey: true, altKey: true })).toBe(false);
  });

  test("stopped, it takes nothing", () => {
    stop();
    const heading = added("h1", { tabindex: "-1" });
    expect(press(heading, "y", { ctrlKey: true })).toBe(false);
  });
});
