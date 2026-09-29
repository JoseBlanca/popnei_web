// @vitest-environment jsdom
/**
 * The mount of the 3D view drawn by React in <StrictMode>, as the
 * development server draws the page (docs/specs/charts/pca3d.md, "Loading
 * three.js", "When it arrives too late"): StrictMode mounts the effect
 * that asks for the download, removes it and mounts it again, which the
 * built site never does, so a flow against the built site cannot see a
 * download that arrives after the first effect is over. The download is
 * an object of the test, and so is the plot, which records what the
 * mount asks of it; jsdom has no WebGL.
 */
import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type {
  Pca3dData,
  Pca3dEvents,
  Pca3dHandle,
} from "../../../charts/pca3d.ts";
import { AnnouncerProvider } from "../../shell/announcer.tsx";
import { createAnnouncer } from "../../shell/status.ts";
import type { Pca3dModule } from "./load3d.ts";
import { Pca3dView } from "./Pca3dView.tsx";
import type { Pca3dFailure } from "./Pca3dView.tsx";
import { CONTEXT_LOST, LOADING_3D } from "./words.ts";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

/** The download of the 3D view, which each test lets through when it
    chooses. */
const download = vi.hoisted(() => {
  let resolve: (module: unknown) => void = () => undefined;
  let promise = Promise.resolve<unknown>(null);
  return {
    asks: 0,
    arm(): void {
      promise = new Promise<unknown>((done) => {
        resolve = done;
      });
    },
    get promise(): Promise<unknown> {
      return promise;
    },
    arrive(module: unknown): void {
      resolve(module);
    },
  };
});

vi.mock("./load3d.ts", () => ({
  loadedPca3d: (): null => null,
  loadPca3d: (): Promise<unknown> => {
    download.asks += 1;
    return download.promise;
  },
}));

/** A plot the mount made, and what it was asked. */
interface Made {
  readonly element: HTMLElement;
  readonly events: Pca3dEvents;
  readonly updates: Pca3dData[];
  destroyed: number;
}

let made: Made[] = [];

/** The module of the 3D view, whose plot draws a canvas into its element
    and records its calls. */
const MODULE = {
  createPca3d(
    element: HTMLElement,
    _data: Pca3dData,
    events: Pca3dEvents = {},
  ): Pca3dHandle {
    const canvas = document.createElement("canvas");
    element.append(canvas);
    const plot: Made = { element, events, updates: [], destroyed: 0 };
    made.push(plot);
    const refused = (): never => {
      throw new Error("not asked of the plot by the mount");
    };
    return {
      update(next) {
        plot.updates.push(next);
      },
      destroy() {
        plot.destroyed += 1;
        canvas.remove();
      },
      toSVG: refused,
      toPNG: refused,
      rotate: refused,
      viewAlong: refused,
      zoom: refused,
      resetView: refused,
    };
  },
} as unknown as Pca3dModule;

function data(title: string): Pca3dData {
  return {
    title,
    description: "Two individuals, for the test.",
    x: Float64Array.from([0, 1]),
    y: Float64Array.from([0, 1]),
    z: Float64Array.from([0, 1]),
    axisNames: ["PC1", "PC2", "PC3"],
    axisLabels: ["PC1 (50.00%)", "PC2 (30.00%)", "PC3 (20.00%)"],
    pointNames: ["a", "b"],
    colours: {
      kind: "groups",
      title: "Population",
      group: Uint16Array.from([0, 0]),
      names: ["P1"],
      noneName: "No population",
      highlighted: null,
    },
  };
}

let container: HTMLElement;
let root: Root;
let handles: (Pca3dHandle | null)[];
let failures: Pca3dFailure[];

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  made = [];
  handles = [];
  failures = [];
  download.asks = 0;
  download.arm();
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

const announcer = createAnnouncer();

async function draw(shown: Pca3dData): Promise<void> {
  await act(async () => {
    root.render(
      createElement(
        StrictMode,
        null,
        createElement(
          AnnouncerProvider,
          { value: announcer },
          createElement(Pca3dView, {
            data: shown,
            onHandle: (handle: Pca3dHandle | null) => {
              handles.push(handle);
            },
            onFailed: (failure: Pca3dFailure) => {
              failures.push(failure);
            },
          }),
        ),
      ),
    );
    await Promise.resolve();
  });
}

/** Lets the download through, and the promises that wait for it run. */
async function arrive(): Promise<void> {
  await act(async () => {
    download.arrive(MODULE);
    await download.promise;
    await Promise.resolve();
  });
}

describe("IP8 the mount of the 3D view under StrictMode", () => {
  test("a download that arrives after StrictMode mounted the effect twice draws one plot, whose handle the panel is given", async () => {
    await draw(data("first"));
    // Asked by the effect, and again by the effect mounted again.
    expect(download.asks).toBe(2);
    expect(container.textContent).toBe(LOADING_3D);
    await arrive();
    expect(made).toHaveLength(1);
    expect(container.querySelectorAll("canvas")).toHaveLength(1);
    expect(container.textContent).toBe("");
    expect(handles.filter((handle) => handle !== null)).toHaveLength(1);
    expect(handles.at(-1)).not.toBeNull();
    expect(failures).toEqual([]);
  });

  test("new data is drawn by the plot's update, once, and the same data again is not", async () => {
    await draw(data("first"));
    await arrive();
    const second = data("second");
    await draw(second);
    await draw(second);
    expect(made[0]?.updates).toEqual([second]);
  });

  test("the browser taking the drawing away puts its words over the plot, until it gives it back", async () => {
    await draw(data("first"));
    await arrive();
    await act(async () => {
      made[0]?.events.onContextChange?.(true);
      await Promise.resolve();
    });
    expect(container.textContent).toBe(CONTEXT_LOST);
    await act(async () => {
      made[0]?.events.onContextChange?.(false);
      await Promise.resolve();
    });
    expect(container.textContent).toBe("");
  });

  test("taken off the page, the plot is destroyed and the panel is given no handle", async () => {
    await draw(data("first"));
    await arrive();
    act(() => {
      root.unmount();
    });
    root = createRoot(container);
    expect(made[0]?.destroyed).toBe(1);
    expect(container.querySelectorAll("canvas")).toHaveLength(0);
    expect(handles.at(-1)).toBeNull();
  });
});
