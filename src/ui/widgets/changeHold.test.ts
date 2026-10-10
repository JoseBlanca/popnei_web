// @vitest-environment jsdom
/**
 * The holder of the changes under way the widgets are given
 * (changeHold.ts): a widget holds through the holder it is given, the
 * gate on popgen2.html, nothing through the one of popgen.html, and a
 * widget drawn with no holder given is a defect.
 */
import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createRunGate } from "../variants/thresholdRun.ts";
import type { HoldKind } from "../variants/thresholdRun.ts";
import {
  ChangeHoldsProvider,
  HOLDS_NOTHING,
  useChangeHold,
  useHoldWhile,
} from "./changeHold.ts";
import type { ChangeHold, ChangeHolds } from "./changeHold.ts";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

let container: HTMLElement;
let root: Root;
let thrown: unknown[];

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.append(container);
  thrown = [];
  root = createRoot(container, {
    onUncaughtError: (error) => {
      thrown.push(error);
    },
  });
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

/** A widget that holds while `held`, a hold of the kind `kind` when
    given. */
function HoldsWhile({
  held,
  kind,
}: {
  readonly held: boolean;
  readonly kind?: HoldKind;
}): null {
  useHoldWhile(held, kind);
  return null;
}

/** A widget that takes a hold for its handlers, and gives it to
    `given`. */
function HoldsByHand({
  given,
}: {
  readonly given?: (hold: ChangeHold) => void;
}): null {
  const hold = useChangeHold();
  given?.(hold);
  return null;
}

/** Draws `widget` under `holds` when one is given, and with no holder
    otherwise. */
function draw(widget: React.ReactElement, holds: ChangeHolds | null): void {
  act(() => {
    root.render(
      createElement(
        StrictMode,
        null,
        holds === null
          ? widget
          : createElement(ChangeHoldsProvider, { value: holds }, widget),
      ),
    );
  });
}

describe("NU3 the holder of the changes under way", () => {
  test("a widget holds through the gate given as its holder", () => {
    const gate = createRunGate();
    draw(createElement(HoldsWhile, { held: true }), gate);
    expect(gate.underWay()).toBe(1);
    draw(createElement(HoldsWhile, { held: false }), gate);
    expect(gate.underWay()).toBe(0);
  });

  test("a hold of the download held through the holder is of its kind, and a widget's with no kind a control's", () => {
    const gate = createRunGate();
    draw(createElement(HoldsWhile, { held: true, kind: "download" }), gate);
    expect([gate.heldBy("download"), gate.heldBy("control")]).toEqual([
      true,
      false,
    ]);
    draw(createElement(HoldsWhile, { held: true }), gate);
    expect([gate.heldBy("download"), gate.heldBy("control")]).toEqual([
      false,
      true,
    ]);
    draw(createElement(HoldsWhile, { held: false }), gate);
    expect(gate.underWay()).toBe(0);
  });

  test("the holder of popgen.html holds nothing, and the widget draws", () => {
    draw(createElement(HoldsWhile, { held: true }), HOLDS_NOTHING);
    expect(thrown).toEqual([]);
  });

  test.each([
    ["useHoldWhile", createElement(HoldsWhile, { held: false })],
    ["useChangeHold", createElement(HoldsByHand, {})],
  ])("%s with no holder given is a defect", (_name, widget) => {
    try {
      draw(widget, null);
    } catch (error) {
      thrown.push(error);
    }
    expect(String(thrown[0])).toContain("popnei_web defect");
  });

  test("a release whose holder throws does not throw at the widget: the error is thrown a moment later", () => {
    const failure = new Error("a listener failed");
    const holds: ChangeHolds = {
      holdChange: () => () => {
        throw failure;
      },
    };
    const queued: (() => void)[] = [];
    const spied = vi
      .spyOn(globalThis, "queueMicrotask")
      .mockImplementation((callback) => {
        queued.push(callback);
      });
    try {
      const given: { hold: ChangeHold | null } = { hold: null };
      draw(
        createElement(HoldsByHand, {
          given: (hold) => {
            given.hold = hold;
          },
        }),
        holds,
      );
      const taken = given.hold;
      if (taken === null) throw new Error("no hold given");
      taken.take();
      expect(() => {
        taken.release();
      }).not.toThrow();
      expect(queued).toHaveLength(1);
      expect(() => {
        queued[0]?.();
      }).toThrow(failure);
    } finally {
      spied.mockRestore();
    }
  });
});
