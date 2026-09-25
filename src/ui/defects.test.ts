import { describe, expect, test } from "vitest";

import { createDefects, isResizeObserverNoise } from "./defects.ts";

describe("WS7 D1 createDefects", () => {
  test("the first error is kept and the second is counted in more", () => {
    const defects = createDefects();
    expect(defects.getState()).toEqual({ first: null, more: 0 });

    defects.report(new Error("first"), "event", null);
    defects.report(new Error("second"), "rejection", null);

    const state = defects.getState();
    expect(state.first?.message).toBe("first");
    expect(state.more).toBe(1);
  });

  test("the 21st error is counted and its details are not kept", () => {
    const defects = createDefects();
    for (let i = 1; i <= 21; i += 1) {
      defects.report(new Error(`error number ${String(i)}`), "event", null);
    }

    expect(defects.getState().more).toBe(20);
    const details = defects.details();
    expect(details).toContain("error number 1\n");
    expect(details).toContain("error number 20\n");
    expect(details).not.toContain("error number 21");
  });

  test("dismiss empties the log, and a later error is first again", () => {
    const defects = createDefects();
    defects.report(new Error("first"), "event", null);
    defects.report(new Error("second"), "event", null);

    defects.dismiss();
    expect(defects.getState()).toEqual({ first: null, more: 0 });
    expect(defects.details()).toBe("");

    defects.report(new Error("third"), "event", null);
    expect(defects.getState().first?.message).toBe("third");
    expect(defects.getState().more).toBe(0);
  });

  test("details hold every message kept, where each came from, and a thrown text as its text", () => {
    const defects = createDefects();
    const thrown = new Error("from a handler");
    defects.report(thrown, "event", null);
    defects.report("a text, not an Error", "rejection", null);
    defects.report(new Error("while drawing"), "drawing", "\n    at Shell");

    expect(defects.getState().first?.message).toBe("from a handler");
    const details = defects.details();
    expect(details).toContain("from a handler");
    expect(details).toContain(String(thrown.stack));
    expect(details).toContain("the window's error event");
    expect(details).toContain("a text, not an Error");
    expect(details).toContain("the window's unhandledrejection event");
    expect(details).toContain("while drawing");
    expect(details).toContain("at Shell");
  });

  test("the state is the same object until an error or a dismiss, and each change calls the listeners", () => {
    const defects = createDefects();
    let calls = 0;
    const unsubscribe = defects.subscribe(() => {
      calls += 1;
    });
    const before = defects.getState();
    expect(defects.getState()).toBe(before);

    defects.report(new Error("first"), "event", null);
    expect(defects.getState()).not.toBe(before);
    expect(calls).toBe(1);

    unsubscribe();
    defects.dismiss();
    expect(calls).toBe(1);
  });
});

describe("WS7 D1 isResizeObserverNoise", () => {
  test("the two messages of the ResizeObserver loop are noise", () => {
    expect(
      isResizeObserverNoise(
        "ResizeObserver loop completed with undelivered notifications.",
      ),
    ).toBe(true);
    expect(isResizeObserverNoise("ResizeObserver loop limit exceeded")).toBe(
      true,
    );
  });

  test("any other message is not noise", () => {
    expect(isResizeObserverNoise("Uncaught Error: test")).toBe(false);
    expect(isResizeObserverNoise("")).toBe(false);
    expect(
      isResizeObserverNoise("Error: ResizeObserver loop limit exceeded"),
    ).toBe(false);
  });
});
