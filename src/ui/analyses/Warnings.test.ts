// @vitest-environment jsdom
/**
 * The list of the warnings of a result when several warnings have one
 * code, as the LD decay gives one `noPairs` or `halfDistBelowPairs` for
 * each population (docs/specs/analyses/ldDecay.md, "The warnings"): React
 * tells the items of a list apart by their keys, and two items of one key
 * are drawn wrong when the list changes, one kept where the other should
 * be.
 */
import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { Warning } from "../../core/store.ts";
import { SPECTRUM_WARNING_ATTRIBUTE, Warnings } from "./Warnings.tsx";

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
  vi.restoreAllMocks();
});

/** Draws the warnings `warnings`. */
function draw(warnings: readonly Warning[]): void {
  act(() => {
    root.render(
      createElement(StrictMode, null, createElement(Warnings, { warnings })),
    );
  });
}

/** The texts of the items of the list, in their order. */
function items(): string[] {
  return [...container.querySelectorAll("li")].map((item) => item.textContent);
}

/** A warning of the LD decay's `halfDistBelowPairs` for the population
    `pop`. */
function below(pop: string): Warning {
  return {
    code: "halfDistBelowPairs",
    text: `The curve of ${pop} falls to half within 1 bp.`,
  };
}

describe("PA2 D5 the warnings of one code, one per population", () => {
  test("two warnings of one code are two items, with no warning of React, and a list that changes draws the new texts in their order", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    draw([below("p0"), below("p2")]);
    expect(items()).toStrictEqual([
      "Warning: The curve of p0 falls to half within 1 bp.",
      "Warning: The curve of p2 falls to half within 1 bp.",
    ]);
    draw([below("p2"), below("p1"), below("p0")]);
    expect(items()).toStrictEqual([
      "Warning: The curve of p2 falls to half within 1 bp.",
      "Warning: The curve of p1 falls to half within 1 bp.",
      "Warning: The curve of p0 falls to half within 1 bp.",
    ]);
    draw([below("p1")]);
    expect(items()).toStrictEqual([
      "Warning: The curve of p1 falls to half within 1 bp.",
    ]);
    expect(consoleError).not.toHaveBeenCalled();
    expect(container.querySelector("h3")?.textContent).toBe("1 warning");
  });
});

describe("second review of round 1: a warning said elsewhere in the result", () => {
  test("two warnings and the spectrum's: the heading counts 3, the last item says the spectrum's warning with its link, and pressing the link gives the focus to the warning beside the list", () => {
    act(() => {
      root.render(
        createElement(
          StrictMode,
          null,
          createElement(
            "div",
            null,
            createElement(Warnings, {
              warnings: [below("p0"), below("p2")],
              elsewhere: {
                text: "The spectrum has a warning.",
                link: "Go to the warning of the spectrum",
                target: SPECTRUM_WARNING_ATTRIBUTE,
              },
            }),
            createElement(
              "p",
              { tabIndex: -1, [SPECTRUM_WARNING_ATTRIBUTE]: "" },
              "The warning of the spectrum.",
            ),
          ),
        ),
      );
    });
    expect(container.querySelector("h3")?.textContent).toBe("3 warnings");
    expect(items()).toStrictEqual([
      "Warning: The curve of p0 falls to half within 1 bp.",
      "Warning: The curve of p2 falls to half within 1 bp.",
      "Warning: The spectrum has a warning. Go to the warning of the spectrum",
    ]);
    const link = container.querySelector(
      "li:last-child [role='link'], li:last-child a",
    );
    if (!(link instanceof HTMLElement)) throw new Error("No link.");
    expect(link.textContent).toBe("Go to the warning of the spectrum");
    act(() => {
      link.click();
    });
    expect(document.activeElement).toBe(
      container.querySelector(`[${SPECTRUM_WARNING_ATTRIBUTE}]`),
    );
  });
});
