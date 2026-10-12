// @vitest-environment jsdom
/**
 * The zone to load a file drawn by React in jsdom, while it waits: what
 * is dropped or pasted on it opens nothing and is given to the
 * `onRefused` of its wait, by the name of the one file, or `null` for
 * anything that is not one file, a piece of text among them (the review
 * of work package 4 of docs/plans/population-tab.md, 12 October 2026).
 * React Aria gives a paste as a drop, so a paste into the zone's hidden
 * button stands for both, as jsdom has no drag and drop.
 */
import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { FileZone } from "./FileZone.tsx";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

const PASTE_LABEL = "Paste an individuals file";

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

/** Draws a zone that waits, with the spies of what it calls. */
function drawWaiting(): {
  readonly onRefused: ReturnType<typeof vi.fn>;
  readonly onFiles: ReturnType<typeof vi.fn>;
  readonly onNotFiles: ReturnType<typeof vi.fn>;
} {
  const onRefused = vi.fn();
  const onFiles = vi.fn();
  const onNotFiles = vi.fn();
  act(() => {
    root.render(
      createElement(
        StrictMode,
        null,
        createElement(FileZone, {
          pasteLabel: PASTE_LABEL,
          buttonLabel: "Open an individuals file…",
          accept: [".csv"],
          onFiles,
          onNotFiles,
          waiting: { reason: "The diversity runs.", onRefused },
        }),
      ),
    );
  });
  return { onRefused, onFiles, onNotFiles };
}

/** Pastes `clipboardData` into the zone's hidden button, which takes a
    paste while it has the focus, as React Aria reads a paste. */
async function paste(clipboardData: object): Promise<void> {
  const button = container.querySelector(`button[aria-label="${PASTE_LABEL}"]`);
  if (!(button instanceof HTMLElement)) throw new Error("no hidden button");
  await act(async () => {
    button.focus();
    await Promise.resolve();
  });
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", { value: clipboardData });
  await act(async () => {
    button.dispatchEvent(event);
    await Promise.resolve();
  });
}

describe("PT4 the zone that waits, given what is not a file", () => {
  test("a piece of text pasted or dropped on it opens nothing and is refused with no name", async () => {
    const { onRefused, onFiles, onNotFiles } = drawWaiting();
    await paste({
      types: ["text/plain"],
      items: [{ kind: "string", type: "text/plain" }],
      getData: () => "IID,pop",
    });
    expect(onRefused.mock.calls).toEqual([[null]]);
    expect(onFiles).not.toHaveBeenCalled();
    expect(onNotFiles).not.toHaveBeenCalled();
  });
});
