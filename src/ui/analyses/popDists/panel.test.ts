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

import { popDists, popDistsOptions } from "../../../core/analyses/popDists.ts";
import { setAnalysisOptions } from "../../../core/project.ts";
import type { Project } from "../../../core/project.ts";
import type { Key } from "../../../core/keys.ts";
import type {
  AnalysisStatus,
  AppState,
  Notice,
  Store,
} from "../../../core/store.ts";
import { sampleProject } from "../../../core/testSupport.ts";
import type {
  JobResult,
  HeatmapOrder,
  PopDistsResult,
  ShownMeasure,
} from "../../../worker/protocol.ts";
import { AnnouncerProvider } from "../../shell/announcer.tsx";
import type { Announcer } from "../../shell/status.ts";
import { StoreProvider } from "../../store.tsx";
import { AnalysisPanel } from "../AnalysisPanel.tsx";
import { PopDistsOptionsPart } from "./PopDistsOptionsPart.tsx";
import { PopDistsResults } from "./PopDistsResults.tsx";
import { Table } from "../../widgets/Table.tsx";
import type * as TableModule from "../../widgets/Table.tsx";
import { numberCells } from "./words.ts";
import type * as WordsModule from "./words.ts";

// The cells of the rows of the table are made by numberCells, and the
// table drawn by Table, each counted here
// so that a test sees when the rows are made or the table drawn again.
vi.mock("../../widgets/Table.tsx", async (importOriginal) => {
  const table = await importOriginal<typeof TableModule>();
  return { ...table, Table: vi.fn(table.Table) };
});
vi.mock("./words.ts", async (importOriginal) => {
  const words = await importOriginal<typeof WordsModule>();
  return { ...words, numberCells: vi.fn(words.numberCells) };
});

// `APP_VERSION`, which `define` of vite.config.ts writes in, as in the
// tests, is declared by pageStart.tsx, which the tests compile.
declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
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
/** The state of the distances the store gives. */
let status: AnalysisStatus<JobResult>;
let listeners: Set<() => void>;
let container: HTMLElement;
let root: Root;

/** A key of a result, as the store gives one. */
const KEY = "a key of the tests" as Key;

/** A store that holds `project` and applies commands to it, and gives
    the distances the state `status`, for the parts of the panel, which
    read the project, the version of popnei and that state alone. */
function testStore(): Store<JobResult, Blob> {
  let state: Record<string, unknown> & { readonly project: Project } = {
    project,
    popneiVersion: "0.1.0-dev.3",
    analyses: [{ id: "popDists", status }],
    notice: null,
    individualsKept: null,
    runs: [],
  };
  showNotice = (notice) => {
    state = { ...state, notice };
    for (const listener of listeners) listener();
  };
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

/** Puts `notice` in the state of the last store made, as a change of
    another analysis does, and tells the screens. */
let showNotice: (notice: Notice | null) => void = () => undefined;

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
  status = { kind: "ready", key: KEY };
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
    status = doneWith(FLOW);
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

  test("PA5 D1 with no heatmap on the page, the measure changed is announced by nothing: locked, ready, running, removed, in error and above 200 populations", () => {
    const states: readonly AnalysisStatus<JobResult>[] = [
      { kind: "locked", reason: "The distances need two populations." },
      { kind: "ready", key: KEY },
      {
        kind: "running",
        key: KEY,
        runId: 1,
        progress: null,
        waitsForStatistics: false,
        soFar: null,
      },
      { kind: "removed", key: KEY },
      {
        kind: "error",
        key: KEY,
        error: { kind: "refused", message: "no" },
        ofStatistics: false,
        waited: false,
      },
      doneWith(manyPops(201)),
    ];
    for (const shown of states) {
      status = shown;
      draw(createElement(PopDistsOptionsPart));
      act(() => {
        radio("Hudson's Fst").focus();
      });
      press("ArrowDown");
      press("ArrowUp");
      expect(applied).toHaveLength(2);
      expect(announced).toEqual([]);
      applied = [];
    }
  });

  test("a minimum typed is one command at Enter, with the measure kept", () => {
    project = setAnalysisOptions(project, popDists, {
      minNumIndividuals: 20,
      measure: "dest",
    });
    draw(createElement(PopDistsOptionsPart));
    const input = selectMinimum();
    expect(input.value).toBe("20");
    // The label the diversity's field has too, and the line that says
    // this one is for the distances alone.
    expect(
      container.querySelector(`label[for="${input.id}"]`)?.textContent,
    ).toBe(
      "Individuals with a called genotype needed in each population, per variant",
    );
    expect(
      (input.getAttribute("aria-describedby") ?? "")
        .split(" ")
        .map((id) => document.getElementById(id)?.textContent)
        .join(" "),
    ).toBe(
      "This minimum is for the distances alone: the diversity has its own.",
    );
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
    otherwise, for two populations; Jost's D ordered as `destOrder` when
    given, and as Fst otherwise. */
function resultOf(
  pops: readonly string[],
  fst: readonly number[],
  dest: readonly number[],
  order: readonly number[] | null,
  destOrder?: HeatmapOrder,
): PopDistsResult {
  const heatmapOrder: HeatmapOrder =
    order === null
      ? { kind: "file", reason: "twoPopulations" }
      : { kind: "pcoa", order: Uint32Array.from(order) };
  return {
    analysis: "popDists",
    pops,
    numIndividuals: Uint32Array.from(pops.map(() => 30)),
    fst: Float64Array.from(fst),
    dest: Float64Array.from(dest),
    numVarsPerPair: Uint32Array.from(fst.map(() => 1200)),
    order: { fst: heatmapOrder, dest: destOrder ?? heatmapOrder },
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

/** The flow's result with Jost's D in another order, p1, p2, p0. */
const OTHER_D_ORDER = resultOf(
  FLOW.pops,
  Array.from(FLOW.fst),
  Array.from(FLOW.dest),
  [1, 0, 2],
  { kind: "pcoa", order: Uint32Array.from([2, 1, 0]) },
);

/** A result ordered by the PCoA for Fst, and in the order of the file
    for Jost's D, every one of whose values is 0 or below. */
const D_ALL_ZERO = resultOf(
  FLOW.pops,
  Array.from(FLOW.fst),
  [-0.01, 0, -0.02],
  [1, 0, 2],
  { kind: "file", reason: "allZero" },
);

/** A result of `numPops` populations, `q0`, `q1`, …, every pair 0.1 and
    0.06, in the order of the file. */
function manyPops(numPops: number): PopDistsResult {
  const numPairs = (numPops * (numPops - 1)) / 2;
  return resultOf(
    Array.from({ length: numPops }, (_, i) => `q${String(i)}`),
    new Array<number>(numPairs).fill(0.1),
    new Array<number>(numPairs).fill(0.06),
    Array.from({ length: numPops }, (_, i) => i),
  );
}

/** The state of the distances done with the result `r`. */
function doneWith(r: PopDistsResult): AnalysisStatus<JobResult> {
  return { kind: "done", key: KEY, result: r, warnings: [], check: null };
}

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
      "Heatmap of Hudson's Fst between 3 populations of panel.nei, ordered so that similar ones are together: p2, p0, p1. From 0.1027, between p0 and p2, to 0.1096, between p2 and p1.",
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
      "Heatmap of Jost's D between 3 populations of panel.nei, ordered so that similar ones are together: p2, p0, p1. From 0.0613, between p0 and p2, to 0.0657, between p2 and p1.",
    );
    expect(document.activeElement).toBe(button);
    // The table shows both measures, whatever the heatmap draws.
    expect(tableRows()[0]).toEqual(["p0 and p2", "0.1027", "0.0613", "1,200"]);
  });

  test("PA5 D1 under the panel's frame, drawn again when a notice comes and goes, the table is not drawn again nor its rows made", () => {
    status = doneWith(FLOW);
    draw(createElement(AnalysisPanel, { id: "popDists" }));
    expect(heatmapSvg()).not.toBeNull();
    const drawn = vi.mocked(Table).mock.calls.length;
    const made = vi.mocked(numberCells).mock.calls.length;
    expect(drawn).toBeGreaterThanOrEqual(1);
    act(() => {
      showNotice({
        cause: { kind: "command", description: "the MAF filter changed" },
        removed: ["diversity"],
        leftBehind: [],
        stopped: ["diversity"],
        writeLeftBehind: false,
        writeStopped: false,
        writeDiscarded: false,
      });
    });
    act(() => {
      showNotice(null);
    });
    expect(vi.mocked(Table).mock.calls.length).toBe(drawn);
    expect(vi.mocked(numberCells).mock.calls.length).toBe(made);
  });

  test("PA5 D1 a change of the measure makes no row of the table again", () => {
    const store = drawResult(FLOW);
    const made = vi.mocked(numberCells).mock.calls.length;
    expect(made).toBeGreaterThanOrEqual(3);
    setMeasure(store, "dest");
    setMeasure(store, "fst");
    expect(vi.mocked(numberCells).mock.calls.length).toBe(made);
  });

  test("PA5 D1 Jost's D in its own order: the heatmap and its description follow it", () => {
    const store = drawResult(OTHER_D_ORDER);
    setMeasure(store, "dest");
    expect(heatmapSvg()?.querySelector("desc")?.textContent).toBe(
      "Heatmap of Jost's D between 3 populations of panel.nei, ordered so that similar ones are together: p1, p2, p0. From 0.0613, between p0 and p2, to 0.0657, between p2 and p1.",
    );
  });

  test("PA5 D1 each measure has the line of its own order: the PCoA for Hudson's Fst, the file for Jost's D of values 0 or below", () => {
    const store = drawResult(D_ALL_ZERO);
    const pcoaLine =
      "Ordered so that similar populations are together: by the first axis of a principal coordinate analysis of these distances.";
    const fileLine =
      "In the order of the metadata file: every distance is 0 or below, so no population is closer to one than to another.";
    expect(container.textContent).toContain(pcoaLine);
    expect(container.textContent).not.toContain(fileLine);
    setMeasure(store, "dest");
    expect(container.textContent).toContain(fileLine);
    expect(container.textContent).not.toContain(pcoaLine);
  });

  test("PA5 D1 popnei's words of an order it refused go to the console once for the result, and not to the page", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const refused = resultOf(
      FLOW.pops,
      Array.from(FLOW.fst),
      Array.from(FLOW.dest),
      [1, 0, 2],
      {
        kind: "file",
        reason: "notPlaced",
        message: "doPcoa: the individuals could not be placed",
      },
    );
    const store = drawResult(refused);
    setMeasure(store, "dest");
    drawResult(refused);
    expect(warn.mock.calls).toEqual([
      [
        "popnei could not order the heatmap of dest: doPcoa: the individuals could not be placed",
      ],
    ]);
    expect(container.textContent).not.toContain("doPcoa");
  });

  test("PA5 D1 the pair keeps each name on one line, and the line breaks only after “and”", () => {
    drawResult(FLOW);
    const spans = [...container.querySelectorAll("tbody tr")][0]
      ?.querySelector("th")
      ?.querySelectorAll("span");
    expect([...(spans ?? [])].map((span) => span.textContent)).toEqual([
      "p0 and",
      "p2",
    ]);
  });

  test("PA5 D1 the cell of the pair writes its names escaped, as the text of the row does", () => {
    drawResult(resultOf(["p1‮", "p2"], [0.1096], [0.0657], null));
    expect(container.querySelector("tbody th")?.textContent).toBe(
      "p1\\u202e and p2",
    );
  });

  test("two populations have no line of order", () => {
    drawResult(resultOf(["p2", "p1"], [0.1096], [0.0657], null));
    expect(heatmapSvg()).not.toBeNull();
    expect(container.textContent).not.toContain("Ordered");
    expect(container.textContent).not.toContain("In the order");
  });

  test("above 200 populations, the line that says so and the download, and neither the heatmap nor the table", () => {
    drawResult(manyPops(201));
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
