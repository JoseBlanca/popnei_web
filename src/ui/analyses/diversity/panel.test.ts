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
import type {
  AnalysisStatus,
  AppState,
  Notice,
  Store,
} from "../../../core/store.ts";
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
import { noSpectrumLine } from "./spectrumWords.ts";
import type * as SpectrumWordsModule from "./spectrumWords.ts";
import type * as HistogramModule from "../../../charts/histogram.ts";

// The lines of the populations of the spectrum are made by
// noSpectrumLine, counted here so that a test sees when the block is
// drawn again.
vi.mock("./spectrumWords.ts", async (importOriginal) => {
  const words = await importOriginal<typeof SpectrumWordsModule>();
  return { ...words, noSpectrumLine: vi.fn(words.noSpectrumLine) };
});

/** The histogram of the population whose spectrum then throws, as a
    defect of the plot would; none when `null`. */
const plots = vi.hoisted(() => ({ throwsFor: null as string | null }));
vi.mock("../../../charts/histogram.ts", async (importOriginal) => {
  const histogram = await importOriginal<typeof HistogramModule>();
  return {
    ...histogram,
    createHistogram: (
      ...args: Parameters<typeof histogram.createHistogram>
    ): ReturnType<typeof histogram.createHistogram> => {
      const throwsFor = plots.throwsFor;
      if (throwsFor !== null && args[1].title.endsWith(throwsFor)) {
        throw new Error("popnei_web defect: a histogram of the test threw.");
      }
      return histogram.createHistogram(...args);
    },
  };
});

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
  // The parts read `project`, `popneiVersion`, `analyses` and `runs` of
  // the state and call `apply` alone; the rest of a store is core's,
  // tested there.
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
  status = { kind: "ready", key: KEY, stopped: null };
  announced = [];
  listeners = new Set();
  // The sample project with no options of any analysis: its own options
  // of the diversity are not those of the diversity of stage 5.
  project = { ...sampleProject(), analyses: [] };
  plots.throwsFor = null;
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

/** What the line under the field of the draw says of the draw, whether
    it is the default or typed. */
const SPECTRUM_SENTENCE =
  " The alleles and the private alleles of every population are also given for a draw of this many chromosomes, so that populations of different sizes can be compared, and the site frequency spectrum below the table is of the same draw.";

/** The description of the default's own number typed over the default
    draw, which changes no number of the field. */
const TYPED_DEFAULT =
  "the number of chromosomes of the rarefaction is now a typed one, and no longer follows the minimum number of individuals";

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
      "Individuals with a called genotype needed in each population, per variant",
      "Frequency of the commonest allele below which a variant is polymorphic, from 0 to 1",
      "Chromosomes drawn for the rarefaction, a whole number from 2",
    ]);
    expect(describedAs(minimum)).toBe(
      "A variant has a value in a population only when at least this many of its individuals have a called genotype there. A population with fewer individuals has no values. This minimum is for the diversity alone: the distances between populations have their own.",
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
    expect(describedAs(fields().draw)).toBe(
      `Typed; the default would be 40.${SPECTRUM_SENTENCE}`,
    );
    const useDefault = button("Use the default");
    expect(useDefault).not.toBeNull();
    // Drawn as a link at the end of the line under the field, and no part
    // of what the field is described by.
    expect(useDefault?.className).toMatch(/link/);
    expect(useDefault?.closest("p")?.textContent).toBe(
      `Typed; the default would be 40.${SPECTRUM_SENTENCE} Use the default`,
    );
    // A change of the minimum leaves the draw typed as it is.
    typeAndEnter(fields().minimum, "30");
    expect(fields().draw.value).toBe("96");
    expect(describedAs(fields().draw)).toBe(
      `Typed; the default would be 60.${SPECTRUM_SENTENCE}`,
    );

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

  test("the number of the default typed is kept as typed, so that the draw does not follow the minimum, and the notice says it is now typed", () => {
    draw(createElement(DiversityOptionsPart));
    typeAndEnter(fields().draw, "40");
    expect(applied).toEqual([
      "the number of chromosomes of the rarefaction is now a typed one, and no longer follows the minimum number of individuals",
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
        "Write the number of chromosomes with digits alone, 2400 and not 2,400 or 40,0; the number of chromosomes stays 40.",
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
      soFar: null,
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

/** The flow's result with the spectra of the worked example of sfs.md at
    a draw of `n`: p0 with shares, p2 with one allele only in the draw,
    and p1 not calculated. */
function withSpectra(n: number): DiversityResult {
  const numBins = Math.floor(n / 2) + 1;
  const p0 = new Float64Array(numBins).fill(2);
  p0[0] = 1;
  const p2 = new Float64Array(numBins);
  p2[0] = 3;
  return {
    ...flowResult(n),
    // p1 cut to 12 individuals, under the minimum of 20.
    numIndividuals: Uint32Array.from([48, 84, 12]),
    numVarsInDraw: Uint32Array.from([5, 3, 0]),
    foldedSfs: [p0, p2, null],
  };
}

describe("PA7 D2 the block of the spectrum, drawn by React", () => {
  test("its caption, a group per population named by its heading, one histogram for the population with shares, the lines of the others, and the line under them", () => {
    draw(
      createElement(DiversityResults, { result: withSpectra(4), check: null }),
    );
    expect(container.textContent).toContain(
      "The folded site frequency spectrum of each population, in a draw of 4 of its chromosomes at each variant, over the 1,152 variants of panel.nei the filters kept.",
    );
    const groups = [...container.querySelectorAll('[role="group"]')];
    expect(
      groups.map(
        (g) =>
          document.getElementById(g.getAttribute("aria-labelledby") ?? "")
            ?.textContent,
      ),
    ).toEqual(["p0", "p2", "p1"]);
    // The heading of the block, which names its region, and those of the
    // populations one level under it.
    expect(
      [...container.querySelectorAll("h3")].map((h) => h.textContent),
    ).toEqual(["Site frequency spectrum"]);
    const region = container.querySelector("section[aria-labelledby]");
    expect(
      document.getElementById(region?.getAttribute("aria-labelledby") ?? "")
        ?.textContent,
    ).toBe("Site frequency spectrum");
    expect(
      [...container.querySelectorAll("h4")].map((h) => h.textContent),
    ).toEqual(["p0", "p2", "p1"]);
    expect(container.querySelectorAll("svg")).toHaveLength(1);
    expect(groups[0]?.querySelector("svg title")?.textContent).toBe(
      "The spectrum of p0",
    );
    expect(groups[0]?.querySelector("svg desc")?.textContent).toBe(
      "5 variants in the draw of 4 chromosomes, about 4 with both alleles, in 2 bars from 1 to 2 copies of the rarer allele; the largest share, 0.5000, at 1.",
    );
    // No MAF filter in the project: the caption ends at its own words.
    expect(container.textContent).not.toContain("Warning:");
    expect(groups[0]?.textContent).toContain(
      "5 variants in the draw, about 4 of them with both alleles",
    );
    expect(groups[1]?.textContent).toContain(
      "Every variant of p2 in the draw shows one allele only, so its spectrum has no bar.",
    );
    expect(groups[2]?.textContent).toContain(
      "p1 has 12 individuals, fewer than the 20 a variant needs to count for a population, so it has no spectrum.",
    );
    expect(container.textContent).toContain(
      "The last bar, 2, holds one count where the others hold two, such as 1 and 3",
    );
    expect(
      [...container.querySelectorAll("button")].map((b) => b.textContent),
    ).toContain("Download the spectrum as CSV");
  });

  test("with a MAF filter that removed variants, the warning of the spectrum ends the caption of the block, and with one that removed none it is not there", () => {
    project = {
      ...project,
      filters: [
        { kind: "missing_data", maxAllowedMissingRate: 0.05 },
        { kind: "maf", maxAllowedMaf: 0.95 },
      ],
    };
    const filtered = (varsKept: number): DiversityResult => ({
      ...withSpectra(4),
      passStats: {
        numVars: varsKept,
        filtering: {
          missing_data: { varsProcessed: 1200, varsKept: 1152 },
          maf: { varsProcessed: 1152, varsKept },
        },
      },
    });
    draw(
      createElement(DiversityResults, { result: filtered(1128), check: null }),
    );
    const block = container.querySelector("section[aria-labelledby]");
    const caption = block?.querySelector("p")?.parentElement;
    expect(caption?.textContent).toBe(
      "The folded site frequency spectrum of each population, in a draw of 4 of its chromosomes at each variant, over the 1,128 variants of panel.nei the filters kept. The number of chromosomes is set above the table, with the rarefaction." +
        "Warning: The MAF filter of the Variants step removes the variants whose commonest allele is above 0.95 in the individuals kept, taken together, and it removed 24 of the 1,152 it was given. So the spectrum lacks many of the rare alleles, and its first bins are lower than those of the population. To see every variant in the spectrum, turn off the MAF filter in the Variants step.",
    );
    act(() => {
      root.unmount();
    });
    root = createRoot(container);
    draw(
      createElement(DiversityResults, { result: filtered(1152), check: null }),
    );
    expect(container.textContent).not.toContain("Warning:");
  });

  test("the tab of the table shows a row per count and two columns per population, no value in those of a population not calculated, and the histogram goes with its tab and comes back", () => {
    draw(
      createElement(DiversityResults, { result: withSpectra(4), check: null }),
    );
    const tabs = [...container.querySelectorAll('[role="tab"]')];
    expect(tabs.map((t) => t.textContent)).toEqual(["Histograms", "Table"]);
    const table = tabs[1];
    if (!(table instanceof HTMLElement)) throw new Error("no tab of the table");
    act(() => {
      table.focus();
    });
    act(() => {
      table.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      table.click();
    });
    expect(container.querySelectorAll("svg")).toHaveLength(0);
    const spectrum = [...container.querySelectorAll("table")].find((t) =>
      t.textContent.includes("Copies of the rarer allele"),
    );
    expect(
      [...(spectrum?.querySelectorAll("thead th") ?? [])].map(
        (th) => th.textContent,
      ),
    ).toEqual([
      "Copies of the rarer allele",
      "p0, variants",
      "p0, share",
      "p2, variants",
      "p2, share",
      "p1, variants",
      "p1, share",
    ]);
    expect(
      [...(spectrum?.querySelectorAll("tbody tr") ?? [])].map((row) =>
        [...row.children].map((cell) => cell.textContent),
      ),
    ).toEqual([
      ["0", "1.0", "not drawn", "3.0", "not drawn", "no value", "no value"],
      ["1", "2.0", "0.5000", "0.0", "no value", "no value", "no value"],
      ["2", "2.0", "0.5000", "0.0", "no value", "no value", "no value"],
    ]);
  });

  test("a draw of more bars than a histogram draws gives the line in their place, and the table stays", () => {
    draw(
      createElement(DiversityResults, {
        result: withSpectra(2400),
        check: null,
      }),
    );
    expect(container.querySelectorAll("svg")).toHaveLength(0);
    expect(container.textContent).toContain(
      "A draw of 2,400 chromosomes gives 1,200 bars per population, too many to draw. The table and the CSV hold them.",
    );
  });

  test("the histogram leaves nothing behind when the result leaves the page", () => {
    draw(
      createElement(DiversityResults, { result: withSpectra(40), check: null }),
    );
    expect(container.querySelectorAll("svg")).toHaveLength(1);
    act(() => {
      root.render(createElement("div"));
    });
    expect(container.querySelectorAll("svg")).toHaveLength(0);
  });
});

describe("PA7 D2 the histograms of the spectrum share one vertical scale", () => {
  test("each histogram's vertical axis runs to the largest share of any population, made round", () => {
    // jsdom lays nothing out: the plots are given the size a browser
    // would, which they read.
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(448);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(336);
    const r = withSpectra(4);
    // p2 with shares 0.25 and 0.75, the largest of the two populations.
    const p2 = Float64Array.from([1, 1, 3]);
    draw(
      createElement(DiversityResults, {
        result: { ...r, foldedSfs: [r.foldedSfs[0] ?? null, p2, null] },
        check: null,
      }),
    );
    const tops = [...container.querySelectorAll("svg")].map((svg) =>
      Math.max(
        ...[...svg.querySelectorAll(".chart-axis-y .tick text")].map((t) =>
          Number(t.textContent),
        ),
      ),
    );
    expect(tops).toHaveLength(2);
    // Each histogram draws its own population.
    const groups = [...container.querySelectorAll('[role="group"]')];
    expect(groups[1]?.querySelector("svg desc")?.textContent).toBe(
      "3 variants in the draw of 4 chromosomes, about 4 with both alleles, in 2 bars from 1 to 2 copies of the rarer allele; the largest share, 0.7500, at 2.",
    );
    // 0.75, made round by the scale's `nice`, and not p0's own 0.5.
    expect(tops[0]).toBeCloseTo(0.8, 10);
    expect(tops[1]).toBeCloseTo(0.8, 10);
  });
});

/** Pastes `text` over the whole of `input`, as the browser does with the
    clipboard: a `paste` event that holds it. */
function pasteOver(input: HTMLInputElement, text: string): void {
  act(() => {
    input.focus();
    input.setSelectionRange(0, input.value.length);
  });
  act(() => {
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", {
      value: { getData: () => text },
    });
    input.dispatchEvent(event);
  });
}

describe("PA7 D1 the number of the default, typed, pasted or stepped to", () => {
  test("the default's number pasted over the whole field is kept as typed, as typing it is", () => {
    draw(createElement(DiversityOptionsPart));
    pasteOver(fields().draw, "40");
    expect(diversityOptions(project).numCalledAlleles).toBe(40);
    expect(applied).toEqual([TYPED_DEFAULT]);
  });

  test("an arrow key that steps to the default's number does not mark the draw typed", () => {
    draw(createElement(DiversityOptionsPart));
    const input = fields().draw;
    act(() => {
      input.focus();
      input.setSelectionRange(0, input.value.length);
    });
    typeKeys(input, "39");
    press("ArrowUp");
    expect(input.value).toBe("40");
    expect(diversityOptions(project).numCalledAlleles).toBeNull();
    expect(applied).toEqual([]);
  });

  test("the Down arrow at the least draw, with the default's number typed and not committed, does not mark the draw typed", () => {
    // A minimum of 1 individual makes the default draw 2, the least one:
    // the arrow steps nowhere, and commits the number the field holds.
    project = setAnalysisOptions(project, diversity, {
      minNumIndividuals: 1,
      polyThreshold: 0.95,
      numCalledAlleles: null,
    });
    draw(createElement(DiversityOptionsPart));
    const input = fields().draw;
    expect(input.value).toBe("2");
    act(() => {
      input.focus();
      input.setSelectionRange(0, input.value.length);
    });
    typeKeys(input, "2");
    press("ArrowDown");
    expect(input.value).toBe("2");
    expect(diversityOptions(project).numCalledAlleles).toBeNull();
    expect(applied).toEqual([]);
  });
});

/** Presses `key` with Shift held on the element that has the focus. */
function pressWithShift(key: string): void {
  act(() => {
    for (const type of ["keydown", "keyup"]) {
      document.activeElement?.dispatchEvent(
        new KeyboardEvent(type, {
          key,
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
    }
  });
}

describe("PA7 D1 a key pressed with Shift commits nothing, the second pass of the review of work package 7", () => {
  // React Aria takes a key only with the very modifiers it names, so an
  // arrow, Page Up or Down, or Enter with Shift commits nothing: the
  // field must keep what was typed, and a character thrown away, for the
  // commit that follows.
  for (const key of ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Enter"]) {
    test(`a comma thrown away is still refused after Shift+${key}`, () => {
      draw(createElement(DiversityOptionsPart));
      const input = fields().threshold;
      act(() => {
        input.focus();
        input.setSelectionRange(0, input.value.length);
      });
      typeKeys(input, "0,1");
      pressWithShift(key);
      press("Enter");
      expect(container.textContent).toContain(
        "Write the decimals with a point, 0.1 and not 0,1; the frequency stays 0.95.",
      );
      expect(diversityOptions(project).polyThreshold).toBe(0.95);
      expect(applied).toEqual([]);
    });

    test(`the default's number typed is still kept as typed after Shift+${key}`, () => {
      draw(createElement(DiversityOptionsPart));
      const input = fields().draw;
      act(() => {
        input.focus();
        input.setSelectionRange(0, input.value.length);
      });
      typeKeys(input, "40");
      pressWithShift(key);
      expect(applied).toEqual([]);
      press("Enter");
      expect(diversityOptions(project).numCalledAlleles).toBe(40);
      expect(applied).toEqual([TYPED_DEFAULT]);
    });
  }
});

describe("PA7 D2 the block of the spectrum, the review of work package 7", () => {
  test("a histogram that throws leaves its heading alone, and the other histograms, the table, the fields and the download stay", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const r = withSpectra(4);
    plots.throwsFor = "p2";
    status = {
      kind: "done",
      key: KEY,
      result: {
        ...r,
        numVarsInDraw: Uint32Array.from([5, 3, 4]),
        foldedSfs: [
          r.foldedSfs[0] ?? null,
          Float64Array.from([1, 1, 3]),
          Float64Array.from([1, 2, 2]),
        ],
      },
      warnings: [],
      check: null,
    };
    draw(createElement(AnalysisPanel, { id: "diversity" }));
    // The population whose histogram threw keeps its heading, at the
    // level of the others.
    expect(
      [...container.querySelectorAll("h4")].map((h) => h.textContent),
    ).toEqual(["p0", "p2", "p1"]);
    expect(container.querySelectorAll("svg")).toHaveLength(2);
    expect(container.querySelectorAll('[role="group"]')).toHaveLength(2);
    expect(container.textContent).toContain(
      "The diversity of each population, over the 1,152 variants of panel.nei the filters kept.",
    );
    expect(container.querySelectorAll("input[data-number-field]")).toHaveLength(
      3,
    );
    expect(
      [...container.querySelectorAll("button")].map((b) => b.textContent),
    ).toContain("Download the spectrum as CSV");
  });

  test("above the bars a histogram draws, the line of too many bars and, under it, the lines of the populations with no spectrum", () => {
    draw(
      createElement(DiversityResults, {
        result: withSpectra(2400),
        check: null,
      }),
    );
    expect(container.textContent).toContain(
      "A draw of 2,400 chromosomes gives 1,200 bars per population, too many to draw.",
    );
    expect(
      [...container.querySelectorAll("h4")].map((h) => h.textContent),
    ).toEqual(["p2", "p1"]);
    expect(container.textContent).toContain(
      "Every variant of p2 in the draw shows one allele only, so its spectrum has no bar.",
    );
    expect(container.textContent).toContain(
      "p1 has 12 individuals, fewer than the 20 a variant needs to count for a population, so it has no spectrum.",
    );
    expect(container.textContent).not.toContain("Each bar is the share");
  });

  test("the bar limit: a draw of 2,000 draws its 1,000 bars, and one of 2,002 does not", () => {
    draw(
      createElement(DiversityResults, {
        result: withSpectra(2000),
        check: null,
      }),
    );
    expect(container.querySelectorAll("svg")).toHaveLength(1);
    expect(container.textContent).not.toContain("too many to draw");
    act(() => {
      root.unmount();
    });
    root = createRoot(container);
    draw(
      createElement(DiversityResults, {
        result: withSpectra(2002),
        check: null,
      }),
    );
    expect(container.querySelectorAll("svg")).toHaveLength(0);
    expect(container.textContent).toContain(
      "A draw of 2,002 chromosomes gives 1,001 bars per population, too many to draw.",
    );
  });

  test("with no population with a histogram, no line of what each bar is", () => {
    const r = withSpectra(4);
    draw(
      createElement(DiversityResults, {
        result: {
          ...r,
          foldedSfs: [
            Float64Array.from([5, 0, 0]),
            r.foldedSfs[1] ?? null,
            null,
          ],
        },
        check: null,
      }),
    );
    expect(container.querySelectorAll("svg")).toHaveLength(0);
    expect(container.textContent).not.toContain("Each bar is the share");
  });

  test("under the panel's frame, drawn again when a notice comes and goes, the block is not drawn again", () => {
    status = {
      kind: "done",
      key: KEY,
      result: withSpectra(40),
      warnings: [],
      check: null,
    };
    draw(createElement(AnalysisPanel, { id: "diversity" }));
    const made = vi.mocked(noSpectrumLine).mock.calls.length;
    expect(made).toBeGreaterThanOrEqual(3);
    act(() => {
      showNotice({
        cause: { kind: "command", description: "the MAF filter changed" },
        removed: ["pca"],
        leftBehind: [],
        stopped: [],
        writeLeftBehind: false,
        writeStopped: false,
        writeDiscarded: false,
      });
    });
    act(() => {
      showNotice(null);
    });
    expect(vi.mocked(noSpectrumLine).mock.calls.length).toBe(made);
  });
});

describe("PA7 D1 the ranges of the fields of the diversity", () => {
  test("0 in the minimum, 1 in the frequency and 4294967295 in the draw are taken, and the Up arrow moves the frequency by 0.01", () => {
    draw(createElement(DiversityOptionsPart));
    typeAndEnter(fields().minimum, "0");
    typeAndEnter(fields().threshold, "1");
    typeAndEnter(fields().draw, "4294967295");
    expect(diversityOptions(project)).toEqual({
      minNumIndividuals: 0,
      polyThreshold: 1,
      numCalledAlleles: 4294967295,
    });
    typeAndEnter(fields().threshold, "0.95");
    act(() => {
      fields().threshold.focus();
    });
    press("ArrowUp");
    expect(diversityOptions(project).polyThreshold).toBe(0.96);
  });
});
