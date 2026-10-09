// @vitest-environment jsdom
/**
 * The widgets that wait, drawn by React in jsdom
 * (docs/specs/steps/popgen2-pca.md, "While a PCA runs"): a radio group,
 * a switch, a check box, a number field and the line of a threshold
 * given a reason are marked `aria-disabled`, keep the Tab key, are
 * described by the reason, and give no change when pressed; given none,
 * they carry no such mark, as on popgen.html.
 */
import { StrictMode, act, createElement } from "react";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { Checkbox } from "./Checkbox.tsx";
import { NumberField } from "./NumberField.tsx";
import { RadioGroup } from "./RadioGroup.tsx";
import { Switch } from "./Switch.tsx";
import { ThresholdSlider } from "./ThresholdSlider.tsx";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

const REASON = "Stop the PCA to change the filters.";

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

function draw(element: ReactElement): void {
  act(() => {
    root.render(createElement(StrictMode, null, element));
  });
}

/** The words of the elements that `element`'s `aria-describedby` names,
    in its order. */
function describedWords(element: Element): string {
  return (element.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .filter((id) => id !== "")
    .map((id) => document.getElementById(id)?.textContent ?? `<${id}?>`)
    .join(" ");
}

/** The inputs drawn. */
function inputs(): HTMLInputElement[] {
  return [...container.querySelectorAll("input")];
}

describe("AP6 D3 the widgets that wait while a PCA runs", () => {
  test("a radio group: each button aria-disabled and in the order of the Tab key, the group described by the reason, a click chooses nothing", () => {
    const chosen: string[] = [];
    draw(
      createElement(RadioGroup<"pca" | "pcoa">, {
        label: "Method",
        items: [
          { id: "pca", label: "PCA of the genotypes" },
          { id: "pcoa", label: "PCoA" },
        ],
        value: "pca",
        waiting: REASON,
        onChange: (id) => chosen.push(id),
      }),
    );
    for (const input of inputs()) {
      expect(input.getAttribute("aria-disabled")).toBe("true");
      expect(input.disabled).toBe(false);
    }
    const group = container.querySelector('[role="radiogroup"]');
    if (group === null) throw new Error("no group");
    expect(describedWords(group)).toBe(REASON);
    act(() => {
      inputs()[1]?.click();
    });
    expect(chosen).toEqual([]);
  });

  test("a switch and a check box: aria-disabled, described by the reason after their own words, a click turns nothing", () => {
    const changes: boolean[] = [];
    draw(
      createElement(
        "div",
        null,
        createElement(Switch, {
          label: "Prune the variants by linkage disequilibrium (LD)",
          isSelected: true,
          waiting: REASON,
          onChange: (on) => changes.push(on),
        }),
        createElement(Checkbox, {
          label: "Leave out the variants that failed their FILTER",
          description: "The plots show every variant.",
          isSelected: true,
          waiting: REASON,
          onChange: (on) => changes.push(on),
        }),
      ),
    );
    const [toggle, box] = inputs();
    if (toggle === undefined || box === undefined) throw new Error("no inputs");
    expect(toggle.getAttribute("aria-disabled")).toBe("true");
    expect(box.getAttribute("aria-disabled")).toBe("true");
    expect(describedWords(toggle)).toBe(REASON);
    expect(describedWords(box)).toBe(`The plots show every variant. ${REASON}`);
    act(() => {
      toggle.click();
      box.click();
    });
    expect(changes).toEqual([]);
  });

  test("a number field: aria-disabled, read only, described by the reason, nothing given at an arrow key", () => {
    const given: number[] = [];
    draw(
      createElement(NumberField, {
        label:
          "Distance within which variants are compared, in base pairs, from 1",
        value: 50_000,
        minValue: 1,
        maxValue: 1e9,
        step: 1,
        waiting: REASON,
        refusedText: () => "",
        onRefused: () => undefined,
        onChange: (value) => given.push(value),
        onSteps: (steps) => given.push(steps),
      }),
    );
    const [input] = inputs();
    if (input === undefined) throw new Error("no input");
    expect(input.getAttribute("aria-disabled")).toBe("true");
    expect(input.readOnly).toBe(true);
    expect(describedWords(input)).toBe(REASON);
    act(() => {
      input.focus();
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }),
      );
    });
    expect(given).toEqual([]);
  });

  test("the line of a threshold: its input aria-disabled and described by the reason", () => {
    draw(
      createElement(ThresholdSlider, {
        label: "Maximum proportion of missing genotypes",
        minValue: 0,
        maxValue: 0.1,
        step: 0.001,
        value: 0.1,
        valueText: "0.1",
        muted: false,
        waiting: REASON,
        onChange: () => undefined,
        onDragEnd: () => undefined,
      }),
    );
    const [input] = inputs();
    if (input === undefined) throw new Error("no input");
    expect(input.getAttribute("aria-disabled")).toBe("true");
    expect(describedWords(input)).toBe(REASON);
  });

  test("with no reason, none of them is marked", () => {
    draw(
      createElement(
        "div",
        null,
        createElement(Switch, {
          label: "Prune",
          isSelected: true,
          onChange: () => undefined,
        }),
        createElement(Checkbox, {
          label: "Leave out",
          isSelected: true,
          onChange: () => undefined,
        }),
        createElement(NumberField, {
          label: "Distance",
          value: 1,
          minValue: 1,
          maxValue: 10,
          step: 1,
          refusedText: () => "",
          onRefused: () => undefined,
          onChange: () => undefined,
        }),
        createElement(RadioGroup<"a">, {
          label: "Method",
          items: [{ id: "a", label: "A" }],
          value: "a",
          onChange: () => undefined,
        }),
      ),
    );
    for (const input of inputs()) {
      expect(input.hasAttribute("aria-disabled")).toBe(false);
      expect(describedWords(input)).toBe("");
    }
  });
});
