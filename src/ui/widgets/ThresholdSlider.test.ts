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

import { createRunGate } from "../variants/thresholdRun.ts";
import type { RunGate } from "../variants/thresholdRun.ts";
import { ChangeHoldsProvider, HOLDS_NOTHING } from "./changeHold.ts";
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
    value given back on each move; under `gate` when one is given, as
    popgen2.html draws it. */
function draw(
  calls: Calls,
  value = 0.5,
  muted = false,
  gate: RunGate | null = null,
): void {
  const render = (shown: number): void => {
    const line = createElement(ThresholdSlider, {
      label: "MAF max: maximum major allele frequency",
      minValue: 0,
      maxValue: 1,
      step: 0.01,
      value: shown,
      valueText: String(shown),
      muted,
      onChange: (moved, by) => {
        calls.moves.push([moved, by]);
        render(moved);
      },
      onDragEnd: (ended) => {
        calls.dragEnds.push(ended);
      },
    });
    root.render(
      createElement(
        StrictMode,
        null,
        createElement(
          ChangeHoldsProvider,
          { value: gate ?? HOLDS_NOTHING },
          line,
        ),
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

function pointer(
  type: string,
  x: number,
  pointerType: "mouse" | "touch" = "mouse",
): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    pointerId: 1,
    pointerType,
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

describe("SF9 D4 the grey of the line", () => {
  test("muted marks the line and its handle with data-muted, which its styles draw in the grey, dotted and hollow; not muted, no mark", () => {
    const calls: Calls = { moves: [], dragEnds: [] };
    draw(calls, 0.5, true);
    expect(inputOf().closest("[data-muted]")?.contains(thumbOf())).toBe(true);
    act(() => {
      root.unmount();
    });
    root = createRoot(container);
    draw(calls, 0.5, false);
    expect(inputOf().closest("[data-muted]")).toBeNull();
  });
});

describe("AP6 D3 the reason of a line that waits", () => {
  test("reached by the Tab key, its reason stays shown through an arrow key, which moves nothing", () => {
    const reason = "Stop the PCA to change the filters.";
    const moves: number[] = [];
    act(() => {
      root.render(
        createElement(
          StrictMode,
          null,
          createElement(
            ChangeHoldsProvider,
            { value: HOLDS_NOTHING },
            createElement("input", { "aria-label": "Before" }),
            createElement(ThresholdSlider, {
              label: "MAF max: maximum major allele frequency",
              minValue: 0,
              maxValue: 1,
              step: 0.01,
              value: 0.5,
              valueText: "0.5",
              muted: false,
              onChange: (moved) => {
                moves.push(moved);
              },
              onDragEnd: () => undefined,
              waiting: reason,
            }),
          ),
        ),
      );
    });
    const [before, thumb] = [...container.querySelectorAll("input")];
    if (before === undefined || thumb === undefined) {
      throw new Error("no field before the line, or no line");
    }
    act(() => {
      before.focus();
    });
    act(() => {
      before.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Tab", bubbles: true }),
      );
    });
    act(() => {
      thumb.focus();
    });
    expect(document.querySelector('[role="tooltip"]')?.textContent).toBe(
      reason,
    );
    act(() => {
      thumb.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "ArrowRight",
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    expect(document.querySelector('[role="tooltip"]')?.textContent).toBe(
      reason,
    );
    expect(moves).toEqual([]);
  });
});

describe("NU3 D2 the line holds a drag under way", () => {
  /** Runs `body` with the track given a width, which React Aria turns a
      move of the pointer into a value by: jsdom lays nothing out. */
  const withWidth = (body: () => void): void => {
    const width = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "offsetWidth",
    );
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      get: () => 100,
    });
    try {
      body();
    } finally {
      if (width !== undefined) {
        Object.defineProperty(HTMLElement.prototype, "offsetWidth", width);
      }
    }
  };

  test("held from the press of the pointer to its release, which ends the drag before letting go", () => {
    withWidth(() => {
      const gate = createRunGate();
      const calls: Calls = { moves: [], dragEnds: [] };
      draw(calls, 0.5, false, gate);
      act(() => {
        thumbOf().dispatchEvent(pointer("pointerdown", 50));
      });
      expect(gate.underWay()).toBe(1);
      act(() => {
        window.dispatchEvent(pointer("pointermove", 40));
      });
      expect(gate.underWay()).toBe(1);
      act(() => {
        window.dispatchEvent(pointer("pointermove", 30));
      });
      expect(gate.underWay()).toBe(1);
      // The ends of the drag already given when the gate tells it ended.
      const seen: number[] = [];
      gate.subscribe(() => {
        if (!gate.busy()) seen.push(calls.dragEnds.length);
      });
      act(() => {
        window.dispatchEvent(pointer("pointerup", 30));
      });
      expect(gate.underWay()).toBe(0);
      expect(calls.dragEnds).toHaveLength(1);
      expect(seen).toEqual([1]);
    });
  });

  test.each(["mouse", "touch"] as const)(
    "a thumb pressed by %s and held still holds from the press, and lets go at its release, ending no drag",
    (pointerType) => {
      const gate = createRunGate();
      const calls: Calls = { moves: [], dragEnds: [] };
      draw(calls, 0.5, false, gate);
      act(() => {
        thumbOf().dispatchEvent(pointer("pointerdown", 50, pointerType));
      });
      expect(gate.underWay()).toBe(1);
      act(() => {
        window.dispatchEvent(pointer("pointerup", 50, pointerType));
      });
      expect(gate.underWay()).toBe(0);
      expect(calls.dragEnds).toEqual([]);
    },
  );

  test.each(["mouse", "touch"] as const)(
    "a press by %s cancelled by the browser lets its hold go",
    (pointerType) => {
      const gate = createRunGate();
      draw({ moves: [], dragEnds: [] }, 0.5, false, gate);
      act(() => {
        thumbOf().dispatchEvent(pointer("pointerdown", 50, pointerType));
      });
      expect(gate.underWay()).toBe(1);
      act(() => {
        window.dispatchEvent(pointer("pointercancel", 50, pointerType));
      });
      expect(gate.underWay()).toBe(0);
    },
  );

  test("a press of a key takes no hold", () => {
    const gate = createRunGate();
    const calls: Calls = { moves: [], dragEnds: [] };
    draw(calls, 0.5, false, gate);
    let told = 0;
    gate.subscribe(() => {
      told += 1;
    });
    act(() => {
      inputOf().focus();
    });
    for (const key of ["ArrowRight", "PageDown", "Home"]) {
      act(() => {
        inputOf().dispatchEvent(
          new KeyboardEvent("keydown", {
            key,
            bubbles: true,
            cancelable: true,
          }),
        );
      });
      expect(gate.underWay()).toBe(0);
      act(() => {
        inputOf().dispatchEvent(
          new KeyboardEvent("keyup", { key, bubbles: true, cancelable: true }),
        );
      });
    }
    expect(calls.moves).toHaveLength(3);
    expect(told).toBe(0);
  });

  test("a line removed while dragged lets its hold go", () => {
    withWidth(() => {
      const gate = createRunGate();
      draw({ moves: [], dragEnds: [] }, 0.5, false, gate);
      act(() => {
        thumbOf().dispatchEvent(pointer("pointerdown", 50));
      });
      act(() => {
        window.dispatchEvent(pointer("pointermove", 40));
      });
      expect(gate.underWay()).toBe(1);
      act(() => {
        root.render(null);
      });
      expect(gate.underWay()).toBe(0);
    });
  });
});
