// @vitest-environment jsdom
/**
 * The dialog of the widgets drawn by React in jsdom: Escape closes it, as
 * the old page's dialogs have it, and does not under `escapeCloses`
 * false, which the dialog of the download of popgen2.html sets while a
 * file is written, so that a key pressed by habit does not throw away
 * minutes of writing (docs/specs/steps/popgen2-download.md, "While the
 * file is written").
 */
import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { Dialog } from "./Dialog.tsx";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

let container: HTMLElement;
let root: Root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

/** Draws an open dialog with one button, and gives it the focus. */
function draw(
  onClose: () => void,
  escapeCloses: boolean | null,
): HTMLButtonElement {
  act(() => {
    root.render(
      createElement(
        StrictMode,
        null,
        createElement(Dialog, {
          content: { title: "Download filtered variants", text: null },
          onClose,
          ...(escapeCloses !== null && { escapeCloses }),
          children: () => createElement("button", { type: "button" }, "Stop"),
        }),
      ),
    );
  });
  const button = document.querySelector<HTMLButtonElement>(
    '[role="dialog"] button',
  );
  if (button === null) throw new Error("no button drawn in the dialog");
  act(() => {
    button.focus();
  });
  return button;
}

/** Presses Escape on `element`. */
function escape(element: HTMLElement): void {
  act(() => {
    element.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    element.dispatchEvent(
      new KeyboardEvent("keyup", { key: "Escape", bubbles: true }),
    );
  });
}

describe("DL6 D1 Escape and the dialog", () => {
  test("Escape closes a dialog by default, as the old page's dialogs have it", () => {
    const onClose = vi.fn();
    escape(draw(onClose, null));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("Escape closes a dialog with escapeCloses true", () => {
    const onClose = vi.fn();
    escape(draw(onClose, true));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("Escape does not close a dialog with escapeCloses false, which stays open", () => {
    const onClose = vi.fn();
    escape(draw(onClose, false));
    expect(onClose).not.toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });
});
