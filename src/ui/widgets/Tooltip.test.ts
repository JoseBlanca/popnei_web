// @vitest-environment jsdom
/**
 * The tooltip of a button drawn by React in jsdom: a hint that becomes
 * null while its tooltip is open takes the tooltip with it, so that no
 * empty box stays on the page with nothing to close it but Escape, and
 * the button is no longer described by it. Undo and Redo of the header
 * give such a hint (docs/specs/shell.md, "The header"). And a tooltip
 * shown by the focus of the keyboard stays through a scroll of the page
 * while its button has the focus, as the browser scrolls a control
 * reached by the Tab key into view.
 */
import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

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

/** Draws the button Undo with the hint `hint`, and a field before it
    from which the Tab key reaches it. */
function draw(hint: string | null): void {
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

  test("the focus gone, a scroll, and the focus back by the keyboard shows the tooltip again", () => {
    const hint = "Stop the PCA to change the filters.";
    draw(hint);
    tabToButton();
    act(() => {
      button().blur();
    });
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    act(() => {
      document.dispatchEvent(new Event("scroll"));
    });
    tabToButton();
    expect(document.querySelector('[role="tooltip"]')?.textContent).toBe(hint);
  });
});
