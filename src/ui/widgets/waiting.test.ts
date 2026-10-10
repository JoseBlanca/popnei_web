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
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { Checkbox } from "./Checkbox.tsx";
import { NumberField } from "./NumberField.tsx";
import { RadioGroup } from "./RadioGroup.tsx";
import { Select } from "./Select.tsx";
import { Slider } from "./Slider.tsx";
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

  test("the line of a threshold that waits gives no change at the arrow keys, Page Up, Page Down, Home and End, so that no run of the keys starts while a PCA runs", () => {
    const moves: number[] = [];
    draw(
      createElement(ThresholdSlider, {
        label: "Maximum proportion of missing genotypes",
        minValue: 0,
        maxValue: 0.1,
        step: 0.001,
        value: 0.05,
        valueText: "0.05",
        muted: false,
        waiting: REASON,
        onChange: (value) => moves.push(value),
        onDragEnd: (value) => moves.push(value),
      }),
    );
    const [input] = inputs();
    if (input === undefined) throw new Error("no input");
    act(() => {
      input.focus();
    });
    for (const key of [
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "PageUp",
      "PageDown",
      "Home",
      "End",
    ]) {
      act(() => {
        input.dispatchEvent(
          new KeyboardEvent("keydown", { key, bubbles: true }),
        );
        input.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true }));
      });
    }
    expect(moves).toEqual([]);
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

/** The words of the tooltip shown, or null when none is. */
function tooltipShown(): string | null {
  const tips = document.querySelectorAll('[role="tooltip"]');
  if (tips.length > 1) throw new Error(`${String(tips.length)} tooltips shown`);
  return tips[0]?.textContent ?? null;
}

/** The element of `container` whose own words are `words`, the visible
    words of a control. */
function wordsOf(words: string): HTMLElement {
  const found = [...container.querySelectorAll<HTMLElement>("*")].find(
    (element) =>
      [...element.childNodes].some(
        (node) =>
          node.nodeType === Node.TEXT_NODE && node.textContent === words,
      ),
  );
  if (found === undefined) throw new Error(`no element with ${words}`);
  return found;
}

/** The four controls that wait, each given the reason or not, drawn one
    at a time, with the words of each that the pointer or a press
    reaches. */
const CONTROLS: readonly {
  readonly name: string;
  readonly words: string;
  readonly draw: (waiting: string | null) => ReactElement;
}[] = [
  {
    name: "a switch",
    words: "Prune",
    draw: (waiting) =>
      createElement(Switch, {
        label: "Prune",
        isSelected: true,
        waiting,
        onChange: () => undefined,
      }),
  },
  {
    name: "a check box",
    words: "Leave out",
    draw: (waiting) =>
      createElement(Checkbox, {
        label: "Leave out",
        isSelected: true,
        waiting,
        onChange: () => undefined,
      }),
  },
  {
    name: "a radio group",
    words: "PCoA",
    draw: (waiting) =>
      createElement(RadioGroup<"pca" | "pcoa">, {
        label: "Method",
        items: [
          { id: "pca", label: "PCA" },
          { id: "pcoa", label: "PCoA" },
        ],
        value: "pca",
        waiting,
        onChange: () => undefined,
      }),
  },
  {
    name: "a slider",
    words: "Maximum MAF",
    draw: (waiting) =>
      createElement(Slider, {
        label: "Maximum MAF",
        minValue: 0.5,
        maxValue: 0.95,
        step: 0.01,
        value: 0.9,
        valueText: String,
        ends: { min: "0.5", max: "0.95" },
        waiting,
        onChange: () => undefined,
      }),
  },
  {
    name: "a number field",
    words: "Distance",
    draw: (waiting) =>
      createElement(NumberField, {
        label: "Distance",
        value: 50_000,
        minValue: 1,
        maxValue: 1e9,
        step: 1,
        waiting,
        refusedText: () => "",
        onRefused: () => undefined,
        onChange: () => undefined,
      }),
  },
];

describe("AP6 D3 the reason of a control that waits, on the mouse, a press and the focus", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  for (const control of CONTROLS) {
    test(`${control.name}: a click on its words shows the reason, which Escape hides`, () => {
      draw(control.draw(REASON));
      expect(tooltipShown()).toBeNull();
      act(() => {
        wordsOf(control.words).click();
      });
      expect(tooltipShown()).toBe(REASON);
      act(() => {
        document.activeElement?.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
      });
      expect(tooltipShown()).toBeNull();
    });

    test(`${control.name}: the mouse resting on its words shows the reason, and leaving them hides it`, () => {
      vi.useFakeTimers();
      draw(control.draw(REASON));
      const words = wordsOf(control.words);
      act(() => {
        words.dispatchEvent(
          new PointerEvent("pointerover", {
            bubbles: true,
            pointerType: "mouse",
          }),
        );
      });
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(tooltipShown()).toBe(REASON);
      act(() => {
        words.dispatchEvent(
          new PointerEvent("pointerout", {
            bubbles: true,
            pointerType: "mouse",
          }),
        );
      });
      act(() => {
        vi.advanceTimersByTime(1_000);
      });
      expect(tooltipShown()).toBeNull();
    });

    test(`${control.name}: the focus in it shows the reason, kept while it stays, and gone when it leaves`, () => {
      draw(control.draw(REASON));
      const [input] = inputs();
      if (input === undefined) throw new Error("no input");
      act(() => {
        input.focus();
      });
      expect(tooltipShown()).toBe(REASON);
      act(() => {
        input.blur();
      });
      expect(tooltipShown()).toBeNull();
    });

    test(`${control.name} with no reason: a click, the mouse and the focus show nothing`, () => {
      vi.useFakeTimers();
      draw(control.draw(null));
      const words = wordsOf(control.words);
      act(() => {
        words.click();
        words.dispatchEvent(
          new PointerEvent("pointerover", {
            bubbles: true,
            pointerType: "mouse",
          }),
        );
        inputs()[0]?.focus();
      });
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(tooltipShown()).toBeNull();
    });
  }
});

/** The button of the select drawn. */
function selectButton(): HTMLButtonElement {
  const button = container.querySelector("button");
  if (button === null) throw new Error("no button");
  return button;
}

/** Draws the select of the method, given the reason or not, and keeps
    the ids it gives. */
function drawMethodSelect(waiting: string | null, chosen: string[]): void {
  draw(
    createElement(Select<"pca" | "pcoa">, {
      label: "Method",
      items: [
        { id: "pca", label: "PCA of the genotypes" },
        { id: "pcoa", label: "PCoA" },
      ],
      value: "pca",
      waiting,
      onChange: (id) => chosen.push(id),
    }),
  );
}

describe("AP10 D1 the select of the method that waits while a PCA runs", () => {
  test("its button aria-disabled and in the order of the Tab key, described by the reason; a press opens no list and a key chooses nothing", () => {
    const chosen: string[] = [];
    drawMethodSelect(REASON, chosen);
    const button = selectButton();
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.disabled).toBe(false);
    expect(describedWords(button)).toBe(REASON);
    act(() => {
      button.focus();
    });
    expect(tooltipShown()).toBe(REASON);
    for (const key of ["Enter", " ", "ArrowDown", "ArrowUp", "p"]) {
      act(() => {
        button.dispatchEvent(
          new KeyboardEvent("keydown", { key, bubbles: true }),
        );
        button.dispatchEvent(
          new KeyboardEvent("keyup", { key, bubbles: true }),
        );
      });
    }
    act(() => {
      button.click();
    });
    expect(document.querySelector('[role="listbox"]')).toBeNull();
    expect(chosen).toEqual([]);
    expect(tooltipShown()).toBe(REASON);
  });

  test("given the reason after it was drawn without one, as when a PCA starts, ArrowRight, ArrowLeft and the letters p, c and o typed choose nothing", () => {
    for (const value of ["pca", "pcoa"] as const) {
      const chosen: string[] = [];
      for (const waiting of [null, REASON]) {
        draw(
          createElement(Select<"pca" | "pcoa">, {
            label: "Method",
            items: [
              { id: "pca", label: "PCA of the genotypes" },
              { id: "pcoa", label: "PCoA of the Kosman distances" },
            ],
            value,
            waiting,
            onChange: (id) => chosen.push(id),
          }),
        );
      }
      const button = selectButton();
      act(() => {
        button.focus();
      });
      for (const key of ["ArrowRight", "ArrowLeft", "p", "c", "o"]) {
        act(() => {
          button.dispatchEvent(
            new KeyboardEvent("keydown", { key, bubbles: true }),
          );
          button.dispatchEvent(
            new KeyboardEvent("keyup", { key, bubbles: true }),
          );
        });
      }
      expect(chosen).toEqual([]);
    }
  });

  test("with a description, waiting: its button described by the description and the reason", () => {
    draw(
      createElement(Select<"pca" | "pcoa">, {
        label: "Method",
        items: [
          { id: "pca", label: "PCA of the genotypes" },
          { id: "pcoa", label: "PCoA of the Kosman distances" },
        ],
        value: "pca",
        description: "The PCoA suits data with many missing genotypes.",
        waiting: REASON,
        onChange: () => undefined,
      }),
    );
    act(() => {
      selectButton().focus();
    });
    expect(describedWords(selectButton())).toBe(
      `The PCoA suits data with many missing genotypes. ${REASON}`,
    );
  });

  test("its list open when it begins to wait is closed, and stays closed when the wait ends", () => {
    const chosen: string[] = [];
    drawMethodSelect(null, chosen);
    act(() => {
      selectButton().focus();
      selectButton().dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
      );
    });
    expect(document.querySelector('[role="listbox"]')).not.toBeNull();
    drawMethodSelect(REASON, chosen);
    expect(document.querySelector('[role="listbox"]')).toBeNull();
    drawMethodSelect(null, chosen);
    expect(document.querySelector('[role="listbox"]')).toBeNull();
    expect(chosen).toEqual([]);
  });

  test("with no reason, its button is not marked, and Enter opens its list", () => {
    const chosen: string[] = [];
    drawMethodSelect(null, chosen);
    const button = selectButton();
    expect(button.hasAttribute("aria-disabled")).toBe(false);
    expect(describedWords(button)).toBe("");
    act(() => {
      button.focus();
      button.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
      );
    });
    expect(document.querySelector('[role="listbox"]')).not.toBeNull();
  });
});

/** Draws the slider of the PCA's own missing data, given the reason or
    not, and keeps the values it gives at the end of a move. */
function drawSlider(
  waiting: string | null,
  given: number[],
  value = 0.05,
): HTMLInputElement {
  draw(
    createElement(Slider, {
      label: "Maximum proportion of missing genotypes for the PCA",
      minValue: 0,
      maxValue: 0.1,
      step: 0.001,
      value,
      valueText: (value) =>
        value >= 0.1 ? "0.1, as in the Variants tab" : String(value),
      ends: { min: "0", max: "0.1" },
      waiting,
      onChange: (value) => given.push(value),
    }),
  );
  const [input] = inputs();
  if (input === undefined) throw new Error("no input");
  return input;
}

describe("AP10 D2 the slider of a filter of the PCA's own", () => {
  test("its name and its value drawn, the value for a screen reader the same words; an arrow key gives the value a step away", () => {
    const given: number[] = [];
    const input = drawSlider(null, given);
    expect(container.textContent).toContain(
      "Maximum proportion of missing genotypes for the PCA",
    );
    expect(container.querySelector("output")?.textContent).toBe("0.05");
    expect(input.getAttribute("aria-valuetext")).toBe("0.05");
    expect(input.hasAttribute("aria-disabled")).toBe(false);
    act(() => {
      input.focus();
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
      input.dispatchEvent(
        new KeyboardEvent("keyup", { key: "ArrowRight", bubbles: true }),
      );
    });
    expect(given).toHaveLength(1);
    expect(given[0]).toBeCloseTo(0.051, 10);
  });

  test("the words of its two ends drawn under its track, hidden from a screen reader", () => {
    drawSlider(null, []);
    const ends = container.querySelector('[aria-hidden="true"]');
    expect(ends?.textContent).toBe("00.1");
    expect([...(ends?.children ?? [])].map((end) => end.textContent)).toEqual([
      "0",
      "0.1",
    ]);
  });

  test("a press on the thumb with no move gives no value", () => {
    const given: number[] = [];
    const input = drawSlider(null, given);
    const thumb = input.parentElement;
    if (thumb === null) throw new Error("no thumb");
    const pointer = {
      bubbles: true,
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
      clientX: 10,
      clientY: 10,
    };
    act(() => {
      thumb.dispatchEvent(new PointerEvent("pointerdown", pointer));
    });
    act(() => {
      thumb.dispatchEvent(new PointerEvent("pointerup", pointer));
    });
    expect(given).toEqual([]);
  });

  test("a change of its input that comes with no drag and no key, as a screen reader of a phone makes, gives its value once, and the value shown is the one given", () => {
    const given: number[] = [];
    const input = drawSlider(null, given);
    // React reads the value through the setter of the prototype, which
    // the value written on the element itself would pass by.
    const prototype = Object.getPrototypeOf(input) as object;
    act(() => {
      Reflect.set(prototype, "value", "0.06", input);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(given).toEqual([0.06]);
    // The screen was not given the value back: it shows the one it has.
    expect(container.querySelector("output")?.textContent).toBe("0.05");
  });

  test("with its two ends the same, a key, a press on the track and a change of its input give no value that is not a number", () => {
    const given: number[] = [];
    draw(
      createElement(Slider, {
        label: "Maximum proportion of missing genotypes for the PCA",
        minValue: 0,
        maxValue: 0,
        step: 0.001,
        value: 0,
        valueText: String,
        ends: { min: "0", max: "0" },
        onChange: (value) => given.push(value),
      }),
    );
    const [input] = inputs();
    if (input === undefined) throw new Error("no input");
    act(() => {
      input.focus();
    });
    for (const key of ["ArrowLeft", "ArrowRight", "Home", "End", "PageDown"]) {
      act(() => {
        input.dispatchEvent(
          new KeyboardEvent("keydown", { key, bubbles: true }),
        );
        input.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true }));
      });
    }
    const track = input.parentElement?.parentElement;
    if (track === null || track === undefined) throw new Error("no track");
    const pointer = {
      bubbles: true,
      pointerId: 2,
      pointerType: "mouse",
      button: 0,
      clientX: 5,
      clientY: 5,
    };
    act(() => {
      track.dispatchEvent(new PointerEvent("pointerdown", pointer));
    });
    act(() => {
      track.dispatchEvent(
        new PointerEvent("pointermove", { ...pointer, clientX: 1 }),
      );
      track.dispatchEvent(new PointerEvent("pointerup", pointer));
    });
    const prototype = Object.getPrototypeOf(input) as object;
    act(() => {
      Reflect.set(prototype, "value", "0.5", input);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(given.filter((value) => !Number.isFinite(value))).toEqual([]);
  });

  test("at its upper end, ArrowRight, End and Page Up give no value", () => {
    const given: number[] = [];
    const input = drawSlider(null, given, 0.1);
    act(() => {
      input.focus();
    });
    for (const key of ["ArrowRight", "End", "PageUp"]) {
      act(() => {
        input.dispatchEvent(
          new KeyboardEvent("keydown", { key, bubbles: true }),
        );
        input.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true }));
      });
    }
    expect(given).toEqual([]);
  });

  test("waiting: its input aria-disabled and in the order of the Tab key, described by the reason; no key gives a value", () => {
    const given: number[] = [];
    const input = drawSlider(REASON, given);
    expect(input.getAttribute("aria-disabled")).toBe("true");
    expect(input.disabled).toBe(false);
    expect(describedWords(input)).toBe(REASON);
    act(() => {
      input.focus();
    });
    expect(tooltipShown()).toBe(REASON);
    for (const key of [
      "ArrowLeft",
      "ArrowRight",
      "PageUp",
      "PageDown",
      "Home",
      "End",
    ]) {
      act(() => {
        input.dispatchEvent(
          new KeyboardEvent("keydown", { key, bubbles: true }),
        );
        input.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true }));
      });
    }
    expect(given).toEqual([]);
    expect(container.querySelector("output")?.textContent).toBe("0.05");
  });
});

describe("AP6 D3 the label of a number field that waits", () => {
  test("is marked to be drawn in the colour of a control that cannot be used, and not otherwise", () => {
    for (const waiting of [REASON, null]) {
      draw(
        createElement(NumberField, {
          label: "Distance",
          value: 1,
          minValue: 1,
          maxValue: 10,
          step: 1,
          waiting,
          refusedText: () => "",
          onRefused: () => undefined,
          onChange: () => undefined,
        }),
      );
      const label = container.querySelector("label");
      if (label === null) throw new Error("no label");
      expect(label.closest("[data-waiting]") !== null).toBe(waiting !== null);
    }
  });
});
