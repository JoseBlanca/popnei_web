// @vitest-environment jsdom
/**
 * Undo and Redo drawn by React in jsdom, in <StrictMode> as the
 * development server draws them, over the real store of popgen.html and
 * a fake `send` (docs/specs/shell.md, "The header"): both always drawn,
 * disabled with no step; the focus handed from a button that a press
 * disables to the other; and their keys on the whole window. popgen2.html
 * has had no Undo and no Redo since 10 October 2026.
 */
import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { setVariantFilter } from "../../core/project.ts";
import type { Store } from "../../core/store.ts";
import type { JobResult, Outcome, Run } from "../../worker/protocol.ts";
import { createPopgenStore } from "../popgenStore.ts";
import { StoreProvider } from "../store.tsx";
import { DIALOG_MARK } from "../widgets/dialogMark.ts";
import { AnnouncerProvider } from "./announcer.tsx";
import { createAnnouncer } from "./status.ts";
import { UndoRedoButtons } from "./UndoRedoButtons.tsx";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

/** The description of the change of the MAF that the tests make. */
const MAF_CHANGED = "the MAF filter changed";

/** The words of a button of the page beside Undo and Redo, which holds
    the focus away from them. */
const ELSEWHERE = "Elsewhere";

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

/** Draws the two buttons in a `<main>` under the heading "Popnei",
    beside another button, over a new store of popgen.html; gives the
    store. */
async function draw(): Promise<Store<JobResult, Blob>> {
  const store = createPopgenStore({
    send: (): Run<JobResult> => ({
      id: 1,
      outcome: new Promise<Outcome<JobResult>>(() => undefined),
      cancel: () => undefined,
    }),
    sendWrite: () => {
      throw new Error("popnei_web defect: no write is sent here");
    },
    appVersion: "0.1.0",
  });
  const tree = createElement(
    StrictMode,
    null,
    createElement(
      StoreProvider,
      { value: store },
      createElement(
        AnnouncerProvider,
        { value: createAnnouncer() },
        createElement(
          "main",
          null,
          createElement("h1", { tabIndex: -1 }, "Popnei"),
          createElement(UndoRedoButtons),
          createElement("button", { type: "button" }, ELSEWHERE),
        ),
      ),
    ),
  );
  await act(async () => {
    root.render(tree);
    await Promise.resolve();
  });
  return store;
}

/** Lets React draw what a change of the store made, and the microtasks
    that hand the focus on run. */
async function settled(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

/** Sets the MAF filter at `maf`: a step named `MAF_CHANGED`. */
async function changeMaf(
  store: Store<JobResult, Blob>,
  maf: number,
): Promise<void> {
  await act(async () => {
    store.apply(MAF_CHANGED, (p) =>
      setVariantFilter(p, { kind: "maf", maxAllowedMaf: maf }),
    );
    await Promise.resolve();
  });
}

/** The button named `name`, or null when it is not drawn. */
function button(name: "Undo" | "Redo"): HTMLButtonElement | null {
  return (
    [...container.querySelectorAll("button")].find(
      (b) => b.textContent === name,
    ) ?? null
  );
}

/** The button named `name`; throws when it is not drawn. */
function drawn(name: "Undo" | "Redo"): HTMLButtonElement {
  const found = button(name);
  if (found === null) throw new Error(`${name} is not drawn`);
  return found;
}

/** The words that describe `element` for a screen reader. */
function description(element: Element): string {
  const ids = element.getAttribute("aria-describedby") ?? "";
  return ids
    .split(" ")
    .filter((id) => id !== "")
    .map((id) => document.getElementById(id)?.textContent ?? "")
    .join(" ");
}

/** Presses `element` as a click does, which React Aria takes as a
    press. */
async function press(element: HTMLElement): Promise<void> {
  await act(async () => {
    element.click();
    await Promise.resolve();
  });
  await settled();
}

/** The heading of the page. */
function heading(): HTMLElement {
  const found = container.querySelector("h1");
  if (found === null) throw new Error("the page has no h1");
  return found;
}

/** The button of the page beside Undo and Redo. */
function elsewhere(): HTMLButtonElement {
  const found = [...container.querySelectorAll("button")].find(
    (b) => b.textContent === ELSEWHERE,
  );
  if (found === undefined) throw new Error("no button beside Undo and Redo");
  return found;
}

describe("AP4 D1 popgen.html's Undo and Redo, unchanged", () => {
  test("both are drawn when there is no step, disabled", async () => {
    await draw();
    expect(drawn("Undo").disabled).toBe(true);
    expect(drawn("Redo").disabled).toBe(true);
  });

  test("a step enables Undo, named by it, and an undo enables Redo and disables Undo, both drawn", async () => {
    const store = await draw();
    await changeMaf(store, 0.9);
    expect(drawn("Undo").disabled).toBe(false);
    expect(description(drawn("Undo"))).toBe(`Undo: ${MAF_CHANGED}`);
    drawn("Undo").focus();
    await press(drawn("Undo"));
    expect(drawn("Undo").disabled).toBe(true);
    expect(drawn("Redo").disabled).toBe(false);
    expect(document.activeElement).toBe(drawn("Redo"));
  });

  test("Redo, with the focus, pressed at the last step: the focus on Undo", async () => {
    const store = await draw();
    await changeMaf(store, 0.9);
    await press(drawn("Undo"));
    drawn("Redo").focus();
    await press(drawn("Redo"));
    expect(drawn("Redo").disabled).toBe(true);
    expect(document.activeElement).toBe(drawn("Undo"));
  });
});

/** Presses Ctrl+Z, or Ctrl+Y for `redo`, on `target`, the heading when
    absent, as the keyboard does; gives whether the page took it from the
    browser. */
async function pressKeys(
  which: "undo" | "redo",
  target?: HTMLElement,
): Promise<boolean> {
  const event = new KeyboardEvent("keydown", {
    key: which === "undo" ? "z" : "y",
    code: which === "undo" ? "KeyZ" : "KeyY",
    ctrlKey: true,
    bubbles: true,
    cancelable: true,
  });
  await act(async () => {
    (target ?? heading()).dispatchEvent(event);
    await Promise.resolve();
  });
  await settled();
  return event.defaultPrevented;
}

describe("AP4 D2 the keys of Undo and Redo on popgen.html, caught on the whole window", () => {
  test("with no step, Ctrl+Z is taken from the browser and does nothing", async () => {
    const store = await draw();
    const before = store.getState().project;
    expect(await pressKeys("undo")).toBe(true);
    expect(store.getState().project).toBe(before);
  });

  test("Ctrl+Z undoes and Ctrl+Y redoes, the buttons following, and the focus stays on another control", async () => {
    const store = await draw();
    const before = store.getState().project;
    await changeMaf(store, 0.9);
    const after = store.getState().project;
    elsewhere().focus();
    expect(await pressKeys("undo", elsewhere())).toBe(true);
    expect(store.getState().project).toBe(before);
    expect(drawn("Undo").disabled).toBe(true);
    expect(drawn("Redo").disabled).toBe(false);
    expect(document.activeElement).toBe(elsewhere());
    expect(await pressKeys("redo")).toBe(true);
    expect(store.getState().project).toBe(after);
    expect(drawn("Redo").disabled).toBe(true);
  });

  test("Ctrl+Z in a dialog, or on the heading under it, is taken from the browser and undoes nothing", async () => {
    const store = await draw();
    await changeMaf(store, 0.9);
    const after = store.getState().project;
    const dialog = document.createElement("div");
    dialog.setAttribute(DIALOG_MARK, "");
    const inDialog = document.createElement("button");
    dialog.append(inDialog);
    document.body.append(dialog);
    try {
      inDialog.focus();
      expect(await pressKeys("undo", inDialog)).toBe(true);
      expect(store.getState().project).toBe(after);
      expect(await pressKeys("undo")).toBe(true);
      expect(store.getState().project).toBe(after);
    } finally {
      dialog.remove();
    }
  });
});
