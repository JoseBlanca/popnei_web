// @vitest-environment jsdom
/**
 * The options and the result of the panel of the LD decay
 * (docs/specs/analyses/ldDecay.md, "The panel"), drawn by React in
 * <StrictMode>, as the development server draws the page: StrictMode
 * mounts each part twice, which the built site never does, so a flow
 * cannot see a plot left twice. A store that holds the project and applies
 * the commands stands for core's, and an announcer that keeps what it is
 * given for the shell's. jsdom lays nothing out, so what the plot draws
 * in a browser is the flows'.
 */
import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ldDecay, ldDecayOptions } from "../../../core/analyses/ldDecay.ts";
import type { Key } from "../../../core/keys.ts";
import { setAnalysisOptions } from "../../../core/project.ts";
import type { Project } from "../../../core/project.ts";
import type {
  AnalysisStatus,
  AppState,
  Notice,
  Store,
} from "../../../core/store.ts";
import { sampleProject } from "../../../core/testSupport.ts";
import type { JobResult, LdDecayResult } from "../../../worker/protocol.ts";
import { AnnouncerProvider } from "../../shell/announcer.tsx";
import type { Announcer } from "../../shell/status.ts";
import { StoreProvider } from "../../store.tsx";
import { Table } from "../../widgets/Table.tsx";
import type * as TableModule from "../../widgets/Table.tsx";
import { AnalysisPanel } from "../AnalysisPanel.tsx";
import { LdDecayOptionsPart } from "./LdDecayOptionsPart.tsx";
import { LdDecayResults } from "./LdDecayResults.tsx";

// The table drawn by Table is counted here, so that a test sees when a
// table is drawn again.
vi.mock("../../widgets/Table.tsx", async (importOriginal) => {
  const table = await importOriginal<typeof TableModule>();
  return { ...table, Table: vi.fn(table.Table) };
});

declare global {
  // The version of the application, `APP_VERSION`, which the result
  // reads, is declared for the tests by the test of the panel of the
  // distances between populations.
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
/** The state of the LD decay the store gives. */
let status: AnalysisStatus<JobResult>;
let listeners: Set<() => void>;
let container: HTMLElement;
let root: Root;

/** A key of a result, as the store gives one. */
const KEY = "a key of the tests" as Key;

/** Puts `notice` in the state of the last store made, as a change of
    another analysis does, and tells the screens. */
let showNotice: (notice: Notice | null) => void = () => undefined;

/** A store that holds `project` and applies commands to it, and gives
    the LD decay the state `status`, for the parts of the panel, which
    read the project, the version of popnei and that state alone. */
function testStore(): Store<JobResult, Blob> {
  let state: Record<string, unknown> & { readonly project: Project } = {
    project,
    popneiVersion: "0.1.0-dev.3",
    analyses: [{ id: "ldDecay", status }],
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

/** An announcer that keeps what it is given. */
const ANNOUNCER = {
  announce: (text: string) => {
    announced.push(text);
  },
} as unknown as Announcer;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("ResizeObserver", QuietObserver);
  // jsdom gives every element a size of 0, at which the plot draws no
  // legend: the element of the plot is 600 by 375, as in the tests of
  // the line plot.
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(600);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(375);
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

/** The inputs of the two fields, the distance and then the frequency. */
function fields(): readonly [HTMLInputElement, HTMLInputElement] {
  const [distance, frequency] = container.querySelectorAll<HTMLInputElement>(
    "input[data-number-field]",
  );
  if (distance === undefined || frequency === undefined) {
    throw new Error("the panel has not its two fields");
  }
  return [distance, frequency];
}

/** Focuses `input` and selects its text. */
function select(input: HTMLInputElement): HTMLInputElement {
  act(() => {
    input.focus();
    input.setSelectionRange(0, input.value.length);
  });
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

/** The reason of the distance not typed. */
const NO_DISTANCE =
  "The LD decay needs the largest distance between the two variants of a pair. It has no default, because it depends on how far linkage disequilibrium extends in the genome of your species. Type a distance in base pairs.";

/** The line of the LD pruning of the Variants step. */
const PRUNING =
  "The LD pruning of the Variants step is not applied here: it removes the pairs of variants in LD that this analysis measures. The other filters of the Variants step are.";

describe("PA8 the options of the LD decay, drawn by React", () => {
  test("the distance is empty until typed, with the reason of the lock beside it, which describes the field before the line under it; the frequency shows 0.95", () => {
    draw(createElement(LdDecayOptionsPart));
    const [distance, frequency] = fields();
    expect(distance.value).toBe("");
    expect(frequency.value).toBe("0.95");
    expect(
      [...container.querySelectorAll("label")].map((l) => l.textContent),
    ).toEqual([
      "Largest distance between the two variants of a pair, in base pairs, from 50",
      "Maximum major allele frequency in each population, from 0.5 to 1",
    ]);
    const described = (distance.getAttribute("aria-describedby") ?? "")
      .split(" ")
      .map((id) => document.getElementById(id)?.textContent);
    expect(described).toEqual([
      NO_DISTANCE,
      "How far to look for pairs. Choose a distance beyond which you expect little LD in your species; the half distance of the result shows whether it was far enough.",
    ]);
    expect(
      document.getElementById(frequency.getAttribute("aria-describedby") ?? "")
        ?.textContent,
    ).toBe(
      "A variant is left out of a population where its commonest allele is more frequent than this, since the r² of a variant that hardly varies rests on one or two individuals.",
    );
  });

  test("no key sends anything while the distance is empty: the arrows, Page Up and Down, Home, End, Enter and the Tab key leave it empty and the project as it was", () => {
    draw(createElement(LdDecayOptionsPart));
    const [distance] = fields();
    select(distance);
    for (const key of [
      "ArrowUp",
      "ArrowDown",
      "PageUp",
      "PageDown",
      "Home",
      "End",
      "Enter",
      "Tab",
    ]) {
      press(key);
      expect(distance.value).toBe("");
    }
    act(() => {
      distance.blur();
    });
    expect(distance.value).toBe("");
    expect(applied).toEqual([]);
    expect(ldDecayOptions(project).maxDist).toBeNull();
    expect(container.textContent).toContain(NO_DISTANCE);
  });

  test("a distance typed is one command at Enter, with the frequency kept, and the reason goes", () => {
    project = setAnalysisOptions(project, ldDecay, {
      maxDist: null,
      maxAllowedMaf: 0.8,
    });
    draw(createElement(LdDecayOptionsPart));
    const [distance] = fields();
    select(distance);
    typeKeys(distance, "100000");
    expect(applied).toEqual([]);
    press("Enter");
    expect(applied).toEqual(["the largest distance of the LD decay changed"]);
    expect(ldDecayOptions(project)).toEqual({
      maxDist: 100_000,
      maxAllowedMaf: 0.8,
    });
    expect(container.textContent).not.toContain(NO_DISTANCE);
    expect(fields()[0].value).toBe("100000");
  });

  test("a comma typed key by key in the empty distance is caught, said under the field and announced, and nothing is sent", () => {
    draw(createElement(LdDecayOptionsPart));
    const [distance] = fields();
    select(distance);
    typeKeys(distance, "10,000");
    press("Enter");
    expect(applied).toEqual([]);
    const line =
      "Write the distance as a whole number of base pairs, 10000 and not 10,000; the distance is still to be typed.";
    expect(container.textContent).toContain(line);
    expect(announced).toContain(line);
    expect(ldDecayOptions(project).maxDist).toBeNull();
    expect(distance.value).toBe("");
  });

  test("the distance is a whole number from 50: 49 and 2000.5 are refused, and the distance typed before stays", () => {
    project = setAnalysisOptions(project, ldDecay, {
      maxDist: 100_000,
      maxAllowedMaf: 0.95,
    });
    draw(createElement(LdDecayOptionsPart));
    const [distance] = fields();
    select(distance);
    typeKeys(distance, "49");
    press("Enter");
    expect(container.textContent).toContain(
      "49 is less than 50; the distance stays 100000.",
    );
    select(distance);
    typeKeys(distance, "2000.5");
    press("Enter");
    expect(container.textContent).toContain(
      "2000.5 is not a whole number; the distance stays 100000.",
    );
    expect(applied).toEqual([]);
    expect(distance.value).toBe("100000");
    select(distance);
    typeKeys(distance, "50");
    press("Enter");
    expect(ldDecayOptions(project).maxDist).toBe(50);
  });

  test("the frequency is a number from 0.5 to 1 of two decimals: 0,9 typed key by key, 0.4, 1.1 and 0.955 are refused with the frequency kept, and 0.8 is one command with the distance kept", () => {
    project = setAnalysisOptions(project, ldDecay, {
      maxDist: 100_000,
      maxAllowedMaf: 0.95,
    });
    draw(createElement(LdDecayOptionsPart));
    const [, frequency] = fields();
    const refused: readonly (readonly [string, string])[] = [
      [
        "0,9",
        "Write the decimals with a point, 0.9 and not 0,9; the frequency stays 0.95.",
      ],
      ["0.4", "0.4 is less than 0.5; the frequency stays 0.95."],
      ["1.1", "1.1 is more than 1; the frequency stays 0.95."],
      ["0.955", "0.955 has more than two decimals; the frequency stays 0.95."],
    ];
    for (const [typed, line] of refused) {
      select(frequency);
      typeKeys(frequency, typed);
      press("Enter");
      expect(container.textContent).toContain(line);
      expect(announced).toContain(line);
      expect(frequency.value).toBe("0.95");
    }
    expect(applied).toEqual([]);
    select(frequency);
    typeKeys(frequency, "0.8");
    press("Enter");
    expect(applied).toEqual([
      "the maximum major allele frequency of the LD decay changed",
    ]);
    expect(ldDecayOptions(project)).toEqual({
      maxDist: 100_000,
      maxAllowedMaf: 0.8,
    });
  });

  test("the line of the LD pruning stands under the options while the pruning of the Variants step is on, with or without its distance, and not otherwise", () => {
    draw(createElement(LdDecayOptionsPart));
    expect(container.textContent).not.toContain(PRUNING);
    for (const maxDist of [50_000, null]) {
      project = {
        ...sampleProject(),
        filters: [
          { kind: "missing_data", maxAllowedMissingRate: 0.1 },
          { kind: "ld", maxAllowedR2: 0.1, maxDist },
        ],
      };
      draw(createElement(LdDecayOptionsPart));
      expect(container.lastElementChild?.lastElementChild?.textContent).toBe(
        PRUNING,
      );
    }
  });
});

/** The number of bins of a result. */
const NUM_BINS = 50;

/**
 * A result of the populations `pops`, of 50 individuals each, over a
 * largest distance of 100,000 bp: 50 bins of 2,000 bp, each with 10 pairs
 * of a mean r² that falls from 0.3, but the bins of the populations
 * `noPair`, which have none; the curve of ld.nei's pop_a for every
 * population with pairs.
 */
function resultOf(
  pops: readonly string[],
  noPair: readonly string[] = [],
): LdDecayResult {
  const numPairs: number[] = [];
  const meanR2: number[] = [];
  const sdR2: number[] = [];
  for (const pop of pops) {
    for (let bin = 0; bin < NUM_BINS; bin++) {
      const has = !noPair.includes(pop);
      numPairs.push(has ? 10 : 0);
      meanR2.push(has ? 0.3 / (1 + bin) : Number.NaN);
      sdR2.push(has ? 0.25 : Number.NaN);
    }
  }
  const perPop = (value: number): Float64Array =>
    Float64Array.from(
      pops.map((pop) => (noPair.includes(pop) ? Number.NaN : value)),
    );
  return {
    analysis: "ldDecay",
    pops,
    numIndividuals: Uint32Array.from(pops.map(() => 50)),
    numVars: Float64Array.from(pops.map(() => 432)),
    smallestDist: Float64Array.from(
      { length: NUM_BINS },
      (_, bin) => bin * 2000 + 1,
    ),
    largestDist: Float64Array.from(
      { length: NUM_BINS },
      (_, bin) => (bin + 1) * 2000,
    ),
    numPairs: Float64Array.from(numPairs),
    meanR2: Float64Array.from(meanR2),
    sdR2: Float64Array.from(sdR2),
    rhoPerBp: perPop(0.00029996668947275404),
    r2AtZero: perPop(0.46942148760330576),
    halfDist: perPop(7548.08187836982),
    passStats: {
      numVars: 500,
      filtering: { missing_data: { varsProcessed: 500, varsKept: 500 } },
    },
  };
}

/** The result of two populations. */
const TWO = resultOf(["pop_a", "pop_b"]);

/** The names of `count` populations, q0, q1, … */
function names(count: number): readonly string[] {
  return Array.from({ length: count }, (_, i) => `q${String(i)}`);
}

/** The state of the LD decay done with the result `r`. */
function doneWith(r: LdDecayResult): AnalysisStatus<JobResult> {
  return { kind: "done", key: KEY, result: r, warnings: [], check: null };
}

/** Draws the result `r` with no comparison, in a project whose largest
    distance is 100,000 bp. */
function drawResult(r: LdDecayResult): Store<JobResult, Blob> {
  project = setAnalysisOptions(project, ldDecay, {
    maxDist: 100_000,
    maxAllowedMaf: 0.95,
  });
  return draw(createElement(LdDecayResults, { result: r, check: null }));
}

/** The texts of the cells of the table drawn, row by row. */
function tableRows(): string[][] {
  return [...container.querySelectorAll("tbody tr")].map((row) =>
    [...row.children].map((cell) => cell.textContent),
  );
}

/** The labels of the tabs, and the one selected. */
function tabs(): readonly HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>('[role="tab"]')];
}

/** Chooses the tab `name` with the keyboard: the focus on the tab
    selected, and the arrow key towards the other. */
function chooseTab(name: string): void {
  const selected = tabs().find(
    (tab) => tab.getAttribute("aria-selected") === "true",
  );
  act(() => {
    selected?.focus();
  });
  press(selected?.textContent === name ? "Enter" : "ArrowRight");
  const now = tabs().find(
    (tab) => tab.getAttribute("aria-selected") === "true",
  );
  if (now?.textContent !== name) press("ArrowLeft");
}

describe("PA8 the result of the LD decay, drawn by React", () => {
  test("one plot, selected in its tabs, with its title, its description and a row of the legend for each population; the table of the populations; and the two downloads with the line of the versions", () => {
    drawResult(TWO);
    expect(tabs().map((tab) => tab.textContent)).toEqual([
      "Plot",
      "Table of the bins",
    ]);
    expect(tabs()[0]?.getAttribute("aria-selected")).toBe("true");
    expect(
      container.querySelector('[role="tablist"]')?.getAttribute("aria-label"),
    ).toBe("Mean r² against the distance");
    expect(container.querySelectorAll("svg")).toHaveLength(1);
    const svg = container.querySelector("svg");
    expect(svg?.querySelector("title")?.textContent).toBe("LD decay");
    expect(svg?.querySelector("desc")?.textContent).toBe(
      "The mean r² of pairs of variants against their distance, in 50 bins up to 100,000 base pairs, for 2 populations, with the curve fitted to each. The curve falls to half at 7,548 bp in pop_a and 7,548 bp in pop_b.",
    );
    expect(
      [...container.querySelectorAll(".chart-legend-row text")].map(
        (text) => text.textContent,
      ),
    ).toEqual(["pop_a · half at 7,548 bp", "pop_b · half at 7,548 bp"]);
    expect(container.textContent).toContain(
      "The LD decay of each population, over the 500 variants of panel.nei the filters kept, pairs up to 100,000 base pairs apart.",
    );
    expect(
      [...container.querySelectorAll("thead th")].map((th) => th.textContent),
    ).toEqual([
      "Population",
      "Individuals",
      "Variants",
      "Pairs",
      "Half distance (bp)",
      "r² at distance 0, of the curve",
      "4Nr per base pair",
    ]);
    expect(tableRows()).toEqual([
      ["pop_a", "50", "432", "500", "7,548", "0.4694", "0.000300"],
      ["pop_b", "50", "432", "500", "7,548", "0.4694", "0.000300"],
    ]);
    expect(container.querySelector("tbody th")?.getAttribute("scope")).toBe(
      "row",
    );
    expect(
      [...container.querySelectorAll("button")].map((b) => b.textContent),
    ).toEqual([
      "Download the table of the populations as CSV",
      "Download the table of the bins as CSV",
    ]);
    expect(container.textContent).toContain(
      "Calculated with popnei 0.1.0-dev.3",
    );
    expect(container.textContent).not.toContain("The plot draws the first");
  });

  test("the tab of the table shows the bins of every population, 50 rows each with the population as the header of its row, in place of the plot; the tab of the plot draws one plot again", () => {
    drawResult(resultOf(["pop_a", "pop_b"], ["pop_b"]));
    chooseTab("Table of the bins");
    expect(tabs()[1]?.getAttribute("aria-selected")).toBe("true");
    expect(container.querySelectorAll("svg")).toHaveLength(0);
    const [bins, populations] = container.querySelectorAll("table");
    expect(populations).toBeDefined();
    expect(
      [...(bins?.querySelectorAll("thead th") ?? [])].map(
        (th) => th.textContent,
      ),
    ).toEqual([
      "Population",
      "From (bp)",
      "To (bp)",
      "Pairs",
      "Mean r²",
      "Standard deviation of r²",
    ]);
    const rows = [...(bins?.querySelectorAll("tbody tr") ?? [])].map((row) =>
      [...row.children].map((cell) => cell.textContent),
    );
    expect(rows).toHaveLength(100);
    expect(rows[0]).toEqual(["pop_a", "1", "2,000", "10", "0.3000", "0.2500"]);
    expect(rows[49]).toEqual([
      "pop_a",
      "98,001",
      "100,000",
      "10",
      "0.0060",
      "0.2500",
    ]);
    expect(rows[50]).toEqual([
      "pop_b",
      "1",
      "2,000",
      "0",
      "no pair",
      "no pair",
    ]);
    expect(bins?.querySelector("tbody th")?.getAttribute("scope")).toBe("row");
    expect(container.textContent).toContain(
      "The 50 bins of each population by the distance between the two variants of a pair, up to 100,000 base pairs: the pairs in each bin, their mean r² and its standard deviation.",
    );
    chooseTab("Plot");
    expect(container.querySelectorAll("svg")).toHaveLength(1);
    expect(container.querySelectorAll("table")).toHaveLength(1);
  });

  test("past 16 populations the plot draws the first 16, the line under it says so, and the table holds all 17", () => {
    drawResult(resultOf(names(17)));
    expect(
      [...container.querySelectorAll(".chart-legend-row text")].map(
        (text) => text.textContent.split(" · ")[0],
      ),
    ).toEqual(names(16));
    expect(container.textContent).toContain(
      "The plot draws the first 16 of the 17 populations, in the order of the table. The tables below hold all 17.",
    );
    expect(tableRows().map((row) => row[0])).toEqual(names(17));
  });

  test("with 16 populations there is no line under the plot", () => {
    drawResult(resultOf(names(16)));
    expect(container.querySelectorAll(".chart-legend-row")).toHaveLength(16);
    expect(container.textContent).not.toContain("The plot draws the first");
  });

  test("the comparison with the check numbers of a project file is drawn under the table of the populations", () => {
    project = setAnalysisOptions(project, ldDecay, {
      maxDist: 100_000,
      maxAllowedMaf: 0.95,
    });
    draw(
      createElement(LdDecayResults, {
        result: TWO,
        check: "The numbers are those of the project file.",
      }),
    );
    expect(container.querySelector("table")?.closest("div")).not.toBeNull();
    expect(container.textContent).toContain(
      "The numbers are those of the project file.",
    );
  });

  test("under the panel's frame, drawn again when a notice comes and goes, the plot is the same SVG and the table of the populations is not drawn again", () => {
    project = setAnalysisOptions(project, ldDecay, {
      maxDist: 100_000,
      maxAllowedMaf: 0.95,
    });
    status = doneWith(TWO);
    draw(createElement(AnalysisPanel, { id: "ldDecay" }));
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    const marks = svg?.querySelector(".chart-marks")?.innerHTML;
    const drawn = vi.mocked(Table).mock.calls.length;
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
    expect(container.querySelector("svg")).toBe(svg);
    expect(svg?.querySelector(".chart-marks")?.innerHTML).toBe(marks);
    expect(vi.mocked(Table).mock.calls.length).toBe(drawn);
  });

  test("new data are drawn in the same plot, updated and not made again: one SVG, the same element, with the new description", () => {
    const store = drawResult(TWO);
    const svg = container.querySelector("svg");
    act(() => {
      store.apply("the largest distance of the LD decay changed", (p) =>
        setAnalysisOptions(p, ldDecay, {
          maxDist: 200_000,
          maxAllowedMaf: 0.95,
        }),
      );
    });
    expect(container.querySelectorAll("svg")).toHaveLength(1);
    expect(container.querySelector("svg")).toBe(svg);
    expect(svg?.querySelector("desc")?.textContent).toContain(
      "up to 200,000 base pairs",
    );
  });

  test("a result of another analysis, or one shown with no largest distance, is a defect", () => {
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    expect(() =>
      draw(createElement(LdDecayResults, { result: TWO, check: null })),
    ).toThrow(/popnei_web defect: a result of the LD decay is shown with no/);
    error.mockRestore();
  });
});
