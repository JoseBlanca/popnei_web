// @vitest-environment jsdom
/**
 * The options of the number box that popgen2.html alone uses, drawn by
 * React in jsdom (docs/specs/steps/popgen2-filters.md, "The number box"):
 * `onEmptied`, called when an emptied box is committed by Enter, Tab or
 * the loss of the focus, after which the box shows the number the page
 * gives; `hiddenDescription`, read through `aria-describedby` and not
 * drawn; `muted`, the grey of the number; and `onSteps`, through which the
 * page chooses the number an arrow key gives. Without the options the box
 * is as on the old page: an emptied box gives nothing and shows its number
 * again.
 */
import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { NumberField } from "./NumberField.tsx";
import type { NumberFieldProps } from "./NumberField.tsx";

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

/** What a test records of the calls of the box. */
interface Calls {
  readonly changes: number[];
  readonly steps: number[];
  emptied: number;
}

/** The props of a threshold of the missing rate at `value`, whose calls
    go to `calls`, with `extra` over them. */
function thresholdProps(
  value: number,
  calls: Calls,
  extra: Partial<NumberFieldProps> = {},
): NumberFieldProps {
  return {
    label: "Missing rate max: maximum missing rate",
    value,
    minValue: 0,
    maxValue: 1,
    step: 0.001,
    refusedText: (_refusal, kept) =>
      `refused; the threshold stays ${String(kept)}.`,
    onRefused: () => undefined,
    onChange: (changed) => {
      calls.changes.push(changed);
    },
    ...extra,
  };
}

function newCalls(): Calls {
  return { changes: [], steps: [], emptied: 0 };
}

function draw(props: NumberFieldProps): HTMLInputElement {
  act(() => {
    root.render(
      createElement(StrictMode, null, createElement(NumberField, props)),
    );
  });
  const input = container.querySelector("input");
  if (input === null) throw new Error("no input drawn");
  return input;
}

/** Puts the focus on `input`, as a click or the Tab key would. */
function focus(input: HTMLInputElement): void {
  act(() => {
    input.focus();
  });
}

/** Deletes the whole text of `input`, as a selection and Backspace
    would. */
function empty(input: HTMLInputElement): void {
  act(() => {
    input.setSelectionRange(0, input.value.length);
    input.dispatchEvent(
      new InputEvent("beforeinput", {
        inputType: "deleteContentBackward",
        bubbles: true,
        cancelable: true,
      }),
    );
    // The setter of the prototype, which React's tracker of the value
    // does not see, so that React takes the text for one the user deleted.
    // eslint-disable-next-line @typescript-eslint/unbound-method -- called below with the input, by call
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(input, "");
    input.dispatchEvent(
      new InputEvent("input", {
        inputType: "deleteContentBackward",
        bubbles: true,
      }),
    );
  });
}

function press(
  input: HTMLInputElement,
  key: string,
  modifiers: { readonly ctrlKey?: boolean } = {},
): void {
  act(() => {
    input.dispatchEvent(
      new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
        ...modifiers,
      }),
    );
    input.dispatchEvent(
      new KeyboardEvent("keyup", { key, bubbles: true, ...modifiers }),
    );
  });
}

function blur(input: HTMLInputElement): void {
  act(() => {
    input.blur();
  });
}

/** The words of the elements that `input`'s `aria-describedby` names, in
    its order, or null when it names none. */
function describedWords(input: HTMLInputElement): string | null {
  const ids = input.getAttribute("aria-describedby");
  if (ids === null) return null;
  return ids
    .split(" ")
    .map((id) => document.getElementById(id)?.textContent ?? `<${id}?>`)
    .join(" ");
}

describe("SF8 D1 the options of the number box", () => {
  test("an emptied box with onEmptied calls it at Enter, gives no number, and shows the number the page then gives", () => {
    const calls = newCalls();
    const props = thresholdProps(0.1, calls, {
      onEmptied: () => {
        calls.emptied += 1;
      },
    });
    const input = draw(props);
    focus(input);
    empty(input);
    expect(input.value).toBe("");

    press(input, "Enter");

    expect(calls.emptied).toBe(1);
    expect(calls.changes).toEqual([]);
    // React Aria put back the number it held, until the page gives 1.
    expect(input.value).toBe("0.1");
    draw({ ...props, value: 1 });
    expect(input.value).toBe("1");
  });

  test("an emptied box with onEmptied calls it once at Tab, and once when it loses the focus", () => {
    const calls = newCalls();
    const input = draw(
      thresholdProps(0.1, calls, {
        onEmptied: () => {
          calls.emptied += 1;
        },
      }),
    );
    focus(input);
    empty(input);
    press(input, "Tab");
    blur(input);
    expect(calls.emptied).toBe(1);

    focus(input);
    empty(input);
    blur(input);
    expect(calls.emptied).toBe(2);
    expect(calls.changes).toEqual([]);
  });

  test("a box that is off, emptied and committed, calls onEmptied and shows 1 again", () => {
    const calls = newCalls();
    const input = draw(
      thresholdProps(1, calls, {
        onEmptied: () => {
          calls.emptied += 1;
        },
      }),
    );
    focus(input);
    empty(input);
    press(input, "Enter");

    expect(calls.emptied).toBe(1);
    expect(input.value).toBe("1");
  });

  test("Escape and Ctrl+Z in an emptied box put back its number, with no call", () => {
    const calls = newCalls();
    const input = draw(
      thresholdProps(0.1, calls, {
        onEmptied: () => {
          calls.emptied += 1;
        },
      }),
    );
    focus(input);
    empty(input);
    press(input, "Escape");
    expect(input.value).toBe("0.1");

    empty(input);
    press(input, "z", { ctrlKey: true });
    expect(input.value).toBe("0.1");

    blur(input);
    expect(calls.emptied).toBe(0);
    expect(calls.changes).toEqual([]);
  });

  test("without onEmptied, an emptied box gives nothing at Enter, Tab or the loss of the focus, and shows its number again", () => {
    const calls = newCalls();
    const input = draw(thresholdProps(0.1, calls));
    focus(input);
    empty(input);
    press(input, "Enter");
    expect(input.value).toBe("0.1");

    empty(input);
    press(input, "Tab");
    blur(input);
    expect(input.value).toBe("0.1");

    focus(input);
    empty(input);
    blur(input);
    expect(input.value).toBe("0.1");
    expect(calls.changes).toEqual([]);
  });

  test("in an empty box the arrow keys and Page Up and Down do nothing, with onSteps and onEmptied", () => {
    const calls = newCalls();
    const input = draw(
      thresholdProps(1, calls, {
        onEmptied: () => {
          calls.emptied += 1;
        },
        onSteps: (steps) => {
          calls.steps.push(steps);
        },
      }),
    );
    focus(input);
    empty(input);
    for (const key of ["ArrowUp", "ArrowDown", "PageUp", "PageDown"]) {
      press(input, key);
    }

    expect(input.value).toBe("");
    expect(calls.steps).toEqual([]);
    expect(calls.changes).toEqual([]);
    expect(calls.emptied).toBe(0);
  });

  test("from a box at 1, Down and Page Down give the page the steps, which chooses the number, and the box gives none of its own", () => {
    const calls = newCalls();
    const input = draw(
      thresholdProps(1, calls, {
        onSteps: (steps) => {
          calls.steps.push(steps);
        },
      }),
    );
    focus(input);
    press(input, "ArrowDown");
    press(input, "PageDown");
    press(input, "ArrowUp");

    expect(calls.steps).toEqual([-1, -10, 1]);
    expect(calls.changes).toEqual([]);
    expect(input.value).toBe("1");
  });

  test("hiddenDescription is read through aria-describedby, after the other descriptions, and is not drawn", () => {
    const calls = newCalls();
    const input = draw(
      thresholdProps(1, calls, {
        hiddenDescription: "This filter removes nothing.",
      }),
    );

    expect(describedWords(input)).toBe("This filter removes nothing.");
    const hidden = document.getElementById(
      input.getAttribute("aria-describedby") ?? "",
    );
    // Drawn with the class that keeps it off the screen, as the rest of
    // a label shown in part.
    expect(hidden?.className).toMatch(/visuallyHidden/);

    // After the line under the box and the elements of describedBy.
    const elsewhere = document.createElement("p");
    elsewhere.id = "elsewhere";
    elsewhere.textContent = "A count elsewhere.";
    document.body.append(elsewhere);
    draw(
      thresholdProps(1, calls, {
        describedBy: "elsewhere",
        description: "A line under the box.",
        hiddenDescription: "This filter removes nothing.",
      }),
    );
    expect(describedWords(input)).toBe(
      "A count elsewhere. A line under the box. This filter removes nothing.",
    );
    elsewhere.remove();
  });

  test("without hiddenDescription nor muted the box is described by nothing and drawn in the colour of the text", () => {
    const calls = newCalls();
    const input = draw(thresholdProps(0.05, calls));

    expect(describedWords(input)).toBeNull();
    expect(input.hasAttribute("data-muted")).toBe(false);
  });

  test("muted draws the number in the grey, with the box still enabled", () => {
    const calls = newCalls();
    const input = draw(thresholdProps(1, calls, { muted: true }));

    expect(input.hasAttribute("data-muted")).toBe(true);
    expect(input.disabled).toBe(false);
  });
});
