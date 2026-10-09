// @vitest-environment jsdom
/**
 * Whether an element of the PCA tab is shown, and the wait until it is,
 * which the 3D view's words go through, so that the status region says
 * nothing of a view in a tab hidden (docs/specs/steps/popgen2-pca.md,
 * "Accessibility"). jsdom lays nothing out and has no ResizeObserver: the
 * boxes of an element and its observer are the test's.
 */
import { afterEach, describe, expect, test, vi } from "vitest";

import { isShown, whenShown } from "./whenShown.ts";

/** The observers made, each with the function the browser would call. */
let observers: { readonly callback: () => void; disconnected: boolean }[] = [];

class FakeResizeObserver {
  private readonly made: {
    readonly callback: () => void;
    disconnected: boolean;
  };
  constructor(callback: () => void) {
    this.made = { callback, disconnected: false };
    observers.push(this.made);
  }
  observe(): void {
    // The test calls the callback.
  }
  disconnect(): void {
    this.made.disconnected = true;
  }
}

/** An element with `boxes` boxes, as the browser lays it out, and with
    no `checkVisibility`, as Safari before 17.4. */
function elementWithBoxes(boxes: { count: number }): HTMLElement {
  const element = document.createElement("div");
  Object.defineProperty(element, "checkVisibility", { value: undefined });
  element.getClientRects = () =>
    ({ length: boxes.count }) as unknown as DOMRectList;
  return element;
}

afterEach(() => {
  observers = [];
  vi.unstubAllGlobals();
});

describe("AP6 D3 whether the 3D view is shown, in a browser without checkVisibility", () => {
  test("an element of no boxes, in a tab hidden, is not shown; one with boxes is", () => {
    const boxes = { count: 0 };
    const element = elementWithBoxes(boxes);
    expect(isShown(element)).toBe(false);
    boxes.count = 1;
    expect(isShown(element)).toBe(true);
  });

  test("checkVisibility, where the browser has it, decides", () => {
    const element = document.createElement("div");
    element.checkVisibility = () => false;
    element.getClientRects = () => ({ length: 1 }) as unknown as DOMRectList;
    expect(isShown(element)).toBe(false);
  });

  test("the words wait until the element gains its boxes, and are said once; a wait stopped says nothing", () => {
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    const boxes = { count: 0 };
    const element = elementWithBoxes(boxes);
    const said: string[] = [];
    whenShown(element, () => said.push("Loading the 3D view…"));
    expect(said).toEqual([]);
    observers[0]?.callback();
    expect(said).toEqual([]);
    boxes.count = 1;
    observers[0]?.callback();
    expect(said).toEqual(["Loading the 3D view…"]);
    expect(observers[0]?.disconnected).toBe(true);

    boxes.count = 0;
    const stop = whenShown(element, () => said.push("again"));
    stop();
    expect(observers[1]?.disconnected).toBe(true);
    expect(said).toEqual(["Loading the 3D view…"]);
  });
});
