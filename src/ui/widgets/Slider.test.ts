// @vitest-environment jsdom
/**
 * The slider of the PCA's own filters, drawn by React in jsdom, and the
 * change under way it holds on the gate of popgen2.html
 * (docs/specs/steps/popgen2-pca.md, "The PCA calculated again by
 * itself"): from the first move of a pointer that drags it to the end of
 * the drag, or until it leaves the page; never at a key, which is a change
 * at once; and none on popgen.html, which gives no gate.
 */
import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { RunGateProvider } from "../variants/runGate.tsx";
import { createRunGate } from "../variants/thresholdRun.ts";
import type { RunGate } from "../variants/thresholdRun.ts";
import { Slider } from "./Slider.tsx";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

let container: HTMLElement;
let root: Root;
let width: PropertyDescriptor | undefined;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  // jsdom lays nothing out: the track is given a width, which React Aria
  // turns a move of the pointer into a value by.
  width = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get: () => 100,
  });
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  if (width !== undefined) {
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", width);
  }
});

/** Draws a slider over 0 to 1 by 0.01 at 0.5, under `gate` when one is
    given, as popgen2.html does, and with none, as popgen.html; the value
    given at the end of a move is kept in `ends` and given back. */
function draw(gate: RunGate | null, ends: number[]): void {
  const render = (shown: number): void => {
    const slider = createElement(Slider, {
      label: "Maximum proportion of missing genotypes for the PCA",
      minValue: 0,
      maxValue: 1,
      step: 0.01,
      value: shown,
      valueText: String,
      ends: { min: "0", max: "1" },
      onChangeEnd: (ended) => {
        ends.push(ended);
        render(ended);
      },
    });
    root.render(
      createElement(
        StrictMode,
        null,
        gate === null
          ? slider
          : createElement(RunGateProvider, { value: gate }, slider),
      ),
    );
  };
  act(() => {
    render(0.5);
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

/** Presses the thumb and drags it from 50 to `x`, without releasing it. */
function dragTo(x: number): void {
  act(() => {
    thumbOf().dispatchEvent(pointer("pointerdown", 50));
  });
  act(() => {
    window.dispatchEvent(pointer("pointermove", x));
  });
}

function release(x: number): void {
  act(() => {
    window.dispatchEvent(pointer("pointerup", x));
  });
}

/** How many times `gate` told its listeners, from now. */
function toldBy(gate: RunGate): { count: number } {
  const told = { count: 0 };
  gate.subscribe(() => {
    told.count += 1;
  });
  return told;
}

describe("NU3 D2 the slider holds a drag under way", () => {
  test("held from the first move of the pointer to the release, which gives the value before letting go", () => {
    const gate = createRunGate();
    const ends: number[] = [];
    draw(gate, ends);
    act(() => {
      thumbOf().dispatchEvent(pointer("pointerdown", 50));
    });
    expect(gate.underWay()).toBe(0);
    act(() => {
      window.dispatchEvent(pointer("pointermove", 40));
    });
    expect(gate.underWay()).toBe(1);
    act(() => {
      window.dispatchEvent(pointer("pointermove", 30));
    });
    expect(gate.underWay()).toBe(1);
    // The project's value when the gate tells that the drag ended.
    const seen: number[][] = [];
    gate.subscribe(() => {
      if (!gate.busy()) seen.push([...ends]);
    });
    release(30);
    expect(gate.underWay()).toBe(0);
    expect(ends).toHaveLength(1);
    expect(seen).toEqual([ends]);
  });

  test("a press of a key takes no hold", () => {
    const gate = createRunGate();
    const ends: number[] = [];
    draw(gate, ends);
    const told = toldBy(gate);
    act(() => {
      inputOf().focus();
    });
    for (const key of ["ArrowRight", "ArrowLeft", "PageUp", "End"]) {
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
    expect(ends).toEqual([0.51, 0.5, 0.6, 1]);
    expect(told.count).toBe(0);
  });

  test("a slider removed while dragged lets its hold go", () => {
    const gate = createRunGate();
    draw(gate, []);
    dragTo(40);
    expect(gate.underWay()).toBe(1);
    act(() => {
      root.render(null);
    });
    expect(gate.underWay()).toBe(0);
  });

  test("with no gate, as on popgen.html, a drag gives its value as before", () => {
    const ends: number[] = [];
    draw(null, ends);
    dragTo(40);
    release(40);
    expect(ends).toHaveLength(1);
  });
});
