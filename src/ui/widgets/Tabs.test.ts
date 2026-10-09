// @vitest-environment jsdom
/**
 * The widget of tabs drawn by React in jsdom: with `keepHidden`, as the
 * two tabs of the files of popgen2.html take it, both panels stay in the
 * page, the one not shown inert, so that what the user left in it is
 * there when it is shown again (docs/specs/steps/popgen2-input.md, "Both
 * tabs kept drawn"); without it, as the plot and the table of the bins of
 * popgen.html use it, only the panel shown is drawn. That the panel not
 * shown takes no room is its style's, which jsdom does not apply, and is
 * checked by the flows of e2e/popgen2Input.spec.ts.
 */
import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { Tabs } from "./Tabs.tsx";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

type Id = "first" | "second";

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

/** Draws the two tabs with `second` shown or not, each panel holding a
    text field named by its tab. */
function draw(selected: Id, keepHidden: boolean | null): void {
  const tabs = (["first", "second"] as const).map((id) => ({
    id,
    label: `The ${id}`,
    content: createElement("input", { "aria-label": `Field of ${id}` }),
  }));
  act(() => {
    root.render(
      createElement(
        StrictMode,
        null,
        createElement(Tabs<Id>, {
          label: "The parts",
          tabs,
          selected,
          onChange: () => undefined,
          ...(keepHidden === null ? {} : { keepHidden }),
        }),
      ),
    );
  });
}

/** The field of the tab `id`, or null when it is not in the page. */
function field(id: Id): HTMLInputElement | null {
  return container.querySelector(`input[aria-label="Field of ${id}"]`);
}

/** The panel that holds the field of the tab `id`. */
function panelOf(id: Id): Element {
  const panel = field(id)?.parentElement ?? null;
  if (panel === null) throw new Error(`no panel holds the field of ${id}`);
  return panel;
}

describe("IN3 D1 the widget of tabs keeps the tab not shown drawn when asked", () => {
  test("with keepHidden both panels are in the page, the one not shown inert and the one shown not", () => {
    draw("first", true);
    expect(field("first")).not.toBeNull();
    expect(field("second")).not.toBeNull();
    expect(panelOf("first").hasAttribute("inert")).toBe(false);
    expect(panelOf("first").hasAttribute("data-inert")).toBe(false);
    expect(panelOf("second").hasAttribute("inert")).toBe(true);
    expect(panelOf("second").getAttribute("data-inert")).toBe("true");
  });

  test("with keepHidden a turn to the other tab and back finds the same field with what was typed in it", () => {
    draw("first", true);
    const typed = field("first");
    if (typed === null) throw new Error("no field of the first tab");
    typed.value = "0.1";
    draw("second", true);
    expect(panelOf("first").hasAttribute("inert")).toBe(true);
    expect(panelOf("second").hasAttribute("inert")).toBe(false);
    draw("first", true);
    expect(field("first")).toBe(typed);
    expect(field("first")?.value).toBe("0.1");
    expect(panelOf("first").hasAttribute("inert")).toBe(false);
  });

  test("without keepHidden, as popgen.html uses the widget, only the panel shown is drawn", () => {
    draw("first", null);
    expect(field("first")).not.toBeNull();
    expect(field("second")).toBeNull();
    draw("second", null);
    expect(field("first")).toBeNull();
    expect(field("second")).not.toBeNull();
  });

  test("keepHidden false draws only the panel shown, as with no keepHidden", () => {
    draw("second", false);
    expect(field("first")).toBeNull();
    expect(field("second")).not.toBeNull();
  });
});
