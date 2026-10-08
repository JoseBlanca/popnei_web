// @vitest-environment jsdom
/**
 * The line of a threshold, drawn by React in jsdom
 * (docs/specs/steps/popgen2-filters.md, "The end of a drag, and the
 * keys"): each move given with what made it, the pointer or a key, and
 * the end of a drag given at the release of a pointer that moved the
 * thumb, never at a key, where React Aria's own `onChangeEnd` comes at
 * every press.
 */
import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { ThresholdSlider } from "./ThresholdSlider.tsx";
import type { MovedBy } from "./ThresholdSlider.tsx";

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

/** What the line was told. */
interface Calls {
  readonly moves: [number, MovedBy][];
  readonly dragEnds: number[];
}

/** Draws a line over 0 to 1 by 0.01 at `value`, as the screen does: the
    value given back on each move. */
function draw(calls: Calls, value = 0.5): void {
  const render = (shown: number): void => {
    root.render(
      createElement(
        StrictMode,
        null,
        createElement(ThresholdSlider, {
          label: "MAF max: maximum major allele frequency",
          minValue: 0,
          maxValue: 1,
          step: 0.01,
          value: shown,
          valueText: String(shown),
          muted: false,
          onChange: (moved, by) => {
            calls.moves.push([moved, by]);
            render(moved);
          },
          onDragEnd: (ended) => {
            calls.dragEnds.push(ended);
          },
        }),
      ),
    );
  };
  act(() => {
    render(value);
  });
}

function inputOf(): HTMLInputElement {
  const input = container.querySelector("input");
  if (input === null) throw new Error("no input drawn");
  return input;
}

/** The thumb, the element React Aria listens to the pointer on. */
function thumbOf(): HTMLElement {
  const thumb = inputOf().parentElement?.parentElement;
  if (!(thumb instanceof HTMLElement)) throw new Error("no thumb drawn");
  return thumb;
}

function pointer(type: string, x: number): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    pointerId: 1,
    pointerType: "mouse",
    isPrimary: true,
    button: 0,
    buttons: type === "pointerup" ? 0 : 1,
    clientX: x,
    clientY: 10,
  });
}

/** Presses the key `key` on the input, as a user with the focus there. */
function press(key: string): void {
  act(() => {
    inputOf().dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
    );
    inputOf().dispatchEvent(
      new KeyboardEvent("keyup", { key, bubbles: true, cancelable: true }),
    );
  });
}

describe("SF9 D2 the line's end of a drag", () => {
  test("called once at the release of a pointer that moved the thumb, with where it was dragged to, each move given as the pointer's", () => {
    // jsdom lays nothing out: the track is given a width, which React
    // Aria turns a move of the pointer into a value by.
    const width = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "offsetWidth",
    );
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      get: () => 100,
    });
    try {
      const calls: Calls = { moves: [], dragEnds: [] };
      draw(calls);
      const thumb = thumbOf();
      act(() => {
        thumb.dispatchEvent(pointer("pointerdown", 50));
      });
      act(() => {
        window.dispatchEvent(pointer("pointermove", 40));
      });
      act(() => {
        window.dispatchEvent(pointer("pointermove", 30));
      });
      expect(calls.moves.length).toBeGreaterThan(0);
      expect(calls.moves.every(([, by]) => by === "pointer")).toBe(true);
      expect(calls.dragEnds).toEqual([]);
      act(() => {
        window.dispatchEvent(pointer("pointerup", 30));
      });
      expect(calls.dragEnds).toEqual([calls.moves.at(-1)?.[0]]);
      expect(calls.dragEnds[0]).toBeLessThan(0.5);

      // A press that moves nothing ends no drag.
      act(() => {
        thumb.dispatchEvent(pointer("pointerdown", 30));
      });
      act(() => {
        window.dispatchEvent(pointer("pointerup", 30));
      });
      expect(calls.dragEnds).toHaveLength(1);
    } finally {
      if (width !== undefined) {
        Object.defineProperty(HTMLElement.prototype, "offsetWidth", width);
      }
    }
  });

  test("never at a key: the arrows, Page Up and Down, Home and End each give a move of a key, and no end of a drag", () => {
    const calls: Calls = { moves: [], dragEnds: [] };
    draw(calls);
    act(() => {
      inputOf().focus();
    });
    for (const key of [
      "ArrowRight",
      "ArrowLeft",
      "ArrowUp",
      "ArrowDown",
      "PageUp",
      "PageDown",
      "Home",
      "End",
    ]) {
      press(key);
    }
    expect(calls.moves.map(([, by]) => by)).toEqual(Array(8).fill("key"));
    expect(calls.moves.map(([moved]) => moved)).toEqual([
      0.51, 0.5, 0.51, 0.5, 0.6, 0.5, 0, 1,
    ]);
    expect(calls.dragEnds).toEqual([]);
  });
});
