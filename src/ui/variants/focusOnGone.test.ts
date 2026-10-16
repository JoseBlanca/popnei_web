// @vitest-environment jsdom
/**
 * The focus handed on when a part that holds it leaves the page, drawn by
 * React in <StrictMode>, as the development server draws the page:
 * StrictMode attaches and detaches the ref of a part just mounted once
 * more, which the built site never does, so a flow against the built site
 * cannot see a hand-over made then.
 */
import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { useFocusOnGone } from "./focusOnGone.ts";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

/** What the harness shows. */
interface HarnessProps {
  /** Whether the part, a box with its button, is on the page. */
  readonly part: boolean;
  /** Whether the button that comes back as the part goes is on the
      page, as the box's button comes back as Remove goes. */
  readonly back: boolean;
  /** Words of the part's button, which change with no leaving. */
  readonly words: string;
  /** Whether a field that takes the focus by itself, `autoFocus`, is on
      the page; absent, it is not. */
  readonly autoFocused?: boolean;
}

/** The refs the harness was given, one per drawing. */
const refs: React.RefCallback<HTMLElement>[] = [];

/** A heading, the part that may leave with its button, and a button that
    may come back, which takes the focus when it is there. */
function Harness({
  part,
  back,
  words,
  autoFocused = false,
}: HarnessProps): React.JSX.Element {
  const partRef = useFocusOnGone(
    () => document.getElementById("back") ?? document.getElementById("heading"),
  );
  refs.push(partRef);
  return createElement(
    "main",
    null,
    createElement("h2", { tabIndex: -1, id: "heading" }, "Box"),
    back && createElement("button", { id: "back" }, "Open file…"),
    part &&
      createElement(
        "div",
        { ref: partRef },
        createElement("button", { id: "inPart" }, words),
      ),
    createElement("button", { id: "other" }, "Other"),
    autoFocused &&
      createElement("input", {
        id: "auto",
        autoFocus: true,
        "aria-label": "Name",
      }),
  );
}

let container: HTMLElement;
let root: Root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  refs.length = 0;
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

/** Draws the harness in StrictMode and lets the microtasks of the
    drawing run. */
async function draw(props: HarnessProps): Promise<void> {
  await act(async () => {
    root.render(createElement(StrictMode, null, createElement(Harness, props)));
    await Promise.resolve();
  });
}

/** The element of the harness with the id `id`. */
function byId(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (found === null) throw new Error(`no element ${id}`);
  return found;
}

describe("useFocusOnGone, in StrictMode", () => {
  test("the part leaving with the focus in it hands the focus to the heading", async () => {
    await draw({ part: true, back: false, words: "Open file…" });
    byId("inPart").focus();
    await draw({ part: false, back: false, words: "Open file…" });
    expect(document.activeElement).toBe(byId("heading"));
  });

  test("the part leaving as the button comes back, in the same change, hands the focus to that button", async () => {
    await draw({ part: true, back: false, words: "Remove" });
    byId("inPart").focus();
    await draw({ part: false, back: true, words: "Remove" });
    expect(document.activeElement).toBe(byId("back"));
  });

  test("the part drawn again, its words changed, keeps the focus on its button", async () => {
    await draw({ part: true, back: false, words: "Open file…" });
    byId("inPart").focus();
    await draw({ part: true, back: false, words: "Open another file…" });
    expect(document.activeElement).toBe(byId("inPart"));
  });

  test("the part leaving with the focus elsewhere leaves the focus where it is", async () => {
    await draw({ part: true, back: false, words: "Open file…" });
    byId("other").focus();
    await draw({ part: false, back: false, words: "Open file…" });
    expect(document.activeElement).toBe(byId("other"));
  });

  test("a part just drawn, whose ref StrictMode detaches and attaches again, moves no focus", async () => {
    await draw({ part: false, back: false, words: "Open file…" });
    byId("other").focus();
    await draw({ part: true, back: false, words: "Open file…" });
    expect(document.activeElement).toBe(byId("other"));
  });

  test("the part leaving with the focus on no element moves no focus", async () => {
    await draw({ part: true, back: false, words: "Open file…" });
    expect(document.activeElement).toBe(document.body);
    await draw({ part: false, back: false, words: "Open file…" });
    expect(document.activeElement).toBe(document.body);
  });

  test("the part leaving with the focus as a field that takes it by itself comes, in the same change, leaves the focus on that field", async () => {
    await draw({ part: true, back: false, words: "Open file…" });
    byId("inPart").focus();
    await draw({
      part: false,
      back: false,
      words: "Open file…",
      autoFocused: true,
    });
    expect(document.activeElement).toBe(byId("auto"));
  });

  test("the ref is the same function at every drawing, so that React detaches it only when the part leaves", async () => {
    await draw({ part: true, back: false, words: "Open file…" });
    await draw({ part: true, back: false, words: "Open another file…" });
    expect(refs.length).toBeGreaterThan(1);
    for (const ref of refs) expect(ref).toBe(refs[0]);
  });
});
