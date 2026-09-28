// @vitest-environment jsdom
/**
 * The focus the Count moves when its words leave the page, drawn by React
 * in <StrictMode>, as the development server draws the page: StrictMode
 * replays the cleanup of a part just mounted, which the built site never
 * does, so a flow against the built site cannot see what this checks.
 */
import { StrictMode, act, createElement, useRef } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { FocusSpot, useFocusAfterLoss } from "./FocusSpot.tsx";
import type { FocusSpotProps } from "./FocusSpot.tsx";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

/** What the harness shows: the Count's button, stood for by a part that
    takes the focus, or the line of the total that replaces it. */
interface HarnessProps {
  readonly shows: "button" | "total";
  /** A number that changes to draw the harness again with nothing else
      changed, as an Undo that leaves the part as it was. */
  readonly drawing: number;
}

function Harness({ shows, drawing }: HarnessProps): React.JSX.Element {
  const button = useRef<HTMLElement | null>(null);
  const total = useRef<HTMLElement | null>(null);
  const lost = useFocusAfterLoss(() => button.current ?? total.current);
  const spot: FocusSpotProps =
    shows === "button"
      ? {
          onNode: (node) => {
            button.current = node;
          },
          onGone: lost,
          children: "Count",
        }
      : {
          line: true,
          onNode: (node) => {
            total.current = node;
          },
          onGone: lost,
          children:
            "1,152 of the 1,200 variants of panel.nei pass the filters.",
        };
  return createElement(
    "div",
    { "data-drawing": drawing },
    // eslint-disable-next-line react-hooks/refs -- onNode and onGone write the refs when React calls them, after the drawing, as the JSX of the Count does; the rule cannot tell them apart from a read when they are spread into createElement.
    createElement(FocusSpot, { key: shows, ...spot }),
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

async function draw(props: HarnessProps): Promise<void> {
  await act(async () => {
    root.render(createElement(StrictMode, null, createElement(Harness, props)));
    await Promise.resolve();
  });
}

describe("IP3 the focus of the Count under StrictMode", () => {
  test("the button gone with the focus sends it to the line of the total", async () => {
    await draw({ shows: "button", drawing: 0 });
    container.querySelector<HTMLElement>("div[tabindex]")?.focus();
    await draw({ shows: "total", drawing: 0 });
    const line = container.querySelector("p");
    expect(line).not.toBeNull();
    expect(document.activeElement).toBe(line);
  });

  test("a later drawing, with the focus let go on the blank page, leaves the focus there", async () => {
    await draw({ shows: "button", drawing: 0 });
    container.querySelector<HTMLElement>("div[tabindex]")?.focus();
    await draw({ shows: "total", drawing: 0 });
    expect(document.activeElement).toBe(container.querySelector("p"));
    // A click on the blank page.
    (document.activeElement as HTMLElement | null)?.blur();
    expect(document.activeElement).toBe(document.body);
    await draw({ shows: "total", drawing: 1 });
    expect(document.activeElement).toBe(document.body);
  });
});
