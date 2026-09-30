// @vitest-environment jsdom
/**
 * The options, the result and the running line of the panel of the
 * diversity (docs/specs/analyses/diversity.md, "The panel"), drawn by
 * React in <StrictMode>, as the development server draws the page:
 * StrictMode mounts each part twice, which the built site never does, so
 * a flow cannot see a focus moved by the second mount. A store that holds
 * the project and applies the commands stands for core's, and an
 * announcer that keeps what it is given for the shell's.
 */
import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  diversity,
  diversityOptions,
} from "../../../core/analyses/diversity.ts";
import { setAnalysisOptions } from "../../../core/project.ts";
import type { Project } from "../../../core/project.ts";
import type { Key } from "../../../core/keys.ts";
import type { AnalysisStatus, AppState, Store } from "../../../core/store.ts";
import { sampleProject } from "../../../core/testSupport.ts";
import type {
  DiversityResult,
  JobResult,
  Progress,
} from "../../../worker/protocol.ts";
import { AnnouncerProvider } from "../../shell/announcer.tsx";
import type { Announcer } from "../../shell/status.ts";
import { StoreProvider } from "../../store.tsx";
import { AnalysisPanel } from "../AnalysisPanel.tsx";
import { DiversityOptionsPart } from "./DiversityOptionsPart.tsx";
import { DiversityResults } from "./DiversityResults.tsx";

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
/** The state of the diversity the store gives. */
let status: AnalysisStatus<JobResult>;
let listeners: Set<() => void>;
let container: HTMLElement;
let root: Root;

/** A key of a result, as the store gives one. */
const KEY = "a key of the tests" as Key;

/** A store that holds `project` and applies commands to it, and gives
    the diversity the state `status`, for the parts of the panel, which
    read the project, the version of popnei, that state and the runs. */
function testStore(): Store<JobResult, Blob> {
  let state: Record<string, unknown> & { readonly project: Project } = {
    project,
    popneiVersion: "0.1.0-dev.3",
    analyses: [{ id: "diversity", status }],
    notice: null,
    individualsKept: null,
    runs: [],
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
  // The parts read `project`, `popneiVersion`, `analyses` and `runs` of
  // the state and call `apply` alone; the rest of a store is core's,
  // tested there.
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
  status = { kind: "ready", key: KEY };
  announced = [];
  listeners = new Set();
  // The sample project with no options of any analysis: its own options
  // of the diversity are not those of the diversity of stage 5.
  project = { ...sampleProject(), analyses: [] };
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
function draw(part: React.ReactElement): void {
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
}

/** The three number fields, in the order of the screen: the minimum, the
    threshold and the draw. */
function fields(): {
  readonly minimum: HTMLInputElement;
  readonly threshold: HTMLInputElement;
  readonly draw: HTMLInputElement;
} {
  const [minimum, threshold, drawField] = container.querySelectorAll(
    "input[data-number-field]",
  );
  if (
    !(minimum instanceof HTMLInputElement) ||
    !(threshold instanceof HTMLInputElement) ||
    !(drawField instanceof HTMLInputElement)
  ) {
    throw new Error("the three fields are not drawn");
  }
  return { minimum, threshold, draw: drawField };
}

/** The label and the description of `input`, as a screen reader reads
    them. */
function describedAs(input: HTMLInputElement): string {
  const ids = input.getAttribute("aria-describedby") ?? "";
  return ids
    .split(" ")
    .filter((id) => id !== "")
    .map((id) => document.getElementById(id)?.textContent ?? "")
    .join(" ");
}

/** The button `name`, or null. */
function button(name: string): HTMLButtonElement | null {
  return (
    [...container.querySelectorAll("button")].find(
      (b) => b.textContent === name,
    ) ?? null
  );
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

/** Focuses `input`, selects its text, types `text` over it key by key,
    and presses Enter. */
function typeAndEnter(input: HTMLInputElement, text: string): void {
  act(() => {
    input.focus();
    input.setSelectionRange(0, input.value.length);
  });
  typeKeys(input, text);
  press("Enter");
}

/** The line of the default draw of the sample project, diploid, at the
    minimum of 20. */
const DEFAULT_LINE =
  "The default: the ploidy, 2, times the minimum number of individuals, 20. The alleles and the private alleles of every population are also given for a draw of this many chromosomes, so that populations of different sizes can be compared, and the site frequency spectrum below the table is of the same draw.";

describe("PA7 D1 the options of the diversity, drawn by React", () => {
  test("the three fields with their defaults, the draw the ploidy times the minimum with its line, and no Use the default", () => {
    draw(createElement(DiversityOptionsPart));
    const { minimum, threshold, draw: drawField } = fields();
    expect(minimum.value).toBe("20");
    expect(threshold.value).toBe("0.95");
    expect(drawField.value).toBe("40");
    expect(
      [...container.querySelectorAll("label")].map((l) => l.textContent),
    ).toEqual([
      "Minimum number of individuals with a genotype, a whole number from 0",
      "Frequency of the commonest allele below which a variant is polymorphic, from 0 to 1",
      "Chromosomes drawn for the rarefaction, a whole number from 2",
    ]);
    expect(describedAs(minimum)).toBe(
      "A variant has a value in a population only when at least this many of its individuals have a called genotype there. A population with fewer individuals has no values.",
    );
    expect(describedAs(drawField)).toBe(DEFAULT_LINE);
    expect(button("Use the default")).toBeNull();
  });

  test("a minimum typed is one command, and the default draw follows it", () => {
    draw(createElement(DiversityOptionsPart));
    typeAndEnter(fields().minimum, "12");
    expect(applied).toEqual([
      "the minimum number of individuals of the diversity changed",
    ]);
    expect(diversityOptions(project)).toEqual({
      minNumIndividuals: 12,
      polyThreshold: 0.95,
      numCalledAlleles: null,
    });
    expect(fields().draw.value).toBe("24");
    expect(describedAs(fields().draw)).toContain(
      "The default: the ploidy, 2, times the minimum number of individuals, 12.",
    );
  });

  test("a threshold typed is one command, with the other options kept", () => {
    draw(createElement(DiversityOptionsPart));
    typeAndEnter(fields().threshold, "0.9");
    expect(applied).toEqual([
      "the frequency below which a variant is polymorphic changed",
    ]);
    expect(diversityOptions(project)).toEqual({
      minNumIndividuals: 20,
      polyThreshold: 0.9,
      numCalledAlleles: null,
    });
  });

  test("a draw typed is kept, says what the default would be, and Use the default by the keyboard sets it back and gives the focus to the field", () => {
    draw(createElement(DiversityOptionsPart));
    typeAndEnter(fields().draw, "96");
    expect(applied).toEqual([
      "the number of chromosomes of the rarefaction changed",
    ]);
    expect(diversityOptions(project).numCalledAlleles).toBe(96);
    expect(describedAs(fields().draw)).toBe("Typed; the default would be 40.");
    const useDefault = button("Use the default");
    expect(useDefault).not.toBeNull();
    // A change of the minimum leaves the draw typed as it is.
    typeAndEnter(fields().minimum, "30");
    expect(fields().draw.value).toBe("96");
    expect(describedAs(fields().draw)).toBe("Typed; the default would be 60.");

    act(() => {
      button("Use the default")?.focus();
    });
    press("Enter");
    expect(applied.at(-1)).toBe(
      "the number of chromosomes of the rarefaction changed",
    );
    expect(diversityOptions(project).numCalledAlleles).toBeNull();
    expect(button("Use the default")).toBeNull();
    expect(fields().draw.value).toBe("60");
    expect(document.activeElement).toBe(fields().draw);
  });

  test("the number of the default typed is kept as typed, so that the draw does not follow the minimum", () => {
    draw(createElement(DiversityOptionsPart));
    typeAndEnter(fields().draw, "40");
    expect(applied).toEqual([
      "the number of chromosomes of the rarefaction changed",
    ]);
    expect(diversityOptions(project).numCalledAlleles).toBe(40);
    expect(button("Use the default")).not.toBeNull();
    typeAndEnter(fields().minimum, "10");
    expect(fields().draw.value).toBe("40");
  });

  test("a draw typed again at its own number, or the default's left as it is, makes no command", () => {
    project = setAnalysisOptions(project, diversity, {
      minNumIndividuals: 20,
      polyThreshold: 0.95,
      numCalledAlleles: 96,
    });
    draw(createElement(DiversityOptionsPart));
    typeAndEnter(fields().draw, "96");
    expect(applied).toEqual([]);
    // Enter with nothing typed.
    act(() => {
      fields().draw.focus();
    });
    press("Enter");
    expect(applied).toEqual([]);
  });

  test("a comma typed key by key in each field is caught, said under it and announced, and nothing is sent", () => {
    draw(createElement(DiversityOptionsPart));
    const lines = [
      [
        fields().minimum,
        "2,5",
        "Write the minimum as a whole number, 20 and not 20,0; the minimum stays 20.",
      ],
      [
        fields().threshold,
        "0,9",
        "Write the decimals with a point, 0.1 and not 0,1; the frequency stays 0.95.",
      ],
      [
        fields().draw,
        "4,0",
        "Write the number of chromosomes as a whole number, 40 and not 40,0; the number of chromosomes stays 40.",
      ],
    ] as const;
    for (const [input, text, line] of lines) {
      typeAndEnter(input, text);
      expect(container.textContent).toContain(line);
      expect(announced).toContain(line);
    }
    expect(applied).toEqual([]);
    expect(diversityOptions(project)).toEqual({
      minNumIndividuals: 20,
      polyThreshold: 0.95,
      numCalledAlleles: null,
    });
    expect(fields().draw.value).toBe("40");
  });

  test("a number out of the range or off the step is refused, with what is kept", () => {
    draw(createElement(DiversityOptionsPart));
    typeAndEnter(fields().draw, "1");
    typeAndEnter(fields().threshold, "0.955");
    typeAndEnter(fields().minimum, "2.5");
    expect(applied).toEqual([]);
    expect(announced).toEqual([
      "1 is less than 2; the number of chromosomes stays 40.",
      "0.955 has more than two decimals; the frequency stays 0.95.",
      "2.5 is not a whole number; the minimum stays 20.",
    ]);
  });

  test("before the variants file is read the field of the draw is empty, and its line says where the default comes from", () => {
    const sample = project;
    if (sample.variants === null) throw new Error("no variants file");
    project = {
      ...sample,
      variants: { ...sample.variants, read: { kind: "pending" } },
    };
    draw(createElement(DiversityOptionsPart));
    expect(fields().draw.value).toBe("");
    expect(describedAs(fields().draw)).toBe(
      "The default: the ploidy of the variants file times the minimum number of individuals, 20.",
    );
  });
});

/** A result of the flow of the spec at 0.05, p0 to its end, at the draw
    `numCalledAlleles`. */
function flowResult(numCalledAlleles: number): DiversityResult {
  const three = (a: number, b: number, c: number): Float64Array =>
    Float64Array.from([a, b, c]);
  return {
    analysis: "diversity",
    pops: ["p0", "p2", "p1"],
    numIndividuals: Uint32Array.from([48, 84, 68]),
    unbiasedExpHet: three(
      0.35267894847982756,
      0.3440824705971255,
      0.3498365468860467,
    ),
    obsHet: three(0.35667985874177544, 0.3512406974637824, 0.35603713961547323),
    polyRatio: three(
      0.9288194444444444,
      0.9105902777777778,
      0.9157986111111112,
    ),
    numVarsWithValue: Uint32Array.from([1152, 1152, 1152]),
    fis: three(
      -0.011344341019483117,
      -0.020803811522959625,
      -0.017724256612463796,
    ),
    numAllelesMean: three(
      1.9791666666666667,
      1.9861111111111112,
      1.9809027777777777,
    ),
    numAllelesInDraw: three(
      1.9646163579517928,
      1.9595644507442256,
      1.9582701017879214,
    ),
    privateAllelesTotal: three(0, 1, 0),
    privateAllelesMean: three(0, 0.0008680555555555555, 0),
    privateAllelesInDraw: three(
      0.0028348059148665707,
      0.0031646710919597015,
      0.002521711046320405,
    ),
    numVarsInDraw: Uint32Array.from([1152, 1152, 1152]),
    numVarsEveryPop: 1152,
    numVarsEveryPopInDraw: 1152,
    numCalledAlleles,
    foldedSfs: [null, null, null],
    passStats: { numVars: 1152, filtering: {} },
  };
}

/** The texts of the cells of the table, row by row. */
function tableRows(): string[][] {
  return [...container.querySelectorAll("tbody tr")].map((row) =>
    [...row.children].map((cell) => cell.textContent),
  );
}

describe("PA7 D1 the table of the diversity, drawn by React", () => {
  test("eleven columns, the rarefied ones naming the draw, the row p0 to its end, and the draw beside the download", () => {
    draw(
      createElement(DiversityResults, { result: flowResult(96), check: null }),
    );
    expect(
      [...container.querySelectorAll("thead th")].map((th) => th.textContent),
    ).toEqual([
      "Population",
      "Individuals",
      "Expected heterozygosity (unbiased)",
      "Observed heterozygosity",
      "Proportion of polymorphic variants",
      "F",
      "Alleles per variant",
      "Alleles per variant, rarefied to 96 chromosomes",
      "Private alleles",
      "Private alleles per variant",
      "Private alleles per variant, rarefied to 96 chromosomes",
    ]);
    expect(tableRows()[0]).toEqual([
      "p0",
      "48",
      "0.3527",
      "0.3567",
      "0.9288",
      "−0.0113",
      "1.9792",
      "1.9646",
      "0",
      "0.0000",
      "0.0028",
    ]);
    expect(tableRows()[1]?.[8]).toBe("1");
    expect(container.textContent).toContain(
      "The diversity of each population, over the 1,152 variants of panel.nei the filters kept.",
    );
    expect(container.textContent).toContain("Rarefied to 96 chromosomes.");
    expect(container.textContent).toContain(
      "Calculated with popnei 0.1.0-dev.3",
    );
    // The line of the options of stages 2 to 4 is gone: the fields say it.
    expect(container.textContent).not.toContain("A variant counts");
  });
});

describe("PA7 D1 the diversity running, drawn by React", () => {
  /** The panel running at `progress`. */
  function running(progress: Progress | null): void {
    status = {
      kind: "running",
      key: KEY,
      runId: 7,
      progress,
      waitsForStatistics: false,
    };
    draw(createElement(AnalysisPanel, { id: "diversity" }));
  }

  test("the line names the pass of two it reads, the share of the whole run, and the three fields stay", () => {
    running({ bytesRead: 90_000, numBytes: 261_490, pass: 1, numPasses: 2 });
    expect(container.textContent).toMatch(
      /Calculating · pass 1 of 2 · 17% · 0:0\d/,
    );
    expect(container.querySelectorAll("input[data-number-field]")).toHaveLength(
      3,
    );
    act(() => {
      root.unmount();
    });
    root = createRoot(container);
    running({ bytesRead: 259_376, numBytes: 261_490, pass: 2, numPasses: 2 });
    expect(container.textContent).toMatch(
      /Calculating · pass 2 of 2 · 99% · 0:0\d/,
    );
  });

  test("a run of one pass, and one before its first progress, name no pass", () => {
    running({ bytesRead: 90_000, numBytes: 261_490, pass: 1, numPasses: 1 });
    expect(container.textContent).toMatch(/Calculating · 34% · 0:0\d/);
    expect(container.textContent).not.toContain("pass");
  });
});
