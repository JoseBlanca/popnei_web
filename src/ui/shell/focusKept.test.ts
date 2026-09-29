// @vitest-environment jsdom
/**
 * The focus kept through an Undo or a Redo that removes the control that
 * had it, drawn by React in <StrictMode>, as the development server draws
 * the page: StrictMode replays the effects of a part just mounted, which
 * the built site never does, so a flow against the built site cannot see
 * it.
 */
import { StrictMode, act, createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { FocusOnLeave } from "../steps/variants/FocusOnLeave.tsx";
import { keepingFocus } from "./focusKept.ts";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

/** What the harness shows under its `<h1>`. */
interface HarnessProps {
  /** Whether the button that an Undo removes is on the page. */
  readonly forget: boolean;
  /** Whether the part of the Count, which hands the focus to the heading
      of its block when it leaves, is on the page. */
  readonly count: boolean;
}

/** A step: its `<h1>`, a button that stays, a button an Undo removes, and
    a part of the Variants step that moves the focus itself. */
function Harness({ forget, count }: HarnessProps): React.JSX.Element {
  return createElement(
    "main",
    null,
    createElement("h1", { tabIndex: -1 }, "Individuals"),
    createElement("button", { id: "stays" }, "Separator"),
    forget && createElement("button", { id: "forget" }, "Forget these types"),
    createElement("h3", { id: "block", tabIndex: -1 }, "Count"),
    createElement("h2", { id: "section", tabIndex: -1 }, "Filters"),
    count &&
      createElement(FocusOnLeave, {
        headingId: "block",
        sectionHeadingId: "section",
        children: createElement("button", { id: "part" }, "Count"),
      }),
  );
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

function element(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (found === null) throw new Error(`the harness has no ${id}`);
  return found;
}

function tree(props: HarnessProps): React.JSX.Element {
  return createElement(StrictMode, null, createElement(Harness, props));
}

async function draw(props: HarnessProps): Promise<void> {
  await act(async () => {
    root.render(tree(props));
    await Promise.resolve();
  });
}

/** An Undo that draws `props`, as the header makes it, with the drawing
    at once. */
async function undoTo(props: HarnessProps): Promise<void> {
  await act(async () => {
    keepingFocus(() => {
      flushSync(() => {
        root.render(tree(props));
      });
    });
    await Promise.resolve();
  });
}

describe("IP5 D2 the focus kept through an Undo, under StrictMode", () => {
  test("an Undo that removes the button with the focus hands the focus to the h1 of the step", async () => {
    await draw({ forget: true, count: false });
    element("forget").focus();
    await undoTo({ forget: false, count: false });
    expect(document.activeElement).toBe(container.querySelector("main h1"));
  });

  test("an Undo that leaves the control with the focus on the page leaves the focus there", async () => {
    await draw({ forget: true, count: false });
    element("stays").focus();
    await undoTo({ forget: false, count: false });
    expect(document.activeElement).toBe(element("stays"));
  });

  test("an Undo that removes a part of the Variants step, which moves the focus itself, leaves the focus where the step put it", async () => {
    await draw({ forget: false, count: true });
    element("part").focus();
    await undoTo({ forget: false, count: false });
    expect(document.activeElement).toBe(element("block"));
  });

  test("an Undo with the focus on nothing leaves it there", async () => {
    await draw({ forget: true, count: false });
    expect(document.activeElement).toBe(document.body);
    await undoTo({ forget: false, count: false });
    expect(document.activeElement).toBe(document.body);
  });
});
