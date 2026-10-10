// @vitest-environment jsdom
/**
 * The select, drawn by React in jsdom, and the change under way it holds
 * on the gate of popgen2.html while its list is open
 * (docs/specs/steps/popgen2-pca.md, "The PCA calculated again by
 * itself"): from its opening to its closing, by a choice or by Escape, or
 * until it leaves the page; none for a key that chooses on the closed
 * list, which is a change at once; and none on popgen.html, which gives no
 * gate.
 */
import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { RunGateProvider } from "../variants/runGate.tsx";
import { createRunGate } from "../variants/thresholdRun.ts";
import type { RunGate } from "../variants/thresholdRun.ts";
import { Select } from "./Select.tsx";

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

type Method = "pca" | "pcoa" | "mds";

/** Draws the select of the method at PCA, under `gate` when one is given,
    as popgen2.html does, and with none, as popgen.html; each choice is
    kept in `chosen` and given back. */
function draw(gate: RunGate | null, chosen: Method[]): void {
  const render = (value: Method): void => {
    const select = createElement(Select<Method>, {
      label: "Method",
      items: [
        { id: "pca", label: "PCA" },
        { id: "pcoa", label: "PCoA" },
        { id: "mds", label: "MDS" },
      ],
      value,
      onChange: (id) => {
        chosen.push(id);
        render(id);
      },
    });
    root.render(
      createElement(
        StrictMode,
        null,
        gate === null
          ? select
          : createElement(RunGateProvider, { value: gate }, select),
      ),
    );
  };
  act(() => {
    render("pca");
  });
}

function buttonOf(): HTMLButtonElement {
  const button = container.querySelector("button");
  if (button === null) throw new Error("no button drawn");
  return button;
}

function listOpen(): boolean {
  return document.querySelector('[role="listbox"]') !== null;
}

/** Presses `key` on the element with the focus. */
function press(key: string): void {
  const target = document.activeElement ?? document.body;
  act(() => {
    target.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
    );
  });
  act(() => {
    target.dispatchEvent(
      new KeyboardEvent("keyup", { key, bubbles: true, cancelable: true }),
    );
  });
}

/** Opens the list from the keyboard, the Down arrow on the button. */
function open(): void {
  act(() => {
    buttonOf().focus();
  });
  press("ArrowDown");
  expect(listOpen()).toBe(true);
}

describe("NU3 D2 the select holds while its list is open", () => {
  test("held from the opening to Escape", () => {
    const gate = createRunGate();
    draw(gate, []);
    expect(gate.underWay()).toBe(0);
    open();
    expect(gate.underWay()).toBe(1);
    press("Escape");
    expect(listOpen()).toBe(false);
    expect(gate.underWay()).toBe(0);
  });

  test("held from the opening to a choice, which is given before the hold goes", () => {
    const gate = createRunGate();
    const chosen: Method[] = [];
    draw(gate, chosen);
    open();
    const seen: Method[][] = [];
    gate.subscribe(() => {
      if (!gate.busy()) seen.push([...chosen]);
    });
    press("ArrowDown");
    press("Enter");
    expect(listOpen()).toBe(false);
    expect(chosen).toEqual(["pcoa"]);
    expect(gate.underWay()).toBe(0);
    expect(seen).toEqual([["pcoa"]]);
  });

  test("a key that chooses on the closed list takes no hold", () => {
    const gate = createRunGate();
    const chosen: Method[] = [];
    draw(gate, chosen);
    let told = 0;
    gate.subscribe(() => {
      told += 1;
    });
    act(() => {
      buttonOf().focus();
    });
    press("ArrowRight");
    expect(chosen).toEqual(["pcoa"]);
    expect(listOpen()).toBe(false);
    expect(told).toBe(0);
  });

  test("a select removed while its list is open lets its hold go", () => {
    const gate = createRunGate();
    draw(gate, []);
    open();
    expect(gate.underWay()).toBe(1);
    act(() => {
      root.render(null);
    });
    expect(gate.underWay()).toBe(0);
  });

  test("with no gate, as on popgen.html, the list opens and chooses as before", () => {
    const chosen: Method[] = [];
    draw(null, chosen);
    open();
    press("ArrowDown");
    press("Enter");
    expect(chosen).toEqual(["pcoa"]);
  });
});
