// @vitest-environment jsdom
/**
 * The tooltip of a button drawn by React in jsdom: a hint that becomes
 * null while its tooltip is open takes the tooltip with it, so that no
 * empty box stays on the page with nothing to close it but Escape, and
 * the button is no longer described by it. Undo and Redo of the header
 * give such a hint (docs/specs/shell.md, "The header"). And a tooltip
 * shown by the focus of the keyboard stays through a scroll of the page
 * while its button has the focus, as the browser scrolls a control
 * reached by the Tab key into view; one shown by the mouse alone closes
 * on a scroll, as React Aria closes it.
 */
import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { Button } from "./Button.tsx";

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

/** Draws the button Undo with the hint `hint`, waiting with the reason
    `waiting` when one is given, and a field before it from which the Tab
    key reaches it. */
function draw(hint: string | null, waiting: string | null = null): void {
  act(() => {
    root.render(
      createElement(
        StrictMode,
        null,
        createElement("input", { "aria-label": "Before" }),
        createElement(Button, {
          label: "Undo",
          onPress: () => undefined,
          hint,
          waiting,
        }),
      ),
    );
  });
}

/** The button Undo. */
function button(): HTMLButtonElement {
  const found = container.querySelector("button");
  if (found === null) throw new Error("no button");
  return found;
}

/** Puts the focus on the button by the keyboard, as the Tab key does. */
function tabToButton(): void {
  const before = container.querySelector("input");
  if (before === null) throw new Error("no field before the button");
  act(() => {
    before.focus();
  });
  act(() => {
    before.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", bubbles: true }),
    );
  });
  act(() => {
    button().focus();
  });
}

describe("AP1 D2 the tooltip of a button whose hint goes", () => {
  test("a hint that becomes null while its tooltip is open takes the tooltip and the description with it", () => {
    const hint = "Undo: the filter of the variants by missing data changed";
    draw(hint);
    tabToButton();
    expect(document.querySelector('[role="tooltip"]')?.textContent).toBe(hint);
    draw(null);
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    expect(button().hasAttribute("aria-describedby")).toBe(false);
  });
});

describe("task 9.2 a tooltip shown by the focus through a scroll", () => {
  test("a scroll of the page while the button has the focus leaves its tooltip shown", () => {
    const hint = "Stop the PCA to change the filters.";
    draw(hint);
    tabToButton();
    expect(document.querySelector('[role="tooltip"]')?.textContent).toBe(hint);
    act(() => {
      document.dispatchEvent(new Event("scroll"));
    });
    expect(document.querySelector('[role="tooltip"]')?.textContent).toBe(hint);
  });

  test("a tooltip shown by the mouse alone, the focus on another field, closes on a scroll", () => {
    const hint = "Stop the PCA to change the filters.";
    draw(hint);
    const before = container.querySelector("input");
    if (before === null) throw new Error("no field before the button");
    vi.useFakeTimers();
    try {
      act(() => {
        before.focus();
      });
      // React Aria shows a tooltip on the hover of a user it counts as
      // one of the pointer, by the moves of the pointer over the page.
      act(() => {
        document.dispatchEvent(
          new PointerEvent("pointermove", {
            bubbles: true,
            pointerType: "mouse",
          }),
        );
      });
      act(() => {
        button().dispatchEvent(
          new PointerEvent("pointerover", {
            bubbles: true,
            pointerType: "mouse",
          }),
        );
      });
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(document.activeElement).toBe(before);
      expect(document.querySelector('[role="tooltip"]')?.textContent).toBe(
        hint,
      );
      act(() => {
        document.dispatchEvent(new Event("scroll"));
      });
      expect(document.querySelector('[role="tooltip"]')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("AP6 D3 the reason of a button that waits through a press", () => {
  const reason = "Stop the PCA to change the filters.";

  /** Sends the keydown and the keyup of `key` to the button. */
  function pressKey(key: string): void {
    act(() => {
      button().dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
      );
      button().dispatchEvent(
        new KeyboardEvent("keyup", { key, bubbles: true, cancelable: true }),
      );
    });
  }

  test("reached by the Tab key, its reason stays shown through Enter and an arrow key", () => {
    draw("Undo: the MAF filter changed", reason);
    tabToButton();
    expect(document.querySelector('[role="tooltip"]')?.textContent).toBe(
      reason,
    );
    pressKey("Enter");
    expect(document.querySelector('[role="tooltip"]')?.textContent).toBe(
      reason,
    );
    pressKey("ArrowRight");
    expect(document.querySelector('[role="tooltip"]')?.textContent).toBe(
      reason,
    );
  });

  test("shown by the mouse resting on it, its reason stays shown through a click", () => {
    draw("Undo: the MAF filter changed", reason);
    vi.useFakeTimers();
    try {
      const mouse = (type: string): PointerEvent =>
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerType: "mouse",
          pointerId: 1,
          isPrimary: true,
          button: 0,
        });
      act(() => {
        document.dispatchEvent(mouse("pointermove"));
      });
      act(() => {
        button().dispatchEvent(mouse("pointerover"));
      });
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(document.querySelector('[role="tooltip"]')?.textContent).toBe(
        reason,
      );
      act(() => {
        button().dispatchEvent(mouse("pointerdown"));
        button().dispatchEvent(mouse("pointerup"));
        button().dispatchEvent(
          new MouseEvent("click", { bubbles: true, cancelable: true }),
        );
      });
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(document.querySelector('[role="tooltip"]')?.textContent).toBe(
        reason,
      );
    } finally {
      vi.useRealTimers();
    }
  });

  test("a button that does not wait still loses its hint on Enter", () => {
    const hint = "Undo: the MAF filter changed";
    draw(hint);
    tabToButton();
    expect(document.querySelector('[role="tooltip"]')?.textContent).toBe(hint);
    pressKey("Enter");
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });
});
