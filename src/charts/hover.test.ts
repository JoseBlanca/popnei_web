/**
 * The point under the pointer, the lines of its tooltip and the tooltip,
 * docs/specs/charts/scatter.md, "How it is verified", "The pure
 * functions" and "The point under the pointer". jsdom lays nothing out,
 * so the tooltip's place is checked here with stubs of the sizes, and
 * the pointer itself in the browser.
 */

import { afterEach, describe, expect, test, vi } from "vitest";
import { createTooltip, nearestPoint, tooltipLines } from "./hover.ts";
import { NO_GROUP, type GroupColours, type ValueColours } from "./marks.ts";

const MINUS = "−";

describe("IP7 D1 the pieces of the scatter, the nearest point", () => {
  test("of two points at the same distance, the first in the order of the data", () => {
    expect(nearestPoint(Float32Array.from([0, 0, 2, 0]), 1, 0, 10)).toBe(0);
    expect(nearestPoint(Float32Array.from([2, 0, 0, 0]), 1, 0, 10)).toBe(0);
  });

  test("the nearer of two points within 10 pixels", () => {
    const positions = Float32Array.from([100, 100, 104, 103]);
    expect(nearestPoint(positions, 105, 105, 10)).toBe(1);
    expect(nearestPoint(positions, 99, 100, 10)).toBe(0);
  });

  test("none beyond 10 pixels, and a point at 10 is taken", () => {
    const positions = Float32Array.from([0, 0, 50, 50]);
    expect(nearestPoint(positions, 20, 0, 10)).toBeNull();
    expect(nearestPoint(positions, 10.01, 0, 10)).toBeNull();
    expect(nearestPoint(positions, 10, 0, 10)).toBe(0);
  });

  test("a NaN position never", () => {
    const positions = Float32Array.from([
      Number.NaN,
      Number.NaN,
      5,
      Number.NaN,
      8,
      0,
    ]);
    expect(nearestPoint(positions, 5, 0, 10)).toBe(2);
    expect(
      nearestPoint(Float32Array.from([Number.NaN, 0]), 0, 0, 10),
    ).toBeNull();
  });

  test("with a depth, the point nearer the camera among two at the same pixel", () => {
    const positions = Float32Array.from([40, 40, 40, 40]);
    expect(
      nearestPoint(positions, 40, 40, 10, Float32Array.from([0.3, -0.2])),
    ).toBe(1);
    expect(
      nearestPoint(positions, 40, 40, 10, Float32Array.from([-0.3, -0.2])),
    ).toBe(0);
  });

  test("a point at the pointer, of depth 0.5, rather than one 8 pixels away and nearer the camera", () => {
    const positions = Float32Array.from([48, 40, 40, 40]);
    const depth = Float32Array.from([-0.5, 0.5]);
    expect(nearestPoint(positions, 40, 40, 10, depth)).toBe(1);
  });

  test("of two points 6 and 8 pixels away, neither covering the pointer, the one at 6 whatever their depths", () => {
    const positions = Float32Array.from([48, 40, 34, 40]);
    expect(
      nearestPoint(positions, 40, 40, 10, Float32Array.from([-0.9, 0.9])),
    ).toBe(1);
    expect(
      nearestPoint(positions, 40, 40, 10, Float32Array.from([0.9, -0.9])),
    ).toBe(1);
  });

  test("positions of an odd length, or depths not one per point, are defects", () => {
    expect(() => nearestPoint(Float32Array.from([1, 2, 3]), 0, 0, 10)).toThrow(
      /popnei_web defect/,
    );
    expect(() =>
      nearestPoint(
        Float32Array.from([1, 2]),
        0,
        0,
        10,
        Float32Array.from([0, 0]),
      ),
    ).toThrow(/popnei_web defect/);
  });
});

const POPULATIONS: GroupColours = {
  kind: "groups",
  title: "Population",
  group: Uint16Array.from([0, 1, NO_GROUP]),
  names: ["P1", "P2"],
  noneName: "No population",
  highlighted: null,
};

const YEARS: ValueColours = {
  kind: "values",
  title: "Year",
  values: Float64Array.from([2019, -1.5, Number.NaN, 0.1 + 0.2]),
  noneName: "No value",
};

const AT: readonly (readonly [string, number])[] = [
  ["PC1", -0.02314],
  ["PC2", 0.01041],
];

describe("IP7 D1 the pieces of the scatter, the lines of the tooltip", () => {
  test("a point of P2: its name, its population and its coordinates with the minus sign", () => {
    const lines = tooltipLines("s001", POPULATIONS, 1, AT);
    expect(lines).toEqual([
      "s001",
      "Population: P2",
      `PC1 ${MINUS}0.0231, PC2 0.0104`,
    ]);
    const place = lines[2] ?? "";
    expect(place.codePointAt("PC1 ".length)).toBe(0x2212);
    expect(place).not.toContain("-");
  });

  test("a point of no group: No population", () => {
    expect(tooltipLines("s002", POPULATIONS, 2, AT)[1]).toBe("No population");
  });

  test("a value 2019 of the column Year is Year: 2019", () => {
    expect(tooltipLines("s000", YEARS, 0, AT)[1]).toBe("Year: 2019");
  });

  test("a value of −1.5 is Year: −1.5, with the minus sign", () => {
    expect(tooltipLines("s000", YEARS, 1, AT)[1]).toBe(`Year: ${MINUS}1.5`);
  });

  test("a point with no value is No value, and a value is written to 12 significant digits", () => {
    expect(tooltipLines("s000", YEARS, 2, AT)[1]).toBe("No value");
    expect(tooltipLines("s000", YEARS, 3, AT)[1]).toBe("Year: 0.3");
  });

  test("a name with markup is kept as it is, for textContent", () => {
    expect(tooltipLines("<b>s0</b>", POPULATIONS, 0, AT)[0]).toBe("<b>s0</b>");
  });

  test("a point with no colour is a defect", () => {
    expect(() => tooltipLines("s9", POPULATIONS, 3, AT)).toThrow(
      /popnei_web defect/,
    );
    expect(() => tooltipLines("s9", YEARS, 4, AT)).toThrow(/popnei_web defect/);
  });
});

/**
 * A tooltip of 80.5 by 40.5 pixels, as a browser lays out its text, to the
 * fraction of a pixel that offsetWidth and offsetHeight round away.
 */
function sizedTooltip(): void {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
    DOMRect.fromRect({ width: 80.5, height: 40.5 }),
  );
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(81);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(41);
}

/** An element of 300 by 200 pixels, and a tooltip of 80.5 by 40.5, as a browser would lay them out. */
function laidOut(): HTMLDivElement {
  const element = document.createElement("div");
  vi.spyOn(element, "clientWidth", "get").mockReturnValue(300);
  vi.spyOn(element, "clientHeight", "get").mockReturnValue(200);
  sizedTooltip();
  document.body.append(element);
  return element;
}

function tooltipOf(element: HTMLElement): HTMLDivElement | null {
  return element.querySelector<HTMLDivElement>("div.chart-tooltip");
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe("IP7 D1 the pieces of the scatter, the tooltip", () => {
  test("made at the first show, hidden from a screen reader, its lines as text", () => {
    const element = laidOut();
    const tooltip = createTooltip(
      element,
      () => undefined,
      () => false,
    );
    expect(tooltipOf(element)).toBeNull();
    tooltip.show(["<img src=x onerror=alert(1)>", "Population: P1"], 10, 10);
    const box = tooltipOf(element);
    expect(box?.getAttribute("aria-hidden")).toBe("true");
    expect(box?.hidden).toBe(false);
    expect(box?.querySelector("img")).toBeNull();
    expect([...(box?.children ?? [])].map((row) => row.textContent)).toEqual([
      "<img src=x onerror=alert(1)>",
      "Population: P1",
    ]);
    tooltip.destroy();
  });

  test("placed 6 pixels right of and below the point, and on its left or above where it would leave the element", () => {
    const element = laidOut();
    const tooltip = createTooltip(
      element,
      () => undefined,
      () => false,
    );
    tooltip.show(["s0"], 100, 50);
    const box = tooltipOf(element);
    expect([box?.style.left, box?.style.top]).toEqual(["106px", "56px"]);
    expect(box?.dataset["near"]).toBe("top-left");
    tooltip.show(["s0"], 250, 170);
    // Its corner 6 pixels from the point to the fraction of a pixel, so
    // that a pointer going straight to it stays within 10 of the point.
    expect([box?.style.left, box?.style.top]).toEqual(["163.5px", "123.5px"]);
    expect(box?.dataset["near"]).toBe("bottom-right");
    tooltip.show(["s0"], 250, 50);
    expect(box?.dataset["near"]).toBe("top-right");
    tooltip.show(["s0"], 100, 170);
    expect(box?.dataset["near"]).toBe("bottom-left");
    tooltip.destroy();
  });

  test('Escape hides it and calls onDismiss with "escape", and neither stops nor prevents the key', () => {
    const element = laidOut();
    const onDismiss = vi.fn();
    const tooltip = createTooltip(element, onDismiss, () => false);
    const field = document.createElement("input");
    document.body.append(field);
    const heard = vi.fn();
    field.addEventListener("keydown", heard);
    tooltip.show(["s0"], 10, 10);
    // Added after the tooltip's own listener, on the document and beyond
    // it, so that a key the tooltip stopped would not reach them.
    document.addEventListener("keydown", heard);
    window.addEventListener("keydown", heard);
    const other = new KeyboardEvent("keydown", {
      key: "a",
      bubbles: true,
      cancelable: true,
    });
    field.dispatchEvent(other);
    expect(onDismiss).not.toHaveBeenCalled();
    expect(tooltipOf(element)?.hidden).toBe(false);
    const escape = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    field.dispatchEvent(escape);
    expect(tooltipOf(element)?.hidden).toBe(true);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledWith("escape");
    expect(escape.defaultPrevented).toBe(false);
    expect(heard).toHaveBeenCalledTimes(6);
    document.removeEventListener("keydown", heard);
    window.removeEventListener("keydown", heard);
    tooltip.destroy();
  });

  test("Escape is listened for on the document only while the tooltip is shown", () => {
    const element = laidOut();
    const onDismiss = vi.fn();
    const tooltip = createTooltip(element, onDismiss, () => false);
    const added = vi.spyOn(document, "addEventListener");
    const removed = vi.spyOn(document, "removeEventListener");
    tooltip.show(["s0"], 10, 10);
    tooltip.show(["s1"], 20, 20);
    expect(added.mock.calls.map(([type]) => type)).toEqual(["keydown"]);
    tooltip.hide();
    expect(removed.mock.calls.map(([type]) => type)).toEqual(["keydown"]);
    expect(removed.mock.calls[0]?.[1]).toBe(added.mock.calls[0]?.[1]);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onDismiss).not.toHaveBeenCalled();
    tooltip.destroy();
  });

  test("holds its own nodes and no other", () => {
    const element = laidOut();
    const tooltip = createTooltip(
      element,
      () => undefined,
      () => false,
    );
    expect(tooltip.holds(element)).toBe(false);
    tooltip.show(["s0", "P1"], 10, 10);
    const box = tooltipOf(element);
    if (box === null) throw new Error("no tooltip");
    expect(tooltip.holds(box)).toBe(true);
    expect(tooltip.holds(box.firstChild)).toBe(true);
    expect(tooltip.holds(element)).toBe(false);
    expect(tooltip.holds(null)).toBe(false);
    tooltip.destroy();
  });

  test('a mouse that leaves it onto the element that takes the pointer keeps it; onto an axis or out of the plot, it hides and calls onDismiss with "leave"; a touch keeps it', () => {
    const element = laidOut();
    const overlay = document.createElement("span");
    const axis = document.createElement("span");
    element.append(overlay, axis);
    const onDismiss = vi.fn();
    const tooltip = createTooltip(
      element,
      onDismiss,
      (target) => target === overlay,
    );
    const leave = (
      pointerType: string,
      relatedTarget: EventTarget | null,
    ): void => {
      const event = new Event("pointerleave");
      Object.defineProperties(event, {
        pointerType: { value: pointerType },
        relatedTarget: { value: relatedTarget },
      });
      tooltipOf(element)?.dispatchEvent(event);
    };
    tooltip.show(["s0"], 10, 10);
    leave("touch", axis);
    expect(tooltipOf(element)?.hidden).toBe(false);
    leave("mouse", overlay);
    expect(tooltipOf(element)?.hidden).toBe(false);
    expect(onDismiss).not.toHaveBeenCalled();
    leave("pen", axis);
    expect(tooltipOf(element)?.hidden).toBe(true);
    expect(onDismiss.mock.calls).toEqual([["leave"]]);
    tooltip.show(["s0"], 10, 10);
    leave("mouse", document.body);
    expect(tooltipOf(element)?.hidden).toBe(true);
    leave("mouse", null);
    expect(onDismiss.mock.calls).toEqual([["leave"], ["leave"]]);
    tooltip.destroy();
  });

  test("where it fits on neither side, it lies against the left and the top edges of the element", () => {
    const element = document.createElement("div");
    vi.spyOn(element, "clientWidth", "get").mockReturnValue(100);
    vi.spyOn(element, "clientHeight", "get").mockReturnValue(50);
    sizedTooltip();
    document.body.append(element);
    const tooltip = createTooltip(
      element,
      () => undefined,
      () => false,
    );
    tooltip.show(["s0"], 50, 25);
    const box = tooltipOf(element);
    expect([box?.style.left, box?.style.top]).toEqual(["0px", "0px"]);
    tooltip.destroy();
  });

  test("destroy removes the div and the listener of Escape, and is safe twice", () => {
    const element = laidOut();
    const onDismiss = vi.fn();
    const tooltip = createTooltip(element, onDismiss, () => false);
    tooltip.show(["s0"], 10, 10);
    tooltip.destroy();
    expect(element.childElementCount).toBe(0);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onDismiss).not.toHaveBeenCalled();
    tooltip.destroy();
    expect(element.childElementCount).toBe(0);
  });
});
