// @vitest-environment jsdom
/**
 * The table of results drawn by React in jsdom: its caption, which names
 * the table by `aria-labelledby`, shown above it, or, with
 * `captionHidden`, the table's own `<caption>`, its name for a screen
 * reader, hidden from the screen by the class of words for a screen
 * reader alone, as the
 * counts of the box of the individuals file of popgen2.html draw it since
 * 11 October 2026 (docs/specs/steps/popgen2-input.md, "The counts").
 * jsdom applies no style, so the test reads the class.
 */
import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { Table } from "./Table.tsx";
import type { TableProps } from "./Table.tsx";
import { VISUALLY_HIDDEN } from "./visuallyHidden.ts";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

let container: HTMLElement;
let root: Root;

/** jsdom has no ResizeObserver, which the table measures its frame
    with; here it tells of no change. */
class NoResize {
  observe(): void {
    // jsdom lays nothing out.
  }
  unobserve(): void {
    // Nothing observed.
  }
  disconnect(): void {
    // Nothing observed.
  }
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("ResizeObserver", NoResize);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.unstubAllGlobals();
});

const COUNTS: TableProps = {
  caption: "Individuals of panel.nei after the filters of individuals",
  columns: [
    { id: "population", label: "Population", isRowHeader: true },
    { id: "individuals", label: "Individuals", isNumeric: true },
  ],
  rows: [{ id: "Unclassified", cells: ["Unclassified", "200"] }],
};

/** Draws `props` and gives the table and the element that names it. */
function draw(props: TableProps): {
  readonly table: HTMLTableElement;
  readonly name: HTMLElement;
} {
  act(() => {
    root.render(createElement(StrictMode, null, createElement(Table, props)));
  });
  const table = container.querySelector("table");
  // The element that names the table: the paragraph of its caption
  // shown, or its own caption, hidden.
  const id = table?.getAttribute("aria-labelledby") ?? null;
  const name =
    id === null
      ? (table?.querySelector("caption") ?? null)
      : document.getElementById(id);
  if (table === null || name === null) {
    throw new Error("no table, or no element that names it");
  }
  return { table, name };
}

describe("NU8 R1 the caption of a table", () => {
  test("shown, by default, as the table's name", () => {
    const { name } = draw(COUNTS);
    expect(name.textContent).toBe(COUNTS.caption);
    expect(name.classList.contains(VISUALLY_HIDDEN)).toBe(false);
  });

  test("hidden from the screen with captionHidden: the table's own caption, its name, read once", () => {
    const { table, name } = draw({ ...COUNTS, captionHidden: true });
    expect(name.tagName).toBe("CAPTION");
    expect(name.parentElement).toBe(table);
    expect(name.textContent).toBe(COUNTS.caption);
    expect(name.classList.contains(VISUALLY_HIDDEN)).toBe(true);
    // No paragraph of the caption beside it, which a screen reader would
    // read as words of the page before it reads the table's name.
    expect(table.hasAttribute("aria-labelledby")).toBe(false);
    expect([...container.querySelectorAll("p")]).toEqual([]);
  });
});
