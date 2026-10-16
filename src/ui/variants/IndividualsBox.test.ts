// @vitest-environment jsdom
/**
 * The box and the tab of the individuals file of popgen2.html, drawn by
 * React in jsdom over the real store of the page and a fake worker whose
 * requests the test ends by hand (docs/specs/steps/popgen2-input.md, "The
 * box of the individuals file", "The Individuals tab", "The states",
 * "What it sends and reads"; docs/plans/input-page.md, work package 6,
 * deliverable 1). The reads of the individuals file are recorded by the
 * test, as the light worker would give them, and the entry's choice of
 * the column is not drawn here: the test chooses the column as the list
 * does.
 */
import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { pcaOnPopgen2 } from "../../core/analyses/pca.ts";
import {
  loadVariants,
  setAnalysisOptions,
  setGrouping,
  setThreshold,
} from "../../core/project.ts";
import type { IndividualsReadGiven } from "../../core/project.ts";
import { summaryResult } from "../../core/testSupport.ts";
import type {
  Cell,
  CsvFound,
  IndividualsTable,
  JobResult,
  Outcome,
  Progress,
  Run,
} from "../../worker/protocol.ts";
import { LIVE_QUIET_MS, createAutoRuns } from "../autoRuns.ts";
import type { AutoRuns } from "../autoRuns.ts";
import { FilesProvider } from "../files.tsx";
import { createPageTab } from "../pageTab.ts";
import { POPGEN2_LIVE } from "../../core/apps.ts";
import {
  POPGEN2_AUTO_GROUPS,
  POPGEN2_CHAIN,
  createPopgen2Store,
} from "../popgen2Store.ts";
import type { Popgen2PageStore } from "../popgen2Store.ts";
import { startAnalysis } from "../runs.ts";
import { AnnouncerProvider } from "../shell/announcer.tsx";
import { createAnnouncer } from "../shell/status.ts";
import { csvOptionCommand } from "../steps/individuals/commands.ts";
import { StoreProvider } from "../store.tsx";
import {
  REMOVE_INDIVIDUALS_COMMAND,
  columnItemCommand,
  openIndividualsCommand,
} from "./individualsCommands.ts";
import type * as IndividualsWordsModule from "./individualsWords.ts";
import { RunGateProvider } from "./runGate.tsx";
import { AutoRunsProvider } from "../autoRunsContext.ts";
import { createRunGate } from "./thresholdRun.ts";
import { ChangeHoldsProvider } from "../widgets/changeHold.ts";
import { VariantsPage } from "./VariantsPage.tsx";
import { failureEndsLive } from "../analyses/pca/liveEnd.ts";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

/** How many times the box worked out what it shows of the counts, one
    for each drawing of the box with a file read; and whether the tab of
    the individuals file throws a defect as it is drawn with a file. */
const drawn = vi.hoisted(() => ({ counts: 0, tabThrows: false }));

vi.mock("./individualsWords.ts", async (importOriginal) => {
  const real = await importOriginal<typeof IndividualsWordsModule>();
  return {
    ...real,
    countsShown: (
      ...args: Parameters<typeof real.countsShown>
    ): ReturnType<typeof real.countsShown> => {
      drawn.counts += 1;
      return real.countsShown(...args);
    },
    individualsTabShows: (
      ...args: Parameters<typeof real.individualsTabShows>
    ): ReturnType<typeof real.individualsTabShows> => {
      if (drawn.tabThrows && args[0] !== null) {
        throw new Error("popnei_web defect: a defect of the test");
      }
      return real.individualsTabShows(...args);
    },
  };
});

/** A request the fake `send` was given, and how the test ends it or
    gives it a progress. */
interface Request {
  readonly end: (outcome: Outcome<JobResult>) => void;
  readonly progress: (progress: Progress) => void;
}

let container: HTMLElement;
let root: Root;

/** jsdom has no ResizeObserver, which the tables measure their box
    with; here it tells of no change. */
class NoResize {
  observe(): void {
    // jsdom lays nothing out.
  }
  unobserve(): void {
    // Nothing observed.
  }
  disconnect(): void {
    // Nothing observed.
  }
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("ResizeObserver", NoResize);
  drawn.counts = 0;
  drawn.tabThrows = false;
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
});

/** Lets the outcomes given settle, and React draw what they changed. */
async function settled(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** The load id of the variants file and of the individuals files. */
const VARIANTS_ID = "f".repeat(32);
const FILE_ID = "a".repeat(32);

/** The individuals of the variants file `panel.nei` of the tests. */
const INDIVIDUALS = ["s000", "s001", "s002", "s003", "s004"];

/** The individuals file `pops.csv`: s003 with an empty cell, s004 not in
    it, and x9, a row panel.nei does not have. */
const POPS: IndividualsTable = {
  columns: ["IID", "popcat", "h"],
  rows: [
    ["s000", "p0", 1.5],
    ["s001", "p0", 2],
    ["s002", "p1", 2.25],
    ["s003", null, null],
    ["x9", "p1", 3],
  ] satisfies Cell[][],
};

/** How a CSV read with the comma was found. */
const FOUND: CsvFound = {
  encoding: "utf-8",
  separator: ",",
  decimal: ".",
  undecodedLine: null,
};

/** A read of `table`, of a CSV found as `found`, or of an xlsx for
    `null`. */
function readOf(
  table: IndividualsTable,
  found: CsvFound | null = FOUND,
): IndividualsReadGiven {
  return {
    kind: "read",
    table,
    columns: table.columns.map((_, index) =>
      index === 0 ? { kind: "identifier" } : { kind: "categorical" },
    ),
    found,
  };
}

/** The page drawn, its store, the requests of the fake worker, the
    analyses it starts by itself, and the files picked. */
interface Drawn {
  readonly store: Popgen2PageStore<JobResult, Blob>;
  readonly requests: Request[];
  readonly autoRuns: AutoRuns;
}

/** Draws the page in <StrictMode>, as the development server draws it;
    a file picked is kept under FILE_ID. */
async function drawPage(): Promise<Drawn> {
  const requests: Request[] = [];
  const store = createPopgen2Store({
    send: (_key, _job, onProgress): Run<JobResult> => {
      const outcome = new Promise<Outcome<JobResult>>((resolve) => {
        requests.push({ end: resolve, progress: onProgress });
      });
      return { id: requests.length, outcome, cancel: () => undefined };
    },
    sendWrite: () => {
      throw new Error("popnei_web defect: no write is sent here");
    },
    appVersion: "0.1.0",
  });
  store.popneiReady("0.1.0");
  const autoRuns = createAutoRuns({
    store,
    groups: POPGEN2_AUTO_GROUPS,
    start: (id) => startAnalysis(store, id),
    // The PCA is never made live here, so its gate holds nothing.
    live: {
      analyses: POPGEN2_LIVE,
      changes: createRunGate(),
      runStart: (id) => startAnalysis(store, id),
      quietMs: LIVE_QUIET_MS,
      endsLive: failureEndsLive,
    },
  });
  store.subscribe(() => {
    queueMicrotask(() => {
      autoRuns.sync();
    });
  });
  const files = {
    addFile: (): string => FILE_ID,
    fileOf: (): File | null => null,
  };
  const gate = createRunGate();
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
          RunGateProvider,
          { value: gate },
          createElement(
            ChangeHoldsProvider,
            { value: gate },
            createElement(
              FilesProvider,
              { value: files },
              createElement(
                AutoRunsProvider,
                { value: autoRuns },
                createElement(VariantsPage, {
                  pageTab: createPageTab(),
                  onCountButton: () => undefined,
                  onStatsShown: () => () => undefined,
                }),
              ),
            ),
          ),
        ),
      ),
    ),
  );
  await act(async () => {
    root.render(tree);
    await Promise.resolve();
  });
  return { store, requests, autoRuns };
}

/** Opens `panel.nei` and records its read, with INDIVIDUALS. */
async function openVariants(
  store: Popgen2PageStore<JobResult, Blob>,
): Promise<void> {
  await act(async () => {
    store.apply("a new variants file was loaded", (p) =>
      loadVariants(p, {
        fileId: VARIANTS_ID,
        name: "panel.nei",
        size: 1000,
        format: "nei",
        readOptions: null,
      }),
    );
    store.variantsRead(VARIANTS_ID, {
      kind: "read",
      individuals: INDIVIDUALS,
      ploidy: 2,
      numVars: null,
      keepsPassed: false,
    });
    await Promise.resolve();
  });
  await settled();
}

/** Opens the individuals file `name` through the input of the zone of
    its box, as the button's picker gives it. */
async function pickIndividuals(name: string): Promise<void> {
  const input = box().querySelector<HTMLInputElement>('input[type="file"]');
  if (input === null) throw new Error("the box has no input of a file");
  Object.defineProperty(input, "files", {
    value: [new File(["IID,pop\n"], name)],
    configurable: true,
  });
  await act(async () => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();
  });
}

/** Records the read `read` of FILE_ID with the options the project
    holds. */
async function recorded(
  store: Popgen2PageStore<JobResult, Blob>,
  read: IndividualsReadGiven,
): Promise<void> {
  await act(async () => {
    const csv = store.getState().project.individuals?.csv ?? null;
    store.individualsRead(FILE_ID, csv, read);
    await Promise.resolve();
  });
  await settled();
}

/** Chooses the column `column` in the list, as its item does. */
async function choose(
  store: Popgen2PageStore<JobResult, Blob>,
  column: string | null,
): Promise<void> {
  const command = columnItemCommand(
    column === null ? "none" : `column:${column}`,
  );
  await act(async () => {
    store.apply(command.description, command.command);
    await Promise.resolve();
  });
}

/** The section headed by the h2 `name`. */
function regionOf(name: string): HTMLElement {
  const heading = [...container.querySelectorAll("h2")].find(
    (h) => h.textContent === name,
  );
  const section = heading?.closest("section");
  if (section === null || section === undefined) {
    throw new Error(`no region ${name}`);
  }
  return section;
}

/** The box of the individuals file. */
function box(): HTMLElement {
  return regionOf("Individuals");
}

/** The panel of the tab "Individuals", the second, shown or kept
    drawn hidden; a hidden panel has no id that names it. */
function tab(): HTMLElement {
  const panel =
    container.querySelectorAll<HTMLElement>(
      '[role="tabpanel"], [data-inert="true"]',
    )[1] ?? null;
  if (panel === null) throw new Error("no panel of the individuals file");
  return panel;
}

/** The texts of the paragraphs of `element`, in their order. */
function paragraphs(element: HTMLElement): string[] {
  return [...element.querySelectorAll("p")].map((p) => p.textContent);
}

/** The words of the buttons of `element`, in their order. */
function buttons(element: HTMLElement): string[] {
  return [...element.querySelectorAll("button")].map((b) => b.textContent);
}

/** The words of the item each select of `element` has chosen, in their
    order, read from the hidden select React Aria draws beside each. */
function selectsOf(element: HTMLElement): string[] {
  return [...element.querySelectorAll("select")].map(
    (select) => select.selectedOptions[0]?.textContent ?? "",
  );
}

/** The value the list "Column of the populations" shows, the one select
    of the box. */
function listValue(): string | null {
  const values = selectsOf(box());
  return values.length === 1 ? (values[0] ?? null) : null;
}

/** The heading of the counts in the Individuals tab. */
const COUNTS_HEADING =
  "Individuals per population, after the filters of individuals";

/** The part of the Individuals tab headed by the counts, or null when it
    is not drawn. */
function countsPart(): HTMLElement | null {
  const heading = [...tab().querySelectorAll("h2")].find(
    (h) => h.textContent === COUNTS_HEADING,
  );
  return heading?.closest("section") ?? null;
}

/** The rows of the table of the counts in the Individuals tab, each a
    header and a cell; none when it is not drawn. */
function countRows(): string[][] {
  expect(box().querySelector("table")).toBeNull();
  const table = countsPart()?.querySelector("table") ?? null;
  if (table === null) return [];
  return [...table.querySelectorAll("tr")].map((tr) =>
    [...tr.querySelectorAll("th, td")].map((cell) => cell.textContent),
  );
}

/** The descriptions of the history of `store`, the last one first, as
    Undo would name them. */
function undoNames(store: Popgen2PageStore<JobResult, Blob>): string | null {
  return store.getState().undo;
}

/** The names of the buttons of the box that download, which it has none
    of since 11 October 2026. */
function downloadsOfBox(): string[] {
  return [...box().querySelectorAll("button")]
    .map((b) => b.getAttribute("aria-label") ?? b.textContent)
    .filter((name) => name.startsWith("Download"));
}

describe("IN6 D1 the box of the individuals file in each state", () => {
  test("NU8 R1 no file, no variants file: the zone's button alone, no words and no Remove", async () => {
    await drawPage();
    expect(paragraphs(box())).toEqual([]);
    expect(buttons(box())).toContain("Open individuals file…");
    expect(buttons(box()).some((b) => b.startsWith("Remove"))).toBe(false);
  });

  test("a file opened by the zone, its read pending: its name and Reading, the zone's button Open another, and Remove in the tab and not in the box", async () => {
    const { store } = await drawPage();
    await pickIndividuals("pops.csv");
    expect(store.getState().project.individuals?.fileId).toBe(FILE_ID);
    expect(paragraphs(box())).toEqual(["pops.csv", "Reading pops.csv."]);
    expect(buttons(box())).toContain("Open another individuals file…");
    expect(buttons(box()).some((b) => b.startsWith("Remove"))).toBe(false);
    expect(buttons(tab())[0]).toBe("Remove pops.csv");
  });

  test("a file refused: its name and the words of the refusal", async () => {
    const { store } = await drawPage();
    await pickIndividuals("pops.csv");
    await recorded(store, {
      kind: "failed",
      error: { kind: "duplicateIndividual", name: "s001" },
      format: "text",
    });
    const words = paragraphs(box());
    expect(words[0]).toBe("pops.csv");
    expect(words[1]).toMatch(/^pops\.csv could not be read: /u);
    expect(words[1]).toMatch(/Open a corrected file\.$/u);
  });

  test("a file read before a variants file: the list on None, and the counts to come", async () => {
    const { store } = await drawPage();
    await pickIndividuals("pops.csv");
    await recorded(store, readOf(POPS));
    expect(listValue()).toBe("None: every individual unclassified");
    await choose(store, "popcat");
    expect(listValue()).toBe("popcat");
    expect(countRows()).toEqual([]);
    expect(paragraphs(box())).toContain(
      "The individuals are counted once a variants file is open.",
    );
  });

  test("NU8 R1 both files read and a column chosen: the summary line in the box; in the tab the counts under their heading, with no caption and no Download, the line of the unclassified and the line of the rows not used", async () => {
    const { store } = await drawPage();
    await openVariants(store);
    await pickIndividuals("pops.csv");
    await recorded(store, readOf(POPS));
    await choose(store, "popcat");
    expect(undoNames(store)).toBe("the column of the populations changed");
    expect(paragraphs(box())).toEqual([
      "pops.csv",
      "3 individuals classified in 2 populations, 2 unclassified",
    ]);
    // The table's own caption names it for a screen reader alone.
    expect(countsPart()?.querySelector("table > caption")?.textContent).toBe(
      "Individuals of panel.nei after the filters of individuals",
    );
    expect(downloadsOfBox()).toEqual([]);
    expect(
      buttons(countsPart() ?? tab()).filter((b) => b.startsWith("Download")),
    ).toEqual([]);
    expect(countRows()).toEqual([
      ["Population", "Individuals"],
      ["p0", "2"],
      ["p1", "1"],
    ]);
    expect(paragraphs(countsPart() ?? tab())).toEqual([
      "Unclassified, left out of the analyses per population: 2 individuals kept, 1 with an empty cell in popcat and 1 that is not in pops.csv. Not in pops.csv: s004.",
    ]);
    expect(box().textContent).not.toContain("Unclassified, left out");
    expect(box().textContent).not.toContain("but not in panel.nei");
    expect(paragraphs(tab())).toContain(
      "Individuals in pops.csv but not in panel.nei: 1",
    );
  });

  test("None chosen: the one row Unclassified, as with no individuals file, and no line under it", async () => {
    const { store } = await drawPage();
    await openVariants(store);
    await pickIndividuals("pops.csv");
    await recorded(store, readOf(POPS));
    await choose(store, "popcat");
    await choose(store, null);
    expect(listValue()).toBe("None: every individual unclassified");
    expect(paragraphs(box())).toEqual([
      "pops.csv",
      "5 individuals, all unclassified",
    ]);
    expect(countRows()).toEqual([
      ["Population", "Individuals"],
      ["Unclassified", "5"],
    ]);
    expect(paragraphs(countsPart() ?? tab())).toEqual([]);
  });

  test("a grouping whose column the table does not have: the list on None", async () => {
    const { store } = await drawPage();
    await pickIndividuals("pops.csv");
    await act(async () => {
      store.apply("the column of the populations changed", (p) =>
        setGrouping(p, { kind: "populations", column: "region" }),
      );
      await Promise.resolve();
    });
    await recorded(store, readOf(POPS));
    expect(listValue()).toBe("None: every individual unclassified");
  });

  test("no name of the variants file in the individuals file: the warning in the box, no summary line, no table", async () => {
    const { store } = await drawPage();
    await openVariants(store);
    await pickIndividuals("pops.csv");
    await recorded(
      store,
      readOf({
        columns: ["IID", "popcat"],
        rows: [
          ["S-000", "p0"],
          ["S-001", "p1"],
        ],
      }),
    );
    await choose(store, "popcat");
    expect(countRows()).toEqual([]);
    expect(box().textContent).toContain(
      "Warning: none of the 5 individuals of panel.nei is in pops.csv, so all of them are unclassified. The first column of pops.csv has to hold their names as panel.nei writes them: panel.nei starts with s000, and pops.csv with S-000.",
    );
    expect(box().textContent).not.toContain("classified in");
  });

  test("a column of 21 values: its warning in the box, no summary line, no table, the line of the rows not used in the tab", async () => {
    const { store } = await drawPage();
    await openVariants(store);
    await pickIndividuals("pops.csv");
    await recorded(
      store,
      readOf({
        columns: ["IID", "accession"],
        rows: Array.from({ length: 21 }, (_, i) => [
          i < 5 ? `s00${String(i)}` : `x${String(i)}`,
          `a${String(i)}`,
        ]),
      }),
    );
    await choose(store, "accession");
    expect(countRows()).toEqual([]);
    expect(box().textContent).toContain(
      "Warning: accession has 21 different values, too many for a column of populations: the individuals are counted here only for a column of 20 different values or fewer. If it is not the column of the populations, choose another in the list.",
    );
    expect(box().textContent).not.toContain("classified in");
    expect(countsPart()).toBeNull();
    expect(paragraphs(tab())).toContain(
      "Individuals in pops.csv but not in panel.nei: 16",
    );
  });

  test("no column of text with 20 values or fewer: the list on None and the line under it", async () => {
    const { store } = await drawPage();
    await pickIndividuals("pops.csv");
    await recorded(
      store,
      readOf({ columns: ["IID", "h"], rows: [["s000", 1]] }),
    );
    expect(listValue()).toBe("None: every individual unclassified");
    expect(box().textContent).toContain(
      "No column of pops.csv holds text with 20 different values or fewer, so none was chosen as the column of the populations. Choose it in the list.",
    );
  });

  test("a threshold of the individuals on and the pass not finished: … in the summary line and in each count, read as not counted yet, and the line of waiting under each; after a Stop, the line of a Stop; after a failure, the line of a failure", async () => {
    const { store, requests, autoRuns } = await drawPage();
    await openVariants(store);
    await pickIndividuals("pops.csv");
    await recorded(store, readOf(POPS));
    await choose(store, "popcat");
    await act(async () => {
      store.apply("the threshold of the missing genotypes changed", (p) =>
        setThreshold(p, { of: "individuals", kind: "missing_data" }, 0.03),
      );
      await Promise.resolve();
    });
    await settled();
    expect(countRows()).toEqual([
      ["Population", "Individuals"],
      ["p0", "…not counted yet"],
      ["p1", "…not counted yet"],
    ]);
    expect(paragraphs(box())).toEqual([
      "pops.csv",
      "…not counted yet individuals classified in 2 populations, …not counted yet unclassified",
      "The individuals the filters keep are counted once panel.nei is read to the end.",
    ]);
    expect(paragraphs(countsPart() ?? tab())).toEqual([
      "The individuals the filters keep are counted once panel.nei is read to the end.",
    ]);
    // The "…" is hidden from a screen reader, which reads the words
    // beside it.
    expect(
      [...box().querySelectorAll('[aria-hidden="true"]')].map(
        (span) => span.textContent,
      ),
    ).toContain("…");
    expect(downloadsOfBox()).toEqual([]);

    await act(async () => {
      autoRuns.stop(POPGEN2_CHAIN);
      await Promise.resolve();
    });
    await settled();
    expect(paragraphs(box())).toContain(
      "Not counted: the reading of panel.nei was stopped. Start it again in the box Variants to count the individuals the filters keep.",
    );

    await act(async () => {
      autoRuns.resume(POPGEN2_CHAIN);
      await Promise.resolve();
    });
    await settled();
    await act(async () => {
      requests.at(-1)?.end({
        kind: "failed",
        error: { kind: "popnei", message: "a broken file" },
      });
      await Promise.resolve();
    });
    await settled();
    expect(paragraphs(box())).toContain(
      "Not counted: panel.nei could not be read to the end; the box Variants says why.",
    );
  });

  test("NU8 R1 no individuals file and a variants file read: the summary line, all unclassified, with … while the pass is not finished and a threshold on, then the individuals kept; no table in the tab", async () => {
    const { store, requests } = await drawPage();
    await openVariants(store);
    expect(paragraphs(box())).toEqual(["5 individuals, all unclassified"]);
    expect(countRows()).toEqual([]);
    expect(paragraphs(tab())).toEqual(["No individuals file open."]);
    expect(downloadsOfBox()).toEqual([]);
    await act(async () => {
      store.apply("the threshold of the missing genotypes changed", (p) =>
        setThreshold(p, { of: "individuals", kind: "missing_data" }, 0.03),
      );
      await Promise.resolve();
    });
    await settled();
    expect(paragraphs(box())).toEqual([
      "…not counted yet individuals, all unclassified",
      "The individuals the filters keep are counted once panel.nei is read to the end.",
    ]);
    await act(async () => {
      requests.at(-1)?.end({
        kind: "done",
        key: store.getState().runs.at(-1)?.key ?? "",
        result: summaryResult(["1"], [1200], INDIVIDUALS),
      });
      await Promise.resolve();
    });
    await settled();
    const kept = store.getState().individualsKept?.list;
    const numKept =
      kept?.kind === "known"
        ? (kept.individuals ?? INDIVIDUALS).length
        : Number.NaN;
    expect(numKept).toBeGreaterThan(0);
    expect(paragraphs(box())).toEqual([
      `${String(numKept)} individuals, all unclassified`,
    ]);
  });

  test("a progress of the one pass draws the box no more", async () => {
    const { store, requests } = await drawPage();
    await openVariants(store);
    await pickIndividuals("pops.csv");
    await recorded(store, readOf(POPS));
    await choose(store, "popcat");
    await act(async () => {
      store.apply("the threshold of the missing genotypes changed", (p) =>
        setThreshold(p, { of: "individuals", kind: "missing_data" }, 0.03),
      );
      await Promise.resolve();
    });
    await settled();
    const request = requests.at(-1);
    if (request === undefined) throw new Error("no pass was started");
    const before = drawn.counts;
    expect(before).toBeGreaterThan(0);
    for (let bytes = 1; bytes <= 5; bytes += 1) {
      await act(async () => {
        request.progress({
          bytesRead: bytes * 100,
          numBytes: 1000,
          pass: 1,
          numPasses: 1,
        });
        await Promise.resolve();
      });
    }
    expect(drawn.counts).toBe(before);
  });
});

describe("IN6 D1 the commands of the box and the tab, with their descriptions", () => {
  test("each command of the spec's table makes its step of the history", async () => {
    const { store } = await drawPage();
    const sent = (command: {
      readonly description: string;
      readonly command: Parameters<
        Popgen2PageStore<JobResult, Blob>["apply"]
      >[1];
    }): void => {
      store.apply(command.description, command.command);
    };
    await act(async () => {
      sent(openIndividualsCommand(FILE_ID, "pops.csv"));
      await Promise.resolve();
    });
    expect(undoNames(store)).toBe("an individuals file was opened");
    expect(store.getState().project.individuals?.csv).toEqual({
      encoding: "auto",
      separator: "auto",
      decimal: "auto",
    });
    await recorded(store, readOf(POPS));
    await act(async () => {
      sent(columnItemCommand("column:popcat"));
      await Promise.resolve();
    });
    expect(undoNames(store)).toBe("the column of the populations changed");
    await act(async () => {
      sent(columnItemCommand("none"));
      await Promise.resolve();
    });
    expect(store.getState().project.grouping).toEqual({
      kind: "populations",
      column: null,
    });
    await act(async () => {
      sent(
        csvOptionCommand("separator", "pops.csv", {
          encoding: "auto",
          separator: ";",
          decimal: "auto",
        }),
      );
      await Promise.resolve();
    });
    expect(undoNames(store)).toBe("the separator of pops.csv changed");
    await act(async () => {
      sent(REMOVE_INDIVIDUALS_COMMAND);
      await Promise.resolve();
    });
    expect(undoNames(store)).toBe("the individuals file was removed");
  });
});

describe("IN6 D1 the tab of the individuals file in each state", () => {
  test("a defect in the tab draws its heading alone in its place, leaves the rest of the page, and the next file draws the tab again", async () => {
    const quiet = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    try {
      const { store } = await drawPage();
      await openVariants(store);
      const headings = (): string[] =>
        [...container.querySelectorAll("h2")].map((h) => h.textContent);
      const before = headings();
      drawn.tabThrows = true;
      await pickIndividuals("pops.csv");
      await recorded(store, readOf(POPS));
      // In the tab Individuals, before the heading of the PCA tab.
      const pca = before.indexOf("PCA");
      expect(headings()).toEqual([
        ...before.slice(0, pca),
        "How the individuals file was read and what it holds",
        ...before.slice(pca),
      ]);
      expect(paragraphs(tab())).toEqual([]);
      drawn.tabThrows = false;
      await act(async () => {
        const command = openIndividualsCommand("b".repeat(32), "other.csv");
        store.apply(command.description, command.command);
        await Promise.resolve();
      });
      expect(paragraphs(tab())).toEqual(["Reading other.csv."]);
    } finally {
      quiet.mockRestore();
    }
  });

  test("no file: the words of no file", async () => {
    await drawPage();
    expect(paragraphs(tab())).toEqual(["No individuals file open."]);
  });

  test("the first read under way: Remove, then Reading alone, no options", async () => {
    await drawPage();
    await pickIndividuals("pops.csv");
    expect(buttons(tab())).toEqual(["Remove pops.csv"]);
    expect(paragraphs(tab())).toEqual(["Reading pops.csv."]);
    expect(tab().querySelectorAll("select")).toHaveLength(0);
  });

  test("a CSV read: the three options with what was detected, the individuals not in the file with Copy, the size and the table", async () => {
    const { store } = await drawPage();
    await openVariants(store);
    await pickIndividuals("pops.csv");
    await recorded(store, readOf(POPS));
    expect(selectsOf(tab())).toEqual([
      "Detected: UTF-8",
      "Detected: comma",
      "Detected: point",
    ]);
    expect(buttons(tab()).slice(0, 4)).toEqual([
      "Remove pops.csv",
      "Detected: UTF-8",
      "Detected: comma",
      "Detected: point",
    ]);
    expect(tab().textContent).toContain(
      "Individuals in panel.nei but not in pops.csv, before the filters",
    );
    expect(
      [...tab().querySelectorAll("li")].map((li) => li.textContent),
    ).toEqual(["s004"]);
    expect(buttons(tab())).toContain("Copy the name");
    expect(paragraphs(tab())).toContain("5 rows, 3 columns");
    expect(
      tab().querySelector('[role="grid"]')?.getAttribute("aria-label"),
    ).toBe("The table of pops.csv");
  });

  test("a read again of the same file under way, for another separator: the options stay, with Reading under them", async () => {
    const { store } = await drawPage();
    await pickIndividuals("pops.csv");
    await recorded(store, readOf(POPS));
    await act(async () => {
      const command = csvOptionCommand("separator", "pops.csv", {
        encoding: "auto",
        separator: ";",
        decimal: "auto",
      });
      store.apply(command.description, command.command);
      await Promise.resolve();
    });
    expect(selectsOf(tab())).toEqual(["Detected", "Semicolon", "Detected"]);
    expect(paragraphs(tab())).toContain("Reading pops.csv.");
  });

  test("a CSV refused: the options, and the line that sends to the box", async () => {
    const { store } = await drawPage();
    await pickIndividuals("pops.csv");
    await recorded(store, {
      kind: "failed",
      error: {
        kind: "raggedRow",
        line: 2,
        expected: 1,
        found: 2,
        separator: ",",
      },
      format: "text",
    });
    expect(tab().querySelectorAll("select")).toHaveLength(3);
    expect(paragraphs(tab())).toContain(
      "pops.csv could not be read; the box Individuals says why.",
    );
  });

  test("an xlsx refused: Remove and the line alone", async () => {
    const { store } = await drawPage();
    await pickIndividuals("pops.xlsx");
    await recorded(store, {
      kind: "failed",
      error: { kind: "encrypted" },
      format: "xlsx",
    });
    expect(tab().querySelectorAll("select")).toHaveLength(0);
    expect(buttons(tab())).toEqual(["Remove pops.xlsx"]);
    expect(paragraphs(tab())).toEqual([
      "pops.xlsx could not be read; the box Individuals says why.",
    ]);
  });

  test("an xlsx read: the line of its first sheet, no options", async () => {
    const { store } = await drawPage();
    await pickIndividuals("pops.xlsx");
    await recorded(store, readOf(POPS, null));
    expect(tab().querySelectorAll("select")).toHaveLength(0);
    expect(paragraphs(tab())).toContain(
      "Read from the first sheet of pops.xlsx; any other sheet is not read.",
    );
  });

  test("a file of UTF-16 read again for another separator: the line of UTF-16 stays in place of the encoding while the read is under way", async () => {
    const { store } = await drawPage();
    await pickIndividuals("pops.csv");
    await recorded(store, readOf(POPS, { ...FOUND, encoding: "utf-16" }));
    await act(async () => {
      const command = csvOptionCommand("separator", "pops.csv", {
        encoding: "auto",
        separator: ";",
        decimal: "auto",
      });
      store.apply(command.description, command.command);
      await Promise.resolve();
    });
    expect(store.getState().project.individuals?.read.kind).toBe("pending");
    expect(paragraphs(tab())).toEqual([
      "Encoding: UTF-16, from the mark at the start of the file.",
      "Reading pops.csv.",
    ]);
    expect(selectsOf(tab())).toEqual(["Semicolon", "Detected"]);
  });

  test("NU8 R1 every individual of the variants file in the file, and every row of the file in the variants file: no section of the individuals not in it, no Copy, and no line of the rows not used", async () => {
    const { store } = await drawPage();
    await openVariants(store);
    await pickIndividuals("pops.csv");
    await recorded(
      store,
      readOf({
        columns: POPS.columns,
        // x9 left out, so that every row names an individual of
        // panel.nei too.
        rows: [
          ...POPS.rows.filter((row) => row[0] !== "x9"),
          ["s004", "p1", 1],
        ],
      }),
    );
    expect(paragraphs(tab())).toContain("5 rows, 3 columns");
    expect([...tab().querySelectorAll("h2")].map((h) => h.textContent)).toEqual(
      [COUNTS_HEADING],
    );
    expect(tab().textContent).not.toContain("but not in pops.csv");
    // Every row of the file names an individual of panel.nei.
    expect(tab().textContent).not.toContain("but not in panel.nei");
    expect(buttons(tab()).filter((b) => b.startsWith("Copy"))).toEqual([]);
  });

  test("a file of UTF-16 with a character not decoded: the line of UTF-16 in place of the encoding, and the warning", async () => {
    const { store } = await drawPage();
    await pickIndividuals("pops.csv");
    await recorded(
      store,
      readOf(POPS, { ...FOUND, encoding: "utf-16", undecodedLine: 3 }),
    );
    expect(selectsOf(tab())).toEqual(["Detected: comma", "Detected: point"]);
    expect(paragraphs(tab())).toContain(
      "Encoding: UTF-16, from the mark at the start of the file.",
    );
    expect(tab().textContent).toContain(
      "Warning: line 3 of pops.csv has bytes that could not be read as UTF-16",
    );
  });
});

/** Chooses the item `value` of the select number `index` of `element`,
    drawn by React Aria, through the hidden select it draws beside it, as
    a browser's autofill would. */
async function pickInSelect(
  element: HTMLElement,
  index: number,
  value: string,
): Promise<void> {
  const select = element.querySelectorAll("select")[index];
  if (select === undefined) throw new Error("no such select");
  await act(async () => {
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();
  });
}

describe("AP3 D3 the changes of the individuals file are no steps of Undo; the column the user chooses is", () => {
  /** A step of the history before the change, a threshold of the
      individuals. */
  const thresholdStep = async (
    store: Popgen2PageStore<JobResult, Blob>,
  ): Promise<void> => {
    await act(async () => {
      store.apply("the threshold of the missing genotypes changed", (p) =>
        setThreshold(p, { of: "individuals", kind: "missing_data" }, 0.5),
      );
      await Promise.resolve();
    });
  };

  test("a file opened by the zone after a step leaves nothing to undo or redo, one move of the history more, its read pending", async () => {
    const { store } = await drawPage();
    await thresholdStep(store);
    const moves = store.getState().historyMoves;
    await pickIndividuals("pops.csv");
    const state = store.getState();
    expect(state.project.individuals?.fileId).toBe(FILE_ID);
    expect(state.project.individuals?.read.kind).toBe("pending");
    expect(state.undo).toBeNull();
    expect(state.redo).toBeNull();
    expect(state.historyMoves).toBe(moves + 1);
  });

  test("Remove, in the tab, leaves nothing to undo, and puts the focus on the zone's button in the box", async () => {
    const { store } = await drawPage();
    await pickIndividuals("pops.csv");
    await recorded(store, readOf(POPS));
    await thresholdStep(store);
    const remove = [...tab().querySelectorAll("button")].find(
      (b) => b.textContent === "Remove pops.csv",
    );
    if (remove === undefined) throw new Error("no Remove");
    await act(async () => {
      remove.click();
      await Promise.resolve();
    });
    expect(store.getState().project.individuals).toBeNull();
    expect(undoNames(store)).toBeNull();
    expect(document.activeElement?.textContent).toBe("Open individuals file…");
    expect(box().contains(document.activeElement)).toBe(true);
  });

  test("a separator chosen in the tab reads the file again and leaves nothing to undo", async () => {
    const { store } = await drawPage();
    await openVariants(store);
    await pickIndividuals("pops.csv");
    await recorded(store, readOf(POPS));
    await thresholdStep(store);
    await pickInSelect(tab(), 1, ";");
    const individuals = store.getState().project.individuals;
    expect(individuals?.csv?.separator).toBe(";");
    expect(individuals?.read.kind).toBe("pending");
    expect(undoNames(store)).toBeNull();
  });

  test("the column chosen in the list, and None, are each a step named the column of the populations changed", async () => {
    const { store } = await drawPage();
    await openVariants(store);
    await pickIndividuals("pops.csv");
    await recorded(store, readOf(POPS));
    await pickInSelect(box(), 0, "column:popcat");
    expect(store.getState().project.grouping).toEqual({
      kind: "populations",
      column: "popcat",
    });
    expect(undoNames(store)).toBe("the column of the populations changed");
    await pickInSelect(box(), 0, "none");
    expect(store.getState().project.grouping).toEqual({
      kind: "populations",
      column: null,
    });
    expect(undoNames(store)).toBe("the column of the populations changed");
  });
});

/** The reason of the lock of the populations while the diversity runs
    alone. */
const POPULATIONS_LOCKED =
  "Stop the diversity in the Populations tab to change the populations; then press Run there to calculate it again.";

/** The words of other.csv dropped, pasted or picked while the diversity
    runs. */
const OTHER_NOT_OPENED =
  "other.csv was not opened: the populations cannot change while the diversity runs. Stop the diversity in the Populations tab, then open other.csv again.";

/** Ends the one pass of panel.nei, the last request, with every
    individual kept. */
async function passEnded(
  store: Popgen2PageStore<JobResult, Blob>,
  requests: readonly Request[],
): Promise<void> {
  await act(async () => {
    requests.at(-1)?.end({
      kind: "done",
      key: store.getState().runs.at(-1)?.key ?? "",
      result: summaryResult(["1"], [1200], INDIVIDUALS),
    });
    await Promise.resolve();
  });
  await settled();
}

/** Starts the analysis `id`, which the fake worker never ends; the PCA
    with its LD pruning set, which it has no default for. */
async function running(
  store: Popgen2PageStore<JobResult, Blob>,
  id: "diversity" | "pca",
): Promise<void> {
  await act(async () => {
    if (id === "pca") {
      store.apply("the LD pruning of the PCA changed", (p) =>
        setAnalysisOptions(p, pcaOnPopgen2, {
          ...pcaOnPopgen2.defaults,
          ld: { follow: false, maxAllowedR2: 0.1, maxDist: 50_000 },
        }),
      );
    }
    store.startRun(id);
    await Promise.resolve();
  });
  await settled();
  expect(store.getState().analyses.find((a) => a.id === id)?.status.kind).toBe(
    "running",
  );
}

/** panel.nei and pops.csv read on popcat, the one pass ended. */
async function bothRead(): Promise<Drawn> {
  const drawn = await drawPage();
  await openVariants(drawn.store);
  await passEnded(drawn.store, drawn.requests);
  await pickIndividuals("pops.csv");
  await recorded(drawn.store, readOf(POPS));
  await choose(drawn.store, "popcat");
  return drawn;
}

/** The name of `button`: its aria-label, or its words. */
function nameOf(button: Element): string {
  return button.getAttribute("aria-label") ?? button.textContent;
}

/** The names of the buttons of `element` marked aria-disabled. */
function greyed(element: HTMLElement): string[] {
  return [...element.querySelectorAll('button[aria-disabled="true"]')].map(
    nameOf,
  );
}

/** The words of the descriptions of `button`, joined. */
function descriptionOf(button: Element): string {
  return (button.getAttribute("aria-describedby") ?? "")
    .split(/\s+/u)
    .filter((id) => id !== "")
    .map((id) => document.getElementById(id)?.textContent ?? "")
    .join(" ");
}

/** The button of `element` named `name`. */
function buttonNamed(element: HTMLElement, name: string): HTMLButtonElement {
  const found = [...element.querySelectorAll("button")].find(
    (b) => nameOf(b) === name,
  );
  if (found === undefined) throw new Error(`no button ${name}`);
  return found;
}

/** Pastes a file named `name` into the zone's hidden button, which takes
    a paste while it has the focus, as React Aria reads a paste. */
async function pasteFile(name: string): Promise<void> {
  const file = new File(["IID,pop\n"], name);
  await paste({
    types: ["Files"],
    items: [{ kind: "file", type: "text/csv", getAsFile: () => file }],
    getData: () => "",
  });
}

/** Pastes the files named `names` together into the zone's hidden
    button. */
async function pasteFiles(names: readonly string[]): Promise<void> {
  await paste({
    types: ["Files"],
    items: names.map((name) => {
      const file = new File(["IID,pop\n"], name);
      return { kind: "file", type: "text/csv", getAsFile: () => file };
    }),
    getData: () => "",
  });
}

/** Pastes a piece of text into the zone's hidden button. */
async function pasteText(text: string): Promise<void> {
  await paste({
    types: ["text/plain"],
    items: [{ kind: "string", type: "text/plain" }],
    getData: () => text,
  });
}

/** Pastes `clipboardData` into the zone's hidden button, which takes a
    paste while it has the focus, as React Aria reads a paste. */
async function paste(clipboardData: object): Promise<void> {
  const paste = buttonNamed(box(), "Paste an individuals file");
  await act(async () => {
    paste.focus();
    await Promise.resolve();
  });
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", { value: clipboardData });
  await act(async () => {
    paste.dispatchEvent(event);
    await Promise.resolve();
  });
  await settled();
}

describe("PT3 D2 the box Individuals and the Individuals tab greyed while the diversity runs", () => {
  test("while the diversity runs: the list, the paste button and the zone's button of the box, and Remove and the three lists of the tab, greyed with the reason as description; after its Stop, none", async () => {
    const { store } = await bothRead();
    expect(greyed(box())).toEqual([]);
    expect(greyed(tab())).toEqual([]);
    await running(store, "diversity");
    expect(greyed(box())).toEqual([
      "popcat",
      "Paste an individuals file",
      "Open another individuals file…",
    ]);
    for (const button of box().querySelectorAll(
      'button[aria-disabled="true"]',
    )) {
      expect(descriptionOf(button)).toContain(POPULATIONS_LOCKED);
    }
    expect(greyed(tab())).toEqual([
      "Remove pops.csv",
      "Detected: UTF-8",
      "Detected: comma",
      "Detected: point",
    ]);
    for (const button of tab().querySelectorAll(
      'button[aria-disabled="true"]',
    )) {
      expect(descriptionOf(button)).toContain(POPULATIONS_LOCKED);
    }
    // Greyed, each is still a stop of the Tab key.
    for (const button of [
      ...box().querySelectorAll('button[aria-disabled="true"]'),
      ...tab().querySelectorAll('button[aria-disabled="true"]'),
    ]) {
      expect((button as HTMLButtonElement).disabled).toBe(false);
      expect(button.getAttribute("tabindex")).not.toBe("-1");
    }
    // The counts and the table of the file are not greyed.
    expect(greyed(tab())).not.toContain("Copy the name");

    await act(async () => {
      store.cancelRun("diversity");
      await Promise.resolve();
    });
    await settled();
    expect(greyed(box())).toEqual([]);
    expect(greyed(tab())).toEqual([]);
  });

  test("while the PCA runs: nothing of the box or of the tab greyed", async () => {
    const { store } = await bothRead();
    await running(store, "pca");
    expect(greyed(box())).toEqual([]);
    expect(greyed(tab())).toEqual([]);
  });

  test("while the diversity runs, the column chosen, Remove, the zone's button, a separator chosen and a file pasted change nothing; the paste shows the file not opened and what to do, until the diversity ends, and not again at its next run", async () => {
    const { store } = await bothRead();
    await running(store, "diversity");
    const before = store.getState().project;
    const clicks = vi.spyOn(HTMLInputElement.prototype, "click");

    await pickInSelect(box(), 0, "none");
    await pickInSelect(tab(), 1, ";");
    await act(async () => {
      buttonNamed(tab(), "Remove pops.csv").click();
      buttonNamed(box(), "Open another individuals file…").click();
      await Promise.resolve();
    });
    expect(clicks).not.toHaveBeenCalled();
    clicks.mockRestore();
    expect(paragraphs(box())).not.toContain(POPULATIONS_LOCKED);

    await pasteFile("other.csv");
    expect(store.getState().project).toBe(before);
    expect(paragraphs(box())).toContain(OTHER_NOT_OPENED);

    await act(async () => {
      store.cancelRun("diversity");
      await Promise.resolve();
    });
    await settled();
    expect(paragraphs(box())).not.toContain(OTHER_NOT_OPENED);

    // The words of the refusal do not come back with the next run.
    await running(store, "diversity");
    expect(paragraphs(box())).not.toContain(OTHER_NOT_OPENED);
    expect(paragraphs(box())).not.toContain(POPULATIONS_LOCKED);
  });

  test("a piece of text pasted while the diversity runs opens nothing and gets the words it gets when the zone does not wait, not the lock's (the review of package 4, 12 October 2026)", async () => {
    const { store } = await bothRead();
    await running(store, "diversity");
    const before = store.getState().project;
    await pasteText("IID,pop");
    expect(store.getState().project).toBe(before);
    expect(paragraphs(box())).toContain(
      "Open an individuals file, a CSV, a TSV or an xlsx, not a piece of text.",
    );
    expect(
      paragraphs(box()).filter((text) => text.includes("was opened")),
    ).toEqual([]);
  });

  test("several files pasted while the diversity runs open nothing: Open one individuals file at a time, as when the zone does not wait (the review of package 4, 12 October 2026)", async () => {
    const { store } = await bothRead();
    await running(store, "diversity");
    const before = store.getState().project;
    await pasteFiles(["one.csv", "two.csv"]);
    expect(store.getState().project).toBe(before);
    expect(paragraphs(box())).toContain("Open one individuals file at a time.");
    expect(
      paragraphs(box()).filter((text) => text.includes("was opened")),
    ).toEqual([]);
  });

  test("one file pasted while the diversity runs with no individuals file open before: the file named, not opened, to open again once the diversity is stopped", async () => {
    const drawn = await drawPage();
    await openVariants(drawn.store);
    await passEnded(drawn.store, drawn.requests);
    await running(drawn.store, "diversity");
    const before = drawn.store.getState().project;
    await pasteFile("other.csv");
    expect(drawn.store.getState().project).toBe(before);
    expect(paragraphs(box())).toContain(OTHER_NOT_OPENED);
  });

  test("a file picked while the diversity runs, in a picker opened before it started, opens nothing and shows the file not opened", async () => {
    const { store } = await bothRead();
    await running(store, "diversity");
    const before = store.getState().project;
    await pickIndividuals("other.csv");
    expect(store.getState().project).toBe(before);
    expect(paragraphs(box())).toContain(OTHER_NOT_OPENED);
  });

  test("the paste button loses the reason as its description when the diversity ends", async () => {
    const { store } = await bothRead();
    await running(store, "diversity");
    const paste = buttonNamed(box(), "Paste an individuals file");
    expect(descriptionOf(paste)).toBe(POPULATIONS_LOCKED);
    await act(async () => {
      store.cancelRun("diversity");
      await Promise.resolve();
    });
    await settled();
    expect(
      buttonNamed(box(), "Paste an individuals file").hasAttribute(
        "aria-describedby",
      ),
    ).toBe(false);
    expect(
      buttonNamed(box(), "Paste an individuals file").hasAttribute(
        "aria-disabled",
      ),
    ).toBe(false);
  });

  test("the zone's button empties its input before it opens the picker, so that the same file picked again opens it again", async () => {
    const { store } = await drawPage();
    await openVariants(store);
    const input = box().querySelector<HTMLInputElement>('input[type="file"]');
    if (input === null) throw new Error("the box has no input of a file");
    const done: string[] = [];
    Object.defineProperty(input, "value", {
      configurable: true,
      get: () => "",
      set: (value: string) => {
        done.push(`value ${value}`);
      },
    });
    input.click = () => {
      done.push("click");
    };
    await act(async () => {
      buttonNamed(box(), "Open individuals file…").click();
      await Promise.resolve();
    });
    expect(done).toEqual(["value ", "click"]);
  });

  test("the zone not greyed: the zone's button opens the picker, and a file pasted opens it", async () => {
    const { store } = await drawPage();
    await openVariants(store);
    const clicks = vi
      .spyOn(HTMLInputElement.prototype, "click")
      .mockImplementation(() => undefined);
    await act(async () => {
      buttonNamed(box(), "Open individuals file…").click();
      await Promise.resolve();
    });
    expect(clicks).toHaveBeenCalledTimes(1);
    clicks.mockRestore();
    await pasteFile("pops.csv");
    expect(store.getState().project.individuals?.name).toBe("pops.csv");
  });
});
