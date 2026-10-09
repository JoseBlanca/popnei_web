// @vitest-environment jsdom
/**
 * Undo and Redo drawn by React in jsdom, in <StrictMode> as the
 * development server draws them, over the real store of popgen2.html, its
 * gate and a fake `send` (docs/specs/steps/popgen2-pca.md, "Undo and
 * Redo"): on that page each button drawn only while it has a step, in a
 * place of its own that stays when it is hidden; the focus handed from a
 * button that a press removes to the other, and to the heading when a
 * button with the focus goes for another reason; and popgen.html's two
 * buttons, always drawn and disabled with no step. Where the buttons
 * stand on the screen, and how high the line is, are read in the browser,
 * in e2e/popgen2Undo.spec.ts.
 */
import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { setVariantFilter } from "../../core/project.ts";
import type { Popgen2Store, Store } from "../../core/store.ts";
import type { JobResult, Outcome, Run } from "../../worker/protocol.ts";
import { createPopgen2Store } from "../popgen2Store.ts";
import { StoreProvider } from "../store.tsx";
import { RunGateProvider } from "../variants/runGate.tsx";
import { createRunGate, gatedStore } from "../variants/thresholdRun.ts";
import type { RunGate } from "../variants/thresholdRun.ts";
import { AnnouncerProvider } from "./announcer.tsx";
import { createAnnouncer } from "./status.ts";
import { UndoRedoButtons } from "./UndoRedoButtons.tsx";
import type { UndoRedoButtonsProps } from "./UndoRedoButtons.tsx";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

/** The description of the change of the MAF that the tests make. */
const MAF_CHANGED = "the MAF filter changed";

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

/** The store of the page, gated, and its gate. */
interface Page {
  readonly store: Popgen2Store<JobResult, Blob>;
  readonly gate: RunGate;
}

/** Draws the two buttons in a `<main>` under the heading "Popnei", with
    `props`, over a new store of popgen2.html, gated, or, with `gated`
    false, over the store alone with no gate, as popgen.html has. */
async function draw(props: UndoRedoButtonsProps, gated = true): Promise<Page> {
  const store = createPopgen2Store({
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
  const gate = createRunGate();
  const page = gated ? gatedStore(store, gate) : store;
  const buttons = createElement(
    "main",
    null,
    createElement("h1", { tabIndex: -1 }, "Popnei"),
    createElement(UndoRedoButtons, props),
  );
  const tree = createElement(
    StrictMode,
    null,
    createElement(
      StoreProvider,
      { value: page },
      createElement(
        AnnouncerProvider,
        { value: createAnnouncer() },
        gated
          ? createElement(RunGateProvider, { value: gate }, buttons)
          : buttons,
      ),
    ),
  );
  await act(async () => {
    root.render(tree);
    await Promise.resolve();
  });
  return { store: page, gate };
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

describe("AP4 D1 Undo and Redo on popgen2.html, each drawn only while it has a step", () => {
  test("neither is drawn when the store is made, with nothing to undo or redo", async () => {
    await draw({ onlyWithStep: true });
    expect(button("Undo")).toBeNull();
    expect(button("Redo")).toBeNull();
  });

  test("a step draws Undo, named by it, and not Redo", async () => {
    const { store } = await draw({ onlyWithStep: true });
    await changeMaf(store, 0.9);
    expect(description(drawn("Undo"))).toBe(`Undo: ${MAF_CHANGED}`);
    expect(button("Redo")).toBeNull();
  });

  test("the last step undone hides Undo and draws Redo, named by it", async () => {
    const { store } = await draw({ onlyWithStep: true });
    await changeMaf(store, 0.9);
    await press(drawn("Undo"));
    expect(button("Undo")).toBeNull();
    expect(description(drawn("Redo"))).toBe(`Redo: ${MAF_CHANGED}`);
  });

  test("with a step to undo and one to redo, both are drawn, enabled", async () => {
    const { store } = await draw({ onlyWithStep: true });
    await changeMaf(store, 0.9);
    await changeMaf(store, 0.8);
    await press(drawn("Undo"));
    expect(drawn("Undo").disabled).toBe(false);
    expect(drawn("Redo").disabled).toBe(false);
  });

  test("a run of the arrow keys waiting draws Undo, named by the change it will become, and hides Redo", async () => {
    const { store, gate } = await draw({ onlyWithStep: true });
    await changeMaf(store, 0.9);
    await press(drawn("Undo"));
    expect(button("Redo")).not.toBeNull();
    await act(async () => {
      gate.hold(
        () => undefined,
        () => "the filter of the variants by missing data changed",
      );
      await Promise.resolve();
    });
    expect(description(drawn("Undo"))).toBe(
      "Undo: the filter of the variants by missing data changed",
    );
    expect(button("Redo")).toBeNull();
  });

  test("Undo pressed while a run waits makes the run a change, then undoes it", async () => {
    const { store, gate } = await draw({ onlyWithStep: true });
    let made = false;
    await act(async () => {
      const held = gate.hold(
        () => {
          made = true;
          store.apply(MAF_CHANGED, (p) =>
            setVariantFilter(p, { kind: "maf", maxAllowedMaf: 0.9 }),
          );
          held.release();
        },
        () => MAF_CHANGED,
      );
      await Promise.resolve();
    });
    const before = store.getState().project;
    await press(drawn("Undo"));
    expect(made).toBe(true);
    expect(store.getState().project).toBe(before);
    expect(description(drawn("Redo"))).toBe(`Redo: ${MAF_CHANGED}`);
  });

  test("the place of each button stays when it is hidden, Undo's first and Redo's second, so that neither moves", async () => {
    const { store } = await draw({ onlyWithStep: true });
    const places = (): Element[] => {
      const undo = container.querySelector("[data-place='undo']");
      const redo = container.querySelector("[data-place='redo']");
      if (undo === null || redo === null) throw new Error("no place");
      return [undo, redo];
    };
    const [undoPlace, redoPlace] = places();
    if (undoPlace === undefined || redoPlace === undefined) {
      throw new Error("no place");
    }
    // Each place holds the words of its button, hidden from the eye and
    // from a screen reader, which give it the button's width.
    for (const [place, words] of [
      [undoPlace, "Undo"],
      [redoPlace, "Redo"],
    ] as const) {
      const ghost = place.querySelector("[aria-hidden='true']");
      expect(ghost?.textContent).toBe(words);
    }
    expect(
      undoPlace.compareDocumentPosition(redoPlace) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    await changeMaf(store, 0.9);
    await press(drawn("Undo"));
    // Undo hidden, Redo drawn: the same two places, Redo in its own.
    expect(places()).toEqual([undoPlace, redoPlace]);
    expect(undoPlace.querySelector("button")).toBeNull();
    expect(redoPlace.querySelector("button")).toBe(drawn("Redo"));
  });
});

describe("AP4 D1 the focus when a button of popgen2.html goes", () => {
  test("Undo, with the focus, pressed at the last step: the focus on Redo", async () => {
    const { store } = await draw({ onlyWithStep: true });
    await changeMaf(store, 0.9);
    drawn("Undo").focus();
    await press(drawn("Undo"));
    expect(button("Undo")).toBeNull();
    expect(document.activeElement).toBe(drawn("Redo"));
  });

  test("Redo, with the focus, pressed at the last step: the focus on Undo", async () => {
    const { store } = await draw({ onlyWithStep: true });
    await changeMaf(store, 0.9);
    await press(drawn("Undo"));
    drawn("Redo").focus();
    await press(drawn("Redo"));
    expect(button("Redo")).toBeNull();
    expect(document.activeElement).toBe(drawn("Undo"));
  });

  test("Redo, with the focus, removed by a command from another control: the focus on the heading", async () => {
    const { store } = await draw({ onlyWithStep: true });
    await changeMaf(store, 0.9);
    await press(drawn("Undo"));
    drawn("Redo").focus();
    expect(document.activeElement).toBe(drawn("Redo"));
    // A click of the FILTER box in Safari, which leaves the focus where
    // it was: the command clears what Redo had.
    await changeMaf(store, 0.8);
    await settled();
    expect(button("Redo")).toBeNull();
    expect(document.activeElement).toBe(heading());
  });

  test("Undo, with the focus, removed by an opening that starts the history afresh: the focus on the heading", async () => {
    const { store } = await draw({ onlyWithStep: true });
    await changeMaf(store, 0.9);
    drawn("Undo").focus();
    await act(async () => {
      store.applyAfresh((p) =>
        setVariantFilter(p, { kind: "maf", maxAllowedMaf: 0.8 }),
      );
      await Promise.resolve();
    });
    await settled();
    expect(button("Undo")).toBeNull();
    expect(document.activeElement).toBe(heading());
  });

  test("a button removed while the focus is elsewhere leaves the focus there", async () => {
    const { store } = await draw({ onlyWithStep: true });
    await changeMaf(store, 0.9);
    heading().focus();
    await act(async () => {
      store.undo();
      await Promise.resolve();
    });
    await settled();
    expect(document.activeElement).toBe(heading());
    expect(button("Undo")).toBeNull();
  });
});

describe("AP4 D1 popgen.html's Undo and Redo, unchanged", () => {
  test("both are drawn when there is no step, disabled, with no place around them", async () => {
    await draw({}, false);
    expect(drawn("Undo").disabled).toBe(true);
    expect(drawn("Redo").disabled).toBe(true);
    expect(container.querySelector("[data-place]")).toBeNull();
  });

  test("a step enables Undo, named by it, and an undo enables Redo and disables Undo, both drawn", async () => {
    const { store } = await draw({}, false);
    await changeMaf(store, 0.9);
    expect(drawn("Undo").disabled).toBe(false);
    expect(description(drawn("Undo"))).toBe(`Undo: ${MAF_CHANGED}`);
    drawn("Undo").focus();
    await press(drawn("Undo"));
    expect(drawn("Undo").disabled).toBe(true);
    expect(drawn("Redo").disabled).toBe(false);
    expect(document.activeElement).toBe(drawn("Redo"));
  });
});

/** Presses Ctrl+Z, or Ctrl+Y for `redo`, on the heading, as the keyboard
    does; gives whether the page took it from the browser. */
async function pressKeys(which: "undo" | "redo"): Promise<boolean> {
  const event = new KeyboardEvent("keydown", {
    key: which === "undo" ? "z" : "y",
    code: which === "undo" ? "KeyZ" : "KeyY",
    ctrlKey: true,
    bubbles: true,
    cancelable: true,
  });
  await act(async () => {
    heading().dispatchEvent(event);
    await Promise.resolve();
  });
  await settled();
  return event.defaultPrevented;
}

describe("AP4 D2 the keys of Undo and Redo on popgen2.html, caught on the whole window", () => {
  test("with no button drawn, Ctrl+Z is taken from the browser and does nothing", async () => {
    const { store } = await draw({ onlyWithStep: true });
    const before = store.getState().project;
    expect(await pressKeys("undo")).toBe(true);
    expect(store.getState().project).toBe(before);
  });

  test("Ctrl+Z undoes and Ctrl+Y redoes, the buttons following", async () => {
    const { store } = await draw({ onlyWithStep: true });
    const before = store.getState().project;
    await changeMaf(store, 0.9);
    const after = store.getState().project;
    expect(await pressKeys("undo")).toBe(true);
    expect(store.getState().project).toBe(before);
    expect(button("Undo")).toBeNull();
    expect(button("Redo")).not.toBeNull();
    expect(await pressKeys("redo")).toBe(true);
    expect(store.getState().project).toBe(after);
    expect(button("Redo")).toBeNull();
  });

  test("while the keys wait, as during a PCA, Ctrl+Z and Ctrl+Y are taken from the browser and do nothing", async () => {
    const { store } = await draw({ onlyWithStep: true, keysWait: true });
    await changeMaf(store, 0.9);
    const after = store.getState().project;
    expect(await pressKeys("undo")).toBe(true);
    expect(store.getState().project).toBe(after);
    expect(await pressKeys("redo")).toBe(true);
    expect(store.getState().project).toBe(after);
  });
});
