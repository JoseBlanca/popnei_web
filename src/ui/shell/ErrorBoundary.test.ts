// @vitest-environment jsdom
/**
 * The boundary of a part of a page, drawn by React, with `resetOn`: a
 * part that caught a defect is drawn again when `resetOn` changes, as
 * the PCA tab of popgen2.html is when another variants file is opened
 * (docs/specs/steps/popgen2-pca.md, "The states"), and a part that
 * caught nothing keeps what it holds.
 */
import { act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { ErrorBoundary } from "./ErrorBoundary.tsx";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

let container: HTMLElement;
let root: Root;
let caught: unknown[];

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  caught = [];
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container, {
    onCaughtError: (error) => {
      caught.push(error);
    },
  });
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

/** A part that throws while `fails`, and otherwise shows what was typed
    in it, its own state. */
function Part({ fails }: { readonly fails: boolean }): React.JSX.Element {
  const [typed] = useState(() => `typed ${String(Math.random())}`);
  if (fails) throw new Error("popnei_web defect: for the test.");
  return createElement("p", null, typed);
}

function draw(resetOn: string, fails: boolean): void {
  act(() => {
    root.render(
      createElement(ErrorBoundary, {
        heading: "PCA",
        level: 2,
        resetOn,
        children: createElement(Part, { fails }),
      }),
    );
  });
}

describe("AP6 D3 the boundary of the PCA tab, reset by another variants file", () => {
  test("a defect leaves the heading alone until resetOn changes, then the part is drawn again", () => {
    draw("file 1", true);
    expect(caught).toHaveLength(1);
    expect(container.textContent).toBe("PCA");
    draw("file 1", false);
    expect(container.textContent).toBe("PCA");
    draw("file 2", false);
    expect(container.textContent).toMatch(/^typed /u);
  });

  test("with no defect, another resetOn keeps the part and what it holds", () => {
    draw("file 1", false);
    const before = container.textContent;
    draw("file 2", false);
    expect(container.textContent).toBe(before);
  });
});
