// @vitest-environment jsdom
/**
 * The options and the result of the panel of the distances between
 * populations (docs/specs/analyses/popDists.md, "The panel"), drawn by
 * React in <StrictMode>, as the development server draws the page:
 * StrictMode mounts each part twice, which the built site never does, so
 * a flow cannot see a heatmap left twice or a focus moved by the second
 * mount. A store that holds the project and applies the commands stands
 * for core's, and an announcer that keeps what it is given for the
 * shell's. jsdom lays nothing out, so what the heatmap draws in a
 * browser is the flows'.
 */
import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  popDists,
  popDistsDescription,
  popDistsOptions,
} from "../../../core/analyses/popDists.ts";
import { setAnalysisOptions } from "../../../core/project.ts";
import type { Project } from "../../../core/project.ts";
import type { AppState, Store } from "../../../core/store.ts";
import { sampleProject } from "../../../core/testSupport.ts";
import type {
  JobResult,
  PopDistsResult,
  ShownMeasure,
} from "../../../worker/protocol.ts";
import { AnnouncerProvider } from "../../shell/announcer.tsx";
import type { Announcer } from "../../shell/status.ts";
import { StoreProvider } from "../../store.tsx";
import { PopDistsOptionsPart } from "./PopDistsOptionsPart.tsx";
import { PopDistsResults } from "./PopDistsResults.tsx";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
  /** The version of the application, which `define` of vite.config.ts
      writes in, as in the tests; declared by the entry of the page,
      which the tests do not compile. */
  const APP_VERSION: string;
}

/** A ResizeObserver that reports nothing: jsdom has none. */
class QuietObserver {
  observe(): void {
    // jsdom lays nothing out, so there is no size to report
  }
  unobserve(): void {
    // nothing observed
  }
  disconnect(): void {
    // nothing to disconnect
  }
}

/** The commands applied to the store, with their descriptions. */
let applied: string[];
/** The texts announced. */
let announced: string[];
let project: Project;
let listeners: Set<() => void>;
let container: HTMLElement;
let root: Root;

/** A store that holds `project` and applies commands to it, for the
    parts of the panel, which read the project and the version of popnei
    alone. */
function testStore(): Store<JobResult, Blob> {
  let state = { project, popneiVersion: "0.1.0-dev.3" };
  const store = {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    apply: (description: string, command: (p: Project) => Project) => {
      applied.push(description);
      project = command(state.project);
      state = { ...state, project };
      for (const listener of listeners) listener();
    },
  };
  // The parts read `project` and `popneiVersion` of the state and call
  // `apply` alone; the rest of a store is core's, tested there.
  return store as unknown as Store<JobResult, Blob> & {
    getState: () => AppState<JobResult, Blob>;
  };
}

/** An announcer that keeps what it is given. */
const ANNOUNCER = {
  announce: (text: string) => {
    announced.push(text);
  },
} as unknown as Announcer;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("ResizeObserver", QuietObserver);
  applied = [];
  announced = [];
  listeners = new Set();
  project = sampleProject();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Draws `part` in <StrictMode>, under the test store and announcer. */
function draw(part: React.ReactElement): Store<JobResult, Blob> {
  const store = testStore();
  act(() => {
    root.render(
      createElement(
        StrictMode,
        null,
        createElement(
          StoreProvider,
          { value: store },
          createElement(AnnouncerProvider, { value: ANNOUNCER }, part),
        ),
      ),
    );
  });
  return store;
}

/** The input of the radio button `name`. */
function radio(name: string): HTMLInputElement {
  const found = [...container.querySelectorAll("label")].find(
    (label) => label.textContent === name,
  );
  const input = found?.querySelector("input");
  if (input === null || input === undefined) {
    throw new Error(`no radio button ${name}`);
  }
  return input;
}

/** The input of the field of the minimum. */
function minimumField(): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>(
    "input[data-number-field]",
  );
  if (input === null) throw new Error("no field of the minimum");
  return input;
}

/** Presses `key` on the element that has the focus. */
function press(key: string): void {
  act(() => {
    document.activeElement?.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
    );
    document.activeElement?.dispatchEvent(
      new KeyboardEvent("keyup", { key, bubbles: true, cancelable: true }),
    );
  });
}

/** Types `text` into `input` key by key over its selection, as a
    browser does: each character is offered in a `beforeinput`, and put
    in the text, with an `input`, unless the event was cancelled. */
function typeKeys(input: HTMLInputElement, text: string): void {
  // The setter of the prototype, which React's tracker of the value does
  // not see, so that React takes the text for one the user typed.
  // eslint-disable-next-line @typescript-eslint/unbound-method -- called below with the input, by call
  const setValue = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  for (const character of text) {
    act(() => {
      const offered = input.dispatchEvent(
        new InputEvent("beforeinput", {
          data: character,
          inputType: "insertText",
          bubbles: true,
          cancelable: true,
        }),
      );
      if (!offered) return;
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? start;
      const next = `${input.value.slice(0, start)}${character}${input.value.slice(end)}`;
      setValue?.call(input, next);
      input.setSelectionRange(start + 1, start + 1);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
}

/** Focuses the field of the minimum and selects its text. */
function selectMinimum(): HTMLInputElement {
  const input = minimumField();
  act(() => {
    input.focus();
    input.setSelectionRange(0, input.value.length);
  });
  return input;
}

describe("PA5 the options of the distances, drawn by React", () => {
  test("the measure chosen with an arrow key is one command, announced as the heatmap drawn, with the minimum kept, and the focus stays on the radio buttons", () => {
    project = setAnalysisOptions(project, popDists, {
      minNumIndividuals: 12,
      measure: "fst",
    });
    draw(createElement(PopDistsOptionsPart));
    const fst = radio("Hudson's Fst");
    expect(fst.checked).toBe(true);
    act(() => {
      fst.focus();
    });
    press("ArrowDown");
    const dest = radio("Jost's D");
    expect(dest.checked).toBe(true);
    expect(applied).toEqual(["the distance the heatmap draws changed"]);
    expect(popDistsOptions(project)).toEqual({
      minNumIndividuals: 12,
      measure: "dest",
    });
    expect(announced).toEqual(["Heatmap of Jost's D"]);
    expect(document.activeElement).toBe(dest);
    press("ArrowUp");
    expect(announced).toEqual([
      "Heatmap of Jost's D",
      "Heatmap of Hudson's Fst",
    ]);
    expect(document.activeElement).toBe(radio("Hudson's Fst"));
  });

  test("a minimum typed is one command at Enter, with the measure kept", () => {
    project = setAnalysisOptions(project, popDists, {
      minNumIndividuals: 20,
      measure: "dest",
    });
    draw(createElement(PopDistsOptionsPart));
    const input = selectMinimum();
    expect(input.value).toBe("20");
    typeKeys(input, "12");
    expect(applied).toEqual([]);
    press("Enter");
    expect(applied).toEqual([
      "the minimum number of individuals of the distances changed",
    ]);
    expect(popDistsOptions(project)).toEqual({
      minNumIndividuals: 12,
      measure: "dest",
    });
  });

  test("a comma typed key by key is caught, said under the field and announced, and nothing is sent", () => {
    draw(createElement(PopDistsOptionsPart));
    const input = selectMinimum();
    typeKeys(input, "2,5");
    press("Enter");
    expect(applied).toEqual([]);
    const line =
      "Write the minimum as a whole number, 20 and not 20,0; the minimum stays 20.";
    expect(container.textContent).toContain(line);
    expect(announced).toContain(line);
    expect(popDistsOptions(project).minNumIndividuals).toBe(20);
    expect(input.value).toBe("20");
  });

  test("a whole number is asked for: 2.5 is refused, and the minimum stays", () => {
    draw(createElement(PopDistsOptionsPart));
    const input = selectMinimum();
    typeKeys(input, "2.5");
    press("Enter");
    expect(applied).toEqual([]);
    expect(container.textContent).toContain(
      "2.5 is not a whole number; the minimum stays 20.",
    );
  });
});

/** The counts of the pass of the flow: the 1,200 variants kept. */
const FLOW_PASS = {
  numVars: 1200,
  filtering: { missing_data: { varsProcessed: 1200, varsKept: 1200 } },
} as const;

/** A result of `pops` with `fst` and `dest` for each pair, ordered by
    the PCoA as `order` when given, and in the order of the file
    otherwise, for two populations. */
function resultOf(
  pops: readonly string[],
  fst: readonly number[],
  dest: readonly number[],
  order: readonly number[] | null,
): PopDistsResult {
  const heatmapOrder =
    order === null
      ? ({ kind: "file", reason: "twoPopulations" } as const)
      : ({ kind: "pcoa", order: Uint32Array.from(order) } as const);
  return {
    analysis: "popDists",
    pops,
    numIndividuals: Uint32Array.from(pops.map(() => 30)),
    fst: Float64Array.from(fst),
    dest: Float64Array.from(dest),
    numVarsPerPair: Uint32Array.from(fst.map(() => 1200)),
    order: { fst: heatmapOrder, dest: heatmapOrder },
    leftOut: [],
    passStats: FLOW_PASS,
  };
}

/** The result of the flow of popDists.md, ordered p2, p0, p1. */
const FLOW = resultOf(
  ["p0", "p2", "p1"],
  [0.10273588423661377, 0.10496244498389443, 0.10962148955018115],
  [0.06129813142463423, 0.06354346296076403, 0.06567052128821259],
  [1, 0, 2],
);

/** Draws the result `r` with no comparison. */
function drawResult(r: PopDistsResult): Store<JobResult, Blob> {
  return draw(createElement(PopDistsResults, { result: r, check: null }));
}

/** The SVG of the heatmap, if drawn. */
function heatmapSvg(): SVGSVGElement | null {
  return container.querySelector("svg");
}

/** The texts of the cells of the table, row by row. */
function tableRows(): string[][] {
  return [...container.querySelectorAll("tbody tr")].map((row) =>
    [...row.children].map((cell) => cell.textContent),
  );
}

/** Sets the measure of the project in `store`, as the radio buttons do. */
function setMeasure(
  store: Store<JobResult, Blob>,
  measure: ShownMeasure,
): void {
  act(() => {
    store.apply("the distance the heatmap draws changed", (p) =>
      setAnalysisOptions(p, popDists, {
        minNumIndividuals: popDistsOptions(p).minNumIndividuals,
        measure,
      }),
    );
  });
}

describe("PA5 the result of the distances, drawn by React", () => {
  test("one heatmap of the measure, with its description, its line of order, the table of the pairs and the download", () => {
    drawResult(FLOW);
    expect(container.querySelectorAll("svg")).toHaveLength(1);
    expect(heatmapSvg()?.querySelector("title")?.textContent).toBe(
      "Hudson's Fst between populations",
    );
    expect(heatmapSvg()?.querySelector("desc")?.textContent).toBe(
      popDistsDescription(FLOW, "fst", "panel.nei"),
    );
    expect(container.textContent).toContain(
      "Ordered so that similar populations are together: by the first axis of a principal coordinate analysis of these distances.",
    );
    expect(container.textContent).toContain(
      "Distances between the populations of panel.nei, over the 1,200 variants the filters kept.",
    );
    expect(
      [...container.querySelectorAll("thead th")].map((th) => th.textContent),
    ).toEqual(["Pair", "Hudson's Fst", "Jost's D", "Variants"]);
    expect(tableRows()).toEqual([
      ["p0 and p2", "0.1027", "0.0613", "1,200"],
      ["p0 and p1", "0.1050", "0.0635", "1,200"],
      ["p2 and p1", "0.1096", "0.0657", "1,200"],
    ]);
    expect(container.querySelector("tbody th")?.getAttribute("scope")).toBe(
      "row",
    );
    expect(
      [...container.querySelectorAll("button")].map((b) => b.textContent),
    ).toEqual(["Download the table as CSV"]);
    expect(container.textContent).toContain(
      "Calculated with popnei 0.1.0-dev.3",
    );
  });

  test("a change of the measure draws the other heatmap in the same SVG, and leaves the focus where it was", () => {
    const store = drawResult(FLOW);
    const svg = heatmapSvg();
    const button = container.querySelector("button");
    act(() => {
      button?.focus();
    });
    setMeasure(store, "dest");
    expect(heatmapSvg()).toBe(svg);
    expect(container.querySelectorAll("svg")).toHaveLength(1);
    expect(svg?.querySelector("title")?.textContent).toBe(
      "Jost's D between populations",
    );
    expect(svg?.querySelector("desc")?.textContent).toBe(
      popDistsDescription(FLOW, "dest", "panel.nei"),
    );
    expect(document.activeElement).toBe(button);
    // The table shows both measures, whatever the heatmap draws.
    expect(tableRows()[0]).toEqual(["p0 and p2", "0.1027", "0.0613", "1,200"]);
  });

  test("two populations have no line of order", () => {
    drawResult(resultOf(["p2", "p1"], [0.1096], [0.0657], null));
    expect(heatmapSvg()).not.toBeNull();
    expect(container.textContent).not.toContain("Ordered");
    expect(container.textContent).not.toContain("In the order");
  });

  test("above 200 populations, the line that says so and the download, and neither the heatmap nor the table", () => {
    const numPops = 201;
    const numPairs = (numPops * (numPops - 1)) / 2;
    drawResult(
      resultOf(
        Array.from({ length: numPops }, (_, i) => `q${String(i)}`),
        new Array<number>(numPairs).fill(0.1),
        new Array<number>(numPairs).fill(0.06),
        Array.from({ length: numPops }, (_, i) => i),
      ),
    );
    expect(container.textContent).toContain(
      "The heatmap and the table are shown for up to 200 populations, and this result has 201. Download the table as CSV to read it.",
    );
    expect(heatmapSvg()).toBeNull();
    expect(container.querySelector("table")).toBeNull();
    expect(
      [...container.querySelectorAll("button")].map((b) => b.textContent),
    ).toEqual(["Download the table as CSV"]);
  });

  test("the heatmap leaves nothing behind when the result leaves the page", () => {
    drawResult(FLOW);
    expect(heatmapSvg()).not.toBeNull();
    act(() => {
      root.render(createElement("div"));
    });
    expect(heatmapSvg()).toBeNull();
    expect(container.querySelector(".chart-tooltip")).toBeNull();
  });
});
