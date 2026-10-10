// @vitest-environment jsdom
/**
 * The error bar of popgen.html drawn by React in jsdom: a copy of the
 * details that settles after Close says nothing, and shows no box at the
 * next error (docs/specs/shell.md, "The error bar").
 */
import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, test } from "vitest";

import { createDefects } from "../defects.ts";
import { ErrorBar } from "./ErrorBar.tsx";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

/** The button of `container` named `name`. */
function button(container: HTMLElement, name: string): HTMLButtonElement {
  const found = [...container.querySelectorAll("button")].find(
    (b) => b.textContent === name,
  );
  if (found === undefined) throw new Error(`no button ${name}`);
  return found;
}

test("a copy of the details that settles after Close says nothing, and shows no box at the next error", async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let fail = (): void => undefined;
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: () =>
        new Promise<void>((_resolve, reject) => {
          fail = () => {
            reject(new Error("no clipboard"));
          };
        }),
    },
  });
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const defects = createDefects();
  act(() => {
    root.render(
      createElement(
        StrictMode,
        null,
        createElement(ErrorBar, {
          defects,
          store: null,
          saving: null,
          appVersion: "0.1.0",
        }),
      ),
    );
  });
  act(() => {
    defects.report(new Error("test"), "event", null);
  });
  act(() => {
    button(container, "Copy the details").click();
  });
  act(() => {
    button(container, "Close").click();
  });

  await act(async () => {
    fail();
    await new Promise((resolve) => requestAnimationFrame(resolve));
  });
  act(() => {
    defects.report(new Error("next"), "event", null);
  });

  expect(container.querySelector('[role="status"]')?.textContent).toBe("");
  expect(container.querySelector("textarea")).toBeNull();
  act(() => {
    root.unmount();
  });
  container.remove();
  Reflect.deleteProperty(navigator, "clipboard");
});
