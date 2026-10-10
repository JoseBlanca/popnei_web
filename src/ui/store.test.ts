// @vitest-environment jsdom
/**
 * The hooks of the store refuse the store of the other page
 * (src/ui/store.tsx): `useUndoStore`, popgen.html's, under the store of
 * popgen2.html, which has no Undo; and `usePopgen2Store` under the store
 * of popgen.html, which has no `applyAfresh`. Drawn by React in jsdom.
 */
import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { createPopgen2Store } from "./popgen2Store.ts";
import { createPopgenStore } from "./popgenStore.ts";
import { StoreProvider, usePopgen2Store, useUndoStore } from "./store.tsx";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
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

/** What the store of each page is made with: nothing is sent here. */
const DEPS = {
  send: (): never => {
    throw new Error("popnei_web defect: no request is sent here");
  },
  sendWrite: (): never => {
    throw new Error("popnei_web defect: no write is sent here");
  },
  appVersion: "0.1.0",
};

/** Draws a component that calls `hook` under `store`, and gives what the
    hook threw, or `null` when it gave a store. */
function thrownBy(
  hook: () => unknown,
  store: Parameters<typeof StoreProvider>[0]["value"],
): unknown {
  let thrown: unknown = null;
  function Probe(): null {
    try {
      hook();
    } catch (error) {
      thrown = error;
    }
    return null;
  }
  act(() => {
    root.render(
      createElement(
        StrictMode,
        null,
        createElement(StoreProvider, { value: store }, createElement(Probe)),
      ),
    );
  });
  return thrown;
}

describe("NU2 the hooks of the store refuse the store of the other page", () => {
  test("useUndoStore under the store of popgen2.html: a defect; under popgen.html's, the store", () => {
    const thrown = thrownBy(useUndoStore, createPopgen2Store(DEPS));
    expect(thrown).toBeInstanceOf(Error);
    expect(String(thrown)).toContain("popnei_web defect: useUndoStore");
    expect(thrownBy(useUndoStore, createPopgenStore(DEPS))).toBeNull();
  });

  test("usePopgen2Store under the store of popgen.html: a defect; under popgen2.html's, the store", () => {
    const thrown = thrownBy(usePopgen2Store, createPopgenStore(DEPS));
    expect(thrown).toBeInstanceOf(Error);
    expect(String(thrown)).toContain("popnei_web defect: usePopgen2Store");
    expect(thrownBy(usePopgen2Store, createPopgen2Store(DEPS))).toBeNull();
  });
});
