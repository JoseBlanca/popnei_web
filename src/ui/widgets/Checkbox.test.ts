// @vitest-environment jsdom
/**
 * The check box of the widgets drawn by React in jsdom: its sentence,
 * `description`, drawn under it and tied to its input by
 * `aria-describedby`, so that a screen reader reads it after the box's
 * name (docs/specs/steps/popgen2-filters.md, "The FILTER box"); and no
 * description without it, as the old page's box of the reading options
 * has.
 */
import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { Checkbox } from "./Checkbox.tsx";
import type { CheckboxProps } from "./Checkbox.tsx";

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

function draw(props: CheckboxProps): HTMLInputElement {
  act(() => {
    root.render(
      createElement(StrictMode, null, createElement(Checkbox, props)),
    );
  });
  const input = container.querySelector("input");
  if (input === null) throw new Error("no input drawn");
  return input;
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

describe("SF7 D1 the description of the check box", () => {
  test("is drawn under the box and named by the input's aria-describedby", () => {
    const input = draw({
      label: "Leave out the variants that failed their FILTER",
      description: "The plots show every variant, these among them.",
      isSelected: true,
      onChange: () => undefined,
    });

    expect(describedWords(input)).toBe(
      "The plots show every variant, these among them.",
    );
    // The sentence is shown, after the box and its words.
    const sentence = [...container.querySelectorAll("*")].find(
      (element) =>
        element.children.length === 0 &&
        element.textContent ===
          "The plots show every variant, these among them.",
    );
    expect(sentence).toBeDefined();
    const label = input.closest("label");
    expect(label?.textContent).toBe(
      "Leave out the variants that failed their FILTER",
    );
    expect(
      label !== null &&
        sentence !== undefined &&
        (label.compareDocumentPosition(sentence) &
          Node.DOCUMENT_POSITION_FOLLOWING) !==
          0,
    ).toBe(true);
    expect(input.checked).toBe(true);
  });

  test("without a description, the input is described by nothing", () => {
    const input = draw({
      label: "Only the variants with PASS or . in the FILTER column",
      isSelected: false,
      onChange: () => undefined,
    });

    expect(describedWords(input)).toBeNull();
    expect(container.textContent).toBe(
      "Only the variants with PASS or . in the FILTER column",
    );
  });

  test("a click calls onChange with the new state", () => {
    const changes: boolean[] = [];
    const input = draw({
      label: "Leave out the variants that failed their FILTER",
      description: "The plots show every variant, these among them.",
      isSelected: true,
      onChange: (isSelected) => {
        changes.push(isSelected);
      },
    });

    act(() => {
      input.click();
    });

    expect(changes).toEqual([false]);
  });
});
